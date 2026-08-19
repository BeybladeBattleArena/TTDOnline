const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const progression = require('./account-progression-core-v21');

const db = getFirestore();
const REGION = 'us-central1';

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}
function safeRewardId(value) {
  const id = String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
  if (!id) throw new Error('Configured level rewards require a stable id.');
  return id;
}
function copyData(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : {};
}

async function ensureAccountLevel(uid) {
  const ref = db.doc(`users/${uid}/game/accountLevel`);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() || {} : {};
  const level = progression.publicLevel(existing);
  if (!snap.exists || existing.schemaVersion !== 21 || existing.level !== level.level) {
    await ref.set({
      schemaVersion: 21,
      xp: level.xp,
      level: level.level,
      claimedRewards:Array.isArray(existing.claimedRewards) ? existing.claimedRewards : [],
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge:true });
  }
  return level;
}

// Reward lists are empty today, but this executor is already wired for future per-level grants.
// Add descriptors to LEVEL_REWARDS in account-progression-core-v21.js; already-earned levels are
// idempotent because each descriptor is tracked by its level:id claim key.
function applyConfiguredLevelRewards(tx, uid, levels, claimedRewards = []) {
  const claimed = new Set(Array.isArray(claimedRewards) ? claimedRewards.filter((v) => typeof v === 'string') : []);
  const granted = [];
  let pipsDelta = 0;
  let astrasDelta = 0;

  for (const entry of progression.configuredRewardsForLevels(levels)) {
    const rewardId = safeRewardId(entry.id);
    const claimKey = `${entry.level}:${rewardId}`;
    if (claimed.has(claimKey)) continue;
    const kind = String(entry.kind || '').toLowerCase();
    const docId = `level_${entry.level}_${rewardId}`;

    if (kind === 'currency') {
      const amount = Math.max(0, Math.floor(Number(entry.amount) || 0));
      if (entry.currency === 'pips') pipsDelta += amount;
      else if (entry.currency === 'astras') astrasDelta += amount;
      else throw new Error(`Unsupported configured level currency: ${entry.currency}`);
    } else if (kind === 'item') {
      tx.set(db.doc(`users/${uid}/items/${safeRewardId(entry.itemId || docId)}`), {
        ...copyData(entry.data), source:'account_level', sourceLevel:entry.level,
        createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp(),
      }, { merge:true });
    } else if (kind === 'die') {
      tx.set(db.doc(`users/${uid}/dice/${safeRewardId(entry.dieId || docId)}`), {
        ...copyData(entry.data), source:'account_level', sourceLevel:entry.level,
        createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp(),
      }, { merge:true });
    } else if (kind === 'jewel') {
      tx.set(db.doc(`users/${uid}/jewels/${safeRewardId(entry.jewelId || docId)}`), {
        ...copyData(entry.data), source:'account_level', sourceLevel:entry.level,
        createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp(),
      }, { merge:true });
    } else if (kind === 'entitlement') {
      tx.set(db.doc(`users/${uid}/entitlements/${safeRewardId(entry.entitlementId || docId)}`), {
        ...copyData(entry.data), source:'account_level', sourceLevel:entry.level,
        grantedAt:FieldValue.serverTimestamp(),
      }, { merge:true });
    } else {
      throw new Error(`Unsupported configured level reward kind: ${entry.kind}`);
    }

    claimed.add(claimKey);
    granted.push({ ...entry, claimKey });
  }

  return { claimedRewards:[...claimed], grantedRewards:granted, pipsDelta, astrasDelta };
}

exports.getAccountProgressionV21 = onCall({ region:REGION }, async (request) => {
  const auth = requireAuth(request);
  const level = await ensureAccountLevel(auth.uid);
  return {
    ok:true,
    level,
    curve:progression.curveSummary(),
    rewardListings:Object.fromEntries(Array.from({ length:progression.LEVEL_CAP }, (_, index) => [index + 1, progression.configuredRewardsForLevel(index + 1)])),
  };
});

exports._ensureAccountLevel = ensureAccountLevel;
exports._applyConfiguredLevelRewards = applyConfiguredLevelRewards;
