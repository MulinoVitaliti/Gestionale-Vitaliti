// app-steven.js — Steven: Virtual Company, agente, backoffice, AI chat, solleciti
// Generato automaticamente — NON modificare manualmente

// ══════════════════════════════════════════════════════════════════════════
// AGENTE BACK OFFICE — rapporto giornaliero e alert
// ══════════════════════════════════════════════════════════════════════════
async function boCaricaUltimoRapporto(){
  try{
    const dati = await api.get('/api/backoffice/ultimo-rapporto');
    const elTesto = document.getElementById('bo-testo');
    const elData = document.getElementById('bo-generato-il');
    if(!elTesto) return;

    if(dati && dati.testo){
      elTesto.textContent = dati.testo;
      const d = new Date(dati.created_at);
      const oggi = d.toDateString() === new Date().toDateString();
      elData.textContent = (oggi ? 'Generato oggi alle ' + d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})
                                 : 'Ultimo: ' + d.toLocaleString('it-IT'));
    } else {
      elTesto.textContent = 'Nessun rapporto ancora generato. Premi "Rigenera" per crearne uno adesso.';
      elData.textContent = '';
    }
  }catch(e){}
  boCaricaAlert();
  boCaricaListe();
}

async function boCaricaAlert(){
  try{
    const alert = await api.get('/api/backoffice/alert');
    if(alert.error) return;
    const wrap = document.getElementById('bo-alert-wrap');
    const lista = document.getElementById('bo-lista-alert');
    const count = document.getElementById('bo-count-alert');
    if(!wrap) return;

    if(!alert.length){ wrap.style.display='none'; return; }
    wrap.style.display='block';
    count.textContent = alert.length;

    const colore = g => g==='alta' ? 'var(--red)' : g==='media' ? 'var(--orange)' : 'var(--text-3)';
    const icona = t => ({
      pagamento_critico:'ti-alert-octagon', pagamento_ritardo:'ti-clock-exclamation',
      ordine_fermo:'ti-package-off', task_scaduto:'ti-calendar-x', esposizione_alta:'ti-trending-down'
    })[t] || 'ti-bell';

    lista.innerHTML = alert.map(a=>`
      <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-left:3px solid ${colore(a.gravita)};background:var(--surface-2);border-radius:6px;margin-bottom:6px">
        <i class="ti ${icona(a.tipo)}" style="color:${colore(a.gravita)};font-size:15px;margin-top:1px"></i>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${a.titolo}</div>
          ${a.dettaglio?`<div style="font-size:12px;color:var(--text-2)">${a.dettaglio}</div>`:''}
        </div>
        <button class="btn btn-sm" onclick="boSegnaLetto(${a.id})" style="font-size:11px;padding:3px 8px">✓</button>
      </div>`).join('');
  }catch(e){}
}

async function boSegnaLetto(id){
  try{ await api.post(`/api/backoffice/alert/${id}/letto`, {}); boCaricaAlert(); }catch(e){}
}

async function boSegnaTuttiLetti(){
  try{
    const r = await api.post('/api/backoffice/alert/letti-tutti', {});
    mostraToast(`${r.aggiornati} alert archiviati`);
    boCaricaAlert();
  }catch(e){}
}

async function boCaricaListe(){
  try{
    const dati = await api.get('/api/backoffice/riepilogo');
    if(dati.error) return;

    // Esposizione totale
    const elTot = document.getElementById('bo-totale-esposizione');
    if(elTot) elTot.textContent = '€' + Number(dati.totaleDaIncassare||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});

    // Non pagati
    document.getElementById('bo-count-nonpagati').textContent = dati.nonPagati.length;
    const listaNP = document.getElementById('bo-lista-nonpagati');
    listaNP.innerHTML = dati.nonPagati.length
      ? dati.nonPagati.slice(0,6).map(m=>{
          const gg = Number(m.giorni_attesa||0);
          const col = gg>60?'var(--red)':gg>30?'var(--orange)':'var(--text-3)';
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span>${m.descrizione||'Senza descrizione'}</span>
            <span style="white-space:nowrap;margin-left:8px"><strong>€${Number(m.importo).toFixed(2)}</strong> <em style="color:${col};font-style:normal">(${gg}g)</em></span>
          </div>`;
        }).join('')
      : '<div style="font-size:12px;color:var(--green);padding:6px 0">Tutto incassato.</div>';

    // Inattivi
    document.getElementById('bo-count-inattivi').textContent = dati.inattivi.length;
    const listaIn = document.getElementById('bo-lista-inattivi');
    listaIn.innerHTML = dati.inattivi.length
      ? dati.inattivi.slice(0,6).map(c=>{
          const ultimo = c.ultimo_ordine ? new Date(c.ultimo_ordine).toLocaleDateString('it-IT') : 'mai';
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px">
            <span>${c.nome}</span>
            <em style="color:var(--text-3);font-style:normal;white-space:nowrap;margin-left:8px">${ultimo}</em>
          </div>`;
        }).join('')
      : '<div style="font-size:12px;color:var(--green);padding:6px 0">Tutti attivi.</div>';
  }catch(e){}
}

async function boGeneraRapporto(){
  const btn = document.getElementById('bo-genera-btn');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Analizzo...'; }
  document.getElementById('bo-testo').textContent = 'Sto controllando ordini, pagamenti e clienti...';
  try{
    const dati = await api.post('/api/backoffice/genera-rapporto', {});
    if(dati.error){ document.getElementById('bo-testo').textContent = 'Errore: '+dati.error; return; }
    document.getElementById('bo-testo').textContent = dati.testo;
    document.getElementById('bo-generato-il').textContent = 'Generato ora';
    if(dati.alertNuovi > 0) mostraToast(`${dati.alertNuovi} nuovi alert rilevati`, 'error');
    boCaricaAlert();
    boCaricaListe();
  }catch(e){
    document.getElementById('bo-testo').textContent = 'Errore di connessione: '+e.message;
  }finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-refresh"></i>Rigenera'; }
  }
}

// ── SOLLECITI PAGAMENTO ───────────────────────────────────────────────────
let _solleciti = [];

async function boPreparaSolleciti(){
  openModal('modal-solleciti');
  const lista = document.getElementById('sol-lista');
  lista.innerHTML = '<div style="font-size:13px;color:var(--text-2);padding:12px 0"><i class="ti ti-loader"></i> Preparo le bozze...</div>';
  const giorniMin = parseInt(document.getElementById('sol-giorni-min').value) || 30;

  try{
    const r = await api.post('/api/backoffice/solleciti/prepara', { giorniMin });
    if(r.error){ lista.innerHTML = `<div style="color:var(--red);font-size:13px">${r.error}</div>`; return; }

    _solleciti = r.pronti || [];
    const senzaEmail = r.senzaEmail || [];
    document.getElementById('sol-riepilogo').textContent =
      `${_solleciti.length} pronti · ${senzaEmail.length} da controllare`;

    if(!_solleciti.length && !senzaEmail.length){
      lista.innerHTML = '<div style="font-size:13px;color:var(--green);padding:12px 0"><i class="ti ti-circle-check"></i> Nessun insoluto oltre questa soglia.</div>';
      return;
    }

    let html = '';

    _solleciti.forEach((s,i)=>{
      const col = s.giorni>60?'var(--red)':s.giorni>30?'var(--orange)':'var(--text-3)';
      html += `
      <div id="sol-card-${i}" style="border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
          <div>
            <strong style="font-size:14px">${s.clienteNome}</strong>
            <span style="font-size:12px;color:var(--text-3)"> · ${s.email}</span>
          </div>
          <div style="font-size:13px;white-space:nowrap">
            <strong>€${Number(s.importo).toFixed(2)}</strong>
            <em style="color:${col};font-style:normal"> (${s.giorni}g)</em>
          </div>
        </div>
        <input type="text" id="sol-ogg-${i}" value="${s.oggetto.replace(/"/g,'&quot;')}"
          style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;margin-bottom:8px">
        <textarea id="sol-corpo-${i}" style="width:100%;min-height:150px;padding:9px 11px;border:1.5px solid var(--border);border-radius:var(--r);font-size:12.5px;line-height:1.5;font-family:inherit;resize:vertical">${s.corpo}</textarea>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-primary btn-sm" id="sol-btn-${i}" onclick="boInviaSollecito(${i})"><i class="ti ti-send"></i>Invia a ${s.clienteNome}</button>
          <button class="btn btn-sm" onclick="document.getElementById('sol-card-${i}').style.display='none'">Salta</button>
        </div>
      </div>`;
    });

    if(senzaEmail.length){
      html += `<div style="border:1px dashed var(--border);border-radius:var(--r);padding:12px;margin-top:6px">
        <div style="font-size:12px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">Da controllare a mano (${senzaEmail.length})</div>
        ${senzaEmail.map(s=>`<div style="font-size:12px;padding:4px 0;color:var(--text-2)">
          ${s.descrizione||'Senza descrizione'} — €${Number(s.importo).toFixed(2)} (${s.giorni}g) · <em style="font-style:normal;color:var(--orange)">${s.motivo}</em>
        </div>`).join('')}
        <div style="font-size:11px;color:var(--text-3);margin-top:8px">Aggiungi l'email a questi clienti in anagrafica, oppure scrivi il nome del cliente nella descrizione del movimento.</div>
      </div>`;
    }

    lista.innerHTML = html;
  }catch(e){
    lista.innerHTML = `<div style="color:var(--red);font-size:13px">Errore: ${e.message}</div>`;
  }
}

async function boInviaSollecito(i){
  const s = _solleciti[i];
  if(!s) return;
  const btn = document.getElementById(`sol-btn-${i}`);
  const oggetto = document.getElementById(`sol-ogg-${i}`).value.trim();
  const corpo = document.getElementById(`sol-corpo-${i}`).value.trim();
  if(!oggetto || !corpo){ mostraToast('Oggetto e testo non possono essere vuoti', 'error'); return; }

  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Invio...'; }
  try{
    const r = await api.post('/api/backoffice/solleciti/invia', {
      email: s.email, oggetto, corpo, movimentoId: s.movimentoId, clienteNome: s.clienteNome
    });
    if(r.error){ mostraToast('Errore: '+r.error, 'error'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-send"></i>Riprova';} return; }

    mostraToast(`✅ Sollecito inviato a ${s.clienteNome}`);
    const card = document.getElementById(`sol-card-${i}`);
    if(card){
      card.style.opacity = '0.5';
      card.style.borderColor = 'var(--green)';
      if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-check"></i>Inviato'; }
    }
  }catch(e){
    mostraToast('Errore di rete: '+e.message, 'error');
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-send"></i>Riprova'; }
  }
}

// ── RICERCA E SCHEDA CLIENTE (sezione AI) ────────────────────────────────
// ── STATO E CONTROLLO AGENTE ──────────────────────────────────────────────
async function aggiornaStatoAgente(){
  try{
    const r = await api.get('/api/agente/stato');
    if(r.error) return;
    const badge = document.getElementById('agente-stato-badge');
    if(!badge) return;
    const parti = [];
    if(r.alertNonLetti > 0) parti.push(`<span style="color:var(--orange)">⚠️ ${r.alertNonLetti} alert</span>`);
    if(r.clientiARischio > 0) parti.push(`<span style="color:var(--red)">🔴 ${r.clientiARischio} a rischio</span>`);
    if(r.taskAperti > 0) parti.push(`<span style="color:var(--brand)">📋 ${r.taskAperti} task</span>`);
    if(r.agenteLock) parti.push(`<span style="color:var(--text-3)"><i class="ti ti-loader"></i> in esecuzione</span>`);
    badge.innerHTML = parti.join(' · ') || '<span style="color:var(--green)"><i class="ti ti-circle-check"></i> tutto ok</span>';
  }catch(e){}
}

async function eseguiAgenteManuale(){
  const btn = document.getElementById('btn-esegui-agente');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Elaboro...'; }
  try{
    const r = await api.post('/api/agente/esegui', {});
    if(r.error){ mostraToast('Errore: '+r.error, 'error'); return; }
    const ris = r.risultati || {};
    let msg = '✅ Agente completato:\n';
    if(ris.clientiARischio) msg += `• ${ris.clientiARischio} clienti segnati a rischio\n`;
    if(ris.taskCreati) msg += `• ${ris.taskCreati} task di follow-up creati\n`;
    if(ris.alertCreati) msg += `• ${ris.alertCreati} alert generati\n`;
    if(ris.crescitaAnalizzata && ris.datiCrescita) msg += `• Crescita: ${ris.datiCrescita.tendenza} ${ris.datiCrescita.varPct!==null?(ris.datiCrescita.varPct>0?'+':'')+ris.datiCrescita.varPct+'%':'n/d'}\n`;
    if(ris.ficVerificato) msg += `• Contabilità FIC verificata\n`;
    mostraToast(msg.split('\n')[0]);
    aggiornaStatoAgente();
    boCaricaAlert();
    boCaricaListe();
    // Aggiorna task nel gestionale
    try{ const t=await api.get('/api/tasks'); if(!t.error){state.tasks=t; if(typeof renderTasks==='function')renderTasks();} }catch(e){}
  }catch(e){ mostraToast('Errore: '+e.message, 'error'); }
  finally{ if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-robot"></i>Esegui agente'; } }
}

// Aggiorna stato agente ogni 2 minuti
setInterval(aggiornaStatoAgente, 2 * 60 * 1000);

let _agenteAttivo = 'steven';

function selezionaAgente(id){
  _agenteAttivo = id;
  // Aggiorna visual delle card
  document.querySelectorAll('[id^="agente-card-"]').forEach(el => {
    el.style.borderColor = 'var(--border)';
    el.style.background = 'var(--surface)';
  });
  const card = document.getElementById('agente-card-'+id);
  if(card){ card.style.borderColor='var(--brand)'; card.style.background='var(--brand-light)'; }
  // Pulisci chat
  clearChat();
}

function clearChat(){
  const nomi = { steven: 'Steven' };
  const nome = nomi[_agenteAttivo] || 'Steven';
  document.getElementById('chat-messages').innerHTML=`<div class="msg-ai"><div class="msg-avatar ai"><strong style="font-size:13px">${nome[0]}</strong></div><div class="msg-bubble ai">Chat pulita. Dimmi cosa ti serve, Giovanni.</div></div>`;
}

function boToggleBriefing(){
  const card = document.getElementById('backoffice-briefing');
  if(!card) return;
  const visibile = card.style.display !== 'none';
  card.style.display = visibile ? 'none' : 'block';
  if(!visibile) boCaricaUltimoRapporto();
}

function aiFiltraClienti(){
  const q = (document.getElementById('ai-cliente-search').value||'').toLowerCase().trim();
  const box = document.getElementById('ai-cliente-suggestions');
  if(!q){ box.style.display='none'; box.innerHTML=''; return; }
  const match = (state.clienti||[]).filter(c=>c.tipo!=='fornitore' && c.nome.toLowerCase().includes(q)).slice(0,12);
  if(!match.length){ box.innerHTML='<div style="padding:10px 12px;font-size:13px;color:var(--text-3)">Nessun cliente trovato</div>'; box.style.display='block'; return; }
  box.innerHTML = match.map(c=>`
    <div onclick="apriSchedaCliente(${c.id})" style="padding:9px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--border)"
      onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='#fff'">
      <strong>${c.nome}</strong>${c.citta?` <span style="color:var(--text-3)">— ${c.citta}</span>`:''}
    </div>`).join('');
  box.style.display='block';
}

document.addEventListener('click', function(e){
  const box = document.getElementById('ai-cliente-suggestions');
  const inp = document.getElementById('ai-cliente-search');
  if(box && inp && !box.contains(e.target) && e.target!==inp) box.style.display='none';
});

async function apriSchedaCliente(id){
  const box = document.getElementById('ai-cliente-suggestions');
  if(box) box.style.display='none';
  openModal('modal-scheda-cliente');
  const body = document.getElementById('sc-body');
  body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-2)"><i class="ti ti-loader"></i> Carico la scheda...</div>';

  try{
    const d = await api.get(`/api/clienti/${id}/scheda`);
    if(d.error){ body.innerHTML = `<div style="color:var(--red);padding:16px">${d.error}</div>`; return; }

    document.getElementById('sc-nome').textContent = d.cliente.nome;

    const coloreSalute = {buono:'var(--green)', attenzione:'var(--orange)', critico:'var(--red)'}[d.salute];
    const labelSalute = {buono:'Relazione sana', attenzione:'Da tenere d\'occhio', critico:'Situazione critica'}[d.salute];
    const iconaSalute = {buono:'ti-circle-check', attenzione:'ti-alert-triangle', critico:'ti-alert-octagon'}[d.salute];

    const fmtEuro = n => '€' + Number(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
    const fmtData = s => s ? new Date(s).toLocaleDateString('it-IT') : '—';

    body.innerHTML = `
      <!-- Stato relazione -->
      <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--surface-2);border-left:3px solid ${coloreSalute};border-radius:var(--r);margin-bottom:16px">
        <i class="ti ${iconaSalute}" style="color:${coloreSalute};font-size:20px"></i>
        <div>
          <div style="font-size:14px;font-weight:700;color:${coloreSalute}">${labelSalute}</div>
          ${d.motivoSalute?`<div style="font-size:12px;color:var(--text-2)">${d.motivoSalute}</div>`:''}
        </div>
      </div>

      <!-- Metriche -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
        <div style="text-align:center;padding:10px;background:var(--surface-2);border-radius:var(--r)">
          <div style="font-size:18px;font-weight:800">${d.numOrdini}</div>
          <div style="font-size:11px;color:var(--text-3)">Ordini</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--surface-2);border-radius:var(--r)">
          <div style="font-size:18px;font-weight:800">${fmtEuro(d.fatturatoTotale)}</div>
          <div style="font-size:11px;color:var(--text-3)">Fatturato</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--surface-2);border-radius:var(--r)">
          <div style="font-size:18px;font-weight:800;color:${d.giorniInattivo>60?'var(--red)':'var(--text)'}">${d.giorniInattivo!==null?d.giorniInattivo+'g':'—'}</div>
          <div style="font-size:11px;color:var(--text-3)">Da ultimo ordine</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--surface-2);border-radius:var(--r)">
          <div style="font-size:18px;font-weight:800;color:${d.totaleInsoluto>0?'var(--orange)':'var(--green)'}">${fmtEuro(d.totaleInsoluto)}</div>
          <div style="font-size:11px;color:var(--text-3)">Da incassare</div>
        </div>
      </div>

      <!-- Contatti -->
      <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Contatti</div>
      <div style="font-size:13px;line-height:1.7;margin-bottom:18px;padding:10px 12px;background:var(--surface-2);border-radius:var(--r)">
        ${d.cliente.tel?`<div><i class="ti ti-phone" style="font-size:13px;color:var(--text-3)"></i> ${d.cliente.tel}</div>`:''}
        ${d.cliente.email?`<div><i class="ti ti-mail" style="font-size:13px;color:var(--text-3)"></i> ${d.cliente.email}</div>`:''}
        ${d.cliente.ind_consegna||d.cliente.ind_legale?`<div><i class="ti ti-map-pin" style="font-size:13px;color:var(--text-3)"></i> ${d.cliente.ind_consegna||d.cliente.ind_legale}${d.cliente.citta?', '+d.cliente.citta:''}</div>`:''}
        ${d.cliente.piva?`<div><i class="ti ti-id" style="font-size:13px;color:var(--text-3)"></i> P.IVA ${d.cliente.piva}</div>`:''}
        ${!d.cliente.tel&&!d.cliente.email?'<div style="color:var(--orange)">⚠️ Nessun contatto in anagrafica</div>':''}
      </div>

      ${d.insoluti.length?`
      <div style="font-size:11px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Insoluti (${d.insoluti.length})</div>
      <div style="margin-bottom:18px">
        ${d.insoluti.map(m=>{
          const gg=Number(m.giorni_attesa||0);
          const col=gg>60?'var(--red)':gg>30?'var(--orange)':'var(--text-3)';
          return `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px">
            <span>${m.descrizione||'Senza descrizione'} <em style="color:var(--text-3);font-style:normal">${fmtData(m.data)}</em></span>
            <span style="white-space:nowrap;margin-left:10px"><strong>${fmtEuro(m.importo)}</strong> <em style="color:${col};font-style:normal">(${gg}g)</em></span>
          </div>`;
        }).join('')}
      </div>`:''}

      <!-- Storico ordini -->
      <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">
        Ultimi ordini${d.frequenzaMedia?` · ordina in media ogni ${d.frequenzaMedia} giorni`:''}
      </div>
      <div style="max-height:200px;overflow-y:auto;margin-bottom:16px">
        ${d.ordini.length?d.ordini.slice(0,12).map(o=>`
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px">
            <span>${fmtData(o.data)} · ${o.prodotto||'—'}</span>
            <span style="white-space:nowrap;margin-left:10px">${o.importo?fmtEuro(o.importo):''} <em style="color:var(--text-3);font-style:normal">${o.stato}</em></span>
          </div>`).join(''):'<div style="font-size:12.5px;color:var(--text-3);padding:6px 0">Nessun ordine registrato.</div>'}
      </div>

      <!-- Azioni -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:14px">
        <button class="btn btn-primary btn-sm" onclick="closeModal('modal-scheda-cliente');sendAIMessage('Analizza il cliente ${d.cliente.nome.replace(/'/g,"\\'")}: come sta andando la relazione, cosa rischio e cosa dovrei fare adesso. Sii concreto.')">
          <i class="ti ti-robot"></i>Chiedi all'AI
        </button>
        ${d.cliente.email?`<button class="btn btn-sm" onclick="closeModal('modal-scheda-cliente');sendAIMessage('Scrivi un''email a ${d.cliente.nome.replace(/'/g,"\\'")} (${d.cliente.email}) per riallacciare i rapporti commerciali.')"><i class="ti ti-mail"></i>Prepara email</button>`:''}
        ${d.cliente.tel?`<a class="btn btn-sm" href="tel:${d.cliente.tel}"><i class="ti ti-phone"></i>Chiama</a>`:''}
      </div>`;
  }catch(e){
    body.innerHTML = `<div style="color:var(--red);padding:16px">Errore: ${e.message}</div>`;
  }
}

let _aiEmailBozza = null;

async function aiInviaEmailBozza(){
  const to = document.getElementById('ai-mail-to').value.trim();
  const ogg = document.getElementById('ai-mail-ogg').value.trim();
  const corpo = document.getElementById('ai-mail-corpo').value.trim();
  const btn = document.getElementById('ai-mail-btn');
  if(!to || !ogg || !corpo){ mostraToast('Compila destinatario, oggetto e testo', 'error'); return; }
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Invio...'; }
  try{
    const r = await api.post('/api/gmail/send', { to, subject: ogg, body: corpo });
    if(r.error){ mostraToast('Errore: '+r.error, 'error'); if(btn){btn.disabled=false;btn.innerHTML='<i class="ti ti-send"></i>Riprova';} return; }
    mostraToast(`✅ Email inviata a ${to}`);
    if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-check"></i>Inviata'; }
  }catch(e){
    mostraToast('Errore di rete: '+e.message, 'error');
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-send"></i>Riprova'; }
  }
}

function mostraToast(msg, tipo='success'){
  let toast = document.getElementById('vv-toast');
  if(!toast){
    toast = document.createElement('div');
    toast.id='vv-toast';
    toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--text);color:#fff;padding:10px 20px;border-radius:99px;font-size:13px;font-weight:600;z-index:9999;opacity:0;transition:all .25s ease;pointer-events:none;white-space:nowrap';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = tipo==='error'?'var(--red)':tipo==='warning'?'var(--orange)':'#1a1a2e';
  toast.style.opacity='1';
  toast.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=>{
    toast.style.opacity='0';
    toast.style.transform='translateX(-50%) translateY(20px)';
  }, 2800);
}



async function completaAttivitaDettaglio(attId){
  await api.put('/api/attivita/'+attId,{completata:true});
  if(state.attivita){const a=state.attivita.find(x=>x.id===attId);if(a)a.completata=true;}
  aggiornaAttBadge();
  if(_currentLeadDetailId) renderLeadDetailFeed(_currentLeadDetailId);
  showSave();
}

async function eliminaAttivitaDettaglio(attId){
  conferma(async()=>{
    await api.del('/api/attivita/'+attId);
    state.attivita=(state.attivita||[]).filter(a=>a.id!==attId);
    aggiornaAttBadge();
    if(_currentLeadDetailId) renderLeadDetailFeed(_currentLeadDetailId);
    showSave();
  });
}

async function salvaNotaLead(){
  if(!_currentLeadDetailId) return;
  const inp = document.getElementById('lead-nota-rapida');
  const testo = inp?.value.trim();
  if(!testo) return;

  const l = state.leads.find(x=>x.id===_currentLeadDetailId);
  const body = {
    tipo:'nota',
    titolo:'Nota — '+(l?.nome||''),
    note: testo,
    lead_id: _currentLeadDetailId,
    pipeline_id: currentPipelineId||'default',
    collegata_tipo:'lead', collegata_id:_currentLeadDetailId, collegata_nome:l?.nome||'',
    completata: true, // va direttamente in cronologia
    data_scadenza: new Date().toISOString().slice(0,10),
    ora: new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})
  };

  const r = await api.post('/api/attivita', body);
  if(r.error){ alert('Errore: '+r.error); return; }
  state.attivita = state.attivita||[];
  state.attivita.unshift({...r, lead_nome:l?.nome});
  inp.value = '';
  renderLeadDetailFeed(_currentLeadDetailId);
  aggiornaAttBadge();
  showSave();
}

function apriAttivitaInLeadDetail(tipo){
  if(!_currentLeadDetailId) return;
  const l=state.leads.find(x=>x.id===_currentLeadDetailId); if(!l) return;
  if(tipo==='email'){
    const emailTo = l.email||'';
    apriComposer({ to: emailTo, subject: '', title: 'Email a '+l.nome });
    window._emailLeadPendingId = _currentLeadDetailId;
    window._emailLeadPendingNome = l.nome;
    return;
  }
  if(tipo==='ordine'){
    // Apre il vero modal ordine precompilato con il cliente del lead
    apriNuovoOrdinePerLead(l);
    return;
  }
  apriAttivitaInLead(_currentLeadDetailId, l.nome, tipo);
}

function chiudiDettaglio(){
  document.getElementById('detail-overlay')?.classList.remove('open');
  document.getElementById('detail-panel')?.classList.remove('open');
}


// Apre il modal attività precompilando tipo e lead
function apriAttivitaInLead(leadId, leadNome, tipo){
  const stato = (state.leadPipelineStato||[]).find(s=>s.lead_id===leadId);
  const pipelineId = stato?.pipeline_id || currentPipelineId || 'default';
  document.getElementById('att-id').value='';
  document.getElementById('att-titolo').value='';
  document.getElementById('att-note').value='';
  document.getElementById('att-ora').value='';
  document.getElementById('att-data').value=new Date().toISOString().slice(0,10);
  document.getElementById('modal-att-title').textContent='Nuova '+tipo+' — '+leadNome;
  setTipoAtt(tipo);
  popolaPipelineModal();
  const pipSel = document.getElementById('att-pipeline');
  if(pipSel) pipSel.value = pipelineId;
  onAttPipelineChange();
  setTimeout(()=>{ const leadSel=document.getElementById('att-lead'); if(leadSel) leadSel.value=leadId; },60);
  const placeholders={chiamata:'Chiamata con '+leadNome,email:'Email a '+leadNome,ordine:'Ordine per '+leadNome,nota:'Nota su '+leadNome};
  document.getElementById('att-titolo').placeholder=placeholders[tipo]||'';
  openModal('modal-attivita');
}

// Apre modal attività veloce dalla pipeline (senza lead preselezionato)
function apriModalAttivitaVeloce(){ openModalAttivita(); }

async function eliminaLead(id){
  conferma(async()=>{
    try{
      await api.del('/api/leads/'+id);
      state.leads = state.leads.filter(l=>l.id!==id);
      state.leadPipelineStato = (state.leadPipelineStato||[]).filter(s=>s.lead_id!==id);
      _currentLeadDetailId = null;
      chiudiDettaglio();
      showPage('pipeline');
      renderPipeline();
      renderDash();
      showSave();
    }catch(e){ alert('Errore di rete: '+e.message); }
  });
}

// ── ORDINI ────────────────────────────────────────────────────────────────
function renderOrdini(){
  const list=(state.ordini||[]).filter(o=>state.ordiniFilter==='tutti'||o.stato===state.ordiniFilter);
  const tb=document.getElementById('tbl-ordini'); if(!tb)return; tb.innerHTML='';
  if(!list.length){tb.innerHTML='<tr><td colspan="11"><div class="empty-state">Nessun ordine</div></td></tr>';return;}

  const statoCfg = {
    bozza:{label:'Bozza',color:'var(--text-3)',bg:'var(--surface-2)'},
    confermato:{label:'Confermato',color:'var(--blue)',bg:'#eff6ff'},
    spedito:{label:'Spedito',color:'var(--orange)',bg:'#fff7ed'},
    consegnato:{label:'Consegnato',color:'var(--green)',bg:'#f0fdf4'},
    aperto:{label:'Aperto',color:'var(--blue)',bg:'#eff6ff'},
  };
  const canaleCfg = {telefono:'📞',email:'✉️',whatsapp:'💬',abbonamento:'📋'};

  list.forEach(o=>{
    const tr=document.createElement('tr');
    const dataFmt = o.data ? new Date(o.data).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'2-digit'}) : '—';
    const cfg = statoCfg[o.stato]||statoCfg.bozza;
    const canale = canaleCfg[o.canale]||'📞';

    // Prodotti
    let prodottiStr = '';
    try {
      const prods = typeof o.prodotti==='string' ? JSON.parse(o.prodotti||'[]') : (o.prodotti||[]);
      if(prods.length) prodottiStr = prods.map(p=>`${p.nome||p.prodotto} ×${p.bancali||p.qty}`).join(', ');
    } catch(e) {}
    if(!prodottiStr) prodottiStr = o.prodotto||'—';

    const noteIcons = [o.facchinaggio?'🏗':'', o.chiamata_tel?'📞':''].filter(Boolean).join(' ');
    const ddtBadge = o.fic_ddt_numero ? `<span style="font-size:10px;background:#eff6ff;color:var(--blue);padding:1px 6px;border-radius:99px;font-weight:700">DDT ${o.fic_ddt_numero}</span>` : '<span style="font-size:10px;color:var(--text-3)">—</span>';

    tr.innerHTML=`
      <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-3)">#${String(o.id).padStart(3,'0')}</td>
      <td style="font-weight:600">${o.cliente}</td>
      <td style="font-size:12px;color:var(--text-2);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${prodottiStr}</td>
      <td style="font-size:12px">${o.qty||'—'}</td>
      <td style="font-size:12px">${o.peso_totale ? o.peso_totale+' kg' : '—'}</td>
      <td style="font-weight:600">${o.importo ? fmt(o.importo) : '—'}</td>
      <td style="font-size:12px;color:var(--text-3)">${dataFmt}</td>
      <td style="font-size:16px">${canale} ${noteIcons}</td>
      <td><span style="font-size:11px;font-weight:700;color:${cfg.color};background:${cfg.bg};padding:2px 8px;border-radius:99px">${cfg.label}</span></td>
      <td>${ddtBadge}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="editOrdine(${o.id})" title="Modifica"><i class="ti ti-pencil"></i></button>
        <button class="btn btn-sm btn-danger" onclick="eliminaOrdine(${o.id})" title="Elimina"><i class="ti ti-trash"></i></button>
      </td>`;
    tb.appendChild(tr);
  });
}

async function eliminaOrdine(id){ conferma(async()=>{ await api.del('/api/ordini/'+id); state.ordini=state.ordini.filter(o=>o.id!==id); renderOrdini(); renderDash(); showSave(); }); }

function filterOrdini(f,el){
  state.ordiniFilter=f;
  document.querySelectorAll('#page-ordini .pills .pill').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderOrdini();
}

// ── RIGHE PRODOTTO ORDINE ─────────────────────────────────────────────────
const PRODOTTI_MULINO = [
  {nome:'Semola rimacinata di grano duro', kg_sacco:30, sacchi_bancale:42},
  {nome:'Semola Senatore Cappelli',         kg_sacco:25, sacchi_bancale:42},
  {nome:'Farina di Grano Canadese',         kg_sacco:25, sacchi_bancale:42},
  {nome:'Farina integrale',                 kg_sacco:30, sacchi_bancale:42},
  {nome:'Altro',                            kg_sacco:25, sacchi_bancale:0},
];

let _ordineRighe = [];
let _ordineRigheEdit = [];

function aggiungiRigaOrdine(mode='new'){
  const righe = mode==='edit' ? _ordineRigheEdit : _ordineRighe;
  righe.push({ nome: PRODOTTI_MULINO[0].nome, sacchi: 1, kgSacco: 30, prezzoKg: 0 });
  renderRigheOrdine(mode);
}

function renderRigheOrdine(mode='new'){
  const righe = mode==='edit' ? _ordineRigheEdit : _ordineRighe;
  const cont = document.getElementById(mode==='edit'?'edit-ord-righe':'ord-righe');
  if(!cont) return;

  cont.innerHTML = righe.map((r,i)=>{
    const prodInfo = PRODOTTI_MULINO.find(p=>p.nome===r.nome)||PRODOTTI_MULINO[0];
    const kgSacco = r.kgSacco !== undefined ? r.kgSacco : prodInfo.kg_sacco;
    const kgTot = (r.sacchi||0) * (kgSacco||0);
    const totRiga = kgTot * (r.prezzoKg||0);
    return `
    <div style="background:var(--surface-2);border:1.5px solid var(--border);border-radius:var(--r);padding:10px 12px;position:relative">
      <button onclick="rimuoviRiga(${i},'${mode}')" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;color:var(--text-3);font-size:18px;line-height:1;padding:0" title="Rimuovi">×</button>
      <!-- Riga 1: prodotto -->
      <div class="form-group" style="margin-bottom:8px">
        <label style="font-size:10px;text-transform:uppercase;color:var(--text-3);letter-spacing:0.4px">Prodotto</label>
        <select onchange="onRigaProdottoChange(${i},'${mode}')" style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-family:var(--font);background:#fff">
          ${PRODOTTI_MULINO.map(p=>`<option value="${p.nome}" ${p.nome===r.nome?'selected':''}>${p.nome}</option>`).join('')}
        </select>
      </div>
      <!-- Riga 2: sacchi / kg sacco / kg tot / €/kg / totale -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:8px;align-items:end">
        <div>
          <label style="font-size:10px;text-transform:uppercase;color:var(--text-3);letter-spacing:0.4px;display:block;margin-bottom:3px">N° sacchi</label>
          <input type="number" value="${r.sacchi||1}" min="1" step="1"
            onchange="aggiornaRiga(${i},'sacchi',this.value,'${mode}')"
            style="width:100%;padding:7px 8px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;text-align:center;background:#fff">
        </div>
        <div>
          <label style="font-size:10px;text-transform:uppercase;color:var(--text-3);letter-spacing:0.4px;display:block;margin-bottom:3px">kg/sacco</label>
          <input type="number" value="${kgSacco}" min="1" step="0.5"
            onchange="aggiornaRiga(${i},'kgSacco',this.value,'${mode}')"
            style="width:100%;padding:7px 8px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;text-align:center;background:#fff">
        </div>
        <div>
          <label style="font-size:10px;text-transform:uppercase;color:var(--text-3);letter-spacing:0.4px;display:block;margin-bottom:3px">kg totali</label>
          <div style="padding:7px 8px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;font-weight:700;text-align:center;background:var(--surface-2);color:var(--text-2)">${kgTot}</div>
        </div>
        <div>
          <label style="font-size:10px;text-transform:uppercase;color:var(--text-3);letter-spacing:0.4px;display:block;margin-bottom:3px">€ / kg</label>
          <input type="number" value="${r.prezzoKg||''}" min="0" step="0.001" placeholder="0.000"
            onchange="aggiornaRiga(${i},'prezzoKg',this.value,'${mode}')"
            style="width:100%;padding:7px 8px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;text-align:right;background:#fff">
        </div>
        <div>
          <label style="font-size:10px;text-transform:uppercase;color:var(--text-3);letter-spacing:0.4px;display:block;margin-bottom:3px">Totale</label>
          <div style="padding:7px 8px;border:1.5px solid ${totRiga>0?'var(--brand)':'var(--border)'};border-radius:var(--r);font-size:13px;font-weight:700;text-align:right;background:${totRiga>0?'var(--brand-light)':'var(--surface-2)'};color:${totRiga>0?'var(--brand)':'var(--text-3)'}">
            ${totRiga>0?'€'+totRiga.toFixed(2):'—'}
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  aggiornaRiepilogoOrdine(mode);
}

function aggiornaRiepilogoOrdine(mode){
  const righe = mode==='edit' ? _ordineRigheEdit : _ordineRighe;
  const riepiEl = document.getElementById(mode==='edit'?'edit-ord-totale-riepilogo':'ord-totale-riepilogo');
  let sacchiTot=0, kgTot=0, importoTot=0;
  righe.forEach(r=>{
    const kgSacco = r.kgSacco !== undefined ? r.kgSacco : (PRODOTTI_MULINO.find(p=>p.nome===r.nome)||PRODOTTI_MULINO[0]).kg_sacco;
    const kg = (r.sacchi||0)*kgSacco;
    sacchiTot += (r.sacchi||0);
    kgTot += kg;
    importoTot += kg*(r.prezzoKg||0);
  });
  if(riepiEl) riepiEl.innerHTML = `<span style="color:var(--text-3)">Totale:</span> <strong>${sacchiTot} sacchi · ${kgTot} kg</strong>${importoTot>0?' · <strong style="color:var(--brand)">€'+importoTot.toFixed(2)+'</strong>':''}`;
  // Auto-compila peso trasporto se il campo esiste (solo in edit, dove resta editabile)
  const pesoEl = document.getElementById(mode==='edit'?'edit-ord-peso-trasporto':'ord-peso-trasporto');
  if(pesoEl && !pesoEl.dataset.manuale) pesoEl.value = kgTot || '';
}

function onRigaProdottoChange(i, mode){
  const righe = mode==='edit'?_ordineRigheEdit:_ordineRighe;
  const cont = document.getElementById(mode==='edit'?'edit-ord-righe':'ord-righe');
  const sel = cont?.querySelectorAll('select')[i];
  if(sel){
    righe[i].nome = sel.value;
    const prod = PRODOTTI_MULINO.find(p=>p.nome===sel.value);
    if(prod) righe[i].kgSacco = prod.kg_sacco;
  }
  renderRigheOrdine(mode);
}

function aggiornaRiga(i, campo, val, mode){
  const righe = mode==='edit'?_ordineRigheEdit:_ordineRighe;
  righe[i][campo] = parseFloat(val)||0;
  aggiornaRiepilogoOrdine(mode);
}

function rimuoviRiga(i, mode){
  const righe = mode==='edit'?_ordineRigheEdit:_ordineRighe;
  righe.splice(i,1);
  renderRigheOrdine(mode);
}

function apriNuovoOrdinePerLead(lead){
  apriNuovoOrdine();

  // Cerca per nome azienda (contatto) prima, poi per nome lead
  const termini = [lead.azienda, lead.contatto, lead.nome].filter(Boolean);
  if(!termini.length) return;

  const clienteTrovato = (state.clienti||[]).find(c => {
    if(c.tipo === 'fornitore') return false;
    return termini.some(t =>
      c.nome.toLowerCase().includes(t.toLowerCase()) ||
      t.toLowerCase().includes(c.nome.toLowerCase())
    );
  });

  setTimeout(()=>{
    const searchInput = document.getElementById('ord-cliente-search');
    const hiddenInput = document.getElementById('ord-cliente');
    if(!searchInput) return;

    if(clienteTrovato){
      searchInput.value = clienteTrovato.nome;
      hiddenInput.value = clienteTrovato.id;
      onOrdClienteChange();
    } else {
      // Pre-scrivi il termine più probabile per facilitare la ricerca
      searchInput.value = lead.azienda || lead.nome || '';
      filtraClientiOrdine();
    }
  }, 100);

  window._ordineFromLeadId = lead.id || null;
  window._ordineFromLeadNome = lead.nome || lead.azienda || '';
}

function apriNuovoOrdine(){
  _ordineRighe = [{nome:'Semola rimacinata di grano duro', sacchi:1, kgSacco:30, prezzoKg:0}];
  try{ document.getElementById('ord-cliente-search').value = ''; }catch(e){}
  try{ document.getElementById('ord-cliente').value = ''; }catch(e){}
  try{ document.getElementById('ord-cliente-suggestions').style.display = 'none'; }catch(e){}
  try{ document.getElementById('ord-data').value = new Date().toISOString().slice(0,10); }catch(e){}
  try{ document.getElementById('ord-facchinaggio').checked = false; }catch(e){}
  try{ document.getElementById('ord-chiamata-tel').value = ''; }catch(e){}
  try{ document.getElementById('ord-note').value = ''; }catch(e){}
  try{ document.getElementById('ord-canale').value = 'telefono'; }catch(e){}
  try{ document.getElementById('ord-note-cliente-box').style.display = 'none'; }catch(e){}
  try{ document.getElementById('ord-lotto').value = ''; }catch(e){}
  try{ document.getElementById('ord-scadenza').value = ''; }catch(e){}
  try{ document.getElementById('ord-causale').value = 'Vendita'; }catch(e){}
  try{ document.getElementById('ord-trasportatore').value = ''; }catch(e){}
  renderRigheOrdine('new');
  openModal('modal-ordine');
}

function filtraClientiOrdine(){
  const q = (document.getElementById('ord-cliente-search').value||'').toLowerCase().trim();
  const box = document.getElementById('ord-cliente-suggestions');
  if(!q){ box.style.display='none'; box.innerHTML=''; return; }
  const matches = (state.clienti||[]).filter(c=>c.tipo!=='fornitore' && c.nome.toLowerCase().includes(q)).slice(0,15);
  if(matches.length===0){
    box.innerHTML = '<div style="padding:10px 12px;font-size:13px;color:var(--text-3)">Nessun cliente trovato</div>';
    box.style.display='block';
    return;
  }
  box.innerHTML = matches.map(c=>`
    <div onclick="selezionaClienteOrdine(${c.id})" style="padding:9px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--border)" onmouseover="this.style.background='var(--brand-light)'" onmouseout="this.style.background='#fff'">
      <strong>${c.nome}</strong>${c.citta?' <span style="color:var(--text-3)">— '+c.citta+'</span>':''}
    </div>`).join('');
  box.style.display='block';
}

function selezionaClienteOrdine(clienteId){
  const c = (state.clienti||[]).find(x=>x.id===clienteId);
  if(!c) return;
  document.getElementById('ord-cliente').value = clienteId;
  document.getElementById('ord-cliente-search').value = c.nome;
  document.getElementById('ord-cliente-suggestions').style.display = 'none';
  onOrdClienteChange();
}

document.addEventListener('click', function(e){
  const box = document.getElementById('ord-cliente-suggestions');
  const input = document.getElementById('ord-cliente-search');
  if(box && input && !box.contains(e.target) && e.target!==input){ box.style.display='none'; }
});

function onOrdClienteChange(){
  const clienteId = parseInt(document.getElementById('ord-cliente').value)||0;
  const c = (state.clienti||[]).find(x=>x.id===clienteId);
  const box = document.getElementById('ord-note-cliente-box');
  const testo = document.getElementById('ord-note-cliente-testo');
  if(c){
    // Auto-compila note spedizione del cliente
    if(c.facchinaggio) document.getElementById('ord-facchinaggio').checked = true;
    if(c.chiamata_tel) document.getElementById('ord-chiamata-tel').value = c.chiamata_tel;
    // Mostra note spedizione
    let noteArr = [];
    if(c.facchinaggio) noteArr.push('🏗 Facchinaggio richiesto');
    if(c.chiamata_tel) noteArr.push(`📞 Chiamare prima: ${c.chiamata_tel}`);
    if(c.note_spedizione) noteArr.push(c.note_spedizione);
    if(noteArr.length){ testo.innerHTML = noteArr.join('<br>'); box.style.display='block'; }
    else box.style.display='none';
  } else {
    box.style.display='none';
  }
}

async function salvaOrdine(){
  const clienteId = parseInt(document.getElementById('ord-cliente').value)||null;
  if(!clienteId) return alert('Seleziona un cliente dalla ricerca');
  const clienteNome = document.getElementById('ord-cliente-search').value.trim();

  const prodotti = _ordineRighe.map(r=>{
    const kgTot = (r.sacchi||0) * (r.kgSacco||0);
    return {
      nome: r.nome,
      sacchi: r.sacchi||0,
      kgSacco: r.kgSacco||0,
      kgTotale: kgTot,
      prezzoKg: r.prezzoKg||0,
      totale: kgTot * (r.prezzoKg||0)
    };
  });
  const importoTot = prodotti.reduce((s,p)=>s+p.totale,0);
  const sacchiTot = prodotti.reduce((s,p)=>s+p.sacchi,0);
  const pesoTot = prodotti.reduce((s,p)=>s+p.kgTotale,0);

  const btn = document.getElementById('btn-salva-ordine');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Salvataggio...'; }

  const body = {
    cliente: clienteNome,
    cliente_id: clienteId,
    prodotti,
    prodotto: prodotti.map(p=>p.nome).join(', '),
    qty: sacchiTot,
    peso_totale: pesoTot,
    importo: importoTot,
    data: document.getElementById('ord-data').value,
    stato: 'bozza',
    canale: document.getElementById('ord-canale').value,
    facchinaggio: document.getElementById('ord-facchinaggio').checked,
    chiamata_tel: document.getElementById('ord-chiamata-tel').value.trim(),
    note: document.getElementById('ord-note').value,
    peso_trasporto: pesoTot,
    lotto: document.getElementById('ord-lotto')?.value.trim()||'',
    scadenza_merce: document.getElementById('ord-scadenza')?.value.trim()||'',
    causale_trasporto: document.getElementById('ord-causale')?.value||'Vendita',
    trasporto_tipo: document.getElementById('ord-trasportatore')?.value.trim()||'',
  };

  const data = await api.post('/api/ordini', body);
  if(!data.error){
    state.ordini.unshift(data);
    if(data.fic_ddt_numero) mostraToast(`✅ Ordine salvato · DDT ${data.fic_ddt_numero} creato su FIC`);
    else mostraToast('✅ Ordine salvato');

    // Se l'ordine è stato creato dalla pipeline, registra un'attività nel lead
    if(window._ordineFromLeadId){
      try{
        const attData = {
          tipo: 'ordine',
          titolo: `Ordine: ${body.prodotto || prodotti.map(p=>p.nome).join(', ')} — ${body.qty} sacchi`,
          note: `Ordine creato dal gestionale. ${body.lotto ? 'Lotto: '+body.lotto : ''}`.trim(),
          data: body.data || new Date().toISOString().slice(0,10),
          lead_id: window._ordineFromLeadId,
          collegata_id: window._ordineFromLeadId,
          completata: true,
        };
        const att = await api.post('/api/attivita', attData);
        if(!att.error){
          state.attivita = state.attivita || [];
          state.attivita.unshift(att);
          mostraToast(`📋 Attività registrata nel lead ${window._ordineFromLeadNome}`);
        }
      }catch(e){ console.error('Errore attività lead:', e); }
      window._ordineFromLeadId = null;
      window._ordineFromLeadNome = null;
    }
  } else {
    mostraToast('Errore: '+data.error, 'error');
  }

  if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-check"></i>Salva e crea DDT'; }
  closeModal('modal-ordine');
  renderOrdini(); renderDash(); showSave();
}

function editOrdine(id){
  const o=state.ordini.find(x=>x.id===id); if(!o)return;
  document.getElementById('edit-ord-id').value=o.id;

  // Popola clienti
  const sel=document.getElementById('edit-ord-cliente');
  sel.innerHTML = (state.clienti||[]).filter(c=>c.tipo!=='fornitore').map(c=>`<option value="${c.id}" ${c.nome===o.cliente?'selected':''}>${c.nome}</option>`).join('');

  document.getElementById('edit-ord-data').value=(o.data||'').slice(0,10);
  document.getElementById('edit-ord-data-consegna').value=(o.data_consegna||'').slice(0,10);
  document.getElementById('edit-ord-stato').value=o.stato||'bozza';
  document.getElementById('edit-ord-canale').value=o.canale||'telefono';
  document.getElementById('edit-ord-facchinaggio').checked=!!o.facchinaggio;
  document.getElementById('edit-ord-chiamata-tel').value=o.chiamata_tel||'';
  document.getElementById('edit-ord-note').value=o.note||'';

  // Righe prodotti
  try{
    const prods = typeof o.prodotti==='string' ? JSON.parse(o.prodotti||'[]') : (o.prodotti||[]);
    _ordineRigheEdit = prods.length ? prods.map(p=>({nome:p.nome||p.prodotto||'Semola rimacinata di grano duro',bancali:p.bancali||p.qty||1,prezzoUnitario:p.prezzoUnitario||0})) : [{nome:'Semola rimacinata di grano duro',bancali:o.qty||1,prezzoUnitario:0}];
  }catch(e){ _ordineRigheEdit=[{nome:'Semola rimacinata di grano duro',bancali:1,prezzoUnitario:0}]; }
  renderRigheOrdine('edit');
  openModal('modal-edit-ordine');
}

async function aggiornaOrdine(){
  const id=parseInt(document.getElementById('edit-ord-id').value);
  const sel=document.getElementById('edit-ord-cliente');
  const clienteId=parseInt(sel.value)||null;
  const clienteNome=sel.options[sel.selectedIndex]?.text||'';
  const prodotti=_ordineRigheEdit.map(r=>({nome:r.nome,bancali:r.bancali,prezzoUnitario:r.prezzoUnitario,totale:r.bancali*r.prezzoUnitario}));
  const importoTot=prodotti.reduce((s,p)=>s+p.totale,0);
  const bancaliTot=prodotti.reduce((s,p)=>s+p.bancali,0);
  const pesoTot=prodotti.reduce((s,p)=>{const prod=PRODOTTI_MULINO.find(x=>x.nome===p.nome);return s+(p.bancali*(prod?.kg_bancale||0));},0);
  const body={
    cliente:clienteNome, cliente_id:clienteId, prodotti,
    prodotto:prodotti.map(p=>p.nome).join(', '),
    qty:bancaliTot, peso_totale:pesoTot, importo:importoTot,
    data:document.getElementById('edit-ord-data').value,
    data_consegna:document.getElementById('edit-ord-data-consegna').value||null,
    stato:document.getElementById('edit-ord-stato').value,
    canale:document.getElementById('edit-ord-canale').value,
    facchinaggio:document.getElementById('edit-ord-facchinaggio').checked,
    chiamata_tel:document.getElementById('edit-ord-chiamata-tel').value.trim(),
    note:document.getElementById('edit-ord-note').value,
  };
  await api.put('/api/ordini/'+id, body);
  const o=state.ordini.find(x=>x.id===id); if(o)Object.assign(o,body);
  closeModal('modal-edit-ordine'); renderOrdini(); renderDash(); showSave();
}

function onOrdClienteChange(){ } // legacy compat


function renderContab(){
  if(!document.getElementById('c-entrate')) return; // non siamo nella pagina contabilità
  const parseData = m => new Date(m.data||0).getTime();
  // In modalità clean nascondi i movimenti Black
  const tuttiMov = finanzaModoClean
    ? state.movimenti.filter(m=>m.fatturazione!=='da_fatturare')
    : state.movimenti;
  const sorted=[...tuttiMov].sort((a,b)=>parseData(a)-parseData(b));
  const movs=(state.contabFilter==='tutti'?[...tuttiMov]:[...tuttiMov].filter(m=>m.tipo===state.contabFilter)).sort((a,b)=>parseData(b)-parseData(a));
  let run=0; const saldoMap={};
  sorted.forEach(m=>{
    const imp=parseFloat(m.importo)||0;
    run+=m.tipo==='entrata'?imp:-imp;
    saldoMap[m.id]=run;
  });
  const totE=tuttiMov.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const totU=tuttiMov.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const elEntrate=document.getElementById('c-entrate'); if(elEntrate) elEntrate.textContent=fmt(totE);
  const elUscite=document.getElementById('c-uscite'); if(elUscite) elUscite.textContent=fmt(totU);
  // Saldo netto = entrate al netto IVA - uscite al netto IVA (esclude l'IVA dal calcolo)
  const totENetto = tuttiMov.filter(m=>m.tipo==='entrata').reduce((s,m)=>{
    const imp=parseFloat(m.importo)||0;
    const aliq=(parseFloat(m.aliquota_iva)||0)/100;
    return s + (imp/(1+aliq));
  },0);
  const totUNetto = tuttiMov.filter(m=>m.tipo==='uscita').reduce((s,m)=>{
    const imp=parseFloat(m.importo)||0;
    const aliq=(parseFloat(m.aliquota_iva)||0)/100;
    return s + (imp/(1+aliq));
  },0);
  const sn=totENetto-totUNetto;
  const cse=document.getElementById('c-saldo'); if(cse){ cse.textContent=fmt(sn); cse.className='metric-value '+(sn>=0?'green':'red'); }
  // Fatturazione
  const entrate=state.movimenti.filter(m=>m.tipo==='entrata');
  const totFatt=entrate.filter(m=>m.fatturazione==='fatturato').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const totDaFatt=entrate.filter(m=>m.fatturazione==='da_fatturare').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const elFatturato=document.getElementById('c-fatturato'); if(elFatturato) elFatturato.textContent=fmt(totFatt);
  const elDaFatturare=document.getElementById('c-da-fatturare'); if(elDaFatturare) elDaFatturare.textContent=fmt(totDaFatt);
  // Nascondi card Black in modalità clean
  const cardBlack = document.getElementById('card-black');
  if(cardBlack) cardBlack.style.display = finanzaModoClean ? 'none' : '';
  // IVA per aliquota specifica di ogni movimento
  const ivaEntrate = entrate.filter(m=>m.fatturazione==='fatturato').reduce((s,m)=>{
    const aliq = (parseFloat(m.aliquota_iva)||4)/100;
    return s + (parseFloat(m.importo)||0) * aliq;
  },0);
  const ivaUscite = state.movimenti.filter(m=>m.tipo==='uscita'&&m.fatturazione==='fatturato').reduce((s,m)=>{
    const aliq = (parseFloat(m.aliquota_iva)||4)/100;
    return s + (parseFloat(m.importo)||0) * aliq;
  },0);
  const ivaNetta = ivaEntrate - ivaUscite;
  const ivaE = document.getElementById('c-iva-entrate');
  const ivaU = document.getElementById('c-iva-uscite');
  const ivaN = document.getElementById('c-iva-netta');
  if(ivaE) ivaE.textContent = fmt(ivaEntrate);
  if(ivaU) ivaU.textContent = fmt(ivaUscite);
  if(ivaN){ ivaN.textContent = fmt(Math.abs(ivaNetta)); ivaN.style.color = ivaNetta>=0?'#6366f1':'var(--green)'; }
  const ivaNsub = document.getElementById('c-iva-netta-sub');
  if(ivaNsub) ivaNsub.textContent = ivaNetta>=0?'da versare al fisco':'IVA a credito';
  // Banner da pagare
  const daPagare = entrate.filter(m=>!m.pagato);
  const totDaPagare = daPagare.reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const banner = document.getElementById('banner-da-pagare');
  const bannerCount = document.getElementById('banner-count');
  const bannerI = document.getElementById('banner-i');
  const bannerImporto = document.getElementById('banner-importo');
  const bannerTotale = document.getElementById('banner-totale');
  if(banner && bannerCount && bannerImporto && bannerTotale){
    if(daPagare.length > 0){
      banner.style.display='flex';
      bannerCount.textContent = daPagare.length;
      if(bannerI) bannerI.textContent = daPagare.length===1 ? 'o' : 'i';
      bannerImporto.textContent = fmt(totDaPagare);
      bannerTotale.textContent = fmt(totDaPagare);
    } else {
      banner.style.display='none';
    }
  }
  renderBarCharts();
  const tb=document.getElementById('tbl-contab'); tb.innerHTML='';
  if(!movs.length){tb.innerHTML='<tr><td colspan="7"><div class="empty-state">Nessun movimento</div></td></tr>';return;}
  movs.forEach(m=>{
    const tr=document.createElement('tr');
    const dataFmt = m.data ? new Date(m.data).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
    const descFmt = m.descrizione || m.desc || '—';
    const numProdotti = (m.prodotti && Array.isArray(m.prodotti)) ? m.prodotti.length : 0;
    const descConBadge = numProdotti>1 ? `${descFmt} <span style="font-size:10px;background:var(--brand-light);color:var(--brand);border-radius:4px;padding:1px 6px;margin-left:4px;font-weight:600">${numProdotti} prodotti</span>` : descFmt;
    const importoColor = m.tipo==='entrata' ? (!m.pagato ? 'var(--red)' : 'var(--green)') : 'var(--red)';
    const metodoOpts = ['','Contanti','Bonifico','Assegno','Carta','Altro'];
    const metodoSelectHtml = `<select onchange="aggiornaMetodoPagamento(${m.id},this.value)" style="font-size:12px;padding:4px 6px;border-radius:6px;border:1px solid var(--border-strong);background:#fff;font-family:var(--font);color:var(--text);cursor:pointer">${metodoOpts.map(o=>`<option value="${o}" ${o===(m.metodo_pagamento||'')?'selected':''}>${o||'— Seleziona —'}</option>`).join('')}</select>`;
    tr.innerHTML=`<td style="font-size:13px;color:var(--text);font-weight:600;white-space:nowrap">${dataFmt}</td><td style="font-weight:500">${descConBadge}</td><td style="text-align:center">${m.tipo==='entrata'?`<input type="checkbox" ${m.pagato?'checked':''} onchange="togglePagato(${m.id},this.checked)" style="width:18px;height:18px;cursor:pointer;accent-color:var(--green)">`:''}</td><td style="font-size:12px;color:var(--text-2)">${m.cat||'—'}</td><td><span class="badge badge-${m.tipo}">${m.tipo}</span></td><td style="font-weight:600;text-align:right;color:${importoColor};white-space:nowrap">${m.tipo==='entrata'?'+':'-'}${fmt(m.importo)}</td><td>${m.tipo==='entrata'?(FATT_BADGE[m.fatturazione||'non_applicabile']||''):''}</td><td style="white-space:nowrap">${metodoSelectHtml}</td><td style="white-space:nowrap"><button class="btn btn-sm" onclick="editMovimento(${m.id})" style="margin-right:4px"><i class="ti ti-pencil"></i></button><button class="btn btn-danger btn-sm" onclick="eliminaMov(${m.id})"><i class="ti ti-trash"></i></button></td>`;
    tb.appendChild(tr);
  });
}
function renderBarCharts(){
  const eMap={}, uMap={};
  state.movimenti.filter(m=>m.tipo==='entrata').forEach(m=>{eMap[m.cat]=(eMap[m.cat]||0)+(parseFloat(m.importo)||0);});
  state.movimenti.filter(m=>m.tipo==='uscita').forEach(m=>{uMap[m.cat]=(uMap[m.cat]||0)+(parseFloat(m.importo)||0);});
  function draw(data,id,cls){
    const c=document.getElementById(id); if(!c)return;
    const total=Object.values(data).reduce((s,v)=>s+v,0);
    if(!total){c.innerHTML='<div class="empty-state" style="padding:12px 0"><p>Nessun dato</p></div>';return;}
    c.innerHTML=Object.entries(data).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>`
      <div class="stat-bar-wrap">
        <div class="stat-bar-label"><span style="color:var(--text-2)">${cat}</span><span style="font-weight:600">${fmt(val)}</span></div>
        <div class="stat-bar"><div class="stat-bar-fill ${cls}" style="width:${Math.round(val/total*100)}%"></div></div>
      </div>`).join('');
  }
  draw(eMap,'stat-entrate','green');
  draw(uMap,'stat-uscite','');
}
async function eliminaMov(id){conferma(async()=>{await api.del('/api/movimenti/'+id);state.movimenti=state.movimenti.filter(m=>m.id!==id);renderContab();renderDash();showSave();});}
function filterContab(f,el){
  state.contabFilter=f;
  document.querySelectorAll('.pills .pill').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  const tableWrap = document.getElementById('contab-table-wrap');
  const nonpagatiWrap = document.getElementById('contab-nonpagati-wrap');
  if(f === 'nonpagati'){
    if(tableWrap) tableWrap.style.display='none';
    if(nonpagatiWrap) nonpagatiWrap.style.display='block';
    renderNonPagati();
  } else {
    if(tableWrap) tableWrap.style.display='block';
    if(nonpagatiWrap) nonpagatiWrap.style.display='none';
    renderContab();
  }
}

function renderNonPagati(){
  const tbody = document.getElementById('tbl-nonpagati');
  const totaleEl = document.getElementById('nonpagati-totale');
  if(!tbody) return;

  // Prendi solo le entrate non pagate, dal più recente al più vecchio
  const nonPagati = (state.movimenti||[])
    .filter(m => m.tipo === 'entrata' && !m.pagato)
    .sort((a,b) => new Date(b.data) - new Date(a.data));

  if(!nonPagati.length){
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--green);font-size:14px"><i class="ti ti-circle-check" style="font-size:24px;display:block;margin-bottom:8px"></i>Tutti i clienti hanno pagato!</td></tr>`;
    if(totaleEl) totaleEl.textContent = '';
    return;
  }

  const totale = nonPagati.reduce((s,m) => s + (Number(m.importo)||0), 0);
  if(totaleEl) totaleEl.innerHTML = `Da incassare: <strong style="color:var(--orange)">€${totale.toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>`;

  const oggi = new Date(); oggi.setHours(0,0,0,0);

  tbody.innerHTML = nonPagati.map(m=>{
    const dataOrd = new Date(m.data); dataOrd.setHours(0,0,0,0);
    const giorni = Math.floor((oggi - dataOrd) / 86400000);
    const giorniColor = giorni > 60 ? 'var(--red)' : giorni > 30 ? 'var(--orange)' : 'var(--text-2)';
    const dataFmt = dataOrd.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});
    const importoFmt = (m.importo||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
    return `<tr style="border-bottom:1px solid var(--border)">
      <td style="font-size:13px;white-space:nowrap">${dataFmt}</td>
      <td style="font-size:13px;font-weight:700;color:${giorniColor};white-space:nowrap">${giorni} gg</td>
      <td style="font-size:13px"><strong>${m.descrizione||'—'}</strong>${m.cliente_nome?`<br><span style="font-size:11px;color:var(--text-3)">${m.cliente_nome}</span>`:''}</td>
      <td style="font-size:12px;color:var(--text-2)">${m.cat||'—'}</td>
      <td style="font-size:14px;font-weight:700;color:var(--orange);text-align:right;white-space:nowrap">+€${importoFmt}</td>
      <td style="text-align:center"><input type="checkbox" onchange="togglePagato(${m.id},this.checked);setTimeout(renderNonPagati,300)" style="width:18px;height:18px;cursor:pointer;accent-color:var(--green)"></td>
      <td><button class="btn btn-sm" onclick="editMovimento(${m.id})"><i class="ti ti-pencil"></i></button></td>
    </tr>`;
  }).join('');
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────
// ── RICERCA RAPIDA DASHBOARD (stile Pipedrive) ───────────────────────────
function chiudiRicercaRapida(){
  const cont = document.getElementById('dash-search-results');
  const clear = document.getElementById('dash-search-clear');
  if(cont){ cont.innerHTML=''; cont.style.display='none'; }
  if(clear) clear.style.display='none';
}

function ricercaRapida(q){
  const cont = document.getElementById('dash-search-results');
  const clear = document.getElementById('dash-search-clear');
  if(!cont) return;
  const query = (q||'').trim().toLowerCase();
  if(clear) clear.style.display = query ? 'block' : 'none';
  if(!query){ chiudiRicercaRapida(); return; }

  // Raccoglie risultati per categoria
  const gruppi = [
    { label: 'Clienti', icon: 'ti-user', color: '#6366f1', items: [] },
    { label: 'Pipeline', icon: 'ti-layout-kanban', color: '#f59e0b', items: [] },
    { label: 'Ordini',   icon: 'ti-clipboard-list', color: '#10b981', items: [] },
    { label: 'Attività', icon: 'ti-checkbox',        color: '#3b82f6', items: [] },
  ];

  (state.clienti||[]).forEach(c=>{
    if(c.nome.toLowerCase().includes(query)||(c.tel||'').includes(query)||(c.email||'').toLowerCase().includes(query)){
      gruppi[0].items.push({ titolo:c.nome, sub:[c.citta,c.tel].filter(Boolean).join(' · '), azione:()=>{ showPage('clienti'); setTimeout(()=>evidenziaCliente(c.id),300); } });
    }
  });
  (state.leads||[]).forEach(l=>{
    if(l.nome.toLowerCase().includes(query)||(l.citta||'').toLowerCase().includes(query)||(l.contatto||'').toLowerCase().includes(query)){
      const fase=(state.fasi||[]).find(f=>f.id===l.stato);
      gruppi[1].items.push({ titolo:l.nome, sub:[fase?.label,l.citta,l.prodotto].filter(Boolean).join(' · '), azione:()=>showPage('pipeline') });
    }
  });
  (state.ordini||[]).forEach(o=>{
    if((o.cliente||'').toLowerCase().includes(query)||(o.prodotto||'').toLowerCase().includes(query)){
      gruppi[2].items.push({ titolo:o.cliente, sub:`${o.prodotto||''} · ${o.qty||''} kg`, azione:()=>showPage('ordini') });
    }
  });
  (state.attivita||[]).forEach(a=>{
    if((a.titolo||'').toLowerCase().includes(query)||(a.cliente||'').toLowerCase().includes(query)){
      gruppi[3].items.push({ titolo:a.titolo, sub:a.cliente||'', azione:()=>showPage('attivita') });
    }
  });

  const tuttiItems = [];
  gruppi.forEach(g=>g.items.forEach(it=>tuttiItems.push({...it, gruppo:g})));
  window._searchResults = tuttiItems;

  if(!tuttiItems.length){
    cont.style.display='block';
    cont.innerHTML=`<div style="padding:18px 16px;text-align:center;color:var(--text-2)"><i class="ti ti-mood-empty" style="font-size:24px;display:block;margin-bottom:6px"></i><div style="font-size:13px">Nessun risultato per <strong>"${q}"</strong></div></div>`;
    return;
  }

  // Render raggruppato stile Pipedrive
  let html = '';
  let idxGlobale = 0;
  gruppi.forEach(g=>{
    if(!g.items.length) return;
    html += `<div style="padding:7px 14px 4px;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.6px;display:flex;align-items:center;gap:6px;border-top:${idxGlobale>0?'1px solid var(--border)':'none'}"><i class="ti ${g.icon}" style="font-size:13px;color:${g.color}"></i>${g.label}</div>`;
    g.items.slice(0,4).forEach(it=>{
      const idx = idxGlobale++;
      html += `<div onclick="eseguiRicercaRapida(${idx})" style="display:flex;align-items:center;gap:11px;padding:9px 14px;cursor:pointer;transition:background .1s" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='transparent'">
        <div style="width:32px;height:32px;border-radius:50%;background:${g.color}18;display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <i class="ti ${g.icon}" style="font-size:15px;color:${g.color}"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.titolo}</div>
          ${it.sub?`<div style="font-size:12px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${it.sub}</div>`:''}
        </div>
        <i class="ti ti-arrow-right" style="font-size:14px;color:var(--text-3);flex-shrink:0"></i>
      </div>`;
    });
  });
  cont.style.display='block';
  cont.innerHTML=html;
}

function eseguiRicercaRapida(idx){
  const r=(window._searchResults||[])[idx]; if(!r) return;
  document.getElementById('dash-search-input').value='';
  chiudiRicercaRapida();
  r.azione();
}

function evidenziaCliente(id){
  const el=document.getElementById('cl-row-'+id);
  if(el){ el.scrollIntoView({behavior:'smooth',block:'center'}); el.style.background='var(--brand-light)'; setTimeout(()=>el.style.background='',1500); }
}

// Chiudi dropdown cliccando fuori
document.addEventListener('click', e=>{
  if(!document.getElementById('dash-search-wrap')?.contains(e.target)) chiudiRicercaRapida();
});

function renderDash(){
  if(!document.getElementById('m-clienti')) return;
  const today=new Date();
  const elDate=document.getElementById('dash-date'); if(elDate) elDate.textContent=today.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('m-clienti').textContent=state.clienti.filter(c=>c.tipo==='cliente').length;
  const elOrdini=document.getElementById('m-ordini'); if(elOrdini) elOrdini.textContent=state.ordini.filter(o=>o.stato==='aperto').length;
  const totE=state.movimenti.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+(parseFloat(m.importo)||0),0);
  const elEntrate=document.getElementById('m-entrate'); if(elEntrate) elEntrate.textContent=fmt(totE);
  const sn=state.movimenti.reduce((s,m)=>s+(m.tipo==='entrata'?(parseFloat(m.importo)||0):-(parseFloat(m.importo)||0)),0);
  const se=document.getElementById('m-saldo'); if(se){ se.textContent=fmt(sn); se.className='metric-value '+(sn>=0?'green':'red'); }
  const fMap={}; state.fasi.forEach(f=>fMap[f.id]=f.label);
  const pl=document.getElementById('dash-pipeline');
  if(pl){
    const recent=[...state.leads].slice(-5).reverse();
    pl.innerHTML=recent.length?recent.map(l=>`<div class="dash-item"><span style="font-size:13px;font-weight:500">${l.nome}</span><span class="badge badge-lead" style="font-size:10px">${fMap[l.stato]||l.stato}</span></div>`).join(''):'<div class="empty-state" style="padding:10px 0"><p>Nessun contatto</p></div>';
  }
  const od=document.getElementById('dash-ordini');
  if(od){
    const lastOrd=[...state.ordini].slice(-5).reverse();
    od.innerHTML=lastOrd.length?lastOrd.map(o=>`<div class="dash-item"><div><div style="font-size:13px;font-weight:600">${o.cliente}</div><div style="font-size:11px;color:var(--text-3)">${o.prodotto} · ${o.qty} kg</div></div><div style="text-align:right"><div style="font-weight:600">${fmt(o.importo)}</div><span class="badge badge-${o.stato}">${o.stato}</span></div></div>`).join(''):'<div class="empty-state" style="padding:10px 0"><p>Nessun ordine</p></div>';
  }
  renderDashTask();
}

// ── SALVA LEAD ────────────────────────────────────────────────────────────
async function salvaLead(){
  const nome=document.getElementById('lead-nome').value.trim(); if(!nome)return alert('Inserisci il nome');
  const statoIniziale = document.getElementById('lead-stato').value;
  const statoPerLeadRecord = currentPipelineId==='default' ? statoIniziale : (state.fasi[0]?.id||'');
  const data=await api.post('/api/leads',{
    nome,
    contatto:document.getElementById('lead-contatto').value,
    tel:document.getElementById('lead-tel').value,
    email:document.getElementById('lead-email')?.value||'',
    citta:document.getElementById('lead-citta').value,
    prodotto:document.getElementById('lead-prodotto').value,
    stato:statoPerLeadRecord,
    tag:document.getElementById('lead-tag').value||null
  });
  if(!data.error){
    state.leads.unshift(data);
    if(currentPipelineId !== 'default'){
      try{
        const assoc = await api.post('/api/lead-pipeline-stato', {lead_id:data.id, pipeline_id:currentPipelineId, stato:statoIniziale});
        if(assoc && !assoc.error) state.leadPipelineStato.push(assoc);
      }catch(e){ console.error('Errore associazione pipeline custom:', e); }
    }
    // Salva prima attività se abilitata
    const attToggle = document.getElementById('lead-att-toggle');
    if(attToggle?.checked){
      const tipo = document.getElementById('lead-att-tipo').value||'chiamata';
      const noteAtt = document.getElementById('lead-att-note').value.trim();
      const dataAtt = document.getElementById('lead-att-data').value;
      const oraAtt = document.getElementById('lead-att-ora').value;
      const titoliDefault={chiamata:'Chiamata',email:'Email',ordine:'Ordine',nota:'Nota'};
      if(noteAtt||dataAtt){
        const attBody={tipo,titolo:titoliDefault[tipo]+' — '+nome,note:noteAtt,data_scadenza:dataAtt||null,ora:oraAtt||null,lead_id:data.id,pipeline_id:currentPipelineId,collegata_tipo:'lead',collegata_id:data.id,collegata_nome:nome,completata:false};
        const attData = await api.post('/api/attivita',attBody);
        if(!attData.error){ state.attivita=state.attivita||[]; state.attivita.unshift({...attData,lead_nome:nome}); }
      }
    }
  }
  closeModal('modal-lead'); renderPipeline(); renderDash(); showSave();
  // Reset campi
  ['lead-nome','lead-contatto','lead-tel','lead-email','lead-citta','lead-att-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('lead-tag').value='';
  const toggle=document.getElementById('lead-att-toggle');
  if(toggle){toggle.checked=false;toggleLeadAttivita(false);}
}

function toggleLeadAttivita(show){
  const sec=document.getElementById('lead-att-section');
  if(sec) sec.style.display=show?'block':'none';
  if(show){
    document.getElementById('lead-att-data').value=new Date().toISOString().slice(0,10);
    setLeadAttTipo('chiamata');
  }
}

function setLeadAttTipo(tipo){
  if(tipo === 'ordine'){
    // Prendi il lead dal campo nascosto nel modal-lead se disponibile
    const leadNome = document.getElementById('lead-nome')?.value || document.getElementById('edit-lead-nome')?.value || '';
    const leadAzienda = document.getElementById('lead-contatto')?.value || '';
    const fakeLeadObj = { nome: leadNome, azienda: leadAzienda };
    closeModal('modal-lead');
    apriNuovoOrdinePerLead(fakeLeadObj);
    return;
  }
  document.getElementById('lead-att-tipo').value=tipo;
  ['chiamata','email','ordine','nota'].forEach(t=>{
    const btn=document.getElementById('lead-att-btn-'+t);
    if(btn){ btn.style.background=t===tipo?'var(--brand-light)':'#fff'; }
  });
}

function editLead(id){
  const l=state.leads.find(x=>x.id===id); if(!l)return;
  populateFasiSelects();
  document.getElementById('edit-lead-id').value=l.id;
  document.getElementById('edit-lead-nome').value=l.nome;
  document.getElementById('edit-lead-contatto').value=l.contatto||'';
  document.getElementById('edit-lead-tel').value=l.tel||'';
  document.getElementById('edit-lead-citta').value=l.citta||'';
  document.getElementById('edit-lead-note').value=l.note||'';
  const ps=document.getElementById('edit-lead-prodotto'); for(let o of ps.options) if(o.value===l.prodotto)o.selected=true;
  const statoCorrente = statoLeadInPipeline(l, currentPipelineId);
  const ss=document.getElementById('edit-lead-stato'); for(let o of ss.options) if(o.value===statoCorrente)o.selected=true;
  document.getElementById('edit-lead-tag').value=l.tag||'';
  openModal('modal-edit-lead');
}
async function aggiornaLead(){
  const id=parseInt(document.getElementById('edit-lead-id').value);
  const nuovoStato = document.getElementById('edit-lead-stato').value;
  const body={nome:document.getElementById('edit-lead-nome').value.trim(),contatto:document.getElementById('edit-lead-contatto').value,tel:document.getElementById('edit-lead-tel').value,citta:document.getElementById('edit-lead-citta').value,prodotto:document.getElementById('edit-lead-prodotto').value,note:document.getElementById('edit-lead-note').value,tag:document.getElementById('edit-lead-tag').value||null};

  if(currentPipelineId === 'default'){
    body.stato = nuovoStato;
    await api.put('/api/leads/'+id, body);
    const l=state.leads.find(x=>x.id===id); if(l)Object.assign(l,body);
  } else {
    const l=state.leads.find(x=>x.id===id);
    body.stato = l ? l.stato : nuovoStato; // mantieni invariato lo stato sulla pipeline default
    await api.put('/api/leads/'+id, body);
    if(l)Object.assign(l,body);
    let assoc = (state.leadPipelineStato||[]).find(s=>s.lead_id===id);
    if(assoc) assoc.stato = nuovoStato;
    else { assoc = {lead_id:id, pipeline_id:currentPipelineId, stato:nuovoStato}; state.leadPipelineStato.push(assoc); }
    try{ await api.put('/api/lead-pipeline-stato', {lead_id:id, pipeline_id:currentPipelineId, stato:nuovoStato}); }catch(e){}
  }
  closeModal('modal-edit-lead'); renderPipeline(); renderDash(); showSave();
}

// ── RICERCA AZIENDA GOOGLE ───────────────────────────────────────────────
async function cercaAziendaGoogle(prefix){
  const input = document.getElementById(prefix+'-ricerca-azienda');
  const query = input.value.trim();
  const cont = document.getElementById(prefix+'-risultati-ricerca');
  if(!query){ cont.innerHTML=''; return; }
  cont.innerHTML = '<div style="font-size:12px;color:var(--text-2);padding:8px 0"><i class="ti ti-loader"></i> Ricerca in corso...</div>';
  try{
    const data = await api.get('/api/places/search?q='+encodeURIComponent(query));
    if(data.error){
      cont.innerHTML = `<div style="font-size:12px;color:var(--red);padding:8px 0">Errore: ${data.error}</div>`;
      return;
    }
    if(!data.risultati || !data.risultati.length){
      cont.innerHTML = '<div style="font-size:12px;color:var(--text-2);padding:8px 0">Nessun risultato trovato</div>';
      return;
    }
    cont.innerHTML = data.risultati.map((r,i)=>`
      <div onclick="selezionaAziendaGoogle('${prefix}', ${i})" style="background:#fff;border:1px solid var(--border);border-radius:var(--r);padding:9px 12px;margin-bottom:6px;cursor:pointer;transition:border-color .15s" onmouseover="this.style.borderColor='var(--brand)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="font-weight:600;font-size:13px">${r.nome}</div>
        <div style="font-size:11px;color:var(--text-2)">${r.indirizzo}</div>
        ${r.telefono?`<div style="font-size:11px;color:var(--text-2)"><i class="ti ti-phone" style="font-size:11px"></i> ${r.telefono}</div>`:''}
      </div>`).join('');
    window['_googleResults_'+prefix] = data.risultati;
  }catch(e){
    cont.innerHTML = '<div style="font-size:12px;color:var(--red);padding:8px 0">Errore di rete nella ricerca</div>';
  }
}

function selezionaAziendaGoogle(prefix, idx){
  const risultati = window['_googleResults_'+prefix];
  if(!risultati || !risultati[idx]) return;
  const r = risultati[idx];
  document.getElementById(prefix+'-nome').value = r.nome || '';
  document.getElementById(prefix+'-citta').value = r.citta || '';
  document.getElementById(prefix+'-ind').value = r.indirizzo || '';
  const telEl = document.getElementById(prefix+'-tel');
  if(telEl && r.telefono) telEl.value = r.telefono;
  // PEC: Google Places a volte espone email certificate nei siti web
  // Se nei dati Google c'è una email che contiene "pec" nel dominio la inseriamo automaticamente
  const pecEl = document.getElementById(prefix+'-pec');
  if(pecEl && r.email && r.email.toLowerCase().includes('pec')) pecEl.value = r.email;
  document.getElementById(prefix+'-risultati-ricerca').innerHTML = `<div style="font-size:12px;color:var(--green);padding:6px 0"><i class="ti ti-check"></i> Dati compilati da Google${pecEl&&pecEl.value?' (inclusa PEC)':''}</div>`;
  document.getElementById(prefix+'-ricerca-azienda').value = '';
}

// ── SALVA CLIENTE ─────────────────────────────────────────────────────────
async function salvaCliente(){
  const nome=document.getElementById('cl-nome').value.trim(); if(!nome)return alert('Inserisci la ragione sociale');
  const tipoModal = document.getElementById('modal-cliente').dataset.tipo || 'cliente';
  const data=await api.post('/api/clienti',{
    tipo:tipoModal,
    nome, ref:document.getElementById('cl-ref').value,
    tel:document.getElementById('cl-tel').value, email:document.getElementById('cl-email').value,
    citta:document.getElementById('cl-citta').value,
    piva:document.getElementById('cl-piva').value.trim(),
    ind_legale:document.getElementById('cl-ind-legale').value.trim(),
    ind_consegna:document.getElementById('cl-ind-consegna').value.trim(),
    sdi:document.getElementById('cl-sdi').value.toUpperCase().trim(),
    pec:document.getElementById('cl-pec').value.trim(),
    prod:document.getElementById('cl-prod').value, note:document.getElementById('cl-note').value
  });
  if(!data.error) state.clienti.push(data);
  // Reset tipo nel modal
  document.getElementById('modal-cliente').dataset.tipo = 'cliente';
  const title = document.querySelector('#modal-cliente .modal-title');
  if(title) title.textContent = 'Nuovo cliente';
  closeModal('modal-cliente');
  if(tipoModal==='fornitore') renderFornitori(); else renderClienti();
  renderDash(); showSave();
  ['cl-nome','cl-ref','cl-tel','cl-email','cl-citta','cl-piva','cl-ind-legale','cl-ind-consegna','cl-sdi','cl-pec','cl-prod','cl-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}

function setEditTipo(tipo){
  const btnC = document.getElementById('edit-tipo-cliente');
  const btnF = document.getElementById('edit-tipo-fornitore');
  if(tipo === 'fornitore'){
    btnC.style.background='#fff'; btnC.style.color='var(--text-2)';
    btnF.style.background='var(--orange)'; btnF.style.color='#fff';
  } else {
    btnC.style.background='var(--brand)'; btnC.style.color='#fff';
    btnF.style.background='#fff'; btnF.style.color='var(--text-2)';
  }
  document.getElementById('modal-edit-cliente').dataset.tipo = tipo;
}

function editCliente(id){
  const c=state.clienti.find(x=>x.id===id); if(!c)return;
  document.getElementById('edit-cl-id').value=c.id;
  ['nome','ref','tel','email','citta','piva','ind-legale','ind-consegna','sdi','pec','prod','note'].forEach(f=>{
    const el=document.getElementById('edit-cl-'+f); if(el) el.value=c[f.replace('-','_')]||'';
  });
  const same = document.getElementById('edit-cl-ind-same');
  if(same) same.checked = !!(c.ind_legale && c.ind_consegna && c.ind_legale===c.ind_consegna);
  setEditTipo(c.tipo || 'cliente');
  openModal('modal-edit-cliente');
}
async function aggiornaCliente(){
  const id=parseInt(document.getElementById('edit-cl-id').value);
  const tipo = document.getElementById('modal-edit-cliente').dataset.tipo || 'cliente';
  const body={
    tipo,
    nome:document.getElementById('edit-cl-nome').value, ref:document.getElementById('edit-cl-ref').value,
    tel:document.getElementById('edit-cl-tel').value, email:document.getElementById('edit-cl-email').value,
    citta:document.getElementById('edit-cl-citta').value,
    piva:document.getElementById('edit-cl-piva')?.value.trim()||'',
    ind_legale:document.getElementById('edit-cl-ind-legale')?.value.trim()||'',
    ind_consegna:document.getElementById('edit-cl-ind-consegna')?.value.trim()||'',
    sdi:document.getElementById('edit-cl-sdi').value.toUpperCase().trim(),
    pec:document.getElementById('edit-cl-pec').value.trim(),
    prod:document.getElementById('edit-cl-prod').value, note:document.getElementById('edit-cl-note').value
  };
  await api.put('/api/clienti/'+id, body);
  // Ricarica dal server per avere la lista aggiornata e corretta
  const aggiornati = await api.get('/api/clienti');
  if(!aggiornati.error) state.clienti = aggiornati;
  closeModal('modal-edit-cliente');
  renderClienti(); renderFornitori(); showSave();
}

// ── SALVA ORDINE ──────────────────────────────────────────────────────────
// ── SALVA MOVIMENTO ───────────────────────────────────────────────────────
async function salvaMovimento(){
  const d=document.getElementById('mov-data').value;
  const descrizione=document.getElementById('mov-desc').value.trim();
  const imp=parseFloat(document.getElementById('mov-importo').value)||0;
  if(!d||!descrizione||!imp) return alert('Compila data, descrizione e imponibile netto');
  const metodoPagamento = document.getElementById('mov-metodo-pagamento').value || '';
  if(!metodoPagamento) return alert('Seleziona il metodo di pagamento');
  const fatturazione = document.getElementById('mov-fatturazione').value || 'non_applicabile';
  const pagatoRadio = document.querySelector('input[name="mov-pagato-radio"]:checked');
  const pagato = pagatoRadio ? pagatoRadio.value==='si' : false;
  const prodotti = leggiRigheProdotto('mov');
  try{
    const data=await api.post('/api/movimenti',{
      data:d,
      tipo:document.getElementById('mov-tipo').value,
      importo:imp,
      cat:getCatValue('mov-cat','mov-cat-custom'),
      descrizione,
      fatturazione,
      aliquota_iva: parseInt(document.getElementById('mov-iva').value)||4,
      prodotti: prodotti.length ? prodotti : null,
      confezione: prodotti.length===1 ? prodotti[0].confezione : '',
      qty_kg: prodotti.length===1 ? prodotti[0].qty : null,
      prezzo_kg: prodotti.length===1 ? prodotti[0].prezzo : null,
      pagato,
      metodo_pagamento: metodoPagamento,
      fic_fattura_id: parseInt(document.getElementById('mov-fic-fattura-id')?.value)||null
    });
    if(data && !data.error){
      state.movimenti.unshift(data);
      closeModal('modal-movimento');
      showSave();
      try{ renderContab(); }catch(renderErr){ console.error('Errore render contabilità:', renderErr); }
      try{ renderDash(); }catch(renderErr){ console.error('Errore render dashboard:', renderErr); }
    } else {
      alert('Errore: '+(data?.error||'impossibile salvare il movimento'));
    }
  }catch(e){
    alert('Errore di rete: '+e.message);
  }
}

function editMovimento(id){
  const m=state.movimenti.find(x=>x.id===id); if(!m)return;
  document.getElementById('edit-mov-id').value=m.id;
  document.getElementById('edit-mov-data').value=(m.data||'').slice(0,10);
  document.getElementById('edit-mov-importo').value=m.importo;
  document.getElementById('edit-mov-desc').value=m.descrizione;
  const ts=document.getElementById('edit-mov-tipo'); for(let o of ts.options) if(o.value===m.tipo)o.selected=true;
  toggleFatturazione('edit-mov-fatturazione-row', m.tipo);
  toggleProdottiSection('edit-mov');
  const fs=document.getElementById('edit-mov-fatturazione'); for(let o of fs.options) if(o.value===(m.fatturazione||'non_applicabile'))o.selected=true;
  const iv=document.getElementById('edit-mov-iva'); for(let o of iv.options) if(parseInt(o.value)===(parseInt(m.aliquota_iva)||4))o.selected=true;

  // Pagato radio + metodo
  const radios = document.querySelectorAll('input[name="edit-mov-pagato-radio"]');
  radios.forEach(r=>r.checked = (r.value==='si')===!!m.pagato);
  document.getElementById('edit-mov-metodo-pagamento').value = m.metodo_pagamento||'';
  toggleMetodoPagamentoVisibility('edit-mov');
  // Popola ID fattura FIC se presente
  const ficIdEl = document.getElementById('edit-mov-fic-fattura-id');
  if(ficIdEl) ficIdEl.value = m.fic_fattura_id || '';

  // Prodotti: usa array prodotti se presente, altrimenti singola riga legacy
  const prodottiList = document.getElementById('edit-mov-prodotti-list');
  prodottiList.innerHTML='';
  const prodottiArr = (m.prodotti && Array.isArray(m.prodotti) && m.prodotti.length) ? m.prodotti
    : (m.confezione || m.qty_kg || m.prezzo_kg) ? [{confezione:m.confezione||'', qty:m.qty_kg||'', prezzo:m.prezzo_kg||''}]
    : [];
  if(prodottiArr.length){
    prodottiArr.forEach(p=>aggiungiRigaProdotto('edit-mov', p));
  } else {
    aggiungiRigaProdotto('edit-mov');
  }

  // Calcola imponibile netto dall'importo ivato (fallback manuale)
  const aliq = (parseInt(m.aliquota_iva)||4)/100;
  const netto = aliq>0 ? (parseFloat(m.importo)||0)/(1+aliq) : parseFloat(m.importo)||0;
  document.getElementById('edit-mov-importo-netto').value = netto.toFixed(2);
  document.getElementById('edit-mov-importo').value = parseFloat(m.importo)||0;
  document.getElementById('edit-mov-importo-preview').textContent = fmt(parseFloat(m.importo)||0);
  populateCatSelect('edit-mov-cat', m.cat||'');
  const cs=document.getElementById('edit-mov-cat'); for(let o of cs.options) if(o.value===m.cat)o.selected=true;

  calcolaImportoEditMov();
  openModal('modal-edit-movimento');
}

async function aggiornaMovimento(){
  const id=parseInt(document.getElementById('edit-mov-id').value);
  const metodoPagamento = document.getElementById('edit-mov-metodo-pagamento').value || '';
  if(!metodoPagamento) return alert('Seleziona il metodo di pagamento');
  const fatturazione = document.getElementById('edit-mov-fatturazione').value || 'non_applicabile';
  const pagatoRadio = document.querySelector('input[name="edit-mov-pagato-radio"]:checked');
  const pagato = pagatoRadio ? pagatoRadio.value==='si' : false;
  const prodotti = leggiRigheProdotto('edit-mov');
  const body={
    data:document.getElementById('edit-mov-data').value,
    tipo:document.getElementById('edit-mov-tipo').value,
    importo:parseFloat(document.getElementById('edit-mov-importo').value)||0,
    cat:getCatValue('edit-mov-cat','edit-mov-cat-custom'),
    descrizione:document.getElementById('edit-mov-desc').value,
    fatturazione,
    aliquota_iva:parseInt(document.getElementById('edit-mov-iva').value)||4,
    prodotti: prodotti.length ? prodotti : null,
    confezione: prodotti.length===1 ? prodotti[0].confezione : '',
    qty_kg: prodotti.length===1 ? prodotti[0].qty : null,
    prezzo_kg: prodotti.length===1 ? prodotti[0].prezzo : null,
    pagato,
    metodo_pagamento: metodoPagamento,
    fic_fattura_id: parseInt(document.getElementById('edit-mov-fic-fattura-id')?.value)||null
  };
  await api.put('/api/movimenti/'+id,body);
  const m=state.movimenti.find(x=>x.id===id); if(m)Object.assign(m,body);
  closeModal('modal-edit-movimento'); renderContab(); renderDash(); showSave();
}

// ── MULTI-PRODOTTO ────────────────────────────────────────────────────────
let _prodottoRigaCounter = 0;

function toggleProdottiSection(prefix){
  const tipo = document.getElementById(prefix+'-tipo').value;
  const section = document.getElementById(prefix+'-prodotti-section');
  const manualeWrap = document.getElementById(prefix+'-importo-netto-manuale-wrap');
  if(tipo==='entrata'){
    section.style.display='block';
    manualeWrap.style.display='none';
  } else {
    section.style.display='none';
    manualeWrap.style.display='block';
  }
  if(prefix==='mov') calcolaImportoMov(); else calcolaImportoEditMov();
}

function toggleMetodoPagamentoVisibility(prefix){
  // Il metodo di pagamento è sempre visibile, indipendentemente dalla scelta Sì/No
  const wrap = document.getElementById(prefix+'-metodo-pagamento-wrap');
  if(!wrap) return;
  wrap.style.display = 'block';
}

function aggiungiRigaProdotto(prefix, valori){
  valori = valori || {confezione:'', qty:'', prezzo:''};
  const rigaId = prefix+'-prod-'+(_prodottoRigaCounter++);
  const lista = document.getElementById(prefix+'-prodotti-list');
  const riga = document.createElement('div');
  riga.id = rigaId;
  riga.className = 'prodotto-riga';
  riga.style.cssText='display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r)';
  riga.innerHTML = `
    <div class="form-group" style="margin-bottom:0;flex:1.3">
      <label class="form-label" style="font-size:11px">Confezione</label>
      <select class="prod-confezione" onchange="calcolaImporto${prefix==='mov'?'Mov':'EditMov'}()">
        <option value="">— Nessuna —</option>
        <option value="sacco 5kg">Sacco 5 kg</option>
        <option value="sacco 10kg">Sacco 10 kg</option>
        <option value="sacco 30kg">Sacco 30 kg</option>
        <option value="sfuso">Sfuso</option>
        <option value="altro">Altro</option>
      </select>
    </div>
    <div class="form-group" style="margin-bottom:0;flex:0.8">
      <label class="form-label" style="font-size:11px">Quantità (kg)</label>
      <input type="number" class="prod-qty" step="0.1" min="0" placeholder="es. 100" oninput="calcolaImporto${prefix==='mov'?'Mov':'EditMov'}()">
    </div>
    <div class="form-group" style="margin-bottom:0;flex:0.8">
      <label class="form-label" style="font-size:11px">Prezzo/kg (€)</label>
      <input type="number" class="prod-prezzo" step="0.001" min="0" placeholder="es. 0.55" oninput="calcolaImporto${prefix==='mov'?'Mov':'EditMov'}()">
    </div>
    <button type="button" class="btn btn-icon btn-danger btn-sm" onclick="rimuoviRigaProdotto('${rigaId}','${prefix}')" title="Rimuovi" style="flex-shrink:0;margin-bottom:1px"><i class="ti ti-trash"></i></button>
  `;
  lista.appendChild(riga);
  riga.querySelector('.prod-confezione').value = valori.confezione||'';
  riga.querySelector('.prod-qty').value = valori.qty||'';
  riga.querySelector('.prod-prezzo').value = valori.prezzo||'';
}

function rimuoviRigaProdotto(rigaId, prefix){
  const el = document.getElementById(rigaId);
  if(el) el.remove();
  if(prefix==='mov') calcolaImportoMov(); else calcolaImportoEditMov();
}

function leggiRigheProdotto(prefix){
  const righe = document.querySelectorAll(`#${prefix}-prodotti-list .prodotto-riga`);
  const out=[];
  righe.forEach(r=>{
    const confezione = r.querySelector('.prod-confezione')?.value||'';
    const qty = parseFloat(r.querySelector('.prod-qty')?.value)||0;
    const prezzo = parseFloat(r.querySelector('.prod-prezzo')?.value)||0;
    if(confezione||qty||prezzo) out.push({confezione, qty, prezzo, subtotale: +(qty*prezzo).toFixed(2)});
  });
  return out;
}

function sommaProdotti(prefix){
  const righe = leggiRigheProdotto(prefix);
  return righe.reduce((s,r)=>s+(r.qty*r.prezzo),0);
}



// ── UTENTI ────────────────────────────────────────────────────────────────
async function renderUtenti(){
  const container=document.getElementById('users-list'); container.innerHTML='';
  try {
    const utenti = await api.get('/api/utenti');
    const allPerms=['dashboard','pipeline','clienti','ordini','contabilita','email','automazioni','ai','utenti'];
    utenti.forEach(u=>{
      const perms=PERMESSI[u.ruolo]||{};
      const div=document.createElement('div'); div.className='user-row';
      div.innerHTML=`
        <div class="user-av" style="background:${ROLE_COLORS[u.ruolo]||'var(--brand)'}">${ini(u.nome)}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
            <span style="font-weight:600;font-size:13px">${u.nome}</span>
            <span class="badge badge-${u.ruolo}">${ROLE_ICONS[u.ruolo]} ${u.ruolo}</span>
            <span style="font-size:11px;color:var(--text-3);font-family:var(--font-mono)">@${u.username}</span>
            ${u.pending?'<span class="badge" style="background:#FFF4E0;color:var(--orange)">⏳ In attesa</span>':''}
          </div>
          <div>${allPerms.map(p=>`<span class="perm-pill ${perms[p]?'perm-on':'perm-off'}">${perms[p]?'✓':'✗'} ${PERM_LABELS[p]}</span>`).join('')}</div>
        </div>
        ${u.id!==currentUser.id&&currentUser.ruolo==='admin'?`<button class="btn btn-danger btn-sm" onclick="eliminaUtente(${u.id})"><i class="ti ti-trash"></i></button>`:''}
      `;
      container.appendChild(div);
    });
  } catch(e){ container.innerHTML='<div class="empty-state"><p>Errore caricamento utenti</p></div>'; }
}
async function salvaUtente(){
  const nome=document.getElementById('u-nome').value.trim(),user=document.getElementById('u-user').value.trim().toLowerCase(),pass=document.getElementById('u-pass').value,ruolo=document.getElementById('u-role').value;
  if(!nome||!user||!pass){alert('Compila tutti i campi');return;}
  const data=await api.post('/api/utenti',{nome,username:user,password:pass,ruolo,email:''});
  if(data.error){alert(data.error);return;}
  closeModal('modal-utente'); renderUtenti(); showSave();
  ['u-nome','u-user','u-pass'].forEach(id=>document.getElementById(id).value='');
}
async function eliminaUtente(id){
  conferma(async()=>{
    await api.del('/api/utenti/'+id);
    renderUtenti(); showSave();
  });
}

// ── GMAIL ─────────────────────────────────────────────────────────────────
let currentEmailAccount = 'principale';

function switchEmailAccount(account, el){
  currentEmailAccount = account;
  document.querySelectorAll('#eacc-principale, #eacc-spedizioni').forEach(e=>e.classList.remove('active'));
  if(el) el.classList.add('active');
  checkGmailStatus();
}

function connettiAccountEmailCorrente(){
  window.location.href = currentEmailAccount === 'spedizioni' ? '/auth/spedizioni/login' : '/auth/login';
}

async function checkGmailStatus(){
  try{
    const res=await fetch('/api/gmail/status?account='+currentEmailAccount); const data=await res.json();
    const sb=document.getElementById('gmail-status-sidebar');
    const btn=document.getElementById('btn-connect-gmail');
    if(data.connected){
      if(sb) sb.innerHTML='<span style="color:var(--green);font-weight:600;display:flex;align-items:center;gap:4px"><i class="ti ti-check"></i>Connesso</span>';
      if(btn) btn.style.display='none';
      caricaEmail();
    } else {
      if(sb) sb.innerHTML='Non connesso';
      if(btn) btn.style.display='block';
      const list=document.getElementById('email-list');
      if(list) list.innerHTML='<div class="empty-state" style="padding:24px"><i class="ti ti-plug-off"></i><p>Questa casella non è ancora connessa</p></div>';
    }
    await loadTemplates();
    aggiornaContatoreBozze();
  }catch(e){}
}
// ── FATTURE IN CLOUD ──────────────────────────────────────────────────────
let ficFatture = [];
let ficFilter = 'tutte';

async function initPaginaFatture(){
  try{
    const status = await api.get('/api/fatture/status');
    const nonConnesso = document.getElementById('fic-non-connesso');
    const selAzienda = document.getElementById('fic-seleziona-azienda');
    const connesso = document.getElementById('fic-connesso');
    const headerActions = document.getElementById('fic-header-actions');
    [nonConnesso, selAzienda, connesso].forEach(el=>{ if(el) el.style.display='none'; });
    if(headerActions) headerActions.innerHTML='';

    if(!status.connected){
      if(nonConnesso) nonConnesso.style.display='block';
      return;
    }
    if(!status.companyId){
      // Connesso ma senza azienda selezionata: mostra lista aziende
      const aziende = await api.get('/api/fatture/companies');
      if(aziende.error || !Array.isArray(aziende) || !aziende.length){
        if(nonConnesso) nonConnesso.style.display='block';
        return;
      }
      if(selAzienda){
        selAzienda.style.display='block';
        document.getElementById('fic-lista-aziende').innerHTML = aziende.map(a=>`
          <button class="btn" onclick="selezionaAziendaFatture(${a.id})" style="text-align:left;justify-content:flex-start">
            <i class="ti ti-building"></i> ${a.name}
          </button>`).join('');
      }
      return;
    }
    // Connesso e azienda selezionata
    if(connesso) connesso.style.display='block';
    if(headerActions) headerActions.innerHTML = `<button class="btn btn-sm" onclick="disconnettiFatture()"><i class="ti ti-plug-off"></i> Disconnetti</button>`;
    await caricaFatture();
    await caricaDdt();
  }catch(e){
    console.error('Errore inizializzazione Fatture in Cloud:', e);
  }
}

async function selezionaAziendaFatture(companyId){
  try{
    await api.post('/api/fatture/set-company', {companyId});
    await initPaginaFatture();
    showSave();
  }catch(e){ alert('Errore di rete: '+e.message); }
}

async function disconnettiFatture(){
  conferma(async()=>{
    try{
      await api.post('/api/fatture/disconnect', {});
      await initPaginaFatture();
      showSave();
    }catch(e){ alert('Errore di rete: '+e.message); }
  });
}

async function caricaFatture(){
  const tb = document.getElementById('tbl-fatture');
  if(tb) tb.innerHTML = '<tr><td colspan="6"><div class="empty-state" style="padding:20px"><i class="ti ti-loader"></i><p>Caricamento fatture...</p></div></td></tr>';
  try{
    const data = await api.get('/api/fatture/invoices');
    if(data.error){
      if(tb) tb.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:20px"><p>${data.error}</p></div></td></tr>`;
      return;
    }
    ficFatture = data.data || [];
    aggiornaMetricheFatture();
    renderTabellaFatture();
  }catch(e){
    if(tb) tb.innerHTML = '<tr><td colspan="6"><div class="empty-state" style="padding:20px"><p>Errore di caricamento</p></div></td></tr>';
  }
}

// Una fattura si considera "pagata" se ha già superato la data di scadenza pagamento senza importo residuo,
// oppure se l'azienda non ha impostato scadenze (next_due_date assente). In assenza del campo payment_status
// dall'API, usiamo amount_due_discount/next_due_date come indicatori indiretti.
function fatturaPagata(f){
  if(f.payment_status) return f.payment_status === 'paid';
  if(!f.next_due_date) return true; // nessuna scadenza impostata, consideriamo regolata
  return new Date(f.next_due_date) < new Date(); // scadenza già passata
}

function aggiornaMetricheFatture(){
  const anno = new Date().getFullYear();
  const fattureAnno = ficFatture.filter(f=>f.date && new Date(f.date).getFullYear()===anno);
  const totFatture = fattureAnno.length;
  const totImporto = fattureAnno.reduce((s,f)=>s+(parseFloat(f.amount_gross)||0),0);
  const daIncassare = fattureAnno.filter(f=>!fatturaPagata(f)).reduce((s,f)=>s+(parseFloat(f.amount_gross)||0),0);
  const elTot = document.getElementById('fic-tot-fatture'); if(elTot) elTot.textContent = totFatture;
  const elImp = document.getElementById('fic-tot-importo'); if(elImp) elImp.textContent = fmt(totImporto);
  const elDa = document.getElementById('fic-tot-da-incassare'); if(elDa) elDa.textContent = fmt(daIncassare);
}

function filterFatture(tipo, el){
  ficFilter = tipo;
  document.querySelectorAll('#page-fatture .pill').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  renderTabellaFatture();
}

function renderTabellaFatture(){
  const tb = document.getElementById('tbl-fatture');
  if(!tb) return;
  let list = ficFatture;
  if(ficFilter==='pagate') list = list.filter(f=>fatturaPagata(f));
  if(ficFilter==='non_pagate') list = list.filter(f=>!fatturaPagata(f));
  if(!list.length){
    tb.innerHTML = '<tr><td colspan="6"><div class="empty-state" style="padding:20px"><i class="ti ti-file-invoice"></i><p>Nessuna fattura</p></div></td></tr>';
    return;
  }
  tb.innerHTML = list.map(f=>{
    const dataFmt = f.date ? new Date(f.date).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
    const pagata = fatturaPagata(f);
    return `<tr onclick="window.open('${f.url||'#'}','_blank')" style="cursor:pointer">
      <td style="font-weight:600">${f.number||'—'}</td>
      <td style="font-size:13px;color:var(--text-2)">${dataFmt}</td>
      <td>${f.entity?.name||'—'}</td>
      <td style="text-align:right;font-weight:600">${fmt(parseFloat(f.amount_gross)||0)}</td>
      <td><span class="badge" style="background:${pagata?'var(--green-light)':'var(--orange-light)'};color:${pagata?'var(--green)':'var(--orange)'}">${pagata?'Pagata':'Non pagata'}</span></td>
      <td><a href="${f.url||'#'}" target="_blank" class="btn btn-sm" title="Apri su Fatture in Cloud" onclick="event.stopPropagation()"><i class="ti ti-external-link"></i></a></td>
    </tr>`;
  }).join('');
}

// ── DDT (Documenti di Trasporto) ─────────────────────────────────────────
let ficDdt = [];

function switchFicTab(tab, el){
  document.querySelectorAll('#fic-connesso .pills:first-of-type .pill').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('fic-vista-fatture').style.display = tab==='fatture' ? 'block' : 'none';
  document.getElementById('fic-vista-ddt').style.display = tab==='ddt' ? 'block' : 'none';
  document.getElementById('fic-vista-storico').style.display = tab==='storico' ? 'block' : 'none';
  if(tab==='storico') caricaStoricoClienti();
}

async function caricaStoricoClienti(){
  const tb = document.getElementById('tbl-storico-clienti');
  if(tb) tb.innerHTML = '<tr><td colspan="7"><div class="empty-state" style="padding:20px"><i class="ti ti-loader"></i><p>Caricamento...</p></div></td></tr>';
  try{
    const data = await api.get('/api/fatture/clienti-storico');
    if(data.error){
      if(tb) tb.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:20px"><p>${data.error}</p></div></td></tr>`;
      return;
    }
    if(!data.length){
      tb.innerHTML = '<tr><td colspan="7"><div class="empty-state" style="padding:20px"><i class="ti ti-users"></i><p>Nessun cliente registrato ancora. Carica le fatture o i DDT per popolare lo storico.</p></div></td></tr>';
      return;
    }
    tb.innerHTML = data.map(c=>{
      const ultimoTipo = c.ultimo_documento_tipo === 'invoice' ? 'Fattura' : c.ultimo_documento_tipo === 'delivery_note' ? 'DDT' : '—';
      const ultimaData = c.ultimo_documento_data ? new Date(c.ultimo_documento_data).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
      return `<tr>
        <td style="font-weight:600">${c.nome}</td>
        <td style="font-size:13px;color:var(--text-2)">${c.vat_number||'—'}</td>
        <td style="font-size:13px;color:var(--text-2)">${c.citta||'—'}</td>
        <td style="text-align:center">${c.num_fatture||0}</td>
        <td style="text-align:center">${c.num_ddt||0}</td>
        <td style="text-align:right;font-weight:600">${fmt(parseFloat(c.importo_totale_fatturato)||0)}</td>
        <td style="font-size:12px;color:var(--text-2)">${ultimoTipo} n.${c.ultimo_documento_numero||'—'} · ${ultimaData}</td>
      </tr>`;
    }).join('');
  }catch(e){
    if(tb) tb.innerHTML = '<tr><td colspan="7"><div class="empty-state" style="padding:20px"><p>Errore di caricamento</p></div></td></tr>';
  }
}

async function caricaDdt(){
  const tb = document.getElementById('tbl-ddt');
  if(tb) tb.innerHTML = '<tr><td colspan="5"><div class="empty-state" style="padding:20px"><i class="ti ti-loader"></i><p>Caricamento DDT...</p></div></td></tr>';
  try{
    const data = await api.get('/api/fatture/ddt');
    if(data.error){
      if(tb) tb.innerHTML = `<tr><td colspan="5"><div class="empty-state" style="padding:20px"><p>${data.error}</p></div></td></tr>`;
      return;
    }
    ficDdt = data.data || [];
    aggiornaMetricheDdt();
    renderTabellaDdt();
  }catch(e){
    if(tb) tb.innerHTML = '<tr><td colspan="5"><div class="empty-state" style="padding:20px"><p>Errore di caricamento</p></div></td></tr>';
  }
}

function aggiornaMetricheDdt(){
  const anno = new Date().getFullYear();
  const ddtAnno = ficDdt.filter(d=>d.date && new Date(d.date).getFullYear()===anno);
  const elTot = document.getElementById('fic-tot-ddt'); if(elTot) elTot.textContent = ddtAnno.length;
  const totImporto = ddtAnno.reduce((s,d)=>s+(parseFloat(d.amount_gross)||0),0);
  const elImp = document.getElementById('fic-tot-importo-ddt'); if(elImp) elImp.textContent = fmt(totImporto);
}

function renderTabellaDdt(){
  const tb = document.getElementById('tbl-ddt');
  if(!tb) return;
  if(!ficDdt.length){
    tb.innerHTML = '<tr><td colspan="5"><div class="empty-state" style="padding:20px"><i class="ti ti-truck"></i><p>Nessun DDT</p></div></td></tr>';
    return;
  }
  tb.innerHTML = ficDdt.map(d=>{
    const dataFmt = d.date ? new Date(d.date).toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—';
    return `<tr onclick="window.open('${d.url||'#'}','_blank')" style="cursor:pointer">
      <td style="font-weight:600">${d.number||'—'}</td>
      <td style="font-size:13px;color:var(--text-2)">${dataFmt}</td>
      <td>${d.entity?.name||'—'}</td>
      <td style="text-align:right;font-weight:600">${fmt(parseFloat(d.amount_gross)||0)}</td>
      <td><a href="${d.url||'#'}" target="_blank" class="btn btn-sm" title="Apri su Fatture in Cloud" onclick="event.stopPropagation()"><i class="ti ti-external-link"></i></a></td>
    </tr>`;
  }).join('');
}


let emailFolder = 'inbox';
const FOLDER_LABELS = {inbox:'In arrivo',sent:'Inviati',drafts:'Bozze',spam:'Spam'};
const FOLDER_MAP = {inbox:'INBOX',sent:'SENT',drafts:'DRAFT',spam:'SPAM'};

function apriComposer(opts={}){
  document.getElementById('composer-draft-id').value = opts.draftId||'';
  document.getElementById('email-to').value = opts.to||'';
  document.getElementById('email-subject').value = opts.subject||'';
  document.getElementById('email-body-editor').innerHTML = opts.body||'';
  document.getElementById('allegati-list').innerHTML='';
  document.getElementById('composer-status').textContent='';
  document.getElementById('composer-title').textContent = opts.title||'Nuova email';
  openModal('modal-email');
  setTimeout(()=>{
    document.getElementById('email-to').focus();
    initAutocomplete('email-to');
  },150);
}

function execFmt(cmd, val=null){
  document.getElementById('email-body-editor').focus();
  document.execCommand(cmd, false, val);
}

function mostraAllegati(){
  const files=document.getElementById('email-attachments').files;
  const list=document.getElementById('allegati-list'); list.innerHTML='';
  Array.from(files).forEach(f=>{
    const tag=document.createElement('span');
    tag.style.cssText='display:inline-flex;align-items:center;gap:4px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:12px';
    tag.innerHTML=`<i class="ti ti-paperclip" style="font-size:11px"></i>${f.name} <span style="color:var(--text-3)">(${(f.size/1024).toFixed(0)}KB)</span>`;
    list.appendChild(tag);
  });
}

async function inviaEmail(){
  const to=document.getElementById('email-to').value.trim();
  const subject=document.getElementById('email-subject').value.trim();
  const body=document.getElementById('email-body-editor').innerHTML.trim();
  if(!to||!subject||!body){alert('Compila destinatario, oggetto e messaggio');return;}
  const btn=document.getElementById('btn-invia');
  btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Invio...';
  document.getElementById('composer-status').textContent='Invio in corso...';
  try{
    // Gestisci allegati
    const files=document.getElementById('email-attachments').files;
    let attachments=[];
    if(files.length){
      attachments = await Promise.all(Array.from(files).map(f=>new Promise((res,rej)=>{
        const r=new FileReader(); r.onload=e=>res({name:f.name,type:f.type,data:e.target.result.split(',')[1]});
        r.onerror=rej; r.readAsDataURL(f);
      })));
    }
    const resp=await fetch('/api/gmail/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to,subject,body,attachments,isHtml:true})});
    const data=await resp.json();
    if(data.success){
      closeModal('modal-email');
      document.getElementById('composer-status').textContent='';
      // Elimina bozza se esisteva
      const draftId=document.getElementById('composer-draft-id').value;
      if(draftId) await eliminaBozzaDB(draftId);
      // Se email inviata dal dettaglio lead, salva nella cronologia
      if(window._emailLeadPendingId){
        const leadId = window._emailLeadPendingId;
        const leadNome = window._emailLeadPendingNome||'';
        const bodyTesto = document.createElement('div');
        bodyTesto.innerHTML = body;
        const testoSemplice = bodyTesto.textContent||bodyTesto.innerText||'';
        const attEmail = {
          tipo:'email',
          titolo:'Email a '+leadNome+' — '+subject,
          note: 'A: '+to+'\nOggetto: '+subject+'\n\n'+testoSemplice.slice(0,2000),
          lead_id:leadId,
          pipeline_id:currentPipelineId||'default',
          collegata_tipo:'lead', collegata_id:leadId, collegata_nome:leadNome,
          completata:true,
          data_scadenza:new Date().toISOString().slice(0,10),
          ora:new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})
        };
        const attData = await api.post('/api/attivita', attEmail);
        if(!attData.error){ state.attivita=state.attivita||[]; state.attivita.unshift({...attData}); }
        if(_currentLeadDetailId===leadId) renderLeadDetailFeed(leadId);
        window._emailLeadPendingId = null;
        window._emailLeadPendingNome = null;
      }
      showSave();
    } else {
      document.getElementById('composer-status').textContent='Errore: '+(data.error||'invio fallito');
    }
  }catch(e){document.getElementById('composer-status').textContent='Errore di connessione';}
  btn.disabled=false; btn.innerHTML='<i class="ti ti-send"></i>Invia';
}

async function salvaBozza(){
  const to=document.getElementById('email-to').value;
  const subject=document.getElementById('email-subject').value;
  const body=document.getElementById('email-body-editor').innerHTML;
  const draftId=document.getElementById('composer-draft-id').value;
  const bozza={to,subject,body,data:new Date().toISOString()};
  if(draftId){
    await api.put('/api/bozze/'+draftId, bozza);
  } else {
    const r=await api.post('/api/bozze', bozza);
    if(r.id) document.getElementById('composer-draft-id').value=r.id;
  }
  document.getElementById('composer-status').textContent='Bozza salvata ✓';
  setTimeout(()=>document.getElementById('composer-status').textContent='',2000);
  aggiornaContatoreBozze();
}

async function eliminaBozzaDB(id){
  await api.del('/api/bozze/'+id);
  aggiornaContatoreBozze();
}

async function aggiornaContatoreBozze(){
  try{
    const r=await api.get('/api/bozze');
    const cnt=document.getElementById('drafts-count');
    if(cnt){cnt.textContent=r.length||0;cnt.style.display=r.length?'':'none';}
  }catch(e){}
}

function switchEmailNav(tab,el){
  document.querySelectorAll('.email-nav-item').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  emailFolder=tab;
  document.getElementById('email-list-title').textContent=FOLDER_LABELS[tab]||tab;
  document.getElementById('email-detail').innerHTML='<div class="email-empty"><i class="ti ti-mail-opened"></i><p>Seleziona un\'email per leggerla</p></div>';
  caricaEmail();
}

function caricaEmail(){
  const list=document.getElementById('email-list'); if(!list)return;
  list.innerHTML='<div class="empty-state" style="padding:24px"><i class="ti ti-loader"></i><p>Caricamento...</p></div>';
  if(emailFolder==='drafts'){
    if(currentEmailAccount==='spedizioni'){
      list.innerHTML='<div class="empty-state" style="padding:24px"><i class="ti ti-lock"></i><p>Le bozze non sono disponibili per questa casella (sola lettura)</p></div>';
      return;
    }
    api.get('/api/bozze').then(data=>{
      if(!data.length){list.innerHTML='<div class="empty-state" style="padding:24px"><i class="ti ti-file-text"></i><p>Nessuna bozza</p></div>';return;}
      list.innerHTML=data.map((b,i)=>`
        <div class="email-item" onclick="apriDraft(${i})" id="draft-${i}">
          <div class="email-item-top"><div class="email-item-from" style="color:var(--text-2);font-style:italic">${b.to||'(nessun destinatario)'}</div><div class="email-item-date">${new Date(b.data||Date.now()).toLocaleDateString('it-IT')}</div></div>
          <div class="email-item-subject">${b.subject||'(nessun oggetto)'}</div>
          <div class="email-item-preview" style="color:var(--orange)">Bozza</div>
        </div>`).join('');
      window._emailCache=data;
    });
    return;
  }
  fetch('/api/gmail/inbox?folder='+emailFolder+'&account='+currentEmailAccount).then(r=>r.json()).then(data=>{
    if(data.error === 'TOKEN_SCADUTO'){
      list.innerHTML=`<div class="empty-state" style="padding:32px;text-align:center">
        <i class="ti ti-refresh-alert" style="font-size:32px;color:var(--orange);margin-bottom:12px;display:block"></i>
        <p style="font-weight:600;color:var(--orange);margin-bottom:8px">Token Gmail scaduto</p>
        <p style="font-size:13px;color:var(--text-2);margin-bottom:16px">${data.messaggio}</p>
        <button class="btn btn-primary" onclick="showPage('impostazioni')"><i class="ti ti-settings"></i>Vai a Impostazioni</button>
      </div>`;
      return;
    }
    if(data.error){list.innerHTML=`<div class="empty-state" style="padding:24px"><i class="ti ti-alert-circle"></i><p>${data.error}</p></div>`;return;}
    if(!data.emails||!data.emails.length){list.innerHTML=`<div class="empty-state" style="padding:24px"><i class="ti ti-inbox"></i><p>Nessuna email</p></div>`;return;}
    const unread=data.emails.filter(e=>e.unread).length;
    const cnt=document.getElementById('inbox-count');
    if(cnt){cnt.textContent=unread;cnt.style.display=unread&&emailFolder==='inbox'?'':'none';}
    list.innerHTML=data.emails.map((e,i)=>`
      <div class="email-item ${e.unread?'unread':''}" onclick="mostraEmail(${i})" id="eitem-${i}">
        <div class="email-item-top">
          <div class="email-item-from">${emailFolder==='sent'?(e.to||'').replace(/<.*>/,'').trim():(e.from||'').replace(/<.*>/,'').trim()}</div>
          <div class="email-item-date">${new Date(e.date||Date.now()).toLocaleDateString('it-IT')}</div>
        </div>
        <div class="email-item-subject">${e.subject||'(nessun oggetto)'}</div>
        <div class="email-item-preview">${e.snippet||''}</div>
      </div>`).join('');
    window._emailCache=data.emails;
  }).catch(()=>{list.innerHTML='<div class="empty-state" style="padding:24px"><i class="ti ti-wifi-off"></i><p>Errore caricamento</p></div>';});
}

async function mostraEmail(idx){
  document.querySelectorAll('.email-item').forEach(el=>el.classList.remove('active'));
  const el=document.getElementById('eitem-'+idx); if(el)el.classList.add('active');
  const e=(window._emailCache||[])[idx]; if(!e)return;
  const fromField=emailFolder==='sent'?`<strong>A:</strong> ${e.to||''}`:`<strong>Da:</strong> ${e.from||''}`;
  // Mostra subito snippet mentre carica
  const det=document.getElementById('email-detail');
  det.innerHTML=`
    <div style="border-bottom:1px solid var(--border);padding-bottom:14px;margin-bottom:14px">
      <div style="font-size:17px;font-weight:700;margin-bottom:10px">${e.subject||'(nessun oggetto)'}</div>
      <div style="font-size:12px;color:var(--text-2);margin-bottom:3px">${fromField}</div>
      <div style="font-size:12px;color:var(--text-2)"><strong>Data:</strong> ${new Date(e.date||Date.now()).toLocaleString('it-IT')}</div>
    </div>
    <div id="email-body-view" style="font-size:14px;line-height:1.8;flex:1"><i class="ti ti-loader" style="animation:spin 1s linear infinite"></i> Caricamento...</div>
    <div id="email-attachments-view" style="margin-top:10px"></div>
    <div style="margin-top:16px;display:flex;gap:8px;padding-top:14px;border-top:1px solid var(--border)">
      <button class="btn btn-sm btn-primary" onclick="apriComposer({to:'${(e.from||'').replace(/'/g,"\\'")}',subject:'Re: ${(e.subject||'').replace(/'/g,"\\'")}',title:'Rispondi'})"><i class="ti ti-arrow-back-up"></i>Rispondi</button>
      <button class="btn btn-sm" onclick="apriComposer({to:'',subject:'Fwd: ${(e.subject||'').replace(/'/g,"\\'")}',body:'<br><br>---------- Messaggio inoltrato ----------<br>${(e.snippet||'').replace(/'/g,"\\'")}',title:'Inoltra'})"><i class="ti ti-arrow-forward-up"></i>Inoltra</button>
    </div>`;
  // Carica corpo completo e allegati
  try{
    const full = await api.get('/api/gmail/message/'+e.id+'?account='+currentEmailAccount);
    const bodyEl=document.getElementById('email-body-view');
    const attEl=document.getElementById('email-attachments-view');
    if(bodyEl) bodyEl.innerHTML = full.body || e.snippet || '';
    // Allegati
    if(attEl && full.attachments && full.attachments.length){
      attEl.innerHTML=`
        <div style="border-top:1px solid var(--border);padding-top:10px">
          <div style="font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:8px"><i class="ti ti-paperclip"></i> Allegati (${full.attachments.length})</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${full.attachments.map(a=>`
              <a href="/api/gmail/attachment/${e.id}/${a.attachmentId}?filename=${encodeURIComponent(a.filename)}&account=${currentEmailAccount}" download="${a.filename}"
                style="display:flex;align-items:center;gap:6px;padding:7px 12px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);font-size:12px;text-decoration:none;color:var(--text);transition:border-color .15s"
                onmouseover="this.style.borderColor='var(--brand)'" onmouseout="this.style.borderColor='var(--border)'">
                <i class="ti ti-file" style="color:var(--brand)"></i>${a.filename}
              </a>`).join('')}
          </div>
        </div>`;
    } else if(attEl){
      attEl.innerHTML='';
    }
  }catch(err){
    const bodyEl=document.getElementById('email-body-view');
    if(bodyEl) bodyEl.innerHTML=e.snippet||'';
  }
}

// ── TEMPLATE ──────────────────────────────────────────────────────────────
let templates = [];

async function loadTemplates(){
  try{ const r=await api.get('/api/template'); templates=r.error?[]:r; }catch(e){templates=[];}
}

function apriGestisciTemplate(){
  renderTemplateList();
  openModal('modal-template');
}

function renderTemplateList(){
  const cont=document.getElementById('template-list-modal'); cont.innerHTML='';
  if(!templates.length){cont.innerHTML='<div class="empty-state"><p>Nessun template. Creane uno!</p></div>';return;}
  templates.forEach(t=>{
    const div=document.createElement('div');
    div.style.cssText='background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;display:flex;align-items:center;gap:10px';
    div.innerHTML=`
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px;margin-bottom:2px">${t.nome}</div>
        <div style="font-size:11px;color:var(--text-2)">${t.oggetto||'(nessun oggetto)'}</div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm" onclick="editTemplate(${t.id})"><i class="ti ti-pencil"></i></button>
        <button class="btn btn-danger btn-sm" onclick="eliminaTemplate(${t.id})"><i class="ti ti-trash"></i></button>
      </div>`;
    cont.appendChild(div);
  });
}

function nuovoTemplate(){
  document.getElementById('tpl-id').value='';
  document.getElementById('tpl-nome').value='';
  document.getElementById('tpl-oggetto').value='';
  document.getElementById('tpl-body').value='';
  document.getElementById('template-edit-title').textContent='Nuovo template';
  openModal('modal-template-edit');
}

function editTemplate(id){
  const t=templates.find(x=>x.id===id); if(!t)return;
  document.getElementById('tpl-id').value=t.id;
  document.getElementById('tpl-nome').value=t.nome;
  document.getElementById('tpl-oggetto').value=t.oggetto||'';
  document.getElementById('tpl-body').value=t.body||'';
  document.getElementById('template-edit-title').textContent='Modifica template';
  openModal('modal-template-edit');
}

async function salvaTemplate(){
  const nome=document.getElementById('tpl-nome').value.trim();
  if(!nome){alert('Inserisci il nome del template');return;}
  const body={nome,oggetto:document.getElementById('tpl-oggetto').value,body:document.getElementById('tpl-body').value};
  const id=document.getElementById('tpl-id').value;
  if(id){
    await api.put('/api/template/'+id,body);
    const t=templates.find(x=>x.id===parseInt(id)); if(t)Object.assign(t,body);
  } else {
    const r=await api.post('/api/template',body);
    if(!r.error) templates.push(r);
  }
  closeModal('modal-template-edit');
  renderTemplateList();
  showSave();
}

async function eliminaTemplate(id){
  conferma(async()=>{
    await api.del('/api/template/'+id);
    templates=templates.filter(t=>t.id!==id);
    renderTemplateList();
    showSave();
  });
}

function apriTemplateSelector(){
  const cont=document.getElementById('template-sel-list'); cont.innerHTML='';
  if(!templates.length){cont.innerHTML='<div class="empty-state"><p>Nessun template salvato.<br>Creane uno dalla sezione "I miei template".</p></div>';openModal('modal-template-sel');return;}
  templates.forEach(t=>{
    const div=document.createElement('div');
    div.style.cssText='background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;cursor:pointer;transition:all .15s';
    div.innerHTML=`<div style="font-weight:600;font-size:13px;margin-bottom:3px">${t.nome}</div><div style="font-size:11px;color:var(--text-2)">${t.oggetto||''}</div>`;
    div.onmouseenter=()=>div.style.borderColor='var(--brand)';
    div.onmouseleave=()=>div.style.borderColor='var(--border)';
    div.onclick=()=>{
      const targetId = window._templateTarget || 'email-body-editor';
      if(t.oggetto&&document.getElementById('email-subject')) document.getElementById('email-subject').value=t.oggetto;
      const editor = document.getElementById(targetId);
      if(editor) editor.innerHTML=t.body||'';
      window._templateTarget = null;
      closeModal('modal-template-sel');
    };
    cont.appendChild(div);
  });
  openModal('modal-template-sel');
}

function apriDraft(idx){
  const b=(window._emailCache||[])[idx]; if(!b)return;
  apriComposer({draftId:b.id, to:b.to||'', subject:b.subject||'', body:b.body||'', title:'Modifica bozza'});
}

// ── AUTOCOMPLETE CLIENTI ──────────────────────────────────────────────────
function initAutocomplete(inputId){
  const input = document.getElementById(inputId);
  if(!input || input._acInit) return;
  input._acInit = true;
  let dropdown = document.createElement('div');
  dropdown.style.cssText='position:absolute;background:#fff;border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--shadow-md);z-index:9999;max-height:200px;overflow-y:auto;display:none;min-width:280px;top:100%;left:0';
  input.parentElement.style.position='relative';
  input.parentElement.appendChild(dropdown);
  input.addEventListener('input', ()=>{
    const q=input.value.toLowerCase().trim();
    if(!q){dropdown.style.display='none';return;}
    const matches=(state.clienti||[]).filter(c=>
      c.nome.toLowerCase().includes(q)||
      (c.email||'').toLowerCase().includes(q)||
      (c.ref||'').toLowerCase().includes(q)
    ).slice(0,6);
    if(!matches.length){dropdown.style.display='none';return;}
    dropdown.innerHTML=matches.map(c=>`
      <div class="ac-item" onmousedown="event.preventDefault()" onclick="(function(){document.getElementById('${inputId}').value='${(c.email||c.nome).replace(/'/g,"\\'")}';document.getElementById('${inputId}')._acDrop.style.display='none'})()">
        <div style="font-weight:600;font-size:13px">${c.nome}</div>
        <div style="font-size:11px;color:var(--text-2)">${c.email||'(nessuna email)'}${c.citta?' · '+c.citta:''}</div>
      </div>`).join('');
    input._acDrop=dropdown;
    dropdown.style.display='block';
  });
  input.addEventListener('blur',()=>setTimeout(()=>dropdown.style.display='none',200));
}

async function generaEmailModal(){
  const subj=document.getElementById('email-subject').value||'presentazione';
  const to=document.getElementById('email-to').value||'cliente';
  try{
    const resp=await fetch('/api/gmail/genera',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:subj,cliente:to,prodotto:'semola rimacinata',note:''})});
    const data=await resp.json();
    if(data.testo) document.getElementById('email-body-editor').innerHTML=data.testo.replace(/\n/g,'<br>');
  }catch(e){alert('Errore AI');}
}
function generaEmail(){
  const btn=document.querySelector('[onclick="generaEmail()"]'); btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Generazione...';
  fetch('/api/gmail/genera',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo:document.getElementById('gen-tipo').value,cliente:document.getElementById('gen-cliente').value||'Cliente',prodotto:document.getElementById('gen-prodotto').value||'semola',note:document.getElementById('gen-note').value})})
    .then(r=>r.json()).then(data=>{
      if(data.testo){document.getElementById('email-generata').textContent=data.testo;document.getElementById('email-generata').style.display='block';document.getElementById('btn-usa-email').style.display='block';}
    }).catch(()=>alert('Errore AI'))
    .finally(()=>{btn.disabled=false;btn.innerHTML='<i class="ti ti-wand"></i> Genera con AI';});
}
function usaEmailGenerata(){
  const testo=document.getElementById('email-generata').textContent;
  openModal('modal-email');
  setTimeout(()=>document.getElementById('email-body').value=testo,100);
}

// ── AI CHAT ───────────────────────────────────────────────────────────────
function getCtx(){
  const cl=state.clienti.map(c=>`- ${c.nome} (${c.citta||'N/D'}) | ${c.prod||'N/D'}`).join('\n');
  const or=state.ordini.map(o=>`- ${o.cliente} | ${o.prodotto} | ${o.qty}kg | €${o.importo} | ${o.data} | ${o.stato}`).join('\n');
  const totE=state.movimenti.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+m.importo,0);
  const totU=state.movimenti.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+m.importo,0);
  return `Sei l'assistente AI del Mulino Vitaliti Antonio, fondato 1930, vende semola rimacinata di grano duro e farine in tutta Italia.\nCLIENTI (${state.clienti.length}):\n${cl}\nORDINI (${state.ordini.length}):\n${or}\nCONTABILITÀ: Entrate €${totE.toFixed(2)} | Uscite €${totU.toFixed(2)} | Saldo €${(totE-totU).toFixed(2)}\nRispondi in italiano, conciso e pratico.`;
}
function sendAIMessage(t){document.getElementById('chat-input').value=t;sendChat();}
function clearChat(){document.getElementById('chat-messages').innerHTML='<div class="msg-ai"><div class="msg-avatar ai"><strong style="font-size:13px">S</strong></div><div class="msg-bubble ai">Chat pulita. Dimmi cosa ti serve, Giovanni.</div></div>';}
function sendChat(){
  const input=document.getElementById('chat-input'), text=input.value.trim(); if(!text)return;
  input.value=''; input.style.height='38px';
  const msgs=document.getElementById('chat-messages');
  const uDiv=document.createElement('div'); uDiv.className='msg-user';
  uDiv.innerHTML=`<div class="msg-avatar user">${ini(currentUser.nome)}</div><div class="msg-bubble user">${text}</div>`;
  msgs.appendChild(uDiv);
  const lDiv=document.createElement('div'); lDiv.className='msg-ai'; lDiv.id='ai-load';
  lDiv.innerHTML=`<div class="msg-avatar ai"><strong style="font-size:13px">S</strong></div><div class="msg-bubble ai" style="color:var(--text-3)">⟳ Elaborazione...</div>`;
  msgs.appendChild(lDiv); msgs.scrollTop=msgs.scrollHeight;
  document.getElementById('send-btn').disabled=true;
  fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:text}]})})
    .then(r=>r.json()).then(data=>{
      document.getElementById('ai-load').remove();
      const reply=data.reply||data.error||'Errore.';
      const aDiv=document.createElement('div'); aDiv.className='msg-ai';
      aDiv.innerHTML=`<div class="msg-avatar ai"><strong style="font-size:13px">S</strong></div><div class="msg-bubble ai">${reply.replace(/\n/g,'<br>')}</div>`;
      msgs.appendChild(aDiv);

      const az = data.azioni || {};

      // Task creato
      if(az.task){
        mostraToast(`📋 Task creato: "${az.task.titolo}"${az.task.scadenza?' · scadenza '+az.task.scadenza:''}`);
      }

      // Pulsante per aprire la scheda cliente
      if(az.cliente){
        const bDiv=document.createElement('div'); bDiv.className='msg-ai';
        bDiv.innerHTML=`<div class="msg-avatar ai" style="opacity:0"></div>
          <button class="btn btn-sm" onclick="apriSchedaCliente(${az.cliente.id})" style="margin-left:2px">
            <i class="ti ti-user-circle"></i>Apri scheda ${az.cliente.nome}</button>`;
        msgs.appendChild(bDiv);
      }

      // Bozza email pronta da rivedere e inviare
      if(az.email){
        _aiEmailBozza = az.email;
        const eDiv=document.createElement('div'); eDiv.className='msg-ai';
        eDiv.innerHTML=`<div class="msg-avatar ai" style="opacity:0"></div>
          <div style="flex:1;border:1.5px solid var(--brand);border-radius:var(--r);padding:12px;background:var(--surface-2);max-width:520px">
            <div style="font-size:11px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Bozza email pronta</div>
            <input type="text" id="ai-mail-to" value="${(az.email.destinatario||'').replace(/"/g,'&quot;')}" placeholder="destinatario@email.it"
              style="width:100%;padding:6px 9px;border:1px solid var(--border);border-radius:6px;font-size:12px;margin-bottom:6px">
            <input type="text" id="ai-mail-ogg" value="${(az.email.oggetto||'').replace(/"/g,'&quot;')}" placeholder="Oggetto"
              style="width:100%;padding:6px 9px;border:1px solid var(--border);border-radius:6px;font-size:12px;margin-bottom:6px">
            <textarea id="ai-mail-corpo" style="width:100%;min-height:130px;padding:8px 9px;border:1px solid var(--border);border-radius:6px;font-size:12px;line-height:1.5;font-family:inherit;resize:vertical">${az.email.corpo||''}</textarea>
            <button class="btn btn-primary btn-sm" id="ai-mail-btn" onclick="aiInviaEmailBozza()" style="margin-top:8px"><i class="ti ti-send"></i>Invia email</button>
          </div>`;
        msgs.appendChild(eDiv);
      }

      msgs.scrollTop = msgs.scrollHeight;

      // Mostra azioni DB eseguite
      if(data.dbAzioni && data.dbAzioni.length){
        const dbDiv = document.createElement('div'); dbDiv.className='msg-ai';
        dbDiv.innerHTML=`<div class="msg-avatar ai" style="opacity:0"></div>
          <div style="font-size:11px;color:var(--text-3);padding:4px 8px;background:var(--surface-2);border-radius:6px;display:flex;flex-direction:column;gap:3px">
            ${data.dbAzioni.map(a=>`<span>${a.messaggio}</span>`).join('')}
          </div>`;
        msgs.appendChild(dbDiv);
      }
    }).catch(()=>{
      document.getElementById('ai-load').remove();
      const eDiv=document.createElement('div'); eDiv.className='msg-ai';
      eDiv.innerHTML=`<div class="msg-avatar ai" style="background:var(--red-light);color:var(--red)"><i class="ti ti-alert-circle"></i></div><div class="msg-bubble ai" style="background:var(--red-light);color:var(--red)">Errore di connessione.</div>`;
      msgs.appendChild(eDiv);
    }).finally(()=>{document.getElementById('send-btn').disabled=false;msgs.scrollTop=msgs.scrollHeight;});
}

function calcolaImportoMov(){
  const aliq = (parseInt(document.getElementById('mov-iva').value)||0)/100;
  const tipo = document.getElementById('mov-tipo').value;
  let netto;
  if(tipo==='entrata'){
    netto = sommaProdotti('mov');
  } else {
    netto = parseFloat(document.getElementById('mov-importo-netto').value)||0;
  }
  const ivato = netto * (1 + aliq);
  document.getElementById('mov-importo').value = ivato.toFixed(2);
  document.getElementById('mov-importo-preview').textContent = fmt(ivato);
}

function calcolaImportoEditMov(){
  const aliq = (parseInt(document.getElementById('edit-mov-iva').value)||0)/100;
  const tipo = document.getElementById('edit-mov-tipo').value;
  let netto;
  if(tipo==='entrata'){
    netto = sommaProdotti('edit-mov');
  } else {
    netto = parseFloat(document.getElementById('edit-mov-importo-netto').value)||0;
  }
  const ivato = netto * (1 + aliq);
  document.getElementById('edit-mov-importo').value = ivato.toFixed(2);
  document.getElementById('edit-mov-importo-preview').textContent = fmt(ivato);
}

function toggleFatturazione(rowId, tipo){
  const row = document.getElementById(rowId);
  if(row) row.style.display = 'block';
}

const FATT_BADGE = {
  fatturato: '<span class="badge" style="background:var(--green-light);color:var(--green)">Fatturato</span>',
  da_fatturare: '<span class="badge" style="background:var(--orange-light);color:var(--orange)">Black</span>',
  acconto: '<span class="badge" style="background:var(--blue-light);color:var(--blue)">🔄 Acconto</span>',
  non_applicabile: '',
};

async function togglePagato(id, pagato){
  try{
    await api.put('/api/movimenti/'+id+'/pagato', {pagato});
    const m = state.movimenti.find(x=>x.id===id);
    if(m) m.pagato = pagato;
    renderContab();
  }catch(e){ console.error(e); }
}

async function aggiornaMetodoPagamento(id, metodo){
  try{
    await api.put('/api/movimenti/'+id+'/metodo-pagamento', {metodo_pagamento: metodo});
    const m = state.movimenti.find(x=>x.id===id);
    if(m) m.metodo_pagamento = metodo;
    showSave();
  }catch(e){ console.error(e); }
}

const CAT_DEFAULT = ['Vendita prodotti','Bonifico cliente','Versamento contante','Fornitore','Utenze','Mutuo','Tasse/imposte','Commissioni bancarie','Assegno'];

function loadCat(){
  try{ const s=localStorage.getItem('vv_categorie'); return s?JSON.parse(s):[...CAT_DEFAULT]; }catch(e){ return [...CAT_DEFAULT]; }
}
function saveCat(cats){ try{localStorage.setItem('vv_categorie',JSON.stringify(cats));}catch(e){} }

function populateCatSelect(selId, currentVal=''){
  const cats = loadCat();
  const sel = document.getElementById(selId); if(!sel)return;
  sel.innerHTML = cats.map(c=>`<option value="${c}" ${c===currentVal?'selected':''}>${c}</option>`).join('');
  sel.innerHTML += `<option value="__gestisci__">Gestisci categorie...</option>`;
  if(currentVal && !cats.includes(currentVal) && currentVal!=='__gestisci__'){
    sel.innerHTML = `<option value="${currentVal}" selected>${currentVal}</option>` + sel.innerHTML;
  }
}

function onCatChange(selId, customId){
  const sel = document.getElementById(selId);
  if(sel.value === '__gestisci__'){
    sel.value = sel.options[0].value;
    apriGestisciCategorie();
  }
}

function getCatValue(selId, customId){
  const sel = document.getElementById(selId);
  if(sel.value === '__gestisci__') return sel.options[0].value;
  return sel.value;
}

function apriGestisciCategorie(){
  const cats = loadCat();
  const html = `
    <div style="display:grid;gap:6px;margin-bottom:14px" id="cat-edit-list">
      ${cats.map((c,i)=>`
        <div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r)">
          <input type="text" value="${c}" id="cat-item-${i}" style="flex:1;border:none;background:transparent;font-size:13px;font-family:var(--font);outline:none">
          <button class="btn btn-danger btn-sm btn-icon" onclick="eliminaCat(${i})"><i class="ti ti-trash"></i></button>
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <input type="text" id="nuova-cat-input" placeholder="Nuova categoria..." style="flex:1;padding:8px 11px;border:1px solid var(--border-strong);border-radius:var(--r);font-size:13px;font-family:var(--font)" onkeydown="if(event.key==='Enter')aggiungiCat()">
      <button class="btn btn-primary" onclick="aggiungiCat()"><i class="ti ti-plus"></i>Aggiungi</button>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-top:14px">
      <button class="btn btn-primary" onclick="salvaCatModificate()"><i class="ti ti-check"></i>Salva modifiche</button>
    </div>`;

  // Usa un modal temporaneo
  let m = document.getElementById('modal-cat-gestisci');
  if(!m){
    m = document.createElement('div');
    m.id='modal-cat-gestisci';
    m.className='modal-overlay';
    m.innerHTML=`<div class="modal" style="width:480px"><div class="modal-header"><div class="modal-title">Gestisci categorie</div><button class="btn btn-icon" onclick="closeModal('modal-cat-gestisci')"><i class="ti ti-x"></i></button></div><div class="modal-body" id="cat-modal-body"></div></div>`;
    document.body.appendChild(m);
  }
  document.getElementById('cat-modal-body').innerHTML=html;
  m.classList.add('open');
}

function eliminaCat(i){
  const cats=loadCat(); cats.splice(i,1); saveCat(cats);
  apriGestisciCategorie();
}
function aggiungiCat(){
  const val=document.getElementById('nuova-cat-input').value.trim(); if(!val)return;
  const cats=loadCat(); if(!cats.includes(val)){cats.push(val);saveCat(cats);}
  apriGestisciCategorie();
}
function salvaCatModificate(){
  const cats=loadCat();
  cats.forEach((_,i)=>{
    const el=document.getElementById('cat-item-'+i);
    if(el&&el.value.trim()) cats[i]=el.value.trim();
  });
  saveCat(cats);
  closeModal('modal-cat-gestisci');
  populateCatSelect('mov-cat');
  populateCatSelect('edit-mov-cat');
  showSave();
}
function apriTemplateSelectorPer(targetId){
  window._templateTarget = targetId;
  apriTemplateSelector();
}

// ── INVIO EMAIL MULTIPLO ──────────────────────────────────────────────────
function apriInvioMultiplo(){
  const clientiConEmail = state.clienti.filter(c=>c.email&&c.email.trim());
  const lista = document.getElementById('lista-clienti-multiplo');
  if(!clientiConEmail.length){
    lista.innerHTML='<div style="padding:14px;color:var(--text-2);font-size:13px;text-align:center">Nessun cliente con email registrata</div>';
  } else {
    lista.innerHTML = clientiConEmail.map(c=>`
      <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid var(--border);cursor:pointer;font-size:13px">
        <input type="checkbox" class="multiplo-check" data-email="${c.email}" data-nome="${c.nome}" style="width:16px;height:16px;accent-color:var(--brand)">
        <div><div style="font-weight:600">${c.nome}</div><div style="font-size:11px;color:var(--text-2)">${c.email}</div></div>
      </label>`).join('');
  }
  document.getElementById('multiplo-subject').value='';
  document.getElementById('multiplo-body-editor').innerHTML='';
  document.getElementById('multiplo-status').textContent='';
  openModal('modal-invio-multiplo');
}

function selezionaTuttiClienti(sel){
  document.querySelectorAll('.multiplo-check').forEach(cb=>cb.checked=sel);
}

async function inviaEmailMultipla(){
  const selezionati = [...document.querySelectorAll('.multiplo-check:checked')];
  if(!selezionati.length) return alert('Seleziona almeno un cliente');
  const subject = document.getElementById('multiplo-subject').value.trim();
  const body = document.getElementById('multiplo-body-editor').innerHTML;
  if(!subject||!body) return alert('Compila oggetto e messaggio');
  const status = document.getElementById('multiplo-status');
  let inviati=0, errori=0;
  for(const cb of selezionati){
    const email = cb.dataset.email;
    const nome = cb.dataset.nome;
    status.textContent = `Invio a ${nome}...`;
    try{
      const r = await api.post('/api/gmail/send',{to:email,subject,body});
      if(r.error) errori++; else inviati++;
    }catch(e){ errori++; }
  }
  status.textContent = `✅ Inviate: ${inviati}${errori>0?' | ❌ Errori: '+errori:''}`;
  if(inviati>0) showSave();
}
// ── AUTOMAZIONI ───────────────────────────────────────────────────────────
let automazioni = [];

async function loadAutomazioni(){
  try{ automazioni = await api.get('/api/automazioni'); }catch(e){ automazioni=[]; }
}

async function renderAutomazioni(){
  await loadAutomazioni();
  const cont = document.getElementById('automazioni-list');
  if(!cont) return;
  if(!automazioni.length){
    cont.innerHTML='<div class="empty-state"><i class="ti ti-settings-automation"></i><p>Nessuna automazione. Creane una!</p></div>';
    return;
  }
  cont.innerHTML = automazioni.map(a=>{
    const fase = state.fasi?.find(f=>f.id===a.trigger_fase_id);
    const faseDest = state.fasi?.find(f=>f.id===a.azione_sposta_fase_id);
    return `
    <div class="card" style="padding:16px;border-left:4px solid ${a.attiva?'var(--green)':'var(--border)'}">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="width:38px;height:38px;border-radius:var(--r);background:${a.attiva?'var(--green-light)':'var(--surface-2)'};color:${a.attiva?'var(--green)':'var(--text-3)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
          <i class="ti ti-settings-automation"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;margin-bottom:4px">${a.nome}</div>
          <div style="font-size:12px;color:var(--text-2);margin-bottom:8px">
            <span style="background:var(--surface-2);border:1px solid var(--border);border-radius:4px;padding:2px 8px;margin-right:6px">
              ⚡ Lead in <strong>"${fase?.label||a.trigger_fase_id||'—'}"</strong> da <strong>${a.trigger_giorni} giorni</strong>
            </span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${a.azione_email?`<span style="font-size:11px;background:var(--blue-light);color:var(--blue);border-radius:4px;padding:2px 8px">📧 Invia email</span>`:''}
            ${a.azione_sposta&&faseDest?`<span style="font-size:11px;background:var(--orange-light);color:var(--orange);border-radius:4px;padding:2px 8px">➡️ Sposta in "${faseDest.label}"</span>`:''}
          </div>
          ${a.ultima_esecuzione?`<div style="font-size:11px;color:var(--text-3);margin-top:6px">Ultima esecuzione: ${new Date(a.ultima_esecuzione).toLocaleString('it-IT')} · ${a.esecuzioni||0} volte</div>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <div style="cursor:pointer;width:44px;height:24px;border-radius:12px;background:${a.attiva?'var(--green)':'var(--border)'};position:relative;transition:background .2s" onclick="toggleAutomazione(${a.id})">
            <div style="position:absolute;width:18px;height:18px;background:#fff;border-radius:50%;top:3px;transition:left .2s;left:${a.attiva?'23px':'3px'}"></div>
          </div>
          <button class="btn btn-sm" onclick="editAutomazione(${a.id})"><i class="ti ti-pencil"></i></button>
          <button class="btn btn-danger btn-sm" onclick="eliminaAutomazione(${a.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function nuovaAutomazione(){
  document.getElementById('auto-id').value='';
  document.getElementById('auto-nome').value='';
  document.getElementById('auto-trigger-giorni').value='7';
  document.getElementById('auto-email-oggetto').value='';
  document.getElementById('auto-email-corpo-editor').innerHTML='';
  document.getElementById('auto-azione-email').checked=true;
  document.getElementById('auto-azione-sposta').checked=false;
  document.getElementById('auto-sposta-fields').style.display='none';
  document.getElementById('modal-auto-title').textContent='Nuova automazione';
  const opts = (state.fasi||[]).map(f=>`<option value="${f.id}">${f.label}</option>`).join('');
  document.getElementById('auto-trigger-fase').innerHTML='<option value="">Seleziona fase...</option>'+opts;
  document.getElementById('auto-sposta-fase').innerHTML='<option value="">Seleziona fase...</option>'+opts;
  document.getElementById('auto-azione-sposta').onchange=function(){
    document.getElementById('auto-sposta-fields').style.display=this.checked?'block':'none';
  };
  openModal('modal-automazione');
}

function editAutomazione(id){
  const a = automazioni.find(x=>x.id===id); if(!a)return;
  document.getElementById('auto-id').value=a.id;
  document.getElementById('auto-nome').value=a.nome;
  document.getElementById('auto-trigger-giorni').value=a.trigger_giorni||7;
  document.getElementById('auto-email-oggetto').value=a.azione_email_oggetto||'';
  document.getElementById('auto-email-corpo-editor').innerHTML=a.azione_email_corpo||'';
  document.getElementById('auto-azione-email').checked=!!a.azione_email;
  document.getElementById('auto-azione-sposta').checked=!!a.azione_sposta;
  document.getElementById('auto-sposta-fields').style.display=a.azione_sposta?'block':'none';
  document.getElementById('modal-auto-title').textContent='Modifica automazione';
  const opts = (state.fasi||[]).map(f=>`<option value="${f.id}" ${f.id===a.trigger_fase_id?'selected':''}>${f.label}</option>`).join('');
  document.getElementById('auto-trigger-fase').innerHTML='<option value="">Seleziona fase...</option>'+opts;
  const opts2 = (state.fasi||[]).map(f=>`<option value="${f.id}" ${f.id===a.azione_sposta_fase_id?'selected':''}>${f.label}</option>`).join('');
  document.getElementById('auto-sposta-fase').innerHTML='<option value="">Seleziona fase...</option>'+opts2;
  document.getElementById('auto-azione-sposta').onchange=function(){
    document.getElementById('auto-sposta-fields').style.display=this.checked?'block':'none';
  };
  openModal('modal-automazione');
}

async function salvaAutomazione(){
  const id = document.getElementById('auto-id').value;
  const corpo = document.getElementById('auto-email-corpo-editor').innerHTML;
  const body = {
    nome: document.getElementById('auto-nome').value.trim(),
    trigger_tipo: 'giorni_in_fase',
    trigger_fase_id: document.getElementById('auto-trigger-fase').value,
    trigger_giorni: parseInt(document.getElementById('auto-trigger-giorni').value)||7,
    azione_email: document.getElementById('auto-azione-email').checked,
    azione_email_oggetto: document.getElementById('auto-email-oggetto').value,
    azione_email_corpo: corpo,
    azione_sposta: document.getElementById('auto-azione-sposta').checked,
    azione_sposta_fase_id: document.getElementById('auto-sposta-fase').value||null,
    attiva: true
  };
  if(!body.nome) return alert('Inserisci il nome dell\'automazione');
  if(!body.trigger_fase_id) return alert('Seleziona la fase trigger');
  try{
    if(id) await api.put('/api/automazioni/'+id, body);
    else await api.post('/api/automazioni', body);
    closeModal('modal-automazione');
    renderAutomazioni();
    showSave();
  }catch(e){ alert('Errore: '+e.message); }
}

async function toggleAutomazione(id){
  await api.put('/api/automazioni/'+id+'/toggle', {});
  renderAutomazioni();
}

async function eliminaAutomazione(id){
  conferma(async()=>{
    await api.del('/api/automazioni/'+id);
    renderAutomazioni();
    showSave();
  });
}

async function eseguiAutomazioniManuale(){
  const btn = event?.target?.closest('button');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Esecuzione...'; }
  try{
    const r = await api.post('/api/automazioni/esegui', {});
    const msg = r.risultati?.length ? `✅ ${r.risultati.length} azioni eseguite` : '✅ Nessuna azione da eseguire ora';
    alert(msg);
    renderAutomazioni();
    caricaLogAutomazioni();
  }catch(e){ alert('Errore: '+e.message); }
  finally{ if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-player-play"></i>Esegui ora'; } }
}

async function caricaLogAutomazioni(){
  try{
    const logs = await api.get('/api/automazioni/log');
    const cont = document.getElementById('automazioni-log');
    if(!cont) return;
    if(!logs.length){
      cont.innerHTML='<div class="empty-state" style="padding:12px 0"><p>Nessuna esecuzione registrata</p></div>';
      return;
    }
    cont.innerHTML=`<table><thead><tr><th>Data</th><th>Automazione</th><th>Lead</th><th>Esito</th></tr></thead><tbody>
      ${logs.map(l=>`<tr>
        <td style="font-size:12px;color:var(--text-2);white-space:nowrap">${new Date(l.created_at).toLocaleString('it-IT')}</td>
        <td style="font-size:13px;font-weight:500">${l.azione||''}</td>
        <td style="font-size:13px">${l.lead_nome||''}</td>
        <td style="font-size:12px">${l.esito||''}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }catch(e){}
}

async function generaCorpoAutoAI(){
  const nome = document.getElementById('auto-nome').value||'follow-up';
  const faseEl = document.getElementById('auto-trigger-fase');
  const faseLabel = faseEl.options[faseEl.selectedIndex]?.text||'';
  const giorni = document.getElementById('auto-trigger-giorni').value||7;
  const editor = document.getElementById('auto-email-corpo-editor');
  editor.innerHTML='<i>Generazione in corso...</i>';
  try{
    const r = await api.post('/api/gmail/genera',{
      tipo: nome,
      cliente: '{{nome}}',
      prodotto: 'semola rimacinata di grano duro',
      note: `Lead in fase "${faseLabel}" da ${giorni} giorni`
    });
    if(r.testo) editor.innerHTML = r.testo.replace(/\n/g,'<br>');
  }catch(e){ editor.innerHTML=''; alert('Errore generazione AI'); }
}

function conferma(callback){
  openModal('modal-conferma');
  const btn = document.getElementById('conferma-si-btn');
  const newBtn = btn.cloneNode(true); // rimuove vecchi listener
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', ()=>{
    closeModal('modal-conferma');
    callback();
  });
}

