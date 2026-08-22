(() => {
  'use strict';
  if(window.__TTD_ITEM_ASSETS_V1)return;
  const asset=(path)=>{
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  };
  window.__TTD_ITEM_ASSETS_V1=Object.freeze({
    frozen_island_chest_normal:asset('/assets/items/chest-frozen-island-normal.png'),
    frozen_island_chest_hard:asset('/assets/items/chest-frozen-island-hard.png'),
    frozen_island_chest_hell:asset('/assets/items/chest-frozen-island-hell.png'),
    chest_key_normal:asset('/assets/items/key-normal.png'),
    chest_key_hard:asset('/assets/items/key-hard.png'),
    chest_key_hell:asset('/assets/items/key-hell.png'),
    mystery_chest:asset('/assets/items/mystery-chest.png'),
    epic_summon_ticket:asset('/assets/items/epic-summon-ticket.png'),
    exp_tome:asset('/assets/items/exp-tome.png'),
    common_ore:asset('/assets/items/ore-common.png'),
    rare_ore:asset('/assets/items/ore-rare.png'),
    unique_ore:asset('/assets/items/ore-unique.png'),
    legendary_ore:asset('/assets/items/ore-legendary.png'),
    omni_ore:asset('/assets/items/ore-omni.png')
  });
})();
