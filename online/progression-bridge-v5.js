(() => {
  'use strict';

  const ORIGIN = location.origin;
  let v5Ready = false;
  let requestCounter = 0;
  let mergePending = null;
  let favoritePending = false;

  function send(type, payload = {}) {
    window.parent.postMessage({ type, ...payload }, ORIGIN);
  }

  function normalizeFavorites(ids) {
    if (!Array.isArray(ids)) return [];
    const seen = new Set();
    const out = [];
    for (const id of ids) {
      if (typeof id !== 'string' || !id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= 10) break;
    }
    return out;
  }

  function applyFavorites(ids) {
    account.favoriteDice = normalizeFavorites(ids);
    saveAccount();
    if (typeof renderCollectionGrid === 'function') renderCollectionGrid();
  }

  function applyDecks(decks) {
    if (!Array.isArray(decks) || decks.length !== 3) return false;
    const sorted = decks.slice().sort((a, b) => a.index - b.index);
    if (!sorted.every((deck, index) => deck && deck.index === index && Array.isArray(deck.slots) && deck.slots.length === 5)) return false;
    account.decks = sorted.map((deck) => deck.slots.map((slot) =>
      slot && typeof slot.key === 'string' && typeof slot.instId === 'string'
        ? { key: slot.key, instId: slot.instId }
        : null));
    return true;
  }

  function addReturnedJewels(jewels) {
    if (!Array.isArray(jewels) || !jewels.length) return [];
    if (!account.inventory || typeof account.inventory !== 'object') account.inventory = { rewards: [], materials: [], enchant: [] };
    if (!Array.isArray(account.inventory.enchant)) account.inventory.enchant = [];
    const existing = new Set(account.inventory.enchant.filter((item) => item && typeof item.id === 'string').map((item) => item.id));
    const added = [];
    for (const jewel of jewels) {
      if (!jewel || jewel.kind !== 'jewel' || typeof jewel.id !== 'string' || existing.has(jewel.id)) continue;
      account.inventory.enchant.push(jewel);
      existing.add(jewel.id);
      added.push(jewel);
    }
    return added;
  }

  function installOnlineChromeRules() {
    const style = document.createElement('style');
    style.id = 'ttd-online-v5-chrome';
    style.textContent = `
      #homeScreen .homeTopRow { display:none !important; }
      #btnBackup { display:none !important; }
    `;
    document.head.appendChild(style);
  }

  const originalMergeInstances = mergeInstances;
  mergeInstances = function onlineAuthoritativeMerge(key, sourceId, targetId, targetCard) {
    if (!v5Ready) {
      if (typeof toastGlobal === 'function') toastGlobal('Finishing online account sync…');
      return;
    }
    if (mergePending) {
      if (typeof toastGlobal === 'function') toastGlobal('A Class merge is already being processed');
      return;
    }
    const requestId = `merge-${Date.now().toString(36)}-${++requestCounter}`;
    mergePending = { requestId, key, sourceId, targetId, targetCard };
    send('ttd:merge-request', { requestId, key, sourceId, targetId });
  };

  document.addEventListener('click', (event) => {
    const favoriteButton = event.target?.closest?.('.favBtn');
    if (!favoriteButton) return;
    const card = favoriteButton.closest('.colCard');
    const instanceId = card?.dataset?.instId;
    if (!instanceId) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!v5Ready) {
      if (typeof toastGlobal === 'function') toastGlobal('Finishing online account sync…');
      return;
    }
    if (favoritePending) {
      if (typeof toastGlobal === 'function') toastGlobal('Favorite change is still syncing');
      return;
    }

    favoritePending = true;
    send('ttd:favorite-toggle-request', {
      requestId: `favorite-${Date.now().toString(36)}-${++requestCounter}`,
      instanceId,
      favorite: !isFavoriteInstance(instanceId),
    });
  }, true);

  window.addEventListener('message', (event) => {
    if (event.origin !== ORIGIN || event.source !== window.parent) return;
    const message = event.data || {};

    if (message.type === 'ttd:favorites-sync') {
      applyFavorites(message.instanceIds || []);
      v5Ready = true;
      return;
    }

    if (message.type === 'ttd:favorite-toggle-result') {
      favoritePending = false;
      applyFavorites(message.instanceIds || []);
      return;
    }

    if (message.type === 'ttd:favorite-toggle-error') {
      favoritePending = false;
      if (typeof showNotice === 'function') showNotice('Favorite Sync', message.message || 'The server rejected that favorite change.');
      return;
    }

    if (message.type === 'ttd:merge-result') {
      if (!mergePending || message.requestId !== mergePending.requestId) return;
      const pending = mergePending;
      mergePending = null;
      const target = message.target?.instance;
      if (!target || target.id !== pending.targetId || !Number.isSafeInteger(target.cls)) {
        if (typeof showNotice === 'function') showNotice('Class Merge', 'The server returned an invalid merge result. Reloading will restore canonical inventory.');
        return;
      }

      const sourceList = account.owned[pending.key] || [];
      account.owned[pending.key] = sourceList.filter((inst) => inst.id !== pending.sourceId);
      let targetInst = findInstance(pending.key, pending.targetId);
      if (!targetInst) {
        targetInst = { id: pending.targetId, cls: target.cls, enchants: [null, null, null, null] };
        account.owned[pending.key].push(targetInst);
      }
      targetInst.cls = target.cls;
      targetInst.enchants = [null, null, null, null];

      applyDecks(message.decks || []);
      account.favoriteDice = normalizeFavorites(message.favoriteIds || []);
      const returnedJewels = addReturnedJewels(message.returnedJewels || []);
      saveAccount();

      const oldClass = Number(message.oldClass || target.cls - 1);
      const newClass = Number(message.newClass || target.cls);
      playClassUpAnimation(pending.key, oldClass, newClass, pending.targetCard).then(() => {
        renderDeckScreen();
        if (returnedJewels.length && typeof showNotice === 'function') {
          const names = returnedJewels.map((jewel) => jewelDisplayName(jewel.jewelId, jewel.tier));
          const summary = names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
          setTimeout(() => showNotice(
            'Jewels Returned',
            `${returnedJewels.length} socketed jewel${returnedJewels.length === 1 ? ' was' : 's were'} returned to your Inventory before ${DICE[pending.key].name} merged to Class ${newClass}.<br><br><strong>${summary}</strong>`,
          ), 1250);
        }
      });
      return;
    }

    if (message.type === 'ttd:merge-error') {
      if (mergePending && (!message.requestId || message.requestId === mergePending.requestId)) mergePending = null;
      if (typeof showNotice === 'function') showNotice('Class Merge', message.message || 'The server rejected that Class merge.');
      return;
    }

    if (message.type === 'ttd:open-account-screen') {
      showScreen('backup');
      return;
    }

    if (message.type === 'ttd:open-settings-screen') {
      showScreen('options');
    }
  });

  installOnlineChromeRules();
  send('ttd:v5-progression-ready', { version: 5 });
})();
