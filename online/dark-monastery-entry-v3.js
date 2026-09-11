(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_ENTRY_V3)return;
  window.__TTD_DARK_MONASTERY_ENTRY_V3=true;

  const DM_ID='dark_monastery';
  const finalStageStart=startAdventure;
  const finalCampaignStart=startAdventureCampaign;
  const nativeDrawLane=typeof drawLane==='function'?drawLane:null;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const heldKeys=new Set();
  const enemyLabels=new Map();
  const pauseWatch=new WeakMap();
  let activePointer=null;
  let activeTouch=null;
  let compatLastTs=0;
  let proxyFilterPasses=0;
  let playerRunRecoveries=0;
  let lastPlayerHp=null;
  let damageRecoveryUntil=0;
  let motionCanvas=null;
  let motionCtx=null;
  let motionLastX=null;
  let motionLastZ=null;
  let motionStrength=0;
  let motionDraws=0;

  function normalizeAdventureEntry(){
    const adv=ADVENTURES?.[DM_ID];
    if(!adv)return false;
    adv.campaign=false;
    adv.darkMonastery=true;
    adv.roam3d=true;
    return true;
  }

  function startDarkMonastery(diffKey){
    normalizeAdventureEntry();
    const dmStart=window.__TTD_DARK_MONASTERY_START_V2;
    if(typeof dmStart!=='function')throw new Error('Dark Monastery roaming starter is unavailable.');
    return dmStart.call(this,DM_ID,0,diffKey);
  }

  startAdventure=function DarkMonasteryFinalStageStartV3(advId,stageIdx,diffKey){
    if(advId===DM_ID)return startDarkMonastery.call(this,diffKey);
    return finalStageStart.apply(this,arguments);
  };

  startAdventureCampaign=function DarkMonasteryFinalCampaignStartV3(advId,diffKey){
    if(advId===DM_ID)return startDarkMonastery.call(this,diffKey);
    return finalCampaignStart.apply(this,arguments);
  };

  function dmStageActive(){
    return !!(state?.__ttdDarkMonastery&&state?.adventureStage?.darkMonastery);
  }
  function dmActive(){
    return !!(dmStageActive()&&state?.running);
  }
  function gameScreenVisible(){
    return !!document.getElementById('gameScreen')?.classList.contains('active');
  }

  // Keep authored roaming monsters targetable through their native combat proxies, but never draw
  // the old Goblin/Ogre proxy art underneath the real Skeleton/Dark Goblin presentation.
  if(nativeDrawLane){
    drawLane=function DarkMonasteryProxySafeDrawLane(){
      if(!dmStageActive()||!Array.isArray(state?.enemies))return nativeDrawLane.apply(this,arguments);
      const complete=state.enemies;
      const visible=complete.filter(e=>!e?.__ttdDM);
      if(visible.length===complete.length)return nativeDrawLane.apply(this,arguments);
      state.enemies=visible;
      proxyFilterPasses++;
      try{return nativeDrawLane.apply(this,arguments);}
      finally{state.enemies=complete;}
    };
  }

  // Dark Monastery damage floaters are painted on the authored foreground canvas. Keep the damage
  // amount itself and remove only the conventional leading minus sign; healing/other canvas text is
  // untouched. This remains intentionally scoped to the Dark Monastery foreground canvas.
  const canvasProto=window.CanvasRenderingContext2D?.prototype;
  const nativeFillText=canvasProto?.fillText;
  if(nativeFillText&&!canvasProto.__ttdDarkMonasteryDamageTextV5){
    Object.defineProperty(canvasProto,'__ttdDarkMonasteryDamageTextV5',{value:true,configurable:true});
    canvasProto.fillText=function DarkMonasteryDamageTextV5(text,x,y,maxWidth){
      let shown=text;
      if(dmStageActive()&&this?.canvas?.id==='ttdDarkMonasteryFrontV1'&&/^-[0-9]+(?:\.[0-9]+)?$/.test(String(text))){shown=String(text).slice(1);}
      if(maxWidth===undefined)return nativeFillText.call(this,shown,x,y);
      return nativeFillText.call(this,shown,x,y,maxWidth);
    };
  }

  function joyElement(){return document.getElementById('ttdDarkMonasteryJoyV1');}
  function knobElement(){return document.getElementById('ttdDarkMonasteryJoyKnobV1');}
  function pointInside(el,x,y){
    if(!el)return false;const r=el.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
  }
  function emitKey(type,key){
    try{window.dispatchEvent(new KeyboardEvent(type,{key,bubbles:false,cancelable:true}));}
    catch(_){const ev=document.createEvent('Event');ev.initEvent(type,false,true);Object.defineProperty(ev,'key',{value:key});window.dispatchEvent(ev);}
  }
  function updateHeld(next){
    for(const key of [...heldKeys])if(!next.has(key)){heldKeys.delete(key);emitKey('keyup',key);}
    for(const key of next)if(!heldKeys.has(key)){heldKeys.add(key);emitKey('keydown',key);}
  }
  function releaseMovement(){
    if(heldKeys.size)updateHeld(new Set());
    const knob=knobElement();if(knob)knob.style.transform='translate(0,0)';
  }
  function driveFromPoint(x,y){
    const joy=joyElement();if(!joy)return false;
    const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=x-cx,dy=y-cy;const max=Math.max(24,Math.min(r.width,r.height)*.33),len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len);dx*=k;dy*=k;
    const nx=dx/max,ny=dy/max,next=new Set();
    if(nx>.16)next.add('d');else if(nx<-.16)next.add('a');
    if(ny>.16)next.add('s');else if(ny<-.16)next.add('w');
    updateHeld(next);
    const knob=knobElement();if(knob)knob.style.transform=`translate(${dx}px,${dy}px)`;
    return true;
  }

  window.addEventListener('pointerdown',ev=>{
    if(!dmActive()||activePointer!=null||!pointInside(joyElement(),ev.clientX,ev.clientY))return;
    activePointer=ev.pointerId;activeTouch=null;driveFromPoint(ev.clientX,ev.clientY);
    try{joyElement()?.setPointerCapture?.(ev.pointerId);}catch(_){}
    ev.preventDefault();ev.stopPropagation();
  },{capture:true,passive:false});
  window.addEventListener('pointermove',ev=>{
    if(!dmStageActive()||activePointer==null||ev.pointerId!==activePointer)return;
    driveFromPoint(ev.clientX,ev.clientY);ev.preventDefault();ev.stopPropagation();
  },{capture:true,passive:false});
  const endPointer=ev=>{
    if(activePointer==null||ev.pointerId!==activePointer)return;
    activePointer=null;releaseMovement();ev.preventDefault();ev.stopPropagation();
  };
  window.addEventListener('pointerup',endPointer,{capture:true,passive:false});
  window.addEventListener('pointercancel',endPointer,{capture:true,passive:false});

  window.addEventListener('touchstart',ev=>{
    if(!dmActive()||activePointer!=null||activeTouch!=null)return;
    const t=[...ev.changedTouches].find(p=>pointInside(joyElement(),p.clientX,p.clientY));if(!t)return;
    activeTouch=t.identifier;driveFromPoint(t.clientX,t.clientY);ev.preventDefault();ev.stopPropagation();
  },{capture:true,passive:false});
  window.addEventListener('touchmove',ev=>{
    if(!dmStageActive()||activePointer!=null||activeTouch==null)return;
    const t=[...ev.touches].find(p=>p.identifier===activeTouch);if(!t)return;
    driveFromPoint(t.clientX,t.clientY);ev.preventDefault();ev.stopPropagation();
  },{capture:true,passive:false});
  const endTouch=ev=>{
    if(activeTouch==null)return;const t=[...ev.changedTouches].find(p=>p.identifier===activeTouch);if(!t)return;
    activeTouch=null;releaseMovement();ev.preventDefault();ev.stopPropagation();
  };
  window.addEventListener('touchend',endTouch,{capture:true,passive:false});
  window.addEventListener('touchcancel',endTouch,{capture:true,passive:false});
  window.addEventListener('blur',()=>{activePointer=null;activeTouch=null;releaseMovement();},true);

  function ensureLabelHost(){
    const lane=document.getElementById('laneWrap');if(!lane)return null;
    let host=document.getElementById('ttdDarkMonasteryEnemyLabelsV4');
    if(!host){
      host=document.createElement('div');host.id='ttdDarkMonasteryEnemyLabelsV4';
      host.style.cssText='position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden;font-family:Russo One,Arial,sans-serif;';
      lane.appendChild(host);
    }
    return host;
  }
  function clearLabels(){
    for(const el of enemyLabels.values())el.remove();enemyLabels.clear();
    document.getElementById('ttdDarkMonasteryEnemyLabelsV4')?.remove();
  }
  function projectActor(actor,lane){
    const r=lane.getBoundingClientRect(),w=r.width,h=r.height,depth=clamp((actor.z+175)/350,0,1),sc=(.48+depth*.58)*Math.max(.72,Math.min(1.12,w/410));
    return{x:w*.5+actor.x*sc,y:h*.18+depth*h*.72,scale:sc};
  }
  function syncActorLabels(){
    const api=window.__TTD_DARK_MONASTERY_API_V1,lane=document.getElementById('laneWrap'),host=ensureLabelHost();if(!api||!lane||!host)return;
    const live=new Set();
    for(const actor of api.actors||[]){
      if(!actor?.e?.alive||actor.deadPile||actor.finalDead)continue;
      live.add(actor);actor.e.__ttdHideNativeVisual=true;
      let label=enemyLabels.get(actor);
      if(!label){
        label=document.createElement('div');label.className='ttd-dark-monastery-enemy-label';
        label.style.cssText='position:absolute;transform:translate(-50%,-100%);white-space:nowrap;padding:1px 4px;border-radius:4px;background:rgba(3,6,10,.62);color:#f1eadb;text-shadow:0 1px 2px #000;font-size:9px;line-height:12px;letter-spacing:.025em;';
        host.appendChild(label);enemyLabels.set(actor,label);
      }
      label.textContent=actor.def?.name||String(actor.type||'Enemy').replaceAll('_',' ');
      const p=projectActor(actor,lane);label.style.left=p.x+'px';label.style.top=(p.y-actor.radius*p.scale-18)+'px';
    }
    for(const [actor,label] of [...enemyLabels])if(!live.has(actor)){label.remove();enemyLabels.delete(actor);}
  }

  function ensureMotionCanvas(){
    const lane=document.getElementById('laneWrap');if(!lane)return null;
    const r=lane.getBoundingClientRect(),dpr=clamp(window.devicePixelRatio||1,1,2);
    if(!motionCanvas){
      motionCanvas=document.createElement('canvas');motionCanvas.id='ttdDarkMonasteryMotionV5';
      motionCanvas.style.cssText='position:absolute;inset:0;z-index:5;width:100%;height:100%;pointer-events:none;display:block;';
      lane.appendChild(motionCanvas);motionCtx=motionCanvas.getContext('2d');
    }
    const pw=Math.max(1,Math.round(r.width*dpr)),ph=Math.max(1,Math.round(r.height*dpr));
    if(motionCanvas.width!==pw||motionCanvas.height!==ph){motionCanvas.width=pw;motionCanvas.height=ph;}
    motionCanvas.style.width=r.width+'px';motionCanvas.style.height=r.height+'px';
    motionCtx.setTransform(dpr,0,0,dpr,0,0);
    return{lane,w:r.width,h:r.height,ctx:motionCtx};
  }
  function removeMotionCanvas(){
    motionCanvas?.remove();motionCanvas=null;motionCtx=null;motionLastX=motionLastZ=null;motionStrength=0;
  }
  function drawRunMotion(ts,dt){
    const api=window.__TTD_DARK_MONASTERY_API_V1,p=api?.player,host=ensureMotionCanvas();if(!p||!host)return;
    const {lane,w,h,ctx}=host;ctx.clearRect(0,0,w,h);
    if(motionLastX==null){motionLastX=p.x;motionLastZ=p.z;return;}
    const moved=Math.hypot(p.x-motionLastX,p.z-motionLastZ);motionLastX=p.x;motionLastZ=p.z;
    const target=(moved>.045&&state?.running)?1:0;
    const ease=1-Math.exp(-dt*(target?18:12));motionStrength+=(target-motionStrength)*ease;
    if(motionStrength<.025)return;
    const pt=projectActor(p,lane),size=30*pt.scale,phase=ts*.014;
    const dirX=clamp((Number(runtimeSafeJoyX())||0),-1,1);
    const topY=pt.y-size*.50,bottomY=pt.y+size*.10,topHalf=size*.25,bottomHalf=size*.60,lean=dirX*size*.09;
    ctx.save();ctx.globalAlpha=motionStrength;
    const wash=ctx.createLinearGradient(0,topY,0,bottomY);wash.addColorStop(0,'rgba(74,211,255,.60)');wash.addColorStop(.48,'rgba(55,196,255,.73)');wash.addColorStop(1,'rgba(43,170,244,.62)');
    ctx.fillStyle=wash;ctx.shadowBlur=8*pt.scale;ctx.shadowColor='rgba(75,211,255,.58)';
    ctx.beginPath();ctx.moveTo(pt.x-topHalf,topY);
    ctx.bezierCurveTo(pt.x-bottomHalf*.70+lean,topY+size*.15,pt.x-bottomHalf+lean,bottomY-size*.14,pt.x-bottomHalf+lean,bottomY);
    ctx.quadraticCurveTo(pt.x+lean,bottomY+size*.12,pt.x+bottomHalf+lean,bottomY);
    ctx.bezierCurveTo(pt.x+bottomHalf+lean,bottomY-size*.14,pt.x+bottomHalf*.70+lean,topY+size*.15,pt.x+topHalf,topY);
    ctx.closePath();ctx.fill();ctx.shadowBlur=0;
    ctx.lineCap='round';
    for(let i=0;i<6;i++){
      const q=(i+.65)/6.4,yy=topY+(bottomY-topY)*q,wave=Math.sin(phase+i*.92)*size*.055,spread=topHalf+(bottomHalf-topHalf)*q;
      ctx.strokeStyle=i%2?'rgba(151,239,255,.88)':'rgba(77,216,255,.92)';ctx.lineWidth=Math.max(1,1.35*pt.scale);
      ctx.beginPath();ctx.moveTo(pt.x-spread+lean*q,yy);
      ctx.bezierCurveTo(pt.x-spread*.38+lean*q,yy-wave,pt.x+spread*.30+lean*q,yy+wave,pt.x+spread+lean*q,yy-wave*.35);ctx.stroke();
    }
    ctx.strokeStyle='rgba(91,223,255,.80)';ctx.lineWidth=Math.max(1.1,1.7*pt.scale);
    ctx.beginPath();ctx.ellipse(pt.x+lean*.72,bottomY-size*.03,bottomHalf*.98,size*.14,Math.sin(phase*.55)*.07,0,Math.PI*2);ctx.stroke();
    ctx.restore();motionDraws++;
  }
  function runtimeSafeJoyX(){
    const knob=knobElement();if(!knob)return 0;const tr=knob.style.transform||'';const m=tr.match(/translate\(([-0-9.]+)px/);return m?Number(m[1])/30:0;
  }

  // Native enemy ticking normally decays pausedT. If another bridge suppresses that tick while
  // Dark Monastery owns movement, do not let a one-frame hit-pause become a permanent freeze.
  function recoverStalledPauseTimers(dt){
    const api=window.__TTD_DARK_MONASTERY_API_V1;if(!api)return;
    for(const actor of api.actors||[]){
      const e=actor?.e;if(!e)continue;const cur=Math.max(0,Number(e.pausedT)||0);let rec=pauseWatch.get(e);
      if(!rec){rec={last:cur,still:0};pauseWatch.set(e,rec);continue;}
      if(cur<=0){rec.last=0;rec.still=0;continue;}
      if(Math.abs(cur-rec.last)>.001){rec.last=cur;rec.still=0;continue;}
      rec.still+=dt;
      if(rec.still>.10){e.pausedT=Math.max(0,cur-dt);rec.last=e.pausedT;}
    }
  }

  // A native Adventure owner can momentarily flip state.running false when the roaming player's HP
  // changes, because that field historically represented tower lives. Dark Monastery owns player HP.
  // Recover ONLY in the short window immediately following HP loss, and only while the player is
  // alive, the encounter is unfinished, and the game screen is still actually open. Manual pause/
  // navigation therefore remains untouched.
  function recoverPlayerDamageFreeze(now){
    if(!dmStageActive())return;
    const hp=Number(state?.lives);if(Number.isFinite(hp)){
      if(lastPlayerHp!=null&&hp<lastPlayerHp)damageRecoveryUntil=now+1200;
      lastPlayerHp=hp;
    }
    if(now>damageRecoveryUntil||state?.running!==false||!gameScreenVisible()||!(hp>0))return;
    const actors=window.__TTD_DARK_MONASTERY_API_V1?.actors||[];
    const encounterDone=actors.length>=4&&actors.every(a=>a?.finalDead);
    if(encounterDone)return;
    state.running=true;state.__ttdDMNoWipeout=true;playerRunRecoveries++;
  }

  function compatFrame(ts){
    const dt=compatLastTs?clamp((ts-compatLastTs)/1000,0,.05):0;compatLastTs=ts;
    if(dmStageActive()&&gameScreenVisible()){
      recoverPlayerDamageFreeze(ts);syncActorLabels();recoverStalledPauseTimers(dt);drawRunMotion(ts,dt);
    }else{
      activePointer=null;activeTouch=null;releaseMovement();lastPlayerHp=null;damageRecoveryUntil=0;
      if(enemyLabels.size||document.getElementById('ttdDarkMonasteryEnemyLabelsV4'))clearLabels();
      if(motionCanvas)removeMotionCanvas();
    }
    requestAnimationFrame(compatFrame);
  }
  requestAnimationFrame(compatFrame);

  normalizeAdventureEntry();

  window.__TTD_DARK_MONASTERY_ENTRY_V3_API=Object.freeze({
    version:5,
    build:'player-hit-motion-v5-release',
    id:DM_ID,
    normalizeAdventureEntry,
    startDarkMonastery,
    get proxyFilterPasses(){return proxyFilterPasses;},
    get playerRunRecoveries(){return playerRunRecoveries;},
    get motionDraws(){return motionDraws;},
    get motionCanvas(){return motionCanvas;},
    get adventure(){return ADVENTURES?.[DM_ID]||null;},
  });
})();
