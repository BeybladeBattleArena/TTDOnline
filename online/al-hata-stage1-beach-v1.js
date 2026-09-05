/* Stage 1A — Landing Shore / beach exploration / first 3-wave combat clearing. */
AH_ROUTES[1]=[
  {x:900,z:-210,y:0},{x:810,z:-145,y:0},{x:745,z:70,y:0},{x:650,z:175,y:0},
  {x:555,z:85,y:0},{x:475,z:-105,y:0},{x:385,z:-165,y:0},{x:300,z:25,y:0},
];
AH_SEGMENT_STARTS.beach={x:720,z:0,y:0};
const AH_BEACH_PROPS=[
  {kind:'boat',x:205,z:-235,s:1.05},
  {kind:'palm',x:110,z:145,s:1.00,lean:-.13},{kind:'palm',x:360,z:-190,s:.92,lean:.08},
  {kind:'palm',x:790,z:-165,s:.95,lean:.11},{kind:'palm',x:1020,z:205,s:1.04,lean:-.10},
  {kind:'palm',x:1280,z:-175,s:1.08,lean:.07},{kind:'palm',x:1490,z:165,s:.98,lean:-.08},
  {kind:'boulder',x:650,z:-5,s:1.18},{kind:'boulder',x:920,z:205,s:.86},{kind:'rocks',x:285,z:205,s:.9},
  {kind:'rocks',x:1120,z:-220,s:1.0},{kind:'drift',x:445,z:235,s:.9},
  {kind:'grass',x:300,z:130,s:1},{kind:'grass',x:720,z:220,s:1.1},{kind:'grass',x:880,z:-215,s:.9},
  {kind:'broadleaf',x:1180,z:190,s:.9},{kind:'broadleaf',x:1370,z:-175,s:1.0},{kind:'vinepatch',x:1550,z:160,s:1},
  {kind:'goblinSign',x:1085,z:-120,s:.9},{kind:'goblinHut',x:1380,z:160,s:.92},{kind:'goblinSign',x:1470,z:35,s:.82},
];
AH_OBJECT_TEMPLATES.push(
  {id:'beach_coconut_1',type:'ah_coconut_tree',name:'Coconut Palm',x:535,z:155,y:0,hits:3,hp:0,maxHp:0,coconuts:2,shake:0,triggered:false,opened:false,broken:false,hitY:66},
  {id:'beach_coin_chest',type:'ah_coin_chest',name:'Washed-Up Chest',x:940,z:-245,y:22,hits:2,hp:0,maxHp:0,opened:false,broken:false},
  {id:'beach_push_crate',type:'ah_push_crate',name:'Goblin Crate',x:1180,z:125,y:0,hits:4,hp:0,maxHp:0,opened:false,broken:false,pushable:true},
  {id:'beach_sp_chest',type:'ah_sp_chest',name:'Treetop Supply Chest',x:1330,z:182,y:118,hits:2,hp:0,maxHp:0,opened:false,broken:false,sp:25},
  {id:'beach_shell',type:'ah_shell',name:'Pearlescent Island Shell',x:760,z:-250,y:1,hits:1,hp:1,maxHp:1,opened:false,broken:false,collected:false},
  {id:'beach_barrier',type:'ah_barrier',name:'Goblin Barricade',x:1570,z:0,y:0,hits:5,hp:0,maxHp:0,opened:false,broken:false,hitY:35}
);
function AH_beachObject(id){return AH_ensureWorld()?.objects.find(o=>o.id===id);}
function AH_beachPlatforms(){
  const out=[
    {id:'beach_main',x1:650,x2:1710,z1:-315,z2:315,y:0,kind:'sand'},
    {id:'beach_rock_ledge',x1:865,x2:1005,z1:-295,z2:-205,y:22,kind:'rock'},
    {id:'hut_step',x1:1325,x2:1435,z1:110,z2:230,y:28,kind:'wood'},
    {id:'treetop_secret',x1:1260,x2:1415,z1:125,z2:245,y:118,kind:'canopy'},
    {id:'jungle_threshold',x1:1630,x2:1800,z1:-265,z2:265,y:8,kind:'dirt'},
  ];
  const crate=AH_beachObject('beach_push_crate');if(crate&&!crate.broken)out.push({id:'push_crate_top',x1:crate.x-28,x2:crate.x+28,z1:crate.z-28,z2:crate.z+28,y:42,kind:'crate'});
  return out;
}
AH_SEGMENT_PLATFORMS.beach=AH_beachPlatforms;

function AH_beachSky(g,w,h,cameraX){
  const jungle=AH_clamp((cameraX-1280)/520,0,1),sky=g.createLinearGradient(0,0,0,h*.72);
  sky.addColorStop(0,jungle?'#68a5ae':'#68b6d2');sky.addColorStop(.48,'#9fd4dd');sky.addColorStop(1,'#f2d8a6');g.fillStyle=sky;g.fillRect(0,0,w,h);
  const sun=g.createRadialGradient(w*.77,h*.13,2,w*.77,h*.13,h*.18);sun.addColorStop(0,'rgba(255,246,198,.88)');sun.addColorStop(1,'rgba(255,246,198,0)');g.fillStyle=sun;g.fillRect(0,0,w,h*.45);
  const horizon=h*.31,seaAlpha=1-jungle*.88;g.save();g.globalAlpha=seaAlpha;const sea=g.createLinearGradient(0,horizon,0,h*.64);sea.addColorStop(0,'#75c8d0');sea.addColorStop(.62,'#42a5b6');sea.addColorStop(1,'#287e99');g.fillStyle=sea;g.fillRect(0,horizon,w,h*.38);
  g.fillStyle='rgba(39,82,95,.40)';for(let i=0;i<5;i++){const x=((i*173-cameraX*.055)%(w+220)+w+220)%(w+220)-110,wide=66+(i%3)*20,peak=horizon-18-(i%2)*13;g.beginPath();g.moveTo(x-wide*.5,horizon+5);g.quadraticCurveTo(x-wide*.15,peak,x,peak-7);g.quadraticCurveTo(x+wide*.28,peak+4,x+wide*.55,horizon+5);g.closePath();g.fill();}
  g.strokeStyle='rgba(245,253,244,.52)';g.lineWidth=1.2;for(let i=0;i<6;i++){const y=horizon+15+i*17;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w+24;x+=24)g.lineTo(x,y+Math.sin((x+cameraX*.08+i*21)/31)*1.8);g.stroke();}g.restore();
  const shore=h*.585;g.fillStyle='#dcc28a';g.beginPath();g.moveTo(0,shore-10);for(let x=0;x<=w+30;x+=30)g.lineTo(x,shore+Math.sin((x+cameraX*.06)/48)*5);g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.fill();
  g.strokeStyle='rgba(255,250,220,.72)';g.lineWidth=3;g.beginPath();g.moveTo(0,shore-4);for(let x=0;x<=w+24;x+=24)g.lineTo(x,shore+Math.sin((x+cameraX*.07)/40)*4);g.stroke();
  if(jungle>0){g.save();g.globalAlpha=.55*jungle;g.fillStyle='#214a32';for(let i=0;i<9;i++){const x=(i*97-cameraX*.07)%(w+160)-80;g.beginPath();g.arc(x,h*.37,36+(i%3)*10,0,AH_TAU);g.fill();g.fillRect(x-7,h*.35,14,h*.30);}g.restore();}
}
function AH_ground(g,p,projector){
  const q=[projector(p.x1,p.z1,p.y),projector(p.x2,p.z1,p.y),projector(p.x2,p.z2,p.y),projector(p.x1,p.z2,p.y)],pal={sand:['#d7bb7a','#efd99f'],rock:['#756d5e','#a49a82'],wood:['#6a4930','#9a6b43'],canopy:['#365b35','#5c844a'],dirt:['#6f7048','#91945f'],crate:['#765137','#a8754b']}[p.kind]||['#756d5e','#99907c'];
  const side=q.map(v=>({x:v.x,y:v.y+13}));g.fillStyle=pal[0];g.beginPath();g.moveTo(q[3].x,q[3].y);g.lineTo(q[2].x,q[2].y);g.lineTo(side[2].x,side[2].y);g.lineTo(side[3].x,side[3].y);g.closePath();g.fill();const grad=g.createLinearGradient(0,Math.min(...q.map(v=>v.y)),0,Math.max(...q.map(v=>v.y))+80);grad.addColorStop(0,pal[1]);grad.addColorStop(1,pal[0]);g.fillStyle=grad;g.beginPath();g.moveTo(q[0].x,q[0].y);for(let i=1;i<4;i++)g.lineTo(q[i].x,q[i].y);g.closePath();g.fill();g.strokeStyle='rgba(255,245,207,.14)';g.stroke();
}
function AH_at(g,x,z,y,s,projector,draw){const p=projector(x,z,y||0);g.save();g.translate(p.x,p.y);g.scale(p.scale*(s||1),p.scale*(s||1));draw();g.restore();}
function AH_drawPalm(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{g.rotate(p.lean||0);g.strokeStyle='#665039';g.lineWidth=9;g.lineCap='round';g.beginPath();g.moveTo(0,8);g.quadraticCurveTo(-5,-48,8,-112);g.stroke();g.translate(8,-112);for(let i=0;i<8;i++){const a=-Math.PI*.94+i*(Math.PI*1.88/7),len=52+(i%2)*9;g.strokeStyle=['#2f6a45','#3f8050','#347246'][i%3];g.lineWidth=11;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(Math.cos(a)*len*.52,Math.sin(a)*len*.30,Math.cos(a)*len,Math.sin(a)*len*.62);g.stroke();}});}
function AH_drawBoat(g,p,projector){AH_at(g,p.x,p.z,2,p.s,projector,()=>{g.fillStyle='#6d442c';g.beginPath();g.moveTo(-55,-8);g.lineTo(48,-8);g.lineTo(33,18);g.lineTo(-38,18);g.closePath();g.fill();g.fillStyle='#9a6a43';g.fillRect(-43,-17,78,9);g.strokeStyle='#4d3426';g.lineWidth=4;g.beginPath();g.moveTo(-7,-13);g.lineTo(-7,-77);g.stroke();g.fillStyle='#eee2c7';g.beginPath();g.moveTo(-3,-72);g.lineTo(35,-48);g.lineTo(-3,-24);g.closePath();g.fill();});}
function AH_drawBoulder(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{g.fillStyle='#777264';g.beginPath();g.ellipse(0,-18,38,28,-.1,0,AH_TAU);g.fill();g.fillStyle='#97927f';g.beginPath();g.ellipse(-8,-27,22,12,-.2,0,AH_TAU);g.fill();});}
function AH_drawPlant(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{if(p.kind==='grass'){g.strokeStyle='#597645';g.lineWidth=4;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(i*3,0);g.quadraticCurveTo(i*5,-14-Math.abs(i)*2,i*8,-27-Math.abs(i));g.stroke();}}else{g.fillStyle=p.kind==='broadleaf'?'#3e7649':'#497248';for(let i=0;i<6;i++){g.save();g.rotate(-1.1+i*.42);g.beginPath();g.ellipse(0,-19,8,22,0,0,AH_TAU);g.fill();g.restore();}}});}
function AH_drawSign(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{g.strokeStyle='#5c3c25';g.lineWidth=7;g.beginPath();g.moveTo(0,8);g.lineTo(0,-53);g.stroke();g.fillStyle='#8c633c';g.fillRect(-28,-65,57,35);g.strokeStyle='#2c211c';g.lineWidth=2.5;g.strokeRect(-10,-57,20,20);g.beginPath();g.moveTo(-17,-61);g.lineTo(17,-34);g.moveTo(17,-61);g.lineTo(-17,-34);g.stroke();});}
function AH_drawHut(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{g.fillStyle='#6b5035';g.fillRect(-37,-53,74,55);g.fillStyle='#9a7a46';g.beginPath();g.moveTo(-48,-52);g.lineTo(0,-89);g.lineTo(48,-52);g.closePath();g.fill();g.strokeStyle='#5d452c';g.lineWidth=4;for(let x=-40;x<=40;x+=12){g.beginPath();g.moveTo(x,-52);g.lineTo(x+35,-78);g.stroke();}g.fillStyle='#2f241d';g.fillRect(-10,-30,22,32);});}
function AH_drawBeachProp(g,p,projector){if(p.kind==='palm')AH_drawPalm(g,p,projector);else if(p.kind==='boat')AH_drawBoat(g,p,projector);else if(p.kind==='boulder'||p.kind==='rocks'||p.kind==='drift')AH_drawBoulder(g,p,projector);else if(['grass','broadleaf','vinepatch'].includes(p.kind))AH_drawPlant(g,p,projector);else if(p.kind==='goblinSign')AH_drawSign(g,p,projector);else if(p.kind==='goblinHut')AH_drawHut(g,p,projector);}
function AH_drawChest(g,o,projector){if(o.opened)return;AH_at(g,o.x,o.z,o.y||0,1,projector,()=>{g.fillStyle=o.type==='ah_sp_chest'?'#526d88':'#72502f';g.fillRect(-24,-22,48,25);g.fillStyle='#3d2c22';g.fillRect(-26,3,52,22);g.strokeStyle=o.type==='ah_sp_chest'?'#b9e2ff':'#e7bd67';g.lineWidth=2;g.strokeRect(-24,-22,48,47);g.fillStyle='#f1d17b';g.fillRect(-4,-1,8,11);});}
function AH_drawCrate(g,o,projector){if(o.broken)return;AH_at(g,o.x,o.z,0,1,projector,()=>{g.fillStyle=o.flash?'#b48255':'#8a5e3d';g.fillRect(-28,-42,56,42);g.strokeStyle='#563823';g.lineWidth=4;g.strokeRect(-28,-42,56,42);g.beginPath();g.moveTo(-26,-39);g.lineTo(26,-3);g.moveTo(26,-39);g.lineTo(-26,-3);g.stroke();});}
function AH_drawBarrier(g,o,projector){if(o.broken)return;AH_at(g,o.x,o.z,0,1,projector,()=>{g.strokeStyle=o.flash?'#c99a61':'#765032';g.lineWidth=10;for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(-4+i*18,4);g.lineTo(-1+i*18,-62-(i%2)*8);g.stroke();}g.lineWidth=7;g.beginPath();g.moveTo(-55,-39);g.lineTo(54,-29);g.moveTo(-53,-12);g.lineTo(50,-18);g.stroke();});}
function AH_drawShell(g,o,projector){if(o.collected||o.opened)return;AH_at(g,o.x,o.z,2,1,projector,()=>{const grd=g.createRadialGradient(-4,-5,1,0,0,16);grd.addColorStop(0,'#eefcff');grd.addColorStop(.42,'#b9ddec');grd.addColorStop(1,'#789fc4');g.fillStyle=grd;g.beginPath();g.moveTo(-15,0);g.quadraticCurveTo(-10,-18,0,-20);g.quadraticCurveTo(11,-17,16,0);g.quadraticCurveTo(0,9,-15,0);g.fill();g.strokeStyle='rgba(255,255,255,.7)';for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(0,-1);g.lineTo(i*6,-15+Math.abs(i)*2);g.stroke();}});}
function AH_drawCoconutTree(g,o,projector){AH_drawPalm(g,{kind:'palm',x:o.x,z:o.z,s:1.08,lean:-.06},projector);if(o.triggered)return;AH_at(g,o.x,o.z,0,1.08,projector,()=>{const sh=Math.sin((o.shake||0)*42)*Math.min(5,(o.shake||0)*10);g.translate(8+sh,-105);for(let i=0;i<o.coconuts;i++){g.fillStyle='#7b5b35';g.beginPath();g.arc(-7+i*16,8+(i%2)*3,8,0,AH_TAU);g.fill();}});}
function AH_drawBeachObject(g,o,projector){if(o.type==='ah_coconut_tree')AH_drawCoconutTree(g,o,projector);else if(o.type==='ah_push_crate')AH_drawCrate(g,o,projector);else if(o.type==='ah_barrier')AH_drawBarrier(g,o,projector);else if(o.type==='ah_shell')AH_drawShell(g,o,projector);else if(o.type==='ah_coin_chest'||o.type==='ah_sp_chest')AH_drawChest(g,o,projector);}
function AH_spawnCoins(o,count=4){for(let i=0;i<count;i++)session.drops.push({kind:'coin',value:2+Math.floor(Math.random()*5),x:o.x+(i-(count-1)/2)*20,z:o.z+(i%2?18:-18),baseY:(o.y||0)+8,y:(o.y||0)+8,t:0,bounceT:.9,collected:false,isGold:i===count-1});}
function AH_damageObject(o,done){const n=session.nav,dmg=Math.max(1,Math.round(effDmg(n.die)));o.hp=Math.max(0,o.hp-dmg);o.flash=.18;floatObjectText(o,`-${dmg}`);if(o.hp<=0)done?.();}
AH_OBJECT_ATTACKERS.ah_shell=o=>{if(o.collected)return;o.collected=o.opened=true;const w=AH_ensureWorld();w.shells=(w.shells||0)+1;state.__ttdAlHataRewards.shells=(state.__ttdAlHataRewards.shells||0)+1;floatObjectText(o,'PEARLESCENT SHELL');toast('Pearlescent Island Shell found · secured for Stage rewards');};
AH_OBJECT_ATTACKERS.ah_coin_chest=o=>AH_damageObject(o,()=>{o.opened=true;AH_spawnCoins(o,5);});
AH_OBJECT_ATTACKERS.ah_sp_chest=o=>AH_damageObject(o,()=>{o.opened=true;const sp=Number(o.sp)||25;state.sp=(Number(state.sp)||0)+sp;state.__ttdAlHataRewards.bonusSp=(state.__ttdAlHataRewards.bonusSp||0)+sp;renderHUD();floatObjectText(o,`+${sp} SP`);toast(`Treetop cache · +${sp} SP`);});
AH_OBJECT_ATTACKERS.ah_push_crate=o=>AH_damageObject(o,()=>{o.broken=true;AH_spawnCoins(o,3);floatObjectText(o,'CRATE BROKEN');});
AH_OBJECT_ATTACKERS.ah_barrier=o=>AH_damageObject(o,()=>{o.broken=true;session.checkpoint={x:1585,z:0,y:8};floatObjectText(o,'BARRIER SMASHED');});
AH_OBJECT_ATTACKERS.ah_coconut_tree=o=>AH_damageObject(o,()=>{o.triggered=o.opened=true;floatObjectText(o,'COCONUTS LOOSE!');AH_spawnCoins(o,2);});
AH_OBJECT_HIT_RADII.ah_coconut_tree=48;AH_OBJECT_HIT_RADII.ah_barrier=45;AH_OBJECT_HIT_RADII.ah_shell=30;

function AH_beachUpdater(dt){
  const n=session.nav;if(!n)return;n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);for(const o of session.objects)if(o.shake>0)o.shake=Math.max(0,o.shake-dt);
  const inp=inputVector(),speed=170;let nx=n.x+inp.x*speed*dt,nz=AH_clamp(n.z+inp.z*speed*dt,-310,310),crate=AH_beachObject('beach_push_crate');
  if(crate&&!crate.broken&&n.y<20&&Math.abs(nx-crate.x)<45&&Math.abs(nz-crate.z)<45){crate.x=AH_clamp(crate.x+inp.x*92*dt,1080,1325);crate.z=AH_clamp(crate.z+inp.z*92*dt,65,205);nx=n.x+inp.x*55*dt;nz=n.z+inp.z*55*dt;}
  const barrier=AH_beachObject('beach_barrier');if(barrier&&!barrier.broken&&Math.abs(nx-barrier.x)<36&&Math.abs(nz)<260)nx=n.x;
  const cg=groundAt(n.x,n.z,session.time),tg=groundAt(nx,nz,session.time);if(n.onGround&&tg&&cg&&tg.y-cg.y>42){nx=n.x;nz=n.z;}n.x=nx;n.z=nz;n.vy-=650*dt;n.y+=n.vy*dt;const ground=groundAt(n.x,n.z,session.time);if(ground&&n.vy<=0&&n.y<=ground.y+3){n.y=ground.y;n.vy=0;n.onGround=true;n.jumps=0;}else n.onGround=false;
  if(n.y<-150){navigatorDamage(Math.max(8,n.die.maxHp*.18),'Navigator fell');if(session?.nav){const cp=session.checkpoint;n.x=cp.x;n.z=cp.z;n.y=cp.y;n.vy=0;n.jumps=0;n.onGround=true;}}
  if(n.x>1050)session.checkpoint={x:1040,z:0,y:0};if(n.x>1490)session.checkpoint={x:1480,z:0,y:0};collectNearbyDrops();
  if(n.x>1690&&Math.abs(n.z)<235){const w=AH_ensureWorld();w.beachComplete=true;w.checkpoint={x:1740,z:0,y:8};AH_finishTraversalToCombat(2,4,'Goblin Fringe');return;}
  session.cameraX+=((n.x+150)-session.cameraX)*Math.min(1,dt*3);const w=AH_ensureWorld();w.cameraX=session.cameraX;w.checkpoint={...session.checkpoint};w.objects=session.objects;w.drops=session.drops;
}
AH_SEGMENT_UPDATERS.beach=AH_beachUpdater;
function AH_drawBeachTraversal(){
  const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return;if(!resizePlatformCanvas())throw new Error('Al Hata beach canvas has no usable size.');const g=c.getContext('2d');g.clearRect(0,0,session.w,session.h);AH_beachSky(g,session.w,session.h,session.cameraX);AH_beachPlatforms().sort((a,b)=>a.z1-b.z1).forEach(p=>AH_ground(g,p,AH_project));
  const items=[];for(const p of AH_BEACH_PROPS)items.push({z:p.z,draw:()=>AH_drawBeachProp(g,p,AH_project)});for(const o of session.objects)if(String(o.id).startsWith('beach_'))items.push({z:o.z,draw:()=>AH_drawBeachObject(g,o,AH_project)});if(session.nav)items.push({z:session.nav.z,draw:()=>drawNavigator(g)});items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw());
  g.save();g.globalAlpha=.82;g.fillStyle='#274f35';for(let i=0;i<6;i++){const x=i%2?session.w-10:10,y=session.h*.24+i*45;g.beginPath();g.ellipse(x,y,15,48,(i%2?-1:1)*.6,0,AH_TAU);g.fill();}g.restore();const hud=document.getElementById('ttdPlatformHud');if(hud){const a=hud.querySelector('.ttdAreaBadge');if(a){const x=session.nav?.x||0;a.textContent=x<1000?'OPEN SHORE':x<1450?'GOBLIN FRINGE':'JUNGLE THRESHOLD';}}
}
AH_SEGMENT_DRAWERS.beach=AH_drawBeachTraversal;

AH_COMBAT_DRAWERS[1]=({back,front,spec})=>{
  const proj=(x,z,y=0)=>AH_projectWorld(x,z,y,back.w,back.h,spec.cameraX);AH_beachSky(back.g,back.w,back.h,spec.cameraX);AH_drawRouteRibbon(back.g,back.w,back.h,1,spec.cameraX);
  for(const p of AH_BEACH_PROPS.filter(v=>v.z<130))AH_drawBeachProp(back.g,p,proj);for(const o of AH_ensureWorld()?.objects||[])if(String(o.id).startsWith('beach_')&&o.z<130)AH_drawBeachObject(back.g,o,proj);
  const fproj=(x,z,y=0)=>AH_projectWorld(x,z,y,front.w,front.h,spec.cameraX);for(const p of AH_BEACH_PROPS.filter(v=>v.z>=130))AH_drawBeachProp(front.g,p,fproj);for(const o of AH_ensureWorld()?.objects||[])if(String(o.id).startsWith('beach_')&&o.z>=130)AH_drawBeachObject(front.g,o,fproj);
};
const AH_beachLane=document.getElementById('laneWrap');
AH_beachLane?.addEventListener('pointerdown',event=>{
  if(!AH_isState()||Number(state.__ttdAlHataCombatArea)!==1||document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode'))return;const tree=AH_beachObject('beach_coconut_1');if(!tree||tree.triggered)return;const r=AH_beachLane.getBoundingClientRect(),p=AH_projectWorld(tree.x,tree.z,66,r.width,r.height,AH_AREAS[1].cameraX),px=event.clientX-r.left,py=event.clientY-r.top;if(Math.hypot(px-p.x,py-p.y)>50)return;
  event.preventDefault();tree.__combatHits=(tree.__combatHits||0)+1;tree.shake=.42;toast(`Coconut palm · ${Math.min(tree.__combatHits,3)}/3 shakes`);if(tree.__combatHits<3)return;tree.triggered=tree.opened=true;
  for(const e of state.enemies||[]){if(!e?.alive)continue;try{const ep=posAtDistance(e.dist);if(Math.hypot(ep.x-p.x,ep.y-p.y)<110)e.hp=Math.max(0,Number(e.hp||0)-Math.max(8,Number(e.maxHp||e.hp||20)*.28));}catch(_){}}toast('CRASH! Coconuts dropped onto the marching route.');
},true);
AH_AFTER_COMBAT[3]=()=>{const w=AH_ensureWorld(),shell=AH_beachObject('beach_shell');if(shell&&!shell.randomized){const spots=[[760,-250],[980,250],[1125,-235]];const pick=spots[Math.floor(Math.random()*spots.length)];shell.x=pick[0];shell.z=pick[1];shell.randomized=true;}w.cameraX=790;w.checkpoint={x:720,z:0,y:0};AH_beginTraversal('beach');};
