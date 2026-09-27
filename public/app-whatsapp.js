// app-whatsapp.js — Conversazioni WhatsApp dentro il gestionale
// I messaggi arrivano da Twilio al webhook del server; qui si leggono e si
// risponde. Regola di WhatsApp: si può scrivere liberamente solo entro 24 ore
// dall'ultimo messaggio del cliente.

let _waChat = null;          // telefono della conversazione aperta
let _waConversazioni = [];
let _waTimer = null;

const waOra = d => new Date(d).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});

function waQuando(d){
  if(!d) return '';
  const data = new Date(d), oggi = new Date();
  if(data.toDateString() === oggi.toDateString()) return waOra(d);
  const ieri = new Date(oggi); ieri.setDate(ieri.getDate()-1);
  if(data.toDateString() === ieri.toDateString()) return 'ieri';
  return data.toLocaleDateString('it-IT', {day:'2-digit', month:'2-digit'});
}

async function caricaWhatsapp(){
  try{
    const c = await api.get('/api/whatsapp/conversazioni');
    if(c.error) throw new Error(c.error);
    _waConversazioni = Array.isArray(c) ? c : [];
    renderListaChat();
    if(_waChat) apriChatWhatsapp(_waChat, true);
    aggiornaBadgeWhatsapp();
  }catch(e){
    const l = document.getElementById('wa-chats-list');
    if(l) l.innerHTML = `<div style="padding:18px;font-size:13px;color:var(--text-3)">Conversazioni non disponibili.</div>`;
  }
  // ricarico ogni 30 secondi finché resto sulla pagina
  clearInterval(_waTimer);
  _waTimer = setInterval(() => {
    const attiva = document.getElementById('page-whatsapp')?.classList.contains('active');
    if(!attiva){ clearInterval(_waTimer); _waTimer = null; return; }
    caricaWhatsapp();
  }, 30000);
}

function renderListaChat(){
  const box = document.getElementById('wa-chats-list');
  if(!box) return;
  if(!_waConversazioni.length){
    box.innerHTML = `<div style="padding:20px;font-size:13px;color:var(--text-3);text-align:center">
      Nessuna conversazione.<br><span style="font-size:12px">Compaiono qui quando un cliente scrive al numero del mulino, oppure quando cominci tu una chat.</span></div>`;
    return;
  }
  box.innerHTML = _waConversazioni.map(c => `
    <div onclick="apriChatWhatsapp('${c.telefono}')"
         style="display:flex;gap:10px;padding:11px 14px;cursor:pointer;border-bottom:1px solid #f0f2f5;
                background:${_waChat === c.telefono ? '#f0f2f5' : '#fff'}">
      <div style="width:38px;height:38px;border-radius:50%;background:#25D366;color:#fff;display:flex;
                  align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0">
        ${(c.nome || '?').charAt(0).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1">${c.nome || c.telefono}</span>
          <span style="font-size:11px;color:var(--text-3)">${waQuando(c.ultimo_il)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
          <span style="flex:1;font-size:12px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.ultimo_testo || ''}</span>
          ${Number(c.non_letti) > 0 ? `<span style="background:#25D366;color:#fff;border-radius:10px;padding:1px 7px;font-size:10.5px;font-weight:700">${c.non_letti}</span>` : ''}
        </div>
        ${c.cliente_id ? '<div style="font-size:10.5px;color:var(--brand);margin-top:2px">cliente</div>'
          : c.lead_id ? '<div style="font-size:10.5px;color:var(--blue);margin-top:2px">lead</div>' : ''}
      </div>
    </div>`).join('');
}

async function apriChatWhatsapp(telefono, silenzioso){
  _waChat = telefono;
  const c = _waConversazioni.find(x => x.telefono === telefono) || {telefono};
  const box = document.getElementById('wa-conversation');
  if(!box) return;
  if(!silenzioso) renderListaChat();

  let messaggi = [];
  try{
    const m = await api.get('/api/whatsapp/messaggi?telefono=' + encodeURIComponent(telefono));
    messaggi = Array.isArray(m) ? m : [];
  }catch(e){}

  const aperta = c.finestra_aperta !== false;
  box.innerHTML = `
    <div style="background:#f0f2f5;padding:11px 16px;display:flex;align-items:center;gap:11px;border-bottom:1px solid #e9edef">
      <div style="width:36px;height:36px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">
        ${(c.nome || '?').charAt(0).toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px">${c.nome || telefono}</div>
        <div style="font-size:11.5px;color:var(--text-3)">${telefono}${c.cliente_id ? ' · cliente' : c.lead_id ? ' · lead' : ''}</div>
      </div>
      ${c.cliente_id ? `<button class="btn btn-sm" onclick="showPage('contatti')"><i class="ti ti-user"></i>Scheda</button>` : ''}
    </div>

    <div id="wa-messaggi" style="flex:1;overflow-y:auto;padding:16px;background:#ECE5DD">
      ${messaggi.length ? messaggi.map(m => {
        const mio = m.direzione === 'out';
        return `<div style="display:flex;justify-content:${mio ? 'flex-end' : 'flex-start'};margin-bottom:7px">
          <div style="max-width:70%;background:${mio ? '#DCF8C6' : '#fff'};border-radius:8px;padding:7px 10px;
                      box-shadow:0 1px 1px rgba(0,0,0,.08);font-size:13.5px;line-height:1.45">
            ${m.media_url ? `<a href="${m.media_url}" target="_blank" style="color:var(--blue)">[allegato]</a><br>` : ''}
            ${(m.testo || '').replace(/</g,'&lt;').replace(/\n/g,'<br>')}
            <div style="font-size:10px;color:#888;text-align:right;margin-top:3px">
              ${waOra(m.created_at)}${mio && m.stato ? ' · ' + m.stato : ''}</div>
          </div></div>`;
      }).join('') : '<div style="text-align:center;color:#888;font-size:13px;padding:30px">Nessun messaggio</div>'}
    </div>

    ${aperta ? `
      <div style="background:#f0f2f5;padding:10px 14px;display:flex;gap:9px;align-items:flex-end">
        <textarea id="wa-testo" rows="1" placeholder="Scrivi un messaggio..."
          style="flex:1;border:0;border-radius:20px;padding:10px 15px;font-size:13.5px;resize:none;max-height:100px;font-family:inherit"
          oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();inviaWhatsappChat();}"></textarea>
        <button onclick="inviaWhatsappChat()" id="wa-btn-invia"
          style="background:#25D366;border:0;color:#fff;width:42px;height:42px;border-radius:50%;cursor:pointer;font-size:17px">
          <i class="ti ti-send"></i></button>
      </div>`
    : `<div style="background:#fff8e6;padding:13px 16px;font-size:12.5px;color:#8a6d1a;border-top:1px solid #f0e0b0">
        <strong>Finestra chiusa.</strong> Sono passate più di 24 ore dall'ultimo messaggio del cliente:
        WhatsApp non permette di scrivergli liberamente. Puoi chiamarlo, oppure aspettare che risponda lui.
      </div>`}`;

  const m = document.getElementById('wa-messaggi');
  if(m) m.scrollTop = m.scrollHeight;
  if(!silenzioso) setTimeout(()=>document.getElementById('wa-testo')?.focus(), 80);
}

async function inviaWhatsappChat(){
  const inp = document.getElementById('wa-testo');
  const testo = (inp?.value || '').trim();
  if(!testo || !_waChat) return;
  const btn = document.getElementById('wa-btn-invia');
  if(btn) btn.disabled = true;
  try{
    const r = await api.post('/api/whatsapp/invia', {telefono: _waChat, testo});
    if(r.error) return alert(r.error);
    if(inp){ inp.value = ''; inp.style.height = 'auto'; }
    await caricaWhatsapp();
    apriChatWhatsapp(_waChat, true);
  }catch(e){ alert('Errore: ' + e.message); }
  finally{ if(btn) btn.disabled = false; }
}

// Comincia una conversazione scegliendo dalla rubrica
async function apriNuovaChatWhatsapp(){
  let rubrica = [];
  try{
    const r = await api.get('/api/whatsapp/rubrica');
    rubrica = Array.isArray(r) ? r : [];
  }catch(e){}
  const nome = prompt(`Scrivi il nome del cliente o il numero di telefono.\n\n${rubrica.length} contatti con recapito in anagrafica.`);
  if(!nome) return;

  const cerca = nome.toLowerCase().trim();
  const trovati = rubrica.filter(c => (c.nome||'').toLowerCase().includes(cerca));
  let telefono = null;

  if(/^[0-9+\s]{8,}$/.test(nome)) telefono = nome.trim();
  else if(trovati.length === 1) telefono = trovati[0].telefono;
  else if(trovati.length > 1){
    const elenco = trovati.slice(0,10).map((c,i) => `${i+1}. ${c.nome} — ${c.telefono}`).join('\n');
    const scelta = prompt(`Ho trovato più contatti:\n\n${elenco}\n\nScrivi il numero della riga:`);
    const i = parseInt(scelta) - 1;
    if(trovati[i]) telefono = trovati[i].telefono;
  } else {
    return alert('Nessun contatto trovato con questo nome. Puoi scrivere direttamente il numero di telefono.');
  }
  if(!telefono) return;

  _waChat = telefono.replace(/[^0-9+]/g, '');
  if(!_waConversazioni.some(c => c.telefono === _waChat)){
    _waConversazioni.unshift({telefono: _waChat, nome: trovati[0]?.nome || _waChat, finestra_aperta: true});
    renderListaChat();
  }
  apriChatWhatsapp(_waChat);
}

async function aggiornaBadgeWhatsapp(){
  const n = _waConversazioni.reduce((s,c) => s + (Number(c.non_letti)||0), 0);
  const nav = document.getElementById('nav-whatsapp');
  if(!nav) return;
  let b = nav.querySelector('.nav-badge');
  if(n > 0){
    if(!b){ b = document.createElement('span'); b.className = 'nav-badge'; nav.appendChild(b); }
    b.textContent = n;
  } else if(b) b.remove();
}

window.caricaWhatsapp = caricaWhatsapp;
window.apriChatWhatsapp = apriChatWhatsapp;
window.inviaWhatsappChat = inviaWhatsappChat;
window.apriNuovaChatWhatsapp = apriNuovaChatWhatsapp;
