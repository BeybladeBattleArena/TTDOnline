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
must(stage.cameraStops?.length>=7,'Moving Screen needs multiple camera pauses across the four tiers.');
must(stage.cameraStops?.[0]===85,'Opening camera stop must preserve reliable phone summon/enemy-spawn room.');
must(Math.abs(Number(stage.timing?.travel)-16)<0.001,'Moving Screen camera transition must retain the ~70% slower 16-second travel time.');
must(stage.zones?.length>=20,'Expanded Moving Screen needs at least 20 standable combat-safe surfaces.');
for(const id of ['roof1_ac_step','roof1_doorhouse','crane_beam_low','roof2_ac_step','crate_landing','steel_beam_mid','roof3_doorhouse'])must(stage.zones.some(z=>z.id===id),`Physical standable traversal surface missing: ${id}`);
must(!stage.zones.some(z=>z.tier===1&&z.choke),'Tier 1 should teach traversal without a hard choke surface.');
must(stage.zones.some(z=>z.tier>=3&&z.choke&&z.slots<=3),'Later tiers need a meaningful constrained choke point.');
must(stage.zones.filter(z=>z.summon).length>=4,'Each major tier needs a direct-world summon surface.');
must(stage.objective?.startingLives===10,'Moving Screen must start with 10 lives.');
must(stage.objective?.killGoal===30,'Single-player victory must require 30 credited enemy defeats.');
must(stage.objective?.emptyGraceSeconds===3,'Empty-field grace period must be 3 seconds.');
must(stage.objective?.emptyCountdownSeconds===5,'Empty-field visible countdown must be 5 seconds.');
must(stage.objective?.flag?.homeZone==='roof4_final','The objective flag must begin at the Sign Crown.');
for(const id of ['boarded_passage','billboard_blocker','crate_stack_blocker','old_fire_escape','billboard_brace'])must(stage.destructibles?.some(d=>d.id===id),`Topology destructible missing: ${id}`);
must(stage.destructibles?.filter(d=>d.guard).length>=5,'Multiple raised rooftop ledges/rails must protect against ordinary knockback.');

const caps=stage.encounters.map(e=>Number(e.cap));
must(caps[0]<=2&&caps[1]<=2,'Novice opening stops may have at most two enemies alive.');
must(Math.max(...caps)<=5,'Moving Screen must cap total concurrent enemies at five or fewer.');
must(stage.encounters.every(e=>Number(e.spawnEvery)>=3.8),'Enemy spawn cadence must remain deliberately slower than the original pressure curve.');

const nodeIds=new Set([...stage.zones,...stage.junctions].map(n=>n.id));
for(const e of stage.edges){must(nodeIds.has(e.from),`Unknown edge source ${e.from}`);must(nodeIds.has(e.to),`Unknown edge destination ${e.to}`);}
for(const id of ['e21','e22','e23','e24','e25','e26','e27','e28','e29'])must(stage.edges.some(e=>e.id===id),`Expanded alternate route edge missing: ${id}`);
must(stage.edges.filter(e=>e.from==='roof1_main'||e.to==='roof1_main').length>=2,'Opening rooftop needs multiple independent ways to begin climbing.');
must(stage.edges.filter(e=>e.requiresBroken==='billboard_blocker').length>=2,'Breaking the rooftop billboard must open at least two routes.');
must(stage.edges.some(e=>e.requiresIntact==='old_fire_escape'),'Rust-eaten fire escape must be able to collapse and remove its route.');

function routeExists({broken=new Set(),intact=new Set(stage.destructibles.map(d=>d.id))}={}){const enabled=e=>(!e.requiresBroken||broken.has(e.requiresBroken))&&(!e.requiresIntact||intact.has(e.requiresIntact));const seen=new Set(['roof1_main']),q=['roof1_main'];while(q.length){const u=q.shift();if(u==='roof4_final')return true;for(const e of stage.edges){if(!enabled(e))continue;let v=null;if(e.from===u)v=e.to;else if(e.to===u)v=e.from;if(v&&!seen.has(v)){seen.add(v);q.push(v);}}}return false;}
must(routeExists(),'An intact-state route from the lower rooftop to the Sign Crown is required.');
const noOldEscape=new Set(stage.destructibles.map(d=>d.id).filter(id=>id!=='old_fire_escape'));
must(routeExists({intact:noOldEscape}),'Collapsing the optional old fire escape must never soft-lock the climb.');
must(routeExists({broken:new Set(['boarded_passage','billboard_blocker','crate_stack_blocker']),intact:new Set(stage.destructibles.map(d=>d.id))}),'Opening optional barriers must preserve full upward progression.');
const postBrace=new Set(stage.destructibles.map(d=>d.id).filter(id=>id!=='billboard_brace'));
must(routeExists({broken:new Set(['billboard_brace']),intact:postBrace}),'Breaking the billboard brace must create a replacement route instead of soft-locking the map.');

for(const marker of [
  'window.__TTD_MOVING_SCREEN_V4 = true',"const STAGE_ID='neon_rooftops_v2'",'const MOVING_AS_MULT=.85',"document.getElementById('gameScreen')","showCore('game')",'ttdMovingScreenCanvasV4','ttdMsControlsV4','ttdMsSummonV4',
  'function projectionMetrics()','function zoneQuad(',"const SAFE_LINE='rgba(255,255,255,.25)'",'function summonDie()','function mergeDice(','function playerRouteOptions(','function shortestPath(','function chooseAiBranch(','function pickCombatTarget(',
  'if(ent.moving||ent.airborne||ent.awaitingBranch||!ent.zoneId)return null','function breakDestructible(','function applyImpulse(','function updateDeathPlanes()',"if(runtime.lives<=0)finish(false,'All 10 lives were lost.')",'function pickupFlag(',"runtime.kills=Math.min(runtime.killGoal,runtime.kills+1)","runtime.kills>=runtime.killGoal&&playerHoldsFlag()",'viewport:{w:runtime.w,h:runtime.h}',
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
must(P3.y<-150&&PF.y<-500,'A phone viewport must not expose the third/final tiers at the opening camera stop.');

const stageUrl="'/online/moving-screen-neon-rooftops-v2.js?v=4'",engineUrl="'/online/moving-screen-engine-v4.js?v=6'",uiUrl="'/online/moving-screen-ui-v1.js?v=1'",topologyUrl="'/online/moving-screen-topology-ui-v1.js?v=1'";
for(const url of [stageUrl,engineUrl,uiUrl,topologyUrl])must(loader.includes(url),`Runtime loader missing Moving Screen authority: ${url}`);
must(loader.indexOf(stageUrl)<loader.indexOf(engineUrl)&&loader.indexOf(engineUrl)<loader.indexOf(uiUrl)&&loader.indexOf(uiUrl)<loader.indexOf(topologyUrl),'Moving Screen load order must be stage -> engine -> route UI -> topology/gesture UI.');
for(const stale of ['/online/moving-screen-neon-rooftops-v2.js?v=2','/online/moving-screen-neon-rooftops-v2.js?v=3'])must(!loader.includes(stale),`Moving Screen topology release may not reuse stale stage key: ${stale}`);
must(!loader.includes('/online/moving-screen-engine-v3.js?v=3'),'Broken detached-screen v3 runtime must not load in production.');
must(!/moving-screen[^\n]*(eval|replace|document\.write)/i.test(loader),'Runtime loader may not patch or eval Moving Screen source.');
must(audio.includes("'gameScreen'"),'The parent audio router must continue treating gameScreen as a silent gameplay route.');

console.log('Moving Screen verified: 30-KO novice pressure, <=5 enemies, 21+ standable combat surfaces, alternate physical climb routes, destructible topology, raised ledges, route-line de-emphasis, route tap/swipe input, existing loadout/chevron polish, and core v4 objectives remain guarded.');
