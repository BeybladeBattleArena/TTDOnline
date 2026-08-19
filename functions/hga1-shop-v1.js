'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { randomUUID } = require('node:crypto');
const catalog = require('./dicefile.generated.json');

const db = getFirestore();
const REGION = 'us-central1';
const HGA1_CODES = Object.freeze({
  'TTD-HGA1-C1': 1,
  'TTD-HGA1-C2': 2,
  'TTD-HGA1-C3': 3,
  'TTD-HGA1-C4': 4,
  'TTD-HGA1-C5': 5,
  'TTD-HGA1-C6': 6,
  'TTD-HGA1-C7': 7,
});

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}

function normalizeCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '').slice(0, 120);
}

function publicGameState(data) {
  if (!data || typeof data !== 'object') throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
  const pips = data.economy?.pips;
  const astras = data.economy?.astras;
  const activeDeckIdx = Number(data.v6ActiveDeckIdx ?? data.activeDeckIdx ?? 0);
  if (!Number.isSafeInteger(pips) || pips < 0 || !Number.isSafeInteger(astras) || astras < 0) {
    throw new HttpsError('internal', 'The online economy state is invalid.');
  }
  return {
    schemaVersion: Number(data.schemaVersion || 1),
    revision: Number.isSafeInteger(data.revision) ? data.revision : 1,
    accountGeneration: Number(data.accountGeneration || 1),
    inventoryVersion: Number(data.inventoryVersion || 1),
    decksVersion: Number(data.decksVersion || 1),
    activeDeckIdx: Number.isSafeInteger(activeDeckIdx) ? activeDeckIdx : 0,
    deckCount: Number(data.deckCount || 3),
    economy: { pips, astras },
  };
}

function makeDieInstance(cls = 1) {
  return {
    id: `d${randomUUID().replaceAll('-', '')}`,
    cls,
    enchants: [null, null, null, null],
  };
}

function catalogDie(key) {
  const die = catalog.dice?.[key];
  if (!die || typeof die !== 'object' || typeof die.rarity !== 'string') {
    throw new HttpsError('not-found', 'That die does not exist in the current catalog.');
  }
  return die;
}

function writeGrantedDie(tx, uid, key, die, instance, source, receiptId) {
  const dieRef = db.doc(`users/${uid}/dice/${instance.id}`);
  tx.set(dieRef, {
    id: instance.id,
    key,
    rarity: die.rarity,
    cls: instance.cls,
    enchants: instance.enchants,
    source,
    receiptId,
    catalogVersion: catalog.catalogVersion || null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

exports.purchaseShopDie = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const key = String(request.data?.key || '').trim().toLowerCase();
  if (!/^[a-z0-9]+$/.test(key)) throw new HttpsError('invalid-argument', 'Invalid shop die key.');

  const die = catalogDie(key);
  const cost = Number(die.shopCostPips);
  if (!Number.isSafeInteger(cost) || cost <= 0) throw new HttpsError('failed-precondition', 'That die is not sold directly in the shop.');

  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  const instance = makeDieInstance(1);
  let nextState = null;

  await db.runTransaction(async (tx) => {
    const gameSnap = await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
    const current = publicGameState(gameSnap.data());
    if (current.economy.pips < cost) throw new HttpsError('failed-precondition', `Not enough Pips. ${die.name} costs ${cost.toLocaleString()} Pips.`);

    nextState = {
      ...current,
      revision: current.revision + 1,
      inventoryVersion: current.inventoryVersion + 1,
      economy: { pips: current.economy.pips - cost, astras: current.economy.astras },
    };

    tx.update(gameRef, {
      economy: nextState.economy,
      revision: nextState.revision,
      inventoryVersion: nextState.inventoryVersion,
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeGrantedDie(tx, auth.uid, key, die, instance, 'shop', receiptRef.id);
    tx.set(receiptRef, {
      operation: 'shop_die',
      key,
      cls: 1,
      costPips: cost,
      instanceId: instance.id,
      catalogVersion: catalog.catalogVersion || null,
      balanceBefore: current.economy.pips,
      balanceAfter: nextState.economy.pips,
      stateRevisionBefore: current.revision,
      stateRevisionAfter: nextState.revision,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    ok: true,
    receiptId: receiptRef.id,
    costPips: cost,
    gameState: nextState,
    grant: { key, rarity: die.rarity, instance },
    catalogVersion: catalog.catalogVersion || null,
  };
});

exports.redeemHga1ClassCode = onCall({ region: REGION, timeoutSeconds: 30 }, async (request) => {
  const auth = requireAuth(request);
  const code = normalizeCode(request.data?.code);
  const cls = HGA1_CODES[code];
  if (!cls) throw new HttpsError('not-found', 'That HG-A1 class code is not valid.');

  const key = 'hga1';
  const die = catalogDie(key);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const redemptionRef = db.doc(`users/${auth.uid}/redemptions/hga1_class_${cls}`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  const instance = makeDieInstance(cls);
  let nextState = null;

  await db.runTransaction(async (tx) => {
    const [gameSnap, redemptionSnap] = await Promise.all([tx.get(gameRef), tx.get(redemptionRef)]);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition', 'The online game profile is not initialized.');
    if (redemptionSnap.exists) throw new HttpsError('already-exists', `This account already redeemed the HG-A1 C${cls} code.`);

    const current = publicGameState(gameSnap.data());
    nextState = {
      ...current,
      revision: current.revision + 1,
      inventoryVersion: current.inventoryVersion + 1,
    };

    tx.update(gameRef, {
      revision: nextState.revision,
      inventoryVersion: nextState.inventoryVersion,
      updatedAt: FieldValue.serverTimestamp(),
    });
    writeGrantedDie(tx, auth.uid, key, die, instance, 'hga1_class_code', receiptRef.id);
    tx.set(redemptionRef, {
      code,
      key,
      cls,
      receiptId: receiptRef.id,
      redeemedAt: FieldValue.serverTimestamp(),
    });
    tx.set(receiptRef, {
      operation: 'hga1_class_code',
      code,
      key,
      cls,
      instanceId: instance.id,
      catalogVersion: catalog.catalogVersion || null,
      stateRevisionBefore: current.revision,
      stateRevisionAfter: nextState.revision,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return {
    ok: true,
    receiptId: receiptRef.id,
    label: `HG-A1 C${cls}`,
    gameState: nextState,
    grant: { key, rarity: die.rarity, instance },
    catalogVersion: catalog.catalogVersion || null,
  };
});
