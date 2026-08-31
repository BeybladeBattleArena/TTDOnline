'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const progression = require('./account-progression-core-v21');
const accountProgression = require('./account-progression-v21');

const db = getFirestore();
const REGION = 'us-central1';
const ITEM_SCHEMA = 1;
const SELL_OPERATIONS=Object.freeze({shop:{operation:'sell_shop_item'},inventory:{operation:'sell_inventory_item'}});

function pipVoucher(amount){
  return Object.freeze({
    name:`${amount.toLocaleString('en-US')} Pip Voucher`,
    category:'rewards',
    stackable:true,
    fixedSellValuePips:amount,
    rewardOnly:true,
  });
}

const ITEM_DEFS = Object.freeze({
  epic_summon_ticket:{name:'Epic Summon Ticket',category:'rewards',stackable:true},
  exp_tome:{name:'EXP Tome',category:'rewards',stackable:true,useXp:60},
  common_ore:{name:'Common Ore',category:'materials',stackable:true,rarityTarget:'common'},
  rare_ore:{name:'Rare Ore',category:'materials',stackable:true,rarityTarget:'rare'},
  unique_ore:{name:'Unique Ore',category:'materials',stackable:true,rarityTarget:'unique'},
  legendary_ore:{name:'Legendary Ore',category:'materials',stackable:true,rarityTarget:'legendary'},
  omni_ore:{name:'Omni Ore',category:'materials',stackable:true,rarityTarget:'omni'},
  mystery_chest:{name:'Mystery Chest',category:'rewards',shopCategory:'materials',stackable:true,costPips:3300,requiredKey:'mystery_key'},

  // Reward-only items can opt into the reusable fixed-value resale archetype without
  // becoming Shop merchandise. Any future item can use fixedSellValuePips the same way.
  pip_voucher_1000:pipVoucher(1000),
  pip_voucher_5000:pipVoucher(5000),
  pip_voucher_10000:pipVoucher(10000),
  pip_voucher_20000:pipVoucher(20000),
  pip_voucher_40000:pipVoucher(40000),
  pip_voucher_60000:pipVoucher(60000),
  pip_voucher_80000:pipVoucher(80000),
  pip_voucher_100000:pipVoucher(100000),
});

function requireAuth(request){
  if(!request.auth)throw new HttpsError('unauthenticated','Authentication required.');
  return request.auth;
}
function safeCount(value){return Math.max(0,Math.min(999999,Math.floor(Number(value)||0)));}

/**
 * Canonical Inventory-item resale archetype.
 *
 * 1) fixedSellValuePips: exact, author-specified Pips value. This is intentionally
 *    independent of Shop availability and is used by reward/event items such as
 *    Pip Vouchers.
 * 2) Shop merchandise without a fixed value keeps the established resale formulas:
 *    one-third of its Pip cost (floored) or Astra cost x 30 Pips.
 * 3) nonSellable always wins.
 */
function itemSellValuePips(def){
  if(!def||def.nonSellable===true)return null;
  const fixed=Number(def.fixedSellValuePips);
  if(Number.isSafeInteger(fixed)&&fixed>=0)return fixed;
  const pips=Number(def.costPips),astras=Number(def.costAstras);
  if(Number.isSafeInteger(pips)&&pips>=0)return Math.floor(pips/3);
  if(Number.isSafeInteger(astras)&&astras>=0)return astras*30;
  return null;
}
function publicGameState(data){
  if(!data||typeof data!=='object')throw new HttpsError('failed-precondition','The online game profile is not initialized.');
  const pips=Number(data.economy?.pips),astras=Number(data.economy?.astras);
  if(!Number.isSafeInteger(pips)||pips<0||!Number.isSafeInteger(astras)||astras<0)throw new HttpsError('internal','The online economy state is invalid.');
  return {
    schemaVersion:Number(data.schemaVersion||1),
    revision:Number.isSafeInteger(data.revision)?data.revision:1,
    accountGeneration:Number(data.accountGeneration||1),
    inventoryVersion:Number(data.inventoryVersion||1),
    decksVersion:Number(data.decksVersion||1),
    activeDeckIdx:Number(data.v6ActiveDeckIdx??data.activeDeckIdx??0),
    deckCount:Number(data.deckCount||3),
    economy:{pips,astras},
  };
}
function publicItem(id,data={}){
  const def=ITEM_DEFS[id];if(!def)return null;
  const sellValuePips=itemSellValuePips(def);
  return {
    id,
    name:def.name,
    category:def.category,
    count:safeCount(data.count),
    schemaVersion:ITEM_SCHEMA,
    updatedAtMs:Number(data.updatedAtMs||0),
    shopPurchased:!!def.shopCategory,
    sellable:sellValuePips!=null,
    sellValuePips:sellValuePips??0,
  };
}
async function readItems(uid){
  const snap=await db.collection(`users/${uid}/items`).get();
  const byId=new Map(snap.docs.map(doc=>[doc.id,doc.data()||{}]));
  return Object.keys(ITEM_DEFS).map(id=>publicItem(id,byId.get(id)||{})).filter(item=>item&&item.count>0);
}

exports.getItemInventoryV1=onCall({region:REGION},async(request)=>{
  const auth=requireAuth(request);
  return {ok:true,schemaVersion:ITEM_SCHEMA,items:await readItems(auth.uid)};
});

exports.purchaseMysteryChestV1=onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  const auth=requireAuth(request),def=ITEM_DEFS.mystery_chest,cost=def.costPips;
  const gameRef=db.doc(`users/${auth.uid}/game/state`),itemRef=db.doc(`users/${auth.uid}/items/mystery_chest`),receiptRef=db.collection(`users/${auth.uid}/transactions`).doc();
  let nextState=null,nextCount=0;
  await db.runTransaction(async tx=>{
    const [gameSnap,itemSnap]=await Promise.all([tx.get(gameRef),tx.get(itemRef)]);
    if(!gameSnap.exists)throw new HttpsError('failed-precondition','The online game profile is not initialized.');
    const current=publicGameState(gameSnap.data());
    if(current.economy.pips<cost)throw new HttpsError('failed-precondition',`Not enough Pips. Mystery Chest costs ${cost.toLocaleString()} Pips.`);
    nextCount=safeCount(itemSnap.exists?itemSnap.data()?.count:0)+1;
    nextState={...current,revision:current.revision+1,inventoryVersion:current.inventoryVersion+1,economy:{pips:current.economy.pips-cost,astras:current.economy.astras}};
    tx.update(gameRef,{economy:nextState.economy,revision:nextState.revision,inventoryVersion:nextState.inventoryVersion,updatedAt:FieldValue.serverTimestamp()});
    tx.set(itemRef,{schemaVersion:ITEM_SCHEMA,itemId:'mystery_chest',name:def.name,category:def.category,count:nextCount,source:'shop',updatedAt:FieldValue.serverTimestamp(),updatedAtMs:Date.now()},{merge:true});
    tx.set(receiptRef,{operation:'shop_item',itemId:'mystery_chest',quantity:1,costPips:cost,balanceBefore:current.economy.pips,balanceAfter:nextState.economy.pips,stateRevisionBefore:current.revision,stateRevisionAfter:nextState.revision,createdAt:FieldValue.serverTimestamp()});
  });
  return {ok:true,receiptId:receiptRef.id,costPips:cost,gameState:nextState,item:publicItem('mystery_chest',{count:nextCount,updatedAtMs:Date.now()})};
});

// Legacy callable name retained for existing clients; behavior is now the canonical generic
// Inventory-item sale path. Shop merchandise and reward-only fixed-value items use this same
// transaction authority.
exports.sellShopItemV1=onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  const auth=requireAuth(request),itemId=String(request.data?.itemId||''),def=ITEM_DEFS[itemId];
  const sellValuePips=itemSellValuePips(def);
  if(!def||sellValuePips==null)throw new HttpsError('invalid-argument','That item is not sellable.');
  const gameRef=db.doc(`users/${auth.uid}/game/state`),itemRef=db.doc(`users/${auth.uid}/items/${itemId}`),receiptRef=db.collection(`users/${auth.uid}/transactions`).doc();
  let nextState=null,nextCount=0;
  await db.runTransaction(async tx=>{
    const [gameSnap,itemSnap]=await Promise.all([tx.get(gameRef),tx.get(itemRef)]);
    if(!gameSnap.exists)throw new HttpsError('failed-precondition','The online game profile is not initialized.');
    const current=publicGameState(gameSnap.data()),currentCount=safeCount(itemSnap.exists?itemSnap.data()?.count:0);
    if(currentCount<1)throw new HttpsError('failed-precondition',`You do not have a ${def.name} to sell.`);
    nextCount=currentCount-1;
    nextState={...current,revision:current.revision+1,inventoryVersion:current.inventoryVersion+1,economy:{pips:current.economy.pips+sellValuePips,astras:current.economy.astras}};
    tx.update(gameRef,{economy:nextState.economy,revision:nextState.revision,inventoryVersion:nextState.inventoryVersion,updatedAt:FieldValue.serverTimestamp()});
    tx.set(itemRef,{schemaVersion:ITEM_SCHEMA,itemId,name:def.name,category:def.category,count:nextCount,updatedAt:FieldValue.serverTimestamp(),updatedAtMs:Date.now()},{merge:true});
    tx.set(receiptRef,{
      operation:def.shopCategory?SELL_OPERATIONS.shop.operation:SELL_OPERATIONS.inventory.operation,
      sellArchetype:Number.isSafeInteger(Number(def.fixedSellValuePips))?'fixed_pips':'shop_resale',
      itemId,
      quantity:1,
      sellValuePips,
      balanceBefore:current.economy.pips,
      balanceAfter:nextState.economy.pips,
      stateRevisionBefore:current.revision,
      stateRevisionAfter:nextState.revision,
      createdAt:FieldValue.serverTimestamp(),
    });
  });
  return {ok:true,receiptId:receiptRef.id,itemId,sellValuePips,remaining:nextCount,gameState:nextState,item:publicItem(itemId,{count:nextCount,updatedAtMs:Date.now()})};
});

exports.useExpTomeV1=onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  const auth=requireAuth(request),uid=auth.uid,def=ITEM_DEFS.exp_tome;
  const itemRef=db.doc(`users/${uid}/items/exp_tome`),levelRef=db.doc(`users/${uid}/game/accountLevel`),gameRef=db.doc(`users/${uid}/game/state`),receiptRef=db.collection(`users/${uid}/transactions`).doc();
  let level=null,remaining=0,nextGameState=null,levelsGained=[];
  await db.runTransaction(async tx=>{
    const [itemSnap,levelSnap,gameSnap]=await Promise.all([tx.get(itemRef),tx.get(levelRef),tx.get(gameRef)]);
    const currentCount=safeCount(itemSnap.exists?itemSnap.data()?.count:0);
    if(currentCount<1)throw new HttpsError('failed-precondition','You do not have an EXP Tome to use.');
    if(!gameSnap.exists)throw new HttpsError('failed-precondition','The online game profile is not initialized.');
    const currentGame=publicGameState(gameSnap.data()),levelData=levelSnap.exists?(levelSnap.data()||{}):{};
    const oldXp=Math.max(0,Math.floor(Number(levelData.xp)||0)),newXp=oldXp+def.useXp;
    level=progression.publicLevel({xp:newXp});levelsGained=progression.levelsCrossed(oldXp,newXp);
    const rewardResult=accountProgression._applyConfiguredLevelRewards(tx,uid,levelsGained,Array.isArray(levelData.claimedRewards)?levelData.claimedRewards:[]);
    remaining=currentCount-1;
    tx.set(itemRef,{schemaVersion:ITEM_SCHEMA,itemId:'exp_tome',name:def.name,category:def.category,count:remaining,updatedAt:FieldValue.serverTimestamp(),updatedAtMs:Date.now()},{merge:true});
    tx.set(levelRef,{schemaVersion:21,xp:level.xp,level:level.level,claimedRewards:rewardResult.claimedRewards,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    const pipsDelta=Math.max(0,Math.floor(Number(rewardResult.pipsDelta)||0)),astrasDelta=Math.max(0,Math.floor(Number(rewardResult.astrasDelta)||0));
    nextGameState={...currentGame,revision:currentGame.revision+1,inventoryVersion:currentGame.inventoryVersion+1,economy:{pips:currentGame.economy.pips+pipsDelta,astras:currentGame.economy.astras+astrasDelta}};
    tx.update(gameRef,{economy:nextGameState.economy,revision:nextGameState.revision,inventoryVersion:nextGameState.inventoryVersion,updatedAt:FieldValue.serverTimestamp()});
    tx.set(receiptRef,{operation:'use_item',itemId:'exp_tome',quantity:1,xpGranted:def.useXp,oldXp,newXp,levelsGained,createdAt:FieldValue.serverTimestamp()});
  });
  return {ok:true,receiptId:receiptRef.id,xpGranted:def.useXp,remaining,level,levelsGained,gameState:nextGameState};
});

exports._ITEM_DEFS=ITEM_DEFS;
exports._itemSellValuePips=itemSellValuePips;
// Compatibility for older tests/internal callers that referenced the Shop-only helper name.
exports._shopSellValuePips=itemSellValuePips;
