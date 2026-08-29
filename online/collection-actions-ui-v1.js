(() => {
  'use strict';
  if(window.__TTD_COLLECTION_ACTIONS_UI_V1)return;
  window.__TTD_COLLECTION_ACTIONS_UI_V1=true;

  const ORIGIN=location.origin;
  const SALE_BASE=Object.freeze({common:25,rare:50,unique:100,legendary:150});
  const SALE_CLASS=Object.freeze({1:30,2:45,3:80,4:100,5:120,6:140,7:160});
  const esc=(v)=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const send=(type,payload={})=>window.parent?.postMessage({type,...payload},ORIGIN);
  const byId=(id)=>document.getElementById(id);

  let mergePhase='off';
  let mergeSelection=null;
  let pendingMerge=null;
  let pendingSell=null;
  let lastStandardPress=null;
  let odHold=null;
  let suppressOdCardClick=null;
  let seq=0;

  const style=document.createElement('style');
  style.id='ttd-collection-actions-ui-v1-style';
  style.textContent=`
    #ttdBattleActionRow{display:flex;align-items:stretch;gap:6px;width:100%;min-width:0;}
    #ttdBattleActionRow #summonBtn{flex:1 1 auto;min-width:0;width:auto;padding-left:8px;padding-right:8px;}
    .ttdOdCastButton{flex:0 0 52px;min-width:52px;border:1px solid #4f4566;border-radius:10px;background:linear-gradient(180deg,#29243a,#171524);color:#9d94ad;font:800 9px 'Space Mono',monospace;letter-spacing:.03em;box-shadow:0 2px 0 #0b0a10;opacity:.58;transition:opacity .14s ease,filter .14s ease,border-color .14s ease,box-shadow .14s ease,color .14s ease;}
    .ttdOdCastButton.filled{opacity:.72;color:#c9c0d3;}
    .ttdOdCastButton.castable{opacity:1;color:#f4ddff;border-color:#d197ed;background:linear-gradient(180deg,#6a3f78,#3b244c);box-shadow:0 0 10px rgba(218,145,239,.62),0 2px 0 #24152d;text-shadow:0 0 5px rgba(244,208,255,.65);}
    .ttdOdCastButton:active{transform:translateY(1px)}
    .ttdOdCastButton:disabled{opacity:.34;}
    .ttdOverdriveBattleSlot.ttdOdUncastable{opacity:.42!important;filter:saturate(.58) brightness(.76);box-shadow:inset 0 0 8px rgba(50,40,65,.2)!important;}
    .ttdOverdriveBattleSlot.ttdOdCastable{opacity:1!important;filter:none;border-color:#d197ed!important;box-shadow:0 0 12px rgba(218,145,239,.68),inset 0 0 12px rgba(218,145,239,.12)!important;}
    .ttdOverdriveBattleSlot.ttdOdCastable .ttdOdCostBadge{border-color:#d197ed!important;color:#f0d8fb!important;box-shadow:0 0 6px rgba(218,145,239,.45);}
    .ttdOdInfoElement{display:inline-block;margin:2px 0 12px;padding:4px 8px;border:1px solid #42637b;border-radius:999px;background:#0e2031;color:#bfe9ff;font:800 9px 'Space Mono',monospace;letter-spacing:.04em;}
    .ttdOdInfoFlavor{margin:4px 0 18px;color:var(--mist);font-size:13px;line-height:1.55;font-style:italic;}
    #ttdMergeAllBtn{grid-column:2;background:linear-gradient(180deg,#e989ad,#bd5f87);border-color:#f0a5c2;color:#2a1020;font-weight:900;letter-spacing:.02em;box-shadow:0 2px 0 #71374f;transition:filter .14s ease,box-shadow .14s ease,transform .14s ease;}
    #ttdMergeAllBtn.active{filter:brightness(1.08);box-shadow:0 0 13px rgba(241,133,180,.72),0 2px 0 #71374f;}
    #deckTools.ttdOdMode #ttdMergeAllBtn{display:none!important;}
    #deckScreen.ttdMergeAllActive>.topbar,#deckScreen.ttdMergeAllActive>#deckTabs,#deckScreen.ttdMergeAllActive>#deckSlots,#deckScreen.ttdMergeAllActive>#deckFooter{opacity:.34;filter:saturate(.55);pointer-events:none;}
    #deckScreen.ttdMergeAllActive>#deckTools>*:not(#ttdMergeAllBtn){opacity:.34;filter:saturate(.55);pointer-events:none;}
    #deckScreen.ttdMergeAllActive #collectionGrid{opacity:1!important;filter:none!important;}
    #ttdCollectionSellBtn{width:100%;margin-top:9px;border-color:#b9904f;background:linear-gradient(180deg,#3d3224,#292117);color:#f3d491;font-weight:900;}
    #ttdCollectionSellBtn:disabled{opacity:.42;}
    .ttdNoticeButtons{display:flex;gap:8px;margin-top:14px;}
    .ttdNoticeButtons button{flex:1;min-width:0;}
    .ttdNoticeButtons .primaryChoice{border-color:#d197ed;background:linear-gradient(180deg,#684176,#422950);color:#f8e4ff;}
    .ttdNoticeButtons .pinkChoice{border-color:#f0a5c2;background:linear-gradient(180deg,#df82a8,#ad5479);color:#29101d;}
    .ttdMergeResultCounts{font:700 10px 'Space Mono',monospace;color:var(--mist);line-height:1.65;margin-top:9px;}
    @media(max-width:390px){.ttdOdCastButton{flex-basis:47px;min-width:47px;font-size:8px}#ttdBattleActionRow{gap:5px}}
  `;
  document.head.appendChild(style);

  function overdriveApi(){return window.__TTD_OVERDRIVE||null;}
  function abilityApi(){return window.__TTD_OVERDRIVE_ABILITIES||null;}
  function odPair(){try{return overdriveApi()?.equipped?.()||[null,null];}catch(_){return[null,null];}}
  function odDef(key){try{return overdriveApi()?.catalog?.()?.dice?.[key]||null;}catch(_){return null;}}
  function elementLabel(def){
    const raw=String(def?.element||'').trim();
    return !raw||/^neutral$/i.test(raw)||/^none(elemental)?$/i.test(raw)?'Nonelemental':raw;
  }
  function battleIsActive(){return !!(window.state?.running&&byId('gameScreen')?.classList.contains('active'));}
  function canCastOd(index){
    const pair=odPair(),key=pair[index]?.key||pair[index]||null,def=odDef(key);
    if(!def||!battleIsActive())return false;
    const drive=overdriveApi()?.drive?.(),dp=overdriveApi()?.dp?.();
    if(!drive?.ready||Number(dp?.current||0)<Number(def.dpCost||0))return false;
    if(abilityApi()?.targeting)return false;
    return true;
  }

  function ensureBattleActionRow(){
    const summon=byId('summonBtn'),tray=byId('tray');
    if(!summon||!tray)return;
    let row=byId('ttdBattleActionRow');
    if(!row){
      row=document.createElement('div');row.id='ttdBattleActionRow';
      summon.parentNode.insertBefore(row,summon);row.appendChild(summon);
    }
    const make=(index)=>{
      let button=byId(`ttdOdCast${index+1}`);
      if(button)return button;
      button=document.createElement('button');button.type='button';button.id=`ttdOdCast${index+1}`;button.className='ttdOdCastButton';button.textContent=`OD ${index+1}`;
      button.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();abilityApi()?.activateSlot?.(index);});
      return button;
    };
    const left=make(0),right=make(1);
    if(left.parentNode!==row)row.insertBefore(left,summon);
    if(right.parentNode!==row)row.appendChild(right);
  }

  function syncOdBattleState(){
    ensureBattleActionRow();
    const pair=odPair();
    for(let i=0;i<2;i++){
      const key=pair[i]?.key||pair[i]||null,def=odDef(key),ready=canCastOd(i),button=byId(`ttdOdCast${i+1}`);
      if(button){
        button.classList.toggle('filled',!!def);button.classList.toggle('castable',ready);button.disabled=!def;
        button.title=def?`${def.name||key} · ${Number(def.dpCost||0)} DP${ready?' · Ready':''}`:`Overdrive slot ${i+1} is empty`;
      }
      const slot=document.querySelector(`.ttdOverdriveBattleSlot[data-od-battle="${i}"]`);
      if(slot){slot.classList.toggle('ttdOdCastable',ready);slot.classList.toggle('ttdOdUncastable',!ready);}
    }
  }

  function showOdInfo(key){
    const def=odDef(key),overlay=byId('dieDetailOverlay'),card=byId('dieDetailCard');
    if(!def||!overlay||!card)return;
    card.innerHTML=`
      <h2 style="margin-top:6px;">${esc(def.name||key)}</h2>
      <div class="ttdOdInfoElement">${esc(elementLabel(def))}</div>
      <div class="ttdOdInfoFlavor">${esc(def.flavor||'')}</div>
      <button class="closeBtn" id="ttdOdInfoClose">Close</button>`;
    byId('ttdOdInfoClose')?.addEventListener('click',()=>overlay.classList.remove('show'));
    overlay.classList.add('show');
  }

  // The visible Overdrive die is now an inspection target. The explicit OD 1 / OD 2 buttons
  // are the only cast controls, so a player can inspect the equipped die without firing it.
  window.addEventListener('click',(event)=>{
    const battleSlot=event.target?.closest?.('.ttdOverdriveBattleSlot.filled');
    if(battleSlot){
      event.preventDefault();event.stopImmediatePropagation();
      const index=Number(battleSlot.dataset.odBattle),entry=odPair()[index],key=entry?.key||entry;
      if(key)showOdInfo(key);
      return;
    }
    const odCard=event.target?.closest?.('.ttdOdCard');
    if(odCard&&suppressOdCardClick===odCard){event.preventDefault();event.stopImmediatePropagation();suppressOdCardClick=null;}
  },true);

  window.addEventListener('pointerdown',(event)=>{
    const standard=event.target?.closest?.('#collectionGrid .colCard:not(.ttdOdCard)');
    if(standard&&byId('deckScreen')?.classList.contains('active')){
      lastStandardPress={key:standard.dataset.key,instId:standard.dataset.instId,at:Date.now()};
    }
    const odCard=event.target?.closest?.('#collectionGrid .ttdOdCard');
    if(odCard){
      odHold={card:odCard,x:event.clientX,y:event.clientY,timer:setTimeout(()=>{
        suppressOdCardClick=odCard;
        const name=odCard.querySelector('.cname')?.textContent||'';
        const key=[...Object.keys(overdriveApi()?.catalog?.()?.dice||{})].find(k=>(odDef(k)?.name||k)===name);
        if(key)showOdInfo(key);
      },620)};
    }
  },true);
  window.addEventListener('pointermove',(event)=>{if(odHold&&Math.hypot(event.clientX-odHold.x,event.clientY-odHold.y)>10){clearTimeout(odHold.timer);odHold=null;}},true);
  window.addEventListener('pointerup',()=>{if(odHold){clearTimeout(odHold.timer);odHold=null;}},true);
  window.addEventListener('pointercancel',()=>{if(odHold){clearTimeout(odHold.timer);odHold=null;}},true);

  function notice(title,html,buttons){
    const overlay=byId('noticeOverlay'),card=byId('noticeCard');if(!overlay||!card)return;
    card.innerHTML=`<h2 style="margin-top:6px;">${esc(title)}</h2><div style="color:var(--mist);font-size:13px;margin:12px 0 8px;line-height:1.5;">${html}</div><div class="ttdNoticeButtons">${buttons.map((b,i)=>`<button type="button" id="ttdNoticeChoice${i}" class="${esc(b.className||'')}">${esc(b.label)}</button>`).join('')}</div>`;
    buttons.forEach((button,index)=>byId(`ttdNoticeChoice${index}`)?.addEventListener('click',button.onClick));
    overlay.classList.add('show');
  }
  function hideNotice(){byId('noticeOverlay')?.classList.remove('show');}

  function ensureMergeAllButton(){
    const socket=byId('deckSocketFilter'),tools=byId('deckTools');if(!socket||!tools)return;
    let button=byId('ttdMergeAllBtn');
    if(!button){button=document.createElement('button');button.id='ttdMergeAllBtn';button.type='button';button.textContent='Merge All';socket.insertAdjacentElement('afterend',button);button.addEventListener('click',beginMergeAll);}
    if(tools.classList.contains('ttdOdMode')&&mergePhase!=='off')endMergeMode();
  }
  function setMergeVisual(on){byId('deckScreen')?.classList.toggle('ttdMergeAllActive',on);byId('ttdMergeAllBtn')?.classList.toggle('active',on);}
  function endMergeMode(){mergePhase='off';mergeSelection=null;setMergeVisual(false);}
  function beginMergeAll(){
    if(mergePhase!=='off'){endMergeMode();hideNotice();return;}
    mergePhase='prompt';setMergeVisual(true);
    notice('Merge All','Tap <strong>OK</strong>, then tap the die in your collection that you want to Merge All.',[
      {label:'OK',className:'pinkChoice',onClick:()=>{hideNotice();mergePhase='selecting';}},
      {label:'Cancel',onClick:()=>{hideNotice();endMergeMode();}},
    ]);
  }

  function selectedStandardCard(event){return event.target?.closest?.('#collectionGrid .colCard:not(.ttdOdCard)');}
  window.addEventListener('pointerdown',(event)=>{
    if(mergePhase!=='selecting')return;
    const card=selectedStandardCard(event);if(!card)return;
    event.preventDefault();event.stopImmediatePropagation();
    const key=card.dataset.key,instId=card.dataset.instId,instance=typeof window.findInstance==='function'?window.findInstance(key,instId):null;
    if(!key||!instance)return;
    mergeSelection={key,instId,classLevel:Number(instance.cls||1),name:window.DICE?.[key]?.name||key};
    mergePhase='scope';
    notice('Merge All',`Merge All Instances of <strong>${esc(mergeSelection.name)}</strong> in the collection, or Merge All within the selected Class level only?`,[
      {label:"All of 'em",className:'pinkChoice',onClick:()=>requestMergeAll('all')},
      {label:`Only this Class (C${mergeSelection.classLevel})`,onClick:()=>requestMergeAll('class')},
      {label:'Cancel',onClick:()=>{hideNotice();endMergeMode();}},
    ]);
  },true);

  function requestMergeAll(scope){
    if(!mergeSelection||pendingMerge)return;
    const requestId=`mergeall-${Date.now().toString(36)}-${++seq}`;pendingMerge={requestId,...mergeSelection,scope};mergePhase='working';
    notice('Merge All','Consolidating eligible copies and safely returning socketed gems…',[{label:'Working…',onClick:()=>{}}]);
    const btn=byId('ttdNoticeChoice0');if(btn)btn.disabled=true;
    send('ttd:collection-mergeall-request',{requestId,key:mergeSelection.key,scope,classLevel:mergeSelection.classLevel});
  }

  function addReturnedJewels(items){
    if(!Array.isArray(items)||!items.length)return 0;
    if(!window.account.inventory)window.account.inventory={rewards:[],materials:[],enchant:[]};
    if(!Array.isArray(window.account.inventory.enchant))window.account.inventory.enchant=[];
    const ids=new Set(window.account.inventory.enchant.filter(x=>x?.id).map(x=>x.id));let added=0;
    for(const jewel of items){if(!jewel?.id||ids.has(jewel.id))continue;window.account.inventory.enchant.push(jewel);ids.add(jewel.id);added++;}
    return added;
  }
  function applyDecks(decks){
    if(!Array.isArray(decks)||!window.account)return;
    const sorted=decks.slice().sort((a,b)=>a.index-b.index);
    window.account.decks=sorted.map(deck=>Array.isArray(deck.slots)?deck.slots.map(slot=>slot?{key:slot.key,instId:slot.instId}:null):[null,null,null,null,null]);
    window.account.activeDeckIdx=Math.min(Number(window.account.activeDeckIdx||0),Math.max(0,window.account.decks.length-1));
  }
  function applyMergeResult(m){
    const key=m.key;if(!window.account?.owned?.[key])return;
    const deleted=new Set(m.deletedIds||[]),updates=new Map((m.updatedInstances||[]).map(i=>[i.id,i]));
    window.account.owned[key]=window.account.owned[key].filter(inst=>!deleted.has(inst.id));
    for(const inst of window.account.owned[key]){const update=updates.get(inst.id);if(update){inst.cls=Number(update.cls||inst.cls);inst.enchants=[null,null,null,null];}}
    addReturnedJewels(m.returnedJewels||[]);applyDecks(m.decks||[]);
    if(m.favorites?.instanceIds)window.account.favoriteDice=[...m.favorites.instanceIds];
    window.renderDeckScreen?.();
    if(byId('inventoryScreen')?.classList.contains('active'))window.renderInventoryScreen?.();
  }
  function countsHtml(counts){
    return Object.entries(counts||{}).filter(([,n])=>Number(n)>0).sort((a,b)=>Number(a[0])-Number(b[0])).map(([c,n])=>`C${c}: ${n}`).join(' · ')||'No copies';
  }

  function saleValueFor(key,instance){
    const rarity=String(window.DICE?.[key]?.rarity||'').toLowerCase(),base=SALE_BASE[rarity],mult=SALE_CLASS[Number(instance?.cls)];
    return base&&mult?base*mult:null;
  }
  function appendSellButton(){
    const overlay=byId('dieDetailOverlay'),card=byId('dieDetailCard'),deck=byId('deckScreen');
    if(!overlay?.classList.contains('show')||!deck?.classList.contains('active')||byId('deckTools')?.classList.contains('ttdOdMode'))return;
    if(!lastStandardPress||Date.now()-lastStandardPress.at>5000||byId('ttdCollectionSellBtn'))return;
    const instance=typeof window.findInstance==='function'?window.findInstance(lastStandardPress.key,lastStandardPress.instId):null;if(!instance)return;
    const value=saleValueFor(lastStandardPress.key,instance),button=document.createElement('button');button.id='ttdCollectionSellBtn';button.type='button';
    if(value==null){button.textContent=`Sale value not configured for C${instance.cls}`;button.disabled=true;button.title='Die sale values are currently defined through Class 7 only.';}
    else{button.textContent=`Sell for ${value.toLocaleString()} Pips`;button.addEventListener('click',()=>confirmSell(lastStandardPress.key,lastStandardPress.instId));}
    card.appendChild(button);
  }
  function confirmSell(key,instId){
    if(pendingSell)return;
    const instance=typeof window.findInstance==='function'?window.findInstance(key,instId):null;if(!instance)return;
    const name=window.DICE?.[key]?.name||key,value=saleValueFor(key,instance);if(value==null)return;
    notice('Sell Die',`Are you sure you want to sell <strong>${esc(name)} (C${instance.cls})</strong>?`,[
      {label:'Yes',className:'primaryChoice',onClick:()=>requestSell(key,instId,name,instance.cls,value)},
      {label:'No',onClick:hideNotice},
    ]);
  }
  function requestSell(key,instId,name,classLevel,value){
    const requestId=`sell-${Date.now().toString(36)}-${++seq}`;pendingSell={requestId,key,instId,name,classLevel,value};
    notice('Selling Die','Completing transaction and returning any socketed gems…',[{label:'Working…',onClick:()=>{}}]);const btn=byId('ttdNoticeChoice0');if(btn)btn.disabled=true;
    send('ttd:collection-sell-request',{requestId,instanceId:instId});
  }
  function applySellResult(m){
    const key=m.key,id=m.instanceId;
    if(window.account?.owned?.[key])window.account.owned[key]=window.account.owned[key].filter(inst=>inst.id!==id);
    addReturnedJewels(m.returnedJewels||[]);applyDecks(m.decks||[]);
    if(m.favorites?.instanceIds)window.account.favoriteDice=[...m.favorites.instanceIds];
    if(Number.isSafeInteger(Number(m.pipsBalance)))window.account.gold=Number(m.pipsBalance);
    byId('dieDetailOverlay')?.classList.remove('show');lastStandardPress=null;
    window.renderDeckScreen?.();window.renderHome?.();
    if(byId('inventoryScreen')?.classList.contains('active'))window.renderInventoryScreen?.();
  }

  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const m=event.data||{};
    if(m.type==='ttd:collection-mergeall-result'&&pendingMerge&&m.requestId===pendingMerge.requestId){
      pendingMerge=null;applyMergeResult(m);hideNotice();endMergeMode();
      const note='<strong><em>All slotted gems were removed from each instance of these dice in order to merge all selected instances.</em></strong>';
      if(Number(m.mergeCount||0)<=0){
        notice('Merge All Complete',`There were not enough matching Class copies to merge.<br><br>${note}`,[{label:'OK',onClick:hideNotice}]);
      }else{
        notice('Merge All Complete',`${Number(m.mergeCount).toLocaleString()} merge${Number(m.mergeCount)===1?' was':'s were'} completed.<div class="ttdMergeResultCounts"><strong>Before:</strong> ${esc(countsHtml(m.beforeCounts))}<br><strong>After:</strong> ${esc(countsHtml(m.afterCounts))}</div><br>${note}`,[{label:'OK',onClick:hideNotice}]);
      }
      send('ttd:v6-refresh-request');return;
    }
    if(m.type==='ttd:collection-mergeall-error'&&pendingMerge&&m.requestId===pendingMerge.requestId){
      pendingMerge=null;hideNotice();endMergeMode();notice('Merge All',esc(m.message||'The server rejected Merge All.'),[{label:'OK',onClick:hideNotice}]);return;
    }
    if(m.type==='ttd:collection-sell-result'&&pendingSell&&m.requestId===pendingSell.requestId){
      const p=pendingSell;pendingSell=null;applySellResult(m);hideNotice();
      const jewelCount=Array.isArray(m.returnedJewels)?m.returnedJewels.length:0;
      notice('Transaction Successful',`${esc(p.name)} (C${p.classLevel}) was sold for <strong>${Number(m.pipsAwarded||p.value).toLocaleString()} Pips</strong>.<br><br>All ${jewelCount?`${jewelCount} `:''}slotted gem${jewelCount===1?' was':'s were'} removed from this die and returned to your Inventory.`,[{label:'OK',onClick:hideNotice}]);
      send('ttd:v6-refresh-request');return;
    }
    if(m.type==='ttd:collection-sell-error'&&pendingSell&&m.requestId===pendingSell.requestId){
      pendingSell=null;hideNotice();notice('Sell Die',esc(m.message||'The server rejected that sale.'),[{label:'OK',onClick:hideNotice}]);return;
    }
  });

  function periodic(){
    ensureBattleActionRow();ensureMergeAllButton();syncOdBattleState();appendSellButton();
    if(mergePhase!=='off'&&byId('deckTools')?.classList.contains('ttdOdMode'))endMergeMode();
  }
  setInterval(periodic,120);periodic();
})();
