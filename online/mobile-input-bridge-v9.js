(() => {
  'use strict';

  const ORIGIN = location.origin;
  const MOBILE_MOVE_PX = 9;
  const ASCLEPIUS_HOLD_MS = 260;
  let currentScreenName = 'home';
  let activePointerId = null;
  let visibilityCleanupInstalled = false;

  function post(type, payload={}) {
    window.parent.postMessage({type, ...payload}, ORIGIN);
  }

  function installMobileCss() {
    const style = document.createElement('style');
    style.id = 'ttd-mobile-input-v9';
    style.textContent = `
      .tile,.die,.deckSlot,.colCard,.instGhost,.die-ghost,.holdSpinner,.chargeSpinner {
        -webkit-user-select:none!important; user-select:none!important;
        -webkit-touch-callout:none!important; -webkit-user-drag:none!important;
      }
      .tile,.die,.deckSlot,.instGhost,.die-ghost { touch-action:none!important; }
      img,svg { -webkit-user-drag:none; }
      .die-ghost,.instGhost { pointer-events:none!important; }
    `;
    document.head.appendChild(style);
  }

  function clearTransientDragUi() {
    // If a battle gesture owns pointer capture, cancel it through its own lifecycle first so
    // its dynamic listeners cannot fire later with a cleared global drag object.
    try {
      if (drag && typeof drag.__mobileCancel === 'function') {
        const cancel = drag.__mobileCancel;
        drag.__mobileCancel = null;
        cancel();
      }
    } catch (_) {}
    document.querySelectorAll('.die-ghost,.instGhost,.chargeSpinner,.holdSpinner').forEach((el) => el.remove());
    document.querySelectorAll('.dragging,.drop-ok,.drop-merge,.dropHover,.mergeHover,.lifting').forEach((el) => {
      el.classList.remove('dragging','drop-ok','drop-merge','dropHover','mergeHover','lifting');
    });
    try {
      if (instDrag) teardownHold(instDrag);
    } catch (_) {}
    try { window.__dragKey = null; } catch (_) {}
    try { drag = null; } catch (_) {}
    try { instDrag = null; } catch (_) {}
    activePointerId = null;
  }

  function startAsclepiusCharge(idx, tile, gesture) {
    if (!gesture || gesture.finished || gesture.moved || gesture.chargeStarted) return;
    const die = state.board[idx];
    if (!die || !isAsclepiusReady(die)) return;
    gesture.chargeStarted = true;

    const rect = tile.getBoundingClientRect();
    const spinner = document.createElement('div');
    spinner.className = 'chargeSpinner';
    spinner.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
    spinner.innerHTML = `<svg viewBox="0 0 36 36"><circle class="chargeSpinnerTrack" cx="18" cy="18" r="15"/><circle class="chargeSpinnerFill" cx="18" cy="18" r="15" stroke-dasharray="94.2" stroke-dashoffset="94.2"/></svg>`;
    document.body.appendChild(spinner);
    gesture.chargeSpinner = spinner;
    gesture.chargeStart = performance.now();
    const fill = spinner.querySelector('.chargeSpinnerFill');
    const duration = Math.max(0.05, Number(DICE.asclepius?.special?.chargeTime || 1));

    const tick = () => {
      if (!gesture || gesture.finished || gesture.chargeCancelled) return;
      const progress = Math.min(1, (performance.now() - gesture.chargeStart) / 1000 / duration);
      if (fill) fill.style.strokeDashoffset = (94.2 * (1-progress)).toFixed(2);
      if (progress >= 1) {
        gesture.chargeCompleted = true;
        if (gesture.chargeSpinner) { gesture.chargeSpinner.remove(); gesture.chargeSpinner = null; }
        triggerAsclepiusHeal(idx, tile);
        return;
      }
      gesture.chargeRaf = requestAnimationFrame(tick);
    };
    gesture.chargeRaf = requestAnimationFrame(tick);
  }

  function cancelCharge(gesture) {
    if (!gesture) return;
    gesture.chargeCancelled = true;
    if (gesture.chargeRaf) cancelAnimationFrame(gesture.chargeRaf);
    if (gesture.chargeSpinner) gesture.chargeSpinner.remove();
    gesture.chargeRaf = null;
    gesture.chargeSpinner = null;
  }

  function mobileAttachTileEvents(tile, idx) {
    tile.draggable = false;
    tile.addEventListener('dragstart', (event) => event.preventDefault());
    tile.addEventListener('contextmenu', (event) => event.preventDefault());
    tile.addEventListener('pointerdown', (event) => {
      if (!state.running || !state.board[idx]) return;
      if (event.isPrimary === false || activePointerId !== null) return;
      event.preventDefault();

      activePointerId = event.pointerId;
      try { tile.setPointerCapture(event.pointerId); } catch (_) {}
      const gesture = {
        srcIdx:idx,
        pointerId:event.pointerId,
        startX:event.clientX,
        startY:event.clientY,
        moved:false,
        active:false,
        finished:false,
        chargeStarted:false,
        chargeCancelled:false,
        chargeCompleted:false,
        chargeRaf:null,
        chargeSpinner:null,
        holdTimer:null,
        __mobileCancel:null,
      };
      drag = gesture;

      gesture.holdTimer = setTimeout(() => {
        if (!gesture.finished && !gesture.moved && state.board[idx] && isAsclepiusReady(state.board[idx])) {
          startAsclepiusCharge(idx, tile, gesture);
        }
      }, ASCLEPIUS_HOLD_MS);

      const finish = (upEvent, cancelled=false) => {
        if (gesture.finished) return;
        gesture.finished = true;
        gesture.__mobileCancel = null;
        clearTimeout(gesture.holdTimer);
        cancelCharge(gesture);

        tile.removeEventListener('pointermove', onMove);
        tile.removeEventListener('pointerup', onUp);
        tile.removeEventListener('pointercancel', onCancel);
        tile.removeEventListener('lostpointercapture', onLostCapture);
        try {
          if (tile.hasPointerCapture?.(gesture.pointerId)) tile.releasePointerCapture(gesture.pointerId);
        } catch (_) {}

        if (!cancelled && gesture.active) {
          endDrag(upEvent.clientX, upEvent.clientY);
        } else if (!cancelled && !gesture.moved && !gesture.chargeStarted) {
          tapTile(idx);
        } else if (cancelled && gesture.ghostEl) {
          gesture.ghostEl.remove();
          tileEls.forEach((t) => t.classList.remove('dragging','drop-ok','drop-merge'));
        }

        if (drag === gesture) drag = null;
        activePointerId = null;
      };

      const onMove = (moveEvent) => {
        if (gesture.finished || moveEvent.pointerId !== gesture.pointerId) return;
        moveEvent.preventDefault();
        const moved = Math.hypot(moveEvent.clientX-gesture.startX, moveEvent.clientY-gesture.startY) > MOBILE_MOVE_PX;
        if (moved && !gesture.moved) {
          gesture.moved = true;
          clearTimeout(gesture.holdTimer);
          if (gesture.chargeStarted && !gesture.chargeCompleted) cancelCharge(gesture);
          if (!gesture.active) beginDrag(idx, moveEvent.clientX, moveEvent.clientY);
        }
        if (gesture.active) {
          moveGhost(moveEvent.clientX, moveEvent.clientY);
          highlightDrop(moveEvent.clientX, moveEvent.clientY);
        }
      };
      const onUp = (upEvent) => { if (upEvent.pointerId === gesture.pointerId) finish(upEvent, false); };
      const onCancel = (cancelEvent) => { if (cancelEvent.pointerId === gesture.pointerId) finish(cancelEvent, true); };
      const onLostCapture = (lostEvent) => {
        if (!gesture.finished && lostEvent.pointerId === gesture.pointerId) finish(lostEvent, true);
      };

      gesture.__mobileCancel = () => finish({
        pointerId:gesture.pointerId,
        clientX:gesture.startX,
        clientY:gesture.startY,
      }, true);

      tile.addEventListener('pointermove', onMove, {passive:false});
      tile.addEventListener('pointerup', onUp);
      tile.addEventListener('pointercancel', onCancel);
      tile.addEventListener('lostpointercapture', onLostCapture);
    }, {passive:false});
  }

  installMobileCss();

  // Replace the v33 tile listener before rebuilding the 15 board nodes. This leaves all game
  // rules untouched; it only replaces the fragile mobile pointer lifecycle.
  attachTileEvents = mobileAttachTileEvents;
  buildBoardDOM();
  renderBoard();

  // Collection/deck already has the desired long-hold interaction. Give its existing handler
  // real pointer capture so Chrome cannot strand the ghost when a finger leaves the element.
  const collectionGrid = document.getElementById('collectionGrid');
  collectionGrid?.addEventListener('pointerdown', (event) => {
    const card = event.target.closest?.('.colCard[data-key][data-inst-id],.colCard[data-key][data-instid]') || event.target.closest?.('.colCard[data-key]');
    if (!card || event.target.closest?.('.favBtn')) return;
    card.draggable = false;
    try { card.setPointerCapture(event.pointerId); } catch (_) {}
  }, true);
  collectionGrid?.addEventListener('dragstart', (event) => event.preventDefault());
  collectionGrid?.addEventListener('contextmenu', (event) => {
    if (event.target.closest?.('.colCard')) event.preventDefault();
  });

  // The online merge completes asynchronously. A DOM card is a bad animation anchor after a
  // network round trip because the collection may have scrolled or re-rendered. Capture the
  // actual drop point as a stable viewport-space anchor instead.
  tryMergeAtPoint = function mobileTryMergeAtPoint(x, y, srcKey, srcInstId) {
    const el = document.elementFromPoint(x, y);
    const cardEl = el ? el.closest('.colCard') : null;
    if (!cardEl || !cardEl.dataset.key || !cardEl.dataset.instId) return false;
    const targetKey = cardEl.dataset.key;
    const targetInstId = cardEl.dataset.instId;
    if (targetKey !== srcKey || targetInstId === srcInstId) return false;
    const a = findInstance(srcKey, srcInstId);
    const b = findInstance(targetKey, targetInstId);
    if (!a || !b || a.cls !== b.cls || a.cls >= 10) return false;
    const vv = window.visualViewport;
    const vw = vv?.width || window.innerWidth;
    const vh = vv?.height || window.innerHeight;
    const safeX = Math.max(34, Math.min(vw-34, x));
    const safeY = Math.max(78, Math.min(vh-54, y));
    const stableAnchor = {
      getBoundingClientRect() {
        return {left:safeX-1, top:safeY-1, right:safeX+1, bottom:safeY+1, width:2, height:2, x:safeX-1, y:safeY-1};
      }
    };
    mergeInstances(srcKey, srcInstId, targetInstId, stableAnchor);
    return true;
  };

  const baseShowScreen = showScreen;
  showScreen = function mobileAwareShowScreen(name) {
    clearTransientDragUi();
    currentScreenName = name;
    const result = baseShowScreen(name);
    post('ttd:game-screen-change', {screen:name});
    return result;
  };

  function handleMobileBack() {
    const topOverlay = document.querySelector('.dieDetailOverlay.show,.itemDetailOverlay.show,#jewelPickerOverlay.show,#noticeOverlay.show');
    if (topOverlay) {
      const close = topOverlay.querySelector('.xCloseBtn,.closeBtn');
      if (close) close.click();
      else topOverlay.classList.remove('show');
      return true;
    }
    const active = document.querySelector('.screen.active');
    if (!active) return false;
    if (active.id === 'homeScreen') return false;
    if (active.id === 'gameScreen') {
      toast('Use End Run to leave the current battle');
      return true;
    }
    const backButton = active.querySelector('[data-back]');
    if (backButton?.dataset.back) {
      showScreen(backButton.dataset.back);
      return true;
    }
    showScreen('home');
    return true;
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== ORIGIN || event.source !== window.parent) return;
    const message = event.data || {};
    if (message.type === 'ttd:mobile-back-request') {
      const handled = handleMobileBack();
      post('ttd:mobile-back-result', {handled, screen:currentScreenName});
    }
  });

  if (!visibilityCleanupInstalled) {
    visibilityCleanupInstalled = true;
    window.addEventListener('blur', clearTransientDragUi);
    window.addEventListener('pagehide', clearTransientDragUi);
    document.addEventListener('visibilitychange', () => { if (document.hidden) clearTransientDragUi(); });
    document.addEventListener('dragstart', (event) => {
      if (event.target.closest?.('.tile,.colCard,.deckSlot,.die,.deckDie')) event.preventDefault();
    }, true);
  }

  post('ttd:mobile-input-ready');
})();