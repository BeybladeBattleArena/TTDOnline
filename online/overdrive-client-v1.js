import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const REGION = 'us-central1';
const gameFrame = document.getElementById('gameFrame');
let auth = null;
let functions = null;
let currentUser = null;
let overdrive = null;
let loading = null;

function humanize(err) {
  return err?.message?.replace(/^FirebaseError:\s*/i, '') || 'The Overdrive service could not complete that action.';
}
function post(message) {
  if (gameFrame?.contentWindow) gameFrame.contentWindow.postMessage(message, location.origin);
}
async function waitForApp() {
  for (let i = 0; i < 500; i++) {
    if (getApps().length) return getApp();
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Firebase did not initialize for Overdrive.');
}
async function call(name, data = {}) {
  if (!functions || !currentUser) throw new Error('Sign in again before changing an Overdrive loadout.');
  const result = await httpsCallable(functions, name)(data);
  return result.data;
}
async function loadState() {
  if (!currentUser) return null;
  if (!loading) {
    loading = call('getOverdriveStateV1').then((data) => {
      overdrive = data.overdrive;
      return overdrive;
    }).finally(() => { loading = null; });
  }
  return loading;
}
async function syncToGame() {
  try {
    const state = overdrive || await loadState();
    if (state) post({ type: 'ttd:overdrive-state', overdrive: state });
  } catch (err) {
    console.error('Could not load Overdrive state.', err);
    post({ type: 'ttd:overdrive-error', message: humanize(err) });
  }
}
async function saveLoadout(message) {
  if (!currentUser) {
    post({ type: 'ttd:overdrive-save-error', requestId: message.requestId, message: 'Sign in again before saving an Overdrive loadout.' });
    return;
  }
  try {
    const data = await call('saveOverdriveDeckV1', { index: message.index, slots: message.slots });
    overdrive = data.overdrive;
    post({ type: 'ttd:overdrive-save-result', requestId: message.requestId, index: message.index, overdrive });
  } catch (err) {
    console.error('Could not save Overdrive loadout.', err);
    post({ type: 'ttd:overdrive-save-error', requestId: message.requestId, message: humanize(err) });
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== gameFrame?.contentWindow) return;
  const message = event.data || {};
  if (message.type === 'ttd:overdrive-ready') { syncToGame(); return; }
  if (message.type === 'ttd:overdrive-save-request') { saveLoadout(message); }
});

async function start() {
  const app = await waitForApp();
  auth = getAuth(app);
  functions = getFunctions(app, REGION);
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    overdrive = null;
    loading = null;
    if (!user) return;
    await syncToGame();
  });
}

start().catch((err) => console.error('Overdrive client could not start.', err));
