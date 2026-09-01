(() => {
  'use strict';
  if(window.__TTD_PIP_VOUCHERS_V1)return;
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
  let installed=false,installAttempts=0,sellPending=false,requestSeq=0;

  function asset(path){
    try{return typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;}
    catch(_){return path;}
  }
  const itemAssets=window.__TTD_ITEM_ASSETS_V4||window.__TTD_ITEM_ASSETS_V1||{};
  const artUrl=(amount)=>itemAssets[`pip_voucher_${amount}`]||asset(`/assets/items/pip-voucher-${amount}.png`);
  const send=(type,payload={})=>window.parent.postMessage({type,...payload},ORIGIN);

  function imageMarkup(def,detail=false){
    const width=detail?238:132,height=detail?104:72;
    return `<img class="ttdPipVoucherArtV1" src="${artUrl(def.amount)}" alt="${def.name}" draggable="false" decoding="async" style="width:${width}px;height:${height}px;max-width:100%;object-fit:contain;display:block;margin:0 auto;">`;
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
    if(installed&&document.getElementById('inventoryScreen')?.classList.contains('active'))renderInventoryScreen();
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
  function appendCards(){
    const grid=document.getElementById('invGrid');
    if(!grid||String(invActiveTab||'')!=='rewards')return;
    grid.querySelectorAll('.ttdPipVoucherCardV1').forEach(node=>node.remove());
    for(const [itemId,item] of state){
      if(item.count<1)continue;
      const def=VOUCHERS[itemId];
      const card=document.createElement('div');
      card.className='chestCard ttdPipVoucherCardV1';
      card.dataset.ttdPipVoucher=itemId;
      card.innerHTML=`${imageMarkup(def)}<div class="cname">${def.name}</div><div class="cdiff">${item.count>1?`×${item.count}`:'×1'}</div>`;
      card.addEventListener('click',()=>openVoucher(itemId));
      grid.appendChild(card);
    }
  }
  function install(){
    if(installed)return true;
    installAttempts+=1;
    if(typeof renderInventoryScreen!=='function'||typeof showItemDetail!=='function'){
      if(installAttempts<400)setTimeout(install,25);
      return false;
    }
    const baseRenderInventoryScreen=renderInventoryScreen;
    const wrapped=function renderInventoryScreenPipVouchersV1(){
      const result=baseRenderInventoryScreen();
      appendCards();
      return result;
    };
    wrapped.__ttdPipVouchersV1=true;
    renderInventoryScreen=wrapped;
    try{window.renderInventoryScreen=wrapped;}catch(_){}

    const style=document.createElement('style');
    style.id='ttdPipVoucherStyleV1';
    style.textContent=`
      #invGrid>.ttdPipVoucherCardV1{overflow:hidden!important;cursor:pointer!important;}
      #invGrid>.ttdPipVoucherCardV1>.ttdPipVoucherArtV1{width:132px!important;height:72px!important;max-width:100%!important;object-fit:contain!important;object-position:center center!important;margin:0 auto!important;image-rendering:auto!important;}
      #invGrid>.ttdPipVoucherCardV1>.cname{font-size:10.5px!important;line-height:1.22!important;text-align:center!important;}
    `;
    document.head.appendChild(style);
    installed=true;
    send('ttd:item-inventory-ready');
    appendCards();
    return true;
  }

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
    }
  });

  for(const amount of VOUCHER_ROWS){try{const img=new Image();img.decoding='async';img.src=artUrl(amount);}catch(_){} }
  install();
  setTimeout(install,0);
  setTimeout(install,150);
  setTimeout(install,600);
})();
