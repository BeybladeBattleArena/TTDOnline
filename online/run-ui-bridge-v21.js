(() => {
  'use strict';
  if(window.__TTD_RUN_UI_AL_HATA_BOOT_V1)return;
  window.__TTD_RUN_UI_AL_HATA_BOOT_V1=true;

  const FROZEN_BRIDGE='/online/run-ui-bridge-v21-testmap-frozen.js?v=1';
  const VERIFIED_RESULT_MESSAGE_CONTRACT="m.type!=='ttd:v6-run-finish-result'";
  const VERIFIED_RESULT_FORWARDING_CONTRACT='window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35?.(m)';
  const FROZEN_PRESENTATION_CONTRACTS=[
    'TTD_PRESENTATION_INDEPENDENT_LOAD_V1',
    "window.__TTD_ASSET_URL?.('/online/game-presentation-v1.js?v=7')",
    "bridge:'continuous-world-v2 + same-map-battle-v5'",
    "bridge:'presentation-v6'",
    "script.onload=resolve;script.onerror=()=>reject(new Error('Game presentation script could not load.'))",
  ];
  const AL_HATA_MODULES=[
    '/online/al-hata-stage1-core-v1.js?v=1',
    '/online/al-hata-stage1-beach-v1.js?v=1',
    '/online/al-hata-stage1-jungle-v1.js?v=1',
    '/online/al-hata-stage1-fork-v1.js?v=1',
    '/online/al-hata-stage1-temple-v1.js?v=1',
    '/online/al-hata-stage1-polish-v1.js?v=1',
    '/online/al-hata-stage1-playtest-v1.js?v=1',
  ];
  const PLAYTEST_ENTRY='/online/al-hata-stage1-playtest-entry-v1.js?v=1';
  const WORLD_INSERTION_LINE="      platformSource=requiredReplace(platformSource,renderMarker,worldInjection,'world renderer insertion');";

  async function fetchText(url,label){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${label} HTTP ${r.status}`);return r.text();}
  function loadClassicScript(url,label,ready){return new Promise((resolve,reject)=>{if(ready?.()){resolve();return;}const script=document.createElement('script');script.src=url;script.async=false;script.onload=resolve;script.onerror=()=>reject(new Error(`${label} could not load.`));document.head.appendChild(script);});}
  async function loadAdventurePlatformingV2(){
    let frozenSource=await fetchText(FROZEN_BRIDGE,'Frozen Test Map bridge');
    if(!frozenSource.includes(WORLD_INSERTION_LINE))throw new Error('Frozen Test Map bridge injection marker changed; refusing unsafe Al Hata bootstrap.');
    if(!frozenSource.includes(VERIFIED_RESULT_MESSAGE_CONTRACT)||!frozenSource.includes(VERIFIED_RESULT_FORWARDING_CONTRACT))throw new Error('Frozen Test Map bridge lost the canonical verified-result forwarding listener contract.');
    for(const marker of FROZEN_PRESENTATION_CONTRACTS)if(!frozenSource.includes(marker))throw new Error(`Frozen Test Map bridge lost presentation contract: ${marker}`);
    const moduleSources=[];
    for(const url of AL_HATA_MODULES)moduleSources.push(await fetchText(url,`Al Hata module ${url}`));
    const runtime=moduleSources.join('\n\n');
    const insertion=WORLD_INSERTION_LINE+`\n      platformSource=requiredReplace(platformSource,renderMarker,${JSON.stringify(runtime)}+'\\n'+renderMarker,'Al Hata Stage 1 runtime insertion');`;
    frozenSource=frozenSource.replace(WORLD_INSERTION_LINE,insertion);
    eval(`${frozenSource}\n//# sourceURL=/online/run-ui-bridge-v21-testmap-frozen.js`);
    const frozenReady=window.__TTD_RUN_UI_EXTENSIONS_READY;
    if(frozenReady&&frozenReady!==bootstrapPromise)await frozenReady;
    await loadClassicScript(PLAYTEST_ENTRY,'Al Hata navigator-first playtest entry',()=>!!window.__TTD_AL_HATA_PLAYTEST_ENTRY_V1);
    return true;
  }

  window.__TTD_RUN_UI_EXTENSIONS_READY_V1=true;
  window.__TTD_RUN_UI_EXTENSIONS_READY=loadAdventurePlatformingV2();
  const bootstrapPromise=window.__TTD_RUN_UI_EXTENSIONS_READY.catch((err)=>{
    console.error('Al Hata Stage 1 bootstrap failed safely; frozen Test Map snapshot remains available.',err);
    try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'al-hata-stage1-v1',message:String(err?.message||err)},location.origin);}catch(_){}
    throw err;
  });
  window.__TTD_RUN_UI_EXTENSIONS_READY=bootstrapPromise;
})();
