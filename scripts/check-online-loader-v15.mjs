import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync('random-dice-game-33.html','utf8');
const loader=fs.readFileSync('online/game-loader.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');
const soulIconSvg=fs.readFileSync('assets/soul-scimitar-spectral.svg','utf8');
const soulAttackSvg=fs.readFileSync('assets/soul-saber-attack.svg','utf8');
const soulBridge=fs.readFileSync('online/soul-scimitar-svg-v14.js','utf8');
const assetManifest=JSON.parse(fs.readFileSync('assets/game-assets.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('dicefile.json','utf8'));

const bridges=[
  'online/dice-catalog-bridge-v7.js',
  'online/soul-scimitar-svg-v14.js',
  'online/slither-vine-bridge-v8.js',
  'online/game-bridge-inner.js',
  'online/progression-bridge-v5.js',
  'online/singleplayer-bridge-v6.js',
  'online/merge-bridge-v6.js',
  'online/run-ui-bridge-v6.js',
  'online/refresh-bridge-v6.js',
  'online/mobile-input-bridge-v9.js',
  'online/interaction-effects-v10.js',
];
for(const file of bridges) new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
new vm.Script(loader,{filename:'online/game-loader.js'});

if(!loaderHtml.includes('data-mode="loader-v9"')) throw new Error('Loader contract marker must remain loader-v9.');
if(!loaderHtml.includes('name="ttd-build" content="release-integrity-v15"')) throw new Error('Loader HTML is not marked release-integrity-v15.');
for(const marker of ['__TTD_BUILD_TOKEN','__TTD_ASSET_URL','__TTD_GAME_ASSETS',"cache:'no-store'","/assets/game-assets.json","window.__TTD_ASSET_URL('/online/game-loader.js')"]){
  if(!loaderHtml.includes(marker)) throw new Error(`Loader freshness/asset protection missing: ${marker}`);
}
if(!loader.includes("const GAME_PATH='/random-dice-game-33.html?v=34'")) throw new Error('Base runtime source contract changed unexpectedly.');

const expectedUrls=[
  '/online/dice-catalog-bridge-v7.js?v=7',
  '/online/soul-scimitar-svg-v14.js?v=14',
  '/online/slither-vine-bridge-v8.js?v=8',
  '/online/game-bridge-inner.js?v=4',
  '/online/progression-bridge-v5.js?v=5',
  '/online/singleplayer-bridge-v6.js?v=6',
  '/online/merge-bridge-v6.js?v=6',
  '/online/run-ui-bridge-v6.js?v=6',
  '/online/refresh-bridge-v6.js?v=6',
  '/online/mobile-input-bridge-v9.js?v=9',
  '/online/interaction-effects-v10.js?v=10',
];
for(const url of expectedUrls) if(!loader.includes(url)) throw new Error(`Missing runtime bridge ${url}.`);
for(const stale of ['interaction-fixes-v11.js','interaction-fixes-v12.js','soul-scimitar-art-v13.js']){
  if(loader.includes(stale)) throw new Error(`Stale competing override is still injected: ${stale}.`);
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
if(!soulAttackSvg.includes('viewBox="0 0 128 128"') || !soulAttackSvg.includes('data:image/png;base64,')) throw new Error('Outlined transparent Soul Saber attack SVG is missing its embedded exact artwork.');
for(const marker of [
  'window.__TTD_GAME_ASSETS?.soulScimitar',
  'window.__TTD_GAME_ASSETS?.soulSaberAttack',
  'window.__TTD_ASSET_URL(__ttdSoulIconAsset.path)',
  'window.__TTD_ASSET_URL(__ttdSoulAttackAsset.path)',
  'renderGlyphWithExactSoulScimitar',
  'drawGhostScimitarExactSvg',
  'const [drawW,drawH]=__ttdSoulBattle.box',
  'ctx.drawImage(__ttdSoulSaberAttackImage,-drawW*anchorX,-drawH*anchorY,drawW,drawH)',
]) if(!soulBridge.includes(marker)) throw new Error(`Soul Saber asset bridge is missing ${marker}.`);
if(soulBridge.includes('Path2D(')) throw new Error('Soul Saber must use registered artwork, not a traced Path2D recreation.');

console.log('V15 runtime verified: source transformation is intact, runtime loads are fresh, Soul Saber icon remains unchanged, and the outlined transparent attack asset is isolated at the approved two-thirds visual scale.');
