// app-steven-bo.js — Back Office Steven: rapporto, alert, solleciti, agente loop

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
