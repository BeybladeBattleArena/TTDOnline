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

  // The canonical game exposes `state` as a configurable GETTER ONLY. Practice Mode v1 assigns
  // `state = freshState(...)`, which throws in strict mode even when freshState succeeds. Keep the
  // canonical getter, add a harmless setter, and have our training freshState call the canonical
  // startGame() so the game's real lexical state is initialized instead of creating a detached copy.
  try {
    const stateDescriptor = Object.getOwnPropertyDescriptor(window, 'state');
    const canonicalStateGet = stateDescriptor && typeof stateDescriptor.get === 'function'
      ? stateDescriptor.get.bind(window)
      : (() => null);

    if (stateDescriptor?.configurable !== false) {
      Object.defineProperty(window, 'state', {
        configurable: true,
        enumerable: stateDescriptor?.enumerable === true,
        get() { return canonicalStateGet(); },
        set(value) {
          // Practice Mode immediately assigns the exact object returned by practiceFreshState.
          // The real state was already installed by canonical startGame(), so this assignment is
          // intentionally a no-op. Never replace the canonical lexical state from a sidecar.
          const current = canonicalStateGet();
          if (value !== current && value != null) {
            console.warn('Practice Mode ignored an attempt to replace canonical battle state.');
          }
        },
      });
      status.stateBridge = true;
    }

    const practiceFreshState = (modeKey = 'endlesshorde') => {
      if (typeof window.startGame !== 'function') {
        throw new Error('Canonical startGame() is not available to Practice Mode.');
      }
      window.startGame(modeKey);
      const current = canonicalStateGet();
      if (!current || typeof current !== 'object') {
        throw new Error('Canonical startGame() did not create battle state.');
      }
      return current;
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

  // Never allow temporary training edits to be persisted through the canonical account saver.
  try {
    if (typeof window.saveAccount === 'function' && !window.__TTD_PRACTICE_SAVE_GUARD_V1) {
      window.__TTD_PRACTICE_SAVE_GUARD_V1 = true;
      const baseSaveAccount = window.saveAccount;
      window.saveAccount = function practiceSaveGuard() {
        if (window.__TTD_PRACTICE?.active || window.__TTD_PRACTICE_ACTIVE__) return;
        return baseSaveAccount.apply(this, arguments);
      };
      status.saveGuard = true;
    }
  } catch (error) {
    console.warn('Practice Mode could not install its account-save guard.', error);
  }
})();