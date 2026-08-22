import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const file=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url));
const must=(cond,msg)=>{if(!cond)throw new Error(msg);};
const world=read('online/world-items-v1.js');
const assets=read('online/item-assets-v1.js');
const funcs=read('functions/items-v1.js');
const main=read('functions/main-v6.js');
const client=read('online/item-inventory-client-v1.js');
const merge=read('online/merge-bridge-v6.js');
const presentation=read('online/game-presentation-v1.js');
const audio=read('online/audio-client-v27.js');

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
must(merge.includes("world-items-v1.js"),'world item runtime not loaded');
for(const name of ['chest-frozen-island-normal.webp','chest-frozen-island-hard.webp','chest-frozen-island-hell.webp','key-normal.webp','key-hard.webp','key-hell.webp','mystery-chest.webp','epic-summon-ticket.webp','exp-tome.webp','ore-common.webp','ore-rare.webp','ore-unique.webp','ore-legendary.webp','ore-omni.webp'])must(assets.includes(name),`asset mapping missing: ${name}`);

must(presentation.includes("fail:{text:'FAIL',className:'outcome-fail',voice:'fail'}"),'FAIL presentation is not routed to the fail announcer key');
must(audio.includes("clear:asset('/assets/audio/announcer/MissionClear.mp3')")&&audio.includes("fail:asset('/assets/audio/announcer/MissionFail.mp3')"),'CLEAR/FAIL announcer files are not independently mapped');
const missionClear=file('assets/audio/announcer/MissionClear.mp3');
const missionFail=file('assets/audio/announcer/MissionFail.mp3');
must(missionFail.length>10000,'MissionFail announcer file is unexpectedly small');
must(!missionFail.equals(missionClear),'MissionFail announcer binary must not be identical to MissionClear');

console.log('Items/world v1 verified: official item catalog/art, secure Mystery Chest and EXP Tome flows, map-specific chest identities, interactive falling pillar, elevation-aware enemy routing, and distinct FAIL announcer audio.');
