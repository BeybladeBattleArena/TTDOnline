(() => {
  'use strict';
  if(window.__TTD_RUN_UI_AL_HATA_BOOT_V1)return;
  window.__TTD_RUN_UI_AL_HATA_BOOT_V1=true;

  const FROZEN_BRIDGE='/online/run-ui-bridge-v21-testmap-frozen.js?v=1';
  const AL_HATA_MODULES=[
    '/online/al-hata-stage1-core-v1.js?v=1',
    '/online/al-hata-stage1-beach-v1.js?v=1',
  ];
  const WORLD_INSERTION_LINE="      platformSource=requiredReplace(platformSource,renderMarker,worldInjection,'world renderer insertion');";

  async function fetchText(url,label){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${label} HTTP ${r.status}`);return r.text();}
  async function bootstrapAlHataStage1(){
    let frozenSource=await fetchText(FROZEN_BRIDGE,'Frozen Test Map bridge');
    if(!frozenSource.includes(WORLD_INSERTION_LINE))throw new Error('Frozen Test Map bridge injection marker changed; refusing unsafe Al Hata bootstrap.');
    const moduleSources=[];
    for(const url of AL_HATA_MODULES)moduleSources.push(await fetchText(url,`Al Hata module ${url}`));
    const runtime=moduleSources.join('\n\n');
    const insertion=WORLD_INSERTION_LINE+`\n      platformSource=requiredReplace(platformSource,renderMarker,${JSON.stringify(runtime)}+'\\n'+renderMarker,'Al Hata Stage 1 runtime insertion');`;
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
