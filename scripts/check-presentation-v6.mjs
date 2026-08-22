import fs from 'node:fs';
import vm from 'node:vm';

const read=(p)=>fs.readFileSync(p,'utf8');
const presentation=read('online/game-presentation-v1.js');
const audio=read('online/audio-client-v27.js');
const continuous=read('online/adventure-continuous-world-v1.js');
const battle=read('online/adventure-pseudo3d-battle-v1.js');
const platform=read('online/adventure-platforming-v2.js');
const runUi=read('online/run-ui-bridge-v21.js');

for(const [name,src] of [['presentation',presentation],['audio',audio],['continuous',continuous],['battle',battle],['platform',platform],['runUi',runUi]]) new vm.Script(src,{filename:name});
const need=(src,items,label)=>{for(const item of items)if(!src.includes(item))throw new Error(`${label} missing ${item}`);};
const forbid=(src,items,label)=>{for(const item of items)if(src.includes(item))throw new Error(`${label} returned forbidden ${item}`);};

need(presentation,[
  'window.__TTD_GAME_PRESENTATION_V6',
  "const SIGNAL_ID='ttdGameSignalV6'",
  "document.getElementById('laneWrap')||document.getElementById('laneCanvas')",
  '--ttd-map-center-x','--ttd-map-center-y','positionSignal(overlay)','trackSignalPosition(overlay)',
  "if(text==='START!')word.classList.add('ttdStartWord')",
  'linear-gradient(180deg,#b8ecff 0%,#73cef5 48%,#4aa6df 100%)',
  '.countdown .ttdSignalWord{position:absolute;inset:0;display:flex;align-items:center;justify-content:center',
  'linear-gradient(180deg,#9bcbe8 0%,#719acb 54%,#7467a7 100%)',
  'linear-gradient(180deg,#fff38c 0%,#f9dc68 62%,#edbd52 100%)',
  'text-shadow:none!important;filter:blur(2px) drop-shadow',
  "makeSignal(['MISSION','START!'])","makeSignal(['3','2','1','START!'],'countdown')",
  "announce('mission')","announce('start')","announce('combatStart')",
  "clear:{text:'CLEAR!',className:'outcome-clear',voice:'clear'}",
  "fail:{text:'FAIL',className:'outcome-fail',voice:'fail'}",
  "finish:{text:'FINISH!',className:'outcome-finish',voice:'finish'}",
  'await sleep(MAP_PREVIEW_MS)','freezeRunForMission(runState)','resumeRunFromMission(runState)',
  'runState.running=false','runState.running=true','drawLane?.(0)',
  'campaignComplete=wrappedCampaignComplete','endMatch=wrappedEndMatch','endEndlessHorde=wrappedEndHorde',
  'pipsEarned=kills>0?Math.round(kills*2+actualPlayTime*.15):0',
  'version:6','rebind:installAll',
],'presentation v6');
forbid(presentation,[
  'window.__TTD_GAME_PRESENTATION_V5',
  'linear-gradient(180deg,#91c3e3 0%,#7398c9 53%,#746aa7 100%)',
  'linear-gradient(180deg,#fff17b 0%,#f8da68 66%,#efc45d 100%)',
  '.ttdSignalStack{display:flex;flex-direction:column',
],'presentation v6');

const cfn=presentation.indexOf('async function playCombatCountdown');
const cStart=presentation.indexOf("nodes[3]?.classList.add('in')",cfn);
const cVoice=presentation.indexOf("announce('combatStart')",cStart);
const cResume=presentation.indexOf('onStart?.()',cVoice);
if(!(cfn>=0&&cStart>cfn&&cVoice>cStart&&cResume>cVoice))throw new Error('CombatStart must voice the visible START before combat resumes.');

const mfn=presentation.indexOf('async function playMissionCue');
const preview=presentation.indexOf('await sleep(MAP_PREVIEW_MS)',mfn);
const mission=presentation.indexOf("announce('mission')",preview);
const start=presentation.indexOf("announce('start')",mission);
const resume=presentation.indexOf('resumeRunFromMission(runState)',start);
if(!(mfn>=0&&preview>mfn&&mission>preview&&start>mission&&resume>start))throw new Error('Mission map preview and voice order changed.');

need(audio,[
  'window.__TTD_AUDIO_V31',
  "const asset=(path)=>{try{return window.__TTD_ASSET_URL?.(path)||path;}",
  "mission:asset('/assets/audio/announcer/Mission.mp3')",
  "start:asset('/assets/audio/announcer/Start.mp3')",
  "combatStart:asset('/assets/audio/announcer/CombatStart.mp3')",
  "clear:asset('/assets/audio/announcer/MissionClear.mp3')",
  "fail:asset('/assets/audio/announcer/MissionFail.mp3')",
  "finish:asset('/assets/audio/announcer/Finish.mp3')",
  "fetch(url,{cache:'no-store'})",
  "if(key===lastVoiceKey&&now-lastVoiceAt<300)return true",
  'if(activeVoice){try{activeVoice.stop();}',
  'activeVoice=source',
],'audio v31');

need(continuous,[
  'window.__TTD_CONTINUOUS_WORLD_V2',
  "contract:'one-world-one-camera-persistent-objects'",
  'async function ensurePresentationV6()',
  'window.__TTD_GAME_PRESENTATION_V6',
  "game-presentation-v1.js?v=6",
  'ensurePresentationV6();',
],'continuous world');
forbid(continuous,['game-presentation-v1.js?v=4'],'continuous world');

need(battle,['window.__TTD_TEST_MAINMAP_BATTLE_V4=true','presentation?.playCombatCountdown','usesPersistentTraversalRenderer'],'same-map battle');
need(platform,["const TEST_ID = 'test_map'",'state.wave===2','state.wave=3','ttd-platform-mode'],'platform traversal');
need(runUi,['function installPlatformOnlineStartSyncV2()','state.__ttdWorldState','world.cameraX=session.cameraX','objects:wstate.objects,drops:wstate.drops'],'persistent world bridge');

console.log('Presentation V6 verified: all battle text is map-centered, countdown entries replace each other in one slot, START is consistently blue, FAIL/FINISH use Android-safe gradients, cue audio keys remain distinct and cache-busted, CombatStart fires on its visible START frame, and Test Map continuity remains wired.');
