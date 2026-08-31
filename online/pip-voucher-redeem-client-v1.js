import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const REGION='us-central1';
const CODE='TTD-PIP-VOUCHERS';
const frame=document.getElementById('gameFrame');
const input=document.getElementById('onlineGiftCode');
const button=document.getElementById('onlineGiftRedeem');
const status=document.getElementById('onlineGiftStatus');
let auth=null,functions=null,currentUser=null,pending=false;

const sleep=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
const normalize=(value)=>String(value||'').trim().toUpperCase().replace(/\s+/g,'').slice(0,80);
function friendly(err){
  const text=String(err?.message||'The Pip Voucher test pack could not be redeemed.').replace(/^FirebaseError:\s*/i,'');
  if(String(err?.code||'').includes('already-exists'))return 'This account already redeemed the Pip Voucher test pack.';
  return text;
}
async function appReady(){
  for(let i=0;i<500;i++){if(getApps().length)return getApp();await sleep(20);}
  throw new Error('Firebase did not initialize for Pip Voucher redemption.');
}
function setStatus(text){if(status)status.textContent=text||'';}
async function refreshItems(){
  if(!functions)return;
  const result=await httpsCallable(functions,'getItemInventoryV1')({});
  try{frame?.contentWindow?.postMessage({type:'ttd:item-inventory-sync',items:Array.isArray(result.data?.items)?result.data.items:[]},location.origin);}catch(_){}
}
async function redeem(event){
  if(normalize(input?.value)!==CODE)return;
  event?.preventDefault?.();
  event?.stopImmediatePropagation?.();
  if(pending)return;
  if(!currentUser||!functions){setStatus('Sign in again before redeeming this code.');return;}
  pending=true;if(button)button.disabled=true;setStatus('Redeeming Pip Voucher test pack…');
  try{
    const result=await httpsCallable(functions,'redeemPipVoucherTestCodeV1')({code:CODE});
    await refreshItems();
    if(input)input.value='';
    setStatus(`Redeemed ${result.data?.label||'Pip Voucher Test Pack'} — 1 of each Pip Voucher added to Rewards.`);
  }catch(err){console.error('Pip Voucher test-code redemption failed.',err);setStatus(friendly(err));}
  finally{pending=false;if(button)button.disabled=false;}
}

button?.addEventListener('click',redeem,true);
input?.addEventListener('keydown',(event)=>{
  if(event.key!=='Enter'||normalize(input.value)!==CODE)return;
  redeem(event);
},true);

appReady().then(app=>{
  auth=getAuth(app);functions=getFunctions(app,REGION);onAuthStateChanged(auth,user=>{currentUser=user;});
}).catch(err=>console.error('Pip Voucher redeem client failed to start.',err));
