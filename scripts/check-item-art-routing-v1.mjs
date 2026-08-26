import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
const avatar=read('online/avatar-inventory-v22.js');
const assets=read('online/item-assets-v1.js');
const world=read('online/world-items-v1.js');
const runtime=read('online/runtime-bridge-loader-v1.js');

for(const stale of [
  '/assets/ui/epic-summon-ticket.webp',
  '/assets/ui/exp-tome.webp',
  '/assets/ui/loading-endless-horde.webp',
  '/assets/ui/loading-al-hata.webp',
])must(!avatar.includes(stale),`Final Inventory/loading flow still references retired art: ${stale}`);

for(const marker of [
  'TTD_APPROVED_ITEM_ART_V1',
  'const ITEM_ASSETS=window.__TTD_ITEM_ASSETS_V4||window.__TTD_ITEM_ASSETS_V1||{};',
  "ITEM_ASSETS.epic_summon_ticket||A('/assets/items/epic-summon-ticket.png')",
  "ITEM_ASSETS.exp_tome||A('/assets/items/exp-tome.png')",
  "loadingEndlessHorde?.path||'/assets/ui/loading-endless-horde.png'",
  "loadingAlHata?.path||'/assets/ui/loading-al-hata.png'",
  'TTD_APPROVED_ITEM_ID_ART_V1',
  'i?.itemId&&ITEM_ASSETS[i.itemId]',
])must(avatar.includes(marker),`Final Inventory approved-art routing missing: ${marker}`);

for(const marker of [
  "mystery_chest:asset('/assets/items/mystery-chest.png')",
  "const epicTicketArt=asset('/assets/items/epic-summon-ticket.png')",
  "const expTomeArt=asset('/assets/items/exp-tome.png')",
  "common_ore:asset('/assets/items/ore-common.png')",
  "rare_ore:asset('/assets/items/ore-rare.png')",
  "unique_ore:asset('/assets/items/ore-unique.png')",
  "legendary_ore:asset('/assets/items/ore-legendary.png')",
  "omni_ore:asset('/assets/items/ore-omni.png')",
])must(assets.includes(marker),`Approved item authority missing: ${marker}`);

must(world.includes("card.dataset.ttdMysteryShop='1'"),'Mystery Chest Shop card missing');
must(world.includes("iconMarkup('mystery_chest',48)"),'Mystery Chest Shop card is not using approved art authority');
must(world.includes("item?.type==='ttd_item'&&ITEMS[item.itemId]"),'server items are not retained for Inventory rendering');

const itemIndex=runtime.indexOf('/online/item-assets-v1.js?v=4');
const avatarIndex=runtime.indexOf('/online/avatar-inventory-v22.js?v=22');
const worldIndex=runtime.indexOf('/online/world-items-v1.js?v=1');
must(itemIndex>=0&&avatarIndex>itemIndex&&worldIndex>avatarIndex,'Item asset → final Inventory → world wrapper runtime order is not authoritative');

console.log('Item art routing v1 verified: Shop and final Inventory resolve server/local item IDs through approved PNG masters; retired item/loading WebP paths are absent.');
