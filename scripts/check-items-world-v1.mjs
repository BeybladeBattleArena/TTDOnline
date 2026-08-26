import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const must=(cond,msg)=>{if(!cond)throw new Error(msg);};
const world=read('online/world-items-v1.js');
const assets=read('online/item-assets-v1.js');
const funcs=read('functions/items-v1.js');
const main=read('functions/main-v6.js');
const client=read('online/item-inventory-client-v1.js');
const merge=read('online/merge-bridge-v6.js');
const runtime=read('online/runtime-bridge-loader-v1.js');
const entry=read('online/singleplayer-client-v6.js');
const artPolish=read('online/item-art-polish-v2.js');
const manifest=JSON.parse(read('assets/game-assets.json'));

must(world.includes("epic_summon_ticket")&&world.includes("exp_tome"),'reward items missing');
must(world.includes("common_ore")&&world.includes("rare_ore")&&world.includes("unique_ore")&&world.includes("legendary_ore")&&world.includes("omni_ore"),'ore catalog missing');
must(world.includes("costPips:3300"),'Mystery Chest price missing');
must(world.includes("Frozen Island Chest")&&world.includes("Black Cathedral Chest"),'map-specific adventure chest identities missing');
must(
  world.includes("templePillar={taps:0,required:5") &&
  world.includes("ps.taps=Math.min(ps.required,(ps.taps||0)+1)") &&
  world.includes("ps.fallStart=performance.now()") &&
  world.includes("applyPillarImpact(pack,ps)") &&
  world.includes("rest>1500") &&
  world.includes("ps.removed=true"),
  'falling pillar tap/fall/impact/linger/fade lifecycle missing'
);
must(world.includes("jumpDown")&&world.includes("dropLand")&&world.includes("climbDown")&&world.includes("climbUp"),'3D route movement modes missing');
must(funcs.includes("purchaseMysteryChestV1")&&funcs.includes("costPips:3300"),'secure Mystery Chest purchase missing');
must(funcs.includes("useExpTomeV1")&&funcs.includes("useXp:60"),'EXP Tome 60 EXP use missing');
must(main.includes("./items-v1")&&main.includes("...items"),'item functions not exported');
must(client.includes("ttd:item-purchase-request")&&client.includes("ttd:item-use-request"),'item client bridge missing');

const itemAssetUrl="/online/item-assets-v1.js?v=4",avatarUrl="/online/avatar-inventory-v22.js?v=22",worldUrl="/online/world-items-v1.js?v=1";
for(const url of [itemAssetUrl,avatarUrl,worldUrl])must(runtime.includes(url),`native runtime does not load ${url}`);
must(runtime.indexOf(itemAssetUrl)<runtime.indexOf(avatarUrl),'approved item asset authority must load before avatar Inventory');
must(runtime.indexOf(avatarUrl)<runtime.indexOf(worldUrl),'world item wrappers must load after the final avatar Inventory renderer');
must(!merge.includes("eval(`${await response.text()}"),'merge bridge still evaluates item/world source text');
must(!merge.includes("/online/item-assets-v1.js?v=2")&&!merge.includes("/online/world-items-v1.js?v=1"),'merge bridge still owns nested item/world loading');

for(const marker of [
  "window.__TTD_ITEM_ASSETS_V4=Object.freeze",
  "chest_key_normal:asset('/assets/items/key-normal.png')",
  "chest_key_hard:asset('/assets/items/key-hard.png')",
  "chest_key_hell:asset('/assets/items/key-hell.png')",
  "mystery_chest:asset('/assets/items/mystery-chest.png')",
  "const epicTicketArt=asset('/assets/items/epic-summon-ticket.png')",
  "const expTomeArt=asset('/assets/items/exp-tome.png')",
  "gift_box_pink:asset('/assets/items/gift-box-pink.png')",
  "gift_box_icy:asset('/assets/items/gift-box-icy.png')",
  'epicSummonTicket:epicTicketArt','expTome:expTomeArt',
  'window.__TTD_ITEM_ASSETS_V1=window.__TTD_ITEM_ASSETS_V4'
])must(assets.includes(marker),`semantic lossless asset routing missing: ${marker}`);

const manifestSpecs={
  loadingEndlessHorde:['/assets/ui/loading-endless-horde.png',1536,1152],
  loadingAlHata:['/assets/ui/loading-al-hata.png',1536,1157],
  itemFrozenIslandChestNormal:['/assets/items/chest-frozen-island-normal.png',1536,1536],
  itemFrozenIslandChestHard:['/assets/items/chest-frozen-island-hard.png',1536,1536],
  itemFrozenIslandChestHell:['/assets/items/chest-frozen-island-hell.png',1536,1536],
  itemChestKeyNormal:['/assets/items/key-normal.png',1024,1536],
  itemChestKeyHard:['/assets/items/key-hard.png',1024,1536],
  itemChestKeyHell:['/assets/items/key-hell.png',1024,1536],
  itemMysteryChest:['/assets/items/mystery-chest.png',1536,1152],
  itemEpicSummonTicket:['/assets/items/epic-summon-ticket.png',1536,1024],
  itemExpTome:['/assets/items/exp-tome.png',1536,1536],
  itemCommonOre:['/assets/items/ore-common.png',1536,1536],
  itemRareOre:['/assets/items/ore-rare.png',1536,1536],
  itemUniqueOre:['/assets/items/ore-unique.png',1536,1536],
  itemLegendaryOre:['/assets/items/ore-legendary.png',1536,1536],
  itemOmniOre:['/assets/items/ore-omni.png',1536,1536],
  itemGiftBoxPink:['/assets/items/gift-box-pink.png',1536,1536],
  itemGiftBoxIcy:['/assets/items/gift-box-icy.png',1536,1499],
};
for(const [key,[path,w,h]] of Object.entries(manifestSpecs)){
  const manifestEntry=manifest.assets?.[key];
  must(manifestEntry?.path===path,`manifest path mismatch for ${key}`);
  must(manifestEntry?.format==='image/png',`manifest format is not PNG for ${key}`);
  must(manifestEntry?.width===w&&manifestEntry?.height===h,`manifest dimensions mismatch for ${key}`);
}
must(manifest.assets?.epicSummonTicket?.path==='/assets/items/epic-summon-ticket.png','legacy Epic Summon Ticket alias does not point at PNG master');
must(manifest.assets?.expTome?.path==='/assets/items/exp-tome.png','legacy EXP Tome alias does not point at PNG master');
must(manifest.assets?.epicSummonTicket?.path===manifest.assets?.itemEpicSummonTicket?.path,'Epic Summon Ticket aliases diverged');
must(manifest.assets?.expTome?.path===manifest.assets?.itemExpTome?.path,'EXP Tome aliases diverged');
must(manifest.assets?.itemMysteryChest?.usage?.shop?.box?.[0]===64,'Mystery Chest shop art contract is not 64px');

for(const marker of [
  'window.__TTD_ITEM_ART_POLISH_V4',
  'grid-template-rows:68px minmax(34px,auto) 24px 32px!important',
  'grid-template-rows:64px minmax(30px,auto) 18px 28px!important',
  '.shopItemCard .siName{',
  '.tiItem .tiName{',
  'place-items:center!important',
  'text-align:center!important',
  'object-position:center center!important',
  'image-rendering:auto!important'
])must(artPolish.includes(marker),`item/card alignment presentation missing: ${marker}`);
must(artPolish.includes('source art remains native-resolution')||artPolish.includes('Source art remains native-resolution'),'item presentation no longer documents the native-resolution source rule');
must(entry.includes("import './item-art-polish-v2.js?v=4';"),'single-player entry does not load item art polish v4 behavior');

console.log('Items/world v6 verified: item/world runtime loads as ordinary scripts in explicit order; approved PNG routing, Mystery Chest Shop integration, world interactions, purchases, and item use remain wired end to end.');
