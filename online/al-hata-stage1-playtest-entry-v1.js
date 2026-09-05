(() => {
  'use strict';
  if(window.__TTD_AL_HATA_PLAYTEST_ENTRY_V2)return;
  window.__TTD_AL_HATA_PLAYTEST_ENTRY_V1=true;
  window.__TTD_AL_HATA_PLAYTEST_ENTRY_V2=true;
  window.TTDGamePresentation?.rebind?.();

  const AH_ID='al_hata';
  const RUN_READY_TIMEOUT_MS=25000;
  const capturedStartAdventure=startAdventure;
  const capturedStartAdventureCampaign=startAdventureCampaign;
  const missionBase=(fn)=>typeof fn?.__ttdMissionBaseV6==='function'?fn.__ttdMissionBaseV6:fn;
  const alHataStageRunner=missionBase(capturedStartAdventure);
  const alHataCampaignRunner=missionBase(capturedStartAdventureCampaign);
  let launchToken=0;

  function validateLaunch(advId,stageIdx=0){
    const adv=ADVENTURES?.[advId],stage=adv?.stages?.[stageIdx];
    if(!adv||!stage)return false;
    if(stage.locked){toastGlobal('Coming soon');return false;}
    const deck=getActiveDeck();
    if(deck.length<5){toastGlobal(deck.length===0?'Build a deck first':'Your deck needs all 5 dice filled');showScreen('deck');return false;}
    return true;
  }

  function holdFreshAlHataRun(runState){
    if(!runState)return;
    runState.running=false;
    runState.__ttdMissionIntroHold=true;
    runState.spawnQueue=[];
    runState.enemies=[];
    runState.spawnTimer=0;
    runState.wave=1;
  }

  function failClosed(message,err){
    console.error(message,err||'');
    try{toastGlobal(message);}catch(_){}
    if(state){state.running=false;state.__ttdMissionIntroHold=true;}
  }

  function waitForInMapPrelude(previousState,token,startedAt=performance.now()){
    if(token!==launchToken)return;
    const runState=state,targetStage=ADVENTURES?.[AH_ID]?.stages?.[0];
    if(runState&&runState!==previousState&&runState.adventureStage===targetStage){
      holdFreshAlHataRun(runState);
      const gameReady=!!document.getElementById('gameScreen')?.classList.contains('active');
      if(gameReady){
        const prepare=window.__TTD_AL_HATA_STAGE1_PLAYTEST_API?.prepareInMapNavigator;
        if(typeof prepare==='function'){
          window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=false;
          if(prepare(runState)!==false)return;
          failClosed('Al Hata Arrival Cove could not prepare its Navigator summon.');
          return;
        }
      }
    }
    if(performance.now()-startedAt>=RUN_READY_TIMEOUT_MS){
      window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=false;
      failClosed('Al Hata Arrival Cove did not become ready after loading.');
      return;
    }
    requestAnimationFrame(()=>waitForInMapPrelude(previousState,token,startedAt));
  }

  function launchAlHataInMap(runner,self,args,stageIdx=0){
    const advId=args[0];
    if(!validateLaunch(advId,stageIdx))return undefined;
    const token=++launchToken,previousState=state;
    window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=true;
    const result=runner.apply(self,args);
    waitForInMapPrelude(previousState,token);
    return result;
  }

  const wrapped=function(...args){
    const [advId,stageIdx]=args;
    if(advId===AH_ID&&Number(stageIdx)===0)return launchAlHataInMap(alHataStageRunner,this,args,0);
    return capturedStartAdventure.apply(this,args);
  };
  wrapped.__ttdMissionWrappedV6=true;
  wrapped.__ttdMissionBaseV6=capturedStartAdventure;
  startAdventure=wrapped;

  const wrappedCampaign=function(...args){
    const [advId]=args;
    if(advId===AH_ID)return launchAlHataInMap(alHataCampaignRunner,this,args,0);
    return capturedStartAdventureCampaign.apply(this,args);
  };
  wrappedCampaign.__ttdMissionWrappedV6=true;
  wrappedCampaign.__ttdMissionBaseV6=capturedStartAdventureCampaign;
  startAdventureCampaign=wrappedCampaign;
})();
