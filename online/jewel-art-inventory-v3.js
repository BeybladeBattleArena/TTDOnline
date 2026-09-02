(() => {
  'use strict';
  if (window.__TTD_JEWEL_ART_INVENTORY_V3) return;
  window.__TTD_JEWEL_ART_INVENTORY_V3 = true;

  const FALLBACK_ART = Object.freeze({
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

  const art = () => window.__TTD_JEWEL_ART_V2?.art || FALLBACK_ART;
  const asset = (path) => typeof window.__TTD_ASSET_URL === 'function' ? window.__TTD_ASSET_URL(path) : path;
  const entries = () => Object.entries(art());
  const processed = new Map();

  function idFromText(text) {
    const value = String(text || '').toLowerCase();
    for (const [id, info] of entries()) {
      if (value.includes(String(info.name || '').toLowerCase())) return id;
    }
    return null;
  }

  function resolveId(node) {
    if (!node) return null;
    if (node.dataset?.jewelId && art()[node.dataset.jewelId]) return node.dataset.jewelId;
    const instId = node.dataset?.jewelinstid || node.dataset?.jewelInstanceId;
    if (instId) {
      try {
        const list = window.account?.inventory?.enchant;
        const jewel = Array.isArray(list) ? list.find((item) => item?.kind === 'jewel' && item.id === instId) : null;
        if (jewel?.jewelId && art()[jewel.jewelId]) return jewel.jewelId;
      } catch (_) {}
    }
    return idFromText(node.querySelector?.('.cname,h2')?.textContent || node.textContent);
  }

  function transparentUpscaleUrl(jewelId) {
    const info = art()[jewelId];
    if (!info?.asset) return Promise.resolve(null);
    if (processed.has(jewelId)) return processed.get(jewelId);

    const job = new Promise((resolve) => {
      const source = new Image();
      source.decoding = 'async';
      source.onload = () => {
        try {
          const w = source.naturalWidth || source.width;
          const h = source.naturalHeight || source.height;
          if (!w || !h) return resolve(asset(info.asset));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', {willReadFrequently:true});
          ctx.clearRect(0,0,w,h);
          ctx.drawImage(source,0,0,w,h);
          const image = ctx.getImageData(0,0,w,h);
          const p = image.data;

          // Remove only dark background pixels that are connected to the outer image edge.
          // This preserves dark/black details inside Onyx, Shadow and other gems.
          const seen = new Uint8Array(w*h);
          const queue = new Int32Array(w*h);
          let head=0, tail=0;
          const darkBg = (idx) => {
            const o=idx*4, a=p[o+3];
            if (a === 0) return true;
            const r=p[o], g=p[o+1], b=p[o+2];
            const hi=Math.max(r,g,b), lo=Math.min(r,g,b);
            return hi <= 48 && (hi-lo) <= 30;
          };
          const push=(idx)=>{if(idx<0||idx>=w*h||seen[idx]||!darkBg(idx))return;seen[idx]=1;queue[tail++]=idx;};
          for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}
          for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
          while(head<tail){
            const idx=queue[head++], x=idx%w, y=(idx/w)|0;
            p[idx*4+3]=0;
            if(x>0)push(idx-1);if(x<w-1)push(idx+1);if(y>0)push(idx-w);if(y<h-1)push(idx+w);
          }
          ctx.putImageData(image,0,0);

          // Supersample small source PNGs once so browser scaling at inventory/detail sizes is smoother.
          const maxSide=Math.max(w,h);
          if(maxSide < 192){
            const scale=Math.min(6,Math.max(2,Math.ceil(192/maxSide)));
            const up=document.createElement('canvas');
            up.width=w*scale;up.height=h*scale;
            const ux=up.getContext('2d');
            ux.imageSmoothingEnabled=true;
            ux.imageSmoothingQuality='high';
            ux.clearRect(0,0,up.width,up.height);
            ux.drawImage(canvas,0,0,up.width,up.height);
            return resolve(up.toDataURL('image/png'));
          }
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          console.warn('[TTD jewels] transparent PNG cleanup fell back to source art', jewelId, err);
          resolve(asset(info.asset));
        }
      };
      source.onerror = () => resolve(asset(info.asset));
      source.src = asset(info.asset);
    });
    processed.set(jewelId, job);
    return job;
  }

  function ensureArt(container, jewelId, className='ttdJewelArt') {
    const info = art()[jewelId];
    if (!container || !info) return;
    container.dataset.jewelId = jewelId;

    let img = container.querySelector(':scope > img.ttdJewelArt, :scope > img.ttdJewelChoiceArt');
    if (!img) {
      img = document.createElement('img');
      img.className = className;
      img.alt = info.name;
      img.draggable = false;
      img.dataset.jewelId = jewelId;
      container.prepend(img);
    }
    img.className = className;
    img.dataset.jewelId = jewelId;
    img.alt = info.name;
    img.src = asset(info.asset);
    container.querySelectorAll(':scope > svg').forEach((svg) => svg.remove());
    transparentUpscaleUrl(jewelId).then((url) => {
      if (url && img.isConnected && img.dataset.jewelId === jewelId) img.src = url;
    });
  }

  function decorateInventory() {
    const grid=document.getElementById('invGrid');
    if(!grid)return;
    grid.querySelectorAll('.jewelCard:not(.ttdSocketedJewelMirror)').forEach((card)=>{
      const id=resolveId(card);if(id)ensureArt(card,id);
    });
  }

  function decorateDetails() {
    for (const id of ['itemDetailCard','enchantAttemptCard','jewelPickerCard']) {
      const card=document.getElementById(id);if(!card)continue;
      const jewelId=resolveId(card);const big=card.querySelector('.glyphBig');
      if(jewelId&&big)ensureArt(big,jewelId);
    }
    document.querySelectorAll('#jewelPickerCard [data-jewelinstid],.enchantCardOption[data-jewelinstid]').forEach((button)=>{
      const id=resolveId(button);if(id)ensureArt(button,id,'ttdJewelChoiceArt');
    });
  }

  function decorateSockets() {
    try {
      const target=window.enchantTarget;
      if(!target?.key||!target?.instId||typeof window.findInstance!=='function')return;
      const inst=window.findInstance(target.key,target.instId);
      document.querySelectorAll('#enchantSlotsRow .enchantSlot').forEach((slot,i)=>{
        const jewel=inst?.enchants?.[i];if(jewel?.jewelId&&art()[jewel.jewelId])ensureArt(slot,jewel.jewelId);
      });
    } catch (_) {}
  }

  const style=document.createElement('style');
  style.id='ttd-jewel-art-inventory-v3-style';
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
    .enchantCardOption>.ttdJewelChoiceArt{width:34px!important;height:34px!important;flex:0 0 34px!important;margin-right:8px!important;}
    .ttdJewelRail img{background:transparent!important;border-radius:2px!important;}
  `;
  document.head.appendChild(style);

  let queued=false;
  function decorate(){
    queued=false;
    decorateInventory();decorateDetails();decorateSockets();
    try{window.__TTD_JEWEL_ART_V2?.refresh?.();}catch(_){}
  }
  function queueDecorate(){if(queued)return;queued=true;requestAnimationFrame(decorate);}

  const root=document.body||document.documentElement;
  new MutationObserver(queueDecorate).observe(root,{childList:true,subtree:true});
  document.addEventListener('click',()=>setTimeout(queueDecorate,0),true);
  window.addEventListener('ttd:inventory-rendered',queueDecorate);
  setInterval(queueDecorate,750);
  queueDecorate();

  window.__TTD_JEWEL_ART_V3=Object.freeze({refresh:queueDecorate,transparentUpscaleUrl});
})();