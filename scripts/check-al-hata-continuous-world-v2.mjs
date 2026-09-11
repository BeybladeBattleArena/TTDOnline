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
  'online/al-hata-stage1-world-v4.js',
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
  'function AH_WORLD_V3_projectWorld',
  'relZ=Number(z)-Number(cameraZ||0)',
  'world.cameraX=world.camera.x;world.cameraZ=world.camera.z',
  'AH_WORLD_V2_syncWorld=function AH_WORLD_V3_syncWorld',
  'AH_WORLD_V2_updateNavigator=function AH_WORLD_V3_updateNavigator',
  'buildPath=function AH_WORLD_V3_buildPath',
  'AH_WORLD_V2_drawWorldLayer=function AH_WORLD_V3_drawWorldLayer',
  'AH_finishTraversalToCombat=async function AH_WORLD_V3_finishTraversalToCombat',
  'leavePlatformLayout(false);AH_WORLD_V3_primeCombatFrame',
  'AH_WORLD_V3_retireTraversalCanvas()',
  'AH_WORLD_V3_CMAP.bindSession(world,session)',
],'Al Hata continuous world v3');
must(v3.includes('world.objects=active.objects;world.drops=active.drops'),'combat handoff must carry exact traversal object/drop references into battle');

const v4=read('online/al-hata-stage1-world-v4.js');
need(v4,[
  'window.__TTD_AL_HATA_CONTINUOUS_WORLD_V4=true',
  'const AH_WORLD_V4_ARENAS=Object.freeze',
  "spawn:'jungle-break'",
  "spawn:'goblin-camp'",
  "spawn:'ruin-cave'",
  "spawn:'bridge-pincer'",
  "spawn:'temple-arches'",
  "z1:-840,z2:840",
  "p.id==='pincer_bridge'",
  "x1:4260,x2:4840,z1:-86,z2:86,y:85",
  "['palmTall','palmLean','palmFan','palmTwin','beachBroad']",
  "['jungleTall','jungleFork','jungleBanyan','jungleButtress','jungleVine']",
  'AH_WORLD_V4_PROP_WALLS',
  'AH_WORLD_V4_propBlocked',
  'AH_WORLD_V4_sideCorridor',
  'AH_WORLD_V4_drawShoreline',
  "if(x<195||x>6915||z<-690||z>690)return true",
  'items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw())',
  'AH_WORLD_V2_updateNavigator=function AH_WORLD_V4_updateNavigator',
  'buildPath=function AH_WORLD_V4_buildPath',
  'function AH_WORLD_V4_drawRouteRibbon',
  'combatRouteReveal',
  'drawLane=function AH_WORLD_V4_drawLane',
  'w>=cw*.94&&h>=ch*.94',
  'AH_WORLD_V4_primeCombatFrame',
  'AH_finishTraversalToCombat=async function AH_WORLD_V4_finishTraversalToCombat',
  'await AH_WORLD_V2_tween(330,t=>{world.combatRouteReveal=t',
  'async function AH_WORLD_V4_resumeAfterCombat',
  "world.pathLanguage='clear-corridors-prop-walls'",
  'world.sameTerrainCombat=true',
  'world.exactFooting=true',
],'Al Hata continuous world v4');
must(!v4.includes('background:#')&&!v4.includes("fillStyle='#4a7")&&!v4.includes("fillStyle='#3f7"),'Al Hata v4 may not introduce a generic green TD battlefield');
must(v4.indexOf('AH_WORLD_V4_primeCombatFrame(area,targetX,targetZ)')<v4.indexOf('state.running=true;lastT=0'),'terrain-native combat frame and route reveal must be prepared before enemies start');

const viewport=read('online/gameplay-viewport-stability-v1.js');
new vm.Script(viewport,{filename:'gameplay-viewport-stability-v1.js'});
need(viewport,[
  'window.__TTD_GAMEPLAY_VIEWPORT_STABILITY_V1=true',
  'height:clamp(160px,56vw,235px)!important',
  '--ttd-stable-platform-lane-h',
  'Math.abs(width-lastWidth)>24',
  'Height-only resize deliberately does nothing',
  "window.visualViewport?.addEventListener('resize',widthAwareResize",
],'game-wide mobile viewport stability');

const loader=read('online/run-ui-bridge-v21.js');
need(loader,[
  "'/online/al-hata-stage1-world-v2.js?v=1'",
  "'/online/adventure-continuous-map-contract-v1.js?v=1'",
  "'/online/al-hata-stage1-world-v3.js?v=1'",
  "'/online/al-hata-stage1-world-v4.js?v=1'",
  "const VIEWPORT_STABILITY='/online/gameplay-viewport-stability-v1.js?v=1'",
  "await loadClassicScript(VIEWPORT_STABILITY,'gameplay viewport stability'",
],'Al Hata loader');
must(loader.indexOf('/online/al-hata-stage1-world-v4.js?v=1')>loader.indexOf('/online/al-hata-stage1-world-v3.js?v=1'),'Al Hata v4 must load after v3');

console.log('Al Hata continuous world verified through v4: clean prop-defined corridors, five obstacle variants per biome, expanded north/south travel, west shoreline border, exact visible footing, depth-sorted traversal occlusion, unique terrain-native combat routes, route-fade transitions, same-world enemy projection, persistent exploration, and mobile viewport stabilization are wired.');
