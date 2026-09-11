(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_RUNTIME_GUARD_V6)return;
  window.__TTD_DARK_MONASTERY_RUNTIME_GUARD_V6=true;

  const DM_ID='dark_monastery';
  const HOLD=Object.freeze({__ttdDarkMonasteryHold:true,__ttdDarkMonasteryRuntimeGuard:true});
  const priorEndMatch=typeof endMatch==='function'?endMatch:null;
  let currentState=null;
  let terminal=false;
  let terminalReason='';
  let recoveries=0;
  let blockedPrematureEnds=0;
  let hudRepairs=0;
  let holdRepairs=0;
  let lastHeartbeat=0;

  function stageActive(){
    return !!(state?.__ttdDarkMonastery&&state?.adventureStage?.darkMonastery);
  }
  function gameVisible(){
    return !!document.getElementById('gameScreen')?.classList.contains('active');
  }
  function gameplayLocked(){
    return !!state?.__ttdDMGameplayLock;
  }
  function actors(){
    return window.__TTD_DARK_MONASTERY_API_V1?.actors||[];
  }
  function encounterDone(){
    const list=actors();
    return list.length>=4&&list.every(a=>a?.finalDead===true);
  }
  function playerDead(){
    return Number(state?.lives)<=0;
  }
  function ensureHold(){
    if(!stageActive())return;
    if(!Array.isArray(state.spawnQueue)||!state.spawnQueue.some(x=>x?.__ttdDarkMonasteryHold===true)){
      state.spawnQueue=[HOLD];
      state.spawnTimer=999;
      state.waveClearedAt=0;
      state.waveClearCredited=false;
      holdRepairs++;
    }
  }
  function repairHud(){
    if(!stageActive())return;
    const label=document.querySelector('#gameScreen #livesStat .label, #gameScreen .hud-stat.lives .label');
    if(label&&label.textContent!=='HP'){label.textContent='HP';hudRepairs++;}
    if(state){
      state.showPlayerHpBar=true;
      state.playerHpLabel='Player HP';
      state.__ttdDMNoWipeout=true;
    }
  }
  function resetForState(){
    currentState=state;
    terminal=false;
    terminalReason='';
    ensureHold();
    repairHud();
  }
  function shouldOwnRun(){
    return stageActive()&&gameVisible()&&!gameplayLocked()&&!terminal&&!playerDead()&&!encounterDone();
  }

  if(priorEndMatch){
    endMatch=function DarkMonasteryRuntimeGuard_endMatch(reason){
      if(stageActive()){
        const r=String(reason||'').toLowerCase();
        const premature=(r==='clear'||r==='wipeout'||r==='victory'||r==='defeat')&&!playerDead()&&!encounterDone();
        if(premature){
          blockedPrematureEnds++;
          ensureHold();
          repairHud();
          if(!gameplayLocked())state.running=true;
          return;
        }
        terminal=true;
        terminalReason=r||'end';
      }
      return priorEndMatch.apply(this,arguments);
    };
  }

  function watchdog(ts){
    lastHeartbeat=ts;
    if(state!==currentState){
      if(stageActive())resetForState();
      else{currentState=state;terminal=false;terminalReason='';}
    }
    if(stageActive()){
      repairHud();
      ensureHold();
      if(gameplayLocked()){
        if(state.running!==false)state.running=false;
      }else if(shouldOwnRun()&&state.running===false){
        state.running=true;
        state.__ttdDMNoWipeout=true;
        recoveries++;
      }
      if(playerDead()||encounterDone())terminal=true;
    }
    requestAnimationFrame(watchdog);
  }
  requestAnimationFrame(watchdog);

  window.__TTD_DARK_MONASTERY_RUNTIME_GUARD_V6_API=Object.freeze({
    version:6,
    id:DM_ID,
    get stageActive(){return stageActive();},
    get gameplayLocked(){return gameplayLocked();},
    get terminal(){return terminal;},
    get terminalReason(){return terminalReason;},
    get recoveries(){return recoveries;},
    get blockedPrematureEnds(){return blockedPrematureEnds;},
    get hudRepairs(){return hudRepairs;},
    get holdRepairs(){return holdRepairs;},
    get lastHeartbeat(){return lastHeartbeat;},
    ensureHold,
    repairHud,
  });
})();
