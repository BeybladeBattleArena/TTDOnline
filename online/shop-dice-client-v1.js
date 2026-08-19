import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const REGION = 'us-central1';
const HGA1_CODE_RE = /^TTD-HGA1-C[1-7]$/;
const frame = document.getElementById('gameFrame');
const giftInput = document.getElementById('onlineGiftCode');
const giftStatus = document.getElementById('onlineGiftStatus');
const rewardNotice = document.getElementById('rewardNotice');
const rewardNoticeText = document.getElementById('rewardNoticeText');

let auth = null;
let functions = null;
let currentUser = null;
let catalog = null;
let purchaseBusy = false;
let redeemBusy = false;
let lastShopDoc = null;

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function friendlyError(err) {
  const code = String(err?.code || '');
  if (code.includes('unauthenticated')) return 'Sign in again and retry.';
  if (code.includes('already-exists')) return err?.message?.replace(/^FirebaseError:\s*/i, '') || 'That code was already redeemed.';
  if (code.includes('not-found') || code.includes('failed-precondition') || code.includes('invalid-argument')) {
    return err?.message?.replace(/^FirebaseError:\s*/i, '') || 'The server rejected that request.';
  }
  return err?.message?.replace(/^FirebaseError:\s*/i, '') || 'The online shop could not complete that request.';
}

async function waitForFirebaseApp() {
  for (let i = 0; i < 500; i++) {
    if (getApps().length) return getApp();
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Firebase did not initialize for the online dice shop.');
}

async function loadCatalog() {
  const response = await fetch(`/dicefile.json?shop=${Date.now().toString(36)}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`dicefile.json returned HTTP ${response.status}.`);
  const data = await response.json();
  if (!data || data.schemaVersion !== 1 || !data.dice) throw new Error('The online dice catalog is invalid.');
  catalog = data;
}

function activeDiceShop(doc) {
  const main = doc.querySelector('#shopMainTabs .deckTab.active');
  const sub = doc.querySelector('.shopSubRow .shopSubBtn.active');
  return main?.dataset?.shoptab === 'items' && sub?.textContent?.trim() === 'Dice';
}

function assetUrl(win, key) {
  if (key === 'hga1') {
    const path = '/assets/hga1-topdown.svg';
    return typeof win?.__TTD_ASSET_URL === 'function' ? win.__TTD_ASSET_URL(path) : path;
  }
  return '';
}

function iconMarkup(doc, key, die, size = 40) {
  const url = assetUrl(doc.defaultView, key);
  if (url) {
    return `<img src="${esc(url)}" alt="" style="display:block;width:${size}px;height:${size}px;object-fit:contain;filter:drop-shadow(0 0 5px ${esc(die.glow || '#ffd85c')});">`;
  }
  return `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;border-radius:50%;border:2px solid ${esc(die.color || '#777')};color:${esc(die.glow || '#fff')};font:700 ${Math.max(12, Math.floor(size * .35))}px Cinzel,serif;">${esc(String(die.name || key).slice(0, 2).toUpperCase())}</div>`;
}

function setCurrencyUi(gameState) {
  const pips = Number(gameState?.economy?.pips);
  const astras = Number(gameState?.economy?.astras);
  if (!Number.isSafeInteger(pips) || !Number.isSafeInteger(astras)) return;
  const pipsEl = document.getElementById('cloudPips');
  const astrasEl = document.getElementById('cloudAstras');
  const raw = document.getElementById('cloudEconomy');
  if (pipsEl) pipsEl.textContent = pips.toLocaleString();
  if (astrasEl) astrasEl.textContent = astras.toLocaleString();
  if (raw) raw.textContent = `${pips.toLocaleString()} Pips • ${astras.toLocaleString()} Astras`;

  const doc = frame?.contentDocument;
  if (doc) {
    for (const id of ['shopGold', 'homeGold']) {
      const el = doc.getElementById(id);
      if (el) el.textContent = String(pips);
    }
    for (const id of ['shopAstras', 'homeAstras']) {
      const el = doc.getElementById(id);
      if (el) el.textContent = String(astras);
    }
  }
}

function showReward(text) {
  if (rewardNoticeText) rewardNoticeText.textContent = text;
  if (rewardNotice) rewardNotice.hidden = false;
}

function hideInnerDetail(doc) {
  doc.getElementById('itemDetailOverlay')?.classList.remove('show');
}

async function refreshCanonicalGame() {
  if (!functions || !currentUser) return null;
  const result = await httpsCallable(functions, 'getInventoryState')({});
  const snapshot = result.data;
  if (!snapshot?.gameState || !Array.isArray(snapshot.dice) || !Array.isArray(snapshot.decks)) {
    throw new Error('The server returned an incomplete inventory snapshot.');
  }
  setCurrencyUi(snapshot.gameState);
  if (frame?.contentWindow) {
    frame.contentWindow.postMessage({
      type: 'ttd:cloud-sync',
      gameState: snapshot.gameState,
      dice: snapshot.dice,
      decks: snapshot.decks,
    }, location.origin);
  }
  return snapshot;
}

function confirmationMarkup(doc, key, die) {
  const cost = Number(die.shopCostPips);
  return `
    <button class="xCloseBtn" id="ttdShopDetailX">&times;</button>
    <div class="glyphBig" style="background:linear-gradient(155deg,${esc(die.glow || '#ffd85c')},${esc(die.color || '#404449')});margin:0 auto 10px;display:grid;place-items:center;">${iconMarkup(doc, key, die, 58)}</div>
    <h2>${esc(die.name)}</h2>
    <p style="color:var(--mist);font-size:12.5px;margin:10px 0 6px;line-height:1.5;">${esc(catalog?.lore?.[key]?.desc || 'A directly purchasable die.')}</p>
    <p style="color:var(--gold-glow);font:700 12px 'Space Mono',monospace;margin:0 0 16px;">${cost.toLocaleString()} Pips · C1 copy</p>
    <button class="closeBtn" id="ttdShopBuyConfirm">Buy (${cost.toLocaleString()} Pips)</button>
    <button class="closeBtn" id="ttdShopDetailOk" style="margin-top:8px;background:var(--ink-700);">Cancel</button>
    <div id="ttdShopDetailStatus" style="min-height:18px;margin-top:9px;color:var(--mist);font-size:10px;"></div>`;
}

function openShopDieDetail(doc, key, die) {
  const overlay = doc.getElementById('itemDetailOverlay');
  const card = doc.getElementById('itemDetailCard');
  if (!overlay || !card) return;
  card.innerHTML = confirmationMarkup(doc, key, die);
  overlay.classList.add('show');
  const close = () => hideInnerDetail(doc);
  card.querySelector('#ttdShopDetailX')?.addEventListener('click', close);
  card.querySelector('#ttdShopDetailOk')?.addEventListener('click', close);
  card.querySelector('#ttdShopBuyConfirm')?.addEventListener('click', () => buyShopDie(doc, key, die));
}

async function buyShopDie(doc, key, die) {
  const status = doc.getElementById('ttdShopDetailStatus');
  const button = doc.getElementById('ttdShopBuyConfirm');
  if (purchaseBusy) return;
  if (!currentUser || !functions) {
    if (status) status.textContent = 'Sign in again before purchasing.';
    return;
  }
  purchaseBusy = true;
  if (button) button.disabled = true;
  if (status) status.textContent = 'Purchasing securely…';
  try {
    const result = await httpsCallable(functions, 'purchaseShopDie')({ key });
    const grant = result.data?.grant;
    const gameState = result.data?.gameState;
    if (!grant?.instance?.id || !gameState) throw new Error('The server returned an invalid shop receipt.');
    setCurrencyUi(gameState);
    await refreshCanonicalGame();
    hideInnerDetail(doc);
    showReward(`${die.name} C1 was added to your collection for ${Number(result.data?.costPips || die.shopCostPips).toLocaleString()} Pips.`);
    // Reload the outer shell after the visible success state so firebase-client-v4's private
    // canonical cache is rebuilt from the same server snapshot instead of retaining pre-purchase state.
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    console.error('Server die shop purchase failed.', err);
    if (status) status.textContent = friendlyError(err);
    if (button) button.disabled = false;
  } finally {
    purchaseBusy = false;
  }
}

function buildShopCard(doc, key, die) {
  const card = doc.createElement('div');
  card.className = 'shopItemCard';
  card.dataset.ttdServerShopDie = key;
  card.innerHTML = `
    <div class="siIcon" style="display:grid;place-items:center;">${iconMarkup(doc, key, die, 40)}</div>
    <div class="siName">${esc(die.name)}</div>
    <div class="siCost"><span class="siGoldDot"></span>${Number(die.shopCostPips).toLocaleString()}</div>
    <button class="siBuyBtn">Buy</button>`;
  const open = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    openShopDieDetail(doc, key, die);
  };
  card.addEventListener('click', open);
  card.querySelector('.siBuyBtn')?.addEventListener('click', open);
  return card;
}

function ensureDiceShop() {
  if (!catalog || !frame?.contentDocument) return;
  let doc;
  try { doc = frame.contentDocument; } catch (_) { return; }
  if (!doc?.body || !activeDiceShop(doc)) return;
  const grid = doc.getElementById('shopGrid');
  if (!grid) return;

  const entries = Object.entries(catalog.dice || {}).filter(([, die]) => Number.isSafeInteger(die?.shopCostPips) && die.shopCostPips > 0);
  const signature = entries.map(([key, die]) => `${key}:${die.shopCostPips}`).join('|');
  if (grid.dataset.ttdServerDiceShop === signature && grid.querySelector('[data-ttd-server-shop-die]')) return;

  grid.innerHTML = '';
  grid.dataset.ttdServerDiceShop = signature;
  if (!entries.length) {
    grid.innerHTML = '<div class="invEmpty">Nothing here yet — check back soon.</div>';
    return;
  }
  for (const [key, die] of entries) grid.appendChild(buildShopCard(doc, key, die));
  lastShopDoc = doc;
}

async function redeemHga1Code(code) {
  if (redeemBusy) return;
  if (!currentUser || !functions) {
    if (giftStatus) giftStatus.textContent = 'Sign in again before redeeming.';
    return;
  }
  redeemBusy = true;
  const redeemButton = document.getElementById('onlineGiftRedeem');
  if (redeemButton) redeemButton.disabled = true;
  if (giftStatus) giftStatus.textContent = 'Redeeming HG-A1 class code…';
  try {
    const result = await httpsCallable(functions, 'redeemHga1ClassCode')({ code });
    const label = result.data?.label || code;
    await refreshCanonicalGame();
    if (giftStatus) giftStatus.textContent = `${label} redeemed.`;
    document.getElementById('redeemModal')?.setAttribute('hidden', '');
    showReward(`${label} was added to your collection.`);
    if (giftInput) giftInput.value = '';
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    console.error('HG-A1 class code redemption failed.', err);
    if (giftStatus) giftStatus.textContent = friendlyError(err);
    if (redeemButton) redeemButton.disabled = false;
  } finally {
    redeemBusy = false;
  }
}

document.addEventListener('click', (event) => {
  const button = event.target?.closest?.('#onlineGiftRedeem');
  if (!button) return;
  const code = String(giftInput?.value || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!HGA1_CODE_RE.test(code)) return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  redeemHga1Code(code);
}, true);

async function start() {
  const app = await waitForFirebaseApp();
  auth = getAuth(app);
  functions = getFunctions(app, REGION);
  await loadCatalog();
  onAuthStateChanged(auth, (user) => { currentUser = user; });
  // The transformed v33 document can replace the loader document without a conventional
  // iframe navigation event, so a tiny observer loop is more reliable than depending on load.
  setInterval(ensureDiceShop, 180);
  frame?.addEventListener('load', () => setTimeout(ensureDiceShop, 80));
}

start().catch((err) => console.error('Online server dice shop could not start.', err));
