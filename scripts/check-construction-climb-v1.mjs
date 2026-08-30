import fs from 'node:fs';
import vm from 'node:vm';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const stageSource=fs.readFileSync('online/moving-screen-construction-climb-v1.js','utf8');
const router=fs.readFileSync('online/moving-screen-map-router-v1.js','utf8');
const presentation=fs.readFileSync('online/moving-screen-construction-presentation-v1.js','utf8');
const shell=fs.readFileSync('online/arcade-mode-shell-v2.js','utf8');
const loader=fs.readFileSync('online/runtime-bridge-loader-v1.js','utf8');

new vm.Script(stageSource,{filename:'online/moving-screen-construction-climb-v1.js'});
new vm.Script(router,{filename:'online/moving-screen-map-router-v1.js'});
new vm.Script(presentation,{filename:'online/moving-screen-construction-presentation-v1.js'});
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(stageSource,sandbox);
const stage=sandbox.window.TTDMovingScreenStages?.construction_climb;
must(stage,'Construction Climb stage did not register.');
must(stage.id==='construction_climb'&&stage.name==='Construction Climb','Construction Climb identity regressed.');
must(stage.direction==='up'&&stage.theme==='construction','Construction Climb direction/theme regressed.');
must(stage.objective?.startingLives===10&&stage.objective?.killGoal===30,'Construction Climb must use 10 lives / 30 KOs.');
must(stage.objective?.flag?.homeZone==='top_floor','Construction Climb flag must live on the exposed top floor.');
must(stage.objective?.flag?.label==='Top Floor','Construction Climb objective copy must describe the physical Top Floor, not the retired crane crown.');
must(Array.isArray(stage.cameraStops)&&stage.cameraStops.length===6,'Demolition-style Construction Climb should use six readable camera bands.');
must(Array.isArray(stage.tiers)&&stage.tiers.length===4,'Construction Climb must retain four major vertical tiers.');
must(stage.zones.length>=9&&stage.zones.length<=14,'Construction Climb should stay intentionally simple: 9-14 physical surfaces.');
must(stage.edges.length>=9&&stage.edges.length<=16,'Construction Climb should stay intentionally simple: 9-16 physical connections.');
must(stage.junctions.length===0,'Construction Climb must not reintroduce abstract crossroads; route choices belong on physical surfaces.');
must(stage.zones.every(z=>Number(z.slots)>=1),'Every Construction Climb zone must be standable.');

for(const id of ['yard_main','container_roof','ground_ramp','lower_frame','diagonal_plank','fenced_platform','mid_floor','hanging_platform','upper_ramp','upper_floor','plywood_step','top_floor'])must(stage.zones.some(z=>z.id===id),`Demolition physical surface missing: ${id}`);
must(stage.zones.some(z=>z.id==='yard_main'&&z.summon&&z.enemySpawn),'Open Work Yard must be the opening summon/combat surface.');
must(stage.zones.some(z=>z.id==='fenced_platform'&&z.material==='yellow_platform'),'Distinctive yellow fenced work platform is missing.');
must(stage.zones.some(z=>z.id==='top_floor'&&z.final&&z.material==='concrete'),'Exposed Top Floor final slab is missing.');
for(const material of ['construction_ground','container','concrete','wood','yellow_platform'])must(stage.zones.some(z=>z.material===material),`Demolition construction material missing: ${material}`);

must(stage.destructibles.length===0,'Construction Climb should not turn Demolition geometry into route-gating destructible puzzles.');
must(stage.edges.every(e=>!e.requiresBroken&&!e.requiresIntact),'Construction Climb physical routes must not depend on hidden destructible graph state.');
must(stage.encounters[0].cap<=2&&stage.encounters[1].cap<=2&&Math.max(...stage.encounters.map(e=>e.cap))<=5,'Construction enemy pressure must remain novice-friendly.');
must(stage.encounters.every(e=>Number(e.spawnEvery)>=4),'Construction enemy cadence should leave room to read the physical climb.');

const pal=stage.palette||{};
for(const [key,value] of Object.entries({skyTop:'#4f9fd5',skyBottom:'#d4efff',concrete:'#b9bbb6',steel:'#7e432d',wood:'#a66f47',yellow:'#d0a13b',tarp:'#202327',container:'#6e8793'}))must(pal[key]===value,`Demolition palette value regressed: ${key}`);
const kinds=new Set((stage.constructionDecor||[]).map(d=>d.kind));
for(const kind of ['siteContainer','logs','cautionSign','steelFrame','arrowSign','safetyFence','tarpFence','hangingPlatform','rebar','boxStack','greenCrate','barrels','plywoodStack'])must(kinds.has(kind),`Demolition prop language missing: ${kind}`);
must(!kinds.has('craneTower')&&!kinds.has('craneBoom'),'Retired invented crane geometry must not remain on Construction Climb.');
must(!(stage.signs||[]).some(s=>/neon|nite|luna|arcade|die/i.test(`${s.id||''} ${s.text||''}`)),'Neon Rooftops signage must not leak into Construction Climb.');

const nodeIds=new Set(stage.zones.map(z=>z.id));
for(const e of stage.edges){must(nodeIds.has(e.from)&&nodeIds.has(e.to),`Construction edge ${e.id} references an unknown physical surface.`);}
function reachable(start='yard_main',goal='top_floor'){
  const seen=new Set([start]),queue=[start];
  while(queue.length){const id=queue.shift();if(id===goal)return true;for(const e of stage.edges){const next=e.from===id?e.to:e.to===id?e.from:null;if(next&&!seen.has(next)){seen.add(next);queue.push(next);}}}
  return false;
}
must(reachable(),'Construction Climb needs a continuous physical route from the open yard to the top slab.');
must(stage.edges.filter(e=>e.from==='yard_main'||e.to==='yard_main').length===2,'Opening yard should present exactly two visually legible ascent choices.');
must(stage.edges.filter(e=>e.from==='mid_floor'||e.to==='mid_floor').length===3,'Middle floor should present the ordinary climb plus one hanging-platform alternative and the route back down.');

for(const forbidden of [/\beval\s*\(/,/new\s+Function\b/,/document\.write\s*\(/,/\.replace\s*\([^\n]*moving-screen/i]){
  must(!forbidden.test(router),`Moving Screen map router must stay source-direct: ${forbidden}`);
  must(!forbidden.test(presentation),`Construction presentation must stay source-direct: ${forbidden}`);
}
for(const marker of ["const ENGINE_SLOT='neon_rooftops_v2'",'registry[ENGINE_SLOT]=next','window.TTDMovingScreen=Object.freeze','get stageId()','get stage()',"flag?.label||''"])must(router.includes(marker),`Map router contract missing: ${marker}`);
for(const marker of ['constructionDecor','siteContainer','logs','steelFrame','safetyFence','tarpFence','hangingPlatform','ttdMsConstructionCanvasV1'])must(presentation.includes(marker),`Construction presentation contract missing: ${marker}`);
must(!/craneTower|craneBoom/.test(presentation),'Construction presentation must not redraw the retired invented crane.');
must(shell.includes("key:'construction_climb'")&&shell.includes("window.TTDMovingScreen.start(mapKey)"),'Arcade shell must launch the selected Moving Screen map.');
for(const marker of ['/online/moving-screen-construction-climb-v1.js?v=2','/online/moving-screen-map-router-v2.js?v=2','/online/moving-screen-construction-presentation-v1.js?v=2'])must(loader.includes(marker),`Construction rework runtime file missing from loader: ${marker}`);

console.log(`Construction Climb verified: ${stage.zones.length} physical surfaces, ${stage.edges.length} readable connections, zero abstract junctions, Demolition palette/props, no crane/neon leakage, and a continuous yard-to-top-floor climb.`);
