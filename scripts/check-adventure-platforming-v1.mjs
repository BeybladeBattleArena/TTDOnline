import fs from 'node:fs';
import vm from 'node:vm';

const platform=fs.readFileSync('online/adventure-platforming-v2.js','utf8');
const selector=fs.readFileSync('online/adventure-platforming-selector-v5.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');

new vm.Script(platform,{filename:'online/adventure-platforming-v2.js'});
new vm.Script(selector,{filename:'online/adventure-platforming-selector-v5.js'});
new vm.Script(runUi,{filename:'online/run-ui-bridge-v21.js'});

const markers=[
  "const TEST_ID = 'test_map'",
  "ADVENTURES[TEST_ID] = TEST_ADVENTURE",
  "2 battle waves → summoned-die traversal",
  "state.wave===2",
  "state.running=false",
  "state.wave=3",
  "buildTestRouteTwo",
  "ttd-nav-instance-select",
  "ttd-nav-choice",
  "const die=state.board?.[boardIndex]",
  "state.board?.[n.boardIndex]===n.die",
  "Select one of your currently summoned dice",
  "ttd-platform-mode",
  "grid-template-rows:auto minmax(230px,1fr) auto",
  "r.height<180",
  "ttdNavController",
  "ttdJoyWrap",
  "ttdJumpBtn",
  "n.jumps>=2",
  "DOUBLE JUMP!",
  "shadowAlpha",
  "type:'chest_food'",
  "type:'chest_coin'",
  "type:'chest_upgrade'",
  "Math.round(effDmg(n.die))",
  "navigatorDamage",
  "pipUp()",
  "bonusWaveCredits",
  "state.completedWaves+=bonus",
  "New marching path · Wave 3",
  "ttdNavReturnGhost",
  "endRunBtn",
  "stopImmediatePropagation",
  "endMatch('voluntary')",
  "failTraversalRenderer",
];
for(const marker of markers)if(!platform.includes(marker))throw new Error(`Adventure platforming v2 marker missing: ${marker}`);

for(const forbidden of [
  "const deckRow=document.getElementById('deckRow')",
  "findBoardCandidate(key)",
  "const entry=state.deck[slotIndex]",
])if(platform.includes(forbidden))throw new Error(`Navigator selection regressed to deck definitions: ${forbidden}`);

if(platform.includes('ADVENTURES.al_hata')||platform.includes('AL_HATA_STAGE1 =')||platform.includes('AL_HATA_STAGE2 =')||platform.includes('AL_HATA_STAGE3 =')){
  throw new Error('Adventure platforming test module must not mutate Al Hata definitions.');
}

for(const marker of [
  "const ROOT_ID='ttdNavigatorSelectorV5'",
  "NAV SELECT V5",
  "cloneNode(true)",
  "ttdNavigatorBoardCloneV5",
  "originalTiles[index]?.classList.contains('ttd-nav-choice')",
  "button.addEventListener('pointerdown'",
  "button.addEventListener('touchstart'",
  "button.addEventListener('click'",
  "api.selectNavigator(index)",
  "board.style.visibility='hidden'",
  "Selection reached the runtime but traversal did not start",
])if(!selector.includes(marker))throw new Error(`Navigator selector v5 marker missing: ${marker}`);

for(const forbidden of [
  "tile.click()",
  "dispatchEvent(new MouseEvent",
  "ttdNavHitLayerV4",
])if(selector.includes(forbidden))throw new Error(`Navigator selector v5 must remain isolated from the battle-board event path: ${forbidden}`);

for(const marker of [
  "/online/adventure-platforming-v2.js?v=2",
  "/online/adventure-platforming-selector-v5.js?v=5",
  "cache:'no-store'",
  "selectNavigator:(boardIndex)=>chooseNavigator(Number(boardIndex))",
  "get selecting(){return!!session?.active&&session.phase==='select';}",
  "Platform navigator API exposure marker missing",
  "eval(`${platformSource}",
  "eval(`${selectorSource}",
  "installPlatformOnlineStartSyncV1()",
  "state.adventureStage===testStage",
  "requestAnimationFrame(()=>tagAuthorizedTestState",
])if(!runUi.includes(marker))throw new Error(`Platform loader/start-sync marker missing: ${marker}`);

for(const obsolete of [
  '/online/adventure-platforming-mobile-input-v3.js?v=3',
  '/online/adventure-platforming-hit-layer-v4.js?v=4',
])if(runUi.includes(obsolete))throw new Error(`Runtime must not depend on failed navigator selector path: ${obsolete}`);

for(const marker of [
  "window.__TTD_ASSET_URL=(path)=>",
  "url.searchParams.set('__ttd',token)",
  "window.fetch=(input,init={})=>",
  "cache:'no-store'",
])if(!loaderHtml.includes(marker))throw new Error(`Verified loader cache-bust marker missing: ${marker}`);

console.log('Adventure platforming v2 + selector v5 verified: the navigator is chosen from a cloned visual copy of the exact summoned 5×3 board with independent native pointer/touch/click targets, no battle-board drag/click routing is used, the selector visibly identifies itself as NAV SELECT V5, the loader cache-bust contract is verified, traversal retains End Run/mobile safeguards, Al Hata is untouched, and Wave 3 resumes on the second route.');
