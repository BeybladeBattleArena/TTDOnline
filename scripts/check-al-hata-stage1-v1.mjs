import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const read=(path)=>fs.readFileSync(path,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
const need=(source,markers,label)=>{for(const marker of markers)must(source.includes(marker),`${label} missing: ${marker}`);};

const paths=[
  'online/al-hata-stage1-core-v1.js',
  'online/al-hata-stage1-beach-v1.js',
  'online/al-hata-stage1-jungle-v1.js',
  'online/al-hata-stage1-fork-v1.js',
  'online/al-hata-stage1-temple-v1.js',
  'online/al-hata-stage1-polish-v1.js',
  'online/al-hata-stage1-playtest-v1.js',
];
const [core,beach,jungle,fork,temple,polish,playtest]=paths.map(read);
const combined=[core,beach,jungle,fork,temple,polish,playtest].join('\n\n');
new vm.Script(combined,{filename:'al-hata-stage1-concatenated-runtime.js'});

need(core,[
  'window.__TTD_AL_HATA_STAGE1_RUNTIME_V1=true',
  "const AH_ID='al_hata'",
  'AH_STAGE.waves=16',
  'const AH_AREAS=',
  "1:{id:'landing-shore'",
  "5:{id:'temple-forecourt'",
  'const AH_COMBAT_DRAWERS={}',
  'const AH_SEGMENT_DRAWERS={}',
  'const AH_AFTER_COMBAT={}',
  'updateSpawns=function AH_updateSpawns',
  'window.__TTD_AL_HATA_STAGE1_API=',
],'Al Hata shared runtime');

need(beach,[
  'AH_ROUTES[1]=',
  "{kind:'boat'",
  "id:'beach_push_crate'",
  "id:'beach_sp_chest'",
  "id:'beach_shell'",
  "id:'beach_barrier'",
  'AH_SEGMENT_DRAWERS.beach=',
  'AH_COMBAT_DRAWERS[1]=',
  'AH_AFTER_COMBAT[3]=',
],'Landing Shore');

need(jungle,[
  'AH_ROUTES[2]=',
  'AH_ROUTES[3]=',
  "id:'jungle_thrower_1'",
  "id:'ruin_column_1'",
  'AH_SEGMENT_DRAWERS.jungle=',
  'AH_SEGMENT_DRAWERS.deepJungle=',
  '__ahEntryFraction',
  '__ttdAhEntryKind',
  'AH_COMBAT_DRAWERS[2]=',
  'AH_COMBAT_DRAWERS[3]=',
],'Jungle escalation');

need(fork,[
  'AH_ROUTES[4]=',
  'AH_PINCER_RIGHT_ROUTE',
  "world.routeChoice='platform'",
  "world.routeChoice='pincer'",
  "id:'fork_platform_reward'",
  'AH_SEGMENT_DRAWERS.fork=',
  'AH_SEGMENT_DRAWERS.postFork=',
  'AH_COMBAT_DRAWERS[4]=',
],'Stage 1 route fork');

need(temple,[
  'AH_ROUTES[5]=',
  'AH_SEGMENT_STARTS.templeApproach',
  "id:'temple_secret_statue'",
  "id:'temple_hidden_sp_chest'",
  "id:'temple_combat_column'",
  "id:'temple_combat_statue'",
  'AH_SEGMENT_DRAWERS.templeApproach=',
  'AH_COMBAT_DRAWERS[5]=',
  "AH_finishTraversalToCombat(5,13,'Temple Forecourt')",
],'Temple approach and forecourt');

need(polish,[
  'window.__TTD_AL_HATA_STAGE1_POLISH_V1=true',
  'AH_POLISH_SHELL_SPOTS',
  'ttd:al-hata-shell-claim-request',
  'ttd:al-hata-shell-claim-result',
  'ttd:v6-refresh-request',
  "['BRIDGE AMBUSH','Hold the center']",
  "['TEMPLE FORECOURT','The mountain temple']",
  'AH_OBJECT_ATTACKERS.ah_shell=',
],'Stage 1 refinement layer');

need(playtest,[
  'window.__TTD_AL_HATA_STAGE1_PLAYTEST_V1=true',
  'window.__TTD_AL_HATA_STAGE1_PLAYTEST_V2=true',
  'window.__TTD_AL_HATA_STAGE1_PLAYTEST_V3=true',
  'const AH_PLAYTEST_CENTER_BOARD_INDEX=7',
  "const AH_PLAYTEST_NATIVE_PAUSE_KEY='__ttdAlHataNativePauseV1'",
  'function AH_PLAYTEST_installNativePause',
  'function AH_PLAYTEST_releaseNativePause',
  "AH_SEGMENT_STARTS.landing=",
  "AH_SEGMENT_DRAWERS.landing=AH_drawBeachTraversal",
  'AH_SEGMENT_UPDATERS.landing=AH_PLAYTEST_landingUpdater',
  "if(state.__ttdMissionIntroHold||session.phase!=='play')",
  'runState.board.fill(null)',
  'const boardIndex=AH_PLAYTEST_CENTER_BOARD_INDEX,die=makeDie(randDeckKey())',
  "session={active:true,phase:'summon'",
  "session.phase='ready'",
  "session.phase='play'",
  'runState.__ttdMissionIntroHold=true',
  'AH_PLAYTEST_installNativePause(runState)',
  "for(const type of ['pointerdown','touchstart','click'])",
  'window.addEventListener(type,event=>AH_PLAYTEST_activateNavigatorPrompt(event),{capture:true,passive:false})',
  "button?.addEventListener('pointerdown',event=>AH_PLAYTEST_activateNavigatorPrompt(event,runState),{capture:true,passive:false})",
  'enterPlatformLayout();AH_PLAYTEST_setControllerLocked(true)',
  'ttdAhInMapNavigatorPromptV2',
  'window.TTDGamePresentation?.presentRunStart',
  'window.__TTD_AL_HATA_STAGE1_PLAYTEST_API=',
  'prepareInMapNavigator:AH_PLAYTEST_prepareInMapNavigator',
  "AH_finishTraversalToCombat(1,1,'Landing Shore')",
],'In-map Navigator playtest runtime');
must(playtest.indexOf('const boardIndex=AH_PLAYTEST_CENTER_BOARD_INDEX,die=makeDie(randDeckKey())')<playtest.indexOf('AH_PLAYTEST_beginMissionAfterNavigator(runState);'),'Navigator must be created before prepared MISSION / START is requested');
must(!playtest.includes('runState.__ttdMissionIntroHold=false;runState.running=true'),'Arrival Cove must not resume the native TD loop when MISSION / START releases traversal');

const bridge=read('online/run-ui-bridge-v21.js');
need(bridge,paths.map((path)=>`/${path}?v=1`),'Al Hata loader module order');
must(bridge.indexOf('/online/al-hata-stage1-polish-v1.js?v=1')>bridge.indexOf('/online/al-hata-stage1-temple-v1.js?v=1'),'refinement layer must load after authored regions');
must(bridge.indexOf('/online/al-hata-stage1-playtest-v1.js?v=1')>bridge.indexOf('/online/al-hata-stage1-polish-v1.js?v=1'),'playtest layer must load after the refined authored map');
need(bridge,["const PLAYTEST_ENTRY='/online/al-hata-stage1-playtest-entry-v1.js?v=2'",'window.__TTD_AL_HATA_PLAYTEST_ENTRY_V3','await loadClassicScript(PLAYTEST_ENTRY'], 'cache-safe Al Hata entry loader');

const presentation=read('online/game-presentation-v1.js');
need(presentation,['async function playPreparedMissionStart','presentRunStart:playPreparedMissionStart'],'Prepared MISSION / START presentation contract');

const gameHtml=read('random-dice-game-33.html');
need(gameHtml,[
  '<button>Begin Al Hata</button>',
  'startAdventureCampaign(selectedAdventureId, selectedDifficulty)',
],'Canonical Al Hata campaign launcher');

const entry=read('online/al-hata-stage1-playtest-entry-v1.js');
new vm.Script(entry,{filename:'al-hata-stage1-playtest-entry-v1.js'});
need(entry,[
  'window.__TTD_AL_HATA_PLAYTEST_ENTRY_V1=true',
  'window.__TTD_AL_HATA_PLAYTEST_ENTRY_V2=true',
  'window.__TTD_AL_HATA_PLAYTEST_ENTRY_V3=true',
  "const AH_ID='al_hata'",
  'const missionBase=',
  'function isAlHataStage1Run(runState)',
  "stageName===canonicalName",
  'window.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING=true',
  'runState.running=false',
  'runState.spawnQueue=[]',
  "document.getElementById('ttdMissionHoldShieldV6')?.remove()",
  'window.__TTD_AL_HATA_STAGE1_PLAYTEST_API?.prepareInMapNavigator',
  "const RECOVERY_ID='ttdAhCoveRecoveryV3'",
  'RETRY COVE',
  'END RUN',
  'startAdventureCampaign=wrappedCampaign',
  'wrappedCampaign.__ttdMissionWrappedV6=true',
],'Post-loading Al Hata entry gate');
must(!entry.includes('showNavigatorPrelude'),'Al Hata entry must not show Navigator summon before the loading screen');
must(!entry.includes('drawArrivalPreview'),'Al Hata entry must not use the old pre-loading fake Arrival Cove preview');

{
  const events=[];
  const canonicalStage={name:'Island Landing',id:'al-hata-stage-1'};
  const clonedStage={name:'Island Landing'};
  const reusedState={id:'reused-menu-state'};
  const context={
    console,
    ADVENTURES:{al_hata:{stages:[canonicalStage]}},
    state:reusedState,
    performance:{now:()=>0},
    requestAnimationFrame:()=>0,
    document:{getElementById:(id)=>id==='gameScreen'?{classList:{contains:(name)=>name==='active'}}:null,body:{appendChild:()=>{}}},
    getActiveDeck:()=>[1,2,3,4,5],
    toastGlobal:()=>{},
    showScreen:()=>{},
    startAdventure:function normalStageStart(){events.push('stage-wrapper');},
    startAdventureCampaign:function missionWrappedCampaign(){events.push('mission-wrapper');},
  };
  context.window=context;
  context.TTDGamePresentation={rebind:()=>{}};
  const loadingRunner=()=>{
    events.push('loading-runner');
    Object.assign(reusedState,{adventure:true,adventureStageIdx:0,adventureStage:clonedStage,running:true,spawnQueue:['default-wave'],enemies:[{id:'default-enemy'}],spawnTimer:3,wave:1});
    return 'loaded';
  };
  context.startAdventureCampaign.__ttdMissionBaseV6=loadingRunner;
  context.__TTD_AL_HATA_STAGE1_PLAYTEST_API={prepareInMapNavigator:(candidate)=>{must(candidate===reusedState,'in-map prepare must accept the live campaign state even when the launcher reused the state object');events.push('prepare-map');return true;}};
  vm.createContext(context);
  new vm.Script(entry,{filename:'al-hata-stage1-entry-behavior.js'}).runInContext(context);
  const result=context.startAdventureCampaign('al_hata','normal');
  must(result==='loaded','Al Hata entry must preserve the loading runner result');
  must(events.join('>')==='loading-runner>prepare-map',`Al Hata launch order must be loading then in-map prepare, got ${events.join('>')}`);
  must(reusedState.running===false,'fresh Al Hata state must remain paused before Navigator/MISSION START');
  must(reusedState.__ttdMissionIntroHold===true,'fresh Al Hata state must hold the mission intro before Navigator creation');
  must(reusedState.spawnQueue.length===0&&reusedState.enemies.length===0,'default tower-defense enemies must be removed before Arrival Cove is revealed');
}

const itemClient=read('online/al-hata-world-item-client-v1.js');
const itemServer=read('functions/al-hata-world-items-v1.js');
const clientCheck=spawnSync(process.execPath,['--input-type=module','--check'],{input:itemClient,encoding:'utf8'});
must(clientCheck.status===0,`Al Hata shell client syntax failed: ${clientCheck.stderr||clientCheck.stdout}`);
new vm.Script(itemServer,{filename:'al-hata-world-items-v1.js'});
need(itemClient,['claimAlHataShellV1','ttd:al-hata-shell-claim-request','ttd:al-hata-shell-claim-result'],'shell client authority');
need(itemServer,["const SHELL_ID='al_hata_shell'",'resolveAdventureRun','worldClaims?.alHataStage1Shell','world_item_claim'],'shell server authority');

console.log('Al Hata Stage 1 verified: Begin Al Hata loads first; cloned/reused campaign state is recognized; default TD is hard-held behind Arrival Cove; the in-map free Navigator accepts window-capture touch input; stale mission shields are removed; prepared MISSION / START releases traversal while native TD remains paused until combat.');
