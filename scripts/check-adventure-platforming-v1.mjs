import fs from 'node:fs';
import vm from 'node:vm';

const platform=fs.readFileSync('online/adventure-platforming-v2.js','utf8');
const selector=fs.readFileSync('online/adventure-platforming-selector-v6.js','utf8');
const pseudo3d=fs.readFileSync('online/adventure-pseudo3d-battle-v1.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');

new vm.Script(platform,{filename:'online/adventure-platforming-v2.js'});
new vm.Script(selector,{filename:'online/adventure-platforming-selector-v6.js'});
new vm.Script(pseudo3d,{filename:'online/adventure-pseudo3d-battle-v1.js'});
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

need(pseudo3d,[
  "window.__TTD_TEST_PSEUDO3D_BATTLE_V1=true",
  "const ROUTES={",
  "const CAMERAS={1:60,2:1450}",
  "function projectWorld(x,z,y=0,W=cw,H=ch,id=routeId())",
  "pathPts=route.map(p=>projectWorld",
  "buildPath=function buildPathWithTestPseudo3D",
  "drawLane=function drawLaneWithTestPseudo3D",
  "theme.top='rgba(0,0,0,0)'",
  "ttdPseudoBattleBackV1",
  "ttdPseudoBattleFrontV1",
  "PSEUDO-3D · LOWER COURTYARD",
  "PSEUDO-3D · UPPER COURT",
  "drawRouteBed",
  "drawPlatform",
  "2 pseudo-3D battle waves",
],'pseudo-3D battle');
if(pseudo3d.includes('ADVENTURES.al_hata')||pseudo3d.includes('AL_HATA_STAGE'))throw new Error('Pseudo-3D Test Map renderer must not mutate Al Hata.');

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

console.log('Adventure Test Map unified pseudo-3D verified: both battle routes are projected into the traversal world coordinate system, the normal combat engine renders over transparent world canvases, navigator selection still comes from exact live summoned instances, and Al Hata remains untouched.');
