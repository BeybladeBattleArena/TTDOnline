(() => {
  'use strict';
  if (window.__TTD_COLLECTION_LAYOUT_V22) {
    window.__TTD_COLLECTION_LAYOUT_V22.enforce?.();
    return;
  }

  const STYLE_ID = 'ttd-collection-layout-v22-style';
  const BOUND = '22';
  const state = { grid: null, panel: null, viewport: null, rail: null, track: null, thumb: null, raf: 0 };

  function cardHeight() {
    if (window.innerHeight <= 650 && window.innerHeight > window.innerWidth) return 112;
    if (window.innerWidth <= 360) return 116;
    return 124;
  }
  function gapSize() {
    return (window.innerWidth <= 360 || (window.innerHeight <= 650 && window.innerHeight > window.innerWidth)) ? 8 : 12;
  }
  function important(el, prop, value) {
    if (!el) return;
    if (el.style.getPropertyValue(prop) === value && el.style.getPropertyPriority(prop) === 'important') return;
    el.style.setProperty(prop, value, 'important');
  }

  function installStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `
      #deckScreen.active{display:grid!important;grid-template-rows:auto auto auto minmax(0,1fr)!important;height:100%!important;max-height:100%!important;min-height:0!important;overflow:hidden!important;padding-bottom:0!important;}
      #deckScreen .topbar{padding-top:6px!important;padding-bottom:6px!important;}
      #deckScreen .deckTabs{padding-top:4px!important;}
      #deckScreen .deckTab{padding-top:5px!important;padding-bottom:5px!important;}
      #deckScreen .deckSlots{padding:6px 9px!important;gap:6px!important;}
      #deckScreen .deckSlot{width:44px!important;height:44px!important;}
      #ttdCollectionPanel{grid-row:4!important;min-height:0!important;height:100%!important;display:grid!important;grid-template-rows:auto minmax(0,1fr) auto!important;overflow:hidden!important;background:var(--ink-950)!important;border-top:1px solid var(--ink-700)!important;}
      #ttdCollectionPanel .deckTools{grid-row:1!important;min-height:0!important;margin:0!important;padding:6px 9px!important;gap:4px!important;flex-shrink:0!important;border-bottom:1px solid var(--ink-700)!important;background:var(--ink-900)!important;}
      #ttdCollectionPanel .deckSearch{padding:6px 8px!important;}
      #ttdCollectionPanel .deckToolSelect,#ttdCollectionPanel .deckToolBtn{padding-top:6px!important;padding-bottom:6px!important;}
      #collectionViewport{grid-row:2!important;min-height:0!important;height:auto!important;overflow:hidden!important;display:grid!important;grid-template-columns:minmax(0,1fr) 30px!important;gap:6px!important;padding:8px!important;align-items:stretch!important;background:var(--ink-950)!important;}
      #collectionGrid{width:100%!important;height:100%!important;min-height:0!important;min-width:0!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain!important;padding:0!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-auto-flow:row!important;grid-auto-rows:124px!important;gap:12px!important;justify-content:stretch!important;align-content:start!important;align-items:stretch!important;scrollbar-width:none!important;}
      #collectionGrid::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;}
      #collectionGrid.ttdDiePointerActive{overscroll-behavior:none!important;}
      #collectionGrid>.colCard{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;width:100%!important;height:124px!important;min-width:0!important;min-height:124px!important;max-height:124px!important;margin:0!important;box-sizing:border-box!important;padding:10px 8px 8px!important;overflow:hidden!important;align-self:stretch!important;isolation:isolate!important;}
      #collectionGrid>.colCard .glyphWrap{width:42px!important;height:42px!important;max-width:42px!important;max-height:42px!important;flex:0 0 42px!important;margin:0 auto!important;}
      #collectionGrid>.colCard .cname{width:100%!important;max-width:100%!important;min-height:0!important;font-size:9px!important;line-height:1.2!important;margin-top:5px!important;overflow:hidden!important;text-overflow:ellipsis!important;display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow-wrap:anywhere!important;text-align:center!important;}
      #collectionGrid>.colCard .ccls{width:100%!important;max-width:100%!important;font-size:8px!important;line-height:1.15!important;margin-top:2px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;text-align:center!important;}
      #collectionGrid>.colCard .favBtn{width:24px!important;height:24px!important;font-size:15px!important;top:4px!important;right:4px!important;}
      #collectionGrid>.colCard .clsBadge{top:4px!important;left:4px!important;}
      #collectionGrid>.colCard .deckMark{right:5px!important;bottom:5px!important;}
      #collectionGrid>.colCard .holdSpinner{top:4px!important;right:32px!important;height:24px!important;}
      #collectionGrid>.colCard.ttdOdCard .ttdOdCostBadge{right:5px!important;bottom:5px!important;max-width:calc(100% - 10px)!important;}
      #collectionScrollRail{position:relative!important;display:block!important;width:30px!important;height:100%!important;min-height:0!important;padding:4px!important;border:1px solid var(--ink-700)!important;border-radius:9px!important;visibility:visible!important;opacity:1!important;background:linear-gradient(180deg,var(--ink-900),var(--ink-850))!important;touch-action:none!important;}
      #ttdCollectionVisibleTrack{position:absolute!important;inset:6px 8px!important;border-radius:999px!important;background:rgba(151,160,189,.30)!important;box-shadow:inset 0 0 0 1px rgba(151,160,189,.28)!important;touch-action:none!important;}
      #ttdCollectionVisibleThumb{position:absolute!important;left:1px!important;right:1px!important;top:0!important;min-height:32px!important;border-radius:999px!important;background:linear-gradient(180deg,var(--gold-glow),var(--gold))!important;box-shadow:0 1px 5px rgba(0,0,0,.45),0 0 8px rgba(217,178,106,.28)!important;pointer-events:none!important;}
      #collectionScrollRail.ttdNoScroll #ttdCollectionVisibleThumb{opacity:.28!important;}
      #ttdCollectionPanel #deckFooter{grid-row:3!important;display:block!important;position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;z-index:40!important;margin:0!important;flex-shrink:0!important;padding:7px 10px calc(7px + env(safe-area-inset-bottom))!important;visibility:visible!important;background:var(--ink-900)!important;border-top:1px solid var(--ink-700)!important;box-shadow:none!important;}
      #ttdCollectionPanel #saveDeckBtn{display:block!important;width:100%!important;min-height:40px!important;padding:9px 10px!important;visibility:visible!important;margin:0!important;}
      @media(max-width:360px){#collectionViewport{grid-template-columns:minmax(0,1fr) 28px!important;gap:5px!important;padding:6px!important;}#collectionGrid{grid-auto-rows:116px!important;gap:8px!important;}#collectionGrid>.colCard{height:116px!important;min-height:116px!important;max-height:116px!important;padding:9px 6px 7px!important;}#collectionGrid>.colCard .glyphWrap{width:38px!important;height:38px!important;max-width:38px!important;max-height:38px!important;flex-basis:38px!important;}#collectionScrollRail{width:28px!important;}}
      @media(max-height:650px) and (orientation:portrait){#deckScreen .topbar{padding-top:4px!important;padding-bottom:4px!important;}#deckScreen .deckSlots{padding:4px 8px!important;}#deckScreen .deckSlot{width:40px!important;height:40px!important;}#ttdCollectionPanel .deckTools{padding:4px 8px!important;gap:3px!important;}#collectionViewport{padding-top:5px!important;padding-bottom:5px!important;}#collectionGrid{grid-auto-rows:112px!important;gap:8px!important;}#collectionGrid>.colCard{height:112px!important;min-height:112px!important;max-height:112px!important;padding-top:8px!important;}#collectionGrid>.colCard .glyphWrap{width:36px!important;height:36px!important;max-width:36px!important;max-height:36px!important;flex-basis:36px!important;}}
    `;
  }

  function enforceLayout() {
    const grid = document.getElementById('collectionGrid');
    if (!grid) return;
    const h = cardHeight();
    const gap = gapSize();
    important(grid, 'display', 'grid');
    important(grid, 'grid-template-columns', 'repeat(2,minmax(0,1fr))');
    important(grid, 'grid-auto-flow', 'row');
    important(grid, 'grid-auto-rows', `${h}px`);
    important(grid, 'gap', `${gap}px`);
    important(grid, 'align-content', 'start');
    important(grid, 'align-items', 'stretch');
    for (const card of grid.querySelectorAll(':scope > .colCard')) {
      important(card, 'position', 'relative');
      important(card, 'width', '100%');
      important(card, 'height', `${h}px`);
      important(card, 'min-height', `${h}px`);
      important(card, 'max-height', `${h}px`);
      important(card, 'margin', '0');
      important(card, 'box-sizing', 'border-box');
      important(card, 'overflow', 'hidden');
      important(card, 'align-self', 'stretch');
    }
    syncScroll();
  }
  function queueEnforce() {
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => { state.raf = 0; enforceLayout(); });
  }

  function syncScroll() {
    const { grid, track, thumb, rail } = state;
    if (!grid || !track || !thumb || !rail) return;
    const max = Math.max(0, grid.scrollHeight - grid.clientHeight);
    const rect = track.getBoundingClientRect();
    const ratio = grid.scrollHeight > 0 ? Math.min(1, grid.clientHeight / grid.scrollHeight) : 1;
    const thumbH = Math.max(32, rect.height * ratio);
    const travel = Math.max(0, rect.height - thumbH);
    const pos = max > 0 ? (grid.scrollTop / max) * travel : 0;
    thumb.style.height = `${thumbH}px`;
    thumb.style.transform = `translateY(${pos}px)`;
    rail.classList.toggle('ttdNoScroll', max <= 0);
  }

  function install() {
    const deckScreen = document.getElementById('deckScreen');
    const tools = document.getElementById('deckTools') || deckScreen?.querySelector('.deckTools');
    const grid = document.getElementById('collectionGrid');
    const footer = document.getElementById('deckFooter');
    const save = document.getElementById('saveDeckBtn');
    if (!deckScreen || !tools || !grid || !footer || !save) return false;

    installStyle();
    for (const staleId of ['ttd-collection-panel-authority-v19','ttd-collection-panel-authority-v20','ttd-collection-panel-authority-v21']) document.getElementById(staleId)?.remove();
    save.textContent = 'Save Deck';

    let viewport = document.getElementById('collectionViewport');
    if (!viewport) {
      viewport = document.createElement('div');
      viewport.id = 'collectionViewport';
      grid.parentNode.insertBefore(viewport, grid);
      viewport.appendChild(grid);
    } else if (grid.parentNode !== viewport) viewport.appendChild(grid);

    let rail = document.getElementById('collectionScrollRail');
    if (!rail) {
      rail = document.createElement('div'); rail.id = 'collectionScrollRail'; viewport.appendChild(rail);
    } else if (rail.parentNode !== viewport) viewport.appendChild(rail);

    let track = document.getElementById('ttdCollectionVisibleTrack');
    let thumb = document.getElementById('ttdCollectionVisibleThumb');
    if (!track) {
      track = document.createElement('div'); track.id = 'ttdCollectionVisibleTrack';
      thumb = document.createElement('div'); thumb.id = 'ttdCollectionVisibleThumb';
      track.appendChild(thumb); rail.appendChild(track);
    } else if (!thumb) {
      thumb = document.createElement('div'); thumb.id = 'ttdCollectionVisibleThumb'; track.appendChild(thumb);
    }

    let panel = document.getElementById('ttdCollectionPanel');
    if (!panel) {
      panel = document.createElement('section'); panel.id = 'ttdCollectionPanel'; panel.setAttribute('aria-label','Collection controls and dice');
      tools.parentNode.insertBefore(panel, tools);
    }
    if (tools.parentNode !== panel) panel.appendChild(tools);
    if (viewport.parentNode !== panel) panel.appendChild(viewport);
    if (footer.parentNode !== panel) panel.appendChild(footer);

    Object.assign(state, { grid, panel, viewport, rail, track, thumb });

    if (grid.dataset.ttdCollectionLayoutBound !== BOUND) {
      grid.dataset.ttdCollectionLayoutBound = BOUND;
      grid.addEventListener('scroll', syncScroll, { passive: true });
      new MutationObserver(queueEnforce).observe(grid, { childList: true, subtree: false });
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(queueEnforce); ro.observe(grid); ro.observe(viewport); ro.observe(panel);
      }
      const setFromY = (clientY) => {
        const max = Math.max(0, grid.scrollHeight - grid.clientHeight); if (max <= 0) return;
        const rect = track.getBoundingClientRect(); const thumbRect = thumb.getBoundingClientRect();
        const thumbH = Math.max(32, thumbRect.height || 32); const travel = Math.max(1, rect.height - thumbH);
        const y = Math.max(0, Math.min(travel, clientY - rect.top - thumbH / 2)); grid.scrollTop = max * (y / travel);
      };
      track.addEventListener('pointerdown', (event) => {
        if (event.isPrimary === false) return; event.preventDefault();
        try { track.setPointerCapture(event.pointerId); } catch (_) {}
        setFromY(event.clientY);
        const move = (e) => { if (e.pointerId === event.pointerId) { e.preventDefault(); setFromY(e.clientY); } };
        const end = (e) => { if (e.pointerId !== event.pointerId) return; track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', end); track.removeEventListener('pointercancel', end); };
        track.addEventListener('pointermove', move, { passive: false }); track.addEventListener('pointerup', end); track.addEventListener('pointercancel', end);
      }, { passive: false });
      window.addEventListener('resize', queueEnforce, { passive: true });
      window.visualViewport?.addEventListener('resize', queueEnforce, { passive: true });
    }

    enforceLayout();
    return true;
  }

  window.__TTD_COLLECTION_LAYOUT_V22 = Object.freeze({ enforce: queueEnforce });
  let attempts = 0;
  const retry = () => { attempts += 1; if (install()) return; if (attempts < 240) setTimeout(retry, 25); else console.error('Collection layout v22 could not find the deck DOM.'); };
  retry();
})();
