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
import {
  getFunctions,
  httpsCallable,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const PROJECT_ID = 'ttd-online-b8c0f';
const REGION = 'us-central1';
const GAME_PATH = '/random-dice-game-33.html';
const GAME_BRIDGE_PATH = '/online/game-bridge.js?v=1';
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
let cloudGachaGrants = [];
let gachaRequestInFlight = false;

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
    const previousGeneration = currentGeneration;
    if (previousUid) stashActiveLocalProfile(previousUid, previousGeneration);

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
  if (!Number.isSafeInteger(pips) || pips < 0 || !Number.isSafeInteger(astras) || astras < 0) {
    throw new Error('Firebase returned an invalid online economy state.');
  }
  return gameState;
}

function validateGachaGrants(grants) {
  if (!Array.isArray(grants)) throw new Error('Firebase returned invalid gacha grants.');
  return grants.filter((grant) =>
    grant && typeof grant.key === 'string' &&
    grant.instance && typeof grant.instance.id === 'string' && grant.instance.id &&
    Number.isSafeInteger(grant.instance.cls) && grant.instance.cls >= 1 &&
    Array.isArray(grant.instance.enchants) && grant.instance.enchants.length === 4);
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

function applyCloudEconomyToLocalBridge(uid, generation, gameState) {
  // v33 still owns the rest of its temporary browser profile. Before the iframe
  // boots, replace only its currency fields with the canonical server values.
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) return false;
    const profile = JSON.parse(raw);
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return false;

    profile.gold = gameState.economy.pips;
    profile.astras = gameState.economy.astras;
    const json = JSON.stringify(profile);
    localStorage.setItem(LOCAL_PROFILE_KEY, json);
    localStorage.setItem(scopedProfileKey(uid, generation), json);
    return true;
  } catch (err) {
    console.warn('Could not seed the temporary v33 profile with cloud economy.', err);
    return false;
  }
}

function postToGame(message) {
  if (!gameFrame.contentWindow) return;
  gameFrame.contentWindow.postMessage(message, location.origin);
}

function sendCloudSyncToGame() {
  if (!cloudGameState) return;
  postToGame({
    type: 'ttd:cloud-sync',
    gameState: cloudGameState,
    gachaGrants: cloudGachaGrants,
  });
}

function injectGameBridge() {
  try {
    const doc = gameFrame.contentDocument;
    if (!doc || gameFrame.src === 'about:blank') return;
    if (doc.getElementById('ttd-online-game-bridge')) return;

    const script = doc.createElement('script');
    script.id = 'ttd-online-game-bridge';
    script.src = GAME_BRIDGE_PATH;
    script.async = false;
    script.onerror = () => {
      gameFrame.hidden = true;
      gameFrame.style.pointerEvents = 'none';
      accountArea.hidden = false;
      setStatus('The secure online gameplay bridge failed to load. Reload and try again.', 'error');
    };
    (doc.head || doc.documentElement).appendChild(script);
  } catch (err) {
    console.error('Could not inject the online game bridge.', err);
    gameFrame.hidden = true;
    gameFrame.style.pointerEvents = 'none';
    accountArea.hidden = false;
    setStatus('Could not attach the secure online gameplay bridge.', 'error');
  }
}

function showSignedOutMode() {
  cloudGameState = null;
  cloudGachaGrants = [];
  gachaRequestInFlight = false;
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
  ].join('&');
  gameFrame.src = `${GAME_PATH}?${query}`;
}

async function fetchFirebaseConfig() {
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Firebase Hosting configuration is unavailable. Open this page through Firebase Hosting.');
  }
  const config = await response.json();
  if (config.projectId !== PROJECT_ID) {
    throw new Error(`This build expected Firebase project ${PROJECT_ID}, but Hosting returned ${config.projectId}.`);
  }
  return config;
}

async function loadCloudProgression() {
  const [stateResult, grantsResult] = await Promise.all([
    httpsCallable(functions, 'getGameState')({}),
    httpsCallable(functions, 'getGachaGrants')({}),
  ]);
  cloudGameState = validateGameState(stateResult.data?.gameState);
  cloudGachaGrants = validateGachaGrants(grantsResult.data?.grants || []);
  renderCloudEconomy(cloudGameState);
}

async function handleGachaRequest(message) {
  if (!currentUser || gachaRequestInFlight) {
    postToGame({
      type: 'ttd:gacha-error',
      requestId: message.requestId,
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
    cloudGameState = validateGameState(result.data?.gameState);
    const results = validateGachaGrants(result.data?.results || []);

    const knownIds = new Set(cloudGachaGrants.map((grant) => grant.instance.id));
    for (const grant of results) {
      if (!knownIds.has(grant.instance.id)) {
        cloudGachaGrants.push(grant);
        knownIds.add(grant.instance.id);
      }
    }

    renderCloudEconomy(cloudGameState);
    postToGame({
      type: 'ttd:gacha-result',
      requestId: message.requestId,
      receiptId: result.data?.receiptId || null,
      costPips: result.data?.costPips,
      gameState: cloudGameState,
      results,
    });
  } catch (err) {
    console.error('Server gacha failed.', err);
    postToGame({
      type: 'ttd:gacha-error',
      requestId: message.requestId,
      message: humanizeError(err),
    });
  } finally {
    gachaRequestInFlight = false;
  }
}

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
      setStatus('Sign in to play.', '');
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
      applyCloudEconomyToLocalBridge(user.uid, generation, cloudGameState);

      setStatus('Securing online gameplay bridge…');
      showGameMode(user, generation, cloudGameState);
    } catch (err) {
      console.error(err);
      setStatus(humanizeError(err), 'error');
    }
  });
}

gameFrame.addEventListener('load', () => {
  if (gameFrame.src === 'about:blank') return;
  injectGameBridge();
});

window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== gameFrame.contentWindow) return;
  const message = event.data || {};

  if (message.type === 'ttd:bridge-ready') {
    sendCloudSyncToGame();
    return;
  }

  if (message.type === 'ttd:bridge-synced') {
    setStatus('Cloud account ready.', 'ok');
    accountArea.hidden = true;
    gameFrame.hidden = false;
    gameFrame.style.pointerEvents = 'auto';
    return;
  }

  if (message.type === 'ttd:bridge-sync-error') {
    gameFrame.hidden = true;
    gameFrame.style.pointerEvents = 'none';
    accountArea.hidden = false;
    setStatus(message.message || 'The secure online game state could not be synchronized.', 'error');
    return;
  }

  if (message.type === 'ttd:gacha-request') {
    handleGachaRequest(message);
  }
});

el('emailSignIn').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = el('email').value.trim();
  const password = el('password').value;
  try {
    setStatus('Signing in…');
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    setStatus(humanizeError(err), 'error');
  }
});

el('createAccount').addEventListener('click', async () => {
  const email = el('email').value.trim();
  const password = el('password').value;
  try {
    setStatus('Creating fresh account…');
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    setStatus(humanizeError(err), 'error');
  }
});

el('googleSignIn').addEventListener('click', async () => {
  try {
    setStatus('Opening Google sign-in…');
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    setStatus(humanizeError(err), 'error');
  }
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
  } catch (err) {
    setStatus(humanizeError(err), 'error');
  }
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
