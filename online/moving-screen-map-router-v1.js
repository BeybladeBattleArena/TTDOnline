(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_MAP_ROUTER_V1)return;
  window.__TTD_MOVING_SCREEN_MAP_ROUTER_V1=true;

  const ENGINE_SLOT='neon_rooftops_v2';
  const registry=window.TTDMovingScreenStages=window.TTDMovingScreenStages||{};
  const base=window.TTDMovingScreen;
  const defaultStage=registry[ENGINE_SLOT]||null;
  if(!base||!defaultStage)return;

  let activeStageId=ENGINE_SLOT;
  let activeStage=defaultStage;
  let raf=0;

  function resolve(stageId){
    const id=String(stageId||ENGINE_SLOT);
    return registry[id]||null;
  }
  function installStage(stageId){
    const next=resolve(stageId);
    if(!next)throw new Error(`Unknown Moving Screen stage: ${stageId}`);
    activeStageId=next.id;
    activeStage=next;
    // v4 engine and its route/presentation helpers intentionally read the canonical slot.
    // Keep one engine authority by pointing that slot at the selected immutable stage for the run.
    registry[ENGINE_SLOT]=next;
    return next;
  }
  function restoreDefault(){
    registry[ENGINE_SLOT]=defaultStage;
    activeStageId=ENGINE_SLOT;
    activeStage=defaultStage;
  }
  function syncTitle(){
    if(!base.active)return;
    const name=activeStage?.name||'Moving Screen';
    const label=document.getElementById('modeLabel');
    if(label&&label.textContent!==`Moving Screen · ${name}`)label.textContent=`Moving Screen · ${name}`;
    const frameTitle=document.getElementById('ttdMsHudTitleFrameV1');
    if(frameTitle&&frameTitle.textContent!==`Moving Screen · ${name}`)frameTitle.textContent=`Moving Screen · ${name}`;
    const game=document.getElementById('gameScreen');
    if(game){
      game.dataset.ttdMovingStage=activeStageId;
      game.classList.toggle('ttd-construction-climb',activeStageId==='construction_climb');
    }
  }
  function tick(){
    if(base.active)syncTitle();
    else if(activeStageId!==ENGINE_SLOT){
      document.getElementById('gameScreen')?.classList.remove('ttd-construction-climb');
      restoreDefault();
    }
    raf=requestAnimationFrame(tick);
  }

  function start(stageId=ENGINE_SLOT){
    if(base.active)return;
    const stage=installStage(stageId);
    try{base.start();}catch(error){restoreDefault();throw error;}
    if(!base.active){restoreDefault();return;}
    activeStage=stage;
    syncTitle();
    try{window.toastGlobal?.(`10 lives · ${stage.objective?.killGoal||30} KOs · seize the ${stage.id==='construction_climb'?'crane crown':'crown'} flag`);}catch(_){}
  }
  function exit(){
    try{return base.exit();}
    finally{
      document.getElementById('gameScreen')?.classList.remove('ttd-construction-climb');
      restoreDefault();
    }
  }

  window.TTDMovingScreen=Object.freeze({
    version:base.version,
    routerVersion:1,
    start,
    exit,
    get active(){return !!base.active;},
    get stageId(){return activeStageId;},
    get stage(){return activeStage;},
    get state(){
      const s=base.state;
      return s?{...s,stageId:activeStageId,stageName:activeStage?.name||null,direction:activeStage?.direction||'up'}:null;
    },
  });

  cancelAnimationFrame(raf);
  raf=requestAnimationFrame(tick);
})();
