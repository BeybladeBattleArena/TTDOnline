(() => {
  'use strict';
  if (window.__TTD_PRACTICE_CORE_COMPAT_V1) return;
  window.__TTD_PRACTICE_CORE_COMPAT_V1 = true;

  const status = window.__TTD_PRACTICE_COMPAT_STATUS = {
    loaded: true,
    stateBridge: false,
    freshStateBridge: false,
    damageShadow: false,
    classShadow: false,
    rewardGuard: false,
    saveGuard: false,
  };

  function makeShadowable(name, wrapAssigned = null) {
    const descriptor = Object.getOwnPropertyDescriptor(window, name);
    if (!descriptor || descriptor.configurable === false) return false;
    let current;
    try { current = window[name]; } catch (_) { return false; }
    Object.defineProperty(window, name, {
      configurable: true,
      enumerable: descriptor.enumerable === true,
      get() { return current; },
      set(value) {
        current = typeof wrapAssigned === 'function' ? wrapAssigned(value) : value;
      },
    });
    return true;
  }

  // Sidecar-only wrappers. These do not replace the canonical lexical functions used by normal battles.
  status.damageShadow = makeShadowable('damageEnemy', (fn) => {
    if (typeof fn !== 'function') return fn;
    return function practiceSidecarDamageShadow() {
      const prior = !!window.__TTD_PRACTICE_DAMAGE_WRAPPER_ACTIVE;
      window.__TTD_PRACTICE_DAMAGE_WRAPPER_ACTIVE = true;
      try { return fn.apply(this, arguments); }
      finally { window.__TTD_PRACTICE_DAMAGE_WRAPPER_ACTIVE = prior; }
    };
  });
  status.classShadow = makeShadowable('slottedClassOf');

  let canonicalStateGet = () => null;

  // The canonical game exposes `state` as a configurable getter only. Practice Mode v1 assigns
  // `state = freshState(...)`, so we retain the canonical getter and add a harmless setter. The
  // training freshState normally enters through startGame(), but on the recovery pass it reuses the
  // canonical state that the first pass already created. This avoids creating a second battle loop.
  try {
    const stateDescriptor = Object.getOwnPropertyDescriptor(window, 'state');
    canonicalStateGet = stateDescriptor && typeof stateDescriptor.get === 'function'
      ? stateDescriptor.get.bind(window)
      : (() => null);

    if (stateDescriptor?.configurable !== false) {
      Object.defineProperty(window, 'state', {
        configurable: true,
        enumerable: stateDescriptor?.enumerable === true,
        get() { return canonicalStateGet(); },
        set(value) {
          const current = canonicalStateGet();
          if (value !== current && value != null) console.warn('Practice Mode ignored an attempt to replace canonical battle state.');
        },
      });
      status.stateBridge = true;
    }

    const practiceFreshState = (modeKey = 'endlesshorde') => {
      const current = canonicalStateGet();
      if (window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ && current && typeof current === 'object') {
        window.__TTD_PRACTICE_REUSE_CANONICAL_STATE__ = false;
        current.running = true;
        current.spawnQueue = [];
        current.wave = 1;
        current.completedWaves = 0;
        current.waveClearCredited = false;
        current.kills = 0;
        current.coinGold = 0;
        current.__ttdOutcomeCommitted = false;
        return current;
      }
      if (typeof window.startGame !== 'function') throw new Error('Canonical startGame() is not available to Practice Mode.');
      window.startGame(modeKey);
      const next = canonicalStateGet();
      if (!next || typeof next !== 'object') throw new Error('Canonical startGame() did not create battle state.');
      return next;
    };

    Object.defineProperty(window, 'freshState', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: practiceFreshState,
    });
    status.freshStateBridge = true;
  } catch (error) {
    console.error('Practice Mode could not install its canonical state bridge.', error);
  }

  function practiceProtected() {
    const s = canonicalStateGet();
    return !!(
      window.__TTD_PRACTICE_ACTIVE__ ||
      window.__TTD_PRACTICE_BOOTING_V2 ||
      window.__TTD_PRACTICE?.active ||
      s?.__ttdPracticeMode
    );
  }

  function cancelPracticeOutcome() {
    const s = canonicalStateGet();
    if (s && typeof s === 'object') {
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
    }
    if (window.__TTD_PRACTICE?.active && typeof window.__TTD_PRACTICE.close === 'function') {
      queueMicrotask(() => {
        try { window.__TTD_PRACTICE.close(); } catch (_) {}
      });
    }
  }

  // Practice must never pay pips, experience, gold, or any other native battle reward, including
  // the brief recovery state used on first entry.
  try {
    const baseEndMatch = typeof window.endMatch === 'function' ? window.endMatch : null;
    const baseEndEndlessHorde = typeof window.endEndlessHorde === 'function' ? window.endEndlessHorde : null;
    if (baseEndMatch) {
      window.endMatch = function practiceRewardGuardedEndMatch() {
        if (practiceProtected()) { cancelPracticeOutcome(); return; }
        return baseEndMatch.apply(this, arguments);
      };
    }
    if (baseEndEndlessHorde) {
      window.endEndlessHorde = function practiceRewardGuardedEndlessEnd() {
        if (practiceProtected()) { cancelPracticeOutcome(); return; }
        return baseEndEndlessHorde.apply(this, arguments);
      };
    }
    status.rewardGuard = !!(baseEndMatch || baseEndEndlessHorde);
  } catch (error) {
    console.warn('Practice Mode could not install its reward guard.', error);
  }

  // Never allow temporary training edits to be persisted through the global account saver.
  try {
    if (typeof window.saveAccount === 'function' && !window.__TTD_PRACTICE_SAVE_GUARD_V1) {
      window.__TTD_PRACTICE_SAVE_GUARD_V1 = true;
      const baseSaveAccount = window.saveAccount;
      window.saveAccount = function practiceSaveGuard() {
        if (practiceProtected()) return;
        return baseSaveAccount.apply(this, arguments);
      };
      status.saveGuard = true;
    }
  } catch (error) {
    console.warn('Practice Mode could not install its account-save guard.', error);
  }
})();
