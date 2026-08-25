import fs from 'node:fs';
import vm from 'node:vm';

const gamePath='random-dice-game-33.html';
const loaderPath='online/game-loader.js';
const nativeMarker='TTD_NATIVE_LOADER_TRANSFORMS_V1';
const game=fs.readFileSync(gamePath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');

if(game.includes(nativeMarker)){
  console.log('Native runtime transforms v1 are already materialized; no changes required.');
  process.exit(0);
}

const bootMarker='  async function boot(){';
const bootIndex=loader.indexOf(bootMarker);
if(bootIndex<0)throw new Error('Could not locate loader boot boundary.');

// Reuse the exact transformation functions that production currently executes. The migration
// deliberately does not maintain a second copy of those transformations.
const harness=loader.slice(0,bootIndex)
  +"  globalThis.__TTD_MIGRATION_TRANSFORMS={installCatalogHooks,installMobileDeckRuntime};\n"
  +'})();\n';
const context={location:{origin:'https://migration.invalid'},console};
vm.createContext(context);
new vm.Script(harness,{filename:'online/game-loader.js#migration-harness'}).runInContext(context);
const transforms=context.__TTD_MIGRATION_TRANSFORMS;
if(!transforms?.installCatalogHooks || !transforms?.installMobileDeckRuntime)throw new Error('Could not expose existing loader transforms.');

let next=transforms.installCatalogHooks(game);
next=transforms.installMobileDeckRuntime(next);
const htmlMarker='<html lang="en">';
if(!next.includes(htmlMarker))throw new Error('Could not locate HTML root marker.');
next=next.replace(htmlMarker,`${htmlMarker}\n<!-- ${nativeMarker}: exact catalog-hook and mobile-deck transforms materialized from online/game-loader.js -->`);

const oldBoot=`    let transformed=installCanonicalDice(gameHtml,catalog);\n    transformed=installCatalogHooks(transformed);\n    transformed=installMobileDeckRuntime(transformed);`;
const newBoot=`    let transformed=installCanonicalDice(gameHtml,catalog);\n    if(!gameHtml.includes('${nativeMarker}')){\n      transformed=installCatalogHooks(transformed);\n      transformed=installMobileDeckRuntime(transformed);\n    }`;
if(!loader.includes(oldBoot))throw new Error('Loader transform call sequence changed; refusing one-time migration.');
const nextLoader=loader.replace(oldBoot,newBoot);

fs.writeFileSync(gamePath,next);
fs.writeFileSync(loaderPath,nextLoader);
console.log('Materialized catalog hooks and mobile deck runtime into committed source using the loader’s exact current transforms. Runtime loader now skips those transformations when the native marker is present.');
