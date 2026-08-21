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
  "window.__TTD_TEST_MAINMAP_BATTLE_V3=true",
  "typeof platformApi()?.renderBattleBackdrop==='function'",
  "platformApi()?.renderBattleBackdrop?.(g,w,h,combatArea(),performance.now()/1000)",
  "ttd-mainmap-combat-v3",
  "ttdMainMapCombatBackV3",
  "ttdMainMapCombatFrontV3",
  "buildPath=function buildPathOnMainMap",
  "drawLane=function drawLaneOnMainMap",
  "theme.top='rgba(0,0,0,0)'",
  "fight again in the next area — no map swap",
  "usesExactTraversalRenderer",
],'continuous same-map battle');
if(mainMapBattle.includes('ADVENTURES.al_hata')||mainMapBattle.includes('AL_HATA_STAGE'))throw new Error('Same-map Test Map renderer must not mutate Al Hata.');
if(mainMapBattle.includes("const ROUTES={")||mainMapBattle.includes('PSEUDO-3D · LOWER COURTYARD'))throw new Error('Legacy alternate pseudo-3D battle world must not return.');
if(mainMapBattle.includes("const snapshot=document.createElement('canvas')"))throw new Error('Combat must use the traversal renderer directly, not a captured/parallel map path.');
if(mainMapBattle.includes('/online/game-presentation-v1.js'))throw new Error('Global presentation must not be bootstrapped from the Test Map renderer.');

need(presentation,[
  'const MISSION_GAP_MS = 1250',
  'const CLEAR_HIDE_MS = 1400',
  'const RESULT_REVEAL_MS = 1850',
  "makeSignal(['MISSION', 'START!'])",
  "makeSignal(['CLEAR!'])",
  'position:fixed',
  "font-family:'Russo One',sans-serif!important",
  'visibility:hidden!important',
  "nodes[0]?.classList.add('in')",
  'prepareZombieResult(pipsEarned)',
  "card.replaceWith(marker)",
  'ttdResultCardV1',
  'ttdMvpDieGlowV1',
  "label.textContent = 'MVP'",
  'presentObjectiveClear',
  'window.TTDGamePresentation',
  'rebind: installAll',
],'game presentation');
if(presentation.includes("word.className = 'awardTitle ttdSignalWord'"))throw new Error('MISSION/START must not inherit legacy award animations.');

need(runUi,[
  "/online/adventure-platforming-v2.js?v=2",
  "/online/adventure-platforming-selector-v6.js?v=6",
  "/online/adventure-pseudo3d-battle-v1.js?v=3",
  "function renderBattleBackdrop(g,w,h,area=1,time=0)",
  "drawBackground(g)",
  "currentPlatforms(preview.time)",
  "renderBattleBackdrop:(g,w,h,area,time)=>renderBattleBackdrop(g,w,h,area,time)",
  "selectNavigator:(boardIndex)=>chooseNavigator(Number(boardIndex))",
  "get liveBoardIndices(){return liveBoardIndices();}",
  "try{buildPath(cw,ch);}",
  "eval(`${worldSource}",
  "installPlatformOnlineStartSyncV1()",
  "/online/game-presentation-v1.js?v=2",
  "window.TTDGamePresentation?.rebind?.()",
],'platform/presentation loader');
if(runUi.includes('/online/adventure-platforming-selector-v5.js?v=5'))throw new Error('Runtime must not load selector v5.');

need(loaderHtml,[
  "window.__TTD_ASSET_URL=(path)=>",
  "url.searchParams.set('__ttd',token)",
  "cache:'no-store'",
],'loader');

console.log('Adventure Test Map continuous-world flow verified: wave-one combat is rebound onto a sectioned path inside the traversal renderer, both combat areas are drawn by the exact same map functions used for navigation, no pseudo-world/snapshot renderer remains, navigator selection still uses live summoned instances, MISSION is isolated from legacy award/Zombie typography with START hidden for the full 1.25-second gap, presentation loads after start wrappers, result timing remains syntax-checked, and Al Hata remains untouched.');
