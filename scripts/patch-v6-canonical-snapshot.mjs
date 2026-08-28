import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,text){fs.writeFileSync(path,text);}
function replaceOnce(text,from,to,label){
  const first=text.indexOf(from);
  if(first<0)throw new Error(`Missing patch anchor: ${label}`);
  if(text.indexOf(from,first+from.length)>=0)throw new Error(`Patch anchor is not unique: ${label}`);
  return text.slice(0,first)+to+text.slice(first+from.length);
}

let server=read('functions/singleplayer-v6.js');
server=replaceOnce(server,
"const levelRewardsV21 = require('./account-progression-v21');",
"const levelRewardsV21 = require('./account-progression-v21');\nconst catalog = require('./dicefile.generated.json');",
'canonical catalog import');

server=replaceOnce(server,
`const GACHA_POOLS = Object.freeze({
  common: ['fire','ice','wind','poison','broken'],
  rare: ['electric','iron','arrow','light','crack','magnet','shuriken'],
  unique: ['laser','teleport','mine','mimic','absorb','goldrush','blackwind','bubble','haunt','bubblebeam','devilshadow'],
  legendary: ['growth','joker','gun','blizzard','nuclear','luckylucky','heavensfist','asclepius','comet','hitman','crossinggate'],
});
const DICE_RARITY = Object.freeze(Object.fromEntries(
  Object.entries(GACHA_POOLS).flatMap(([rarity, keys]) => keys.map((key) => [key, rarity])),
));
DICE_RARITY.bruteforceblizzard = 'legendary';`,
`// Canonical dice authority for the full v6 account surface. This module is loaded
// after functions/index.js and therefore must not reintroduce an older hard-coded roster.
const LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' });
function canonicalDieKey(key) { return LEGACY_DIE_KEYS[key] || key; }
function canonicalDieDef(key) { return catalog.dice?.[canonicalDieKey(key)] || null; }
function buildCanonicalGachaPools() {
  const pools = { common:[], rare:[], unique:[], legendary:[] };
  for (const [key, die] of Object.entries(catalog.dice || {})) {
    if (!die || die.chestExclusive || !Array.isArray(pools[die.rarity])) continue;
    pools[die.rarity].push(key);
  }
  return Object.freeze(Object.fromEntries(Object.entries(pools).map(([rarity, keys]) => [rarity, Object.freeze(keys)])));
}
const GACHA_POOLS = buildCanonicalGachaPools();
const DICE_RARITY = Object.freeze(Object.fromEntries(
  Object.entries(catalog.dice || {}).map(([key, die]) => [key, die?.rarity || 'common']),
));`,
'legacy v6 gacha roster');

server=replaceOnce(server,
`function publicDie(data = {}, id = data.id) {
  if (!id || typeof data.key !== 'string') throw new HttpsError('internal', 'A stored die instance is malformed.');
  const cls = Number(data.cls);
  if (!Number.isSafeInteger(cls) || cls < 1 || cls > 10) throw new HttpsError('internal', 'A stored die Class is malformed.');
  return {
    key: data.key,
    rarity: data.rarity || DICE_RARITY[data.key] || 'common',
    source: data.source || null,
    instance: { id, cls, enchants: normalizeEnchantSlots(data.enchants) },
  };
}
function emptySlots() { return [null,null,null,null,null]; }
function normalizeDeckDoc(data, index) {
  const slots = Array.isArray(data?.slots) ? data.slots.slice(0, 5) : [];
  while (slots.length < 5) slots.push(null);
  return {
    index,
    slots: slots.map((slot) => slot && typeof slot === 'object' && typeof slot.key === 'string' && typeof slot.instId === 'string'
      ? { key: slot.key, instId: slot.instId } : null),
  };
}`,
`function publicDie(data = {}, id = data.id) {
  if (!id || typeof data.key !== 'string') throw new HttpsError('internal', 'A stored die instance is malformed.');
  const key = canonicalDieKey(data.key);
  const def = canonicalDieDef(key);
  if (!def) throw new HttpsError('internal', 'A stored die references an unknown canonical die.');
  const cls = Number(data.cls);
  if (!Number.isSafeInteger(cls) || cls < 1 || cls > 10) throw new HttpsError('internal', 'A stored die Class is malformed.');
  return {
    key,
    rarity: def.rarity || data.rarity || 'common',
    source: data.source || null,
    instance: { id, cls, enchants: normalizeEnchantSlots(data.enchants) },
  };
}
function emptySlots() { return [null,null,null,null,null]; }
function normalizeDeckDoc(data, index) {
  const slots = Array.isArray(data?.slots) ? data.slots.slice(0, 5) : [];
  while (slots.length < 5) slots.push(null);
  return {
    index,
    slots: slots.map((slot) => {
      if (!slot || typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string') return null;
      const key = canonicalDieKey(slot.key);
      if (!canonicalDieDef(key)) throw new HttpsError('internal', 'A stored deck references an unknown canonical die.');
      return { key, instId:slot.instId };
    }),
  };
}`,
'v6 public die/deck normalization');

server=replaceOnce(server,
`      if (typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string') throw new HttpsError('invalid-argument', 'A deck slot is invalid.');
      if (keys.has(slot.key)) throw new HttpsError('failed-precondition', 'A deck cannot contain the same die type twice.');
      keys.add(slot.key);
      return { key:slot.key, instId:slot.instId };`,
`      if (typeof slot !== 'object' || typeof slot.key !== 'string' || typeof slot.instId !== 'string') throw new HttpsError('invalid-argument', 'A deck slot is invalid.');
      const key = canonicalDieKey(slot.key);
      if (!canonicalDieDef(key)) throw new HttpsError('invalid-argument', 'A deck references an unknown die type.');
      if (keys.has(key)) throw new HttpsError('failed-precondition', 'A deck cannot contain the same die type twice.');
      keys.add(key);
      return { key, instId:slot.instId };`,
'v6 setDeckState key normalization');

server=replaceOnce(server,
`      if (!die || die.key !== slot.key) throw new HttpsError('failed-precondition', 'A deck references a die this account does not own.');`,
`      if (!die || canonicalDieKey(die.key) !== slot.key) throw new HttpsError('failed-precondition', 'A deck references a die this account does not own.');`,
'v6 setDeckState ownership comparison');

server=replaceOnce(server,
`      const key = cleanString(spec?.key, 40); if (!DICE_RARITY[key]) continue;`,
`      const key = canonicalDieKey(cleanString(spec?.key, 40)); if (!DICE_RARITY[key]) continue;`,
'v6 gift die key normalization');

write('functions/singleplayer-v6.js',server);

let bridge=read('online/singleplayer-bridge-v6.js');
bridge=replaceOnce(bridge,
`  const ORIGIN = location.origin;
  let v6Ready = false;`,
`  const ORIGIN = location.origin;
  const LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' });
  function canonicalSnapshotKey(rawKey, context) {
    const original = String(rawKey || '');
    const key = LEGACY_DIE_KEYS[original] || original;
    if (!key || !DICE[key]) throw new Error(\`${'${context}'} references unknown die key "${'${original}'}".\`);
    return key;
  }
  let v6Ready = false;`,
'v6 bridge canonical key helper');

bridge=replaceOnce(bridge,
`  function applySnapshot(s) {
    if (!validSnapshot(s)) throw new Error('The server returned an invalid full account snapshot.');
    const owned = {};
    for (const grant of s.dice) {
      if (!grant || !DICE[grant.key] || !grant.instance?.id) continue;
      if (!owned[grant.key]) owned[grant.key] = [];
      owned[grant.key].push({ id:grant.instance.id, cls:grant.instance.cls, enchants:normalizeSlots(grant.instance.enchants) });
    }
    account.gold = s.gameState.economy.pips;
    account.astras = s.gameState.economy.astras;
    account.owned = owned;
    account.decks = s.decks.slice().sort((a,b)=>a.index-b.index).map((deck) => deck.slots.map((slot) => slot ? { key:slot.key, instId:slot.instId } : null));
    account.activeDeckIdx = Math.max(0, Math.min(account.decks.length-1, Number(s.gameState.activeDeckIdx || 0)));
    account.favoriteDice = Array.isArray(s.favorites) ? s.favorites.slice(0,10) : [];
    account.inventory = {
      rewards:Array.isArray(s.inventory.rewards) ? JSON.parse(JSON.stringify(s.inventory.rewards)) : [],
      materials:Array.isArray(s.inventory.materials) ? JSON.parse(JSON.stringify(s.inventory.materials)) : [],
      enchant:Array.isArray(s.inventory.enchant) ? JSON.parse(JSON.stringify(s.inventory.enchant)) : [],
    };
    account.settings = { ...(account.settings || {}), showDamageNumbers:s.settings.showDamageNumbers !== false };
    account.redeemedCodes = [];
    if (typeof renderHome === 'function') renderHome();
    if (typeof renderGachaTop === 'function') renderGachaTop();
    if (typeof renderDeckScreen === 'function') renderDeckScreen();
    if (typeof renderInventoryScreen === 'function') renderInventoryScreen();
    if (typeof renderOptionsScreen === 'function') renderOptionsScreen();
    if (typeof renderShopScreen === 'function' && document.getElementById('shopScreen')?.classList.contains('active')) renderShopScreen();
    return true;
  }`,
`  function applySnapshot(s) {
    if (!validSnapshot(s)) throw new Error('The server returned an invalid full account snapshot.');
    const owned = {};
    const ownedKeyById = new Map();
    for (const grant of s.dice) {
      if (!grant || !grant.instance?.id) throw new Error('The server returned an invalid die in the full account snapshot.');
      const key = canonicalSnapshotKey(grant.key, 'Inventory');
      if (!owned[key]) owned[key] = [];
      owned[key].push({ id:grant.instance.id, cls:grant.instance.cls, enchants:normalizeSlots(grant.instance.enchants) });
      ownedKeyById.set(grant.instance.id, key);
    }
    account.gold = s.gameState.economy.pips;
    account.astras = s.gameState.economy.astras;
    account.owned = owned;
    account.decks = s.decks.slice().sort((a,b)=>a.index-b.index).map((deck) => deck.slots.map((slot) => {
      if (!slot) return null;
      if (typeof slot.key !== 'string' || typeof slot.instId !== 'string') throw new Error('The server returned an invalid deck slot.');
      const key = canonicalSnapshotKey(slot.key, 'Deck');
      if (ownedKeyById.get(slot.instId) !== key) throw new Error(\`Deck slot ${'${slot.instId}'} does not match its owned canonical die.\`);
      return { key, instId:slot.instId };
    }));
    account.activeDeckIdx = Math.max(0, Math.min(account.decks.length-1, Number(s.gameState.activeDeckIdx || 0)));
    account.favoriteDice = Array.isArray(s.favorites) ? s.favorites.slice(0,10) : [];
    account.inventory = {
      rewards:Array.isArray(s.inventory.rewards) ? JSON.parse(JSON.stringify(s.inventory.rewards)) : [],
      materials:Array.isArray(s.inventory.materials) ? JSON.parse(JSON.stringify(s.inventory.materials)) : [],
      enchant:Array.isArray(s.inventory.enchant) ? JSON.parse(JSON.stringify(s.inventory.enchant)) : [],
    };
    account.settings = { ...(account.settings || {}), showDamageNumbers:s.settings.showDamageNumbers !== false };
    account.redeemedCodes = [];
    if (typeof renderHome === 'function') renderHome();
    if (typeof renderGachaTop === 'function') renderGachaTop();
    if (typeof renderDeckScreen === 'function') renderDeckScreen();
    if (typeof renderInventoryScreen === 'function') renderInventoryScreen();
    if (typeof renderOptionsScreen === 'function') renderOptionsScreen();
    if (typeof renderShopScreen === 'function' && document.getElementById('shopScreen')?.classList.contains('active')) renderShopScreen();
    return true;
  }`,
'v6 full snapshot application');
write('online/singleplayer-bridge-v6.js',bridge);

let gameBridge=read('online/game-bridge-inner.js');
gameBridge=replaceOnce(gameBridge,
`  const ORIGIN = location.origin;
  const originalSaveAccount = saveAccount;`,
`  const ORIGIN = location.origin;
  const LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' });
  const canonicalDieKey = (key) => LEGACY_DIE_KEYS[key] || key;
  const originalSaveAccount = saveAccount;`,
'v4 bridge canonical key helper');

gameBridge=replaceOnce(gameBridge,
`      typeof grant.key === 'string' && grant.key in DICE &&`,
`      typeof grant.key === 'string' && canonicalDieKey(grant.key) in DICE &&`,
'v4 grant validation');

gameBridge=replaceOnce(gameBridge,
`        (typeof slot === 'object' && typeof slot.key === 'string' && typeof slot.instId === 'string')));`,
`        (typeof slot === 'object' && typeof slot.key === 'string' && canonicalDieKey(slot.key) in DICE && typeof slot.instId === 'string')));`,
'v4 deck validation');

gameBridge=replaceOnce(gameBridge,
`    for (const grant of dice) {
      if (!owned[grant.key]) owned[grant.key] = [];
      owned[grant.key].push({`,
`    for (const grant of dice) {
      const key = canonicalDieKey(grant.key);
      if (!owned[key]) owned[key] = [];
      owned[key].push({`,
'v4 inventory canonical storage');

gameBridge=replaceOnce(gameBridge,
`    account.decks = decks.map((deck) => deck.slots.map((slot) =>
      slot ? { key: slot.key, instId: slot.instId } : null));`,
`    account.decks = decks.map((deck) => deck.slots.map((slot) =>
      slot ? { key: canonicalDieKey(slot.key), instId: slot.instId } : null));`,
'v4 deck canonical storage');

gameBridge=replaceOnce(gameBridge,
`    if (!account.owned[grant.key]) account.owned[grant.key] = [];
    const exists = Object.values(account.owned).some((instances) =>`,
`    const key = canonicalDieKey(grant.key);
    if (!account.owned[key]) account.owned[key] = [];
    const exists = Object.values(account.owned).some((instances) =>`,
'v4 merge grant key');

gameBridge=replaceOnce(gameBridge,
`    account.owned[grant.key].push({`,
`    account.owned[key].push({`,
'v4 merge grant storage');

gameBridge=replaceOnce(gameBridge,
`      const card = renderPullCard(result.key);`,
`      const card = renderPullCard(canonicalDieKey(result.key));`,
'v4 pull render canonical key');
write('online/game-bridge-inner.js',gameBridge);

let loader=read('online/runtime-bridge-loader-v1.js');
loader=replaceOnce(loader,"'/online/game-bridge-inner.js?v=4'","'/online/game-bridge-inner.js?v=5'",'game bridge cache token');
loader=replaceOnce(loader,"'/online/singleplayer-bridge-v6.js?v=6'","'/online/singleplayer-bridge-v6.js?v=7'",'singleplayer bridge cache token');
write('online/runtime-bridge-loader-v1.js',loader);

const check=`import fs from 'node:fs';
const server=fs.readFileSync('functions/singleplayer-v6.js','utf8');
const bridge=fs.readFileSync('online/singleplayer-bridge-v6.js','utf8');
const gameBridge=fs.readFileSync('online/game-bridge-inner.js','utf8');
const loader=fs.readFileSync('online/runtime-bridge-loader-v1.js','utf8');
const main=fs.readFileSync('functions/main-v6.js','utf8');
const catalog=JSON.parse(fs.readFileSync('functions/dicefile.generated.json','utf8'));
function assert(ok,msg){if(!ok)throw new Error(msg);}
assert(catalog.dice.skyhorn && !catalog.dice.arrow,'Catalog must expose Skyhorn and retire Arrow.');
assert(server.includes("const catalog = require('./dicefile.generated.json');"),'v6 snapshot backend must consume canonical catalog.');
assert(server.includes("LEGACY_DIE_KEYS = Object.freeze({ arrow:'skyhorn' })"),'v6 snapshot backend must normalize Arrow to Skyhorn.');
assert(!server.includes("rare: ['electric','iron','arrow'"),'v6 backend must not retain the old Arrow gacha roster.');
assert(server.includes('const key = canonicalDieKey(data.key);'),'v6 public dice must canonicalize stored keys.');
assert(server.includes('const key = canonicalDieKey(slot.key);'),'v6 deck snapshots must canonicalize stored keys.');
assert(server.includes('canonicalDieKey(die.key) !== slot.key'),'v6 deck ownership must compare canonical identities.');
assert(server.includes('canonicalDieKey(cleanString(spec?.key, 40))'),'gift rewards must canonicalize legacy die keys.');
assert(bridge.includes('function canonicalSnapshotKey(rawKey, context)'),'v6 browser snapshot bridge must validate canonical keys before rendering.');
assert(bridge.includes("const key = canonicalSnapshotKey(grant.key, 'Inventory');"),'inventory ingress must canonicalize.');
assert(bridge.includes("const key = canonicalSnapshotKey(slot.key, 'Deck');"),'deck ingress must canonicalize.');
assert(bridge.includes('ownedKeyById.get(slot.instId) !== key'),'deck slots must match owned canonical instances.');
assert(!bridge.includes('if (!grant || !DICE[grant.key] || !grant.instance?.id) continue;'),'v6 bridge must not silently drop an unknown die and then render its deck slot.');
assert(gameBridge.includes('canonicalDieKey(grant.key) in DICE'),'v4 bridge must accept only renderable canonical grants.');
assert(gameBridge.includes('key: canonicalDieKey(slot.key)'),'v4 bridge must store canonical deck keys.');
assert(loader.includes("'/online/game-bridge-inner.js?v=5'"),'runtime loader must cache-bust corrected v4 bridge.');
assert(loader.includes("'/online/singleplayer-bridge-v6.js?v=7'"),'runtime loader must cache-bust corrected v6 bridge.');
assert(main.indexOf('...singleplayer')>main.indexOf('...base'),'Regression premise changed: singleplayer no longer overrides base later; update this validator intentionally.');
console.log('V6 canonical full-account snapshot ingress verified.');
`;
write('scripts/check-v6-canonical-snapshot-v1.mjs',check);

let pkg=JSON.parse(read('package.json'));
pkg.scripts['check:v6-canonical-snapshot']='node scripts/check-v6-canonical-snapshot-v1.mjs';
pkg.scripts.check=pkg.scripts.check.replace('npm run check:backend-dice &&','npm run check:backend-dice && npm run check:v6-canonical-snapshot &&');
pkg.scripts['check:hosting']=pkg.scripts['check:hosting'].replace('npm run check:bridge &&','npm run check:bridge && npm run check:v6-canonical-snapshot &&');
pkg.scripts['check:backend']=pkg.scripts['check:backend'].replace('npm run check:backend-dice','npm run check:backend-dice && npm run check:v6-canonical-snapshot');
write('package.json',JSON.stringify(pkg,null,2)+'\n');

console.log('Applied v6 canonical snapshot repair.');
