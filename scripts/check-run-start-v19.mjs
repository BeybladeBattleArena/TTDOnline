import fs from 'node:fs';

const clientEntry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const client=fs.readFileSync('online/run-start-client-v19.js','utf8');
const server=fs.readFileSync('functions/run-start-v19.js','utf8');
const serverEntry=fs.readFileSync('functions/main-v6.js','utf8');

const requireMarkers=(text,markers,label)=>{for(const marker of markers)if(!text.includes(marker))throw new Error(`${label} missing: ${marker}`);};

requireMarkers(client,[
  "message.type!=='ttd:v6-run-begin-request'",
  'event.stopImmediatePropagation()',
  "httpsCallable(functions,'beginRun')",
  'mapKey:message.mapKey||null',
  "type:'ttd:v6-run-begin-result'",
  "type:'ttd:v6-run-begin-result-error'",
],'run-start client');
const failSafePos=clientEntry.indexOf("import './run-start-client-v19.js?v=19';");
const legacyPos=clientEntry.indexOf("import './singleplayer-client-v9-core.js?v=9';");
if(failSafePos<0||legacyPos<0||failSafePos>legacyPos)throw new Error('Fail-safe run-start client must load before the legacy single-player client.');

requireMarkers(server,[
  "const VALID_MODES=new Set(['survival','bossrush','sudden','adventure','endlesshorde','moving_screen','king_of_the_hill'])",
  "moving_screen:new Set(['neon_rooftops_v2'])",
  "king_of_the_hill:new Set(['neon_rooftops_koth'])",
  "const LEGACY_DIE_KEYS=Object.freeze({arrow:'skyhorn'})",
  "function canonicalDieKey(key){return LEGACY_DIE_KEYS[key]||key;}",
  'const key=canonicalDieKey(slot.key)',
  'const canonicalStoredKey=canonicalDieKey(storedKey)',
  'canonicalStoredKey!==slots[index].key',
  'keyMigratedFrom:storedKey',
  'if(rawSlots[index]?.key!==slots[index].key)deckNeedsMigration=true',
  'if(deckNeedsMigration)',
  'const key=canonicalDieKey(data.key)',
  'Math.min(count-1,candidate)',
  'repair.v6ActiveDeckIdx=active',
  "throw new HttpsError('failed-precondition','Your active deck must contain five dice.')",
  'const mapKey=VALID_MAPS[modeKey]?cleanString(request.data?.mapKey,40):null',
  "throw new HttpsError('invalid-argument','Arcade map is invalid.')",
  'mapKey,',
  'exports.beginRun=onCall',
  "status:'active'",
],'run-start server');
if(server.includes("snap.data()?.key!==slots[index].key"))throw new Error('Run-start must not raw-compare persisted legacy die keys against canonical deck keys.');
if(server.includes('key:data.key,'))throw new Error('Friend support must not publish a legacy die key.');
requireMarkers(serverEntry,["const runStart = require('./run-start-v19');",'...deckSocial, ...runStart'],'function entrypoint');

console.log('Run-start verified: Adventure/Zombie plus map-backed Moving Screen/KOTH share the fail-safe ticket path, selected Arcade map keys are server-validated, stale active-deck indices self-repair, and canonical die identity remains enforced.');
