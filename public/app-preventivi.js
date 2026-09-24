
// app-preventivi.js — Preventivi creati dalla pipeline
// I prezzi vengono suggeriti dal listino della città del cliente, con il
// prezzo minimo sempre in vista: sotto quello non si scende.

let _pvLead = null;
let _pvRighe = [];

const pvEuro = n => '€ ' + Number(n || 0).toLocaleString('it-IT', {minimumFractionDigits:2, maximumFractionDigits:2});

async function apriPreventivo(leadId){
  const l = (state.leads||[]).find(x => x.id === leadId);
  if(!l) return;
  _pvLead = l;
  _pvRighe = [];

  // se il lead ha già dei prodotti di interesse, parto da quelli
  const prodotti = String(l.prodotto || '').split(/\s*,\s*/).filter(Boolean);
  if(prodotti.length) prodotti.forEach(p => _pvRighe.push({prodotto: p, kg: '', prezzo: ''}));
  else _pvRighe.push({prodotto: '', kg: '', prezzo: ''});

  document.getElementById('pv-cliente').innerHTML = `
    <div style="font-weight:700;font-size:14px">${l.nome}</div>
    <div style="color:var(--text-2);font-size:12.5px;margin-top:3px">
      ${[l.contatto, l.indirizzo, l.citta].filter(Boolean).join(' · ')}
      ${l.piva ? '<br>P.IVA ' + l.piva : ''}
    </div>
    ${l.citta ? `<div style="font-size:11.5px;color:var(--text-3);margin-top:5px">Prezzi suggeriti dal listino di ${l.citta}</div>` : ''}`;
  document.getElementById('pv-email').value = l.email || '';
  document.getElementById('pv-note').value = '';
  document.getElementById('pv-validita').value = 30;
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
  const tot = _pvRighe.reduce((s,r) => s + (Number(r.kg)||0) * (Number(r.prezzo)||0), 0);
  const kg = _pvRighe.reduce((s,r) => s + (Number(r.kg)||0), 0);
  document.getElementById('pv-totale').textContent = pvEuro(tot);
  document.getElementById('pv-peso').textContent = kg.toLocaleString('it-IT') + ' kg';
}

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

  const btn = document.getElementById(azione === 'email' ? 'pv-btn-mail' : 'pv-btn-pdf');
  const testo = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i>Attendi...';
  try{
    const l = _pvLead;
    const r = await api.post('/api/preventivi', {
      lead_id: l.id, intestazione: l.nome, referente: l.contatto, indirizzo: l.indirizzo,
      citta: l.citta, piva: l.piva, email: document.getElementById('pv-email').value.trim(),
      righe: righe.map(x => ({prodotto: x.prodotto, kg: Number(x.kg), prezzo: Number(x.prezzo)})),
      validita_giorni: Number(document.getElementById('pv-validita').value) || 30,
      note: document.getElementById('pv-note').value.trim()
    });
    if(r.error){ err.textContent = r.error; err.style.display = 'block'; return; }
    const p = r.preventivo;

    if(azione === 'pdf'){
      window.open('/api/preventivi/' + p.id + '/pdf', '_blank');
      closeModal('modal-preventivo');
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
