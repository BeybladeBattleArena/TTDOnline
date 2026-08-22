(() => {
  'use strict';
  if (window.__TTD_BRIDGE_SESSION_GUARD_V2) return;
  window.__TTD_BRIDGE_SESSION_GUARD_V2 = true;

  const STARTUP_PHASES = new Set(['loader-started','assets-loaded','document-ready']);
  const STORAGE_KEY = 'ttd_bridge_diagnostics_v2';
  const MAX_ENTRIES = 30;
  const diagnostics = [];
  let synced = false;

  window.__TTD_BRIDGE_DIAGNOSTICS_V2 = diagnostics;

  function remember(message, reason) {
    const entry = {
      at: new Date().toISOString(),
      reason,
      phase: String(message?.phase || ''),
      bridge: String(message?.bridge || ''),
      message: String(message?.message || 'Bridge diagnostic'),
    };
    diagnostics.push(entry);
    while (diagnostics.length > MAX_ENTRIES) diagnostics.shift();
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(diagnostics)); } catch (_) {}
    console.warn('[TTD bridge diagnostic]', reason, entry.bridge || entry.phase, entry.message);
  }

  // This classic script is loaded before firebase-client-v4.js. Registration order is
  // deterministic, so the Firebase shell cannot see a non-startup phase before this guard.
  window.addEventListener('message', (event) => {
    const frame = document.getElementById('gameFrame');
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    const message = event.data || {};

    if (message.type === 'ttd:bridge-synced') {
      synced = true;
      return;
    }

    if (message.type !== 'ttd:bridge-phase') return;
    const phase = String(message.phase || '');
    const isStartupPhase = STARTUP_PHASES.has(phase);

    if (phase === 'bridge-runtime-error' || !isStartupPhase || synced) {
      remember(message, synced ? 'late-phase-after-sync' : 'non-startup-phase');
      event.stopImmediatePropagation();
    }
  });
})();
