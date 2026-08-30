import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync('random-dice-game-33.html','utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
const loader=fs.readFileSync('online/game-loader.js','utf8');
const runtime=fs.readFileSync('online/runtime-bridge-loader-v1.js','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');
new vm.Script(loader,{filename:'online/game-loader.js'});
new vm.Script(runtime,{filename:'online/runtime-bridge-loader-v1.js'});

for(const marker of [
  "const GAME_PATH='/random-dice-game-33.html?v=35'",
  "const DICE_PATH='/dicefile.json?v=2'",
  'function validateCanonicalCatalog(catalog)',
  'validateCanonicalCatalog(catalog);',
  'window.__TTD_DICEFILE=catalog;',
  'document.write(gameHtml);',
])must(loader.includes(marker),`simple source loader contract missing: ${marker}`);
for(const forbidden of [
  'const BRIDGES=[','IIFE_END_MARKER','isolatedSources','battleHookSubsystem','sources.slice','catalogSource=sources','soulAssetSource=sources','slitherSource=sources',
  'transformed.slice','document.write(transformed)','loadText(BRIDGES','...BRIDGES.map',
  'function installCanonicalDice(','function installCatalogHooks(','function installMobileDeckRuntime(','function replaceOnce(','function replaceSection(',
])must(!loader.includes(forbidden),`runtime source assembly remains in online/game-loader.js: ${forbidden}`);

const expectedUrls=[
  '/online/dice-catalog-bridge-v8.js?v=8','/online/soul-scimitar-svg-v14.js?v=14','/online/slither-vine-bridge-v8.js?v=8',
  '/online/game-bridge-inner.js?v=5','/online/progression-bridge-v5.js?v=5','/online/singleplayer-bridge-v6.js?v=7',
  '/online/merge-bridge-v6.js?v=6','/online/run-ui-bridge-v21.js?v=21','/online/refresh-bridge-v6.js?v=6',
  '/online/mobile-input-bridge-v9.js?v=9','/online/interaction-effects-v10.js?v=10','/online/collection-portrait-fit-v16.js?v=16',
  '/online/deck-editor-v18.js?v=18','/online/item-assets-v1.js?v=4','/online/avatar-inventory-v22.js?v=22','/online/world-items-v1.js?v=1',
  '/online/moving-screen-neon-rooftops-v2.js?v=4','/online/moving-screen-construction-climb-v1.js?v=2','/online/moving-screen-engine-v5.js?v=1','/online/moving-screen-map-router-v2.js?v=2','/online/moving-screen-ui-v1.js?v=1','/online/moving-screen-die-input-v1.js?v=2','/online/moving-screen-topology-ui-v1.js?v=1','/online/moving-screen-construction-presentation-v1.js?v=2','/online/moving-screen-battle-hud-v1.js?v=2','/online/arcade-mode-shell-v2.js?v=4','/online/moving-screen-mobile-frame-v2.js?v=2','/online/singleplayer-run-controls-v1.js?v=2',
];
let lastRuntimeIndex=-1;
for(const url of expectedUrls){const index=runtime.indexOf(url);must(index>=0,`native runtime bridge order is missing ${url}.`);must(index>lastRuntimeIndex,`native runtime authority order regressed at ${url}.`);lastRuntimeIndex=index;}
for(const retired of ['/online/moving-screen-engine-v1.js?v=1','/online/moving-screen-engine-v2.js?v=2','/online/moving-screen-engine-v3.js?v=3','/online/moving-screen-engine-v4.js?v=8','/online/moving-screen-map-router-v1.js?v=2','/online/moving-screen-mobile-frame-v1.js?v=1'])must(!runtime.includes(retired),`retired Moving Screen runtime must not load beside v5: ${retired}`);
for(const stale of ['/online/moving-screen-neon-rooftops-v2.js?v=2','/online/moving-screen-neon-rooftops-v2.js?v=3'])must(!runtime.includes(stale),`Moving Screen topology release must not reuse stale stage cache key: ${stale}`);
for(const stale of ['/online/moving-screen-engine-v4.js?v=4','/online/moving-screen-engine-v4.js?v=5','/online/moving-screen-engine-v4.js?v=6','/online/moving-screen-engine-v4.js?v=7','/online/moving-screen-construction-climb-v1.js?v=1','/online/moving-screen-map-router-v1.js?v=1','/online/moving-screen-construction-presentation-v1.js?v=1'])must(!runtime.includes(stale),`Moving Screen interaction release must not reuse stale runtime: ${stale}`);
must(runtime.indexOf('/online/moving-screen-die-input-v1.js?v=2')<runtime.indexOf('/online/moving-screen-topology-ui-v1.js?v=1'),'Die gestures must capture a Die-origin gesture before route-swipe topology input.');
must(runtime.indexOf('/online/moving-screen-mobile-frame-v2.js?v=2')<runtime.indexOf('/online/singleplayer-run-controls-v1.js?v=2'),'Shared single-player run controls must load after Moving Screen frame presentation.');
must(!runtime.includes('/online/arcade-mode-shell-v2.js?v=2'),'Arcade submenu Back fix must not reuse the cached v2 query key.');
must(!runtime.includes('/online/arcade-mode-shell-v2.js?v=3'),'Construction Climb release must not reuse the previous Arcade shell cache key.');
must(!runtime.includes('/online/arcade-mode-shell-v1.js?v=1'),'Broken Arcade shell v1 must not remain in the production runtime.');
for(const marker of [
  "link.rel='preload'","link.as='script'",'script.async=false',"window.addEventListener('error',onRuntimeError,true)",
  "event.preventDefault?.()",'failed without blocking later bridges.','bridge-load-error','bridge-runtime-error',
  "if(i===0)installCatalogBattleHooks()","else if(i===2)installSlitherBattleHooks()",
  'await window.__TTD_RUN_UI_EXTENSIONS_READY;','window.__TTD_MARK_BRIDGES_READY?.()',
])must(runtime.includes(marker),`native bridge isolation/order/readiness contract missing: ${marker}`);
for(const marker of ['TTD_RUN_UI_EXTENSIONS_READY_V1','window.__TTD_RUN_UI_EXTENSIONS_READY=loadAdventurePlatformingV2();'])must(runUi.includes(marker),`run-ui nested readiness contract missing: ${marker}`);
for(const name of ['fireMagmaForce','updateMagmaForce','drawMagmaForceGround','drawMagmaForceOverlay','fireSoulScimitar','updateSoulScimitars','drawSoulScimitars','fireSlitherVine','updateSlitherVines','drawSlitherVines'])must(runtime.includes(`'${name}'`),`battle hook publication missing: ${name}`);
must(!/\beval\s*\(|new\s+Function\b|Function\s*\(/.test(runtime),'Native runtime bridge loader may not evaluate bridge source text.');

for(const marker of [
  'TTD_NATIVE_LOADER_TRANSFORMS_V1','TTD_NATIVE_DICEFILE_V1','TTD_NATIVE_BRIDGE_API_V1',
  'const __TTD_BATTLE_HOOKS = window.__TTD_BATTLE_HOOKS = {','window.__TTD_CORE_API_V1=Object.freeze(__ttdCoreApi);',
  'window.__TTD_BRIDGES_READY=new Promise','window.__TTD_MARK_BRIDGES_READY=',"window.__TTD_ASSET_URL('/online/runtime-bridge-loader-v1.js')",
  "await window.__TTD_BRIDGES_READY;",'const DICE = __TTD_DICEFILE.dice;','TTD_MOBILE_DECK_RUNTIME_V14',
])must(game.includes(marker),`native bridge/core source contract missing: ${marker}`);

const readOnly=['ADVENTURES','DICE','DICE_LORE','ENCHANT_CARDS','GLYPHS','JEWEL_DEFS','MAX_JEWEL_TIER','PU_COSTS','__TTD_DICEFILE','aliveEnemies','applySilence','applySlow','beginDrag','beginInstDrag','buildAdventureWave','cardSVG','ch','classMultFor','classMultFromLevel','createHoldSpinner','ctx','cw','damageEnemy','deckEntryKey','dieJewelBonus','effAffinities','effAtk','effDmg','effHp','enchantTarget','endDrag','endInstDrag','enemyElementalMult','findInstance','fx','gemSVG','getActiveDeck','getBonusChestChance','getKeyCount','healDie','hideEnchantAttempt','hideItemDetail','hideJewelPicker','highlightDrop','isFavoriteInstance','jewelDisplayName','jewelEffectText','jewelTierValue','loop','modeLabel','moveGhost','moveInstGhost','pickTarget','posAtDistance','quickEquip','renderAdventureList','renderCollectionGrid','renderDeckTray','renderEnchantScreen','renderGachaTop','renderHome','renderHUD','renderItemDetailView','renderOptionsScreen','renderPullCard','renderShopScreen','resizeCanvas','selectedAdventureId','selectedDifficulty','shopActiveSub','shopActiveTab','showDieDetail','showNotice','slottedClassOf','startLift','state','statusResistDuration','statusRoll','STAGE_THEMES','teardownHold','tileEls','toast','toastGlobal','triggerTilePulse'];
const writable=['account','attachInstanceCardEvents','attachTileEvents','buildPath','campaignComplete','chestSVG','currentAttackerDieKey','dieDamage','drag','drawLane','endEndlessHorde','endMatch','enemyRenderPos','instDrag','invActiveTab','isAsclepiusReady','keySVG','lastT','mergeInstances','openEnchantAttempt','openInventoryItemDetail','openJewelPicker','pathPts','playClassUpAnimation','renderBoard','renderDeckScreen','renderGlyph','renderInventoryScreen','renderShopGrid','renderStageScreen','saveAccount','segLens','shopItemView','showBuyConfirm','showItemDetail','showScreen','showSellConfirm','showZombieSummary','startAdventure','startAdventureCampaign','startEndlessHorde','startGame','tapTile','tickTile','totalLen','towerPos','triggerAsclepiusHeal','tryMergeAtPoint','updatePlayerShots','updateSpawns'];
for(const name of readOnly)must(game.includes(`__ttdExposeCore('${name}',()=>${name});`),`read-only compatibility binding missing: ${name}`);
for(const name of writable)must(game.includes(`__ttdExposeCore('${name}',()=>${name},(value)=>{${name}=value;});`),`writable compatibility binding missing: ${name}`);
must(!game.includes("__ttdExposeCore('renderCollection'"),'obsolete renderCollection must remain an intentionally absent optional legacy symbol.');

for(const marker of ['data-mode="loader-v9"','name="ttd-build" content="release-integrity-v15"','__TTD_BUILD_TOKEN','__TTD_ASSET_URL','__TTD_GAME_ASSETS',"cache:'no-store'",'/assets/game-assets.json',"window.__TTD_ASSET_URL('/online/game-loader.js')"])must(loaderHtml.includes(marker),`loader HTML freshness/asset contract missing: ${marker}`);

console.log('Loader recovery contract verified: Moving Screen v5 loads staged maps -> select/power/merge engine -> delayed loading router -> route UI -> Die-first gesture priority -> topology -> map art -> bottom deck/OD HUD -> Arcade shell -> single title frame -> unified End Run without runtime source rewriting.');