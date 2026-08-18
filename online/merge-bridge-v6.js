(() => {
  'use strict';
  const ORIGIN=location.origin;let pendingMerge=null;let seq=0;
  function send(type,payload={}){window.parent.postMessage({type,...payload},ORIGIN);}
  function favs(ids){return Array.isArray(ids)?[...new Set(ids.filter(id=>typeof id==='string'))].slice(0,10):[];}
  function applyDecks(decks){if(!Array.isArray(decks)||decks.length<3||decks.length>5)return;const sorted=decks.slice().sort((a,b)=>a.index-b.index);account.decks=sorted.map(deck=>Array.isArray(deck.slots)?deck.slots.map(slot=>slot?{key:slot.key,instId:slot.instId}:null):[null,null,null,null,null]);account.activeDeckIdx=Math.min(account.activeDeckIdx,account.decks.length-1);}
  function addJewels(items){if(!Array.isArray(items))return[];if(!account.inventory)account.inventory={rewards:[],materials:[],enchant:[]};if(!Array.isArray(account.inventory.enchant))account.inventory.enchant=[];const ids=new Set(account.inventory.enchant.filter(x=>x?.id).map(x=>x.id));const added=[];for(const j of items){if(!j?.id||ids.has(j.id))continue;account.inventory.enchant.push(j);ids.add(j.id);added.push(j);}return added;}
  mergeInstances=function onlineV6Merge(key,sourceId,targetId,targetCard){
    if(pendingMerge){toastGlobal('A Class merge is already being processed');return;}
    const source=findInstance(key,sourceId),target=findInstance(key,targetId);if(!source||!target){toastGlobal('Those merge copies are no longer available');return;}if(source.cls!==target.cls){toastGlobal('Class merges require two copies of the same Class');return;}if(target.cls>=10){toastGlobal('Class 10 is already the maximum Class');return;}
    const requestId=`v6merge-${Date.now().toString(36)}-${++seq}`;pendingMerge={requestId,key,sourceId,targetId,targetCard};send('ttd:v6-merge-request',{requestId,key,sourceId,targetId});
  };
  window.addEventListener('message',(event)=>{
    if(event.origin!==ORIGIN||event.source!==window.parent)return;const m=event.data||{};
    if(m.type==='ttd:v6-merge-error'&&pendingMerge&&m.requestId===pendingMerge.requestId){pendingMerge=null;showNotice('Class Merge',m.message||'The server rejected that Class merge.');return;}
    if(m.type!=='ttd:v6-merge-result'||!pendingMerge||m.requestId!==pendingMerge.requestId)return;
    const p=pendingMerge;pendingMerge=null;const target=m.target?.instance;if(!target?.id||target.id!==p.targetId){showNotice('Class Merge','The server returned an invalid merge result. Reloading will restore the cloud account.');send('ttd:v6-refresh-request');return;}
    account.owned[p.key]=(account.owned[p.key]||[]).filter(inst=>inst.id!==p.sourceId);let survivor=findInstance(p.key,p.targetId);if(!survivor){survivor={id:p.targetId,cls:target.cls,enchants:[null,null,null,null]};account.owned[p.key].push(survivor);}survivor.cls=target.cls;survivor.enchants=[null,null,null,null];applyDecks(m.decks||[]);account.favoriteDice=favs(m.favorites?.instanceIds||[]);const returned=addJewels(m.returnedJewels||[]);
    const oldClass=Number(m.oldClass||target.cls-1),newClass=Number(m.newClass||target.cls);

    // The authoritative transaction is complete now. Update the collection immediately instead
    // of leaving the old pair on-screen for the duration of the celebration animation.
    renderDeckScreen();
    if(typeof renderInventoryScreen==='function'&&document.getElementById('inventoryScreen')?.classList.contains('active'))renderInventoryScreen();

    playClassUpAnimation(p.key,oldClass,newClass,p.targetCard).then(()=>{
      if(returned.length){const names=returned.map(j=>jewelDisplayName(j.jewelId,j.tier));setTimeout(()=>showNotice('Jewels Returned',`${returned.length} socketed jewel${returned.length===1?' was':'s were'} returned to Inventory before ${DICE[p.key].name} merged to Class ${newClass}.<br><br><strong>${names.join(', ')}</strong>`),260);}
      send('ttd:v6-refresh-request');
    });
  });
})();