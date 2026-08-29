'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const catalog = require('./dicefile.generated.json');

const db = getFirestore();
const REGION = 'us-central1';
const MIN_DECKS = 3;
const MAX_DECKS = 5;
const MAX_FAVORITES = 10;
const LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' });
const RARITY_BASE = Object.freeze({ common:25, rare:50, unique:100, legendary:150 });
const CLASS_SALE_MULT = Object.freeze({ 1:30, 2:45, 3:80, 4:100, 5:120, 6:140, 7:160 });

function requireAuth(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required.');
  return request.auth;
}
function clean(value, max=100) { return String(value == null ? '' : value).trim().slice(0,max); }
function canonicalKey(key) { return LEGACY_DIE_KEYS[key] || key; }
function knownKey(key) { return typeof key === 'string' && !!catalog.dice?.[canonicalKey(key)]; }
function deckCount(game={}) {
  const n=Number(game.deckCount||MIN_DECKS);
  return Number.isSafeInteger(n) ? Math.max(MIN_DECKS,Math.min(MAX_DECKS,n)) : MIN_DECKS;
}
function normalizeSlots(value) {
  const slots=Array.isArray(value)?value.slice(0,5):[];
  while(slots.length<5)slots.push(null);
  return slots.map(slot=>slot&&typeof slot==='object'&&typeof slot.key==='string'&&typeof slot.instId==='string'
    ? {key:canonicalKey(slot.key),instId:slot.instId}:null);
}
function normalizeEnchants(value) {
  const slots=Array.isArray(value)?value.slice(0,4):[];
  while(slots.length<4)slots.push(null);
  return slots.map(v=>v&&typeof v==='object'&&!Array.isArray(v)?JSON.parse(JSON.stringify(v)):null);
}
function publicJewel(value) {
  if (!value || typeof value!=='object' || typeof value.id!=='string' || !value.id || typeof value.jewelId!=='string' || !Number.isSafeInteger(value.tier)) {
    throw new HttpsError('internal','A socketed jewel is malformed.');
  }
  return {kind:'jewel',id:value.id,jewelId:value.jewelId,tier:value.tier};
}
function uniqueReturnedJewels(instances) {
  const byId=new Map();
  for(const instance of instances){
    for(const raw of normalizeEnchants(instance.enchants).filter(Boolean)){
      const jewel=publicJewel(raw);
      if(byId.has(jewel.id)) throw new HttpsError('internal','The same jewel is socketed into more than one die.');
      byId.set(jewel.id,jewel);
    }
  }
  return [...byId.values()];
}
function saleValue(rarity, cls) {
  const base=RARITY_BASE[String(rarity||'').toLowerCase()];
  const mult=CLASS_SALE_MULT[cls];
  return base && mult ? base*mult : null;
}
function resolveAlias(id, aliases) {
  const seen=new Set(); let current=id;
  while(aliases.has(current) && !seen.has(current)){seen.add(current);current=aliases.get(current);}
  return current;
}
function classCounts(rows) {
  const counts={};
  for(const row of rows){const c=Number(row.cls);counts[c]=(counts[c]||0)+1;}
  return counts;
}
function publicGameState(data={}) {
  return {
    revision:Number.isSafeInteger(data.revision)?data.revision:1,
    economy:{
      pips:Number.isSafeInteger(data.economy?.pips)?data.economy.pips:0,
      astras:Number.isSafeInteger(data.economy?.astras)?data.economy.astras:0,
    },
  };
}

exports.mergeAllDiceV1 = onCall({region:REGION,timeoutSeconds:60},async(request)=>{
  const auth=requireAuth(request);
  const key=canonicalKey(clean(request.data?.key,40));
  const scope=request.data?.scope==='class'?'class':'all';
  const requestedClass=scope==='class'?Number(request.data?.classLevel):null;
  if(!knownKey(key)) throw new HttpsError('invalid-argument','Choose a valid die from the collection.');
  if(scope==='class'&&(!Number.isSafeInteger(requestedClass)||requestedClass<1||requestedClass>=10)) {
    throw new HttpsError('invalid-argument','Only Classes 1 through 9 can be merged.');
  }

  const uid=auth.uid;
  const gameRef=db.doc(`users/${uid}/game/state`);
  const favRef=db.doc(`users/${uid}/game/favorites`);
  const socialRef=db.doc(`users/${uid}/game/social`);
  const publicRef=db.doc(`publicProfiles/${uid}`);
  const receiptRef=db.collection(`users/${uid}/transactions`).doc();
  let response=null;

  await db.runTransaction(async(tx)=>{
    const gameSnap=await tx.get(gameRef);
    if(!gameSnap.exists) throw new HttpsError('failed-precondition','The online game profile is not initialized.');
    const game=gameSnap.data()||{};
    const count=deckCount(game);
    const deckRefs=Array.from({length:count},(_,i)=>db.doc(`users/${uid}/decks/deck-${i}`));
    const diceQuery=db.collection(`users/${uid}/dice`);
    const [diceSnap,favSnap,socialSnap,...deckSnaps]=await Promise.all([
      tx.get(diceQuery),tx.get(favRef),tx.get(socialRef),...deckRefs.map(ref=>tx.get(ref)),
    ]);

    const allRows=diceSnap.docs.map(doc=>({id:doc.id,...doc.data(),key:canonicalKey(doc.data()?.key)}));
    const selected=allRows.filter(row=>row.key===key && Number.isSafeInteger(row.cls) && row.cls>=1 && row.cls<=10);
    const originals=scope==='class'?selected.filter(row=>row.cls===requestedClass):selected.filter(row=>row.cls<10);
    const beforeCounts=classCounts(selected);
    if(originals.length<2) {
      response={receiptId:null,key,scope,classLevel:requestedClass,mergeCount:0,beforeCounts,afterCounts:beforeCounts,deletedIds:[],updatedInstances:[],returnedJewels:[],decks:deckSnaps.map((snap,index)=>({index,slots:normalizeSlots(snap.data()?.slots)})),favorites:{instanceIds:Array.isArray(favSnap.data()?.instanceIds)?favSnap.data().instanceIds:[]}};
      return;
    }

    const rowsById=new Map(selected.map(row=>[row.id,row]));
    const clsById=new Map(selected.map(row=>[row.id,row.cls]));
    const aliases=new Map();
    const deleted=new Set();
    const touched=new Set();
    let mergeCount=0;

    if(scope==='class'){
      const queue=originals.map(r=>r.id).sort();
      while(queue.length>=2){
        const sourceId=queue.shift(),targetId=queue.shift();
        aliases.set(sourceId,targetId);deleted.add(sourceId);touched.add(sourceId);touched.add(targetId);
        clsById.set(targetId,requestedClass+1);mergeCount++;
      }
    } else {
      const queues=new Map();
      for(let cls=1;cls<=10;cls++)queues.set(cls,selected.filter(r=>r.cls===cls).map(r=>r.id).sort());
      for(let cls=1;cls<10;cls++){
        const queue=queues.get(cls);
        while(queue.length>=2){
          const sourceId=queue.shift(),targetId=queue.shift();
          aliases.set(sourceId,targetId);deleted.add(sourceId);touched.add(sourceId);touched.add(targetId);
          clsById.set(targetId,cls+1);mergeCount++;
          queues.get(cls+1).push(targetId);queues.get(cls+1).sort();
        }
      }
    }

    if(!mergeCount){
      response={receiptId:null,key,scope,classLevel:requestedClass,mergeCount:0,beforeCounts,afterCounts:beforeCounts,deletedIds:[],updatedInstances:[],returnedJewels:[],decks:deckSnaps.map((snap,index)=>({index,slots:normalizeSlots(snap.data()?.slots)})),favorites:{instanceIds:Array.isArray(favSnap.data()?.instanceIds)?favSnap.data().instanceIds:[]}};
      return;
    }

    // Merge All deliberately strips every selected candidate before the first consolidation.
    // This is broader than pair-by-pair cleanup so an odd leftover in the selected scope cannot
    // retain a socket simply because it happened to be the unpaired copy after deterministic sorting.
    const jewelCandidates=originals;
    const returnedJewels=uniqueReturnedJewels(jewelCandidates);
    const candidateIds=new Set(originals.map(r=>r.id));

    const decks=deckSnaps.map((snap,index)=>({index,slots:normalizeSlots(snap.data()?.slots)}));
    for(const deck of decks){
      deck.slots=deck.slots.map(slot=>{
        if(!slot || slot.key!==key || !candidateIds.has(slot.instId)) return slot;
        const finalId=resolveAlias(slot.instId,aliases);
        return deleted.has(finalId)?null:{key,instId:finalId};
      });
    }

    let favorites=Array.isArray(favSnap.data()?.instanceIds)?favSnap.data().instanceIds.filter(id=>typeof id==='string'):[];
    favorites=favorites.map(id=>candidateIds.has(id)?resolveAlias(id,aliases):id).filter(id=>!deleted.has(id));
    favorites=[...new Set(favorites)].slice(0,MAX_FAVORITES);

    for(const row of originals){
      const ref=db.doc(`users/${uid}/dice/${row.id}`);
      if(deleted.has(row.id)) tx.delete(ref);
      else tx.set(ref,{cls:clsById.get(row.id)||row.cls,enchants:[null,null,null,null],updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }
    for(const jewel of returnedJewels){
      tx.set(db.doc(`users/${uid}/jewels/${jewel.id}`),{...jewel,socketedIn:null,returnedByMergeAll:receiptRef.id,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }
    for(const deck of decks) tx.set(deckRefs[deck.index],{schemaVersion:1,index:deck.index,slots:deck.slots,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    tx.set(favRef,{schemaVersion:1,instanceIds:favorites,updatedAt:FieldValue.serverTimestamp()},{merge:true});

    const sharedId=socialSnap.data()?.sharedDieId;
    if(sharedId && candidateIds.has(sharedId)){
      const finalId=resolveAlias(sharedId,aliases);
      const finalRow=rowsById.get(finalId);
      if(finalRow && !deleted.has(finalId)){
        const finalClass=clsById.get(finalId)||finalRow.cls;
        tx.set(socialRef,{sharedDieId:finalId,updatedAt:FieldValue.serverTimestamp()},{merge:true});
        tx.set(publicRef,{sharedDie:{key,rarity:catalog.dice[key]?.rarity||finalRow.rarity||'common',instance:{id:finalId,cls:finalClass,enchants:[null,null,null,null]}},updatedAt:FieldValue.serverTimestamp()},{merge:true});
      } else {
        tx.set(socialRef,{sharedDieId:null,updatedAt:FieldValue.serverTimestamp()},{merge:true});
        tx.set(publicRef,{sharedDie:null,updatedAt:FieldValue.serverTimestamp()},{merge:true});
      }
    }

    const revision=Number.isSafeInteger(game.revision)?game.revision+1:1;
    tx.set(gameRef,{revision,updatedAt:FieldValue.serverTimestamp()},{merge:true});

    const afterRows=[];
    for(const row of selected){
      if(deleted.has(row.id))continue;
      afterRows.push({...row,cls:clsById.get(row.id)||row.cls});
    }
    const afterCounts=classCounts(afterRows);
    const updatedInstances=originals.filter(r=>!deleted.has(r.id)).map(r=>({id:r.id,cls:clsById.get(r.id)||r.cls,enchants:[null,null,null,null]}));

    const estimatedWrites=deleted.size+updatedInstances.length+returnedJewels.length+decks.length+5;
    if(estimatedWrites>450) throw new HttpsError('resource-exhausted','This collection has too many selected instances for one safe Merge All transaction. Merge one Class first, then try again.');

    tx.set(receiptRef,{
      operation:'merge_all',key,scope,classLevel:requestedClass,mergeCount,
      beforeCounts,afterCounts,deletedInstanceIds:[...deleted],returnedJewelIds:returnedJewels.map(j=>j.id),
      createdAt:FieldValue.serverTimestamp(),
    });
    response={receiptId:receiptRef.id,key,scope,classLevel:requestedClass,mergeCount,beforeCounts,afterCounts,deletedIds:[...deleted],updatedInstances,returnedJewels,decks,favorites:{instanceIds:favorites},gameRevision:revision};
  });

  return {ok:true,...response};
});

exports.sellDieV1 = onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  const auth=requireAuth(request);
  const instanceId=clean(request.data?.instanceId,100);
  if(!instanceId) throw new HttpsError('invalid-argument','Choose a die instance to sell.');
  const uid=auth.uid;
  const dieRef=db.doc(`users/${uid}/dice/${instanceId}`);
  const gameRef=db.doc(`users/${uid}/game/state`);
  const favRef=db.doc(`users/${uid}/game/favorites`);
  const socialRef=db.doc(`users/${uid}/game/social`);
  const publicRef=db.doc(`publicProfiles/${uid}`);
  const receiptRef=db.collection(`users/${uid}/transactions`).doc();
  let response=null;

  await db.runTransaction(async(tx)=>{
    const gameSnap=await tx.get(gameRef);
    if(!gameSnap.exists) throw new HttpsError('failed-precondition','The online game profile is not initialized.');
    const game=gameSnap.data()||{};
    const count=deckCount(game);
    const deckRefs=Array.from({length:count},(_,i)=>db.doc(`users/${uid}/decks/deck-${i}`));
    const [dieSnap,favSnap,socialSnap,...deckSnaps]=await Promise.all([
      tx.get(dieRef),tx.get(favRef),tx.get(socialRef),...deckRefs.map(ref=>tx.get(ref)),
    ]);
    if(!dieSnap.exists) throw new HttpsError('failed-precondition','That die instance is no longer in your collection.');
    const die=dieSnap.data()||{};
    const key=canonicalKey(die.key);
    const def=catalog.dice?.[key];
    if(!def) throw new HttpsError('failed-precondition','That die is not in the current catalog.');
    const cls=Number(die.cls);
    if(!Number.isSafeInteger(cls)||cls<1||cls>10) throw new HttpsError('internal','That die has an invalid Class.');
    const rarity=String(def.rarity||die.rarity||'').toLowerCase();
    const value=saleValue(rarity,cls);
    if(value==null) throw new HttpsError('failed-precondition','Sale values are currently configured through Class 7 only.');
    const returnedJewels=uniqueReturnedJewels([{...die,id:instanceId}]);

    const decks=deckSnaps.map((snap,index)=>({index,slots:normalizeSlots(snap.data()?.slots)}));
    for(const deck of decks) deck.slots=deck.slots.map(slot=>slot?.instId===instanceId?null:slot);
    let favorites=Array.isArray(favSnap.data()?.instanceIds)?favSnap.data().instanceIds.filter(id=>typeof id==='string'&&id!==instanceId):[];
    favorites=[...new Set(favorites)].slice(0,MAX_FAVORITES);

    for(const jewel of returnedJewels){
      tx.set(db.doc(`users/${uid}/jewels/${jewel.id}`),{...jewel,socketedIn:null,returnedBySale:receiptRef.id,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }
    tx.delete(dieRef);
    for(const deck of decks) tx.set(deckRefs[deck.index],{schemaVersion:1,index:deck.index,slots:deck.slots,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    tx.set(favRef,{schemaVersion:1,instanceIds:favorites,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    if(socialSnap.data()?.sharedDieId===instanceId){
      tx.set(socialRef,{sharedDieId:null,updatedAt:FieldValue.serverTimestamp()},{merge:true});
      tx.set(publicRef,{sharedDie:null,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }

    const current=publicGameState(game);
    const revision=current.revision+1;
    const pipsBalance=current.economy.pips+value;
    tx.set(gameRef,{economy:{pips:pipsBalance,astras:current.economy.astras},revision,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    tx.set(receiptRef,{
      operation:'sell_die',instanceId,key,rarity,classLevel:cls,pipsAwarded:value,
      balanceBefore:current.economy.pips,balanceAfter:pipsBalance,returnedJewelIds:returnedJewels.map(j=>j.id),
      createdAt:FieldValue.serverTimestamp(),
    });
    response={receiptId:receiptRef.id,instanceId,key,name:def.name||key,rarity,classLevel:cls,pipsAwarded:value,pipsBalance,returnedJewels,decks,favorites:{instanceIds:favorites},gameRevision:revision};
  });
  return {ok:true,...response};
});

exports._saleValueV1=saleValue;
exports._classSaleMultipliersV1=CLASS_SALE_MULT;
exports._raritySaleBaseV1=RARITY_BASE;
