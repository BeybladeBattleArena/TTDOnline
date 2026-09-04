(() => {
  'use strict';
  if (window.__TTD_PRACTICE_MODE_V1) return;
  window.__TTD_PRACTICE_MODE_V1 = true;

  const P = {
    active: false,
    returnScreen: 'homeScreen',
    deck: [],
    odSlots: [null, null],
    ownedOd: [],
    selectedKey: null,
    previewClass: Object.create(null),
    field: 'approach',
    approaching: false,
    walkSpeed: 1,
    attacking: false,
    enemyType: 'standard',
    enemyCount: 1,
    elementalResist: 0,
    physicalResist: 0,
    effectResist: 0,
    events: [],
    stringDamage: 0,
    combo: 0,
    lastHitAt: 0,
    removeArmed: false,
    attackClock: 0,
    lastFrame: performance.now(),
    raf: 0,
    realOdApi: null,
    odFacade: null,
    hooksInstalled: false,
    base: {},
  };

  const COMBO_IDLE_MS = 2500;
  const DPS_WINDOW_MS = 3000;
  const ENEMY_TYPES = Object.freeze({
    standard: { label: 'Standard Enemy', hp: 1, size: 1, boss: false, major: false, tier: 'normal' },
    elite: { label: 'Elite Enemy', hp: 3, size: 1.12, boss: false, major: false, tier: 'elite' },
    miniboss: { label: 'Mini Boss', hp: 10, size: 1.28, boss: true, major: false, tier: 'small' },
    boss: { label: 'Boss', hp: 30, size: 1.48, boss: true, major: false, tier: 'boss' },
    major: { label: 'Major Boss', hp: 100, size: 1.72, boss: true, major: true, tier: 'major' },
  });

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, Number(value) || 0));
  const byId = (id) => document.getElementById(id);
  const ownedKeys = () => {
    try {
      return Object.keys(account?.owned || {}).filter((key) => Array.isArray(account.owned[key]) && account.owned[key].length && DICE?.[key]);
    } catch (_) { return []; }
  };
  const firstOwnedInstance = (key) => {
    try { return (account?.owned?.[key] || [])[0] || null; } catch (_) { return null; }
  };
  const entryKey = (entry) => typeof entry === 'string' ? entry : entry?.key;
  const fmt = (n) => {
    const v = Math.max(0, Number(n) || 0);
    if (v >= 1e9) return `${(v / 1e9).toFixed(v >= 1e10 ? 0 : 1)}b`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}m`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k`;
    return v >= 100 ? Math.round(v).toLocaleString() : v.toFixed(v >= 10 ? 1 : 2).replace(/\.00$/, '');
  };

  const style = document.createElement('style');
  style.id = 'ttd-practice-mode-v1-style';
  style.textContent = `
    #ttdPracticeHomeBtn{margin-top:12px;border-color:#c88734!important;background:linear-gradient(145deg,#231d19,#171824)!important;box-shadow:inset 0 0 18px rgba(242,172,57,.07),0 0 0 1px rgba(242,172,57,.08);}
    #ttdPracticeHomeBtn .icon{background:linear-gradient(145deg,#f5b24b,#d97828)!important;color:#241408!important;}
    #ttdPracticeHomeBtn .icon svg{stroke:#25160d;fill:none;stroke-width:2;}
    #ttdPracticeHomeBtn .txt h3{color:#ffe0a0!important;}
    #ttdPracticeHomeBtn .txt p{color:#a9a0ad!important;}
    #ttdPracticeDeckBtn{min-width:92px;height:34px;padding:0 10px;border:1px solid #d98b31;border-radius:9px;background:linear-gradient(180deg,#563414,#2f2117);color:#ffd991;font:800 10px 'Cinzel',serif;letter-spacing:.025em;box-shadow:0 0 8px rgba(224,137,43,.22);}
    #ttdPracticeDeckBtn:active,#ttdPracticeHomeBtn:active{filter:brightness(1.13);}

    #ttdPracticeHud{position:absolute;z-index:115;left:8px;right:8px;top:49px;display:none;grid-template-columns:repeat(3,1fr) auto;gap:5px;pointer-events:auto;}
    #gameScreen.ttdPracticeActive #ttdPracticeHud{display:grid;}
    .ttdPracticeStat{min-width:0;border:1px solid rgba(244,178,76,.36);border-radius:8px;background:rgba(10,12,22,.90);padding:5px 6px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,.28);}
    .ttdPracticeStat .k{display:block;font:800 6.5px 'Space Mono',monospace;color:#9aa4c1;letter-spacing:.07em;text-transform:uppercase;}
    .ttdPracticeStat .v{display:block;margin-top:1px;font:800 11px 'Space Mono',monospace;color:#ffe099;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    #ttdPracticeCombo{cursor:pointer;border-color:rgba(106,211,255,.46);}
    #ttdPracticeCombo .v{color:#bdefff;}
    #ttdPracticeControlsBtn{width:38px;border:1px solid #d98b31;border-radius:8px;background:linear-gradient(180deg,#44301d,#241a13);color:#ffd991;font-size:16px;}

    #ttdPracticePanel{position:absolute;z-index:130;left:7px;right:7px;bottom:7px;max-height:min(62vh,520px);display:none;overflow:auto;touch-action:pan-y;border:1px solid #66503a;border-radius:14px;background:linear-gradient(165deg,rgba(21,25,45,.985),rgba(9,12,24,.99));box-shadow:0 12px 40px rgba(0,0,0,.68);padding:10px;}
    #gameScreen.ttdPracticeActive #ttdPracticePanel.open{display:block;}
    .ttdPracticePanelHead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}
    .ttdPracticePanelTitle{font:900 13px 'Cinzel',serif;color:#ffe099;letter-spacing:.04em;}
    .ttdPracticeNoRewards{font:800 7px 'Space Mono',monospace;color:#f0a967;border:1px solid #7b512f;border-radius:999px;padding:3px 6px;white-space:nowrap;}
    .ttdPracticeClose{border:1px solid #5b617e;border-radius:8px;background:#171c34;color:#d7d9e5;padding:6px 9px;font:800 9px 'Cinzel',serif;}
    .ttdPracticeSection{border-top:1px solid #2a3156;padding-top:8px;margin-top:8px;}
    .ttdPracticeSection h4{margin:0 0 6px;font:900 9px 'Space Mono',monospace;letter-spacing:.08em;color:#8fc4e8;text-transform:uppercase;}
    .ttdPracticeGrid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
    .ttdPracticeGrid.three{grid-template-columns:repeat(3,1fr);}
    .ttdPracticeField{min-width:0;}
    .ttdPracticeField label{display:block;margin:0 0 3px;font:700 7px 'Space Mono',monospace;color:#8e97b6;text-transform:uppercase;letter-spacing:.035em;}
    .ttdPracticeField select,.ttdPracticeField input[type='number']{width:100%;height:32px;border:1px solid #394266;border-radius:8px;background:#0b1020;color:#eef0f7;padding:0 7px;font:700 9px 'Inter',sans-serif;}
    .ttdPracticeField input[type='range']{width:100%;accent-color:#e99b38;}
    .ttdPracticeToggle{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:32px;border:1px solid #394266;border-radius:8px;background:#0b1020;padding:5px 8px;color:#e5e7ef;font-size:9px;font-weight:700;}
    .ttdPracticeToggle input{accent-color:#71d38b;}
    .ttdPracticeDeckSlots{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;}
    .ttdPracticeDeckSlots select{width:100%;min-width:0;height:32px;border:1px solid #394266;border-radius:7px;background:#0b1020;color:#eef0f7;font:700 8px 'Inter',sans-serif;padding:2px;}
    .ttdPracticeOdRow{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
    .ttdPracticeOdSlot{display:grid;grid-template-columns:1fr auto;gap:4px;}
    .ttdPracticeOdSlot select{min-width:0;height:32px;border:1px solid #286c96;border-radius:8px;background:#0a1b2e;color:#dff7ff;font-size:8.5px;padding:0 5px;}
    .ttdPracticeCast{border:1px solid #bd79df;border-radius:8px;background:linear-gradient(180deg,#6b417a,#3d274b);color:#f6ddff;font:900 8px 'Space Mono',monospace;padding:0 8px;}
    .ttdPracticeClassRow{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
    .ttdPracticeClassBtn{height:30px;border:1px solid #3e486b;border-radius:7px;background:#11172b;color:#9ea7c1;font:900 8px 'Space Mono',monospace;}
    .ttdPracticeClassBtn.on{border-color:#e7b259;background:linear-gradient(180deg,#5a411d,#352715);color:#ffe6a8;box-shadow:0 0 7px rgba(230,175,83,.22);}
    .ttdPracticeActions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;}
    .ttdPracticeAction{min-height:34px;border:1px solid #4d587c;border-radius:8px;background:#171d35;color:#e8eaf2;font:900 9px 'Cinzel',serif;}
    .ttdPracticeAction.primary{border-color:#e69b3e;background:linear-gradient(180deg,#f0bd61,#c77b2b);color:#241509;}
    .ttdPracticeAction.armed{border-color:#e2584f;background:#4a2024;color:#ffd6d2;box-shadow:0 0 9px rgba(226,88,79,.35);}
    .ttdPracticeReadout{font:800 8px 'Space Mono',monospace;color:#ffe099;float:right;}
    #gameScreen.ttdPracticeActive #summonCost{color:#ffe099!important;}
    #gameScreen.ttdPracticeActive #livesVal{font-size:0;}
    #gameScreen.ttdPracticeActive #livesVal::after{content:'∞';font-size:14px;}
    #laneWrap.ttdPracticeApproach{background:radial-gradient(90% 90% at 50% 0%,rgba(91,98,170,.16),transparent 62%),linear-gradient(180deg,#101629,#090d18)!important;}
    #laneWrap.ttdPracticeRetro{background:#14182a!important;}
    #laneWrap.ttdPracticeAdventure{background:#101827!important;}
    #ttdPracticeBackdrop{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;}
    #gameScreen.ttdPracticeActive #laneCanvas{z-index:2;background:transparent!important;}
    #gameScreen.ttdPracticeActive #toast{z-index:7;}
    #laneWrap.ttdPracticeEnemyAttack{box-shadow:inset 0 0 26px rgba(226,88,79,.38);}
    @media(max-width:390px){#ttdPracticeHud{left:5px;right:5px;gap:3px}.ttdPracticeStat{padding:4px 3px}.ttdPracticeStat .v{font-size:9.5px}#ttdPracticePanel{left:4px;right:4px;bottom:4px}.ttdPracticeDeckSlots{gap:2px}.ttdPracticeDeckSlots select{font-size:7.5px}}
  `;
  document.head.appendChild(style);

  function mountEntryButtons() {
    const homeDeck = byId('btnDeck');
    if (homeDeck && !byId('ttdPracticeHomeBtn')) {
      const card = document.createElement('div');
      card.id = 'ttdPracticeHomeBtn';
      card.className = 'menuCard practice';
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.innerHTML = `<div class="icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"></circle><path d="M12 2v4M12 18v4M2 12h4M18 12h4M9 12l2 2 4-5"></path></svg></div><div class="txt"><h3>Practice Mode</h3><p>Training Lab · infinite resources · no rewards</p></div>`;
      homeDeck.insertAdjacentElement('afterend', card);
      card.addEventListener('click', openPractice);
      card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPractice(); } });
    }

    const topbar = document.querySelector('#deckScreen > .topbar');
    if (topbar && !byId('ttdPracticeDeckBtn')) {
      const holder = topbar.lastElementChild || document.createElement('div');
      holder.style.width = 'auto'; holder.style.minWidth = '92px'; holder.style.display = 'flex'; holder.style.justifyContent = 'flex-end';
      const button = document.createElement('button');
      button.id = 'ttdPracticeDeckBtn'; button.type = 'button'; button.textContent = 'Practice';
      holder.replaceChildren(button);
      if (!holder.parentNode) topbar.appendChild(holder);
      button.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); openPractice(); });
    }
  }

  function installHooks() {
    if (P.hooksInstalled) return true;
    if (typeof damageEnemy !== 'function' || typeof slottedClassOf !== 'function' || typeof enemyRenderPos !== 'function' || typeof progressFrac !== 'function') return false;
    P.hooksInstalled = true;
    P.base.damageEnemy = damageEnemy;
    P.base.slottedClassOf = slottedClassOf;
    P.base.enemyRenderPos = enemyRenderPos;
    P.base.progressFrac = progressFrac;
    P.base.updateSpawns = typeof updateSpawns === 'function' ? updateSpawns : null;
    P.base.updateZombieSpawning = typeof updateZombieSpawning === 'function' ? updateZombieSpawning : null;

    slottedClassOf = function practiceSlottedClassOf(key) {
      if (P.active && P.previewClass[key]) return P.previewClass[key];
      return P.base.slottedClassOf.apply(this, arguments);
    };

    enemyRenderPos = function practiceEnemyRenderPos(enemy) {
      if (P.active && enemy?.__ttdPracticeEnemy && P.field === 'approach') {
        const idx = Number(enemy.__ttdPracticeIndex || 0), count = Math.max(1, P.enemyCount);
        const columns = Math.min(5, count), row = Math.floor(idx / columns), col = idx % columns;
        const xSpread = Math.min(Number(cw || 300) * 0.12, 38);
        const x = Number(cw || 300) * 0.5 + (col - (Math.min(columns, count - row * columns) - 1) / 2) * xSpread;
        const y = Number(ch || 200) * (0.10 + clamp(enemy.__ttdPracticeProgress, 0, 1) * 0.72) + row * 10;
        return { x, y };
      }
      return P.base.enemyRenderPos.apply(this, arguments);
    };

    progressFrac = function practiceProgressFrac(enemy) {
      if (P.active && enemy?.__ttdPracticeEnemy) return clamp(enemy.__ttdPracticeProgress, 0, 1);
      return P.base.progressFrac.apply(this, arguments);
    };

    damageEnemy = function practiceDamageEnemy(enemy, amount, category, affinities, meta) {
      let adjusted = Number(amount) || 0;
      if (P.active && enemy?.__ttdPracticeEnemy) {
        if (category === 'physical') adjusted *= (1 - P.physicalResist);
        const elements = affinities && typeof affinities === 'object' ? Object.entries(affinities).filter(([key, value]) => key && key !== '__nonelemental' && Number(value) > 0) : [];
        if (elements.length) adjusted *= (1 - P.elementalResist);
        enemy.statusResist = P.effectResist;
      }
      const before = Number(enemy?.hp || 0);
      const out = P.base.damageEnemy.call(this, enemy, adjusted, category, affinities, meta);
      if (P.active && enemy?.__ttdPracticeEnemy) {
        const dealt = Math.max(0, before - Number(enemy.hp || 0));
        if (dealt > 0) recordDamage(dealt);
        if (!enemy.alive || enemy.hp < 1e6) { enemy.alive = true; enemy.hp = enemy.maxHp; }
      }
      return out;
    };

    if (P.base.updateSpawns) updateSpawns = function practiceUpdateSpawns(dt) { if (P.active) return; return P.base.updateSpawns.call(this, dt); };
    if (P.base.updateZombieSpawning) updateZombieSpawning = function practiceUpdateZombieSpawning(dt) { if (P.active) return; return P.base.updateZombieSpawning.call(this, dt); };
    return true;
  }

  function installOdFacade() {
    const api = window.__TTD_OVERDRIVE;
    if (!api || P.realOdApi) return;
    P.realOdApi = api;
    P.odFacade = new Proxy(api, {
      get(target, prop, receiver) {
        if (!P.active) return Reflect.get(target, prop, receiver);
        if (prop === 'equipped') return () => P.odSlots.slice();
        if (prop === 'drive') return () => ({ current: 100, max: 100, ready: true });
        if (prop === 'dp') return () => ({ current: 999999999, max: 999999999 });
        if (prop === 'spendDp') return () => true;
        if (prop === 'resetDrive') return () => {};
        if (prop === 'playerStats') return () => ({ ...(target.playerStats?.() || {}), hp: 999999999, dp: 999999999 });
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
    window.__TTD_OVERDRIVE = P.odFacade;
  }

  function restoreOdFacade() {
    if (P.realOdApi && window.__TTD_OVERDRIVE === P.odFacade) window.__TTD_OVERDRIVE = P.realOdApi;
    P.realOdApi = null; P.odFacade = null;
  }

  async function discoverOwnedOd() {
    const equipped = [];
    try {
      for (const deck of account?.overdriveDecks || []) for (const key of deck || []) if (key && !equipped.includes(key)) equipped.push(key);
    } catch (_) {}
    const catalog = (P.realOdApi || window.__TTD_OVERDRIVE)?.catalog?.()?.dice || {};
    const found = new Set(equipped.filter((key) => catalog[key]));
    const switcher = byId('ttdCollectionKindSwitch');
    const over = switcher?.querySelector('.overdrive');
    const normal = switcher?.querySelector('.normal');
    if (over) {
      try {
        over.click();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const byName = new Map(Object.entries(catalog).map(([key, def]) => [String(def?.name || key).trim(), key]));
        document.querySelectorAll('#collectionGrid .ttdOdCard .cname').forEach((node) => {
          const key = byName.get(String(node.textContent || '').trim()); if (key) found.add(key);
        });
      } catch (_) {}
      try { normal?.click(); } catch (_) {}
    }
    P.ownedOd = [...found];
    refreshPracticeUi();
  }

  function initialPracticeDeck() {
    const owned = ownedKeys();
    const source = Array.isArray(account?.decks?.[account.activeDeckIdx]) ? account.decks[account.activeDeckIdx] : [];
    const out = source.filter((entry) => {
      const key = entryKey(entry); return key && owned.includes(key) && firstOwnedInstance(key);
    }).map((entry) => ({ key: entryKey(entry), instId: entry?.instId || firstOwnedInstance(entryKey(entry))?.id })).slice(0, 5);
    for (const key of owned) {
      if (out.length >= 5) break;
      if (out.some((entry) => entry.key === key)) continue;
      const inst = firstOwnedInstance(key); if (inst) out.push({ key, instId: inst.id });
    }
    return out;
  }

  function ensureAutoGobDefinition() {
    try {
      const base = MONSTERS.goblin || {};
      MONSTERS.autogob01 = {
        ...base,
        name: 'Auto-Gob01', hp: 1000000000000, speed: 0, r: 8,
        weak: [], resist: [], skills: [],
      };
    } catch (_) {}
  }

  function makePracticeEnemy(index) {
    ensureAutoGobDefinition();
    const t = ENEMY_TYPES[P.enemyType] || ENEMY_TYPES.standard;
    const maxHp = 1000000000000 * t.hp;
    let skills = [];
    try {
      if (P.attacking) skills = (MONSTERS.goblin?.skills || []).map((skill) => ({ ...skill, cd: 0.6 + Math.random() * 0.5 }));
      if (MONSTERS.autogob01) MONSTERS.autogob01.r = 8 * t.size;
    } catch (_) {}
    return {
      key: 'autogob01', kind: 'practice', tier: t.tier,
      hp: maxHp, maxHp, dist: 0, speed: 0,
      slowTimers: [], armorBreaks: [], slowMult: 1, poison: null, statuses: null,
      isBoss: !!t.boss, majorBoss: !!t.major, isMajorBoss: !!t.major, bossTier: t.major ? 'major' : (t.boss ? 'boss' : null),
      alive: true, hitFlash: 0, dmgReduction: 0, statusResist: P.effectResist,
      dmgMult: 1, skills, pausedT: P.attacking ? 0 : 999999, atk: 5,
      lift: null, noCoin: true,
      __ttdPracticeEnemy: true, __ttdPracticeIndex: index,
      __ttdPracticeProgress: P.approaching ? 0 : 0.5,
    };
  }

  function rebuildEnemies(resetProgress = false) {
    if (!P.active || !state) return;
    const oldProgress = !resetProgress ? (state.enemies || []).filter((e) => e?.__ttdPracticeEnemy).map((e) => Number(e.__ttdPracticeProgress || 0.5)) : [];
    state.enemies = [];
    for (let i = 0; i < P.enemyCount; i++) {
      const enemy = makePracticeEnemy(i);
      if (oldProgress[i] != null) enemy.__ttdPracticeProgress = oldProgress[i];
      state.enemies.push(enemy);
    }
    syncEnemyPositions();
    try { renderBoard?.(); } catch (_) {}
  }

  function syncEnemyPositions() {
    if (!P.active || !state) return;
    const len = Math.max(1, Number(totalLen || 1));
    for (const enemy of state.enemies || []) {
      if (!enemy?.__ttdPracticeEnemy) continue;
      enemy.alive = true;
      enemy.statusResist = P.effectResist;
      enemy.speed = 0;
      enemy.pausedT = P.attacking ? Math.min(Number(enemy.pausedT || 0), 0.05) : 999999;
      if (!P.attacking) enemy.skills = [];
      else if (!enemy.skills?.length) {
        try { enemy.skills = (MONSTERS.goblin?.skills || []).map((skill) => ({ ...skill, cd: 0.4 + Math.random() * 0.5 })); } catch (_) {}
      }
      enemy.dist = len * clamp(enemy.__ttdPracticeProgress, 0, 1);
    }
  }

  function recordDamage(amount) {
    const t = performance.now();
    if (P.lastHitAt && t - P.lastHitAt > COMBO_IDLE_MS) resetCombo();
    P.lastHitAt = t;
    P.combo += 1;
    P.stringDamage += amount;
    P.events.push({ t, amount });
    P.events = P.events.filter((event) => t - event.t <= DPS_WINDOW_MS);
    updateStats();
  }

  function resetCombo() {
    P.combo = 0; P.stringDamage = 0; P.lastHitAt = 0; P.events = [];
    updateStats();
  }

  function liveDps() {
    const t = performance.now();
    P.events = P.events.filter((event) => t - event.t <= DPS_WINDOW_MS);
    if (!P.events.length) return 0;
    const span = Math.max(250, Math.min(DPS_WINDOW_MS, t - P.events[0].t + 120));
    return P.events.reduce((sum, event) => sum + event.amount, 0) / (span / 1000);
  }

  function updateStats() {
    const dps = byId('ttdPracticeDpsVal'), damage = byId('ttdPracticeDamageVal'), combo = byId('ttdPracticeComboVal');
    if (dps) dps.textContent = fmt(liveDps());
    if (damage) damage.textContent = fmt(P.stringDamage);
    if (combo) combo.textContent = `${P.combo} HIT${P.combo === 1 ? '' : 'S'}`;
  }

  function installPracticeHud() {
    const game = byId('gameScreen'); if (!game) return;
    if (!byId('ttdPracticeHud')) {
      const hud = document.createElement('div');
      hud.id = 'ttdPracticeHud';
      hud.innerHTML = `<button type="button" class="ttdPracticeStat" id="ttdPracticeDps"><span class="k">Live DPS</span><span class="v" id="ttdPracticeDpsVal">0</span></button><button type="button" class="ttdPracticeStat" id="ttdPracticeDamage"><span class="k">String Damage</span><span class="v" id="ttdPracticeDamageVal">0</span></button><button type="button" class="ttdPracticeStat" id="ttdPracticeCombo"><span class="k">Combo · Tap Reset</span><span class="v" id="ttdPracticeComboVal">0 HITS</span></button><button type="button" id="ttdPracticeControlsBtn" aria-label="Practice controls">☰</button>`;
      game.appendChild(hud);
      byId('ttdPracticeCombo')?.addEventListener('click', resetCombo);
      byId('ttdPracticeControlsBtn')?.addEventListener('click', () => byId('ttdPracticePanel')?.classList.toggle('open'));
    }
    if (!byId('ttdPracticePanel')) {
      const panel = document.createElement('div'); panel.id = 'ttdPracticePanel'; panel.className = 'open'; game.appendChild(panel);
    }
    ensureBackdrop();
  }

  function ownedOptions(selected, blankLabel = '— Empty —') {
    const keys = ownedKeys();
    return `<option value="">${esc(blankLabel)}</option>` + keys.map((key) => `<option value="${esc(key)}"${key === selected ? ' selected' : ''}>${esc(DICE[key]?.name || key)}</option>`).join('');
  }
  function odOptions(selected) {
    const catalog = (P.realOdApi || window.__TTD_OVERDRIVE)?.catalog?.()?.dice || {};
    return `<option value="">— Empty —</option>` + P.ownedOd.filter((key) => catalog[key]).map((key) => `<option value="${esc(key)}"${key === selected ? ' selected' : ''}>${esc(catalog[key]?.name || key)}</option>`).join('');
  }

  function refreshPracticeUi() {
    if (!P.active) return;
    const panel = byId('ttdPracticePanel'); if (!panel) return;
    const selected = P.selectedKey || ownedKeys()[0] || '';
    P.selectedKey = selected || null;
    const cls = selected ? (P.previewClass[selected] || firstOwnedInstance(selected)?.cls || 1) : 1;
    panel.innerHTML = `
      <div class="ttdPracticePanelHead"><div><div class="ttdPracticePanelTitle">Practice Lab</div><span class="ttdPracticeNoRewards">∞ HP · ∞ DP · 100% DRIVE · NO REWARDS</span></div><button type="button" class="ttdPracticeClose" id="ttdPracticeExit">Exit</button></div>
      <div class="ttdPracticeSection"><h4>Live Deck · temporary</h4><div class="ttdPracticeDeckSlots">${[0,1,2,3,4].map((i) => `<select data-practice-deck="${i}" aria-label="Practice deck slot ${i + 1}">${ownedOptions(entryKey(P.deck[i]))}</select>`).join('')}</div></div>
      <div class="ttdPracticeSection"><h4>Die Lab</h4><div class="ttdPracticeGrid"><div class="ttdPracticeField"><label>Selected die</label><select id="ttdPracticeSelectedDie">${ownedOptions(selected, 'No owned dice')}</select></div><div class="ttdPracticeField"><label>Preview class</label><div style="height:32px;display:flex;align-items:center;color:#ffe099;font:900 10px 'Space Mono',monospace;">C${cls} · preview only</div></div></div><div class="ttdPracticeClassRow" style="margin-top:6px;">${[1,2,3,4,5,6,7].map((n) => `<button type="button" class="ttdPracticeClassBtn${n === Number(cls) ? ' on' : ''}" data-practice-class="${n}">C${n}</button>`).join('')}</div><div class="ttdPracticeActions"><button type="button" class="ttdPracticeAction primary" id="ttdPracticeSummon">Summon Selected</button><button type="button" class="ttdPracticeAction${P.removeArmed ? ' armed' : ''}" id="ttdPracticeRemove">${P.removeArmed ? 'Tap Board Die…' : 'Remove Die'}</button></div></div>
      <div class="ttdPracticeSection"><h4>Overdrive · owned dice only</h4><div class="ttdPracticeOdRow">${[0,1].map((i) => `<div class="ttdPracticeOdSlot"><select data-practice-od="${i}">${odOptions(P.odSlots[i])}</select><button type="button" class="ttdPracticeCast" data-practice-cast="${i}"${P.odSlots[i] ? '' : ' disabled'}>CAST</button></div>`).join('')}</div></div>
      <div class="ttdPracticeSection"><h4>Auto-Gob01</h4><div class="ttdPracticeGrid"><div class="ttdPracticeField"><label>Enemy type</label><select id="ttdPracticeEnemyType">${Object.entries(ENEMY_TYPES).map(([key, cfg]) => `<option value="${key}"${P.enemyType === key ? ' selected' : ''}>${cfg.label}</option>`).join('')}</select></div><div class="ttdPracticeField"><label>Field type</label><select id="ttdPracticeField"><option value="adventure"${P.field === 'adventure' ? ' selected' : ''}>Adventure Map</option><option value="retro"${P.field === 'retro' ? ' selected' : ''}>Retro Tower Defense</option><option value="approach"${P.field === 'approach' ? ' selected' : ''}>Enemy Approach</option></select></div></div>
      <div class="ttdPracticeGrid" style="margin-top:6px;"><div class="ttdPracticeToggle"><span>Approach AI</span><input id="ttdPracticeApproach" type="checkbox"${P.approaching ? ' checked' : ''}></div><div class="ttdPracticeToggle"><span>Attack</span><input id="ttdPracticeAttack" type="checkbox"${P.attacking ? ' checked' : ''}></div></div>
      <div class="ttdPracticeGrid" style="margin-top:6px;"><div class="ttdPracticeField"><label>Enemies <span class="ttdPracticeReadout" id="ttdPracticeCountRead">${P.enemyCount}/10</span></label><input id="ttdPracticeCount" type="range" min="1" max="10" step="1" value="${P.enemyCount}"></div><div class="ttdPracticeField"><label>Walk speed <span class="ttdPracticeReadout" id="ttdPracticeSpeedRead">${P.walkSpeed.toFixed(2)}×</span></label><input id="ttdPracticeSpeed" type="range" min="0.25" max="3" step="0.05" value="${P.walkSpeed}"></div></div>
      <div class="ttdPracticeGrid three" style="margin-top:6px;"><div class="ttdPracticeField"><label>Element <span class="ttdPracticeReadout">${Math.round(P.elementalResist * 100)}%</span></label><input id="ttdPracticeElementRes" type="range" min="0" max="90" step="5" value="${Math.round(P.elementalResist * 100)}"></div><div class="ttdPracticeField"><label>Physical <span class="ttdPracticeReadout">${Math.round(P.physicalResist * 100)}%</span></label><input id="ttdPracticePhysicalRes" type="range" min="0" max="90" step="5" value="${Math.round(P.physicalResist * 100)}"></div><div class="ttdPracticeField"><label>Effect <span class="ttdPracticeReadout">${Math.round(P.effectResist * 100)}%</span></label><input id="ttdPracticeEffectRes" type="range" min="0" max="90" step="5" value="${Math.round(P.effectResist * 100)}"></div></div></div>`;

    byId('ttdPracticeExit')?.addEventListener('click', closePractice);
    panel.querySelectorAll('[data-practice-deck]').forEach((select) => select.addEventListener('change', () => changeDeckSlot(Number(select.dataset.practiceDeck), select.value)));
    byId('ttdPracticeSelectedDie')?.addEventListener('change', (event) => { P.selectedKey = event.target.value || null; refreshPracticeUi(); });
    panel.querySelectorAll('[data-practice-class]').forEach((button) => button.addEventListener('click', () => setPreviewClass(Number(button.dataset.practiceClass))));
    byId('ttdPracticeSummon')?.addEventListener('click', summonSelected);
    byId('ttdPracticeRemove')?.addEventListener('click', () => { P.removeArmed = !P.removeArmed; refreshPracticeUi(); });
    panel.querySelectorAll('[data-practice-od]').forEach((select) => select.addEventListener('change', () => { P.odSlots[Number(select.dataset.practiceOd)] = select.value || null; refreshPracticeUi(); }));
    panel.querySelectorAll('[data-practice-cast]').forEach((button) => button.addEventListener('click', () => { byId('ttdPracticePanel')?.classList.remove('open'); window.__TTD_OVERDRIVE_ABILITIES?.activateSlot?.(Number(button.dataset.practiceCast)); }));
    byId('ttdPracticeEnemyType')?.addEventListener('change', (event) => { P.enemyType = event.target.value; rebuildEnemies(); refreshPracticeUi(); });
    byId('ttdPracticeField')?.addEventListener('change', (event) => { P.field = event.target.value; applyField(true); refreshPracticeUi(); });
    byId('ttdPracticeApproach')?.addEventListener('change', (event) => { P.approaching = !!event.target.checked; for (const e of state?.enemies || []) if (e.__ttdPracticeEnemy) e.__ttdPracticeProgress = P.approaching ? 0 : 0.5; syncEnemyPositions(); });
    byId('ttdPracticeAttack')?.addEventListener('change', (event) => { P.attacking = !!event.target.checked; rebuildEnemies(); });
    byId('ttdPracticeCount')?.addEventListener('input', (event) => { P.enemyCount = clamp(event.target.value, 1, 10); const read = byId('ttdPracticeCountRead'); if (read) read.textContent = `${P.enemyCount}/10`; rebuildEnemies(); });
    byId('ttdPracticeSpeed')?.addEventListener('input', (event) => { P.walkSpeed = clamp(event.target.value, 0.25, 3); const read = byId('ttdPracticeSpeedRead'); if (read) read.textContent = `${P.walkSpeed.toFixed(2)}×`; });
    const resistance = (id, prop) => byId(id)?.addEventListener('input', (event) => { P[prop] = clamp(event.target.value, 0, 90) / 100; for (const e of state?.enemies || []) if (e.__ttdPracticeEnemy) e.statusResist = P.effectResist; const label = event.target.closest('.ttdPracticeField')?.querySelector('.ttdPracticeReadout'); if (label) label.textContent = `${Math.round(P[prop] * 100)}%`; });
    resistance('ttdPracticeElementRes', 'elementalResist'); resistance('ttdPracticePhysicalRes', 'physicalResist'); resistance('ttdPracticeEffectRes', 'effectResist');
  }

  function changeDeckSlot(index, key) {
    if (!P.active) return;
    if (!key) P.deck[index] = null;
    else {
      const inst = firstOwnedInstance(key); if (!inst) return;
      P.deck[index] = { key, instId: inst.id };
      if (!P.previewClass[key]) P.previewClass[key] = clamp(inst.cls || 1, 1, 7);
    }
    while (P.deck.length < 5) P.deck.push(null);
    state.deck = P.deck.filter(Boolean).map((entry) => ({ ...entry }));
    try { renderDeckTray?.(); } catch (_) {}
  }

  function setPreviewClass(cls) {
    const key = P.selectedKey; if (!key) return;
    P.previewClass[key] = clamp(cls, 1, 7);
    for (const die of state?.board || []) {
      if (!die || die.key !== key) continue;
      die._canonClassOverride = P.previewClass[key];
      die.cls = P.previewClass[key];
      try { if (typeof refreshDieHp === 'function') refreshDieHp(die); } catch (_) {}
    }
    try { renderBoard?.(); } catch (_) {}
    refreshPracticeUi();
  }

  function summonSelected() {
    if (!P.active || !state?.running) return;
    const key = P.selectedKey; if (!key || !firstOwnedInstance(key)) return;
    const empty = []; state.board.forEach((die, index) => { if (!die) empty.push(index); });
    if (!empty.length) { try { toast?.('Board full'); } catch (_) {} return; }
    const index = empty[0], die = makeDie(key), cls = P.previewClass[key] || firstOwnedInstance(key)?.cls || 1;
    die._canonClassOverride = clamp(cls, 1, 7); die.cls = clamp(cls, 1, 7);
    state.board[index] = die;
    try { renderBoard?.(); } catch (_) {}
  }

  function boardRemoveCapture(event) {
    if (!P.active || !P.removeArmed) return;
    const tile = event.target?.closest?.('#board .tile'); if (!tile) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    const tiles = [...document.querySelectorAll('#board .tile')], index = tiles.indexOf(tile);
    if (index >= 0 && state?.board?.[index]) { state.board[index] = null; try { renderBoard?.(); } catch (_) {} }
    P.removeArmed = false; refreshPracticeUi();
  }

  function summonCapture(event) {
    if (!P.active) return;
    const button = event.target?.closest?.('#summonBtn'); if (!button) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); summonSelected();
  }
  document.addEventListener('click', boardRemoveCapture, true);
  document.addEventListener('click', summonCapture, true);

  function ensureBackdrop() {
    const lane = byId('laneWrap'); if (!lane) return null;
    let canvas = byId('ttdPracticeBackdrop');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'ttdPracticeBackdrop'; lane.insertBefore(canvas, lane.firstChild); }
    const rect = lane.getBoundingClientRect(), dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d'); if (!ctx) return null; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { canvas, ctx, w: rect.width, h: rect.height };
  }

  function drawBackdrop() {
    const pack = ensureBackdrop(); if (!pack || !P.active) return;
    const { ctx, w, h } = pack; ctx.clearRect(0, 0, w, h);
    if (P.field === 'adventure') {
      const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#1f2941'); sky.addColorStop(.46, '#48586a'); sky.addColorStop(.47, '#3c4639'); sky.addColorStop(1, '#20271f'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(10,14,19,.55)'; ctx.beginPath(); ctx.moveTo(0,h*.48); ctx.lineTo(w*.13,h*.29); ctx.lineTo(w*.27,h*.46); ctx.lineTo(w*.42,h*.25); ctx.lineTo(w*.59,h*.46); ctx.lineTo(w*.76,h*.31); ctx.lineTo(w,h*.48); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(211,184,121,.15)'; ctx.beginPath(); ctx.moveTo(w*.44,h*.48); ctx.lineTo(w*.56,h*.48); ctx.lineTo(w*.90,h); ctx.lineTo(w*.10,h); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(235,206,143,.25)'; ctx.lineWidth = 1.2; for (let i=0;i<5;i++){const y=h*(.53+i*.105), inset=w*(.41-i*.075);ctx.beginPath();ctx.moveTo(inset,y);ctx.lineTo(w-inset,y);ctx.stroke();}
      for (let side of [0,1]) for (let i=0;i<5;i++){const x=(side? w*.76:w*.24)+(side?1:-1)*i*8, y=h*(.48+i*.10), s=5+i*2;ctx.fillStyle='rgba(19,34,26,.76)';ctx.beginPath();ctx.moveTo(x,y-s*2);ctx.lineTo(x-s,y+s);ctx.lineTo(x+s,y+s);ctx.closePath();ctx.fill();}
    } else if (P.field === 'retro') {
      ctx.fillStyle = '#151a2d'; ctx.fillRect(0,0,w,h); ctx.strokeStyle='rgba(126,137,189,.13)';ctx.lineWidth=1;for(let x=0;x<w;x+=22){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=22){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    } else {
      const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#111a2e');grad.addColorStop(1,'#090c16');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(137,151,216,.14)';ctx.lineWidth=1;for(let i=1;i<6;i++){ctx.beginPath();ctx.moveTo(w*i/6,0);ctx.lineTo(w*i/6,h);ctx.stroke();}for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(0,h*i/5);ctx.lineTo(w,h*i/5);ctx.stroke();}ctx.strokeStyle='rgba(240,181,82,.22)';ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(w*.18,h*.5);ctx.lineTo(w*.82,h*.5);ctx.stroke();ctx.setLineDash([]);
    }
  }

  function installAdventurePath() {
    const w = Math.max(1, Number(cw || byId('laneWrap')?.clientWidth || 300));
    const h = Math.max(1, Number(ch || byId('laneWrap')?.clientHeight || 200));
    pathPts = [
      {x:w*.50,y:h*.20},{x:w*.25,y:h*.30},{x:w*.72,y:h*.40},{x:w*.28,y:h*.52},{x:w*.75,y:h*.64},{x:w*.32,y:h*.76},{x:w*.68,y:h*.88}
    ];
    segLens = []; totalLen = 0;
    for (let i=1;i<pathPts.length;i++){const dx=pathPts[i].x-pathPts[i-1].x,dy=pathPts[i].y-pathPts[i-1].y,len=Math.hypot(dx,dy);segLens.push(len);totalLen+=len;}
    towerPos = pathPts[pathPts.length-1];
  }

  function applyField(reset = false) {
    if (!P.active) return;
    const lane = byId('laneWrap'); if (!lane) return;
    lane.classList.toggle('ttdPracticeApproach', P.field === 'approach');
    lane.classList.toggle('ttdPracticeRetro', P.field === 'retro');
    lane.classList.toggle('ttdPracticeAdventure', P.field === 'adventure');
    try {
      if (P.field === 'adventure') installAdventurePath();
      else if (typeof buildPath === 'function') buildPath(Number(cw || lane.clientWidth || 300), Number(ch || lane.clientHeight || 200));
    } catch (_) {}
    if (reset) for (const enemy of state?.enemies || []) if (enemy.__ttdPracticeEnemy) enemy.__ttdPracticeProgress = P.approaching ? 0 : 0.5;
    syncEnemyPositions(); drawBackdrop();
  }

  function tickPractice(nowMs) {
    if (!P.active) return;
    const dt = Math.min(.05, Math.max(0, (nowMs - P.lastFrame) / 1000)); P.lastFrame = nowMs;
    if (state) {
      state.running = true; state.sp = 999999999; state.summonCost = 0; state.lives = 999999999; state.livesMax = 999999999; state.spawnQueue = [];
      const practiceEnemies = (state.enemies || []).filter((e) => e?.__ttdPracticeEnemy);
      if (practiceEnemies.length !== P.enemyCount) rebuildEnemies();
      if (P.approaching) {
        const advance = dt * 0.075 * P.walkSpeed;
        for (const enemy of practiceEnemies) { enemy.__ttdPracticeProgress += advance; if (enemy.__ttdPracticeProgress > .94) enemy.__ttdPracticeProgress = 0; }
      } else for (const enemy of practiceEnemies) enemy.__ttdPracticeProgress = 0.5;
      syncEnemyPositions();
      try { const sp = byId('spVal'); if (sp) sp.textContent = '∞'; const cost = byId('summonCost'); if (cost) cost.textContent = '∞ SP'; } catch (_) {}
    }
    if (P.combo && P.lastHitAt && nowMs - P.lastHitAt > COMBO_IDLE_MS) resetCombo();
    if (P.attacking) {
      P.attackClock += dt;
      if (P.attackClock >= 1.8) { P.attackClock = 0; const lane = byId('laneWrap'); lane?.classList.add('ttdPracticeEnemyAttack'); setTimeout(() => lane?.classList.remove('ttdPracticeEnemyAttack'), 180); }
    } else P.attackClock = 0;
    updateStats(); drawBackdrop();
    P.raf = requestAnimationFrame(tickPractice);
  }

  function openPractice() {
    if (P.active) return;
    if (!installHooks()) { setTimeout(openPractice, 80); return; }
    const owned = ownedKeys(); if (!owned.length) { try { toastGlobal?.('You need at least one owned die to enter Practice Mode.'); } catch (_) {} return; }
    installPracticeHud();
    P.active = true; window.__TTD_PRACTICE_ACTIVE__ = true;
    P.returnScreen = document.querySelector('.screen.active')?.id || 'homeScreen';
    P.deck = initialPracticeDeck(); while (P.deck.length < 5) P.deck.push(null);
    P.selectedKey = entryKey(P.deck.find(Boolean)) || owned[0];
    for (const key of owned) P.previewClass[key] = clamp(firstOwnedInstance(key)?.cls || 1, 1, 7);
    try {
      const activeOd = Array.isArray(account?.overdriveDecks?.[account.activeDeckIdx]) ? account.overdriveDecks[account.activeDeckIdx] : [];
      P.odSlots = [activeOd[0] || null, activeOd[1] || null];
    } catch (_) { P.odSlots = [null, null]; }
    installOdFacade();
    try {
      state = freshState('endlesshorde');
      state.__ttdPracticeMode = true;
      state.zombieMode = false;
      state.deck = P.deck.filter(Boolean).map((entry) => ({ ...entry }));
      state.spawnQueue = []; state.wave = 1; state.kills = 0; state.sp = 999999999; state.summonCost = 0; state.lives = 999999999; state.livesMax = 999999999;
      state.showPlayerHpBar = true; state.playerHpLabel = 'Practice HP';
      document.querySelectorAll('.screen.active').forEach((screen) => screen.classList.remove('active'));
      byId('gameScreen')?.classList.add('active', 'ttdPracticeActive');
      try { modeLabel.textContent = 'PRACTICE MODE'; } catch (_) {}
      try { buildBoardDOM(); } catch (_) {}
      try { renderDeckTray(); renderHUD(); renderBoard(); } catch (_) {}
      const overlay = document.querySelector('#gameScreen .overlay.show'); overlay?.classList.remove('show');
    } catch (error) {
      console.error('Practice Mode could not initialize battle state.', error); P.active = false; window.__TTD_PRACTICE_ACTIVE__ = false; restoreOdFacade(); return;
    }
    resetCombo();
    rebuildEnemies(true);
    applyField(true);
    refreshPracticeUi();
    byId('ttdPracticePanel')?.classList.add('open');
    P.lastFrame = performance.now(); cancelAnimationFrame(P.raf); P.raf = requestAnimationFrame(tickPractice);
    discoverOwnedOd();
  }

  function closePractice() {
    if (!P.active) return;
    P.active = false; window.__TTD_PRACTICE_ACTIVE__ = false;
    cancelAnimationFrame(P.raf); P.raf = 0;
    restoreOdFacade();
    const game = byId('gameScreen'); game?.classList.remove('ttdPracticeActive');
    const panel = byId('ttdPracticePanel'); panel?.classList.remove('open');
    const lane = byId('laneWrap'); lane?.classList.remove('ttdPracticeApproach','ttdPracticeRetro','ttdPracticeAdventure','ttdPracticeEnemyAttack');
    try { state.running = false; } catch (_) {}
    document.querySelectorAll('.screen.active').forEach((screen) => screen.classList.remove('active'));
    const restore = byId(P.returnScreen) || byId('homeScreen'); restore?.classList.add('active');
    try {
      if (restore?.id === 'homeScreen' && typeof renderHome === 'function') renderHome();
      if (restore?.id === 'deckScreen' && typeof renderDeckScreen === 'function') renderDeckScreen();
    } catch (_) {}
    P.deck = []; P.ownedOd = []; P.removeArmed = false; resetCombo();
  }

  window.__TTD_PRACTICE = Object.freeze({
    open: openPractice,
    close: closePractice,
    get active() { return P.active; },
    get settings() { return { field: P.field, approaching: P.approaching, walkSpeed: P.walkSpeed, attacking: P.attacking, enemyType: P.enemyType, enemyCount: P.enemyCount, elementalResist: P.elementalResist, physicalResist: P.physicalResist, effectResist: P.effectResist }; },
  });

  let attempts = 0;
  const boot = () => {
    attempts += 1;
    mountEntryButtons(); installPracticeHud(); installHooks();
    if ((!byId('btnDeck') || !byId('deckScreen') || !P.hooksInstalled) && attempts < 240) setTimeout(boot, 50);
  };
  boot();
  new MutationObserver(mountEntryButtons).observe(document.documentElement, { childList: true, subtree: true });
})();