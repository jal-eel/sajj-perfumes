/* Minimal Express server for SAJJ
 * - /api/orders (GET, POST)
 * - /api/orders/:id (PUT)
 * - /api/upload-proof (POST) - file uploads
 * - /api/verify-paystack (POST) - verifies a Paystack reference using PAYSTACK_SECRET_KEY env var
 * To run:
 *  - npm install
 *  - set PAYSTACK_SECRET_KEY in env (for verify endpoint)
 *  - node server.js
 */
try { require('dotenv').config(); } catch(e) { console.log('Note: dotenv not loaded (using defaults)'); }
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Optional modules - server will run even if these fail to install
let fetch = null;
try { fetch = require('node-fetch'); } catch(e) { console.log('Note: node-fetch not found (Paystack verify disabled)'); }


const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic admin auth middleware (enabled only when ADMIN_USER and ADMIN_PASS are set)
function requireAdmin(req, res, next){
  const ADMIN_USER = process.env.ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASS || 'SadiqAsmauJaleelJabbar';
  if (!ADMIN_USER || !ADMIN_PASS) return next(); // auth not configured
  const auth = req.headers.authorization;
  if (!auth){ res.set('WWW-Authenticate', 'Basic realm="SAJJ Admin"'); return res.status(401).end(); }
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Basic'){ res.set('WWW-Authenticate', 'Basic realm="SAJJ Admin"'); return res.status(401).end(); }
  const creds = Buffer.from(parts[1], 'base64').toString();
  const [user, pass] = creds.split(':');
  if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
  res.set('WWW-Authenticate', 'Basic realm="SAJJ Admin"'); return res.status(401).end();
}

  // Simple email via FormSubmit (No SMTP/Password needed)
  const adminEmail = process.env.ADMIN_EMAIL || 'sajjplace@gmail.com';
  
  const payload = {
    _subject: `New Order ${order.id} - ₦${Number(order.total).toFixed(2)}`,
    _template: 'table',
    Order_ID: order.id,
    Date: new Date(order.date).toLocaleString(),
    Customer_Name: order.customer.name,
    Customer_Email: order.customer.email,
    Customer_Phone: order.customer.phone,
    Address: order.customer.address,
    Items: (order.items || []).map(i => `${i.qty}x ${i.name}`).join(', '),
    Total: `₦${Number(order.total).toFixed(2)}`,
    Payment_Method: order.payment ? order.payment.method : 'N/A',
    Notes: order.notes || ''
  };

  if (fetch) {
    fetch(`https://formsubmit.co/ajax/${adminEmail}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(() => console.log('Order email sent via FormSubmit'))
    .catch(e => console.error('Failed to send email', e));
  }


// Tickets/email & WhatsApp notification
async function sendTicketNotification(ticket){
  const adminEmail = process.env.ADMIN_EMAIL;
  const subject = `New message ${ticket.id}`;
  let html = `<p>New message <strong>${ticket.id}</strong> received on ${new Date(ticket.date).toLocaleString()}.</p>`;
  html += `<p><strong>Name:</strong> ${ticket.name} — <strong>Email:</strong> ${ticket.email} — <strong>Phone:</strong> ${ticket.phone || 'N/A'}</p>`;
  html += `<h4>Message</h4><p>${(ticket.message || '').replace(/\n/g, '<br>')}</p>`;
  html += `<p><a href="/contact.html">Open contact page</a></p>`;

  // Email notification
  if (!mailer){
    console.info('SMTP not configured — skipping ticket email, but logging notification:');
    console.info(subject);
    console.info(html);
  } else {
    try{ await mailer.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: adminEmail, subject, html }); }
    catch(err){ console.warn('Failed to send ticket notification email', err); }
  }

  // WhatsApp notification (optional)
  const whatsappTo = process.env.TWILIO_WHATSAPP_TO;
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
  if (twilioClient && whatsappTo && whatsappFrom){
    try{
      const toAddr = whatsappTo.startsWith('whatsapp:') ? whatsappTo : `whatsapp:${whatsappTo}`;
      const fromAddr = whatsappFrom.startsWith('whatsapp:') ? whatsappFrom : `whatsapp:${whatsappFrom}`;
      const body = `New message ${ticket.id} — ${ticket.name} — ${ticket.email} — ${ticket.phone || ''} \n${(ticket.message||'').slice(0,200)}`;
      await twilioClient.messages.create({ from: fromAddr, to: toAddr, body });
    }catch(err){ console.warn('Failed to send WhatsApp ticket notification', err); }
  }

  // SMS notification (optional) — uses TWILIO_SMS_FROM and TWILIO_SMS_TO or ADMIN_PHONE
  const smsTo = process.env.TWILIO_SMS_TO || process.env.ADMIN_PHONE;
  const smsFrom = process.env.TWILIO_SMS_FROM; // must be a Twilio number (E.164)
  if (twilioClient && smsTo && smsFrom){
    try{
      const body = `New message ${ticket.id} — ${ticket.name} — ${ticket.phone || ''} — ${ticket.email}. ${(ticket.message||'').slice(0,140)}`;
      await twilioClient.messages.create({ from: smsFrom, to: smsTo, body });
    }catch(err){ console.warn('Failed to send SMS ticket notification', err); }
  }
}

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');

// support simple tickets from contact form
const TICKETS_FILE = path.join(DATA_DIR, 'tickets.json');
if (!fs.existsSync(TICKETS_FILE)) fs.writeFileSync(TICKETS_FILE, '[]');
const SUBS_FILE = path.join(DATA_DIR, 'subscribers.json');
if (!fs.existsSync(SUBS_FILE)) fs.writeFileSync(SUBS_FILE, '[]');
const REVIEWS_FILE = path.join(DATA_DIR, 'reviews.json');
if (!fs.existsSync(REVIEWS_FILE)) fs.writeFileSync(REVIEWS_FILE, '[]');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
});
const upload = multer({ storage });

// Serve uploads
app.use('/uploads', express.static(UPLOADS));

// Serve static website files (HTML, CSS, JS)
app.use(express.static(__dirname));

function readOrders(){ try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || '[]'); } catch(e){ return []; } }
function writeOrders(orders){ fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2)); }

function readTickets(){ try { return JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8') || '[]'); } catch(e){ return []; } }
function writeTickets(tickets){ fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2)); }
function readSubs(){ try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf8') || '[]'); } catch(e){ return []; } }
function writeSubs(subs){ fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2)); }
function readReviews(){ try { return JSON.parse(fs.readFileSync(REVIEWS_FILE, 'utf8') || '[]'); } catch(e){ return []; } }
function writeReviews(reviews){ fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2)); }

app.get('/api/orders', requireAdmin, (req, res) => {
  res.json(readOrders());
});

app.post('/api/orders', (req, res) => {
  const orders = readOrders();
  const order = req.body;
  if (!order || !order.id){ return res.status(400).json({ error: 'Missing order or order id' }); }
  // prevent duplicates
  if (orders.find(o => o.id === order.id)){ return res.status(200).json({ ok: true, id: order.id }); }
  orders.push(order);
  writeOrders(orders);
  // notify admin via email/WhatsApp (best-effort)
  sendOrderNotification(order).catch(()=>{});
  return res.json({ ok: true, id: order.id });
});

// Tickets endpoints
app.get('/api/tickets', requireAdmin, (req, res) => {
  res.json(readTickets());
});

app.post('/api/tickets', (req, res) => {
  try {
    const tickets = readTickets();
    let ticket = req.body;
    
    console.log('Received ticket payload:', ticket); // Debug log

    // Ensure ticket is an object (handle empty body or parsing issues gracefully)
    if (!ticket || typeof ticket !== 'object') ticket = {};

    // Auto-generate ID and Date if missing
    if (!ticket.id) ticket.id = 't_' + Date.now();
    if (!ticket.date) ticket.date = new Date().toISOString();

    // prevent duplicates
    if (tickets.find(t => t.id === ticket.id)){ return res.status(200).json({ ok: true, id: ticket.id }); }
    
    tickets.push(ticket);
    writeTickets(tickets);
    
    // notify admin via email/WhatsApp/SMS (best-effort)
    sendTicketNotification(ticket).catch(e => console.log('Notify error', e));
    
    return res.json({ ok: true, id: ticket.id });
  } catch (e) {
    console.error('Ticket Error:', e);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/tickets/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  const tickets = readTickets();
  const idx = tickets.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Ticket not found' });
  tickets[idx] = Object.assign({}, tickets[idx], req.body);
  writeTickets(tickets);
  return res.json({ ok: true, id });
});

app.delete('/api/tickets/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  let tickets = readTickets();
  const initLen = tickets.length;
  tickets = tickets.filter(t => t.id !== id);
  if (tickets.length === initLen) return res.status(404).json({ error: 'Ticket not found' });
  writeTickets(tickets);
  res.json({ ok: true, id });
});

// Newsletter subscription
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const subs = readSubs();
  if (!subs.includes(email)) { subs.push(email); writeSubs(subs); }
  // Optional: Send welcome email here using `mailer`
  res.json({ ok: true });
});

// Reviews endpoints
app.get('/api/reviews', (req, res) => {
  res.json(readReviews());
});

app.post('/api/reviews', (req, res) => {
  const reviews = readReviews();
  const { name, rating, text } = req.body;
  if (!name || !text) return res.status(400).json({ error: 'Missing fields' });
  
  const review = {
    id: 'r_' + Date.now(),
    date: new Date().toISOString(),
    name, rating, text
  };
  reviews.push(review);
  writeReviews(reviews);
  res.json({ ok: true });
});

app.put('/api/orders/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  const orders = readOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  orders[idx] = Object.assign({}, orders[idx], req.body);
  writeOrders(orders);
  res.json({ ok: true, id });
});

// Upload proof file
app.post('/api/upload-proof', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = '/uploads/' + path.basename(req.file.path);
  res.json({ ok: true, url });
});

// Verify Paystack reference
app.post('/api/verify-paystack', requireAdmin, async (req, res) => {
  if (!fetch) return res.status(500).json({ error: 'Server missing node-fetch module' });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return res.status(500).json({ error: 'PAYSTACK_SECRET_KEY not configured' });
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: 'Missing reference' });
  try{
    const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` }
    });
    const json = await r.json();
    return res.json(json);
  }catch(err){ return res.status(500).json({ error: 'Verification failed', detail: String(err) }); }
});

// Handle 404 errors (Must be the last route)
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
