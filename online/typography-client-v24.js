(() => {
  'use strict';

  const STYLE_ID = 'ttd-russo-creepster-v25';
  const LINK_ID = 'ttd-russo-creepster-font-v25';
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Creepster&family=Russo+One&display=swap';
  const FONT_STACK = "'Russo One', sans-serif";
  const ZOMBIE_FONT_STACK = "'Creepster', cursive";

  function installCanvasFont(win) {
    const proto = win?.CanvasRenderingContext2D?.prototype;
    if (!proto || proto.__ttdRussoCreepsterV25) return;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'font');
    if (!descriptor?.get || !descriptor?.set || descriptor.configurable === false) return;
    try {
      Object.defineProperty(proto, 'font', {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get() { return descriptor.get.call(this); },
        set(value) {
          const source = String(value || '');
          const size = source.match(/(?:^|\s)(\d+(?:\.\d+)?)px(?:\s|$)/i)?.[1] || '10';
          descriptor.set.call(this, `400 ${size}px ${FONT_STACK}`);
        },
      });
      Object.defineProperty(proto, '__ttdRussoCreepsterV25', { value: true, configurable: false });
    } catch (err) {
      console.warn('Russo One canvas typography could not be installed.', err);
    }
  }

  function ensureFontLink(doc) {
    if (!doc?.head || doc.getElementById(LINK_ID)) return;
    const preconnect = doc.createElement('link');
    preconnect.rel = 'preconnect';
    preconnect.href = 'https://fonts.googleapis.com';
    doc.head.appendChild(preconnect);

    const link = doc.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    doc.head.appendChild(link);
  }

  function globalCss() {
    return `
      html, body, body *, button, input, select, textarea, option {
        font-family: ${FONT_STACK} !important;
        font-weight: 400 !important;
      }
    `;
  }

  function zombieTitleCss() {
    return `
      #btnZombies h3,
      #zombieModeScreen .topbar .title,
      #zombieModeScreen .modeCard.zombieSub h3 {
        font-family: ${ZOMBIE_FONT_STACK} !important;
        font-weight: 400 !important;
      }
    `;
  }

  function applyOuter() {
    const doc = document;
    if (!doc?.head) return;
    ensureFontLink(doc);
    let style = doc.getElementById(STYLE_ID);
    if (!style) {
      style = doc.createElement('style');
      style.id = STYLE_ID;
      doc.head.appendChild(style);
    }
    style.textContent = globalCss();
  }

  function applyGameFrame() {
    const frame = document.getElementById('gameFrame');
    if (!frame) return false;
    try {
      const doc = frame.contentDocument;
      const win = frame.contentWindow;
      if (!doc?.head || !doc?.documentElement) return false;
      ensureFontLink(doc);
      installCanvasFont(win);

      let style = doc.getElementById(STYLE_ID);
      if (!style) {
        style = doc.createElement('style');
        style.id = STYLE_ID;
        doc.head.appendChild(style);
      }
      // Russo One is authoritative throughout the game, including Zombie battle/result UI.
      // Creepster is intentionally limited to the three Zombie-facing menu title locations.
      style.textContent = globalCss() + zombieTitleCss();
      return true;
    } catch (_) {
      return false;
    }
  }

  applyOuter();

  const frame = document.getElementById('gameFrame');
  frame?.addEventListener('load', () => {
    applyGameFrame();
    setTimeout(applyGameFrame, 50);
    setTimeout(applyGameFrame, 250);
    setTimeout(applyGameFrame, 1000);
  });

  // Re-assert after dynamic result cards/overlays are inserted. This keeps old inline
  // font declarations from resurfacing without broadening the Creepster title scope.
  window.setInterval(applyGameFrame, 500);
})();
