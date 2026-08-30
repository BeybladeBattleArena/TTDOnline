(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2)return;
  window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2=true;

  const ENGINE_SLOT='neon_rooftops_v2';
  const LOADING_ID='ttdMsLoadingV2';
  const LOADING_MIN_MS=720;
  const registry=window.TTDMovingScreenStages=window.TTDMovingScreenStages||{};
  const base=window.TTDMovingScreen;
  const defaultStage=registry[ENGINE_SLOT]||null;
  if(!base||!defaultStage)return;

  let activeStageId=ENGINE_SLOT;
  let activeStage=defaultStage;
  let pendingStageId=null;
  let startTimer=0;
  let raf=0;

  function asset(path){try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}catch(_){return path;}}
  function resolve(stageId){const id=String(stageId||ENGINE_SLOT);return registry[id]||null;}
  function installStage(stageId){const next=resolve(stageId);if(!next)throw new Error(`Unknown Moving Screen stage: ${stageId}`);activeStageId=next.id;activeStage=next;registry[ENGINE_SLOT]=next;return next;}
  function restoreDefault(){registry[ENGINE_SLOT]=defaultStage;activeStageId=ENGINE_SLOT;activeStage=defaultStage;}
  function stageCopy(){const construction=activeStageId==='construction_climb',label=String(activeStage?.objective?.flag?.label||'').trim();return{goal:Number(activeStage?.objective?.killGoal)||30,crown:label||(construction?'Top Floor':'Sign Crown')};}

  function installLoadingStyle(){if(document.getElementById('ttdMsLoadingStyleV2'))return;const style=document.createElement('style');style.id='ttdMsLoadingStyleV2';style.textContent=`
    #${LOADING_ID}{position:fixed;inset:0;z-index:1300;display:flex;align-items:center;justify-content:center;background:#050711;overflow:hidden;pointer-events:auto;touch-action:none;}
    #${LOADING_ID} img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;filter:brightness(.73) saturate(.88);}
    #${LOADING_ID}::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,7,17,.12),rgba(5,7,17,.24) 52%,rgba(5,7,17,.86));}
    #${LOADING_ID} .copy{position:absolute;z-index:2;left:18px;right:18px;bottom:max(28px,calc(env(safe-area-inset-bottom) + 22px));text-align:center;color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.9),0 0 18px rgba(0,0,0,.65);font-family:'Russo One',sans-serif;}
    #${LOADING_ID} .mode{font-size:12px;letter-spacing:.12em;color:#f3d491;margin-bottom:5px}#${LOADING_ID} .map{font-size:clamp(24px,7vw,38px);line-height:1.02}#${LOADING_ID} .loading{font-size:10px;letter-spacing:.18em;color:#d4ecfa;margin-top:10px;animation:ttdMsLoadingPulseV2 1s ease-in-out infinite alternate}
    @keyframes ttdMsLoadingPulseV2{from{opacity:.48}to{opacity:1}}
  `;document.head.appendChild(style);}
  function showLoading(stage){installLoadingStyle();document.getElementById(LOADING_ID)?.remove();const root=document.createElement('div');root.id=LOADING_ID;root.innerHTML=`<img alt="" src="${asset('/assets/ui/loading-endless-horde.png')}"><div class="copy"><div class="mode">MOVING SCREEN</div><div class="map">${String(stage?.name||'Moving Screen')}</div><div class="loading">NOW LOADING</div></div>`;(document.getElementById('app')||document.body).appendChild(root);return root;}
  function hideLoading(){const root=document.getElementById(LOADING_ID);if(!root)return;root.style.transition='opacity .22s ease';root.style.opacity='0';setTimeout(()=>root.remove(),240);}

  function syncPresentation(){if(!base.active)return;const name=activeStage?.name||'Moving Screen',copy=stageCopy(),label=document.getElementById('modeLabel');if(label&&label.textContent!==`Moving Screen · ${name}`)label.textContent=`Moving Screen · ${name}`;document.getElementById('ttdMsHudTitleFrameV1')?.remove();const game=document.getElementById('gameScreen');if(game){game.dataset.ttdMovingStage=activeStageId;game.classList.toggle('ttd-construction-climb',activeStageId==='construction_climb');}const hint=document.getElementById('ttdMsHintV4');if(hint&&/60 KOs reached/.test(hint.textContent||''))hint.textContent=hint.textContent.replace('60 KOs reached',`${copy.goal} KOs reached`);const resultText=document.querySelector('#ttdMsResultV4 p');if(resultText){let text=String(resultText.textContent||'');text=text.replace(/60 enemies/g,`${copy.goal} enemies`).replace(/Sign Crown/g,copy.crown);if(resultText.textContent!==text)resultText.textContent=text;}const toast=document.getElementById('toast');if(toast&&activeStageId==='construction_climb'&&/SIGN CROWN/i.test(toast.textContent||''))toast.textContent=toast.textContent.replace(/SIGN CROWN/ig,copy.crown.toUpperCase());}
  function tick(){if(base.active)syncPresentation();else if(activeStageId!==ENGINE_SLOT&&!pendingStageId){document.getElementById('gameScreen')?.classList.remove('ttd-construction-climb');restoreDefault();}raf=requestAnimationFrame(tick);}

  function beginStage(stageId){const stage=installStage(stageId);try{base.start();}catch(error){restoreDefault();hideLoading();throw error;}if(!base.active){restoreDefault();hideLoading();return false;}activeStage=stage;syncPresentation();try{const copy=stageCopy();window.toastGlobal?.(`10 lives · ${copy.goal} KOs · seize the ${copy.crown.toLowerCase()} flag`);}catch(_){}setTimeout(hideLoading,180);return true;}
  function start(stageId=ENGINE_SLOT){if(base.active||pendingStageId)return false;const stage=resolve(stageId);if(!stage)throw new Error(`Unknown Moving Screen stage: ${stageId}`);pendingStageId=stage.id;activeStage=stage;showLoading(stage);clearTimeout(startTimer);startTimer=setTimeout(()=>{const id=pendingStageId;pendingStageId=null;if(!id){hideLoading();return;}try{beginStage(id);}catch(error){console.error('Moving Screen delayed start failed',error);hideLoading();}},LOADING_MIN_MS);return true;}
  function exit(){pendingStageId=null;clearTimeout(startTimer);hideLoading();try{return base.exit();}finally{document.getElementById('gameScreen')?.classList.remove('ttd-construction-climb');restoreDefault();}}

  function passthrough(name,...args){const fn=base?.[name];return typeof fn==='function'?fn(...args):false;}
  window.TTDMovingScreen=Object.freeze({
    version:base.version,routerVersion:2,start,exit,
    summon:(...a)=>passthrough('summon',...a),powerSelected:(...a)=>passthrough('powerSelected',...a),activateOverdriveSlot:(...a)=>passthrough('activateOverdriveSlot',...a),
    hitTestDieClient:(...a)=>passthrough('hitTestDieClient',...a),beginDieGestureClient:(...a)=>passthrough('beginDieGestureClient',...a),moveDieGestureClient:(...a)=>passthrough('moveDieGestureClient',...a),endDieGestureClient:(...a)=>passthrough('endDieGestureClient',...a),
    get active(){return!!base.active;},get starting(){return!!pendingStageId;},get stageId(){return pendingStageId||activeStageId;},get stage(){return pendingStageId?resolve(pendingStageId):activeStage;},
    get state(){const s=base.state;return s?{...s,stageId:activeStageId,stageName:activeStage?.name||null,direction:activeStage?.direction||'up'}:null;},
  });

  cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
})();