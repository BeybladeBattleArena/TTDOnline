import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
const chrome=candidates.find(p=>fs.existsSync(p));
must(chrome,'Gameplay resource header browser smoke requires Chrome/Chromium.');
const root=process.cwd();
const headerUrl=pathToFileURL(path.join(root,'online/gameplay-resource-header-v1.js')).href;
const harness=path.join(os.tmpdir(),`ttd-gameplay-header-${process.pid}.html`);

const html=`<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#090b14;color:white;font-family:Arial}.screen{display:none}.screen.active{display:block}#gameScreen{width:700px}#hud{display:flex;justify-content:space-between;align-items:center}.hud-left{display:flex;align-items:center;gap:8px}.hud-stats{display:flex;gap:8px}.hud-title{color:#f3d491}.playerHpWrap{display:block}#ttdDriveHud{display:block}
</style></head><body>
<div id="gameScreen" class="screen active"><div id="hud"><div class="hud-left"><button id="endRunBtn">End Run</button><div class="hud-title" id="modeLabel">Dark Monastery · Lower Cloister</div></div><div class="hud-stats"><span>Wave 1</span><span>SP 100</span></div></div><div id="ttdDriveHud">OLD DRIVE HUD</div><div id="playerHpWrap" class="playerHpWrap">OLD PLAYER HP</div></div><pre id="result">PENDING</pre>
<script>
var mockDrive=0;var mockDp=45;var account={playerStats:{hp:50,dp:45}};var state={running:false,__ttdMissionIntroHold:true,showPlayerHpBar:true,lives:50,livesMax:50};
window.__TTD_OVERDRIVE={playerStats:()=>({hp:50,dp:45,luck:0}),dp:()=>({current:mockDp,max:45}),drive:()=>({current:mockDrive,max:100})};
</script><script src="${headerUrl}"></script><script>
const report={errors:[]};let firstState=state;
window.addEventListener('error',e=>report.errors.push(String(e.error?.stack||e.message||e.error||'window error')));
const msStyle=document.createElement('style');msStyle.textContent='#gameScreen.ttd-moving-screen-v4 .hud-left>*:not(#modeLabel):not(#endRunBtn){display:none!important}';document.head.appendChild(msStyle);
function ratio(kind){const host=document.getElementById('ttdGameplayHeaderMetersV1'),row=host?.querySelector('.'+kind),track=row?.querySelector('.track'),fill=row?.querySelector('.fill');const tw=track?.getBoundingClientRect().width||0,fw=fill?.getBoundingClientRect().width||0;return tw>0?fw/tw:0;}
setTimeout(()=>{try{const api=window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1_API;report.slot=!!document.getElementById('ttdGameplayHeaderSlotV1');report.titleFirst=api?.metersVisible===false;report.oldDriveHidden=getComputedStyle(document.getElementById('ttdDriveHud')).display==='none';report.oldHpHidden=getComputedStyle(document.getElementById('playerHpWrap')).display==='none';report.hpStartsFilled=ratio('hp')>.9;report.dpStartsFilled=ratio('dp')>.9;report.driveStartsEmpty=ratio('drive')<.03;}catch(e){report.errors.push(String(e));}},160);
setTimeout(()=>{try{state.__ttdMissionIntroHold=false;state.running=true;const sig=document.createElement('div');sig.id='ttdGameSignalV6';sig.innerHTML='<div class="ttdStartWord in">START!</div>';document.body.appendChild(sig);}catch(e){report.errors.push(String(e));}},260);
setTimeout(()=>{try{const api=window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1_API,host=document.getElementById('ttdGameplayHeaderMetersV1');report.startCrossfade=api?.metersVisible===true&&document.getElementById('ttdGameplayHeaderSlotV1')?.classList.contains('meters-on');report.hp=host?.querySelector('.hp .value')?.textContent==='50 / 50';report.dp=host?.querySelector('.dp .value')?.textContent==='45 / 45';report.drive=host?.querySelector('.drive .value')?.textContent==='0%';report.hpVisibleFilled=ratio('hp')>.9;report.dpVisibleFilled=ratio('dp')>.9;report.driveVisibleEmpty=ratio('drive')<.03;mockDrive=65;document.getElementById('ttdGameSignalV6')?.remove();}catch(e){report.errors.push(String(e));}},620);
setTimeout(()=>{try{const host=document.getElementById('ttdGameplayHeaderMetersV1'),fill=host?.querySelector('.drive .fill');report.driveGrows=host?.querySelector('.drive .value')?.textContent==='65%'&&fill?.style.width==='65%'&&ratio('drive')>.05;}catch(e){report.errors.push(String(e));}},760);
setTimeout(()=>{try{document.getElementById('modeLabel').textContent='Temple Summit';}catch(e){report.errors.push(String(e));}},820);
setTimeout(()=>{try{const api=window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1_API;report.areaReshown=api?.metersVisible===false&&Number(api?.areaReveals)>=1;}catch(e){report.errors.push(String(e));}},1000);
setTimeout(()=>{try{const api=window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1_API;report.areaReturnedToMeters=api?.metersVisible===true;const game=document.getElementById('gameScreen');game.classList.add('ttd-moving-screen-v4');report.movingScreenVisible=getComputedStyle(document.getElementById('ttdGameplayHeaderSlotV1')).display!=='none';}catch(e){report.errors.push(String(e));}},2160);
setTimeout(()=>{try{const game=document.getElementById('gameScreen');game.classList.remove('ttd-moving-screen-v4');mockDrive=0;mockDp=45;state={running:false,__ttdMissionIntroHold:true,showPlayerHpBar:false,lives:10,livesMax:10};document.getElementById('modeLabel').textContent='ENDLESS HORDE';}catch(e){report.errors.push(String(e));}},2240);
setTimeout(()=>{try{const api=window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1_API;report.secondRunTitle=api?.activeState===state&&api?.metersVisible===false&&state!==firstState;report.secondRunHpSeed=ratio('hp')>.9;report.secondRunDpSeed=ratio('dp')>.9;report.secondRunDriveSeed=ratio('drive')<.03;}catch(e){report.errors.push(String(e));}},2450);
setTimeout(()=>{try{state.__ttdMissionIntroHold=false;state.running=true;const sig=document.createElement('div');sig.id='ttdGameSignalV6';sig.innerHTML='<div class="ttdStartWord in">START!</div>';document.body.appendChild(sig);}catch(e){report.errors.push(String(e));}},2520);
setTimeout(()=>{try{const api=window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1_API;report.secondRunMeters=api?.metersVisible===true&&Number(api?.startTransitions)>=3;report.noErrors=report.errors.length===0;const checks=['slot','titleFirst','oldDriveHidden','oldHpHidden','hpStartsFilled','dpStartsFilled','driveStartsEmpty','startCrossfade','hp','dp','drive','hpVisibleFilled','dpVisibleFilled','driveVisibleEmpty','driveGrows','areaReshown','areaReturnedToMeters','movingScreenVisible','secondRunTitle','secondRunHpSeed','secondRunDpSeed','secondRunDriveSeed','secondRunMeters','noErrors'];report.ok=checks.every(k=>report[k]===true);document.getElementById('result').textContent=JSON.stringify(report);}catch(e){report.errors.push(String(e));}},2960);
</script></body></html>`;
fs.writeFileSync(harness,html);
let dom='';try{dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--allow-file-access-from-files','--window-size=700,500','--virtual-time-budget=3500','--dump-dom',pathToFileURL(harness).href],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:45000,stdio:['ignore','pipe','pipe']});}finally{try{fs.unlinkSync(harness);}catch{}}
const match=dom.match(/<pre id="result">([\s\S]*?)<\/pre>/i);must(match,'Headless Chrome did not return gameplay header smoke results.');const decoded=match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');let report;try{report=JSON.parse(decoded);}catch{throw new Error(`Could not parse gameplay header report: ${decoded}`);}if(!report.ok){console.error('Gameplay resource header smoke failed:',JSON.stringify(report,null,2));process.exit(1);}console.log('Gameplay resource header smoke passed:',JSON.stringify(report));
