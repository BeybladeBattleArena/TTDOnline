/* Al Hata Stage 1 playtest opening — free center-slot Navigator before MISSION / START. */
window.__TTD_AL_HATA_STAGE1_PLAYTEST_V1=true;
const AH_PLAYTEST_CENTER_BOARD_INDEX=7;
const AH_PLAYTEST_LANDING_START=Object.freeze({x:285,z:0,y:0});
const AH_PLAYTEST_LANDING_COMBAT_X=620;

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

function AH_PLAYTEST_syncLandingWorld(){
  if(!session?.active)return;const w=AH_ensureWorld();if(!w)return;
  w.cameraX=session.cameraX;w.checkpoint={...session.checkpoint};w.objects=session.objects;w.drops=session.drops;
}
function AH_PLAYTEST_landingUpdater(dt){
  const n=session?.nav;if(!n)return;
  n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);
  if(!state.running||state.__ttdMissionIntroHold){session.cameraX+=((n.x+150)-session.cameraX)*Math.min(1,dt*3);AH_PLAYTEST_syncLandingWorld();return;}
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

function AH_PLAYTEST_armNavigatorForMission(){
  if(!window.__TTD_AL_HATA_PLAYTEST_PENDING_NAV_START)return false;
  if(state?.adventureStage===AH_STAGE&&!state.__ttdAlHataStage1)AH_tagState();
  if(!AH_isState())return false;
  window.__TTD_AL_HATA_PLAYTEST_PENDING_NAV_START=false;
  AH_tagState();
  state.spawnQueue=[];state.enemies=[];state.spawnTimer=0;state.wave=1;state.running=false;
  state.__ttdAlHataOpeningPrelude=true;state.__ttdAlHataCombatArea=1;
  state.board.fill(null);
  const boardIndex=AH_PLAYTEST_CENTER_BOARD_INDEX,die=makeDie(randDeckKey());state.board[boardIndex]=die;
  const world=AH_ensureWorld();world.segment='landing';world.cameraX=330;world.checkpoint={...AH_PLAYTEST_LANDING_START};world.combatArea=1;
  session={active:true,phase:'ready',nav:{die,boardIndex,x:AH_PLAYTEST_LANDING_START.x,z:0,y:0,vy:0,onGround:true,jumps:0,invuln:0,alpha:1,spawnT:0},w:1,h:1,cameraX:330,time:0,lastTs:0,joyX:0,joyZ:0,checkpoint:{...AH_PLAYTEST_LANDING_START},objects:world.objects,drops:world.drops,hazardCd:0,returnAlpha:1,__ttdAlHata:true,segment:'landing'};
  renderBoard();renderHUD();
  const button=document.getElementById('summonBtn');if(button)button.disabled=true;
  toast(`${DICE[die.key]?.name||die.key} is ready as Navigator`);
  const waitForMissionStart=()=>{
    if(!AH_isState()||!session?.active||session.segment!=='landing')return;
    if(session.phase==='ready'&&state.running&&!state.__ttdMissionIntroHold){
      session.phase='play';initObjectHp();enterPlatformLayout();state.__ttdAlHataOpeningPrelude=false;
      if(modeLabel)modeLabel.textContent='Al Hata · Arrival Cove';return;
    }
    requestAnimationFrame(waitForMissionStart);
  };
  requestAnimationFrame(waitForMissionStart);return true;
}

const AH_PLAYTEST_baseStartAdventure=startAdventure;
startAdventure=function AH_startAdventureNavigatorFirst(advId,stageIdx,diffKey){
  const result=AH_PLAYTEST_baseStartAdventure(advId,stageIdx,diffKey);
  if(advId===AH_ID&&Number(stageIdx)===0)AH_PLAYTEST_armNavigatorForMission();
  return result;
};

const AH_PLAYTEST_baseStartAdventureCampaign=startAdventureCampaign;
startAdventureCampaign=function AH_startAdventureCampaignNavigatorFirst(advId,diffKey){
  const result=AH_PLAYTEST_baseStartAdventureCampaign(advId,diffKey);
  if(advId===AH_ID)AH_PLAYTEST_armNavigatorForMission();
  return result;
};
