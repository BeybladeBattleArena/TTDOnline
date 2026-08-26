import fs from 'node:fs';

const file='online/world-items-v1.js';
let s=fs.readFileSync(file,'utf8');
function one(from,to,label){const n=s.split(from).length-1;if(n!==1)throw new Error(`${label}: expected one match, found ${n}`);s=s.replace(from,to);}

one("let requestSeq=0,purchasePending=false,usePending=false,physicsInstalled=false;","let requestSeq=0,purchasePending=false,sellPending=false,usePending=false,physicsInstalled=false;",'sell pending');
one("item.count=Math.max(0,Math.floor(Number(server.count)||0));item.name=def.name;item.desc=def.desc;item.ts=Date.now();","item.count=Math.max(0,Math.floor(Number(server.count)||0));item.name=def.name;item.desc=def.desc;item.sellable=server.sellable===true;item.sellValuePips=Math.max(0,Math.floor(Number(server.sellValuePips)||0));item.shopPurchased=server.shopPurchased===true;item.ts=Date.now();",'server resale metadata');
one(
  "    else if(item.itemId==='mystery_chest')extraBtn={label:'Requires Mystery Key',disabled:true,onClick:()=>{}};\n    showItemDetail({name:`${def.name}${item.count>1?` ×${item.count}`:''}`,desc:def.desc,icon:iconMarkup(item.itemId,88),sellable:false,sellValue:0,extraBtn});",
  "    else if(item.itemId==='mystery_chest')extraBtn={label:'Requires Mystery Key',disabled:true,onClick:()=>{}};\n    const canSell=item.sellable===true&&item.sellValuePips>0;\n    showItemDetail({name:`${def.name}${item.count>1?` ×${item.count}`:''}`,desc:def.desc,icon:iconMarkup(item.itemId,88),sellable:canSell,sellValue:canSell?item.sellValuePips:0,onSell:canSell?()=>requestServerItemSell(item):undefined,extraBtn});",
  'inventory server resale');
one(
  "  function requestMysteryPurchase(){if(purchasePending)return;purchasePending=true;const requestId=`item-buy-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-purchase-request',{requestId,itemId:'mystery_chest'});toastGlobal('Purchasing Mystery Chest…');}",
  "  function requestMysteryPurchase(){if(purchasePending)return;purchasePending=true;const requestId=`item-buy-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-purchase-request',{requestId,itemId:'mystery_chest'});toastGlobal('Purchasing Mystery Chest…');}\n  function requestServerItemSell(item){if(sellPending||!item?.itemId)return;sellPending=true;const requestId=`item-sell-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-sell-request',{requestId,itemId:item.itemId});toastGlobal('Selling '+(item.name||'item')+'…');}",
  'server resale request');
one(
  "const open=(event)=>{event?.preventDefault?.();event?.stopPropagation?.();showItemDetail({name:def.name,desc:'Sold in Materials; purchases are delivered to the Rewards section of Inventory. '+def.desc,icon:iconMarkup('mystery_chest',92),sellable:false,sellValue:0,extraBtn:{label:'Buy · 3,300 Pips',disabled:purchasePending,onClick:requestMysteryPurchase}});};",
  "const open=(event)=>{event?.preventDefault?.();event?.stopPropagation?.();showItemDetail({name:def.name,desc:'Sold in Materials; purchases are delivered to the Rewards section of Inventory. '+def.desc,icon:iconMarkup('mystery_chest',92),extraBtn:{label:'Buy · 3,300 Pips',disabled:purchasePending,onClick:requestMysteryPurchase}});};",
  'shop detail sale wording');
const useNeedle="    if(m.type==='ttd:item-use-result'&&m.itemId==='exp_tome'){";
const sellBlock=[
  "    if(m.type==='ttd:item-sell-result'){",
  "      sellPending=false;if(!m.ok){showNotice('Item Sale',m.message||'The item could not be sold.');return;}",
  "      if(Number.isSafeInteger(m.gameState?.economy?.pips))account.gold=m.gameState.economy.pips;",
  "      if(typeof hideItemDetail==='function')hideItemDetail();renderHome();renderInventoryScreen();showNotice('Item Sold','Sold for '+Math.max(0,Math.floor(Number(m.sellValuePips)||0)).toLocaleString()+' Pips.');send('ttd:item-inventory-ready');return;",
  "    }",
  useNeedle,
].join('\n');
one(useNeedle,sellBlock,'server resale result');

fs.writeFileSync(file,s);
console.log('World-item resale patch materialized.');
