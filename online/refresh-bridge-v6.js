(() => {
  'use strict';
  const ORIGIN=location.origin;
  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const type=event.data?.type;
    if(type==='ttd:v6-run-finish-result') setTimeout(()=>window.parent.postMessage({type:'ttd:v6-refresh-request'},ORIGIN),120);
  });

  // HG-A1 must execute as a direct eval from this bridge so it retains access to the
  // transformed v33 game's lexical combat state without changing the stable loader order.
  // The fetched source is same-origin, build-tokened, and committed alongside this bridge.
  fetch(window.__TTD_ASSET_URL('/online/hga1-bridge-v30.js'),{cache:'no-store'})
    .then((response)=>{
      if(!response.ok) throw new Error(`HG-A1 runtime returned HTTP ${response.status}`);
      return response.text();
    })
    .then((source)=>{ eval(source); })
    .catch((err)=>{
      console.error('HG-A1 runtime failed to initialize.',err);
      window.parent?.postMessage({type:'ttd:bridge-sync-error',message:`HG-A1 runtime failed to initialize: ${err?.message||'unknown error'}`},ORIGIN);
    });
})();