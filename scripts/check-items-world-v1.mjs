import fs from 'node:fs';

const read=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const file=(p)=>fs.readFileSync(new URL(`../${p}`,import.meta.url));
const exists=(p)=>fs.existsSync(new URL(`../${p}`,import.meta.url));
const must=(cond,msg)=>{if(!cond)throw new Error(msg);};
const world=read('online/world-items-v1.js');
const assets=read('online/item-assets-v1.js');
const funcs=read('functions/items-v1.js');
const main=read('functions/main-v6.js');
const client=read('online/item-inventory-client-v1.js');
const merge=read('online/merge-bridge-v6.js');
const entry=read('online/singleplayer-client-v6.js');
const artPolish=read('online/item-art-polish-v2.js');
const presentation=read('online/game-presentation-v1.js');
const audio=read('online/audio-client-v27.js');
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
must(merge.includes("item-assets-v1.js?v=2")&&merge.includes("world-items-v1.js"),'corrected world item runtime not loaded');

for(const name of [
  'chest-frozen-island-normal.webp','chest-frozen-island-hard.webp','chest-frozen-island-hell.webp',
  'key-normal.webp','key-hard.webp','key-hell.webp','mystery-chest.webp','epic-summon-ticket.webp','exp-tome.webp',
  'ore-common.webp','ore-rare.webp','ore-unique.webp','ore-legendary.webp','ore-omni.webp'
])must(exists(`assets/items/${name}`),`item binary missing: ${name}`);

// The first 64px normalization batch crossed several filenames. Until distinct tier-key masters
// are restored, every logical key must use the one key-shaped binary rather than ticket/chest art;
// the gold chest binary is routed to Mystery Chest. Canonical ticket/tome art must remain distinct.
for(const marker of [
  "const keyArt=asset('/assets/items/key-hard.webp')",
  "const mysteryChestArt=asset('/assets/items/key-hell.webp')",
  "const epicTicketArt=asset('/assets/items/epic-summon-ticket.webp')",
  "const expTomeArt=asset('/assets/items/exp-tome.webp')",
  'chest_key_normal:keyArt','chest_key_hard:keyArt','chest_key_hell:keyArt',
  'mystery_chest:mysteryChestArt','epicSummonTicket:epicTicketArt','expTome:expTomeArt'
])must(assets.includes(marker),`corrected asset routing missing: ${marker}`);

must(manifest.assets?.epicSummonTicket?.path==='/assets/items/epic-summon-ticket.webp','legacy Epic Summon Ticket still points at placeholder art');
must(manifest.assets?.expTome?.path==='/assets/items/exp-tome.webp','legacy EXP Tome still points at placeholder art');
must(manifest.assets?.epicSummonTicket?.path===manifest.assets?.itemEpicSummonTicket?.path,'Epic Summon Ticket aliases diverged');
must(manifest.assets?.expTome?.path===manifest.assets?.itemExpTome?.path,'EXP Tome aliases diverged');
must(manifest.assets?.itemMysteryChest?.usage?.shop?.box?.[0]===60,'Mystery Chest shop art contract is not 60px');

for(const marker of ['width:64px!important','height:64px!important','width:60px!important','height:60px!important','image-rendering:auto!important'])must(artPolish.includes(marker),`shop item art polish missing: ${marker}`);
must(entry.includes("import './item-art-polish-v2.js?v=2';"),'single-player entry does not load item art polish v2');

must(presentation.includes("fail:{text:'FAIL',className:'outcome-fail',voice:'fail'}"),'FAIL presentation is not routed to the fail announcer key');
must(audio.includes("clear:asset('/assets/audio/announcer/MissionClear.mp3')")&&audio.includes("fail:asset('/assets/audio/announcer/MissionFail.mp3')"),'CLEAR/FAIL announcer files are not independently mapped');
const missionClear=file('assets/audio/announcer/MissionClear.mp3');
const missionFail=file('assets/audio/announcer/MissionFail.mp3');
must(missionFail.length>10000,'MissionFail announcer file is unexpectedly small');
must(!missionFail.equals(missionClear),'MissionFail announcer binary must not be identical to MissionClear');

console.log('Items/world v2 verified: canonical reward aliases, corrected cross-item art routing, 60px shop presentation, secure item flows, terrain routing, and distinct FAIL audio.');
