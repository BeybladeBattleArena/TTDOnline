import fs from 'node:fs';
import vm from 'node:vm';

const gameHtml=fs.readFileSync('random-dice-game-33.html','utf8');
const loader=fs.readFileSync('online/game-loader.js','utf8');
const loaderHtml=fs.readFileSync('online/game-loader.html','utf8');
const catalog=JSON.parse(fs.readFileSync('dicefile.json','utf8'));
const generated=JSON.parse(fs.readFileSync('functions/dicefile.generated.json','utf8'));

const bridges=[
  'online/dice-catalog-bridge-v7.js',
  'online/slither-vine-bridge-v8.js',
  'online/game-bridge-inner.js',
  'online/progression-bridge-v5.js',
  'online/singleplayer-bridge-v6.js',
  'online/merge-bridge-v6.js',
  'online/run-ui-bridge-v6.js',
  'online/refresh-bridge-v6.js',
];

for(const path of bridges) new vm.Script(fs.readFileSync(path,'utf8'),{filename:path});
new vm.Script(loader,{filename:'online/game-loader.js'});

if(!loaderHtml.includes('data-mode="loader-v8"')) throw new Error('Online loader HTML is not marked loader-v8.');
if(!loaderHtml.includes('/online/game-loader.js?v=8')) throw new Error('Online loader HTML is not pinned to v8.');
if(catalog.schemaVersion!==1 || !catalog.dice || !catalog.dice.soulscimitar || !catalog.dice.slithervine) throw new Error('dicefile.json is missing the v8 custom dice catalog.');
if(Object.keys(catalog.dice).length<37) throw new Error('dicefile.json unexpectedly lost legacy dice definitions.');
if(JSON.stringify(generated.dice)!==JSON.stringify(catalog.dice)) throw new Error('functions/dicefile.generated.json is not synchronized with dicefile.json.');

const expectedBridgeUrls=[
  '/online/dice-catalog-bridge-v7.js?v=7',
  '/online/slither-vine-bridge-v8.js?v=8',
  '/online/game-bridge-inner.js?v=4',
  '/online/progression-bridge-v5.js?v=5',
  '/online/singleplayer-bridge-v6.js?v=6',
  '/online/merge-bridge-v6.js?v=6',
  '/online/run-ui-bridge-v6.js?v=6',
  '/online/refresh-bridge-v6.js?v=6',
];
for(const url of expectedBridgeUrls) if(!loader.includes(url)) throw new Error(`Loader does not include ${url}.`);
if(!loader.includes("const DICE_PATH='/dicefile.json?v=2'")) throw new Error('Loader is not fetching canonical dicefile v2.');

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
const switchReplacement=`${switchNeedle}\n      case 'soulScimitar': {\n        fireSoulScimitar(idx, die, d, dmg, dieAff, potencyBonus, isCrit);\n        break;\n      }\n      case 'slitherVine': {\n        fireSlitherVine(idx, die, d, dmg, dieAff, potencyBonus, isCrit);\n        break;\n      }`;
transformed=transformed.slice(0,switchAt)+switchReplacement+transformed.slice(switchAt+switchNeedle.length);

const timeNeedle='    state.time += dt;';
const timeAt=transformed.indexOf(timeNeedle);
if(timeAt<0) throw new Error('Could not locate main battle loop time step.');
transformed=transformed.slice(0,timeAt)+`${timeNeedle}\n    updateSoulScimitars(dt);\n    updateSlitherVines(dt);`+transformed.slice(timeAt+timeNeedle.length);

if(!transformed.includes('drawLane(dt);')) throw new Error('Could not locate canvas draw calls.');
transformed=transformed.split('drawLane(dt);').join('drawLane(dt); drawSlitherVines(); drawSoulScimitars();');

const advNeedle='      if(state.adventure && !silenced) tickMonsterSkills(e, dt);';
const advAt=transformed.indexOf(advNeedle);
if(advAt<0) throw new Error('Could not locate Adventure enemy skill gate.');
transformed=transformed.slice(0,advAt)+'      if(state.adventure && !silenced && !e._slitherBlocked) tickMonsterSkills(e, dt);'+transformed.slice(advAt+advNeedle.length);

const zombieNeedle='        if(!silenced) tickZombieSkills(e);';
const zombieAt=transformed.indexOf(zombieNeedle);
if(zombieAt<0) throw new Error('Could not locate Endless Horde enemy skill gate.');
transformed=transformed.slice(0,zombieAt)+'        if(!silenced && !e._slitherBlocked) tickZombieSkills(e);'+transformed.slice(zombieAt+zombieNeedle.length);

const labelNeedle="    const targetLabel = {front:'Frontmost enemy', random:'Random enemy', strongest:'Strongest enemy', none:'Does not attack'}[d.target]||d.target;";
const labelAt=transformed.indexOf(labelNeedle);
if(labelAt<0) throw new Error('Could not locate die-detail target label.');
const labelReplacement="    const targetLabel = {front:'Frontmost enemy', random:'Random enemy', strongest:'Strongest enemy', fastest:'Fastest enemy (ties: highest current HP)', none:'Does not attack'}[d.target]||d.target;";
transformed=transformed.slice(0,labelAt)+labelReplacement+transformed.slice(labelAt+labelNeedle.length);

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
new vm.Script(runtime,{filename:'composed-v33-online-v8.js'});

for(const required of [
  'const DICE = __TTD_DICEFILE.dice;',
  "case 'soulScimitar':",
  'function fireSoulScimitar(',
  'function updateSoulScimitars(',
  'function drawSoulScimitars(',
  'GLYPHS.scimitar',
  "case 'slitherVine':",
  'function fireSlitherVine(',
  'function updateSlitherVines(',
  'function drawSlitherVines(',
  'GLYPHS.slithervine',
  "fastest:'Fastest enemy (ties: highest current HP)'",
  "!e._slitherBlocked) tickMonsterSkills",
  "!e._slitherBlocked) tickZombieSkills",
  "send('ttd:v6-ready'",
  'onlineV6Merge',
  'onlineEnchantAttempt',
]) if(!runtime.includes(required)) throw new Error(`Composed runtime is missing ${required}.`);

const soul=catalog.dice.soulscimitar;
if(soul.atk!==4.3 || soul.category!=='special' || soul.affinities?.arcane!==1) throw new Error('Soul Scimitar base combat contract changed unexpectedly.');
if(soul.special?.baseBladeCount!==2 || soul.special?.class3ExtraBlades!==2 || soul.special?.class7ExtraBlades!==2) throw new Error('Soul Scimitar blade-count progression is invalid.');
if(soul.special?.healFraction!==0.25 || soul.special?.targetSlowChance!==0.15 || soul.special?.pierceSlowChance!==0.07) throw new Error('Soul Scimitar class effects are invalid.');

const vine=catalog.dice.slithervine;
if(vine.rarity!=='unique' || vine.atk!==4.84 || vine.category!=='physical' || vine.affinities?.nature!==1) throw new Error('Slither Vine base combat contract is invalid.');
if(vine.special?.sectionCount!==4 || vine.special?.classCooldownSteps?.[0]?.atClass!==2 || vine.special?.classCooldownSteps?.[0]?.mult!==0.94) throw new Error('Slither Vine C1-C2 progression is invalid.');
if(vine.special?.class3SectionHpMult!==1.10 || vine.special?.class3DamageReductionBonus!==0.03 || vine.special?.barbsClass!==4) throw new Error('Slither Vine C3-C4 progression is invalid.');
if(vine.special?.class5MainDamageMult!==1.18 || vine.special?.class5BarbDamageMult!==1.35 || vine.special?.class5SectionHpMult!==1.05 || vine.special?.class5DamageReductionBonus!==0.02) throw new Error('Slither Vine C5 progression is invalid.');
if(vine.special?.mainConfusionChance!==0.20 || vine.special?.barbSilenceChance!==0.12 || vine.special?.statusDuration!==2.0 || vine.special?.statusClass!==6) throw new Error('Slither Vine C6 progression is invalid.');
if(vine.special?.persistClass!==7 || vine.special?.class7SectionHpMult!==1.12 || vine.special?.class7DamageReductionBonus!==0.02) throw new Error('Slither Vine C7 progression is invalid.');

const gift=fs.readFileSync('functions/gift-v7-secure.js','utf8');
for(let cls=1;cls<=7;cls++) if(!gift.includes(`'TTD-SLITHER-C${cls}'`)) throw new Error(`Gift backend is missing Slither Vine C${cls} code.`);
if(!gift.includes("require('./dicefile.generated.json')")) throw new Error('Gift backend is not catalog-driven.');

const main=fs.readFileSync('functions/main-v6.js','utf8');
if(!main.includes("require('./catalog-gacha-v7')")) throw new Error('Cloud Functions main is not loading catalog gacha.');
if(main.lastIndexOf('...catalogGacha')<main.lastIndexOf('...singleplayer')) throw new Error('Catalog gacha must override earlier gacha exports.');

console.log(`Online v8 composition is syntactically valid with ${Object.keys(catalog.dice).length} canonical dice, including Soul Scimitar and Slither Vine.`);
