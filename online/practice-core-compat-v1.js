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

  // freshState is deliberately private to the canonical game runtime, but Practice Mode was authored
  // as a sidecar and needs an isolated state object before it enters the existing battle screen.
  // Publish a training-only constructor without replacing the canonical lexical freshState function.
  // The normal game therefore keeps using its original state factory unchanged.
  if (typeof window.freshState !== 'function') {
    const practiceFreshState = (modeKey = 'endlesshorde') => {
      const cfg = {
        startLives: 999999999,
        bossEvery: 999999,
        countBase: 0,
        countPerWave: 0,
        bossHpMult: 1,
        hpGrowth: 0,
        speedMult: 0,
        rewardMult: 0,
      };
      let deck = [];
      try {
        if (typeof window.getActiveDeck === 'function') deck = window.getActiveDeck() || [];
      } catch (_) {}
      return {
        modeKey,
        cfg,
        sp: 999999999,
        summonCost: 0,
        wave: 1,
        lives: cfg.startLives,
        deck,
        board: new Array(15).fill(null),
        enemies: [],
        spawnQueue: [],
        spawnTimer: 0,
        waveClearedAt: 0,
        completedWaves: 0,
        waveClearCredited: false,
        running: true,
        time: 0,
        kills: 0,
        effects: [],
        tilePulse: new Array(15).fill(null),
        adventure: false,
        adventureStage: null,
        adventureDiff: null,
        adventureDiffKey: null,
        adventureStages: null,
        adventureStageIdx: 0,
        typhoonPhase: false,
        typhoonDefeated: false,
        snow: [],
        projectiles: [],
        coins: [],
        coinGold: 0,
        hazards: [],
        playerShots: [],
        dmgNumbers: [],
        pierceShots: [],
        screenTint: null,
        icicleCasts: [],
        blizzardPunches: [],
        blizzardBreaths: [],
        blizzardFloorSwaths: [],
        blizzardCrystals: [],
        devilCasts: [],
        skyfalls: [],
        gate: null,
        gateCooldownT: 0,
        asclepiusCD: 0,
        zombieMode: false,
        acidGlobs: [],
        zombieAttackFx: [],
        livesMax: cfg.startLives,
        showPlayerHpBar: true,
        playerHpLabel: 'Practice HP',
        zPlayTime: 0,
        zSpawnTimer: 0,
        zTotalDamageDealt: 0,
        zTotalDamageTaken: 0,
        zDamageByDieKey: {},
        __ttdPracticeMode: true,
      };
    };
    try {
      Object.defineProperty(window, 'freshState', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: practiceFreshState,
      });
    } catch (_) {
      window.freshState = practiceFreshState;
    }
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
    }
  } catch (error) {
    console.warn('Practice Mode could not install its account-save guard.', error);
  }
})();