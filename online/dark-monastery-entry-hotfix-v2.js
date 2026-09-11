(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_ENTRY_HOTFIX_V2)return;
  window.__TTD_DARK_MONASTERY_ENTRY_HOTFIX_V2=true;
  window.__TTD_DARK_MONASTERY_ENTRY_HOTFIX_V2_BUILD='native-clear-hold-v2';

  const DM_ID='dark_monastery';
  const priorStartAdventure=startAdventure;
  const HOLD=Object.freeze({__ttdDarkMonasteryHold:true});

  function isDarkMonasteryStage(){
    return !!(state?.adventureStage?.darkMonastery || state?.adventureStages?.[state?.adventureStageIdx||0]?.darkMonastery);
  }

  function armBeforeFirstFrame(){
    if(!state || !isDarkMonasteryStage())return;
    // Dark Monastery owns spawning/clearing. The native Adventure loop separately treats an empty
    // spawn queue + no enemies as an instant stage clear, even when its spawner has been bypassed.
    // Keep one inert sentinel in the queue for the whole roaming encounter. Dark Monastery's
    // updateSpawns wrapper never consumes it, and Dark Monastery ends the run explicitly itself.
    state.__ttdDarkMonastery=true;
    if(!Array.isArray(state.spawnQueue) || !state.spawnQueue.some(entry=>entry?.__ttdDarkMonasteryHold)){
      state.spawnQueue=[HOLD];
    }
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

    // Synchronous handoff: runs before the native starter's queued gameplay RAF.
    armBeforeFirstFrame();

    // V1 activation creates the player, room, collisions and joystick. V1 currently replaces the
    // queue with [] during activation, so re-arm on each settle frame until activation is confirmed.
    let frames=0;
    const settle=()=>{
      if(!state?.__ttdDarkMonastery || !isDarkMonasteryStage())return;
      armBeforeFirstFrame();
      const active=repairHud();
      if(!active && frames++<180){requestAnimationFrame(settle);return;}
      // One final re-arm after activation so the native wave-clear path stays permanently disabled.
      armBeforeFirstFrame();
      repairHud();
    };
    requestAnimationFrame(settle);
    return result;
  };

  window.__TTD_DARK_MONASTERY_ENTRY_HOTFIX_V2_API=Object.freeze({
    version:2,
    build:'native-clear-hold-v2',
    armBeforeFirstFrame,
    repairHud,
  });
})();
