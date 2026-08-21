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
  const ZOMBIE_SUPPRESS_MS = 2450;

  let missionBusy = false;
  let adventureClearBusy = false;
  let zombieResultBusy = false;
  let rawZombieSummary = null;
  let suppressZombieSummaryUntil = 0;

  const style = document.createElement('style');
  style.id = 'ttdGamePresentationStyleV1';
  style.textContent = `
    #${SIGNAL_ID}{
      position:fixed;inset:0;z-index:1260;pointer-events:none;
      display:flex;align-items:center;justify-content:center;
      background:rgba(5,8,16,.10);opacity:0;
      transition:opacity .24s ease;
    }
    #${SIGNAL_ID}.show{opacity:1;}
    #${SIGNAL_ID} .ttdSignalStack{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transform:translateY(-3%);}
    #${SIGNAL_ID} .ttdSignalWord{
      margin:0!important;padding:0!important;line-height:1.02!important;text-align:center!important;white-space:nowrap!important;
      font-family:'Russo One',sans-serif!important;font-size:clamp(30px,8vw,54px)!important;font-weight:400!important;
      letter-spacing:.055em!important;color:var(--gold-glow,#f3d491)!important;
      text-shadow:0 2px 0 rgba(0,0,0,.92),0 0 12px rgba(243,212,145,.42)!important;
      visibility:hidden!important;opacity:0!important;transform:scale(.76);filter:blur(2px);
      transition:opacity .20s ease,transform .28s cubic-bezier(.18,.78,.26,1.18),filter .22s ease;
      animation:none!important;
    }
    #${SIGNAL_ID} .ttdSignalWord.in{visibility:visible!important;opacity:1!important;transform:scale(1);filter:blur(0);}
    #${SIGNAL_ID}.leaving .ttdSignalWord{opacity:0!important;transform:scale(1.07);filter:blur(2px);transition:opacity .26s ease,transform .28s ease,filter .25s ease;}

    /* Adventure and Zombie results share one presentation surface and reveal motion. */
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
      font-family:'Russo One',sans-serif!important;font-size:24px!important;font-weight:400!important;color:var(--gold-glow,#f3d491)!important;
      letter-spacing:.04em!important;margin:0 0 8px!important;
    }
    @keyframes ttdResultRevealV1{0%{opacity:0;transform:scale(.985)}100%{opacity:1;transform:scale(1)}}

    /* MVP treatment stays tight to the die only. */
    #zSummaryCard .ttdMvpLabelV1{
      margin-top:11px!important;color:#8fc4e8!important;
      font:400 11px 'Russo One',sans-serif!important;letter-spacing:.13em!important;
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

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function makeSignal(words) {
    document.getElementById(SIGNAL_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = SIGNAL_ID;
    const stack = document.createElement('div');
    stack.className = 'ttdSignalStack';
    const nodes = words.map((text) => {
      const word = document.createElement('div');
      /* Deliberately do NOT use .awardTitle here. Legacy award keyframes were able to reveal
         START before its timer and Zombie typography could restyle the cue through that class. */
      word.className = 'ttdSignalWord';
      word.textContent = text;
      stack.appendChild(word);
      return word;
    });
    overlay.appendChild(stack);
    document.body.appendChild(overlay);
    return { overlay, nodes };
  }

  function beginLegacyMissionSuppression() {
    const saved = new Map();
    const candidates = () => document.querySelectorAll(
      '.missionStartOverlay,[id*="mission" i],[class*="mission" i],.awardOverlay,.awardTitle,h1,h2'
    );
    const restore = (el) => {
      const before = saved.get(el); if (!before) return;
      if (before.visibility) el.style.setProperty('visibility', before.visibility.value, before.visibility.priority);
      else el.style.removeProperty('visibility');
      if (before.opacity) el.style.setProperty('opacity', before.opacity.value, before.opacity.priority);
      else el.style.removeProperty('opacity');
      saved.delete(el);
    };
    const scan = () => {
      for (const el of candidates()) {
        if (el.closest?.(`#${SIGNAL_ID}`)) continue;
        const text = String(el.textContent || '').replace(/\s+/g, ' ').trim();
        const match = text.length <= 100 && /MISSION/i.test(text) && /START!?/i.test(text);
        if (match && !saved.has(el)) {
          saved.set(el, {
            visibility: el.style.getPropertyValue('visibility') ? { value:el.style.getPropertyValue('visibility'), priority:el.style.getPropertyPriority('visibility') } : null,
            opacity: el.style.getPropertyValue('opacity') ? { value:el.style.getPropertyValue('opacity'), priority:el.style.getPropertyPriority('opacity') } : null,
          });
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('opacity', '0', 'important');
        } else if (!match && saved.has(el)) restore(el);
      }
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
    scan();
    return () => { observer.disconnect(); for (const el of [...saved.keys()]) restore(el); };
  }

  async function playMissionCue(startFn) {
    if (missionBusy) return;
    missionBusy = true;
    const stopLegacySuppression = beginLegacyMissionSuppression();
    const { overlay, nodes } = makeSignal(['MISSION', 'START!']);

    /* MISSION becomes visible synchronously. START remains visibility:hidden until the exact gap. */
    nodes[0]?.classList.add('in');
    requestAnimationFrame(() => overlay.classList.add('show'));

    await sleep(MISSION_GAP_MS);
    nodes[1]?.classList.add('in');

    /* START! is the go cue. The authoritative run request begins here. */
    try { startFn(); } catch (err) { console.error('TTD mission start failed.', err); }

    await sleep(MISSION_START_HOLD_MS);
    overlay.classList.add('leaving');
    overlay.classList.remove('show');
    await sleep(310);
    overlay.remove();

    /* Keep suppressing any old combined cue through the remainder of its legacy animation. */
    setTimeout(stopLegacySuppression, 1200);
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
    wrapped.__ttdMissionBaseV1 = base;
    window[name] = wrapped;
    try { eval(`${name} = window['${name}'];`); } catch (_) {}
  }

  function playClearCue() {
    const { overlay, nodes } = makeSignal(['CLEAR!']);
    nodes[0]?.classList.add('in');
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => {
      overlay.classList.add('leaving');
      overlay.classList.remove('show');
    }, CLEAR_HIDE_MS);
    setTimeout(() => overlay.remove(), CLEAR_REMOVE_MS);
  }

  function decorateAdventureResult() {
    document.getElementById('gameOverlay')?.classList.add('ttdResultCardV1');
  }

  function decorateZombieResult(cardOverride = null) {
    const overlay = document.getElementById('zSummaryOverlay');
    if (overlay) overlay.classList.add('ttdResultCardV1');
    const card = cardOverride || document.getElementById('zSummaryCard');
    if (!card) return;
    const glyph = card.querySelector('.glyphBig');
    if (!glyph) return;
    glyph.classList.add('ttdMvpDieGlowV1');
    const label = glyph.previousElementSibling;
    if (label) {
      label.textContent = 'MVP';
      label.classList.add('ttdMvpLabelV1');
    }
  }

  function revealAdventureResult() {
    decorateAdventureResult();
    document.getElementById('gameOverlay')?.classList.add('show');
  }

  function prepareZombieResult(pipsEarned) {
    if (typeof rawZombieSummary !== 'function') return null;
    const overlay = document.getElementById('zSummaryOverlay');
    const card = document.getElementById('zSummaryCard');
    if (!overlay || !card) return null;

    rawZombieSummary(pipsEarned);
    decorateZombieResult(card);
    overlay.classList.remove('show');

    /* Detach the fully-built card while hidden. Its button listener stays alive, but the
       reward-counter bridge cannot see it and therefore cannot animate behind the curtain. */
    const marker = document.createComment('ttd-prepared-zombie-result-v1');
    card.replaceWith(marker);
    return { overlay, card, marker };
  }

  function revealZombieResult(prepared) {
    if (!prepared) return;
    if (prepared.marker.parentNode) prepared.marker.replaceWith(prepared.card);
    decorateZombieResult(prepared.card);
    void prepared.overlay.offsetWidth;
    prepared.overlay.classList.add('show');
  }

  function installSummaryWrapper() {
    if (typeof window.showZombieSummary !== 'function' || window.showZombieSummary.__ttdResultDecoratedV1) return;
    rawZombieSummary = window.showZombieSummary;
    const wrapped = function(...args) {
      if (performance.now() < suppressZombieSummaryUntil) return;
      const result = rawZombieSummary.apply(this, args);
      decorateZombieResult();
      return result;
    };
    wrapped.__ttdResultDecoratedV1 = true;
    window.showZombieSummary = wrapped;
    try { showZombieSummary = window.showZombieSummary; } catch (_) {}
  }

  function installClearFlow() {
    if (typeof window.campaignComplete === 'function' && !window.campaignComplete.__ttdClearWrappedV1) {
      const baseCampaignComplete = window.campaignComplete;
      const wrappedCampaignComplete = function(...args) {
        if (adventureClearBusy) return;
        adventureClearBusy = true;
        playClearCue();

        /* Finish and build now, then keep the prepared card hidden until after CLEAR. */
        const result = baseCampaignComplete.apply(this, args);
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {
          decorateAdventureResult();
          overlay.classList.remove('show');
          void overlay.offsetWidth;
        }
        setTimeout(() => {
          revealAdventureResult();
          adventureClearBusy = false;
        }, RESULT_REVEAL_MS);
        return result;
      };
      wrappedCampaignComplete.__ttdClearWrappedV1 = true;
      window.campaignComplete = wrappedCampaignComplete;
      try { campaignComplete = window.campaignComplete; } catch (_) {}
    }

    /* Endless Horde ends on defeat, wipeout, or End Run, so it gets the same preloaded card
       presentation but deliberately does NOT say CLEAR. Future objective-complete Zombie modes
       should use the public objective-clear presenter below. */
    if (typeof window.endEndlessHorde === 'function' && !window.endEndlessHorde.__ttdResultWrappedV1) {
      const baseEndHorde = window.endEndlessHorde;
      const wrappedEndHorde = function(...args) {
        if (!state?.running || zombieResultBusy) return baseEndHorde.apply(this, args);
        zombieResultBusy = true;
        const pipsEarned = Math.round((Number(state.kills) || 0) * 2 + (Number(state.zPlayTime) || 0) * .15);

        const result = baseEndHorde.apply(this, args);
        const prepared = prepareZombieResult(pipsEarned);
        suppressZombieSummaryUntil = performance.now() + ZOMBIE_SUPPRESS_MS;
        setTimeout(() => {
          revealZombieResult(prepared);
          zombieResultBusy = false;
        }, RESULT_REVEAL_MS);
        return result;
      };
      wrappedEndHorde.__ttdResultWrappedV1 = true;
      window.endEndlessHorde = wrappedEndHorde;
      try { endEndlessHorde = window.endEndlessHorde; } catch (_) {}
    }
  }

  function presentObjectiveClear({ prepare, reveal, delay = RESULT_REVEAL_MS } = {}) {
    playClearCue();
    const prepared = typeof prepare === 'function' ? prepare() : undefined;
    setTimeout(() => { if (typeof reveal === 'function') reveal(prepared); }, Math.max(0, Number(delay) || RESULT_REVEAL_MS));
    return prepared;
  }

  function installAll() {
    wrapStartFunction('startGame');
    wrapStartFunction('startAdventure');
    wrapStartFunction('startAdventureCampaign');
    wrapStartFunction('startEndlessHorde');
    installSummaryWrapper();
    decorateAdventureResult();
    installClearFlow();
  }

  window.TTDGamePresentation = Object.freeze({
    version: 2,
    missionGapMs: MISSION_GAP_MS,
    clearHideMs: CLEAR_HIDE_MS,
    resultRevealMs: RESULT_REVEAL_MS,
    showClear: playClearCue,
    presentObjectiveClear,
    decorateAdventureResult,
    decorateZombieResult,
    rebind: installAll,
  });

  installAll();
  /* The online bridge now loads this module after its final Test Map start wrapper. Keep a
     longer low-cost safety window for unusually slow cloud/bootstrap layers without tying the
     presentation loader to any one gameplay mode. */
  let tries = 0;
  const timer = setInterval(() => {
    installAll();
    if (++tries > 120) clearInterval(timer);
  }, 250);
})();
