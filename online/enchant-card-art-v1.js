(() => {
  'use strict';
  if(window.__TTD_ENCHANT_CARD_ART_V2)return;

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
    return `<img class="ttdItemArtV1 ttdEnchantCardArtV2" src="${src}" alt="${labels[id]}" draggable="false" decoding="async">`;
  }

  // Keep the direct hook for renderers that resolve cardSVG through window.
  window.cardSVG=cardArt;

  const style=document.createElement('style');
  style.id='ttd-enchant-card-art-v2';
  style.textContent=`
    .ttdEnchantCardArtV2{display:block!important;object-fit:contain!important;object-position:center center!important;image-rendering:auto!important}
    .shopItemCard.ttdEnchantShopCardV2{grid-template-rows:112px minmax(34px,auto) 24px 32px!important;min-height:228px!important}
    .shopItemCard.ttdEnchantShopCardV2 .siIcon{width:72px!important;height:112px!important;margin:0 auto!important;display:grid!important;place-items:center!important}
    .shopItemCard.ttdEnchantShopCardV2 .siIcon>.ttdEnchantCardArtV2{width:64px!important;height:112px!important;max-width:64px!important;max-height:112px!important;margin:auto!important;border-radius:5px!important}
    .chestCard.cardCard.ttdEnchantInventoryCardV2>.ttdEnchantCardArtV2{width:58px!important;height:102px!important;max-width:58px!important;max-height:102px!important;margin:0 auto 7px!important;border-radius:5px!important}
  `;
  document.head.appendChild(style);

  function identify(card){
    const text=String(card.querySelector('.siName,.cname')?.textContent||'').trim().toLowerCase();
    if(text==='lesser enchant card')return 'lesser';
    if(text==='master enchant card')return 'master';
    return null;
  }

  function makeImage(id){
    const img=document.createElement('img');
    img.className='ttdItemArtV1 ttdEnchantCardArtV2';
    img.src=paths[id];
    img.alt=labels[id];
    img.draggable=false;
    img.decoding='async';
    return img;
  }

  function applyCard(card){
    const id=identify(card);
    if(!id)return false;

    if(card.classList.contains('shopItemCard')){
      const icon=card.querySelector('.siIcon');
      if(!icon)return false;
      const existing=icon.querySelector('.ttdEnchantCardArtV2');
      if(!existing || existing.getAttribute('src')!==paths[id]) icon.replaceChildren(makeImage(id));
      card.classList.add('ttdEnchantShopCardV2');
      card.dataset.ttdEnchantCard=id;
      return true;
    }

    if(card.matches('.chestCard.cardCard')){
      let img=card.querySelector(':scope > .ttdEnchantCardArtV2');
      if(!img){
        card.querySelectorAll(':scope > svg').forEach((node)=>node.remove());
        img=makeImage(id);
        card.insertBefore(img,card.firstChild);
      }else if(img.getAttribute('src')!==paths[id]){
        img.src=paths[id];
        img.alt=labels[id];
      }
      card.classList.add('ttdEnchantInventoryCardV2');
      card.dataset.ttdEnchantCard=id;
      return true;
    }
    return false;
  }

  function apply(root=document){
    let changed=false;
    try{
      if(root?.nodeType===1 && root.matches?.('.shopItemCard,.chestCard.cardCard')) changed=applyCard(root)||changed;
      root?.querySelectorAll?.('.shopItemCard,.chestCard.cardCard').forEach((card)=>{changed=applyCard(card)||changed;});
    }catch(_){}
    return changed;
  }

  let queued=false;
  const queueApply=()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;apply();});
  };
  const observer=new MutationObserver(queueApply);
  observer.observe(document.documentElement,{childList:true,subtree:true});

  for(const src of Object.values(paths)){
    try{const img=new Image();img.decoding='async';img.src=src;}catch(_){}
  }
  apply();
  setTimeout(apply,100);
  setTimeout(apply,500);

  window.__TTD_ENCHANT_CARD_ART_V2=Object.freeze({paths,cardArt,apply});
  window.__TTD_ENCHANT_CARD_ART_V1=window.__TTD_ENCHANT_CARD_ART_V2;
})();
