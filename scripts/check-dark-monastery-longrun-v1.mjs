import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const must=(v,m)=>{if(!v)throw new Error(m);};
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
must(chrome,'Dark Monastery long-run smoke requires Chrome/Chromium.');
const root=process.cwd();
const dm=pathToFileURL(path.join(root,'online/dark-monastery-v1.js')).href;
const hotfix=pathToFileURL(path.join(root,'online/dark-monastery-entry-hotfix-v2.js')).href;
const entry=pathToFileURL(path.join(root,'online/dark-monastery-entry-v3.js')).href;
const guard=pathToFileURL(path.join(root,'online/dark-monastery-runtime-guard-v6.js')).href;
const harness=path.join(os.tmpdir(),`ttd-dm-longrun-${process.pid}.html`);

const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;background:#090b14}.screen{display:none}.screen.active{display:block}#gameScreen{position:relative;width:390px;height:650px}#hud{height:52px;color:white}.hud-stat{display:inline-flex;gap:4px}#laneWrap{position:relative;width:390px;height:360px;overflow:hidden}#laneCanvas{width:100%;height:100%}#playerHpWrap{display:none}
</style></head><body><div id="gameScreen" class="screen"><div id="hud"><span id="modeLabel">Adventure</span><div class="hud-stat lives" id="livesStat"><span class="label">Lives</span><span id="livesVal">12</span></div></div><div id="laneWrap"><canvas id="laneCanvas"></canvas></div><div id="playerHpWrap"><div id="playerHpFill"></div><span id="playerHpLabel"></span></div></div><div id="modeScreen" class="screen active"></div><div id="overlayTitle"></div><div id="overlayText"></div><pre id="result">PENDING</pre>
<script>
window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16);window.cancelAnimationFrame=id=>clearTimeout(id);
var ADVENTURES={};var state=null;var cw=390,ch=360,pathPts=[],segLens=[],totalLen=1000,towerPos={x:0,y:0},currentAttackerDieKey=null;var __ended='';var __nativeCleared=false;var __forcedStops=0;var __recoveredStops=0;
window.__TTD_CORE_API_V1={};window.__TTD_ASSET_URL=p=>p;
function showScreen(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(name+'Screen')?.classList.add('active');}
function renderHUD(){if(!state)return;document.getElementById('livesVal').textContent=String(state.lives||0);document.querySelector('#livesStat .label').textContent='Lives';document.getElementById('playerHpWrap').style.display=state.showPlayerHpBar?'block':'none';document.getElementById('playerHpLabel').textContent=state.playerHpLabel||'Player HP';}
function renderBoard(){}function updateSpawns(){}function enemyRenderPos(){return{x:0,y:0}}function buildPath(){pathPts=[{x:0,y:0},{x:100,y:0}];segLens=[100];totalLen=100;towerPos=pathPts[1];}function drawLane(){}
function endMatch(reason){__ended=String(reason);if(state)state.running=false;}function effAffinities(){return{}}function dieJewelBonus(){return 0}function triggerTilePulse(){}function toast(){}
function nativeLoop(){if(!state?.running)return;if(state.spawnQueue.length===0&&state.enemies.length===0){__nativeCleared=true;endMatch('clear');return;}drawLane();requestAnimationFrame(nativeLoop);}
function die(i){return{key:'dummy'+i,hp:45,maxHp:45,disabledT:0,buffs:[]};}
function makeState(advId,stageIdx,diffKey){const adv=ADVENTURES[advId],stage=adv.stages[stageIdx];const board=new Array(15).fill(null);for(let i=0;i<10;i++)board[i]=die(i);state={adventure:true,adventureStages:[stage],adventureStageIdx:0,adventureStage:stage,adventureDiff:{hpMult:1,dmgMult:1,durBonus:0},adventureDiffKey:diffKey,lives:12,livesMax:12,showPlayerHpBar:false,playerHpLabel:'Player HP',spawnQueue:[],spawnTimer:0,enemies:[],board,coins:[],running:true,completedWaves:0,kills:0,sp:100,wave:1,waveClearCredited:false,waveClearedAt:0};showScreen('game');renderHUD();requestAnimationFrame(nativeLoop);return state;}
function startAdventure(advId,stageIdx,diffKey){return makeState(advId,stageIdx,diffKey);}function startAdventureCampaign(advId,diffKey){return makeState(advId,0,diffKey);}
</script><script src="${dm}"></script><script src="${hotfix}"></script><script src="${entry}"></script><script src="${guard}"></script><script>
const report={errors:[]};window.addEventListener('error',e=>report.errors.push(String(e.error?.stack||e.message||e.error||'error')));window.addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason?.stack||e.reason||'rejection')));
setTimeout(()=>{try{startAdventureCampaign('dark_monastery','normal');}catch(e){report.errors.push(String(e?.stack||e));}},20);
function forceAndVerifyStop(at){setTimeout(()=>{if(!state)return;state.running=false;__forcedStops++;setTimeout(()=>{if(state?.running===true)__recoveredStops++;},180);},at);}
forceAndVerifyStop(3200);forceAndVerifyStop(7600);forceAndVerifyStop(10800);
setTimeout(()=>{
 try{
  const api=window.__TTD_DARK_MONASTERY_API_V1,guardApi=window.__TTD_DARK_MONASTERY_RUNTIME_GUARD_V6_API;
  report.stageActive=state?.adventureStage?.darkMonastery===true;
  report.runtimeActive=api?.active===true;
  report.running=state?.running===true;
  report.playerAlive=Number(state?.lives)>0;
  report.allFourSpawned=(api?.actors?.length||0)>=4;
  report.giantSpawned=(api?.actors||[]).some(a=>a?.type==='giant_skeleton');
  report.diceRemain=state?.board?.some(Boolean)===true;
  report.hold=state?.spawnQueue?.some(x=>x?.__ttdDarkMonasteryHold===true)===true;
  report.hpLabel=document.querySelector('#livesStat .label')?.textContent==='HP';
  report.recovered=__forcedStops===3&&__recoveredStops===3;
  report.forcedStops=__forcedStops;report.recoveredStops=__recoveredStops;report.guardRecoveries=guardApi?.recoveries||0;
  report.frameHealthy=!api?.lastFrameError;
  report.notTerminal=guardApi?.terminal===false;
  report.noNativeClear=__nativeCleared===false&&__ended==='';
  report.noErrors=report.errors.length===0;
  report.ok=['stageActive','runtimeActive','running','playerAlive','allFourSpawned','giantSpawned','diceRemain','hold','hpLabel','recovered','frameHealthy','notTerminal','noNativeClear','noErrors'].every(k=>report[k]===true);
 }catch(e){report.errors.push(String(e?.stack||e));report.ok=false;}
 document.getElementById('result').textContent=JSON.stringify(report);
},12200);
</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';try{dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=12800','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:45000,stdio:['ignore','pipe','pipe']});}finally{try{fs.unlinkSync(harness);}catch{}}
const m=dom.match(/<pre id="result">([\s\S]*?)<\/pre>/i);must(m,'Dark Monastery long-run smoke returned no result.');const decoded=m[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');let report;try{report=JSON.parse(decoded);}catch{throw new Error(`Could not parse long-run report: ${decoded}`);}if(!report.ok){console.error('Dark Monastery long-run smoke failed:',JSON.stringify(report,null,2));process.exit(1);}console.log('Dark Monastery long-run smoke passed:',JSON.stringify(report));
