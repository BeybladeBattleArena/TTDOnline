(() => {
  'use strict';
  if(window.__TTD_SERVER_ITEM_SELL_BRIDGE_V1)return;
  window.__TTD_SERVER_ITEM_SELL_BRIDGE_V1=true;

  const previousShowItemDetail=window.showItemDetail;
  const previousShowSellConfirm=window.showSellConfirm;
  if(typeof previousShowItemDetail!=='function'||typeof previousShowSellConfirm!=='function')return;

  function baseName(view){
    return String(view?.name||'').replace(/\s+×\d+\s*$/,'').trim();
  }
  function isTrustedServerItem(view){
    if(!view||view.sellable!==true||typeof view.onSell!=='function')return false;
    const name=baseName(view);
    if(/^\d{1,3}(?:,\d{3})* Pip Voucher$/i.test(name))return true;
    const catalog=window.TTDItemCatalogV1?.items;
    if(!catalog||typeof catalog!=='object')return false;
    return Object.values(catalog).some(def=>def&&def.name===name);
  }

  window.showItemDetail=function serverItemDetailV1(view){
    if(isTrustedServerItem(view))view._ttdServerInventorySell=true;
    return previousShowItemDetail.apply(this,arguments);
  };

  window.showSellConfirm=function serverItemSellConfirmV1(cardEl,view){
    if(view?._ttdServerInventorySell===true&&typeof view.onSell==='function'){
      const value=Math.max(0,Math.floor(Number(view.sellValue)||0));
      cardEl.innerHTML=`<h2 style="margin-top:6px;">Confirm Sale</h2><p style="color:var(--mist);font-size:13px;margin:12px 0 18px;">Sell this item for ${value.toLocaleString('en-US')} Pips?</p><button class="closeBtn" id="sellYesBtn">Yes</button><button class="closeBtn" id="sellCancelBtn" style="margin-top:8px;background:var(--ink-700);">Cancel</button>`;
      document.getElementById('sellCancelBtn')?.addEventListener('click',()=>renderItemDetailView(cardEl,view));
      document.getElementById('sellYesBtn')?.addEventListener('click',()=>{
        const button=document.getElementById('sellYesBtn');
        if(button){button.disabled=true;button.textContent='Selling…';}
        try{
          view.onSell();
          if(typeof hideItemDetail==='function')hideItemDetail();
        }catch(error){
          console.error('Server Inventory item sale request failed before dispatch.',error);
          if(button){button.disabled=false;button.textContent='Yes';}
          if(typeof showNotice==='function')showNotice('Online Inventory',error?.message||'The item could not be sold.');
        }
      });
      return;
    }
    return previousShowSellConfirm.apply(this,arguments);
  };
})();
