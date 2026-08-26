import fs from 'node:fs';

function replaceExactly(source,from,to,label){
  const count=source.split(from).length-1;
  if(count!==1)throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(from,to);
}
function replaceSection(source,startMarker,endMarker,replacement,label){
  const start=source.indexOf(startMarker),end=source.indexOf(endMarker,start);
  if(start<0||end<0||end<=start)throw new Error(`${label}: section markers missing`);
  return source.slice(0,start)+replacement+source.slice(end);
}

{
  const file='random-dice-game-33.html';
  let source=fs.readFileSync(file,'utf8');

  source=replaceExactly(
    source,
    "  function keySellValue(diffKey){ return {normal:100,hard:200,hell:300}[diffKey]||0; }\n  function cardSellValue(cardId){ return {lesser:75,master:250}[cardId]||0; }",
    "  function shopSellValuePips(cost,currency='pips'){const amount=Math.max(0,Math.floor(Number(cost)||0));return currency==='astras'?amount*30:Math.floor(amount/3);}\n  function chestSellValue(diffKey){return {normal:250,hard:500,hell:750}[diffKey]||0;}\n  function keySellValue(diffKey,item=null){if(Number.isFinite(Number(item?.shopPurchase?.sellValuePips)))return Math.max(0,Math.floor(Number(item.shopPurchase.sellValuePips)));return shopSellValuePips(({normal:200,hard:400,hell:600}[diffKey]||0),'pips');}\n  function cardSellValue(cardId,item=null){if(Number.isFinite(Number(item?.shopPurchase?.sellValuePips)))return Math.max(0,Math.floor(Number(item.shopPurchase.sellValuePips)));return shopSellValuePips(ENCHANT_CARDS[cardId]?.cost||0,'pips');}",
    'resale helpers',
  );

  source=replaceExactly(
    source,
    "        icon: chestSVG(item.difficultyKey),\n        sellable: false, sellValue: 0,\n        extraBtn: {",
    "        icon: chestSVG(item.difficultyKey),\n        sellable: true, sellValue: chestSellValue(item.difficultyKey),\n        onSell: ()=>{\n          const sv=chestSellValue(item.difficultyKey);\n          account.inventory.rewards=account.inventory.rewards.filter(i=>i!==item);\n          account.gold+=sv;saveAccount();renderInventoryScreen();renderHome();\n          toastGlobal('Sold for '+sv+' Pips');\n        },\n        extraBtn: {",
    'adventure chest resale',
  );

  source=replaceExactly(source,"const sv = keySellValue(item.difficultyKey);","const sv = keySellValue(item.difficultyKey,item);",'key purchase-aware resale');
  source=replaceExactly(source,"const sv = cardSellValue(item.cardId);","const sv = cardSellValue(item.cardId,item);",'card purchase-aware resale');

  const buyStart='  function showBuyConfirm(cardEl, view){';
  const buyEnd='  function shopSellValuePips';
  const buyReplacement=`  function showBuyConfirm(cardEl, view){
    let qty=1;
    const currency=view.currency==='astras'?'astras':'pips';
    const currencyLabel=currency==='astras'?'Astras':'Pips';
    const balance=()=>currency==='astras'?Math.max(0,Math.floor(Number(account.astras)||0)):Math.max(0,Math.floor(Number(account.gold)||0));
    function render(){
      const total=view.cost*qty;
      cardEl.innerHTML=\`
        <h2 style="margin-top:6px;">Confirm Purchase</h2>
        \${view.multiBuy?\`
          <div class="qtyRow">
            <button class="qtyBtn" id="qtyMinus" \${qty<=1?'disabled':''}>−</button>
            <span class="qtyVal">\${qty}</span>
            <button class="qtyBtn" id="qtyPlus" \${(qty+1)*view.cost>balance()?'disabled':''}>+</button>
          </div>\`:''}
        <p style="color:var(--mist); font-size:13px; margin:12px 0 18px;">Buy this item for \${total} \${currencyLabel}?</p>
        <button class="closeBtn" id="buyYesBtn">Yes</button>
        <button class="closeBtn" id="buyCancelBtn" style="margin-top:8px; background:var(--ink-700);">Cancel</button>
      \`;
      document.getElementById('buyYesBtn').addEventListener('click',()=>{
        if(balance()<total){toastGlobal('Not enough '+currencyLabel);return;}
        if(currency==='astras')account.astras=Math.max(0,Math.floor(Number(account.astras)||0)-total);else account.gold=Math.max(0,Math.floor(Number(account.gold)||0)-total);
        for(let i=0;i<qty;i++)view.onBuy();
        saveAccount();renderShopGold();hideItemDetail();toastGlobal('Purchased '+qty+'× '+view.name);if(typeof shopActiveTab!=='undefined')renderShopGrid();
      });
      document.getElementById('buyCancelBtn').addEventListener('click',()=>renderItemDetailView(cardEl,view));
      if(view.multiBuy){
        document.getElementById('qtyMinus').addEventListener('click',()=>{if(qty>1){qty--;render();}});
        document.getElementById('qtyPlus').addEventListener('click',()=>{if((qty+1)*view.cost<=balance()){qty++;render();}});
      }
    }
    render();
  }
`;
  source=replaceSection(source,buyStart,buyEnd,buyReplacement,'currency-aware purchase flow');

  source=replaceExactly(
    source,
    "  function grantRewardKey(diffKey){\n    const label = ADV_DIFFICULTIES[diffKey] ? ADV_DIFFICULTIES[diffKey].label : diffKey;\n    const existing = account.inventory.rewards.find(r=>r.type==='key' && r.difficultyKey===diffKey);\n    if(existing){ existing.count = (existing.count||1)+1; existing.ts = Date.now(); }\n    else { account.inventory.rewards.push({id:genId(), type:'key', difficultyKey:diffKey, difficultyLabel:label, name:'Chest Key ['+label+']',\n      desc:'Unlocks one Frozen Island Chest earned on '+label+' difficulty. Consumed when used.', count:1, ts:Date.now()}); }",
    "  function grantRewardKey(diffKey,purchase=null){\n    const label = ADV_DIFFICULTIES[diffKey] ? ADV_DIFFICULTIES[diffKey].label : diffKey;\n    const existing = account.inventory.rewards.find(r=>r.type==='key' && r.difficultyKey===diffKey);\n    if(existing){ existing.count = (existing.count||1)+1; existing.ts = Date.now(); if(purchase)existing.shopPurchase=purchase; }\n    else { account.inventory.rewards.push({id:genId(), type:'key', difficultyKey:diffKey, difficultyLabel:label, name:'Chest Key ['+label+']',\n      desc:'Unlocks one Frozen Island Chest earned on '+label+' difficulty. Consumed when used.', count:1, shopPurchase:purchase||null, ts:Date.now()}); }",
    'key purchase provenance',
  );
  source=replaceExactly(
    source,
    "  function grantEnchantCard(cardId){\n    const existing = account.inventory.enchant.find(i=>i.kind==='card' && i.cardId===cardId);\n    if(existing){ existing.count = (existing.count||1)+1; existing.ts = Date.now(); }\n    else { account.inventory.enchant.push({id:genId(), kind:'card', cardId, count:1, ts:Date.now()}); }",
    "  function grantEnchantCard(cardId,purchase=null){\n    const existing = account.inventory.enchant.find(i=>i.kind==='card' && i.cardId===cardId);\n    if(existing){ existing.count = (existing.count||1)+1; existing.ts = Date.now(); if(purchase)existing.shopPurchase=purchase; }\n    else { account.inventory.enchant.push({id:genId(), kind:'card', cardId, count:1, shopPurchase:purchase||null, ts:Date.now()}); }",
    'enchant purchase provenance',
  );

  source=source.replaceAll("cost:200, sellValue:100, multiBuy:true","cost:200, currency:'pips', sellValue:shopSellValuePips(200,'pips'), multiBuy:true");
  source=source.replaceAll("cost:400, sellValue:200, multiBuy:true","cost:400, currency:'pips', sellValue:shopSellValuePips(400,'pips'), multiBuy:true");
  source=source.replaceAll("cost:600, sellValue:300, multiBuy:true","cost:600, currency:'pips', sellValue:shopSellValuePips(600,'pips'), multiBuy:true");
  source=source.replaceAll("cost:ENCHANT_CARDS.lesser.cost, sellValue:75, multiBuy:true","cost:ENCHANT_CARDS.lesser.cost, currency:'pips', sellValue:shopSellValuePips(ENCHANT_CARDS.lesser.cost,'pips'), multiBuy:true");
  source=source.replaceAll("cost:ENCHANT_CARDS.master.cost, sellValue:250, multiBuy:true","cost:ENCHANT_CARDS.master.cost, currency:'pips', sellValue:shopSellValuePips(ENCHANT_CARDS.master.cost,'pips'), multiBuy:true");
  source=replaceExactly(
    source,
    "  function shopItemView(item, purchased){\n    return {\n      name: item.name, desc: item.desc || '', icon: item.icon(),\n      buyable: true, purchased, cost: item.cost, multiBuy: !!item.multiBuy,\n      onBuy: ()=>{ if(item.grant) item.grant(); },\n    };\n  }",
    "  function shopItemView(item, purchased){\n    const currency=item.currency==='astras'?'astras':'pips',sellValuePips=shopSellValuePips(item.cost,currency);\n    return {\n      name:item.name,desc:item.desc||'',icon:item.icon(),\n      buyable:true,purchased,cost:item.cost,currency,multiBuy:!!item.multiBuy,\n      onBuy:()=>{if(item.grant)item.grant({purchaseCurrency:currency,purchaseCost:item.cost,sellValuePips});},\n    };\n  }",
    'shop purchase provenance routing',
  );

  source=replaceExactly(
    source,
    "  function applyVerifiedRunResultV35(result){\n    if(!result||typeof result!=='object')return;const zombie=String(result.modeFamily||'')==='zombie';renderNativeTallies({pips:result.pipsEarned,xp:result.xpAwarded,meta:state?.__ttdEndRewardMeta||captureNativeRewardMeta(),zombie,level:result.level,levelsGained:result.levelsGained});",
    "  function applyVerifiedRunResultV35(result){\n    if(!result||typeof result!=='object')return;if(state)state.__ttdVerifiedRunResultV35=result;const zombie=String(result.modeFamily||'')==='zombie';renderNativeTallies({pips:result.pipsEarned,xp:result.xpAwarded,meta:state?.__ttdEndRewardMeta||captureNativeRewardMeta(),zombie,level:result.level,levelsGained:result.levelsGained});",
    'cache verified run result',
  );
  source=replaceExactly(
    source,
    "    renderNativeTallies({pips:pipsEarned,xp:null,meta:state.__ttdEndRewardMeta,zombie:true});",
    "    const verified=state?.__ttdVerifiedRunResultV35;renderNativeTallies({pips:verified?.pipsEarned??pipsEarned,xp:verified?.xpAwarded??null,meta:state.__ttdEndRewardMeta,zombie:true,level:verified?.level,levelsGained:verified?.levelsGained});",
    'zombie verified EXP render',
  );

  fs.writeFileSync(file,source);
}

{
  const file='online/world-items-v1.js';
  let source=fs.readFileSync(file,'utf8');
  source=replaceExactly(source,"let requestSeq=0,purchasePending=false,usePending=false,physicsInstalled=false;","let requestSeq=0,purchasePending=false,sellPending=false,usePending=false,physicsInstalled=false;",'server sell pending state');
  source=replaceExactly(
    source,
    "item.count=Math.max(0,Math.floor(Number(server.count)||0));item.name=def.name;item.desc=def.desc;item.ts=Date.now();",
    "item.count=Math.max(0,Math.floor(Number(server.count)||0));item.name=def.name;item.desc=def.desc;item.sellable=server.sellable===true;item.sellValuePips=Math.max(0,Math.floor(Number(server.sellValuePips)||0));item.shopPurchased=server.shopPurchased===true;item.ts=Date.now();",
    'server sell metadata sync',
  );
  source=replaceExactly(
    source,
    "    else if(item.itemId==='mystery_chest')extraBtn={label:'Requires Mystery Key',disabled:true,onClick:()=>{}};\n    showItemDetail({name:`${def.name}${item.count>1?` ×${item.count}`:''}`,desc:def.desc,icon:iconMarkup(item.itemId,88),sellable:false,sellValue:0,extraBtn});",
    "    else if(item.itemId==='mystery_chest')extraBtn={label:'Requires Mystery Key',disabled:true,onClick:()=>{}};\n    const canSell=item.sellable===true&&item.sellValuePips>0;\n    showItemDetail({name:`${def.name}${item.count>1?` ×${item.count}`:''}`,desc:def.desc,icon:iconMarkup(item.itemId,88),sellable:canSell,sellValue:canSell?item.sellValuePips:0,onSell:canSell?()=>requestServerItemSell(item):undefined,extraBtn});",
    'inventory-only server sellability',
  );
  source=replaceExactly(
    source,
    "  function requestMysteryPurchase(){if(purchasePending)return;purchasePending=true;const requestId=`item-buy-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-purchase-request',{requestId,itemId:'mystery_chest'});toastGlobal('Purchasing Mystery Chest…');}",
    "  function requestMysteryPurchase(){if(purchasePending)return;purchasePending=true;const requestId=`item-buy-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-purchase-request',{requestId,itemId:'mystery_chest'});toastGlobal('Purchasing Mystery Chest…');}\n  function requestServerItemSell(item){if(sellPending||!item?.itemId)return;sellPending=true;const requestId=`item-sell-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-sell-request',{requestId,itemId:item.itemId});toastGlobal(`Selling ${item.name||'item'}…`);}",
    'server sell request',
  );
  source=replaceExactly(
    source,
    "const open=(event)=>{event?.preventDefault?.();event?.stopPropagation?.();showItemDetail({name:def.name,desc:'Sold in Materials; purchases are delivered to the Rewards section of Inventory. '+def.desc,icon:iconMarkup('mystery_chest',92),sellable:false,sellValue:0,extraBtn:{label:'Buy · 3,300 Pips',disabled:purchasePending,onClick:requestMysteryPurchase}});};",
    "const open=(event)=>{event?.preventDefault?.();event?.stopPropagation?.();showItemDetail({name:def.name,desc:'Sold in Materials; purchases are delivered to the Rewards section of Inventory. '+def.desc,icon:iconMarkup('mystery_chest',92),extraBtn:{label:'Buy · 3,300 Pips',disabled:purchasePending,onClick:requestMysteryPurchase}});};",
    'shop hides sell status',
  );
  source=replaceExactly(
    source,
    "    if(m.type==='ttd:item-use-result'&&m.itemId==='exp_tome'){",
    "    if(m.type==='ttd:item-sell-result'){\n      sellPending=false;if(!m.ok){showNotice('Item Sale',m.message||'The item could not be sold.');return;}\n      if(Number.isSafeInteger(m.gameState?.economy?.pips))account.gold=m.gameState.economy.pips;\n      if(typeof hideItemDetail==='function')hideItemDetail();renderHome();renderInventoryScreen();showNotice('Item Sold',`Sold for ${Math.max(0,Math.floor(Number(m.sellValuePips)||0)).toLocaleString()} Pips.`);send('ttd:item-inventory-ready');return;\n    }\n    if(m.type==='ttd:item-use-result'&&m.itemId==='exp_tome'){
",
    'server sell result',
  );
  fs.writeFileSync(file,source);
}

console.log('Materialized canonical Zombie EXP timing and Shop/Inventory resale rules.');
