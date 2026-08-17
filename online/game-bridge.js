(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('online') !== '1' || window.parent === window) return;

  const ORIGIN = location.origin;
  let gachaPending = false;
  let requestCounter = 0;

  function send(type, payload = {}) {
    window.parent.postMessage({ type, ...payload }, ORIGIN);
  }

  function validGameState(gameState) {
    const pips = gameState?.economy?.pips;
    const astras = gameState?.economy?.astras;
    return Number.isSafeInteger(pips) && pips >= 0 && Number.isSafeInteger(astras) && astras >= 0;
  }

  function validGrant(grant) {
    return grant &&
      typeof grant.key === 'string' && grant.key in DICE &&
      grant.instance && typeof grant.instance.id === 'string' && grant.instance.id &&
      Number.isSafeInteger(grant.instance.cls) && grant.instance.cls >= 1 &&
      Array.isArray(grant.instance.enchants) && grant.instance.enchants.length === 4;
  }

  function mergeGrant(grant) {
    if (!validGrant(grant)) return false;
    if (!account.owned[grant.key]) account.owned[grant.key] = [];

    const exists = Object.values(account.owned).some((instances) =>
      Array.isArray(instances) && instances.some((inst) => inst?.id === grant.instance.id));
    if (exists) return false;

    account.owned[grant.key].push({
      id: grant.instance.id,
      cls: grant.instance.cls,
      enchants: [...grant.instance.enchants],
    });
    return true;
  }

  function applyCloudSync(gameState, grants = []) {
    if (!validGameState(gameState)) {
      send('ttd:bridge-sync-error', { message: 'The bridge received an invalid canonical game state.' });
      return false;
    }

    account.gold = gameState.economy.pips;
    account.astras = gameState.economy.astras;
    let changed = false;
    for (const grant of grants) changed = mergeGrant(grant) || changed;

    if (typeof renderHome === 'function') renderHome();
    if (typeof renderGachaTop === 'function') renderGachaTop();
    if (changed && typeof renderCollection === 'function') renderCollection();
    saveAccount();
    send('ttd:bridge-synced', { version: 1, economyRevision: gameState.revision || 1 });
    return true;
  }

  function renderPullResults(results) {
    const wrap = document.getElementById('pullResults');
    if (!wrap || !Array.isArray(results)) return;
    wrap.innerHTML = '';
    results.forEach((result, i) => {
      const card = renderPullCard(result.key);
      if (results.length > 1) card.style.animationDelay = `${i * 0.06}s`;
      wrap.appendChild(card);
    });
  }

  function setGachaPending(pending) {
    gachaPending = pending;
    const one = document.getElementById('pull1');
    const ten = document.getElementById('pull10');
    if (pending) {
      if (one) one.disabled = true;
      if (ten) ten.disabled = true;
    } else if (typeof renderGachaTop === 'function') {
      renderGachaTop();
    }
  }

  function failGacha(message) {
    setGachaPending(false);
    if (typeof showNotice === 'function') {
      showNotice('Online Gacha', message || 'The server could not complete that pull.');
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('#pull1, #pull10');
    if (!button) return;

    // Capture before v33's local anonymous click handlers. Online gacha is a
    // server operation; the old local RNG/debit must never execute.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (gachaPending) return;
    const count = button.id === 'pull10' ? 10 : 1;
    const requestId = `${Date.now().toString(36)}-${++requestCounter}`;
    setGachaPending(true);
    send('ttd:gacha-request', { requestId, count });
  }, true);

  window.addEventListener('message', (event) => {
    if (event.origin !== ORIGIN || event.source !== window.parent) return;
    const message = event.data || {};

    if (message.type === 'ttd:cloud-sync') {
      applyCloudSync(message.gameState, message.gachaGrants || []);
      return;
    }

    if (message.type === 'ttd:gacha-result') {
      if (!validGameState(message.gameState) || !Array.isArray(message.results)) {
        failGacha('The server returned an invalid pull result.');
        return;
      }

      account.gold = message.gameState.economy.pips;
      account.astras = message.gameState.economy.astras;
      for (const grant of message.results) mergeGrant(grant);
      renderPullResults(message.results);
      if (typeof renderHome === 'function') renderHome();
      if (typeof renderGachaTop === 'function') renderGachaTop();
      saveAccount();
      setGachaPending(false);
      return;
    }

    if (message.type === 'ttd:gacha-error') {
      failGacha(message.message);
    }
  });

  send('ttd:bridge-ready', { version: 1 });
})();
