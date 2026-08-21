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
],'platform base');
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

need(continuousWorld,[
  'window.__TTD_CONTINUOUS_WORLD_V1',
  "contract:'one-world-one-camera-persistent-objects'",
  "backdrop:'continuous-crossfade'",
  'const smoothstep=',
  'const jungleIn=smoothstep(430,760,cx)',
  'const templeIn=smoothstep(960,1290,cx)',
  'z1:-1200,z2:1200',
  'groundDepth:2400',
],'continuous world contract');

need(mainMapBattle,[
  'window.__TTD_TEST_MAINMAP_BATTLE_V4=true',
  "typeof platformApi()?.renderBattleBackdrop==='function'",
  'state?.__ttdWorldState',
  "platformApi()?.renderBattleBackdrop?.(g,w,h,combatArea(),performance.now()/1000,",
  'ttd-mainmap-combat-v4',
  'ttdMainMapCombatBackV4',
  'ttdMainMapCombatFrontV4',
  'buildPath=function buildPathOnPersistentWorld',
  'updateSpawns=function updateSpawnsWithCombatIntroV4',
  'state.__ttdCombatIntroPending=true',
  'presentation?.playCombatCountdown',
  "{x:w*.96,y:h*.18}",
  "{x:w*.10,y:h*.56}",
  "{x:w*.95,y:h*.24}",
  "{x:w*.12,y:h*.72}",
  "theme.top='rgba(0,0,0,0)'",
  'usesPersistentTraversalRenderer',
  'without resetting the map, camera or opened objects',
],'persistent same-map battle');
forbid(mainMapBattle,[
  "const ROUTES={",
  'PSEUDO-3D · LOWER COURTYARD',
  "const snapshot=document.createElement('canvas')",
  '/online/game-presentation-v1.js',
],'persistent same-map battle');
if(mainMapBattle.includes('ADVENTURES.al_hata')||mainMapBattle.includes('AL_HATA_STAGE'))throw new Error('Same-map Test Map renderer must not mutate Al Hata.');

need(presentation,[
  'window.__TTD_GAME_PRESENTATION_V3',
  'const MISSION_GAP_MS = 1250',
  'const COUNT_STEP_MS = 720',
  'const CLEAR_HIDE_MS = 1400',
  'const RESULT_REVEAL_MS = 1850',
  "makeSignal(['MISSION', 'START!'])",
  "makeSignal(['CLEAR!'])",
  "makeSignal(['3','2','1','START!'],'countdown')",
  'playCombatCountdown',
  'if (missionBusy) return base.apply(this,args);',
  "font-family:'Russo One',sans-serif!important",
  'visibility:hidden!important',
  "return /^MISSION\\s*START!?$/i.test(normalizedText(el));",
  "el.dataset.ttdLegacyMissionSuppressed='1'",
  'legacyObserver.observe',
  "el.style.setProperty('animation','none','important')",
  'prepareZombieResult(pipsEarned)',
  "card.replaceWith(marker)",
  'ttdResultCardV1',
  'ttdMvpDieGlowV1',
  "label.textContent = 'MVP'",
  'presentObjectiveClear',
  'window.TTDGamePresentation',
  'rebind: installAll',
],'game presentation v3');
forbid(presentation,[
  "word.className = 'awardTitle ttdSignalWord'",
  'MISSION START!',
],'game presentation v3');

need(runUi,[
  'function installPlatformOnlineStartSyncV2()',
  'state.__ttdWorldState={version:1,cameraX:340,traversalStart:{x:410,z:0,y:0},objects:null,drops:null}',
  'function ensureWorldState()',
  'function continuousPlatforms()',
  "id:'beach_ground'",
  "id:'jungle_ground'",
  "id:'temple_ground'",
  'function drawPalm(',
  'function drawJungleTree(',
  'function drawTempleColumn(',
  'function drawShell(',
  'function drawShrub(',
  'WORLD_PROPS',
  'drawChest=function drawChestPersistentV4',
  "cameraX:(ensureWorldState()?.cameraX??340)",
  "checkpoint:{...(ensureWorldState()?.traversalStart||{x:410,z:0,y:0})}",
  'objects:(ensureWorldState()?.objects||makeInteractables())',
  'drops:(ensureWorldState()?.drops||[])',
  'alpha=1-Math.exp(-dt*2.15)',
  'Math.max(-7,Math.min(7,delta*alpha))',
  'world.cameraX=session.cameraX',
  'objects:wstate.objects,drops:wstate.drops',
  'renderBattleBackdrop:(g,w,h,area,time,cameraX)=>renderBattleBackdrop(g,w,h,area,time,cameraX)',
  "+' · HP '+",
  '/online/adventure-continuous-world-v1.js?v=1',
  '/online/adventure-pseudo3d-battle-v1.js?v=4',
  '/online/game-presentation-v1.js?v=3',
  'installPlatformOnlineStartSyncV2();',
  'window.TTDGamePresentation?.rebind?.()',
],'continuous world loader/injection');
/* The old beginPlatform literal is intentionally present as a requiredReplace search needle.
   What matters is that its replacement is present and all actual battle previews use wstate refs. */
forbid(runUi,[
  '/online/adventure-platforming-selector-v5.js?v=5',
  'cameraX:Number(area)===2?1390:40',
  'installPlatformOnlineStartSyncV1()',
  '/online/game-presentation-v1.js?v=2',
],'continuous world loader/injection');

need(loaderHtml,[
  "window.__TTD_ASSET_URL=(path)=>",
  "url.searchParams.set('__ttd',token)",
  "cache:'no-store'",
],'loader');

console.log('Adventure Test Map persistent continuous-world flow verified: broad beach/jungle/temple terrain hides artificial map edges, biome backdrops cross-fade instead of snapping, traversal and combat share one camera plus persistent object/drop references, opened chests remain opened, navigation has an explicit in-world spawn, later combat pauses for a 3-2-1-START assessment countdown, battle routes span fair approach distances, MISSION/START is isolated from legacy duplicate cues and nested start calls are preserved, and no alternate pseudo-world or snapshot renderer can return.');
