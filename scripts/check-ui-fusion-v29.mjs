import fs from 'node:fs';
const ui=fs.readFileSync('online/ui-fusion-v29.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
for(const marker of ['ttd-ui-fusion-v29','linear-gradient(180deg,#17274e','shopItemCard','rewardPopupCard','collectionGrid','::-webkit-scrollbar-thumb','bottomNav','zombieModeScreen .zombieSub'])if(!ui.includes(marker))throw new Error(`UI fusion v29 missing: ${marker}`);
if(!ui.includes('background:revert-layer!important'))throw new Error('Zombie Mode gradient protection is missing.');
if(!entry.includes("./ui-fusion-v29.js?v=29"))throw new Error('UI fusion v29 is not loaded by the online client.');
if(ui.includes('#zombieModeScreen .zombieSub{background:linear-gradient'))throw new Error('UI fusion must never replace the Zombie Mode gradient.');
console.log('UI fusion v29 verified: dimensional framed panels, inset wells, tactile controls, scrollbars, modals, and protected Zombie Mode gradient.');
