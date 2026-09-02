(() => {
  'use strict';

  const STATE_KEY='__TTD_COLLECTION_PANEL_AUTHORITY_V19';
  const state=window[STATE_KEY]||{installed:false,retryToken:0};
  window[STATE_KEY]=state;

  const STYLE_ID='ttd-collection-panel-authority-v19';

  function installStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      document.head.appendChild(style);
    }
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
      #ttdCollectionPanel .deckToolSelect,
      #ttdCollectionPanel .deckToolBtn{padding-top:6px!important;padding-bottom:6px!important;}

      #collectionViewport{
        grid-row:2!important;min-height:0!important;height:auto!important;overflow:hidden!important;
        display:grid!important;grid-template-columns:minmax(0,1fr) 30px!important;
        gap:6px!important;padding:6px 8px!important;align-items:stretch!important;
        background:var(--ink-950)!important;
      }
      #collectionGrid{
        width:100%!important;height:100%!important;min-height:0!important;
        overflow-y:auto!important;overflow-x:hidden!important;
        overscroll-behavior:contain!important;
        padding:0!important;display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr))!important;
        grid-auto-rows:94px!important;
        row-gap:9px!important;column-gap:7px!important;
        justify-content:stretch!important;align-content:start!important;align-items:stretch!important;
        scrollbar-width:none!important;
      }
      #collectionGrid::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}
      #collectionGrid.ttdDiePointerActive{overscroll-behavior:none!important;}

      /* One grid row owns exactly one card. This applies equally to normal and Overdrive cards. */
      #collectionGrid > .colCard,
      #collectionGrid > .colCard.ttdOdCard{
        position:relative!important;
        width:100%!important;height:94px!important;
        min-width:0!important;min-height:94px!important;max-height:94px!important;
        margin:0!important;box-sizing:border-box!important;
        padding:8px 4px 6px!important;
        overflow:hidden!important;align-self:stretch!important;isolation:isolate!important;
      }
      #collectionGrid > .colCard .glyphWrap{
        width:30px!important;height:30px!important;max-width:30px!important;max-height:30px!important;
        flex:0 0 30px!important;
      }
      #collectionGrid > .colCard .cname{
        max-width:100%!important;min-height:0!important;
        font-size:8.2px!important;line-height:1.15!important;margin-top:3px!important;
        overflow:hidden!important;text-overflow:ellipsis!important;
        display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
      }
      #collectionGrid > .colCard .ccls{
        max-width:100%!important;
        font-size:7.8px!important;line-height:1.1!important;margin-top:1px!important;
        overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
      }
      #collectionGrid > .colCard .favBtn{
        width:23px!important;height:23px!important;font-size:15px!important;
        top:3px!important;right:3px!important;
      }
      #collectionGrid > .colCard .clsBadge{top:3px!important;left:3px!important;}
      #collectionGrid > .colCard .deckMark{right:4px!important;bottom:4px!important;}
      #collectionGrid > .colCard .holdSpinner{top:3px!important;right:29px!important;height:24px!important;}
      #collectionGrid > .colCard.ttdOdCard{padding-left:5px!important;padding-right:5px!important;}
      #collectionGrid > .colCard.ttdOdCard .ttdOdCostBadge{right:3px!important;bottom:3px!important;}

      #collectionScrollRail{
        position:relative!important;display:block!important;width:30px!important;height:100%!important;
        min-height:0!important;padding:4px!important;border:1px solid var(--ink-700)!important;
        border-radius:9px!important;visibility:visible!important;opacity:1!important;
        background:linear-gradient(180deg,var(--ink-900),var(--ink-850))!important;
        touch-action:none!important;
      }
      #ttdCollectionVisibleTrack{
        position:absolute!important;inset:6px 8px!important;border-radius:999px!important;
        background:rgba(151,160,189,.30)!important;
        box-shadow:inset 0 0 0 1px rgba(151,160,189,.28)!important;
        touch-action:none!important;
      }
      #ttdCollectionVisibleThumb{
        position:absolute!important;left:1px!important;right:1px!important;top:0!important;min-height:32px!important;
        border-radius:999px!important;background:linear-gradient(180deg,var(--gold-glow),var(--gold))!important;
        box-shadow:0 1px 5px rgba(0,0,0,.45),0 0 8px rgba(217,178,106,.28)!important;
        pointer-events:none!important;
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

      @media (min-width:700px){
        #collectionGrid{grid-template-columns:repeat(4,minmax(0,1fr))!important;}
      }
      @media (max-width:360px){
        #collectionViewport{grid-template-columns:minmax(0,1fr) 28px!important;gap:5px!important;padding-left:6px!important;padding-right:6px!important;}
        #collectionGrid{grid-auto-rows:90px!important;row-gap:8px!important;column-gap:6px!important;}
        #collectionGrid > .colCard,
        #collectionGrid > .colCard.ttdOdCard{
          height:90px!important;min-height:90px!important;max-height:90px!important;padding:7px 3px 5px!important;
        }
        #collectionGrid > .colCard .glyphWrap{width:28px!important;height:28px!important;max-width:28px!important;max-height:28px!important;flex-basis:28px!important;}
        #collectionGrid > .colCard .cname{font-size:7.8px!important;}
        #collectionGrid > .colCard .ccls{font-size:7.4px!important;}
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
        #collectionGrid{grid-auto-rows:88px!important;row-gap:7px!important;}
        #collectionGrid > .colCard,
        #collectionGrid > .colCard.ttdOdCard{
          height:88px!important;min-height:88px!important;max-height:88px!important;padding-top:6px!important;
        }
        #collectionGrid > .colCard .glyphWrap{width:27px!important;height:27px!important;max-width:27px!important;max-height:27px!important;flex-basis:27px!important;}
        #ttdCollectionPanel #deckFooter{padding-top:5px!important;padding-bottom:calc(5px + env(safe-area-inset-bottom))!important;}
        #ttdCollectionPanel #saveDeckBtn{min-height:36px!important;padding:7px!important;}
      }
    `;
  }

  function install(){
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
    if(!rail){
      rail=document.createElement('div');
      rail.id='collectionScrollRail';
      viewport.appendChild(rail);
    }else if(rail.parentNode!==viewport){
      viewport.appendChild(rail);
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
    }else if(!thumb){
      thumb=document.createElement('div');
      thumb.id='ttdCollectionVisibleThumb';
      track.appendChild(thumb);
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

    const sync=()=>{
      const max=Math.max(0,grid.scrollHeight-grid.clientHeight);
      const rect=track.getBoundingClientRect();
      const ratio=grid.scrollHeight>0?Math.min(1,grid.clientHeight/grid.scrollHeight):1;
      const thumbH=Math.max(32,rect.height*ratio);
      const travel=Math.max(0,rect.height-thumbH);
      const pos=max>0?(grid.scrollTop/max)*travel:0;
      thumb.style.height=`${thumbH}px`;
      thumb.style.transform=`translateY(${pos}px)`;
      rail.classList.toggle('ttdNoScroll',max<=0);
    };
    window.__TTD_COLLECTION_PANEL_SYNC=()=>requestAnimationFrame(sync);

    if(grid.dataset.ttdPanelAuthorityBound!=='19'){
      grid.dataset.ttdPanelAuthorityBound='19';
      grid.addEventListener('scroll',sync,{passive:true});
      const setFromY=(clientY)=>{
        const max=Math.max(0,grid.scrollHeight-grid.clientHeight);
        if(max<=0)return;
        const rect=track.getBoundingClientRect();
        const thumbRect=thumb.getBoundingClientRect();
        const thumbH=Math.max(32,thumbRect.height||32);
        const travel=Math.max(1,rect.height-thumbH);
        const y=Math.max(0,Math.min(travel,clientY-rect.top-thumbH/2));
        grid.scrollTop=max*(y/travel);
      };
      track.addEventListener('pointerdown',(event)=>{
        if(event.isPrimary===false)return;
        event.preventDefault();
        try{track.setPointerCapture(event.pointerId);}catch(_){}
        setFromY(event.clientY);
        const move=(e)=>{if(e.pointerId===event.pointerId){e.preventDefault();setFromY(e.clientY);}};
        const end=(e)=>{
          if(e.pointerId!==event.pointerId)return;
          track.removeEventListener('pointermove',move);
          track.removeEventListener('pointerup',end);
          track.removeEventListener('pointercancel',end);
        };
        track.addEventListener('pointermove',move,{passive:false});
        track.addEventListener('pointerup',end);
        track.addEventListener('pointercancel',end);
      },{passive:false});
      new MutationObserver(sync).observe(grid,{childList:true,subtree:false});
      if(window.ResizeObserver){
        const ro=new ResizeObserver(sync);
        ro.observe(grid);ro.observe(viewport);ro.observe(panel);
      }
      window.addEventListener('resize',sync,{passive:true});
      window.visualViewport?.addEventListener('resize',sync,{passive:true});
    }

    state.installed=true;
    requestAnimationFrame(()=>requestAnimationFrame(sync));
    return true;
  }

  function retry(){
    const token=++state.retryToken;
    let attempts=0;
    const tick=()=>{
      if(token!==state.retryToken)return;
      attempts+=1;
      if(install())return;
      if(attempts<200)setTimeout(tick,25);
      else console.error('Collection panel authority could not find the deck DOM.');
    };
    tick();
  }

  if(state.installed && document.getElementById('ttdCollectionPanel')){
    installStyle();
    window.__TTD_COLLECTION_PANEL_SYNC?.();
  }else{
    retry();
  }
})();
