(() => {
  'use strict';

  // Canonical dice use canonRollDamage(), while the older generic attack path computes
  // critical damage inline. The canonical helper was left calling a nonexistent
  // getCritMultiplier(), so the first canonical critical hit throws and kills the RAF loop.
  // Rapid attackers such as Skyhorn make this especially visible once a Spinel is socketed.
  if(typeof canonRollDamage !== 'function' || typeof canonCritChance !== 'function' ||
     typeof canonPowerScale !== 'function' || typeof dieJewelBonus !== 'function'){
    console.error('Canonical crit hotfix could not find the native combat helpers.');
    return;
  }

  // Defensive fallback for any legacy call sites that still ask for the old global helper.
  if(typeof getCritMultiplier !== 'function') window.getCritMultiplier = () => 1.8;

  canonRollDamage = function(die, base, extraCrit=0, canCrit=true, cap=0.5){
    const crit = canCrit && Math.random() < canonCritChance(die, extraCrit, cap);
    const critMult = 1.8 + dieJewelBonus(die, 'critBoost');
    return {
      amount: canonPowerScale(die, base) * (crit ? critMult : 1),
      crit,
    };
  };
})();
