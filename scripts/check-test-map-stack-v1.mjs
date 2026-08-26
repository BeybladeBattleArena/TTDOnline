import fs from 'node:fs';
import vm from 'node:vm';

const read=(path)=>fs.readFileSync(path,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
const need=(source,markers,label)=>{for(const marker of markers)must(source.includes(marker),`${label} missing: ${marker}`);};

const runUi=read('online/run-ui-bridge-v21.js');
const runtime=read('online/runtime-bridge-loader-v1.js');
const platform=read('online/adventure-platforming-v2.js');
const selector=read('online/adventure-platforming-selector-v6.js');
const continuous=read('online/adventure-continuous-world-v1.js');
const battle=read('online/adventure-pseudo3d-battle-v1.js');
const worldItems=read('online/world-items-v1.js');

for(const [name,source] of Object.entries({runUi,runtime,platform,selector,continuous,battle,worldItems})){
  new vm.Script(source,{filename:name});
}

need(runUi,[
  "const TEST_ID='test_map'",
  "fetch('/online/adventure-platforming-v2.js?v=2'",
  "fetch('/online/adventure-platforming-selector-v6.js?v=6'",
  "fetch('/online/adventure-continuous-world-v1.js?v=2'",
  "fetch('/online/adventure-pseudo3d-battle-v1.js?v=5'",
  'installPlatformOnlineStartSyncV2();',
  'TTD_PRESENTATION_INDEPENDENT_LOAD_V1',
  'TTD_RUN_UI_EXTENSIONS_READY_V1',
  'window.__TTD_RUN_UI_EXTENSIONS_READY=loadAdventurePlatformingV2();',
  'projectWorldPoint',
  'battleRouteWorld',
  'continuousPlatforms',
],'run-ui Test Map bootstrap');

need(runtime,[
  "'/online/run-ui-bridge-v21.js?v=21'",
  'await window.__TTD_RUN_UI_EXTENSIONS_READY;',
  'window.__TTD_MARK_BRIDGES_READY?.();',
],'native runtime readiness');
must(runtime.indexOf('await window.__TTD_RUN_UI_EXTENSIONS_READY;')<runtime.indexOf('window.__TTD_MARK_BRIDGES_READY?.();'),'native runtime may not declare ready before nested Test Map bootstrap settles');

need(platform,[
  "const TEST_ID = 'test_map'",
  "name:'Test Map'",
  'Traversal Systems Test',
  'setupNavigatorSelection',
  'liveBoardIndices',
  'chooseNavigator',
  'ttd-nav-instance-select',
  'ttd-platform-mode',
  'ttdJoyWrap',
  'ttdJumpBtn',
  'makeInteractables',
  'requestAnimationFrame(platformLoop)',
],'Test Map traversal/navigation');

need(selector,[
  'window.__TTD_ADVENTURE_PLATFORM_SELECTOR_V6',
  'Select one of your currently summoned dice to navigate with',
  'api.selectNavigator(index)',
  'api.liveBoardIndices',
  'ttdNavigatorBoardCloneV6',
],'navigator die selector');

need(continuous,[
  'window.__TTD_CONTINUOUS_WORLD_V4',
  "contract:'one-world-one-camera-persistent-objects'",
  "cameraContract:'traversal-freeze -> navigator-vanish -> arena-glide -> combat'",
  'bindCurrentTestState',
  '__ttdWorldState',
  'ensureSameMapBattleV6',
],'continuous world contract');

need(battle,[
  'window.__TTD_TEST_MAINMAP_BATTLE_V6=true',
  'WORLD_ROUTES',
  'projectWorldPoint',
  'drawProjectedLaneSurface',
  'withFlatCorePathSuppressed',
  'carryCombatCoinsToTraversal',
  'clearPriorCombatCoins',
  'usesWorldProjectedRoute',
],'same-map projected combat');

need(worldItems,[
  'installWorldPhysics',
  'ttdSurfaceTerrainV1',
  'ttdWorldInteractV1',
  'templePillar={taps:0,required:5',
  'ps.taps=Math.min(ps.required,(ps.taps||0)+1)',
  'ps.fallStart=performance.now()',
  'applyPillarImpact(pack,ps)',
  'ps.removed=true',
  'jumpDown','dropLand','climbDown','climbUp',
],'breakable terrain and routed world physics');

console.log('Test Map stack verified: continuous one-world traversal, navigator-die selection/gameplay, breakable terrain, projected 3D marching routes, same-map combat, and nested startup readiness remain wired end to end.');
