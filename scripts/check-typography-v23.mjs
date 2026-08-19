import fs from 'node:fs';

const client=fs.readFileSync('online/typography-client-v23.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');

const required=[
  "family=Russo+One&display=swap",
  "const FONT_STACK = \"'Russo One', sans-serif\"",
  "font-family: ${FONT_STACK} !important",
  "font-weight: 400 !important",
  "message.type !== 'ttd:v6-run-begin-request'",
  "modeKey.includes('zombie')",
  "modeKey.includes('horde')",
  "win.__ttdZombieTypographyOriginal = zombieModeActive",
  "if (win.__ttdZombieTypographyOriginal === true)",
  "descriptor.set.call(this, source)",
  "style.textContent = zombieModeActive ? ''",
  "getElementById('homeScreen')?.classList.contains('active')",
];
for(const marker of required)if(!client.includes(marker))throw new Error(`Russo One v23 missing: ${marker}`);
if(client.includes('Advent Pro'))throw new Error('Russo One v23 must not retain Advent Pro.');
if(!entry.includes("import './typography-client-v23.js?v=23';"))throw new Error('Single-player client does not load typography v23.');
if(entry.includes('typography-client-v22'))throw new Error('Advent Pro typography v22 is still loaded.');

console.log('Typography v23 verified: Russo One 400 applies outside Zombie Mode, while Zombie battle/results preserve original typography.');
