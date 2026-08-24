(() => {
  'use strict';
  if(window.__TTD_ITEM_ART_POLISH_V4)return;
  const frame=document.getElementById('gameFrame');
  const STYLE_ID='ttd-item-art-polish-v4';

  function apply(){
    try{
      const doc=frame?.contentDocument;
      if(!doc?.head)return false;
      let style=doc.getElementById(STYLE_ID);
      if(!style){style=doc.createElement('style');style.id=STYLE_ID;doc.head.appendChild(style);}
      style.textContent=`
        /* Approved source art remains native-resolution. Only card presentation is resized. */
        .ttdItemArtV1,
        .shopItemCard img,
        .tiItem img,
        .chestCard img,
        .rewardPopupCard img{
          object-fit:contain!important;
          object-position:center center!important;
          image-rendering:auto!important;
        }

        /* Shop cards share fixed visual rows so art, names, prices, and buttons line up. */
        .shopItemCard{
          display:grid!important;
          grid-template-rows:68px minmax(34px,auto) 24px 32px!important;
          align-items:center!important;
          justify-items:stretch!important;
          align-content:start!important;
          min-height:184px!important;
          padding:12px 10px 10px!important;
          text-align:center!important;
        }
        .shopItemCard .siIcon{
          width:68px!important;
          height:68px!important;
          margin:0 auto!important;
          display:grid!important;
          place-items:center!important;
          align-self:center!important;
          justify-self:center!important;
          flex:none!important;
        }
        .shopItemCard .siIcon>svg{
          width:64px!important;
          height:64px!important;
          display:block!important;
          margin:auto!important;
        }
        .shopItemCard .siIcon .ttdItemArtV1,
        .shopItemCard>.ttdItemArtV1,
        .shopItemCard .siIcon>img{
          width:64px!important;
          height:64px!important;
          max-width:64px!important;
          max-height:64px!important;
          margin:auto!important;
          display:block!important;
        }
        .shopItemCard .siName{
          min-height:34px!important;
          margin:0!important;
          padding:2px 2px!important;
          display:grid!important;
          place-items:center!important;
          align-self:stretch!important;
          text-align:center!important;
          line-height:1.25!important;
          overflow-wrap:anywhere!important;
        }
        .shopItemCard .siCost{
          min-height:24px!important;
          margin:0!important;
          padding:0!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          text-align:center!important;
        }
        .shopItemCard .siBuyBtn{
          width:100%!important;
          min-height:32px!important;
          margin:0!important;
          align-self:end!important;
        }

        /* Legacy + avatar Items inventory cards use the same four-row rhythm. */
        .tiGrid{align-items:stretch!important;}
        .tiItem{
          display:grid!important;
          grid-template-rows:64px minmax(30px,auto) 18px 28px!important;
          align-items:center!important;
          justify-items:stretch!important;
          align-content:start!important;
          min-height:158px!important;
          padding:8px 6px 7px!important;
          text-align:center!important;
        }
        .tiItem .tiIcon{
          width:64px!important;
          height:64px!important;
          margin:0!important;
          display:grid!important;
          place-items:center!important;
          align-self:center!important;
          justify-self:center!important;
        }
        .tiItem .tiIcon svg{
          width:58px!important;
          height:58px!important;
          margin:auto!important;
          display:block!important;
        }
        .tiItem .tiIcon img{
          width:60px!important;
          height:60px!important;
          max-width:60px!important;
          max-height:60px!important;
          margin:auto!important;
          display:block!important;
          border-radius:6px!important;
        }
        .tiItem .tiName{
          min-height:30px!important;
          margin:0!important;
          padding:1px 2px!important;
          display:grid!important;
          place-items:center!important;
          align-self:stretch!important;
          text-align:center!important;
          line-height:1.2!important;
          overflow-wrap:anywhere!important;
        }
        .tiItem .tiRare{
          min-height:18px!important;
          margin:0!important;
          padding:0!important;
          display:grid!important;
          place-items:center!important;
          align-self:stretch!important;
          text-align:center!important;
          line-height:1.1!important;
        }
        .tiItem .tiAct{
          width:100%!important;
          height:28px!important;
          min-height:28px!important;
          margin:0!important;
          align-self:end!important;
        }

        /* Original reward/chest inventory cards keep artwork and labels centered too. */
        .chestCard{
          align-items:center!important;
          justify-items:center!important;
          text-align:center!important;
        }
        .chestCard .ttdItemArtV1,
        .rewardPopupCard .ttdItemArtV1{
          width:74px!important;
          height:74px!important;
          max-width:74px!important;
          max-height:74px!important;
          margin:0 auto 7px!important;
          display:block!important;
        }
        .chestCard .cname,
        .chestCard .cdiff,
        .rewardPopupCard h3,
        .rewardPopupCard p{
          width:100%!important;
          text-align:center!important;
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
  window.__TTD_ITEM_ART_POLISH_V4=Object.freeze({apply});
  window.__TTD_ITEM_ART_POLISH_V3=window.__TTD_ITEM_ART_POLISH_V4;
  window.__TTD_ITEM_ART_POLISH_V2=window.__TTD_ITEM_ART_POLISH_V4;
})();
