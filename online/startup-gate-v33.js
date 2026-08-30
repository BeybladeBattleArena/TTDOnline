(() => {
  'use strict';
  if(window.__TTD_STARTUP_GATE_V33)return;
  window.__TTD_STARTUP_GATE_V33=true;

  const splash=document.getElementById('ttdStartupSplashV26');
  const tap=document.getElementById('ttdStartupTapV26');
  const greeting=document.getElementById('ttdStartupGreetingV26');
  const frame=document.getElementById('gameFrame');
  const status=document.getElementById('status');
  const signedIn=document.getElementById('signedIn');
  if(!splash||!tap||!frame)return;

  const CRITICAL_ASSETS=Object.freeze([
    '/assets/ui/loading-endless-horde.png',
    '/assets/ui/loading-al-hata.png',
    '/assets/ui/loading-moving-screen.png',
    '/assets/items/chest-frozen-island-normal.png',
    '/assets/items/chest-frozen-island-hard.png',
    '/assets/items/chest-frozen-island-hell.png',
    '/assets/items/key-normal.png',
    '/assets/items/key-hard.png',
    '/assets/items/key-hell.png',
    '/assets/items/mystery-chest.png',
    '/assets/items/epic-summon-ticket.png',
    '/assets/items/exp-tome.png',
    '/assets/items/ore-common.png',
    '/assets/items/ore-rare.png',
    '/assets/items/ore-unique.png',
    '/assets/items/ore-legendary.png',
    '/assets/items/ore-omni.png',
    '/assets/items/gift-box-pink.png',
    '/assets/items/gift-box-icy.png'
  ]);

  const gateStyle=document.createElement('style');
  gateStyle.id='ttd-startup-gate-style-v33';
  gateStyle.textContent=`
    #ttdAudioEntryFadeV28[data-ttd-status]::after{
      content:attr(data-ttd-status);
      position:absolute;
      left:50%;bottom:max(24px,calc(18px + env(safe-area-inset-bottom)));
      transform:translateX(-50%);
      color:rgba(236,231,218,.72);
      font:700 11px 'Space Mono',monospace;
      letter-spacing:.13em;
      white-space:nowrap;
      text-shadow:0 2px 8px #000;
    }
    #ttdStartupGreetingV26.ttdStartupErrorV33{
      max-width:min(88vw,620px);
      font-size:clamp(11px,3.2vw,15px)!important;
      line-height:1.35;
      color:#ffaaa4!important;
      letter-spacing:.02em!important;
    }
  `;
  document.head.appendChild(gateStyle);

  const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
  let entering=false;
  let skipGestureUntil=0;
  let preloadPromise=null;
  let lastError='';

  // gameFrame becomes visible only after firebase-client receives ttd:bridge-synced.
  // The status kind is a stable state bit; the human-readable status copy is not an API.
  function accountReady(){
    return !signedIn?.hidden&&!frame.hidden&&status?.dataset?.kind==='ok';
  }
  function childWindow(){try{return frame.contentWindow||null;}catch(_){return null;}}
  function childOperational(){
    if(!accountReady())return false;
    try{
      const child=childWindow(),doc=child?.document;
      const home=doc?.getElementById('homeScreen');
      return !!(
        child&&doc&&doc.readyState!=='loading'&&
        typeof child.__TTD_ASSET_URL==='function'&&
        child.__TTD_CORE_API_V1&&
        home&&home.classList.contains('active')
      );
    }catch(_){return false;}
  }
  function startupFailureReason(error){
    const shellMessage=String(status?.textContent||'').trim();
    if(status?.dataset?.kind==='error'&&shellMessage)return shellMessage;
    try{
      const child=childWindow(),doc=child?.document,home=doc?.getElementById('homeScreen');
      if(accountReady()&&home&&!home.classList.contains('active'))return 'The game runtime loaded, but Home did not finish initializing.';
      if(!frame.hidden&&child&&doc&&doc.readyState==='loading')return 'The game document is still loading.';
    }catch(_){}
    return String(error?.message||error||'The game did not finish starting.');
  }
  async function waitChildAssetRuntime(maxMs=20000){
    const deadline=performance.now()+maxMs;
    while(performance.now()<deadline){
      const child=childWindow();
      try{if(child&&typeof child.__TTD_ASSET_URL==='function'&&child.document?.head)return child;}catch(_){}
      await sleep(40);
    }
    throw new Error('The secure game asset runtime did not become ready.');
  }
  async function waitOperational(maxMs=20000){
    const deadline=performance.now()+maxMs;
    while(performance.now()<deadline){if(childOperational())return true;await sleep(45);}
    throw new Error('The game runtime did not reach its ready Home state.');
  }
  async function waitFonts(){
    const waits=[];
    try{if(document.fonts?.ready)waits.push(document.fonts.ready);}catch(_){}
    try{const ready=childWindow()?.document?.fonts?.ready;if(ready)waits.push(ready);}catch(_){}
    if(waits.length)await Promise.allSettled(waits);
  }
  function imageReady(child,url){
    return new Promise((resolve,reject)=>{
      const img=new child.Image();
      let settled=false;
      const timer=setTimeout(()=>finish(false,new Error(`Image preload timed out: ${url}`)),7000);
      const finish=(ok,error)=>{if(settled)return;settled=true;clearTimeout(timer);img.onload=null;img.onerror=null;ok?resolve(img):reject(error||new Error(`Image failed: ${url}`));};
      img.decoding='async';img.loading='eager';
      img.onload=()=>finish(true);
      img.onerror=()=>finish(false,new Error(`Image failed: ${url}`));
      img.src=url;
      if(typeof img.decode==='function')img.decode().then(()=>finish(true)).catch(()=>{});
    });
  }
  async function preloadCritical(){
    if(preloadPromise)return preloadPromise;
    preloadPromise=(async()=>{
      const child=await waitChildAssetRuntime();
      const queue=CRITICAL_ASSETS.map((path)=>({path,url:child.__TTD_ASSET_URL(path)}));
      const keep=[];
      const failed=[];
      let cursor=0;
      async function worker(){
        for(;;){
          const index=cursor++;if(index>=queue.length)return;
          const entry=queue[index];
          let lastAssetError=null;
          for(let attempt=0;attempt<2;attempt++){
            try{keep.push(await imageReady(child,entry.url));lastAssetError=null;break;}
            catch(error){lastAssetError=error;if(attempt===0)await sleep(80);}
          }
          if(lastAssetError){
            failed.push(entry.path);
            console.warn('TTD nonfatal startup asset preload failure',entry.path,lastAssetError);
          }
        }
      }
      await Promise.all(Array.from({length:4},worker));
      child.__TTD_PRELOADED_IMAGES_V33=keep;
      return {count:queue.length,loaded:keep.length,failed};
    })().catch((error)=>{preloadPromise=null;throw error;});
    return preloadPromise;
  }
  function fadeNode(){return document.getElementById('ttdAudioEntryFadeV28');}
  function blacken(){const fade=fadeNode();fade?.classList.remove('ttdRevealV28');fade?.classList.add('ttdBlackV28');return fade;}
  function revealBlack(){
    const fade=fadeNode();if(!fade)return;
    fade.removeAttribute('data-ttd-status');
    fade.classList.add('ttdRevealV28');fade.classList.remove('ttdBlackV28');
    setTimeout(()=>fade.classList.remove('ttdRevealV28'),370);
  }
  function promptIsReady(){return !!window.__TTD_STARTUP_SPLASH_V31?.promptReady||!tap.disabled;}
  function stopEvent(event){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();}

  async function enter(){
    if(entering)return;
    entering=true;
    lastError='';
    greeting?.classList.remove('ttdStartupErrorV33');
    const audio=window.__TTD_AUDIO_V27;
    try{await audio?.unlock?.();}catch(_){}
    tap.disabled=true;tap.classList.remove('ttdTapReadyV26');tap.textContent='ENTERING…';tap.removeAttribute('title');
    const fade=blacken();
    let statusTimer=0;
    try{
      await sleep(95);
      let welcomePromise=Promise.resolve();
      try{welcomePromise=Promise.resolve(audio?.playWelcome?.());}catch(error){console.error('TTD welcome failed',error);}
      const criticalPromise=preloadCritical().catch((error)=>{
        console.warn('TTD startup art preload could not begin; continuing with runtime readiness.',error);
        return {count:CRITICAL_ASSETS.length,loaded:0,failed:[...CRITICAL_ASSETS]};
      });
      statusTimer=setTimeout(()=>{const node=fadeNode();if(node)node.setAttribute('data-ttd-status','LOADING…');},650);
      await Promise.all([
        Promise.race([welcomePromise,sleep(5000)]),
        waitOperational(20000),
        Promise.race([waitFonts(),sleep(4000)])
      ]);
      // Give the eager art preload a short head start, but never make decorative/late-screen
      // PNG decode failures a reason to reject an otherwise healthy Home screen.
      await Promise.race([criticalPromise,sleep(1200)]);
      try{Promise.resolve(audio?.enterMainMenu?.()).catch(error=>console.error('TTD main music failed',error));}catch(error){console.error('TTD main music failed',error);}
      splash.hidden=true;
      document.documentElement.classList.remove('ttdStartupOpenV26');
      revealBlack();
      setTimeout(()=>{try{const child=childWindow();if(child)child.__TTD_PRELOADED_IMAGES_V33=[];}catch(_){}},30000);
    }catch(error){
      lastError=startupFailureReason(error);
      console.error('TTD startup gate held the game because required startup content was not ready.',error,{reason:lastError});
      revealBlack();
      if(greeting){greeting.textContent=lastError;greeting.title=lastError;greeting.classList.add('ttdStartupErrorV33');}
      tap.disabled=false;tap.textContent='TAP TO RETRY';tap.title=lastError;tap.classList.add('ttdTapReadyV26');
    }finally{
      if(statusTimer)clearTimeout(statusTimer);
      fade?.removeAttribute('data-ttd-status');
      entering=false;
    }
  }

  function intercept(event){
    if(splash.hidden)return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    if(event.type==='click'&&performance.now()<skipGestureUntil){stopEvent(event);return;}
    if(!promptIsReady()){
      stopEvent(event);
      const skipped=window.__TTD_STARTUP_SPLASH_V31?.skipToEnd?.();
      if(skipped)skipGestureUntil=performance.now()+500;
      return;
    }
    if(entering||tap.disabled){stopEvent(event);return;}
    stopEvent(event);enter();
  }

  splash.addEventListener('pointerup',intercept,true);
  splash.addEventListener('click',intercept,true);
  splash.addEventListener('keydown',intercept,true);
  window.__TTD_STARTUP_GATE_V33=Object.freeze({preloadCritical,get entering(){return entering;},get lastError(){return lastError;},criticalAssets:CRITICAL_ASSETS});
})();
