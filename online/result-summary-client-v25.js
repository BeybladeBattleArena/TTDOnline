(() => {
  'use strict';

  const frame = document.getElementById('gameFrame');
  const PIPS_MS = 700;
  const EXP_MS = 700;
  const BETWEEN_MS = 90;
  let currentModeKey = '';
  let pending = null;
  let pollTimer = null;

  function gameDocument() {
    try { return frame?.contentDocument || null; } catch (_) { return null; }
  }

  function isZombieMode(key = currentModeKey) {
    const k = String(key || '').toLowerCase();
    return k.includes('zombie') || k.includes('horde') || k === 'endlesshorde';
  }

  function formatCounter(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).padStart(3, '0');
  }

  function predictedPips(message) {
    const mode = String(currentModeKey || '').toLowerCase();
    const kills = Math.max(0, Number(message.kills) || 0);
    const completedWaves = Math.max(0, Number(message.completedWaves) || 0);
    const coinGold = Math.max(0, Number(message.coinGold) || 0);
    const wave = Math.max(0, Number(message.wave) || 0);
    const playSeconds = Math.max(0, Number(message.playSeconds) || 0);
    if (mode === 'adventure') return Math.round(wave * 10 + kills * 1.2 + coinGold + (message.typhoonDefeated ? 150 : 0));
    if (mode === 'endlesshorde' || isZombieMode(mode)) return Math.round(kills * 2 + playSeconds * 0.15);
    const mult = mode === 'bossrush' ? 1.3 : mode === 'sudden' ? 1.6 : 1;
    return Math.round((completedWaves * 8 + kills + coinGold) * mult);
  }

  function ensureLegacyHideStyle(doc) {
    if (!doc?.head || doc.getElementById('ttd-result-summary-hide-v25')) return;
    const style = doc.createElement('style');
    style.id = 'ttd-result-summary-hide-v25';
    style.textContent = `
      #overlayGold, #overlayXpV21, #zSummaryXpV21 { display:none !important; }
      #zSummaryCard > .goldPill { display:none !important; }
      #ttdRunRewardsV25 { margin-top:10px; display:flex; flex-direction:column; gap:5px; text-align:center; }
      #ttdRunRewardsV25 .ttdRewardLine { font-size:13px; line-height:1.45; letter-spacing:.02em; }
      #ttdRunRewardsV25 .ttdRewardPips { color:var(--gold-glow,#f3d491); }
      #ttdRunRewardsV25 .ttdRewardExp { color:var(--astra-glow,#d4ecfa); }
      #ttdRunRewardsV25 .ttdRewardLevel { color:var(--parchment,#ece7da); font-size:12px; min-height:0; }
    `;
    doc.head.appendChild(style);
  }

  function makeBlock(doc) {
    const block = doc.createElement('div');
    block.id = 'ttdRunRewardsV25';
    block.innerHTML = `
      <div class="ttdRewardLine ttdRewardPips" id="ttdRewardPipsV25">000 Pips banked!</div>
      <div class="ttdRewardLine ttdRewardExp" id="ttdRewardExpV25">000 EXP earned!</div>
      <div class="ttdRewardLine ttdRewardLevel" id="ttdRewardLevelV25"></div>
    `;
    return block;
  }

  function ensureRewardBlock() {
    const doc = gameDocument();
    if (!doc || !pending) return null;
    ensureLegacyHideStyle(doc);
    let block = doc.getElementById('ttdRunRewardsV25');
    if (block) return block;

    const zombieVisible = isZombieMode() || doc.getElementById('zSummaryOverlay')?.classList.contains('show');
    if (zombieVisible) {
      const card = doc.getElementById('zSummaryCard');
      const button = doc.getElementById('zSummaryOkBtn');
      if (!card || !button) return null;
      block = makeBlock(doc);
      button.insertAdjacentElement('beforebegin', block);
      return block;
    }

    const overlay = doc.getElementById('gameOverlay');
    const stats = doc.getElementById('overlayStats');
    if (!overlay?.classList.contains('show') || !stats) return null;
    block = makeBlock(doc);
    stats.insertAdjacentElement('afterend', block);
    return block;
  }

  function animateLine(element, target, suffix, duration) {
    return new Promise((resolve) => {
      if (!element) { resolve(); return; }
      const finalValue = Math.max(0, Math.floor(Number(target) || 0));
      const started = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const shown = t >= 1 ? finalValue : Math.floor(finalValue * eased);
        element.textContent = `${formatCounter(shown)} ${suffix}`;
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }

  function readLegacyResult() {
    const doc = gameDocument();
    if (!doc || !pending) return;
    ensureLegacyHideStyle(doc);

    const legacyExp = doc.getElementById('zSummaryXpV21') || doc.getElementById('overlayXpV21');
    const expText = String(legacyExp?.textContent || '');
    const expMatch = expText.match(/(\d+)\s*EXP/i);
    if (expMatch) pending.xp = Math.max(0, Number(expMatch[1]) || 0);
    const levelMatch = expText.match(/LEVEL UP!\s*Lv\.(\d+)/i);
    if (levelMatch) pending.levelText = `LEVEL UP! Lv.${levelMatch[1]}`;

    const legacyPips = String(doc.getElementById('overlayGold')?.textContent || '');
    const pipsMatch = legacyPips.match(/(\d+)\s*Pips/i);
    if (pipsMatch) pending.actualPips = Math.max(0, Number(pipsMatch[1]) || 0);
  }

  async function maybeStartSequence() {
    if (!pending || pending.sequenceStarted) return;
    const block = ensureRewardBlock();
    if (!block) return;
    pending.sequenceStarted = true;

    const pipsEl = block.querySelector('#ttdRewardPipsV25');
    const expEl = block.querySelector('#ttdRewardExpV25');
    const levelEl = block.querySelector('#ttdRewardLevelV25');
    const pipsTarget = Number.isFinite(pending.actualPips) ? pending.actualPips : pending.predictedPips;
    await animateLine(pipsEl, pipsTarget, 'Pips banked!', PIPS_MS);
    pending.pipsDone = true;

    while (pending && pending.xp == null) {
      await new Promise((resolve) => setTimeout(resolve, 35));
      readLegacyResult();
    }
    if (!pending) return;
    await new Promise((resolve) => setTimeout(resolve, BETWEEN_MS));
    await animateLine(expEl, pending.xp, 'EXP earned!', EXP_MS);
    pending.expDone = true;
    if (levelEl && pending.levelText) levelEl.textContent = pending.levelText;
    setTimeout(() => {
      if (pending?.expDone) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }, 500);
  }

  function beginResult(message) {
    clearInterval(pollTimer);
    pollTimer = null;
    pending = {
      predictedPips: predictedPips(message),
      actualPips: null,
      xp: null,
      levelText: '',
      sequenceStarted: false,
      pipsDone: false,
      expDone: false,
    };

    const doc = gameDocument();
    doc?.getElementById('ttdRunRewardsV25')?.remove();
    ensureLegacyHideStyle(doc);
    maybeStartSequence();
    pollTimer = setInterval(() => {
      readLegacyResult();
      maybeStartSequence();
    }, 40);
  }

  function resetForNewRun() {
    clearInterval(pollTimer);
    pollTimer = null;
    pending = null;
    const doc = gameDocument();
    doc?.getElementById('ttdRunRewardsV25')?.remove();
  }

  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    const message = event.data || {};
    if (message.type === 'ttd:v6-run-begin-request') {
      currentModeKey = String(message.modeKey || '');
      resetForNewRun();
      return;
    }
    if (message.type === 'ttd:v6-run-finish-request') beginResult(message);
  }, true);

  frame?.addEventListener('load', () => {
    resetForNewRun();
    const install = () => ensureLegacyHideStyle(gameDocument());
    install();
    setTimeout(install, 100);
    setTimeout(install, 500);
    setTimeout(install, 1200);
  });
})();
