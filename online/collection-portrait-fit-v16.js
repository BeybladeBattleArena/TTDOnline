(()=>{
  'use strict';
  if(window.__TTD_COLLECTION_PANEL_AUTHORITY_V18)return;
  window.__TTD_COLLECTION_PANEL_AUTHORITY_V18=true;

  const STYLE_ID='ttd-collection-panel-authority-v18';
  const installStyle=()=>{
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent=`
        #deckScreen.active{
          display:grid!important;
          grid-template-rows:auto auto auto minmax(0,1fr)!important;
          height:100%!important;max-height:100%!important;min-height:0!important;
          overflow:hidden!important;padding-bottom:0!important;
        }
        #deckScreen .topbar{padding-top:6px!important;padding-bottom:6px!important;}
        #deckScreen .deckTabs{padding-top:4px!important;}
        #deckScreen .deckTab{padding-top:5px!important;padding-bottom:5px!important;}
        #deckScreen .deckSlots{padding:6px 9px!important;gap:6px!important;}
        #deckScreen .deckSlot{width:44px!important;height:44px!important;}

        #ttdCollectionPanel{
          grid-row:4!important;min-height:0!important;height:100%!important;
          display:grid!important;grid-template-rows:auto minmax(0,1fr) auto!important;
          overflow:hidden!important;background:var(--ink-950)!important;
          border-top:1px solid var(--ink-700)!important;
        }
        #ttdCollectionPanel .deckTools{
          grid-row:1!important;min-height:0!important;margin:0!important;
          padding:6px 9px!important;gap:4px!important;flex-shrink:0!important;
          border-bottom:1px solid var(--ink-700)!important;background:var(--ink-900)!important;
        }
        #ttdCollectionPanel .deckSearch{padding:6px 8px!important;}
        #ttdCollectionPanel .deckToolSelect,#ttdCollectionPanel .deckToolBtn{padding-top:6px!important;padding-bottom:6px!important;}

        #collectionViewport{
          grid-row:2!important;min-height:0!important;height:auto!important;overflow:hidden!important;
          display:grid!important;grid-template-columns:minmax(0,1fr) 30px!important;
          gap:6px!important;padding:6px 8px 6px 8px!important;align-items:stretch!important;
          background:var(--ink-950)!important;
        }
        #collectionGrid{
          width:100%!important;height:100%!important;min-height:0!important;
          overflow:hidden!important;overscroll-behavior:none!important;touch-action:none!important;
          padding:0!important;display:grid!important;
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
          grid-auto-rows:80px!important;gap:6px!important;
          justify-content:stretch!important;align-content:start!important;scrollbar-width:none!important;
        }
        #collectionGrid::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}
        #collectionGrid.ttdDiePointerActive,#collectionGrid.ttdManualScrolling{overflow:hidden!important;touch-action:none!important;}
        #collectionGrid .colCard{
          width:100%!important;height:80px!important;min-width:0!important;min-height:80px!important;
          box-sizing:border-box!important;padding:7px 3px 5px!important;
          overflow:visible!important;touch-action:none!important;
        }
        #collectionGrid .colCard .glyphWrap{width:30px!important;height:30px!important;flex:0 0 30px!important;}
        #collectionGrid .colCard .cname{font-size:8.2px!important;line-height:1.15!important;margin-top:3px!important;}
        #collectionGrid .colCard .ccls{font-size:7.8px!important;line-height:1.1!important;margin-top:1px!important;}
        #collectionGrid .favBtn{width:23px!important;height:23px!important;font-size:15px!important;top:-6px!important;right:-6px!important;}

        #collectionScrollRail{
          position:relative!important;display:block!important;width:30px!important;height:100%!important;
          min-height:0!important;padding:4px!important;border:1px solid var(--ink-700)!important;
          border-radius:9px!important;visibility:visible!important;opacity:1!important;
          background:linear-gradient(180deg,var(--ink-900),var(--ink-850))!important;
        }
        #collectionScrollSlider{
          position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;
          pointer-events:none!important;margin:0!important;
        }
        #ttdCollectionVisibleTrack{
          position:absolute!important;inset:6px 8px!important;border-radius:999px!important;
          background:rgba(151,160,189,.30)!important;box-shadow:inset 0 0 0 1px rgba(151,160,189,.28)!important;
          touch-action:none!important;pointer-events:auto!important;
        }
        #ttdCollectionVisibleThumb{
          position:absolute!important;left:1px!important;right:1px!important;top:0!important;min-height:32px!important;
          border-radius:999px!important;background:linear-gradient(180deg,var(--gold-glow),var(--gold))!important;
          box-shadow:0 1px 5px rgba(0,0,0,.45),0 0 8px rgba(217,178,106,.28)!important;
          touch-action:none!important;
        }
        #collectionScrollRail.ttdNoScroll #ttdCollectionVisibleThumb{opacity:.28!important;}

        #ttdCollectionPanel #deckFooter{
          grid-row:3!important;display:block!important;position:relative!important;
          left:auto!important;right:auto!important;bottom:auto!important;z-index:40!important;
          margin:0!important;flex-shrink:0!important;
          padding:7px 10px calc(7px + env(safe-area-inset-bottom))!important;
          visibility:visible!important;background:var(--ink-900)!important;
          border-top:1px solid var(--ink-700)!important;box-shadow:none!important;
        }
        #ttdCollectionPanel #saveDeckBtn{
          display:block!important;width:100%!important;min-height:40px!important;padding:9px 10px!important;
          visibility:visible!important;margin:0!important;
        }

        @media (max-width:360px){
          #collectionViewport{grid-template-columns:minmax(0,1fr) 28px!important;gap:5px!important;padding-left:6px!important;padding-right:6px!important;}
          #collectionGrid{grid-auto-rows:74px!important;gap:5px!important;}
          #collectionGrid .colCard{height:74px!important;min-height:74px!important;padding:6px 2px 4px!important;}
          #collectionGrid .colCard .glyphWrap{width:27px!important;height:27px!important;flex-basis:27px!important;}
          #collectionGrid .colCard .cname{font-size:7.7px!important;}
          #collectionGrid .colCard .ccls{font-size:7.3px!important;}
          #collectionScrollRail{width:28px!important;}
        }
        @media (max-height:650px) and (orientation:portrait){
          #deckScreen .topbar{padding-top:4px!important;padding-bottom:4px!important;}
          #deckScreen .deckSlots{padding:4px 8px!important;}
          #deckScreen .deckSlot{width:40px!important;height:40px!important;}
          #ttdCollectionPanel .deckTools{padding:4px 8px!important;gap:3px!important;}
          #ttdCollectionPanel .deckSearch{padding:5px 7px!important;}
          #ttdCollectionPanel .deckToolSelect,#ttdCollectionPanel .deckToolBtn{padding-top:5px!important;padding-bottom:5px!important;}
          #collectionViewport{padding-top:4px!important;padding-bottom:4px!important;}
          #collectionGrid{grid-auto-rows:72px!important;gap:5px!important;}
          #collectionGrid .colCard{height:72px!important;min-height:72px!important;padding-top:5px!important;}
          #collectionGrid .colCard .glyphWrap{width:26px!important;height:26px!important;flex-basis:26px!important;}
          #ttdCollectionPanel #deckFooter{padding-top:5px!important;padding-bottom:calc(5px + env(safe-area-inset-bottom))!important;}
          #ttdCollectionPanel #saveDeckBtn{min-height:36px!important;padding:7px!important;}
        }
      `;
      document.head.appendChild(style);
    }else{
      document.head.appendChild(style);
    }
  };

  const installGestureAuthority=(grid)=>{
    if(window.__TTD_COLLECTION_GESTURE_AUTHORITY_V18)return;
    if(typeof attachInstanceCardEvents==='undefined'||typeof beginInstDrag!=='function'||typeof moveInstGhost!=='function'||typeof endInstDrag!=='function')return;
    window.__TTD_COLLECTION_GESTURE_AUTHORITY_V18=true;
    const LIFT_MS=360;
    const INFO_MS=1100;
    const MOVE_THRESHOLD=8;
    const SPINNER_CIRC=81.68;

    attachInstanceCardEvents=function attachInstanceCardEventsV18(card,key,instId){
      card.draggable=false;
      card.addEventListener('dragstart',ev=>ev.preventDefault());
      card.addEventListener('contextmenu',ev=>ev.preventDefault());
      card.addEventListener('pointerdown',ev=>{
        if(ev.isPrimary===false||ev.target.closest?.('.favBtn'))return;
        ev.preventDefault();
        const dragState={
          key,instId,active:false,moved:false,cancelled:false,detailFired:false,lifted:false,
          startX:ev.clientX,startY:ev.clientY,lastX:ev.clientX,lastY:ev.clientY,lastDist:0,
          ghostEl:null,srcCard:card,spinnerEl:null,rafId:null,startTime:performance.now(),pointerId:ev.pointerId,
        };
        instDrag=dragState;
        grid.classList.add('ttdDiePointerActive');
        try{card.setPointerCapture(ev.pointerId);}catch(_){}
        const spinner=createHoldSpinner();
        card.appendChild(spinner);
        dragState.spinnerEl=spinner;
        const fillEl=spinner.querySelector('.spinnerFill');

        const stopHold=()=>{
          if(dragState.rafId)cancelAnimationFrame(dragState.rafId);
          dragState.rafId=null;
          if(dragState.spinnerEl?.parentElement)dragState.spinnerEl.remove();
          dragState.spinnerEl=null;
          card.classList.remove('lifting');
        };
        const removeListeners=()=>{
          card.removeEventListener('pointermove',onMove);
          card.removeEventListener('pointerup',onUp);
          card.removeEventListener('pointercancel',onCancel);
          card.removeEventListener('lostpointercapture',onLost);
          try{if(card.hasPointerCapture?.(dragState.pointerId))card.releasePointerCapture(dragState.pointerId);}catch(_){}
        };
        const clearGestureUi=()=>{
          stopHold();
          grid.classList.remove('ttdDiePointerActive');
          window.__dragKey=null;
          document.querySelectorAll('.dropHover,.mergeHover').forEach(el=>el.classList.remove('dropHover','mergeHover'));
        };
        const begin=()=>{
          if(instDrag!==dragState||dragState.active||dragState.cancelled||dragState.detailFired)return;
          dragState.moved=true;
          stopHold();
          beginInstDrag(card,key,dragState.lastX,dragState.lastY);
        };
        const tick=()=>{
          if(instDrag!==dragState||dragState.cancelled||dragState.active||dragState.detailFired||dragState.moved)return;
          const elapsed=performance.now()-dragState.startTime;
          const progress=Math.min(1,elapsed/INFO_MS);
          if(fillEl)fillEl.style.strokeDashoffset=(SPINNER_CIRC*(1-progress)).toFixed(2);
          if(elapsed>=LIFT_MS&&!dragState.lifted){
            dragState.lifted=true;
            card.classList.add('lifting');
            if(navigator.vibrate)navigator.vibrate(12);
          }
          if(progress>=1){
            dragState.detailFired=true;
            clearGestureUi();
            removeListeners();
            if(instDrag===dragState)instDrag=null;
            showDieDetail(key,{collectionInstId:instId});
            return;
          }
          dragState.rafId=requestAnimationFrame(tick);
        };
        const onMove=mv=>{
          if(instDrag!==dragState||dragState.cancelled||dragState.detailFired||mv.pointerId!==dragState.pointerId)return;
          mv.preventDefault();
          dragState.lastX=mv.clientX;
          dragState.lastY=mv.clientY;
          dragState.lastDist=Math.hypot(mv.clientX-dragState.startX,mv.clientY-dragState.startY);
          if(dragState.active){moveInstGhost(mv.clientX,mv.clientY);return;}
          if(dragState.lastDist>MOVE_THRESHOLD){
            begin();
            if(dragState.active)moveInstGhost(mv.clientX,mv.clientY);
          }
        };
        const onUp=up=>{
          if(up.pointerId!==dragState.pointerId)return;
          removeListeners();
          clearGestureUi();
          if(instDrag===dragState&&dragState.active)endInstDrag(up.clientX,up.clientY);
          else if(instDrag===dragState&&!dragState.cancelled&&!dragState.detailFired&&!dragState.moved&&dragState.lastDist<=MOVE_THRESHOLD)quickEquip(key,instId);
          if(instDrag===dragState)instDrag=null;
        };
        const onCancel=()=>{
          dragState.cancelled=true;
          removeListeners();
          clearGestureUi();
          if(dragState.active){card.classList.remove('dragging');dragState.ghostEl?.remove();}
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
  };

  const install=()=>{
    const deckScreen=document.getElementById('deckScreen');
    const tools=deckScreen?.querySelector('.deckTools');
    const grid=document.getElementById('collectionGrid');
    const footer=document.getElementById('deckFooter');
    const save=document.getElementById('saveDeckBtn');
    if(!deckScreen||!tools||!grid||!footer||!save)return false;

    installStyle();
    save.textContent='Save Deck';

    let viewport=document.getElementById('collectionViewport');
    if(!viewport){
      viewport=document.createElement('div');
      viewport.id='collectionViewport';
      grid.parentNode.insertBefore(viewport,grid);
      viewport.appendChild(grid);
    }else if(grid.parentNode!==viewport){
      viewport.appendChild(grid);
    }

    let rail=document.getElementById('collectionScrollRail');
    let slider=document.getElementById('collectionScrollSlider');
    if(!rail){
      rail=document.createElement('div');rail.id='collectionScrollRail';viewport.appendChild(rail);
    }else if(rail.parentNode!==viewport){viewport.appendChild(rail);}
    if(!slider){
      slider=document.createElement('input');
      slider.id='collectionScrollSlider';slider.type='range';slider.min='0';slider.max='1000';slider.step='1';slider.value='0';
      slider.setAttribute('aria-label','Scroll collection');rail.appendChild(slider);
    }

    let panel=document.getElementById('ttdCollectionPanel');
    if(!panel){
      panel=document.createElement('section');
      panel.id='ttdCollectionPanel';
      panel.setAttribute('aria-label','Collection controls and dice');
      tools.parentNode.insertBefore(panel,tools);
    }
    if(tools.parentNode!==panel)panel.appendChild(tools);
    if(viewport.parentNode!==panel)panel.appendChild(viewport);
    if(footer.parentNode!==panel)panel.appendChild(footer);

    let track=document.getElementById('ttdCollectionVisibleTrack');
    let thumb=document.getElementById('ttdCollectionVisibleThumb');
    if(!track){
      track=document.createElement('div');track.id='ttdCollectionVisibleTrack';
      thumb=document.createElement('div');thumb.id='ttdCollectionVisibleThumb';
      track.appendChild(thumb);rail.appendChild(track);
    }

    installGestureAuthority(grid);

    if(grid.dataset.ttdPanelAuthorityBound!=='1'){
      grid.dataset.ttdPanelAuthorityBound='1';
      let sliderOwnsScroll=false;
      let allowedScrollTop=grid.scrollTop||0;
      let syncRaf=0;
      const maxScroll=()=>Math.max(0,grid.scrollHeight-grid.clientHeight);
      const sync=()=>{
        const max=maxScroll();
        allowedScrollTop=Math.max(0,Math.min(max,allowedScrollTop));
        sliderOwnsScroll=true;
        grid.scrollTop=allowedScrollTop;
        slider.value=String(max>0?Math.round((allowedScrollTop/max)*1000):0);
        slider.disabled=max<=0;
        const rect=track.getBoundingClientRect();
        const ratio=grid.scrollHeight>0?Math.min(1,grid.clientHeight/grid.scrollHeight):1;
        const thumbH=Math.max(32,rect.height*ratio);
        const travel=Math.max(0,rect.height-thumbH);
        const pos=max>0?(allowedScrollTop/max)*travel:0;
        thumb.style.height=`${thumbH}px`;
        thumb.style.transform=`translateY(${pos}px)`;
        rail.classList.toggle('ttdNoScroll',max<=0);
        requestAnimationFrame(()=>{sliderOwnsScroll=false;});
      };
      window.__TTD_COLLECTION_PANEL_SYNC=()=>{
        if(syncRaf)cancelAnimationFrame(syncRaf);
        syncRaf=requestAnimationFrame(()=>{syncRaf=0;sync();});
      };
      slider.addEventListener('input',()=>{
        const max=maxScroll();
        sliderOwnsScroll=true;
        allowedScrollTop=max*((Number(slider.value)||0)/1000);
        grid.scrollTop=allowedScrollTop;
        window.__TTD_COLLECTION_PANEL_SYNC();
      });
      const setFromY=clientY=>{
        if(slider.disabled)return;
        const rect=track.getBoundingClientRect();
        const y=Math.max(rect.top,Math.min(rect.bottom,clientY));
        slider.value=String(Math.round((rect.height>0?(y-rect.top)/rect.height:0)*1000));
        slider.dispatchEvent(new Event('input',{bubbles:true}));
      };
      track.addEventListener('pointerdown',event=>{
        if(event.isPrimary===false)return;
        event.preventDefault();
        try{track.setPointerCapture(event.pointerId);}catch(_){}
        setFromY(event.clientY);
        const move=e=>{if(e.pointerId===event.pointerId){e.preventDefault();setFromY(e.clientY);}};
        const end=e=>{
          if(e.pointerId!==event.pointerId)return;
          track.removeEventListener('pointermove',move);track.removeEventListener('pointerup',end);track.removeEventListener('pointercancel',end);
        };
        track.addEventListener('pointermove',move,{passive:false});track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);
      },{passive:false});
      grid.addEventListener('scroll',()=>{
        if(sliderOwnsScroll){allowedScrollTop=grid.scrollTop;return;}
        if(Math.abs(grid.scrollTop-allowedScrollTop)>.5){sliderOwnsScroll=true;grid.scrollTop=allowedScrollTop;requestAnimationFrame(()=>{sliderOwnsScroll=false;});}
      },{passive:true});
      grid.addEventListener('wheel',e=>e.preventDefault(),{passive:false});
      grid.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
      grid.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key))e.preventDefault();});
      new MutationObserver(window.__TTD_COLLECTION_PANEL_SYNC).observe(grid,{childList:true});
      if(window.ResizeObserver){
        const ro=new ResizeObserver(window.__TTD_COLLECTION_PANEL_SYNC);ro.observe(grid);ro.observe(viewport);ro.observe(panel);
      }
      window.addEventListener('resize',window.__TTD_COLLECTION_PANEL_SYNC,{passive:true});
      window.visualViewport?.addEventListener('resize',window.__TTD_COLLECTION_PANEL_SYNC,{passive:true});
    }

    const assertPanel=()=>{
      if(!deckScreen.classList.contains('active'))return;
      const viewportHeight=window.visualViewport?.height||window.innerHeight;
      const saveRect=save.getBoundingClientRect();
      const railRect=rail.getBoundingClientRect();
      if(saveRect.bottom>viewportHeight+1||saveRect.top<0)console.error('Save Deck escaped the Collection panel viewport.',saveRect);
      if(railRect.bottom>viewportHeight+1||railRect.top<0)console.error('Collection scrollbar escaped the Collection panel viewport.',railRect);
      window.__TTD_COLLECTION_PANEL_SYNC?.();
    };
    const queueAssert=()=>requestAnimationFrame(()=>requestAnimationFrame(assertPanel));
    new MutationObserver(queueAssert).observe(deckScreen,{attributes:true,attributeFilter:['class']});
    queueAssert();

    if(deckScreen.classList.contains('active')&&typeof renderCollectionGrid==='function')renderCollectionGrid();
    window.__TTD_COLLECTION_PANEL_SYNC?.();
    return true;
  };

  let attempts=0;
  const retry=()=>{
    attempts+=1;
    if(install())return;
    if(attempts<120)setTimeout(retry,50);
    else console.error('Collection panel authority could not find the deck DOM.');
  };
  setTimeout(retry,0);
})();