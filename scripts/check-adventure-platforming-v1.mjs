import fs from 'node:fs';
import vm from 'node:vm';

const platform=fs.readFileSync('online/adventure-platforming-v1.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');

new vm.Script(platform,{filename:'online/adventure-platforming-v1.js'});
new vm.Script(runUi,{filename:'online/run-ui-bridge-v21.js'});

const markers=[
  "const TEST_ID = 'test_map'",
  "ADVENTURES[TEST_ID] = TEST_ADVENTURE",
  "2 battle waves → navigator-die platforming",
  "state.wave===2",
  "state.running=false",
  "state.wave=3",
  "buildTestRouteTwo",
  "ttd-platform-mode",
  "ttd-nav-selecting",
  "ttdNavController",
  "ttdJoyWrap",
  "ttdJumpBtn",
  "if(n.jumps>=2)return",
  "DOUBLE JUMP!",
  "const shadowAlpha=",
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
];
for(const marker of markers)if(!platform.includes(marker))throw new Error(`Adventure platforming marker missing: ${marker}`);

if(platform.includes('ADVENTURES.al_hata')||platform.includes('AL_HATA_STAGE1 =')||platform.includes('AL_HATA_STAGE2 =')||platform.includes('AL_HATA_STAGE3 =')){
  throw new Error('Adventure platforming test module must not mutate Al Hata definitions.');
}

for(const marker of [
  "/online/adventure-platforming-v1.js?v=1",
  "cache:'no-store'",
  "eval(`${source}",
  "installPlatformOnlineStartSyncV1()",
  "state.adventureStage===testStage",
  "requestAnimationFrame(()=>tagAuthorizedTestState",
])if(!runUi.includes(marker))throw new Error(`Platform loader/start-sync marker missing: ${marker}`);

console.log('Adventure platforming v1 verified: Test Map is isolated from Al Hata, waits for the authorized online Adventure state, pauses after wave 2 for navigator selection, provides pseudo-3D double-jump traversal and interactive reward chests, then resumes on a second marching path.');
