import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const shellPath='online/arcade-mode-shell-v2.js';
const shell=fs.readFileSync(shellPath,'utf8');
for(const marker of [
  'function returnToArcade(event)',
  "if(activateLanding('modeScreen')){ownArcadeCards();return true;}",
  "addEventListener('click',returnToArcade)",
])must(shell.includes(marker),`Arcade submenu Back contract missing: ${marker}`);
must(!shell.includes("addEventListener('click',()=>showCore('mode'))"),'Dynamic Arcade landing screens must not rely on the static core screen registry for Back.');

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
must(chrome,'Arcade submenu Back smoke requires Chrome/Chromium.');
const shellUrl=pathToFileURL(path.join(process.cwd(),shellPath)).href;
const harness=path.join(os.tmpdir(),`ttd-arcade-back-${process.pid}.html`);
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}.screen{position:absolute;inset:0;display:none;flex-direction:column}.screen.active{display:flex}.topbar{height:52px;display:flex;justify-content:space-between}.modeBody{flex:1;overflow:auto}.modeCard{min-height:90px}
</style></head><body><div id="app"><div id="homeScreen" class="screen"></div><div id="deckScreen" class="screen"></div><div id="modeScreen" class="screen active"><div class="modeBody"><div id="ttdMovingScreenCardV4" class="modeCard"><button>Begin</button></div><div id="ttdKingHillCardV4" class="modeCard"><button>Later</button></div></div></div><div id="gameScreen" class="screen"></div><div id="toast"></div><pre id="result">PENDING</pre></div><script>
const report={errors:[]};addEventListener('error',e=>report.errors.push(String(e.message||e.error)));addEventListener('unhandledrejection',e=>report.errors.push(String(e.reason)));
const screens={home:document.getElementById('homeScreen'),deck:document.getElementById('deckScreen'),mode:document.getElementById('modeScreen'),game:document.getElementById('gameScreen')};
function showScreen(name){Object.values(screens).forEach(s=>s.classList.remove('active'));screens[name]?.classList.add('active')}
function toastGlobal(){}function getActiveDeck(){return[{},{},{},{},{}]}
</script><script src="${shellUrl}"></script><script>
const sleep=ms=>new Promise(r=>setTimeout(r,ms));async function run(){try{await sleep(80);
const movingEntry=document.querySelector('#ttdMovingScreenCardV4 button');const kothEntry=document.querySelector('#ttdKingHillCardV4 button');
kothEntry.click();await sleep(20);const koth=document.getElementById('kingHillModeScreen');report.kothOpened=koth?.classList.contains('active')===true;report.modeInactiveUnderKoth=!document.getElementById('modeScreen').classList.contains('active');koth.querySelector('.ttdArcadeLandingBackV1').click();await sleep(20);report.kothClosed=!koth.classList.contains('active');report.kothBack=document.getElementById('modeScreen').classList.contains('active')===true;
movingEntry.click();await sleep(20);const moving=document.getElementById('movingScreenModeScreen');report.movingOpened=moving?.classList.contains('active')===true;report.modeInactiveUnderMoving=!document.getElementById('modeScreen').classList.contains('active');moving.querySelector('.ttdArcadeLandingBackV1').click();await sleep(20);report.movingClosed=!moving.classList.contains('active');report.movingBack=document.getElementById('modeScreen').classList.contains('active')===true;
report.singleActiveAfterBack=document.querySelectorAll('.screen.active').length===1;report.noErrors=report.errors.length===0;}catch(error){report.errors.push(String(error?.stack||error))}
const checks=['kothOpened','modeInactiveUnderKoth','kothClosed','kothBack','movingOpened','modeInactiveUnderMoving','movingClosed','movingBack','singleActiveAfterBack','noErrors'];report.ok=checks.every(k=>report[k]===true);document.getElementById('result').textContent=JSON.stringify(report)}run();
</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';try{dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=1200','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:4*1024*1024,timeout:20000,stdio:['ignore','pipe','pipe']});}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="result">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return Arcade submenu Back results.');const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');const report=JSON.parse(decoded);if(!report.ok){console.error('Arcade submenu Back smoke failed:',JSON.stringify(report,null,2));process.exit(1);}console.log('Arcade submenu Back verified:',JSON.stringify(report));