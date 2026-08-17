const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const REGION = 'us-central1';
const ACCOUNT_GENERATION = 1;
const PROFILE_SCHEMA_VERSION = 2;

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  return request.auth;
}

function authFields(auth) {
  return {
    uid: auth.uid,
    email: auth.token.email || null,
    displayName: auth.token.name || null,
    photoURL: auth.token.picture || null,
    providers: Object.keys(auth.token.firebase?.identities || {}),
  };
}

exports.health = onCall({ region: REGION }, (request) => {
  const auth = requireAuth(request);
  return {
    ok: true,
    uid: auth.uid,
    service: 'ttd-online',
    schemaVersion: PROFILE_SCHEMA_VERSION,
    accountGeneration: ACCOUNT_GENERATION,
  };
});

exports.ensureProfile = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const ref = db.doc(`users/${auth.uid}`);
  const legacyRef = db.doc(`users/${auth.uid}/legacy/profile`);
  const snap = await ref.get();
  const current = snap.exists ? snap.data() : null;
  const needsFreshBootstrap = !current || current.accountGeneration !== ACCOUNT_GENERATION;

  if (needsFreshBootstrap) {
    // There are no production players yet, so online accounts intentionally
    // start clean instead of carrying the old v33 migration baseline forward.
    await ref.set({
      schemaVersion: PROFILE_SCHEMA_VERSION,
      accountGeneration: ACCOUNT_GENERATION,
      ...authFields(auth),
      accountMode: 'fresh-online',
      progressionStatus: 'local-bridge',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Remove the now-obsolete test migration snapshot when upgrading an
    // account that participated in the v33 import experiment.
    await legacyRef.delete().catch((err) => {
      console.warn('Could not remove obsolete legacy snapshot', {
        uid: auth.uid,
        code: err?.code,
        message: err?.message,
      });
    });
  } else {
    await ref.set({
      ...authFields(auth),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  return {
    ok: true,
    uid: auth.uid,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    accountGeneration: ACCOUNT_GENERATION,
    freshBootstrap: needsFreshBootstrap,
    progressionStatus: 'local-bridge',
  };
});
