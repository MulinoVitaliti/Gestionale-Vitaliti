// app-guardia.js — Rete di protezione: cattura ogni errore JavaScript,
// mostra un avviso gentile invece di lasciare la pagina morta,
// e invia il dettaglio al server (visibile nei log Railway).

(function(){
  let avvisoMostrato = false;

  function segnala(msg, url, line, col, stack){
    try {
      fetch('/api/client-error', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          msg: String(msg).slice(0,300), url, line, col,
          stack: stack ? String(stack).slice(0,1000) : '',
          utente: (window.currentUser && currentUser.username) || 'non loggato',
          pagina: (document.querySelector('.page.active')||{}).id || location.pathname
        })
      }).catch(()=>{});
    } catch(e){}
  }

  function mostraAvviso(){
    if (avvisoMostrato) return;
    avvisoMostrato = true;
    const b = document.createElement('div');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#973D37;color:#fff;padding:10px 16px;font:13px/1.4 system-ui;display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.25)';
    b.innerHTML = '<span>⚠️ Qualcosa è andato storto in questa pagina. I dati sono al sicuro: ricarica per continuare.</span>' +
      '<button onclick="location.reload()" style="margin-left:auto;background:#fff;color:#973D37;border:0;border-radius:6px;padding:6px 14px;font-weight:600;cursor:pointer">Ricarica</button>' +
      '<button onclick="this.parentNode.remove()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,.5);border-radius:6px;padding:6px 10px;cursor:pointer">Ignora</button>';
    (document.body || document.documentElement).appendChild(b);
    setTimeout(()=>{ avvisoMostrato = false; }, 30000);
  }

  window.addEventListener('error', function(e){
    segnala(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
    mostraAvviso();
  });
  window.addEventListener('unhandledrejection', function(e){
    const r = e.reason || {};
    segnala(r.message || String(e.reason), location.href, 0, 0, r.stack);
    // niente banner per le promise: spesso sono chiamate API fallite gia' gestite a modo loro
  });
})();
