(() => {
  'use strict';

  const ORIGIN=location.origin;
  const BRIDGES=[
    '/online/dice-catalog-bridge-v8.js?v=8',
    '/online/soul-scimitar-svg-v14.js?v=14',
    '/online/slither-vine-bridge-v8.js?v=8',
    '/online/game-bridge-inner.js?v=5',
    '/online/progression-bridge-v5.js?v=5',
    '/online/singleplayer-bridge-v6.js?v=7',
    '/online/merge-bridge-v6.js?v=6',
    '/online/run-ui-bridge-v21.js?v=21',
    '/online/refresh-bridge-v6.js?v=6',
    '/online/mobile-input-bridge-v9.js?v=9',
    '/online/interaction-effects-v10.js?v=10',
    '/online/collection-portrait-fit-v16.js?v=23',
    '/online/deck-editor-v18.js?v=18',
    // Item art is data-only and must exist before either inventory authority renders.
    '/online/item-assets-v1.js?v=4',
    // Enchant-card artwork binds at the native document boundary too; this entry preserves
    // normal runtime ordering and is idempotent through its V4 guard.
    '/online/enchant-card-art-v1.js?v=4',
    '/online/avatar-inventory-v22.js?v=22',
    // World items deliberately loads after the inventory authorities so its wrappers extend the
    // final Shop/Inventory renderers instead of being overwritten by avatar inventory.
    '/online/world-items-v1.js?v=1',
    // The legacy online sell override only knows keys/cards/jewels. Load this after final item
    // wrappers so trusted server-backed items can use their own authoritative onSell route.
    '/online/server-item-sell-bridge-v1.js?v=1',
    // Moving Screen stays direct committed source: stages -> engine -> map router -> visual route
    // UI -> Die-first gesture authority -> topology gestures -> map art -> bottom battle HUD.
    '/online/moving-screen-neon-rooftops-v2.js?v=4',
    '/online/moving-screen-construction-climb-v1.js?v=2',
    '/online/moving-screen-engine-v5.js?v=2',
    '/online/moving-screen-map-router-v2.js?v=3',
    '/online/moving-screen-ui-v1.js?v=1',
    '/online/moving-screen-die-input-v1.js?v=2',
    '/online/moving-screen-topology-ui-v1.js?v=1',
    '/online/moving-screen-construction-presentation-v1.js?v=2',
    '/online/moving-screen-battle-hud-v1.js?v=2',
    '/online/arcade-mode-shell-v2.js?v=5',
    '/online/moving-screen-mobile-frame-v2.js?v=2',
    // Single-player navigation is loaded last so dynamic mode UIs inherit one Back/End Run rule.
    '/online/singleplayer-run-controls-v1.js?v=3',
  ];

  const asset=(path)=>typeof window.__TTD_ASSET_URL==='function' ? window.__TTD_ASSET_URL(path) : path;
  const report=(bridge,error,phase='bridge-runtime-error')=>{
    const message=String(error?.message||error||'unknown bridge error');
    console.error(`Online bridge ${bridge} failed without blocking later bridges.`,error);
    try{window.parent?.postMessage({type:'ttd:bridge-phase',phase,bridge,message},ORIGIN);}catch(_){}
  };

  function preloadBridges(){
    for(const bridge of BRIDGES){
      const link=document.createElement('link');
      link.rel='preload';
      link.as='script';
      link.href=asset(bridge);
      document.head.appendChild(link);
    }
  }

  function isBridgeFilename(filename,bridge,src){
    const value=String(filename||'');
    if(!value)return false;
    const path=bridge.split('?')[0];
    return value===src || value.includes(path);
  }

  function loadBridge(bridge){
    return new Promise((resolve)=>{
      const src=asset(bridge);
      const script=document.createElement('script');
      script.src=src;
      script.async=false;
      script.dataset.ttdBridge=bridge;
      let runtimeError=null;
      const onRuntimeError=(event)=>{
        if(!isBridgeFilename(event.filename,bridge,src))return;
        runtimeError=event.error||new Error(event.message||`Runtime error in ${bridge}`);
        event.preventDefault?.();
      };
      const done=(ok,error=null,phase='bridge-runtime-error')=>{
        window.removeEventListener('error',onRuntimeError,true);
        if(!ok)report(bridge,error||runtimeError||new Error(`Bridge ${bridge} failed.`),phase);
        resolve(ok);
      };
      window.addEventListener('error',onRuntimeError,true);
      script.onload=()=>runtimeError ? done(false,runtimeError) : done(true);
      script.onerror=()=>done(false,new Error(`Could not load ${bridge}.`),'bridge-load-error');
      document.head.appendChild(script);
    });
  }

  function installCatalogBattleHooks(){
    const hooks=window.__TTD_BATTLE_HOOKS;
    if(!hooks)throw new Error('Native battle hook registry is missing.');
    const names=['fireMagmaForce','updateMagmaForce','drawMagmaForceGround','drawMagmaForceOverlay','fireSoulScimitar','updateSoulScimitars','drawSoulScimitars'];
    for(const name of names)if(typeof window[name]!=='function')throw new Error(`Catalog combat bridge did not publish ${name}.`);
    Object.assign(hooks,Object.fromEntries(names.map((name)=>[name,window[name]])));
  }

  function installSlitherBattleHooks(){
    const hooks=window.__TTD_BATTLE_HOOKS;
    if(!hooks)throw new Error('Native battle hook registry is missing.');
    const names=['fireSlitherVine','updateSlitherVines','drawSlitherVines'];
    for(const name of names)if(typeof window[name]!=='function')throw new Error(`Slither Vine bridge did not publish ${name}.`);
    Object.assign(hooks,Object.fromEntries(names.map((name)=>[name,window[name]])));
  }

  async function boot(){
    preloadBridges();
    for(let i=0;i<BRIDGES.length;i++){
      const bridge=BRIDGES[i];
      const ok=await loadBridge(bridge);
      if(!ok)continue;
      try{
        if(i===0)installCatalogBattleHooks();
        else if(i===2)installSlitherBattleHooks();
      }catch(error){
        report(bridge,error);
      }
    }
    try{await window.__TTD_RUN_UI_EXTENSIONS_READY;}catch(error){report('/online/run-ui-bridge-v21.js',error);}
    window.__TTD_MARK_BRIDGES_READY?.();
  }

  boot().catch((error)=>{
    report('/online/runtime-bridge-loader-v1.js',error,'bridge-loader-error');
    window.__TTD_MARK_BRIDGES_READY?.();
  });
})();