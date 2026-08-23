(() => {
  'use strict';
  if(window.__TTD_ITEM_ASSETS_V2)return;
  const asset=(path)=>{
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  };

  // The first normalized import accidentally crossed several item identities: the Normal-key
  // file contains ticket art, the Hell-key file contains the chest art, and mystery-chest.webp
  // contains tome art. Route by the art that is actually in each binary rather than by the bad
  // import filename. key-hard.webp is currently the one key-shaped master in this asset batch.
  const keyArt=asset('/assets/items/key-hard.webp');
  const mysteryChestArt=asset('/assets/items/key-hell.webp');
  const epicTicketArt=asset('/assets/items/epic-summon-ticket.webp');
  const expTomeArt=asset('/assets/items/exp-tome.webp');

  window.__TTD_ITEM_ASSETS_V2=Object.freeze({
    frozen_island_chest_normal:asset('/assets/items/chest-frozen-island-normal.webp'),
    frozen_island_chest_hard:asset('/assets/items/chest-frozen-island-hard.webp'),
    frozen_island_chest_hell:asset('/assets/items/chest-frozen-island-hell.webp'),
    chest_key_normal:keyArt,
    chest_key_hard:keyArt,
    chest_key_hell:keyArt,
    mystery_chest:mysteryChestArt,
    epic_summon_ticket:epicTicketArt,
    exp_tome:expTomeArt,
    common_ore:asset('/assets/items/ore-common.webp'),
    rare_ore:asset('/assets/items/ore-rare.webp'),
    unique_ore:asset('/assets/items/ore-unique.webp'),
    legendary_ore:asset('/assets/items/ore-legendary.webp'),
    omni_ore:asset('/assets/items/ore-omni.webp'),

    // Compatibility names used by the older placeholder-era reward UI.
    epicSummonTicket:epicTicketArt,
    expTome:expTomeArt
  });
  window.__TTD_ITEM_ASSETS_V1=window.__TTD_ITEM_ASSETS_V2;
})();
