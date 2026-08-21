(() => {
  'use strict';
  if (window.__TTD_GAME_PRESENTATION_V1) return;
  window.__TTD_GAME_PRESENTATION_V1 = true;

  const SIGNAL_ID = 'ttdGameSignalV1';
  const MISSION_GAP_MS = 1250;
  const MISSION_START_HOLD_MS = 1050;
  const CLEAR_HIDE_MS = 1400;
  const CLEAR_REMOVE_MS = 1700;
  const RESULT_REVEAL_MS = 1850;
  let missionBusy = false;
  let adventureClearBusy = false;
  let zombieClearBusy = false;

  const style = document.createElement('style');
  style.id = 'ttdGamePresentationStyleV1';
  style.textContent = `
    #${SIGNAL_ID}{
      position:absolute;inset:0;z-index:260;pointer-events:none;
      display:flex;align-items:center;justify-content:center;
      background:rgba(5,8,16,.10);opacity:0;
      transition:opacity .24s ease;
    }
    #${SIGNAL_ID}.show{opacity:1;}
    #${SIGNAL_ID} .ttdSignalStack{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transform:translateY(-3%);}
    #${SIGNAL_ID} .ttdSignalWord{
      margin:0;padding:0;line-height:1.02;text-align:center;white-space:nowrap;
      font-family:'Cinzel',serif;font-size:clamp(30px,8vw,54px);font-weight:700;
      letter-spacing:.055em;color:var(--gold-glow,#f3d491);
      text-shadow:0 2px 0 rgba(0,0,0,.92),0 0 12px rgba(243,212,145,.42);
      opacity:0;transform:scale(.76);filter:blur(2px);
      transition:opacity .20s ease,transform .28s cubic-bezier(.18,.78,.26,1.18),filter .22s ease;
    }
    #${SIGNAL_ID} .ttdSignalWord.in{opacity:1;transform:scale(1);filter:blur(0);}
    #${SIGNAL_ID}.leaving .ttdSignalWord{opacity:0;transform:scale(1.07);filter:blur(2px);transition:opacity .26s ease,transform .28s ease,filter .25s ease;}

    /* The older combined MISSION START overlay is suppressed while V1 owns the cue. */
    body.ttdMissionCueV1 .missionStartOverlay{display:none!important;}

    /* Adventure and Zombie results use the same reveal motion and surface treatment. */
    #gameOverlay.ttdResultCardV1,
    #zSummaryOverlay.ttdResultCardV1{
      background:rgba(8,9,16,.91)!important;
      backdrop-filter:blur(1.5px);
    }
    #gameOverlay.ttdResultCardV1.show,
    #zSummaryOverlay.ttdResultCardV1.show{animation:ttdResultRevealV1 .34s cubic-bezier(.2,.72,.25,1) both;}
    #zSummaryOverlay.ttdResultCardV1 #zSummaryCard{
      width:min(360px,92vw)!important;max-height:88%!important;overflow:auto!important;
      padding:20px 22px!important;border:0!important;border-radius:0!important;
      background:transparent!important;box-shadow:none!important;text-align:center!important;
    }
    #zSummaryOverlay.ttdResultCardV1 #zSummaryCard h2{
      font-family:'Cinzel',serif!important;font-size:24px!important;color:var(--gold-glow,#f3d491)!important;
      letter-spacing:.04em!important;margin:0 0 8px!important;
    }
    @keyframes ttdResultRevealV1{
      0%{opacity:0;transform:scale(.985)}
      100%{opacity:1;transform:scale(1)}
    }

    /* MVP treatment: deliberately tight to the die itself. */
    #zSummaryCard .ttdMvpLabelV1{
      margin-top:11px!important;color:#8fc4e8!important;
      font:700 11px 'Cinzel',serif!important;letter-spacing:.13em!important;
      text-shadow:0 0 8px rgba(143,196,232,.34)!important;
    }
    #zSummaryCard .ttdMvpDieGlowV1{
      position:relative!important;overflow:visible!important;
      box-shadow:0 0 5px rgba(143,196,232,.42),0 0 9px rgba(143,196,232,.18)!important;
      animation:ttdMvpBreatheV1 2.7s ease-in-out infinite!important;
    }
    #zSummaryCard .ttdMvpDieGlowV1::after{
      content:'';position:absolute;inset:-2px;border-radius:inherit;pointer-events:none;
      border:1px solid rgba(191,231,255,.05);box-shadow:0 0 7px rgba(191,231,255,0);
      animation:ttdMvpShineV1 4.6s ease-in-out infinite;
    }
    @keyframes ttdMvpBreatheV1{
      0%,100%{box-shadow:0 0 4px rgba(143,196,232,.30),0 0 8px rgba(143,196,232,.10)}
      50%{box-shadow:0 0 7px rgba(143,196,232,.58),0 0 11px rgba(143,196,232,.20)}
    }
    @keyframes ttdMvpShineV1{
      0%,38%,58%,100%{border-color:rgba(191,231,255,.04);box-shadow:0 0 7px rgba(191,231,255,0)}
      46%{border-color:rgba(211,241,255,.62);box-shadow:0 0 8px rgba(191,231,255,.48)}
      51%{border-color:rgba(191,231,255,.20);box-shadow:0 0 5px rgba(191,231,255,.16)}
    }
  `;
  document.head.appendChild(style);

  function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  function getSignalHost() {
    return document.getElementById('gameScreen') || document.getElementById('app') || document.body;
  }

  function titleStyleFromLegacy(word) {
    const probe = document.createElement('div');
    probe.className = 'awardTitle';
    probe.textContent = 'MISSION';
    probe.style.cssText = 'position:absolute;left:-99999px;top:-99999px;visibility:hidden;';
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const size = parseFloat(cs.fontSize || '0');
    if (size >= 20) {
      word.style.fontFamily = cs.fontFamily;
      word.style.fontSize = cs.fontSize;
      word.style.fontWeight = cs.fontWeight;
      word.style.letterSpacing = cs.letterSpacing;
      word.style.color = cs.color;
      word.style.textShadow = cs.textShadow;
      word.style.lineHeight = cs.lineHeight;
    }
    probe.remove();
  }

  function makeSignal(words) {
    document.getElementById(SIGNAL_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = SIGNAL_ID;
    const stack = document.createElement('div');
    stack.className = 'ttdSignalStack';
    const nodes = words.map((text) => {
      const word = document.createElement('div');
      word.className = 'awardTitle ttdSignalWord';
      word.textContent = text;
      titleStyleFromLegacy(word);
      stack.appendChild(word);
      return word;
    });
    overlay.appendChild(stack);
    getSignalHost().appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    return { overlay, nodes };
  }

  async function playMissionCue(startFn) {
    if (missionBusy) return;
    missionBusy = true;
    document.body.classList.add('ttdMissionCueV1');
    const { overlay, nodes } = makeSignal(['MISSION', 'START!']);
    requestAnimationFrame(() => requestAnimationFrame(() => nodes[0]?.classList.add('in')));
    await sleep(MISSION_GAP_MS);
    nodes[1]?.classList.add('in');

    /* START! is the go cue; begin the authoritative run request here. */
    try { startFn(); } catch (err) { console.error('TTD mission start failed.', err); }

    await sleep(MISSION_START_HOLD_MS);
    overlay.classList.add('leaving');
    overlay.classList.remove('show');
    await sleep(310);
    overlay.remove();
    document.body.classList.remove('ttdMissionCueV1');
    missionBusy = false;
  }

  function wrapStartFunction(name) {
    const base = window[name];
    if (typeof base !== 'function' || base.__ttdMissionWrappedV1) return;
    const wrapped = function(...args) {
      if (missionBusy) return;
      playMissionCue(() => base.apply(this, args));
    };
    wrapped.__ttdMissionWrappedV1 = true;
    window[name] = wrapped;
    try { eval(`${name} = window['${name}'];`); } catch (_) {}
  }

  function playClearCue() {
    const { overlay, nodes } = makeSignal(['CLEAR!']);
    requestAnimationFrame(() => requestAnimationFrame(() => nodes[0]?.classList.add('in')));
    setTimeout(() => {
      overlay.classList.add('leaving');
      overlay.classList.remove('show');
    }, CLEAR_HIDE_MS);
    setTimeout(() => overlay.remove(), CLEAR_REMOVE_MS);
  }

  function decorateAdventureResult() {
    const overlay = document.getElementById('gameOverlay');
    if (overlay) overlay.classList.add('ttdResultCardV1');
  }

  function decorateZombieResult() {
    const overlay = document.getElementById('zSummaryOverlay');
    if (overlay) overlay.classList.add('ttdResultCardV1');
    const card = document.getElementById('zSummaryCard');
    if (!card) return;
    const glyph = card.querySelector('.glyphBig');
    if (glyph) {
      glyph.classList.add('ttdMvpDieGlowV1');
      const label = glyph.previousElementSibling;
      if (label) {
        label.textContent = 'MVP';
        label.classList.add('ttdMvpLabelV1');
      }
    }
  }

  function installClearFlow() {
    if (typeof window.campaignComplete === 'function' && !window.campaignComplete.__ttdClearWrappedV1) {
      const baseCampaignComplete = window.campaignComplete;
      const wrappedCampaignComplete = function(...args) {
        if (adventureClearBusy) return;
        adventureClearBusy = true;
        playClearCue();

        /* Build/finish immediately, but keep the prepared card hidden until the cue is over. */
        const result = baseCampaignComplete.apply(this, args);
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {
          decorateAdventureResult();
          overlay.classList.remove('show');
          void overlay.offsetWidth;
        }
        setTimeout(() => {
          decorateAdventureResult();
          document.getElementById('gameOverlay')?.classList.add('show');
          adventureClearBusy = false;
        }, RESULT_REVEAL_MS);
        return result;
      };
      wrappedCampaignComplete.__ttdClearWrappedV1 = true;
      window.campaignComplete = wrappedCampaignComplete;
      try { campaignComplete = window.campaignComplete; } catch (_) {}
    }

    if (typeof window.endEndlessHorde === 'function' && !window.endEndlessHorde.__ttdClearWrappedV1) {
      const baseEndHorde = window.endEndlessHorde;
      const wrappedEndHorde = function(...args) {
        if (!state?.running || zombieClearBusy) return baseEndHorde.apply(this, args);
        zombieClearBusy = true;
        playClearCue();
        const result = baseEndHorde.apply(this, args);
        /* Existing Horde summary is intentionally scheduled ~2s later; that is our smooth post-CLEAR reveal. */
        setTimeout(() => { decorateZombieResult(); zombieClearBusy = false; }, 2020);
        return result;
      };
      wrappedEndHorde.__ttdClearWrappedV1 = true;
      window.endEndlessHorde = wrappedEndHorde;
      try { endEndlessHorde = window.endEndlessHorde; } catch (_) {}
    }

    if (typeof window.showZombieSummary === 'function' && !window.showZombieSummary.__ttdResultDecoratedV1) {
      const baseShowZombieSummary = window.showZombieSummary;
      const wrappedShowZombieSummary = function(...args) {
        const result = baseShowZombieSummary.apply(this, args);
        decorateZombieResult();
        return result;
      };
      wrappedShowZombieSummary.__ttdResultDecoratedV1 = true;
      window.showZombieSummary = wrappedShowZombieSummary;
      try { showZombieSummary = window.showZombieSummary; } catch (_) {}
    }
  }

  function installAll() {
    wrapStartFunction('startGame');
    wrapStartFunction('startAdventure');
    wrapStartFunction('startAdventureCampaign');
    wrapStartFunction('startEndlessHorde');
    decorateAdventureResult();
    installClearFlow();
  }

  installAll();
  /* Later bridge layers replace some globals during boot; re-assert wrappers briefly, then stop. */
  let tries = 0;
  const timer = setInterval(() => {
    installAll();
    if (++tries > 40) clearInterval(timer);
  }, 100);
})();
