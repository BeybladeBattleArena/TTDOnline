import fs from 'node:fs';

const file='random-dice-game-33.html';
let source=fs.readFileSync(file,'utf8');
const marker='TTD_ADVENTURE_BACK_RECOVERY_V1';
if(source.includes(marker)){
  console.log('Adventure Back recovery already materialized.');
  process.exit(0);
}

const from=`  document.getElementById('pauseBtn').addEventListener('click', ()=>{\n    if(state) state.running = false;\n    showScreen(state && state.zombieMode ? 'zombieMode' : 'mode');\n  });`;
const to=`  document.getElementById('pauseBtn').addEventListener('click', ()=>{\n    // ${marker}\n    // Back leaves the current run without invoking End Run outcome handling, but must return\n    // to the landing for the mode the player actually came from.\n    const backTarget = state?.zombieMode ? 'zombieMode' :\n      state?.modeKey==='adventure' ? 'adventure' : 'mode';\n    if(state) state.running = false;\n    showScreen(backTarget);\n  });`;
const count=source.split(from).length-1;
if(count!==1)throw new Error(`Expected one native pause/back handler, found ${count}.`);
source=source.replace(from,to);
fs.writeFileSync(file,source);
console.log(`Materialized ${marker}.`);
