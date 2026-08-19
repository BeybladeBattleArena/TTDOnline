(() => {
  'use strict';

  const STYLE_ID = 'ttd-advent-pro-v22';
  const LINK_ID = 'ttd-advent-pro-font-v22';
  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Advent+Pro:wght@400&display=swap';
  const FONT_STACK = "'Advent Pro', sans-serif";

  function installCanvasFont(win) {
    const proto = win?.CanvasRenderingContext2D?.prototype;
    if (!proto || proto.__ttdAdventProV22) return;
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
      Object.defineProperty(proto, '__ttdAdventProV22', { value: true, configurable: false });
    } catch (err) {
      console.warn('Advent Pro canvas typography could not be installed.', err);
    }
  }

  function applyToDocument(doc) {
    if (!doc?.head || !doc?.documentElement) return false;
    if (!doc.getElementById(LINK_ID)) {
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
    installCanvasFont(doc.defaultView);
    return true;
  }

  function applyOuter() {
    applyToDocument(document);
  }

  function applyGameFrame() {
    const frame = document.getElementById('gameFrame');
    if (!frame) return false;
    try {
      return applyToDocument(frame.contentDocument);
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

  // The game loader replaces its own document with document.write(). Keep checking until the
  // final game document exists so the typography layer cannot be lost during that handoff.
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    const applied = applyGameFrame();
    const gameReady = (() => {
      try { return !!document.getElementById('gameFrame')?.contentDocument?.getElementById('app'); }
      catch (_) { return false; }
    })();
    if ((applied && gameReady) || attempts >= 60) clearInterval(timer);
  }, 500);
})();
