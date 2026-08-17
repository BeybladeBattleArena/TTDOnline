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

const PROJECT_ID = 'timetodie-a52be';
const REGION = 'us-central1';
const SAVE_KEY = 'RUNE-DICE-SAVE-v1';

const el = (id) => document.getElementById(id);
const statusEl = el('status');
const signedOutEl = el('signedOut');
const signedInEl = el('signedIn');
const migrationEl = el('migration');
const gameFrame = el('gameFrame');
const importBox = el('importBox');
const accountLabel = el('accountLabel');
const migrationState = el('migrationState');
const importSummary = el('importSummary');

let app;
let auth;
let db;
let functions;
let currentUser = null;

function setStatus(message, kind = '') {
  statusEl.textContent = message || '';
  statusEl.dataset.kind = kind;
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
  // Match the legacy v33 codec byte-for-byte.
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
    signedOutEl.hidden = !!user;
    signedInEl.hidden = !user;
    migrationEl.hidden = !user;
    gameFrame.hidden = !user;

    if (!user) {
      accountLabel.textContent = '';
      migrationState.textContent = 'Sign in to continue.';
      setStatus('Ready.');
      return;
    }

    accountLabel.textContent = user.displayName || user.email || user.uid;
    try {
      setStatus('Preparing your online account…');
      await httpsCallable(functions, 'ensureProfile')({});
      await refreshCloudState();
      setStatus('Signed in.', 'ok');
    } catch (err) {
      console.error(err);
      setStatus(humanizeError(err), 'error');
    }
  });
}

async function refreshCloudState() {
  if (!currentUser) return;
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
  } else {
    migrationState.textContent = 'No legacy v33 profile has been imported yet.';
    importSummary.textContent = '';
    importBox.hidden = false;
  }
}

function humanizeError(err) {
  const code = String(err?.code || '');
  if (code.includes('wrong-password') || code.includes('invalid-credential')) return 'The email or password was not accepted.';
  if (code.includes('email-already-in-use')) return 'An account already exists for that email.';
  if (code.includes('weak-password')) return 'That password does not meet the project password policy.';
  if (code.includes('popup-closed-by-user')) return 'Google sign-in was closed before it finished.';
  if (code.includes('failed-precondition')) return err.message || 'That action is not currently allowed.';
  return err?.message || 'Something went wrong.';
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

el('useLocalSave').addEventListener('click', () => {
  try {
    const raw = localStorage.getItem('rd_account');
    if (!raw) throw new Error('No v33 profile exists in this browser’s Firebase Hosting storage yet. You can paste a portable RDS1 save code instead.');
    const profile = JSON.parse(raw);
    el('saveCode').value = encodeSaveCode(profile);
    setStatus('Current browser profile prepared. Review it, then press Import.', 'ok');
  } catch (err) {
    setStatus(humanizeError(err), 'error');
  }
});

el('importLegacy').addEventListener('click', async () => {
  if (!currentUser) return;
  const saveCode = el('saveCode').value.trim();
  if (!saveCode) {
    setStatus('Paste or prepare a Rune Dice RDS1 save code first.', 'error');
    return;
  }
  if (!confirm('Import this v33 profile as the one-time legacy baseline for this online account? This import cannot be repeated automatically.')) return;

  try {
    setStatus('Validating and importing legacy profile…');
    const result = await httpsCallable(functions, 'importLegacySave')({ saveCode });
    const s = result.data?.summary || {};
    setStatus(`Imported ${s.dieInstances || 0} die instances successfully.`, 'ok');
    el('saveCode').value = '';
    await refreshCloudState();
  } catch (err) {
    console.error(err);
    setStatus(humanizeError(err), 'error');
  }
});

initializeFirebase().catch((err) => {
  console.error(err);
  signedOutEl.hidden = true;
  signedInEl.hidden = true;
  migrationEl.hidden = true;
  gameFrame.hidden = true;
  setStatus(humanizeError(err), 'error');
});
