// app-preventivi.js — Preventivi creati dalla pipeline
// I prezzi vengono suggeriti dal listino della città del cliente, con il
// prezzo minimo sempre in vista: sotto quello non si scende.

let _pvLead = null;
let _pvRighe = [];

const pvEuro = n => '€ ' + Number(n || 0).toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2});

let _pvId = null;        // se valorizzato, sto modificando un preventivo esistente
let _pvNumero = null;

async function apriPreventivo(leadId){
  const l = (state.leads||[]).find(x => x.id === leadId);
  if(!l) return;
  _pvLead = l;
  _pvRighe = [];
  _pvId = null; _pvNumero = null;

  // se per questo lead esiste gia' un preventivo, lo riapro per modificarlo
  let esistente = null;
  try{
    const p = await api.get('/api/preventivi?lead_id=' + l.id);
    if(Array.isArray(p) && p.length) esistente = p[0];
  }catch(e){}

  if(esistente){
    _pvId = esistente.id; _pvNumero = esistente.numero;
    let righe = [];
    try{ righe = Array.isArray(esistente.righe) ? esistente.righe : JSON.parse(esistente.righe||'[]'); }catch(e){}
    _pvRighe = righe.map(r => ({prodotto: r.prodotto, kg: r.kg, prezzo: r.prezzo}));
  }
  if(!_pvRighe.length){
    const prodotti = String(l.prodotto || '').split(/\s*,\s*/).filter(Boolean);
    if(prodotti.length) prodotti.forEach(p => _pvRighe.push({prodotto: p, kg: '', prezzo: ''}));
    else _pvRighe.push({prodotto: '', kg: '', prezzo: ''});
  }

  document.getElementById('pv-cliente').innerHTML = `
    <div style="font-weight:700;font-size:14px">${l.nome}</div>
    <div style="color:var(--text-2);font-size:12.5px;margin-top:3px">
      ${[l.contatto, l.indirizzo, l.citta].filter(Boolean).join(' · ')}
      ${l.piva ? '<br>P.IVA ' + l.piva : ''}
    </div>
    ${l.citta ? `<div style="font-size:11.5px;color:var(--text-3);margin-top:5px">Prezzi suggeriti dal listino di ${l.citta}</div>` : ''}
    ${_pvId ? `<div style="margin-top:8px;background:#fff;border-radius:7px;padding:8px 11px;font-size:12px">
        <strong>Preventivo n. ${_pvNumero}</strong> già creato — stai modificando quello.
        <a href="#" onclick="nuovoPreventivo();return false" style="color:var(--brand);margin-left:8px">crea invece uno nuovo</a></div>` : ''}`;
  const sug = suggerisciEmail(l, esistente);
  document.getElementById('pv-email').value = sug.email || '';
  mostraOrigineEmail(sug);
  document.getElementById('pv-note').value = esistente?.note || '';
  document.getElementById('pv-validita').value = esistente?.validita_giorni || 30;
  const bm = document.getElementById('pv-btn-mail');
  if(bm) bm.innerHTML = '<i class="ti ti-send"></i>' + (_pvId ? 'Salva e invia' : 'Crea e invia');
  // su Fatture in Cloud si puo' passare solo con i dati fiscali
  const bf = document.getElementById('pv-btn-fic');
  if(bf){
    const haDati = !!(l.piva || l.cf);
    bf.style.display = haDati ? '' : 'none';
    if(esistente?.fic_id){
      bf.disabled = true;
      bf.innerHTML = '<i class="ti ti-check"></i>Già su FIC (n. ' + (esistente.fic_numero || '') + ')';
    } else {
      bf.disabled = false;
      bf.innerHTML = '<i class="ti ti-cloud-upload"></i>Su Fatture in Cloud';
    }
  }
  document.getElementById('pv-errore').style.display = 'none';

  renderRighePreventivo();
  openModal('modal-preventivo');
}

function renderRighePreventivo(){
  const box = document.getElementById('pv-righe');
  if(!box) return;
  const prodotti = (window._prodottiInteresse||[]).map(p => p.nome);
  box.innerHTML = _pvRighe.map((r, i) => `
    <div style="display:flex;gap:7px;align-items:flex-end;margin-bottom:9px">
      <div style="flex:1">
        ${i === 0 ? '<label class="form-label">Prodotto</label>' : ''}
        <input type="text" list="pv-prodotti-lista" value="${(r.prodotto||'').replace(/"/g,'&quot;')}"
               placeholder="Prodotto" oninput="aggiornaRiga(${i},'prodotto',this.value)"
               style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">
      </div>
      <div style="width:95px">
        ${i === 0 ? '<label class="form-label">Kg</label>' : ''}
        <input type="number" value="${r.kg}" placeholder="kg" min="0"
               oninput="aggiornaRiga(${i},'kg',this.value)" onchange="suggerisciPrezzo(${i})"
               style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;text-align:right">
      </div>
      <div style="width:100px">
        ${i === 0 ? '<label class="form-label">€/kg</label>' : ''}
        <input type="number" step="0.01" value="${r.prezzo}" placeholder="0,00"
               oninput="aggiornaRiga(${i},'prezzo',this.value)"
               style="width:100%;padding:8px 10px;border:1px solid ${r.sottoMinimo ? 'var(--red)' : 'var(--border)'};border-radius:8px;font-size:13px;text-align:right">
      </div>
      <div style="width:95px;text-align:right;font-size:13px;font-weight:600;padding-bottom:9px">
        ${pvEuro((Number(r.kg)||0) * (Number(r.prezzo)||0))}
      </div>
      <button type="button" class="btn btn-icon btn-sm btn-danger" onclick="rimuoviRigaPreventivo(${i})" style="margin-bottom:1px"><i class="ti ti-x"></i></button>
    </div>
    ${r.nota ? `<div style="font-size:11px;color:${r.sottoMinimo ? 'var(--red)' : 'var(--text-3)'};margin:-5px 0 9px 2px">${r.nota}</div>` : ''}`).join('') +
    `<datalist id="pv-prodotti-lista">${prodotti.map(p=>`<option value="${p}">`).join('')}</datalist>`;
  calcolaTotalePreventivo();
}

function aggiornaRiga(i, campo, valore){
  if(!_pvRighe[i]) return;
  _pvRighe[i][campo] = valore;
  if(campo === 'prezzo') verificaMinimo(i);
  calcolaTotalePreventivo();
}

function aggiungiRigaPreventivo(){
  _pvRighe.push({prodotto: '', kg: '', prezzo: ''});
  renderRighePreventivo();
}

function rimuoviRigaPreventivo(i){
  _pvRighe.splice(i, 1);
  if(!_pvRighe.length) _pvRighe.push({prodotto: '', kg: '', prezzo: ''});
  renderRighePreventivo();
}

// Chiede al gestionale il prezzo di listino per quella città e quantità
async function suggerisciPrezzo(i){
  const r = _pvRighe[i];
  if(!r || !_pvLead?.citta || !r.kg) return;
  try{
    const s = await api.get('/api/listini/suggerisci?localita=' + encodeURIComponent(_pvLead.citta) + '&kg=' + r.kg);
    if(!s.trovato){
      r.nota = 'Località non a listino: prezzo da inserire a mano.';
      return renderRighePreventivo();
    }
    r.listino = s.listino; r.minimo = s.minimo;
    if(!r.prezzo) r.prezzo = s.listino;
    r.nota = `Listino ${s.localita}, scaglione ${s.scaglione} kg: € ${s.listino.toFixed(2)}/kg` +
             (s.minimo ? ` · minimo € ${s.minimo.toFixed(2)}` : '');
    verificaMinimo(i);
    renderRighePreventivo();
  }catch(e){}
}

function verificaMinimo(i){
  const r = _pvRighe[i];
  if(!r || !r.minimo) return;
  const p = Number(r.prezzo) || 0;
  r.sottoMinimo = p > 0 && p < r.minimo - 0.001;
  if(r.sottoMinimo) r.nota = `Sotto il minimo di € ${r.minimo.toFixed(2)}/kg: non è un prezzo praticabile.`;
}

function calcolaTotalePreventivo(){
  const imp = _pvRighe.reduce((s,r) => s + (Number(r.kg)||0) * (Number(r.prezzo)||0), 0);
  const kg = _pvRighe.reduce((s,r) => s + (Number(r.kg)||0), 0);
  const iva = imp * 0.04;
  document.getElementById('pv-totale').textContent = pvEuro(imp + iva);
  document.getElementById('pv-peso').innerHTML =
    `${kg.toLocaleString('it-IT')} kg · imponibile ${pvEuro(imp)} + IVA 4% ${pvEuro(iva)}`;
}

// Chiude il preventivo in modifica e ne comincia uno nuovo per lo stesso lead
function nuovoPreventivo(){
  const l = _pvLead;
  _pvId = null; _pvNumero = null;
  _pvRighe = [{prodotto: '', kg: '', prezzo: ''}];
  closeModal('modal-preventivo');
  setTimeout(()=>{
    // riapro senza recuperare quello esistente
    const salva = window._pvNoRecupero = true;
    apriPreventivoNuovo(l);
  }, 120);
}

function apriPreventivoNuovo(l){
  _pvLead = l; _pvId = null; _pvNumero = null;
  const prodotti = String(l.prodotto || '').split(/\s*,\s*/).filter(Boolean);
  _pvRighe = prodotti.length ? prodotti.map(p => ({prodotto: p, kg: '', prezzo: ''}))
                             : [{prodotto: '', kg: '', prezzo: ''}];
  document.getElementById('pv-cliente').innerHTML =
    `<div style="font-weight:700;font-size:14px">${l.nome}</div>
     <div style="color:var(--text-2);font-size:12.5px;margin-top:3px">${[l.contatto, l.indirizzo, l.citta].filter(Boolean).join(' · ')}</div>`;
  const sug2 = suggerisciEmail(l, null);
  document.getElementById('pv-email').value = sug2.email || '';
  mostraOrigineEmail(sug2);
  document.getElementById('pv-note').value = '';
  document.getElementById('pv-validita').value = 30;
  document.getElementById('pv-errore').style.display = 'none';
  const bm = document.getElementById('pv-btn-mail');
  if(bm) bm.innerHTML = '<i class="ti ti-send"></i>Crea e invia';
  renderRighePreventivo();
  openModal('modal-preventivo');
}
window.nuovoPreventivo = nuovoPreventivo;

async function salvaPreventivo(azione){
  const err = document.getElementById('pv-errore');
  const righe = _pvRighe.filter(r => r.prodotto && Number(r.kg) > 0 && Number(r.prezzo) > 0);
  if(!righe.length){
    err.textContent = 'Compila almeno una riga con prodotto, quantità e prezzo.';
    err.style.display = 'block';
    return;
  }
  if(righe.some(r => r.sottoMinimo) &&
     !confirm('Una o più righe sono sotto il prezzo minimo di listino.\n\nVuoi procedere comunque?')) return;
  err.style.display = 'none';

  const btn = document.getElementById(
    azione === 'email' ? 'pv-btn-mail' : azione === 'fic' ? 'pv-btn-fic' : 'pv-btn-pdf');
  const testo = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i>Attendi...';
  try{
    const l = _pvLead;
    const corpo = {
      lead_id: l.id, intestazione: l.nome, referente: l.contatto, indirizzo: l.indirizzo,
      citta: l.citta, piva: l.piva, cf: l.cf, email: document.getElementById('pv-email').value.trim(),
      righe: righe.map(x => ({prodotto: x.prodotto, kg: Number(x.kg), prezzo: Number(x.prezzo)})),
      validita_giorni: Number(document.getElementById('pv-validita').value) || 30,
      note: document.getElementById('pv-note').value.trim(),
      aliquota_iva: 4
    };
    const r = _pvId
      ? await api.put('/api/preventivi/' + _pvId, corpo)
      : await api.post('/api/preventivi', corpo);
    if(r.error){ err.textContent = r.error; err.style.display = 'block'; return; }
    const p = r.preventivo;

    if(azione === 'pdf'){
      window.open('/api/preventivi/' + p.id + '/pdf', '_blank');
      closeModal('modal-preventivo');
      showSave();
    } else if(azione === 'fic'){
      const fic = await api.post('/api/preventivi/' + p.id + '/su-fic', {});
      if(fic.error){ err.textContent = fic.error; err.style.display = 'block'; return; }
      closeModal('modal-preventivo');
      alert('Preventivo creato su Fatture in Cloud con il numero ' + fic.numero +
            '.\n\nDa lì puoi trasformarlo in ordine o fattura con un clic.');
      showSave();
    } else {
      const email = document.getElementById('pv-email').value.trim();
      if(!email.includes('@')){
        err.textContent = 'Serve l\'email del cliente per inviare il preventivo.';
        err.style.display = 'block';
        return;
      }
      const inv = await api.post('/api/preventivi/' + p.id + '/invia', {email});
      if(inv.error){ err.textContent = 'Preventivo salvato ma non inviato: ' + inv.error; err.style.display = 'block'; return; }
      closeModal('modal-preventivo');
      alert('Preventivo n. ' + p.numero + ' inviato a ' + inv.destinatario + '.');
      showSave();
    }
  }catch(e){
    err.textContent = 'Errore: ' + e.message; err.style.display = 'block';
  }finally{
    btn.disabled = false; btn.innerHTML = testo;
  }
}

window.apriPreventivo = apriPreventivo;
window.aggiungiRigaPreventivo = aggiungiRigaPreventivo;
window.rimuoviRigaPreventivo = rimuoviRigaPreventivo;
window.aggiornaRiga = aggiornaRiga;
window.suggerisciPrezzo = suggerisciPrezzo;
window.salvaPreventivo = salvaPreventivo;
window.renderRighePreventivo = renderRighePreventivo;


// ── EMAIL DEL PREVENTIVO: proposta, non imposta ──────────────────────────
// La cerca nell'ordine: quella usata nel preventivo precedente, quella del
// lead, quella della scheda cliente collegata. Resta sempre modificabile.
function suggerisciEmail(l, esistente){
  if(esistente?.email) return {email: esistente.email, da: 'usata nel preventivo precedente'};
  if(l.email) return {email: l.email, da: 'dalla scheda del lead'};

  const clienti = state.clienti || [];
  // prima per partita IVA, che è il legame più sicuro
  if(l.piva){
    const c = clienti.find(x => x.piva && String(x.piva).trim() === String(l.piva).trim() && x.email);
    if(c) return {email: c.email, da: `dall'anagrafica di ${c.nome}`};
  }
  // poi per nome, ignorando maiuscole e forma societaria
  const pulisci = s => String(s||'').toLowerCase()
    .replace(/\b(srl|snc|sas|spa|s\.r\.l|s\.n\.c|s\.a\.s|di|e|c)\b/g,'')
    .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const n = pulisci(l.nome);
  if(n.length > 4){
    const c = clienti.find(x => x.email && pulisci(x.nome) === n)
           || clienti.find(x => x.email && pulisci(x.nome).includes(n));
    if(c) return {email: c.email, da: `dall'anagrafica di ${c.nome}`};
  }
  return {email: '', da: null};
}

function mostraOrigineEmail(sug){
  const inp = document.getElementById('pv-email');
  if(!inp) return;
  let nota = document.getElementById('pv-email-nota');
  if(!nota){
    nota = document.createElement('div');
    nota.id = 'pv-email-nota';
    nota.style.cssText = 'font-size:11px;margin-top:3px';
    inp.parentElement.appendChild(nota);
  }
  if(sug.email){
    nota.style.color = 'var(--text-3)';
    nota.innerHTML = `Suggerita ${sug.da} — puoi cambiarla`;
  } else {
    nota.style.color = 'var(--orange)';
    nota.textContent = 'Nessuna email trovata: scrivila qui per poter inviare il preventivo.';
  }
  inp.oninput = () => { nota.style.color = 'var(--text-3)'; nota.textContent = ''; };
}

window.suggerisciEmail = suggerisciEmail;
window.mostraOrigineEmail = mostraOrigineEmail;


// ── CAMPIONATURA: crea la spedizione su Spedire Pro ─────────────────────
let _cpDati = null;

function apriCampionatura(leadId){
  const l = (state.leads||[]).find(x => x.id === leadId)
         || (state.clienti||[]).find(x => x.id === leadId);
  if(!l) return;
  _cpDati = l;
  const v = (id, val) => { const e = document.getElementById(id); if(e) e.value = val || ''; };
  v('cp-nome', String(l.nome||'').slice(0,27));
  v('cp-referente', String(l.contatto || l.ref || '').slice(0,22));
  v('cp-telefono', l.tel || l.tel2 || '');
  v('cp-indirizzo', l.indirizzo || l.ind_consegna || l.ind_legale || l.ind || '');
  v('cp-citta', l.citta || '');
  v('cp-email', l.email || '');
  v('cp-cap', ''); v('cp-provincia', '');
  document.getElementById('cp-quotazione').style.display = 'none';
  document.getElementById('cp-errore').style.display = 'none';
  openModal('modal-campionatura');
}

function datiCampionatura(){
  const v = id => (document.getElementById(id)?.value || '').trim();
  return {
    cliente_id: _cpDati?.cliente_id || (_cpDati?.tipo === 'cliente' ? _cpDati.id : null),
    nome: v('cp-nome'), referente: v('cp-referente'), telefono: v('cp-telefono'),
    indirizzo: v('cp-indirizzo'), cap: v('cp-cap'), citta: v('cp-citta'),
    provincia: v('cp-provincia'), email: v('cp-email'),
    width: v('cp-width'), height: v('cp-height'), depth: v('cp-depth'), weight: v('cp-weight'),
    contenuto: v('cp-contenuto'),
    ritiro: document.getElementById('cp-ritiro')?.checked || false
  };
}

function controllaCampionatura(d){
  const mancanti = [];
  if(!d.nome) mancanti.push('ragione sociale');
  if(!d.indirizzo) mancanti.push('indirizzo');
  if(!d.cap) mancanti.push('CAP');
  if(!d.citta) mancanti.push('città');
  if(!d.provincia) mancanti.push('provincia');
  if(!d.telefono) mancanti.push('telefono');
  return mancanti;
}

async function quotaCampionatura(){
  const err = document.getElementById('cp-errore');
  const box = document.getElementById('cp-quotazione');
  const d = datiCampionatura();
  const m = controllaCampionatura(d);
  if(m.length){ err.textContent = 'Mancano: ' + m.join(', ') + '.'; err.style.display='block'; return; }
  err.style.display = 'none';
  const btn = document.getElementById('cp-btn-quota');
  const t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i>Calcolo...';
  try{
    const r = await api.post('/api/spedirepro/quotazione', d);
    if(r.error){ err.textContent = r.error; err.style.display='block'; return; }
    const q = Array.isArray(r) ? r : (r.quotes || r.data || []);
    box.style.display = 'block';
    box.innerHTML = Array.isArray(q) && q.length
      ? '<strong>Corrieri disponibili</strong><br>' + q.slice(0,5).map(x =>
          `${x.courier_name || x.name || x.courier_alias} — <strong>€ ${Number(x.amount ?? x.price ?? 0).toFixed(2)}</strong>` +
          (x.delivery_time ? ` · ${x.delivery_time}` : '')).join('<br>')
      : 'Nessuna quotazione disponibile per questo indirizzo.';
  }catch(e){ err.textContent = 'Errore: ' + e.message; err.style.display='block'; }
  finally{ btn.disabled = false; btn.innerHTML = t; }
}

async function creaCampionatura(){
  const err = document.getElementById('cp-errore');
  const d = datiCampionatura();
  const m = controllaCampionatura(d);
  if(m.length){ err.textContent = 'Mancano: ' + m.join(', ') + '.'; err.style.display='block'; return; }
  if(!confirm(`Creare la spedizione del campione per ${d.nome}?\n\nVerrà addebitata sul credito Spedire Pro.`)) return;
  err.style.display = 'none';
  const btn = document.getElementById('cp-btn-crea');
  const t = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i>Creo...';
  try{
    const r = await api.post('/api/spedirepro/campionatura', d);
    if(r.error){ err.textContent = r.error; err.style.display='block'; return; }
    closeModal('modal-campionatura');
    const msg = `Spedizione creata.\n\nTracking: ${r.tracking}` +
      (r.corriere ? `\nCorriere: ${r.corriere}` : '') +
      (r.costo != null ? `\nCosto: € ${Number(r.costo).toFixed(2)}` : '') +
      `\n\nLa trovi in Spedizioni → Pacchi.`;
    if(confirm(msg + '\n\nVuoi aprire l\'etichetta da stampare?')){
      window.open('/api/spedirepro/etichetta/' + encodeURIComponent(r.tracking), '_blank');
    }
    showSave();
  }catch(e){ err.textContent = 'Errore: ' + e.message; err.style.display='block'; }
  finally{ btn.disabled = false; btn.innerHTML = t; }
}

window.apriCampionatura = apriCampionatura;
window.quotaCampionatura = quotaCampionatura;
window.creaCampionatura = creaCampionatura;
