'use strict';

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3847;
const ROOT = __dirname;
const ORDERS_FILE = path.join(ROOT, 'orders.json');
const MENU_FILE = path.join(ROOT, 'menu.json');
const SOLD_OUT_FILE = path.join(ROOT, 'sold-out.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(ROOT, 'public')));

function readOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function readMenu() {
  return JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
}

function readSoldOut() {
  try {
    const raw = JSON.parse(fs.readFileSync(SOLD_OUT_FILE, 'utf8'));
    const ids = Array.isArray(raw.ids) ? raw.ids : (Array.isArray(raw) ? raw : []);
    return new Set(ids.map(String));
  } catch {
    return new Set();
  }
}

function writeSoldOut(ids) {
  const unique = Array.from(new Set((ids || []).map(String)));
  fs.writeFileSync(SOLD_OUT_FILE, JSON.stringify({ ids: unique }, null, 2), 'utf8');
}

function menuWithSoldOut() {
  const menu = readMenu();
  const sold = readSoldOut();
  const sections = (menu.sections || []).map((sec) => ({
    ...sec,
    items: (sec.items || []).map((item) => ({
      ...item,
      soldOut: sold.has(String(item.id)),
    })),
  }));
  return { ...menu, sections };
}


function getLanUrls(port) {
  const urls = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        urls.push(`http://${iface.address}:${port}`);
      }
    }
  }
  return urls;
}

app.get('/api/menu', (_req, res) => {
  try {
    res.json(menuWithSoldOut());
  } catch (err) {
    res.status(500).json({ error: 'Failed to load menu', detail: String(err.message) });
  }
});

app.get('/api/sold-out', (_req, res) => {
  res.json({ ids: Array.from(readSoldOut()) });
});

app.put('/api/sold-out', (req, res) => {
  const body = req.body || {};
  let ids = Array.isArray(body.ids) ? body.ids.map(String) : null;
  if (!ids && body.id) {
    const sold = readSoldOut();
    const id = String(body.id);
    if (body.soldOut === false) sold.delete(id);
    else sold.add(id);
    ids = Array.from(sold);
  }
  if (!ids) {
    return res.status(400).json({ error: 'Send { ids: [...] } or { id, soldOut }' });
  }
  // Only allow known menu item ids
  let allowed = new Set();
  try {
    const menu = readMenu();
    for (const sec of menu.sections || []) {
      for (const item of sec.items || []) {
        if (item.id) allowed.add(String(item.id));
      }
    }
  } catch (_) {}
  ids = ids.filter((id) => allowed.has(id));
  writeSoldOut(ids);
  res.json({ ids });
});


app.get('/api/orders', (_req, res) => {
  res.json(readOrders());
});

app.get('/api/orders/:id', (req, res) => {
  const id = req.params.id;
  const order = readOrders().find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

app.post('/api/orders', (req, res) => {
  const body = req.body || {};
  const guestName = String(body.guestName || '').trim();
  const notes = String(body.notes || '').trim();
  const items = Array.isArray(body.items) ? body.items : [];

  if (!guestName) {
    return res.status(400).json({ error: 'Guest name is required' });
  }
  if (items.length === 0) {
    return res.status(400).json({ error: 'Pick at least one item' });
  }

  let menuById = {};
  try {
    const menu = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'));
    for (const sec of menu.sections || []) {
      for (const item of sec.items || []) {
        if (item.id) menuById[item.id] = item;
      }
    }
  } catch (_) {}

  const cleaned = items
    .map((it) => {
      const id = String(it.id || '');
      const fromMenu = menuById[id] || {};
      return {
        id,
        name: String(it.name || fromMenu.name || ''),
        emoji: String(it.emoji || fromMenu.emoji || ''),
        image: String(it.image || fromMenu.image || ''),
        qty: Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1)),
        milk: it.milk ? String(it.milk) : null,
      };
    })
    .filter((it) => it.name && it.qty > 0);

  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'Invalid items' });
  }

  const sold = readSoldOut();
  const soldHit = cleaned.filter((it) => sold.has(String(it.id)));
  if (soldHit.length) {
    return res.status(409).json({
      error: 'Some items are sold out: ' + soldHit.map((it) => it.name).join(', '),
      soldOutIds: soldHit.map((it) => it.id),
    });
  }

  const order = {
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    guestName,
    notes,
    items: cleaned,
    status: 'new',
  };

  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);

  // Also broadcast via simple in-memory notify for same-process clients (SSE optional later)
  res.status(201).json(order);
});

app.patch('/api/orders/:id', (req, res) => {
  const id = req.params.id;
  const status = String((req.body && req.body.status) || '').toLowerCase();
  const allowed = ['new', 'making', 'ready', 'done'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
  }

  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  orders[idx].status = status;
  orders[idx].updatedAt = new Date().toISOString();
  writeOrders(orders);
  res.json(orders[idx]);
});

app.delete('/api/orders', (req, res) => {
  // Host utility: clear done orders, or all with ?all=1
  const all = req.query.all === '1';
  let orders = readOrders();
  if (all) {
    orders = [];
  } else {
    orders = orders.filter((o) => o.status !== 'done');
  }
  writeOrders(orders);
  res.json({ ok: true, remaining: orders.length });
});


app.get('/api/qr', async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const data = String(req.query.data || req.query.url || '').trim();
    if (!data) {
      return res.status(400).json({ error: 'Missing data query param' });
    }
    const png = await QRCode.toBuffer(data, {
      type: 'png',
      width: 512,
      margin: 2,
      color: { dark: '#2c1810', light: '#ffffff' },
    });
    res.set('Cache-Control', 'no-store');
    res.type('png').send(png);
  } catch (err) {
    res.status(500).json({ error: 'QR failed', detail: String(err.message) });
  }
});

// SPA-ish: kitchen and qr are static html files
app.get('/kitchen', (_req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'kitchen.html'));
});

app.get('/qr', (_req, res) => {
  res.sendFile(path.join(ROOT, 'public', 'qr.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const lan = getLanUrls(PORT);
  console.log('');
  console.log('☕  Oct Cafe is open!');
  console.log(`   Local:   http://localhost:${PORT}`);
  if (lan.length) {
    lan.forEach((u) => console.log(`   LAN:     ${u}`));
    console.log(`   Guests:  open the LAN URL (or /qr) on their phones`);
    console.log(`   Kitchen: ${lan[0]}/kitchen`);
  } else {
    console.log('   (No LAN IP detected — check Wi‑Fi / ethernet)');
  }
  console.log('');
});
