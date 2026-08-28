import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,text){fs.writeFileSync(path,text);}
function replaceOnce(text, oldText, newText, label){
  const count=text.split(oldText).length-1;
  if(count!==1)throw new Error(`${label}: expected exactly one target, found ${count}`);
  return text.replace(oldText,newText);
}
function replaceRegexOnce(text, regex, replacement, label){
  const matches=[...text.matchAll(new RegExp(regex.source, regex.flags.includes('g')?regex.flags:regex.flags+'g'))];
  if(matches.length!==1)throw new Error(`${label}: expected exactly one target, found ${matches.length}`);
  return text.replace(regex,replacement);
}

// -----------------------------------------------------------------------------
// functions/index.js — base account/inventory/deck authority still backs
// getInventoryState + setDeckState in main-v6. Make it consume the canonical
// generated catalog and perform the one-time Arrow -> Skyhorn cloud migration.
// -----------------------------------------------------------------------------
let index=read('functions/index.js');
index=replaceOnce(index,
  "const { createHash, randomInt, randomUUID } = require('node:crypto');\n",
  "const { createHash, randomInt, randomUUID } = require('node:crypto');\nconst catalog = require('./dicefile.generated.json');\n",
  'index catalog import');

index=replaceRegexOnce(index,
  /\/\/ Exact v33 gacha pools\.[\s\S]*?const DICE_RARITY = Object\.freeze\(Object\.fromEntries\([\s\S]*?\n\)\);\n/,
`// Canonical dice authority. Gacha excludes chest-exclusive dice, while validation\n// accepts every die in dicefile.generated.json. Legacy persisted keys are normalized\n// at the server boundary so clients only ever receive current canonical keys.\nconst LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' });\nfunction canonicalDieKey(key) { return LEGACY_DIE_KEYS[key] || key; }\nfunction buildCanonicalGachaPools() {\n  const pools = Object.fromEntries(RARITY_ORDER.map((rarity) => [rarity, []]));\n  for (const [key, die] of Object.entries(catalog.dice || {})) {\n    if (!die || die.chestExclusive || !pools[die.rarity]) continue;\n    pools[die.rarity].push(key);\n  }\n  for (const rarity of RARITY_ORDER) {\n    if (!pools[rarity].length) throw new Error(\`dicefile generated an empty \${rarity} gacha pool.\`);\n    Object.freeze(pools[rarity]);\n  }\n  return Object.freeze(pools);\n}\nconst GACHA_POOLS = buildCanonicalGachaPools();\nconst DICE_RARITY = Object.freeze(Object.fromEntries(\n  Object.entries(catalog.dice || {}).map(([key, die]) => [key, die?.rarity]),\n));\n`,
  'index legacy pool block');

index=replaceRegexOnce(index,
  /function publicDie\(data\) \{[\s\S]*?\n\}\n\nfunction publicDeck/,
`function publicDie(data) {\n  const id = data?.id;\n  const storedKey = data?.key;\n  const key = canonicalDieKey(storedKey);\n  const rarity = data?.rarity;\n  const cls = data?.cls;\n  const enchants = data?.enchants;\n  if (\n    typeof id !== 'string' || !id ||\n    typeof storedKey !== 'string' || DICE_RARITY[key] !== rarity ||\n    !Number.isSafeInteger(cls) || cls < 1 || cls > 10 ||\n    !Array.isArray(enchants) || enchants.length !== 4\n  ) {\n    throw new HttpsError('internal', 'A stored die instance is invalid.');\n  }\n  return {\n    key,\n    rarity,\n    source: data.source === 'starter' ? 'starter' : 'gacha',\n    instance: { id, cls, enchants: [...enchants] },\n  };\n}\n\nfunction publicDeck`,
  'index publicDie');

index=replaceRegexOnce(index,
  /function publicDeck\(data, fallbackIndex\) \{[\s\S]*?\n\}\n\nasync function ensureOnlineAccount/,
`function publicDeck(data, fallbackIndex) {\n  const index = Number(data?.index ?? fallbackIndex);\n  const slots = data?.slots;\n  if (!Number.isSafeInteger(index) || index < 0 || index > 2 || !Array.isArray(slots) || slots.length !== 5) {\n    throw new HttpsError('internal', 'A stored deck is invalid.');\n  }\n  const safeSlots = slots.map((slot) => {\n    if (slot == null) return null;\n    if (typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string') {\n      throw new HttpsError('internal', 'A stored deck slot is invalid.');\n    }\n    const key = canonicalDieKey(slot.key);\n    if (!DICE_RARITY[key]) throw new HttpsError('internal', 'A stored deck references an unknown die.');\n    return { key, instId: slot.instId };\n  });\n  return { index, slots: safeSlots };\n}\n\nasync function ensureOnlineAccount`,
  'index publicDeck');

const migrationHelper=`async function persistLegacyDiceKeyMigration(diceSnap, decksSnap) {\n  const writes = [];\n  for (const doc of diceSnap.docs) {\n    const data = doc.data() || {};\n    const key = canonicalDieKey(data.key);\n    if (key !== data.key) {\n      writes.push({ ref:doc.ref, data:{ key, keyMigratedFrom:data.key, keyMigratedAt:FieldValue.serverTimestamp() } });\n    }\n  }\n  for (const doc of decksSnap.docs) {\n    const data = doc.data() || {};\n    if (!Array.isArray(data.slots)) continue;\n    let changed = false;\n    const slots = data.slots.map((slot) => {\n      if (!slot || typeof slot !== 'object') return slot;\n      const key = canonicalDieKey(slot.key);\n      if (key !== slot.key) changed = true;\n      return key === slot.key ? slot : { ...slot, key };\n    });\n    if (changed) writes.push({ ref:doc.ref, data:{ slots, keyMigrationVersion:1, updatedAt:FieldValue.serverTimestamp() } });\n  }\n  for (let offset=0; offset<writes.length; offset+=400) {\n    const batch = db.batch();\n    for (const write of writes.slice(offset, offset+400)) batch.set(write.ref, write.data, { merge:true });\n    await batch.commit();\n  }\n  return writes.length;\n}\n\n`;
index=replaceOnce(index,
  'async function readInventoryAndDecks(uid) {\n',
  migrationHelper+'async function readInventoryAndDecks(uid) {\n',
  'index migration helper insertion');
index=replaceOnce(index,
`  const dice = diceSnap.docs.map((doc) => publicDie(doc.data()))\n    .sort((a, b) => a.instance.id.localeCompare(b.instance.id));\n\n  const byIndex = new Map(decksSnap.docs.map((doc) => {`,
`  await persistLegacyDiceKeyMigration(diceSnap, decksSnap);\n\n  const dice = diceSnap.docs.map((doc) => publicDie(doc.data()))\n    .sort((a, b) => a.instance.id.localeCompare(b.instance.id));\n\n  const byIndex = new Map(decksSnap.docs.map((doc) => {`,
  'index migration call');

index=replaceRegexOnce(index,
  /function normalizeDeckStateInput\(rawDecks, rawActiveDeckIdx\) \{[\s\S]*?\n\}\n\nexports\.health/,
`function normalizeDeckStateInput(rawDecks, rawActiveDeckIdx) {\n  const activeDeckIdx = Number(rawActiveDeckIdx);\n  if (!Number.isSafeInteger(activeDeckIdx) || activeDeckIdx < 0 || activeDeckIdx > 2) {\n    throw new HttpsError('invalid-argument', 'Active deck index must be 0, 1 or 2.');\n  }\n  if (!Array.isArray(rawDecks) || rawDecks.length !== 3) {\n    throw new HttpsError('invalid-argument', 'Exactly three decks are required.');\n  }\n  const decks = rawDecks.map((rawDeck, deckIndex) => {\n    if (!Array.isArray(rawDeck) || rawDeck.length !== 5) {\n      throw new HttpsError('invalid-argument', \`Deck \${deckIndex + 1} must have exactly five slots.\`);\n    }\n    const seenKeys = new Set();\n    const slots = rawDeck.map((slot) => {\n      if (slot == null) return null;\n      if (typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string' || !slot.instId) {\n        throw new HttpsError('invalid-argument', 'A deck slot is malformed.');\n      }\n      const key = canonicalDieKey(slot.key);\n      if (!DICE_RARITY[key]) throw new HttpsError('invalid-argument', 'A deck references an unknown die.');\n      if (seenKeys.has(key)) throw new HttpsError('invalid-argument', 'A deck cannot contain the same die type twice.');\n      seenKeys.add(key);\n      return { key, instId: slot.instId };\n    });\n    return { index: deckIndex, slots };\n  });\n  return { activeDeckIdx, decks };\n}\n\nexports.health`,
  'index normalizeDeckStateInput');
index=replaceOnce(index,
  "if (!dieSnap.exists || dieSnap.data()?.key !== expectedKey) {",
  "if (!dieSnap.exists || canonicalDieKey(dieSnap.data()?.key) !== expectedKey) {",
  'index owned deck key validation');
write('functions/index.js',index);

// -----------------------------------------------------------------------------
// functions/deck-social-v18.js — the newer 3–5 deck/social surfaces must speak the
// same canonical key language, including friends/shared dice that have not yet
// self-migrated by logging in after this release.
// -----------------------------------------------------------------------------
let social=read('functions/deck-social-v18.js');
social=replaceOnce(social,
  "const progressionV21 = require('./account-progression-core-v21');\n",
  "const progressionV21 = require('./account-progression-core-v21');\nconst catalog = require('./dicefile.generated.json');\n\nconst LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' });\nfunction canonicalDieKey(key) { return LEGACY_DIE_KEYS[key] || key; }\nfunction isCanonicalDieKey(key) { return !!catalog.dice?.[key]; }\n",
  'deck-social canonical helpers');
social=replaceRegexOnce(social,
  /function normalizeSlots\(value\) \{[\s\S]*?\n\}\nfunction publicSlots/,
`function normalizeSlots(value) {\n  if (!Array.isArray(value) || value.length !== 5) {\n    throw new HttpsError('invalid-argument', 'A saved or equipped deck must contain exactly five dice.');\n  }\n  const seenKeys = new Set();\n  const seenIds = new Set();\n  return value.map((slot) => {\n    if (!slot || typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string' || !slot.key || !slot.instId) {\n      throw new HttpsError('failed-precondition', 'A full deck of five dice is required.');\n    }\n    const key = canonicalDieKey(slot.key);\n    if (!isCanonicalDieKey(key)) throw new HttpsError('failed-precondition', 'A deck references an unknown die type.');\n    if (seenKeys.has(key)) throw new HttpsError('failed-precondition', 'A deck cannot contain the same die type twice.');\n    if (seenIds.has(slot.instId)) throw new HttpsError('failed-precondition', 'A deck cannot use the same die instance twice.');\n    seenKeys.add(key); seenIds.add(slot.instId);\n    return { key, instId: slot.instId };\n  });\n}\nfunction publicSlots`,
  'deck-social normalizeSlots');
social=replaceRegexOnce(social,
  /function publicSlots\(value\) \{[\s\S]*?\n\}\nfunction xpThresholdForLevel/,
`function publicSlots(value) {\n  const slots = Array.isArray(value) ? value.slice(0, 5) : [];\n  while (slots.length < 5) slots.push(null);\n  return slots.map((slot) => slot && typeof slot === 'object' && typeof slot.key === 'string' && typeof slot.instId === 'string'\n    ? { key: canonicalDieKey(slot.key), instId: slot.instId } : null);\n}\nfunction xpThresholdForLevel`,
  'deck-social publicSlots');
social=replaceOnce(social,
  "if (!snap.exists || snap.data()?.key !== slots[i].key) {",
  "if (!snap.exists || canonicalDieKey(snap.data()?.key) !== slots[i].key) {",
  'deck-social owned validation');
social=replaceOnce(social,
  '    key: data.key,\n    rarity: data.rarity || null,',
  '    key: canonicalDieKey(data.key),\n    rarity: data.rarity || null,',
  'deck-social shared die');
social=replaceOnce(social,
  '    dice.push({ key: d.key, rarity: d.rarity || null, instance:',
  '    dice.push({ key: canonicalDieKey(d.key), rarity: d.rarity || null, instance:',
  'deck-social friend deck die');
write('functions/deck-social-v18.js',social);

// -----------------------------------------------------------------------------
// Regression validator + package integration.
// -----------------------------------------------------------------------------
const validator=`import fs from 'node:fs';\n\nconst catalog=JSON.parse(fs.readFileSync('dicefile.json','utf8'));\nconst mirror=JSON.parse(fs.readFileSync('functions/dicefile.generated.json','utf8'));\nconst index=fs.readFileSync('functions/index.js','utf8');\nconst social=fs.readFileSync('functions/deck-social-v18.js','utf8');\n\nfunction assert(ok,message){if(!ok)throw new Error(message);}\nassert(catalog.catalogVersion===mirror.catalogVersion,'Backend mirror catalog version drifted.');\nassert(!!catalog.dice.skyhorn,'Canonical catalog must contain Skyhorn.');\nassert(!catalog.dice.arrow,'Canonical catalog must not expose legacy Arrow.');\nassert(index.includes("const catalog = require('./dicefile.generated.json');"),'Base inventory authority must consume generated catalog.');\nassert(index.includes("LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' })"),'Base inventory authority must retain Arrow -> Skyhorn migration.');\nassert(index.includes('await persistLegacyDiceKeyMigration(diceSnap, decksSnap);'),'Inventory reads must self-heal legacy cloud keys.');\nassert(index.includes('canonicalDieKey(dieSnap.data()?.key) !== expectedKey'),'Deck ownership must compare canonicalized stored keys.');\nassert(!index.includes("rare: Object.freeze(['electric', 'iron', 'arrow'"),'Legacy hard-coded Arrow gacha pool must not return.');\nassert(social.includes("const catalog = require('./dicefile.generated.json');"),'Deck/social authority must consume generated catalog.');\nassert(social.includes("canonicalDieKey(snap.data()?.key) !== slots[i].key"),'Deck/social ownership must accept migrated canonical identity.');\nassert(social.includes('key: canonicalDieKey(data.key)'),'Shared dice must expose canonical keys.');\nconsole.log('Backend canonical dice authority + Arrow -> Skyhorn migration checks passed.');\n`;
write('scripts/check-backend-canonical-dice-v1.mjs',validator);

const pkg=JSON.parse(read('package.json'));
pkg.scripts['check:backend-dice']='node scripts/check-backend-canonical-dice-v1.mjs';
pkg.scripts['check:backend']='npm run check:catalog && npm run check:functions && npm run check:backend-dice';
pkg.scripts.check=pkg.scripts.check.replace('npm run check:catalog && npm run check:functions','npm run check:catalog && npm run check:functions && npm run check:backend-dice');
write('package.json',JSON.stringify(pkg,null,2)+'\n');

console.log('Applied canonical cloud dice startup repair.');
