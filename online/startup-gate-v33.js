(() => {
  'use strict';
  if(window.__TTD_STARTUP_GATE_V33)return;
  window.__TTD_STARTUP_GATE_V33=true;

  const splash=document.getElementById('ttdStartupSplashV26');
  const tap=document.getElementById('ttdStartupTapV26');
  const frame=document.getElementById('gameFrame');
  const status=document.getElementById('status');
  const signedIn=document.getElementById('signedIn');
  if(!splash||!tap||!frame)return;

  const CRITICAL_ASSETS=Object.freeze([
    '/assets/ui/loading-endless-horde.jpg',
    '/assets/ui/loading-al-hata.jpg',
    '/assets/items/chest-frozen-island-normal.jpg',
    '/assets/items/chest-frozen-island-hard.jpg',
    '/assets/items/chest-frozen-island-hell.jpg',
    '/assets/items/key-normal.jpg',
    '/assets/items/key-hard.jpg',
    '/assets/items/key-hell.jpg',
    '/assets/items/mystery-chest.jpg',
    '/assets/items/epic-summon-ticket.jpg',
    '/assets/items/exp-tome.jpg',
    '/assets/items/ore-common.jpg',
    '/assets/items/ore-rare.jpg',
    '/assets/items/ore-unique.jpg',
    '/assets/items/ore-legendary.jpg',
    '/assets/items/ore-omni.jpg',
    '/assets/items/gift-box-pink.jpg',
    '/assets/items/gift-box-icy.jpg'
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
  `;
  document.head.appendChild(gateStyle);

  const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
  let entering=false;
  let skipGestureUntil=0;
  let preloadPromise=null;

  function accountReady(){
    return !signedIn?.hidden&&!frame.hidden&&status?.dataset?.kind==='ok'&&/cloud account ready/i.test(status?.textContent||'');
  }
  function childWindow(){try{return frame.contentWindow||null;}catch(_){return null;}}
  function childOperational(){
    if(!accountReady())return false;
    try{
      const child=childWindow(),doc=child?.document;
      return !!(
        child&&doc&&doc.readyState!=='loading'&&
        child.__TTD_GAME_ASSETS&&
        child.__TTD_ITEM_ASSETS_V1&&
        child.__TTD_WORLD_ITEMS_V1&&
        doc.getElementById('homeScreen')&&
        doc.getElementById('shopScreen')&&
        doc.getElementById('inventoryScreen')
      );
    }catch(_){return false;}
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
    throw new Error('The game menus did not finish initializing.');
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
      const finish=(ok,error)=>{if(settled)return;settled=true;img.onload=null;img.onerror=null;ok?resolve(img):reject(error||new Error(`Image failed: ${url}`));};
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
      let cursor=0;
      async function worker(){
        for(;;){
          const index=cursor++;if(index>=queue.length)return;
          const entry=queue[index];
          let lastError=null;
          for(let attempt=0;attempt<2;attempt++){
            try{keep.push(await imageReady(child,entry.url));lastError=null;break;}
            catch(error){lastError=error;if(attempt===0)await sleep(80);}
          }
          if(lastError)throw lastError;
        }
      }
      await Promise.all(Array.from({length:4},worker));
      child.__TTD_PRELOADED_IMAGES_V33=keep;
      return {count:queue.length};
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
    const audio=window.__TTD_AUDIO_V27;
    try{await audio?.unlock?.();}catch(_){}
    tap.disabled=true;tap.classList.remove('ttdTapReadyV26');tap.textContent='ENTERING…';
    const fade=blacken();
    let statusTimer=0;
    try{
      await sleep(95);
      let welcomePromise=Promise.resolve();
      try{welcomePromise=Promise.resolve(audio?.playWelcome?.());}catch(error){console.error('TTD welcome failed',error);}
      const criticalPromise=preloadCritical();
      statusTimer=setTimeout(()=>{const node=fadeNode();if(node)node.setAttribute('data-ttd-status','LOADING…');},650);
      await Promise.all([
        Promise.race([welcomePromise,sleep(5000)]),
        criticalPromise,
        waitOperational(20000),
        waitFonts()
      ]);
      try{Promise.resolve(audio?.enterMainMenu?.()).catch(error=>console.error('TTD main music failed',error));}catch(error){console.error('TTD main music failed',error);}
      splash.hidden=true;
      document.documentElement.classList.remove('ttdStartupOpenV26');
      revealBlack();
      setTimeout(()=>{try{const child=childWindow();if(child)child.__TTD_PRELOADED_IMAGES_V33=[];}catch(_){}},30000);
    }catch(error){
      console.error('TTD startup gate held the game because required startup content was not ready.',error);
      revealBlack();
      tap.disabled=false;tap.textContent='TAP TO RETRY';tap.classList.add('ttdTapReadyV26');
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
  window.__TTD_STARTUP_GATE_V33=Object.freeze({preloadCritical,get entering(){return entering;},criticalAssets:CRITICAL_ASSETS});
})();
