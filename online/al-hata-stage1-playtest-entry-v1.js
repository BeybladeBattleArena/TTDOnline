(() => {
  'use strict';
  if(window.__TTD_AL_HATA_PLAYTEST_ENTRY_V3)return;
  window.__TTD_AL_HATA_PLAYTEST_ENTRY_V1=true;
  window.__TTD_AL_HATA_PLAYTEST_ENTRY_V2=true;
  window.__TTD_AL_HATA_PLAYTEST_ENTRY_V3=true;
  window.TTDGamePresentation?.rebind?.();

  const AH_ID='al_hata';
  const RUN_READY_TIMEOUT_MS=25000;
  const RECOVERY_ID='ttdAhCoveRecoveryV3';
  const capturedStartAdventure=startAdventure;
  const capturedStartAdventureCampaign=startAdventureCampaign;
  const missionBase=(fn)=>typeof fn?.__ttdMissionBaseV6==='function'?fn.__ttdMissionBaseV6:fn;
  const alHataStageRunner=missionBase(capturedStartAdventure);
  const alHataCampaignRunner=missionBase(capturedStartAdventureCampaign);
  let launchToken=0;

  function validateLaunch(advId,stageIdx=0){
    const adv=ADVENTURES?.[advId],stage=adv?.stages?.[stageIdx];if(!adv||!stage)return false;
    if(stage.locked){toastGlobal('Coming soon');return false;}
    const deck=getActiveDeck();
    if(deck.length<5){toastGlobal(deck.length===0?'Build a deck first':'Your deck needs all 5 dice filled');showScreen('deck');return false;}
    return true;
  }

  function isAlHataStage1Run(runState){
    const canonical=ADVENTURES?.[AH_ID]?.stages?.[0],stage=runState?.adventureStage;
    if(!runState?.adventure||!canonical||!stage)return false;
    if(Number(runState.adventureStageIdx||0)!==0)return false;
    if(stage===canonical)return true;
    const stageId=String(stage.id||stage.key||'').trim().toLowerCase();
    const canonicalId=String(canonical.id||canonical.key||'').trim().toLowerCase();
    if(stageId&&canonicalId&&stageId===canonicalId)return true;
    const stageName=String(stage.name||'').trim().toLowerCase();
    const canonicalName=String(canonical.name||'').trim().toLowerCase();
    return !!stageName&&stageName===canonicalName;
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

  function removeRecovery(){document.getElementById(RECOVERY_ID)?.remove();}
  function showRecovery(runState,token,message){
    removeRecovery();
    const host=document.getElementById('laneWrap')||document.getElementById('gameScreen')||document.body;
    if(!host)return;
    const panel=document.createElement('div');panel.id=RECOVERY_ID;
    panel.style.cssText='position:absolute;inset:0;z-index:1400;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(6,9,17,.58);pointer-events:auto;touch-action:auto;';
    panel.innerHTML='<div style="width:min(88%,360px);padding:16px;border-radius:14px;border:1px solid rgba(243,212,145,.72);background:rgba(9,13,24,.96);box-shadow:0 12px 36px rgba(0,0,0,.5);text-align:center"><div style="color:#8fc4e8;font:700 9px Space Mono,monospace;letter-spacing:.16em">AL HATA · ARRIVAL COVE</div><div style="margin-top:5px;color:#f3d491;font:400 22px Russo One,sans-serif">COVE HANDOFF PAUSED</div><div class="ttdAhRecoveryCopy" style="margin:8px auto 13px;color:#d8d5c9;font:600 11px Inter,sans-serif;line-height:1.45"></div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="ttdAhRetry" type="button" style="border:1px solid rgba(212,236,250,.72);border-radius:9px;padding:9px 14px;background:#8fc4e8;color:#102033;font:700 11px Cinzel,serif">RETRY COVE</button><button class="ttdAhExit" type="button" style="border:1px solid rgba(243,212,145,.55);border-radius:9px;padding:9px 14px;background:#2a3160;color:#ece7da;font:700 11px Cinzel,serif">END RUN</button></div></div>';
    const copy=panel.querySelector('.ttdAhRecoveryCopy');if(copy)copy.textContent=message||'Arrival Cove did not finish initializing. Gameplay is still safely paused.';
    panel.querySelector('.ttdAhRetry')?.addEventListener('click',()=>{
      if(token!==launchToken)return;
      removeRecovery();window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=true;
      waitForInMapPrelude(runState,token,performance.now());
    });
    panel.querySelector('.ttdAhExit')?.addEventListener('click',()=>{
      removeRecovery();window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=false;
      try{document.getElementById('ttdMissionHoldShieldV6')?.remove();}catch(_){}
      if(state){state.__ttdMissionIntroHold=false;state.running=false;}
      try{if(typeof endMatch==='function')endMatch('voluntary');else document.getElementById('endRunBtn')?.click();}catch(_){}
    });
    host.appendChild(panel);
  }

  function failClosed(message,err,runState,token){
    console.error(message,err||'');
    try{toastGlobal(message);}catch(_){}
    if(state){state.running=false;state.__ttdMissionIntroHold=true;}
    showRecovery(runState||state,token,message);
  }

  function waitForInMapPrelude(previousState,token,startedAt=performance.now()){
    if(token!==launchToken)return;
    const runState=state;
    const gameReady=!!document.getElementById('gameScreen')?.classList.contains('active');
    if(runState&&gameReady&&isAlHataStage1Run(runState)){
      holdFreshAlHataRun(runState);
      const prepare=window.__TTD_AL_HATA_STAGE1_PLAYTEST_API?.prepareInMapNavigator;
      if(typeof prepare==='function'){
        window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=false;
        removeRecovery();
        try{document.getElementById('ttdMissionHoldShieldV6')?.remove();}catch(_){}
        try{
          if(prepare(runState)!==false)return;
          failClosed('Al Hata Arrival Cove could not prepare its Navigator summon.',null,runState,token);
        }catch(err){
          failClosed('Al Hata Arrival Cove hit an initialization error.',err,runState,token);
        }
        return;
      }
    }
    if(performance.now()-startedAt>=RUN_READY_TIMEOUT_MS){
      window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=false;
      const reason=!gameReady?'Al Hata Arrival Cove did not reach the game map after loading.':!isAlHataStage1Run(runState)?'Al Hata Arrival Cove did not resolve the Stage 1 run state.':'Al Hata Arrival Cove Navigator runtime did not become ready.';
      failClosed(reason,null,runState,token);
      return;
    }
    requestAnimationFrame(()=>waitForInMapPrelude(previousState,token,startedAt));
  }

  function launchAlHataInMap(runner,self,args,stageIdx=0){
    const advId=args[0];
    if(!validateLaunch(advId,stageIdx))return undefined;
    const token=++launchToken,previousState=state;
    removeRecovery();window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=true;
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
