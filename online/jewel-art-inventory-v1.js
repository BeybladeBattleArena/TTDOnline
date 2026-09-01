(() => {
  'use strict';
  if (window.__TTD_JEWEL_ART_INVENTORY_V2) return;
  window.__TTD_JEWEL_ART_INVENTORY_V2 = true;

  const ART = Object.freeze({
    'power': {name:'Ruby of Power', asset:'/assets/items/jewel-ruby-power.png'},
    'cooldown': {name:'Citrine of Cooldown Reduction', asset:'/assets/items/jewel-citrine-cooldown.png'},
    'physDef': {name:'Onyx of Physical Defense', asset:'/assets/items/jewel-onyx-physical-defense.png'},
    'specDef': {name:'Amethyst of Special Defense', asset:'/assets/items/jewel-amethyst-special-defense.png'},
    'hp': {name:'Garnet of HP', asset:'/assets/items/jewel-garnet-hp.png'},
    'critChance': {name:'Spinel of Crit Chance', asset:'/assets/items/jewel-spinel-crit-chance.png'},
    'critBoost': {name:'Bloodstone of Crit Boost', asset:'/assets/items/jewel-bloodstone-crit-boost.png'},
    'spGen': {name:'Aquamarine of Passive SP Gen', asset:'/assets/items/jewel-aquamarine-sp-gen.png'},
    'experience': {name:'Peridot of Experience', asset:'/assets/items/jewel-peridot-experience.png'},
    'luck': {name:'Moonstone of Luck', asset:'/assets/items/jewel-moonstone-luck.png'},
    'insight': {name:'Opal of Insight', asset:'/assets/items/jewel-opal-insight.png'},
    'potency': {name:'Tourmaline of Potency', asset:'/assets/items/jewel-tourmaline-potency.png'},
    'elem_fire': {name:'Gemstone of Fire', asset:'/assets/items/jewel-element-fire.png'},
    'elem_ice': {name:'Gemstone of Ice', asset:'/assets/items/jewel-element-ice.png'},
    'elem_wind': {name:'Gemstone of Wind', asset:'/assets/items/jewel-element-wind.png'},
    'elem_lightning': {name:'Gemstone of Lightning', asset:'/assets/items/jewel-element-lightning.png'},
    'elem_water': {name:'Gemstone of Water', asset:'/assets/items/jewel-element-water.png'},
    'elem_earth': {name:'Gemstone of Earth', asset:'/assets/items/jewel-element-earth.png'},
    'elem_metal': {name:'Gemstone of Metal', asset:'/assets/items/jewel-element-metal.png'},
    'elem_nature': {name:'Gemstone of Nature', asset:'/assets/items/jewel-element-nature.png'},
    'elem_poison': {name:'Gemstone of Poison', asset:'/assets/items/jewel-element-poison.png'},
    'elem_holy': {name:'Gemstone of Holy', asset:'/assets/items/jewel-element-holy.png'},
    'elem_shadow': {name:'Gemstone of Shadow', asset:'/assets/items/jewel-element-shadow.png'},
    'elem_arcane': {name:'Gemstone of Arcane', asset:'/assets/items/jewel-element-arcane.png'},
  });
  const ART_ENTRIES = Object.entries(ART);
  const asset = (path) => typeof window.__TTD_ASSET_URL === 'function' ? window.__TTD_ASSET_URL(path) : path;
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const infoFor = (jewelId) => ART[jewelId] || null;
  const tierFor = (tier) => Math.max(1, Math.min(5, Number(tier) || 1));
  const nameFor = (jewelId, tier) => infoFor(jewelId) ? `${infoFor(jewelId).name} +${tierFor(tier)}` : '';
  function idFromText(text) {
    const normalized = String(text || '').toLowerCase();
    for (const [id, info] of ART_ENTRIES) if (normalized.includes(info.name.toLowerCase())) return id;
    return null;
  }
  function makeImg(jewelId, cls='ttdJewelArt') {
    const info=infoFor(jewelId); if(!info) return null;
    const img=document.createElement('img'); img.className=cls; img.src=asset(info.asset); img.alt=info.name; img.draggable=false; return img;
  }
  function imgMarkup(jewelId, cls='ttdJewelArt') {
    const info=infoFor(jewelId); if(!info) return '';
    return `<img class="${esc(cls)}" src="${esc(asset(info.asset))}" alt="${esc(info.name)}" draggable="false">`;
  }
  function replaceGeneratedGem(container,jewelId,cls='ttdJewelArt') {
    if(!container || !infoFor(jewelId)) return;
    const existing=container.querySelector('img.ttdJewelArt, img.ttdJewelChoiceArt');
    if(existing){ if(existing.dataset.ttdJewelId===jewelId) return; existing.remove(); }
    container.querySelector('svg')?.remove();
    const img=makeImg(jewelId,cls); if(img){ img.dataset.ttdJewelId=jewelId; container.prepend(img); }
  }

  const style=document.createElement('style'); style.id='ttd-jewel-art-inventory-v2-style';
  style.textContent=`
    .ttdJewelArt,.ttdJewelChoiceArt,.ttdJewelRail img{display:block;object-fit:contain;pointer-events:none;user-select:none;-webkit-user-drag:none;}
    .chestCard.jewelCard>.ttdJewelArt{width:54px;height:54px;margin-bottom:6px;border-radius:8px;image-rendering:auto;}
    .glyphBig>.ttdJewelArt{width:82%;height:82%;border-radius:10px;}
    .enchantSlot.filled>.ttdJewelArt{width:68%;height:68%;border-radius:50%;}
    .enchantCardOption{gap:8px;min-width:0;text-align:left;}
    .enchantCardOption>.ttdJewelChoiceArt{width:28px;height:28px;flex:0 0 28px;border-radius:6px;}
    .ttdSocketedJewelMirror{position:relative;cursor:default!important;min-height:104px;}
    .ttdSocketedJewelMirror .ttdSocketedBadge{position:absolute;left:6px;top:6px;border:1px solid var(--moss);border-radius:5px;background:rgba(10,12,20,.88);color:#bfe6c9;padding:1px 4px;font:700 6.5px 'Space Mono',monospace;letter-spacing:.03em;}
    .ttdSocketedJewelMirror .cdiff{font-size:8px;line-height:1.25;color:var(--mist-dim);max-width:100%;overflow-wrap:anywhere;}
    #collectionGrid{gap:12px!important;grid-auto-rows:minmax(82px,auto)!important;}
    #collectionGrid>.colCard{box-sizing:border-box!important;min-width:0!important;min-height:82px!important;margin:0!important;overflow:hidden!important;isolation:isolate;}
    #collectionGrid>.colCard .favBtn{top:2px!important;right:2px!important;}
    #collectionGrid>.colCard .clsBadge{top:2px!important;left:2px!important;}
    #collectionGrid>.colCard .deckMark{right:3px!important;bottom:3px!important;}
    #collectionGrid>.colCard .holdSpinner{top:2px!important;right:28px!important;height:26px!important;}
    #collectionGrid>.ttdOdCard .ttdOdCostBadge{right:2px!important;bottom:2px!important;}
    #collectionGrid>.ttdOdCard{padding-left:5px!important;padding-right:5px!important;}
    #collectionGrid>.colCard.ttdHasJewels{padding-left:16px!important;}
    .ttdJewelRail{position:absolute;left:2px;top:19px;bottom:5px;z-index:6;display:flex;flex-direction:column;justify-content:flex-start;gap:2px;width:13px;pointer-events:none;}
    .ttdJewelRail .ttdJewelPip{position:relative;width:13px;height:13px;flex:0 0 13px;border-radius:4px;overflow:visible;background:#080b13;border:1px solid rgba(255,255,255,.18);box-shadow:0 1px 3px rgba(0,0,0,.45);}
    .ttdJewelRail img{width:100%;height:100%;border-radius:3px;}
    .ttdJewelRail b{position:absolute;right:-2px;bottom:-3px;min-width:8px;height:8px;line-height:7px;padding:0 1px;border-radius:3px;background:#080b13;border:1px solid var(--gold);color:var(--gold-glow);font:700 5px 'Space Mono',monospace;text-align:center;}
    @media(max-width:420px){#collectionGrid{gap:9px!important;padding:10px!important;}#collectionGrid>.colCard{min-height:80px!important;}#collectionGrid>.colCard.ttdHasJewels{padding-left:15px!important;}}
  `; document.head.appendChild(style);

  function accountRef(){try{return window.account||null;}catch(_){return null;}}
  function looseJewelById(id){const a=accountRef(),l=a?.inventory?.enchant;return Array.isArray(l)?l.find(i=>i?.kind==='jewel'&&i.id===id)||null:null;}
  const dieDisplayName=(key)=>window.__TTD_DICEFILE?.dice?.[key]?.name||key||'Die';
  function socketedJewels(){
    const owned=accountRef()?.owned;if(!owned||typeof owned!=='object')return[];const rows=[];
    for(const [key,instances] of Object.entries(owned)){if(!Array.isArray(instances))continue;for(const inst of instances){if(!Array.isArray(inst?.enchants))continue;inst.enchants.forEach((jewel,slotIdx)=>{if(jewel&&infoFor(jewel.jewelId))rows.push({key,inst,jewel,slotIdx});});}}
    return rows;
  }
  function decorateLooseInventoryJewels(){
    const grid=document.getElementById('invGrid');if(!grid)return;
    grid.querySelectorAll('.jewelCard:not(.ttdSocketedJewelMirror)').forEach(card=>{const id=idFromText(card.querySelector('.cname')?.textContent||card.textContent);if(id){card.dataset.jewelId=id;replaceGeneratedGem(card,id);}});
  }
  function appendSocketedInventoryJewels(){
    let active=null;try{active=window.invActiveTab;}catch(_){}if(active!=='enchant')return;
    const grid=document.getElementById('invGrid'),account=accountRef();if(!grid||!account)return;
    const looseIds=new Set((account.inventory?.enchant||[]).filter(i=>i?.kind==='jewel'&&i.id).map(i=>i.id));
    const rows=socketedJewels().filter(({jewel})=>!jewel.id||!looseIds.has(jewel.id));
    const sig=rows.map(({key,inst,jewel,slotIdx})=>`${key}:${inst.id||''}:${slotIdx}:${jewel.id||''}:${jewel.jewelId}:${jewel.tier}`).join('|');
    const old=grid.querySelectorAll('.ttdSocketedJewelMirror');if(grid.dataset.ttdSocketedJewelSignature===sig&&old.length===rows.length)return;old.forEach(n=>n.remove());grid.dataset.ttdSocketedJewelSignature=sig;if(!rows.length)return;grid.querySelector('.invEmpty')?.remove();
    for(const {key,inst,jewel,slotIdx} of rows){const card=document.createElement('div');card.className='chestCard jewelCard ttdSocketedJewelMirror';card.dataset.jewelId=jewel.jewelId;card.dataset.jewelInstanceId=jewel.id||'';card.innerHTML=`${imgMarkup(jewel.jewelId)}<span class="ttdSocketedBadge">SOCKETED</span><div class="cname">${esc(nameFor(jewel.jewelId,jewel.tier))}</div><div class="cdiff">${esc(dieDisplayName(key))} · Class ${esc(inst.cls||1)} · Slot ${slotIdx+1}</div>`;card.title=`${nameFor(jewel.jewelId,jewel.tier)} — socketed in ${dieDisplayName(key)}, slot ${slotIdx+1}`;grid.appendChild(card);}
  }
  function decorateInventory(){decorateLooseInventoryJewels();appendSocketedInventoryJewels();}
  function decoratePicker(){
    const card=document.getElementById('jewelPickerCard');if(!card)return;const current=idFromText(card.querySelector('h2')?.textContent||card.textContent);if(current){const big=card.querySelector('.glyphBig');if(big)replaceGeneratedGem(big,current);}
    card.querySelectorAll('[data-jewelinstid]').forEach(button=>{const jewel=looseJewelById(button.dataset.jewelinstid);if(jewel&&infoFor(jewel.jewelId))replaceGeneratedGem(button,jewel.jewelId,'ttdJewelChoiceArt');});
  }
  function decorateEnchantScreen(){const t=window.enchantTarget;if(!t?.key||!t?.instId||typeof window.findInstance!=='function')return;const inst=window.findInstance(t.key,t.instId);if(!Array.isArray(inst?.enchants))return;document.querySelectorAll('#enchantSlotsRow .enchantSlot').forEach((slot,i)=>{const j=inst.enchants[i];if(j&&infoFor(j.jewelId))replaceGeneratedGem(slot,j.jewelId);});}
  function decorateNamedDetail(card){if(!card)return;const id=idFromText(card.querySelector('h2')?.textContent||card.textContent);if(id){const big=card.querySelector('.glyphBig');if(big)replaceGeneratedGem(big,id);}}
  function decorateDetails(){decorateNamedDetail(document.getElementById('itemDetailCard'));decorateNamedDetail(document.getElementById('enchantAttemptCard'));decorateNamedDetail(document.getElementById('jewelPickerCard'));decoratePicker();}
  function decorateCollection(){
    const grid=document.getElementById('collectionGrid');if(!grid)return;
    grid.querySelectorAll('.colCard[data-key][data-inst-id]').forEach(card=>{if(card.classList.contains('ttdOdCard'))return;let inst=null;try{inst=typeof window.findInstance==='function'?window.findInstance(card.dataset.key,card.dataset.instId):null;}catch(_){}const jewels=Array.isArray(inst?.enchants)?inst.enchants.filter(j=>j&&infoFor(j.jewelId)):[];const sig=jewels.map(j=>`${j.id||''}:${j.jewelId}:${j.tier}`).join('|');const old=card.querySelector('.ttdJewelRail');if(card.dataset.ttdJewelRailSignature===sig&&(!!old===!!jewels.length))return;old?.remove();card.dataset.ttdJewelRailSignature=sig;card.classList.toggle('ttdHasJewels',jewels.length>0);if(!jewels.length)return;const rail=document.createElement('div');rail.className='ttdJewelRail';for(const j of jewels.slice(0,4)){const pip=document.createElement('span');pip.className='ttdJewelPip';pip.title=nameFor(j.jewelId,j.tier);pip.innerHTML=`${imgMarkup(j.jewelId)}<b>+${tierFor(j.tier)}</b>`;rail.appendChild(pip);}card.appendChild(rail);});
  }
  let queued=false;function queueDecorate(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorateInventory();decorateEnchantScreen();decorateDetails();decorateCollection();});}
  function wrap(name,after){let original;try{original=window[name];}catch(_){original=null;}if(typeof original!=='function')return false;try{window[name]=function(){const r=original.apply(this,arguments);try{after();}catch(err){console.warn(`[TTD jewels] ${name} decorator failed`,err);}queueDecorate();return r;};return true;}catch(_){return false;}}
  wrap('renderInventoryScreen',decorateInventory);wrap('openInventoryItemDetail',decorateDetails);wrap('openJewelPicker',decoratePicker);wrap('openEnchantAttempt',decorateDetails);wrap('renderDeckScreen',decorateCollection);
  const observer=new MutationObserver(queueDecorate);for(const id of ['invGrid','collectionGrid','enchantSlotsRow','jewelPickerCard','itemDetailCard','enchantAttemptCard']){const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:true});}
  const api=Object.freeze({art:ART,assetFor:(jewelId)=>infoFor(jewelId)?.asset||null,nameFor,allOwned:()=>{const a=accountRef();const loose=(a?.inventory?.enchant||[]).filter(i=>i?.kind==='jewel'&&infoFor(i.jewelId));return[...loose.map(jewel=>({jewel,socketed:false})),...socketedJewels().map(row=>({...row,socketed:true}))];},refresh:queueDecorate});
  window.__TTD_JEWEL_ART_V2=api;window.__TTD_STAT_JEWEL_ART_V1=api;
  queueDecorate();
})();
