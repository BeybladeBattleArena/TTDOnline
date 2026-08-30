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
must(stage.objective?.flag?.homeZone==='crane_crown','Construction Climb flag must live at the crane crown.');
must(Array.isArray(stage.cameraStops)&&stage.cameraStops.length>=7,'Construction Climb needs a full multi-stop climb.');
must(Array.isArray(stage.tiers)&&stage.tiers.length===4,'Construction Climb must retain four major vertical tiers.');
must(stage.zones.length>=20,'Construction Climb needs at least 20 standable combat surfaces.');
must(stage.zones.every(z=>Number(z.slots)>=1),'Every Construction Climb zone must be standable.');
must(stage.zones.some(z=>z.id==='yard_main'&&z.summon&&z.enemySpawn),'Ground Work Yard must be the opening summon/combat surface.');
must(stage.zones.some(z=>z.id==='beam_crossing'&&z.material==='metal'),'Suspended crane-beam footing is missing.');
must(stage.zones.some(z=>z.id==='crane_crown'&&z.final),'Crane Crown final surface is missing.');
for(const material of ['concrete','wood','scaffold','metal'])must(stage.zones.some(z=>z.material===material),`Construction material missing: ${material}`);
for(const id of ['rotten_temp_stair','plywood_partition','lumber_barricade','upper_plywood_wall'])must(stage.destructibles.some(d=>d.id===id),`Construction destructible missing: ${id}`);
must(stage.destructibles.filter(d=>d.guard).length>=4,'Construction Climb needs raised rails/slab lips for ordinary knockback protection.');
must(stage.encounters[0].cap<=2&&Math.max(...stage.encounters.map(e=>e.cap))<=5,'Construction enemy pressure must remain novice-friendly.');
must((stage.constructionDecor||[]).some(d=>d.kind==='craneTower')&&(stage.constructionDecor||[]).some(d=>d.kind==='craneBoom'),'Crane presentation geometry is missing.');
must((stage.constructionDecor||[]).filter(d=>d.kind==='rebar').length>=3,'Rebar landmarks are missing.');

const nodeIds=new Set([...stage.zones.map(z=>z.id),...stage.junctions.map(j=>j.id)]);
for(const e of stage.edges){must(nodeIds.has(e.from)&&nodeIds.has(e.to),`Construction edge ${e.id} references an unknown node.`);}
function reachable(brokenIds=new Set()){
  const enabled=e=>(!e.requiresBroken||brokenIds.has(e.requiresBroken))&&(!e.requiresIntact||!brokenIds.has(e.requiresIntact));
  const seen=new Set(['yard_main']),queue=['yard_main'];
  while(queue.length){const id=queue.shift();for(const e of stage.edges){if(!enabled(e))continue;const next=e.from===id?e.to:e.to===id?e.from:null;if(next&&!seen.has(next)){seen.add(next);queue.push(next);}}}
  return seen.has('crane_crown');
}
must(reachable(),'Construction Climb crown must be reachable with all optional structures intact.');
must(reachable(new Set(['rotten_temp_stair'])),'Collapsing the rotten stair must not soft-lock the climb.');
must(reachable(new Set(['plywood_partition'])),'Breaking the plywood partition must leave a valid crown route.');
must(reachable(new Set(['rotten_temp_stair','plywood_partition','lumber_barricade','upper_plywood_wall'])),'Combined topology changes must still leave a valid crown route.');

const yardEdges=stage.edges.filter(e=>e.from==='yard_main'||e.to==='yard_main');
must(yardEdges.length>=2,'The opening yard needs multiple immediate traversal choices.');
const upperFeeds=stage.edges.filter(e=>['upper_slab_west','upper_slab_east'].includes(e.from)&&e.to==='crane_hook_deck'||['upper_slab_west','upper_slab_east'].includes(e.to)&&e.from==='crane_hook_deck');
must(upperFeeds.length>=2,'Both upper slabs must feed the late crane-deck choke.');

for(const forbidden of [/\beval\s*\(/,/new\s+Function\b/,/document\.write\s*\(/,/\.replace\s*\([^\n]*moving-screen/i]){
  must(!forbidden.test(router),`Moving Screen map router must stay source-direct: ${forbidden}`);
  must(!forbidden.test(presentation),`Construction presentation must stay source-direct: ${forbidden}`);
}
for(const marker of ["const ENGINE_SLOT='neon_rooftops_v2'",'registry[ENGINE_SLOT]=next','window.TTDMovingScreen=Object.freeze','get stageId()','get stage()'])must(router.includes(marker),`Map router contract missing: ${marker}`);
for(const marker of ['constructionDecor','craneTower','craneBoom','safetyFence','ttdMsConstructionCanvasV1'])must(presentation.includes(marker),`Construction presentation contract missing: ${marker}`);
must(shell.includes("key:'construction_climb'")&&shell.includes("window.TTDMovingScreen.start(mapKey)"),'Arcade shell must launch the selected Moving Screen map.');
for(const marker of ['/online/moving-screen-construction-climb-v1.js?v=1','/online/moving-screen-map-router-v1.js?v=1','/online/moving-screen-construction-presentation-v1.js?v=1'])must(loader.includes(marker),`Construction runtime file missing from loader: ${marker}`);

console.log(`Construction Climb verified: ${stage.zones.length} standable surfaces, ${stage.edges.length} routes, ${stage.destructibles.length} destructibles, novice enemy caps, alternate climbs, crane presentation, and topology-safe destruction.`);
