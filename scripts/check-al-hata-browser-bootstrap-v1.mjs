import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const must=(c,m)=>{if(!c)throw new Error(m);};
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
must(chrome,'Al Hata browser bootstrap smoke requires Chrome.');
const port=18000+(process.pid%1000);
const harnessName=`.__ttd-al-hata-bootstrap-${process.pid}.html`;
const harness=path.join(process.cwd(),harnessName);
const html=`<!doctype html><html><body><iframe id="game" srcdoc="<!doctype html><html><head><script>window.addEventListener('error',e=>parent.postMessage({type:'harness-error',message:String(e.message||e.error||'window error')},'*'));window.addEventListener('unhandledrejection',e=>parent.postMessage({type:'harness-error',message:String(e.reason?.message||e.reason||'unhandled rejection')},'*'));<\/script><script src='/online/game-loader.js'><\/script></head><body></body></html>"></iframe><script>
const messages=[],errors=[];let done=false;
window.addEventListener('message',e=>{const m=e.data||{};if(m.type==='ttd:bridge-phase'||m.type==='ttd:bridge-sync-error')messages.push(m);if(m.type==='harness-error')errors.push(m.message);});
function finish(report){if(done)return;done=true;document.body.dataset.report=JSON.stringify(report);}
const started=performance.now();
(function poll(){
  const frame=document.getElementById('game'),w=frame?.contentWindow;
  try{
    const api=!!w?.__TTD_AL_HATA_STAGE1_PLAYTEST_API?.prepareInMapNavigator;
    const core=!!w?.__TTD_AL_HATA_STAGE1_RUNTIME_V1;
    const playtest=!!w?.__TTD_AL_HATA_STAGE1_PLAYTEST_V2;
    const entry=!!w?.__TTD_AL_HATA_PLAYTEST_ENTRY_V3;
    if(api){finish({ok:true,core,playtest,entry,api,messages,errors});return;}
    if(performance.now()-started>12000){finish({ok:false,core,playtest,entry,api,messages,errors});return;}
  }catch(err){errors.push(String(err?.message||err));}
  setTimeout(poll,50);
})();
<\/script></body></html>`;
fs.writeFileSync(harness,html);
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:process.cwd(),stdio:'ignore'});
const waitUntil=Date.now()+600;while(Date.now()<waitUntil)Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,25);
let dom='';
try{
  dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=14000','--dump-dom',`http://127.0.0.1:${port}/${harnessName}`],{encoding:'utf8',timeout:30000});
}finally{
  try{server.kill('SIGTERM');}catch{}
  try{fs.unlinkSync(harness);}catch{}
}
const match=dom.match(/data-report="([^"]+)"/);must(match,'Al Hata browser bootstrap produced no report.');
const report=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'"));
if(!report.ok)console.error('AL_HATA_BROWSER_BOOTSTRAP_FAILURE',JSON.stringify(report,null,2));
must(report.ok,`Al Hata browser bootstrap did not register Navigator API: ${JSON.stringify(report)}`);
console.log('Al Hata browser bootstrap verified:',JSON.stringify({core:report.core,playtest:report.playtest,entry:report.entry,api:report.api}));
