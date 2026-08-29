(() => {
  'use strict';
  if (window.__TTD_MOVING_SCREEN_V1) return;
  window.__TTD_MOVING_SCREEN_V1 = true;

  const VERSION = 1;
  const WHITE = 'rgba(255,255,255,.25)';
  const WHITE_STRONG = 'rgba(255,255,255,.78)';
  const DANGER = '#e2584f';
  const GOLD = '#f3d491';
  const MIST = '#97a0bd';
  const TICK = 1 / 60;
  const CAMERA_PAUSE = 23;
  const CAMERA_TRAVEL = 4.25;
  const MOVING_AS_MULT = 0.85;
  const MAX_ENEMIES = 10;

  const STAGE = Object.freeze({
    id: 'neon_rooftops_v1',
    name: 'Neon Rooftops',
    cameraX: 520,
    cameraStops: [90, 255, 425, 600, 775, 945],
    zones: [
      {id:'roof1_main',name:'Lower Rooftop',x:500,z:0,y:80,w:560,d:300,slots:8,summon:true},
      {id:'awning_left',name:'Red Awning',x:270,z:-15,y:205,w:210,d:95,slots:3},
      {id:'roof2_west',name:'West Rooftop',x:340,z:20,y:330,w:330,d:210,slots:5,summon:true},
      {id:'roof2_choke',name:'Fire Escape Landing',x:600,z:0,y:405,w:185,d:120,slots:2,choke:true},
      {id:'roof2_east',name:'East Rooftop',x:775,z:35,y:360,w:260,d:185,slots:4,enemySpawn:true},
      {id:'scaffold_mid',name:'Construction Scaffold',x:535,z:-10,y:530,w:175,d:95,slots:2,choke:true},
      {id:'roof3_main',name:'Midtown Rooftop',x:485,z:0,y:650,w:430,d:245,slots:6,summon:true,enemySpawn:true},
      {id:'billboard_perch',name:'Billboard Catwalk',x:775,z:-30,y:705,w:185,d:88,slots:2},
      {id:'roof3_choke',name:'Upper Fire Escape',x:395,z:18,y:810,w:175,d:105,slots:2,choke:true},
      {id:'neon_sign_perch',name:'Neon Sign Walk',x:720,z:-25,y:865,w:205,d:90,slots:2},
      {id:'roof4_main',name:'High Rooftop',x:520,z:0,y:955,w:480,d:255,slots:7,summon:true,enemySpawn:true},
      {id:'roof4_final',name:'Sign Crown',x:520,z:0,y:1080,w:320,d:170,slots:5,enemySpawn:true},
    ],
    junctions: [
      {id:'j1_fireescape',name:'Lower Split',x:500,z:0,y:150},
      {id:'j2_roof2_split',name:'Middle Split',x:605,z:0,y:470},
      {id:'j3_roof3_split',name:'Upper Split',x:515,z:0,y:760},
    ],
    edges: [
      {id:'e01',from:'roof1_main',to:'j1_fireescape',kind:'fire_escape'},
      {id:'e02',from:'j1_fireescape',to:'awning_left',kind:'awning'},
      {id:'e03',from:'awning_left',to:'roof2_west',kind:'fire_escape'},
      {id:'e04',from:'j1_fireescape',to:'roof2_east',kind:'fire_escape'},
      {id:'e05',from:'roof2_west',to:'roof2_choke',kind:'stairs'},
      {id:'e06',from:'roof2_east',to:'roof2_choke',kind:'bridge'},
      {id:'e07',from:'roof2_choke',to:'j2_roof2_split',kind:'stairs'},
      {id:'e08',from:'j2_roof2_split',to:'scaffold_mid',kind:'scaffold',requiresBroken:'boarded_passage'},
      {id:'e09',from:'scaffold_mid',to:'roof3_main',kind:'scaffold'},
      {id:'e10',from:'j2_roof2_split',to:'billboard_perch',kind:'billboard'},
      {id:'e11',from:'billboard_perch',to:'roof3_main',kind:'catwalk'},
      {id:'e12',from:'roof3_main',to:'j3_roof3_split',kind:'stairs'},
      {id:'e13',from:'j3_roof3_split',to:'roof3_choke',kind:'fire_escape'},
      {id:'e14',from:'roof3_choke',to:'roof4_main',kind:'stairs'},
      {id:'e15',from:'j3_roof3_split',to:'neon_sign_perch',kind:'signwalk',requiresIntact:'billboard_brace'},
      {id:'e16',from:'neon_sign_perch',to:'roof4_main',kind:'signwalk',requiresIntact:'billboard_brace'},
      {id:'e17',from:'roof3_main',to:'roof4_main',kind:'collapsed_sign',requiresBroken:'billboard_brace'},
      {id:'e18',from:'roof4_main',to:'roof4_final',kind:'stairs'},
    ],
    destructibles: [
      {id:'boarded_passage',name:'Boarded Scaffold Gate',x:575,z:-8,y:500,hp:75,maxHp:75,r:30,losBlocker:true,description:'Break it to open the construction-scaffold route.'},
      {id:'billboard_brace',name:'Weak Billboard Brace',x:625,z:-18,y:820,hp:95,maxHp:95,r:34,losBlocker:true,description:'Breaking it drops the sign: the high sign walk is lost, but a direct rubble bridge opens.'},
    ],
    obstacles: [
      {id:'roof2_shed',x:700,z:45,y:365,r:60,h:100,label:'Rooftop shed'},
      {id:'water_tank',x:355,z:-35,y:655,r:52,h:125,label:'Water tank'},
      {id:'roof4_hvac',x:555,z:40,y:960,r:58,h:85,label:'HVAC bank'},
    ],
  });

  let runtime = null;
  let raf = 0;
  let accumulator = 0;
  let lastTime = 0;
  let serial = 1;
  const keys = new Set();

  const byId = (list,id) => list.find(item=>item.id===id) || null;
  const zoneById = id => byId(STAGE.zones,id);
  const junctionById = id => byId(STAGE.junctions,id);
  const edgeById = id => byId(STAGE.edges,id);
  const destructibleById = id => runtime?.destructibles?.find(item=>item.id===id) || null;
  const nodeById = id => zoneById(id) || junctionById(id);
  const isZone = id => !!zoneById(id);
  const isJunction = id => !!junctionById(id);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const lerp = (a,b,t) => a+(b-a)*t;
  const ease = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
  const nowId = prefix => `${prefix}_${serial++}`;

  function dieCatalog(){ try{return typeof DICE!=='undefined' ? DICE : null;}catch(_){return null;} }
  function monsterCatalog(){ try{return typeof MONSTERS!=='undefined' ? MONSTERS : null;}catch(_){return null;} }
  function activeDeck(){ try{return typeof getActiveDeck==='function' ? getActiveDeck() : [];}catch(_){return [];} }
  function findOwned(key,id){ try{return typeof findInstance==='function' ? findInstance(key,id) : null;}catch(_){return null;} }
  function coreShowScreen(name){
    try{ if(typeof showScreen==='function'){ showScreen(name); return; } }catch(_){}
    document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
    document.getElementById(name==='mode'?'modeScreen':'homeScreen')?.classList.add('active');
  }
  function coreToast(message){
    try{ if(typeof toastGlobal==='function'){ toastGlobal(message); return; } }catch(_){}
    if(runtime?.toast){runtime.toast.textContent=message;runtime.toast.classList.add('show');clearTimeout(runtime.toast._t);runtime.toast._t=setTimeout(()=>runtime?.toast?.classList.remove('show'),1200);}
  }

  function installStyles(){
    if(document.getElementById('ttdMovingScreenStyleV1')) return;
    const style=document.createElement('style');
    style.id='ttdMovingScreenStyleV1';
    style.textContent=`
      #movingScreenScreen{background:#080b15;}
      #movingScreenScreen .msTop{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid var(--ink-700,#2a3160);background:linear-gradient(180deg,#14182b,#0c1020);z-index:4;}
      #movingScreenScreen .msBack{appearance:none;border:1px solid #2a3160;background:#171c34;color:#d9d5ca;border-radius:8px;padding:7px 10px;font-size:11px;}
      #movingScreenScreen .msTitle{font:700 12px 'Cinzel',serif;color:#f3d491;letter-spacing:.06em;white-space:nowrap;}
      #movingScreenScreen .msStats{margin-left:auto;display:flex;gap:6px;align-items:center;min-width:0;}
      #movingScreenScreen .msPill{border:1px solid #2a3160;border-radius:14px;background:#11162a;padding:5px 8px;color:#d9d5ca;font:700 9px 'Space Mono',monospace;white-space:nowrap;}
      #movingScreenScreen .msPill strong{color:#f3d491;}
      #movingScreenScreen .msWorld{position:relative;flex:1;min-height:0;overflow:hidden;background:#050812;}
      #movingScreenCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;}
      #movingScreenScreen .msActions{position:absolute;left:8px;right:8px;bottom:8px;display:flex;align-items:flex-end;gap:8px;z-index:5;pointer-events:none;}
      #movingScreenScreen .msActions button{pointer-events:auto;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);padding:9px 13px;background:rgba(13,18,35,.88);color:#ece7da;font:700 10px 'Cinzel',serif;box-shadow:0 5px 16px rgba(0,0,0,.3);}
      #movingScreenScreen .msActions .msSummon{margin-left:auto;background:linear-gradient(180deg,#f3d491,#d9b26a);color:#0a0c14;border:0;min-width:112px;}
      #movingScreenScreen .msActions button:disabled{opacity:.38;}
      #movingScreenScreen .msHint{pointer-events:none;max-width:min(60vw,360px);padding:7px 9px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(5,8,18,.78);color:#c8cedd;font:600 9px 'Space Mono',monospace;line-height:1.35;}
      #movingScreenScreen .msToast{position:absolute;left:50%;top:52px;transform:translateX(-50%);z-index:9;pointer-events:none;opacity:0;transition:opacity .18s;background:rgba(5,8,18,.92);border:1px solid rgba(243,212,145,.35);border-radius:16px;padding:7px 12px;color:#f3d491;font:700 9px 'Space Mono',monospace;white-space:nowrap;max-width:88%;overflow:hidden;text-overflow:ellipsis;}
      #movingScreenScreen .msToast.show{opacity:1;}
      #movingScreenScreen .msResult{position:absolute;inset:0;z-index:12;display:none;align-items:center;justify-content:center;background:rgba(4,6,14,.78);backdrop-filter:blur(4px);padding:18px;}
      #movingScreenScreen .msResult.show{display:flex;}
      #movingScreenScreen .msResultCard{width:min(370px,94vw);padding:18px;border:1px solid #2a3160;border-radius:14px;background:#11162a;text-align:center;}
      #movingScreenScreen .msResultCard h2{font:700 20px 'Cinzel',serif;color:#f3d491;margin:0 0 8px;}
      #movingScreenScreen .msResultCard p{font-size:11px;color:#97a0bd;line-height:1.5;}
      #movingScreenScreen .msResultCard button{width:100%;margin-top:10px;}
      .modeCard.msModeCard{border-color:rgba(143,196,232,.42);box-shadow:inset 0 0 18px rgba(143,196,232,.035);}
      .modeCard.msModeCard h3{color:#d4ecfa;}
      .modeCard.msFuture{opacity:.62;}
      @media(max-width:520px){#movingScreenScreen .msTitle{font-size:10px}.msStats .msPill:nth-child(2){display:none}#movingScreenScreen .msHint{max-width:52vw;font-size:8px}.modeCard.msModeCard{padding:13px}}
    `;
    document.head.appendChild(style);
  }

  function installArcadeCards(){
    const modeBody=document.querySelector('#modeScreen .modeBody');
    if(!modeBody || document.getElementById('ttdMovingScreenCardV1')) return;
    const moving=document.createElement('div');
    moving.id='ttdMovingScreenCardV1';moving.className='modeCard msModeCard';
    moving.innerHTML='<h3>Moving Screen</h3><p>Fight, route and reposition your Dice through a lethal scrolling battlefield. The camera border destroys anything that crosses it.</p><button type="button">Begin</button>';
    moving.querySelector('button').addEventListener('click',()=>{
      const deck=activeDeck();
      if(deck.length<5){coreToast(deck.length===0?'Build a deck first':'Your deck needs all 5 dice filled');coreShowScreen('deck');return;}
      start();
    });
    const future=document.createElement('div');
    future.id='ttdKingHillCardV1';future.className='modeCard msModeCard msFuture';
    future.innerHTML='<h3>King of the Hill</h3><p>Contested territory variant for Moving Screen-style world combat.</p><button type="button" disabled>Coming Later</button>';
    modeBody.appendChild(moving);modeBody.appendChild(future);
  }

  function ensureScreen(){
    installStyles();
    let screen=document.getElementById('movingScreenScreen');
    if(screen) return screen;
    screen=document.createElement('div');screen.id='movingScreenScreen';screen.className='screen';
    screen.innerHTML=`
      <div class="msTop">
        <button class="msBack" type="button">Back</button>
        <div class="msTitle">MOVING SCREEN · NEON ROOFTOPS</div>
        <div class="msStats"><div class="msPill">SP <strong data-ms-sp>0</strong></div><div class="msPill" data-ms-phase>PAUSE</div><div class="msPill"><strong data-ms-time>0</strong>s</div></div>
      </div>
      <div class="msWorld">
        <canvas id="movingScreenCanvas"></canvas>
        <div class="msToast"></div>
        <div class="msActions"><div class="msHint" data-ms-hint>Select a Die, then choose a white route marker.</div><button type="button" data-ms-debug>Debug</button><button type="button" class="msSummon" data-ms-summon>Summon · 10 SP</button></div>
        <div class="msResult"><div class="msResultCard"><h2 data-ms-result-title>MOVING SCREEN</h2><p data-ms-result-text></p><button type="button" data-ms-result-back>Return to Arcade</button></div></div>
      </div>`;
    document.getElementById('app')?.appendChild(screen);
    screen.querySelector('.msBack').addEventListener('click',exit);
    screen.querySelector('[data-ms-result-back]').addEventListener('click',exit);
    screen.querySelector('[data-ms-summon]').addEventListener('click',summonDie);
    screen.querySelector('[data-ms-debug]').addEventListener('click',()=>{if(runtime){runtime.debug=!runtime.debug;coreToast(runtime.debug?'Moving Screen debug on':'Moving Screen debug off');}});
    screen.querySelector('#movingScreenCanvas').addEventListener('pointerdown',onCanvasPointer,{passive:false});
    return screen;
  }

  function makeRuntime(){
    const screen=ensureScreen(),canvas=screen.querySelector('#movingScreenCanvas');
    const ctx=canvas.getContext('2d');
    const destructibles=STAGE.destructibles.map(d=>({...d,hp:d.maxHp,broken:false,flash:0,tapCd:0}));
    const r={
      active:true,screen,canvas,ctx,w:1,h:1,dpr:1,debug:false,
      cameraX:STAGE.cameraX,cameraY:STAGE.cameraStops[0],cameraFrom:STAGE.cameraStops[0],cameraTarget:STAGE.cameraStops[0],cameraVelocity:0,
      stopIndex:0,phase:'pause',phaseT:0,pauseLeft:CAMERA_PAUSE,
      sp:60,summonCost:10,entities:[],destructibles,effects:[],selectedId:null,
      enemySpawnT:1.3,enemyThinkT:0,kills:0,finished:false,
      toast:screen.querySelector('.msToast'),
      deck:activeDeck().map(entry=>({...entry})),
      hint:screen.querySelector('[data-ms-hint]'),
      hudSp:screen.querySelector('[data-ms-sp]'),hudPhase:screen.querySelector('[data-ms-phase]'),hudTime:screen.querySelector('[data-ms-time]'),summonBtn:screen.querySelector('[data-ms-summon]'),
    };
    STAGE.zones.forEach(zone=>{zone._spots=makeSpots(zone);});
    return r;
  }

  function start(){
    if(runtime?.active) return;
    document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
    const screen=ensureScreen();screen.classList.add('active');
    runtime=makeRuntime();
    resize();
    seedEnemies();
    updateHud();
    lastTime=performance.now();accumulator=0;
    cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
    coreToast('Moving Screen · camera border is lethal');
  }

  function exit(){
    if(runtime){runtime.active=false;runtime.entities.length=0;runtime.effects.length=0;}
    cancelAnimationFrame(raf);raf=0;lastTime=0;accumulator=0;
    document.getElementById('movingScreenScreen')?.classList.remove('active');
    runtime=null;coreShowScreen('mode');
  }

  function finish(win,reason){
    if(!runtime || runtime.finished) return;
    runtime.finished=true;runtime.phase='finished';
    const panel=runtime.screen.querySelector('.msResult');
    panel.classList.add('show');
    runtime.screen.querySelector('[data-ms-result-title]').textContent=win?'ROOFTOP CLEARED':'SCREEN OUT';
    runtime.screen.querySelector('[data-ms-result-text]').textContent=reason || (win?`You reached the sign crown with ${playerEntities().length} Dice still in play.`:'Every player Die was lost to combat or a camera death plane.');
  }

  function resize(){
    if(!runtime?.canvas) return;
    const rect=runtime.canvas.getBoundingClientRect();if(rect.width<40||rect.height<100)return;
    const dpr=clamp(window.devicePixelRatio||1,1,2);runtime.dpr=dpr;runtime.w=rect.width;runtime.h=rect.height;
    runtime.canvas.width=Math.round(rect.width*dpr);runtime.canvas.height=Math.round(rect.height*dpr);runtime.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize',()=>{if(runtime?.active)requestAnimationFrame(resize);});

  function makeSpots(zone){
    const count=zone.slots||1,cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols),spots=[];
    const usableW=zone.w*.68,usableD=zone.d*.58;
    for(let i=0;i<count;i++){
      const c=i%cols,r=Math.floor(i/cols),colsThis=Math.min(cols,count-r*cols);
      const x=zone.x + (colsThis===1?0:(c/(colsThis-1)-.5)*usableW);
      const z=zone.z + (rows===1?0:(r/(rows-1)-.5)*usableD);
      spots.push({x,z,y:zone.y});
    }
    return spots;
  }

  function projectPoint(x,z,y,cameraY=runtime?.cameraY||0){
    const W=runtime?.w||1,H=runtime?.h||1;
    const baseScale=clamp(W/720,.5,.86),depth=(z+260)/520,persp=.87+depth*.18;
    const relX=x-(runtime?.cameraX||STAGE.cameraX);
    return {x:W*.5+relX*baseScale*persp,y:H*.78+z*.20*baseScale-(y-cameraY)*baseScale-relX*.018*baseScale,scale:baseScale*persp};
  }
  function nodePoint(id,cameraY){const n=nodeById(id);return n?projectPoint(n.x,n.z,n.y,cameraY):null;}
  function worldDistance(a,b){return Math.hypot((a.x-b.x),(a.y-b.y)*1.08,(a.z-b.z)*.62);}
  function edgeLength(edge){const a=nodeById(edge.from),b=nodeById(edge.to);return a&&b?worldDistance(a,b):9999;}
  function opposite(edge,nodeId){return edge.from===nodeId?edge.to:edge.from;}
  function adjacentEdges(nodeId){return STAGE.edges.filter(edge=>edge.from===nodeId||edge.to===nodeId);}

  function edgeEnabled(edge){
    if(!edge)return false;
    if(edge.requiresBroken){const d=destructibleById(edge.requiresBroken);if(d&&!d.broken)return false;}
    if(edge.requiresIntact){const d=destructibleById(edge.requiresIntact);if(d&&d.broken)return false;}
    return true;
  }
  function blockingDestructible(edge){
    if(edge?.requiresBroken){const d=destructibleById(edge.requiresBroken);if(d&&!d.broken)return d;}
    if(edge?.requiresIntact){const d=destructibleById(edge.requiresIntact);if(d&&d.broken)return null;}
    return null;
  }
  function edgeBusy(edge,exceptId){return runtime.entities.some(e=>e.id!==exceptId&&e.alive&&e.moving?.edgeId===edge.id);}
  function junctionBusy(nodeId,exceptId){return isJunction(nodeId)&&runtime.entities.some(e=>e.id!==exceptId&&e.alive&&!e.moving&&e.nodeId===nodeId);}

  function spotOwner(zoneId,slotIdx,exceptId){return runtime.entities.find(e=>e.id!==exceptId&&e.alive&&e.zoneId===zoneId&&e.slotIdx===slotIdx&&!e.moving) || null;}
  function firstFreeSpot(zoneId,exceptId){const zone=zoneById(zoneId);if(!zone)return -1;for(let i=0;i<zone._spots.length;i++)if(!spotOwner(zoneId,i,exceptId))return i;return -1;}
  function freeSpotCount(zoneId){const z=zoneById(zoneId);if(!z)return 0;let n=0;for(let i=0;i<z._spots.length;i++)if(!spotOwner(zoneId,i,null))n++;return n;}
  function placeAtZone(entity,zoneId,slotIdx=null){
    const zone=zoneById(zoneId);if(!zone)return false;const s=slotIdx==null?firstFreeSpot(zoneId,entity.id):slotIdx;if(s<0||spotOwner(zoneId,s,entity.id))return false;
    const p=zone._spots[s];entity.zoneId=zoneId;entity.nodeId=zoneId;entity.slotIdx=s;entity.world={...p};entity.moving=null;entity.awaitingBranch=false;entity.cameFrom=null;entity.airborne=null;return true;
  }

  function currentSummonZones(){
    if(!runtime)return[];
    return STAGE.zones.filter(z=>z.summon&&freeSpotCount(z.id)>0).filter(z=>{
      const p=projectPoint(z.x,z.z,z.y);return p.x>20&&p.x<runtime.w-20&&p.y>50&&p.y<runtime.h-45;
    }).sort((a,b)=>Math.abs(a.y-runtime.cameraY)-Math.abs(b.y-runtime.cameraY));
  }

  function classMult(cls){return 1+(Math.max(1,cls)-1)*.06;}
  function makeDieEntity(entry){
    const catalog=dieCatalog(),key=typeof entry==='string'?entry:entry?.key,def=catalog?.[key];if(!def)return null;
    const inst=entry?.instId?findOwned(key,entry.instId):null,cls=inst?.cls||1,dot=1,maxHp=Math.max(1,Math.round((def.hp||50)*classMult(cls)));
    return {id:nowId('die'),faction:'player',type:'die',key,name:def.name||key,alive:true,dot,cls,pu:0,hp:maxHp,maxHp,
      damage:Math.max(1,(def.dmg||8)*classMult(cls)),attackInterval:Math.max(.18,def.atk||1),range:rangeForDie(def),moveSpeed:190,
      attackT:Math.random()*.4,zoneId:null,nodeId:null,slotIdx:null,world:{x:0,z:0,y:0},moving:null,awaitingBranch:false,cameFrom:null,airborne:null,hitFlash:0};
  }
  function rangeForDie(def){
    const r=def?.special?.range;
    if(r==='close')return 190;if(r==='mid')return 320;if(r==='midfar')return 410;if(r==='map')return 900;
    if(def?.target==='none')return 0;return 335;
  }
  function summonDie(){
    if(!runtime?.active||runtime.finished)return;
    if(runtime.sp<runtime.summonCost){coreToast('Not enough SP');return;}
    const zones=currentSummonZones();if(!zones.length){coreToast('No safe summon spots in the current screen');return;}
    const zone=zones[0],free=zone._spots.map((_,i)=>i).filter(i=>!spotOwner(zone.id,i,null));if(!free.length)return;
    const entry=runtime.deck[Math.floor(Math.random()*runtime.deck.length)],entity=makeDieEntity(entry);if(!entity){coreToast('That deck entry could not be summoned');return;}
    const slot=free[Math.floor(Math.random()*free.length)];placeAtZone(entity,zone.id,slot);runtime.entities.push(entity);
    runtime.sp-=runtime.summonCost;runtime.summonCost=Math.min(34,runtime.summonCost+2);effect('summon',entity.world,'#d4ecfa');updateHud();
  }

  function monsterStats(key){
    const base=monsterCatalog()?.[key];
    const fallback={goblin:{hp:52,speed:150,name:'Goblin'},goblin_dog:{hp:42,speed:185,name:'Goblin Dog'},goblin_thrower:{hp:64,speed:140,name:'Goblin Thrower'}}[key]||{hp:55,speed:150,name:'Enemy'};
    const hp=Math.max(20,Number(base?.hp)||fallback.hp),speed=Math.max(80,Number(base?.speed)||fallback.speed);
    return {name:base?.name||fallback.name,hp,moveSpeed:clamp(speed*3.6,135,205),damage:Math.max(4,hp*.12),attackInterval:key==='goblin_thrower'?1.3:1.05,range:key==='goblin_thrower'?340:175};
  }
  function makeEnemyEntity(key){const s=monsterStats(key);return{id:nowId('enemy'),faction:'enemy',type:'monster',key,name:s.name,alive:true,hp:s.hp,maxHp:s.hp,damage:s.damage,attackInterval:s.attackInterval,range:s.range,moveSpeed:s.moveSpeed,attackT:Math.random()*.5,zoneId:null,nodeId:null,slotIdx:null,world:{x:0,z:0,y:0},moving:null,awaitingBranch:false,cameFrom:null,airborne:null,aiPlan:null,aiT:Math.random()*.5,hitFlash:0};}
  function visibleEnemySpawnZones(){
    return STAGE.zones.filter(z=>z.enemySpawn&&freeSpotCount(z.id)>0).map(z=>({z,p:projectPoint(z.x,z.z,z.y)})).filter(o=>o.p.x>20&&o.p.x<runtime.w-20&&o.p.y>45&&o.p.y<runtime.h*.48).sort((a,b)=>a.p.y-b.p.y).map(o=>o.z);
  }
  function spawnEnemy(){
    if(!runtime||enemyEntities().length>=MAX_ENEMIES)return false;
    const zones=visibleEnemySpawnZones();if(!zones.length)return false;
    const zone=zones[Math.floor(Math.random()*Math.min(2,zones.length))],keys=['goblin','goblin_dog','goblin_thrower'],entity=makeEnemyEntity(keys[Math.floor(Math.random()*keys.length)]);
    if(!placeAtZone(entity,zone.id))return false;runtime.entities.push(entity);effect('spawn',entity.world,'#ff9a91');return true;
  }
  function seedEnemies(){spawnEnemy();spawnEnemy();}

  const playerEntities=()=>runtime?.entities.filter(e=>e.alive&&e.faction==='player')||[];
  const enemyEntities=()=>runtime?.entities.filter(e=>e.alive&&e.faction==='enemy')||[];
  const hostilesFor=e=>runtime.entities.filter(o=>o.alive&&o.faction!==e.faction);

  function startMove(entity,edgeId,nextNodeId){
    const edge=edgeById(edgeId);if(!entity?.alive||entity.moving||!edge||!edgeEnabled(edge)||edgeBusy(edge,entity.id))return false;
    const from=entity.nodeId,to=nextNodeId||opposite(edge,from);if(!from||!to||opposite(edge,from)!==to)return false;
    if(junctionBusy(to,entity.id))return false;
    if(isZone(to)&&firstFreeSpot(to,entity.id)<0)return false;
    if(runtime.phase!=='transition'&&!edgeSafeAtCamera(edge,entity.moveSpeed,runtime.cameraY,0))return false;
    if(entity.faction==='enemy'&&runtime.phase==='transition'&&!edgeSafeDuringTransition(edge,entity.moveSpeed))return false;
    const a=nodeById(from),b=nodeById(to);if(!a||!b)return false;
    entity.zoneId=null;entity.slotIdx=null;entity.awaitingBranch=false;entity.cameFrom=from;
    entity.moving={edgeId:edge.id,from,to,t:0,dur:Math.max(.35,edgeLength(edge)/entity.moveSpeed)};
    return true;
  }

  function updateMovement(entity,dt){
    const m=entity.moving;if(!m)return;const a=nodeById(m.from),b=nodeById(m.to);if(!a||!b){entity.moving=null;return;}
    m.t+=dt;const t=clamp(m.t/m.dur,0,1),s=t*t*(3-2*t);entity.world={x:lerp(a.x,b.x,s),z:lerp(a.z,b.z,s),y:lerp(a.y,b.y,s)};
    if(t<1)return;
    entity.moving=null;entity.nodeId=m.to;entity.cameFrom=m.from;
    if(isZone(m.to)){
      const slot=firstFreeSpot(m.to,entity.id);if(slot>=0)placeAtZone(entity,m.to,slot);else{entity.awaitingBranch=true;entity.zoneId=null;}
    }else{
      entity.zoneId=null;entity.slotIdx=null;entity.awaitingBranch=true;
      if(entity.faction==='enemy')chooseAiBranch(entity);
    }
  }

  function edgePathPoints(edge){const a=nodeById(edge.from),b=nodeById(edge.to);return a&&b?[a,b]:[];}
  function edgeSafeAtCamera(edge,speed,cameraY,margin=0){
    const pts=edgePathPoints(edge);if(pts.length<2)return false;const a=pts[0],b=pts[1];for(let i=0;i<=10;i++){const t=i/10,p=projectPoint(lerp(a.x,b.x,t),lerp(a.z,b.z,t),lerp(a.y,b.y,t),cameraY);if(p.x<margin||p.x>runtime.w-margin||p.y<margin||p.y>runtime.h-margin)return false;}return true;
  }
  function predictedCameraY(seconds){
    if(runtime.phase!=='transition')return runtime.cameraY;
    const future=clamp((runtime.phaseT+seconds)/CAMERA_TRAVEL,0,1);return lerp(runtime.cameraFrom,runtime.cameraTarget,ease(future));
  }
  function edgeSafeDuringTransition(edge,speed){
    const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)return false;const dur=edgeLength(edge)/Math.max(1,speed);let minMargin=999;
    for(let i=0;i<=10;i++){const t=i/10,cam=predictedCameraY(dur*t),p=projectPoint(lerp(a.x,b.x,t),lerp(a.z,b.z,t),lerp(a.y,b.y,t),cam);minMargin=Math.min(minMargin,p.x,runtime.w-p.x,p.y,runtime.h-p.y);}
    return minMargin>=-2;
  }

  function graphCost(edge,entity,allowBlocked=false){
    let cost=edgeLength(edge);const blocker=blockingDestructible(edge);if(blocker){if(!allowBlocked)return Infinity;cost+=150+blocker.hp*.7;}
    if(!edgeEnabled(edge)&&!blocker)return Infinity;
    if(edgeBusy(edge,entity?.id))cost+=120;
    if(runtime.phase==='pause'&&!edgeSafeAtCamera(edge,entity?.moveSpeed||170,runtime.cameraY,0))return Infinity;
    if(runtime.phase==='transition'&&entity?.faction==='enemy'&&!edgeSafeDuringTransition(edge,entity.moveSpeed))return Infinity;
    return cost;
  }
  function shortestPath(start,goal,entity,allowBlocked=true){
    if(!start||!goal)return null;const nodes=[...STAGE.zones,...STAGE.junctions].map(n=>n.id),dist=new Map(nodes.map(n=>[n,Infinity])),prev=new Map();dist.set(start,0);const open=new Set(nodes);
    while(open.size){let u=null,best=Infinity;for(const n of open){const d=dist.get(n);if(d<best){best=d;u=n;}}if(u==null||best===Infinity)break;open.delete(u);if(u===goal)break;
      for(const edge of adjacentEdges(u)){const v=opposite(edge,u);if(!open.has(v))continue;const c=graphCost(edge,entity,allowBlocked);if(!Number.isFinite(c))continue;const nd=best+c;if(nd<dist.get(v)){dist.set(v,nd);prev.set(v,{node:u,edge:edge.id});}}
    }
    if(!prev.has(goal)&&start!==goal)return null;const steps=[];let cur=goal;while(cur!==start){const p=prev.get(cur);if(!p)return null;steps.push({from:p.node,to:cur,edgeId:p.edge});cur=p.node;}steps.reverse();return steps;
  }

  function playerRouteOptions(entity){
    if(!entity?.alive||entity.moving||entity.airborne)return[];const node=entity.nodeId;if(!node)return[];
    return adjacentEdges(node).map(edge=>({edge,to:opposite(edge,node)})).filter(({edge,to})=>{
      if(!edgeEnabled(edge)||edgeBusy(edge,entity.id)||junctionBusy(to,entity.id))return false;if(isZone(to)&&firstFreeSpot(to,entity.id)<0)return false;
      if(runtime.phase!=='transition'&&!edgeSafeAtCamera(edge,entity.moveSpeed,runtime.cameraY,0))return false;return true;
    });
  }
  function choosePlayerRoute(entity,edgeId){const edge=edgeById(edgeId);if(!edge)return false;const option=playerRouteOptions(entity).find(o=>o.edge.id===edgeId);if(!option)return false;return startMove(entity,edge.id,option.to);}

  function chooseAiBranch(entity){
    if(!entity?.alive||entity.moving||!entity.nodeId)return false;
    const targets=playerEntities().filter(p=>p.zoneId);if(!targets.length)return false;
    targets.sort((a,b)=>worldDistance(entity.world,a.world)-worldDistance(entity.world,b.world));
    let best=null;for(const target of targets){const path=shortestPath(entity.nodeId,target.zoneId,entity,true);if(path&&(!best||path.length<best.length))best=path;}
    if(!best?.length)return false;const first=best[0],edge=edgeById(first.edgeId),blocker=blockingDestructible(edge);
    if(blocker){entity.aiBarrier=blocker.id;return false;}
    return startMove(entity,edge.id,first.to);
  }

  function updateAI(entity,dt){
    if(entity.moving||entity.airborne)return;entity.aiT=(entity.aiT||0)-dt;if(entity.aiT>0)return;entity.aiT=.35+Math.random()*.35;
    if(entity.aiBarrier){const d=destructibleById(entity.aiBarrier);if(!d||d.broken)entity.aiBarrier=null;else if(worldDistance(entity.world,d)<entity.range+80)return;else entity.aiBarrier=null;}
    const same=hostilesFor(entity).find(h=>h.zoneId&&h.zoneId===entity.zoneId&&!h.moving);if(same)return;
    const stationaryTarget=pickCombatTarget(entity);if(stationaryTarget&&runtime.phase==='pause')return;
    chooseAiBranch(entity);
  }

  function barrierAttackableBy(entity,d){return entity?.alive&&!entity.moving&&!entity.airborne&&!d.broken&&worldDistance(entity.world,d)<=Math.max(190,entity.range+70);}
  function attackBarrier(entity,d,scale=1){if(!barrierAttackableBy(entity,d))return false;d.hp=Math.max(0,d.hp-entity.damage*.7*scale);d.flash=.16;effect('hit',d,'#ffd5a2');if(d.hp<=0)breakDestructible(d,entity.faction);return true;}
  function breakDestructible(d,byFaction){if(d.broken)return;d.broken=true;d.hp=0;effect('break',d,'#f3d491');coreToast(`${d.name} broken${byFaction==='enemy'?' by the enemy':''}`);}

  function sameZone(a,b){return !!(a.zoneId&&b.zoneId&&a.zoneId===b.zoneId&&!a.moving&&!b.moving);}
  function pointSegmentDistance(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(l2<=.0001)return Math.hypot(px-ax,py-ay);const t=clamp(((px-ax)*dx+(py-ay)*dy)/l2,0,1);return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));}
  function hasLineOfSight(a,b){
    if(sameZone(a,b))return true;const blockers=[...STAGE.obstacles];runtime.destructibles.filter(d=>!d.broken&&d.losBlocker).forEach(d=>blockers.push(d));
    for(const o of blockers){if(pointSegmentDistance(o.x,o.y,a.world.x,a.world.y,b.world.x,b.world.y)<(o.r||30))return false;}return true;
  }
  function canAttack(a,b){
    if(!a?.alive||!b?.alive||a.faction===b.faction||a.moving||b.moving||a.airborne||b.airborne||!a.zoneId||!b.zoneId)return false;
    if(sameZone(a,b))return true;if(runtime.phase==='transition')return false;
    return worldDistance(a.world,b.world)<=a.range&&hasLineOfSight(a,b);
  }
  function pickCombatTarget(entity){
    const list=hostilesFor(entity).filter(h=>canAttack(entity,h));if(!list.length)return null;
    list.sort((a,b)=>{const sameA=sameZone(entity,a)?0:1,sameB=sameZone(entity,b)?0:1;if(sameA!==sameB)return sameA-sameB;return worldDistance(entity.world,a.world)-worldDistance(entity.world,b.world);});return list[0];
  }

  function specialImpulse(def){
    const sp=def?.special||{},kind=String(sp.kind||'').toLowerCase();let knock=Number(sp.knockback||sp.knock||0)||0,launch=0;
    if(kind.includes('heavensfist')||kind.includes('launch'))launch=170;if(kind.includes('whirlwind'))knock=Math.max(knock,18);return{knock,launch};
  }
  function applyImpulse(target,attacker,knock,launch){
    if(!target?.alive||(!knock&&!launch))return;const dx=target.world.x-attacker.world.x,dy=target.world.y-attacker.world.y,len=Math.max(1,Math.hypot(dx,dy));
    target.zoneId=null;target.nodeId=null;target.slotIdx=null;target.moving=null;target.awaitingBranch=false;
    target.airborne={vx:(dx/len)*(50+knock*2.6),vz:0,vy:Math.max(75,launch||knock*1.4),prevY:target.world.y};
  }
  function updateAirborne(e,dt){
    const a=e.airborne;if(!a)return;a.prevY=e.world.y;e.world.x+=a.vx*dt;e.world.z+=a.vz*dt;e.world.y+=a.vy*dt;a.vy-=430*dt;a.vx*=Math.pow(.985,dt*60);
    if(a.vy<=0){const candidates=STAGE.zones.filter(z=>Math.abs(e.world.x-z.x)<=z.w*.5&&Math.abs(e.world.z-z.z)<=z.d*.5&&a.prevY>=z.y&&e.world.y<=z.y+4).sort((x,y)=>y.y-x.y);for(const z of candidates){const slot=firstFreeSpot(z.id,e.id);if(slot>=0){placeAtZone(e,z.id,slot);effect('land',e.world,'#d4ecfa');return;}}}
  }

  function hurt(target,amount,attacker){
    if(!target?.alive)return;target.hp-=Math.max(1,amount);target.hitFlash=.12;effect('damage',target.world,attacker?.faction==='player'?'#d4ecfa':'#ff9a91');
    if(target.hp<=0)killEntity(target,attacker?.faction==='player'?'defeated':'destroyed');
  }
  function killEntity(entity,reason){
    if(!entity?.alive)return;entity.alive=false;entity.hp=0;if(runtime.selectedId===entity.id)runtime.selectedId=null;effect('death',entity.world,entity.faction==='player'?'#d4ecfa':'#ff9a91');
    if(entity.faction==='enemy'){runtime.kills++;runtime.sp=Math.min(999,runtime.sp+7);}
    if(entity.faction==='player'&&playerEntities().length===0&&runtime.stopIndex>0)finish(false,'Every player Die was destroyed or crossed a camera death plane.');
  }
  function updateCombat(entity,dt){
    if(!entity.alive||entity.moving||entity.airborne||entity.awaitingBranch)return;
    if(entity.aiBarrier){const d=destructibleById(entity.aiBarrier);if(d&&!d.broken&&barrierAttackableBy(entity,d)){entity.attackT+=dt;const interval=entity.attackInterval/(runtime.phase==='transition'?MOVING_AS_MULT:1);if(entity.attackT>=interval){entity.attackT-=interval;attackBarrier(entity,d);}return;}}
    const target=pickCombatTarget(entity);if(!target){entity.attackT=Math.min(entity.attackT+dt,entity.attackInterval);return;}
    entity.attackT+=dt;const interval=entity.attackInterval/(runtime.phase==='transition'?MOVING_AS_MULT:1);if(entity.attackT<interval)return;entity.attackT-=interval;
    hurt(target,entity.damage,entity);effect('shot',{x:lerp(entity.world.x,target.world.x,.5),z:lerp(entity.world.z,target.world.z,.5),y:lerp(entity.world.y,target.world.y,.5)},entity.faction==='player'?'#f3d491':'#ff8c82');
    if(entity.type==='die'){const def=dieCatalog()?.[entity.key],imp=specialImpulse(def);if(imp.knock||imp.launch)applyImpulse(target,entity,imp.knock,imp.launch);}
  }

  function mergeDice(source,target){
    if(!source||!target||source===target||source.faction!=='player'||target.faction!=='player'||source.type!=='die'||target.type!=='die'||source.moving||target.moving||source.airborne||target.airborne)return false;
    if(source.key!==target.key||source.dot!==target.dot||target.dot>=7)return false;
    const ratio=target.hp/Math.max(1,target.maxHp);source.alive=false;target.dot+=1;target.damage*=1.22;target.attackInterval=Math.max(.16,target.attackInterval/1.12);target.maxHp=Math.round(target.maxHp*1.22);target.hp=Math.max(1,target.maxHp*ratio);runtime.selectedId=target.id;effect('merge',target.world,'#f3d491');coreToast(`${target.name} merged to ${target.dot} pips`);return true;
  }

  function updateDeathPlanes(){
    for(const e of runtime.entities){if(!e.alive)continue;const p=projectPoint(e.world.x,e.world.z,e.world.y);if(p.x<0||p.x>runtime.w||p.y<0||p.y>runtime.h)killEntity(e,'screened out');}
  }

  function updateCamera(dt){
    if(runtime.phase==='pause'){
      runtime.phaseT+=dt;runtime.pauseLeft=Math.max(0,CAMERA_PAUSE-runtime.phaseT);
      if(runtime.phaseT>=CAMERA_PAUSE){
        if(runtime.stopIndex>=STAGE.cameraStops.length-1){if(enemyEntities().length===0||runtime.phaseT>=CAMERA_PAUSE+8)finish(true);return;}
        runtime.phase='transition';runtime.phaseT=0;runtime.cameraFrom=runtime.cameraY;runtime.cameraTarget=STAGE.cameraStops[runtime.stopIndex+1];runtime.cameraVelocity=(runtime.cameraTarget-runtime.cameraFrom)/CAMERA_TRAVEL;coreToast('MOVE! Camera death planes are live');
      }
    }else if(runtime.phase==='transition'){
      runtime.phaseT+=dt;const t=clamp(runtime.phaseT/CAMERA_TRAVEL,0,1);runtime.cameraY=lerp(runtime.cameraFrom,runtime.cameraTarget,ease(t));
      if(t>=1){runtime.cameraY=runtime.cameraTarget;runtime.stopIndex++;runtime.phase='pause';runtime.phaseT=0;runtime.pauseLeft=CAMERA_PAUSE;runtime.cameraVelocity=0;coreToast(`Camera stop ${runtime.stopIndex+1}/${STAGE.cameraStops.length}`);}
    }
  }

  function updateEnemies(dt){
    runtime.enemySpawnT-=dt;if(runtime.enemySpawnT<=0){runtime.enemySpawnT=3.7+Math.random()*1.5;spawnEnemy();}
    for(const e of enemyEntities())updateAI(e,dt);
  }
  function updateDestructibles(dt){for(const d of runtime.destructibles){d.flash=Math.max(0,d.flash-dt);d.tapCd=Math.max(0,d.tapCd-dt);}}
  function updateEffects(dt){for(let i=runtime.effects.length-1;i>=0;i--){const e=runtime.effects[i];e.t+=dt;if(e.t>=e.life)runtime.effects.splice(i,1);}}
  function effect(kind,p,color){runtime?.effects.push({kind,x:p.x,z:p.z||0,y:p.y,t:0,life:kind==='death'?.65:.38,color:color||'#fff'});}

  function update(dt){
    if(!runtime?.active||runtime.finished)return;
    updateCamera(dt);
    runtime.sp=Math.min(999,runtime.sp+dt*.8);
    for(const e of runtime.entities){if(!e.alive)continue;if(e.moving)updateMovement(e,dt);if(e.airborne)updateAirborne(e,dt);e.hitFlash=Math.max(0,e.hitFlash-dt);}
    updateDeathPlanes();
    updateEnemies(dt);
    for(const e of runtime.entities)if(e.alive)updateCombat(e,dt);
    updateDestructibles(dt);updateEffects(dt);runtime.entities=runtime.entities.filter(e=>e.alive||e.hitFlash>0);
    updateHud();
  }

  function updateHud(){
    if(!runtime)return;runtime.hudSp.textContent=Math.floor(runtime.sp);runtime.hudPhase.textContent=runtime.phase==='transition'?'MOVING':'PAUSE';runtime.hudTime.textContent=Math.ceil(runtime.phase==='transition'?Math.max(0,CAMERA_TRAVEL-runtime.phaseT):Math.max(0,CAMERA_PAUSE-runtime.phaseT));
    runtime.summonBtn.textContent=`Summon · ${runtime.summonCost} SP`;runtime.summonBtn.disabled=runtime.sp<runtime.summonCost||!currentSummonZones().length||runtime.finished;
    const sel=runtime.entities.find(e=>e.id===runtime.selectedId&&e.alive);if(sel?.awaitingBranch)runtime.hint.textContent='CROSSROADS — choose a glowing branch marker. The Die cannot attack while waiting.';else if(sel)runtime.hint.textContent=`${sel.name} selected · tap a route marker, or tap a compatible ${sel.dot}-pip ${sel.name} to merge.`;else runtime.hint.textContent=runtime.phase==='transition'?'Camera moving — risky routes are NOT safety-checked for player Dice.':'Select a Die, then choose a white route marker.';
  }

  function pathPolyline(edge){const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)return[];return[projectPoint(a.x,a.z,a.y),projectPoint(b.x,b.z,b.y)];}
  function drawRoundedRect(g,x,y,w,h,r,stroke,fill){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else{g.rect(x,y,w,h);}if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.stroke();}}
  function zoneScreenRect(zone){const c=projectPoint(zone.x,zone.z,zone.y),s=c.scale,w=zone.w*s,h=Math.max(24,zone.d*.18*s+30*s);return{x:c.x-w/2,y:c.y-h*.72,w,h};}

  function drawBackground(g){
    const W=runtime.w,H=runtime.h,grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#070916');grad.addColorStop(.55,'#111528');grad.addColorStop(1,'#050710');g.fillStyle=grad;g.fillRect(0,0,W,H);
    const drift=runtime.cameraY*.08;
    for(let i=0;i<10;i++){const bw=52+(i%4)*20,bh=150+(i%5)*45,x=((i*127-runtime.cameraX*.03)%(W+160))-80,y=H*.48+((drift*(.14+(i%3)*.05))%130)-bh;g.fillStyle=i%2?'#0d1020':'#101427';g.fillRect(x,y,bw,bh);g.fillStyle='rgba(238,211,126,.16)';for(let wy=y+16;wy<y+bh-8;wy+=18)for(let wx=x+9;wx<x+bw-7;wx+=16)if(((wx+wy+i*17)|0)%3)g.fillRect(wx,wy,4,6);}
    g.save();g.globalAlpha=.32;g.strokeStyle='#b94dff';g.lineWidth=3;g.beginPath();g.moveTo(W*.08,H*.18+(runtime.cameraY*.03)%40);g.lineTo(W*.08,H*.42+(runtime.cameraY*.03)%40);g.stroke();g.strokeStyle='#40caff';g.beginPath();g.moveTo(W*.9,H*.12+(runtime.cameraY*.025)%50);g.lineTo(W*.9,H*.34+(runtime.cameraY*.025)%50);g.stroke();g.restore();
  }

  function drawPlatforms(g){
    const sorted=[...STAGE.zones].sort((a,b)=>a.z-b.z||a.y-b.y);
    for(const z of sorted){const r=zoneScreenRect(z);const visible=r.y+r.h>-80&&r.y<runtime.h+80;if(!visible)continue;g.save();g.fillStyle=z.choke?'rgba(52,57,70,.92)':'rgba(43,47,61,.94)';g.strokeStyle='rgba(10,12,18,.9)';g.lineWidth=2;drawRoundedRect(g,r.x,r.y,r.w,r.h,8,null,g.fillStyle);g.fillStyle='rgba(255,255,255,.035)';for(let x=r.x+10;x<r.x+r.w-6;x+=26)g.fillRect(x,r.y+7,1,r.h-14);g.lineWidth=1.5;drawRoundedRect(g,r.x+2,r.y+2,r.w-4,r.h-4,10,WHITE,null);
      if(runtime.debug||z.choke){g.fillStyle=z.choke?'rgba(243,212,145,.62)':'rgba(255,255,255,.35)';g.font="700 8px 'Space Mono',monospace";g.textAlign='center';g.fillText(z.choke?`${z.name} · CHOKE`:z.name,r.x+r.w/2,r.y+12);}g.restore();}
  }

  function drawPaths(g){
    g.save();g.lineWidth=2;g.lineCap='round';g.lineJoin='round';
    for(const edge of STAGE.edges){const pts=pathPolyline(edge);if(pts.length<2)continue;const enabled=edgeEnabled(edge),blocker=blockingDestructible(edge);g.strokeStyle=enabled?WHITE:blocker?'rgba(255,255,255,.09)':'rgba(226,88,79,.13)';g.setLineDash(enabled?[]:[5,7]);g.beginPath();g.moveTo(pts[0].x,pts[0].y);g.lineTo(pts[1].x,pts[1].y);g.stroke();g.setLineDash([]);}
    for(const j of STAGE.junctions){const degree=adjacentEdges(j.id).filter(edgeEnabled).length;if(degree<3)continue;const p=projectPoint(j.x,j.z,j.y);for(let i=-1;i<=1;i++){g.fillStyle=WHITE;g.beginPath();g.arc(p.x+i*6,p.y,2.2,0,Math.PI*2);g.fill();}}
    g.restore();
  }

  function drawObstacles(g){
    for(const o of STAGE.obstacles){const p=projectPoint(o.x,o.z,o.y),s=p.scale;if(p.y<-100||p.y>runtime.h+100)continue;g.save();g.translate(p.x,p.y);g.scale(s,s);g.fillStyle='#202432';g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=2;if(o.id==='water_tank'){g.fillRect(-26,-72,52,72);g.beginPath();g.ellipse(0,-72,26,9,0,0,Math.PI*2);g.fill();g.stroke();}else{g.fillRect(-o.r*.55,-(o.h||70)*.7,o.r*1.1,(o.h||70)*.7);g.strokeRect(-o.r*.55,-(o.h||70)*.7,o.r*1.1,(o.h||70)*.7);}g.restore();}
  }

  function drawDestructibles(g){
    for(const d of runtime.destructibles){const p=projectPoint(d.x,d.z,d.y),s=p.scale;if(p.y<-80||p.y>runtime.h+80)continue;g.save();g.translate(p.x,p.y);g.scale(s,s);g.globalAlpha=d.broken?.28:1;g.fillStyle=d.flash?'#fff0d0':d.id==='billboard_brace'?'#7a5a42':'#5e493b';g.strokeStyle='#c9a06c';g.lineWidth=2;if(d.broken){g.rotate(-.25);g.fillRect(-24,-5,48,8);}else{g.fillRect(-26,-34,52,34);for(let i=-18;i<=18;i+=12){g.beginPath();g.moveTo(i,-32);g.lineTo(i+8,0);g.stroke();}}g.restore();if(!d.broken){const pct=d.hp/d.maxHp;g.fillStyle='rgba(0,0,0,.65)';g.fillRect(p.x-25,p.y-44*s,50,5);g.fillStyle=pct>.5?'#d9b26a':'#e2584f';g.fillRect(p.x-24,p.y-43*s,48*pct,3);if(runtime.debug){g.fillStyle='#f3d491';g.font="700 7px 'Space Mono',monospace";g.textAlign='center';g.fillText(d.name,p.x,p.y-50*s);}}}
  }

  function drawEntity(g,e){
    if(!e.alive)return;const p=projectPoint(e.world.x,e.world.z,e.world.y),sc=p.scale,size=(e.type==='die'?38:32)*sc;g.save();g.translate(p.x,p.y);g.globalAlpha=e.hitFlash>0?.82:1;
    if(e.id===runtime.selectedId){g.strokeStyle='#f3d491';g.lineWidth=2;g.beginPath();g.ellipse(0,5,size*.72,size*.34,0,0,Math.PI*2);g.stroke();}
    if(e.type==='die'){
      const def=dieCatalog()?.[e.key];g.fillStyle=e.hitFlash>0?'#fff':(def?.color||'#8b7fe8');g.strokeStyle=def?.glow||'#d4ecfa';g.lineWidth=2;drawRoundedRect(g,-size/2,-size/2,size,size,6*sc,g.strokeStyle,g.fillStyle);g.fillStyle='rgba(255,255,255,.92)';const dots=Math.min(7,e.dot||1),pts=[[-.22,-.22],[.22,.22],[.22,-.22],[-.22,.22],[0,0],[0,-.28],[0,.28]].slice(0,dots);for(const [dx,dy] of pts){g.beginPath();g.arc(dx*size,dy*size,2.4*sc,0,Math.PI*2);g.fill();}
    }else{g.fillStyle=e.hitFlash>0?'#fff':(e.key==='goblin_thrower'?'#ab7f6f':e.key==='goblin_dog'?'#728a63':'#7b9b62');g.strokeStyle='rgba(0,0,0,.65)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,size*.46,0,Math.PI*2);g.fill();g.stroke();g.fillStyle='#ece7da';g.font=`700 ${Math.max(6,7*sc)}px 'Space Mono',monospace`;g.textAlign='center';g.fillText(e.name,0,-size*.68);}
    g.restore();const hpW=Math.max(24,size*1.25),pct=clamp(e.hp/e.maxHp,0,1);g.fillStyle='rgba(0,0,0,.62)';g.fillRect(p.x-hpW/2,p.y-size*.72-8,hpW,4);g.fillStyle=e.faction==='player'?'#78d992':'#e2584f';g.fillRect(p.x-hpW/2+1,p.y-size*.72-7,(hpW-2)*pct,2);
  }

  function drawRouteChoices(g){
    const e=runtime.entities.find(x=>x.id===runtime.selectedId&&x.alive);if(!e||e.moving||e.airborne)return;const options=playerRouteOptions(e);for(const o of options){const n=nodeById(o.to),p=projectPoint(n.x,n.z,n.y);g.save();g.fillStyle='rgba(243,212,145,.18)';g.strokeStyle=WHITE_STRONG;g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,10,0,Math.PI*2);g.fill();g.stroke();g.fillStyle='#f3d491';g.font="700 9px 'Space Mono',monospace";g.textAlign='center';g.fillText('›',p.x,p.y+3);g.restore();}
  }

  function drawEffects(g){for(const e of runtime.effects){const p=projectPoint(e.x,e.z,e.y),t=e.t/e.life;g.save();g.globalAlpha=1-t;g.strokeStyle=e.color;g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,5+t*18,0,Math.PI*2);g.stroke();g.restore();}}
  function drawDeathPlanes(g){if(!runtime.debug)return;g.save();g.strokeStyle='rgba(255,80,70,.75)';g.lineWidth=2;g.setLineDash([8,6]);g.strokeRect(1,1,runtime.w-2,runtime.h-2);g.setLineDash([]);g.fillStyle='rgba(255,80,70,.8)';g.font="700 8px 'Space Mono',monospace";g.fillText('DEATH PLANE',8,13);g.restore();}
  function drawForeground(g){
    const W=runtime.w,H=runtime.h,shift=(runtime.cameraY*.11)%180;g.save();g.globalAlpha=.55;g.strokeStyle='#232a38';g.lineWidth=8;g.beginPath();g.moveTo(-20,H*.68+shift);g.lineTo(W*.18,H*.54+shift);g.lineTo(W*.28,H*.63+shift);g.stroke();g.strokeStyle='rgba(244,72,218,.38)';g.lineWidth=4;g.strokeRect(W*.82,H*.55+shift*.22,54,100);g.restore();
  }
  function draw(){
    if(!runtime?.active)return;const g=runtime.ctx;if(!g)return;g.clearRect(0,0,runtime.w,runtime.h);drawBackground(g);drawPaths(g);drawPlatforms(g);drawObstacles(g);drawDestructibles(g);
    [...runtime.entities].filter(e=>e.alive).sort((a,b)=>a.world.z-b.world.z||a.world.y-b.world.y).forEach(e=>drawEntity(g,e));drawRouteChoices(g);drawEffects(g);drawForeground(g);drawDeathPlanes(g);
  }

  function hitEntity(px,py){let best=null,bestD=Infinity;for(const e of runtime.entities){if(!e.alive)continue;const p=projectPoint(e.world.x,e.world.z,e.world.y),d=Math.hypot(px-p.x,py-p.y);if(d<28&&d<bestD){best=e;bestD=d;}}return best;}
  function hitDestructible(px,py){for(const d of runtime.destructibles){if(d.broken)continue;const p=projectPoint(d.x,d.z,d.y);if(Math.hypot(px-p.x,py-p.y)<34)return d;}return null;}
  function hitRouteOption(entity,px,py){const options=playerRouteOptions(entity);for(const o of options){const n=nodeById(o.to),p=projectPoint(n.x,n.z,n.y);if(Math.hypot(px-p.x,py-p.y)<18)return o;}return null;}
  function onCanvasPointer(ev){
    if(!runtime?.active||runtime.finished)return;ev.preventDefault();const rect=runtime.canvas.getBoundingClientRect(),px=ev.clientX-rect.left,py=ev.clientY-rect.top;
    const d=hitDestructible(px,py);if(d){if(d.tapCd>0)return;d.tapCd=.28;const attackers=playerEntities().filter(e=>barrierAttackableBy(e,d));if(!attackers.length){coreToast('No stationary Die can reach that barrier');return;}attackers.sort((a,b)=>worldDistance(a.world,d)-worldDistance(b.world,d));attackBarrier(attackers[0],d,1.15);return;}
    const hit=hitEntity(px,py);const selected=runtime.entities.find(e=>e.id===runtime.selectedId&&e.alive);
    if(hit?.faction==='player'){
      if(selected&&selected!==hit&&mergeDice(selected,hit))return;runtime.selectedId=hit.id;return;
    }
    if(selected){const option=hitRouteOption(selected,px,py);if(option){if(!choosePlayerRoute(selected,option.edge.id)){coreToast(runtime.phase==='transition'?'That path is occupied or blocked':'That route is unsafe, occupied or blocked while the camera is stationary');}return;}}
    runtime.selectedId=null;
  }

  function frame(ts){
    if(!runtime?.active)return;const dt=Math.min(.08,Math.max(0,(ts-lastTime)/1000));lastTime=ts;accumulator+=dt;while(accumulator>=TICK){update(TICK);accumulator-=TICK;}draw();raf=requestAnimationFrame(frame);
  }

  window.addEventListener('keydown',e=>keys.add(e.code),true);window.addEventListener('keyup',e=>keys.delete(e.code),true);

  installStyles();installArcadeCards();
  const cardWatch=setInterval(()=>{if(document.getElementById('ttdMovingScreenCardV1')){clearInterval(cardWatch);return;}installArcadeCards();},500);
  setTimeout(()=>clearInterval(cardWatch),15000);

  window.TTDMovingScreen=Object.freeze({
    version:VERSION,
    stageId:STAGE.id,
    start,
    exit,
    get active(){return!!runtime?.active;},
    get state(){return runtime?{phase:runtime.phase,cameraY:runtime.cameraY,stopIndex:runtime.stopIndex,sp:runtime.sp,players:playerEntities().length,enemies:enemyEntities().length}:null;},
  });
})();