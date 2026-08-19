import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const frame = document.getElementById('gameFrame');
let functions = null;

const ready = (async()=>{
  for(let i=0;i<500;i++){
    if(getApps().length){
      functions=getFunctions(getApp(),'us-central1');
      return;
    }
    await new Promise((resolve)=>setTimeout(resolve,20));
  }
  throw new Error('Firebase did not initialize.');
})();

function humanize(err){
  return err?.message?.replace(/^FirebaseError:\s*/i,'') || 'The server could not start that run.';
}

window.addEventListener('message',async(event)=>{
  if(event.origin!==location.origin || event.source!==frame?.contentWindow) return;
  const message=event.data||{};
  if(message.type!=='ttd:v6-run-begin-request') return;

  // V19 owns run-start replies. Stop the older listener from swallowing beginRun failures.
  event.stopImmediatePropagation();
  const requestId=message.requestId;
  try{
    await ready;
    if(!getAuth(getApp()).currentUser) throw new Error('Sign in again before starting the run.');
    const result=await httpsCallable(functions,'beginRun')({
      modeKey:message.modeKey,
      difficultyKey:message.difficultyKey||null,
      campaign:!!message.campaign,
    });
    frame.contentWindow.postMessage({type:'ttd:v6-run-begin-result',requestId,...(result.data||{})},location.origin);
  }catch(err){
    console.error('Run start failed.',err);
    frame.contentWindow.postMessage({
      type:'ttd:v6-run-begin-result-error',
      requestId,
      message:humanize(err),
    },location.origin);
  }
},true);
