import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as espree from 'espree';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const shellPath='online/arcade-mode-shell-v2.js';
const shell=fs.readFileSync(shellPath,'utf8');
const loader=fs.readFileSync('online/runtime-bridge-loader-v1.js','utf8');
const startServer=fs.readFileSync('functions/run-start-v19.js','utf8');
const progression=fs.readFileSync('functions/account-progression-core-v21.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const game=fs.readFileSync('random-dice-game-33.html','utf8');

espree.parse(shell,{ecmaVersion:'latest',sourceType:'script'});
for(const forbidden of [/\beval\s*\(/,/new\s+Function\b/,/document\.write\s*\(/])must(!forbidden.test(shell),`Arcade shell must stay direct committed source: ${forbidden}`);
for(const marker of [
  "key:'neon_rooftops_v2'","key:'construction_climb'","name:'Construction Climb'","tag:'AVAILABLE'","playable:true",
  "['neon_rooftops_v2','construction_climb'].includes(mapKey)",'window.TTDMovingScreen.start(mapKey)',
  'function returnToArcade(event)','Choose Map',"send('ttd:v6-run-begin-request'","send('ttd:v6-run-finish-request'",
])must(shell.includes(marker),`Arcade shell multi-map contract missing: ${marker}`);
const shellUrl="'/online/arcade-mode-shell-v2.js?v=5'",constructionUi="'/online/moving-screen-construction-presentation-v1.js?v=2'";
must(loader.includes(shellUrl)&&loader.includes(constructionUi)&&loader.indexOf(constructionUi)<loader.indexOf(shellUrl),'Arcade shell must load after Construction Climb presentation authority.');
must(startServer.includes("moving_screen:new Set(['neon_rooftops_v2','construction_climb'])"),'Run-start server must authorize both Moving Screen maps.');
for(const marker of ["explicit === 'arcade'","'moving_screen'","family === 'arcade'"])must(progression.includes(marker),`Arcade progression family is missing: ${marker}`);
must(runUi.includes('window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35?.(m)'),'Verified results must still flow into the canonical result card.');
for(const marker of ['id="gameOverlay"','id="overlayPipsValue"','id="overlayExpValue"','id="overlayBtn"'])must(game.includes(marker),`Canonical result card source is missing ${marker}.`);

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>fs.existsSync(p));
must(chrome,'Arcade shell browser smoke requires Chrome/Chromium.');
const shellUrlFile=pathToFileURL(path.join(process.cwd(),shellPath)).href;
const harness=path.join(os.tmpdir(),`ttd-arcade-shell-${process.pid}.html`);
const filler=Array.from({length:7},(_,i)=>`<div class="modeCard filler">Arcade ${i+1}</div>`).join('');
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{--ink-950:#0a0c14;--ink-900:#12162a;--ink-850:#171c34;--ink-700:#2a3160;--gold:#d9b26a;--gold-glow:#f3d491;--mist:#97a0bd;--mist-dim:#5c6488;--astra-glow:#d4ecfa}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090b14;color:#fff;font-family:Arial}#app{position:fixed;inset:0}.screen{position:absolute;inset:0;display:none;flex-direction:column;background:#0a0c14;overflow:hidden}.screen.active{display:flex}.topbar{height:52px;flex:0 0 52px;display:flex;align-items:center;justify-content:space-between;padding:8px}.modeBody{flex:1 1 auto;min-height:auto;display:flex;flex-direction:column;gap:12px;padding:16px;justify-content:center}.modeCard{min-height:106px;flex:0 0 auto;padding:12px;border:1px solid #2a3160;border-radius:10px}.modeCard button,.backBtn{min-height:38px}#gameOverlay{position:absolute;inset:0;z-index:80;display:none}#gameOverlay.show{display:flex}#ttdMsResultV4{display:none}#ttdMsResultV4.show{display:block}</style></head><body><div id="app">
<div id="homeScreen" class="screen"></div><div id="deckScreen" class="screen"></div><div id="modeScreen" class="screen active"><div class="topbar">Arcade</div><div class="modeBody">${filler}<div id="ttdMovingScreenCardV4" class="modeCard"><button>Begin</button></div><div id="ttdKingHillCardV4" class="modeCard"><button disabled>Later</button></div></div></div>
<div id="gameScreen" class="screen"><div id="gameOverlay"><span id="overlayPipsValue">0</span><span id="overlayPipsNotes"></span><span id="overlayExpValue">0</span><span id="overlayExpNotes"></span><div id="overlayTitle"></div><div id="overlayText"></div><div id="overlayStats"></div><div id="overlayLevelUp"></div><button id="overlayBtn">Continue</button></div><div id="ttdMsResultV4"><h2>RUN FAILED</h2><p>Done</p></div><button id="ttdMsExitV4">Exit</button></div><div id="toast"></div><pre id="testResult">PENDING</pre></div>
<script>
const report={errors:[],beginMessages:0,finishMessages:0};addEventListener('error',e=>report.errors.push(String(e.error?.stack||e.message||e.error)));addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason||e)));
const CORE=new Set(['home','deck','mode','game']);function showScreen(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));if(CORE.has(name))document.getElementById(name+'Screen')?.classList.add('active')}function toastGlobal(m){document.getElementById('toast').textContent=m}function getActiveDeck(){return[{},{},{},{},{}]}
let movingActive=false,startedStage=null,exitCount=0;window.TTDMovingScreen={start(stageId){startedStage=stageId;movingActive=true;showScreen('game')},exit(){movingActive=false;exitCount++;showScreen('mode')},get active(){return movingActive},get state(){return{stopIndex:3,kills:12,killGoal:30,lives:8,flag:'Flag home'}}};
function reply(data){dispatchEvent(new MessageEvent('message',{data,origin:location.origin,source:window.parent}))}addEventListener('message',event=>{const m=event.data||{};if(m.type==='ttd:v6-run-begin-request'){report.beginMessages++;report.beginMap=m.mapKey;setTimeout(()=>reply({type:'ttd:v6-run-begin-result',requestId:m.requestId,runId:'run1'}),0)}else if(m.type==='ttd:v6-run-finish-request'){report.finishMessages++;setTimeout(()=>reply({type:'ttd:v6-run-finish-result',requestId:m.requestId,runId:m.runId,pipsEarned:8,xpAwarded:6}),0)}});document.getElementById('overlayBtn').onclick=()=>showScreen('home');
</script><script src="${shellUrlFile}"></script><script>
const sleep=ms=>new Promise(r=>setTimeout(r,ms));(async()=>{try{await sleep(120);const body=document.querySelector('#modeScreen .modeBody');report.scrollable=getComputedStyle(body).overflowY==='auto'&&body.scrollHeight>body.clientHeight;body.scrollTop=body.scrollHeight;await sleep(30);const br=body.getBoundingClientRect(),kr=document.getElementById('ttdKingHillCardV4').getBoundingClientRect();report.kothReachable=kr.bottom<=br.bottom+1;
document.querySelector('#ttdKingHillCardV4 button').click();await sleep(25);const k=document.getElementById('kingHillModeScreen');report.kothLanding=k?.classList.contains('active')===true;k.querySelector('.ttdArcadeLandingBackV1').click();await sleep(25);report.kothBack=document.getElementById('modeScreen').classList.contains('active')===true&&!k.classList.contains('active');
document.querySelector('#ttdMovingScreenCardV4 button').click();await sleep(25);const m=document.getElementById('movingScreenModeScreen'),cards=[...m.querySelectorAll('.ttdArcadeMapCard')],playable=cards.filter(c=>!c.querySelector('button').disabled);report.movingLanding=m.classList.contains('active');report.twoPlayable=playable.length===2;const construction=m.querySelector('[data-map-key="construction_climb"]');report.constructionAvailable=!!construction&&!construction.querySelector('button').disabled;construction.querySelector('button').click();await sleep(100);report.constructionTicket=report.beginMessages===1&&report.beginMap==='construction_climb';report.constructionStarted=movingActive&&startedStage==='construction_climb'&&document.getElementById('gameScreen').classList.contains('active');
report.noErrors=report.errors.length===0;}catch(e){report.errors.push(String(e?.stack||e))}report.ok=['scrollable','kothReachable','kothLanding','kothBack','movingLanding','twoPlayable','constructionAvailable','constructionTicket','constructionStarted','noErrors'].every(k=>report[k]===true);document.getElementById('testResult').textContent=JSON.stringify(report)})();
</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';try{dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=2600','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:30000,stdio:['ignore','pipe','pipe']});}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="testResult">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return Arcade shell smoke results.');const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');const report=JSON.parse(decoded);if(!report.ok){console.error(report);process.exit(1)}console.log('Arcade shell multi-map routing verified:',JSON.stringify(report));
