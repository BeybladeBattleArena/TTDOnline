import fs from 'node:fs';
import vm from 'node:vm';
import * as espree from 'espree';

const enginePath='online/moving-screen-engine-v5.js';
const stagePath='online/moving-screen-neon-rooftops-v2.js';
const uiPath='online/moving-screen-ui-v1.js';
const dieInputPath='online/moving-screen-die-input-v1.js';
const topologyPath='online/moving-screen-topology-ui-v1.js';
const routerPath='online/moving-screen-map-router-v2.js';
const battleHudPath='online/moving-screen-battle-hud-v1.js';
const mobileFramePath='online/moving-screen-mobile-frame-v2.js';
const runControlsPath='online/singleplayer-run-controls-v1.js';
const loaderPath='online/runtime-bridge-loader-v1.js';
const audioPath='online/audio-client-v27.js';
const engine=fs.readFileSync(enginePath,'utf8');
const stageSource=fs.readFileSync(stagePath,'utf8');
const ui=fs.readFileSync(uiPath,'utf8');
const dieInput=fs.readFileSync(dieInputPath,'utf8');
const topology=fs.readFileSync(topologyPath,'utf8');
const router=fs.readFileSync(routerPath,'utf8');
const battleHud=fs.readFileSync(battleHudPath,'utf8');
const mobileFrame=fs.readFileSync(mobileFramePath,'utf8');
const runControls=fs.readFileSync(runControlsPath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');
const audio=fs.readFileSync(audioPath,'utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};

for(const [file,source] of [[enginePath,engine],[stagePath,stageSource],[uiPath,ui],[dieInputPath,dieInput],[topologyPath,topology],[routerPath,router],[battleHudPath,battleHud],[mobileFramePath,mobileFrame],[runControlsPath,runControls]]){
  espree.parse(source,{ecmaVersion:'latest',sourceType:'script'});
  for(const forbidden of [/\beval\s*\(/,/new\s+Function\b/,/document\.write\s*\(/,/random-dice-game-33\.html/,/\.replace\s*\([^\n]*adventure-platforming/i])must(!forbidden.test(source),`${file} must remain direct committed source without source surgery: ${forbidden}`);
}
must(!/\breturn\d/.test(engine),'Moving Screen v5 may not contain accidental compact return identifiers such as return175.');
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

for(const marker of [
  'const PLAYER_ATTACK_INTERVAL_MULT=.68','const ENEMY_ATTACK_INTERVAL_MULT=1.30','const PLAYER_KNOCKBACK_MULT=.70','const PLAYER_LAUNCH_MULT=.85',
  'function rangeFor(def){const r=def?.range||def?.special?.range','function dieBaseAttackInterval(def,cls)','def?.special?.classCooldownSteps||[]','function combatAttackInterval(ent)',
  "interval=interval/Math.max(1,ent.dot||1)*PLAYER_ATTACK_INTERVAL_MULT",'interval*=ENEMY_ATTACK_INTERVAL_MULT','ent.attackT=combatAttackInterval(ent)',
  'function groundShove(target,source,knockback)',"if(rawLaunch<=0&&rawKb<20)","PLAYER_KNOCKBACK_MULT:1)","PLAYER_LAUNCH_MULT:1)",
])must(engine.includes(marker),`Shared Moving Screen combat/defense contract missing: ${marker}`);
for(const forbidden of ['const r=def?.special?.range;','attackInterval:Math.max(.18,def.atk||1)','ent.attackT=ent.attackInterval/(runtime.phase','Math.max(80,launch)'])must(!engine.includes(forbidden),`Retired Moving Screen combat bug remains: ${forbidden}`);
const baseFire=3.6*.68,fire2=baseFire/2,goblin=1.02*1.30,dog=.78*1.30;
must(fire2<goblin,'A representative 2-pip Die attack should be at least competitive with a basic Goblin after cadence correction.');
must(baseFire>dog&&dog>.8,'One-pip Dice should still benefit from summoning/merging strategy; enemy cadence must not be trivialized.');

for(const marker of [
  'window.__TTD_MOVING_SCREEN_V5 = true','const VERSION=5','const PU_FALLBACK=[15,30,55,95]','const DIE_HIT_RADIUS=42','const MERGE_DROP_RADIUS=52',
  'pu:0','function powerUpDie(ent)','runtime.sp-=cost','ent.pu=(ent.pu||0)+1','1+(ent.pu||0)*.16','powerSelected()',
  'function canMergeDice(a,b)',"a.key==='joker'&&b.key!=='joker'","ak==='mimic'||bk==='mimic'",'function randomDeckEntry()','newDot=Math.min(7,a.dot+1)','result.pu=0',
  'function beginDieGestureClient(','function moveDieGestureClient(','function endDieGestureClient(','if(g.wasSelected)powerUpDie(ent)','MERGE_DROP_RADIUS',
])must(engine.includes(marker),`Moving Screen tap/power/merge contract missing: ${marker}`);
must(!engine.includes("a.faction!=='player'||b.faction!=='player'||a.key!==b.key||a.dot!==b.dot"),'Retired same-key-only Moving Screen merge authority must not return.');
const pickupLine=engine.split('\n').find(line=>line.includes('function pickupFlag(ent)'))||'';
must(pickupLine.includes("(ent.faction==='player'&&ent.type!=='die')")&&pickupLine.includes("ent.faction!=='player'&&ent.faction!=='enemy'"),'Moving Screen flag pickup must allow enemies while restricting player carriers to Dice.');

for(const marker of [
  'od:{drive:0','passiveDrivePerSecond','dieDamageDrivePerDamage','towerLifeDrivePerLife','function activateOverdriveSlot(index)',
  "key==='moonwolfsummon'","key==='gaiacrash'","key==='embracedryad'","key==='meteorimpact'",'runtime.od.dp=Math.max(0,runtime.od.dp-spend.cost)','runtime.od.drive=0',
  "type:'odAlly'",'function castGaia(def)','function castDryad(def)','function castMeteor(def)','function updateOverdrive(dt)',
])must(engine.includes(marker),`Moving Screen Overdrive contract missing: ${marker}`);

for(const marker of ['window.__TTD_MOVING_SCREEN_DIE_INPUT_V1=true','hitTestDieClient','beginDieGestureClient','stopImmediatePropagation','setPointerCapture','pointermove','pointerup'])must(dieInput.includes(marker),`Die-first pointer authority missing: ${marker}`);
for(const marker of ['window.__TTD_MOVING_SCREEN_UI_V1 = true','ttdMsDirectionPromptV1','ttdMsPathHighlightV1','routeDestinationNodes()','inferSource(destinations)','g.setLineDash([13, 8])','drawChevron(g, A, B, .54)'])must(ui.includes(marker),`Moving Screen route/direction UI contract missing: ${marker}`);
for(const marker of ['window.__TTD_MOVING_SCREEN_TOPOLOGY_UI_V1 = true','ttdMsTopologyCanvasV1','function drawConnector(','function drawTopology(','function nearestRoute(','function onPointerDown(','function onPointerUp(','dot>.12','g.hit.button.click()'])must(topology.includes(marker),`Moving Screen physical-topology/route gesture contract missing: ${marker}`);

for(const marker of ['window.__TTD_MOVING_SCREEN_MAP_ROUTER_V2=true',"const LOADING_ID='ttdMsLoadingV2'",'const LOADING_MIN_MS=720',"const LOADING_ASSET='/assets/ui/loading-moving-screen.png'",'img.src=asset(LOADING_ASSET)','base.start()','setTimeout(hideLoading,180)'])must(router.includes(marker),`Moving Screen loading/router contract missing: ${marker}`);
for(const marker of ['window.__TTD_MOVING_SCREEN_BATTLE_HUD_V1=true','#ttdMsLoadoutRailV1{display:none!important}','ttdMsBattleBarV1','showDieDetail','activateOverdriveSlot','ttdMsSummonBottomV1','OD${index+1}'])must(battleHud.includes(marker),`Moving Screen bottom deck/Overdrive HUD contract missing: ${marker}`);
for(const marker of ['window.__TTD_MOVING_SCREEN_MOBILE_FRAME_V2=true','#ttdMsHudTitleFrameV1{display:none!important}','bottom:max(5px,env(safe-area-inset-bottom))','Moving Screen · ${stage.name}',"'Russo One',sans-serif"] )must(mobileFrame.includes(marker),`Moving Screen single-title phone frame contract missing: ${marker}`);
must(!mobileFrame.includes("pause.textContent='Back'")&&!mobileFrame.includes("font:700 12px/1.08 'Cinzel'"),'Moving Screen phone frame may not recreate the retired duplicate Cinzel title/Back override.');
for(const marker of ['window.__TTD_SINGLEPLAYER_RUN_CONTROLS_V1=true',"String(btn.textContent||'').trim()!=='Back'",'ttdSingleplayerRunActiveV1','End Run','linear-gradient(180deg,#f3d491,#d9b26a)',"event.target?.closest?.('#endRunBtn')",'ttdMsExitV4'])must(runControls.includes(marker),`Shared single-player Back/End Run contract missing: ${marker}`);

function projectPhone(x,z,y,cameraY=stage.cameraStops[0],W=390,H=650){const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const sx=clamp(W/520,.58,1.05),sy=clamp(H/430,1.05,2.55),baseY=H*.72,depth=clamp((z+260)/520,0,1),persp=.78+depth*.28,relX=x-stage.cameraX,relY=y-cameraY;return{x:W*.50+relX*sx*persp,y:baseY+z*.28*sx-relY*sy-relX*.035*sx};}
const lower=stage.zones.find(z=>z.id==='roof1_main'),second=stage.zones.find(z=>z.id==='roof2_west'),third=stage.zones.find(z=>z.id==='roof3_main'),final=stage.zones.find(z=>z.id==='roof4_final');
const P1=projectPhone(lower.x,lower.z,lower.y),P2=projectPhone(second.x,second.z,second.y),P3=projectPhone(third.x,third.z,third.y),PF=projectPhone(final.x,final.z,final.y);
must(P1.y>650*.48&&P1.y<650*.90,'Phone framing must put the current lower rooftop in the playable lower half.');
must(P1.y<650*.70,'Opening Tier-1 enemy-spawn surface must fit above the conservative spawn cutoff on a phone viewport.');
must(P2.y>-80&&P2.y<650*.30,'The next major rooftop should only peek near the upper boundary at the first camera stop.');
must(P3.y<-150&&PF.y<-500,'A phone viewport must not expose the third/final Neon tiers at the opening camera stop.');

const urls={
  stage:"'/online/moving-screen-neon-rooftops-v2.js?v=4'",construction:"'/online/moving-screen-construction-climb-v1.js?v=2'",engine:"'/online/moving-screen-engine-v5.js?v=1'",router:"'/online/moving-screen-map-router-v2.js?v=1'",ui:"'/online/moving-screen-ui-v1.js?v=1'",dieInput:"'/online/moving-screen-die-input-v1.js?v=1'",topology:"'/online/moving-screen-topology-ui-v1.js?v=1'",presentation:"'/online/moving-screen-construction-presentation-v1.js?v=2'",battleHud:"'/online/moving-screen-battle-hud-v1.js?v=1'",frame:"'/online/moving-screen-mobile-frame-v2.js?v=1'",runControls:"'/online/singleplayer-run-controls-v1.js?v=1'"
};
for(const url of Object.values(urls))must(loader.includes(url),`Runtime loader missing Moving Screen authority: ${url}`);
const order=Object.values(urls).map(url=>loader.indexOf(url));for(let i=1;i<order.length;i++)must(order[i]>order[i-1],`Moving Screen authority order regressed between ${Object.keys(urls)[i-1]} and ${Object.keys(urls)[i]}.`);
for(const stale of ['/online/moving-screen-engine-v4.js?v=8','/online/moving-screen-map-router-v1.js?v=2','/online/moving-screen-mobile-frame-v1.js?v=1'])must(!loader.includes(stale),`Retired Moving Screen runtime may not remain loaded: ${stale}`);
must(!/moving-screen[^\n]*(eval|replace|document\.write)/i.test(loader),'Runtime loader may not patch or eval Moving Screen source.');
must(audio.includes("'gameScreen'"),'The parent audio router must continue treating gameScreen as a silent gameplay route.');

console.log('Moving Screen verified: canonical combat, tap-to-power, Die-first drag merge, playable OD hooks, Zombie placeholder loading, bottom deck/OD HUD, one Russo One map title, unified End Run, and existing navigation/objective safety contracts.');