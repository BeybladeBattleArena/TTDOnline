/* Al Hata Stage 1 continuous-world rebuild.
   Loaded after the authored regions + Navigator opening so traversal and combat share one
   persistent world, one camera, one object array, and one set of world coordinates. */
window.__TTD_AL_HATA_CONTINUOUS_WORLD_V2=true;

const AH_WORLD_V2_CONTRACT='one-world-one-camera-persistent-objects';
const AH_WORLD_V2_SEGMENTS=['landing','beach','jungle','deepJungle','fork','postFork','templeApproach'];
const AH_WORLD_V2_SIDE_AREAS=Object.freeze([
  Object.freeze({id:'tidepool-alcove',name:'Tidepool Alcove',x:1080,z:470,reward:'brown-chest'}),
  Object.freeze({id:'treetop-cache',name:'Treetop Cache',x:1415,z:245,y:118,reward:'slate-chest'}),
  Object.freeze({id:'goblin-stash-pocket',name:'Goblin Stash Pocket',x:2600,z:470,reward:'brown-chest'}),
  Object.freeze({id:'ruin-overlook',name:'Ruin Overlook',x:3840,z:-470,y:72,reward:'slate-chest'}),
  Object.freeze({id:'cliff-cache',name:'Cliffside Explorer Cache',x:4590,z:-190,y:146,reward:'slate-chest'}),
  Object.freeze({id:'temple-side-shrine',name:'Temple Side Shrine',x:5650,z:-470,y:86,reward:'slate-chest'}),
]);

/* Broad terrain is intentionally much deeper than the playable corridor. The player never
   sees a naked platform edge; dense props sit inside the playable limit and the physical
   ground continues beyond them. The fork is the deliberate exception: there the missing
   ground is the cliff itself. */
const AH_WORLD_V2_BASE_PLATFORMS=Object.freeze([
  Object.freeze({id:'world_beach',x1:70,x2:1760,z1:-720,z2:720,y:0,kind:'sand',base:true}),
  Object.freeze({id:'world_fringe',x1:1710,x2:2920,z1:-720,z2:720,y:10,kind:'dirt',base:true}),
  Object.freeze({id:'world_deep',x1:2870,x2:4180,z1:-720,z2:720,y:24,kind:'dirt',base:true}),
  Object.freeze({id:'world_postfork',x1:4860,x2:5340,z1:-720,z2:720,y:50,kind:'dirt',base:true}),
  Object.freeze({id:'world_temple',x1:5280,x2:7000,z1:-720,z2:720,y:62,kind:'rock',base:true}),
]);
const AH_WORLD_V2_RAISED_PLATFORMS=Object.freeze([
  /* Beach exploration / real height language. */
  Object.freeze({id:'tidepool_shelf',x1:990,x2:1165,z1:390,z2:535,y:8,kind:'rock'}),
  Object.freeze({id:'beach_step_low',x1:1110,x2:1205,z1:155,z2:300,y:38,kind:'wood'}),
  Object.freeze({id:'beach_step_mid',x1:1215,x2:1305,z1:170,z2:305,y:76,kind:'wood'}),
  Object.freeze({id:'beach_treetop',x1:1310,x2:1505,z1:155,z2:320,y:118,kind:'canopy'}),
  Object.freeze({id:'beach_rock_overlook',x1:865,x2:1015,z1:-350,z2:-210,y:32,kind:'rock'}),
  /* Jungle side pockets / ruins. */
  Object.freeze({id:'jungle_stash_shelf',x1:2505,x2:2695,z1:380,z2:535,y:14,kind:'dirt'}),
  Object.freeze({id:'ruin_step_low',x1:3650,x2:3740,z1:-430,z2:-300,y:44,kind:'rock'}),
  Object.freeze({id:'ruin_step_high',x1:3765,x2:3945,z1:-535,z2:-350,y:72,kind:'rock'}),
  /* Cliff/platform branch and pincer bridge occupy actual empty space. */
  Object.freeze({id:'fork_start',x1:3940,x2:4185,z1:-300,z2:300,y:34,kind:'dirt'}),
  Object.freeze({id:'cliff_p1',x1:4100,x2:4190,z1:-260,z2:-95,y:50,kind:'wood'}),
  Object.freeze({id:'cliff_p2',x1:4230,x2:4318,z1:-270,z2:-105,y:70,kind:'wood'}),
  Object.freeze({id:'cliff_p3',x1:4350,x2:4440,z1:-250,z2:-85,y:92,kind:'wood'}),
  Object.freeze({id:'cliff_p4',x1:4475,x2:4608,z1:-265,z2:-80,y:118,kind:'wood'}),
  Object.freeze({id:'cliff_reward',x1:4535,x2:4650,z1:-275,z2:-130,y:146,kind:'wood'}),
  Object.freeze({id:'cliff_exit',x1:4620,x2:4790,z1:-225,z2:-55,y:82,kind:'rock'}),
  Object.freeze({id:'bridge_approach',x1:4085,x2:4318,z1:55,z2:250,y:42,kind:'dirt'}),
  Object.freeze({id:'bridge_mouth',x1:4280,x2:4388,z1:45,z2:225,y:62,kind:'wood'}),
  Object.freeze({id:'pincer_bridge',x1:4260,x2:4845,z1:-90,z2:90,y:85,kind:'wood'}),
  Object.freeze({id:'fork_rejoin',x1:4770,x2:4935,z1:-225,z2:225,y:54,kind:'rock'}),
  /* Temple side-shrine exploration. */
  Object.freeze({id:'temple_side_step',x1:5480,x2:5580,z1:-410,z2:-285,y:74,kind:'rock'}),
  Object.freeze({id:'temple_side_shrine',x1:5570,x2:5750,z1:-535,z2:-350,y:86,kind:'rock'}),
  Object.freeze({id:'temple_old_stairs_1',x1:5650,x2:5765,z1:-220,z2:220,y:72,kind:'rock'}),
  Object.freeze({id:'temple_old_stairs_2',x1:5740,x2:5860,z1:-210,z2:210,y:82,kind:'rock'}),
  Object.freeze({id:'temple_outer_court',x1:5830,x2:6010,z1:-260,z2:260,y:88,kind:'rock'}),
]);

/* Props are also collision walls. Gaps between paired wall blocks become readable side-area
   entrances instead of invisible game bounds. */
const AH_WORLD_V2_BLOCKERS=Object.freeze([
  Object.freeze({id:'beach_spine',x1:1180,x2:1380,z1:-70,z2:75}),
  Object.freeze({id:'tide_wall_a',x1:930,x2:1030,z1:300,z2:390}),
  Object.freeze({id:'tide_wall_b',x1:1135,x2:1250,z1:300,z2:390}),
  Object.freeze({id:'fringe_brush_a',x1:1850,x2:2070,z1:-45,z2:95}),
  Object.freeze({id:'stash_wall_a',x1:2380,x2:2520,z1:280,z2:385}),
  Object.freeze({id:'stash_wall_b',x1:2700,x2:2835,z1:280,z2:385}),
  Object.freeze({id:'ruin_wall_a',x1:3540,x2:3745,z1:-355,z2:-270}),
  Object.freeze({id:'ruin_wall_b',x1:3940,x2:4095,z1:-355,z2:-270}),
  Object.freeze({id:'temple_wall_a',x1:5420,x2:5570,z1:-345,z2:-255}),
  Object.freeze({id:'temple_wall_b',x1:5755,x2:5900,z1:-345,z2:-255}),
]);

const AH_WORLD_V2_WALL_PROPS=[];
(function AH_WORLD_V2_buildWallProps(){
  const add=(region,kind,x,z,s=1)=>AH_WORLD_V2_WALL_PROPS.push({region,kind,x,z,s});
  for(let x=160;x<=1680;x+=165){add('beach',x%330?'palm':'boulder',x,-535,.9+(x%4)*.04);add('beach',x%495?'palm':'boulder',x+55,535,.94);}
  for(let x=1740;x<=4100;x+=145){add('jungle',x%290?'tree':'banyan',x,-535,.98+(x%5)*.035);add('jungle',x%435?'tree':'banyan',x+45,535,1.02);}
  for(let x=4900;x<=5350;x+=145){add('jungle','tree',x,-535,1.04);add('jungle','banyan',x+42,535,1.03);}
  for(let x=5370;x<=6900;x+=150){add('temple',x%300?'templeColumn':'templeWall',x,-535,1.03);add('temple',x%450?'templeColumn':'templeWall',x+48,535,1.02);}
  /* Blocker silhouettes: these are the visible reason the player cannot walk straight through. */
  for(const b of AH_WORLD_V2_BLOCKERS){
    const region=b.x1<1700?'beach':b.x1<5200?'jungle':'temple';
    const kind=region==='beach'?'boulder':region==='jungle'?'tree':'templeColumn';
    const count=Math.max(2,Math.ceil((b.x2-b.x1)/58));
    for(let i=0;i<=count;i++){const t=i/count;add(region,kind,AH_lerp(b.x1,b.x2,t),AH_lerp(b.z1,b.z2,(i%2)*.7+.15),.86+(i%3)*.08);}
  }
})();

/* Extra side-area rewards. Existing authored rewards are repositioned into the enlarged world
   below, so these are additive rather than replacements. */
AH_OBJECT_TEMPLATES.push(
  {id:'v2_tidepool_chest',type:'ah_coin_chest',name:'Tidepool Chest',x:1080,z:475,y:8,hits:2,hp:0,maxHp:0,opened:false,broken:false},
  {id:'v2_ruin_overlook_cache',type:'ah_sp_chest',name:'Ruin Overlook Cache',x:3840,z:-470,y:72,hits:2,hp:0,maxHp:0,opened:false,broken:false,sp:25},
  {id:'v2_temple_side_cache',type:'ah_sp_chest',name:'Side Shrine Cache',x:5650,z:-470,y:86,hits:2,hp:0,maxHp:0,opened:false,broken:false,sp:25}
);

const AH_WORLD_V2_BASE_ENSURE_WORLD=AH_ensureWorld;
AH_ensureWorld=function AH_WORLD_V2_ensureWorld(){
  const world=AH_WORLD_V2_BASE_ENSURE_WORLD();if(!world)return null;
  world.version=2;world.contract=AH_WORLD_V2_CONTRACT;
  if(!Array.isArray(world.objects))world.objects=[];if(!Array.isArray(world.drops))world.drops=[];
  if(!world.sideAreas)world.sideAreas=AH_WORLD_V2_SIDE_AREAS.map(a=>({...a}));
  if(!world.v2LayoutApplied){
    const move=(id,x,z,y)=>{const o=world.objects.find(v=>v.id===id);if(o)Object.assign(o,{x,z,y});};
    move('beach_coin_chest',1060,455,8);
    move('beach_sp_chest',1415,245,118);
    move('jungle_side_chest',2600,470,14);
    move('fork_platform_reward',4590,-190,146);
    move('postfork_coin_chest',5100,345,50);
    move('temple_hidden_sp_chest',5650,-470,86);
    world.v2LayoutApplied=true;
  }
  return world;
};

function AH_WORLD_V2_platforms(){
  const out=[...AH_WORLD_V2_BASE_PLATFORMS.map(p=>({...p})),...AH_WORLD_V2_RAISED_PLATFORMS.map(p=>({...p}))];
  const crate=AH_ensureWorld()?.objects?.find(o=>o.id==='beach_push_crate');
  if(crate&&!crate.broken)out.push({id:'push_crate_top',x1:crate.x-30,x2:crate.x+30,z1:crate.z-30,z2:crate.z+30,y:(crate.y||0)+44,kind:'crate'});
  return out;
}
for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_PLATFORMS[segment]=AH_WORLD_V2_platforms;

/* Ground resolution is height-aware. A platform above the Navigator is no longer selected as
   the floor, which is what previously made a visually elevated slab behave like beach ground. */
const AH_WORLD_V2_BASE_GROUND_AT=groundAt;
groundAt=function AH_WORLD_V2_groundAt(x,z,t){
  if(!AH_isTraversal())return AH_WORLD_V2_BASE_GROUND_AT(x,z,t);
  const nav=session?.nav,ascending=Number(nav?.vy)>0;
  const ceiling=nav?Number(nav.y||0)+(nav.onGround?40:ascending?8:22):Infinity;
  let best=null;
  for(const p of AH_WORLD_V2_platforms()){
    if(x<p.x1||x>p.x2||z<p.z1||z>p.z2||Number(p.y)>ceiling)continue;
    if(!best||Number(p.y)>Number(best.y))best=p;
  }
  return best;
};

function AH_WORLD_V2_blocked(x,z){
  if(x<95||x>6900||z<-540||z>540)return true;
  for(const b of AH_WORLD_V2_BLOCKERS)if(x>b.x1&&x<b.x2&&z>b.z1&&z<b.z2)return true;
  return false;
}
function AH_WORLD_V2_slideMove(n,nx,nz){
  if(!AH_WORLD_V2_blocked(nx,nz))return{x:nx,z:nz};
  if(!AH_WORLD_V2_blocked(nx,n.z))return{x:nx,z:n.z};
  if(!AH_WORLD_V2_blocked(n.x,nz))return{x:n.x,z:nz};
  return{x:n.x,z:n.z};
}
function AH_WORLD_V2_regionForX(x){return x<1710?'LANDING SHORE':x<2870?'GOBLIN FRINGE':x<4180?'DEEP JUNGLE':x<4860?'CLIFF CROSSING':x<5280?'TEMPLE TRAIL':'TEMPLE APPROACH';}

function AH_WORLD_V2_syncWorld(){
  const world=AH_ensureWorld();if(!world||!session)return;
  world.cameraX=session.cameraX;world.segment=session.segment;world.checkpoint={...session.checkpoint};world.objects=session.objects;world.drops=session.drops;
  if(session.nav){world.navigatorBoardIndex=session.nav.boardIndex;world.navigatorPos={x:session.nav.x,z:session.nav.z,y:session.nav.y};}
}
function AH_WORLD_V2_damageFall(n,reason='Navigator fell'){
  navigatorDamage(Math.max(8,n.die.maxHp*.18),reason);
  if(session?.nav){const cp=session.checkpoint;n.x=cp.x;n.z=cp.z;n.y=cp.y;n.vy=0;n.jumps=0;n.onGround=true;}
}
function AH_WORLD_V2_chooseFork(n){
  const world=AH_ensureWorld();if(world.routeChoice)return world.routeChoice;
  if(n.x<4040)return null;
  if(n.z<-35)world.routeChoice='platform';else if(n.z>35)world.routeChoice='pincer';
  return world.routeChoice;
}
function AH_WORLD_V2_completePlatformFork(){
  const world=AH_ensureWorld();if(!world)return;
  world.routeChoice='platform';world.platformRouteComplete=true;world.checkpoint={x:4895,z:-25,y:54};
  state.completedWaves=(Number(state.completedWaves)||0)+2;state.wave=12;state.waveClearCredited=true;
  session.segment='postFork';session.checkpoint={...world.checkpoint};
  const n=session.nav;n.x=4895;n.z=-25;n.y=54;n.vy=0;n.onGround=true;n.jumps=0;
}

function AH_WORLD_V2_updateNavigator(dt){
  const n=session?.nav;if(!n)return;
  n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);
  if(state.__ttdMissionIntroHold||session.phase!=='play'){const desired=n.x+135,delta=desired-session.cameraX;session.cameraX+=Math.max(-7,Math.min(7,delta*(1-Math.exp(-dt*2.2))));AH_WORLD_V2_syncWorld();return;}
  const inp=inputVector(),speed=174;
  let nx=n.x+inp.x*speed*dt,nz=n.z+inp.z*speed*dt;({x:nx,z:nz}=AH_WORLD_V2_slideMove(n,nx,nz));
  const cg=groundAt(n.x,n.z,session.time),tg=groundAt(nx,nz,session.time);
  if(n.onGround&&tg&&cg&&Number(tg.y)-Number(cg.y)>40){nx=n.x;nz=n.z;}
  n.x=nx;n.z=nz;n.vy-=650*dt;n.y+=n.vy*dt;
  const ground=groundAt(n.x,n.z,session.time);
  if(ground&&n.vy<=0&&n.y<=Number(ground.y)+3){n.y=Number(ground.y);n.vy=0;n.onGround=true;n.jumps=0;}else n.onGround=false;
  if(n.y<-175)AH_WORLD_V2_damageFall(n,session.segment==='fork'?'Fell toward the water':'Navigator fell');
  collectNearbyDrops();

  /* Progression lines are world coordinates, not scene exits. Backtracking remains possible. */
  if(session.segment==='landing'&&n.x>735&&Math.abs(n.z)<420){AH_finishTraversalToCombat(1,1,'Landing Shore');return;}
  if(session.segment==='beach'&&n.x>1685){AH_finishTraversalToCombat(2,4,'Goblin Fringe');return;}
  if(session.segment==='jungle'&&n.x>2860){AH_finishTraversalToCombat(3,7,'Deep Jungle Ruins');return;}
  if(session.segment==='deepJungle'&&n.x>3950){session.segment='fork';session.checkpoint={x:3990,z:0,y:34};const w=AH_ensureWorld();w.segment='fork';w.checkpoint={...session.checkpoint};}
  if(session.segment==='fork'){
    const choice=AH_WORLD_V2_chooseFork(n);
    if(choice==='pincer'&&n.x>4310&&n.z>25){AH_finishTraversalToCombat(4,11,'Bridge Ambush');return;}
    if(choice==='platform'&&n.x>4770){AH_WORLD_V2_completePlatformFork();}
  }
  if(session.segment==='postFork'&&n.x>5260){session.segment='templeApproach';session.checkpoint={x:5310,z:0,y:62};const w=AH_ensureWorld();w.segment='templeApproach';w.checkpoint={...session.checkpoint};}
  if(session.segment==='templeApproach'&&n.x>5960){const w=AH_ensureWorld();w.templeReached=true;AH_finishTraversalToCombat(5,13,'Temple Forecourt');return;}

  if(n.x>900&&n.x<1700)session.checkpoint={x:Math.max(900,n.x-80),z:n.z,y:Math.max(0,Number(ground?.y)||0)};
  else if(n.x>2280&&n.x<2860)session.checkpoint={x:n.x-70,z:n.z,y:Number(ground?.y)||10};
  else if(n.x>3500&&n.x<3950)session.checkpoint={x:n.x-70,z:n.z,y:Number(ground?.y)||24};
  else if(n.x>4900&&n.x<5260)session.checkpoint={x:n.x-70,z:n.z,y:Number(ground?.y)||50};
  else if(n.x>5350)session.checkpoint={x:n.x-70,z:n.z,y:Number(ground?.y)||62};

  const desired=n.x+135,delta=desired-session.cameraX,alpha=1-Math.exp(-dt*2.15);session.cameraX+=Math.max(-8,Math.min(8,delta*alpha));
  AH_WORLD_V2_syncWorld();
}
for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_UPDATERS[segment]=AH_WORLD_V2_updateNavigator;

function AH_WORLD_V2_projector(w,h,cameraX){return(x,z,y=0)=>AH_projectWorld(x,z,y,w,h,cameraX);}
function AH_WORLD_V2_platformPalette(kind){return{sand:['#cbae6f','#ead299'],dirt:['#596744','#849061'],rock:['#62645d','#8b8a7d'],wood:['#65482f','#9b7047'],canopy:['#315334','#5d824d'],crate:['#704b32','#a9754d']}[kind]||['#67665e','#918d7f'];}
function AH_WORLD_V2_drawPlatform(g,p,projector){
  const top=[projector(p.x1,p.z1,p.y),projector(p.x2,p.z1,p.y),projector(p.x2,p.z2,p.y),projector(p.x1,p.z2,p.y)],pal=AH_WORLD_V2_platformPalette(p.kind);
  if(!p.base&&Number(p.y)>16){
    const shadow=[projector(p.x1,p.z1,1),projector(p.x2,p.z1,1),projector(p.x2,p.z2,1),projector(p.x1,p.z2,1)];
    g.save();g.globalAlpha=AH_clamp(.12+Number(p.y)/500,.12,.34);g.fillStyle='#11120f';g.beginPath();g.moveTo(shadow[0].x,shadow[0].y);for(let i=1;i<shadow.length;i++)g.lineTo(shadow[i].x,shadow[i].y);g.closePath();g.fill();g.restore();
  }
  if(!p.base){
    const thickness=Math.max(12,Math.min(28,12+Number(p.y)*.08)),under=[projector(p.x1,p.z1,Number(p.y)-thickness),projector(p.x2,p.z1,Number(p.y)-thickness),projector(p.x2,p.z2,Number(p.y)-thickness),projector(p.x1,p.z2,Number(p.y)-thickness)];
    g.fillStyle=pal[0];g.beginPath();g.moveTo(top[3].x,top[3].y);g.lineTo(top[2].x,top[2].y);g.lineTo(under[2].x,under[2].y);g.lineTo(under[3].x,under[3].y);g.closePath();g.fill();
    g.fillStyle='rgba(34,31,26,.30)';g.beginPath();g.moveTo(top[1].x,top[1].y);g.lineTo(top[2].x,top[2].y);g.lineTo(under[2].x,under[2].y);g.lineTo(under[1].x,under[1].y);g.closePath();g.fill();
  }
  const grad=g.createLinearGradient(0,Math.min(...top.map(v=>v.y)),0,Math.max(...top.map(v=>v.y))+90);grad.addColorStop(0,pal[1]);grad.addColorStop(1,pal[0]);g.fillStyle=grad;g.beginPath();g.moveTo(top[0].x,top[0].y);for(let i=1;i<4;i++)g.lineTo(top[i].x,top[i].y);g.closePath();g.fill();g.strokeStyle='rgba(245,236,199,.13)';g.lineWidth=1;g.stroke();
}
function AH_WORLD_V2_drawBackdrop(g,w,h,cameraX,combat=false){
  if(cameraX<1710)AH_beachSky(g,w,h,cameraX);
  else if(cameraX<4200)AH_jungleBackdrop(g,w,h,cameraX,AH_clamp((cameraX-2300)/1800,0,1));
  else if(cameraX<5200)AH_drawForkBackdrop(g,w,h,cameraX);
  else AH_templeBackdrop(g,w,h,cameraX,combat);
}
function AH_WORLD_V2_staticPropRecords(){
  const out=[];
  for(const p of AH_BEACH_PROPS)out.push({region:'beach',p});
  for(const p of AH_JUNGLE_PROPS)out.push({region:'jungle',p});
  for(const p of AH_FORK_PROPS)out.push({region:'fork',p});
  for(const p of AH_TEMPLE_PROPS)out.push({region:'temple',p});
  for(const p of AH_WORLD_V2_WALL_PROPS)out.push({region:p.region,p});
  return out;
}
const AH_WORLD_V2_STATIC_PROPS=AH_WORLD_V2_staticPropRecords();
function AH_WORLD_V2_drawStaticProp(g,record,projector){
  const {region,p}=record;
  if(region==='beach')AH_drawBeachProp(g,p,projector);else if(region==='jungle')AH_drawJungleProp(g,p,projector);else if(region==='fork')AH_drawForkProp(g,p,projector);else AH_drawTempleProp(g,p,projector);
}
function AH_WORLD_V2_isChest(o){return ['ah_coin_chest','ah_sp_chest','ah_hidden_sp_chest'].includes(o?.type);}
function AH_WORLD_V2_drawOpenedChest(g,o,projector){
  if(o.hidden)return;const p=projector(o.x,o.z,o.y||0),sc=p.scale;g.save();g.translate(p.x,p.y);g.scale(sc,sc);g.globalAlpha=.88;g.fillStyle=o.type==='ah_sp_chest'||o.type==='ah_hidden_sp_chest'?'#374d63':'#493421';g.fillRect(-25,0,50,22);g.fillStyle=o.type==='ah_sp_chest'||o.type==='ah_hidden_sp_chest'?'#587896':'#795232';g.fillRect(-23,-6,46,12);g.save();g.translate(0,-9);g.rotate(-.48);g.fillRect(-23,-7,46,11);g.restore();g.strokeStyle=o.type==='ah_sp_chest'||o.type==='ah_hidden_sp_chest'?'#a8d7f2':'#d7af63';g.lineWidth=2;g.strokeRect(-23,-6,46,28);g.restore();
}
function AH_WORLD_V2_drawDebris(g,o,projector){
  const started=Number(o.brokenAt)||0,age=(performance.now()-started)/1000;if(!started||age>1.25)return;
  const t=AH_clamp(age/1.25,0,1),p=projector(o.x,o.z,(o.y||0)+4);g.save();g.translate(p.x,p.y);g.scale(p.scale,p.scale);g.globalAlpha=1-t;g.fillStyle='#765035';
  for(let i=0;i<8;i++){const a=(i/8)*AH_TAU+(o.breakSeed||0),r=12+42*t*(.55+(i%3)*.18),x=Math.cos(a)*r,y=-10-Math.sin(a)*r*.35+38*t*t;g.save();g.translate(x,y);g.rotate(a+t*4);g.fillRect(-8,-2,16,4);g.restore();}g.restore();
}
function AH_WORLD_V2_drawObject(g,o,projector){
  if(!o||o.collected)return;
  if(AH_WORLD_V2_isChest(o)&&o.opened){AH_WORLD_V2_drawOpenedChest(g,o,projector);return;}
  if((o.type==='ah_push_crate'||o.type==='ah_barrier')&&o.broken){AH_WORLD_V2_drawDebris(g,o,projector);return;}
  if(o.x>=5260)AH_drawTempleObject(g,o,projector);else if(o.x>=1700)AH_drawJungleObject(g,o,projector);else AH_drawBeachObject(g,o,projector);
}
function AH_WORLD_V2_drawDrop(g,d,projector){
  if(!d||d.collected)return;const p=projector(d.x,d.z,d.y||d.baseY||3);g.save();g.translate(p.x,p.y);g.scale(p.scale,p.scale);g.textAlign='center';g.textBaseline='middle';g.font='bold 18px sans-serif';g.fillStyle=d.kind==='coin'?'#efd377':d.kind==='ore'?'#c9b8f0':d.kind==='exp'?'#8fc4e8':'#f2e6c3';g.fillText(d.kind==='coin'?'●':d.kind==='ore'?'◆':d.kind==='exp'?'✦':d.icon||'•',0,0);g.restore();
}
function AH_WORLD_V2_surfaceBelow(x,z,y){
  let best=null;for(const p of AH_WORLD_V2_platforms())if(x>=p.x1&&x<=p.x2&&z>=p.z1&&z<=p.z2&&Number(p.y)<=Number(y)+2&&(!best||p.y>best.y))best=p;return best;
}
function AH_WORLD_V2_drawNavigator(g,projector){
  const n=session?.nav;if(!n)return;const support=AH_WORLD_V2_surfaceBelow(n.x,n.z,n.y),gy=support?Number(support.y):0,gp=projector(n.x,n.z,gy+.5),p=projector(n.x,n.z,n.y+20),jump=Math.max(0,n.y-gy),sc=p.scale;
  const shadowW=30*gp.scale*(1-Math.min(.32,jump/260)),shadowH=11*gp.scale*(1-Math.min(.28,jump/260));
  g.save();g.globalAlpha=Math.max(.12,.34*(1-Math.min(.72,jump/170)));g.translate(gp.x,gp.y+2);g.fillStyle='#090b0c';const r=4*gp.scale;g.beginPath();g.moveTo(-shadowW/2+r,-shadowH/2);g.lineTo(shadowW/2-r,-shadowH/2);g.quadraticCurveTo(shadowW/2,-shadowH/2,shadowW/2,-shadowH/2+r);g.lineTo(shadowW/2,shadowH/2-r);g.quadraticCurveTo(shadowW/2,shadowH/2,shadowW/2-r,shadowH/2);g.lineTo(-shadowW/2+r,shadowH/2);g.quadraticCurveTo(-shadowW/2,shadowH/2,-shadowW/2,shadowH/2-r);g.lineTo(-shadowW/2,-shadowH/2+r);g.quadraticCurveTo(-shadowW/2,-shadowH/2,-shadowW/2+r,-shadowH/2);g.closePath();g.fill();g.restore();
  const def=DICE[n.die.key],size=40*sc,rr=7*sc;g.save();g.globalAlpha=n.alpha*(n.invuln>0&&Math.floor(n.invuln*12)%2?.5:1);g.translate(p.x,p.y);g.fillStyle=def?.color||'#8b7fe8';g.strokeStyle=def?.glow||'#d4ecfa';g.lineWidth=2;g.beginPath();g.moveTo(-size/2+rr,-size/2);g.lineTo(size/2-rr,-size/2);g.quadraticCurveTo(size/2,-size/2,size/2,-size/2+rr);g.lineTo(size/2,size/2-rr);g.quadraticCurveTo(size/2,size/2,size/2-rr,size/2);g.lineTo(-size/2+rr,size/2);g.quadraticCurveTo(-size/2,size/2,-size/2,size/2-rr);g.lineTo(-size/2,-size/2+rr);g.quadraticCurveTo(-size/2,-size/2,-size/2+rr,-size/2);g.closePath();g.fill();g.stroke();g.fillStyle='rgba(255,255,255,.9)';const dot=Math.max(1,Math.min(7,n.die.dot||1)),pip=[[-.22,-.22],[.22,.22],[.22,-.22],[-.22,.22],[0,0],[0,-.28],[0,.28]].slice(0,dot);for(const [px,py] of pip){g.beginPath();g.arc(px*size,py*size,2.5*sc,0,AH_TAU);g.fill();}g.restore();
  const hpW=52;g.save();g.globalAlpha=n.alpha;g.fillStyle='rgba(0,0,0,.62)';g.fillRect(p.x-hpW/2,p.y-size/2-11,hpW,5);g.fillStyle='#78d992';g.fillRect(p.x-hpW/2+1,p.y-size/2-10,(hpW-2)*Math.max(0,n.die.hp/n.die.maxHp),3);g.restore();
}
function AH_WORLD_V2_drawWorldLayer(g,w,h,cameraX,front=false,combat=false){
  const projector=AH_WORLD_V2_projector(w,h,cameraX),world=AH_ensureWorld();if(!world)return;
  if(!front){
    AH_WORLD_V2_drawBackdrop(g,w,h,cameraX,combat);
    const visiblePlatforms=AH_WORLD_V2_platforms().filter(p=>p.x2>cameraX-1050&&p.x1<cameraX+1050).sort((a,b)=>a.z1-b.z1);for(const p of visiblePlatforms)AH_WORLD_V2_drawPlatform(g,p,projector);
  }
  const items=[];
  for(const record of AH_WORLD_V2_STATIC_PROPS){if(Math.abs(record.p.x-cameraX)>1000)continue;const isFront=Number(record.p.z)>115;if(isFront===front)items.push({z:record.p.z,draw:()=>AH_WORLD_V2_drawStaticProp(g,record,projector)});}
  for(const o of world.objects){if(Math.abs(Number(o.x)-cameraX)>1000)continue;const isFront=Number(o.z)>115;if(isFront===front)items.push({z:Number(o.z)||0,draw:()=>AH_WORLD_V2_drawObject(g,o,projector)});}
  if(!front)for(const d of world.drops)if(Math.abs(Number(d.x)-cameraX)<1000)items.push({z:Number(d.z)||0,draw:()=>AH_WORLD_V2_drawDrop(g,d,projector)});
  if(!combat&&!front&&session?.nav)items.push({z:Number(session.nav.z)||0,draw:()=>AH_WORLD_V2_drawNavigator(g,projector)});
  items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw());
}
function AH_WORLD_V2_drawTraversal(){
  const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return;if(!resizePlatformCanvas())throw new Error('Al Hata continuous-world canvas has no usable size.');const g=c.getContext('2d');g.clearRect(0,0,session.w,session.h);AH_WORLD_V2_drawWorldLayer(g,session.w,session.h,session.cameraX,false,false);AH_WORLD_V2_drawWorldLayer(g,session.w,session.h,session.cameraX,true,false);
  const hud=document.getElementById('ttdPlatformHud');if(hud){const nav=hud.querySelector('.ttdNavBadge');if(nav)nav.style.display='none';const area=hud.querySelector('.ttdAreaBadge');if(area){area.textContent=AH_WORLD_V2_regionForX(session.nav?.x||session.cameraX);area.style.opacity='.55';}}
}
for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_DRAWERS[segment]=AH_WORLD_V2_drawTraversal;

/* Combat uses the identical renderer + world arrays. An opened chest remains open because the
   battle canvas reads the same world.objects instance used by traversal. */
for(const area of [1,2,3,4,5])AH_COMBAT_DRAWERS[area]=function AH_WORLD_V2_combatDrawer(args){
  const world=AH_ensureWorld(),cameraX=Number(world?.cameraX)||Number(args.spec?.cameraX)||AH_AREAS[area].cameraX;
  AH_WORLD_V2_drawWorldLayer(args.back.g,args.back.w,args.back.h,cameraX,false,true);AH_drawRouteRibbon(args.back.g,args.back.w,args.back.h,area,cameraX,'rgba(92,75,52,.14)');AH_WORLD_V2_drawWorldLayer(args.front.g,args.front.w,args.front.h,cameraX,true,true);
};

function AH_WORLD_V2_tween(duration,step){return new Promise(resolve=>{const started=performance.now();const frame=now=>{const t=AH_clamp((now-started)/duration,0,1);step(t);if(t>=1)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});}
const AH_WORLD_V2_BASE_FINISH_TRAVERSAL=AH_finishTraversalToCombat;
AH_finishTraversalToCombat=async function AH_WORLD_V2_finishTraversalToCombat(area,wave,label){
  if(!AH_isTraversal())return AH_WORLD_V2_BASE_FINISH_TRAVERSAL(area,wave,label);
  const active=session,world=AH_ensureWorld(),nav=active.nav;if(!active||!world)return;
  active.phase='combat-transition';active.joyX=0;active.joyZ=0;state.running=false;world.objects=active.objects;world.drops=active.drops;if(nav)world.navigatorBoardIndex=nav.boardIndex;
  const ctrl=document.getElementById('ttdNavController');if(ctrl){ctrl.style.pointerEvents='none';ctrl.style.opacity='.42';}
  const startAlpha=Math.max(0,Math.min(1,Number(nav?.alpha)||1));await AH_WORLD_V2_tween(300,t=>{if(session===active&&nav)nav.alpha=startAlpha*(1-t);});if(session!==active||!active.active)return;
  restoreTrayChildren();
  const from=active.cameraX,target=Number(AH_AREAS[area]?.cameraX)||from;await AH_WORLD_V2_tween(760,t=>{if(session!==active)return;const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;active.cameraX=AH_lerp(from,target,e);world.cameraX=active.cameraX;});if(session!==active||!active.active)return;
  active.cameraX=target;world.cameraX=target;world.combatArea=area;world.segment=active.segment;world.checkpoint={...active.checkpoint};
  state.__ttdAlHataCombatArea=area;state.wave=wave;state.waveClearCredited=false;state.waveClearedAt=0;state.spawnQueue=buildAdventureWave(state.adventureStage,wave,state.adventureDiff);state.spawnTimer=0;
  if(modeLabel)modeLabel.textContent=`Al Hata · ${label||AH_AREAS[area]?.name||'Stage 1'}`;renderHUD();renderBoard();active.active=false;clearNavigatorSelectionUi();leavePlatformLayout(true);session=null;buildPath(cw,ch);try{drawLane(0);}catch(_){}state.running=true;lastT=0;requestAnimationFrame(loop);
};

const AH_WORLD_V2_BASE_BEGIN_TRAVERSAL=AH_beginTraversal;
AH_beginTraversal=function AH_WORLD_V2_beginTraversal(segment){
  if(session?.active||!AH_isState())return;const world=AH_ensureWorld(),start=world.checkpoint||AH_SEGMENT_STARTS[segment]||{x:720,z:0,y:0};world.segment=segment;
  session={active:true,phase:'select',nav:null,w:1,h:1,cameraX:Number(world.cameraX)||start.x,time:0,lastTs:0,joyX:0,joyZ:0,checkpoint:{...start},objects:world.objects,drops:world.drops,hazardCd:0,returnAlpha:1,__ttdAlHata:true,segment};
  const boardIndex=Number(world.navigatorBoardIndex),die=Number.isInteger(boardIndex)?state.board?.[boardIndex]:null;
  if(die&&Number(die.hp)>0){session.nav={die,boardIndex,x:start.x,z:start.z,y:start.y,vy:0,onGround:true,jumps:0,invuln:0,alpha:0,spawnT:0};session.phase='materialize';initObjectHp();enterPlatformLayout();return;}
  setupNavigatorSelection('Select one of your summoned dice to continue exploring Al Hata');
};

async function AH_WORLD_V2_resumeAfterCombat(segment,start){
  const world=AH_ensureWorld();if(!world)return;const from=Number(world.cameraX)||Number(start.x),target=Number(start.x)-135;state.running=false;
  await AH_WORLD_V2_tween(620,t=>{const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;world.cameraX=AH_lerp(from,target,e);});world.cameraX=target;world.checkpoint={...start};world.segment=segment;AH_beginTraversal(segment);
}
AH_AFTER_COMBAT[3]=()=>AH_WORLD_V2_resumeAfterCombat('beach',{x:930,z:0,y:0});
AH_AFTER_COMBAT[6]=()=>AH_WORLD_V2_resumeAfterCombat('jungle',{x:2290,z:0,y:10});
AH_AFTER_COMBAT[10]=()=>AH_WORLD_V2_resumeAfterCombat('deepJungle',{x:3540,z:0,y:24});
AH_AFTER_COMBAT[12]=()=>AH_WORLD_V2_resumeAfterCombat('postFork',{x:4900,z:0,y:54});

/* Show, don't tell for common destructibles. */
function AH_WORLD_V2_damageWood(o){
  if(!session?.nav||o.broken)return false;if(!Number(o.maxHp)||o.maxHp<=0){const ap=Math.max(1,Math.round(effDmg(session.nav.die))),hits=Math.max(2,Number(o.hits)||3);o.maxHp=o.hp=Math.max(hits,ap*hits);}const dmg=Math.max(1,Math.round(effDmg(session.nav.die)));o.hp=Math.max(0,o.hp-dmg);o.flash=.16;if(o.hp>0)return true;o.broken=true;o.brokenAt=performance.now();o.breakSeed=Math.random()*AH_TAU;return true;
}
AH_OBJECT_ATTACKERS.ah_push_crate=o=>AH_WORLD_V2_damageWood(o);
AH_OBJECT_ATTACKERS.ah_barrier=o=>AH_WORLD_V2_damageWood(o);
const AH_WORLD_V2_BASE_SECRET=AH_OBJECT_ATTACKERS.ah_secret_statue;
AH_OBJECT_ATTACKERS.ah_secret_statue=o=>{if(!session?.nav||o.broken)return;if(!Number(o.maxHp)||o.maxHp<=0){const ap=Math.max(1,Math.round(effDmg(session.nav.die)));o.maxHp=o.hp=Math.max(4,ap*4);}o.hp=Math.max(0,o.hp-Math.max(1,Math.round(effDmg(session.nav.die))));o.flash=.16;if(o.hp>0)return;o.broken=true;o.brokenAt=performance.now();const chest=AH_ensureWorld()?.objects?.find(v=>v.id==='temple_hidden_sp_chest');if(chest){chest.hidden=false;chest.hp=0;chest.maxHp=0;}};

/* Slate/blue chests are exploration rewards: the Navigator must physically reach them. */
function AH_WORLD_V2_requireProximity(base){return function(o){const n=session?.nav;if(!n||o.hidden)return;const dist=Math.hypot(n.x-o.x,(n.z-o.z)*.86,(n.y-(o.y||0))*.7);if(dist>62)return;return base?.(o);};}
if(typeof AH_OBJECT_ATTACKERS.ah_sp_chest==='function')AH_OBJECT_ATTACKERS.ah_sp_chest=AH_WORLD_V2_requireProximity(AH_OBJECT_ATTACKERS.ah_sp_chest);
if(typeof AH_OBJECT_ATTACKERS.ah_hidden_sp_chest==='function')AH_OBJECT_ATTACKERS.ah_hidden_sp_chest=AH_WORLD_V2_requireProximity(AH_OBJECT_ATTACKERS.ah_hidden_sp_chest);

const AH_WORLD_V2_STYLE_ID='ttdAlHataContinuousWorldV2Style';
if(!document.getElementById(AH_WORLD_V2_STYLE_ID)){const style=document.createElement('style');style.id=AH_WORLD_V2_STYLE_ID;style.textContent=`
#gameScreen.ttd-platform-mode #ttdPlatformHud{justify-content:flex-end!important;}
#gameScreen.ttd-platform-mode #ttdPlatformHud .ttdNavBadge{display:none!important;}
#gameScreen.ttd-platform-mode #ttdPlatformHud .ttdAreaBadge{opacity:.55!important;background:rgba(9,13,24,.46)!important;border-color:rgba(217,178,106,.25)!important;backdrop-filter:blur(2px)!important;}
`;document.head.appendChild(style);}

window.__TTD_AL_HATA_CONTINUOUS_WORLD_V2_API=Object.freeze({
  version:2,contract:AH_WORLD_V2_CONTRACT,
  get active(){return AH_isState();},
  get world(){return AH_isState()?AH_ensureWorld():null;},
  sideAreas:AH_WORLD_V2_SIDE_AREAS,
  platforms:()=>AH_WORLD_V2_platforms().map(p=>({...p})),
  get cameraX(){return Number(AH_ensureWorld()?.cameraX)||0;},
});
