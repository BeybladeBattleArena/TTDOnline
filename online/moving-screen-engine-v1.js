(() => {
  'use strict';
  if (window.__TTD_MOVING_SCREEN_V1) return;
  window.__TTD_MOVING_SCREEN_V1 = true;

  const VERSION = 1;
  const STAGE_ID = 'neon_rooftops_v1';
  const MOVING_AS_MULT = 0.85;
  const SAFE_LINE = 'rgba(255,255,255,.25)';
  const SAFE_LINE_STRONG = 'rgba(255,255,255,.76)';
  const GOLD = '#f3d491';
  const DANGER = '#e2584f';
  const MIST = '#97a0bd';
  const TICK = 1 / 60;

  let runtime = null;
  let raf = 0;
  let accumulator = 0;
  let lastTime = 0;
  let serial = 1;

  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const lerp = (a,b,t) => a+(b-a)*t;
  const ease = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
  const nowId = prefix => `${prefix}_${serial++}`;

  function stageAuthority(){
    return window.TTDMovingScreenStages?.[STAGE_ID] || null;
  }
  function dieCatalog(){ try{return typeof DICE!=='undefined' ? DICE : null;}catch(_){return null;} }
  function activeDeck(){ try{return typeof getActiveDeck==='function' ? getActiveDeck() : [];}catch(_){return [];} }
  function findOwned(key,id){ try{return typeof findInstance==='function' ? findInstance(key,id) : null;}catch(_){return null;} }
  function coreShowScreen(name){
    try{ if(typeof showScreen==='function'){ showScreen(name); return; } }catch(_){}
    document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
    document.getElementById(name==='mode'?'modeScreen':'homeScreen')?.classList.add('active');
  }
  function coreToast(message){
    try{ if(typeof toastGlobal==='function'){ toastGlobal(message); return; } }catch(_){}
    if(runtime?.toast){
      runtime.toast.textContent=message;runtime.toast.classList.add('show');clearTimeout(runtime.toast._t);
      runtime.toast._t=setTimeout(()=>runtime?.toast?.classList.remove('show'),1300);
    }
  }

  function installStyles(){
    if(document.getElementById('ttdMovingScreenStyleV1')) return;
    const style=document.createElement('style');
    style.id='ttdMovingScreenStyleV1';
    style.textContent=`
      #movingScreenScreen{background:#050712;}
      #movingScreenScreen .msTop{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #273052;background:linear-gradient(180deg,#171d34,#0b1020);z-index:7;box-shadow:0 4px 18px rgba(0,0,0,.34)}
      #movingScreenScreen .msBack{appearance:none;border:1px solid #30385d;background:#171c34;color:#ece7da;border-radius:8px;padding:7px 10px;font-size:11px}
      #movingScreenScreen .msTitleWrap{min-width:0}.msTitle{font:700 12px 'Cinzel',serif;color:#d4ecfa;letter-spacing:.07em;white-space:nowrap}.msSubtitle{font:700 7px 'Space Mono',monospace;color:#70799b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #movingScreenScreen .msStats{margin-left:auto;display:flex;gap:6px;align-items:center}.msPill{border:1px solid #2a3160;border-radius:14px;background:#11162a;padding:5px 8px;color:#ccd3e3;font:700 9px 'Space Mono',monospace;white-space:nowrap}.msPill strong{color:#f3d491}.msPill.moving{border-color:rgba(226,88,79,.55);color:#ffb0a9;box-shadow:0 0 10px rgba(226,88,79,.18)}
      #movingScreenScreen .msWorld{position:relative;flex:1;min-height:0;overflow:hidden;background:#050812}.msWorld canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
      #movingScreenScreen .msActions{position:absolute;left:8px;right:8px;bottom:8px;display:flex;align-items:flex-end;gap:8px;z-index:8;pointer-events:none}.msActions button{pointer-events:auto;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);padding:9px 13px;background:rgba(13,18,35,.9);color:#ece7da;font:700 10px 'Cinzel',serif;box-shadow:0 5px 16px rgba(0,0,0,.35)}.msActions .msSummon{margin-left:auto;background:linear-gradient(180deg,#f3d491,#d9b26a);color:#0a0c14;border:0;min-width:116px}.msActions button:disabled{opacity:.38}
      #movingScreenScreen .msHint{pointer-events:none;max-width:min(60vw,380px);padding:7px 9px;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(5,8,18,.82);color:#c8cedd;font:600 9px 'Space Mono',monospace;line-height:1.35;box-shadow:0 4px 14px rgba(0,0,0,.28)}
      #movingScreenScreen .msToast{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:10;pointer-events:none;opacity:0;transition:opacity .18s;background:rgba(5,8,18,.94);border:1px solid rgba(243,212,145,.36);border-radius:16px;padding:7px 12px;color:#f3d491;font:700 9px 'Space Mono',monospace;white-space:nowrap;max-width:86%;overflow:hidden;text-overflow:ellipsis}.msToast.show{opacity:1}
      #movingScreenScreen .msMoveBanner{position:absolute;left:50%;top:13%;transform:translateX(-50%) scale(.95);z-index:9;pointer-events:none;opacity:0;color:#fff;font:700 clamp(24px,7vw,58px) 'Cinzel',serif;letter-spacing:.13em;text-shadow:0 3px 0 #821f26,0 0 26px rgba(255,70,70,.62);transition:opacity .18s,transform .18s}.msMoveBanner.show{opacity:1;transform:translateX(-50%) scale(1)}
      #movingScreenScreen .msProgress{position:absolute;right:10px;top:62px;bottom:74px;width:28px;z-index:6;pointer-events:none;display:flex;justify-content:center}.msProgressRail{position:absolute;top:8px;bottom:8px;width:3px;border-radius:3px;background:rgba(255,255,255,.13);box-shadow:0 0 10px rgba(80,170,255,.08)}.msProgressFill{position:absolute;bottom:8px;width:3px;border-radius:3px;background:linear-gradient(0deg,#55d8ff,#ff58cc);height:0}.msProgressDot{position:absolute;left:50%;width:12px;height:12px;margin-left:-6px;border-radius:50%;border:2px solid rgba(255,255,255,.7);background:#11162a;box-shadow:0 0 9px rgba(85,216,255,.3)}.msProgressCamera{position:absolute;left:50%;width:20px;height:8px;margin-left:-10px;border-radius:7px;background:#f3d491;box-shadow:0 0 12px rgba(243,212,145,.65)}
      #movingScreenScreen .msResult{position:absolute;inset:0;z-index:14;display:none;align-items:center;justify-content:center;background:rgba(4,6,14,.8);backdrop-filter:blur(5px);padding:18px}.msResult.show{display:flex}.msResultCard{width:min(390px,94vw);padding:20px;border:1px solid #30385d;border-radius:16px;background:linear-gradient(160deg,#161d34,#0d1122);text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)}.msResultCard h2{font:700 22px 'Cinzel',serif;color:#f3d491;margin:0 0 8px}.msResultCard p{font-size:11px;color:#a8b0ca;line-height:1.55}.msResultCard button{width:100%;margin-top:10px;padding:10px;border:0;border-radius:10px;background:linear-gradient(180deg,#f3d491,#d9b26a);font:700 12px 'Cinzel',serif;color:#0a0c14}
      .modeCard.msModeCard{border-color:rgba(143,196,232,.42);box-shadow:inset 0 0 18px rgba(143,196,232,.035)}.modeCard.msModeCard h3{color:#d4ecfa}.modeCard.msFuture{opacity:.62}
      @media(max-width:560px){#movingScreenScreen .msTitle{font-size:10px}.msSubtitle{display:none}.msStats .msPill:nth-child(2){display:none}#movingScreenScreen .msHint{max-width:54vw;font-size:8px}.modeCard.msModeCard{padding:13px}.msActions button{padding:8px 10px}.msProgress{right:5px}}
    `;
    document.head.appendChild(style);
  }

  function installArcadeCards(){
    const modeBody=document.querySelector('#modeScreen .modeBody');
    if(!modeBody || document.getElementById('ttdMovingScreenCardV1')) return;
    const moving=document.createElement('div');
    moving.id='ttdMovingScreenCardV1';moving.className='modeCard msModeCard';
    moving.innerHTML='<h3>Moving Screen</h3><p>March, fight and reposition your Dice through a lethal scrolling battlefield. Every camera border is a death plane.</p><button type="button">Begin</button>';
    moving.querySelector('button').addEventListener('click',()=>{
      const deck=activeDeck();
      if(deck.length<5){coreToast(deck.length===0?'Build a deck first':'Your deck needs all 5 dice filled');coreShowScreen('deck');return;}
      start();
    });
    const future=document.createElement('div');
    future.id='ttdKingHillCardV1';future.className='modeCard msModeCard msFuture';
    future.innerHTML='<h3>King of the Hill</h3><p>Future Moving Screen territory-control variant. Fight for the same choke points instead of only surviving the climb.</p><button type="button" disabled>Coming Later</button>';
    modeBody.appendChild(moving);modeBody.appendChild(future);
  }

  function ensureScreen(){
    installStyles();
    let screen=document.getElementById('movingScreenScreen');
    if(screen)return screen;
    screen=document.createElement('div');screen.id='movingScreenScreen';screen.className='screen';
    screen.innerHTML=`
      <div class="msTop">
        <button class="msBack" type="button">Back</button>
        <div class="msTitleWrap"><div class="msTitle">MOVING SCREEN · NEON ROOFTOPS</div><div class="msSubtitle">WORLD-SPACE ARCADE TEST · NO DICE TRAY</div></div>
        <div class="msStats"><div class="msPill">SP <strong data-ms-sp>0</strong></div><div class="msPill" data-ms-phase>PAUSE</div><div class="msPill"><strong data-ms-time>0</strong>s</div></div>
      </div>
      <div class="msWorld">
        <canvas id="movingScreenCanvas"></canvas>
        <div class="msToast"></div>
        <div class="msMoveBanner" data-ms-banner></div>
        <div class="msProgress" data-ms-progress><div class="msProgressRail"></div><div class="msProgressFill" data-ms-progress-fill></div><div data-ms-progress-dots></div><div class="msProgressCamera" data-ms-progress-camera></div></div>
        <div class="msActions"><div class="msHint" data-ms-hint>Select a Die, then choose a glowing marching marker.</div><button type="button" data-ms-debug>Debug</button><button type="button" class="msSummon" data-ms-summon>Summon · 10 SP</button></div>
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

  function cloneStage(base){
    const zones=base.zones.map(z=>({...z,spots:[]}));
    const stage={...base,zones,edges:base.edges.map(e=>({...e})),junctions:base.junctions.map(j=>({...j})),destructibles:base.destructibles.map(d=>({...d})),obstacles:base.obstacles.map(o=>({...o})),lamps:(base.lamps||[]).map(o=>({...o})),signs:(base.signs||[]).map(o=>({...o})),foreground:(base.foreground||[]).map(o=>({...o})),tiers:(base.tiers||[]).map(o=>({...o})),encounters:(base.encounters||[]).map(o=>({...o,pool:[...(o.pool||[])]}))};
    zones.forEach(z=>{z.spots=makeSpots(z);});
    return stage;
  }

  function makeRuntime(){
    const base=stageAuthority();
    if(!base)throw new Error(`Moving Screen stage authority ${STAGE_ID} is missing.`);
    const screen=ensureScreen(),canvas=screen.querySelector('#movingScreenCanvas'),ctx=canvas.getContext('2d'),stage=cloneStage(base);
    const destructibles=stage.destructibles.map(d=>({...d,hp:d.maxHp,broken:false,flash:0,tapCd:0}));
    return {
      active:true,screen,canvas,ctx,stage,destructibles,w:1,h:1,dpr:1,debug:false,
      cameraX:stage.cameraX,cameraY:stage.cameraStops[0],cameraFrom:stage.cameraStops[0],cameraTarget:stage.cameraStops[0],
      stopIndex:0,phase:'pause',phaseT:0,sp:70,summonCost:10,entities:[],effects:[],selectedId:null,
      enemySpawnT:1.4,kills:0,finished:false,playerEverSummoned:false,finalRemaining:null,finalStarted:false,
      toast:screen.querySelector('.msToast'),hint:screen.querySelector('[data-ms-hint]'),banner:screen.querySelector('[data-ms-banner]'),
      hudSp:screen.querySelector('[data-ms-sp]'),hudPhase:screen.querySelector('[data-ms-phase]'),hudTime:screen.querySelector('[data-ms-time]'),summonBtn:screen.querySelector('[data-ms-summon]'),
      progressFill:screen.querySelector('[data-ms-progress-fill]'),progressDots:screen.querySelector('[data-ms-progress-dots]'),progressCamera:screen.querySelector('[data-ms-progress-camera]'),
    };
  }

  function start(){
    if(runtime?.active)return;
    document.querySelectorAll('.screen').forEach(el=>el.classList.remove('active'));
    const screen=ensureScreen();screen.classList.add('active');
    try{runtime=makeRuntime();}catch(error){console.error(error);coreToast('Moving Screen stage could not initialize');coreShowScreen('mode');return;}
    resize();installProgressDots();seedEnemies();updateHud();
    lastTime=performance.now();accumulator=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
    coreToast('Moving Screen · every camera border is lethal');
  }

  function exit(){
    if(runtime){runtime.active=false;runtime.entities.length=0;runtime.effects.length=0;}
    cancelAnimationFrame(raf);raf=0;lastTime=0;accumulator=0;
    document.getElementById('movingScreenScreen')?.classList.remove('active');runtime=null;coreShowScreen('mode');
  }

  function finish(win,reason){
    if(!runtime||runtime.finished)return;
    runtime.finished=true;runtime.phase='finished';
    const panel=runtime.screen.querySelector('.msResult');panel.classList.add('show');
    runtime.screen.querySelector('[data-ms-result-title]').textContent=win?'ROOFTOP CLEARED':'SCREEN OUT';
    const survivors=playerEntities().length;
    runtime.screen.querySelector('[data-ms-result-text]').textContent=reason||(win?`You reached the Sign Crown with ${survivors} Die${survivors===1?'':'s'} still in play and ${runtime.kills} enemies defeated.`:'Your last Die was destroyed or crossed a camera death plane.');
  }

  function resize(){
    if(!runtime?.canvas)return;
    const rect=runtime.canvas.getBoundingClientRect();if(rect.width<40||rect.height<100)return;
    const dpr=clamp(window.devicePixelRatio||1,1,2);runtime.dpr=dpr;runtime.w=rect.width;runtime.h=rect.height;
    runtime.canvas.width=Math.round(rect.width*dpr);runtime.canvas.height=Math.round(rect.height*dpr);runtime.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  window.addEventListener('resize',()=>{if(runtime?.active)requestAnimationFrame(resize);});

  function makeSpots(zone){
    const count=zone.slots||1;
    if(count===1)return[{x:zone.x,z:zone.z,y:zone.y}];
    const aspect=Math.max(.75,zone.w/Math.max(1,zone.d));
    const cols=Math.max(1,Math.ceil(Math.sqrt(count*aspect))),rows=Math.ceil(count/cols),spots=[];
    const usableW=zone.w*.68,usableD=zone.d*.58;
    for(let i=0;i<count;i++){
      const row=Math.floor(i/cols),col=i%cols,colsThis=Math.min(cols,count-row*cols);
      const x=zone.x+(colsThis===1?0:(col/(colsThis-1)-.5)*usableW);
      const z=zone.z+(rows===1?0:(row/(rows-1)-.5)*usableD);
      spots.push({x,z,y:zone.y});
    }
    return spots;
  }

  const zoneById=id=>runtime?.stage.zones.find(z=>z.id===id)||null;
  const junctionById=id=>runtime?.stage.junctions.find(j=>j.id===id)||null;
  const edgeById=id=>runtime?.stage.edges.find(e=>e.id===id)||null;
  const nodeById=id=>zoneById(id)||junctionById(id);
  const isZone=id=>!!zoneById(id);
  const isJunction=id=>!!junctionById(id);
  const destructibleById=id=>runtime?.destructibles.find(d=>d.id===id)||null;
  const opposite=(edge,nodeId)=>edge.from===nodeId?edge.to:edge.from;
  const adjacentEdges=nodeId=>runtime.stage.edges.filter(edge=>edge.from===nodeId||edge.to===nodeId);
  const playerEntities=()=>runtime?.entities.filter(e=>e.alive&&e.faction==='player')||[];
  const enemyEntities=()=>runtime?.entities.filter(e=>e.alive&&e.faction==='enemy')||[];
  const hostilesFor=e=>runtime.entities.filter(o=>o.alive&&o.faction!==e.faction);

  function projectPoint(x,z,y,cameraY=runtime?.cameraY||0){
    const W=runtime?.w||1,H=runtime?.h||1;
    const baseScale=clamp(W/760,.50,.88),depth=(z+260)/520,persp=.84+depth*.22;
    const relX=x-(runtime?.cameraX||520),verticalRel=(y-cameraY);
    const verticalPerspective=clamp(1-verticalRel/4200,.92,1.08);
    return {x:W*.49+relX*baseScale*persp,y:H*.79+z*.205*baseScale-verticalRel*baseScale-relX*.018*baseScale,scale:baseScale*persp*verticalPerspective};
  }
  function worldDistance(a,b){return Math.hypot(a.x-b.x,(a.y-b.y)*1.02,(a.z-b.z)*.66);}
  function edgeLength(edge){const a=nodeById(edge.from),b=nodeById(edge.to);return a&&b?worldDistance(a,b):9999;}

  function spotOwner(zoneId,slotIdx,exceptId){return runtime.entities.find(e=>e.id!==exceptId&&e.alive&&e.zoneId===zoneId&&e.slotIdx===slotIdx&&!e.moving)||null;}
  function freeSpots(zoneId,exceptId){const z=zoneById(zoneId);if(!z)return[];return z.spots.map((p,i)=>({p,i})).filter(s=>!spotOwner(zoneId,s.i,exceptId));}
  function freeSpotCount(zoneId){return freeSpots(zoneId,null).length;}
  function nearestSpot(zoneId,world,exceptId){const free=freeSpots(zoneId,exceptId);free.sort((a,b)=>worldDistance(a.p,world)-worldDistance(b.p,world));return free[0]?.i??-1;}

  function bestArrivalSpot(entity,zoneId,fromNodeId){
    const zone=zoneById(zoneId),free=freeSpots(zoneId,entity.id);if(!zone||!free.length)return-1;
    const hostiles=hostilesFor(entity).filter(h=>h.zoneId===zoneId&&!h.moving&&!h.airborne);
    if(hostiles.length){
      const target=hostiles.sort((a,b)=>a.hp-b.hp)[0];
      const desired=entity.range<220?Math.min(entity.range*.72,125):Math.min(entity.range*.72,260);
      free.sort((a,b)=>{const losA=hasWorldLineOfSight(a.p,target.world)?0:1,losB=hasWorldLineOfSight(b.p,target.world)?0:1;if(losA!==losB)return losA-losB;return Math.abs(worldDistance(a.p,target.world)-desired)-Math.abs(worldDistance(b.p,target.world)-desired);});
      return free[0].i;
    }
    const from=nodeById(fromNodeId)||zone;
    free.sort((a,b)=>worldDistance(a.p,from)-worldDistance(b.p,from));
    return free[0].i;
  }

  function placeAtZone(entity,zoneId,slotIdx=null){
    const zone=zoneById(zoneId);if(!zone)return false;
    const s=slotIdx==null?bestArrivalSpot(entity,zoneId,entity.cameFrom):slotIdx;
    if(s<0||spotOwner(zoneId,s,entity.id))return false;
    const p=zone.spots[s];entity.zoneId=zoneId;entity.nodeId=zoneId;entity.slotIdx=s;entity.world={...p};entity.moving=null;entity.awaitingBranch=false;entity.airborne=null;entity.aiBarrier=null;return true;
  }

  function startSlotMove(entity,slotIdx){
    const zone=zoneById(entity?.zoneId);if(!entity?.alive||!zone||entity.moving||entity.airborne||spotOwner(zone.id,slotIdx,entity.id))return false;
    const p=zone.spots[slotIdx];if(!p)return false;
    entity.slotIdx=null;entity.moving={kind:'slot',zoneId:zone.id,toSlot:slotIdx,from:{...entity.world},to:{...p},t:0,dur:Math.max(.25,worldDistance(entity.world,p)/entity.moveSpeed)};
    return true;
  }

  function currentSummonZones(){
    if(!runtime)return[];
    return runtime.stage.zones.filter(z=>z.summon&&freeSpotCount(z.id)>0).filter(z=>{
      const p=projectPoint(z.x,z.z,z.y);return p.x>28&&p.x<runtime.w-28&&p.y>58&&p.y<runtime.h-54;
    }).sort((a,b)=>Math.abs(a.y-runtime.cameraY)-Math.abs(b.y-runtime.cameraY));
  }

  function classMult(cls){return 1+(Math.max(1,cls)-1)*.06;}
  function rangeForDie(def){
    const r=def?.special?.range;
    if(r==='close')return 175;if(r==='mid')return 305;if(r==='midfar')return 420;if(r==='map')return 760;
    if(def?.target==='none')return 0;return 325;
  }
  function impulseForDie(def){
    const sp=def?.special||{},kind=String(sp.kind||'').toLowerCase();
    let knock=Number(sp.knockback||sp.knock||sp.clawKnock||0)||0,launch=0;
    if(kind.includes('heavensfist')||kind.includes('launch'))launch=175;
    if(kind.includes('whirlwind'))knock=Math.max(knock,18);
    if(kind.includes('magnetpull'))knock=0;
    return{knock,launch};
  }
  function makeDieEntity(entry){
    const catalog=dieCatalog(),key=typeof entry==='string'?entry:entry?.key,def=catalog?.[key];if(!def)return null;
    const inst=entry?.instId?findOwned(key,entry.instId):null,cls=inst?.cls||1,dot=1,maxHp=Math.max(1,Math.round((def.hp||50)*classMult(cls))),impulse=impulseForDie(def);
    return {id:nowId('die'),faction:'player',type:'die',key,name:def.name||key,alive:true,dot,cls,pu:0,hp:maxHp,maxHp,
      damage:Math.max(1,(def.dmg||8)*classMult(cls)),attackInterval:Math.max(.18,def.atk||1),range:rangeForDie(def),moveSpeed:188,
      knockback:impulse.knock,launch:impulse.launch,attackT:Math.random()*.4,zoneId:null,nodeId:null,slotIdx:null,world:{x:0,z:0,y:0},moving:null,awaitingBranch:false,cameFrom:null,airborne:null,hitFlash:0};
  }

  function summonDie(){
    if(!runtime?.active||runtime.finished)return;
    if(runtime.sp<runtime.summonCost){coreToast('Not enough SP');return;}
    const zones=currentSummonZones();if(!zones.length){coreToast('No legal summon surface is visible');return;}
    const zone=zones[Math.floor(Math.random()*Math.min(2,zones.length))],free=freeSpots(zone.id,null);if(!free.length)return;
    const entry=runtime.deck[Math.floor(Math.random()*runtime.deck.length)],entity=makeDieEntity(entry);if(!entity){coreToast('That deck entry could not be summoned');return;}
    const slot=free[Math.floor(Math.random()*free.length)].i;placeAtZone(entity,zone.id,slot);runtime.entities.push(entity);runtime.playerEverSummoned=true;
    runtime.sp-=runtime.summonCost;runtime.summonCost=Math.min(34,runtime.summonCost+2);effect('summon',entity.world,{color:'#d4ecfa'});updateHud();
  }

  function makeEnemyEntity(key){
    const s=runtime.stage.enemyArchetypes?.[key];if(!s)return null;
    return {id:nowId('enemy'),faction:'enemy',type:'monster',key,name:s.name,alive:true,hp:s.hp,maxHp:s.hp,damage:s.damage,attackInterval:s.attackInterval,range:s.range,moveSpeed:s.moveSpeed,color:s.color||'#7b9b62',knockback:s.knockback||0,launch:s.launch||0,
      attackT:Math.random()*.5,zoneId:null,nodeId:null,slotIdx:null,world:{x:0,z:0,y:0},moving:null,awaitingBranch:false,cameFrom:null,airborne:null,aiBarrier:null,aiT:Math.random()*.4,hitFlash:0};
  }

  function visibleEnemySpawnZones(){
    const visible=runtime.stage.zones.filter(z=>z.enemySpawn&&freeSpotCount(z.id)>0).map(z=>({z,p:projectPoint(z.x,z.z,z.y)})).filter(o=>o.p.x>24&&o.p.x<runtime.w-24&&o.p.y>48&&o.p.y<runtime.h*.66);
    visible.sort((a,b)=>a.p.y-b.p.y);return visible.map(o=>o.z);
  }
  function encounter(){return runtime.stage.encounters.find(e=>e.stop===runtime.stopIndex)||runtime.stage.encounters.at(-1);}
  function spawnEnemy(forceZone=null){
    if(!runtime||runtime.finished)return false;
    const enc=encounter(),cap=enc?.cap||8;if(enemyEntities().length>=cap)return false;
    const zones=forceZone?[zoneById(forceZone)].filter(Boolean):visibleEnemySpawnZones();if(!zones.length)return false;
    const zone=zones[Math.floor(Math.random()*Math.min(2,zones.length))],pool=enc?.pool?.length?enc.pool:['goblin'],key=pool[Math.floor(Math.random()*pool.length)],entity=makeEnemyEntity(key);if(!entity)return false;
    const slot=bestArrivalSpot(entity,zone.id,null);if(slot<0||!placeAtZone(entity,zone.id,slot))return false;
    runtime.entities.push(entity);effect('spawn',entity.world,{color:'#ff9a91'});return true;
  }
  function seedEnemies(){spawnEnemy();spawnEnemy();}

  function edgeEnabled(edge){
    if(!edge)return false;
    if(edge.requiresBroken){const d=destructibleById(edge.requiresBroken);if(d&&!d.broken)return false;}
    if(edge.requiresIntact){const d=destructibleById(edge.requiresIntact);if(d&&d.broken)return false;}
    return true;
  }
  function blockingDestructible(edge){
    if(edge?.requiresBroken){const d=destructibleById(edge.requiresBroken);if(d&&!d.broken)return d;}
    return null;
  }
  function edgeBusy(edge,exceptId){return runtime.entities.some(e=>e.id!==exceptId&&e.alive&&e.moving?.kind==='edge'&&e.moving.edgeId===edge.id);}
  function junctionBusy(nodeId,exceptId){return isJunction(nodeId)&&runtime.entities.some(e=>e.id!==exceptId&&e.alive&&!e.moving&&e.nodeId===nodeId);}

  function edgeSafeAtCamera(edge,cameraY,margin=0){
    const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)return false;
    for(let i=0;i<=14;i++){
      const t=i/14,p=projectPoint(lerp(a.x,b.x,t),lerp(a.z,b.z,t),lerp(a.y,b.y,t),cameraY);
      if(p.x<margin||p.x>runtime.w-margin||p.y<margin||p.y>runtime.h-margin)return false;
    }
    return true;
  }
  function predictedCameraY(seconds){
    if(runtime.phase!=='transition')return runtime.cameraY;
    const travel=runtime.stage.timing.travel,future=clamp((runtime.phaseT+seconds)/travel,0,1);return lerp(runtime.cameraFrom,runtime.cameraTarget,ease(future));
  }
  function edgeTransitionMargin(edge,speed){
    const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)return-Infinity;
    const dur=edgeLength(edge)/Math.max(1,speed);let minMargin=Infinity;
    for(let i=0;i<=16;i++){
      const t=i/16,cam=predictedCameraY(dur*t),p=projectPoint(lerp(a.x,b.x,t),lerp(a.z,b.z,t),lerp(a.y,b.y,t),cam);
      minMargin=Math.min(minMargin,p.x,runtime.w-p.x,p.y,runtime.h-p.y);
    }
    return minMargin;
  }
  function enemyTransitionAccepts(edge,entity){
    const margin=edgeTransitionMargin(edge,entity.moveSpeed);
    const tolerance=entity.key==='goblin_dog'?-1:entity.key==='goblin_brute'?9:4;
    return margin>=tolerance;
  }

  function startMove(entity,edgeId,nextNodeId){
    const edge=edgeById(edgeId);if(!entity?.alive||entity.moving||entity.airborne||!edge||!edgeEnabled(edge)||edgeBusy(edge,entity.id))return false;
    const from=entity.nodeId,to=nextNodeId||opposite(edge,from);if(!from||!to||opposite(edge,from)!==to)return false;
    if(junctionBusy(to,entity.id))return false;
    if(isZone(to)&&freeSpotCount(to)<=0)return false;
    if(runtime.phase!=='transition'&&!edgeSafeAtCamera(edge,runtime.cameraY,0))return false;
    if(entity.faction==='enemy'&&runtime.phase==='transition'&&!enemyTransitionAccepts(edge,entity))return false;
    const a=nodeById(from),b=nodeById(to);if(!a||!b)return false;
    entity.zoneId=null;entity.slotIdx=null;entity.awaitingBranch=false;entity.cameFrom=from;
    entity.moving={kind:'edge',edgeId:edge.id,from,to,t:0,dur:Math.max(.34,edgeLength(edge)/entity.moveSpeed)};
    return true;
  }

  function updateMovement(entity,dt){
    const m=entity.moving;if(!m)return;
    if(m.kind==='slot'){
      m.t+=dt;const t=clamp(m.t/m.dur,0,1),s=t*t*(3-2*t);entity.world={x:lerp(m.from.x,m.to.x,s),z:lerp(m.from.z,m.to.z,s),y:lerp(m.from.y,m.to.y,s)};
      if(t>=1){entity.moving=null;placeAtZone(entity,m.zoneId,m.toSlot);}return;
    }
    const a=nodeById(m.from),b=nodeById(m.to);if(!a||!b){entity.moving=null;return;}
    m.t+=dt;const t=clamp(m.t/m.dur,0,1),s=t*t*(3-2*t);entity.world={x:lerp(a.x,b.x,s),z:lerp(a.z,b.z,s),y:lerp(a.y,b.y,s)};
    if(t<1)return;
    entity.moving=null;entity.nodeId=m.to;entity.cameFrom=m.from;
    if(isZone(m.to)){
      const slot=bestArrivalSpot(entity,m.to,m.from);if(slot>=0)placeAtZone(entity,m.to,slot);else{entity.awaitingBranch=true;entity.zoneId=null;entity.slotIdx=null;}
    }else{
      entity.zoneId=null;entity.slotIdx=null;entity.awaitingBranch=true;
      if(entity.faction==='enemy')chooseAiBranch(entity);
    }
  }

  function graphCost(edge,entity,allowBlocked=false,fromNode=null){
    let cost=edgeLength(edge),blocker=blockingDestructible(edge);
    if(blocker){if(!allowBlocked)return Infinity;cost+=120+blocker.hp*.65;}
    if(!edgeEnabled(edge)&&!blocker)return Infinity;
    if(edgeBusy(edge,entity?.id))cost+=135;
    if(runtime.phase!=='transition'&&!edgeSafeAtCamera(edge,runtime.cameraY,0))return Infinity;
    if(runtime.phase==='transition'&&entity?.faction==='enemy'&&!enemyTransitionAccepts(edge,entity))return Infinity;
    const destination=fromNode?opposite(edge,fromNode):null;if(destination&&isZone(destination)&&freeSpotCount(destination)<=0)cost+=260;
    return cost;
  }

  function shortestPath(start,goal,entity,allowBlocked=true){
    if(!start||!goal)return null;
    const nodes=[...runtime.stage.zones,...runtime.stage.junctions].map(n=>n.id),dist=new Map(nodes.map(n=>[n,Infinity])),prev=new Map(),open=new Set(nodes);dist.set(start,0);
    while(open.size){
      let u=null,best=Infinity;for(const n of open){const d=dist.get(n);if(d<best){best=d;u=n;}}
      if(u==null||best===Infinity)break;open.delete(u);if(u===goal)break;
      for(const edge of adjacentEdges(u)){
        const v=opposite(edge,u);if(!open.has(v))continue;const c=graphCost(edge,entity,allowBlocked,u);if(!Number.isFinite(c))continue;
        const nd=best+c;if(nd<dist.get(v)){dist.set(v,nd);prev.set(v,{node:u,edge:edge.id});}
      }
    }
    if(!prev.has(goal)&&start!==goal)return null;const steps=[];let cur=goal;
    while(cur!==start){const p=prev.get(cur);if(!p)return null;steps.push({from:p.node,to:cur,edgeId:p.edge});cur=p.node;}
    steps.reverse();return steps;
  }

  function playerRouteOptions(entity){
    if(!entity?.alive||entity.moving||entity.airborne||!entity.nodeId)return[];
    return adjacentEdges(entity.nodeId).map(edge=>({edge,to:opposite(edge,entity.nodeId)})).filter(({edge,to})=>{
      if(!edgeEnabled(edge)||edgeBusy(edge,entity.id)||junctionBusy(to,entity.id))return false;
      if(isZone(to)&&freeSpotCount(to)<=0)return false;
      if(runtime.phase!=='transition'&&!edgeSafeAtCamera(edge,runtime.cameraY,0))return false;
      return true;
    });
  }
  function choosePlayerRoute(entity,edgeId){
    const option=playerRouteOptions(entity).find(o=>o.edge.id===edgeId);if(!option)return false;return startMove(entity,option.edge.id,option.to);
  }

  function barrierAttackableBy(entity,d){return entity?.alive&&!entity.moving&&!entity.airborne&&!d.broken&&worldDistance(entity.world,d)<=Math.max(175,entity.range+58);}
  function attackBarrier(entity,d,scale=1){
    if(!barrierAttackableBy(entity,d))return false;
    d.hp=Math.max(0,d.hp-entity.damage*.72*scale);d.flash=.16;effect('impact',d,{color:'#ffd5a2'});
    if(d.hp<=0)breakDestructible(d,entity.faction);return true;
  }
  function breakDestructible(d,byFaction){
    if(d.broken)return;d.broken=true;d.hp=0;effect('break',d,{color:'#f3d491'});coreToast(`${d.name} broken${byFaction==='enemy'?' by the enemy':''}`);
  }

  function desiredCombatSpot(entity,target){
    if(!entity?.zoneId||entity.zoneId!==target?.zoneId)return-1;
    const free=freeSpots(entity.zoneId,entity.id);if(!free.length)return-1;
    const desired=entity.range<220?Math.min(118,entity.range*.68):Math.min(250,entity.range*.72);
    free.sort((a,b)=>{const losA=hasWorldLineOfSight(a.p,target.world)?0:1,losB=hasWorldLineOfSight(b.p,target.world)?0:1;if(losA!==losB)return losA-losB;return Math.abs(worldDistance(a.p,target.world)-desired)-Math.abs(worldDistance(b.p,target.world)-desired);});
    const best=free[0];if(!best)return-1;
    const currentGap=Math.abs(worldDistance(entity.world,target.world)-desired),newGap=Math.abs(worldDistance(best.p,target.world)-desired);
    return newGap+18<currentGap?best.i:-1;
  }

  function desiredBarrierSpot(entity,d){
    if(!entity?.zoneId)return-1;const free=freeSpots(entity.zoneId,entity.id);if(!free.length)return-1;
    free.sort((a,b)=>worldDistance(a.p,d)-worldDistance(b.p,d));return free[0]?.i??-1;
  }

  function chooseAiBranch(entity){
    if(!entity?.alive||entity.moving||entity.airborne||!entity.nodeId)return false;
    const targets=playerEntities().filter(p=>p.zoneId);if(!targets.length)return false;
    let best=null,bestCost=Infinity;
    for(const target of targets){
      const path=shortestPath(entity.nodeId,target.zoneId,entity,true);if(!path?.length)continue;
      const cost=path.reduce((s,step)=>s+graphCost(edgeById(step.edgeId),entity,true,step.from),0);
      if(cost<bestCost){bestCost=cost;best=path;}
    }
    if(!best?.length)return false;
    const first=best[0],edge=edgeById(first.edgeId),blocker=blockingDestructible(edge);
    if(blocker){
      entity.aiBarrier=blocker.id;
      if(!barrierAttackableBy(entity,blocker)&&entity.zoneId){const slot=desiredBarrierSpot(entity,blocker);if(slot>=0)startSlotMove(entity,slot);}
      return false;
    }
    return startMove(entity,edge.id,first.to);
  }

  function updateAI(entity,dt){
    if(entity.moving||entity.airborne)return;
    entity.aiT=(entity.aiT||0)-dt;if(entity.aiT>0)return;entity.aiT=.28+Math.random()*.32;
    if(entity.aiBarrier){
      const d=destructibleById(entity.aiBarrier);
      if(!d||d.broken)entity.aiBarrier=null;
      else if(barrierAttackableBy(entity,d))return;
      else if(entity.zoneId){const slot=desiredBarrierSpot(entity,d);if(slot>=0&&startSlotMove(entity,slot))return;entity.aiBarrier=null;}
    }
    const target=pickCombatTarget(entity);
    if(target)return;
    const same=hostilesFor(entity).filter(h=>h.zoneId&&h.zoneId===entity.zoneId&&!h.moving&&!h.airborne).sort((a,b)=>worldDistance(entity.world,a.world)-worldDistance(entity.world,b.world))[0];
    if(same){const slot=desiredCombatSpot(entity,same);if(slot>=0&&startSlotMove(entity,slot))return;}
    chooseAiBranch(entity);
  }

  function sameZone(a,b){return!!(a.zoneId&&b.zoneId&&a.zoneId===b.zoneId&&!a.moving&&!b.moving);}
  function pointSegmentDistance(px,py,ax,ay,bx,by){
    const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;if(l2<=.0001)return Math.hypot(px-ax,py-ay);
    const t=clamp(((px-ax)*dx+(py-ay)*dy)/l2,0,1);return Math.hypot(px-(ax+dx*t),py-(ay+dy*t));
  }
  function hasWorldLineOfSight(a,b){
    const blockers=[...runtime.stage.obstacles];runtime.destructibles.filter(d=>!d.broken&&d.losBlocker).forEach(d=>blockers.push(d));
    for(const o of blockers){if(pointSegmentDistance(o.x,o.y,a.x,a.y,b.x,b.y)<(o.r||30))return false;}
    return true;
  }
  function hasLineOfSight(a,b){return hasWorldLineOfSight(a.world,b.world);}
  function canAttack(a,b){
    if(!a?.alive||!b?.alive||a.faction===b.faction||a.moving||b.moving||a.airborne||b.airborne||!a.zoneId||!b.zoneId||a.range<=0)return false;
    const distance=worldDistance(a.world,b.world);
    if(sameZone(a,b))return distance<=a.range&&hasLineOfSight(a,b);
    if(runtime.phase==='transition')return false;
    return distance<=a.range&&hasLineOfSight(a,b);
  }
  function pickCombatTarget(entity){
    const list=hostilesFor(entity).filter(h=>canAttack(entity,h));if(!list.length)return null;
    list.sort((a,b)=>{const sameA=sameZone(entity,a)?0:1,sameB=sameZone(entity,b)?0:1;if(sameA!==sameB)return sameA-sameB;const da=worldDistance(entity.world,a.world),db=worldDistance(entity.world,b.world);return da-db||a.hp-b.hp;});
    return list[0];
  }

  function guardForZone(zoneId){
    const zone=zoneById(zoneId);if(!zone?.guardDestructible)return null;const d=destructibleById(zone.guardDestructible);return d&&!d.broken?d:null;
  }
  function applyImpulse(target,attacker,knock,launch){
    if(!target?.alive||(!knock&&!launch))return;
    const originZoneId=target.zoneId,dx=target.world.x-attacker.world.x,dz=target.world.z-attacker.world.z,len=Math.max(1,Math.hypot(dx,dz)||1),dirX=Math.abs(dx)+Math.abs(dz)<2?(Math.random()<.5?-1:1):dx/len,dirZ=Math.abs(dx)+Math.abs(dz)<2?0:dz/len;
    const guard=guardForZone(originZoneId),power=55+knock*4.1;
    target.zoneId=null;target.nodeId=null;target.slotIdx=null;target.moving=null;target.awaitingBranch=false;
    target.airborne={vx:dirX*power,vz:dirZ*power*.45,vy:Math.max(72,launch||72+knock*1.15),originZoneId,guardId:guard?.id||null,strongLaunch:(launch||0)>=140,peak:launch||0};
  }

  function insideZoneXZ(world,zone,pad=0){return Math.abs(world.x-zone.x)<=zone.w*.5+pad&&Math.abs(world.z-zone.z)<=zone.d*.5+pad;}
  function updateAirborne(e,dt){
    const a=e.airborne;if(!a)return;
    const prev={...e.world};e.world.x+=a.vx*dt;e.world.z+=a.vz*dt;e.world.y+=a.vy*dt;a.vy-=430*dt;a.vx*=Math.pow(.986,dt*60);a.vz*=Math.pow(.986,dt*60);
    if(!a.strongLaunch&&a.guardId&&a.vy<=0){
      const guard=destructibleById(a.guardId),origin=zoneById(a.originZoneId);
      if(guard&&!guard.broken&&origin&&prev.y>=origin.y&&e.world.y<=origin.y+8&&!insideZoneXZ(e.world,origin,-8)){
        const slot=nearestSpot(origin.id,e.world,e.id);if(slot>=0){placeAtZone(e,origin.id,slot);effect('guard',e.world,{color:'#d4ecfa'});return;}
      }
    }
    if(a.vy<=0){
      const candidates=runtime.stage.zones.filter(z=>insideZoneXZ(e.world,z,2)&&prev.y>=z.y&&e.world.y<=z.y+6).sort((x,y)=>y.y-x.y);
      for(const z of candidates){const slot=nearestSpot(z.id,e.world,e.id);if(slot>=0){placeAtZone(e,z.id,slot);effect('land',e.world,{color:'#d4ecfa'});return;}}
    }
    if(e.world.y<runtime.stage.world.minY-180)killEntity(e,'fell');
  }

  function hurt(target,amount,attacker){
    if(!target?.alive)return;target.hp-=Math.max(1,amount);target.hitFlash=.12;effect('impact',target.world,{color:attacker?.faction==='player'?'#f8e5a5':'#ff9a91'});
    if(target.hp<=0)killEntity(target,attacker?.faction==='player'?'defeated':'destroyed');
  }
  function killEntity(entity,reason){
    if(!entity?.alive)return;entity.alive=false;entity.hp=0;if(runtime.selectedId===entity.id)runtime.selectedId=null;
    effect(reason==='screened out'?'screenout':'death',entity.world,{color:entity.faction==='player'?'#d4ecfa':'#ff9a91'});
    if(entity.faction==='enemy'){runtime.kills++;runtime.sp=Math.min(999,runtime.sp+7);}
    if(entity.faction==='player'&&runtime.playerEverSummoned&&playerEntities().length===0)finish(false,'Your last Die was destroyed or crossed a camera death plane.');
  }

  function updateCombat(entity,dt){
    if(!entity.alive||entity.moving||entity.airborne||entity.awaitingBranch)return;
    if(entity.aiBarrier){
      const d=destructibleById(entity.aiBarrier);
      if(d&&!d.broken&&barrierAttackableBy(entity,d)){
        entity.attackT+=dt;const interval=entity.attackInterval/(runtime.phase==='transition'?MOVING_AS_MULT:1);
        if(entity.attackT>=interval){entity.attackT-=interval;attackBarrier(entity,d);}return;
      }
    }
    const target=pickCombatTarget(entity);if(!target){entity.attackT=Math.min(entity.attackT+dt,entity.attackInterval);return;}
    entity.attackT+=dt;const interval=entity.attackInterval/(runtime.phase==='transition'?MOVING_AS_MULT:1);if(entity.attackT<interval)return;entity.attackT-=interval;
    effect(entity.range>210?'shot':'slash',entity.world,{to:{...target.world},color:entity.faction==='player'?'#f3d491':'#ff8c82'});
    hurt(target,entity.damage,entity);
    if(entity.knockback||entity.launch)applyImpulse(target,entity,entity.knockback,entity.launch);
  }

  function mergeDice(source,target){
    if(!source||!target||source===target||source.faction!=='player'||target.faction!=='player'||source.type!=='die'||target.type!=='die'||source.moving||target.moving||source.airborne||target.airborne)return false;
    if(source.key!==target.key||source.dot!==target.dot||target.dot>=7)return false;
    const ratio=target.hp/Math.max(1,target.maxHp);source.alive=false;target.dot+=1;target.damage*=1.22;target.attackInterval=Math.max(.16,target.attackInterval/1.12);target.maxHp=Math.round(target.maxHp*1.22);target.hp=Math.max(1,target.maxHp*ratio);runtime.selectedId=target.id;effect('merge',target.world,{color:'#f3d491'});coreToast(`${target.name} merged to ${target.dot} pips`);return true;
  }

  function updateDeathPlanes(){
    for(const e of runtime.entities){
      if(!e.alive)continue;const p=projectPoint(e.world.x,e.world.z,e.world.y);
      if(p.x<0||p.x>runtime.w||p.y<0||p.y>runtime.h)killEntity(e,'screened out');
    }
  }

  function updateCamera(dt){
    const pause=runtime.stage.timing.pause,travel=runtime.stage.timing.travel,last=runtime.stage.cameraStops.length-1;
    if(runtime.phase==='pause'){
      runtime.phaseT+=dt;
      if(runtime.phaseT>=pause){
        if(runtime.stopIndex>=last){beginFinale();return;}
        runtime.phase='transition';runtime.phaseT=0;runtime.cameraFrom=runtime.cameraY;runtime.cameraTarget=runtime.stage.cameraStops[runtime.stopIndex+1];coreToast('MOVE! Camera death planes are live');
      }
    }else if(runtime.phase==='transition'){
      runtime.phaseT+=dt;const t=clamp(runtime.phaseT/travel,0,1);runtime.cameraY=lerp(runtime.cameraFrom,runtime.cameraTarget,ease(t));
      if(t>=1){
        runtime.cameraY=runtime.cameraTarget;runtime.stopIndex++;runtime.phaseT=0;
        if(runtime.stopIndex>=last)beginFinale();else{runtime.phase='pause';coreToast(`Camera stop ${runtime.stopIndex+1}/${runtime.stage.cameraStops.length}`);}
      }
    }
  }

  function beginFinale(){
    if(runtime.finalStarted)return;
    runtime.finalStarted=true;runtime.phase='finale';runtime.phaseT=0;
    const enc=encounter();runtime.finalRemaining=enc?.finalWave||8;runtime.enemySpawnT=.4;coreToast('FINAL ROOFTOP · clear the Sign Crown');
  }

  function updateEnemySpawning(dt){
    const enc=encounter();if(!enc)return;
    runtime.enemySpawnT-=dt;if(runtime.enemySpawnT>0)return;
    if(runtime.phase==='finale'){
      runtime.enemySpawnT=1.15;
      if(runtime.finalRemaining>0&&enemyEntities().length<enc.cap){
        const finalZone=freeSpotCount('roof4_final')>0?'roof4_final':freeSpotCount('roof4_main')>0?'roof4_main':null;
        if(spawnEnemy(finalZone))runtime.finalRemaining--;
      }
      if(runtime.finalRemaining===0&&enemyEntities().length===0&&runtime.playerEverSummoned)finish(true);
      return;
    }
    runtime.enemySpawnT=enc.spawnEvery||3.5;if(enemyEntities().length<enc.cap)spawnEnemy();
  }

  function updateDestructibles(dt){for(const d of runtime.destructibles){d.flash=Math.max(0,d.flash-dt);d.tapCd=Math.max(0,d.tapCd-dt);}}
  function effect(kind,p,meta={}){
    const life=(kind==='death'||kind==='screenout')?0.65:kind==='break'?0.8:0.42;
    runtime?.effects.push({kind,x:p.x,z:p.z||0,y:p.y,t:0,life,...meta});
  }
  function updateEffects(dt){for(let i=runtime.effects.length-1;i>=0;i--){const e=runtime.effects[i];e.t+=dt;if(e.t>=e.life)runtime.effects.splice(i,1);}}

  function update(dt){
    if(!runtime?.active||runtime.finished)return;
    updateCamera(dt);runtime.sp=Math.min(999,runtime.sp+dt*.82);
    for(const e of runtime.entities){if(!e.alive)continue;if(e.moving)updateMovement(e,dt);if(e.airborne)updateAirborne(e,dt);e.hitFlash=Math.max(0,e.hitFlash-dt);}
    updateDeathPlanes();updateEnemySpawning(dt);
    for(const e of enemyEntities())updateAI(e,dt);
    for(const e of runtime.entities)if(e.alive)updateCombat(e,dt);
    updateDestructibles(dt);updateEffects(dt);runtime.entities=runtime.entities.filter(e=>e.alive||e.hitFlash>0);updateHud();
  }

  function installProgressDots(){
    runtime.progressDots.innerHTML='';const n=runtime.stage.tiers.length;
    runtime.stage.tiers.forEach((tier,i)=>{const dot=document.createElement('div');dot.className='msProgressDot';dot.style.bottom=`calc(${(i/(n-1))*100}% - 6px)`;dot.title=tier.name;runtime.progressDots.appendChild(dot);});
  }
  function stageProgress(){
    const stops=runtime.stage.cameraStops,min=stops[0],max=stops.at(-1);return clamp((runtime.cameraY-min)/Math.max(1,max-min),0,1);
  }
  function updateHud(){
    if(!runtime)return;
    const pause=runtime.stage.timing.pause,travel=runtime.stage.timing.travel;
    runtime.hudSp.textContent=Math.floor(runtime.sp);runtime.hudPhase.textContent=runtime.phase==='transition'?'MOVING':runtime.phase==='finale'?'FINALE':'PAUSE';runtime.hudPhase.classList.toggle('moving',runtime.phase==='transition');
    const left=runtime.phase==='transition'?Math.max(0,travel-runtime.phaseT):runtime.phase==='pause'?Math.max(0,pause-runtime.phaseT):runtime.phase==='finale'?Math.max(0,(runtime.finalRemaining||0)+enemyEntities().length):0;
    runtime.hudTime.textContent=Math.ceil(left);runtime.summonBtn.textContent=`Summon · ${runtime.summonCost} SP`;runtime.summonBtn.disabled=runtime.sp<runtime.summonCost||!currentSummonZones().length||runtime.finished;
    const p=stageProgress();runtime.progressFill.style.height=`${Math.round(p*100)}%`;runtime.progressCamera.style.bottom=`calc(${Math.round(p*100)}% - 4px)`;
    const sel=runtime.entities.find(e=>e.id===runtime.selectedId&&e.alive);
    if(sel?.awaitingBranch)runtime.hint.textContent='CROSSROADS — choose a glowing branch. This Die is still in transit and cannot attack.';
    else if(sel?.moving)runtime.hint.textContent=`${sel.name} is moving · it cannot attack until it reaches a safe spot.`;
    else if(sel)runtime.hint.textContent=`${sel.name} selected · tap a route marker, an empty spot on this surface, a breakable, or a compatible ${sel.dot}-pip copy to merge.`;
    else runtime.hint.textContent=runtime.phase==='transition'?'Camera moving — player routes are NOT safety-checked. Push at your own risk.':'Select a Die, then choose a glowing marching marker.';
    const countdown=runtime.phase==='pause'?Math.ceil(pause-runtime.phaseT):null;
    if(runtime.phase==='transition'){runtime.banner.textContent='MOVE!';runtime.banner.classList.add('show');}
    else if(countdown!=null&&countdown<=5&&countdown>0){runtime.banner.textContent=String(countdown);runtime.banner.classList.add('show');}
    else{runtime.banner.classList.remove('show');}
  }

  function zoneCorners(zone,y=zone.y){
    return [
      projectPoint(zone.x-zone.w/2,zone.z-zone.d/2,y),projectPoint(zone.x+zone.w/2,zone.z-zone.d/2,y),
      projectPoint(zone.x+zone.w/2,zone.z+zone.d/2,y),projectPoint(zone.x-zone.w/2,zone.z+zone.d/2,y),
    ];
  }
  function path(g,points,close=false){if(!points.length)return;g.beginPath();g.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);if(close)g.closePath();}
  function screenBounds(points){const xs=points.map(p=>p.x),ys=points.map(p=>p.y);return{x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
  function rounded(g,x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);}

  function drawBackground(g){
    const W=runtime.w,H=runtime.h,grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#050612');grad.addColorStop(.52,'#0b1022');grad.addColorStop(1,'#070914');g.fillStyle=grad;g.fillRect(0,0,W,H);
    const moonX=W*.72,moonY=H*.17+(runtime.cameraY*.012)%18,moonR=Math.min(W,H)*.055;const mg=g.createRadialGradient(moonX,moonY,0,moonX,moonY,moonR*2.6);mg.addColorStop(0,'rgba(222,235,255,.75)');mg.addColorStop(.3,'rgba(171,195,235,.28)');mg.addColorStop(1,'rgba(171,195,235,0)');g.fillStyle=mg;g.beginPath();g.arc(moonX,moonY,moonR*2.6,0,Math.PI*2);g.fill();g.fillStyle='#dce8f7';g.beginPath();g.arc(moonX,moonY,moonR,0,Math.PI*2);g.fill();
    drawSkylineLayer(g,.035,'#090c18',.16,120,9);drawSkylineLayer(g,.075,'#0d1120',.27,92,11);drawSkylineLayer(g,.12,'#111627',.38,78,13);
    g.save();g.globalAlpha=.14;g.fillStyle='#7147a7';g.fillRect(0,H*.42+(runtime.cameraY*.025)%35,W,H*.22);g.restore();
  }
  function drawSkylineLayer(g,parallax,color,baseY,step,count){
    const W=runtime.w,H=runtime.h,shift=(runtime.cameraY*parallax)%step;g.fillStyle=color;
    for(let i=-1;i<count+1;i++){
      const bw=48+(i%4+4)%4*18,bh=120+((i*47)%5+5)%5*38,x=i*step-shift-40,y=H*(baseY+.42)-bh;
      g.fillRect(x,y,bw,bh);g.fillStyle='rgba(240,215,130,.13)';
      for(let wy=y+14;wy<y+bh-8;wy+=17)for(let wx=x+8;wx<x+bw-7;wx+=15)if(((wx+wy+i*23)|0)%4!==0)g.fillRect(wx,wy,3.5,5.5);
      g.fillStyle=color;
    }
  }

  function drawConnectors(g){
    for(const edge of runtime.stage.edges){
      const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)continue;const p1=projectPoint(a.x,a.z,a.y),p2=projectPoint(b.x,b.z,b.y);if((p1.y<-120&&p2.y<-120)||(p1.y>runtime.h+120&&p2.y>runtime.h+120))continue;
      const enabled=edgeEnabled(edge),dx=p2.x-p1.x,dy=p2.y-p1.y,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
      g.save();g.globalAlpha=enabled?1:.34;
      if(edge.kind==='awning'){
        g.strokeStyle='#6f2335';g.lineWidth=18;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();g.strokeStyle='#c84f62';g.lineWidth=3;for(let i=0;i<5;i++){const t=(i+1)/6;g.beginPath();g.moveTo(lerp(p1.x,p2.x,t)+nx*8,lerp(p1.y,p2.y,t)+ny*8);g.lineTo(lerp(p1.x,p2.x,t)-nx*8,lerp(p1.y,p2.y,t)-ny*8);g.stroke();}
      }else if(edge.kind==='scaffold'){
        g.strokeStyle='#4d5666';g.lineWidth=7;g.beginPath();g.moveTo(p1.x+nx*7,p1.y+ny*7);g.lineTo(p2.x+nx*7,p2.y+ny*7);g.moveTo(p1.x-nx*7,p1.y-ny*7);g.lineTo(p2.x-nx*7,p2.y-ny*7);g.stroke();g.lineWidth=2;for(let i=0;i<7;i++){const t=i/6,x=lerp(p1.x,p2.x,t),y=lerp(p1.y,p2.y,t);g.beginPath();g.moveTo(x+nx*10,y+ny*10);g.lineTo(x-nx*10,y-ny*10);g.stroke();}
      }else if(edge.kind==='fire_escape'){
        g.strokeStyle='#343a48';g.lineWidth=12;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();g.strokeStyle='#697282';g.lineWidth=1.6;for(let i=1;i<8;i++){const t=i/8,x=lerp(p1.x,p2.x,t),y=lerp(p1.y,p2.y,t);g.beginPath();g.moveTo(x+nx*7,y+ny*7);g.lineTo(x-nx*7,y-ny*7);g.stroke();}
      }else if(edge.kind==='stairs'){
        g.strokeStyle='#454c5a';g.lineWidth=15;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();g.strokeStyle='#858d9b';g.lineWidth=1.2;for(let i=1;i<9;i++){const t=i/9,x=lerp(p1.x,p2.x,t),y=lerp(p1.y,p2.y,t);g.beginPath();g.moveTo(x+nx*7,y+ny*7);g.lineTo(x-nx*7,y-ny*7);g.stroke();}
      }else if(edge.kind==='billboard'||edge.kind==='catwalk'||edge.kind==='signwalk'){
        g.strokeStyle=edge.kind==='signwalk'?'#6a3967':'#3e4655';g.lineWidth=edge.kind==='signwalk'?14:11;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();g.strokeStyle=edge.kind==='signwalk'?'rgba(255,88,204,.55)':'#8b94a4';g.lineWidth=2;g.beginPath();g.moveTo(p1.x+nx*6,p1.y+ny*6);g.lineTo(p2.x+nx*6,p2.y+ny*6);g.stroke();
      }else if(edge.kind==='collapsed_sign'){
        if(enabled){g.strokeStyle='#6b4a56';g.lineWidth=18;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();g.strokeStyle='rgba(255,95,174,.35)';g.lineWidth=4;g.stroke();}
      }else{
        g.strokeStyle='#444b59';g.lineWidth=13;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();
      }
      g.restore();
    }
  }

  function drawZoneStructure(g,zone){
    const top=zoneCorners(zone),bounds=screenBounds(top);if(bounds.y>runtime.h+120||bounds.y+bounds.h<-120)return;
    if(zone.facade){
      const frontTop=[top[3],top[2]],frontBottom=[projectPoint(zone.x-zone.w/2,zone.z+zone.d/2,zone.y-zone.facade),projectPoint(zone.x+zone.w/2,zone.z+zone.d/2,zone.y-zone.facade)];
      path(g,[frontTop[0],frontTop[1],frontBottom[1],frontBottom[0]],true);g.fillStyle='#111522';g.fill();g.strokeStyle='rgba(255,255,255,.055)';g.lineWidth=1;g.stroke();
      const fb=screenBounds([frontTop[0],frontTop[1],frontBottom[1],frontBottom[0]]);g.fillStyle='rgba(232,207,128,.12)';
      for(let y=fb.y+16;y<fb.y+fb.h-8;y+=18)for(let x=fb.x+12;x<fb.x+fb.w-8;x+=20)if(((x+y+zone.y)|0)%5!==0)g.fillRect(x,y,4,6);
    }
    path(g,top,true);const material=zone.material;
    const fill=material==='awning'?'#6d2939':material==='metal'?'#343a46':material==='scaffold'?'#2d3542':material==='neon'?'#36283f':'#292d39';g.fillStyle=fill;g.fill();g.strokeStyle='rgba(0,0,0,.72)';g.lineWidth=2;g.stroke();
    g.save();path(g,top,true);g.clip();g.globalAlpha=.15;g.strokeStyle='#cbd2de';g.lineWidth=1;for(let x=bounds.x-30;x<bounds.x+bounds.w+30;x+=24){g.beginPath();g.moveTo(x,bounds.y-20);g.lineTo(x+20,bounds.y+bounds.h+20);g.stroke();}g.restore();
  }

  function drawSafeOverlay(g,zone){
    const top=zoneCorners(zone),b=screenBounds(top);if(b.y>runtime.h+90||b.y+b.h<-90)return;
    const dangerMargin=Math.min(b.x,runtime.w-(b.x+b.w),b.y,runtime.h-(b.y+b.h));
    g.save();g.lineWidth=1.6;g.strokeStyle=dangerMargin<55?'rgba(255,226,190,.42)':SAFE_LINE;rounded(g,b.x+2,b.y+2,Math.max(4,b.w-4),Math.max(18,b.h-4),10);g.stroke();
    if(zone.choke){g.fillStyle='rgba(243,212,145,.06)';rounded(g,b.x+4,b.y+4,Math.max(2,b.w-8),Math.max(14,b.h-8),8);g.fill();}
    for(let i=0;i<zone.spots.length;i++){
      const p=projectPoint(zone.spots[i].x,zone.spots[i].z,zone.spots[i].y),occupied=!!spotOwner(zone.id,i,null);g.beginPath();g.arc(p.x,p.y,occupied?7:6,0,Math.PI*2);g.fillStyle=occupied?'rgba(255,255,255,.07)':'rgba(255,255,255,.025)';g.fill();g.strokeStyle=occupied?'rgba(255,255,255,.16)':'rgba(255,255,255,.28)';g.lineWidth=1.2;g.stroke();
    }
    if(runtime.debug||zone.choke||zone.final){g.fillStyle=zone.final?'rgba(255,105,211,.82)':zone.choke?'rgba(243,212,145,.64)':'rgba(255,255,255,.34)';g.font="700 7px 'Space Mono',monospace";g.textAlign='center';g.fillText(zone.final?'FINAL · '+zone.name:zone.choke?zone.name+' · CHOKE':zone.name,b.x+b.w/2,b.y+11);}
    g.restore();
  }

  function drawPaths(g){
    const selected=runtime.entities.find(e=>e.id===runtime.selectedId&&e.alive),options=new Set(selected?playerRouteOptions(selected).map(o=>o.edge.id):[]);
    g.save();g.lineCap='round';g.lineJoin='round';
    for(const edge of runtime.stage.edges){
      const a=nodeById(edge.from),b=nodeById(edge.to);if(!a||!b)continue;const p1=projectPoint(a.x,a.z,a.y),p2=projectPoint(b.x,b.z,b.y),enabled=edgeEnabled(edge),blocked=!!blockingDestructible(edge),hot=options.has(edge.id);
      g.strokeStyle=hot?'rgba(243,212,145,.86)':enabled?SAFE_LINE:blocked?'rgba(255,255,255,.085)':'rgba(226,88,79,.12)';g.lineWidth=hot?3:2;g.setLineDash(enabled?[]:[5,7]);g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();g.setLineDash([]);
    }
    for(const j of runtime.stage.junctions){const degree=adjacentEdges(j.id).filter(edgeEnabled).length;if(degree<3)continue;const p=projectPoint(j.x,j.z,j.y);for(let i=-1;i<=1;i++){g.fillStyle=SAFE_LINE;g.beginPath();g.arc(p.x+i*6,p.y,2.2,0,Math.PI*2);g.fill();}}
    g.restore();
  }

  function drawObstacles(g){
    for(const o of runtime.stage.obstacles){
      const p=projectPoint(o.x,o.z,o.y),s=p.scale;if(p.y<-130||p.y>runtime.h+130)continue;g.save();g.translate(p.x,p.y);g.scale(s,s);g.fillStyle='#202633';g.strokeStyle='rgba(255,255,255,.14)';g.lineWidth=1.8;
      if(o.id==='water_tank'){g.fillRect(-27,-76,54,76);g.beginPath();g.ellipse(0,-76,27,9,0,0,Math.PI*2);g.fill();g.stroke();g.strokeStyle='#596170';for(let y=-64;y<-5;y+=15){g.beginPath();g.moveTo(-25,y);g.lineTo(25,y);g.stroke();}}
      else{g.fillRect(-o.r*.55,-(o.h||70)*.72,o.r*1.1,(o.h||70)*.72);g.strokeRect(-o.r*.55,-(o.h||70)*.72,o.r*1.1,(o.h||70)*.72);g.fillStyle='#343b49';for(let i=-1;i<=1;i++)g.fillRect(i*14-5,-(o.h||70)*.58,10,12);}
      g.restore();
    }
  }

  function drawDestructibles(g){
    for(const d of runtime.destructibles){
      const p=projectPoint(d.x,d.z,d.y),s=p.scale;if(p.y<-90||p.y>runtime.h+90)continue;g.save();g.translate(p.x,p.y);g.scale(s,s);g.globalAlpha=d.broken?.24:1;
      g.fillStyle=d.flash>0?'#fff0d0':d.guard?'#53606c':d.id==='billboard_brace'?'#795647':'#5e493b';g.strokeStyle=d.guard?'#a4aebb':'#c9a06c';g.lineWidth=2;
      if(d.broken){g.rotate(-.28);g.fillRect(-25,-4,50,8);}
      else if(d.guard){g.beginPath();g.moveTo(-28,0);g.lineTo(-28,-25);g.moveTo(0,0);g.lineTo(0,-25);g.moveTo(28,0);g.lineTo(28,-25);g.moveTo(-28,-22);g.lineTo(28,-22);g.stroke();}
      else{g.fillRect(-26,-34,52,34);for(let i=-18;i<=18;i+=12){g.beginPath();g.moveTo(i,-32);g.lineTo(i+8,0);g.stroke();}}
      g.restore();
      if(!d.broken&&!d.guard){const pct=d.hp/d.maxHp;g.fillStyle='rgba(0,0,0,.66)';g.fillRect(p.x-25,p.y-44*s,50,5);g.fillStyle=pct>.5?'#d9b26a':'#e2584f';g.fillRect(p.x-24,p.y-43*s,48*pct,3);}
      if(runtime.debug&&!d.broken){g.fillStyle='#f3d491';g.font="700 7px 'Space Mono',monospace";g.textAlign='center';g.fillText(d.name,p.x,p.y-50*s);}
    }
  }

  function drawLamps(g){
    for(const l of runtime.stage.lamps){
      const base=projectPoint(l.x,l.z,l.y),top=projectPoint(l.x,l.z,l.y+l.h),s=base.scale;if(top.y<-100||base.y>runtime.h+100)continue;
      g.strokeStyle='#565e6c';g.lineWidth=Math.max(2,4*s);g.beginPath();g.moveTo(base.x,base.y);g.lineTo(top.x,top.y);g.stroke();
      const glow=g.createRadialGradient(top.x,top.y,0,top.x,top.y,24*s);glow.addColorStop(0,l.glow+'cc');glow.addColorStop(.25,l.glow+'66');glow.addColorStop(1,l.glow+'00');g.fillStyle=glow;g.beginPath();g.arc(top.x,top.y,24*s,0,Math.PI*2);g.fill();g.fillStyle=l.glow;g.fillRect(top.x-5*s,top.y-4*s,10*s,8*s);
    }
  }

  function drawSigns(g){
    for(const sgn of runtime.stage.signs){
      const p=projectPoint(sgn.x,sgn.z,sgn.y),sc=p.scale;if(p.y<-150||p.y>runtime.h+150)continue;g.save();g.translate(p.x,p.y);g.rotate(sgn.tilt||0);g.scale(sc,sc);
      g.shadowBlur=18;g.shadowColor=sgn.color;g.strokeStyle=sgn.color;g.lineWidth=3;g.fillStyle='rgba(8,10,18,.78)';g.fillRect(-sgn.w/2,-sgn.h,sgn.w,sgn.h);g.strokeRect(-sgn.w/2,-sgn.h,sgn.w,sgn.h);g.fillStyle=sgn.color;g.font=`700 ${Math.max(22,sgn.h*.42)}px 'Russo One',sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(sgn.text,0,-sgn.h*.5);g.shadowBlur=0;g.strokeStyle='#434b5c';g.lineWidth=5;g.beginPath();g.moveTo(-sgn.w*.32,0);g.lineTo(-sgn.w*.32,38);g.moveTo(sgn.w*.32,0);g.lineTo(sgn.w*.32,38);g.stroke();g.restore();
    }
  }

  function drawEntity(g,e){
    if(!e.alive)return;const p=projectPoint(e.world.x,e.world.z,e.world.y),sc=p.scale,size=(e.type==='die'?40:34)*sc;g.save();g.translate(p.x,p.y);g.globalAlpha=e.hitFlash>0?.86:1;
    g.fillStyle='rgba(0,0,0,.26)';g.beginPath();g.ellipse(0,size*.34,size*.44,size*.16,0,0,Math.PI*2);g.fill();
    if(e.id===runtime.selectedId){g.strokeStyle=GOLD;g.lineWidth=2;g.beginPath();g.ellipse(0,size*.38,size*.72,size*.32,0,0,Math.PI*2);g.stroke();}
    if(e.type==='die'){
      const def=dieCatalog()?.[e.key];const color=e.hitFlash>0?'#fff':(def?.color||'#8b7fe8'),glow=def?.glow||'#d4ecfa';g.shadowBlur=10*sc;g.shadowColor=glow;g.fillStyle=color;g.strokeStyle=glow;g.lineWidth=2;rounded(g,-size/2,-size/2,size,size,7*sc);g.fill();g.stroke();g.shadowBlur=0;
      g.fillStyle='rgba(255,255,255,.94)';const dots=Math.min(7,e.dot||1),pts=[[-.22,-.22],[.22,.22],[.22,-.22],[-.22,.22],[0,0],[0,-.29],[0,.29]].slice(0,dots);for(const [dx,dy] of pts){g.beginPath();g.arc(dx*size,dy*size,2.5*sc,0,Math.PI*2);g.fill();}
      const letter=(e.name||e.key||'?').trim().charAt(0).toUpperCase();g.fillStyle='rgba(6,8,16,.7)';g.font=`700 ${Math.max(7,10*sc)}px 'Cinzel',serif`;g.textAlign='center';g.fillText(letter,0,4*sc);
    }else{
      g.fillStyle=e.hitFlash>0?'#fff':e.color;g.strokeStyle='rgba(0,0,0,.7)';g.lineWidth=1.5;g.beginPath();g.arc(0,0,size*.46,0,Math.PI*2);g.fill();g.stroke();
      g.fillStyle='#151a1a';g.beginPath();g.arc(-size*.12,-size*.05,2.2*sc,0,Math.PI*2);g.arc(size*.12,-size*.05,2.2*sc,0,Math.PI*2);g.fill();
      if(e.key==='goblin_brute'){g.strokeStyle='#b7c0ad';g.lineWidth=3*sc;g.beginPath();g.moveTo(-size*.27,-size*.34);g.lineTo(-size*.08,-size*.52);g.moveTo(size*.27,-size*.34);g.lineTo(size*.08,-size*.52);g.stroke();}
      g.fillStyle='#ece7da';g.font=`700 ${Math.max(6,7*sc)}px 'Space Mono',monospace`;g.textAlign='center';g.fillText(e.name,0,-size*.68);
    }
    if(e.awaitingBranch){g.fillStyle=GOLD;g.font=`700 ${Math.max(10,14*sc)}px 'Space Mono',monospace`;g.fillText('?',0,-size*.82);}
    g.restore();
    const hpW=Math.max(24,size*1.3),pct=clamp(e.hp/e.maxHp,0,1);g.fillStyle='rgba(0,0,0,.64)';g.fillRect(p.x-hpW/2,p.y-size*.72-8,hpW,4);g.fillStyle=e.faction==='player'?'#78d992':'#e2584f';g.fillRect(p.x-hpW/2+1,p.y-size*.72-7,(hpW-2)*pct,2);
  }

  function drawRouteChoices(g){
    const e=runtime.entities.find(x=>x.id===runtime.selectedId&&x.alive);if(!e||e.moving||e.airborne)return;
    const options=playerRouteOptions(e);for(const o of options){const n=nodeById(o.to),p=projectPoint(n.x,n.z,n.y),risk=runtime.phase==='transition'?edgeTransitionMargin(o.edge,e.moveSpeed):20;g.save();g.fillStyle=risk<8?'rgba(226,88,79,.2)':'rgba(243,212,145,.16)';g.strokeStyle=risk<8?'rgba(255,130,120,.9)':SAFE_LINE_STRONG;g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,11,0,Math.PI*2);g.fill();g.stroke();g.fillStyle=risk<8?'#ff9b92':GOLD;g.font="700 11px 'Space Mono',monospace";g.textAlign='center';g.fillText('›',p.x,p.y+4);g.restore();}
  }

  function drawEffects(g){
    for(const e of runtime.effects){
      const p=projectPoint(e.x,e.z,e.y),t=clamp(e.t/e.life,0,1);g.save();g.globalAlpha=1-t;g.strokeStyle=e.color||'#fff';g.fillStyle=e.color||'#fff';
      if((e.kind==='shot'||e.kind==='slash')&&e.to){const q=projectPoint(e.to.x,e.to.z,e.to.y);g.lineWidth=e.kind==='shot'?2.2:3.2;g.beginPath();if(e.kind==='slash'){const mx=(p.x+q.x)/2,my=(p.y+q.y)/2;g.moveTo(p.x,p.y);g.quadraticCurveTo(mx+(q.y-p.y)*.12,my-(q.x-p.x)*.12,q.x,q.y);}else{g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);}g.stroke();}
      else if(e.kind==='break'){for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.7,r=6+t*32;g.fillRect(p.x+Math.cos(a)*r-1,p.y+Math.sin(a)*r-1,3,3);}}
      else if(e.kind==='screenout'){g.lineWidth=3;g.beginPath();g.moveTo(p.x-18,p.y);g.lineTo(p.x+18,p.y);g.moveTo(p.x,p.y-18);g.lineTo(p.x,p.y+18);g.stroke();}
      else if(e.kind==='merge'){g.lineWidth=2;for(let i=0;i<3;i++){g.beginPath();g.arc(p.x,p.y,6+t*(14+i*8),i*.8+t*2,i*.8+t*2+Math.PI*1.5);g.stroke();}}
      else{g.lineWidth=2;g.beginPath();g.arc(p.x,p.y,5+t*18,0,Math.PI*2);g.stroke();}
      g.restore();
    }
  }

  function drawForeground(g){
    const W=runtime.w,H=runtime.h;
    for(const f of runtime.stage.foreground){
      const shift=(runtime.cameraY*(f.parallax||1.1)*.18)%Math.max(200,H*.7);g.save();g.globalAlpha=.58;
      if(f.kind==='pipe'){const x=W*.07,gY=H*.92-shift*.15;g.strokeStyle='#222938';g.lineWidth=15;g.beginPath();g.moveTo(x,H+30);g.lineTo(x,gY);g.quadraticCurveTo(x+25,gY-22,x+48,gY-22);g.stroke();}
      else if(f.kind==='fire_escape'){const x=W*.92,y=H*.36+shift*.11;g.strokeStyle='#242a38';g.lineWidth=7;g.strokeRect(x-36,y-90,70,180);g.lineWidth=2;for(let sy=y-70;sy<y+90;sy+=22){g.beginPath();g.moveTo(x-34,sy);g.lineTo(x+34,sy+18);g.stroke();}}
      else if(f.kind==='cable'){g.strokeStyle='#1d2431';g.lineWidth=5;g.beginPath();g.moveTo(-30,H*.24+shift*.06);g.quadraticCurveTo(W*.5,H*.39+shift*.06,W+30,H*.18+shift*.06);g.stroke();}
      g.restore();
    }
  }

  function drawDeathPlanes(g){
    const W=runtime.w,H=runtime.h,moving=runtime.phase==='transition';g.save();
    const alpha=moving ? .42 : .12,g1=g.createLinearGradient(0,0,0,24);g1.addColorStop(0,`rgba(226,88,79,${alpha})`);g1.addColorStop(1,'rgba(226,88,79,0)');g.fillStyle=g1;g.fillRect(0,0,W,24);
    const g2=g.createLinearGradient(0,H-24,0,H);g2.addColorStop(0,'rgba(226,88,79,0)');g2.addColorStop(1,`rgba(226,88,79,${alpha})`);g.fillStyle=g2;g.fillRect(0,H-24,W,24);
    const gl=g.createLinearGradient(0,0,24,0);gl.addColorStop(0,`rgba(226,88,79,${alpha})`);gl.addColorStop(1,'rgba(226,88,79,0)');g.fillStyle=gl;g.fillRect(0,0,24,H);
    const gr=g.createLinearGradient(W-24,0,W,0);gr.addColorStop(0,'rgba(226,88,79,0)');gr.addColorStop(1,`rgba(226,88,79,${alpha})`);g.fillStyle=gr;g.fillRect(W-24,0,24,H);
    if(runtime.debug){g.strokeStyle='rgba(255,80,70,.8)';g.lineWidth=2;g.setLineDash([8,6]);g.strokeRect(1,1,W-2,H-2);g.setLineDash([]);g.fillStyle='rgba(255,95,85,.9)';g.font="700 8px 'Space Mono',monospace";g.fillText('DEATH PLANE',8,13);}
    g.restore();
  }

  function drawDebug(g){
    if(!runtime.debug)return;g.save();g.fillStyle='rgba(5,8,18,.82)';g.fillRect(8,8,218,58);g.fillStyle='#d4ecfa';g.font="700 8px 'Space Mono',monospace";g.fillText(`cameraY ${runtime.cameraY.toFixed(1)} · stop ${runtime.stopIndex+1}`,15,23);g.fillText(`phase ${runtime.phase} · entities ${runtime.entities.filter(e=>e.alive).length}`,15,37);g.fillText(`players ${playerEntities().length} · enemies ${enemyEntities().length} · kills ${runtime.kills}`,15,51);g.restore();
    for(const j of runtime.stage.junctions){const p=projectPoint(j.x,j.z,j.y);g.fillStyle='#8fc4e8';g.beginPath();g.arc(p.x,p.y,4,0,Math.PI*2);g.fill();g.fillStyle='#8fc4e8';g.font="700 6px 'Space Mono',monospace";g.fillText(j.id,p.x+6,p.y-4);}
  }

  function draw(){
    if(!runtime?.active)return;const g=runtime.ctx;if(!g)return;g.clearRect(0,0,runtime.w,runtime.h);drawBackground(g);drawSigns(g);drawConnectors(g);
    [...runtime.stage.zones].sort((a,b)=>a.z-b.z||a.y-b.y).forEach(z=>drawZoneStructure(g,z));drawObstacles(g);drawDestructibles(g);drawLamps(g);drawPaths(g);runtime.stage.zones.forEach(z=>drawSafeOverlay(g,z));
    [...runtime.entities].filter(e=>e.alive).sort((a,b)=>a.world.z-b.world.z||a.world.y-b.world.y).forEach(e=>drawEntity(g,e));drawRouteChoices(g);drawEffects(g);drawForeground(g);drawDeathPlanes(g);drawDebug(g);
  }

  function hitEntity(px,py){let best=null,bestD=Infinity;for(const e of runtime.entities){if(!e.alive)continue;const p=projectPoint(e.world.x,e.world.z,e.world.y),d=Math.hypot(px-p.x,py-p.y);if(d<28&&d<bestD){best=e;bestD=d;}}return best;}
  function hitDestructible(px,py){for(const d of runtime.destructibles){if(d.broken)continue;const p=projectPoint(d.x,d.z,d.y);if(Math.hypot(px-p.x,py-p.y)<36)return d;}return null;}
  function hitRouteOption(entity,px,py){for(const o of playerRouteOptions(entity)){const n=nodeById(o.to),p=projectPoint(n.x,n.z,n.y);if(Math.hypot(px-p.x,py-p.y)<20)return o;}return null;}
  function hitSpot(px,py,zoneId=null){let best=null,bestD=Infinity;for(const zone of runtime.stage.zones){if(zoneId&&zone.id!==zoneId)continue;for(let i=0;i<zone.spots.length;i++){if(spotOwner(zone.id,i,null))continue;const p=projectPoint(zone.spots[i].x,zone.spots[i].z,zone.spots[i].y),d=Math.hypot(px-p.x,py-p.y);if(d<15&&d<bestD){best={zone,slotIdx:i};bestD=d;}}}return best;}

  function onCanvasPointer(ev){
    if(!runtime?.active||runtime.finished)return;ev.preventDefault();const rect=runtime.canvas.getBoundingClientRect(),px=ev.clientX-rect.left,py=ev.clientY-rect.top;
    let selected=runtime.entities.find(e=>e.id===runtime.selectedId&&e.alive);
    if(selected&&!selected.moving&&!selected.airborne){const option=hitRouteOption(selected,px,py);if(option){if(!choosePlayerRoute(selected,option.edge.id))coreToast(runtime.phase==='transition'?'That path is occupied or blocked':'That route is unsafe, occupied or blocked while the camera is stationary');return;}}
    const d=hitDestructible(px,py);if(d){if(d.tapCd>0)return;d.tapCd=.24;let attackers=playerEntities().filter(e=>barrierAttackableBy(e,d));if(selected&&attackers.includes(selected))attackers=[selected,...attackers.filter(e=>e!==selected)];if(!attackers.length){coreToast('No stationary Die can reach that breakable');return;}attackBarrier(attackers[0],d,1.18);return;}
    const hit=hitEntity(px,py);
    if(hit?.faction==='player'){
      if(selected&&selected!==hit&&mergeDice(selected,hit))return;runtime.selectedId=hit.id;return;
    }
    selected=runtime.entities.find(e=>e.id===runtime.selectedId&&e.alive);
    if(selected&&selected.zoneId&&!selected.moving&&!selected.airborne){const spot=hitSpot(px,py,selected.zoneId);if(spot){if(startSlotMove(selected,spot.slotIdx))return;}}
    runtime.selectedId=null;
  }

  function frame(ts){
    if(!runtime?.active)return;const dt=Math.min(.08,Math.max(0,(ts-lastTime)/1000));lastTime=ts;accumulator+=dt;while(accumulator>=TICK){update(TICK);accumulator-=TICK;}draw();raf=requestAnimationFrame(frame);
  }

  installStyles();installArcadeCards();
  const cardWatch=setInterval(()=>{if(document.getElementById('ttdMovingScreenCardV1')){clearInterval(cardWatch);return;}installArcadeCards();},500);setTimeout(()=>clearInterval(cardWatch),15000);

  window.TTDMovingScreen=Object.freeze({
    version:VERSION,stageId:STAGE_ID,start,exit,
    get active(){return!!runtime?.active;},
    get state(){return runtime?{phase:runtime.phase,cameraY:runtime.cameraY,stopIndex:runtime.stopIndex,sp:runtime.sp,players:playerEntities().length,enemies:enemyEntities().length,kills:runtime.kills,finalRemaining:runtime.finalRemaining}:null;},
  });
})();
