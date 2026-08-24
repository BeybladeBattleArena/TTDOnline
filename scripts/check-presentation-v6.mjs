import fs from 'node:fs';
import vm from 'node:vm';

const read=(p)=>fs.readFileSync(p,'utf8');
const presentation=read('online/game-presentation-v1.js');
const audio=read('online/audio-client-v27.js');
const continuous=read('online/adventure-continuous-world-v1.js');
const battle=read('online/adventure-pseudo3d-battle-v1.js');
const platform=read('online/adventure-platforming-v2.js');
const runUi=read('online/run-ui-bridge-v21.js');
const rewardPolish=read('online/result-reward-polish-v1.js');
const rewardMeta=read('online/result-reward-meta-v1.js');

for(const [name,src] of [['presentation',presentation],['audio',audio],['continuous',continuous],['battle',battle],['platform',platform],['runUi',runUi],['rewardPolish',rewardPolish],['rewardMeta',rewardMeta]]) new vm.Script(src,{filename:name});
const need=(src,items,label)=>{for(const item of items)if(!src.includes(item))throw new Error(`${label} missing ${item}`);};
const forbid=(src,items,label)=>{for(const item of items)if(src.includes(item))throw new Error(`${label} returned forbidden ${item}`);};

need(presentation,[
  'window.__TTD_GAME_PRESENTATION_V6',"const SIGNAL_ID='ttdGameSignalV6'",
  "document.getElementById('laneWrap')||document.getElementById('laneCanvas')",
  '--ttd-map-center-x','--ttd-map-center-y','positionSignal(overlay)','trackSignalPosition(overlay)',
  "if(text==='START!')word.classList.add('ttdStartWord')",'linear-gradient(180deg,#b8ecff 0%,#73cef5 48%,#4aa6df 100%)',
  '.countdown .ttdSignalWord{position:absolute;inset:0;display:flex;align-items:center;justify-content:center',
  'linear-gradient(180deg,#9bcbe8 0%,#719acb 54%,#7467a7 100%)','linear-gradient(180deg,#fff38c 0%,#f9dc68 62%,#edbd52 100%)',
  "makeSignal(['MISSION','START!'])","makeSignal(['3','2','1','START!'],'countdown')",
  "announce('mission')","announce('start')","announce('combatStart')",
  "clear:{text:'CLEAR!',className:'outcome-clear',voice:'clear'}","fail:{text:'FAIL',className:'outcome-fail',voice:'fail'}","finish:{text:'FINISH!',className:'outcome-finish',voice:'finish'}",
  'const FAIL_POST_VOICE_MS=1200','const VOICE_ACK_TIMEOUT_MS=12000','pendingVoiceAcks=new Map()',
  "message.type!=='ttd:voice-cue-complete'","waitForEnd:kind==='fail'",'Promise.all([sleep(minDelay),voiceDone])',
  'await sleep(MAP_PREVIEW_MS)','freezeRunForMission(runState)','resumeRunFromMission(runState)',
  'campaignComplete=wrappedCampaignComplete','endMatch=wrappedEndMatch','endEndlessHorde=wrappedEndHorde',
  'pipsEarned=kills>0?Math.round(kills*2+actualPlayTime*.15):0','version:6','failPostVoiceMs:FAIL_POST_VOICE_MS','rebind:installAll',
],'presentation v6');
forbid(presentation,['window.__TTD_GAME_PRESENTATION_V5','activeVoice.stop()'],'presentation v6');
const failFlow=presentation.indexOf("waitForEnd:kind==='fail'"),failExtra=presentation.indexOf('sleep(FAIL_POST_VOICE_MS)',failFlow),failReveal=presentation.indexOf('Promise.all([sleep(minDelay),voiceDone])',failExtra);
if(!(failFlow>=0&&failExtra>failFlow&&failReveal>failExtra))throw new Error('FAIL result must wait for the real audio-ended acknowledgement plus 1.2 seconds before revealing.');

const cfn=presentation.indexOf('async function playCombatCountdown'),cStart=presentation.indexOf("nodes[3]?.classList.add('in')",cfn),cVoice=presentation.indexOf("announce('combatStart')",cStart),cResume=presentation.indexOf('onStart?.()',cVoice);
if(!(cfn>=0&&cStart>cfn&&cVoice>cStart&&cResume>cVoice))throw new Error('CombatStart must voice the visible START before combat resumes.');

need(audio,['window.__TTD_AUDIO_V32',"fail:asset('/assets/audio/announcer/MissionFail.mp3')","fetch(url,{cache:'no-store'})",'voiceQueue=Promise.resolve()','async function playVoiceNow(key)',"type:'ttd:voice-cue-complete'",'Promise.resolve(playVoiceCue(cue)).then','requestId'],'audio v32');
forbid(audio,['activeVoice.stop()'],'audio v32');

need(continuous,['window.__TTD_CONTINUOUS_WORLD_V4',"contract:'one-world-one-camera-persistent-objects'",'async function ensurePresentationV6()',"game-presentation-v1.js?v=6",'async function ensureRewardMetaV1()',"result-reward-meta-v1.js?v=1",'async function ensureSameMapBattleV6()',"adventure-pseudo3d-battle-v1.js?v=6",'ensureRewardMetaV1();','ensureSameMapBattleV6();'],'continuous world');
need(battle,['window.__TTD_TEST_MAINMAP_BATTLE_V6=true','WORLD_ROUTES','z:-390','z:365','halfX=560,halfZ=430','projectWorldPoint','drawArenaClearing','drawProjectedLaneSurface','drawEnemyGroundShadows','withFlatCorePathSuppressed',"s==='rgba(139,127,232,0.16)'","s==='rgba(217,178,106,0.35)'",'carryCombatCoinsToTraversal',"source:'combat'",'ttl:Math.max(5,remaining+3.5)','clearPriorCombatCoins','presentation?.playCombatCountdown','usesPersistentTraversalRenderer','usesWorldProjectedRoute'],'same-map battle v6');
need(platform,["const TEST_ID = 'test_map'",'state.wave===2','state.wave=3','ttd-platform-mode'],'platform traversal');
need(runUi,['function installPlatformOnlineStartSyncV2()','state.__ttdWorldState','world.cameraX=session.cameraX','objects:wstate.objects,drops:wstate.drops',"session.phase='materialize'",'Invisible ground event line','await transitionTween(900'],'persistent world bridge');

need(rewardPolish,['window.__TTD_RESULT_REWARD_POLISH_V1',"'ttd:verified-run-result-v1'","m.type!=='ttd:run-reward-meta-v1'",'ttdRewardLabelV1','ttdRewardValueV1','ttdRewardNoteV1','linear-gradient(180deg,#f6d77f 0%,#e5b64d 31%,#e27827 50%,#e5b64d 69%,#f6d77f 100%)',"row(pipsNode,'PIPS'","row(exp,'EXP'",'if(num(orbBonus)>0)','if(pct(bonusPct)>0)','result?.rewardBonuses||result?.bonuses||{}'],'reward tally polish');
need(rewardMeta,['window.__TTD_RESULT_REWARD_META_V1','expOrbs','expOrbBonusXp','adventureXp(completed)-adventureXp(Math.max(0,completed-credits))','account?.avatarRewardBonuses','account?.equipmentBonuses','pipsBonusPct','expBonusPct',"replace(/\\s*\\(~\\+\\d+\\s*base EXP\\)/ig,'')"],'reward metadata');

console.log('Presentation V6 verified: MissionFail gates result reveal on its actual audio end plus 1.2 seconds, PIPS/EXP tallies support orb and future equipment bonus annotations, and Test Map combat uses broad world-projected arenas with stale flat paths suppressed and combat coins carried into traversal.');
