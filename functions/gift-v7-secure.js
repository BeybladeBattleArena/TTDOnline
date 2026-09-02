const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const catalog = require('./dicefile.generated.json');
const ITEM_DEFS = require('./items-v1')._ITEM_DEFS;

const db = getFirestore();
const REGION = 'us-central1';
const ELEMENTS = ['fire','ice','wind','lightning','water','earth','metal','nature','poison','holy','shadow','arcane'];
const JEWELS = new Set([
  'power','cooldown','physDef','specDef','hp','critChance','critBoost','spGen','experience','luck','insight','potency',
  ...ELEMENTS.map((element) => `elem_${element}`),
]);
const DICE = new Map(
  Object.entries(catalog.dice || {})
    .filter(([, die]) => die && typeof die.rarity === 'string')
    .map(([key, die]) => [key, die.rarity]),
);
const GIFT_ITEM_IDS = Object.freeze(
  Object.keys(ITEM_DEFS || {}).filter((itemId) => ITEM_DEFS[itemId]?.rewardOnly === true && ITEM_DEFS[itemId]?.stackable === true),
);
const PIP_VOUCHER_TEST_ITEMS = Object.freeze(Object.fromEntries(GIFT_ITEM_IDS.map((itemId) => [itemId, 1])));

// Readable development fixtures. These are intentionally not secret.
const DEV_CODES = Object.freeze({
  'TTD-PIPS-2500': { label:'2,500 Pip Test Grant', reward:{ pips:2500 } },
  'TTD-PIPS-10000': { label:'10,000 Pip Test Grant', reward:{ pips:10000 } },
  'TTD-PIP-VOUCHERS': { label:'Pip Voucher Test Pack', reward:{ items:PIP_VOUCHER_TEST_ITEMS } },
  'TTD-JEWEL-POWER': { label:'Power Jewel Test Grant', reward:{ jewels:[{ jewelId:'power', tier:3 }] } },
  'TTD-JEWEL-LUCK': { label:'Luck Jewel Test Grant', reward:{ jewels:[{ jewelId:'luck', tier:3 }] } },
  'TTD-JEWEL-ELEMENTS': {
    label:'Element Jewel Test Pack',
    reward:{ jewels:[
      { jewelId:'elem_fire', tier:2 }, { jewelId:'elem_ice', tier:2 },
      { jewelId:'elem_wind', tier:2 }, { jewelId:'elem_lightning', tier:2 },
    ] },
  },
  'TTD-SOUL-C1': { label:'Soul Scimitar C1 Test Grant', reward:{ dice:[{ key:'soulscimitar', cls:1 }] } },
  'TTD-SOUL-C2': { label:'Soul Scimitar C2 Test Grant', reward:{ dice:[{ key:'soulscimitar', cls:2 }] } },
  'TTD-SOUL-C3': { label:'Soul Scimitar C3 Test Grant', reward:{ dice:[{ key:'soulscimitar', cls:3 }] } },
  'TTD-SOUL-C4': { label:'Soul Scimitar C4 Test Grant', reward:{ dice:[{ key:'soulscimitar', cls:4 }] } },
  'TTD-SOUL-C5': { label:'Soul Scimitar C5 Test Grant', reward:{ dice:[{ key:'soulscimitar', cls:5 }] } },
  'TTD-SOUL-C6': { label:'Soul Scimitar C6 Test Grant', reward:{ dice:[{ key:'soulscimitar', cls:6 }] } },
  'TTD-SOUL-C7': { label:'Soul Scimitar C7 Test Grant', reward:{ dice:[{ key:'soulscimitar', cls:7 }] } },
  'TTD-SLITHER-C1': { label:'Slither Vine C1 Test Grant', reward:{ dice:[{ key:'slithervine', cls:1 }] } },
  'TTD-SLITHER-C2': { label:'Slither Vine C2 Test Grant', reward:{ dice:[{ key:'slithervine', cls:2 }] } },
  'TTD-SLITHER-C3': { label:'Slither Vine C3 Test Grant', reward:{ dice:[{ key:'slithervine', cls:3 }] } },
  'TTD-SLITHER-C4': { label:'Slither Vine C4 Test Grant', reward:{ dice:[{ key:'slithervine', cls:4 }] } },
  'TTD-SLITHER-C5': { label:'Slither Vine C5 Test Grant', reward:{ dice:[{ key:'slithervine', cls:5 }] } },
  'TTD-SLITHER-C6': { label:'Slither Vine C6 Test Grant', reward:{ dice:[{ key:'slithervine', cls:6 }] } },
  'TTD-SLITHER-C7': { label:'Slither Vine C7 Test Grant', reward:{ dice:[{ key:'slithervine', cls:7 }] } },
});

// Production promo definitions contain no plaintext player-facing code. The incoming
// normalized text is checked against a random salt + PBKDF2-SHA256 verifier.
const SECURE_PROMOS = Object.freeze([
  {
    id:'cd961223e832fb85bf344817',
    saltB64:'EImu2DVt5eaCNKbS7Iwq2g==',
    hashB64:'kpwrvAZrFTMf2oOWBuhCIB3yatQoaNw2WCEuZXYR3yc=',
    iterations:240000,
    label:'Promotional Pip Grant',
    reward:{ pips:5000 },
  },
  {
    id:'8a7ac78b8f59329180f3ed42',
    saltB64:'3m1S7d4wEN59N26ytdFdgw==',
    hashB64:'1qQK2TZDnoqH8tQPakk/cepJtc142DTF1KohvxkPrIk=',
    iterations:240000,
    label:'Promotional Elemental Jewel Pack',
    reward:{
      jewels:ELEMENTS.map((element) => ({ jewelId:`elem_${element}`, tier:1 })),
      cards:{ lesser:15 },
    },
  },
  {
    id:'34650fc245b4134efb5d4a91',
    saltB64:'K8scht/jyFF24pNJrQGEmg==',
    hashB64:'Qu6rITNHJWkTgTHdfjDm5krRGOZBlX9uR+t02Ju6aRo=',
    iterations:240000,
    label:'Chief Triple Jewel Pack',
    reward:{
      jewels:[...JEWELS].flatMap((jewelId) => Array.from({length:3}, () => ({jewelId,tier:1}))),
    },
  },
]);

function authOf(request) {
  if (!request.auth) throw new HttpsError('unauthenticated','Authentication required.');
  return request.auth;
}
function normalizeCode(value) { return String(value || '').trim().toUpperCase().replace(/\s+/g,'').slice(0,120); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function id(prefix) { return prefix + crypto.randomBytes(12).toString('hex'); }
function gp(game) { return Number.isSafeInteger(game?.economy?.pips) ? game.economy.pips : 0; }
function ga(game) { return Number.isSafeInteger(game?.economy?.astras) ? game.economy.astras : 0; }
function stackCount(value) { return Math.max(0,Math.min(999999,Math.floor(Number(value)||0))); }
function slots(value) { const out=Array.isArray(value)?value.slice(0,4):[]; while(out.length<4)out.push(null); return out; }
function deck(data,index) {
  const out=Array.isArray(data?.slots)?data.slots.slice(0,5):[]; while(out.length<5)out.push(null);
  return { index, slots:out.map((slot)=>slot&&typeof slot.key==='string'&&typeof slot.instId==='string'?{key:slot.key,instId:slot.instId}:null) };
}
function securePromoFor(plain) {
  const input = Buffer.from(plain,'utf8');
  for (const promo of SECURE_PROMOS) {
    const actual = crypto.pbkdf2Sync(input,Buffer.from(promo.saltB64,'base64'),promo.iterations,32,'sha256');
    const expected = Buffer.from(promo.hashB64,'base64');
    if (actual.length === expected.length && crypto.timingSafeEqual(actual,expected)) return promo;
  }
  return null;
}
function rewardItems(raw) {
  const source=raw&&typeof raw==='object'?raw:{};
  const items={};
  for(const itemId of GIFT_ITEM_IDS){
    const count=Math.max(0,Math.min(99,Math.floor(Number(source[itemId])||0)));
    if(count>0)items[itemId]=count;
  }
  return items;
}
function rewardOf(raw = {}) {
  return {
    pips:Math.max(0,Math.min(1000000,Number.isSafeInteger(raw.pips)?raw.pips:0)),
    astras:Math.max(0,Math.min(100000,Number.isSafeInteger(raw.astras)?raw.astras:0)),
    dice:Array.isArray(raw.dice)?raw.dice.slice(0,20):[],
    jewels:Array.isArray(raw.jewels)?raw.jewels.slice(0,100):[],
    keys:raw.keys&&typeof raw.keys==='object'?raw.keys:{},
    cards:raw.cards&&typeof raw.cards==='object'?raw.cards:{},
    items:rewardItems(raw.items),
  };
}

async function snapshot(uid) {
  const [gameSnap,settingsSnap,favSnap,diceSnap,itemSnap,jewelSnap] = await Promise.all([
    db.doc(`users/${uid}/game/state`).get(), db.doc(`users/${uid}/game/settings`).get(),
    db.doc(`users/${uid}/game/favorites`).get(), db.collection(`users/${uid}/dice`).get(),
    db.collection(`users/${uid}/items`).get(), db.collection(`users/${uid}/jewels`).get(),
  ]);
  if (!gameSnap.exists) throw new HttpsError('failed-precondition','The online profile is not initialized.');
  const game=gameSnap.data(), deckCount=Math.max(3,Math.min(5,Number(game.deckCount||3)));
  const activeDeckIdx=Number.isSafeInteger(game.v6ActiveDeckIdx)?game.v6ActiveDeckIdx:Math.min(2,Number(game.activeDeckIdx||0));
  const deckSnaps=await Promise.all(Array.from({length:deckCount},(_,i)=>db.doc(`users/${uid}/decks/deck-${i}`).get()));
  const rewards=[],materials=[],enchant=[];
  for (const doc of itemSnap.docs) {
    const item=doc.data();
    if(item.kind==='key')rewards.push({id:doc.id,type:'key',difficultyKey:item.difficultyKey,difficultyLabel:String(item.difficultyKey||'').replace(/^./,(c)=>c.toUpperCase()),name:item.name||'Chest Key',desc:item.desc||'',count:Number(item.count||0),ts:Date.now()});
    else if(item.kind==='chest')rewards.push({id:doc.id,type:'chest',chestKey:'frozen_island',name:'Frozen Island Chest',desc:item.desc||'',difficultyKey:item.difficultyKey,difficultyLabel:String(item.difficultyKey||'').replace(/^./,(c)=>c.toUpperCase()),ts:Date.now()});
    else if(item.kind==='card')enchant.push({id:doc.id,kind:'card',cardId:item.cardId,count:Number(item.count||0),ts:Date.now()});
    else if(item.kind==='material')materials.push({id:doc.id,...item});
  }
  for (const doc of jewelSnap.docs) {
    const jewel=doc.data();
    if(jewel.kind==='jewel'&&!jewel.socketedIn&&JEWELS.has(jewel.jewelId))enchant.push({kind:'jewel',id:doc.id,jewelId:jewel.jewelId,tier:jewel.tier});
  }
  return {
    gameState:{schemaVersion:Number(game.schemaVersion||1),revision:Number(game.revision||1),economy:{pips:gp(game),astras:ga(game)},activeDeckIdx,deckCount},
    dice:diceSnap.docs.map((doc)=>{const die=doc.data();return{key:die.key,rarity:die.rarity||DICE.get(die.key)||'common',source:die.source||null,instance:{id:doc.id,cls:die.cls,enchants:slots(die.enchants)}};}),
    decks:deckSnaps.map((snap,i)=>deck(snap.exists?snap.data():null,i)),
    favorites:Array.isArray(favSnap.data()?.instanceIds)?favSnap.data().instanceIds.slice(0,10):[],
    settings:{showDamageNumbers:settingsSnap.data()?.showDamageNumbers!==false}, inventory:{rewards,materials,enchant},
  };
}

exports.redeemOnlineGiftCode = onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  const auth=authOf(request), plain=normalizeCode(request.data?.code);
  if(!plain)throw new HttpsError('invalid-argument','Enter a gift code.');

  const secure=securePromoFor(plain), dev=secure?null:(DEV_CODES[plain]||null);
  const legacyHash=sha256(plain), codeRef=db.doc(`giftCodes/${legacyHash}`);
  const redemptionKey=secure?`promo_${secure.id}`:legacyHash;
  const redemptionRef=db.doc(`users/${auth.uid}/redemptions/${redemptionKey}`);
  const gameRef=db.doc(`users/${auth.uid}/game/state`), transactionRef=db.collection(`users/${auth.uid}/transactions`).doc();
  const keyRefs=['normal','hard','hell'].map((difficulty)=>db.doc(`users/${auth.uid}/items/key_${difficulty}`));
  const cardRefs=['lesser','master'].map((cardId)=>db.doc(`users/${auth.uid}/items/card_${cardId}`));
  const giftItemRefs=GIFT_ITEM_IDS.map((itemId)=>db.doc(`users/${auth.uid}/items/${itemId}`));
  let summary;

  await db.runTransaction(async(tx)=>{
    const builtin=secure||dev;
    const reads=[tx.get(redemptionRef),tx.get(gameRef),...keyRefs.map((ref)=>tx.get(ref)),...cardRefs.map((ref)=>tx.get(ref)),...giftItemRefs.map((ref)=>tx.get(ref))];
    if(!builtin)reads.unshift(tx.get(codeRef));
    const snaps=await Promise.all(reads); let cursor=0;
    let codeData=builtin?{active:true,label:builtin.label,reward:builtin.reward,maxRedemptions:0,redeemedCount:0}:snaps[cursor++].data();
    const redemptionSnap=snaps[cursor++], gameSnap=snaps[cursor++], inventorySnaps=snaps.slice(cursor);
    const keySnaps=inventorySnaps.slice(0,3),cardSnaps=inventorySnaps.slice(3,5),giftItemSnaps=inventorySnaps.slice(5);
    if(!builtin){const codeSnap=snaps[0];if(!codeSnap.exists||codeData?.active!==true)throw new HttpsError('not-found','That online gift code is not valid.');}
    if(redemptionSnap.exists)throw new HttpsError('already-exists','This account already redeemed that gift code.');
    if(codeData.expiresAt?.toMillis?.()&&codeData.expiresAt.toMillis()<Date.now())throw new HttpsError('failed-precondition','That gift code has expired.');
    const max=Number(codeData.maxRedemptions||0), used=Number(codeData.redeemedCount||0);
    if(max>0&&used>=max)throw new HttpsError('resource-exhausted','That gift code has reached its redemption limit.');
    if(!gameSnap.exists)throw new HttpsError('failed-precondition','The online profile is not initialized.');

    const reward=rewardOf(codeData.reward), game=gameSnap.data(), outDice=[], outJewels=[];
    for(const spec of reward.dice){const key=String(spec?.key||''),rarity=DICE.get(key);if(!rarity)continue;const cls=Math.max(1,Math.min(10,Number.isSafeInteger(spec.cls)?spec.cls:1)),dieId=id('d');outDice.push({key,rarity,instance:{id:dieId,cls,enchants:[null,null,null,null]}});tx.set(db.doc(`users/${auth.uid}/dice/${dieId}`),{id:dieId,key,rarity,source:secure?'secure_promo':dev?'builtin_test_code':'gift_code',cls,enchants:[null,null,null,null],createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});}
    for(const spec of reward.jewels){const jewelId=String(spec?.jewelId||'');if(!JEWELS.has(jewelId))continue;const tier=Math.max(1,Math.min(5,Number.isSafeInteger(spec.tier)?spec.tier:1)),jewelInstanceId=id('j'),jewel={kind:'jewel',id:jewelInstanceId,jewelId,tier};outJewels.push(jewel);tx.set(db.doc(`users/${auth.uid}/jewels/${jewelInstanceId}`),{...jewel,socketedIn:null,source:secure?'secure_promo':dev?'builtin_test_code':'gift_code',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});}
    ['normal','hard','hell'].forEach((difficulty,i)=>{const add=Math.max(0,Math.min(99,Number(reward.keys[difficulty]||0)));if(!add)return;tx.set(keyRefs[i],{kind:'key',difficultyKey:difficulty,name:`Chest Key [${difficulty[0].toUpperCase()+difficulty.slice(1)}]`,count:Number(keySnaps[i].data()?.count||0)+add,updatedAt:FieldValue.serverTimestamp()},{merge:true});});
    ['lesser','master'].forEach((cardId,i)=>{const add=Math.max(0,Math.min(99,Number(reward.cards[cardId]||0)));if(!add)return;tx.set(cardRefs[i],{kind:'card',cardId,name:cardId==='lesser'?'Lesser Enchant Card':'Master Enchant Card',count:Number(cardSnaps[i].data()?.count||0)+add,updatedAt:FieldValue.serverTimestamp()},{merge:true});});
    GIFT_ITEM_IDS.forEach((itemId,i)=>{
      const add=Number(reward.items[itemId]||0);if(!add)return;
      const def=ITEM_DEFS[itemId],current=stackCount(giftItemSnaps[i]?.data()?.count);
      tx.set(giftItemRefs[i],{schemaVersion:1,itemId,name:def.name,category:def.category,count:current+add,source:secure?'secure_promo':dev?'builtin_test_code':'gift_code',updatedAt:FieldValue.serverTimestamp(),updatedAtMs:Date.now()},{merge:true});
    });

    const revision=Number.isSafeInteger(game.revision)?game.revision+1:1;
    const itemGrantTotal=Object.values(reward.items).reduce((sum,count)=>sum+Number(count||0),0);
    const gamePatch={economy:{pips:gp(game)+reward.pips,astras:ga(game)+reward.astras},revision,updatedAt:FieldValue.serverTimestamp()};
    if(itemGrantTotal>0)gamePatch.inventoryVersion=(Number.isSafeInteger(game.inventoryVersion)?game.inventoryVersion:0)+1;
    tx.update(gameRef,gamePatch);
    tx.set(redemptionRef,{promoId:secure?secure.id:null,codeHash:secure?null:legacyHash,label:String(codeData.label||'Gift Code').slice(0,80),secure:!!secure,builtin:!!dev,redeemedAt:FieldValue.serverTimestamp()});
    if(!builtin&&max>0)tx.update(codeRef,{redeemedCount:used+1,updatedAt:FieldValue.serverTimestamp()});
    tx.set(transactionRef,{operation:'gift_code',promoId:secure?secure.id:null,codeHash:secure?null:legacyHash,label:String(codeData.label||'').slice(0,80),secure:!!secure,builtin:!!dev,pips:reward.pips,astras:reward.astras,dieIds:outDice.map((die)=>die.instance.id),jewelIds:outJewels.map((jewel)=>jewel.id),itemGrants:reward.items,createdAt:FieldValue.serverTimestamp()});
    summary={label:String(codeData.label||'Gift Code').slice(0,80),pips:reward.pips,astras:reward.astras,dice:outDice,jewels:outJewels,cards:{lesser:Number(reward.cards.lesser||0),master:Number(reward.cards.master||0)},items:Object.entries(reward.items).map(([itemId,count])=>({itemId,name:ITEM_DEFS[itemId]?.name||itemId,count}))};
  });
  return {ok:true,reward:summary,snapshot:await snapshot(auth.uid)};
});
