(() => {
  'use strict';
  if (window.__TTD_PRACTICE_LOOP_BRIDGE_V1) return;
  window.__TTD_PRACTICE_LOOP_BRIDGE_V1 = true;

  let wasActive = false;

  function restoreAdventurePracticePath() {
    try {
      if (window.__TTD_PRACTICE?.settings?.field !== 'adventure') return;
      const lane = document.getElementById('laneWrap');
      const w = Math.max(1, Number(cw || lane?.clientWidth || 300));
      const h = Math.max(1, Number(ch || lane?.clientHeight || 200));
      pathPts = [
        { x: w * 0.50, y: h * 0.20 },
        { x: w * 0.25, y: h * 0.30 },
        { x: w * 0.72, y: h * 0.40 },
        { x: w * 0.28, y: h * 0.52 },
        { x: w * 0.75, y: h * 0.64 },
        { x: w * 0.32, y: h * 0.76 },
        { x: w * 0.68, y: h * 0.88 }
      ];
      segLens = [];
      totalLen = 0;
      for (let i = 1; i < pathPts.length; i += 1) {
        const dx = pathPts[i].x - pathPts[i - 1].x;
        const dy = pathPts[i].y - pathPts[i - 1].y;
        const len = Math.hypot(dx, dy);
        segLens.push(len);
        totalLen += len;
      }
      towerPos = pathPts[pathPts.length - 1];
    } catch (error) {
      console.warn('Practice Mode could not restore its Adventure path.', error);
    }
  }

  function startBattleLoop() {
    try {
      if (!window.__TTD_PRACTICE?.active) return;
      if (typeof resizeCanvas === 'function') resizeCanvas();
      restoreAdventurePracticePath();
      if (typeof lastT !== 'undefined') lastT = 0;
      if (typeof loop === 'function') requestAnimationFrame(loop);
    } catch (error) {
      console.error('Practice Mode could not start the battle simulation loop.', error);
    }
  }

  function watch() {
    const active = !!document.getElementById('gameScreen')?.classList.contains('ttdPracticeActive')
      && !!window.__TTD_PRACTICE?.active;
    if (active && !wasActive) requestAnimationFrame(startBattleLoop);
    wasActive = active;
    requestAnimationFrame(watch);
  }

  watch();
})();