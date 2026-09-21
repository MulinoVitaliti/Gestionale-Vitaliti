// app-mappa.js — Mappa dei clienti per regione
// Un cerchio per regione, grande in proporzione al numero di clienti.
// Leaflet viene caricato dal CDN solo la prima volta che si apre la mappa.

// Centri indicativi delle regioni, dove disegnare i cerchi
const CENTRI_REGIONI = {
  'Piemonte': [45.05, 7.92], "Valle d'Aosta": [45.74, 7.40], 'Lombardia': [45.62, 9.75],
  'Trentino-Alto Adige': [46.43, 11.17], 'Veneto': [45.65, 11.85], 'Friuli-Venezia Giulia': [46.10, 13.10],
  'Liguria': [44.30, 8.70], 'Emilia-Romagna': [44.52, 11.00], 'Toscana': [43.45, 11.10],
  'Umbria': [42.95, 12.50], 'Marche': [43.35, 13.10], 'Lazio': [41.95, 12.75],
  'Abruzzo': [42.25, 13.85], 'Molise': [41.65, 14.60], 'Campania': [40.90, 14.80],
  'Puglia': [41.00, 16.40], 'Basilicata': [40.55, 16.05], 'Calabria': [39.05, 16.40],
  'Sicilia': [37.55, 14.20], 'Sardegna': [40.05, 9.05],
};

let _mcMappa = null, _mcLayer = null, _mcDati = null;

function caricaLeaflet(){
  return new Promise((ok, ko) => {
    if (window.L) return ok();
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    js.onload = ok; js.onerror = () => ko(new Error('Mappa non disponibile'));
    document.head.appendChild(js);
  });
}

const mcEuro = n => '€ ' + Math.round(Number(n)||0).toLocaleString('it-IT');

async function apriMappaClienti(){
  openModal('modal-mappa-clienti');
  document.getElementById('mc-riepilogo').innerHTML =
    '<div style="font-size:13px;color:var(--text-3)">Caricamento...</div>';
  try{
    const [dati] = await Promise.all([api.get('/api/clienti/per-regione'), caricaLeaflet()]);
    if (dati.error) throw new Error(dati.error);
    _mcDati = dati;
    disegnaMappa();
    renderRiepilogoMappa();
    renderListaRegioni();
  }catch(e){
    document.getElementById('mc-riepilogo').innerHTML =
      `<div style="font-size:13px;color:var(--red)">${e.message}</div>`;
  }
}

function disegnaMappa(){
  const box = document.getElementById('mc-mappa');
  if (!_mcMappa){
    _mcMappa = L.map(box, { zoomControl: true, attributionControl: true }).setView([41.9, 12.6], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 10, minZoom: 5,
      attribution: '&copy; OpenStreetMap'
    }).addTo(_mcMappa);
  }
  if (_mcLayer) _mcLayer.remove();
  _mcLayer = L.layerGroup().addTo(_mcMappa);

  const max = Math.max(1, ...(_mcDati.regioni || []).map(r => r.clienti));
  (_mcDati.regioni || []).forEach(r => {
    const c = CENTRI_REGIONI[r.regione];
    if (!c) return;
    // raggio proporzionale all'area, non al diametro: cosi' il doppio dei clienti
    // appare davvero come il doppio, e non come il quadruplo
    const raggio = 12 + 34 * Math.sqrt(r.clienti / max);
    const cerchio = L.circleMarker(c, {
      radius: raggio, color: '#973D37', weight: 2,
      fillColor: '#C9A84C', fillOpacity: 0.55
    }).addTo(_mcLayer);
    cerchio.bindTooltip(`<b>${r.regione}</b><br>${r.clienti} clienti · ${mcEuro(r.fatturato)}`, { direction: 'top' });
    cerchio.on('click', () => mostraRegione(r.regione));
    L.marker(c, {
      icon: L.divIcon({ className: '', html:
        `<div style="font:700 13px Open Sans,Arial;color:#fff;text-align:center;width:40px;margin-left:-20px;margin-top:-9px;text-shadow:0 1px 2px rgba(0,0,0,.5)">${r.clienti}</div>` }),
      interactive: false
    }).addTo(_mcLayer);
  });
  setTimeout(() => _mcMappa.invalidateSize(), 200);
}

function renderRiepilogoMappa(){
  const d = _mcDati;
  const localizzati = (d.regioni || []).reduce((s, r) => s + r.clienti, 0);
  const nl = (d.non_localizzati || []).length;
  document.getElementById('mc-riepilogo').innerHTML = `
    <div style="display:flex;gap:18px">
      <div><div style="font-size:22px;font-weight:700;color:var(--brand)">${(d.regioni||[]).length}</div>
           <div style="font-size:11px;color:var(--text-3)">regioni</div></div>
      <div><div style="font-size:22px;font-weight:700">${localizzati}</div>
           <div style="font-size:11px;color:var(--text-3)">clienti sulla mappa</div></div>
    </div>
    ${nl ? `<div style="font-size:11.5px;color:var(--orange);margin-top:9px;cursor:pointer" onclick="mostraNonLocalizzati()">
       ${nl} clienti senza città riconoscibile — vedi</div>` : ''}`;
}

function renderListaRegioni(){
  const lista = document.getElementById('mc-lista');
  lista.innerHTML = (_mcDati.regioni || []).map(r => `
    <div onclick="mostraRegione('${r.regione.replace(/'/g, "\\'")}')"
         style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer"
         onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''">
      <div style="flex:1;font-size:13px;font-weight:600">${r.regione}</div>
      <div style="font-size:12px;color:var(--text-3)">${mcEuro(r.fatturato)}</div>
      <div style="min-width:34px;text-align:center;background:var(--brand);color:#fff;border-radius:12px;padding:2px 8px;font-size:12px;font-weight:700">${r.clienti}</div>
    </div>`).join('');
}

function mostraRegione(nome){
  const r = (_mcDati.regioni || []).find(x => x.regione === nome);
  if (!r) return;
  const c = CENTRI_REGIONI[nome];
  if (c && _mcMappa) _mcMappa.setView(c, 7);
  document.getElementById('mc-lista').innerHTML = `
    <div style="padding:11px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
      <button class="btn btn-icon btn-sm" onclick="renderListaRegioni();_mcMappa&&_mcMappa.setView([41.9,12.6],6)"><i class="ti ti-arrow-left"></i></button>
      <div><div style="font-weight:700;font-size:14px">${r.regione}</div>
           <div style="font-size:11px;color:var(--text-3)">${r.clienti} clienti · ${mcEuro(r.fatturato)}</div></div>
    </div>` +
    r.elenco.map(cl => `
      <div style="padding:9px 16px;border-bottom:1px solid var(--border)">
        <div style="font-size:13px;font-weight:600">${cl.nome}</div>
        <div style="font-size:11px;color:var(--text-3)">${cl.citta || ''} · ${cl.ordini} ordini · ${mcEuro(cl.fatturato)}${cl.ultimo ? ' · ultimo ' + new Date(cl.ultimo).toLocaleDateString('it-IT') : ''}</div>
      </div>`).join('');
}

function mostraNonLocalizzati(){
  const nl = _mcDati.non_localizzati || [];
  document.getElementById('mc-lista').innerHTML = `
    <div style="padding:11px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
      <button class="btn btn-icon btn-sm" onclick="renderListaRegioni()"><i class="ti ti-arrow-left"></i></button>
      <div><div style="font-weight:700;font-size:14px">Senza città riconoscibile</div>
           <div style="font-size:11px;color:var(--text-3)">Correggi la città nella scheda cliente per vederli sulla mappa</div></div>
    </div>` +
    nl.map(c => `<div style="padding:9px 16px;border-bottom:1px solid var(--border);font-size:13px">
       ${c.nome}<div style="font-size:11px;color:var(--text-3)">città: ${c.citta || '<i>vuota</i>'}</div></div>`).join('');
}

window.apriMappaClienti = apriMappaClienti;
window.mostraRegione = mostraRegione;
window.renderListaRegioni = renderListaRegioni;
window.mostraNonLocalizzati = mostraNonLocalizzati;
