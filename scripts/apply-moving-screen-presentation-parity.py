from pathlib import Path
import re


def read(p): return Path(p).read_text()
def write(p,s): Path(p).write_text(s)
def replace_once(s,old,new,label):
    if old not in s: raise SystemExit(f'missing patch anchor: {label}')
    if s.count(old)!=1: raise SystemExit(f'non-unique patch anchor: {label} ({s.count(old)})')
    return s.replace(old,new,1)

# Moving Screen engine: held static preview, explicit voluntary finish, canonical outcome handoff.
p='online/moving-screen-engine-v5.js'; s=read(p)
s=replace_once(s,
  "const r={active:true,finished:false,...shell,stage,w:1,h:1,dpr:1,",
  "const r={active:true,finished:false,introHold:false,...shell,stage,w:1,h:1,dpr:1,",
  'engine introHold state')
s=replace_once(s,"function start(){if(runtime?.active)return;","function start(options={}){if(runtime?.active)return;",'engine start options')
s=replace_once(s,"runtime.game.classList.add('ttd-moving-screen-v4');","runtime.introHold=!!options?.introHold;runtime.game.classList.add('ttd-moving-screen-v4');",'engine apply intro hold')
s=replace_once(s,"function exit(){const r=runtime;","function releaseIntroHold(){if(!runtime?.active)return false;runtime.introHold=false;lastTs=performance.now();acc=0;return true;}\n  function finishRun(kind='finish',reason='Run ended by player.'){if(!runtime?.active||runtime.finished)return false;finish(kind,reason);return true;}\n  function exit(){const r=runtime;",'engine lifecycle methods')
s=replace_once(s,"finish(false,'All 10 lives were lost.');","finish('fail','All 10 lives were lost.');",'life failure')
s=replace_once(s,"finish(false,'You failed to get a Die back onto the battlefield in time.');","finish('fail','You failed to get a Die back onto the battlefield in time.');",'empty failure')
s=replace_once(s,"finish(true,`You defeated ${runtime.killGoal} enemies and carried the ${crownLabel()} flag.`);","finish('clear',`You defeated ${runtime.killGoal} enemies and carried the ${crownLabel()} flag.`);",'victory outcome')
old="function finish(win,reason){if(!runtime||runtime.finished)return;runtime.finished=true;runtime.phase='finished';runtime.game.classList.remove('moving');document.getElementById('ttdMsEmergencyV4')?.classList.remove('show');const reveal=()=>revealResult(win,reason),p=window.TTDGamePresentation;if(p?.presentOutcome)p.presentOutcome(win?'clear':'fail',{reveal,delay:1850});else setTimeout(reveal,win?1500:2500);}\n  function revealResult(win,reason){if(!runtime)return;const box=runtime.result;box.querySelector('h2').textContent=win?'AREA CLAIMED':'RUN FAILED';box.querySelector('p').textContent=reason;box.querySelector('.stats').textContent=`${Math.min(runtime.kills,runtime.killGoal)} / ${runtime.killGoal} enemies defeated · ${runtime.lives} lives left · ${flagLabel()}`;box.classList.add('show');}"
new="function finish(kind,reason){if(!runtime||runtime.finished)return;const outcome=kind===true?'clear':kind===false?'fail':(['clear','fail','finish'].includes(String(kind))?String(kind):'fail');runtime.finished=true;runtime.introHold=false;runtime.phase='finished';runtime.game.classList.remove('moving');document.getElementById('ttdMsEmergencyV4')?.classList.remove('show');const reveal=()=>{const shell=window.TTDArcadeModeShell;if(shell?.presentMovingOutcome){shell.presentMovingOutcome(outcome,reason);return;}revealResult(outcome,reason);},p=window.TTDGamePresentation;if(p?.presentOutcome)p.presentOutcome(outcome,{reveal,delay:1850});else setTimeout(reveal,outcome==='fail'?2500:1500);}\n  function revealResult(kind,reason){if(!runtime)return;const box=runtime.result;box.querySelector('h2').textContent=kind==='clear'?'AREA CLAIMED':kind==='finish'?'RUN COMPLETE':'RUN FAILED';box.querySelector('p').textContent=reason;box.querySelector('.stats').textContent=`${Math.min(runtime.kills,runtime.killGoal)} / ${runtime.killGoal} enemies defeated · ${runtime.lives} lives left · ${flagLabel()}`;box.classList.add('show');}"
s=replace_once(s,old,new,'engine outcome handoff')
s=replace_once(s,"function frame(ts){if(!runtime?.active)return;const dt=Math.min(.08,Math.max(0,(ts-lastTs)/1000));","function frame(ts){if(!runtime?.active)return;if(runtime.introHold){lastTs=ts;acc=0;draw();raf=requestAnimationFrame(frame);return;}const dt=Math.min(.08,Math.max(0,(ts-lastTs)/1000));",'engine held frame')
s=replace_once(s,"start,exit,summon:summonDie,","start,exit,releaseIntroHold,finishRun,summon:summonDie,",'engine public lifecycle')
write(p,s)

# Shared presentation: same MISSION / START treatment, using Mission.mp3 and Start.mp3 through the existing announcer router.
p='online/game-presentation-v1.js'; s=read(p)
anchor="  async function playCombatCountdown(onStart){"
insert="""  async function playPreparedMissionStart(onStart){
    if(missionBusy)return false;missionBusy=true;scanLegacyMissionNodes();installMissionHoldShield();let started=false;
    try{
      const{overlay,nodes}=makeSignal(['MISSION','START!']);nodes[0]?.classList.add('in');announce('mission');requestAnimationFrame(()=>overlay.classList.add('show'));
      await sleep(MISSION_GAP_MS);nodes[1]?.classList.add('in');announce('start');removeMissionHoldShield();try{onStart?.();started=true;}catch(err){console.error('TTD prepared-run start failed.',err);}
      await sleep(MISSION_START_HOLD_MS);overlay.classList.add('leaving');overlay.classList.remove('show');await sleep(300);overlay.remove();
      return true;
    }catch(err){console.error('TTD prepared mission intro failed.',err);document.getElementById(SIGNAL_ID)?.remove();if(!started){try{onStart?.();}catch(_){}}return false;}
    finally{removeMissionHoldShield();missionBusy=false;}
  }

"""
s=replace_once(s,anchor,insert+anchor,'prepared mission intro')
s=replace_once(s,"showMissionStart:playMissionCue,playCombatCountdown,showClear:playClearCue","showMissionStart:playMissionCue,presentRunStart:playPreparedMissionStart,playCombatCountdown,showClear:playClearCue",'presentation public API')
write(p,s)

# Moving Screen router: persistent preload + Zombie/Adventure-style black/art/game fade + shared Mission/Start intro.
router=r'''(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2)return;
  window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2=true;

  const ENGINE_SLOT='neon_rooftops_v2';
  const LOADING_ID='ttdMsLoadingV2';
  const LOADING_BLACK_MS=170;
  const LOADING_GAME_HOLD_MS=520;
  const LOADING_FADE_OUT_MS=220;
  const LOADING_DECODE_MAX_MS=2500;
  const LOADING_ASSET='/assets/ui/loading-moving-screen.png';
  const registry=window.TTDMovingScreenStages=window.TTDMovingScreenStages||{};
  const base=window.TTDMovingScreen;
  const defaultStage=registry[ENGINE_SLOT]||null;
  if(!base||!defaultStage)return;

  let activeStageId=ENGINE_SLOT;
  let activeStage=defaultStage;
  let pendingStageId=null;
  let startToken=0;
  let presentationTimer=0;

  function asset(path){try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}catch(_){return path;}}
  const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
  const twoFrames=()=>new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const loadingSrc=asset(LOADING_ASSET);
  const loadingMaster=new Image();loadingMaster.decoding='async';loadingMaster.loading='eager';
  const loadingMasterReady=new Promise((resolve)=>{let settled=false;const done=()=>{if(settled)return;settled=true;resolve();};loadingMaster.addEventListener('load',done,{once:true});loadingMaster.addEventListener('error',done,{once:true});loadingMaster.src=loadingSrc;if(loadingMaster.complete)done();if(typeof loadingMaster.decode==='function')loadingMaster.decode().then(done).catch(()=>{});});

  function announceActive(active){try{window.dispatchEvent(new CustomEvent('ttd:moving-screen-active',{detail:{active:!!active}}));}catch(_){}try{window.parent?.postMessage({type:'ttd:moving-screen-active',active:!!active},location.origin);}catch(_){}}
  function resolve(stageId){const id=String(stageId||ENGINE_SLOT);return registry[id]||null;}
  function installStage(stageId){const next=resolve(stageId);if(!next)throw new Error(`Unknown Moving Screen stage: ${stageId}`);activeStageId=next.id;activeStage=next;registry[ENGINE_SLOT]=next;return next;}
  function restoreDefault(){registry[ENGINE_SLOT]=defaultStage;activeStageId=ENGINE_SLOT;activeStage=defaultStage;}
  function stageCopy(){const construction=activeStageId==='construction_climb',label=String(activeStage?.objective?.flag?.label||'').trim();return{goal:Number(activeStage?.objective?.killGoal)||30,crown:label||(construction?'Top Floor':'Sign Crown')};}

  function installLoadingStyle(){if(document.getElementById('ttdMsLoadingStyleV2'))return;const style=document.createElement('style');style.id='ttdMsLoadingStyleV2';style.textContent=`
    #${LOADING_ID}{display:none;position:fixed;inset:0;z-index:1300;background:#000;opacity:0;transition:opacity .18s ease;align-items:center;justify-content:center;overflow:hidden;pointer-events:auto;touch-action:none;}
    #${LOADING_ID}.show{display:flex}#${LOADING_ID}.vis{opacity:1}
    #${LOADING_ID} img{display:block;width:100%;height:100%;object-fit:contain;object-position:center;image-rendering:auto;opacity:0;transition:opacity .16s ease}
    #${LOADING_ID}.art img{opacity:1}
  `;document.head.appendChild(style);}
  function showLoading(){installLoadingStyle();document.getElementById(LOADING_ID)?.remove();const root=document.createElement('div');root.id=LOADING_ID;root.className='show';const img=document.createElement('img');img.alt='Moving Screen loading screen';img.decoding='async';img.loading='eager';img.src=loadingMaster.currentSrc||loadingMaster.src||loadingSrc;root.appendChild(img);(document.getElementById('app')||document.body).appendChild(root);requestAnimationFrame(()=>root.classList.add('vis'));const ready=new Promise((resolve)=>{let settled=false;const done=()=>{if(settled)return;settled=true;resolve();};img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});if(img.complete)done();if(typeof img.decode==='function')img.decode().then(done).catch(()=>{});});return{root,img,ready};}
  async function hideLoading(root=document.getElementById(LOADING_ID)){if(!root)return;root.classList.remove('vis');await sleep(LOADING_FADE_OUT_MS);root.remove();}

  function syncPresentation(){if(!base.active)return;const name=activeStage?.name||'Moving Screen',copy=stageCopy(),label=document.getElementById('modeLabel');if(label&&label.textContent!==`Moving Screen · ${name}`)label.textContent=`Moving Screen · ${name}`;document.getElementById('ttdMsHudTitleFrameV1')?.remove();const game=document.getElementById('gameScreen');if(game){game.dataset.ttdMovingStage=activeStageId;game.classList.toggle('ttd-construction-climb',activeStageId==='construction_climb');}const hint=document.getElementById('ttdMsHintV4');if(hint&&/60 KOs reached/.test(hint.textContent||''))hint.textContent=hint.textContent.replace('60 KOs reached',`${copy.goal} KOs reached`);const toast=document.getElementById('toast');if(toast&&activeStageId==='construction_climb'&&/SIGN CROWN/i.test(toast.textContent||''))toast.textContent=toast.textContent.replace(/SIGN CROWN/ig,copy.crown.toUpperCase());}
  function presentationTick(){if(base.active)syncPresentation();else if(activeStageId!==ENGINE_SLOT&&!pendingStageId){document.getElementById('gameScreen')?.classList.remove('ttd-construction-climb');restoreDefault();}}
  function startPresentationSync(){stopPresentationSync();presentationTick();presentationTimer=setInterval(presentationTick,650);}
  function stopPresentationSync(){if(presentationTimer)clearInterval(presentationTimer);presentationTimer=0;}

  function beginStage(stageId){const stage=installStage(stageId);try{base.start({introHold:true});}catch(error){restoreDefault();announceActive(false);throw error;}if(!base.active){restoreDefault();announceActive(false);return false;}activeStage=stage;announceActive(true);startPresentationSync();syncPresentation();try{const copy=stageCopy();window.toastGlobal?.(`10 lives · ${copy.goal} KOs · seize the ${copy.crown.toLowerCase()} flag`);}catch(_){}return true;}
  async function launch(stage,token,loading){
    await sleep(LOADING_BLACK_MS);if(token!==startToken||pendingStageId!==stage.id)return;loading.root.classList.add('art');
    await Promise.race([Promise.all([loadingMasterReady,loading.ready]),sleep(LOADING_DECODE_MAX_MS)]);if(token!==startToken||pendingStageId!==stage.id)return;
    const id=pendingStageId;pendingStageId=null;if(!id){await hideLoading(loading.root);return;}
    try{if(!beginStage(id)){await hideLoading(loading.root);return;}}catch(error){console.error('Moving Screen delayed start failed',error);await hideLoading(loading.root);announceActive(false);return;}
    await sleep(LOADING_GAME_HOLD_MS);await twoFrames();if(token!==startToken||!base.active){await hideLoading(loading.root);return;}
    await hideLoading(loading.root);if(token!==startToken||!base.active)return;
    const presentation=window.TTDGamePresentation;
    if(presentation?.presentRunStart)await presentation.presentRunStart(()=>base.releaseIntroHold?.());else base.releaseIntroHold?.();
  }
  function start(stageId=ENGINE_SLOT){if(base.active||pendingStageId)return false;const stage=resolve(stageId);if(!stage)throw new Error(`Unknown Moving Screen stage: ${stageId}`);pendingStageId=stage.id;activeStage=stage;const token=++startToken,loading=showLoading();launch(stage,token,loading).catch((error)=>{console.error('Moving Screen launch sequence failed',error);pendingStageId=null;hideLoading(loading.root);announceActive(false);base.exit?.();});return true;}
  function exit(){pendingStageId=null;startToken++;stopPresentationSync();hideLoading();announceActive(false);try{return base.exit();}finally{document.getElementById('gameScreen')?.classList.remove('ttd-construction-climb');restoreDefault();}}

  function passthrough(name,...args){const fn=base?.[name];return typeof fn==='function'?fn(...args):false;}
  window.TTDMovingScreen=Object.freeze({
    version:base.version,routerVersion:2,start,exit,finishRun:(...a)=>passthrough('finishRun',...a),
    summon:(...a)=>passthrough('summon',...a),powerSelected:(...a)=>passthrough('powerSelected',...a),activateOverdriveSlot:(...a)=>passthrough('activateOverdriveSlot',...a),
    hitTestDieClient:(...a)=>passthrough('hitTestDieClient',...a),beginDieGestureClient:(...a)=>passthrough('beginDieGestureClient',...a),moveDieGestureClient:(...a)=>passthrough('moveDieGestureClient',...a),endDieGestureClient:(...a)=>passthrough('endDieGestureClient',...a),
    get active(){return!!base.active;},get starting(){return!!pendingStageId;},get stageId(){return pendingStageId||activeStageId;},get stage(){return pendingStageId?resolve(pendingStageId):activeStage;},
    get state(){const s=base.state;return s?{...s,stageId:activeStageId,stageName:activeStage?.name||null,direction:activeStage?.direction||'up'}:null;},
  });

  presentationTick();
})();
'''
write('online/moving-screen-map-router-v2.js',router)

# Arcade shell: canonical Moving Screen result is direct; no bespoke-result observer or manual-exit bypass.
p='online/arcade-mode-shell-v2.js'; s=read(p)
s=s.replace("  let shellObserver=null;\n  let resultObserver=null;","  let shellObserver=null;")
pattern=r"  function presentMovingResult\(box,state\)\{.*?\n  function onMessage\(event\)\{"
replacement=r'''  function presentMovingOutcome(kind,reason){
    if(movingResultActive)return false;
    movingResultActive=true;
    const state=window.TTDMovingScreen?.state||{};
    finishOnlineRun(movingMetrics(),'moving_screen');
    const overlay=document.getElementById('gameOverlay');if(!overlay)return false;
    const normalized=['clear','fail','finish'].includes(String(kind))?String(kind):'fail';
    const title=normalized==='clear'?'AREA CLAIMED':normalized==='finish'?'RUN COMPLETE':'RUN FAILED';
    const overlayTitle=document.getElementById('overlayTitle'),overlayText=document.getElementById('overlayText'),overlayStats=document.getElementById('overlayStats');
    if(overlayTitle)overlayTitle.textContent=title;
    if(overlayText)overlayText.textContent=String(reason||'The Moving Screen run has ended.');
    if(overlayStats)overlayStats.textContent=`${Math.min(Number(state.kills)||0,Number(state.killGoal)||30)} / ${Number(state.killGoal)||30} enemies defeated · ${Number(state.lives)||0} lives left · ${String(state.flag||'Flag unresolved')}`;
    const pips=document.getElementById('overlayPipsValue'),exp=document.getElementById('overlayExpValue'),notesP=document.getElementById('overlayPipsNotes'),notesE=document.getElementById('overlayExpNotes'),level=document.getElementById('overlayLevelUp');
    if(pips)pips.textContent='…';if(exp)exp.textContent='…';if(notesP)notesP.textContent='';if(notesE)notesE.textContent='';if(level)level.textContent='';
    document.getElementById('ttdRunRewardsV26')?.remove();window.TTDGamePresentation?.decorateAdventureResult?.();overlay.classList.add('show');return true;
  }

  function onMessage(event){'''
s,n=re.subn(pattern,replacement,s,flags=re.S)
if n!=1: raise SystemExit(f'arcade result block patch count {n}')
pattern=r"  function finalizeManualMovingExit\(\)\{.*?\n  function installObservers\(\)\{.*?\n  \}"
replacement="""  function installObservers(){
    const modeBody=document.querySelector('#modeScreen .modeBody');
    if(modeBody&&!shellObserver){shellObserver=new MutationObserver(()=>ownArcadeCards());shellObserver.observe(modeBody,{childList:true,subtree:false});}
  }"""
s,n=re.subn(pattern,replacement,s,flags=re.S)
if n!=1: raise SystemExit(f'arcade observer patch count {n}')
s=s.replace("    if(event.target?.id==='ttdMsExitV4')finalizeManualMovingExit();\n",'')
obj_anchor="    startMovingMap,"
if obj_anchor not in s: raise SystemExit('arcade public object anchor missing')
s=s.replace(obj_anchor,"    startMovingMap,\n    presentMovingOutcome,",1)
write(p,s)

# Back suppression and Moving Screen End Run outcome.
controls=r'''(() => {
  'use strict';
  if(window.__TTD_SINGLEPLAYER_RUN_CONTROLS_V1)return;
  window.__TTD_SINGLEPLAYER_RUN_CONTROLS_V1=true;

  const STYLE_ID='ttdSingleplayerRunControlsV1Style';
  let movingExitBusy=false;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
      .backBtn,.ttdUnifiedBackV1{min-width:68px!important;height:36px!important;padding:0 12px!important;border-radius:9px!important;display:inline-flex;align-items:center;justify-content:center;font:400 11px/1 'Russo One',sans-serif!important;letter-spacing:.02em!important;}
      #gameScreen.ttdSingleplayerRunActiveV1 #pauseBtn,#gameScreen.ttdSingleplayerRunActiveV1 .backBtn,#gameScreen.ttdSingleplayerRunActiveV1 [data-ttd-back]{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #gameScreen.ttdSingleplayerRunActiveV1 #endRunBtn{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;align-items:center!important;justify-content:center!important;min-width:78px!important;height:36px!important;padding:0 12px!important;border:0!important;border-radius:9px!important;background:linear-gradient(180deg,#f3d491,#d9b26a)!important;color:#0a0c14!important;font:400 10.5px/1 'Russo One',sans-serif!important;letter-spacing:.015em!important;box-shadow:0 3px 0 rgba(77,55,21,.72),0 6px 14px rgba(0,0,0,.28)!important;text-shadow:none!important;}
      @media(max-width:560px){.backBtn,.ttdUnifiedBackV1{min-width:64px!important;height:34px!important;padding:0 10px!important;font-size:10px!important}#gameScreen.ttdSingleplayerRunActiveV1 #endRunBtn{min-width:72px!important;height:34px!important;padding:0 9px!important;font-size:9.5px!important}}
    `;document.head.appendChild(style);
  }
  function movingRunning(){try{return!!window.TTDMovingScreen?.active;}catch(_){return false;}}
  function singleplayerActive(){const game=document.getElementById('gameScreen');return!!game?.classList.contains('active');}
  function normalizeBackButtons(){document.querySelectorAll('.backBtn,[data-ttd-back]').forEach(btn=>{if(!(btn instanceof HTMLElement))return;btn.classList.add('ttdUnifiedBackV1');if(String(btn.textContent||'').trim()!=='Back')btn.textContent='Back';if(btn.tagName==='BUTTON'){btn.setAttribute('aria-label','Back');btn.title='Back';}});}
  function sync(){installStyle();normalizeBackButtons();const game=document.getElementById('gameScreen'),active=singleplayerActive();game?.classList.toggle('ttdSingleplayerRunActiveV1',active);const end=document.getElementById('endRunBtn'),pause=document.getElementById('pauseBtn');if(end){if(String(end.textContent||'').trim()!=='End Run')end.textContent='End Run';end.setAttribute('aria-label','End Run');end.title='End Run';if(!active){end.style.removeProperty('display');end.style.removeProperty('visibility');end.style.removeProperty('pointer-events');}}if(pause&&!active&&String(pause.textContent||'').trim()==='‹')pause.textContent='Back';}
  document.addEventListener('click',(event)=>{const button=event.target?.closest?.('#endRunBtn');if(!button||!movingRunning()||movingExitBusy)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();movingExitBusy=true;window.TTDMovingScreen?.finishRun?.('finish','Run ended by player.');setTimeout(()=>{movingExitBusy=false;sync();},2200);},true);
  installStyle();sync();const game=document.getElementById('gameScreen');if(game)new MutationObserver(()=>requestAnimationFrame(sync)).observe(game,{attributes:true,attributeFilter:['class'],childList:true});window.addEventListener('ttd:moving-screen-active',()=>requestAnimationFrame(sync));
})();
'''
write('online/singleplayer-run-controls-v1.js',controls)

# Cache keys for changed runtime source.
p='online/runtime-bridge-loader-v1.js'; s=read(p)
for old,new in [
  ("/online/moving-screen-engine-v5.js?v=1","/online/moving-screen-engine-v5.js?v=2"),
  ("/online/moving-screen-map-router-v2.js?v=2","/online/moving-screen-map-router-v2.js?v=3"),
  ("/online/arcade-mode-shell-v2.js?v=4","/online/arcade-mode-shell-v2.js?v=5"),
  ("/online/singleplayer-run-controls-v1.js?v=2","/online/singleplayer-run-controls-v1.js?v=3"),
]:
    if old not in s: raise SystemExit(f'loader key missing {old}')
    s=s.replace(old,new)
write(p,s)
for path in [x for x in Path('online').glob('*.js')]+[Path('random-dice-game-33.html')]:
    t=path.read_text()
    if '/online/game-presentation-v1.js?v=6' in t:
        path.write_text(t.replace('/online/game-presentation-v1.js?v=6','/online/game-presentation-v1.js?v=7'))

# Validators.
p='scripts/check-moving-screen-v1.mjs'; s=read(p)
old="for(const marker of ['window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2=true',\"const LOADING_ID='ttdMsLoadingV2'\",'const LOADING_MIN_MS=720',\"const LOADING_ASSET='/assets/ui/loading-moving-screen.png'\",'img.src=asset(LOADING_ASSET)','base.start()','LOADING_DECODE_MAX_MS=2500','Promise.all([sleep(LOADING_MIN_MS)','startPresentationSync()','announceActive(true)'])must(router.includes(marker),`Moving Screen loading/router contract missing: ${marker}`);"
new="for(const marker of ['window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2=true',\"const LOADING_ID='ttdMsLoadingV2'\",\"const LOADING_ASSET='/assets/ui/loading-moving-screen.png'\",'const loadingMaster=new Image()','loadingMaster.decode()','LOADING_BLACK_MS=170','LOADING_GAME_HOLD_MS=520','LOADING_FADE_OUT_MS=220',\"root.className='show'\",\"root.classList.add('vis')\",\"loading.root.classList.add('art')\",\"root.classList.remove('vis')\",'base.start({introHold:true})','presentation?.presentRunStart','base.releaseIntroHold','startPresentationSync()','announceActive(true)'])must(router.includes(marker),`Moving Screen loading/router contract missing: ${marker}`);"
s=replace_once(s,old,new,'moving router validator')
old2="for(const marker of ['window.__TTD_SINGLEPLAYER_RUN_CONTROLS_V1=true',\"String(btn.textContent||'').trim()!=='Back'\",'ttdSingleplayerRunActiveV1','End Run','linear-gradient(180deg,#f3d491,#d9b26a)',\"event.target?.closest?.('#endRunBtn')\",'ttdMsExitV4'])must(runControls.includes(marker),`Shared single-player Back/End Run contract missing: ${marker}`);"
new2="for(const marker of ['window.__TTD_SINGLEPLAYER_RUN_CONTROLS_V1=true',\"String(btn.textContent||'').trim()!=='Back'\",'ttdSingleplayerRunActiveV1','End Run','linear-gradient(180deg,#f3d491,#d9b26a)',\"event.target?.closest?.('#endRunBtn')\",\"return!!game?.classList.contains('active')\",\"finishRun?.('finish','Run ended by player.')\"])must(runControls.includes(marker),`Shared single-player Back/End Run contract missing: ${marker}`);"
s=replace_once(s,old2,new2,'run controls validator')
write(p,s)

p='scripts/check-arcade-mode-shell-v1.mjs'; s=read(p)
s=s.replace("const shellUrl=\"'/online/arcade-mode-shell-v2.js?v=4'\"","const shellUrl=\"'/online/arcade-mode-shell-v2.js?v=5'\"")
write(p,s)

nav=r'''import fs from 'node:fs';
const controls=fs.readFileSync('online/singleplayer-run-controls-v1.js','utf8');
const game=fs.readFileSync('random-dice-game-33.html','utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
must(controls.includes("function singleplayerActive(){const game=document.getElementById('gameScreen');return!!game?.classList.contains('active');}"),'Any active single-player game screen must suppress Back, including intro/held/test-map phases.');
for(const marker of ['#gameScreen.ttdSingleplayerRunActiveV1 #pauseBtn','#gameScreen.ttdSingleplayerRunActiveV1 .backBtn','#gameScreen.ttdSingleplayerRunActiveV1 [data-ttd-back]','display:none!important','pointer-events:none!important'])must(controls.includes(marker),`Single-player Back suppression missing: ${marker}`);
must(controls.includes("finishRun?.('finish','Run ended by player.')"),'Moving Screen End Run must enter the FINISH outcome path rather than navigate Back/exit directly.');
must(game.includes("document.getElementById('pauseBtn').addEventListener('click', ()=>{"),'Legacy Back handler may remain as an unreachable fallback but must stay behind shared suppression.');
console.log('Navigation v2 verified: Back is inaccessible whenever the single-player game screen is active; Moving Screen End Run uses FINISH.');
'''
write('scripts/check-navigation-v1.mjs',nav)

test=r'''import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const must=(c,m)=>{if(!c)throw new Error(m);};
const gate=fs.readFileSync('online/startup-gate-v33.js','utf8');
const router=fs.readFileSync('online/moving-screen-map-router-v2.js','utf8');
const engine=fs.readFileSync('online/moving-screen-engine-v5.js','utf8');
const present=fs.readFileSync('online/game-presentation-v1.js','utf8');
const shell=fs.readFileSync('online/arcade-mode-shell-v2.js','utf8');
const controls=fs.readFileSync('online/singleplayer-run-controls-v1.js','utf8');
must(gate.includes("'/assets/ui/loading-moving-screen.png'"),'Moving Screen loading art must remain in the startup critical preload set.');
for(const m of ['const loadingMaster=new Image()','loadingMaster.decode()','LOADING_BLACK_MS=170','LOADING_GAME_HOLD_MS=520','LOADING_FADE_OUT_MS=220',"root.classList.add('vis')","loading.root.classList.add('art')","root.classList.remove('vis')",'base.start({introHold:true})','presentation?.presentRunStart','base.releaseIntroHold'])must(router.includes(m),`Loading parity missing: ${m}`);
for(const m of ['introHold:false','runtime.introHold=!!options?.introHold','function releaseIntroHold()','function finishRun(',"finish('fail','All 10 lives were lost.')","finish('clear',`You defeated",'shell?.presentMovingOutcome','p.presentOutcome(outcome'])must(engine.includes(m),`Moving Screen lifecycle parity missing: ${m}`);
for(const m of ['async function playPreparedMissionStart',"makeSignal(['MISSION','START!'])","announce('mission')","announce('start')",'presentRunStart:playPreparedMissionStart'])must(present.includes(m),`Shared Mission/Start parity missing: ${m}`);
for(const m of ['function presentMovingOutcome(kind,reason)',"normalized==='clear'?'AREA CLAIMED':normalized==='finish'?'RUN COMPLETE':'RUN FAILED'","finishOnlineRun(movingMetrics(),'moving_screen')",'TTDGamePresentation?.decorateAdventureResult?.()',"overlay.classList.add('show')"])must(shell.includes(m),`Canonical Moving Screen result parity missing: ${m}`);
must(!shell.includes('resultObserver.observe(document.documentElement'),'Moving Screen result handling must not restore a broad document observer.');
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);must(chrome,'Presentation parity browser smoke requires Chrome.');
const controlsUrl=pathToFileURL(path.join(process.cwd(),'online/singleplayer-run-controls-v1.js')).href;
const harness=path.join(os.tmpdir(),`ttd-ms-present-${process.pid}.html`);
const html=`<!doctype html><html><head><style>.screen{display:none}.screen.active{display:block}</style></head><body><div id="gameScreen" class="screen active"><button id="pauseBtn">Back</button><button class="backBtn">Back</button><button id="endRunBtn">End Run</button></div><script>window.calls=[];window.TTDMovingScreen={active:true,finishRun:(...a)=>calls.push(a)};</script><script src="${controlsUrl}"></script><script>setTimeout(()=>{const p=document.getElementById('pauseBtn'),b=document.querySelector('.backBtn'),e=document.getElementById('endRunBtn');e.click();const report={classed:document.getElementById('gameScreen').classList.contains('ttdSingleplayerRunActiveV1'),pauseHidden:getComputedStyle(p).display==='none',backHidden:getComputedStyle(b).display==='none',finishCalled:calls.length===1&&calls[0][0]==='finish'};report.ok=Object.values(report).every(Boolean);document.body.dataset.report=JSON.stringify(report)},80)</script></body></html>`;fs.writeFileSync(harness,html);
let dom='';try{dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--virtual-time-budget=500','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',timeout:20000});}finally{try{fs.unlinkSync(harness)}catch{}}
const m=dom.match(/data-report="([^"]+)"/);must(m,'Back suppression smoke produced no report.');const report=JSON.parse(m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));must(report.ok,`Back suppression smoke failed: ${JSON.stringify(report)}`);
console.log('Moving Screen presentation parity verified:',JSON.stringify(report));
'''
write('scripts/check-moving-screen-presentation-parity-v1.mjs',test)

p='package.json'; s=read(p)
old='"check:moving-screen": "node scripts/check-moving-screen-v1.mjs && node scripts/check-construction-climb-v1.mjs && node scripts/check-construction-climb-browser-v1.mjs"'
new='"check:moving-screen": "node scripts/check-moving-screen-v1.mjs && node scripts/check-moving-screen-presentation-parity-v1.mjs && node scripts/check-construction-climb-v1.mjs && node scripts/check-construction-climb-browser-v1.mjs"'
s=replace_once(s,old,new,'package moving screen check')
write(p,s)

# Update exact cache-key expectations in validators.
for path in Path('scripts').glob('*.mjs'):
    t=path.read_text()
    nt=(t.replace("'/online/moving-screen-engine-v5.js?v=1'","'/online/moving-screen-engine-v5.js?v=2'")
         .replace("'/online/moving-screen-map-router-v2.js?v=2'","'/online/moving-screen-map-router-v2.js?v=3'")
         .replace("'/online/arcade-mode-shell-v2.js?v=4'","'/online/arcade-mode-shell-v2.js?v=5'")
         .replace("'/online/singleplayer-run-controls-v1.js?v=1'","'/online/singleplayer-run-controls-v1.js?v=2'")
         .replace("'/online/game-presentation-v1.js?v=6'","'/online/game-presentation-v1.js?v=7'"))
    if nt!=t: path.write_text(nt)
