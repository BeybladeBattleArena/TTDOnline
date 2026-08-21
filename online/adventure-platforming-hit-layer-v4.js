(() => {
  'use strict';
  if(window.__TTD_ADVENTURE_PLATFORM_HIT_LAYER_V4)return;
  window.__TTD_ADVENTURE_PLATFORM_HIT_LAYER_V4=true;

  const LAYER_ID='ttdNavHitLayerV4';

  function removeLayer(){
    document.getElementById(LAYER_ID)?.remove();
  }

  function ensureLayer(){
    let layer=document.getElementById(LAYER_ID);
    if(layer)return layer;
    layer=document.createElement('div');
    layer.id=LAYER_ID;
    layer.style.cssText='position:fixed;inset:0;z-index:420;pointer-events:none;';
    document.body.appendChild(layer);
    return layer;
  }

  function syncHitTargets(){
    const game=document.getElementById('gameScreen');
    const api=window.__TTD_PLATFORM_TEST_API;
    const selecting=!!(game?.classList.contains('ttd-nav-instance-select')&&api?.selecting&&typeof api.selectNavigator==='function');

    if(!selecting){
      removeLayer();
      requestAnimationFrame(syncHitTargets);
      return;
    }

    const board=document.getElementById('board');
    if(!board){
      removeLayer();
      requestAnimationFrame(syncHitTargets);
      return;
    }

    const layer=ensureLayer();
    const choices=[...board.querySelectorAll('.tile')]
      .map((tile,index)=>({tile,index}))
      .filter(({tile})=>tile.classList.contains('ttd-nav-choice'));

    const wanted=new Set(choices.map(({index})=>String(index)));
    [...layer.children].forEach(el=>{if(!wanted.has(el.dataset.boardIndex))el.remove();});

    for(const {tile,index} of choices){
      let hit=layer.querySelector(`[data-board-index="${index}"]`);
      if(!hit){
        hit=document.createElement('button');
        hit.type='button';
        hit.dataset.boardIndex=String(index);
        hit.setAttribute('aria-label',`Select summoned die ${index+1} as navigator`);
        hit.style.cssText='position:fixed;pointer-events:auto;touch-action:none;border:2px solid rgba(243,212,145,.9);border-radius:11px;background:rgba(243,212,145,.035);box-shadow:0 0 12px rgba(243,212,145,.20);padding:0;margin:0;appearance:none;-webkit-appearance:none;';
        hit.addEventListener('pointerdown',event=>{
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          const boardIndex=Number(hit.dataset.boardIndex);
          if(Number.isInteger(boardIndex))window.__TTD_PLATFORM_TEST_API?.selectNavigator?.(boardIndex);
        },{capture:true,passive:false});
        layer.appendChild(hit);
      }
      const r=tile.getBoundingClientRect();
      hit.style.left=`${r.left}px`;
      hit.style.top=`${r.top}px`;
      hit.style.width=`${r.width}px`;
      hit.style.height=`${r.height}px`;
    }

    requestAnimationFrame(syncHitTargets);
  }

  requestAnimationFrame(syncHitTargets);
})();
