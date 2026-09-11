/* Al Hata Stage 1 continuous-world v4.
   Path-language, exact footing, shoreline, terrain-native combat and mobile-safe world polish. */
window.__TTD_AL_HATA_CONTINUOUS_WORLD_V4=true;

const AH_WORLD_V4_ARENAS=Object.freeze({
  1:Object.freeze({id:'landing-shore',bounds:Object.freeze({x1:250,x2:1120,z1:-430,z2:430}),center:Object.freeze({x:670,z:0,y:0}),continuation:Object.freeze({segment:'beach',x:1120,z:0,y:0}),spawn:'jungle-break'}),
  2:Object.freeze({id:'goblin-fringe',bounds:Object.freeze({x1:1600,x2:2480,z1:-430,z2:430}),center:Object.freeze({x:2020,z:0,y:10}),continuation:Object.freeze({segment:'jungle',x:2480,z:0,y:10}),spawn:'goblin-camp'}),
  3:Object.freeze({id:'deep-jungle-ruins',bounds:Object.freeze({x1:2740,x2:3660,z1:-440,z2:440}),center:Object.freeze({x:3200,z:0,y:24}),continuation:Object.freeze({segment:'deepJungle',x:3660,z:0,y:24}),spawn:'ruin-cave'}),
  4:Object.freeze({id:'pincer-bridge',bounds:Object.freeze({x1:4240,x2:4860,z1:-250,z2:250}),center:Object.freeze({x:4550,z:0,y:85}),continuation:Object.freeze({segment:'postFork',x:4900,z:0,y:54}),spawn:'bridge-pincer'}),
  5:Object.freeze({id:'temple-forecourt',bounds:Object.freeze({x1:5900,x2:6780,z1:-430,z2:430}),center:Object.freeze({x:6340,z:0,y:70}),continuation:null,spawn:'temple-arches'}),
});

/* Routes now describe the physical terrain rather than a generic TD board. */
AH_ROUTES[1]=[
  {x:1080,z:-265,y:0},{x:980,z:-120,y:0},{x:880,z:185,y:0},{x:745,z:235,y:0},
  {x:625,z:35,y:0},{x:510,z:-190,y:0},{x:390,z:-125,y:0},{x:285,z:45,y:0},
];
AH_ROUTES[2]=[
  {x:2440,z:250,y:10},{x:2325,z:105,y:10},{x:2190,z:-210,y:10},{x:2055,z:-120,y:10},
  {x:1940,z:215,y:10},{x:1790,z:165,y:10},{x:1640,z:-115,y:10},
];
AH_ROUTES[3]=[
  {x:3630,z:-285,y:24},{x:3510,z:-120,y:24},{x:3380,z:225,y:24},{x:3230,z:145,y:24},
  {x:3100,z:-235,y:24},{x:2945,z:-90,y:24},{x:2785,z:165,y:24},
];
AH_ROUTES[4]=[
  {x:4290,z:-28,y:85},{x:4415,z:34,y:85},{x:4550,z:0,y:85},{x:4680,z:-34,y:85},{x:4815,z:24,y:85},
];
if(Array.isArray(AH_PINCER_RIGHT_ROUTE))AH_PINCER_RIGHT_ROUTE.splice(0,AH_PINCER_RIGHT_ROUTE.length,
  {x:4815,z:24,y:85},{x:4680,z:-34,y:85},{x:4550,z:0,y:85},{x:4415,z:34,y:85},{x:4290,z:-28,y:85}
);
AH_ROUTES[5]=[
  {x:6740,z:-270,y:70},{x:6620,z:-105,y:70},{x:6500,z:235,y:70},{x:6350,z:145,y:70},
  {x:6220,z:-215,y:70},{x:6060,z:-90,y:70},{x:5920,z:155,y:70},
];

/* Base terrain extends farther north/south. Platform tops remain the collision truth. */
const AH_WORLD_V4_BASE_PLATFORMS=AH_WORLD_V2_platforms;
AH_WORLD_V2_platforms=function AH_WORLD_V4_platforms(){
  return AH_WORLD_V4_BASE_PLATFORMS().map(p=>{
    if(p.base)return{...p,z1:-840,z2:840,x1:p.id==='world_beach'?205:p.x1};
    if(p.id==='pincer_bridge')return{...p,x1:4260,x2:4840,z1:-86,z2:86,y:85};
    return p;
  });
};
for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_PLATFORMS[segment]=AH_WORLD_V2_platforms;

const AH_WORLD_V4_PROP_WALLS=[];
const AH_WORLD_V4_PROP_RECORDS=[];
function AH_WORLD_V4_addProp(region,kind,x,z,s=1,solid=24,variant=0){
  const p={kind,x,z,s,variant,solid};AH_WORLD_V4_PROP_RECORDS.push({region:'v4',p,biome:region});
  if(solid>0)AH_WORLD_V4_PROP_WALLS.push({x,z,rx:solid*s,rz:Math.max(14,solid*.68*s)});
}
(function AH_WORLD_V4_buildPathWalls(){
  const row=(region,x1,x2,step,zA,zB,kinds,gaps=[])=>{
    let i=0;
    for(let x=x1;x<=x2;x+=step,i++){
      if(gaps.some(g=>x>=g[0]&&x<=g[1]))continue;
      AH_WORLD_V4_addProp(region,kinds[i%kinds.length],x,zA,.98+(i%3)*.08,25,i%5);
      AH_WORLD_V4_addProp(region,kinds[(i+2)%kinds.length],x+step*.38,zB,1.02+((i+1)%3)*.07,26,(i+2)%5);
    }
  };
  row('beach',250,1680,145,-500,500,['palmTall','palmLean','palmFan','palmTwin','beachBroad'],[[880,1260],[1280,1540]]);
  row('jungle',1760,4100,132,-505,505,['jungleTall','jungleFork','jungleBanyan','jungleButtress','jungleVine'],[[2360,2860],[3500,4070]]);
  row('jungle',4920,5300,125,-500,500,['jungleFork','jungleTall','jungleBanyan','jungleVine','jungleButtress'],[[5020,5220]]);
  row('temple',5360,6900,140,-505,505,['templeTree','templeColumnV4','templeBoulder','templeTreeFork','templeShrubWall'],[[5400,5900]]);

  /* Local shoulders shape branches while leaving the center path readable. */
  [[900,330],[1260,335],[2320,320],[2860,320],[3490,-330],[4100,-330],[5370,-330],[5920,-330]].forEach((v,i)=>{
    const region=v[0]<1700?'beach':v[0]<5200?'jungle':'temple';
    for(let j=0;j<3;j++)AH_WORLD_V4_addProp(region,region==='beach'?'boulderV4':region==='jungle'?'jungleButtress':'templeBoulder',v[0]+j*48,v[1]+(j%2)*34,.9+j*.08,26,j);
  });
})();
AH_WORLD_V2_STATIC_PROPS.push(...AH_WORLD_V4_PROP_RECORDS);

function AH_WORLD_V4_drawTree(g,p,projector,biome){
  const q=projector(p.x,p.z,0),sc=q.scale*(p.s||1),v=Number(p.variant)||0;
  g.save();g.translate(q.x,q.y);g.scale(sc,sc);
  const jungle=biome==='jungle'||biome==='temple';
  const trunk=jungle?(v%2?'#4c392c':'#594333'):'#6e4b31';
  const leaf=biome==='temple'?'#315a42':jungle?(v%3===1?'#2f7046':v%3===2?'#3b7b50':'#326946'):(v%2?'#3c8055':'#478d59');
  const h=jungle?96:88,w=jungle?13:10;
  g.fillStyle='rgba(8,10,10,.24)';g.beginPath();g.ellipse(7,4,30,9,0,0,AH_TAU);g.fill();
  g.strokeStyle=trunk;g.lineWidth=w;g.lineCap='round';g.beginPath();
  if(String(p.kind).includes('Lean')){g.moveTo(0,0);g.quadraticCurveTo(8,-44,20,-h);}else{g.moveTo(0,0);g.lineTo((v%3-1)*5,-h);}g.stroke();
  if(String(p.kind).includes('Twin')){g.beginPath();g.moveTo(0,-8);g.quadraticCurveTo(-12,-45,-18,-82);g.stroke();}
  const cx=String(p.kind).includes('Lean')?20:(v%3-1)*5,cy=-h;
  g.fillStyle=leaf;
  const lobes=jungle?8:7;
  for(let i=0;i<lobes;i++){const a=i/lobes*AH_TAU+(v*.17),rx=jungle?36:32,ry=jungle?16:12;g.save();g.translate(cx,cy);g.rotate(a);g.beginPath();g.ellipse(rx*.45,0,rx,ry,0,0,AH_TAU);g.fill();g.restore();}
  if(String(p.kind).includes('Banyan')||String(p.kind).includes('Buttress')){
    g.fillStyle=trunk;g.globalAlpha=.9;for(const sx of [-1,1]){g.beginPath();g.moveTo(0,-5);g.lineTo(sx*18,5);g.lineTo(sx*7,-22);g.closePath();g.fill();}
  }
  g.restore();
}
function AH_WORLD_V4_drawRock(g,p,projector,temple=false){
  const q=projector(p.x,p.z,0),sc=q.scale*(p.s||1),v=Number(p.variant)||0;g.save();g.translate(q.x,q.y);g.scale(sc,sc);
  g.fillStyle='rgba(5,7,8,.24)';g.beginPath();g.ellipse(4,5,34,9,0,0,AH_TAU);g.fill();
  g.fillStyle=temple?'#6e7167':'#727565';g.strokeStyle='rgba(25,27,24,.55)';g.lineWidth=2;g.beginPath();g.moveTo(-30,0);g.lineTo(-23,-23-v*2);g.lineTo(-4,-34);g.lineTo(24,-24);g.lineTo(32,-5);g.lineTo(20,4);g.lineTo(-16,6);g.closePath();g.fill();g.stroke();
  g.fillStyle='rgba(235,229,198,.10)';g.beginPath();g.moveTo(-19,-20);g.lineTo(-4,-30);g.lineTo(16,-22);g.lineTo(4,-15);g.closePath();g.fill();g.restore();
}
function AH_WORLD_V4_drawColumn(g,p,projector){
  const q=projector(p.x,p.z,0),sc=q.scale*(p.s||1);g.save();g.translate(q.x,q.y);g.scale(sc,sc);g.fillStyle='rgba(5,7,8,.22)';g.beginPath();g.ellipse(7,5,28,8,0,0,AH_TAU);g.fill();g.fillStyle='#77776e';g.fillRect(-10,-70,20,70);g.fillStyle='#929184';g.fillRect(-15,-76,30,8);g.fillRect(-17,-6,34,8);g.strokeStyle='rgba(43,45,40,.55)';g.strokeRect(-10,-70,20,70);g.restore();
}
const AH_WORLD_V4_BASE_DRAW_STATIC=AH_WORLD_V2_drawStaticProp;
AH_WORLD_V2_drawStaticProp=function AH_WORLD_V4_drawStaticProp(g,record,projector){
  if(record?.region!=='v4')return AH_WORLD_V4_BASE_DRAW_STATIC(g,record,projector);
  const p=record.p,kind=String(p.kind||'');
  if(kind.includes('Boulder')||kind==='boulderV4')return AH_WORLD_V4_drawRock(g,p,projector,record.biome==='temple');
  if(kind.includes('Column'))return AH_WORLD_V4_drawColumn(g,p,projector);
  if(kind.includes('Shrub')){const q=projector(p.x,p.z,0);g.save();g.translate(q.x,q.y);g.scale(q.scale*(p.s||1),q.scale*(p.s||1));g.fillStyle='#355c3b';for(let i=0;i<6;i++){g.beginPath();g.ellipse((i-2.5)*9,-9-(i%2)*7,15,10,(i%3-.5)*.4,0,AH_TAU);g.fill();}g.restore();return;}
  AH_WORLD_V4_drawTree(g,p,projector,record.biome);
};

function AH_WORLD_V4_propBlocked(x,z){
  for(const p of AH_WORLD_V4_PROP_WALLS){const dx=(x-p.x)/p.rx,dz=(z-p.z)/p.rz;if(dx*dx+dz*dz<1)return true;}return false;
}
function AH_WORLD_V4_sideCorridor(x,z){
  if(x>=880&&x<=1260&&z>=300&&z<=650)return true;
  if(x>=1130&&x<=1560&&z>=115&&z<=390)return true;
  if(x>=2320&&x<=2860&&z>=285&&z<=650)return true;
  if(x>=3470&&x<=4100&&z<=-270&&z>=-650)return true;
  if(x>=4970&&x<=5250&&z>=285&&z<=610)return true;
  if(x>=5380&&x<=5920&&z<=-270&&z>=-650)return true;
  return false;
}
const AH_WORLD_V4_BASE_BLOCKED=AH_WORLD_V2_blocked;
AH_WORLD_V2_blocked=function AH_WORLD_V4_blocked(x,z){
  if(x<195||x>6915||z<-690||z>690)return true;
  if(AH_WORLD_V4_propBlocked(x,z))return true;
  if(AH_WORLD_V4_sideCorridor(x,z))return false;
  /* Keep authored blocker geometry, but the expanded outer corridor is now prop-defined. */
  for(const b of AH_WORLD_V2_BLOCKERS)if(x>b.x1&&x<b.x2&&z>b.z1&&z<b.z2)return true;
  return false;
};

/* The base of a tree is solid, while the canopy can visually cover a Navigator passing behind it. */
function AH_WORLD_V4_drawTraversal(){
  const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return;if(!resizePlatformCanvas())throw new Error('Al Hata v4 traversal canvas has no usable size.');
  const g=c.getContext('2d'),world=AH_ensureWorld(),cameraX=session.cameraX,cameraZ=Number(session.cameraZ)||0,projector=AH_WORLD_V3_projector(session.w,session.h,cameraX,cameraZ);g.clearRect(0,0,session.w,session.h);
  AH_WORLD_V2_drawBackdrop(g,session.w,session.h,cameraX,false);
  if(cameraX<1500)AH_WORLD_V4_drawShoreline(g,projector);
  for(const p of AH_WORLD_V2_platforms().filter(p=>p.x2>cameraX-1050&&p.x1<cameraX+1050).sort((a,b)=>a.z1-b.z1))AH_WORLD_V2_drawPlatform(g,p,projector);
  const items=[];
  for(const record of AH_WORLD_V2_STATIC_PROPS){if(Math.abs(Number(record.p.x)-cameraX)>1050)continue;items.push({z:Number(record.p.z)||0,draw:()=>AH_WORLD_V2_drawStaticProp(g,record,projector)});}
  for(const o of world.objects||[]){if(Math.abs(Number(o.x)-cameraX)>1050)continue;items.push({z:Number(o.z)||0,draw:()=>AH_WORLD_V2_drawObject(g,o,projector)});}
  for(const d of world.drops||[])if(Math.abs(Number(d.x)-cameraX)<1050)items.push({z:Number(d.z)||0,draw:()=>AH_WORLD_V2_drawDrop(g,d,projector)});
  if(session.nav)items.push({z:Number(session.nav.z)||0,draw:()=>AH_WORLD_V2_drawNavigator(g,projector)});
  items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw());
  const hud=document.getElementById('ttdPlatformHud');if(hud){const nav=hud.querySelector('.ttdNavBadge');if(nav)nav.style.display='none';const area=hud.querySelector('.ttdAreaBadge');if(area){area.textContent=AH_WORLD_V2_regionForX(session.nav?.x||cameraX);area.style.opacity='.42';area.style.background='rgba(9,13,24,.42)';}}
}
function AH_WORLD_V4_drawShoreline(g,projector){
  const a=projector(70,-840,-2),b=projector(205,-840,-2),c=projector(205,840,-2),d=projector(70,840,-2);g.save();const grad=g.createLinearGradient(a.x,a.y,c.x,c.y);grad.addColorStop(0,'rgba(42,139,172,.88)');grad.addColorStop(1,'rgba(70,172,194,.62)');g.fillStyle=grad;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();g.fill();
  const f1=projector(210,-820,0),f2=projector(210,820,0);g.strokeStyle='rgba(235,249,245,.78)';g.lineWidth=5;g.setLineDash([16,10]);g.beginPath();g.moveTo(f1.x,f1.y);g.lineTo(f2.x,f2.y);g.stroke();g.setLineDash([]);g.restore();
}
for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_DRAWERS[segment]=AH_WORLD_V4_drawTraversal;

/* Keep camera depth smooth over the expanded north/south range and reject illegal base collisions. */
const AH_WORLD_V4_BASE_UPDATE_NAV=AH_WORLD_V2_updateNavigator;
AH_WORLD_V2_updateNavigator=function AH_WORLD_V4_updateNavigator(dt){
  const n=session?.nav,before=n?{x:n.x,z:n.z}:null;AH_WORLD_V4_BASE_UPDATE_NAV(dt);
  if(!session?.active||!session.__ttdAlHata||!session.nav)return;
  if(before&&AH_WORLD_V2_blocked(session.nav.x,session.nav.z)){session.nav.x=before.x;session.nav.z=before.z;}
  const target=AH_clamp(Number(session.nav.z)*.78,-430,430),current=Number(session.cameraZ)||0,alpha=1-Math.exp(-Math.max(0,Number(dt)||0)*2.1);session.cameraZ=current+(target-current)*alpha;AH_WORLD_V2_syncWorld();
};
for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_UPDATERS[segment]=AH_WORLD_V2_updateNavigator;

function AH_WORLD_V4_sampleRoute(vertices,w,h,cameraX,cameraZ){return AH_WORLD_V3_sampleRoute(vertices,w,h,cameraX,cameraZ);}
const AH_WORLD_V4_BASE_BUILD_PATH=buildPath;
buildPath=function AH_WORLD_V4_buildPath(w,h){
  if(!AH_isState())return AH_WORLD_V4_BASE_BUILD_PATH(w,h);
  const area=AH_clamp(Number(state.__ttdAlHataCombatArea)||1,1,5),arena=AH_WORLD_V4_ARENAS[area],route=AH_ROUTES[area];if(!arena||!route?.length)return AH_WORLD_V4_BASE_BUILD_PATH(w,h);
  const projected=AH_WORLD_V4_sampleRoute(route,w,h,arena.center.x,arena.center.z);pathPts=projected.map(p=>({x:p.x,y:p.y}));segLens=[];totalLen=0;for(let i=1;i<pathPts.length;i++){const len=Math.hypot(pathPts[i].x-pathPts[i-1].x,pathPts[i].y-pathPts[i-1].y);segLens.push(len);totalLen+=len;}towerPos=pathPts[pathPts.length-1];state.__ttdAlHataProjectedRoute=projected;
};

function AH_WORLD_V4_drawRouteRibbon(g,w,h,area,cameraX,cameraZ){
  const world=AH_ensureWorld(),reveal=AH_clamp(Number(world?.combatRouteReveal??1),0,1),route=AH_ROUTES[area];if(!route||reveal<=0)return;const pts=AH_WORLD_V4_sampleRoute(route,w,h,cameraX,cameraZ);g.save();g.globalAlpha=reveal;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],sc=(a.scale+b.scale)*.5;g.lineCap='round';g.strokeStyle='rgba(78,64,46,.42)';g.lineWidth=Math.max(17,34*sc);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.strokeStyle='rgba(247,224,166,.30)';g.lineWidth=Math.max(1,1.8*sc);g.stroke();}
  const end=pts[pts.length-1];if(end){g.strokeStyle='rgba(243,212,145,.48)';g.lineWidth=2;g.beginPath();g.ellipse(end.x,end.y,13*end.scale,5*end.scale,0,0,AH_TAU);g.stroke();}g.restore();
}
for(const area of [1,2,3,4,5])AH_COMBAT_DRAWERS[area]=function AH_WORLD_V4_combatDrawer(args){
  const world=AH_ensureWorld(),arena=AH_WORLD_V4_ARENAS[area],cameraX=Number(world?.cameraX)||arena.center.x,cameraZ=Number(world?.cameraZ)||arena.center.z;
  AH_WORLD_V2_drawWorldLayer(args.back.g,args.back.w,args.back.h,cameraX,false,true,cameraZ);if(cameraX<1500)AH_WORLD_V4_drawShoreline(args.back.g,AH_WORLD_V3_projector(args.back.w,args.back.h,cameraX,cameraZ));AH_WORLD_V4_drawRouteRibbon(args.back.g,args.back.w,args.back.h,area,cameraX,cameraZ);AH_WORLD_V2_drawWorldLayer(args.front.g,args.front.w,args.front.h,cameraX,true,true,cameraZ);
};

/* Native battle art stays for enemies/effects, but its old flat background/path/tower are masked.
   This keeps all combat entities in the same projected world instead of drawing a second board. */
const AH_WORLD_V4_BASE_DRAW_LANE=drawLane;
drawLane=function AH_WORLD_V4_drawLane(dt){
  if(!AH_isState())return AH_WORLD_V4_BASE_DRAW_LANE(dt);
  const fillRect0=ctx.fillRect,fill0=ctx.fill,stroke0=ctx.stroke;let fillCount=0,strokeCount=0;
  ctx.fillRect=function(x,y,w,h){if(x<=1&&y<=1&&w>=cw*.94&&h>=ch*.94)return;return fillRect0.call(this,x,y,w,h);};
  if(!state.typhoonPhase){ctx.fill=function(...args){if(fillCount++<3)return;return fill0.apply(this,args);};ctx.stroke=function(...args){if(strokeCount++<3)return;return stroke0.apply(this,args);};}
  try{return AH_WORLD_V4_BASE_DRAW_LANE(dt);}finally{ctx.fillRect=fillRect0;ctx.fill=fill0;ctx.stroke=stroke0;}
};

function AH_WORLD_V4_primeCombatFrame(area,cameraX,cameraZ){
  const back=AH_ensureCombatCanvas('ttdAlHataBackV1',0),front=AH_ensureCombatCanvas('ttdAlHataFrontV1',3),lane=document.getElementById('laneCanvas');if(!back||!front)return false;if(lane){lane.style.background='transparent';lane.style.position='relative';lane.style.zIndex='2';}
  back.g.clearRect(0,0,back.w,back.h);front.g.clearRect(0,0,front.w,front.h);AH_COMBAT_DRAWERS[area]({back,front,spec:AH_AREAS[area]});return true;
}

AH_finishTraversalToCombat=async function AH_WORLD_V4_finishTraversalToCombat(area,wave,label){
  if(!AH_isTraversal())return;
  const active=session,world=AH_ensureWorld(),nav=active?.nav,arena=AH_WORLD_V4_ARENAS[area];if(!active||!world||!arena)return;
  active.phase='combat-transition';active.joyX=0;active.joyZ=0;state.running=false;world.objects=active.objects;world.drops=active.drops;world.combatRouteReveal=0;if(nav){world.navigatorBoardIndex=nav.boardIndex;world.navigatorPos={x:nav.x,z:nav.z,y:nav.y};}
  const ctrl=document.getElementById('ttdNavController');if(ctrl){ctrl.style.pointerEvents='none';ctrl.style.opacity='.42';}
  const startAlpha=Math.max(0,Math.min(1,Number(nav?.alpha)||1));await AH_WORLD_V2_tween(250,t=>{if(session===active&&nav)nav.alpha=startAlpha*(1-t);});if(session!==active||!active.active)return;
  const fromX=Number(active.cameraX)||0,fromZ=Number(active.cameraZ)||0,targetX=arena.center.x,targetZ=arena.center.z;restoreTrayChildren();
  await AH_WORLD_V2_tween(700,t=>{if(session!==active)return;const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;active.cameraX=AH_lerp(fromX,targetX,e);active.cameraZ=AH_lerp(fromZ,targetZ,e);world.cameraX=active.cameraX;world.cameraZ=active.cameraZ;world.camera.x=active.cameraX;world.camera.z=active.cameraZ;});if(session!==active||!active.active)return;
  active.cameraX=targetX;active.cameraZ=targetZ;world.cameraX=targetX;world.cameraZ=targetZ;world.camera.x=targetX;world.camera.z=targetZ;world.combatArea=area;world.segment=active.segment;world.checkpoint={...active.checkpoint};
  state.__ttdAlHataCombatArea=area;state.wave=wave;state.waveClearCredited=false;state.waveClearedAt=0;state.spawnQueue=buildAdventureWave(state.adventureStage,wave,state.adventureDiff);state.spawnTimer=0;if(modeLabel)modeLabel.textContent=`Al Hata · ${label||AH_AREAS[area]?.name||'Stage 1'}`;renderHUD();renderBoard();buildPath(cw,ch);
  leavePlatformLayout(false);AH_WORLD_V4_primeCombatFrame(area,targetX,targetZ);AH_WORLD_V3_retireTraversalCanvas();
  await AH_WORLD_V2_tween(330,t=>{world.combatRouteReveal=t;AH_WORLD_V4_primeCombatFrame(area,targetX,targetZ);});
  active.active=false;clearNavigatorSelectionUi();session=null;world.combatRouteReveal=1;state.running=true;lastT=0;requestAnimationFrame(loop);
};

async function AH_WORLD_V4_resumeAfterCombat(area){
  const world=AH_ensureWorld(),arena=AH_WORLD_V4_ARENAS[area],next=arena?.continuation;if(!world||!next)return;state.running=false;world.combatRouteReveal=0;
  const fromX=Number(world.cameraX)||arena.center.x,fromZ=Number(world.cameraZ)||arena.center.z,targetX=Number(next.x)-135,targetZ=Number(next.z)||0;
  await AH_WORLD_V2_tween(580,t=>{const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;world.cameraX=AH_lerp(fromX,targetX,e);world.cameraZ=AH_lerp(fromZ,targetZ,e);world.camera.x=world.cameraX;world.camera.z=world.cameraZ;});world.cameraX=targetX;world.cameraZ=targetZ;world.camera.x=targetX;world.camera.z=targetZ;world.checkpoint={x:next.x,z:next.z,y:next.y};world.segment=next.segment;AH_beginTraversal(next.segment);
}
AH_AFTER_COMBAT[3]=()=>AH_WORLD_V4_resumeAfterCombat(1);
AH_AFTER_COMBAT[6]=()=>AH_WORLD_V4_resumeAfterCombat(2);
AH_AFTER_COMBAT[10]=()=>AH_WORLD_V4_resumeAfterCombat(3);
AH_AFTER_COMBAT[12]=()=>AH_WORLD_V4_resumeAfterCombat(4);

const AH_WORLD_V4_BASE_ENSURE=AH_ensureWorld;
AH_ensureWorld=function AH_WORLD_V4_ensureWorld(){const world=AH_WORLD_V4_BASE_ENSURE();if(!world)return null;world.version=4;world.pathLanguage='clear-corridors-prop-walls';world.sameTerrainCombat=true;world.exactFooting=true;if(!Number.isFinite(Number(world.combatRouteReveal)))world.combatRouteReveal=0;return world;};
