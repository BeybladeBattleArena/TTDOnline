(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('online') !== '1' || window.parent === window) return;
  if (window.__ttdOnlineBridgeBootstrapStarted) return;
  window.__ttdOnlineBridgeBootstrapStarted = true;

  const ORIGIN = location.origin;
  const GAME_PATH = '/random-dice-game-33.html';
  const IIFE_END_MARKER = '\n})();\n</script>';

  function sendBootstrapError(message) {
    window.parent.postMessage({
      type: 'ttd:bridge-sync-error',
      message: message || 'The secure online gameplay bridge could not start.',
    }, ORIGIN);
  }

  // IMPORTANT: this function is intentionally never invoked from this external
  // script. Its SOURCE is inserted immediately before v33's closing `})();`, so
  // when the transformed game document parses it, the function is created and
  // invoked inside v33's private IIFE and can legally access account, DICE,
  // saveAccount, renderDeckScreen, etc. V33 on disk remains untouched.
  function installInternalBridge() {
    'use strict';

    const ORIGIN = location.origin;
    const originalSaveAccount = saveAccount;
    let gachaPending = false;
    let requestCounter = 0;
    let cloudSynced = false;
    let suppressDeckSync = false;
    let deckBaseline = '';
    let deckSyncTimer = null;
    let readyAttempts = 0;

    function send(type, payload = {}) {
      window.parent.postMessage({ type, ...payload }, ORIGIN);
    }

    function validGameState(gameState) {
      const pips = gameState?.economy?.pips;
      const astras = gameState?.economy?.astras;
      const activeDeckIdx = gameState?.activeDeckIdx;
      return Number.isSafeInteger(pips) && pips >= 0 &&
        Number.isSafeInteger(astras) && astras >= 0 &&
        Number.isSafeInteger(activeDeckIdx) && activeDeckIdx >= 0 && activeDeckIdx <= 2;
    }

    function validDie(grant) {
      return grant &&
        typeof grant.key === 'string' && grant.key in DICE &&
        grant.instance && typeof grant.instance.id === 'string' && grant.instance.id &&
        Number.isSafeInteger(grant.instance.cls) && grant.instance.cls >= 1 && grant.instance.cls <= 10 &&
        Array.isArray(grant.instance.enchants) && grant.instance.enchants.length === 4;
    }

    function validDecks(decks) {
      return Array.isArray(decks) && decks.length === 3 && decks.every((deck, expectedIndex) =>
        deck && deck.index === expectedIndex && Array.isArray(deck.slots) && deck.slots.length === 5 &&
        deck.slots.every((slot) => slot == null ||
          (typeof slot === 'object' && typeof slot.key === 'string' && typeof slot.instId === 'string')));
    }

    function deckSnapshot() {
      return {
        activeDeckIdx: account.activeDeckIdx,
        decks: account.decks.map((deck) => deck.map((slot) =>
          slot ? { key: slot.key, instId: slot.instId } : null)),
      };
    }

    function deckSignature() {
      try { return JSON.stringify(deckSnapshot()); }
      catch (_) { return ''; }
    }

    function saveLocalOnly() {
      return originalSaveAccount();
    }

    function scheduleDeckSync() {
      if (!cloudSynced || suppressDeckSync) return;
      const signature = deckSignature();
      if (!signature || signature === deckBaseline) return;
      clearTimeout(deckSyncTimer);
      deckSyncTimer = setTimeout(() => {
        const latestSignature = deckSignature();
        if (!latestSignature || latestSignature === deckBaseline) return;
        const requestId = `deck-${Date.now().toString(36)}-${++requestCounter}`;
        send('ttd:deck-state-request', { requestId, ...deckSnapshot() });
      }, 80);
    }

    saveAccount = function onlineSaveAccountBridge(...args) {
      const result = originalSaveAccount.apply(this, args);
      scheduleDeckSync();
      return result;
    };

    function replaceCanonicalInventory(dice) {
      if (!Array.isArray(dice) || !dice.every(validDie)) return false;
      const owned = {};
      const validIds = new Set();
      for (const grant of dice) {
        if (!owned[grant.key]) owned[grant.key] = [];
        owned[grant.key].push({
          id: grant.instance.id,
          cls: grant.instance.cls,
          enchants: [...grant.instance.enchants],
        });
        validIds.add(grant.instance.id);
      }
      account.owned = owned;
      if (Array.isArray(account.favoriteDice)) {
        account.favoriteDice = account.favoriteDice.filter((id) => validIds.has(id)).slice(0, 10);
      }
      return true;
    }

    function applyCanonicalDecks(decks, activeDeckIdx) {
      if (!validDecks(decks) || !Number.isSafeInteger(activeDeckIdx) || activeDeckIdx < 0 || activeDeckIdx > 2) return false;
      account.decks = decks.map((deck) => deck.slots.map((slot) =>
        slot ? { key: slot.key, instId: slot.instId } : null));
      account.activeDeckIdx = activeDeckIdx;
      return true;
    }

    function mergeGrant(grant) {
      if (!validDie(grant)) return false;
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

    function applyCloudSync(gameState, dice = [], decks = []) {
      if (!validGameState(gameState) || !validDecks(decks) || !Array.isArray(dice) || !dice.every(validDie)) {
        send('ttd:bridge-sync-error', { message: 'The bridge received invalid canonical progression state.' });
        return false;
      }

      suppressDeckSync = true;
      try {
        account.gold = gameState.economy.pips;
        account.astras = gameState.economy.astras;
        replaceCanonicalInventory(dice);
        applyCanonicalDecks(decks, gameState.activeDeckIdx);

        if (typeof renderHome === 'function') renderHome();
        if (typeof renderGachaTop === 'function') renderGachaTop();
        if (typeof renderCollection === 'function') renderCollection();
        if (typeof renderDeckScreen === 'function') renderDeckScreen();
        saveLocalOnly();
        deckBaseline = deckSignature();
        cloudSynced = true;
        send('ttd:bridge-synced', { version: 3, economyRevision: gameState.revision || 1 });
        return true;
      } catch (err) {
        console.error('Canonical online sync failed inside v33.', err);
        send('ttd:bridge-sync-error', {
          message: `The secure game state could not be applied: ${err?.message || 'unknown bridge error'}`,
        });
        return false;
      } finally {
        suppressDeckSync = false;
      }
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

      // Capture before v33's local anonymous handlers. Online gacha must be a
      // server operation; the old local RNG/debit must never execute.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (gachaPending || !cloudSynced) return;
      const count = button.id === 'pull10' ? 10 : 1;
      const requestId = `${Date.now().toString(36)}-${++requestCounter}`;
      setGachaPending(true);
      send('ttd:gacha-request', { requestId, count });
    }, true);

    window.addEventListener('message', (event) => {
      if (event.origin !== ORIGIN || event.source !== window.parent) return;
      const message = event.data || {};

      if (message.type === 'ttd:cloud-sync') {
        applyCloudSync(message.gameState, message.dice || [], message.decks || []);
        return;
      }

      if (message.type === 'ttd:gacha-result') {
        if (!validGameState(message.gameState) || !Array.isArray(message.results) || !message.results.every(validDie)) {
          failGacha('The server returned an invalid pull result.');
          return;
        }

        account.gold = message.gameState.economy.pips;
        account.astras = message.gameState.economy.astras;
        for (const grant of message.results) mergeGrant(grant);
        renderPullResults(message.results);
        if (typeof renderHome === 'function') renderHome();
        if (typeof renderGachaTop === 'function') renderGachaTop();
        if (typeof renderCollection === 'function') renderCollection();
        saveLocalOnly();
        setGachaPending(false);
        return;
      }

      if (message.type === 'ttd:gacha-error') {
        failGacha(message.message);
        return;
      }

      if (message.type === 'ttd:deck-state-result') {
        if (!validGameState(message.gameState) || !validDecks(message.decks)) return;
        suppressDeckSync = true;
        applyCanonicalDecks(message.decks, message.gameState.activeDeckIdx);
        if (typeof renderDeckScreen === 'function') renderDeckScreen();
        saveLocalOnly();
        deckBaseline = deckSignature();
        suppressDeckSync = false;
        return;
      }

      if (message.type === 'ttd:deck-state-error') {
        if (typeof showNotice === 'function') {
          showNotice('Deck Sync', message.message || 'The server rejected that deck change and restored the canonical deck.');
        }
      }
    });

    function announceReadyWhenBooted() {
      readyAttempts += 1;
      if (account && typeof account === 'object' && account.owned && Array.isArray(account.decks)) {
        send('ttd:bridge-ready', { version: 3 });
        return;
      }
      if (readyAttempts >= 500) {
        send('ttd:bridge-sync-error', {
          message: 'The game loaded, but its account state never became ready for secure synchronization.',
        });
        return;
      }
      setTimeout(announceReadyWhenBooted, 20);
    }

    announceReadyWhenBooted();
  }

  async function bootstrapInsideGameClosure() {
    const response = await fetch(GAME_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not reload the v33 game shell (${response.status}).`);
    }

    let html = await response.text();
    const markerIndex = html.lastIndexOf(IIFE_END_MARKER);
    if (markerIndex < 0) {
      throw new Error('The v33 game closure marker could not be located.');
    }

    // The marker survives document.write and tells the parent not to inject this
    // bootstrap script a second time if the rewritten document emits another load.
    html = html.replace('<head>', '<head>\n<meta id="ttd-online-game-bridge" data-mode="internal-v3">');

    const internalSource = `\n\n  /* ============================ ONLINE FIREBASE BRIDGE ============================ */\n  (${installInternalBridge.toString()})();\n`;
    html = html.slice(0, markerIndex) + internalSource + html.slice(markerIndex);

    document.open();
    document.write(html);
    document.close();
  }

  bootstrapInsideGameClosure().catch((err) => {
    console.error('Could not bootstrap the secure online bridge inside v33.', err);
    sendBootstrapError(`Could not secure online gameplay: ${err?.message || 'unknown bootstrap error'}`);
  });
})();
