import fs from 'node:fs';

const gamePath='random-dice-game-33.html';
const loaderPath='online/game-loader.js';
let game=fs.readFileSync(gamePath,'utf8');
let loader=fs.readFileSync(loaderPath,'utf8');

const diceStart='  const DICE = {';
const diceKeys='  const DICE_KEYS = Object.keys(DICE);';
const start=game.indexOf(diceStart);
const keys=game.indexOf(diceKeys,start);
if(start<0||keys<0)throw new Error('Could not locate the embedded DICE catalog block.');
const nativeDice=`  /* TTD_NATIVE_DICEFILE_V1: dicefile.json is preloaded as data by online/game-loader.js. */\n  const __TTD_DICEFILE = window.__TTD_DICEFILE;\n  if(!__TTD_DICEFILE || __TTD_DICEFILE.schemaVersion!==1 || !__TTD_DICEFILE.dice || typeof __TTD_DICEFILE.dice!=='object'){\n    throw new Error('Canonical dicefile.json was not preloaded before the game source executed.');\n  }\n  const DICE = __TTD_DICEFILE.dice;\n`;
game=game.slice(0,start)+nativeDice+game.slice(keys);
if(game.includes(diceStart))throw new Error('Embedded DICE object survived native dicefile migration.');

loader=loader.replace("  const DICE_START='  const DICE = {';\n  const DICE_KEYS='  const DICE_KEYS = Object.keys(DICE);';\n",'');
const installStart=loader.indexOf('  function installCanonicalDice(source,catalog){');
const bootStart=loader.indexOf('  async function boot(){',installStart);
if(installStart<0||bootStart<0)throw new Error('Could not isolate installCanonicalDice in loader.');
const validate=`  function validateCanonicalCatalog(catalog){\n    if(!catalog || catalog.schemaVersion!==1 || !catalog.dice || typeof catalog.dice!=='object'){\n      throw new Error('dicefile.json is missing a supported canonical dice catalog.');\n    }\n    if(!catalog.dice.soulscimitar || catalog.dice.soulscimitar?.special?.kind!=='soulScimitar'){\n      throw new Error('dicefile.json does not contain the Soul Scimitar runtime definition.');\n    }\n    if(!catalog.dice.slithervine || catalog.dice.slithervine?.special?.kind!=='slitherVine'){\n      throw new Error('dicefile.json does not contain the Slither Vine runtime definition.');\n    }\n    if(!catalog.dice.magmaforce || catalog.dice.magmaforce?.special?.kind!=='magmaForce'){\n      throw new Error('dicefile.json does not contain the Magma Force runtime definition.');\n    }\n  }\n\n`;
loader=loader.slice(0,installStart)+validate+loader.slice(bootStart);
const parseLine="    try{catalog=JSON.parse(catalogText);}catch(err){throw new Error(`dicefile.json is invalid JSON: ${err.message}`);}";
if(!loader.includes(parseLine))throw new Error('Could not locate loader catalog parse line.');
loader=loader.replace(parseLine,`${parseLine}\n    validateCanonicalCatalog(catalog);\n    window.__TTD_DICEFILE=catalog;`);
const installCall='    let transformed=installCanonicalDice(gameHtml,catalog);';
if(!loader.includes(installCall))throw new Error('Could not locate loader catalog source-replacement call.');
loader=loader.replace(installCall,'    let transformed=gameHtml;');
for(const stale of ['function installCanonicalDice(','const DICE_START=','source.indexOf(DICE_START)','JSON.stringify(catalog)','let transformed=installCanonicalDice(gameHtml,catalog);']){
  if(loader.includes(stale))throw new Error(`Retired catalog source replacement survived migration: ${stale}`);
}
for(const marker of ['function validateCanonicalCatalog(catalog)','validateCanonicalCatalog(catalog);','window.__TTD_DICEFILE=catalog;','let transformed=gameHtml;']){
  if(!loader.includes(marker))throw new Error(`Native dicefile loader handoff missing: ${marker}`);
}

fs.writeFileSync(gamePath,game);
fs.writeFileSync(loaderPath,loader);
console.log('Replaced the embedded DICE catalog with the preloaded dicefile.json data handoff and removed catalog source replacement from the loader.');
