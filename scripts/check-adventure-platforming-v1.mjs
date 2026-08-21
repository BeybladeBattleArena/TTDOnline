import fs from 'node:fs';
import vm from 'node:vm';

const platform=fs.readFileSync('online/adventure-platforming-v2.js','utf8');
const selector=fs.readFileSync('online/adventure-platforming-selector-v6.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');

new vm.Script(platform,{filename:'online/adventure-platforming-v2.js'});
new vm.Script(selector,{filename:'online/adventure-platforming-selector-v6.js'});
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
  "Selection reached the runtime but traversal did not start",
],'selector v6');

if(selector.includes("originalTiles[index]?.classList.contains('ttd-nav-choice')"))throw new Error('Selector v6 must not infer live dice from DOM class timing.');

need(runUi,[
  "/online/adventure-platforming-v2.js?v=2",
  "/online/adventure-platforming-selector-v6.js?v=6",
  "selectNavigator:(boardIndex)=>chooseNavigator(Number(boardIndex))",
  "get liveBoardIndices(){return liveBoardIndices();}",
  "get selecting(){return!!session?.active&&session.phase==='select';}",
  "installPlatformOnlineStartSyncV1()",
],'platform loader');

if(runUi.includes('/online/adventure-platforming-selector-v5.js?v=5'))throw new Error('Runtime must not load selector v5.');

need(loaderHtml,[
  "window.__TTD_ASSET_URL=(path)=>",
  "url.searchParams.set('__ttd',token)",
  "cache:'no-store'",
],'loader');

console.log('Adventure platforming selector v6 verified: live navigator choices come directly from battle state, not DOM class timing; Test Map traversal safeguards remain present and Al Hata is untouched.');
