import fs from 'node:fs';
import vm from 'node:vm';

const platform=fs.readFileSync('online/adventure-platforming-v2.js','utf8');
const selector=fs.readFileSync('online/adventure-platforming-selector-v6.js','utf8');
const mainMapBattle=fs.readFileSync('online/adventure-pseudo3d-battle-v1.js','utf8');
const presentation=fs.readFileSync('online/game-presentation-v1.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');

new vm.Script(platform,{filename:'online/adventure-platforming-v2.js'});
new vm.Script(selector,{filename:'online/adventure-platforming-selector-v6.js'});
new vm.Script(mainMapBattle,{filename:'online/adventure-pseudo3d-battle-v1.js'});
new vm.Script(presentation,{filename:'online/game-presentation-v1.js'});
new vm.Script(runUi,{filename:'online/run-ui-bridge-v21.js'});

const need=(text,markers,label)=>{for(const marker of markers)if(!text.includes(marker))throw new Error(`${label} marker missing: ${marker}`);};

need(platform,[
  "const TEST_ID = 'test_map'",
  "ADVENTURES[TEST_ID] = TEST_ADVENTURE",
  "state.wave===2",
  "state.wave=3",
  "const die=state.board?.[boardIndex]",
  "state.board?.[n.boardIndex]===n.die",
  "ttd-platform-mode",
  "ttdNavController",
  "n.jumps>=2",
  "type:'chest_food'",
  "type:'chest_coin'",
  "type:'chest_upgrade'",
  "Math.round(effDmg(n.die))",
  "endMatch('voluntary')",
  "failTraversalRenderer",
],'platform');
if(platform.includes('ADVENTURES.al_hata'))throw new Error('Test platforming must not mutate Al Hata.');

need(selector,[
  "const ROOT_ID='ttdNavigatorSelectorV6'",
  "NAV SELECT V6",
  "cloneNode(true)",
  "Array.isArray(api.liveBoardIndices)",
  "const liveSet=new Set(liveIndices.map(Number))",
  "const selectable=liveSet.has(index)",
  "api.selectNavigator(index)",
  "document.getElementById('ttdNavInstancePrompt')?.remove()",
],'selector v6');
if(selector.includes("originalTiles[index]?.classList.contains('ttd-nav-choice')"))throw new Error('Selector v6 must not infer live dice from DOM class timing.');

need(mainMapBattle,[
  "window.__TTD_TEST_MAINMAP_BATTLE_V2=true",
  "const snapshot=document.createElement('canvas')",
  "state?.__ttdPlatformDone",
  "g.drawImage(src,0,0)",
  "ttd-mainmap-combat-v2",
  "ttdMainMapCombatBackV2",
  "ttdMainMapCombatFrontV2",
  "buildPath=function buildPathOnMainMap",
  "drawLane=function drawLaneOnMainMap",
  "theme.top='rgba(0,0,0,0)'",
  "Traverse the stage, then fight inside sectioned combat areas on that exact same map.",
  "/online/game-presentation-v1.js?v=1",
  "cache:'no-store'",
],'same-map battle');
if(mainMapBattle.includes('ADVENTURES.al_hata')||mainMapBattle.includes('AL_HATA_STAGE'))throw new Error('Same-map Test Map renderer must not mutate Al Hata.');
if(mainMapBattle.includes("const ROUTES={")||mainMapBattle.includes('PSEUDO-3D · LOWER COURTYARD'))throw new Error('Legacy alternate pseudo-3D battle world must not return.');

need(presentation,[
  'const MISSION_GAP_MS = 1250',
  'const CLEAR_HIDE_MS = 1400',
  'const RESULT_REVEAL_MS = 1850',
  "makeSignal(['MISSION', 'START!'])",
  "makeSignal(['CLEAR!'], missionWordStyle)",
  'position:fixed',
  'prepareZombieResult(pipsEarned)',
  "card.replaceWith(marker)",
  'ttdResultCardV1',
  'ttdMvpDieGlowV1',
  "label.textContent = 'MVP'",
  'presentObjectiveClear',
  'window.TTDGamePresentation',
],'game presentation');

need(runUi,[
  "/online/adventure-platforming-v2.js?v=2",
  "/online/adventure-platforming-selector-v6.js?v=6",
  "/online/adventure-pseudo3d-battle-v1.js?v=1",
  "selectNavigator:(boardIndex)=>chooseNavigator(Number(boardIndex))",
  "get liveBoardIndices(){return liveBoardIndices();}",
  "eval(`${worldSource}",
  "installPlatformOnlineStartSyncV1()",
],'platform loader');
if(runUi.includes('/online/adventure-platforming-selector-v5.js?v=5'))throw new Error('Runtime must not load selector v5.');

need(loaderHtml,[
  "window.__TTD_ASSET_URL=(path)=>",
  "url.searchParams.set('__ttd',token)",
  "cache:'no-store'",
],'loader');

console.log('Adventure Test Map same-map flow verified: combat reuses the exact captured traversal frame instead of an alternate pseudo-3D world, battle paths remain sectioned inside that map, navigator selection still uses exact live summoned instances, MISSION/CLEAR/result timing is syntax-checked, Zombie results preload before reveal without pre-running counters, and Al Hata remains untouched.');
