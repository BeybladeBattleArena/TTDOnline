(() => {
  'use strict';
  const ORIGIN=location.origin;
  const GAME_PATH='/random-dice-game-33.html?v=35';
  const DICE_PATH='/dicefile.json?v=2';
  const CANON_CRIT_BROKEN='getCritMultiplier()';
  const CANON_CRIT_FIXED="(1.8+dieJewelBonus(die,'critBoost'))";

  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  async function loadText(url){const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}.`);return response.text();}
  function validateCanonicalCatalog(catalog){
    if(!catalog || catalog.schemaVersion!==1 || !catalog.dice || typeof catalog.dice!=='object')throw new Error('dicefile.json is missing a supported canonical dice catalog.');
    if(!catalog.dice.soulscimitar || catalog.dice.soulscimitar?.special?.kind!=='soulScimitar')throw new Error('dicefile.json does not contain the Soul Scimitar runtime definition.');
    if(!catalog.dice.slithervine || catalog.dice.slithervine?.special?.kind!=='slitherVine')throw new Error('dicefile.json does not contain the Slither Vine runtime definition.');
    if(!catalog.dice.magmaforce || catalog.dice.magmaforce?.special?.kind!=='magmaForce')throw new Error('dicefile.json does not contain the Magma Force runtime definition.');
  }
  function applyNativeRuntimeTransforms(source){
    // The game client executes inside its own IIFE. Canonical combat helpers therefore are not
    // writable from a post-document sidecar. Repair the one stale critical-multiplier reference
    // in the fetched source before document.write() executes that IIFE.
    const critRefs=source.split(CANON_CRIT_BROKEN).length-1;
    if(critRefs!==1)throw new Error(`Canonical crit transform expected exactly one legacy reference; found ${critRefs}.`);
    const transformed=source.replace(CANON_CRIT_BROKEN,CANON_CRIT_FIXED);
    if(transformed.includes(CANON_CRIT_BROKEN))throw new Error('Canonical crit transform left a legacy multiplier reference behind.');
    return transformed;
  }
  function loadPostDocumentScript(path,id){
    if(document.getElementById(id))return;
    const script=document.createElement('script');
    script.id=id;
    script.src=typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;
    script.async=false;
    script.onerror=()=>console.error(`Could not load required post-document runtime ${path}.`);
    document.head.appendChild(script);
  }

  async function boot(){
    send('ttd:bridge-phase',{phase:'loader-started',message:'Preparing complete cloud game…'});
    const [rawGameHtml,catalogText]=await Promise.all([loadText(GAME_PATH),loadText(DICE_PATH)]);
    const gameHtml=applyNativeRuntimeTransforms(rawGameHtml);
    let catalog;
    try{catalog=JSON.parse(catalogText);}catch(err){throw new Error(`dicefile.json is invalid JSON: ${err.message}`);}
    validateCanonicalCatalog(catalog);
    window.__TTD_DICEFILE=catalog;

    send('ttd:bridge-phase',{phase:'assets-loaded',message:'Game source and canonical dice catalog loaded…'});
    send('ttd:bridge-phase',{phase:'document-ready',message:`Starting cloud-authoritative game with ${Object.keys(catalog.dice).length} catalog dice…`});
    document.open();
    document.write(gameHtml);
    document.close();

    loadPostDocumentScript('/online/enchant-card-art-v1.js?v=4','ttdEnchantCardArtV4NativeScript');
    loadPostDocumentScript('/online/jewel-picker-ux-v1.js?v=1','ttdJewelPickerUxV1NativeScript');

    // These are the canonical files for jewel presentation and Collection layout.
    // They are edited directly; no presentation patch/sidecar is required.
    loadPostDocumentScript('/online/jewel-art-inventory-v1.js?v=3','ttdJewelArtInventoryV3NativeScript');
    loadPostDocumentScript('/online/collection-portrait-fit-v16.js?v=23','ttdCollectionAuthorityV23NativeScript');
  }

  boot().catch((err)=>{
    console.error('Online game loader failed.',err);
    send('ttd:bridge-sync-error',{message:`Could not start online gameplay: ${err?.message||'unknown loader error'}`});
  });
})();