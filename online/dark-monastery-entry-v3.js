(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_ENTRY_V3)return;
  window.__TTD_DARK_MONASTERY_ENTRY_V3=true;

  const DM_ID='dark_monastery';
  const finalStageStart=startAdventure;
  const finalCampaignStart=startAdventureCampaign;

  function normalizeAdventureEntry(){
    const adv=ADVENTURES?.[DM_ID];
    if(!adv)return false;
    // The current Dark Monastery slice is one roaming stage. Use the ordinary stage-list route,
    // then explicitly send that stage into the published Dark Monastery runtime starter below.
    adv.campaign=false;
    adv.darkMonastery=true;
    adv.roam3d=true;
    return true;
  }

  function startDarkMonastery(diffKey){
    normalizeAdventureEntry();
    const dmStart=window.__TTD_DARK_MONASTERY_START_V2;
    if(typeof dmStart!=='function')throw new Error('Dark Monastery roaming starter is unavailable.');
    return dmStart.call(this,DM_ID,0,diffKey);
  }

  startAdventure=function DarkMonasteryFinalStageStartV3(advId,stageIdx,diffKey){
    if(advId===DM_ID)return startDarkMonastery.call(this,diffKey);
    return finalStageStart.apply(this,arguments);
  };

  startAdventureCampaign=function DarkMonasteryFinalCampaignStartV3(advId,diffKey){
    if(advId===DM_ID)return startDarkMonastery.call(this,diffKey);
    return finalCampaignStart.apply(this,arguments);
  };

  normalizeAdventureEntry();

  window.__TTD_DARK_MONASTERY_ENTRY_V3_API=Object.freeze({
    version:3,
    build:'published-runtime-route-v2',
    id:DM_ID,
    normalizeAdventureEntry,
    startDarkMonastery,
    get adventure(){return ADVENTURES?.[DM_ID]||null;},
  });
})();
