const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { randomInt, randomUUID } = require('node:crypto');

initializeApp();
const db = getFirestore();

const REGION = 'us-central1';
const ACCOUNT_GENERATION = 1;
const PROFILE_SCHEMA_VERSION = 4;
const GAME_STATE_SCHEMA_VERSION = 1;
const STARTING_PIPS = 600;
const STARTING_ASTRAS = 0;

const GACHA_COSTS = Object.freeze({ 1: 120, 10: 1000 });
const RARITY_ORDER = Object.freeze(['common', 'rare', 'unique', 'legendary']);
const RARITY_THRESHOLDS = Object.freeze([
  ['common', 5500],
  ['rare', 8200],
  ['unique', 9500],
  ['legendary', 10000],
]);

// Exact v33 gacha pools. Brute Force Blizzard is intentionally absent because
// v33 marks it chestExclusive and keysByRarity() excludes chest-exclusive dice.
const GACHA_POOLS = Object.freeze({
  common: Object.freeze(['fire', 'ice', 'wind', 'poison', 'broken']),
  rare: Object.freeze(['electric', 'iron', 'arrow', 'light', 'crack', 'magnet', 'shuriken']),
  unique: Object.freeze([
    'laser', 'teleport', 'mine', 'mimic', 'absorb', 'goldrush',
    'blackwind', 'bubble', 'haunt', 'bubblebeam', 'devilshadow',
  ]),
  legendary: Object.freeze([
    'growth', 'joker', 'gun', 'blizzard', 'nuclear', 'luckylucky',
    'heavensfist', 'asclepius', 'comet', 'hitman', 'crossinggate',
  ]),
});

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

function pickRarity() {
  const roll = randomInt(10000);
  for (const [rarity, ceiling] of RARITY_THRESHOLDS) {
    if (roll < ceiling) return rarity;
  }
  return 'common';
}

function newServerDieInstance() {
  return {
    id: `d${randomUUID().replaceAll('-', '')}`,
    cls: 1,
    enchants: [null, null, null, null],
  };
}

function buildGachaResults(count) {
  const results = [];
  let hasUniquePlus = false;

  for (let i = 0; i < count; i++) {
    let rarity = pickRarity();

    // Preserve v33 exactly: on a ten-pull, if the first nine contained no
    // Unique/Legendary, the tenth rarity is promoted to Unique only when its
    // normal roll landed below Unique. A naturally rolled Legendary stays so.
    if (count === 10 && i === 9 && !hasUniquePlus) {
      if (RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf('unique')) {
        rarity = 'unique';
      }
    }

    const pool = GACHA_POOLS[rarity];
    const key = pool[randomInt(pool.length)];
    const instance = newServerDieInstance();

    if (rarity === 'unique' || rarity === 'legendary') hasUniquePlus = true;
    results.push({ key, rarity, instance });
  }

  return results;
}

function publicGrant(data) {
  const id = data?.id;
  const key = data?.key;
  const cls = data?.cls;
  const enchants = data?.enchants;
  if (
    typeof id !== 'string' || !id ||
    typeof key !== 'string' || !GACHA_POOLS[data?.rarity]?.includes(key) ||
    !Number.isSafeInteger(cls) || cls < 1 || cls > 10 ||
    !Array.isArray(enchants) || enchants.length !== 4
  ) {
    throw new HttpsError('internal', 'A stored gacha grant is invalid.');
  }
  return {
    key,
    rarity: data.rarity,
    instance: { id, cls, enchants: [...enchants] },
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
        progressionStatus: 'server-gacha',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(userRef, {
        schemaVersion: PROFILE_SCHEMA_VERSION,
        ...authFields(auth),
        progressionStatus: 'server-gacha',
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
    features: { serverEconomy: true, serverGacha: true },
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
    progressionStatus: 'server-gacha',
    gameState: result.gameState,
  };
});

exports.getGameState = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const result = await ensureOnlineAccount(auth);
  return {
    ok: true,
    uid: auth.uid,
    progressionStatus: 'server-gacha',
    gameState: result.gameState,
  };
});

exports.getGachaGrants = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  await ensureOnlineAccount(auth);

  const snap = await db.collection(`users/${auth.uid}/dice`)
    .where('source', '==', 'gacha')
    .get();

  const grants = snap.docs.map((doc) => publicGrant(doc.data()));
  return {
    ok: true,
    uid: auth.uid,
    grants,
  };
});

exports.gachaPull = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const count = Number(request.data?.count);
  if (count !== 1 && count !== 10) {
    throw new HttpsError('invalid-argument', 'Gacha count must be exactly 1 or 10.');
  }

  await ensureOnlineAccount(auth);

  const cost = GACHA_COSTS[count];
  const results = buildGachaResults(count);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  let nextState = null;

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const current = publicGameState(gameSnap.data());

    if (current.economy.pips < cost) {
      throw new HttpsError('failed-precondition', `Not enough Pips. This pull costs ${cost}.`);
    }

    nextState = {
      schemaVersion: current.schemaVersion,
      accountGeneration: current.accountGeneration,
      revision: current.revision + 1,
      economy: {
        pips: current.economy.pips - cost,
        astras: current.economy.astras,
      },
    };

    tx.update(gameRef, {
      economy: nextState.economy,
      revision: nextState.revision,
      updatedAt: FieldValue.serverTimestamp(),
    });

    for (const result of results) {
      const dieRef = db.doc(`users/${auth.uid}/dice/${result.instance.id}`);
      tx.set(dieRef, {
        id: result.instance.id,
        key: result.key,
        rarity: result.rarity,
        cls: result.instance.cls,
        enchants: result.instance.enchants,
        source: 'gacha',
        receiptId: receiptRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(receiptRef, {
      operation: 'gacha',
      count,
      costPips: cost,
      balanceBefore: current.economy.pips,
      balanceAfter: nextState.economy.pips,
      stateRevisionBefore: current.revision,
      stateRevisionAfter: nextState.revision,
      results: results.map((result) => ({
        key: result.key,
        rarity: result.rarity,
        instanceId: result.instance.id,
      })),
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    ok: true,
    receiptId: receiptRef.id,
    count,
    costPips: cost,
    gameState: nextState,
    results,
  };
});
