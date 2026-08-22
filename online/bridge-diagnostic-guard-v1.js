(() => {
  'use strict';
  if (window.__TTD_BRIDGE_DIAGNOSTIC_GUARD_V1) return;
  window.__TTD_BRIDGE_DIAGNOSTIC_GUARD_V1 = true;

  const STORAGE_KEY = 'ttd_bridge_diagnostics_v1';
  const MAX_ENTRIES = 20;
  const diagnostics = [];
  window.__TTD_BRIDGE_DIAGNOSTICS = diagnostics;

  function remember(message) {
    const entry = {
      at: new Date().toISOString(),
      phase: String(message?.phase || ''),
      bridge: String(message?.bridge || ''),
      message: String(message?.message || 'Unknown nonfatal bridge error'),
    };
    diagnostics.push(entry);
    while (diagnostics.length > MAX_ENTRIES) diagnostics.shift();
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(diagnostics)); } catch (_) {}
    console.warn('[TTD nonfatal bridge diagnostic]', entry.bridge || entry.phase, entry.message);
    try { window.dispatchEvent(new CustomEvent('ttd:bridge-diagnostic', { detail: entry })); } catch (_) {}
  }

  // The game loader deliberately labels these as "failed without blocking later bridges".
  // They are diagnostics, not startup phases. The Firebase shell's normal bridge-phase handler
  // arms a fatal 15-second startup watchdog, so consume this one phase before that handler sees it.
  // Capture listeners on Window run before the shell's non-capture message listener even though
  // this module is registered later in document order.
  window.addEventListener('message', (event) => {
    const frame = document.getElementById('gameFrame');
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    const message = event.data || {};
    if (message.type !== 'ttd:bridge-phase' || message.phase !== 'bridge-runtime-error') return;
    remember(message);
    event.stopImmediatePropagation();
  }, true);
})();
