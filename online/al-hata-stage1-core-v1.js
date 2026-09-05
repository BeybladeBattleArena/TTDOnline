/* Al Hata Stage 1 shared runtime. Concatenated into adventure-platforming-v2.js lexical scope. */
window.__TTD_AL_HATA_STAGE1_RUNTIME_V1=true;
const AH_ID='al_hata';
const AH_STAGE=ADVENTURES?.[AH_ID]?.stages?.[0];
if(AH_STAGE){
  AH_STAGE.name='Island Landing';
  AH_STAGE.waves=16;
  AH_STAGE.carryover=[];
  AH_STAGE.introduce={1:['goblin','goblin_dog','spindlevine'],4:['goblin_thrower'],7:['goblin_spearman'],10:['scary_goblin_dog']};
  AH_STAGE.smallBoss={6:'goblin_thrower',10:'goblin_spearman',14:'scary_goblin_dog'};
  AH_STAGE.subBoss={wave:16,key:'frost_ogre'};
}
const AH_TAU=Math.PI*2;
const AH_clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const AH_lerp=(a,b,t)=>a+(b-a)*t;
const AH_AREAS={
  1:{id:'landing-shore',name:'Landing Shore',cameraX:560,center:{x:560,z:0,y:0}},
  2:{id:'goblin-fringe',name:'Goblin Fringe',cameraX:1900,center:{x:1900,z:0,y:10}},
  3:{id:'ruin-basin',name:'Deep Jungle Ruins',cameraX:3150,center:{x:3150,z:0,y:20}},
  4:{id:'pincer-bridge',name:'Bridge Ambush',cameraX:4550,center:{x:4550,z:0,y:85}},
  5:{id:'temple-forecourt',name:'Temple Forecourt',cameraX:6250,center:{x:6250,z:0,y:70}},
};
const AH_ROUTES={};
const AH_COMBAT_DRAWERS={};
const AH_SEGMENT_PLATFORMS={};
const AH_SEGMENT_DRAWERS={};
const AH_SEGMENT_UPDATERS={};
const AH_SEGMENT_STARTS={};
const AH_OBJECT_TEMPLATES=[];
const AH_OBJECT_DRAWERS={};
const AH_OBJECT_ATTACKERS={};
const AH_OBJECT_HIT_RADII={};
const AH_AFTER_COMBAT={};

function AH_isState(candidate=state){return !!AH_STAGE&&!!candidate?.adventure&&!!candidate.__ttdAlHataStage1&&(candidate.adventureStage===AH_STAGE||candidate.adventureStage?.name===AH_STAGE.name);}
function AH_isTraversal(){return AH_isState()&&!!session?.active&&!!session.__ttdAlHata;}
function AH_cloneTemplate(o){return JSON.parse(JSON.stringify(o));}
function AH_ensureWorld(){
  if(!AH_isState())return null;
  if(!state.__ttdAlHataWorld)state.__ttdAlHataWorld={version:1,cameraX:AH_AREAS[1].cameraX,combatArea:1,segment:null,routeChoice:null,checkpoint:{x:720,z:0,y:0},objects:[],drops:[],shells:0};
  const w=state.__ttdAlHataWorld;if(!Array.isArray(w.objects))w.objects=[];if(!Array.isArray(w.drops))w.drops=[];
  for(const template of AH_OBJECT_TEMPLATES)if(!w.objects.some(o=>o.id===template.id))w.objects.push(AH_cloneTemplate(template));
  return w;
}
function AH_tagState(){
  if(!state||!AH_STAGE||state.adventureStage!==AH_STAGE)return false;
  state.__ttdAlHataStage1=true;state.__ttdAlHataCombatArea=Number(state.__ttdAlHataCombatArea)||1;
  state.__ttdAlHataRewards=state.__ttdAlHataRewards||{shells:0,bonusSp:0,explorationCoins:0};
  AH_ensureWorld();if(modeLabel)modeLabel.textContent='Al Hata · Landing Shore';
  try{buildPath(cw,ch);}catch(err){console.warn('Al Hata path build deferred until lane layout is ready.',err);}return true;
}
const AH_baseStartAdventure=startAdventure;
startAdventure=function AH_startAdventure(advId,stageIdx,diffKey){
  const result=AH_baseStartAdventure(advId,stageIdx,diffKey);
  if(advId===AH_ID&&Number(stageIdx)===0){const started=performance.now();const bind=()=>{if(state?.adventureStage===AH_STAGE){AH_tagState();return;}if(performance.now()-started<10000)requestAnimationFrame(bind);};requestAnimationFrame(bind);}return result;
};

function AH_projectWorld(x,z,y,w,h,cameraX){
  const W=Math.max(1,Number(w)||1),H=Math.max(1,Number(h)||1),scale=Math.max(.52,Math.min(.82,W/520));
  const relX=Number(x)-Number(cameraX||0),depth=(Number(z)+260)/520,persp=.80+depth*.24;
  return{x:W*.47+relX*scale*persp,y:H*.69+Number(z)*.255*scale-Number(y||0)*scale-relX*.032*scale,scale:scale*persp};
}
function AH_project(x,z,y=0){return AH_projectWorld(x,z,y,session.w,session.h,session.cameraX);}
function AH_sampleRoute(vertices,w,h,cameraX){
  const out=[];for(let i=0;i<vertices.length-1;i++){const a=vertices[i],b=vertices[i+1],steps=9;for(let s=0;s<steps;s++){if(i>0&&s===0)continue;const t=s/(steps-1),wx=AH_lerp(a.x,b.x,t),wz=AH_lerp(a.z,b.z,t),wy=AH_lerp(a.y||0,b.y||0,t);out.push({...AH_projectWorld(wx,wz,wy,w,h,cameraX),worldX:wx,worldZ:wz,worldY:wy});}}return out;
}
const AH_baseBuildPath=buildPath;
buildPath=function AH_buildPath(w,h){
  if(!AH_isState())return AH_baseBuildPath(w,h);const area=AH_clamp(Number(state.__ttdAlHataCombatArea)||1,1,5),spec=AH_AREAS[area],vertices=AH_ROUTES[area];
  if(!vertices?.length)return AH_baseBuildPath(w,h);const projected=AH_sampleRoute(vertices,w,h,spec.cameraX);pathPts=projected.map(p=>({x:p.x,y:p.y}));segLens=[];totalLen=0;
  for(let i=1;i<pathPts.length;i++){const len=Math.hypot(pathPts[i].x-pathPts[i-1].x,pathPts[i].y-pathPts[i-1].y);segLens.push(len);totalLen+=len;}towerPos=pathPts[pathPts.length-1];state.__ttdAlHataProjectedRoute=projected;
};

function AH_beginTraversal(segment){
  if(session?.active||!AH_isState())return;const world=AH_ensureWorld(),start=AH_SEGMENT_STARTS[segment]||world.checkpoint||{x:720,z:0,y:0};world.segment=segment;world.checkpoint={...start};
  session={active:true,phase:'select',nav:null,w:1,h:1,cameraX:Number(world.cameraX)||start.x,time:0,lastTs:0,joyX:0,joyZ:0,checkpoint:{...start},objects:world.objects,drops:world.drops,hazardCd:0,returnAlpha:1,__ttdAlHata:true,segment};
  setupNavigatorSelection('Select one of your summoned dice to explore Al Hata');
}
function AH_finishTraversalToCombat(area,wave,label){
  if(!AH_isTraversal())return;const world=AH_ensureWorld();world.objects=session.objects;world.drops=session.drops;world.combatArea=area;world.cameraX=AH_AREAS[area]?.cameraX||world.cameraX;
  clearNavigatorSelectionUi();leavePlatformLayout(true);restoreTrayChildren();state.__ttdAlHataCombatArea=area;state.wave=wave;state.waveClearCredited=false;state.waveClearedAt=0;state.spawnQueue=buildAdventureWave(state.adventureStage,wave,state.adventureDiff);state.spawnTimer=0;
  if(modeLabel)modeLabel.textContent=`Al Hata · ${label||AH_AREAS[area]?.name||'Stage 1'}`;renderHUD();renderBoard();buildPath(cw,ch);session.active=false;session=null;state.running=true;lastT=0;requestAnimationFrame(loop);
}

const AH_baseCurrentPlatforms=currentPlatforms;
currentPlatforms=function AH_currentPlatforms(t){if(!AH_isTraversal())return AH_baseCurrentPlatforms(t);const fn=AH_SEGMENT_PLATFORMS[session.segment];return typeof fn==='function'?fn(t):[];};
const AH_baseInitObjectHp=initObjectHp;
initObjectHp=function AH_initObjectHp(){if(!AH_isTraversal())return AH_baseInitObjectHp();const ap=Math.max(1,Math.round(effDmg(session.nav.die)));for(const o of session.objects){if(o.maxHp>0||o.collected)continue;const hits=Number(o.hits)||2;o.maxHp=o.hp=Math.max(hits,ap*hits);}};
const AH_baseAttackObject=attackObject;
attackObject=function AH_attackObject(o){if(!AH_isTraversal())return AH_baseAttackObject(o);const fn=AH_OBJECT_ATTACKERS[o?.type];if(typeof fn==='function')return fn(o);return AH_baseAttackObject(o);};
const AH_baseObjectHit=objectHit;
objectHit=function AH_objectHit(o,px,py){if(!AH_isTraversal())return AH_baseObjectHit(o,px,py);const radius=AH_OBJECT_HIT_RADII[o?.type]||34,p=AH_project(o.x,o.z,(o.y||0)+(o.hitY||20));return Math.hypot(px-p.x,py-p.y)<radius;};
const AH_baseUpdateNavigator=updateNavigator;
updateNavigator=function AH_updateNavigator(dt){if(!AH_isTraversal())return AH_baseUpdateNavigator(dt);const fn=AH_SEGMENT_UPDATERS[session.segment];if(typeof fn==='function')return fn(dt);};
const AH_baseDrawScene=drawScene;
drawScene=function AH_drawScene(){if(!AH_isTraversal())return AH_baseDrawScene();const fn=AH_SEGMENT_DRAWERS[session.segment];if(typeof fn==='function')return fn();};

function AH_ensureCombatCanvas(id,z){
  const lane=document.getElementById('laneWrap');if(!lane)return null;let c=document.getElementById(id);if(!c){c=document.createElement('canvas');c.id=id;c.style.cssText=`position:absolute;inset:0;width:100%;height:100%;z-index:${z};pointer-events:none;`;lane.insertBefore(c,document.getElementById('laneCanvas')||lane.firstChild);}const r=lane.getBoundingClientRect(),dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1)),pw=Math.max(1,Math.round(r.width*dpr)),ph=Math.max(1,Math.round(r.height*dpr));if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return{c,g,w:r.width,h:r.height};
}
function AH_removeCombatCanvases(){document.getElementById('ttdAlHataBackV1')?.remove();document.getElementById('ttdAlHataFrontV1')?.remove();const lc=document.getElementById('laneCanvas');if(lc){lc.style.background='';lc.style.position='';lc.style.zIndex='';}}
function AH_drawRouteRibbon(g,w,h,area,cameraX,color='rgba(113,85,48,.20)'){
  const verts=AH_ROUTES[area];if(!verts)return;const pts=AH_sampleRoute(verts,w,h,cameraX);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],sc=(a.scale+b.scale)*.5;g.lineCap='round';g.strokeStyle=color;g.lineWidth=Math.max(18,38*sc);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.strokeStyle='rgba(246,225,174,.20)';g.lineWidth=Math.max(1,2*sc);g.stroke();}
}
function AH_combatVisualLoop(){
  try{
    if(!AH_isState()||document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode'))AH_removeCombatCanvases();
    else{const area=AH_clamp(Number(state.__ttdAlHataCombatArea)||1,1,5),drawer=AH_COMBAT_DRAWERS[area],back=AH_ensureCombatCanvas('ttdAlHataBackV1',0),front=AH_ensureCombatCanvas('ttdAlHataFrontV1',3),lc=document.getElementById('laneCanvas');if(back&&front&&typeof drawer==='function'){if(lc){lc.style.background='transparent';lc.style.position='relative';lc.style.zIndex='2';}back.g.clearRect(0,0,back.w,back.h);front.g.clearRect(0,0,front.w,front.h);drawer({back,front,area,spec:AH_AREAS[area]});}}
  }catch(err){console.warn('Al Hata combat presentation recovered from a frame error.',err);}requestAnimationFrame(AH_combatVisualLoop);
}
requestAnimationFrame(AH_combatVisualLoop);

const AH_baseUpdateSpawns=updateSpawns;
updateSpawns=function AH_updateSpawns(dt){
  if(AH_isState()&&!session?.active&&state.spawnQueue.length===0&&state.enemies.length===0){const hook=AH_AFTER_COMBAT[Number(state.wave)||0];if(typeof hook==='function'&&!state.__ttdAlHataTransitionLock){state.__ttdAlHataTransitionLock=true;if(!state.waveClearCredited){state.completedWaves+=1;state.waveClearCredited=true;}state.running=false;requestAnimationFrame(()=>{state.__ttdAlHataTransitionLock=false;hook();});return;}}
  return AH_baseUpdateSpawns(dt);
};
window.__TTD_AL_HATA_STAGE1_API={version:1,get active(){return AH_isState();},get traversal(){return AH_isTraversal();},get area(){return Number(state?.__ttdAlHataCombatArea)||0;},get world(){return AH_isState()?AH_ensureWorld():null;}};
