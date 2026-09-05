'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const db=getFirestore();
const REGION='us-central1';
const SHELL_ID='al_hata_shell';
const SHELL_NAME='Pearlescent Island Shell';

function requireAuth(request){if(!request.auth)throw new HttpsError('unauthenticated','Authentication required.');return request.auth;}
function cleanOptionalRunId(value){const id=String(value||'').trim();if(!id)return null;if(id.length>120||!/^[A-Za-z0-9_-]+$/.test(id))throw new HttpsError('invalid-argument','The Adventure run identifier is invalid.');return id;}
function safeCount(value){return Math.max(0,Math.min(999999,Math.floor(Number(value)||0)));}
function startedAtMs(data){const value=data?.startedAt;return typeof value?.toMillis==='function'?value.toMillis():0;}
async function resolveAdventureRun(uid,rawRunId){
  const explicit=cleanOptionalRunId(rawRunId);
  if(explicit)return db.doc(`users/${uid}/runs/${explicit}`);
  const snap=await db.collection(`users/${uid}/runs`).where('status','==','active').limit(20).get();
  const candidates=snap.docs.filter(doc=>{const run=doc.data()||{};return run.modeKey==='adventure'&&run.campaign===true;}).sort((a,b)=>startedAtMs(b.data())-startedAtMs(a.data()));
  if(!candidates.length)throw new HttpsError('failed-precondition','No active Adventure campaign run could be found for this shell.');
  return candidates[0].ref;
}

exports.claimAlHataShellV1=onCall({region:REGION,timeoutSeconds:30},async(request)=>{
  const auth=requireAuth(request),runRef=await resolveAdventureRun(auth.uid,request.data?.runId),runId=runRef.id;
  const itemRef=db.doc(`users/${auth.uid}/items/${SHELL_ID}`);
  const gameRef=db.doc(`users/${auth.uid}/game/state`);
  const receiptRef=db.collection(`users/${auth.uid}/transactions`).doc();
  let count=0,alreadyClaimed=false;

  await db.runTransaction(async(tx)=>{
    const [runSnap,itemSnap,gameSnap]=await Promise.all([tx.get(runRef),tx.get(itemRef),tx.get(gameRef)]);
    if(!runSnap.exists)throw new HttpsError('failed-precondition','This Adventure run no longer exists.');
    const run=runSnap.data()||{};
    if(run.status!=='active'||run.modeKey!=='adventure'||run.campaign!==true)throw new HttpsError('failed-precondition','Pearlescent shells can only be claimed during an active Adventure campaign run.');
    const currentCount=safeCount(itemSnap.exists?itemSnap.data()?.count:0);
    if(run.worldClaims?.alHataStage1Shell===true){count=currentCount;alreadyClaimed=true;return;}

    count=currentCount+1;
    tx.set(itemRef,{
      schemaVersion:1,
      id:SHELL_ID,
      itemId:SHELL_ID,
      kind:'material',
      materialId:SHELL_ID,
      name:SHELL_NAME,
      category:'materials',
      count,
      stackable:true,
      source:'al_hata_stage1_world',
      desc:'A small pale-blue shell with a soft pearlescent sheen, gathered from the shore of Al Hata.',
      updatedAt:FieldValue.serverTimestamp(),
      updatedAtMs:Date.now(),
    },{merge:true});
    tx.set(runRef,{worldClaims:{...(run.worldClaims||{}),alHataStage1Shell:true},updatedAt:FieldValue.serverTimestamp()},{merge:true});
    if(gameSnap.exists){
      const game=gameSnap.data()||{};
      const revision=Number.isSafeInteger(game.revision)?game.revision+1:1;
      const inventoryVersion=Math.max(1,Math.floor(Number(game.inventoryVersion)||1))+1;
      tx.set(gameRef,{revision,inventoryVersion,updatedAt:FieldValue.serverTimestamp()},{merge:true});
    }
    tx.set(receiptRef,{operation:'world_item_claim',runId,itemId:SHELL_ID,quantity:1,source:'al_hata_stage1_beach',createdAt:FieldValue.serverTimestamp()});
  });

  return {ok:true,runId,alreadyClaimed,item:{id:SHELL_ID,itemId:SHELL_ID,kind:'material',materialId:SHELL_ID,name:SHELL_NAME,category:'materials',count}};
});
