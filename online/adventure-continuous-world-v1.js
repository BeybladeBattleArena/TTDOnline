(() => {
  'use strict';
  if(window.__TTD_CONTINUOUS_WORLD_V2)return;
  window.__TTD_CONTINUOUS_WORLD_V2=true;

  /*
    The actual continuous-world renderer is source-injected into adventure-platforming-v2.js
    before that traversal IIFE executes. This companion file must therefore never reach back
    for traversal-private names such as currentPlatforms, drawBackground or session: those names
    cease to exist once the platforming IIFE returns. The previous version did exactly that and
    aborted the remainder of run-ui-bridge-v21 after the Test Map had registered, leaving the
    player with four ordinary flat combat waves and also preventing the global presentation layer
    from loading.

    Keep this module scope-safe. It records the world contract and independently starts the global
    presentation bootstrap. The renderer itself remains owned by the transformed platform source,
    where its camera, terrain, props, objects and drops all share one lexical world state.
  */
  window.__TTD_CONTINUOUS_WORLD_V1=Object.freeze({
    version:2,
    contract:'one-world-one-camera-persistent-objects',
    rendererOwner:'adventure-platforming-v2 transformed scope',
    backdrop:'embedded-continuous-world-renderer',
    groundDepth:2400,
    scopeSafe:true,
  });

  async function ensurePresentationV4(){
    if(window.__TTD_GAME_PRESENTATION_V4){
      window.TTDGamePresentation?.rebind?.();
      return;
    }
    try{
      const response=await fetch('/online/game-presentation-v1.js?v=4',{cache:'no-store'});
      if(!response.ok)throw new Error(`Game presentation HTTP ${response.status}`);
      eval(`${await response.text()}\n//# sourceURL=/online/game-presentation-v1.js`);
      window.TTDGamePresentation?.rebind?.();
    }catch(err){
      console.error('Independent game presentation bootstrap failed.',err);
      try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'game-presentation-v4',message:String(err?.message||err)},location.origin);}catch(_){}
    }
  }

  ensurePresentationV4();
})();
