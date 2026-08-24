import fs from 'node:fs';

const legacyClient=fs.readFileSync('online/result-summary-client-v26.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const game=fs.readFileSync('random-dice-game-33.html','utf8');
const runUi=fs.readFileSync('online/run-ui-bridge-v21.js','utf8');

// v26 remains in the repository only as historical source; after v35 it must never own the
// live result card again. The canonical game source owns the visible tally and reward notes.
if(entry.includes("result-summary-client-v26"))throw new Error('Legacy result-summary-v26 is still loaded and could restore Pips banked / EXP earned wording.');
if(entry.includes("result-reward-polish-v1"))throw new Error('Downstream result-reward-polish is still loaded instead of canonical result ownership.');
if(!legacyClient.includes('Pips banked!')||!legacyClient.includes('EXP earned!'))throw new Error('Historical v26 fingerprint changed; update this regression check deliberately.');
if(game.includes('Pips banked!')||game.includes('EXP earned!'))throw new Error('Canonical game source still contains obsolete result wording.');

const requiredGame=[
  'TTD_NATIVE_RESULT_VERSION = 35',
  'class="resultTallyLabel">PIPS</span>',
  'class="resultTallyLabel">EXP</span>',
  'id="overlayPipsValue"',
  'id="overlayExpValue"',
  'id="overlayPipsNotes"',
  'id="overlayExpNotes"',
  'function nativeNotesHtml(orbBonus,bonusPct)',
  "if(nativeRewardNum(orbBonus)>0)",
  "if(nativeRewardPct(bonusPct)>0)",
  'function renderNativeTallies',
  "expValue.textContent=xp==null?'…':nativeRewardNum(xp).toLocaleString()",
  'function applyVerifiedRunResultV35(result)',
  'window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35=applyVerifiedRunResultV35',
  '.resultTallyLabel{',
  'linear-gradient(180deg,#f6d77f 0%,#e5b64d 31%,#e27827 50%,#e5b64d 69%,#f6d77f 100%)',
  '.resultTallyValue{font-size:18px',
  'color:#fff',
];
for(const marker of requiredGame)if(!game.includes(marker))throw new Error(`Canonical result summary v35 missing: ${marker}`);
for(const marker of ["m.type!=='ttd:v6-run-finish-result'",'window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35?.(m)'])if(!runUi.includes(marker))throw new Error(`Verified run result bridge missing: ${marker}`);

console.log('Canonical result summary v35 verified: legacy Pips banked / EXP earned ownership is unloaded, native PIPS and EXP rows live in the monolith, EXP-orb and percent notes are conditional, and verified server EXP feeds the canonical tally.');
