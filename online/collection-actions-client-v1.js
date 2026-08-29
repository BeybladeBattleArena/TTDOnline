import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const frame=document.getElementById('gameFrame');
const ORIGIN=location.origin;
let functions=null;
let inFlight=false;
const ready=(async()=>{
  for(let i=0;i<500;i++){
    if(getApps().length){functions=getFunctions(getApp(),'us-central1');return;}
    await new Promise(r=>setTimeout(r,20));
  }
  throw new Error('Firebase did not initialize.');
})();

function friendly(err,fallback){
  return err?.message?.replace(/^FirebaseError:\s*/i,'')||fallback;
}
function post(message){frame?.contentWindow?.postMessage(message,ORIGIN);}
function updatePips(balance){
  if(!Number.isSafeInteger(Number(balance)))return;
  const value=Number(balance).toLocaleString();
  const pips=document.getElementById('cloudPips');if(pips)pips.textContent=value;
  const economy=document.getElementById('cloudEconomy');
  if(economy){
    const astras=document.getElementById('cloudAstras')?.textContent||'0';
    economy.textContent=`${value} Pips • ${astras} Astras`;
  }
}

window.addEventListener('message',async(event)=>{
  if(event.origin!==ORIGIN||event.source!==frame?.contentWindow)return;
  const m=event.data||{};
  const isMerge=m.type==='ttd:collection-mergeall-request';
  const isSell=m.type==='ttd:collection-sell-request';
  if(!isMerge&&!isSell)return;
  if(inFlight){
    post({type:isMerge?'ttd:collection-mergeall-error':'ttd:collection-sell-error',requestId:m.requestId,message:'Another collection transaction is already being processed.'});
    return;
  }
  inFlight=true;
  try{
    await ready;
    if(!getAuth(getApp()).currentUser)throw new Error('Sign in again before changing your collection.');
    if(isMerge){
      const result=await httpsCallable(functions,'mergeAllDiceV1')({key:m.key,scope:m.scope,classLevel:m.classLevel});
      post({type:'ttd:collection-mergeall-result',requestId:m.requestId,...(result.data||{})});
    }else{
      const result=await httpsCallable(functions,'sellDieV1')({instanceId:m.instanceId});
      const data=result.data||{};
      updatePips(data.pipsBalance);
      post({type:'ttd:collection-sell-result',requestId:m.requestId,...data});
    }
  }catch(err){
    console.error('Collection transaction failed.',err);
    post({
      type:isMerge?'ttd:collection-mergeall-error':'ttd:collection-sell-error',
      requestId:m.requestId,
      message:friendly(err,isMerge?'The server rejected Merge All.':'The server rejected that sale.'),
    });
  }finally{inFlight=false;}
},true);
