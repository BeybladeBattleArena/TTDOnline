(() => {
  'use strict';
  const ORIGIN=location.origin;
  const GAME_PATH='/random-dice-game-33.html?v=35';
  const DICE_PATH='/dicefile.json?v=2';
  const BRIDGES=[
    '/online/dice-catalog-bridge-v8.js?v=8',
    '/online/soul-scimitar-svg-v14.js?v=14',
    '/online/slither-vine-bridge-v8.js?v=8',
    '/online/game-bridge-inner.js?v=4',
    '/online/progression-bridge-v5.js?v=5',
    '/online/singleplayer-bridge-v6.js?v=6',
    '/online/merge-bridge-v6.js?v=6',
    '/online/run-ui-bridge-v21.js?v=21',
    '/online/refresh-bridge-v6.js?v=6',
    '/online/mobile-input-bridge-v9.js?v=9',
    '/online/interaction-effects-v10.js?v=10',
    '/online/collection-portrait-fit-v16.js?v=16',
    '/online/deck-editor-v18.js?v=18',
    '/online/avatar-inventory-v22.js?v=22',
  ];
  const IIFE_END_MARKER='\n})();\n</'+'script>';


  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  async function loadText(url){
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}.`);
    return response.text();
  }
  function validateCanonicalCatalog(catalog){
    if(!catalog || catalog.schemaVersion!==1 || !catalog.dice || typeof catalog.dice!=='object'){
      throw new Error('dicefile.json is missing a supported canonical dice catalog.');
    }
    if(!catalog.dice.soulscimitar || catalog.dice.soulscimitar?.special?.kind!=='soulScimitar'){
      throw new Error('dicefile.json does not contain the Soul Scimitar runtime definition.');
    }
    if(!catalog.dice.slithervine || catalog.dice.slithervine?.special?.kind!=='slitherVine'){
      throw new Error('dicefile.json does not contain the Slither Vine runtime definition.');
    }
    if(!catalog.dice.magmaforce || catalog.dice.magmaforce?.special?.kind!=='magmaForce'){
      throw new Error('dicefile.json does not contain the Magma Force runtime definition.');
    }
  }

  async function boot(){
    send('ttd:bridge-phase',{phase:'loader-started',message:'Preparing complete cloud game…'});
    const [gameHtml,catalogText,...sources]=await Promise.all([
      loadText(GAME_PATH),
      loadText(DICE_PATH),
      ...BRIDGES.map(loadText)
    ]);
    let catalog;
    try{catalog=JSON.parse(catalogText);}catch(err){throw new Error(`dicefile.json is invalid JSON: ${err.message}`);}
    validateCanonicalCatalog(catalog);
    window.__TTD_DICEFILE=catalog;

    send('ttd:bridge-phase',{phase:'assets-loaded',message:'Online account systems and dice catalog loaded…'});
    let transformed=gameHtml;

    const markerIndex=transformed.lastIndexOf(IIFE_END_MARKER);
    if(markerIndex<0)throw new Error('The v33 game closure marker could not be located.');
    // TTD_BATTLE_HOOK_SCOPE_V20: catalog combat functions must remain callable from the
    // transformed core loop. Generic try-block isolation makes strict-mode function declarations
    // block-scoped, which previously killed the first animation frame with ReferenceError.
    const catalogSource=sources[0];
    const soulAssetSource=sources[1];
    const slitherSource=sources[2];
    const isolatedSources=sources.slice(3).map((source,offset)=>{
      const index=offset+3;
      const bridgeLiteral=JSON.stringify(BRIDGES[index]);
      return `\ntry {\n${source}\n} catch (__ttdBridgeErr) {\n  console.error('Online bridge '+${bridgeLiteral}+' failed without blocking later bridges.',__ttdBridgeErr);\n  try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:${bridgeLiteral},message:String(__ttdBridgeErr?.message||__ttdBridgeErr)}, location.origin); } catch (_) {}\n}\n`;
    });
    const battleHookSubsystem=`
  const __TTD_BATTLE_HOOKS = {
    fireMagmaForce(){return false;}, updateMagmaForce(){}, drawMagmaForceGround(){}, drawMagmaForceOverlay(){},
    fireSoulScimitar(){}, updateSoulScimitars(){}, drawSoulScimitars(){},
    fireSlitherVine(){}, updateSlitherVines(){}, drawSlitherVines(){}
  };
  try {
${catalogSource}
    Object.assign(__TTD_BATTLE_HOOKS,{fireMagmaForce,updateMagmaForce,drawMagmaForceGround,drawMagmaForceOverlay,fireSoulScimitar,updateSoulScimitars,drawSoulScimitars});
    try {
${soulAssetSource}
    } catch (__ttdSoulAssetErr) {
      console.error('Soul Saber exact-art extension failed; base combat hooks remain available.',__ttdSoulAssetErr);
      try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/soul-scimitar-svg-v14.js?v=14',message:String(__ttdSoulAssetErr?.message||__ttdSoulAssetErr)}, location.origin); } catch (_) {}
    }
  } catch (__ttdSoulCatalogErr) {
    console.error('Soul Saber catalog combat extension failed; no-op hooks preserve the battle loop.',__ttdSoulCatalogErr);
    try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/dice-catalog-bridge-v8.js?v=8',message:String(__ttdSoulCatalogErr?.message||__ttdSoulCatalogErr)}, location.origin); } catch (_) {}
  }
  try {
${slitherSource}
    Object.assign(__TTD_BATTLE_HOOKS,{fireSlitherVine,updateSlitherVines,drawSlitherVines});
  } catch (__ttdSlitherErr) {
    console.error('Slither Vine combat extension failed; no-op hooks preserve the battle loop.',__ttdSlitherErr);
    try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/slither-vine-bridge-v8.js?v=8',message:String(__ttdSlitherErr?.message||__ttdSlitherErr)}, location.origin); } catch (_) {}
  }
`;
    transformed=transformed.slice(0,markerIndex)
      +'\n\n  /* ================= ONLINE CLOUD COMPLETION BRIDGES ================= */\n'
      +battleHookSubsystem
      +'\n'
      +isolatedSources.join('\n')
      +'\n'
      +transformed.slice(markerIndex);

    send('ttd:bridge-phase',{phase:'document-ready',message:`Starting cloud-authoritative game with ${Object.keys(catalog.dice).length} catalog dice…`});
    document.open();
    document.write(transformed);
    document.close();
  }

  boot().catch((err)=>{
    console.error('Online game loader failed.',err);
    send('ttd:bridge-sync-error',{message:`Could not start online gameplay: ${err?.message||'unknown loader error'}`});
  });
})();