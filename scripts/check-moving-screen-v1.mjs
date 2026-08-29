import fs from 'node:fs';
import vm from 'node:vm';
import * as espree from 'espree';

const enginePath='online/moving-screen-engine-v4.js';
const stagePath='online/moving-screen-neon-rooftops-v2.js';
const loaderPath='online/runtime-bridge-loader-v1.js';
const audioPath='online/audio-client-v27.js';
const engine=fs.readFileSync(enginePath,'utf8');
const stageSource=fs.readFileSync(stagePath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const audio=fs.readFileSync(audioPath,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};

espree.parse(engine,{ecmaVersion:'latest',sourceType:'script'});
espree.parse(stageSource,{ecmaVersion:'latest',sourceType:'script'});
for(const [file,source] of [[enginePath,engine],[stagePath,stageSource]]){
  for(const forbidden of [/\beval\s*\(/,/new\s+Function\b/,/document\.write\s*\(/,/random-dice-game-33\.html/,/\.replace\s*\([^\n]*adventure-platforming/i]){
    must(!forbidden.test(source),`${file} must remain direct committed source without source surgery: ${forbidden}`);
  }
}
must(!/\breturn\d/.test(engine),'Moving Screen v4 may not contain accidental compact return identifiers such as return175.');
must(!engine.includes('movingScreenScreenV3')&&!engine.includes("className='screen'"),'Moving Screen may not create another detached full-screen runtime; it must use gameScreen.');

const context={window:{}};vm.createContext(context);new vm.Script(stageSource,{filename:stagePath}).runInContext(context);
const stage=context.window.TTDMovingScreenStages?.neon_rooftops_v2;
must(stage,'Neon Rooftops v2 stage authority did not register.');
must(stage.tiers?.length===4,'Moving Screen must retain four major visual tiers.');
must(stage.cameraStops?.length>=7,'Moving Screen needs multiple camera pauses across the four tiers.');
must(stage.cameraStops?.[0]===85,'Opening camera stop must preserve reliable phone summon/enemy-spawn room.');
must(stage.zones?.length>=14,'Moving Screen needs enough safe surfaces for meaningful route choice.');
must(stage.zones.some(z=>z.choke&&z.slots<=2),'At least one constrained two-slot choke point is required.');
must(stage.zones.filter(z=>z.summon).length>=4,'Each major tier needs a direct-world summon surface.');
must(stage.objective?.startingLives===10,'Moving Screen must start with 10 lives.');
must(stage.objective?.killGoal===60,'Single-player victory must require 60 credited enemy defeats.');
must(stage.objective?.emptyGraceSeconds===3,'Empty-field grace period must be 3 seconds.');
must(stage.objective?.emptyCountdownSeconds===5,'Empty-field visible countdown must be 5 seconds.');
must(stage.objective?.flag?.homeZone==='roof4_final','The objective flag must begin at the Sign Crown.');
must(stage.destructibles?.some(d=>d.id==='boarded_passage'),'Route-opening destructible missing.');
must(stage.destructibles?.some(d=>d.id==='billboard_brace'),'Route-changing destructible missing.');
must(stage.destructibles?.filter(d=>d.guard).length>=2,'Knockback guard barriers are missing.');

const nodeIds=new Set([...stage.zones,...stage.junctions].map(n=>n.id));
for(const e of stage.edges){must(nodeIds.has(e.from),`Unknown edge source ${e.from}`);must(nodeIds.has(e.to),`Unknown edge destination ${e.to}`);}
function routeExists({broken=new Set(),intact=new Set(stage.destructibles.map(d=>d.id))}={}){const enabled=e=>(!e.requiresBroken||broken.has(e.requiresBroken))&&(!e.requiresIntact||intact.has(e.requiresIntact));const seen=new Set(['roof1_main']),q=['roof1_main'];while(q.length){const u=q.shift();if(u==='roof4_final')return true;for(const e of stage.edges){if(!enabled(e))continue;let v=null;if(e.from===u)v=e.to;else if(e.to===u)v=e.from;if(v&&!seen.has(v)){seen.add(v);q.push(v);}}}return false;}
must(routeExists(),'An intact-state route from the lower rooftop to the Sign Crown is required.');
must(routeExists({broken:new Set(['boarded_passage']),intact:new Set(stage.destructibles.map(d=>d.id))}),'Breaking the scaffold gate must preserve upward progression.');
const postBrace=new Set(stage.destructibles.map(d=>d.id).filter(id=>id!=='billboard_brace'));
must(routeExists({broken:new Set(['billboard_brace']),intact:postBrace}),'Breaking the billboard brace must create a replacement route instead of soft-locking the map.');

for(const marker of [
  'window.__TTD_MOVING_SCREEN_V4 = true',
  "const STAGE_ID='neon_rooftops_v2'",
  'const MOVING_AS_MULT=.85',
  "document.getElementById('gameScreen')",
  "document.getElementById('laneWrap')",
  "document.getElementById('tray')",
  "showCore('game')",
  '#gameScreen.ttd-moving-screen-v4{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:flex!important;flex-direction:column!important;min-height:0!important;max-height:none!important;overflow:hidden!important',
  '#gameScreen.ttd-moving-screen-v4 #hud{order:0;flex:0 0 auto!important',
  '#gameScreen.ttd-moving-screen-v4 #laneWrap{order:1;',
  'flex:1 1 0!important;overflow:hidden!important',
  '#gameScreen.ttd-moving-screen-v4 #tray{order:2;display:block!important;flex:0 0 auto!important',
  '#gameScreen.ttd-moving-screen-v4 #boardWrap{display:none!important;}',
  '#gameScreen.ttd-moving-screen-v4 #tray>*:not(#ttdMsControlsV4){display:none!important;}',
  'env(safe-area-inset-bottom)',
  'ttdMovingScreenCanvasV4',
  'ttdMsControlsV4',
  'ttdMsSummonV4',
  "controls.querySelector('#ttdMsSummonV4').addEventListener('click',summonDie)",
  "result.querySelector('button').addEventListener('click',()=>exit())",
  "showCore('mode')",
  'resizeObserver:null',
  "if(typeof ResizeObserver==='function')",
  'runtime.resizeObserver=new ResizeObserver(()=>resize())',
  'runtime.resizeObserver.observe(runtime.lane)',
  'r.resizeObserver?.disconnect?.()',
  'requestAnimationFrame(resize)',
  'function projectionMetrics()',
  'sy:clamp(H/430,1.05,2.55)',
  'depth=clamp((Number(z)+260)/520,0,1)',
  'persp=.78+depth*.28',
  'baseY+Number(z)*.28*sx-relY*sy-relX*.035*sx',
  'function zoneQuad(',
  'function roundedQuad(',
  "const SAFE_LINE='rgba(255,255,255,.25)'",
  'function drawForeground(',
  'function summonDie()',
  'function mergeDice(',
  'a.awaitingBranch||b.awaitingBranch||!a.zoneId||!b.zoneId',
  'function startSlotMove(',
  'function playerRouteOptions(',
  'function shortestPath(',
  'function chooseAiBranch(',
  'chooseAiBranch(ent);',
  'function pickCombatTarget(',
  'if(ent.moving||ent.airborne||ent.awaitingBranch||!ent.zoneId)return null',
  'filter(h=>!h.moving&&!h.airborne&&!h.awaitingBranch&&!!h.zoneId)',
  'if(!ent.alive||ent.moving||ent.airborne||ent.awaitingBranch||!ent.zoneId)return',
  'function breakDestructible(',
  'function barrierAttackable(',
  '!ent.awaitingBranch&&!!ent.zoneId&&worldDist(ent.world,d)<=ent.range+70',
  'function losBlocked(a,b,ignoreDestructibleId=null)',
  'd.id!==ignoreDestructibleId',
  '!losBlocked(ent.world,d,d.id)',
  'function applyImpulse(',
  'function updateDeathPlanes()',
  "if(p.x<0||p.x>runtime.w||p.y<0||p.y>runtime.h)killEntity(e,'deathPlane',null)",
  "if(runtime.phase!=='transition'&&!edgeSafeAtCamera",
  'transitionMargin(ed,ent.moveSpeed)',
  'function updateEmptyCountdown(',
  'Get some Dice on the map!',
  'const digit=o.emptyCountdownSeconds-Math.floor(elapsed)',
  "finish(false,'You failed to get a Die back onto the battlefield in time.')",
  'function loseLife()',
  'runtime.lives=Math.max(0,runtime.lives-1)',
  "if(runtime.lives<=0)finish(false,'All 10 lives were lost.')",
  'function pickupFlag(',
  'ent.awaitingBranch||!ent.zoneId||!runtime.flag',
  'function dropFlagFromHolder(',
  'function beginFlagRespawn(',
  "runtime.kills=Math.min(runtime.killGoal,runtime.kills+1)",
  "runtime.kills>=runtime.killGoal&&playerHoldsFlag()",
  "p.presentOutcome(win?'clear':'fail'",
  "future.innerHTML='<h3>King of the Hill</h3>",
  'viewport:{w:runtime.w,h:runtime.h}',
])must(engine.includes(marker),`Moving Screen v4 gameplay/runtime contract missing: ${marker}`);

function projectPhone(x,z,y,cameraY=stage.cameraStops[0],W=390,H=650){const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const sx=clamp(W/520,.58,1.05),sy=clamp(H/430,1.05,2.55),baseY=H*.72,depth=clamp((z+260)/520,0,1),persp=.78+depth*.28,relX=x-stage.cameraX,relY=y-cameraY;return{x:W*.50+relX*sx*persp,y:baseY+z*.28*sx-relY*sy-relX*.035*sx};}
const lower=stage.zones.find(z=>z.id==='roof1_main'),second=stage.zones.find(z=>z.id==='roof2_west'),third=stage.zones.find(z=>z.id==='roof3_main'),final=stage.zones.find(z=>z.id==='roof4_final');
const P1=projectPhone(lower.x,lower.z,lower.y),P2=projectPhone(second.x,second.z,second.y),P3=projectPhone(third.x,third.z,third.y),PF=projectPhone(final.x,final.z,final.y);
must(P1.y>650*.48&&P1.y<650*.90,'Phone framing must put the current lower rooftop in the playable lower half.');
must(P1.y<650*.70,'Opening Tier-1 enemy-spawn surface must fit above the conservative spawn cutoff on a phone viewport.');
must(P2.y>-80&&P2.y<650*.30,'The next major rooftop should only peek near the upper boundary at the first camera stop.');
must(P3.y<-150&&PF.y<-500,'A phone viewport must not expose the third/final tiers at the opening camera stop.');

const stageUrl="'/online/moving-screen-neon-rooftops-v2.js?v=2'";
const engineUrl="'/online/moving-screen-engine-v4.js?v=6'";
must(loader.includes(stageUrl)&&loader.includes(engineUrl),'Runtime loader must load the v2 stage and rebuilt v4 engine using the full-viewport cache key.');
must(loader.indexOf(stageUrl)<loader.indexOf(engineUrl),'Stage authority must load before Moving Screen v4.');
must(!loader.includes('/online/moving-screen-engine-v4.js?v=5'),'Moving Screen full-viewport hotfix may not reuse the previous cached v5 query key.');
must(!loader.includes('/online/moving-screen-engine-v4.js?v=4'),'Moving Screen hotfix may not reuse the cached broken v4 query key.');
must(!loader.includes('/online/moving-screen-engine-v3.js?v=3'),'Broken detached-screen v3 runtime must not load in production.');
must(!/moving-screen[^\n]*(eval|replace|document\.write)/i.test(loader),'Runtime loader may not patch or eval Moving Screen source.');
must(audio.includes("'gameScreen'"),'The parent audio router must continue treating gameScreen as a silent gameplay route.');

console.log('Moving Screen v4 verified: full-viewport gameScreen ownership, native flex layout, live-resizing battlefield canvas, fresh cache key, phone-safe controls/framing, Adventure-style pseudo-3D, direct summoning, safe-surface-only combat/actions, crossroads AI, targetable LOS barriers, graph combat, destructibles, death planes, 10-life stock, emergency countdown, 60-KO plus flag victory, and return-to-Arcade cleanup are guarded.');