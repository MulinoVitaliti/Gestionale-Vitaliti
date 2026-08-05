// app-modules.js — Modules: pipeline, clienti, ordini, contabilità, email, FIC, automazioni
// Generato automaticamente — NON modificare manualmente

// ── PIPELINE ──────────────────────────────────────────────────────────────
function populateFasiSelects(){
  ['lead-stato','edit-lead-stato'].forEach(selId=>{
    const sel=document.getElementById(selId); if(!sel)return;
    const cur=sel.value; sel.innerHTML='';
    state.fasi.forEach(f=>{const o=document.createElement('option');o.value=f.id;o.textContent=f.label;sel.appendChild(o);});
    if(cur)sel.value=cur;
  });
}
// ── PIPELINE MULTIPLE (stile Pipedrive: dropdown + fasi inline) ──────────
let currentPipelineId = 'default';
let _pipelinePageInizializzata = false;

async function initPipelinePage(){
  if(!_pipelinePageInizializzata){
    await loadPipelines();
    _pipelinePageInizializzata = true;
  }
  renderPipelineDropdownButton();
  await loadFasiPerPipeline(currentPipelineId);
  await loadLeadPipelineStato(currentPipelineId);
  renderPipeline();
}

async function loadPipelines(){
  try{
    const r = await api.get('/api/pipelines');
    state.pipelines = (r && !r.error && r.length) ? r : [{id:'default', nome:'Pipeline principale', colore:'#A8412A', ordine:0}];
  }catch(e){
    state.pipelines = [{id:'default', nome:'Pipeline principale', colore:'#A8412A', ordine:0}];
  }
}

async function loadFasiPerPipeline(pipelineId){
  try{
    const fasi = await api.get('/api/fasi?pipeline_id='+encodeURIComponent(pipelineId));
    state.fasi = (fasi && !fasi.error) ? fasi : [];
  }catch(e){ state.fasi = []; }
}

async function loadLeadPipelineStato(pipelineId){
  if(pipelineId === 'default'){ state.leadPipelineStato = []; return; }
  try{
    const stati = await api.get('/api/lead-pipeline-stato?pipeline_id='+encodeURIComponent(pipelineId));
    state.leadPipelineStato = (stati && !stati.error) ? stati : [];
  }catch(e){ state.leadPipelineStato = []; }
}

function statoLeadInPipeline(lead, pipelineId){
  if(pipelineId === 'default') return lead.stato;
  const assoc = (state.leadPipelineStato||[]).find(s=>s.lead_id===lead.id);
  return assoc ? assoc.stato : null;
}

function pipelineCorrente(){
  return (state.pipelines||[]).find(p=>p.id===currentPipelineId) || {id:'default', nome:'Pipeline principale', colore:'#A8412A'};
}

function renderPipelineDropdownButton(){
  const p = pipelineCorrente();
  const dot = document.getElementById('pl-dropdown-dot');
  const label = document.getElementById('pl-dropdown-label');
  if(dot) dot.style.background = p.colore || '#A8412A';
  if(label) label.textContent = p.nome;
}

function togglePipelineDropdown(){
  const menu = document.getElementById('pl-dropdown-menu');
  if(!menu) return;
  if(menu.style.display === 'block'){ menu.style.display = 'none'; return; }
  renderPipelineDropdownMenu();
  menu.style.display = 'block';
  // Chiudi cliccando fuori
  setTimeout(()=>{
    document.addEventListener('click', chiudiDropdownPipelineFuori, {once:true});
  }, 0);
}

function chiudiDropdownPipelineFuori(e){
  const wrap = document.getElementById('pl-dropdown-wrap');
  if(wrap && !wrap.contains(e.target)){
    document.getElementById('pl-dropdown-menu').style.display = 'none';
  } else {
    document.addEventListener('click', chiudiDropdownPipelineFuori, {once:true});
  }
}

function renderPipelineDropdownMenu(){
  const menu = document.getElementById('pl-dropdown-menu');
  if(!menu) return;
  const items = (state.pipelines||[]).map(p=>`
    <div style="display:flex;align-items:center;gap:9px;padding:10px 14px;font-size:14px;cursor:pointer;${p.id===currentPipelineId?'background:var(--surface-2)':''}" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='${p.id===currentPipelineId?'var(--surface-2)':'transparent'}'">
      <span onclick="selezionaPipelineDaDropdown('${p.id}')" style="display:flex;align-items:center;gap:9px;flex:1;min-width:0">
        <span style="width:9px;height:9px;border-radius:50%;background:${p.colore};flex-shrink:0"></span>
        <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.nome}</span>
        ${p.id===currentPipelineId?'<i class="ti ti-check" style="font-size:14px;color:var(--brand);flex-shrink:0"></i>':''}
      </span>
      <i class="ti ti-pencil" style="font-size:14px;color:var(--text-3);flex-shrink:0;cursor:pointer" onclick="event.stopPropagation();apriRinominaPipeline('${p.id}')" title="Rinomina pipeline"></i>
      ${p.id!=='default'?`<i class="ti ti-trash" style="font-size:14px;color:var(--text-3);flex-shrink:0;cursor:pointer" onclick="event.stopPropagation();eliminaPipelineConCheck('${p.id}','${p.nome.replace(/'/g,"\\'")}')" title="Elimina pipeline"></i>`:''}
    </div>`).join('');
  menu.innerHTML = items + `
    <div onclick="apriCreazioneNuovaPipeline()" style="border-top:1px solid var(--border);padding:10px 14px;font-size:14px;color:var(--brand);cursor:pointer;display:flex;align-items:center;gap:7px" onmouseover="this.style.background='var(--brand-light)'" onmouseout="this.style.background='transparent'">
      <i class="ti ti-plus" style="font-size:15px"></i>Nuova pipeline
    </div>`;
}

async function apriRinominaPipeline(pipelineId){
  const p = (state.pipelines||[]).find(x=>x.id===pipelineId);
  if(!p) return;
  const nuovoNome = prompt('Rinomina pipeline:', p.nome);
  if(nuovoNome === null) return; // annullato
  const nomeTrim = nuovoNome.trim();
  if(!nomeTrim || nomeTrim === p.nome) return;
  try{
    await api.put('/api/pipelines/'+pipelineId, {nome:nomeTrim, colore:p.colore});
    p.nome = nomeTrim;
    renderPipelineDropdownMenu();
    renderPipelineDropdownButton();
    showSave();
  }catch(e){ alert('Errore di rete: '+e.message); }
}

async function eliminaPipelineConCheck(pipelineId, nomePipeline){
  if(pipelineId === 'default'){
    alert('Non puoi eliminare la pipeline principale.');
    return;
  }
  document.getElementById('pl-dropdown-menu').style.display = 'none';
  conferma(async()=>{
    try{
      const r = await api.del('/api/pipelines/'+pipelineId);
      if(r && r.error){ alert('Errore: '+r.error); return; }
      state.pipelines = (state.pipelines||[]).filter(p=>p.id!==pipelineId);
      // Se stavamo guardando proprio la pipeline eliminata, torna alla principale
      if(currentPipelineId === pipelineId){
        currentPipelineId = 'default';
        renderPipelineDropdownButton();
        await loadFasiPerPipeline('default');
        await loadLeadPipelineStato('default');
        renderPipeline();
      }
      showSave();
    }catch(e){ alert('Errore di rete: '+e.message); }
  });
}

async function selezionaPipelineDaDropdown(pipelineId){
  document.getElementById('pl-dropdown-menu').style.display = 'none';
  if(pipelineId === currentPipelineId) return;
  currentPipelineId = pipelineId;
  renderPipelineDropdownButton();
  await loadFasiPerPipeline(pipelineId);
  await loadLeadPipelineStato(pipelineId);
  renderPipeline();
}

function apriCreazioneNuovaPipeline(){
  document.getElementById('pl-dropdown-menu').style.display = 'none';
  const nome = prompt('Nome della nuova pipeline:');
  if(!nome || !nome.trim()) return;
  creaNuovaPipeline(nome.trim());
}

async function creaNuovaPipeline(nome){
  const colori = ['#A8412A','#1D9E75','#378ADD','#BA7517','#534AB7','#D4537E'];
  const colore = colori[(state.pipelines||[]).length % colori.length];
  const id = 'pl_'+Date.now();
  try{
    const nuova = await api.post('/api/pipelines', {id, nome, colore, ordine:(state.pipelines||[]).length});
    if(!nuova || nuova.error){ alert('Errore: '+(nuova?.error||'impossibile creare la pipeline')); return; }
    state.pipelines.push(nuova);
    // Crea 3 fasi di base così la pipeline è subito utilizzabile
    const fasiBase = [
      {nome:'Nuovo contatto', colore},
      {nome:'In trattativa', colore:'#BA7517'},
      {nome:'Cliente acquisito', colore:'#1D9E75'}
    ];
    let ordine = 0;
    for(const fb of fasiBase){
      const faseId = id+'_fase'+(ordine+1);
      await api.post('/api/fasi', {id:faseId, label:fb.nome, color:fb.colore, ordine, pipeline_id:id});
      ordine++;
    }
    currentPipelineId = id;
    renderPipelineDropdownButton();
    await loadFasiPerPipeline(id);
    await loadLeadPipelineStato(id);
    renderPipeline();
    showSave();
  }catch(e){ alert('Errore di rete: '+e.message); }
}

// ── RENDER BOARD CON FASI INLINE ─────────────────────────────────────────
function renderPipeline(){
  const board=document.getElementById('pipeline-board'); if(!board) return;
  board.innerHTML='';
  state.fasi.forEach(fase=>{
    const items=state.leads.filter(l=>statoLeadInPipeline(l, currentPipelineId)===fase.id);
    const col=document.createElement('div'); col.className='pl-col';
    col.dataset.faseId = fase.id;
    col.ondragover = (e)=>{ e.preventDefault(); col.classList.add('pl-col-dragover'); };
    col.ondragleave = ()=>{ col.classList.remove('pl-col-dragover'); };
    col.ondrop = (e)=> dropLeadInFase(e, fase.id, col);

    const header = document.createElement('div');
    header.className = 'pl-col-header';
    header.style.borderBottomColor = fase.color;
    header.innerHTML = `
      <span class="pl-col-title" id="fase-title-${fase.id}" style="color:${fase.color};cursor:pointer" title="Doppio click per rinominare" ondblclick="iniziaRinominaFaseInline('${fase.id}')">
        ${fase.label}
      </span>
      <div style="display:flex;align-items:center;gap:4px">
        <button onclick="iniziaRinominaFaseInline('${fase.id}')" title="Rinomina fase" style="background:none;border:none;cursor:pointer;padding:2px 4px;opacity:0.5;transition:opacity .15s" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'">
          <i class="ti ti-pencil" style="font-size:13px;color:${fase.color}"></i>
        </button>
        <span class="pl-col-count">${items.length}</span>
      </div>`;
    col.appendChild(header);

    if(!items.length){
      const e=document.createElement('div');e.className='empty-state';e.style.padding='16px 0';e.innerHTML='<i class="ti ti-inbox" style="font-size:22px"></i><p>Nessun contatto</p>';
      col.appendChild(e);
    }
    items.forEach(l=>{
      const c=document.createElement('div'); c.className='pl-card';
      c.draggable = true;
      c.dataset.leadId = l.id;
      c.ondragstart = (e)=>{ e.dataTransfer.setData('text/plain', l.id); c.classList.add('pl-card-dragging'); };
      c.ondragend = ()=>{ c.classList.remove('pl-card-dragging'); };
      c.ondblclick = (e)=>{ e.stopPropagation(); apriDettaglioLead(l.id); };
      c.style.borderLeftColor=fase.color;
      const tagLabels = {cliente:'Cliente', potenziale:'Potenziale', non_interessato:'Non interessato'};
      const tagDotColors = {cliente:'var(--green)', potenziale:'var(--orange)', non_interessato:'var(--red)'};
      const tagHtml = l.tag && tagLabels[l.tag] ? `<div class="tag-badge tag-${l.tag}"><span class="status-dot" style="background:${tagDotColors[l.tag]};margin-right:4px"></span>${tagLabels[l.tag]}</div>` : '';
      // Conta attività pendenti per questo lead
      const nAtt = (state.attivita||[]).filter(a=>!a.completata&&(a.lead_id===l.id||a.collegata_id===l.id)).length;
      const attBadge = nAtt>0 ? `<span style="background:var(--brand);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;margin-left:6px">${nAtt}</span>` : '';
      c.innerHTML=`
        ${tagHtml}
        <div class="pl-card-name">${l.nome}${attBadge}</div>
        <div class="pl-card-sub">${[l.citta,l.prodotto].filter(Boolean).join(' · ')}</div>
        <div class="pl-card-footer">
          <span style="font-size:12px;color:var(--text-3)"><i class="ti ti-phone" style="font-size:11px"></i> ${l.contatto||'—'}</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm" style="padding:4px 9px;font-size:12px" onclick="event.stopPropagation();apriDettaglioLead(${l.id})" title="Vedi dettaglio"><i class="ti ti-eye"></i></button>
            <button class="btn btn-sm btn-danger" style="padding:4px 9px;font-size:12px" onclick="event.stopPropagation();eliminaLead(${l.id})" title="Elimina"><i class="ti ti-trash"></i></button>
            <button class="btn btn-sm" style="padding:4px 9px;font-size:12px" onclick="event.stopPropagation();editLead(${l.id})" title="Modifica"><i class="ti ti-pencil"></i></button>
          </div>
        </div>`;
      col.appendChild(c);
    });
    board.appendChild(col);
  });

  // Colonna "Nuova fase" — inserimento inline, niente popup
  const addCol = document.createElement('div');
  addCol.style.cssText = 'min-width:190px;flex-shrink:0;display:flex;align-items:flex-start';
  addCol.id = 'pl-add-stage-col';
  addCol.innerHTML = `<button class="add-col-btn" id="pl-add-stage-btn" onclick="mostraInputNuovaFase()" style="width:100%"><i class="ti ti-plus"></i> Nuova fase</button>`;
  board.appendChild(addCol);
}

function mostraInputNuovaFase(){
  const col = document.getElementById('pl-add-stage-col');
  if(!col) return;
  col.innerHTML = `
    <div style="width:100%">
      <input type="text" id="pl-nuova-fase-input" placeholder="Nome fase..." style="width:100%;padding:9px 11px;border:1px solid var(--brand);border-radius:var(--r);font-size:13px;font-family:var(--font);margin-bottom:6px" onkeydown="if(event.key==='Enter'){confermaNuovaFaseInline()}if(event.key==='Escape'){renderPipeline()}">
      <div style="display:flex;gap:6px">
        <button class="btn btn-primary btn-sm" onclick="confermaNuovaFaseInline()" style="flex:1"><i class="ti ti-check"></i></button>
        <button class="btn btn-sm" onclick="renderPipeline()" style="flex:1"><i class="ti ti-x"></i></button>
      </div>
    </div>`;
  const input = document.getElementById('pl-nuova-fase-input');
  if(input) input.focus();
}

async function confermaNuovaFaseInline(){
  const input = document.getElementById('pl-nuova-fase-input');
  const nome = input ? input.value.trim() : '';
  if(!nome) return;
  const colors=['#A8412A','#1D9E75','#378ADD','#BA7517','#534AB7','#D4537E'];
  const id = currentPipelineId+'_fase_'+Date.now();
  try{
    const data = await api.post('/api/fasi',{id,label:nome,color:colors[state.fasi.length%colors.length],ordine:state.fasi.length,pipeline_id:currentPipelineId});
    if(data && !data.error){
      state.fasi.push(data);
      renderPipeline();
      showSave();
    } else {
      alert('Errore: '+(data?.error||'impossibile creare la fase'));
      renderPipeline();
    }
  }catch(e){
    alert('Errore di rete: '+e.message);
    renderPipeline();
  }
}

// ── DRAG & DROP ───────────────────────────────────────────────────────────
async function dropLeadInFase(e, faseId, col){
  e.preventDefault();
  col.classList.remove('pl-col-dragover');
  const leadId = parseInt(e.dataTransfer.getData('text/plain'));
  if(!leadId) return;
  const lead = state.leads.find(l=>l.id===leadId);
  if(!lead) return;
  const statoAttuale = statoLeadInPipeline(lead, currentPipelineId);
  if(statoAttuale===faseId) return;

  if(currentPipelineId === 'default'){
    lead.stato = faseId;
    renderPipeline();
    try{
      await api.put('/api/leads/'+leadId, {
        nome:lead.nome, contatto:lead.contatto, tel:lead.tel, citta:lead.citta,
        prodotto:lead.prodotto, stato:faseId, note:lead.note, tag:lead.tag||null
      });
      showSave();
    }catch(err){ console.error('Errore spostamento lead:', err); }
  } else {
    let assoc = (state.leadPipelineStato||[]).find(s=>s.lead_id===leadId);
    if(assoc) assoc.stato = faseId;
    else { assoc = {lead_id:leadId, pipeline_id:currentPipelineId, stato:faseId}; state.leadPipelineStato.push(assoc); }
    renderPipeline();
    try{
      await api.put('/api/lead-pipeline-stato', {lead_id:leadId, pipeline_id:currentPipelineId, stato:faseId});
      showSave();
    }catch(err){ console.error('Errore spostamento lead in pipeline custom:', err); }
  }
}

// ── RINOMINA FASE INLINE ───────────────────────────────────────────────────
function iniziaRinominaFaseInline(faseId){
  const fase = state.fasi.find(f=>f.id===faseId); if(!fase) return;
  const titleEl = document.getElementById('fase-title-'+faseId); if(!titleEl) return;
  const colore = fase.color || 'var(--brand)';

  // Sostituisce il testo con un input
  const input = document.createElement('input');
  input.type = 'text';
  input.value = fase.label;
  input.style.cssText = `color:${colore};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border:none;border-bottom:2px solid ${colore};outline:none;background:transparent;width:120px;font-family:var(--font)`;
  titleEl.innerHTML = '';
  titleEl.appendChild(input);
  input.focus();
  input.select();

  const confermaRinomina = async()=>{
    const nuovoNome = input.value.trim();
    if(!nuovoNome){ titleEl.textContent = fase.label; return; }
    if(nuovoNome !== fase.label) await rinominaFase(faseId, nuovoNome);
    else titleEl.textContent = fase.label;
  };

  input.onblur = confermaRinomina;
  input.onkeydown = (e)=>{
    if(e.key==='Enter'){ e.preventDefault(); input.blur(); }
    if(e.key==='Escape'){ input.onblur=null; titleEl.textContent=fase.label; }
  };
}

async function rinominaFase(id,nome){
  await api.put('/api/fasi/'+id,{label:nome,color:(state.fasi.find(x=>x.id===id)||{}).color});
  const f=state.fasi.find(x=>x.id===id); if(f)f.label=nome;
  renderPipeline();
  showSave();
}

async function eliminaFaseConCheck(id){
  if(state.leads.some(l=>statoLeadInPipeline(l, currentPipelineId)===id)){
    alert('Sposta prima i contatti da questa fase prima di eliminarla.');
    return;
  }
  conferma(async()=>{
    await api.del('/api/fasi/'+id);
    state.fasi=state.fasi.filter(f=>f.id!==id);
    renderPipeline();
    showSave();
  });
}

// ── ASSICURAZIONI ─────────────────────────────────────────────────────────
let assFilter = 'tutte';

function switchSpedizioniTab(tab, el){
  document.querySelectorAll('#sped-tabs .pill').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('sped-vista-spedizioni').style.display = tab==='spedizioni' ? 'block' : 'none';
  document.getElementById('sped-vista-assicurazioni').style.display = tab==='assicurazioni' ? 'block' : 'none';
  if(tab==='assicurazioni') setTimeout(()=>renderAssicurazioni(), 50);
}

function calcolaRimborsoMax(){
  const imp = parseFloat(document.getElementById('ass-importo')?.value)||0;
  const max = (imp * 0.8).toFixed(2);
  const el = document.getElementById('ass-rimborso-max');
  if(el) el.textContent = '€ '+parseFloat(max).toLocaleString('it-IT',{minimumFractionDigits:2});
}

async function renderAssicurazioni(){
  const r = await api.get('/api/assicurazioni');
  console.log('[ASS] Risposta API:', r);
  state.assicurazioni = r.error ? [] : r;
  console.log('[ASS] Pratiche:', state.assicurazioni.length);
  console.log('[ASS] ass-list elemento:', document.getElementById('ass-list'));
  renderAssicurazioniList();
}

function renderAssicurazioniList(){
  const lista = (state.assicurazioni||[]);
  const aperte = lista.filter(a=>a.stato!=='chiusa').length;
  const badge = document.getElementById('ass-badge');
  if(badge){ badge.textContent=aperte; badge.style.display=aperte?'':'none'; }

  // Stats
  const statsEl = document.getElementById('ass-stats');
  if(statsEl){
    const totImporto = lista.reduce((s,a)=>s+(parseFloat(a.importo)||0),0);
    const totRimborsoMax = lista.reduce((s,a)=>s+(parseFloat(a.rimborso_max)||0),0);
    const totRimborsato = lista.reduce((s,a)=>s+(parseFloat(a.importo_rimborsato)||0),0);
    const scadenzaAlert = lista.filter(a=>{
      if(a.stato!=='aperta'||!a.data_danno) return false;
      const scad = new Date(a.data_danno); scad.setDate(scad.getDate()+60);
      const diff = Math.ceil((scad-new Date())/(1000*60*60*24));
      return diff<=10 && diff>=0;
    }).length;
    statsEl.innerHTML = [
      {label:'Pratiche aperte', val:lista.filter(a=>a.stato==='aperta').length, color:'var(--orange)', icon:'ti-shield'},
      {label:'Valore danni', val:'€'+totImporto.toLocaleString('it-IT',{minimumFractionDigits:2}), color:'var(--red)', icon:'ti-alert-triangle'},
      {label:'Rimborso atteso', val:'€'+totRimborsoMax.toLocaleString('it-IT',{minimumFractionDigits:2}), color:'var(--blue)', icon:'ti-coin'},
      {label:'Scadenza imminente', val:scadenzaAlert+' pratiche', color:scadenzaAlert>0?'var(--red)':'var(--green)', icon:'ti-clock'},
    ].map(s=>`
      <div class="card" style="margin:0;padding:14px 16px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:${s.color}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="ti ${s.icon}" style="color:${s.color};font-size:18px"></i>
          </div>
          <div>
            <div style="font-size:16px;font-weight:700">${s.val}</div>
            <div style="font-size:11px;color:var(--text-2)">${s.label}</div>
          </div>
        </div>
      </div>`).join('');
  }

  // Lista con filtro stato + anno
  const listEl = document.getElementById('ass-list'); if(!listEl) return;
  const annoFilter = document.getElementById('ass-anno-filter')?.value || '2026';
  let items = assFilter==='tutte' ? lista : lista.filter(a=>a.stato===assFilter);
  if(annoFilter) items = items.filter(a=>{
    const data = a.data_danno || a.created_at || '';
    return data.startsWith(annoFilter);
  });

  if(!items.length){
    listEl.innerHTML='<div class="empty-state"><i class="ti ti-shield-check" style="font-size:34px;opacity:0.3;display:block;margin-bottom:8px"></i><p>Nessuna pratica trovata</p></div>';
    return;
  }

  const statiCfg = {
    aperta:{label:'Aperta',color:'var(--orange)',bg:'#fff7ed'},
    documenti_inviati:{label:'Documenti inviati',color:'var(--blue)',bg:'#eff6ff'},
    in_attesa_rimborso:{label:'In attesa rimborso',color:'var(--gold)',bg:'#fefce8'},
    chiusa:{label:'Chiusa',color:'var(--green)',bg:'#f0fdf4'}
  };
  const docLabels = ['Fattura di vendita','Nota credito / DDT reintegro','DDT spedizione','Nota addebito (art.2) + nota credito franchigia 20%','Mandato assicurativo 2026'];

  listEl.innerHTML = items.map(a=>{
    const cfg = statiCfg[a.stato]||statiCfg.aperta;
    const docsCompletati = [a.doc_1,a.doc_2,a.doc_3,a.doc_4,a.doc_5].filter(Boolean).length;
    const scadenza = a.data_danno ? new Date(a.data_danno) : null;
    if(scadenza) scadenza.setDate(scadenza.getDate()+60);
    const giorniRimasti = scadenza ? Math.ceil((scadenza-new Date())/(1000*60*60*24)) : null;
    const scadStr = scadenza ? scadenza.toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'}) : '—';
    const scadAlert = giorniRimasti!==null && giorniRimasti<=10 && giorniRimasti>=0 && a.stato==='aperta';
    const scadScaduta = giorniRimasti!==null && giorniRimasti<0 && a.stato==='aperta';

    return `
    <div class="card" style="margin-bottom:12px;border-left:4px solid ${cfg.color}">
      <div class="card-body" style="padding:14px 16px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
              <span style="font-weight:700;font-size:15px">${a.cliente}</span>
              <span style="font-size:11px;font-weight:700;color:${cfg.color};background:${cfg.bg};padding:2px 10px;border-radius:99px">${cfg.label}</span>
              ${a.ddt?`<span style="font-size:12px;color:var(--text-2)">DDT: <strong>${a.ddt}</strong></span>`:''}
            </div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--text-2)">
              ${a.data_danno?`<span><i class="ti ti-calendar" style="font-size:11px"></i> Email danno: ${new Date(a.data_danno).toLocaleDateString('it-IT')}</span>`:''}
              <span style="color:${scadScaduta?'var(--red)':scadAlert?'var(--orange)':'var(--text-2)'};font-weight:${scadAlert||scadScaduta?'700':'400'}">
                <i class="ti ti-clock" style="font-size:11px"></i> 
                Scadenza 60gg: ${scadStr}
                ${scadScaduta?' ⚠ SCADUTA':scadAlert?` · ${giorniRimasti}gg rimasti`:''}
              </span>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:11px;color:var(--text-3)">Valore danno</div>
            <div style="font-size:18px;font-weight:700;color:var(--red)">€${parseFloat(a.importo||0).toLocaleString('it-IT',{minimumFractionDigits:2})}</div>
            <div style="font-size:11px;color:var(--text-3)">Max rimborso (80%)</div>
            <div style="font-size:14px;font-weight:700;color:var(--brand)">€${parseFloat(a.rimborso_max||0).toLocaleString('it-IT',{minimumFractionDigits:2})}</div>
            ${a.importo_rimborsato>0?`<div style="font-size:11px;color:var(--green);font-weight:600;margin-top:2px">✓ Rimborsato: €${parseFloat(a.importo_rimborsato).toLocaleString('it-IT',{minimumFractionDigits:2})}</div>`:''}
          </div>
        </div>

        <!-- Checklist documenti -->
        <div style="background:var(--surface-2);border-radius:var(--r);padding:10px 12px;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:8px">
            Documenti (${docsCompletati}/5)
            <div style="display:inline-block;margin-left:8px;height:6px;width:80px;background:var(--border);border-radius:99px;vertical-align:middle">
              <div style="height:100%;width:${docsCompletati/5*100}%;background:${docsCompletati===5?'var(--green)':'var(--brand)'};border-radius:99px"></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
            ${[a.doc_1,a.doc_2,a.doc_3,a.doc_4,a.doc_5].map((v,i)=>`
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:${v?'var(--green)':'var(--text-3)'}">
                <i class="ti ${v?'ti-circle-check':'ti-circle'}" style="font-size:14px"></i>
                ${docLabels[i]}
              </div>`).join('')}
          </div>
        </div>

        ${a.note?`<div style="font-size:12px;color:var(--text-2);margin-bottom:10px;font-style:italic">${a.note}</div>`:''}
        ${a.modalita_rimborso?`<div style="font-size:12px;color:var(--text-2);margin-bottom:10px">Modalità rimborso: <strong>${a.modalita_rimborso==='bonifico'?'Bonifico totale':'Detrazione fattura corriere'}</strong></div>`:''}

        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-sm" onclick="editAssicurazione(${a.id})"><i class="ti ti-pencil"></i>Modifica</button>
          <button class="btn btn-sm btn-danger" onclick="eliminaAssicurazione(${a.id})"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterAssicurazioni(f, el){
  assFilter = f;
  document.querySelectorAll('#ass-pills .pill').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  renderAssicurazioniList();
}

function openModal_assicurazione_reset(){
  document.getElementById('ass-edit-id').value='';
  document.getElementById('ass-cliente').value='';
  document.getElementById('ass-ddt').value='';
  document.getElementById('ass-data-danno').value=new Date().toISOString().slice(0,10);
  document.getElementById('ass-importo').value='';
  document.getElementById('ass-rimborso-max').textContent='€ 0,00';
  document.getElementById('ass-note').value='';
  document.getElementById('ass-stato').value='aperta';
  document.getElementById('ass-rimborsato').value='';
  document.getElementById('ass-modalita').value='';
  [1,2,3,4,5].forEach(i=>{ document.getElementById('ass-doc-'+i).checked=false; });
  document.getElementById('modal-ass-title').innerHTML='<i class="ti ti-shield-check" style="color:var(--brand);margin-right:6px"></i>Nuova pratica assicurazione';
}

async function salvaAssicurazione(){
  const cliente = document.getElementById('ass-cliente').value.trim();
  if(!cliente) return alert('Inserisci il nome del cliente');
  const importo = parseFloat(document.getElementById('ass-importo').value)||0;
  if(!importo) return alert('Inserisci il valore della merce danneggiata');
  const id = document.getElementById('ass-edit-id').value;
  const body = {
    cliente,
    ddt: document.getElementById('ass-ddt').value.trim(),
    data_danno: document.getElementById('ass-data-danno').value,
    importo,
    rimborso_max: +(importo*0.8).toFixed(2),
    importo_rimborsato: parseFloat(document.getElementById('ass-rimborsato').value)||0,
    modalita_rimborso: document.getElementById('ass-modalita').value,
    stato: document.getElementById('ass-stato').value,
    note: document.getElementById('ass-note').value,
    doc_1: document.getElementById('ass-doc-1').checked,
    doc_2: document.getElementById('ass-doc-2').checked,
    doc_3: document.getElementById('ass-doc-3').checked,
    doc_4: document.getElementById('ass-doc-4').checked,
    doc_5: document.getElementById('ass-doc-5').checked,
  };
  if(id){
    await api.put('/api/assicurazioni/'+id, body);
    const idx=(state.assicurazioni||[]).findIndex(a=>a.id===parseInt(id));
    if(idx>=0) state.assicurazioni[idx]=Object.assign(state.assicurazioni[idx],body);
  } else {
    const r = await api.post('/api/assicurazioni', body);
    if(!r.error){ state.assicurazioni=state.assicurazioni||[]; state.assicurazioni.unshift(r); }
  }
  closeModal('modal-assicurazione');
  renderAssicurazioniList();
  showSave();
}

function editAssicurazione(id){
  const a=(state.assicurazioni||[]).find(x=>x.id===id); if(!a)return;
  openModal_assicurazione_reset();
  document.getElementById('ass-edit-id').value=a.id;
  document.getElementById('ass-cliente').value=a.cliente||'';
  document.getElementById('ass-ddt').value=a.ddt||'';
  document.getElementById('ass-data-danno').value=(a.data_danno||'').slice(0,10);
  document.getElementById('ass-importo').value=a.importo||'';
  document.getElementById('ass-note').value=a.note||'';
  document.getElementById('ass-stato').value=a.stato||'aperta';
  document.getElementById('ass-rimborsato').value=a.importo_rimborsato||'';
  document.getElementById('ass-modalita').value=a.modalita_rimborso||'';
  [1,2,3,4,5].forEach(i=>{ document.getElementById('ass-doc-'+i).checked=!!a['doc_'+i]; });
  calcolaRimborsoMax();
  document.getElementById('modal-ass-title').innerHTML='<i class="ti ti-shield-check" style="color:var(--brand);margin-right:6px"></i>Modifica pratica';
  openModal('modal-assicurazione');
}

async function eliminaAssicurazione(id){
  conferma(async()=>{
    await api.del('/api/assicurazioni/'+id);
    state.assicurazioni=(state.assicurazioni||[]).filter(a=>a.id!==id);
    renderAssicurazioniList();
    showSave();
  });
}

async function sincronizzaEmailSavise(){
  const btn = document.getElementById('btn-sync-ass');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Scansione...'; }
  try{
    const r = await api.post('/api/assicurazioni/scan-email', {});
    if(r.error){ mostraToast('Errore: '+r.error, 'error'); return; }
    mostraToast(`✅ ${r.nuove} nuove pratiche trovate · ${r.saltate} già presenti`);
    // Switcha alla tab assicurazioni e renderizza
    const tabEl = document.querySelectorAll('#sped-tabs .pill')[1];
    switchSpedizioniTab('assicurazioni', tabEl);
  }catch(e){ mostraToast('Errore di rete', 'error'); }
  finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-mail-search"></i>Sincronizza email'; }
  }
}

async function inviaEmailSavise(){
  const to = document.getElementById('ass-email-to')?.value.trim();
  const body = document.getElementById('ass-email-body')?.value.trim();
  const cliente = document.getElementById('ass-cliente')?.value.trim();
  const ddt = document.getElementById('ass-ddt')?.value.trim();
  if(!to||!body){ alert('Inserisci destinatario e testo email'); return; }
  apriComposer({
    to,
    subject: `Richiesta rimborso danno – ${cliente||''}${ddt?' – DDT '+ddt:''}`,
    bodyHtml: body.replace(/\n/g,'<br>')
  });
  mostraToast('Composer email aperto');
}



function switchContattiTab(tab, el){
  contattiTabCorrente = tab;
  document.querySelectorAll('#contatti-tabs .pill').forEach(p=>p.classList.remove('active'));
  if(el) el.classList.add('active');
  document.getElementById('contatti-vista-clienti').style.display = tab==='clienti' ? 'block' : 'none';
  document.getElementById('contatti-vista-fornitori').style.display = tab==='fornitori' ? 'block' : 'none';
  // Aggiorna il pulsante "Nuovo"
  const btn = document.getElementById('btn-nuovo-contatto');
  if(btn){
    if(tab==='fornitori'){ btn.innerHTML='<i class="ti ti-plus"></i>Nuovo fornitore'; btn.onclick=()=>apriModalNuovoFornitore(); }
    else { btn.innerHTML='<i class="ti ti-plus"></i>Nuovo cliente'; btn.onclick=()=>openModal('modal-cliente'); }
  }
}

// ── IMPORTAZIONE RAPIDA CSV — aggiorna email e telefono ───────────────────
function parseCSVRiga(riga) {
  const risultato = [];
  let corrente = '';
  let inVirgolette = false;
  for (let i = 0; i < riga.length; i++) {
    const c = riga[i];
    if (c === '"') {
      inVirgolette = !inVirgolette;
    } else if (c === ',' && !inVirgolette) {
      risultato.push(corrente.trim());
      corrente = '';
    } else {
      corrente += c;
    }
  }
  risultato.push(corrente.trim());
  return risultato;
}

async function importaCSVVeloce(input) {
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';

  const reader = new FileReader();
  reader.onload = async function(e) {
    const testo = e.target.result;
    const righe = testo.split('\n').filter(r => r.trim());
    if (!righe.length) return alert('File CSV vuoto');

    // Leggi intestazioni
    const intestazioni = parseCSVRiga(righe[0]).map(h => h.toLowerCase().replace(/"/g,'').trim());

    const idxNome = intestazioni.findIndex(h => h === 'nome');
    const idxEmail = intestazioni.findIndex(h => h === 'email');
    const idxTel = intestazioni.findIndex(h => ['tel','telefono','cellulare'].includes(h));

    if (idxNome === -1) {
      return alert(`Colonna "nome" non trovata.\nColonne nel file: ${intestazioni.join(', ')}`);
    }

    // Parsa righe
    const dati = [];
    for (let i = 1; i < righe.length; i++) {
      const cols = parseCSVRiga(righe[i]);
      const nome = cols[idxNome] || '';
      if (!nome) continue;
      dati.push({
        nome: nome.replace(/"/g,'').trim(),
        email: idxEmail >= 0 ? (cols[idxEmail] || '').replace(/"/g,'').trim() : '',
        tel: idxTel >= 0 ? (cols[idxTel] || '').replace(/"/g,'').trim() : ''
      });
    }

    if (!dati.length) return alert('Nessuna riga valida trovata');

    const conferma = confirm(`Trovate ${dati.length} righe.\n\nVerranno aggiornati email e telefono per i clienti già presenti in anagrafica (solo i campi vuoti).\n\nProcedere?`);
    if (!conferma) return;

    const btn = document.querySelector('button[onclick*="import-csv-quick"]') ||
                document.querySelector('.btn-primary[onclick*="import-csv-quick"]');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i> Importo...'; }

    try {
      const r = await api.post('/api/clienti/aggiorna-da-csv', { righe: dati });
      if (r.error) { alert('Errore: ' + r.error); return; }
      const clientiAggiornati = await api.get('/api/clienti');
      if (!clientiAggiornati.error) state.clienti = clientiAggiornati;
      renderClienti();
      mostraToast(`✅ ${r.aggiornati} contatti aggiornati · ${r.nonTrovati} non trovati o già completi`);
    } catch(err) {
      alert('Errore: ' + err.message);
    } finally {
      const b = document.querySelector('button[onclick*="import-csv-quick"]');
      if (b) { b.disabled = false; b.innerHTML = '<i class="ti ti-file-import"></i>Aggiorna da CSV'; }
    }
  };
  reader.readAsText(file, 'utf-8');
}

function esportaContatti(){
  const tab = contattiTabCorrente;
  const lista = tab==='fornitori'
    ? (state.clienti||[]).filter(c=>c.tipo==='fornitore')
    : (state.clienti||[]).filter(c=>c.tipo!=='fornitore');
  if(!lista.length){ alert('Nessun contatto da esportare'); return; }

  // Esporta come CSV scaricabile
  const cols = tab==='fornitori'
    ? ['codice','nome','citta','tel','piva','sdi','pec','email','ind_legale','ind_consegna']
    : ['codice','nome','citta','tel','email','sdi','pec','piva','prod','ind_legale','ind_consegna','note'];
  const intestazione = cols.join(';');
  const righe = lista.map(c=>cols.map(k=>`"${(c[k]||'').toString().replace(/"/g,'""')}"`).join(';'));
  const csv = [intestazione, ...righe].join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=(tab==='fornitori'?'fornitori':'clienti')+'_'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── CLIENTI ───────────────────────────────────────────────────────────────
// Filtra solo clienti (non fornitori)
function renderClienti(){
  const q=(document.getElementById('search-clienti')?.value||'').toLowerCase();
  const list=(state.clienti||[]).filter(c=>c.tipo!=='fornitore' && (c.nome.toLowerCase().includes(q)||(c.citta||'').toLowerCase().includes(q)||(c.prod||'').toLowerCase().includes(q)||(c.tel||'').includes(q)||(c.sdi||'').toLowerCase().includes(q)||(c.codice||'').toLowerCase().includes(q)||(c.piva||'').includes(q)));
  const cnt=document.getElementById('clienti-count');
  const soloClienti=(state.clienti||[]).filter(c=>c.tipo!=='fornitore');
  if(cnt) cnt.textContent = q ? `${list.length} risultati` : `${soloClienti.length} clienti`;
  const tb=document.getElementById('tbl-clienti'); if(!tb)return; tb.innerHTML='';
  if(!list.length){tb.innerHTML='<tr><td colspan="7"><div class="empty-state">Nessun cliente trovato</div></td></tr>';return;}
  list.forEach(c=>{
    const sdiPec = [c.sdi?`<span style="font-family:monospace;font-size:11px;background:var(--brand-light);color:var(--brand);padding:1px 5px;border-radius:4px">${c.sdi}</span>`:'', c.pec?`<span style="font-size:11px;color:var(--text-2)">${c.pec}</span>`:''].filter(Boolean).join('<br>');
    const tr=document.createElement('tr'); tr.id='cl-row-'+c.id;
    tr.innerHTML=`
      <td><span style="font-family:monospace;font-size:11px;background:var(--surface-2);color:var(--text-2);padding:2px 6px;border-radius:4px">${c.codice||'—'}</span></td>
      <td><div class="flex-row"><div class="avatar">${ini(c.nome)}</div><div><div style="font-weight:600">${c.nome}</div><div style="font-size:11px;color:var(--text-3)">${c.citta||''}</div></div></div></td>
      <td>${c.tel||'—'}${c.tel2?' · '+c.tel2:''}</td>
      <td style="font-size:12px">${c.email||'<span style="color:var(--text-3)">—</span>'}</td>
      <td>${sdiPec||'<span style="color:var(--text-3)">—</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="apriDettaglio(${c.id})" title="Dettaglio"><i class="ti ti-eye"></i></button>
        <button class="btn btn-sm" onclick="editCliente(${c.id})" title="Modifica"><i class="ti ti-pencil"></i></button>
        <button class="btn btn-sm btn-danger" onclick="eliminaCliente(${c.id},'${c.nome.replace(/'/g,"\\'")}')" title="Elimina"><i class="ti ti-trash"></i></button>
      </td>`;
    tb.appendChild(tr);
  });
}

// ── FORNITORI ─────────────────────────────────────────────────────────────
function renderFornitori(){
  const q=(document.getElementById('search-fornitori')?.value||'').toLowerCase();
  const list=(state.clienti||[]).filter(c=>c.tipo==='fornitore' && (c.nome.toLowerCase().includes(q)||(c.citta||'').toLowerCase().includes(q)||(c.piva||'').includes(q)||(c.tel||'').includes(q)||(c.codice||'').toLowerCase().includes(q)));
  const cnt=document.getElementById('fornitori-count');
  const soloFornitori=(state.clienti||[]).filter(c=>c.tipo==='fornitore');
  if(cnt) cnt.textContent = q ? `${list.length} risultati` : `${soloFornitori.length} fornitori`;
  const tb=document.getElementById('tbl-fornitori'); if(!tb)return; tb.innerHTML='';
  if(!list.length){tb.innerHTML='<tr><td colspan="7"><div class="empty-state">Nessun fornitore trovato</div></td></tr>';return;}
  list.forEach(c=>{
    const sdiPec = [c.sdi?`<span style="font-family:monospace;font-size:11px;background:var(--brand-light);color:var(--brand);padding:1px 5px;border-radius:4px">${c.sdi}</span>`:'', c.pec?`<span style="font-size:11px;color:var(--text-2)">${c.pec}</span>`:''].filter(Boolean).join('<br>');
    const tr=document.createElement('tr'); tr.id='cl-row-'+c.id;
    tr.innerHTML=`
      <td><span style="font-family:monospace;font-size:11px;background:var(--green-light);color:var(--green);padding:2px 6px;border-radius:4px">${c.codice||'—'}</span></td>
      <td><div class="flex-row"><div class="avatar" style="background:var(--green-light);color:var(--green)">${ini(c.nome)}</div><div><div style="font-weight:600">${c.nome}</div><div style="font-size:11px;color:var(--text-3)">${c.email||''}</div></div></div></td>
      <td>${c.citta||'—'}</td>
      <td>${c.tel||'—'}${c.tel2?' · '+c.tel2:''}</td>
      <td style="font-size:12px;color:var(--text-2)">${c.piva||'—'}</td>
      <td>${sdiPec||'<span style="color:var(--text-3)">—</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-sm" onclick="editCliente(${c.id})" title="Modifica"><i class="ti ti-pencil"></i></button>
        <button class="btn btn-sm btn-danger" onclick="eliminaCliente(${c.id},'${c.nome.replace(/'/g,"\\'")}')" title="Elimina"><i class="ti ti-trash"></i></button>
      </td>`;
    tb.appendChild(tr);
  });
}

function apriModalNuovoFornitore(){
  // Riusa il modal cliente ma imposta il tipo fornitore
  openModal('modal-cliente');
  // Imposta un campo nascosto per il tipo — gestiamo tramite titolo modal
  const title = document.querySelector('#modal-cliente .modal-title');
  if(title) title.textContent = 'Nuovo fornitore';
  // Salviamo il tipo come attributo nel modal
  document.getElementById('modal-cliente').dataset.tipo = 'fornitore';
}


async function importaClientiDaFic(){
  const btn = document.getElementById('btn-importa-fic');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Importazione...'; }
  try{
    const r = await api.post('/api/clienti/importa-fic', {});
    if(r.error){ alert('Errore: '+r.error); return; }
    // Ricarica la lista clienti
    const clientiAggiornati = await api.get('/api/clienti');
    if(!clientiAggiornati.error) state.clienti = clientiAggiornati;
    renderClienti();
    // Mostra il riepilogo
    let msg = `✅ Importazione completata!\n\n📥 Da FIC: ${r.totaleClienti||0} clienti + ${r.totaleFornitori||0} fornitori\n\n• ${r.importati} record nuovi aggiunti\n• ${r.saltati} già presenti (ignorati)\n• ${r.conflitti} conflitti da risolvere`;
    if(r.conflitti > 0) msg += '\n\n⚠️ Vai su Impostazioni per gestire i conflitti.';
    alert(msg);
    if(r.conflitti > 0) aggiornaConflittiBadge(r.conflitti);
    showSave();
  }catch(e){ alert('Errore di rete: '+e.message); }
  finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-cloud-download"></i>Importa da FIC'; }
  }
}

async function sincronizzaFattureRicevute(){
  const btn = document.getElementById('btn-sync-fatture-ricevute');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Importo...'; }
  try{
    const r = await api.post('/api/fatture/sincronizza-ricevute', {});
    if(r.error){ alert('Errore: '+r.error); return; }

    // Ricarica movimenti
    const movAggiornati = await api.get('/api/movimenti');
    if(!movAggiornati.error) state.movimenti = movAggiornati;
    try{ renderContab(); }catch(e){}

    let msg = `✅ Sincronizzazione completata!\n\n`;
    msg += `📥 Fatture ricevute da FIC: ${r.totale}\n`;
    msg += `• ${r.importati} nuove registrate in contabilità (uscite)\n`;
    msg += `• ${r.saltati} già presenti (ignorate)\n`;
    if(r.errori) msg += `• ${r.errori} errori (vedi log Railway)`;
    alert(msg);
    showSave();
  }catch(e){ alert('Errore di rete: '+e.message); }
  finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-cloud-download"></i>Importa spese da FIC'; }
  }
}

async function sincronizzaIndirizziFic(){
  const btn = document.getElementById('btn-sync-indirizzi-fic');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Recupero indirizzi...'; }
  try{
    const r = await api.post('/api/clienti/sincronizza-indirizzi-fic', {});
    if(r.error){ alert('Errore: '+r.error); return; }
    // Ricarica la lista clienti per riflettere gli indirizzi aggiornati
    const clientiAggiornati = await api.get('/api/clienti');
    if(!clientiAggiornati.error) state.clienti = clientiAggiornati;
    renderClienti();
    let msg = `✅ Sincronizzazione indirizzi completata!\n\n📍 ${r.aggiornati} clienti aggiornati con l'indirizzo preso da FIC\n• ${r.saltatiGiaCompilati} già avevano un indirizzo (non toccati)\n• ${r.nonTrovatiSuFic} non trovati su FIC`;
    alert(msg);
    showSave();
  }catch(e){ alert('Errore di rete: '+e.message); }
  finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-map-pin"></i>Recupera indirizzi da FIC'; }
  }
}

// ── IMPORTAZIONE CONTATTI DA EXCEL ──────────────────────────────────────────
let _excelImportRighe = []; // righe normalizzate pronte da inviare al server
let _excelImportCerti = []; // match certi calcolati dal server
let _excelSenzaMatch = []; // nomi senza nessuna corrispondenza
let _excelSenzaMatchRighe = []; // righe complete senza corrispondenza (per creare nuovi clienti)

// Mappa alias colonna (minuscolo, senza spazi/punti) -> campo interno
const EXCEL_COLONNE_ALIAS = {
  // Nome cliente / azienda
  'nome': 'nome', 'ragionesociale': 'nome', 'ragsoc': 'nome', 'ragsociale': 'nome',
  'cliente': 'nome', 'denominazione': 'nome', 'intestatario': 'nome', 'azienda': 'nome',
  'nominativo': 'nome', 'ditta': 'nome',
  // Pipedrive: nome contatto e organizzazione
  'personanome': 'ref',               // "Persona - Nome" → referente
  'personaorganizzazione': 'nome',    // "Persona - Organizzazione" → nome azienda in anagrafica
  // P.IVA
  'piva': 'piva', 'partitaiva': 'piva', 'pi': 'piva', 'vatnumber': 'piva',
  'codicefiscale': 'piva', 'cf': 'piva', 'fiscalcode': 'piva',
  // Telefono
  'telefono': 'tel', 'tel': 'tel', 'cellulare': 'tel', 'cell': 'tel', 'phone': 'tel',
  'mobile': 'tel', 'numero': 'tel', 'numeroditelefono': 'tel', 'tel1': 'tel',
  // Pipedrive: telefoni multipli (usa lavoro come tel principale, cellulare come fallback)
  'personatelefonolavoro': 'tel',
  'personatelefonocellulare': 'tel2',  // secondo numero, da aggiungere a tel se tel è vuoto
  'personatelefonocasa': 'tel',
  'personatelefononumero': 'tel',
  // Email
  'email': 'email', 'mail': 'email', 'emailaddress': 'email', 'indirizzomail': 'email',
  // Pipedrive: email multipli
  'personaemaillavoro': 'email',
  'personaemailcasa': 'email',
  'personaemailaltro': 'email',
  // Città
  'citta': 'citta', 'localita': 'citta', 'comune': 'citta', 'city': 'citta', 'paese': 'citta',
  // Indirizzo
  'indirizzo': 'ind_legale', 'via': 'ind_legale', 'indirizzolegale': 'ind_legale',
  'indirizzosedelegale': 'ind_legale', 'sedelegale': 'ind_legale', 'address': 'ind_legale',
  'indirizzofatturazione': 'ind_legale', 'stradale': 'ind_legale',
  // Indirizzo consegna
  'indirizzoconsegna': 'ind_consegna', 'indirizzospedizione': 'ind_consegna',
  'indirizzodiconsegna': 'ind_consegna', 'destinazione': 'ind_consegna', 'consegna': 'ind_consegna',
  // SDI / PEC
  'sdi': 'sdi', 'codicesdi': 'sdi', 'codicedestinatario': 'sdi', 'codiceunivocodestinatario': 'sdi',
  'pec': 'pec', 'emailpec': 'pec',
  // Referente
  'referente': 'ref', 'contatto': 'ref', 'responsabile': 'ref', 'nomecontatto': 'ref',
  // Provincia / CAP
  'provincia': 'provincia', 'prov': 'provincia', 'cap': 'cap', 'codiceavviamento': 'cap',
  // Note
  'note': 'note', 'annotazioni': 'note', 'commenti': 'note',
};

function normalizzaIntestazioneColonna(s){
  return String(s||'').toLowerCase().trim()
    .replace(/[\s\-_\.]+/g,'')  // toglie spazi, trattini, underscore, punti
    .replace(/[àá]/g,'a').replace(/[èé]/g,'e').replace(/[ìí]/g,'i').replace(/[òó]/g,'o').replace(/[ùú]/g,'u');
}

function onExcelFileSelected(input){
  const file = input.files?.[0];
  if(!file) return;
  document.getElementById('excel-import-filename').textContent = file.name;

  const reader = new FileReader();
  reader.onload = async function(e){
    try{
      const wb = XLSX.read(e.target.result, {type:'array'});
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, {defval:'', raw:false});
      if(!rows.length){ alert('Il file Excel sembra vuoto.'); return; }

      // Mappa le colonne del file sui campi interni
      const colonneOriginali = Object.keys(rows[0]);
      const mappaColonne = {};
      const colonneNonRiconosciute = [];
      colonneOriginali.forEach(col=>{
        const norm = normalizzaIntestazioneColonna(col);
        if(EXCEL_COLONNE_ALIAS[norm]) mappaColonne[col] = EXCEL_COLONNE_ALIAS[norm];
        else colonneNonRiconosciute.push(col);
      });

      const box = document.getElementById('excel-import-preview');
      box.style.display='block';

      // Mostra mapping colonne trovate
      const campiTrovati = [...new Set(Object.values(mappaColonne))];
      const haColNome = campiTrovati.includes('nome');

      let html = `<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;font-size:12.5px">
        <div style="font-weight:700;margin-bottom:8px">📊 Colonne riconosciute nel file (${colonneOriginali.length} totali):</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:${colonneNonRiconosciute.length?'8px':'0'}">
          ${Object.entries(mappaColonne).map(([orig,campo])=>`
            <span style="background:#fff;border:1px solid var(--border);border-radius:20px;padding:3px 10px;font-size:11.5px">
              <strong>${orig}</strong> → <em style="color:var(--brand)">${campo}</em>
            </span>`).join('')}
          ${!campiTrovati.length?'<span style="color:var(--red)">⚠️ Nessuna colonna riconosciuta</span>':''}
        </div>
        ${colonneNonRiconosciute.length?`<div style="color:var(--text-3);font-size:11.5px">Non riconosciute (ignorate): ${colonneNonRiconosciute.join(', ')}</div>`:''}
      </div>`;

      if(!haColNome){
        html += `<div style="color:var(--red);font-size:13px;padding:8px 0">
          ⚠️ Non trovo la colonna col nome del cliente (cercavo: Nome, Ragione Sociale, Cliente, Denominazione, Azienda).<br>
          Le intestazioni nel tuo file sono: <strong>${colonneOriginali.join(', ')}</strong>
        </div>`;
        box.innerHTML = html;
        return;
      }

      // Costruisci le righe normalizzate
      _excelImportRighe = rows.map(row=>{
        const obj = {};
        colonneOriginali.forEach(col=>{
          const campo = mappaColonne[col];
          let val = String(row[col]||'').trim();
          if(val === 'NaN' || val === 'nan') val = '';
          if(!campo || !val) return;
          // Se il campo tel è già popolato e arriva tel2 (cellulare), usalo solo se tel è vuoto
          if(campo === 'tel2'){
            if(!obj['tel']) obj['tel'] = val.split(',')[0].trim();
            return;
          }
          // Per tel: se ci sono più numeri separati da virgola, prendi solo il primo
          if(campo === 'tel' && val.includes(',')){
            val = val.split(',')[0].trim();
          }
          // Per nome: ignora valori come "?" o un singolo carattere
          if(campo === 'nome' && val.length < 2) return;
          // Non sovrascrivere campi già impostati (es. email lavoro già trovata)
          if(!obj[campo]) obj[campo] = val;
        });
        return obj;
      }).filter(r=>r.nome && r.nome.trim().length > 1);

      html += `<div style="font-size:13px;color:var(--text-2);margin-bottom:10px">
        <strong>${_excelImportRighe.length}</strong> righe con nome trovate nel file.
        <em style="font-size:12px">I clienti non presenti in anagrafica verranno ignorati.</em>
      </div>`;
      box.innerHTML = html;
      box.innerHTML += '<div style="font-size:13px;color:var(--text-2)"><i class="ti ti-loader"></i> Ricerca corrispondenze...</div>';

      await analizzaImportExcel();
    }catch(err){
      alert('Errore nella lettura del file Excel: '+err.message);
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

let _excelDubbiCorrenti = []; // dubbi in attesa di scelta utente, con clienteId scelto

async function analizzaImportExcel(){
  const box = document.getElementById('excel-import-preview');

  const r = await api.post('/api/clienti/importa-excel/anteprima', { righe: _excelImportRighe });
  if(r.error){ box.innerHTML += '<div style="color:var(--red);font-size:13px;margin-top:8px">Errore: '+r.error+'</div>'; return; }

  _excelImportCerti = r.certi || [];
  _excelDubbiCorrenti = (r.dubbi||[]).map(d=>({...d, sceltaClienteId: d.clienteId}));
  _excelSenzaMatch = r.senzaMatch || [];
  _excelSenzaMatchRighe = r.senzaMatchRighe || [];

  renderAnteprimaExcel();
}

function campoLabel(c){
  return {tel:'Telefono', email:'Email', citta:'Città', ind_legale:'Indirizzo legale', ind_consegna:'Indirizzo consegna', sdi:'SDI', pec:'PEC', ref:'Referente', piva:'P.IVA'}[c] || c;
}

function renderAnteprimaExcel(){
  const box = document.getElementById('excel-import-preview');
  const certi = _excelImportCerti||[], dubbi = _excelDubbiCorrenti||[], senzaMatch = _excelSenzaMatch||[];
  const totaleFile = _excelImportRighe.length;

  // Preserva la sezione di mapping colonne (già mostrata sopra)
  const mappingHtml = box.innerHTML;

  if(certi.length===0 && dubbi.length===0){
    box.innerHTML = mappingHtml + `
      <div style="padding:14px;border:1px solid var(--border);border-radius:var(--r);background:var(--surface-2);margin-top:8px">
        <div style="font-size:13px;font-weight:600;margin-bottom:6px">Risultato analisi</div>
        <div style="font-size:13px;color:var(--text-2)">Nessuna corrispondenza trovata — nessun cliente del file è presente in anagrafica, oppure i dati sono già tutti aggiornati.</div>
        ${senzaMatch.length?`<div style="border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-top:10px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:8px">
            <div style="font-size:13px;font-weight:700">${senzaMatch.length} non trovati in anagrafica</div>
            <button class="btn btn-primary btn-sm" onclick="creaNuoviClientiExcel()"><i class="ti ti-user-plus"></i>Aggiungi tutti come nuovi clienti</button>
          </div>
          <div style="font-size:12px;color:var(--text-2)">
            ${senzaMatch.slice(0,20).join(', ')}${senzaMatch.length>20?` ...e altri ${senzaMatch.length-20}`:''}
          </div>
        </div>`:''}
      </div>`;
    return;
  }

  let html = mappingHtml;

  // ── Riepilogo numerico ──
  html += `<div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
    <div style="padding:8px 14px;background:var(--surface-2);border-radius:var(--r);font-size:12px;text-align:center">
      <div style="font-size:18px;font-weight:800">${totaleFile}</div><div style="color:var(--text-3)">Righe nel file</div>
    </div>
    <div style="padding:8px 14px;background:#f0fdf4;border:1px solid var(--green);border-radius:var(--r);font-size:12px;text-align:center">
      <div style="font-size:18px;font-weight:800;color:var(--green)">${certi.length}</div><div style="color:var(--text-3)">Match certi</div>
    </div>
    ${dubbi.length?`<div style="padding:8px 14px;background:#fff7ed;border:1px solid var(--orange);border-radius:var(--r);font-size:12px;text-align:center">
      <div style="font-size:18px;font-weight:800;color:var(--orange)">${dubbi.length}</div><div style="color:var(--text-3)">Da confermare</div>
    </div>`:''}
    <div style="padding:8px 14px;background:var(--surface-2);border-radius:var(--r);font-size:12px;text-align:center">
      <div style="font-size:18px;font-weight:800;color:var(--text-3)">${senzaMatch.length}</div><div style="color:var(--text-3)">Non trovati (ignorati)</div>
    </div>
  </div>`;

  // ── Match certi ──
  if(certi.length){
    html += `<div style="font-size:12px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px"><i class="ti ti-circle-check"></i> Corrispondenze sicure — verranno aggiornate automaticamente</div>`;
    html += `<div style="border:1px solid var(--border);border-radius:var(--r);margin-bottom:16px;overflow:hidden">`;
    certi.forEach((c,i)=>{
      const campiTesto = Object.entries(c.campiDaCompletare).map(([k,v])=>`<span style="background:var(--surface-2);padding:2px 7px;border-radius:10px;font-size:11px"><strong>${campoLabel(k)}:</strong> ${v}</span>`).join(' ');
      html += `<div style="padding:9px 12px;font-size:12.5px;border-bottom:${i<certi.length-1?'1px solid var(--border)':'none'}">
        <strong>${c.clienteNome}</strong>${c.rigaExcel.nome!==c.clienteNome?` <span style="color:var(--text-3);font-size:11px">(file: "${c.rigaExcel.nome}")</span>`:''}
        <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${campiTesto}</div>
      </div>`;
    });
    html += `</div>`;
  }

  // ── Dubbi ──
  if(dubbi.length){
    html += `<div style="font-size:12px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Corrispondenze incerte — scegli tu a chi abbinarle</div>`;
    html += `<div style="border:1px solid var(--orange);border-radius:var(--r);margin-bottom:16px;overflow:hidden">`;
    dubbi.forEach((d,i)=>{
      const campiTesto = Object.entries(d.campiDaCompletare).map(([k,v])=>`<span style="background:var(--surface-2);padding:2px 7px;border-radius:10px;font-size:11px"><strong>${campoLabel(k)}:</strong> ${v}</span>`).join(' ');
      const opzioni = [{clienteId:d.clienteId, clienteNome:d.clienteNome, score:d.score}, ...d.alternative];
      html += `<div style="padding:10px 12px;font-size:12px;border-bottom:${i<dubbi.length-1?'1px solid var(--border)':'none'};background:#fff8f0">
        <div style="margin-bottom:5px"><strong>File:</strong> "${d.rigaExcel.nome}"</div>
        <div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:4px">${campiTesto}</div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="color:var(--text-3)">Abbina a:</span>
          <select onchange="aggiornaSceltaDubbio(${i}, this.value)" style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">
            ${opzioni.map(o=>`<option value="${o.clienteId}" ${o.clienteId===d.sceltaClienteId?'selected':''}>${o.clienteNome} (${o.score}%)</option>`).join('')}
            <option value="" ${d.sceltaClienteId===null?'selected':''}>— Ignora questa riga —</option>
          </select>
        </div>
      </div>`;
    });
    html += `</div>`;
  }

  // ── Non trovati ──
  if(senzaMatch.length){
    html += `<div style="border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:14px;background:var(--surface-2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:13px;font-weight:700;color:var(--text)">${senzaMatch.length} non trovati in anagrafica</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px">Questi nomi non corrispondono a nessun cliente esistente.</div>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-crea-nuovi-excel" onclick="creaNuoviClientiExcel()">
          <i class="ti ti-user-plus"></i>Aggiungi tutti come nuovi clienti
        </button>
      </div>
      <div style="font-size:12px;color:var(--text-2);max-height:120px;overflow-y:auto">
        ${senzaMatch.slice(0,50).map(n=>`<span style="display:inline-block;background:#fff;border:1px solid var(--border);border-radius:20px;padding:2px 10px;margin:2px;font-size:11.5px">${n}</span>`).join('')}
        ${senzaMatch.length>50?`<span style="font-size:11px;color:var(--text-3)"> ...e altri ${senzaMatch.length-50}</span>`:''}
      </div>
    </div>`;
  }

  html += `<button class="btn btn-primary" id="btn-conferma-import-excel" onclick="confermaImportExcel()"><i class="ti ti-check"></i>Conferma e aggiorna ${certi.length + dubbi.filter(d=>d.sceltaClienteId).length} clienti</button>`;

  box.innerHTML = html;
}

function aggiornaSceltaDubbio(index, valore){
  _excelDubbiCorrenti[index].sceltaClienteId = valore ? parseInt(valore) : null;
  // Se l'utente ha scelto un'alternativa diversa dal default, aggiorna anche i campiDaCompletare/nome mostrato
  const d = _excelDubbiCorrenti[index];
  if(d.sceltaClienteId && d.sceltaClienteId !== d.clienteId){
    const alt = d.alternative.find(a=>a.clienteId===d.sceltaClienteId);
    if(alt) d.clienteNome = alt.clienteNome;
  }
}

async function creaNuoviClientiExcel(){
  const btn = document.getElementById('btn-crea-nuovi-excel');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Creo...'; }
  try{
    const r = await api.post('/api/clienti/importa-excel/crea-nuovi', { righe: _excelSenzaMatchRighe });
    if(r.error){ mostraToast('Errore: '+r.error, 'error'); return; }
    const clientiAggiornati = await api.get('/api/clienti');
    if(!clientiAggiornati.error) state.clienti = clientiAggiornati;
    try{ renderClienti(); }catch(e){}
    mostraToast(`✅ ${r.creati} nuovi clienti aggiunti in anagrafica`);
    showSave();
    // Rimuovi la sezione non trovati dalla UI
    _excelSenzaMatch = [];
    _excelSenzaMatchRighe = [];
    renderAnteprimaExcel();
  }catch(e){ mostraToast('Errore di rete: '+e.message, 'error'); }
  finally{ if(btn){ btn.disabled=false; } }
}

async function confermaImportExcel(){
  const btn = document.getElementById('btn-conferma-import-excel');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Importazione...'; }
  try{
    const conferme = [
      ...(_excelImportCerti||[]).map(c=>({ clienteId:c.clienteId, campiDaCompletare:c.campiDaCompletare })),
      ...(_excelDubbiCorrenti||[]).filter(d=>d.sceltaClienteId).map(d=>({ clienteId:d.sceltaClienteId, campiDaCompletare:d.campiDaCompletare }))
    ];

    if(conferme.length===0){ alert('Nessun aggiornamento da applicare.'); return; }

    const r = await api.post('/api/clienti/importa-excel/conferma', { conferme });
    if(r.error){ alert('Errore: '+r.error); return; }

    const clientiAggiornati = await api.get('/api/clienti');
    if(!clientiAggiornati.error) state.clienti = clientiAggiornati;
    renderClienti();

    alert(`✅ Importazione completata!\n\n📊 ${r.aggiornati} clienti completati con i nuovi dati.`);
    showSave();

    // Reset
    _excelImportRighe = []; _excelImportCerti = []; _excelDubbiCorrenti = []; _excelSenzaMatch = []; _excelSenzaMatchRighe = [];
    document.getElementById('excel-import-preview').style.display='none';
    document.getElementById('excel-import-filename').textContent='';
    document.getElementById('excel-import-file').value='';
  }catch(e){ alert('Errore di rete: '+e.message); }
  finally{
    if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-check"></i>Conferma e completa contatti'; }
  }
}

// ── GESTIONE CONFLITTI ────────────────────────────────────────────────────
async function aggiornaStatoGmail(){
  try{
    const [p, s] = await Promise.all([
      api.get('/api/gmail/status?account=principale'),
      api.get('/api/gmail/status?account=spedizioni')
    ]);
    const elP = document.getElementById('gmail-principale-status');
    const elS = document.getElementById('gmail-spedizioni-status');
    if(elP) elP.innerHTML = p.connected
      ? '<span style="color:var(--green)"><i class="ti ti-circle-check"></i> Connesso</span>'
      : '<span style="color:var(--red)"><i class="ti ti-circle-x"></i> Non connesso — clicca "Connetti / Riconnetti"</span>';
    if(elS) elS.innerHTML = s.connected
      ? '<span style="color:var(--green)"><i class="ti ti-circle-check"></i> Connesso</span>'
      : '<span style="color:var(--red)"><i class="ti ti-circle-x"></i> Non connesso — clicca "Connetti / Riconnetti"</span>';
  }catch(e){}
}

async function disconnettiGmail(account){
  if(!confirm(`Sei sicuro di voler disconnettere l'account Gmail ${account === 'spedizioni' ? 'spedizioni' : 'principale'}?`)) return;
  try{
    const endpoint = account === 'spedizioni' ? '/api/spedizioni/disconnect' : '/api/gmail/disconnect';
    const r = await api.post(endpoint, {});
    if(r.error){ alert('Errore: '+r.error); return; }
    alert('✅ Account disconnesso. Ricollegalo quando vuoi con "Connetti / Riconnetti".');
    aggiornaStatoGmail();
  }catch(e){ alert('Errore di rete: '+e.message); }
}

async function caricaConflitti(){
  const cont = document.getElementById('conflitti-list');
  if(!cont) return;
  cont.innerHTML = '<div style="font-size:13px;color:var(--text-2);padding:8px 0"><i class="ti ti-loader"></i> Caricamento...</div>';
  try{
    const data = await api.get('/api/clienti/conflitti');
    if(data.error){ cont.innerHTML = `<div style="color:var(--red);font-size:13px;padding:8px 0">${data.error}</div>`; return; }
    aggiornaConflittiBadge(data.length);

    const btnUnisci = document.getElementById('btn-risolvi-tutti-unisci');
    const btnIgnora = document.getElementById('btn-risolvi-tutti-ignora');
    if(btnUnisci) btnUnisci.style.display = data.length > 1 ? 'inline-flex' : 'none';
    if(btnIgnora) btnIgnora.style.display = data.length > 1 ? 'inline-flex' : 'none';
    if(btnUnisci) btnUnisci.innerHTML = `<i class="ti ti-git-merge"></i>Risolvi tutti (${data.length}): aggiorna con FIC`;
    if(btnIgnora) btnIgnora.innerHTML = `<i class="ti ti-x"></i>Risolvi tutti (${data.length}): mantieni attuali`;

    if(!data.length){
      cont.innerHTML = '<div style="font-size:13px;color:var(--text-2);padding:8px 0">Nessun conflitto pendente. I conflitti appaiono qui quando importi clienti da Fatture in Cloud e un cliente con la stessa P.IVA esiste già nel gestionale.</div>';
      return;
    }
    cont.innerHTML = data.map(c=>{
      const fic = typeof c.fic_data === 'string' ? JSON.parse(c.fic_data) : c.fic_data;
      return `
      <div style="border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Conflitto — stessa P.IVA <strong style="color:var(--orange)">${fic.piva||'—'}</strong></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div style="background:var(--surface-2);border-radius:var(--r);padding:10px">
            <div style="font-size:11px;font-weight:700;color:var(--text-3);margin-bottom:6px">📋 NEL GESTIONALE</div>
            <div style="font-size:13px;font-weight:600">${c.cliente_nome}</div>
            <div style="font-size:12px;color:var(--text-2)">P.IVA: ${c.cliente_piva||'—'}</div>
            <div style="font-size:12px;color:var(--text-2)">${c.cliente_email||''}</div>
            <div style="font-size:12px;color:var(--text-2)">${c.cliente_ind||''}</div>
          </div>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--r);padding:10px">
            <div style="font-size:11px;font-weight:700;color:var(--orange);margin-bottom:6px">☁️ DA FATTURE IN CLOUD</div>
            <div style="font-size:13px;font-weight:600">${fic.nome}</div>
            <div style="font-size:12px;color:var(--text-2)">P.IVA: ${fic.piva||'—'}</div>
            <div style="font-size:12px;color:var(--text-2)">${fic.email||''}</div>
            <div style="font-size:12px;color:var(--text-2)">SDI: ${fic.sdi||'—'} · PEC: ${fic.pec||'—'}</div>
            <div style="font-size:12px;color:var(--text-2)">${fic.ind_legale||''}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" onclick="risolviConflitto(${c.id},'unisci')"><i class="ti ti-git-merge"></i>Aggiorna con dati FIC</button>
          <button class="btn btn-sm" onclick="risolviConflitto(${c.id},'ignora')"><i class="ti ti-x"></i>Mantieni dati attuali</button>
        </div>
      </div>`;
    }).join('');
  }catch(e){
    cont.innerHTML = '<div style="color:var(--red);font-size:13px;padding:8px 0">Errore di caricamento</div>';
  }
}

async function risolviConflitto(id, azione){
  try{
    await api.post(`/api/clienti/conflitti/${id}/${azione}`, {});
    if(azione === 'unisci'){
      const clientiAggiornati = await api.get('/api/clienti');
      if(!clientiAggiornati.error) state.clienti = clientiAggiornati;
    }
    await caricaConflitti();
    showSave();
  }catch(e){ alert('Errore di rete: '+e.message); }
}

async function risolviTuttiConflitti(azione){
  const label = azione === 'unisci' ? 'aggiornare TUTTI i clienti con i dati di Fatture in Cloud' : 'mantenere i dati attuali per TUTTI i conflitti (ignorandoli)';
  if(!confirm(`Sei sicuro di voler ${label}? Questa azione non può essere annullata singolarmente.`)) return;

  const btn = document.getElementById(azione === 'unisci' ? 'btn-risolvi-tutti-unisci' : 'btn-risolvi-tutti-ignora');
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i> Elaborazione...'; }

  try{
    const r = await api.post('/api/clienti/conflitti/risolvi-tutti', { azione });
    if(r.error){ alert('Errore: '+r.error); return; }
    if(azione === 'unisci'){
      const clientiAggiornati = await api.get('/api/clienti');
      if(!clientiAggiornati.error) state.clienti = clientiAggiornati;
    }
    await caricaConflitti();
    showSave();
    alert(`✅ ${r.processati} conflitti risolti.`);
  }catch(e){ alert('Errore di rete: '+e.message); }
  finally{
    if(btn){ btn.disabled = false; }
  }
}

function aggiornaConflittiBadge(n){
  const badge = document.getElementById('conflitti-badge');
  if(!badge) return;
  if(n > 0){ badge.textContent = n; badge.style.display='inline-flex'; }
  else badge.style.display='none';
}


async function eliminaCliente(id, nome){
  conferma(async()=>{
    try{
      await api.del('/api/clienti/'+id);
      state.clienti = state.clienti.filter(c=>c.id!==id);
      renderClienti();
      renderDash();
      showSave();
    }catch(e){ alert('Errore di rete: '+e.message); }
  });
}
function apriDettaglio(id){
  apriDettaglioCliente(id);
}

async function apriDettaglioCliente(id){
  const c = state.clienti.find(x=>x.id===id); if(!c) return;
  const ordini = (state.ordini||[]).filter(o=>o.cliente===c.nome);
  const tot = ordini.reduce((s,o)=>s+(parseFloat(o.importo)||0),0);
  const attivita = (state.attivita||[]).filter(a=>a.collegata_id===id&&a.collegata_tipo==='cliente'||a.lead_id===id);

  // Aggiorna titolo e pulsante modifica
  document.getElementById('cliente-detail-title').textContent = c.nome;
  document.getElementById('btn-edit-cliente-detail').onclick = ()=>editCliente(id);

  // Carica note dal server
  let note = [];
  try { const r = await api.get('/api/clienti/'+id+'/note'); note = r.error?[]:r; } catch(e){}

  const tipoColor = c.tipo==='fornitore' ? 'var(--green)' : 'var(--brand)';
  const tipoLabel = c.tipo==='fornitore' ? 'Fornitore' : 'Cliente';

  document.getElementById('cliente-detail-body').innerHTML = `
    <!-- Header cliente -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-body" style="padding:18px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">
          <div class="avatar" style="width:52px;height:52px;font-size:16px;background:${tipoColor};color:#fff">${ini(c.nome)}</div>
          <div style="flex:1">
            <div style="font-size:20px;font-weight:700">${c.nome}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
              <span style="font-size:11px;font-weight:700;color:${tipoColor};background:${c.tipo==='fornitore'?'var(--green-light)':'var(--brand-light)'};padding:2px 8px;border-radius:99px">${tipoLabel}</span>
              ${c.codice?`<span style="font-family:monospace;font-size:11px;color:var(--text-2)">${c.codice}</span>`:''}
              ${c.citta?`<span style="font-size:12px;color:var(--text-2)"><i class="ti ti-map-pin" style="font-size:11px"></i> ${c.citta}</span>`:''}
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:22px;font-weight:700;color:var(--brand)">€${tot.toLocaleString('it-IT',{minimumFractionDigits:0})}</div>
            <div style="font-size:11px;color:var(--text-2)">${ordini.length} ordini totali</div>
          </div>
        </div>
        <!-- Info rapide -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          ${c.tel?`<a href="tel:${c.tel}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--surface-2);border-radius:var(--r);text-decoration:none;color:var(--text)"><i class="ti ti-phone" style="color:var(--blue);font-size:16px"></i><div><div style="font-size:10px;color:var(--text-3)">Telefono</div><div style="font-size:13px;font-weight:600">${c.tel}</div></div></a>`:''}
          ${c.email?`<a href="mailto:${c.email}" style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--surface-2);border-radius:var(--r);text-decoration:none;color:var(--text)"><i class="ti ti-mail" style="color:var(--orange);font-size:16px"></i><div><div style="font-size:10px;color:var(--text-3)">Email</div><div style="font-size:13px;font-weight:600">${c.email}</div></div></a>`:''}
          ${c.piva?`<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--surface-2);border-radius:var(--r)"><i class="ti ti-file-invoice" style="color:var(--brand);font-size:16px"></i><div><div style="font-size:10px;color:var(--text-3)">P.IVA</div><div style="font-size:13px;font-weight:600">${c.piva}</div></div></div>`:''}
          ${c.sdi?`<div style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--surface-2);border-radius:var(--r)"><i class="ti ti-send" style="color:var(--green);font-size:16px"></i><div><div style="font-size:10px;color:var(--text-3)">SDI / PEC</div><div style="font-size:13px;font-weight:600;font-family:monospace">${c.sdi}${c.pec?` · ${c.pec}`:''}</div></div></div>`:''}
        </div>
        ${c.ind_consegna?`<div style="margin-top:10px;padding:9px 12px;background:var(--surface-2);border-radius:var(--r);font-size:13px"><i class="ti ti-truck-delivery" style="color:var(--brand);font-size:13px"></i> <strong>Consegna:</strong> ${c.ind_consegna}</div>`:''}
        ${c.ind_legale&&c.ind_legale!==c.ind_consegna?`<div style="margin-top:6px;padding:9px 12px;background:var(--surface-2);border-radius:var(--r);font-size:13px"><i class="ti ti-building" style="color:var(--text-2);font-size:13px"></i> <strong>Sede legale:</strong> ${c.ind_legale}</div>`:''}
      </div>
    </div>

    <!-- Sezione Note (stile Pipedrive) -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <div class="card-title"><i class="ti ti-notes" style="color:var(--brand)"></i>Note & Cronologia</div>
      </div>
      <div class="card-body" style="padding:14px">
        <!-- Input nuova nota -->
        <div style="display:flex;gap:10px;margin-bottom:16px">
          <div class="avatar" style="flex-shrink:0">${ini(currentUser?.nome||'?')}</div>
          <div style="flex:1">
            <textarea id="nota-input-${id}" placeholder="Scrivi una nota su questo cliente..." style="width:100%;min-height:70px;padding:10px;border:1.5px solid var(--border);border-radius:var(--r);font-size:13px;resize:vertical;font-family:inherit" onfocus="this.style.borderColor='var(--brand)'" onblur="this.style.borderColor='var(--border)'"></textarea>
            <div style="display:flex;justify-content:flex-end;margin-top:6px">
              <button class="btn btn-primary btn-sm" onclick="salvaNota(${id})"><i class="ti ti-check"></i>Salva nota</button>
            </div>
          </div>
        </div>
        <!-- Cronologia note -->
        <div id="note-feed-${id}">${renderNoteFeed(note, id)}</div>
      </div>
    </div>

    <!-- Ultimi ordini -->
    ${ordini.length?`
    <div class="card">
      <div class="card-header"><div class="card-title"><i class="ti ti-package" style="color:var(--brand)"></i>Ultimi ordini</div></div>
      <div style="padding:0">
        ${ordini.slice(0,5).map(o=>`
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border)">
            <div>
              <div style="font-size:13px;font-weight:600">${o.prodotto||'—'}</div>
              <div style="font-size:11px;color:var(--text-2)">${o.data||''} · ${o.quantita||''} ${o.um||''}</div>
            </div>
            <div style="font-size:14px;font-weight:700;color:var(--brand)">€${(parseFloat(o.importo)||0).toLocaleString('it-IT')}</div>
          </div>`).join('')}
      </div>
    </div>`:''
  }`;

  showPage('cliente-detail');
}

function renderNoteFeed(note, clienteId){
  if(!note.length) return `<div style="text-align:center;padding:16px 0;color:var(--text-3);font-size:13px"><i class="ti ti-notes" style="font-size:24px;display:block;margin-bottom:8px;opacity:0.3"></i>Nessuna nota ancora</div>`;
  return `<div style="position:relative;padding-left:28px">
    <div style="position:absolute;left:11px;top:0;bottom:0;width:2px;background:var(--border)"></div>
    ${note.map((n,i)=>{
      const data = new Date(n.created_at);
      const dataFmt = data.toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});
      const oraFmt = data.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
      return `
      <div style="position:relative;margin-bottom:${i<note.length-1?'14px':'0'}">
        <div style="position:absolute;left:-22px;top:10px;width:22px;height:22px;border-radius:50%;background:var(--brand-light);border:2px solid var(--brand);display:flex;align-items:center;justify-content:center">
          <i class="ti ti-note" style="font-size:10px;color:var(--brand)"></i>
        </div>
        <div style="background:var(--surface-2);border-radius:var(--r);padding:11px 13px;border-left:3px solid var(--brand-light)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <div style="font-size:11px;color:var(--text-3)">
              <strong style="color:var(--text-2)">${n.autore||'—'}</strong>
              · ${dataFmt} alle ${oraFmt}
            </div>
            <button class="btn btn-sm btn-icon btn-danger" onclick="eliminaNota(${n.id},${clienteId})" style="padding:2px 5px"><i class="ti ti-trash" style="font-size:11px"></i></button>
          </div>
          <div style="font-size:13px;color:var(--text);white-space:pre-line;line-height:1.5">${n.testo}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

async function salvaNota(clienteId){
  const inp = document.getElementById('nota-input-'+clienteId);
  const testo = inp?.value.trim();
  if(!testo) return;
  const r = await api.post('/api/clienti/'+clienteId+'/note', {testo, autore: currentUser?.nome||currentUser?.username||''});
  if(r.error){ alert('Errore: '+r.error); return; }
  inp.value='';
  // Ricarica note e aggiorna feed
  const note = await api.get('/api/clienti/'+clienteId+'/note');
  const feed = document.getElementById('note-feed-'+clienteId);
  if(feed) feed.innerHTML = renderNoteFeed(note.error?[]:note, clienteId);
}

async function eliminaNota(notaId, clienteId){
  conferma(async()=>{
    await api.del('/api/clienti/note/'+notaId);
    const note = await api.get('/api/clienti/'+clienteId+'/note');
    const feed = document.getElementById('note-feed-'+clienteId);
    if(feed) feed.innerHTML = renderNoteFeed(note.error?[]:note, clienteId);
  });
}




let _currentLeadDetailId = null;

function apriDettaglioLead(id){
  const l = state.leads.find(x=>x.id===id); if(!l) return;
  _currentLeadDetailId = id;

  const tagLabels = {cliente:'Cliente', potenziale:'Potenziale cliente', non_interessato:'Non interessato'};
  const tagColors = {cliente:'var(--green)', potenziale:'var(--orange)', non_interessato:'var(--red)'};
  const tagBg = {cliente:'#dcfce7', potenziale:'#fef3c7', non_interessato:'#fee2e2'};

  // Header
  document.getElementById('lead-detail-nome').textContent = l.nome;
  document.getElementById('lead-detail-sub').innerHTML = [
    l.citta, l.prodotto,
    l.tag ? `<span style="background:${tagBg[l.tag]||'#f3f4f6'};color:${tagColors[l.tag]||'var(--text-2)'};padding:1px 8px;border-radius:99px;font-size:11px;font-weight:700">${tagLabels[l.tag]||l.tag}</span>` : ''
  ].filter(Boolean).join(' · ');

  document.getElementById('lead-detail-edit-btn').onclick = ()=>editLead(id);
  document.getElementById('lead-detail-delete-btn').onclick = ()=>eliminaLead(id);

  // Info contatto sinistra
  const faseLabel = (state.fasi.find(f=>f.id===l.stato)||{}).label||l.stato||'—';
  const infoRows = [
    l.contatto ? ['Referente', l.contatto] : null,
    l.tel ? ['Telefono', `<a href="tel:${l.tel}" style="color:var(--blue);text-decoration:none">${l.tel}</a>`] : null,
    l.email ? ['Email', `<a href="mailto:${l.email}" style="color:var(--blue);text-decoration:none">${l.email}</a>`] : null,
    l.citta ? ['Città', l.citta] : null,
    l.prodotto ? ['Prodotto', l.prodotto] : null,
  ].filter(Boolean);

  document.getElementById('lead-detail-info').innerHTML = infoRows.length ?
    `<table style="width:100%;font-size:13px;padding-top:4px">
      ${infoRows.map(([k,v])=>`<tr><td style="color:var(--text-3);padding:6px 0;width:80px;font-size:11px;text-transform:uppercase;letter-spacing:0.3px">${k}</td><td style="font-weight:500;padding:6px 0">${v}</td></tr>`).join('')}
    </table>` : '<div style="color:var(--text-3);font-size:13px;padding:6px 0">Nessuna informazione aggiuntiva</div>';

  // Pipeline + fase con spostamento — carica sempre dal server
  const pipe = (state.pipelines||[]).find(p=>p.id===currentPipelineId)||{id:'default',nome:'Pipeline principale'};
  document.getElementById('lead-detail-pipeline').innerHTML = `
    <div style="padding-top:4px">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.3px;color:var(--text-3);margin-bottom:6px">Posizione attuale</div>
      <div style="display:inline-flex;align-items:center;gap:6px;background:var(--brand-light);color:var(--brand);padding:5px 12px;border-radius:99px;font-size:12px;font-weight:700;margin-bottom:16px" id="ld-fase-corrente">
        <span class="status-dot" style="background:var(--brand)"></span>${pipe.nome} → ${faseLabel}
      </div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.3px;color:var(--text-3);margin-bottom:8px">Sposta in</div>
      <div style="border:1.5px solid var(--border);border-radius:var(--r);overflow:hidden;background:#fff;margin-bottom:10px">
        <div style="padding:10px 12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">
          <i class="ti ti-layout-kanban" style="font-size:14px;color:var(--brand);flex-shrink:0"></i>
          <select id="ld-move-pipeline" onchange="aggiornaFasiSpostamento()" style="flex:1;border:none;outline:none;font-size:13px;background:transparent;color:var(--text);font-family:var(--font)">
            <option value="">Caricamento...</option>
          </select>
        </div>
        <div style="padding:10px 12px;display:flex;align-items:center;gap:8px">
          <i class="ti ti-flag" style="font-size:14px;color:var(--orange);flex-shrink:0"></i>
          <select id="ld-move-fase" style="flex:1;border:none;outline:none;font-size:13px;background:transparent;color:var(--text);font-family:var(--font)">
            <option value="">— scegli prima la pipeline —</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="spostaLeadPipelineFase(${id})" style="width:100%;justify-content:center">
        <i class="ti ti-arrows-right-left"></i>Sposta
      </button>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.3px;color:var(--text-3);margin:14px 0 4px">Aggiunto</div>
      <div style="font-size:13px;color:var(--text-2)">${l.created_at?new Date(l.created_at).toLocaleDateString('it-IT',{day:'numeric',month:'long',year:'numeric'}):'—'}</div>
    </div>`;

  // Prima chiudi TUTTI i pannelli, poi carica i dati e mostra la pagina
  ['info','pipeline'].forEach(n=>{
    const p=document.getElementById('lead-panel-'+n);
    const c=document.getElementById('chevron-'+n);
    if(p) p.style.display='none';
    if(c) c.style.transform='';
  });

  // Carica attività
  renderLeadDetailFeed(id);

  showPage('lead-detail');
}

function renderLeadDetailFeed(leadId){
  const attAll = (state.attivita||[]).filter(a=>
    a.lead_id===leadId || (a.collegata_tipo==='lead' && a.collegata_id===leadId)
  ).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));

  const future = attAll.filter(a=>!a.completata);
  const storia = attAll.filter(a=>a.completata);

  const futureEl = document.getElementById('lead-detail-future');
  const storyEl = document.getElementById('lead-detail-history');
  const futureCnt = document.getElementById('lead-detail-future-count');
  const storyCnt = document.getElementById('lead-detail-history-count');

  if(futureCnt) futureCnt.textContent = future.length ? `${future.length} in sospeso` : '';
  if(storyCnt) storyCnt.textContent = storia.length ? `${storia.length} eventi` : '';

  const icnMap={chiamata:'ti-phone',email:'ti-mail',ordine:'ti-package',nota:'ti-note'};
  const colMap={chiamata:'var(--blue)',email:'var(--orange)',ordine:'var(--green)',nota:'var(--gold)'};
  const labMap={chiamata:'Chiamata',email:'Email',ordine:'Ordine',nota:'Nota'};

  function renderItem(a, completata){
    const {cls,txt}=attDataLabel(a.data_scadenza||a.scadenza);
    const icn=icnMap[a.tipo]||'ti-checkbox';
    const col=colMap[a.tipo]||'var(--brand)';
    const lab=labMap[a.tipo]||a.tipo;
    const dataCreata = a.created_at ? new Date(a.created_at).toLocaleDateString('it-IT',{day:'2-digit',month:'short',year:'numeric'}) : '';
    const oraCreata = a.created_at ? new Date(a.created_at).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) : '';

    // Per email completate: mostra anteprima sintetica con espandibile
    const isEmail = a.tipo==='email' && completata;
    const emailPreview = isEmail && a.note ? `
      <div id="email-preview-${a.id}" style="margin-top:6px">
        <div style="font-size:12px;color:var(--text-2);background:var(--surface-2);border-radius:var(--r);padding:8px 10px;cursor:pointer;border-left:3px solid var(--orange)" onclick="toggleEmailExpand(${a.id})">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;font-weight:600;color:var(--orange)">✉ Email inviata — clicca per vedere</span>
            <i class="ti ti-chevron-down" id="email-chevron-${a.id}" style="font-size:12px;transition:transform .2s"></i>
          </div>
          <div id="email-body-${a.id}" style="display:none;margin-top:8px;font-size:12px;color:var(--text);border-top:1px solid var(--border);padding-top:8px;white-space:pre-line">${a.note}</div>
        </div>
      </div>` : '';

    return `
      <div style="display:flex;gap:10px;margin-bottom:12px;${completata?'opacity:0.75':''}" id="att-item-${a.id}">
        <div style="flex-shrink:0;width:30px;height:30px;border-radius:50%;background:${completata?'var(--surface-2)':col+'22'};border:2px solid ${completata?'var(--border)':col};display:flex;align-items:center;justify-content:center;margin-top:2px">
          <i class="ti ${completata?'ti-check':icn}" style="font-size:13px;color:${completata?'var(--text-3)':col}"></i>
        </div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
            <div style="flex:1;min-width:0">
              <span style="font-size:11px;font-weight:700;color:${col};text-transform:uppercase;letter-spacing:0.4px">${lab}</span>
              ${completata?'<span style="font-size:10px;background:#dcfce7;color:var(--green);padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">✓ Fatto</span>':''}
              <div style="font-size:13px;font-weight:600;margin-top:2px;${completata&&!isEmail?'text-decoration:line-through;color:var(--text-3)':'color:var(--text)'}">${a.titolo||lab}</div>
              ${!isEmail&&a.note?`<div style="font-size:12px;color:var(--text-2);margin-top:3px;white-space:pre-line">${a.note}</div>`:''}
              ${emailPreview}
            </div>
            <div style="flex-shrink:0;display:flex;gap:4px;align-items:flex-start">
              ${!completata?`
                <button class="btn btn-sm btn-icon" onclick="modificaAttivitaDettaglio(${a.id})" title="Modifica" style="padding:3px 6px"><i class="ti ti-pencil" style="font-size:12px"></i></button>
                <button class="btn btn-sm btn-icon" onclick="completaAttivitaDettaglio(${a.id})" title="Segna come fatto" style="padding:3px 6px"><i class="ti ti-check" style="color:var(--green);font-size:13px"></i></button>
              `:`
                <button class="btn btn-sm btn-icon" onclick="riattivaAttivitaDettaglio(${a.id})" title="Riapri attività" style="padding:3px 6px" title="Riattiva"><i class="ti ti-refresh" style="color:var(--orange);font-size:12px"></i></button>
                <button class="btn btn-sm btn-icon" onclick="modificaAttivitaDettaglio(${a.id})" title="Modifica" style="padding:3px 6px"><i class="ti ti-pencil" style="font-size:12px"></i></button>
              `}
              <button class="btn btn-sm btn-icon btn-danger" onclick="eliminaAttivitaDettaglio(${a.id})" title="Elimina" style="padding:3px 6px"><i class="ti ti-trash" style="font-size:11px"></i></button>
            </div>
          </div>
          <div style="font-size:10px;color:var(--text-3);margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${a.data_scadenza?`<span style="color:${cls==='scaduta'?'var(--red)':cls==='oggi'?'var(--orange)':'var(--text-3)'}">📅 ${txt}${a.ora?' · '+a.ora:''}</span>`:''}
            ${dataCreata?`<span>Creata il ${dataCreata} alle ${oraCreata}</span>`:''}
          </div>
        </div>
      </div>`;
  }

  if(futureEl) futureEl.innerHTML = future.length
    ? future.map(a=>renderItem(a,false)).join('')
    : '<div style="padding:10px 0;text-align:center;color:var(--text-3);font-size:13px">Nessuna attività in sospeso — usa i pulsanti sopra</div>';

  if(storyEl) storyEl.innerHTML = storia.length
    ? `<div style="position:relative;padding-left:28px">
        <div style="position:absolute;left:11px;top:0;bottom:0;width:2px;background:var(--border)"></div>
        ${storia.map(a=>`<div style="position:relative;margin-bottom:12px">
          <div style="position:absolute;left:-22px;top:6px;width:22px;height:22px;border-radius:50%;background:var(--surface-2);border:2px solid var(--border);display:flex;align-items:center;justify-content:center">
            <i class="ti ${icnMap[a.tipo]||'ti-check'}" style="font-size:10px;color:var(--text-3)"></i>
          </div>
          ${renderItem(a,true)}
        </div>`).join('')}
       </div>`
    : '<div style="padding:10px 0;text-align:center;color:var(--text-3);font-size:13px">Nessuna attività completata ancora</div>';
}

function toggleEmailExpand(attId){
  const body = document.getElementById('email-body-'+attId);
  const chevron = document.getElementById('email-chevron-'+attId);
  if(!body) return;
  const open = body.style.display==='block';
  body.style.display = open?'none':'block';
  if(chevron) chevron.style.transform = open?'':'rotate(180deg)';
}

async function modificaAttivitaDettaglio(attId){
  const a=(state.attivita||[]).find(x=>x.id===attId); if(!a) return;
  // Apri modal modifica attività precompilato
  document.getElementById('att-id').value=a.id;
  document.getElementById('att-titolo').value=a.titolo||'';
  document.getElementById('att-note').value=a.note||'';
  document.getElementById('att-data').value=(a.data_scadenza||'').slice(0,10);
  document.getElementById('att-ora').value=a.ora||'';
  document.getElementById('modal-att-title').textContent='Modifica attività';
  setTipoAtt(a.tipo||'chiamata');
  popolaPipelineModal();
  if(a.pipeline_id){
    document.getElementById('att-pipeline').value=a.pipeline_id;
    onAttPipelineChange();
    setTimeout(()=>{ if(a.lead_id) document.getElementById('att-lead').value=a.lead_id; },60);
  }
  openModal('modal-attivita');
}

async function riattivaAttivitaDettaglio(attId){
  await api.put('/api/attivita/'+attId,{completata:false});
  if(state.attivita){const a=state.attivita.find(x=>x.id===attId);if(a)a.completata=false;}
  aggiornaAttBadge();
  if(_currentLeadDetailId) renderLeadDetailFeed(_currentLeadDetailId);
  showSave();
}



function toggleLeadPanel(nome){
  const apertoInfo = document.getElementById('lead-panel-info')?.style.display !== 'none';
  const nuovoStato = apertoInfo ? 'none' : 'block';

  ['info','pipeline'].forEach(n=>{
    const p = document.getElementById('lead-panel-'+n);
    const c = document.getElementById('chevron-'+n);
    if(p) p.style.display = nuovoStato;
    if(c) c.style.transform = nuovoStato==='block' ? 'rotate(180deg)' : '';
  });

  if(nuovoStato==='block') caricaPipelinePerSpostamento();
}

function tornaAllaPipeline(){
  _currentLeadDetailId = null;
  showPage('pipeline');
}

async function caricaPipelinePerSpostamento(){
  const sel = document.getElementById('ld-move-pipeline');
  if(!sel) return;
  try{
    // Carica pipeline aggiornate dal server
    const pipes = await api.get('/api/pipelines');
    const tuttiPipes = (pipes.error||!pipes.length)
      ? [{id:'default',nome:'Pipeline principale'}]
      : [{id:'default',nome:'Pipeline principale'}, ...pipes];

    // Aggiorna state con pipeline fresche
    state.pipelines = tuttiPipes;

    sel.innerHTML = tuttiPipes.map(p=>`<option value="${p.id}">${p.nome}</option>`).join('');
    // Seleziona di default la pipeline corrente
    sel.value = currentPipelineId;
    // Carica le fasi di quella pipeline
    await aggiornaFasiSpostamento();
  }catch(e){
    sel.innerHTML = '<option value="">Errore caricamento</option>';
  }
}

async function aggiornaFasiSpostamento(){
  const pipId = document.getElementById('ld-move-pipeline')?.value;
  if(!pipId) return;
  const sel = document.getElementById('ld-move-fase');
  if(!sel) return;
  sel.innerHTML = '<option value="">Caricamento...</option>';

  // Prova prima dalla memoria locale
  let fasi = (state.fasi||[]).filter(f=>
    f.pipeline_id===pipId || (!f.pipeline_id && pipId==='default')
  );

  // Se non trova nulla (pipeline diversa da quella corrente), carica dal server
  if(!fasi.length){
    try{
      const r = await api.get('/api/fasi?pipeline_id='+pipId);
      if(!r.error && r.length) fasi = r;
    }catch(e){ fasi=[]; }
  }

  sel.innerHTML = fasi.length
    ? fasi.map(f=>`<option value="${f.id}">${f.label}</option>`).join('')
    : '<option value="">Nessuna fase disponibile</option>';
}

async function spostaLeadPipelineFase(leadId){
  const nuovaPipeline = document.getElementById('ld-move-pipeline')?.value;
  const nuovaFase = document.getElementById('ld-move-fase')?.value;
  if(!nuovaPipeline||!nuovaFase) return alert('Seleziona pipeline e fase');

  const l = state.leads.find(x=>x.id===leadId); if(!l) return;
  const btn = document.querySelector('#lead-detail-pipeline button');
  if(btn){ btn.disabled=true; btn.innerHTML='<i class="ti ti-loader"></i> Spostamento...'; }

  try{
    // Aggiorna sul server
    if(nuovaPipeline==='default'){
      await api.put('/api/leads/'+leadId, {...l, stato:nuovaFase});
      l.stato = nuovaFase;
    } else {
      // Prima rimuovi da eventuali altri stati di questa pipeline
      const esistente = (state.leadPipelineStato||[]).find(s=>s.lead_id===leadId&&s.pipeline_id===nuovaPipeline);
      if(esistente){
        await api.put('/api/lead-pipeline-stato/'+esistente.id, {stato:nuovaFase});
        esistente.stato = nuovaFase;
      } else {
        const r = await api.post('/api/lead-pipeline-stato', {lead_id:leadId, pipeline_id:nuovaPipeline, stato:nuovaFase});
        if(!r.error) { state.leadPipelineStato = state.leadPipelineStato||[]; state.leadPipelineStato.push(r); }
      }
      l.stato = nuovaFase;
    }

    // Recupera label fase dalla select (già caricata dal server)
    const faseSelOpt = document.getElementById('ld-move-fase');
    const faseLabel = faseSelOpt?.options[faseSelOpt.selectedIndex]?.text || nuovaFase;
    const pipelineLabel = (state.pipelines||[]).find(p=>p.id===nuovaPipeline)?.nome || 'Pipeline principale';

    // Aggiorna badge posizione attuale nella pagina dettaglio
    const faseEl = document.getElementById('ld-fase-corrente');
    if(faseEl) faseEl.innerHTML = `<span class="status-dot" style="background:var(--brand)"></span>${pipelineLabel} → ${faseLabel}`;

    // Switcha alla pipeline di destinazione e ridisegna — così vedi subito il lead nella nuova colonna
    if(nuovaPipeline !== currentPipelineId){
      currentPipelineId = nuovaPipeline;
      renderPipelineDropdownButton();
      await loadFasiPerPipeline(nuovaPipeline);
    }
    renderPipeline();
    showSave();

    // Toast invece di alert
    mostraToast(`✅ Spostato in ${pipelineLabel} → ${faseLabel}`);

  }catch(e){ alert('Errore: '+e.message); }
  if(btn){ btn.disabled=false; btn.innerHTML='<i class="ti ti-arrows-right-left"></i>Sposta'; }
}


// ── MODIFICA CLIENTE ──────────────────────────────────────────────────────
async function salvaCliente(){
  const nome=document.getElementById('cl-nome').value.trim(); if(!nome)return alert('Inserisci la ragione sociale');
  const tipoModal = document.getElementById('modal-cliente').dataset.tipo || 'cliente';
  const data=await api.post('/api/clienti',{
    tipo:tipoModal,
    nome, ref:document.getElementById('cl-ref').value,
    tel:document.getElementById('cl-tel').value,
    tel2:document.getElementById('cl-tel2')?.value || '',
    email:document.getElementById('cl-email').value,
    citta:document.getElementById('cl-citta').value,
    piva:document.getElementById('cl-piva').value.trim(),
    ind_legale:document.getElementById('cl-ind-legale').value.trim(),
    ind_consegna:document.getElementById('cl-ind-consegna').value.trim(),
    sdi:document.getElementById('cl-sdi').value.toUpperCase().trim(),
    pec:document.getElementById('cl-pec').value.trim(),
    prod:document.getElementById('cl-prod').value, note:document.getElementById('cl-note').value
  });
  if(!data.error) state.clienti.push(data);
  document.getElementById('modal-cliente').dataset.tipo = 'cliente';
  const title = document.querySelector('#modal-cliente .modal-title');
  if(title) title.textContent = 'Nuovo cliente';
  closeModal('modal-cliente');
  if(tipoModal==='fornitore') renderFornitori(); else renderClienti();
  renderDash(); showSave();
  ['cl-nome','cl-ref','cl-tel','cl-tel2','cl-email','cl-citta','cl-piva','cl-ind-legale','cl-ind-consegna','cl-sdi','cl-pec','cl-prod','cl-note'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
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
  ['nome','ref','tel','tel2','email','citta','piva','ind-legale','ind-consegna','sdi','pec','prod','note'].forEach(f=>{
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
    tel:document.getElementById('edit-cl-tel').value,
    tel2:document.getElementById('edit-cl-tel2')?.value || '',
    email:document.getElementById('edit-cl-email').value,
    citta:document.getElementById('edit-cl-citta').value,
    piva:document.getElementById('edit-cl-piva')?.value.trim()||'',
    ind_legale:document.getElementById('edit-cl-ind-legale')?.value.trim()||'',
    ind_consegna:document.getElementById('edit-cl-ind-consegna')?.value.trim()||'',
    sdi:document.getElementById('edit-cl-sdi').value.toUpperCase().trim(),
    pec:document.getElementById('edit-cl-pec').value.trim(),
    prod:document.getElementById('edit-cl-prod').value, note:document.getElementById('edit-cl-note').value
  };
  await api.put('/api/clienti/'+id, body);
  const aggiornati = await api.get('/api/clienti');
  if(!aggiornati.error) state.clienti = aggiornati;
  closeModal('modal-edit-cliente');
  renderClienti(); renderFornitori(); showSave();
}

// ══════════════════════════════════════════════════════════════════════════
// VIRTUAL COMPANY — widget dashboard e impostazioni
// ══════════════════════════════════════════════════════════════════════════

const VC_COLORI = { steven:'#A8412A', simona:'#e91e8c', mirko:'#1976d2' };
const VC_INIZIALI = { steven:'S', simona:'Si', mirko:'M' };

// Carica e mostra il widget dashboard
async function vcCaricaDashboard() {
  try {
    const r = await fetch('/api/vc/dashboard');
    const d = await r.json();
    const widget = document.getElementById('vc-dashboard-widget');
    const grid = document.getElementById('vc-figure-grid');
    if (!widget || !grid) return;

    if (!d.figure || !d.figure.length) { widget.style.display='none'; return; }

    // Calcola colonne in base al numero di figure
    const n = d.figure.length;
    grid.style.gridTemplateColumns = n === 1 ? '1fr' : n === 2 ? '1fr 1fr' : 'repeat(3,1fr)';
    widget.style.display = 'block';

    grid.innerHTML = d.figure.map(f => {
      const colore = VC_COLORI[f.figura] || '#888';
      const iniziale = VC_INIZIALI[f.figura] || f.figura[0].toUpperCase();
      const dati = f.dati || {};

      let badges = '';
      if (f.figura === 'steven') {
        if (dati.alert > 0) badges += `<span style="background:#fff3cd;color:#856404;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${dati.alert} alert</span>`;
        if (dati.task > 0) badges += `<span style="background:#cfe2ff;color:#084298;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${dati.task} task</span>`;
        if (dati.rischio > 0) badges += `<span style="background:#f8d7da;color:#842029;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${dati.rischio} a rischio</span>`;
      } else if (f.figura === 'simona') {
        badges += `<span style="background:#f8d7da;color:#842029;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${dati.rischio||0} clienti inattivi</span>`;
        badges += `<span style="background:#cfe2ff;color:#084298;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${dati.leads||0} lead</span>`;
      } else if (f.figura === 'mirko') {
        badges += `<span style="background:#f8d7da;color:#842029;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${dati.rischio||0} a rischio</span>`;
        badges += `<span style="background:#cfe2ff;color:#084298;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600">${dati.leads||0} lead</span>`;
      }

      return `<div onclick="vcApriAgente('${f.figura}')"
        style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px;cursor:pointer;transition:border-color 0.15s"
        onmouseover="this.style.borderColor='${colore}'"
        onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:32px;height:32px;border-radius:50%;background:${colore};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${iniziale}</div>
          <div>
            <div style="font-size:13px;font-weight:600;text-transform:capitalize">${f.figura}</div>
            <div style="font-size:11px;color:var(--text-2)">${f.ruolo_label}</div>
          </div>
          <div style="margin-left:auto;width:7px;height:7px;border-radius:50%;background:var(--green)"></div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${badges}</div>
        <div style="font-size:10px;color:var(--text-3);margin-top:8px">Clicca per aprire →</div>
      </div>`;
    }).join('');
  } catch(e) { console.error('[VC Dashboard]', e); }
}

// Apri Virtual Company sulla figura selezionata
function vcApriAgente(figura) {
  showPage('ai');
  setTimeout(() => {
    if (typeof selezionaAgente === 'function') selezionaAgente(figura);
  }, 100);
}

// Carica impostazioni nella pagina Impostazioni
async function vcCaricaImpostazioni() {
  try {
    const r = await fetch('/api/vc/impostazioni');
    const figure = await r.json();
    const lista = document.getElementById('vc-impostazioni-lista');
    if (!lista) return;

    lista.innerHTML = figure.map(f => {
      const colore = VC_COLORI[f.figura] || '#888';
      const iniziale = VC_INIZIALI[f.figura] || f.figura[0].toUpperCase();
      const descr = { steven:'Monitora pagamenti, consegne e FIC ogni ora', simona:'Campagne email, clienti inattivi, social media', mirko:'Pipeline, lead, clienti a rischio, offerte' };

      return `<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:14px 16px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:38px;height:38px;border-radius:50%;background:${colore};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">${iniziale}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;text-transform:capitalize">${f.figura}</div>
            <div style="font-size:12px;color:var(--text-2)">${f.ruolo_label} — ${descr[f.figura]||''}</div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <span style="font-size:12px;color:var(--text-2)">${f.attiva ? 'Attiva' : 'Non attiva'}</span>
            <input type="checkbox" id="vc-tog-${f.figura}" ${f.attiva?'checked':''} onchange="this.previousElementSibling.textContent=this.checked?'Attiva':'Non attiva'">
          </label>
        </div>
        ${f.figura === 'steven' ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:12px;color:var(--text-2);display:block;margin-bottom:4px">Assegna task a</label>
            <select id="vc-assegna-${f.figura}" style="width:100%;font-size:13px;padding:6px 8px;border:1px solid var(--border);border-radius:var(--r)">
              <option value="Giovanni" ${f.assegna_a==='Giovanni'?'selected':''}>Giovanni (tu)</option>
              <option value="Marco" ${f.assegna_a==='Marco'?'selected':''}>Marco (back office)</option>
              <option value="Entrambi" ${f.assegna_a==='Entrambi'?'selected':''}>Entrambi</option>
            </select>
          </div>
          <div>
            <label style="font-size:12px;color:var(--text-2);display:block;margin-bottom:4px">Notifica via</label>
            <select id="vc-notifica-${f.figura}" style="width:100%;font-size:13px;padding:6px 8px;border:1px solid var(--border);border-radius:var(--r)">
              <option value="email" ${f.notifica_via==='email'?'selected':''}>Email</option>
              <option value="whatsapp" ${f.notifica_via==='whatsapp'?'selected':''}>WhatsApp</option>
              <option value="entrambi" ${f.notifica_via==='entrambi'?'selected':''}>Email + WhatsApp</option>
            </select>
          </div>
        </div>` : ''}
      </div>`;
    }).join('');
  } catch(e) { console.error('[VC Impostazioni]', e); }
}

// Salva impostazioni
async function salvaVCImpostazioni() {
  const figure = ['steven','simona','mirko'];
  try {
    for (const f of figure) {
      const tog = document.getElementById(`vc-tog-${f}`);
      const assegna = document.getElementById(`vc-assegna-${f}`);
      const notifica = document.getElementById(`vc-notifica-${f}`);
      if (!tog) continue;
      await fetch(`/api/vc/impostazioni/${f}`, {
        method: 'PUT',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          attiva: tog.checked,
          assegna_a: assegna?.value || 'Giovanni',
          notifica_via: notifica?.value || 'email'
        })
      });
    }
    mostraToast('✅ Impostazioni Virtual Company salvate');
    vcCaricaDashboard(); // aggiorna widget dashboard
  } catch(e) { mostraToast('Errore: '+e.message, 'error'); }
}
