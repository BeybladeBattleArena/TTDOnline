(() => {
  'use strict';
  if (window.__TTD_OVERDRIVE_SYSTEM_V1) return;
  window.__TTD_OVERDRIVE_SYSTEM_V1 = true;

  const ORIGIN = location.origin;
  const CATALOG_PATH = '/overdrivefile.json';
  const DEFAULT_SYSTEM = Object.freeze({
    baseHP: 50,
    baseDP: 45,
    baseLuck: 0,
    driveMax: 100,
    passiveDrivePerSecond: 1.25,
    playerHpDrivePerDamage: 0.8,
    towerLifeDrivePerLife: 8,
    dieDamageDrivePerDamage: 0.08,
  });

  let catalog = { schemaVersion: 1, system: { ...DEFAULT_SYSTEM }, dice: {} };
  let system = { ...DEFAULT_SYSTEM };
  let ownedKeys = new Set();
  let serverState = null;
  let collectionMode = 'normal';
  let savedSlots = [];
  let requestCounter = 0;
  const pendingSaves = new Map();
  let navBypass = false;
  let tabBypass = false;
  let runtime = { stateRef: null, dp: DEFAULT_SYSTEM.baseDP, drive: 0, lastLives: null, lastTick: performance.now() };
  let battleObserver = null;
  let statsObserver = null;
  let statsQueued = false;
  let lastDriveReady = false;

  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const asset = (path) => typeof window.__TTD_ASSET_URL === 'function' ? window.__TTD_ASSET_URL(path) : path;
  const send = (type, payload = {}) => window.parent?.postMessage({ type, ...payload }, ORIGIN);
  const toast = (message) => {
    try { if (typeof window.toastGlobal === 'function') { window.toastGlobal(message); return; } } catch (_) {}
    try { if (typeof window.toast === 'function') { window.toast(message); return; } } catch (_) {}
    console.info(message);
  };

  function normalizeSlot(slot) {
    const key = typeof slot === 'string' ? slot : slot?.key;
    return typeof key === 'string' && key ? key : null;
  }
  function normalizePair(value) {
    const input = Array.isArray(value) ? value.slice(0, 2) : [];
    while (input.length < 2) input.push(null);
    const seen = new Set();
    return input.map((slot) => {
      const key = normalizeSlot(slot);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      return key;
    });
  }
  function publicPair(value) {
    return normalizePair(value).map((key) => key ? { key } : null);
  }
  function slotSignature(value) {
    return JSON.stringify(normalizePair(value));
  }
  function deckCount() {
    return Math.max(3, account?.decks?.length || serverState?.deckCount || 3);
  }
  function ensureAccount() {
    if (!window.account) return false;
    const count = deckCount();
    if (!Array.isArray(account.overdriveDecks)) account.overdriveDecks = [];
    for (let i = 0; i < count; i++) account.overdriveDecks[i] = normalizePair(account.overdriveDecks[i]);
    account.overdriveDecks.length = count;
    const current = account.playerStats || {};
    account.playerStats = {
      hp: Math.max(1, Math.round(num(current.hp, system.baseHP))),
      dp: Math.max(0, Math.round(num(current.dp, system.baseDP))),
      luck: Math.max(0, num(current.luck, system.baseLuck)),
    };
    return true;
  }
  function activeDeckIndex() {
    const count = deckCount();
    return clamp(Number.isSafeInteger(account?.activeDeckIdx) ? account.activeDeckIdx : 0, 0, Math.max(0, count - 1));
  }
  function currentPair(index = activeDeckIndex()) {
    ensureAccount();
    return normalizePair(account?.overdriveDecks?.[index]);
  }
  function setPair(index, pair, persist = true) {
    if (!ensureAccount()) return;
    account.overdriveDecks[index] = normalizePair(pair);
    if (persist) persistLocal();
  }
  function persistLocal() {
    if (!window.account) return;
    const json = JSON.stringify(account);
    try { if (window.storage) window.storage.set('rd_account', json); } catch (_) {}
    try { localStorage.setItem('rd_account', json); } catch (_) {}
  }
  function playerStats() {
    ensureAccount();
    return account?.playerStats || { hp: system.baseHP, dp: system.baseDP, luck: system.baseLuck };
  }
  function isDirty(index = activeDeckIndex()) {
    const saved = savedSlots[index] || [null, null];
    return slotSignature(currentPair(index)) !== slotSignature(saved);
  }
  function restoreSaved(index = activeDeckIndex()) {
    setPair(index, savedSlots[index] || [null, null]);
    decorateDeckUi();
  }

  async function loadCatalog() {
    const response = await fetch(asset(CATALOG_PATH), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Overdrive catalog returned HTTP ${response.status}.`);
    const next = await response.json();
    if (!next || next.schemaVersion !== 1 || !next.dice || typeof next.dice !== 'object') throw new Error('Overdrive catalog schema is invalid.');
    catalog = next;
    system = { ...DEFAULT_SYSTEM, ...(next.system || {}) };
    ensureAccount();
  }

  const style = document.createElement('style');
  style.id = 'ttd-overdrive-system-v1-style';
  style.textContent = `
    :root{--ttd-od-blue:#55cfff;--ttd-od-blue2:#198bd8;--ttd-od-blue-dark:#0b2c4e;--ttd-drive-purple:#b56dff;--ttd-drive-purple-dark:#2b1746;}
    #ttdCollectionKindSwitch{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:5px;min-height:28px;}
    #ttdCollectionKindSwitch button{height:28px;border:1px solid var(--ink-700);border-radius:8px;background:var(--ink-850);font:800 9px 'Cinzel',serif;letter-spacing:.02em;color:var(--mist);}
    #ttdCollectionKindSwitch .normal.on{border-color:#5ecf7b;color:#bdf4cb;background:linear-gradient(180deg,#143521,#0b2115);box-shadow:0 0 8px rgba(94,207,123,.23);}
    #ttdCollectionKindSwitch .overdrive.on{border-color:var(--ttd-od-blue);color:#c9f2ff;background:linear-gradient(180deg,#123e62,#09223c);box-shadow:0 0 10px rgba(85,207,255,.38);}
    #ttdCollectionKindSwitch button::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px;vertical-align:middle;}
    #ttdCollectionKindSwitch .normal::before{background:#5ecf7b;box-shadow:0 0 5px #5ecf7b;}
    #ttdCollectionKindSwitch .overdrive::before{background:var(--ttd-od-blue);box-shadow:0 0 7px var(--ttd-od-blue);}
    .ttdOdTool{display:none;}
    #deckTools.ttdOdMode #deckSearch,#deckTools.ttdOdMode #deckSort,#deckTools.ttdOdMode #deckRarityFilter,#deckTools.ttdOdMode #deckElementFilter,#deckTools.ttdOdMode #deckSocketFilter,#deckTools.ttdOdMode #deckFavoriteFilter,#deckTools.ttdOdMode .deckToolMeta{display:none!important;}
    #deckTools.ttdOdMode .ttdOdTool{display:block!important;}
    #ttdOdSearch{grid-column:1/-1;}
    .ttdOdInput,.ttdOdSelect{width:100%;min-width:0;appearance:none;border:1px solid #285f88;background:#0b1c31;color:#e6f8ff;border-radius:8px;padding:7px 9px;font-size:10px;outline:none;}
    .ttdOdInput:focus,.ttdOdSelect:focus{border-color:var(--ttd-od-blue);box-shadow:0 0 7px rgba(85,207,255,.28);}
    #deckScreen.ttdOverdriveFocus #deckSlots .deckSlot{filter:brightness(.48) saturate(.6);opacity:.7;transition:filter .16s ease,opacity .16s ease;}
    .ttdOverdriveDeckSlot{width:44px;height:44px;flex:0 0 44px;border-radius:10px;border:1.5px solid #258fd1;background:linear-gradient(145deg,#0a2441,#0a1731);display:flex;align-items:center;justify-content:center;position:relative;overflow:visible;box-shadow:inset 0 0 12px rgba(19,120,188,.14);touch-action:manipulation;}
    #deckScreen.ttdOverdriveFocus .ttdOverdriveDeckSlot{border-color:var(--ttd-od-blue);box-shadow:0 0 12px rgba(85,207,255,.55),inset 0 0 14px rgba(85,207,255,.13);}
    .ttdOverdriveDeckSlot.empty::after{content:'OD';font:900 7px 'Space Mono',monospace;color:#2b82b5;letter-spacing:.06em;}
    .ttdOverdriveDeckSlot .ttdOdGlyph{width:70%;height:70%;display:grid;place-items:center;color:#e8fbff;}
    .ttdOverdriveDeckSlot .ttdOdGlyph svg{width:100%;height:100%;}
    .ttdOverdriveDeckSlot .ttdOdCostBadge,.ttdOdCard .ttdOdCostBadge,.ttdOverdriveBattleSlot .ttdOdCostBadge{position:absolute;right:-4px;bottom:-4px;z-index:4;border:1px solid var(--ttd-od-blue);border-radius:5px;background:#06111f;color:#bdefff;padding:1px 3px;font:800 6.5px 'Space Mono',monospace;white-space:nowrap;}
    .ttdOverdriveDeckSlot .ttdOdRemove{position:absolute;inset:0;border:0;background:transparent;color:transparent;cursor:pointer;}
    .ttdOdRipple{position:absolute;width:10px;height:10px;border:1px solid #8ee8ff;border-radius:50%;pointer-events:none;z-index:8;transform:translate(-50%,-50%);animation:ttdOdRipple .58s ease-out forwards;box-shadow:0 0 8px #45cfff;}
    @keyframes ttdOdRipple{0%{opacity:.95;transform:translate(-50%,-50%) scale(.25)}70%{opacity:.5}100%{opacity:0;transform:translate(-50%,-50%) scale(4.2)}}
    .ttdOdDirty{box-shadow:inset 0 0 0 1px var(--ttd-od-blue),0 0 8px rgba(85,207,255,.24)!important;}
    .ttdOdDirty::before{content:'•';position:absolute;right:4px;top:0;color:var(--ttd-od-blue);font-size:13px;text-shadow:0 0 6px var(--ttd-od-blue);}
    #collectionGrid .ttdOdCard{position:relative;border-color:#267db2!important;background:linear-gradient(155deg,#102f50,#0b172c)!important;box-shadow:inset 0 0 10px rgba(85,207,255,.05);cursor:pointer;}
    #collectionGrid .ttdOdCard.slotted{border-color:var(--ttd-od-blue)!important;box-shadow:inset 0 0 0 1px var(--ttd-od-blue),0 0 9px rgba(85,207,255,.32)!important;}
    #collectionGrid .ttdOdCard .cname{color:#eafaff!important;}
    #collectionGrid .ttdOdCard .ccls{color:#83dfff!important;}
    #collectionGrid .ttdOdCard .glyphWrap{background:linear-gradient(145deg,#164a75,#0c223e)!important;}
    .ttdOdEmpty{grid-column:1/-1;padding:28px 8px;text-align:center;color:#75a9c7;font-size:10px;line-height:1.5;}
    .ttdOdEmpty b{display:block;color:#bfeeff;font:800 11px 'Cinzel',serif;margin-bottom:4px;}
    #ttdDriveHud{position:absolute;right:9px;top:55px;z-index:46;width:min(174px,46vw);padding:6px 7px;border:1px solid rgba(85,207,255,.28);border-radius:8px;background:linear-gradient(160deg,rgba(8,18,37,.92),rgba(7,10,24,.9));box-shadow:0 4px 14px rgba(0,0,0,.33);pointer-events:none;display:none;}
    #gameScreen.active #ttdDriveHud.on{display:block;}
    .ttdMeterLine+.ttdMeterLine{margin-top:5px;}
    .ttdMeterLabel{display:flex;justify-content:space-between;gap:8px;margin-bottom:2px;font:800 7px 'Space Mono',monospace;letter-spacing:.04em;color:#a9cde1;text-shadow:0 1px #000;}
    .ttdMeterLine.drive .ttdMeterLabel{color:#d8bcff;}
    .ttdMeterTrack{height:8px;border-radius:5px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,#071827,#0b2640);box-shadow:inset 0 1px 3px rgba(0,0,0,.55);}
    .ttdMeterLine.drive .ttdMeterTrack{background:linear-gradient(90deg,#120b22,#2c1748);}
    .ttdMeterFill{height:100%;width:0;transition:width .15s linear;background:linear-gradient(90deg,#46bdf0,#8ce7ff);box-shadow:0 0 8px rgba(85,207,255,.7);}
    .ttdMeterLine.drive .ttdMeterFill{background:linear-gradient(90deg,#8b49d8,#c77cff);box-shadow:0 0 8px rgba(181,109,255,.7);}
    #ttdDriveHud.ready{border-color:rgba(181,109,255,.7);box-shadow:0 0 12px rgba(181,109,255,.25),0 4px 14px rgba(0,0,0,.33);}
    #deckRow{align-items:center;}
    .ttdOverdriveBattleSlot{width:36px;height:36px;flex:0 0 36px;border-radius:9px;border:1px solid #237eb8;background:linear-gradient(145deg,#09243f,#0a162c);display:grid;place-items:center;position:relative;opacity:.72;box-shadow:inset 0 0 10px rgba(85,207,255,.08);}
    .ttdOverdriveBattleSlot.left{margin-right:6px;}
    .ttdOverdriveBattleSlot.right{margin-left:6px;}
    .ttdOverdriveBattleSlot.empty::after{content:'OD';font:900 6.5px 'Space Mono',monospace;color:#286a93;}
    .ttdOverdriveBattleSlot .ttdOdGlyph{width:62%;height:62%;display:grid;place-items:center;}
    .ttdOverdriveBattleSlot .ttdOdGlyph svg{width:100%;height:100%;}
    .ttdOverdriveBattleSlot.ready{opacity:1;border-color:var(--ttd-od-blue);box-shadow:0 0 10px rgba(85,207,255,.58),inset 0 0 9px rgba(181,109,255,.18);animation:ttdOdReadyPulse 1.25s ease-in-out infinite alternate;}
    @keyframes ttdOdReadyPulse{from{filter:brightness(.92)}to{filter:brightness(1.18)}}
    .ttdPlayerStatsV1{position:absolute;left:6px;right:6px;top:6px;z-index:3;padding:6px 7px;border:1px solid rgba(85,207,255,.3);border-radius:8px;background:linear-gradient(145deg,rgba(5,14,28,.88),rgba(11,25,45,.82));box-shadow:0 3px 10px rgba(0,0,0,.32);pointer-events:none;}
    .ttdPlayerStatsV1 strong{display:block;margin-bottom:4px;color:#f0d08d;font:800 8px 'Cinzel',serif;letter-spacing:.03em;}
    .ttdPlayerStatsGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
    .ttdPlayerStat{min-width:0;padding:3px 2px;border-radius:5px;background:rgba(18,42,70,.66);text-align:center;}
    .ttdPlayerStat span{display:block;color:#7898b6;font:700 6px 'Space Mono',monospace;}
    .ttdPlayerStat b{display:block;margin-top:1px;color:#e8f8ff;font:900 8px 'Space Mono',monospace;}
    .ttdOdPrompt{position:fixed;inset:0;z-index:390;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,7,15,.84);}
    .ttdOdPromptCard{width:min(340px,94vw);padding:17px;border:1px solid #2b7ead;border-radius:13px;background:linear-gradient(155deg,#102b47,#0b1427);box-shadow:0 18px 50px rgba(0,0,0,.58);text-align:center;}
    .ttdOdPromptCard h3{margin:0 0 7px;color:#c8f2ff;font:800 14px 'Cinzel',serif;}
    .ttdOdPromptCard p{margin:0 0 13px;color:#9cb8cc;font-size:10px;line-height:1.45;}
    .ttdOdPromptButtons{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
    .ttdOdPromptButtons button{min-height:36px;border:1px solid #2b5878;border-radius:8px;background:#111d31;color:#d9e9f4;font-weight:800;font-size:9px;}
    .ttdOdPromptButtons .save{border-color:var(--ttd-od-blue);background:linear-gradient(#63d5ff,#218bc7);color:#06101d;}
    @media(max-width:390px){.ttdOverdriveDeckSlot{width:40px;height:40px;flex-basis:40px}#ttdDriveHud{right:6px;top:52px;width:min(160px,47vw)}}
  `;
  document.head.appendChild(style);

  function renderGlyph(def) {
    if (def?.glyph && typeof window.renderGlyph === 'function') {
      try { return window.renderGlyph(def.glyph, '#06101d'); } catch (_) {}
    }
    const letters = String(def?.name || 'OD').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'OD';
    return `<span style="font:900 9px 'Space Mono',monospace;color:#bceeff">${esc(letters)}</span>`;
  }
  function definition(key) {
    return key ? catalog.dice?.[key] || null : null;
  }
  function flareSlot(slot) {
    if (!slot) return;
    for (let i = 0; i < 3; i++) {
      const ripple = document.createElement('i');
      ripple.className = 'ttdOdRipple';
      ripple.style.left = `${35 + Math.random() * 30}%`;
      ripple.style.top = `${35 + Math.random() * 30}%`;
      ripple.style.animationDelay = `${i * 55}ms`;
      slot.appendChild(ripple);
      setTimeout(() => ripple.remove(), 760);
    }
  }

  function ensureTools() {
    const tools = document.getElementById('deckTools') || document.querySelector('#deckScreen .deckTools');
    if (!tools) return null;
    if (!document.getElementById('ttdCollectionKindSwitch')) {
      const switcher = document.createElement('div');
      switcher.id = 'ttdCollectionKindSwitch';
      switcher.innerHTML = '<button type="button" class="normal">Dice</button><button type="button" class="overdrive">Overdrive</button>';
      tools.prepend(switcher);
      switcher.querySelector('.normal')?.addEventListener('click', () => setCollectionMode('normal'));
      switcher.querySelector('.overdrive')?.addEventListener('click', () => setCollectionMode('overdrive'));
    }
    if (!document.getElementById('ttdOdSearch')) {
      const search = document.createElement('input');
      search.id = 'ttdOdSearch'; search.className = 'ttdOdTool ttdOdInput'; search.placeholder = 'Search Overdrive Dice…'; search.autocomplete = 'off';
      const element = document.createElement('select');
      element.id = 'ttdOdElement'; element.className = 'ttdOdTool ttdOdSelect';
      const cost = document.createElement('select');
      cost.id = 'ttdOdCost'; cost.className = 'ttdOdTool ttdOdSelect';
      const switcher = document.getElementById('ttdCollectionKindSwitch');
      switcher?.insertAdjacentElement('afterend', search);
      search.insertAdjacentElement('afterend', element);
      element.insertAdjacentElement('afterend', cost);
      search.addEventListener('input', renderOverdriveCollection);
      element.addEventListener('change', renderOverdriveCollection);
      cost.addEventListener('change', renderOverdriveCollection);
    }
    return tools;
  }
  function populateOdFilters() {
    const element = document.getElementById('ttdOdElement');
    const cost = document.getElementById('ttdOdCost');
    if (!element || !cost) return;
    const defs = [...ownedKeys].map(definition).filter(Boolean);
    const elements = [...new Set(defs.map((d) => String(d.element || 'Neutral')).filter(Boolean))].sort();
    const costs = [...new Set(defs.map((d) => num(d.dpCost, 0)).filter((v) => v > 0))].sort((a, b) => a - b);
    const oldElement = element.value || 'all';
    const oldCost = cost.value || 'all';
    element.innerHTML = '<option value="all">All elements</option>' + elements.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    cost.innerHTML = '<option value="all">All DP costs</option>' + costs.map((v) => `<option value="${v}">${v} DP</option>`).join('');
    if ([...element.options].some((o) => o.value === oldElement)) element.value = oldElement;
    if ([...cost.options].some((o) => o.value === oldCost)) cost.value = oldCost;
  }
  function setCollectionMode(mode) {
    collectionMode = mode === 'overdrive' ? 'overdrive' : 'normal';
    const tools = ensureTools();
    tools?.classList.toggle('ttdOdMode', collectionMode === 'overdrive');
    document.getElementById('deckScreen')?.classList.toggle('ttdOverdriveFocus', collectionMode === 'overdrive');
    const switcher = document.getElementById('ttdCollectionKindSwitch');
    switcher?.querySelector('.normal')?.classList.toggle('on', collectionMode === 'normal');
    switcher?.querySelector('.overdrive')?.classList.toggle('on', collectionMode === 'overdrive');
    populateOdFilters();
    if (collectionMode === 'overdrive') renderOverdriveCollection();
    else {
      try { window.renderCollectionGrid?.(); } catch (_) {}
      const grid = document.getElementById('collectionGrid');
      if (grid) grid.scrollTop = 0;
    }
    decorateDeckSlots();
  }
  function renderOverdriveCollection() {
    if (collectionMode !== 'overdrive') return;
    const grid = document.getElementById('collectionGrid');
    if (!grid) return;
    const query = (document.getElementById('ttdOdSearch')?.value || '').trim().toLowerCase();
    const element = document.getElementById('ttdOdElement')?.value || 'all';
    const cost = document.getElementById('ttdOdCost')?.value || 'all';
    const equipped = new Set(currentPair().filter(Boolean));
    const rows = [...ownedKeys]
      .map((key) => ({ key, def: definition(key) }))
      .filter((row) => row.def)
      .filter(({ key, def }) => !query || `${def.name || key} ${def.element || ''} ${def.description || ''}`.toLowerCase().includes(query))
      .filter(({ def }) => element === 'all' || String(def.element || 'Neutral') === element)
      .filter(({ def }) => cost === 'all' || String(num(def.dpCost, 0)) === cost)
      .sort((a, b) => num(a.def.dpCost, 0) - num(b.def.dpCost, 0) || String(a.def.name || a.key).localeCompare(String(b.def.name || b.key)));
    grid.innerHTML = '';
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'ttdOdEmpty';
      empty.innerHTML = ownedKeys.size ? '<b>No matches</b>Adjust the Overdrive filters.' : '<b>Overdrive Collection</b>No Overdrive Dice have been acquired yet.';
      grid.appendChild(empty);
      return;
    }
    for (const { key, def } of rows) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `colCard ttdOdCard${equipped.has(key) ? ' slotted' : ''}`;
      const elementName = esc(def.element || 'Neutral');
      card.innerHTML = `<div class="glyphWrap">${renderGlyph(def)}</div><div class="cname">${esc(def.name || key)}</div><div class="ccls">${elementName} · ${num(def.dpCost, 0)} DP</div><span class="ttdOdCostBadge">${num(def.dpCost, 0)} DP</span>`;
      card.addEventListener('click', () => quickEquipOverdrive(key));
      grid.appendChild(card);
    }
  }
  function quickEquipOverdrive(key) {
    if (collectionMode !== 'overdrive' || !ownedKeys.has(key) || !definition(key)) return;
    const index = activeDeckIndex();
    const pair = currentPair(index);
    const existing = pair.indexOf(key);
    if (existing >= 0) { toast(`${definition(key)?.name || key} is already equipped.`); return; }
    const empty = pair.indexOf(null);
    if (empty < 0) { toast('Both Overdrive slots are filled. Remove one first.'); return; }
    pair[empty] = key;
    setPair(index, pair);
    decorateDeckUi();
    const slot = document.querySelector(`.ttdOverdriveDeckSlot[data-od-index="${empty}"]`);
    flareSlot(slot);
  }
  function removeOverdrive(slotIndex) {
    const index = activeDeckIndex();
    const pair = currentPair(index);
    if (!pair[slotIndex]) return;
    pair[slotIndex] = null;
    setPair(index, pair);
    decorateDeckUi();
  }
  function makeDeckSlot(slotIndex) {
    const key = currentPair()[slotIndex];
    const def = definition(key);
    const slot = document.createElement('div');
    slot.className = `ttdOverdriveDeckSlot ${key && def ? 'filled' : 'empty'}`;
    slot.dataset.odIndex = String(slotIndex);
    slot.title = key && def ? `${def.name || key} · ${num(def.dpCost, 0)} DP` : 'Optional Overdrive Die';
    if (key && def) {
      slot.innerHTML = `<div class="ttdOdGlyph">${renderGlyph(def)}</div><span class="ttdOdCostBadge">${num(def.dpCost, 0)} DP</span><button type="button" class="ttdOdRemove" aria-label="Remove ${esc(def.name || key)}"></button>`;
      slot.querySelector('.ttdOdRemove')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); removeOverdrive(slotIndex); });
    }
    return slot;
  }
  function decorateDeckSlots() {
    const row = document.getElementById('deckSlots');
    if (!row) return;
    row.querySelectorAll(':scope > .ttdOverdriveDeckSlot').forEach((node) => node.remove());
    const left = makeDeckSlot(0);
    const right = makeDeckSlot(1);
    row.prepend(left);
    row.append(right);
  }
  function decorateTabs() {
    const tabs = [...document.querySelectorAll('#deckTabs .deckTab')];
    tabs.forEach((tab, index) => tab.classList.toggle('ttdOdDirty', isDirty(index)));
  }
  function decorateDeckUi() {
    ensureTools();
    decorateDeckSlots();
    decorateTabs();
    setCollectionMode(collectionMode);
  }

  function promptUnsaved({ onSave, onDiscard, onCancel }) {
    document.querySelector('.ttdOdPrompt')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'ttdOdPrompt';
    overlay.innerHTML = '<div class="ttdOdPromptCard"><h3>Unsaved Overdrive Changes</h3><p>Your Overdrive loadout changed. Save it before leaving this deck?</p><div class="ttdOdPromptButtons"><button type="button" class="discard">No</button><button type="button" class="cancel">Cancel</button><button type="button" class="save">Yes</button></div></div>';
    overlay.querySelector('.discard')?.addEventListener('click', () => { overlay.remove(); onDiscard?.(); });
    overlay.querySelector('.cancel')?.addEventListener('click', () => { overlay.remove(); onCancel?.(); });
    overlay.querySelector('.save')?.addEventListener('click', () => { overlay.remove(); onSave?.(); });
    document.body.appendChild(overlay);
  }
  function saveOverdrive(index, callback = null) {
    const requestId = `od-${Date.now().toString(36)}-${++requestCounter}`;
    pendingSaves.set(requestId, { index, callback, signature: slotSignature(currentPair(index)) });
    send('ttd:overdrive-save-request', { requestId, index, slots: publicPair(currentPair(index)) });
  }
  function switchDeckNow(index) {
    tabBypass = true;
    try {
      account.activeDeckIdx = index;
      persistLocal();
      window.renderDeckScreen?.();
    } finally { tabBypass = false; }
  }
  function installNavigationGuard() {
    const tabs = document.getElementById('deckTabs');
    if (tabs && tabs.dataset.ttdOdBound !== '1') {
      tabs.dataset.ttdOdBound = '1';
      tabs.addEventListener('click', (event) => {
        if (tabBypass) return;
        const tab = event.target.closest?.('.deckTab');
        if (!tab) return;
        const list = [...tabs.querySelectorAll('.deckTab')];
        const targetIndex = list.indexOf(tab);
        const currentIndex = activeDeckIndex();
        if (targetIndex < 0 || targetIndex === currentIndex || !isDirty(currentIndex)) return;
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
        promptUnsaved({
          onSave: () => saveOverdrive(currentIndex, (ok) => { if (ok) switchDeckNow(targetIndex); }),
          onDiscard: () => { restoreSaved(currentIndex); switchDeckNow(targetIndex); },
        });
      }, true);
    }
    if (!window.__TTD_OD_SHOWSCREEN_WRAPPED && typeof window.showScreen === 'function') {
      window.__TTD_OD_SHOWSCREEN_WRAPPED = true;
      const baseShowScreen = window.showScreen;
      window.showScreen = function overdriveShowScreen(name) {
        const active = document.querySelector('.screen.active')?.id;
        const index = activeDeckIndex();
        if (!navBypass && active === 'deckScreen' && name !== 'deck' && isDirty(index)) {
          const args = arguments;
          promptUnsaved({
            onSave: () => saveOverdrive(index, (ok) => {
              if (!ok) return;
              navBypass = true;
              try { baseShowScreen.apply(this, args); } finally { navBypass = false; }
            }),
            onDiscard: () => {
              restoreSaved(index);
              navBypass = true;
              try { baseShowScreen.apply(this, args); } finally { navBypass = false; }
            },
          });
          return;
        }
        return baseShowScreen.apply(this, arguments);
      };
    }
  }

  function applyServerState(next) {
    if (!next || !Array.isArray(next.decks)) return;
    serverState = next;
    ownedKeys = new Set(Array.isArray(next.ownedKeys) ? next.ownedKeys.filter((key) => definition(key)) : []);
    ensureAccount();
    if (next.playerStats) {
      account.playerStats = {
        hp: Math.max(1, Math.round(num(next.playerStats.hp, system.baseHP))),
        dp: Math.max(0, Math.round(num(next.playerStats.dp, system.baseDP))),
        luck: Math.max(0, num(next.playerStats.luck, system.baseLuck)),
      };
    }
    next.decks.forEach((deck) => {
      if (!Number.isSafeInteger(deck?.index) || deck.index < 0) return;
      const pair = normalizePair(deck.slots);
      account.overdriveDecks[deck.index] = pair;
      savedSlots[deck.index] = pair.slice();
    });
    for (let i = 0; i < deckCount(); i++) if (!savedSlots[i]) savedSlots[i] = currentPair(i).slice();
    persistLocal();
    runtime.dp = Math.min(runtime.dp, playerStats().dp);
    decorateDeckUi();
    ensureStatsPanel();
    decorateBattleDeck();
    updateBattleHud();
  }

  function ensureBattleHud() {
    const game = document.getElementById('gameScreen');
    if (!game) return null;
    let hud = document.getElementById('ttdDriveHud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'ttdDriveHud';
      hud.innerHTML = '<div class="ttdMeterLine dp"><div class="ttdMeterLabel"><span>DP</span><span class="value">45 / 45</span></div><div class="ttdMeterTrack"><div class="ttdMeterFill"></div></div></div><div class="ttdMeterLine drive"><div class="ttdMeterLabel"><span>DRIVE</span><span class="value">0%</span></div><div class="ttdMeterTrack"><div class="ttdMeterFill"></div></div></div>';
      game.appendChild(hud);
    }
    return hud;
  }
  function addDrive(amount) {
    if (!runtime.stateRef?.running || amount <= 0) return;
    const max = Math.max(1, num(system.driveMax, 100));
    runtime.drive = clamp(runtime.drive + amount, 0, max);
  }
  function isDriveReady() {
    return runtime.drive >= Math.max(1, num(system.driveMax, 100)) - 0.0001;
  }
  function updateBattleHud() {
    const hud = ensureBattleHud();
    if (!hud) return;
    const running = !!window.state?.running;
    hud.classList.toggle('on', running);
    const stats = playerStats();
    const maxDp = Math.max(1, stats.dp || system.baseDP);
    runtime.dp = clamp(runtime.dp, 0, maxDp);
    const driveMax = Math.max(1, num(system.driveMax, 100));
    const dpPct = clamp(runtime.dp / maxDp * 100, 0, 100);
    const drivePct = clamp(runtime.drive / driveMax * 100, 0, 100);
    const dpLine = hud.querySelector('.ttdMeterLine.dp');
    const driveLine = hud.querySelector('.ttdMeterLine.drive');
    if (dpLine) { dpLine.querySelector('.value').textContent = `${Math.round(runtime.dp)} / ${maxDp}`; dpLine.querySelector('.ttdMeterFill').style.width = `${dpPct}%`; }
    if (driveLine) { driveLine.querySelector('.value').textContent = `${Math.floor(drivePct)}%`; driveLine.querySelector('.ttdMeterFill').style.width = `${drivePct}%`; }
    const ready = isDriveReady();
    hud.classList.toggle('ready', ready);
    if (ready !== lastDriveReady) { lastDriveReady = ready; decorateBattleDeck(); }
  }
  function battleSlot(slotIndex, side) {
    const key = currentPair()[slotIndex];
    const def = definition(key);
    const slot = document.createElement('div');
    const ready = !!def && isDriveReady() && runtime.dp >= num(def.dpCost, 0);
    slot.className = `ttdOverdriveBattleSlot ${side} ${def ? 'filled' : 'empty'}${ready ? ' ready' : ''}`;
    slot.dataset.odBattle = String(slotIndex);
    slot.title = def ? `${def.name || key} · ${num(def.dpCost, 0)} DP${ready ? ' · Ready' : ''}` : 'Empty Overdrive slot';
    if (def) slot.innerHTML = `<div class="ttdOdGlyph">${renderGlyph(def)}</div><span class="ttdOdCostBadge">${num(def.dpCost, 0)}</span>`;
    return slot;
  }
  function decorateBattleDeck() {
    const row = document.getElementById('deckRow');
    if (!row) return;
    row.querySelectorAll(':scope > .ttdOverdriveBattleSlot').forEach((node) => node.remove());
    row.prepend(battleSlot(0, 'left'));
    row.append(battleSlot(1, 'right'));
  }
  function installBattleObserver() {
    const row = document.getElementById('deckRow');
    if (!row || battleObserver) return;
    battleObserver = new MutationObserver(() => {
      if (row.querySelectorAll(':scope > .ttdOverdriveBattleSlot').length !== 2) requestAnimationFrame(decorateBattleDeck);
    });
    battleObserver.observe(row, { childList: true });
    decorateBattleDeck();
  }
  function resetRuntime(stateRef) {
    runtime = {
      stateRef,
      dp: Math.max(0, playerStats().dp),
      drive: 0,
      lastLives: Number.isFinite(Number(stateRef?.lives)) ? Number(stateRef.lives) : null,
      lastTick: performance.now(),
    };
    lastDriveReady = false;
    decorateBattleDeck();
    updateBattleHud();
  }
  function monitorRuntime() {
    const now = performance.now();
    const state = window.state;
    if (state?.running) {
      if (runtime.stateRef !== state) resetRuntime(state);
      const dt = clamp((now - runtime.lastTick) / 1000, 0, 0.5);
      runtime.lastTick = now;
      addDrive(num(system.passiveDrivePerSecond, 1.25) * dt);
      const lives = Number(state.lives);
      if (Number.isFinite(lives)) {
        if (runtime.lastLives != null && lives < runtime.lastLives) {
          const lost = runtime.lastLives - lives;
          const rate = state.showPlayerHpBar ? num(system.playerHpDrivePerDamage, 0.8) : num(system.towerLifeDrivePerLife, 8);
          addDrive(lost * rate);
        }
        runtime.lastLives = lives;
      }
    } else {
      runtime.lastTick = now;
      if (runtime.stateRef && !runtime.stateRef.running) runtime.stateRef = null;
    }
    updateBattleHud();
    if (state?.running) decorateBattleDeck();
    setTimeout(monitorRuntime, 120);
  }
  function wrapDamage() {
    if (window.__TTD_OD_DIE_DAMAGE_WRAPPED || typeof window.dieDamage !== 'function') return;
    window.__TTD_OD_DIE_DAMAGE_WRAPPED = true;
    const base = window.dieDamage;
    window.dieDamage = function overdriveDieDamage(index, amount, flavor) {
      const before = Number(window.state?.board?.[index]?.hp);
      const result = base.apply(this, arguments);
      const after = Number(window.state?.board?.[index]?.hp);
      if (window.state?.running && Number.isFinite(before) && Number.isFinite(after) && after < before) {
        addDrive((before - after) * num(system.dieDamageDrivePerDamage, 0.08));
      }
      return result;
    };
  }
  function wrapEndlessHorde() {
    if (window.__TTD_OD_ENDLESS_WRAPPED || typeof window.startEndlessHorde !== 'function') return;
    window.__TTD_OD_ENDLESS_WRAPPED = true;
    const base = window.startEndlessHorde;
    window.startEndlessHorde = function overdriveStartEndlessHorde() {
      const result = base.apply(this, arguments);
      const state = window.state;
      if (state?.zombieMode) {
        const hp = Math.max(1, playerStats().hp);
        state.lives = hp;
        state.livesMax = hp;
        runtime.lastLives = hp;
        try { window.renderHUD?.(); } catch (_) {}
      }
      return result;
    };
  }

  function ensureStatsPanel() {
    const host = document.querySelector('#inventoryScreen .tiAvatar');
    if (!host) return;
    let panel = host.querySelector('#ttdPlayerStatsV1');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ttdPlayerStatsV1';
      panel.className = 'ttdPlayerStatsV1';
      host.appendChild(panel);
    }
    const stats = playerStats();
    panel.innerHTML = `<strong>Player Stats</strong><div class="ttdPlayerStatsGrid"><div class="ttdPlayerStat"><span>HP</span><b>${Math.round(stats.hp)}</b></div><div class="ttdPlayerStat"><span>DP</span><b>${Math.round(stats.dp)}</b></div><div class="ttdPlayerStat"><span>LUCK</span><b>${num(stats.luck, 0).toFixed(num(stats.luck, 0) % 1 ? 1 : 0)}%</b></div></div>`;
  }
  function installStatsObserver() {
    if (statsObserver) return;
    statsObserver = new MutationObserver(() => {
      if (statsQueued) return;
      statsQueued = true;
      requestAnimationFrame(() => { statsQueued = false; ensureStatsPanel(); });
    });
    statsObserver.observe(document.body, { childList: true, subtree: true });
    ensureStatsPanel();
  }

  function installDeckWrappers() {
    if (!window.__TTD_OD_RENDERDECK_WRAPPED && typeof window.renderDeckScreen === 'function') {
      window.__TTD_OD_RENDERDECK_WRAPPED = true;
      const baseRender = window.renderDeckScreen;
      window.renderDeckScreen = function overdriveRenderDeckScreen() {
        const result = baseRender.apply(this, arguments);
        requestAnimationFrame(() => requestAnimationFrame(decorateDeckUi));
        return result;
      };
    }
    installNavigationGuard();
  }

  function publicApi() {
    return Object.freeze({
      catalog: () => catalog,
      playerStats,
      equipped: (index = activeDeckIndex()) => currentPair(index).slice(),
      drive: () => ({ current: runtime.drive, max: num(system.driveMax, 100), ready: isDriveReady() }),
      dp: () => ({ current: runtime.dp, max: playerStats().dp }),
      addDrive: (amount) => { addDrive(num(amount, 0)); updateBattleHud(); },
      spendDp: (cost) => {
        const amount = Math.max(0, num(cost, 0));
        if (!isDriveReady() || runtime.dp < amount) return false;
        runtime.dp -= amount;
        updateBattleHud(); decorateBattleDeck();
        return true;
      },
      resetDrive: () => { runtime.drive = 0; lastDriveReady = false; updateBattleHud(); decorateBattleDeck(); },
      refresh: () => { decorateDeckUi(); ensureStatsPanel(); decorateBattleDeck(); updateBattleHud(); },
    });
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== ORIGIN || event.source !== window.parent) return;
    const message = event.data || {};
    if (message.type === 'ttd:overdrive-state') { applyServerState(message.overdrive); return; }
    if (message.type === 'ttd:overdrive-save-result') {
      const pending = pendingSaves.get(message.requestId);
      if (!pending) return;
      pendingSaves.delete(message.requestId);
      applyServerState(message.overdrive);
      pending.callback?.(true);
      return;
    }
    if (message.type === 'ttd:overdrive-save-error') {
      const pending = pendingSaves.get(message.requestId);
      if (pending) { pendingSaves.delete(message.requestId); pending.callback?.(false); }
      toast(message.message || 'The Overdrive loadout could not be saved.');
      return;
    }
    if (message.type === 'ttd:overdrive-error') {
      console.error(message.message || 'Overdrive state could not be loaded.');
      return;
    }
    if (message.type === 'ttd:deck-v18-save-result' || message.type === 'ttd:deck-v18-equip-result') {
      const index = Number.isSafeInteger(message.index) ? message.index : activeDeckIndex();
      saveOverdrive(index);
    }
  });

  async function start() {
    try { await loadCatalog(); } catch (err) { console.error('Overdrive catalog could not load.', err); }
    try { await window.__TTD_BRIDGES_READY; } catch (_) {}
    ensureAccount();
    savedSlots = Array.from({ length: deckCount() }, (_, i) => currentPair(i).slice());
    installDeckWrappers();
    wrapDamage();
    wrapEndlessHorde();
    installBattleObserver();
    installStatsObserver();
    ensureBattleHud();
    decorateDeckUi();
    window.__TTD_OVERDRIVE = publicApi();
    send('ttd:overdrive-ready');
    monitorRuntime();
  }

  start().catch((err) => console.error('Overdrive system could not start.', err));
})();
