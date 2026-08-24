import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const frame=document.getElementById('gameFrame');
let functions=null;
const ready=(async()=>{for(let i=0;i<500;i++){if(getApps().length){functions=getFunctions(getApp(),'us-central1');return;}await new Promise(r=>setTimeout(r,20));}throw new Error('Firebase did not initialize.');})();

function renderLevel(level){
  if(!level||!Number.isSafeInteger(level.level))return;
  const badge=document.getElementById('accountLevelV18');
  if(badge){
    badge.textContent=`Lv.${level.level}`;
    badge.title=`${level.xp||0} XP${level.nextLevelXp==null?' · MAX':` / ${level.nextLevelXp}`}`;
  }
  window.dispatchEvent(new CustomEvent('ttd:account-progression-v21',{detail:level}));
}

window.addEventListener('message',async(event)=>{
  if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  const m=event.data||{};if(m.type!=='ttd:v6-run-finish-request')return;
  event.stopImmediatePropagation();
  try{
    await ready;if(!getAuth(getApp()).currentUser)throw new Error('Sign in again before finishing the run.');
    const result=await httpsCallable(functions,'finishRun')({runId:m.runId,completedWaves:m.completedWaves,kills:m.kills,coinGold:m.coinGold,wave:m.wave,typhoonDefeated:!!m.typhoonDefeated,luckBonus:m.luckBonus,playSeconds:m.playSeconds});
    const data=result.data||{};const pips=data.snapshot?.gameState?.economy?.pips,astras=data.snapshot?.gameState?.economy?.astras;
    if(Number.isSafeInteger(pips)){const node=document.getElementById('cloudPips');if(node)node.textContent=pips.toLocaleString();}
    if(Number.isSafeInteger(astras)){const node=document.getElementById('cloudAstras');if(node)node.textContent=astras.toLocaleString();}
    renderLevel(data.level);
    const detail={requestId:m.requestId,runId:m.runId,...data};
    frame.contentWindow.postMessage({type:'ttd:v6-run-finish-result',...detail},location.origin);
    window.dispatchEvent(new CustomEvent('ttd:verified-run-result-v1',{detail}));
  }catch(err){frame.contentWindow.postMessage({type:'ttd:v6-run-finish-result-error',requestId:m.requestId,runId:m.runId,message:err?.message?.replace(/^FirebaseError:\s*/i,'')||'The server could not finalize this run.'},location.origin);}
},true);
