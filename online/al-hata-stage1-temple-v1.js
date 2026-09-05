/* Stage 1C — temple approach, forecourt, and final four-wave door siege. */
AH_ROUTES[5]=[
  {x:6635,z:-205,y:70},{x:6540,z:-95,y:70},{x:6470,z:165,y:70},{x:6360,z:115,y:70},
  {x:6260,z:-150,y:70},{x:6145,z:-85,y:70},{x:6035,z:120,y:70},
];
AH_SEGMENT_STARTS.templeApproach={x:5310,z:0,y:62};
AH_STAGE.smallBoss[15]='goblin_spearman';
const AH_TEMPLE_PROPS=[
  {kind:'tree',x:5290,z:-220,s:1.02},{kind:'tree',x:5350,z:220,s:1.04},{kind:'runeSlab',x:5410,z:-150,s:1.05},
  {kind:'brokenColumn',x:5480,z:170,s:1.05},{kind:'statue',x:5580,z:-175,s:1.00},{kind:'vine',x:5640,z:190,s:.9},
  {kind:'templeWall',x:5720,z:-205,s:1.0},{kind:'templeWall',x:5810,z:205,s:1.0},{kind:'templeColumn',x:5890,z:-155,s:1.15},
  {kind:'templeColumn',x:5890,z:155,s:1.15},{kind:'templeBrazier',x:5950,z:-110,s:.9},{kind:'templeBrazier',x:5950,z:110,s:.9},
  {kind:'templeColumn',x:6070,z:-190,s:1.20},{kind:'templeColumn',x:6070,z:190,s:1.20},
  {kind:'statue',x:6170,z:-205,s:1.15},{kind:'statue',x:6170,z:205,s:1.15},
  {kind:'templeColumn',x:6320,z:-210,s:1.24},{kind:'templeColumn',x:6320,z:210,s:1.24},
  {kind:'templeColumn',x:6480,z:-205,s:1.24},{kind:'templeColumn',x:6480,z:205,s:1.24},
  {kind:'brokenColumn',x:6570,z:120,s:1.2},{kind:'runeSlab',x:6600,z:-130,s:1.1},
];
AH_OBJECT_TEMPLATES.push(
  {id:'temple_secret_statue',type:'ah_secret_statue',name:'Weathered Die Master Statue',x:5575,z:-175,y:62,hits:4,hp:0,maxHp:0,opened:false,broken:false,hitY:58},
  {id:'temple_hidden_sp_chest',type:'ah_hidden_sp_chest',name:'Ancient SP Cache',x:5625,z:-250,y:66,hits:1,hp:0,maxHp:0,opened:false,broken:false,hidden:true,sp:25},
  {id:'temple_combat_column',type:'ah_temple_column',name:'Unstable Forecourt Column',x:6305,z:125,y:70,hits:5,hp:0,maxHp:0,opened:false,broken:false,combatHits:0,hitY:70},
  {id:'temple_combat_statue',type:'ah_temple_statue',name:'Cracked Guardian Statue',x:6460,z:-150,y:70,hits:4,hp:0,maxHp:0,opened:false,broken:false,combatHits:0,hitY:62}
);
function AH_templeObject(id){return AH_ensureWorld()?.objects.find(o=>o.id===id);}
function AH_templePlatforms(){return[
  {id:'temple_trail',x1:5260,x2:5480,z1:-190,z2:190,y:62,kind:'dirt'},
  {id:'outer_ruins',x1:5460,x2:5680,z1:-210,z2:210,y:66,kind:'rock'},
  {id:'side_shrine',x1:5530,x2:5685,z1:-295,z2:-155,y:66,kind:'rock'},
  {id:'old_stairs_1',x1:5650,x2:5760,z1:-190,z2:190,y:72,kind:'rock'},
  {id:'old_stairs_2',x1:5740,x2:5855,z1:-180,z2:180,y:82,kind:'rock'},
  {id:'outer_court',x1:5830,x2:6005,z1:-205,z2:205,y:88,kind:'rock'},
];}
AH_SEGMENT_PLATFORMS.templeApproach=AH_templePlatforms;
function AH_templeBackdrop(g,w,h,cameraX,combat=false){
  const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#315b67');sky.addColorStop(.43,'#728e83');sky.addColorStop(.72,'#b8b28d');sky.addColorStop(1,'#615f50');g.fillStyle=sky;g.fillRect(0,0,w,h);
  const horizon=h*.31;
  /* The mountain is a persistent destination mass behind the temple. */
  g.fillStyle='#41534e';g.beginPath();g.moveTo(-w*.12,horizon+75);g.lineTo(w*.26,horizon-70);g.lineTo(w*.46,horizon-18);g.lineTo(w*.68,horizon-105);g.lineTo(w*1.12,horizon+75);g.closePath();g.fill();
  g.fillStyle='rgba(205,215,196,.12)';g.beginPath();g.moveTo(w*.47,horizon-18);g.lineTo(w*.68,horizon-105);g.lineTo(w*.79,horizon-45);g.closePath();g.fill();
  /* Large, layered temple silhouette; camera movement gives mild parallax. */
  const cx=w*.58-(cameraX-6100)*.025,base=h*.61;g.fillStyle='#4d544e';g.fillRect(cx-w*.28,base-h*.25,w*.56,h*.25);g.fillStyle='#62675d';g.fillRect(cx-w*.22,base-h*.34,w*.44,h*.09);g.beginPath();g.moveTo(cx-w*.27,base-h*.34);g.lineTo(cx,base-h*.46);g.lineTo(cx+w*.27,base-h*.34);g.closePath();g.fill();
  g.fillStyle='#2a302d';g.fillRect(cx-w*.065,base-h*.20,w*.13,h*.20);g.fillStyle='rgba(12,17,17,.82)';g.fillRect(cx-w*.043,base-h*.16,w*.086,h*.16);
  for(const side of [-1,1]){g.fillStyle='#66695e';g.fillRect(cx+side*w*.15-9,base-h*.31,18,h*.31);g.fillRect(cx+side*w*.15-15,base-h*.32,30,9);}
  g.fillStyle='rgba(39,68,47,.46)';for(let i=0;i<8;i++){const x=((i*111-cameraX*.08)%(w+160)+w+160)%(w+160)-80;g.beginPath();g.arc(x,horizon+35-(i%3)*18,38+(i%2)*8,0,AH_TAU);g.fill();}
  const haze=g.createLinearGradient(0,h*.42,0,h);haze.addColorStop(0,'rgba(226,225,190,.05)');haze.addColorStop(1,'rgba(31,35,31,.19)');g.fillStyle=haze;g.fillRect(0,h*.42,w,h*.58);
  if(combat){g.save();g.globalAlpha=.12;g.fillStyle='#eadfbb';for(let i=0;i<3;i++){g.beginPath();g.moveTo(w*(.18+i*.28),0);g.lineTo(w*(.27+i*.28),h*.72);g.lineTo(w*(.34+i*.28),h*.72);g.closePath();g.fill();}g.restore();}
}
function AH_drawTempleArchitecture(g,p,projector){AH_at(g,p.x,p.z,0,p.s,projector,()=>{if(p.kind==='templeColumn'){g.fillStyle='#77786c';g.fillRect(-15,-105,30,108);g.fillStyle='#98988a';g.fillRect(-24,-111,48,11);g.fillRect(-21,-6,42,9);g.strokeStyle='#55574f';g.lineWidth=2;for(let y=-88;y<-20;y+=22){g.beginPath();g.moveTo(-9,y);g.lineTo(9,y-5);g.stroke();}}else if(p.kind==='templeWall'){g.fillStyle='#666c61';g.fillRect(-49,-75,98,77);g.strokeStyle='rgba(43,48,43,.55)';g.lineWidth=2;for(let y=-60;y<0;y+=18){g.beginPath();g.moveTo(-45,y);g.lineTo(45,y);g.stroke();}for(let x=-30;x<=30;x+=30){g.beginPath();g.moveTo(x,-72);g.lineTo(x,0);g.stroke();}}else if(p.kind==='templeBrazier'){g.fillStyle='#544b3d';g.fillRect(-15,-24,30,25);g.fillStyle='#80603d';g.beginPath();g.moveTo(-22,-27);g.lineTo(22,-27);g.lineTo(14,-12);g.lineTo(-14,-12);g.closePath();g.fill();g.fillStyle='#edb46b';g.beginPath();g.moveTo(0,-60);g.quadraticCurveTo(-15,-38,0,-26);g.quadraticCurveTo(16,-39,0,-60);g.fill();}});}
function AH_drawTempleProp(g,p,projector){if(['templeColumn','templeWall','templeBrazier'].includes(p.kind))AH_drawTempleArchitecture(g,p,projector);else AH_drawJungleProp(g,p,projector);}
function AH_drawSecretStatue(g,o,projector){if(o.broken)return;AH_at(g,o.x,o.z,o.y||62,1,projector,()=>{g.fillStyle=o.flash?'#aaa99a':'#777c70';g.fillRect(-17,-60,34,61);g.beginPath();g.arc(0,-76,18,0,AH_TAU);g.fill();g.fillStyle='#62695e';g.beginPath();g.moveTo(-14,-49);g.lineTo(-34,-22);g.lineTo(-21,-15);g.lineTo(-5,-37);g.fill();g.strokeStyle='#4d514a';g.lineWidth=2;g.beginPath();g.moveTo(-5,-85);g.lineTo(8,-71);g.lineTo(-4,-63);g.stroke();});}
function AH_drawTempleColumnObject(g,o,projector){AH_at(g,o.x,o.z,o.y||70,1,projector,()=>{g.save();if(o.broken)g.rotate(-1.12);g.fillStyle=o.flash?'#aaa596':'#7a7b70';g.fillRect(-15,-104,30,106);g.fillStyle='#99998c';g.fillRect(-24,-110,48,11);g.strokeStyle='#4b4d47';g.lineWidth=2;g.beginPath();g.moveTo(-5,-86);g.lineTo(7,-63);g.lineTo(-4,-43);g.lineTo(9,-19);g.stroke();g.restore();});}
function AH_drawTempleStatueObject(g,o,projector){AH_at(g,o.x,o.z,o.y||70,1,projector,()=>{g.save();if(o.broken)g.rotate(.9);g.fillStyle=o.flash?'#aaa99c':'#74786d';g.fillRect(-18,-64,36,65);g.beginPath();g.arc(0,-82,20,0,AH_TAU);g.fill();g.fillStyle='#565d53';g.fillRect(-7,-58,14,38);g.restore();});}
function AH_drawTempleObject(g,o,projector){if(o.type==='ah_secret_statue')AH_drawSecretStatue(g,o,projector);else if(o.type==='ah_hidden_sp_chest'){if(!o.hidden)AH_drawChest(g,o,projector);}else if(o.type==='ah_temple_column')AH_drawTempleColumnObject(g,o,projector);else if(o.type==='ah_temple_statue')AH_drawTempleStatueObject(g,o,projector);else AH_drawJungleObject(g,o,projector);}
AH_OBJECT_ATTACKERS.ah_secret_statue=o=>AH_damageObject(o,()=>{o.broken=true;const chest=AH_templeObject('temple_hidden_sp_chest');if(chest){chest.hidden=false;chest.hp=0;chest.maxHp=0;}floatObjectText(o,'SECRET REVEALED');toast('A hidden temple cache is tucked behind the ruined statue.');});
AH_OBJECT_ATTACKERS.ah_hidden_sp_chest=o=>{if(o.hidden)return;AH_OBJECT_ATTACKERS.ah_sp_chest(o);};
AH_OBJECT_ATTACKERS.ah_temple_column=o=>AH_damageObject(o,()=>{o.broken=true;floatObjectText(o,'COLUMN DOWN');});
AH_OBJECT_ATTACKERS.ah_temple_statue=o=>AH_damageObject(o,()=>{o.broken=true;floatObjectText(o,'STATUE TOPPLED');});
AH_OBJECT_HIT_RADII.ah_secret_statue=44;AH_OBJECT_HIT_RADII.ah_hidden_sp_chest=34;AH_OBJECT_HIT_RADII.ah_temple_column=50;AH_OBJECT_HIT_RADII.ah_temple_statue=48;
function AH_templeUpdater(dt){
  const n=session.nav;if(!n)return;n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);const inp=inputVector(),speed=168;let nx=n.x+inp.x*speed*dt,nz=AH_clamp(n.z+inp.z*speed*dt,-300,300),cg=groundAt(n.x,n.z,session.time),tg=groundAt(nx,nz,session.time);if(n.onGround&&tg&&cg&&tg.y-cg.y>38){nx=n.x;nz=n.z;}n.x=nx;n.z=nz;n.vy-=650*dt;n.y+=n.vy*dt;const ground=groundAt(n.x,n.z,session.time);if(ground&&n.vy<=0&&n.y<=ground.y+3){n.y=ground.y;n.vy=0;n.onGround=true;n.jumps=0;}else n.onGround=false;if(n.y<-150){navigatorDamage(Math.max(8,n.die.maxHp*.18),'Navigator fell');if(session?.nav){const cp=session.checkpoint;n.x=cp.x;n.z=cp.z;n.y=cp.y;n.vy=0;}}
  collectNearbyDrops();if(n.x>5700)session.checkpoint={x:5690,z:0,y:72};if(n.x>5940){const w=AH_ensureWorld();w.templeReached=true;w.cameraX=AH_AREAS[5].cameraX;w.checkpoint={x:5960,z:0,y:88};AH_finishTraversalToCombat(5,13,'Temple Forecourt');return;}session.cameraX+=((n.x+145)-session.cameraX)*Math.min(1,dt*2.7);const w=AH_ensureWorld();w.cameraX=session.cameraX;w.checkpoint={...session.checkpoint};w.objects=session.objects;w.drops=session.drops;
}
AH_SEGMENT_UPDATERS.templeApproach=AH_templeUpdater;
function AH_drawTempleTraversal(){
  const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return;if(!resizePlatformCanvas())throw new Error('Al Hata temple approach canvas has no usable size.');const g=c.getContext('2d');g.clearRect(0,0,session.w,session.h);AH_templeBackdrop(g,session.w,session.h,session.cameraX,false);AH_templePlatforms().sort((a,b)=>a.z1-b.z1).forEach(p=>AH_ground(g,p,AH_project));const items=[];for(const p of AH_TEMPLE_PROPS)if(p.x<6005)items.push({z:p.z,draw:()=>AH_drawTempleProp(g,p,AH_project)});for(const o of session.objects)if(o.x>=5260&&o.x<6005)items.push({z:o.z,draw:()=>AH_drawTempleObject(g,o,AH_project)});if(session.nav)items.push({z:session.nav.z,draw:()=>drawNavigator(g)});items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw());g.save();g.globalAlpha=.82;g.fillStyle='#193b29';for(let i=0;i<6;i++){const x=i%2?session.w-7:7,y=session.h*.2+i*65;g.beginPath();g.ellipse(x,y,18,58,(i%2?-1:1)*.55,0,AH_TAU);g.fill();}g.restore();const hud=document.getElementById('ttdPlatformHud');if(hud){const a=hud.querySelector('.ttdAreaBadge');if(a)a.textContent=(session.nav?.x||0)<5650?'OUTER TEMPLE RUINS':'TEMPLE FORECOURT';}}
AH_SEGMENT_DRAWERS.templeApproach=AH_drawTempleTraversal;
function AH_beginTempleApproach(){const w=AH_ensureWorld();w.cameraX=5370;w.checkpoint={x:5310,z:0,y:62};AH_beginTraversal('templeApproach');}

function AH_drawForecourtFloor(g,w,h,cameraX){const pr=(x,z,y=0)=>AH_projectWorld(x,z,y,w,h,cameraX),q=[pr(5850,-260,70),pr(6740,-260,70),pr(6740,260,70),pr(5850,260,70)],grad=g.createLinearGradient(0,Math.min(...q.map(p=>p.y)),0,Math.max(...q.map(p=>p.y))+100);grad.addColorStop(0,'#8b8979');grad.addColorStop(1,'#626458');g.fillStyle=grad;g.beginPath();g.moveTo(q[0].x,q[0].y);for(let i=1;i<q.length;i++)g.lineTo(q[i].x,q[i].y);g.closePath();g.fill();g.save();g.globalAlpha=.20;g.strokeStyle='#363c35';g.lineWidth=1;for(let x=5900;x<6740;x+=70){const a=pr(x,-250,71),b=pr(x,250,71);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}for(let z=-210;z<=210;z+=70){const a=pr(5860,z,71),b=pr(6730,z,71);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}g.restore();}
AH_COMBAT_DRAWERS[5]=({back,front,spec})=>{
  AH_templeBackdrop(back.g,back.w,back.h,spec.cameraX,true);AH_drawForecourtFloor(back.g,back.w,back.h,spec.cameraX);AH_drawRouteRibbon(back.g,back.w,back.h,5,spec.cameraX,'rgba(83,70,47,.25)');const pr=(x,z,y=0)=>AH_projectWorld(x,z,y,back.w,back.h,spec.cameraX);for(const p of AH_TEMPLE_PROPS)if(p.x>=6000&&p.z<120)AH_drawTempleProp(back.g,p,pr);for(const o of AH_ensureWorld()?.objects||[])if(o.x>=6000&&o.z<120)AH_drawTempleObject(back.g,o,pr);
  const fp=(x,z,y=0)=>AH_projectWorld(x,z,y,front.w,front.h,spec.cameraX);for(const p of AH_TEMPLE_PROPS)if(p.x>=6000&&p.z>=120)AH_drawTempleProp(front.g,p,fp);for(const o of AH_ensureWorld()?.objects||[])if(o.x>=6000&&o.z>=120)AH_drawTempleObject(front.g,o,fp);front.g.save();front.g.fillStyle='rgba(26,45,31,.78)';for(let i=0;i<5;i++){const x=i%2?front.w-5:5,y=front.h*.22+i*74;front.g.beginPath();front.g.ellipse(x,y,20,65,(i%2?-1:1)*.6,0,AH_TAU);front.g.fill();}front.g.restore();
};
const AH_templeBaseBuildWave=buildAdventureWave;
buildAdventureWave=function AH_buildTempleWave(stage,wave,diff){const q=AH_templeBaseBuildWave(stage,wave,diff);if(stage===AH_STAGE){const fractions={14:[.36],15:[.30,.50],16:[.44]}[wave];if(fractions)for(let i=0;i<fractions.length&&i<q.length;i++){const idx=Math.max(0,q.length-1-i);q[idx].__ahEntryFraction=fractions[i];q[idx].__ahEntryKind=i%2?'upper-ledge':'side-arch';}}return q;};
const AH_templeLane=document.getElementById('laneWrap');
AH_templeLane?.addEventListener('pointerdown',event=>{
  if(!AH_isState()||Number(state.__ttdAlHataCombatArea)!==5||document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode'))return;const r=AH_templeLane.getBoundingClientRect(),px=event.clientX-r.left,py=event.clientY-r.top,targets=[AH_templeObject('temple_combat_column'),AH_templeObject('temple_combat_statue')].filter(Boolean);for(const o of targets){if(o.broken)continue;const p=AH_projectWorld(o.x,o.z,(o.y||70)+58,r.width,r.height,AH_AREAS[5].cameraX);if(Math.hypot(px-p.x,py-p.y)>54)continue;event.preventDefault();o.combatHits=(o.combatHits||0)+1;o.flash=.18;const need=o.type==='ah_temple_column'?5:4;toast(`${o.name} · ${Math.min(o.combatHits,need)}/${need} hits`);if(o.combatHits<need)return;o.broken=true;const radius=o.type==='ah_temple_column'?145:120,mult=o.type==='ah_temple_column'?.34:.27;for(const e of state.enemies||[]){if(!e?.alive)continue;const ep=enemyRenderPos(e);if(Math.hypot(ep.x-p.x,ep.y-p.y)<radius)e.hp=Math.max(0,Number(e.hp||0)-Math.max(12,Number(e.maxHp||e.hp||30)*mult));}toast(o.type==='ah_temple_column'?'The column crashes through the enemy approach!':'The guardian statue topples into the marching line!');return;}
},true);
