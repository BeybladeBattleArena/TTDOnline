(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_ENTRY_V3)return;
  window.__TTD_DARK_MONASTERY_ENTRY_V3=true;

  const DM_ID='dark_monastery';
  const nativeCampaignStart=startAdventureCampaign;

  function normalizeAdventureEntry(){
    const adv=ADVENTURES?.[DM_ID];
    if(!adv)return false;
    // The current Dark Monastery slice is one roaming stage. Mark it non-campaign so the
    // stock Adventure stage UI calls startAdventure(...), which is where the roaming runtime
    // is installed. Keep a campaign redirect below as a compatibility fallback for stale UI.
    adv.campaign=false;
    adv.darkMonastery=true;
    adv.roam3d=true;
    return true;
  }

  startAdventureCampaign=function DarkMonasteryCampaignRedirectV3(advId,diffKey){
    if(advId===DM_ID){
      normalizeAdventureEntry();
      return startAdventure(DM_ID,0,diffKey);
    }
    return nativeCampaignStart.apply(this,arguments);
  };

  normalizeAdventureEntry();

  window.__TTD_DARK_MONASTERY_ENTRY_V3_API=Object.freeze({
    version:3,
    id:DM_ID,
    normalizeAdventureEntry,
    get adventure(){return ADVENTURES?.[DM_ID]||null;},
  });
})();
