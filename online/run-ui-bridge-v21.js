(() => {
  'use strict';
  const ORIGIN=location.origin;

  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const m=event.data||{};if(m.type!=='ttd:v6-run-finish-result')return;
    window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35?.(m);
    const count=Number(m.chestCount||0);if(count>0){const text=document.getElementById('overlayText');if(text)text.textContent='Al Hata is cleared! '+(count===1?'A Frozen Island Chest has':count+' Frozen Island Chests have')+' been added to your inventory.';}
  });

  function requiredReplace(source,needle,replacement,label){
    const next=source.replace(needle,replacement);
    if(next===source)throw new Error(`Continuous world injection marker missing: ${label}`);
    return next;
  }
  function requiredReplaceSection(source,startMarker,endMarker,replacement,label){
    const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);
    if(start<0||end<0)throw new Error(`Continuous world injection section missing: ${label}`);
    return source.slice(0,start)+replacement+source.slice(end);
  }

  function installPlatformOnlineStartSyncV2(){
    if(window.__TTD_PLATFORM_ONLINE_START_SYNC_V2)return;
    window.__TTD_PLATFORM_ONLINE_START_SYNC_V2=true;
    const TEST_ID='test_map';
    const platformStartAdventure=startAdventure;
    const testFlags=['__ttdTestMap','__ttdTestBattlePath','__ttdPlatformDone','__ttdPlatformRewards','__ttdPlatformBonusApplied','__ttdPlatformSlotMemory','__ttdPlatformDestroyedSlots','__ttdWorldState','__ttdCombatIntroSeen','__ttdCombatIntroPending'];

    function tagAuthorizedTestState(previousState,startedAt){
      const testStage=ADVENTURES?.[TEST_ID]?.stages?.[0];
      if(state&&state!==previousState&&testStage&&state.adventureStage===testStage){
        state.__ttdTestMap=true;
        state.__ttdTestBattlePath=1;
        state.__ttdPlatformDone=false;
        state.__ttdPlatformRewards={dieOre:0,expOrbs:0,bonusWaveCredits:0};
        state.__ttdPlatformBonusApplied=false;
        state.__ttdPlatformSlotMemory={};
        state.__ttdPlatformDestroyedSlots=[];
        state.__ttdCombatIntroSeen=false;
        state.__ttdCombatIntroPending=false;
        state.__ttdWorldState={version:2,cameraX:340,traversalStart:{x:340,z:0,y:0},objects:null,drops:null};
        if(modeLabel)modeLabel.textContent='Test Map · Beach Clearing';
        try{window.__TTD_PLATFORM_TEST_API?.ensureWorldState?.();buildPath(cw,ch);}catch(err){console.warn('Test Map first combat path could not rebuild.',err);}
        return;
      }
      if(performance.now()-startedAt<25000)requestAnimationFrame(()=>tagAuthorizedTestState(previousState,startedAt));
    }

    startAdventure=function onlinePlatformAwareStartAdventureV2(advId,stageIdx,diffKey){
      const previousState=state;
      const result=platformStartAdventure(advId,stageIdx,diffKey);
      if(advId!==TEST_ID)return result;
      if(state===previousState&&previousState)testFlags.forEach((key)=>{try{delete previousState[key];}catch(_){}});
      const startedAt=performance.now();requestAnimationFrame(()=>tagAuthorizedTestState(previousState,startedAt));
      return result;
    };
  }

  async function loadAdventurePlatformingV2(){
    try{
      const response=await fetch('/online/adventure-platforming-v2.js?v=2',{cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      let platformSource=await response.text();

      const renderMarker="  if(document.getElementById('adventureScreen')?.classList.contains('active'))renderAdventureList();";
      const worldInjection=`  const __ttdBaseCurrentPlatformsV5=currentPlatforms;
  const __ttdBaseDrawBackgroundV5=drawBackground;
  const __ttdBaseDrawPlatformV5=drawPlatform;
  const __ttdBaseDrawSceneV5=drawScene;
  const __ttdBaseDrawChestV5=drawChest;

  const __TTD_ARENAS_V5=Object.freeze({
    1:Object.freeze({id:'beach-clearing',cameraX:340,center:Object.freeze({x:340,z:0,y:0})}),
    2:Object.freeze({id:'temple-court',cameraX:1840,center:Object.freeze({x:1840,z:0,y:0})}),
  });
  function arenaSpec(area=1){return __TTD_ARENAS_V5[Number(area)===2?2:1];}
  function arenaCameraX(area=1){return arenaSpec(area).cameraX;}
  function arenaCenter(area=1){return {...arenaSpec(area).center};}

  function ensureWorldState(){
    if(!state?.__ttdTestMap)return null;
    if(!state.__ttdWorldState)state.__ttdWorldState={version:2,cameraX:arenaCameraX(1),traversalStart:arenaCenter(1),objects:null,drops:null};
    const w=state.__ttdWorldState;
    w.version=2;
    if(!Array.isArray(w.objects))w.objects=makeInteractables();
    if(!Array.isArray(w.drops))w.drops=[];
    if(!Number.isFinite(w.cameraX))w.cameraX=arenaCameraX(state.__ttdPlatformDone?2:1);
    if(!w.traversalStart)w.traversalStart=arenaCenter(state.__ttdPlatformDone?2:1);
    return w;
  }
  function setWorldCamera(value){const w=ensureWorldState();const x=Number(value);if(w&&Number.isFinite(x))w.cameraX=x;return w?.cameraX;}
  function continuousWorldActive(){return !!state?.__ttdTestMap||!!session?.__ttdWorldPreview;}
  function continuousPlatforms(){
    return [
      {id:'beach_ground',x1:-420,x2:650,z1:-420,z2:420,y:0,kind:'ground_beach'},
      {id:'jungle_ground',x1:560,x2:1160,z1:-420,z2:420,y:0,kind:'ground_jungle'},
      {id:'temple_ground',x1:1060,x2:2300,z1:-420,z2:420,y:0,kind:'ground_temple'},
    ];
  }
  currentPlatforms=function currentPlatformsContinuousV5(t){return continuousWorldActive()?continuousPlatforms():__ttdBaseCurrentPlatformsV5(t);};

  function projectWorldPoint(x,z,y=0,w=session?.w||1,h=session?.h||1,cameraX=session?.cameraX||0){
    const W=Math.max(1,Number(w)||1),H=Math.max(1,Number(h)||1);
    const scale=Math.max(.52,Math.min(.82,W/520));
    const relX=Number(x)-Number(cameraX||0),depth=(Number(z)+220)/440,persp=.82+depth*.22;
    return {x:W*.47+relX*scale*persp,y:H*.68+Number(z)*.28*scale-Number(y||0)*scale-relX*.035*scale,scale:scale*persp};
  }
  function battleRouteWorld(area=1){
    return Number(area)===2?[
      {x:2170,z:-245,y:0},{x:2070,z:-125,y:0},{x:1995,z:105,y:0},{x:1880,z:185,y:0},
      {x:1775,z:45,y:0},{x:1660,z:-155,y:0},{x:1540,z:40,y:0},
    ]:[
      {x:610,z:-240,y:0},{x:520,z:-115,y:0},{x:455,z:95,y:0},{x:355,z:155,y:0},
      {x:275,z:-15,y:0},{x:195,z:-160,y:0},{x:105,z:25,y:0},
    ];
  }
  function projectBattleRoute(w,h,area=1,cameraOverride=null){
    const spec=arenaSpec(area),camera=Number.isFinite(Number(cameraOverride))?Number(cameraOverride):spec.cameraX;
    const vertices=battleRouteWorld(area),points=[];
    for(let i=0;i<vertices.length-1;i++){
      const a=vertices[i],b=vertices[i+1],steps=7;
      for(let step=0;step<steps;step++){
        if(i>0&&step===0)continue;
        const t=step/(steps-1),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t;
        points.push({...projectWorldPoint(x,z,y,w,h,camera),worldX:x,worldZ:z,worldY:y});
      }
    }
    return {area:Number(area)===2?2:1,cameraX:camera,center:{...spec.center},points};
  }

  function worldRegion(){const x=Number(session?.cameraX)||0;return x<620?'beach':x<1120?'jungle':'temple';}
  drawBackground=function drawBackgroundContinuousV5(g){
    if(!continuousWorldActive())return __ttdBaseDrawBackgroundV5(g);
    const W=session.w,H=session.h,region=worldRegion();
    const sky=g.createLinearGradient(0,0,0,H*.72);sky.addColorStop(0,region==='temple'?'#182b3c':'#2e6683');sky.addColorStop(.52,region==='beach'?'#78b5c5':region==='jungle'?'#5d8a82':'#627a7d');sky.addColorStop(1,'#cad0b6');g.fillStyle=sky;g.fillRect(0,0,W,H);
    const horizon=H*.31;
    if(region==='beach'){
      const sea=g.createLinearGradient(0,horizon,0,H*.58);sea.addColorStop(0,'#5eb4bd');sea.addColorStop(1,'#2b7f8d');g.fillStyle=sea;g.fillRect(0,horizon,W,H*.31);
      g.strokeStyle='rgba(235,249,242,.36)';g.lineWidth=1.2;for(let i=0;i<5;i++){const y=horizon+18+i*18;g.beginPath();g.moveTo(0,y);for(let x=0;x<=W;x+=28)g.lineTo(x,y+Math.sin((x+i*31)/35)*2.2);g.stroke();}
      g.fillStyle='rgba(39,75,80,.28)';for(let i=0;i<5;i++){const x=(i*151-session.cameraX*.08)%(W+180)-90;g.beginPath();g.moveTo(x,horizon+8);g.lineTo(x+45,horizon-24);g.lineTo(x+94,horizon+8);g.fill();}
    }else if(region==='jungle'){
      g.fillStyle='rgba(24,57,45,.62)';for(let i=0;i<9;i++){const x=(i*92-session.cameraX*.12)%(W+140)-70;const hh=70+(i%3)*25;g.beginPath();g.moveTo(x,horizon+75);g.lineTo(x+20,horizon-hh);g.lineTo(x+42,horizon+75);g.fill();g.beginPath();g.arc(x+21,horizon-hh,34+(i%2)*12,0,Math.PI*2);g.fill();}
      g.fillStyle='rgba(80,119,83,.22)';g.fillRect(0,horizon+42,W,H*.22);
    }else{
      g.fillStyle='rgba(37,52,56,.48)';for(let i=0;i<7;i++){const x=(i*128-session.cameraX*.05)%(W+220)-110;g.fillRect(x,horizon-42,52,120);g.beginPath();g.moveTo(x-13,horizon-42);g.lineTo(x+26,horizon-78);g.lineTo(x+65,horizon-42);g.fill();}
      g.fillStyle='rgba(106,118,103,.20)';g.fillRect(0,horizon+35,W,H*.24);
    }
    const mist=g.createLinearGradient(0,H*.40,0,H);mist.addColorStop(0,'rgba(232,239,220,.09)');mist.addColorStop(1,'rgba(16,24,25,.16)');g.fillStyle=mist;g.fillRect(0,H*.40,W,H*.60);
  };

  drawPlatform=function drawPlatformContinuousV5(g,p){
    if(!continuousWorldActive())return __ttdBaseDrawPlatformV5(g,p);
    const pts=platformQuad(p);
    const palette=p.kind==='ground_beach'?['#cdb77f','#e2d09a']:p.kind==='ground_jungle'?['#566d45','#71875b']:['#696a5f','#858477'];
    const grad=g.createLinearGradient(0,Math.min(...pts.map(q=>q.y)),0,Math.max(...pts.map(q=>q.y))+120);grad.addColorStop(0,palette[1]);grad.addColorStop(1,palette[0]);poly(g,pts,grad,'rgba(238,231,196,.16)');
    g.save();g.globalAlpha=.18;g.strokeStyle=p.kind==='ground_beach'?'#fff0c5':p.kind==='ground_jungle'?'#253d27':'#2f3130';g.lineWidth=1;
    for(let i=0;i<9;i++){const t=(i+1)/10;const a={x:pts[0].x+(pts[3].x-pts[0].x)*t,y:pts[0].y+(pts[3].y-pts[0].y)*t};const b={x:pts[1].x+(pts[2].x-pts[1].x)*t,y:pts[1].y+(pts[2].y-pts[1].y)*t};g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}g.restore();
  };

  function drawPalm(g,x,z,scale=1,foreground=false){const p=project(x,z,0),s=p.scale*scale;g.save();g.translate(p.x,p.y);g.scale(s,s);g.globalAlpha=foreground?.96:.82;g.strokeStyle='#5b4933';g.lineWidth=7;g.beginPath();g.moveTo(0,8);g.quadraticCurveTo(-6,-44,7,-94);g.stroke();g.translate(7,-94);g.strokeStyle='#315638';g.lineWidth=10;for(let i=0;i<7;i++){const a=-Math.PI*.88+i*(Math.PI*1.76/6);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(Math.cos(a)*30,Math.sin(a)*18,Math.cos(a)*55,Math.sin(a)*34);g.stroke();}g.restore();}
  function drawJungleTree(g,x,z,scale=1,foreground=false){const p=project(x,z,0),s=p.scale*scale;g.save();g.translate(p.x,p.y);g.scale(s,s);g.globalAlpha=foreground?.98:.86;g.fillStyle='#483d2c';g.fillRect(-8,-92,16,100);g.fillStyle='#294b2f';[[0,-102,42],[-28,-82,30],[30,-80,33],[4,-62,38]].forEach(([cx,cy,r])=>{g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.fill();});g.fillStyle='rgba(98,142,78,.55)';g.beginPath();g.arc(-11,-111,17,0,Math.PI*2);g.fill();g.restore();}
  function drawTempleColumn(g,x,z,scale=1,foreground=false){const p=project(x,z,0),s=p.scale*scale;g.save();g.translate(p.x,p.y);g.scale(s,s);g.globalAlpha=foreground?.98:.9;g.fillStyle='#77766b';g.fillRect(-13,-92,26,92);g.fillStyle='#929083';g.fillRect(-20,-99,40,10);g.fillRect(-18,-8,36,8);g.strokeStyle='rgba(43,45,43,.45)';g.lineWidth=2;g.beginPath();g.moveTo(-5,-89);g.lineTo(2,-56);g.lineTo(-4,-28);g.stroke();g.restore();}
  function drawShell(g,x,z,rot=0){const p=project(x,z,1);g.save();g.translate(p.x,p.y);g.rotate(rot);g.scale(p.scale,p.scale);g.fillStyle='#f2dfc1';g.beginPath();g.arc(0,0,7,Math.PI,0);g.lineTo(0,8);g.closePath();g.fill();g.strokeStyle='rgba(137,102,76,.55)';for(let i=-4;i<=4;i+=2){g.beginPath();g.moveTo(0,7);g.lineTo(i,-2);g.stroke();}g.restore();}
  function drawShrub(g,x,z,scale=1){const p=project(x,z,0);g.save();g.translate(p.x,p.y);g.scale(p.scale*scale,p.scale*scale);g.fillStyle='#3d653e';[-18,0,18].forEach((cx,i)=>{g.beginPath();g.arc(cx,-10-(i%2)*7,18,0,Math.PI*2);g.fill();});g.restore();}

  const WORLD_PROPS=[
    {kind:'palm',x:-40,z:-210,s:.9},{kind:'palm',x:120,z:190,s:1.05},{kind:'palm',x:310,z:-225,s:1.15},{kind:'palm',x:500,z:205,s:.95},
    {kind:'shell',x:145,z:76,r:.5},{kind:'shell',x:270,z:-42,r:-.7},{kind:'shell',x:455,z:118,r:.2},
    {kind:'tree',x:650,z:-215,s:1.05},{kind:'tree',x:720,z:205,s:1.2},{kind:'tree',x:820,z:-190,s:.95},{kind:'tree',x:930,z:210,s:1.15},{kind:'tree',x:1040,z:-205,s:1.0},
    {kind:'shrub',x:610,z:70,s:1},{kind:'shrub',x:760,z:-85,s:.9},{kind:'shrub',x:990,z:95,s:1.1},
    {kind:'column',x:1120,z:-205,s:1.0},{kind:'column',x:1210,z:210,s:1.1},{kind:'column',x:1420,z:-215,s:1.15},{kind:'column',x:1560,z:215,s:1.05},{kind:'column',x:1740,z:-190,s:.95},
  ];
  function drawWorldProps(g,foreground=false){for(const prop of WORLD_PROPS){const front=prop.z>80;if(front!==foreground)continue;if(prop.kind==='palm')drawPalm(g,prop.x,prop.z,prop.s,front);else if(prop.kind==='tree')drawJungleTree(g,prop.x,prop.z,prop.s,front);else if(prop.kind==='column')drawTempleColumn(g,prop.x,prop.z,prop.s,front);else if(prop.kind==='shell')drawShell(g,prop.x,prop.z,prop.r);else drawShrub(g,prop.x,prop.z,prop.s);}}

  drawChest=function drawChestPersistentV5(g,o){
    if(!continuousWorldActive())return __ttdBaseDrawChestV5(g,o);
    if(!o.opened)return __ttdBaseDrawChestV5(g,o);
    const p=project(o.x,o.z,o.y),sc=p.scale;g.save();g.translate(p.x,p.y);g.scale(sc,sc);g.globalAlpha=.72;g.fillStyle='#342b27';g.fillRect(-25,2,50,22);g.fillStyle=o.type==='chest_upgrade'?'#8a713f':'#6d5538';g.fillRect(-23,-4,46,12);g.save();g.translate(0,-12);g.rotate(-.28);g.fillRect(-23,-7,46,10);g.restore();g.strokeStyle=o.type==='chest_upgrade'?'#f3d491':'#c9b27d';g.lineWidth=2;g.strokeRect(-23,-4,46,28);g.restore();
  };

  drawScene=function drawSceneContinuousV5(){
    if(!continuousWorldActive())return __ttdBaseDrawSceneV5();
    const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return;if(!resizePlatformCanvas())throw new Error('Traversal canvas has no usable layout size.');
    const g=c.getContext('2d');g.clearRect(0,0,session.w,session.h);drawBackground(g);currentPlatforms(session.time).forEach(p=>drawPlatform(g,p));drawWorldProps(g,false);drawGate(g);drawHazards(g);
    for(const o of session.objects){o.flash=Math.max(0,(o.flash||0)-.016);if(o.type==='breakable')drawPillar(g,o);else drawChest(g,o);}session.drops.forEach(d=>drawDrop(g,d));drawNavigator(g);drawWorldProps(g,true);
    const hud=document.getElementById('ttdPlatformHud');if(hud){const n=session.nav,navBadge=hud.querySelector('.ttdNavBadge');if(navBadge)navBadge.textContent=n?((DICE[n.die.key]?.name||n.die.key)+' · HP '+Math.max(0,Math.ceil(n.die.hp))+'/'+Math.ceil(n.die.maxHp)+' · '+n.die.dot+' PIP'):'NAVIGATOR REQUIRED';const area=hud.querySelector('.ttdAreaBadge');if(area){const x=n?.x||0;area.textContent=x<580?'BEACH CLEARING':x<1080?'JUNGLE PATH':x<1335?'TEMPLE APPROACH':'TEMPLE COURT';}}
  };

  function renderBattleBackdrop(g,w,h,area=1,time=0,cameraOverride=null){
    if(!g||!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1)return false;
    const previous=session,wstate=ensureWorldState();if(!wstate)return false;
    const camera=Number.isFinite(Number(cameraOverride))?Number(cameraOverride):wstate.cameraX;
    const preview={active:false,phase:'battle',nav:null,w,h,cameraX:camera,time:Number(time)||0,lastTs:0,joyX:0,joyZ:0,checkpoint:{...wstate.traversalStart},objects:wstate.objects,drops:wstate.drops,hazardCd:0,returnAlpha:1,__ttdWorldPreview:true};
    session=preview;
    try{drawBackground(g);currentPlatforms(preview.time).forEach(p=>drawPlatform(g,p));drawWorldProps(g,false);drawGate(g);drawHazards(g);for(const o of preview.objects){if(o.type==='breakable')drawPillar(g,o);else drawChest(g,o);}preview.drops.forEach(d=>drawDrop(g,d));drawWorldProps(g,true);return true;}finally{session=previous;}
  }

${renderMarker}`;
      platformSource=requiredReplace(platformSource,renderMarker,worldInjection,'world renderer insertion');

      platformSource=requiredReplace(platformSource,"      active:true,phase:'select',nav:null,w:1,h:1,cameraX:40,time:0,lastTs:0,\n      joyX:0,joyZ:0,checkpoint:{x:80,z:0,y:0},objects:makeInteractables(),drops:[],hazardCd:0,returnAlpha:1,","      active:true,phase:'select',nav:null,w:1,h:1,cameraX:(ensureWorldState()?.cameraX??arenaCameraX(1)),time:0,lastTs:0,\n      joyX:0,joyZ:0,checkpoint:{...(ensureWorldState()?.traversalStart||arenaCenter(1))},objects:(ensureWorldState()?.objects||makeInteractables()),drops:(ensureWorldState()?.drops||[]),hazardCd:0,returnAlpha:1,",'persistent traversal session');
      platformSource=requiredReplace(platformSource,"    session.cameraX+=((n.x+155)-session.cameraX)*Math.min(1,dt*3.2);","    {const desired=n.x+155,delta=desired-session.cameraX,alpha=1-Math.exp(-dt*2.15),step=Math.max(-7,Math.min(7,delta*alpha));session.cameraX+=step;const world=ensureWorldState();if(world)world.cameraX=session.cameraX;}",'smooth persistent camera');

      platformSource=requiredReplace(platformSource,
        "    session.nav={die,boardIndex,x:cp.x,z:cp.z,y:cp.y,vy:0,onGround:true,jumps:0,invuln:0,alpha:0,spawnT:0};\n    session.phase='play';\n    initObjectHp();\n    enterPlatformLayout();",
        "    session.nav={die,boardIndex,x:cp.x,z:cp.z,y:cp.y,vy:0,onGround:true,jumps:0,invuln:0,alpha:0,spawnT:0};\n    session.phase='materialize';\n    session.joyX=0;session.joyZ=0;\n    initObjectHp();\n    enterPlatformLayout();",
        'centered navigator materialization');

      platformSource=requiredReplace(platformSource,
        "    setupController();\n    requestAnimationFrame(()=>{",
        "    setupController();\n    {const ctrl=document.getElementById('ttdNavController');if(ctrl&&session?.phase==='materialize'){ctrl.style.pointerEvents='none';ctrl.style.opacity='.48';}}\n    requestAnimationFrame(()=>{",
        'disable traversal controls during manifestation');

      platformSource=requiredReplace(platformSource,
        "  function queueJump(){\n    const n=session?.nav;if(!n||session.phase!=='play'||n.jumps>=2)return;\n    n.vy=n.jumps===0?285:250;n.jumps+=1;n.onGround=false;floatTextAtNav(n.jumps===2?'DOUBLE JUMP!':'JUMP','#d4ecfa');\n  }",
        "  function queueJump(){\n    const n=session?.nav;if(!n||session.phase!=='play'||n.jumps>=2)return;\n    n.vy=n.jumps===0?285:250;n.jumps+=1;n.onGround=false;\n  }",
        'remove traversal jump action words');

      platformSource=requiredReplace(platformSource,
        "    collectNearbyDrops();if(n.x>1510)finishPlatform();",
        "    collectNearbyDrops();\n    // Invisible ground event line: reaching the arena entry freezes traversal and begins the same-camera combat handoff.\n    if(n.x>1510){finishPlatform();return;}",
        'invisible combat event line');

      platformSource=requiredReplace(platformSource,
        "    const hpW=54;g.fillStyle='rgba(0,0,0,.65)';g.fillRect(p.x-hpW/2,p.y-size/2-12,hpW,6);g.fillStyle='#78d992';g.fillRect(p.x-hpW/2+1,p.y-size/2-11,(hpW-2)*Math.max(0,n.die.hp/n.die.maxHp),4);",
        "    const hpW=54;g.save();g.globalAlpha=Math.max(0,Math.min(1,n.alpha));g.fillStyle='rgba(0,0,0,.65)';g.fillRect(p.x-hpW/2,p.y-size/2-12,hpW,6);g.fillStyle='#78d992';g.fillRect(p.x-hpW/2+1,p.y-size/2-11,(hpW-2)*Math.max(0,n.die.hp/n.die.maxHp),4);g.restore();",
        'navigator hp manifestation fade');

      platformSource=requiredReplace(platformSource,
        "      if(session.phase==='play'&&session.nav)updateNavigator(dt);updateDrops(dt);drawScene();",
        "      if(session.phase==='materialize'&&session.nav){const n=session.nav;n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*2.6);if(n.alpha>=1){n.alpha=1;session.phase='play';const ctrl=document.getElementById('ttdNavController');if(ctrl){ctrl.style.pointerEvents='';ctrl.style.opacity='';}session.lastTs=ts;}}else if(session.phase==='play'&&session.nav)updateNavigator(dt);updateDrops(dt);drawScene();",
        'navigator materializes before movement');

      const finishReplacement=`  function transitionTween(duration,step){
    return new Promise(resolve=>{const started=performance.now();const frame=now=>{const t=Math.max(0,Math.min(1,(now-started)/duration));step(t);if(t>=1)resolve();else requestAnimationFrame(frame);};requestAnimationFrame(frame);});
  }
  async function finishPlatform(){
    if(!session?.active||session.phase==='combat-transition'||session.phase==='return')return;
    const activeSession=session,nav=activeSession.nav;
    activeSession.phase='combat-transition';activeSession.joyX=0;activeSession.joyZ=0;state.running=false;
    const ctrl=document.getElementById('ttdNavController');if(ctrl){ctrl.style.pointerEvents='none';ctrl.style.opacity='.48';}

    // First the Navigator performs its normal disappearance while the map and camera remain frozen.
    const startAlpha=Math.max(0,Math.min(1,Number(nav?.alpha)||1));
    await transitionTween(380,t=>{if(session===activeSession&&nav)nav.alpha=startAlpha*(1-t);});
    if(session!==activeSession||!activeSession.active)return;
    if(nav)nav.alpha=0;activeSession.nav=null;

    // The normal combat tray is already back before the camera begins moving.
    restoreTrayChildren();

    // One camera, one world: slide the exact traversal camera to the arena center. No alternate map is created.
    const api=window.__TTD_PLATFORM_TEST_API,targetRaw=Number(api?.arenaCameraX?.(2));
    const from=activeSession.cameraX,target=Number.isFinite(targetRaw)?targetRaw:from;
    await transitionTween(900,t=>{
      if(session!==activeSession)return;
      const eased=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
      activeSession.cameraX=from+(target-from)*eased;
      const world=state?.__ttdWorldState;if(world)world.cameraX=activeSession.cameraX;
    });
    if(session!==activeSession||!activeSession.active)return;
    activeSession.cameraX=target;
    const world=state?.__ttdWorldState;if(world){world.cameraX=target;const center=api?.arenaCenter?.(2);if(center)world.traversalStart={...center};}

    state.__ttdPlatformDone=true;state.__ttdTestBattlePath=2;state.wave=3;state.waveClearCredited=false;state.waveClearedAt=0;state.spawnQueue=buildAdventureWave(state.adventureStage,3,state.adventureDiff);state.spawnTimer=0;
    if(modeLabel)modeLabel.textContent='Test Map · Temple Court';renderHUD();renderBoard();
    const ore=state.__ttdPlatformRewards?.dieOre||0,orbs=state.__ttdPlatformRewards?.expOrbs||0;

    activeSession.active=false;clearNavigatorSelectionUi();leavePlatformLayout(true);session=null;
    buildPath(cw,ch);try{drawLane(0);}catch(_){}
    toast(\`Arena reached · Wave 3\${ore||orbs?\` · Loot: \${ore} Ore / \${orbs} EXP Orbs\`:''}\`);
    state.running=true;lastT=0;requestAnimationFrame(loop);
  }
`;
      platformSource=requiredReplaceSection(platformSource,"  function finishPlatform(){","\n\n  const baseUpdateSpawns=updateSpawns;",finishReplacement,'fluid traversal-to-combat handoff');

      const apiMarker="window.__TTD_PLATFORM_TEST_API={version:2,start:()=>startAdventure(TEST_ID,0,selectedDifficulty),get active(){return!!session?.active;}};";
      const apiReplacement="window.__TTD_PLATFORM_TEST_API={version:5,start:()=>startAdventure(TEST_ID,0,selectedDifficulty),selectNavigator:(boardIndex)=>chooseNavigator(Number(boardIndex)),renderBattleBackdrop:(g,w,h,area,time,cameraX)=>renderBattleBackdrop(g,w,h,area,time,cameraX),projectWorldPoint:(x,z,y,w,h,cameraX)=>projectWorldPoint(x,z,y,w,h,cameraX),projectBattleRoute:(w,h,area,cameraX)=>projectBattleRoute(w,h,area,cameraX),arenaCameraX:(area)=>arenaCameraX(area),arenaCenter:(area)=>arenaCenter(area),setWorldCamera:(x)=>setWorldCamera(x),ensureWorldState:()=>ensureWorldState(),get worldState(){return ensureWorldState();},get liveBoardIndices(){return liveBoardIndices();},get selecting(){return!!session?.active&&session.phase==='select';},get active(){return!!session?.active;}};";
      platformSource=requiredReplace(platformSource,apiMarker,apiReplacement,'platform API v5');
      eval(`${platformSource}\n//# sourceURL=/online/adventure-platforming-v2.js`);

      const selectorResponse=await fetch('/online/adventure-platforming-selector-v6.js?v=6',{cache:'no-store'});if(!selectorResponse.ok)throw new Error(`Navigator selector v6 HTTP ${selectorResponse.status}`);eval(`${await selectorResponse.text()}\n//# sourceURL=/online/adventure-platforming-selector-v6.js`);
      const continuousResponse=await fetch('/online/adventure-continuous-world-v1.js?v=2',{cache:'no-store'});if(!continuousResponse.ok)throw new Error(`Continuous world marker HTTP ${continuousResponse.status}`);eval(`${await continuousResponse.text()}\n//# sourceURL=/online/adventure-continuous-world-v1.js`);
      const worldResponse=await fetch('/online/adventure-pseudo3d-battle-v1.js?v=5',{cache:'no-store'});if(!worldResponse.ok)throw new Error(`Persistent same-map battle HTTP ${worldResponse.status}`);eval(`${await worldResponse.text()}\n//# sourceURL=/online/adventure-pseudo3d-battle-v1.js`);

      installPlatformOnlineStartSyncV2();


    }catch(err){
      console.error('Adventure continuous-world module could not load.',err);
      try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'continuous-world-v2 + same-map-battle-v5',message:String(err?.message||err)},location.origin);}catch(_){}
    }

    // TTD_PRESENTATION_INDEPENDENT_LOAD_V1
    // Preserve the old sequencing (world patches first, presentation wrappers second), but do
    // not let a Test Map failure suppress mission/outcome presentation for every game mode.
    try{
      const presentationUrl=window.__TTD_ASSET_URL?.('/online/game-presentation-v1.js?v=6')||'/online/game-presentation-v1.js?v=6';
      await new Promise((resolve,reject)=>{
        if(window.__TTD_GAME_PRESENTATION_V6){resolve();return;}
        const script=document.createElement('script');script.src=presentationUrl;script.async=false;
        script.onload=resolve;script.onerror=()=>reject(new Error('Game presentation script could not load.'));
        document.head.appendChild(script);
      });
      window.TTDGamePresentation?.rebind?.();
    }catch(err){
      console.error('Game presentation module could not load.',err);
      try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'presentation-v6',message:String(err?.message||err)},location.origin);}catch(_){}
    }
  }
  loadAdventurePlatformingV2();
})();
