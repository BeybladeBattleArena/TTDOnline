(() => {
  'use strict';
  const ORIGIN=location.origin;

  function expText(m){
    const xp=Math.max(0,Math.floor(Number(m.xpAwarded)||0));
    const level=Number(m.level?.level||0);
    const gained=Array.isArray(m.levelsGained)?m.levelsGained:[];
    return gained.length&&level?`+${xp} EXP · LEVEL UP! Lv.${level}`:`+${xp} EXP`;
  }
  function ensureAdventureExp(m){
    const gold=document.getElementById('overlayGold');
    if(!gold)return;
    let exp=document.getElementById('overlayXpV21');
    if(!exp){
      exp=document.createElement('div');
      exp.id='overlayXpV21';
      exp.style.cssText="margin-top:7px;color:#d4ecfa;font:700 13px 'Space Mono',monospace;text-align:center;text-shadow:0 0 10px rgba(143,196,232,.25);";
      gold.insertAdjacentElement('afterend',exp);
    }
    exp.textContent=expText(m);
  }
  function ensureZombieExp(m){
    const card=document.getElementById('zSummaryCard');
    const button=document.getElementById('zSummaryOkBtn');
    if(!card||!button)return;
    let exp=document.getElementById('zSummaryXpV21');
    if(!exp){
      exp=document.createElement('div');
      exp.id='zSummaryXpV21';
      exp.style.cssText="margin:8px auto 4px;padding:7px 14px;width:max-content;max-width:100%;border:1px solid rgba(143,196,232,.48);border-radius:18px;background:rgba(143,196,232,.08);color:#d4ecfa;font:700 13px 'Space Mono',monospace;text-align:center;";
      button.insertAdjacentElement('beforebegin',exp);
    }
    exp.textContent=expText(m);
  }

  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;
    const m=event.data||{};
    if(m.type!=='ttd:v6-run-finish-result')return;
    const gold=document.getElementById('overlayGold');if(gold)gold.textContent=`+${Number(m.pipsEarned||0)} Pips`;
    const family=String(m.modeFamily||'');
    if(family==='adventure')ensureAdventureExp(m);
    if(family==='zombie')ensureZombieExp(m);
    if(Number(m.chestCount||0)>0){const text=document.getElementById('overlayText');if(text)text.textContent=`Al Hata is cleared! ${m.chestCount===1?'A Frozen Island Chest has':`${m.chestCount} Frozen Island Chests have`} been added to your inventory.`;}
  });
})();
