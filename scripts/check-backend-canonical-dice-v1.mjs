import fs from 'node:fs';

const catalog=JSON.parse(fs.readFileSync('dicefile.json','utf8'));
const mirror=JSON.parse(fs.readFileSync('functions/dicefile.generated.json','utf8'));
const index=fs.readFileSync('functions/index.js','utf8');
const social=fs.readFileSync('functions/deck-social-v18.js','utf8');

function assert(ok,message){if(!ok)throw new Error(message);}
assert(catalog.catalogVersion===mirror.catalogVersion,'Backend mirror catalog version drifted.');
assert(!!catalog.dice.skyhorn,'Canonical catalog must contain Skyhorn.');
assert(!catalog.dice.arrow,'Canonical catalog must not expose legacy Arrow.');
assert(index.includes("const catalog = require('./dicefile.generated.json');"),'Base inventory authority must consume generated catalog.');
assert(index.includes("LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' })"),'Base inventory authority must retain Arrow -> Skyhorn migration.');
assert(index.includes('await persistLegacyDiceKeyMigration(diceSnap, decksSnap);'),'Inventory reads must self-heal legacy cloud keys.');
assert(index.includes('canonicalDieKey(dieSnap.data()?.key) !== expectedKey'),'Deck ownership must compare canonicalized stored keys.');
assert(!index.includes("rare: Object.freeze(['electric', 'iron', 'arrow'"),'Legacy hard-coded Arrow gacha pool must not return.');
assert(social.includes("const catalog = require('./dicefile.generated.json');"),'Deck/social authority must consume generated catalog.');
assert(social.includes("canonicalDieKey(snap.data()?.key) !== slots[i].key"),'Deck/social ownership must accept migrated canonical identity.');
assert(social.includes('key: canonicalDieKey(data.key)'),'Shared dice must expose canonical keys.');
console.log('Backend canonical dice authority + Arrow -> Skyhorn migration checks passed.');
