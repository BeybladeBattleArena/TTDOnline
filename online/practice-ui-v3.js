(() => {
  'use strict';
  if (window.__TTD_PRACTICE_UI_V3) return;
  window.__TTD_PRACTICE_UI_V3 = true;

  const byId = (id) => document.getElementById(id);
  const practice = () => window.__TTD_PRACTICE || null;
  const active = () => !!practice()?.active || !!window.__TTD_PRACTICE_ACTIVE__;

  const style = document.createElement('style');
  style.id = 'ttd-practice-ui-v3-style';
  style.textContent = `
    #ttdPracticeClearSummonsRow{display:grid;grid-template-columns:1fr;margin-top:6px;}
    #ttdPracticeClearSummons{min-height:34px;border:1px solid #5c77a8;border-radius:8px;background:linear-gradient(180deg,#1b2947,#111a31);color:#d9e9ff;font:900 9px 'Cinzel',serif;letter-spacing:.02em;box-shadow:inset 0 0 10px rgba(97,150,219,.08);}
    #ttdPracticeClearSummons:active{filter:brightness(1.15);}
    #gameScreen.ttdPracticeActive #endRunBtn{min-width:78px;}
  `;
  document.head.appendChild(style);

  let priorModeLabel = null;
  let prewarmState = null;
  let prewarmFinished = false;
  let prewarmAttempts = 0;

  function restoreScreen(screenId) {
    document.querySelectorAll('.screen.active').forEach((screen) => screen.classList.remove('active'));
    const target = byId(screenId) || byId('homeScreen');
    target?.classList.add('active');
    try {
      if (target?.id === 'homeScreen' && typeof window.renderHome === 'function') window.renderHome();
      if (target?.id === 'deckScreen' && typeof window.renderDeckScreen === 'function') window.renderDeckScreen();
    } catch (_) {}
  }

  // Practice v1 needs one canonical battle-state construction before its sidecar can safely reuse
  // the engine. Do that once, invisibly, during startup instead of making the player's first tap
  // fall into the empty Endless Horde bootstrap. The scheduled core loop exits immediately because
  // the warmed state is frozen before the next animation frame.
  function prewarmPracticeState() {
    if (prewarmFinished || active()) return true;
    if (typeof window.startGame !== 'function' || !window.account || !window.DICE) return false;
    if (window.state && typeof window.state === 'object') {
      // Another real battle has already established canonical state. Do not replace it invisibly.
      prewarmFinished = true;
      return true;
    }

    const activeScreen = document.querySelector('.screen.active');
    const screenId = activeScreen?.id || 'homeScreen';
    const game = byId('gameScreen');
    const mode = byId('modeLabel');
    const priorVisibility = game?.style.visibility || '';
    const priorLabel = mode?.textContent || '';

    try {
      if (game) game.style.visibility = 'hidden';
      window.__TTD_PRACTICE_BOOTING_V2 = true;
      window.startGame('endlesshorde');
      const state = window.state;
      if (!state || typeof state !== 'object') throw new Error('Canonical Practice prewarm did not create state.');

      state.running = false;
      state.spawnQueue = [];
      state.enemies = [];
      state.wave = 1;
      state.completedWaves = 0;
      state.waveClearCredited = false;
      state.kills = 0;
      state.coinGold = 0;
      state.zPlayTime = 0;
      state.zTotalDamageDealt = 0;
      state.zTotalDamageTaken = 0;
      state.__ttdPracticeMode = true;
      state.__ttdPracticeNoRewards = true;
      state.__ttdOutcomeCommitted = true;

      prewarmState = state;
      window.__TTD_PRACTICE_PREWARM_STATE__ = state;
      window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ = true;
      window.__TTD_PRACTICE_PREWARMED__ = true;
      prewarmFinished = true;
    } catch (error) {
      console.warn('Practice Mode startup prewarm will retry.', error);
      return false;
    } finally {
      window.__TTD_PRACTICE_BOOTING_V2 = false;
      restoreScreen(screenId);
      if (mode && priorLabel) mode.textContent = priorLabel;
      if (game) game.style.visibility = priorVisibility;
    }
    return true;
  }

  function clearPlayerSummons() {
    const abilities = window.__TTD_OVERDRIVE_ABILITIES;
    try {
      if (abilities?.moonWolf?.alive) abilities.damageMoonWolf?.(1e15);
      if (abilities?.blackTaurus?.alive) abilities.damageBlackTaurus?.(1e15);
      abilities?.cancelTargeting?.();
    } catch (error) {
      console.warn('Practice Mode could not clear one or more player summons.', error);
    }
    try {
      window.dispatchEvent(new CustomEvent('ttd:practice-clear-player-summons'));
    } catch (_) {}
    try {
      if (typeof window.toast === 'function') window.toast('Player summons cleared.');
      else if (typeof window.toastGlobal === 'function') window.toastGlobal('Player summons cleared.');
    } catch (_) {}
  }

  function ensureClearSummonsButton() {
    if (!active()) return;
    const panel = byId('ttdPracticePanel');
    if (!panel || byId('ttdPracticeClearSummons')) return;
    const actions = panel.querySelector('.ttdPracticeActions');
    if (!actions) return;
    const row = document.createElement('div');
    row.id = 'ttdPracticeClearSummonsRow';
    row.innerHTML = '<button type="button" id="ttdPracticeClearSummons">Clear Player Summons</button>';
    actions.insertAdjacentElement('afterend', row);
  }

  function syncPracticeChrome() {
    const mode = byId('modeLabel');
    const end = byId('endRunBtn');
    const panelCollapse = byId('ttdPracticeExit');

    if (active()) {
      if (mode) {
        if (priorModeLabel == null) priorModeLabel = mode.textContent || 'ENDLESS HORDE';
        if (mode.textContent !== 'PRACTICE') mode.textContent = 'PRACTICE';
      }
      if (end && end.textContent !== 'Exit') end.textContent = 'Exit';
      if (panelCollapse) {
        if (panelCollapse.textContent !== 'Collapse') panelCollapse.textContent = 'Collapse';
        panelCollapse.setAttribute('aria-label', 'Collapse Practice menu');
        panelCollapse.title = 'Collapse Practice menu';
      }
      ensureClearSummonsButton();
    } else {
      if (end && end.textContent === 'Exit') end.textContent = 'End Run';
      if (mode && mode.textContent === 'PRACTICE' && priorModeLabel != null) mode.textContent = priorModeLabel;
      priorModeLabel = null;

      // If the player started another real mode before ever opening Practice, the warmed state is
      // no longer the current state and must never be reused later.
      if (prewarmState && window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ && window.state !== prewarmState) {
        window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ = false;
      }
    }
  }

  document.addEventListener('click', (event) => {
    if (!active()) return;

    const panelCollapse = event.target?.closest?.('#ttdPracticeExit');
    if (panelCollapse) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      byId('ttdPracticePanel')?.classList.remove('open');
      return;
    }

    const exitRun = event.target?.closest?.('#endRunBtn');
    if (exitRun) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      try { practice()?.close?.(); }
      catch (error) { console.error('Practice Mode could not exit cleanly.', error); }
      return;
    }

    const clear = event.target?.closest?.('#ttdPracticeClearSummons');
    if (clear) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      clearPlayerSummons();
    }
  }, true);

  const prewarmTimer = setInterval(() => {
    prewarmAttempts += 1;
    if (prewarmPracticeState() || prewarmAttempts > 240) clearInterval(prewarmTimer);
  }, 25);

  function monitor() {
    syncPracticeChrome();
    requestAnimationFrame(monitor);
  }
  requestAnimationFrame(monitor);
})();
