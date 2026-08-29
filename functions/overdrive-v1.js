'use strict';
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const catalog = require('./overdrivefile.generated.json');

const db = getFirestore();
const REGION = 'us-central1';
const MIN_DECKS = 3;
const MAX_DECKS = 5;
const DEFAULT_STATS = Object.freeze({ hp: 50, dp: 45, luck: 0 });
// Accounts that predate the first playable Overdrive content receive released starter
// Overdrives automatically so existing players can test/use the system. This rollout is
// incremental: when another starter is released, an already-eligible account receives only
// the newly added key(s). New-account 1-of-4 choice and level-up grants remain separate.
const RELEASED_STARTER_BACKFILL_CUTOFF_MS = Date.parse('2026-08-29T04:15:00Z');

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}
function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function deckCount(data = {}) {
  const n = Number(data.deckCount || MIN_DECKS);
  return Number.isSafeInteger(n) ? Math.max(MIN_DECKS, Math.min(MAX_DECKS, n)) : MIN_DECKS;
}
function activeDeckIndex(data = {}, count = MIN_DECKS) {
  const candidate = Number.isSafeInteger(data.v6ActiveDeckIdx) ? data.v6ActiveDeckIdx : data.activeDeckIdx;
  return Number.isSafeInteger(candidate) && candidate >= 0 && candidate < count ? candidate : 0;
}
function isKnownKey(key) {
  return typeof key === 'string' && !!catalog.dice?.[key];
}
function normalizeSlots(value) {
  if (value == null) return [null, null];
  if (!Array.isArray(value) || value.length !== 2) {
    throw new HttpsError('invalid-argument', 'An Overdrive loadout must contain exactly two optional slots.');
  }
  const seen = new Set();
  return value.map((slot) => {
    if (slot == null) return null;
    const key = typeof slot === 'string' ? slot : slot?.key;
    if (!isKnownKey(key)) throw new HttpsError('failed-precondition', 'The loadout references an unknown Overdrive Die.');
    if (seen.has(key)) throw new HttpsError('failed-precondition', 'The same Overdrive Die cannot be equipped twice.');
    seen.add(key);
    return { key };
  });
}
function publicSlots(value) {
  const input = Array.isArray(value) ? value.slice(0, 2) : [];
  while (input.length < 2) input.push(null);
  const seen = new Set();
  return input.map((slot) => {
    const key = typeof slot === 'string' ? slot : slot?.key;
    if (!isKnownKey(key) || seen.has(key)) return null;
    seen.add(key);
    return { key };
  });
}
function publicStats(data = {}) {
  const baseHp = Math.max(1, finite(data.baseHp, DEFAULT_STATS.hp));
  const baseDp = Math.max(0, finite(data.baseDp, DEFAULT_STATS.dp));
  const baseLuck = Math.max(0, finite(data.baseLuck, DEFAULT_STATS.luck));
  const bonusHp = finite(data.bonusHp, 0);
  const bonusDp = finite(data.bonusDp, 0);
  const bonusLuck = finite(data.bonusLuck, 0);
  return {
    hp: Math.max(1, Math.round(baseHp + bonusHp)),
    dp: Math.max(0, Math.round(baseDp + bonusDp)),
    luck: Math.max(0, baseLuck + bonusLuck),
    base: { hp: baseHp, dp: baseDp, luck: baseLuck },
    bonus: { hp: bonusHp, dp: bonusDp, luck: bonusLuck },
  };
}
async function ensurePlayerStats(uid) {
  const ref = db.doc(`users/${uid}/game/playerStats`);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() || {} : {};
  const stats = publicStats(data);
  if (!snap.exists || data.schemaVersion !== 1 || data.baseHp == null || data.baseDp == null || data.baseLuck == null) {
    await ref.set({
      schemaVersion: 1,
      baseHp: stats.base.hp,
      baseDp: stats.base.dp,
      baseLuck: stats.base.luck,
      bonusHp: stats.bonus.hp,
      bonusDp: stats.bonus.dp,
      bonusLuck: stats.bonus.luck,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  return stats;
}
function releasedStarterKeys() {
  const keys = Array.isArray(catalog.system?.releasedStarterKeys) ? catalog.system.releasedStarterKeys : [];
  return [...new Set(keys.filter((key) => isKnownKey(key)))];
}
async function ensureReleasedStarterBackfill(uid) {
  const keys = releasedStarterKeys();
  if (!keys.length) return false;
  const userRef = db.doc(`users/${uid}`);
  const rolloutRef = db.doc(`users/${uid}/game/overdriveStarterRolloutV1`);
  return db.runTransaction(async (tx) => {
    const [userSnap, rolloutSnap] = await Promise.all([tx.get(userRef), tx.get(rolloutRef)]);
    if (!userSnap.exists) return false;

    const prior = rolloutSnap.exists ? rolloutSnap.data() || {} : null;
    let eligible = prior ? prior.eligible === true : false;
    if (!prior) {
      const createdAt = userSnap.data()?.createdAt;
      const createdMs = createdAt && typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : Number.POSITIVE_INFINITY;
      eligible = Number.isFinite(createdMs) && createdMs <= RELEASED_STARTER_BACKFILL_CUTOFF_MS;
    }

    const priorKeys = new Set(Array.isArray(prior?.releasedKeys) ? prior.releasedKeys.filter((key) => typeof key === 'string') : []);
    const newlyReleased = keys.filter((key) => !priorKeys.has(key));
    if (eligible) {
      for (const key of newlyReleased) {
        tx.set(db.doc(`users/${uid}/overdriveDice/${key}`), {
          key,
          source: 'legacy-starter-rollout',
          starter: true,
          acquisitionGroup: 'starter-overdrive-v1',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    if (!prior || newlyReleased.length || JSON.stringify([...priorKeys]) !== JSON.stringify(keys)) {
      tx.set(rolloutRef, {
        schemaVersion: 1,
        eligible,
        releasedKeys: keys,
        newlyReleasedKeys: newlyReleased,
        cutoffMs: RELEASED_STARTER_BACKFILL_CUTOFF_MS,
        appliedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return eligible;
  });
}
async function readOwnedKeys(uid) {
  const snap = await db.collection(`users/${uid}/overdriveDice`).get();
  return snap.docs
    .map((doc) => doc.data()?.key || doc.id)
    .filter((key) => isKnownKey(key));
}
async function validateOwnedSlots(tx, uid, slots) {
  const equipped = slots.filter(Boolean);
  if (!equipped.length) return;
  const snaps = await Promise.all(equipped.map((slot) => tx.get(db.doc(`users/${uid}/overdriveDice/${slot.key}`))));
  snaps.forEach((snap, index) => {
    const key = equipped[index].key;
    const storedKey = snap.exists ? (snap.data()?.key || snap.id) : null;
    if (!snap.exists || storedKey !== key) {
      throw new HttpsError('failed-precondition', 'Every equipped Overdrive Die must be owned by this account.');
    }
  });
}
async function readOverdriveState(uid) {
  const gameRef = db.doc(`users/${uid}/game/state`);
  const [gameSnap, playerStats] = await Promise.all([
    gameRef.get(),
    ensurePlayerStats(uid),
  ]);
  if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
  await ensureReleasedStarterBackfill(uid);
  const ownedKeys = await readOwnedKeys(uid);
  const game = gameSnap.data() || {};
  const count = deckCount(game);
  const refs = Array.from({ length: count }, (_, index) => db.doc(`users/${uid}/overdriveDecks/deck-${index}`));
  const snaps = await Promise.all(refs.map((ref) => ref.get()));
  return {
    schemaVersion: 1,
    activeDeckIdx: activeDeckIndex(game, count),
    deckCount: count,
    decks: snaps.map((snap, index) => ({
      index,
      slots: publicSlots(snap.exists ? snap.data()?.slots : null),
    })),
    ownedKeys,
    playerStats,
    system: catalog.system || {},
  };
}

exports.getOverdriveStateV1 = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  return { ok: true, overdrive: await readOverdriveState(auth.uid) };
});

exports.saveOverdriveDeckV1 = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const index = Number(request.data?.index);
  const slots = normalizeSlots(request.data?.slots);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const deckRef = db.doc(`users/${auth.uid}/overdriveDecks/deck-${index}`);
  await db.runTransaction(async (tx) => {
    const [gameSnap, deckSnap] = await Promise.all([tx.get(gameRef), tx.get(deckRef)]);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
    const count = deckCount(gameSnap.data() || {});
    if (!Number.isSafeInteger(index) || index < 0 || index >= count) {
      throw new HttpsError('invalid-argument', 'That deck slot is unavailable.');
    }
    await validateOwnedSlots(tx, auth.uid, slots);
    const revision = Number.isSafeInteger(deckSnap.data()?.revision) ? deckSnap.data().revision + 1 : 1;
    tx.set(deckRef, {
      schemaVersion: 1,
      index,
      slots,
      revision,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return { ok: true, overdrive: await readOverdriveState(auth.uid) };
});
