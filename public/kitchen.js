'use strict';

const STATUSES = ['new', 'making', 'ready', 'done'];
const root = document.getElementById('ordersRoot');
const clearDoneBtn = document.getElementById('clearDone');
const armSoundBtn = document.getElementById('armSound');
const newOrderBadge = document.getElementById('newOrderBadge');

let filter = 'open';
let orders = [];
let menuIcons = {}; // id -> { image, emoji }
let knownIds = new Set();
let primed = false;
let soundArmed = true;
let lastOrdersFingerprint = '';
let audioCtx = null;
let chimeEl = null;

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function matchesFilter(order) {
  if (filter === 'all') return true;
  if (filter === 'open') return order.status !== 'done';
  return order.status === filter;
}

function newCount() {
  return orders.filter((o) => o.status === 'new').length;
}

function updateBadge() {
  if (!newOrderBadge) return;
  const n = newCount();
  if (n > 0) {
    newOrderBadge.hidden = false;
    newOrderBadge.textContent = n === 1 ? '1 new' : `${n} new`;
    document.title = `(${n}) Kitchen — Oct Cafe`;
  } else {
    newOrderBadge.hidden = true;
    document.title = 'Kitchen — Oct Cafe';
  }
}

function ensureChimeEl() {
  if (chimeEl) return chimeEl;
  chimeEl = new Audio('/icons/kitchen-chime.wav?v=party23');
  chimeEl.preload = 'auto';
  chimeEl.volume = 1;
  return chimeEl;
}

async function unlockAudio() {
  ensureChimeEl();
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch (_) { /* ignore */ }
  // Prime HTMLAudio inside the user gesture (critical on iOS/Safari)
  try {
    chimeEl.currentTime = 0;
    const p = chimeEl.play();
    if (p && p.then) {
      await p;
      chimeEl.pause();
      chimeEl.currentTime = 0;
    }
  } catch (_) { /* ignore */ }
}

function playOscillatorChime() {
  if (!audioCtx) return false;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const master = audioCtx.createGain();
    master.gain.value = 0.65;
    master.connect(audioCtx.destination);
    // Kitchen: low double-beep (new order)
    [[440, 0], [329.63, 0.16]].forEach(([freq, delay]) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(0.55, now + delay + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.22);
      o.connect(g);
      g.connect(master);
      o.start(now + delay);
      o.stop(now + delay + 0.28);
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function playChime() {
  // Kitchen chime is kitchen-page only — never fire from other routes
  if (!/kitchen/i.test(location.pathname || '')) return;
  if (!soundArmed) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
  } catch (_) { /* ignore */ }

  let heard = false;
  // Prefer HTMLAudio — more reliable on phones / silent-switch edge cases with WebAudio
  try {
    const el = ensureChimeEl();
    el.currentTime = 0;
    await el.play();
    heard = true;
  } catch (_) { /* fall through */ }

  if (!heard) {
    playOscillatorChime();
  } else {
    // Layer a soft oscillator on top for browsers that support both
    playOscillatorChime();
  }
}

function noteNewOrders() {
  if (!primed) {
    primed = true;
    knownIds = new Set(orders.map((o) => o.id));
    updateBadge();
    return;
  }
  const arrived = orders.filter((o) => !knownIds.has(o.id));
  knownIds = new Set(orders.map((o) => o.id));
  if (arrived.length) {
    playChime();
    requestAnimationFrame(() => {
      arrived.forEach((o) => {
        const el = root.querySelector(`[data-id="${CSS.escape(o.id)}"]`);
        if (el) {
          el.classList.add('order-card--flash');
          setTimeout(() => el.classList.remove('order-card--flash'), 2500);
        }
      });
    });
  }
  updateBadge();
}

function render() {
  const list = orders.filter(matchesFilter);
  if (list.length === 0) {
    root.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;">No orders here yet. Guests order from the menu 🍃</div>';
    updateBadge();
    return;
  }

  const frag = document.createDocumentFragment();
  for (const order of list) {
    const card = document.createElement('article');
    card.className = 'order-card';
    card.dataset.status = order.status;
    card.dataset.id = order.id;

    const top = document.createElement('div');
    top.className = 'order-card__top';
    const name = document.createElement('h2');
    name.className = 'order-card__name';
    name.textContent = order.guestName;
    const time = document.createElement('time');
    time.className = 'order-card__time';
    time.dateTime = order.createdAt;
    time.textContent = formatTime(order.createdAt);
    top.append(name, time);

    const items = document.createElement('ul');
    items.className = 'order-card__items';
    for (const it of order.items || []) {
      const li = document.createElement('li');
      li.className = 'order-card__item';
      const iconMeta = menuIcons[it.id] || {};
      const imgSrc = it.image || iconMeta.image;
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = '';
        img.className = 'order-card__item-img';
        li.appendChild(img);
      } else {
        const em = document.createElement('span');
        em.className = 'order-card__item-emoji';
        em.textContent = it.emoji || iconMeta.emoji || '•';
        li.appendChild(em);
      }
      const label = document.createElement('span');
      label.className = 'order-card__item-label';
      const milk = it.milk ? ` (${it.milk})` : '';
      label.textContent = `${it.name || it.id}${milk} × ${it.qty || 1}`;
      li.appendChild(label);
      items.appendChild(li);
    }

    const notes = document.createElement('p');
    notes.className = 'order-card__notes';
    if (order.notes) notes.textContent = order.notes;

    const actions = document.createElement('div');
    actions.className = 'status-actions';
    const curIdx = STATUSES.indexOf(order.status);
    const labels = { new: 'Received', making: 'Making', ready: 'Ready', done: 'Done' };
    for (let i = 0; i < STATUSES.length; i++) {
      const st = STATUSES[i];
      const btn = document.createElement('button');
      btn.type = 'button';
      let stateClass = 'is-upcoming';
      if (i < curIdx) stateClass = 'is-past';
      else if (i === curIdx) stateClass = 'is-active';
      btn.className = 'btn btn--status btn--status-' + st + ' ' + stateClass;
      btn.textContent = labels[st] || st;
      btn.setAttribute('aria-pressed', String(i === curIdx));
      btn.addEventListener('click', () => setStatus(order.id, st));
      actions.appendChild(btn);
    }

    card.append(top, items);
    if (order.notes) card.appendChild(notes);
    card.appendChild(actions);
    frag.appendChild(card);
  }
  root.replaceChildren(frag);
  updateBadge();
}

async function setStatus(id, status) {
  try {
    await fetch('/api/orders/' + encodeURIComponent(id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadOrders();
  } catch (_) { /* ignore */ }
}

async function loadMenuIcons() {
  try {
    const res = await fetch('/api/menu');
    if (!res.ok) return;
    const menu = await res.json();
    const map = {};
    const sections = menu.sections || menu.categories || [];
    sections.forEach((sec) => {
      (sec.items || []).forEach((it) => {
        if (it && it.id) map[it.id] = { image: it.image, emoji: it.emoji };
      });
    });
    // flat menu shape fallback
    if (Array.isArray(menu)) {
      menu.forEach((it) => {
        if (it && it.id) map[it.id] = { image: it.image, emoji: it.emoji };
      });
    }
    menuIcons = map;
  } catch (_) { /* ignore */ }
}


function ordersFingerprint(list) {
  return JSON.stringify(
    (list || []).map((o) => ({
      id: o.id,
      status: o.status,
      guestName: o.guestName,
      notes: o.notes || '',
      createdAt: o.createdAt,
      items: (o.items || []).map((it) => ({
        id: it.id,
        name: it.name,
        qty: it.qty,
        milk: it.milk || null,
        image: it.image || '',
      })),
    }))
  );
}

async function loadOrders() {
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Failed');
    const next = await res.json();
    const fp = ordersFingerprint(next);
    orders = next;
    if (fp !== lastOrdersFingerprint) {
      lastOrdersFingerprint = fp;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      render();
      window.scrollTo(0, scrollY);
    } else {
      updateBadge();
    }
    noteNewOrders();
  } catch {
    lastOrdersFingerprint = '';
    root.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1;">Can\'t reach the server.</div>';
  }
}

function setArmedUI(on) {
  soundArmed = on;
  try {
    sessionStorage.setItem('oct-cafe-sound', on ? '1' : '0');
  } catch (_) { /* ignore */ }
  if (!armSoundBtn) return;
  armSoundBtn.setAttribute('aria-pressed', String(on));
  armSoundBtn.textContent = on ? '🔔 Sound on' : '🔔 Sound off';
  armSoundBtn.title = on
    ? 'Order chime is on — tap to mute'
    : 'Tap once to enable the order chime (required by the browser)';
}

document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(b === btn));
    });
    render();
  });
});

if (clearDoneBtn) {
  clearDoneBtn.addEventListener('click', async () => {
    if (!confirm('Remove all “done” orders from the board?')) return;
    await fetch('/api/orders', { method: 'DELETE' });
    await loadOrders();
  });
}

if (armSoundBtn) {
  armSoundBtn.addEventListener('click', async () => {
    const next = !soundArmed;
    if (next) {
      await unlockAudio();
      setArmedUI(true);
      // Immediate test so you know speakers / silent switch are OK
      await playChime();
    } else {
      setArmedUI(false);
    }
  });
}

// Sound: default ON; honor explicit mute in sessionStorage
try {
  if (sessionStorage.getItem('oct-cafe-sound') === '0') {
    setArmedUI(false);
  } else {
    setArmedUI(true);
  }
} catch (_) {
  setArmedUI(true);
}

// Unlock audio on first user gesture (no surprise chime)
(function bindKitchenFirstGestureUnlock() {
  const once = () => {
    document.removeEventListener('pointerdown', once, true);
    document.removeEventListener('touchstart', once, true);
    document.removeEventListener('click', once, true);
    if (!soundArmed) return;
    unlockAudio();
  };
  document.addEventListener('pointerdown', once, true);
  document.addEventListener('touchstart', once, true);
  document.addEventListener('click', once, true);
})();


const soldOutRoot = document.getElementById('soldOutRoot');
let soldOutIds = new Set();
let menuForSoldOut = null;

function renderSoldOutPanel() {
  if (!soldOutRoot || !menuForSoldOut) return;
  const frag = document.createDocumentFragment();
  (menuForSoldOut.sections || []).forEach((sec) => {
    (sec.items || []).forEach((item) => {
      if (!item.id) return;
      const out = soldOutIds.has(String(item.id));
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sold-out-toggle' + (out ? ' is-sold-out' : '');
      btn.setAttribute('aria-pressed', String(out));
      btn.dataset.itemId = item.id;
      const icon = item.image
        ? `<img src="${item.image}" alt="" class="sold-out-toggle__img" />`
        : `<span class="sold-out-toggle__emoji">${item.emoji || '•'}</span>`;
      btn.innerHTML = `${icon}<span class="sold-out-toggle__name">${item.name}</span><span class="sold-out-toggle__state">${out ? 'Sold out' : 'Available'}</span>`;
      btn.addEventListener('click', () => toggleSoldOut(item.id, !out));
      frag.appendChild(btn);
    });
  });
  soldOutRoot.replaceChildren(frag);
  var metaEl = document.getElementById('soldOutSummaryMeta');
  if (metaEl) {
    var n = soldOutIds.size;
    metaEl.textContent = n === 0 ? 'all available · tap to manage' : (n === 1 ? '1 sold out · tap to manage' : n + ' sold out · tap to manage');
  }
}

async function toggleSoldOut(id, soldOut) {
  try {
    const res = await fetch('/api/sold-out', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, soldOut }),
    });
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    soldOutIds = new Set((data.ids || []).map(String));
    renderSoldOutPanel();
    try {
      new BroadcastChannel('oct-cafe-orders').postMessage({ type: 'menu-updated' });
    } catch (_) { /* ignore */ }
  } catch (_) {
    alert('Could not update sold-out — try again');
  }
}

async function loadSoldOutPanel() {
  try {
    const [menuRes, soldRes] = await Promise.all([
      fetch('/api/menu'),
      fetch('/api/sold-out'),
    ]);
    if (menuRes.ok) menuForSoldOut = await menuRes.json();
    if (soldRes.ok) {
      const data = await soldRes.json();
      soldOutIds = new Set((data.ids || []).map(String));
    }
    // Prefer soldOut flags from menu merge if present
    if (menuForSoldOut) {
      (menuForSoldOut.sections || []).forEach((sec) => {
        (sec.items || []).forEach((item) => {
          if (item.soldOut) soldOutIds.add(String(item.id));
        });
      });
    }
    renderSoldOutPanel();
  } catch (_) { /* ignore */ }
}


loadMenuIcons().then(loadOrders);
loadSoldOutPanel();

setInterval(loadOrders, 2500);

try {
  const bc = new BroadcastChannel('oct-cafe-orders');
  bc.onmessage = () => { if (/kitchen/i.test(location.pathname || '')) loadOrders(); };
} catch {
  /* ignore */
}
