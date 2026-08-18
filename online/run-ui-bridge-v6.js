(() => {
  'use strict';
  const ORIGIN=location.origin;
  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const m=event.data||{};
    if(m.type!=='ttd:v6-run-finish-result')return;
    const gold=document.getElementById('overlayGold');if(gold)gold.textContent=`+${Number(m.pipsEarned||0)} Pips`;
    if(Number(m.chestCount||0)>0){const text=document.getElementById('overlayText');if(text)text.textContent=`Al Hata is cleared! ${m.chestCount===1?'A Frozen Island Chest has':`${m.chestCount} Frozen Island Chests have`} been added to your inventory.`;}
  });
})();
