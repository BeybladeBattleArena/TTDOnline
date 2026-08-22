import fs from 'node:fs';

const client=fs.readFileSync('online/result-summary-client-v26.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');

const required=[
  'const START_DELAY_MS = 420',
  'const EXP_WAIT_MS = 15000',
  '000 Pips banked!',
  '000 EXP earned!',
  ".padStart(3, '0')",
  'setTimeout(resolve, START_DELAY_MS)',
  "await animateLine(pipsEl, pipsTarget, 'Pips banked!', PIPS_MS)",
  "await animateLine(expEl, run.xp, 'EXP earned!', EXP_MS)",
  "message.type === 'ttd:v6-run-finish-request'",
  "message.type === 'ttd:v6-run-begin-request'",
  '#overlayGold, #overlayXpV21, #zSummaryXpV21',
  '#zSummaryCard > .goldPill',
  "stats.insertAdjacentElement('afterend', block)",
  "button.insertAdjacentElement('beforebegin', block)",
  "Math.round(wave * 10 + kills * 1.2 + coinGold + (message.typhoonDefeated ? 150 : 0))",
  'kills > 0 ? Math.round(kills * 2 + playSeconds * 0.15) : 0',
  "getElementById('ttd-result-summary-hide-v26')?.remove()",
  "frame?.addEventListener('load', resetForNewRun)",
];
for(const marker of required)if(!client.includes(marker))throw new Error(`Result-summary v26 missing: ${marker}`);
if(!entry.includes("import './result-summary-client-v26.js?v=26';"))throw new Error('Online client does not load result-summary-client-v26.');
if(entry.includes('result-summary-client-v25'))throw new Error('Legacy result-summary v25 is still loaded.');
if(entry.indexOf('result-summary-client-v26')>entry.indexOf('singleplayer-client-v9-core'))throw new Error('Result-summary listener must load before legacy online core.');
if(/\+\$\{[^}]+\}\s*(?:Pips|EXP)/.test(client)||/>\+\d*\s*(?:Pips|EXP)/.test(client))throw new Error('Animated Pips/EXP lines must not use + prefixes.');
if(client.indexOf('setTimeout(resolve, START_DELAY_MS)')>client.indexOf('await animateLine(pipsEl'))throw new Error('Pips delay must occur before Pips animation.');
if(client.indexOf('await animateLine(pipsEl')>client.indexOf('await animateLine(expEl'))throw new Error('Pips must tally before EXP.');
console.log('Result summary v26 verified: final stats pause at 000, Pips tally before EXP, and zero-kill Zombie runs predict zero Pips.');
