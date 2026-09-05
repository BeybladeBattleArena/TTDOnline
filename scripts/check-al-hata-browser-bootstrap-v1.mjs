import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';

const must=(c,m)=>{if(!c)throw new Error(m);};
const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
must(chrome,'Al Hata browser bootstrap smoke requires Chrome.');
const port=18000+(process.pid%1000);
const harnessName=`.__ttd-al-hata-bootstrap-${process.pid}.html`;
const innerName=`.__ttd-al-hata-inner-${process.pid}.html`;
const harness=path.join(process.cwd(),harnessName),inner=path.join(process.cwd(),innerName);
const innerHtml=`<!doctype html><html><head><script>window.addEventListener('error',e=>parent.postMessage({type:'harness-error',message:String(e.message||e.error||'window error')},location.origin));window.addEventListener('unhandledrejection',e=>parent.postMessage({type:'harness-error',message:String(e.reason?.message||e.reason||'unhandled rejection')},location.origin));<\/script><script src="/online/game-loader.js"><\/script></head><body></body></html>`;
const html=`<!doctype html><html><body><iframe id="game" style="width:412px;height:820px" src="/${innerName}"></iframe><script>
const messages=[],errors=[];let done=false,launched=false,launchAt=0,promptAt=0,tappedAt=0,snapshot=null,topmost=false,forcedResumeRejected=false,stableWhileWaiting=false,driveStable=false,touchDiag=null,directChecked=false;
window.addEventListener('message',e=>{
  const m=e.data||{};
  if(m.type==='ttd:bridge-phase'||m.type==='ttd:bridge-sync-error'||m.type==='ttd:bridge-loader-error')messages.push(m);
  if(m.type==='harness-error')errors.push(m.message);
  if(m.type==='ttd:v6-run-begin-request'){
    const frame=document.getElementById('game');
    setTimeout(()=>frame?.contentWindow?.postMessage({type:'ttd:v6-run-begin-result',requestId:m.requestId,runId:'harness-al-hata-run'},location.origin),0);
  }
});
function finish(report){if(done)return;done=true;document.body.dataset.report=JSON.stringify(report);}
function driveText(w){return String(w?.document?.querySelector('#ttdDriveHud .ttdMeterLine.drive .value')?.textContent||'').trim();}
function hitStack(w,button){
  if(!button)return[];const r=button.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  return (w.document.elementsFromPoint?.(x,y)||[]).slice(0,12).map(el=>{const s=w.getComputedStyle(el);return{tag:el.tagName,id:el.id||'',class:String(el.className||''),pointerEvents:s.pointerEvents,zIndex:s.zIndex,position:s.position,display:s.display,visibility:s.visibility};});
}
function buttonIsTopmost(w,button){if(!button)return false;const r=button.getBoundingClientRect();const el=w.document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return el===button||button.contains(el);}
function readTouchDiag(w){
  try{return{
    activateFn:typeof w.AH_PLAYTEST_activateNavigatorPrompt,
    createFn:typeof w.AH_PLAYTEST_createNavigator,
    alHataFn:typeof w.AH_isState,
    alHata:typeof w.AH_isState==='function'?!!w.AH_isState():null,
    boardCount:Array.isArray(w.state?.board)?w.state.board.filter(Boolean).length:-1,
    missionHold:w.state?.__ttdMissionIntroHold,
    running:w.state?.running,
    prompt:!!w.document?.getElementById('ttdAhInMapNavigatorPromptV2'),
    awaiting:!!w.document?.getElementById('gameScreen')?.classList.contains('ttd-ah-awaiting-navigator')
  };}catch(err){return{diagError:String(err?.message||err)};}
}
const started=performance.now();
(function poll(){
  const frame=document.getElementById('game'),w=frame?.contentWindow,now=performance.now();
  try{
    const api=!!w?.__TTD_AL_HATA_STAGE1_PLAYTEST_API?.prepareInMapNavigator;
    const core=!!w?.__TTD_AL_HATA_STAGE1_RUNTIME_V1;
    const playtest=!!w?.__TTD_AL_HATA_STAGE1_PLAYTEST_V2;
    const entry=!!w?.__TTD_AL_HATA_PLAYTEST_ENTRY_V3;
    const deckReady=Array.isArray(w?.account?.decks?.[0])&&w.account.decks[0].filter(Boolean).length===5;
    const homeReady=!!w?.document?.getElementById('homeScreen')?.classList.contains('active');
    if(!launched&&api&&entry&&deckReady&&homeReady&&typeof w.startAdventureCampaign==='function'){
      w.startAdventureCampaign('al_hata','normal');launched=true;launchAt=now;
    }
    const run=w?.state,prompt=w?.document?.getElementById('ttdAhInMapNavigatorPromptV2'),button=prompt?.querySelector('.ttdAhNavButton');
    if(launched&&prompt&&run&&!promptAt){
      promptAt=now;
      snapshot={wave:Number(run.wave),lives:Number(run.lives),time:Number(run.time),drive:driveText(w)};
      run.running=true;
      forcedResumeRejected=run.running===false;
    }
    if(promptAt&&!tappedAt&&now-promptAt>=2600&&prompt&&run){
      stableWhileWaiting=Number(run.wave)===snapshot.wave&&Number(run.lives)===snapshot.lives&&Math.abs(Number(run.time)-snapshot.time)<0.001;
      driveStable=driveText(w)===snapshot.drive;
      topmost=buttonIsTopmost(w,button);
      if(!forcedResumeRejected||!stableWhileWaiting||!driveStable){
        finish({ok:false,reason:'cove-not-frozen',core,playtest,entry,api,forcedResumeRejected,stableWhileWaiting,driveStable,topmost,touchDiag:readTouchDiag(w),hitStack:hitStack(w,button),buttonRect:button?.getBoundingClientRect?.().toJSON?.()||null,snapshot,current:{wave:run.wave,lives:run.lives,time:run.time,drive:driveText(w),running:run.running},messages,errors});return;
      }
      if(topmost){
        touchDiag={before:readTouchDiag(w)};
        const E=w.PointerEvent||w.MouseEvent;
        button.dispatchEvent(new E('pointerdown',{bubbles:true,cancelable:true,pointerId:1,pointerType:'touch',clientX:button.getBoundingClientRect().left+5,clientY:button.getBoundingClientRect().top+5}));
        touchDiag.afterDispatch=readTouchDiag(w);
        tappedAt=now;
      }
    }
    if(tappedAt&&run&&!directChecked&&now-tappedAt>=500){
      directChecked=true;
      const actualCount=(run.board||[]).filter(Boolean).length;
      touchDiag={...(touchDiag||{}),after500:readTouchDiag(w),actualTouchCreated:actualCount===1};
      if(actualCount===0){
        let directResult=null,directError='';
        try{directResult=typeof w.AH_PLAYTEST_createNavigator==='function'?w.AH_PLAYTEST_createNavigator(run):null;}catch(err){directError=String(err?.stack||err?.message||err);}
        touchDiag.directResult=directResult;
        touchDiag.directError=directError;
        touchDiag.afterDirect=readTouchDiag(w);
        finish({ok:false,reason:'navigator-touch-not-delivered',core,playtest,entry,api,forcedResumeRejected,stableWhileWaiting,driveStable,topmost,touchDiag,wave:run.wave,lives:run.lives,messages,errors});return;
      }
    }
    if(tappedAt&&run&&now-tappedAt>=3200){
      const promptGone=!w.document.getElementById('ttdAhInMapNavigatorPromptV2');
      const navigatorCount=(run.board||[]).filter(Boolean).length;
      const platform=!!w.document.getElementById('ttdPlatformCanvas')&&w.document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode');
      const controllerUnlocked=!w.document.getElementById('gameScreen')?.classList.contains('ttd-ah-awaiting-navigator');
      const missionReleased=run.__ttdMissionIntroHold===false;
      const nativeBattlePaused=run.running===false;
      touchDiag={...(touchDiag||{}),afterWait:readTouchDiag(w)};
      const ok=promptGone&&navigatorCount===1&&platform&&controllerUnlocked&&missionReleased&&nativeBattlePaused&&Number(run.wave)===1&&Number(run.lives)===snapshot.lives;
      finish({ok,reason:ok?'ready':'navigator-touch-or-traversal-release-failed',core,playtest,entry,api,forcedResumeRejected,stableWhileWaiting,driveStable,topmost,promptGone,navigatorCount,platform,controllerUnlocked,missionReleased,nativeBattlePaused,wave:run.wave,lives:run.lives,touchDiag,messages,errors});return;
    }
    if(now-started>22000){
      const recovery=w?.document?.getElementById('ttdAhCoveRecoveryV3');
      finish({ok:false,reason:'timeout',core,playtest,entry,api,launched,prompt:!!prompt,homeReady,forcedResumeRejected,stableWhileWaiting,driveStable,topmost,touchDiag:readTouchDiag(w),hitStack:hitStack(w,button),pending:!!w?.__TTD_AL_HATA_PLAYTEST_IN_MAP_NAV_PENDING,gameActive:!!w?.document?.getElementById('gameScreen')?.classList.contains('active'),platformMode:!!w?.document?.getElementById('gameScreen')?.classList.contains('ttd-platform-mode'),platformCanvas:!!w?.document?.getElementById('ttdPlatformCanvas'),missionShield:!!w?.document?.getElementById('ttdMissionHoldShieldV6'),recovery:recovery?.textContent?.replace(/\s+/g,' ').trim()||'',modeLabel:w?.document?.getElementById('modeLabel')?.textContent||'',state:run?{adventure:!!run.adventure,stage:run.adventureStage?.name||'',stageIdx:run.adventureStageIdx,running:run.running,wave:run.wave,lives:run.lives,missionHold:run.__ttdMissionIntroHold,alHata:run.__ttdAlHataStage1}:null,messages,errors});return;
    }
  }catch(err){errors.push(String(err?.stack||err?.message||err));}
  setTimeout(poll,50);
})();
<\/script></body></html>`;
fs.writeFileSync(inner,innerHtml);fs.writeFileSync(harness,html);
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:process.cwd(),stdio:'ignore'});
const waitUntil=Date.now()+600;while(Date.now()<waitUntil)Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,25);
let dom='';
try{
  dom=execFileSync(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=24000','--dump-dom',`http://127.0.0.1:${port}/${harnessName}`],{encoding:'utf8',timeout:40000});
}finally{
  try{server.kill('SIGTERM');}catch{}
  for(const file of [harness,inner])try{fs.unlinkSync(file);}catch{}
}
const match=dom.match(/data-report="([^"]+)"/);must(match,'Al Hata browser bootstrap produced no report.');
const report=JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'"));
if(!report.ok)console.error('AL_HATA_BROWSER_BOOTSTRAP_FAILURE',JSON.stringify(report,null,2));
must(report.ok,`Al Hata Arrival Cove browser interaction failed: ${JSON.stringify(report)}`);
console.log('Al Hata browser bootstrap + Cove interaction verified:',JSON.stringify({core:report.core,playtest:report.playtest,entry:report.entry,api:report.api,forcedResumeRejected:report.forcedResumeRejected,stableWhileWaiting:report.stableWhileWaiting,driveStable:report.driveStable,topmost:report.topmost,navigatorCount:report.navigatorCount,nativeBattlePaused:report.nativeBattlePaused}));
