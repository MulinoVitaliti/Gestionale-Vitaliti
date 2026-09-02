// app-followup.js — Monitoraggio ordini spediti
// Percorso post-spedizione: avviso partenza → verifica → riordino.
// Le email partono dall'account Gmail "spedizioni".

let _fupFiltro = 'in_corso';

const FUP_ETICHETTE = {
  partenza: 'Avviso partenza merce',
  verifica: 'Come si trova',
  riordino: 'Proposta riordino'
};
const FUP_CONSEGNA = {
  in_viaggio:  { testo: 'In viaggio',  colore: 'var(--blue)',   icona: 'ti-truck' },
  in_consegna: { testo: 'In consegna', colore: 'var(--orange)', icona: 'ti-truck-delivery' },
  consegnata:  { testo: 'Consegnata',  colore: 'var(--green)',  icona: 'ti-package-import' },
  giacenza:    { testo: 'In giacenza', colore: 'var(--orange)', icona: 'ti-alert-triangle' },
  problema:    { testo: 'Problema',    colore: 'var(--red)',    icona: 'ti-alert-circle' }
};

const FUP_STATO_TAPPA = {
  programmata:  { testo: 'Programmata',   colore: 'var(--text-3)' },
  in_attesa_ok: { testo: 'Da approvare',  colore: 'var(--orange)' },
  inviata:      { testo: 'Inviata',       colore: 'var(--green)'  },
  saltata:      { testo: 'Saltata',       colore: 'var(--text-3)' },
  annullata:    { testo: 'Annullata',     colore: 'var(--text-3)' }
};

// Anteprima: se il modello e' HTML lo mostro formattato, se e' testo semplice metto gli a capo
function fupAnteprima(corpo){
  const c = String(corpo || '');
  return /<(p|br|div|strong|b|em|i|u|ul|ol|li|a|span)\b/i.test(c)
    ? c
    : c.replace(/</g,'&lt;').replace(/\n/g,'<br>');
}

function fupData(d){ return d ? new Date(d).toLocaleDateString('it-IT') : '—'; }

async function caricaFollowup(){
  const box = document.getElementById('fup-lista');
  if(!box) return;
  box.innerHTML = '<div style="padding:18px;color:var(--text-3);font-size:13px">Caricamento...</div>';
  try{
    const [righe, ries] = await Promise.all([
      api.get('/api/followup?stato=' + _fupFiltro),
      api.get('/api/followup/riepilogo')
    ]);
    renderFupRiepilogo(ries);
    if(!Array.isArray(righe) || !righe.length){
      box.innerHTML = '<div style="padding:22px;text-align:center;color:var(--text-3);font-size:13px">Nessun ordine in questo elenco.<br><span style="font-size:12px">I percorsi si creano da soli quando arriva un nuovo DDT da Fatture in Cloud.</span></div>';
      return;
    }
    box.innerHTML = righe.map(r => {
      const stato = r.stato === 'in_corso'
        ? (Number(r.da_approvare) ? `<span style="color:var(--orange);font-weight:600">${r.da_approvare} da approvare</span>`
                                  : '<span style="color:var(--green)">In corso</span>')
        : r.stato === 'completato' ? '<span style="color:var(--text-3)">Completato</span>'
        : `<span style="color:var(--text-3)">Fermato</span>`;
      const prossima = r.prossima_tappa
        ? `${FUP_ETICHETTE[r.prossima_tappa] || r.prossima_tappa} · ${fupData(r.prossima_data)}`
        : '—';
      const allarmeEmail = (!r.email_dest)
        ? '<i class="ti ti-mail-off" title="Nessuna email in anagrafica" style="color:var(--red);margin-left:6px"></i>' : '';
      return `<div onclick="apriFollowup(${r.id})" style="display:flex;align-items:center;gap:14px;padding:11px 16px;border-bottom:1px solid var(--border);cursor:pointer" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.cliente_nome}${allarmeEmail}</div>
          <div style="font-size:11px;color:var(--text-3)">DDT ${r.ddt_numero || '—'} del ${fupData(r.ddt_data)}${r.importo ? ' · € ' + Number(r.importo).toFixed(0) : ''}</div>
        </div>
        <div style="width:130px">${(() => { const c = FUP_CONSEGNA[r.stato_consegna] || FUP_CONSEGNA.in_viaggio;
            return `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:${c.colore}"><i class="ti ${c.icona}"></i>${c.testo}</span>`; })()}</div>
        <div style="width:200px;font-size:12px;color:var(--text-2)">${prossima}</div>
        <div style="width:130px;text-align:right;font-size:12px">${stato}</div>
        <i class="ti ti-chevron-right" style="color:var(--text-3)"></i>
      </div>`;
    }).join('');
  }catch(e){
    box.innerHTML = '<div style="padding:18px;color:var(--text-3);font-size:13px">Errore nel caricamento.</div>';
  }
}

function renderFupRiepilogo(r){
  const box = document.getElementById('fup-riepilogo');
  if(!box || !r || r.error) return;
  const card = (n, testo, colore) => `<div class="card" style="padding:14px 16px">
      <div style="font-size:24px;font-weight:700;color:${colore}">${n || 0}</div>
      <div style="font-size:11px;color:var(--text-3);margin-top:2px">${testo}</div>
    </div>`;
  box.innerHTML =
    card(r.in_corso, 'Ordini seguiti', 'var(--brand)') +
    card(r.da_approvare, 'Email da approvare', 'var(--orange)') +
    card(r.riordini_vicini, 'Riordini entro 7 giorni', 'var(--green)') +
    card(r.senza_email, 'Clienti senza email', r.senza_email > 0 ? 'var(--red)' : 'var(--text-3)');
}

function filtraFollowup(stato, el){
  _fupFiltro = stato;
  document.querySelectorAll('#fup-pills .pill').forEach(p => p.classList.remove('active'));
  if(el) el.classList.add('active');
  caricaFollowup();
}

async function apriFollowup(id){
  openModal('modal-followup-dettaglio');
  const body = document.getElementById('fupd-body');
  body.innerHTML = '<div style="padding:20px;color:var(--text-3)">Caricamento...</div>';
  try{
    const d = await api.get('/api/followup/' + id);
    if(d.error) throw new Error(d.error);
    const s = d.spedizione;
    document.getElementById('fupd-titolo').textContent = s.cliente_nome;

    const testa = `<div style="display:flex;gap:20px;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid var(--border);margin-bottom:14px;font-size:12px">
        <div><div style="color:var(--text-3);font-size:10px">DOCUMENTO</div>DDT ${s.ddt_numero || '—'} del ${fupData(s.ddt_data)}</div>
        <div><div style="color:var(--text-3);font-size:10px">STATO SPEDIZIONE</div>
          <select id="fupd-consegna" onchange="cambiaStatoConsegna(${id})" style="padding:3px 6px;border:1px solid var(--border);border-radius:6px;font-size:12px">
            ${Object.entries(FUP_CONSEGNA).map(([k,v]) => `<option value="${k}" ${s.stato_consegna===k?'selected':''}>${v.testo}</option>`).join('')}
          </select>${s.consegnata_il ? ` <span style="font-size:11px;color:var(--text-3)">il ${fupData(s.consegnata_il)}</span>` : ''}
        </div>
        <div style="flex:1;min-width:200px"><div style="color:var(--text-3);font-size:10px">EMAIL DESTINATARIO</div>
          <input id="fupd-email" value="${s.email_dest || ''}" placeholder="manca — scrivila qui" style="width:100%;padding:4px 8px;border:1px solid ${s.email_dest?'var(--border)':'var(--red)'};border-radius:6px;font-size:12px">
        </div>
        <div style="width:170px"><div style="color:var(--text-3);font-size:10px">N. SPEDIZIONE</div>
          <input id="fupd-tracking" value="${s.tracking || ''}" placeholder="tracking" style="width:100%;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px">
        </div>
        <button class="btn btn-sm" onclick="salvaDatiFollowup(${id})" style="align-self:flex-end"><i class="ti ti-check"></i>Salva</button>
      </div>`;

    const tappe = d.tappe.map(t => {
      const st = FUP_STATO_TAPPA[t.stato] || {testo:t.stato,colore:'var(--text-3)'};
      const azioni = (t.stato === 'programmata' || t.stato === 'in_attesa_ok')
        ? `<button class="btn btn-sm btn-primary" onclick="inviaTappaFollowup(${t.id},${id})"><i class="ti ti-send"></i>Invia ora</button>
           <button class="btn btn-sm" onclick="saltaTappaFollowup(${t.id},${id})">Salta</button>` : '';
      const quando = t.stato === 'inviata'
        ? `inviata il ${new Date(t.inviata_il).toLocaleDateString('it-IT')} ${t.inviata_da==='automatico'?'(automatica)':'da '+(t.inviata_da||'')}`
        : `prevista per il ${fupData(t.programmata_per)}`;
      return `<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <strong style="font-size:13px">${FUP_ETICHETTE[t.tipo] || t.tipo}</strong>
            <span style="font-size:11px;color:${st.colore};font-weight:600">${st.testo}</span>
            <span style="font-size:11px;color:var(--text-3);margin-left:auto">${quando}</span>
          </div>
          <div style="font-size:12px;color:var(--text-2);margin-bottom:6px"><strong>${t.oggetto_preview || ''}</strong></div>
          <div style="font-size:12px;color:var(--text-2);max-height:150px;overflow:auto;background:var(--surface-2);border-radius:6px;padding:10px;line-height:1.55">${fupAnteprima(t.corpo_preview)}</div>
          ${t.errore ? `<div style="font-size:11px;color:var(--red);margin-top:6px">⚠️ ${t.errore}</div>` : ''}
          <div style="display:flex;gap:6px;margin-top:8px">${azioni}</div>
        </div>`;
    }).join('');

    const eventi = d.eventi.length ? `<div style="margin-top:16px">
        <div style="font-size:11px;color:var(--text-3);font-weight:600;margin-bottom:6px">CRONOLOGIA</div>
        ${d.eventi.map(e => `<div style="font-size:11px;color:var(--text-3);padding:3px 0">${new Date(e.created_at).toLocaleString('it-IT')} · <strong>${e.evento}</strong>${e.dettaglio ? ' — ' + e.dettaglio : ''}</div>`).join('')}
      </div>` : '';

    const ferma = s.stato === 'in_corso'
      ? `<div style="margin-top:14px;text-align:right"><button class="btn btn-sm btn-danger" onclick="fermaFollowup(${id})"><i class="ti ti-player-stop"></i>Ferma il percorso</button></div>`
      : `<div style="margin-top:14px;font-size:12px;color:var(--text-3)">Percorso ${s.stato}${s.motivo_stop ? ': ' + s.motivo_stop : ''}</div>`;

    body.innerHTML = testa + tappe + ferma + eventi;
  }catch(e){
    body.innerHTML = '<div style="padding:20px;color:var(--red)">Errore: ' + e.message + '</div>';
  }
}

async function cambiaStatoConsegna(id){
  const v = document.getElementById('fupd-consegna').value;
  await api.patch('/api/followup/' + id, {stato_consegna: v, utente:(currentUser&&currentUser.username)||null});
  showSave(); apriFollowup(id); caricaFollowup();
}
window.cambiaStatoConsegna = cambiaStatoConsegna;

async function salvaDatiFollowup(id){
  await api.patch('/api/followup/' + id, {
    email_dest: document.getElementById('fupd-email').value.trim(),
    tracking: document.getElementById('fupd-tracking').value.trim()
  });
  showSave(); apriFollowup(id);
}

async function inviaTappaFollowup(tappaId, id){
  if(!confirm('Inviare adesso questa email al cliente?')) return;
  const r = await api.post('/api/followup/tappa/' + tappaId + '/invia', {utente:(currentUser&&currentUser.username)||null});
  if(r.error) return alert('Non inviata: ' + r.error);
  showSave(); apriFollowup(id); caricaFollowup();
}

async function saltaTappaFollowup(tappaId, id){
  await api.post('/api/followup/tappa/' + tappaId + '/salta', {utente:(currentUser&&currentUser.username)||null});
  apriFollowup(id); caricaFollowup();
}

async function fermaFollowup(id){
  const motivo = prompt('Perche\' fermi il percorso?', 'Gestito a voce con il cliente');
  if(motivo === null) return;
  await api.post('/api/followup/' + id + '/ferma', {motivo, utente:(currentUser&&currentUser.username)||null});
  closeModal('modal-followup-dettaglio'); caricaFollowup();
}

async function apriModelliFollowup(){
  openModal('modal-followup-modelli');
  const body = document.getElementById('fupm-body');
  body.innerHTML = '<div style="padding:16px;color:var(--text-3)">Caricamento...</div>';
  const mod = await api.get('/api/followup-modelli');
  if(!Array.isArray(mod)) { body.innerHTML = '<div style="padding:16px">Errore.</div>'; return; }
  body.innerHTML = `<div style="font-size:12px;color:var(--text-3);margin-bottom:12px">
      Segnaposto utilizzabili: <code>{{cliente}}</code> <code>{{ddt}}</code> <code>{{data_ddt}}</code> <code>{{tracking_riga}}</code> <code>{{importo}}</code>
    </div>` + mod.map(m => `
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <strong style="font-size:13px">${FUP_ETICHETTE[m.tipo] || m.tipo}</strong>
        <label style="font-size:11px;color:var(--text-3);margin-left:auto">giorni dopo il DDT
          <input type="number" id="fm-g-${m.tipo}" value="${m.giorni}" style="width:56px;padding:3px 6px;border:1px solid var(--border);border-radius:6px;margin-left:4px">
        </label>
        <label style="font-size:11px;display:flex;align-items:center;gap:4px"><input type="checkbox" id="fm-a-${m.tipo}" ${m.automatica?'checked':''}> invia da sola</label>
        <label style="font-size:11px;display:flex;align-items:center;gap:4px"><input type="checkbox" id="fm-at-${m.tipo}" ${m.attiva?'checked':''}> attiva</label>
      </div>
      <input id="fm-o-${m.tipo}" value="${(m.oggetto||'').replace(/"/g,'&quot;')}" style="width:100%;padding:6px 9px;border:1px solid var(--border);border-radius:7px;font-size:12px;margin-bottom:6px" placeholder="Oggetto dell'email">
      <div style="display:flex;gap:3px;flex-wrap:wrap;padding:5px;background:var(--surface-2);border:1px solid var(--border);border-bottom:none;border-radius:7px 7px 0 0">
        ${fupBtnFmt(m.tipo,'bold','ti-bold','Grassetto')}
        ${fupBtnFmt(m.tipo,'italic','ti-italic','Corsivo')}
        ${fupBtnFmt(m.tipo,'underline','ti-underline','Sottolineato')}
        <span style="width:1px;background:var(--border);margin:2px 4px"></span>
        ${fupBtnFmt(m.tipo,'insertUnorderedList','ti-list','Elenco puntato')}
        ${fupBtnFmt(m.tipo,'insertOrderedList','ti-list-numbers','Elenco numerato')}
        <span style="width:1px;background:var(--border);margin:2px 4px"></span>
        <button class="btn btn-sm" style="padding:3px 7px" title="Inserisci link" onmousedown="event.preventDefault()" onclick="fupLink('${m.tipo}')"><i class="ti ti-link"></i></button>
        ${fupBtnFmt(m.tipo,'removeFormat','ti-clear-formatting','Togli formattazione')}
        <span style="margin-left:auto;display:flex;gap:3px;align-items:center">
          <span style="font-size:10px;color:var(--text-3)">inserisci:</span>
          ${fupBtnTag(m.tipo,'{{cliente}}','cliente')}
          ${fupBtnTag(m.tipo,'{{ddt}}','DDT')}
          ${fupBtnTag(m.tipo,'{{data_ddt}}','data')}
          ${fupBtnTag(m.tipo,'{{tracking_riga}}','tracking')}
        </span>
      </div>
      <div id="fm-c-${m.tipo}" contenteditable="true" style="width:100%;min-height:150px;max-height:280px;overflow:auto;padding:10px 12px;border:1px solid var(--border);border-radius:0 0 7px 7px;font-size:13px;line-height:1.6;background:var(--surface);outline:none">${m.corpo || ''}</div>
      <div style="display:flex;align-items:center;margin-top:6px">
        <span style="font-size:10px;color:var(--text-3)">Il testo verra' inviato cosi' come lo vedi.</span>
        <button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="salvaModelloFollowup('${m.tipo}')"><i class="ti ti-check"></i>Salva</button>
      </div>
    </div>`).join('');
}

function fupBtnFmt(tipo, cmd, icona, titolo){
  return `<button class="btn btn-sm" style="padding:3px 7px" title="${titolo}" onmousedown="event.preventDefault()" onclick="fupFormatta('${tipo}','${cmd}')"><i class="ti ${icona}"></i></button>`;
}
function fupBtnTag(tipo, tag, etichetta){
  return `<button class="btn btn-sm" style="padding:2px 6px;font-size:10px" title="Inserisci ${tag}" onmousedown="event.preventDefault()" onclick="fupInserisci('${tipo}','${tag}')">${etichetta}</button>`;
}
function fupFormatta(tipo, cmd){
  const ed = document.getElementById('fm-c-' + tipo);
  ed.focus();
  document.execCommand(cmd, false, null);
}
function fupInserisci(tipo, testo){
  const ed = document.getElementById('fm-c-' + tipo);
  ed.focus();
  document.execCommand('insertText', false, testo);
}
function fupLink(tipo){
  const url = prompt('Indirizzo del link (es. https://www.mulinovitaliti.it)');
  if(!url) return;
  const ed = document.getElementById('fm-c-' + tipo);
  ed.focus();
  document.execCommand('createLink', false, url);
}
window.fupFormatta = fupFormatta;
window.fupInserisci = fupInserisci;
window.fupLink = fupLink;

async function salvaModelloFollowup(tipo){
  await api.patch('/api/followup-modelli/' + tipo, {
    oggetto: document.getElementById('fm-o-'+tipo).value,
    corpo: document.getElementById('fm-c-'+tipo).innerHTML,
    giorni: parseInt(document.getElementById('fm-g-'+tipo).value) || 0,
    automatica: document.getElementById('fm-a-'+tipo).checked,
    attiva: document.getElementById('fm-at-'+tipo).checked
  });
  showSave();
}

async function recuperaSpedizioniFollowup(){
  const g = prompt('Creare i percorsi per le spedizioni corriere degli ultimi quanti giorni?', '30');
  if(g === null) return;
  const r = await api.post('/api/followup/recupera-spedizioni', {giorni: parseInt(g)||30});
  if(r.error) return alert('Errore: ' + r.error);
  alert(`Spedizioni esaminate: ${r.esaminate}\nPercorsi creati: ${r.creati}`);
  caricaFollowup();
}
window.recuperaSpedizioniFollowup = recuperaSpedizioniFollowup;

// Pallino arancione sul bottone in Ordini quando ci sono email da approvare
async function aggiornaBadgeFollowup(){
  const b = document.getElementById('btn-fup-badge');
  if(!b) return;
  try{
    const r = await api.get('/api/followup/riepilogo');
    const n = Number(r && r.da_approvare) || 0;
    b.textContent = n;
    b.style.display = n ? 'inline-block' : 'none';
  }catch(e){ b.style.display='none'; }
}
window.aggiornaBadgeFollowup = aggiornaBadgeFollowup;

// Legge la casella spedizioni, importa le nuove e aggiorna gli stati
async function sincronizzaFollowup(btn){
  const testoOrig = btn ? btn.innerHTML : '';
  if(btn){ btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader"></i>Lettura email...'; }
  try{
    const r = await api.post('/api/followup/controllo', {});
    await caricaFollowup();
    if(r && r.sync){
      const n = r.sync.nuove || 0, s = r.sync.stati_aggiornati || 0;
      if(n || s) showSave();
      else if(btn) alert('Nessuna nuova spedizione trovata nella casella email.');
    } else if(r && r.error){
      alert('Errore: ' + r.error);
    }
  }catch(e){ alert('Errore nella lettura: ' + e.message); }
  finally{ if(btn){ btn.disabled = false; btn.innerHTML = testoOrig; } }
}
window.sincronizzaFollowup = sincronizzaFollowup;

window.caricaFollowup = caricaFollowup;
window.filtraFollowup = filtraFollowup;
window.apriFollowup = apriFollowup;
window.salvaDatiFollowup = salvaDatiFollowup;
window.inviaTappaFollowup = inviaTappaFollowup;
window.saltaTappaFollowup = saltaTappaFollowup;
window.fermaFollowup = fermaFollowup;
window.apriModelliFollowup = apriModelliFollowup;
window.salvaModelloFollowup = salvaModelloFollowup;
