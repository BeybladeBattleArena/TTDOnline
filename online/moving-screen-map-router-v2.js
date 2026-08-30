(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2)return;
  window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2=true;

  const ENGINE_SLOT='neon_rooftops_v2';
  const LOADING_ID='ttdMsLoadingV2';
  const LOADING_MIN_MS=720;
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
  function announceActive(active){try{window.dispatchEvent(new CustomEvent('ttd:moving-screen-active',{detail:{active:!!active}}));}catch(_){}try{window.parent?.postMessage({type:'ttd:moving-screen-active',active:!!active},location.origin);}catch(_){}}
  function resolve(stageId){const id=String(stageId||ENGINE_SLOT);return registry[id]||null;}
  function installStage(stageId){const next=resolve(stageId);if(!next)throw new Error(`Unknown Moving Screen stage: ${stageId}`);activeStageId=next.id;activeStage=next;registry[ENGINE_SLOT]=next;return next;}
  function restoreDefault(){registry[ENGINE_SLOT]=defaultStage;activeStageId=ENGINE_SLOT;activeStage=defaultStage;}
  function stageCopy(){const construction=activeStageId==='construction_climb',label=String(activeStage?.objective?.flag?.label||'').trim();return{goal:Number(activeStage?.objective?.killGoal)||30,crown:label||(construction?'Top Floor':'Sign Crown')};}

  function installLoadingStyle(){if(document.getElementById('ttdMsLoadingStyleV2'))return;const style=document.createElement('style');style.id='ttdMsLoadingStyleV2';style.textContent=`
    #${LOADING_ID}{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;background:#050711;overflow:hidden;pointer-events:auto;touch-action:none;}
    #${LOADING_ID} img{display:block;width:100%;height:100%;object-fit:contain;object-position:center;image-rendering:auto;}
  `;document.head.appendChild(style);}
  function showLoading(){installLoadingStyle();document.getElementById(LOADING_ID)?.remove();const root=document.createElement('div');root.id=LOADING_ID;const img=document.createElement('img');img.alt='Moving Screen loading screen';img.decoding='async';img.loading='eager';img.src=asset(LOADING_ASSET);root.appendChild(img);(document.getElementById('app')||document.body).appendChild(root);const ready=new Promise((resolve)=>{let settled=false;const done=()=>{if(settled)return;settled=true;resolve();};img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});if(img.complete)done();if(typeof img.decode==='function')img.decode().then(done).catch(()=>{});});return{root,img,ready};}
  function hideLoading(){const root=document.getElementById(LOADING_ID);if(!root)return;root.style.transition='opacity .22s ease';root.style.opacity='0';setTimeout(()=>root.remove(),240);}

  function syncPresentation(){if(!base.active)return;const name=activeStage?.name||'Moving Screen',copy=stageCopy(),label=document.getElementById('modeLabel');if(label&&label.textContent!==`Moving Screen · ${name}`)label.textContent=`Moving Screen · ${name}`;document.getElementById('ttdMsHudTitleFrameV1')?.remove();const game=document.getElementById('gameScreen');if(game){game.dataset.ttdMovingStage=activeStageId;game.classList.toggle('ttd-construction-climb',activeStageId==='construction_climb');}const hint=document.getElementById('ttdMsHintV4');if(hint&&/60 KOs reached/.test(hint.textContent||''))hint.textContent=hint.textContent.replace('60 KOs reached',`${copy.goal} KOs reached`);const resultText=document.querySelector('#ttdMsResultV4 p');if(resultText){let text=String(resultText.textContent||'');text=text.replace(/60 enemies/g,`${copy.goal} enemies`).replace(/Sign Crown/g,copy.crown);if(resultText.textContent!==text)resultText.textContent=text;}const toast=document.getElementById('toast');if(toast&&activeStageId==='construction_climb'&&/SIGN CROWN/i.test(toast.textContent||''))toast.textContent=toast.textContent.replace(/SIGN CROWN/ig,copy.crown.toUpperCase());}
  function presentationTick(){if(base.active)syncPresentation();else if(activeStageId!==ENGINE_SLOT&&!pendingStageId){document.getElementById('gameScreen')?.classList.remove('ttd-construction-climb');restoreDefault();}}
  function startPresentationSync(){stopPresentationSync();presentationTick();presentationTimer=setInterval(presentationTick,650);}
  function stopPresentationSync(){if(presentationTimer)clearInterval(presentationTimer);presentationTimer=0;}

  function beginStage(stageId){const stage=installStage(stageId);try{base.start();}catch(error){restoreDefault();hideLoading();announceActive(false);throw error;}if(!base.active){restoreDefault();hideLoading();announceActive(false);return false;}activeStage=stage;announceActive(true);startPresentationSync();syncPresentation();try{const copy=stageCopy();window.toastGlobal?.(`10 lives · ${copy.goal} KOs · seize the ${copy.crown.toLowerCase()} flag`);}catch(_){}requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(hideLoading,80)));return true;}
  function start(stageId=ENGINE_SLOT){if(base.active||pendingStageId)return false;const stage=resolve(stageId);if(!stage)throw new Error(`Unknown Moving Screen stage: ${stageId}`);pendingStageId=stage.id;activeStage=stage;const token=++startToken;const loading=showLoading();Promise.all([sleep(LOADING_MIN_MS),Promise.race([loading.ready,sleep(LOADING_DECODE_MAX_MS)])]).then(()=>{if(token!==startToken||pendingStageId!==stage.id)return;const id=pendingStageId;pendingStageId=null;if(!id){hideLoading();return;}try{beginStage(id);}catch(error){console.error('Moving Screen delayed start failed',error);hideLoading();announceActive(false);}});return true;}
  function exit(){pendingStageId=null;startToken++;stopPresentationSync();hideLoading();announceActive(false);try{return base.exit();}finally{document.getElementById('gameScreen')?.classList.remove('ttd-construction-climb');restoreDefault();}}

  function passthrough(name,...args){const fn=base?.[name];return typeof fn==='function'?fn(...args):false;}
  window.TTDMovingScreen=Object.freeze({
    version:base.version,routerVersion:2,start,exit,
    summon:(...a)=>passthrough('summon',...a),powerSelected:(...a)=>passthrough('powerSelected',...a),activateOverdriveSlot:(...a)=>passthrough('activateOverdriveSlot',...a),
    hitTestDieClient:(...a)=>passthrough('hitTestDieClient',...a),beginDieGestureClient:(...a)=>passthrough('beginDieGestureClient',...a),moveDieGestureClient:(...a)=>passthrough('moveDieGestureClient',...a),endDieGestureClient:(...a)=>passthrough('endDieGestureClient',...a),
    get active(){return!!base.active;},get starting(){return!!pendingStageId;},get stageId(){return pendingStageId||activeStageId;},get stage(){return pendingStageId?resolve(pendingStageId):activeStage;},
    get state(){const s=base.state;return s?{...s,stageId:activeStageId,stageName:activeStage?.name||null,direction:activeStage?.direction||'up'}:null;},
  });

  presentationTick();
})();