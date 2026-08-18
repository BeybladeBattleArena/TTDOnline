import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const REGION = 'us-central1';
const el = (id) => document.getElementById(id);
const gameFrame = el('gameFrame');
const rawEconomy = el('cloudEconomy');
const pipsEl = el('cloudPips');
const astrasEl = el('cloudAstras');
const accountBtn = el('accountSettings');
const settingsBtn = el('gameSettings');
const accountMenu = el('onlineAccountMenu');
const accountMenuIdentity = el('accountMenuIdentity');
const accountMenuProvider = el('accountMenuProvider');
const accountResetPassword = el('accountResetPassword');
const accountMenuClose = el('accountMenuClose');

let auth = null;
let functions = null;
let currentUser = null;
let favoriteIds = [];
let favoritesLoaded = false;
let bridgeSynced = false;
let progressionBridgeReady = false;
let favoriteRequestPending = false;
let mergeRequestPending = false;

function humanizeError(err) {
  const code = String(err?.code || '');
  if (code.includes('unauthenticated')) return 'Your sign-in expired. Sign in again and retry.';
  if (code.includes('failed-precondition') || code.includes('invalid-argument')) {
    return err?.message?.replace(/^FirebaseError:\s*/i, '') || 'The server rejected that operation.';
  }
  return err?.message?.replace(/^FirebaseError:\s*/i, '') || 'The online progression service could not complete that operation.';
}

function postToGame(message) {
  if (gameFrame?.contentWindow) gameFrame.contentWindow.postMessage(message, location.origin);
}

function renderHudEconomy() {
  const text = rawEconomy?.textContent || '';
  const match = text.match(/([\d,]+)\s+Pips\s+•\s+([\d,]+)\s+Astras/i);
  if (!match) return;
  if (pipsEl) pipsEl.textContent = match[1];
  if (astrasEl) astrasEl.textContent = match[2];
}

function providerLabel(user) {
  const providers = new Set((user?.providerData || []).map((entry) => entry?.providerId).filter(Boolean));
  const labels = [];
  if (providers.has('google.com')) labels.push('Google');
  if (providers.has('password')) labels.push('Email + password');
  for (const provider of providers) {
    if (provider !== 'google.com' && provider !== 'password') labels.push(provider);
  }
  return labels.length ? labels.join(' · ') : 'Firebase account';
}

function renderAccountMenu(user) {
  if (!accountMenu) return;
  if (!user) {
    accountMenu.hidden = true;
    return;
  }
  if (accountMenuIdentity) accountMenuIdentity.textContent = user.displayName || user.email || user.uid;
  if (accountMenuProvider) accountMenuProvider.textContent = providerLabel(user);
  if (accountResetPassword) {
    const hasPassword = (user.providerData || []).some((entry) => entry?.providerId === 'password');
    accountResetPassword.hidden = !(hasPassword && user.email);
    accountResetPassword.textContent = 'Reset password';
    accountResetPassword.disabled = false;
  }
}

function closeAccountMenu() {
  if (accountMenu) accountMenu.hidden = true;
}

function maybeSyncFavorites() {
  if (!currentUser || !favoritesLoaded || !bridgeSynced || !progressionBridgeReady) return;
  postToGame({ type: 'ttd:favorites-sync', instanceIds: favoriteIds });
}

async function loadFavorites() {
  if (!currentUser || !functions) return;
  favoritesLoaded = false;
  const result = await httpsCallable(functions, 'getFavoriteState')({});
  const ids = result.data?.favorites?.instanceIds;
  favoriteIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string').slice(0, 10) : [];
  favoritesLoaded = true;
  maybeSyncFavorites();
}

async function waitForDefaultFirebaseApp() {
  for (let i = 0; i < 500; i++) {
    if (getApps().length) return getApp();
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('The core Firebase account client did not initialize.');
}

async function start() {
  const app = await waitForDefaultFirebaseApp();
  auth = getAuth(app);
  functions = getFunctions(app, REGION);

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    favoriteIds = [];
    favoritesLoaded = false;
    favoriteRequestPending = false;
    mergeRequestPending = false;
    renderAccountMenu(user);
    if (!user) return;
    try {
      await loadFavorites();
    } catch (err) {
      console.error('Could not load server favorites.', err);
    }
  });
}

if (rawEconomy) {
  new MutationObserver(renderHudEconomy).observe(rawEconomy, { childList: true, characterData: true, subtree: true });
  renderHudEconomy();
}

accountBtn?.addEventListener('click', () => {
  if (!accountMenu || !currentUser) return;
  renderAccountMenu(currentUser);
  accountMenu.hidden = !accountMenu.hidden;
});
accountMenuClose?.addEventListener('click', closeAccountMenu);
settingsBtn?.addEventListener('click', () => {
  closeAccountMenu();
  postToGame({ type: 'ttd:open-settings-screen' });
});
accountResetPassword?.addEventListener('click', async () => {
  if (!auth || !currentUser?.email || accountResetPassword.disabled) return;
  accountResetPassword.disabled = true;
  accountResetPassword.textContent = 'Sending…';
  try {
    await sendPasswordResetEmail(auth, currentUser.email);
    accountResetPassword.textContent = 'Reset email sent';
    setTimeout(() => {
      if (!accountResetPassword) return;
      accountResetPassword.textContent = 'Reset password';
      accountResetPassword.disabled = false;
    }, 2200);
  } catch (err) {
    console.error('Could not send password reset email.', err);
    accountResetPassword.textContent = 'Reset failed';
    setTimeout(() => {
      if (!accountResetPassword) return;
      accountResetPassword.textContent = 'Reset password';
      accountResetPassword.disabled = false;
    }, 2200);
  }
});
document.addEventListener('pointerdown', (event) => {
  if (!accountMenu || accountMenu.hidden) return;
  if (accountMenu.contains(event.target) || accountBtn?.contains(event.target)) return;
  closeAccountMenu();
});

window.addEventListener('message', async (event) => {
  if (event.origin !== location.origin || event.source !== gameFrame?.contentWindow) return;
  const message = event.data || {};

  if (message.type === 'ttd:bridge-synced') {
    bridgeSynced = true;
    maybeSyncFavorites();
    return;
  }

  if (message.type === 'ttd:v5-progression-ready') {
    progressionBridgeReady = true;
    maybeSyncFavorites();
    return;
  }

  if (message.type === 'ttd:favorite-toggle-request') {
    if (!currentUser || !functions) {
      postToGame({ type: 'ttd:favorite-toggle-error', requestId: message.requestId, message: 'Sign in again before changing favorites.' });
      return;
    }
    if (favoriteRequestPending) {
      postToGame({ type: 'ttd:favorite-toggle-error', requestId: message.requestId, message: 'A favorite change is already syncing.' });
      return;
    }
    favoriteRequestPending = true;
    try {
      const result = await httpsCallable(functions, 'toggleFavorite')({
        instanceId: message.instanceId,
        favorite: !!message.favorite,
      });
      favoriteIds = Array.isArray(result.data?.favorites?.instanceIds)
        ? result.data.favorites.instanceIds.filter((id) => typeof id === 'string').slice(0, 10)
        : favoriteIds;
      postToGame({ type: 'ttd:favorite-toggle-result', requestId: message.requestId, instanceIds: favoriteIds });
    } catch (err) {
      console.error('Server favorite toggle failed.', err);
      postToGame({ type: 'ttd:favorite-toggle-error', requestId: message.requestId, message: humanizeError(err) });
    } finally {
      favoriteRequestPending = false;
    }
    return;
  }

  if (message.type === 'ttd:merge-request') {
    if (!currentUser || !functions) {
      postToGame({ type: 'ttd:merge-error', requestId: message.requestId, message: 'Sign in again before merging dice.' });
      return;
    }
    if (mergeRequestPending) {
      postToGame({ type: 'ttd:merge-error', requestId: message.requestId, message: 'A Class merge is already being processed.' });
      return;
    }
    mergeRequestPending = true;
    try {
      const result = await httpsCallable(functions, 'mergeDice')({
        key: message.key,
        sourceId: message.sourceId,
        targetId: message.targetId,
      });
      favoriteIds = Array.isArray(result.data?.favorites?.instanceIds)
        ? result.data.favorites.instanceIds.filter((id) => typeof id === 'string').slice(0, 10)
        : favoriteIds;
      postToGame({
        type: 'ttd:merge-result',
        requestId: message.requestId,
        key: result.data?.key,
        sourceId: result.data?.sourceId,
        targetId: result.data?.targetId,
        oldClass: result.data?.oldClass,
        newClass: result.data?.newClass,
        target: result.data?.target,
        decks: result.data?.decks || [],
        favoriteIds,
        returnedJewels: result.data?.returnedJewels || [],
        receiptId: result.data?.receiptId || null,
      });
    } catch (err) {
      console.error('Server Class merge failed.', err);
      postToGame({ type: 'ttd:merge-error', requestId: message.requestId, message: humanizeError(err) });
    } finally {
      mergeRequestPending = false;
    }
  }
});

start().catch((err) => console.error('V5 progression client could not start.', err));
