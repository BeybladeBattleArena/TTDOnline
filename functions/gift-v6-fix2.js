const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('node:crypto');

const db = getFirestore();
const REGION = 'us-central1';
const ELEMENTS = ['fire','ice','wind','lightning','water','earth','metal','nature','poison','holy','shadow','arcane'];
const JEWELS = new Set([
  'power','cooldown','physDef','specDef','hp','critChance','critBoost','spGen','experience','luck','insight','potency',
  ...ELEMENTS.map((element) => `elem_${element}`),
]);
const DICE = new Map([
  ...['fire','ice','wind','poison','broken'].map((key) => [key,'common']),
  ...['electric','iron','arrow','light','crack','magnet','shuriken'].map((key) => [key,'rare']),
  ...['laser','teleport','mine','mimic','absorb','goldrush','blackwind','bubble','haunt','bubblebeam','devilshadow'].map((key) => [key,'unique']),
  ...['growth','joker','gun','blizzard','nuclear','luckylucky','heavensfist','asclepius','comet','hitman','crossinggate','bruteforceblizzard'].map((key) => [key,'legendary']),
]);

// Development/test codes intentionally live in source so a clean Firebase project
// has useful economy and jewel smoke-test grants without a manual Firestore seed.
// Each code is still one-time-per-account through users/{uid}/redemptions/{hash}.
const BUILTIN_GIFT_CODES = Object.freeze({
  'TTD-PIPS-2500': {
    label:'2,500 Pip Test Grant',
    reward:{ pips:2500 },
  },
  'TTD-PIPS-10000': {
    label:'10,000 Pip Test Grant',
    reward:{ pips:10000 },
  },
  'TTD-JEWEL-POWER': {
    label:'Power Jewel Test Grant',
    reward:{ jewels:[{ jewelId:'power', tier:3 }] },
  },
  'TTD-JEWEL-LUCK': {
    label:'Luck Jewel Test Grant',
    reward:{ jewels:[{ jewelId:'luck', tier:3 }] },
  },
  'TTD-JEWEL-ELEMENTS': {
    label:'Element Jewel Test Pack',
    reward:{ jewels:[
      { jewelId:'elem_fire', tier:2 },
      { jewelId:'elem_ice', tier:2 },
      { jewelId:'elem_wind', tier:2 },
      { jewelId:'elem_lightning', tier:2 },
    ] },
  },
});

function authOf(request) {
  if (!request.auth) throw new HttpsError('unauthenticated','Authentication required.');
  return request.auth;
}
function id(prefix) { return prefix + crypto.randomBytes(12).toString('hex'); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function code(value) { return String(value || '').trim().toUpperCase().replace(/\s+/g,'').slice(0,120); }
function gp(game) { return Number.isSafeInteger(game?.economy?.pips) ? game.economy.pips : 0; }
function ga(game) { return Number.isSafeInteger(game?.economy?.astras) ? game.economy.astras : 0; }
function slots(value) {
  const out = Array.isArray(value) ? value.slice(0,4) : [];
  while (out.length < 4) out.push(null);
  return out;
}
function deck(data,index) {
  const out = Array.isArray(data?.slots) ? data.slots.slice(0,5) : [];
  while (out.length < 5) out.push(null);
  return {
    index,
    slots:out.map((slot) => slot && typeof slot.key === 'string' && typeof slot.instId === 'string'
      ? { key:slot.key, instId:slot.instId } : null),
  };
}

async function snapshot(uid) {
  const [gameSnap,settingsSnap,favSnap,diceSnap,itemSnap,jewelSnap] = await Promise.all([
    db.doc(`users/${uid}/game/state`).get(),
    db.doc(`users/${uid}/game/settings`).get(),
    db.doc(`users/${uid}/game/favorites`).get(),
    db.collection(`users/${uid}/dice`).get(),
    db.collection(`users/${uid}/items`).get(),
    db.collection(`users/${uid}/jewels`).get(),
  ]);
  if (!gameSnap.exists) throw new HttpsError('failed-precondition','The online profile is not initialized.');
  const game = gameSnap.data();
  const deckCount = Math.max(3,Math.min(5,Number(game.deckCount || 3)));
  const activeDeckIdx = Number.isSafeInteger(game.v6ActiveDeckIdx)
    ? game.v6ActiveDeckIdx
    : Math.min(2,Number(game.activeDeckIdx || 0));
  const deckSnaps = await Promise.all(Array.from({length:deckCount},(_,i)=>db.doc(`users/${uid}/decks/deck-${i}`).get()));
  const rewards = [], materials = [], enchant = [];
  for (const doc of itemSnap.docs) {
    const item = doc.data();
    if (item.kind === 'key') rewards.push({
      id:doc.id,type:'key',difficultyKey:item.difficultyKey,
      difficultyLabel:String(item.difficultyKey||'').replace(/^./,(c)=>c.toUpperCase()),
      name:item.name||'Chest Key',desc:item.desc||'',count:Number(item.count||0),ts:Date.now(),
    });
    else if (item.kind === 'chest') rewards.push({
      id:doc.id,type:'chest',chestKey:'frozen_island',name:'Frozen Island Chest',desc:item.desc||'',
      difficultyKey:item.difficultyKey,difficultyLabel:String(item.difficultyKey||'').replace(/^./,(c)=>c.toUpperCase()),ts:Date.now(),
    });
    else if (item.kind === 'card') enchant.push({id:doc.id,kind:'card',cardId:item.cardId,count:Number(item.count||0),ts:Date.now()});
    else if (item.kind === 'material') materials.push({id:doc.id,...item});
  }
  for (const doc of jewelSnap.docs) {
    const jewel = doc.data();
    if (jewel.kind === 'jewel' && !jewel.socketedIn && JEWELS.has(jewel.jewelId)) {
      enchant.push({kind:'jewel',id:doc.id,jewelId:jewel.jewelId,tier:jewel.tier});
    }
  }
  return {
    gameState:{
      schemaVersion:Number(game.schemaVersion||1),revision:Number(game.revision||1),
      economy:{pips:gp(game),astras:ga(game)},activeDeckIdx,deckCount,
    },
    dice:diceSnap.docs.map((doc)=>{const die=doc.data();return{
      key:die.key,rarity:die.rarity||DICE.get(die.key)||'common',source:die.source||null,
      instance:{id:doc.id,cls:die.cls,enchants:slots(die.enchants)},
    };}),
    decks:deckSnaps.map((snap,i)=>deck(snap.exists?snap.data():null,i)),
    favorites:Array.isArray(favSnap.data()?.instanceIds)?favSnap.data().instanceIds.slice(0,10):[],
    settings:{showDamageNumbers:settingsSnap.data()?.showDamageNumbers!==false},
    inventory:{rewards,materials,enchant},
  };
}

function rewardOf(raw = {}) {
  return {
    pips:Math.max(0,Math.min(1000000,Number.isSafeInteger(raw.pips)?raw.pips:0)),
    astras:Math.max(0,Math.min(100000,Number.isSafeInteger(raw.astras)?raw.astras:0)),
    dice:Array.isArray(raw.dice)?raw.dice.slice(0,20):[],
    jewels:Array.isArray(raw.jewels)?raw.jewels.slice(0,50):[],
    keys:raw.keys&&typeof raw.keys==='object'?raw.keys:{},
    cards:raw.cards&&typeof raw.cards==='object'?raw.cards:{},
  };
}

exports.redeemOnlineGiftCode = onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  const auth = authOf(request);
  const plain = code(request.data?.code);
  if (!plain) throw new HttpsError('invalid-argument','Enter a gift code.');

  const giftHash = hash(plain);
  const builtin = BUILTIN_GIFT_CODES[plain] || null;
  const codeRef = db.doc(`giftCodes/${giftHash}`);
  const redemptionRef = db.doc(`users/${auth.uid}/redemptions/${giftHash}`);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const transactionRef = db.collection(`users/${auth.uid}/transactions`).doc();
  const keyRefs = ['normal','hard','hell'].map((difficulty)=>db.doc(`users/${auth.uid}/items/key_${difficulty}`));
  const cardRefs = ['lesser','master'].map((cardId)=>db.doc(`users/${auth.uid}/items/card_${cardId}`));
  let summary;

  await db.runTransaction(async(tx)=>{
    const reads = [tx.get(redemptionRef),tx.get(gameRef),...keyRefs.map((ref)=>tx.get(ref)),...cardRefs.map((ref)=>tx.get(ref))];
    if (!builtin) reads.unshift(tx.get(codeRef));
    const snaps = await Promise.all(reads);

    let cursor = 0;
    let codeData = builtin ? { active:true, label:builtin.label, reward:builtin.reward, maxRedemptions:0, redeemedCount:0 } : snaps[cursor++].data();
    const redemptionSnap = snaps[cursor++];
    const gameSnap = snaps[cursor++];
    const inventorySnaps = snaps.slice(cursor);

    if (!builtin) {
      const codeSnap = snaps[0];
      if (!codeSnap.exists || codeData?.active !== true) throw new HttpsError('not-found','That online gift code is not valid.');
    }
    if (redemptionSnap.exists) throw new HttpsError('already-exists','This account already redeemed that gift code.');
    if (codeData.expiresAt?.toMillis?.() && codeData.expiresAt.toMillis() < Date.now()) throw new HttpsError('failed-precondition','That gift code has expired.');
    const max = Number(codeData.maxRedemptions || 0);
    const used = Number(codeData.redeemedCount || 0);
    if (max > 0 && used >= max) throw new HttpsError('resource-exhausted','That gift code has reached its redemption limit.');
    if (!gameSnap.exists) throw new HttpsError('failed-precondition','The online profile is not initialized.');

    const reward = rewardOf(codeData.reward);
    const game = gameSnap.data();
    const outDice = [];
    const outJewels = [];

    for (const spec of reward.dice) {
      const key = String(spec?.key || '');
      const rarity = DICE.get(key);
      if (!rarity) continue;
      const cls = Math.max(1,Math.min(10,Number.isSafeInteger(spec.cls)?spec.cls:1));
      const dieId = id('d');
      outDice.push({key,rarity,instance:{id:dieId,cls,enchants:[null,null,null,null]}});
      tx.set(db.doc(`users/${auth.uid}/dice/${dieId}`),{
        id:dieId,key,rarity,source:builtin?'builtin_test_code':'gift_code',cls,enchants:[null,null,null,null],
        createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),
      });
    }
    for (const spec of reward.jewels) {
      const jewelId = String(spec?.jewelId || '');
      if (!JEWELS.has(jewelId)) continue;
      const tier = Math.max(1,Math.min(5,Number.isSafeInteger(spec.tier)?spec.tier:1));
      const jewelInstanceId = id('j');
      const jewel = {kind:'jewel',id:jewelInstanceId,jewelId,tier};
      outJewels.push(jewel);
      tx.set(db.doc(`users/${auth.uid}/jewels/${jewelInstanceId}`),{
        ...jewel,socketedIn:null,source:builtin?'builtin_test_code':'gift_code',
        createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp(),
      });
    }
    ['normal','hard','hell'].forEach((difficulty,i)=>{
      const add = Math.max(0,Math.min(99,Number(reward.keys[difficulty]||0)));
      if (!add) return;
      tx.set(keyRefs[i],{
        kind:'key',difficultyKey:difficulty,name:`Chest Key [${difficulty[0].toUpperCase()+difficulty.slice(1)}]`,
        count:Number(inventorySnaps[i].data()?.count||0)+add,updatedAt:FieldValue.serverTimestamp(),
      },{merge:true});
    });
    ['lesser','master'].forEach((cardId,i)=>{
      const add = Math.max(0,Math.min(99,Number(reward.cards[cardId]||0)));
      if (!add) return;
      tx.set(cardRefs[i],{
        kind:'card',cardId,name:cardId==='lesser'?'Lesser Enchant Card':'Master Enchant Card',
        count:Number(inventorySnaps[3+i].data()?.count||0)+add,updatedAt:FieldValue.serverTimestamp(),
      },{merge:true});
    });

    const revision = Number.isSafeInteger(game.revision)?game.revision+1:1;
    tx.update(gameRef,{
      economy:{pips:gp(game)+reward.pips,astras:ga(game)+reward.astras},revision,
      updatedAt:FieldValue.serverTimestamp(),
    });
    tx.set(redemptionRef,{
      codeHash:giftHash,label:String(codeData.label||'Gift Code').slice(0,80),
      builtin:!!builtin,redeemedAt:FieldValue.serverTimestamp(),
    });
    if (!builtin && max > 0) tx.update(codeRef,{redeemedCount:used+1,updatedAt:FieldValue.serverTimestamp()});
    tx.set(transactionRef,{
      operation:'gift_code',codeHash:giftHash,label:String(codeData.label||'').slice(0,80),builtin:!!builtin,
      pips:reward.pips,astras:reward.astras,dieIds:outDice.map((die)=>die.instance.id),
      jewelIds:outJewels.map((jewel)=>jewel.id),createdAt:FieldValue.serverTimestamp(),
    });
    summary={label:String(codeData.label||'Gift Code').slice(0,80),pips:reward.pips,astras:reward.astras,dice:outDice,jewels:outJewels};
  });

  return {ok:true,reward:summary,snapshot:await snapshot(auth.uid)};
});
