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
  getFirestore,
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import {
  getFunctions,
  httpsCallable,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const PROJECT_ID = 'ttd-online-b8c0f';
const REGION = 'us-central1';
const SAVE_KEY = 'RUNE-DICE-SAVE-v1';
const LOCAL_PROFILE_KEY = 'rd_account';

const el = (id) => document.getElementById(id);
const statusEl = el('status');
const signedOutEl = el('signedOut');
const signedInEl = el('signedIn');
const migrationEl = el('migration');
const accountArea = el('accountArea');
const gameFrame = el('gameFrame');
const importBox = el('importBox');
const importComplete = el('importComplete');
const accountLabel = el('accountLabel');
const migrationState = el('migrationState');
const importSummary = el('importSummary');
const migrationFeedback = el('migrationFeedback');
const localButton = el('useLocalSave');
const pastedButton = el('importLegacy');

let app;
let auth;
let db;
let functions;
let currentUser = null;
let importBusy = false;

function setStatus(message, kind = '') {
  statusEl.textContent = message || '';
  statusEl.dataset.kind = kind;
}

function setMigrationFeedback(message, kind = '') {
  migrationFeedback.textContent = message || '';
  migrationFeedback.dataset.kind = kind;
}

function setImportBusy(busy) {
  importBusy = busy;
  localButton.disabled = busy;
  pastedButton.disabled = busy;
  el('saveCode').disabled = busy;
}

function showSignedOutMode() {
  accountArea.hidden = false;
  signedOutEl.hidden = false;
  migrationEl.hidden = true;
  gameFrame.hidden = true;
}

function showMigrationMode() {
  accountArea.hidden = false;
  signedOutEl.hidden = true;
  migrationEl.hidden = false;
  importComplete.hidden = true;
  gameFrame.hidden = true;
}

function showGameMode() {
  accountArea.hidden = true;
  gameFrame.hidden = false;
}

function checksumOf(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum = (sum + str.charCodeAt(i) * (i + 1)) % 999983;
  }
  return sum.toString(36);
}

function encodeSaveCode(obj) {
  const json = JSON.stringify(obj);
  let xored = '';
  for (let i = 0; i < json.length; i++) {
    xored += String.fromCharCode(
      json.charCodeAt(i) ^ SAVE_KEY.charCodeAt(i % SAVE_KEY.length),
    );
  }
  const b64 = btoa(unescape(encodeURIComponent(xored)));
  return `RDS1-${checksumOf(json)}-${b64}`;
}

async function fetchFirebaseConfig() {
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(
      'Firebase Hosting configuration is unavailable. Open this page through Firebase Hosting or the Hosting emulator.',
    );
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
  db = getFirestore(app);
  functions = getFunctions(app, REGION);

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    signedInEl.hidden = !user;

    if (!user) {
      accountLabel.textContent = '';
      migrationState.textContent = 'Sign in to continue.';
      showSignedOutMode();
      setStatus('Ready.');
      return;
    }

    accountLabel.textContent = user.displayName || user.email || user.uid;
    showMigrationMode();
    try {
      setStatus('Preparing your online account…');
      await httpsCallable(functions, 'ensureProfile')({});
      const imported = await refreshCloudState();
      setStatus('Signed in.', 'ok');
      if (imported) showGameMode();
    } catch (err) {
      console.error(err);
      const message = humanizeError(err);
      setStatus(message, 'error');
      setMigrationFeedback(message, 'error');
    }
  });
}

async function refreshCloudState() {
  if (!currentUser) return false;
  const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const data = userSnap.exists() ? userSnap.data() : null;
  const legacy = data?.legacyImport;
  if (legacy?.locked) {
    migrationState.textContent = 'Legacy v33 profile imported to this account.';
    const s = legacy.summary || {};
    importSummary.textContent = [
      `${Number(s.pips || 0).toLocaleString()} Pips`,
      `${Number(s.astras || 0).toLocaleString()} Astras`,
      `${Number(s.dieInstances || 0).toLocaleString()} die instances`,
      `highest Class C${Number(s.highestClass || 1)}`,
    ].join(' • ');
    importBox.hidden = true;
    importComplete.hidden = false;
    return true;
  }

  migrationState.textContent = 'No legacy v33 profile has been imported yet.';
  importSummary.textContent = '';
  importBox.hidden = false;
  importComplete.hidden = true;
  return false;
}

function humanizeError(err) {
  const code = String(err?.code || '');
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'The email or password was not accepted.';
  if (code.includes('email-already-in-use')) return 'An account already exists for that email.';
  if (code.includes('weak-password')) return 'That password does not meet the project password policy.';
  if (code.includes('popup-closed-by-user')) return 'Google sign-in was closed before it finished.';
  if (code.includes('popup-blocked')) return 'The browser blocked the Google sign-in popup. Allow popups for this site and try again.';
  if (code.includes('failed-precondition')) return err.message || 'That action is not currently allowed.';
  if (code.includes('invalid-argument')) return err.message || 'The save code was rejected as invalid.';
  if (code.includes('unauthenticated')) return 'Your sign-in expired. Sign in again and retry.';
  return err?.message || 'Something went wrong.';
}

async function importSaveCode(saveCode, sourceLabel) {
  if (!currentUser || importBusy) return;
  if (!saveCode) {
    setMigrationFeedback('No v33 save data was supplied.', 'error');
    return;
  }

  const confirmed = confirm(`Import ${sourceLabel} as the one-time v33 baseline for this online account?`);
  if (!confirmed) {
    setMigrationFeedback('Import cancelled.');
    return;
  }

  try {
    setImportBusy(true);
    setStatus('Validating and importing legacy profile…');
    setMigrationFeedback('Uploading and validating the v33 profile…');
    const result = await httpsCallable(functions, 'importLegacySave')({ saveCode });
    const s = result.data?.summary || {};
    setStatus(`Imported ${s.dieInstances || 0} die instances successfully.`, 'ok');
    setMigrationFeedback(
      `Import complete: ${Number(s.pips || 0).toLocaleString()} Pips • ${Number(s.astras || 0).toLocaleString()} Astras • ${Number(s.dieInstances || 0).toLocaleString()} dice.`,
      'ok',
    );
    el('saveCode').value = '';
    const imported = await refreshCloudState();
    if (imported) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      showGameMode();
    }
  } catch (err) {
    console.error(err);
    const message = humanizeError(err);
    setStatus(message, 'error');
    setMigrationFeedback(`Import failed: ${message}\n${err?.code ? `Code: ${err.code}` : ''}`, 'error');
  } finally {
    setImportBusy(false);
  }
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
    setStatus('Creating account…');
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
  await signOut(auth);
});

localButton.addEventListener('click', async () => {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (!raw) {
      throw new Error('No v33 profile exists on this Firebase-hosted site yet. Open the game once on this site or paste a portable RDS1 save code below.');
    }
    const profile = JSON.parse(raw);
    const saveCode = encodeSaveCode(profile);
    await importSaveCode(saveCode, "this browser's current v33 save");
  } catch (err) {
    const message = humanizeError(err);
    setStatus(message, 'error');
    setMigrationFeedback(message, 'error');
  }
});

pastedButton.addEventListener('click', async () => {
  const saveCode = el('saveCode').value.trim();
  if (!saveCode) {
    setMigrationFeedback('Paste a Rune Dice RDS1 save code first.', 'error');
    return;
  }
  await importSaveCode(saveCode, 'the pasted RDS1 save');
});

initializeFirebase().catch((err) => {
  console.error(err);
  signedOutEl.hidden = true;
  signedInEl.hidden = true;
  migrationEl.hidden = true;
  gameFrame.hidden = true;
  accountArea.hidden = false;
  setStatus(humanizeError(err), 'error');
});
