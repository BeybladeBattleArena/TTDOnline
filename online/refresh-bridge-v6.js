(() => {
  'use strict';
  const ORIGIN=location.origin;
  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const type=event.data?.type;
    if(type==='ttd:v6-run-finish-result') setTimeout(()=>window.parent.postMessage({type:'ttd:v6-refresh-request'},ORIGIN),120);
  });
})();
