import fs from 'node:fs';
import vm from 'node:vm';

const gamePath = 'random-dice-game-33.html';
const coreBridgePath = 'online/game-bridge-inner.js';
const progressionBridgePath = 'online/progression-bridge-v5.js';
const loaderPath = 'online/game-loader.js';
const loaderHtmlPath = 'online/game-loader.html';

const gameHtml = fs.readFileSync(gamePath, 'utf8');
const coreBridgeSource = fs.readFileSync(coreBridgePath, 'utf8');
const progressionBridgeSource = fs.readFileSync(progressionBridgePath, 'utf8');
const loaderSource = fs.readFileSync(loaderPath, 'utf8');
const loaderHtml = fs.readFileSync(loaderHtmlPath, 'utf8');

new vm.Script(coreBridgeSource, { filename: coreBridgePath });
new vm.Script(progressionBridgeSource, { filename: progressionBridgePath });
new vm.Script(loaderSource, { filename: loaderPath });

if (!loaderHtml.includes('/online/game-loader.js?v=5')) {
  throw new Error('Online loader HTML is not pinned to the v5 loader.');
}
if (!loaderSource.includes('/online/progression-bridge-v5.js?v=5')) {
  throw new Error('V5 loader is not pinned to the progression bridge.');
}

const marker = '\n})();\n</script>';
const markerIndex = gameHtml.lastIndexOf(marker);
if (markerIndex < 0) throw new Error('Could not find the v33 closing IIFE marker.');

const transformed = gameHtml.slice(0, markerIndex) +
  '\n\n  /* ONLINE FIREBASE BRIDGE */\n' + coreBridgeSource + '\n' +
  '\n  /* ONLINE PROGRESSION V5 */\n' + progressionBridgeSource + '\n' +
  gameHtml.slice(markerIndex);

const scriptStart = transformed.lastIndexOf('<script>', markerIndex);
const scriptEnd = transformed.indexOf('</script>', markerIndex);
if (scriptStart < 0 || scriptEnd < 0) throw new Error('Could not isolate the composed v33 runtime script.');

const runtimeSource = transformed.slice(scriptStart + '<script>'.length, scriptEnd);
new vm.Script(runtimeSource, { filename: 'composed-v33-online-runtime.js' });

if (!runtimeSource.includes("send('ttd:bridge-ready', { version: 4 })")) {
  throw new Error('Composed runtime is missing the core bridge-ready handshake.');
}
if (!runtimeSource.includes("send('ttd:v5-progression-ready', { version: 5 })")) {
  throw new Error('Composed runtime is missing the v5 progression-ready handshake.');
}
if (!runtimeSource.includes('mergeInstances = function onlineAuthoritativeMerge')) {
  throw new Error('Composed runtime is missing the authoritative Class merge override.');
}

console.log('Online v5 loader composition is syntactically valid.');
