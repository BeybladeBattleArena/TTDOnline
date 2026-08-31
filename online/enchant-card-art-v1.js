(() => {
  'use strict';
  if(window.__TTD_ENCHANT_CARD_ART_V3)return;

  const asset=(path)=>{
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  };
  const assets=window.__TTD_ITEM_ASSETS_V4||{};
  const paths=Object.freeze({
    lesser:assets.card_lesser||asset('/assets/items/enchant-card-lesser.png'),
    master:assets.card_master||asset('/assets/items/enchant-card-master.png')
  });
  const labels=Object.freeze({
    lesser:'Lesser Enchant Card',
    master:'Master Enchant Card'
  });

  function cardArt(cardId){
    const id=String(cardId||'').toLowerCase();
    const src=paths[id];
    if(!src)return '';
    return `<img class="ttdItemArtV1 ttdEnchantCardArtV3" data-ttd-enchant-art="${id}" src="${src}" alt="${labels[id]}" draggable="false" decoding="async">`;
  }

  // Compatibility for any renderer that actually resolves cardSVG from window.
  window.cardSVG=cardArt;

  const style=document.createElement('style');
  style.id='ttd-enchant-card-art-v3';
  style.textContent=`
    .ttdEnchantCardArtV3{display:block!important;object-fit:contain!important;object-position:center center!important;image-rendering:auto!important}
    .shopItemCard.ttdEnchantShopCardV3{grid-template-rows:112px minmax(34px,auto) 24px 32px!important;min-height:228px!important}
    .shopItemCard.ttdEnchantShopCardV3 .siIcon{width:76px!important;height:112px!important;margin:0 auto!important;display:grid!important;place-items:center!important;overflow:visible!important}
    .shopItemCard.ttdEnchantShopCardV3 .siIcon>.ttdEnchantCardArtV3{width:64px!important;height:112px!important;max-width:64px!important;max-height:112px!important;margin:auto!important;border-radius:5px!important}
    .chestCard.cardCard.ttdEnchantInventoryCardV3>.ttdEnchantCardArtV3{width:58px!important;height:102px!important;max-width:58px!important;max-height:102px!important;margin:0 auto 7px!important;border-radius:5px!important}
  `;
  document.head.appendChild(style);

  function idFromText(value){
    const text=String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(text==='lesser enchant card')return 'lesser';
    if(text==='master enchant card')return 'master';
    return null;
  }

  function makeImage(id){
    const img=document.createElement('img');
    img.className='ttdItemArtV1 ttdEnchantCardArtV3';
    img.dataset.ttdEnchantArt=id;
    img.src=paths[id];
    img.alt=labels[id];
    img.draggable=false;
    img.decoding='async';
    return img;
  }

  function repairShopCard(card){
    const id=idFromText(card.querySelector('.siName')?.textContent);
    if(!id)return false;
    const icon=card.querySelector('.siIcon');
    if(!icon)return false;
    const current=icon.querySelector('img[data-ttd-enchant-art]');
    if(!current || current.dataset.ttdEnchantArt!==id || current.getAttribute('src')!==paths[id]){
      icon.replaceChildren(makeImage(id));
    }else if(icon.children.length!==1){
      icon.replaceChildren(current);
    }
    card.classList.add('ttdEnchantShopCardV3');
    card.dataset.ttdEnchantCard=id;
    return true;
  }

  function repairInventoryCard(card){
    const id=idFromText(card.querySelector('.cname')?.textContent);
    if(!id)return false;
    let current=card.querySelector(':scope > img[data-ttd-enchant-art]');
    if(!current || current.dataset.ttdEnchantArt!==id){
      card.querySelectorAll(':scope > svg,:scope > img[data-ttd-enchant-art]').forEach((node)=>node.remove());
      current=makeImage(id);
      card.insertBefore(current,card.firstChild);
    }else if(current.getAttribute('src')!==paths[id]){
      current.src=paths[id];
      current.alt=labels[id];
    }
    card.classList.add('ttdEnchantInventoryCardV3');
    card.dataset.ttdEnchantCard=id;
    return true;
  }

  function apply(){
    let changed=false;
    try{
      document.querySelectorAll('.shopItemCard').forEach((card)=>{changed=repairShopCard(card)||changed;});
      document.querySelectorAll('.chestCard.cardCard').forEach((card)=>{changed=repairInventoryCard(card)||changed;});
    }catch(error){console.warn('Enchant card art repair failed.',error);}
    return changed;
  }

  const observer=new MutationObserver(()=>apply());
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});

  for(const src of Object.values(paths)){
    try{const img=new Image();img.decoding='async';img.src=src;}catch(_){}
  }

  apply();
  setTimeout(apply,0);
  setTimeout(apply,100);
  setTimeout(apply,500);
  setInterval(apply,500);

  window.__TTD_ENCHANT_CARD_ART_V3=Object.freeze({paths,cardArt,apply});
  window.__TTD_ENCHANT_CARD_ART_V2=window.__TTD_ENCHANT_CARD_ART_V3;
  window.__TTD_ENCHANT_CARD_ART_V1=window.__TTD_ENCHANT_CARD_ART_V3;
})();
