import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const frame=document.getElementById('gameFrame');
let functions=null;
const ready=(async()=>{for(let i=0;i<500;i++){if(getApps().length){functions=getFunctions(getApp(),'us-central1');return;}await new Promise(r=>setTimeout(r,20));}throw new Error('Firebase did not initialize.');})();
window.addEventListener('message',async(event)=>{
  if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  const m=event.data||{};if(m.type!=='ttd:v6-run-finish-request')return;
  // This module owns finalization so the runId is carried back to the in-game bridge.
  event.stopImmediatePropagation();
  try{
    await ready;if(!getAuth(getApp()).currentUser)throw new Error('Sign in again before finishing the run.');
    const result=await httpsCallable(functions,'finishRun')({runId:m.runId,completedWaves:m.completedWaves,kills:m.kills,coinGold:m.coinGold,wave:m.wave,typhoonDefeated:!!m.typhoonDefeated,luckBonus:m.luckBonus,playSeconds:m.playSeconds});
    const data=result.data||{};const pips=data.snapshot?.gameState?.economy?.pips,astras=data.snapshot?.gameState?.economy?.astras;
    if(Number.isSafeInteger(pips)){const node=document.getElementById('cloudPips');if(node)node.textContent=pips.toLocaleString();}
    if(Number.isSafeInteger(astras)){const node=document.getElementById('cloudAstras');if(node)node.textContent=astras.toLocaleString();}
    frame.contentWindow.postMessage({type:'ttd:v6-run-finish-result',requestId:m.requestId,runId:m.runId,...data},location.origin);
  }catch(err){frame.contentWindow.postMessage({type:'ttd:v6-run-finish-result-error',requestId:m.requestId,runId:m.runId,message:err?.message?.replace(/^FirebaseError:\s*/i,'')||'The server could not finalize this run.'},location.origin);}
},true);
