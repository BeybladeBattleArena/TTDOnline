import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync('random-dice-game-33.html','utf8');
const loader=fs.readFileSync('online/game-loader.js','utf8');
if(!loader.includes('const isolatedSources=sources.slice(3).map') || !loader.includes('failed without blocking later bridges.')) throw new Error('Non-combat online bridges are not runtime-isolated; one bridge could block later bridges such as Deck Editor.');
const isolationStart=loader.indexOf('const isolatedSources=sources.slice(3).map');
const isolationBlock=loader.slice(isolationStart,loader.indexOf('const battleHookSubsystem=',isolationStart));
if(isolationBlock.includes("send('ttd:bridge-phase'")) throw new Error('Bridge runtime isolation incorrectly depends on loader-scope send() after document.write.');
if(!isolationBlock.includes('window.parent?.postMessage')) throw new Error('Bridge runtime isolation does not use document-scope-safe error reporting.');
if(!loader.includes('TTD_BATTLE_HOOK_SCOPE_V20') || !loader.includes('__TTD_BATTLE_HOOKS.updateSoulScimitars(dt)') || !loader.includes('__TTD_BATTLE_HOOKS.updateSlitherVines(dt)')) throw new Error('Catalog combat hooks are not exported safely to the transformed first-frame battle loop.');
for(const marker of ["case 'magmaForce'",'__TTD_BATTLE_HOOKS.updateMagmaForce(dt)','drawMagmaForceGround','drawMagmaForceOverlay','fireMagmaForce,updateMagmaForce']) if(!loader.includes(marker)) throw new Error(`Magma Force loader hook missing: ${marker}`);

const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');
const mobileBridge=fs.readFileSync('online/mobile-input-bridge-v9.js','utf8');
const portraitBridge=fs.readFileSync('online/collection-portrait-fit-v16.js','utf8');
const soulIconSvg=fs.readFileSync('assets/soul-scimitar-spectral.svg','utf8');
const soulAttackSvg=fs.readFileSync('assets/soul-saber-attack.svg','utf8');
const soulBridge=fs.readFileSync('online/soul-scimitar-svg-v14.js','utf8');
const assetManifest=JSON.parse(fs.readFileSync('assets/game-assets.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('dicefile.json','utf8'));

const bridges=[
  'online/dice-catalog-bridge-v8.js',
  'online/soul-scimitar-svg-v14.js',
  'online/slither-vine-bridge-v8.js',
  'online/game-bridge-inner.js',
  'online/progression-bridge-v5.js',
  'online/singleplayer-bridge-v6.js',
  'online/merge-bridge-v6.js',
  'online/run-ui-bridge-v21.js',
  'online/refresh-bridge-v6.js',
  'online/mobile-input-bridge-v9.js',
  'online/interaction-effects-v10.js',
  'online/collection-portrait-fit-v16.js',
];
for(const file of bridges) new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
new vm.Script(loader,{filename:'online/game-loader.js'});

if(!loaderHtml.includes('data-mode="loader-v9"')) throw new Error('Loader contract marker must remain loader-v9.');
if(!loaderHtml.includes('name="ttd-build" content="release-integrity-v15"')) throw new Error('Loader HTML is not marked release-integrity-v15.');
for(const marker of ['__TTD_BUILD_TOKEN','__TTD_ASSET_URL','__TTD_GAME_ASSETS',"cache:'no-store'","/assets/game-assets.json","window.__TTD_ASSET_URL('/online/game-loader.js')"]){
  if(!loaderHtml.includes(marker)) throw new Error(`Loader freshness/asset protection missing: ${marker}`);
}
for(const marker of ['ensureCollectionAuthority','ttdCollectionAuthorityScript',"window.__TTD_ASSET_URL('/online/collection-portrait-fit-v16.js')",'collectionAuthorityAttempts<200']){
  if(!loaderHtml.includes(marker)) throw new Error(`Post-load Collection authority fallback missing: ${marker}`);
}
if(!loader.includes("const GAME_PATH='/random-dice-game-33.html?v=34'")) throw new Error('Base runtime source contract changed unexpectedly.');

const expectedUrls=[
  '/online/dice-catalog-bridge-v8.js?v=8',
  '/online/soul-scimitar-svg-v14.js?v=14',
  '/online/slither-vine-bridge-v8.js?v=8',
  '/online/game-bridge-inner.js?v=4',
  '/online/progression-bridge-v5.js?v=5',
  '/online/singleplayer-bridge-v6.js?v=6',
  '/online/merge-bridge-v6.js?v=6',
  '/online/run-ui-bridge-v21.js?v=21',
  '/online/refresh-bridge-v6.js?v=6',
  '/online/mobile-input-bridge-v9.js?v=9',
  '/online/interaction-effects-v10.js?v=10',
  '/online/collection-portrait-fit-v16.js?v=16',
];
for(const url of expectedUrls) if(!loader.includes(url)) throw new Error(`Missing runtime bridge ${url}.`);
for(const stale of ['interaction-fixes-v11.js','interaction-fixes-v12.js','soul-scimitar-art-v13.js']){
  if(loader.includes(stale)) throw new Error(`Stale competing override is still injected: ${stale}.`);
}
if(loader.indexOf('/online/collection-portrait-fit-v16.js?v=16') < loader.indexOf('/online/interaction-effects-v10.js?v=10')){
  throw new Error('Synchronous portrait authority must remain after interaction-effects-v10.');
}

for(const marker of [
  'function installMobileDeckRuntime(source)',
  'TTD_MOBILE_DECK_RUNTIME_V14',
  'grid-template-rows:auto auto auto auto minmax(0,1fr) auto',
  'min-height:0; overflow-y:auto',
  'ttdDiePointerActive',
  'const LIFT_MS = 360',
  'const INFO_MS = 1100',
  'card.setPointerCapture(ev.pointerId)',
  'transformed=installMobileDeckRuntime(transformed)',
]) if(!loader.includes(marker)) throw new Error(`Missing mobile deck runtime marker: ${marker}`);

for(const marker of [
  '#collectionViewport{',
  'grid-template-columns:minmax(0,1fr) 34px',
  'grid-template-columns:repeat(3,minmax(0,1fr))',
  'grid-auto-rows:calc((100% - 20px)/3)',
  'overflow:hidden!important',
  'touch-action:none!important',
  '#collectionScrollSlider{writing-mode:vertical-lr',
  '#deckFooter{grid-row:6',
  'function installCollectionSlider(grid)',
  "slider.addEventListener('input'",
  'grid.scrollTop = max * ((Number(slider.value) || 0) / 1000)',
  "grid.addEventListener('wheel', (event) => event.preventDefault(), {passive:false})",
  "grid.addEventListener('touchmove', (event) => event.preventDefault(), {passive:false})",
  'if (sliderOwnsScroll)',
  'grid.scrollTop = lastAllowedScrollTop',
  'installCollectionSlider(collectionGrid)',
]) if(!mobileBridge.includes(marker)) throw new Error(`Missing base 3x3 slider-only collection marker: ${marker}`);
if(/#collectionGrid\{[^}]*overflow-y\s*:\s*auto/i.test(mobileBridge)) throw new Error('Mobile bridge may not re-enable direct collection scrolling.');

for(const marker of [
  '__TTD_COLLECTION_PANEL_AUTHORITY_V18',
  '#deckScreen.active{',
  'grid-template-rows:auto auto auto minmax(0,1fr)',
  '#ttdCollectionPanel{',
  'grid-template-rows:auto minmax(0,1fr) auto',
  'grid-template-columns:repeat(4,minmax(0,1fr))',
  'grid-auto-rows:80px',
  '#collectionScrollRail{',
  '#ttdCollectionVisibleTrack{',
  '#ttdCollectionVisibleThumb{',
  '#ttdCollectionPanel #deckFooter{',
  '#ttdCollectionPanel #saveDeckBtn{',
  "save.textContent='Save Deck'",
  "panel.appendChild(tools)",
  "panel.appendChild(viewport)",
  "panel.appendChild(footer)",
  'attachInstanceCardEvents=function attachInstanceCardEventsV18',
  'dragState.lastDist>MOVE_THRESHOLD',
  'beginInstDrag(card,key,dragState.lastX,dragState.lastY)',
  'showDieDetail(key,{collectionInstId:instId})',
  "grid.addEventListener('wheel',e=>e.preventDefault(),{passive:false})",
  "grid.addEventListener('touchmove',e=>e.preventDefault(),{passive:false})",
  "slider.dispatchEvent(new Event('input',{bubbles:true}))",
  'assertPanel',
  'setTimeout(retry,0)',
]) if(!portraitBridge.includes(marker)) throw new Error(`Missing unified Collection panel authority marker: ${marker}`);
if(/grid-template-columns:repeat\(3[^)]*\)/.test(portraitBridge)) throw new Error('Final Collection panel must render four dice across, not three.');
if(/--ttd-card-h|min\(76px,calc\(\(100%/.test(portraitBridge)) throw new Error('Collection card height may not depend on percentage viewport math; cards must keep a stable small height.');
if(/dragState\.scrolling|scrollHost\?\.scrollTop|startScroll-dy/.test(portraitBridge)) throw new Error('Collection die gestures may not implement scrolling; the visible rail is the only scroll control.');

for(const needle of [
  '  /* ---------- DECK ---------- */\n  .deckTabs{',
  '  #collectionGrid{flex:1; padding:12px; display:grid; grid-template-columns:repeat(4,1fr); gap:10px; align-content:start;}',
  '    background:var(--ink-850); border:1px solid var(--ink-700); position:relative; touch-action:pan-y;}',
  '  const LIFT_MS = 1000;',
  '  function attachInstanceCardEvents(card, key, instId){',
  '  function beginInstDrag(card, key, x, y){',
]) if(!game.includes(needle)) throw new Error(`v33 no longer contains loader replacement needle: ${needle}`);

const match=loader.match(/const replacement=`([\s\S]*?)`;\n    source=replaceSection/);
if(!match) throw new Error('Could not locate V14 collection pointer replacement.');
new vm.Script(match[1].replace(/\\n/g,'\n'),{filename:'inserted-mobile-deck-v14.js'});

if(!catalog.dice?.soulscimitar || catalog.dice.soulscimitar.special?.kind!=='soulScimitar') throw new Error('Soul Saber catalog definition is missing.');
const iconContract=assetManifest.assets?.soulScimitar;
const attackContract=assetManifest.assets?.soulSaberAttack;
if(!iconContract || iconContract.path!=='/assets/soul-scimitar-spectral.svg') throw new Error('Soul Saber icon asset manifest entry is missing.');
if(!attackContract || attackContract.path!=='/assets/soul-saber-attack.svg') throw new Error('Soul Saber attack asset manifest entry is missing.');
if(JSON.stringify(attackContract.usage?.battle?.box)!=='[49,49]') throw new Error('Soul Saber attack size is not the approved two-thirds visual scale.');
if(!soulIconSvg.includes('viewBox="0 0 128 128"') || !soulIconSvg.includes('#FAE4D5')) throw new Error('Existing Soul Saber icon asset changed unexpectedly.');
if(!soulAttackSvg.includes('viewBox="0 0 128 128"')) throw new Error('Soul Saber attack SVG lost its 128×128 viewBox.');
if(/<image\b|data:image/i.test(soulAttackSvg)) throw new Error('Soul Saber attack SVG must remain pure vector and may not embed raster artwork.');
if((soulAttackSvg.match(/<path\b/g)||[]).length<20) throw new Error('Soul Saber attack SVG lost expected vector detail.');
for(const marker of [
  'window.__TTD_GAME_ASSETS?.soulScimitar',
  'window.__TTD_GAME_ASSETS?.soulSaberAttack',
  'window.__TTD_ASSET_URL(__ttdSoulIconAsset.path)',
  'window.__TTD_ASSET_URL(__ttdSoulAttackAsset.path)',
  '__ttdSoulSaberAttackImage.src = __TTD_SOUL_ATTACK_URL',
  'renderGlyphWithExactSoulScimitar',
  'drawGhostScimitarExactSvg',
  'const [drawW,drawH]=__ttdSoulBattle.box',
  'ctx.drawImage(__ttdSoulSaberAttackImage,-drawW*anchorX,-drawH*anchorY,drawW,drawH)',
]) if(!soulBridge.includes(marker)) throw new Error(`Soul Saber asset bridge is missing ${marker}.`);
if(soulBridge.includes('Path2D(')) throw new Error('Soul Saber must use registered artwork, not a traced Path2D recreation.');
if(/data:image|embedded raster|svgText\.match|URL\.createObjectURL/i.test(soulBridge)) throw new Error('Soul Saber runtime may not silently unwrap raster-wrapped SVGs.');

console.log('V15 runtime verified: Search, Collection viewport, and Save Deck form one bounded portrait panel; four small dice fit across; the visible rail is the only scroll control; hold opens info and drag remains available for merges.');