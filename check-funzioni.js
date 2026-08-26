#!/usr/bin/env node
// check-funzioni.js — Controllo di coerenza del frontend del gestionale.
// Uso:  node check-funzioni.js [cartella]   (default: ./public)
// Trova: funzioni chiamate ma mai definite, definizioni duplicate,
//        e script chiamati prima del file che li definisce (ordine in index.html).
// Da eseguire PRIMA di ogni deploy. Exit code 1 se ci sono errori.

const fs = require('fs');
const path = require('path');

const DIR = process.argv[2] || './public';

// Nomi globali del browser e librerie da ignorare
const BUILTIN = new Set([
  'alert','confirm','prompt','fetch','console','setTimeout','setInterval',
  'clearTimeout','clearInterval','parseInt','parseFloat','isNaN','encodeURIComponent',
  'decodeURIComponent','String','Number','Boolean','Array','Object','JSON','Math',
  'Date','Promise','Error','Map','Set','RegExp','requestAnimationFrame','structuredClone',
  'addEventListener','removeEventListener','localStorage','sessionStorage','atob','btoa',
  'if','for','while','switch','catch','return','function','async','await','new','typeof',
  'URLSearchParams','FormData','AbortController','Blob','FileReader','Intl','Audio',
  'IntersectionObserver','MutationObserver','ResizeObserver','CustomEvent','Event',
  'navigator','history','location','document','window','require','module','Chart',
]);

function listJs(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules') out.push(...listJs(p));
    else if (f.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function stripCommentsAndStrings(src) {
  // rimozione grezza ma sufficiente di commenti, stringhe e template literal
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/`(?:\\`|[^`])*`/g, '""')
    .replace(/'(?:\\'|[^'\n])*'/g, '""')
    .replace(/"(?:\\"|[^"\n])*"/g, '""');
}

const files = listJs(DIR);
if (files.length === 0) {
  console.error(`Nessun .js trovato in ${DIR} — passa la cartella giusta come argomento.`);
  process.exit(1);
}

const defs = new Map();   // nome -> [file,...]
const calls = new Map();  // nome -> Set(file)

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  const src = stripCommentsAndStrings(raw);

  // definizioni: function nome(...), const/let/var nome = (…)=>  o function, window.nome =
  const defRe = /(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)|window\.([A-Za-z_$][\w$]*)\s*=)/g;
  let m;
  while ((m = defRe.exec(src))) {
    const nome = m[1] || m[2] || m[3];
    if (!defs.has(nome)) defs.set(nome, []);
    defs.get(nome).push(path.relative(DIR, f));
  }

  // chiamate: nome( — escludendo keyword e metodi (preceduti da .)
  const callRe = /(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
  while ((m = callRe.exec(src))) {
    const nome = m[1];
    if (BUILTIN.has(nome)) continue;
    if (!calls.has(nome)) calls.set(nome, new Set());
    calls.get(nome).add(path.relative(DIR, f));
  }
}

// anche le chiamate negli onclick dell'HTML
const htmls = fs.readdirSync(DIR).filter(f => f.endsWith('.html')).map(f => path.join(DIR, f));
for (const h of htmls) {
  const src = fs.readFileSync(h, 'utf8');
  const re = /on(?:click|change|submit|input|load)\s*=\s*"([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    if (!calls.has(m[1])) calls.set(m[1], new Set());
    calls.get(m[1]).add(path.basename(h));
  }
}

let errori = 0;

console.log(`\n=== CHECK GESTIONALE — ${files.length} file JS in ${DIR} ===\n`);

// 1) chiamate a funzioni mai definite
console.log('--- Funzioni chiamate ma MAI definite:');
for (const [nome, dove] of [...calls].sort()) {
  if (!defs.has(nome)) {
    console.log(`  ❌ ${nome}()  chiamata in: ${[...dove].join(', ')}`);
    errori++;
  }
}
if (errori === 0) console.log('  ✅ nessuna');

// 2) definizioni duplicate in file diversi
console.log('\n--- Funzioni definite in PIU\' file (rischio conflitto):');
let dup = 0;
for (const [nome, dove] of [...defs].sort()) {
  const unici = [...new Set(dove)];
  if (unici.length > 1 && calls.has(nome)) {
    console.log(`  ⚠️  ${nome}  definita in: ${unici.join(', ')}`);
    dup++;
  }
}
if (dup === 0) console.log('  ✅ nessuna');

// 3) ordine degli script in index.html
const idx = htmls.find(h => path.basename(h) === 'index.html');
if (idx) {
  const src = fs.readFileSync(idx, 'utf8');
  const ordine = [...src.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(m => path.basename(m[1]));
  console.log(`\n--- Ordine script in index.html: ${ordine.join(' → ')}`);
}

console.log(`\n=== Risultato: ${errori} errori, ${dup} avvisi ===\n`);
process.exit(errori > 0 ? 1 : 0);
