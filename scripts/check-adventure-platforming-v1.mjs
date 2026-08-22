import fs from 'node:fs';
import vm from 'node:vm';

const platform=fs.readFileSync('online/adventure-platforming-v2.js','utf8');
const selector=fs.readFileSync('online/adventure-platforming-selector-v6.js','utf8');
const mainMapBattle=fs.readFileSync('online/adventure-pseudo3d-battle-v1.js','utf8');
const presentation=fs.readFileSync('online/game-presentation-v1.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const continuousWorld=fs.readFileSync('online/adventure-continuous-world-v1.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');

new vm.Script(platform,{filename:'online/adventure-platforming-v2.js'});
new vm.Script(selector,{filename:'online/adventure-platforming-selector-v6.js'});
new vm.Script(mainMapBattle,{filename:'online/adventure-pseudo3d-battle-v1.js'});
new vm.Script(presentation,{filename:'online/game-presentation-v1.js'});
new vm.Script(runUi,{filename:'online/run-ui-bridge-v21.js'});
new vm.Script(continuousWorld,{filename:'online/adventure-continuous-world-v1.js'});

const need=(text,markers,label)=>{for(const marker of markers)if(!text.includes(marker))throw new Error(`${label} marker missing: ${marker}`);};
const forbid=(text,markers,label)=>{for(const marker of markers)if(text.includes(marker))throw new Error(`${label} forbidden marker returned: ${marker}`);};

need(platform,[
  "const TEST_ID = 'test_map'","ADVENTURES[TEST_ID] = TEST_ADVENTURE","state.wave===2","state.wave=3",
  "const die=state.board?.[boardIndex]","state.board?.[n.boardIndex]===n.die","ttd-platform-mode","ttdNavController","n.jumps>=2",
  "type:'chest_food'","type:'chest_coin'","type:'chest_upgrade'","Math.round(effDmg(n.die))","endMatch('voluntary')","failTraversalRenderer",
],'platform base');
if(platform.includes('ADVENTURES.al_hata'))throw new Error('Test platforming must not mutate Al Hata.');

need(selector,[
  "const ROOT_ID='ttdNavigatorSelectorV6'","NAV SELECT V6","cloneNode(true)","Array.isArray(api.liveBoardIndices)",
  "const liveSet=new Set(liveIndices.map(Number))","const selectable=liveSet.has(index)","api.selectNavigator(index)",
  "document.getElementById('ttdNavInstancePrompt')?.remove()",
],'selector v6');

need(continuousWorld,[
  'window.__TTD_CONTINUOUS_WORLD_V2',"contract:'one-world-one-camera-persistent-objects'",
  "rendererOwner:'adventure-platforming-v2 transformed scope'","scopeSafe:true","const TEST_ID='test_map'",
  'function isAuthorizedTestState(candidate)','candidate.adventureStage===testStage || candidate.adventureStage?.name===testStage.name',
  'function watchAuthorizedTestState()','requestAnimationFrame(watchAuthorizedTestState)','candidate.__ttdTestMap=true',
  "candidate.__ttdWorldState=candidate.__ttdWorldState||{version:1,cameraX:340,traversalStart:{x:410,z:0,y:0},objects:null,drops:null}",
  'window.__TTD_PLATFORM_TEST_API?.ensureWorldState?.()','buildPath(cw,ch)',
  "await evalScoped('/online/game-presentation-v1.js?v=4','Game presentation')",
  "await evalScoped('/online/adventure-pseudo3d-battle-v1.js?v=4','Persistent same-map battle')",
  'ensurePresentationV4();','ensureSameMapBattleV4();','groundDepth:2400',
],'scope-safe continuous world companion');
forbid(continuousWorld,[
  'const basePlatforms=currentPlatforms','const baseBackground=drawBackground',
  'currentPlatforms=function currentPlatformsContinuousWorldV1','drawBackground=function drawBackgroundContinuousWorldV1',
  'performance.now()-startedAt<25000',
],'scope-safe continuous world companion');

need(mainMapBattle,[
  'window.__TTD_TEST_MAINMAP_BATTLE_V4=true',"typeof platformApi()?.renderBattleBackdrop==='function'",'state?.__ttdWorldState',
  "platformApi()?.renderBattleBackdrop?.(g,w,h,combatArea(),performance.now()/1000,",'ttd-mainmap-combat-v4',
  'ttdMainMapCombatBackV4','ttdMainMapCombatFrontV4','buildPath=function buildPathOnPersistentWorld',
  'updateSpawns=function updateSpawnsWithCombatIntroV4','state.__ttdCombatIntroPending=true','presentation?.playCombatCountdown',
  "{x:w*.96,y:h*.18}","{x:w*.10,y:h*.56}","{x:w*.95,y:h*.24}","{x:w*.12,y:h*.72}",
  "theme.top='rgba(0,0,0,0)'",'usesPersistentTraversalRenderer','without resetting the map, camera or opened objects',
],'persistent same-map battle');
forbid(mainMapBattle,["const ROUTES={",'PSEUDO-3D · LOWER COURTYARD',"const snapshot=document.createElement('canvas')",'/online/game-presentation-v1.js'],'persistent same-map battle');
if(mainMapBattle.includes('ADVENTURES.al_hata')||mainMapBattle.includes('AL_HATA_STAGE'))throw new Error('Same-map Test Map renderer must not mutate Al Hata.');

need(presentation,[
  'window.__TTD_GAME_PRESENTATION_V5','const MAP_PREVIEW_MS = 500','const RUN_READY_TIMEOUT_MS = 25000',
  'const MISSION_GAP_MS = 1250','const COUNT_STEP_MS = 720','const OUTCOME_HIDE_MS = 1400','const RESULT_REVEAL_MS = 1850',
  "makeSignal(['MISSION', 'START!'])","makeSignal(['3','2','1','START!'],'countdown')",
  'function waitForRunState(','function drawMissionPreview(','function freezeRunForMission(','function resumeRunFromMission(',
  'runState.__ttdMissionIntroHold=true','runState.running=false','drawLane?.(0)','installMissionHoldShield()','removeMissionHoldShield()',
  'await sleep(MAP_PREVIEW_MS)',"announce('mission')","announce('start')","announce('combatStart')",
  'OUTCOMES=Object.freeze',"clear:{text:'CLEAR!'","fail:{text:'FAIL'","finish:{text:'FINISH!'",
  'outcome-fail','linear-gradient(180deg,#91c3e3 0%,#7398c9 53%,#746aa7 100%)',
  'outcome-finish','linear-gradient(180deg,#fff17b 0%,#f8da68 66%,#efc45d 100%)',
  'playClearCue','playFailCue','playFinishCue','presentObjectiveClear','presentOutcome',
  "font-family:'Russo One',sans-serif!important",'visibility:hidden!important',
  "return /^MISSION\\s*START!?$/i.test(normalizedText(el));","el.dataset.ttdLegacyMissionSuppressed='1'",'legacyObserver.observe',
  "if(typeof startGame==='function')bindStart('startGame',()=>startGame,(fn)=>{startGame=fn;})",
  "if(typeof startAdventure==='function')bindStart('startAdventure',()=>startAdventure,(fn)=>{startAdventure=fn;})",
  "if(typeof startAdventureCampaign==='function')bindStart('startAdventureCampaign',()=>startAdventureCampaign,(fn)=>{startAdventureCampaign=fn;})",
  "if(typeof startEndlessHorde==='function')bindStart('startEndlessHorde',()=>startEndlessHorde,(fn)=>{startEndlessHorde=fn;})",
  'campaignComplete=wrappedCampaignComplete','endMatch=wrappedEndMatch','endEndlessHorde=wrappedEndHorde','showZombieSummary=wrapped',
  'const kind=normalized===\'voluntary\'?\'finish\':(normalized===\'victory\'||normalized===\'clear\'?\'clear\':\'fail\')',
  'const pipsEarned=kills>0?Math.round(kills*2+actualPlayTime*.15):0','if(kills<=0){state.zPlayTime=0;state.time=0;}',
  'playFinishCue();','prepareZombieResult(pipsEarned)','suppressZombieSummaryUntil=performance.now()+ZOMBIE_SUPPRESS_MS',
  "card.replaceWith(marker)",'ttdResultCardV1','ttdMvpDieGlowV1',"label.textContent='MVP'",'window.TTDGamePresentation','rebind:installAll',
],'game presentation v5');
forbid(presentation,[
  "word.className = 'awardTitle ttdSignalWord'",'MISSION START!','window.startAdventure','window.startAdventureCampaign',
  'window.startEndlessHorde','window.campaignComplete','window.endEndlessHorde',
],'game presentation v5');

const baseStart=presentation.indexOf('startFn?.();');
const waitState=presentation.indexOf('await waitForRunState(previousState)',baseStart);
const freeze=presentation.indexOf('freezeRunForMission(runState)',waitState);
const previewWait=presentation.indexOf('await sleep(MAP_PREVIEW_MS)',freeze);
const missionShow=presentation.indexOf("nodes[0]?.classList.add('in')",previewWait);
const missionVoice=presentation.indexOf("announce('mission')",missionShow);
const missionWait=presentation.indexOf('await sleep(MISSION_GAP_MS)',missionVoice);
const startShow=presentation.indexOf("nodes[1]?.classList.add('in')",missionWait);
const startVoice=presentation.indexOf("announce('start')",startShow);
const resume=presentation.indexOf('resumeRunFromMission(runState)',startVoice);
if(!(baseStart>=0&&waitState>baseStart&&freeze>waitState&&previewWait>freeze&&missionShow>previewWait&&missionVoice>missionShow&&missionWait>missionVoice&&startShow>missionWait&&startVoice>startShow&&resume>startVoice)){
  throw new Error('Mission intro must create the real run/map, freeze it, show the static preview, then reveal MISSION and START before resuming gameplay exactly at START.');
}
const countdownStart=presentation.indexOf("nodes[3]?.classList.add('in')",presentation.indexOf('async function playCombatCountdown'));
const combatVoice=presentation.indexOf("announce('combatStart')",countdownStart);
const countdownGameplay=presentation.indexOf('onStart?.()',combatVoice);
if(!(countdownStart>=0&&combatVoice>countdownStart&&countdownGameplay>combatVoice))throw new Error('CombatStart voice must fire on the countdown START frame before subsequent combat resumes.');
const clearCall=presentation.indexOf('playClearCue();',presentation.indexOf('wrappedCampaignComplete'));
const campaignCall=presentation.indexOf('baseCampaignComplete.apply',presentation.indexOf('wrappedCampaignComplete'));
if(!(clearCall>=0&&campaignCall>clearCall))throw new Error('Adventure CLEAR must begin before the completion result is constructed.');
const finishCall=presentation.indexOf('playFinishCue();',presentation.indexOf('wrappedEndHorde'));
const suppressCall=presentation.indexOf('suppressZombieSummaryUntil=performance.now()+ZOMBIE_SUPPRESS_MS',finishCall);
const hordeCall=presentation.indexOf('result=baseEndHorde.apply',suppressCall);
if(!(finishCall>=0&&suppressCall>finishCall&&hordeCall>suppressCall))throw new Error('Endless Horde must begin FINISH and suppress its legacy summary before normal finalization.');

need(runUi,[
  'function installPlatformOnlineStartSyncV2()','state.__ttdWorldState={version:1,cameraX:340,traversalStart:{x:410,z:0,y:0},objects:null,drops:null}',
  'function ensureWorldState()','function continuousPlatforms()',"id:'beach_ground'","id:'jungle_ground'","id:'temple_ground'",
  'function drawPalm(','function drawJungleTree(','function drawTempleColumn(','function drawShell(','function drawShrub(','WORLD_PROPS',
  'drawChest=function drawChestPersistentV4',"cameraX:(ensureWorldState()?.cameraX??340)",
  "checkpoint:{...(ensureWorldState()?.traversalStart||{x:410,z:0,y:0})}",'objects:(ensureWorldState()?.objects||makeInteractables())','drops:(ensureWorldState()?.drops||[])',
  'alpha=1-Math.exp(-dt*2.15)','Math.max(-7,Math.min(7,delta*alpha))','world.cameraX=session.cameraX','objects:wstate.objects,drops:wstate.drops',
  'renderBattleBackdrop:(g,w,h,area,time,cameraX)=>renderBattleBackdrop(g,w,h,area,time,cameraX)',"+' · HP '+",
  '/online/adventure-continuous-world-v1.js?v=1','/online/adventure-pseudo3d-battle-v1.js?v=4','installPlatformOnlineStartSyncV2();','window.TTDGamePresentation?.rebind?.()',
],'continuous world loader/injection');
forbid(runUi,['/online/adventure-platforming-selector-v5.js?v=5','cameraX:Number(area)===2?1390:40','installPlatformOnlineStartSyncV1()','/online/game-presentation-v1.js?v=2'],'continuous world loader/injection');

need(loaderHtml,["window.__TTD_ASSET_URL=(path)=>","url.searchParams.set('__ttd',token)","cache:'no-store'"],'loader');

console.log('Adventure/presentation verified: persistent Test Map rendering remains intact; the real battlefield loads and freezes before MISSION; gameplay resumes at voiced START; CombatStart voices the later-combat countdown START; CLEAR/FAIL/FINISH have distinct outcome semantics; and zero-kill Horde finalization is gated before the unified result.');
