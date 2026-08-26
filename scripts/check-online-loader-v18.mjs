import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync('random-dice-game-33.html','utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
const loader=fs.readFileSync('online/game-loader.js','utf8');
const runtime=fs.readFileSync('online/runtime-bridge-loader-v1.js','utf8');
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
  '/online/game-bridge-inner.js?v=4','/online/progression-bridge-v5.js?v=5','/online/singleplayer-bridge-v6.js?v=6',
  '/online/merge-bridge-v6.js?v=6','/online/run-ui-bridge-v21.js?v=21','/online/refresh-bridge-v6.js?v=6',
  '/online/mobile-input-bridge-v9.js?v=9','/online/interaction-effects-v10.js?v=10','/online/collection-portrait-fit-v16.js?v=16',
  '/online/deck-editor-v18.js?v=18','/online/avatar-inventory-v22.js?v=22',
];
for(const url of expectedUrls)must(runtime.includes(url),`native runtime bridge order is missing ${url}.`);
for(const marker of [
  "link.rel='preload'","link.as='script'",'script.async=false',"window.addEventListener('error',onRuntimeError,true)",
  "event.preventDefault?.()",'failed without blocking later bridges.','bridge-load-error','bridge-runtime-error',
  "if(i===0)installCatalogBattleHooks()","else if(i===2)installSlitherBattleHooks()",'window.__TTD_MARK_BRIDGES_READY?.()',
])must(runtime.includes(marker),`native bridge isolation/order contract missing: ${marker}`);
for(const name of ['fireMagmaForce','updateMagmaForce','drawMagmaForceGround','drawMagmaForceOverlay','fireSoulScimitar','updateSoulScimitars','drawSoulScimitars','fireSlitherVine','updateSlitherVines','drawSlitherVines']){
  must(runtime.includes(`'${name}'`),`battle hook publication missing: ${name}`);
}
must(!/\beval\s*\(|new\s+Function\b|Function\s*\(/.test(runtime),'Native runtime bridge loader may not evaluate bridge source text.');

for(const marker of [
  'TTD_NATIVE_LOADER_TRANSFORMS_V1','TTD_NATIVE_DICEFILE_V1','TTD_NATIVE_BRIDGE_API_V1',
  'const __TTD_BATTLE_HOOKS = window.__TTD_BATTLE_HOOKS = {',
  'window.__TTD_CORE_API_V1=Object.freeze(__ttdCoreApi);',
  'window.__TTD_BRIDGES_READY=new Promise',
  'window.__TTD_MARK_BRIDGES_READY=',
  "window.__TTD_ASSET_URL('/online/runtime-bridge-loader-v1.js')",
  "await window.__TTD_BRIDGES_READY;",
  'const DICE = __TTD_DICEFILE.dice;',
  'TTD_MOBILE_DECK_RUNTIME_V14',
])must(game.includes(marker),`native bridge/core source contract missing: ${marker}`);

const readOnly=['ADVENTURES','DICE','DICE_LORE','ENCHANT_CARDS','GLYPHS','JEWEL_DEFS','MAX_JEWEL_TIER','PU_COSTS','__TTD_DICEFILE','aliveEnemies','applySilence','applySlow','beginDrag','beginInstDrag','buildBoardDOM','buildPath','cardSVG','chestSVG','classMultFor','classMultFromLevel','createHoldSpinner','ctx','cw','damageEnemy','deckEntryKey','dieJewelBonus','effAffinities','effAtk','effDmg','enchantTarget','endDrag','endInstDrag','enemyElementalMult','enemyRenderPos','findInstance','fx','gemSVG','getActiveDeck','getBonusChestChance','getKeyCount','healDie','hideEnchantAttempt','hideItemDetail','hideJewelPicker','highlightDrop','isFavoriteInstance','jewelDisplayName','jewelEffectText','jewelTierValue','keySVG','loop','modeLabel','moveGhost','moveInstGhost','pathPts','pickTarget','playEnchantAnimation','quickEquip','renderCollectionGrid','renderEnchantScreen','renderGachaTop','renderHome','renderItemDetailView','renderOptionsScreen','renderPullCard','renderShopScreen','showDieDetail','showNotice','slottedClassOf','startLift','state','statusResistDuration','statusRoll','teardownHold','tileEls','toast','toastGlobal','triggerTilePulse'];
const writable=['account','attachInstanceCardEvents','attachTileEvents','campaignComplete','currentAttackerDieKey','dieDamage','drag','drawLane','endEndlessHorde','endMatch','instDrag','invActiveTab','isAsclepiusReady','lastT','mergeInstances','openEnchantAttempt','openJewelPicker','playClassUpAnimation','renderBoard','renderDeckScreen','renderGlyph','renderInventoryScreen','saveAccount','shopItemView','showBuyConfirm','showItemDetail','showScreen','showSellConfirm','startAdventure','startAdventureCampaign','startEndlessHorde','startGame','tapTile','tickTile','triggerAsclepiusHeal','tryMergeAtPoint','updatePlayerShots'];
for(const name of readOnly)must(game.includes(`__ttdExposeCore('${name}',()=>${name});`),`read-only compatibility binding missing: ${name}`);
for(const name of writable)must(game.includes(`__ttdExposeCore('${name}',()=>${name},(value)=>{${name}=value;});`),`writable compatibility binding missing: ${name}`);
must(!game.includes("__ttdExposeCore('renderCollection'"),'obsolete renderCollection must remain an intentionally absent optional legacy symbol.');

for(const marker of ['data-mode="loader-v9"','name="ttd-build" content="release-integrity-v15"','__TTD_BUILD_TOKEN','__TTD_ASSET_URL','__TTD_GAME_ASSETS',"cache:'no-store'",'/assets/game-assets.json',"window.__TTD_ASSET_URL('/online/game-loader.js')"]){
  must(loaderHtml.includes(marker),`loader HTML freshness/asset contract missing: ${marker}`);
}

console.log('Loader v18 native bridge runtime verified: the game source exposes a bounded live compatibility facade, bridges execute as ordinary sequential scripts with failure isolation, battle hooks attach to a stable registry, and online/game-loader.js no longer reconstructs or injects runtime source.');
