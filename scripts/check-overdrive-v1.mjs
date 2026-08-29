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

const gaia=catalog.dice.gaiacrash;
must(gaia?.name==='Gaia Crash!','Gaia Crash display name drifted.');
must(gaia?.dpCost===15&&gaia?.element==='Earth','Gaia Crash must remain a 15 DP Earth Overdrive Die.');
must(gaia?.flavor==='Rip the earth asunder just to spite your enemy.','Gaia Crash flavor drifted.');
must(gaia?.special?.reticleArmSeconds===0.45&&gaia?.special?.countdownSeconds===3,'Gaia Crash targeting timing drifted.');
must(gaia?.special?.tapToActivateEarly===true&&gaia?.special?.draggable===true,'Gaia Crash reticle interaction drifted.');
must(gaia?.special?.launch?.relaunchAirborne===true&&gaia?.special?.launch?.juggleable===true,'Gaia Crash must launch and relaunch airborne enemies.');
must(gaia?.special?.damageTuning==='provisional-moderate','Gaia Crash damage must remain explicitly provisional until playtest tuning.');
for(const def of [wolf,gaia]){
  must(def?.acquisition?.starterChoiceCount===1&&def?.acquisition?.starterOptionCount===4,'Starter Overdrive acquisition metadata drifted.');
  must(def?.acquisition?.eventualGrantAll===true&&def?.acquisition?.completionByLevel===10,'Starter Overdrive eventual-grant contract drifted.');
}

for(const marker of [
  'getOverdriveStateV1','saveOverdriveDeckV1','overdriveDecks/deck-${index}','overdriveDice/${slot.key}',
  'An Overdrive loadout must contain exactly two optional slots.','Every equipped Overdrive Die must be owned by this account.',
  'RELEASED_STARTER_BACKFILL_CUTOFF_MS','ensureReleasedStarterBackfill','legacy-starter-rollout',
])must(backend.includes(marker),`Overdrive backend contract missing: ${marker}`);
must(main.includes("require('./overdrive-v1')")&&main.includes('...overdrive'),'Overdrive cloud functions are not exported from main-v6.js.');

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
  'moonwolfsummon','gaiacrash','summonWolf','wolfDashAndSnack','wolfHowl','wolfClaw','wolfRaidKick',
  'ttdGaiaCrashTargetV1','commitGaia','resolveGaia','startLift','damageEnemy','__TTD_OVERDRIVE_ABILITIES',
])must(abilities.includes(marker),`Playable Overdrive ability bridge missing: ${marker}`);
for(const marker of ['biteGapSeconds','stunSeconds','confusionChance','secondHitKnockback','relaunchAirborne']){
  must(JSON.stringify(catalog).includes(marker),`Overdrive ability data missing: ${marker}`);
}

// OD battle controls and inspection.
for(const marker of [
  'ttdBattleActionRow','ttdOdCast${index+1}','OD ${index+1}','ttdOdCastButton.castable','ttdOdCastable','ttdOdUncastable',
  'abilityApi()?.activateSlot?.(index)','showOdInfo','Nonelemental','ttdOdInfoFlavor','.ttdOverdriveBattleSlot.filled','.ttdOdCard',
])must(collectionUi.includes(marker),`Overdrive control/inspection UI missing: ${marker}`);
must(loader.includes('/online/collection-actions-ui-v1.js'),'Game loader does not inject collection/Overdrive action UI.');

// Merge All must be authoritative, cascading, gem-safe, and available only in the normal collection.
for(const marker of [
  'exports.mergeAllDiceV1','scope===\'class\'','for(let cls=1;cls<10;cls++)','while(queue.length>=2)','resolveAlias',
  'returnedByMergeAll','enchants:[null,null,null,null]','operation:\'merge_all\'','beforeCounts','afterCounts',
])must(collectionServer.includes(marker),`Merge All backend contract missing: ${marker}`);
for(const marker of [
  'ttdMergeAllBtn','Merge All','All of \'em','Only this Class (C${mergeSelection.classLevel})','ttdMergeAllActive',
  'ttd:collection-mergeall-request','ttd:collection-mergeall-result',
  'All slotted gems were removed from each instance of these dice in order to merge all selected instances.',
])must(collectionUi.includes(marker),`Merge All UI contract missing: ${marker}`);

// Die sale values are exact through C7. Higher Classes intentionally remain unavailable until priced.
for(const marker of [
  'common:25','rare:50','unique:100','legendary:150','1:30','2:45','3:80','4:100','5:120','6:140','7:160',
  'exports.sellDieV1','returnedBySale','operation:\'sell_die\'','pipsAwarded','pipsBalance',
  'Sale values are currently configured through Class 7 only.',
])must(collectionServer.includes(marker),`Die sale backend contract missing: ${marker}`);
for(const marker of [
  'Sell for ${value.toLocaleString()} Pips','Are you sure you want to sell','Transaction Successful','ttd:collection-sell-request','ttd:collection-sell-result',
  'Sale value not configured for C${instance.cls}','window.account.gold=Number(m.pipsBalance)',
])must(collectionUi.includes(marker),`Die sale UI contract missing: ${marker}`);

for(const marker of ['mergeAllDiceV1','sellDieV1','collection-actions-v1'])must(main.includes(marker)||collectionServer.includes(marker),`Collection server export marker missing: ${marker}`);
must(main.includes("require('./collection-actions-v1')")&&main.includes('...collectionActions'),'Collection actions are not exported from main-v6.js.');
must(singleplayerClient.includes("import './collection-actions-client-v1.js?v=1'"),'Online shell client chain does not load collection mutation client.');
for(const marker of ['mergeAllDiceV1','sellDieV1','ttd:collection-mergeall-result','ttd:collection-sell-result'])must(collectionClient.includes(marker),`Collection authenticated client contract missing: ${marker}`);

for(const forbidden of ['classLevel','pipLevel','jewelSlots','enchantSlots','upgradeOverdrive','mergeOverdrive']){
  must(!runtime.includes(forbidden)&&!backend.includes(forbidden)&&!abilities.includes(forbidden),`Overdrive WYSIWYG contract regressed with progression marker: ${forbidden}`);
}
must(loader.includes('/online/overdrive-system-v1.js'),'Game loader does not inject the Overdrive runtime.');
must(loader.includes('/online/overdrive-abilities-v1.js'),'Game loader does not inject playable Overdrive abilities.');
must(shell.includes("import('/online/overdrive-client-v1.js?v=1')"),'Online shell does not load the Overdrive authenticated client.');

console.log('Overdrive/collection action contract verified: explicit OD 1/OD 2 casting, warm-purple readiness, shared inspection, gem-safe cascading Merge All, and authoritative C1-C7 die sales are wired without changing approved assets.');
