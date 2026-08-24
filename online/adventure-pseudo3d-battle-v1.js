(() => {
  'use strict';
  if(window.__TTD_TEST_MAINMAP_BATTLE_V6)return;
  window.__TTD_TEST_MAINMAP_BATTLE_V6=true;
  window.__TTD_TEST_MAINMAP_BATTLE_V5=true;
  window.__TTD_TEST_MAINMAP_BATTLE_V4=true;

  const TEST_ID='test_map';
  const BACK_ID='ttdMainMapCombatBackV6';
  const FRONT_ID='ttdMainMapCombatFrontV6';
  const WORLD_ROUTES=Object.freeze({
    1:Object.freeze([
      {x:760,z:-390,y:0},{x:650,z:-245,y:0},{x:535,z:80,y:0},{x:390,z:345,y:0},
      {x:225,z:105,y:0},{x:75,z:-325,y:0},{x:-125,z:95,y:0},
    ]),
    2:Object.freeze([
      {x:2320,z:-405,y:0},{x:2180,z:-245,y:0},{x:2050,z:125,y:0},{x:1880,z:365,y:0},
      {x:1695,z:105,y:0},{x:1515,z:-345,y:0},{x:1320,z:110,y:0},
    ]),
  });
  let countdownArmed=false,coinsCarriedForTraversal=false,lastSelecting=false,lastArea=0;
  let projectedRoute=[],projectedRouteLens=[];

  const style=document.createElement('style');
  style.id='ttdMainMapCombatStyleV6';
  style.textContent=`
    #laneWrap.ttd-mainmap-combat-v6{background:#101522!important;overflow:hidden;}
    #laneWrap.ttd-mainmap-combat-v6 #${BACK_ID},#laneWrap.ttd-mainmap-combat-v6 #${FRONT_ID}{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}
    #laneWrap.ttd-mainmap-combat-v6 #${BACK_ID}{z-index:0;}
    #laneWrap.ttd-mainmap-combat-v6 #laneCanvas{z-index:2;background:transparent!important;}
    #laneWrap.ttd-mainmap-combat-v6 #${FRONT_ID}{z-index:3;}
    #laneWrap.ttd-mainmap-combat-v6 #toast{z-index:7;}
    #laneWrap.ttd-mainmap-combat-v6 #ttdPseudoBattleBackV1,#laneWrap.ttd-mainmap-combat-v6 #ttdPseudoBattleFrontV1,#laneWrap.ttd-mainmap-combat-v6 #ttdPseudoBattleBadgeV1,
    #laneWrap.ttd-mainmap-combat-v6 #ttdMainMapCombatBackV2,#laneWrap.ttd-mainmap-combat-v6 #ttdMainMapCombatFrontV2,
    #laneWrap.ttd-mainmap-combat-v6 #ttdMainMapCombatBackV3,#laneWrap.ttd-mainmap-combat-v6 #ttdMainMapCombatFrontV3,
    #laneWrap.ttd-mainmap-combat-v6 #ttdMainMapCombatBackV4,#laneWrap.ttd-mainmap-combat-v6 #ttdMainMapCombatFrontV4,
    #laneWrap.ttd-mainmap-combat-v6 #ttdMainMapCombatBackV5,#laneWrap.ttd-mainmap-combat-v6 #ttdMainMapCombatFrontV5{display:none!important;}
  `;
  document.head.appendChild(style);

  function platformApi(){return window.__TTD_PLATFORM_TEST_API||null;}
  function worldState(){return state?.__ttdWorldState||null;}
  function isTestState(){return !!state?.__ttdTestMap&&!!state?.adventure&&!state?.typhoonPhase;}
  function hasWorldRenderer(){return isTestState()&&typeof platformApi()?.renderBattleBackdrop==='function';}
  function traversalVisible(){return document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode');}
  function combatVisible(){return hasWorldRenderer()&&!traversalVisible();}
  function combatArea(){return state?.__ttdPlatformDone?2:1;}

  function ensureCanvas(id,z){
    const lane=document.getElementById('laneWrap');if(!lane)return null;
    let c=document.getElementById(id);
    if(!c){c=document.createElement('canvas');c.id=id;c.style.zIndex=String(z);lane.insertBefore(c,document.getElementById('laneCanvas')||lane.firstChild);}
    const r=lane.getBoundingClientRect(),dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    const pw=Math.max(1,Math.round(r.width*dpr)),ph=Math.max(1,Math.round(r.height*dpr));if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
    const g=c.getContext('2d');if(!g)return null;g.setTransform(dpr,0,0,dpr,0,0);return{c,g,w:r.width,h:r.height};
  }
  function cameraForArea(area=combatArea()){
    const explicit=Number(platformApi()?.arenaCameraX?.(area));if(Number.isFinite(explicit))return explicit;
    const persisted=Number(worldState()?.cameraX);return Number.isFinite(persisted)?persisted:null;
  }
  function projectionFor(w,h,area=combatArea()){
    const api=platformApi(),project=api?.projectWorldPoint;if(typeof project!=='function'){
      const fallback=api?.projectBattleRoute?.(w,h,area,cameraForArea(area));return fallback?.points?.length>1?fallback:null;
    }
    const normalized=Number(area)===2?2:1,camera=cameraForArea(normalized),vertices=WORLD_ROUTES[normalized],points=[];
    for(let i=0;i<vertices.length-1;i++){
      const a=vertices[i],b=vertices[i+1],steps=9;
      for(let step=0;step<steps;step++){
        if(i>0&&step===0)continue;
        const t=step/(steps-1),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t,p=project(x,z,y,w,h,camera);
        points.push({...p,worldX:x,worldZ:z,worldY:y});
      }
    }
    return{area:normalized,cameraX:camera,center:api?.arenaCenter?.(normalized),points};
  }
  function rebuildProjectedMeta(points){projectedRoute=points||[];projectedRouteLens=[];for(let i=1;i<projectedRoute.length;i++)projectedRouteLens.push(Math.hypot(projectedRoute[i].x-projectedRoute[i-1].x,projectedRoute[i].y-projectedRoute[i-1].y));}
  function projectedScaleAtDistance(distance){
    if(projectedRoute.length<2)return 1;let d=Math.max(0,Number(distance)||0);
    for(let i=0;i<projectedRouteLens.length;i++){const len=projectedRouteLens[i]||1;if(d<=len){const t=Math.max(0,Math.min(1,d/len)),a=Number(projectedRoute[i].scale)||1,b=Number(projectedRoute[i+1].scale)||a;return a+(b-a)*t;}d-=len;}
    return Number(projectedRoute[projectedRoute.length-1]?.scale)||1;
  }
  function drawArenaClearing(g,w,h){
    const api=platformApi(),area=combatArea(),center=api?.arenaCenter?.(area),project=api?.projectWorldPoint;if(!center||typeof project!=='function')return;
    const cam=cameraForArea(area),halfX=560,halfZ=430,corners=[[-halfX,-halfZ],[halfX,-halfZ],[halfX,halfZ],[-halfX,halfZ]].map(([dx,dz])=>project(center.x+dx,center.z+dz,center.y||0,w,h,cam));
    g.save();g.beginPath();g.moveTo(corners[0].x,corners[0].y);for(let i=1;i<corners.length;i++)g.lineTo(corners[i].x,corners[i].y);g.closePath();
    g.fillStyle=area===1?'rgba(237,214,159,.13)':'rgba(164,166,150,.13)';g.fill();g.strokeStyle='rgba(243,212,145,.10)';g.lineWidth=1;g.stroke();g.restore();
  }
  function drawProjectedLaneSurface(g,w,h){
    const route=projectionFor(w,h);if(!route)return;rebuildProjectedMeta(route.points);
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i],sc=((Number(a.scale)||1)+(Number(b.scale)||1))*.5;
      g.lineCap='round';g.lineJoin='round';g.strokeStyle='rgba(103,91,166,.11)';g.lineWidth=Math.max(8,30*sc);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
      g.strokeStyle='rgba(235,206,143,.22)';g.lineWidth=Math.max(.8,1.8*sc);g.stroke();
    }
  }
  function drawEnemyGroundShadows(g){
    if(!Array.isArray(state?.enemies)||!projectedRoute.length)return;
    for(const e of state.enemies){if(!e?.alive||e.isTyphoon||e.isZombie)continue;const p=posAtDistance(e.dist),sc=projectedScaleAtDistance(e.dist);e.__ttdPerspectiveScale=Math.max(.68,Math.min(1.30,sc/.66));g.save();g.globalAlpha=.22;g.fillStyle='#05070b';g.beginPath();g.ellipse(p.x,p.y+3,Math.max(3.6,8.5*sc),Math.max(1.3,2.8*sc),0,0,Math.PI*2);g.fill();g.restore();}
  }
  function drawExactBackdrop(){
    const pack=ensureCanvas(BACK_ID,0);if(!pack)return false;const{g,w,h}=pack;g.clearRect(0,0,w,h);const cameraX=cameraForArea();
    const drawn=platformApi()?.renderBattleBackdrop?.(g,w,h,combatArea(),performance.now()/1000,cameraX)===true;if(drawn){drawArenaClearing(g,w,h);drawProjectedLaneSurface(g,w,h);drawEnemyGroundShadows(g);}return drawn;
  }
  function drawCombatBounds(){
    const pack=ensureCanvas(FRONT_ID,3);if(!pack)return;const{g,w,h}=pack;g.clearRect(0,0,w,h);const pulse=.20+.06*Math.sin(performance.now()/540),api=platformApi(),area=combatArea(),cam=cameraForArea(area),center=api?.arenaCenter?.(area);
    if(center&&typeof api?.projectWorldPoint==='function'){
      const halfX=560,halfZ=430,lf=api.projectWorldPoint(center.x-halfX,center.z-halfZ,0,w,h,cam),ln=api.projectWorldPoint(center.x-halfX,center.z+halfZ,0,w,h,cam),rf=api.projectWorldPoint(center.x+halfX,center.z-halfZ,0,w,h,cam),rn=api.projectWorldPoint(center.x+halfX,center.z+halfZ,0,w,h,cam);
      g.strokeStyle=`rgba(143,196,232,${pulse})`;g.lineWidth=1.1;[[lf,ln],[rf,rn]].forEach(([a,b])=>{g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();});return;
    }
    g.strokeStyle=`rgba(143,196,232,${pulse})`;g.strokeRect(w*.035,h*.10,w*.93,h*.82);
  }
  function showCombatWorld(){
    const lane=document.getElementById('laneWrap');if(!lane)return;const area=combatArea();
    lane.classList.remove('ttd-mainmap-combat-v2','ttd-mainmap-combat-v3','ttd-mainmap-combat-v4','ttd-mainmap-combat-v5');lane.classList.add('ttd-mainmap-combat-v6');
    ['ttdMainMapCombatBackV2','ttdMainMapCombatFrontV2','ttdMainMapCombatBackV3','ttdMainMapCombatFrontV3','ttdMainMapCombatBackV4','ttdMainMapCombatFrontV4','ttdMainMapCombatBackV5','ttdMainMapCombatFrontV5'].forEach(id=>document.getElementById(id)?.remove());
    if(area!==lastArea){lastArea=area;rebuildProjectedMeta([]);document.getElementById(BACK_ID)?.remove();document.getElementById(FRONT_ID)?.remove();try{installCombatPath(cw,ch);}catch(_){} }
    drawExactBackdrop();drawCombatBounds();
  }
  function hideCombatWorld(){
    const lane=document.getElementById('laneWrap');lane?.classList.remove('ttd-mainmap-combat-v2','ttd-mainmap-combat-v3','ttd-mainmap-combat-v4','ttd-mainmap-combat-v5','ttd-mainmap-combat-v6');
    [BACK_ID,FRONT_ID,'ttdMainMapCombatBackV2','ttdMainMapCombatFrontV2','ttdMainMapCombatBackV3','ttdMainMapCombatFrontV3','ttdMainMapCombatBackV4','ttdMainMapCombatFrontV4','ttdMainMapCombatBackV5','ttdMainMapCombatFrontV5'].forEach(id=>document.getElementById(id)?.remove());
  }
  function installFallbackPath(w,h,area){pathPts=area===1?[{x:w*.96,y:h*.15},{x:w*.75,y:h*.26},{x:w*.60,y:h*.58},{x:w*.42,y:h*.78},{x:w*.24,y:h*.57},{x:w*.08,y:h*.32}]:[{x:w*.96,y:h*.14},{x:w*.76,y:h*.28},{x:w*.61,y:h*.62},{x:w*.43,y:h*.82},{x:w*.25,y:h*.58},{x:w*.07,y:h*.30}];rebuildProjectedMeta(pathPts.map(p=>({...p,scale:1})));}
  function installCombatPath(w,h){
    const area=combatArea(),route=projectionFor(w,h,area);if(route){pathPts=route.points.map(p=>({x:p.x,y:p.y}));rebuildProjectedMeta(route.points);}else installFallbackPath(w,h,area);
    segLens=[];totalLen=0;for(let i=1;i<pathPts.length;i++){const dx=pathPts[i].x-pathPts[i-1].x,dy=pathPts[i].y-pathPts[i-1].y,len=Math.hypot(dx,dy);segLens.push(len);totalLen+=len;}towerPos=pathPts[pathPts.length-1];
  }
  const baseBuildPath=buildPath;buildPath=function buildPathOnPersistentWorld(w,h){if(hasWorldRenderer())return installCombatPath(w,h);return baseBuildPath(w,h);};

  function nearestRouteWorldPoint(x,y,area=1){const route=projectionFor(cw,ch,area);if(!route?.points?.length)return null;let best=null,dist=Infinity;for(const p of route.points){const d=Math.hypot((Number(x)||0)-p.x,(Number(y)||0)-p.y);if(d<dist){dist=d;best=p;}}return best;}
  function carryCombatCoinsToTraversal(){
    if(coinsCarriedForTraversal||!state?.__ttdTestMap||state.__ttdPlatformDone)return;coinsCarriedForTraversal=true;
    const coins=Array.isArray(state.coins)?state.coins:[],world=worldState();if(!world||!coins.length)return;world.drops=Array.isArray(world.drops)?world.drops:[];
    for(const coin of coins){const p=nearestRouteWorldPoint(coin.x,coin.y,1);if(!p)continue;const remaining=Math.max(0,(Number(coin.ttl)||4)-(Number(coin.t)||0));world.drops.push({kind:'coin',value:Number(coin.value)||1,isGold:!!coin.isGold,x:p.worldX,z:p.worldZ,baseY:4,y:4,t:0,bounceT:.25,collected:false,source:'combat',ttl:Math.max(5,remaining+3.5)});}
    state.coins.length=0;
  }
  function clearPriorCombatCoins(){const world=worldState();if(world&&Array.isArray(world.drops))world.drops.splice(0,world.drops.length,...world.drops.filter(d=>d?.source!=='combat'));if(Array.isArray(state?.coins))state.coins.length=0;}
  function syncCoinContinuity(){
    const selecting=!!platformApi()?.selecting;if(selecting&&!lastSelecting&&!state?.__ttdPlatformDone)carryCombatCoinsToTraversal();lastSelecting=selecting;requestAnimationFrame(syncCoinContinuity);
  }
  requestAnimationFrame(syncCoinContinuity);

  function armSubsequentCombatCountdown(){
    if(!isTestState()||!state.__ttdPlatformDone||state.wave<3||state.__ttdCombatIntroSeen)return false;state.__ttdCombatIntroPending=true;
    if(countdownArmed)return true;countdownArmed=true;clearPriorCombatCoins();rebuildProjectedMeta([]);try{installCombatPath(cw,ch);}catch(_){}
    const release=()=>{if(!state)return;state.__ttdCombatIntroSeen=true;state.__ttdCombatIntroPending=false;countdownArmed=false;try{installCombatPath(cw,ch);}catch(_){}};
    const presentation=window.TTDGamePresentation;if(presentation?.playCombatCountdown){presentation.playCombatCountdown(release);}else setTimeout(release,2680);return true;
  }
  const baseUpdateSpawnsV6=updateSpawns;updateSpawns=function updateSpawnsWithCombatIntroV6(dt){if(armSubsequentCombatCountdown())return;return baseUpdateSpawnsV6(dt);};

  function withFlatCorePathSuppressed(draw){
    if(!isTestState()||!ctx?.stroke)return draw();const original=ctx.stroke;
    ctx.stroke=function(...args){const s=String(this.strokeStyle),w=Number(this.lineWidth);if((s==='rgba(139,127,232,0.16)'&&Math.abs(w-22)<.2)||(s==='rgba(217,178,106,0.35)'&&Math.abs(w-2)<.2))return;return original.apply(this,args);};
    try{return draw();}finally{ctx.stroke=original;}
  }
  const baseDrawLane=drawLane;drawLane=function drawLaneOnPersistentWorld(dt){
    if(!combatVisible()){hideCombatWorld();return baseDrawLane(dt);}showCombatWorld();const themeIdx=state.typhoonPhase?2:Math.min(2,state.adventureStageIdx||0),theme=STAGE_THEMES?.[themeIdx],saved=theme?{top:theme.top,bottom:theme.bottom,tint:theme.tint}:null;
    if(theme){theme.top='rgba(0,0,0,0)';theme.bottom='rgba(0,0,0,0)';theme.tint='rgba(0,0,0,0)';}
    try{return withFlatCorePathSuppressed(()=>baseDrawLane(dt));}finally{if(theme&&saved)Object.assign(theme,saved);drawExactBackdrop();drawCombatBounds();}
  };

  const baseRenderStageScreen=renderStageScreen;renderStageScreen=function renderStageScreenWithPersistentWorld(){baseRenderStageScreen();if(selectedAdventureId!==TEST_ID)return;const p=document.querySelector('#stageList .stageCard p');if(p)p.textContent='One continuous beach, jungle and temple world: broad combat clearings open around world-space marching routes, while traversal and puzzle corridors remain tighter between them.';};

  window.__TTD_TEST_PSEUDO3D_BATTLE_API={version:6,get active(){return combatVisible();},get usesPersistentTraversalRenderer(){return hasWorldRenderer();},get usesWorldProjectedRoute(){return typeof platformApi()?.projectWorldPoint==='function';},get clearsPriorCombatCoins(){return true;},get area(){return combatArea();},get routeLength(){return Number(totalLen)||0;}};
})();