(() => {
  'use strict';
  if(window.__TTD_ADVENTURE_PLATFORM_SELECTOR_V5)return;
  window.__TTD_ADVENTURE_PLATFORM_SELECTOR_V5=true;

  const ROOT_ID='ttdNavigatorSelectorV5';
  let lastSelecting=false;

  function removeSelector(){
    document.getElementById(ROOT_ID)?.remove();
    const board=document.getElementById('board');
    if(board)board.style.visibility='';
  }

  function selectBoardIndex(index, status, button){
    const api=window.__TTD_PLATFORM_TEST_API;
    if(!api?.selecting || typeof api.selectNavigator!=='function')return;
    if(button?.dataset.locked==='1')return;
    if(button)button.dataset.locked='1';
    if(status)status.textContent=`Selecting summoned slot ${index+1}…`;
    try{
      api.selectNavigator(index);
    }catch(err){
      console.error('Navigator selector v5 failed to select board instance.',err);
      if(status)status.textContent=`Selection error: ${err?.message||'unknown error'}`;
      if(button)button.dataset.locked='0';
      return;
    }
    setTimeout(()=>{
      if(api.selecting){
        if(status)status.textContent='Selection reached the runtime but traversal did not start. End Run remains available.';
        if(button)button.dataset.locked='0';
      }
    },350);
  }

  function bindNativeSelection(button,index,status){
    let fired=false;
    const fire=(event)=>{
      if(fired)return;
      fired=true;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.stopImmediatePropagation?.();
      selectBoardIndex(index,status,button);
      setTimeout(()=>{fired=false;},500);
    };
    button.addEventListener('pointerdown',fire,{capture:true,passive:false});
    button.addEventListener('touchstart',fire,{capture:true,passive:false});
    button.addEventListener('click',fire,{capture:true});
  }

  function buildSelector(){
    const api=window.__TTD_PLATFORM_TEST_API;
    const board=document.getElementById('board');
    const boardWrap=document.getElementById('boardWrap');
    if(!api?.selecting || !board || !boardWrap)return;
    removeSelector();

    const root=document.createElement('div');
    root.id=ROOT_ID;
    root.style.cssText='position:absolute;inset:0;z-index:120;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:8px;background:rgba(8,11,20,.90);border-radius:12px;touch-action:none;';

    const title=document.createElement('div');
    title.textContent='Select one of your currently summoned dice to navigate with';
    title.style.cssText="max-width:360px;text-align:center;color:#f3d491;font:700 10px 'Cinzel',serif;line-height:1.35;letter-spacing:.035em;";

    const version=document.createElement('div');
    version.textContent='NAV SELECT V5';
    version.style.cssText="color:#8fc4e8;font:700 8px 'Space Mono',monospace;letter-spacing:.12em;";

    const clone=board.cloneNode(true);
    clone.id='ttdNavigatorBoardCloneV5';
    clone.removeAttribute('aria-describedby');
    clone.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(3,1fr);gap:5px;width:100%;max-width:380px;aspect-ratio:5/3.15;position:relative;';

    const status=document.createElement('div');
    status.id='ttdNavigatorSelectorStatusV5';
    status.textContent='Tap any illuminated summoned die.';
    status.style.cssText="min-height:14px;text-align:center;color:#97a0bd;font:700 8px 'Space Mono',monospace;";

    const originalTiles=[...board.querySelectorAll('.tile')];
    const cloneTiles=[...clone.querySelectorAll('.tile')];
    let choiceCount=0;
    cloneTiles.forEach((tile,index)=>{
      tile.style.position='relative';
      const selectable=originalTiles[index]?.classList.contains('ttd-nav-choice');
      if(!selectable){
        tile.style.pointerEvents='none';
        tile.style.opacity='.22';
        tile.style.filter='grayscale(.7)';
        return;
      }
      choiceCount+=1;
      tile.style.pointerEvents='auto';
      tile.style.opacity='1';
      tile.style.filter='none';
      tile.style.outline='1px solid rgba(243,212,145,.85)';
      const hit=document.createElement('button');
      hit.type='button';
      hit.dataset.boardIndex=String(index);
      hit.setAttribute('aria-label',`Select summoned die in board slot ${index+1}`);
      hit.style.cssText='position:absolute;inset:-2px;z-index:20;width:calc(100% + 4px);height:calc(100% + 4px);padding:0;margin:0;border:2px solid rgba(243,212,145,.92);border-radius:10px;background:rgba(243,212,145,.045);box-shadow:0 0 14px rgba(243,212,145,.26);appearance:none;-webkit-appearance:none;touch-action:manipulation;pointer-events:auto;';
      bindNativeSelection(hit,index,status);
      tile.appendChild(hit);
    });

    if(!choiceCount){
      status.textContent='No live summoned dice were found for navigation.';
    }

    root.append(title,version,clone,status);
    boardWrap.appendChild(root);
    board.style.visibility='hidden';
  }

  function sync(){
    const api=window.__TTD_PLATFORM_TEST_API;
    const selecting=!!(api?.selecting && document.getElementById('gameScreen')?.classList.contains('ttd-nav-instance-select'));
    const exists=!!document.getElementById(ROOT_ID);
    if(selecting && (!exists || !lastSelecting))buildSelector();
    else if(!selecting && exists)removeSelector();
    lastSelecting=selecting;
    requestAnimationFrame(sync);
  }

  requestAnimationFrame(sync);
})();
