// app-virtual-company.js — Chat engine condiviso e Virtual Company

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

const AGENTI = {
  steven: { nome: 'Steven', ruolo: 'Back Office · loop ogni ora', colore: 'var(--brand)', iniziale: 'S' },
  simona: { nome: 'Simona', ruolo: 'Digital Marketing', colore: '#e91e8c', iniziale: 'Si' },
  mirko:  { nome: 'Mirko',  ruolo: 'Commerciale', colore: '#1976d2', iniziale: 'M' },
};

function selezionaAgente(id){
  if (!AGENTI[id]) return;
  _agenteAttivo = id;
  const ag = AGENTI[id];

  // Aggiorna visual delle card
  Object.keys(AGENTI).forEach(k => {
    const card = document.getElementById('agente-card-'+k);
    if (!card) return;
    if (k === id) {
      card.style.borderColor = AGENTI[k].colore;
      card.style.background = 'var(--brand-light)';
    } else {
      card.style.borderColor = 'var(--border)';
      card.style.background = 'var(--surface)';
    }
  });

  // Aggiorna label sopra la chat
  const label = document.getElementById('chat-agente-label');
  if (label) {
    label.innerHTML = `
      <div style="width:22px;height:22px;border-radius:50%;background:${ag.colore};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff">${ag.iniziale}</div>
      <span>Stai parlando con <strong style="color:${ag.colore}">${ag.nome}</strong> — ${ag.ruolo}</span>
      <div style="margin-left:auto;width:7px;height:7px;border-radius:50%;background:var(--green)"></div>`;
  }

  // Carica quick actions specifiche
  setTimeout(() => {
    if (id === 'simona' && typeof simonaQuickActions === 'function') simonaQuickActions();
    else if (id === 'mirko' && typeof mirkoQuickActions === 'function') mirkoQuickActions();
    else {
      const qa = document.querySelector('.quick-actions');
      if (qa) qa.innerHTML = `
        <div class="quick-action" onclick="sendAIMessage('Steven, cosa hai fatto nelle ultime ore? Dimmi cosa hai trovato e cosa hai già sistemato.')"><div style="font-size:20px;margin-bottom:5px">🤖</div><div style="font-size:13px;font-weight:600;margin-bottom:2px">Cosa hai fatto?</div><div style="font-size:11px;color:var(--text-2)">Aggiornamento loop</div></div>
        <div class="quick-action" onclick="sendAIMessage('Steven, dimmi la cosa più urgente che devo fare adesso e perché.')"><div style="font-size:20px;margin-bottom:5px">🚨</div><div style="font-size:13px;font-weight:600;margin-bottom:2px">Cosa faccio ora</div><div style="font-size:11px;color:var(--text-2)">Priorità immediata</div></div>
        <div class="quick-action" onclick="sendAIMessage('Steven, analizza l\'andamento dell\'azienda. Stiamo crescendo?')"><div style="font-size:20px;margin-bottom:5px">📈</div><div style="font-size:13px;font-weight:600;margin-bottom:2px">Stiamo crescendo?</div><div style="font-size:11px;color:var(--text-2)">Analisi andamento</div></div>`;
    }
  }, 50);

  // Reset cronologia sessione per questo agente
  if (_conversazione[id]) _conversazione[id] = [];

  // Carica cronologia dal DB
  caricaCronologiaChat(id);
}

// Carica cronologia chat dal DB e la mostra
async function caricaCronologiaChat(agente) {
  const msgs = document.getElementById('chat-messages');
  const ag = AGENTI[agente] || AGENTI.steven;

  // Messaggio di benvenuto
  const benvenuto = `<div class="msg-ai">
    <div class="msg-avatar ai" style="background:${ag.colore}"><strong style="font-size:11px">${ag.iniziale}</strong></div>
    <div class="msg-bubble ai">Ciao Giovanni 👋 Sono <strong>${ag.nome}</strong>${
      agente === 'steven' ? ', il responsabile back office della tua Virtual Company.' :
      agente === 'simona' ? ', la tua responsabile Digital Marketing.' :
      ', il tuo responsabile commerciale.'
    }<br><br>Dimmi cosa ti serve.</div>
  </div>`;

  try {
    const r = await fetch(`/api/chat/cronologia/${agente}`);
    const dati = await r.json();

    if (!dati.length) {
      msgs.innerHTML = benvenuto;
      return;
    }

    // Mostra separatore cronologia
    let html = `<div style="text-align:center;padding:8px;font-size:11px;color:var(--text-3);border-bottom:1px solid var(--border);margin-bottom:8px">
      📅 Cronologia ultimi 10 giorni · <button onclick="cancellaCronologia('${agente}')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:11px">Cancella</button>
    </div>`;

    for (const m of dati) {
      const data = new Date(m.created_at).toLocaleDateString('it-IT', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
      if (m.ruolo === 'user') {
        html += `<div class="msg-user">
          <div class="msg-avatar user">GV</div>
          <div class="msg-bubble user">
            <div style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:3px">${data}</div>
            ${m.contenuto.replace(/\n/g,'<br>')}
          </div>
        </div>`;
      } else {
        html += `<div class="msg-ai">
          <div class="msg-avatar ai" style="background:${ag.colore}"><strong style="font-size:11px">${ag.iniziale}</strong></div>
          <div class="msg-bubble ai">
            <div style="font-size:10px;color:var(--text-3);margin-bottom:3px">${data}</div>
            ${m.contenuto.replace(/\n/g,'<br>')}
          </div>
        </div>`;
      }
    }

    msgs.innerHTML = html;
    msgs.scrollTop = msgs.scrollHeight;
  } catch(e) {
    msgs.innerHTML = benvenuto;
  }
}

// Cancella cronologia di un agente
async function cancellaCronologia(agente) {
  if (!confirm(`Cancellare tutta la cronologia con ${AGENTI[agente]?.nome || agente}?`)) return;
  await fetch(`/api/chat/cronologia/${agente}`, { method: 'DELETE' });
  caricaCronologiaChat(agente);
  mostraToast('Cronologia cancellata');
}

function clearChat(){
  // Ricarica cronologia (non cancella — usa cancellaCronologia per quello)
  caricaCronologiaChat(_agenteAttivo);
}


function _makeAgenteAvatar(){
  const ag = AGENTI[_agenteAttivo] || AGENTI.steven;
  return `<div class="msg-avatar ai" style="background:${ag.colore}"><strong style="font-size:11px">${ag.iniziale}</strong></div>`;
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

function getCtx(){
  const cl=state.clienti.map(c=>`- ${c.nome} (${c.citta||'N/D'}) | ${c.prod||'N/D'}`).join('\n');
  const or=state.ordini.map(o=>`- ${o.cliente} | ${o.prodotto} | ${o.qty}kg | €${o.importo} | ${o.data} | ${o.stato}`).join('\n');
  const totE=state.movimenti.filter(m=>m.tipo==='entrata').reduce((s,m)=>s+m.importo,0);
  const totU=state.movimenti.filter(m=>m.tipo==='uscita').reduce((s,m)=>s+m.importo,0);
  return `Sei l'assistente AI del Mulino Vitaliti Antonio, fondato 1930, vende semola rimacinata di grano duro e farine in tutta Italia.\nCLIENTI (${state.clienti.length}):\n${cl}\nORDINI (${state.ordini.length}):\n${or}\nCONTABILITÀ: Entrate €${totE.toFixed(2)} | Uscite €${totU.toFixed(2)} | Saldo €${(totE-totU).toFixed(2)}\nRispondi in italiano, conciso e pratico.`;
}
// ── UPLOAD FILE A STEVEN ──────────────────────────────────────────────────
async function stevenCaricaFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  input.value = ''; // reset input

  const msgs = document.getElementById('chat-messages');

  // Mostra messaggio utente con nome file
  const uDiv = document.createElement('div'); uDiv.className = 'msg-user';
  uDiv.innerHTML = `<div class="msg-avatar user">${ini(currentUser?.nome||'G')}</div>
    <div class="msg-bubble user" style="display:flex;align-items:center;gap:8px">
      <i class="ti ti-paperclip"></i>
      <span>${file.name} (${Math.round(file.size/1024)}KB)</span>
    </div>`;
  msgs.appendChild(uDiv);

  // Mostra loading
  const lDiv = document.createElement('div'); lDiv.className = 'msg-ai'; lDiv.id = 'ai-load';
  lDiv.innerHTML = `${_makeAgenteAvatar()}
    <div class="msg-bubble ai" style="color:var(--text-3)">⟳ Analizzo ${file.name}...</div>`;
  msgs.appendChild(lDiv);
  msgs.scrollTop = msgs.scrollHeight;
  document.getElementById('send-btn').disabled = true;

  try {
    // Leggi file come base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const messaggio = document.getElementById('chat-input').value.trim() || '';
    document.getElementById('chat-input').value = '';

    const r = await fetch('/api/steven/analizza-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: file.name, base64, messaggio })
    });
    const data = await r.json();

    document.getElementById('ai-load')?.remove();

    const reply = data.reply || data.errore || 'Non riesco ad analizzare il file.';
    const aDiv = document.createElement('div'); aDiv.className = 'msg-ai';
    aDiv.innerHTML = `${_makeAgenteAvatar()}
      <div class="msg-bubble ai">${reply.replace(/\n/g,'<br>')}</div>`;
    msgs.appendChild(aDiv);

    // Mostra risultati DB se ci sono stati
    if (data.dbRisultati?.length) {
      const dbDiv = document.createElement('div'); dbDiv.className = 'msg-ai';
      dbDiv.innerHTML = `<div class="msg-avatar ai" style="opacity:0"></div>
        <div style="font-size:11px;color:var(--text-3);padding:4px 8px;background:var(--surface-2);border-radius:6px">
          ${data.dbRisultati.map(r => `✅ ${r.op}: ${r.risultato?.dati ? JSON.stringify(r.risultato.dati).slice(0,100) : r.errore||'ok'}`).join('<br>')}
        </div>`;
      msgs.appendChild(dbDiv);
    }

    msgs.scrollTop = msgs.scrollHeight;
  } catch(e) {
    document.getElementById('ai-load')?.remove();
    const eDiv = document.createElement('div'); eDiv.className = 'msg-ai';
    eDiv.innerHTML = `${_makeAgenteAvatar()}
      <div class="msg-bubble ai" style="color:var(--red)">Errore: ${e.message}</div>`;
    msgs.appendChild(eDiv);
  } finally {
    document.getElementById('send-btn').disabled = false;
  }
}

function sendAIMessage(t){document.getElementById('chat-input').value=t;sendChat();}
function clearChat(){document.getElementById('chat-messages').innerHTML='<div class="msg-ai"><div class="msg-avatar ai"><strong style="font-size:13px">S</strong></div><div class="msg-bubble ai">Chat pulita. Dimmi cosa ti serve, Giovanni.</div></div>';}
// Cronologia conversazione in memoria per sessione (max 20 messaggi per agente)
const _conversazione = { steven: [], simona: [], mirko: [] };

function _aggiungiAllaConversazione(agente, ruolo, contenuto) {
  if (!_conversazione[agente]) _conversazione[agente] = [];
  _conversazione[agente].push({ role: ruolo, content: contenuto });
  if (_conversazione[agente].length > 20) {
    _conversazione[agente] = _conversazione[agente].slice(-20);
  }
}

function sendChat(){
  const input=document.getElementById('chat-input'), text=input.value.trim(); if(!text)return;
  input.value=''; input.style.height='38px';
  const msgs=document.getElementById('chat-messages');
  const uDiv=document.createElement('div'); uDiv.className='msg-user';
  uDiv.innerHTML=`<div class="msg-avatar user">${ini(currentUser.nome)}</div><div class="msg-bubble user">${text}</div>`;
  msgs.appendChild(uDiv);
  const lDiv=document.createElement('div'); lDiv.className='msg-ai'; lDiv.id='ai-load';
  lDiv.innerHTML=`${_makeAgenteAvatar()}<div class="msg-bubble ai" style="color:var(--text-3)">⟳ Elaborazione...</div>`;
  msgs.appendChild(lDiv); msgs.scrollTop=msgs.scrollHeight;
  document.getElementById('send-btn').disabled=true;
  // Aggiungi messaggio utente alla cronologia sessione
  _aggiungiAllaConversazione(_agenteAttivo, 'user', text);

  fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages: _conversazione[_agenteAttivo] || [{role:'user',content:text}], agente: _agenteAttivo})})
    .then(r=>r.json()).then(data=>{
      document.getElementById('ai-load').remove();
      const reply=data.reply||data.error||'Errore.';
      // Salva risposta nella cronologia sessione
      _aggiungiAllaConversazione(_agenteAttivo, 'assistant', reply);
      const aDiv=document.createElement('div'); aDiv.className='msg-ai';
      aDiv.innerHTML=`${_makeAgenteAvatar()}<div class="msg-bubble ai">${reply.replace(/\n/g,'<br>')}</div>`;
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

      // Salva in cronologia DB
      fetch(`/api/chat/cronologia/${_agenteAttivo}`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ messaggi: [
          { ruolo: 'user', contenuto: text },
          { ruolo: 'assistant', contenuto: reply }
        ]})
      }).catch(()=>{});

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

