import fs from 'node:fs';
import vm from 'node:vm';

const gamePath = 'random-dice-game-33.html';
const bridgePath = 'online/game-bridge-inner.js';
const loaderPath = 'online/game-loader.js';
const loaderHtmlPath = 'online/game-loader.html';

const gameHtml = fs.readFileSync(gamePath, 'utf8');
const bridgeSource = fs.readFileSync(bridgePath, 'utf8');
const loaderSource = fs.readFileSync(loaderPath, 'utf8');
const loaderHtml = fs.readFileSync(loaderHtmlPath, 'utf8');

new vm.Script(bridgeSource, { filename: bridgePath });
new vm.Script(loaderSource, { filename: loaderPath });

if (!loaderHtml.includes('/online/game-loader.js?v=4')) {
  throw new Error('Online loader HTML is not pinned to the v4 loader.');
}

const marker = '\n})();\n</script>';
const markerIndex = gameHtml.lastIndexOf(marker);
if (markerIndex < 0) throw new Error('Could not find the v33 closing IIFE marker.');

const transformed = gameHtml.slice(0, markerIndex) +
  '\n\n  /* ONLINE FIREBASE BRIDGE */\n' + bridgeSource + '\n' +
  gameHtml.slice(markerIndex);

const scriptStart = transformed.lastIndexOf('<script>', markerIndex);
const scriptEnd = transformed.indexOf('</script>', markerIndex);
if (scriptStart < 0 || scriptEnd < 0) throw new Error('Could not isolate the composed v33 runtime script.');

const runtimeSource = transformed.slice(scriptStart + '<script>'.length, scriptEnd);
new vm.Script(runtimeSource, { filename: 'composed-v33-online-runtime.js' });

if (!runtimeSource.includes("send('ttd:bridge-ready', { version: 4 })")) {
  throw new Error('Composed runtime is missing the v4 bridge-ready handshake.');
}

console.log('Online loader composition is syntactically valid.');
