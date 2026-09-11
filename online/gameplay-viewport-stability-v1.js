(() => {
  'use strict';
  if(window.__TTD_GAMEPLAY_VIEWPORT_STABILITY_V1)return;
  window.__TTD_GAMEPLAY_VIEWPORT_STABILITY_V1=true;

  const style=document.createElement('style');
  style.id='ttdGameplayViewportStabilityV1';
  style.textContent=`
    /* Mobile URL bars change viewport height while the player is doing nothing. Keep combat
       geometry width-derived so the battlefield, board and tray do not jump vertically. */
    #gameScreen:not(.ttd-platform-mode) #laneWrap{
      height:clamp(160px,56vw,235px)!important;
      min-height:160px!important;
      max-height:235px!important;
    }
    /* Traversal receives a pixel height captured when the mode opens. Height-only browser
       chrome changes are ignored; true width/orientation changes recalculate it. */
    #gameScreen.ttd-platform-mode #laneWrap{
      height:var(--ttd-stable-platform-lane-h,auto)!important;
      min-height:var(--ttd-stable-platform-lane-h,230px)!important;
      max-height:var(--ttd-stable-platform-lane-h,none)!important;
    }
    #gameScreen,#laneWrap,#boardWrap,#tray{contain:layout style;}
  `;
  document.head.appendChild(style);

  let lastWidth=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1);
  let lockedPlatformHeight=0;
  let raf=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function game(){return document.getElementById('gameScreen');}
  function lane(){return document.getElementById('laneWrap');}
  function isPlatform(){return !!game()?.classList.contains('ttd-platform-mode');}

  function capturePlatformHeight(force=false){
    const g=game(),l=lane();if(!g||!l||!isPlatform())return;
    const width=Math.max(1,l.getBoundingClientRect().width||window.innerWidth||360);
    if(force||!lockedPlatformHeight){
      const measured=l.getBoundingClientRect().height;
      /* Width-derived fallback remains stable while browser chrome expands/collapses. */
      lockedPlatformHeight=clamp(measured>=220?measured:width*.72,230,430);
    }
    g.style.setProperty('--ttd-stable-platform-lane-h',`${Math.round(lockedPlatformHeight)}px`);
  }
  function clearPlatformHeight(){const g=game();lockedPlatformHeight=0;g?.style.removeProperty('--ttd-stable-platform-lane-h');}
  function scheduleCapture(force=false){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>requestAnimationFrame(()=>capturePlatformHeight(force)));}

  const observer=new MutationObserver(()=>{
    if(isPlatform())scheduleCapture(!lockedPlatformHeight);
    else clearPlatformHeight();
  });
  const beginObserve=()=>{const g=game();if(!g)return false;observer.observe(g,{attributes:true,attributeFilter:['class']});if(isPlatform())scheduleCapture(true);return true;};
  if(!beginObserve()){
    const rootObserver=new MutationObserver(()=>{if(beginObserve())rootObserver.disconnect();});
    rootObserver.observe(document.documentElement,{childList:true,subtree:true});
  }

  function widthAwareResize(){
    const width=Math.max(1,window.innerWidth||document.documentElement.clientWidth||1);
    if(Math.abs(width-lastWidth)>24){lastWidth=width;if(isPlatform()){lockedPlatformHeight=0;scheduleCapture(true);}}
    /* Height-only resize deliberately does nothing. */
  }
  window.addEventListener('resize',widthAwareResize,{passive:true});
  window.visualViewport?.addEventListener('resize',widthAwareResize,{passive:true});
})();
