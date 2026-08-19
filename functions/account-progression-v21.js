const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const progression = require('./account-progression-core-v21');

const db = getFirestore();
const REGION = 'us-central1';

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
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
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge:true });
  }
  return level;
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
