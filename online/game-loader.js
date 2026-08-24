(() => {
  'use strict';
  const ORIGIN=location.origin;
  const GAME_PATH='/random-dice-game-33.html?v=35';
  const DICE_PATH='/dicefile.json?v=2';
  const BRIDGES=[
    '/online/dice-catalog-bridge-v8.js?v=8',
    '/online/soul-scimitar-svg-v14.js?v=14',
    '/online/slither-vine-bridge-v8.js?v=8',
    '/online/game-bridge-inner.js?v=4',
    '/online/progression-bridge-v5.js?v=5',
    '/online/singleplayer-bridge-v6.js?v=6',
    '/online/merge-bridge-v6.js?v=6',
    '/online/run-ui-bridge-v21.js?v=21',
    '/online/refresh-bridge-v6.js?v=6',
    '/online/mobile-input-bridge-v9.js?v=9',
    '/online/interaction-effects-v10.js?v=10',
    '/online/collection-portrait-fit-v16.js?v=16',
    '/online/deck-editor-v18.js?v=18',
    '/online/avatar-inventory-v22.js?v=22',
  ];
  const IIFE_END_MARKER='\n})();\n</'+'script>';
  const DICE_START='  const DICE = {';
  const DICE_KEYS='  const DICE_KEYS = Object.keys(DICE);';
  const SKILL_SWITCH='    switch(sp.kind){';
  const LOOP_TIME='    state.time += dt;';
  const DRAW_LANE='drawLane(dt);';
  const ADVENTURE_SKILLS='      if(state.adventure && !silenced) tickMonsterSkills(e, dt);';
  const ZOMBIE_SKILLS='        if(!silenced) tickZombieSkills(e);';
  const TARGET_LABEL="    const targetLabel = {front:'Frontmost enemy', random:'Random enemy', strongest:'Strongest enemy', none:'Does not attack'}[d.target]||d.target;";

  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  async function loadText(url){
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}.`);
    return response.text();
  }
  function replaceOnce(source,needle,replacement,label){
    const i=source.indexOf(needle);
    if(i<0)throw new Error(`Could not locate ${label}.`);
    return source.slice(0,i)+replacement+source.slice(i+needle.length);
  }
  function replaceSection(source,startMarker,endMarker,replacement,label){
    const start=source.indexOf(startMarker);
    const end=source.indexOf(endMarker,start);
    if(start<0||end<0)throw new Error(`Could not locate ${label}.`);
    return source.slice(0,start)+replacement+source.slice(end);
  }
  function installCanonicalDice(source,catalog){
    if(!catalog || catalog.schemaVersion!==1 || !catalog.dice || typeof catalog.dice!=='object'){
      throw new Error('dicefile.json is missing a supported canonical dice catalog.');
    }
    if(!catalog.dice.soulscimitar || catalog.dice.soulscimitar?.special?.kind!=='soulScimitar'){
      throw new Error('dicefile.json does not contain the Soul Scimitar runtime definition.');
    }
    if(!catalog.dice.slithervine || catalog.dice.slithervine?.special?.kind!=='slitherVine'){
      throw new Error('dicefile.json does not contain the Slither Vine runtime definition.');
    }
    if(!catalog.dice.magmaforce || catalog.dice.magmaforce?.special?.kind!=='magmaForce'){
      throw new Error('dicefile.json does not contain the Magma Force runtime definition.');
    }
    const start=source.indexOf(DICE_START);
    const keys=source.indexOf(DICE_KEYS,start);
    if(start<0 || keys<0)throw new Error('The v33 DICE definition block could not be located.');
    const safeLiteral=JSON.stringify(catalog).replace(/</g,'\\u003c');
    return source.slice(0,start)
      +`  /* Canonical runtime catalog: /dicefile.json */\n  const __TTD_DICEFILE = ${safeLiteral};\n  const DICE = __TTD_DICEFILE.dice;\n`
      +source.slice(keys);
  }
  function installCatalogHooks(source){
    source=replaceOnce(
      source,
      SKILL_SWITCH,
      `${SKILL_SWITCH}\n      case 'magmaForce': {\n        if(!__TTD_BATTLE_HOOKS.fireMagmaForce(idx, die, d, dmg, dieAff, potencyBonus, isCrit)){\n          die.sinceLastShot = Math.max(die.sinceLastShot, effAtk(die)*0.85);\n        }\n        break;\n      }\n      case 'soulScimitar': {\n        __TTD_BATTLE_HOOKS.fireSoulScimitar(idx, die, d, dmg, dieAff, potencyBonus, isCrit);\n        break;\n      }\n      case 'slitherVine': {\n        __TTD_BATTLE_HOOKS.fireSlitherVine(idx, die, d, dmg, dieAff, potencyBonus, isCrit);\n        break;\n      }`,
      'die skill dispatcher'
    );
    source=replaceOnce(
      source,
      LOOP_TIME,
      `${LOOP_TIME}\n    __TTD_BATTLE_HOOKS.updateMagmaForce(dt);\n    __TTD_BATTLE_HOOKS.updateSoulScimitars(dt);\n    __TTD_BATTLE_HOOKS.updateSlitherVines(dt);`,
      'main battle loop time step'
    );
    if(!source.includes(DRAW_LANE))throw new Error('The battle canvas draw call could not be located.');
    source=source.split(DRAW_LANE).join(`${DRAW_LANE} __TTD_BATTLE_HOOKS.drawSlitherVines(); __TTD_BATTLE_HOOKS.drawSoulScimitars(); __TTD_BATTLE_HOOKS.drawMagmaForceOverlay();`);
    source=replaceOnce(
      source,
      ADVENTURE_SKILLS,
      '      if(state.adventure && !silenced && !e._slitherBlocked) tickMonsterSkills(e, dt);',
      'Adventure enemy skill gate'
    );
    source=replaceOnce(
      source,
      ZOMBIE_SKILLS,
      '        if(!silenced && !e._slitherBlocked) tickZombieSkills(e);',
      'Endless Horde enemy skill gate'
    );
    source=replaceOnce(
      source,
      "    for(const e of state.enemies){\n      if(!e.alive) continue;\n      const groundP = enemyRenderPos(e);",
      "    __TTD_BATTLE_HOOKS.drawMagmaForceGround();\n\n    for(const e of state.enemies){\n      if(!e.alive) continue;\n      const groundP = enemyRenderPos(e);",
      'Magma Force ground draw pass'
    );
    source=replaceOnce(
      source,
      TARGET_LABEL,
      "    const targetLabel = d.special?.kind==='magmaForce' ? 'Random battlefield areas' : ({front:'Frontmost enemy', random:'Random enemy', strongest:'Strongest enemy', fastest:'Fastest enemy (ties: highest current HP)', none:'Does not attack'}[d.target]||d.target);",
      'die detail target label'
    );
    return source;
  }

  // This changes the actual v33 source BEFORE it executes. There is no post-load deck-input
  // override competing with the original event handlers anymore.
  function installMobileDeckRuntime(source){
    source=replaceOnce(
      source,
      "  /* ---------- DECK ---------- */\n  .deckTabs{",
      "  /* ---------- DECK ---------- */\n  /* TTD_MOBILE_DECK_RUNTIME_V14 */\n  #deckScreen.active{display:grid;grid-template-rows:auto auto auto auto minmax(0,1fr) auto;min-height:0;overflow:hidden;}\n  #deckScreen.active > *{min-width:0;}\n  .deckTabs{",
      'deck screen viewport layout'
    );
    source=replaceOnce(
      source,
      "  #collectionGrid{flex:1; padding:12px; display:grid; grid-template-columns:repeat(4,1fr); gap:10px; align-content:start;}",
      "  #collectionGrid{flex:1 1 0; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; padding:12px; display:grid; grid-template-columns:repeat(4,1fr); gap:10px; align-content:start;}\n  #collectionGrid.ttdDiePointerActive{overflow-y:hidden!important;touch-action:none!important;}",
      'collection scroll viewport'
    );
    source=replaceOnce(
      source,
      "    background:var(--ink-850); border:1px solid var(--ink-700); position:relative; touch-action:pan-y;}",
      "    background:var(--ink-850); border:1px solid var(--ink-700); position:relative; touch-action:none; -webkit-user-select:none; user-select:none; -webkit-touch-callout:none;}",
      'collection card touch action'
    );
    source=replaceOnce(
      source,
      "  const LIFT_MS = 1000;   // still-hold required before the die \"lifts\" and becomes draggable\n  const INFO_MS = 1850;   // still-hold required for the spinner to fill and open the info page\n  const MOVE_THRESHOLD = 12; // px of movement outside the small threshold area that cancels the hold",
      "  const LIFT_MS = 360;    // mobile: reserve the pointer immediately, then lift quickly\n  const INFO_MS = 1100;   // stationary long-hold opens die info\n  const MOVE_THRESHOLD = 8; // motion is remembered while waiting for lift; it never becomes scroll",
      'collection gesture timings'
    );

    const replacement=`  function attachInstanceCardEvents(card, key, instId){
    card.draggable = false;
    card.addEventListener('dragstart', ev=>ev.preventDefault());
    card.addEventListener('contextmenu', ev=>ev.preventDefault());
    card.addEventListener('pointerdown', (ev)=>{
      if(ev.isPrimary===false || ev.target.closest?.('.favBtn')) return;
      ev.preventDefault();

      const scrollHost=document.getElementById('collectionGrid');
      const dragState={
        key,instId,active:false,moved:false,cancelled:false,detailFired:false,lifted:false,
        startX:ev.clientX,startY:ev.clientY,lastX:ev.clientX,lastY:ev.clientY,lastDist:0,
        ghostEl:null,srcCard:card,spinnerEl:null,rafId:null,startTime:performance.now(),pointerId:ev.pointerId,
      };
      instDrag=dragState;

      // A pointer that begins on a die belongs to that die for its entire lifetime. Chrome is
      // never allowed to convert a slightly-early vertical drag into collection scrolling.
      scrollHost?.classList.add('ttdDiePointerActive');
      try{card.setPointerCapture(ev.pointerId);}catch(_){}

      const spinner=createHoldSpinner();
      card.appendChild(spinner);
      dragState.spinnerEl=spinner;
      const fillEl=spinner.querySelector('.spinnerFill');

      const removeListeners=()=>{
        card.removeEventListener('pointermove',onMove);
        card.removeEventListener('pointerup',onUp);
        card.removeEventListener('pointercancel',onCancel);
        card.removeEventListener('lostpointercapture',onLost);
        try{if(card.hasPointerCapture?.(dragState.pointerId))card.releasePointerCapture(dragState.pointerId);}catch(_){}
      };
      const unlock=()=>scrollHost?.classList.remove('ttdDiePointerActive');
      const beginDrag=()=>{
        if(instDrag!==dragState || dragState.active || dragState.cancelled || dragState.detailFired)return;
        dragState.moved=true;
        teardownHold(dragState);
        beginInstDrag(card,key,dragState.lastX,dragState.lastY);
      };
      const finishCommon=()=>{
        teardownHold(dragState);
        removeListeners();
        unlock();
        window.__dragKey=null;
        document.querySelectorAll('.dropHover,.mergeHover').forEach(el=>el.classList.remove('dropHover','mergeHover'));
      };

      const tick=()=>{
        if(instDrag!==dragState || dragState.cancelled || dragState.active || dragState.detailFired)return;
        const elapsed=performance.now()-dragState.startTime;
        const progress=Math.min(1,elapsed/INFO_MS);
        if(fillEl)fillEl.style.strokeDashoffset=(SPINNER_CIRC*(1-progress)).toFixed(2);
        if(elapsed>=LIFT_MS && !dragState.lifted){
          dragState.lifted=true;
          card.classList.add('lifting');
          if(navigator.vibrate)navigator.vibrate(12);
          if(dragState.lastDist>MOVE_THRESHOLD){beginDrag();return;}
        }
        if(progress>=1 && dragState.lastDist<=MOVE_THRESHOLD){
          dragState.detailFired=true;
          finishCommon();
          if(instDrag===dragState)instDrag=null;
          showDieDetail(key,{collectionInstId:instId});
          return;
        }
        dragState.rafId=requestAnimationFrame(tick);
      };

      const onMove=(mv)=>{
        if(instDrag!==dragState || dragState.cancelled || dragState.detailFired || mv.pointerId!==dragState.pointerId)return;
        mv.preventDefault();
        dragState.lastX=mv.clientX;
        dragState.lastY=mv.clientY;
        dragState.lastDist=Math.hypot(mv.clientX-dragState.startX,mv.clientY-dragState.startY);
        if(dragState.active){moveInstGhost(mv.clientX,mv.clientY);return;}
        if(dragState.lifted || performance.now()-dragState.startTime>=LIFT_MS){
          beginDrag();
          if(dragState.active)moveInstGhost(mv.clientX,mv.clientY);
        }
        // Before lift we intentionally do nothing except remember position. Scrolling remains locked.
      };
      const onUp=(up)=>{
        if(up.pointerId!==dragState.pointerId)return;
        finishCommon();
        if(instDrag===dragState && dragState.active){
          endInstDrag(up.clientX,up.clientY);
        }else if(instDrag===dragState && !dragState.cancelled && !dragState.detailFired && !dragState.lifted && dragState.lastDist<=MOVE_THRESHOLD){
          quickEquip(key,instId);
        }
        if(instDrag===dragState)instDrag=null;
      };
      const onCancel=()=>{
        dragState.cancelled=true;
        finishCommon();
        if(dragState.active){
          card.classList.remove('dragging');
          dragState.ghostEl?.remove();
        }
        if(instDrag===dragState)instDrag=null;
      };
      const onLost=()=>{if(instDrag===dragState)onCancel();};

      card.addEventListener('pointermove',onMove,{passive:false});
      card.addEventListener('pointerup',onUp);
      card.addEventListener('pointercancel',onCancel);
      card.addEventListener('lostpointercapture',onLost);
      dragState.rafId=requestAnimationFrame(tick);
    },{passive:false});
  }\n`;
    source=replaceSection(
      source,
      '  function attachInstanceCardEvents(card, key, instId){',
      '  function beginInstDrag(card, key, x, y){',
      replacement,
      'collection die pointer handler'
    );
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
    transformed=installCatalogHooks(transformed);
    transformed=installMobileDeckRuntime(transformed);

    const markerIndex=transformed.lastIndexOf(IIFE_END_MARKER);
    if(markerIndex<0)throw new Error('The v33 game closure marker could not be located.');
    // TTD_BATTLE_HOOK_SCOPE_V20: catalog combat functions must remain callable from the
    // transformed core loop. Generic try-block isolation makes strict-mode function declarations
    // block-scoped, which previously killed the first animation frame with ReferenceError.
    const catalogSource=sources[0];
    const soulAssetSource=sources[1];
    const slitherSource=sources[2];
    const isolatedSources=sources.slice(3).map((source,offset)=>{
      const index=offset+3;
      const bridgeLiteral=JSON.stringify(BRIDGES[index]);
      return `\ntry {\n${source}\n} catch (__ttdBridgeErr) {\n  console.error('Online bridge '+${bridgeLiteral}+' failed without blocking later bridges.',__ttdBridgeErr);\n  try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:${bridgeLiteral},message:String(__ttdBridgeErr?.message||__ttdBridgeErr)}, location.origin); } catch (_) {}\n}\n`;
    });
    const battleHookSubsystem=`
  const __TTD_BATTLE_HOOKS = {
    fireMagmaForce(){return false;}, updateMagmaForce(){}, drawMagmaForceGround(){}, drawMagmaForceOverlay(){},
    fireSoulScimitar(){}, updateSoulScimitars(){}, drawSoulScimitars(){},
    fireSlitherVine(){}, updateSlitherVines(){}, drawSlitherVines(){}
  };
  try {
${catalogSource}
    Object.assign(__TTD_BATTLE_HOOKS,{fireMagmaForce,updateMagmaForce,drawMagmaForceGround,drawMagmaForceOverlay,fireSoulScimitar,updateSoulScimitars,drawSoulScimitars});
    try {
${soulAssetSource}
    } catch (__ttdSoulAssetErr) {
      console.error('Soul Saber exact-art extension failed; base combat hooks remain available.',__ttdSoulAssetErr);
      try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/soul-scimitar-svg-v14.js?v=14',message:String(__ttdSoulAssetErr?.message||__ttdSoulAssetErr)}, location.origin); } catch (_) {}
    }
  } catch (__ttdSoulCatalogErr) {
    console.error('Soul Saber catalog combat extension failed; no-op hooks preserve the battle loop.',__ttdSoulCatalogErr);
    try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/dice-catalog-bridge-v8.js?v=8',message:String(__ttdSoulCatalogErr?.message||__ttdSoulCatalogErr)}, location.origin); } catch (_) {}
  }
  try {
${slitherSource}
    Object.assign(__TTD_BATTLE_HOOKS,{fireSlitherVine,updateSlitherVines,drawSlitherVines});
  } catch (__ttdSlitherErr) {
    console.error('Slither Vine combat extension failed; no-op hooks preserve the battle loop.',__ttdSlitherErr);
    try { window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-runtime-error',bridge:'/online/slither-vine-bridge-v8.js?v=8',message:String(__ttdSlitherErr?.message||__ttdSlitherErr)}, location.origin); } catch (_) {}
  }
`;
    transformed=transformed.slice(0,markerIndex)
      +'\n\n  /* ================= ONLINE CLOUD COMPLETION BRIDGES ================= */\n'
      +battleHookSubsystem
      +'\n'
      +isolatedSources.join('\n')
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