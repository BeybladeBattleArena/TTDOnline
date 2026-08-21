(() => {
  'use strict';
  const ORIGIN=location.origin;

  function expText(m){
    const xp=Math.max(0,Math.floor(Number(m.xpAwarded)||0));
    const level=Number(m.level?.level||0);
    const gained=Array.isArray(m.levelsGained)?m.levelsGained:[];
    return gained.length&&level?`+${xp} EXP · LEVEL UP! Lv.${level}`:`+${xp} EXP`;
  }
  function ensureAdventureExp(m){
    const gold=document.getElementById('overlayGold');
    if(!gold)return;
    let exp=document.getElementById('overlayXpV21');
    if(!exp){
      exp=document.createElement('div');
      exp.id='overlayXpV21';
      exp.style.cssText="margin-top:7px;color:#d4ecfa;font:700 13px 'Space Mono',monospace;text-align:center;text-shadow:0 0 10px rgba(143,196,232,.25);";
      gold.insertAdjacentElement('afterend',exp);
    }
    exp.textContent=expText(m);
  }
  function ensureZombieExp(m){
    const card=document.getElementById('zSummaryCard');
    const button=document.getElementById('zSummaryOkBtn');
    if(!card||!button)return;
    let exp=document.getElementById('zSummaryXpV21');
    if(!exp){
      exp=document.createElement('div');
      exp.id='zSummaryXpV21';
      exp.style.cssText="margin:8px auto 4px;padding:7px 14px;width:max-content;max-width:100%;border:1px solid rgba(143,196,232,.48);border-radius:18px;background:rgba(143,196,232,.08);color:#d4ecfa;font:700 13px 'Space Mono',monospace;text-align:center;";
      button.insertAdjacentElement('beforebegin',exp);
    }
    exp.textContent=expText(m);
  }

  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const m=event.data||{};
    if(m.type!=='ttd:v6-run-finish-result')return;
    const gold=document.getElementById('overlayGold');if(gold)gold.textContent=`+${Number(m.pipsEarned||0)} Pips`;
    const family=String(m.modeFamily||'');
    if(family==='adventure')ensureAdventureExp(m);
    if(family==='zombie')ensureZombieExp(m);
    if(Number(m.chestCount||0)>0){const text=document.getElementById('overlayText');if(text)text.textContent=`Al Hata is cleared! ${m.chestCount===1?'A Frozen Island Chest has':`${m.chestCount} Frozen Island Chests have`} been added to your inventory.`;}
  });

  function installPlatformOnlineStartSyncV1(){
    if(window.__TTD_PLATFORM_ONLINE_START_SYNC_V1)return;
    window.__TTD_PLATFORM_ONLINE_START_SYNC_V1=true;
    const TEST_ID='test_map';
    const platformStartAdventure=startAdventure;
    const testFlags=['__ttdTestMap','__ttdTestBattlePath','__ttdPlatformDone','__ttdPlatformRewards','__ttdPlatformBonusApplied','__ttdPlatformSlotMemory','__ttdPlatformDestroyedSlots'];

    function tagAuthorizedTestState(previousState,startedAt){
      const testStage=ADVENTURES?.[TEST_ID]?.stages?.[0];
      if(state && state!==previousState && testStage && state.adventureStage===testStage){
        state.__ttdTestMap=true;
        state.__ttdTestBattlePath=1;
        state.__ttdPlatformDone=false;
        state.__ttdPlatformRewards={dieOre:0,expOrbs:0,bonusWaveCredits:0};
        state.__ttdPlatformBonusApplied=false;
        state.__ttdPlatformSlotMemory={};
        state.__ttdPlatformDestroyedSlots=[];
        if(modeLabel)modeLabel.textContent='Test Map · First Route';
        return;
      }
      if(performance.now()-startedAt<25000)requestAnimationFrame(()=>tagAuthorizedTestState(previousState,startedAt));
    }

    startAdventure=function onlinePlatformAwareStartAdventure(advId,stageIdx,diffKey){
      const previousState=state;
      const result=platformStartAdventure(advId,stageIdx,diffKey);
      if(advId!==TEST_ID)return result;

      // The online single-player bridge begins the cloud run first and invokes the legacy starter
      // only after the server answers. The platform wrapper therefore briefly sees the old state.
      // Undo those premature prototype flags and tag the newly-created authorized Adventure state.
      if(state===previousState && previousState){
        testFlags.forEach((key)=>{ try{delete previousState[key];}catch(_){} });
      }
      const startedAt=performance.now();
      requestAnimationFrame(()=>tagAuthorizedTestState(previousState,startedAt));
      return result;
    };
  }

  // This module is fetched separately so the experimental traversal engine can evolve without
  // touching Al Hata or the 668 KB legacy core. Direct eval is deliberate: this bridge is injected
  // inside the core game IIFE, so the platform module receives safe lexical access to battle state,
  // die HP/stat helpers, Adventure routing, and path construction.
  async function loadAdventurePlatformingV2(){
    try{
      const response=await fetch('/online/adventure-platforming-v2.js?v=2',{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const source=await response.text();
      const apiMarker="window.__TTD_PLATFORM_TEST_API={version:2,start:()=>startAdventure(TEST_ID,0,selectedDifficulty),get active(){return!!session?.active;}};";
      const apiReplacement="window.__TTD_PLATFORM_TEST_API={version:2,start:()=>startAdventure(TEST_ID,0,selectedDifficulty),selectNavigator:(boardIndex)=>chooseNavigator(Number(boardIndex)),get selecting(){return!!session?.active&&session.phase==='select';},get active(){return!!session?.active;}};";
      const platformSource=source.replace(apiMarker,apiReplacement);
      if(platformSource===source)throw new Error('Platform navigator API exposure marker missing');
      eval(`${platformSource}\n//# sourceURL=/online/adventure-platforming-v2.js`);

      // Navigator selection now uses independent hit targets positioned above each highlighted
      // summoned die. They call the exact-instance selector directly and do not route through the
      // battle board's click/drag handlers at all.
      const hitResponse=await fetch('/online/adventure-platforming-hit-layer-v4.js?v=4',{cache:'no-store'});
      if(!hitResponse.ok)throw new Error(`Navigator hit layer HTTP ${hitResponse.status}`);
      const hitSource=await hitResponse.text();
      eval(`${hitSource}\n//# sourceURL=/online/adventure-platforming-hit-layer-v4.js`);

      installPlatformOnlineStartSyncV1();
    }catch(err){
      console.error('Adventure platforming test module could not load.',err);
      try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/adventure-platforming-v2.js?v=2 + hit-layer-v4',message:String(err?.message||err)},location.origin);}catch(_){}
    }
  }
  loadAdventurePlatformingV2();
})();
