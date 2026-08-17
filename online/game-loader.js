(() => {
  'use strict';
  const ORIGIN=location.origin;
  const GAME_PATH='/random-dice-game-33.html';
  const BRIDGES=[
    '/online/game-bridge-inner.js?v=4',
    '/online/progression-bridge-v5.js?v=5',
    '/online/singleplayer-bridge-v6.js?v=6',
    '/online/merge-bridge-v6.js?v=6',
    '/online/run-ui-bridge-v6.js?v=6',
    '/online/refresh-bridge-v6.js?v=6',
  ];
  const IIFE_END_MARKER='\n})();\n</'+'script>';
  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  async function loadText(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}.`);return response.text();}
  async function boot(){send('ttd:bridge-phase',{phase:'loader-started',message:'Preparing complete cloud game…'});const [gameHtml,...sources]=await Promise.all([loadText(GAME_PATH),...BRIDGES.map(loadText)]);send('ttd:bridge-phase',{phase:'assets-loaded',message:'Online account systems loaded…'});const markerIndex=gameHtml.lastIndexOf(IIFE_END_MARKER);if(markerIndex<0)throw new Error('The v33 game closure marker could not be located.');const transformed=gameHtml.slice(0,markerIndex)+'\n\n  /* ================= ONLINE CLOUD COMPLETION BRIDGES ================= */\n'+sources.join('\n\n')+'\n'+gameHtml.slice(markerIndex);send('ttd:bridge-phase',{phase:'document-ready',message:'Starting cloud-authoritative game…'});document.open();document.write(transformed);document.close();}
  boot().catch((err)=>{console.error('Online game loader failed.',err);send('ttd:bridge-sync-error',{message:`Could not start online gameplay: ${err?.message||'unknown loader error'}`});});
})();
