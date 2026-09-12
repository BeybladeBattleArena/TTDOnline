(() => {
  'use strict';
  if(window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1)return;
  window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1=true;

  const SLOT_ID='ttdGameplayHeaderSlotV1';
  const METERS_ID='ttdGameplayHeaderMetersV1';
  const START_SIGNAL='#ttdGameSignalV6 .ttdStartWord.in';
  const FALLBACK_TRANSITION_MS=2200;
  const AREA_REVEAL_MS=1150;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;

  let activeState=null;
  let sawIntroHold=false;
  let introReleaseConsumed=false;
  let runStartedAt=0;
  let metersVisible=false;
  let lastModeText='';
  let locationRevealUntil=0;
  let startTransitions=0;
  let areaReveals=0;

  const style=document.createElement('style');
  style.id='ttdGameplayResourceHeaderStyleV1';
  style.textContent=`
    #gameScreen.ttd-gameplay-resource-header-v1 #hud{min-height:62px;}
    #gameScreen.ttd-gameplay-resource-header-v1 .hud-left{flex:1 1 auto;min-width:0;}
    #gameScreen.ttd-gameplay-resource-header-v1 .hud-stats{flex:0 0 auto;}
    #${SLOT_ID}{position:relative;flex:1 1 250px;min-width:150px;max-width:350px;height:44px;overflow:hidden;}
    #${SLOT_ID}>#modeLabel{position:absolute;inset:0;display:flex;align-items:center;min-width:0;max-width:100%;line-height:1.16;white-space:normal;overflow:hidden;opacity:1;transform:translateY(0);transition:opacity .28s ease,transform .30s ease;}
    #${METERS_ID}{position:absolute;inset:0;display:grid;grid-template-rows:repeat(3,minmax(0,1fr));gap:2px;opacity:0;transform:translateY(4px);transition:opacity .28s ease,transform .30s ease;pointer-events:none;}
    #${SLOT_ID}.meters-on>#modeLabel{opacity:0;transform:translateY(-5px);}
    #${SLOT_ID}.meters-on>#${METERS_ID}{opacity:1;transform:translateY(0);}
    .ttdHeaderMeter{display:grid;grid-template-columns:30px minmax(54px,1fr) 47px;gap:4px;align-items:center;min-height:0;}
    .ttdHeaderMeter .name{font:800 6.5px 'Space Mono',monospace;letter-spacing:.055em;text-transform:uppercase;text-shadow:0 1px #000;}
    .ttdHeaderMeter .track{display:block;box-sizing:border-box;height:5px;overflow:hidden;border:1px solid rgba(255,255,255,.09);border-radius:4px;box-shadow:inset 0 1px 3px rgba(0,0,0,.58);}
    .ttdHeaderMeter .fill{display:block;height:100%;width:0;min-width:0;transition:width .15s linear;border-radius:3px;}
    .ttdHeaderMeter .value{text-align:right;font:800 6.5px 'Space Mono',monospace;white-space:nowrap;text-shadow:0 1px #000;}
    .ttdHeaderMeter.hp .name,.ttdHeaderMeter.hp .value{color:#a7e8b7}.ttdHeaderMeter.hp .track{background:#10291a}.ttdHeaderMeter.hp .fill{background:linear-gradient(90deg,#5cae72,#8ed39e);box-shadow:0 0 6px rgba(111,205,137,.42)}
    .ttdHeaderMeter.dp .name,.ttdHeaderMeter.dp .value{color:#a9dff6}.ttdHeaderMeter.dp .track{background:#071827}.ttdHeaderMeter.dp .fill{background:linear-gradient(90deg,#46bdf0,#8ce7ff);box-shadow:0 0 6px rgba(85,207,255,.54)}
    .ttdHeaderMeter.drive .name,.ttdHeaderMeter.drive .value{color:#ddc1ff}.ttdHeaderMeter.drive .track{background:#170d27}.ttdHeaderMeter.drive .fill{background:linear-gradient(90deg,#8b49d8,#c77cff);box-shadow:0 0 6px rgba(181,109,255,.56)}
    #gameScreen.ttd-gameplay-resource-header-v1 #ttdDriveHud{display:none!important;}
    #gameScreen.ttd-gameplay-resource-header-v1 #playerHpWrap{display:none!important;}
    @media(max-width:520px){
      #gameScreen.ttd-gameplay-resource-header-v1 #hud{gap:5px;padding-left:8px;padding-right:8px;}
      #gameScreen.ttd-gameplay-resource-header-v1 .hud-left{gap:5px;}
      #${SLOT_ID}{flex-basis:185px;min-width:118px;max-width:235px;height:42px;}
      .ttdHeaderMeter{grid-template-columns:25px minmax(42px,1fr) 40px;gap:3px;}
      .ttdHeaderMeter .name,.ttdHeaderMeter .value{font-size:5.8px;letter-spacing:.025em;}
      .ttdHeaderMeter .track{height:4px;}
    }
  `;
  document.head.appendChild(style);

  function ensureSlot(){
    const game=document.getElementById('gameScreen');
    const left=game?.querySelector('.hud-left');
    const label=document.getElementById('modeLabel');
    if(!game||!left||!label)return null;
    game.classList.add('ttd-gameplay-resource-header-v1');
    let slot=document.getElementById(SLOT_ID);
    if(!slot){
      slot=document.createElement('div');slot.id=SLOT_ID;
      left.insertBefore(slot,label);
      slot.appendChild(label);
      const meters=document.createElement('div');meters.id=METERS_ID;
      meters.innerHTML=`
        <div class="ttdHeaderMeter hp"><span class="name">HP</span><span class="track"><span class="fill" style="width:100%"></span></span><span class="value">50 / 50</span></div>
        <div class="ttdHeaderMeter dp"><span class="name">DP</span><span class="track"><span class="fill" style="width:100%"></span></span><span class="value">45 / 45</span></div>
        <div class="ttdHeaderMeter drive"><span class="name">Drive</span><span class="track"><span class="fill" style="width:0%"></span></span><span class="value">0%</span></div>`;
      slot.appendChild(meters);
    }else if(label.parentElement!==slot){slot.prepend(label);}
    // Several custom gameplay shells deliberately hide ordinary direct HUD children with
    // !important selectors. This shared slot is the canonical gameplay title/resource surface,
    // so keep it visible at inline-important priority while those shells remain free to hide the
    // old controls around it.
    slot.style.setProperty('display','block','important');
    return slot;
  }

  function showLocation(){
    const slot=ensureSlot();if(!slot)return;
    slot.classList.remove('meters-on');metersVisible=false;
  }
  function showMeters(){
    const slot=ensureSlot();if(!slot||metersVisible)return;
    paintMeters();
    slot.classList.add('meters-on');metersVisible=true;startTransitions++;
  }
  function startWordVisible(){return !!document.querySelector(START_SIGNAL);}

  function hpSnapshot(){
    const s=window.state;
    const stats=window.__TTD_OVERDRIVE?.playerStats?.()||window.account?.playerStats||{};
    let max=Math.max(1,num(stats.hp,50)),cur=max;
    if(s?.showPlayerHpBar){max=Math.max(1,num(s.livesMax,max));cur=clamp(num(s.lives,max),0,max);}
    return{cur,max,pct:clamp(cur/max*100,0,100)};
  }
  function resourceSnapshot(){
    const stats=window.__TTD_OVERDRIVE?.playerStats?.()||window.account?.playerStats||{};
    const dp=window.__TTD_OVERDRIVE?.dp?.()||{current:num(stats.dp,45),max:num(stats.dp,45)};
    const drive=window.__TTD_OVERDRIVE?.drive?.()||{current:0,max:100};
    const dpMax=Math.max(1,num(dp.max,num(stats.dp,45)||45)),dpCur=clamp(num(dp.current,dpMax),0,dpMax);
    const driveMax=Math.max(1,num(drive.max,100)),driveCur=clamp(num(drive.current,0),0,driveMax);
    return{hp:hpSnapshot(),dp:{cur:dpCur,max:dpMax,pct:clamp(dpCur/dpMax*100,0,100)},drive:{cur:driveCur,max:driveMax,pct:clamp(driveCur/driveMax*100,0,100)}};
  }
  function paintMeters(){
    const host=document.getElementById(METERS_ID);if(!host)return;
    const r=resourceSnapshot();
    const hp=host.querySelector('.hp'),dp=host.querySelector('.dp'),drive=host.querySelector('.drive');
    if(hp){hp.querySelector('.value').textContent=`${Math.round(r.hp.cur)} / ${Math.round(r.hp.max)}`;hp.querySelector('.fill').style.width=`${r.hp.pct}%`;}
    if(dp){dp.querySelector('.value').textContent=`${Math.round(r.dp.cur)} / ${Math.round(r.dp.max)}`;dp.querySelector('.fill').style.width=`${r.dp.pct}%`;}
    if(drive){drive.querySelector('.value').textContent=`${Math.floor(r.drive.pct)}%`;drive.querySelector('.fill').style.width=`${r.drive.pct}%`;}
  }

  function resetForState(next,now){
    activeState=next;
    sawIntroHold=next?.__ttdMissionIntroHold===true;
    introReleaseConsumed=false;
    runStartedAt=now;
    locationRevealUntil=0;
    lastModeText=String(document.getElementById('modeLabel')?.textContent||'').trim();
    showLocation();
    paintMeters();
  }
  function handleAreaNameChange(now,text){
    if(!activeState||!text||text===lastModeText)return;
    lastModeText=text;
    if(metersVisible&&activeState.running&&!activeState.__ttdMissionIntroHold){
      showLocation();
      locationRevealUntil=now+AREA_REVEAL_MS;
      areaReveals++;
    }
  }

  function tick(){
    const now=performance.now(),game=document.getElementById('gameScreen'),slot=ensureSlot();
    const s=window.state;
    if(!slot){setTimeout(tick,80);return;}
    paintMeters();
    if(!game?.classList.contains('active')||!s){
      activeState=null;sawIntroHold=false;introReleaseConsumed=false;locationRevealUntil=0;showLocation();setTimeout(tick,80);return;
    }
    if(s!==activeState)resetForState(s,now);
    const text=String(document.getElementById('modeLabel')?.textContent||'').trim();
    handleAreaNameChange(now,text);
    if(s.__ttdMissionIntroHold===true){
      sawIntroHold=true;
      introReleaseConsumed=false;
      locationRevealUntil=0;
      if(metersVisible)showLocation();
    }
    const startVisible=startWordVisible();
    const introReleased=sawIntroHold&&s.__ttdMissionIntroHold!==true&&!introReleaseConsumed;
    if(startVisible){
      introReleaseConsumed=true;
      locationRevealUntil=0;
      showMeters();
    }else if(introReleased){
      introReleaseConsumed=true;
      locationRevealUntil=0;
      showMeters();
    }else if(locationRevealUntil>0&&now>=locationRevealUntil){
      locationRevealUntil=0;
      showMeters();
    }else if(!metersVisible&&locationRevealUntil===0&&s.running&&now-runStartedAt>=FALLBACK_TRANSITION_MS){
      showMeters();
    }
    setTimeout(tick,80);
  }

  window.__TTD_GAMEPLAY_RESOURCE_HEADER_V1_API=Object.freeze({
    version:5,
    build:'location-to-hp-dp-drive-v5-visible-fills',
    get activeState(){return activeState;},
    get metersVisible(){return metersVisible;},
    get startTransitions(){return startTransitions;},
    get areaReveals(){return areaReveals;},
    showLocation,showMeters,resourceSnapshot,paintMeters,
  });
  ensureSlot();paintMeters();requestAnimationFrame(()=>paintMeters());tick();
})();
