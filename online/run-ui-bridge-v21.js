(() => {
  'use strict';
  if(window.__TTD_RUN_UI_AL_HATA_BOOT_V1)return;
  window.__TTD_RUN_UI_AL_HATA_BOOT_V1=true;

  const FROZEN_BRIDGE='/online/run-ui-bridge-v21-testmap-frozen.js?v=1';
  const AL_HATA_RUNTIME='/online/al-hata-stage1-injected-v1.js?v=1';
  const WORLD_INSERTION_LINE="      platformSource=requiredReplace(platformSource,renderMarker,worldInjection,'world renderer insertion');";

  async function bootstrapAlHataStage1(){
    const frozenResponse=await fetch(FROZEN_BRIDGE,{cache:'no-store'});
    if(!frozenResponse.ok)throw new Error(`Frozen Test Map bridge HTTP ${frozenResponse.status}`);
    let frozenSource=await frozenResponse.text();
    if(!frozenSource.includes(WORLD_INSERTION_LINE))throw new Error('Frozen Test Map bridge injection marker changed; refusing unsafe Al Hata bootstrap.');

    const alHataResponse=await fetch(AL_HATA_RUNTIME,{cache:'no-store'});
    if(!alHataResponse.ok)throw new Error(`Al Hata Stage 1 runtime HTTP ${alHataResponse.status}`);
    const alHataRuntime=await alHataResponse.text();
    const insertion=WORLD_INSERTION_LINE+`\n      platformSource=requiredReplace(platformSource,renderMarker,${JSON.stringify(alHataRuntime)}+'\\n'+renderMarker,'Al Hata Stage 1 runtime insertion');`;
    frozenSource=frozenSource.replace(WORLD_INSERTION_LINE,insertion);

    eval(`${frozenSource}\n//# sourceURL=/online/run-ui-bridge-v21-testmap-frozen.js`);
    const frozenReady=window.__TTD_RUN_UI_EXTENSIONS_READY;
    if(frozenReady&&frozenReady!==bootstrapPromise)await frozenReady;
    return true;
  }

  const bootstrapPromise=bootstrapAlHataStage1().catch((err)=>{
    console.error('Al Hata Stage 1 bootstrap failed safely; frozen Test Map snapshot remains available.',err);
    try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'al-hata-stage1-v1',message:String(err?.message||err)},location.origin);}catch(_){}
    throw err;
  });
  window.__TTD_RUN_UI_EXTENSIONS_READY=bootstrapPromise;
})();
