(() => {
  'use strict';
  if(window.__TTD_TEST_MAINMAP_BATTLE_V5)return;
  window.__TTD_TEST_MAINMAP_BATTLE_V5=true;
  window.__TTD_TEST_MAINMAP_BATTLE_V4=true;

  const TEST_ID='test_map';
  const BACK_ID='ttdMainMapCombatBackV5';
  const FRONT_ID='ttdMainMapCombatFrontV5';
  let countdownArmed=false;
  let projectedRoute=[];
  let projectedRouteLens=[];

  const style=document.createElement('style');
  style.id='ttdMainMapCombatStyleV5';
  style.textContent=`
    #laneWrap.ttd-mainmap-combat-v5{background:#101522!important;overflow:hidden;}
    #laneWrap.ttd-mainmap-combat-v5 #${BACK_ID},
    #laneWrap.ttd-mainmap-combat-v5 #${FRONT_ID}{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}
    #laneWrap.ttd-mainmap-combat-v5 #${BACK_ID}{z-index:0;}
    #laneWrap.ttd-mainmap-combat-v5 #laneCanvas{z-index:2;background:transparent!important;}
    #laneWrap.ttd-mainmap-combat-v5 #${FRONT_ID}{z-index:3;}
    #laneWrap.ttd-mainmap-combat-v5 #toast{z-index:7;}
    #laneWrap.ttd-mainmap-combat-v5 #ttdPseudoBattleBackV1,
    #laneWrap.ttd-mainmap-combat-v5 #ttdPseudoBattleFrontV1,
    #laneWrap.ttd-mainmap-combat-v5 #ttdPseudoBattleBadgeV1,
    #laneWrap.ttd-mainmap-combat-v5 #ttdMainMapCombatBackV2,
    #laneWrap.ttd-mainmap-combat-v5 #ttdMainMapCombatFrontV2,
    #laneWrap.ttd-mainmap-combat-v5 #ttdMainMapCombatBackV3,
    #laneWrap.ttd-mainmap-combat-v5 #ttdMainMapCombatFrontV3,
    #laneWrap.ttd-mainmap-combat-v5 #ttdMainMapCombatBackV4,
    #laneWrap.ttd-mainmap-combat-v5 #ttdMainMapCombatFrontV4{display:none!important;}
  `;
  document.head.appendChild(style);

  function platformApi(){return window.__TTD_PLATFORM_TEST_API||null;}
  function worldState(){return state?.__ttdWorldState||null;}
  function isTestState(){return !!state?.__ttdTestMap&&!!state?.adventure&&!state?.typhoonPhase;}
  function hasWorldRenderer(){return isTestState()&&typeof platformApi()?.renderBattleBackdrop==='function';}
  // Selection happens while the camera is still looking at the arena. Traversal owns the
  // presentation only after its actual map canvas is visible, preventing a fake map swap.
  function traversalVisible(){return document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode');}
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

  function cameraForArea(area=combatArea()){
    const explicit=Number(platformApi()?.arenaCameraX?.(area));
    if(Number.isFinite(explicit))return explicit;
    const persisted=Number(worldState()?.cameraX);
    return Number.isFinite(persisted)?persisted:null;
  }

  function projectionFor(w,h,area=combatArea()){
    const api=platformApi();
    if(typeof api?.projectBattleRoute!=='function')return null;
    const route=api.projectBattleRoute(w,h,area,cameraForArea(area));
    return route&&Array.isArray(route.points)&&route.points.length>1?route:null;
  }

  function rebuildProjectedMeta(points){
    projectedRoute=points||[];projectedRouteLens=[];
    for(let i=1;i<projectedRoute.length;i++)projectedRouteLens.push(Math.hypot(projectedRoute[i].x-projectedRoute[i-1].x,projectedRoute[i].y-projectedRoute[i-1].y));
  }

  function projectedScaleAtDistance(distance){
    if(projectedRoute.length<2)return 1;
    let d=Math.max(0,Number(distance)||0);
    for(let i=0;i<projectedRouteLens.length;i++){
      const len=projectedRouteLens[i]||1;
      if(d<=len){const t=Math.max(0,Math.min(1,d/len));const a=Number(projectedRoute[i].scale)||1,b=Number(projectedRoute[i+1].scale)||a;return a+(b-a)*t;}
      d-=len;
    }
    return Number(projectedRoute[projectedRoute.length-1]?.scale)||1;
  }

  function drawProjectedLaneSurface(g,w,h){
    const route=projectionFor(w,h);if(!route)return;
    rebuildProjectedMeta(route.points);
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i],sc=((Number(a.scale)||1)+(Number(b.scale)||1))*.5;
      g.lineCap='round';g.lineJoin='round';
      g.strokeStyle='rgba(103,91,166,.10)';g.lineWidth=Math.max(10,26*sc);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
      g.strokeStyle='rgba(235,206,143,.14)';g.lineWidth=Math.max(.8,1.4*sc);g.stroke();
    }
  }

  function drawEnemyGroundShadows(g){
    if(!Array.isArray(state?.enemies)||!projectedRoute.length)return;
    for(const e of state.enemies){
      if(!e?.alive||e.isTyphoon||e.isZombie)continue;
      const p=posAtDistance(e.dist),sc=projectedScaleAtDistance(e.dist);
      g.save();g.globalAlpha=.18;g.fillStyle='#05070b';g.beginPath();g.ellipse(p.x,p.y+3,Math.max(4,8*sc),Math.max(1.5,2.7*sc),0,0,Math.PI*2);g.fill();g.restore();
    }
  }

  function drawExactBackdrop(){
    const pack=ensureCanvas(BACK_ID,0);if(!pack)return false;
    const {g,w,h}=pack;g.clearRect(0,0,w,h);
    const cameraX=cameraForArea();
    const drawn=platformApi()?.renderBattleBackdrop?.(g,w,h,combatArea(),performance.now()/1000,cameraX)===true;
    if(drawn){drawProjectedLaneSurface(g,w,h);drawEnemyGroundShadows(g);}
    return drawn;
  }

  function drawCombatBounds(){
    const pack=ensureCanvas(FRONT_ID,3);if(!pack)return;
    const {g,w,h}=pack;g.clearRect(0,0,w,h);
    const pulse=.24+.07*Math.sin(performance.now()/540);
    const api=platformApi(),area=combatArea(),cam=cameraForArea(area);
    const center=api?.arenaCenter?.(area);
    if(center&&typeof api?.projectWorldPoint==='function'){
      const far=api.projectWorldPoint(center.x,center.z-270,center.y||0,w,h,cam);
      const near=api.projectWorldPoint(center.x,center.z+270,center.y||0,w,h,cam);
      const leftFar=api.projectWorldPoint(center.x-330,center.z-270,center.y||0,w,h,cam);
      const leftNear=api.projectWorldPoint(center.x-330,center.z+270,center.y||0,w,h,cam);
      const rightFar=api.projectWorldPoint(center.x+330,center.z-270,center.y||0,w,h,cam);
      const rightNear=api.projectWorldPoint(center.x+330,center.z+270,center.y||0,w,h,cam);
      g.strokeStyle=`rgba(143,196,232,${pulse})`;g.lineWidth=1.2;
      [[leftFar,leftNear],[rightFar,rightNear]].forEach(([a,b])=>{g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();});
      g.fillStyle='rgba(143,196,232,.10)';
      [leftNear,rightNear].forEach((p,i)=>{g.beginPath();g.moveTo(p.x,p.y-5);g.lineTo(p.x+(i? -12:12),p.y+1);g.lineTo(p.x,p.y+7);g.closePath();g.fill();});
      return;
    }
    const left=w*.07,right=w*.94,top=h*.13,bottom=h*.90;
    const drawGate=(x,flip)=>{g.strokeStyle=`rgba(143,196,232,${pulse})`;g.lineWidth=1.2;g.beginPath();g.moveTo(x,top);g.lineTo(x,bottom);g.stroke();g.fillStyle='rgba(143,196,232,.12)';g.beginPath();g.moveTo(x,bottom-5);g.lineTo(x+flip*12,bottom+1);g.lineTo(x,bottom+7);g.closePath();g.fill();};
    drawGate(left,1);drawGate(right,-1);
  }

  function showCombatWorld(){
    const lane=document.getElementById('laneWrap');if(!lane)return;
    lane.classList.remove('ttd-mainmap-combat-v2','ttd-mainmap-combat-v3','ttd-mainmap-combat-v4');lane.classList.add('ttd-mainmap-combat-v5');
    ['ttdMainMapCombatBackV2','ttdMainMapCombatFrontV2','ttdMainMapCombatBackV3','ttdMainMapCombatFrontV3','ttdMainMapCombatBackV4','ttdMainMapCombatFrontV4'].forEach(id=>document.getElementById(id)?.remove());
    drawExactBackdrop();drawCombatBounds();
  }
  function hideCombatWorld(){
    const lane=document.getElementById('laneWrap');lane?.classList.remove('ttd-mainmap-combat-v2','ttd-mainmap-combat-v3','ttd-mainmap-combat-v4','ttd-mainmap-combat-v5');
    [BACK_ID,FRONT_ID,'ttdMainMapCombatBackV2','ttdMainMapCombatFrontV2','ttdMainMapCombatBackV3','ttdMainMapCombatFrontV3','ttdMainMapCombatBackV4','ttdMainMapCombatFrontV4'].forEach(id=>document.getElementById(id)?.remove());
  }

  function installFallbackPath(w,h,area){
    pathPts=area===1?[
      {x:w*.96,y:h*.18},{x:w*.70,y:h*.18},{x:w*.70,y:h*.39},{x:w*.43,y:h*.39},{x:w*.43,y:h*.68},{x:w*.20,y:h*.68},{x:w*.10,y:h*.56},
    ]:[
      {x:w*.95,y:h*.24},{x:w*.72,y:h*.24},{x:w*.72,y:h*.58},{x:w*.54,y:h*.58},{x:w*.54,y:h*.33},{x:w*.31,y:h*.33},{x:w*.31,y:h*.72},{x:w*.12,y:h*.72},
    ];
    rebuildProjectedMeta(pathPts.map(p=>({...p,scale:1})));
  }

  function installCombatPath(w,h){
    const area=combatArea(),route=projectionFor(w,h,area);
    if(route){
      pathPts=route.points.map(p=>({x:p.x,y:p.y}));
      rebuildProjectedMeta(route.points);
    }else installFallbackPath(w,h,area);
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

  const baseUpdateSpawnsV5=updateSpawns;
  updateSpawns=function updateSpawnsWithCombatIntroV5(dt){
    if(armSubsequentCombatCountdown())return;
    return baseUpdateSpawnsV5(dt);
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
    if(p)p.textContent='One continuous beach, jungle and temple world: combat routes are projected onto the same ground planes used by Navigator traversal, with one persistent camera throughout.';
  };

  window.__TTD_TEST_PSEUDO3D_BATTLE_API={
    version:5,
    get active(){return combatVisible();},
    get usesPersistentTraversalRenderer(){return hasWorldRenderer();},
    get usesWorldProjectedRoute(){return typeof platformApi()?.projectBattleRoute==='function';},
    get area(){return combatArea();},
    get routeLength(){return Number(totalLen)||0;}
  };
})();
