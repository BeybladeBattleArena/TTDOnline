const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { createHash, randomInt, randomUUID } = require('node:crypto');

initializeApp();
const db = getFirestore();

const REGION = 'us-central1';
const ACCOUNT_GENERATION = 1;
const PROFILE_SCHEMA_VERSION = 5;
const GAME_STATE_SCHEMA_VERSION = 1;
const INVENTORY_VERSION = 1;
const DECKS_VERSION = 1;
const STARTING_PIPS = 600;
const STARTING_ASTRAS = 0;
const STARTER_KEYS = Object.freeze(['fire', 'ice', 'wind', 'poison', 'broken']);

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

const DICE_RARITY = Object.freeze(Object.fromEntries(
  Object.entries(GACHA_POOLS).flatMap(([rarity, keys]) => keys.map((key) => [key, rarity])),
));

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

function starterInstanceId(uid, key, copyIndex) {
  const digest = createHash('sha256')
    .update(`ttd-starter-v1:${uid}:${key}:${copyIndex}`)
    .digest('hex');
  return `d${digest.slice(0, 31)}`;
}

function starterGameState() {
  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    accountGeneration: ACCOUNT_GENERATION,
    inventoryVersion: INVENTORY_VERSION,
    decksVersion: DECKS_VERSION,
    activeDeckIdx: 0,
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
  const activeDeckIdx = Number(data.activeDeckIdx ?? 0);
  if (!Number.isSafeInteger(pips) || pips < 0 || !Number.isSafeInteger(astras) || astras < 0) {
    throw new HttpsError('internal', 'The online economy state is invalid.');
  }
  if (!Number.isSafeInteger(activeDeckIdx) || activeDeckIdx < 0 || activeDeckIdx > 2) {
    throw new HttpsError('internal', 'The online active deck index is invalid.');
  }
  return {
    schemaVersion: Number(data.schemaVersion || GAME_STATE_SCHEMA_VERSION),
    accountGeneration: Number(data.accountGeneration || ACCOUNT_GENERATION),
    inventoryVersion: Number(data.inventoryVersion || 0),
    decksVersion: Number(data.decksVersion || 0),
    activeDeckIdx,
    revision: Number(data.revision || 1),
    economy: { pips, astras },
  };
}

function starterDieDocument(uid, key, copyIndex) {
  const id = starterInstanceId(uid, key, copyIndex);
  return {
    id,
    key,
    rarity: 'common',
    cls: 1,
    enchants: [null, null, null, null],
    source: 'starter',
    starterCopyIndex: copyIndex,
  };
}

function starterDeckSlots(uid) {
  return STARTER_KEYS.map((key) => ({
    key,
    instId: starterInstanceId(uid, key, 0),
  }));
}

function emptyDeckSlots() {
  return [null, null, null, null, null];
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

function publicDie(data) {
  const id = data?.id;
  const key = data?.key;
  const rarity = data?.rarity;
  const cls = data?.cls;
  const enchants = data?.enchants;
  if (
    typeof id !== 'string' || !id ||
    typeof key !== 'string' || DICE_RARITY[key] !== rarity ||
    !Number.isSafeInteger(cls) || cls < 1 || cls > 10 ||
    !Array.isArray(enchants) || enchants.length !== 4
  ) {
    throw new HttpsError('internal', 'A stored die instance is invalid.');
  }
  return {
    key,
    rarity,
    source: data.source === 'starter' ? 'starter' : 'gacha',
    instance: { id, cls, enchants: [...enchants] },
  };
}

function publicDeck(data, fallbackIndex) {
  const index = Number(data?.index ?? fallbackIndex);
  const slots = data?.slots;
  if (!Number.isSafeInteger(index) || index < 0 || index > 2 || !Array.isArray(slots) || slots.length !== 5) {
    throw new HttpsError('internal', 'A stored deck is invalid.');
  }
  const safeSlots = slots.map((slot) => {
    if (slot == null) return null;
    if (typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string') {
      throw new HttpsError('internal', 'A stored deck slot is invalid.');
    }
    return { key: slot.key, instId: slot.instId };
  });
  return { index, slots: safeSlots };
}

async function ensureOnlineAccount(auth) {
  const userRef = db.doc(`users/${auth.uid}`);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const legacyRef = db.doc(`users/${auth.uid}/legacy/profile`);
  let freshBootstrap = false;
  let seededGameState = false;
  let seededInventory = false;
  let seededDecks = false;

  await db.runTransaction(async (tx) => {
    // Firestore transactions require reads before writes. Keeping account metadata,
    // starter economy, starter inventory and exact starter decks in one transaction
    // prevents any half-created online account state.
    const userSnap = await tx.get(userRef);
    const gameSnap = await tx.get(gameRef);
    const currentUser = userSnap.exists ? userSnap.data() : null;
    const currentGame = gameSnap.exists ? gameSnap.data() : null;

    freshBootstrap = !currentUser || currentUser.accountGeneration !== ACCOUNT_GENERATION;
    seededGameState = freshBootstrap || !gameSnap.exists || currentGame?.accountGeneration !== ACCOUNT_GENERATION;
    seededInventory = seededGameState || Number(currentGame?.inventoryVersion || 0) < INVENTORY_VERSION;
    seededDecks = seededGameState || Number(currentGame?.decksVersion || 0) < DECKS_VERSION;

    if (freshBootstrap) {
      tx.set(userRef, {
        schemaVersion: PROFILE_SCHEMA_VERSION,
        accountGeneration: ACCOUNT_GENERATION,
        ...authFields(auth),
        accountMode: 'fresh-online',
        progressionStatus: 'server-inventory-decks',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      tx.set(userRef, {
        schemaVersion: PROFILE_SCHEMA_VERSION,
        ...authFields(auth),
        progressionStatus: 'server-inventory-decks',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    if (seededGameState) {
      tx.set(gameRef, starterGameState());
    } else {
      const gamePatch = { updatedAt: FieldValue.serverTimestamp() };
      if (seededInventory) gamePatch.inventoryVersion = INVENTORY_VERSION;
      if (seededDecks) {
        gamePatch.decksVersion = DECKS_VERSION;
        if (!Number.isSafeInteger(currentGame?.activeDeckIdx)) gamePatch.activeDeckIdx = 0;
      }
      tx.set(gameRef, gamePatch, { merge: true });
    }

    if (seededInventory) {
      for (const key of STARTER_KEYS) {
        for (let copyIndex = 0; copyIndex < 3; copyIndex++) {
          const die = starterDieDocument(auth.uid, key, copyIndex);
          tx.set(db.doc(`users/${auth.uid}/dice/${die.id}`), {
            ...die,
            createdAt: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }
    }

    if (seededDecks) {
      const deckSlots = [starterDeckSlots(auth.uid), emptyDeckSlots(), emptyDeckSlots()];
      for (let index = 0; index < 3; index++) {
        tx.set(db.doc(`users/${auth.uid}/decks/deck-${index}`), {
          schemaVersion: DECKS_VERSION,
          index,
          slots: deckSlots[index],
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
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
    seededInventory,
    seededDecks,
    gameState: publicGameState(gameSnap.data()),
  };
}

async function readInventoryAndDecks(uid) {
  const [diceSnap, decksSnap] = await Promise.all([
    db.collection(`users/${uid}/dice`).get(),
    db.collection(`users/${uid}/decks`).get(),
  ]);

  const dice = diceSnap.docs.map((doc) => publicDie(doc.data()))
    .sort((a, b) => a.instance.id.localeCompare(b.instance.id));

  const byIndex = new Map(decksSnap.docs.map((doc) => {
    const deck = publicDeck(doc.data(), Number(doc.id.replace('deck-', '')));
    return [deck.index, deck];
  }));
  const decks = [0, 1, 2].map((index) => byIndex.get(index) || { index, slots: emptyDeckSlots() });
  return { dice, decks };
}

function normalizeDeckStateInput(rawDecks, rawActiveDeckIdx) {
  const activeDeckIdx = Number(rawActiveDeckIdx);
  if (!Number.isSafeInteger(activeDeckIdx) || activeDeckIdx < 0 || activeDeckIdx > 2) {
    throw new HttpsError('invalid-argument', 'Active deck index must be 0, 1 or 2.');
  }
  if (!Array.isArray(rawDecks) || rawDecks.length !== 3) {
    throw new HttpsError('invalid-argument', 'Exactly three decks are required.');
  }

  const decks = rawDecks.map((rawDeck, deckIndex) => {
    if (!Array.isArray(rawDeck) || rawDeck.length !== 5) {
      throw new HttpsError('invalid-argument', `Deck ${deckIndex + 1} must have exactly five slots.`);
    }
    const seenKeys = new Set();
    const slots = rawDeck.map((slot) => {
      if (slot == null) return null;
      if (typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string' || !slot.instId) {
        throw new HttpsError('invalid-argument', 'A deck slot is malformed.');
      }
      if (!DICE_RARITY[slot.key]) {
        throw new HttpsError('invalid-argument', 'A deck references an unknown die.');
      }
      if (seenKeys.has(slot.key)) {
        throw new HttpsError('invalid-argument', 'A deck cannot contain the same die type twice.');
      }
      seenKeys.add(slot.key);
      return { key: slot.key, instId: slot.instId };
    });
    return { index: deckIndex, slots };
  });

  return { activeDeckIdx, decks };
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
    features: {
      serverEconomy: true,
      serverGacha: true,
      serverInventory: true,
      serverDecks: true,
    },
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
    seededInventory: result.seededInventory,
    seededDecks: result.seededDecks,
    progressionStatus: 'server-inventory-decks',
    gameState: result.gameState,
  };
});

exports.getGameState = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const result = await ensureOnlineAccount(auth);
  return {
    ok: true,
    uid: auth.uid,
    progressionStatus: 'server-inventory-decks',
    gameState: result.gameState,
  };
});

exports.getInventoryState = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const result = await ensureOnlineAccount(auth);
  const inventory = await readInventoryAndDecks(auth.uid);
  return {
    ok: true,
    uid: auth.uid,
    progressionStatus: 'server-inventory-decks',
    gameState: result.gameState,
    dice: inventory.dice,
    decks: inventory.decks,
  };
});

exports.getGachaGrants = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  await ensureOnlineAccount(auth);

  const snap = await db.collection(`users/${auth.uid}/dice`)
    .where('source', '==', 'gacha')
    .get();

  const grants = snap.docs.map((doc) => publicDie(doc.data()));
  return {
    ok: true,
    uid: auth.uid,
    grants,
  };
});

exports.setDeckState = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureOnlineAccount(auth);
  const normalized = normalizeDeckStateInput(request.data?.decks, request.data?.activeDeckIdx);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  let nextGameState = null;

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    const current = publicGameState(gameSnap.data());

    const referenced = new Map();
    for (const deck of normalized.decks) {
      for (const slot of deck.slots) {
        if (slot) referenced.set(slot.instId, slot.key);
      }
    }

    for (const [instId, expectedKey] of referenced) {
      const dieSnap = await tx.get(db.doc(`users/${auth.uid}/dice/${instId}`));
      if (!dieSnap.exists || dieSnap.data()?.key !== expectedKey) {
        throw new HttpsError('failed-precondition', 'A deck references a die instance this account does not own.');
      }
    }

    nextGameState = {
      ...current,
      activeDeckIdx: normalized.activeDeckIdx,
      revision: current.revision + 1,
    };

    for (const deck of normalized.decks) {
      tx.set(db.doc(`users/${auth.uid}/decks/deck-${deck.index}`), {
        schemaVersion: DECKS_VERSION,
        index: deck.index,
        slots: deck.slots,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.update(gameRef, {
      activeDeckIdx: normalized.activeDeckIdx,
      decksVersion: DECKS_VERSION,
      revision: nextGameState.revision,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    ok: true,
    gameState: nextGameState,
    decks: normalized.decks,
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
      ...current,
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
