// app-core.js — Core: costanti, utils, API helpers, auth, navigation
// Generato automaticamente — NON modificare manualmente

// ── COSTANTI ──────────────────────────────────────────────────────────────
const PERMESSI = {
  admin:       {dashboard:true,pipeline:true,'lead-detail':true,'cliente-detail':true,contatti:true,ordini:true,contabilita:true,email:true,automazioni:true,ai:true,utenti:true,attivita:true,statistiche:true,impostazioni:true,task:true,whatsapp:true,fatture:true,spedizioni:true},
  commerciale: {dashboard:true,pipeline:true,'lead-detail':true,'cliente-detail':true,contatti:true,ordini:true,contabilita:false,email:true,automazioni:false,ai:true,utenti:false,attivita:true,statistiche:false,impostazioni:false,task:true,whatsapp:true,fatture:false,spedizioni:true},
  contabile:   {dashboard:true,pipeline:false,'lead-detail':false,'cliente-detail':true,contatti:true,ordini:false,contabilita:true,email:false,automazioni:false,ai:true,utenti:false,attivita:false,statistiche:true,impostazioni:false,task:true,whatsapp:false,fatture:true,spedizioni:false},
  magazzino:   {dashboard:true,pipeline:false,'lead-detail':false,'cliente-detail':false,contatti:false,ordini:true,contabilita:false,email:false,automazioni:false,ai:false,utenti:false,attivita:false,statistiche:false,impostazioni:false,task:true,whatsapp:false,fatture:false,spedizioni:true},
};
const ROLE_COLORS = {admin:'var(--brand)',commerciale:'var(--blue)',contabile:'var(--green)',magazzino:'var(--orange)'};
const ROLE_ICONS  = {admin:'👑',commerciale:'💼',contabile:'📊',magazzino:'📦'};
const PERM_LABELS = {dashboard:'Dashboard',pipeline:'Pipeline',contatti:'Contatti',ordini:'Ordini',contabilita:'Contabilità',email:'Email',automazioni:'Automazioni',ai:'AI',utenti:'Utenti',attivita:'Attività',statistiche:'Statistiche',impostazioni:'Impostazioni',task:'Task',whatsapp:'WhatsApp',fatture:'Fatture in Cloud',spedizioni:'Spedizioni'};

let currentUser = null;
// usersDB rimosso: gli utenti vivono SOLO nel database lato server (sicurezza)

let state = {
  fasi:[
    {id:'lead',label:'Lead',color:'var(--blue)'},
    {id:'campionatura',label:'Campionatura inviata',color:'var(--orange)'},
    {id:'attesa',label:'In attesa risposta',color:'var(--gold)'},
    {id:'acquisito',label:'Cliente acquisito',color:'var(--green)'},
  ],
  leads:[
    {id:1,nome:'Panificio Daoud Ilham',contatto:'Ilham',tel:'',citta:'Belpasso',prodotto:'Semola rimacinata di grano duro',stato:'acquisito',note:''},
    {id:2,nome:'Il Sorriso di Nicol Simonetta',contatto:'Simonetta',tel:'',citta:'Catania',prodotto:'Farina 00',stato:'acquisito',note:''},
    {id:3,nome:'Grasso Rosario',contatto:'Rosario',tel:'',citta:'Catania',prodotto:'Semola rimacinata di grano duro',stato:'acquisito',note:''},
    {id:4,nome:'Schloesslmuehle Des Silbernagl',contatto:'Stefan',tel:'',citta:'Germania',prodotto:'Semola',stato:'acquisito',note:''},
    {id:5,nome:'Nuovo panificio Catania',contatto:'',tel:'',citta:'Catania',prodotto:'Farina integrale',stato:'campionatura',note:''},
    {id:6,nome:'Ristorante Da Mario',contatto:'Mario',tel:'347 9988776',citta:'Palermo',prodotto:'Semola',stato:'lead',note:''},
    {id:7,nome:'Pasticceria Veneziana',contatto:'',tel:'',citta:'Messina',prodotto:'Farina 00',stato:'attesa',note:''},
  ],
  clienti:[
    {id:1,nome:'Panificio Daoud Ilham',ref:'Ilham',tel:'',email:'',citta:'Belpasso',ind:'',prod:'Semola rimacinata di grano duro',note:''},
    {id:2,nome:'Il Sorriso di Nicol Simonetta',ref:'Simonetta',tel:'',email:'',citta:'Catania',ind:'',prod:'Farina 00',note:''},
    {id:3,nome:'Grasso Rosario',ref:'Rosario',tel:'',email:'',citta:'Catania',ind:'',prod:'Semola rimacinata di grano duro',note:''},
    {id:4,nome:'Panetteria Pippo SAS',ref:'',tel:'',email:'',citta:'Sicilia',ind:'',prod:'Semola',note:''},
    {id:5,nome:'Schloesslmuehle Des Silbernagl',ref:'Stefan',tel:'',email:'',citta:'Germania',ind:'',prod:'Semola rimacinata di grano duro',note:''},
  ],
  ordini:[
    {id:1,cliente:'Grasso Rosario',prodotto:'Semola rimacinata di grano duro',qty:500,importo:499.20,data:'2024-01-31',stato:'consegnato',note:'Fatt. N. 5'},
    {id:2,cliente:'Schloesslmuehle Des Silbernagl',prodotto:'Semola rimacinata di grano duro',qty:720,importo:711.36,data:'2024-01-30',stato:'consegnato',note:'FT 153/A'},
    {id:3,cliente:'Il Sorriso di Nicol Simonetta',prodotto:'Farina 00',qty:320,importo:314.50,data:'2024-03-07',stato:'consegnato',note:''},
    {id:4,cliente:'Panificio Daoud Ilham',prodotto:'Semola rimacinata di grano duro',qty:370,importo:361.92,data:'2024-03-05',stato:'consegnato',note:''},
    {id:5,cliente:'Grasso Rosario',prodotto:'Semola rimacinata di grano duro',qty:510,importo:499.20,data:'2024-03-21',stato:'spedito',note:''},
    {id:6,cliente:'Panetteria Pippo SAS',prodotto:'Semola rimacinata di grano duro',qty:450,importo:436.80,data:'2024-07-09',stato:'aperto',note:''},
  ],
  movimenti:[
    {id:1,data:'2024-01-02',tipo:'entrata',importo:6600,cat:'Versamento contante',descrizione:'VERS. CONT. ATM/CASH RET'},
    {id:2,data:'2024-01-02',tipo:'entrata',importo:393.12,cat:'Bonifico cliente',descrizione:'BONIFICO - IL SORRISO DI NICOL SIMONETTA'},
    {id:3,data:'2024-01-05',tipo:'uscita',importo:669,cat:'Utenze',descrizione:'ENEL ENERGIA S P A'},
    {id:4,data:'2024-01-15',tipo:'uscita',importo:3063.29,cat:'Commissioni bancarie',descrizione:'CARTA DI CREDITO - NEXI'},
    {id:5,data:'2024-01-16',tipo:'uscita',importo:758.95,cat:'Mutuo',descrizione:'RIMBORSO MUTUO - RATA N.84'},
    {id:6,data:'2024-01-22',tipo:'entrata',importo:4050,cat:'Versamento contante',descrizione:'VERS. CONT. ATM/CASH RET'},
    {id:7,data:'2024-01-31',tipo:'entrata',importo:499.20,cat:'Bonifico cliente',descrizione:'BONIFICO - GRASSO ROSARIO'},
    {id:8,data:'2024-02-13',tipo:'uscita',importo:16674.84,cat:'Assegno',descrizione:'VS. ASSEGNO 05036-84090'},
    {id:9,data:'2024-03-01',tipo:'entrata',importo:4500,cat:'Versamento contante',descrizione:'VERS. CONT. ATM/CASH RET'},
    {id:10,data:'2024-06-03',tipo:'entrata',importo:5600,cat:'Versamento contante',descrizione:'VERS. CONT. ATM/CASH RET'},
  ],
  nextLeadId:8,nextClienteId:6,nextOrdineId:7,nextMovId:11,nextUserId:6,nextFaseId:5,
  ordiniFilter:'tutti',contabFilter:'tutti',
};

// ── UTILS ─────────────────────────────────────────────────────────────────
const fmt = n => '€' + parseFloat(n||0).toLocaleString('it-IT',{minimumFractionDigits:2,maximumFractionDigits:2});
const ini = s => (s||'').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();

// ── API HELPERS ───────────────────────────────────────────────────────────
const api = {
  get: url => fetch(url).then(r=>r.json()),
  post: (url,data) => fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  put: (url,data) => fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  patch: (url,data) => fetch(url,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(r=>r.json()),
  del: url => fetch(url,{method:'DELETE'}).then(r=>r.json()),
};

async function loadAllData() {
  try {
    const [fasi, leads, clienti, ordini, movimenti, attivita, tasks] = await Promise.all([
      api.get('/api/fasi'),
      api.get('/api/leads'),
      api.get('/api/clienti'),
      api.get('/api/ordini'),
      api.get('/api/movimenti'),
      api.get('/api/attivita'),
      api.get('/api/tasks'),
    ]);
    state.fasi = fasi.error ? state.fasi : fasi;
    state.leads = leads.error ? [] : leads;
    state.clienti = clienti.error ? [] : clienti;
    state.ordini = ordini.error ? [] : ordini;
    state.movimenti = movimenti.error ? [] : movimenti;
    state.attivita = attivita.error ? [] : attivita;
    state.tasks = tasks.error ? [] : tasks;
    state.leadPipelineStato = [];
    aggiornaAttBadge();
    aggiornaTaskBadge();
    renderDashTask();
    await caricaUtentiPerTask();
    await loadTemplates();
    aggiornaContatoreBozze();
  } catch(e){ console.warn('API non disponibile, uso dati locali'); }
}

function saveData() {} // no-op, i dati si salvano via API
function loadData() {} // no-op, i dati si caricano via API
function showSave() {
  let n = document.getElementById('sv-notif');
  if(!n){n=document.createElement('div');n.id='sv-notif';n.style.cssText='position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:9px 15px;border-radius:8px;font-size:12px;font-weight:500;z-index:9999;display:flex;align-items:center;gap:7px;box-shadow:0 4px 12px rgba(0,0,0,.15);opacity:0;transition:opacity .3s;pointer-events:none';n.innerHTML='<i class="ti ti-check" style="color:#4ade80"></i> Salvato';document.body.appendChild(n);}
  n.style.opacity='1'; clearTimeout(n._t); n._t=setTimeout(()=>n.style.opacity='0',1800);
}

// ── AUTH ──────────────────────────────────────────────────────────────────
function togglePass(iId,eId){const i=document.getElementById(iId),e=document.getElementById(eId);i.type=i.type==='password'?'text':'password';e.className=i.type==='password'?'ti ti-eye':'ti ti-eye-off';}
function switchView(id){document.querySelectorAll('.login-view').forEach(v=>v.classList.remove('active'));document.getElementById(id).classList.add('active');['login-error','reg-error','reg-success','reset-error','reset-success'].forEach(x=>{const el=document.getElementById(x);if(el)el.style.display='none';});}

async function doLogin(){
  const u=document.getElementById('login-user').value.trim().toLowerCase();
  const p=document.getElementById('login-pass').value;
  const err=document.getElementById('login-error');
  const btn=document.querySelector('#view-login .login-btn');
  btn.textContent='Accesso...'; btn.disabled=true;
  try {
    const data = await api.post('/api/login', {username:u, password:p});
    if(data.error){err.textContent=data.error;err.style.display='block';return;}
    currentUser=data.user;
    // Salva la scadenza sessione (8 ore)
    if(data.sessionExpiry) localStorage.setItem('vv_session_expiry', data.sessionExpiry);
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-screen').style.display='flex';
    await loadAllData();
    applyPermissions(); renderDash();
    if(typeof initDashAgenteChat==='function')initDashAgenteChat();
    // Avvia controllo scadenza sessione ogni minuto
    iniziaControlloScadenza();
  } catch(e){err.textContent='Errore di connessione.';err.style.display='block';}
  finally{btn.textContent='Accedi';btn.disabled=false;}
}

function iniziaControlloScadenza(){
  clearInterval(window._sessionCheckInterval);
  window._sessionCheckInterval = setInterval(()=>{
    const expiry = parseInt(localStorage.getItem('vv_session_expiry')||'0');
    if(expiry && Date.now() > expiry){
      clearInterval(window._sessionCheckInterval);
      alert('La tua sessione è scaduta. Effettua di nuovo il login.');
      doLogout();
    }
  }, 60000); // controlla ogni minuto
}

function doLogout(){
  currentUser=null;
  localStorage.removeItem('vv_session_expiry');
  clearInterval(window._sessionCheckInterval);
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-screen').style.display='none';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
}

async function doRegister(){
  const nome=document.getElementById('reg-nome').value.trim(),user=document.getElementById('reg-user').value.trim().toLowerCase(),email=document.getElementById('reg-email').value.trim(),pass=document.getElementById('reg-pass').value,ruolo=document.getElementById('reg-role').value;
  const err=document.getElementById('reg-error'),ok=document.getElementById('reg-success');
  err.style.display='none';ok.style.display='none';
  if(!nome||!user||!email||!pass){err.textContent='Compila tutti i campi.';err.style.display='block';return;}
  if(pass.length<6){err.textContent='Password min. 6 caratteri.';err.style.display='block';return;}
  const data = await api.post('/api/register', {nome,username:user,password:pass,ruolo,email});
  if(data.error){err.textContent=data.error;err.style.display='block';return;}
  ok.textContent='Account creato! Attendi approvazione.'; ok.style.display='block';
  setTimeout(()=>switchView('view-login'),2500);
}
async function doReset(){
  const email=document.getElementById('reset-email').value.trim().toLowerCase(),pass=document.getElementById('reset-pass').value,pass2=document.getElementById('reset-pass2').value;
  const err=document.getElementById('reset-error'),ok=document.getElementById('reset-success');
  err.style.display='none';ok.style.display='none';
  if(!email||!pass||!pass2){err.textContent='Compila tutti i campi.';err.style.display='block';return;}
  if(pass!==pass2){err.textContent='Le password non coincidono.';err.style.display='block';return;}
  if(pass.length<6){err.textContent='Min. 6 caratteri.';err.style.display='block';return;}
  const data = await api.post('/api/reset-password', {email, password:pass});
  if(data.error){err.textContent=data.error;err.style.display='block';return;}
  ok.textContent='Password aggiornata!'; ok.style.display='block';
  setTimeout(()=>switchView('view-login'),2000);
}

function applyPermissions(){
  const perms=PERMESSI[currentUser.ruolo]||{};
  document.getElementById('s-av').textContent=ini(currentUser.nome);
  document.getElementById('s-name').textContent=currentUser.nome.split(' ')[0];
  document.getElementById('s-role').textContent=currentUser.ruolo;
  document.getElementById('dash-user-badge').innerHTML=`<span class="badge badge-${currentUser.ruolo}">${ROLE_ICONS[currentUser.ruolo]} ${currentUser.ruolo}</span>`;
  ['pipeline','lead-detail','cliente-detail','contatti','ordini','contabilita','email','whatsapp','automazioni','ai','utenti','attivita','statistiche','impostazioni','task','fatture','spedizioni'].forEach(p=>{
    const nav=document.getElementById('nav-'+p); if(nav) nav.classList.toggle('disabled',!perms[p]);
  });
}
function canDo(a){return currentUser&&(PERMESSI[currentUser.ruolo]||{})[a];}

// ── NAVIGATION ────────────────────────────────────────────────────────────
function showPage(id){
  if(!canDo(id)){alert('Non hai i permessi per questa sezione.');return;}
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  const navEl = document.getElementById('nav-'+id);
  if(navEl) navEl.classList.add('active');
  if(id==='attivita')renderPageAttivita();
  if(id==='task'){
    // Pill "Tutte" visibile solo per admin
    const pillTutte = document.getElementById('pill-task-tutte');
    if(pillTutte){
      const isAdmin = currentUser?.ruolo === 'admin';
      pillTutte.style.display = isAdmin ? '' : 'none';
      // Se non admin e il filtro attivo è "tutte", passa a "mie"
      if(!isAdmin && taskFilter === 'tutte'){
        taskFilter = 'mie';
        document.querySelectorAll('#task-pills .pill').forEach(p=>p.classList.remove('active'));
        document.querySelectorAll('#task-pills .pill')[1]?.classList.add('active');
      }
    }
    renderTaskBoard();
  }
  if(id==='statistiche')renderStatistiche();
  if(id==='automazioni'){ renderAutomazioni(); caricaLogAutomazioni(); }
  if(id==='pipeline'){ initPipelinePage(); }
  if(id==='contatti'){ renderClienti(); renderFornitori(); }
  if(id==='ordini')renderOrdini();
  if(id==='contabilita')renderContab();
  if(id==='dashboard'){ renderDash(); if(typeof initDashAgenteChat==='function')initDashAgenteChat(); }

  if(id==='email')checkGmailStatus();
  if(id==='fatture')initPaginaFatture();
  if(id==='whatsapp'){ loadWaChats(); } else { if(waPollingInterval){ clearInterval(waPollingInterval); waPollingInterval=null; } }
  if(id==='spedizioni'){ 
    // Reset alla tab Spedizioni ogni volta che si apre la pagina
    switchSpedizioniTab('spedizioni', document.querySelector('#sped-tabs .pill'));
    initPaginaSpedizioni(); 
  }
  if(id==='utenti')renderUtenti();
  if(id==='impostazioni'){ renderUtenti(); caricaConflitti(); aggiornaStatoGmail(); caricaStatoWhatsApp(); }
  if(id==='ai'){ if(typeof applicaFiltroFigura==='function')applicaFiltroFigura(); aggiornaStatoAgente(); caricaCronologiaChat(_agenteAttivo || 'steven'); if(typeof caricaConoscenza==='function')caricaConoscenza(); }
}
function openModal(id){
  if(id==='modal-ordine'){
    // Il modal ordine ora viene gestito da apriNuovoOrdine()
    // Non fare nulla qui per evitare conflitti
  }
  if(id==='modal-movimento'){
    document.getElementById('mov-data').value=new Date().toISOString().slice(0,10);
    document.getElementById('mov-tipo').value='entrata';
    document.getElementById('mov-importo-netto').value='';
    document.getElementById('mov-importo').value='';
    document.getElementById('mov-importo-preview').textContent='€0,00';
    document.getElementById('mov-desc').value='';
    document.getElementById('mov-metodo-pagamento').value='';
    const pagatoSiRadio = document.querySelector('input[name="mov-pagato-radio"][value="si"]');
    if(pagatoSiRadio) pagatoSiRadio.checked=true;
    toggleMetodoPagamentoVisibility('mov');
    document.getElementById('mov-prodotti-list').innerHTML='';
    aggiungiRigaProdotto('mov');
    toggleProdottiSection('mov');
    populateCatSelect('mov-cat');
    document.getElementById('mov-cat-custom').style.display='none';
  }
  if(id==='modal-edit-movimento'){
    populateCatSelect('edit-mov-cat');
    document.getElementById('edit-mov-cat-custom').style.display='none';
  }
  if(id==='modal-lead'||id==='modal-edit-lead') populateFasiSelects();
  document.getElementById(id).classList.add('open');
}
function closeModal(id){document.getElementById(id).classList.remove('open');}

