import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const PROJECT_ID = 'ttd-online-b8c0f';
const REGION = 'us-central1';
const GAME_LOADER_PATH = '/online/game-loader.html';
const LOCAL_PROFILE_KEY = 'rd_account';
const ACTIVE_UID_KEY = 'ttd_online_active_uid_v1';
const SCOPED_PROFILE_PREFIX = 'ttd_online_profile_v1_';

const el = (id) => document.getElementById(id);
const statusEl = el('status');
const signedOutEl = el('signedOut');
const signedInEl = el('signedIn');
const accountArea = el('accountArea');
const gameFrame = el('gameFrame');
const accountLabel = el('accountLabel');
const cloudEconomyEl = el('cloudEconomy');

let app;
let auth;
let functions;
let currentUser = null;
let currentGeneration = 1;
let cloudGameState = null;
let cloudDice = [];
let cloudDecks = [];
let gachaRequestInFlight = false;
let deckRequestInFlight = false;
let pendingDeckRequest = null;
let bridgeTimer = null;

function setStatus(message, kind = '') {
  statusEl.textContent = message || '';
  statusEl.dataset.kind = kind;
}

function humanizeError(err) {
  const code = String(err?.code || '');
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'The email or password was not accepted.';
  if (code.includes('email-already-in-use')) return 'An account already exists for that email.';
  if (code.includes('weak-password')) return 'That password does not meet the project password policy.';
  if (code.includes('popup-closed-by-user')) return 'Google sign-in was closed before it finished.';
  if (code.includes('popup-blocked')) return 'The browser blocked the Google sign-in popup. Allow popups for this site and try again.';
  if (code.includes('unauthenticated')) return 'Your sign-in expired. Sign in again and retry.';
  if (code.includes('failed-precondition')) return err?.message?.replace(/^FirebaseError:\s*/i, '') || 'The server rejected that operation.';
  return err?.message?.replace(/^FirebaseError:\s*/i, '') || 'Something went wrong.';
}

function scopedProfileKey(uid, generation = currentGeneration) {
  return `${SCOPED_PROFILE_PREFIX}${generation}_${uid}`;
}

function stashActiveLocalProfile(uid = localStorage.getItem(ACTIVE_UID_KEY), generation = currentGeneration) {
  if (!uid) return;
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) localStorage.setItem(scopedProfileKey(uid, generation), raw);
  } catch (err) {
    console.warn('Could not preserve the temporary local account bridge.', err);
  }
}

function bindLocalProfile(uid, generation) {
  const nextGeneration = Number(generation || 1);
  try {
    const previousUid = localStorage.getItem(ACTIVE_UID_KEY);
    if (previousUid) stashActiveLocalProfile(previousUid, currentGeneration);
    currentGeneration = nextGeneration;
    const scoped = localStorage.getItem(scopedProfileKey(uid, currentGeneration));
    if (scoped) localStorage.setItem(LOCAL_PROFILE_KEY, scoped);
    else localStorage.removeItem(LOCAL_PROFILE_KEY);
    localStorage.setItem(ACTIVE_UID_KEY, uid);
  } catch (err) {
    currentGeneration = nextGeneration;
    console.warn('Could not bind the temporary local account bridge.', err);
    localStorage.removeItem(LOCAL_PROFILE_KEY);
  }
}

function clearActiveLocalProfile() {
  try {
    if (currentUser) stashActiveLocalProfile(currentUser.uid, currentGeneration);
    localStorage.removeItem(LOCAL_PROFILE_KEY);
    localStorage.removeItem(ACTIVE_UID_KEY);
  } catch (err) {
    console.warn('Could not clear the temporary local account bridge.', err);
  }
}

function validateGameState(gameState) {
  const pips = gameState?.economy?.pips;
  const astras = gameState?.economy?.astras;
  const activeDeckIdx = gameState?.activeDeckIdx;
  if (!Number.isSafeInteger(pips) || pips < 0 || !Number.isSafeInteger(astras) || astras < 0) {
    throw new Error('Firebase returned an invalid online economy state.');
  }
  if (!Number.isSafeInteger(activeDeckIdx) || activeDeckIdx < 0 || activeDeckIdx > 2) {
    throw new Error('Firebase returned an invalid active deck.');
  }
  return gameState;
}

function validateDice(dice) {
  if (!Array.isArray(dice)) throw new Error('Firebase returned invalid die inventory.');
  for (const grant of dice) {
    if (!grant || typeof grant.key !== 'string' ||
      !grant.instance || typeof grant.instance.id !== 'string' || !grant.instance.id ||
      !Number.isSafeInteger(grant.instance.cls) || grant.instance.cls < 1 || grant.instance.cls > 10 ||
      !Array.isArray(grant.instance.enchants) || grant.instance.enchants.length !== 4) {
      throw new Error('Firebase returned an invalid die instance.');
    }
  }
  return dice;
}

function validateDecks(decks) {
  if (!Array.isArray(decks) || decks.length !== 3) throw new Error('Firebase returned invalid decks.');
  const normalized = decks.slice().sort((a, b) => a.index - b.index);
  normalized.forEach((deck, index) => {
    if (!deck || deck.index !== index || !Array.isArray(deck.slots) || deck.slots.length !== 5) {
      throw new Error('Firebase returned an invalid deck.');
    }
    for (const slot of deck.slots) {
      if (slot != null && (typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string')) {
        throw new Error('Firebase returned an invalid deck slot.');
      }
    }
  });
  return normalized;
}

function renderCloudEconomy(gameState) {
  if (!cloudEconomyEl) return;
  if (!gameState) {
    cloudEconomyEl.textContent = '';
    return;
  }
  const { pips, astras } = gameState.economy;
  cloudEconomyEl.textContent = `${pips.toLocaleString()} Pips • ${astras.toLocaleString()} Astras`;
}

function adoptGameState(nextState) {
  const validated = validateGameState(nextState);
  if (!cloudGameState || Number(validated.revision || 0) >= Number(cloudGameState.revision || 0)) {
    cloudGameState = validated;
    renderCloudEconomy(cloudGameState);
  }
  return cloudGameState;
}

function postToGame(message) {
  if (gameFrame.contentWindow) gameFrame.contentWindow.postMessage(message, location.origin);
}

function sendCloudSyncToGame() {
  if (!cloudGameState) return;
  postToGame({
    type: 'ttd:cloud-sync',
    gameState: cloudGameState,
    dice: cloudDice,
    decks: cloudDecks,
  });
}

function clearBridgeTimer() {
  if (bridgeTimer) clearTimeout(bridgeTimer);
  bridgeTimer = null;
}

function armBridgeTimer(stage = 'The secure online game did not finish starting.') {
  clearBridgeTimer();
  bridgeTimer = setTimeout(() => {
    gameFrame.hidden = true;
    gameFrame.style.pointerEvents = 'none';
    accountArea.hidden = false;
    setStatus(`${stage} Reload the page and try again.`, 'error');
  }, 15000);
}

function showSignedOutMode() {
  clearBridgeTimer();
  cloudGameState = null;
  cloudDice = [];
  cloudDecks = [];
  gachaRequestInFlight = false;
  deckRequestInFlight = false;
  pendingDeckRequest = null;
  renderCloudEconomy(null);
  accountArea.hidden = false;
  signedOutEl.hidden = false;
  signedInEl.hidden = true;
  gameFrame.hidden = true;
  gameFrame.style.pointerEvents = 'none';
  gameFrame.src = 'about:blank';
}

function showGameMode(user, generation, gameState) {
  signedOutEl.hidden = true;
  signedInEl.hidden = false;
  accountArea.hidden = false;
  gameFrame.hidden = true;
  gameFrame.style.pointerEvents = 'none';
  const query = [
    'online=1',
    `uid=${encodeURIComponent(user.uid)}`,
    `gen=${encodeURIComponent(generation)}`,
    `economyRev=${encodeURIComponent(gameState.revision || 1)}`,
    `boot=${Date.now().toString(36)}`,
  ].join('&');
  armBridgeTimer('The secure game loader did not complete its handshake.');
  gameFrame.src = `${GAME_LOADER_PATH}?${query}`;
}

async function fetchFirebaseConfig() {
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Firebase Hosting configuration is unavailable. Open this page through Firebase Hosting.');
  const config = await response.json();
  if (config.projectId !== PROJECT_ID) {
    throw new Error(`This build expected Firebase project ${PROJECT_ID}, but Hosting returned ${config.projectId}.`);
  }
  return config;
}

async function loadCloudProgression() {
  const result = await httpsCallable(functions, 'getInventoryState')({});
  cloudGameState = validateGameState(result.data?.gameState);
  cloudDice = validateDice(result.data?.dice || []);
  cloudDecks = validateDecks(result.data?.decks || []);
  renderCloudEconomy(cloudGameState);
}

async function handleGachaRequest(message) {
  if (!currentUser || gachaRequestInFlight) {
    postToGame({
      type: 'ttd:gacha-error', requestId: message.requestId,
      message: gachaRequestInFlight ? 'A pull is already being processed.' : 'Sign in again before pulling.',
    });
    return;
  }
  const count = Number(message.count);
  if (count !== 1 && count !== 10) {
    postToGame({ type: 'ttd:gacha-error', requestId: message.requestId, message: 'Invalid pull size.' });
    return;
  }
  gachaRequestInFlight = true;
  try {
    const result = await httpsCallable(functions, 'gachaPull')({ count });
    const nextState = validateGameState(result.data?.gameState);
    const results = validateDice(result.data?.results || []);
    adoptGameState(nextState);
    const knownIds = new Set(cloudDice.map((grant) => grant.instance.id));
    for (const grant of results) {
      if (!knownIds.has(grant.instance.id)) {
        cloudDice.push(grant);
        knownIds.add(grant.instance.id);
      }
    }
    postToGame({
      type: 'ttd:gacha-result', requestId: message.requestId,
      receiptId: result.data?.receiptId || null,
      costPips: result.data?.costPips, gameState: nextState, results,
    });
  } catch (err) {
    console.error('Server gacha failed.', err);
    postToGame({ type: 'ttd:gacha-error', requestId: message.requestId, message: humanizeError(err) });
  } finally {
    gachaRequestInFlight = false;
  }
}

async function processDeckRequest(message) {
  if (!currentUser) return;
  if (deckRequestInFlight) {
    pendingDeckRequest = message;
    return;
  }
  deckRequestInFlight = true;
  try {
    const result = await httpsCallable(functions, 'setDeckState')({
      decks: message.decks,
      activeDeckIdx: message.activeDeckIdx,
    });
    const nextState = validateGameState(result.data?.gameState);
    const decks = validateDecks(result.data?.decks || []);
    adoptGameState(nextState);
    cloudDecks = decks;
    postToGame({ type: 'ttd:deck-state-result', requestId: message.requestId, gameState: nextState, decks });
  } catch (err) {
    console.error('Server deck sync failed.', err);
    const friendly = humanizeError(err);
    try {
      await loadCloudProgression();
      postToGame({ type: 'ttd:deck-state-error', requestId: message.requestId, message: friendly });
      sendCloudSyncToGame();
    } catch (reloadErr) {
      console.error('Could not restore canonical deck state.', reloadErr);
      postToGame({ type: 'ttd:deck-state-error', requestId: message.requestId, message: friendly });
    }
  } finally {
    deckRequestInFlight = false;
    if (pendingDeckRequest) {
      const pending = pendingDeckRequest;
      pendingDeckRequest = null;
      processDeckRequest(pending);
    }
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== gameFrame.contentWindow) return;
  const message = event.data || {};

  if (message.type === 'ttd:bridge-phase') {
    setStatus(message.message || `Securing online gameplay (${message.phase || 'working'})…`);
    armBridgeTimer(`The secure game loader stopped during ${message.phase || 'startup'}.`);
    return;
  }
  if (message.type === 'ttd:bridge-ready') {
    setStatus('Applying authoritative cloud progression…');
    armBridgeTimer('The game bridge did not acknowledge authoritative cloud progression.');
    sendCloudSyncToGame();
    return;
  }
  if (message.type === 'ttd:bridge-synced') {
    clearBridgeTimer();
    setStatus('Cloud account ready.', 'ok');
    accountArea.hidden = true;
    gameFrame.hidden = false;
    gameFrame.style.pointerEvents = 'auto';
    return;
  }
  if (message.type === 'ttd:bridge-sync-error') {
    clearBridgeTimer();
    gameFrame.hidden = true;
    gameFrame.style.pointerEvents = 'none';
    accountArea.hidden = false;
    setStatus(message.message || 'The secure online game state could not be synchronized.', 'error');
    return;
  }
  if (message.type === 'ttd:gacha-request') {
    handleGachaRequest(message);
    return;
  }
  if (message.type === 'ttd:deck-state-request') processDeckRequest(message);
});

async function initializeFirebase() {
  const config = await fetchFirebaseConfig();
  app = initializeApp(config);
  auth = getAuth(app);
  functions = getFunctions(app, REGION);

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (!user) {
      accountLabel.textContent = '';
      showSignedOutMode();
      setStatus('Sign in to play.');
      return;
    }

    accountLabel.textContent = user.displayName || user.email || user.uid;
    accountArea.hidden = false;
    signedOutEl.hidden = true;
    signedInEl.hidden = false;
    gameFrame.hidden = true;
    gameFrame.style.pointerEvents = 'none';
    setStatus('Loading authoritative online profile…');

    try {
      const ensureResult = await httpsCallable(functions, 'ensureProfile')({});
      const generation = Number(ensureResult.data?.accountGeneration || 1);
      bindLocalProfile(user.uid, generation);
      await loadCloudProgression();
      setStatus('Launching secure online runtime…');
      showGameMode(user, generation, cloudGameState);
    } catch (err) {
      console.error(err);
      setStatus(humanizeError(err), 'error');
    }
  });
}

el('emailSignIn').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    setStatus('Signing in…');
    await signInWithEmailAndPassword(auth, el('email').value.trim(), el('password').value);
  } catch (err) { setStatus(humanizeError(err), 'error'); }
});

el('createAccount').addEventListener('click', async () => {
  try {
    setStatus('Creating fresh account…');
    await createUserWithEmailAndPassword(auth, el('email').value.trim(), el('password').value);
  } catch (err) { setStatus(humanizeError(err), 'error'); }
});

el('googleSignIn').addEventListener('click', async () => {
  try {
    setStatus('Opening Google sign-in…');
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) { setStatus(humanizeError(err), 'error'); }
});

el('resetPassword').addEventListener('click', async () => {
  const email = el('email').value.trim();
  if (!email) {
    setStatus('Enter your email address first.', 'error');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    setStatus('Password-reset email sent.', 'ok');
  } catch (err) { setStatus(humanizeError(err), 'error'); }
});

el('signOut').addEventListener('click', async () => {
  clearActiveLocalProfile();
  await signOut(auth);
});

window.addEventListener('pagehide', () => {
  if (currentUser) stashActiveLocalProfile(currentUser.uid, currentGeneration);
});

initializeFirebase().catch((err) => {
  console.error(err);
  showSignedOutMode();
  signedOutEl.hidden = true;
  setStatus(humanizeError(err), 'error');
});
