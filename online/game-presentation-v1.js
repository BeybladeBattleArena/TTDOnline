(() => {
  'use strict';
  if (window.__TTD_GAME_PRESENTATION_V3) return;
  window.__TTD_GAME_PRESENTATION_V3 = true;

  const SIGNAL_ID = 'ttdGameSignalV3';
  const MISSION_GAP_MS = 1250;
  const MISSION_START_HOLD_MS = 1050;
  const COUNT_STEP_MS = 720;
  const COUNT_START_HOLD_MS = 520;
  const CLEAR_HIDE_MS = 1400;
  const CLEAR_REMOVE_MS = 1700;
  const RESULT_REVEAL_MS = 1850;
  const ZOMBIE_SUPPRESS_MS = 2450;

  let missionBusy = false;
  let countdownBusy = false;
  let adventureClearBusy = false;
  let zombieResultBusy = false;
  let rawZombieSummary = null;
  let suppressZombieSummaryUntil = 0;

  const style = document.createElement('style');
  style.id = 'ttdGamePresentationStyleV3';
  style.textContent = `
    #${SIGNAL_ID}{
      position:fixed;inset:0;z-index:1260;pointer-events:none;
      display:flex;align-items:center;justify-content:center;
      background:rgba(5,8,16,.10);opacity:0;
      transition:opacity .18s ease;
    }
    #${SIGNAL_ID}.show{opacity:1;}
    #${SIGNAL_ID} .ttdSignalStack{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transform:translateY(-3%);}
    #${SIGNAL_ID} .ttdSignalWord{
      margin:0!important;padding:0!important;line-height:1.02!important;text-align:center!important;white-space:nowrap!important;
      font-family:'Russo One',sans-serif!important;font-size:clamp(30px,8vw,54px)!important;font-weight:400!important;
      letter-spacing:.055em!important;color:var(--gold-glow,#f3d491)!important;
      text-shadow:0 2px 0 rgba(0,0,0,.92),0 0 12px rgba(243,212,145,.42)!important;
      visibility:hidden!important;opacity:0!important;transform:scale(.76);filter:blur(2px);
      transition:opacity .18s ease,transform .25s cubic-bezier(.18,.78,.26,1.18),filter .20s ease;
      animation:none!important;
    }
    #${SIGNAL_ID} .ttdSignalWord.in{visibility:visible!important;opacity:1!important;transform:scale(1);filter:blur(0);}
    #${SIGNAL_ID}.leaving .ttdSignalWord{opacity:0!important;transform:scale(1.07);filter:blur(2px);transition:opacity .24s ease,transform .26s ease,filter .22s ease;}
    #${SIGNAL_ID}.countdown{background:rgba(5,8,16,.06);}
    #${SIGNAL_ID}.countdown .ttdSignalWord{font-size:clamp(38px,11vw,70px)!important;}

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

  function makeSignal(words, extraClass='') {
    document.getElementById(SIGNAL_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = SIGNAL_ID;
    if(extraClass) overlay.classList.add(extraClass);
    const stack = document.createElement('div');
    stack.className = 'ttdSignalStack';
    const nodes = words.map((text) => {
      const word = document.createElement('div');
      word.className = 'ttdSignalWord';
      word.textContent = text;
      stack.appendChild(word);
      return word;
    });
    overlay.appendChild(stack);
    document.body.appendChild(overlay);
    return { overlay, nodes };
  }

  function normalizedText(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim();}
  function isLegacyMissionNode(el){
    if(!el || el.closest?.(`#${SIGNAL_ID}`))return false;
    return /^MISSION\s*START!?$/i.test(normalizedText(el));
  }
  function suppressLegacyMissionNode(el){
    if(!isLegacyMissionNode(el))return;
    el.dataset.ttdLegacyMissionSuppressed='1';
    el.style.setProperty('visibility','hidden','important');
    el.style.setProperty('opacity','0','important');
    el.style.setProperty('animation','none','important');
    el.style.setProperty('pointer-events','none','important');
  }
  function scanLegacyMissionNodes(root=document){
    const selectors='.missionStartOverlay,[id*="missionStart" i],[class*="missionStart" i],.awardOverlay,.awardTitle,h1,h2,div,span';
    if(root?.matches?.(selectors))suppressLegacyMissionNode(root);
    root?.querySelectorAll?.(selectors).forEach(suppressLegacyMissionNode);
  }
  scanLegacyMissionNodes();
  const legacyObserver=new MutationObserver((records)=>{
    for(const record of records){
      if(record.type==='characterData'){suppressLegacyMissionNode(record.target?.parentElement);continue;}
      record.addedNodes.forEach((node)=>{if(node.nodeType===1)scanLegacyMissionNodes(node);});
      suppressLegacyMissionNode(record.target);
    }
  });
  legacyObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true});

  async function playMissionCue(startFn) {
    if (missionBusy) return;
    missionBusy = true;
    scanLegacyMissionNodes();
    const { overlay, nodes } = makeSignal(['MISSION', 'START!']);
    nodes[0]?.classList.add('in');
    requestAnimationFrame(() => overlay.classList.add('show'));

    await sleep(MISSION_GAP_MS);
    nodes[1]?.classList.add('in');
    try { startFn?.(); } catch (err) { console.error('TTD mission start failed.', err); }

    await sleep(MISSION_START_HOLD_MS);
    overlay.classList.add('leaving');
    overlay.classList.remove('show');
    await sleep(300);
    overlay.remove();
    missionBusy = false;
  }

  function wrapStartFunction(name) {
    const base = window[name];
    if (typeof base !== 'function' || base.__ttdMissionWrappedV3) return;
    const wrapped = function(...args) {
      /* Nested start calls are part of the same launch and must pass through. Older wrappers
         returned here, which could swallow mode-specific startup work. */
      if (missionBusy) return base.apply(this,args);
      playMissionCue(() => base.apply(this, args));
    };
    wrapped.__ttdMissionWrappedV3 = true;
    wrapped.__ttdMissionBaseV3 = base;
    window[name] = wrapped;
    try { eval(`${name} = window['${name}'];`); } catch (_) {}
  }

  async function playCombatCountdown(onStart) {
    if(countdownBusy){return false;}
    countdownBusy=true;
    const {overlay,nodes}=makeSignal(['3','2','1','START!'],'countdown');
    requestAnimationFrame(()=>overlay.classList.add('show'));
    for(let i=0;i<3;i++){
      if(i>0)nodes[i-1]?.classList.remove('in');
      nodes[i]?.classList.add('in');
      await sleep(COUNT_STEP_MS);
    }
    nodes[2]?.classList.remove('in');
    nodes[3]?.classList.add('in');
    try{onStart?.();}catch(err){console.error('TTD combat countdown start failed.',err);}
    await sleep(COUNT_START_HOLD_MS);
    overlay.classList.add('leaving');overlay.classList.remove('show');
    await sleep(280);overlay.remove();countdownBusy=false;
    return true;
  }

  function playClearCue() {
    const { overlay, nodes } = makeSignal(['CLEAR!']);
    nodes[0]?.classList.add('in');
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => {overlay.classList.add('leaving');overlay.classList.remove('show');}, CLEAR_HIDE_MS);
    setTimeout(() => overlay.remove(), CLEAR_REMOVE_MS);
  }

  function decorateAdventureResult() {document.getElementById('gameOverlay')?.classList.add('ttdResultCardV1');}
  function decorateZombieResult(cardOverride = null) {
    const overlay = document.getElementById('zSummaryOverlay');
    if (overlay) overlay.classList.add('ttdResultCardV1');
    const card = cardOverride || document.getElementById('zSummaryCard');
    if (!card) return;
    const glyph = card.querySelector('.glyphBig');
    if (!glyph) return;
    glyph.classList.add('ttdMvpDieGlowV1');
    const label = glyph.previousElementSibling;
    if (label) {label.textContent = 'MVP';label.classList.add('ttdMvpLabelV1');}
  }
  function revealAdventureResult(){decorateAdventureResult();document.getElementById('gameOverlay')?.classList.add('show');}

  function prepareZombieResult(pipsEarned) {
    if (typeof rawZombieSummary !== 'function') return null;
    const overlay = document.getElementById('zSummaryOverlay');
    const card = document.getElementById('zSummaryCard');
    if (!overlay || !card) return null;
    rawZombieSummary(pipsEarned);
    decorateZombieResult(card);
    overlay.classList.remove('show');
    const marker = document.createComment('ttd-prepared-zombie-result-v3');
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
    if (typeof window.showZombieSummary !== 'function' || window.showZombieSummary.__ttdResultDecoratedV3) return;
    rawZombieSummary = window.showZombieSummary;
    const wrapped = function(...args) {
      if (performance.now() < suppressZombieSummaryUntil) return;
      const result = rawZombieSummary.apply(this, args);
      decorateZombieResult();
      return result;
    };
    wrapped.__ttdResultDecoratedV3 = true;
    window.showZombieSummary = wrapped;
    try { showZombieSummary = window.showZombieSummary; } catch (_) {}
  }

  function installClearFlow() {
    if (typeof window.campaignComplete === 'function' && !window.campaignComplete.__ttdClearWrappedV3) {
      const baseCampaignComplete = window.campaignComplete;
      const wrappedCampaignComplete = function(...args) {
        if (adventureClearBusy) return;
        adventureClearBusy = true;
        playClearCue();
        const result = baseCampaignComplete.apply(this, args);
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {decorateAdventureResult();overlay.classList.remove('show');void overlay.offsetWidth;}
        setTimeout(() => {revealAdventureResult();adventureClearBusy = false;}, RESULT_REVEAL_MS);
        return result;
      };
      wrappedCampaignComplete.__ttdClearWrappedV3 = true;
      window.campaignComplete = wrappedCampaignComplete;
      try { campaignComplete = window.campaignComplete; } catch (_) {}
    }

    if (typeof window.endEndlessHorde === 'function' && !window.endEndlessHorde.__ttdResultWrappedV3) {
      const baseEndHorde = window.endEndlessHorde;
      const wrappedEndHorde = function(...args) {
        if (!state?.running || zombieResultBusy) return baseEndHorde.apply(this, args);
        zombieResultBusy = true;
        const pipsEarned = Math.round((Number(state.kills) || 0) * 2 + (Number(state.zPlayTime) || 0) * .15);
        const result = baseEndHorde.apply(this, args);
        const prepared = prepareZombieResult(pipsEarned);
        suppressZombieSummaryUntil = performance.now() + ZOMBIE_SUPPRESS_MS;
        setTimeout(() => {revealZombieResult(prepared);zombieResultBusy = false;}, RESULT_REVEAL_MS);
        return result;
      };
      wrappedEndHorde.__ttdResultWrappedV3 = true;
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
    scanLegacyMissionNodes();
  }

  window.TTDGamePresentation = Object.freeze({
    version: 3,
    missionGapMs: MISSION_GAP_MS,
    combatCountdownStepMs: COUNT_STEP_MS,
    clearHideMs: CLEAR_HIDE_MS,
    resultRevealMs: RESULT_REVEAL_MS,
    showMissionStart: playMissionCue,
    playCombatCountdown,
    showClear: playClearCue,
    presentObjectiveClear,
    decorateAdventureResult,
    decorateZombieResult,
    rebind: installAll,
  });

  installAll();
  let tries = 0;
  const timer = setInterval(() => {
    installAll();
    if (++tries > 100) clearInterval(timer);
  }, 100);
})();
