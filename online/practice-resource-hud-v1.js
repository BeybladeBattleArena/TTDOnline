(() => {
  'use strict';
  if (window.__TTD_PRACTICE_RESOURCE_HUD_V1) return;
  window.__TTD_PRACTICE_RESOURCE_HUD_V1 = true;

  function pinResourceHud() {
    if (window.__TTD_PRACTICE?.active) {
      const hud = document.getElementById('ttdDriveHud');
      if (hud) {
        hud.classList.add('on', 'ready');
        const dp = hud.querySelector('.ttdMeterLine.dp');
        const drive = hud.querySelector('.ttdMeterLine.drive');
        if (dp) {
          const value = dp.querySelector('.value');
          const fill = dp.querySelector('.ttdMeterFill');
          if (value) value.textContent = '∞ / ∞';
          if (fill) fill.style.width = '100%';
        }
        if (drive) {
          const value = drive.querySelector('.value');
          const fill = drive.querySelector('.ttdMeterFill');
          if (value) value.textContent = '100%';
          if (fill) fill.style.width = '100%';
        }
      }
      document.querySelectorAll('#gameScreen .ttdOverdriveBattleSlot').forEach((slot) => {
        slot.classList.add('ready');
        if (slot.classList.contains('filled')) slot.title = `${slot.title?.split(' · ')[0] || 'Overdrive'} · Practice Mode · DP cost ignored`;
      });
    }
    requestAnimationFrame(pinResourceHud);
  }

  requestAnimationFrame(pinResourceHud);
})();