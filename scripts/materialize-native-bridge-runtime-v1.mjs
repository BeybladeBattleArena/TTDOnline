import fs from 'node:fs';

const gamePath='random-dice-game-33.html';
const loaderPath='online/game-loader.js';
let game=fs.readFileSync(gamePath,'utf8');
const loader=fs.readFileSync(loaderPath,'utf8');

if(game.includes('TTD_NATIVE_BRIDGE_API_V1'))throw new Error('Native bridge compatibility facade is already materialized.');
if(!game.includes('TTD_NATIVE_DICEFILE_V1'))throw new Error('Native dicefile handoff must be materialized first.');
if(!loader.includes('const isolatedSources=sources.slice(3).map'))throw new Error('Expected legacy lexical bridge injection is not present.');

const readOnly=['ADVENTURES','DICE','DICE_LORE','ENCHANT_CARDS','GLYPHS','JEWEL_DEFS','MAX_JEWEL_TIER','PU_COSTS','__TTD_DICEFILE','aliveEnemies','applySilence','applySlow','beginDrag','beginInstDrag','buildBoardDOM','buildPath','cardSVG','chestSVG','classMultFor','classMultFromLevel','createHoldSpinner','ctx','cw','damageEnemy','deckEntryKey','dieJewelBonus','effAffinities','effAtk','effDmg','enchantTarget','endDrag','endInstDrag','enemyElementalMult','enemyRenderPos','findInstance','fx','gemSVG','getActiveDeck','getBonusChestChance','getKeyCount','healDie','hideEnchantAttempt','hideItemDetail','hideJewelPicker','highlightDrop','isFavoriteInstance','jewelDisplayName','jewelEffectText','jewelTierValue','keySVG','loop','modeLabel','moveGhost','moveInstGhost','pathPts','pickTarget','playEnchantAnimation','quickEquip','renderCollectionGrid','renderEnchantScreen','renderGachaTop','renderHome','renderItemDetailView','renderOptionsScreen','renderPullCard','renderShopScreen','showDieDetail','showNotice','slottedClassOf','startLift','state','statusResistDuration','statusRoll','teardownHold','tileEls','toast','toastGlobal','triggerTilePulse'];
const writable=['account','attachInstanceCardEvents','attachTileEvents','campaignComplete','currentAttackerDieKey','dieDamage','drag','drawLane','endEndlessHorde','endMatch','instDrag','invActiveTab','isAsclepiusReady','lastT','mergeInstances','openEnchantAttempt','openJewelPicker','playClassUpAnimation','renderBoard','renderDeckScreen','renderGlyph','renderInventoryScreen','saveAccount','shopItemView','showBuyConfirm','showItemDetail','showScreen','showSellConfirm','startAdventure','startAdventureCampaign','startEndlessHorde','startGame','tapTile','tickTile','triggerAsclepiusHeal','tryMergeAtPoint','updatePlayerShots'];

const exposureLines=[
  ...readOnly.map((name)=>`  __ttdExposeCore('${name}',()=>${name});`),
  ...writable.map((name)=>`  __ttdExposeCore('${name}',()=>${name},(value)=>{${name}=value;});`),
].join('\n');

const facade=`
  /* ============================ TTD_NATIVE_BRIDGE_API_V1 ============================
     Stable compatibility surface for committed bridge scripts. These accessors preserve the
     exact live core bindings that the legacy loader previously exposed by injecting bridge source
     into this IIFE. Read-only dependencies remain getter-only; intentional overrides receive a
     setter back to the original lexical binding. */
  const __TTD_BATTLE_HOOKS = window.__TTD_BATTLE_HOOKS = {
    fireMagmaForce(){return false;}, updateMagmaForce(){}, drawMagmaForceGround(){}, drawMagmaForceOverlay(){},
    fireSoulScimitar(){}, updateSoulScimitars(){}, drawSoulScimitars(){},
    fireSlitherVine(){}, updateSlitherVines(){}, drawSlitherVines(){}
  };
  const __ttdCoreApi={};
  function __ttdExposeCore(name,get,set){
    const globalDescriptor={configurable:true,enumerable:false,get};
    if(set)globalDescriptor.set=set;
    Object.defineProperty(window,name,globalDescriptor);
    const apiDescriptor={configurable:false,enumerable:true,get};
    if(set)apiDescriptor.set=set;
    Object.defineProperty(__ttdCoreApi,name,apiDescriptor);
  }
${exposureLines}
  window.__TTD_CORE_API_V1=Object.freeze(__ttdCoreApi);

  let __ttdBridgeReadyResolve;
  let __ttdBridgeReadyMarked=false;
  window.__TTD_BRIDGES_READY=new Promise((resolve)=>{__ttdBridgeReadyResolve=resolve;});
  window.__TTD_MARK_BRIDGES_READY=()=>{
    if(__ttdBridgeReadyMarked)return;
    __ttdBridgeReadyMarked=true;
    __ttdBridgeReadyResolve();
  };
  const __ttdBridgeBootstrap=document.createElement('script');
  __ttdBridgeBootstrap.src=typeof window.__TTD_ASSET_URL==='function'
    ? window.__TTD_ASSET_URL('/online/runtime-bridge-loader-v1.js')
    : '/online/runtime-bridge-loader-v1.js?v=1';
  __ttdBridgeBootstrap.async=true;
  __ttdBridgeBootstrap.onerror=()=>{
    const error=new Error('Could not load the native runtime bridge loader.');
    console.error(error);
    try{window.parent?.postMessage({type:'ttd:bridge-phase',phase:'bridge-loader-error',bridge:'/online/runtime-bridge-loader-v1.js',message:error.message},location.origin);}catch(_){}
    window.__TTD_MARK_BRIDGES_READY();
  };
  document.head.appendChild(__ttdBridgeBootstrap);

`;

const loadMarker='account = await loadAccount();';
const loadIndex=game.lastIndexOf(loadMarker);
const bootstrapStart=loadIndex>=0?game.lastIndexOf('(async()=>{',loadIndex):-1;
const showHomeMarker="showScreen('home');";
const showHomeIndex=loadIndex>=0?game.indexOf(showHomeMarker,loadIndex):-1;
const bootstrapEnd=showHomeIndex>=0?game.indexOf('})();',showHomeIndex):-1;
if(loadIndex<0 || bootstrapStart<0 || showHomeIndex<0 || bootstrapEnd<0 || bootstrapStart>loadIndex || showHomeIndex-bootstrapStart>1600 || bootstrapEnd-showHomeIndex>600){
  throw new Error('Could not locate the canonical account/home startup boundary structurally.');
}
const bootstrapPrefix=game.slice(bootstrapStart,showHomeIndex);
if(bootstrapPrefix.includes('await window.__TTD_BRIDGES_READY'))throw new Error('Native bridge startup gate is already present.');
game=game.slice(0,bootstrapStart)
  +facade
  +game.slice(bootstrapStart,showHomeIndex)
  +'await window.__TTD_BRIDGES_READY;\n    '
  +game.slice(showHomeIndex);

const simpleLoader=`(() => {
  'use strict';
  const ORIGIN=location.origin;
  const GAME_PATH='/random-dice-game-33.html?v=35';
  const DICE_PATH='/dicefile.json?v=2';

  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  async function loadText(url){
    const response=await fetch(url,{cache:'force-cache'});
    if(!response.ok)throw new Error(\`${'${url}'} returned HTTP ${'${response.status}'}.\`);
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
    try{catalog=JSON.parse(catalogText);}catch(err){throw new Error(\`dicefile.json is invalid JSON: ${'${err.message}'}\`);}
    validateCanonicalCatalog(catalog);
    window.__TTD_DICEFILE=catalog;

    send('ttd:bridge-phase',{phase:'assets-loaded',message:'Game source and canonical dice catalog loaded…'});
    send('ttd:bridge-phase',{phase:'document-ready',message: \`Starting cloud-authoritative game with ${'${Object.keys(catalog.dice).length}'} catalog dice…\`});
    document.open();
    document.write(gameHtml);
    document.close();
  }

  boot().catch((err)=>{
    console.error('Online game loader failed.',err);
    send('ttd:bridge-sync-error',{message: \`Could not start online gameplay: ${'${err?.message||\'unknown loader error\'}'}\`});
  });
})();`;

for(const marker of ['TTD_NATIVE_BRIDGE_API_V1','window.__TTD_CORE_API_V1=Object.freeze(__ttdCoreApi);','await window.__TTD_BRIDGES_READY;']){
  if(!game.includes(marker))throw new Error(`Native bridge facade materialization failed: ${marker}`);
}
for(const forbidden of ['const BRIDGES=[','IIFE_END_MARKER','isolatedSources','battleHookSubsystem','catalogSource=sources','soulAssetSource=sources','slitherSource=sources','document.write(transformed)']){
  if(simpleLoader.includes(forbidden))throw new Error(`Simple loader unexpectedly retained source assembly: ${forbidden}`);
}

fs.writeFileSync(gamePath,game);
fs.writeFileSync(loaderPath,simpleLoader);
console.log(`Materialized ${readOnly.length} read-only and ${writable.length} writable live core bridge bindings; removed all bridge-source assembly from online/game-loader.js.`);
