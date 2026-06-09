const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
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
      CREATE TABLE IF NOT EXISTS fasi (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        color TEXT NOT NULL,
        ordine INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        contatto TEXT,
        tel TEXT,
        citta TEXT,
        prodotto TEXT,
        stato TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clienti (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL,
        ref TEXT,
        tel TEXT,
        email TEXT,
        citta TEXT,
        ind TEXT,
        prod TEXT,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ordini (
        id SERIAL PRIMARY KEY,
        cliente TEXT NOT NULL,
        prodotto TEXT,
        qty NUMERIC,
        importo NUMERIC,
        data DATE,
        stato TEXT DEFAULT 'aperto',
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS movimenti (
        id SERIAL PRIMARY KEY,
        data DATE NOT NULL,
        tipo TEXT NOT NULL,
        importo NUMERIC NOT NULL,
        cat TEXT,
        desc TEXT,
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

    console.log('✅ Database inizializzato');
  } catch (err) {
    console.error('❌ Errore DB init:', err.message);
  } finally {
    client.release();
  }
}

// ── AUTH API ──────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const r = await pool.query('SELECT * FROM utenti WHERE username=$1 AND password=$2', [username, password]);
    if (!r.rows.length) return res.json({ error: 'Credenziali non valide' });
    const u = r.rows[0];
    if (u.pending) return res.json({ error: 'Account in attesa di approvazione' });
    res.json({ success: true, user: { id: u.id, nome: u.nome, username: u.username, ruolo: u.ruolo, email: u.email } });
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/register', async (req, res) => {
  const { nome, username, password, ruolo, email } = req.body;
  try {
    await pool.query('INSERT INTO utenti (nome, username, password, ruolo, email, pending) VALUES ($1,$2,$3,$4,$5,true)', [nome, username, password, ruolo || 'commerciale', email]);
    res.json({ success: true });
  } catch (err) {
    if (err.code === '23505') return res.json({ error: 'Username già esistente' });
    res.json({ error: err.message });
  }
});

app.post('/api/reset-password', async (req, res) => {
  const { email, password } = req.body;
  try {
    const r = await pool.query('UPDATE utenti SET password=$1 WHERE email=$2 RETURNING id', [password, email]);
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
    const r = await pool.query('INSERT INTO utenti (nome, username, password, ruolo, email) VALUES ($1,$2,$3,$4,$5) RETURNING *', [nome, username, password, ruolo, email || '']);
    res.json(r.rows[0]);
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
app.get('/api/fasi', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM fasi ORDER BY ordine');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/fasi', async (req, res) => {
  const { id, label, color, ordine } = req.body;
  try {
    const r = await pool.query('INSERT INTO fasi (id, label, color, ordine) VALUES ($1,$2,$3,$4) RETURNING *', [id, label, color, ordine || 0]);
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

// ── LEADS API ─────────────────────────────────────────────────────────────
app.get('/api/leads', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/leads', async (req, res) => {
  const { nome, contatto, tel, citta, prodotto, stato, note } = req.body;
  try {
    const r = await pool.query('INSERT INTO leads (nome,contatto,tel,citta,prodotto,stato,note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [nome, contatto, tel, citta, prodotto, stato, note]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/leads/:id', async (req, res) => {
  const { nome, contatto, tel, citta, prodotto, stato, note } = req.body;
  try {
    await pool.query('UPDATE leads SET nome=$1,contatto=$2,tel=$3,citta=$4,prodotto=$5,stato=$6,note=$7 WHERE id=$8', [nome, contatto, tel, citta, prodotto, stato, note, req.params.id]);
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
    const r = await pool.query('SELECT * FROM clienti ORDER BY nome');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/clienti', async (req, res) => {
  const { nome, ref, tel, email, citta, ind, prod, note } = req.body;
  try {
    const r = await pool.query('INSERT INTO clienti (nome,ref,tel,email,citta,ind,prod,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [nome, ref, tel, email, citta, ind, prod, note]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/clienti/:id', async (req, res) => {
  const { nome, ref, tel, email, citta, ind, prod, note } = req.body;
  try {
    await pool.query('UPDATE clienti SET nome=$1,ref=$2,tel=$3,email=$4,citta=$5,ind=$6,prod=$7,note=$8 WHERE id=$9', [nome, ref, tel, email, citta, ind, prod, note, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/clienti/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clienti WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

// ── ORDINI API ────────────────────────────────────────────────────────────
app.get('/api/ordini', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM ordini ORDER BY created_at DESC');
    res.json(r.rows);
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/ordini', async (req, res) => {
  const { cliente, prodotto, qty, importo, data, stato, note } = req.body;
  try {
    const r = await pool.query('INSERT INTO ordini (cliente,prodotto,qty,importo,data,stato,note) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [cliente, prodotto, qty, importo, data, stato, note]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/ordini/:id', async (req, res) => {
  const { cliente, prodotto, qty, importo, data, stato, note } = req.body;
  try {
    await pool.query('UPDATE ordini SET cliente=$1,prodotto=$2,qty=$3,importo=$4,data=$5,stato=$6,note=$7 WHERE id=$8', [cliente, prodotto, qty, importo, data, stato, note, req.params.id]);
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
  const { data, tipo, importo, cat, desc } = req.body;
  try {
    const r = await pool.query('INSERT INTO movimenti (data,tipo,importo,cat,desc) VALUES ($1,$2,$3,$4,$5) RETURNING *', [data, tipo, importo, cat, desc]);
    res.json(r.rows[0]);
  } catch (err) { res.json({ error: err.message }); }
});

app.put('/api/movimenti/:id', async (req, res) => {
  const { data, tipo, importo, cat, desc } = req.body;
  try {
    await pool.query('UPDATE movimenti SET data=$1,tipo=$2,importo=$3,cat=$4,desc=$5 WHERE id=$6', [data, tipo, importo, cat, desc, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.json({ error: err.message }); }
});

app.delete('/api/movimenti/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM movimenti WHERE id=$1', [req.params.id]);
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

// ── GMAIL OAUTH ───────────────────────────────────────────────────────────
let gmailTokens = null;

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.REDIRECT_URI
);

app.get('/auth/login', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/gmail.send']
  });
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { tokens } = await oauth2Client.getToken(req.query.code);
    gmailTokens = tokens;
    oauth2Client.setCredentials(tokens);
    res.redirect('/?gmail=connected');
  } catch (err) { res.status(500).send('Errore OAuth: ' + err.message); }
});

app.get('/api/gmail/status', (req, res) => {
  res.json({ connected: !!gmailTokens });
});

app.get('/api/gmail/inbox', async (req, res) => {
  if (!gmailTokens) return res.json({ error: 'Gmail non connesso' });
  try {
    oauth2Client.setCredentials(gmailTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const list = await gmail.users.messages.list({ userId: 'me', maxResults: 20, labelIds: ['INBOX'] });
    if (!list.data.messages) return res.json({ emails: [] });
    const emails = await Promise.all(list.data.messages.slice(0, 15).map(async m => {
      const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
      const headers = msg.data.payload.headers;
      const get = name => (headers.find(h => h.name === name) || {}).value || '';
      return { id: m.id, from: get('From'), subject: get('Subject'), date: get('Date'), snippet: msg.data.snippet, unread: msg.data.labelIds?.includes('UNREAD') };
    }));
    res.json({ emails });
  } catch (err) { res.json({ error: err.message }); }
});

app.post('/api/gmail/send', async (req, res) => {
  if (!gmailTokens) return res.json({ error: 'Gmail non connesso' });
  const { to, subject, body } = req.body;
  try {
    oauth2Client.setCredentials(gmailTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const msg = [`To: ${to}`, `Subject: ${subject}`, 'Content-Type: text/plain; charset=utf-8', '', body].join('\n');
    const encoded = Buffer.from(msg).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });
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

// ── START ─────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, () => console.log(`✅ Server avviato su porta ${PORT}`));
});
