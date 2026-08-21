(() => {
  'use strict';
  if(window.__TTD_TEST_MAINMAP_BATTLE_V4)return;
  window.__TTD_TEST_MAINMAP_BATTLE_V4=true;

  const TEST_ID='test_map';
  const BACK_ID='ttdMainMapCombatBackV4';
  const FRONT_ID='ttdMainMapCombatFrontV4';
  let countdownArmed=false;

  const style=document.createElement('style');
  style.id='ttdMainMapCombatStyleV4';
  style.textContent=`
    #laneWrap.ttd-mainmap-combat-v4{background:#101522!important;overflow:hidden;}
    #laneWrap.ttd-mainmap-combat-v4 #${BACK_ID},
    #laneWrap.ttd-mainmap-combat-v4 #${FRONT_ID}{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}
    #laneWrap.ttd-mainmap-combat-v4 #${BACK_ID}{z-index:0;}
    #laneWrap.ttd-mainmap-combat-v4 #laneCanvas{z-index:2;background:transparent!important;}
    #laneWrap.ttd-mainmap-combat-v4 #${FRONT_ID}{z-index:3;}
    #laneWrap.ttd-mainmap-combat-v4 #toast{z-index:7;}
    #laneWrap.ttd-mainmap-combat-v4 #ttdPseudoBattleBackV1,
    #laneWrap.ttd-mainmap-combat-v4 #ttdPseudoBattleFrontV1,
    #laneWrap.ttd-mainmap-combat-v4 #ttdPseudoBattleBadgeV1,
    #laneWrap.ttd-mainmap-combat-v4 #ttdMainMapCombatBackV2,
    #laneWrap.ttd-mainmap-combat-v4 #ttdMainMapCombatFrontV2,
    #laneWrap.ttd-mainmap-combat-v4 #ttdMainMapCombatBackV3,
    #laneWrap.ttd-mainmap-combat-v4 #ttdMainMapCombatFrontV3{display:none!important;}
  `;
  document.head.appendChild(style);

  function platformApi(){return window.__TTD_PLATFORM_TEST_API||null;}
  function worldState(){return state?.__ttdWorldState||null;}
  function isTestState(){return !!state?.__ttdTestMap&&!!state?.adventure&&!state?.typhoonPhase;}
  function hasWorldRenderer(){return isTestState()&&typeof platformApi()?.renderBattleBackdrop==='function';}
  function traversalVisible(){return !!platformApi()?.active||document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode');}
  function combatVisible(){return hasWorldRenderer()&&!traversalVisible();}
  function combatArea(){return state?.__ttdPlatformDone?2:1;}

  function ensureCanvas(id,z){
    const lane=document.getElementById('laneWrap');if(!lane)return null;
    let c=document.getElementById(id);
    if(!c){c=document.createElement('canvas');c.id=id;c.style.zIndex=String(z);lane.insertBefore(c,document.getElementById('laneCanvas')||lane.firstChild);}
    const r=lane.getBoundingClientRect();
    const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    const pw=Math.max(1,Math.round(r.width*dpr)),ph=Math.max(1,Math.round(r.height*dpr));
    if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
    const g=c.getContext('2d');if(!g)return null;
    g.setTransform(dpr,0,0,dpr,0,0);
    return {c,g,w:r.width,h:r.height};
  }

  function drawExactBackdrop(){
    const pack=ensureCanvas(BACK_ID,0);if(!pack)return false;
    const {g,w,h}=pack;g.clearRect(0,0,w,h);
    const cameraX=Number(worldState()?.cameraX);
    return platformApi()?.renderBattleBackdrop?.(g,w,h,combatArea(),performance.now()/1000,Number.isFinite(cameraX)?cameraX:null)===true;
  }

  function drawCombatBounds(){
    const pack=ensureCanvas(FRONT_ID,3);if(!pack)return;
    const {g,w,h}=pack;g.clearRect(0,0,w,h);
    const pulse=.28+.08*Math.sin(performance.now()/540);
    const left=w*.07,right=w*.94,top=h*.13,bottom=h*.90;
    const drawGate=(x,flip)=>{
      const grad=g.createLinearGradient(x,top,x,bottom);
      grad.addColorStop(0,'rgba(212,236,250,0)');grad.addColorStop(.2,`rgba(212,236,250,${pulse*.55})`);grad.addColorStop(.78,`rgba(143,196,232,${pulse})`);grad.addColorStop(1,'rgba(143,196,232,0)');
      g.strokeStyle=grad;g.lineWidth=1.5;g.beginPath();g.moveTo(x,top);g.lineTo(x,bottom);g.stroke();
      g.fillStyle='rgba(143,196,232,.16)';g.beginPath();g.moveTo(x,bottom-5);g.lineTo(x+flip*12,bottom+1);g.lineTo(x,bottom+7);g.closePath();g.fill();
    };
    drawGate(left,1);drawGate(right,-1);
  }

  function showCombatWorld(){
    const lane=document.getElementById('laneWrap');if(!lane)return;
    lane.classList.remove('ttd-mainmap-combat-v2','ttd-mainmap-combat-v3');lane.classList.add('ttd-mainmap-combat-v4');
    ['ttdMainMapCombatBackV2','ttdMainMapCombatFrontV2','ttdMainMapCombatBackV3','ttdMainMapCombatFrontV3'].forEach(id=>document.getElementById(id)?.remove());
    drawExactBackdrop();drawCombatBounds();
  }
  function hideCombatWorld(){
    const lane=document.getElementById('laneWrap');lane?.classList.remove('ttd-mainmap-combat-v2','ttd-mainmap-combat-v3','ttd-mainmap-combat-v4');
    [BACK_ID,FRONT_ID,'ttdMainMapCombatBackV2','ttdMainMapCombatFrontV2','ttdMainMapCombatBackV3','ttdMainMapCombatFrontV3'].forEach(id=>document.getElementById(id)?.remove());
  }

  function installCombatPath(w,h){
    const area=combatArea();
    /* Long, readable approaches. The route spans most of the clearing and gives the player time
       to understand the lane before enemies can threaten the tower. */
    pathPts=area===1?[
      {x:w*.96,y:h*.18},{x:w*.70,y:h*.18},{x:w*.70,y:h*.39},{x:w*.43,y:h*.39},
      {x:w*.43,y:h*.68},{x:w*.20,y:h*.68},{x:w*.10,y:h*.56},
    ]:[
      {x:w*.95,y:h*.24},{x:w*.72,y:h*.24},{x:w*.72,y:h*.58},{x:w*.54,y:h*.58},
      {x:w*.54,y:h*.33},{x:w*.31,y:h*.33},{x:w*.31,y:h*.72},{x:w*.12,y:h*.72},
    ];
    segLens=[];totalLen=0;
    for(let i=1;i<pathPts.length;i++){
      const dx=pathPts[i].x-pathPts[i-1].x,dy=pathPts[i].y-pathPts[i-1].y;
      const len=Math.hypot(dx,dy);segLens.push(len);totalLen+=len;
    }
    towerPos=pathPts[pathPts.length-1];
  }

  const baseBuildPath=buildPath;
  buildPath=function buildPathOnPersistentWorld(w,h){if(hasWorldRenderer())return installCombatPath(w,h);return baseBuildPath(w,h);};

  function armSubsequentCombatCountdown(){
    if(!isTestState()||!state.__ttdPlatformDone||state.wave<3||state.__ttdCombatIntroSeen)return false;
    state.__ttdCombatIntroPending=true;
    if(countdownArmed)return true;
    countdownArmed=true;
    const release=()=>{
      if(!state)return;
      state.__ttdCombatIntroSeen=true;
      state.__ttdCombatIntroPending=false;
      countdownArmed=false;
      try{buildPath(cw,ch);}catch(_){}
    };
    const presentation=window.TTDGamePresentation;
    if(presentation?.playCombatCountdown){presentation.playCombatCountdown(release);}
    else setTimeout(release,2680);
    return true;
  }

  const baseUpdateSpawnsV4=updateSpawns;
  updateSpawns=function updateSpawnsWithCombatIntroV4(dt){
    if(armSubsequentCombatCountdown())return;
    return baseUpdateSpawnsV4(dt);
  };

  const baseDrawLane=drawLane;
  drawLane=function drawLaneOnPersistentWorld(dt){
    if(!combatVisible()){hideCombatWorld();return baseDrawLane(dt);}
    showCombatWorld();
    const themeIdx=state.typhoonPhase?2:Math.min(2,state.adventureStageIdx||0);
    const theme=STAGE_THEMES?.[themeIdx];
    const saved=theme?{top:theme.top,bottom:theme.bottom,tint:theme.tint}:null;
    if(theme){theme.top='rgba(0,0,0,0)';theme.bottom='rgba(0,0,0,0)';theme.tint='rgba(0,0,0,0)';}
    try{return baseDrawLane(dt);}finally{
      if(theme&&saved)Object.assign(theme,saved);
      drawExactBackdrop();drawCombatBounds();
    }
  };

  const baseRenderStageScreen=renderStageScreen;
  renderStageScreen=function renderStageScreenWithPersistentWorld(){
    baseRenderStageScreen();
    if(selectedAdventureId!==TEST_ID)return;
    const p=document.querySelector('#stageList .stageCard p');
    if(p)p.textContent='One continuous beach, jungle and temple world: fight in a clearing, traverse forward from that exact location, then fight again without resetting the map, camera or opened objects.';
  };

  window.__TTD_TEST_PSEUDO3D_BATTLE_API={
    version:4,
    get active(){return combatVisible();},
    get usesPersistentTraversalRenderer(){return hasWorldRenderer();},
    get area(){return combatArea();},
    get routeLength(){return Number(totalLen)||0;}
  };
})();
