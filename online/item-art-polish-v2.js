(() => {
  'use strict';
  if(window.__TTD_ITEM_ART_POLISH_V2)return;
  const frame=document.getElementById('gameFrame');
  const STYLE_ID='ttd-item-art-polish-v2';

  function apply(){
    try{
      const doc=frame?.contentDocument;
      if(!doc?.head)return false;
      let style=doc.getElementById(STYLE_ID);
      if(!style){style=doc.createElement('style');style.id=STYLE_ID;doc.head.appendChild(style);}
      style.textContent=`
        /* The normalized item WebPs in this asset batch are 64px masters. The old 48px
           shop rule downsampled them once more, then the card layout could rescale that
           result again. Keep the presentation near native size and let the browser use
           normal continuous-image interpolation. */
        .shopItemCard .siIcon{
          width:64px!important;
          height:64px!important;
          margin:0 auto 8px!important;
          display:grid!important;
          place-items:center!important;
          flex:0 0 64px!important;
        }
        .shopItemCard .siIcon>svg{
          width:60px!important;
          height:60px!important;
          display:block!important;
        }
        .shopItemCard .siIcon .ttdItemArtV1,
        .shopItemCard>.ttdItemArtV1{
          width:60px!important;
          height:60px!important;
          max-width:60px!important;
          max-height:60px!important;
          margin:0 auto 8px!important;
          object-fit:contain!important;
          image-rendering:auto!important;
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
  window.__TTD_ITEM_ART_POLISH_V2=Object.freeze({apply});
})();
