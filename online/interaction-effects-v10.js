(() => {
  'use strict';

  const LIFT_MS_V10 = 600;
  const INFO_MS_V10 = 1100;
  const MOVE_THRESHOLD_V10 = 10;
  const SPINNER_CIRC_V10 = 81.68;

  function installV10Styles(){
    if(document.getElementById('ttd-interaction-v10-style')) return;
    const style=document.createElement('style');
    style.id='ttd-interaction-v10-style';
    style.textContent=`
      /* Mobile deck footer: always reachable, regardless of viewport/browser chrome height. */
      #deckScreen{padding-bottom:0!important;}
      #deckFooter{
        position:absolute!important;left:0;right:0;bottom:0;z-index:35;
        padding:8px 12px calc(8px + env(safe-area-inset-bottom))!important;
        background:linear-gradient(0deg,rgba(10,12,20,.99),rgba(18,22,42,.96));
        border-top:1px solid var(--ink-700);box-shadow:0 -8px 22px rgba(0,0,0,.34);
      }
      #saveDeckBtn{width:100%!important;min-height:42px!important;font-family:'Cinzel',serif!important;font-weight:700!important;}
      #collectionGrid{padding-bottom:78px!important;}

      /* A die card owns its touch gesture until we decide scroll-vs-hold ourselves. */
      #collectionGrid .colCard{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important;}
      #collectionGrid.ttdManualScrolling{scroll-behavior:auto!important;}

      /* Replace the old green/black +N battle marker with layered gold stars. */
      .tile .puLevel{display:none!important;}
      .powerStarStack{position:absolute;right:4px;bottom:3px;width:18px;height:18px;pointer-events:none;z-index:9;}
      .powerStar{
        position:absolute;right:0;bottom:0;font-size:15px;line-height:1;font-style:italic;font-weight:800;
        color:#f6d77f;transform:rotate(-14deg);transform-origin:center;
        text-shadow:0 1px 1px rgba(0,0,0,.95),0 0 4px rgba(246,215,127,.48);
      }

      /* Battle power-up acknowledgement. */
      .ttdPowerFx{position:fixed;z-index:190;pointer-events:none;overflow:visible;transform:translateZ(0);}
      .ttdPowerWipe{
        position:absolute;inset:3px;border-radius:11px;border:1px solid rgba(255,221,132,.9);
        background:radial-gradient(ellipse at center,rgba(255,240,177,.44) 0%,rgba(239,190,76,.19) 48%,rgba(239,190,76,0) 74%);
        box-shadow:0 0 8px rgba(243,212,145,.26),inset 0 0 8px rgba(255,225,140,.26);
        transform:scale(.12,.12);opacity:0;animation:ttdPowerWipe .46s ease-out forwards;
      }
      .ttdPowerLabel{
        position:absolute;left:50%;top:-8px;transform:translate(-50%,-100%);white-space:nowrap;
        padding:2px 7px;border-radius:7px;background:rgba(7,9,16,.64);border:1px solid rgba(217,178,106,.25);
        color:#f3d491;font:700 11px 'Cinzel',serif;letter-spacing:.02em;
        text-shadow:-1px -1px 0 #0a0c14,1px -1px 0 #0a0c14,-1px 1px 0 #0a0c14,1px 1px 0 #0a0c14,0 0 7px rgba(243,212,145,.55);
        animation:ttdPowerLabel .72s ease-out forwards;
      }
      @keyframes ttdPowerWipe{0%{transform:scale(.12,.12);opacity:0}20%{opacity:.95}72%{transform:scale(1.03,1.03);opacity:.74}100%{transform:scale(1.10,1.10);opacity:0}}
      @keyframes ttdPowerLabel{0%{opacity:0;transform:translate(-50%,-82%)}18%{opacity:1}76%{opacity:1}100%{opacity:0;transform:translate(-50%,-130%)}}

      /* Immediate merge contact response while Firebase resolves the authoritative transaction. */
      .ttdMergeContact{
        position:fixed;z-index:188;pointer-events:none;border-radius:14px;border:2px solid rgba(243,212,145,.9);
        box-shadow:0 0 12px rgba(243,212,145,.58),inset 0 0 10px rgba(243,212,145,.24);
        animation:ttdMergeContact .42s ease-out forwards;
      }
      @keyframes ttdMergeContact{0%{opacity:0;transform:scale(.76)}20%{opacity:1}100%{opacity:0;transform:scale(1.13)}}

      /* Successful Class merge: rainbow ring first, readable label second. */
      .ttdClassRing{position:fixed;z-index:205;width:4px;height:4px;pointer-events:none;transform:translate(-50%,-50%);}
      .ttdClassRingCore{
        position:absolute;left:2px;top:2px;width:20px;height:20px;border-radius:50%;
        transform:translate(-50%,-50%) scale(.2);border:2px solid rgba(255,255,255,.8);
        box-shadow:0 0 12px rgba(255,255,255,.55);animation:ttdClassRingCore .48s ease-out forwards;
      }
      .ttdClassParticle{
        --r:34px;position:absolute;left:0;top:0;width:6px;height:6px;border-radius:50%;
        background:hsl(var(--hue) 90% 68%);box-shadow:0 0 8px hsl(var(--hue) 90% 68%);
        opacity:0;transform:rotate(var(--ang)) translateX(4px) scale(.35);
        animation:ttdClassParticle .62s cubic-bezier(.17,.76,.25,1) forwards;
      }
      @keyframes ttdClassRingCore{0%{opacity:.9;transform:translate(-50%,-50%) scale(.2)}70%{opacity:.7;transform:translate(-50%,-50%) scale(2.7)}100%{opacity:0;transform:translate(-50%,-50%) scale(3.2)}}
      @keyframes ttdClassParticle{0%{opacity:0;transform:rotate(var(--ang)) translateX(4px) scale(.35)}16%{opacity:1}72%{opacity:1;transform:rotate(var(--ang)) translateX(var(--r)) scale(1)}100%{opacity:0;transform:rotate(var(--ang)) translateX(calc(var(--r) + 9px)) scale(.55)}}
      .ttdClassLabel{
        position:fixed;z-index:210;pointer-events:none;transform:translate(-50%,-100%);text-align:center;
        min-width:92px;padding:5px 9px 4px;border-radius:9px;background:rgba(7,9,16,.76);
        border:1px solid rgba(217,178,106,.48);box-shadow:0 4px 14px rgba(0,0,0,.4),0 0 9px rgba(217,178,106,.14);
        backdrop-filter:blur(3px);opacity:0;animation:ttdClassLabel .9s ease-out forwards;
      }
      .ttdClassLabel .title{display:block;color:#f3d491;font:700 13px 'Cinzel',serif;line-height:1.05;letter-spacing:.02em;}
      .ttdClassLabel .class{display:block;margin-top:2px;color:#fff2c9;font:800 12px 'Space Mono',monospace;line-height:1.05;}
      .ttdClassLabel .title,.ttdClassLabel .class{
        text-shadow:-1px -1px 0 #05060b,1px -1px 0 #05060b,-1px 1px 0 #05060b,1px 1px 0 #05060b,0 0 7px rgba(243,212,145,.45);
      }
      @keyframes ttdClassLabel{0%{opacity:0;transform:translate(-50%,-82%) scale(.94)}14%{opacity:1;transform:translate(-50%,-100%) scale(1)}76%{opacity:1}100%{opacity:0;transform:translate(-50%,-118%) scale(.98)}}
    `;
    document.head.appendChild(style);
  }

  function currentDeckIsFull(){
    if(!account||!Array.isArray(account.decks))return false;
    const deck=account.decks[account.activeDeckIdx];
    if(!Array.isArray(deck)||deck.length!==5)return false;
    return deck.every(entry=>{
      if(!entry)return false;
      const key=deckEntryKey(entry);
      return !!(key&&entry.instId&&(account.owned[key]||[]).some(inst=>inst?.id===entry.instId));
    });
  }
  function showFullDeckNotice(context){
    const message=context==='leave'
      ? 'A full deck of five dice is required before you can save this deck or leave the deck editor.'
      : 'A full deck of five dice is required to play.';
    showNotice('Full Deck Required',message);
  }

  function frozenRectFromElement(el,x,y){
    const r=el?.getBoundingClientRect?.();
    if(r&&Number.isFinite(r.left)){
      const frozen={left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,x:r.x,y:r.y};
      return {getBoundingClientRect:()=>frozen};
    }
    const px=Number.isFinite(x)?x:innerWidth/2,py=Number.isFinite(y)?y:innerHeight/2;
    const frozen={left:px-28,top:py-28,right:px+28,bottom:py+28,width:56,height:56,x:px-28,y:py-28};
    return {getBoundingClientRect:()=>frozen};
  }
  function rectOf(anchor){
    const fallback={left:innerWidth/2-28,top:innerHeight/2-28,width:56,height:56,right:innerWidth/2+28,bottom:innerHeight/2+28};
    try{return anchor?.getBoundingClientRect?.()||fallback;}catch(_){return fallback;}
  }

  function playMergeContact(anchor){
    const r=rectOf(anchor);
    const fx=document.createElement('div');
    fx.className='ttdMergeContact';
    fx.style.left=`${r.left}px`;fx.style.top=`${r.top}px`;fx.style.width=`${Math.max(8,r.width)}px`;fx.style.height=`${Math.max(8,r.height)}px`;
    document.body.appendChild(fx);
    setTimeout(()=>fx.remove(),460);
  }

  function playRainbowRing(anchor){
    const r=rectOf(anchor),cx=r.left+r.width/2,cy=r.top+r.height/2;
    const ring=document.createElement('div');
    ring.className='ttdClassRing';ring.style.left=`${cx}px`;ring.style.top=`${cy}px`;
    let html='<div class="ttdClassRingCore"></div>';
    const count=14;
    for(let i=0;i<count;i++){
      html+=`<i class="ttdClassParticle" style="--ang:${Math.round(i*360/count)}deg;--hue:${Math.round(i*360/count)};animation-delay:${(i%3)*0.018}s"></i>`;
    }
    ring.innerHTML=html;document.body.appendChild(ring);
    setTimeout(()=>ring.remove(),720);
  }

  function showClassLabel(anchor,newCls){
    const r=rectOf(anchor),cx=r.left+r.width/2;
    const y=Math.max(58,r.top-7);
    const label=document.createElement('div');
    label.className='ttdClassLabel';
    label.style.left=`${Math.max(54,Math.min(innerWidth-54,cx))}px`;
    label.style.top=`${y}px`;
    label.innerHTML=`<span class="title">Class Up!</span><span class="class">C${newCls}</span>`;
    document.body.appendChild(label);
    setTimeout(()=>label.remove(),980);
  }

  function playPowerUpEffect(idx){
    const tile=tileEls?.[idx];if(!tile)return;
    const r=tile.getBoundingClientRect();
    const fx=document.createElement('div');
    fx.className='ttdPowerFx';
    fx.style.left=`${r.left}px`;fx.style.top=`${r.top}px`;fx.style.width=`${r.width}px`;fx.style.height=`${r.height}px`;
    fx.innerHTML='<div class="ttdPowerWipe"></div><div class="ttdPowerLabel">Powered up!</div>';
    document.body.appendChild(fx);
    setTimeout(()=>fx.remove(),780);
  }

  function applyPowerStarStacks(){
    if(!state||!Array.isArray(state.board)||!Array.isArray(tileEls))return;
    for(let i=0;i<tileEls.length;i++){
      const tile=tileEls[i],die=state.board[i];if(!tile||!die||!die.pu)continue;
      tile.querySelector('.powerStarStack')?.remove();
      const stack=document.createElement('div');stack.className='powerStarStack';
      const count=Math.max(0,Math.min(4,Number(die.pu)||0));
      for(let j=0;j<count;j++){
        const star=document.createElement('span');star.className='powerStar';star.textContent='✦';
        star.style.right=`${(count-1-j)*1.15}px`;star.style.bottom=`${(count-1-j)*.75}px`;
        star.style.opacity=String(.38+.62*((j+1)/count));star.style.zIndex=String(2+j);
        stack.appendChild(star);
      }
      tile.appendChild(stack);
    }
  }

  installV10Styles();

  /* Battle rendering/power-up polish. */
  const baseRenderBoardV10=renderBoard;
  renderBoard=function renderBoardV10(){
    const result=baseRenderBoardV10.apply(this,arguments);
    applyPowerStarStacks();
    return result;
  };
  tapTile=function tapTileV10(idx){
    const die=state?.board?.[idx];if(!die)return;
    if(die.pu>=4){toast('Max power');return;}
    const cost=PU_COSTS[die.pu];
    if(state.sp<cost){toast('Not enough SP');return;}
    state.sp-=cost;die.pu+=1;
    renderBoard();
    playPowerUpEffect(idx);
  };
  applyPowerStarStacks();

  /* Faster, stable Collection gestures: move-before-hold scrolls; move-after-hold drags. */
  attachInstanceCardEvents=function attachInstanceCardEventsV10(card,key,instId){
    card.draggable=false;
    card.addEventListener('dragstart',ev=>ev.preventDefault());
    card.addEventListener('contextmenu',ev=>ev.preventDefault());
    card.addEventListener('pointerdown',ev=>{
      if(ev.isPrimary===false)return;
      ev.preventDefault();
      const scrollHost=card.closest('.scrollY')||document.getElementById('collectionGrid');
      const startX=ev.clientX,startY=ev.clientY,startScroll=scrollHost?.scrollTop||0;
      const dragState={
        key,instId,active:false,moved:false,cancelled:false,detailFired:false,lifted:false,scrolling:false,
        startX,startY,ghostEl:null,srcCard:card,spinnerEl:null,rafId:null,startTime:performance.now(),pointerId:ev.pointerId,
      };
      instDrag=dragState;
      try{card.setPointerCapture(ev.pointerId);}catch(_){}
      const spinner=createHoldSpinner();card.appendChild(spinner);dragState.spinnerEl=spinner;
      const fillEl=spinner.querySelector('.spinnerFill');

      const cleanup=()=>{
        if(dragState.rafId)cancelAnimationFrame(dragState.rafId);
        if(dragState.spinnerEl?.parentElement)dragState.spinnerEl.remove();
        card.classList.remove('lifting');
        scrollHost?.classList.remove('ttdManualScrolling');
      };
      const finishListeners=()=>{
        card.removeEventListener('pointermove',onMove);
        card.removeEventListener('pointerup',onUp);
        card.removeEventListener('pointercancel',onCancel);
        card.removeEventListener('lostpointercapture',onLost);
        try{if(card.hasPointerCapture?.(ev.pointerId))card.releasePointerCapture(ev.pointerId);}catch(_){}
      };
      const tick=()=>{
        if(instDrag!==dragState||dragState.cancelled||dragState.active||dragState.detailFired||dragState.scrolling)return;
        const elapsed=performance.now()-dragState.startTime;
        const progress=Math.min(1,elapsed/INFO_MS_V10);
        if(fillEl)fillEl.style.strokeDashoffset=(SPINNER_CIRC_V10*(1-progress)).toFixed(2);
        if(elapsed>=LIFT_MS_V10&&!dragState.lifted){
          dragState.lifted=true;card.classList.add('lifting');
          if(navigator.vibrate)navigator.vibrate(14);
        }
        if(progress>=1){
          dragState.detailFired=true;cleanup();finishListeners();
          instDrag=null;window.__dragKey=null;
          showDieDetail(key,{collectionInstId:instId});
          return;
        }
        dragState.rafId=requestAnimationFrame(tick);
      };

      const onMove=mv=>{
        if(instDrag!==dragState||dragState.cancelled||dragState.detailFired)return;
        if(mv.pointerId!==dragState.pointerId)return;
        mv.preventDefault();
        const dx=mv.clientX-startX,dy=mv.clientY-startY,dist=Math.hypot(dx,dy);
        if(dragState.scrolling){if(scrollHost)scrollHost.scrollTop=startScroll-dy;return;}
        if(dragState.active){moveInstGhost(mv.clientX,mv.clientY);return;}
        if(dist<=MOVE_THRESHOLD_V10)return;
        if(dragState.lifted){
          dragState.moved=true;cleanup();beginInstDrag(card,key,mv.clientX,mv.clientY);
        }else{
          dragState.scrolling=true;dragState.cancelled=true;cleanup();scrollHost?.classList.add('ttdManualScrolling');
          if(scrollHost)scrollHost.scrollTop=startScroll-dy;
        }
      };
      const onUp=up=>{
        if(up.pointerId!==dragState.pointerId)return;
        finishListeners();cleanup();window.__dragKey=null;
        document.querySelectorAll('.dropHover,.mergeHover').forEach(el=>el.classList.remove('dropHover','mergeHover'));
        if(instDrag===dragState&&dragState.active)endInstDrag(up.clientX,up.clientY);
        else if(instDrag===dragState&&!dragState.cancelled&&!dragState.moved&&!dragState.detailFired&&!dragState.lifted)quickEquip(key,instId);
        if(instDrag===dragState)instDrag=null;
      };
      const onCancel=()=>{
        finishListeners();cleanup();
        if(dragState.active){card.classList.remove('dragging');dragState.ghostEl?.remove();}
        window.__dragKey=null;
        document.querySelectorAll('.dropHover,.mergeHover').forEach(el=>el.classList.remove('dropHover','mergeHover'));
        if(instDrag===dragState)instDrag=null;
      };
      const onLost=()=>{if(instDrag===dragState)onCancel();};
      card.addEventListener('pointermove',onMove,{passive:false});
      card.addEventListener('pointerup',onUp);
      card.addEventListener('pointercancel',onCancel);
      card.addEventListener('lostpointercapture',onLost);
      dragState.rafId=requestAnimationFrame(tick);
    },{passive:false});
  };

  /* Rebuild once so cards already on screen receive the v10 gesture handler. */
  if(document.getElementById('deckScreen')?.classList.contains('active'))renderCollectionGrid();

  /* Freeze the actual target card rect at drop time, and acknowledge the drop immediately. */
  tryMergeAtPoint=function tryMergeAtPointV10(x,y,srcKey,srcInstId){
    const el=document.elementFromPoint(x,y),cardEl=el?.closest?.('.colCard');
    if(!cardEl||!cardEl.dataset.key||!cardEl.dataset.instId)return false;
    const targetKey=cardEl.dataset.key,targetInstId=cardEl.dataset.instId;
    if(targetKey!==srcKey||targetInstId===srcInstId)return false;
    const a=findInstance(srcKey,srcInstId),b=findInstance(targetKey,targetInstId);
    if(!a||!b||a.cls!==b.cls||a.cls>=10)return false;
    const anchor=frozenRectFromElement(cardEl,x,y);
    playMergeContact(anchor);
    mergeInstances(srcKey,srcInstId,targetInstId,anchor);
    return true;
  };

  /* New Class presentation: rainbow ring, then only the NEW Class value, above the resulting die. */
  playClassUpAnimation=function playClassUpAnimationV10(key,oldCls,newCls,anchorEl){
    return new Promise(resolve=>{
      const anchor=anchorEl||frozenRectFromElement(null);
      playRainbowRing(anchor);
      setTimeout(()=>showClassLabel(anchor,newCls),190);
      setTimeout(resolve,1040);
    });
  };

  /* Deck completion guards and mobile footer. */
  const baseRenderDeckScreenV10=renderDeckScreen;
  renderDeckScreen=function renderDeckScreenV10(){
    const result=baseRenderDeckScreenV10.apply(this,arguments);
    const save=document.getElementById('saveDeckBtn');if(save)save.textContent='Save Deck';
    return result;
  };
  const baseShowScreenV10=showScreen;
  showScreen=function showScreenV10(name){
    const deckActive=document.getElementById('deckScreen')?.classList.contains('active');
    if(deckActive&&name!=='deck'&&!currentDeckIsFull()){
      showFullDeckNotice('leave');
      return;
    }
    return baseShowScreenV10.apply(this,arguments);
  };

  const baseStartGameV10=typeof startGame==='function'?startGame:null;
  if(baseStartGameV10)startGame=function startGameV10(){
    if(!currentDeckIsFull()){showFullDeckNotice('play');return;}
    return baseStartGameV10.apply(this,arguments);
  };
  const baseStartEndlessV10=typeof startEndlessHorde==='function'?startEndlessHorde:null;
  if(baseStartEndlessV10)startEndlessHorde=function startEndlessHordeV10(){
    if(!currentDeckIsFull()){showFullDeckNotice('play');return;}
    return baseStartEndlessV10.apply(this,arguments);
  };
  const baseStartAdventureV10=typeof startAdventure==='function'?startAdventure:null;
  if(baseStartAdventureV10)startAdventure=function startAdventureV10(){
    if(!currentDeckIsFull()){showFullDeckNotice('play');return;}
    return baseStartAdventureV10.apply(this,arguments);
  };
  const baseStartCampaignV10=typeof startAdventureCampaign==='function'?startAdventureCampaign:null;
  if(baseStartCampaignV10)startAdventureCampaign=function startAdventureCampaignV10(){
    if(!currentDeckIsFull()){showFullDeckNotice('play');return;}
    return baseStartCampaignV10.apply(this,arguments);
  };

  // Existing mode buttons have older prechecks that use toasts. Capture first so all modes use
  // the same modal notice, including Zombie modes.
  document.addEventListener('click',event=>{
    const launch=event.target?.closest?.('[data-mode],[data-zombiemode]');
    if(!launch||currentDeckIsFull())return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    showFullDeckNotice('play');
  },true);

  renderDeckScreen();
})();