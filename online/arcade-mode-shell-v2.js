(() => {
  'use strict';
  if(window.__TTD_ARCADE_MODE_SHELL_V2)return;
  window.__TTD_ARCADE_MODE_SHELL_V2=true;

  const ORIGIN=location.origin;
  const MOVING_MODE='moving_screen';
  const KOTH_MODE='king_of_the_hill';
  const MOVING_SCREEN_ID='movingScreenModeScreen';
  const KOTH_SCREEN_ID='kingHillModeScreen';
  const MAPS=Object.freeze({
    moving:Object.freeze([
      Object.freeze({key:'neon_rooftops_v2',name:'Neon Rooftops',tag:'AVAILABLE',desc:'Climb the midnight district while the screen advances. 30 KOs, ten lives, and the Sign Crown flag.',playable:true}),
      Object.freeze({key:'construction_climb',name:'Construction Climb',tag:'AVAILABLE',desc:'Scale an unfinished high-rise across work yards, plank ramps, scaffolds, concrete floors and suspended crane steel.',playable:true}),
      Object.freeze({key:'underground_descent',name:'Underground Descent',tag:'COMING SOON',desc:'Descend through station roofs, maintenance platforms, signs and tunnels while the screen pushes downward.',playable:false}),
    ]),
    koth:Object.freeze([
      Object.freeze({key:'neon_rooftops_koth',name:'Neon Rooftops',tag:'COMING SOON',desc:'Fight over rooftop control zones while the battlefield keeps changing around the hill.',playable:false}),
      Object.freeze({key:'foundry_platform',name:'Foundry Platform',tag:'COMING SOON',desc:'A compact industrial arena built around contested platforms, machinery and knockback hazards.',playable:false}),
      Object.freeze({key:'clocktower_crown',name:'Clocktower Crown',tag:'COMING SOON',desc:'A vertical hill map with narrow upper control space and safer lower recovery routes.',playable:false}),
    ]),
  });

  let requestSerial=0;
  let pendingStart=null;
  let currentRun=null;
  let movingResultActive=false;
  let shellObserver=null;
  let resultObserver=null;
  const rid=(prefix)=>`${prefix}-${Date.now().toString(36)}-${++requestSerial}`;
  const showCore=(name)=>{try{if(typeof showScreen==='function'){showScreen(name);return true;}}catch(_){}return false;};
  const toast=(message)=>{try{if(typeof toastGlobal==='function'){toastGlobal(message);return;}}catch(_){}const node=document.getElementById('toast');if(node)node.textContent=message;};
  const deckReady=()=>{try{return typeof getActiveDeck==='function'&&getActiveDeck().length>=5;}catch(_){return false;}};

  function installStyles(){
    if(document.getElementById('ttdArcadeModeShellStyleV2'))return;
    const style=document.createElement('style');style.id='ttdArcadeModeShellStyleV2';style.textContent=`
      #modeScreen{min-height:0!important;}
      #modeScreen .modeBody{
        flex:1 1 0!important;min-height:0!important;height:auto!important;max-height:none!important;
        justify-content:flex-start!important;align-content:flex-start!important;overflow-y:auto!important;overflow-x:hidden!important;
        overscroll-behavior-y:contain!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;
        scroll-padding-bottom:max(96px,calc(env(safe-area-inset-bottom) + 72px))!important;
        padding-bottom:max(96px,calc(env(safe-area-inset-bottom) + 72px))!important;
      }
      #${MOVING_SCREEN_ID},#${KOTH_SCREEN_ID}{min-height:0!important;}
      #${MOVING_SCREEN_ID} .modeBody,#${KOTH_SCREEN_ID} .modeBody{
        flex:1 1 0!important;min-height:0!important;height:auto!important;max-height:none!important;
        display:flex;flex-direction:column;gap:12px;padding:16px 16px max(88px,calc(env(safe-area-inset-bottom) + 64px));
        overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior-y:contain;justify-content:flex-start;
      }
      .ttdArcadeLandingIntro{padding:2px 2px 4px;color:var(--mist,#97a0bd);font-size:11px;line-height:1.45;flex:0 0 auto;}
      .ttdArcadeMapListV1{display:flex;flex-direction:column;gap:12px;flex:0 0 auto;}
      .ttdArcadeMapCard{position:relative;border-radius:14px;padding:15px;background:linear-gradient(155deg,var(--ink-850,#171c34),var(--ink-900,#12162a));border:1px solid var(--ink-700,#2a3160);text-align:left;box-shadow:0 8px 22px rgba(0,0,0,.16)}
      .ttdArcadeMapCard.available{border-color:rgba(243,212,145,.52);box-shadow:0 8px 24px rgba(0,0,0,.2),0 0 15px rgba(217,178,106,.08)}
      .ttdArcadeMapCard h3{font-family:'Cinzel',serif;margin:0 0 5px;font-size:16px;color:var(--gold-glow,#f3d491);padding-right:84px}
      .ttdArcadeMapCard p{margin:0 0 11px;font-size:11.5px;color:var(--mist,#97a0bd);line-height:1.45}
      .ttdArcadeMapTag{position:absolute;right:12px;top:12px;border:1px solid rgba(143,196,232,.32);border-radius:999px;padding:3px 7px;background:rgba(8,12,25,.72);color:var(--astra-glow,#d4ecfa);font:700 7px 'Space Mono',monospace;letter-spacing:.04em}
      .ttdArcadeMapCard.available .ttdArcadeMapTag{border-color:rgba(243,212,145,.46);color:var(--gold-glow,#f3d491)}
      .ttdArcadeMapCard button{width:100%;appearance:none;border:0;border-radius:10px;padding:10px;font-family:'Cinzel',serif;font-weight:700;font-size:11px;background:linear-gradient(180deg,var(--gold-glow,#f3d491),var(--gold,#d9b26a));color:var(--ink-950,#0a0c14);touch-action:manipulation}
      .ttdArcadeMapCard button:disabled{background:var(--ink-700,#2a3160);color:var(--mist-dim,#5c6488);opacity:.8}
      #ttdMovingScreenCardV4.ttdArcadeShellOwned,#ttdKingHillCardV4.ttdArcadeShellOwned{cursor:pointer}
      #ttdMovingScreenCardV4.ttdArcadeShellOwned button,#ttdKingHillCardV4.ttdArcadeShellOwned button{pointer-events:auto}
    `;document.head.appendChild(style);
  }

  function activateLanding(id){
    const target=document.getElementById(id);if(!target)return false;
    document.querySelectorAll('.screen.active').forEach((screen)=>screen.classList.remove('active'));
    target.classList.add('active');
    const body=target.querySelector('.modeBody');if(body)body.scrollTop=0;
    return true;
  }

  function returnToArcade(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if(activateLanding('modeScreen')){ownArcadeCards();return true;}
    return showCore('mode');
  }

  function makeScreen(id,title,kind,intro){
    let screen=document.getElementById(id);if(screen)return screen;
    screen=document.createElement('div');screen.id=id;screen.className='screen ttdArcadeLandingScreenV2';
    screen.innerHTML=`<div class="topbar"><button class="backBtn ttdArcadeLandingBackV1" type="button">Back</button><div class="title">${title}</div><div style="width:52px;"></div></div><div class="modeBody"><div class="ttdArcadeLandingIntro">${intro}</div><div class="ttdArcadeMapListV1"></div></div>`;
    (document.getElementById('app')||document.body).appendChild(screen);
    screen.querySelector('.ttdArcadeLandingBackV1')?.addEventListener('click',returnToArcade);
    renderMaps(screen,kind);
    return screen;
  }

  function renderMaps(screen,kind){
    const root=screen.querySelector('.ttdArcadeMapListV1');if(!root)return;root.innerHTML='';
    for(const map of MAPS[kind]){
      const card=document.createElement('div');card.className=`ttdArcadeMapCard ${map.playable?'available':'future'}`;
      card.dataset.mapKey=map.key;
      card.innerHTML=`<span class="ttdArcadeMapTag">${map.tag}</span><h3>${map.name}</h3><p>${map.desc}</p><button type="button" ${map.playable?'':'disabled'}>${map.playable?'Play':'Coming Soon'}</button>`;
      if(map.playable)card.querySelector('button')?.addEventListener('click',()=>kind==='moving'?startMovingMap(map.key):startKothMap(map.key));
      root.appendChild(card);
    }
  }

  function ensureScreens(){
    makeScreen(MOVING_SCREEN_ID,'Moving Screen','moving','Choose the battlefield before the run. Moving Screen maps can scroll upward or downward and may use their own traversal topology.');
    makeScreen(KOTH_SCREEN_ID,'King of the Hill','koth','Choose the hill battlefield. Each map can define its own control zones, recovery routes and moving-screen hazards.');
  }

  function ownEntryCard(id,title,desc,open){
    const old=document.getElementById(id);if(!old||old.classList.contains('ttdArcadeShellOwned'))return;
    const card=document.createElement('div');card.id=id;card.className='modeCard ttdMsModeV4 ttdArcadeShellOwned';
    card.innerHTML=`<h3>${title}</h3><p>${desc}</p><button type="button">Choose Map</button>`;
    card.querySelector('button').addEventListener('click',open);old.replaceWith(card);
  }
  function ownArcadeCards(){
    ownEntryCard('ttdMovingScreenCardV4','Moving Screen','Advance through changing battlefields where safe ground, routes and enemy pressure move with the screen.',openMoving);
    ownEntryCard('ttdKingHillCardV4','King of the Hill','Control contested territory on specialized Arcade battlefields.',openKoth);
  }

  function openMoving(){ensureScreens();activateLanding(MOVING_SCREEN_ID);}
  function openKoth(){ensureScreens();activateLanding(KOTH_SCREEN_ID);}

  function send(type,payload={}){window.parent?.postMessage({type,...payload},ORIGIN);}
  function beginOnlineRun(modeKey,mapKey,starter){
    if(pendingStart||currentRun){toast('A run is already starting.');return;}
    if(!deckReady()){toast('Your deck needs all 5 dice filled');showCore('deck');return;}
    const requestId=rid('arcade-run');pendingStart={requestId,modeKey,mapKey,starter};
    send('ttd:v6-run-begin-request',{requestId,modeKey,mapKey});
  }
  function finishOnlineRun(metrics,overlayKind){
    if(!currentRun?.runId||currentRun.finishing)return;
    currentRun.finishing=true;
    const requestId=rid('arcade-finish');currentRun.finishRequestId=requestId;
    send('ttd:v6-run-finish-request',{requestId,runId:currentRun.runId,...metrics,overlayKind});
  }
  function movingMetrics(){
    const state=window.TTDMovingScreen?.state||{};
    const elapsed=currentRun?.startedAt?Math.max(0,(performance.now()-currentRun.startedAt)/1000):0;
    return {completedWaves:Math.max(0,Number(state.stopIndex)||0),kills:Math.max(0,Number(state.kills)||0),coinGold:0,wave:Math.max(0,Number(state.stopIndex)||0),playSeconds:elapsed,typhoonDefeated:false,luckBonus:0};
  }

  function startMovingMap(mapKey){
    if(!['neon_rooftops_v2','construction_climb'].includes(mapKey)){toast('That Moving Screen map is not ready yet.');return;}
    if(!window.TTDMovingScreen?.start){toast('Moving Screen is still loading.');return;}
    beginOnlineRun(MOVING_MODE,mapKey,()=>{
      currentRun.startedAt=performance.now();currentRun.kind='moving';currentRun.mapKey=mapKey;
      window.TTDMovingScreen.start(mapKey);
    });
  }
  function startKothMap(mapKey){
    if(!window.TTDKingOfHill?.start){toast('King of the Hill is coming soon.');return;}
    beginOnlineRun(KOTH_MODE,mapKey,()=>{
      currentRun.startedAt=performance.now();currentRun.kind='koth';currentRun.mapKey=mapKey;
      window.TTDKingOfHill.start(mapKey);
    });
  }

  function presentMovingResult(box,state){
    if(movingResultActive)return;
    movingResultActive=true;
    const title=String(box.querySelector('h2')?.textContent||'RUN COMPLETE');
    const reason=String(box.querySelector('p')?.textContent||'The Moving Screen run has ended.');
    box.classList.remove('show');
    finishOnlineRun(movingMetrics(),'moving_screen');
    const overlay=document.getElementById('gameOverlay');if(!overlay){box.classList.add('show');return;}
    const overlayTitle=document.getElementById('overlayTitle'),overlayText=document.getElementById('overlayText'),overlayStats=document.getElementById('overlayStats');
    if(overlayTitle)overlayTitle.textContent=title;
    if(overlayText)overlayText.textContent=reason;
    if(overlayStats)overlayStats.textContent=`${Math.min(Number(state?.kills)||0,Number(state?.killGoal)||30)} / ${Number(state?.killGoal)||30} enemies defeated · ${Number(state?.lives)||0} lives left · ${String(state?.flag||'Flag unresolved')}`;
    const pips=document.getElementById('overlayPipsValue'),exp=document.getElementById('overlayExpValue'),notesP=document.getElementById('overlayPipsNotes'),notesE=document.getElementById('overlayExpNotes'),level=document.getElementById('overlayLevelUp');
    if(pips)pips.textContent='…';if(exp)exp.textContent='…';if(notesP)notesP.textContent='';if(notesE)notesE.textContent='';if(level)level.textContent='';
    document.getElementById('ttdRunRewardsV26')?.remove();overlay.classList.add('show');
  }
  function adoptMovingResultIfReady(){
    if(!currentRun||currentRun.kind!=='moving'||movingResultActive)return;
    const box=document.getElementById('ttdMsResultV4');if(!box?.classList.contains('show'))return;
    presentMovingResult(box,window.TTDMovingScreen?.state||null);
  }

  function onMessage(event){
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const m=event.data||{};
    if(m.type==='ttd:v6-run-begin-result'&&pendingStart&&m.requestId===pendingStart.requestId){
      const start=pendingStart;pendingStart=null;currentRun={runId:m.runId,modeKey:start.modeKey,mapKey:start.mapKey,finishing:false,startedAt:performance.now(),kind:null};
      try{start.starter();}catch(error){console.error(error);currentRun=null;toast('That Arcade run could not start.');}
      return;
    }
    if(m.type==='ttd:v6-run-begin-result-error'&&pendingStart&&m.requestId===pendingStart.requestId){pendingStart=null;toast(m.message||'That Arcade run could not start.');return;}
    if(m.type==='ttd:v6-run-finish-result'&&currentRun&&m.runId===currentRun.runId){const manualExit=!!currentRun.manualExit;currentRun.finishedResult=true;send('ttd:v6-refresh-request');if(manualExit)currentRun=null;return;}
    if(m.type==='ttd:v6-run-finish-result-error'&&currentRun&&m.runId===currentRun.runId){const manualExit=!!currentRun.manualExit;toast(m.message||'Run rewards could not be finalized.');send('ttd:v6-refresh-request');if(manualExit)currentRun=null;return;}
  }

  function cleanupAfterCanonicalContinue(){
    if(!movingResultActive)return;
    movingResultActive=false;pendingStart=null;currentRun=null;
    try{window.TTDMovingScreen?.exit?.();}catch(error){console.error(error);}
  }
  function finalizeManualMovingExit(){
    if(!currentRun||currentRun.kind!=='moving'||currentRun.finishing||movingResultActive)return;
    currentRun.manualExit=true;finishOnlineRun(movingMetrics(),'moving_screen_exit');
    setTimeout(()=>{if(currentRun?.manualExit)currentRun=null;},2500);
  }
  function installObservers(){
    const modeBody=document.querySelector('#modeScreen .modeBody');
    if(modeBody&&!shellObserver){shellObserver=new MutationObserver(()=>ownArcadeCards());shellObserver.observe(modeBody,{childList:true,subtree:false});}
    if(!resultObserver){resultObserver=new MutationObserver(()=>adoptMovingResultIfReady());resultObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
  }

  installStyles();ensureScreens();ownArcadeCards();installObservers();
  window.addEventListener('message',onMessage,true);
  document.addEventListener('click',(event)=>{
    if(event.target?.id==='ttdMsExitV4')finalizeManualMovingExit();
    if(event.target?.id==='overlayBtn')cleanupAfterCanonicalContinue();
  },true);
  [50,250,550,950,1500].forEach(ms=>setTimeout(()=>{ensureScreens();ownArcadeCards();installObservers();},ms));

  window.TTDArcadeModeShell=Object.freeze({
    version:2,
    maps:MAPS,
    openMoving,
    openKoth,
    startMovingMap,
    startKothMap,
    get currentRun(){return currentRun?{modeKey:currentRun.modeKey,mapKey:currentRun.mapKey,finishing:!!currentRun.finishing}:null;},
  });
})();