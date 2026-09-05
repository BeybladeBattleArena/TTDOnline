/* Stage 1B fork — cliff platforms OR goblin bridge ambush; both reconverge afterward. */
AH_ROUTES[4]=[
  {x:4300,z:0,y:85},{x:4380,z:-22,y:85},{x:4465,z:12,y:85},{x:4550,z:0,y:85},
];
const AH_PINCER_RIGHT_ROUTE=[
  {x:4800,z:0,y:85},{x:4720,z:20,y:85},{x:4635,z:-14,y:85},{x:4550,z:0,y:85},
];
AH_SEGMENT_STARTS.fork={x:3990,z:0,y:34};
AH_SEGMENT_STARTS.postFork={x:4880,z:0,y:48};
const AH_FORK_PROPS=[
  {kind:'tree',x:3970,z:-220,s:1.05},{kind:'banyan',x:4015,z:230,s:1.10},
  {kind:'sign',x:4055,z:0,s:.9},{kind:'brokenColumn',x:4090,z:-210,s:.8},
  {kind:'tree',x:4230,z:230,s:1.08},{kind:'vine',x:4310,z:-220,s:1},
  {kind:'tree',x:4900,z:-210,s:1.05},{kind:'runeSlab',x:5000,z:180,s:.9},{kind:'tree',x:5100,z:220,s:1.08},
];
AH_OBJECT_TEMPLATES.push(
  {id:'fork_platform_reward',type:'ah_sp_chest',name:'Cliffside Explorer Cache',x:4575,z:-185,y:126,hits:2,hp:0,maxHp:0,opened:false,broken:false,sp:25},
  {id:'postfork_coin_chest',type:'ah_coin_chest',name:'Abandoned Temple Stash',x:5075,z:210,y:50,hits:2,hp:0,maxHp:0,opened:false,broken:false}
);
function AH_forkObject(id){return AH_ensureWorld()?.objects.find(o=>o.id===id);}
function AH_forkPlatforms(){
  return[
    {id:'fork_start',x1:3940,x2:4120,z1:-230,z2:230,y:34,kind:'dirt'},
    /* Upper/background branch: deliberate gaps over the cliff. */
    {id:'cliff_p1',x1:4100,x2:4190,z1:-235,z2:-85,y:50,kind:'wood'},
    {id:'cliff_p2',x1:4230,x2:4315,z1:-245,z2:-95,y:68,kind:'wood'},
    {id:'cliff_p3',x1:4350,x2:4438,z1:-225,z2:-75,y:84,kind:'wood'},
    {id:'cliff_p4',x1:4475,x2:4605,z1:-240,z2:-70,y:105,kind:'wood'},
    {id:'cliff_reward',x1:4535,x2:4645,z1:-250,z2:-120,y:126,kind:'wood'},
    {id:'cliff_exit',x1:4620,x2:4785,z1:-210,z2:-55,y:75,kind:'rock'},
    /* Foreground branch reaches the ambush bridge mouth. */
    {id:'bridge_approach',x1:4090,x2:4315,z1:55,z2:235,y:42,kind:'dirt'},
    {id:'bridge_mouth',x1:4280,x2:4385,z1:55,z2:225,y:62,kind:'wood'},
  ];
}
function AH_postForkPlatforms(){return[
  {id:'rejoin_a',x1:4820,x2:5010,z1:-205,z2:205,y:48,kind:'dirt'},
  {id:'rejoin_b',x1:4990,x2:5220,z1:-180,z2:180,y:55,kind:'dirt'},
  {id:'rejoin_side',x1:5010,x2:5140,z1:155,z2:270,y:50,kind:'rock'},
  {id:'temple_approach_start',x1:5180,x2:5300,z1:-160,z2:160,y:62,kind:'rock'},
];}
AH_SEGMENT_PLATFORMS.fork=AH_forkPlatforms;AH_SEGMENT_PLATFORMS.postFork=AH_postForkPlatforms;

function AH_drawForkBackdrop(g,w,h,cameraX){
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#356e70');sky.addColorStop(.40,'#719b87');sky.addColorStop(.68,'#b8b68c');sky.addColorStop(1,'#3a5e61');g.fillStyle=sky;g.fillRect(0,0,w,h);
  const horizon=h*.34;g.fillStyle='#334c40';g.globalAlpha=.46;for(let i=0;i<7;i++){const x=((i*121-cameraX*.06)%(w+180)+w+180)%(w+180)-90;g.beginPath();g.moveTo(x-75,horizon+48);g.lineTo(x,horizon-58-(i%3)*17);g.lineTo(x+88,horizon+48);g.closePath();g.fill();}g.globalAlpha=1;
  /* Distant water far below the cliff. */
  const waterY=h*.73,sea=g.createLinearGradient(0,waterY,0,h);sea.addColorStop(0,'#3c8593');sea.addColorStop(1,'#1c596d');g.fillStyle=sea;g.fillRect(0,waterY,w,h-waterY);g.strokeStyle='rgba(211,239,230,.22)';g.lineWidth=1;for(let i=0;i<4;i++){const y=waterY+12+i*15;g.beginPath();g.moveTo(0,y);for(let x=0;x<w+20;x+=22)g.lineTo(x,y+Math.sin((x+i*31+cameraX*.04)/30)*1.5);g.stroke();}
  const mist=g.createLinearGradient(0,h*.49,0,h*.80);mist.addColorStop(0,'rgba(220,226,195,0)');mist.addColorStop(1,'rgba(208,222,201,.18)');g.fillStyle=mist;g.fillRect(0,h*.49,w,h*.31);
}
function AH_drawPlankSurface(g,p,projector){AH_ground(g,p,projector);if(p.kind!=='wood')return;const q=[projector(p.x1,p.z1,p.y),projector(p.x2,p.z1,p.y),projector(p.x2,p.z2,p.y),projector(p.x1,p.z2,p.y)];g.save();g.strokeStyle='rgba(65,43,27,.55)';g.lineWidth=1.2;for(let i=1;i<6;i++){const t=i/6,a={x:AH_lerp(q[0].x,q[1].x,t),y:AH_lerp(q[0].y,q[1].y,t)},b={x:AH_lerp(q[3].x,q[2].x,t),y:AH_lerp(q[3].y,q[2].y,t)};g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}g.restore();}
function AH_drawForkSign(g,p,projector){AH_at(g,p.x,p.z,34,p.s,projector,()=>{g.strokeStyle='#594028';g.lineWidth=7;g.beginPath();g.moveTo(0,8);g.lineTo(0,-58);g.stroke();g.fillStyle='#8f6840';g.beginPath();g.moveTo(-45,-62);g.lineTo(8,-62);g.lineTo(20,-50);g.lineTo(8,-38);g.lineTo(-45,-38);g.closePath();g.fill();g.beginPath();g.moveTo(45,-35);g.lineTo(-8,-35);g.lineTo(-20,-23);g.lineTo(-8,-11);g.lineTo(45,-11);g.closePath();g.fill();g.fillStyle='#2d221b';g.font='bold 9px sans-serif';g.textAlign='center';g.fillText('?',-15,-48);g.fillText('!',15,-21);});}
function AH_drawForkProp(g,p,projector){if(p.kind==='sign')AH_drawForkSign(g,p,projector);else AH_drawJungleProp(g,p,projector);}
function AH_drawRopeRails(g,w,h,cameraX,leftX,rightX,y=85){const pr=(x,z,yy=0)=>AH_projectWorld(x,z,yy,w,h,cameraX);for(const z of [-78,78]){const a=pr(leftX,z,y+8),b=pr(rightX,z,y+8);g.strokeStyle='#6b4b31';g.lineWidth=Math.max(2,3*((a.scale+b.scale)*.5));g.beginPath();g.moveTo(a.x,a.y-22*a.scale);g.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2+8,b.x,b.y-22*b.scale);g.stroke();for(let i=0;i<=5;i++){const t=i/5,p=pr(AH_lerp(leftX,rightX,t),z,y+8);g.beginPath();g.moveTo(p.x,p.y+3);g.lineTo(p.x,p.y-22*p.scale);g.stroke();}}}
function AH_drawBridgeDeck(g,w,h,cameraX){const pr=(x,z,y=0)=>AH_projectWorld(x,z,y,w,h,cameraX),p={x1:4260,x2:4840,z1:-86,z2:86,y:85,kind:'wood'};AH_drawPlankSurface(g,p,pr);AH_drawRopeRails(g,w,h,cameraX,p.x1,p.x2,p.y);}

function AH_chooseFork(n){const world=AH_ensureWorld();if(world.routeChoice)return world.routeChoice;if(n.x<4080)return null;world.routeChoice=n.z<-18?'platform':'pincer';toast(world.routeChoice==='platform'?'Cliff route chosen · mind the gaps':'Bridge route chosen · goblins are waiting');return world.routeChoice;}
function AH_finishPlatformBranch(){
  const world=AH_ensureWorld();world.routeChoice='platform';world.platformRouteComplete=true;world.cameraX=4890;world.checkpoint={x:4880,z:0,y:48};
  state.completedWaves=(Number(state.completedWaves)||0)+2;state.wave=12;state.waveClearCredited=true;/* Account for avoided bridge waves without inventing enemies. */
  session.active=false;leavePlatformLayout(true);restoreTrayChildren();session=null;state.running=false;requestAnimationFrame(()=>AH_beginTraversal('postFork'));
}
function AH_forkUpdater(dt){
  const n=session.nav;if(!n)return;n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);const choice=AH_chooseFork(n),inp=inputVector(),speed=160;let nx=n.x+inp.x*speed*dt,nz=AH_clamp(n.z+inp.z*speed*dt,-285,285);
  if(choice==='platform')nz=Math.min(-42,nz);else if(choice==='pincer')nz=Math.max(34,nz);const cg=groundAt(n.x,n.z,session.time),tg=groundAt(nx,nz,session.time);if(n.onGround&&tg&&cg&&tg.y-cg.y>44){nx=n.x;nz=n.z;}n.x=nx;n.z=nz;n.vy-=650*dt;n.y+=n.vy*dt;const ground=groundAt(n.x,n.z,session.time);if(ground&&n.vy<=0&&n.y<=ground.y+3){n.y=ground.y;n.vy=0;n.onGround=true;n.jumps=0;}else n.onGround=false;
  if(n.y<-165){navigatorDamage(Math.max(10,n.die.maxHp*.20),'Fell toward the water');if(session?.nav){const cp=session.checkpoint;n.x=cp.x;n.z=cp.z;n.y=cp.y;n.vy=0;n.jumps=0;}}
  if(choice==='platform'&&n.x>4680){session.checkpoint={x:4660,z:-120,y:75};if(n.x>4750){AH_finishPlatformBranch();return;}}
  if(choice==='pincer'&&n.x>4320){const world=AH_ensureWorld();world.routeChoice='pincer';world.checkpoint={x:4300,z:100,y:62};AH_finishTraversalToCombat(4,11,'Bridge Ambush');return;}
  session.cameraX+=((n.x+120)-session.cameraX)*Math.min(1,dt*2.8);const w=AH_ensureWorld();w.cameraX=session.cameraX;w.checkpoint={...session.checkpoint};w.objects=session.objects;w.drops=session.drops;
}
AH_SEGMENT_UPDATERS.fork=AH_forkUpdater;
function AH_postForkUpdater(dt){
  const n=session.nav;if(!n)return;n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);const inp=inputVector(),speed=172;let nx=n.x+inp.x*speed*dt,nz=AH_clamp(n.z+inp.z*speed*dt,-270,270),cg=groundAt(n.x,n.z,session.time),tg=groundAt(nx,nz,session.time);if(n.onGround&&tg&&cg&&tg.y-cg.y>44){nx=n.x;nz=n.z;}n.x=nx;n.z=nz;n.vy-=650*dt;n.y+=n.vy*dt;const ground=groundAt(n.x,n.z,session.time);if(ground&&n.vy<=0&&n.y<=ground.y+3){n.y=ground.y;n.vy=0;n.onGround=true;n.jumps=0;}else n.onGround=false;if(n.y<-150){navigatorDamage(Math.max(8,n.die.maxHp*.18),'Navigator fell');if(session?.nav){const cp=session.checkpoint;n.x=cp.x;n.z=cp.z;n.y=cp.y;n.vy=0;}}
  collectNearbyDrops();if(n.x>5160)session.checkpoint={x:5150,z:0,y:55};if(n.x>5260){const w=AH_ensureWorld();w.cameraX=5400;w.checkpoint={x:5300,z:0,y:62};if(typeof AH_beginTempleApproach==='function'){session.active=false;leavePlatformLayout(true);restoreTrayChildren();session=null;AH_beginTempleApproach();}else{AH_finishTraversalToCombat(5,13,'Temple Forecourt');}return;}session.cameraX+=((n.x+140)-session.cameraX)*Math.min(1,dt*2.8);const w=AH_ensureWorld();w.cameraX=session.cameraX;w.checkpoint={...session.checkpoint};w.objects=session.objects;w.drops=session.drops;
}
AH_SEGMENT_UPDATERS.postFork=AH_postForkUpdater;
function AH_drawForkTraversal(post=false){
  const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return;if(!resizePlatformCanvas())throw new Error('Al Hata fork canvas has no usable size.');const g=c.getContext('2d');g.clearRect(0,0,session.w,session.h);if(post)AH_jungleBackdrop(g,session.w,session.h,session.cameraX,.75);else AH_drawForkBackdrop(g,session.w,session.h,session.cameraX);const plats=post?AH_postForkPlatforms():AH_forkPlatforms();plats.sort((a,b)=>a.z1-b.z1).forEach(p=>AH_drawPlankSurface(g,p,AH_project));const range=post?[4800,5280]:[3920,4820],items=[];for(const p of AH_FORK_PROPS)if(p.x>=range[0]&&p.x<=range[1])items.push({z:p.z,draw:()=>AH_drawForkProp(g,p,AH_project)});for(const o of session.objects)if(o.x>=range[0]&&o.x<=range[1])items.push({z:o.z,draw:()=>AH_drawBeachObject(g,o,AH_project)});if(session.nav)items.push({z:session.nav.z,draw:()=>drawNavigator(g)});items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw());if(!post){g.save();g.fillStyle='rgba(20,43,39,.90)';for(let i=0;i<5;i++){g.beginPath();g.ellipse(i%2?session.w-5:5,session.h*.28+i*70,18,62,(i%2?-1:1)*.55,0,AH_TAU);g.fill();}g.restore();}
  const hud=document.getElementById('ttdPlatformHud');if(hud){const a=hud.querySelector('.ttdAreaBadge');if(a)a.textContent=post?'REJOINED TEMPLE TRAIL':(AH_ensureWorld().routeChoice==='platform'?'CLIFF PLATFORMS':AH_ensureWorld().routeChoice==='pincer'?'AMBUSH BRIDGE':'PATH FORK');}
}
AH_SEGMENT_DRAWERS.fork=()=>AH_drawForkTraversal(false);AH_SEGMENT_DRAWERS.postFork=()=>AH_drawForkTraversal(true);
function AH_beginFork(){const w=AH_ensureWorld();w.routeChoice=null;w.cameraX=4020;w.checkpoint={x:3990,z:0,y:34};AH_beginTraversal('fork');}

function AH_pointOnProjectedRoute(vertices,t,w,h,cameraX){const pts=AH_sampleRoute(vertices,w,h,cameraX);if(!pts.length)return{x:w*.5,y:h*.5};t=AH_clamp(t,0,1);const lengths=[],total=pts.slice(1).reduce((sum,p,i)=>{const d=Math.hypot(p.x-pts[i].x,p.y-pts[i].y);lengths.push(d);return sum+d;},0),target=total*t;let acc=0;for(let i=0;i<lengths.length;i++){if(target<=acc+lengths[i]||i===lengths.length-1){const u=lengths[i]?((target-acc)/lengths[i]):0;return{x:AH_lerp(pts[i].x,pts[i+1].x,u),y:AH_lerp(pts[i].y,pts[i+1].y,u),scale:AH_lerp(pts[i].scale,pts[i+1].scale,u)};}acc+=lengths[i];}return pts[pts.length-1];}
const AH_forkBaseEnemyRenderPos=enemyRenderPos;
enemyRenderPos=function AH_enemyRenderPos(e){
  if(AH_isState()&&Number(state.__ttdAlHataCombatArea)===4&&e?.__ttdAhPincerSide){const t=totalLen>0?e.dist/totalLen:0,route=e.__ttdAhPincerSide==='right'?AH_PINCER_RIGHT_ROUTE:AH_ROUTES[4];return AH_pointOnProjectedRoute(route,t,cw,ch,AH_AREAS[4].cameraX);}return AH_forkBaseEnemyRenderPos(e);
};
let AH_pincerSpawnCounter=0;
const AH_forkBaseUpdateSpawns=updateSpawns;
updateSpawns=function AH_pincerAwareUpdateSpawns(dt){
  if(!AH_isState()||session?.active||Number(state.__ttdAlHataCombatArea)!==4)return AH_forkBaseUpdateSpawns(dt);
  const beforeEnemies=state.enemies?.length||0,result=AH_forkBaseUpdateSpawns(dt),afterEnemies=state.enemies?.length||0;
  if(afterEnemies>beforeEnemies){for(let i=beforeEnemies;i<afterEnemies;i++){const e=state.enemies[i];if(!e)continue;e.__ttdAhPincerSide=(AH_pincerSpawnCounter++%2===0)?'left':'right';e.__ttdAhEntryKind='bridge';}}
  return result;
};
function AH_drawPincerRoute(g,w,h,cameraX,vertices){const pts=AH_sampleRoute(vertices,w,h,cameraX);g.lineCap='round';for(let i=1;i<pts.length;i++){g.strokeStyle='rgba(89,57,32,.35)';g.lineWidth=Math.max(13,30*((pts[i].scale+pts[i-1].scale)*.5));g.beginPath();g.moveTo(pts[i-1].x,pts[i-1].y);g.lineTo(pts[i].x,pts[i].y);g.stroke();g.strokeStyle='rgba(240,215,164,.18)';g.lineWidth=1;g.stroke();}}
AH_COMBAT_DRAWERS[4]=({back,front,spec})=>{
  AH_drawForkBackdrop(back.g,back.w,back.h,spec.cameraX);AH_drawBridgeDeck(back.g,back.w,back.h,spec.cameraX);AH_drawPincerRoute(back.g,back.w,back.h,spec.cameraX,AH_ROUTES[4]);AH_drawPincerRoute(back.g,back.w,back.h,spec.cameraX,AH_PINCER_RIGHT_ROUTE);
  const pr=(x,z,y=0)=>AH_projectWorld(x,z,y,back.w,back.h,spec.cameraX);AH_drawJungleTree(back.g,{kind:'tree',x:4290,z:-155,s:.95},pr);AH_drawJungleTree(back.g,{kind:'tree',x:4810,z:-150,s:.96},pr);
  const fp=(x,z,y=0)=>AH_projectWorld(x,z,y,front.w,front.h,spec.cameraX);AH_drawJungleSmall(front.g,{kind:'vine',x:4380,z:145,s:1},fp);AH_drawJungleSmall(front.g,{kind:'fern',x:4730,z:150,s:1.1},fp);
  /* Foreground bridge posts make the tower feel trapped inside the structure. */
  front.g.save();front.g.strokeStyle='rgba(68,47,31,.86)';front.g.lineWidth=7;for(const x of [4320,4780]){const p=fp(x,78,85);front.g.beginPath();front.g.moveTo(p.x,p.y+10);front.g.lineTo(p.x,p.y-55*p.scale);front.g.stroke();}front.g.restore();
};
AH_AFTER_COMBAT[12]=()=>{const w=AH_ensureWorld();w.routeChoice='pincer';w.cameraX=4900;w.checkpoint={x:4880,z:0,y:48};AH_beginTraversal('postFork');};