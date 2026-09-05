/* Stage 1B — Goblin Fringe, deep jungle, temple ruins, combat areas 2 and 3. */
AH_ROUTES[2]=[
  {x:2240,z:-205,y:10},{x:2150,z:-85,y:10},{x:2080,z:175,y:10},{x:1970,z:105,y:10},
  {x:1890,z:-165,y:10},{x:1785,z:-90,y:10},{x:1695,z:130,y:10},
];
AH_ROUTES[3]=[
  {x:3490,z:-220,y:20},{x:3390,z:-60,y:20},{x:3300,z:190,y:20},{x:3170,z:115,y:20},
  {x:3070,z:-185,y:20},{x:2945,z:-70,y:20},{x:2845,z:155,y:20},
];
AH_SEGMENT_STARTS.jungle={x:2180,z:0,y:10};
AH_SEGMENT_STARTS.deepJungle={x:3480,z:0,y:24};
const AH_JUNGLE_PROPS=[
  {kind:'tree',x:1710,z:-210,s:1.08},{kind:'tree',x:1790,z:220,s:1.02},{kind:'banyan',x:1870,z:-230,s:1.1},
  {kind:'tree',x:1980,z:235,s:1.15},{kind:'tree',x:2080,z:-215,s:.98},{kind:'banyan',x:2210,z:210,s:1.08},
  {kind:'fern',x:1760,z:130,s:1.0},{kind:'fern',x:1850,z:-140,s:.9},{kind:'broad',x:2030,z:160,s:1.1},
  {kind:'vine',x:1940,z:-190,s:1},{kind:'vine',x:2140,z:180,s:.9},
  {kind:'hut',x:1810,z:145,s:.92},{kind:'hut',x:2060,z:-145,s:.88},{kind:'sign',x:1990,z:20,s:.78},
  {kind:'runeSlab',x:2250,z:-135,s:.9},{kind:'brokenColumn',x:2310,z:185,s:.9},
  {kind:'tree',x:2380,z:-230,s:1.12},{kind:'banyan',x:2480,z:220,s:1.18},{kind:'tree',x:2600,z:-215,s:1.05},
  {kind:'fern',x:2420,z:145,s:1.1},{kind:'broad',x:2530,z:-155,s:1.0},{kind:'vine',x:2690,z:180,s:1.0},
  {kind:'runeSlab',x:2730,z:-100,s:1.05},{kind:'brokenColumn',x:2790,z:135,s:1.15},
  {kind:'tree',x:2870,z:-230,s:1.12},{kind:'banyan',x:3000,z:225,s:1.16},{kind:'tree',x:3130,z:-220,s:1.1},
  {kind:'tree',x:3270,z:225,s:1.13},{kind:'banyan',x:3410,z:-220,s:1.18},{kind:'fern',x:2920,z:155,s:1.1},
  {kind:'runeSlab',x:3040,z:175,s:1.1},{kind:'brokenColumn',x:3230,z:135,s:1.2},{kind:'cave',x:3390,z:-155,s:1.15},
  {kind:'statue',x:3460,z:155,s:1.0},{kind:'vine',x:3350,z:195,s:1.0},
  {kind:'tree',x:3550,z:-230,s:1.2},{kind:'tree',x:3660,z:230,s:1.18},{kind:'runeSlab',x:3740,z:-155,s:1.1},
  {kind:'statue',x:3830,z:165,s:1.0},{kind:'fern',x:3890,z:-185,s:1.1},
];
const AH_JUNGLE_PITS=[{x:2500,z:55,rx:56,rz:48},{x:3650,z:-45,rx:50,rz:44}];
AH_OBJECT_TEMPLATES.push(
  {id:'jungle_barrier_1',type:'ah_barrier',name:'Heavy Goblin Barricade',x:2440,z:0,y:12,hits:5,hp:0,maxHp:0,opened:false,broken:false,hitY:35},
  {id:'jungle_thrower_1',type:'ah_tree_thrower',name:'Tree Goblin Thrower',x:2320,z:-205,y:72,hits:3,hp:0,maxHp:0,opened:false,broken:false,attackCd:1.3,rockT:0,hitY:70},
  {id:'jungle_thrower_2',type:'ah_tree_thrower',name:'Tree Goblin Thrower',x:2710,z:205,y:78,hits:3,hp:0,maxHp:0,opened:false,broken:false,attackCd:1.8,rockT:0,hitY:74},
  {id:'jungle_side_chest',type:'ah_coin_chest',name:'Goblin Stash',x:2540,z:285,y:12,hits:2,hp:0,maxHp:0,opened:false,broken:false},
  {id:'ruin_column_1',type:'ah_ruin_column',name:'Cracked Temple Column',x:3225,z:125,y:20,hits:4,hp:0,maxHp:0,opened:false,broken:false,combatHits:0,hitY:54}
);
function AH_jungleObject(id){return AH_ensureWorld()?.objects.find(o=>o.id===id);}
function AH_junglePlatforms(){return[
  {id:'jungle_main_a',x1:2140,x2:2470,z1:-225,z2:225,y:10,kind:'dirt'},
  {id:'jungle_main_b',x1:2460,x2:2860,z1:-205,z2:205,y:12,kind:'dirt'},
  {id:'jungle_side_neck',x1:2380,x2:2600,z1:190,z2:300,y:12,kind:'dirt'},
  {id:'jungle_side_pocket',x1:2500,x2:2650,z1:245,z2:315,y:12,kind:'dirt'},
  {id:'ruin_ledge',x1:2670,x2:2845,z1:-210,z2:-70,y:28,kind:'rock'},
  {id:'ruin_step',x1:2780,x2:2890,z1:-165,z2:100,y:20,kind:'rock'},
];}
function AH_deepPlatforms(){return[
  {id:'deep_main_a',x1:3440,x2:3660,z1:-220,z2:220,y:24,kind:'dirt'},
  {id:'deep_main_b',x1:3640,x2:3945,z1:-185,z2:185,y:30,kind:'dirt'},
  {id:'deep_ruin_step',x1:3540,x2:3670,z1:120,z2:255,y:52,kind:'rock'},
  {id:'deep_side',x1:3750,x2:3910,z1:-285,z2:-145,y:38,kind:'rock'},
];}
AH_SEGMENT_PLATFORMS.jungle=AH_junglePlatforms;AH_SEGMENT_PLATFORMS.deepJungle=AH_deepPlatforms;

function AH_jungleBackdrop(g,w,h,cameraX,deep=0){
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,deep?'#244f48':'#39766a');sky.addColorStop(.45,deep?'#496f5b':'#6e9b73');sky.addColorStop(1,'#b5a978');g.fillStyle=sky;g.fillRect(0,0,w,h);
  const horizon=h*.34;g.save();g.globalAlpha=.42;g.fillStyle='#163d2d';for(let i=0;i<13;i++){const x=((i*83-cameraX*.07)%(w+150)+w+150)%(w+150)-75,hh=80+(i%4)*22;g.fillRect(x-6,horizon-hh,12,hh+130);g.beginPath();g.arc(x,horizon-hh,34+(i%3)*8,0,AH_TAU);g.fill();}g.restore();
  g.save();g.globalAlpha=.24+.16*deep;g.fillStyle='#102e25';for(let i=0;i<9;i++){const x=((i*127-cameraX*.13)%(w+200)+w+200)%(w+200)-100;g.beginPath();g.arc(x,horizon-18-(i%2)*20,48+(i%3)*12,0,AH_TAU);g.fill();}g.restore();
  if(deep>.35){g.save();g.globalAlpha=.16+.2*deep;g.fillStyle='#5d6556';for(let i=0;i<4;i++){const x=w*(.18+i*.22);g.fillRect(x,horizon-75-(i%2)*18,34,120);g.fillRect(x-12,horizon-78-(i%2)*18,58,12);}g.restore();}
  const mist=g.createLinearGradient(0,h*.42,0,h);mist.addColorStop(0,'rgba(221,225,182,.05)');mist.addColorStop(1,'rgba(13,31,25,.26)');g.fillStyle=mist;g.fillRect(0,h*.42,w,h*.58);
  g.save();g.globalAlpha=.10;g.fillStyle='#f3e4b0';for(let i=0;i<3;i++){g.beginPath();g.moveTo(w*(.18+i*.31),0);g.lineTo(w*(.28+i*.31),h*.72);g.lineTo(w*(.38+i*.31),h*.72);g.closePath();g.fill();}g.restore();
}
function AH_drawJungleTree(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{g.fillStyle='#4c3d2b';if(p.kind==='banyan'){g.beginPath();g.moveTo(-15,4);g.quadraticCurveTo(-28,-55,-12,-112);g.lineTo(14,-112);g.quadraticCurveTo(28,-50,17,4);g.fill();g.strokeStyle='#6b5a3c';g.lineWidth=5;for(const x of [-20,0,20]){g.beginPath();g.moveTo(x,-70);g.quadraticCurveTo(x-8,-25,x-15,5);g.stroke();}}else g.fillRect(-9,-105,18,109);g.fillStyle=p.kind==='banyan'?'#275636':'#2d603b';for(const [x,y,r] of [[0,-116,42],[-30,-94,31],[31,-92,34],[4,-75,35]]){g.beginPath();g.arc(x,y,r,0,AH_TAU);g.fill();}g.fillStyle='rgba(93,143,69,.42)';g.beginPath();g.arc(-12,-124,18,0,AH_TAU);g.fill();});}
function AH_drawJungleSmall(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{if(p.kind==='fern'||p.kind==='broad'){g.fillStyle=p.kind==='fern'?'#3e7142':'#4a7c4b';for(let i=0;i<7;i++){g.save();g.rotate(-1.3+i*.43);g.beginPath();g.ellipse(0,-24,7,27,0,0,AH_TAU);g.fill();g.restore();}}else if(p.kind==='vine'){g.strokeStyle='#466c3e';g.lineWidth=4;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(i*8,-105);g.bezierCurveTo(i*12,-65,-i*9,-40,i*4,2);g.stroke();}}});}
function AH_drawRuin(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{if(p.kind==='runeSlab'){g.fillStyle='#747667';g.beginPath();g.moveTo(-30,0);g.lineTo(-26,-52);g.lineTo(28,-58);g.lineTo(32,0);g.closePath();g.fill();g.strokeStyle='#b5a978';g.lineWidth=2;g.beginPath();g.moveTo(-12,-38);g.lineTo(2,-48);g.lineTo(15,-31);g.lineTo(4,-16);g.lineTo(-14,-24);g.stroke();}else if(p.kind==='brokenColumn'){g.fillStyle='#77766a';g.save();g.rotate(-.38);g.fillRect(-14,-66,28,72);g.fillStyle='#929080';g.fillRect(-21,-69,42,9);g.restore();}else if(p.kind==='statue'){g.fillStyle='#73786b';g.fillRect(-16,-58,32,58);g.beginPath();g.arc(0,-72,17,0,AH_TAU);g.fill();g.fillStyle='#53624e';g.fillRect(-19,-36,8,28);}else if(p.kind==='cave'){g.fillStyle='#39433a';g.beginPath();g.ellipse(0,-34,54,45,0,Math.PI,AH_TAU);g.lineTo(54,8);g.lineTo(-54,8);g.closePath();g.fill();g.fillStyle='#142018';g.beginPath();g.ellipse(0,-25,33,34,0,Math.PI,AH_TAU);g.lineTo(33,8);g.lineTo(-33,8);g.closePath();g.fill();}});}
function AH_drawCampProp(g,p,projector){if(p.kind==='hut')AH_drawHut(g,{...p,kind:'goblinHut'},projector);else if(p.kind==='sign')AH_drawSign(g,{...p,kind:'goblinSign'},projector);}
function AH_drawJungleProp(g,p,projector){if(p.kind==='tree'||p.kind==='banyan')AH_drawJungleTree(g,p,projector);else if(['fern','broad','vine'].includes(p.kind))AH_drawJungleSmall(g,p,projector);else if(['runeSlab','brokenColumn','statue','cave'].includes(p.kind))AH_drawRuin(g,p,projector);else AH_drawCampProp(g,p,projector);}
function AH_drawTreeThrower(g,o,projector){if(o.broken)return;AH_at(g,o.x,o.z,o.y||70,1,projector,()=>{g.fillStyle='#6c4c2f';g.fillRect(-31,-5,62,8);g.strokeStyle='#4e3927';g.lineWidth=5;g.beginPath();g.moveTo(-25,2);g.lineTo(-34,28);g.moveTo(25,2);g.lineTo(34,28);g.stroke();g.fillStyle='#718c48';g.beginPath();g.arc(0,-22,16,0,AH_TAU);g.fill();g.fillStyle='#35462e';g.beginPath();g.moveTo(-12,-35);g.lineTo(-2,-48);g.lineTo(2,-34);g.lineTo(13,-47);g.lineTo(12,-29);g.fill();g.fillStyle='#c5b16c';g.beginPath();g.arc(15,-10,6,0,AH_TAU);g.fill();});}
function AH_drawRuinColumnObject(g,o,projector){AH_at(g,o.x,o.z,o.y||20,1,projector,()=>{g.save();if(o.broken)g.rotate(-1.15);g.fillStyle=o.flash?'#aaa596':'#7c7b6e';g.fillRect(-14,-88,28,90);g.fillStyle='#999789';g.fillRect(-22,-93,44,10);g.strokeStyle='#4a4b45';g.lineWidth=2;g.beginPath();g.moveTo(-5,-72);g.lineTo(6,-54);g.lineTo(-4,-35);g.lineTo(8,-16);g.stroke();g.restore();});}
function AH_drawJungleObject(g,o,projector){if(o.type==='ah_tree_thrower')AH_drawTreeThrower(g,o,projector);else if(o.type==='ah_ruin_column')AH_drawRuinColumnObject(g,o,projector);else AH_drawBeachObject(g,o,projector);}
function AH_startRock(o,n){o.rockT=.58;o.rockDuration=.58;o.rockTarget={x:n.x,z:n.z,y:n.y+22};o.attackCd=2.0+Math.random()*.7;}
function AH_updateThrowers(dt,n,prefix){for(const o of session.objects){if(o.type!=='ah_tree_thrower'||o.broken||!o.id.startsWith(prefix))continue;o.attackCd-=dt;if(o.rockT>0){o.rockT-=dt;if(o.rockT<=0){const t=o.rockTarget,miss=Math.hypot(n.x-t.x,(n.z-t.z)*.8);if(miss<48)navigatorDamage(Math.max(3,n.die.maxHp*.065),'Rock from tree goblin');else floatTextAtNav('MISS','#b9e2ff');o.rockTarget=null;}}else if(o.attackCd<=0&&Math.abs(n.x-o.x)<430)AH_startRock(o,n);}}
function AH_drawThrowerRocks(g,projector){for(const o of session.objects){if(o.type!=='ah_tree_thrower'||!o.rockTarget||o.rockT<=0)continue;const u=1-o.rockT/o.rockDuration,a=projector(o.x,o.z,(o.y||70)+5),b=projector(o.rockTarget.x,o.rockTarget.z,o.rockTarget.y),x=AH_lerp(a.x,b.x,u),y=AH_lerp(a.y,b.y,u)-Math.sin(u*Math.PI)*42;g.fillStyle='#77736a';g.beginPath();g.arc(x,y,7*AH_lerp(a.scale,b.scale,u),0,AH_TAU);g.fill();}}
AH_OBJECT_ATTACKERS.ah_tree_thrower=o=>AH_damageObject(o,()=>{o.broken=true;o.rockT=0;floatObjectText(o,'THROWER FLED!');AH_spawnCoins(o,3);});
AH_OBJECT_ATTACKERS.ah_ruin_column=o=>AH_damageObject(o,()=>{o.broken=true;floatObjectText(o,'COLUMN DOWN');AH_spawnCoins(o,2);});
AH_OBJECT_HIT_RADII.ah_tree_thrower=42;AH_OBJECT_HIT_RADII.ah_ruin_column=46;

function AH_inPit(n,p){return Math.abs(n.x-p.x)<p.rx&&Math.abs(n.z-p.z)<p.rz;}
function AH_jungleMovement(dt,deep=false){
  const n=session.nav;if(!n)return;n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);AH_updateThrowers(dt,n,deep?'deep_':'jungle_');const inp=inputVector(),speed=deep?165:170;let nx=n.x+inp.x*speed*dt,nz=AH_clamp(n.z+inp.z*speed*dt,-310,310);
  const barrier=AH_jungleObject('jungle_barrier_1');if(!deep&&barrier&&!barrier.broken&&Math.abs(nx-barrier.x)<38&&Math.abs(nz)<235)nx=n.x;const cg=groundAt(n.x,n.z,session.time),tg=groundAt(nx,nz,session.time);if(n.onGround&&tg&&cg&&tg.y-cg.y>42){nx=n.x;nz=n.z;}n.x=nx;n.z=nz;n.vy-=650*dt;n.y+=n.vy*dt;const ground=groundAt(n.x,n.z,session.time);if(ground&&n.vy<=0&&n.y<=ground.y+3){n.y=ground.y;n.vy=0;n.onGround=true;n.jumps=0;}else n.onGround=false;
  if(n.y<-150){navigatorDamage(Math.max(8,n.die.maxHp*.18),'Navigator fell');if(session?.nav){const cp=session.checkpoint;n.x=cp.x;n.z=cp.z;n.y=cp.y;n.vy=0;}}
  const pit=AH_JUNGLE_PITS.find(p=>AH_inPit(n,p));session.hazardCd=Math.max(0,session.hazardCd-dt);if(pit&&session.hazardCd<=0){session.hazardCd=2;navigatorDamage(Math.max(5,n.die.maxHp*.10),'Goblin pitfall');if(session?.nav){const cp=session.checkpoint;n.x=cp.x;n.z=cp.z;n.y=cp.y;n.vy=0;}}
  collectNearbyDrops();if(!deep){if(n.x>2570)session.checkpoint={x:2560,z:0,y:12};if(n.x>2830){const w=AH_ensureWorld();w.checkpoint={x:2890,z:0,y:20};AH_finishTraversalToCombat(3,7,'Deep Jungle Ruins');return;}}
  else{if(n.x>3720)session.checkpoint={x:3710,z:0,y:30};if(n.x>3925){const w=AH_ensureWorld();w.cameraX=4020;w.checkpoint={x:3970,z:0,y:34};if(typeof AH_beginFork==='function'){session.active=false;leavePlatformLayout(true);restoreTrayChildren();session=null;AH_beginFork();}else toast('The jungle path forks ahead.');return;}}
  session.cameraX+=((n.x+145)-session.cameraX)*Math.min(1,dt*2.8);const w=AH_ensureWorld();w.cameraX=session.cameraX;w.checkpoint={...session.checkpoint};w.objects=session.objects;w.drops=session.drops;
}
AH_SEGMENT_UPDATERS.jungle=dt=>AH_jungleMovement(dt,false);AH_SEGMENT_UPDATERS.deepJungle=dt=>AH_jungleMovement(dt,true);
function AH_drawPit(g,p,projector){const q=projector(p.x,p.z,12);g.save();g.translate(q.x,q.y);g.scale(q.scale,q.scale);g.fillStyle='#18231b';g.beginPath();g.ellipse(0,0,p.rx*.78,p.rz*.35,0,0,AH_TAU);g.fill();g.strokeStyle='#647047';g.lineWidth=5;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(i*12-5,-8);g.lineTo(i*12+7,8);g.stroke();}g.restore();}
function AH_drawJungleTraversal(deep=false){
  const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return;if(!resizePlatformCanvas())throw new Error('Al Hata jungle canvas has no usable size.');const g=c.getContext('2d');g.clearRect(0,0,session.w,session.h);AH_jungleBackdrop(g,session.w,session.h,session.cameraX,deep?1:.35);const plats=deep?AH_deepPlatforms():AH_junglePlatforms();plats.sort((a,b)=>a.z1-b.z1).forEach(p=>AH_ground(g,p,AH_project));
  for(const pit of AH_JUNGLE_PITS)if((deep&&pit.x>3400)||(!deep&&pit.x<3000))AH_drawPit(g,pit,AH_project);const min=deep?3400:2100,max=deep?4000:2900,items=[];for(const p of AH_JUNGLE_PROPS)if(p.x>=min&&p.x<=max)items.push({z:p.z,draw:()=>AH_drawJungleProp(g,p,AH_project)});for(const o of session.objects)if(o.x>=min&&o.x<=max)items.push({z:o.z,draw:()=>AH_drawJungleObject(g,o,AH_project)});if(session.nav)items.push({z:session.nav.z,draw:()=>drawNavigator(g)});items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw());AH_drawThrowerRocks(g,AH_project);
  g.save();g.globalAlpha=.90;g.fillStyle='#173c29';for(let i=0;i<8;i++){const x=i%2?session.w-7:7,y=session.h*.18+i*43;g.beginPath();g.ellipse(x,y,18,58,(i%2?-1:1)*.58,0,AH_TAU);g.fill();}g.restore();const hud=document.getElementById('ttdPlatformHud');if(hud){const a=hud.querySelector('.ttdAreaBadge');if(a)a.textContent=deep?'TEMPLE RUIN TRAIL':'GOBLIN JUNGLE';}
}
AH_SEGMENT_DRAWERS.jungle=()=>AH_drawJungleTraversal(false);AH_SEGMENT_DRAWERS.deepJungle=()=>AH_drawJungleTraversal(true);

function AH_drawJungleCombat(area,{back,front,spec}){
  const deep=area===3?1:.4,proj=(x,z,y=0)=>AH_projectWorld(x,z,y,back.w,back.h,spec.cameraX);AH_jungleBackdrop(back.g,back.w,back.h,spec.cameraX,deep);AH_drawRouteRibbon(back.g,back.w,back.h,area,spec.cameraX,'rgba(78,67,42,.24)');
  const range=area===2?[1650,2290]:[2820,3520];for(const p of AH_JUNGLE_PROPS)if(p.x>=range[0]&&p.x<=range[1]&&p.z<120)AH_drawJungleProp(back.g,p,proj);for(const o of AH_ensureWorld()?.objects||[])if(o.x>=range[0]&&o.x<=range[1]&&o.z<120)AH_drawJungleObject(back.g,o,proj);
  const fp=(x,z,y=0)=>AH_projectWorld(x,z,y,front.w,front.h,spec.cameraX);for(const p of AH_JUNGLE_PROPS)if(p.x>=range[0]&&p.x<=range[1]&&p.z>=120)AH_drawJungleProp(front.g,p,fp);for(const o of AH_ensureWorld()?.objects||[])if(o.x>=range[0]&&o.x<=range[1]&&o.z>=120)AH_drawJungleObject(front.g,o,fp);
}
AH_COMBAT_DRAWERS[2]=ctx=>AH_drawJungleCombat(2,ctx);AH_COMBAT_DRAWERS[3]=ctx=>AH_drawJungleCombat(3,ctx);

const AH_jungleBaseBuildWave=buildAdventureWave;
buildAdventureWave=function AH_buildAdventureWave(stage,wave,diff){const q=AH_jungleBaseBuildWave(stage,wave,diff);if(stage===AH_STAGE){const fractions={5:[.34],8:[.32],9:[.46,.54],10:[.28,.48]}[wave];if(fractions){for(let i=0;i<fractions.length&&i<q.length;i++){const idx=Math.max(0,q.length-1-i);q[idx].__ahEntryFraction=fractions[i];q[idx].__ahEntryKind=wave===10&&i===0?'cave':'foliage';}}}return q;};
const AH_jungleBaseSpawnEnemy=spawnAdventureEnemy;
spawnAdventureEnemy=function AH_spawnAdventureEnemy(entry){const before=state?.enemies?.length||0;AH_jungleBaseSpawnEnemy(entry);if(AH_isState()&&entry?.__ahEntryFraction&&state.enemies.length>before){const e=state.enemies[state.enemies.length-1];e.dist=Math.max(0,totalLen*entry.__ahEntryFraction);e.__ttdAhEntryKind=entry.__ahEntryKind;e.hitFlash=.20;}};

const AH_jungleLane=document.getElementById('laneWrap');
AH_jungleLane?.addEventListener('pointerdown',event=>{
  if(!AH_isState()||Number(state.__ttdAlHataCombatArea)!==3||document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode'))return;const col=AH_jungleObject('ruin_column_1');if(!col||col.broken)return;const r=AH_jungleLane.getBoundingClientRect(),p=AH_projectWorld(col.x,col.z,70,r.width,r.height,AH_AREAS[3].cameraX),px=event.clientX-r.left,py=event.clientY-r.top;if(Math.hypot(px-p.x,py-p.y)>50)return;event.preventDefault();col.combatHits=(col.combatHits||0)+1;col.flash=.18;toast(`Cracked temple column · ${Math.min(col.combatHits,4)}/4 hits`);if(col.combatHits<4)return;col.broken=true;for(const e of state.enemies||[]){if(!e?.alive)continue;try{const ep=posAtDistance(e.dist);if(Math.hypot(ep.x-p.x,ep.y-p.y)<135)e.hp=Math.max(0,Number(e.hp||0)-Math.max(12,Number(e.maxHp||e.hp||30)*.32));}catch(_){}}toast('The old column crashes across the marching route!');
},true);
AH_AFTER_COMBAT[6]=()=>{const w=AH_ensureWorld();w.cameraX=2230;w.checkpoint={x:2180,z:0,y:10};AH_beginTraversal('jungle');};
AH_AFTER_COMBAT[10]=()=>{const w=AH_ensureWorld();w.cameraX=3520;w.checkpoint={x:3480,z:0,y:24};AH_beginTraversal('deepJungle');};
