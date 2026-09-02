(() => {
  'use strict';
  if (window.__TTD_COLLECTION_CARD_CONTAINMENT_V1) return;
  window.__TTD_COLLECTION_CARD_CONTAINMENT_V1 = true;

  const style = document.createElement('style');
  style.id = 'ttd-collection-card-containment-v1-style';
  style.textContent = `
    /* Final card-box authority. Both normal and Overdrive cards must stay inside their own grid row. */
    #collectionGrid{
      grid-auto-rows:92px!important;
      row-gap:9px!important;
      column-gap:7px!important;
      align-items:stretch!important;
    }
    #collectionGrid > .colCard,
    #collectionGrid > .colCard.ttdOdCard{
      position:relative!important;
      top:auto!important;right:auto!important;bottom:auto!important;left:auto!important;
      transform:none!important;
      width:100%!important;
      height:92px!important;
      min-height:92px!important;
      max-height:92px!important;
      margin:0!important;
      box-sizing:border-box!important;
      overflow:hidden!important;
      align-self:stretch!important;
      isolation:isolate!important;
    }
    #collectionGrid > .colCard .favBtn{
      top:3px!important;
      right:3px!important;
    }
    #collectionGrid > .colCard .clsBadge{
      top:3px!important;
      left:3px!important;
    }
    #collectionGrid > .colCard .deckMark{
      right:4px!important;
      bottom:4px!important;
    }
    #collectionGrid > .colCard.ttdOdCard .ttdOdCostBadge{
      right:3px!important;
      bottom:3px!important;
    }
    #collectionGrid > .colCard .glyphWrap{
      flex:0 0 auto!important;
      max-width:34px!important;
      max-height:34px!important;
    }
    #collectionGrid > .colCard .cname{
      max-width:100%!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      display:-webkit-box!important;
      -webkit-box-orient:vertical!important;
      -webkit-line-clamp:2!important;
    }
    #collectionGrid > .colCard .ccls{
      max-width:100%!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      white-space:nowrap!important;
    }

    @media (max-width:420px){
      #collectionGrid{grid-auto-rows:88px!important;row-gap:8px!important;column-gap:6px!important;}
      #collectionGrid > .colCard,
      #collectionGrid > .colCard.ttdOdCard{
        height:88px!important;
        min-height:88px!important;
        max-height:88px!important;
      }
    }
    @media (max-height:650px) and (orientation:portrait){
      #collectionGrid{grid-auto-rows:84px!important;row-gap:7px!important;}
      #collectionGrid > .colCard,
      #collectionGrid > .colCard.ttdOdCard{
        height:84px!important;
        min-height:84px!important;
        max-height:84px!important;
      }
      #collectionGrid > .colCard .glyphWrap{max-width:29px!important;max-height:29px!important;}
    }
  `;
  document.head.appendChild(style);

  const normalize = () => {
    const grid = document.getElementById('collectionGrid');
    if (!grid) return;
    grid.querySelectorAll(':scope > .colCard').forEach((card) => {
      card.style.removeProperty('translate');
      card.style.removeProperty('inset');
    });
    window.__TTD_COLLECTION_PANEL_SYNC?.();
  };

  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      normalize();
    });
  };

  const bind = () => {
    const grid = document.getElementById('collectionGrid');
    if (!grid) return false;
    if (grid.dataset.ttdCardContainmentBound !== '1') {
      grid.dataset.ttdCardContainmentBound = '1';
      new MutationObserver(queue).observe(grid, {childList:true, subtree:false});
    }
    queue();
    return true;
  };

  let attempts = 0;
  const retry = () => {
    attempts += 1;
    if (bind()) return;
    if (attempts < 160) setTimeout(retry, 50);
  };
  retry();
})();