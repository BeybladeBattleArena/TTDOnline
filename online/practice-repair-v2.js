(() => {
  'use strict';
  if (window.__TTD_PRACTICE_REPAIR_V2) return;
  window.__TTD_PRACTICE_REPAIR_V2 = true;

  const sleepFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, Number(value) || 0));
  const byId = (id) => document.getElementById(id);
  const practiceActive = () => !!window.__TTD_PRACTICE?.active;
  const deckKey = (entry) => typeof entry === 'string' ? entry : entry?.key;
  let basePractice = null;
  let wrappedPractice = null;
  let booting = false;
  let originalScreenId = 'homeScreen';
  let canonicalOd = null;
  let practiceOdFacade = null;

  function toast(message) {
    try { if (typeof window.toastGlobal === 'function') return window.toastGlobal(message); } catch (_) {}
    try { if (typeof window.toast === 'function') return window.toast(message); } catch (_) {}
    console.info(message);
  }

  function activeScreenId() {
    return document.querySelector('.screen.active')?.id || 'homeScreen';
  }

  function restoreScreen(id) {
    document.querySelectorAll('.screen.active').forEach((screen) => screen.classList.remove('active'));
    const target = byId(id) || byId('homeScreen');
    target?.classList.add('active');
    byId('gameScreen')?.classList.remove('ttdPracticeActive');
  }

  function dependenciesReady() {
    const compat = window.__TTD_PRACTICE_COMPAT_STATUS;
    return !!(
      basePractice && typeof basePractice.open === 'function' &&
      compat?.stateBridge && compat?.freshStateBridge &&
      typeof window.freshState === 'function' &&
      typeof window.startGame === 'function' &&
      typeof window.damageEnemy === 'function' &&
      typeof window.enemyRenderPos === 'function' &&
      typeof window.progressFrac === 'function' &&
      window.account && window.DICE &&
      window.__TTD_OVERDRIVE && window.__TTD_OVERDRIVE_ABILITIES
    );
  }

  function neutralizeFailedBootstrap() {
    const s = window.state;
    if (!s || typeof s !== 'object') return false;
    s.__ttdPracticeMode = true;
    s.running = false;
    s.spawnQueue = [];
    s.wave = 1;
    s.completedWaves = 0;
    s.waveClearCredited = false;
    s.kills = 0;
    s.coinGold = 0;
    s.zPlayTime = 0;
    s.zTotalDamageDealt = 0;
    s.zTotalDamageTaken = 0;
    s.__ttdOutcomeCommitted = true;
    window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ = true;
    return true;
  }

  function captureCanonicalOverdrive() {
    const current = window.__TTD_OVERDRIVE;
    if (!current || current === practiceOdFacade) return canonicalOd;
    if (!practiceActive()) canonicalOd = current;
    return canonicalOd || current;
  }

  function practiceOdSlots() {
    const selects = [...document.querySelectorAll('#ttdPracticePanel [data-practice-od]')]
      .sort((a, b) => Number(a.dataset.practiceOd) - Number(b.dataset.practiceOd));
    if (selects.length) return [selects[0]?.value || null, selects[1]?.value || null];
    try {
      const idx = Number.isSafeInteger(window.account?.activeDeckIdx) ? window.account.activeDeckIdx : 0;
      const pair = window.account?.overdriveDecks?.[idx] || [];
      return [deckKey(pair[0]) || null, deckKey(pair[1]) || null];
    } catch (_) { return [null, null]; }
  }

  function installPracticeOverdrive() {
    if (!practiceActive()) return false;
    const base = canonicalOd || captureCanonicalOverdrive() || window.__TTD_OVERDRIVE;
    if (!base) return false;
    if (!practiceOdFacade) {
      practiceOdFacade = {};
      for (const key of Reflect.ownKeys(base)) {
        try {
          const value = base[key];
          practiceOdFacade[key] = typeof value === 'function' ? value.bind(base) : value;
        } catch (_) {}
      }
      practiceOdFacade.__ttdPracticeFacadeV2 = true;
      practiceOdFacade.equipped = () => practiceOdSlots().slice();
      practiceOdFacade.drive = () => ({ current: 100, max: 100, ready: true });
      practiceOdFacade.dp = () => ({ current: 999999999, max: 999999999 });
      practiceOdFacade.spendDp = () => true;
      practiceOdFacade.resetDrive = () => {};
      practiceOdFacade.playerStats = () => ({ ...(base.playerStats?.() || {}), hp: 999999999, dp: 999999999 });
    }
    if (window.__TTD_OVERDRIVE !== practiceOdFacade) window.__TTD_OVERDRIVE = practiceOdFacade;
    return true;
  }

  function restoreCanonicalOverdrive() {
    if (canonicalOd && window.__TTD_OVERDRIVE === practiceOdFacade) window.__TTD_OVERDRIVE = canonicalOd;
  }

  function firstOwnedInstance(key) {
    try { return (window.account?.owned?.[key] || [])[0] || null; } catch (_) { return null; }
  }

  function battleInstance(key) {
    try {
      const entry = (window.state?.deck || []).find((item) => deckKey(item) === key);
      const list = window.account?.owned?.[key] || [];
      if (entry?.instId) {
        const exact = list.find((instance) => instance?.id === entry.instId);
        if (exact) return exact;
      }
      return list[0] || null;
    } catch (_) { return null; }
  }

  function selectedPreviewClass(key) {
    const selected = byId('ttdPracticeSelectedDie')?.value;
    if (selected === key) {
      const on = document.querySelector('#ttdPracticePanel .ttdPracticeClassBtn.on');
      const cls = Number(on?.dataset?.practiceClass);
      if (Number.isFinite(cls)) return clamp(cls, 1, 7);
    }
    return clamp(firstOwnedInstance(key)?.cls || 1, 1, 7);
  }

  function makePracticeDie(key) {
    const inst = battleInstance(key) || firstOwnedInstance(key);
    const enchants = inst && Array.isArray(inst.enchants)
      ? inst.enchants.map((jewel) => jewel ? { ...jewel } : null)
      : [null, null, null, null];
    const cls = selectedPreviewClass(key);
    const die = {
      key,
      instId: inst?.id || null,
      cls,
      dot: 1,
      pu: 0,
      sinceLastShot: 0,
      growthT: 0,
      blizzardT: 0,
      attackCount: 0,
      buffs: [],
      disabledT: 0,
      hp: 1,
      maxHp: 1,
      healGaugeT: 0,
      enchants,
      canon: {},
      authenticOrigin: true,
      _canonClassOverride: cls,
    };
    try {
      const hp = Math.max(1, Math.round(Number(window.effHp?.(die) || 1)));
      die.maxHp = hp;
      die.hp = hp;
    } catch (_) {
      const baseHp = Math.max(1, Number(window.DICE?.[key]?.hp || 1));
      const mult = typeof window.classMultFromLevel === 'function' ? Number(window.classMultFromLevel(cls) || 1) : 1;
      die.maxHp = Math.max(1, Math.round(baseHp * mult));
      die.hp = die.maxHp;
    }
    return die;
  }

  function installDieFactory() {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(window, 'makeDie');
      if (!descriptor || descriptor.configurable !== false) {
        Object.defineProperty(window, 'makeDie', {
          configurable: true,
          enumerable: false,
          writable: true,
          value: makePracticeDie,
        });
        return true;
      }
    } catch (_) {}
    return typeof window.makeDie === 'function';
  }

  function summonSelected() {
    if (!practiceActive() || !window.state?.running) return;
    const key = byId('ttdPracticeSelectedDie')?.value;
    if (!key || !firstOwnedInstance(key)) return;
    const board = window.state.board;
    if (!Array.isArray(board)) return;
    const index = board.findIndex((die) => !die);
    if (index < 0) { toast('Board full'); return; }
    const die = makePracticeDie(key);
    board[index] = die;
    try { if (typeof window.renderBoard === 'function') window.renderBoard(); } catch (_) {}
  }

  function interceptPracticeControls(event) {
    if (!practiceActive()) return;
    const summon = event.target?.closest?.('#ttdPracticeSummon, #summonBtn');
    if (summon) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      summonSelected();
      return;
    }
    const cast = event.target?.closest?.('[data-practice-cast]');
    if (cast) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const index = Number(cast.dataset.practiceCast);
      if (!Number.isSafeInteger(index) || index < 0 || index > 1) return;
      installPracticeOverdrive();
      byId('ttdPracticePanel')?.classList.remove('open');
      window.__TTD_OVERDRIVE_ABILITIES?.activateSlot?.(index);
    }
  }

  async function openRobust() {
    if (!basePractice || basePractice.active || booting) return;
    booting = true;
    window.__TTD_PRACTICE_BOOTING_V2 = true;
    originalScreenId = activeScreenId();
    captureCanonicalOverdrive();

    const deadline = performance.now() + 2500;
    while (!dependenciesReady() && performance.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      captureCanonicalOverdrive();
    }
    if (!dependenciesReady()) {
      booting = false;
      window.__TTD_PRACTICE_BOOTING_V2 = false;
      toast('Practice Mode is still loading. Try once more in a moment.');
      return;
    }

    try {
      basePractice.open();
      if (!basePractice.active) {
        const reusable = neutralizeFailedBootstrap();
        restoreScreen(originalScreenId);
        await sleepFrame();
        await sleepFrame();
        if (!reusable) window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ = false;
        basePractice.open();
      }

      if (!basePractice.active) {
        neutralizeFailedBootstrap();
        restoreScreen(originalScreenId);
        toast('Practice Mode could not finish initializing. No rewards were granted.');
        return;
      }

      installDieFactory();
      installPracticeOverdrive();
    } catch (error) {
      console.error('Practice Mode v2 recovery failed.', error);
      neutralizeFailedBootstrap();
      restoreScreen(originalScreenId);
      toast('Practice Mode could not finish initializing. No rewards were granted.');
    } finally {
      window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ = false;
      booting = false;
      window.__TTD_PRACTICE_BOOTING_V2 = false;
    }
  }

  function closeRobust() {
    restoreCanonicalOverdrive();
    window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ = false;
    window.__TTD_PRACTICE_BOOTING_V2 = false;
    booting = false;
    return basePractice?.close?.();
  }

  function installPracticeWrapper() {
    const current = window.__TTD_PRACTICE;
    if (!current || current === wrappedPractice) return false;
    if (current.__ttdPracticeRepairV2) return true;
    basePractice = current;
    wrappedPractice = Object.freeze({
      __ttdPracticeRepairV2: true,
      open: openRobust,
      close: closeRobust,
      get active() { return !!basePractice?.active; },
      get settings() { return basePractice?.settings || {}; },
    });
    window.__TTD_PRACTICE = wrappedPractice;
    return true;
  }

  document.addEventListener('click', interceptPracticeControls, true);

  function monitor() {
    installPracticeWrapper();
    installDieFactory();
    if (!practiceActive()) captureCanonicalOverdrive();
    else installPracticeOverdrive();
    requestAnimationFrame(monitor);
  }

  monitor();
})();
