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
  'html.ttdZombieTypographyActive #modeLabel',
  'html.ttdZombieTypographyActive #overlayTitle',
  'html.ttdZombieTypographyActive #zSummaryCard h2',
  "doc.documentElement.classList.toggle('ttdZombieTypographyActive', zombieModeActive)",
  'win.__ttdZombieTypographyOriginal = zombieModeActive',
  'descriptor.set.call(this, source)',
  "modeKey.includes('zombie')",
  "modeKey.includes('horde')",
];
for(const marker of required)if(!client.includes(marker))throw new Error(`Typography v24 missing: ${marker}`);
if(client.includes('Advent Pro'))throw new Error('Typography v24 must not retain Advent Pro.');
if(!entry.includes("import './typography-client-v24.js?v=24';"))throw new Error('Single-player client does not load typography v24.');
if(entry.includes('typography-client-v23'))throw new Error('Typography v23 is still loaded.');

console.log('Typography v24 verified: Russo One remains global while Zombie titles use Creepster and Zombie battle/result body typography remains original.');
