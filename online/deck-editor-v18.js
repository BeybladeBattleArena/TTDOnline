(()=>{
  'use strict';
  if(window.__TTD_DECK_EDITOR_V18)return;
  window.__TTD_DECK_EDITOR_V18=true;
  const ORIGIN=location.origin;
  let manager=null;
  let equippedDeckIdx=Number.isSafeInteger(account?.activeDeckIdx)?account.activeDeckIdx:0;
  let deckNames=(account?.decks||[]).map((_,i)=>`Deck ${i+1}`);
  let savedSlots=(account?.decks||[]).map((deck)=>cloneDeck(deck));
  let requestCounter=0;
  let pendingExitTarget=null;
  let bypassExitGuard=false;
  let baseRenderDeckScreen=null;
  let baseShowScreen=null;

  function cloneDeck(deck){return Array.isArray(deck)?deck.map((slot)=>slot?{key:slot.key,instId:slot.instId}:null):[];}
  function slotsSignature(deck){try{return JSON.stringify(cloneDeck(deck));}catch(_){return'';}}
  function nameFor(index){return deckNames[index]||`Deck ${index+1}`;}
  function isFull(index){const deck=account?.decks?.[index];return Array.isArray(deck)&&deck.length===5&&deck.every((slot)=>slot&&slot.key&&slot.instId);}
  function isDirty(index){return slotsSignature(account?.decks?.[index])!==slotsSignature(savedSlots[index]);}
  function dirtyIndices(){return (account?.decks||[]).map((_,i)=>i).filter(isDirty);}
  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  function localSave(){
    const json=JSON.stringify(account);
    try{if(window.storage)window.storage.set('rd_account',json);}catch(e){console.error('artifact storage save failed',e);}
    try{localStorage.setItem('rd_account',json);}catch(e){console.error('localStorage save failed',e);}
  }
  function fullDeckNotice(){dialog('Full Deck Required','A full deck of five dice is required before you can save or equip this deck.',[{label:'OK',kind:'gold'}]);}

  const style=document.createElement('style');
  style.id='ttd-deck-editor-v18-style';
  style.textContent=`
    #deckFooter{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;padding:0!important;border:0!important;overflow:hidden!important;}
    #deckActionRow{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:1px;}
    #deckActionRow button{min-height:38px;border-radius:9px;padding:8px 7px;font-family:'Cinzel',serif;font-size:10.5px;font-weight:800;letter-spacing:.015em;}
    #deckSaveV18{border:0;color:var(--ink-950);background:linear-gradient(180deg,#ffe898,var(--gold));box-shadow:0 2px 0 #80652f;}
    #deckEquipV18{border:1px solid rgba(255,255,255,.72);color:#101321;background:linear-gradient(180deg,#fff,#dcdfe8);box-shadow:0 2px 0 #7c8190;}
    .deckTab{position:relative;min-width:0;}
    .deckTab .ttdDeckTabLabel{display:inline-block;max-width:calc(100% - 20px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;}
    .deckTab .ttdDeckEditName{position:absolute;right:3px;top:50%;transform:translateY(-50%);width:22px;height:22px;padding:0;border:0;background:transparent;color:var(--mist);font-size:13px;line-height:1;}
    .deckTab .ttdDeckEquippedDot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--moss);margin-right:4px;vertical-align:middle;box-shadow:0 0 5px rgba(111,174,125,.65);}
    .deckTab.ttdDirty::after{content:'*';position:absolute;left:5px;top:1px;color:#ffcc65;font:700 10px 'Space Mono',monospace;}
    .ttdDeckDialog{position:fixed;inset:0;z-index:350;background:rgba(4,6,14,.83);display:flex;align-items:center;justify-content:center;padding:16px;}
    .ttdDeckDialogCard{width:min(340px,94vw);border:1px solid var(--ink-700);border-radius:14px;background:linear-gradient(160deg,var(--ink-850),var(--ink-900));box-shadow:0 18px 55px rgba(0,0,0,.62);padding:18px;text-align:center;}
    .ttdDeckDialogCard h3{margin:0 0 8px;color:var(--gold-glow);font-family:'Cinzel',serif;font-size:16px;}
    .ttdDeckDialogCard p{margin:0 0 15px;color:var(--parchment);font-size:12px;line-height:1.45;}
    .ttdDeckDialogButtons{display:flex;gap:7px;justify-content:center;}
    .ttdDeckDialogButtons button{flex:1;min-height:38px;border-radius:9px;border:1px solid var(--ink-700);background:var(--ink-800);color:var(--parchment);font-weight:700;}
    .ttdDeckDialogButtons button[data-kind='gold']{border:0;background:linear-gradient(180deg,var(--gold-glow),var(--gold));color:var(--ink-950);}
    .ttdDeckDialogButtons button[data-kind='white']{background:#fff;color:#111528;border-color:#fff;}
    .ttdDeckNameInput{width:100%;margin:3px 0 14px;border:1px solid var(--ink-700);border-radius:8px;background:var(--ink-950);color:#fff;padding:9px;text-align:center;font:700 15px 'Space Mono',monospace;}
  `;
  document.head.appendChild(style);

  function dialog(title,message,buttons,inputValue=null){
    document.querySelector('.ttdDeckDialog')?.remove();
    const overlay=document.createElement('div');overlay.className='ttdDeckDialog';
    const input=inputValue==null?'':`<input id="ttdDeckDialogInput" class="ttdDeckNameInput" maxlength="12" inputmode="text" autocomplete="off" value="${String(inputValue).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}">`;
    overlay.innerHTML=`<div class="ttdDeckDialogCard"><h3>${title}</h3><p>${message}</p>${input}<div class="ttdDeckDialogButtons"></div></div>`;
    const row=overlay.querySelector('.ttdDeckDialogButtons');
    buttons.forEach((config)=>{
      const btn=document.createElement('button');btn.type='button';btn.textContent=config.label;btn.dataset.kind=config.kind||'';
      btn.addEventListener('click',()=>{const value=overlay.querySelector('#ttdDeckDialogInput')?.value;overlay.remove();config.onClick?.(value);});
      row.appendChild(btn);
    });
    document.body.appendChild(overlay);
    if(inputValue!=null){const field=overlay.querySelector('#ttdDeckDialogInput');requestAnimationFrame(()=>{field?.focus({preventScroll:true});field?.select();});}
    return overlay;
  }
  function notice(title,message,onOk){dialog(title,message,[{label:'OK',kind:'gold',onClick:onOk}]);}

  function ensureActions(){
    const tools=document.getElementById('deckTools');if(!tools)return;
    let row=document.getElementById('deckActionRow');
    if(!row){
      row=document.createElement('div');row.id='deckActionRow';
      row.innerHTML='<button id="deckSaveV18" type="button">Save Deck</button><button id="deckEquipV18" type="button">Equip this Deck</button>';
      const favorite=document.getElementById('deckFavoriteFilter');
      const meta=tools.querySelector('.deckToolMeta');
      if(favorite&&meta)tools.insertBefore(row,meta);else tools.appendChild(row);
      row.querySelector('#deckSaveV18')?.addEventListener('click',()=>saveCurrentDeck(false));
      row.querySelector('#deckEquipV18')?.addEventListener('click',()=>equipCurrentDeck());
    }
  }

  function decorateTabs(){
    const tabs=[...document.querySelectorAll('#deckTabs .deckTab')];
    tabs.forEach((tab,index)=>{
      tab.classList.toggle('ttdDirty',isDirty(index));
      tab.innerHTML=`${index===equippedDeckIdx?'<span class="ttdDeckEquippedDot" title="Equipped"></span>':''}<span class="ttdDeckTabLabel">${nameFor(index)}</span><button type="button" class="ttdDeckEditName" aria-label="Rename ${nameFor(index)}" title="Rename deck">✎</button>`;
      const pencil=tab.querySelector('.ttdDeckEditName');
      pencil?.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();openRename(index);});
    });
    ensureActions();
  }
  function refreshDeckUi(){try{baseRenderDeckScreen?.();}catch(err){console.error('Could not refresh deck editor.',err);}requestAnimationFrame(decorateTabs);}

  function openRename(index){
    dialog('Name Deck','Use 1 to 12 letters or numbers.',[
      {label:'Cancel'},
      {label:'Save Name',kind:'gold',onClick:(value)=>{
        const name=String(value||'').trim();
        if(!/^[A-Za-z0-9]{1,12}$/.test(name)){notice('Invalid Deck Name','Deck names must use 1 to 12 letters or numbers only.');return;}
        const requestId=`rename-${Date.now().toString(36)}-${++requestCounter}`;
        send('ttd:deck-v18-rename-request',{requestId,index,name});
      }},
    ],nameFor(index));
  }

  function managerFromMessage(next){
    if(!next||!Array.isArray(next.decks))return;
    manager=next;
    equippedDeckIdx=Number.isSafeInteger(next.activeDeckIdx)?next.activeDeckIdx:equippedDeckIdx;
    next.decks.forEach((deck,index)=>{
      deckNames[index]=deck?.name||defaultName(index);
      if(Array.isArray(deck?.slots))savedSlots[index]=cloneDeck(deck.slots);
    });
    refreshDeckUi();
  }
  function defaultName(index){return `Deck ${index+1}`;}

  function saveCurrentDeck(forExit=false,indexOverride=null,afterSave=null){
    const index=indexOverride==null?account.activeDeckIdx:indexOverride;
    if(!isFull(index)){fullDeckNotice();return;}
    const requestId=`save-${Date.now().toString(36)}-${++requestCounter}`;
    window.__TTD_DECK_V18_PENDING={requestId,type:'save',index,forExit,afterSave};
    send('ttd:deck-v18-save-request',{requestId,index,name:nameFor(index),slots:cloneDeck(account.decks[index])});
  }
  function equipCurrentDeck(indexOverride=null,afterEquip=null){
    const index=indexOverride==null?account.activeDeckIdx:indexOverride;
    if(!isFull(index)){fullDeckNotice();return;}
    const requestId=`equip-${Date.now().toString(36)}-${++requestCounter}`;
    window.__TTD_DECK_V18_PENDING={requestId,type:'equip',index,afterEquip};
    send('ttd:deck-v18-equip-request',{requestId,index,name:nameFor(index),slots:cloneDeck(account.decks[index])});
  }

  function discardDeck(index){
    if(savedSlots[index])account.decks[index]=cloneDeck(savedSlots[index]);
    localSave();
  }
  function continueExit(){
    const remaining=dirtyIndices();
    if(remaining.length){promptUnsaved(remaining.includes(account.activeDeckIdx)?account.activeDeckIdx:remaining[0]);return;}
    const target=pendingExitTarget||'home';pendingExitTarget=null;
    account.activeDeckIdx=Math.max(0,Math.min((account.decks?.length||1)-1,equippedDeckIdx));
    localSave();
    bypassExitGuard=true;
    try{baseShowScreen(target);}finally{bypassExitGuard=false;}
  }
  function promptEquipAfterSave(index){
    dialog('Equip Saved Deck',`Do you want to equip ${nameFor(index)} as your active deck?`,[
      {label:'No',onClick:continueExit},
      {label:'Yes',kind:'white',onClick:()=>equipCurrentDeck(index,continueExit)},
    ]);
  }
  function promptUnsaved(index){
    const label=nameFor(index);
    dialog('Unsaved Deck Changes',`You have not saved your latest edits to ${label}. Save your changes before exiting?`,[
      {label:'No',onClick:()=>{discardDeck(index);refreshDeckUi();continueExit();}},
      {label:'Cancel'},
      {label:'Yes',kind:'gold',onClick:()=>saveCurrentDeck(true,index,()=>promptEquipAfterSave(index))},
    ]);
  }

  function install(){
    if(!account||!Array.isArray(account.decks)||typeof renderDeckScreen!=='function'||typeof showScreen!=='function')return false;
    savedSlots=account.decks.map((deck)=>cloneDeck(deck));
    deckNames=account.decks.map((_,i)=>deckNames[i]||defaultName(i));
    baseRenderDeckScreen=renderDeckScreen;
    renderDeckScreen=function renderDeckScreenV18(){const out=baseRenderDeckScreen.apply(this,arguments);requestAnimationFrame(decorateTabs);return out;};
    baseShowScreen=showScreen;
    showScreen=function showScreenV18(name){
      const active=document.querySelector('.screen.active')?.id;
      if(!bypassExitGuard&&active==='deckScreen'&&name!=='deck'&&dirtyIndices().length){pendingExitTarget=name;promptUnsaved(dirtyIndices().includes(account.activeDeckIdx)?account.activeDeckIdx:dirtyIndices()[0]);return;}
      if(active==='deckScreen'&&name!=='deck'){
        account.activeDeckIdx=Math.max(0,Math.min((account.decks?.length||1)-1,equippedDeckIdx));
        localSave();
      }
      return baseShowScreen.apply(this,arguments);
    };
    saveAccount=async function saveAccountV18(){localSave();requestAnimationFrame(decorateTabs);};
    ensureActions();
    refreshDeckUi();
    send('ttd:deck-v18-ready');
    return true;
  }

  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const message=event.data||{};
    if(message.type==='ttd:deck-v18-state'){managerFromMessage(message.manager);return;}
    if(message.type==='ttd:deck-v18-rename-result'){
      managerFromMessage(message.manager);
      const deck=message.manager?.decks?.[message.index];
      if(deck)notice('Deck Renamed',`${deck.name} is ready.`);
      return;
    }
    if(message.type==='ttd:deck-v18-save-result'){
      const pending=window.__TTD_DECK_V18_PENDING;
      if(!pending||pending.requestId!==message.requestId)return;
      window.__TTD_DECK_V18_PENDING=null;
      managerFromMessage(message.manager);
      savedSlots[pending.index]=cloneDeck(account.decks[pending.index]);
      localSave();refreshDeckUi();
      notice('Deck Saved',`${nameFor(pending.index)} has been saved successfully.`,()=>pending.afterSave?.());
      return;
    }
    if(message.type==='ttd:deck-v18-equip-result'){
      const pending=window.__TTD_DECK_V18_PENDING;
      if(!pending||pending.requestId!==message.requestId)return;
      window.__TTD_DECK_V18_PENDING=null;
      managerFromMessage(message.manager);
      equippedDeckIdx=message.manager?.activeDeckIdx??pending.index;
      savedSlots[pending.index]=cloneDeck(account.decks[pending.index]);
      localSave();refreshDeckUi();
      notice('Deck Equipped',`Now using ${nameFor(pending.index)} as your active deck.`,()=>pending.afterEquip?.());
      return;
    }
    if(message.type==='ttd:deck-v18-error'){
      const pending=window.__TTD_DECK_V18_PENDING;
      if(pending&&(!message.requestId||pending.requestId===message.requestId))window.__TTD_DECK_V18_PENDING=null;
      notice('Deck Error',message.message||'The server could not complete that deck action.');
    }
  });

  let attempts=0;const retry=()=>{attempts+=1;if(install())return;if(attempts<200)setTimeout(retry,25);else console.error('Deck editor v18 could not attach to the game runtime.');};retry();
})();