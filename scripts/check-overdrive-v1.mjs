import fs from 'node:fs';
import vm from 'node:vm';

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const catalog=JSON.parse(fs.readFileSync('overdrivefile.json','utf8'));
const mirror=JSON.parse(fs.readFileSync('functions/overdrivefile.generated.json','utf8'));
const backend=fs.readFileSync('functions/overdrive-v1.js','utf8');
const client=fs.readFileSync('online/overdrive-client-v1.js','utf8');
const runtime=fs.readFileSync('online/overdrive-system-v1.js','utf8');
const shell=fs.readFileSync('online/shell-ui-v9.js','utf8');
const loader=fs.readFileSync('online/game-loader.html','utf8');
const main=fs.readFileSync('functions/main-v6.js','utf8');

new vm.Script(backend,{filename:'functions/overdrive-v1.js'});
new vm.Script(runtime,{filename:'online/overdrive-system-v1.js'});
must(JSON.stringify(catalog)===JSON.stringify(mirror),'Overdrive server catalog mirror drifted from overdrivefile.json.');
must(catalog.schemaVersion===1,'Overdrive catalog schema version must remain 1.');
must(catalog.system?.baseDP===45,'Base player DP must remain 45.');
must(catalog.system?.baseHP===50,'Base player HP must remain aligned with Endless Horde at 50.');
must(catalog.system?.driveMax===100,'Drive Meter must use a 100-point normalized maximum.');
must(catalog.dice&&typeof catalog.dice==='object'&&!Array.isArray(catalog.dice),'Overdrive dice catalog must be an object.');

for(const marker of [
  'getOverdriveStateV1','saveOverdriveDeckV1','overdriveDecks/deck-${index}','overdriveDice/${slot.key}',
  'An Overdrive loadout must contain exactly two optional slots.','Every equipped Overdrive Die must be owned by this account.',
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
for(const forbidden of ['classLevel','pipLevel','jewelSlots','enchantSlots','upgradeOverdrive','mergeOverdrive']){
  must(!runtime.includes(forbidden)&&!backend.includes(forbidden),`Overdrive WYSIWYG contract regressed with progression marker: ${forbidden}`);
}
must(loader.includes("/online/overdrive-system-v1.js"),'Game loader does not inject the Overdrive runtime.');
must(shell.includes("import('/online/overdrive-client-v1.js?v=1')"),'Online shell does not load the Overdrive authenticated client.');

console.log('Overdrive v1 contract verified: two optional cloud-backed slots, 45 base DP, Drive charging hooks, dedicated collection UI, battle HUD, and avatar player stats are wired without class/pip/jewel progression.');
