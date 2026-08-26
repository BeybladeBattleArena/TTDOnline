(() => {
  'use strict';
  if (window.__TTD_ADVENTURE_PLATFORM_V2) return;
  window.__TTD_ADVENTURE_PLATFORM_V2 = true;

  const TEST_ID = 'test_map';
  const TEST_STAGE = {
    name:'Traversal Systems Test',
    waves:4,
    carryover:[],
    introduce:{1:['goblin','goblin_dog','spindlevine'],3:['goblin_thrower']},
    smallBoss:{},
    subBoss:null,
  };
  const TEST_ADVENTURE = {
    name:'Test Map',
    campaign:false,
    testMap:true,
    stages:[TEST_STAGE],
  };
  ADVENTURES[TEST_ID] = TEST_ADVENTURE;

  const style = document.createElement('style');
  style.id = 'ttdAdventurePlatformStyleV2';
  style.textContent = `
    #gameScreen.ttd-nav-instance-select #boardWrap{
      position:relative;
      border:1px solid rgba(243,212,145,.55);
      border-radius:12px;
      margin:7px;
      padding:9px;
      box-shadow:0 0 24px rgba(243,212,145,.17),inset 0 0 24px rgba(243,212,145,.06);
      background:rgba(217,178,106,.035);
    }
    #gameScreen.ttd-nav-instance-select #tray{opacity:.38;pointer-events:none;filter:saturate(.65);}
    #gameScreen.ttd-nav-instance-select #board .tile{
      opacity:.28;
      filter:grayscale(.55);
      pointer-events:none;
    }
    #gameScreen.ttd-nav-instance-select #board .tile.ttd-nav-choice{
      opacity:1;
      filter:none;
      pointer-events:auto;
      cursor:pointer;
      outline:1px solid rgba(243,212,145,.82);
      animation:ttdNavInstancePulse 1.05s ease-in-out infinite;
      z-index:3;
    }
    #ttdNavInstancePrompt{
      position:absolute;left:50%;top:6px;z-index:9;transform:translate(-50%,-100%);
      min-width:min(92vw,360px);max-width:92vw;padding:7px 12px;border-radius:14px;
      border:1px solid rgba(243,212,145,.58);background:rgba(9,13,24,.94);
      color:#f3d491;text-align:center;font:700 10px 'Cinzel',serif;letter-spacing:.04em;
      box-shadow:0 6px 20px rgba(0,0,0,.35);pointer-events:none;
    }
    @keyframes ttdNavInstancePulse{
      50%{transform:translateY(-2px);box-shadow:0 0 16px rgba(243,212,145,.52),inset 0 0 0 1px rgba(255,255,255,.14)}
    }

    #gameScreen.ttd-platform-mode{
      display:grid!important;
      grid-template-rows:auto minmax(230px,1fr) auto!important;
      grid-template-columns:minmax(0,1fr)!important;
    }
    #gameScreen.ttd-platform-mode #hud{grid-row:1;grid-column:1;}
    #gameScreen.ttd-platform-mode #laneWrap{
      grid-row:2;grid-column:1;position:relative!important;
      width:100%!important;height:auto!important;min-height:230px!important;max-height:none!important;
      flex:none!important;border-bottom:1px solid rgba(217,178,106,.24)!important;background:#101526!important;
      overflow:hidden!important;
    }
    #gameScreen.ttd-platform-mode #boardWrap{display:none!important;}
    #gameScreen.ttd-platform-mode #laneCanvas{visibility:hidden!important;}
    #gameScreen.ttd-platform-mode #tray{grid-row:3;grid-column:1;}
    #gameScreen.ttd-platform-mode #pauseBtn{visibility:hidden!important;}
    #gameScreen.ttd-platform-mode #endRunBtn{visibility:visible!important;pointer-events:auto!important;opacity:1!important;}
    #ttdPlatformCanvas{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:8;touch-action:none;}
    #ttdPlatformHud{position:absolute;left:8px;right:8px;top:7px;z-index:10;pointer-events:none;display:flex;gap:7px;align-items:flex-start;justify-content:space-between;}
    #ttdPlatformHud .ttdNavBadge,#ttdPlatformHud .ttdAreaBadge{
      border:1px solid rgba(217,178,106,.45);border-radius:10px;background:rgba(9,13,24,.82);
      box-shadow:0 6px 18px rgba(0,0,0,.22);padding:5px 8px;color:#ece7da;font:700 9px 'Space Mono',monospace;
      backdrop-filter:blur(3px);
    }
    #ttdPlatformHud .ttdAreaBadge{color:#f3d491;text-align:right;}
    #ttdPlatformError{
      position:absolute;inset:0;z-index:25;display:none;align-items:center;justify-content:center;padding:26px;
      background:rgba(6,9,17,.92);color:#ece7da;text-align:center;font:700 11px 'Space Mono',monospace;line-height:1.6;
    }
    #ttdPlatformError.show{display:flex;}
    #ttdNavController{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;min-height:88px;padding:2px 5px;}
    #ttdJoyWrap{grid-column:1;width:82px;height:82px;position:relative;border-radius:50%;justify-self:start;touch-action:none;
      border:1px solid rgba(143,196,232,.38);background:radial-gradient(circle,rgba(143,196,232,.16),rgba(10,12,20,.65) 68%);
      box-shadow:inset 0 0 20px rgba(0,0,0,.35);}
    #ttdJoyKnob{position:absolute;left:27px;top:27px;width:28px;height:28px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle at 35% 30%,#d4ecfa,#8fc4e8 55%,#4f7297);box-shadow:0 3px 10px rgba(0,0,0,.45);}
    #ttdControllerReadout{grid-column:2;min-width:105px;text-align:center;font:700 9px 'Space Mono',monospace;color:#97a0bd;line-height:1.45;}
    #ttdControllerReadout strong{display:block;color:#ece7da;font-size:10px;}
    #ttdJumpBtn{grid-column:3;justify-self:end;width:72px;height:72px;border-radius:50%;border:1px solid rgba(243,212,145,.65);
      background:radial-gradient(circle at 35% 25%,#f3d491,#b18849 70%);color:#111522;font:800 11px 'Cinzel',serif;
      box-shadow:0 5px 14px rgba(0,0,0,.4);touch-action:none;}
    #ttdJumpBtn:active{transform:translateY(2px) scale(.97);}
    .ttdNavReturnGhost{position:fixed;z-index:220;border-radius:10px;pointer-events:none;display:flex;align-items:center;justify-content:center;
      box-shadow:0 0 18px rgba(243,212,145,.42),0 6px 18px rgba(0,0,0,.45);transition:left .55s cubic-bezier(.2,.78,.2,1),top .55s cubic-bezier(.2,.78,.2,1),width .55s ease,height .55s ease,opacity .55s ease,transform .55s ease;}
    .ttdPlatformFloatText{position:absolute;z-index:12;pointer-events:none;transform:translate(-50%,-50%);font:800 11px 'Space Mono',monospace;
      color:#fff;text-shadow:0 2px 3px #000;animation:ttdPlatFloat .9s ease-out forwards;}
    @keyframes ttdPlatFloat{to{opacity:0;transform:translate(-50%,-50%) translateY(-30px)}}
  `;
  document.head.appendChild(style);

  const baseRenderStageScreen = renderStageScreen;
  renderStageScreen = function renderStageScreenWithTraversalTest(){
    baseRenderStageScreen();
    if(selectedAdventureId!==TEST_ID)return;
    const title=document.getElementById('stageScreenTitle');
    if(title)title.textContent='Test Map';
    const list=document.getElementById('stageList');
    if(!list)return;
    list.innerHTML='';
    const card=document.createElement('div');
    card.className='stageCard';
    card.innerHTML=`<h3>Traversal Systems Test</h3><p>2 battle waves → summoned-die traversal, puzzles and treasure → 2 battle waves on a new marching path.</p><button>Begin Test Map</button>`;
    card.querySelector('button').addEventListener('click',()=>startAdventure(TEST_ID,0,selectedDifficulty));
    list.appendChild(card);
  };

  function tagTestState(){
    if(!state)return;
    state.__ttdTestMap=true;
    state.__ttdTestBattlePath=1;
    state.__ttdPlatformDone=false;
    state.__ttdPlatformRewards={dieOre:0,expOrbs:0,bonusWaveCredits:0};
    state.__ttdPlatformBonusApplied=false;
    if(modeLabel)modeLabel.textContent='Test Map · First Route';
  }

  const baseStartAdventure=startAdventure;
  startAdventure=function startAdventureWithTraversalTest(advId,stageIdx,diffKey){
    const before=state;
    const result=baseStartAdventure(advId,stageIdx,diffKey);
    if(advId===TEST_ID&&state&&state!==before)tagTestState();
    return result;
  };

  const baseBuildPath=buildPath;
  function buildTestRouteTwo(w,h){
    pathPts=[
      {x:w*.94,y:h*.16},{x:w*.38,y:h*.16},{x:w*.38,y:h*.40},
      {x:w*.80,y:h*.40},{x:w*.80,y:h*.68},{x:w*.24,y:h*.68},
      {x:w*.24,y:h*.87},{x:w*.92,y:h*.87},
    ];
    segLens=[];totalLen=0;
    for(let i=1;i<pathPts.length;i++){
      const dx=pathPts[i].x-pathPts[i-1].x,dy=pathPts[i].y-pathPts[i-1].y;
      const len=Math.hypot(dx,dy);segLens.push(len);totalLen+=len;
    }
    towerPos=pathPts[pathPts.length-1];
  }
  buildPath=function buildPathWithTraversalTest(w,h){
    if(state?.__ttdTestMap&&state.__ttdTestBattlePath===2)return buildTestRouteTwo(w,h);
    return baseBuildPath(w,h);
  };

  let session=null;
  const keys=new Set();

  function liveBoardIndices(){
    const out=[];
    (state?.board||[]).forEach((die,index)=>{if(die&&Number(die.hp)>0)out.push(index);});
    return out;
  }

  function ensurePlatformDom(){
    const lane=document.getElementById('laneWrap');
    if(!lane)return null;
    let canvasEl=document.getElementById('ttdPlatformCanvas');
    if(!canvasEl){
      canvasEl=document.createElement('canvas');canvasEl.id='ttdPlatformCanvas';lane.appendChild(canvasEl);
      canvasEl.addEventListener('pointerdown',onCanvasTap,{passive:false});
    }
    let hud=document.getElementById('ttdPlatformHud');
    if(!hud){
      hud=document.createElement('div');hud.id='ttdPlatformHud';
      hud.innerHTML='<div class="ttdNavBadge">NAVIGATOR</div><div class="ttdAreaBadge">ANCIENT WALKWAY</div>';
      lane.appendChild(hud);
    }
    let err=document.getElementById('ttdPlatformError');
    if(!err){err=document.createElement('div');err.id='ttdPlatformError';lane.appendChild(err);}
    return canvasEl;
  }

  function clearNavigatorSelectionUi(){
    const game=document.getElementById('gameScreen');
    game?.classList.remove('ttd-nav-instance-select');
    document.getElementById('ttdNavInstancePrompt')?.remove();
    document.querySelectorAll('#board .tile').forEach(el=>el.classList.remove('ttd-nav-choice'));
  }

  function setupNavigatorSelection(message){
    if(!session?.active)return;
    state.running=false;
    leavePlatformLayout(false);
    renderBoard();
    const choices=liveBoardIndices();
    if(!choices.length){
      clearNavigatorSelectionUi();
      session.active=false;session=null;
      state.running=true;lastT=0;
      endMatch('wipeout');
      return;
    }
    session.phase='select';session.nav=null;
    const game=document.getElementById('gameScreen');
    const boardWrap=document.getElementById('boardWrap');
    game?.classList.add('ttd-nav-instance-select');
    let prompt=document.getElementById('ttdNavInstancePrompt');
    if(!prompt){prompt=document.createElement('div');prompt.id='ttdNavInstancePrompt';boardWrap?.appendChild(prompt);}
    if(prompt)prompt.textContent=message||'Select one of your currently summoned dice to navigate with';
    const tiles=[...document.querySelectorAll('#board .tile')];
    tiles.forEach((tile,index)=>tile.classList.toggle('ttd-nav-choice',choices.includes(index)));
    toast('Choose a summoned die instance');
  }

  const boardEl=document.getElementById('board');
  boardEl?.addEventListener('click',(event)=>{
    if(!session?.active||session.phase!=='select')return;
    const tile=event.target.closest('.tile');if(!tile||!tile.classList.contains('ttd-nav-choice'))return;
    event.preventDefault();event.stopImmediatePropagation();
    const tiles=[...boardEl.querySelectorAll('.tile')];
    const boardIndex=tiles.indexOf(tile);
    if(boardIndex>=0)chooseNavigator(boardIndex);
  },true);

  function beginPlatform(){
    if(session?.active)return;
    session={
      active:true,phase:'select',nav:null,w:1,h:1,cameraX:40,time:0,lastTs:0,
      joyX:0,joyZ:0,checkpoint:{x:80,z:0,y:0},objects:makeInteractables(),drops:[],hazardCd:0,returnAlpha:1,
    };
    setupNavigatorSelection('Select one of your currently summoned dice to navigate with');
  }

  function chooseNavigator(boardIndex){
    if(!session?.active||session.phase!=='select')return;
    const die=state.board?.[boardIndex];
    if(!die||die.hp<=0)return;
    clearNavigatorSelectionUi();
    const cp=session.checkpoint;
    session.nav={die,boardIndex,x:cp.x,z:cp.z,y:cp.y,vy:0,onGround:true,jumps:0,invuln:0,alpha:0,spawnT:0};
    session.phase='play';
    initObjectHp();
    enterPlatformLayout();
  }

  function enterPlatformLayout(){
    const game=document.getElementById('gameScreen');
    game?.classList.add('ttd-platform-mode');
    ensurePlatformDom();
    setupController();
    requestAnimationFrame(()=>{
      resizePlatformCanvas();
      try{drawScene();}catch(err){failTraversalRenderer(err);return;}
      session.lastTs=0;
      requestAnimationFrame(platformLoop);
    });
  }

  function leavePlatformLayout(removeCanvas=true){
    const game=document.getElementById('gameScreen');
    game?.classList.remove('ttd-platform-mode');
    const lane=document.getElementById('laneWrap');if(lane)lane.style.height='';
    restoreTrayChildren();
    if(removeCanvas){
      document.getElementById('ttdPlatformHud')?.remove();
      document.getElementById('ttdPlatformError')?.remove();
      document.getElementById('ttdPlatformCanvas')?.remove();
    }
  }

  function resizePlatformCanvas(){
    const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return false;
    const lane=document.getElementById('laneWrap');
    const game=document.getElementById('gameScreen');
    let r=c.getBoundingClientRect();
    if(r.height<180&&lane&&game){
      const hudH=document.getElementById('hud')?.getBoundingClientRect().height||0;
      const trayH=document.getElementById('tray')?.getBoundingClientRect().height||0;
      lane.style.height=`${Math.max(230,game.getBoundingClientRect().height-hudH-trayH)}px`;
      r=c.getBoundingClientRect();
    }
    if(r.width<40||r.height<120)return false;
    const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    c.width=Math.max(1,Math.round(r.width*dpr));c.height=Math.max(1,Math.round(r.height*dpr));
    const g=c.getContext('2d');if(!g)return false;
    g.setTransform(dpr,0,0,dpr,0,0);
    session.w=r.width;session.h=r.height;
    return true;
  }
  window.addEventListener('resize',()=>{if(session?.active&&session.phase!=='select')requestAnimationFrame(resizePlatformCanvas);});

  function failTraversalRenderer(err){
    console.error('Traversal renderer failed.',err);
    const panel=document.getElementById('ttdPlatformError');
    if(panel){panel.classList.add('show');panel.textContent='Traversal renderer stopped unexpectedly. End Run is still available; this run will not trap you.';}
    if(session)session.phase='error';
  }

  function project(x,z,y=0){
    const W=session.w,H=session.h;
    const scale=Math.max(.52,Math.min(.82,W/520));
    const relX=x-session.cameraX,depth=(z+220)/440,persp=.82+depth*.22;
    return {x:W*.47+relX*scale*persp,y:H*.68+z*.28*scale-y*scale-relX*.035*scale,scale:scale*persp};
  }
  function platformQuad(p){return [project(p.x1,p.z1,p.y),project(p.x2,p.z1,p.y),project(p.x2,p.z2,p.y),project(p.x1,p.z2,p.y)];}
  function poly(g,pts,fill,stroke){
    g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();
    if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.stroke();}
  }

  function currentPlatforms(t){
    const blinkOn=(Math.floor(t/1.15)%2)===0,movingOffset=Math.sin(t*1.8)*42;
    return [
      {id:'start',x1:-120,x2:270,z1:-190,z2:190,y:0,kind:'stone'},
      {id:'step1',x1:285,x2:420,z1:-155,z2:145,y:28,kind:'step'},
      {id:'step2',x1:435,x2:555,z1:-115,z2:115,y:62,kind:'step'},
      {id:'bridgeA',x1:575,x2:690,z1:-82,z2:82,y:72,kind:'timed',active:blinkOn},
      {id:'moving',x1:720+movingOffset,x2:830+movingOffset,z1:-82,z2:82,y:86,kind:'moving',active:true},
      {id:'gatecourt',x1:850,x2:1080,z1:-190,z2:190,y:56,kind:'court'},
      {id:'treasure',x1:1095,x2:1325,z1:-195,z2:195,y:40,kind:'court'},
      {id:'finish',x1:1340,x2:1580,z1:-170,z2:170,y:20,kind:'finish'},
    ].filter(p=>p.active!==false);
  }
  function groundAt(x,z,t){
    let best=null;
    for(const p of currentPlatforms(t))if(x>=p.x1&&x<=p.x2&&z>=p.z1&&z<=p.z2&&(!best||p.y>best.y))best=p;
    return best;
  }
  function makeInteractables(){
    return [
      {id:'cracked_pillar',type:'breakable',name:'Cracked Seal Pillar',x:930,z:122,y:56,hp:0,maxHp:0,broken:false},
      {id:'food_chest',type:'chest_food',name:'Food Chest',x:1145,z:-120,y:40,hp:0,maxHp:0,opened:false},
      {id:'coin_chest',type:'chest_coin',name:'Coin Chest',x:1210,z:0,y:40,hp:0,maxHp:0,opened:false},
      {id:'upgrade_chest',type:'chest_upgrade',name:'Upgrade Chest',x:1270,z:120,y:40,hp:0,maxHp:0,opened:false},
    ];
  }
  function initObjectHp(){
    const ap=Math.max(1,Math.round(effDmg(session.nav.die)));
    for(const o of session.objects){if(o.maxHp>0)continue;const hits=o.type==='breakable'?3:2;o.maxHp=o.hp=Math.max(6,ap*hits);}
  }

  function restoreTrayChildren(){
    const tray=document.getElementById('tray');if(!tray)return;
    document.getElementById('ttdNavController')?.remove();
    [...tray.children].forEach(ch=>ch.style.display='');
    renderDeckTray();
  }
  function setupController(){
    const tray=document.getElementById('tray');if(!tray)return;
    [...tray.children].forEach(ch=>{if(ch.id!=='ttdNavController')ch.style.display='none';});
    let ctrl=document.getElementById('ttdNavController');
    if(!ctrl){
      ctrl=document.createElement('div');ctrl.id='ttdNavController';
      ctrl.innerHTML='<div id="ttdJoyWrap"><div id="ttdJoyKnob"></div></div><div id="ttdControllerReadout"><strong>MOVE</strong>Drag joystick<br>Double jump enabled</div><button id="ttdJumpBtn" type="button">JUMP</button>';
      tray.appendChild(ctrl);bindJoystick();
      document.getElementById('ttdJumpBtn')?.addEventListener('pointerdown',e=>{e.preventDefault();queueJump();},{passive:false});
    }
  }
  function bindJoystick(){
    const wrap=document.getElementById('ttdJoyWrap'),knob=document.getElementById('ttdJoyKnob');if(!wrap||!knob)return;
    let pid=null;
    const update=e=>{
      const r=wrap.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;
      const max=29,dist=Math.hypot(dx,dy);if(dist>max){dx=dx/dist*max;dy=dy/dist*max;}
      if(session){session.joyX=dx/max;session.joyZ=dy/max;}knob.style.transform=`translate(${dx}px,${dy}px)`;
    };
    const reset=()=>{pid=null;if(session){session.joyX=0;session.joyZ=0;}knob.style.transform='translate(0,0)';};
    wrap.addEventListener('pointerdown',e=>{e.preventDefault();pid=e.pointerId;wrap.setPointerCapture?.(pid);update(e);},{passive:false});
    wrap.addEventListener('pointermove',e=>{if(e.pointerId===pid){e.preventDefault();update(e);}},{passive:false});
    wrap.addEventListener('pointerup',e=>{if(e.pointerId===pid)reset();});wrap.addEventListener('pointercancel',reset);
  }

  window.addEventListener('keydown',e=>{
    if(!session?.active||session.phase!=='play')return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space'].includes(e.code))e.preventDefault();
    if(e.code==='Space'&&!keys.has(e.code))queueJump();keys.add(e.code);
  },true);
  window.addEventListener('keyup',e=>keys.delete(e.code),true);
  function queueJump(){
    const n=session?.nav;if(!n||session.phase!=='play'||n.jumps>=2)return;
    n.vy=n.jumps===0?285:250;n.jumps+=1;n.onGround=false;floatTextAtNav(n.jumps===2?'DOUBLE JUMP!':'JUMP','#d4ecfa');
  }
  function inputVector(){
    let x=session?.joyX||0,z=session?.joyZ||0;
    if(keys.has('ArrowLeft')||keys.has('KeyA'))x-=1;if(keys.has('ArrowRight')||keys.has('KeyD'))x+=1;
    if(keys.has('ArrowUp')||keys.has('KeyW'))z-=1;if(keys.has('ArrowDown')||keys.has('KeyS'))z+=1;
    const m=Math.hypot(x,z);if(m>1){x/=m;z/=m;}return{x,z};
  }

  function blockedByGate(x,z){const pillar=session.objects.find(o=>o.id==='cracked_pillar');return pillar&&!pillar.broken&&x>955&&x<1000&&Math.abs(z)<190;}
  function updateNavigator(dt){
    const n=session.nav;if(!n)return;
    n.spawnT+=dt;n.alpha=Math.min(1,n.alpha+dt*3.5);n.invuln=Math.max(0,n.invuln-dt);
    const inp=inputVector(),speed=175;let nx=n.x+inp.x*speed*dt,nz=n.z+inp.z*speed*dt;nz=Math.max(-205,Math.min(205,nz));
    if(blockedByGate(nx,nz))nx=n.x;
    const currentG=groundAt(n.x,n.z,session.time),targetG=groundAt(nx,nz,session.time);
    if(n.onGround&&targetG&&currentG&&targetG.y-currentG.y>38){nx=n.x;nz=n.z;}
    n.x=nx;n.z=nz;n.vy-=650*dt;n.y+=n.vy*dt;
    const ground=groundAt(n.x,n.z,session.time);
    if(ground&&n.vy<=0&&n.y<=ground.y+3){n.y=ground.y;n.vy=0;n.onGround=true;n.jumps=0;}else n.onGround=false;
    if(n.y<-150){
      navigatorDamage(Math.max(10,n.die.maxHp*.22),'Navigator fell');
      if(session?.nav){const cp=session.checkpoint;n.x=cp.x;n.z=cp.z;n.y=cp.y;n.vy=0;n.jumps=0;n.onGround=true;}
    }
    if(n.x>1020)session.checkpoint={x:1010,z:0,y:56};if(n.x>1300)session.checkpoint={x:1290,z:0,y:40};
    if(n.x>1370&&Math.abs(n.z)<135){session.hazardCd-=dt;if(session.hazardCd<=0){session.hazardCd=1.25;navigatorDamage(Math.max(4,n.die.maxHp*.11),'Temple trap');}}
    else session.hazardCd=Math.max(0,session.hazardCd-dt);
    collectNearbyDrops();if(n.x>1510)finishPlatform();
    session.cameraX+=((n.x+155)-session.cameraX)*Math.min(1,dt*3.2);
  }

  function navigatorDamage(amount,reason){
    const n=session?.nav;if(!n||n.invuln>0)return;
    n.die.hp-=Math.max(1,amount);n.invuln=.8;floatTextAtNav(`-${Math.round(amount)}`,'#ff9a91');renderBoard();
    if(n.die.hp>0)return;
    if(state.board?.[n.boardIndex]===n.die)state.board[n.boardIndex]=null;
    renderBoard();
    const checkpoint={...session.checkpoint};
    leavePlatformLayout(true);clearNavigatorSelectionUi();
    session.nav=null;session.checkpoint=checkpoint;session.phase='select';
    setupNavigatorSelection(`${reason||'Navigator destroyed'} — select another summoned die`);
  }
  function healNavigator(amount){
    const n=session?.nav;if(!n)return;const before=n.die.hp;n.die.hp=Math.min(n.die.maxHp,n.die.hp+amount);
    floatTextAtNav(`+${Math.round(n.die.hp-before)} HP`,'#8ff0aa');renderBoard();
  }
  function pipUp(){
    const n=session?.nav;if(!n)return;if(n.die.dot>=7){floatTextAtNav('MAX PIPS','#f3d491');return;}
    const ratio=n.die.hp/Math.max(1,n.die.maxHp);n.die.dot+=1;n.die.maxHp=Math.max(1,Math.round(effHp(n.die)));n.die.hp=Math.max(1,n.die.maxHp*ratio);
    floatTextAtNav(`★ PIP ${n.die.dot}`,'#f3d491');renderBoard();
  }

  function updateDrops(dt){
    for(let i=session.drops.length-1;i>=0;i--){const d=session.drops[i];d.t+=dt;if(d.bounceT>0){d.bounceT-=dt;d.y=d.baseY+Math.abs(Math.sin(d.t*8))*22*Math.max(0,d.bounceT);}else d.y=d.baseY;if(d.source==='combat'&&d.t>=Math.max(.1,Number(d.ttl)||6))session.drops.splice(i,1);}
  }
  function collectNearbyDrops(){
    const n=session.nav;if(!n)return;
    for(const d of session.drops){if(d.collected)continue;const dist=Math.hypot(n.x-d.x,(n.z-d.z)*.8);if(dist>34)continue;if(['coin','star','ore','exp'].includes(d.kind))collectDrop(d);}
  }
  function collectDrop(d){
    if(d.collected||!session?.nav)return;d.collected=true;
    if(d.kind==='food')healNavigator(session.nav.die.maxHp*d.value);
    else if(d.kind==='coin'){state.coinGold=(state.coinGold||0)+d.value;renderHUD();floatTextAtNav(`+${d.value} PIPS`,'#f3d491');}
    else if(d.kind==='star')pipUp();
    else if(d.kind==='ore'){state.__ttdPlatformRewards.dieOre+=d.value;floatTextAtNav(`+${d.value} DIE ORE`,'#c9b8f0');}
    else if(d.kind==='exp'){state.__ttdPlatformRewards.expOrbs+=d.value;state.__ttdPlatformRewards.bonusWaveCredits+=d.value;floatTextAtNav(`+${d.value} EXP ORB${d.value===1?'':'S'}`,'#8fc4e8');}
  }

  function attackObject(o){
    const n=session?.nav;if(!n||o.opened||o.broken)return;const dmg=Math.max(1,Math.round(effDmg(n.die)));o.hp=Math.max(0,o.hp-dmg);o.flash=.18;floatObjectText(o,`-${dmg}`);
    if(o.hp>0)return;
    if(o.type==='breakable'){o.broken=true;floatObjectText(o,'SEAL BROKEN');session.checkpoint={x:900,z:0,y:56};return;}
    o.opened=true;spawnChestLoot(o);
  }
  function spawnChestLoot(o){
    const push=(kind,value,dx,dz,icon)=>session.drops.push({kind,value,x:o.x+dx,z:o.z+dz,baseY:o.y+10,y:o.y+10,t:0,bounceT:1.1,collected:false,icon,isGold:kind==='coin'?value>=5:null});
    if(o.type==='chest_food'){push('food',.24,-34,-8,'🍎');push('food',.18,10,28,'🥥');push('food',.30,38,-22,'🥤');}
    else if(o.type==='chest_coin'){const count=3+Math.floor(Math.random()*3);for(let i=0;i<count;i++)push('coin',3+Math.floor(Math.random()*8),(i-(count-1)/2)*24,(i%2?22:-20),'●');}
    else if(o.type==='chest_upgrade'){
      if(Math.random()<.68)push('star',1,0,0,'★');
      else{push('ore',2+Math.floor(Math.random()*3),-22,-8,'◆');push('exp',2+Math.floor(Math.random()*3),24,12,'✦');}
    }
  }

  function objectHit(o,px,py){const p=project(o.x,o.z,o.y+22),r=o.type==='breakable'?34:30;return Math.abs(px-p.x)<r&&Math.abs(py-p.y)<r;}
  function dropHit(d,px,py){const p=project(d.x,d.z,d.y+15);return Math.hypot(px-p.x,py-p.y)<23;}
  function onCanvasTap(e){
    if(!session?.active||session.phase!=='play')return;e.preventDefault();
    const r=e.currentTarget.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
    for(let i=session.drops.length-1;i>=0;i--){const d=session.drops[i];if(!d.collected&&dropHit(d,px,py)){collectDrop(d);return;}}
    const hit=session.objects.find(o=>!o.opened&&!o.broken&&objectHit(o,px,py));if(hit)attackObject(hit);
  }

  function floatTextAtNav(text,color){
    const c=document.getElementById('ttdPlatformCanvas'),n=session?.nav;if(!c||!n)return;const p=project(n.x,n.z,n.y+45);
    const el=document.createElement('div');el.className='ttdPlatformFloatText';el.textContent=text;el.style.color=color||'#fff';el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;c.parentElement.appendChild(el);setTimeout(()=>el.remove(),950);
  }
  function floatObjectText(o,text){
    const c=document.getElementById('ttdPlatformCanvas');if(!c)return;const p=project(o.x,o.z,o.y+60);
    const el=document.createElement('div');el.className='ttdPlatformFloatText';el.textContent=text;el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;c.parentElement.appendChild(el);setTimeout(()=>el.remove(),950);
  }

  function drawBackground(g){
    const W=session.w,H=session.h,grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#172742');grad.addColorStop(.48,'#26314a');grad.addColorStop(1,'#101522');g.fillStyle=grad;g.fillRect(0,0,W,H);
    g.fillStyle='rgba(154,190,173,.10)';
    for(let i=0;i<8;i++){const x=(i*137-session.cameraX*.06)%(W+180)-90;g.beginPath();g.moveTo(x,H*.30);g.lineTo(x+58,H*.12);g.lineTo(x+105,H*.30);g.fill();}
    const horizon=H*.33;g.strokeStyle='rgba(212,236,250,.12)';g.lineWidth=1;
    for(let i=0;i<7;i++){const y=horizon+i*i*7;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    for(let i=-5;i<=5;i++){g.beginPath();g.moveTo(W*.5+i*20,horizon);g.lineTo(W*.5+i*115,H);g.stroke();}
  }
  function drawPlatform(g,p){
    const pts=platformQuad(p);const palette={stone:['#5f6270','#373b48'],step:['#686a73','#3b3e4a'],timed:['#73858c','#384b54'],moving:['#806f5a','#4b4034'],court:['#6f6556','#403a34'],finish:['#706d78','#3e3b46']}[p.kind]||['#666','#333'];
    const side=pts.map(q=>({x:q.x,y:q.y+14}));poly(g,[pts[3],pts[2],side[2],side[3]],palette[1],null);poly(g,pts,palette[0],'rgba(230,220,190,.22)');
  }
  function drawHpBar(g,o,x,y,w){if(o.hp<=0||o.hp>=o.maxHp)return;g.fillStyle='rgba(0,0,0,.62)';g.fillRect(x-w/2,y,w,5);g.fillStyle='#ff7f76';g.fillRect(x-w/2+1,y+1,(w-2)*(o.hp/o.maxHp),3);}
  function drawChest(g,o){
    const p=project(o.x,o.z,o.y),sc=p.scale*(o.flash?1.08:1);g.save();g.translate(p.x,p.y);g.scale(sc,sc);if(o.opened)g.globalAlpha=.32;
    g.fillStyle=o.type==='chest_food'?'#68503a':o.type==='chest_coin'?'#8b6e35':'#76613b';g.fillRect(-23,-24,46,28);g.fillStyle='#342b27';g.fillRect(-25,4,50,22);g.strokeStyle=o.type==='chest_upgrade'?'#f3d491':'#c9b27d';g.lineWidth=2;g.strokeRect(-23,-24,46,50);g.fillStyle='#f3d491';g.fillRect(-4,0,8,10);g.restore();
    if(!o.opened)drawHpBar(g,o,p.x,p.y-36,48);
  }
  function drawPillar(g,o){
    if(o.broken)return;const p=project(o.x,o.z,o.y),sc=p.scale;g.save();g.translate(p.x,p.y);g.scale(sc,sc);g.fillStyle=o.flash?'#b5a799':'#77706a';g.beginPath();g.moveTo(-13,2);g.lineTo(-10,-70);g.lineTo(13,-66);g.lineTo(16,2);g.closePath();g.fill();g.strokeStyle='#332f30';g.lineWidth=3;g.beginPath();g.moveTo(-7,-52);g.lineTo(5,-39);g.lineTo(-4,-25);g.lineTo(8,-10);g.stroke();g.restore();drawHpBar(g,o,p.x,p.y-72*sc,44);
  }
  function drawGate(g){
    const pillar=session.objects.find(o=>o.id==='cracked_pillar');if(!pillar||pillar.broken)return;const a=project(970,-185,56),b=project(970,185,56);g.save();g.strokeStyle='rgba(190,220,234,.55)';g.lineWidth=7;g.setLineDash([8,8]);g.beginPath();g.moveTo(a.x,a.y-62);g.lineTo(a.x,a.y+8);g.moveTo(b.x,b.y-62);g.lineTo(b.x,b.y+8);g.stroke();g.setLineDash([]);g.restore();
  }
  function drawDrop(g,d){
    if(d.collected)return;const p=project(d.x,d.z,d.y);g.save();g.translate(p.x,p.y);g.scale(p.scale,p.scale);g.textAlign='center';g.textBaseline='middle';
    if(d.kind==='coin'){g.fillStyle=d.isGold?'#f3d491':'#c7d0e0';g.beginPath();g.arc(0,0,7,0,Math.PI*2);g.fill();g.strokeStyle='rgba(0,0,0,0.4)';g.lineWidth=1;g.stroke();}
    else if(d.kind==='star'){g.fillStyle='#f3d491';g.font='bold 28px sans-serif';g.fillText('★',0,0);}
    else if(d.kind==='ore'){g.fillStyle='#c9b8f0';g.font='bold 23px sans-serif';g.fillText('◆',0,0);}
    else if(d.kind==='exp'){g.fillStyle='#8fc4e8';g.font='bold 24px sans-serif';g.fillText('✦',0,0);}
    else{g.font='25px sans-serif';g.fillText(d.icon||'🍎',0,0);}g.restore();
  }
  function drawNavigator(g){
    const n=session.nav;if(!n)return;const ground=groundAt(n.x,n.z,session.time),gy=ground?ground.y:Math.max(-10,n.y-80),gp=project(n.x,n.z,gy+1),p=project(n.x,n.z,n.y+25);
    const jumpHeight=Math.max(0,n.y-gy),shadowAlpha=Math.max(.12,1-Math.min(.88,jumpHeight/145*.88)),sw=34*p.scale*(1-Math.min(.28,jumpHeight/260));
    g.save();g.globalAlpha=shadowAlpha;g.fillStyle='#05070b';g.beginPath();g.moveTo(gp.x-sw,gp.y+4);g.lineTo(gp.x+sw*.78,gp.y+1);g.lineTo(gp.x+sw,gp.y+11);g.lineTo(gp.x-sw*.72,gp.y+14);g.closePath();g.fill();g.restore();
    const d=DICE[n.die.key],size=40*p.scale,r=7*p.scale;g.save();g.globalAlpha=n.alpha*(n.invuln>0&&Math.floor(n.invuln*12)%2?.5:1);g.translate(p.x,p.y);g.fillStyle=d?.color||'#8b7fe8';g.strokeStyle=d?.glow||'#d4ecfa';g.lineWidth=2;
    g.beginPath();g.moveTo(-size/2+r,-size/2);g.lineTo(size/2-r,-size/2);g.quadraticCurveTo(size/2,-size/2,size/2,-size/2+r);g.lineTo(size/2,size/2-r);g.quadraticCurveTo(size/2,size/2,size/2-r,size/2);g.lineTo(-size/2+r,size/2);g.quadraticCurveTo(-size/2,size/2,-size/2,size/2-r);g.lineTo(-size/2,-size/2+r);g.quadraticCurveTo(-size/2,-size/2,-size/2+r,-size/2);g.closePath();g.fill();g.stroke();
    g.fillStyle='rgba(255,255,255,.9)';const dot=Math.max(1,Math.min(7,n.die.dot||1)),pipPos=[[-.22,-.22],[.22,.22],[.22,-.22],[-.22,.22],[0,0],[0,-.28],[0,.28]].slice(0,dot);for(const [px,py] of pipPos){g.beginPath();g.arc(px*size,py*size,2.5*p.scale,0,Math.PI*2);g.fill();}g.restore();
    const hpW=54;g.fillStyle='rgba(0,0,0,.65)';g.fillRect(p.x-hpW/2,p.y-size/2-12,hpW,6);g.fillStyle='#78d992';g.fillRect(p.x-hpW/2+1,p.y-size/2-11,(hpW-2)*Math.max(0,n.die.hp/n.die.maxHp),4);
  }
  function drawHazards(g){const pulse=.45+.35*Math.sin(session.time*7);for(let i=0;i<5;i++){const p=project(1375+i*24,0,20);g.fillStyle=`rgba(226,88,79,${pulse})`;g.beginPath();g.moveTo(p.x-8,p.y);g.lineTo(p.x,p.y-18);g.lineTo(p.x+8,p.y);g.fill();}}
  function drawScene(){
    const c=document.getElementById('ttdPlatformCanvas');if(!c||!session)return;if(!resizePlatformCanvas())throw new Error('Traversal canvas has no usable layout size.');
    const g=c.getContext('2d');g.clearRect(0,0,session.w,session.h);drawBackground(g);currentPlatforms(session.time).sort((a,b)=>a.z1-b.z1).forEach(p=>drawPlatform(g,p));drawGate(g);drawHazards(g);
    for(const o of session.objects){o.flash=Math.max(0,(o.flash||0)-.016);if(o.type==='breakable')drawPillar(g,o);else drawChest(g,o);}session.drops.forEach(d=>drawDrop(g,d));drawNavigator(g);
    const hud=document.getElementById('ttdPlatformHud');if(hud){const n=session.nav,navBadge=hud.querySelector('.ttdNavBadge');if(navBadge)navBadge.textContent=n?`${DICE[n.die.key]?.name||n.die.key} · HP ${Math.max(0,Math.ceil(n.die.hp))}/${Math.ceil(n.die.maxHp)} · ${n.die.dot} PIP`:'NAVIGATOR REQUIRED';const area=hud.querySelector('.ttdAreaBadge');if(area){const x=n?.x||0;area.textContent=x<560?'BROKEN STAIRS':x<850?'TIMING BRIDGES':x<1080?'SEAL GATE':x<1335?'TREASURE COURT':'TRAP RUN';}}
  }

  function platformLoop(ts){
    if(!session?.active||session.phase==='select'||session.phase==='error')return;
    try{
      if(!session.lastTs)session.lastTs=ts;const dt=Math.min(.033,(ts-session.lastTs)/1000||0);session.lastTs=ts;session.time+=dt;
      if(session.phase==='play'&&session.nav)updateNavigator(dt);updateDrops(dt);drawScene();
      if(session?.active&&session.phase!=='select'&&session.phase!=='error')requestAnimationFrame(platformLoop);
    }catch(err){failTraversalRenderer(err);}
  }

  function cleanupForRunEnd(){
    if(!session?.active)return;
    session.active=false;clearNavigatorSelectionUi();leavePlatformLayout(true);keys.clear();
    const lane=document.getElementById('laneWrap');if(lane)lane.style.height='';
    session=null;
  }
  document.getElementById('endRunBtn')?.addEventListener('click',event=>{
    if(!session?.active)return;
    event.preventDefault();event.stopImmediatePropagation();
    cleanupForRunEnd();
    if(state){state.running=true;lastT=0;endMatch('voluntary');}
  },true);

  function finishPlatform(){
    if(!session?.active||session.phase==='return')return;session.phase='return';
    const nav=session.nav,canvasEl=document.getElementById('ttdPlatformCanvas'),cr=canvasEl?.getBoundingClientRect(),sp=nav?project(nav.x,nav.z,nav.y+25):null;
    clearNavigatorSelectionUi();leavePlatformLayout(false);renderBoard();
    const targetTile=[...document.querySelectorAll('#board .tile')][nav.boardIndex],target=targetTile?.getBoundingClientRect();
    if(cr&&sp&&target){
      const ghost=document.createElement('div');ghost.className='ttdNavReturnGhost';const def=DICE[nav.die.key];ghost.style.background=`linear-gradient(145deg,${def?.glow||'#d4ecfa'},${def?.color||'#8b7fe8'})`;ghost.style.left=`${cr.left+sp.x-24}px`;ghost.style.top=`${cr.top+sp.y-24}px`;ghost.style.width='48px';ghost.style.height='48px';ghost.textContent='●';ghost.style.color='#fff';document.body.appendChild(ghost);if(targetTile)targetTile.style.opacity='.28';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{ghost.style.left=`${target.left}px`;ghost.style.top=`${target.top}px`;ghost.style.width=`${target.width}px`;ghost.style.height=`${target.height}px`;ghost.style.opacity='.25';ghost.style.transform='scale(.82)';}));setTimeout(()=>ghost.remove(),620);
    }
    setTimeout(()=>{
      if(!session?.active)return;if(targetTile)targetTile.style.opacity='';
      document.getElementById('ttdPlatformHud')?.remove();document.getElementById('ttdPlatformError')?.remove();document.getElementById('ttdPlatformCanvas')?.remove();
      const lane=document.getElementById('laneWrap');if(lane)lane.style.height='';restoreTrayChildren();
      state.__ttdPlatformDone=true;state.__ttdTestBattlePath=2;buildPath(cw,ch);state.wave=3;state.waveClearCredited=false;state.waveClearedAt=0;state.spawnQueue=buildAdventureWave(state.adventureStage,3,state.adventureDiff);state.spawnTimer=0;
      if(modeLabel)modeLabel.textContent='Test Map · New Route';renderHUD();renderBoard();const ore=state.__ttdPlatformRewards?.dieOre||0,orbs=state.__ttdPlatformRewards?.expOrbs||0;toast(`New marching path · Wave 3${ore||orbs?` · Loot: ${ore} Ore / ${orbs} EXP Orbs`:''}`);
      session.active=false;session=null;state.running=true;lastT=0;requestAnimationFrame(loop);
    },650);
  }

  const baseUpdateSpawns=updateSpawns;
  updateSpawns=function updateSpawnsWithTraversal(dt){
    if(state?.__ttdTestMap){
      if(!state.__ttdPlatformDone&&state.wave===2&&state.spawnQueue.length===0&&state.enemies.length===0){
        if(!state.waveClearCredited){state.completedWaves+=1;state.waveClearCredited=true;}beginPlatform();return;
      }
      if(state.__ttdPlatformDone&&state.wave>=state.adventureStage.waves&&state.spawnQueue.length===0&&state.enemies.length===0&&!state.__ttdPlatformBonusApplied){
        const bonus=Math.max(0,Math.min(20,Number(state.__ttdPlatformRewards?.bonusWaveCredits||0)));if(bonus)state.completedWaves+=bonus;state.__ttdPlatformBonusApplied=true;
      }
    }
    return baseUpdateSpawns(dt);
  };

  const baseCampaignComplete=campaignComplete;
  campaignComplete=function campaignCompleteWithTraversalRewards(){
    const test=!!state?.__ttdTestMap,rewards=test?{...(state.__ttdPlatformRewards||{})}:null;baseCampaignComplete();
    if(test&&rewards){const stats=document.getElementById('overlayStats');if(stats){const bonusXp=(rewards.bonusWaveCredits||0)*2;stats.textContent+=` · ${rewards.dieOre||0} Die Ore · ${rewards.expOrbs||0} EXP Orbs`;}}
  };

  if(document.getElementById('adventureScreen')?.classList.contains('active'))renderAdventureList();
  window.__TTD_PLATFORM_TEST_API={version:2,start:()=>startAdventure(TEST_ID,0,selectedDifficulty),get active(){return!!session?.active;}};
})();
