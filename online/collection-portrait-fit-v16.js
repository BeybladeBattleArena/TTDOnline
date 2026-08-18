(()=>{
  'use strict';

  const style=document.createElement('style');
  style.id='ttd-collection-portrait-fit-v16';
  style.textContent=`
    /* Portrait collection contract: keep the original small card scale, reserve a permanent rail,
       and keep Save Deck inside the viewport at all times. */
    #deckScreen.active{
      height:100dvh!important;
      max-height:100dvh!important;
      grid-template-rows:auto auto auto auto minmax(0,1fr) auto!important;
      overflow:hidden!important;
    }
    #deckScreen .topbar{padding-top:8px!important;padding-bottom:8px!important;}
    #deckScreen .deckTabs{padding-top:6px!important;}
    #deckScreen .deckTab{padding-top:6px!important;padding-bottom:6px!important;}
    #deckScreen .deckSlots{padding:8px 10px!important;gap:7px!important;}
    #deckScreen .deckSlot{width:48px!important;height:48px!important;}
    #deckScreen .deckTools{padding:6px 10px!important;gap:5px!important;}
    #deckScreen .deckSearch{padding:6px 8px!important;}
    #deckScreen .deckToolSelect,#deckScreen .deckToolBtn{padding-top:6px!important;padding-bottom:6px!important;}

    #collectionViewport{
      min-height:0!important;
      overflow:hidden!important;
      display:grid!important;
      grid-template-columns:minmax(0,1fr) 30px!important;
      gap:6px!important;
      padding:6px 8px 6px 10px!important;
      align-items:start!important;
    }
    #collectionGrid{
      --ttd-small-card-w:clamp(62px,19.5vw,76px);
      --ttd-small-card-h:clamp(64px,20vw,78px);
      width:100%!important;
      height:calc((var(--ttd-small-card-h) * 3) + 20px)!important;
      max-height:100%!important;
      min-height:0!important;
      overflow:hidden!important;
      padding:0!important;
      display:grid!important;
      grid-template-columns:repeat(3,var(--ttd-small-card-w))!important;
      grid-auto-rows:var(--ttd-small-card-h)!important;
      gap:10px!important;
      justify-content:start!important;
      align-content:start!important;
      touch-action:none!important;
      overscroll-behavior:none!important;
      scrollbar-width:none!important;
    }
    #collectionGrid::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}
    #collectionGrid .colCard{
      width:var(--ttd-small-card-w)!important;
      height:var(--ttd-small-card-h)!important;
      min-width:0!important;
      min-height:0!important;
      padding:8px 4px 6px!important;
      overflow:visible!important;
      touch-action:none!important;
    }
    #collectionGrid .colCard .glyphWrap{width:32px!important;height:32px!important;}
    #collectionGrid .colCard .cname{font-size:8.5px!important;}
    #collectionGrid .colCard .ccls{font-size:8px!important;}

    /* The native vertical range remains the scroll engine, but the visible control is our guaranteed
       mobile rail/thumb. This avoids Android/browser differences in vertical range rendering. */
    #collectionScrollRail{
      position:relative!important;
      display:block!important;
      width:30px!important;
      height:100%!important;
      min-height:0!important;
      align-self:stretch!important;
      padding:4px!important;
      border:1px solid var(--ink-700)!important;
      border-radius:9px!important;
      visibility:visible!important;
      opacity:1!important;
      background:linear-gradient(180deg,var(--ink-900),var(--ink-850))!important;
    }
    #collectionScrollSlider{
      position:absolute!important;
      width:1px!important;
      height:1px!important;
      opacity:0!important;
      pointer-events:none!important;
    }
    #ttdCollectionVisibleTrack{
      position:absolute;
      inset:6px 8px;
      border-radius:999px;
      background:rgba(151,160,189,.22);
      box-shadow:inset 0 0 0 1px rgba(151,160,189,.22);
      touch-action:none;
    }
    #ttdCollectionVisibleThumb{
      position:absolute;
      left:2px;
      right:2px;
      top:0;
      min-height:32px;
      border-radius:999px;
      background:linear-gradient(180deg,var(--gold-glow),var(--gold));
      box-shadow:0 1px 5px rgba(0,0,0,.45),0 0 8px rgba(217,178,106,.28);
      touch-action:none;
    }
    #collectionScrollRail.ttdNoScroll #ttdCollectionVisibleThumb{opacity:.28;}

    #deckFooter{
      display:block!important;
      position:relative!important;
      grid-row:6!important;
      z-index:30!important;
      padding:8px 10px calc(8px + env(safe-area-inset-bottom))!important;
      margin:0!important;
      flex-shrink:0!important;
      visibility:visible!important;
      background:var(--ink-900)!important;
    }
    #saveDeckBtn{
      display:block!important;
      width:100%!important;
      padding:10px!important;
      visibility:visible!important;
    }

    @media (max-height:700px) and (orientation:portrait){
      #deckScreen .topbar{padding-top:6px!important;padding-bottom:6px!important;}
      #deckScreen .deckSlots{padding:6px 8px!important;}
      #deckScreen .deckSlot{width:44px!important;height:44px!important;}
      #deckScreen .deckTools{padding:5px 8px!important;gap:4px!important;}
      #collectionGrid{--ttd-small-card-w:clamp(58px,18.5vw,70px);--ttd-small-card-h:clamp(58px,18.8vw,70px);gap:8px!important;height:calc((var(--ttd-small-card-h) * 3) + 16px)!important;}
      #collectionGrid .colCard{padding:6px 3px 4px!important;}
      #collectionGrid .colCard .glyphWrap{width:28px!important;height:28px!important;}
      #deckFooter{padding-top:6px!important;padding-bottom:calc(6px + env(safe-area-inset-bottom))!important;}
      #saveDeckBtn{padding:9px!important;}
    }
  `;
  document.head.appendChild(style);

  const deckScreen=document.getElementById('deckScreen');
  const grid=document.getElementById('collectionGrid');
  const rail=document.getElementById('collectionScrollRail');
  const slider=document.getElementById('collectionScrollSlider');
  const footer=document.getElementById('deckFooter');
  const save=document.getElementById('saveDeckBtn');

  if(!deckScreen||!grid||!rail||!slider||!footer||!save){
    throw new Error('Portrait collection layout contract could not find required collection controls.');
  }

  let track=document.getElementById('ttdCollectionVisibleTrack');
  let thumb=document.getElementById('ttdCollectionVisibleThumb');
  if(!track){
    track=document.createElement('div');
    track.id='ttdCollectionVisibleTrack';
    thumb=document.createElement('div');
    thumb.id='ttdCollectionVisibleThumb';
    track.appendChild(thumb);
    rail.appendChild(track);
  }

  const syncThumb=()=>{
    const trackRect=track.getBoundingClientRect();
    const maxScroll=Math.max(0,grid.scrollHeight-grid.clientHeight);
    const visibleRatio=grid.scrollHeight>0?Math.min(1,grid.clientHeight/grid.scrollHeight):1;
    const thumbH=Math.max(32,trackRect.height*visibleRatio);
    const travel=Math.max(0,trackRect.height-thumbH);
    const ratio=maxScroll>0?Math.max(0,Math.min(1,grid.scrollTop/maxScroll)):0;
    thumb.style.height=`${thumbH}px`;
    thumb.style.transform=`translateY(${travel*ratio}px)`;
    rail.classList.toggle('ttdNoScroll',maxScroll<=0);
  };

  const setFromClientY=(clientY)=>{
    if(slider.disabled) return;
    const rect=track.getBoundingClientRect();
    const clamped=Math.max(rect.top,Math.min(rect.bottom,clientY));
    const ratio=rect.height>0?(clamped-rect.top)/rect.height:0;
    slider.value=String(Math.round(ratio*1000));
    slider.dispatchEvent(new Event('input',{bubbles:true}));
    syncThumb();
  };

  track.addEventListener('pointerdown',(event)=>{
    if(event.isPrimary===false) return;
    event.preventDefault();
    try{track.setPointerCapture(event.pointerId);}catch(_){}
    setFromClientY(event.clientY);
    const onMove=(move)=>{if(move.pointerId===event.pointerId){move.preventDefault();setFromClientY(move.clientY);}};
    const finish=(up)=>{
      if(up.pointerId!==event.pointerId) return;
      track.removeEventListener('pointermove',onMove);
      track.removeEventListener('pointerup',finish);
      track.removeEventListener('pointercancel',finish);
      try{if(track.hasPointerCapture?.(event.pointerId))track.releasePointerCapture(event.pointerId);}catch(_){}
    };
    track.addEventListener('pointermove',onMove,{passive:false});
    track.addEventListener('pointerup',finish);
    track.addEventListener('pointercancel',finish);
  },{passive:false});

  slider.addEventListener('input',syncThumb);
  grid.addEventListener('scroll',syncThumb,{passive:true});
  new MutationObserver(()=>requestAnimationFrame(syncThumb)).observe(grid,{childList:true});
  if(window.ResizeObserver){
    const ro=new ResizeObserver(()=>requestAnimationFrame(syncThumb));
    ro.observe(grid); ro.observe(rail); ro.observe(deckScreen);
  }

  const assertVisible=()=>{
    if(!deckScreen.classList.contains('active')) return;
    const vv=window.visualViewport;
    const viewportHeight=vv?.height||window.innerHeight;
    const viewportWidth=vv?.width||window.innerWidth;
    const railRect=rail.getBoundingClientRect();
    const saveRect=save.getBoundingClientRect();
    if(railRect.left<0||railRect.right>viewportWidth+1||railRect.bottom>viewportHeight+1){
      console.error('Collection slider escaped the portrait viewport.',railRect);
    }
    if(saveRect.top<0||saveRect.bottom>viewportHeight+1){
      console.error('Save Deck escaped the portrait viewport.',saveRect);
    }
    syncThumb();
  };

  const queueAssert=()=>requestAnimationFrame(()=>requestAnimationFrame(assertVisible));
  window.addEventListener('resize',queueAssert);
  window.visualViewport?.addEventListener('resize',queueAssert);
  new MutationObserver(queueAssert).observe(deckScreen,{attributes:true,attributeFilter:['class']});
  queueAssert();
})();
