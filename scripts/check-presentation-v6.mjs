import fs from 'node:fs';
import vm from 'node:vm';

const read=(p)=>fs.readFileSync(p,'utf8');
const game=read('random-dice-game-33.html');
const presentation=read('online/game-presentation-v1.js');
const audio=read('online/audio-client-v27.js');
const continuous=read('online/adventure-continuous-world-v1.js');
const battle=read('online/adventure-pseudo3d-battle-v1.js');
const runUi=read('online/run-ui-bridge-v21.js');
const entry=read('online/singleplayer-client-v6.js');

for(const [name,src] of [['presentation',presentation],['audio',audio],['continuous',continuous],['battle',battle],['runUi',runUi]]) new vm.Script(src,{filename:name});
const need=(src,items,label)=>{for(const item of items)if(!src.includes(item))throw new Error(`${label} missing ${item}`);};
const forbid=(src,items,label)=>{for(const item of items)if(src.includes(item))throw new Error(`${label} returned forbidden ${item}`);};

need(game,[
  'TTD_NATIVE_RESULT_VERSION = 35',
  'class="resultTallyLabel">PIPS</span>',
  'class="resultTallyLabel">EXP</span>',
  'id="overlayPipsValue"','id="overlayExpValue"','id="overlayPipsNotes"','id="overlayExpNotes"',
  'id="zSummaryPipsValue"','id="zSummaryExpValue"',
  'linear-gradient(180deg,#f6d77f 0%,#e5b64d 31%,#e27827 50%,#e5b64d 69%,#f6d77f 100%)',
  'function captureNativeRewardMeta()','expOrbBonusXp','function nativeBonusPercent(kind)',
  'account?.equipmentBonuses','account?.avatarRewardBonuses',
  'function applyVerifiedRunResultV35(result)','window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35',
  'if(!state || state.__ttdOutcomeCommitted) return;','state.__ttdOutcomeCommitted=true',
  "nativeOutcome('clear'","nativeOutcome(kind,revealAdventureNative)","nativeOutcome('finish',()=>showZombieSummary(pipsEarned))",
],'canonical game result/outcome');
forbid(game,['Pips banked!','EXP earned!'],'canonical game result text');

need(presentation,[
  'window.__TTD_GAME_PRESENTATION_V6',
  "makeSignal(['MISSION','START!'])","makeSignal(['3','2','1','START!'],'countdown')",
  "clear:{text:'CLEAR!',className:'outcome-clear',voice:'clear'}",
  "fail:{text:'FAIL',className:'outcome-fail',voice:'fail'}",
  "finish:{text:'FINISH!',className:'outcome-finish',voice:'finish'}",
  'const FAIL_POST_VOICE_MS=1200',"waitForEnd:kind==='fail'",
  'function presentOutcome(kind,{prepare,reveal,delay=RESULT_REVEAL_MS}={})',
  'function installAll(){',
],'presentation visual/audio service');
const installStart=presentation.indexOf('function installAll(){');
const installEnd=presentation.indexOf('window.TTDGamePresentation',installStart);
if(installStart<0||installEnd<0)throw new Error('Presentation installAll block missing.');
const installAll=presentation.slice(installStart,installEnd);
forbid(installAll,['installOutcomeFlows()','installSummaryWrapper()'],'presentation ownership');

need(audio,[
  "fail:asset('/assets/audio/announcer/MissionFail.wav')",
  "clear:asset('/assets/audio/announcer/MissionClear.mp3')",
  'voiceQueue=Promise.resolve()','async function playVoiceNow(key)',"type:'ttd:voice-cue-complete'",
],'audio runtime');
forbid(audio,['activeVoice.stop()'],'audio runtime');

forbid(entry,['result-summary-client-v26.js','result-reward-polish-v1.js'],'single-player result ownership');
forbid(continuous,['ensureRewardMetaV1();'],'continuous-world outcome wrappers');
need(runUi,['window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35?.(m)'],'run bridge canonical result forwarding');
forbid(runUi,['Pips banked!','EXP earned!','zSummaryXpV21'],'run bridge stale result UI');

need(battle,[
  'window.__TTD_TEST_MAINMAP_BATTLE_V6=true','WORLD_ROUTES','projectWorldPoint','drawProjectedLaneSurface',
  'withFlatCorePathSuppressed','carryCombatCoinsToTraversal','clearPriorCombatCoins',
  'const ARENA_FOOTPRINT=Object.freeze','halfX:215,halfZ:195','portraitSafeSwitchbacks(){return true;}','usesWorldProjectedRoute',
],'Test Map world battle');
// The actual v6 route must fit inside the declared portrait battle footprint. This replaces the
// obsolete v5 literal portraitSafeMargin marker with a geometry-level invariant.
for(const [label,centerX,points] of [
  ['beach',340,[[515,-155],[165,-155],[165,-50],[515,-50],[515,55],[165,55],[165,160],[515,160]]],
  ['temple',1840,[[1665,-155],[2015,-155],[2015,-50],[1665,-50],[1665,55],[2015,55],[2015,160],[1665,160]]],
]){
  for(const [x,z] of points){
    if(Math.abs(x-centerX)>215||Math.abs(z)>195)throw new Error(`${label} Test Map route escapes the portrait-safe arena footprint.`);
    const marker=`{x:${x},z:${z},y:0}`;
    if(!battle.includes(marker))throw new Error(`${label} Test Map route changed without updating portrait-safe geometry verification: ${marker}`);
  }
}

console.log('Presentation verified: the canonical game owns result rows and exactly-once outcomes; outer presentation only supplies mission/countdown/outcome visuals and audio; stale banked/earned result overlays are not loaded; Test Map routes remain world-projected switchbacks inside their portrait-safe arena footprints.');
