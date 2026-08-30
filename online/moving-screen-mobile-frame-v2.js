(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_MOBILE_FRAME_V2)return;
  window.__TTD_MOVING_SCREEN_MOBILE_FRAME_V2=true;

  const STYLE_ID='ttdMovingScreenMobileFrameV2Style';
  function installStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
      #ttdMsHudTitleFrameV1{display:none!important}
      #gameScreen.ttd-moving-screen-v4{top:0!important;bottom:max(8px,env(safe-area-inset-bottom))!important;height:auto!important;min-height:0!important;overflow:hidden!important;}
      #gameScreen.ttd-moving-screen-v4 #hud{flex:0 0 auto!important;min-height:56px!important;padding:7px 9px 6px!important;overflow:hidden!important;gap:6px!important;}
      #gameScreen.ttd-moving-screen-v4 .hud-left{flex:1 1 auto!important;min-width:0!important;gap:7px!important;overflow:hidden!important;align-items:center!important;}
      #gameScreen.ttd-moving-screen-v4 .hud-left>*:not(#modeLabel):not(#endRunBtn){display:none!important;}
      #gameScreen.ttd-moving-screen-v4 #modeLabel{display:flex!important;flex:1 1 auto!important;min-width:0!important;max-width:310px!important;align-items:center!important;color:var(--gold-glow,#f3d491)!important;font:400 12px/1.08 'Russo One',sans-serif!important;letter-spacing:.025em!important;white-space:normal!important;overflow:hidden!important;text-overflow:ellipsis!important;}
      #gameScreen.ttd-moving-screen-v4 .hud-stats{flex:0 0 auto!important;gap:8px!important;align-items:center!important;}
      #gameScreen.ttd-moving-screen-v4 #laneWrap{min-height:0!important;flex:1 1 0!important;}
      #gameScreen.ttd-moving-screen-v4 #tray{position:relative!important;z-index:35!important;flex:0 0 auto!important;display:flex!important;flex-direction:column!important;min-height:0!important;height:auto!important;overflow:visible!important;background:#060914!important;}
      #gameScreen.ttd-moving-screen-v4 #ttdMsControlsV4{display:grid!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;}
      @media(max-width:560px){
        #gameScreen.ttd-moving-screen-v4{bottom:max(5px,env(safe-area-inset-bottom))!important;}
        #gameScreen.ttd-moving-screen-v4 #hud{min-height:58px!important;padding:6px 7px 5px!important;gap:4px!important;}
        #gameScreen.ttd-moving-screen-v4 .hud-left{gap:5px!important;}
        #gameScreen.ttd-moving-screen-v4 #modeLabel{max-width:210px!important;font-size:10.5px!important;line-height:1.08!important;}
        #gameScreen.ttd-moving-screen-v4 .hud-stats{gap:6px!important;}
        #gameScreen.ttd-moving-screen-v4 .hud-stat .label{font-size:6.5px!important;}
        #gameScreen.ttd-moving-screen-v4 .hud-stat .value{font-size:12px!important;}
      }
    `;document.head.appendChild(style);
  }
  function sync(){installStyles();document.getElementById('ttdMsHudTitleFrameV1')?.remove();const game=document.getElementById('gameScreen');if(!game?.classList.contains('ttd-moving-screen-v4'))return;const label=document.getElementById('modeLabel'),stage=window.TTDMovingScreen?.stage;if(label&&stage?.name){const text=`Moving Screen · ${stage.name}`;if(label.textContent!==text)label.textContent=text;}}
  installStyles();sync();const game=document.getElementById('gameScreen');if(game)new MutationObserver(()=>requestAnimationFrame(sync)).observe(game,{attributes:true,attributeFilter:['class']});const queue=()=>requestAnimationFrame(sync);window.addEventListener('resize',queue,{passive:true});window.visualViewport?.addEventListener('resize',queue,{passive:true});
})();