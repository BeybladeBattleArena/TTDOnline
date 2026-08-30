(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_BATTLE_HUD_V1)return;
  window.__TTD_MOVING_SCREEN_BATTLE_HUD_V1=true;

  const BAR_ID='ttdMsBattleBarV1';
  let lastDeckSig='',lastOdSig='';
  function api(){return window.TTDMovingScreen||null;}
  function deck(){try{return typeof getActiveDeck==='function'?getActiveDeck():[];}catch(_){return[];}}
  function dieDef(key){try{return typeof DICE!=='undefined'?DICE?.[key]:null;}catch(_){return null;}}
  function pair(){try{const p=window.__TTD_OVERDRIVE?.equipped?.();if(Array.isArray(p))return p;}catch(_){}try{const idx=Math.max(0,Number(account?.activeDeckIdx)||0),p=account?.overdriveDecks?.[idx];if(Array.isArray(p))return p;}catch(_){}return[null,null];}
  function odCatalog(){try{return window.__TTD_OVERDRIVE?.catalog?.()?.dice||{};}catch(_){return{};}}
  function keyOf(entry){return typeof entry==='string'?entry:entry?.key||null;}
  function glyphMarkup(key){const d=dieDef(key);try{if(d?.glyph&&typeof renderGlyph==='function')return renderGlyph(d.glyph);}catch(_){}return `<span>${String(d?.name||key||'?').slice(0,1)}</span>`;}
  function openDie(key){try{if(typeof showDieDetail==='function'){showDieDetail(key,{source:'moving-screen'});return;}}catch(error){console.error(error);}try{toastGlobal?.('Die details are unavailable right now');}catch(_){}}

  function installStyle(){if(document.getElementById('ttdMsBattleHudStyleV1'))return;const style=document.createElement('style');style.id='ttdMsBattleHudStyleV1';style.textContent=`
    #ttdMsLoadoutRailV1{display:none!important}
    #gameScreen.ttd-moving-screen-v4 #tray>#${BAR_ID}{display:flex!important;visibility:visible!important;pointer-events:auto!important}
    #gameScreen.ttd-moving-screen-v4 #ttdMsControlsV4{grid-template-columns:minmax(0,1fr)!important;min-height:50px!important;padding:5px 7px 3px!important;gap:3px!important}
    #gameScreen.ttd-moving-screen-v4 #ttdMsButtonsV4{display:none!important}
    #${BAR_ID}{position:relative;z-index:32;align-items:stretch;gap:4px;width:100%;padding:4px 7px max(6px,env(safe-area-inset-bottom));background:linear-gradient(180deg,#0b1020,#060914);border-top:1px solid rgba(85,216,255,.16);min-height:58px;overflow:hidden}
    #${BAR_ID} button{appearance:none;touch-action:manipulation;font-family:'Russo One',sans-serif;border-radius:9px;min-width:0;color:#eef3ff}
    .ttdMsDeckInfoV1{flex:1 1 0;position:relative;border:1px solid rgba(143,196,232,.34);background:linear-gradient(160deg,#202844,#11172a);padding:3px;overflow:hidden}
    .ttdMsDeckInfoV1 .ico{display:flex;align-items:center;justify-content:center;height:28px}.ttdMsDeckInfoV1 .ico svg{width:22px;height:22px}.ttdMsDeckInfoV1 .num{position:absolute;left:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#080b15;color:#d4ecfa;font:700 6px 'Space Mono',monospace;display:grid;place-items:center}.ttdMsDeckInfoV1 .name{display:block;font-size:5.5px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#bfc8df;text-align:center}
    .ttdMsOdButtonV1{flex:0 0 42px;border:1px solid #237eb8;background:linear-gradient(180deg,#172c49,#0a1728);padding:3px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px}.ttdMsOdButtonV1 .slot{font-size:7px;color:#8fdcff}.ttdMsOdButtonV1 .cost{font:700 6px 'Space Mono',monospace;color:#d4ecfa}.ttdMsOdButtonV1:disabled{opacity:.4;filter:saturate(.5)}
    #ttdMsSummonV4.ttdMsSummonBottomV1{display:block!important;flex:0 0 70px;min-width:70px!important;min-height:50px!important;height:auto!important;border-radius:10px!important;padding:4px!important;font:400 9px 'Russo One',sans-serif!important}
    #ttdMsDriveMiniV1{position:absolute;left:7px;right:7px;top:0;height:2px;background:rgba(255,255,255,.08);overflow:hidden}#ttdMsDriveMiniV1>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8b7fe8,#55d8ff);transition:width .16s linear}
    @media(max-width:380px){#${BAR_ID}{gap:3px;padding-left:4px;padding-right:4px}.ttdMsOdButtonV1{flex-basis:39px}#ttdMsSummonV4.ttdMsSummonBottomV1{flex-basis:64px;min-width:64px!important}.ttdMsDeckInfoV1 .name{display:none}}
  `;document.head.appendChild(style);}

  function ensureBar(){installStyle();if(!api()?.active)return null;const tray=document.getElementById('tray');if(!tray)return null;let bar=document.getElementById(BAR_ID);if(!bar){bar=document.createElement('div');bar.id=BAR_ID;bar.innerHTML='<div id="ttdMsDriveMiniV1"><i></i></div>';tray.appendChild(bar);lastDeckSig='';lastOdSig='';}return bar;}
  function build(bar){const d=deck().slice(0,5),p=pair(),deckSig=d.map((e)=>keyOf(e)).join('|'),odSig=p.map(keyOf).join('|');if(deckSig===lastDeckSig&&odSig===lastOdSig&&bar.querySelectorAll('.ttdMsDeckInfoV1').length===d.length)return;lastDeckSig=deckSig;lastOdSig=odSig;const drive=bar.querySelector('#ttdMsDriveMiniV1');bar.innerHTML='';if(drive)bar.appendChild(drive);else{const m=document.createElement('div');m.id='ttdMsDriveMiniV1';m.innerHTML='<i></i>';bar.appendChild(m);}const addOd=(index)=>{const key=keyOf(p[index]),def=odCatalog()[key];const b=document.createElement('button');b.type='button';b.className='ttdMsOdButtonV1';b.dataset.od=String(index);b.title=def?.name||`Overdrive ${index+1}`;b.innerHTML=`<span class="slot">OD${index+1}</span><span class="cost">${def?`${Number(def.dpCost)||0} DP`:'EMPTY'}</span>`;b.addEventListener('click',()=>api()?.activateOverdriveSlot?.(index));bar.appendChild(b);};addOd(0);d.forEach((entry,index)=>{const key=keyOf(entry),def=dieDef(key),b=document.createElement('button');b.type='button';b.className='ttdMsDeckInfoV1';b.dataset.key=key||'';b.title=`${def?.name||key||'Die'} · View info`;b.innerHTML=`<span class="num">${index+1}</span><span class="ico">${glyphMarkup(key)}</span><span class="name">${def?.name||key||'Die'}</span>`;b.addEventListener('click',()=>key&&openDie(key));bar.appendChild(b);});const summon=document.getElementById('ttdMsSummonV4');if(summon){summon.classList.add('ttdMsSummonBottomV1');bar.appendChild(summon);}addOd(1);}
  function sync(){const bar=ensureBar();if(!bar){document.getElementById(BAR_ID)?.remove();return;}build(bar);const s=api()?.state,od=s?.od||{};const fill=bar.querySelector('#ttdMsDriveMiniV1>i');if(fill)fill.style.width=`${Math.max(0,Math.min(100,(Number(od.drive)||0)/Math.max(1,Number(od.driveMax)||100)*100))}%`;const p=pair(),defs=odCatalog();bar.querySelectorAll('.ttdMsOdButtonV1').forEach((b)=>{const index=Number(b.dataset.od)||0,key=keyOf(p[index]),def=defs[key],ready=!!key&&Number(od.drive)>=Number(od.driveMax)-.001&&Number(od.dp)>=Number(def?.dpCost||Infinity);b.disabled=!ready;b.setAttribute('aria-label',`${def?.name||`Overdrive ${index+1}`} · ${Number(od.dp)||0} DP available${ready?' · ready':''}`);});}
  setInterval(sync,120);sync();
})();