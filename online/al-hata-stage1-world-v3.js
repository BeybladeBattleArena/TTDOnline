/* Al Hata Stage 1 continuous-world v3.
   Builds on v2 with a true two-axis world camera, explicit world-space arena volumes,
   route projection from the same camera used by traversal, and cross-faded in-place combat. */
window.__TTD_AL_HATA_CONTINUOUS_WORLD_V3=true;

const AH_WORLD_V3_CMAP=window.__TTD_CONTINUOUS_ADVENTURE_MAP_CONTRACT_V1;
if(!AH_WORLD_V3_CMAP)throw new Error('Al Hata continuous world v3 requires the generic continuous-map contract.');

const AH_WORLD_V3_ARENAS=Object.freeze({
  1:Object.freeze({id:'landing-shore',bounds:Object.freeze({x1:250,x2:980,z1:-330,z2:330}),center:Object.freeze({x:560,z:0,y:0}),continuation:Object.freeze({segment:'beach',x:930,z:0,y:0})}),
  2:Object.freeze({id:'goblin-fringe',bounds:Object.freeze({x1:1640,x2:2310,z1:-330,z2:330}),center:Object.freeze({x:1900,z:0,y:10}),continuation:Object.freeze({segment:'jungle',x:2290,z:0,y:10})}),
  3:Object.freeze({id:'deep-jungle-ruins',bounds:Object.freeze({x1:2790,x2:3550,z1:-340,z2:340}),center:Object.freeze({x:3150,z:0,y:24}),continuation:Object.freeze({segment:'deepJungle',x:3540,z:0,y:24})}),
  4:Object.freeze({id:'pincer-bridge',bounds:Object.freeze({x1:4240,x2:4860,z1:-240,z2:240}),center:Object.freeze({x:4550,z:0,y:85}),continuation:Object.freeze({segment:'postFork',x:4900,z:0,y:54})}),
  5:Object.freeze({id:'temple-forecourt',bounds:Object.freeze({x1:5960,x2:6710,z1:-330,z2:330}),center:Object.freeze({x:6250,z:0,y:70}),continuation:null}),
});
for(const [area,spec] of Object.entries(AH_WORLD_V3_ARENAS))AH_WORLD_V3_CMAP.assertArena(spec,AH_ROUTES[Number(area)]);

const AH_WORLD_V3_BASE_ENSURE_WORLD=AH_ensureWorld;
AH_ensureWorld=function AH_WORLD_V3_ensureWorld(){
  const world=AH_WORLD_V3_BASE_ENSURE_WORLD();if(!world)return null;
  AH_WORLD_V3_CMAP.ensureWorldShape(world,{instancePrefix:'al-hata-stage1',cameraX:Number(world.cameraX)||AH_AREAS[1].cameraX,cameraZ:Number(world.cameraZ)||0,x:world.checkpoint?.x||720,z:world.checkpoint?.z||0,y:world.checkpoint?.y||0});
  world.version=3;world.contract=AH_WORLD_V3_CMAP.contract;
  world.cameraX=world.camera.x;world.cameraZ=world.camera.z;
  if(!world.discoveredSideAreas||typeof world.discoveredSideAreas!=='object')world.discoveredSideAreas={};
  return world;
};

function AH_WORLD_V3_projectWorld(x,z,y=0,w=1,h=1,cameraX=0,cameraZ=0){
  const W=Math.max(1,Number(w)||1),H=Math.max(1,Number(h)||1),scale=Math.max(.52,Math.min(.82,W/520));
  const relX=Number(x)-Number(cameraX||0),relZ=Number(z)-Number(cameraZ||0),depth=(relZ+260)/520,persp=AH_clamp(.80+depth*.24,.66,1.18);
  return{x:W*.47+relX*scale*persp,y:H*.69+relZ*.255*scale-Number(y||0)*scale-relX*.032*scale,scale:scale*persp};
}
function AH_WORLD_V3_projector(w,h,cameraX,cameraZ){return(x,z,y=0)=>AH_WORLD_V3_projectWorld(x,z,y,w,h,cameraX,cameraZ);}
const AH_WORLD_V3_BASE_PROJECT=AH_project;
AH_project=function AH_WORLD_V3_project(x,z,y=0){
  if(AH_isTraversal())return AH_WORLD_V3_projectWorld(x,z,y,session.w,session.h,session.cameraX,Number(session.cameraZ)||0);
  return AH_WORLD_V3_BASE_PROJECT(x,z,y);
};
AH_WORLD_V2_projector=AH_WORLD_V3_projector;

function AH_WORLD_V3_sampleRoute(vertices,w,h,cameraX,cameraZ){
  const out=[];for(let i=0;i<vertices.length-1;i++){const a=vertices[i],b=vertices[i+1],steps=9;for(let s=0;s<steps;s++){if(i>0&&s===0)continue;const t=s/(steps-1),wx=AH_lerp(a.x,b.x,t),wz=AH_lerp(a.z,b.z,t),wy=AH_lerp(a.y||0,b.y||0,t);out.push({...AH_WORLD_V3_projectWorld(wx,wz,wy,w,h,cameraX,cameraZ),worldX:wx,worldZ:wz,worldY:wy});}}return out;
}
const AH_WORLD_V3_BASE_BUILD_PATH=buildPath;
buildPath=function AH_WORLD_V3_buildPath(w,h){
  if(!AH_isState())return AH_WORLD_V3_BASE_BUILD_PATH(w,h);
  const area=AH_clamp(Number(state.__ttdAlHataCombatArea)||1,1,5),arena=AH_WORLD_V3_ARENAS[area],route=AH_ROUTES[area];
  if(!arena||!route?.length)return AH_WORLD_V3_BASE_BUILD_PATH(w,h);
  const projected=AH_WORLD_V3_sampleRoute(route,w,h,arena.center.x,arena.center.z);pathPts=projected.map(p=>({x:p.x,y:p.y}));segLens=[];totalLen=0;
  for(let i=1;i<pathPts.length;i++){const len=Math.hypot(pathPts[i].x-pathPts[i-1].x,pathPts[i].y-pathPts[i-1].y);segLens.push(len);totalLen+=len;}towerPos=pathPts[pathPts.length-1];state.__ttdAlHataProjectedRoute=projected;
};

const AH_WORLD_V3_BASE_SYNC_WORLD=AH_WORLD_V2_syncWorld;
AH_WORLD_V2_syncWorld=function AH_WORLD_V3_syncWorld(){
  AH_WORLD_V3_BASE_SYNC_WORLD();const world=AH_ensureWorld();if(!world||!session)return;
  world.cameraX=Number(session.cameraX)||0;world.cameraZ=Number(session.cameraZ)||0;world.camera.x=world.cameraX;world.camera.z=world.cameraZ;
  AH_WORLD_V3_CMAP.syncSession(world,session);
};

function AH_WORLD_V3_discoverSideAreas(){
  const world=AH_ensureWorld(),n=session?.nav;if(!world||!n)return;
  for(const area of world.sideAreas||[]){const dy=Math.abs(Number(n.y||0)-Number(area.y||0)),dist=Math.hypot(Number(n.x)-Number(area.x),(Number(n.z)-Number(area.z))*.86);if(dist<110&&dy<90)world.discoveredSideAreas[area.id]=true;}
}
const AH_WORLD_V3_BASE_UPDATE_NAV=AH_WORLD_V2_updateNavigator;
AH_WORLD_V2_updateNavigator=function AH_WORLD_V3_updateNavigator(dt){
  AH_WORLD_V3_BASE_UPDATE_NAV(dt);
  if(!session?.active||!session.__ttdAlHata||!session.nav)return;
  const n=session.nav,target=AH_clamp(Number(n.z)*.74,-315,315),current=Number(session.cameraZ)||0,delta=target-current,alpha=1-Math.exp(-Math.max(0,Number(dt)||0)*2.35);
  session.cameraZ=current+Math.max(-7,Math.min(7,delta*alpha));AH_WORLD_V3_discoverSideAreas();AH_WORLD_V2_syncWorld();
};
for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_UPDATERS[segment]=AH_WORLD_V2_updateNavigator;

AH_WORLD_V2_drawWorldLayer=function AH_WORLD_V3_drawWorldLayer(g,w,h,cameraX,front=false,combat=false,cameraZ){
  const world=AH_ensureWorld();if(!world)return;const cz=Number.isFinite(Number(cameraZ))?Number(cameraZ):combat?Number(world.cameraZ)||0:Number(session?.cameraZ)||Number(world.cameraZ)||0,projector=AH_WORLD_V3_projector(w,h,cameraX,cz);
  if(!front){AH_WORLD_V2_drawBackdrop(g,w,h,cameraX,combat);const visiblePlatforms=AH_WORLD_V2_platforms().filter(p=>p.x2>cameraX-1050&&p.x1<cameraX+1050).sort((a,b)=>a.z1-b.z1);for(const p of visiblePlatforms)AH_WORLD_V2_drawPlatform(g,p,projector);}
  const items=[];
  for(const record of AH_WORLD_V2_STATIC_PROPS){if(Math.abs(record.p.x-cameraX)>1000)continue;const isFront=Number(record.p.z)-cz>115;if(isFront===front)items.push({z:Number(record.p.z)-cz,draw:()=>AH_WORLD_V2_drawStaticProp(g,record,projector)});}
  for(const o of world.objects){if(Math.abs(Number(o.x)-cameraX)>1000)continue;const isFront=Number(o.z)-cz>115;if(isFront===front)items.push({z:Number(o.z)-cz,draw:()=>AH_WORLD_V2_drawObject(g,o,projector)});}
  if(!front)for(const d of world.drops)if(Math.abs(Number(d.x)-cameraX)<1000)items.push({z:Number(d.z)-cz,draw:()=>AH_WORLD_V2_drawDrop(g,d,projector)});
  if(!combat&&!front&&session?.nav)items.push({z:Number(session.nav.z)-cz,draw:()=>AH_WORLD_V2_drawNavigator(g,projector)});
  items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw());
};

function AH_WORLD_V3_drawRouteRibbon(g,w,h,area,cameraX,cameraZ,color='rgba(92,75,52,.14)'){
  const route=AH_ROUTES[area];if(!route)return;const pts=AH_WORLD_V3_sampleRoute(route,w,h,cameraX,cameraZ);
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],sc=(a.scale+b.scale)*.5;g.lineCap='round';g.strokeStyle=color;g.lineWidth=Math.max(18,38*sc);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.strokeStyle='rgba(246,225,174,.18)';g.lineWidth=Math.max(1,2*sc);g.stroke();}
}
for(const area of [1,2,3,4,5])AH_COMBAT_DRAWERS[area]=function AH_WORLD_V3_combatDrawer(args){
  const world=AH_ensureWorld(),arena=AH_WORLD_V3_ARENAS[area],cameraX=Number(world?.cameraX)||arena.center.x,cameraZ=Number(world?.cameraZ)||arena.center.z;
  AH_WORLD_V2_drawWorldLayer(args.back.g,args.back.w,args.back.h,cameraX,false,true,cameraZ);AH_WORLD_V3_drawRouteRibbon(args.back.g,args.back.w,args.back.h,area,cameraX,cameraZ);AH_WORLD_V2_drawWorldLayer(args.front.g,args.front.w,args.front.h,cameraX,true,true,cameraZ);
};

function AH_WORLD_V3_primeCombatFrame(area,cameraX,cameraZ){
  const back=AH_ensureCombatCanvas('ttdAlHataBackV1',0),front=AH_ensureCombatCanvas('ttdAlHataFrontV1',3),lane=document.getElementById('laneCanvas');if(!back||!front)return false;
  if(lane){lane.style.background='transparent';lane.style.position='relative';lane.style.zIndex='2';}
  back.g.clearRect(0,0,back.w,back.h);front.g.clearRect(0,0,front.w,front.h);AH_WORLD_V2_drawWorldLayer(back.g,back.w,back.h,cameraX,false,true,cameraZ);AH_WORLD_V3_drawRouteRibbon(back.g,back.w,back.h,area,cameraX,cameraZ);AH_WORLD_V2_drawWorldLayer(front.g,front.w,front.h,cameraX,true,true,cameraZ);return true;
}
function AH_WORLD_V3_retireTraversalCanvas(){
  const canvas=document.getElementById('ttdPlatformCanvas');if(canvas){canvas.style.pointerEvents='none';canvas.style.transition='opacity 180ms ease';requestAnimationFrame(()=>{canvas.style.opacity='0';});setTimeout(()=>canvas.remove(),220);}setTimeout(()=>{document.getElementById('ttdPlatformHud')?.remove();document.getElementById('ttdPlatformError')?.remove();},230);
}

AH_finishTraversalToCombat=async function AH_WORLD_V3_finishTraversalToCombat(area,wave,label){
  if(!AH_isTraversal())return;
  const active=session,world=AH_ensureWorld(),nav=active?.nav,arena=AH_WORLD_V3_ARENAS[area];if(!active||!world||!arena)return;
  active.phase='combat-transition';active.joyX=0;active.joyZ=0;state.running=false;world.objects=active.objects;world.drops=active.drops;if(nav){world.navigatorBoardIndex=nav.boardIndex;world.navigatorPos={x:nav.x,z:nav.z,y:nav.y};}
  const ctrl=document.getElementById('ttdNavController');if(ctrl){ctrl.style.pointerEvents='none';ctrl.style.opacity='.42';}
  const startAlpha=Math.max(0,Math.min(1,Number(nav?.alpha)||1));await AH_WORLD_V2_tween(300,t=>{if(session===active&&nav)nav.alpha=startAlpha*(1-t);});if(session!==active||!active.active)return;
  const fromX=Number(active.cameraX)||0,fromZ=Number(active.cameraZ)||0,targetX=arena.center.x,targetZ=arena.center.z;
  restoreTrayChildren();await AH_WORLD_V2_tween(760,t=>{if(session!==active)return;const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;active.cameraX=AH_lerp(fromX,targetX,e);active.cameraZ=AH_lerp(fromZ,targetZ,e);world.cameraX=active.cameraX;world.cameraZ=active.cameraZ;world.camera.x=active.cameraX;world.camera.z=active.cameraZ;});if(session!==active||!active.active)return;
  active.cameraX=targetX;active.cameraZ=targetZ;world.cameraX=targetX;world.cameraZ=targetZ;world.camera.x=targetX;world.camera.z=targetZ;world.combatArea=area;world.segment=active.segment;world.checkpoint={...active.checkpoint};
  state.__ttdAlHataCombatArea=area;state.wave=wave;state.waveClearCredited=false;state.waveClearedAt=0;state.spawnQueue=buildAdventureWave(state.adventureStage,wave,state.adventureDiff);state.spawnTimer=0;
  if(modeLabel)modeLabel.textContent=`Al Hata · ${label||AH_AREAS[area]?.name||'Stage 1'}`;renderHUD();renderBoard();buildPath(cw,ch);
  /* Keep the traversal frame alive until the battle canvases already contain the identical world. */
  leavePlatformLayout(false);AH_WORLD_V3_primeCombatFrame(area,targetX,targetZ);AH_WORLD_V3_retireTraversalCanvas();active.active=false;clearNavigatorSelectionUi();session=null;state.running=true;lastT=0;requestAnimationFrame(loop);
};

const AH_WORLD_V3_BASE_BEGIN_TRAVERSAL=AH_beginTraversal;
AH_beginTraversal=function AH_WORLD_V3_beginTraversal(segment){
  AH_WORLD_V3_BASE_BEGIN_TRAVERSAL(segment);if(!session?.active||!session.__ttdAlHata)return;const world=AH_ensureWorld();AH_WORLD_V3_CMAP.bindSession(world,session);session.cameraX=Number(world.cameraX)||Number(session.cameraX)||0;session.cameraZ=Number(world.cameraZ)||0;
};

async function AH_WORLD_V3_resumeAfterCombat(area){
  const world=AH_ensureWorld(),arena=AH_WORLD_V3_ARENAS[area],next=arena?.continuation;if(!world||!next)return;state.running=false;
  const fromX=Number(world.cameraX)||arena.center.x,fromZ=Number(world.cameraZ)||arena.center.z,targetX=Number(next.x)-135,targetZ=Number(next.z)||0;
  await AH_WORLD_V2_tween(620,t=>{const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;world.cameraX=AH_lerp(fromX,targetX,e);world.cameraZ=AH_lerp(fromZ,targetZ,e);world.camera.x=world.cameraX;world.camera.z=world.cameraZ;});
  world.cameraX=targetX;world.cameraZ=targetZ;world.camera.x=targetX;world.camera.z=targetZ;world.checkpoint={x:next.x,z:next.z,y:next.y};world.segment=next.segment;AH_beginTraversal(next.segment);
}
AH_AFTER_COMBAT[3]=()=>AH_WORLD_V3_resumeAfterCombat(1);
AH_AFTER_COMBAT[6]=()=>AH_WORLD_V3_resumeAfterCombat(2);
AH_AFTER_COMBAT[10]=()=>AH_WORLD_V3_resumeAfterCombat(3);
AH_AFTER_COMBAT[12]=()=>AH_WORLD_V3_resumeAfterCombat(4);

window.__TTD_AL_HATA_CONTINUOUS_WORLD_V3_API=Object.freeze({
  version:3,contract:AH_WORLD_V3_CMAP.contract,arenas:AH_WORLD_V3_ARENAS,
  get world(){return AH_isState()?AH_ensureWorld():null;},
  get instanceId(){return AH_isState()?AH_ensureWorld()?.instanceId||null:null;},
  get sameWorld(){return AH_isTraversal()?AH_WORLD_V3_CMAP.sameWorld(AH_ensureWorld(),session):true;},
});
