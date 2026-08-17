(() => {
  'use strict';

  const ORIGIN = location.origin;
  const GAME_PATH = '/random-dice-game-33.html';
  const CORE_BRIDGE_PATH = '/online/game-bridge-inner.js?v=4';
  const PROGRESSION_BRIDGE_PATH = '/online/progression-bridge-v5.js?v=5';
  const IIFE_END_MARKER = '\n})();\n</' + 'script>';

  function send(type, payload = {}) {
    window.parent.postMessage({ type, ...payload }, ORIGIN);
  }

  async function loadText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
    return response.text();
  }

  async function boot() {
    send('ttd:bridge-phase', { phase: 'loader-started', message: 'Preparing secure online game…' });

    const [gameHtml, coreBridgeSource, progressionBridgeSource] = await Promise.all([
      loadText(GAME_PATH),
      loadText(CORE_BRIDGE_PATH),
      loadText(PROGRESSION_BRIDGE_PATH),
    ]);

    send('ttd:bridge-phase', { phase: 'assets-loaded', message: 'Secure game assets loaded…' });

    const markerIndex = gameHtml.lastIndexOf(IIFE_END_MARKER);
    if (markerIndex < 0) throw new Error('The v33 game closure marker could not be located.');

    const injected = `\n\n  /* ============================ ONLINE FIREBASE BRIDGE ============================ */\n${coreBridgeSource}\n\n  /* ============================ ONLINE PROGRESSION V5 ============================ */\n${progressionBridgeSource}\n`;
    const transformed = gameHtml.slice(0, markerIndex) + injected + gameHtml.slice(markerIndex);

    send('ttd:bridge-phase', { phase: 'document-ready', message: 'Starting secured v33 runtime…' });

    document.open();
    document.write(transformed);
    document.close();
  }

  boot().catch((err) => {
    console.error('Online game loader failed.', err);
    send('ttd:bridge-sync-error', {
      message: `Could not secure online gameplay: ${err?.message || 'unknown loader error'}`,
    });
  });
})();
