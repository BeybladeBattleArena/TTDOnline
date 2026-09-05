/* Al Hata Stage 1 playtest opening — load first, then summon Navigator inside Arrival Cove before MISSION / START. */
window.__TTD_AL_HATA_STAGE1_PLAYTEST_V1=true;
window.__TTD_AL_HATA_STAGE1_PLAYTEST_V2=true;
const AH_PLAYTEST_CENTER_BOARD_INDEX=7;
const AH_PLAYTEST_LANDING_START=Object.freeze({x:285,z:0,y:0});
const AH_PLAYTEST_LANDING_COMBAT_X=620;
const AH_PLAYTEST_NATIVE_PAUSE_KEY='__ttdAlHataNativePauseV1';

function AH_PLAYTEST_releaseNativePause(runState,running=false){
  if(!runState)return;
  const hold=runState[AH_PLAYTEST_NATIVE_PAUSE_KEY];
  if(!hold){runState.running=!!running;return;}
  const prior=hold.descriptor;
  try{
    if(prior&&Object.prototype.hasOwnProperty.call(prior,'value'))Object.defineProperty(runState,'running',{...prior,value:!!running});
    else if(prior){Object.defineProperty(runState,'running',prior);runState.running=!!running;}
    else Object.defineProperty(runState,'running',{value:!!running,writable:true,configurable:true,enumerable:true});
  }finally{try{delete runState[AH_PLAYTEST_NATIVE_PAUSE_KEY];}catch(_){}}
}
function AH_PLAYTEST_installNativePause(runState){
  if(!runState)return false;
  const existing=runState[AH_PLAYTEST_NATIVE_PAUSE_KEY];if(existing){existing.value=false;return true;}
  const descriptor=Object.getOwnPropertyDescriptor(runState,'running');
  const hold={descriptor,value:false,suppressedResumes:0};
  Object.defineProperty(runState,AH_PLAYTEST_NATIVE_PAUSE_KEY,{value:hold,configurable:true,enumerable:false});
  Object.defineProperty(runState,'running',{
    configurable:true,enumerable:descriptor?.enumerable!==false,
    get(){return hold.value;},
    set(value){
      const wantsRunning=!!value;
      if(wantsRunning&&session?.active&&session.__ttdAlHata){hold.suppressedResumes+=1;hold.value=false;return;}
      if(wantsRunning&&!session?.active){AH_PLAYTEST_releaseNativePause(runState,true);return;}
      hold.value=wantsRunning;
    },
  });
  return true;
}

const AH_PLAYTEST_baseBeachPlatforms=AH_beachPlatforms;
AH_beachPlatforms=function AH_beachPlatformsWithArrivalCove(){
  const out=AH_PLAYTEST_baseBeachPlatforms();
  if(!out.some(p=>p.id==='landing_cove'))out.unshift({id:'landing_cove',x1:135,x2:700,z1:-315,z2:315,y:0,kind:'sand'});
  return out;
};
AH_SEGMENT_STARTS.landing={...AH_PLAYTEST_LANDING_START};
AH_SEGMENT_PLATFORMS.landing=AH_beachPlatforms;
AH_SEGMENT_PLATFORMS.beach=AH_beachPlatforms;
AH_SEGMENT_DRAWERS.landing=AH_drawBeachTraversal;

const AH_PLAYTEST_STYLE_ID='ttdAhInMapNavigatorStyleV2';
if(!document.getElementById(AH_PLAYTEST_STYLE_ID)){
  const style=document.createElement('style');
  style.id=AH_PLAYTEST_STYLE_ID;
  style.textContent=`
    #ttdAhInMapNavigatorPromptV2{position:absolute;inset:0;z-index:24;display:flex;align-items:center;justify-content:center;padding:18px;pointer-events:auto;touch-action:none;}
    #ttdAhInMapNavigatorPromptV2 .ttdAhNavCard{pointer-events:auto;touch-action:auto;width:min(88%,360px);padding:15px 16px 14px;border-radius:14px;border:1px solid rgba(243,212,145,.72);background:rgba(9,13,24,.90);box-shadow:0 12px 36px rgba(0,0,0,.46),0 0 22px rgba(243,212,145,.12);backdrop-filter:blur(4px);text-align:center;}
    #ttdAhInMapNavigatorPromptV2 .ttdAhNavEyebrow{margin-bottom:5px;color:#8fc4e8;font:700 9px 'Space Mono',monospace;letter-spacing:.16em;}
    #ttdAhInMapNavigatorPromptV2 .ttdAhNavTitle{color:#f3d491;font:400 clamp(20px,6vw,30px) 'Russo One',sans-serif;letter-spacing:.035em;text-shadow:0 2px 0 rgba(0,0,0,.88),0 0 10px rgba(243,212,145,.28);}
    #ttdAhInMapNavigatorPromptV2 .ttdAhNavCopy{margin:7px auto 12px;color:#d8d5c9;font:600 11px 'Inter',sans-serif;line-height:1.45;max-width:285px;}
    #ttdAhInMapNavigatorPromptV2 .ttdAhNavButton{appearance:none;border:1px solid rgba(212,236,250,.72);border-radius:10px;padding:10px 16px;min-width:190px;background:linear-gradient(180deg,#b8ecff,#6dbbe5);color:#102033;font:700 12px 'Cinzel',serif;letter-spacing:.04em;box-shadow:0 0 18px rgba(143,196,232,.28);cursor:pointer;touch-action:manipulation;animation:ttdAhInMapSummonPulseV2 1.1s ease-in-out infinite;}
    #ttdAhInMapNavigatorPromptV2 .ttdAhNavButton:active{transform:translateY(1px) scale(.98);}
    #ttdAhInMapNavigatorPromptV2 .ttdAhNavFree{display:block;margin-top:6px;color:#f3d491;font:700 8px 'Space Mono',monospace;letter-spacing:.14em;}
    @keyframes ttdAhInMapSummonPulseV2{50%{box-shadow:0 0 26px rgba(143,196,232,.52);transform:scale(.985)}}
    #gameScreen.ttd-ah-awaiting-navigator #ttdJoyWrap,#gameScreen.ttd-ah-awaiting-navigator #ttdJumpBtn{visibility:hidden!important;pointer-events:none!important;}
    #gameScreen.ttd-ah-awaiting-navigator #ttdControllerReadout{color:#97a0bd!important;}
  `;
  document.head.appendChild(style);
}

function AH_PLAYTEST_syncLandingWorld(){
  if(!session?.active)return;const w=AH_ensureWorld();if(!w)return;
  w.cameraX=session.cameraX;w.checkpoint={...session.checkpoint};w.objects=session.objects;w.drops=session.drops;
}
function AH_PLAYTEST_landingUpdater(dt){
  const n=session?.nav;if(!n)return;
  n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);
  if(state.__ttdMissionIntroHold||session.phase!=='play'){session.cameraX+=((n.x+150)-session.cameraX)*Math.min(1,dt*3);AH_PLAYTEST_syncLandingWorld();return;}
  const inp=inputVector(),speed=160;let nx=n.x+inp.x*speed*dt,nz=AH_clamp(n.z+inp.z*speed*dt,-275,275);
  const cg=groundAt(n.x,n.z,session.time),tg=groundAt(nx,nz,session.time);if(n.onGround&&tg&&cg&&tg.y-cg.y>42){nx=n.x;nz=n.z;}
  n.x=nx;n.z=nz;n.vy-=650*dt;n.y+=n.vy*dt;const ground=groundAt(n.x,n.z,session.time);
  if(ground&&n.vy<=0&&n.y<=ground.y+3){n.y=ground.y;n.vy=0;n.onGround=true;n.jumps=0;}else n.onGround=false;
  if(n.y<-150){navigatorDamage(Math.max(8,n.die.maxHp*.18),'Navigator fell');if(session?.nav){n.x=AH_PLAYTEST_LANDING_START.x;n.z=0;n.y=0;n.vy=0;n.jumps=0;n.onGround=true;}}
  collectNearbyDrops();
  if(n.x>AH_PLAYTEST_LANDING_COMBAT_X&&Math.abs(n.z)<250){
    const w=AH_ensureWorld();w.openingExplorationComplete=true;w.cameraX=AH_AREAS[1].cameraX;w.checkpoint={x:720,z:0,y:0};
    const button=document.getElementById('summonBtn');if(button)button.disabled=false;
    AH_finishTraversalToCombat(1,1,'Landing Shore');return;
  }
  session.cameraX+=((n.x+150)-session.cameraX)*Math.min(1,dt*3);AH_PLAYTEST_syncLandingWorld();
}
AH_SEGMENT_UPDATERS.landing=AH_PLAYTEST_landingUpdater;

function AH_PLAYTEST_setControllerLocked(locked){
  const game=document.getElementById('gameScreen');game?.classList.toggle('ttd-ah-awaiting-navigator',!!locked);
  const readout=document.getElementById('ttdControllerReadout');
  if(readout)readout.innerHTML=locked?'<strong>NAVIGATOR</strong>Summon a die to begin':'<strong>MOVE</strong>Drag joystick<br>Double jump enabled';
}

function AH_PLAYTEST_removeInMapPrompt(){document.getElementById('ttdAhInMapNavigatorPromptV2')?.remove();}
function AH_PLAYTEST_showError(message){
  const prompt=document.getElementById('ttdAhInMapNavigatorPromptV2');if(!prompt)return;
  const card=prompt.querySelector('.ttdAhNavCard');if(card)card.innerHTML=`<div class="ttdAhNavEyebrow">AL HATA</div><div class="ttdAhNavTitle">ARRIVAL PAUSED</div><div class="ttdAhNavCopy">${String(message||'The Navigator sequence could not continue.')}</div>`;
}

function AH_PLAYTEST_beginMissionAfterNavigator(runState){
  const begin=()=>{
    if(state!==runState||!AH_isState()||!session?.active||session.segment!=='landing')return;
    AH_PLAYTEST_installNativePause(runState);
    runState.__ttdMissionIntroHold=false;runState.__ttdAlHataOpeningPrelude=false;
    session.phase='play';session.lastTs=0;AH_PLAYTEST_setControllerLocked(false);
    if(modeLabel)modeLabel.textContent='Al Hata · Arrival Cove';
  };
  const present=window.TTDGamePresentation?.presentRunStart;
  if(typeof present!=='function'){
    AH_PLAYTEST_showError('MISSION / START presentation is unavailable. Gameplay remains paused.');
    console.error('Al Hata prepared mission start is unavailable.');
    return;
  }
  Promise.resolve(present(begin)).then(started=>{
    if(started===false&&state===runState&&session?.phase!=='play')AH_PLAYTEST_showError('MISSION / START could not begin. Gameplay remains paused.');
  }).catch(err=>{console.error('Al Hata prepared mission start failed.',err);AH_PLAYTEST_showError('MISSION / START could not begin. Gameplay remains paused.');});
}

function AH_PLAYTEST_createNavigator(runState){
  if(state!==runState||!AH_isState()||!session?.active||session.segment!=='landing'||session.phase!=='summon')return false;
  AH_PLAYTEST_installNativePause(runState);
  const boardIndex=AH_PLAYTEST_CENTER_BOARD_INDEX,die=makeDie(randDeckKey());
  runState.board[boardIndex]=die;
  session.nav={die,boardIndex,x:AH_PLAYTEST_LANDING_START.x,z:0,y:0,vy:0,onGround:true,jumps:0,invuln:0,alpha:1,spawnT:0};
  session.phase='ready';
  initObjectHp();renderBoard();renderHUD();
  try{drawScene();}catch(err){console.warn('Arrival Cove Navigator preview draw recovered.',err);}
  AH_PLAYTEST_removeInMapPrompt();
  toast(`${DICE[die.key]?.name||die.key} is ready as Navigator`);
  AH_PLAYTEST_beginMissionAfterNavigator(runState);
  return true;
}

function AH_PLAYTEST_showInMapNavigatorPrompt(runState){
  AH_PLAYTEST_removeInMapPrompt();
  const lane=document.getElementById('laneWrap');if(!lane)return false;
  const prompt=document.createElement('div');prompt.id='ttdAhInMapNavigatorPromptV2';
  prompt.innerHTML='<div class="ttdAhNavCard"><div class="ttdAhNavEyebrow">AL HATA · ARRIVAL COVE</div><div class="ttdAhNavTitle">NAVIGATOR REQUIRED</div><div class="ttdAhNavCopy">Summon one starting die to lead the expedition. Gameplay will remain paused until your Navigator is ready.</div><button class="ttdAhNavButton" type="button">SUMMON NAVIGATOR</button><span class="ttdAhNavFree">FREE STARTING SUMMON</span></div>';
  lane.appendChild(prompt);
  const button=prompt.querySelector('.ttdAhNavButton');let activated=false;
  const activate=event=>{
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(activated)return;
    if(AH_PLAYTEST_createNavigator(runState)){activated=true;return;}
    console.error('Al Hata Navigator summon rejected an out-of-sync Cove state.');
    AH_PLAYTEST_showError('Navigator summon could not bind to the current Cove state. Retry the Cove.');
  };
  button?.addEventListener('pointerdown',activate,{passive:false});
  button?.addEventListener('click',activate);
  return true;
}

function AH_PLAYTEST_prepareInMapNavigator(runState){
  if(!runState||state!==runState)return false;
  if(runState.adventureStage===AH_STAGE&&!runState.__ttdAlHataStage1)AH_tagState();
  if(!AH_isState())return false;
  AH_tagState();
  window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=false;
  runState.spawnQueue=[];runState.enemies=[];runState.spawnTimer=0;runState.wave=1;runState.waveClearedAt=0;runState.waveClearCredited=false;runState.completedWaves=0;runState.kills=0;runState.time=0;
  if(Number.isFinite(Number(runState.adventureDiff?.lives)))runState.lives=Number(runState.adventureDiff.lives);
  runState.__ttdMissionIntroHold=true;runState.__ttdAlHataOpeningPrelude=true;runState.__ttdAlHataCombatArea=1;
  runState.board.fill(null);
  const world=AH_ensureWorld();world.segment='landing';world.cameraX=330;world.checkpoint={...AH_PLAYTEST_LANDING_START};world.combatArea=1;
  session={active:true,phase:'summon',nav:null,w:1,h:1,cameraX:330,time:0,lastTs:0,joyX:0,joyZ:0,checkpoint:{...AH_PLAYTEST_LANDING_START},objects:world.objects,drops:world.drops,hazardCd:0,returnAlpha:1,__ttdAlHata:true,segment:'landing'};
  AH_PLAYTEST_installNativePause(runState);
  renderBoard();renderHUD();
  const nativeSummon=document.getElementById('summonBtn');if(nativeSummon)nativeSummon.disabled=true;
  if(modeLabel)modeLabel.textContent='Al Hata · Arrival Cove';
  enterPlatformLayout();AH_PLAYTEST_setControllerLocked(true);
  requestAnimationFrame(()=>{try{drawScene();}catch(err){console.warn('Arrival Cove opening draw recovered.',err);}AH_PLAYTEST_showInMapNavigatorPrompt(runState);});
  return true;
}

window.__TTD_AL_HATA_STAGE1_PLAYTEST_API=Object.freeze({version:3,prepareInMapNavigator:AH_PLAYTEST_prepareInMapNavigator});
