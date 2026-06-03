const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── OAuth2 Gmail ─────────────────────────────────────────────────────
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.REDIRECT_URI
  );
}

// Token in memoria (in produzione usare un DB)
let savedTokens = null;

// Login Gmail
app.get('/auth/login', (req, res) => {
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ]
  });
  res.redirect(url);
});

// Callback OAuth
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    savedTokens = tokens;
    res.redirect('/?gmail=connected');
  } catch (err) {
    res.redirect('/?gmail=error');
  }
});

// Stato connessione Gmail
app.get('/api/gmail/status', (req, res) => {
  res.json({ connected: !!savedTokens });
});

// Leggi email
app.get('/api/gmail/inbox', async (req, res) => {
  if (!savedTokens) return res.status(401).json({ error: 'Gmail non connesso' });
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(savedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 20,
      labelIds: ['INBOX']
    });
    const messages = list.data.messages || [];
    const emails = await Promise.all(messages.slice(0, 15).map(async (msg) => {
      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date']
      });
      const headers = detail.data.payload.headers;
      const get = (name) => (headers.find(h => h.name === name) || {}).value || '';
      return {
        id: msg.id,
        from: get('From'),
        subject: get('Subject'),
        date: get('Date'),
        snippet: detail.data.snippet,
        unread: detail.data.labelIds && detail.data.labelIds.includes('UNREAD')
      };
    }));
    res.json({ emails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invia email
app.post('/api/gmail/send', async (req, res) => {
  if (!savedTokens) return res.status(401).json({ error: 'Gmail non connesso' });
  const { to, subject, body } = req.body;
  if (!to || !subject || !body) return res.status(400).json({ error: 'Mancano campi obbligatori' });
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(savedTokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\n');
    const encoded = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Genera testo email con AI
app.post('/api/gmail/genera', async (req, res) => {
  const { tipo, cliente, prodotto, note } = req.body;
  const prompt = `Scrivi un'email professionale in italiano per il Mulino Vitaliti Antonio (azienda che vende semola rimacinata di grano duro e farine).
Tipo email: ${tipo}
Cliente: ${cliente}
Prodotto: ${prodotto || 'semola rimacinata di grano duro'}
Note aggiuntive: ${note || 'nessuna'}
Scrivi solo il testo dell'email (oggetto e corpo), in modo professionale ma cordiale.`;
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
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    res.json({ testo: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Claude AI Chat ───────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'Manca il messaggio' });
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
        messages
      })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    res.json({ reply: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: 'Errore server: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server avviato sulla porta ${PORT}`));
