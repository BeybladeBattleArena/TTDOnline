import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const REGION='us-central1';
const frame=document.getElementById('gameFrame');
const giftStatus=document.getElementById('onlineGiftStatus');
let auth=null,functions=null,currentUser=null,syncing=false,lastGiftSuccess='';

const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
function friendlyError(err){return String(err?.message||'The item server rejected that request.').replace(/^FirebaseError:\s*/i,'');}
async function waitForFirebaseApp(){for(let i=0;i<500;i++){if(getApps().length)return getApp();await sleep(20);}throw new Error('Firebase did not initialize for the item inventory.');}
function setCurrencyUi(gameState){
  const pips=Number(gameState?.economy?.pips),astras=Number(gameState?.economy?.astras);if(!Number.isSafeInteger(pips)||!Number.isSafeInteger(astras))return;
  const pipsEl=document.getElementById('cloudPips'),astrasEl=document.getElementById('cloudAstras'),raw=document.getElementById('cloudEconomy');
  if(pipsEl)pipsEl.textContent=pips.toLocaleString();if(astrasEl)astrasEl.textContent=astras.toLocaleString();if(raw)raw.textContent=`${pips.toLocaleString()} Pips • ${astras.toLocaleString()} Astras`;
  try{const doc=frame?.contentDocument;for(const id of ['shopGold','homeGold']){const el=doc?.getElementById(id);if(el)el.textContent=String(pips);}for(const id of ['shopAstras','homeAstras']){const el=doc?.getElementById(id);if(el)el.textContent=String(astras);}}catch(_){}
}
function postToGame(payload){try{frame?.contentWindow?.postMessage(payload,location.origin);}catch(_){} }
async function syncItems(){
  if(syncing||!functions||!currentUser)return;syncing=true;
  try{const result=await httpsCallable(functions,'getItemInventoryV1')({});postToGame({type:'ttd:item-inventory-sync',items:Array.isArray(result.data?.items)?result.data.items:[]});}
  catch(err){console.error('Item inventory sync failed.',err);}
  finally{syncing=false;}
}
async function purchaseMystery(requestId){
  try{
    const result=await httpsCallable(functions,'purchaseMysteryChestV1')({});const data=result.data||{};setCurrencyUi(data.gameState);
    postToGame({type:'ttd:item-purchase-result',requestId,ok:true,item:data.item,gameState:data.gameState,costPips:data.costPips});
    await syncItems();
  }catch(err){postToGame({type:'ttd:item-purchase-result',requestId,ok:false,message:friendlyError(err)});}
}
async function sellInventoryItem(requestId,itemId){
  try{
    // The callable keeps its legacy name for compatibility; server behavior is the canonical
    // generic Inventory-item resale archetype for both Shop and reward-only items.
    const result=await httpsCallable(functions,'sellShopItemV1')({itemId});const data=result.data||{};setCurrencyUi(data.gameState);
    postToGame({type:'ttd:item-sell-result',requestId,ok:true,itemId,sellValuePips:data.sellValuePips,remaining:data.remaining,item:data.item,gameState:data.gameState});
    await syncItems();
  }catch(err){postToGame({type:'ttd:item-sell-result',requestId,ok:false,itemId,message:friendlyError(err)});}
}
async function useExpTome(requestId){
  try{
    const result=await httpsCallable(functions,'useExpTomeV1')({});const data=result.data||{};setCurrencyUi(data.gameState);
    postToGame({type:'ttd:item-use-result',requestId,ok:true,itemId:'exp_tome',remaining:data.remaining,xpGranted:data.xpGranted,level:data.level,levelsGained:data.levelsGained||[],gameState:data.gameState});
    await syncItems();
  }catch(err){postToGame({type:'ttd:item-use-result',requestId,ok:false,itemId:'exp_tome',message:friendlyError(err)});}
}
window.addEventListener('message',(event)=>{
  if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;const m=event.data||{};
  if(m.type==='ttd:item-inventory-ready'){syncItems();return;}
  if(!currentUser||!functions)return;
  if(m.type==='ttd:item-purchase-request'&&m.itemId==='mystery_chest')purchaseMystery(String(m.requestId||''));
  if(m.type==='ttd:item-sell-request')sellInventoryItem(String(m.requestId||''),String(m.itemId||''));
  if(m.type==='ttd:item-use-request'&&m.itemId==='exp_tome')useExpTome(String(m.requestId||''));
});

// Gift codes can now grant stackable Inventory items. Keep that path generic: any successful
// code redemption refreshes this authoritative item stream, rather than special-casing one code.
if(giftStatus){
  new MutationObserver(()=>{
    const text=giftStatus.textContent.trim();
    if(!/^Redeemed\b/i.test(text)||text===lastGiftSuccess)return;
    lastGiftSuccess=text;
    setTimeout(syncItems,0);
  }).observe(giftStatus,{childList:true,characterData:true,subtree:true});
}

async function start(){const app=await waitForFirebaseApp();auth=getAuth(app);functions=getFunctions(app,REGION);onAuthStateChanged(auth,user=>{currentUser=user;if(user)setTimeout(syncItems,120);});frame?.addEventListener('load',()=>setTimeout(syncItems,180));}
start().catch(err=>console.error('Item inventory client failed to start.',err));
