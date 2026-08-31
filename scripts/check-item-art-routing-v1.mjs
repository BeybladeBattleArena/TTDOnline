import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
const avatar=read('online/avatar-inventory-v22.js');
const assets=read('online/item-assets-v1.js');
const world=read('online/world-items-v1.js');
const runtime=read('online/runtime-bridge-loader-v1.js');
const loader=read('online/game-loader.js');
const enchant=read('online/enchant-card-art-v1.js');
const polish=read('online/item-art-polish-v2.js');

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
  "const lesserEnchantCardArt=asset('/assets/items/enchant-card-lesser.png')",
  "const masterEnchantCardArt=asset('/assets/items/enchant-card-master.png')",
  'card_lesser:lesserEnchantCardArt',
  'card_master:masterEnchantCardArt',
  "common_ore:asset('/assets/items/ore-common.png')",
  "rare_ore:asset('/assets/items/ore-rare.png')",
  "unique_ore:asset('/assets/items/ore-unique.png')",
  "legendary_ore:asset('/assets/items/ore-legendary.png')",
  "omni_ore:asset('/assets/items/ore-omni.png')",
])must(assets.includes(marker),`Approved item authority missing: ${marker}`);

must(world.includes("card.dataset.ttdMysteryShop='1'"),'Mystery Chest Shop card missing');
must(world.includes("iconMarkup('mystery_chest',48)"),'Mystery Chest Shop card is not using approved art authority');
must(world.includes("item?.type==='ttd_item'&&ITEMS[item.itemId]"),'server items are not retained for Inventory rendering');

for(const marker of [
  "if(typeof cardSVG==='function')cardSVG=cardArt",
  "if(typeof renderShopItemCard==='function'&&!renderShopItemCard.__ttdEnchantV4)",
  "document.querySelectorAll('.shopItemCard')",
  "document.querySelectorAll('.tiItem')",
  "asset('/assets/items/enchant-card-lesser.png')",
  "asset('/assets/items/enchant-card-master.png')",
])must(enchant.includes(marker),`Enchant-card native artwork authority missing: ${marker}`);

for(const marker of [
  'height:196px!important;',
  'grid-template-rows:88px 40px 24px 32px!important;',
  'height:176px!important;',
  'grid-template-rows:82px 38px 20px 28px!important;',
  '#invGrid>.chestCard',
  '.tiGrid>.tiItem',
  'object-fit:contain!important;',
])must(polish.includes(marker),`Uniform item-card presentation contract missing: ${marker}`);

must(!enchant.includes('min-height:228px!important'),'Enchant Shop art must not enlarge the canonical Shop shell.');
must(!enchant.includes('grid-template-rows:112px'),'Enchant Shop art must not override canonical Shop rows.');
must(enchant.includes('max-height:84px!important'),'Enchant Shop portrait art is not bounded inside the canonical art well.');
must(enchant.includes('max-height:78px!important'),'Enchant Inventory portrait art is not bounded inside the canonical art well.');

must(loader.includes("loadPostDocumentScript('/online/enchant-card-art-v1.js?v=4','ttdEnchantCardArtV4NativeScript')"),'Native game loader does not bind enchant art immediately after document materialization.');
must(runtime.includes('/online/enchant-card-art-v1.js?v=4'),'Runtime bridge list does not preserve enchant-card V4 authority.');

const itemIndex=runtime.indexOf('/online/item-assets-v1.js?v=4');
const enchantIndex=runtime.indexOf('/online/enchant-card-art-v1.js?v=4');
const avatarIndex=runtime.indexOf('/online/avatar-inventory-v22.js?v=22');
const worldIndex=runtime.indexOf('/online/world-items-v1.js?v=1');
must(itemIndex>=0&&enchantIndex>itemIndex&&avatarIndex>enchantIndex&&worldIndex>avatarIndex,'Item asset → enchant art → final Inventory → world wrapper runtime order is not authoritative');

console.log('Item art routing v3 verified: approved PNG masters keep contain/aspect-ratio presentation while Shop and Inventory use canonical uniform card footprints.');
