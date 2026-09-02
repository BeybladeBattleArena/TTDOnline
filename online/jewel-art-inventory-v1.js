(() => {
  'use strict';
  if(window.__TTD_JEWEL_ART_INVENTORY_V3)return;
  window.__TTD_JEWEL_ART_INVENTORY_V3=true;

  const ART=Object.freeze({
    power:{name:'Ruby of Power',asset:'/assets/items/jewel-ruby-power.png'},
    cooldown:{name:'Citrine of Cooldown Reduction',asset:'/assets/items/jewel-citrine-cooldown.png'},
    physDef:{name:'Onyx of Physical Defense',asset:'/assets/items/jewel-onyx-physical-defense.png'},
    specDef:{name:'Amethyst of Special Defense',asset:'/assets/items/jewel-amethyst-special-defense.png'},
    hp:{name:'Garnet of HP',asset:'/assets/items/jewel-garnet-hp.png'},
    critChance:{name:'Spinel of Crit Chance',asset:'/assets/items/jewel-spinel-crit-chance.png'},
    critBoost:{name:'Bloodstone of Crit Boost',asset:'/assets/items/jewel-bloodstone-crit-boost.png'},
    spGen:{name:'Aquamarine of Passive SP Gen',asset:'/assets/items/jewel-aquamarine-sp-gen.png'},
    experience:{name:'Peridot of Experience',asset:'/assets/items/jewel-peridot-experience.png'},
    luck:{name:'Moonstone of Luck',asset:'/assets/items/jewel-moonstone-luck.png'},
    insight:{name:'Opal of Insight',asset:'/assets/items/jewel-opal-insight.png'},
    potency:{name:'Tourmaline of Potency',asset:'/assets/items/jewel-tourmaline-potency.png'},
    elem_fire:{name:'Gemstone of Fire',asset:'/assets/items/jewel-element-fire.png'},
    elem_ice:{name:'Gemstone of Ice',asset:'/assets/items/jewel-element-ice.png'},
    elem_wind:{name:'Gemstone of Wind',asset:'/assets/items/jewel-element-wind.png'},
    elem_lightning:{name:'Gemstone of Lightning',asset:'/assets/items/jewel-element-lightning.png'},
    elem_water:{name:'Gemstone of Water',asset:'/assets/items/jewel-element-water.png'},
    elem_earth:{name:'Gemstone of Earth',asset:'/assets/items/jewel-element-earth.png'},
    elem_metal:{name:'Gemstone of Metal',asset:'/assets/items/jewel-element-metal.png'},
    elem_nature:{name:'Gemstone of Nature',asset:'/assets/items/jewel-element-nature.png'},
    elem_poison:{name:'Gemstone of Poison',asset:'/assets/items/jewel-element-poison.png'},
    elem_holy:{name:'Gemstone of Holy',asset:'/assets/items/jewel-element-holy.png'},
    elem_shadow:{name:'Gemstone of Shadow',asset:'/assets/items/jewel-element-shadow.png'},
    elem_arcane:{name:'Gemstone of Arcane',asset:'/assets/items/jewel-element-arcane.png'}
  });
  const ART_ENTRIES=Object.entries(ART);
  const asset=(path)=>typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(path):path;
  const esc=(value)=>String(value==null?'':value).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const infoFor=(jewelId)=>ART[jewelId]||null;
  const tierFor=(tier)=>Math.max(1,Math.min(5,Number(tier)||1));
  const nameFor=(jewelId,tier)=>infoFor(jewelId)?`${infoFor(jewelId).name} +${tierFor(tier)}`:'';

  function accountRef(){
    try{
      if(typeof account!=='undefined'&&account)return account;
    }catch(_){}
    try{return window.account||null;}catch(_){return null;}
  }
  function inventoryTabRef(){
    try{if(typeof invActiveTab!=='undefined')return invActiveTab;}catch(_){}
    try{return window.invActiveTab;}catch(_){return null;}
  }
  function enchantTargetRef(){
    try{if(typeof enchantTarget!=='undefined')return enchantTarget;}catch(_){}
    try{return window.enchantTarget;}catch(_){return null;}
  }
  function findInstanceRef(key,instId){
    try{if(typeof findInstance==='function')return findInstance(key,instId);}catch(_){}
    try{if(typeof window.findInstance==='function')return window.findInstance(key,instId);}catch(_){}
    return null;
  }

  function idFromText(text){
    const normalized=String(text||'').toLowerCase();
    for(const [id,info] of ART_ENTRIES){
      if(normalized.includes(info.name.toLowerCase()))return id;
    }
    return null;
  }
  function resolveId(node){
    if(!node)return null;
    const declared=node.dataset?.jewelId||node.dataset?.ttdJewelId;
    if(declared&&infoFor(declared))return declared;
    const instId=node.dataset?.jewelinstid||node.dataset?.jewelInstId||node.dataset?.jewelInstanceId;
    if(instId){
      const list=accountRef()?.inventory?.enchant;
      if(Array.isArray(list)){
        const jewel=list.find((item)=>item?.kind==='jewel'&&item.id===instId);
        if(jewel?.jewelId&&infoFor(jewel.jewelId))return jewel.jewelId;
      }
    }
    return idFromText(node.querySelector?.('.cname,h2')?.textContent||node.textContent);
  }

  function makeImg(jewelId,cls='ttdJewelArt'){
    const info=infoFor(jewelId);if(!info)return null;
    const img=document.createElement('img');
    img.className=cls;
    img.src=asset(info.asset);
    img.alt=info.name;
    img.draggable=false;
    img.dataset.jewelId=jewelId;
    img.dataset.ttdJewelId=jewelId;
    return img;
  }
  function imgMarkup(jewelId,cls='ttdJewelArt'){
    const info=infoFor(jewelId);if(!info)return '';
    return `<img class="${esc(cls)}" data-jewel-id="${esc(jewelId)}" data-ttd-jewel-id="${esc(jewelId)}" src="${esc(asset(info.asset))}" alt="${esc(info.name)}" draggable="false">`;
  }

  /*
   * The native game used gemSVG() for the old pentagon placeholder. Replacing the
   * function here means every future inventory/detail/picker render creates the
   * canonical PNG directly instead of drawing a placeholder and repairing it later.
   */
  function installNativeGemRenderer(){
    let installed=false;
    try{
      if(typeof gemSVG==='function'){
        gemSVG=(jewelId)=>imgMarkup(jewelId);
        installed=true;
      }
    }catch(_){}
    try{
      if(typeof window.gemSVG==='function'){
        window.gemSVG=(jewelId)=>imgMarkup(jewelId);
        installed=true;
      }
    }catch(_){}
    return installed;
  }

  function replaceGeneratedGem(container,jewelId,cls='ttdJewelArt'){
    const info=infoFor(jewelId);if(!container||!info)return;
    container.dataset.jewelId=jewelId;

    let img=container.querySelector(':scope > img.ttdJewelArt, :scope > img.ttdJewelChoiceArt');
    if(!img){
      img=makeImg(jewelId,cls);
      if(img)container.prepend(img);
    }
    if(!img)return;
    img.className=cls;
    img.dataset.jewelId=jewelId;
    img.dataset.ttdJewelId=jewelId;
    img.alt=info.name;
    img.draggable=false;
    const desired=asset(info.asset);
    if(img.getAttribute('src')!==desired)img.src=desired;
    container.querySelectorAll(':scope > svg').forEach((svg)=>svg.remove());
  }

  let style=document.getElementById('ttd-jewel-art-inventory-v3-style');
  if(!style){
    style=document.createElement('style');
    style.id='ttd-jewel-art-inventory-v3-style';
    document.head.appendChild(style);
  }
  style.textContent=`
    .jewelCard>svg,.glyphBig>svg,.enchantSlot>svg{display:none!important;}
    .ttdJewelArt,.ttdJewelChoiceArt,.ttdJewelRail img{
      display:block!important;object-fit:contain!important;background:transparent!important;
      border:0!important;border-radius:0!important;box-shadow:none!important;
      image-rendering:auto!important;pointer-events:none!important;user-select:none!important;-webkit-user-drag:none!important;
    }
    .chestCard.jewelCard>.ttdJewelArt{width:72px!important;height:72px!important;margin:2px auto 8px!important;}
    .glyphBig>.ttdJewelArt{width:88%!important;height:88%!important;margin:auto!important;}
    .enchantSlot.filled>.ttdJewelArt{width:76%!important;height:76%!important;margin:auto!important;}
    .enchantCardOption{gap:8px!important;min-width:0!important;text-align:left!important;}
    .enchantCardOption>.ttdJewelChoiceArt{width:34px!important;height:34px!important;flex:0 0 34px!important;margin-right:8px!important;}
    .ttdSocketedJewelMirror{position:relative;cursor:default!important;min-height:120px;}
    .ttdSocketedJewelMirror .ttdSocketedBadge{
      position:absolute;left:6px;top:6px;border:1px solid var(--moss);border-radius:5px;
      background:rgba(10,12,20,.88);color:#bfe6c9;padding:1px 4px;
      font:700 6.5px 'Space Mono',monospace;letter-spacing:.03em;
    }
    .ttdSocketedJewelMirror .cdiff{font-size:8px;line-height:1.25;color:var(--mist-dim);max-width:100%;overflow-wrap:anywhere;}
    #collectionGrid>.colCard.ttdHasJewels{padding-left:16px!important;}
    .ttdJewelRail{
      position:absolute;left:2px;top:20px;bottom:5px;z-index:6;display:flex;
      flex-direction:column;justify-content:flex-start;gap:2px;width:13px;pointer-events:none;
    }
    .ttdJewelRail .ttdJewelPip{
      position:relative;width:13px;height:13px;flex:0 0 13px;border-radius:4px;overflow:visible;
      background:#080b13;border:1px solid rgba(255,255,255,.18);box-shadow:0 1px 3px rgba(0,0,0,.45);
    }
    .ttdJewelRail img{width:100%!important;height:100%!important;border-radius:3px!important;}
    .ttdJewelRail b{
      position:absolute;right:-2px;bottom:-3px;min-width:8px;height:8px;line-height:7px;padding:0 1px;
      border-radius:3px;background:#080b13;border:1px solid var(--gold);color:var(--gold-glow);
      font:700 5px 'Space Mono',monospace;text-align:center;
    }
    @media(max-width:420px){
      #collectionGrid>.colCard.ttdHasJewels{padding-left:15px!important;}
      .chestCard.jewelCard>.ttdJewelArt{width:68px!important;height:68px!important;}
    }
  `;

  function looseJewelById(id){
    const list=accountRef()?.inventory?.enchant;
    return Array.isArray(list)?list.find((item)=>item?.kind==='jewel'&&item.id===id)||null:null;
  }
  const dieDisplayName=(key)=>window.__TTD_DICEFILE?.dice?.[key]?.name||key||'Die';

  function socketedJewels(){
    const owned=accountRef()?.owned;
    if(!owned||typeof owned!=='object')return[];
    const rows=[];
    for(const [key,instances] of Object.entries(owned)){
      if(!Array.isArray(instances))continue;
      for(const inst of instances){
        if(!Array.isArray(inst?.enchants))continue;
        inst.enchants.forEach((jewel,slotIdx)=>{
          if(jewel&&infoFor(jewel.jewelId))rows.push({key,inst,jewel,slotIdx});
        });
      }
    }
    return rows;
  }

  function decorateLooseInventoryJewels(){
    const grid=document.getElementById('invGrid');if(!grid)return;
    grid.querySelectorAll('.jewelCard:not(.ttdSocketedJewelMirror)').forEach((card)=>{
      const id=resolveId(card);
      if(id)replaceGeneratedGem(card,id);
    });
  }

  function appendSocketedInventoryJewels(){
    if(inventoryTabRef()!=='enchant')return;
    const grid=document.getElementById('invGrid'),accountObj=accountRef();
    if(!grid||!accountObj)return;
    const looseIds=new Set((accountObj.inventory?.enchant||[])
      .filter((item)=>item?.kind==='jewel'&&item.id).map((item)=>item.id));
    const rows=socketedJewels().filter(({jewel})=>!jewel.id||!looseIds.has(jewel.id));
    const sig=rows.map(({key,inst,jewel,slotIdx})=>`${key}:${inst.id||''}:${slotIdx}:${jewel.id||''}:${jewel.jewelId}:${jewel.tier}`).join('|');
    const old=grid.querySelectorAll('.ttdSocketedJewelMirror');
    if(grid.dataset.ttdSocketedJewelSignature===sig&&old.length===rows.length)return;
    old.forEach((node)=>node.remove());
    grid.dataset.ttdSocketedJewelSignature=sig;
    if(!rows.length)return;
    grid.querySelector('.invEmpty')?.remove();
    for(const {key,inst,jewel,slotIdx} of rows){
      const card=document.createElement('div');
      card.className='chestCard jewelCard ttdSocketedJewelMirror';
      card.dataset.jewelId=jewel.jewelId;
      card.dataset.jewelInstanceId=jewel.id||'';
      card.innerHTML=`${imgMarkup(jewel.jewelId)}
        <span class="ttdSocketedBadge">SOCKETED</span>
        <div class="cname">${esc(nameFor(jewel.jewelId,jewel.tier))}</div>
        <div class="cdiff">${esc(dieDisplayName(key))} · Class ${esc(inst.cls||1)} · Slot ${slotIdx+1}</div>`;
      card.title=`${nameFor(jewel.jewelId,jewel.tier)} — socketed in ${dieDisplayName(key)}, slot ${slotIdx+1}`;
      grid.appendChild(card);
    }
  }

  function decorateInventory(){
    decorateLooseInventoryJewels();
    appendSocketedInventoryJewels();
  }

  function decoratePicker(){
    const card=document.getElementById('jewelPickerCard');if(!card)return;
    const current=resolveId(card);
    if(current){
      const big=card.querySelector('.glyphBig');
      if(big)replaceGeneratedGem(big,current);
    }
    card.querySelectorAll('[data-jewelinstid]').forEach((button)=>{
      const jewel=looseJewelById(button.dataset.jewelinstid);
      if(jewel&&infoFor(jewel.jewelId))replaceGeneratedGem(button,jewel.jewelId,'ttdJewelChoiceArt');
    });
  }

  function decorateEnchantScreen(){
    const target=enchantTargetRef();
    if(!target?.key||!target?.instId)return;
    const inst=findInstanceRef(target.key,target.instId);
    if(!Array.isArray(inst?.enchants))return;
    document.querySelectorAll('#enchantSlotsRow .enchantSlot').forEach((slot,i)=>{
      const jewel=inst.enchants[i];
      if(jewel&&infoFor(jewel.jewelId))replaceGeneratedGem(slot,jewel.jewelId);
    });
  }

  function decorateNamedDetail(card){
    if(!card)return;
    const id=resolveId(card);
    if(!id)return;
    const big=card.querySelector('.glyphBig');
    if(big)replaceGeneratedGem(big,id);
  }

  function decorateDetails(){
    decorateNamedDetail(document.getElementById('itemDetailCard'));
    decorateNamedDetail(document.getElementById('enchantAttemptCard'));
    decorateNamedDetail(document.getElementById('jewelPickerCard'));
    decoratePicker();
  }

  function decorateCollection(){
    const grid=document.getElementById('collectionGrid');if(!grid)return;
    grid.querySelectorAll('.colCard[data-key][data-inst-id]').forEach((card)=>{
      if(card.classList.contains('ttdOdCard'))return;
      const inst=findInstanceRef(card.dataset.key,card.dataset.instId);
      const jewels=Array.isArray(inst?.enchants)?inst.enchants.filter((j)=>j&&infoFor(j.jewelId)):[];
      const sig=jewels.map((j)=>`${j.id||''}:${j.jewelId}:${j.tier}`).join('|');
      const old=card.querySelector('.ttdJewelRail');
      if(card.dataset.ttdJewelRailSignature===sig&&(!!old===!!jewels.length))return;
      old?.remove();
      card.dataset.ttdJewelRailSignature=sig;
      card.classList.toggle('ttdHasJewels',jewels.length>0);
      if(!jewels.length)return;
      const rail=document.createElement('div');
      rail.className='ttdJewelRail';
      for(const jewel of jewels.slice(0,4)){
        const pip=document.createElement('span');
        pip.className='ttdJewelPip';
        pip.title=nameFor(jewel.jewelId,jewel.tier);
        pip.innerHTML=`${imgMarkup(jewel.jewelId)}<b>+${tierFor(jewel.tier)}</b>`;
        rail.appendChild(pip);
      }
      card.appendChild(rail);
    });
  }

  let queued=false;
  function decorate(){
    queued=false;
    installNativeGemRenderer();
    decorateInventory();
    decorateEnchantScreen();
    decorateDetails();
    decorateCollection();
  }
  function queueDecorate(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(decorate);
  }

  function wrap(name){
    let original;
    try{original=window[name];}catch(_){original=null;}
    if(typeof original!=='function'||original.__ttdJewelWrapped)return;
    const wrapped=function(){
      const result=original.apply(this,arguments);
      queueDecorate();
      return result;
    };
    wrapped.__ttdJewelWrapped=true;
    try{window[name]=wrapped;}catch(_){}
  }

  installNativeGemRenderer();
  for(const name of ['renderInventoryScreen','openInventoryItemDetail','openJewelPicker','openEnchantAttempt','renderDeckScreen'])wrap(name);

  const root=document.body||document.documentElement;
  if(root)new MutationObserver(queueDecorate).observe(root,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(queueDecorate,0),true);

  const api=Object.freeze({
    art:ART,
    assetFor:(jewelId)=>infoFor(jewelId)?.asset||null,
    nameFor,
    allOwned:()=>{
      const accountObj=accountRef();
      const loose=(accountObj?.inventory?.enchant||[]).filter((item)=>item?.kind==='jewel'&&infoFor(item.jewelId));
      return[
        ...loose.map((jewel)=>({jewel,socketed:false})),
        ...socketedJewels().map((row)=>({...row,socketed:true}))
      ];
    },
    refresh:queueDecorate
  });
  window.__TTD_JEWEL_ART_V3=api;
  window.__TTD_JEWEL_ART_V2=api;
  window.__TTD_STAT_JEWEL_ART_V1=api;
  queueDecorate();
})();
