import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import * as espree from 'espree';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const files={
  online:'online.html',shell:'online/shell-ui-v9.js',router:'online/moving-screen-map-router-v2.js',
  gate:'online/startup-gate-v33.js',frame:'online/moving-screen-mobile-frame-v2.js',hud:'online/moving-screen-battle-hud-v1.js',
  input:'online/moving-screen-die-input-v1.js',run:'online/singleplayer-run-controls-v1.js'
};
const src=Object.fromEntries(Object.entries(files).map(([key,file])=>[key,fs.readFileSync(file,'utf8')]));
for(const key of ['shell','router','gate','frame','hud','input','run'])espree.parse(src[key],{ecmaVersion:'latest',sourceType:'script'});
must(src.online.includes('height:var(--ttd-visual-vh,100dvh);min-height:0;max-height:var(--ttd-visual-vh,100dvh)'),'Online shell must be constrained to the real visual viewport.');
must(!src.online.includes('.shell{height:100dvh;min-height:100vh'),'Layout-viewport min-height regression would hide Moving Screen controls under Android browser chrome.');
for(const marker of ['window.visualViewport','--ttd-visual-vh','ttdVisualViewportV1'])must(src.online.includes(marker),`Visual viewport contract missing: ${marker}`);
must(src.gate.includes("'/assets/ui/loading-moving-screen.png'"),'Moving Screen loading art must use the established startup image preload.');
for(const marker of ['LOADING_DECODE_MAX_MS=2500','img.loading=\'eager\'','img.decode()','Promise.all([sleep(LOADING_MIN_MS)','startPresentationSync()','announceActive(true)'])must(src.router.includes(marker),`Decoded loading transition contract missing: ${marker}`);
must(!src.router.includes('requestAnimationFrame(tick)'),'Moving Screen presentation sync may not run as a permanent animation-frame loop.');
must(!src.frame.includes('observe(root,{subtree:true'),'Moving Screen mobile frame may not observe the full app subtree.');
must(!src.hud.includes('setInterval(sync,120)'),'Moving Screen battle HUD may not poll at the retired 120 ms cadence.');
must(src.hud.includes("window.addEventListener('ttd:moving-screen-active'")&&src.hud.includes('setInterval(sync,220)'),'Moving Screen HUD polling must be active-run scoped.');
must(src.input.includes('observer.disconnect()'),'Die input observer must disconnect after lane binding.');
must(!src.run.includes('setInterval(sync,240)')&&!src.run.includes('observe(document.documentElement,{subtree:true'),'Single-player run controls may not poll/observe the entire gameplay document.');
must(src.shell.includes("message.type === 'ttd:moving-screen-active'"),'Online account shell must collapse explicitly for Moving Screen.');

const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
must(chrome,'Moving Screen Android viewport smoke requires Chrome/Chromium.');
const frameUrl=pathToFileURL(path.join(process.cwd(),files.frame)).href;
const hudUrl=pathToFileURL(path.join(process.cwd(),files.hud)).href;
const harness=path.join(os.tmpdir(),`ttd-ms-mobile-runtime-${process.pid}.html`);
const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#02040b;color:#fff}#app{position:fixed;inset:0}.screen{position:absolute;inset:0;display:flex;flex-direction:column;min-height:0}#hud{display:flex;flex:0 0 auto;min-height:58px}.hud-left{display:flex;flex:1}.hud-stats{display:flex}#laneWrap{position:relative;flex:1 1 0;min-height:0;background:#111}#tray{display:flex;flex-direction:column;flex:0 0 auto;background:#060914}#ttdMsControlsV4{display:grid;min-height:50px}#ttdMsSummonV4{min-height:50px}</style></head><body><div id="app"><div id="gameScreen" class="screen active ttd-moving-screen-v4"><div id="hud"><div class="hud-left"><button id="pauseBtn">Back</button><button id="endRunBtn">End Run</button><div id="modeLabel">Moving Screen · Construction Climb</div></div><div class="hud-stats"><span>0/30</span><span>70</span><span>10</span></div></div><div id="laneWrap"><canvas></canvas></div><div id="tray"><div id="ttdMsControlsV4"><div>Tap a Die to select it.</div><div id="ttdMsButtonsV4"><button id="ttdMsSummonV4">SUMMON</button></div></div></div></div><pre id="result">PENDING</pre></div><script>window.__errs=[];addEventListener('error',e=>__errs.push(String(e.message||e.error)));window.TTDMovingScreen={active:true,stage:{name:'Construction Climb'},state:{od:{drive:0,driveMax:100,dp:45,maxDp:45}},activateOverdriveSlot(){}};window.getActiveDeck=()=>['a','b','c','d','e'].map(key=>({key}));window.DICE=Object.fromEntries(['a','b','c','d','e'].map(key=>[key,{name:key.toUpperCase()}]));window.renderGlyph=()=>'<span>◆</span>';window.account={activeDeckIdx:0,overdriveDecks:[[null,null]]};window.__TTD_OVERDRIVE={equipped:()=>[null,null],catalog:()=>({dice:{}})};</script><script src="${frameUrl}"></script><script src="${hudUrl}"></script><script>setTimeout(()=>{const game=document.getElementById('gameScreen'),tray=document.getElementById('tray'),bar=document.getElementById('ttdMsBattleBarV1'),summon=document.getElementById('ttdMsSummonV4'),lane=document.getElementById('laneWrap');const gr=game.getBoundingClientRect(),tr=tray.getBoundingClientRect(),br=bar?.getBoundingClientRect(),sr=summon.getBoundingClientRect(),lr=lane.getBoundingClientRect();const report={innerHeight,gameBottom:gr.bottom,trayBottom:tr.bottom,barBottom:br?.bottom||9999,summonBottom:sr.bottom,laneHeight:lr.height,barPresent:!!bar,summonVisible:sr.width>0&&sr.height>0,gameInside:gr.bottom<=innerHeight+.5,trayInside:tr.bottom<=innerHeight+.5,barInside:(br?.bottom||9999)<=innerHeight+.5,summonInside:sr.bottom<=innerHeight+.5,laneUsable:lr.height>250,noErrors:__errs.length===0};report.ok=['barPresent','summonVisible','gameInside','trayInside','barInside','summonInside','laneUsable','noErrors'].every(k=>report[k]===true);document.getElementById('result').textContent=JSON.stringify(report);},420);</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';try{dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-component-update','--disable-default-apps','--no-first-run','--allow-file-access-from-files','--window-size=390,650','--virtual-time-budget=1400','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:4*1024*1024,timeout:40000,stdio:['ignore','pipe','pipe']});}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="result">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return Moving Screen Android viewport results.');const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');const report=JSON.parse(decoded);if(!report.ok){console.error('Moving Screen Android viewport smoke failed:',JSON.stringify(report,null,2));process.exit(1);}console.log('Moving Screen Android viewport + runtime pacing verified:',JSON.stringify(report));
