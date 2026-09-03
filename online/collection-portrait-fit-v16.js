(() => {
  'use strict';

  const STATE_KEY='__TTD_COLLECTION_PANEL_AUTHORITY_V20';
  const state=window[STATE_KEY]||{installed:false,retryToken:0};
  window[STATE_KEY]=state;

  const STYLE_ID='ttd-collection-panel-authority-v20';

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
        gap:6px!important;padding:8px!important;align-items:stretch!important;
        background:var(--ink-950)!important;
      }
      #collectionGrid{
        width:100%!important;height:100%!important;min-height:0!important;min-width:0!important;
        overflow-y:auto!important;overflow-x:hidden!important;
        overscroll-behavior:contain!important;
        padding:0!important;display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        grid-auto-rows:auto!important;
        gap:12px!important;
        justify-content:stretch!important;align-content:start!important;align-items:stretch!important;
        scrollbar-width:none!important;
      }
      #collectionGrid::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}
      #collectionGrid.ttdDiePointerActive{overscroll-behavior:none!important;}

      /*
       * Collection cards use normal CSS-grid flow. No fixed row/card height means
       * neither a standard die nor an Overdrive die can spill into a neighboring cell.
       */
      #collectionGrid > .colCard,
      #collectionGrid > .colCard.ttdOdCard{
        position:relative!important;
        inset:auto!important;transform:none!important;
        display:flex!important;flex-direction:column!important;align-items:center!important;
        width:100%!important;height:auto!important;
        min-width:0!important;min-height:120px!important;max-height:none!important;
        margin:0!important;box-sizing:border-box!important;
        padding:10px 8px 8px!important;
        overflow:hidden!important;align-self:stretch!important;isolation:isolate!important;
      }
      #collectionGrid > .colCard .glyphWrap{
        width:42px!important;height:42px!important;max-width:42px!important;max-height:42px!important;
        flex:0 0 42px!important;margin:0 auto!important;
      }
      #collectionGrid > .colCard .cname{
        width:100%!important;max-width:100%!important;min-height:0!important;
        font-size:9px!important;line-height:1.2!important;margin-top:5px!important;
        overflow:hidden!important;text-overflow:ellipsis!important;
        display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
        overflow-wrap:anywhere!important;text-align:center!important;
      }
      #collectionGrid > .colCard .ccls{
        width:100%!important;max-width:100%!important;
        font-size:8px!important;line-height:1.15!important;margin-top:2px!important;
        overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;
        text-align:center!important;
      }
      #collectionGrid > .colCard .favBtn{
        width:24px!important;height:24px!important;font-size:15px!important;
        top:4px!important;right:4px!important;
      }
      #collectionGrid > .colCard .clsBadge{top:4px!important;left:4px!important;}
      #collectionGrid > .colCard .deckMark{right:5px!important;bottom:5px!important;}
      #collectionGrid > .colCard .holdSpinner{top:4px!important;right:32px!important;height:24px!important;}
      #collectionGrid > .colCard.ttdOdCard{padding-left:8px!important;padding-right:8px!important;}
      #collectionGrid > .colCard.ttdOdCard .ttdOdCostBadge{
        right:5px!important;bottom:5px!important;max-width:calc(100% - 10px)!important;
      }

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

      @media (max-width:360px){
        #collectionViewport{
          grid-template-columns:minmax(0,1fr) 28px!important;
          gap:5px!important;padding:6px!important;
        }
        #collectionGrid{gap:8px!important;}
        #collectionGrid > .colCard,
        #collectionGrid > .colCard.ttdOdCard{
          min-height:112px!important;padding:9px 6px 7px!important;
        }
        #collectionGrid > .colCard .glyphWrap{
          width:38px!important;height:38px!important;max-width:38px!important;max-height:38px!important;
          flex-basis:38px!important;
        }
        #collectionGrid > .colCard .cname{font-size:8.4px!important;}
        #collectionGrid > .colCard .ccls{font-size:7.6px!important;}
        #collectionScrollRail{width:28px!important;}
      }
      @media (max-height:650px) and (orientation:portrait){
        #deckScreen .topbar{padding-top:4px!important;padding-bottom:4px!important;}
        #deckScreen .deckSlots{padding:4px 8px!important;}
        #deckScreen .deckSlot{width:40px!important;height:40px!important;}
        #ttdCollectionPanel .deckTools{padding:4px 8px!important;gap:3px!important;}
        #ttdCollectionPanel .deckSearch{padding:5px 7px!important;}
        #ttdCollectionPanel .deckToolSelect,#ttdCollectionPanel .deckToolBtn{padding-top:5px!important;padding-bottom:5px!important;}
        #collectionViewport{padding-top:5px!important;padding-bottom:5px!important;}
        #collectionGrid{gap:8px!important;}
        #collectionGrid > .colCard,
        #collectionGrid > .colCard.ttdOdCard{min-height:108px!important;padding-top:8px!important;}
        #collectionGrid > .colCard .glyphWrap{
          width:36px!important;height:36px!important;max-width:36px!important;max-height:36px!important;
          flex-basis:36px!important;
        }
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

    if(grid.dataset.ttdPanelAuthorityBound!=='20'){
      grid.dataset.ttdPanelAuthorityBound='20';
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
