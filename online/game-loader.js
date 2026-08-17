(() => {
  'use strict';
  const ORIGIN=location.origin;
  const GAME_PATH='/random-dice-game-33.html';
  const DICE_PATH='/dicefile.json?v=1';
  const BRIDGES=[
    '/online/dice-catalog-bridge-v7.js?v=7',
    '/online/game-bridge-inner.js?v=4',
    '/online/progression-bridge-v5.js?v=5',
    '/online/singleplayer-bridge-v6.js?v=6',
    '/online/merge-bridge-v6.js?v=6',
    '/online/run-ui-bridge-v6.js?v=6',
    '/online/refresh-bridge-v6.js?v=6',
  ];
  const IIFE_END_MARKER='\n})();\n</'+'script>';
  const DICE_START='  const DICE = {';
  const DICE_KEYS='  const DICE_KEYS = Object.keys(DICE);';
  const SKILL_SWITCH='    switch(sp.kind){';
  const LOOP_TIME='    state.time += dt;';
  const DRAW_LANE='drawLane(dt);';

  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  async function loadText(url){
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}.`);
    return response.text();
  }
  function replaceOnce(source,needle,replacement,label){
    const i=source.indexOf(needle);
    if(i<0)throw new Error(`Could not locate ${label}.`);
    return source.slice(0,i)+replacement+source.slice(i+needle.length);
  }
  function installCanonicalDice(source,catalog){
    if(!catalog || catalog.schemaVersion!==1 || !catalog.dice || typeof catalog.dice!=='object'){
      throw new Error('dicefile.json is missing a supported canonical dice catalog.');
    }
    if(!catalog.dice.soulscimitar || catalog.dice.soulscimitar?.special?.kind!=='soulScimitar'){
      throw new Error('dicefile.json does not contain the Soul Scimitar runtime definition.');
    }
    const start=source.indexOf(DICE_START);
    const keys=source.indexOf(DICE_KEYS,start);
    if(start<0 || keys<0)throw new Error('The v33 DICE definition block could not be located.');
    const safeLiteral=JSON.stringify(catalog).replace(/</g,'\\u003c');
    return source.slice(0,start)
      +`  /* Canonical runtime catalog: /dicefile.json */\n  const __TTD_DICEFILE = ${safeLiteral};\n  const DICE = __TTD_DICEFILE.dice;\n`
      +source.slice(keys);
  }
  function installSoulScimitarHooks(source){
    source=replaceOnce(
      source,
      SKILL_SWITCH,
      `${SKILL_SWITCH}\n      case 'soulScimitar': {\n        fireSoulScimitar(idx, die, d, dmg, dieAff, potencyBonus, isCrit);\n        break;\n      }`,
      'die skill dispatcher'
    );
    source=replaceOnce(
      source,
      LOOP_TIME,
      `${LOOP_TIME}\n    updateSoulScimitars(dt);`,
      'main battle loop time step'
    );
    if(!source.includes(DRAW_LANE))throw new Error('The battle canvas draw call could not be located.');
    source=source.split(DRAW_LANE).join(`${DRAW_LANE} drawSoulScimitars();`);
    return source;
  }

  async function boot(){
    send('ttd:bridge-phase',{phase:'loader-started',message:'Preparing complete cloud game…'});
    const [gameHtml,catalogText,...sources]=await Promise.all([
      loadText(GAME_PATH),
      loadText(DICE_PATH),
      ...BRIDGES.map(loadText)
    ]);
    let catalog;
    try{catalog=JSON.parse(catalogText);}catch(err){throw new Error(`dicefile.json is invalid JSON: ${err.message}`);}

    send('ttd:bridge-phase',{phase:'assets-loaded',message:'Online account systems and dice catalog loaded…'});
    let transformed=installCanonicalDice(gameHtml,catalog);
    transformed=installSoulScimitarHooks(transformed);

    const markerIndex=transformed.lastIndexOf(IIFE_END_MARKER);
    if(markerIndex<0)throw new Error('The v33 game closure marker could not be located.');
    transformed=transformed.slice(0,markerIndex)
      +'\n\n  /* ================= ONLINE CLOUD COMPLETION BRIDGES ================= */\n'
      +sources.join('\n\n')
      +'\n'
      +transformed.slice(markerIndex);

    send('ttd:bridge-phase',{phase:'document-ready',message:`Starting cloud-authoritative game with ${Object.keys(catalog.dice).length} catalog dice…`});
    document.open();
    document.write(transformed);
    document.close();
  }

  boot().catch((err)=>{
    console.error('Online game loader failed.',err);
    send('ttd:bridge-sync-error',{message:`Could not start online gameplay: ${err?.message||'unknown loader error'}`});
  });
})();