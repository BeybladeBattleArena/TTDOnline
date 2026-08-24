(() => {
  'use strict';
  if(window.__TTD_CONTINUOUS_WORLD_V4)return;
  window.__TTD_CONTINUOUS_WORLD_V4=true;
  window.__TTD_CONTINUOUS_WORLD_V3=true;
  window.__TTD_CONTINUOUS_WORLD_V2=true;

  /*
    The actual continuous-world renderer is source-injected into adventure-platforming-v2.js
    before that traversal IIFE executes. This companion file must never reach back for traversal-
    private names such as currentPlatforms, drawBackground or session after that IIFE returns.
  */
  window.__TTD_CONTINUOUS_WORLD_V1=Object.freeze({
    version:4,
    contract:'one-world-one-camera-persistent-objects',
    rendererOwner:'adventure-platforming-v2 transformed scope',
    backdrop:'embedded-continuous-world-renderer',
    cameraContract:'traversal-freeze -> navigator-vanish -> arena-glide -> combat',
    rewardContract:'orb bonus metadata is reported separately from the final server tally',
    groundDepth:2400,
    scopeSafe:true,
  });

  const TEST_ID='test_map';
  let lastBoundState=null;

  function isAuthorizedTestState(candidate){
    const testStage=ADVENTURES?.[TEST_ID]?.stages?.[0];
    return !!candidate?.adventure && !!testStage &&
      (candidate.adventureStage===testStage || candidate.adventureStage?.name===testStage.name);
  }

  function bindCurrentTestState(){
    const candidate=state;
    if(!isAuthorizedTestState(candidate))return false;
    const firstBind=candidate!==lastBoundState;
    if(!candidate.__ttdTestMap){
      candidate.__ttdTestMap=true;
      candidate.__ttdTestBattlePath=Number(candidate.__ttdTestBattlePath)||1;
      candidate.__ttdPlatformDone=!!candidate.__ttdPlatformDone;
      candidate.__ttdPlatformRewards=candidate.__ttdPlatformRewards||{dieOre:0,expOrbs:0,bonusWaveCredits:0};
      candidate.__ttdPlatformBonusApplied=!!candidate.__ttdPlatformBonusApplied;
      candidate.__ttdPlatformSlotMemory=candidate.__ttdPlatformSlotMemory||{};
      candidate.__ttdPlatformDestroyedSlots=Array.isArray(candidate.__ttdPlatformDestroyedSlots)?candidate.__ttdPlatformDestroyedSlots:[];
      candidate.__ttdCombatIntroSeen=!!candidate.__ttdCombatIntroSeen;
      candidate.__ttdCombatIntroPending=!!candidate.__ttdCombatIntroPending;
      candidate.__ttdWorldState=candidate.__ttdWorldState||{version:2,cameraX:340,traversalStart:{x:340,z:0,y:0},objects:null,drops:null};
    }
    if(firstBind){
      lastBoundState=candidate;
      if(modeLabel)modeLabel.textContent=candidate.__ttdPlatformDone?'Test Map · Temple Court':'Test Map · Beach Clearing';
      try{window.__TTD_PLATFORM_TEST_API?.ensureWorldState?.();buildPath(cw,ch);}catch(err){console.warn('Persistent Test Map state bound, but its combat path could not rebuild yet.',err);}
    }
    return true;
  }

  function watchAuthorizedTestState(){try{bindCurrentTestState();}catch(err){console.warn('Test Map state watcher recovered from an iteration error.',err);}requestAnimationFrame(watchAuthorizedTestState);}
  requestAnimationFrame(watchAuthorizedTestState);

  async function evalScoped(url,label){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`${label} HTTP ${response.status}`);eval(`${await response.text()}\n//# sourceURL=${url.split('?')[0]}`);}

  async function ensurePresentationV6(){
    if(window.__TTD_GAME_PRESENTATION_V6){window.TTDGamePresentation?.rebind?.();return;}
    try{await evalScoped('/online/game-presentation-v1.js?v=6','Game presentation');window.TTDGamePresentation?.rebind?.();}
    catch(err){console.error('Independent game presentation bootstrap failed.',err);try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'game-presentation-v6',message:String(err?.message||err)},location.origin);}catch(_){} }
  }
  async function ensureSameMapBattleV6(){
    if(window.__TTD_TEST_MAINMAP_BATTLE_V6)return;
    try{await evalScoped('/online/adventure-pseudo3d-battle-v1.js?v=6','Persistent same-map battle');}
    catch(err){console.error('Independent same-map combat bootstrap failed.',err);try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'same-map-battle-v6',message:String(err?.message||err)},location.origin);}catch(_){} }
  }

  ensurePresentationV6();
  ensureSameMapBattleV6();
})();