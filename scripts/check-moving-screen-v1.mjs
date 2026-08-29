import fs from 'node:fs';
import vm from 'node:vm';
import * as espree from 'espree';

const enginePath='online/moving-screen-engine-v2.js';
const stagePath='online/moving-screen-neon-rooftops-v2.js';
const loaderPath='online/runtime-bridge-loader-v1.js';
const specPath='docs/moving-screen-v2-playtest.md';
const engine=fs.readFileSync(enginePath,'utf8');
const stageSource=fs.readFileSync(stagePath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const spec=fs.readFileSync(specPath,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};

espree.parse(engine,{ecmaVersion:'latest',sourceType:'script'});
espree.parse(stageSource,{ecmaVersion:'latest',sourceType:'script'});

for(const [file,source] of [[enginePath,engine],[stagePath,stageSource]]){
  for(const forbidden of [/\beval\s*\(/,/new\s+Function\b/,/document\.write\s*\(/,/random-dice-game-33\.html/,/\.replace\s*\([^\n]*adventure-platforming/i,/#tray\b/,/#board\b/]){
    must(!forbidden.test(source),`${file} must remain direct committed source with no tray/core source-patching dependency: ${forbidden}`);
  }
}

const context={window:{}};
vm.createContext(context);
new vm.Script(stageSource,{filename:stagePath}).runInContext(context);
const stage=context.window.TTDMovingScreenStages?.neon_rooftops_v2;
must(stage,'Neon Rooftops v2 stage authority did not register.');
must(stage.tiers?.length===4,'Moving Screen playtest map must retain four major visual tiers.');
must(stage.cameraStops?.length>=7,'Moving Screen playtest map needs multiple camera pauses across four tiers.');
must(stage.zones?.length>=14,'Moving Screen playtest map needs enough safe surfaces for meaningful routing.');
must(stage.zones.some(z=>z.choke&&z.slots<=2),'Moving Screen needs constrained choke-point safe surfaces.');
must(stage.zones.filter(z=>z.summon).length>=4,'Each major tier should provide a summon surface.');
must(stage.objective?.startingLives===10,'Moving Screen must start with exactly 10 lives.');
must(stage.objective?.killGoal===60,'Single-player Moving Screen victory must require 60 credited enemy defeats.');
must(stage.objective?.emptyGraceSeconds===3,'Empty-field warning grace period must be 3 seconds.');
must(stage.objective?.emptyCountdownSeconds===5,'Empty-field visible countdown must be five seconds/digits.');
must(stage.objective?.flag?.homeZone==='roof4_final','Objective flag must begin on the final Sign Crown safe surface.');
must(stage.destructibles?.some(d=>d.id==='boarded_passage'),'Route-opening destructible missing.');
must(stage.destructibles?.some(d=>d.id==='billboard_brace'),'Route-changing destructible missing.');
must(stage.destructibles?.filter(d=>d.guard).length>=2,'Displacement guard destructibles missing.');
must(stage.signs?.length>=4&&stage.lamps?.length>=5,'Neon Rooftops presentation needs dedicated signs and rooftop lamps.');
must(stage.enemyArchetypes?.goblin_brute?.launch>0,'Enemy displacement test archetype missing.');

const nodeIds=new Set([...stage.zones,...stage.junctions].map(n=>n.id));
for(const edge of stage.edges){
  must(nodeIds.has(edge.from),`Unknown edge source ${edge.from} for ${edge.id}.`);
  must(nodeIds.has(edge.to),`Unknown edge destination ${edge.to} for ${edge.id}.`);
}
function routeExists({broken=new Set(),intact=new Set(stage.destructibles.map(d=>d.id))}={}){
  const enabled=edge=>{
    if(edge.requiresBroken&&!broken.has(edge.requiresBroken))return false;
    if(edge.requiresIntact&&!intact.has(edge.requiresIntact))return false;
    return true;
  };
  const seen=new Set(['roof1_main']),queue=['roof1_main'];
  while(queue.length){const u=queue.shift();if(u==='roof4_final')return true;for(const e of stage.edges){if(!enabled(e))continue;let v=null;if(e.from===u)v=e.to;else if(e.to===u)v=e.from;if(v&&!seen.has(v)){seen.add(v);queue.push(v);}}}
  return false;
}
must(routeExists(),'There must be an intact-state route from Lower Rooftop to Sign Crown.');
must(routeExists({broken:new Set(['boarded_passage']),intact:new Set(stage.destructibles.map(d=>d.id))}),'Breaking the scaffold gate must preserve progression.');
const intactAfterBillboardBreak=new Set(stage.destructibles.map(d=>d.id).filter(id=>id!=='billboard_brace'));
must(routeExists({broken:new Set(['billboard_brace']),intact:intactAfterBillboardBreak}),'Breaking the billboard brace must replace rather than destroy upward progression.');

for(const marker of [
  'window.__TTD_MOVING_SCREEN_V2 = true',
  "const STAGE_ID='neon_rooftops_v2'",
  'const MOVING_AS_MULT=.85',
  'function summonDie()',
  'function mergeDice(',
  'function startSlotMove(',
  'function playerRouteOptions(',
  'function chooseAiBranch(',
  'function shortestPath(',
  'function breakDestructible(',
  'function guardForZone(',
  'function applyImpulse(',
  'function hasLineOfSight(',
  'function updateDeathPlanes()',
  "if(p.x<0||p.x>runtime.w||p.y<0||p.y>runtime.h)killEntity(e,'deathPlane',null)",
  "if(runtime.phase!=='transition'&&!edgeSafeAtCamera",
  "ent.faction==='enemy'&&runtime.phase==='transition'&&!enemyTransitionAccepts",
  'function updateEmptyCountdown(',
  "Get some Dice on the map!",
  'const digit=o.emptyCountdownSeconds-Math.floor(elapsed)',
  "finish(false,'You failed to get a Die back onto the battlefield in time.')",
  'function loseLife()',
  'runtime.lives=Math.max(0,runtime.lives-1)',
  "if(runtime.lives<=0)finish(false,'All 10 lives were lost.')",
  'function pickupFlag(',
  'function dropFlagFromHolder(',
  'function beginFlagRespawn()',
  'function updateFlag(',
  "if(runtime.kills>=runtime.killGoal&&playerHoldsFlag())finish(true",
  "runtime.kills++",
  "creditFaction==='player'||(e.lastHitFaction==='player'&&e.lastHitT<=3)",
  "p?.presentOutcome",
  "p.presentOutcome(win?'clear':'fail'",
  'function drawFlag(',
  'function drawSafeOverlay(',
  "const SAFE_LINE='rgba(255,255,255,.25)'",
  "moving.innerHTML='<h3>Moving Screen</h3>",
  "future.innerHTML='<h3>King of the Hill</h3>",
  "deck:activeDeck().map(e=>({...e}))",
])must(engine.includes(marker),`Moving Screen v2 gameplay/presentation contract missing: ${marker}`);

const stageUrl="'/online/moving-screen-neon-rooftops-v2.js?v=2'";
const engineUrl="'/online/moving-screen-engine-v2.js?v=2'";
must(loader.includes(stageUrl),'Runtime loader does not load Moving Screen v2 stage as committed source.');
must(loader.includes(engineUrl),'Runtime loader does not load Moving Screen v2 engine as committed source.');
must(loader.indexOf(stageUrl)<loader.indexOf(engineUrl),'Moving Screen v2 stage data must load before its engine.');
must(!loader.includes("'/online/moving-screen-engine-v1.js?v=1'"),'Retired Moving Screen v1 engine must not load alongside v2.');
must(!/moving-screen[^\n]*(eval|replace|document\.write)/i.test(loader),'Runtime loader may not patch or eval Moving Screen source.');

for(const phrase of [
  '10 lives',
  'exactly **1 life**',
  '**3-second grace period**',
  '**5, 4, 3, 2, 1**',
  'normal FAIL presentation',
  '**60 enemy defeats**',
  'physically carrying the objective flag',
  'Enemy AI understands the flag objective',
  'flag becomes loose',
  'returns to its final-area home position',
  'Merging a flag-carrying Die',
  'No normal 15-tile dice tray',
  '15% attack-speed penalty',
  'King of the Hill',
])must(spec.includes(phrase),`Moving Screen v2 written contract missing: ${phrase}`);

console.log('Moving Screen v2 playtest contract verified: 10-life stock, 3+5 empty-field fail countdown, 60-defeat plus physical flag victory, flag AI/drop/respawn/merge behavior, direct world summoning, graph routing, death planes, destructibles, displacement and normal outcome presentation are guarded.');
