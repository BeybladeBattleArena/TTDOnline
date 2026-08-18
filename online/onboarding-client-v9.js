import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged, reload } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const REGION = 'us-central1';
const NAMING_FEATURE_LAUNCH_MS = Date.parse('2026-08-18T02:10:00Z');
const el = (id) => document.getElementById(id);
let auth = null;
let functions = null;
let activeUid = null;
let modal = null;

async function waitForApp() {
  for (let i=0;i<500;i++) {
    if (getApps().length) return getApp();
    await new Promise((resolve)=>setTimeout(resolve,20));
  }
  throw new Error('Firebase did not initialize.');
}

function shouldCheckOnboarding(user) {
  const created = Date.parse(user?.metadata?.creationTime || '');
  const signedIn = Date.parse(user?.metadata?.lastSignInTime || '');
  if (!Number.isFinite(created)) return false;
  const justCreated = Number.isFinite(signedIn) && Math.abs(signedIn-created) <= 5000;
  // Accounts created after this feature launched remain eligible for the prompt until the
  // server records completion, even if the browser closed during their first session.
  return justCreated || created >= NAMING_FEATURE_LAUNCH_MS;
}

function cacheKey(uid) { return `ttd_name_onboarded_v9_${uid}`; }
function isCached(uid) {
  try { return localStorage.getItem(cacheKey(uid)) === '1'; } catch (_) { return false; }
}
function markCached(uid) {
  try { localStorage.setItem(cacheKey(uid),'1'); } catch (_) {}
}
function humanize(err) {
  return err?.message?.replace(/^FirebaseError:\s*/i,'') || 'Could not save that account name.';
}

function destroyModal() {
  if (modal) modal.remove();
  modal = null;
}

function showNamePrompt(user, suggested='') {
  if (modal || !user || user.uid !== activeUid) return;
  modal = document.createElement('div');
  modal.className = 'modalShade';
  modal.id = 'nameSetupModal';
  modal.innerHTML = `
    <div class="modalCard" role="dialog" aria-modal="true" aria-labelledby="nameSetupTitle">
      <h2 id="nameSetupTitle">Name Your Account</h2>
      <p>Choose the player name other Die Masters will see.</p>
      <input id="nameSetupInput" type="text" maxlength="24" autocomplete="nickname" autocapitalize="words" placeholder="Account name">
      <div id="nameSetupStatus" class="giftStatus" aria-live="polite"></div>
      <div class="row" style="margin-top:10px">
        <button id="nameSetupSave" class="primary" type="button">Save Name</button>
        <button id="nameSetupSkip" type="button">Skip</button>
      </div>
      <p class="micro" style="margin-top:9px">If you skip, a name like <strong>DieMaster11089</strong> will be assigned automatically.</p>
    </div>`;
  document.body.appendChild(modal);

  const input = el('nameSetupInput');
  const save = el('nameSetupSave');
  const skip = el('nameSetupSkip');
  const status = el('nameSetupStatus');
  if (suggested && suggested !== 'Die Master') input.value = suggested;
  requestAnimationFrame(()=>input?.focus({preventScroll:true}));

  const finish = async (useGeneric) => {
    if (!functions || !auth?.currentUser || auth.currentUser.uid !== activeUid) return;
    const value = input?.value.trim() || '';
    if (!useGeneric && value.length < 2) {
      status.textContent = 'Use at least 2 characters, or choose Skip.';
      return;
    }
    save.disabled = true;
    skip.disabled = true;
    input.disabled = true;
    status.textContent = useGeneric ? 'Creating a player name…' : 'Saving your player name…';
    try {
      const result = await httpsCallable(functions,'setInitialPlayerName')({
        displayName:value,
        useGeneric,
      });
      const name = result.data?.displayName;
      if (!name) throw new Error('The server did not return an account name.');
      const label = el('accountLabel');
      if (label) label.textContent = name;
      markCached(activeUid);
      try { await reload(auth.currentUser); } catch (_) {}
      destroyModal();
    } catch (err) {
      status.textContent = humanize(err);
      save.disabled = false;
      skip.disabled = false;
      input.disabled = false;
    }
  };

  save?.addEventListener('click',()=>finish(false));
  skip?.addEventListener('click',()=>finish(true));
  input?.addEventListener('keydown',(event)=>{ if(event.key==='Enter'){event.preventDefault();finish(false);} });
}

async function maybeOnboard(user) {
  if (!user || user.uid !== activeUid || isCached(user.uid) || !shouldCheckOnboarding(user)) return;
  try {
    const result = await httpsCallable(functions,'getPlayerNameSetupState')({});
    if (!user || user.uid !== activeUid) return;
    const state = result.data || {};
    if (state.complete) {
      markCached(user.uid);
      if (state.displayName && el('accountLabel')) el('accountLabel').textContent = state.displayName;
      return;
    }
    showNamePrompt(user,state.displayName || user.displayName || '');
  } catch (err) {
    // Naming must never prevent the game itself from starting. A later sign-in can retry.
    console.error('Could not check player-name onboarding state.',err);
  }
}

async function start() {
  const app = await waitForApp();
  auth = getAuth(app);
  functions = getFunctions(app,REGION);
  onAuthStateChanged(auth,(user)=>{
    activeUid = user?.uid || null;
    if (!user) { destroyModal(); return; }
    maybeOnboard(user);
  });
}

start().catch((err)=>console.error('Player-name onboarding could not start.',err));