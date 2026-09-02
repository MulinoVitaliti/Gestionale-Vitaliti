// app-analisi.js — Pannello "Analisi di Mirko"
// Margini per cliente, previsione di cassa, anomalie, pacchetto commercialista,
// e i parametri di costo su cui si basano le stime.

const AM_EURO = n => '€ ' + Number(n || 0).toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2});

async function apriAnalisiMirko(){
  openModal('modal-analisi-mirko');
  document.querySelectorAll('#modal-analisi-mirko .pill').forEach((p,i)=>p.classList.toggle('active', i===0));
  tabAnalisi('margini');
}

async function tabAnalisi(quale, el){
  if(el){ document.querySelectorAll('#modal-analisi-mirko .pill').forEach(p=>p.classList.remove('active')); el.classList.add('active'); }
  const box = document.getElementById('am-contenuto');
  box.innerHTML = '<div style="padding:20px;color:var(--text-3);font-size:13px">Calcolo in corso...</div>';
  try{
    if(quale === 'margini') return renderMargini(box, await api.get('/api/analisi/margini?mesi=6'));
    if(quale === 'cassa') return renderCassa(box, await api.get('/api/analisi/cassa?giorni=60'));
    if(quale === 'anomalie') return renderAnomalie(box, await api.get('/api/analisi/anomalie'));
    if(quale === 'commercialista') return renderCommercialista(box, await api.get('/api/analisi/commercialista'));
    if(quale === 'costi') return renderCosti(box);
  }catch(e){ box.innerHTML = '<div style="padding:20px;color:var(--red)">Errore: ' + e.message + '</div>'; }
}

function renderMargini(box, d){
  if(d.error || !d.righe) return box.innerHTML = '<div style="padding:20px">Dati non disponibili.</div>';
  if(!d.righe.length) return box.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-3);font-size:13px">Non ci sono ordini con peso registrato negli ultimi mesi.<br><span style="font-size:12px">Il margine si calcola sui kg: senza quelli non è stimabile.</span></div>';
  box.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="border-bottom:2px solid var(--border)">
      <th style="padding:6px;text-align:left">Cliente</th>
      <th style="padding:6px;text-align:center">Zona</th>
      <th style="padding:6px;text-align:right">Kg</th>
      <th style="padding:6px;text-align:right">Fatturato</th>
      <th style="padding:6px;text-align:right">€/kg</th>
      <th style="padding:6px;text-align:right">Margine</th>
      <th style="padding:6px;text-align:right">%</th>
    </tr></thead><tbody>` +
    d.righe.map(r => {
      const col = r.margine_pct < 5 ? 'var(--red)' : r.margine_pct < 15 ? 'var(--orange)' : 'var(--green)';
      return `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:5px 6px"><strong>${r.cliente}</strong><div style="font-size:10px;color:var(--text-3)">${r.citta}</div></td>
        <td style="padding:5px 6px;text-align:center;font-size:11px">${r.zona}</td>
        <td style="padding:5px 6px;text-align:right">${r.kg.toLocaleString('it-IT')}</td>
        <td style="padding:5px 6px;text-align:right">${AM_EURO(r.fatturato)}</td>
        <td style="padding:5px 6px;text-align:right">${Number(r.prezzo_medio_kg).toFixed(3)}</td>
        <td style="padding:5px 6px;text-align:right;font-weight:600;color:${col}">${AM_EURO(r.margine)}</td>
        <td style="padding:5px 6px;text-align:right;color:${col}">${Number(r.margine_pct).toFixed(1)}%</td>
      </tr>`;
    }).join('') + '</tbody></table>';
}

function renderCassa(box, p){
  if(p.error) return box.innerHTML = '<div style="padding:20px">Dati non disponibili.</div>';
  const col = p.saldo_previsto >= 0 ? 'var(--green)' : 'var(--red)';
  box.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
      <div class="card" style="padding:14px"><div style="font-size:11px;color:var(--text-3)">ENTRATE ATTESE</div>
        <div style="font-size:20px;font-weight:700;color:var(--green)">${AM_EURO(p.entrate_attese)}</div>
        <div style="font-size:11px;color:var(--text-3)">${p.n_fatture_da_incassare} fatture da incassare</div></div>
      <div class="card" style="padding:14px"><div style="font-size:11px;color:var(--text-3)">USCITE PREVISTE</div>
        <div style="font-size:20px;font-weight:700;color:var(--red)">${AM_EURO(p.uscite_previste)}</div>
        <div style="font-size:11px;color:var(--text-3)">fornitori, fissi e impegni</div></div>
      <div class="card" style="padding:14px"><div style="font-size:11px;color:var(--text-3)">SALDO A ${p.periodo_giorni} GIORNI</div>
        <div style="font-size:20px;font-weight:700;color:${col}">${AM_EURO(p.saldo_previsto)}</div></div>
    </div>
    ${Number(p.di_cui_scadute) > 0 ? `<div style="background:rgba(230,150,60,.12);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px">
      ⚠️ Di quanto atteso, <strong>${AM_EURO(p.di_cui_scadute)}</strong> è già scaduto da oltre 30 giorni: da sollecitare prima di contarci.</div>` : ''}
    <div style="font-size:12px;color:var(--text-2)">
      <strong>Dettaglio uscite</strong><br>
      Fornitori da pagare: ${AM_EURO(p.fornitori_da_pagare)}<br>
      Costi fissi stimati: ${AM_EURO(p.costi_fissi_stimati)}<br>
      ${(p.dettaglio_uscite||[]).map(x=>x).join('<br>')}
    </div>`;
}

function renderAnomalie(box, an){
  if(!Array.isArray(an) || !an.length) return box.innerHTML = '<div style="padding:26px;text-align:center;color:var(--green);font-size:13px">✅ Nessuna anomalia rilevata.</div>';
  const col = { alta: 'var(--red)', media: 'var(--orange)', bassa: 'var(--text-3)' };
  box.innerHTML = an.map(a => `<div style="display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border)">
      <span style="color:${col[a.gravita]};font-size:16px">●</span>
      <div><div style="font-size:13px">${a.testo}</div>
      <div style="font-size:10px;color:var(--text-3);text-transform:uppercase">${a.tipo.replace('_',' ')}</div></div>
    </div>`).join('');
}

function renderCommercialista(box, p){
  if(p.error) return box.innerHTML = '<div style="padding:20px">Dati non disponibili.</div>';
  const riga = (t, o) => `<div style="display:flex;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="flex:1">${t}</span>
      <strong>${o.n || 0}</strong><span style="color:var(--text-3);margin-left:8px;width:110px;text-align:right">${AM_EURO(o.tot)}</span></div>`;
  box.innerHTML =
    riga('Movimenti senza categoria (6 mesi)', p.movimenti_senza_categoria) +
    riga('Incassi ancora aperti', p.incassi_aperti) +
    riga('DDT consegnati e non fatturati', p.ddt_non_fatturati) +
    riga('Entrate registrate senza IVA (6 mesi)', p.entrate_esenti_iva) +
    `<div style="margin-top:16px">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">Da chiedere al commercialista</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input id="dc-nuova" type="text" placeholder="Scrivi una domanda da portare in studio..." style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px" onkeydown="if(event.key==='Enter')aggiungiDomanda()">
        <button class="btn btn-sm btn-primary" onclick="aggiungiDomanda()"><i class="ti ti-plus"></i>Aggiungi</button>
      </div>
      <div id="dc-lista">${(p.domande_aperte||[]).length
        ? p.domande_aperte.map(d=>`<div style="padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
            ${d.domanda}${d.contesto?`<div style="font-size:11px;color:var(--text-3)">${d.contesto}</div>`:''}
            <div style="font-size:10px;color:var(--text-3)">in lista dal ${d.dal}</div></div>`).join('')
        : '<div style="font-size:12px;color:var(--text-3)">Nessuna domanda in lista.</div>'}</div>
    </div>`;
}

async function aggiungiDomanda(){
  const el = document.getElementById('dc-nuova');
  if(!el.value.trim()) return;
  await api.post('/api/domande-commercialista', {domanda: el.value.trim()});
  el.value = '';
  showSave();
  tabAnalisi('commercialista');
}

async function renderCosti(box){
  const [costi, impegni, grano] = await Promise.all([
    api.get('/api/costi'), api.get('/api/impegni'), api.get('/api/costi/grano-reale?mesi=12')]);

  const boxGrano = grano && grano.disponibile
    ? `<div style="background:rgba(60,160,80,.12);border-radius:8px;padding:11px 13px;margin-bottom:14px;font-size:12px">
        <strong>Costo del grano calcolato dagli acquisti veri</strong><br>
        ${Math.round(grano.kg).toLocaleString('it-IT')} kg comprati per ${AM_EURO(grano.spesa)} in ${grano.acquisti} fatture →
        <strong>${Number(grano.euro_kg_grano).toFixed(3)} €/kg</strong> di grano.<br>
        <span style="color:var(--text-3)">Il valore scritto qui sotto viene ignorato: conta questo. Ultimo acquisto ${grano.ultimo ? new Date(grano.ultimo).toLocaleDateString('it-IT') : 'n/d'}.</span>
        ${grano.senza_kg ? `<br><span style="color:var(--orange)">⚠️ ${grano.senza_kg} acquisti non hanno i kg indicati e restano fuori dal calcolo.</span>
        <div style="margin-top:8px"><button class="btn btn-sm" onclick="ricalcolaKgGrano(this)"><i class="ti ti-refresh"></i>Rileggi i kg dalle fatture</button></div>` : ''}
      </div>`
    : `<div style="background:rgba(230,150,60,.12);border-radius:8px;padding:11px 13px;margin-bottom:14px;font-size:12px">
        <strong>Costo del grano non ricavabile dagli acquisti</strong><br>
        ${(grano && grano.motivo) || 'Nessun dato disponibile.'}<br>
        <span style="color:var(--text-3)">Finché è così viene usato il valore impostato a mano qui sotto.</span>
        <div style="margin-top:8px"><button class="btn btn-sm" onclick="ricalcolaKgGrano(this)"><i class="ti ti-refresh"></i>Rileggi i kg dalle fatture di Fatture in Cloud</button></div>
      </div>`;

  box.innerHTML = boxGrano +
    `<div style="font-size:12px;color:var(--text-3);margin-bottom:10px">Questi valori determinano il calcolo dei margini e della cassa. Aggiornali quando cambiano i costi reali.</div>` +
    (Array.isArray(costi) ? costi.map(c => `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
        <div style="flex:1"><div style="font-size:13px;font-weight:600">${c.chiave.replace(/_/g,' ')}</div>
          <div style="font-size:11px;color:var(--text-3)">${c.descrizione||''}</div></div>
        <input type="number" step="0.01" value="${Number(c.valore)}" id="cc-${c.chiave}" style="width:100px;padding:5px 8px;border:1px solid var(--border);border-radius:7px;font-size:13px;text-align:right">
        <button class="btn btn-sm" onclick="salvaCosto('${c.chiave}')"><i class="ti ti-check"></i></button>
      </div>`).join('') : '') +
    `<div style="margin-top:18px">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">Uscite ricorrenti mensili</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input id="imp-desc" type="text" placeholder="Descrizione (es. rata CRIAS)" style="flex:1;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">
        <input id="imp-importo" type="number" step="0.01" placeholder="€/mese" style="width:110px;padding:7px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px">
        <button class="btn btn-sm btn-primary" onclick="aggiungiImpegno()"><i class="ti ti-plus"></i></button>
      </div>` +
      ((Array.isArray(impegni) && impegni.length) ? impegni.map(i=>`<div style="display:flex;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:13px">
          <span style="flex:1">${i.descrizione}</span><strong>${AM_EURO(i.importo)}</strong>
          <button class="btn btn-sm btn-danger" style="margin-left:10px" onclick="eliminaImpegno(${i.id})"><i class="ti ti-trash"></i></button>
        </div>`).join('') : '<div style="font-size:12px;color:var(--text-3)">Nessuna uscita ricorrente registrata.</div>') +
    `</div>`;
}

async function salvaCosto(chiave){
  const v = parseFloat(document.getElementById('cc-'+chiave).value);
  await api.patch('/api/costi/'+chiave, {valore: v});
  showSave();
}

async function aggiungiImpegno(){
  const d = document.getElementById('imp-desc').value.trim();
  const i = parseFloat(document.getElementById('imp-importo').value);
  if(!d || !i) return alert('Servono descrizione e importo.');
  await api.post('/api/impegni', {descrizione: d, importo: i});
  showSave(); tabAnalisi('costi');
}

async function eliminaImpegno(id){
  if(!confirm('Eliminare questa uscita ricorrente?')) return;
  await fetch('/api/impegni/'+id, {method:'DELETE'});
  tabAnalisi('costi');
}

async function ricalcolaKgGrano(btn){
  const o = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i>Lettura fatture...';
  try{
    const r = await api.post('/api/costi/ricalcola-kg', {});
    if(r.error) alert('Errore: ' + r.error);
    else alert(`Fatture esaminate: ${r.esaminati}\nAggiornate con i kg: ${r.aggiornati}\nSenza righe di grano riconosciute: ${r.senza_righe_grano}`);
    tabAnalisi('costi');
  }catch(e){ alert('Errore: '+e.message); }
  finally{ btn.disabled=false; btn.innerHTML=o; }
}
window.ricalcolaKgGrano = ricalcolaKgGrano;

window.apriAnalisiMirko = apriAnalisiMirko;
window.tabAnalisi = tabAnalisi;
window.aggiungiDomanda = aggiungiDomanda;
window.salvaCosto = salvaCosto;
window.aggiungiImpegno = aggiungiImpegno;
window.eliminaImpegno = eliminaImpegno;
