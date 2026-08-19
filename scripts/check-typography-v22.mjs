import fs from 'node:fs';
import vm from 'node:vm';

const typography=fs.readFileSync('online/typography-client-v22.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');

new vm.Script(typography,{filename:'online/typography-client-v22.js'});

for(const marker of [
  'family=Advent+Pro:wght@400&display=swap',
  "const FONT_STACK = \"'Advent Pro', sans-serif\"",
  'font-family: ${FONT_STACK} !important',
  'font-weight: 400 !important',
  'CanvasRenderingContext2D',
  "descriptor.set.call(this, `400 ${size}px ${FONT_STACK}`)",
  "document.getElementById('gameFrame')",
  "contentDocument?.getElementById('app')",
]){
  if(!typography.includes(marker))throw new Error(`Advent Pro typography layer missing: ${marker}`);
}
if(!entry.includes("import './typography-client-v22.js?v=22';"))throw new Error('Outer online client does not load typography-client-v22.');
if(/Advent\+Pro:wght@(?!400)/.test(typography))throw new Error('Advent Pro typography must remain Regular 400 for this trial.');

console.log('Typography v22 verified: Advent Pro Regular 400 owns shell, iframe UI, and canvas labels.');
