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

  function normalizeAdventureEntry(){
    const adv=ADVENTURES?.[DM_ID];
    if(!adv)return false;
    // The current Dark Monastery slice is one roaming stage. Use the ordinary stage-list route,
    // then explicitly send that stage into the published Dark Monastery runtime starter below.
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

  function dmActive(){
    return !!(state?.__ttdDarkMonastery&&state?.adventureStage?.darkMonastery&&state?.running);
  }

  // Dark Monastery actors intentionally keep native enemy objects in state.enemies so every
  // existing die can target, damage and status them. The roaming renderer already draws the real
  // Skeleton/Dark Goblin/etc. Hide ONLY those proxy objects during the native lane paint so the
  // old green "Goblin" circles/names are not drawn underneath the authored monster art.
  if(nativeDrawLane){
    drawLane=function DarkMonasteryProxySafeDrawLane(){
      if(!dmActive()||!Array.isArray(state?.enemies))return nativeDrawLane.apply(this,arguments);
      const complete=state.enemies;
      const visible=complete.filter(e=>!e?.__ttdDM);
      if(visible.length===complete.length)return nativeDrawLane.apply(this,arguments);
      state.enemies=visible;
      proxyFilterPasses++;
      try{return nativeDrawLane.apply(this,arguments);}
      finally{state.enemies=complete;}
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

  // The native mobile-input bridge owns pointer gestures over most of the battlefield. Handle the
  // roaming joystick at WINDOW CAPTURE priority and translate it to the Dark Monastery runtime's
  // already-supported WASD input. This keeps collision/slide movement in one authoritative path
  // and also gives older Android WebViews a touch-event fallback.
  window.addEventListener('pointerdown',ev=>{
    if(!dmActive()||activePointer!=null||!pointInside(joyElement(),ev.clientX,ev.clientY))return;
    activePointer=ev.pointerId;activeTouch=null;driveFromPoint(ev.clientX,ev.clientY);
    try{joyElement()?.setPointerCapture?.(ev.pointerId);}catch(_){}
    ev.preventDefault();ev.stopPropagation();
  },{capture:true,passive:false});
  window.addEventListener('pointermove',ev=>{
    if(!dmActive()||activePointer==null||ev.pointerId!==activePointer)return;
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
    if(!dmActive()||activePointer!=null||activeTouch==null)return;
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

  // Native enemy ticking normally decays pausedT. If another bridge suppresses that tick while
  // Dark Monastery owns movement, do not let a one-frame hit-pause become a permanent freeze.
  // Only intervene after the value has remained unchanged for >100ms, so native stun timing stays
  // authoritative whenever it is actually advancing.
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

  function compatFrame(ts){
    const dt=compatLastTs?clamp((ts-compatLastTs)/1000,0,.05):0;compatLastTs=ts;
    if(dmActive()){
      syncActorLabels();recoverStalledPauseTimers(dt);
    }else{
      activePointer=null;activeTouch=null;releaseMovement();if(enemyLabels.size||document.getElementById('ttdDarkMonasteryEnemyLabelsV4'))clearLabels();
    }
    requestAnimationFrame(compatFrame);
  }
  requestAnimationFrame(compatFrame);

  normalizeAdventureEntry();

  window.__TTD_DARK_MONASTERY_ENTRY_V3_API=Object.freeze({
    version:4,
    build:'mobile-input-proxy-visual-v4-release',
    id:DM_ID,
    normalizeAdventureEntry,
    startDarkMonastery,
    get proxyFilterPasses(){return proxyFilterPasses;},
    get adventure(){return ADVENTURES?.[DM_ID]||null;},
  });
})();
