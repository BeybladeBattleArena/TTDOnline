import fs from 'node:fs';

const client = fs.readFileSync('online/result-summary-client-v25.js','utf8');
const entry = fs.readFileSync('online/singleplayer-client-v6.js','utf8');

const required = [
  "000 Pips banked!",
  "000 EXP earned!",
  ".padStart(3, '0')",
  "await animateLine(pipsEl, pipsTarget, 'Pips banked!', PIPS_MS)",
  "await animateLine(expEl, run.xp, 'EXP earned!', EXP_MS)",
  "message.type === 'ttd:v6-run-finish-request'",
  "message.type === 'ttd:v6-run-begin-request'",
  "#overlayGold, #overlayXpV21, #zSummaryXpV21",
  "#zSummaryCard > .goldPill",
  "stats.insertAdjacentElement('afterend', block)",
  "button.insertAdjacentElement('beforebegin', block)",
  "Math.round(wave * 10 + kills * 1.2 + coinGold + (message.typhoonDefeated ? 150 : 0))",
  "Math.round(kills * 2 + playSeconds * 0.15)",
  "const PIPS_MS = 700",
  "const EXP_MS = 700",
];
for (const marker of required) {
  if (!client.includes(marker)) throw new Error(`Result-summary v25 missing: ${marker}`);
}
if (!entry.includes("import './result-summary-client-v25.js?v=25';")) throw new Error('Online client does not load result-summary-client-v25.');
if (entry.indexOf('result-summary-client-v25') > entry.indexOf('singleplayer-client-v9-core')) throw new Error('Result-summary listener must load before the legacy online core.');
if (/\+\$\{[^}]+\}\s*(?:Pips|EXP)/.test(client) || />\+\d*\s*(?:Pips|EXP)/.test(client)) throw new Error('Animated Pips/EXP lines must not use + prefixes.');
if (client.indexOf("await animateLine(pipsEl") > client.indexOf("await animateLine(expEl")) throw new Error('Pips must tally before EXP.');
if (!client.includes("frame?.addEventListener('load', resetForNewRun)")) throw new Error('Frame reload must reset result overrides instead of globally hiding result UI.');

console.log('Result summary v25 verified: in-summary 000 counters tally Pips first, then EXP, with no + prefix.');
