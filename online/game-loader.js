(() => {
  'use strict';
  const ORIGIN=location.origin;
  const GAME_PATH='/random-dice-game-33.html?v=35';
  const DICE_PATH='/dicefile.json?v=2';

  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  async function loadText(url){
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}.`);
    return response.text();
  }
  function validateCanonicalCatalog(catalog){
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
  }

  async function boot(){
    send('ttd:bridge-phase',{phase:'loader-started',message:'Preparing complete cloud game…'});
    const [gameHtml,catalogText]=await Promise.all([loadText(GAME_PATH),loadText(DICE_PATH)]);
    let catalog;
    try{catalog=JSON.parse(catalogText);}catch(err){throw new Error(`dicefile.json is invalid JSON: ${err.message}`);}
    validateCanonicalCatalog(catalog);
    window.__TTD_DICEFILE=catalog;

    send('ttd:bridge-phase',{phase:'assets-loaded',message:'Game source and canonical dice catalog loaded…'});
    send('ttd:bridge-phase',{phase:'document-ready',message: `Starting cloud-authoritative game with ${Object.keys(catalog.dice).length} catalog dice…`});
    document.open();
    document.write(gameHtml);
    document.close();
  }

  boot().catch((err)=>{
    console.error('Online game loader failed.',err);
    send('ttd:bridge-sync-error',{message: `Could not start online gameplay: ${err?.message||'unknown loader error'}`});
  });
})();