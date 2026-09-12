import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=candidates.find(p=>fs.existsSync(p));
must(chrome,'Dark Monastery V2 browser smoke requires Chrome/Chromium on the CI runner.');
const root=process.cwd();
const dmUrl=pathToFileURL(path.join(root,'online/dark-monastery-adventure-v2.js')).href;
const harness=path.join(os.tmpdir(),`ttd-dark-monastery-map-v2-${process.pid}.html`);
const html=`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;background:#080b12}.screen{display:none}.screen.active{display:block}#gameScreen{width:390px;height:650px;position:relative}#hud{height:60px}.hud-stat{display:flex}.hud-left{display:flex}.hud-stats{display:flex}#laneWrap{position:relative;width:390px;height:390px;overflow:hidden}#laneCanvas{width:100%;height:100%}</style></head><body>
<div id="gameScreen" class="screen"><div id="hud"><div class="hud-left"><span id="modeLabel">Adventure</span></div><div class="hud-stats"><div id="livesStat" class="hud-stat lives"><span class="label">Lives</span><span id="livesVal"></span></div></div></div><div id="laneWrap"><canvas id="laneCanvas"></canvas></div><div id="playerHpWrap"><div id="playerHpFill"></div></div></div><div id="modeScreen" class="screen active"></div><div id="overlayTitle"></div><div id="overlayText"></div><pre id="result">PENDING</pre>
<script>
window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16);window.cancelAnimationFrame=id=>clearTimeout(id);window.__TTD_CORE_API_V1={};window.__TTD_ASSET_URL=p=>p;
var ADVENTURES={},state=null,cw=390,ch=390,pathPts=[],segLens=[],totalLen=100,towerPos={x:0,y:0},lastT=0;var modeLabel=document.getElementById('modeLabel');var __ended='';
function showScreen(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(name+'Screen')?.classList.add('active');}
function renderHUD(){if(state)document.getElementById('livesVal').textContent=String(state.lives||0);}function renderBoard(){}function updateSpawns(){}function enemyRenderPos(){return{x:0,y:0}}function buildPath(){}function drawLane(){}function loop(){}function toast(){}function triggerTilePulse(){}
function endMatch(reason){__ended=String(reason);if(state)state.running=false;}
function makeState(advId,stageIdx,diffKey){const stage=ADVENTURES[advId].stages[stageIdx];state={adventure:true,adventureStages:[stage],adventureStageIdx:0,adventureStage:stage,adventureDiffKey:diffKey,adventureDiff:{hpMult:1,dmgMult:1,durBonus:0},running:true,spawnQueue:[],spawnTimer:0,enemies:[],board:new Array(15).fill(null),coins:[],lives:12,livesMax:12,sp:100,kills:0,wave:1};showScreen('game');return state;}
function startAdventure(advId,stageIdx,diffKey){return makeState(advId,stageIdx,diffKey);}function startAdventureCampaign(advId,diffKey){return makeState(advId,0,diffKey);}
</script><script src="${dmUrl}"></script><script>
const report={errors:[]};window.addEventListener('error',e=>report.errors.push(String(e.error?.stack||e.message||e.error)));window.addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason?.stack||e.reason)));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
  await window.__TTD_DARK_MONASTERY_V2_READY;
  startAdventure('dark_monastery',0,'normal');await sleep(180);
  const api=window.__TTD_DARK_MONASTERY_ADVENTURE_V2_API;api.debug.forceStart();
  report.mapRegistered=api.map?.rooms?.length===8&&ADVENTURES.dark_monastery?.officialMapVersion===3&&api.map?.version===3;
  report.fidelityRevision=api.map?.visualRevision==='source-fidelity-v3'&&api.build==='official-eight-room-map-v3-source-fidelity';
  report.cameraZoom=api.map?.cameraZoom===1.15;
  report.guillotineTiming=api.map?.reusableHazards?.guillotine?.apexPauseSeconds===.375;
  report.room5Traversal=api.map?.room5Traversal?.northWallBrokenStair===true&&api.map.room5Traversal.rises==='east'&&api.map.room5Traversal.requiresJump===true&&api.map.room5Traversal.stairSegments?.length===7&&api.map.room5Traversal.upperPlatforms?.length===7;
  report.startRoom=api.roomIndex===0&&api.room?.id==='holding_cells_i';
  const bars=api.interactives.find(o=>o.id==='cellbars_0');report.startBars=!!bars&&!bars.destroyed&&bars.solid===true;
  const particleBefore=api.particles.length;report.tapFeedback=api.debug.hitInteractive('cellbars_0')===true&&bars.hitFlash>0&&api.particles.length>particleBefore;
  api.debug.breakStartingBars();report.breakout=bars.destroyed===true&&bars.solid===false;
  api.debug.enterRoom(1);const statues=api.interactives.filter(o=>o.kind==='statue');report.room2Statues=statues.length===2&&statues.every(o=>o.dir==='south');if(statues[0])statues[0].fireTimer=5.99;await sleep(120);report.fireBat=api.hazards.some(h=>h.kind==='firebat');
  state.adventureDiffKey='normal';api.debug.enterRoom(2);report.room3Normal=api.actors.length===0;
  state.adventureDiffKey='hard';api.debug.enterRoom(2);report.room3Hard=api.actors.filter(a=>!a.dead).length===2;
  state.adventureDiffKey='hell';api.debug.enterRoom(2);report.room3Hell=api.actors.filter(a=>!a.dead).length===4;
  api.debug.enterRoom(3);report.room4Guillotines=api.hazards.filter(h=>h.kind==='guillotine').length===4;
  api.debug.enterRoom(4);report.room5Gargoyles=api.interactives.filter(o=>o.kind==='statue').length===5;report.room5Food=api.interactives.some(o=>o.kind==='urn'&&o.reward==='food');
  api.debug.enterRoom(5);report.room6Guillotines=api.hazards.filter(h=>h.kind==='guillotine').length===6;
  api.debug.enterRoom(6);report.room7SecretWall=api.interactives.some(o=>o.kind==='secret_wall');report.room7SecretChests=api.interactives.filter(o=>o.kind==='chest'&&o.secret).length===3;
  api.debug.enterRoom(7);report.fallStarted=api.roomIndex===7;await sleep(5100);report.bossChamber=api.mapComplete===true&&state.__ttdDarkMonasteryBossChamberReached===true&&api.room?.id==='moonlit_sanctum';
  report.noErrors=report.errors.length===0&&!api.lastFrameError;
  const keys=['mapRegistered','fidelityRevision','cameraZoom','guillotineTiming','room5Traversal','startRoom','startBars','tapFeedback','breakout','room2Statues','fireBat','room3Normal','room3Hard','room3Hell','room4Guillotines','room5Gargoyles','room5Food','room6Guillotines','room7SecretWall','room7SecretChests','fallStarted','bossChamber','noErrors'];report.ok=keys.every(k=>report[k]===true);
}catch(e){report.errors.push(String(e.stack||e));report.ok=false;}document.getElementById('result').textContent=JSON.stringify(report);})();
</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';try{dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=7000','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:45000,stdio:['ignore','pipe','pipe']});}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="result">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return Dark Monastery V2 map smoke results.');const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');let report;try{report=JSON.parse(decoded);}catch{throw new Error(`Could not parse Dark Monastery V2 report: ${decoded}`);}if(!report.ok){console.error('Dark Monastery V2 source-fidelity map smoke failed:',JSON.stringify(report,null,2));process.exit(1);}console.log('Dark Monastery V2 source-fidelity map smoke passed:',JSON.stringify(report));
