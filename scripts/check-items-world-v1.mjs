import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const must=(cond,msg)=>{if(!cond)throw new Error(msg);};
const world=read('online/world-items-v1.js');
const assets=read('online/item-assets-v1.js');
const funcs=read('functions/items-v1.js');
const main=read('functions/main-v6.js');
const client=read('online/item-inventory-client-v1.js');
const merge=read('online/merge-bridge-v6.js');

for(const marker of ['MissionFail','fail']){}
must(world.includes("epic_summon_ticket")&&world.includes("exp_tome"),'reward items missing');
must(world.includes("common_ore")&&world.includes("rare_ore")&&world.includes("unique_ore")&&world.includes("legendary_ore")&&world.includes("omni_ore"),'ore catalog missing');
must(world.includes("costPips:3300"),'Mystery Chest price missing');
must(world.includes("Frozen Island Chest")&&world.includes("Black Cathedral Chest"),'map-specific adventure chest identities missing');
must(world.includes("tapCount")&&world.includes("pillar")&&world.includes("impact"),'falling pillar interaction missing');
must(world.includes("jumpDown")&&world.includes("dropLand")&&world.includes("climbDown")&&world.includes("climbUp"),'3D route movement modes missing');
must(funcs.includes("purchaseMysteryChestV1")&&funcs.includes("costPips:3300"),'secure Mystery Chest purchase missing');
must(funcs.includes("useExpTomeV1")&&funcs.includes("useXp:60"),'EXP Tome 60 EXP use missing');
must(main.includes("./items-v1")&&main.includes("...items"),'item functions not exported');
must(client.includes("ttd:item-purchase-request")&&client.includes("ttd:item-use-request"),'item client bridge missing');
must(merge.includes("world-items-v1.js"),'world item runtime not loaded');
for(const name of ['chest-frozen-island-normal.webp','chest-frozen-island-hard.webp','chest-frozen-island-hell.webp','key-normal.webp','key-hard.webp','key-hell.webp','mystery-chest.webp','epic-summon-ticket.webp','exp-tome.webp','ore-common.webp','ore-rare.webp','ore-unique.webp','ore-legendary.webp','ore-omni.webp'])must(assets.includes(name),`asset mapping missing: ${name}`);
console.log('Items/world v1 checks passed.');
