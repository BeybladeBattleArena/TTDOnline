(() => {
  'use strict';
  if(window.__TTD_ENCHANT_CARD_ART_V4)return;

  const asset=(path)=>{
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  };
  const assets=window.__TTD_ITEM_ASSETS_V4||window.__TTD_ITEM_ASSETS_V1||{};
  const paths=Object.freeze({
    lesser:assets.card_lesser||assets.lesserEnchantCard||asset('/assets/items/enchant-card-lesser.png'),
    master:assets.card_master||assets.masterEnchantCard||asset('/assets/items/enchant-card-master.png')
  });
  const labels=Object.freeze({
    lesser:'Lesser Enchant Card',
    master:'Master Enchant Card'
  });

  const idFromText=(value)=>{
    const text=String(value||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(text==='lesser enchant card')return 'lesser';
    if(text==='master enchant card')return 'master';
    return null;
  };
  const idFromItem=(item)=>{
    if(item?.id==='card_lesser'||item?.cardId==='lesser')return 'lesser';
    if(item?.id==='card_master'||item?.cardId==='master')return 'master';
    return idFromText(item?.name);
  };

  function cardArt(cardId){
    const id=String(cardId||'').toLowerCase();
    const src=paths[id];
    if(!src)return '';
    return `<img class="ttdItemArtV1 ttdEnchantCardArtV4" data-ttd-enchant-art="${id}" src="${src}" alt="${labels[id]}" draggable="false" decoding="async">`;
  }

  // The native game declares cardSVG/renderShopItemCard as ordinary global functions.
  // Replace the actual bindings, not only similarly named window properties.
  try{
    if(typeof cardSVG==='function')cardSVG=cardArt;
  }catch(_){}
  try{window.cardSVG=cardArt;}catch(_){}

  const style=document.createElement('style');
  style.id='ttd-enchant-card-art-v4';
  style.textContent=`
    .ttdEnchantCardArtV4{
      display:block!important;
      width:auto!important;
      height:auto!important;
      object-fit:contain!important;
      object-position:center center!important;
      image-rendering:auto!important;
      border-radius:5px!important;
    }
    /* Enchant cards keep their portrait aspect ratio inside the same canonical art wells as every other item. */
    .shopItemCard.ttdEnchantShopCardV4 .siIcon>.ttdEnchantCardArtV4{
      max-width:48px!important;
      max-height:84px!important;
      margin:auto!important;
    }
    .tiItem.ttdEnchantInventoryCardV4 .tiIcon>.ttdEnchantCardArtV4{
      max-width:44px!important;
      max-height:78px!important;
      margin:auto!important;
    }
    #invGrid>.chestCard.cardCard.ttdEnchantInventoryCardV4>.ttdEnchantCardArtV4{
      max-width:44px!important;
      max-height:78px!important;
      margin:auto!important;
    }
  `;
  document.head.appendChild(style);

  function makeImage(id){
    const img=document.createElement('img');
    img.className='ttdItemArtV1 ttdEnchantCardArtV4';
    img.dataset.ttdEnchantArt=id;
    img.src=paths[id];
    img.alt=labels[id];
    img.draggable=false;
    img.decoding='async';
    return img;
  }

  function repairShopCard(card,id=null){
    id=id||idFromText(card.querySelector('.siName')?.textContent);
    if(!id)return false;
    const icon=card.querySelector('.siIcon');
    if(!icon)return false;
    const current=icon.querySelector('img[data-ttd-enchant-art]');
    if(!current||current.dataset.ttdEnchantArt!==id||current.getAttribute('src')!==paths[id])icon.replaceChildren(makeImage(id));
    else if(icon.children.length!==1)icon.replaceChildren(current);
    card.classList.add('ttdEnchantShopCardV4');
    card.dataset.ttdEnchantCard=id;
    return true;
  }

  // Repair at the exact native Shop card creation point. This avoids relying on a later observer
  // to win a race against Shop redraws.
  try{
    if(typeof renderShopItemCard==='function'&&!renderShopItemCard.__ttdEnchantV4){
      const baseRenderShopItemCard=renderShopItemCard;
      const wrapped=function renderShopItemCardEnchantV4(item,purchased){
        const card=baseRenderShopItemCard(item,purchased);
        const id=idFromItem(item);
        if(id)repairShopCard(card,id);
        return card;
      };
      wrapped.__ttdEnchantV4=true;
      renderShopItemCard=wrapped;
      try{window.renderShopItemCard=wrapped;}catch(_){}
    }
  }catch(_){}

  function repairTiItem(card){
    const id=idFromText(card.querySelector('.tiName')?.textContent);
    if(!id)return false;
    const icon=card.querySelector('.tiIcon');
    if(!icon)return false;
    const current=icon.querySelector('img[data-ttd-enchant-art]');
    if(!current||current.dataset.ttdEnchantArt!==id||current.getAttribute('src')!==paths[id])icon.replaceChildren(makeImage(id));
    else if(icon.children.length!==1)icon.replaceChildren(current);
    card.classList.add('ttdEnchantInventoryCardV4');
    card.dataset.ttdEnchantCard=id;
    return true;
  }

  function repairLegacyInventoryCard(card){
    const id=idFromText(card.querySelector('.cname')?.textContent);
    if(!id)return false;
    let current=card.querySelector(':scope > img[data-ttd-enchant-art]');
    if(!current||current.dataset.ttdEnchantArt!==id){
      card.querySelectorAll(':scope > svg,:scope > img[data-ttd-enchant-art]').forEach((node)=>node.remove());
      current=makeImage(id);
      card.insertBefore(current,card.firstChild);
    }else if(current.getAttribute('src')!==paths[id]){
      current.src=paths[id];current.alt=labels[id];
    }
    card.classList.add('ttdEnchantInventoryCardV4');
    card.dataset.ttdEnchantCard=id;
    return true;
  }

  function apply(){
    let changed=false;
    try{
      document.querySelectorAll('.shopItemCard').forEach((card)=>{changed=repairShopCard(card)||changed;});
      document.querySelectorAll('.tiItem').forEach((card)=>{changed=repairTiItem(card)||changed;});
      document.querySelectorAll('.chestCard.cardCard').forEach((card)=>{changed=repairLegacyInventoryCard(card)||changed;});
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
  setInterval(apply,750);
  document.documentElement.dataset.ttdEnchantArt='v4';

  window.__TTD_ENCHANT_CARD_ART_V4=Object.freeze({paths,cardArt,apply});
  window.__TTD_ENCHANT_CARD_ART_V3=window.__TTD_ENCHANT_CARD_ART_V4;
  window.__TTD_ENCHANT_CARD_ART_V2=window.__TTD_ENCHANT_CARD_ART_V4;
  window.__TTD_ENCHANT_CARD_ART_V1=window.__TTD_ENCHANT_CARD_ART_V4;

  // Pip Vouchers are a Rewards-inventory authority layered after the native document.
  // It waits for the server item/world bridges before wrapping the Inventory renderer.
  try{
    if(!document.getElementById('ttdPipVouchersV1Script')){
      const vouchers=document.createElement('script');
      vouchers.id='ttdPipVouchersV1Script';
      vouchers.src=asset('/online/pip-vouchers-v1.js?v=1');
      vouchers.async=false;
      document.head.appendChild(vouchers);
    }
  }catch(error){console.warn('Could not load Pip Voucher Inventory authority.',error);}
})();
