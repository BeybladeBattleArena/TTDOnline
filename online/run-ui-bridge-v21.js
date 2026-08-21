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
        if(modeLabel)modeLabel.textContent='Test Map · First Combat Area';
        /* startAdventure builds its first path before the Test Map flags exist. Rebuild once the
           authoritative state is present so wave 1 is immediately sectioned inside the real map. */
        try{buildPath(cw,ch);}catch(err){console.warn('Test Map first combat path could not rebuild.',err);}
        return;
      }
      if(performance.now()-startedAt<25000)requestAnimationFrame(()=>tagAuthorizedTestState(previousState,startedAt));
    }

    startAdventure=function onlinePlatformAwareStartAdventure(advId,stageIdx,diffKey){
      const previousState=state;
      const result=platformStartAdventure(advId,stageIdx,diffKey);
      if(advId!==TEST_ID)return result;
      if(state===previousState && previousState){
        testFlags.forEach((key)=>{ try{delete previousState[key];}catch(_){} });
      }
      const startedAt=performance.now();
      requestAnimationFrame(()=>tagAuthorizedTestState(previousState,startedAt));
      return result;
    };
  }

  async function loadAdventurePlatformingV2(){
    try{
      const response=await fetch('/online/adventure-platforming-v2.js?v=2',{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const source=await response.text();

      /* Expose a static battle-frame renderer from inside the traversal module's own lexical
         scope. Combat therefore uses drawBackground/currentPlatforms/drawPlatform/drawGate/
         drawHazards from the exact navigation renderer instead of maintaining a second map. */
      const renderMarker="  if(document.getElementById('adventureScreen')?.classList.contains('active'))renderAdventureList();";
      const renderInjection=`  function renderBattleBackdrop(g,w,h,area=1,time=0){
    if(!g||!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1)return false;
    const previous=session;
    const preview={
      active:false,phase:'battle',nav:null,w,h,cameraX:Number(area)===2?1390:40,time:Number(time)||0,lastTs:0,
      joyX:0,joyZ:0,checkpoint:{x:80,z:0,y:0},objects:makeInteractables(),drops:[],hazardCd:0,returnAlpha:1,
    };
    session=preview;
    try{
      drawBackground(g);
      currentPlatforms(preview.time).sort((a,b)=>a.z1-b.z1).forEach((p)=>drawPlatform(g,p));
      drawGate(g);drawHazards(g);
      for(const o of preview.objects){if(o.type==='breakable')drawPillar(g,o);else drawChest(g,o);}
      return true;
    }finally{session=previous;}
  }

${renderMarker}`;
      const withRenderer=source.replace(renderMarker,renderInjection);
      if(withRenderer===source)throw new Error('Platform battle renderer exposure marker missing');

      const apiMarker="window.__TTD_PLATFORM_TEST_API={version:2,start:()=>startAdventure(TEST_ID,0,selectedDifficulty),get active(){return!!session?.active;}};";
      const apiReplacement="window.__TTD_PLATFORM_TEST_API={version:3,start:()=>startAdventure(TEST_ID,0,selectedDifficulty),selectNavigator:(boardIndex)=>chooseNavigator(Number(boardIndex)),renderBattleBackdrop:(g,w,h,area,time)=>renderBattleBackdrop(g,w,h,area,time),get liveBoardIndices(){return liveBoardIndices();},get selecting(){return!!session?.active&&session.phase==='select';},get active(){return!!session?.active;}};";
      const platformSource=withRenderer.replace(apiMarker,apiReplacement);
      if(platformSource===withRenderer)throw new Error('Platform navigator API exposure marker missing');
      eval(`${platformSource}\n//# sourceURL=/online/adventure-platforming-v2.js`);

      const selectorResponse=await fetch('/online/adventure-platforming-selector-v6.js?v=6',{cache:'no-store'});
      if(!selectorResponse.ok)throw new Error(`Navigator selector v6 HTTP ${selectorResponse.status}`);
      const selectorSource=await selectorResponse.text();
      eval(`${selectorSource}\n//# sourceURL=/online/adventure-platforming-selector-v6.js`);

      const worldResponse=await fetch('/online/adventure-pseudo3d-battle-v1.js?v=3',{cache:'no-store'});
      if(!worldResponse.ok)throw new Error(`Same-map battle world HTTP ${worldResponse.status}`);
      const worldSource=await worldResponse.text();
      eval(`${worldSource}\n//# sourceURL=/online/adventure-pseudo3d-battle-v1.js`);

      /* This is intentionally installed after every Test Map start wrapper has been established. */
      installPlatformOnlineStartSyncV1();

      /* Presentation is global to every mode. Load it deterministically last rather than from a
         Test Map renderer, which previously let start-function replacement races drop its wrapper. */
      const presentationResponse=await fetch('/online/game-presentation-v1.js?v=2',{cache:'no-store'});
      if(!presentationResponse.ok)throw new Error(`Game presentation HTTP ${presentationResponse.status}`);
      const presentationSource=await presentationResponse.text();
      eval(`${presentationSource}\n//# sourceURL=/online/game-presentation-v1.js`);
      window.TTDGamePresentation?.rebind?.();
    }catch(err){
      console.error('Adventure platforming test module could not load.',err);
      try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/adventure-platforming-v2.js?v=2 + selector-v6 + same-map-battle-v3 + presentation-v2',message:String(err?.message||err)},location.origin);}catch(_){}
    }
  }
  loadAdventurePlatformingV2();
})();
