const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { randomInt } = require('node:crypto');

const db = getFirestore();
const REGION = 'us-central1';

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}

function cleanDisplayName(value) {
  return String(value == null ? '' : value)
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24);
}

function genericDisplayName() {
  return `DieMaster${randomInt(10000, 100000)}`;
}

exports.getPlayerNameSetupState = onCall({ region: REGION, timeoutSeconds: 10 }, async (request) => {
  const auth = requireAuth(request);
  const [userSnap, socialSnap] = await Promise.all([
    db.doc(`users/${auth.uid}`).get(),
    db.doc(`users/${auth.uid}/game/social`).get(),
  ]);
  const user = userSnap.data() || {};
  const social = socialSnap.data() || {};
  return {
    ok:true,
    complete:user.nameSetupComplete === true || social.nameSetupComplete === true,
    displayName:cleanDisplayName(social.displayName || user.displayName || auth.token.name || ''),
  };
});

exports.setInitialPlayerName = onCall({ region: REGION, timeoutSeconds: 15 }, async (request) => {
  const auth = requireAuth(request);
  const useGeneric = request.data?.useGeneric === true;
  let displayName = useGeneric ? genericDisplayName() : cleanDisplayName(request.data?.displayName);

  if (!useGeneric && displayName.length < 2) {
    throw new HttpsError('invalid-argument', 'Account name must be at least 2 characters.');
  }
  if (!displayName) displayName = genericDisplayName();

  const socialRef = db.doc(`users/${auth.uid}/game/social`);
  const publicRef = db.doc(`publicProfiles/${auth.uid}`);
  const userRef = db.doc(`users/${auth.uid}`);
  const now = FieldValue.serverTimestamp();

  await Promise.all([
    socialRef.set({ displayName, nameSetupComplete:true, updatedAt:now }, { merge:true }),
    publicRef.set({ schemaVersion:1, uid:auth.uid, displayName, updatedAt:now }, { merge:true }),
    userRef.set({ displayName, nameSetupComplete:true, updatedAt:now }, { merge:true }),
    getAuth().updateUser(auth.uid, { displayName }),
  ]);

  return { ok:true, displayName, generated:useGeneric };
});

// Friends already has a display-name editor. Keep that existing path authoritative too, so a
// later rename is reflected in the compact account bar and Firebase Auth on the next session.
exports.syncPlayerDisplayName = onDocumentWritten({
  region:REGION,
  document:'users/{uid}/game/social',
  timeoutSeconds:15,
}, async (event) => {
  const beforeName = cleanDisplayName(event.data?.before?.data()?.displayName || '');
  const afterName = cleanDisplayName(event.data?.after?.data()?.displayName || '');
  if (!afterName || afterName === beforeName) return;
  const uid = event.params.uid;
  const now = FieldValue.serverTimestamp();
  await Promise.all([
    db.doc(`users/${uid}`).set({ displayName:afterName, nameSetupComplete:true, updatedAt:now }, { merge:true }),
    db.doc(`publicProfiles/${uid}`).set({ schemaVersion:1, uid, displayName:afterName, updatedAt:now }, { merge:true }),
    getAuth().updateUser(uid, { displayName:afterName }),
  ]);
});