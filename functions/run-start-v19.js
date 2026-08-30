const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const catalog = require('./dicefile.generated.json');

const db=getFirestore();
const REGION='us-central1';
const MIN_DECKS=3;
const MAX_DECKS=5;
const VALID_MODES=new Set(['survival','bossrush','sudden','adventure','endlesshorde','moving_screen','king_of_the_hill']);
const VALID_DIFFS=new Set(['normal','hard','hell']);
const VALID_MAPS=Object.freeze({
  moving_screen:new Set(['neon_rooftops_v2','construction_climb']),
  king_of_the_hill:new Set(['neon_rooftops_koth']),
});
const LEGACY_DIE_KEYS=Object.freeze({arrow:'skyhorn'});

function canonicalDieKey(key){return LEGACY_DIE_KEYS[key]||key;}
function isCanonicalDieKey(key){return !!catalog.dice?.[key];}
function requireAuth(request){
  if(!request.auth) throw new HttpsError('unauthenticated','Authentication required.');
  return request.auth;
}
function cleanString(value,max=80){return String(value==null?'':value).trim().slice(0,max);}
function deckCountFrom(game={}){
  const n=Number(game.deckCount);
  return Number.isSafeInteger(n)&&n>=MIN_DECKS&&n<=MAX_DECKS?n:MIN_DECKS;
}
function activeDeckFrom(game={},count=MIN_DECKS){
  const candidate=Number.isSafeInteger(game.v6ActiveDeckIdx)?game.v6ActiveDeckIdx:(Number.isSafeInteger(game.activeDeckIdx)?game.activeDeckIdx:0);
  return Math.max(0,Math.min(count-1,candidate));
}
function normalizeSlots(data){
  const slots=Array.isArray(data?.slots)?data.slots.slice(0,5):[];
  while(slots.length<5)slots.push(null);
  return slots.map((slot)=>{
    if(!slot||typeof slot!=='object'||typeof slot.key!=='string'||typeof slot.instId!=='string'||!slot.key||!slot.instId)return null;
    const key=canonicalDieKey(slot.key);
    if(!isCanonicalDieKey(key))throw new HttpsError('failed-precondition','Your active deck references an unknown die type. Save the deck again.');
    return {key,instId:slot.instId};
  });
}
async function repairAndReadActiveDeck(uid){
  const gameRef=db.doc(`users/${uid}/game/state`);
  const gameSnap=await gameRef.get();
  if(!gameSnap.exists) throw new HttpsError('failed-precondition','The online game profile is not initialized.');
  const game=gameSnap.data()||{};
  const count=deckCountFrom(game);
  const active=activeDeckFrom(game,count);
  const repair={};
  if(game.deckCount!==count)repair.deckCount=count;
  if(game.v6ActiveDeckIdx!==active)repair.v6ActiveDeckIdx=active;
  if(!Number.isSafeInteger(game.activeDeckIdx)||game.activeDeckIdx<0||game.activeDeckIdx>2)repair.activeDeckIdx=Math.min(2,active);
  if(Object.keys(repair).length){
    repair.updatedAt=FieldValue.serverTimestamp();
    await gameRef.set(repair,{merge:true});
  }
  const deckRef=db.doc(`users/${uid}/decks/deck-${active}`);
  const deckSnap=await deckRef.get();
  const deckData=deckSnap.exists?deckSnap.data():null;
  const rawSlots=Array.isArray(deckData?.slots)?deckData.slots.slice(0,5):[];
  while(rawSlots.length<5)rawSlots.push(null);
  const slots=normalizeSlots(deckData);
  if(slots.some((slot)=>!slot)) throw new HttpsError('failed-precondition','Your active deck must contain five dice.');
  const dieRefs=slots.map((slot)=>db.doc(`users/${uid}/dice/${slot.instId}`));
  const dieSnaps=await Promise.all(dieRefs.map((ref)=>ref.get()));
  const batch=db.batch();
  let hasMigration=false;
  let deckNeedsMigration=false;
  dieSnaps.forEach((snap,index)=>{
    const storedKey=snap.exists?snap.data()?.key:null;
    const canonicalStoredKey=canonicalDieKey(storedKey);
    if(!snap.exists||!isCanonicalDieKey(canonicalStoredKey)||canonicalStoredKey!==slots[index].key){
      throw new HttpsError('failed-precondition','Your active deck contains a die that is no longer available. Save the deck again.');
    }
    if(storedKey!==canonicalStoredKey){
      batch.set(dieRefs[index],{
        key:canonicalStoredKey,
        keyMigratedFrom:storedKey,
        keyMigratedAt:FieldValue.serverTimestamp(),
      },{merge:true});
      hasMigration=true;
    }
    if(rawSlots[index]?.key!==slots[index].key)deckNeedsMigration=true;
  });
  if(deckNeedsMigration){
    batch.set(deckRef,{slots,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    hasMigration=true;
  }
  if(hasMigration)await batch.commit();
  return {active,slots};
}
async function acceptedFriend(uid,friendUid){
  if(!friendUid||friendUid===uid)return false;
  const snap=await db.doc(`users/${uid}/friends/${friendUid}`).get();
  return snap.exists&&snap.data()?.status==='accepted';
}
async function sharedSupportSnapshot(uid){
  const socialSnap=await db.doc(`users/${uid}/game/social`).get();
  const friendUid=socialSnap.data()?.selectedSupportUid;
  if(!friendUid||!(await acceptedFriend(uid,friendUid)))return null;
  const lenderSocial=await db.doc(`users/${friendUid}/game/social`).get();
  const dieId=lenderSocial.data()?.sharedDieId;
  if(!dieId)return null;
  const [dieSnap,profileSnap]=await Promise.all([
    db.doc(`users/${friendUid}/dice/${dieId}`).get(),
    db.doc(`publicProfiles/${friendUid}`).get(),
  ]);
  if(!dieSnap.exists)return null;
  const data=dieSnap.data()||{};
  const key=canonicalDieKey(data.key);
  if(!isCanonicalDieKey(key))return null;
  if(data.key!==key){
    await dieSnap.ref.set({
      key,
      keyMigratedFrom:data.key,
      keyMigratedAt:FieldValue.serverTimestamp(),
    },{merge:true});
  }
  const cls=Number.isSafeInteger(data.cls)?data.cls:1;
  return {
    lenderUid:friendUid,
    lenderName:profileSnap.data()?.displayName||'Friend',
    key,
    rarity:data.rarity||null,
    instance:{id:dieSnap.id,cls,enchants:Array.isArray(data.enchants)?data.enchants.slice(0,4):[null,null,null,null]},
  };
}

exports.beginRun=onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  const auth=requireAuth(request);
  const modeKey=cleanString(request.data?.modeKey,30);
  if(!VALID_MODES.has(modeKey))throw new HttpsError('invalid-argument','Unknown single-player mode.');
  const difficultyKey=modeKey==='adventure'?cleanString(request.data?.difficultyKey,20):null;
  if(modeKey==='adventure'&&!VALID_DIFFS.has(difficultyKey))throw new HttpsError('invalid-argument','Adventure difficulty is invalid.');
  const mapKey=VALID_MAPS[modeKey]?cleanString(request.data?.mapKey,40):null;
  if(VALID_MAPS[modeKey]&&!VALID_MAPS[modeKey].has(mapKey))throw new HttpsError('invalid-argument','Arcade map is invalid.');

  const {active}=await repairAndReadActiveDeck(auth.uid);
  const support=await sharedSupportSnapshot(auth.uid);
  const runRef=db.collection(`users/${auth.uid}/runs`).doc();
  await runRef.set({
    status:'active',
    modeKey,
    difficultyKey,
    mapKey,
    campaign:!!request.data?.campaign,
    activeDeckIdx:active,
    support:support?{lenderUid:support.lenderUid,lenderName:support.lenderName,key:support.key,rarity:support.rarity,instance:support.instance}:null,
    startedAt:FieldValue.serverTimestamp(),
  });
  return {ok:true,runId:runRef.id,support,mapKey};
});
