(() => {
  'use strict';
  if(window.__TTD_ADVENTURE_PLATFORM_MOBILE_INPUT_V3)return;
  window.__TTD_ADVENTURE_PLATFORM_MOBILE_INPUT_V3=true;

  // Navigator selection is shown on the normal battle board, whose dice already own pointer/drag
  // gestures. Intercept pointerdown in document capture phase before those handlers can consume the
  // mobile gesture, then deliberately dispatch the click event that platforming v2 already uses to
  // select the exact highlighted state.board instance.
  document.addEventListener('pointerdown',(event)=>{
    const game=document.getElementById('gameScreen');
    if(!game?.classList.contains('ttd-nav-instance-select'))return;
    const target=event.target;
    const tile=target?.closest?.('#board .tile.ttd-nav-choice');
    if(!tile)return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Fire after the capture handler unwinds so no native drag sequence can race the selector.
    queueMicrotask(()=>{
      if(!document.getElementById('gameScreen')?.classList.contains('ttd-nav-instance-select'))return;
      if(!tile.isConnected||!tile.classList.contains('ttd-nav-choice'))return;
      tile.click();
    });
  },true);
})();
