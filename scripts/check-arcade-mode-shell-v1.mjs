import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as espree from 'espree';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const shellPath='online/arcade-mode-shell-v1.js';
const shell=fs.readFileSync(shellPath,'utf8');
const loader=fs.readFileSync('online/runtime-bridge-loader-v1.js','utf8');
const startClient=fs.readFileSync('online/run-start-client-v19.js','utf8');
const startServer=fs.readFileSync('functions/run-start-v19.js','utf8');
const progression=fs.readFileSync('functions/account-progression-core-v21.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const game=fs.readFileSync('random-dice-game-33.html','utf8');

espree.parse(shell,{ecmaVersion:'latest',sourceType:'script'});
for(const forbidden of [/\beval\s*\(/,/new\s+Function\b/,/document\.write\s*\(/,/\.replace\s*\([^\n]*moving-screen/i])must(!forbidden.test(shell),`Arcade shell must stay direct committed source without source surgery: ${forbidden}`);
for(const marker of [
  'window.__TTD_ARCADE_MODE_SHELL_V1=true',
  "const MOVING_MODE='moving_screen'",
  "const KOTH_MODE='king_of_the_hill'",
  "const MOVING_SCREEN_ID='movingScreenModeScreen'",
  "const KOTH_SCREEN_ID='kingHillModeScreen'",
  "key:'neon_rooftops_v2'",
  "key:'underground_descent'",
  "key:'construction_climb'",
  "key:'neon_rooftops_koth'",
  "key:'foundry_platform'",
  "key:'clocktower_crown'",
  'overflow-y:auto!important',
  'touch-action:pan-y!important',
  'Choose Map',
  "send('ttd:v6-run-begin-request'",
  "send('ttd:v6-run-finish-request'",
  "document.getElementById('gameOverlay')",
  "document.getElementById('overlayPipsValue')",
  "document.getElementById('overlayExpValue')",
  "document.getElementById('ttdMsResultV4')",
  "event.target?.id==='ttdMsExitV4'",
  "event.target?.id==='overlayBtn'",
  'window.TTDMovingScreen.start()',
  'window.TTDMovingScreen?.exit?.()',
])must(shell.includes(marker),`Arcade shell contract missing: ${marker}`);

const shellUrl="'/online/arcade-mode-shell-v1.js?v=1'";
const topologyUrl="'/online/moving-screen-topology-ui-v1.js?v=1'";
must(loader.includes(shellUrl),'Runtime loader must include the Arcade mode shell.');
must(loader.indexOf(topologyUrl)<loader.indexOf(shellUrl),'Arcade mode shell must load after Moving Screen topology/input authority.');
must(startClient.includes('mapKey:message.mapKey||null'),'Run-start client must forward selected Arcade map keys.');
for(const marker of ["'moving_screen'","'king_of_the_hill'","moving_screen:new Set(['neon_rooftops_v2'])","king_of_the_hill:new Set(['neon_rooftops_koth'])",'mapKey,'])must(startServer.includes(marker),`Run-start server is missing Arcade map contract: ${marker}`);
for(const marker of ["explicit === 'arcade'","'moving_screen'","'king_of_the_hill'","family === 'arcade'"])must(progression.includes(marker),`Arcade progression family is missing: ${marker}`);
must(runUi.includes('window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35?.(m)'),'Verified run result must still flow into the canonical native result card.');
for(const marker of ['id="gameOverlay"','id="overlayPipsValue"','id="overlayExpValue"','id="overlayBtn"'])must(game.includes(marker),`Canonical result card source is missing ${marker}.`);

const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=candidates.find(p=>fs.existsSync(p));
must(chrome,'Arcade shell browser smoke requires Chrome/Chromium on the CI runner.');
const shellFileUrl=pathToFileURL(path.join(process.cwd(),shellPath)).href;
const harness=path.join(os.tmpdir(),`ttd-arcade-shell-${process.pid}.html`);

const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
:root{--ink-950:#0a0c14;--ink-900:#12162a;--ink-850:#171c34;--ink-700:#2a3160;--gold:#d9b26a;--gold-glow:#f3d491;--mist:#97a0bd;--mist-dim:#5c6488;--astra-glow:#d4ecfa}*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090b14;color:#fff;font-family:Arial}#app{position:fixed;inset:0}.screen{position:absolute;inset:0;display:none;flex-direction:column;background:#0a0c14}.screen.active{display:flex}.topbar{height:52px;display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid #2a3160}.title{font-weight:bold}.modeBody{flex:1;display:flex;flex-direction:column;gap:12px;padding:16px;justify-content:center}.modeCard{min-height:95px;padding:12px;border:1px solid #2a3160;border-radius:10px}.modeCard button,.backBtn{min-height:38px}.resultTallies{display:flex;flex-direction:column;gap:4px}#gameOverlay{position:absolute;inset:0;z-index:80;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(0,0,0,.9)}#gameOverlay.show{display:flex}#ttdMsResultV4{display:none}#ttdMsResultV4.show{display:block}
</style></head><body><div id="app">
<div id="homeScreen" class="screen"></div>
<div id="deckScreen" class="screen"></div>
<div id="modeScreen" class="screen active"><div class="topbar"><div></div><div class="title">Arcade</div><div></div></div><div class="modeBody">
<div id="ttdMovingScreenCardV4" class="modeCard"><h3>Moving Screen</h3><p>old direct card</p><button>Begin</button></div>
<div id="ttdKingHillCardV4" class="modeCard"><h3>King of the Hill</h3><p>old future card</p><button disabled>Coming Later</button></div>
${Array.from({length:8},(_,i)=>`<div class="modeCard filler">Arcade filler ${i}</div>`).join('')}
</div></div>
<div id="gameScreen" class="screen"><div id="gameOverlay"><h1 id="overlayTitle"></h1><p id="overlayText"></p><div id="overlayStats"></div><div class="resultTallies"><div><span id="overlayPipsValue">0</span><span id="overlayPipsNotes"></span></div><div><span id="overlayExpValue">0</span><span id="overlayExpNotes"></span></div><div id="overlayLevelUp"></div></div><button id="overlayBtn">Continue</button></div><div id="ttdMsResultV4"><div><h2>RUN FAILED</h2><p>All 10 lives were lost.</p><div class="stats"></div><button>Return</button></div></div><button id="ttdMsExitV4">Exit</button></div>
<div id="toast"></div><pre id="testResult">PENDING</pre></div>
<script>
const report={errors:[],beginMessages:0,finishMessages:0};window.addEventListener('error',e=>report.errors.push(String(e.error?.stack||e.message||e.error||'window error')));window.addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason?.stack||e.reason||'unhandled rejection')));
function showScreen(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(name+'Screen')?.classList.add('active')}function toastGlobal(msg){document.getElementById('toast').textContent=msg}function getActiveDeck(){return[{key:'a'},{key:'b'},{key:'c'},{key:'d'},{key:'e'}]}
let movingActive=false,exitCount=0;window.TTDMovingScreen={start(){movingActive=true;showScreen('game')},exit(){movingActive=false;exitCount++;showScreen('mode')},get active(){return movingActive},get state(){return {stopIndex:4,kills:18,killGoal:30,lives:6,flag:'Flag loose'}}};
document.getElementById('overlayBtn').addEventListener('click',()=>{document.getElementById('gameOverlay').classList.remove('show');showScreen('home')});
window.addEventListener('message',event=>{const m=event.data||{};if(m.type==='ttd:v6-run-begin-request'){report.beginMessages++;report.beginMode=m.modeKey;report.beginMap=m.mapKey;setTimeout(()=>window.postMessage({type:'ttd:v6-run-begin-result',requestId:m.requestId,runId:'arcade-test-run'},location.origin),0)}else if(m.type==='ttd:v6-run-finish-request'){report.finishMessages++;report.finishMode=m.overlayKind;report.finishKills=m.kills;setTimeout(()=>window.postMessage({type:'ttd:v6-run-finish-result',requestId:m.requestId,runId:m.runId,pipsEarned:42,xpAwarded:14,modeFamily:'arcade'},location.origin),0)}else if(m.type==='ttd:v6-run-finish-result'){document.getElementById('overlayPipsValue').textContent=String(m.pipsEarned);document.getElementById('overlayExpValue').textContent=String(m.xpAwarded)}});
</script><script src="${shellFileUrl}"></script><script>
const sleep=ms=>new Promise(r=>setTimeout(r,ms));async function run(){try{
 await sleep(120);const modeBody=document.querySelector('#modeScreen .modeBody'),style=getComputedStyle(modeBody);report.arcadeScrollable=style.overflowY==='auto'&&style.touchAction.includes('pan-y');report.arcadeActuallyOverflows=modeBody.scrollHeight>modeBody.clientHeight;
 const movingEntry=document.querySelector('#ttdMovingScreenCardV4 button'),kothEntry=document.querySelector('#ttdKingHillCardV4 button');report.entryCards=!!movingEntry&&!!kothEntry&&movingEntry.textContent.trim()==='Choose Map'&&kothEntry.textContent.trim()==='Choose Map';
 kothEntry.click();await sleep(40);const koth=document.getElementById('kingHillModeScreen');report.kothLanding=koth?.classList.contains('active')===true;report.kothMaps=koth?.querySelectorAll('.ttdArcadeMapCard').length===3;report.kothFuture=[...koth.querySelectorAll('.ttdArcadeMapCard button')].every(b=>b.disabled);koth.querySelector('.ttdArcadeLandingBackV1')?.click();await sleep(20);
 document.querySelector('#ttdMovingScreenCardV4 button')?.click();await sleep(40);const moving=document.getElementById('movingScreenModeScreen');report.movingLanding=moving?.classList.contains('active')===true;report.movingMaps=moving?.querySelectorAll('.ttdArcadeMapCard').length===3;const playable=[...moving.querySelectorAll('.ttdArcadeMapCard button')].filter(b=>!b.disabled);report.onlyNeonPlayable=playable.length===1&&moving.querySelector('[data-map-key="neon_rooftops_v2"] button')===playable[0];
 playable[0]?.click();await sleep(100);report.onlineStart=report.beginMessages===1&&report.beginMode==='moving_screen'&&report.beginMap==='neon_rooftops_v2';report.gameStarted=movingActive&&document.getElementById('gameScreen').classList.contains('active');
 document.getElementById('ttdMsResultV4').classList.add('show');await sleep(120);report.customResultSuppressed=!document.getElementById('ttdMsResultV4').classList.contains('show');report.canonicalResult=document.getElementById('gameOverlay').classList.contains('show');report.finishRequested=report.finishMessages===1&&report.finishMode==='moving_screen'&&report.finishKills===18;await sleep(60);report.verifiedTallies=document.getElementById('overlayPipsValue').textContent==='42'&&document.getElementById('overlayExpValue').textContent==='14';
 document.getElementById('overlayBtn').click();await sleep(50);report.continueHome=document.getElementById('homeScreen').classList.contains('active')===true;report.engineCleaned=!movingActive&&exitCount===1;report.noErrors=report.errors.length===0;
 }catch(error){report.errors.push(String(error?.stack||error))}const checks=['arcadeScrollable','arcadeActuallyOverflows','entryCards','kothLanding','kothMaps','kothFuture','movingLanding','movingMaps','onlyNeonPlayable','onlineStart','gameStarted','customResultSuppressed','canonicalResult','finishRequested','verifiedTallies','continueHome','engineCleaned','noErrors'];report.ok=checks.every(k=>report[k]===true);document.getElementById('testResult').textContent=JSON.stringify(report)}run();
</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';
try{dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=3500','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:30000,stdio:['ignore','pipe','pipe']});}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="testResult">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return Arcade shell smoke results.');
const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
let report;try{report=JSON.parse(decoded);}catch{throw new Error(`Could not parse Arcade shell browser report: ${decoded}`);}
if(!report.ok){console.error('Arcade shell browser smoke failed:',JSON.stringify(report,null,2));process.exit(1);}
console.log('Arcade mode shell verified:',JSON.stringify(report));
