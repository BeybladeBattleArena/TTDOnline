(() => {
  'use strict';
  if(window.__TTD_RESULT_REWARD_META_V1)return;
  window.__TTD_RESULT_REWARD_META_V1=true;
  const DIFF=Object.freeze({normal:1,hard:1.3,hell:1.65});
  const clampPct=value=>Math.max(0,Math.min(10000,Number(value)||0));

  function bonusPercent(kind){
    const roots=[
      window.__TTD_AVATAR_REWARD_BONUSES,
      account?.avatarRewardBonuses,
      account?.rewardBonuses,
      account?.equipmentBonuses,
      account?.avatar?.rewardBonuses,
    ].filter(v=>v&&typeof v==='object');
    const keys=kind==='pips'
      ?['pipsPct','pipPct','bonusPipsPct','bonusPipPct','pipsBonusPercent','pipBonusPercent']
      :['expPct','xpPct','bonusExpPct','bonusXpPct','expBonusPercent','xpBonusPercent'];
    let total=0;
    for(const root of roots){for(const key of keys){const value=Number(root[key]);if(Number.isFinite(value)&&value>0){total+=value;break;}}}
    return clampPct(total);
  }
  function adventureXp(completedWaves){
    if(!state?.adventure)return 0;
    const waves=Math.max(0,Number(completedWaves)||0),kills=Math.max(0,Number(state.kills)||0),seconds=Math.max(0,Number(state.zPlayTime||state.time)||0);
    let xp=waves*2+kills*.25+Math.min(seconds,1800)*.02+(state.typhoonDefeated?30:0);
    xp*=DIFF[String(state.adventureDiffKey||'normal').toLowerCase()]||1;
    return Math.max(0,Math.min(10000,Math.round(xp)));
  }
  function capture(){
    const rewards=state?.__ttdPlatformRewards||{};
    const expOrbs=Math.max(0,Math.floor(Number(rewards.expOrbs)||0));
    const credits=Math.max(0,Math.floor(Number(rewards.bonusWaveCredits)||0));
    const completed=Math.max(0,Number(state?.completedWaves)||0);
    const expOrbBonusXp=state?.adventure&&credits>0?Math.max(0,adventureXp(completed)-adventureXp(Math.max(0,completed-credits))):0;
    return {type:'ttd:run-reward-meta-v1',expOrbs,expOrbBonusXp,pipsBonusPct:bonusPercent('pips'),expBonusPct:bonusPercent('exp')};
  }
  function send(meta){try{window.parent?.postMessage(meta||capture(),location.origin);}catch(_){} }
  function stripApproximation(){const stats=document.getElementById('overlayStats');if(stats)stats.textContent=String(stats.textContent||'').replace(/\s*\(~\+\d+\s*base EXP\)/ig,'');}

  if(typeof campaignComplete==='function'&&!campaignComplete.__ttdRewardMetaV1){
    const base=campaignComplete;
    const wrapped=function(...args){const meta=capture(),result=base.apply(this,args);stripApproximation();send(meta);return result;};
    wrapped.__ttdRewardMetaV1=true;wrapped.__ttdRewardMetaBaseV1=base;campaignComplete=wrapped;
  }
  if(typeof endMatch==='function'&&!endMatch.__ttdRewardMetaV1){
    const base=endMatch;
    const wrapped=function(...args){const meta=capture(),result=base.apply(this,args);stripApproximation();send(meta);return result;};
    wrapped.__ttdRewardMetaV1=true;wrapped.__ttdRewardMetaBaseV1=base;endMatch=wrapped;
  }
  if(typeof endEndlessHorde==='function'&&!endEndlessHorde.__ttdRewardMetaV1){
    const base=endEndlessHorde;
    const wrapped=function(...args){const meta=capture(),result=base.apply(this,args);send(meta);return result;};
    wrapped.__ttdRewardMetaV1=true;wrapped.__ttdRewardMetaBaseV1=base;endEndlessHorde=wrapped;
  }
  window.__TTD_RESULT_REWARD_META_V1_API=Object.freeze({capture,send});
})();