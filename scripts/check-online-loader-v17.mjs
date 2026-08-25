import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync('random-dice-game-33.html','utf8');
const nativeDiceMarker='TTD_NATIVE_DICEFILE_V1';
if(!game.includes(nativeDiceMarker)){
  await import('./check-online-loader-v16.mjs');
  console.log('Loader v17 transition check: dicefile is still installed by the validated v16 source replacement until the native data handoff is materialized.');
  process.exit(0);
}

const must=(condition,message)=>{if(!condition)throw new Error(message);};
const loader=fs.readFileSync('online/game-loader.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');
const portraitBridge=fs.readFileSync('online/collection-portrait-fit-v16.js','utf8');
const soulBridge=fs.readFileSync('online/soul-scimitar-svg-v14.js','utf8');
const assetManifest=JSON.parse(fs.readFileSync('assets/game-assets.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('dicefile.json','utf8'));
new vm.Script(loader,{filename:'online/game-loader.js'});

for(const marker of [
  "const GAME_PATH='/random-dice-game-33.html?v=35'",
  "const DICE_PATH='/dicefile.json?v=2'",
  'function validateCanonicalCatalog(catalog)',
  "catalog.dice.soulscimitar?.special?.kind!=='soulScimitar'",
  "catalog.dice.slithervine?.special?.kind!=='slitherVine'",
  "catalog.dice.magmaforce?.special?.kind!=='magmaForce'",
  'validateCanonicalCatalog(catalog);',
  'window.__TTD_DICEFILE=catalog;',
  'let transformed=gameHtml;',
])must(loader.includes(marker),`native dicefile handoff missing: ${marker}`);
for(const forbidden of [
  'function installCanonicalDice(',
  'const DICE_START=',
  'const DICE_KEYS=',
  'source.indexOf(DICE_START)',
  'JSON.stringify(catalog)',
  'let transformed=installCanonicalDice(gameHtml,catalog);',
  'function installCatalogHooks(',
  'function installMobileDeckRuntime(',
  'function replaceOnce(',
  'function replaceSection(',
])must(!loader.includes(forbidden),`retired runtime source replacement remains in loader: ${forbidden}`);

for(const marker of ['const isolatedSources=sources.slice(3).map','failed without blocking later bridges.','window.parent?.postMessage','TTD_BATTLE_HOOK_SCOPE_V20']){
  must(loader.includes(marker),`runtime bridge isolation/battle-scope contract missing: ${marker}`);
}
const expectedUrls=[
  '/online/dice-catalog-bridge-v8.js?v=8','/online/soul-scimitar-svg-v14.js?v=14','/online/slither-vine-bridge-v8.js?v=8',
  '/online/game-bridge-inner.js?v=4','/online/progression-bridge-v5.js?v=5','/online/singleplayer-bridge-v6.js?v=6',
  '/online/merge-bridge-v6.js?v=6','/online/run-ui-bridge-v21.js?v=21','/online/refresh-bridge-v6.js?v=6',
  '/online/mobile-input-bridge-v9.js?v=9','/online/interaction-effects-v10.js?v=10','/online/collection-portrait-fit-v16.js?v=16',
  '/online/deck-editor-v18.js?v=18','/online/avatar-inventory-v22.js?v=22',
];
for(const url of expectedUrls)must(loader.includes(url),`Missing runtime bridge ${url}.`);
for(const stale of ['interaction-fixes-v11.js','interaction-fixes-v12.js','soul-scimitar-art-v13.js'])must(!loader.includes(stale),`Stale competing override is still injected: ${stale}.`);

for(const marker of ['data-mode="loader-v9"','name="ttd-build" content="release-integrity-v15"','__TTD_BUILD_TOKEN','__TTD_ASSET_URL','__TTD_GAME_ASSETS',"cache:'no-store'",'/assets/game-assets.json',"window.__TTD_ASSET_URL('/online/game-loader.js')",'ensureCollectionAuthority','ttdCollectionAuthorityScript',"window.__TTD_ASSET_URL('/online/collection-portrait-fit-v16.js')",'collectionAuthorityAttempts<200']){
  must(loaderHtml.includes(marker),`loader HTML freshness/fallback contract missing: ${marker}`);
}

for(const marker of [
  'TTD_NATIVE_LOADER_TRANSFORMS_V1','TTD_NATIVE_DICEFILE_V1',
  'const __TTD_DICEFILE = window.__TTD_DICEFILE;',
  "throw new Error('Canonical dicefile.json was not preloaded before the game source executed.')",
  'const DICE = __TTD_DICEFILE.dice;','const DICE_KEYS = Object.keys(DICE);',
  'TTD_MOBILE_DECK_RUNTIME_V14',"case 'magmaForce'","case 'soulScimitar'","case 'slitherVine'",
  '__TTD_BATTLE_HOOKS.updateMagmaForce(dt)','__TTD_BATTLE_HOOKS.updateSoulScimitars(dt)','__TTD_BATTLE_HOOKS.updateSlitherVines(dt)',
  '__TTD_BATTLE_HOOKS.drawSlitherVines()','__TTD_BATTLE_HOOKS.drawSoulScimitars()','__TTD_BATTLE_HOOKS.drawMagmaForceOverlay()','__TTD_BATTLE_HOOKS.drawMagmaForceGround()',
  '!silenced && !e._slitherBlocked',"d.special?.kind==='magmaForce' ? 'Random battlefield areas'",
  'grid-template-rows:auto auto auto auto minmax(0,1fr) auto','min-height:0; overflow-y:auto','ttdDiePointerActive',
  'const LIFT_MS = 360','const INFO_MS = 1100','const MOVE_THRESHOLD = 8','card.setPointerCapture(ev.pointerId)',
  "card.addEventListener('pointermove',onMove,{passive:false})",'quickEquip(key,instId)','showDieDetail(key,{collectionInstId:instId})',
])must(game.includes(marker),`native game source lost required runtime marker: ${marker}`);
must(!game.includes('  const DICE = {'),'legacy embedded dice catalog still competes with dicefile.json.');
for(const staleNeedle of ['  const LIFT_MS = 1000;','  const INFO_MS = 1850;','position:relative; touch-action:pan-y;}'])must(!game.includes(staleNeedle),`pre-materialization mobile authority survived: ${staleNeedle}`);

for(const marker of ['__TTD_COLLECTION_PANEL_AUTHORITY_V18','grid-template-columns:repeat(4,minmax(0,1fr))','#ttdCollectionVisibleTrack{','#ttdCollectionVisibleThumb{','attachInstanceCardEvents=function attachInstanceCardEventsV18','showDieDetail(key,{collectionInstId:instId})',"grid.addEventListener('wheel',e=>e.preventDefault(),{passive:false})",'assertPanel'])must(portraitBridge.includes(marker),`final Collection authority marker missing: ${marker}`);
must(catalog.dice?.soulscimitar?.special?.kind==='soulScimitar','Soul Scimitar catalog definition is missing.');
const attackContract=assetManifest.assets?.soulSaberAttack;
must(attackContract?.path==='/assets/soul-saber-attack.svg','Soul Saber attack asset manifest entry is missing.');
must(JSON.stringify(attackContract?.usage?.battle?.box)==='[49,49]','Soul Saber attack size is not the approved visual scale.');
for(const marker of ['window.__TTD_GAME_ASSETS?.soulScimitar','window.__TTD_GAME_ASSETS?.soulSaberAttack','drawGhostScimitarExactSvg','ctx.drawImage(__ttdSoulSaberAttackImage'])must(soulBridge.includes(marker),`Soul Saber exact-art runtime contract missing: ${marker}`);

console.log('Loader v17 native runtime verified: dicefile.json is handed to the game as data with no DICE-block source replacement; catalog/mobile behavior is native source; cloud bridge lexical injection remains isolated for the next migration stage.');
