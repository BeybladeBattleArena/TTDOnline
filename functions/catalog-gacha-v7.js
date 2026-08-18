'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { randomInt, randomUUID } = require('node:crypto');
const catalog = require('./dicefile.generated.json');

const db = getFirestore();
const REGION = 'us-central1';
const GACHA_COSTS = Object.freeze({ 1: 120, 10: 1000 });
const RARITY_ORDER = Object.freeze(['common', 'rare', 'unique', 'legendary']);
const RARITY_THRESHOLDS = Object.freeze([
  ['common', 5500],
  ['rare', 8200],
  ['unique', 9500],
  ['legendary', 10000],
]);

function buildPools() {
  const pools = { common:[], rare:[], unique:[], legendary:[] };
  for (const [key, die] of Object.entries(catalog.dice || {})) {
    if (!die || die.chestExclusive) continue;
    if (pools[die.rarity]) pools[die.rarity].push(key);
  }
  for (const rarity of RARITY_ORDER) {
    if (!pools[rarity].length) throw new Error(`dicefile generated an empty ${rarity} gacha pool.`);
    Object.freeze(pools[rarity]);
  }
  return Object.freeze(pools);
}

const GACHA_POOLS = buildPools();

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}

function pickRarity() {
  const roll = randomInt(10000);
  for (const [rarity, ceiling] of RARITY_THRESHOLDS) if (roll < ceiling) return rarity;
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
  for (let i=0;i<count;i++) {
    let rarity = pickRarity();
    if (count===10 && i===9 && !hasUniquePlus && RARITY_ORDER.indexOf(rarity)<RARITY_ORDER.indexOf('unique')) {
      rarity='unique';
    }
    const pool=GACHA_POOLS[rarity];
    const key=pool[randomInt(pool.length)];
    const instance=newServerDieInstance();
    if (rarity==='unique' || rarity==='legendary') hasUniquePlus=true;
    results.push({key,rarity,instance});
  }
  return results;
}

function publicGameState(data) {
  if (!data || typeof data!=='object') throw new HttpsError('failed-precondition','The online game profile is not initialized.');
  const pips=data.economy?.pips;
  const astras=data.economy?.astras;
  const activeDeckIdx=Number(data.v6ActiveDeckIdx ?? data.activeDeckIdx ?? 0);
  if (!Number.isSafeInteger(pips) || pips<0 || !Number.isSafeInteger(astras) || astras<0) {
    throw new HttpsError('internal','The online economy state is invalid.');
  }
  return {
    schemaVersion:Number(data.schemaVersion||1),
    revision:Number.isSafeInteger(data.revision)?data.revision:1,
    accountGeneration:Number(data.accountGeneration||1),
    inventoryVersion:Number(data.inventoryVersion||1),
    decksVersion:Number(data.decksVersion||1),
    activeDeckIdx:Number.isSafeInteger(activeDeckIdx)?activeDeckIdx:0,
    deckCount:Number(data.deckCount||3),
    economy:{pips,astras},
  };
}

exports.gachaPull = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth=requireAuth(request);
  const count=Number(request.data?.count);
  if (count!==1 && count!==10) throw new HttpsError('invalid-argument','Gacha count must be exactly 1 or 10.');

  const cost=GACHA_COSTS[count];
  const results=buildGachaResults(count);
  const gameRef=db.doc(`users/${auth.uid}/game/state`);
  const receiptRef=db.collection(`users/${auth.uid}/transactions`).doc();
  let nextState=null;

  await db.runTransaction(async (tx) => {
    const gameSnap=await tx.get(gameRef);
    if (!gameSnap.exists) throw new HttpsError('failed-precondition','The online game profile is not initialized.');
    const current=publicGameState(gameSnap.data());
    if (current.economy.pips<cost) throw new HttpsError('failed-precondition',`Not enough Pips. This pull costs ${cost}.`);

    nextState={
      ...current,
      revision:current.revision+1,
      economy:{pips:current.economy.pips-cost,astras:current.economy.astras},
    };

    tx.update(gameRef,{
      economy:nextState.economy,
      revision:nextState.revision,
      updatedAt:FieldValue.serverTimestamp(),
    });

    for (const result of results) {
      const dieRef=db.doc(`users/${auth.uid}/dice/${result.instance.id}`);
      tx.set(dieRef,{
        id:result.instance.id,
        key:result.key,
        rarity:result.rarity,
        cls:result.instance.cls,
        enchants:result.instance.enchants,
        source:'gacha',
        receiptId:receiptRef.id,
        catalogVersion:catalog.catalogVersion||null,
        createdAt:FieldValue.serverTimestamp(),
      });
    }

    tx.set(receiptRef,{
      operation:'gacha',
      count,
      costPips:cost,
      catalogVersion:catalog.catalogVersion||null,
      balanceBefore:current.economy.pips,
      balanceAfter:nextState.economy.pips,
      stateRevisionBefore:current.revision,
      stateRevisionAfter:nextState.revision,
      results:results.map((result)=>({key:result.key,rarity:result.rarity,instanceId:result.instance.id})),
      createdAt:FieldValue.serverTimestamp(),
    });
  });

  return {
    ok:true,
    receiptId:receiptRef.id,
    count,
    costPips:cost,
    gameState:nextState,
    results,
    catalogVersion:catalog.catalogVersion||null,
  };
});
