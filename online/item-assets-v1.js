(() => {
  'use strict';
  if(window.__TTD_ITEM_ASSETS_V4)return;
  const asset=(path)=>{
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  };

  // Lossless native-resolution official masters. Presentation size belongs to UI/CSS only.
  const epicTicketArt=asset('/assets/items/epic-summon-ticket.png');
  const expTomeArt=asset('/assets/items/exp-tome.png');

  window.__TTD_ITEM_ASSETS_V4=Object.freeze({
    frozen_island_chest_normal:asset('/assets/items/chest-frozen-island-normal.png'),
    frozen_island_chest_hard:asset('/assets/items/chest-frozen-island-hard.png'),
    frozen_island_chest_hell:asset('/assets/items/chest-frozen-island-hell.png'),
    chest_key_normal:asset('/assets/items/key-normal.png'),
    chest_key_hard:asset('/assets/items/key-hard.png'),
    chest_key_hell:asset('/assets/items/key-hell.png'),
    mystery_chest:asset('/assets/items/mystery-chest.png'),
    epic_summon_ticket:epicTicketArt,
    exp_tome:expTomeArt,
    common_ore:asset('/assets/items/ore-common.png'),
    rare_ore:asset('/assets/items/ore-rare.png'),
    unique_ore:asset('/assets/items/ore-unique.png'),
    legendary_ore:asset('/assets/items/ore-legendary.png'),
    omni_ore:asset('/assets/items/ore-omni.png'),
    gift_box_pink:asset('/assets/items/gift-box-pink.png'),
    gift_box_icy:asset('/assets/items/gift-box-icy.png'),

    // Compatibility names used by the older placeholder-era reward UI.
    epicSummonTicket:epicTicketArt,
    expTome:expTomeArt
  });
  window.__TTD_ITEM_ASSETS_V3=window.__TTD_ITEM_ASSETS_V4;
  window.__TTD_ITEM_ASSETS_V2=window.__TTD_ITEM_ASSETS_V4;
  window.__TTD_ITEM_ASSETS_V1=window.__TTD_ITEM_ASSETS_V4;
})();
