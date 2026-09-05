import fs from 'node:fs';
import vm from 'node:vm';

const read=(path)=>fs.readFileSync(path,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
const need=(source,markers,label)=>{for(const marker of markers)must(source.includes(marker),`${label} missing: ${marker}`);};

const paths=[
  'online/al-hata-stage1-core-v1.js',
  'online/al-hata-stage1-beach-v1.js',
  'online/al-hata-stage1-jungle-v1.js',
  'online/al-hata-stage1-fork-v1.js',
  'online/al-hata-stage1-temple-v1.js',
  'online/al-hata-stage1-polish-v1.js',
];
const [core,beach,jungle,fork,temple,polish]=paths.map(read);
const combined=[core,beach,jungle,fork,temple,polish].join('\n\n');
new vm.Script(combined,{filename:'al-hata-stage1-concatenated-runtime.js'});

need(core,[
  'window.__TTD_AL_HATA_STAGE1_RUNTIME_V1=true',
  "const AH_ID='al_hata'",
  'AH_STAGE.waves=16',
  'const AH_AREAS=',
  "1:{id:'landing-shore'",
  "5:{id:'temple-forecourt'",
  'const AH_COMBAT_DRAWERS={}',
  'const AH_SEGMENT_DRAWERS={}',
  'const AH_AFTER_COMBAT={}',
  'updateSpawns=function AH_updateSpawns',
  'window.__TTD_AL_HATA_STAGE1_API=',
],'Al Hata shared runtime');

need(beach,[
  'AH_ROUTES[1]=',
  "{kind:'boat'",
  "id:'beach_push_crate'",
  "id:'beach_sp_chest'",
  "id:'beach_shell'",
  "id:'beach_barrier'",
  'AH_SEGMENT_DRAWERS.beach=',
  'AH_COMBAT_DRAWERS[1]=',
  'AH_AFTER_COMBAT[3]=',
],'Landing Shore');

need(jungle,[
  'AH_ROUTES[2]=',
  'AH_ROUTES[3]=',
  "id:'jungle_thrower_1'",
  "id:'ruin_column_1'",
  'AH_SEGMENT_DRAWERS.jungle=',
  'AH_SEGMENT_DRAWERS.deepJungle=',
  '__ahEntryFraction',
  '__ttdAhEntryKind',
  'AH_COMBAT_DRAWERS[2]=',
  'AH_COMBAT_DRAWERS[3]=',
],'Jungle escalation');

need(fork,[
  'AH_ROUTES[4]=',
  'AH_PINCER_RIGHT_ROUTE',
  "world.routeChoice='platform'",
  "world.routeChoice='pincer'",
  "id:'fork_platform_reward'",
  'AH_SEGMENT_DRAWERS.fork=',
  'AH_SEGMENT_DRAWERS.postFork=',
  'AH_COMBAT_DRAWERS[4]=',
],'Stage 1 route fork');

need(temple,[
  'AH_ROUTES[5]=',
  'AH_SEGMENT_STARTS.templeApproach',
  "id:'temple_secret_statue'",
  "id:'temple_hidden_sp_chest'",
  "id:'temple_combat_column'",
  "id:'temple_combat_statue'",
  'AH_SEGMENT_DRAWERS.templeApproach=',
  'AH_COMBAT_DRAWERS[5]=',
  "AH_finishTraversalToCombat(5,13,'Temple Forecourt')",
],'Temple approach and forecourt');

need(polish,[
  'window.__TTD_AL_HATA_STAGE1_POLISH_V1=true',
  'AH_POLISH_SHELL_SPOTS',
  'ttd:al-hata-shell-claim-request',
  'ttd:al-hata-shell-claim-result',
  'ttd:v6-refresh-request',
  "['BRIDGE AMBUSH','Hold the center']",
  "['TEMPLE FORECOURT','The mountain temple']",
  'AH_OBJECT_ATTACKERS.ah_shell=',
],'Stage 1 refinement layer');

const bridge=read('online/run-ui-bridge-v21.js');
need(bridge,paths.map((path)=>`/${path}?v=1`),'Al Hata loader module order');
must(bridge.indexOf('/online/al-hata-stage1-polish-v1.js?v=1')>bridge.indexOf('/online/al-hata-stage1-temple-v1.js?v=1'),'refinement layer must load after authored regions');

const itemClient=read('online/al-hata-world-item-client-v1.js');
const itemServer=read('functions/al-hata-world-items-v1.js');
new vm.Script(itemServer,{filename:'al-hata-world-items-v1.js'});
need(itemClient,['claimAlHataShellV1','ttd:al-hata-shell-claim-request','ttd:al-hata-shell-claim-result'],'shell client authority');
need(itemServer,["const SHELL_ID='al_hata_shell'",'resolveAdventureRun','worldClaims?.alHataStage1Shell','world_item_claim'],'shell server authority');

console.log('Al Hata Stage 1 verified: concatenated authored modules parse together; beach, jungle, fork, temple, polish, progression hooks, and server-backed shell ownership remain structurally wired.');
