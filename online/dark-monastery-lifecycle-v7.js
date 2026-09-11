(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_LIFECYCLE_V7)return;
  window.__TTD_DARK_MONASTERY_LIFECYCLE_V7=true;

  const DM_ID='dark_monastery';
  const START_FADE_LOCK_MS=1220;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const priorStartAdventure=startAdventure;
  const priorStartAdventureCampaign=startAdventureCampaign;
  // This is V1's exact private DM_STAGE object at boot. Keep it for the whole page session. Native
  // result/re-entry flows are allowed to rebuild or clone Adventure state later, but V1 originally
  // used strict object identity. Re-anchoring to this object before V1's queued bind frame makes
  // every run equivalent to the first run instead of depending on how the result screen rebuilt it.
  const canonicalStage=ADVENTURES?.[DM_ID]?.stages?.[0]||null;

  let runState=null,introSeen=false,releaseAt=0,released=true,lastTs=0,startLocks=0,repeatArms=0,runCount=0;
  let forcedArms=0,recoveryStarts=0;
  let motionCanvas=null,motionCtx=null,motionLastX=null,motionLastZ=null,motionStrength=0,smallMotionDraws=0;

  const style=document.createElement('style');
  style.id='ttdDarkMonasteryLifecycleV7Style';
  style.textContent=`#ttdDarkMonasteryMotionV5{display:none!important;}#ttdDarkMonasteryMotionV7{position:absolute;inset:0;z-index:5;width:100%;height:100%;pointer-events:none;display:block;}`;
  document.head.appendChild(style);

  function normalizeCatalog(){
    const adv=ADVENTURES?.[DM_ID];if(!adv)return false;
    adv.campaign=false;adv.darkMonastery=true;adv.roam3d=true;
    if(canonicalStage){canonicalStage.darkMonastery=true;adv.stages=[canonicalStage];}
    else if(adv.stages?.[0])adv.stages[0].darkMonastery=true;
    return true;
  }
  function stageActive(){return !!(state?.__ttdDarkMonastery&&state?.adventureStage?.darkMonastery);}
  function gameVisible(){return !!document.getElementById('gameScreen')?.classList.contains('active');}
  function runtimeReady(){
    const api=window.__TTD_DARK_MONASTERY_API_V1,game=document.getElementById('gameScreen');
    return !!(stageActive()&&api?.active&&api?.player&&game?.classList.contains('ttd-dark-monastery-v1')&&document.getElementById('ttdDarkMonasteryBackV1')&&document.getElementById('ttdDarkMonasteryFrontV1')&&document.getElementById('ttdDarkMonasteryJoyV1'));
  }
  function joyElement(){return document.getElementById('ttdDarkMonasteryJoyV1');}
  function pointInsideJoy(x,y){const joy=joyElement();if(!joy)return false;const r=joy.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
  function lockConsumesInput(){return !!(stageActive()&&(state?.__ttdDMGameplayLock||state?.__ttdMissionIntroHold===true));}
  function blockLockedPointer(ev){if(!lockConsumesInput()||!pointInsideJoy(ev.clientX,ev.clientY))return;ev.preventDefault();ev.stopImmediatePropagation?.();ev.stopPropagation();}
  for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])window.addEventListener(type,blockLockedPointer,{capture:true,passive:false});
  function blockLockedTouch(ev){if(!lockConsumesInput())return;const touches=[...(ev.changedTouches||[]),...(ev.touches||[])];if(!touches.some(t=>pointInsideJoy(t.clientX,t.clientY)))return;ev.preventDefault();ev.stopImmediatePropagation?.();ev.stopPropagation();}
  for(const type of ['touchstart','touchmove','touchend','touchcancel'])window.addEventListener(type,blockLockedTouch,{capture:true,passive:false});

  function armCurrentState(force=false){
    if(!state)return false;
    const stage=canonicalStage||ADVENTURES?.[DM_ID]?.stages?.[0];if(!stage)return false;
    const semanticallyDM=!!(state.adventureStage?.darkMonastery||state.adventureStages?.[state.adventureStageIdx||0]?.darkMonastery||state.__ttdDarkMonastery);
    // When this function is called directly from a known Dark Monastery start, force=true is safe
    // and important: real post-result flows can hand us a rebuilt stage object with the marker
    // stripped. The old test reused the same object and therefore missed the production failure.
    if(!force&&!semanticallyDM)return false;
    if(!state.adventure)return false;
    stage.darkMonastery=true;
    state.adventureStage=stage;
    state.adventureStages=[stage];
    state.adventureStageIdx=0;
    state.__ttdDarkMonastery=true;
    state.__ttdDMNoWipeout=true;
    if(force)forcedArms++;
    repeatArms++;
    return true;
  }
  function resetRunLifecycle(nextState){runState=nextState;runCount++;introSeen=false;releaseAt=0;released=true;motionLastX=motionLastZ=null;motionStrength=0;if(state){state.__ttdDMGameplayLock=false;state.__ttdDMStartReleased=true;}}

  function afterDarkStart(diffKey){
    normalizeCatalog();
    const started=performance.now();
    let observedState=state;
    let frames=0;
    let recoveryUsed=false;
    // Do this synchronously. V1's own starter waits until the next RAF to compare its private
    // DM_STAGE by identity; re-anchoring here means that comparison succeeds even on run #2+.
    if(state){armCurrentState(true);if(state!==runState)resetRunLifecycle(state);}
    const settle=()=>{
      if(!state||performance.now()-started>5000)return;
      if(state!==observedState){observedState=state;armCurrentState(true);if(state!==runState)resetRunLifecycle(state);}
      else armCurrentState(true);
      if(runtimeReady())return;
      // If some later wrapper bypassed V1 entirely, use the preserved V2 function object, which
      // closes directly over V1's roaming starter. This is a one-shot recovery for this requested
      // Dark Monastery start, not a polling restart loop.
      if(!recoveryUsed&&++frames>=12){
        const dmStart=window.__TTD_DARK_MONASTERY_START_V2;
        if(typeof dmStart==='function'){
          recoveryUsed=true;recoveryStarts++;
          try{
            normalizeCatalog();
            dmStart.call(window,DM_ID,0,diffKey);
            observedState=state;
            armCurrentState(true);
            if(state!==runState)resetRunLifecycle(state);
          }catch(error){console.error('Dark Monastery repeat-run recovery start failed.',error);}
        }
      }
      requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
  }

  startAdventure=function DarkMonasteryRepeatSafeStageStartV7(advId,stageIdx,diffKey){
    if(advId===DM_ID)normalizeCatalog();
    const result=priorStartAdventure.apply(this,arguments);
    if(advId===DM_ID)afterDarkStart(diffKey);
    return result;
  };
  startAdventureCampaign=function DarkMonasteryRepeatSafeCampaignStartV7(advId,diffKey){
    if(advId===DM_ID)normalizeCatalog();
    const result=priorStartAdventureCampaign.apply(this,arguments);
    if(advId===DM_ID)afterDarkStart(diffKey);
    return result;
  };

  function beginPostStartLock(now){introSeen=true;released=false;releaseAt=now+START_FADE_LOCK_MS;startLocks++;state.__ttdDMGameplayLock=true;state.__ttdDMStartReleased=false;state.running=false;try{lastT=0;}catch(_){}}
  function releaseGameplay(){if(released||!stageActive()||state!==runState)return;released=true;releaseAt=0;state.__ttdDMGameplayLock=false;state.__ttdDMStartReleased=true;if(Number(state.lives)>0){state.running=true;state.__ttdDMNoWipeout=true;try{lastT=0;requestAnimationFrame(loop);}catch(_){}}}
  function updateStartGate(now){if(!stageActive()||state!==runState)return;if(state.__ttdMissionIntroHold===true){introSeen=true;released=false;releaseAt=0;state.__ttdDMGameplayLock=true;state.__ttdDMStartReleased=false;if(state.running!==false)state.running=false;return;}if(introSeen&&!released&&releaseAt===0){beginPostStartLock(now);return;}if(!released&&releaseAt>0){state.__ttdDMGameplayLock=true;state.__ttdDMStartReleased=false;if(state.running!==false)state.running=false;if(now>=releaseAt)releaseGameplay();}}

  function ensureMotionCanvas(){const lane=document.getElementById('laneWrap');if(!lane)return null;const r=lane.getBoundingClientRect(),dpr=clamp(window.devicePixelRatio||1,1,2);if(!motionCanvas){motionCanvas=document.createElement('canvas');motionCanvas.id='ttdDarkMonasteryMotionV7';lane.appendChild(motionCanvas);motionCtx=motionCanvas.getContext('2d');}const pw=Math.max(1,Math.round(r.width*dpr)),ph=Math.max(1,Math.round(r.height*dpr));if(motionCanvas.width!==pw||motionCanvas.height!==ph){motionCanvas.width=pw;motionCanvas.height=ph;}motionCanvas.style.width=r.width+'px';motionCanvas.style.height=r.height+'px';motionCtx.setTransform(dpr,0,0,dpr,0,0);return{lane,w:r.width,h:r.height,ctx:motionCtx};}
  function removeMotionCanvas(){motionCanvas?.remove();motionCanvas=null;motionCtx=null;motionLastX=motionLastZ=null;motionStrength=0;}
  function projectPlayer(p,lane){const r=lane.getBoundingClientRect(),w=r.width,h=r.height,depth=clamp((p.z+175)/350,0,1),sc=(.48+depth*.58)*Math.max(.72,Math.min(1.12,w/410));return{x:w*.5+p.x*sc,y:h*.18+depth*h*.72,scale:sc};}
  function drawSmallRunMotion(ts,dt){const p=window.__TTD_DARK_MONASTERY_API_V1?.player,host=ensureMotionCanvas();if(!p||!host)return;const{lane,w,h,ctx}=host;ctx.clearRect(0,0,w,h);if(motionLastX==null){motionLastX=p.x;motionLastZ=p.z;return;}const moved=Math.hypot(p.x-motionLastX,p.z-motionLastZ);motionLastX=p.x;motionLastZ=p.z;const target=(moved>.045&&state?.running&&!state?.__ttdDMGameplayLock)?1:0;const ease=1-Math.exp(-dt*(target?18:12));motionStrength+=(target-motionStrength)*ease;if(motionStrength<.025)return;const pt=projectPlayer(p,lane),size=15*pt.scale,phase=ts*.014;const topY=pt.y-size*.50,bottomY=pt.y+size*.10,topHalf=size*.25,bottomHalf=size*.60;ctx.save();ctx.globalAlpha=motionStrength;const wash=ctx.createLinearGradient(0,topY,0,bottomY);wash.addColorStop(0,'rgba(74,211,255,.62)');wash.addColorStop(.5,'rgba(55,196,255,.76)');wash.addColorStop(1,'rgba(43,170,244,.64)');ctx.fillStyle=wash;ctx.shadowBlur=5*pt.scale;ctx.shadowColor='rgba(75,211,255,.56)';ctx.beginPath();ctx.moveTo(pt.x-topHalf,topY);ctx.bezierCurveTo(pt.x-bottomHalf*.72,topY+size*.15,pt.x-bottomHalf,bottomY-size*.12,pt.x-bottomHalf,bottomY);ctx.quadraticCurveTo(pt.x,bottomY+size*.10,pt.x+bottomHalf,bottomY);ctx.bezierCurveTo(pt.x+bottomHalf,bottomY-size*.12,pt.x+bottomHalf*.72,topY+size*.15,pt.x+topHalf,topY);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.lineCap='round';for(let i=0;i<5;i++){const q=(i+.7)/5.7,yy=topY+(bottomY-topY)*q,wave=Math.sin(phase+i*.92)*size*.06,spread=topHalf+(bottomHalf-topHalf)*q;ctx.strokeStyle=i%2?'rgba(151,239,255,.88)':'rgba(77,216,255,.92)';ctx.lineWidth=Math.max(.8,1.05*pt.scale);ctx.beginPath();ctx.moveTo(pt.x-spread,yy);ctx.bezierCurveTo(pt.x-spread*.35,yy-wave,pt.x+spread*.30,yy+wave,pt.x+spread,yy-wave*.35);ctx.stroke();}ctx.strokeStyle='rgba(91,223,255,.82)';ctx.lineWidth=Math.max(.9,1.25*pt.scale);ctx.beginPath();ctx.ellipse(pt.x,bottomY-size*.02,bottomHalf*.98,size*.14,Math.sin(phase*.55)*.07,0,Math.PI*2);ctx.stroke();ctx.restore();smallMotionDraws++;}

  function tick(ts){const dt=lastTs?clamp((ts-lastTs)/1000,0,.05):0;lastTs=ts;normalizeCatalog();if(stageActive()&&gameVisible()){if(state!==runState)resetRunLifecycle(state);armCurrentState(false);updateStartGate(ts);drawSmallRunMotion(ts,dt);}else{if(runState&&state!==runState)runState=null;if(motionCanvas)removeMotionCanvas();}requestAnimationFrame(tick);}
  requestAnimationFrame(tick);normalizeCatalog();
  window.__TTD_DARK_MONASTERY_LIFECYCLE_V7_API=Object.freeze({version:8,build:'real-repeat-reentry-v8',id:DM_ID,get startLocks(){return startLocks;},get repeatArms(){return repeatArms;},get forcedArms(){return forcedArms;},get recoveryStarts(){return recoveryStarts;},get runCount(){return runCount;},get smallMotionDraws(){return smallMotionDraws;},get gameplayLocked(){return !!state?.__ttdDMGameplayLock;},get runtimeReady(){return runtimeReady();},normalizeCatalog,armCurrentState});
})();
