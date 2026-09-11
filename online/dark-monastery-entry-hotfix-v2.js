(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_ENTRY_HOTFIX_V2)return;
  window.__TTD_DARK_MONASTERY_ENTRY_HOTFIX_V2=true;

  const DM_ID='dark_monastery';
  const priorStartAdventure=startAdventure;

  function isDarkMonasteryStage(){
    return !!(state?.adventureStage?.darkMonastery || state?.adventureStages?.[state?.adventureStageIdx||0]?.darkMonastery);
  }

  function armBeforeFirstFrame(){
    if(!state || !isDarkMonasteryStage())return;
    // The native Adventure starter queues its first RAF before Dark Monastery v1's deferred
    // activation callback. Mark the run immediately so the v1 updateSpawns guard suppresses the
    // empty native wave-clear path on that first frame.
    state.__ttdDarkMonastery=true;
    state.spawnQueue=[];
    state.spawnTimer=999;
    state.waveClearedAt=0;
    state.waveClearCredited=false;
  }

  function repairHud(){
    if(!state?.__ttdDarkMonastery)return false;
    const label=document.querySelector('#gameScreen .hud-stat.lives .label');
    if(label)label.textContent='HP';
    if(state.showPlayerHpBar && typeof renderHUD==='function')renderHUD();
    return !!window.__TTD_DARK_MONASTERY_API_V1?.active;
  }

  startAdventure=function DarkMonastery_startAdventure_v2(advId,stageIdx,diffKey){
    const result=priorStartAdventure(advId,stageIdx,diffKey);
    if(advId!==DM_ID)return result;

    // Synchronous handoff: this executes in the same JS task as the native starter, before its
    // queued requestAnimationFrame(loop) is allowed to run.
    armBeforeFirstFrame();

    // V1 activation is intentionally still responsible for creating the player, pseudo-3D room,
    // body collision and virtual joystick. Keep repairing presentation until that activation lands.
    let frames=0;
    const settle=()=>{
      if(!state?.__ttdDarkMonastery || !isDarkMonasteryStage())return;
      const active=repairHud();
      if(!active && frames++<120)requestAnimationFrame(settle);
      else repairHud();
    };
    requestAnimationFrame(settle);
    return result;
  };

  window.__TTD_DARK_MONASTERY_ENTRY_HOTFIX_V2_API=Object.freeze({
    version:2,
    armBeforeFirstFrame,
    repairHud,
  });
})();
