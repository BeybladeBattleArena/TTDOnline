import fs from 'node:fs';

const game=fs.readFileSync('random-dice-game-33.html','utf8');
const must=(condition,message)=>{if(!condition)throw new Error(message);};

must(game.includes("document.getElementById('pauseBtn').addEventListener('click', ()=>{"),'in-run Back handler missing');
must(game.includes("state?.modeKey==='adventure' ? 'adventure'"),'Adventure in-run Back must return to the Adventure landing, not Arcade Mode');
must(game.includes("state?.zombieMode ? 'zombieMode'"),'Zombie in-run Back must continue returning to Zombie Mode');
must(game.includes(": 'mode';\n    if(state) state.running = false;\n    showScreen(backTarget);"),'Arcade fallback and existing non-outcome Back semantics changed unexpectedly');

console.log('Navigation v1 verified: in-run Back returns Adventure to its Adventure landing, Zombie to Zombie Mode, and Arcade to Arcade Mode without invoking End Run outcome handling.');
