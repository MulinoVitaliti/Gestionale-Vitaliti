// app-etichetta.js — Etichetta da attaccare al bancale
// Foglio A4 con logo, mittente e destinatario in grande, pronto da stampare.

function apriEtichetta(ordineId){
  const o = (state.ordini || []).find(x => String(x.id) === String(ordineId));
  const cl = o ? (state.clienti || []).find(c => c.id === o.cliente_id) : null;

  document.getElementById('et-cliente').value = (o && o.cliente) || (cl && cl.nome) || '';
  document.getElementById('et-citta').value = (cl && cl.citta) || '';
  const ind = cl ? (cl.ind_consegna || cl.ind_legale || cl.ind || '') : '';
  document.getElementById('et-indirizzo').value = ind;
  document.getElementById('et-note').value = '';
  document.getElementById('et-colli').value = o ? (o.qty || '') : '';
  openModal('modal-etichetta');
  aggiornaAnteprimaEtichetta();
}

function aggiornaAnteprimaEtichetta(){
  const v = id => (document.getElementById(id).value || '').trim();
  const cliente = v('et-cliente'), citta = v('et-citta'), ind = v('et-indirizzo');
  const note = v('et-note'), colli = v('et-colli');
  document.getElementById('et-anteprima').innerHTML = `
    <div style="text-align:center;padding:18px 10px;font-family:'Open Sans',Arial,sans-serif">
      <img src="/logo.png" style="width:110px;height:auto;margin-bottom:14px" alt="Mulino Vitaliti">
      <div style="font-size:15px;color:#7a4a3a;margin-bottom:4px">Mittente</div>
      <div style="font-size:12px;font-weight:600;margin-bottom:2px">MULINO VITALITI</div>
      <div style="font-size:11px;color:#666;margin-bottom:10px">Via I Retta Levante 134 — 95032 Belpasso (CT)</div>
      <div style="font-size:22px;color:#999;line-height:1">↓</div>
      <div style="font-size:15px;color:#7a4a3a;margin:8px 0 4px">Destinatario</div>
      <div style="font-size:14px;font-weight:700;letter-spacing:.5px">${cliente || '—'}</div>
      <div style="font-size:26px;font-weight:700;color:#c0561f;text-decoration:underline;margin:10px 0">${(citta || '').toUpperCase()}</div>
      <div style="font-size:13px;text-decoration:underline">${ind || ''}</div>
      ${colli ? `<div style="margin-top:14px;font-size:13px">Colli: <strong>${colli}</strong></div>` : ''}
      ${note ? `<div style="margin-top:8px;font-size:13px;font-weight:600">${note}</div>` : ''}
    </div>`;
}

function stampaEtichetta(){
  const v = id => (document.getElementById(id).value || '').trim();
  const cliente = v('et-cliente'), citta = v('et-citta'), ind = v('et-indirizzo');
  const note = v('et-note'), colli = v('et-colli');
  if(!cliente || !citta) return alert('Servono almeno il nome del cliente e la città.');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Etichetta ${cliente}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
    <style>
      @page { size: A4 portrait; margin: 14mm; }
      body { font-family: 'Open Sans', Arial, Helvetica, sans-serif; color:#111; margin:0;
             display:flex; align-items:center; justify-content:center; min-height:96vh; }
      .foglio { text-align:center; width:100%; }
      .logo { width:200px; height:auto; margin-bottom:26px; }
      .lbl { font-size:26px; color:#7a4a3a; margin-bottom:6px; }
      .mitt-nome { font-size:19px; font-weight:700; }
      .mitt-ind { font-size:15px; color:#555; margin-top:3px; }
      .freccia { font-size:44px; color:#111; line-height:1; margin:26px 0; }
      .dest-nome { font-size:26px; font-weight:700; letter-spacing:.5px; margin-bottom:18px; }
      .citta { font-size:62px; font-weight:700; color:#c0561f; text-decoration:underline;
               margin:10px 0 24px; line-height:1.05; }
      .ind { font-size:24px; text-decoration:underline; }
      .extra { margin-top:34px; font-size:22px; }
      .note { margin-top:12px; font-size:22px; font-weight:700; }
    </style></head><body>
    <div class="foglio">
      <img class="logo" src="${location.origin}/logo.png" alt="Mulino Vitaliti">
      <div class="lbl">Mittente</div>
      <div class="mitt-nome">MULINO VITALITI</div>
      <div class="mitt-ind">Via I Retta Levante 134 — 95032 Belpasso (CT)</div>
      <div class="freccia">&darr;</div>
      <div class="lbl">Destinatario</div>
      <div class="dest-nome">${cliente.toUpperCase()}</div>
      <div class="citta">${citta.toUpperCase()}</div>
      <div class="ind">${ind}</div>
      ${colli ? `<div class="extra">Colli: <strong>${colli}</strong></div>` : ''}
      ${note ? `<div class="note">${note}</div>` : ''}
    </div>
    <script>
      function stampa(){ setTimeout(function(){ window.print(); }, 250); }
      if (document.fonts && document.fonts.ready) { document.fonts.ready.then(stampa); }
      else { window.onload = stampa; }
    <\/script>
    </body></html>`;

  const w = window.open('', '_blank', 'width=820,height=1000');
  if(!w) return alert('Il browser ha bloccato la finestra di stampa: consenti i popup per questo sito.');
  w.document.write(html);
  w.document.close();
}

window.apriEtichetta = apriEtichetta;
window.aggiornaAnteprimaEtichetta = aggiornaAnteprimaEtichetta;
window.stampaEtichetta = stampaEtichetta;
