import fs from 'node:fs';
import vm from 'node:vm';
import * as espree from 'espree';

const enginePath='online/moving-screen-engine-v1.js';
const stagePath='online/moving-screen-neon-rooftops-v1.js';
const loaderPath='online/runtime-bridge-loader-v1.js';
const specPath='docs/moving-screen-v1-spec.md';
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
const stage=context.window.TTDMovingScreenStages?.neon_rooftops_v1;
must(stage,'Neon Rooftops stage authority did not register.');
must(stage.tiers?.length===4,'Moving Screen test map must have exactly four major visual tiers.');
must(stage.cameraStops?.length>=7,'Moving Screen test map needs multiple camera pauses across four tiers.');
must(stage.zones?.length>=14,'Moving Screen test map needs enough safe surfaces to create meaningful routing.');
must(stage.zones.some(z=>z.choke&&z.slots<=2),'Moving Screen test map needs constrained choke-point safe surfaces.');
must(stage.zones.filter(z=>z.summon).length>=4,'Each major tier should provide at least one large summon surface.');
must(stage.destructibles?.some(d=>d.id==='boarded_passage'),'Route-opening destructible missing.');
must(stage.destructibles?.some(d=>d.id==='billboard_brace'),'Route-changing destructible missing.');
must(stage.destructibles?.filter(d=>d.guard).length>=2,'Displacement guard destructibles missing.');
must(stage.signs?.length>=4&&stage.lamps?.length>=5,'Neon Rooftops presentation needs dedicated signs and rooftop lamps.');
must(stage.enemyArchetypes?.goblin_brute?.launch>0,'Enemy displacement test archetype missing.');
must(stage.encounters?.at(-1)?.finalWave>=8,'Final rooftop encounter is not configured.');

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
must(routeExists(),'There must be a valid intact-state route from the lower roof to the Sign Crown.');
must(routeExists({broken:new Set(['boarded_passage']),intact:new Set(stage.destructibles.map(d=>d.id))}),'Breaking the scaffold gate must preserve a complete route.');
const intactAfterBillboardBreak=new Set(stage.destructibles.map(d=>d.id).filter(id=>id!=='billboard_brace'));
must(routeExists({broken:new Set(['billboard_brace']),intact:intactAfterBillboardBreak}),'Breaking the billboard brace must replace, not destroy, upward progression.');

for(const marker of [
  "window.__TTD_MOVING_SCREEN_V1 = true",
  "const STAGE_ID = 'neon_rooftops_v1'",
  'const MOVING_AS_MULT = 0.85',
  'function startSlotMove(',
  'function bestArrivalSpot(',
  'function desiredCombatSpot(',
  'function playerRouteOptions(',
  'function chooseAiBranch(',
  'function shortestPath(',
  'function breakDestructible(',
  'function guardForZone(',
  'function applyImpulse(',
  'function hasLineOfSight(',
  'function updateDeathPlanes()',
  "if(p.x<0||p.x>runtime.w||p.y<0||p.y>runtime.h)killEntity",
  "if(sameZone(a,b))return distance<=a.range&&hasLineOfSight(a,b)",
  "if(runtime.phase==='transition')return false",
  "runtime.phase!=='transition'&&!edgeSafeAtCamera",
  "runtime.phase==='transition'&&!enemyTransitionAccepts",
  'function edgeTransitionMargin(',
  'function drawSafeOverlay(',
  'function drawConnectors(',
  'function drawSigns(',
  'function drawLamps(',
  "const SAFE_LINE = 'rgba(255,255,255,.25)'",
  "moving.innerHTML='<h3>Moving Screen</h3>",
  "future.innerHTML='<h3>King of the Hill</h3>",
  'function summonDie()',
  'function mergeDice(',
  'function beginFinale(',
])must(engine.includes(marker),`Moving Screen gameplay/presentation contract missing: ${marker}`);

const stageUrl="'/online/moving-screen-neon-rooftops-v1.js?v=1'";
const engineUrl="'/online/moving-screen-engine-v1.js?v=1'";
must(loader.includes(stageUrl),'Runtime loader does not load Moving Screen stage data as committed source.');
must(loader.includes(engineUrl),'Runtime loader does not load Moving Screen engine as committed source.');
must(loader.indexOf(stageUrl)<loader.indexOf(engineUrl),'Moving Screen stage data must load before its engine.');
must(!/moving-screen[^\n]*(eval|replace|document\.write)/i.test(loader),'Runtime loader may not patch or eval Moving Screen source.');

for(const phrase of [
  'Moving Screen is an Arcade Mode',
  'Moving Screen does not use the normal 15-tile dice tray',
  'approximately 25%-opacity white line',
  'A die reaching a crossroads must receive a manual player branch choice',
  'During camera movement, attack speed is reduced by 15%',
  'Every camera border is an unconditional death plane',
  'Top, bottom, left and right borders are lethal',
  'The player must not be allowed to issue an obviously suicidal route',
  'Player route choice is not protected by the stationary-camera safety gate',
  'Enemy AI understands barrier state',
  'Knockback can push an entity out of its safe surface',
  'King of the Hill',
])must(spec.includes(phrase),`Moving Screen written design contract missing: ${phrase}`);

console.log('Moving Screen v1 test-state contract verified: direct committed stage+engine authorities, four-tier rooftop geometry, safe spots, tactical spacing, bidirectional branching, stationary/transition risk rules, death planes, AI/destructibles, displacement guards, finale progression, and neon rooftop presentation are guarded.');
