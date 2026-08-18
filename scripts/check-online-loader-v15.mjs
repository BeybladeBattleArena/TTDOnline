import fs from 'node:fs';
import vm from 'node:vm';

const game=fs.readFileSync('random-dice-game-33.html','utf8');
const loader=fs.readFileSync('online/game-loader.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');
const soulSvg=fs.readFileSync('assets/soul-scimitar-spectral.svg','utf8');
const soulBridge=fs.readFileSync('online/soul-scimitar-svg-v14.js','utf8');
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
for(const marker of ['__TTD_BUILD_TOKEN','__TTD_ASSET_URL',"cache:'no-store'","window.__TTD_ASSET_URL('/online/game-loader.js')"]){
  if(!loaderHtml.includes(marker)) throw new Error(`Loader freshness protection missing: ${marker}`);
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

if(!catalog.dice?.soulscimitar || catalog.dice.soulscimitar.special?.kind!=='soulScimitar') throw new Error('Soul Scimitar catalog definition is missing.');
if(!soulSvg.includes('viewBox="0 0 128 128"') || !soulSvg.includes('#FAE4D5') || !soulSvg.includes('fill-opacity=".64"')){
  throw new Error('Approved Soul Scimitar SVG no longer has the expected spectral blade artwork.');
}
for(const marker of [
  "__TTD_ASSET_URL('/assets/soul-scimitar-spectral.svg')",
  'renderGlyphWithExactSoulScimitar',
  'drawGhostScimitarExactSvg',
  'ctx.drawImage(__ttdSoulScimitarImage',
]) if(!soulBridge.includes(marker)) throw new Error(`Exact Soul Scimitar SVG bridge is missing ${marker}.`);
if(soulBridge.includes('Path2D(')) throw new Error('Soul Scimitar must use the approved SVG, not a traced Path2D recreation.');

console.log('V15 runtime verified: source transformation is intact, runtime loads are freshness-protected, and Soul Scimitar uses the canonical SVG asset path.');
