import fs from 'node:fs';
import vm from 'node:vm';

const gameHtml=fs.readFileSync('random-dice-game-33.html','utf8');
const loader=fs.readFileSync('online/game-loader.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');
const catalog=JSON.parse(fs.readFileSync('dicefile.json','utf8'));
const generated=JSON.parse(fs.readFileSync('functions/dicefile.generated.json','utf8'));

const bridges=[
  'online/dice-catalog-bridge-v7.js',
  'online/game-bridge-inner.js',
  'online/progression-bridge-v5.js',
  'online/singleplayer-bridge-v6.js',
  'online/merge-bridge-v6.js',
  'online/run-ui-bridge-v6.js',
  'online/refresh-bridge-v6.js',
];

for(const path of bridges) new vm.Script(fs.readFileSync(path,'utf8'),{filename:path});
new vm.Script(loader,{filename:'online/game-loader.js'});

if(!loaderHtml.includes('data-mode="loader-v7"')) throw new Error('Online loader HTML is not marked loader-v7.');
if(!loaderHtml.includes('/online/game-loader.js?v=7')) throw new Error('Online loader HTML is not pinned to v7.');
if(catalog.schemaVersion!==1 || !catalog.dice || !catalog.dice.soulscimitar) throw new Error('dicefile.json is missing the v1 Soul Scimitar catalog.');
if(Object.keys(catalog.dice).length<36) throw new Error('dicefile.json unexpectedly lost legacy dice definitions.');
if(JSON.stringify(generated.dice)!==JSON.stringify(catalog.dice)) throw new Error('functions/dicefile.generated.json is not synchronized with dicefile.json.');

const expectedBridgeUrls=[
  '/online/dice-catalog-bridge-v7.js?v=7',
  '/online/game-bridge-inner.js?v=4',
  '/online/progression-bridge-v5.js?v=5',
  '/online/singleplayer-bridge-v6.js?v=6',
  '/online/merge-bridge-v6.js?v=6',
  '/online/run-ui-bridge-v6.js?v=6',
  '/online/refresh-bridge-v6.js?v=6',
];
for(const url of expectedBridgeUrls) if(!loader.includes(url)) throw new Error(`Loader does not include ${url}.`);
if(!loader.includes("const DICE_PATH='/dicefile.json?v=1'")) throw new Error('Loader is not fetching the canonical dicefile.');

const DICE_START='  const DICE = {';
const DICE_KEYS='  const DICE_KEYS = Object.keys(DICE);';
const start=gameHtml.indexOf(DICE_START);
const keys=gameHtml.indexOf(DICE_KEYS,start);
if(start<0||keys<0) throw new Error('Could not locate the legacy DICE block.');

const safeLiteral=JSON.stringify(catalog).replace(/</g,'\\u003c');
let transformed=gameHtml.slice(0,start)
  +`  /* Canonical runtime catalog: /dicefile.json */\n  const __TTD_DICEFILE = ${safeLiteral};\n  const DICE = __TTD_DICEFILE.dice;\n`
  +gameHtml.slice(keys);

const switchNeedle='    switch(sp.kind){';
const switchAt=transformed.indexOf(switchNeedle);
if(switchAt<0) throw new Error('Could not locate the die skill switch.');
const switchReplacement=`${switchNeedle}\n      case 'soulScimitar': {\n        fireSoulScimitar(idx, die, d, dmg, dieAff, potencyBonus, isCrit);\n        break;\n      }`;
transformed=transformed.slice(0,switchAt)+switchReplacement+transformed.slice(switchAt+switchNeedle.length);

const timeNeedle='    state.time += dt;';
const timeAt=transformed.indexOf(timeNeedle);
if(timeAt<0) throw new Error('Could not locate main battle loop time step.');
transformed=transformed.slice(0,timeAt)+`${timeNeedle}\n    updateSoulScimitars(dt);`+transformed.slice(timeAt+timeNeedle.length);

if(!transformed.includes('drawLane(dt);')) throw new Error('Could not locate canvas draw calls.');
transformed=transformed.split('drawLane(dt);').join('drawLane(dt); drawSoulScimitars();');

const marker='\n})();\n</script>';
const idx=transformed.lastIndexOf(marker);
if(idx<0) throw new Error('Could not find the v33 closing IIFE marker.');
transformed=transformed.slice(0,idx)
  +'\n\n/* ONLINE CLOUD COMPLETION BRIDGES */\n'
  +bridges.map((p)=>fs.readFileSync(p,'utf8')).join('\n\n')
  +'\n'
  +transformed.slice(idx);

const startScript=transformed.lastIndexOf('<script>',idx);
const endScript=transformed.indexOf('</script>',idx);
if(startScript<0||endScript<0) throw new Error('Could not isolate the composed v33 runtime script.');
const runtime=transformed.slice(startScript+'<script>'.length,endScript);
new vm.Script(runtime,{filename:'composed-v33-online-v7.js'});

for(const required of [
  'const DICE = __TTD_DICEFILE.dice;',
  "case 'soulScimitar':",
  'function fireSoulScimitar(',
  'function updateSoulScimitars(',
  'function drawSoulScimitars(',
  'GLYPHS.scimitar',
  "send('ttd:v6-ready'",
  'onlineV6Merge',
  'onlineEnchantAttempt',
]) if(!runtime.includes(required)) throw new Error(`Composed runtime is missing ${required}.`);

const soul=catalog.dice.soulscimitar;
if(soul.atk!==4.3 || soul.category!=='special' || soul.affinities?.arcane!==1) throw new Error('Soul Scimitar base combat contract changed unexpectedly.');
if(soul.special?.baseBladeCount!==2 || soul.special?.class3ExtraBlades!==2 || soul.special?.class7ExtraBlades!==2) throw new Error('Soul Scimitar blade-count progression is invalid.');
if(soul.special?.healFraction!==0.25 || soul.special?.targetSlowChance!==0.15 || soul.special?.pierceSlowChance!==0.07) throw new Error('Soul Scimitar class effects are invalid.');

const main=fs.readFileSync('functions/main-v6.js','utf8');
if(!main.includes("require('./catalog-gacha-v7')")) throw new Error('Cloud Functions main is not loading catalog gacha.');
if(main.lastIndexOf('...catalogGacha')<main.lastIndexOf('...singleplayer')) throw new Error('Catalog gacha must override earlier gacha exports.');

console.log(`Online v7 composition is syntactically valid with ${Object.keys(catalog.dice).length} canonical dice, including Soul Scimitar.`);
