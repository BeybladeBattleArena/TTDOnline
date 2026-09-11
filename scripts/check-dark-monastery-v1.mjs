import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=candidates.find(p=>fs.existsSync(p));
must(chrome,'Dark Monastery browser smoke requires Chrome/Chromium on the CI runner.');

const root=process.cwd();
const dmUrl=pathToFileURL(path.join(root,'online/dark-monastery-v1.js')).href;
const hotfixUrl=pathToFileURL(path.join(root,'online/dark-monastery-entry-hotfix-v2.js')).href;
const finalEntryUrl=pathToFileURL(path.join(root,'online/dark-monastery-entry-v3.js')).href;
const harness=path.join(os.tmpdir(),`ttd-dark-monastery-${process.pid}.html`);

const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090b14;color:white;font-family:Arial,sans-serif}.screen{display:none}.screen.active{display:block}#gameScreen{position:relative;width:390px;height:650px}#hud{height:52px;display:flex;gap:8px;align-items:center;padding:6px}.hud-stat{display:flex;gap:4px}#laneWrap{position:relative;width:390px;height:360px;overflow:hidden}#laneCanvas{width:100%;height:100%}#playerHpWrap{display:none;height:10px;width:180px;background:#222}#playerHpFill{height:100%;background:#ccc}
</style></head><body>
<div id="gameScreen" class="screen"><div id="hud"><span id="modeLabel">Adventure</span><div class="hud-stat lives" id="livesStat"><span class="label">Lives</span><span class="value" id="livesVal">12</span></div></div><div id="laneWrap"><canvas id="laneCanvas"></canvas></div><div id="playerHpWrap"><div id="playerHpFill"></div><span id="playerHpLabel"></span></div></div>
<div id="modeScreen" class="screen active"></div><div id="overlayTitle"></div><div id="overlayText"></div><pre id="result">PENDING</pre>
<script>
var ADVENTURES={};var state=null;var cw=390,ch=360;var pathPts=[],segLens=[],totalLen=1000,towerPos={x:0,y:0};var currentAttackerDieKey=null;var __nativeCleared=false;var __ended='';
window.__TTD_CORE_API_V1={};window.__TTD_ASSET_URL=p=>p;
function showScreen(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(name+'Screen')?.classList.add('active');}
function renderHUD(){if(!state)return;document.getElementById('livesVal').textContent=String(Math.max(0,Math.round(state.lives||0)));const hp=document.getElementById('playerHpWrap');hp.style.display=state.showPlayerHpBar?'block':'none';document.getElementById('playerHpLabel').textContent=state.playerHpLabel||'Player HP';if(state.showPlayerHpBar){const max=state.livesMax||1;document.getElementById('playerHpFill').style.width=Math.max(0,Math.min(100,(state.lives/max)*100))+'%';}}
function renderBoard(){}function updateSpawns(){}function enemyRenderPos(){return{x:0,y:0}}function buildPath(){pathPts=[{x:0,y:0},{x:100,y:0}];segLens=[100];totalLen=100;towerPos=pathPts[1];}
function endMatch(reason){__ended=String(reason);if(state)state.running=false;}function effAffinities(){return{}}function dieJewelBonus(){return 0}function triggerTilePulse(){}function toast(){}
function nativeLoop(){if(!state?.running)return;if(state.spawnQueue.length===0&&state.enemies.length===0){__nativeCleared=true;endMatch('clear');return;}requestAnimationFrame(nativeLoop);}
function makeState(advId,stageIdx,diffKey){const adv=ADVENTURES[advId],stage=adv.stages[stageIdx];state={adventure:true,adventureStages:[stage],adventureStageIdx:0,adventureStage:stage,adventureDiff:{hpMult:1,dmgMult:1,durBonus:0},adventureDiffKey:diffKey,lives:12,livesMax:12,showPlayerHpBar:false,playerHpLabel:'Player HP',spawnQueue:[],spawnTimer:0,enemies:[],board:new Array(15).fill(null),coins:[],running:true,completedWaves:0,kills:0,sp:100,wave:1,waveClearCredited:false,waveClearedAt:0};showScreen('game');renderHUD();requestAnimationFrame(nativeLoop);return state;}
function startAdventure(advId,stageIdx,diffKey){return makeState(advId,stageIdx,diffKey);}
function startAdventureCampaign(advId,diffKey){return makeState(advId,0,diffKey);}
</script>
<script src="${dmUrl}"></script><script src="${hotfixUrl}"></script><script src="${finalEntryUrl}"></script>
<script>
const report={errors:[]};window.addEventListener('error',e=>report.errors.push(String(e.error?.stack||e.message||e.error||'window error')));window.addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason?.stack||e.reason||'unhandled rejection')));
setTimeout(()=>{try{startAdventureCampaign('dark_monastery','normal');}catch(error){report.errors.push(String(error?.stack||error));}},20);
setTimeout(()=>{
 try{
  const api=window.__TTD_DARK_MONASTERY_API_V1,adv=ADVENTURES.dark_monastery;
  report.nonCampaign=adv?.campaign===false;
  report.stageActive=state?.adventureStage?.darkMonastery===true;
  report.runtimeFlag=state?.__ttdDarkMonastery===true;
  report.runtimeActive=api?.active===true;
  report.playerPresent=!!api?.player;
  report.joystick=!!document.getElementById('ttdDarkMonasteryJoyV1');
  report.roomBack=!!document.getElementById('ttdDarkMonasteryBackV1');
  report.roomFront=!!document.getElementById('ttdDarkMonasteryFrontV1');
  report.hpValue=state?.lives===50&&state?.livesMax===50;
  report.hpLabel=document.querySelector('#livesStat .label')?.textContent==='HP';
  report.hpBar=state?.showPlayerHpBar===true&&getComputedStyle(document.getElementById('playerHpWrap')).display!=='none';
  report.notCleared=__nativeCleared===false&&state?.running===true&&__ended==='';
  report.firstEnemy=(api?.actors?.length||0)>=1&&(state?.enemies?.length||0)>=1;
  report.hold=Array.isArray(state?.spawnQueue)&&state.spawnQueue.some(x=>x?.__ttdDarkMonasteryHold===true);
  report.noErrors=report.errors.length===0;
 }catch(error){report.errors.push(String(error?.stack||error));}
 const checks=['nonCampaign','stageActive','runtimeFlag','runtimeActive','playerPresent','joystick','roomBack','roomFront','hpValue','hpLabel','hpBar','notCleared','firstEnemy','hold','noErrors'];report.ok=checks.every(k=>report[k]===true);document.getElementById('result').textContent=JSON.stringify(report);
},1000);
</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';
try{
  dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=1500','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:45000,stdio:['ignore','pipe','pipe']});
}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="result">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return Dark Monastery smoke results.');
const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
let report;try{report=JSON.parse(decoded);}catch{throw new Error(`Could not parse Dark Monastery report: ${decoded}`);}
if(!report.ok){console.error('Dark Monastery startup smoke failed:',JSON.stringify(report,null,2));process.exit(1);}
console.log('Dark Monastery startup smoke passed:',JSON.stringify(report));
