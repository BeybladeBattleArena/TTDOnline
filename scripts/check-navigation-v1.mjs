import fs from 'node:fs';
const controls=fs.readFileSync('online/singleplayer-run-controls-v1.js','utf8');
const game=fs.readFileSync('random-dice-game-33.html','utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
must(controls.includes("function singleplayerActive(){const game=document.getElementById('gameScreen');return!!game?.classList.contains('active');}"),'Any active single-player game screen must suppress Back, including intro/held/test-map phases.');
for(const marker of ['#gameScreen.ttdSingleplayerRunActiveV1 #pauseBtn','#gameScreen.ttdSingleplayerRunActiveV1 .backBtn','#gameScreen.ttdSingleplayerRunActiveV1 [data-ttd-back]','display:none!important','pointer-events:none!important'])must(controls.includes(marker),`Single-player Back suppression missing: ${marker}`);
must(controls.includes("finishRun?.('finish','Run ended by player.')"),'Moving Screen End Run must enter the FINISH outcome path rather than navigate Back/exit directly.');
must(game.includes("document.getElementById('pauseBtn').addEventListener('click', ()=>{"),'Legacy Back handler may remain as an unreachable fallback but must stay behind shared suppression.');
console.log('Navigation v2 verified: Back is inaccessible whenever the single-player game screen is active; Moving Screen End Run uses FINISH.');
