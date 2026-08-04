// app-simona.js — Digital Marketing: Simona

// Quick actions specifiche di Simona
function simonaQuickActions() {
  const qa = document.querySelector('.quick-actions');
  if (!qa || _agenteAttivo !== 'simona') return;
  qa.innerHTML = `
    <div class="quick-action" onclick="sendAIMessage('Simona, quanti clienti hanno l\'email e possiamo contattare? Preparami una strategia DEM.')">
      <div style="font-size:20px;margin-bottom:5px">📧</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:2px">Strategia DEM</div>
      <div style="font-size:11px;color:var(--text-2)">Email marketing</div>
    </div>
    <div class="quick-action" onclick="sendAIMessage('Simona, scrivi 3 post LinkedIn per Mulino Vitaliti sulla qualità della nostra semola rimacinata.')">
      <div style="font-size:20px;margin-bottom:5px">📱</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:2px">Post Social</div>
      <div style="font-size:11px;color:var(--text-2)">LinkedIn & Instagram</div>
    </div>
    <div class="quick-action" onclick="sendAIMessage('Simona, come riattivo i clienti inattivi da più di 60 giorni? Proponi una campagna concreta.')">
      <div style="font-size:20px;margin-bottom:5px">🎯</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:2px">Riattiva clienti</div>
      <div style="font-size:11px;color:var(--text-2)">Campagna reengagement</div>
    </div>`;
}
