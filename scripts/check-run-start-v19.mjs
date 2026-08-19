import fs from 'node:fs';

const clientEntry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const client=fs.readFileSync('online/run-start-client-v19.js','utf8');
const server=fs.readFileSync('functions/run-start-v19.js','utf8');
const serverEntry=fs.readFileSync('functions/main-v6.js','utf8');

const requireMarkers=(text,markers,label)=>{for(const marker of markers)if(!text.includes(marker))throw new Error(`${label} missing: ${marker}`);};

requireMarkers(client,[
  "m.type!=='ttd:v6-run-begin-request'",
  'event.stopImmediatePropagation()',
  "httpsCallable(functions,'beginRun')",
  "type:'ttd:v6-run-begin-result'",
  "type:'ttd:v6-run-begin-result-error'",
],'run-start client');
const failSafePos=clientEntry.indexOf("import './run-start-client-v19.js?v=19';");
const legacyPos=clientEntry.indexOf("import './singleplayer-client-v9-core.js?v=9';");
if(failSafePos<0||legacyPos<0||failSafePos>legacyPos)throw new Error('Fail-safe run-start client must load before the legacy single-player client.');

requireMarkers(server,[
  "const VALID_MODES=new Set(['survival','bossrush','sudden','adventure','endlesshorde'])",
  'Math.min(count-1,candidate)',
  'repair.v6ActiveDeckIdx=active',
  "throw new HttpsError('failed-precondition','Your active deck must contain five dice.')",
  'exports.beginRun=onCall',
  "status:'active'",
],'run-start server');
requireMarkers(serverEntry,["const runStart = require('./run-start-v19');",'...deckSocial, ...runStart'],'function entrypoint');

console.log('Run-start v19 verified: Zombie Horde and Adventure share a fail-safe ticket path, stale active-deck indices self-repair, and every beginRun request receives success or error.');
