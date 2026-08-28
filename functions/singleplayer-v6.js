const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const progressionV21 = require('./account-progression-core-v21');
const levelRewardsV21 = require('./account-progression-v21');
const catalog = require('./dicefile.generated.json');

const db = getFirestore();
const REGION = 'us-central1';
const MAX_DECKS = 5;
const MIN_DECKS = 3;
const MAX_FAVORITES = 10;
const ELEMENTS = ['fire','ice','wind','lightning','water','earth','metal','nature','poison','holy','shadow','arcane'];
const JEWEL_IDS = [
  'power','cooldown','physDef','specDef','hp','critChance','critBoost','spGen','experience','luck','insight','potency',
  ...ELEMENTS.map((element) => `elem_${element}`),
];
const JEWEL_ID_SET = new Set(JEWEL_IDS);
// Canonical dice authority for the full v6 account surface. This module is loaded
// after functions/index.js and therefore must not reintroduce an older hard-coded roster.
const LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' });
function canonicalDieKey(key) { return LEGACY_DIE_KEYS[key] || key; }
function canonicalDieDef(key) { return catalog.dice?.[canonicalDieKey(key)] || null; }
function buildCanonicalGachaPools() {
  const pools = { common:[], rare:[], unique:[], legendary:[] };
  for (const [key, die] of Object.entries(catalog.dice || {})) {
    if (!die || die.chestExclusive || !Array.isArray(pools[die.rarity])) continue;
    pools[die.rarity].push(key);
  }
  return Object.freeze(Object.fromEntries(Object.entries(pools).map(([rarity, keys]) => [rarity, Object.freeze(keys)])));
}
const GACHA_POOLS = buildCanonicalGachaPools();
const DICE_RARITY = Object.freeze(Object.fromEntries(
  Object.entries(catalog.dice || {}).map(([key, die]) => [key, die?.rarity || 'common']),
));

const SHOP = Object.freeze({
  key_normal: { kind:'key', difficultyKey:'normal', name:'Chest Key [Normal]', cost:200, sellValue:100 },
  key_hard:   { kind:'key', difficultyKey:'hard',   name:'Chest Key [Hard]',   cost:400, sellValue:200 },
  key_hell:   { kind:'key', difficultyKey:'hell',   name:'Chest Key [Hell]',   cost:600, sellValue:300 },
  card_lesser:{ kind:'card', cardId:'lesser', name:'Lesser Enchant Card', cost:150, sellValue:75 },
  card_master:{ kind:'card', cardId:'master', name:'Master Enchant Card', cost:500, sellValue:250 },
  deckslot_0: { kind:'deckslot', unlockCount:4, name:'Deck Slot +1', cost:4500, sellValue:0 },
  deckslot_1: { kind:'deckslot', unlockCount:5, name:'Deck Slot +1', cost:4500, sellValue:0 },
});

const ACHIEVEMENTS = Object.freeze({
  first_summon: { name:'First Summon', desc:'Perform your first Rune Summon.', rewardPips:150 },
  collector_25: { name:'Growing Collection', desc:'Own at least 25 die instances.', rewardPips:250 },
  class_student:{ name:'Class Student', desc:'Complete your first Class merge.', rewardPips:200 },
  class_master: { name:'Class Master', desc:'Complete 10 Class merges.', rewardPips:500 },
  treasure_hunter:{ name:'Treasure Hunter', desc:'Open 5 Frozen Island Chests.', rewardPips:300 },
  jewel_crafter:{ name:'Jewel Crafter', desc:'Successfully improve a jewel.', rewardPips:200 },
  typhoon_slayer:{ name:'Typhoon Slayer', desc:'Defeat Typhoon and clear Al Hata.', rewardPips:500 },
  social_link:{ name:'Social Link', desc:'Make your first friend.', rewardPips:100 },
});
const DAILY = Object.freeze({
  login: { name:'Check In', desc:'Sign in today.', rewardPips:100 },
  summon: { name:'Daily Summon', desc:'Perform a Rune Summon today.', rewardPips:50 },
  adventure: { name:'Daily Adventure', desc:'Finish an Adventure run today.', rewardPips:100 },
  chest: { name:'Daily Treasure', desc:'Open a Frozen Island Chest today.', rewardPips:75 },
});

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}
function clampInt(value, min, max, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new HttpsError('invalid-argument', `${label} is invalid.`);
  return n;
}
function cleanString(value, max = 80) { return String(value == null ? '' : value).trim().slice(0, max); }
function serverId(prefix) { return `${prefix}${crypto.randomBytes(12).toString('hex')}`; }
function randomInt(min, maxInclusive) { return crypto.randomInt(min, maxInclusive + 1); }
function randomFloat() { return crypto.randomInt(0, 0x1000000) / 0x1000000; }
function pick(list) { return list[randomInt(0, list.length - 1)]; }
function utcDayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
function friendCodeForUid(uid) {
  const hex = crypto.createHash('sha256').update(uid).digest('hex').slice(0, 12).toUpperCase();
  return `TTD-${hex.slice(0,4)}-${hex.slice(4,8)}-${hex.slice(8,12)}`;
}
function defaultDisplayName(auth) {
  const claimed = cleanString(auth?.token?.name || '', 24);
  return claimed || 'Die Master';
}
function gamePublic(data = {}) {
  return {
    schemaVersion: Number(data.schemaVersion || 1),
    revision: Number.isSafeInteger(data.revision) ? data.revision : 1,
    economy: {
      pips: Number.isSafeInteger(data?.economy?.pips) ? data.economy.pips : 0,
      astras: Number.isSafeInteger(data?.economy?.astras) ? data.economy.astras : 0,
    },
    activeDeckIdx: Number.isSafeInteger(data.v6ActiveDeckIdx)
      ? data.v6ActiveDeckIdx
      : (Number.isSafeInteger(data.activeDeckIdx) ? data.activeDeckIdx : 0),
    deckCount: Math.max(MIN_DECKS, Math.min(MAX_DECKS, Number(data.deckCount || MIN_DECKS))),
  };
}
function normalizeEnchantSlots(value) {
  const slots = Array.isArray(value) ? value.slice(0, 4) : [];
  while (slots.length < 4) slots.push(null);
  return slots.map((item) => item && typeof item === 'object' && !Array.isArray(item) ? JSON.parse(JSON.stringify(item)) : null);
}
function publicDie(data = {}, id = data.id) {
  if (!id || typeof data.key !== 'string') throw new HttpsError('internal', 'A stored die instance is malformed.');
  const key = canonicalDieKey(data.key);
  const def = canonicalDieDef(key);
  if (!def) throw new HttpsError('internal', 'A stored die references an unknown canonical die.');
  const cls = Number(data.cls);
  if (!Number.isSafeInteger(cls) || cls < 1 || cls > 10) throw new HttpsError('internal', 'A stored die Class is malformed.');
  return {
    key,
    rarity: def.rarity || data.rarity || 'common',
    source: data.source || null,
    instance: { id, cls, enchants: normalizeEnchantSlots(data.enchants) },
  };
}
function emptySlots() { return [null,null,null,null,null]; }
function normalizeDeckDoc(data, index) {
  const slots = Array.isArray(data?.slots) ? data.slots.slice(0, 5) : [];
  while (slots.length < 5) slots.push(null);
  return {
    index,
    slots: slots.map((slot) => {
      if (!slot || typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string') return null;
      const key = canonicalDieKey(slot.key);
      if (!canonicalDieDef(key)) throw new HttpsError('internal', 'A stored deck references an unknown canonical die.');
      return { key, instId:slot.instId };
    }),
  };
}
function slotCountForClass(cls) { return 1 + (cls >= 3 ? 1 : 0) + (cls >= 5 ? 1 : 0) + (cls >= 7 ? 1 : 0); }
function validJewel(data, id = data?.id) {
  return !!(data && typeof data === 'object' && !Array.isArray(data) && data.kind === 'jewel' &&
    typeof id === 'string' && id && JEWEL_ID_SET.has(data.jewelId) && Number.isSafeInteger(data.tier) && data.tier >= 1 && data.tier <= 5);
}
function publicJewel(data, id = data.id) {
  if (!validJewel(data, id)) throw new HttpsError('internal', 'A stored jewel is malformed.');
  return { kind:'jewel', id, jewelId:data.jewelId, tier:data.tier };
}
function itemDocIdForShop(itemId) {
  if (itemId.startsWith('key_') || itemId.startsWith('card_')) return itemId;
  return null;
}
function safePips(game) { return Number.isSafeInteger(game?.economy?.pips) ? game.economy.pips : 0; }
function safeAstras(game) { return Number.isSafeInteger(game?.economy?.astras) ? game.economy.astras : 0; }

async function ensureV6(auth) {
  const uid = auth.uid;
  const gameRef = db.doc(`users/${uid}/game/state`);
  const settingsRef = db.doc(`users/${uid}/game/settings`);
  const socialRef = db.doc(`users/${uid}/game/social`);
  const publicRef = db.doc(`publicProfiles/${uid}`);
  const [gameSnap, settingsSnap, socialSnap, publicSnap] = await Promise.all([
    gameRef.get(), settingsRef.get(), socialRef.get(), publicRef.get(),
  ]);
  if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');

  const friendCode = socialSnap.data()?.friendCode || friendCodeForUid(uid);
  const displayName = cleanString(socialSnap.data()?.displayName || publicSnap.data()?.displayName || defaultDisplayName(auth), 24) || 'Die Master';
  const batch = db.batch();
  const game = gameSnap.data();
  if (!Number.isSafeInteger(game.deckCount) || game.deckCount < MIN_DECKS || game.deckCount > MAX_DECKS) {
    batch.set(gameRef, { deckCount: MIN_DECKS, v6ActiveDeckIdx: Number.isSafeInteger(game.activeDeckIdx) ? game.activeDeckIdx : 0 }, { merge:true });
  } else if (!Number.isSafeInteger(game.v6ActiveDeckIdx)) {
    batch.set(gameRef, { v6ActiveDeckIdx: Number.isSafeInteger(game.activeDeckIdx) ? game.activeDeckIdx : 0 }, { merge:true });
  }
  if (!settingsSnap.exists) batch.set(settingsRef, { schemaVersion:1, showDamageNumbers:true, updatedAt:FieldValue.serverTimestamp() });
  if (!socialSnap.exists) {
    batch.set(socialRef, { schemaVersion:1, friendCode, displayName, sharedDieId:null, selectedSupportUid:null, updatedAt:FieldValue.serverTimestamp() });
  } else {
    batch.set(socialRef, { friendCode, displayName }, { merge:true });
  }
  if (!publicSnap.exists) {
    batch.set(publicRef, { schemaVersion:1, uid, displayName, friendCode, sharedDie:null, createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });
  } else {
    batch.set(publicRef, { displayName, friendCode, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
  }
  batch.set(db.doc(`friendCodes/${friendCode}`), { uid, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
  await batch.commit();
  return { friendCode, displayName };
}

async function readFullSnapshot(uid) {
  const gameRef = db.doc(`users/${uid}/game/state`);
  const settingsRef = db.doc(`users/${uid}/game/settings`);
  const favoriteRef = db.doc(`users/${uid}/game/favorites`);
  const [gameSnap, settingsSnap, favoriteSnap, diceSnap, itemSnap, jewelSnap] = await Promise.all([
    gameRef.get(), settingsRef.get(), favoriteRef.get(),
    db.collection(`users/${uid}/dice`).get(),
    db.collection(`users/${uid}/items`).get(),
    db.collection(`users/${uid}/jewels`).get(),
  ]);
  if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
  const gameState = gamePublic(gameSnap.data());
  const deckCount = gameState.deckCount;
  const deckSnaps = await Promise.all(Array.from({ length:deckCount }, (_, i) => db.doc(`users/${uid}/decks/deck-${i}`).get()));
  const decks = deckSnaps.map((snap, index) => normalizeDeckDoc(snap.exists ? snap.data() : null, index));
  const dice = diceSnap.docs.map((doc) => publicDie(doc.data(), doc.id));
  const favorites = Array.isArray(favoriteSnap.data()?.instanceIds)
    ? [...new Set(favoriteSnap.data().instanceIds.filter((id) => typeof id === 'string'))].slice(0, MAX_FAVORITES) : [];
  const rewards = [];
  const materials = [];
  const enchant = [];
  for (const doc of itemSnap.docs) {
    const item = doc.data();
    if (item.kind === 'key') {
      rewards.push({ id:doc.id, type:'key', difficultyKey:item.difficultyKey, difficultyLabel:String(item.difficultyKey||'').replace(/^./, c=>c.toUpperCase()), name:item.name || `Chest Key [${item.difficultyKey}]`, desc:item.desc || '', count:Number(item.count || 0), ts:Date.now() });
    } else if (item.kind === 'chest') {
      rewards.push({ id:doc.id, type:'chest', chestKey:'frozen_island', name:'Frozen Island Chest', desc:item.desc || '', difficultyKey:item.difficultyKey, difficultyLabel:String(item.difficultyKey||'').replace(/^./, c=>c.toUpperCase()), ts:Date.now() });
    } else if (item.kind === 'card') {
      enchant.push({ id:doc.id, kind:'card', cardId:item.cardId, count:Number(item.count || 0), ts:Date.now() });
    } else if (item.kind === 'material') {
      materials.push({ id:doc.id, ...item });
    }
  }
  for (const doc of jewelSnap.docs) {
    const jewel = doc.data();
    if (validJewel(jewel, doc.id) && !jewel.socketedIn) enchant.push(publicJewel(jewel, doc.id));
  }
  return {
    gameState,
    dice,
    decks,
    favorites,
    settings: { showDamageNumbers: settingsSnap.exists ? settingsSnap.data()?.showDamageNumbers !== false : true },
    inventory: { rewards, materials, enchant },
  };
}

async function writeReceipt(uid, operation, data = {}) {
  const ref = db.collection(`users/${uid}/transactions`).doc();
  await ref.set({ operation, ...data, createdAt:FieldValue.serverTimestamp() });
  return ref.id;
}

exports.getOnlineSnapshot = onCall({ region:REGION }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  return { ok:true, snapshot:await readFullSnapshot(auth.uid) };
});

// v4 compatibility endpoint: it deliberately returns only the first three decks and
// the legacy active index. The v6 snapshot immediately replaces it with all cloud decks.
exports.getInventoryState = onCall({ region:REGION }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const snapshot = await readFullSnapshot(auth.uid);
  const legacyGame = { ...snapshot.gameState, activeDeckIdx:Math.min(2, snapshot.gameState.activeDeckIdx) };
  return { ok:true, dice:snapshot.dice, decks:snapshot.decks.slice(0,3), gameState:legacyGame };
});

exports.updateGameSettings = onCall({ region:REGION }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const showDamageNumbers = request.data?.showDamageNumbers;
  if (typeof showDamageNumbers !== 'boolean') throw new HttpsError('invalid-argument', 'A valid damage-number setting is required.');
  await db.doc(`users/${auth.uid}/game/settings`).set({ schemaVersion:1, showDamageNumbers, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
  return { ok:true, settings:{ showDamageNumbers } };
});

exports.setDeckState = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const rawDecks = request.data?.decks;
  if (!Array.isArray(rawDecks) || rawDecks.length < MIN_DECKS || rawDecks.length > MAX_DECKS) {
    throw new HttpsError('invalid-argument', 'Deck state must contain between 3 and 5 decks.');
  }
  const activeDeckIdx = clampInt(request.data?.activeDeckIdx, 0, rawDecks.length - 1, 'Active deck');
  const decks = rawDecks.map((deck, index) => {
    if (!Array.isArray(deck) || deck.length !== 5) throw new HttpsError('invalid-argument', `Deck ${index + 1} is invalid.`);
    const keys = new Set();
    const slots = deck.map((slot) => {
      if (slot == null) return null;
      if (typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string') throw new HttpsError('invalid-argument', 'A deck slot is invalid.');
      const key = canonicalDieKey(slot.key);
      if (!canonicalDieDef(key)) throw new HttpsError('invalid-argument', 'A deck references an unknown die type.');
      if (keys.has(key)) throw new HttpsError('failed-precondition', 'A deck cannot contain the same die type twice.');
      keys.add(key);
      return { key, instId:slot.instId };
    });
    return { index, slots };
  });
  const referenced = [...new Set(decks.flatMap((d) => d.slots.filter(Boolean).map((s) => s.instId)))];
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  let nextGame;
  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'Game state is missing.');
    const game = gameSnap.data();
    const deckCount = Math.max(MIN_DECKS, Math.min(MAX_DECKS, Number(game.deckCount || MIN_DECKS)));
    if (decks.length !== deckCount) throw new HttpsError('failed-precondition', 'Your unlocked deck count changed. Reload and try again.');
    const dieSnaps = await Promise.all(referenced.map((id) => tx.get(db.doc(`users/${auth.uid}/dice/${id}`))));
    const byId = new Map(dieSnaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data()]));
    for (const deck of decks) for (const slot of deck.slots) if (slot) {
      const die = byId.get(slot.instId);
      if (!die || canonicalDieKey(die.key) !== slot.key) throw new HttpsError('failed-precondition', 'A deck references a die this account does not own.');
    }
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    decks.forEach((deck) => tx.set(db.doc(`users/${auth.uid}/decks/deck-${deck.index}`), { schemaVersion:1, index:deck.index, slots:deck.slots, updatedAt:FieldValue.serverTimestamp() }));
    tx.update(gameRef, {
      deckCount,
      v6ActiveDeckIdx:activeDeckIdx,
      activeDeckIdx:Math.min(2, activeDeckIdx),
      revision,
      updatedAt:FieldValue.serverTimestamp(),
    });
    tx.set(receiptRef, { operation:'deck_update', activeDeckIdx, deckCount, stateRevisionAfter:revision, createdAt:FieldValue.serverTimestamp() });
    nextGame = { ...game, revision, deckCount, v6ActiveDeckIdx:activeDeckIdx, activeDeckIdx:Math.min(2,activeDeckIdx) };
  });
  return { ok:true, gameState:gamePublic(nextGame), decks };
});

exports.socketJewel = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const dieId = cleanString(request.data?.dieId, 80);
  const jewelId = cleanString(request.data?.jewelId, 80);
  const slot = clampInt(request.data?.slot, 0, 3, 'Socket slot');
  const dieRef = db.doc(`users/${auth.uid}/dice/${dieId}`);
  const jewelRef = db.doc(`users/${auth.uid}/jewels/${jewelId}`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  await db.runTransaction(async (tx) => {
    const [dieSnap, jewelSnap] = await Promise.all([tx.get(dieRef), tx.get(jewelRef)]);
    if (!dieSnap.exists || !jewelSnap.exists) throw new HttpsError('failed-precondition', 'The die or jewel is no longer owned.');
    const die = dieSnap.data(); const jewel = jewelSnap.data();
    if (!validJewel(jewel, jewelSnap.id)) throw new HttpsError('internal', 'The stored jewel is invalid.');
    if (jewel.socketedIn) throw new HttpsError('failed-precondition', 'That jewel is already socketed.');
    if (slot >= slotCountForClass(Number(die.cls || 1))) throw new HttpsError('failed-precondition', 'That socket is not unlocked for this Class.');
    const slots = normalizeEnchantSlots(die.enchants);
    if (slots[slot]) throw new HttpsError('failed-precondition', 'That socket is already occupied.');
    const embedded = publicJewel(jewel, jewelSnap.id);
    slots[slot] = embedded;
    tx.update(dieRef, { enchants:slots, updatedAt:FieldValue.serverTimestamp() });
    tx.update(jewelRef, { socketedIn:{ dieId, slot }, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'jewel_socket', dieId, jewelId, slot, createdAt:FieldValue.serverTimestamp() });
  });
  return { ok:true, snapshot:await readFullSnapshot(auth.uid) };
});

exports.unsocketJewel = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const dieId = cleanString(request.data?.dieId, 80);
  const slot = clampInt(request.data?.slot, 0, 3, 'Socket slot');
  const dieRef = db.doc(`users/${auth.uid}/dice/${dieId}`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  await db.runTransaction(async (tx) => {
    const dieSnap = await tx.get(dieRef);
    if (!dieSnap.exists) throw new HttpsError('failed-precondition', 'That die is no longer owned.');
    const slots = normalizeEnchantSlots(dieSnap.data().enchants);
    const embedded = slots[slot];
    if (!embedded || !validJewel(embedded, embedded.id)) throw new HttpsError('failed-precondition', 'That socket is empty.');
    const jewelRef = db.doc(`users/${auth.uid}/jewels/${embedded.id}`);
    const jewelSnap = await tx.get(jewelRef);
    if (!jewelSnap.exists) throw new HttpsError('internal', 'The socketed jewel record is missing.');
    slots[slot] = null;
    tx.update(dieRef, { enchants:slots, updatedAt:FieldValue.serverTimestamp() });
    tx.update(jewelRef, { socketedIn:null, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'jewel_unsocket', dieId, jewelId:embedded.id, slot, createdAt:FieldValue.serverTimestamp() });
  });
  return { ok:true, snapshot:await readFullSnapshot(auth.uid) };
});

exports.enchantJewel = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const jewelId = cleanString(request.data?.jewelId, 80);
  const cardId = cleanString(request.data?.cardId, 20);
  if (!['lesser','master'].includes(cardId)) throw new HttpsError('invalid-argument', 'Unknown Enchant Card.');
  const jewelRef = db.doc(`users/${auth.uid}/jewels/${jewelId}`);
  const cardRef = db.doc(`users/${auth.uid}/items/card_${cardId}`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  let result;
  await db.runTransaction(async (tx) => {
    const [jewelSnap, cardSnap] = await Promise.all([tx.get(jewelRef), tx.get(cardRef)]);
    if (!jewelSnap.exists || !validJewel(jewelSnap.data(), jewelSnap.id)) throw new HttpsError('failed-precondition', 'That jewel is no longer available.');
    if (jewelSnap.data().socketedIn) throw new HttpsError('failed-precondition', 'Unsocket the jewel before enchanting it.');
    const count = Number(cardSnap.data()?.count || 0);
    if (!cardSnap.exists || count < 1) throw new HttpsError('failed-precondition', 'You do not own that Enchant Card.');
    const oldTier = jewelSnap.data().tier;
    if (oldTier >= 5) throw new HttpsError('failed-precondition', 'That jewel is already at maximum tier.');
    let gain = 0;
    if (cardId === 'lesser') gain = randomFloat() < 0.60 ? 1 : 0;
    else if (randomFloat() < 0.75) gain = randomFloat() < 0.85 ? 1 : 2;
    const newTier = Math.min(5, oldTier + gain);
    tx.update(jewelRef, { tier:newTier, updatedAt:FieldValue.serverTimestamp() });
    if (count === 1) tx.delete(cardRef); else tx.update(cardRef, { count:count - 1, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'jewel_enchant', jewelId, cardId, oldTier, newTier, success:newTier > oldTier, createdAt:FieldValue.serverTimestamp() });
    result = { success:newTier > oldTier, oldTier, newTier, jewelId:jewelSnap.data().jewelId };
  });
  return { ok:true, result, snapshot:await readFullSnapshot(auth.uid) };
});

exports.shopPurchase = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const itemId = cleanString(request.data?.itemId, 40);
  const quantity = clampInt(request.data?.quantity == null ? 1 : request.data.quantity, 1, 99, 'Quantity');
  const item = SHOP[itemId];
  if (!item) throw new HttpsError('invalid-argument', 'Unknown shop item.');
  if (item.kind === 'deckslot' && quantity !== 1) throw new HttpsError('invalid-argument', 'Deck slots are purchased one at a time.');
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'Game state is missing.');
    const game = gameSnap.data();
    const currentPips = safePips(game); const cost = item.cost * quantity;
    if (currentPips < cost) throw new HttpsError('failed-precondition', 'Not enough Pips.');
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    let deckCount = Math.max(MIN_DECKS, Math.min(MAX_DECKS, Number(game.deckCount || MIN_DECKS)));
    if (item.kind === 'deckslot') {
      if (item.unlockCount !== deckCount + 1 || deckCount >= MAX_DECKS) throw new HttpsError('failed-precondition', 'That deck slot is already owned or not yet available.');
      const newIndex = deckCount;
      deckCount += 1;
      tx.set(db.doc(`users/${auth.uid}/decks/deck-${newIndex}`), { schemaVersion:1, index:newIndex, slots:emptySlots(), updatedAt:FieldValue.serverTimestamp() });
    } else {
      const aggregateId = itemDocIdForShop(itemId);
      const itemRef = db.doc(`users/${auth.uid}/items/${aggregateId}`);
      const itemSnap = await tx.get(itemRef);
      const nextCount = Number(itemSnap.data()?.count || 0) + quantity;
      const payload = item.kind === 'key'
        ? { kind:'key', difficultyKey:item.difficultyKey, name:item.name, count:nextCount }
        : { kind:'card', cardId:item.cardId, name:item.name, count:nextCount };
      tx.set(itemRef, { ...payload, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
    }
    tx.update(gameRef, { economy:{ pips:currentPips - cost, astras:safeAstras(game) }, deckCount, revision, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'shop_purchase', itemId, quantity, costPips:cost, stateRevisionAfter:revision, createdAt:FieldValue.serverTimestamp() });
  });
  return { ok:true, snapshot:await readFullSnapshot(auth.uid) };
});

exports.shopSell = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const kind = cleanString(request.data?.kind, 20);
  const itemId = cleanString(request.data?.itemId, 100);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  let value = 0;
  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'Game state is missing.');
    const game = gameSnap.data();
    if (kind === 'key' || kind === 'card') {
      const catalog = SHOP[itemId];
      if (!catalog || catalog.kind !== kind) throw new HttpsError('invalid-argument', 'That item cannot be sold.');
      const ref = db.doc(`users/${auth.uid}/items/${itemId}`);
      const snap = await tx.get(ref); const count = Number(snap.data()?.count || 0);
      if (!snap.exists || count < 1) throw new HttpsError('failed-precondition', 'That item is no longer owned.');
      value = catalog.sellValue;
      if (count === 1) tx.delete(ref); else tx.update(ref, { count:count - 1, updatedAt:FieldValue.serverTimestamp() });
    } else if (kind === 'jewel') {
      const ref = db.doc(`users/${auth.uid}/jewels/${itemId}`);
      const snap = await tx.get(ref);
      if (!snap.exists || !validJewel(snap.data(), snap.id)) throw new HttpsError('failed-precondition', 'That jewel is no longer owned.');
      if (snap.data().socketedIn) throw new HttpsError('failed-precondition', 'Unsocket the jewel before selling it.');
      value = 40 * snap.data().tier;
      tx.delete(ref);
    } else throw new HttpsError('invalid-argument', 'That item cannot be sold.');
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    tx.update(gameRef, { economy:{ pips:safePips(game) + value, astras:safeAstras(game) }, revision, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'shop_sell', kind, itemId, valuePips:value, stateRevisionAfter:revision, createdAt:FieldValue.serverTimestamp() });
  });
  return { ok:true, valuePips:value, snapshot:await readFullSnapshot(auth.uid) };
});

function jewelTierForChest(diff) {
  const r = randomFloat();
  if (diff === 'normal') return r < .80 ? 1 : r < .98 ? 2 : 3;
  if (diff === 'hard') return r < .15 ? 1 : r < .70 ? 2 : r < .95 ? 3 : 4;
  return r < .15 ? 2 : r < .65 ? 3 : r < .93 ? 4 : 5;
}
function chestLoot(diff) {
  const pips = diff === 'normal' ? randomInt(80,140) : diff === 'hard' ? randomInt(160,280) : randomInt(320,520);
  const jewelCount = diff === 'normal' ? 1 : diff === 'hard' ? (randomFloat() < .25 ? 2 : 1) : (randomFloat() < .50 ? 3 : 2);
  const jewels = Array.from({ length:jewelCount }, () => ({ kind:'jewel', id:serverId('j'), jewelId:pick(JEWEL_IDS), tier:jewelTierForChest(diff) }));
  const dice = [];
  const dieChance = diff === 'normal' ? .12 : diff === 'hard' ? .28 : .45;
  if (randomFloat() < dieChance) {
    let key; let rarity;
    const r = randomFloat();
    if (diff === 'normal') {
      rarity = r < .80 ? 'rare' : 'unique'; key = pick(GACHA_POOLS[rarity]);
    } else if (diff === 'hard') {
      rarity = r < .75 ? 'unique' : 'legendary'; key = pick(GACHA_POOLS[rarity]);
    } else if (r < .08) {
      rarity = 'legendary'; key = 'bruteforceblizzard';
    } else {
      rarity = r < .35 ? 'unique' : 'legendary'; key = pick(GACHA_POOLS[rarity]);
    }
    dice.push({ key, rarity, instance:{ id:serverId('d'), cls:1, enchants:[null,null,null,null] } });
  }
  return { pips, jewels, dice };
}

exports.openChest = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const chestId = cleanString(request.data?.chestId, 100);
  const chestRef = db.doc(`users/${auth.uid}/items/${chestId}`);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  let loot;
  await db.runTransaction(async (tx) => {
    const [chestSnap, gameSnap] = await Promise.all([tx.get(chestRef), tx.get(gameRef)]);
    if (!chestSnap.exists || chestSnap.data()?.kind !== 'chest') throw new HttpsError('failed-precondition', 'That chest is no longer available.');
    const diff = chestSnap.data().difficultyKey;
    if (!['normal','hard','hell'].includes(diff)) throw new HttpsError('internal', 'The chest difficulty is invalid.');
    const keyRef = db.doc(`users/${auth.uid}/items/key_${diff}`);
    const keySnap = await tx.get(keyRef); const keyCount = Number(keySnap.data()?.count || 0);
    if (!keySnap.exists || keyCount < 1) throw new HttpsError('failed-precondition', `You need a ${diff} Chest Key.`);
    const game = gameSnap.data();
    loot = chestLoot(diff);
    tx.delete(chestRef);
    if (keyCount === 1) tx.delete(keyRef); else tx.update(keyRef, { count:keyCount - 1, updatedAt:FieldValue.serverTimestamp() });
    loot.jewels.forEach((jewel) => tx.set(db.doc(`users/${auth.uid}/jewels/${jewel.id}`), { ...jewel, socketedIn:null, source:'frozen_island_chest', createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() }));
    loot.dice.forEach((grant) => tx.set(db.doc(`users/${auth.uid}/dice/${grant.instance.id}`), { id:grant.instance.id, key:grant.key, rarity:grant.rarity, source:'frozen_island_chest', cls:1, enchants:[null,null,null,null], createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() }));
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    tx.update(gameRef, { economy:{ pips:safePips(game) + loot.pips, astras:safeAstras(game) }, revision, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'chest_open', chestId, difficultyKey:diff, pips:loot.pips, jewelIds:loot.jewels.map(j=>j.id), dieIds:loot.dice.map(d=>d.instance.id), dayKey:utcDayKey(), createdAt:FieldValue.serverTimestamp() });
  });
  return { ok:true, loot, snapshot:await readFullSnapshot(auth.uid) };
});

async function acceptedFriend(uid, otherUid) {
  const snap = await db.doc(`users/${uid}/friends/${otherUid}`).get();
  return snap.exists && snap.data()?.status === 'accepted';
}

async function sharedSupportSnapshot(uid) {
  const socialSnap = await db.doc(`users/${uid}/game/social`).get();
  const friendUid = socialSnap.data()?.selectedSupportUid;
  if (!friendUid || !(await acceptedFriend(uid, friendUid))) return null;
  const lenderSocial = await db.doc(`users/${friendUid}/game/social`).get();
  const dieId = lenderSocial.data()?.sharedDieId;
  if (!dieId) return null;
  const [dieSnap, profileSnap] = await Promise.all([
    db.doc(`users/${friendUid}/dice/${dieId}`).get(),
    db.doc(`publicProfiles/${friendUid}`).get(),
  ]);
  if (!dieSnap.exists) return null;
  const grant = publicDie(dieSnap.data(), dieSnap.id);
  return { lenderUid:friendUid, lenderName:profileSnap.data()?.displayName || 'Friend', ...grant };
}

exports.beginRun = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const modeKey = cleanString(request.data?.modeKey, 30);
  if (!['survival','bossrush','sudden','adventure','endlesshorde'].includes(modeKey)) throw new HttpsError('invalid-argument', 'Unknown single-player mode.');
  const difficultyKey = modeKey === 'adventure' ? cleanString(request.data?.difficultyKey, 20) : null;
  if (modeKey === 'adventure' && !['normal','hard','hell'].includes(difficultyKey)) throw new HttpsError('invalid-argument', 'Adventure difficulty is invalid.');
  const gameSnap = await db.doc(`users/${auth.uid}/game/state`).get();
  const game = gamePublic(gameSnap.data());
  const deckSnap = await db.doc(`users/${auth.uid}/decks/deck-${game.activeDeckIdx}`).get();
  const deck = normalizeDeckDoc(deckSnap.exists ? deckSnap.data() : null, game.activeDeckIdx);
  if (deck.slots.filter(Boolean).length !== 5) throw new HttpsError('failed-precondition', 'Your active deck must contain five dice.');
  const support = await sharedSupportSnapshot(auth.uid);
  const runRef = db.collection(`users/${auth.uid}/runs`).doc();
  await runRef.set({
    status:'active', modeKey, difficultyKey, campaign:!!request.data?.campaign,
    support: support ? { lenderUid:support.lenderUid, lenderName:support.lenderName, key:support.key, rarity:support.rarity, instance:support.instance } : null,
    startedAt:FieldValue.serverTimestamp(),
  });
  return { ok:true, runId:runRef.id, support };
});

exports.finishRun = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const runId = cleanString(request.data?.runId, 100);
  const completedWaves = clampInt(request.data?.completedWaves || 0, 0, 10000, 'Completed waves');
  const kills = clampInt(request.data?.kills || 0, 0, 200000, 'Kills');
  const coinGold = clampInt(request.data?.coinGold || 0, 0, 1000000, 'Collected Pips');
  const wave = clampInt(request.data?.wave || 0, 0, 10000, 'Wave');
  const typhoonDefeated = !!request.data?.typhoonDefeated;
  const luckBonus = Math.max(0, Math.min(0.45, Number(request.data?.luckBonus || 0)));
  const playSeconds = Math.max(0, Math.min(86400, Number(request.data?.playSeconds || 0)));
  const runRef = db.doc(`users/${auth.uid}/runs/${runId}`);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const levelRef = db.doc(`users/${auth.uid}/game/accountLevel`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  let result;
  await db.runTransaction(async (tx) => {
    const [runSnap, gameSnap, levelSnap] = await Promise.all([tx.get(runRef), tx.get(gameRef), tx.get(levelRef)]);
    if (!runSnap.exists || runSnap.data()?.status !== 'active') throw new HttpsError('failed-precondition', 'That run is no longer active.');
    const run = runSnap.data(); const game = gameSnap.data();
    const modeFamily = progressionV21.inferModeFamily(run.modeKey, run.modeFamily);
    let runPipsEarned = 0; let chestCount = 0;
    if (run.modeKey === 'adventure') {
      runPipsEarned = Math.round(wave * 10 + kills * 1.2 + coinGold + (typhoonDefeated ? 150 : 0));
      if (typhoonDefeated && ['normal','hard','hell'].includes(run.difficultyKey)) {
        chestCount = 1 + (randomFloat() < luckBonus ? 1 : 0);
        for (let i = 0; i < chestCount; i++) {
          const chestId = serverId('chest_');
          tx.set(db.doc(`users/${auth.uid}/items/${chestId}`), {
            kind:'chest', chestKey:'frozen_island', difficultyKey:run.difficultyKey,
            desc:`A sealed chest earned by clearing Al Hata on ${run.difficultyKey} difficulty. Requires a matching Chest Key to open.`,
            sourceRunId:runId, createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp(),
          });
        }
      }
    } else if (run.modeKey === 'endlesshorde') {
      runPipsEarned = Math.round(kills * 2 + playSeconds * 0.15);
    } else {
      const mult = run.modeKey === 'bossrush' ? 1.3 : run.modeKey === 'sudden' ? 1.6 : 1;
      runPipsEarned = Math.round((completedWaves * 8 + kills + coinGold) * mult);
    }
    runPipsEarned = Math.max(0, Math.min(5000000, runPipsEarned));

    const previousLevel = progressionV21.publicLevel(levelSnap.exists ? levelSnap.data() : {});
    const xpAwarded = progressionV21.calculateRunXp({
      modeKey:run.modeKey, modeFamily, difficultyKey:run.difficultyKey,
      completedWaves, kills, wave, playSeconds, typhoonDefeated,
    });
    const nextXp = Math.max(0, previousLevel.xp + xpAwarded);
    const nextLevel = progressionV21.publicLevel({ xp:nextXp });
    const levelsGained = progressionV21.levelsCrossed(previousLevel.xp, nextXp);
    // Check every level already earned, not only levels crossed this run. This makes future
    // reward-table additions retroactive and idempotent for players who already passed them.
    const rewardEligibleLevels = Array.from({ length:nextLevel.level }, (_, index) => index + 1);
    const rewardEffects = levelRewardsV21._applyConfiguredLevelRewards(
      tx, auth.uid, rewardEligibleLevels, levelSnap.exists ? levelSnap.data()?.claimedRewards : []
    );

    const pipsEarned = runPipsEarned + rewardEffects.pipsDelta;
    const astrasEarned = rewardEffects.astrasDelta;
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    const nextEconomy = {
      pips:safePips(game) + pipsEarned,
      astras:safeAstras(game) + astrasEarned,
    };
    tx.update(gameRef, { economy:nextEconomy, revision, updatedAt:FieldValue.serverTimestamp() });
    tx.set(levelRef, {
      schemaVersion:21,
      xp:nextXp,
      level:nextLevel.level,
      claimedRewards:rewardEffects.claimedRewards,
      updatedAt:FieldValue.serverTimestamp(),
    }, { merge:true });
    tx.update(runRef, {
      status:'completed', modeFamily, completedWaves, kills, coinGold, wave, playSeconds, typhoonDefeated,
      pipsEarned:runPipsEarned, xpAwarded, levelBefore:previousLevel.level, levelAfter:nextLevel.level,
      chestCount, finishedAt:FieldValue.serverTimestamp(),
    });
    tx.set(receiptRef, {
      operation:typhoonDefeated ? 'adventure_clear' : 'run_finish',
      runId, modeKey:run.modeKey, modeFamily, pipsEarned:runPipsEarned, xpAwarded,
      levelBefore:previousLevel.level, levelAfter:nextLevel.level,
      levelRewardPips:rewardEffects.pipsDelta, levelRewardAstras:rewardEffects.astrasDelta,
      grantedLevelRewards:rewardEffects.grantedRewards, chestCount, dayKey:utcDayKey(), createdAt:FieldValue.serverTimestamp(),
    });
    result = {
      modeFamily,
      pipsEarned:runPipsEarned,
      xpAwarded,
      level:nextLevel,
      levelsGained,
      levelRewards:rewardEffects.grantedRewards,
      levelRewardPips:rewardEffects.pipsDelta,
      levelRewardAstras:rewardEffects.astrasDelta,
      chestCount,
      gameState:gamePublic({ ...game, revision, economy:nextEconomy }),
    };
  });
  return { ok:true, ...result, snapshot:await readFullSnapshot(auth.uid) };
});

function dailyEligibility(facts, dayKey) {
  const today = facts.operations.filter((row) => row.dayKey === dayKey);
  return {
    login:true,
    summon:today.some((row) => row.operation === 'gacha') || facts.operations.some((row) => row.operation === 'gacha' && row.createdAt?.toDate?.().toISOString().slice(0,10) === dayKey),
    adventure:today.some((row) => ['run_finish','adventure_clear'].includes(row.operation)),
    chest:today.some((row) => row.operation === 'chest_open'),
  };
}
async function progressionState(uid) {
  const facts = await transactionFacts(uid); const dayKey = utcDayKey();
  const [achSnap, dailySnap] = await Promise.all([
    db.collection(`users/${uid}/achievements`).get(),
    db.doc(`users/${uid}/dailies/${dayKey}`).get(),
  ]);
  const claimedAchievements = new Set(achSnap.docs.map((doc) => doc.id));
  const dailyClaimed = new Set(Array.isArray(dailySnap.data()?.claimed) ? dailySnap.data().claimed : []);
  const aEligible = achievementEligibility(facts); const dEligible = dailyEligibility(facts, dayKey);
  return {
    achievements:Object.entries(ACHIEVEMENTS).map(([id, def]) => ({ id, ...def, eligible:!!aEligible[id], claimed:claimedAchievements.has(id) })),
    daily:{ dayKey, tasks:Object.entries(DAILY).map(([id, def]) => ({ id, ...def, eligible:!!dEligible[id], claimed:dailyClaimed.has(id) })) },
  };
}
exports.getProgression = onCall({ region:REGION }, async (request) => {
  const auth = requireAuth(request); await ensureV6(auth);
  return { ok:true, progression:await progressionState(auth.uid) };
});
exports.claimAchievement = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request); await ensureV6(auth);
  const id = cleanString(request.data?.id, 60); const def = ACHIEVEMENTS[id];
  if (!def) throw new HttpsError('invalid-argument', 'Unknown achievement.');
  const facts = await transactionFacts(auth.uid);
  if (!achievementEligibility(facts)[id]) throw new HttpsError('failed-precondition', 'That achievement is not complete yet.');
  const claimRef = db.doc(`users/${auth.uid}/achievements/${id}`); const gameRef = db.doc(`users/${auth.uid}/game/state`); const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  await db.runTransaction(async (tx) => {
    const [claimSnap, gameSnap] = await Promise.all([tx.get(claimRef), tx.get(gameRef)]);
    if (claimSnap.exists) throw new HttpsError('already-exists', 'That achievement reward was already claimed.');
    const game = gameSnap.data(); const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    tx.set(claimRef, { id, rewardPips:def.rewardPips, claimedAt:FieldValue.serverTimestamp() });
    tx.update(gameRef, { economy:{ pips:safePips(game)+def.rewardPips, astras:safeAstras(game) }, revision, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'achievement_claim', achievementId:id, pips:def.rewardPips, createdAt:FieldValue.serverTimestamp() });
  });
  return { ok:true, progression:await progressionState(auth.uid), snapshot:await readFullSnapshot(auth.uid) };
});
exports.claimDaily = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request); await ensureV6(auth);
  const id = cleanString(request.data?.id, 40); const def = DAILY[id]; if (!def) throw new HttpsError('invalid-argument', 'Unknown daily task.');
  const dayKey = utcDayKey(); const facts = await transactionFacts(auth.uid);
  if (!dailyEligibility(facts, dayKey)[id]) throw new HttpsError('failed-precondition', 'That daily task is not complete yet.');
  const dailyRef = db.doc(`users/${auth.uid}/dailies/${dayKey}`); const gameRef = db.doc(`users/${auth.uid}/game/state`); const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  await db.runTransaction(async (tx) => {
    const [dailySnap, gameSnap] = await Promise.all([tx.get(dailyRef), tx.get(gameRef)]);
    const claimed = Array.isArray(dailySnap.data()?.claimed) ? [...new Set(dailySnap.data().claimed)] : [];
    if (claimed.includes(id)) throw new HttpsError('already-exists', 'That daily reward was already claimed.');
    claimed.push(id); const game = gameSnap.data(); const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    tx.set(dailyRef, { dayKey, claimed, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
    tx.update(gameRef, { economy:{ pips:safePips(game)+def.rewardPips, astras:safeAstras(game) }, revision, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'daily_claim', dailyId:id, dayKey, pips:def.rewardPips, createdAt:FieldValue.serverTimestamp() });
  });
  return { ok:true, progression:await progressionState(auth.uid), snapshot:await readFullSnapshot(auth.uid) };
});

function normalizeGiftCode(value) { return cleanString(value, 120).toUpperCase().replace(/\s+/g, ''); }
function giftHash(code) { return crypto.createHash('sha256').update(code).digest('hex'); }
function validateGiftReward(reward) {
  if (!reward || typeof reward !== 'object') throw new HttpsError('internal', 'Gift reward is invalid.');
  return {
    pips:Math.max(0, Math.min(1000000, Number.isSafeInteger(reward.pips) ? reward.pips : 0)),
    astras:Math.max(0, Math.min(100000, Number.isSafeInteger(reward.astras) ? reward.astras : 0)),
    dice:Array.isArray(reward.dice) ? reward.dice.slice(0,20) : [],
    jewels:Array.isArray(reward.jewels) ? reward.jewels.slice(0,50) : [],
    keys:reward.keys && typeof reward.keys === 'object' ? reward.keys : {},
    cards:reward.cards && typeof reward.cards === 'object' ? reward.cards : {},
  };
}
exports.redeemOnlineGiftCode = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request); await ensureV6(auth);
  const code = normalizeGiftCode(request.data?.code); if (!code) throw new HttpsError('invalid-argument', 'Enter a gift code.');
  const hash = giftHash(code); const codeRef = db.doc(`giftCodes/${hash}`); const redemptionRef = db.doc(`users/${auth.uid}/redemptions/${hash}`); const gameRef = db.doc(`users/${auth.uid}/game/state`); const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  let summary;
  await db.runTransaction(async (tx) => {
    const [codeSnap, redemptionSnap, gameSnap] = await Promise.all([tx.get(codeRef), tx.get(redemptionRef), tx.get(gameRef)]);
    if (!codeSnap.exists || codeSnap.data()?.active !== true) throw new HttpsError('not-found', 'That online gift code is not valid.');
    if (redemptionSnap.exists) throw new HttpsError('already-exists', 'This account already redeemed that gift code.');
    const codeData = codeSnap.data();
    if (codeData.expiresAt?.toMillis?.() && codeData.expiresAt.toMillis() < Date.now()) throw new HttpsError('failed-precondition', 'That gift code has expired.');
    const maxRedemptions = Number(codeData.maxRedemptions || 0); const redeemedCount = Number(codeData.redeemedCount || 0);
    if (maxRedemptions > 0 && redeemedCount >= maxRedemptions) throw new HttpsError('resource-exhausted', 'That gift code has reached its redemption limit.');
    const reward = validateGiftReward(codeData.reward); const game = gameSnap.data();
    const grantedDice = []; const grantedJewels = [];
    for (const spec of reward.dice) {
      const key = canonicalDieKey(cleanString(spec?.key, 40)); if (!DICE_RARITY[key]) continue;
      const cls = Math.max(1, Math.min(10, Number.isSafeInteger(spec.cls) ? spec.cls : 1)); const id = serverId('d'); const rarity = DICE_RARITY[key];
      const grant = { key, rarity, instance:{ id, cls, enchants:[null,null,null,null] } }; grantedDice.push(grant);
      tx.set(db.doc(`users/${auth.uid}/dice/${id}`), { id, key, rarity, source:'gift_code', cls, enchants:[null,null,null,null], createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });
    }
    for (const spec of reward.jewels) {
      const jewelId = cleanString(spec?.jewelId, 40); if (!JEWEL_ID_SET.has(jewelId)) continue;
      const tier = Math.max(1, Math.min(5, Number.isSafeInteger(spec.tier) ? spec.tier : 1)); const id = serverId('j'); const jewel = { kind:'jewel', id, jewelId, tier }; grantedJewels.push(jewel);
      tx.set(db.doc(`users/${auth.uid}/jewels/${id}`), { ...jewel, socketedIn:null, source:'gift_code', createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() });
    }
    for (const diff of ['normal','hard','hell']) {
      const add = Math.max(0, Math.min(99, Number(reward.keys[diff] || 0))); if (!add) continue;
      const ref = db.doc(`users/${auth.uid}/items/key_${diff}`); const snap = await tx.get(ref); const catalog = SHOP[`key_${diff}`];
      tx.set(ref, { kind:'key', difficultyKey:diff, name:catalog.name, count:Number(snap.data()?.count || 0)+add, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
    }
    for (const cardId of ['lesser','master']) {
      const add = Math.max(0, Math.min(99, Number(reward.cards[cardId] || 0))); if (!add) continue;
      const ref = db.doc(`users/${auth.uid}/items/card_${cardId}`); const snap = await tx.get(ref); const catalog = SHOP[`card_${cardId}`];
      tx.set(ref, { kind:'card', cardId, name:catalog.name, count:Number(snap.data()?.count || 0)+add, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
    }
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    tx.update(gameRef, { economy:{ pips:safePips(game)+reward.pips, astras:safeAstras(game)+reward.astras }, revision, updatedAt:FieldValue.serverTimestamp() });
    tx.set(redemptionRef, { codeHash:hash, label:cleanString(codeData.label || 'Gift Code', 80), redeemedAt:FieldValue.serverTimestamp() });
    if (maxRedemptions > 0) tx.update(codeRef, { redeemedCount:redeemedCount+1, updatedAt:FieldValue.serverTimestamp() });
    tx.set(receiptRef, { operation:'gift_code', codeHash:hash, label:cleanString(codeData.label || '',80), pips:reward.pips, astras:reward.astras, dieIds:grantedDice.map(d=>d.instance.id), jewelIds:grantedJewels.map(j=>j.id), createdAt:FieldValue.serverTimestamp() });
    summary = { label:cleanString(codeData.label || 'Gift Code',80), pips:reward.pips, astras:reward.astras, dice:grantedDice, jewels:grantedJewels };
  });
  return { ok:true, reward:summary, snapshot:await readFullSnapshot(auth.uid) };
});

async function socialState(uid) {
  const [selfSnap, friendSnap] = await Promise.all([
    db.doc(`users/${uid}/game/social`).get(),
    db.collection(`users/${uid}/friends`).get(),
  ]);
  const rows = [];
  for (const doc of friendSnap.docs) {
    const rel = doc.data();
    const [profileSnap, otherSocial] = await Promise.all([
      db.doc(`publicProfiles/${doc.id}`).get(),
      db.doc(`users/${doc.id}/game/social`).get(),
    ]);
    const profile = profileSnap.data() || {};
    let sharedDie = null;
    const sharedId = otherSocial.data()?.sharedDieId;
    if (sharedId && rel.status === 'accepted') {
      const dieSnap = await db.doc(`users/${doc.id}/dice/${sharedId}`).get();
      if (dieSnap.exists) sharedDie = publicDie(dieSnap.data(), dieSnap.id);
    }
    rows.push({ uid:doc.id, status:rel.status, displayName:profile.displayName || 'Die Master', friendCode:profile.friendCode || null, sharedDie, since:rel.acceptedAt || rel.createdAt || null });
  }
  const self = selfSnap.data() || {};
  return { self:{ friendCode:self.friendCode || friendCodeForUid(uid), displayName:self.displayName || 'Die Master', sharedDieId:self.sharedDieId || null, selectedSupportUid:self.selectedSupportUid || null }, friends:rows };
}
exports.getSocialState = onCall({ region:REGION }, async (request) => {
  const auth = requireAuth(request); await ensureV6(auth); return { ok:true, social:await socialState(auth.uid) };
});
exports.setPublicDisplayName = onCall({ region:REGION }, async (request) => {
  const auth = requireAuth(request); await ensureV6(auth); const name = cleanString(request.data?.displayName,24);
  if (name.length < 2) throw new HttpsError('invalid-argument', 'Display name must be at least 2 characters.');
  await Promise.all([
    db.doc(`users/${auth.uid}/game/social`).set({ displayName:name, updatedAt:FieldValue.serverTimestamp() }, { merge:true }),
    db.doc(`publicProfiles/${auth.uid}`).set({ displayName:name, updatedAt:FieldValue.serverTimestamp() }, { merge:true }),
  ]);
  return { ok:true, social:await socialState(auth.uid) };
});
exports.sendFriendRequest = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request); await ensureV6(auth); const code = cleanString(request.data?.friendCode,40).toUpperCase();
  const mapSnap = await db.doc(`friendCodes/${code}`).get(); const targetUid = mapSnap.data()?.uid;
  if (!targetUid) throw new HttpsError('not-found', 'No player has that friend code.');
  if (targetUid === auth.uid) throw new HttpsError('invalid-argument', 'You cannot add yourself.');
  const aRef = db.doc(`users/${auth.uid}/friends/${targetUid}`); const bRef = db.doc(`users/${targetUid}/friends/${auth.uid}`);
  await db.runTransaction(async (tx) => {
    const [a,b] = await Promise.all([tx.get(aRef),tx.get(bRef)]);
    if (a.data()?.status === 'accepted') return;
    if (a.data()?.status === 'incoming' && b.data()?.status === 'outgoing') {
      const now = FieldValue.serverTimestamp(); tx.set(aRef,{status:'accepted',acceptedAt:now,updatedAt:now},{merge:true}); tx.set(bRef,{status:'accepted',acceptedAt:now,updatedAt:now},{merge:true}); return;
    }
    const now = FieldValue.serverTimestamp(); tx.set(aRef,{status:'outgoing',createdAt:now,updatedAt:now}); tx.set(bRef,{status:'incoming',createdAt:now,updatedAt:now});
  });
  return { ok:true, social:await socialState(auth.uid) };
});
exports.acceptFriendRequest = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request); await ensureV6(auth); const otherUid = cleanString(request.data?.uid,128);
  const aRef=db.doc(`users/${auth.uid}/friends/${otherUid}`), bRef=db.doc(`users/${otherUid}/friends/${auth.uid}`);
  await db.runTransaction(async(tx)=>{ const [a,b]=await Promise.all([tx.get(aRef),tx.get(bRef)]); if(a.data()?.status!=='incoming'||b.data()?.status!=='outgoing') throw new HttpsError('failed-precondition','That friend request is no longer pending.'); const now=FieldValue.serverTimestamp(); tx.set(aRef,{status:'accepted',acceptedAt:now,updatedAt:now},{merge:true}); tx.set(bRef,{status:'accepted',acceptedAt:now,updatedAt:now},{merge:true}); });
  await writeReceipt(auth.uid,'friend_accept',{ friendUid:otherUid });
  return { ok:true, social:await socialState(auth.uid) };
});
exports.declineFriendRequest = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth=requireAuth(request); await ensureV6(auth); const otherUid=cleanString(request.data?.uid,128); const batch=db.batch(); batch.delete(db.doc(`users/${auth.uid}/friends/${otherUid}`)); batch.delete(db.doc(`users/${otherUid}/friends/${auth.uid}`)); await batch.commit(); return {ok:true,social:await socialState(auth.uid)};
});
exports.removeFriend = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth=requireAuth(request); await ensureV6(auth); const otherUid=cleanString(request.data?.uid,128); const batch=db.batch(); batch.delete(db.doc(`users/${auth.uid}/friends/${otherUid}`)); batch.delete(db.doc(`users/${otherUid}/friends/${auth.uid}`)); const selfSocial=db.doc(`users/${auth.uid}/game/social`); const socialSnap=await selfSocial.get(); if(socialSnap.data()?.selectedSupportUid===otherUid) batch.set(selfSocial,{selectedSupportUid:null,updatedAt:FieldValue.serverTimestamp()},{merge:true}); await batch.commit(); return {ok:true,social:await socialState(auth.uid)};
});
exports.setSharedDie = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth=requireAuth(request); await ensureV6(auth); const instanceId=request.data?.instanceId==null?null:cleanString(request.data.instanceId,100); let shared=null;
  if(instanceId){ const dieSnap=await db.doc(`users/${auth.uid}/dice/${instanceId}`).get(); if(!dieSnap.exists) throw new HttpsError('failed-precondition','That die is not owned by this account.'); shared=publicDie(dieSnap.data(),dieSnap.id); }
  await Promise.all([
    db.doc(`users/${auth.uid}/game/social`).set({sharedDieId:instanceId,updatedAt:FieldValue.serverTimestamp()},{merge:true}),
    db.doc(`publicProfiles/${auth.uid}`).set({sharedDie:shared?{key:shared.key,rarity:shared.rarity,instance:{id:shared.instance.id,cls:shared.instance.cls,enchants:shared.instance.enchants}}:null,updatedAt:FieldValue.serverTimestamp()},{merge:true}),
  ]);
  return {ok:true,social:await socialState(auth.uid)};
});
exports.selectSharedSupport = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth=requireAuth(request); await ensureV6(auth); const friendUid=request.data?.uid==null?null:cleanString(request.data.uid,128);
  if(friendUid){ if(!(await acceptedFriend(auth.uid,friendUid))) throw new HttpsError('failed-precondition','That player is not on your friends list.'); const social=await db.doc(`users/${friendUid}/game/social`).get(); if(!social.data()?.sharedDieId) throw new HttpsError('failed-precondition','That friend is not sharing a die.'); }
  await db.doc(`users/${auth.uid}/game/social`).set({selectedSupportUid:friendUid,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  return {ok:true,social:await socialState(auth.uid)};
});
exports.getPublicProfile = onCall({ region:REGION }, async (request) => {
  requireAuth(request); const uid=cleanString(request.data?.uid,128); const snap=await db.doc(`publicProfiles/${uid}`).get(); if(!snap.exists) throw new HttpsError('not-found','Player profile not found.'); const d=snap.data(); return {ok:true,profile:{uid,displayName:d.displayName||'Die Master',friendCode:d.friendCode||null,sharedDie:d.sharedDie||null,createdAt:d.createdAt||null}};
});
exports.getFriendDeck = onCall({ region:REGION }, async (request) => {
  const auth=requireAuth(request); await ensureV6(auth); const friendUid=cleanString(request.data?.uid,128); if(!(await acceptedFriend(auth.uid,friendUid))) throw new HttpsError('permission-denied','Only friends can view this deck.');
  const [gameSnap,profileSnap]=await Promise.all([db.doc(`users/${friendUid}/game/state`).get(),db.doc(`publicProfiles/${friendUid}`).get()]); if(!gameSnap.exists) throw new HttpsError('not-found','Friend game state is unavailable.');
  const game=gamePublic(gameSnap.data()); const deckSnap=await db.doc(`users/${friendUid}/decks/deck-${game.activeDeckIdx}`).get(); const deck=normalizeDeckDoc(deckSnap.exists?deckSnap.data():null,game.activeDeckIdx); const dice=[];
  for(const slot of deck.slots){ if(!slot){dice.push(null);continue;} const dieSnap=await db.doc(`users/${friendUid}/dice/${slot.instId}`).get(); dice.push(dieSnap.exists?publicDie(dieSnap.data(),dieSnap.id):null); }
  return {ok:true,deck:{ownerUid:friendUid,ownerName:profileSnap.data()?.displayName||'Friend',activeDeckIdx:game.activeDeckIdx,slots:dice}};
});

// Dynamic v6 merge: same v33 semantics as v5, now covering up to five decks and exact server-owned jewels.
exports.mergeDice = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth=requireAuth(request); await ensureV6(auth); const key=cleanString(request.data?.key,40), sourceId=cleanString(request.data?.sourceId,100), targetId=cleanString(request.data?.targetId,100); if(!key||!sourceId||!targetId||sourceId===targetId) throw new HttpsError('invalid-argument','Two distinct merge copies are required.');
  const sourceRef=db.doc(`users/${auth.uid}/dice/${sourceId}`), targetRef=db.doc(`users/${auth.uid}/dice/${targetId}`), gameRef=db.doc(`users/${auth.uid}/game/state`), favoriteRef=db.doc(`users/${auth.uid}/game/favorites`), receiptRef=db.collection(`users/${auth.uid}/transactions`).doc(); let response;
  await db.runTransaction(async(tx)=>{
    const gameSnap=await tx.get(gameRef); if(!gameSnap.exists) throw new HttpsError('failed-precondition','Game state is missing.'); const game=gameSnap.data(); const deckCount=Math.max(MIN_DECKS,Math.min(MAX_DECKS,Number(game.deckCount||MIN_DECKS))); const deckRefs=Array.from({length:deckCount},(_,i)=>db.doc(`users/${auth.uid}/decks/deck-${i}`));
    const [sourceSnap,targetSnap,favSnap,...deckSnaps]=await Promise.all([tx.get(sourceRef),tx.get(targetRef),tx.get(favoriteRef),...deckRefs.map(r=>tx.get(r))]); if(!sourceSnap.exists||!targetSnap.exists) throw new HttpsError('failed-precondition','Both merge copies must be owned.'); const source=sourceSnap.data(), target=targetSnap.data(); if(source.key!==key||target.key!==key) throw new HttpsError('failed-precondition','Both copies must be the same die type.'); if(source.cls!==target.cls||!Number.isSafeInteger(target.cls)) throw new HttpsError('failed-precondition','Class merges require two copies of the same Class.'); if(target.cls>=10) throw new HttpsError('failed-precondition','Class 10 is already the maximum Class.');
    const returned=[...normalizeEnchantSlots(source.enchants),...normalizeEnchantSlots(target.enchants)].filter(Boolean).map(j=>publicJewel(j,j.id)); const seen=new Set(); for(const j of returned){if(seen.has(j.id)) throw new HttpsError('internal','The same jewel is socketed twice.');seen.add(j.id);}
    const decks=deckSnaps.map((snap,i)=>normalizeDeckDoc(snap.exists?snap.data():null,i)); decks.forEach(deck=>deck.slots=deck.slots.map(slot=>slot&&(slot.instId===sourceId||slot.instId===targetId)?{key,instId:targetId}:slot)); let favorites=Array.isArray(favSnap.data()?.instanceIds)?favSnap.data().instanceIds.filter(id=>typeof id==='string'):[]; const keep=favorites.includes(sourceId)||favorites.includes(targetId); favorites=[...new Set(favorites.filter(id=>id!==sourceId&&id!==targetId))]; if(keep) favorites.push(targetId); favorites=favorites.slice(0,MAX_FAVORITES); const oldClass=target.cls,newClass=oldClass+1,revision=Number.isSafeInteger(game.revision)?game.revision+1:1;
    tx.delete(sourceRef); tx.update(targetRef,{cls:newClass,enchants:[null,null,null,null],updatedAt:FieldValue.serverTimestamp()}); decks.forEach(deck=>tx.set(deckRefs[deck.index],{schemaVersion:1,index:deck.index,slots:deck.slots,updatedAt:FieldValue.serverTimestamp()})); tx.set(favoriteRef,{schemaVersion:1,instanceIds:favorites,updatedAt:FieldValue.serverTimestamp()},{merge:true}); returned.forEach(j=>tx.set(db.doc(`users/${auth.uid}/jewels/${j.id}`),{...j,socketedIn:null,returnedByMerge:receiptRef.id,updatedAt:FieldValue.serverTimestamp()},{merge:true})); tx.update(gameRef,{revision,updatedAt:FieldValue.serverTimestamp()}); tx.set(receiptRef,{operation:'class_merge',key,sourceInstanceId:sourceId,targetInstanceId:targetId,classBefore:oldClass,classAfter:newClass,returnedJewelIds:returned.map(j=>j.id),dayKey:utcDayKey(),createdAt:FieldValue.serverTimestamp()}); response={receiptId:receiptRef.id,key,sourceId,targetId,oldClass,newClass,target:publicDie({...target,cls:newClass,enchants:[null,null,null,null]},targetId),decks,favorites:{schemaVersion:1,instanceIds:favorites},returnedJewels:returned,gameRevision:revision};
  });
  return {ok:true,...response};
});
