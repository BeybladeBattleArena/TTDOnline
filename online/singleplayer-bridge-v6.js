(() => {
  'use strict';

  const ORIGIN = location.origin;
  let v6Ready = false;
  let requestCounter = 0;
  const pending = new Map();
  let runStartPending = null;
  let currentRun = null;
  let borrowedSupport = null;

  function send(type, payload = {}) { window.parent.postMessage({ type, ...payload }, ORIGIN); }
  function rid(prefix) { return `${prefix}-${Date.now().toString(36)}-${++requestCounter}`; }
  function request(type, resultType, payload = {}) {
    const requestId = rid(type.split(':').pop() || 'req');
    return new Promise((resolve, reject) => {
      pending.set(requestId, { resultType, resolve, reject });
      send(type, { requestId, ...payload });
      setTimeout(() => {
        if (!pending.has(requestId)) return;
        pending.delete(requestId);
        reject(new Error('The online server did not answer in time.'));
      }, 20000);
    });
  }
  function normalizeSlots(value) {
    const slots = Array.isArray(value) ? value.slice(0,4) : [];
    while (slots.length < 4) slots.push(null);
    return slots.map((j) => j && typeof j === 'object' ? JSON.parse(JSON.stringify(j)) : null);
  }
  function validSnapshot(s) {
    return !!(s && s.gameState && Array.isArray(s.dice) && Array.isArray(s.decks) && s.decks.length >= 3 && s.decks.length <= 5 && s.inventory && s.settings);
  }
  function applySnapshot(s) {
    if (!validSnapshot(s)) throw new Error('The server returned an invalid full account snapshot.');
    const owned = {};
    for (const grant of s.dice) {
      if (!grant || !DICE[grant.key] || !grant.instance?.id) continue;
      if (!owned[grant.key]) owned[grant.key] = [];
      owned[grant.key].push({ id:grant.instance.id, cls:grant.instance.cls, enchants:normalizeSlots(grant.instance.enchants) });
    }
    account.gold = s.gameState.economy.pips;
    account.astras = s.gameState.economy.astras;
    account.owned = owned;
    account.decks = s.decks.slice().sort((a,b)=>a.index-b.index).map((deck) => deck.slots.map((slot) => slot ? { key:slot.key, instId:slot.instId } : null));
    account.activeDeckIdx = Math.max(0, Math.min(account.decks.length-1, Number(s.gameState.activeDeckIdx || 0)));
    account.favoriteDice = Array.isArray(s.favorites) ? s.favorites.slice(0,10) : [];
    account.inventory = {
      rewards:Array.isArray(s.inventory.rewards) ? JSON.parse(JSON.stringify(s.inventory.rewards)) : [],
      materials:Array.isArray(s.inventory.materials) ? JSON.parse(JSON.stringify(s.inventory.materials)) : [],
      enchant:Array.isArray(s.inventory.enchant) ? JSON.parse(JSON.stringify(s.inventory.enchant)) : [],
    };
    account.settings = { ...(account.settings || {}), showDamageNumbers:s.settings.showDamageNumbers !== false };
    account.redeemedCodes = [];
    if (typeof renderHome === 'function') renderHome();
    if (typeof renderGachaTop === 'function') renderGachaTop();
    if (typeof renderDeckScreen === 'function') renderDeckScreen();
    if (typeof renderInventoryScreen === 'function') renderInventoryScreen();
    if (typeof renderOptionsScreen === 'function') renderOptionsScreen();
    if (typeof renderShopScreen === 'function' && document.getElementById('shopScreen')?.classList.contains('active')) renderShopScreen();
    return true;
  }
  function showError(title, err) {
    const text = err?.message || String(err || 'The server rejected that action.');
    if (typeof showNotice === 'function') showNotice(title, text);
    else if (typeof toastGlobal === 'function') toastGlobal(text);
  }
  function applyResultSnapshot(message) {
    if (message?.snapshot) {
      try { applySnapshot(message.snapshot); } catch (err) { console.error(err); }
    }
  }

  /* -------------------- Online shop / inventory authority -------------------- */
  const originalShopItemView = shopItemView;
  shopItemView = function onlineShopItemView(item, purchased) {
    const view = originalShopItemView(item, purchased);
    view._onlineItemId = item?.id || null;
    view._onlineSellValue = item?.sellValue || 0;
    return view;
  };

  showBuyConfirm = function onlineBuyConfirm(cardEl, view) {
    if (!view?._onlineItemId) { showError('Online Shop', new Error('That shop item is not available online.')); return; }
    let qty = 1;
    function render() {
      const total = view.cost * qty;
      cardEl.innerHTML = `
        <h2 style="margin-top:6px;">Confirm Purchase</h2>
        ${view.multiBuy ? `<div class="qtyRow"><button class="qtyBtn" id="qtyMinus" ${qty<=1?'disabled':''}>−</button><span class="qtyVal">${qty}</span><button class="qtyBtn" id="qtyPlus" ${(qty+1)*view.cost>account.gold?'disabled':''}>+</button></div>` : ''}
        <p style="color:var(--mist);font-size:13px;margin:12px 0 18px;">Buy this item for ${total} Pips?</p>
        <button class="closeBtn" id="buyYesBtn">Yes</button>
        <button class="closeBtn" id="buyCancelBtn" style="margin-top:8px;background:var(--ink-700);">Cancel</button>`;
      document.getElementById('buyCancelBtn').addEventListener('click', () => renderItemDetailView(cardEl, view));
      if (view.multiBuy) {
        document.getElementById('qtyMinus').addEventListener('click',()=>{if(qty>1){qty--;render();}});
        document.getElementById('qtyPlus').addEventListener('click',()=>{if((qty+1)*view.cost<=account.gold){qty++;render();}});
      }
      document.getElementById('buyYesBtn').addEventListener('click', async()=>{
        const button=document.getElementById('buyYesBtn'); button.disabled=true; button.textContent='Purchasing…';
        try {
          const result=await request('ttd:v6-shop-buy-request','ttd:v6-shop-buy-result',{itemId:view._onlineItemId,quantity:qty});
          applyResultSnapshot(result); hideItemDetail(); if(typeof renderShopScreen==='function')renderShopScreen(); if(typeof renderHome==='function')renderHome(); toastGlobal('Purchased '+qty+'× '+view.name);
        } catch(err){ showError('Online Shop',err); render(); }
      });
    }
    render();
  };

  function inferSell(view) {
    const n = String(view?.name || '');
    if (/Chest Key \[Normal\]/i.test(n)) return {kind:'key',itemId:'key_normal'};
    if (/Chest Key \[Hard\]/i.test(n)) return {kind:'key',itemId:'key_hard'};
    if (/Chest Key \[Hell\]/i.test(n)) return {kind:'key',itemId:'key_hell'};
    if (/Lesser Enchant Card/i.test(n)) return {kind:'card',itemId:'card_lesser'};
    if (/Master Enchant Card/i.test(n)) return {kind:'card',itemId:'card_master'};
    const jewel = (account.inventory?.enchant || []).find((item) => item?.kind==='jewel' && jewelDisplayName(item.jewelId,item.tier)===n);
    if (jewel) return {kind:'jewel',itemId:jewel.id};
    return null;
  }
  showSellConfirm = function onlineSellConfirm(cardEl, view) {
    const sell = view._onlineSell || inferSell(view);
    if (!sell) { showError('Online Inventory',new Error('That item cannot be sold online.')); return; }
    cardEl.innerHTML = `<h2 style="margin-top:6px;">Confirm Sale</h2><p style="color:var(--mist);font-size:13px;margin:12px 0 18px;">Sell this item for ${view.sellValue} Pips?</p><button class="closeBtn" id="sellYesBtn">Yes</button><button class="closeBtn" id="sellCancelBtn" style="margin-top:8px;background:var(--ink-700);">Cancel</button>`;
    document.getElementById('sellCancelBtn').addEventListener('click',()=>renderItemDetailView(cardEl,view));
    document.getElementById('sellYesBtn').addEventListener('click',async()=>{
      const button=document.getElementById('sellYesBtn');button.disabled=true;button.textContent='Selling…';
      try{const result=await request('ttd:v6-shop-sell-request','ttd:v6-shop-sell-result',sell);applyResultSnapshot(result);hideItemDetail();renderInventoryScreen();renderHome();toastGlobal('Sold for '+result.valuePips+' Pips');}
      catch(err){showError('Online Inventory',err);renderItemDetailView(cardEl,view);}
    });
  };

  const originalShowItemDetail = showItemDetail;
  showItemDetail = function onlineItemDetail(view) {
    if (view?.sellable) view._onlineSell = inferSell(view);
    if (view?.extraBtn && /Frozen Island Chest/i.test(String(view.name || ''))) {
      const diff = /\[Hell\]/i.test(view.name)?'hell':/\[Hard\]/i.test(view.name)?'hard':'normal';
      const chest=(account.inventory?.rewards||[]).find((item)=>item?.type==='chest'&&item.difficultyKey===diff);
      if (chest) {
        view.extraBtn.onClick = async()=>{
          const button=document.getElementById('itemExtraBtn');if(button){button.disabled=true;button.textContent='Opening…';}
          try{
            const result=await request('ttd:v6-chest-open-request','ttd:v6-chest-open-result',{chestId:chest.id});
            applyResultSnapshot(result); hideItemDetail(); renderInventoryScreen(); renderHome();
            const loot=result.loot||{}; const bits=[`${loot.pips||0} Pips`];
            if(loot.jewels?.length) bits.push(...loot.jewels.map((j)=>jewelDisplayName(j.jewelId,j.tier)));
            if(loot.dice?.length) bits.push(...loot.dice.map((d)=>`${DICE[d.key]?.name||d.key} (Class ${d.instance.cls})`));
            showNotice('Chest Opened',bits.join('<br>'));
          }catch(err){showError('Treasure Chest',err);}
        };
      }
    }
    return originalShowItemDetail(view);
  };

  /* -------------------- Exact jewel socketing / enchanting -------------------- */
  openJewelPicker = function onlineJewelPicker(slotIdx) {
    const inst=findInstance(enchantTarget?.key,enchantTarget?.instId); if(!inst)return;
    const cardEl=document.getElementById('jewelPickerCard'); const current=inst.enchants[slotIdx];
    if(current){
      cardEl.innerHTML=`<button class="xCloseBtn" id="jewelPickerXBtn">×</button><div class="glyphBig" style="background:linear-gradient(155deg,rgba(255,255,255,.12),rgba(0,0,0,.2));margin:0 auto 10px;">${gemSVG(current.jewelId)}</div><h2>${jewelDisplayName(current.jewelId,current.tier)}</h2><p style="color:var(--mist);font-size:12px;margin:10px 0 14px;">Socketed in slot ${slotIdx+1}.</p><button class="closeBtn" id="unsocketBtn" style="background:linear-gradient(180deg,#e8a0a0,#c65b4a);">Unsocket</button><button class="closeBtn" id="jewelPickerCloseBtn" style="margin-top:8px;">Cancel</button>`;
      document.getElementById('unsocketBtn').addEventListener('click',async()=>{try{const r=await request('ttd:v6-unsocket-request','ttd:v6-unsocket-result',{dieId:inst.id,slot:slotIdx});applyResultSnapshot(r);hideJewelPicker();renderEnchantScreen();toastGlobal('Unsocketed '+jewelDisplayName(current.jewelId,current.tier));}catch(err){showError('Unsocket Jewel',err);}});
    }else{
      const jewels=(account.inventory?.enchant||[]).filter((i)=>i.kind==='jewel');
      const options=jewels.length?jewels.map((j)=>`<button class="enchantCardOption" data-jewelinstid="${j.id}">${jewelDisplayName(j.jewelId,j.tier)}</button>`).join(''):`<p style="color:var(--mist);font-size:12px;margin:10px 0;">You don't own any unsocketed jewels yet — jewels drop from treasure chests.</p>`;
      cardEl.innerHTML=`<button class="xCloseBtn" id="jewelPickerXBtn">×</button><h2 style="margin-top:6px;">Socket a Jewel</h2><p style="color:var(--mist);font-size:12px;margin:10px 0 14px;">Slot ${slotIdx+1} is empty. Choose a jewel to socket.</p><div class="enchantCardOptions">${options}</div><button class="closeBtn" id="jewelPickerCloseBtn" style="margin-top:14px;">Cancel</button>`;
      cardEl.querySelectorAll('[data-jewelinstid]').forEach((button)=>button.addEventListener('click',async()=>{try{const jewel=(account.inventory.enchant||[]).find((j)=>j.id===button.dataset.jewelinstid);const r=await request('ttd:v6-socket-request','ttd:v6-socket-result',{dieId:inst.id,jewelId:button.dataset.jewelinstid,slot:slotIdx});applyResultSnapshot(r);hideJewelPicker();renderEnchantScreen();if(jewel)toastGlobal('Socketed '+jewelDisplayName(jewel.jewelId,jewel.tier));}catch(err){showError('Socket Jewel',err);}}));
    }
    document.getElementById('jewelPickerXBtn').addEventListener('click',hideJewelPicker);document.getElementById('jewelPickerCloseBtn').addEventListener('click',hideJewelPicker);document.getElementById('jewelPickerOverlay').classList.add('show');
  };

  openEnchantAttempt = function onlineEnchantAttempt(jewelItem) {
    const cardEl=document.getElementById('enchantAttemptCard');
    if(jewelItem.tier>=MAX_JEWEL_TIER){cardEl.innerHTML=`<button class="xCloseBtn" id="enchantAttemptXBtn">×</button><div class="glyphBig" style="background:linear-gradient(155deg,rgba(255,255,255,.12),rgba(0,0,0,.2));margin:0 auto 10px;">${gemSVG(jewelItem.jewelId)}</div><h2>${jewelDisplayName(jewelItem.jewelId,jewelItem.tier)}</h2><p style="color:var(--mist);font-size:12px;margin:10px 0;">This jewel is already at its maximum tier.</p><button class="closeBtn" id="enchantAttemptCloseBtn">Close</button>`;}else{
      const cards=(account.inventory?.enchant||[]).filter((i)=>i.kind==='card'&&i.count>0);
      const options=cards.length?cards.map((c)=>`<button class="enchantCardOption" data-cardid="${c.cardId}">${ENCHANT_CARDS[c.cardId].name} <span class="ecoCount">×${c.count}</span></button>`).join(''):`<p style="color:var(--mist);font-size:12px;margin:10px 0;">You don't own any Enchant Cards. Buy them from the Shop.</p>`;
      cardEl.innerHTML=`<button class="xCloseBtn" id="enchantAttemptXBtn">×</button><div class="glyphBig" style="background:linear-gradient(155deg,rgba(255,255,255,.12),rgba(0,0,0,.2));margin:0 auto 10px;">${gemSVG(jewelItem.jewelId)}</div><h2>${jewelDisplayName(jewelItem.jewelId,jewelItem.tier)}</h2><p style="color:var(--mist);font-size:12px;margin:10px 0 14px;">Choose a card to attempt improving this jewel. The server resolves the roll; failure never reduces its current tier.</p><div class="enchantCardOptions">${options}</div><button class="closeBtn" id="enchantAttemptCloseBtn" style="margin-top:14px;">Cancel</button>`;
      cardEl.querySelectorAll('[data-cardid]').forEach((button)=>button.addEventListener('click',async()=>{button.disabled=true;try{const r=await request('ttd:v6-enchant-request','ttd:v6-enchant-result',{jewelId:jewelItem.id,cardId:button.dataset.cardid});applyResultSnapshot(r);hideEnchantAttempt();renderInventoryScreen();const result=r.result;await playEnchantAnimation(result.jewelId,result);if(result.success)showNotice('Enchant Success',`${jewelDisplayName(result.jewelId,result.oldTier)} improved to <strong>${jewelDisplayName(result.jewelId,result.newTier)}</strong>.`);else showNotice('Enchant Failed',`${jewelDisplayName(result.jewelId,result.oldTier)} remains unchanged.`);}catch(err){showError('Enchant Jewel',err);button.disabled=false;}}));
    }
    document.getElementById('enchantAttemptXBtn').addEventListener('click',hideEnchantAttempt);document.getElementById('enchantAttemptCloseBtn').addEventListener('click',hideEnchantAttempt);document.getElementById('enchantAttemptOverlay').classList.add('show');
  };

  document.addEventListener('click',(event)=>{if(event.target?.closest?.('#toggleDamageNumbers'))setTimeout(()=>send('ttd:v6-setting-request',{requestId:rid('setting'),showDamageNumbers:account.settings?.showDamageNumbers!==false}),0);},false);

  /* -------------------- Server run tickets + borrowed Shared Die -------------------- */
  const originalStartGame=startGame;
  const originalStartAdventure=startAdventure;
  const originalStartAdventureCampaign=startAdventureCampaign;
  const originalStartEndlessHorde=startEndlessHorde;
  const originalEndMatch=endMatch;
  const originalCampaignComplete=campaignComplete;
  const originalEndEndlessHorde=endEndlessHorde;

  function installBorrowedSupport(support) {
    if(!support?.instance?.id||!DICE[support.key])return null;
    const deck=account.decks[account.activeDeckIdx]; if(!Array.isArray(deck)||deck.length<5)return null;
    const tempId=`shared_${support.lenderUid}_${support.instance.id}`;
    const originalDeck=deck.map((slot)=>slot?{...slot}:null);
    if(!account.owned[support.key])account.owned[support.key]=[];
    account.owned[support.key]=account.owned[support.key].filter((i)=>i.id!==tempId);
    account.owned[support.key].push({id:tempId,cls:support.instance.cls,enchants:normalizeSlots(support.instance.enchants),borrowedSupport:true,lenderName:support.lenderName});
    let slotIndex=deck.findIndex((slot)=>slot?.key===support.key); if(slotIndex<0)slotIndex=4;
    deck[slotIndex]={key:support.key,instId:tempId};
    borrowedSupport={key:support.key,tempId,originalDeck,lenderName:support.lenderName,slotIndex};
    return borrowedSupport;
  }
  function restorePersistentDeckAfterStart() {
    if(!borrowedSupport)return;
    account.decks[account.activeDeckIdx]=borrowedSupport.originalDeck.map((slot)=>slot?{...slot}:null);
  }
  function cleanupBorrowedSupport() {
    if(!borrowedSupport)return;
    account.owned[borrowedSupport.key]=(account.owned[borrowedSupport.key]||[]).filter((i)=>i.id!==borrowedSupport.tempId);
    borrowedSupport=null;
  }
  function beginRun(modeKey, extra, starter) {
    if(runStartPending){toastGlobal('Starting online run…');return;}
    const deck=getActiveDeck(); if(deck.length<5){toastGlobal(deck.length===0?'Build a deck first':'Your deck needs all 5 dice filled');showScreen('deck');return;}
    const requestId=rid('run'); runStartPending={requestId,starter,modeKey};
    send('ttd:v6-run-begin-request',{requestId,modeKey,...extra});
  }
  startGame=function onlineStartGame(modeKey){beginRun(modeKey,{},()=>originalStartGame(modeKey));};
  startAdventure=function onlineStartAdventure(advId,stageIdx,diffKey){beginRun('adventure',{difficultyKey:diffKey,campaign:false},()=>originalStartAdventure(advId,stageIdx,diffKey));};
  startAdventureCampaign=function onlineStartAdventureCampaign(advId,diffKey){beginRun('adventure',{difficultyKey:diffKey,campaign:true},()=>originalStartAdventureCampaign(advId,diffKey));};
  startEndlessHorde=function onlineStartEndless(){beginRun('endlesshorde',{},()=>originalStartEndlessHorde());};

  function runMetrics() {
    return {completedWaves:state?.completedWaves||0,kills:state?.kills||0,coinGold:state?.coinGold||0,wave:state?.wave||0,typhoonDefeated:!!state?.typhoonDefeated,luckBonus:state?.adventure&&typeof getBonusChestChance==='function'?getBonusChestChance():0,playSeconds:state?.zPlayTime||state?.time||0};
  }
  function finishCurrentRun(metrics, overlayKind) {
    if(!currentRun?.runId)return;
    const requestId=rid('finish'); const runId=currentRun.runId; currentRun.finishing=true;
    send('ttd:v6-run-finish-request',{requestId,runId,...metrics,overlayKind});
  }
  endMatch=function onlineEndMatch(reason){
    const before=JSON.parse(JSON.stringify(account)); const metrics=runMetrics(); originalEndMatch(reason); account=before; finishCurrentRun(metrics,'match');
  };
  campaignComplete=function onlineCampaignComplete(){
    const before=JSON.parse(JSON.stringify(account)); const metrics=runMetrics(); originalCampaignComplete(); account=before; finishCurrentRun(metrics,'adventure');
  };
  endEndlessHorde=function onlineEndHorde(){
    const before=JSON.parse(JSON.stringify(account)); const metrics=runMetrics(); originalEndEndlessHorde(); account=before; finishCurrentRun(metrics,'horde');
  };

  /* -------------------- Friend deck inspection -------------------- */
  function jewelBonuses(inst) {
    const out={power:0,hp:0,cdr:0,crit:0,critBoost:0,affinity:{}};
    for(const jewel of (inst?.enchants||[]).filter(Boolean)){
      const def=JEWEL_DEFS[jewel.jewelId];if(!def)continue;const val=jewelTierValue(jewel.jewelId,jewel.tier);
      if(def.unit==='dmgPct')out.power+=val;else if(def.unit==='hpPct')out.hp+=val;else if(def.unit==='cdrPct')out.cdr+=val;else if(def.unit==='critPct')out.crit+=val;else if(def.unit==='critMultAdd')out.critBoost+=val;else if(def.isElemental)out.affinity[def.element]=(out.affinity[def.element]||0)+val;
    }
    return out;
  }
  function ensureFriendDeckOverlay() {
    let overlay=document.getElementById('ttdFriendDeckOverlay'); if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='ttdFriendDeckOverlay';overlay.className='dieDetailOverlay';overlay.innerHTML='<div class="dieDetailCard" id="ttdFriendDeckCard" style="width:min(620px,94vw);max-height:88vh;overflow:auto;"></div>';document.body.appendChild(overlay);overlay.addEventListener('click',(e)=>{if(e.target===overlay)overlay.classList.remove('show');});return overlay;
  }
  function showFriendDieDetail(deck,grant) {
    const overlay=ensureFriendDeckOverlay(),card=document.getElementById('ttdFriendDeckCard'),d=DICE[grant.key],inst=grant.instance,b=jewelBonuses(inst),mult=classMultFromLevel(inst.cls),damage=Math.round((d.dmg||0)*mult*(1+b.power)*100)/100,hp=Math.round((d.hp||0)*mult*(1+b.hp)*100)/100;
    const jewels=(inst.enchants||[]).map((j,i)=>j?`<div class="modeCard" style="padding:8px;margin:6px 0;display:flex;gap:8px;align-items:center;">${gemSVG(j.jewelId)}<div><strong>${jewelDisplayName(j.jewelId,j.tier)}</strong><div style="font-size:10px;color:var(--mist);">${jewelEffectText(j.jewelId,j.tier)}</div></div></div>`:`<div style="font-size:10px;color:var(--mist);padding:4px 0;">Socket ${i+1}: Empty</div>`).join('');
    card.innerHTML=`<button class="xCloseBtn" id="ttdFriendDeckBack">×</button><div class="glyphBig" style="background:linear-gradient(155deg,${d.glow},${d.color});margin:0 auto 10px;">${renderGlyph(d.glyph,'#0a0c14')}</div><h2>${d.name}</h2><p style="text-align:center;color:var(--mist);">${deck.ownerName}'s active deck · Class ${inst.cls} · ${d.rarity}</p><div class="modeCard"><strong>Overall stats</strong><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;font-size:12px;"><span>Damage: ${damage}</span><span>HP: ${hp}</span><span>Attack interval: ${Math.max(.05,(d.atk||0)*(1-b.cdr)).toFixed(2)}s</span><span>Crit chance bonus: ${(b.crit*100).toFixed(0)}%</span><span>Crit multiplier bonus: +${b.critBoost.toFixed(2)}×</span><span>Target: ${d.target||'—'}</span></div></div><h3>Socketed Jewels</h3>${jewels}<button class="closeBtn" id="ttdFriendDeckList">Back to Deck</button>`;
    document.getElementById('ttdFriendDeckBack').addEventListener('click',()=>overlay.classList.remove('show'));document.getElementById('ttdFriendDeckList').addEventListener('click',()=>showFriendDeck(deck));overlay.classList.add('show');
  }
  function showFriendDeck(deck) {
    const overlay=ensureFriendDeckOverlay(),card=document.getElementById('ttdFriendDeckCard');
    const slots=(deck.slots||[]).map((grant,i)=>grant?`<button class="colCard ${grant.rarity}" data-friend-slot="${i}" style="min-height:118px;"><div class="glyphWrap">${renderGlyph(DICE[grant.key].glyph,DICE[grant.key].color)}</div><div class="cname">${DICE[grant.key].name}</div><div class="ccls">Class ${grant.instance.cls} · ◆${(grant.instance.enchants||[]).filter(Boolean).length}</div><span class="clsBadge">C${grant.instance.cls}</span></button>`:`<div class="deckSlot"></div>`).join('');
    card.innerHTML=`<button class="xCloseBtn" id="ttdFriendDeckClose">×</button><h2>${deck.ownerName}'s Deck</h2><p style="color:var(--mist);font-size:11px;">Active Deck ${Number(deck.activeDeckIdx||0)+1} · Tap a die for its exact Class, sockets, jewel effects, and overall stats.</p><div style="display:grid;grid-template-columns:repeat(5,minmax(88px,1fr));gap:8px;overflow-x:auto;padding:8px 0;">${slots}</div>`;
    document.getElementById('ttdFriendDeckClose').addEventListener('click',()=>overlay.classList.remove('show'));card.querySelectorAll('[data-friend-slot]').forEach((button)=>button.addEventListener('click',()=>showFriendDieDetail(deck,deck.slots[Number(button.dataset.friendSlot)])));overlay.classList.add('show');
  }

  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;const m=event.data||{};
    const p=m.requestId&&pending.get(m.requestId);
    if(p){
      if(m.type===p.resultType){pending.delete(m.requestId);p.resolve(m);return;}
      if(m.type===`${p.resultType}-error`){pending.delete(m.requestId);p.reject(new Error(m.message||'The server rejected that action.'));return;}
    }
    if(m.type==='ttd:v6-cloud-snapshot'){
      try{applySnapshot(m.snapshot);v6Ready=true;send('ttd:v6-synced',{version:6});}catch(err){send('ttd:bridge-sync-error',{message:`Full cloud account sync failed: ${err.message}`});}
      return;
    }
    if(m.type==='ttd:v6-deck-state-result'){try{applySnapshot(m.snapshot);send('ttd:v6-refresh-request');}catch(err){showError('Deck Sync',err);}return;}
    if(m.type==='ttd:v6-deck-state-error'){showError('Deck Sync',new Error(m.message||'The server rejected that deck change.'));send('ttd:v6-refresh-request');return;}
    if(m.type==='ttd:v6-run-begin-result'&&runStartPending&&m.requestId===runStartPending.requestId){
      const pendingStart=runStartPending;runStartPending=null;try{if(m.support)installBorrowedSupport(m.support);currentRun={runId:m.runId,support:m.support,finishing:false};pendingStart.starter();restorePersistentDeckAfterStart();if(m.support)toastGlobal(`Using ${m.support.lenderName}'s shared ${DICE[m.support.key]?.name||m.support.key}`);}catch(err){cleanupBorrowedSupport();currentRun=null;showError('Start Run',err);}return;
    }
    if(m.type==='ttd:v6-run-begin-result-error'&&runStartPending&&m.requestId===runStartPending.requestId){runStartPending=null;showError('Start Run',new Error(m.message||'The server could not start that run.'));return;}
    if(m.type==='ttd:v6-run-finish-result'&&currentRun&&m.runId===currentRun.runId){applyResultSnapshot(m);const reward=Number(m.pipsEarned||0);const gold=document.getElementById('overlayGold');if(gold)gold.textContent=`+${reward} Pips`;cleanupBorrowedSupport();currentRun=null;if(m.chestCount>0&&typeof showNotice==='function')setTimeout(()=>showNotice('Adventure Rewards',`${m.chestCount} Frozen Island Chest${m.chestCount===1?'':'s'} added to Inventory.<br><br>+${reward} Pips`),500);return;}
    if(m.type==='ttd:v6-run-finish-result-error'&&currentRun){showError('Run Rewards',new Error(m.message||'The server could not finalize this run.'));cleanupBorrowedSupport();currentRun=null;send('ttd:v6-refresh-request');return;}
    if(m.type==='ttd:friend-deck-view'){showFriendDeck(m.deck);return;}
    if(['ttd:gacha-result','ttd:merge-result','ttd:favorite-toggle-result','ttd:deck-state-result'].includes(m.type))setTimeout(()=>send('ttd:v6-refresh-request'),80);
  });

  send('ttd:v6-ready',{version:6});
})();
