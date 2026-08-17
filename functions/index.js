const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const REGION = 'us-central1';
const SAVE_KEY = 'RUNE-DICE-SAVE-v1';
const MAX_SAVE_CODE_CHARS = 900000;
const MAX_PROFILE_JSON_BYTES = 700000;

function requireAuth(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  return request.auth;
}

function checksumOf(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum = (sum + str.charCodeAt(i) * (i + 1)) % 999983;
  }
  return sum.toString(36);
}

function decodeLegacySaveCode(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new HttpsError('invalid-argument', 'A Rune Dice save code is required.');
  }
  const saveCode = raw.trim();
  if (saveCode.length > MAX_SAVE_CODE_CHARS) {
    throw new HttpsError('invalid-argument', 'The save code is too large.');
  }

  const parts = saveCode.split('-');
  if (parts.length < 3 || parts[0] !== 'RDS1') {
    throw new HttpsError('invalid-argument', 'Unrecognized Rune Dice save code format.');
  }

  const checksum = parts[1];
  const b64 = parts.slice(2).join('-');
  let xored;
  try {
    xored = Buffer.from(b64, 'base64').toString('utf8');
  } catch (err) {
    throw new HttpsError('invalid-argument', 'The save code could not be decoded.');
  }

  let json = '';
  for (let i = 0; i < xored.length; i++) {
    json += String.fromCharCode(
      xored.charCodeAt(i) ^ SAVE_KEY.charCodeAt(i % SAVE_KEY.length),
    );
  }

  if (checksumOf(json) !== checksum) {
    throw new HttpsError(
      'invalid-argument',
      'The save code failed its integrity check and may be corrupted or edited.',
    );
  }

  if (Buffer.byteLength(json, 'utf8') > MAX_PROFILE_JSON_BYTES) {
    throw new HttpsError('invalid-argument', 'The decoded profile is too large.');
  }

  let profile;
  try {
    profile = JSON.parse(json);
  } catch (err) {
    throw new HttpsError('invalid-argument', 'The save code does not contain valid profile JSON.');
  }

  return validateLegacyProfile(profile);
}

function validateLegacyProfile(profile) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw new HttpsError('invalid-argument', 'The decoded save is not a valid profile object.');
  }
  if (!Number.isFinite(profile.gold) || profile.gold < 0) {
    throw new HttpsError('invalid-argument', 'The decoded profile has an invalid Pips balance.');
  }
  if (profile.astras != null && (!Number.isFinite(profile.astras) || profile.astras < 0)) {
    throw new HttpsError('invalid-argument', 'The decoded profile has an invalid Astras balance.');
  }
  if (!profile.owned || typeof profile.owned !== 'object' || Array.isArray(profile.owned)) {
    throw new HttpsError('invalid-argument', 'The decoded profile has invalid owned-dice data.');
  }
  if (!Array.isArray(profile.decks)) {
    throw new HttpsError('invalid-argument', 'The decoded profile has invalid deck data.');
  }

  // Compatibility import only. RDS1 was designed to catch corruption, not to
  // cryptographically prove that an offline profile was never edited.
  return profile;
}

function summarizeLegacyProfile(profile) {
  let dieInstances = 0;
  let socketedJewels = 0;
  let highestClass = 1;

  for (const instances of Object.values(profile.owned || {})) {
    if (!Array.isArray(instances)) continue;
    dieInstances += instances.length;
    for (const inst of instances) {
      if (!inst || typeof inst !== 'object') continue;
      if (Number.isFinite(inst.cls)) highestClass = Math.max(highestClass, inst.cls);
      if (Array.isArray(inst.enchants)) {
        socketedJewels += inst.enchants.filter(Boolean).length;
      }
    }
  }

  return {
    pips: Math.floor(profile.gold || 0),
    astras: Math.floor(profile.astras || 0),
    dieInstances,
    socketedJewels,
    highestClass,
    deckCount: profile.decks.length,
  };
}

exports.health = onCall({ region: REGION }, (request) => {
  const auth = requireAuth(request);
  return {
    ok: true,
    uid: auth.uid,
    service: 'ttd-online',
    schemaVersion: 1,
  };
});

exports.ensureProfile = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const ref = db.doc(`users/${auth.uid}`);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      schemaVersion: 1,
      uid: auth.uid,
      email: auth.token.email || null,
      displayName: auth.token.name || null,
      photoURL: auth.token.picture || null,
      providers: Object.keys(auth.token.firebase?.identities || {}),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      legacyImport: null,
      migrationStatus: 'new',
    });
  } else {
    await ref.set({
      email: auth.token.email || null,
      displayName: auth.token.name || null,
      photoURL: auth.token.picture || null,
      providers: Object.keys(auth.token.firebase?.identities || {}),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  const current = (await ref.get()).data();
  return {
    ok: true,
    uid: auth.uid,
    migrationStatus: current?.migrationStatus || 'new',
    hasLegacyImport: !!current?.legacyImport,
  };
});

exports.importLegacySave = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const profile = decodeLegacySaveCode(request.data?.saveCode);
  const summary = summarizeLegacyProfile(profile);
  const userRef = db.doc(`users/${auth.uid}`);
  const legacyRef = db.doc(`users/${auth.uid}/legacy/profile`);

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const existing = userSnap.exists ? userSnap.data() : null;
    if (existing?.legacyImport?.locked === true) {
      throw new HttpsError(
        'failed-precondition',
        'A legacy profile has already been imported for this account.',
      );
    }

    tx.set(userRef, {
      schemaVersion: 1,
      uid: auth.uid,
      email: auth.token.email || null,
      displayName: auth.token.name || null,
      photoURL: auth.token.picture || null,
      providers: Object.keys(auth.token.firebase?.identities || {}),
      createdAt: existing?.createdAt || FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      legacyImport: {
        locked: true,
        importedAt: FieldValue.serverTimestamp(),
        source: 'rds1',
        trusted: false,
        summary,
      },
      migrationStatus: 'legacy-imported',
    }, { merge: true });

    tx.set(legacyRef, {
      schemaVersion: 33,
      importedAt: FieldValue.serverTimestamp(),
      source: 'rds1',
      trusted: false,
      summary,
      profile,
    });
  });

  return {
    ok: true,
    migrationStatus: 'legacy-imported',
    trusted: false,
    summary,
  };
});
