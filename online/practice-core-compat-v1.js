(() => {
  'use strict';
  if (window.__TTD_PRACTICE_CORE_COMPAT_V1) return;
  window.__TTD_PRACTICE_CORE_COMPAT_V1 = true;

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

  // These core bindings are intentionally read-only in the canonical bridge. Practice Mode needs
  // a sidecar-visible wrapper without mutating the canonical lexical functions used by the game.
  // A shadow property lets Practice Mode wrap sidecar callers while normal battle code remains intact.
  makeShadowable('damageEnemy', (fn) => {
    if (typeof fn !== 'function') return fn;
    return function practiceSidecarDamageShadow() {
      const prior = !!window.__TTD_PRACTICE_DAMAGE_WRAPPER_ACTIVE;
      window.__TTD_PRACTICE_DAMAGE_WRAPPER_ACTIVE = true;
      try { return fn.apply(this, arguments); }
      finally { window.__TTD_PRACTICE_DAMAGE_WRAPPER_ACTIVE = prior; }
    };
  });
  makeShadowable('slottedClassOf');

  // Never allow temporary training edits to be persisted through the canonical account saver.
  try {
    if (typeof window.saveAccount === 'function' && !window.__TTD_PRACTICE_SAVE_GUARD_V1) {
      window.__TTD_PRACTICE_SAVE_GUARD_V1 = true;
      const baseSaveAccount = window.saveAccount;
      window.saveAccount = function practiceSaveGuard() {
        if (window.__TTD_PRACTICE?.active || window.__TTD_PRACTICE_ACTIVE__) return;
        return baseSaveAccount.apply(this, arguments);
      };
    }
  } catch (error) {
    console.warn('Practice Mode could not install its account-save guard.', error);
  }
})();