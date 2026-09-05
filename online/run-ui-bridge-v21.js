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
    '/online/al-hata-stage1-world-v2.js?v=1',
  ];
  const PLAYTEST_ENTRY='/online/al-hata-stage1-playtest-entry-v1.js?v=2';
  const WORLD_INSERTION_LINE="      platformSource=requiredReplace(platformSource,renderMarker,worldInjection,'world renderer insertion');";
  const AL_HATA_SCOPE_SHIMS=`
function randDeckKey(){
  const deck=Array.isArray(state?.deck)?state.deck:[];
  const keys=deck.map(entry=>typeof entry==='string'?entry:entry?.key).filter(key=>typeof key==='string'&&!!DICE?.[key]);
  if(!keys.length)throw new Error('Al Hata Navigator deck has no valid die keys.');
  return keys[Math.floor(Math.random()*keys.length)];
}
function makeDie(_requestedKey){
  const run=state,board=run?.board;
  if(!Array.isArray(board))throw new Error('Al Hata Navigator cannot access the live board.');
  const nativeSummon=document.getElementById('summonBtn');
  if(!nativeSummon)throw new Error('Al Hata Navigator cannot access native Summon Die.');
  const hold=run?.[AH_PLAYTEST_NATIVE_PAUSE_KEY];
  if(!hold)throw new Error('Al Hata Navigator native-pause ownership is missing.');
  const beforeBoard=board.slice(),beforeSp=run.sp,beforeCost=run.summonCost,beforeDisabled=!!nativeSummon.disabled;
  let die=null;
  try{
    hold.value=true;
    nativeSummon.disabled=false;
    if(Number(run.sp)<Number(run.summonCost))run.sp=Number(run.summonCost)||0;
    nativeSummon.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
    const created=[];
    for(let i=0;i<board.length;i++)if(board[i]!==beforeBoard[i]&&board[i])created.push(i);
    if(created.length!==1)throw new Error('Native Summon Die did not create exactly one starting die.');
    die=board[created[0]];
    if(!die||!die.key||!DICE?.[die.key])throw new Error('Native Summon Die returned an invalid Navigator die.');
    return die;
  }finally{
    for(let i=0;i<board.length;i++)board[i]=beforeBoard[i]||null;
    run.sp=beforeSp;run.summonCost=beforeCost;hold.value=false;nativeSummon.disabled=beforeDisabled;
  }
}
`;

  async function fetchText(url,label){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`${label} HTTP ${r.status}`);return r.text();}
  function loadClassicScript(url,label,ready){return new Promise((resolve,reject)=>{if(ready?.()){resolve();return;}const script=document.createElement('script');script.src=url;script.async=false;script.onload=resolve;script.onerror=()=>reject(new Error(`${label} could not load.`));document.head.appendChild(script);});}
  async function loadAdventurePlatformingV2(){
    let frozenSource=await fetchText(FROZEN_BRIDGE,'Frozen Test Map bridge');
    if(!frozenSource.includes(WORLD_INSERTION_LINE))throw new Error('Frozen Test Map bridge injection marker changed; refusing unsafe Al Hata bootstrap.');
    if(!frozenSource.includes(VERIFIED_RESULT_MESSAGE_CONTRACT)||!frozenSource.includes(VERIFIED_RESULT_FORWARDING_CONTRACT))throw new Error('Frozen Test Map bridge lost the canonical verified-result forwarding listener contract.');
    for(const marker of FROZEN_PRESENTATION_CONTRACTS)if(!frozenSource.includes(marker))throw new Error(`Frozen Test Map bridge lost presentation contract: ${marker}`);
    const moduleSources=[];
    for(const url of AL_HATA_MODULES)moduleSources.push(await fetchText(url,`Al Hata module ${url}`));
    const runtime=AL_HATA_SCOPE_SHIMS+'\n'+moduleSources.join('\n\n');
    const insertion=WORLD_INSERTION_LINE+`\n      platformSource=requiredReplace(platformSource,renderMarker,${JSON.stringify(runtime)}+'\\n'+renderMarker,'Al Hata Stage 1 runtime insertion');`;
    frozenSource=frozenSource.replace(WORLD_INSERTION_LINE,insertion);
    eval(`${frozenSource}\n//# sourceURL=/online/run-ui-bridge-v21-testmap-frozen.js`);
    const frozenReady=window.__TTD_RUN_UI_EXTENSIONS_READY;
    if(frozenReady&&frozenReady!==bootstrapPromise)await frozenReady;
    await loadClassicScript(PLAYTEST_ENTRY,'Al Hata in-map Navigator entry',()=>!!window.__TTD_AL_HATA_PLAYTEST_ENTRY_V3);
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