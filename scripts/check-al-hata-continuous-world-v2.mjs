import fs from 'node:fs';
import vm from 'node:vm';

const read=(p)=>fs.readFileSync(p,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m);};
const need=(s,markers,label)=>{for(const marker of markers)must(s.includes(marker),`${label} missing: ${marker}`);};

const authored=[
  'online/al-hata-stage1-core-v1.js',
  'online/al-hata-stage1-beach-v1.js',
  'online/al-hata-stage1-jungle-v1.js',
  'online/al-hata-stage1-fork-v1.js',
  'online/al-hata-stage1-temple-v1.js',
  'online/al-hata-stage1-polish-v1.js',
  'online/al-hata-stage1-playtest-v1.js',
  'online/al-hata-stage1-world-v2.js',
];
const combined=authored.map(read).join('\n\n');
new vm.Script(combined,{filename:'al-hata-stage1-world-v2-concatenated.js'});

const world=read('online/al-hata-stage1-world-v2.js');
need(world,[
  'window.__TTD_AL_HATA_CONTINUOUS_WORLD_V2=true',
  "const AH_WORLD_V2_CONTRACT='one-world-one-camera-persistent-objects'",
  "id:'tidepool-alcove'",
  "id:'treetop-cache'",
  "id:'goblin-stash-pocket'",
  "id:'ruin-overlook'",
  "id:'cliff-cache'",
  "id:'temple-side-shrine'",
  "z1:-720,z2:720",
  "id:'beach_treetop'",
  "y:118,kind:'canopy'",
  "id:'cliff_reward'",
  "y:146,kind:'wood'",
  'groundAt=function AH_WORLD_V2_groundAt',
  'const ceiling=nav?Number(nav.y||0)+(nav.onGround?40:ascending?8:22):Infinity',
  'for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_PLATFORMS[segment]=AH_WORLD_V2_platforms',
  'for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_UPDATERS[segment]=AH_WORLD_V2_updateNavigator',
  'for(const segment of AH_WORLD_V2_SEGMENTS)AH_SEGMENT_DRAWERS[segment]=AH_WORLD_V2_drawTraversal',
  'AH_WORLD_V2_drawOpenedChest',
  'battle canvas reads the same world.objects instance used by traversal',
  'for(const area of [1,2,3,4,5])AH_COMBAT_DRAWERS[area]=function AH_WORLD_V2_combatDrawer',
  'AH_finishTraversalToCombat=async function AH_WORLD_V2_finishTraversalToCombat',
  'await AH_WORLD_V2_tween(760',
  'world.navigatorBoardIndex=nav.boardIndex',
  'AH_beginTraversal=function AH_WORLD_V2_beginTraversal',
  'AH_AFTER_COMBAT[3]=()=>AH_WORLD_V2_resumeAfterCombat',
  'AH_AFTER_COMBAT[6]=()=>AH_WORLD_V2_resumeAfterCombat',
  'AH_AFTER_COMBAT[10]=()=>AH_WORLD_V2_resumeAfterCombat',
  'AH_AFTER_COMBAT[12]=()=>AH_WORLD_V2_resumeAfterCombat',
  'AH_WORLD_V2_drawDebris',
  'AH_OBJECT_ATTACKERS.ah_push_crate=o=>AH_WORLD_V2_damageWood(o)',
  'AH_OBJECT_ATTACKERS.ah_barrier=o=>AH_WORLD_V2_damageWood(o)',
  'AH_WORLD_V2_requireProximity',
  "#gameScreen.ttd-platform-mode #ttdPlatformHud .ttdNavBadge{display:none!important;}",
  'window.__TTD_AL_HATA_CONTINUOUS_WORLD_V2_API=Object.freeze',
],'Al Hata perpetual world v2');

must(!world.includes("toast('Crate smashed")&&!world.includes("toast('Barrier destroyed"),'common destruction must be shown visually rather than announced by text');
must(world.indexOf("AH_WORLD_V2_drawWorldLayer(args.back.g")<world.indexOf("AH_WORLD_V2_drawWorldLayer(args.front.g"),'combat must render back and front layers from one shared world');
must(world.indexOf('restoreTrayChildren();')<world.indexOf('await AH_WORLD_V2_tween(760'),'tray should return before the same camera glides into combat, matching the Test Map handoff');

const loader=read('online/run-ui-bridge-v21.js');
need(loader,["'/online/al-hata-stage1-world-v2.js?v=1'"],'Al Hata loader');
must(loader.indexOf('/online/al-hata-stage1-world-v2.js?v=1')>loader.indexOf('/online/al-hata-stage1-playtest-v1.js?v=1'),'continuous world v2 must load after the Navigator opening so it owns final traversal/combat hooks');

console.log('Al Hata continuous world v2 verified: expanded hidden-edge terrain, side exploration areas, height-aware platforms, persistent world objects, same-map combat rendering, camera-glide handoffs, visual destruction, proximity slate chests, and reduced traversal HUD are structurally wired.');
