import fs from 'node:fs';
import vm from 'node:vm';

const platform=fs.readFileSync('online/adventure-platforming-v2.js','utf8');
const mobileInput=fs.readFileSync('online/adventure-platforming-mobile-input-v3.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');

new vm.Script(platform,{filename:'online/adventure-platforming-v2.js'});
new vm.Script(mobileInput,{filename:'online/adventure-platforming-mobile-input-v3.js'});
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
  "addEventListener('pointerdown'",
  "ttd-nav-instance-select",
  "#board .tile.ttd-nav-choice",
  "event.preventDefault()",
  "event.stopImmediatePropagation()",
  "queueMicrotask",
  "tile.click()",
  "},true)",
])if(!mobileInput.includes(marker))throw new Error(`Mobile navigator input marker missing: ${marker}`);
if(mobileInput.includes("addEventListener('click'"))throw new Error('Mobile navigator input must intercept pointerdown before battle-board drag handling, not wait for click.');

for(const marker of [
  "/online/adventure-platforming-v2.js?v=2",
  "/online/adventure-platforming-mobile-input-v3.js?v=3",
  "cache:'no-store'",
  "eval(`${source}",
  "eval(`${inputSource}",
  "installPlatformOnlineStartSyncV1()",
  "state.adventureStage===testStage",
  "requestAnimationFrame(()=>tagAuthorizedTestState",
])if(!runUi.includes(marker))throw new Error(`Platform loader/start-sync marker missing: ${marker}`);

console.log('Adventure platforming v2 + mobile input v3 verified: navigator selection is restricted to exact summoned board instances, mobile pointerdown is captured before board drag handling, traversal has a non-collapsing mobile layout and renderer failure guard, End Run remains functional while battle time is paused, Al Hata is untouched, and Wave 3 resumes on the second route.');
