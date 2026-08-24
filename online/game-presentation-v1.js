(() => {
  'use strict';
  if (window.__TTD_GAME_PRESENTATION_V6) return;
  window.__TTD_GAME_PRESENTATION_V6 = true;

  const SIGNAL_ID='ttdGameSignalV6';
  const HOLD_ID='ttdMissionHoldShieldV6';
  const MAP_PREVIEW_MS=500;
  const RUN_READY_TIMEOUT_MS=25000;
  const MISSION_GAP_MS=1250;
  const MISSION_START_HOLD_MS=1050;
  const COUNT_STEP_MS=720;
  const COUNT_START_HOLD_MS=520;
  const OUTCOME_HIDE_MS=1400;
  const OUTCOME_REMOVE_MS=1700;
  const RESULT_REVEAL_MS=1850;
  const FAIL_POST_VOICE_MS=1200;
  const VOICE_ACK_TIMEOUT_MS=12000;
  const ZOMBIE_SUPPRESS_MS=2600;

  let missionBusy=false,countdownBusy=false,adventureClearBusy=false,zombieResultBusy=false,matchResultBusy=false;
  let rawZombieSummary=null,suppressZombieSummaryUntil=0,lastVoiceCue='',lastVoiceAt=-Infinity,voiceRequestSeq=0;
  const pendingVoiceAcks=new Map();

  const style=document.createElement('style');
  style.id='ttdGamePresentationStyleV6';
  style.textContent=`
    #${SIGNAL_ID}{position:fixed;inset:0;z-index:1260;pointer-events:none;opacity:0;transition:opacity .18s ease;background:transparent;}
    #${SIGNAL_ID}.show{opacity:1;}
    #${SIGNAL_ID} .ttdSignalStack{position:fixed;left:var(--ttd-map-center-x,50vw);top:var(--ttd-map-center-y,42vh);transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:min(92vw,560px);}
    #${SIGNAL_ID} .ttdSignalWord{margin:0!important;padding:0!important;line-height:1.02!important;text-align:center!important;white-space:nowrap!important;font-family:'Russo One',sans-serif!important;font-size:clamp(30px,8vw,54px)!important;font-weight:400!important;letter-spacing:.055em!important;color:var(--gold-glow,#f3d491)!important;text-shadow:0 2px 0 rgba(0,0,0,.92),0 0 12px rgba(243,212,145,.42)!important;visibility:hidden!important;opacity:0!important;transform:scale(.76);filter:blur(2px);transition:opacity .18s ease,transform .25s cubic-bezier(.18,.78,.26,1.18),filter .20s ease;animation:none!important;}
    #${SIGNAL_ID} .ttdSignalWord.in{visibility:visible!important;opacity:1!important;transform:scale(1);filter:blur(0);}
    #${SIGNAL_ID}.leaving .ttdSignalWord{opacity:0!important;transform:scale(1.07);filter:blur(2px);transition:opacity .24s ease,transform .26s ease,filter .22s ease;}

    #${SIGNAL_ID} .ttdStartWord{color:transparent!important;background:linear-gradient(180deg,#b8ecff 0%,#73cef5 48%,#4aa6df 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;filter:blur(2px) drop-shadow(0 2px 0 rgba(10,30,52,.9)) drop-shadow(0 0 8px rgba(91,198,244,.46));}
    #${SIGNAL_ID} .ttdStartWord.in{filter:blur(0) drop-shadow(0 2px 0 rgba(10,30,52,.9)) drop-shadow(0 0 8px rgba(91,198,244,.46));}

    #${SIGNAL_ID}.countdown .ttdSignalStack{display:block;width:min(92vw,560px);height:clamp(62px,13vw,94px);min-width:0;}
    #${SIGNAL_ID}.countdown .ttdSignalWord{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:clamp(38px,11vw,70px)!important;}

    #${SIGNAL_ID}.outcome-fail .ttdSignalWord{color:transparent!important;background:linear-gradient(180deg,#9bcbe8 0%,#719acb 54%,#7467a7 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;filter:blur(2px) drop-shadow(0 2px 0 rgba(25,31,54,.86)) drop-shadow(0 0 9px rgba(111,141,197,.36));}
    #${SIGNAL_ID}.outcome-fail .ttdSignalWord.in{filter:blur(0) drop-shadow(0 2px 0 rgba(25,31,54,.86)) drop-shadow(0 0 9px rgba(111,141,197,.36));}
    #${SIGNAL_ID}.outcome-finish .ttdSignalWord{color:transparent!important;background:linear-gradient(180deg,#fff38c 0%,#f9dc68 62%,#edbd52 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;filter:blur(2px) drop-shadow(0 2px 0 rgba(63,49,17,.86)) drop-shadow(0 0 9px rgba(247,209,96,.38));}
    #${SIGNAL_ID}.outcome-finish .ttdSignalWord.in{filter:blur(0) drop-shadow(0 2px 0 rgba(63,49,17,.86)) drop-shadow(0 0 9px rgba(247,209,96,.38));}

    #${HOLD_ID}{position:fixed;inset:0;z-index:1255;background:transparent;pointer-events:auto;touch-action:none;}
    #gameOverlay.ttdResultCardV1,#zSummaryOverlay.ttdResultCardV1{background:rgba(8,9,16,.91)!important;backdrop-filter:blur(1.5px);}
    #gameOverlay.ttdResultCardV1.show,#zSummaryOverlay.ttdResultCardV1.show{animation:ttdResultRevealV1 .34s cubic-bezier(.2,.72,.25,1) both;}
    #zSummaryOverlay.ttdResultCardV1 #zSummaryCard{width:min(360px,92vw)!important;max-height:88%!important;overflow:auto!important;padding:20px 22px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;text-align:center!important;}
    #zSummaryOverlay.ttdResultCardV1 #zSummaryCard h2{font-family:'Russo One',sans-serif!important;font-size:24px!important;font-weight:400!important;color:var(--gold-glow,#f3d491)!important;letter-spacing:.04em!important;margin:0 0 8px!important;}
    @keyframes ttdResultRevealV1{0%{opacity:0;transform:scale(.985)}100%{opacity:1;transform:scale(1)}}
    #zSummaryCard .ttdMvpLabelV1{margin-top:11px!important;color:#8fc4e8!important;font:400 11px 'Russo One',sans-serif!important;letter-spacing:.13em!important;text-shadow:0 0 8px rgba(143,196,232,.34)!important;}
    #zSummaryCard .ttdMvpDieGlowV1{position:relative!important;overflow:visible!important;box-shadow:0 0 5px rgba(143,196,232,.42),0 0 9px rgba(143,196,232,.18)!important;animation:ttdMvpBreatheV1 2.7s ease-in-out infinite!important;}
    #zSummaryCard .ttdMvpDieGlowV1::after{content:'';position:absolute;inset:-2px;border-radius:inherit;pointer-events:none;border:1px solid rgba(191,231,255,.05);box-shadow:0 0 7px rgba(191,231,255,0);animation:ttdMvpShineV1 4.6s ease-in-out infinite;}
    @keyframes ttdMvpBreatheV1{0%,100%{box-shadow:0 0 4px rgba(143,196,232,.30),0 0 8px rgba(143,196,232,.10)}50%{box-shadow:0 0 7px rgba(143,196,232,.58),0 0 11px rgba(143,196,232,.20)}}
    @keyframes ttdMvpShineV1{0%,38%,58%,100%{border-color:rgba(191,231,255,.04);box-shadow:0 0 7px rgba(191,231,255,0)}46%{border-color:rgba(211,241,255,.62);box-shadow:0 0 8px rgba(191,231,255,.48)}51%{border-color:rgba(191,231,255,.20);box-shadow:0 0 5px rgba(191,231,255,.16)}}
  `;
  document.head.appendChild(style);

  const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==window.parent)return;
    const message=event.data||{};if(message.type!=='ttd:voice-cue-complete')return;
    const requestId=String(message.requestId||''),resolve=pendingVoiceAcks.get(requestId);if(!resolve)return;
    pendingVoiceAcks.delete(requestId);resolve(message.ok!==false);
  });
  function announce(cue,{waitForEnd=false}={}){
    const now=performance.now();
    if(cue===lastVoiceCue&&now-lastVoiceAt<250)return Promise.resolve(true);
    lastVoiceCue=cue;lastVoiceAt=now;
    let requestId='',completion=Promise.resolve(true);
    if(waitForEnd){
      requestId=`voice-${Date.now().toString(36)}-${++voiceRequestSeq}`;
      completion=new Promise(resolve=>{
        const timer=setTimeout(()=>{pendingVoiceAcks.delete(requestId);resolve(false);},VOICE_ACK_TIMEOUT_MS);
        pendingVoiceAcks.set(requestId,ok=>{clearTimeout(timer);resolve(ok);});
      });
    }
    try{window.parent?.postMessage({type:'ttd:voice-cue',cue,requestId},location.origin);}catch(_){if(requestId){const resolve=pendingVoiceAcks.get(requestId);pendingVoiceAcks.delete(requestId);resolve?.(false);}}
    return completion;
  }
  function positionSignal(overlay){
    const map=document.getElementById('laneWrap')||document.getElementById('laneCanvas');
    const rect=map?.getBoundingClientRect?.();
    if(rect&&rect.width>0&&rect.height>0){
      overlay.style.setProperty('--ttd-map-center-x',`${rect.left+rect.width/2}px`);
      overlay.style.setProperty('--ttd-map-center-y',`${rect.top+rect.height/2}px`);
    }else{
      overlay.style.setProperty('--ttd-map-center-x','50vw');
      overlay.style.setProperty('--ttd-map-center-y','42vh');
    }
  }
  function trackSignalPosition(overlay){const tick=()=>{if(!overlay.isConnected)return;positionSignal(overlay);requestAnimationFrame(tick);};tick();}
  function makeSignal(words,extraClass=''){
    document.getElementById(SIGNAL_ID)?.remove();
    const overlay=document.createElement('div');overlay.id=SIGNAL_ID;if(extraClass)overlay.classList.add(extraClass);
    const stack=document.createElement('div');stack.className='ttdSignalStack';
    const nodes=words.map(text=>{const word=document.createElement('div');word.className='ttdSignalWord';word.textContent=text;word.dataset.ttdSignalText=text;if(text==='START!')word.classList.add('ttdStartWord');stack.appendChild(word);return word;});
    overlay.appendChild(stack);document.body.appendChild(overlay);positionSignal(overlay);trackSignalPosition(overlay);return{overlay,nodes};
  }

  function normalizedText(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim();}
  function isLegacyMissionNode(el){return !!el&&!el.closest?.(`#${SIGNAL_ID}`)&&/^MISSION\s*START!?$/i.test(normalizedText(el));}
  function suppressLegacyMissionNode(el){if(!isLegacyMissionNode(el))return;el.dataset.ttdLegacyMissionSuppressed='1';el.style.setProperty('visibility','hidden','important');el.style.setProperty('opacity','0','important');el.style.setProperty('display','none','important');el.style.setProperty('animation','none','important');el.style.setProperty('pointer-events','none','important');}
  function scanLegacyMissionNodes(root=document){const selectors='.missionStartOverlay,[id*="missionStart" i],[class*="missionStart" i],.awardOverlay,.awardTitle,h1,h2,div,span';if(root?.matches?.(selectors))suppressLegacyMissionNode(root);root?.querySelectorAll?.(selectors).forEach(suppressLegacyMissionNode);}
  scanLegacyMissionNodes();
  const legacyObserver=new MutationObserver(records=>{for(const record of records){if(record.type==='characterData'){suppressLegacyMissionNode(record.target?.parentElement);continue;}record.addedNodes.forEach(node=>{if(node.nodeType===1)scanLegacyMissionNodes(node);});suppressLegacyMissionNode(record.target);}});
  legacyObserver.observe(document.documentElement,{childList:true,subtree:true,characterData:true});

  function installMissionHoldShield(){document.getElementById(HOLD_ID)?.remove();const shield=document.createElement('div');shield.id=HOLD_ID;shield.setAttribute('aria-hidden','true');document.body.appendChild(shield);return shield;}
  function removeMissionHoldShield(){document.getElementById(HOLD_ID)?.remove();}
  function isGameScreenReady(){return !!document.getElementById('gameScreen')?.classList.contains('active');}
  function waitForRunState(previousState,startedAt=performance.now()){return new Promise((resolve,reject)=>{const check=()=>{if(state&&state!==previousState&&isGameScreenReady()){resolve(state);return;}if(performance.now()-startedAt>=RUN_READY_TIMEOUT_MS){reject(new Error('Run did not reach the game map before mission intro timeout.'));return;}requestAnimationFrame(check);};check();});}
  function drawMissionPreview(runState){if(state!==runState||!runState.__ttdMissionIntroHold)return;try{resizeCanvas?.();renderHUD?.();renderBoard?.();drawLane?.(0);}catch(err){console.warn('TTD static mission preview draw recovered.',err);}requestAnimationFrame(()=>drawMissionPreview(runState));}
  function freezeRunForMission(runState){runState.__ttdMissionIntroHold=true;runState.running=false;try{lastT=0;}catch(_){}installMissionHoldShield();drawMissionPreview(runState);}
  function resumeRunFromMission(runState){if(state!==runState)return false;runState.__ttdMissionIntroHold=false;runState.running=true;removeMissionHoldShield();try{lastT=0;}catch(_){}try{requestAnimationFrame(loop);}catch(err){console.error('TTD gameplay resume failed.',err);return false;}return true;}

  async function playMissionCue(startFn){
    if(missionBusy)return;missionBusy=true;scanLegacyMissionNodes();const previousState=state;
    try{
      startFn?.();const runState=await waitForRunState(previousState);freezeRunForMission(runState);await sleep(MAP_PREVIEW_MS);if(state!==runState)throw new Error('Run state changed during mission preview.');
      const{overlay,nodes}=makeSignal(['MISSION','START!']);nodes[0]?.classList.add('in');announce('mission');requestAnimationFrame(()=>overlay.classList.add('show'));
      await sleep(MISSION_GAP_MS);if(state!==runState)throw new Error('Run state changed before START.');nodes[1]?.classList.add('in');announce('start');resumeRunFromMission(runState);
      await sleep(MISSION_START_HOLD_MS);overlay.classList.add('leaving');overlay.classList.remove('show');await sleep(300);overlay.remove();
    }catch(err){console.error('TTD mission intro failed.',err);removeMissionHoldShield();document.getElementById(SIGNAL_ID)?.remove();if(state?.__ttdMissionIntroHold){state.__ttdMissionIntroHold=false;state.running=true;try{lastT=0;requestAnimationFrame(loop);}catch(_){}}}
    finally{missionBusy=false;}
  }
  function bindStart(name,getter,setter){let base;try{base=getter();}catch(_){return;}if(typeof base!=='function'||base.__ttdMissionWrappedV6)return;const wrapped=function(...args){if(missionBusy)return base.apply(this,args);const self=this;playMissionCue(()=>base.apply(self,args));};wrapped.__ttdMissionWrappedV6=true;wrapped.__ttdMissionBaseV6=base;try{setter(wrapped);}catch(err){console.warn(`Could not bind ${name} presentation.`,err);}}

  async function playCombatCountdown(onStart){
    if(countdownBusy)return false;countdownBusy=true;const{overlay,nodes}=makeSignal(['3','2','1','START!'],'countdown');requestAnimationFrame(()=>overlay.classList.add('show'));
    for(let i=0;i<3;i++){if(i>0)nodes[i-1]?.classList.remove('in');nodes[i]?.classList.add('in');await sleep(COUNT_STEP_MS);}
    nodes[2]?.classList.remove('in');nodes[3]?.classList.add('in');announce('combatStart');try{onStart?.();}catch(err){console.error('TTD combat countdown start failed.',err);}
    await sleep(COUNT_START_HOLD_MS);overlay.classList.add('leaving');overlay.classList.remove('show');await sleep(280);overlay.remove();countdownBusy=false;return true;
  }

  const OUTCOMES=Object.freeze({clear:{text:'CLEAR!',className:'outcome-clear',voice:'clear'},fail:{text:'FAIL',className:'outcome-fail',voice:'fail'},finish:{text:'FINISH!',className:'outcome-finish',voice:'finish'}});
  function playOutcomeCue(kind='clear'){
    const spec=OUTCOMES[kind]||OUTCOMES.clear,{overlay,nodes}=makeSignal([spec.text],spec.className);nodes[0]?.classList.add('in');
    overlay.__ttdVoiceDone=announce(spec.voice,{waitForEnd:kind==='fail'});requestAnimationFrame(()=>overlay.classList.add('show'));
    setTimeout(()=>{overlay.classList.add('leaving');overlay.classList.remove('show');},OUTCOME_HIDE_MS);setTimeout(()=>overlay.remove(),OUTCOME_REMOVE_MS);return overlay;
  }
  function scheduleResultReveal(kind,outcome,reveal,minimumDelay=RESULT_REVEAL_MS){
    const minDelay=Math.max(0,Number(minimumDelay)||RESULT_REVEAL_MS);
    if(kind!=='fail'){setTimeout(reveal,minDelay);return;}
    const voiceDone=Promise.resolve(outcome?.__ttdVoiceDone).catch(()=>false).then(()=>sleep(FAIL_POST_VOICE_MS));
    Promise.all([sleep(minDelay),voiceDone]).then(reveal);
  }
  const playClearCue=()=>playOutcomeCue('clear'),playFailCue=()=>playOutcomeCue('fail'),playFinishCue=()=>playOutcomeCue('finish');

  function decorateAdventureResult(){document.getElementById('gameOverlay')?.classList.add('ttdResultCardV1');}
  function decorateZombieResult(cardOverride=null){const overlay=document.getElementById('zSummaryOverlay');if(overlay)overlay.classList.add('ttdResultCardV1');const card=cardOverride||document.getElementById('zSummaryCard');if(!card)return;const glyph=card.querySelector('.glyphBig');if(!glyph)return;glyph.classList.add('ttdMvpDieGlowV1');const label=glyph.previousElementSibling;if(label){label.textContent='MVP';label.classList.add('ttdMvpLabelV1');}}
  function revealAdventureResult(){decorateAdventureResult();document.getElementById('gameOverlay')?.classList.add('show');}
  function hideAdventureResult(){const overlay=document.getElementById('gameOverlay');if(overlay){decorateAdventureResult();overlay.classList.remove('show');void overlay.offsetWidth;}}
  function prepareZombieResult(pipsEarned){if(typeof rawZombieSummary!=='function')return null;const overlay=document.getElementById('zSummaryOverlay'),card=document.getElementById('zSummaryCard');if(!overlay||!card)return null;rawZombieSummary(pipsEarned);decorateZombieResult(card);overlay.classList.remove('show');const marker=document.createComment('ttd-prepared-zombie-result-v6');card.replaceWith(marker);return{overlay,card,marker};}
  function revealZombieResult(prepared){if(!prepared)return;if(prepared.marker.parentNode)prepared.marker.replaceWith(prepared.card);decorateZombieResult(prepared.card);void prepared.overlay.offsetWidth;prepared.overlay.classList.add('show');}
  function installSummaryWrapper(){if(typeof showZombieSummary!=='function'||showZombieSummary.__ttdResultDecoratedV6)return;rawZombieSummary=showZombieSummary;const wrapped=function(...args){if(performance.now()<suppressZombieSummaryUntil)return;const result=rawZombieSummary.apply(this,args);decorateZombieResult();return result;};wrapped.__ttdResultDecoratedV6=true;wrapped.__ttdResultBaseV6=rawZombieSummary;showZombieSummary=wrapped;}

  function installOutcomeFlows(){
    if(typeof campaignComplete==='function'&&!campaignComplete.__ttdClearWrappedV6){const baseCampaignComplete=campaignComplete;const wrappedCampaignComplete=function(...args){if(adventureClearBusy)return;adventureClearBusy=true;playClearCue();const result=baseCampaignComplete.apply(this,args);hideAdventureResult();setTimeout(()=>{revealAdventureResult();adventureClearBusy=false;},RESULT_REVEAL_MS);return result;};wrappedCampaignComplete.__ttdClearWrappedV6=true;wrappedCampaignComplete.__ttdClearBaseV6=baseCampaignComplete;campaignComplete=wrappedCampaignComplete;}
    if(typeof endMatch==='function'&&!endMatch.__ttdOutcomeWrappedV6){const baseEndMatch=endMatch;const wrappedEndMatch=function(reason,...args){if(matchResultBusy)return baseEndMatch.call(this,reason,...args);matchResultBusy=true;const normalized=String(reason||'').toLowerCase();const kind=normalized==='voluntary'?'finish':(normalized==='victory'||normalized==='clear'?'clear':'fail');const outcome=playOutcomeCue(kind);const result=baseEndMatch.call(this,reason,...args);hideAdventureResult();scheduleResultReveal(kind,outcome,()=>{revealAdventureResult();matchResultBusy=false;});return result;};wrappedEndMatch.__ttdOutcomeWrappedV6=true;wrappedEndMatch.__ttdOutcomeBaseV6=baseEndMatch;endMatch=wrappedEndMatch;}
    if(typeof endEndlessHorde==='function'&&!endEndlessHorde.__ttdResultWrappedV6){const baseEndHorde=endEndlessHorde;const wrappedEndHorde=function(...args){if(!state?.running||zombieResultBusy)return baseEndHorde.apply(this,args);zombieResultBusy=true;const kills=Math.max(0,Number(state.kills)||0),actualPlayTime=Math.max(0,Number(state.zPlayTime)||0),actualTime=Math.max(0,Number(state.time)||0),pipsEarned=kills>0?Math.round(kills*2+actualPlayTime*.15):0;playFinishCue();suppressZombieSummaryUntil=performance.now()+ZOMBIE_SUPPRESS_MS;let result;if(kills<=0){state.zPlayTime=0;state.time=0;}try{result=baseEndHorde.apply(this,args);}finally{if(kills<=0){state.zPlayTime=actualPlayTime;state.time=actualTime;}}const prepared=prepareZombieResult(pipsEarned);setTimeout(()=>{revealZombieResult(prepared);zombieResultBusy=false;},RESULT_REVEAL_MS);return result;};wrappedEndHorde.__ttdResultWrappedV6=true;wrappedEndHorde.__ttdResultBaseV6=baseEndHorde;endEndlessHorde=wrappedEndHorde;}
  }

  function presentObjectiveClear({prepare,reveal,delay=RESULT_REVEAL_MS}={}){playClearCue();const prepared=typeof prepare==='function'?prepare():undefined;setTimeout(()=>{if(typeof reveal==='function')reveal(prepared);},Math.max(0,Number(delay)||RESULT_REVEAL_MS));return prepared;}
  function presentOutcome(kind,{prepare,reveal,delay=RESULT_REVEAL_MS}={}){const outcome=playOutcomeCue(kind);const prepared=typeof prepare==='function'?prepare():undefined;scheduleResultReveal(kind,outcome,()=>{if(typeof reveal==='function')reveal(prepared);},delay);return prepared;}
  function installAll(){if(typeof startGame==='function')bindStart('startGame',()=>startGame,fn=>{startGame=fn;});if(typeof startAdventure==='function')bindStart('startAdventure',()=>startAdventure,fn=>{startAdventure=fn;});if(typeof startAdventureCampaign==='function')bindStart('startAdventureCampaign',()=>startAdventureCampaign,fn=>{startAdventureCampaign=fn;});if(typeof startEndlessHorde==='function')bindStart('startEndlessHorde',()=>startEndlessHorde,fn=>{startEndlessHorde=fn;});decorateAdventureResult();scanLegacyMissionNodes();}

  window.TTDGamePresentation=Object.freeze({version:6,mapPreviewMs:MAP_PREVIEW_MS,missionGapMs:MISSION_GAP_MS,combatCountdownStepMs:COUNT_STEP_MS,clearHideMs:OUTCOME_HIDE_MS,resultRevealMs:RESULT_REVEAL_MS,failPostVoiceMs:FAIL_POST_VOICE_MS,showMissionStart:playMissionCue,playCombatCountdown,showClear:playClearCue,showFail:playFailCue,showFinish:playFinishCue,presentObjectiveClear,presentOutcome,decorateAdventureResult,decorateZombieResult,rebind:installAll});
  installAll();let tries=0;const timer=setInterval(()=>{installAll();if(++tries>160)clearInterval(timer);},100);
})();