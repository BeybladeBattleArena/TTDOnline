import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const frame=document.getElementById('gameFrame');
let functions=null;
const ready=(async()=>{
  for(let i=0;i<500;i++){
    if(getApps().length){functions=getFunctions(getApp(),'us-central1');return;}
    await new Promise(r=>setTimeout(r,20));
  }
  throw new Error('Firebase did not initialize.');
})();

async function refreshSharedDieAfterMerge(sourceId,targetId){
  try{
    const s=(await httpsCallable(functions,'getSocialState')({})).data?.social;
    if(s?.self?.sharedDieId===sourceId||s?.self?.sharedDieId===targetId){
      await httpsCallable(functions,'setSharedDie')({instanceId:targetId});
    }
  }catch(socialErr){
    console.warn('Shared Die pointer could not be refreshed after merge.',socialErr);
  }
}

window.addEventListener('message',async(event)=>{
  if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  const m=event.data||{};
  if(m.type!=='ttd:v6-merge-request')return;
  try{
    await ready;
    if(!getAuth(getApp()).currentUser)throw new Error('Sign in again before merging.');
    const merge=await httpsCallable(functions,'mergeDice')({key:m.key,sourceId:m.sourceId,targetId:m.targetId});
    const data=merge.data||{};

    // The merge transaction is already authoritative at this point. Return it to the game
    // immediately; the old client unnecessarily waited on one or two extra social callables
    // before showing the Class result, which made a successful drop feel much slower than it was.
    frame.contentWindow.postMessage({type:'ttd:v6-merge-result',requestId:m.requestId,...data},location.origin);

    // Shared-support bookkeeping is independent of the merge result and can safely finish in
    // the background without making the player wait for the Class Up animation.
    void refreshSharedDieAfterMerge(m.sourceId,m.targetId);
  }catch(err){
    frame.contentWindow.postMessage({
      type:'ttd:v6-merge-error',
      requestId:m.requestId,
      message:err?.message?.replace(/^FirebaseError:\s*/i,'')||'The server rejected that Class merge.'
    },location.origin);
  }
},true);