import fs from 'node:fs';
import vm from 'node:vm';

const read=(file)=>fs.readFileSync(file,'utf8');
const fail=(message)=>{ throw new Error(message); };

const game=read('random-dice-game-33.html');
const loader=read('online/game-loader.js');
const loaderHtml=read('online/game-loader.html');
const soulIconSvg=read('assets/soul-scimitar-spectral.svg');
const soulAttackSvg=read('assets/soul-saber-attack.svg');
const soulBridge=read('online/soul-scimitar-svg-v14.js');
const catalog=JSON.parse(read('dicefile.json'));
const generated=JSON.parse(read('functions/dicefile.generated.json'));
const manifest=JSON.parse(read('assets/game-assets.json'));

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
for(const file of bridges) new vm.Script(read(file),{filename:file});
new vm.Script(loader,{filename:'online/game-loader.js'});

// Stable contracts only. Never couple CI to a release label such as V14/V15.
for(const marker of ['data-mode="loader-v9"','__TTD_BUILD_TOKEN','__TTD_ASSET_URL','__TTD_GAME_ASSETS','/assets/game-assets.json',"cache:'no-store'"]){
  if(!loaderHtml.includes(marker)) fail(`Online loader is missing stable contract marker: ${marker}`);
}

if(catalog.schemaVersion!==1 || !catalog.dice?.soulscimitar || !catalog.dice?.slithervine) fail('Canonical dice catalog is incomplete.');
if(Object.keys(catalog.dice).length<37) fail('Canonical dice catalog unexpectedly lost legacy dice.');
if(JSON.stringify(generated.dice)!==JSON.stringify(catalog.dice)) fail('Generated Functions catalog is not synchronized with dicefile.json.');

for(const path of bridges){
  if(!loader.includes(`/${path}`)) fail(`Runtime loader does not inject ${path}.`);
}
for(const stale of ['interaction-fixes-v11.js','interaction-fixes-v12.js','soul-scimitar-art-v13.js']){
  if(loader.includes(stale)) fail(`Runtime loader still injects stale override ${stale}.`);
}
for(const marker of [
  'function installMobileDeckRuntime(source)',
  'ttdDiePointerActive',
  'card.setPointerCapture(ev.pointerId)',
  'transformed=installMobileDeckRuntime(transformed)',
]) if(!loader.includes(marker)) fail(`Mobile deck runtime is missing ${marker}.`);

const attack=manifest.assets?.soulSaberAttack;
if(!attack || attack.path!=='/assets/soul-saber-attack.svg') fail('Soul Saber attack asset contract is missing.');
if(attack.vectorOnly!==true) fail('Soul Saber attack asset must remain vectorOnly.');
if(attack.viewBox!=='0 0 1536 1536' || attack.width!==1536 || attack.height!==1536) fail('Soul Saber source geometry contract changed unexpectedly.');
if(JSON.stringify(attack.usage?.battle?.box)!=='[54,54]') fail('Soul Saber battle draw box must remain the original attack box; the artwork itself owns the requested two-thirds scale.');
if(Number(attack.usage?.battle?.artScale)!==0.66667) fail('Soul Saber artwork must remain at the requested two-thirds scale.');

for(const forbidden of ['<image','data:image/','<foreignObject']){
  if(soulAttackSvg.includes(forbidden)) fail(`Soul Saber vector asset contains forbidden raster/embed content: ${forbidden}`);
}
for(const required of [
  '<path',
  'viewBox="0 0 1536 1536"',
  'id="weaponOutline"',
  'id="weapon-shape"',
  'filter="url(#weaponOutline)"',
  'scale(.66667)',
]) if(!soulAttackSvg.includes(required)) fail(`Soul Saber vector asset is missing ${required}.`);

if(!soulIconSvg.includes('viewBox="0 0 128 128"') || !soulIconSvg.includes('#FAE4D5')) fail('Soul Saber collection/shop icon changed unexpectedly.');
for(const marker of [
  'window.__TTD_GAME_ASSETS?.soulScimitar',
  'window.__TTD_GAME_ASSETS?.soulSaberAttack',
  'window.__TTD_ASSET_URL(__ttdSoulAttackAsset.path)',
  'drawGhostScimitarExactSvg',
  'ctx.drawImage(__ttdSoulSaberAttackImage',
]) if(!soulBridge.includes(marker)) fail(`Soul Saber runtime bridge is missing ${marker}.`);
if(soulBridge.includes('Path2D(')) fail('Soul Saber registered artwork may not be approximated with Path2D.');

// Verify the source anchors the loader still patches actually exist.
for(const needle of [
  '  const DICE = {',
  '  const DICE_KEYS = Object.keys(DICE);',
  '    switch(sp.kind){',
  '    state.time += dt;',
  'drawLane(dt);',
  '  function attachInstanceCardEvents(card, key, instId){',
  '  function beginInstDrag(card, key, x, y){',
]) if(!game.includes(needle)) fail(`Legacy game source no longer contains required loader anchor: ${needle}`);

console.log(`Online runtime verified with ${Object.keys(catalog.dice).length} canonical dice and a true-vector Soul Saber attack asset.`);
