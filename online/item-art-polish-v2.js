(() => {
  'use strict';
  if(window.__TTD_ITEM_ART_POLISH_V3)return;
  const frame=document.getElementById('gameFrame');
  const STYLE_ID='ttd-item-art-polish-v3';

  function apply(){
    try{
      const doc=frame?.contentDocument;
      if(!doc?.head)return false;
      let style=doc.getElementById(STYLE_ID);
      if(!style){style=doc.createElement('style');style.id=STYLE_ID;doc.head.appendChild(style);}
      style.textContent=`
        /* Source art remains full resolution. Card geometry alone standardizes presentation. */
        .ttdItemArtV1{
          object-fit:contain!important;
          image-rendering:auto!important;
        }
        .shopItemCard .siIcon{
          width:68px!important;
          height:68px!important;
          margin:0 auto 8px!important;
          display:grid!important;
          place-items:center!important;
          flex:0 0 68px!important;
        }
        .shopItemCard .siIcon>svg{
          width:64px!important;
          height:64px!important;
          display:block!important;
        }
        .shopItemCard .siIcon .ttdItemArtV1,
        .shopItemCard>.ttdItemArtV1{
          width:64px!important;
          height:64px!important;
          max-width:64px!important;
          max-height:64px!important;
          margin:0 auto 8px!important;
        }
        .chestCard .ttdItemArtV1,
        .rewardPopupCard .ttdItemArtV1{
          width:74px!important;
          height:74px!important;
          max-width:74px!important;
          max-height:74px!important;
          margin:0 auto 7px!important;
        }
      `;
      return true;
    }catch(_){return false;}
  }

  frame?.addEventListener('load',()=>{
    apply();
    setTimeout(apply,80);
    setTimeout(apply,300);
    setTimeout(apply,1000);
  });
  window.setInterval(apply,750);
  apply();
  window.__TTD_ITEM_ART_POLISH_V3=Object.freeze({apply});
  window.__TTD_ITEM_ART_POLISH_V2=window.__TTD_ITEM_ART_POLISH_V3;
})();
