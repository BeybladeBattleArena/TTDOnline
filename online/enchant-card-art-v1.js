(() => {
  'use strict';
  if(window.__TTD_ENCHANT_CARD_ART_V1)return;

  const originalCardSVG=typeof window.cardSVG==='function'?window.cardSVG:null;
  const assets=window.__TTD_ITEM_ASSETS_V4||{};
  const paths=Object.freeze({
    lesser:assets.card_lesser||'/assets/items/enchant-card-lesser.png',
    master:assets.card_master||'/assets/items/enchant-card-master.png'
  });
  const labels=Object.freeze({
    lesser:'Lesser Enchant Card',
    master:'Master Enchant Card'
  });

  function cardArt(cardId){
    const id=String(cardId||'').toLowerCase();
    const src=paths[id];
    if(!src)return originalCardSVG?originalCardSVG(cardId):'';
    return `<img class="ttdItemArtV1 ttdEnchantCardArtV1" src="${src}" alt="${labels[id]}" draggable="false" decoding="async">`;
  }

  window.cardSVG=cardArt;

  const style=document.createElement('style');
  style.id='ttd-enchant-card-art-v1';
  style.textContent=`
    .ttdEnchantCardArtV1{display:block;object-fit:contain;object-position:center center;image-rendering:auto}
    .shopItemCard .siIcon>.ttdEnchantCardArtV1{width:100%;height:100%;margin:auto;border-radius:4px}
    .chestCard>.ttdEnchantCardArtV1{width:54px;height:74px;margin:0 auto 6px;border-radius:5px}
  `;
  document.head.appendChild(style);

  for(const src of Object.values(paths)){
    try{const img=new Image();img.decoding='async';img.src=src;}catch(_){}
  }

  window.__TTD_ENCHANT_CARD_ART_V1=Object.freeze({paths,cardArt});
})();
