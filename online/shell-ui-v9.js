(() => {
  'use strict';

  const el = (id) => document.getElementById(id);
  const collapseBtn = el('barCollapseBtn');
  const accountBtn = el('accountDropdownBtn');
  const menu = el('accountDropdown');
  const signedIn = el('signedIn');
  const signedOutBrand = el('signedOutBrand');
  const redeemMenuBtn = el('redeemCodeMenuBtn');
  const redeemModal = el('redeemModal');
  const redeemClose = el('redeemModalClose');
  const rewardNotice = el('rewardNotice');
  const rewardNoticeText = el('rewardNoticeText');
  const rewardNoticeClose = el('rewardNoticeClose');
  const giftStatus = el('onlineGiftStatus');
  const gameFrame = el('gameFrame');
  const gameHost = gameFrame?.closest('.game') || null;
  const v6Modal = el('v6Modal');
  const shell = document.querySelector('.shell');

  let collapsed = false;
  let pendingBack = false;
  let backGuardArmed = false;
  const isTouchDevice = matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0;

  // The iframe and account area share the same grid cell. The iframe itself can be hidden while
  // its parent .game layer remains opaque, which covered the entire sign-in/loading UI after a
  // genuinely fresh browser load. Keep the parent visibility locked to the iframe visibility.
  function syncGameHostVisibility() {
    if (!gameFrame || !gameHost) return;
    gameHost.hidden = gameFrame.hidden;
  }
  if (gameFrame && gameHost) {
    syncGameHostVisibility();
    new MutationObserver(syncGameHostVisibility).observe(gameFrame, {
      attributes:true,
      attributeFilter:['hidden'],
    });
  }

  function setCollapsed(next, persist=true) {
    collapsed = !!next;
    shell?.classList.toggle('barCollapsed', collapsed);
    if (collapseBtn) {
      collapseBtn.textContent = collapsed ? '⌄' : '⌃';
      collapseBtn.setAttribute('aria-label', collapsed ? 'Show account bar' : 'Hide account bar');
      collapseBtn.title = collapsed ? 'Show account bar' : 'Hide account bar';
    }
    if (menu) menu.style.top = collapsed ? '18px' : (innerWidth <= 520 ? '39px' : '41px');
    if (persist) {
      try { localStorage.setItem('ttd_bar_collapsed_v1', collapsed ? '1' : '0'); } catch (_) {}
    }
    if (collapsed) closeAccountMenu();
  }

  function syncAuthBar() {
    const authed = !!signedIn && !signedIn.hidden;
    if (signedOutBrand) signedOutBrand.hidden = authed;
    if (collapseBtn) collapseBtn.hidden = !authed;
    if (!authed) {
      closeAccountMenu();
      setCollapsed(false, false);
    }
  }

  function openAccountMenu() {
    if (!menu) return;
    menu.hidden = false;
    accountBtn?.setAttribute('aria-expanded','true');
  }
  function closeAccountMenu() {
    if (!menu) return;
    menu.hidden = true;
    accountBtn?.setAttribute('aria-expanded','false');
  }
  function toggleAccountMenu() {
    if (!menu) return;
    if (menu.hidden) openAccountMenu(); else closeAccountMenu();
  }

  function openRedeem() {
    closeAccountMenu();
    if (!redeemModal) return;
    redeemModal.hidden = false;
    requestAnimationFrame(() => el('onlineGiftCode')?.focus({preventScroll:true}));
  }
  function closeRedeem() {
    if (redeemModal) redeemModal.hidden = true;
  }
  function showRewardNotice(text) {
    closeRedeem();
    if (rewardNoticeText) rewardNoticeText.textContent = text;
    if (rewardNotice) rewardNotice.hidden = false;
  }
  function closeRewardNotice() {
    if (rewardNotice) rewardNotice.hidden = true;
  }

  collapseBtn?.addEventListener('click', () => setCollapsed(!collapsed));
  accountBtn?.addEventListener('click', (event) => { event.stopPropagation(); toggleAccountMenu(); });
  redeemMenuBtn?.addEventListener('click', openRedeem);
  redeemClose?.addEventListener('click', closeRedeem);
  redeemModal?.addEventListener('click', (event) => { if (event.target === redeemModal) closeRedeem(); });
  rewardNoticeClose?.addEventListener('click', closeRewardNotice);
  rewardNotice?.addEventListener('click', (event) => { if (event.target === rewardNotice) closeRewardNotice(); });

  document.addEventListener('click', (event) => {
    if (!menu || menu.hidden) return;
    if (menu.contains(event.target) || accountBtn?.contains(event.target)) return;
    closeAccountMenu();
  });
  menu?.addEventListener('click', (event) => {
    if (event.target.closest('button')) closeAccountMenu();
  });

  if (giftStatus) {
    new MutationObserver(() => {
      const text = giftStatus.textContent.trim();
      if (/^Redeemed\b/i.test(text)) showRewardNotice(text);
    }).observe(giftStatus, {childList:true,characterData:true,subtree:true});
  }

  // The existing Progress modal is now the Quests surface. Rename it at presentation time
  // without changing any server-side achievement/daily identifiers.
  if (v6Modal) {
    new MutationObserver(() => {
      if (v6Modal.hidden) return;
      const heading = v6Modal.querySelector('h2');
      if (heading?.textContent.trim() === 'Progress') heading.textContent = 'Quests';
    }).observe(v6Modal, {childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  }

  if (signedIn) {
    new MutationObserver(syncAuthBar).observe(signedIn, {attributes:true,attributeFilter:['hidden']});
  }
  window.addEventListener('resize', () => {
    if (menu) menu.style.top = collapsed ? '18px' : (innerWidth <= 520 ? '39px' : '41px');
  }, {passive:true});

  // Hide the bar automatically while an actual battle is running. It no longer steals vertical
  // gameplay space, and the small chevron remains available if the player wants the account HUD.
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== gameFrame?.contentWindow) return;
    const message = event.data || {};
    if (message.type === 'ttd:game-screen-change') {
      if (message.screen === 'game') setCollapsed(true, false);
      else if (message.screen === 'home') setCollapsed(false, false);
    }
    if (message.type === 'ttd:moving-screen-active') {
      setCollapsed(!!message.active, false);
    }
    if (message.type === 'ttd:mobile-back-result' && pendingBack) {
      pendingBack = false;
      if (message.handled) armBackGuard();
    }
  });

  function closeTopUiForBack() {
    if (rewardNotice && !rewardNotice.hidden) { closeRewardNotice(); return true; }
    if (redeemModal && !redeemModal.hidden) { closeRedeem(); return true; }
    if (v6Modal && !v6Modal.hidden) {
      const x = el('v6ModalX');
      if (x) x.click(); else v6Modal.hidden = true;
      return true;
    }
    if (menu && !menu.hidden) { closeAccountMenu(); return true; }
    return false;
  }

  function armBackGuard() {
    if (!isTouchDevice || backGuardArmed) return;
    history.pushState({ttdGuard:true}, '', location.href);
    backGuardArmed = true;
  }

  if (isTouchDevice) {
    history.replaceState({ttdBase:true}, '', location.href);
    armBackGuard();
    window.addEventListener('popstate', () => {
      if (!backGuardArmed) return;
      backGuardArmed = false;
      if (closeTopUiForBack()) { armBackGuard(); return; }
      if (!gameFrame || gameFrame.hidden || !gameFrame.contentWindow) return;
      pendingBack = true;
      gameFrame.contentWindow.postMessage({type:'ttd:mobile-back-request'}, location.origin);
      setTimeout(() => {
        if (!pendingBack) return;
        pendingBack = false;
        // If the iframe did not answer, do not trap the browser; the next Back may leave normally.
      }, 450);
    });
  }

  // Restore a manual preference only when not actively entering a battle.
  try { setCollapsed(localStorage.getItem('ttd_bar_collapsed_v1') === '1', false); } catch (_) { setCollapsed(false, false); }
  syncAuthBar();

  // New-account naming is intentionally lazy: it never blocks the game loader or returning users.
  import('/online/onboarding-client-v9.js?v=9').catch((err) => console.error('Player-name onboarding failed to load.', err));
  // Overdrive owns its own authenticated state/persistence bridge and remains independent of startup gating.
  import('/online/overdrive-client-v1.js?v=1').catch((err) => console.error('Overdrive client failed to load.', err));
})();
