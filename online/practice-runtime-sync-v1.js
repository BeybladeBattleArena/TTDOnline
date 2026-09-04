(() => {
  'use strict';
  if (window.__TTD_PRACTICE_RUNTIME_SYNC_V1) return;
  window.__TTD_PRACTICE_RUNTIME_SYNC_V1 = true;

  const STATS_WINDOW_MS = 3000;
  const COMBO_IDLE_MS = 2500;
  let wasActive = false;
  let classSnapshot = [];
  let statObserver = null;
  const stats = { events: [], stringDamage: 0, combo: 0, lastHitAt: 0 };

  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, Number(value) || 0));
  const now = () => performance.now();
  const practice = () => window.__TTD_PRACTICE || null;

  function formatDamage(value) {
    const v = Math.max(0, Number(value) || 0);
    if (v >= 1e9) return `${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}b`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}m`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k`;
    return v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(v >= 10 ? 1 : 2).replace(/\.00$/, '');
  }

  function resetStats() {
    stats.events.length = 0;
    stats.stringDamage = 0;
    stats.combo = 0;
    stats.lastHitAt = 0;
    renderStats();
  }

  function recordDamage(amount) {
    const value = Math.max(0, Number(amount) || 0);
    if (!value) return;
    const t = now();
    if (stats.lastHitAt && t - stats.lastHitAt > COMBO_IDLE_MS) resetStats();
    stats.lastHitAt = t;
    stats.combo += 1;
    stats.stringDamage += value;
    stats.events.push({ t, amount: value });
    stats.events = stats.events.filter((entry) => t - entry.t <= STATS_WINDOW_MS);
    renderStats();
  }

  function liveDps() {
    const t = now();
    stats.events = stats.events.filter((entry) => t - entry.t <= STATS_WINDOW_MS);
    if (!stats.events.length) return 0;
    const span = Math.max(250, Math.min(STATS_WINDOW_MS, t - stats.events[0].t + 120));
    return stats.events.reduce((sum, entry) => sum + entry.amount, 0) / (span / 1000);
  }

  function renderStats() {
    if (!practice()?.active) return;
    const dps = document.getElementById('ttdPracticeDpsVal');
    const damage = document.getElementById('ttdPracticeDamageVal');
    const combo = document.getElementById('ttdPracticeComboVal');
    const dpsText = formatDamage(liveDps());
    const damageText = formatDamage(stats.stringDamage);
    const comboText = `${stats.combo} HIT${stats.combo === 1 ? '' : 'S'}`;
    if (dps && dps.textContent !== dpsText) dps.textContent = dpsText;
    if (damage && damage.textContent !== damageText) damage.textContent = damageText;
    if (combo && combo.textContent !== comboText) combo.textContent = comboText;
  }

  function attachStatObserver() {
    statObserver?.disconnect();
    const hud = document.getElementById('ttdPracticeHud');
    if (!hud) return;
    let queued = false;
    statObserver = new MutationObserver(() => {
      if (queued || !practice()?.active) return;
      queued = true;
      queueMicrotask(() => { queued = false; renderStats(); });
    });
    statObserver.observe(hud, { childList: true, characterData: true, subtree: true });
  }

  function snapshotClasses() {
    classSnapshot = [];
    const owned = window.account?.owned || {};
    for (const [key, list] of Object.entries(owned)) {
      if (!Array.isArray(list)) continue;
      for (const instance of list) {
        if (!instance) continue;
        classSnapshot.push({ key, id: instance.id, cls: Number(instance.cls || 1) });
      }
    }
  }

  function restoreClasses() {
    const owned = window.account?.owned || {};
    for (const saved of classSnapshot) {
      const list = owned[saved.key];
      if (!Array.isArray(list)) continue;
      const instance = list.find((entry) => entry && entry.id === saved.id) || list[0];
      if (instance) instance.cls = saved.cls;
    }
    classSnapshot = [];
    try {
      if (document.getElementById('deckScreen')?.classList.contains('active') && typeof window.renderDeckScreen === 'function') window.renderDeckScreen();
    } catch (_) {}
  }

  function syncSelectedPreviewClass() {
    if (!practice()?.active) return;
    const key = document.getElementById('ttdPracticeSelectedDie')?.value;
    const classButton = document.querySelector('#ttdPracticePanel .ttdPracticeClassBtn.on');
    const cls = clamp(classButton?.dataset?.practiceClass, 1, 7);
    if (!key || !cls) return;
    const instances = window.account?.owned?.[key];
    if (!Array.isArray(instances) || !instances.length) return;
    instances[0].cls = cls;
  }

  function inferredDamageFactor() {
    const settings = practice()?.settings || {};
    const physicalResist = clamp(settings.physicalResist, 0, 0.9);
    const elementalResist = clamp(settings.elementalResist, 0, 0.9);
    let factor = 1;
    let def = null;
    try {
      const key = window.currentAttackerDieKey;
      if (key) def = window.DICE?.[key] || null;
    } catch (_) {}
    if (!def) return factor * (1 - Math.max(physicalResist, elementalResist));
    if (String(def.category || '').toLowerCase() === 'physical') factor *= 1 - physicalResist;
    const affinities = def.affinities && typeof def.affinities === 'object' ? def.affinities : {};
    let elementalShare = 0;
    for (const [element, share] of Object.entries(affinities)) {
      if (!element || element === '__nonelemental') continue;
      elementalShare += Math.max(0, Number(share) || 0);
    }
    elementalShare = clamp(elementalShare, 0, 1);
    factor *= 1 - elementalResist * elementalShare;
    return clamp(factor, 0, 1);
  }

  function instrumentEnemy(enemy) {
    if (!enemy?.__ttdPracticeEnemy || enemy.__ttdPracticeHpInstrumented) return;
    enemy.__ttdPracticeHpInstrumented = true;
    let hpValue = Math.max(1, Number(enemy.hp || enemy.maxHp || 1));
    Object.defineProperty(enemy, 'hp', {
      configurable: true,
      enumerable: true,
      get() { return hpValue; },
      set(nextValue) {
        const next = Number(nextValue);
        if (!Number.isFinite(next)) return;
        if (!practice()?.active || next >= hpValue) {
          hpValue = Math.max(1, next);
          return;
        }
        const rawDamage = Math.max(0, hpValue - next);
        const alreadyAdjusted = !!window.__TTD_PRACTICE_DAMAGE_WRAPPER_ACTIVE;
        const adjustedDamage = rawDamage * (alreadyAdjusted ? 1 : inferredDamageFactor());
        if (adjustedDamage > 0) recordDamage(adjustedDamage);
        const proposed = hpValue - adjustedDamage;
        hpValue = proposed <= 0 ? Math.max(1, Number(enemy.maxHp || hpValue || 1)) : proposed;
      },
    });
  }

  function syncEnemies() {
    const enemies = window.state?.enemies || [];
    for (const enemy of enemies) {
      if (!enemy?.__ttdPracticeEnemy) continue;
      instrumentEnemy(enemy);
      enemy.alive = true;
      enemy.statusResist = clamp(practice()?.settings?.effectResist, 0, 0.9);
      const maxHp = Math.max(1, Number(enemy.maxHp || 1));
      if (Number(enemy.hp || 0) < maxHp * 0.04) enemy.hp = maxHp;
    }
  }

  function enterPractice() {
    snapshotClasses();
    resetStats();
    attachStatObserver();
    syncSelectedPreviewClass();
    syncEnemies();
  }

  function leavePractice() {
    statObserver?.disconnect();
    statObserver = null;
    restoreClasses();
    resetStats();
  }

  document.addEventListener('click', (event) => {
    if (!practice()?.active) return;
    if (event.target?.closest?.('#ttdPracticeCombo')) resetStats();
  }, true);

  function tick() {
    const active = !!practice()?.active;
    if (active && !wasActive) enterPractice();
    if (!active && wasActive) leavePractice();
    wasActive = active;
    if (active) {
      syncSelectedPreviewClass();
      syncEnemies();
      if (stats.combo && stats.lastHitAt && now() - stats.lastHitAt > COMBO_IDLE_MS) resetStats();
      renderStats();
    }
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();