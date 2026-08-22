(() => {
  'use strict';
  if(window.__TTD_ITEM_ASSETS_V1)return;
  const asset=(path)=>{
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  };
  window.__TTD_ITEM_ASSETS_V1=Object.freeze({
    frozen_island_chest_normal:asset('/assets/items/chest-frozen-island-normal.webp'),
    frozen_island_chest_hard:asset('/assets/items/chest-frozen-island-hard.webp'),
    frozen_island_chest_hell:asset('/assets/items/chest-frozen-island-hell.webp'),
    chest_key_normal:asset('/assets/items/key-normal.webp'),
    chest_key_hard:asset('/assets/items/key-hard.webp'),
    chest_key_hell:asset('/assets/items/key-hell.webp'),
    mystery_chest:asset('/assets/items/mystery-chest.webp'),
    epic_summon_ticket:asset('/assets/items/epic-summon-ticket.webp'),
    exp_tome:asset('/assets/items/exp-tome.webp'),
    common_ore:asset('/assets/items/ore-common.webp'),
    rare_ore:asset('/assets/items/ore-rare.webp'),
    unique_ore:asset('/assets/items/ore-unique.webp'),
    legendary_ore:asset('/assets/items/ore-legendary.webp'),
    omni_ore:asset('/assets/items/ore-omni.webp')
  });
})();
