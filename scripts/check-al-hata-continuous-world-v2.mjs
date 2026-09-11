import fs from 'node:fs';
import vm from 'node:vm';
import './check-adventure-continuous-map-contract-v1.mjs';

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
  'online/adventure-continuous-map-contract-v1.js',
  'online/al-hata-stage1-world-v3.js',
];
const combined=authored.map(read).join('\n\n');
new vm.Script(combined,{filename:'al-hata-stage1-continuous-world-concatenated.js'});

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
  'AH_WORLD_V2_drawOpenedChest',
  'battle canvas reads the same world.objects instance used by traversal',
  'AH_WORLD_V2_drawDebris',
  'AH_OBJECT_ATTACKERS.ah_push_crate=o=>AH_WORLD_V2_damageWood(o)',
  'AH_OBJECT_ATTACKERS.ah_barrier=o=>AH_WORLD_V2_damageWood(o)',
  'AH_WORLD_V2_requireProximity',
  "#gameScreen.ttd-platform-mode #ttdPlatformHud .ttdNavBadge{display:none!important;}",
],'Al Hata perpetual world v2 foundation');

must(!world.includes("toast('Crate smashed")&&!world.includes("toast('Barrier destroyed"),'common destruction must be shown visually rather than announced by text');

const v3=read('online/al-hata-stage1-world-v3.js');
need(v3,[
  'window.__TTD_AL_HATA_CONTINUOUS_WORLD_V3=true',
  'window.__TTD_CONTINUOUS_ADVENTURE_MAP_CONTRACT_V1',
  'const AH_WORLD_V3_ARENAS=Object.freeze',
  "id:'landing-shore'",
  "id:'goblin-fringe'",
  "id:'deep-jungle-ruins'",
  "id:'pincer-bridge'",
  "id:'temple-forecourt'",
  'AH_WORLD_V3_CMAP.assertArena',
  'function AH_WORLD_V3_projectWorld',
  'relZ=Number(z)-Number(cameraZ||0)',
  'world.cameraX=world.camera.x;world.cameraZ=world.camera.z',
  'AH_WORLD_V2_syncWorld=function AH_WORLD_V3_syncWorld',
  'AH_WORLD_V2_updateNavigator=function AH_WORLD_V3_updateNavigator',
  'session.cameraZ=current+',
  'world.discoveredSideAreas[area.id]=true',
  'buildPath=function AH_WORLD_V3_buildPath',
  'AH_WORLD_V3_sampleRoute(route,w,h,arena.center.x,arena.center.z)',
  'AH_WORLD_V2_drawWorldLayer=function AH_WORLD_V3_drawWorldLayer',
  'AH_COMBAT_DRAWERS[area]=function AH_WORLD_V3_combatDrawer',
  'AH_finishTraversalToCombat=async function AH_WORLD_V3_finishTraversalToCombat',
  'active.cameraZ=AH_lerp(fromZ,targetZ,e)',
  'leavePlatformLayout(false);AH_WORLD_V3_primeCombatFrame',
  'AH_WORLD_V3_retireTraversalCanvas()',
  'AH_beginTraversal=function AH_WORLD_V3_beginTraversal',
  'AH_WORLD_V3_CMAP.bindSession(world,session)',
  'async function AH_WORLD_V3_resumeAfterCombat',
  'AH_AFTER_COMBAT[3]=()=>AH_WORLD_V3_resumeAfterCombat(1)',
  'AH_AFTER_COMBAT[6]=()=>AH_WORLD_V3_resumeAfterCombat(2)',
  'AH_AFTER_COMBAT[10]=()=>AH_WORLD_V3_resumeAfterCombat(3)',
  'AH_AFTER_COMBAT[12]=()=>AH_WORLD_V3_resumeAfterCombat(4)',
  'window.__TTD_AL_HATA_CONTINUOUS_WORLD_V3_API=Object.freeze',
],'Al Hata continuous world v3');
must(v3.indexOf('leavePlatformLayout(false);AH_WORLD_V3_primeCombatFrame')<v3.indexOf('session=null;state.running=true'),'battle world must be rendered before traversal canvas is retired and native combat starts');
must(v3.includes('world.objects=active.objects;world.drops=active.drops'),'combat handoff must carry exact traversal object/drop references into battle');

const loader=read('online/run-ui-bridge-v21.js');
need(loader,[
  "'/online/al-hata-stage1-world-v2.js?v=1'",
  "'/online/adventure-continuous-map-contract-v1.js?v=1'",
  "'/online/al-hata-stage1-world-v3.js?v=1'",
],'Al Hata loader');
must(loader.indexOf('/online/al-hata-stage1-world-v2.js?v=1')>loader.indexOf('/online/al-hata-stage1-playtest-v1.js?v=1'),'continuous world v2 must load after the Navigator opening');
must(loader.indexOf('/online/adventure-continuous-map-contract-v1.js?v=1')>loader.indexOf('/online/al-hata-stage1-world-v2.js?v=1'),'generic continuous-map contract must be available before Al Hata v3');
must(loader.indexOf('/online/al-hata-stage1-world-v3.js?v=1')>loader.indexOf('/online/adventure-continuous-map-contract-v1.js?v=1'),'Al Hata v3 must load after the reusable continuous-map contract');

console.log('Al Hata continuous world verified: expanded hidden-edge terrain, six side areas, two-axis camera, world-space arena routes, exact persistent object/drop references, same-map combat rendering, cross-faded camera-glide handoffs, persistent discoveries, visual destruction, proximity slate chests, and reduced traversal HUD are wired on the reusable Adventure continuous-map contract.');
