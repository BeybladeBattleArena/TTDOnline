(() => {
  'use strict';
  if(window.__TTD_WORLD_ITEMS_V1)return;
  window.__TTD_WORLD_ITEMS_V1=true;
  const ORIGIN=location.origin;
  const ASSETS=window.__TTD_ITEM_ASSETS_V1||{};
  const ITEMS=Object.freeze({
    epic_summon_ticket:{name:'Epic Summon Ticket',category:'rewards',desc:'A premium summon ticket reserved for Epic Summon use.'},
    exp_tome:{name:'EXP Tome',category:'rewards',desc:'A training tome. Use it to gain 60 account EXP.',xp:60},
    common_ore:{name:'Common Ore',category:'materials',desc:'Ore attuned to Common dice.'},
    rare_ore:{name:'Rare Ore',category:'materials',desc:'Ore attuned to Rare dice.'},
    unique_ore:{name:'Unique Ore',category:'materials',desc:'Ore attuned to Unique dice.'},
    legendary_ore:{name:'Legendary Ore',category:'materials',desc:'Ore attuned to Legendary dice.'},
    omni_ore:{name:'Omni Ore',category:'materials',desc:'Pearlescent ore that can stand in for any die-rarity ore.'},
    mystery_chest:{name:'Mystery Chest',category:'rewards',desc:'A sealed chest of unknown contents. A Mystery Key will be required to open it.',costPips:3300},
  });
  const CHEST_ASSET={normal:'frozen_island_chest_normal',hard:'frozen_island_chest_hard',hell:'frozen_island_chest_hell'};
  const KEY_ASSET={normal:'chest_key_normal',hard:'chest_key_hard',hell:'chest_key_hell'};
  let requestSeq=0,purchasePending=false,sellPending=false,usePending=false,physicsInstalled=false;

  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  function iconUrl(id){return ASSETS[id]||'';}
  function iconMarkup(id,size=72){const src=iconUrl(id);return src?`<img class="ttdItemArtV1" src="${src}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;display:block;margin:0 auto 6px;">`:'<div style="width:54px;height:54px"></div>';}
  function ensureInventory(){if(!account.inventory)account.inventory={rewards:[],materials:[],enchant:[]};for(const key of ['rewards','materials','enchant'])if(!Array.isArray(account.inventory[key]))account.inventory[key]=[];}
  ensureInventory();

  const style=document.createElement('style');style.id='ttdWorldItemsStyleV1';style.textContent=`
    .chestCard .ttdItemArtV1,.rewardPopupCard .ttdItemArtV1{width:74px!important;height:74px!important;object-fit:contain!important;margin:0 auto 7px!important;filter:drop-shadow(0 4px 7px rgba(0,0,0,.34));}
    .shopItemCard .ttdItemArtV1{width:48px!important;height:48px!important;object-fit:contain!important;margin:0 auto 5px!important;}
    .ttdItemCardV1{cursor:pointer;min-height:116px;justify-content:center;}
    #ttdSurfaceTerrainV1,#ttdWorldInteractV1{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
    #ttdSurfaceTerrainV1{z-index:1;}#ttdWorldInteractV1{z-index:4;}
  `;document.head.appendChild(style);

  // Existing adventure chests and keys keep their existing behavior; only their official art changes.
  if(typeof chestSVG==='function')chestSVG=function chestArtV1(diffKey){return iconMarkup(CHEST_ASSET[diffKey]||CHEST_ASSET.normal,78);};
  if(typeof keySVG==='function')keySVG=function keyArtV1(diffKey){return iconMarkup(KEY_ASSET[diffKey]||KEY_ASSET.normal,72);};

  window.TTDItemCatalogV1=Object.freeze({
    version:1,items:ITEMS,
    adventureChests:Object.freeze({
      al_hata:{chestKey:'frozen_island',displayName:'Frozen Island Chest',art:CHEST_ASSET},
      dark_monastery:{chestKey:'black_cathedral',displayName:'Black Cathedral Chest',art:CHEST_ASSET},
    }),
  });

  function localServerItem(itemId){for(const cat of ['rewards','materials']){const found=account.inventory[cat].find(item=>item?.type==='ttd_item'&&item.itemId===itemId);if(found)return found;}return null;}
  function applyServerItems(items){
    ensureInventory();const remote=new Map((Array.isArray(items)?items:[]).filter(item=>ITEMS[item?.id]).map(item=>[item.id,item]));
    for(const category of ['rewards','materials'])account.inventory[category]=account.inventory[category].filter(item=>item?.type!=='ttd_item'||remote.has(item.itemId));
    for(const [id,server] of remote){const def=ITEMS[id],category=def.category;let item=account.inventory[category].find(entry=>entry?.type==='ttd_item'&&entry.itemId===id);if(!item){item={id:`server_${id}`,type:'ttd_item',itemId:id,name:def.name,desc:def.desc,count:0,ts:Date.now()};account.inventory[category].push(item);}item.count=Math.max(0,Math.floor(Number(server.count)||0));item.name=def.name;item.desc=def.desc;item.sellable=server.sellable===true;item.sellValuePips=Math.max(0,Math.floor(Number(server.sellValuePips)||0));item.shopPurchased=server.shopPurchased===true;item.ts=Date.now();}
    saveAccount();if(document.getElementById('inventoryScreen')?.classList.contains('active'))renderInventoryScreen();if(document.getElementById('shopScreen')?.classList.contains('active'))renderShopGrid();
  }

  const baseOpenInventoryItemDetail=typeof openInventoryItemDetail==='function'?openInventoryItemDetail:null;
  if(baseOpenInventoryItemDetail)openInventoryItemDetail=function openInventoryItemDetailV1(item){
    if(item?.type!=='ttd_item')return baseOpenInventoryItemDetail(item);
    const def=ITEMS[item.itemId];if(!def)return;
    let extraBtn=null;
    if(item.itemId==='exp_tome')extraBtn={label:'Use · +60 EXP',disabled:usePending||item.count<1,onClick:()=>{if(usePending||item.count<1)return;usePending=true;const requestId=`item-use-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-use-request',{requestId,itemId:'exp_tome'});toastGlobal('Using EXP Tome…');}};
    else if(item.itemId==='mystery_chest')extraBtn={label:'Requires Mystery Key',disabled:true,onClick:()=>{}};
    const canSell=item.sellable===true&&item.sellValuePips>0;
    showItemDetail({name:`${def.name}${item.count>1?` ×${item.count}`:''}`,desc:def.desc,icon:iconMarkup(item.itemId,88),sellable:canSell,sellValue:canSell?item.sellValuePips:0,onSell:canSell?()=>requestServerItemSell(item):undefined,extraBtn});
  };

  const baseRenderInventoryScreen=typeof renderInventoryScreen==='function'?renderInventoryScreen:null;
  if(baseRenderInventoryScreen)renderInventoryScreen=function renderInventoryScreenItemsV1(){
    baseRenderInventoryScreen();const grid=document.getElementById('invGrid');if(!grid)return;
    [...grid.children].forEach(el=>{if(!el.className&&!el.textContent.trim())el.remove();});
    const list=(account.inventory?.[invActiveTab]||[]).filter(item=>item?.type==='ttd_item'&&ITEMS[item.itemId]);
    for(const item of list){const def=ITEMS[item.itemId],card=document.createElement('div');card.className='chestCard ttdItemCardV1';card.dataset.ttdItemId=item.itemId;card.innerHTML=`${iconMarkup(item.itemId,74)}<div class="cname">${def.name}</div><div class="cdiff">${item.count>1?`×${item.count}`:'×1'}</div>`;card.addEventListener('click',()=>openInventoryItemDetail(item));grid.appendChild(card);}
  };

  function requestMysteryPurchase(){if(purchasePending)return;purchasePending=true;const requestId=`item-buy-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-purchase-request',{requestId,itemId:'mystery_chest'});toastGlobal('Purchasing Mystery Chest…');}
  function requestServerItemSell(item){if(sellPending||!item?.itemId)return;sellPending=true;const requestId=`item-sell-${Date.now().toString(36)}-${++requestSeq}`;send('ttd:item-sell-request',{requestId,itemId:item.itemId});toastGlobal('Selling '+(item.name||'item')+'…');}
  function appendMysteryShopCard(){
    if(shopActiveTab!=='items'||shopActiveSub?.items!=='Materials')return;const grid=document.getElementById('shopGrid');if(!grid||grid.querySelector('[data-ttd-mystery-shop="1"]'))return;
    const def=ITEMS.mystery_chest,card=document.createElement('div');card.className='shopItemCard';card.dataset.ttdMysteryShop='1';card.innerHTML=`<div class="siIcon" style="display:grid;place-items:center;">${iconMarkup('mystery_chest',48)}</div><div class="siName">Mystery Chest</div><div class="siCost"><span class="siGoldDot"></span>3,300</div><button class="siBuyBtn">Buy</button>`;
    const open=(event)=>{event?.preventDefault?.();event?.stopPropagation?.();showItemDetail({name:def.name,desc:'Sold in Materials; purchases are delivered to the Rewards section of Inventory. '+def.desc,icon:iconMarkup('mystery_chest',92),extraBtn:{label:'Buy · 3,300 Pips',disabled:purchasePending,onClick:requestMysteryPurchase}});};card.addEventListener('click',open);card.querySelector('.siBuyBtn')?.addEventListener('click',open);grid.appendChild(card);
  }
  const baseRenderShopGrid=typeof renderShopGrid==='function'?renderShopGrid:null;
  if(baseRenderShopGrid)renderShopGrid=function renderShopGridItemsV1(){const result=baseRenderShopGrid();appendMysteryShopCard();return result;};

  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;const m=event.data||{};
    if(m.type==='ttd:item-inventory-sync'){applyServerItems(m.items||[]);return;}
    if(m.type==='ttd:item-purchase-result'){
      purchasePending=false;if(!m.ok){showNotice('Mystery Chest',m.message||'The purchase could not be completed.');return;}
      if(Number.isSafeInteger(m.gameState?.economy?.pips))account.gold=m.gameState.economy.pips;
      if(m.item)applyServerItems([...(Object.values(ITEMS).map(()=>null).filter(Boolean)),m.item]);
      if(typeof hideItemDetail==='function')hideItemDetail();renderHome();renderShopGrid();showNotice('Mystery Chest','Mystery Chest added to Rewards.');send('ttd:item-inventory-ready');return;
    }
    if(m.type==='ttd:item-sell-result'){
      sellPending=false;if(!m.ok){showNotice('Item Sale',m.message||'The item could not be sold.');return;}
      if(Number.isSafeInteger(m.gameState?.economy?.pips))account.gold=m.gameState.economy.pips;
      if(typeof hideItemDetail==='function')hideItemDetail();renderHome();renderInventoryScreen();showNotice('Item Sold','Sold for '+Math.max(0,Math.floor(Number(m.sellValuePips)||0)).toLocaleString()+' Pips.');send('ttd:item-inventory-ready');return;
    }
    if(m.type==='ttd:item-use-result'&&m.itemId==='exp_tome'){
      usePending=false;if(!m.ok){showNotice('EXP Tome',m.message||'The tome could not be used.');return;}
      const item=localServerItem('exp_tome');if(item)item.count=Math.max(0,Math.floor(Number(m.remaining)||0));if(typeof hideItemDetail==='function')hideItemDetail();renderInventoryScreen();
      const levelText=m.level?.level?` Account Level ${m.level.level}.`:'';showNotice('EXP Tome',`+${Number(m.xpGranted)||60} EXP.${levelText}`);send('ttd:item-inventory-ready');
    }
  });
  send('ttd:item-inventory-ready');

  // ---------------------------------------------------------------------------
  // Continuous-world combat surface routing + interactive falling pillar.
  // Surface nodes have explicit elevation and transition modes. The current Test Map
  // demonstrates jumpDown; future maps can author walk/climbUp/climbDown/dropLand nodes.
  // ---------------------------------------------------------------------------
  function installWorldPhysics(){
    if(physicsInstalled||!window.__TTD_TEST_PSEUDO3D_BATTLE_API||window.__TTD_TEST_PSEUDO3D_BATTLE_API.version<4)return false;
    physicsInstalled=true;
    const baseBuildPathV1=buildPath,baseEnemyRenderPosV1=enemyRenderPos,baseDrawLaneV1=drawLane;
    let surfaceCanvas=null,interactionCanvas=null;
    function isSurfaceCombat(){return !!state?.__ttdTestMap&&!!window.__TTD_TEST_PSEUDO3D_BATTLE_API?.active;}
    function area(){return Number(window.__TTD_TEST_PSEUDO3D_BATTLE_API?.area||1);}
    function rebuildLengths(){segLens=[];totalLen=0;for(let i=1;i<pathPts.length;i++){const dx=pathPts[i].x-pathPts[i-1].x,dy=pathPts[i].y-pathPts[i-1].y,len=Math.hypot(dx,dy);segLens.push(len);totalLen+=len;}towerPos=pathPts[pathPts.length-1];}
    function setSurfaceRoute(w,h){
      if(area()!==2)return false;
      const nodes=[
        {x:w*.96,y:h*.20,elevation:1,mode:'walk'},
        {x:w*.76,y:h*.20,elevation:1,mode:'walk'},
        {x:w*.76,y:h*.34,elevation:1,mode:'walk'},
        {x:w*.58,y:h*.34,elevation:1,mode:'jumpDown'},
        {x:w*.58,y:h*.56,elevation:0,mode:'dropLand'},
        {x:w*.43,y:h*.56,elevation:0,mode:'walk'},
        {x:w*.43,y:h*.73,elevation:0,mode:'walk'},
        {x:w*.16,y:h*.73,elevation:0,mode:'walk'},
      ];
      pathPts=nodes.map(({x,y})=>({x,y}));rebuildLengths();
      let dist=0;const segments=[];for(let i=0;i<segLens.length;i++){segments.push({index:i,start:dist,end:dist+segLens[i],from:nodes[i],to:nodes[i+1],mode:nodes[i].mode||'walk'});dist+=segLens[i];}
      state.__ttdSurfaceRoute={version:1,area:2,nodes,segments,totalLen};return true;
    }
    buildPath=function buildPathSurfaceV1(w,h){if(isSurfaceCombat()&&area()===2&&setSurfaceRoute(w,h))return;const result=baseBuildPathV1(w,h);if(state?.__ttdTestMap)state.__ttdSurfaceRoute={version:1,area:area(),nodes:(pathPts||[]).map(p=>({x:p.x,y:p.y,elevation:0,mode:'walk'})),segments:[],totalLen:Number(totalLen)||0};return result;};
    enemyRenderPos=function enemyRenderPosSurfaceV1(e){const p=baseEnemyRenderPosV1(e);if(!isSurfaceCombat()||area()!==2||e?.isTyphoon||e?.isZombie)return p;const route=state?.__ttdSurfaceRoute,dist=Number(e?.dist);if(!route||!Number.isFinite(dist))return p;const seg=route.segments?.find(s=>dist>=s.start&&dist<=s.end);if(!seg)return p;const span=Math.max(1e-6,seg.end-seg.start),t=Math.max(0,Math.min(1,(dist-seg.start)/span));e.__ttdElevation=seg.from.elevation+(seg.to.elevation-seg.from.elevation)*t;e.__ttdMovementMode=seg.mode;if(seg.mode==='jumpDown'){return{x:p.x,y:p.y-Math.sin(Math.PI*t)*Math.min(26,ch*.055)};}return p;};

    function ensureLayer(id,z){const lane=document.getElementById('laneWrap');if(!lane)return null;let c=document.getElementById(id);if(!c){c=document.createElement('canvas');c.id=id;c.style.zIndex=String(z);lane.appendChild(c);}const r=lane.getBoundingClientRect(),dpr=Math.max(1,Math.min(2,devicePixelRatio||1)),pw=Math.max(1,Math.round(r.width*dpr)),ph=Math.max(1,Math.round(r.height*dpr));if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return{c,g,w:r.width,h:r.height};}
    function removeLayers(){document.getElementById('ttdSurfaceTerrainV1')?.remove();document.getElementById('ttdWorldInteractV1')?.remove();surfaceCanvas=interactionCanvas=null;}
    function drawTerrace(pack){const{g,w,h}=pack;g.clearRect(0,0,w,h);if(area()!==2)return;g.save();const top=[[w*.50,h*.13],[w*.98,h*.13],[w*.98,h*.39],[w*.50,h*.39]];g.fillStyle='rgba(139,137,122,.88)';g.beginPath();top.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.strokeStyle='rgba(231,225,196,.34)';g.lineWidth=2;g.stroke();g.fillStyle='rgba(65,64,60,.78)';g.beginPath();g.moveTo(w*.50,h*.39);g.lineTo(w*.98,h*.39);g.lineTo(w*.92,h*.56);g.lineTo(w*.58,h*.56);g.closePath();g.fill();g.strokeStyle='rgba(35,35,34,.72)';for(let i=0;i<7;i++){const x=w*(.55+i*.06);g.beginPath();g.moveTo(x,h*.40);g.lineTo(x-w*.025,h*.53);g.stroke();}g.restore();}
    function pillarState(){if(!state?.__ttdWorldState)return null;const root=state.__ttdWorldState.interactions||(state.__ttdWorldState.interactions={});return root.templePillar||(root.templePillar={taps:0,required:5,fallStart:0,impactDone:false,removed:false,flashUntil:0});}
    function pillarGeometry(w,h){return{standX:w*.535,standY:h*.335,targetX:w*.585,targetY:h*.555,height:Math.min(112,h*.25),width:24};}
    function applyPillarImpact(pack,ps){if(ps.impactDone)return;ps.impactDone=true;const geo=pillarGeometry(pack.w,pack.h),rx=Math.max(68,pack.w*.12),ry=Math.max(46,pack.h*.10);let hits=0;for(const e of state?.enemies||[]){if(!e?.alive)continue;const p=enemyRenderPos(e),dx=(p.x-geo.targetX)/rx,dy=(p.y-geo.targetY)/ry;if(dx*dx+dy*dy<=1){damageEnemy(e,Math.max(22,(Number(e.maxHp)||0)*.34),'physical');hits++;}}try{toast(hits?`Pillar impact · ${hits} hit${hits===1?'':'s'}`:'The pillar crashes across the path');}catch(_){} }
    function drawPillar(pack){const{g,w,h}=pack;g.clearRect(0,0,w,h);if(area()!==2)return;const ps=pillarState();if(!ps||ps.removed)return;const geo=pillarGeometry(w,h),now=performance.now();let t=0,rest=0,alpha=1;if(ps.fallStart){const elapsed=now-ps.fallStart;t=Math.max(0,Math.min(1,elapsed/620));if(elapsed>=620)applyPillarImpact(pack,ps);rest=Math.max(0,elapsed-620);if(rest>1500)alpha=Math.max(0,1-(rest-1500)/720);if(rest>2250){ps.removed=true;return;}}
      const x=geo.standX+(geo.targetX-geo.standX)*t,y=geo.standY+(geo.targetY-geo.standY)*t,rot=t*Math.PI*.48;g.save();g.globalAlpha=alpha;g.translate(x,y);g.rotate(rot);const flash=now<(ps.flashUntil||0);g.fillStyle=flash?'#b6a898':'#81786e';g.strokeStyle='#393434';g.lineWidth=2;g.fillRect(-geo.width/2,-geo.height,geo.width,geo.height);g.strokeRect(-geo.width/2,-geo.height,geo.width,geo.height);g.fillStyle='#9b9184';g.fillRect(-geo.width*.72,-geo.height-9,geo.width*1.44,11);g.fillRect(-geo.width*.68,-8,geo.width*1.36,10);g.strokeStyle='#443d3b';g.lineWidth=3;g.beginPath();g.moveTo(-5,-geo.height*.78);g.lineTo(5,-geo.height*.62);g.lineTo(-4,-geo.height*.43);g.lineTo(6,-geo.height*.27);g.stroke();g.restore();if(!ps.fallStart){g.save();g.globalAlpha=.55+.18*Math.sin(now/260);g.strokeStyle='#f3d491';g.lineWidth=2;g.beginPath();g.arc(geo.standX,geo.standY-geo.height*.55,Math.max(24,geo.width*1.5),0,Math.PI*2);g.stroke();g.fillStyle='#f3d491';g.font="700 9px 'Space Mono',monospace";g.textAlign='center';g.fillText(`TAP ${ps.taps}/${ps.required}`,geo.standX,geo.standY-geo.height-17);g.restore();}}
    function drawWorldLayers(){if(!isSurfaceCombat()){removeLayers();return;}surfaceCanvas=ensureLayer('ttdSurfaceTerrainV1',1);interactionCanvas=ensureLayer('ttdWorldInteractV1',4);if(surfaceCanvas)drawTerrace(surfaceCanvas);if(interactionCanvas)drawPillar(interactionCanvas);}
    drawLane=function drawLaneWorldPhysicsV1(dt){const result=baseDrawLaneV1(dt);drawWorldLayers();return result;};

    document.getElementById('laneWrap')?.addEventListener('pointerdown',(event)=>{if(!isSurfaceCombat()||area()!==2)return;const lane=event.currentTarget,r=lane.getBoundingClientRect(),ps=pillarState();if(!ps||ps.removed||ps.fallStart)return;const geo=pillarGeometry(r.width,r.height),x=event.clientX-r.left,y=event.clientY-r.top;if(Math.abs(x-geo.standX)>50||y<geo.standY-geo.height-30||y>geo.standY+22)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();ps.taps=Math.min(ps.required,(ps.taps||0)+1);ps.flashUntil=performance.now()+120;if(ps.taps>=ps.required){ps.fallStart=performance.now();try{toast('The cracked pillar gives way!');}catch(_){}}else{try{toast(`Cracked Pillar · ${ps.required-ps.taps} tap${ps.required-ps.taps===1?'':'s'} left`);}catch(_){}}},true);

    window.TTDAdventureSurfacePathV1=Object.freeze({version:1,supportedTransitions:['walk','jumpDown','dropLand','climbDown','climbUp'],get route(){return state?.__ttdSurfaceRoute||null;},get pillar(){return state?.__ttdWorldState?.interactions?.templePillar||null;}});
    try{buildPath(cw,ch);}catch(_){}
    return true;
  }
  let physicsTries=0;const physicsTimer=setInterval(()=>{if(installWorldPhysics()||++physicsTries>300)clearInterval(physicsTimer);},100);
})();
