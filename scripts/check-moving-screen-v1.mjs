import fs from 'node:fs';
import vm from 'node:vm';
import * as espree from 'espree';

const enginePath='online/moving-screen-engine-v4.js';
const stagePath='online/moving-screen-neon-rooftops-v2.js';
const uiPath='online/moving-screen-ui-v1.js';
const topologyPath='online/moving-screen-topology-ui-v1.js';
const loaderPath='online/runtime-bridge-loader-v1.js';
const audioPath='online/audio-client-v27.js';
const engine=fs.readFileSync(enginePath,'utf8');
const stageSource=fs.readFileSync(stagePath,'utf8');
const ui=fs.readFileSync(uiPath,'utf8');
const topology=fs.readFileSync(topologyPath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const audio=fs.readFileSync(audioPath,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};

for(const [file,source] of [[enginePath,engine],[stagePath,stageSource],[uiPath,ui],[topologyPath,topology]]){
  espree.parse(source,{ecmaVersion:'latest',sourceType:'script'});
  for(const forbidden of [/\beval\s*\(/,/new\s+Function\b/,/document\.write\s*\(/,/random-dice-game-33\.html/,/\.replace\s*\([^\n]*adventure-platforming/i])must(!forbidden.test(source),`${file} must remain direct committed source without source surgery: ${forbidden}`);
}
must(!/\breturn\d/.test(engine),'Moving Screen v4 may not contain accidental compact return identifiers such as return175.');
must(!engine.includes('movingScreenScreenV3')&&!engine.includes("className='screen'"),'Moving Screen may not create another detached full-screen runtime; it must use gameScreen.');

const context={window:{}};vm.createContext(context);new vm.Script(stageSource,{filename:stagePath}).runInContext(context);
const stage=context.window.TTDMovingScreenStages?.neon_rooftops_v2;
must(stage,'Neon Rooftops v2 stage authority did not register.');
must(stage.tiers?.length===4,'Moving Screen must retain four major visual tiers.');
must(stage.cameraStops?.length>=7,'Neon Rooftops needs multiple camera pauses across its four tiers.');
must(stage.cameraStops?.[0]===85,'Opening Neon camera stop must preserve reliable phone summon/enemy-spawn room.');
must(Math.abs(Number(stage.timing?.travel)-16)<0.001,'Moving Screen camera transition must retain the ~70% slower 16-second travel time.');
must(stage.zones?.length>=20,'Neon Rooftops retains its expanded set of standable combat-safe surfaces until its later map-specific redesign.');
for(const id of ['roof1_ac_step','roof1_doorhouse','crane_beam_low','roof2_ac_step','crate_landing','steel_beam_mid','roof3_doorhouse'])must(stage.zones.some(z=>z.id===id),`Neon physical standable traversal surface missing: ${id}`);
must(!stage.zones.some(z=>z.tier===1&&z.choke),'Neon Tier 1 should teach traversal without a hard choke surface.');
must(stage.zones.some(z=>z.tier>=3&&z.choke&&z.slots<=3),'Later Neon tiers need a meaningful constrained choke point.');
must(stage.zones.filter(z=>z.summon).length>=4,'Each major Neon tier needs a direct-world summon surface.');
must(stage.objective?.startingLives===10,'Moving Screen must start with 10 lives.');
must(stage.objective?.killGoal===30,'Single-player victory must require 30 credited enemy defeats.');
must(stage.objective?.emptyGraceSeconds===3,'Empty-field grace period must be 3 seconds.');
must(stage.objective?.emptyCountdownSeconds===5,'Empty-field visible countdown must be 5 seconds.');
must(stage.objective?.flag?.homeZone==='roof4_final','Neon objective flag must begin at the Sign Crown.');
for(const id of ['boarded_passage','billboard_blocker','crate_stack_blocker','old_fire_escape','billboard_brace'])must(stage.destructibles?.some(d=>d.id===id),`Neon topology destructible missing: ${id}`);
must(stage.destructibles?.filter(d=>d.guard).length>=5,'Multiple raised Neon ledges/rails must protect against ordinary knockback.');

const caps=stage.encounters.map(e=>Number(e.cap));
must(caps[0]<=2&&caps[1]<=2,'Novice opening stops may have at most two enemies alive.');
must(Math.max(...caps)<=5,'Moving Screen must cap total concurrent enemies at five or fewer.');
must(stage.encounters.every(e=>Number(e.spawnEvery)>=3.8),'Enemy spawn cadence must remain deliberately slower than the original pressure curve.');

const nodeIds=new Set([...stage.zones,...stage.junctions].map(n=>n.id));
for(const e of stage.edges){must(nodeIds.has(e.from),`Unknown edge source ${e.from}`);must(nodeIds.has(e.to),`Unknown edge destination ${e.to}`);}

function routeExists({broken=new Set(),intact=new Set(stage.destructibles.map(d=>d.id))}={}){const enabled=e=>(!e.requiresBroken||broken.has(e.requiresBroken))&&(!e.requiresIntact||intact.has(e.requiresIntact));const seen=new Set(['roof1_main']),q=['roof1_main'];while(q.length){const u=q.shift();if(u==='roof4_final')return true;for(const e of stage.edges){if(!enabled(e))continue;let v=null;if(e.from===u)v=e.to;else if(e.to===u)v=e.from;if(v&&!seen.has(v)){seen.add(v);q.push(v);}}}return false;}
must(routeExists(),'An intact-state route from the lower rooftop to the Sign Crown is required.');
const noOldEscape=new Set(stage.destructibles.map(d=>d.id).filter(id=>id!=='old_fire_escape'));
must(routeExists({intact:noOldEscape}),'Collapsing the optional old fire escape must never soft-lock the Neon climb.');

// Shared Moving Screen safety/navigation rules. These apply to every map.
for(const marker of [
  'function verticalVisible(','function summonMargin()','function summonSpotSafe(','function safeSummonSpots(',
  "if(m.kind==='edge')return m.to===zoneId&&m.toSlot===i",'toSlot=bestArrivalSpot(ent,dest,fs)','function recoverMovementArrival(',
  "if(ent.faction==='player')runtime.selectedId=ent.id",'function updateDeathPlanes()',"if(p.y<0||p.y>runtime.h)killEntity(e,'deathPlane',null)",
  "toast('MOVE! Top and bottom are lethal.')",'m=Math.min(m,p.y,runtime.h-p.y)',"if(p.y<margin||p.y>runtime.h-margin)return false",
])must(engine.includes(marker),`Shared Moving Screen path/safety contract missing: ${marker}`);
for(const forbidden of [
  'p.x<0||p.x>runtime.w||p.y<0||p.y>runtime.h',
  'p.x<margin||p.x>runtime.w-margin||p.y<margin||p.y>runtime.h-margin',
  'm=Math.min(m,p.x,runtime.w-p.x,p.y,runtime.h-p.y)',
  "toast('MOVE! Every screen edge is lethal.')",
  'const left=g.createLinearGradient(0,0,sz,0)',
  'const right=g.createLinearGradient(runtime.w,0,runtime.w-sz,0)',
])must(!engine.includes(forbidden),`Horizontal viewport boundaries must not remain Moving Screen death/safety planes: ${forbidden}`);
must(engine.includes('safeSummonSpots(z)')&&engine.includes('placeAtZone(ent,z.id,chosen.i)'),'Player summons must choose and occupy only individually validated safe spots.');
must(engine.includes("runtime.phase!=='transition'||summonSpotSafe(s.p,predictedCameraY(.9))"),'Transition summons must survive a short projected camera look-ahead.');
must(engine.includes("if(runtime.stage.theme==='construction'){drawConstructionBackground(g);return;}"),'Construction maps must use the daylight construction background rather than Neon scenery.');
must(engine.includes("function drawForeground(g){if(runtime.stage.theme==='construction')return;"),'Construction must suppress Neon foreground/sign remnants.');

// Shared combat parity. Dice use their canonical catalog range/class cooldown and pip-speed rule,
// while Moving Screen adapts TD cadence for self-defense and prevents ordinary taps from becoming launches.
for(const marker of [
  'const PLAYER_ATTACK_INTERVAL_MULT=.68','const ENEMY_ATTACK_INTERVAL_MULT=1.30','const PLAYER_KNOCKBACK_MULT=.70','const PLAYER_LAUNCH_MULT=.85',
  'function rangeFor(def){const r=def?.range||def?.special?.range','function dieBaseAttackInterval(def,cls)',
  'def?.special?.classCooldownSteps||[]','function combatAttackInterval(ent)',
  "interval=interval/Math.max(1,ent.dot||1)*PLAYER_ATTACK_INTERVAL_MULT",'interval*=ENEMY_ATTACK_INTERVAL_MULT',
  'ent.attackT=combatAttackInterval(ent)','damageEntity(target,Math.max(1,ent.damage),ent)',
  'function groundShove(target,source,knockback)',"if(rawLaunch<=0&&rawKb<20)",
  "rawKb*(target.faction==='player'?PLAYER_KNOCKBACK_MULT:1)","rawLaunch*(target.faction==='player'?PLAYER_LAUNCH_MULT:1)",
])must(engine.includes(marker),`Shared Moving Screen combat/defense contract missing: ${marker}`);
for(const forbidden of [
  'const r=def?.special?.range;',
  'attackInterval:Math.max(.18,def.atk||1)',
  'ent.attackT=ent.attackInterval/(runtime.phase',
  'damageEntity(target,Math.max(1,ent.damage*(ent.dot||1)),ent)',
  'Math.max(80,launch)',
])must(!engine.includes(forbidden),`Retired Moving Screen combat bug remains: ${forbidden}`);
// Basic numerical sanity: a merged Die must attack faster, but ordinary enemy cadence must still be nonzero and bounded.
const baseFire=3.6*0.68,fire2=baseFire/2,goblin=1.02*1.30,dog=.78*1.30;
must(fire2<goblin,'A representative 2-pip Dice attack should be at least competitive with a basic Goblin after cadence correction.');
must(baseFire>dog&&dog>.8,'One-pip Dice should still benefit from summoning/merging strategy; enemy cadence must not be trivialized.');

for(const marker of [
  'window.__TTD_MOVING_SCREEN_V4 = true',"const STAGE_ID='neon_rooftops_v2'",'const MOVING_AS_MULT=.85',"document.getElementById('gameScreen')","showCore('game')",'ttdMovingScreenCanvasV4','ttdMsControlsV4','ttdMsSummonV4',
  'function projectionMetrics()','function zoneQuad(',"const SAFE_LINE='rgba(255,255,255,.25)'",'function summonDie()','function mergeDice(','function playerRouteOptions(','function shortestPath(','function chooseAiBranch(','function pickCombatTarget(',
  'if(ent.moving||ent.airborne||ent.awaitingBranch||!ent.zoneId)return null','function breakDestructible(','function applyImpulse(',"if(runtime.lives<=0)finish(false,'All 10 lives were lost.')",'function pickupFlag(',"runtime.kills=Math.min(runtime.killGoal,runtime.kills+1)","runtime.kills>=runtime.killGoal&&playerHoldsFlag()",'viewport:{w:runtime.w,h:runtime.h}',
])must(engine.includes(marker),`Moving Screen v4 gameplay/runtime contract missing: ${marker}`);

for(const marker of [
  'window.__TTD_MOVING_SCREEN_UI_V1 = true','#gameScreen.ttd-moving-screen-v4{top:0!important;bottom:max(18px,env(safe-area-inset-bottom))!important;height:auto!important;}','bottom:max(26px,env(safe-area-inset-bottom))!important','ttdMsLoadoutRailV1','normalizeDeck()','normalizeOdPair()','ttdMsDirectionPromptV1',"phase.seconds <= 5",'ttdMsPathHighlightV1','routeDestinationNodes()','inferSource(destinations)','g.setLineDash([13, 8])','drawChevron(g, A, B, .54)',
])must(ui.includes(marker),`Moving Screen UI polish contract missing: ${marker}`);

for(const marker of [
  'window.__TTD_MOVING_SCREEN_TOPOLOGY_UI_V1 = true','ttdMsTopologyCanvasV1','function drawConnector(','function drawTopology(','rgba(116,76,45,.74)','e.kind===\'fire_escape\'','e.kind===\'stairs\'','e.kind===\'scaffold\'','rgba(4,7,15,.23)','function nearestRoute(','function onPointerDown(','hit.score>30','function onPointerMove(','function onPointerUp(','dot>.12','g.hit.button.click()','addEventListener(\'pointerdown\',onPointerDown,true)','const goal=s.objective?.killGoal||30','KOs, one rooftop flag.',
])must(topology.includes(marker),`Moving Screen physical-topology/gesture contract missing: ${marker}`);

function projectPhone(x,z,y,cameraY=stage.cameraStops[0],W=390,H=650){const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const sx=clamp(W/520,.58,1.05),sy=clamp(H/430,1.05,2.55),baseY=H*.72,depth=clamp((z+260)/520,0,1),persp=.78+depth*.28,relX=x-stage.cameraX,relY=y-cameraY;return{x:W*.50+relX*sx*persp,y:baseY+z*.28*sx-relY*sy-relX*.035*sx};}
const lower=stage.zones.find(z=>z.id==='roof1_main'),second=stage.zones.find(z=>z.id==='roof2_west'),third=stage.zones.find(z=>z.id==='roof3_main'),final=stage.zones.find(z=>z.id==='roof4_final');
const P1=projectPhone(lower.x,lower.z,lower.y),P2=projectPhone(second.x,second.z,second.y),P3=projectPhone(third.x,third.z,third.y),PF=projectPhone(final.x,final.z,final.y);
must(P1.y>650*.48&&P1.y<650*.90,'Phone framing must put the current lower rooftop in the playable lower half.');
must(P1.y<650*.70,'Opening Tier-1 enemy-spawn surface must fit above the conservative spawn cutoff on a phone viewport.');
must(P2.y>-80&&P2.y<650*.30,'The next major rooftop should only peek near the upper boundary at the first camera stop.');
must(P3.y<-150&&PF.y<-500,'A phone viewport must not expose the third/final Neon tiers at the opening camera stop.');

const stageUrl="'/online/moving-screen-neon-rooftops-v2.js?v=4'",constructionUrl="'/online/moving-screen-construction-climb-v1.js?v=2'",engineUrl="'/online/moving-screen-engine-v4.js?v=8'",routerUrl="'/online/moving-screen-map-router-v1.js?v=2'",uiUrl="'/online/moving-screen-ui-v1.js?v=1'",topologyUrl="'/online/moving-screen-topology-ui-v1.js?v=1'",constructionPresentationUrl="'/online/moving-screen-construction-presentation-v1.js?v=2'";
for(const url of [stageUrl,constructionUrl,engineUrl,routerUrl,uiUrl,topologyUrl,constructionPresentationUrl])must(loader.includes(url),`Runtime loader missing Moving Screen authority: ${url}`);
must(loader.indexOf(stageUrl)<loader.indexOf(constructionUrl)&&loader.indexOf(constructionUrl)<loader.indexOf(engineUrl)&&loader.indexOf(engineUrl)<loader.indexOf(routerUrl)&&loader.indexOf(routerUrl)<loader.indexOf(uiUrl)&&loader.indexOf(uiUrl)<loader.indexOf(topologyUrl)&&loader.indexOf(topologyUrl)<loader.indexOf(constructionPresentationUrl),'Moving Screen load order must remain stages -> engine -> router -> route UI -> topology UI -> map presentation.');
for(const stale of ['/online/moving-screen-engine-v4.js?v=6','/online/moving-screen-engine-v4.js?v=7','/online/moving-screen-construction-climb-v1.js?v=1','/online/moving-screen-map-router-v1.js?v=1','/online/moving-screen-construction-presentation-v1.js?v=1'])must(!loader.includes(stale),`Moving Screen combat/safety release may not reuse stale cache key: ${stale}`);
must(!loader.includes('/online/moving-screen-engine-v3.js?v=3'),'Broken detached-screen v3 runtime must not load in production.');
must(!/moving-screen[^\n]*(eval|replace|document\.write)/i.test(loader),'Runtime loader may not patch or eval Moving Screen source.');
must(audio.includes("'gameScreen'"),'The parent audio router must continue treating gameScreen as a silent gameplay route.');

console.log('Moving Screen verified: canonical Dice cadence/ranges, grounded ordinary knockback, player launch resistance, top/bottom-only death planes, safe summoning/navigation, and existing objective contracts.');