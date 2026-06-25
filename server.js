const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const { Pool } = require('pg');
const crypto = require('crypto');

// ── Helper password con crypto nativo (nessuna dipendenza extra) ───────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch(e) { return false; }
}

const app = express();

// ── SICUREZZA: Helmet (header HTTP di sicurezza) ───────────────────────────
// Aggiunge header di sicurezza manualmente senza dipendenze
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── SICUREZZA: CORS ristretto al dominio Railway ───────────────────────────
const ALLOWED_ORIGINS = [
  'https://gestionale-vitaliti-production.up.railway.app',
  'http://localhost:3000'
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS non consentito'));
    }
  },
  credentials: true
}));

// ── SICUREZZA: Rate limiting semplice senza dipendenze ────────────────────
const loginAttempts = new Map();
function loginLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 10;
  if (!loginAttempts.has(ip)) loginAttempts.set(ip, []);
  const attempts = loginAttempts.get(ip).filter(t => now - t < windowMs);
  loginAttempts.set(ip, attempts);
  if (attempts.length >= maxAttempts) {
    return res.status(429).json({ error: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' });
  }
  attempts.push(now);
  next();
}
// Pulisce la mappa ogni ora
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of loginAttempts.entries()) {
    const valid = times.filter(t => now - t < 15 * 60 * 1000);
    if (!valid.length) loginAttempts.delete(ip); else loginAttempts.set(ip, valid);
  }
}, 3600000);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── DATABASE ──────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        colore TEXT DEFAULT '#A8412A',
        ordine INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fasi (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        color TEXT NOT NULL,
        ordine INTEGER DEFAULT 0,
        pipeline_id TEXT DEFAULT 'default'
      );

      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        contatto TEXT,
        tel TEXT,
        citta TEXT,
        email TEXT,
        prodotto TEXT,
        stato TEXT,
        note TEXT,
        tag TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS lead_pipeline_stato (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        pipeline_id TEXT NOT NULL,
        stato TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(lead_id, pipeline_id)
      );

      CREATE TABLE IF NOT EXISTS clienti (
        id SERIAL PRIMARY KEY,
        codice TEXT UNIQUE,
        tipo TEXT DEFAULT 'cliente',
        nome TEXT NOT NULL,
        ref TEXT,
        tel TEXT,
        email TEXT,
        citta TEXT,
        ind TEXT,
        ind_legale TEXT,
        ind_consegna TEXT,
        sdi TEXT,
        pec TEXT,
        piva TEXT,
        prod TEXT,
        note TEXT,
        facchinaggio BOOLEAN DEFAULT FALSE,
        chiamata_tel TEXT,
        note_spedizione TEXT,
        fic_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fic_conflitti (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clienti(id) ON DELETE CASCADE,
        fic_data JSONB NOT NULL,
        stato TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS note_clienti (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clienti(id) ON DELETE CASCADE,
        testo TEXT NOT NULL,
        autore TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS assicurazioni (
        id SERIAL PRIMARY KEY,
        cliente TEXT NOT NULL,
        ddt TEXT,
        data_danno DATE,
        importo NUMERIC(10,2) DEFAULT 0,
        rimborso_max NUMERIC(10,2) DEFAULT 0,
        importo_rimborsato NUMERIC(10,2) DEFAULT 0,
        modalita_rimborso TEXT,
        stato TEXT DEFAULT 'aperta',
        note TEXT,
        doc_1 BOOLEAN DEFAULT FALSE,
        doc_2 BOOLEAN DEFAULT FALSE,
        doc_3 BOOLEAN DEFAULT FALSE,
        doc_4 BOOLEAN DEFAULT FALSE,
        doc_5 BOOLEAN DEFAULT FALSE,
        gmail_msg_id TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ordini (
        id SERIAL PRIMARY KEY,
        cliente TEXT NOT NULL,
        cliente_id INTEGER REFERENCES clienti(id) ON DELETE SET NULL,
        prodotti JSONB DEFAULT '[]',
        prodotto TEXT,
        qty NUMERIC,
        peso_totale NUMERIC,
        importo NUMERIC,
        data DATE,
        data_consegna DATE,
        stato TEXT DEFAULT 'bozza',
        canale TEXT DEFAULT 'telefono',
        note TEXT,
        note_spedizione TEXT,
        facchinaggio BOOLEAN DEFAULT FALSE,
        chiamata_tel TEXT,
        fic_ddt_id INTEGER,
        fic_ddt_numero TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS movimenti (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        tipo TEXT NOT NULL,
        importo NUMERIC NOT NULL,
        cat TEXT,
        descrizione TEXT,
        fatturazione TEXT DEFAULT 'non_applicabile',
        pagato BOOLEAN DEFAULT FALSE,
        aliquota_iva INTEGER DEFAULT 4,
        confezione TEXT,
        qty_kg NUMERIC,
        prezzo_kg NUMERIC,
        metodo_pagamento TEXT,
        prodotti JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS attivita (
        id SERIAL PRIMARY KEY,
        tipo TEXT NOT NULL DEFAULT 'chiamata',
        titolo TEXT NOT NULL,
        note TEXT,
        data_scadenza DATE,
        ora TEXT,
        collegata_tipo TEXT,
        collegata_id INTEGER,
        collegata_nome TEXT,
        lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
        pipeline_id TEXT,
        completata BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS automazioni (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        attiva BOOLEAN DEFAULT TRUE,
        trigger_tipo TEXT NOT NULL DEFAULT 'giorni_in_fase',
        trigger_fase_id TEXT,
        trigger_giorni INTEGER DEFAULT 7,
        azione_email BOOLEAN DEFAULT TRUE,
        azione_email_template_id INTEGER,
        azione_email_oggetto TEXT,
        azione_email_corpo TEXT,
        azione_sposta BOOLEAN DEFAULT FALSE,
        azione_sposta_fase_id TEXT,
        ultima_esecuzione TIMESTAMP,
        esecuzioni INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS automazioni_log (
        id SERIAL PRIMARY KEY,
        automazione_id INTEGER,
        lead_id INTEGER,
        lead_nome TEXT,
        azione TEXT,
        esito TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        titolo TEXT NOT NULL,
        descrizione TEXT,
        assegnata_a TEXT NOT NULL,
        assegnata_da TEXT NOT NULL,
        priorita TEXT DEFAULT 'media',
        stato TEXT DEFAULT 'da_fare',
        scadenza DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS fic_clienti_storico (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        vat_number TEXT,
        tax_code TEXT,
        indirizzo TEXT,
        citta TEXT,
        cap TEXT,
        provincia TEXT,
        email TEXT,
        telefono TEXT,
        num_fatture INTEGER DEFAULT 0,
        num_ddt INTEGER DEFAULT 0,
        importo_totale_fatturato NUMERIC DEFAULT 0,
        ultimo_documento_tipo TEXT,
        ultimo_documento_data DATE,
        ultimo_documento_numero TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(nome, vat_number)
      );

      CREATE TABLE IF NOT EXISTS spedizioni (
        id SERIAL PRIMARY KEY,
        gmail_msg_id TEXT UNIQUE,
        numero_ddt TEXT,
        numero_tracking TEXT,
        affiliato TEXT,
        destinatario TEXT,
        indirizzo_consegna TEXT,
        data_consegna_prevista TEXT,
        pin_consegna TEXT,
        data_email TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS utenti (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        ruolo TEXT DEFAULT 'commerciale',
        email TEXT,
        pending BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Dati iniziali fasi
    const fasiCount = await client.query('SELECT COUNT(*) FROM fasi');
    if (parseInt(fasiCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO fasi (id, label, color, ordine) VALUES
        ('lead', 'Lead', 'var(--blue)', 0),
        ('campionatura', 'Campionatura inviata', 'var(--orange)', 1),
        ('attesa', 'In attesa risposta', 'var(--gold)', 2),
        ('acquisito', 'Cliente acquisito', 'var(--green)', 3)
      `);
    }

    // Utenti iniziali
    const utentiCount = await client.query('SELECT COUNT(*) FROM utenti');
    if (parseInt(utentiCount.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO utenti (nome, username, password, ruolo, email) VALUES
        ('Giovanni Vitaliti', 'giovanni', 'vitaliti2024', 'admin', 'mulino.vitaliti@gmail.com'),
        ('Antonio Vitaliti', 'antonio', 'antonio2024', 'admin', ''),
        ('Marco Commerciale', 'marco', 'marco2024', 'commerciale', ''),
        ('Laura Contabile', 'laura', 'laura2024', 'contabile', ''),
        ('Giuseppe Magazzino', 'giuseppe', 'giuseppe2024', 'magazzino', '')
      `);
    }

    // ── MIGRAZIONE PIPELINE MULTIPLE ──────────────────────────────────────
    // Se non esiste ancora nessuna pipeline, crea quella di default e migra i dati esistenti
    const pipelineCount = await client.query('SELECT COUNT(*) FROM pipelines');
    if (parseInt(pipelineCount.rows[0].count) === 0) {
      await client.query(`INSERT INTO pipelines (id, nome, colore, ordine) VALUES ('default', 'Pipeline principale', '#A8412A', 0)`);
      // Le fasi esistenti senza pipeline_id (o con valore di default già impostato dallo schema) restano associate a 'default'
      await client.query(`UPDATE fasi SET pipeline_id = 'default' WHERE pipeline_id IS NULL`);
      // Migra lo stato corrente di ogni lead nella tabella lead_pipeline_stato per la pipeline default
      await client.query(`
        INSERT INTO lead_pipeline_stato (lead_id, pipeline_id, stato)
        SELECT id, 'default', stato FROM leads WHERE stato IS NOT NULL
        ON CONFLICT (lead_id, pipeline_id) DO NOTHING
      `);
      console.log('✅ Migrazione pipeline multiple completata');
    }

    console.log('✅ Database inizializzato');
  } catch (err) {
    console.error('❌ Errore DB init:', err.message);
  } finally {
    client.release();
  }
}

// ── AUTH API ──────────────────────────────────────────────────────────────
app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM utenti WHERE username=$1', [username]);
    if (!r.rows.length) return res.json({ error: 'Credenziali non valide' });
    const u = r.rows[0];
    if (u.pending) return res.json({ error: 'Account in attesa di approvazione' });

    let passwordOk = false;
    if (u.password && u.password.includes(':')) {
      // Password hashata con crypto nativo (formato salt:hash)
      passwordOk = verifyPassword(password, u.password);
    } else {
      // Password in testo chiaro (vecchio formato) — verifica e migra automaticamente
      passwordOk = u.password === password;
      if (passwordOk) {
        const hash = hashPassword(password);
        await pool.query('UPDATE utenti SET password=$1 WHERE id=$2', [hash, u.id]);
      }
    }

    if (!passwordOk) return res.json({ error: 'Credenziali non valide' });

    const sessionExpiry = Date.now() + (8 * 60 * 60 * 1000);
    res.json({
      success: true,
      sessionExpiry,
      user: { id: u.id, nome: u.nome, username: u.username, ruolo: u.ruolo, email: u.email }
    });
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/register', async (req, res) => {
  const { nome, username, password, ruolo, email } = req.body;
  try {
    const hash = hashPassword(password);
    await pool.query('INSERT INTO utenti (nome, username, password, ruolo, email, pending) VALUES ($1,$2,$3,$4,$5,true)', [nome, username, hash, ruolo || 'commerciale', email]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') return res.json({ error: 'Username già esistente' });
    res.json({ error: err.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, password } = req.body;
  try {
    const hash = hashPassword(password);
    const r = await pool.query('UPDATE utenti SET password=$1 WHERE email=$2 RETURNING id', [hash, email]);
    if (!r.rows.length) return res.json({ error: 'Nessun account trovato con questa email' });
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── UTENTI API ────────────────────────────────────────────────────────────
app.get('/api/utenti', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, nome, username, ruolo, email, pending FROM utenti ORDER BY id');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/utenti', async (req, res) => {
  const { nome, username, password, ruolo, email } = req.body;
  try {
    const hash = hashPassword(password);
    const r = await pool.query('INSERT INTO utenti (nome, username, password, ruolo, email) VALUES ($1,$2,$3,$4,$5) RETURNING *', [nome, username, hash, ruolo, email || '']);
    const { password: _, ...userSafe } = r.rows[0];
    res.json(userSafe);
  } catch (err) {
    if (err.code === '23505') return res.json({ error: 'Username già esistente' });
    res.json({ error: err.message });
  }
});

app.delete('/api/utenti/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM utenti WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.patch('/api/utenti/:id/approva', async (req, res) => {
  try {
    await pool.query('UPDATE utenti SET pending=false WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── FASI API ──────────────────────────────────────────────────────────────
// ── PIPELINE API ──────────────────────────────────────────────────────────
app.get('/api/pipelines', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM pipelines ORDER BY ordine, created_at');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/pipelines', async (req, res) => {
  const { id, nome, colore, ordine } = req.body;
  try {
    const r = await pool.query('INSERT INTO pipelines (id, nome, colore, ordine) VALUES ($1,$2,$3,$4) RETURNING *', [id, nome, colore || '#A8412A', ordine || 0]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/pipelines/:id', async (req, res) => {
  const { nome, colore } = req.body;
  try {
    await pool.query('UPDATE pipelines SET nome=$1, colore=$2 WHERE id=$3', [nome, colore, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/pipelines/:id', async (req, res) => {
  if (req.params.id === 'default') return res.json({ error: 'Non puoi eliminare la pipeline principale' });
  try {
    await pool.query('DELETE FROM fasi WHERE pipeline_id=$1', [req.params.id]);
    await pool.query('DELETE FROM lead_pipeline_stato WHERE pipeline_id=$1', [req.params.id]);
    await pool.query('DELETE FROM pipelines WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── FASI API ──────────────────────────────────────────────────────────────
app.get('/api/fasi', async (req, res) => {
  try {
    const pipelineId = req.query.pipeline_id || 'default';
    const r = await pool.query('SELECT * FROM fasi WHERE pipeline_id=$1 ORDER BY ordine', [pipelineId]);
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/fasi', async (req, res) => {
  const { id, label, color, ordine, pipeline_id } = req.body;
  try {
    const r = await pool.query('INSERT INTO fasi (id, label, color, ordine, pipeline_id) VALUES ($1,$2,$3,$4,$5) RETURNING *', [id, label, color, ordine || 0, pipeline_id || 'default']);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/fasi/:id', async (req, res) => {
  const { label, color } = req.body;
  try {
    await pool.query('UPDATE fasi SET label=$1, color=$2 WHERE id=$3', [label, color, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/fasi/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM fasi WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── LEAD-PIPELINE-STATO API ──────────────────────────────────────────────
// Restituisce per ogni lead lo stato nella pipeline richiesta (creando l'associazione se manca, opzionale)
app.get('/api/lead-pipeline-stato', async (req, res) => {
  try {
    const pipelineId = req.query.pipeline_id || 'default';
    const r = await pool.query('SELECT * FROM lead_pipeline_stato WHERE pipeline_id=$1', [pipelineId]);
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

// Imposta/aggiorna lo stato di un lead in una specifica pipeline (crea l'associazione se non esiste)
app.put('/api/lead-pipeline-stato', async (req, res) => {
  const { lead_id, pipeline_id, stato } = req.body;
  if (!lead_id || !pipeline_id || !stato) return res.json({ error: 'Parametri mancanti' });
  try {
    await pool.query(`
      INSERT INTO lead_pipeline_stato (lead_id, pipeline_id, stato, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (lead_id, pipeline_id) DO UPDATE SET stato=$3, updated_at=NOW()
    `, [lead_id, pipeline_id, stato]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// Aggiunge un lead esistente a una pipeline (se non già presente) con uno stato iniziale
app.post('/api/lead-pipeline-stato', async (req, res) => {
  const { lead_id, pipeline_id, stato } = req.body;
  if (!lead_id || !pipeline_id || !stato) return res.json({ error: 'Parametri mancanti' });
  try {
    const r = await pool.query(`
      INSERT INTO lead_pipeline_stato (lead_id, pipeline_id, stato)
      VALUES ($1, $2, $3)
      ON CONFLICT (lead_id, pipeline_id) DO UPDATE SET stato=$3, updated_at=NOW()
      RETURNING *
    `, [lead_id, pipeline_id, stato]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/lead-pipeline-stato/:leadId/:pipelineId', async (req, res) => {
  try {
    await pool.query('DELETE FROM lead_pipeline_stato WHERE lead_id=$1 AND pipeline_id=$2', [req.params.leadId, req.params.pipelineId]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── LEADS API ─────────────────────────────────────────────────────────────
app.get('/api/leads', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

// ── RICERCA AZIENDA (Google Places) ─────────────────────────────────────
// ── WHATSAPP (Unipile) ───────────────────────────────────────────────────
const UNIPILE_DSN = process.env.UNIPILE_DSN; // es: api45.unipile.com:17576
const UNIPILE_API_KEY = process.env.UNIPILE_API_KEY;
const UNIPILE_ACCOUNT_ID = process.env.UNIPILE_WHATSAPP_ACCOUNT_ID;

function unipileHeaders(){
  return { 'X-API-KEY': UNIPILE_API_KEY, 'accept': 'application/json' };
}

// Lista chat WhatsApp
app.get('/api/whatsapp/chats', async (req, res) => {
  // TEMPORANEAMENTE DISABILITATO: in attesa di verifica con il supporto Unipile
  // per un comportamento anomalo riscontrato (conversazioni non corrispondenti all'account reale)
  return res.json({ error: 'Integrazione WhatsApp temporaneamente sospesa per verifica di sicurezza' });
  // eslint-disable-next-line no-unreachable
  if (!UNIPILE_DSN || !UNIPILE_API_KEY) return res.json({ error: 'WhatsApp non configurato' });
  try {
    const url = `https://${UNIPILE_DSN}/api/v1/chats?account_id=${UNIPILE_ACCOUNT_ID}&limit=100`;
    const r = await fetch(url, { headers: unipileHeaders() });
    const data = await r.json();
    if (!r.ok) return res.json({ error: `Unipile ${r.status}: ${data.message || data.error || JSON.stringify(data)}` });

    let chats = data.items || data.chats || [];

    // Recupera il proprio numero collegato per escluderlo dalle chat
    let proprioNumero = null;
    try {
      const accUrl = `https://${UNIPILE_DSN}/api/v1/accounts/${UNIPILE_ACCOUNT_ID}`;
      const accR = await fetch(accUrl, { headers: unipileHeaders() });
      const accData = await accR.json();
      proprioNumero = accData.connection_params?.im?.phone_number || null;
    } catch (e) { /* ignora */ }

    // Estrai il numero di telefono reale dal provider_id o attendee_public_identifier
    function numeroReale(c) {
      const candidati = [c.attendee_public_identifier, c.provider_id];
      for (const cand of candidati) {
        if (cand && cand.includes('@s.whatsapp.net')) return cand.split('@')[0];
      }
      return null;
    }

    // Scarta le chat verso il proprio numero (chat con se stessi)
    chats = chats.filter(c => {
      const num = numeroReale(c);
      if (num && proprioNumero && num === proprioNumero) return false;
      return true;
    });

    // Scarta "Stato" WhatsApp e i canali/newsletter broadcast (non sono conversazioni private)
    chats = chats.filter(c => {
      const pid = c.provider_id || '';
      if (pid.includes('@status')) return false;
      if (pid.includes('@newsletter')) return false;
      if (pid.includes('@broadcast')) return false;
      return true;
    });

    // Per ogni chat senza nome, recupera gli attendees per ottenere il nome del contatto
    const arricchite = await Promise.all(chats.map(async (c) => {
      if (c.name) return c;
      try {
        const attUrl = `https://${UNIPILE_DSN}/api/v1/chats/${c.id}/attendees`;
        const attR = await fetch(attUrl, { headers: unipileHeaders() });
        const attData = await attR.json();
        const attendees = attData.items || attData.attendees || [];
        const altro = attendees.find(a => !a.is_self && (a.name || a.provider_id));
        if (altro) {
          c.name = altro.name || altro.provider_id || c.name;
        }
      } catch (e) { /* ignora, manteniamo il nome originale */ }
      return c;
    }));

    // Deduplica per numero di telefono reale (stesso contatto può apparire con id @lid e id @s.whatsapp.net)
    // Preferisce la versione con provider_id che termina in @s.whatsapp.net (più affidabile per inviare messaggi)
    const mappaPerNumero = new Map();
    const senzaNumero = [];
    arricchite.forEach(c => {
      const num = numeroReale(c);
      if (!num) { senzaNumero.push(c); return; }
      const esistente = mappaPerNumero.get(num);
      if (!esistente) {
        mappaPerNumero.set(num, c);
      } else {
        // Preferisci quella il cui provider_id è il numero reale (non @lid)
        const questaEPreferita = (c.provider_id || '').includes('@s.whatsapp.net');
        const esistenteEPreferita = (esistente.provider_id || '').includes('@s.whatsapp.net');
        if (questaEPreferita && !esistenteEPreferita) mappaPerNumero.set(num, c);
      }
    });

    const risultatoFinale = [...mappaPerNumero.values(), ...senzaNumero]
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 50);

    res.json({ items: risultatoFinale });
  } catch (err) {
    console.error('Errore chiamata Unipile chats:', err);
    res.json({ error: err.message });
  }
});

// Endpoint di debug temporaneo per ispezionare la risposta grezza di una chat singola
app.get('/api/whatsapp/debug-chat/:chatId', async (req, res) => {
  try {
    const chatUrl = `https://${UNIPILE_DSN}/api/v1/chats/${req.params.chatId}`;
    const attUrl = `https://${UNIPILE_DSN}/api/v1/chats/${req.params.chatId}/attendees`;
    const [chatR, attR] = await Promise.all([
      fetch(chatUrl, { headers: unipileHeaders() }),
      fetch(attUrl, { headers: unipileHeaders() })
    ]);
    const chat = await chatR.json();
    const attendees = await attR.json();
    res.json({ chat, attendees });
  } catch (err) { res.json({ error: err.message }); }
});

// Endpoint di debug temporaneo per ispezionare la risposta grezza
app.get('/api/whatsapp/debug', async (req, res) => {
  if (!UNIPILE_DSN || !UNIPILE_API_KEY) return res.json({ error: 'WhatsApp non configurato', dsn: UNIPILE_DSN, hasKey: !!UNIPILE_API_KEY, accountId: UNIPILE_ACCOUNT_ID });
  try {
    const url = `https://${UNIPILE_DSN}/api/v1/accounts`;
    const r = await fetch(url, { headers: unipileHeaders() });
    const data = await r.json();
    res.json({ status: r.status, dsn: UNIPILE_DSN, accountIdConfigured: UNIPILE_ACCOUNT_ID, accounts: data });
  } catch (err) { res.json({ error: err.message }); }
});


app.get('/api/whatsapp/chats/:chatId/messages', async (req, res) => {
  if (!UNIPILE_DSN || !UNIPILE_API_KEY) return res.json({ error: 'WhatsApp non configurato' });
  try {
    const url = `https://${UNIPILE_DSN}/api/v1/chats/${req.params.chatId}/messages`;
    const r = await fetch(url, { headers: unipileHeaders() });
    const data = await r.json();
    res.json(data);
  } catch (err) { res.json({ error: err.message }); }
});

// Invio messaggio in chat esistente
app.post('/api/whatsapp/chats/:chatId/messages', async (req, res) => {
  if (!UNIPILE_DSN || !UNIPILE_API_KEY) return res.json({ error: 'WhatsApp non configurato' });
  try {
    const form = new URLSearchParams();
    form.append('text', req.body.text || '');
    const url = `https://${UNIPILE_DSN}/api/v1/chats/${req.params.chatId}/messages`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...unipileHeaders(), 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data = await r.json();
    res.json(data);
  } catch (err) { res.json({ error: err.message }); }
});

// Avvia nuova chat con un numero di telefono (se non esiste già)
app.post('/api/whatsapp/start-chat', async (req, res) => {
  if (!UNIPILE_DSN || !UNIPILE_API_KEY) return res.json({ error: 'WhatsApp non configurato' });
  const { telefono, testo } = req.body;
  if (!telefono) return res.json({ error: 'Numero di telefono mancante' });
  try {
    // Pulisce il numero (solo cifre, con prefisso internazionale)
    let numero = telefono.replace(/[^\d+]/g, '');
    if (!numero.startsWith('+')) numero = '+39' + numero.replace(/^0/, '');
    const attendeeId = numero.replace('+', '') + '@s.whatsapp.net';

    const form = new URLSearchParams();
    form.append('account_id', UNIPILE_ACCOUNT_ID);
    form.append('text', testo || '');
    form.append('attendees_ids', attendeeId);

    const url = `https://${UNIPILE_DSN}/api/v1/chats`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...unipileHeaders(), 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const data = await r.json();
    res.json(data);
  } catch (err) { res.json({ error: err.message }); }
});

app.get('/api/places/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json({ error: 'Query mancante' });
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return res.json({ error: 'Chiave API Google Places non configurata' });
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.addressComponents,places.id,places.nationalPhoneNumber,places.internationalPhoneNumber'
      },
      body: JSON.stringify({ textQuery: query, languageCode: 'it', regionCode: 'IT' })
    });
    const data = await response.json();
    if (data.error) return res.json({ error: data.error.message });
    const risultati = (data.places || []).map(p => {
      const comp = p.addressComponents || [];
      const get = (type) => (comp.find(c => c.types.includes(type)) || {}).longText || '';
      return {
        nome: p.displayName?.text || '',
        indirizzo: p.formattedAddress || '',
        citta: get('locality') || get('administrative_area_level_3') || '',
        cap: get('postal_code') || '',
        provincia: get('administrative_area_level_2') || '',
        telefono: p.nationalPhoneNumber || p.internationalPhoneNumber || '',
        place_id: p.id || ''
      };
    });
    res.json({ risultati });
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/leads', async (req, res) => {
  const { nome, contatto, tel, citta, prodotto, stato, note, tag } = req.body;
  try {
    const r = await pool.query('INSERT INTO leads (nome,contatto,tel,citta,prodotto,stato,note,tag) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [nome, contatto, tel, citta, prodotto, stato, note, tag||null]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/leads/:id', async (req, res) => {
  const { nome, contatto, tel, citta, prodotto, stato, note, tag } = req.body;
  try {
    await pool.query('UPDATE leads SET nome=$1,contatto=$2,tel=$3,citta=$4,prodotto=$5,stato=$6,note=$7,tag=$8,updated_at=NOW() WHERE id=$9', [nome, contatto, tel, citta, prodotto, stato, note, tag||null, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM leads WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── CLIENTI API ───────────────────────────────────────────────────────────
app.get('/api/clienti', async (req, res) => {
  try {
    const tipo = req.query.tipo;
    const r = tipo
      ? await pool.query('SELECT * FROM clienti WHERE tipo=$1 ORDER BY nome', [tipo])
      : await pool.query('SELECT * FROM clienti ORDER BY tipo, nome');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

// ── HELPER: sincronizza contatto su Fatture in Cloud ─────────────────────
async function sincronizzaConFIC(dati, ficId = null) {
  if (!ficTokens || !ficCompanyId) return null; // FIC non connesso, ignora silenziosamente
  try {
    // Mappa indirizzo
    const indirizzoRaw = dati.ind_legale || dati.ind_consegna || '';
    const endpoint = dati.tipo === 'fornitore'
      ? `/c/${ficCompanyId}/entities/suppliers`
      : `/c/${ficCompanyId}/entities/clients`;

    const payload = {
      data: {
        name: dati.nome,
        vat_number: dati.piva || '',
        tax_code: dati.piva || '',
        email: dati.email || '',
        certified_email: dati.pec || '',
        phone: dati.tel || '',
        ei_code: dati.sdi || '',
        address_street: indirizzoRaw,
        address_city: dati.citta || '',
      }
    };

    let r;
    if (ficId) {
      // Aggiorna entità esistente
      r = await ficFetch(`${endpoint}/${ficId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      // Crea nuova entità
      r = await ficFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }
    if (!r.ok) return null;
    const json = await r.json();
    return json.data?.id || null;
  } catch (e) {
    console.error('Errore sync FIC:', e.message);
    return null;
  }
}

app.post('/api/clienti', async (req, res) => {
  const { nome, ref, tel, email, citta, ind, ind_legale, ind_consegna, sdi, pec, piva, prod, note, fic_id, tipo } = req.body;
  try {
    const tipoRecord = tipo || 'cliente';
    const prefisso = tipoRecord === 'fornitore' ? 'F' : 'C';
    const countR = await pool.query('SELECT COUNT(*) FROM clienti WHERE tipo=$1', [tipoRecord]);
    const n = parseInt(countR.rows[0].count) + 1;
    const codice = prefisso + String(n).padStart(3, '0');

    // Crea prima nel gestionale
    const r = await pool.query(
      'INSERT INTO clienti (codice,tipo,nome,ref,tel,email,citta,ind,ind_legale,ind_consegna,sdi,pec,piva,prod,note,fic_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *',
      [codice, tipoRecord, nome, ref, tel, email, citta, ind, ind_legale||null, ind_consegna||null, sdi||null, pec||null, piva||null, prod, note, fic_id||null]
    );
    const cliente = r.rows[0];

    // Sincronizza su FIC (in background, senza bloccare la risposta)
    sincronizzaConFIC({nome, tel, email, citta, ind_legale, ind_consegna, piva, pec, sdi, tipo:tipoRecord}, null)
      .then(nuovoFicId => {
        if (nuovoFicId) {
          pool.query('UPDATE clienti SET fic_id=$1 WHERE id=$2', [nuovoFicId, cliente.id]).catch(()=>{});
        }
      });

    res.json(cliente);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/clienti/:id', async (req, res) => {
  const { nome, ref, tel, email, citta, ind, ind_legale, ind_consegna, sdi, pec, piva, prod, note, tipo } = req.body;
  try {
    await pool.query(
      'UPDATE clienti SET tipo=$1,nome=$2,ref=$3,tel=$4,email=$5,citta=$6,ind=$7,ind_legale=$8,ind_consegna=$9,sdi=$10,pec=$11,piva=$12,prod=$13,note=$14 WHERE id=$15',
      [tipo||'cliente', nome, ref, tel, email, citta, ind, ind_legale||null, ind_consegna||null, sdi||null, pec||null, piva||null, prod, note, req.params.id]
    );

    // Sincronizza aggiornamento su FIC se il contatto ha già un fic_id
    const existing = await pool.query('SELECT fic_id FROM clienti WHERE id=$1', [req.params.id]);
    const ficId = existing.rows[0]?.fic_id;
    if (ficId) {
      sincronizzaConFIC({nome, tel, email, citta, ind_legale, ind_consegna, piva, pec, sdi, tipo:tipo||'cliente'}, ficId).catch(()=>{});
    } else {
      // Non ancora su FIC — crealo ora
      sincronizzaConFIC({nome, tel, email, citta, ind_legale, ind_consegna, piva, pec, sdi, tipo:tipo||'cliente'}, null)
        .then(nuovoFicId => {
          if (nuovoFicId) pool.query('UPDATE clienti SET fic_id=$1 WHERE id=$2', [nuovoFicId, req.params.id]).catch(()=>{});
        });
    }

    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});


app.delete('/api/clienti/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clienti WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── NOTE CLIENTI ──────────────────────────────────────────────────────────
app.get('/api/clienti/:id/note', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM note_clienti WHERE cliente_id=$1 ORDER BY created_at DESC', [req.params.id]);
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/clienti/:id/note', async (req, res) => {
  const { testo, autore } = req.body;
  try {
    const r = await pool.query('INSERT INTO note_clienti (cliente_id,testo,autore) VALUES ($1,$2,$3) RETURNING *', [req.params.id, testo, autore||'']);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/clienti/note/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM note_clienti WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});


app.post('/api/clienti/importa-fic', async (req, res) => {
  if (!ficCompanyId) return res.json({ error: 'Fatture in Cloud non connesso o azienda non selezionata' });
  try {
    // Recupera clienti E fornitori da FIC
    async function fetchAll(endpoint) {
      let lista = [], page = 1;
      while (true) {
        const r = await ficFetch(`/c/${ficCompanyId}/${endpoint}?per_page=100&page=${page}`);
        const data = await r.json();
        if (!r.ok || !data.data) break;
        lista = lista.concat(data.data);
        if (!data.next_page_url || data.data.length < 100) break;
        page++;
      }
      return lista;
    }

    const [ficClienti, ficFornitori] = await Promise.all([
      fetchAll('entities/clients'),
      fetchAll('entities/suppliers')
    ]);

    // Marca il tipo su ciascun record
    const tuttiClienti = [
      ...ficClienti.map(c => ({ ...c, _tipo: 'cliente' })),
      ...ficFornitori.map(c => ({ ...c, _tipo: 'fornitore' }))
    ];

    let importati = 0, conflitti = 0, saltati = 0;

    for (const c of tuttiClienti) {
      if (!c.name) continue;
      const piva = c.vat_number || c.tax_code || null;
      const indirizzo = [c.address_street, c.address_city, c.address_postal_code, c.address_province].filter(Boolean).join(', ');
      const tipo = c._tipo || 'cliente';
      const prefisso = tipo === 'fornitore' ? 'F' : 'C';

      if (piva) {
        const esistente = await pool.query('SELECT id, nome FROM clienti WHERE piva=$1', [piva]);
        if (esistente.rows.length > 0) {
          const ficData = { nome:c.name, piva, tipo, sdi:c.ei_code||null, pec:c.certified_email||null, email:c.email||null, tel:c.phone||null, ind_legale:indirizzo, fic_id:c.id };
          await pool.query(
            `INSERT INTO fic_conflitti (cliente_id, fic_data, stato) VALUES ($1,$2,'pending') ON CONFLICT DO NOTHING`,
            [esistente.rows[0].id, JSON.stringify(ficData)]
          );
          conflitti++;
          continue;
        }
      } else {
        const esistente = await pool.query('SELECT id FROM clienti WHERE LOWER(nome)=LOWER($1)', [c.name]);
        if (esistente.rows.length > 0) { saltati++; continue; }
      }

      // Nuovo — importa con codice progressivo per tipo
      const cntR = await pool.query('SELECT COUNT(*) FROM clienti WHERE tipo=$1', [tipo]);
      const cN = parseInt(cntR.rows[0].count) + 1;
      const codice = prefisso + String(cN).padStart(3, '0');
      await pool.query(
        'INSERT INTO clienti (codice,tipo,nome,email,tel,piva,sdi,pec,ind_legale,ind_consegna,citta,fic_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING',
        [codice, tipo, c.name, c.email||null, c.phone||null, piva, c.ei_code||null, c.certified_email||null, indirizzo, null, c.address_city||null, c.id]
      );
      importati++;
    }

    res.json({ totale: tuttiClienti.length, totaleClienti: ficClienti.length, totaleFornitori: ficFornitori.length, importati, conflitti, saltati });
  } catch (err) { res.json({ error: err.message }); }
});

// ── GESTIONE CONFLITTI ────────────────────────────────────────────────────
app.get('/api/clienti/conflitti', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT f.id, f.fic_data, f.stato, f.created_at,
             c.id as cliente_id, c.nome as cliente_nome, c.piva as cliente_piva,
             c.email as cliente_email, c.tel as cliente_tel, c.ind_legale as cliente_ind
      FROM fic_conflitti f
      JOIN clienti c ON c.id = f.cliente_id
      WHERE f.stato = 'pending'
      ORDER BY f.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

// Unisci: aggiorna il cliente con i dati di FIC
app.post('/api/clienti/conflitti/:id/unisci', async (req, res) => {
  try {
    const conflitto = await pool.query('SELECT * FROM fic_conflitti WHERE id=$1', [req.params.id]);
    if (!conflitto.rows.length) return res.json({ error: 'Conflitto non trovato' });
    const { cliente_id, fic_data } = conflitto.rows[0];
    const d = typeof fic_data === 'string' ? JSON.parse(fic_data) : fic_data;
    await pool.query(
      `UPDATE clienti SET nome=$1,piva=$2,sdi=$3,pec=$4,email=$5,tel=$6,ind_legale=$7,fic_id=$8 WHERE id=$9`,
      [d.nome, d.piva, d.sdi, d.pec, d.email, d.tel, d.ind_legale, d.fic_id, cliente_id]
    );
    await pool.query('UPDATE fic_conflitti SET stato=$1 WHERE id=$2', ['risolto', req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// Ignora: mantieni i dati esistenti, marca il conflitto come ignorato
app.post('/api/clienti/conflitti/:id/ignora', async (req, res) => {
  try {
    await pool.query('UPDATE fic_conflitti SET stato=$1 WHERE id=$2', ['ignorato', req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});


app.get('/api/ordini', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM ordini ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/ordini', async (req, res) => {
  const { cliente, cliente_id, prodotti, prodotto, qty, peso_totale, importo, data, data_consegna, stato, canale, note, note_spedizione, facchinaggio, chiamata_tel } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO ordini (cliente,cliente_id,prodotti,prodotto,qty,peso_totale,importo,data,data_consegna,stato,canale,note,note_spedizione,facchinaggio,chiamata_tel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [cliente, cliente_id||null, JSON.stringify(prodotti||[]), prodotto||'', qty||0, peso_totale||0, importo||0, data||null, data_consegna||null, stato||'bozza', canale||'telefono', note||'', note_spedizione||'', !!facchinaggio, chiamata_tel||'']
    );
    const ordine = r.rows[0];

    // Crea bozza DDT su Fatture in Cloud automaticamente
    if (ficTokens && ficCompanyId) {
      try {
        // Costruisci note spedizione
        let noteArr = [];
        if (note_spedizione) noteArr.push(note_spedizione);
        if (facchinaggio) noteArr.push('FACCHINAGGIO RICHIESTO');
        if (chiamata_tel) noteArr.push(`CHIAMARE PRIMA DELLA CONSEGNA: ${chiamata_tel}`);
        if (note) noteArr.push(note);

        // Trova fic_id del cliente
        const cli = await pool.query('SELECT fic_id FROM clienti WHERE id=$1', [cliente_id||0]);
        const ficClienteId = cli.rows[0]?.fic_id || null;

        // Righe DDT dai prodotti
        const righe = (prodotti||[]).map(p => ({
          product_id: null,
          name: p.nome || p.prodotto || prodotto,
          qty: p.bancali || p.qty || qty || 1,
          measure: 'bancali',
          net_price: p.prezzo || 0,
          vat: { value: 4 }
        }));

        if (righe.length === 0 && prodotto) {
          righe.push({ name: prodotto, qty: qty||1, measure: 'bancali', net_price: 0, vat: { value: 4 } });
        }

        const ddt = await ficFetch(`/c/${ficCompanyId}/issued_documents`, {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'delivery_note',
              entity: ficClienteId ? { id: ficClienteId } : { name: cliente },
              date: data || new Date().toISOString().slice(0,10),
              number: null, // FIC assegna automaticamente
              numeration: null,
              items_list: righe,
              notes: noteArr.join('\n'),
              delivery_note: true,
              use_gross_price: false,
              e_invoice: false,
            }
          })
        });

        if (ddt.ok) {
          const ddtData = await ddt.json();
          const ddtId = ddtData.data?.id;
          const ddtNum = ddtData.data?.number;
          if (ddtId) {
            await pool.query('UPDATE ordini SET fic_ddt_id=$1, fic_ddt_numero=$2 WHERE id=$3', [ddtId, ddtNum, ordine.id]);
            ordine.fic_ddt_id = ddtId;
            ordine.fic_ddt_numero = ddtNum;
          }
        }
      } catch(e) { console.error('Errore creazione DDT FIC:', e.message); }
    }

    res.json(ordine);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/ordini/:id', async (req, res) => {
  const { cliente, cliente_id, prodotti, prodotto, qty, peso_totale, importo, data, data_consegna, stato, canale, note, note_spedizione, facchinaggio, chiamata_tel } = req.body;
  try {
    await pool.query(
      `UPDATE ordini SET cliente=$1,cliente_id=$2,prodotti=$3,prodotto=$4,qty=$5,peso_totale=$6,importo=$7,data=$8,data_consegna=$9,stato=$10,canale=$11,note=$12,note_spedizione=$13,facchinaggio=$14,chiamata_tel=$15 WHERE id=$16`,
      [cliente, cliente_id||null, JSON.stringify(prodotti||[]), prodotto||'', qty||0, peso_totale||0, importo||0, data||null, data_consegna||null, stato||'bozza', canale||'telefono', note||'', note_spedizione||'', !!facchinaggio, chiamata_tel||'', req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/ordini/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ordini WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});


// ── MOVIMENTI API ─────────────────────────────────────────────────────────
app.get('/api/movimenti', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM movimenti ORDER BY data DESC, created_at DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/movimenti', async (req, res) => {
  const { data, tipo, importo, cat, descrizione, fatturazione, pagato, aliquota_iva, confezione, qty_kg, prezzo_kg, metodo_pagamento, prodotti } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO movimenti (data,tipo,importo,cat,descrizione,fatturazione,pagato,aliquota_iva,confezione,qty_kg,prezzo_kg,metodo_pagamento,prodotti) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *',
      [data, tipo, importo, cat, descrizione, fatturazione||'non_applicabile', pagato||false, aliquota_iva||4, confezione||null, qty_kg||null, prezzo_kg||null, metodo_pagamento||null, prodotti?JSON.stringify(prodotti):null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/movimenti/:id/pagato', async (req, res) => {
  const { pagato } = req.body;
  try {
    await pool.query('UPDATE movimenti SET pagato=$1 WHERE id=$2', [pagato, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/movimenti/:id/metodo-pagamento', async (req, res) => {
  const { metodo_pagamento } = req.body;
  try {
    await pool.query('UPDATE movimenti SET metodo_pagamento=$1 WHERE id=$2', [metodo_pagamento||null, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/movimenti/:id', async (req, res) => {
  const { data, tipo, importo, cat, descrizione, fatturazione, aliquota_iva, confezione, qty_kg, prezzo_kg, metodo_pagamento, prodotti, pagato } = req.body;
  try {
    await pool.query(
      'UPDATE movimenti SET data=$1,tipo=$2,importo=$3,cat=$4,descrizione=$5,fatturazione=$6,aliquota_iva=$7,confezione=$8,qty_kg=$9,prezzo_kg=$10,metodo_pagamento=$11,prodotti=$12,pagato=$13 WHERE id=$14',
      [data, tipo, importo, cat, descrizione, fatturazione||'non_applicabile', aliquota_iva||4, confezione||null, qty_kg||null, prezzo_kg||null, metodo_pagamento||null, prodotti?JSON.stringify(prodotti):null, pagato||false, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/movimenti/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM movimenti WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── ATTIVITÀ API ──────────────────────────────────────────────────────────
app.get('/api/attivita', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT a.*, l.nome as lead_nome, l.stato as lead_stato
      FROM attivita a
      LEFT JOIN leads l ON l.id = a.lead_id
      ORDER BY a.completata ASC, a.data_scadenza ASC NULLS LAST, a.created_at DESC
    `);
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/attivita', async (req, res) => {
  const { tipo, titolo, note, data_scadenza, ora, collegata_tipo, collegata_id, collegata_nome, lead_id, pipeline_id, completata } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO attivita (tipo,titolo,note,data_scadenza,ora,collegata_tipo,collegata_id,collegata_nome,lead_id,pipeline_id,completata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
      [tipo, titolo, note, data_scadenza||null, ora||null, collegata_tipo||null, collegata_id||null, collegata_nome||null, lead_id||null, pipeline_id||null, completata||false]
    );
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/attivita/:id', async (req, res) => {
  const { tipo, titolo, note, data_scadenza, ora, collegata_tipo, collegata_id, collegata_nome, lead_id, pipeline_id, completata } = req.body;
  try {
    await pool.query(
      'UPDATE attivita SET tipo=$1,titolo=$2,note=$3,data_scadenza=$4,ora=$5,collegata_tipo=$6,collegata_id=$7,collegata_nome=$8,lead_id=$9,pipeline_id=$10,completata=$11 WHERE id=$12',
      [tipo, titolo, note, data_scadenza||null, ora||null, collegata_tipo||null, collegata_id||null, collegata_nome||null, lead_id||null, pipeline_id||null, completata||false, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/attivita/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM attivita WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── TASK API ──────────────────────────────────────────────────────────────
app.get('/api/tasks', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM tasks ORDER BY CASE stato WHEN \'da_fare\' THEN 0 WHEN \'in_corso\' THEN 1 ELSE 2 END, scadenza ASC NULLS LAST, created_at DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/tasks', async (req, res) => {
  const { titolo, descrizione, assegnata_a, assegnata_da, priorita, stato, scadenza } = req.body;
  try {
    const r = await pool.query(
      'INSERT INTO tasks (titolo,descrizione,assegnata_a,assegnata_da,priorita,stato,scadenza) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [titolo, descrizione||'', assegnata_a, assegnata_da, priorita||'media', stato||'da_fare', scadenza||null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/tasks/:id', async (req, res) => {
  const { titolo, descrizione, assegnata_a, priorita, stato, scadenza } = req.body;
  try {
    const fields = [];
    const values = [];
    let i = 1;
    if (titolo !== undefined) { fields.push(`titolo=$${i++}`); values.push(titolo); }
    if (descrizione !== undefined) { fields.push(`descrizione=$${i++}`); values.push(descrizione); }
    if (assegnata_a !== undefined) { fields.push(`assegnata_a=$${i++}`); values.push(assegnata_a); }
    if (priorita !== undefined) { fields.push(`priorita=$${i++}`); values.push(priorita); }
    if (stato !== undefined) { fields.push(`stato=$${i++}`); values.push(stato); }
    if (scadenza !== undefined) { fields.push(`scadenza=$${i++}`); values.push(scadenza||null); }
    fields.push(`updated_at=NOW()`);
    values.push(req.params.id);
    await pool.query(`UPDATE tasks SET ${fields.join(',')} WHERE id=$${i}`, values);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── AI CHAT ───────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: req.body.messages
      })
    });
    const data = await response.json();
    res.json({ reply: data.content?.[0]?.text || 'Errore risposta AI' });
  } catch (err) { res.json({ error: err.message }); }
});


// ── ICONE PWA ─────────────────────────────────────────────────────────────
const LOGO_192 = Buffer.from('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', 'base64');
const LOGO_512 = Buffer.from('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DFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFGCAAQCgcAQJQhAIBAIDFH+PzdppnTJJPXuAAAAAElFTkSuQmCC', 'base64');
app.get('/logo-192.png', (req, res) => { res.set('Content-Type','image/png'); res.send(LOGO_192); });
app.get('/logo-512.png', (req, res) => { res.set('Content-Type','image/png'); res.send(LOGO_512); });

// ── GMAIL OAUTH ───────────────────────────────────────────────────────────
let gmailTokens = null;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// ── Secondo account Gmail dedicato alle spedizioni (One Express) ─────────
let gmailSpedizioniTokens = null;
const SPEDIZIONI_REDIRECT_URI = process.env.SPEDIZIONI_REDIRECT_URI ||
  (process.env.REDIRECT_URI ? process.env.REDIRECT_URI.replace('/auth/callback', '/auth/spedizioni/callback') : '');

const oauth2ClientSpedizioni = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  SPEDIZIONI_REDIRECT_URI
);

// Restituisce { client, tokens, label } in base al parametro ?account=principale|spedizioni
function getGmailAccount(req) {
  const account = req.query.account || 'principale';
  if (account === 'spedizioni') {
    return { client: oauth2ClientSpedizioni, tokens: gmailSpedizioniTokens, label: 'spedizioni.mulinovitaliti@gmail.com' };
  }
  return { client: oauth2Client, tokens: gmailTokens, label: 'mulino.vitaliti@gmail.com' };
}

async function loadGmailSpedizioniTokens() {
  try {
    const r = await pool.query(`SELECT valore FROM impostazioni WHERE chiave='gmail_spedizioni_tokens'`);
    if (r.rows.length) {
      gmailSpedizioniTokens = JSON.parse(r.rows[0].valore);
      oauth2ClientSpedizioni.setCredentials(gmailSpedizioniTokens);
      console.log('✅ Token Gmail Spedizioni caricati dal database');
    }
  } catch(e) { console.log('ℹ️ Nessun token Gmail Spedizioni salvato'); }
}

async function saveGmailSpedizioniTokens(tokens) {
  try {
    await pool.query(`INSERT INTO impostazioni (chiave, valore) VALUES ('gmail_spedizioni_tokens', $1) ON CONFLICT (chiave) DO UPDATE SET valore=$1`, [JSON.stringify(tokens)]);
  } catch(e) { console.error('Errore salvataggio token spedizioni:', e.message); }
}

app.get('/auth/spedizioni/debug', (req, res) => {
  res.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    spedizioniRedirectUri: SPEDIZIONI_REDIRECT_URI || '(vuoto)',
    envSpedizioniRedirectUri: process.env.SPEDIZIONI_REDIRECT_URI || '(non impostata)',
    mainRedirectUri: process.env.REDIRECT_URI || '(non impostata)'
  });
});

app.get('/auth/spedizioni/login', (req, res) => {
  if (!SPEDIZIONI_REDIRECT_URI) return res.status(500).send('Redirect URI spedizioni non configurato');
  const url = oauth2ClientSpedizioni.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
  });
  res.redirect(url);
});

app.get('/auth/spedizioni/callback', async (req, res) => {
  try {
    const { tokens } = await oauth2ClientSpedizioni.getToken(req.query.code);
    gmailSpedizioniTokens = tokens;
    oauth2ClientSpedizioni.setCredentials(tokens);
    await saveGmailSpedizioniTokens(tokens);
    res.redirect('/?spedizioni=connected');
  } catch (err) { res.status(500).send('Errore OAuth Spedizioni: ' + err.message); }
});

app.get('/api/spedizioni/gmail-status', (req, res) => {
  res.json({ connected: !!gmailSpedizioniTokens });
});

app.post('/api/spedizioni/disconnect', async (req, res) => {
  gmailSpedizioniTokens = null;
  try { await pool.query(`DELETE FROM impostazioni WHERE chiave='gmail_spedizioni_tokens'`); } catch(e) {}
  res.json({ success: true });
});

// Carica token dal DB all'avvio
async function loadGmailTokens() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS impostazioni (chiave TEXT PRIMARY KEY, valore TEXT)`);
    const r = await pool.query(`SELECT valore FROM impostazioni WHERE chiave='gmail_tokens'`);
    if (r.rows.length) {
      gmailTokens = JSON.parse(r.rows[0].valore);
      oauth2Client.setCredentials(gmailTokens);
      console.log('✅ Token Gmail caricati dal database');
    }
  } catch(e) { console.log('ℹ️ Nessun token Gmail salvato'); }
}

async function saveGmailTokens(tokens) {
  try {
    await pool.query(`INSERT INTO impostazioni (chiave, valore) VALUES ('gmail_tokens', $1) ON CONFLICT (chiave) DO UPDATE SET valore=$1`, [JSON.stringify(tokens)]);
  } catch(e) { console.error('Errore salvataggio token:', e.message); }
}

app.get('/auth/login', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.send']
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    gmailTokens = tokens;
    oauth2Client.setCredentials(tokens);
    await saveGmailTokens(tokens);
    res.redirect('/?gmail=connected');
  } catch (err) { res.status(500).send('Errore OAuth: ' + err.message); }
});

app.get('/api/gmail/status', (req, res) => {
  const { tokens, label } = getGmailAccount(req);
  res.json({ connected: !!tokens, account: label });
});

// ── FATTURE IN CLOUD (OAuth2) ────────────────────────────────────────────
let ficTokens = null;
let ficCompanyId = null;
const FIC_CLIENT_ID = process.env.FIC_CLIENT_ID;
const FIC_CLIENT_SECRET = process.env.FIC_CLIENT_SECRET;
const FIC_REDIRECT_URI = process.env.FIC_REDIRECT_URI || (process.env.REDIRECT_URI ? process.env.REDIRECT_URI.replace('/auth/callback', '/auth/fattureincloud/callback') : '');

async function loadFicTokens() {
  try {
    const r = await pool.query(`SELECT valore FROM impostazioni WHERE chiave='fic_tokens'`);
    if (r.rows.length) {
      ficTokens = JSON.parse(r.rows[0].valore);
      console.log('✅ Token Fatture in Cloud caricati dal database');
    }
    const rc = await pool.query(`SELECT valore FROM impostazioni WHERE chiave='fic_company_id'`);
    if (rc.rows.length) ficCompanyId = rc.rows[0].valore;
  } catch (e) { /* tabella non ancora pronta o nessun token salvato */ }
}

async function saveFicTokens(tokens) {
  try {
    await pool.query(`INSERT INTO impostazioni (chiave, valore) VALUES ('fic_tokens', $1) ON CONFLICT (chiave) DO UPDATE SET valore=$1`, [JSON.stringify(tokens)]);
  } catch(e) { console.error('Errore salvataggio token FIC:', e.message); }
}

async function saveFicCompanyId(id) {
  try {
    await pool.query(`INSERT INTO impostazioni (chiave, valore) VALUES ('fic_company_id', $1) ON CONFLICT (chiave) DO UPDATE SET valore=$1`, [String(id)]);
  } catch(e) { console.error('Errore salvataggio company id FIC:', e.message); }
}

async function ficRefreshTokenIfNeeded() {
  if (!ficTokens) return false;
  // Il token access_token scade dopo poco; se abbiamo un refresh_token proviamo sempre a usarlo se la chiamata fallisce con 401
  return true;
}

async function ficRefreshToken() {
  if (!ficTokens || !ficTokens.refresh_token) return false;
  try {
    const r = await fetch('https://api-v2.fattureincloud.it/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ficTokens.refresh_token,
        client_id: FIC_CLIENT_ID,
        client_secret: FIC_CLIENT_SECRET
      }).toString()
    });
    const data = await r.json();
    if (!r.ok) { console.error('Errore refresh token FIC:', data); return false; }
    ficTokens = data;
    await saveFicTokens(data);
    return true;
  } catch (e) { console.error('Errore refresh token FIC:', e.message); return false; }
}

// Helper per chiamate autenticate all'API Fatture in Cloud, con auto-refresh del token se serve
async function ficFetch(path, options = {}) {
  if (!ficTokens) throw new Error('Fatture in Cloud non connesso');
  const doCall = async () => fetch('https://api-v2.fattureincloud.it' + path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': 'Bearer ' + ficTokens.access_token,
      'Content-Type': 'application/json'
    }
  });
  let r = await doCall();
  if (r.status === 401) {
    const refreshed = await ficRefreshToken();
    if (refreshed) r = await doCall();
  }
  return r;
}

app.get('/auth/fattureincloud/debug', (req, res) => {
  res.json({
    hasClientId: !!FIC_CLIENT_ID,
    clientIdLength: FIC_CLIENT_ID ? FIC_CLIENT_ID.length : 0,
    hasClientSecret: !!FIC_CLIENT_SECRET,
    redirectUri: FIC_REDIRECT_URI || '(vuoto)',
    envFicRedirectUri: process.env.FIC_REDIRECT_URI || '(non impostata)'
  });
});

app.get('/auth/fattureincloud/login', (req, res) => {
  if (!FIC_CLIENT_ID || !FIC_REDIRECT_URI) return res.status(500).send('Fatture in Cloud non configurato (manca FIC_CLIENT_ID o redirect URI)');
  const scopes = [
    'entity.clients:r', 'entity.clients:a',
    'issued_documents.invoices:r', 'issued_documents.invoices:a',
    'issued_documents.delivery_notes:r', 'issued_documents.delivery_notes:a',
    'issued_documents.receipts:r'
  ].join(' ');
  const url = 'https://api-v2.fattureincloud.it/oauth/authorize?' + new URLSearchParams({
    response_type: 'code',
    client_id: FIC_CLIENT_ID,
    redirect_uri: FIC_REDIRECT_URI,
    scope: scopes,
    state: 'gestionale_vitaliti'
  }).toString();
  res.redirect(url);
});

app.get('/auth/fattureincloud/callback', async (req, res) => {
  try {
    if (!req.query.code) {
      console.log('Callback Fatture in Cloud senza code. Query ricevuta:', req.query);
      return res.status(400).send(
        'Codice di autorizzazione mancante.<br><br>Parametri ricevuti da Fatture in Cloud:<br><pre>' +
        JSON.stringify(req.query, null, 2) +
        '</pre>'
      );
    }
    const r = await fetch('https://api-v2.fattureincloud.it/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: req.query.code,
        client_id: FIC_CLIENT_ID,
        client_secret: FIC_CLIENT_SECRET,
        redirect_uri: FIC_REDIRECT_URI
      }).toString()
    });
    const tokens = await r.json();
    if (!r.ok) return res.status(500).send('Errore OAuth Fatture in Cloud: ' + JSON.stringify(tokens));
    ficTokens = tokens;
    await saveFicTokens(tokens);

    // Recupera l'elenco aziende collegate all'account per scegliere/salvare il company_id
    try {
      const companiesR = await ficFetch('/user/companies');
      const companiesData = await companiesR.json();
      const companies = companiesData?.data?.companies || [];
      if (companies.length === 1) {
        ficCompanyId = String(companies[0].id);
        await saveFicCompanyId(ficCompanyId);
      }
    } catch (e) { /* ignora, l'utente potrà scegliere l'azienda manualmente dopo */ }

    res.redirect('/?fic=connected');
  } catch (err) { res.status(500).send('Errore OAuth Fatture in Cloud: ' + err.message); }
});

app.get('/api/fatture/status', (req, res) => {
  res.json({ connected: !!ficTokens, companyId: ficCompanyId });
});

app.get('/api/fatture/companies', async (req, res) => {
  try {
    const r = await ficFetch('/user/companies');
    const data = await r.json();
    if (!r.ok) return res.json({ error: data.error?.message || 'Errore recupero aziende' });
    res.json(data?.data?.companies || []);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/fatture/set-company', async (req, res) => {
  const { companyId } = req.body;
  if (!companyId) return res.json({ error: 'companyId mancante' });
  ficCompanyId = String(companyId);
  await saveFicCompanyId(ficCompanyId);
  res.json({ success: true });
});

// Elenco fatture emesse (con filtro opzionale per anno)
// Registra/aggiorna un cliente nello storico ogni volta che appare in una fattura o DDT
async function registraClienteStorico(documenti, tipoDocumento) {
  for (const doc of documenti) {
    const e = doc.entity;
    if (!e || !e.name) continue;
    const importo = parseFloat(doc.amount_gross) || 0;
    try {
      const esistente = await pool.query(
        'SELECT id, num_fatture, num_ddt, importo_totale_fatturato FROM fic_clienti_storico WHERE nome=$1 AND COALESCE(vat_number,\'\')=COALESCE($2,\'\')',
        [e.name, e.vat_number || null]
      );
      if (esistente.rows.length) {
        const row = esistente.rows[0];
        const nuoveFatture = tipoDocumento === 'invoice' ? row.num_fatture + 1 : row.num_fatture;
        const nuoviDdt = tipoDocumento === 'delivery_note' ? row.num_ddt + 1 : row.num_ddt;
        const nuovoTotale = tipoDocumento === 'invoice' ? parseFloat(row.importo_totale_fatturato) + importo : parseFloat(row.importo_totale_fatturato);
        await pool.query(
          `UPDATE fic_clienti_storico SET
            indirizzo=$1, citta=$2, cap=$3, provincia=$4, email=$5, telefono=$6,
            num_fatture=$7, num_ddt=$8, importo_totale_fatturato=$9,
            ultimo_documento_tipo=$10, ultimo_documento_data=$11, ultimo_documento_numero=$12,
            updated_at=NOW()
          WHERE id=$13`,
          [
            e.address_street || null, e.address_city || null, e.address_postal_code || null, e.address_province || null,
            e.certified_email || e.email || null, e.phone || null,
            nuoveFatture, nuoviDdt, nuovoTotale,
            tipoDocumento, doc.date || null, String(doc.number || ''),
            row.id
          ]
        );
      } else {
        await pool.query(
          `INSERT INTO fic_clienti_storico
            (nome, vat_number, tax_code, indirizzo, citta, cap, provincia, email, telefono,
             num_fatture, num_ddt, importo_totale_fatturato, ultimo_documento_tipo, ultimo_documento_data, ultimo_documento_numero)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           ON CONFLICT (nome, vat_number) DO NOTHING`,
          [
            e.name, e.vat_number || null, e.tax_code || null,
            e.address_street || null, e.address_city || null, e.address_postal_code || null, e.address_province || null,
            e.certified_email || e.email || null, e.phone || null,
            tipoDocumento === 'invoice' ? 1 : 0,
            tipoDocumento === 'delivery_note' ? 1 : 0,
            tipoDocumento === 'invoice' ? importo : 0,
            tipoDocumento, doc.date || null, String(doc.number || '')
          ]
        );
      }
    } catch (e2) {
      console.error('Errore registrazione cliente storico:', e2.message);
    }
  }
}

app.get('/api/fatture/invoices', async (req, res) => {
  if (!ficCompanyId) return res.json({ error: 'Nessuna azienda Fatture in Cloud selezionata' });
  try {
    const page = req.query.page || 1;
    const params = new URLSearchParams({
      type: 'invoice',
      page: String(page),
      per_page: '100',
      sort: '-date'
    });
    const path = `/c/${ficCompanyId}/issued_documents?${params.toString()}`;
    const r = await ficFetch(path);
    const data = await r.json();
    if (!r.ok) return res.json({ error: data.error?.message || JSON.stringify(data) || 'Errore recupero fatture' });
    if (data.data && data.data.length) registraClienteStorico(data.data, 'invoice').catch(e=>console.error(e));
    res.json(data);
  } catch (err) {
    console.error('Errore route invoices:', err);
    res.json({ error: err.message });
  }
});

// Elenco DDT (documenti di trasporto)
app.get('/api/fatture/ddt', async (req, res) => {
  if (!ficCompanyId) return res.json({ error: 'Nessuna azienda Fatture in Cloud selezionata' });
  try {
    const page = req.query.page || 1;
    const params = new URLSearchParams({
      type: 'delivery_note',
      page: String(page),
      per_page: '100',
      sort: '-date'
    });
    const path = `/c/${ficCompanyId}/issued_documents?${params.toString()}`;
    const r = await ficFetch(path);
    const data = await r.json();
    if (!r.ok) return res.json({ error: data.error?.message || JSON.stringify(data) || 'Errore recupero DDT' });
    if (data.data && data.data.length) registraClienteStorico(data.data, 'delivery_note').catch(e=>console.error(e));
    res.json(data);
  } catch (err) {
    console.error('Errore route ddt:', err);
    res.json({ error: err.message });
  }
});

// Storico clienti accumulato da fatture e DDT importati
app.get('/api/fatture/clienti-storico', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM fic_clienti_storico ORDER BY updated_at DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

// Endpoint di debug temporaneo
app.get('/api/fatture/debug', async (req, res) => {
  try {
    const out = { hasTokens: !!ficTokens, companyId: ficCompanyId };
    if (ficCompanyId) {
      const r = await ficFetch(`/c/${ficCompanyId}/issued_documents?type=invoice&per_page=5`);
      const data = await r.json();
      out.status = r.status;
      out.response = data;
    }
    res.json(out);
  } catch (err) { res.json({ error: err.message }); }
});

// Dettaglio singola fattura
app.get('/api/fatture/invoices/:id', async (req, res) => {
  if (!ficCompanyId) return res.json({ error: 'Nessuna azienda Fatture in Cloud selezionata' });
  try {
    const r = await ficFetch(`/c/${ficCompanyId}/issued_documents/${req.params.id}`);
    const data = await r.json();
    if (!r.ok) return res.json({ error: data.error?.message || 'Errore recupero fattura' });
    res.json(data);
  } catch (err) { res.json({ error: err.message }); }
});

// Crea una nuova fattura
app.post('/api/fatture/invoices', async (req, res) => {
  if (!ficCompanyId) return res.json({ error: 'Nessuna azienda Fatture in Cloud selezionata' });
  try {
    const r = await ficFetch(`/c/${ficCompanyId}/issued_documents`, {
      method: 'POST',
      body: JSON.stringify({ data: req.body })
    });
    const data = await r.json();
    if (!r.ok) return res.json({ error: data.error?.message || JSON.stringify(data) });
    res.json(data);
  } catch (err) { res.json({ error: err.message }); }
});

// Elenco clienti su Fatture in Cloud (utile per associare/creare fatture)
app.get('/api/fatture/clients', async (req, res) => {
  if (!ficCompanyId) return res.json({ error: 'Nessuna azienda Fatture in Cloud selezionata' });
  try {
    const r = await ficFetch(`/c/${ficCompanyId}/entities/clients?per_page=100`);
    const data = await r.json();
    if (!r.ok) return res.json({ error: data.error?.message || 'Errore recupero clienti' });
    res.json(data?.data || []);
  } catch (err) { res.json({ error: err.message }); }
});

// Scollega l'integrazione
app.post('/api/fatture/disconnect', async (req, res) => {
  ficTokens = null;
  ficCompanyId = null;
  try {
    await pool.query(`DELETE FROM impostazioni WHERE chiave IN ('fic_tokens','fic_company_id')`);
  } catch (e) {}
  res.json({ success: true });
});

app.get('/api/gmail/inbox', async (req, res) => {
  const { client, tokens } = getGmailAccount(req);
  if (!tokens) return res.json({ error: 'Account email non connesso' });
  const folder = req.query.folder || 'inbox';
  const labelIds = folder === 'sent' ? ['SENT'] : ['INBOX'];
  try {
    client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });
    const list = await gmail.users.messages.list({ userId: 'me', maxResults: 20, labelIds });
    if (!list.data.messages) return res.json({ emails: [] });
    const emails = await Promise.all(list.data.messages.slice(0, 15).map(async m => {
      const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] });
      const headers = msg.data.payload.headers;
      const get = name => (headers.find(h => h.name === name) || {}).value || '';
      return { id: m.id, from: get('From'), to: get('To'), subject: get('Subject'), date: get('Date'), snippet: msg.data.snippet, unread: msg.data.labelIds?.includes('UNREAD') };
    }));
    res.json({ emails });
  } catch (err) { res.json({ error: err.message }); }
});

// ── SPEDIZIONI ONE EXPRESS (parsing email automatico) ───────────────────

// Estrae il testo leggibile dal payload di un messaggio Gmail, cercando prima text/plain,
// poi text/html (ripulito dai tag), usando lo snippet solo come ultima risorsa
function estraiCorpoEmail(payload) {
  function trovaParte(parts, mimeType) {
    if (!parts) return null;
    for (const p of parts) {
      if (p.mimeType === mimeType && p.body?.data) return Buffer.from(p.body.data, 'base64').toString('utf-8');
      if (p.parts) { const r = trovaParte(p.parts, mimeType); if (r) return r; }
    }
    return null;
  }
  function htmlToText(html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&agrave;/g, 'à').replace(/&egrave;/g, 'è').replace(/&igrave;/g, 'ì')
      .replace(/&ograve;/g, 'ò').replace(/&ugrave;/g, 'ù')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return { testo: Buffer.from(payload.body.data, 'base64').toString('utf-8'), fonte: 'body diretto plain text' };
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return { testo: htmlToText(Buffer.from(payload.body.data, 'base64').toString('utf-8')), fonte: 'body diretto html' };
  }
  const plain = trovaParte(payload.parts, 'text/plain');
  if (plain) return { testo: plain, fonte: 'parts plain text' };
  const html = trovaParte(payload.parts, 'text/html');
  if (html) return { testo: htmlToText(html), fonte: 'parts html ripulito' };
  return { testo: '', fonte: 'nessun corpo trovato' };
}

function estraiDatiSpedizioneOneExpress(testoEmail) {
  // Estrae i dati dalla email di One Express con pattern testuali robusti
  // Tollera spazi multipli/a capo tra l'etichetta e il valore (tipico dell'HTML convertito)
  const get = (regex) => {
    const m = testoEmail.match(regex);
    return m ? m[1].trim() : null;
  };
  const numero_ddt = get(/Numero ddt:?\s*(\d+)/i);
  const numero_tracking = get(/Numero tracci?amento:?\s*([A-Z0-9]{6,})/i);
  const pin_consegna = get(/Codice PIN conferma consegna:?\s*([A-Z0-9]{6,})/i);
  const data_consegna_prevista = get(/Consegna prevista:?\s*([^\n]+)/i);
  let indirizzo_consegna = get(/Indirizzo di consegna:?\s*\n?\s*([^\n]+(?:\n[^\n]+){0,2})/i);
  if (indirizzo_consegna) indirizzo_consegna = indirizzo_consegna.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  // L'affiliato è la riga subito dopo "preso in carico dall'affiliato..." prima del codice numerico lungo
  const affiliatoMatch = testoEmail.match(/competente\.?\s*\n+\s*([^\n]+)/i);
  const affiliato = affiliatoMatch ? affiliatoMatch[1].trim() : null;
  // Il destinatario è solitamente la prima parte dell'indirizzo di consegna, prima della via
  let destinatario = null;
  if (indirizzo_consegna) {
    const partiIndirizzo = indirizzo_consegna.split(/\s+VIA\s+|\s+CORSO\s+|\s+PIAZZA\s+/i);
    destinatario = partiIndirizzo[0] ? partiIndirizzo[0].trim() : null;
  }
  return { numero_ddt, numero_tracking, affiliato, destinatario, indirizzo_consegna, data_consegna_prevista, pin_consegna };
}

app.get('/api/spedizioni/debug-inbox', async (req, res) => {
  if (!gmailSpedizioniTokens) return res.json({ error: 'Casella spedizioni non connessa' });
  try {
    oauth2ClientSpedizioni.setCredentials(gmailSpedizioniTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2ClientSpedizioni });
    const list = await gmail.users.messages.list({ userId: 'me', maxResults: 15 });
    if (!list.data.messages) return res.json({ totale: 0, email: [] });
    const dettagli = [];
    for (const m of list.data.messages) {
      const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
      const headers = msg.data.payload.headers || [];
      dettagli.push({
        from: (headers.find(h => h.name === 'From') || {}).value || '',
        subject: (headers.find(h => h.name === 'Subject') || {}).value || '',
        date: (headers.find(h => h.name === 'Date') || {}).value || ''
      });
    }
    res.json({ totale: list.data.messages.length, email: dettagli });
  } catch (err) { res.json({ error: err.message }); }
});

app.get('/api/spedizioni/debug-parsing', async (req, res) => {
  if (!gmailSpedizioniTokens) return res.json({ error: 'Casella spedizioni non connessa' });
  try {
    oauth2ClientSpedizioni.setCredentials(gmailSpedizioniTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2ClientSpedizioni });
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1,
      q: 'from:mail.via1.it OR subject:"TRACKING ONEEXPRESS"'
    });
    if (!list.data.messages) return res.json({ trovata: false });

    const m = list.data.messages[0];
    const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });

    const { testo, fonte } = estraiCorpoEmail(msg.data.payload);
    const dati = estraiDatiSpedizioneOneExpress(testo);

    res.json({
      messageId: m.id,
      mimeTypeRoot: msg.data.payload.mimeType,
      fonteTesto: fonte,
      lunghezzaTesto: testo.length,
      primi800Caratteri: testo.slice(0, 800),
      datiEstratti: dati
    });
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/spedizioni/sincronizza', async (req, res) => {
  if (!gmailSpedizioniTokens) return res.json({ error: 'Casella email spedizioni non connessa. Vai su Spedizioni e collega l\'account spedizioni.mulinovitaliti@gmail.com' });
  try {
    oauth2ClientSpedizioni.setCredentials(gmailSpedizioniTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2ClientSpedizioni });
    // Cerca le email di One Express negli ultimi messaggi
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: 'from:mail.via1.it OR subject:"TRACKING ONEEXPRESS"'
    });
    if (!list.data.messages) return res.json({ trovate: 0, nuove: 0 });

    let nuove = 0;
    for (const m of list.data.messages) {
      // Salta se già salvata
      const esiste = await pool.query('SELECT id FROM spedizioni WHERE gmail_msg_id=$1', [m.id]);
      if (esiste.rows.length) continue;

      const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
      const headers = msg.data.payload.headers || [];
      const subject = (headers.find(h => h.name === 'Subject') || {}).value || '';
      const from = (headers.find(h => h.name === 'From') || {}).value || '';
      const dateHeader = (headers.find(h => h.name === 'Date') || {}).value || '';

      // Verifica che sia davvero una email One Express
      if (!/one\s*express/i.test(from) && !/one\s*express/i.test(subject)) continue;

      // Estrai il testo del corpo (plain text se disponibile, altrimenti html ripulito)
      const { testo } = estraiCorpoEmail(msg.data.payload);

      const dati = estraiDatiSpedizioneOneExpress(testo);
      if (!dati.numero_tracking) continue; // non sembra una email di tracking valida

      await pool.query(
        `INSERT INTO spedizioni (gmail_msg_id, numero_ddt, numero_tracking, affiliato, destinatario, indirizzo_consegna, data_consegna_prevista, pin_consegna, data_email)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (gmail_msg_id) DO NOTHING`,
        [m.id, dati.numero_ddt, dati.numero_tracking, dati.affiliato, dati.destinatario, dati.indirizzo_consegna, dati.data_consegna_prevista, dati.pin_consegna, dateHeader ? new Date(dateHeader) : null]
      );
      nuove++;
    }
    res.json({ trovate: list.data.messages.length, nuove });
  } catch (err) {
    console.error('Errore sincronizzazione spedizioni:', err);
    res.json({ error: err.message });
  }
});

app.get('/api/spedizioni', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM spedizioni ORDER BY data_email DESC NULLS LAST, created_at DESC LIMIT 100');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/spedizioni/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM spedizioni WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/gmail/send', async (req, res) => {
  if (!gmailTokens) return res.json({ error: 'Gmail non connesso' });
  const { to, subject, body, attachments, isHtml } = req.body;
  try {
    oauth2Client.setCredentials(gmailTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    let messageParts = [];
    const boundary = 'boundary_' + Date.now();
    if (attachments && attachments.length) {
      // Multipart message
      messageParts.push(`To: ${to}`);
      messageParts.push(`Subject: ${subject}`);
      messageParts.push(`MIME-Version: 1.0`);
      messageParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      messageParts.push('');
      messageParts.push(`--${boundary}`);
      messageParts.push(`Content-Type: text/html; charset=utf-8`);
      messageParts.push('');
      messageParts.push(body);
      attachments.forEach(att => {
        messageParts.push(`--${boundary}`);
        messageParts.push(`Content-Type: ${att.type}; name="${att.name}"`);
        messageParts.push(`Content-Transfer-Encoding: base64`);
        messageParts.push(`Content-Disposition: attachment; filename="${att.name}"`);
        messageParts.push('');
        messageParts.push(att.data);
      });
      messageParts.push(`--${boundary}--`);
    } else {
      messageParts = [`To: ${to}`, `Subject: ${subject}`, `Content-Type: text/${isHtml?'html':'plain'}; charset=utf-8`, '', body];
    }
    const msg = messageParts.join('\n');
    const encoded = Buffer.from(msg).toString('base64').replace(/\+/g,'-').replace(/\//g,'_');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── BOZZE API ─────────────────────────────────────────────────────────────
app.get('/api/bozze', async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS bozze (id SERIAL PRIMARY KEY, "to" TEXT, subject TEXT, body TEXT, data TIMESTAMP DEFAULT NOW())`);
    const r = await pool.query('SELECT * FROM bozze ORDER BY data DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});
app.post('/api/bozze', async (req, res) => {
  const { to, subject, body } = req.body;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS bozze (id SERIAL PRIMARY KEY, "to" TEXT, subject TEXT, body TEXT, data TIMESTAMP DEFAULT NOW())`);
    const r = await pool.query('INSERT INTO bozze ("to",subject,body) VALUES ($1,$2,$3) RETURNING *', [to, subject, body]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});
app.put('/api/bozze/:id', async (req, res) => {
  const { to, subject, body } = req.body;
  try {
    await pool.query('UPDATE bozze SET "to"=$1,subject=$2,body=$3,data=NOW() WHERE id=$4', [to, subject, body, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});
app.delete('/api/bozze/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM bozze WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── TEMPLATE API ──────────────────────────────────────────────────────────
app.get('/api/template', async (req, res) => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS template_email (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, oggetto TEXT, body TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    const r = await pool.query('SELECT * FROM template_email ORDER BY nome');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});
app.post('/api/template', async (req, res) => {
  const { nome, oggetto, body } = req.body;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS template_email (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, oggetto TEXT, body TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    const r = await pool.query('INSERT INTO template_email (nome,oggetto,body) VALUES ($1,$2,$3) RETURNING *', [nome, oggetto, body]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});
app.put('/api/template/:id', async (req, res) => {
  const { nome, oggetto, body } = req.body;
  try {
    await pool.query('UPDATE template_email SET nome=$1,oggetto=$2,body=$3 WHERE id=$4', [nome, oggetto, body, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});
app.delete('/api/template/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM template_email WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/gmail/genera', async (req, res) => {
  const { tipo, cliente, prodotto, note } = req.body;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: `Scrivi un'email professionale in italiano per Mulino Vitaliti Antonio (azienda familiare dal 1930, produce semola rimacinata di grano duro e farine in Sicilia).\nTipo: ${tipo}\nCliente: ${cliente}\nProdotto: ${prodotto}\nNote: ${note || 'nessuna'}\nScrivi solo il testo dell'email, senza oggetto.` }]
      })
    });
    const data = await response.json();
    res.json({ testo: data.content?.[0]?.text || '' });
  } catch (err) { res.json({ error: err.message }); }
});

// ── GMAIL MESSAGE COMPLETO ────────────────────────────────────────────────
app.get('/api/gmail/message/:id', async (req, res) => {
  const { client, tokens } = getGmailAccount(req);
  if (!tokens) return res.json({ error: 'Account email non connesso' });
  try {
    client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });
    const msg = await gmail.users.messages.get({ userId: 'me', id: req.params.id, format: 'full' });
    const payload = msg.data.payload;
    // Estrai body
    function getBody(parts, mimeType) {
      if (!parts) return '';
      for (const p of parts) {
        if (p.mimeType === mimeType && p.body?.data)
          return Buffer.from(p.body.data, 'base64').toString('utf-8');
        if (p.parts) { const r = getBody(p.parts, mimeType); if (r) return r; }
      }
      return '';
    }
    let body = '';
    if (payload.mimeType === 'text/html' && payload.body?.data)
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    else if (payload.mimeType === 'text/plain' && payload.body?.data)
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8').replace(/\n/g, '<br>');
    else {
      body = getBody(payload.parts, 'text/html') || getBody(payload.parts, 'text/plain').replace(/\n/g, '<br>');
    }
    // Allegati
    function getAttachments(parts) {
      if (!parts) return [];
      let atts = [];
      for (const p of parts) {
        if (p.filename && p.body?.attachmentId)
          atts.push({ filename: p.filename, attachmentId: p.body.attachmentId, mimeType: p.mimeType });
        if (p.parts) atts = atts.concat(getAttachments(p.parts));
      }
      return atts;
    }
    const attachments = getAttachments(payload.parts || []);
    res.json({ body, attachments });
  } catch (err) { res.json({ error: err.message }); }
});

app.get('/api/gmail/attachment/:msgId/:attId', async (req, res) => {
  const { client, tokens } = getGmailAccount(req);
  if (!tokens) return res.status(401).json({ error: 'Account email non connesso' });
  try {
    client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });
    const att = await gmail.users.messages.attachments.get({
      userId: 'me', messageId: req.params.msgId, id: req.params.attId
    });
    const data = Buffer.from(att.data.data, 'base64');
    const filename = req.query.filename || 'allegato';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── AUTOMAZIONI ───────────────────────────────────────────────────────────
app.get('/api/automazioni', async (req, res) => {
  try { const r = await pool.query('SELECT * FROM automazioni ORDER BY created_at DESC'); res.json(r.rows); }
  catch (err) { res.json({ error: err.message }); }
});

app.post('/api/automazioni', async (req, res) => {
  const { nome, attiva, trigger_tipo, trigger_fase_id, trigger_giorni,
    azione_email, azione_email_template_id, azione_email_oggetto, azione_email_corpo,
    azione_sposta, azione_sposta_fase_id } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO automazioni (nome,attiva,trigger_tipo,trigger_fase_id,trigger_giorni,
        azione_email,azione_email_template_id,azione_email_oggetto,azione_email_corpo,
        azione_sposta,azione_sposta_fase_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [nome, attiva??true, trigger_tipo||'giorni_in_fase', trigger_fase_id, trigger_giorni||7,
       azione_email??true, azione_email_template_id||null, azione_email_oggetto, azione_email_corpo,
       azione_sposta??false, azione_sposta_fase_id||null]
    );
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/automazioni/:id', async (req, res) => {
  const { nome, attiva, trigger_tipo, trigger_fase_id, trigger_giorni,
    azione_email, azione_email_template_id, azione_email_oggetto, azione_email_corpo,
    azione_sposta, azione_sposta_fase_id } = req.body;
  try {
    await pool.query(
      `UPDATE automazioni SET nome=$1,attiva=$2,trigger_tipo=$3,trigger_fase_id=$4,
        trigger_giorni=$5,azione_email=$6,azione_email_template_id=$7,
        azione_email_oggetto=$8,azione_email_corpo=$9,azione_sposta=$10,
        azione_sposta_fase_id=$11 WHERE id=$12`,
      [nome, attiva, trigger_tipo, trigger_fase_id, trigger_giorni,
       azione_email, azione_email_template_id||null, azione_email_oggetto, azione_email_corpo,
       azione_sposta, azione_sposta_fase_id||null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/automazioni/:id/toggle', async (req, res) => {
  try {
    await pool.query('UPDATE automazioni SET attiva = NOT attiva WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/automazioni/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM automazioni WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.get('/api/automazioni/log', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM automazioni_log ORDER BY created_at DESC LIMIT 50');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/automazioni/esegui', async (req, res) => {
  try {
    const risultati = await eseguiAutomazioni();
    res.json({ success: true, risultati });
  } catch (err) { res.json({ error: err.message }); }
});

// ── JOB AUTOMAZIONI ───────────────────────────────────────────────────────
async function inviaEmailAutomazione(a, lead) {
  if (!gmailTokens) return { ok: false, err: 'Gmail non connesso' };
  try {
    oauth2Client.setCredentials(gmailTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const emailLead = lead.email || '';
    if (!emailLead) return { ok: false, err: 'Lead senza email' };
    // Prepara corpo sostituendo variabili
    let corpo = a.azione_email_corpo || '';
    corpo = corpo.replace(/\{\{nome\}\}/gi, lead.nome||'').replace(/\{\{azienda\}\}/gi, lead.azienda||'');
    const oggetto = (a.azione_email_oggetto||'').replace(/\{\{nome\}\}/gi, lead.nome||'');
    const raw = Buffer.from(
      `To: ${emailLead}\r\nSubject: ${oggetto}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${corpo}`
    ).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    return { ok: true };
  } catch (e) { return { ok: false, err: e.message }; }
}

async function eseguiAutomazioni() {
  const risultati = [];
  try {
    const auto = await pool.query('SELECT * FROM automazioni WHERE attiva=true');
    const leads = await pool.query('SELECT l.*, f.label as fase_label FROM leads l LEFT JOIN fasi f ON l.stato=f.id');
    const fasi = await pool.query('SELECT * FROM fasi ORDER BY ordine');
    const now = new Date();
    for (const a of auto.rows) {
      if (a.trigger_tipo === 'giorni_in_fase') {
        for (const lead of leads.rows) {
          if (lead.stato !== a.trigger_fase_id) continue;
          const aggiornato = new Date(lead.updated_at || lead.created_at || now);
          const giorni = Math.floor((now - aggiornato) / (1000*60*60*24));
          if (giorni < (a.trigger_giorni||7)) continue;
          // Controlla se già eseguita su questo lead nelle ultime 24h
          const gia = await pool.query(
            `SELECT id FROM automazioni_log WHERE automazione_id=$1 AND lead_id=$2 AND created_at > NOW() - INTERVAL '24 hours'`,
            [a.id, lead.id]
          );
          if (gia.rows.length > 0) continue;
          let esito = [];
          // Azione email
          if (a.azione_email) {
            const r = await inviaEmailAutomazione(a, lead);
            esito.push(r.ok ? '✅ Email inviata' : `❌ Email: ${r.err}`);
          }
          // Azione sposta fase
          if (a.azione_sposta && a.azione_sposta_fase_id) {
            await pool.query('UPDATE leads SET stato=$1, updated_at=NOW() WHERE id=$2', [a.azione_sposta_fase_id, lead.id]);
            const nuovaFase = fasi.rows.find(f=>f.id===a.azione_sposta_fase_id);
            esito.push(`✅ Spostato in "${nuovaFase?.label||a.azione_sposta_fase_id}"`);
          }
          // Log
          await pool.query(
            'INSERT INTO automazioni_log (automazione_id,lead_id,lead_nome,azione,esito) VALUES ($1,$2,$3,$4,$5)',
            [a.id, lead.id, lead.nome, a.nome, esito.join(', ')]
          );
          await pool.query('UPDATE automazioni SET esecuzioni=esecuzioni+1, ultima_esecuzione=NOW() WHERE id=$1', [a.id]);
          risultati.push({ automazione: a.nome, lead: lead.nome, esito: esito.join(', ') });
        }
      }
    }
  } catch (e) { console.error('Errore job automazioni:', e.message); }
  return risultati;
}

// Job ogni ora
setInterval(eseguiAutomazioni, 60 * 60 * 1000);


// ── ASSICURAZIONI ─────────────────────────────────────────────────────────
app.get('/api/assicurazioni', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM assicurazioni ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/assicurazioni', async (req, res) => {
  const { cliente, ddt, data_danno, importo, rimborso_max, importo_rimborsato, modalita_rimborso, stato, note, doc_1, doc_2, doc_3, doc_4, doc_5 } = req.body;
  try {
    const r = await pool.query(
      `INSERT INTO assicurazioni (cliente,ddt,data_danno,importo,rimborso_max,importo_rimborsato,modalita_rimborso,stato,note,doc_1,doc_2,doc_3,doc_4,doc_5)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [cliente, ddt, data_danno||null, importo||0, rimborso_max||0, importo_rimborsato||0, modalita_rimborso||null, stato||'aperta', note, !!doc_1, !!doc_2, !!doc_3, !!doc_4, !!doc_5]
    );
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/assicurazioni/:id', async (req, res) => {
  const { cliente, ddt, data_danno, importo, rimborso_max, importo_rimborsato, modalita_rimborso, stato, note, doc_1, doc_2, doc_3, doc_4, doc_5 } = req.body;
  try {
    await pool.query(
      `UPDATE assicurazioni SET cliente=$1,ddt=$2,data_danno=$3,importo=$4,rimborso_max=$5,importo_rimborsato=$6,modalita_rimborso=$7,stato=$8,note=$9,doc_1=$10,doc_2=$11,doc_3=$12,doc_4=$13,doc_5=$14 WHERE id=$15`,
      [cliente, ddt, data_danno||null, importo||0, rimborso_max||0, importo_rimborsato||0, modalita_rimborso||null, stato||'aperta', note, !!doc_1, !!doc_2, !!doc_3, !!doc_4, !!doc_5, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/assicurazioni/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM assicurazioni WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// Fallback: serve index.html per tutte le route non-API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});



// ── SCAN EMAIL SAVISE PER PRATICHE ASSICURAZIONE ──────────────────────────
app.post('/api/assicurazioni/scan-email', async (req, res) => {
  try {
    // Usa l'account spedizioni.mulinovitaliti@gmail.com dove arrivano i nuovi sinistri Savise
    if (!oauth2ClientSpedizioni || !gmailSpedizioniTokens) return res.json({ error: 'Account spedizioni non connesso' });
    oauth2ClientSpedizioni.setCredentials(gmailSpedizioniTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2ClientSpedizioni });

    // Cerca TUTTE le email da Nina e filtra lato server per quelle con PDF Savise
    const search = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:nina.larosa@saviseexpress.it',
      maxResults: 50
    });
    console.log(`[ASSICURAZIONI] Query Gmail: from:nina.larosa@saviseexpress.it`);

    const messages = search.data.messages || [];
    console.log(`[ASSICURAZIONI] Trovate ${messages.length} email`);
    let create = 0, skip = 0;

    // Funzione pulizia testo — definita fuori dal loop
    const pulisci = s => (s||'').replace(/\0/g,'').replace(/[^\x09\x0A\x0D\x20-\x7E]/g,'').replace(/\s+/g,' ').trim();

    for (const msg of messages) {
      // Controlla se già processata
      const exists = await pool.query('SELECT id FROM assicurazioni WHERE gmail_msg_id=$1', [msg.id]);
      if (exists.rows.length > 0) { skip++; continue; }

      // Scarica email completa
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'full' });
      const headers = full.data.payload.headers;
      const subject = headers.find(h=>h.name==='Subject')?.value || '';
      const dateStr = headers.find(h=>h.name==='Date')?.value || '';
      const dataEmail = dateStr ? new Date(dateStr).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);

      console.log(`[ASSICURAZIONI] Elaboro email: ${subject}`);

      // Salta le risposte (oggetto che inizia con R: o RE:)
      if (/^R(E)?:/i.test(subject.trim())) {
        console.log(`[ASSICURAZIONI] Saltata (risposta): ${subject}`);
        skip++; continue;
      }

      // Salta email che non sono sinistri (mandato assicurativo, rimborsi generici, ecc.)
      if (
        subject.toUpperCase().includes('CONTRATTO') ||
        subject.toUpperCase().includes('MANDATO') ||
        subject.toLowerCase().includes('rimborso pratiche') ||
        /^I:/i.test(subject.trim())
      ) {
        console.log(`[ASSICURAZIONI] Saltata (non sinistro): ${subject}`);
        skip++; continue;
      }

      // Deve contenere SAVISE_EXPRESS_DOC nel soggetto
      if (!subject.toUpperCase().includes('SAVISE_EXPRESS_DOC')) {
        console.log(`[ASSICURAZIONI] Saltata (non DOC Savise): ${subject}`);
        skip++; continue;
      }

      // Cerca allegato PDF ricorsivamente in tutte le parti
      let testoPdf = '';
      let attachmentId = null;
      let msgId = msg.id;

      function cercaAttachment(parts) {
        if (!parts) return;
        for (const part of parts) {
          console.log(`[ASSICURAZIONI] Parte: filename="${part.filename}" mimeType="${part.mimeType}"`);
          if (part.body?.attachmentId && (
            (part.filename && (
              part.filename.toUpperCase().includes('SAVISE') ||
              part.filename.toLowerCase().endsWith('.pdf')
            )) ||
            part.mimeType === 'application/pdf' ||
            part.mimeType === 'application/octet-stream'
          )) {
            attachmentId = part.body.attachmentId;
            console.log(`[ASSICURAZIONI] PDF trovato: ${part.filename}`);
            return;
          }
          if (part.parts) cercaAttachment(part.parts);
        }
      }

      const allParts = full.data.payload.parts || [];
      // Controlla anche se l'allegato è direttamente nel body
      if (full.data.payload.body?.attachmentId) {
        attachmentId = full.data.payload.body.attachmentId;
      } else {
        cercaAttachment(allParts);
      }

      console.log(`[ASSICURAZIONI] AttachmentId trovato: ${attachmentId}`);

      if (attachmentId) {
        try {
          const att = await gmail.users.messages.attachments.get({
            userId: 'me', messageId: msgId, id: attachmentId
          });
          const pdfBuffer = Buffer.from(att.data.data, 'base64');
          console.log(`[ASSICURAZIONI] PDF scaricato: ${pdfBuffer.length} bytes`);

          // Decomprimi gli stream FlateDecoded con zlib
          const zlib = require('zlib');
          const raw = pdfBuffer.toString('binary');
          let testoFinale = '';

          const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
          let m;
          while ((m = streamRegex.exec(raw)) !== null) {
            try {
              const streamData = Buffer.from(m[1], 'binary');
              const decomp = zlib.inflateSync(streamData).toString('latin1');
              const textMatches = decomp.match(/\(([^\)\\]{2,})\)/g) || [];
              const testo = textMatches.map(x=>x.slice(1,-1)).filter(t=>/[a-zA-ZÀ-ÿ0-9]{2,}/.test(t)).join(' ');
              if (testo.length > 30) testoFinale += testo + ' ';
            } catch(e) {}
          }

          // Fallback testo in chiaro
          if (testoFinale.length < 50) {
            const matches = raw.match(/\(([^\)]{4,})\)/g) || [];
            testoFinale = matches.map(x=>x.slice(1,-1)).filter(t=>/[a-zA-Z]{3,}/.test(t)).join(' ');
          }

          testoPdf = testoFinale;
          console.log(`[ASSICURAZIONI] Testo estratto (${testoPdf.length} chars): ${testoPdf.slice(0,300)}`);
        } catch(e) { console.error('Errore lettura PDF:', e.message); }
      }

      if (!testoPdf || testoPdf.length < 50) {
        console.log(`[ASSICURAZIONI] Testo PDF insufficiente, uso solo soggetto email`);
        // Crea pratica con solo i dati dell'email senza PDF
        await pool.query(
          `INSERT INTO assicurazioni (cliente,ddt,data_danno,stato,note,gmail_msg_id) 
           VALUES ($1,$2,$3,'aperta',$4,$5)
           ON CONFLICT (gmail_msg_id) DO NOTHING`,
          [pulisci(subject), '', dataEmail, 'Importo danno da inserire manualmente.', msg.id]
        );
        create++;
        continue;
      }

      // Estrai dati dal testo con regex (formato Savise Express sempre uguale)
      let parsed = { cliente: '', ddt: '', numero_spedizione: '', data_spedizione: '', data_danno: '', descrizione_danno: '' };

      if (testoPdf && testoPdf.length > 50) {
        // Data lettera (es: "PALERMO 18.05.2026")
        const dataMatch = testoPdf.match(/PALERMO\s+(\d{1,2}\.\d{2}\.\d{4})/);
        if (dataMatch) {
          const p = dataMatch[1].split('.');
          parsed.data_danno = `${p[2]}-${p[1]}-${p[0]}`;
        }
        // Numero spedizione (es: "Sped.n. 2026-115- 16577")
        const spedMatch = testoPdf.match(/Sped\.n\.\s*([\d\-\s]+)del/);
        if (spedMatch) parsed.numero_spedizione = spedMatch[1].replace(/\s/g,'').trim();
        // Data spedizione
        const dataSpedMatch = testoPdf.match(/del\s+(\d{1,2}\.\d{2}\.\d{4})/);
        if (dataSpedMatch) {
          const p = dataSpedMatch[1].split('.');
          parsed.data_spedizione = `${p[2]}-${p[1]}-${p[0]}`;
        }
        // Destinatario (cliente)
        const destMatch = testoPdf.match(/dest\.\s+([^\-\n]{5,50})\s*-/);
        if (destMatch) parsed.cliente = destMatch[1].trim();
        // Rif. mittente (DDT)
        const rifMatch = testoPdf.match(/rif\.\s*mitt\.\s+(\S+)/i);
        if (rifMatch) parsed.ddt = rifMatch[1].trim();
        // Descrizione danno — cerca vari pattern
        const dannoPatterns = [
          /seguete danno[:\s]*([^\n]{5,100})/i,
          /ete danno[:\s]*([^\n]{5,100})/i,
          /danno[:\s]*([^\n]{5,100})/i,
          /riserva[^\n]{3,}([^\n]{5,80})/i,
        ];
        for (const pat of dannoPatterns) {
          const m = testoPdf.match(pat);
          if (m && m[1]) {
            let danno = m[1].trim();
            // Taglia alla fine della descrizione utile
            const cutPoints = ['a valore', 'Vi ricordiamo', 'Ci scusiamo', 'saluti', 'entro 48h'];
            for (const cut of cutPoints) {
              const idx = danno.toLowerCase().indexOf(cut.toLowerCase());
              if (idx > 0) { danno = danno.slice(0, idx).trim(); break; }
            }
            if (danno.length > 3) { parsed.descrizione_danno = danno; break; }
          }
        }
      }

      // Fallback: usa il nome file per estrarre cliente e DDT
      if (!parsed.cliente) {
        const fileMatch = subject.match(/SAVISE_EXPRESS_DOC_[^_]+_[^_]+_([^_]+)_\s*(\d+)/);
        if (fileMatch) { parsed.cliente = fileMatch[1].trim(); parsed.ddt = fileMatch[2].trim(); }
      }

      console.log(`[ASSICURAZIONI] Dati estratti: cliente="${parsed.cliente}" ddt="${parsed.ddt}" data_danno="${parsed.data_danno}"`);

      // Crea la pratica — ignora se già esiste (ON CONFLICT)

      // Crea la pratica — ignora se già esiste (ON CONFLICT)
      await pool.query(
        `INSERT INTO assicurazioni (cliente,ddt,data_danno,stato,note,gmail_msg_id) 
         VALUES ($1,$2,$3,'aperta',$4,$5)
         ON CONFLICT (gmail_msg_id) DO NOTHING`,
        [
          pulisci(parsed.cliente || subject),
          pulisci(parsed.ddt || ''),
          parsed.data_danno || dataEmail,
          pulisci([
            parsed.numero_spedizione ? `N° spedizione: ${parsed.numero_spedizione}` : '',
            parsed.data_spedizione ? `Data spedizione: ${parsed.data_spedizione}` : '',
            parsed.descrizione_danno ? `Danno: ${parsed.descrizione_danno}` : '',
            'Importo danno da inserire manualmente.'
          ].filter(Boolean).join('\n')),
          msg.id
        ]
      );
      create++;
    }

    res.json({ nuove: create, saltate: skip, totale: messages.length });
  } catch(err) { res.json({ error: err.message }); }
});



// ── AUTO-RELOAD: timestamp avvio server ───────────────────────────────────
const SERVER_START_TIME = Date.now().toString();
app.get('/api/version', (req, res) => res.json({ v: SERVER_START_TIME }));

const PORT = process.env.PORT || 3000;
initDB().then(async () => {
  await loadGmailTokens();
  await loadGmailSpedizioniTokens();
  await loadFicTokens();
  app.listen(PORT, () => console.log(`✅ Server avviato su porta ${PORT}`));
});
