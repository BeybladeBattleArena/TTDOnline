(() => {
  'use strict';

  const LIFT_MS = 360;
  const INFO_MS = 1100;
  const MOVE_THRESHOLD = 8;
  const SPINNER_CIRC = 81.68;

  const style = document.createElement('style');
  style.id = 'ttd-interaction-v12-style';
  style.textContent = `
    /* Collection/deck mobile layout: the Save control is pinned to the actual iframe viewport.
       It is no longer dependent on flex/grid sizing, Chrome's address bar, or collection height. */
    #deckScreen{overflow:hidden!important;}
    #deckScreen #collectionGrid{
      min-height:0!important;
      overflow-y:auto!important;
      overscroll-behavior:contain!important;
      padding-bottom:calc(88px + env(safe-area-inset-bottom))!important;
    }
    #deckScreen #deckFooter{
      position:fixed!important;
      left:0!important;
      right:0!important;
      bottom:0!important;
      z-index:220!important;
      display:block!important;
      margin:0!important;
      padding:9px 12px calc(10px + env(safe-area-inset-bottom))!important;
      background:linear-gradient(0deg,rgba(10,12,20,1),rgba(18,22,42,.985))!important;
      border-top:1px solid var(--ink-700)!important;
      box-shadow:0 -8px 22px rgba(0,0,0,.45)!important;
      transform:none!important;
    }
    #deckScreen #saveDeckBtn{
      display:block!important;
      width:100%!important;
      min-height:46px!important;
      margin:0!important;
      transform:none!important;
    }

    /* A touch that begins on a die belongs to the die, period. Scrolling can only begin from
       collection background/gaps, exactly matching the game's drag affordance. */
    #collectionGrid .colCard{
      touch-action:none!important;
      -webkit-user-select:none!important;
      user-select:none!important;
      -webkit-touch-callout:none!important;
    }
    #collectionGrid.ttdCardGesture{
      overflow-y:hidden!important;
      touch-action:none!important;
      -webkit-overflow-scrolling:auto!important;
    }
  `;
  document.head.appendChild(style);

  function rebuildVisibleCollection() {
    if (document.getElementById('deckScreen')?.classList.contains('active') && typeof renderCollectionGrid === 'function') {
      renderCollectionGrid();
    }
  }

  attachInstanceCardEvents = function attachInstanceCardEventsV12(card, key, instId) {
    card.draggable = false;
    card.addEventListener('dragstart', (event) => event.preventDefault());
    card.addEventListener('contextmenu', (event) => event.preventDefault());

    card.addEventListener('pointerdown', (event) => {
      if (event.isPrimary === false || event.target.closest?.('.favBtn')) return;
      event.preventDefault();

      const scrollHost = card.closest('.scrollY') || document.getElementById('collectionGrid');
      const startX = event.clientX;
      const startY = event.clientY;
      const dragState = {
        key, instId,
        active:false,
        cancelled:false,
        detailFired:false,
        lifted:false,
        intentMoved:false,
        startX, startY,
        lastX:startX,
        lastY:startY,
        lastDist:0,
        ghostEl:null,
        srcCard:card,
        spinnerEl:null,
        rafId:null,
        startTime:performance.now(),
        pointerId:event.pointerId,
      };
      instDrag = dragState;

      // Lock at POINTER DOWN, not after the hold. This is the key mobile fix: Chrome never gets
      // an opportunity to turn the same gesture into vertical collection scrolling.
      scrollHost?.classList.add('ttdCardGesture');
      try { card.setPointerCapture(event.pointerId); } catch (_) {}

      const spinner = createHoldSpinner();
      card.appendChild(spinner);
      dragState.spinnerEl = spinner;
      const fillEl = spinner.querySelector('.spinnerFill');

      const removeSpinner = () => {
        if (dragState.spinnerEl?.parentElement) dragState.spinnerEl.remove();
        dragState.spinnerEl = null;
      };
      const stopRaf = () => {
        if (dragState.rafId) cancelAnimationFrame(dragState.rafId);
        dragState.rafId = null;
      };
      const unlock = () => scrollHost?.classList.remove('ttdCardGesture');
      const removeListeners = () => {
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerup', onUp);
        card.removeEventListener('pointercancel', onCancel);
        card.removeEventListener('lostpointercapture', onLost);
        try {
          if (card.hasPointerCapture?.(dragState.pointerId)) card.releasePointerCapture(dragState.pointerId);
        } catch (_) {}
      };
      const beginDrag = () => {
        if (dragState.active || dragState.cancelled || dragState.detailFired) return;
        dragState.lifted = true;
        dragState.intentMoved = true;
        removeSpinner();
        card.classList.remove('lifting');
        beginInstDrag(card, key, dragState.lastX, dragState.lastY);
      };

      const tick = () => {
        if (instDrag !== dragState || dragState.cancelled || dragState.active || dragState.detailFired) return;
        const elapsed = performance.now() - dragState.startTime;
        const progress = Math.min(1, elapsed / INFO_MS);
        if (fillEl) fillEl.style.strokeDashoffset = (SPINNER_CIRC * (1 - progress)).toFixed(2);

        if (elapsed >= LIFT_MS && !dragState.lifted) {
          dragState.lifted = true;
          card.classList.add('lifting');
          if (navigator.vibrate) navigator.vibrate(12);
          // If the finger has already started moving, immediately convert that pending motion
          // into a die drag at lift time. Nothing scrolls in the meantime.
          if (dragState.lastDist > MOVE_THRESHOLD) {
            beginDrag();
            return;
          }
        }

        if (progress >= 1 && !dragState.intentMoved) {
          dragState.detailFired = true;
          stopRaf();
          removeSpinner();
          card.classList.remove('lifting');
          removeListeners();
          unlock();
          instDrag = null;
          window.__dragKey = null;
          showDieDetail(key, { collectionInstId:instId });
          return;
        }
        dragState.rafId = requestAnimationFrame(tick);
      };

      const onMove = (moveEvent) => {
        if (instDrag !== dragState || dragState.cancelled || dragState.detailFired) return;
        if (moveEvent.pointerId !== dragState.pointerId) return;
        moveEvent.preventDefault();

        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const dist = Math.hypot(dx, dy);
        dragState.lastX = moveEvent.clientX;
        dragState.lastY = moveEvent.clientY;
        dragState.lastDist = dist;
        if (dist > MOVE_THRESHOLD) dragState.intentMoved = true;

        if (dragState.active) {
          moveInstGhost(moveEvent.clientX, moveEvent.clientY);
          return;
        }

        if (dragState.lifted || performance.now() - dragState.startTime >= LIFT_MS) {
          beginDrag();
          if (dragState.active) moveInstGhost(moveEvent.clientX, moveEvent.clientY);
        }
        // Before lift: deliberately do nothing. The gesture is reserved for the die and cannot
        // scroll the collection. To scroll, begin the swipe on collection background/gap space.
      };

      const finishCommon = () => {
        stopRaf();
        removeSpinner();
        card.classList.remove('lifting');
        removeListeners();
        unlock();
        window.__dragKey = null;
        document.querySelectorAll('.dropHover,.mergeHover').forEach((node) => node.classList.remove('dropHover','mergeHover'));
      };

      const onUp = (upEvent) => {
        if (upEvent.pointerId !== dragState.pointerId) return;
        finishCommon();
        if (instDrag === dragState && dragState.active) {
          endInstDrag(upEvent.clientX, upEvent.clientY);
        } else if (instDrag === dragState && !dragState.cancelled && !dragState.detailFired && !dragState.intentMoved && !dragState.lifted) {
          quickEquip(key, instId);
        }
        if (instDrag === dragState) instDrag = null;
      };

      const onCancel = () => {
        dragState.cancelled = true;
        finishCommon();
        if (dragState.active) {
          card.classList.remove('dragging');
          dragState.ghostEl?.remove();
        }
        if (instDrag === dragState) instDrag = null;
      };
      const onLost = () => { if (instDrag === dragState) onCancel(); };

      card.addEventListener('pointermove', onMove, {passive:false});
      card.addEventListener('pointerup', onUp);
      card.addEventListener('pointercancel', onCancel);
      card.addEventListener('lostpointercapture', onLost);
      dragState.rafId = requestAnimationFrame(tick);
    }, {passive:false});
  };

  rebuildVisibleCollection();
})();