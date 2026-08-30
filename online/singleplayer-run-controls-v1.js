(() => {
  'use strict';
  if(window.__TTD_SINGLEPLAYER_RUN_CONTROLS_V1)return;
  window.__TTD_SINGLEPLAYER_RUN_CONTROLS_V1=true;

  const STYLE_ID='ttdSingleplayerRunControlsV1Style';
  let movingExitBusy=false;

  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
      .backBtn,.ttdUnifiedBackV1{
        min-width:68px!important;height:36px!important;padding:0 12px!important;border-radius:9px!important;
        display:inline-flex;align-items:center;justify-content:center;
        font:400 11px/1 'Russo One',sans-serif!important;letter-spacing:.02em!important;
      }
      #gameScreen.ttdSingleplayerRunActiveV1 #pauseBtn,
      #gameScreen.ttdSingleplayerRunActiveV1 .backBtn,
      #gameScreen.ttdSingleplayerRunActiveV1 [data-ttd-back]{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #gameScreen.ttdSingleplayerRunActiveV1 #endRunBtn{
        display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;
        align-items:center!important;justify-content:center!important;min-width:78px!important;height:36px!important;padding:0 12px!important;
        border:0!important;border-radius:9px!important;background:linear-gradient(180deg,#f3d491,#d9b26a)!important;
        color:#0a0c14!important;font:400 10.5px/1 'Russo One',sans-serif!important;letter-spacing:.015em!important;
        box-shadow:0 3px 0 rgba(77,55,21,.72),0 6px 14px rgba(0,0,0,.28)!important;text-shadow:none!important;
      }
      @media(max-width:560px){.backBtn,.ttdUnifiedBackV1{min-width:64px!important;height:34px!important;padding:0 10px!important;font-size:10px!important}#gameScreen.ttdSingleplayerRunActiveV1 #endRunBtn{min-width:72px!important;height:34px!important;padding:0 9px!important;font-size:9.5px!important}}
    `;document.head.appendChild(style);
  }
  function coreRunning(){try{return!!state?.running;}catch(_){return false;}}
  function movingRunning(){try{return!!window.TTDMovingScreen?.active;}catch(_){return false;}}
  function singleplayerActive(){const game=document.getElementById('gameScreen');return!!game?.classList.contains('active')&&(movingRunning()||coreRunning());}
  function normalizeBackButtons(){document.querySelectorAll('.backBtn,[data-ttd-back]').forEach(btn=>{if(!(btn instanceof HTMLElement))return;btn.classList.add('ttdUnifiedBackV1');if(String(btn.textContent||'').trim()!=='Back')btn.textContent='Back';if(btn.tagName==='BUTTON'){btn.setAttribute('aria-label','Back');btn.title='Back';}});}
  function sync(){installStyle();normalizeBackButtons();const game=document.getElementById('gameScreen'),active=singleplayerActive();game?.classList.toggle('ttdSingleplayerRunActiveV1',active);const end=document.getElementById('endRunBtn'),pause=document.getElementById('pauseBtn');if(end){if(String(end.textContent||'').trim()!=='End Run')end.textContent='End Run';end.setAttribute('aria-label','End Run');end.title='End Run';if(!active){end.style.removeProperty('display');end.style.removeProperty('visibility');end.style.removeProperty('pointer-events');}}if(pause&&!active&&String(pause.textContent||'').trim()==='‹')pause.textContent='Back';}
  document.addEventListener('click',(event)=>{const button=event.target?.closest?.('#endRunBtn');if(!button||!movingRunning()||movingExitBusy)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();movingExitBusy=true;const exit=document.getElementById('ttdMsExitV4');if(exit)exit.click();else window.TTDMovingScreen?.exit?.();setTimeout(()=>{movingExitBusy=false;sync();},320);},true);
  installStyle();sync();new MutationObserver(()=>requestAnimationFrame(sync)).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});setInterval(sync,240);
})();