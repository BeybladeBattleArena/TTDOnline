import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const progression=require('../functions/account-progression-core-v21.js');

const singleplayer=fs.readFileSync('functions/singleplayer-v6.js','utf8');
const deckSocial=fs.readFileSync('functions/deck-social-v18.js','utf8');
const rewards=fs.readFileSync('functions/account-progression-v21.js','utf8');
const main=fs.readFileSync('functions/main-v6.js','utf8');
const runClient=fs.readFileSync('online/run-client-v21.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const clientEntry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const runtimeBridges=fs.readFileSync('online/runtime-bridge-loader-v1.js','utf8');
const friendClient=fs.readFileSync('online/deck-social-client-v18.js','utf8');
const game=fs.readFileSync('random-dice-game-33.html','utf8');

const expectedEarly=[0,150,350,600,900,1250,1650,2100,2600,3150];
expectedEarly.forEach((xp,index)=>{if(progression.xpThresholdForLevel(index+1)!==xp)throw new Error(`Level ${index+1} threshold must be ${xp} XP.`);});
for(const [level,xp] of [[11,3721],[25,15040],[50,63690],[75,175465],[100,381615]]){
  if(progression.xpThresholdForLevel(level)!==xp)throw new Error(`Level ${level} threshold changed from ${xp}.`);
}
if(progression.levelFromXp(2099)!==7||progression.levelFromXp(2100)!==8||progression.levelFromXp(3150)!==10)throw new Error('Early-level boundary behavior changed.');
if(progression.calculateRunXp({modeKey:'endlesshorde',playSeconds:190,kills:69})!==58)throw new Error('Measured 3:10 / 69-kill Horde calibration must award 58 EXP.');
if(progression.calculateRunXp({modeKey:'endlesshorde',playSeconds:9999,kills:0})!==0)throw new Error('Zero-kill Endless Horde must award 0 EXP regardless of elapsed time.');
if(progression.calculateRunXp({modeKey:'future_zombie_night',modeFamily:'zombie',playSeconds:9999,kills:0})!==0)throw new Error('Every Zombie-family mode must award 0 EXP before the first kill.');
if(progression.calculateRunXp({modeKey:'adventure',difficultyKey:'normal',completedWaves:26,kills:188,playSeconds:390,typhoonDefeated:false})!==107)throw new Error('Measured Al Hata calibration must award 107 EXP.');
if(progression.calculateRunXp({modeKey:'future_zombie_night',modeFamily:'zombie',playSeconds:190,kills:69})!==58)throw new Error('Future Zombie modes must inherit the Zombie EXP family.');
if(progression.calculateRunXp({modeKey:'future_adventure_2',modeFamily:'adventure',difficultyKey:'normal',completedWaves:26,kills:188,playSeconds:390})!==107)throw new Error('Future Adventure modes must inherit the Adventure EXP family.');
if(Object.keys(progression.LEVEL_REWARDS).length!==100||Object.values(progression.LEVEL_REWARDS).some((list)=>!Array.isArray(list)||list.length!==0))throw new Error('All 100 level reward listings must exist and remain empty for this release.');

const markers=(text,list,label)=>{for(const marker of list)if(!text.includes(marker))throw new Error(`${label} missing: ${marker}`);};
markers(singleplayer,[
  "require('./account-progression-core-v21')",
  "require('./account-progression-v21')",
  'const levelRef = db.doc(`users/${auth.uid}/game/accountLevel`)',
  'progressionV21.calculateRunXp',
  'progressionV21.levelsCrossed',
  'const rewardEligibleLevels = Array.from({ length:nextLevel.level }',
  'levelRewardsV21._applyConfiguredLevelRewards',
  'xpAwarded',
  'levelBefore:previousLevel.level',
  'levelAfter:nextLevel.level',
  'modeFamily',
],'run finalization');
markers(rewards,[
  'applyConfiguredLevelRewards',
  "kind === 'currency'",
  "kind === 'item'",
  "kind === 'die'",
  "kind === 'jewel'",
  "kind === 'entitlement'",
  'claimedRewards',
  'rewardListings',
],'level reward engine');
markers(deckSocial,['progressionV21.publicLevel','progressionV21.curveSummary()','schemaVersion:21'],'friend/account level source');
markers(friendClient,['v18FriendLevel','Level ${friend.level?.level||1}','ttd:account-progression-v21'],'friend list/client level UI');
markers(runClient,['renderLevel(data.level)','ttd:account-progression-v21',"type:'ttd:v6-run-finish-result'",'...data'],'run EXP client');
markers(runUi,["m.type!=='ttd:v6-run-finish-result'",'window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35?.(m)'],'verified run-result forwarding');
markers(game,[
  'TTD_NATIVE_RESULT_VERSION = 35',
  'id="overlayPipsValue"',
  'id="overlayExpValue"',
  'function applyVerifiedRunResultV35(result)',
  'xp:result.xpAwarded',
  'window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35=applyVerifiedRunResultV35',
  'state.__ttdOutcomeCommitted',
],'canonical run result EXP UI');
if(clientEntry.includes("result-summary-client-v26")||clientEntry.includes("result-reward-polish-v1"))throw new Error('Legacy downstream result owners must not be loaded after canonical v35 materialization.');
if(!clientEntry.includes("import './run-client-v21.js?v=21';"))throw new Error('Single-player client does not load run-client-v21.');
if(!runtimeBridges.includes("'/online/run-ui-bridge-v21.js?v=21'"))throw new Error('Native runtime bridge authority does not load the run-result forwarding bridge v21.');
if(!main.includes('getAccountProgressionV21:accountProgression.getAccountProgressionV21'))throw new Error('Account progression v21 callable is not exported.');

console.log('Account progression v21 verified: levels 1-100, calibrated Adventure/Zombie EXP, zero EXP before the first Zombie kill, extensible empty per-level rewards, canonical v35 PIPS/EXP result rows, verified server EXP forwarding through the native runtime bridge authority, and friend-list levels are wired end to end.');
