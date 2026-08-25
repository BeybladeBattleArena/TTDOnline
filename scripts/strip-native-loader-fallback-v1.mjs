import fs from 'node:fs';

const path='online/game-loader.js';
let source=fs.readFileSync(path,'utf8');
const nativeGame=fs.readFileSync('random-dice-game-33.html','utf8');
if(!nativeGame.includes('TTD_NATIVE_LOADER_TRANSFORMS_V1'))throw new Error('Native runtime source marker is missing; refusing to strip the fallback.');

function removeRange(startMarker,endMarker,label){
  const start=source.indexOf(startMarker);
  const end=source.indexOf(endMarker,start);
  if(start<0||end<0)throw new Error(`Could not locate ${label}.`);
  source=source.slice(0,start)+source.slice(end);
}

removeRange("  const SKILL_SWITCH=",'\n\n  function send','retired source-surgery constants');
removeRange('  function replaceOnce(','  function installCanonicalDice','retired source replacement helpers');
removeRange('  function installCatalogHooks(','\n\n  // This changes the actual v33 source BEFORE it executes.','catalog hook transformation function');
removeRange('  // This changes the actual v33 source BEFORE it executes.','\n\n  async function boot(){','mobile deck transformation function');

const oldBoot=`    let transformed=installCanonicalDice(gameHtml,catalog);\n    if(!gameHtml.includes('TTD_NATIVE_LOADER_TRANSFORMS_V1')){\n      transformed=installCatalogHooks(transformed);\n      transformed=installMobileDeckRuntime(transformed);\n    }`;
const newBoot='    let transformed=installCanonicalDice(gameHtml,catalog);';
if(!source.includes(oldBoot))throw new Error('Guarded migration fallback call sequence changed; refusing cleanup.');
source=source.replace(oldBoot,newBoot);

for(const forbidden of ['installCatalogHooks','installMobileDeckRuntime','replaceOnce(','replaceSection(','SKILL_SWITCH','LOOP_TIME','DRAW_LANE','ADVENTURE_SKILLS','ZOMBIE_SKILLS','TARGET_LABEL']){
  if(source.includes(forbidden))throw new Error(`Retired source-surgery code remains after cleanup: ${forbidden}`);
}
fs.writeFileSync(path,source);
console.log('Removed retired catalog-hook/mobile-deck textual surgery from the runtime loader. The committed monolith is now the only authority for those behaviors.');
