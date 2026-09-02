(() => {
  'use strict';
  const ORIGIN=location.origin;
  const GAME_PATH='/random-dice-game-33.html?v=35';
  const DICE_PATH='/dicefile.json?v=2';

  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  async function loadText(url){const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error(`${url} returned HTTP ${response.status}.`);return response.text();}
  function validateCanonicalCatalog(catalog){
    if(!catalog || catalog.schemaVersion!==1 || !catalog.dice || typeof catalog.dice!=='object')throw new Error('dicefile.json is missing a supported canonical dice catalog.');
    if(!catalog.dice.soulscimitar || catalog.dice.soulscimitar?.special?.kind!=='soulScimitar')throw new Error('dicefile.json does not contain the Soul Scimitar runtime definition.');
    if(!catalog.dice.slithervine || catalog.dice.slithervine?.special?.kind!=='slitherVine')throw new Error('dicefile.json does not contain the Slither Vine runtime definition.');
    if(!catalog.dice.magmaforce || catalog.dice.magmaforce?.special?.kind!=='magmaForce')throw new Error('dicefile.json does not contain the Magma Force runtime definition.');
  }
  function loadPostDocumentScript(path,id){if(document.getElementById(id))return;const script=document.createElement('script');script.id=id;script.src=typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;script.async=false;script.onerror=()=>console.error(`Could not load required post-document runtime ${path}.`);document.head.appendChild(script);}
  async function boot(){
    send('ttd:bridge-phase',{phase:'loader-started',message:'Preparing complete cloud game…'});
    const [gameHtml,catalogText]=await Promise.all([loadText(GAME_PATH),loadText(DICE_PATH)]);let catalog;try{catalog=JSON.parse(catalogText);}catch(err){throw new Error(`dicefile.json is invalid JSON: ${err.message}`);}validateCanonicalCatalog(catalog);window.__TTD_DICEFILE=catalog;
    send('ttd:bridge-phase',{phase:'assets-loaded',message:'Game source and canonical dice catalog loaded…'});send('ttd:bridge-phase',{phase:'document-ready',message:`Starting cloud-authoritative game with ${Object.keys(catalog.dice).length} catalog dice…`});document.open();document.write(gameHtml);document.close();
    loadPostDocumentScript('/online/enchant-card-art-v1.js?v=4','ttdEnchantCardArtV4NativeScript');
    // Jewel art/inventory V2 binds approved PNG art to all 12 stat jewels and all 12 elemental jewels,
    // mirrors socketed ownership into Enchant inventory, decorates sockets/collection cards, and
    // keeps regular/Overdrive collection cards contained without overlap.
    loadPostDocumentScript('/online/jewel-art-inventory-v1.js?v=2','ttdJewelArtInventoryV2Script');
    // V3 is a final presentation guard: it watches the live inventory/detail DOM (including nodes
    // created after boot), replaces any surviving generated gem SVGs with the PNG assets, removes
    // edge-connected dark matte backgrounds without damaging dark gem interiors, and supersamples
    // small source art for cleaner mobile rendering.
    loadPostDocumentScript('/online/jewel-art-inventory-v3.js?v=1','ttdJewelArtInventoryV3Script');
    // Final collection box authority for both normal and Overdrive cards. It deliberately uses
    // stronger selectors than legacy portrait rules so no later bridge can reintroduce overlap.
    loadPostDocumentScript('/online/collection-card-containment-v1.js?v=1','ttdCollectionCardContainmentV1Script');
  }
  boot().catch((err)=>{console.error('Online game loader failed.',err);send('ttd:bridge-sync-error',{message:`Could not start online gameplay: ${err?.message||'unknown loader error'}`});});
})();
