const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db = getFirestore();
const REGION = 'us-central1';
const FAVORITES_SCHEMA_VERSION = 1;
const MAX_FAVORITES = 10;

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}

function normalizeFavoriteIds(value) {
  if (!Array.isArray(value)) return [];
  const ids = [];
  const seen = new Set();
  for (const id of value) {
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= MAX_FAVORITES) break;
  }
  return ids;
}

function publicFavoriteState(data) {
  return {
    schemaVersion: Number(data?.schemaVersion || FAVORITES_SCHEMA_VERSION),
    instanceIds: normalizeFavoriteIds(data?.instanceIds),
  };
}

function normalizeStoredDeck(data, index) {
  const slots = Array.isArray(data?.slots) ? data.slots.slice(0, 5) : [];
  while (slots.length < 5) slots.push(null);
  return {
    index,
    slots: slots.map((slot) => {
      if (!slot || typeof slot !== 'object') return null;
      if (typeof slot.key !== 'string' || typeof slot.instId !== 'string') return null;
      return { key: slot.key, instId: slot.instId };
    }),
  };
}

function cloneReturnedJewel(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpsError('internal', 'A stored socketed jewel is malformed.');
  }
  const copy = JSON.parse(JSON.stringify(value));
  if (
    copy.kind !== 'jewel' ||
    typeof copy.id !== 'string' || !copy.id ||
    typeof copy.jewelId !== 'string' || !copy.jewelId ||
    !Number.isSafeInteger(copy.tier) || copy.tier < 1 || copy.tier > 5
  ) {
    throw new HttpsError('internal', 'A stored socketed jewel is malformed.');
  }
  return copy;
}

function publicMergedDie(data) {
  if (!data || typeof data !== 'object') throw new HttpsError('internal', 'Merged die state is unavailable.');
  if (
    typeof data.id !== 'string' || !data.id ||
    typeof data.key !== 'string' || !data.key ||
    !Number.isSafeInteger(data.cls) || data.cls < 1 || data.cls > 10 ||
    !Array.isArray(data.enchants) || data.enchants.length !== 4
  ) {
    throw new HttpsError('internal', 'Merged die state is invalid.');
  }
  return {
    key: data.key,
    rarity: data.rarity || null,
    source: data.source || null,
    instance: {
      id: data.id,
      cls: data.cls,
      enchants: [...data.enchants],
    },
  };
}

exports.getFavoriteState = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const ref = db.doc(`users/${auth.uid}/game/favorites`);
  const snap = await ref.get();
  if (!snap.exists) {
    const state = { schemaVersion: FAVORITES_SCHEMA_VERSION, instanceIds: [] };
    await ref.set({ ...state, updatedAt: FieldValue.serverTimestamp() });
    return { ok: true, favorites: state };
  }
  return { ok: true, favorites: publicFavoriteState(snap.data()) };
});

exports.toggleFavorite = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const instanceId = String(request.data?.instanceId || '');
  const favorite = request.data?.favorite;
  if (!instanceId || typeof favorite !== 'boolean') {
    throw new HttpsError('invalid-argument', 'A die instance and desired favorite state are required.');
  }

  const dieRef = db.doc(`users/${auth.uid}/dice/${instanceId}`);
  const favoriteRef = db.doc(`users/${auth.uid}/game/favorites`);
  let nextIds = [];

  await db.runTransaction(async (tx) => {
    const [dieSnap, favoriteSnap] = await Promise.all([tx.get(dieRef), tx.get(favoriteRef)]);
    if (!dieSnap.exists) {
      throw new HttpsError('failed-precondition', 'That die instance is not owned by this account.');
    }

    nextIds = normalizeFavoriteIds(favoriteSnap.exists ? favoriteSnap.data()?.instanceIds : []);
    const has = nextIds.includes(instanceId);
    if (favorite && !has) {
      if (nextIds.length >= MAX_FAVORITES) {
        throw new HttpsError('failed-precondition', 'You can favorite up to 10 dice.');
      }
      nextIds.push(instanceId);
    } else if (!favorite && has) {
      nextIds = nextIds.filter((id) => id !== instanceId);
    }

    tx.set(favoriteRef, {
      schemaVersion: FAVORITES_SCHEMA_VERSION,
      instanceIds: nextIds,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    ok: true,
    favorites: { schemaVersion: FAVORITES_SCHEMA_VERSION, instanceIds: nextIds },
  };
});

exports.mergeDice = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const key = String(request.data?.key || '');
  const sourceId = String(request.data?.sourceId || '');
  const targetId = String(request.data?.targetId || '');
  if (!key || !sourceId || !targetId || sourceId === targetId) {
    throw new HttpsError('invalid-argument', 'A valid die key and two distinct instance IDs are required.');
  }

  const sourceRef = db.doc(`users/${auth.uid}/dice/${sourceId}`);
  const targetRef = db.doc(`users/${auth.uid}/dice/${targetId}`);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const favoriteRef = db.doc(`users/${auth.uid}/game/favorites`);
  const deckRefs = [0, 1, 2].map((index) => db.doc(`users/${auth.uid}/decks/deck-${index}`));
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();

  let response = null;

  await db.runTransaction(async (tx) => {
    const [sourceSnap, targetSnap, gameSnap, favoriteSnap, ...deckSnaps] = await Promise.all([
      tx.get(sourceRef),
      tx.get(targetRef),
      tx.get(gameRef),
      tx.get(favoriteRef),
      ...deckRefs.map((ref) => tx.get(ref)),
    ]);

    if (!sourceSnap.exists || !targetSnap.exists) {
      throw new HttpsError('failed-precondition', 'Both merge copies must be owned by this account.');
    }
    if (!gameSnap.exists) {
      throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
    }

    const source = sourceSnap.data();
    const target = targetSnap.data();
    if (source.key !== key || target.key !== key) {
      throw new HttpsError('failed-precondition', 'Both merge copies must be the same die type.');
    }
    if (!Number.isSafeInteger(source.cls) || !Number.isSafeInteger(target.cls) || source.cls !== target.cls) {
      throw new HttpsError('failed-precondition', 'Class merges require two copies of the same Class.');
    }
    if (target.cls >= 10) {
      throw new HttpsError('failed-precondition', 'Class 10 is already the maximum Class.');
    }
    if (!Array.isArray(source.enchants) || source.enchants.length !== 4 ||
        !Array.isArray(target.enchants) || target.enchants.length !== 4) {
      throw new HttpsError('internal', 'A merge copy has invalid enchant slots.');
    }

    const returnedJewels = [...source.enchants, ...target.enchants]
      .filter(Boolean)
      .map(cloneReturnedJewel);
    const jewelIds = new Set();
    for (const jewel of returnedJewels) {
      if (jewelIds.has(jewel.id)) {
        throw new HttpsError('internal', 'The same jewel instance is socketed more than once.');
      }
      jewelIds.add(jewel.id);
    }

    const decks = deckSnaps.map((snap, index) => normalizeStoredDeck(snap.exists ? snap.data() : null, index));
    for (const deck of decks) {
      deck.slots = deck.slots.map((slot) => {
        if (!slot || slot.key !== key) return slot;
        if (slot.instId === sourceId || slot.instId === targetId) {
          return { key, instId: targetId };
        }
        return slot;
      });
    }

    let favoriteIds = normalizeFavoriteIds(favoriteSnap.exists ? favoriteSnap.data()?.instanceIds : []);
    const keepFavorite = favoriteIds.includes(sourceId) || favoriteIds.includes(targetId);
    favoriteIds = favoriteIds.filter((id) => id !== sourceId && id !== targetId);
    if (keepFavorite && !favoriteIds.includes(targetId)) favoriteIds.push(targetId);
    favoriteIds = favoriteIds.slice(0, MAX_FAVORITES);

    const game = gameSnap.data();
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    const oldClass = target.cls;
    const newClass = oldClass + 1;
    const mergedTarget = {
      ...target,
      id: targetId,
      cls: newClass,
      enchants: [null, null, null, null],
    };

    tx.delete(sourceRef);
    tx.update(targetRef, {
      cls: newClass,
      enchants: [null, null, null, null],
      updatedAt: FieldValue.serverTimestamp(),
    });

    for (const deck of decks) {
      tx.set(deckRefs[deck.index], {
        schemaVersion: Number(deckSnaps[deck.index].data()?.schemaVersion || 1),
        index: deck.index,
        slots: deck.slots,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.set(favoriteRef, {
      schemaVersion: FAVORITES_SCHEMA_VERSION,
      instanceIds: favoriteIds,
      updatedAt: FieldValue.serverTimestamp(),
    });

    for (const jewel of returnedJewels) {
      tx.set(db.doc(`users/${auth.uid}/jewels/${jewel.id}`), {
        ...jewel,
        socketedIn: null,
        returnedByMerge: receiptRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    tx.update(gameRef, {
      revision,
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(receiptRef, {
      operation: 'class_merge',
      key,
      sourceInstanceId: sourceId,
      targetInstanceId: targetId,
      classBefore: oldClass,
      classAfter: newClass,
      returnedJewelIds: returnedJewels.map((jewel) => jewel.id),
      stateRevisionBefore: Number(game.revision || 0),
      stateRevisionAfter: revision,
      createdAt: FieldValue.serverTimestamp(),
    });

    response = {
      receiptId: receiptRef.id,
      key,
      sourceId,
      targetId,
      oldClass,
      newClass,
      target: publicMergedDie(mergedTarget),
      decks,
      favorites: { schemaVersion: FAVORITES_SCHEMA_VERSION, instanceIds: favoriteIds },
      returnedJewels,
      gameRevision: revision,
    };
  });

  return { ok: true, ...response };
});
