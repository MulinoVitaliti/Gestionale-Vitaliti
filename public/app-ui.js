// app-ui.js — UI: automazioni, sidebar, utils finali
// Generato automaticamente — NON modificare manualmente

// ── SIDEBAR COLLAPSE ──────────────────────────────────────────────────────
function toggleSection(id){
  const items = document.getElementById(id);
  const section = items.previousElementSibling;
  const isCollapsed = items.classList.contains('collapsed');
  if(isCollapsed){
    items.style.maxHeight = items.scrollHeight + 'px';
    items.classList.remove('collapsed');
    section.classList.remove('collapsed');
    setTimeout(()=>items.style.maxHeight='none',250);
  } else {
    items.style.maxHeight = items.scrollHeight + 'px';
    setTimeout(()=>{
      items.style.maxHeight='0';
      items.classList.add('collapsed');
      section.classList.add('collapsed');
    },10);
  }
  // Salva stato in localStorage
  try{
    const stato = JSON.parse(localStorage.getItem('vv_sidebar')||'{}');
    stato[id] = !isCollapsed;
    localStorage.setItem('vv_sidebar', JSON.stringify(stato));
  }catch(e){}
}

function initSidebarState(){
  try{
    const stato = JSON.parse(localStorage.getItem('vv_sidebar')||'{}');
    Object.entries(stato).forEach(([id, collapsed])=>{
      if(collapsed){
        const items = document.getElementById(id);
        const section = items?.previousElementSibling;
        if(items){ items.classList.add('collapsed'); items.style.maxHeight='0'; }
        if(section) section.classList.add('collapsed');
      }
    });
  }catch(e){}
}
function getPwdSezione(sezione){
  try{ const p=localStorage.getItem('vv_pwd_'+sezione); return p||'vitaliti1930'; }catch(e){ return 'vitaliti1930'; }
}
function setPwdSezione(sezione, pwd){
  try{ localStorage.setItem('vv_pwd_'+sezione, pwd); }catch(e){}
}
function apriCambiaPwd(sezione){
  document.getElementById('cambia-pwd-sezione').value=sezione;
  ['cambia-pwd-attuale','cambia-pwd-nuova','cambia-pwd-conferma'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('cambia-pwd-error').style.display='none';
  document.getElementById('cambia-pwd-ok').style.display='none';
  document.getElementById('cambia-pwd-title').textContent='Cambia password Finanza';
  openModal('modal-cambia-pwd');
  setTimeout(()=>document.getElementById('cambia-pwd-attuale').focus(),150);
}
function salvaCambiaPwd(){
  const sezione=document.getElementById('cambia-pwd-sezione').value;
  const attuale=document.getElementById('cambia-pwd-attuale').value;
  const nuova=document.getElementById('cambia-pwd-nuova').value;
  const conferma=document.getElementById('cambia-pwd-conferma').value;
  const err=document.getElementById('cambia-pwd-error');
  const ok=document.getElementById('cambia-pwd-ok');
  err.style.display='none'; ok.style.display='none';
  if(attuale!==getPwdSezione(sezione)){err.textContent='Password attuale non corretta.';err.style.display='block';return;}
  if(!nuova||nuova.length<4){err.textContent='Min. 4 caratteri.';err.style.display='block';return;}
  if(nuova!==conferma){err.textContent='Le password non coincidono.';err.style.display='block';return;}
  setPwdSezione(sezione,nuova);
  finanzaSblocata=false;
  ok.textContent='Password aggiornata! ✓'; ok.style.display='block';
  setTimeout(()=>closeModal('modal-cambia-pwd'),1500);
}


// ── SYNC FATTURAZIONE DA IVA ──────────────────────────────────────────────
// Regola di Giovanni: IVA 4/10/22 => Fatturato; Esente (0) => Black.
function syncFatturazioneDaIva(prefix){
  const iva = document.getElementById(prefix + '-iva');
  const fatt = document.getElementById(prefix + '-fatturazione');
  if(!iva || !fatt) return;
  fatt.value = (parseInt(iva.value) === 0) ? 'da_fatturare' : 'fatturato';
}
window.syncFatturazioneDaIva = syncFatturazioneDaIva;

// ── PASSWORD FINANZA ──────────────────────────────────────────────────────
let finanzaSblocata = false;
let finanzaModoClean = false; // true = modalità senza Black
let _finanzaTarget = '';

function checkFinanzaPassword(pagina){
  if(finanzaSblocata){ showPage(pagina); return; }
  _finanzaTarget = pagina;
  const input = document.getElementById('finanza-pwd-input');
  const overlay = document.getElementById('modal-finanza-pwd');
  if(input && overlay){
    try{
      input.value='';
      const err = document.getElementById('finanza-pwd-error');
      if(err) err.style.display='none';
      openModal('modal-finanza-pwd');
      setTimeout(()=>input.focus(),150);
      return;
    }catch(e){ console.warn('Modal Finanza non disponibile, uso prompt:', e); }
  }
  // Fallback: richiesta password nativa del browser (non puo' fallire)
  const pwd = prompt('Password sezione Finanza:');
  if(pwd === null) return;
  if(pwd === getPwdSezione('contabilita')){
    finanzaSblocata = true; finanzaModoClean = false; showPage(pagina);
  } else if(pwd === getPwdClean()){
    finanzaSblocata = true; finanzaModoClean = true; showPage(pagina);
  } else {
    alert('Password non corretta.');
  }
}

function getPwdClean(){
  try{ return localStorage.getItem('vv_pwd_contabilita_clean')||'vitaliti2025'; }catch(e){ return 'vitaliti2025'; }
}

function verificaFinanzaPwd(){
  const pwd = document.getElementById('finanza-pwd-input').value;
  const err = document.getElementById('finanza-pwd-error');
  if(pwd === getPwdSezione('contabilita')){
    // Password completa — vedi tutto
    finanzaSblocata = true;
    finanzaModoClean = false;
    closeModal('modal-finanza-pwd');
    showPage(_finanzaTarget);
  } else if(pwd === getPwdClean()){
    // Password pulita — nascondi Black
    finanzaSblocata = true;
    finanzaModoClean = true;
    closeModal('modal-finanza-pwd');
    showPage(_finanzaTarget);
  } else {
    err.textContent = 'Password non corretta.';
    err.style.display = 'block';
    document.getElementById('finanza-pwd-input').value='';
  }
}

function switchStatsTab(tab){
  document.getElementById('stats-analitica').style.display = tab==='analitica' ? 'block' : 'none';
  document.getElementById('stats-grafica').style.display = tab==='grafica' ? 'block' : 'none';
  document.getElementById('tab-analitica').className = 'pill' + (tab==='analitica'?' active':'');
  document.getElementById('tab-grafica').className = 'pill' + (tab==='grafica'?' active':'');
  if(tab==='grafica') renderGrafici();
}

function renderGrafici(){
  const anno = new Date().getFullYear();
  const movAnno = state.movimenti.filter(m=>new Date(m.data||0).getFullYear()===anno);
  const entrateMese = Array(12).fill(0);
  const usciteMese = Array(12).fill(0);
  movAnno.forEach(m=>{
    const mese = new Date(m.data||0).getMonth();
    const imp = parseFloat(m.importo)||0;
    if(m.tipo==='entrata') entrateMese[mese]+=imp;
    else usciteMese[mese]+=imp;
  });
  const maxVal = Math.max(...entrateMese, ...usciteMese, 1);
  renderBarChart('grafico-entrate', entrateMese, 'var(--green)', maxVal);
  renderBarChart('grafico-uscite', usciteMese, 'var(--red)', maxVal);
  renderConfrontoChart('grafico-confronto', entrateMese, usciteMese);
}
const MESI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function renderStatistiche(){
  const anno = new Date().getFullYear();
  const movAnno = state.movimenti.filter(m=>{
    const d = new Date(m.data||0);
    return d.getFullYear() === anno;
  });

  // Totali anno
  const totE = movAnno.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const totU = movAnno.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  document.getElementById('s-entrate').textContent = fmt(totE);
  document.getElementById('s-uscite').textContent = fmt(totU);
  const saldo = totE - totU;
  const se = document.getElementById('s-saldo');
  se.textContent = fmt(saldo);
  se.className = 'metric-value ' + (saldo>=0?'green':'red');

  // IVA per aliquota specifica
  const ivaE = movAnno.filter(m=>m.tipo==='entrata'&&m.fatturazione==='fatturato').reduce((s,m)=>{
    const aliq=(parseFloat(m.aliquota_iva)||4)/100;
    return s+(parseFloat(m.importo)||0)*aliq;
  },0);
  const ivaU = movAnno.filter(m=>m.tipo==='uscita'&&m.fatturazione==='fatturato').reduce((s,m)=>{
    const aliq=(parseFloat(m.aliquota_iva)||4)/100;
    return s+(parseFloat(m.importo)||0)*aliq;
  },0);
  const ivaNetta = ivaE - ivaU;
  const sIvaE = document.getElementById('s-iva-entrate');
  const sIvaU = document.getElementById('s-iva-uscite');
  const sIvaN = document.getElementById('s-iva-netta');
  const sIvaSub = document.getElementById('s-iva-netta-sub');
  if(sIvaE) sIvaE.textContent = fmt(ivaE);
  if(sIvaU) sIvaU.textContent = fmt(ivaU);
  if(sIvaN){ sIvaN.textContent = fmt(Math.abs(ivaNetta)); sIvaN.style.color = ivaNetta>=0?'#6366f1':'var(--green)'; }
  if(sIvaSub) sIvaSub.textContent = ivaNetta>=0?'da versare al fisco':'IVA a credito';

  // Categorie
  const eMap={}, uMap={};
  movAnno.filter(m=>m.tipo==='entrata').forEach(m=>{eMap[m.cat]=(eMap[m.cat]||0)+(parseFloat(m.importo)||0);});
  movAnno.filter(m=>m.tipo==='uscita').forEach(m=>{uMap[m.cat]=(uMap[m.cat]||0)+(parseFloat(m.importo)||0);});
  function drawCat(data,id,cls){
    const c=document.getElementById(id); if(!c)return;
    const total=Object.values(data).reduce((s,v)=>s+v,0);
    if(!total){c.innerHTML='<div class="empty-state" style="padding:12px 0"><p>Nessun dato</p></div>';return;}
    c.innerHTML=Object.entries(data).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>`
      <div class="stat-bar-wrap">
        <div class="stat-bar-label"><span style="color:var(--text-2)">${cat}</span><span style="font-weight:600">${fmt(val)}</span></div>
        <div class="stat-bar"><div class="stat-bar-fill ${cls}" style="width:${Math.round(val/total*100)}%"></div></div>
      </div>`).join('');
  }
  drawCat(eMap,'s-stat-entrate','green');
  drawCat(uMap,'s-stat-uscite','');

  // ── GRAFICI CONFEZIONI ────────────────────────────────────────────────
  const CONF_LABELS = {'sacco 5kg':'Sacco 5kg','sacco 10kg':'Sacco 10kg','sacco 30kg':'Sacco 30kg','sfuso':'Sfuso','altro':'Altro'};
  const CONF_COLORS = {'sacco 5kg':'#A8412A','sacco 10kg':'#C9A227','sacco 30kg':'#2D7A4F','sfuso':'#6366f1','altro':'#888'};
  const CONF_KG = {'sacco 5kg':5,'sacco 10kg':10,'sacco 30kg':30};

  // Solo entrate con confezione specificata
  const entConf = movAnno.filter(m=>m.tipo==='entrata' && m.confezione && m.confezione!=='');
  const confMap = {};
  entConf.forEach(m=>{
    const c = m.confezione;
    if(!confMap[c]) confMap[c]={count:0, qty:0, importo:0};
    confMap[c].count++;
    confMap[c].qty += parseFloat(m.qty_kg)||0;
    confMap[c].importo += parseFloat(m.importo)||0;
  });
  const confEntries = Object.entries(confMap).sort((a,b)=>b[1].count-a[1].count);
  const totConf = confEntries.reduce((s,[,v])=>s+v.count,0);

  // Grafico barre confezioni
  const barEl = document.getElementById('s-confezioni-bar');
  if(barEl){
    if(!confEntries.length){ barEl.innerHTML='<div class="empty-state" style="padding:12px 0"><p>Nessun dato</p></div>'; }
    else {
      const maxC = Math.max(...confEntries.map(([,v])=>v.count));
      barEl.innerHTML = confEntries.map(([c,v])=>`
        <div class="stat-bar-wrap">
          <div class="stat-bar-label">
            <span style="color:var(--text-2)">${CONF_LABELS[c]||c}</span>
            <span style="font-weight:600">${v.count} ordini · ${v.qty>0?v.qty.toFixed(0)+' kg':''}</span>
          </div>
          <div class="stat-bar">
            <div class="stat-bar-fill" style="width:${Math.round(v.count/maxC*100)}%;background:${CONF_COLORS[c]||'var(--brand)'}"></div>
          </div>
        </div>`).join('');
    }
  }

  // Grafico torta % confezioni
  const pieEl = document.getElementById('s-confezioni-pie');
  if(pieEl){
    if(!confEntries.length || !totConf){ pieEl.innerHTML='<div class="empty-state" style="padding:12px 0"><p>Nessun dato</p></div>'; }
    else {
      const size=160, cx=80, cy=80, r=65, ri=38;
      let angle=-Math.PI/2;
      let slices='', labels='';
      confEntries.forEach(([c,v])=>{
        const pct=v.count/totConf;
        const a2=angle+pct*2*Math.PI;
        const x1=cx+r*Math.cos(angle), y1=cy+r*Math.sin(angle);
        const x2=cx+r*Math.cos(a2), y2=cy+r*Math.sin(a2);
        const xi1=cx+ri*Math.cos(angle), yi1=cy+ri*Math.sin(angle);
        const xi2=cx+ri*Math.cos(a2), yi2=cy+ri*Math.sin(a2);
        const large=pct>0.5?1:0;
        const col=CONF_COLORS[c]||'#888';
        slices+=`<path d="M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${ri},${ri} 0 ${large},0 ${xi1},${yi1}" fill="${col}" opacity="0.85"/>`;
        // label al centro angolo
        const mid=(angle+a2)/2;
        const lx=cx+(r+ri)/2*Math.cos(mid), ly=cy+(r+ri)/2*Math.sin(mid);
        if(pct>0.06) labels+=`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="#fff" font-weight="700">${Math.round(pct*100)}%</text>`;
        angle=a2;
      });
      pieEl.innerHTML=`
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${slices}${labels}</svg>
          <div style="display:grid;gap:6px">
            ${confEntries.map(([c,v])=>`
              <div style="display:flex;align-items:center;gap:7px;font-size:12px">
                <div style="width:12px;height:12px;border-radius:3px;background:${CONF_COLORS[c]||'#888'};flex-shrink:0"></div>
                <span>${CONF_LABELS[c]||c}</span>
                <span style="font-weight:700;color:var(--text)">${Math.round(v.count/totConf*100)}%</span>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  // Kg medi per confezione
  const mediaEl = document.getElementById('s-confezioni-media');
  if(mediaEl){
    const confKg = Object.entries(confMap).filter(([c])=>CONF_KG[c]);
    if(!confKg.length){ mediaEl.innerHTML='<div class="empty-state" style="padding:12px 0"><p>Nessun dato</p></div>'; }
    else {
      const totKg = confKg.reduce((s,[,v])=>s+v.qty,0);
      mediaEl.innerHTML=`
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
          ${confKg.map(([c,v])=>`
            <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);padding:14px;text-align:center">
              <div style="font-size:11px;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">${CONF_LABELS[c]||c}</div>
              <div style="font-size:24px;font-weight:800;color:${CONF_COLORS[c]||'var(--brand)'}">${v.qty>0?v.qty.toFixed(0):0}<span style="font-size:12px;font-weight:400"> kg</span></div>
              <div style="font-size:11px;color:var(--text-3);margin-top:4px">${v.count} consegne · media ${v.count>0?(v.qty/v.count).toFixed(1):0} kg</div>
              <div style="font-size:11px;color:var(--text-3)">${totKg>0?Math.round(v.qty/totKg*100):0}% del totale</div>
            </div>`).join('')}
          <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);padding:14px;text-align:center;border-top:3px solid var(--brand)">
            <div style="font-size:11px;color:var(--text-2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Totale</div>
            <div style="font-size:24px;font-weight:800;color:var(--brand)">${totKg.toFixed(0)}<span style="font-size:12px;font-weight:400"> kg</span></div>
            <div style="font-size:11px;color:var(--text-3);margin-top:4px">${confKg.reduce((s,[,v])=>s+v.count,0)} consegne totali</div>
          </div>
        </div>`;
    }
  }
}

function renderBarChart(containerId, values, color, maxVal){
  const cont = document.getElementById(containerId); if(!cont)return;
  const barHeight = 180;
  cont.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:4px;height:${barHeight}px;padding:0 4px">
      ${values.map((v,i)=>{
        const h = maxVal>0 ? Math.max(Math.round((v/maxVal)*barHeight),v>0?4:0) : 0;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
          <div style="font-size:9px;color:var(--text-3);font-weight:600">${v>0?'€'+(v>=1000?(v/1000).toFixed(1)+'k':Math.round(v)):''}</div>
          <div style="width:100%;height:${h}px;background:${color};border-radius:3px 3px 0 0;opacity:0.85;transition:height .4s;min-height:${v>0?'4px':'0'}" title="${MESI[i]}: ${fmt(v)}"></div>
          <div style="font-size:10px;color:var(--text-3)">${MESI[i]}</div>
        </div>`;
      }).join('')}
    </div>`;
}

function renderConfrontoChart(containerId, entrate, uscite){
  const cont = document.getElementById(containerId); if(!cont)return;
  const maxVal = Math.max(...entrate, ...uscite, 1);
  const barHeight = 160;
  cont.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:3px;height:${barHeight+40}px;padding:0 4px">
      ${MESI.map((mese,i)=>{
        const he = maxVal>0 ? Math.max(Math.round((entrate[i]/maxVal)*barHeight),entrate[i]>0?3:0) : 0;
        const hu = maxVal>0 ? Math.max(Math.round((uscite[i]/maxVal)*barHeight),uscite[i]>0?3:0) : 0;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
          <div style="display:flex;align-items:flex-end;gap:1px;width:100%">
            <div style="flex:1;height:${he}px;background:var(--green);border-radius:2px 2px 0 0;opacity:0.8" title="Entrate ${mese}: ${fmt(entrate[i])}"></div>
            <div style="flex:1;height:${hu}px;background:var(--red);border-radius:2px 2px 0 0;opacity:0.8" title="Uscite ${mese}: ${fmt(uscite[i])}"></div>
          </div>
          <div style="font-size:9px;color:var(--text-3)">${mese}</div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:6px">
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-2)"><div style="width:10px;height:10px;background:var(--green);border-radius:2px;opacity:0.8"></div>Entrate</div>
      <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-2)"><div style="width:10px;height:10px;background:var(--red);border-radius:2px;opacity:0.8"></div>Uscite</div>
    </div>`;
}

// ── EXPORT PDF ────────────────────────────────────────────────────────────
function exportStatsPDF(){
  const anno = new Date().getFullYear();
  const movAnno = state.movimenti.filter(m=>new Date(m.data||0).getFullYear()===anno);
  const totE = movAnno.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const totU = movAnno.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);

  const entrateMese = Array(12).fill(0);
  const usciteMese = Array(12).fill(0);
  movAnno.forEach(m=>{
    const mese = new Date(m.data||0).getMonth();
    if(m.tipo==='entrata') entrateMese[mese]+=(parseFloat(m.importo)||0);
    else usciteMese[mese]+=(parseFloat(m.importo)||0);
  });

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    body{font-family:Arial,sans-serif;padding:30px;color:#111;font-size:13px}
    h1{color:#A8412A;margin-bottom:4px}
    h2{color:#A8412A;font-size:15px;margin:20px 0 10px}
    .sub{color:#888;font-size:12px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#F4F5F7;padding:8px 12px;text-align:left;font-size:12px;border-bottom:2px solid #E8EAED}
    td{padding:7px 12px;border-bottom:1px solid #E8EAED}
    .green{color:#2D7A4F;font-weight:700}.red{color:#C0352A;font-weight:700}
    .metrics{display:flex;gap:20px;margin-bottom:20px}
    .metric{background:#F4F5F7;border-radius:8px;padding:14px 18px;flex:1;border-top:3px solid #A8412A}
    .metric-label{font-size:11px;color:#888;margin-bottom:6px;text-transform:uppercase}
    .metric-value{font-size:22px;font-weight:700}
    .footer{margin-top:30px;padding-top:12px;border-top:1px solid #eee;font-size:11px;color:#999;text-align:center}
  </style></head><body>
  <h1>Mulino Vitaliti Antonio — Report Finanziario</h1>
  <div class="sub">Anno ${anno} · Generato il ${new Date().toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'})}</div>
  <div class="metrics">
    <div class="metric"><div class="metric-label">Totale entrate</div><div class="metric-value green">${fmt(totE)}</div></div>
    <div class="metric"><div class="metric-label">Totale uscite</div><div class="metric-value red">${fmt(totU)}</div></div>
    <div class="metric"><div class="metric-label">Saldo netto</div><div class="metric-value ${totE-totU>=0?'green':'red'}">${fmt(totE-totU)}</div></div>
  </div>
  <h2>Riepilogo mensile ${anno}</h2>
  <table>
    <thead><tr><th>Mese</th><th>Entrate</th><th>Uscite</th><th>Saldo mese</th></tr></thead>
    <tbody>
      ${MESI.map((m,i)=>`<tr>
        <td><strong>${m} ${anno}</strong></td>
        <td class="green">+${fmt(entrateMese[i])}</td>
        <td class="red">-${fmt(usciteMese[i])}</td>
        <td class="${entrateMese[i]-usciteMese[i]>=0?'green':'red'}">${fmt(entrateMese[i]-usciteMese[i])}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <h2>Tutti i movimenti ${anno}</h2>
  <table>
    <thead><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th>Tipo</th><th>Importo</th></tr></thead>
    <tbody>
      ${movAnno.sort((a,b)=>new Date(a.data)-new Date(b.data)).map(m=>`<tr>
        <td>${new Date(m.data).toLocaleDateString('it-IT')}</td>
        <td>${m.descrizione||m.desc||'—'}</td>
        <td>${m.cat||'—'}</td>
        <td>${m.tipo}</td>
        <td class="${m.tipo==='entrata'?'green':'red'}">${m.tipo==='entrata'?'+':'-'}${fmt(m.importo)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div class="footer">Mulino Vitaliti Antonio — Gestionale interno — Dal 1930</div>
  </body></html>`;

  const w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=>{w.print();},500);
}

// ── EXPORT EXCEL ──────────────────────────────────────────────────────────
function exportStatsExcel(){
  const anno = new Date().getFullYear();
  const movAnno = state.movimenti.filter(m=>new Date(m.data||0).getFullYear()===anno);
  const entrateMese = Array(12).fill(0);
  const usciteMese = Array(12).fill(0);
  movAnno.forEach(m=>{
    const mese = new Date(m.data||0).getMonth();
    if(m.tipo==='entrata') entrateMese[mese]+=(parseFloat(m.importo)||0);
    else usciteMese[mese]+=(parseFloat(m.importo)||0);
  });

  // CSV riepilogo mensile
  let csv = `Mulino Vitaliti Antonio - Report ${anno}\n\n`;
  csv += `RIEPILOGO MENSILE\n`;
  csv += `Mese,Entrate,Uscite,Saldo\n`;
  MESI.forEach((m,i)=>{
    csv += `${m} ${anno},${entrateMese[i].toFixed(2)},${usciteMese[i].toFixed(2)},${(entrateMese[i]-usciteMese[i]).toFixed(2)}\n`;
  });
  const totE = movAnno.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const totU = movAnno.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  csv += `TOTALE,${totE.toFixed(2)},${totU.toFixed(2)},${(totE-totU).toFixed(2)}\n\n`;

  csv += `TUTTI I MOVIMENTI\n`;
  csv += `Data,Descrizione,Categoria,Tipo,Importo\n`;
  movAnno.sort((a,b)=>new Date(a.data)-new Date(b.data)).forEach(m=>{
    const desc = (m.descrizione||m.desc||'').replace(/,/g,';');
    csv += `${new Date(m.data).toLocaleDateString('it-IT')},${desc},${m.cat||''},${m.tipo},${m.tipo==='entrata'?'':'-'}${parseFloat(m.importo).toFixed(2)}\n`;
  });

  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Vitaliti_Report_${anno}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
const ATT_ICONS = {chiamata:'ti-phone',email:'ti-mail',nota:'ti-note',ordine:'ti-package'};
const ATT_LABELS = {chiamata:'Chiamata',email:'Email',nota:'Nota',ordine:'Ordine'};
let attFilter = 'tutte';

function attScadenza(data){
  if(!data) return 'futura';
  const oggi = new Date(); oggi.setHours(0,0,0,0);
  const d = new Date(data); d.setHours(0,0,0,0);
  if(d.getTime()===oggi.getTime()) return 'oggi';
  if(d < oggi) return 'scaduta';
  return 'futura';
}
function attDataLabel(data){
  const s=attScadenza(data);
  if(!data) return {cls:'futura',txt:'Nessuna data'};
  const d=new Date(data);
  const txt=d.toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'});
  return {cls:s,txt};
}

function renderAttItem(a, showLead=true){
  const {cls,txt}=attDataLabel(a.data_scadenza||a.scadenza);
  const icn=ATT_ICONS[a.tipo]||'ti-checkbox';
  const leadStr = showLead&&(a.lead_nome||a.collegata_nome) ?
    `<span style="font-size:11px;color:var(--text-2)"><i class="ti ti-user" style="font-size:10px"></i> ${a.lead_nome||a.collegata_nome}</span>` : '';
  return `<div class="att-item">
    <div class="att-icon ${a.tipo}"><i class="ti ${icn}"></i></div>
    <div class="att-body">
      <div class="att-title">${a.titolo||ATT_LABELS[a.tipo]}</div>
      ${a.note?`<div class="att-note">${a.note}</div>`:''}
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span class="att-date ${cls}">
          <span class="status-dot" style="background:${cls==='oggi'?'var(--green)':cls==='scaduta'?'var(--red)':'var(--text-3)'}"></span>${txt}
        </span>
        ${leadStr}
      </div>
    </div>
    <div class="att-actions">
      <button class="btn btn-sm btn-icon" onclick="completaAttivita(${a.id})" title="Completa"><i class="ti ti-check" style="color:var(--green)"></i></button>
      <button class="btn btn-sm btn-icon" onclick="editAttivita(${a.id})" title="Modifica"><i class="ti ti-pencil"></i></button>
      <button class="btn btn-sm btn-icon btn-danger" onclick="eliminaAttivita(${a.id})" title="Elimina"><i class="ti ti-trash"></i></button>
    </div>
  </div>`;
}

async function loadAttivita(){
  try{
    const r=await api.get('/api/attivita');
    state.attivita = r.error?[]:r;
    aggiornaAttBadge();
  }catch(e){state.attivita=[];}
}

function aggiornaAttBadge(){
  const urgenti=(state.attivita||[]).filter(a=>!a.completata&&(attScadenza(a.data_scadenza||a.scadenza)==='oggi'||attScadenza(a.data_scadenza||a.scadenza)==='scaduta')).length;
  const badge=document.getElementById('att-badge');
  if(badge){badge.textContent=urgenti;badge.style.display=urgenti?'':'none';}
}

async function renderPageAttivita(){
  await loadAttivita();
  const list=document.getElementById('att-list-page'); if(!list)return;
  let items=(state.attivita||[]).filter(a=>!a.completata);

  // Filtro tipo/data
  if(attFilter==='oggi') items=items.filter(a=>attScadenza(a.data_scadenza||a.scadenza)==='oggi');
  else if(attFilter==='scadute') items=items.filter(a=>attScadenza(a.data_scadenza||a.scadenza)==='scaduta');
  else if(['chiamata','email','ordine','nota'].includes(attFilter)) items=items.filter(a=>a.tipo===attFilter);

  if(!items.length){
    list.innerHTML='<div class="empty-state"><i class="ti ti-checkbox" style="font-size:34px;margin-bottom:9px;opacity:0.3;display:block"></i><p>Nessuna attività</p></div>';
    return;
  }

  // Raggruppa per pipeline
  const pipelines = state.pipelines||[{id:'default',nome:'Pipeline principale',colore:'var(--brand)'}];
  const pipelineMap = {};
  pipelines.forEach(p=>{ pipelineMap[p.id]={...p, items:[]}; });
  pipelineMap['__nessuna'] = {id:'__nessuna', nome:'Senza pipeline', colore:'var(--text-3)', items:[]};

  items.sort((a,b)=>{
    const ord={scaduta:0,oggi:1,futura:2};
    return (ord[attScadenza(a.data_scadenza||a.scadenza)]||2)-(ord[attScadenza(b.data_scadenza||b.scadenza)]||2);
  });

  items.forEach(a=>{
    const pid = a.pipeline_id||'__nessuna';
    if(!pipelineMap[pid]) pipelineMap[pid] = {id:pid, nome:'Pipeline sconosciuta', colore:'var(--text-3)', items:[]};
    pipelineMap[pid].items.push(a);
  });

  const html = Object.values(pipelineMap).filter(p=>p.items.length>0).map(p=>`
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding:8px 12px;background:${p.colore||'var(--brand)'};border-radius:var(--r)">
        <i class="ti ti-layout-kanban" style="color:#fff;font-size:16px"></i>
        <span style="font-weight:700;color:#fff;font-size:14px">${p.nome}</span>
        <span style="background:rgba(255,255,255,0.25);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:auto">${p.items.length} attività</span>
      </div>
      <div style="display:grid;gap:8px;padding-left:4px">
        ${p.items.map(a=>`<div class="card" style="padding:0 14px">${renderAttItem(a,true)}</div>`).join('')}
      </div>
    </div>`).join('');

  list.innerHTML = html || '<div class="empty-state"><p>Nessuna attività</p></div>';
}

function filterAttivita(f,el){
  attFilter=f;
  document.querySelectorAll('#page-attivita .pills .pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  renderPageAttivita();
}

// Popola pipeline select nel modal
function popolaPipelineModal(){
  const sel = document.getElementById('att-pipeline');
  if(!sel) return;
  const pipelines = state.pipelines||[{id:'default',nome:'Pipeline principale'}];
  sel.innerHTML = '<option value="">— seleziona pipeline —</option>' +
    pipelines.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
}

function onAttPipelineChange(){
  const pipelineId = document.getElementById('att-pipeline').value;
  const leadSel = document.getElementById('att-lead');
  if(!pipelineId){ leadSel.innerHTML='<option value="">— seleziona prima la pipeline —</option>'; return; }
  const leads = (state.leads||[]).filter(l=>{
    // Cerca i lead associati alla pipeline tramite lead_pipeline_stato o pipeline_id
    return l.pipeline_id===pipelineId || (state.leadPipelineStati||[]).find(s=>s.lead_id===l.id&&s.pipeline_id===pipelineId);
  });
  // Se non trova lead con pipeline, mostra tutti i lead
  const tuttiLeads = leads.length>0 ? leads : (state.leads||[]);
  leadSel.innerHTML = '<option value="">— seleziona lead —</option>' +
    tuttiLeads.map(l=>`<option value="${l.id}">${l.nome}</option>`).join('');
}

function openModalAttivita(leadId='', pipelineId=''){
  document.getElementById('att-id').value='';
  document.getElementById('att-titolo').value='';
  document.getElementById('att-note').value='';
  document.getElementById('att-data').value=new Date().toISOString().slice(0,10);
  document.getElementById('modal-att-title').textContent='Nuova attività';
  setTipoAtt('chiamata');
  popolaPipelineModal();
  if(pipelineId){
    document.getElementById('att-pipeline').value=pipelineId;
    onAttPipelineChange();
    if(leadId) setTimeout(()=>{ document.getElementById('att-lead').value=leadId; },50);
  } else {
    onAttPipelineChange();
  }
  openModal('modal-attivita');
}

function setTipoAtt(tipo){
  if(tipo === 'ordine'){
    // Leggi il lead già selezionato nel modal-attivita
    const leadId = parseInt(document.getElementById('att-lead')?.value) || null;
    const lead = leadId ? (state.leads||[]).find(l=>l.id===leadId) : null;
    closeModal('modal-attivita');
    if(lead){
      apriNuovoOrdinePerLead(lead);
    } else {
      // Nessun lead selezionato — apri il modal ordine vuoto
      apriNuovoOrdine();
    }
    return;
  }
  document.getElementById('att-tipo').value=tipo;
  ['chiamata','email','nota','ordine'].forEach(t=>{
    const btn=document.getElementById('att-btn-'+t);
    if(btn){ btn.style.background=t===tipo?'var(--brand-light)':''; btn.style.borderColor=t===tipo?'var(--brand)':''; }
  });
}

async function salvaAttivita(){
  const id=document.getElementById('att-id').value;
  const titolo=document.getElementById('att-titolo').value.trim();
  if(!titolo) return alert('Inserisci un titolo');
  const leadId = parseInt(document.getElementById('att-lead').value)||null;
  const pipelineId = document.getElementById('att-pipeline').value||null;
  if(!leadId) return alert('Seleziona un lead dalla pipeline');
  const lead = (state.leads||[]).find(l=>l.id===leadId);
  const pipeline = (state.pipelines||[]).find(p=>p.id===pipelineId);
  const body={
    tipo:document.getElementById('att-tipo').value,
    titolo, note:document.getElementById('att-note').value,
    data_scadenza:document.getElementById('att-data').value||null,
    ora:document.getElementById('att-ora')?.value||null,
    lead_id:leadId, pipeline_id:pipelineId,
    collegata_tipo:'lead', collegata_id:leadId, collegata_nome:lead?.nome||'',
    completata:false
  };
  if(id){
    await api.put('/api/attivita/'+id,body);
    const idx=(state.attivita||[]).findIndex(a=>a.id===parseInt(id));
    if(idx>=0) state.attivita[idx]=Object.assign(state.attivita[idx],body,{lead_nome:lead?.nome});
  } else {
    const data=await api.post('/api/attivita',body);
    if(!data.error){ state.attivita=state.attivita||[]; state.attivita.unshift({...data,lead_nome:lead?.nome}); }
  }
  closeModal('modal-attivita');
  aggiornaAttBadge();
  // Aggiorna feed nel pannello dettaglio lead se aperto
  if(leadId && _currentLeadDetailId===leadId) renderLeadDetailFeed(leadId);
  if(document.getElementById('page-attivita').classList.contains('active')) renderPageAttivita();
  showSave();
}

async function completaAttivita(id){
  await api.put('/api/attivita/'+id,{completata:true});
  if(state.attivita){const a=state.attivita.find(x=>x.id===id);if(a)a.completata=true;}
  aggiornaAttBadge();
  if(document.getElementById('page-attivita').classList.contains('active')) renderPageAttivita();
  showSave();
}

function editAttivita(id){
  const a=(state.attivita||[]).find(x=>x.id===id); if(!a)return;
  document.getElementById('att-id').value=a.id;
  document.getElementById('att-titolo').value=a.titolo||'';
  document.getElementById('att-note').value=a.note||'';
  document.getElementById('att-data').value=(a.data_scadenza||a.scadenza||'').slice(0,10);
  document.getElementById('att-ora').value=a.ora||'';
  document.getElementById('modal-att-title').textContent='Modifica attività';
  setTipoAtt(a.tipo||'chiamata');
  popolaPipelineModal();
  if(a.pipeline_id){
    document.getElementById('att-pipeline').value=a.pipeline_id;
    onAttPipelineChange();
    setTimeout(()=>{ if(a.lead_id) document.getElementById('att-lead').value=a.lead_id; },50);
  }
  openModal('modal-attivita');
}

async function eliminaAttivita(id){
  conferma(async()=>{
    await api.del('/api/attivita/'+id);
    state.attivita=(state.attivita||[]).filter(a=>a.id!==id);
    aggiornaAttBadge();
    if(document.getElementById('page-attivita').classList.contains('active')) renderPageAttivita();
    showSave();
  });
}

function renderAttivitaPerEntita(tipo, id){
  const list = (state.attivita||[]).filter(a=>
    (a.collegata_tipo===tipo && a.collegata_id===id) ||
    (tipo==='lead' && a.lead_id===id)
  ).sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));

  if(!list.length) return `
    <div style="padding:18px 0;text-align:center;color:var(--text-3);font-size:13px">
      <i class="ti ti-activity" style="font-size:26px;display:block;margin-bottom:8px;opacity:0.3"></i>
      Nessuna attività ancora — usa i pulsanti sopra per iniziare
    </div>`;

  const icnMap = {chiamata:'ti-phone',email:'ti-mail',ordine:'ti-package',nota:'ti-note'};
  const colorMap = {chiamata:'var(--blue)',email:'var(--orange)',ordine:'var(--green)',nota:'var(--gold)'};
  const labelMap = {chiamata:'Chiamata',email:'Email',ordine:'Ordine',nota:'Nota'};

  return `<div style="position:relative;padding-left:28px">
    <!-- Linea verticale timeline -->
    <div style="position:absolute;left:11px;top:8px;bottom:8px;width:2px;background:var(--border)"></div>
    ${list.map((a,i)=>{
      const {cls,txt} = attDataLabel(a.data_scadenza||a.scadenza);
      const icn = icnMap[a.tipo]||'ti-checkbox';
      const col = colorMap[a.tipo]||'var(--brand)';
      const lab = labelMap[a.tipo]||a.tipo;
      const data_crea = a.created_at ? new Date(a.created_at).toLocaleDateString('it-IT',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
      const completata = a.completata;
      return `
      <div style="position:relative;margin-bottom:${i<list.length-1?'14px':'0'};${completata?'opacity:0.5':''}">
        <!-- Pallino timeline -->
        <div style="position:absolute;left:-22px;top:10px;width:22px;height:22px;border-radius:50%;background:${completata?'var(--surface-2)':col};display:flex;align-items:center;justify-content:center;border:2px solid ${completata?'var(--border)':col}">
          <i class="ti ${completata?'ti-check':icn}" style="font-size:11px;color:${completata?'var(--text-3)':'#fff'}"></i>
        </div>
        <!-- Card attività -->
        <div style="background:var(--surface-2);border-radius:var(--r);padding:10px 12px;border-left:3px solid ${completata?'var(--border)':col}">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
                <span style="font-size:11px;font-weight:700;color:${col};text-transform:uppercase;letter-spacing:0.4px">${lab}</span>
                ${completata?'<span style="font-size:10px;background:#dcfce7;color:var(--green);padding:1px 6px;border-radius:99px;font-weight:700">✓ Fatto</span>':''}
              </div>
              <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:${a.note?'4px':'0'};${completata?'text-decoration:line-through':''}">${a.titolo||lab}</div>
              ${a.note?`<div style="font-size:12px;color:var(--text-2);white-space:pre-line">${a.note}</div>`:''}
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
              ${a.data_scadenza?`<span style="font-size:10px;font-weight:600;color:${cls==='scaduta'?'var(--red)':cls==='oggi'?'var(--orange)':'var(--text-3)'};background:${cls==='scaduta'?'#fee2e2':cls==='oggi'?'#fef3c7':'var(--surface-2)'};padding:2px 6px;border-radius:99px">${cls==='scaduta'?'⚠ '+txt:cls==='oggi'?'Oggi':txt}${a.ora?' · '+a.ora:''}</span>`:''}
              <div style="display:flex;gap:4px">
                ${!completata?`<button class="btn btn-sm btn-icon" onclick="completaAttivitaLead(${a.id},${id})" title="Segna come fatto" style="padding:3px 6px"><i class="ti ti-check" style="color:var(--green);font-size:13px"></i></button>`:''}
                <button class="btn btn-sm btn-icon btn-danger" onclick="eliminaAttivitaLead(${a.id},${id})" title="Elimina" style="padding:3px 6px"><i class="ti ti-trash" style="font-size:13px"></i></button>
              </div>
            </div>
          </div>
          ${data_crea?`<div style="font-size:10px;color:var(--text-3);margin-top:5px">${data_crea}</div>`:''}
        </div>
      </div>`;}
    ).join('')}
  </div>`;
}

async function completaAttivitaLead(attId, leadId){
  await api.put('/api/attivita/'+attId, {completata:true});
  if(state.attivita){ const a=state.attivita.find(x=>x.id===attId); if(a) a.completata=true; }
  aggiornaAttBadge();
  // Aggiorna il feed nel pannello dettaglio
  const feedEl = document.getElementById('att-lead-'+leadId);
  if(feedEl) feedEl.innerHTML = renderAttivitaPerEntita('lead', leadId);
  showSave();
}

async function eliminaAttivitaLead(attId, leadId){
  conferma(async()=>{
    await api.del('/api/attivita/'+attId);
    state.attivita = (state.attivita||[]).filter(a=>a.id!==attId);
    aggiornaAttBadge();
    const feedEl = document.getElementById('att-lead-'+leadId);
    if(feedEl) feedEl.innerHTML = renderAttivitaPerEntita('lead', leadId);
    showSave();
  });
}


// ── WHATSAPP ──────────────────────────────────────────────────────────────
let waChats = [];
let waChatAttiva = null;
let waPollingInterval = null;

async function loadWaChats(){
  const cont = document.getElementById('wa-chats-list');
  if(!cont) return;
  try{
    const data = await api.get('/api/whatsapp/chats');
    if(data.error){
      cont.innerHTML = `<div class="empty-state" style="padding:20px"><i class="ti ti-alert-circle"></i><p style="font-size:12px">${data.error}</p></div>`;
      return;
    }
    waChats = data.items || data.chats || [];
    renderWaChatsList();
  }catch(e){
    cont.innerHTML = '<div class="empty-state" style="padding:20px"><p style="font-size:12px">Errore di caricamento</p></div>';
  }
}

function renderWaChatsList(){
  const cont = document.getElementById('wa-chats-list');
  if(!cont) return;
  if(!waChats.length){
    cont.innerHTML = '<div class="empty-state" style="padding:28px"><i class="ti ti-brand-whatsapp" style="color:#25D366;font-size:32px"></i><p style="font-size:12px;color:var(--text-2)">Nessuna conversazione</p></div>';
    return;
  }
  cont.innerHTML = waChats.map((c,i)=>{
    const nome = c.name || c.attendee_name || c.title || 'Sconosciuto';
    const ultimoMsg = c.last_message?.text || c.lastMessage?.text || '';
    const ora = c.timestamp ? new Date(c.timestamp).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) : '';
    return `
      <div onclick="apriChatWhatsapp(${i})" id="wa-chat-item-${i}" class="wa-chat-item" style="cursor:pointer;display:flex;align-items:center;gap:11px;padding:11px 14px;border-bottom:1px solid #f0f2f5;transition:background .12s">
        <div style="width:42px;height:42px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">${ini(nome)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:14px;color:#111b21;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${nome}</div>
          <div style="font-size:12.5px;color:#667781;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ultimoMsg||'&nbsp;'}</div>
        </div>
        ${ora?`<span style="font-size:11px;color:#667781;flex-shrink:0">${ora}</span>`:''}
      </div>`;
  }).join('');
}

async function apriChatWhatsapp(idx){
  document.querySelectorAll('#wa-chats-list .wa-chat-item').forEach(el=>el.classList.remove('active'));
  const el = document.getElementById('wa-chat-item-'+idx); if(el) el.classList.add('active');
  const chat = waChats[idx]; if(!chat) return;
  waChatAttiva = chat;
  const chatId = chat.id || chat.chat_id;
  const nome = chat.name || chat.attendee_name || chat.title || 'Sconosciuto';
  const cont = document.getElementById('wa-conversation');
  cont.innerHTML = `
    <div style="padding:12px 18px;background:#f0f2f5;border-bottom:1px solid #e9edef;display:flex;align-items:center;gap:12px">
      <div style="width:38px;height:38px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0">${ini(nome)}</div>
      <div style="font-weight:600;font-size:15px;color:#111b21">${nome}</div>
    </div>
    <div id="wa-messages" style="flex:1;overflow-y:auto;padding:18px 22px;display:flex;flex-direction:column;gap:6px;background:#ECE5DD;background-image:url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'%23d9d2c7\\' fill-opacity=\\'0.3\\'%3E%3Ccircle cx=\\'30\\' cy=\\'30\\' r=\\'1.5\\'/%3E%3C/g%3E%3C/svg%3E')">
      <div style="text-align:center;color:#667781;font-size:12px"><i class="ti ti-loader"></i> Caricamento messaggi...</div>
    </div>
    <div style="padding:10px 16px;background:#f0f2f5;border-top:1px solid #e9edef;display:flex;gap:8px;align-items:center">
      <input type="text" id="wa-input-msg" placeholder="Scrivi un messaggio..." style="flex:1;border-radius:20px;padding:10px 16px;border:none;background:#fff" onkeydown="if(event.key==='Enter'){event.preventDefault();inviaMessaggioWhatsapp('${chatId}')}">
      <button onclick="inviaMessaggioWhatsapp('${chatId}')" style="width:40px;height:40px;border-radius:50%;background:#25D366;border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0"><i class="ti ti-send" style="font-size:17px"></i></button>
    </div>`;
  await caricaMessaggiWhatsapp(chatId);
  // Polling per nuovi messaggi ogni 8 secondi mentre la chat è aperta
  if(waPollingInterval) clearInterval(waPollingInterval);
  waPollingInterval = setInterval(()=>caricaMessaggiWhatsapp(chatId, true), 8000);
}

async function caricaMessaggiWhatsapp(chatId, silenzioso){
  const cont = document.getElementById('wa-messages');
  if(!cont) return;
  try{
    const data = await api.get('/api/whatsapp/chats/'+chatId+'/messages');
    if(data.error){
      if(!silenzioso) cont.innerHTML = `<div style="text-align:center;color:var(--red);font-size:12px">${data.error}</div>`;
      return;
    }
    const msgs = (data.items || data.messages || []).slice().reverse();
    if(!msgs.length){
      cont.innerHTML = '<div style="text-align:center;color:var(--text-2);font-size:12px">Nessun messaggio</div>';
      return;
    }
    cont.innerHTML = msgs.map(m=>{
      const mio = m.is_sender || m.sender_id === waChatAttiva?.account_id;
      const testo = m.text || m.body || '';
      const ora = m.timestamp ? new Date(m.timestamp).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) : '';
      return `
        <div style="display:flex;justify-content:${mio?'flex-end':'flex-start'}">
          <div style="max-width:65%;background:${mio?'#d9fdd3':'#fff'};border-radius:8px;padding:6px 9px 8px;box-shadow:0 1px 0.5px rgba(0,0,0,.13)">
            <div style="font-size:14.2px;color:#111b21;white-space:pre-wrap;word-break:break-word;line-height:1.35">${testo}</div>
            <div style="font-size:11px;color:#667781;text-align:right;margin-top:2px">${ora}</div>
          </div>
        </div>`;
    }).join('');
    if(!silenzioso) cont.scrollTop = cont.scrollHeight;
  }catch(e){
    if(!silenzioso) cont.innerHTML = '<div style="text-align:center;color:var(--red);font-size:12px">Errore di caricamento</div>';
  }
}

async function inviaMessaggioWhatsapp(chatId){
  const input = document.getElementById('wa-input-msg');
  const testo = input.value.trim();
  if(!testo) return;
  input.value='';
  input.disabled = true;
  try{
    await api.post('/api/whatsapp/chats/'+chatId+'/messages', {text: testo});
    await caricaMessaggiWhatsapp(chatId);
    showSave();
  }catch(e){
    alert('Errore invio messaggio');
  }finally{
    input.disabled = false;
    input.focus();
  }
}

function apriNuovaChatWhatsapp(){
  document.getElementById('wa-nuovo-numero').value='';
  document.getElementById('wa-nuovo-testo').value='';
  const sel = document.getElementById('wa-nuovo-cliente');
  sel.innerHTML = '<option value="">— Nessuno —</option>' + (state.clienti||[]).filter(c=>c.tel).map(c=>`<option value="${c.id}" data-tel="${c.tel}">${c.nome} (${c.tel})</option>`).join('');
  openModal('modal-wa-nuova-chat');
}

async function inviaNuovaChatWhatsapp(){
  const telefono = document.getElementById('wa-nuovo-numero').value.trim();
  const testo = document.getElementById('wa-nuovo-testo').value.trim();
  if(!telefono) return alert('Inserisci un numero di telefono');
  if(!testo) return alert('Scrivi un messaggio');
  try{
    const data = await api.post('/api/whatsapp/start-chat', {telefono, testo});
    if(data.error) return alert('Errore: '+data.error);
    closeModal('modal-wa-nuova-chat');
    showSave();
    await loadWaChats();
  }catch(e){
    alert('Errore di rete');
  }
}

// ── SPEDIZIONI ────────────────────────────────────────────────────────────
async function initPaginaSpedizioni(){
  const nonConnesso = document.getElementById('sped-non-connesso');
  const connesso = document.getElementById('sped-connesso');
  const headerActions = document.getElementById('spedizioni-header-actions');
  if(nonConnesso) nonConnesso.style.display = 'none';
  if(connesso) connesso.style.display = 'none';
  if(headerActions) headerActions.innerHTML = '';
  try{
    const status = await api.get('/api/spedizioni/gmail-status');
    if(!status.connected){
      if(nonConnesso) nonConnesso.style.display = 'block';
      return;
    }
    if(connesso) connesso.style.display = 'block';
    if(headerActions) headerActions.innerHTML = `
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" id="btn-sync-spedizioni" onclick="sincronizzaSpedizioni()"><i class="ti ti-refresh"></i>Sincronizza da email</button>
        <button class="btn btn-sm" onclick="disconnettiCasellaSpedizioni()"><i class="ti ti-plug-off"></i></button>
      </div>`;
    await caricaSpedizioni();
  }catch(e){
    if(nonConnesso) nonConnesso.style.display = 'block';
  }
}

async function disconnettiCasellaSpedizioni(){
  conferma(async()=>{
    try{
      await api.post('/api/spedizioni/disconnect', {});
      await initPaginaSpedizioni();
      showSave();
    }catch(e){ alert('Errore di rete: '+e.message); }
  });
}

async function caricaSpedizioni(){
  const cont = document.getElementById('spedizioni-list');
  if(!cont) return;
  cont.innerHTML = '<div class="empty-state" style="padding:20px"><i class="ti ti-loader"></i><p>Caricamento spedizioni...</p></div>';
  try{
    const data = await api.get('/api/spedizioni');
    if(data.error){
      cont.innerHTML = `<div class="empty-state" style="padding:20px"><p>${data.error}</p></div>`;
      return;
    }
    renderSpedizioni(data);
  }catch(e){
    cont.innerHTML = '<div class="empty-state" style="padding:20px"><p>Errore di caricamento</p></div>';
  }
}

function renderSpedizioni(lista){
  const cont = document.getElementById('spedizioni-list');
  if(!cont) return;
  if(!lista.length){
    cont.innerHTML = '<div class="empty-state" style="padding:30px"><i class="ti ti-truck-delivery" style="font-size:32px"></i><p>Nessuna spedizione trovata. Clicca "Sincronizza da email" per cercare le notifiche di One Express.</p></div>';
    return;
  }
  cont.innerHTML = lista.map(s=>{
    const trackingUrl = 'https://www.oneexpress.it/it/cerca-spedizione/?tracking=' + encodeURIComponent(s.numero_tracking||'');
    const dataEmailFmt = s.data_email ? new Date(s.data_email).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
    return `
    <div class="card" style="padding:16px 18px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:220px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <i class="ti ti-truck-delivery" style="color:var(--brand);font-size:18px"></i>
            <span style="font-weight:700;font-size:14px">DDT n. ${s.numero_ddt||'—'}</span>
            ${dataEmailFmt?`<span style="font-size:11px;color:var(--text-3)">· ricevuta il ${dataEmailFmt}</span>`:''}
          </div>
          <div style="font-size:13px;color:var(--text-2);margin-bottom:3px"><i class="ti ti-map-pin" style="font-size:13px"></i> ${s.destinatario||'—'}</div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:8px">${s.indirizzo_consegna||''}</div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--text-2)">
            ${s.data_consegna_prevista?`<span><i class="ti ti-calendar-event" style="font-size:13px"></i> Consegna prevista: <strong>${s.data_consegna_prevista}</strong></span>`:''}
            ${s.affiliato?`<span><i class="ti ti-building-warehouse" style="font-size:13px"></i> ${s.affiliato}</span>`:''}
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
          <span class="badge" style="background:var(--brand-light);color:var(--brand);font-family:var(--font-mono);font-size:11px">${s.numero_tracking||'—'}</span>
          <div style="display:flex;gap:6px">
            <a href="${trackingUrl}" target="_blank" class="btn btn-sm btn-primary"><i class="ti ti-external-link"></i>Traccia</a>
            <button class="btn btn-sm btn-danger btn-icon" onclick="eliminaSpedizione(${s.id})" title="Rimuovi"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function sincronizzaSpedizioni(){
  const btn = document.getElementById('btn-sync-spedizioni');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Ricerca in corso...'; }
  try{
    const r = await api.post('/api/spedizioni/sincronizza', {});
    if(r.error){
      alert('Errore: '+r.error);
    } else {
      alert(`Trovate ${r.trovate} email, ${r.nuove} nuove spedizioni aggiunte`);
    }
    await caricaSpedizioni();
  }catch(e){
    alert('Errore di rete: '+e.message);
  }finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-refresh"></i>Sincronizza da email'; }
  }
}

async function eliminaSpedizione(id){
  conferma(async()=>{
    await api.del('/api/spedizioni/'+id);
    await caricaSpedizioni();
    showSave();
  });
}

// ── TASK ──────────────────────────────────────────────────────────────────
let taskFilterCorrente = 'tutte';

async function loadTasks(){
  try{ state.tasks = await api.get('/api/tasks'); }catch(e){ state.tasks=[]; }
}

function aggiornaTaskBadge(){
  const badge = document.getElementById('task-badge');
  if(!badge || !currentUser) return;
  const mieAperte = (state.tasks||[]).filter(t=>t.assegnata_a===currentUser.username && t.stato!=='fatto');
  if(mieAperte.length){
    badge.textContent = mieAperte.length;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function popolaSelectAssegnatari(){
  const sel = document.getElementById('task-assegnata-a');
  if(!sel) return;
  const opts = (state.utentiList||[]).map(u=>`<option value="${u.username}">${u.nome}</option>`).join('');
  sel.innerHTML = opts || `<option value="${currentUser?.username||''}">${currentUser?.nome||'Me stesso'}</option>`;
}

async function caricaUtentiPerTask(){
  try{
    const utenti = await api.get('/api/utenti');
    // Ogni utente non-admin può assegnare solo a sé stesso o a Giovanni (admin)
    if(currentUser && currentUser.ruolo!=='admin'){
      const adminUser = utenti.find(u=>u.ruolo==='admin');
      state.utentiList = [
        {username: currentUser.username, nome: currentUser.nome + ' (io)'},
        ...(adminUser ? [{username: adminUser.username, nome: adminUser.nome}] : [])
      ];
    } else {
      state.utentiList = utenti.map(u=>({username:u.username, nome:u.nome}));
    }
  }catch(e){ state.utentiList = [{username:currentUser?.username, nome:currentUser?.nome||'Me stesso'}]; }
  popolaSelectAssegnatari();
}

function apriModalTask(taskEsistente){
  document.getElementById('modal-task-title').textContent = taskEsistente ? 'Modifica task' : 'Nuova task';
  document.getElementById('task-id').value = taskEsistente?.id || '';
  document.getElementById('task-titolo').value = taskEsistente?.titolo || '';
  document.getElementById('task-descrizione').value = taskEsistente?.descrizione || '';
  document.getElementById('task-scadenza').value = (taskEsistente?.scadenza||'').slice(0,10);
  document.getElementById('task-priorita').value = taskEsistente?.priorita || 'media';
  caricaUtentiPerTask().then(()=>{
    if(taskEsistente?.assegnata_a){
      const sel = document.getElementById('task-assegnata-a');
      sel.value = taskEsistente.assegnata_a;
    }
  });
  openModal('modal-task');
}

async function salvaTask(){
  const id = document.getElementById('task-id').value;
  const titolo = document.getElementById('task-titolo').value.trim();
  if(!titolo) return alert('Inserisci il titolo della task');
  const body = {
    titolo,
    descrizione: document.getElementById('task-descrizione').value.trim(),
    assegnata_a: document.getElementById('task-assegnata-a').value,
    assegnata_da: currentUser.username,
    priorita: document.getElementById('task-priorita').value,
    scadenza: document.getElementById('task-scadenza').value || null,
    stato: id ? undefined : 'da_fare'
  };
  try{
    if(id){
      await api.put('/api/tasks/'+id, body);
      const t = state.tasks.find(x=>x.id===parseInt(id));
      if(t) Object.assign(t, body);
    } else {
      const nuova = await api.post('/api/tasks', body);
      state.tasks.unshift(nuova);
    }
    closeModal('modal-task');
    renderTaskBoard();
    renderDashTask();
    aggiornaTaskBadge();
    showSave();
  }catch(e){ alert('Errore: '+e.message); }
}

function filterTask(tipo, el){
  taskFilterCorrente = tipo;
  document.querySelectorAll('#page-task .pill').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  renderTaskBoard();
}

function taskFiltrate(){
  let list = state.tasks || [];
  if(taskFilterCorrente==='mie') list = list.filter(t=>t.assegnata_a===currentUser?.username);
  else if(taskFilterCorrente==='assegnate') list = list.filter(t=>t.assegnata_da===currentUser?.username && t.assegnata_a!==currentUser?.username);
  return list;
}

const PRIORITA_LABEL = {alta:'Alta', media:'Media', bassa:'Bassa'};

function renderTaskCard(t){
  const scadenzaFmt = t.scadenza ? new Date(t.scadenza).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'}) : '';
  const isScaduta = t.scadenza && new Date(t.scadenza) < new Date(new Date().toDateString()) && t.stato!=='fatto';
  const assegnatario = (state.utentiList||[]).find(u=>u.username===t.assegnata_a);
  const nomeAssegnatario = assegnatario?.nome?.split(' ')[0] || t.assegnata_a || '';
  const priColors = {alta:'var(--red)',media:'var(--orange)',bassa:'var(--green)'};
  const priLabels = {alta:'Alta',media:'Media',bassa:'Bassa'};
  const priCol = priColors[t.priorita||'media'];
  const priLab = priLabels[t.priorita||'media'];
  return `
    <div class="task-card task-priority-${t.priorita||'media'}" draggable="true" id="task-card-${t.id}"
      ondragstart="dragTaskStart(event,${t.id})" ondragend="dragTaskEnd(event)"
      onclick="apriModalTask(${JSON.stringify(t).replace(/"/g,'&quot;')})">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;margin-bottom:5px">
        <div class="task-card-title" style="margin:0">${t.titolo}</div>
        <span style="font-size:10px;font-weight:700;color:${priCol};background:${t.priorita==='alta'?'#fee2e2':t.priorita==='bassa'?'#dcfce7':'#fef3c7'};padding:2px 7px;border-radius:99px;white-space:nowrap;flex-shrink:0">${priLab}</span>
      </div>
      ${t.descrizione?`<div style="font-size:11px;color:var(--text-2);margin-bottom:7px;line-height:1.4">${t.descrizione.slice(0,80)}${t.descrizione.length>80?'…':''}</div>`:''}
      <div class="task-card-meta" style="margin-top:7px">
        <span style="display:flex;align-items:center;gap:4px;background:var(--surface-2);padding:2px 7px;border-radius:99px">
          <i class="ti ti-user" style="font-size:11px"></i>${nomeAssegnatario}
        </span>
        <div style="display:flex;align-items:center;gap:6px">
          ${scadenzaFmt?`<span style="color:${isScaduta?'var(--red)':'var(--text-3)'};font-weight:${isScaduta?'700':'400'};font-size:11px">${isScaduta?'⚠ ':''}${scadenzaFmt}</span>`:''}
          <button class="btn btn-icon btn-sm btn-danger" onclick="event.stopPropagation();eliminaTask(${t.id})" style="padding:3px 6px"><i class="ti ti-trash" style="font-size:11px"></i></button>
        </div>
      </div>
    </div>`;
}

function renderTaskBoard(){
  if(!document.getElementById('task-list-da_fare')) return;
  const list = taskFiltrate();
  ['da_fare','in_corso','fatto'].forEach(stato=>{
    const items = list.filter(t=>(t.stato||'da_fare')===stato);
    document.getElementById('task-list-'+stato).innerHTML = items.length
      ? items.map(renderTaskCard).join('')
      : '<div class="empty-state" style="padding:14px 0"><p style="font-size:12px">Nessuna task</p></div>';
    document.getElementById('task-count-'+stato).textContent = items.length;
  });
}

// ── STREAK MANAGEMENT ─────────────────────────────────────────────────────
function getStreakData() {
  try {
    return JSON.parse(localStorage.getItem('vv_streak_'+( currentUser?.username||'x')) || '{"days":0,"lastDate":""}');
  } catch(e) { return {days:0, lastDate:''}; }
}
function saveStreakData(data) {
  try { localStorage.setItem('vv_streak_'+(currentUser?.username||'x'), JSON.stringify(data)); } catch(e) {}
}
function aggiornaStreak(tutteCompletate) {
  const oggi = new Date().toISOString().slice(0,10);
  const data = getStreakData();
  if (tutteCompletate) {
    if (data.lastDate === oggi) {
      // già aggiornato oggi, non fare nulla
    } else {
      const ieri = new Date(); ieri.setDate(ieri.getDate()-1);
      const ieriStr = ieri.toISOString().slice(0,10);
      if (data.lastDate === ieriStr) {
        data.days = (data.days||0) + 1; // continua la scia
      } else if (data.lastDate !== oggi) {
        data.days = 1; // ricomincia
      }
      data.lastDate = oggi;
      saveStreakData(data);
    }
  }
  return data;
}

// ── CONFETTI ───────────────────────────────────────────────────────────────
function lanceConfetti(originEl) {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);
  const colors = ['#A8412A','#f59e0b','#10b981','#6366f1','#ec4899','#f97316'];
  const rect = originEl ? originEl.getBoundingClientRect() : {left: window.innerWidth/2, top: window.innerHeight/2};
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    const color = colors[Math.floor(Math.random()*colors.length)];
    const size = Math.random()*8+4;
    const angle = Math.random()*360;
    const distance = Math.random()*200+80;
    const dx = Math.cos(angle*Math.PI/180)*distance;
    const dy = Math.sin(angle*Math.PI/180)*distance - 80;
    c.style.cssText = `position:absolute;width:${size}px;height:${size}px;background:${color};
      border-radius:${Math.random()>0.5?'50%':'2px'};
      left:${rect.left + rect.width/2}px;top:${rect.top}px;
      animation:none;transition:all ${0.6+Math.random()*0.4}s cubic-bezier(.25,.46,.45,.94);
      transform:rotate(${Math.random()*360}deg);opacity:1`;
    container.appendChild(c);
    setTimeout(()=>{
      c.style.transform = `translate(${dx}px,${dy}px) rotate(${Math.random()*720}deg)`;
      c.style.opacity = '0';
    }, 10+i*5);
  }
  setTimeout(()=>container.remove(), 1200);
}

// ── TASK GIORNALIERI (3 task del giorno) ──────────────────────────────────
let _dailyTaskIds = []; // IDs dei 3 task selezionati per oggi
let _dailyTaskChecked = {}; // completati oggi nella dashboard

function getDailyTaskKey() {
  const oggi = new Date().toISOString().slice(0,10);
  return 'vv_daily_'+(currentUser?.username||'x')+'_'+oggi;
}
function loadDailyTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(getDailyTaskKey())||'{}');
    _dailyTaskIds = saved.ids||[];
    _dailyTaskChecked = saved.checked||{};
  } catch(e) { _dailyTaskIds=[]; _dailyTaskChecked={}; }
}
function saveDailyTasks() {
  try { localStorage.setItem(getDailyTaskKey(), JSON.stringify({ids:_dailyTaskIds, checked:_dailyTaskChecked})); } catch(e) {}
}

function renderDashTask(){
  if(!currentUser) return;
  loadDailyTasks();

  const tutte = (state.tasks||[]).filter(t=>t.assegnata_a===currentUser.username);
  const pending = tutte.filter(t=>t.stato!=='fatto').sort((a,b)=>{
    const priMap={alta:0,media:1,bassa:2};
    return (priMap[a.priorita]??1)-(priMap[b.priorita]??1);
  });

  // Greeting personalizzato
  const ora = new Date().getHours();
  const saluto = ora<12?'Buongiorno':ora<18?'Buon pomeriggio':'Buonasera';
  const nomeBreve = (currentUser.nome||'').split(' ')[0];
  const greetingEl = document.getElementById('dash-task-greeting');
  if(greetingEl) greetingEl.textContent = `${saluto} ${nomeBreve}! Ecco le tue 3 sfide 💪`;

  // Rimuove task non più esistenti o già completati dai daily
  _dailyTaskIds = _dailyTaskIds.filter(id => tutte.find(t=>t.id===id && t.stato!=='fatto'));

  // Auto-popola con i task più urgenti se la lista è vuota
  if(_dailyTaskIds.length === 0 && pending.length > 0) {
    _dailyTaskIds = pending.slice(0,3).map(t=>t.id);
    saveDailyTasks();
  }

  const dailyTasks = _dailyTaskIds.map(id=>tutte.find(t=>t.id===id)).filter(Boolean);
  const completatiOggi = dailyTasks.filter(t=>_dailyTaskChecked[t.id]).length;
  const totaleDaily = dailyTasks.length;
  const pct = totaleDaily > 0 ? Math.round((completatiOggi/totaleDaily)*100) : 0;

  // Progress bar e label motivazionale
  const labels = {
    0: totaleDaily===0 ? 'Nessuna task da fare oggi 🎉' : 'Pronto a spaccare? Completa il primo task!',
    34: 'Ottimo inizio, continua così! 💪',
    67: 'Metà strada fatta, stai andando alla grande! 🔥',
    100: 'Obiettivo raggiunto! Sei un fulmine oggi! 🚀'
  };
  const labelKey = pct===100?100:pct>=67?67:pct>=34?34:0;
  const labelEl = document.getElementById('dash-task-progress-label');
  const countEl = document.getElementById('dash-task-progress-count');
  const barEl = document.getElementById('dash-task-progress-bar');
  if(labelEl) labelEl.textContent = labels[labelKey];
  if(countEl) countEl.textContent = totaleDaily>0 ? `${completatiOggi}/${totaleDaily}` : '';
  if(barEl){ barEl.style.width=pct+'%'; barEl.style.background=pct===100?'var(--green)':'linear-gradient(90deg,var(--brand),#e8734a)'; }

  // Streak
  if(pct===100 && totaleDaily>0) aggiornaStreak(true);
  const streak = getStreakData();
  const streakIcon = document.getElementById('dash-streak-icon');
  const streakLabel = document.getElementById('dash-streak-label');
  if(streakIcon) streakIcon.textContent = streak.days>=3?'🔥':'⚡';
  if(streakLabel) streakLabel.textContent = streak.days===1?'1 giorno':streak.days>1?`${streak.days} giorni`:'Inizia!';

  // Render task giornalieri
  const cont = document.getElementById('dash-task-daily');
  if(!cont) return;

  if(totaleDaily===0 && pending.length===0){
    cont.innerHTML=`<div style="text-align:center;padding:16px 0"><div style="font-size:32px;margin-bottom:6px">🏆</div><div style="font-size:14px;font-weight:700;color:var(--green)">Tutto completato!</div><div style="font-size:12px;color:var(--text-2);margin-top:3px">Nessuna task in sospeso.</div></div>`;
    return;
  }

  const priConfig = {alta:{icon:'🔴',color:'#dc2626'},media:{icon:'🟡',color:'#d97706'},bassa:{icon:'🟢',color:'#16a34a'}};

  cont.innerHTML = dailyTasks.map((t,i)=>{
    const checked = !!_dailyTaskChecked[t.id];
    const pri = priConfig[t.priorita]||priConfig.media;
    return `<div class="dash-task-item ${checked?'completed':''}" style="animation-delay:${i*0.06}s" id="dti-${t.id}">
      <div class="dash-task-check ${checked?'checked':''}" onclick="toggleDailyTask(${t.id},this)" title="${checked?'Segna come non fatto':'Segna come fatto'}">
        ${checked?'<i class="ti ti-check" style="font-size:13px;color:#fff"></i>':''}
      </div>
      <div style="font-size:16px;flex-shrink:0">${pri.icon}</div>
      <div class="dash-task-title ${checked?'struck':''}" id="dtt-${t.id}">${t.titolo}</div>
      ${t.scadenza?`<span style="font-size:10px;color:var(--text-3);flex-shrink:0">${new Date(t.scadenza).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})}</span>`:''}
    </div>`;
  }).join('') + (pending.filter(t=>!_dailyTaskIds.includes(t.id)).length>0 && _dailyTaskIds.length<3 ? `
    <div style="margin-top:4px">
      <select onchange="aggiuntaDailyTask(this.value);this.value=''" style="width:100%;font-size:12px;padding:6px 10px;border:1.5px dashed var(--border);border-radius:var(--r);background:#fff;color:var(--text-2);cursor:pointer">
        <option value="">+ Aggiungi un task al focus...</option>
        ${pending.filter(t=>!_dailyTaskIds.includes(t.id)).slice(0,10).map(t=>`<option value="${t.id}">${t.titolo}</option>`).join('')}
      </select>
    </div>` : '');
}

function toggleDailyTask(id, el) {
  const wasChecked = !!_dailyTaskChecked[id];
  _dailyTaskChecked[id] = !wasChecked;
  saveDailyTasks();

  // Animazione check
  const check = el;
  const titleEl = document.getElementById('dtt-'+id);
  const itemEl = document.getElementById('dti-'+id);

  if(!wasChecked) {
    check.classList.add('checked');
    check.innerHTML = '<i class="ti ti-check" style="font-size:13px;color:#fff"></i>';
    if(titleEl) titleEl.classList.add('struck');
    if(itemEl){ itemEl.classList.add('completed'); itemEl.style.animation='taskComplete .3s ease'; }
    lanceConfetti(el);
    // Rimuovi dalla lista dopo 1.2s (tempo per vedere animazione + confetti)
    setTimeout(() => {
      _dailyTaskIds = _dailyTaskIds.filter(tid => tid !== id);
      delete _dailyTaskChecked[id];
      saveDailyTasks();
      renderDashTask();
    }, 1200);
  } else {
    check.classList.remove('checked');
    check.innerHTML = '';
    if(titleEl) titleEl.classList.remove('struck');
    if(itemEl){ itemEl.classList.remove('completed'); itemEl.style.animation=''; }
    delete _dailyTaskChecked[id];
    saveDailyTasks();
    // Aggiorna progress bar subito per il caso "de-check"
    renderDashTask();
  }
}

function aggiuntaDailyTask(idStr) {
  const id = parseInt(idStr);
  if(!id || _dailyTaskIds.includes(id) || _dailyTaskIds.length>=3) return;
  _dailyTaskIds.push(id);
  saveDailyTasks();
  renderDashTask();
}


let _dragTaskId = null;
function dragTaskStart(e, id){ _dragTaskId = id; e.target.classList.add('dragging'); }
function dragTaskEnd(e){ e.target.classList.remove('dragging'); }

async function dropTask(e, nuovoStato){
  e.preventDefault();
  if(!_dragTaskId) return;
  const t = state.tasks.find(x=>x.id===_dragTaskId);
  if(!t || t.stato===nuovoStato){ _dragTaskId=null; return; }
  t.stato = nuovoStato;
  renderTaskBoard();
  try{ await api.put('/api/tasks/'+_dragTaskId, {stato:nuovoStato}); showSave(); }catch(err){}
  _dragTaskId = null;
}

async function eliminaTask(id){
  conferma(async()=>{
    await api.del('/api/tasks/'+id);
    state.tasks = (state.tasks||[]).filter(t=>t.id!==id);
    renderTaskBoard();
    renderDashTask();
    aggiornaTaskBadge();
    showSave();
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
initSidebarState();
document.addEventListener('keydown', e=>{ if(e.key==='Escape'){document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));chiudiDettaglio();}});

// ── AUTO-RELOAD: controlla ogni 60 secondi se il server è stato aggiornato ──
(function avviaAutoReload(){
  let versioneAttuale = null;

  fetch('/api/version').then(r=>r.json()).then(d=>{
    versioneAttuale = d.v;
    setInterval(()=>{
      fetch('/api/version').then(r=>r.json()).then(d=>{
        if(versioneAttuale && d.v !== versioneAttuale){
          window.location.reload();
        }
      }).catch(()=>{});
    }, 60000);
  }).catch(()=>{});
})();
