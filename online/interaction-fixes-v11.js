(() => {
  'use strict';

  const LIFT_MS = 430;
  const INFO_MS = 1100;
  const MOVE_THRESHOLD = 10;
  const FAST_SCROLL_MS = 240;
  const FAST_SCROLL_PX = 28;
  const DELIBERATE_SCROLL_PX = 46;
  const SPINNER_CIRC = 81.68;

  const style=document.createElement('style');
  style.id='ttd-interaction-v11-style';
  style.textContent=`
    /* The deck screen is a real six-row viewport layout now. The collection is the only row
       allowed to shrink/scroll, so the Save button can never be pushed below the mobile viewport. */
    #deckScreen.active{
      display:grid!important;
      grid-template-rows:auto auto auto auto minmax(0,1fr) auto!important;
      min-height:0!important;
      overflow:hidden!important;
    }
    #deckScreen.active > *{min-width:0!important;}
    #collectionGrid{
      min-height:0!important;
      overflow-y:auto!important;
      padding-bottom:12px!important;
      overscroll-behavior:contain!important;
    }
    #deckFooter{
      position:relative!important;
      left:auto!important;right:auto!important;bottom:auto!important;
      z-index:40!important;
      flex-shrink:0!important;
      padding:8px 12px calc(8px + env(safe-area-inset-bottom))!important;
      background:linear-gradient(0deg,rgba(10,12,20,.995),rgba(18,22,42,.98))!important;
      border-top:1px solid var(--ink-700)!important;
      box-shadow:0 -7px 18px rgba(0,0,0,.32)!important;
    }
    #saveDeckBtn{display:block!important;width:100%!important;min-height:42px!important;margin:0!important;}

    /* Once a die has lifted, the collection itself is physically unable to scroll until release. */
    #collectionGrid.ttdDragLocked{overflow-y:hidden!important;touch-action:none!important;}
    #collectionGrid .colCard{touch-action:none!important;}
  `;
  document.head.appendChild(style);

  function rebuildVisibleCollection(){
    if(document.getElementById('deckScreen')?.classList.contains('active') && typeof renderCollectionGrid==='function'){
      renderCollectionGrid();
    }
  }

  attachInstanceCardEvents=function attachInstanceCardEventsV11(card,key,instId){
    card.draggable=false;
    card.addEventListener('dragstart',ev=>ev.preventDefault());
    card.addEventListener('contextmenu',ev=>ev.preventDefault());
    card.addEventListener('pointerdown',ev=>{
      if(ev.isPrimary===false)return;
      ev.preventDefault();

      const scrollHost=card.closest('.scrollY')||document.getElementById('collectionGrid');
      const startX=ev.clientX,startY=ev.clientY,startScroll=scrollHost?.scrollTop||0;
      const dragState={
        key,instId,active:false,moved:false,cancelled:false,detailFired:false,lifted:false,scrolling:false,
        startX,startY,lastX:startX,lastY:startY,lastDist:0,
        ghostEl:null,srcCard:card,spinnerEl:null,rafId:null,startTime:performance.now(),pointerId:ev.pointerId,
      };
      instDrag=dragState;
      try{card.setPointerCapture(ev.pointerId);}catch(_){}

      const spinner=createHoldSpinner();
      card.appendChild(spinner);
      dragState.spinnerEl=spinner;
      const fillEl=spinner.querySelector('.spinnerFill');

      const clearHoldUi=()=>{
        if(dragState.rafId)cancelAnimationFrame(dragState.rafId);
        dragState.rafId=null;
        if(dragState.spinnerEl?.parentElement)dragState.spinnerEl.remove();
        card.classList.remove('lifting');
        scrollHost?.classList.remove('ttdManualScrolling');
      };
      const unlockCollection=()=>scrollHost?.classList.remove('ttdDragLocked');
      const finishListeners=()=>{
        card.removeEventListener('pointermove',onMove);
        card.removeEventListener('pointerup',onUp);
        card.removeEventListener('pointercancel',onCancel);
        card.removeEventListener('lostpointercapture',onLost);
        try{if(card.hasPointerCapture?.(ev.pointerId))card.releasePointerCapture(ev.pointerId);}catch(_){}
      };
      const beginDrag=()=>{
        if(dragState.active||dragState.scrolling||dragState.detailFired)return;
        dragState.lifted=true;
        dragState.moved=true;
        clearHoldUi();
        scrollHost?.classList.add('ttdDragLocked');
        beginInstDrag(card,key,dragState.lastX,dragState.lastY);
      };

      const tick=()=>{
        if(instDrag!==dragState||dragState.cancelled||dragState.active||dragState.detailFired||dragState.scrolling)return;
        const elapsed=performance.now()-dragState.startTime;
        const progress=Math.min(1,elapsed/INFO_MS);
        if(fillEl)fillEl.style.strokeDashoffset=(SPINNER_CIRC*(1-progress)).toFixed(2);

        if(elapsed>=LIFT_MS&&!dragState.lifted){
          dragState.lifted=true;
          card.classList.add('lifting');
          if(navigator.vibrate)navigator.vibrate(14);
          // If the player already started moving slightly while waiting for the lift, transition
          // directly into the drag at the instant the hold activates instead of letting that
          // movement become an accidental collection scroll.
          if(dragState.lastDist>MOVE_THRESHOLD){beginDrag();return;}
        }

        if(progress>=1){
          dragState.detailFired=true;
          clearHoldUi();finishListeners();unlockCollection();
          instDrag=null;window.__dragKey=null;
          showDieDetail(key,{collectionInstId:instId});
          return;
        }
        dragState.rafId=requestAnimationFrame(tick);
      };

      const onMove=mv=>{
        if(instDrag!==dragState||dragState.cancelled||dragState.detailFired)return;
        if(mv.pointerId!==dragState.pointerId)return;
        mv.preventDefault();

        const dx=mv.clientX-startX,dy=mv.clientY-startY,dist=Math.hypot(dx,dy);
        const elapsed=performance.now()-dragState.startTime;
        dragState.lastX=mv.clientX;dragState.lastY=mv.clientY;dragState.lastDist=dist;

        if(dragState.scrolling){if(scrollHost)scrollHost.scrollTop=startScroll-dy;return;}
        if(dragState.active){moveInstGhost(mv.clientX,mv.clientY);return;}
        if(dist<=MOVE_THRESHOLD)return;

        if(dragState.lifted||elapsed>=LIFT_MS){
          beginDrag();
          if(dragState.active)moveInstGhost(mv.clientX,mv.clientY);
          return;
        }

        // Do not interpret tiny early vertical movement as a scroll. A scroll must now be a clear
        // swipe: either fast and vertical, or large enough to be unmistakable. This gives the
        // player's finger a generous pre-lift grace zone while still allowing normal quick swipes.
        const absX=Math.abs(dx),absY=Math.abs(dy);
        const mostlyVertical=absY>absX*1.18;
        const decisiveScroll=mostlyVertical&&(
          (elapsed<=FAST_SCROLL_MS&&absY>=FAST_SCROLL_PX) || absY>=DELIBERATE_SCROLL_PX
        );
        if(!decisiveScroll)return;

        dragState.scrolling=true;dragState.moved=true;
        clearHoldUi();
        scrollHost?.classList.add('ttdManualScrolling');
        if(scrollHost)scrollHost.scrollTop=startScroll-dy;
      };

      const onUp=up=>{
        if(up.pointerId!==dragState.pointerId)return;
        finishListeners();clearHoldUi();window.__dragKey=null;
        document.querySelectorAll('.dropHover,.mergeHover').forEach(el=>el.classList.remove('dropHover','mergeHover'));
        if(instDrag===dragState&&dragState.active)endInstDrag(up.clientX,up.clientY);
        else if(instDrag===dragState&&!dragState.cancelled&&!dragState.scrolling&&!dragState.moved&&!dragState.detailFired&&!dragState.lifted)quickEquip(key,instId);
        unlockCollection();
        if(instDrag===dragState)instDrag=null;
      };
      const onCancel=()=>{
        finishListeners();clearHoldUi();
        if(dragState.active){card.classList.remove('dragging');dragState.ghostEl?.remove();}
        window.__dragKey=null;
        unlockCollection();
        document.querySelectorAll('.dropHover,.mergeHover').forEach(el=>el.classList.remove('dropHover','mergeHover'));
        if(instDrag===dragState)instDrag=null;
      };
      const onLost=()=>{if(instDrag===dragState)onCancel();};

      card.addEventListener('pointermove',onMove,{passive:false});
      card.addEventListener('pointerup',onUp);
      card.addEventListener('pointercancel',onCancel);
      card.addEventListener('lostpointercapture',onLost);
      dragState.rafId=requestAnimationFrame(tick);
    },{passive:false});
  };

  rebuildVisibleCollection();
})();