(()=>{
  'use strict';
  if(window.__TTD_COLLECTION_PORTRAIT_AUTHORITY_V17)return;
  window.__TTD_COLLECTION_PORTRAIT_AUTHORITY_V17=true;

  const STYLE_ID='ttd-collection-portrait-authority-v17';
  const installStyle=()=>{
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent=`
        #deckScreen.active{
          display:grid!important;
          grid-template-rows:auto auto auto auto minmax(0,1fr) auto!important;
          height:100%!important;max-height:100%!important;min-height:0!important;
          overflow:hidden!important;padding-bottom:0!important;
        }
        #deckScreen .topbar{padding-top:6px!important;padding-bottom:6px!important;}
        #deckScreen .deckTabs{padding-top:4px!important;}
        #deckScreen .deckTab{padding-top:5px!important;padding-bottom:5px!important;}
        #deckScreen .deckSlots{padding:6px 9px!important;gap:6px!important;}
        #deckScreen .deckSlot{width:44px!important;height:44px!important;}
        #deckScreen .deckTools{padding:5px 9px!important;gap:4px!important;}
        #deckScreen .deckSearch{padding:5px 7px!important;}
        #deckScreen .deckToolSelect,#deckScreen .deckToolBtn{padding-top:5px!important;padding-bottom:5px!important;}

        #collectionViewport{
          min-height:0!important;height:100%!important;overflow:hidden!important;
          display:grid!important;grid-template-columns:minmax(0,1fr) 30px!important;
          gap:6px!important;padding:5px 8px 5px 10px!important;align-items:stretch!important;
          background:var(--ink-950)!important;
        }
        #collectionGrid{
          --ttd-card-w:clamp(58px,calc((100vw - 54px)/4),76px);
          --ttd-card-h:min(76px,calc((100% - 16px)/3));
          width:100%!important;height:100%!important;min-height:0!important;
          overflow:hidden!important;overscroll-behavior:none!important;touch-action:none!important;
          padding:0!important;display:grid!important;
          grid-template-columns:repeat(3,var(--ttd-card-w))!important;
          grid-auto-rows:var(--ttd-card-h)!important;gap:8px!important;
          justify-content:start!important;align-content:start!important;scrollbar-width:none!important;
        }
        #collectionGrid::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}
        #collectionGrid.ttdDiePointerActive,#collectionGrid.ttdManualScrolling{overflow:hidden!important;touch-action:none!important;}
        #collectionGrid .colCard{
          width:var(--ttd-card-w)!important;height:var(--ttd-card-h)!important;
          min-width:0!important;min-height:0!important;padding:6px 4px 4px!important;
          overflow:visible!important;touch-action:none!important;
        }
        #collectionGrid .colCard .glyphWrap{width:30px!important;height:30px!important;}
        #collectionGrid .colCard .cname{font-size:8.5px!important;}
        #collectionGrid .colCard .ccls{font-size:8px!important;}

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

        #deckFooter{
          display:block!important;position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;
          grid-row:6!important;z-index:40!important;margin:0!important;flex-shrink:0!important;
          padding:6px 10px calc(6px + env(safe-area-inset-bottom))!important;
          visibility:visible!important;background:var(--ink-900)!important;border-top:1px solid var(--ink-700)!important;
          box-shadow:none!important;
        }
        #saveDeckBtn{
          display:block!important;width:100%!important;min-height:38px!important;padding:8px 10px!important;
          visibility:visible!important;
        }
        @media (max-height:650px) and (orientation:portrait){
          #deckScreen .topbar{padding-top:4px!important;padding-bottom:4px!important;}
          #deckScreen .deckSlots{padding:4px 8px!important;}
          #deckScreen .deckSlot{width:40px!important;height:40px!important;}
          #deckScreen .deckTools{padding:3px 8px!important;gap:3px!important;}
          #collectionViewport{padding-top:3px!important;padding-bottom:3px!important;}
          #collectionGrid{--ttd-card-w:clamp(54px,calc((100vw - 54px)/4),68px);gap:6px!important;}
          #collectionGrid .colCard .glyphWrap{width:26px!important;height:26px!important;}
          #deckFooter{padding-top:4px!important;padding-bottom:calc(4px + env(safe-area-inset-bottom))!important;}
          #saveDeckBtn{min-height:34px!important;padding:6px!important;}
        }
      `;
      document.head.appendChild(style);
    }else{
      document.head.appendChild(style);
    }
  };

  const install=()=>{
    const deckScreen=document.getElementById('deckScreen');
    const grid=document.getElementById('collectionGrid');
    const footer=document.getElementById('deckFooter');
    const save=document.getElementById('saveDeckBtn');
    if(!deckScreen||!grid||!footer||!save)return false;

    installStyle();

    let viewport=document.getElementById('collectionViewport');
    if(!viewport){
      viewport=document.createElement('div');
      viewport.id='collectionViewport';
      grid.parentNode.insertBefore(viewport,grid);
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

    let track=document.getElementById('ttdCollectionVisibleTrack');
    let thumb=document.getElementById('ttdCollectionVisibleThumb');
    if(!track){
      track=document.createElement('div');track.id='ttdCollectionVisibleTrack';
      thumb=document.createElement('div');thumb.id='ttdCollectionVisibleThumb';
      track.appendChild(thumb);rail.appendChild(track);
    }

    if(grid.dataset.ttdPortraitAuthorityBound==='1'){
      requestAnimationFrame(()=>window.__TTD_COLLECTION_PORTRAIT_SYNC?.());
      return true;
    }
    grid.dataset.ttdPortraitAuthorityBound='1';

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
    window.__TTD_COLLECTION_PORTRAIT_SYNC=()=>{
      if(syncRaf)cancelAnimationFrame(syncRaf);
      syncRaf=requestAnimationFrame(()=>{syncRaf=0;sync();});
    };

    slider.addEventListener('input',()=>{
      const max=maxScroll();
      sliderOwnsScroll=true;
      allowedScrollTop=max*((Number(slider.value)||0)/1000);
      grid.scrollTop=allowedScrollTop;
      window.__TTD_COLLECTION_PORTRAIT_SYNC();
    });

    const setFromY=(clientY)=>{
      if(slider.disabled)return;
      const rect=track.getBoundingClientRect();
      const y=Math.max(rect.top,Math.min(rect.bottom,clientY));
      slider.value=String(Math.round((rect.height>0?(y-rect.top)/rect.height:0)*1000));
      slider.dispatchEvent(new Event('input',{bubbles:true}));
    };
    track.addEventListener('pointerdown',(event)=>{
      if(event.isPrimary===false)return;
      event.preventDefault();
      try{track.setPointerCapture(event.pointerId);}catch(_){}
      setFromY(event.clientY);
      const move=(e)=>{if(e.pointerId===event.pointerId){e.preventDefault();setFromY(e.clientY);}};
      const end=(e)=>{
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

    new MutationObserver(window.__TTD_COLLECTION_PORTRAIT_SYNC).observe(grid,{childList:true});
    if(window.ResizeObserver){
      const ro=new ResizeObserver(window.__TTD_COLLECTION_PORTRAIT_SYNC);ro.observe(grid);ro.observe(viewport);ro.observe(deckScreen);
    }
    window.addEventListener('resize',window.__TTD_COLLECTION_PORTRAIT_SYNC,{passive:true});
    window.visualViewport?.addEventListener('resize',window.__TTD_COLLECTION_PORTRAIT_SYNC,{passive:true});
    window.__TTD_COLLECTION_PORTRAIT_SYNC();
    return true;
  };

  let attempts=0;
  const retry=()=>{
    attempts+=1;
    if(install())return;
    if(attempts<120)setTimeout(retry,50);
    else console.error('Collection portrait authority could not find the deck DOM.');
  };
  setTimeout(retry,0);
})();
