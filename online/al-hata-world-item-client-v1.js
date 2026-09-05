import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const frame=document.getElementById('gameFrame');
let functions=null;
const ready=(async()=>{for(let i=0;i<500;i++){if(getApps().length){functions=getFunctions(getApp(),'us-central1');return;}await new Promise(r=>setTimeout(r,20));}throw new Error('Firebase did not initialize for Al Hata world items.');})();
function humanize(err){return err?.message?.replace(/^FirebaseError:\s*/i,'')||'The shell could not be added to Inventory.';}

window.addEventListener('message',async(event)=>{
  if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;const m=event.data||{};
  if(m.type!=='ttd:al-hata-shell-claim-request')return;
  const requestId=String(m.requestId||''),runId=String(m.runId||'');
  try{
    await ready;if(!getAuth(getApp()).currentUser)throw new Error('Sign in again before collecting this item.');
    const result=await httpsCallable(functions,'claimAlHataShellV1')({runId});
    frame.contentWindow.postMessage({type:'ttd:al-hata-shell-claim-result',requestId,...(result.data||{})},location.origin);
  }catch(err){
    frame.contentWindow.postMessage({type:'ttd:al-hata-shell-claim-result-error',requestId,message:humanize(err)},location.origin);
  }
});
