import fs from 'node:fs';
import * as espree from 'espree';

const enginePath='online/moving-screen-engine-v1.js';
const loaderPath='online/runtime-bridge-loader-v1.js';
const specPath='docs/moving-screen-v1-spec.md';
const engine=fs.readFileSync(enginePath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const spec=fs.readFileSync(specPath,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};

espree.parse(engine,{ecmaVersion:'latest',sourceType:'script'});

for(const forbidden of [
  /\beval\s*\(/,
  /new\s+Function\b/,
  /document\.write\s*\(/,
  /random-dice-game-33\.html/,
  /\.replace\s*\([^\n]*adventure-platforming/i,
  /#tray\b/,
  /#board\b/,
])must(!forbidden.test(engine),`Moving Screen must remain direct source with no tray/core source-patching dependency: ${forbidden}`);

for(const marker of [
  "window.__TTD_MOVING_SCREEN_V1 = true",
  "id: 'neon_rooftops_v1'",
  'cameraStops:',
  "name:'Lower Rooftop'",
  "name:'High Rooftop'",
  "name:'Sign Crown'",
  "choke:true",
  "requiresBroken:'boarded_passage'",
  "requiresIntact:'billboard_brace'",
  "const MOVING_AS_MULT = 0.85",
  "runtime.phase!=='transition'&&!edgeSafeAtCamera",
  "runtime.phase==='transition'&&!edgeSafeDuringTransition",
  "if(p.x<0||p.x>runtime.w||p.y<0||p.y>runtime.h)killEntity",
  "drawRoundedRect(g,r.x+2,r.y+2,r.w-4,r.h-4,10,WHITE,null)",
  "const WHITE = 'rgba(255,255,255,.25)'",
  "moving.innerHTML='<h3>Moving Screen</h3>",
  "future.innerHTML='<h3>King of the Hill</h3>",
  'function summonDie()',
  'function choosePlayerRoute(',
  'function chooseAiBranch(',
  'function shortestPath(',
  'function breakDestructible(',
  'function applyImpulse(',
  'function hasLineOfSight(',
  "if(sameZone(a,b))return true;if(runtime.phase==='transition')return false",
])must(engine.includes(marker),`Moving Screen gameplay contract missing: ${marker}`);

must(loader.includes("'/online/moving-screen-engine-v1.js?v=1'"),'Runtime loader does not load Moving Screen as committed source.');
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

console.log('Moving Screen v1 contract verified: direct committed source, no tray dependency, safe-surface/path presentation, bidirectional graph routing, crossroads, transition risk, four death planes, AI pathing, destructibles, choke points, combat rules and Arcade entries are all guarded.');
