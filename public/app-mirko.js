// app-mirko.js — Commerciale: Mirko

// Quick actions specifiche di Mirko
function mirkoQuickActions() {
  const qa = document.querySelector('.quick-actions');
  if (!qa || _agenteAttivo !== 'mirko') return;
  qa.innerHTML = `
    <div class="quick-action" onclick="sendAIMessage('Mirko, analizza la pipeline vendite e dimmi dove devo concentrarmi questa settimana.')">
      <div style="font-size:20px;margin-bottom:5px">📊</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:2px">Pipeline</div>
      <div style="font-size:11px;color:var(--text-2)">Analisi vendite</div>
    </div>
    <div class="quick-action" onclick="sendAIMessage('Mirko, chi sono i clienti a rischio abbandono? Preparami un piano di retention.')">
      <div style="font-size:20px;margin-bottom:5px">🔴</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:2px">Clienti a rischio</div>
      <div style="font-size:11px;color:var(--text-2)">Piano retention</div>
    </div>
    <div class="quick-action" onclick="sendAIMessage('Mirko, prepara un\'offerta commerciale per un nuovo panificio. Struttura prezzi, condizioni e vantaggi.')">
      <div style="font-size:20px;margin-bottom:5px">📋</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:2px">Prepara offerta</div>
      <div style="font-size:11px;color:var(--text-2)">Nuovo cliente</div>
    </div>`;
}
