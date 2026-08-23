(() => {
  'use strict';
  if(window.__TTD_ITEM_ASSETS_V3)return;
  const asset=(path)=>{
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  };

  // Full-resolution official masters. Logical item identity now matches the filename again;
  // presentation size is controlled by the UI rather than by shrinking source artwork.
  const epicTicketArt=asset('/assets/items/epic-summon-ticket.jpg');
  const expTomeArt=asset('/assets/items/exp-tome.jpg');

  window.__TTD_ITEM_ASSETS_V3=Object.freeze({
    frozen_island_chest_normal:asset('/assets/items/chest-frozen-island-normal.jpg'),
    frozen_island_chest_hard:asset('/assets/items/chest-frozen-island-hard.jpg'),
    frozen_island_chest_hell:asset('/assets/items/chest-frozen-island-hell.jpg'),
    chest_key_normal:asset('/assets/items/key-normal.jpg'),
    chest_key_hard:asset('/assets/items/key-hard.jpg'),
    chest_key_hell:asset('/assets/items/key-hell.jpg'),
    mystery_chest:asset('/assets/items/mystery-chest.jpg'),
    epic_summon_ticket:epicTicketArt,
    exp_tome:expTomeArt,
    common_ore:asset('/assets/items/ore-common.jpg'),
    rare_ore:asset('/assets/items/ore-rare.jpg'),
    unique_ore:asset('/assets/items/ore-unique.jpg'),
    legendary_ore:asset('/assets/items/ore-legendary.jpg'),
    omni_ore:asset('/assets/items/ore-omni.jpg'),
    gift_box_pink:asset('/assets/items/gift-box-pink.jpg'),
    gift_box_icy:asset('/assets/items/gift-box-icy.jpg'),

    // Compatibility names used by the older placeholder-era reward UI.
    epicSummonTicket:epicTicketArt,
    expTome:expTomeArt
  });
  window.__TTD_ITEM_ASSETS_V2=window.__TTD_ITEM_ASSETS_V3;
  window.__TTD_ITEM_ASSETS_V1=window.__TTD_ITEM_ASSETS_V3;
})();
