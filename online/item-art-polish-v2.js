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
        /* Approved source art remains untouched. Presentation only scales it with contain. */
        .ttdItemArtV1,
        .shopItemCard img,
        .tiItem img,
        #invGrid>.chestCard img,
        .rewardPopupCard img{
          object-fit:contain!important;
          object-position:center center!important;
          image-rendering:auto!important;
        }

        /* Canonical Shop shell: one card footprint in every item category. */
        #shopGrid{align-items:start!important;}
        .shopItemCard{
          box-sizing:border-box!important;
          height:196px!important;
          min-height:196px!important;
          max-height:196px!important;
          display:grid!important;
          grid-template-rows:88px 40px 24px 32px!important;
          align-items:center!important;
          justify-items:stretch!important;
          align-content:start!important;
          padding:8px 10px 4px!important;
          text-align:center!important;
          overflow:hidden!important;
        }
        .shopItemCard .siIcon{
          width:88px!important;
          height:88px!important;
          margin:0 auto!important;
          display:grid!important;
          place-items:center!important;
          align-self:center!important;
          justify-self:center!important;
          flex:none!important;
          overflow:visible!important;
        }
        .shopItemCard .siIcon>svg{
          width:78px!important;
          height:78px!important;
          max-width:78px!important;
          max-height:78px!important;
          display:block!important;
          margin:auto!important;
        }
        .shopItemCard .siIcon .ttdItemArtV1,
        .shopItemCard>.ttdItemArtV1,
        .shopItemCard .siIcon>img{
          width:82px!important;
          height:82px!important;
          max-width:82px!important;
          max-height:82px!important;
          margin:auto!important;
          display:block!important;
        }
        .shopItemCard .siName{
          height:40px!important;
          min-height:40px!important;
          max-height:40px!important;
          margin:0!important;
          padding:2px!important;
          display:grid!important;
          place-items:center!important;
          align-self:stretch!important;
          text-align:center!important;
          line-height:1.2!important;
          overflow:hidden!important;
          overflow-wrap:anywhere!important;
        }
        .shopItemCard .siCost{
          height:24px!important;
          min-height:24px!important;
          max-height:24px!important;
          margin:0!important;
          padding:0!important;
          display:flex!important;
          align-items:center!important;
          justify-content:center!important;
          text-align:center!important;
        }
        .shopItemCard .siBuyBtn{
          width:100%!important;
          height:32px!important;
          min-height:32px!important;
          max-height:32px!important;
          margin:0!important;
          padding:0 8px!important;
          align-self:end!important;
        }

        /* Canonical Inventory shell, based on the Adventure reward chest footprint. */
        #invGrid{align-items:start!important;}
        #invGrid>.chestCard,
        .tiGrid>.tiItem{
          box-sizing:border-box!important;
          height:176px!important;
          min-height:176px!important;
          max-height:176px!important;
          display:grid!important;
          grid-template-rows:82px 38px 20px 28px!important;
          align-items:center!important;
          justify-items:stretch!important;
          align-content:start!important;
          padding:5px 7px 3px!important;
          text-align:center!important;
          overflow:hidden!important;
        }

        /* Current Items inventory cards. */
        .tiGrid{align-items:start!important;}
        .tiItem .tiIcon{
          width:82px!important;
          height:82px!important;
          margin:0 auto!important;
          display:grid!important;
          place-items:center!important;
          align-self:center!important;
          justify-self:center!important;
        }
        .tiItem .tiIcon svg{
          width:74px!important;
          height:74px!important;
          max-width:74px!important;
          max-height:74px!important;
          margin:auto!important;
          display:block!important;
        }
        .tiItem .tiIcon img{
          width:78px!important;
          height:78px!important;
          max-width:78px!important;
          max-height:78px!important;
          margin:auto!important;
          display:block!important;
          border-radius:6px!important;
        }
        .tiItem .tiName{
          height:38px!important;
          min-height:38px!important;
          max-height:38px!important;
          margin:0!important;
          padding:1px 2px!important;
          display:grid!important;
          place-items:center!important;
          align-self:stretch!important;
          text-align:center!important;
          line-height:1.2!important;
          overflow:hidden!important;
          overflow-wrap:anywhere!important;
        }
        .tiItem .tiRare{
          height:20px!important;
          min-height:20px!important;
          max-height:20px!important;
          margin:0!important;
          padding:0!important;
          display:grid!important;
          place-items:center!important;
          align-self:stretch!important;
          text-align:center!important;
          line-height:1.1!important;
          overflow:hidden!important;
        }
        .tiItem .tiAct{
          width:100%!important;
          height:28px!important;
          min-height:28px!important;
          max-height:28px!important;
          margin:0!important;
          padding:0 6px!important;
          align-self:end!important;
        }

        /* Legacy/Adventure inventory cards use the same rows. Missing buttons simply leave row 4 empty. */
        #invGrid>.chestCard{
          align-items:center!important;
          justify-items:center!important;
          text-align:center!important;
        }
        #invGrid>.chestCard>svg{
          width:74px!important;
          height:74px!important;
          max-width:74px!important;
          max-height:74px!important;
          margin:auto!important;
          display:block!important;
        }
        #invGrid>.chestCard>.ttdItemArtV1{
          width:78px!important;
          height:78px!important;
          max-width:78px!important;
          max-height:78px!important;
          margin:auto!important;
          display:block!important;
        }
        #invGrid>.chestCard .cname{
          width:100%!important;
          height:38px!important;
          min-height:38px!important;
          max-height:38px!important;
          margin:0!important;
          padding:1px 2px!important;
          display:grid!important;
          place-items:center!important;
          line-height:1.2!important;
          overflow:hidden!important;
          overflow-wrap:anywhere!important;
          text-align:center!important;
        }
        #invGrid>.chestCard .cdiff{
          width:100%!important;
          height:20px!important;
          min-height:20px!important;
          max-height:20px!important;
          margin:0!important;
          padding:0!important;
          display:grid!important;
          place-items:center!important;
          overflow:hidden!important;
          text-align:center!important;
        }
        #invGrid>.chestCard .chestOpenBtn{
          width:100%!important;
          height:28px!important;
          min-height:28px!important;
          max-height:28px!important;
          margin:0!important;
          padding:0 4px!important;
          align-self:end!important;
        }

        /* Detail/reward popups are intentionally not forced into the inventory tile footprint. */
        .rewardPopupCard .ttdItemArtV1{
          width:74px!important;
          height:74px!important;
          max-width:74px!important;
          max-height:74px!important;
          margin:0 auto 7px!important;
          display:block!important;
        }
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
