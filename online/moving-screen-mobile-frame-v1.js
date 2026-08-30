(() => {
  'use strict';
  if (window.__TTD_MOVING_SCREEN_MOBILE_FRAME_V1) return;
  window.__TTD_MOVING_SCREEN_MOBILE_FRAME_V1 = true;

  const TITLE_ID='ttdMsHudTitleFrameV1';
  const STYLE_ID='ttdMovingScreenMobileFrameV1Style';
  let previousPauseText=null;

  function installStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #gameScreen.ttd-moving-screen-v4{
        top:0!important;
        bottom:34px!important;
        height:auto!important;
        min-height:0!important;
        overflow:hidden!important;
      }
      #gameScreen.ttd-moving-screen-v4 #hud{
        flex:0 0 auto!important;
        min-height:62px!important;
        padding:8px 10px 7px!important;
        overflow:hidden!important;
      }
      #gameScreen.ttd-moving-screen-v4 .hud-left{
        flex:1 1 auto!important;
        min-width:0!important;
        gap:7px!important;
        overflow:hidden!important;
      }
      #gameScreen.ttd-moving-screen-v4 .hud-left>*{
        display:none!important;
      }
      #gameScreen.ttd-moving-screen-v4 .hud-left>#pauseBtn,
      #gameScreen.ttd-moving-screen-v4 .hud-left>#${TITLE_ID}{
        display:flex!important;
      }
      #gameScreen.ttd-moving-screen-v4 #pauseBtn{
        flex:0 0 auto!important;
        width:auto!important;
        min-width:64px!important;
        height:34px!important;
        padding:0 10px!important;
        align-items:center!important;
        justify-content:center!important;
        border-radius:9px!important;
        font-size:10px!important;
      }
      #${TITLE_ID}{
        flex:1 1 auto!important;
        min-width:0!important;
        max-width:250px!important;
        align-items:center!important;
        color:var(--gold-glow,#f3d491)!important;
        font:700 12px/1.08 'Cinzel',serif!important;
        letter-spacing:.035em!important;
        white-space:normal!important;
        overflow:hidden!important;
      }
      #gameScreen.ttd-moving-screen-v4 .hud-stats{
        flex:0 0 auto!important;
        gap:9px!important;
      }
      #gameScreen.ttd-moving-screen-v4 #laneWrap{
        min-height:0!important;
        flex:1 1 0!important;
      }
      #gameScreen.ttd-moving-screen-v4 #tray{
        position:relative!important;
        z-index:35!important;
        flex:0 0 auto!important;
        display:block!important;
        min-height:86px!important;
        overflow:visible!important;
      }
      #gameScreen.ttd-moving-screen-v4 #ttdMsControlsV4{
        display:grid!important;
        min-height:86px!important;
        visibility:visible!important;
        opacity:1!important;
      }
      #gameScreen.ttd-moving-screen-v4 #ttdMsButtonsV4,
      #gameScreen.ttd-moving-screen-v4 #ttdMsExitV4,
      #gameScreen.ttd-moving-screen-v4 #ttdMsSummonV4{
        visibility:visible!important;
        opacity:1;
      }
      @media(max-width:560px){
        #gameScreen.ttd-moving-screen-v4{
          bottom:max(104px,calc(env(safe-area-inset-bottom) + 84px))!important;
        }
        #gameScreen.ttd-moving-screen-v4 #hud{
          min-height:66px!important;
          padding:7px 7px 6px!important;
          gap:5px!important;
        }
        #gameScreen.ttd-moving-screen-v4 .hud-left{
          gap:6px!important;
        }
        #gameScreen.ttd-moving-screen-v4 #pauseBtn{
          min-width:62px!important;
          height:34px!important;
          padding:0 8px!important;
        }
        #${TITLE_ID}{
          max-width:176px!important;
          font-size:10.5px!important;
          line-height:1.08!important;
        }
        #gameScreen.ttd-moving-screen-v4 .hud-stats{
          gap:7px!important;
        }
        #gameScreen.ttd-moving-screen-v4 .hud-stat .label{
          font-size:6.5px!important;
        }
        #gameScreen.ttd-moving-screen-v4 .hud-stat .value{
          font-size:12px!important;
        }
        #gameScreen.ttd-moving-screen-v4 #tray{
          min-height:82px!important;
        }
        #gameScreen.ttd-moving-screen-v4 #ttdMsControlsV4{
          min-height:82px!important;
          padding:7px 7px calc(7px + env(safe-area-inset-bottom))!important;
        }
        #gameScreen.ttd-moving-screen-v4 #ttdMsExitV4,
        #gameScreen.ttd-moving-screen-v4 #ttdMsSummonV4{
          min-height:48px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncTitle(){
    const game=document.getElementById('gameScreen');
    const active=game?.classList.contains('ttd-moving-screen-v4')===true;
    let title=document.getElementById(TITLE_ID);
    const pause=document.getElementById('pauseBtn');
    if(active){
      const left=game.querySelector('.hud-left');
      if(left&&!title){
        title=document.createElement('div');
        title.id=TITLE_ID;
        title.textContent='Moving Screen · Neon Rooftops';
        pause?.insertAdjacentElement('afterend',title);
      }
      if(pause){
        if(previousPauseText===null)previousPauseText=pause.textContent;
        if(pause.textContent!=='Back')pause.textContent='Back';
        if(pause.getAttribute('aria-label')!=='Back to Arcade')pause.setAttribute('aria-label','Back to Arcade');
      }
    }else{
      if(title)title.remove();
      if(pause&&previousPauseText!==null){
        if(pause.textContent!==previousPauseText)pause.textContent=previousPauseText;
        if(pause.hasAttribute('aria-label'))pause.removeAttribute('aria-label');
      }
      previousPauseText=null;
    }
  }

  installStyles();
  syncTitle();
  const root=document.getElementById('app')||document.documentElement;
  new MutationObserver(syncTitle).observe(root,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
  window.addEventListener('resize',()=>requestAnimationFrame(syncTitle));
})();
