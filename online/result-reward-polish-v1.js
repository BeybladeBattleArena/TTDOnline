(() => {
  'use strict';
  if(window.__TTD_RESULT_REWARD_POLISH_V1)return;
  window.__TTD_RESULT_REWARD_POLISH_V1=true;
  const frame=document.getElementById('gameFrame');
  let latestResult=null;
  let latestMeta={expOrbs:0,expOrbBonusXp:0,pipsBonusPct:0,expBonusPct:0};

  const num=(value)=>Math.max(0,Math.round(Number(value)||0));
  const pct=(value)=>Math.max(0,Math.min(10000,Number(value)||0));
  function installStyle(doc){
    if(!doc?.head||doc.getElementById('ttdRewardTallyStyleV1'))return;
    const style=doc.createElement('style');style.id='ttdRewardTallyStyleV1';style.textContent=`
      .ttdRewardTallyV1{
        width:min(100%,330px)!important;min-height:30px!important;margin:6px auto!important;padding:0!important;
        display:flex!important;align-items:baseline!important;justify-content:center!important;gap:11px!important;
        border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;
        font-family:'Russo One',sans-serif!important;line-height:1.15!important;text-align:center!important;
      }
      .ttdRewardTallyV1 .ttdRewardLabelV1{
        min-width:52px;text-align:right;font-size:17px!important;font-weight:400!important;letter-spacing:.045em!important;
        color:transparent!important;background:linear-gradient(180deg,#f6d77f 0%,#e5b64d 31%,#e27827 50%,#e5b64d 69%,#f6d77f 100%)!important;
        -webkit-background-clip:text!important;background-clip:text!important;-webkit-text-fill-color:transparent!important;
        filter:drop-shadow(0 1px 0 rgba(51,31,8,.88)) drop-shadow(0 0 4px rgba(226,150,48,.18));
      }
      .ttdRewardTallyV1 .ttdRewardValueV1{font-size:18px!important;font-weight:400!important;color:#fff!important;-webkit-text-fill-color:#fff!important;letter-spacing:.02em!important;}
      .ttdRewardTallyV1 .ttdRewardNoteV1{font-size:13px!important;font-weight:400!important;color:#fff!important;-webkit-text-fill-color:#fff!important;white-space:nowrap!important;}
      .ttdRewardLevelV1{margin:-1px auto 5px!important;color:#d4ecfa!important;font:400 10px 'Russo One',sans-serif!important;text-align:center!important;letter-spacing:.035em!important;}
      #zSummaryCard .ttdRewardTallyV1.goldPill::before{display:none!important;}
    `;doc.head.appendChild(style);
  }
  function notes(orbBonus,bonusPct){
    let html='';
    if(num(orbBonus)>0)html+=`<span class="ttdRewardNoteV1">(+${num(orbBonus)})</span>`;
    if(pct(bonusPct)>0)html+=`<span class="ttdRewardNoteV1">(+${pct(bonusPct).toLocaleString(undefined,{maximumFractionDigits:2})}%)</span>`;
    return html;
  }
  function row(node,label,total,orbBonus=0,bonusPct=0){
    if(!node)return;
    node.classList.add('ttdRewardTallyV1');
    node.innerHTML=`<span class="ttdRewardLabelV1">${label}</span><span class="ttdRewardValueV1">${num(total).toLocaleString()}</span>${notes(orbBonus,bonusPct)}`;
  }
  function bonusField(result,name,fallback){
    const reward=result?.rewardBonuses||result?.bonuses||{};
    const aliases=name==='pips'?['pipsPct','pipPct','bonusPipsPct','bonusPipPct']:['expPct','xpPct','bonusExpPct','bonusXpPct'];
    for(const key of aliases){const value=Number(reward?.[key]??result?.[key]);if(Number.isFinite(value)&&value>0)return pct(value);}
    return pct(fallback);
  }
  function apply(){
    if(!latestResult)return;
    let doc;try{doc=frame?.contentDocument;}catch(_){return;}if(!doc)return;installStyle(doc);
    const result=latestResult,mode=String(result.modeFamily||'');
    const pips=num(result.pipsEarned),xp=num(result.xpAwarded);
    const pipsPct=bonusField(result,'pips',latestMeta.pipsBonusPct),expPct=bonusField(result,'exp',latestMeta.expBonusPct);
    const orbBonus=num(result.expOrbBonusXp??latestMeta.expOrbBonusXp);

    if(mode==='zombie'){
      const card=doc.getElementById('zSummaryCard');
      const pipsNode=card?.querySelector('.goldPill');
      row(pipsNode,'PIPS',pips,0,pipsPct);
      let exp=doc.getElementById('zSummaryXpV21');
      if(exp)row(exp,'EXP',xp,0,expPct);
    }else{
      const pipsNode=doc.getElementById('overlayGold');row(pipsNode,'PIPS',pips,0,pipsPct);
      let exp=doc.getElementById('overlayXpV21');
      if(!exp&&pipsNode){exp=doc.createElement('div');exp.id='overlayXpV21';pipsNode.insertAdjacentElement('afterend',exp);}
      row(exp,'EXP',xp,orbBonus,expPct);
      const stats=doc.getElementById('overlayStats');if(stats)stats.textContent=String(stats.textContent||'').replace(/\s*\(~\+\d+\s*base EXP\)/ig,'');
    }

    const gained=Array.isArray(result.levelsGained)?result.levelsGained:[];
    if(gained.length&&mode!=='zombie'){
      const exp=doc.getElementById('overlayXpV21');if(exp){let level=doc.getElementById('ttdRewardLevelV1');if(!level){level=doc.createElement('div');level.id='ttdRewardLevelV1';level.className='ttdRewardLevelV1';exp.insertAdjacentElement('afterend',level);}level.textContent=`LEVEL UP! Lv.${num(result.level?.level)}`;}
    }
  }
  function reapply(){[0,35,120,320,800,1800].forEach(ms=>setTimeout(apply,ms));}

  window.addEventListener('ttd:verified-run-result-v1',event=>{latestResult=event.detail||null;reapply();});
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
    const m=event.data||{};if(m.type!=='ttd:run-reward-meta-v1')return;
    latestMeta={expOrbs:num(m.expOrbs),expOrbBonusXp:num(m.expOrbBonusXp),pipsBonusPct:pct(m.pipsBonusPct),expBonusPct:pct(m.expBonusPct)};
    reapply();
  });
  frame?.addEventListener('load',()=>setTimeout(()=>{try{installStyle(frame.contentDocument);}catch(_){}},80));
  window.__TTD_RESULT_REWARD_POLISH_V1_API=Object.freeze({apply});
})();