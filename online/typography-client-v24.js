(() => {
  'use strict';

  const STYLE_ID = 'ttd-russo-creepster-v24';
  const LINK_ID = 'ttd-russo-creepster-font-v24';
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Creepster&family=Russo+One&display=swap';
  const FONT_STACK = "'Russo One', sans-serif";
  const ZOMBIE_FONT_STACK = "'Creepster', cursive";
  let zombieModeActive = false;

  function installCanvasFont(win) {
    const proto = win?.CanvasRenderingContext2D?.prototype;
    if (!proto || proto.__ttdRussoCreepsterV24) return;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'font');
    if (!descriptor?.get || !descriptor?.set || descriptor.configurable === false) return;
    try {
      Object.defineProperty(proto, 'font', {
        configurable: descriptor.configurable,
        enumerable: descriptor.enumerable,
        get() { return descriptor.get.call(this); },
        set(value) {
          const source = String(value || '');
          if (win.__ttdZombieTypographyOriginal === true) {
            descriptor.set.call(this, source);
            return;
          }
          const size = source.match(/(?:^|\s)(\d+(?:\.\d+)?)px(?:\s|$)/i)?.[1] || '10';
          descriptor.set.call(this, `400 ${size}px ${FONT_STACK}`);
        },
      });
      Object.defineProperty(proto, '__ttdRussoCreepsterV24', { value: true, configurable: false });
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

  function zombieTitleCss() {
    return `
      #btnZombies h3,
      #zombieModeScreen .topbar .title,
      #zombieModeScreen .modeCard.zombieSub h3,
      html.ttdZombieTypographyActive #modeLabel,
      html.ttdZombieTypographyActive #overlayTitle,
      html.ttdZombieTypographyActive #zSummaryCard h2 {
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
    style.textContent = `
      html, body, body *, button, input, select, textarea, option {
        font-family: ${FONT_STACK} !important;
        font-weight: 400 !important;
      }
    `;
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
      win.__ttdZombieTypographyOriginal = zombieModeActive;
      doc.documentElement.classList.toggle('ttdZombieTypographyActive', zombieModeActive);

      let style = doc.getElementById(STYLE_ID);
      if (!style) {
        style = doc.createElement('style');
        style.id = STYLE_ID;
        doc.head.appendChild(style);
      }
      style.textContent = (zombieModeActive ? '' : `
        html, body, body *, button, input, select, textarea, option {
          font-family: ${FONT_STACK} !important;
          font-weight: 400 !important;
        }
      `) + zombieTitleCss();
      return true;
    } catch (_) {
      return false;
    }
  }

  function setZombieMode(active) {
    const next = !!active;
    if (zombieModeActive === next) return;
    zombieModeActive = next;
    applyGameFrame();
  }

  applyOuter();

  const frame = document.getElementById('gameFrame');
  frame?.addEventListener('load', () => {
    zombieModeActive = false;
    applyGameFrame();
    setTimeout(applyGameFrame, 50);
    setTimeout(applyGameFrame, 250);
    setTimeout(applyGameFrame, 1000);
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    const message = event.data || {};
    if (message.type !== 'ttd:v6-run-begin-request') return;
    const modeKey = String(message.modeKey || '').toLowerCase();
    setZombieMode(modeKey.includes('zombie') || modeKey.includes('horde') || modeKey === 'endlesshorde');
  }, true);

  // Creepster is restored on Zombie-facing menu titles at all times. Once a Zombie run starts,
  // the rest of Zombie battle/results typography passes through to the original game rules.
  const timer = setInterval(() => {
    applyGameFrame();
    if (!zombieModeActive) return;
    try {
      const doc = frame?.contentDocument;
      if (doc?.getElementById('homeScreen')?.classList.contains('active')) setZombieMode(false);
    } catch (_) {}
  }, 500);
})();
