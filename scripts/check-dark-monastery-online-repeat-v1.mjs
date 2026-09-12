import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=candidates.find(p=>fs.existsSync(p));
must(chrome,'Dark Monastery online-repeat smoke requires Chrome/Chromium.');

const root=process.cwd();
const script=(name)=>pathToFileURL(path.join(root,'online',name)).href;
const dmUrl=script('dark-monastery-v1.js');
const hotfixUrl=script('dark-monastery-entry-hotfix-v2.js');
const entryUrl=script('dark-monastery-entry-v3.js');
const guardUrl=script('dark-monastery-runtime-guard-v6.js');
const lifecycleUrl=script('dark-monastery-lifecycle-v7.js');
const harness=path.join(os.tmpdir(),`ttd-dark-monastery-online-repeat-${process.pid}.html`);

const html=`<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;background:#090b14;color:white}.screen{display:none}.screen.active{display:block}
#gameScreen{position:relative;width:390px;height:650px}#laneWrap{position:relative;width:390px;height:360px;overflow:hidden;background:#4b7f49}
#laneCanvas{width:100%;height:100%}#playerHpWrap{display:none}#playerHpFill{height:8px}
</style></head><body>
<div id="gameScreen" class="screen"><div id="hud"><span id="modeLabel">Adventure</span><div class="hud-stat lives" id="livesStat"><span class="label">Lives</span><span id="livesVal">12</span></div></div><div id="laneWrap"><canvas id="laneCanvas"></canvas></div><div id="playerHpWrap"><div id="playerHpFill"></div><span id="playerHpLabel"></span></div></div>
<div id="modeScreen" class="screen active"></div><div id="overlayTitle"></div><div id="overlayText"></div><pre id="result">PENDING</pre>
<script>
window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16);window.cancelAnimationFrame=id=>clearTimeout(id);
var ADVENTURES={};var state=null;var cw=390,ch=360;var pathPts=[],segLens=[],totalLen=1000,towerPos={x:0,y:0};var currentAttackerDieKey=null;var lastT=0;
var __nativeStarts=0,__nativeGreenFrames=0,__secondStageRebuilt=false;
window.__TTD_CORE_API_V1={};window.__TTD_ASSET_URL=p=>p;
function showScreen(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(name+'Screen')?.classList.add('active');}
function renderHUD(){if(!state)return;document.getElementById('livesVal').textContent=String(state.lives||0);const hp=document.getElementById('playerHpWrap');hp.style.display=state.showPlayerHpBar?'block':'none';document.getElementById('playerHpLabel').textContent=state.playerHpLabel||'Player HP';}
function renderBoard(){}function updateSpawns(){}function enemyRenderPos(){return{x:0,y:0}}function buildPath(){pathPts=[{x:0,y:0},{x:100,y:0}];segLens=[100];totalLen=100;towerPos=pathPts[1];}
function drawLane(){__nativeGreenFrames++;}function endMatch(){if(state)state.running=false;}function effAffinities(){return{}}function dieJewelBonus(){return 0}function triggerTilePulse(){}function toast(){}
function nativeLoop(){if(!state?.running)return;drawLane();requestAnimationFrame(nativeLoop);}function loop(){nativeLoop();}
function makeState(advId,stageIdx,diffKey){
  const adv=ADVENTURES[advId],sourceStage=adv.stages[stageIdx];let stage=sourceStage;__nativeStarts++;
  if(advId==='dark_monastery'&&__nativeStarts===2){stage={...sourceStage};delete stage.darkMonastery;__secondStageRebuilt=true;}
  state={adventure:true,adventureStages:[stage],adventureStageIdx:0,adventureStage:stage,adventureDiff:{hpMult:1,dmgMult:1,durBonus:0},adventureDiffKey:diffKey,lives:12,livesMax:12,showPlayerHpBar:false,playerHpLabel:'Player HP',spawnQueue:[{native:true}],spawnTimer:0,enemies:[],board:new Array(15).fill(null),coins:[],running:true,completedWaves:0,kills:0,sp:100,wave:1,waveClearCredited:false,waveClearedAt:0};
  showScreen('game');renderHUD();requestAnimationFrame(nativeLoop);return state;
}
function nativeStartAdventure(advId,stageIdx,diffKey){return makeState(advId,stageIdx,diffKey);}function nativeStartAdventureCampaign(advId,diffKey){return makeState(advId,0,diffKey);}
// Mirror the real Online bridge load order: it wraps native Adventure BEFORE Dark Monastery loads,
// then waits for a server run-begin reply before calling the captured native starter.
function startAdventure(advId,stageIdx,diffKey){setTimeout(()=>nativeStartAdventure(advId,stageIdx,diffKey),180);return undefined;}
function startAdventureCampaign(advId,diffKey){setTimeout(()=>nativeStartAdventureCampaign(advId,diffKey),180);return undefined;}
</script>
<script src="${dmUrl}"></script><script src="${hotfixUrl}"></script><script src="${entryUrl}"></script><script src="${guardUrl}"></script><script src="${lifecycleUrl}"></script>
<script>
const report={errors:[]};let canonicalStage=null,firstState=null,firstPlayer=null,secondOldState=null;
window.addEventListener('error',e=>report.errors.push(String(e.error?.stack||e.message||e.error||'window error')));window.addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason?.stack||e.reason||'unhandled rejection')));
setTimeout(()=>{try{canonicalStage=ADVENTURES.dark_monastery?.stages?.[0];startAdventureCampaign('dark_monastery','normal');}catch(e){report.errors.push(String(e?.stack||e));}},20);
setTimeout(()=>{try{const api=window.__TTD_DARK_MONASTERY_API_V1;firstState=state;firstPlayer=api?.player;report.firstRunReady=!!(firstState&&firstPlayer&&api?.active&&document.getElementById('gameScreen')?.classList.contains('ttd-dark-monastery-v1')&&document.getElementById('ttdDarkMonasteryBackV1')&&document.getElementById('ttdDarkMonasteryFrontV1')&&document.getElementById('ttdDarkMonasteryJoyV1'));showScreen('mode');if(state)state.running=false;}catch(e){report.errors.push(String(e?.stack||e));}},700);
setTimeout(()=>{try{secondOldState=state;startAdventureCampaign('dark_monastery','normal');}catch(e){report.errors.push(String(e?.stack||e));}},900);
setTimeout(()=>{try{const api=window.__TTD_DARK_MONASTERY_API_V1,life=window.__TTD_DARK_MONASTERY_LIFECYCLE_V7_API;report.oldStateDetachedBeforeReply=state===secondOldState&&state?.__ttdDarkMonastery!==true&&state?.adventureStage!==canonicalStage&&api?.active!==true&&!document.getElementById('gameScreen')?.classList.contains('ttd-dark-monastery-v1')&&!document.getElementById('ttdDarkMonasteryBackV1')&&!document.getElementById('ttdDarkMonasteryFrontV1')&&life?.waitingForFreshState===true;}catch(e){report.errors.push(String(e?.stack||e));}},1010);
setTimeout(()=>{try{const api=window.__TTD_DARK_MONASTERY_API_V1,life=window.__TTD_DARK_MONASTERY_LIFECYCLE_V7_API;report.secondStageRebuilt=__secondStageRebuilt===true;report.newStateArrived=!!state&&state!==secondOldState&&state!==firstState;report.canonicalReanchored=state?.adventureStage===canonicalStage&&state?.adventureStages?.[0]===canonicalStage;report.secondRunReady=!!(api?.active&&api?.player&&api.player!==firstPlayer&&state?.__ttdDarkMonastery===true&&document.getElementById('gameScreen')?.classList.contains('ttd-dark-monastery-v1')&&document.getElementById('ttdDarkMonasteryBackV1')&&document.getElementById('ttdDarkMonasteryFrontV1')&&document.getElementById('ttdDarkMonasteryJoyV1'));report.hold=Array.isArray(state?.spawnQueue)&&state.spawnQueue.some(x=>x?.__ttdDarkMonasteryHold);report.lifecycleBuild=life?.build==='deferred-online-reentry-v9';report.detached=Number(life?.staleDetaches)>=1;report.transitioned=Number(life?.deferredTransitions)>=2;report.noErrors=report.errors.length===0;const checks=['firstRunReady','oldStateDetachedBeforeReply','secondStageRebuilt','newStateArrived','canonicalReanchored','secondRunReady','hold','lifecycleBuild','detached','transitioned','noErrors'];report.ok=checks.every(k=>report[k]===true);document.getElementById('result').textContent=JSON.stringify(report);}catch(e){report.errors.push(String(e?.stack||e));document.getElementById('result').textContent=JSON.stringify(report);}},1800);
</script></body></html>`;

fs.writeFileSync(harness,html);
let dom='';
try{
  dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=2400','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:45000,stdio:['ignore','pipe','pipe']});
}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="result">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return Dark Monastery online-repeat results.');
const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
let report;try{report=JSON.parse(decoded);}catch{throw new Error(`Could not parse Dark Monastery online-repeat report: ${decoded}`);}
if(!report.ok){console.error('Dark Monastery deferred-online repeat smoke failed:',JSON.stringify(report,null,2));process.exit(1);}
console.log('Dark Monastery deferred-online repeat smoke passed:',JSON.stringify(report));
