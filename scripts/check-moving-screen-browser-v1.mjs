import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=candidates.find(p=>fs.existsSync(p));
must(chrome,'Moving Screen browser smoke requires Chrome/Chromium on the CI runner.');

const root=process.cwd();
const stageUrl=pathToFileURL(path.join(root,'online/moving-screen-neon-rooftops-v2.js')).href;
const engineUrl=pathToFileURL(path.join(root,'online/moving-screen-engine-v4.js')).href;
const harness=path.join(os.tmpdir(),`ttd-moving-screen-${process.pid}.html`);

const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090b14;color:white;font-family:Arial,sans-serif}#app{position:fixed;inset:0}.screen{position:absolute;inset:0;display:none;flex-direction:column;min-height:0}.screen.active{display:flex!important}#modeScreen .modeBody{padding:10px}.modeCard{padding:8px;border:1px solid #555}.modeCard button{min-height:40px}#hud{display:flex;gap:8px;padding:8px;height:54px;flex:0 0 54px}.hud-stat{display:flex;gap:4px}.label{opacity:.7}#laneWrap{position:relative;height:33vh;min-height:160px;max-height:235px;flex-shrink:0}#laneCanvas{width:100%;height:100%}#boardWrap{height:250px;flex:1 1 auto}#tray{min-height:110px;flex-shrink:0}.toast{position:fixed;left:0;top:0}#testResult{white-space:pre-wrap;font-size:10px}
</style></head><body><div id="app">
<div id="modeScreen" class="screen active"><div class="modeBody"></div></div>
<div id="deckScreen" class="screen"></div>
<div id="gameScreen" class="screen"><div id="hud"><div id="modeLabel">Arcade</div><div class="hud-stat sp"><span class="label">SP</span><span id="spVal">0</span></div><div class="hud-stat wave"><span class="label">Wave</span><span id="waveVal">0</span></div><div class="hud-stat lives"><span class="label">Lives</span><span id="livesVal">0</span></div><div id="killsStat"></div><div id="coinsStat"></div><button id="pauseBtn"></button><button id="endRunBtn"></button></div><div id="laneWrap"><canvas id="laneCanvas"></canvas></div><div id="boardWrap"></div><div id="tray"><div id="deckRow">legacy tray</div><button id="summonBtn">legacy summon</button></div></div>
<div id="toast" class="toast"></div></div><pre id="testResult">PENDING</pre>
<script>
window.requestAnimationFrame=cb=>setTimeout(()=>cb(performance.now()),16);window.cancelAnimationFrame=id=>clearTimeout(id);
var DICE={fire:{name:'Fire',hp:70,dmg:10,atk:.8,color:'#e86a4d',glow:'#ffd09e',special:{range:'mid'}},ice:{name:'Ice',hp:72,dmg:9,atk:.9,color:'#77bbee',glow:'#d8f4ff',special:{range:'mid'}},wind:{name:'Wind',hp:66,dmg:8,atk:.72,color:'#7fd9a2',glow:'#e4fff0',special:{range:'mid'}},earth:{name:'Earth',hp:90,dmg:8,atk:1.0,color:'#b98b5c',glow:'#ffe0b8',special:{range:'close'}},light:{name:'Light',hp:60,dmg:11,atk:.75,color:'#e5d36d',glow:'#fff8c9',special:{range:'midfar'}}};
function getActiveDeck(){return[{key:'fire'},{key:'ice'},{key:'wind'},{key:'earth'},{key:'light'}]};function findInstance(){return null};function toastGlobal(msg){document.getElementById('toast').textContent=msg};function showScreen(name){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));document.getElementById(name+'Screen')?.classList.add('active')};window.TTDGamePresentation={presentOutcome:(kind,opts={})=>{opts.reveal?.();},showFail:()=>{},showClear:()=>{}};
</script><script src="${stageUrl}"></script><script src="${engineUrl}"></script><script>
const report={errors:[]};window.addEventListener('error',e=>report.errors.push(String(e.error?.stack||e.message||e.error||'window error')));window.addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason?.stack||e.reason||'unhandled rejection')));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 try{
  await sleep(80);
  const card=document.querySelector('#ttdMovingScreenCardV4 button');report.card=!!card;card?.click();
  await sleep(220);
  const game=document.getElementById('gameScreen'),summon=document.getElementById('ttdMsSummonV4'),lane=document.getElementById('laneWrap'),controls=document.getElementById('ttdMsControlsV4'),canvas=document.getElementById('ttdMovingScreenCanvasV4');
  const sr=summon?.getBoundingClientRect(),lr=lane?.getBoundingClientRect(),cr=controls?.getBoundingClientRect(),state=window.TTDMovingScreen?.state;
  report.gameActive=game?.classList.contains('active')===true;
  report.usesGameShell=game?.classList.contains('ttd-moving-screen-v4')===true;
  report.gameDisplayFlex=getComputedStyle(game).display==='flex';
  report.canvas=!!canvas;
  report.legacyBoardHidden=getComputedStyle(document.getElementById('boardWrap')).display==='none';
  report.controlsVisible=!!cr&&cr.width>80&&cr.height>45&&cr.top>=0&&cr.bottom<=innerHeight+1;
  report.controlsBelowBattlefield=!!lr&&!!cr&&lr.height>0&&lr.bottom<=cr.top+12&&cr.top>lr.top+lr.height*.80;
  report.controlsNearBottom=!!cr&&cr.bottom>=innerHeight-12;
  report.summonVisible=!!sr&&sr.width>70&&sr.height>40&&sr.top>=0&&sr.bottom<=innerHeight+1;
  report.summonEnabled=summon?.disabled===false;
  report.battlefieldTall=!!lr&&lr.height>innerHeight*.55;
  report.canvasCssTall=!!canvas&&canvas.getBoundingClientRect().height>innerHeight*.55;
  report.canvasBitmapSized=!!canvas&&canvas.width>=300&&canvas.height>=300;
  let pixelAlpha=0;try{const cx=Math.max(0,Math.min(canvas.width-1,Math.floor(canvas.width*.5))),cy=Math.max(0,Math.min(canvas.height-1,Math.floor(canvas.height*.5)));pixelAlpha=canvas.getContext('2d').getImageData(cx,cy,1,1).data[3];}catch(error){report.errors.push(String(error?.stack||error));}
  report.canvasPainted=pixelAlpha>0;
  report.runtimeViewportMatchesLane=!!state?.viewport&&Math.abs(state.viewport.h-lr.height)<3&&state.viewport.h>innerHeight*.55&&Math.abs(state.viewport.w-lr.width)<3;
  report.openingState=state;
  summon?.click();await sleep(240);
  report.afterSummon=window.TTDMovingScreen?.state;
  report.summoned=report.afterSummon?.players===1;

  let firstRoute=document.querySelector('#ttdMsRoutesV4 .ttdMsRouteBtnV4');report.firstRouteVisible=!!firstRoute;firstRoute?.click();await sleep(520);
  const branchButtons=[...document.querySelectorAll('#ttdMsRoutesV4 .ttdMsRouteBtnV4')];
  report.crossroadChoices=branchButtons.length>=2;
  const awning=branchButtons.find(b=>/awning/i.test(b.textContent||''));report.awningChoiceVisible=!!awning;awning?.click();await sleep(750);
  report.branchTraversalSurvived=window.TTDMovingScreen?.state?.players===1&&report.errors.length===0;

  await sleep(2200);
  report.simulationAdvanced=(window.TTDMovingScreen?.state?.sp||0)>60;
  report.aiCrossroadSurvived=report.errors.length===0&&window.TTDMovingScreen?.state?.enemies>=1;
  document.getElementById('ttdMsExitV4')?.click();await sleep(100);
  report.manualReturn=document.getElementById('modeScreen')?.classList.contains('active')===true&&!document.getElementById('ttdMsControlsV4');

  document.querySelector('#ttdMovingScreenCardV4 button')?.click();await sleep(150);
  report.secondStart=window.TTDMovingScreen?.state?.players===0;
  await sleep(8350);
  const result=document.getElementById('ttdMsResultV4'),resultButton=result?.querySelector('button');
  report.failResultVisible=result?.classList.contains('show')===true&&!!resultButton;
  if(report.failResultVisible)resultButton.click();
  await sleep(120);
  report.failReturn=document.getElementById('modeScreen')?.classList.contains('active')===true&&!document.getElementById('ttdMsResultV4');
  report.noRuntimeErrors=report.errors.length===0;
 }catch(error){report.errors.push(String(error?.stack||error));}
 const checks=['card','gameActive','usesGameShell','gameDisplayFlex','canvas','legacyBoardHidden','controlsVisible','controlsBelowBattlefield','controlsNearBottom','summonVisible','summonEnabled','battlefieldTall','canvasCssTall','canvasBitmapSized','canvasPainted','runtimeViewportMatchesLane','summoned','firstRouteVisible','crossroadChoices','awningChoiceVisible','branchTraversalSurvived','simulationAdvanced','aiCrossroadSurvived','manualReturn','secondStart','failResultVisible','failReturn','noRuntimeErrors'];
 report.ok=checks.every(k=>report[k]===true);document.getElementById('testResult').textContent=JSON.stringify(report);
}
run();
</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';
try{
  dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=14500','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:45000,stdio:['ignore','pipe','pipe']});
}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="testResult">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return Moving Screen smoke results.');
const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
let report;try{report=JSON.parse(decoded);}catch{throw new Error(`Could not parse browser report: ${decoded}`);}
if(!report.ok){console.error('Moving Screen phone-browser smoke failed:',JSON.stringify(report,null,2));process.exit(1);}
console.log('Moving Screen phone-browser smoke passed:',JSON.stringify(report));