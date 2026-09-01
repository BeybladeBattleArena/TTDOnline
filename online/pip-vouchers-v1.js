(() => {
  'use strict';
  if(window.__TTD_PIP_VOUCHERS_V2)return;
  window.__TTD_PIP_VOUCHERS_V2=true;
  window.__TTD_PIP_VOUCHERS_V1=true;

  const ORIGIN=location.origin;
  const VOUCHER_ROWS=[1000,5000,10000,20000,40000,60000,80000,100000];
  const VOUCHERS=Object.freeze(Object.fromEntries(VOUCHER_ROWS.map(amount=>[
    `pip_voucher_${amount}`,
    Object.freeze({
      amount,
      name:`${amount.toLocaleString('en-US')} Pip Voucher`,
      desc:`Looks like you're ${amount.toLocaleString('en-US')} Pips richer! Woohoo! (Sell this item to obtain the currency)`,
    }),
  ])));
  const state=new Map();
  let sellPending=false,requestSeq=0,observer=null,renderQueued=false;

  function asset(path){
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  }
  const itemAssets=window.__TTD_ITEM_ASSETS_V4||window.__TTD_ITEM_ASSETS_V1||{};
  const ITEM_ROOT=['','assets','items'].join('/');
  const artUrl=(amount)=>itemAssets[`pip_voucher_${amount}`]||asset(`${ITEM_ROOT}/pip-voucher-${amount}.png`);
  const send=(type,payload={})=>window.parent.postMessage({type,...payload},ORIGIN);

  function rewardsActive(){
    try{if(typeof invActiveTab!=='undefined')return String(invActiveTab)==='rewards';}catch(_){}
    const current=document.querySelector('#tiRoot .tiIT [data-i="rewards"].on');
    return !!current;
  }
  function activeGrid(){
    if(!rewardsActive())return null;
    return document.querySelector('#tiRoot .tiItems .tiGrid')||document.getElementById('invGrid');
  }
  function imageMarkup(def,detail=false){
    const width=detail?238:132,height=detail?104:72;
    return `<img class="ttdPipVoucherArtV2" src="${artUrl(def.amount)}" alt="${def.name}" draggable="false" decoding="async" style="width:${width}px;height:${height}px;max-width:100%;object-fit:contain;display:block;margin:0 auto;">`;
  }
  function requestSell(itemId){
    const item=state.get(itemId),def=VOUCHERS[itemId];
    if(!item||!def||item.count<1||sellPending)return;
    sellPending=true;
    const requestId=`pip-voucher-sell-${Date.now().toString(36)}-${++requestSeq}`;
    send('ttd:item-sell-request',{requestId,itemId});
    try{toastGlobal(`Selling ${def.name}…`);}catch(_){}
  }
  function openVoucher(itemId){
    const item=state.get(itemId),def=VOUCHERS[itemId];
    if(!item||!def||item.count<1||typeof showItemDetail!=='function')return;
    const sellValue=item.sellValuePips||def.amount;
    showItemDetail({
      name:`${def.name}${item.count>1?` ×${item.count}`:''}`,
      desc:def.desc,
      icon:imageMarkup(def,true),
      sellable:item.sellable!==false&&sellValue>0,
      sellValue,
      onSell:()=>requestSell(itemId),
    });
  }
  function createCanonicalCard(itemId,item,def){
    const card=document.createElement('div');
    card.className='tiItem ttdPipVoucherCardV2';
    card.dataset.ttdPipVoucher=itemId;
    card.innerHTML=`<div class="tiIcon">${imageMarkup(def)}</div><div class="tiName"></div><div class="tiRare">Reward</div><button class="tiAct" type="button">Details</button><span class="tiCount">×${item.count}</span>`;
    card.querySelector('.tiName').textContent=def.name;
    const open=(event)=>{event?.preventDefault?.();event?.stopPropagation?.();openVoucher(itemId);};
    card.addEventListener('click',open);
    card.querySelector('.tiAct')?.addEventListener('click',open);
    return card;
  }
  function createLegacyCard(itemId,item,def){
    const card=document.createElement('div');
    card.className='chestCard ttdPipVoucherCardV2';
    card.dataset.ttdPipVoucher=itemId;
    card.innerHTML=`${imageMarkup(def)}<div class="cname">${def.name}</div><div class="cdiff">×${item.count}</div>`;
    card.addEventListener('click',()=>openVoucher(itemId));
    return card;
  }
  function renderVouchers(){
    renderQueued=false;
    const grid=activeGrid();
    if(!grid)return;
    const canonical=grid.classList.contains('tiGrid');
    const live=new Set([...state].filter(([,item])=>item.count>0).map(([itemId])=>itemId));
    grid.querySelectorAll('[data-ttd-pip-voucher]').forEach(card=>{
      if(!live.has(card.dataset.ttdPipVoucher))card.remove();
    });
    for(const [itemId,item] of state){
      if(item.count<1)continue;
      const def=VOUCHERS[itemId];
      let card=grid.querySelector(`[data-ttd-pip-voucher="${itemId}"]`);
      if(!card){
        card=canonical?createCanonicalCard(itemId,item,def):createLegacyCard(itemId,item,def);
        grid.appendChild(card);
      }
      const countNode=card.querySelector(canonical?'.tiCount':'.cdiff');
      const next=`×${item.count}`;
      if(countNode&&countNode.textContent!==next)countNode.textContent=next;
    }
  }
  function queueRender(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(renderVouchers);
  }
  function applySync(items){
    state.clear();
    for(const item of Array.isArray(items)?items:[]){
      if(!VOUCHERS[item?.id])continue;
      state.set(item.id,{
        ...item,
        count:Math.max(0,Math.floor(Number(item.count)||0)),
        sellValuePips:Math.max(0,Math.floor(Number(item.sellValuePips)||0)),
      });
    }
    queueRender();
  }
  function installObserver(){
    const inventory=document.getElementById('inventoryScreen');
    if(!inventory||observer)return false;
    observer=new MutationObserver(queueRender);
    observer.observe(inventory,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    queueRender();
    return true;
  }

  const style=document.createElement('style');
  style.id='ttdPipVoucherStyleV2';
  style.textContent=`
    .ttdPipVoucherCardV2{overflow:hidden!important;cursor:pointer!important;}
    .ttdPipVoucherCardV2 .ttdPipVoucherArtV2{max-width:100%!important;object-fit:contain!important;object-position:center center!important;margin:0 auto!important;image-rendering:auto!important;}
    #tiRoot .tiItems .ttdPipVoucherCardV2>.tiIcon{width:82px!important;height:82px!important;margin:0 auto!important;display:grid!important;place-items:center!important;}
    #tiRoot .tiItems .ttdPipVoucherCardV2>.tiIcon>.ttdPipVoucherArtV2{width:78px!important;height:58px!important;}
    #tiRoot .tiItems .ttdPipVoucherCardV2>.tiName{font-size:9.5px!important;line-height:1.2!important;text-align:center!important;}
    #invGrid>.ttdPipVoucherCardV2>.ttdPipVoucherArtV2{width:132px!important;height:72px!important;}
    #invGrid>.ttdPipVoucherCardV2>.cname{font-size:10.5px!important;line-height:1.22!important;text-align:center!important;}
  `;
  document.head.appendChild(style);

  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const message=event.data||{};
    if(message.type==='ttd:item-inventory-sync'){applySync(message.items);return;}
    if(message.type==='ttd:item-sell-result'&&VOUCHERS[message.itemId]){
      sellPending=false;
      const def=VOUCHERS[message.itemId];
      try{
        if(message.ok)toastGlobal(`Sold ${def.name} for ${Number(message.sellValuePips||def.amount).toLocaleString('en-US')} Pips.`);
        else toastGlobal(message.message||`Could not sell ${def.name}.`);
      }catch(_){}
      queueRender();
    }
  });

  for(const amount of VOUCHER_ROWS){try{const img=new Image();img.decoding='async';img.src=artUrl(amount);}catch(_){} }
  let attempts=0;
  const installTimer=setInterval(()=>{
    attempts+=1;
    if(installObserver()||attempts>=80)clearInterval(installTimer);
  },50);
  setInterval(()=>{
    if(document.getElementById('inventoryScreen')?.classList.contains('active'))queueRender();
  },400);
  send('ttd:item-inventory-ready');
})();
