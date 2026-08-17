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

let app;
let auth;
let functions;
let currentUser = null;
let currentGeneration = 1;

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
  return err?.message || 'Something went wrong.';
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
  currentGeneration = Number(generation || 1);
  try {
    const previousUid = localStorage.getItem(ACTIVE_UID_KEY);
    if (previousUid) stashActiveLocalProfile(previousUid, currentGeneration);

    const scoped = localStorage.getItem(scopedProfileKey(uid, currentGeneration));
    if (scoped) localStorage.setItem(LOCAL_PROFILE_KEY, scoped);
    else localStorage.removeItem(LOCAL_PROFILE_KEY);

    localStorage.setItem(ACTIVE_UID_KEY, uid);
  } catch (err) {
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

function showSignedOutMode() {
  accountArea.hidden = false;
  signedOutEl.hidden = false;
  signedInEl.hidden = true;
  gameFrame.hidden = true;
  gameFrame.src = 'about:blank';
}

function showGameMode(user, generation) {
  signedOutEl.hidden = true;
  signedInEl.hidden = false;
  accountArea.hidden = true;
  gameFrame.hidden = false;
  const query = `online=1&uid=${encodeURIComponent(user.uid)}&gen=${encodeURIComponent(generation)}`;
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
    setStatus('Preparing a fresh online account…');

    try {
      const result = await httpsCallable(functions, 'ensureProfile')({});
      const generation = Number(result.data?.accountGeneration || 1);
      bindLocalProfile(user.uid, generation);
      setStatus('Account ready.', 'ok');
      showGameMode(user, generation);
    } catch (err) {
      console.error(err);
      setStatus(humanizeError(err), 'error');
    }
  });
}

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
