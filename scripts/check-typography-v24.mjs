import fs from 'node:fs';

const client=fs.readFileSync('online/typography-client-v24.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');

const required=[
  "family=Creepster&family=Russo+One&display=swap",
  "const FONT_STACK = \"'Russo One', sans-serif\"",
  "const ZOMBIE_FONT_STACK = \"'Creepster', cursive\"",
  '#btnZombies h3',
  '#zombieModeScreen .topbar .title',
  '#zombieModeScreen .modeCard.zombieSub h3',
  'style.textContent = globalCss() + zombieTitleCss()',
  'descriptor.set.call(this, `400 ${size}px ${FONT_STACK}`)',
];
for(const marker of required)if(!client.includes(marker))throw new Error(`Typography v25 missing: ${marker}`);
if(client.includes('Advent Pro'))throw new Error('Typography must not retain Advent Pro.');
if(client.includes('__ttdZombieTypographyOriginal'))throw new Error('Zombie runs must not bypass the global Russo One font.');
if(client.includes('descriptor.set.call(this, source)'))throw new Error('Canvas text must not fall back to a legacy source font.');
for(const selector of ['#zSummaryCard h2','#overlayTitle','#modeLabel']){
  if(client.includes(selector))throw new Error(`Creepster scope is too broad: ${selector}`);
}
if(!entry.includes("import './typography-client-v24.js?v=25';"))throw new Error('Single-player client does not load typography v25.');
if(entry.includes('typography-client-v23'))throw new Error('Typography v23 is still loaded.');

console.log('Typography v25 verified: Russo One is global, including Zombie results, while Creepster is restricted to Zombie menu titles.');
