(() => {
  'use strict';
  if (window.__TTD_PRACTICE_ENTRY_HOTFIX_V2) return;
  window.__TTD_PRACTICE_ENTRY_HOTFIX_V2 = true;

  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, Number(value) || 0));

  function fallbackProgressFrac(enemy) {
    if (!enemy) return 0;
    if (enemy.__ttdPracticeEnemy) return clamp(enemy.__ttdPracticeProgress, 0, 1);
    if (enemy.isZombie || enemy.isTyphoon) return clamp(enemy.approach, 0, 1);
    const length = Math.max(1, Number(window.totalLen || 1));
    return clamp(Number(enemy.dist || 0) / length, 0, 1);
  }

  function ensureProgressFracCompatibility() {
    let current = null;
    try { current = window.progressFrac; } catch (_) {}
    const value = typeof current === 'function' ? current : fallbackProgressFrac;
    const descriptor = Object.getOwnPropertyDescriptor(window, 'progressFrac');

    try {
      if (!descriptor) {
        Object.defineProperty(window, 'progressFrac', {
          configurable: true,
          enumerable: false,
          writable: true,
          value,
        });
        return true;
      }

      if (descriptor.configurable && (
        ('writable' in descriptor && descriptor.writable === false) ||
        (!('writable' in descriptor) && typeof descriptor.set !== 'function')
      )) {
        Object.defineProperty(window, 'progressFrac', {
          configurable: true,
          enumerable: descriptor.enumerable === true,
          writable: true,
          value,
        });
        return true;
      }

      if (typeof current !== 'function' && descriptor.writable !== false) window.progressFrac = fallbackProgressFrac;
      return typeof window.progressFrac === 'function';
    } catch (error) {
      console.warn('Practice Mode could not prepare progressFrac compatibility.', error);
      return false;
    }
  }

  ensureProgressFracCompatibility();

  const style = document.createElement('style');
  style.id = 'ttd-practice-entry-hotfix-v2-style';
  style.textContent = `
    #ttdPracticeHomeWrap{
      grid-column:1 / -1!important;
      width:100%!important;
      display:flex!important;
      justify-content:flex-end!important;
      align-items:center!important;
      box-sizing:border-box!important;
      margin:6px 0 0!important;
      padding:0 1px!important;
    }
    #ttdPracticeHomeBtn.ttdPracticeCompact{
      appearance:none!important;
      -webkit-appearance:none!important;
      display:flex!important;
      align-items:center!important;
      justify-content:flex-start!important;
      gap:8px!important;
      width:min(220px,43vw)!important;
      min-width:150px!important;
      height:43px!important;
      margin:0!important;
      padding:5px 10px!important;
      box-sizing:border-box!important;
      border:1px solid rgba(226,142,47,.78)!important;
      border-radius:12px!important;
      background:linear-gradient(145deg,#231d19 0%,#171824 72%)!important;
      color:#ffe2a3!important;
      box-shadow:inset 0 0 14px rgba(242,172,57,.07),0 4px 12px rgba(0,0,0,.24)!important;
      text-align:left!important;
      cursor:pointer!important;
      touch-action:manipulation!important;
    }
    #ttdPracticeHomeBtn.ttdPracticeCompact .ttdPracticeCompactIcon{
      flex:0 0 28px!important;
      width:28px!important;
      height:28px!important;
      display:grid!important;
      place-items:center!important;
      border-radius:8px!important;
      background:linear-gradient(145deg,#f5b24b,#d97828)!important;
      box-shadow:inset 0 0 0 1px rgba(255,232,177,.28)!important;
    }
    #ttdPracticeHomeBtn.ttdPracticeCompact svg{
      width:18px!important;
      height:18px!important;
      stroke:#241408!important;
      fill:none!important;
      stroke-width:2!important;
      stroke-linecap:round!important;
      stroke-linejoin:round!important;
    }
    #ttdPracticeHomeBtn.ttdPracticeCompact .ttdPracticeCompactText{
      min-width:0!important;
      display:flex!important;
      flex-direction:column!important;
      line-height:1.05!important;
    }
    #ttdPracticeHomeBtn.ttdPracticeCompact strong{
      color:#ffe2a3!important;
      font:900 11px 'Cinzel',serif!important;
      white-space:nowrap!important;
    }
    #ttdPracticeHomeBtn.ttdPracticeCompact small{
      margin-top:2px!important;
      color:#9e98a8!important;
      font:700 7px 'Space Mono',monospace!important;
      white-space:nowrap!important;
    }
    #ttdPracticeHomeBtn.ttdPracticeCompact:active{
      transform:translateY(1px)!important;
      filter:brightness(1.12)!important;
    }
    @media(max-width:390px){
      #ttdPracticeHomeBtn.ttdPracticeCompact{width:min(205px,48vw)!important;min-width:146px!important;height:41px!important;padding:5px 9px!important;}
      #ttdPracticeHomeBtn.ttdPracticeCompact .ttdPracticeCompactIcon{width:27px!important;height:27px!important;flex-basis:27px!important;}
      #ttdPracticeHomeBtn.ttdPracticeCompact strong{font-size:10px!important;}
      #ttdPracticeHomeBtn.ttdPracticeCompact small{font-size:6.5px!important;}
    }
  `;
  document.head.appendChild(style);

  function notify(message) {
    try { if (typeof window.toastGlobal === 'function') return window.toastGlobal(message); } catch (_) {}
    try { if (typeof window.toast === 'function') return window.toast(message); } catch (_) {}
    console.info(message);
  }

  function openPractice(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    ensureProgressFracCompatibility();

    const api = window.__TTD_PRACTICE;
    if (!api || typeof api.open !== 'function') {
      setTimeout(() => openPractice(), 80);
      return;
    }

    try {
      api.open();
    } catch (error) {
      console.error('Practice Mode entry failed.', error);
      notify('Practice Mode could not initialize. Reload once and try again.');
    }
  }

  function makeCompactHomeButton() {
    const homeDeck = document.getElementById('btnDeck');
    if (!homeDeck) return;

    const existing = document.getElementById('ttdPracticeHomeBtn');
    if (existing?.classList.contains('ttdPracticeCompact') && document.getElementById('ttdPracticeHomeWrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'ttdPracticeHomeWrap';

    const button = document.createElement('button');
    button.id = 'ttdPracticeHomeBtn';
    button.type = 'button';
    button.className = 'ttdPracticeCompact';
    button.setAttribute('aria-label', 'Open Practice Mode');
    button.innerHTML = `
      <span class="ttdPracticeCompactIcon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4M9.5 12l1.8 1.8 3.7-4.6"></path></svg>
      </span>
      <span class="ttdPracticeCompactText"><strong>Practice Mode</strong><small>Training Lab</small></span>`;
    button.addEventListener('click', openPractice, true);
    wrap.appendChild(button);

    if (existing) {
      const oldWrap = existing.closest('#ttdPracticeHomeWrap');
      if (oldWrap) oldWrap.replaceWith(wrap);
      else existing.replaceWith(wrap);
    } else {
      homeDeck.insertAdjacentElement('afterend', wrap);
    }
  }

  document.addEventListener('click', (event) => {
    const deckButton = event.target?.closest?.('#ttdPracticeDeckBtn');
    if (!deckButton) return;
    openPractice(event);
  }, true);

  function tick() {
    ensureProgressFracCompatibility();
    makeCompactHomeButton();
    setTimeout(tick, 350);
  }

  tick();
})();
