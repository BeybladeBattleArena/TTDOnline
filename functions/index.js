const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const REGION = 'us-central1';
const ACCOUNT_GENERATION = 1;
const PROFILE_SCHEMA_VERSION = 3;
const GAME_STATE_SCHEMA_VERSION = 1;
const STARTING_PIPS = 600;
const STARTING_ASTRAS = 0;

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

function starterGameState() {
  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    accountGeneration: ACCOUNT_GENERATION,
    economy: {
      pips: STARTING_PIPS,
      astras: STARTING_ASTRAS,
    },
    revision: 1,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function publicGameState(data) {
  if (!data || typeof data !== 'object') {
    throw new HttpsError('internal', 'The online game state is unavailable.');
  }
  const pips = data.economy?.pips;
  const astras = data.economy?.astras;
  if (!Number.isSafeInteger(pips) || pips < 0 || !Number.isSafeInteger(astras) || astras < 0) {
    throw new HttpsError('internal', 'The online economy state is invalid.');
  }
  return {
    schemaVersion: Number(data.schemaVersion || GAME_STATE_SCHEMA_VERSION),
    accountGeneration: Number(data.accountGeneration || ACCOUNT_GENERATION),
    revision: Number(data.revision || 1),
    economy: { pips, astras },
  };
}

async function ensureOnlineAccount(auth) {
  const userRef = db.doc(`users/${auth.uid}`);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const legacyRef = db.doc(`users/${auth.uid}/legacy/profile`);
  let freshBootstrap = false;
  let seededGameState = false;

  await db.runTransaction(async (tx) => {
    // Firestore transactions require reads before writes. Keeping account metadata
    // and the starter economy in one transaction prevents half-created accounts.
    const userSnap = await tx.get(userRef);
    const gameSnap = await tx.get(gameRef);
    const current = userSnap.exists ? userSnap.data() : null;

    freshBootstrap = !current || current.accountGeneration !== ACCOUNT_GENERATION;
    seededGameState = freshBootstrap || !gameSnap.exists || gameSnap.data()?.accountGeneration !== ACCOUNT_GENERATION;

    if (freshBootstrap) {
      tx.set(userRef, {
        schemaVersion: PROFILE_SCHEMA_VERSION,
        accountGeneration: ACCOUNT_GENERATION,
        ...authFields(auth),
        accountMode: 'fresh-online',
        progressionStatus: 'server-economy',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(userRef, {
        schemaVersion: PROFILE_SCHEMA_VERSION,
        ...authFields(auth),
        progressionStatus: 'server-economy',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    if (seededGameState) {
      tx.set(gameRef, starterGameState());
    }
  });

  if (freshBootstrap) {
    // Cleanup from the short-lived pre-release migration experiment. This sits
    // outside the transaction because it is unrelated to account correctness.
    await legacyRef.delete().catch((err) => {
      console.warn('Could not remove obsolete legacy snapshot', {
        uid: auth.uid,
        code: err?.code,
        message: err?.message,
      });
    });
  }

  const gameSnap = await gameRef.get();
  return {
    freshBootstrap,
    seededGameState,
    gameState: publicGameState(gameSnap.data()),
  };
}

exports.health = onCall({ region: REGION }, (request) => {
  const auth = requireAuth(request);
  return {
    ok: true,
    uid: auth.uid,
    service: 'ttd-online',
    schemaVersion: PROFILE_SCHEMA_VERSION,
    gameStateSchemaVersion: GAME_STATE_SCHEMA_VERSION,
    accountGeneration: ACCOUNT_GENERATION,
  };
});

exports.ensureProfile = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const result = await ensureOnlineAccount(auth);
  return {
    ok: true,
    uid: auth.uid,
    schemaVersion: PROFILE_SCHEMA_VERSION,
    accountGeneration: ACCOUNT_GENERATION,
    freshBootstrap: result.freshBootstrap,
    seededGameState: result.seededGameState,
    progressionStatus: 'server-economy',
    gameState: result.gameState,
  };
});

exports.getGameState = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const result = await ensureOnlineAccount(auth);
  return {
    ok: true,
    uid: auth.uid,
    progressionStatus: 'server-economy',
    gameState: result.gameState,
  };
});
