(() => {
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
