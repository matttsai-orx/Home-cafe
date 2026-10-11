'use strict';

const urlEl = document.getElementById('qrUrl');
const img = document.getElementById('qrImage');
const errEl = document.getElementById('qrError');
const customInput = document.getElementById('customUrl');
const regenBtn = document.getElementById('regenQr');

function defaultUrl() {
  return new URL('/', window.location.origin).href;
}

function drawQr(text) {
  urlEl.textContent = text;
  customInput.value = text;
  errEl.hidden = true;
  errEl.textContent = '';
  const src = '/api/qr?data=' + encodeURIComponent(text) + '&t=' + Date.now();
  img.onload = () => {
    errEl.hidden = true;
  };
  img.onerror = () => {
    errEl.textContent = 'Could not generate QR. Restart the server after updating, then refresh.';
    errEl.hidden = false;
  };
  img.src = src;
}

regenBtn.addEventListener('click', () => {
  const v = (customInput.value || '').trim() || defaultUrl();
  drawQr(v);
});

drawQr(defaultUrl());
