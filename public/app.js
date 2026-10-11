'use strict';

// cart key = itemId + '::' + milk (or 'none')
const cart = new Map();

const els = {
  cafeName: document.getElementById('cafeName'),
  welcome: document.getElementById('welcome'),
  menuRoot: document.getElementById('menuRoot'),
  cartBar: document.getElementById('cartBar'),
  cartSummary: document.getElementById('cartSummary'),
  openCheckout: document.getElementById('openCheckout'),
  checkoutModal: document.getElementById('checkoutModal'),
  orderPreview: document.getElementById('orderPreview'),
  orderForm: document.getElementById('orderForm'),
  guestName: document.getElementById('guestName'),
  notes: document.getElementById('notes'),
  cancelCheckout: document.getElementById('cancelCheckout'),
  submitOrder: document.getElementById('submitOrder'),
  toast: document.getElementById('toast'),
  confirmModal: document.getElementById('confirmModal'),
  confirmTicket: document.getElementById('confirmTicket'),
  confirmThanks: document.getElementById('confirmThanks'),
  confirmList: document.getElementById('confirmList'),
  confirmClose: document.getElementById('confirmClose'),
  myOrderPanel: document.getElementById('myOrderPanel'),
  myOrderList: document.getElementById('myOrderList'),
  ticketLookupForm: document.getElementById('ticketLookupForm'),
  ticketLookupInput: document.getElementById('ticketLookupInput'),
  guestArmSound: document.getElementById('guestArmSound'),
  readyAlert: document.getElementById('readyAlert'),
  readyAlertTicket: document.getElementById('readyAlertTicket'),
  readyAlertGuest: document.getElementById('readyAlertGuest'),
  readyAlertOk: document.getElementById('readyAlertOk'),
};

let menuData = null;
/** selected milk per item id */
const milkChoice = {};

function cartKey(itemId, milk) {
  return itemId + '::' + (milk || 'none');
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(function () {
    els.toast.hidden = true;
  }, 3200);
}

function cartCount() {
  var n = 0;
  cart.forEach(function (entry) {
    n += entry.qty;
  });
  return n;
}

function updateCartBar() {
  var n = cartCount();
  if (n === 0) {
    els.cartBar.hidden = true;
    return;
  }
  els.cartBar.hidden = false;
  els.cartSummary.textContent = n === 1 ? '1 item' : n + ' items';
}

function currentMilk(item) {
  if (!item.milkOptions || !item.milkOptions.length) return null;
  return milkChoice[item.id] || item.milkOptions[0];
}

function qtyFor(item, milk) {
  var key = cartKey(item.id, milk || currentMilk(item));
  var entry = cart.get(key);
  return entry ? entry.qty : 0;
}

function setQty(item, qty, milk) {
  var m = milk || currentMilk(item) || null;
  var key = cartKey(item.id, m);
  qty = Math.max(0, Math.min(99, qty));
  if (qty === 0) cart.delete(key);
  else cart.set(key, { item: item, qty: qty, milk: m });

  var sel = m
    ? '[data-qty-for="' + CSS.escape(item.id) + '"][data-milk="' + CSS.escape(m) + '"]'
    : '[data-qty-for="' + CSS.escape(item.id) + '"]';
  var valEl = document.querySelector(sel);
  if (valEl) valEl.textContent = String(qty);
  updateCartBar();
}

function renderMenu(data) {
  var name = data.cafeName || data.cafeName || 'Oct Cafe';
  document.title = name;
  if (els.cafeName) els.cafeName.textContent = name;
  if (data.welcome && els.welcome) els.welcome.textContent = data.welcome;

  var frag = document.createDocumentFragment();
  (data.sections || []).forEach(function (section) {
    var sec = document.createElement('section');
    sec.className = 'section';
    sec.setAttribute('aria-labelledby', 'sec-' + section.id);

    var h2 = document.createElement('h2');
    h2.className = 'section__title';
    h2.id = 'sec-' + section.id;
    h2.textContent = section.title;
    sec.appendChild(h2);

    var list = document.createElement('div');
    list.className = 'menu-list';

    (section.items || []).forEach(function (item) {
      if (item.milkOptions && item.milkOptions.length && !milkChoice[item.id]) {
        milkChoice[item.id] = item.milkOptions[0];
      }

      var card = document.createElement('article');
      card.className = 'item-card' + (item.soldOut ? ' item-card--sold-out' : '');
      if (item.soldOut) card.setAttribute('aria-disabled', 'true');

      var emoji = document.createElement('div');
      emoji.className = 'item-card__emoji';
      emoji.setAttribute('aria-hidden', 'true');
      if (item.image) {
        var img = document.createElement('img');
        img.src = item.image;
        img.alt = '';
        img.className = 'item-card__icon';
        emoji.appendChild(img);
      } else {
        emoji.textContent = item.emoji || '🍽️';
      }

      var body = document.createElement('div');
      body.className = 'item-card__body';

      var nameEl = document.createElement('h3');
      nameEl.className = 'item-card__name';
      nameEl.textContent = item.name;
      if (item.soldOut) {
        var badge = document.createElement('span');
        badge.className = 'item-card__sold-badge';
        badge.textContent = 'Sold out';
        nameEl.appendChild(document.createTextNode(' '));
        nameEl.appendChild(badge);
      }

      var desc = document.createElement('p');
      desc.className = 'item-card__desc';
      desc.textContent = item.description || '';
      body.appendChild(nameEl);
      body.appendChild(desc);

      if (item.tags && item.tags.length) {
        var tags = document.createElement('div');
        tags.className = 'tags';
        item.tags.forEach(function (t) {
          var span = document.createElement('span');
          span.className = 'tag';
          span.textContent = t;
          tags.appendChild(span);
        });
        body.appendChild(tags);
      }

      var milk = currentMilk(item);

      if (item.milkOptions && item.milkOptions.length) {
        var milkRow = document.createElement('div');
        milkRow.className = 'milk-picker';
        milkRow.setAttribute('role', 'group');
        milkRow.setAttribute('aria-label', 'Milk for ' + item.name);

        item.milkOptions.forEach(function (opt) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'milk-picker__btn' + (opt === milk ? ' is-active' : '');
          btn.textContent = opt;
          btn.setAttribute('aria-pressed', opt === milk ? 'true' : 'false');
          btn.addEventListener('click', function () {
            milkChoice[item.id] = opt;
            renderMenu(menuData);
          });
          milkRow.appendChild(btn);
        });
        body.appendChild(milkRow);
      }

      var qtyWrap = document.createElement('div');
      qtyWrap.className = 'qty';

      var minus = document.createElement('button');
      minus.type = 'button';
      minus.className = 'qty__btn';
      minus.setAttribute('aria-label', 'Decrease ' + item.name);
      minus.textContent = '−';

      var val = document.createElement('span');
      val.className = 'qty__val';
      val.dataset.qtyFor = item.id;
      if (milk) val.dataset.milk = milk;
      val.textContent = String(qtyFor(item, milk));

      var plus = document.createElement('button');
      plus.type = 'button';
      plus.className = 'qty__btn';
      plus.setAttribute('aria-label', 'Increase ' + item.name);
      plus.textContent = '+';

      if (item.soldOut) {
        minus.disabled = true;
        plus.disabled = true;
        // Clear any leftover cart qty for sold-out items
        try {
          var mClear = currentMilk(item);
          if (qtyFor(item, mClear) > 0) setQty(item, 0, mClear);
        } catch (_) { /* ignore */ }
      } else {
        minus.addEventListener('click', function () {
          var m = currentMilk(item);
          setQty(item, qtyFor(item, m) - 1, m);
        });
        plus.addEventListener('click', function () {
          var m = currentMilk(item);
          setQty(item, qtyFor(item, m) + 1, m);
        });
      }

      qtyWrap.appendChild(plus);
      qtyWrap.appendChild(val);
      qtyWrap.appendChild(minus);
      card.appendChild(emoji);
      card.appendChild(body);
      card.appendChild(qtyWrap);
      list.appendChild(card);
    });

    sec.appendChild(list);
    frag.appendChild(sec);
  });

  els.menuRoot.replaceChildren(frag);
}

function lineLabel(entry) {
  var milkBit = entry.milk ? ' · ' + entry.milk + ' milk' : '';
  return (entry.item.emoji || '') + ' ' + entry.item.name + milkBit + ' × ' + entry.qty;
}


function ticketLabel(order) {
  if (!order || !order.id) return '#—';
  var raw = String(order.id).replace(/^ord(er)?_?/i, '');
  var short = raw.slice(-4).toUpperCase();
  return '#' + short;
}


/* ---- Guest order tracking (no login) ---- */
var MY_ORDERS_KEY = 'oct-cafe-my-orders';
var STATUS_FLOW = ['new', 'making', 'ready', 'done'];
var STATUS_MSG = {
  new: "We'll update this as we make it.",
  making: "We're making it now — hang tight!",
  ready: "Ready — we're bringing it over!",
  done: 'All done — enjoy! 🍁',
};
var ACTIVE_STATUSES = { new: 1, making: 1, ready: 1 };
var DONE_SOFT_MS = 5 * 60 * 1000;
var celebratedReady = {};
var lastKnownStatus = {};
var chimedReadyIds = {};
var readyAlertQueue = [];
var readyAlertShowingId = null;
var GUEST_SOUND_KEY = 'oct-cafe-guest-sound';
var guestSoundArmed = true;
var guestAudioCtx = null;
var guestChimeEl = null;
var guestAudioUnlocked = false;
var guestChimeBuffer = null;
var guestAudioKeepAlive = null;
function ensureGuestChimeEl() {
  if (guestChimeEl) return guestChimeEl;
  guestChimeEl = new Audio('/icons/ready-chime.wav?v=party23');
  guestChimeEl.preload = 'auto';
  guestChimeEl.volume = 1;
  guestChimeEl.setAttribute('playsinline', 'true');
  guestChimeEl.playsInline = true;
  return guestChimeEl;
}

function keepGuestAudioAlive() {
  if (!guestAudioCtx || guestAudioKeepAlive) return;
  try {
    var silent = guestAudioCtx.createGain();
    silent.gain.value = 0.00001;
    var osc = guestAudioCtx.createOscillator();
    osc.frequency.value = 440;
    osc.connect(silent);
    silent.connect(guestAudioCtx.destination);
    osc.start();
    guestAudioKeepAlive = { osc: osc, gain: silent };
  } catch (_) { /* ignore */ }
}

async function unlockGuestAudio() {
  ensureGuestChimeEl();
  try {
    if (!guestAudioCtx) guestAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (guestAudioCtx.state === 'suspended') await guestAudioCtx.resume();
    keepGuestAudioAlive();
  } catch (_) { /* ignore */ }

  // Decode wav into a buffer during the user gesture — plays reliably later
  if (guestAudioCtx && !guestChimeBuffer) {
    try {
      var res = await fetch('/icons/ready-chime.wav?v=party23');
      var arr = await res.arrayBuffer();
      guestChimeBuffer = await guestAudioCtx.decodeAudioData(arr.slice(0));
    } catch (_) { /* ignore */ }
  }

  // Prime HTMLAudio inside the gesture (iOS)
  try {
    guestChimeEl.muted = true;
    guestChimeEl.currentTime = 0;
    var p = guestChimeEl.play();
    if (p && p.then) await p;
    guestChimeEl.pause();
    guestChimeEl.currentTime = 0;
    guestChimeEl.muted = false;
  } catch (_) { /* ignore */ }

  guestAudioUnlocked = true;
}

function playGuestBufferChime() {
  if (!guestAudioCtx || !guestChimeBuffer) return false;
  try {
    if (guestAudioCtx.state === 'suspended') guestAudioCtx.resume();
    var src = guestAudioCtx.createBufferSource();
    var g = guestAudioCtx.createGain();
    g.gain.value = 1;
    src.buffer = guestChimeBuffer;
    src.connect(g);
    g.connect(guestAudioCtx.destination);
    src.start(0);
    return true;
  } catch (_) {
    return false;
  }
}

function playGuestOscillatorChime() {
  if (!guestAudioCtx) return false;
  try {
    if (guestAudioCtx.state === 'suspended') guestAudioCtx.resume();
    var now = guestAudioCtx.currentTime;
    var master = guestAudioCtx.createGain();
    master.gain.value = 0.6;
    master.connect(guestAudioCtx.destination);
    // Guest Ready: bright rising sparkle
    [[523.25, 0], [659.25, 0.11], [783.99, 0.22], [1046.5, 0.34]].forEach(function (pair) {
      var freq = pair[0];
      var delay = pair[1];
      var o = guestAudioCtx.createOscillator();
      var g = guestAudioCtx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(0.75, now + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.32);
      o.connect(g);
      g.connect(master);
      o.start(now + delay);
      o.stop(now + delay + 0.38);
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function playGuestChime() {
  if (!guestSoundArmed) return false;
  try {
    if (!guestAudioCtx) guestAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (guestAudioCtx.state === 'suspended') await guestAudioCtx.resume();
    keepGuestAudioAlive();
  } catch (_) { /* ignore */ }

  // 1) Decoded buffer (best after unlock)
  if (playGuestBufferChime()) return true;

  // 2) Fresh Audio element each time (avoids stale element state)
  try {
    var el = new Audio('/icons/ready-chime.wav?v=party23');
    el.volume = 1;
    el.playsInline = true;
    await el.play();
    return true;
  } catch (_) { /* fall through */ }

  // 3) Shared element
  try {
    var shared = ensureGuestChimeEl();
    shared.muted = false;
    shared.currentTime = 0;
    await shared.play();
    return true;
  } catch (_) { /* fall through */ }

  // 4) Oscillator fallback
  return playGuestOscillatorChime();
}

function setGuestSoundArmed(on) {
  guestSoundArmed = !!on;
  try {
    sessionStorage.setItem(GUEST_SOUND_KEY, guestSoundArmed ? '1' : '0');
  } catch (_) { /* ignore */ }
  if (!els.guestArmSound) return;
  els.guestArmSound.setAttribute('aria-pressed', String(guestSoundArmed));
  els.guestArmSound.textContent = guestSoundArmed ? '🔔 Sound on' : '🔔 Sound for Ready';
  els.guestArmSound.title = guestSoundArmed
    ? 'Ready chime is on — tap to mute'
    : 'Tap to enable a chime when your order is ready';
}

async function armGuestSound(playTest) {
  await unlockGuestAudio();
  setGuestSoundArmed(true);
  try { await requestReadyNotifyPermission(); } catch (_) { /* ignore */ }
  if (playTest) await playGuestChime();
}


function pageIsVisible() {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

function requestReadyNotifyPermission() {
  try {
    if (typeof Notification === 'undefined') return Promise.resolve('denied');
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return Promise.resolve(Notification.permission);
    }
    return Notification.requestPermission();
  } catch (_) {
    return Promise.resolve('denied');
  }
}

var readyTitleBase = '';
var readyTitleBlinkTimer = null;

function stopReadyTitleBlink() {
  if (readyTitleBlinkTimer) {
    clearInterval(readyTitleBlinkTimer);
    readyTitleBlinkTimer = null;
  }
  try {
    if (readyTitleBase) document.title = readyTitleBase;
  } catch (_) { /* ignore */ }
}

function startReadyTitleBlink(ticket) {
  try {
    if (!readyTitleBase) readyTitleBase = document.title || 'Oct Cafe';
  } catch (_) {
    readyTitleBase = 'Oct Cafe';
  }
  var label = ticket ? ('Ready ' + ticket + '!') : 'Order ready!';
  if (readyTitleBlinkTimer) return;
  var flip = false;
  readyTitleBlinkTimer = setInterval(function () {
    flip = !flip;
    try {
      document.title = flip ? ('🍃 ' + label) : readyTitleBase;
    } catch (_) { /* ignore */ }
  }, 1200);
}

/** System notification when guest is on another tab — NOT the kitchen chime. */
function showReadySystemNotification(meta) {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (pageIsVisible()) return;
    var ticket = (meta && (meta.ticket || ticketLabel({ id: meta.id }))) || '#—';
    var who = (meta && (meta.guestName || meta.name)) || '';
    var body = who
      ? (who + ' — ' + ticket + ' is ready!')
      : (ticket + ' is ready — we\'re bringing it over!');
    var n = new Notification('Oct Cafe — Ready! 🍃', {
      body: body,
      tag: 'oct-cafe-ready-' + ((meta && meta.id) || String(Date.now())),
      icon: '/icons/oct-cafe-logo.png',
      renotify: true,
      requireInteraction: true,
    });
    n.onclick = function () {
      try { window.focus(); } catch (_) { /* ignore */ }
      try { n.close(); } catch (_) { /* ignore */ }
      try { drainReadyAlertQueue(); } catch (_) { /* ignore */ }
    };
  } catch (_) { /* ignore */ }
}

// Honest note: web pages cannot bypass the iPhone silent switch.
// Wav + oscillator are best-effort when the phone is not silent;
// vibrate + Ready modal are the cues that still work when muted.
function vibrateReady() {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch (_) { /* ignore */ }
}


async function markOrderDone(orderId) {
  if (!orderId) return null;
  var res = await fetch('/api/orders/' + encodeURIComponent(orderId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  });
  if (!res.ok) {
    var err = await res.json().catch(function () { return {}; });
    throw new Error(err.error || 'Could not update order');
  }
  var updated = await res.json();
  var list = readMyOrders();
  list.forEach(function (o) {
    if (o.id === orderId) {
      o.status = 'done';
      o.doneAt = new Date().toISOString();
    }
  });
  writeMyOrders(list);
  try {
    new BroadcastChannel('oct-cafe-orders').postMessage({
      type: 'order-updated',
      id: orderId,
      status: 'done',
    });
  } catch (_) { /* ignore */ }
  // Drop from ready queue / modal if showing this ticket
  readyAlertQueue = readyAlertQueue.filter(function (m) { return m && m.id !== orderId; });
  if (readyAlertShowingId === orderId) {
    readyAlertShowingId = null;
    if (els.readyAlert) els.readyAlert.hidden = true;
    setTimeout(drainReadyAlertQueue, 80);
  }
  return updated;
}

function hideReadyAlert() {
  if (!els.readyAlert) return;
  els.readyAlert.hidden = true;
  readyAlertShowingId = null;
  // Show next queued Ready prompt, if any
  setTimeout(drainReadyAlertQueue, 80);
}

function showReadyAlert(meta) {
  if (!els.readyAlert || !meta) return;
  var ticket = (meta.ticket || ticketLabel({ id: meta.id })) || '#—';
  if (els.readyAlertTicket) els.readyAlertTicket.textContent = ticket;
  if (els.readyAlertGuest) {
    var who = meta.guestName || meta.name || '';
    els.readyAlertGuest.textContent = who ? ('for ' + who) : '';
  }
  // Queue depth hint when more are waiting
  var more = readyAlertQueue.length;
  var msgEl = els.readyAlert.querySelector('.ready-alert__msg');
  if (msgEl) {
    msgEl.textContent = more
      ? ("We're bringing it over! (" + more + " more ready)")
      : "We're bringing it over!";
  }
  els.readyAlert.hidden = false;
  els.readyAlert.dataset.orderId = meta.id || '';
  readyAlertShowingId = meta.id || null;
}

function pulseReadyCard(orderId) {
  if (!els.myOrderList || !orderId) return;
  var card = els.myOrderList.querySelector('.my-order__card[data-id="' + CSS.escape(orderId) + '"]');
  if (!card) return;
  card.classList.remove('my-order__card--ready-pulse');
  void card.offsetWidth;
  card.classList.add('my-order__card--ready-pulse');
  clearTimeout(pulseReadyCard._t);
  pulseReadyCard._t = setTimeout(function () {
    card.classList.remove('my-order__card--ready-pulse');
  }, 2800);
}

function enqueueReadyAlert(meta) {
  if (!meta || !meta.id) return;
  // Already on screen
  if (readyAlertShowingId === meta.id) return;
  // Already queued
  if (readyAlertQueue.some(function (m) { return m && m.id === meta.id; })) return;
  readyAlertQueue.push({
    id: meta.id,
    ticket: meta.ticket || ticketLabel({ id: meta.id }),
    guestName: meta.guestName || meta.name || '',
  });
  drainReadyAlertQueue();
}

function drainReadyAlertQueue() {
  if (!els.readyAlert) return;
  // Wait until current modal is dismissed
  if (!els.readyAlert.hidden && readyAlertShowingId) return;
  if (!readyAlertQueue.length) return;
  var next = readyAlertQueue.shift();
  showReadyAlert(next);
}

function fireReadyAlerts(meta) {
  if (!meta || !meta.id) return;
  var id = meta.id;
  if (chimedReadyIds[id]) return;
  chimedReadyIds[id] = true;
  // Chime + vibrate immediately even if another Ready prompt is on screen
  try {
    var chimePromise = playGuestChime();
    if (chimePromise && typeof chimePromise.catch === 'function') {
      chimePromise.catch(function () { /* ignore */ });
    }
  } catch (_) { /* ignore */ }
  vibrateReady();
  pulseReadyCard(id);
  enqueueReadyAlert(meta);
  // Guest-only: ping OS notification if they left this tab
  showReadySystemNotification(meta);
  if (!pageIsVisible()) {
    startReadyTitleBlink(meta.ticket || ticketLabel({ id: meta.id }));
  }
}

function maybeNotifyReady(meta, status) {
  if (!meta || !meta.id) return;
  var id = meta.id;
  var prev = lastKnownStatus[id];
  lastKnownStatus[id] = status;

  // If kitchen moves a ticket OUT of ready (e.g. ready → new/making),
  // clear alert flags so ready → … → ready can chime + prompt again.
  if (prev === 'ready' && status !== 'ready') {
    delete chimedReadyIds[id];
    delete celebratedReady[id];
    readyAlertQueue = readyAlertQueue.filter(function (m) { return m && m.id !== id; });
    if (readyAlertShowingId === id) {
      readyAlertShowingId = null;
      if (els.readyAlert) els.readyAlert.hidden = true;
      setTimeout(drainReadyAlertQueue, 80);
    }
  }

  if (status === 'ready' && !celebratedReady[id]) {
    celebratedReady[id] = true;
    showToast("Ready — we're bringing it over! 🍃");
  }

  if (status === 'ready') {
    // Alert on every transition into ready (including ready→new→ready).
    if ((prev && prev !== 'ready') || (!prev && !chimedReadyIds[id])) {
      fireReadyAlerts(meta);
    }
  }
}



function readMyOrders() {
  try {
    var raw = localStorage.getItem(MY_ORDERS_KEY);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function pruneMyOrders(list) {
  var active = [];
  var inactive = [];
  (list || []).forEach(function (o) {
    if (!o || !o.id) return;
    if (ACTIVE_STATUSES[o.status]) active.push(o);
    else inactive.push(o);
  });
  // Cap: never drop open tickets; trim oldest inactive beyond remaining slots
  if (active.length >= 8) return active;
  var room = 8 - active.length;
  return active.concat(inactive.slice(0, room));
}

function writeMyOrders(list) {
  try {
    localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(pruneMyOrders(list)));
  } catch (_) { /* ignore */ }
}

function itemsLines(items) {
  return (items || []).map(function (it) {
    return (it.name || it.id || '?') + ' × ' + (it.qty || 1);
  });
}

/** Normalize stored items (array of lines, or legacy comma string) into string[]. */
function normalizeItemLines(items) {
  if (Array.isArray(items)) {
    return items.map(function (x) { return String(x); }).filter(Boolean);
  }
  if (typeof items === 'string' && items.trim()) {
    return items.split(/,\s*/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  return [];
}

function saveTrackedOrder(order, items) {
  if (!order || !order.id) return;
  var status = order.status || 'new';
  var list = readMyOrders().filter(function (o) { return o.id !== order.id; });
  list.unshift({
    id: order.id,
    guestName: order.guestName || '',
    ticket: ticketLabel(order),
    items: itemsLines(items || order.items),
    createdAt: order.createdAt || new Date().toISOString(),
    status: status,
  });
  writeMyOrders(list);
  // Prime so a later jump to ready counts as a real transition
  if (!lastKnownStatus[order.id]) lastKnownStatus[order.id] = status;
}

function removeTracked(id) {
  writeMyOrders(readMyOrders().filter(function (o) { return o.id !== id; }));
  delete celebratedReady[id];
  delete lastKnownStatus[id];
  delete chimedReadyIds[id];
  readyAlertQueue = readyAlertQueue.filter(function (m) { return m && m.id !== id; });
  if (readyAlertShowingId === id) {
    readyAlertShowingId = null;
    if (els.readyAlert) els.readyAlert.hidden = true;
    setTimeout(drainReadyAlertQueue, 80);
  }
}

function isVisibleTracked(meta) {
  if (!meta) return false;
  var status = meta.status || 'new';
  if (ACTIVE_STATUSES[status]) return true;
  if (status !== 'done') return true;
  // Soft-complete: keep done cards briefly so guest can dismiss
  var doneAt = meta.doneAt ? Date.parse(meta.doneAt) : NaN;
  if (!isNaN(doneAt) && Date.now() - doneAt < DONE_SOFT_MS) return true;
  // No doneAt yet (just flipped) — still show until prune/dismiss
  if (!meta.doneAt) return true;
  return false;
}

function visibleTrackedOrders() {
  return readMyOrders().filter(isVisibleTracked);
}

function buildStepsOl(status) {
  var idx = STATUS_FLOW.indexOf(status);
  if (idx < 0) idx = 0;
  var ol = document.createElement('ol');
  ol.className = 'my-order__steps';
  ol.setAttribute('aria-label', 'Order status');
  ['Received', 'Making', 'Ready', 'Done'].forEach(function (label, i) {
    var li = document.createElement('li');
    li.setAttribute('data-step', STATUS_FLOW[i]);
    li.textContent = label;
    if (i === idx) li.classList.add('is-current');
    if (i < idx) li.classList.add('is-done');
    // When ready, Done is a tap target to mark received
    if (status === 'ready' && STATUS_FLOW[i] === 'done') {
      li.classList.add('is-action');
      li.setAttribute('role', 'button');
      li.tabIndex = 0;
      li.title = 'Tap when you have received this order';
      li.setAttribute('data-mark-received', ''); // filled by card id via delegation
    }
    ol.appendChild(li);
  });
  if (status === 'ready') {
    ol.querySelectorAll('[data-step="done"]').forEach(function (li) {
      // id set on card; handler reads closest card
      li.setAttribute('data-mark-received-step', '1');
    });
  }
  return ol;
}

function buildOrderCard(meta, status) {
  var card = document.createElement('article');
  card.className = 'my-order__card';
  card.dataset.id = meta.id;
  card.dataset.status = status;

  var head = document.createElement('div');
  head.className = 'my-order__head';

  var left = document.createElement('div');
  var ticket = document.createElement('p');
  ticket.className = 'my-order__ticket';
  ticket.textContent = meta.ticket || ticketLabel({ id: meta.id });
  left.appendChild(ticket);
  if (meta.guestName) {
    var guest = document.createElement('p');
    guest.className = 'my-order__guest';
    guest.textContent = 'for ' + meta.guestName;
    left.appendChild(guest);
  }
  head.appendChild(left);

  var dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'my-order__dismiss';
  dismiss.title = 'Dismiss';
  dismiss.setAttribute('data-dismiss-order', meta.id);
  dismiss.textContent = '✕';
  dismiss.hidden = status !== 'done';
  head.appendChild(dismiss);
  card.appendChild(head);

  card.appendChild(buildStepsOl(status));

  var msg = document.createElement('p');
  msg.className = 'my-order__msg';
  msg.textContent = STATUS_MSG[status] || STATUS_MSG.new;
  card.appendChild(msg);

  var lines = normalizeItemLines(meta.items);
  if (lines.length) {
    var ul = document.createElement('ul');
    ul.className = 'my-order__items';
    lines.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    });
    card.appendChild(ul);
  }

  // Guest can mark received once kitchen has it ready
  if (status === 'ready') {
    var gotIt = document.createElement('button');
    gotIt.type = 'button';
    gotIt.className = 'btn btn--primary my-order__got-it';
    gotIt.setAttribute('data-mark-received', meta.id);
    gotIt.textContent = 'Got it — received 🍃';
    card.appendChild(gotIt);
  }

  return card;
}

function renderTrackers(metas) {
  if (!els.myOrderPanel || !els.myOrderList) return;
  var list = metas || [];
  if (!list.length) {
    els.myOrderPanel.hidden = true;
    els.myOrderList.replaceChildren();
    els.myOrderPanel.classList.remove('my-order--multi');
    return;
  }
  els.myOrderPanel.hidden = false;
  els.myOrderPanel.classList.toggle('my-order--multi', list.length >= 2);
  // Panel-level status = primary (newest / first) for any leftover CSS hooks
  els.myOrderPanel.dataset.status = list[0].status || 'new';

  var frag = document.createDocumentFragment();
  list.forEach(function (meta) {
    var status = meta.status || 'new';
    if (STATUS_FLOW.indexOf(status) === -1) status = 'new';
    frag.appendChild(buildOrderCard(meta, status));
  });
  els.myOrderList.replaceChildren(frag);
  // Notify after DOM update so card pulse can target the live card
  list.forEach(function (meta) {
    var status = meta.status || 'new';
    if (STATUS_FLOW.indexOf(status) === -1) status = 'new';
    maybeNotifyReady(meta, status);
  });
}

async function fetchAllOrders() {
  try {
    var listRes = await fetch('/api/orders');
    if (!listRes.ok) return null;
    return await listRes.json();
  } catch (_) {
    return null;
  }
}

async function refreshTracker() {
  var tracked = readMyOrders();
  if (!tracked.length) {
    renderTrackers([]);
    return;
  }

  var all = await fetchAllOrders();
  // null = network/API failure — keep local tickets (don't wipe on blip)
  if (all == null) {
    renderTrackers(visibleTrackedOrders());
    return;
  }

  var byId = {};
  (all || []).forEach(function (o) {
    if (o && o.id) byId[o.id] = o;
  });

  var next = [];
  var removed = [];
  tracked.forEach(function (meta) {
    var live = byId[meta.id];
    if (!live) {
      // Kitchen deleted / cleared this order — drop stuck tracker card
      removed.push(meta.id);
      return;
    }
    meta.status = live.status || meta.status;
    if (live.guestName) meta.guestName = live.guestName;
    if (live.status === 'done' && !meta.doneAt) {
      meta.doneAt = new Date().toISOString();
    }
    if (live.status !== 'done') delete meta.doneAt;
    next.push(meta);
  });

  if (removed.length) {
    removed.forEach(function (id) {
      delete celebratedReady[id];
      delete lastKnownStatus[id];
      delete chimedReadyIds[id];
      readyAlertQueue = readyAlertQueue.filter(function (m) { return m && m.id !== id; });
      if (readyAlertShowingId === id) {
        readyAlertShowingId = null;
        if (els.readyAlert) els.readyAlert.hidden = true;
      }
    });
    setTimeout(drainReadyAlertQueue, 80);
  }

  writeMyOrders(next);
  renderTrackers(visibleTrackedOrders());
}

function startOrderTracking(order, items) {
  saveTrackedOrder(order, items);
  refreshTracker();
}

function matchTicketCode(code, orderId) {
  var needle = String(code || '').replace(/^#/, '').trim().toUpperCase();
  if (!needle) return false;
  var raw = String(orderId).replace(/^ord(er)?_?/i, '');
  var short = raw.slice(-4).toUpperCase();
  return short === needle || raw.toUpperCase().endsWith(needle);
}

async function lookupTicket(code) {
  var needle = String(code || '').replace(/^#/, '').trim();
  if (!needle) {
    showToast('Enter a ticket like #A1B2');
    return;
  }
  try {
    var res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Could not look up');
    var all = await res.json();
    var found = (all || []).find(function (o) { return matchTicketCode(needle, o.id); });
    if (!found) {
      showToast('No open order for that ticket');
      return;
    }
    startOrderTracking(found, found.items);
    showToast('Found ' + ticketLabel(found) + ' — tracking');
  } catch (err) {
    showToast(err.message || 'Lookup failed');
  }
}

if (els.myOrderList) {
    els.myOrderList.addEventListener('click', async function (e) {
    var dismiss = e.target.closest('[data-dismiss-order]');
    if (dismiss) {
      var did = dismiss.getAttribute('data-dismiss-order');
      if (did) {
        removeTracked(did);
        renderTrackers(visibleTrackedOrders());
      }
      return;
    }
    var recv = e.target.closest('[data-mark-received], [data-mark-received-step]');
    if (!recv) return;
    var card = recv.closest('.my-order__card');
    var id = recv.getAttribute('data-mark-received') || (card && card.dataset.id);
    if (!id) return;
    recv.disabled = true;
    try {
      await markOrderDone(id);
      showToast('Thanks! Marked as received 🍃');
      await refreshTracker();
    } catch (err) {
      showToast(err.message || 'Could not mark received');
      recv.disabled = false;
    }
  });
}

if (els.ticketLookupForm) {
  els.ticketLookupForm.addEventListener('submit', function (e) {
    e.preventDefault();
    lookupTicket(els.ticketLookupInput ? els.ticketLookupInput.value : '');
    if (els.ticketLookupInput) els.ticketLookupInput.value = '';
  });
}

// Sound: default ON; honor explicit mute in sessionStorage
try {
  if (sessionStorage.getItem(GUEST_SOUND_KEY) === '0') {
    setGuestSoundArmed(false);
  } else {
    setGuestSoundArmed(true);
  }
} catch (_) {
  setGuestSoundArmed(true);
}

// Unlock audio on first user gesture (no surprise chime)
(function bindGuestFirstGestureUnlock() {
  var once = function () {
    document.removeEventListener('pointerdown', once, true);
    document.removeEventListener('touchstart', once, true);
    document.removeEventListener('click', once, true);
    if (!guestSoundArmed) return;
    unlockGuestAudio();
  };
  document.addEventListener('pointerdown', once, true);
  document.addEventListener('touchstart', once, true);
  document.addEventListener('click', once, true);
})();

if (els.guestArmSound) {
  var muteTimer = null;
  els.guestArmSound.addEventListener('pointerdown', function () {
    muteTimer = setTimeout(async function () {
      muteTimer = null;
      setGuestSoundArmed(false);
      showToast('Ready chime muted');
    }, 650);
  });
  els.guestArmSound.addEventListener('pointerup', function () {
    if (muteTimer) {
      clearTimeout(muteTimer);
      muteTimer = null;
    }
  });
  els.guestArmSound.addEventListener('pointerleave', function () {
    if (muteTimer) {
      clearTimeout(muteTimer);
      muteTimer = null;
    }
  });
  els.guestArmSound.addEventListener('click', async function () {
    // Tap = ensure ON + test ding (default is on; don't mute on first tap)
    await armGuestSound(true);
  });
}

try {
  var trackBc = new BroadcastChannel('oct-cafe-orders');
  trackBc.onmessage = function (ev) {
    refreshTracker();
    if (ev && ev.data && ev.data.type === 'menu-updated') reloadMenu();
  };
} catch (_) { /* ignore */ }

setInterval(refreshTracker, 2500);
setInterval(function () { reloadMenu(); }, 8000);


function showOrderConfirm(order, items) {
  if (!els.confirmModal) {
    showToast('Order sent! Thanks — hang tight, we\'re on it.');
    return;
  }
  els.confirmTicket.textContent = ticketLabel(order);
  var who = (order && order.guestName) || 'friend';
  els.confirmThanks.textContent = 'Thanks, ' + who + "! The kitchen got it — we'll bring it over soon.";
  els.confirmList.replaceChildren();
  (items || []).forEach(function (it) {
    var li = document.createElement('li');
    if (it.image) {
      var img = document.createElement('img');
      img.src = it.image;
      img.alt = '';
      li.appendChild(img);
    }
    var span = document.createElement('span');
    span.textContent = (it.name || '') + ' × ' + (it.qty || 1);
    li.appendChild(span);
    els.confirmList.appendChild(li);
  });
  els.confirmModal.hidden = false;
}

function closeOrderConfirm() {
  if (els.confirmModal) els.confirmModal.hidden = true;
}

function openCheckout() {
  if (cartCount() === 0) return;
  els.orderPreview.replaceChildren();
  cart.forEach(function (entry) {
    var li = document.createElement('li');
    li.textContent = lineLabel(entry);
    els.orderPreview.appendChild(li);
  });
  els.checkoutModal.hidden = false;
  els.guestName.focus();
}

function closeCheckout() {
  els.checkoutModal.hidden = true;
}

if (els.confirmClose) els.confirmClose.addEventListener('click', closeOrderConfirm);
if (els.confirmModal) els.confirmModal.addEventListener('click', function (e) {
  if (e.target === els.confirmModal) closeOrderConfirm();
});
if (els.readyAlertOk) els.readyAlertOk.addEventListener('click', async function () {
  var orderId = els.readyAlert && els.readyAlert.dataset.orderId;
  try {
    await unlockGuestAudio();
    if (guestSoundArmed) await playGuestChime();
  } catch (_) { /* ignore */ }
  try {
    if (orderId) await markOrderDone(orderId);
    showToast('Thanks! Marked as received 🍃');
  } catch (err) {
    showToast(err.message || 'Could not mark received');
  }
  hideReadyAlert();
  refreshTracker();
});
if (els.readyAlert) els.readyAlert.addEventListener('click', async function (e) {
  if (e.target !== els.readyAlert) return;
  try {
    await unlockGuestAudio();
    if (guestSoundArmed) await playGuestChime();
  } catch (_) { /* ignore */ }
  hideReadyAlert();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && els.readyAlert && !els.readyAlert.hidden) hideReadyAlert();
});
els.openCheckout.addEventListener('click', openCheckout);
els.cancelCheckout.addEventListener('click', closeCheckout);
els.checkoutModal.addEventListener('click', function (e) {
  if (e.target === els.checkoutModal) closeCheckout();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !els.checkoutModal.hidden) closeCheckout();
});

els.orderForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  var guestName = els.guestName.value.trim();
  if (!guestName || cartCount() === 0) return;

  var items = [];
  cart.forEach(function (entry) {
    items.push({
      id: entry.item.id,
      name: entry.milk ? entry.item.name + ' (' + entry.milk + ' milk)' : entry.item.name,
      emoji: entry.item.emoji || '',
      image: entry.item.image || '',
      qty: entry.qty,
      milk: entry.milk || null,
    });
  });

  els.submitOrder.disabled = true;
  try {
    var res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: guestName,
        notes: els.notes.value.trim(),
        items: items,
      }),
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || 'Order failed');

    cart.clear();
    updateCartBar();
    if (menuData) renderMenu(menuData);
    els.orderForm.reset();
    closeCheckout();
    var placed = Object.assign({ guestName: guestName }, data);
    // Unlock + arm ready alerts in this user-gesture path (autoplay policy)
    try {
      await armGuestSound(false);
    } catch (_) { /* ignore */ }
    showOrderConfirm(placed, items);
    startOrderTracking(placed, items);
    try {
      new BroadcastChannel('oct-cafe-orders').postMessage({ type: 'order-created' });
    } catch (_) { /* ignore */ }
  } catch (err) {
    showToast(err.message || 'Could not send order');
  } finally {
    els.submitOrder.disabled = false;
  }
});

async function reloadMenu() {
  try {
    var res = await fetch('/api/menu');
    if (!res.ok) return;
    menuData = await res.json();
    renderMenu(menuData);
    updateCartBar();
  } catch (_) { /* ignore */ }
}

async function init() {
  try {
    var res = await fetch('/api/menu');
    if (!res.ok) throw new Error('Menu unavailable');
    menuData = await res.json();
    renderMenu(menuData);
  } catch (err) {
    els.menuRoot.innerHTML = '<p class="empty-state">Could not load menu. Is the server running?</p>';
  }
  if (visibleTrackedOrders().length) {
    refreshTracker();
  }
}

init();


// Guest returns from another tab — restore title + show Ready popup (not kitchen chime)
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState !== 'visible') return;
  stopReadyTitleBlink();
  try { drainReadyAlertQueue(); } catch (_) { /* ignore */ }
  try { refreshTracker(); } catch (_) { /* ignore */ }
});
window.addEventListener('focus', function () {
  stopReadyTitleBlink();
  try { drainReadyAlertQueue(); } catch (_) { /* ignore */ }
});
