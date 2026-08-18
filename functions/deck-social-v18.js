const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('node:crypto');

const db = getFirestore();
const REGION = 'us-central1';
const MIN_DECKS = 3;
const MAX_DECKS = 5;
const LEVEL_CAP = 100;
const MAX_MESSAGE_LENGTH = 280;
const CUSTOM_DECK_NAME = /^[A-Za-z0-9]{1,12}$/;

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}
function cleanString(value, max = 128) {
  return String(value == null ? '' : value).trim().slice(0, max);
}
function deckCount(data = {}) {
  const n = Number(data.deckCount || MIN_DECKS);
  return Number.isSafeInteger(n) ? Math.max(MIN_DECKS, Math.min(MAX_DECKS, n)) : MIN_DECKS;
}
function activeDeckIndex(data = {}, count = MIN_DECKS) {
  const candidate = Number.isSafeInteger(data.v6ActiveDeckIdx) ? data.v6ActiveDeckIdx : data.activeDeckIdx;
  return Number.isSafeInteger(candidate) && candidate >= 0 && candidate < count ? candidate : 0;
}
function defaultDeckName(index) { return `Deck ${index + 1}`; }
function storedDeckName(value, index) {
  return typeof value === 'string' && CUSTOM_DECK_NAME.test(value) ? value : defaultDeckName(index);
}
function requestedDeckName(value, index) {
  if (value == null || value === '') return defaultDeckName(index);
  const name = cleanString(value, 12);
  if (!CUSTOM_DECK_NAME.test(name)) {
    throw new HttpsError('invalid-argument', 'Deck names must use 1 to 12 letters or numbers only.');
  }
  return name;
}
function normalizeSlots(value) {
  if (!Array.isArray(value) || value.length !== 5) {
    throw new HttpsError('invalid-argument', 'A saved or equipped deck must contain exactly five dice.');
  }
  const seenKeys = new Set();
  const seenIds = new Set();
  return value.map((slot) => {
    if (!slot || typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string' || !slot.key || !slot.instId) {
      throw new HttpsError('failed-precondition', 'A full deck of five dice is required.');
    }
    if (seenKeys.has(slot.key)) throw new HttpsError('failed-precondition', 'A deck cannot contain the same die type twice.');
    if (seenIds.has(slot.instId)) throw new HttpsError('failed-precondition', 'A deck cannot use the same die instance twice.');
    seenKeys.add(slot.key); seenIds.add(slot.instId);
    return { key: slot.key, instId: slot.instId };
  });
}
function publicSlots(value) {
  const slots = Array.isArray(value) ? value.slice(0, 5) : [];
  while (slots.length < 5) slots.push(null);
  return slots.map((slot) => slot && typeof slot === 'object' && typeof slot.key === 'string' && typeof slot.instId === 'string'
    ? { key: slot.key, instId: slot.instId } : null);
}
function xpThresholdForLevel(level) {
  if (level <= 1) return 0;
  const step = level - 1;
  return step * step * 100;
}
function levelFromXp(xp) {
  const safeXp = Number.isSafeInteger(xp) && xp >= 0 ? xp : 0;
  let level = 1;
  while (level < LEVEL_CAP && safeXp >= xpThresholdForLevel(level + 1)) level += 1;
  return level;
}
function publicLevel(data = {}) {
  const xp = Number.isSafeInteger(data.xp) && data.xp >= 0 ? data.xp : 0;
  const level = levelFromXp(xp);
  return {
    level,
    xp,
    nextLevelXp: level < LEVEL_CAP ? xpThresholdForLevel(level + 1) : null,
    maxLevel: LEVEL_CAP,
  };
}
async function ensureLevel(uid) {
  const ref = db.doc(`users/${uid}/game/accountLevel`);
  const snap = await ref.get();
  if (snap.exists) return publicLevel(snap.data());
  const state = { schemaVersion: 1, xp: 0, level: 1, updatedAt: FieldValue.serverTimestamp() };
  await ref.set(state);
  return publicLevel(state);
}
async function validateOwnedSlots(tx, uid, slots) {
  const reads = slots.map((slot) => tx.get(db.doc(`users/${uid}/dice/${slot.instId}`)));
  const snaps = await Promise.all(reads);
  snaps.forEach((snap, i) => {
    if (!snap.exists || snap.data()?.key !== slots[i].key) {
      throw new HttpsError('failed-precondition', 'Every die in the deck must be owned by this account.');
    }
  });
}
async function readDeckManager(uid) {
  const gameRef = db.doc(`users/${uid}/game/state`);
  const [gameSnap, level] = await Promise.all([gameRef.get(), ensureLevel(uid)]);
  if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
  const game = gameSnap.data();
  const count = deckCount(game);
  const refs = Array.from({ length: count }, (_, index) => db.doc(`users/${uid}/decks/deck-${index}`));
  const snaps = await Promise.all(refs.map((ref) => ref.get()));
  const decks = snaps.map((snap, index) => {
    const data = snap.exists ? snap.data() : {};
    return { index, name: storedDeckName(data.name, index), slots: publicSlots(data.slots) };
  });
  return {
    schemaVersion: 1,
    activeDeckIdx: activeDeckIndex(game, count),
    deckCount: count,
    decks,
    level,
    levelCurve: { minLevel: 1, maxLevel: LEVEL_CAP, formula: '100 * (level - 1)^2' },
  };
}
async function acceptedFriend(uid, friendUid) {
  if (!friendUid || friendUid === uid) return false;
  const snap = await db.doc(`users/${uid}/friends/${friendUid}`).get();
  return snap.exists && snap.data()?.status === 'accepted';
}
async function readSharedDie(uid, socialData = null) {
  const social = socialData || (await db.doc(`users/${uid}/game/social`).get()).data() || {};
  const id = social.sharedDieId;
  if (!id) return null;
  const snap = await db.doc(`users/${uid}/dice/${id}`).get();
  if (!snap.exists) return null;
  const data = snap.data();
  return {
    key: data.key,
    rarity: data.rarity || null,
    instance: {
      id: snap.id,
      cls: Number.isSafeInteger(data.cls) ? data.cls : 1,
      enchants: Array.isArray(data.enchants) ? data.enchants.slice(0, 4) : [null, null, null, null],
    },
  };
}
function threadId(a, b) {
  return crypto.createHash('sha256').update([a, b].sort().join('|')).digest('hex').slice(0, 40);
}

exports.getDeckManagerState = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  return { ok: true, manager: await readDeckManager(auth.uid) };
});

exports.saveDeckV18 = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const index = Number(request.data?.index);
  const slots = normalizeSlots(request.data?.slots);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const deckRef = db.doc(`users/${auth.uid}/decks/deck-${index}`);
  await db.runTransaction(async (tx) => {
    const [gameSnap, deckSnap] = await Promise.all([tx.get(gameRef), tx.get(deckRef)]);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
    const count = deckCount(gameSnap.data());
    if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw new HttpsError('invalid-argument', 'That deck slot is unavailable.');
    await validateOwnedSlots(tx, auth.uid, slots);
    const name = requestedDeckName(request.data?.name ?? deckSnap.data()?.name, index);
    const revision = Number.isSafeInteger(gameSnap.data()?.revision) ? gameSnap.data().revision + 1 : 1;
    tx.set(deckRef, { schemaVersion: 2, index, name, slots, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(gameRef, { revision, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { ok: true, manager: await readDeckManager(auth.uid) };
});

exports.equipDeckV18 = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const index = Number(request.data?.index);
  const slots = normalizeSlots(request.data?.slots);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const deckRef = db.doc(`users/${auth.uid}/decks/deck-${index}`);
  await db.runTransaction(async (tx) => {
    const [gameSnap, deckSnap] = await Promise.all([tx.get(gameRef), tx.get(deckRef)]);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
    const game = gameSnap.data();
    const count = deckCount(game);
    if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw new HttpsError('invalid-argument', 'That deck slot is unavailable.');
    await validateOwnedSlots(tx, auth.uid, slots);
    const name = requestedDeckName(request.data?.name ?? deckSnap.data()?.name, index);
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    tx.set(deckRef, { schemaVersion: 2, index, name, slots, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const patch = { v6ActiveDeckIdx: index, revision, updatedAt: FieldValue.serverTimestamp() };
    if (index <= 2) patch.activeDeckIdx = index;
    tx.set(gameRef, patch, { merge: true });
  });
  return { ok: true, manager: await readDeckManager(auth.uid) };
});

exports.renameDeckV18 = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const index = Number(request.data?.index);
  const name = requestedDeckName(request.data?.name, index);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const gameSnap = await gameRef.get();
  if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
  const count = deckCount(gameSnap.data());
  if (!Number.isSafeInteger(index) || index < 0 || index >= count) throw new HttpsError('invalid-argument', 'That deck slot is unavailable.');
  await db.doc(`users/${auth.uid}/decks/deck-${index}`).set({ schemaVersion: 2, index, name, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true, manager: await readDeckManager(auth.uid) };
});

exports.getFriendsSummaryV18 = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const requested = Array.isArray(request.data?.uids) ? [...new Set(request.data.uids.map((v) => cleanString(v, 128)).filter(Boolean))].slice(0, 50) : [];
  const rows = [];
  for (const uid of requested) {
    if (!(await acceptedFriend(auth.uid, uid))) continue;
    const [profileSnap, socialSnap, gameSnap, level] = await Promise.all([
      db.doc(`publicProfiles/${uid}`).get(), db.doc(`users/${uid}/game/social`).get(), db.doc(`users/${uid}/game/state`).get(), ensureLevel(uid),
    ]);
    if (!profileSnap.exists || !gameSnap.exists) continue;
    const game = gameSnap.data();
    const count = deckCount(game);
    const active = activeDeckIndex(game, count);
    const deckSnap = await db.doc(`users/${uid}/decks/deck-${active}`).get();
    rows.push({
      uid,
      displayName: profileSnap.data()?.displayName || 'Die Master',
      level,
      sharedDie: await readSharedDie(uid, socialSnap.data() || {}),
      activeDeck: { index: active, name: storedDeckName(deckSnap.data()?.name, active) },
    });
  }
  return { ok: true, friends: rows };
});

exports.getFriendActiveDeckV18 = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const friendUid = cleanString(request.data?.uid, 128);
  if (!(await acceptedFriend(auth.uid, friendUid))) throw new HttpsError('permission-denied', 'Only friends can view this deck.');
  const [profileSnap, gameSnap, level] = await Promise.all([
    db.doc(`publicProfiles/${friendUid}`).get(), db.doc(`users/${friendUid}/game/state`).get(), ensureLevel(friendUid),
  ]);
  if (!gameSnap.exists) throw new HttpsError('not-found', 'Friend game state is unavailable.');
  const game = gameSnap.data();
  const count = deckCount(game);
  const index = activeDeckIndex(game, count);
  const deckSnap = await db.doc(`users/${friendUid}/decks/deck-${index}`).get();
  const slots = publicSlots(deckSnap.data()?.slots);
  const dice = [];
  for (const slot of slots) {
    if (!slot) { dice.push(null); continue; }
    const snap = await db.doc(`users/${friendUid}/dice/${slot.instId}`).get();
    if (!snap.exists) { dice.push(null); continue; }
    const d = snap.data();
    dice.push({ key: d.key, rarity: d.rarity || null, instance: { id: snap.id, cls: Number(d.cls || 1), enchants: Array.isArray(d.enchants) ? d.enchants.slice(0, 4) : [null, null, null, null] } });
  }
  return {
    ok: true,
    deck: {
      ownerUid: friendUid,
      ownerName: profileSnap.data()?.displayName || 'Friend',
      activeDeckIdx: index,
      name: storedDeckName(deckSnap.data()?.name, index),
      level,
      slots: dice,
    },
  };
});

exports.sendFriendMessageV18 = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const friendUid = cleanString(request.data?.uid, 128);
  const text = cleanString(request.data?.text, MAX_MESSAGE_LENGTH);
  if (!(await acceptedFriend(auth.uid, friendUid))) throw new HttpsError('permission-denied', 'Only friends can exchange messages.');
  if (!text) throw new HttpsError('invalid-argument', 'Message text is required.');
  const id = threadId(auth.uid, friendUid);
  const threadRef = db.doc(`friendThreads/${id}`);
  const messageRef = threadRef.collection('messages').doc();
  const batch = db.batch();
  batch.set(threadRef, { participants: [auth.uid, friendUid].sort(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(messageRef, { senderUid: auth.uid, recipientUid: friendUid, text, createdAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { ok: true, messageId: messageRef.id };
});

exports.getFriendConversationV18 = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const friendUid = cleanString(request.data?.uid, 128);
  if (!(await acceptedFriend(auth.uid, friendUid))) throw new HttpsError('permission-denied', 'Only friends can exchange messages.');
  const id = threadId(auth.uid, friendUid);
  const snap = await db.collection(`friendThreads/${id}/messages`).orderBy('createdAt', 'desc').limit(30).get();
  const messages = snap.docs.map((doc) => {
    const d = doc.data();
    return { id: doc.id, senderUid: d.senderUid, recipientUid: d.recipientUid, text: cleanString(d.text, MAX_MESSAGE_LENGTH), createdAtMs: d.createdAt?.toMillis?.() || 0 };
  }).reverse();
  return { ok: true, messages };
});
