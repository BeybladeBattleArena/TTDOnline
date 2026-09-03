import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const catalog=JSON.parse(fs.readFileSync('overdrivefile.json','utf8'));
const mirror=JSON.parse(fs.readFileSync('functions/overdrivefile.generated.json','utf8'));
const backend=fs.readFileSync('functions/overdrive-v1.js','utf8');
const client=fs.readFileSync('online/overdrive-client-v1.js','utf8');
const runtime=fs.readFileSync('online/overdrive-system-v1.js','utf8');
const abilities=fs.readFileSync('online/overdrive-abilities-v1.js','utf8');
const starterPack=fs.readFileSync('online/overdrive-starter-pack-v2.js','utf8');
const game=fs.readFileSync('random-dice-game-33.html','utf8');
const gift=fs.readFileSync('functions/gift-v7-secure.js','utf8');
const collectionServer=fs.readFileSync('functions/collection-actions-v1.js','utf8');
const collectionClient=fs.readFileSync('online/collection-actions-client-v1.js','utf8');
const collectionUi=fs.readFileSync('online/collection-actions-ui-v1.js','utf8');
const singleplayerClient=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const shell=fs.readFileSync('online/shell-ui-v9.js','utf8');
const loader=fs.readFileSync('online/game-loader.html','utf8');
const main=fs.readFileSync('functions/main-v6.js','utf8');

new vm.Script(backend,{filename:'functions/overdrive-v1.js'});
new vm.Script(runtime,{filename:'online/overdrive-system-v1.js'});
new vm.Script(abilities,{filename:'online/overdrive-abilities-v1.js'});
new vm.Script(starterPack,{filename:'online/overdrive-starter-pack-v2.js'});
new vm.Script(collectionServer,{filename:'functions/collection-actions-v1.js'});
new vm.Script(collectionUi,{filename:'online/collection-actions-ui-v1.js'});
execFileSync(process.execPath,['--input-type=module','--check'],{input:collectionClient,stdio:['pipe','pipe','pipe']});

must(JSON.stringify(catalog)===JSON.stringify(mirror),'Overdrive server catalog mirror drifted from overdrivefile.json.');
must(catalog.schemaVersion===1,'Overdrive catalog schema version must remain 1.');
must(catalog.system?.baseDP===45,'Base player DP must remain 45.');
must(catalog.system?.baseHP===50,'Base player HP must remain aligned with Endless Horde at 50.');
must(catalog.system?.driveMax===100,'Drive Meter must use a 100-point normalized maximum.');
must(catalog.system?.starterOptionCount===4&&catalog.system?.starterChoiceCount===1,'Starter Overdrive design must remain a 1-of-4 choice.');
must(catalog.system?.starterCompletionLevelMax===10,'All four starter Overdrive Dice must be scheduled within the first 10 account levels.');
must(JSON.stringify(catalog.system?.releasedStarterKeys)==='["moonwolfsummon","gaiacrash","embracedryad","meteorimpact"]','All four starter Overdrive keys must be released in canonical order.');
must(catalog.dice&&typeof catalog.dice==='object'&&!Array.isArray(catalog.dice),'Overdrive dice catalog must be an object.');

const wolf=catalog.dice.moonwolfsummon;
must(wolf?.name==='Protect me, Moon Wolf!','Moon Wolf display name drifted.');
must(wolf?.dpCost===20,'Moon Wolf must cost 20 DP.');
must(wolf?.flavor==='Summon a Moon Wolf from the die to fight alongside you.','Moon Wolf flavor drifted.');
must(wolf?.special?.hp===210&&wolf?.special?.attack===24&&wolf?.special?.damageReduction===0.03,'Moon Wolf base combat stats drifted.');
must(JSON.stringify(wolf?.special?.weak)==='["metal","holy"]','Moon Wolf elemental weaknesses drifted.');
must(JSON.stringify(wolf?.special?.resist)==='["shadow","nature","fire"]','Moon Wolf elemental resistances drifted.');
must(JSON.stringify(wolf?.special?.attacks?.dashAndSnack?.weights)==='[0.85,1.05]','Dash and Snack normal bite sequence drifted.');
must(JSON.stringify(wolf?.special?.attacks?.dashAndSnack?.majorBossWeights)==='[1.05,1.1]','Dash and Snack major-boss sequence drifted.');
must(wolf?.special?.attacks?.dashAndSnack?.biteGapSeconds===0.35&&wolf?.special?.attacks?.dashAndSnack?.stunSeconds===0.8,'Dash and Snack timing drifted.');
must(wolf?.special?.attacks?.howl?.confusionChance===0.4,'Moon Wolf Howl must retain a 40% Confusion chance.');
must(JSON.stringify(wolf?.special?.attacks?.clawCombo?.weights)==='[1.05,1.2]','Moon Wolf Claw Combo damage sequence drifted.');
must(wolf?.special?.attacks?.raidKick?.weight===0.95&&wolf?.special?.attacks?.raidKick?.launch?.juggleable===true,'Moon Wolf Raid Kick launch contract drifted.');

const taurus=catalog.dice.blacktaurus;
must(taurus?.name==='Black Taurus','Black Taurus display name drifted.');
must(taurus?.dpCost===20&&taurus?.element==='Earth','Black Taurus must cost 20 DP and be Earth aligned.');
must(taurus?.special?.hp===330&&taurus?.special?.attack===32&&taurus?.special?.damageReduction===0.08,'Black Taurus provisional summon stats drifted.');
must(taurus?.special?.moveSpeed===51&&taurus?.special?.moveSpeedReference==='standard-goblin-x1.5','Black Taurus must move 50% faster than a standard Goblin.');
must(taurus?.special?.target==='highest-current-hp','Black Taurus must target the enemy with the highest current HP.');
must(taurus?.special?.attacks?.windingRush?.reference==='Relentless Mace spinning skill','Winding Rush must retain its Relentless Mace spin reference.');
must(taurus?.special?.attacks?.impedeStamp?.logAppearLingerSeconds===0.25&&taurus?.special?.attacks?.impedeStamp?.pulledBackLingerSeconds===0.5,'Impede Stamp telegraph timing drifted.');
must(taurus?.special?.attacks?.impedeStamp?.stunSeconds===3.5&&taurus?.special?.attacks?.impedeStamp?.slowSeconds===0.6,'Impede Stamp Stun/Slow timing drifted.');
must(taurus?.special?.attacks?.bullRush?.hornDownWindupSeconds===0.4&&taurus?.special?.attacks?.bullRush?.dashSpeedMultiplier===2.2,'Bull Rush windup/speed drifted.');
must(taurus?.special?.attacks?.bullRush?.goreSeconds===0.4&&taurus?.special?.attacks?.bullRush?.landingStunSeconds===1,'Bull Rush gore/landing Stun timing drifted.');

const gaia=catalog.dice.gaiacrash;
must(gaia?.name==='Gaia Crash!','Gaia Crash display name drifted.');
must(gaia?.dpCost===15&&gaia?.element==='Earth','Gaia Crash must remain a 15 DP Earth Overdrive Die.');
must(gaia?.flavor==='Rip the earth asunder just to spite your enemy.','Gaia Crash flavor drifted.');
must(gaia?.special?.reticleArmSeconds===0.45&&gaia?.special?.countdownSeconds===3,'Gaia Crash targeting timing drifted.');
must(gaia?.special?.tapToActivateEarly===true&&gaia?.special?.draggable===true,'Gaia Crash reticle interaction drifted.');
must(gaia?.special?.launch?.relaunchAirborne===true&&gaia?.special?.launch?.juggleable===true,'Gaia Crash must launch and relaunch airborne enemies.');
must(gaia?.special?.damageTuning==='provisional-moderate','Gaia Crash damage must remain explicitly provisional until playtest tuning.');

const dryad=catalog.dice.embracedryad;
must(dryad?.name==='Embrace of Dryad','Dryad display name drifted.');
must(dryad?.dpCost===18&&dryad?.element==='Nature','Embrace of Dryad must cost 18 DP and be Nature aligned.');
must(dryad?.flavor==='Be embraced by the fortifying arms of nature itself.','Dryad flavor drifted.');
must(dryad?.special?.particleRainSeconds===0.35&&dryad?.special?.branchGrowDelaySeconds===0.5&&dryad?.special?.branchGrowthSeconds===0.8,'Dryad growth sequence timing drifted.');
must(dryad?.special?.branchBaseHp===12&&dryad?.special?.playerMaxHpScale===0.5&&dryad?.special?.hpRounding==='floor','Dryad branch HP formula must remain floor(12 + 0.5 * player max HP).');
must(dryad?.special?.activeSeconds===12&&dryad?.special?.cooldownSeconds===2,'Dryad duration/cooldown contract drifted.');
must(dryad?.special?.frontLayerRandom===true&&dryad?.special?.redirectBeginsWhenFullyGrown===true,'Dryad layer and redirect timing drifted.');
must(JSON.stringify(dryad?.special?.redirectTargets)==='["player","tower","dice"]','Dryad must redirect player, tower, and die damage.');
must(dryad?.special?.elementAffinity==='nature'&&dryad?.special?.elementAffinityFraction===1,'Dryad branches must remain fully Nature aligned.');

const meteor=catalog.dice.meteorimpact;
must(meteor?.name==='Meteor Impact','Meteor Impact display name drifted.');
must(meteor?.dpCost===20&&meteor?.element==='Fire','Meteor Impact must cost 20 DP and be Fire aligned.');
must(meteor?.flavor==='Witness the sky above collapse into burning hellfire upon your foes.','Meteor flavor drifted.');
must(meteor?.special?.chargeSeconds===0.8&&meteor?.special?.postLaunchDelaySeconds===0.4&&meteor?.special?.tintToMeteorDelaySeconds===0.2,'Meteor charge/sky timing drifted.');
must(meteor?.special?.fallSeconds===1.1&&meteor?.special?.embedSeconds===0.3&&meteor?.special?.hesitateSeconds===0.2,'Meteor fall/embed/hesitation timing drifted.');
must(meteor?.special?.affinities?.fire===1,'Meteor Impact damage must remain 100% Fire affinity.');
must(meteor?.special?.damageTuning==='provisional-potent'&&Number(meteor?.special?.damage)>Number(gaia?.special?.damage),'Meteor first-pass damage must stay explicitly provisional and stronger than Gaia Crash.');
must(meteor?.special?.impactTargetPve==='battlefield-center'&&meteor?.special?.impactTargetPvp==='opponent-dice-tray','Meteor PvE/PvP targeting contract drifted.');

const zetsa=catalog.dice.zetsascauldron;
must(zetsa?.name==="Zetsa's Cauldron"&&zetsa?.dpCost===16,'Zetsa Cauldron identity/cost drifted.');
must(zetsa?.element==='Poison'&&zetsa?.special?.kind==='zetsasCauldron','Zetsa Cauldron Poison/special identity drifted.');
must(zetsa?.special?.placementSeconds===4&&zetsa?.special?.defaultTarget==='battlefield-center','Zetsa placement must remain four seconds with center fallback.');
must(zetsa?.special?.directDamage===0&&zetsa?.special?.poisonChance===1&&zetsa?.special?.frogChance===1,'Zetsa splash must deal zero direct damage and guarantee both statuses.');
must(zetsa?.special?.poisonSeconds===2.2&&zetsa?.special?.frogSeconds===2,'Zetsa Poison/Frog durations drifted.');
must(zetsa?.special?.frogMovementMultiplier===0.82&&zetsa?.special?.frogElementalDamageTakenMultiplier===1.12,'Frog movement/vulnerability contract drifted.');
must(zetsa?.special?.violentBubbleSeconds===1.1&&zetsa?.special?.fadeSeconds===0.6,'Zetsa bubble/fade timing drifted.');
must(zetsa?.special?.frogSizeReference==='one-third-standard-goblin'&&zetsa?.special?.cauldronSizeReference==='2x2-standard-ogres','Zetsa visual scale references drifted.');

for(const def of [wolf,gaia,dryad,meteor]){
  must(def?.acquisition?.starterChoiceCount===1&&def?.acquisition?.starterOptionCount===4,'Starter Overdrive acquisition metadata drifted.');
  must(def?.acquisition?.eventualGrantAll===true&&def?.acquisition?.completionByLevel===10,'Starter Overdrive eventual-grant contract drifted.');
  must(def?.acquisition?.rollout==='released-4-of-4','Starter Overdrive release metadata must show all four options are designed.');
}

for(const marker of [
  'getOverdriveStateV1','saveOverdriveDeckV1','overdriveDecks/deck-${index}','overdriveDice/${slot.key}',
  'An Overdrive loadout must contain exactly two optional slots.','Every equipped Overdrive Die must be owned by this account.',
  'RELEASED_STARTER_BACKFILL_CUTOFF_MS','ensureReleasedStarterBackfill','legacy-starter-rollout','newlyReleased','priorKeys',
])must(backend.includes(marker),`Overdrive backend contract missing: ${marker}`);
must(main.includes("require('./overdrive-v1')")&&main.includes('...overdrive'),'Overdrive cloud functions are not exported from main-v6.js.');
must(fs.readFileSync('functions/gift-v7-secure.js','utf8').includes("'TTD-BLACK-TAURUS'")&&fs.readFileSync('functions/gift-v7-secure.js','utf8').includes("key:'blacktaurus'"),'Black Taurus online playtest ownership grant missing.');

for(const marker of [
  "'ttd:overdrive-ready'","'ttd:overdrive-state'","'ttd:overdrive-save-request'","'ttd:overdrive-save-result'",
  "call('getOverdriveStateV1')","call('saveOverdriveDeckV1'",
])must(client.includes(marker),`Overdrive online client contract missing: ${marker}`);

for(const marker of [
  'ttdCollectionKindSwitch','ttdOverdriveDeckSlot','ttdOdRipple','ttdOdSearch','ttdOdElement','ttdOdCost',
  'ttdDriveHud','passiveDrivePerSecond','playerHpDrivePerDamage','towerLifeDrivePerLife','dieDamageDrivePerDamage',
  'overdriveDieDamage','overdriveStartEndlessHorde','ttdPlayerStatsV1','spendDp','resetDrive',
  "message.type === 'ttd:deck-v18-save-result' || message.type === 'ttd:deck-v18-equip-result'",
])must(runtime.includes(marker),`Overdrive runtime contract missing: ${marker}`);

for(const marker of [
  'moonwolfsummon','gaiacrash','blacktaurus','summonWolf','summonTaurus','highestHpTarget','startTaurusWinding','startTaurusStamp','startTaurusBullRush','updateTaurus','drawTaurusShape','drawTaurusStampLog','damageBlackTaurus','wolfDashAndSnack','wolfHowl','wolfClaw','wolfRaidKick',
  'ttdGaiaCrashTargetV1','commitGaia','resolveGaia','ttdZetsasCauldronTargetV1','commitZetsa','resolveZetsa','resolveZetsaSplash','drawCauldronShape','startLift','damageEnemy','__TTD_OVERDRIVE_ABILITIES',
])must(abilities.includes(marker),`Playable Overdrive ability bridge missing: ${marker}`);
for(const marker of ['biteGapSeconds','stunSeconds','confusionChance','secondHitKnockback','relaunchAirborne']){
  must(JSON.stringify(catalog).includes(marker),`Overdrive ability data missing: ${marker}`);
}


for(const marker of ['applyFrogStatus','isFrogStatusActive','frogMovementMult','frogElementalTakenMult','drawFrogStatusEnemy','8/3','isFrogStatusActive(e);','applyPoisonTicks(e, perTick, dur, options)'])must(game.includes(marker),`Frog core contract missing: ${marker}`);
must(game.includes("const frogMult=el==='__nonelemental'?1:frogElementalTakenMult(e)"),'Frog +12% vulnerability must apply to elemental portions only.');
must(game.includes('z.speed*frogMovementMult(z)*dt')&&game.includes('e.slowMult*frogMovementMult(e)'),'Frog 18% marching slowdown must cover zombie and standard path movement.');
must(gift.includes("'TTD-ZETSA'")&&gift.includes("overdriveDice/${key}")&&gift.includes('OVERDRIVE_DICE'),'Zetsa online playtest grant is missing.');

// activateSlot receives an OD slot index. The Overdrive runtime's equipped(index) argument is a DECK index,
// so activation must fetch the current deck pair first and then index into that pair. Calling equipped(index)
// here silently resolves the wrong deck and produces an array instead of an OD die key.
must(abilities.includes('const pair = api?.equipped?.();'),'OD activation must read the active deck Overdrive pair before resolving a slot.');
must(abilities.includes('const entry = Array.isArray(pair) ? pair[index] : null;'),'OD activation must resolve OD 1 / OD 2 from the active pair.');
must(!abilities.includes('api?.equipped?.(index)'),'OD activation regressed to treating the OD slot index as a deck index.');

for(const marker of [
  "new Set(['embracedryad', 'meteorimpact'])",'startDryad','branchHpFor','Math.floor','absorbThroughBranches','dryadRedirectedDieDamage',
  'dryadAwareEndMatch','dryadAwareEndlessEnd','reconcilePlayerDamage','frontIndex','upperIndex','ttdStarterBlocked',
  'startMeteor','resolveMeteor','meteorTarget','__TTD_PVP_OVERDRIVE_METEOR_HIT_V1','affinities:{ fire:1 }',
  'ttdOverdriveStarterPackFxV2','ttdOdCastButton','stopImmediatePropagation','__TTD_OVERDRIVE_STARTER_ABILITIES_V2',
])must(starterPack.includes(marker),`Starter Overdrive pack missing: ${marker}`);
must(starterPack.includes("if (key === 'embracedryad') return !dryadBlocked();"),'Dryad active/cooldown state must block casting before DP is spent.');
must(starterPack.includes("if (key === 'meteorimpact') return !meteorBlocked();"),'Meteor animation must block duplicate casts.');
must(starterPack.indexOf('if (!canActivate(key)) return false;')<starterPack.indexOf("if (key === 'embracedryad') return startDryad(def);"),'Starter ability castability must be checked before activation/spending.');

for(const marker of [
  'ttdBattleActionRow','ttdOdCast${index+1}','OD ${index+1}','ttdOdCastButton.castable','ttdOdCastable','ttdOdUncastable',
  'abilityApi()?.activateSlot?.(index)','showOdInfo','Nonelemental','ttdOdInfoFlavor','.ttdOverdriveBattleSlot.filled','.ttdOdCard',
])must(collectionUi.includes(marker),`Overdrive control/inspection UI missing: ${marker}`);
must(loader.includes('/online/collection-actions-ui-v1.js'),'Game loader does not inject collection/Overdrive action UI.');
must(loader.includes('/online/overdrive-starter-pack-v2.js'),'Game loader does not inject the complete starter Overdrive pack.');

for(const marker of [
  'exports.mergeAllDiceV1','scope===\'class\'','for(let cls=1;cls<10;cls++)','while(queue.length>=2)','resolveAlias',
  'returnedByMergeAll','enchants:[null,null,null,null]','operation:\'merge_all\'','beforeCounts','afterCounts',
])must(collectionServer.includes(marker),`Merge All backend contract missing: ${marker}`);
for(const marker of [
  'ttdMergeAllBtn','Merge All','All of \'em','Only this Class (C${mergeSelection.classLevel})','ttdMergeAllActive',
  'ttd:collection-mergeall-request','ttd:collection-mergeall-result',
  'All slotted gems were removed from each instance of these dice in order to merge all selected instances.',
])must(collectionUi.includes(marker),`Merge All UI contract missing: ${marker}`);

for(const marker of [
  'common:25','rare:50','unique:100','legendary:150','1:30','2:45','3:80','4:100','5:120','6:140','7:160',
  'exports.sellDieV1','returnedBySale','operation:\'sell_die\'','pipsAwarded','pipsBalance',
  'Sale values are currently configured through Class 7 only.',
])must(collectionServer.includes(marker),`Die sale backend contract missing: ${marker}`);
for(const marker of [
  'Sell for ${value.toLocaleString()} Pips','Are you sure you want to sell','Transaction Successful','ttd:collection-sell-request','ttd:collection-sell-result',
  'Sale value not configured for C${instance.cls}','window.account.gold=Number(m.pipsBalance)',
])must(collectionUi.includes(marker),`Die sale UI contract missing: ${marker}`);

must(main.includes("require('./collection-actions-v1')"),'Collection action module is not loaded by main-v6.js.');
must(main.includes('mergeAllDiceV1: collectionActions.mergeAllDiceV1'),'Merge All callable is not explicitly exported from main-v6.js.');
must(main.includes('sellDieV1: collectionActions.sellDieV1'),'Sell callable is not explicitly exported from main-v6.js.');
must(!main.includes('...collectionActions'),'Collection action helper exports must never be spread into the Firebase function surface.');
must(singleplayerClient.includes("import './collection-actions-client-v1.js?v=1'"),'Online shell client chain does not load collection mutation client.');
for(const marker of ['mergeAllDiceV1','sellDieV1','ttd:collection-mergeall-result','ttd:collection-sell-result'])must(collectionClient.includes(marker),`Collection authenticated client contract missing: ${marker}`);

for(const forbidden of ['classLevel','pipLevel','jewelSlots','enchantSlots','upgradeOverdrive','mergeOverdrive']){
  must(!runtime.includes(forbidden)&&!backend.includes(forbidden)&&!abilities.includes(forbidden)&&!starterPack.includes(forbidden),`Overdrive WYSIWYG contract regressed with progression marker: ${forbidden}`);
}
must(loader.includes('/online/overdrive-system-v1.js'),'Game loader does not inject the Overdrive runtime.');
must(loader.includes('/online/overdrive-abilities-v1.js'),'Game loader does not inject playable Overdrive abilities.');
must(shell.includes("import('/online/overdrive-client-v1.js?v=1')"),'Online shell does not load the Overdrive authenticated client.');

console.log('Overdrive/collection action contract verified: all four starter Overdrives are cataloged, Dryad shielding and Meteor Impact are playable through OD 1/OD 2, activation resolves correctly, and existing collection/economy contracts remain intact.');
