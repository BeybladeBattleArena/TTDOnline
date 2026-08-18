import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const REGION = 'us-central1';
const el = (id) => document.getElementById(id);
const gameFrame = el('gameFrame');
const modal = el('v6Modal');
const modalCard = el('v6ModalCard');
const friendsBtn = el('friendsBtn');
const progressBtn = el('progressBtn');
const giftInput = el('onlineGiftCode');
const giftBtn = el('onlineGiftRedeem');
const giftStatus = el('onlineGiftStatus');

let auth = null;
let functions = null;
let currentUser = null;
let snapshot = null;
let social = null;
let progression = null;
let v6BridgeReady = false;
let v6Synced = false;
let refreshPromise = null;

function postToGame(message) {
  if (gameFrame?.contentWindow) gameFrame.contentWindow.postMessage(message, location.origin);
}
function humanize(err) {
  const code = String(err?.code || '');
  const message = err?.message?.replace(/^FirebaseError:\s*/i, '') || '';
  if (code.includes('unauthenticated')) return 'Your sign-in expired. Sign in again.';
  if (code.includes('already-exists')) return message || 'That reward or action was already completed.';
  if (code.includes('not-found')) return message || 'That player, item, or code was not found.';
  if (code.includes('permission-denied')) return message || 'That action is not available for this account.';
  if (code.includes('failed-precondition') || code.includes('invalid-argument') || code.includes('resource-exhausted')) return message || 'The server rejected that action.';
  return message || 'The online service could not complete that action.';
}
async function waitForApp() {
  for (let i=0;i<500;i++) {
    if (getApps().length) return getApp();
    await new Promise((resolve)=>setTimeout(resolve,20));
  }
  throw new Error('Firebase did not initialize.');
}
async function call(name, data={}) {
  if (!functions || !currentUser) throw new Error('Sign in again before continuing.');
  const result = await httpsCallable(functions,name)(data);
  return result.data;
}
function setHudFromSnapshot(next) {
  const pips = Number(next?.gameState?.economy?.pips || 0);
  const astras = Number(next?.gameState?.economy?.astras || 0);
  if (el('cloudPips')) el('cloudPips').textContent = pips.toLocaleString();
  if (el('cloudAstras')) el('cloudAstras').textContent = astras.toLocaleString();
  if (el('cloudEconomy')) el('cloudEconomy').textContent = `${pips.toLocaleString()} Pips • ${astras.toLocaleString()} Astras`;
}
function sendSnapshot() {
  if (!snapshot || !v6BridgeReady) return;
  postToGame({type:'ttd:v6-cloud-snapshot',snapshot});
}
async function refreshSnapshot(send=true) {
  if (!currentUser) return null;
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async()=>{
    const data = await call('getOnlineSnapshot');
    snapshot = data.snapshot;
    setHudFromSnapshot(snapshot);
    if (send) sendSnapshot();
    return snapshot;
  })().finally(()=>{ refreshPromise=null; });
  return refreshPromise;
}
async function refreshSocial() {
  if (!currentUser) return null;
  social = (await call('getSocialState')).social;
  return social;
}
async function refreshProgression() {
  if (!currentUser) return null;
  progression = (await call('getProgression')).progression;
  return progression;
}
async function refreshBootstrap() {
  // Friends and Quests are intentionally lazy. Startup only retrieves the authoritative game
  // snapshot needed by the actual game; opening either modal retrieves its own data on demand.
  await refreshSnapshot(false);
  sendSnapshot();
}
function applyMutationPayload(data) {
  if (data?.snapshot) {
    snapshot = data.snapshot;
    setHudFromSnapshot(snapshot);
    sendSnapshot();
  }
  if (data?.social) social = data.social;
  if (data?.progression) progression = data.progression;
}
function showModal(html, wide=false) {
  modalCard.classList.toggle('wide',!!wide);
  modalCard.innerHTML = `<button class="modalX" id="v6ModalX" type="button">×</button>${html}`;
  modal.hidden = false;
  el('v6ModalX')?.addEventListener('click',hideModal);
}
function hideModal() { modal.hidden=true; modalCard.innerHTML=''; }
modal?.addEventListener('click',(event)=>{ if(event.target===modal) hideModal(); });
function esc(text) { return String(text==null?'':text).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function titleKey(key) { return String(key||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase()); }

function attachLongPress(row, friend) {
  let timer=null,startX=0,startY=0,opened=false;
  const cancel=()=>{ if(timer) clearTimeout(timer); timer=null; };
  row.addEventListener('pointerdown',(event)=>{
    if(event.target.closest('button,input,select')) return;
    startX=event.clientX;startY=event.clientY;opened=false;
    timer=setTimeout(()=>{opened=true;openFriendMenu(friend);},650);
  });
  row.addEventListener('pointermove',(event)=>{if(Math.hypot(event.clientX-startX,event.clientY-startY)>10)cancel();});
  row.addEventListener('pointerup',cancel);row.addEventListener('pointercancel',cancel);row.addEventListener('pointerleave',cancel);
  row.addEventListener('contextmenu',(event)=>{event.preventDefault();cancel();if(!opened)openFriendMenu(friend);});
}

async function renderFriendsModal() {
  if (!social || !snapshot) await Promise.all([social?Promise.resolve(social):refreshSocial(),snapshot?Promise.resolve(snapshot):refreshSnapshot(false)]);
  const self=social.self;
  const dice=(snapshot.dice||[]).slice().sort((a,b)=>a.key.localeCompare(b.key)||b.instance.cls-a.instance.cls);
  const sharedOptions=[`<option value="">Do not share a die</option>`,...dice.map((d)=>`<option value="${esc(d.instance.id)}" ${d.instance.id===self.sharedDieId?'selected':''}>${esc(titleKey(d.key))} · Class ${d.instance.cls}</option>`)].join('');
  const incoming=social.friends.filter((f)=>f.status==='incoming');
  const outgoing=social.friends.filter((f)=>f.status==='outgoing');
  const accepted=social.friends.filter((f)=>f.status==='accepted').sort((a,b)=>a.displayName.localeCompare(b.displayName));
  showModal(`
    <h2>Friends</h2>
    <div class="socialSelf">
      <label>Display name</label><div class="inlineRow"><input id="v6DisplayName" maxlength="24" value="${esc(self.displayName)}"><button id="v6SaveName">Save</button></div>
      <label>Your Friend Code</label><div class="friendCode"><strong>${esc(self.friendCode)}</strong><button id="v6CopyCode">Copy</button></div>
      <label>Shared Die</label><select id="v6SharedDie">${sharedOptions}</select>
      <p class="micro">Friends can borrow this exact die as a read-only support for Adventure. It never leaves your inventory.</p>
    </div>
    <div class="addFriend"><input id="v6FriendCodeInput" placeholder="TTD-XXXX-XXXX-XXXX"><button id="v6AddFriend">Add Friend</button></div>
    ${incoming.length?`<h3>Requests</h3><div id="v6Incoming">${incoming.map((f)=>`<div class="friendRow friendIncoming" data-uid="${esc(f.uid)}"><div><strong>${esc(f.displayName)}</strong><small> wants to be friends</small></div><div><button data-accept="${esc(f.uid)}">Accept</button><button data-decline="${esc(f.uid)}">Decline</button></div></div>`).join('')}</div>`:''}
    ${outgoing.length?`<h3>Sent</h3>${outgoing.map((f)=>`<div class="friendRow friendOutgoing"><strong>${esc(f.displayName)}</strong><small> Request pending</small></div>`).join('')}`:''}
    <h3>Friends <span class="micro">(long press for menu)</span></h3>
    <div id="v6Accepted">${accepted.length?accepted.map((f)=>`<div class="friendRow friendAccepted" data-friend="${esc(f.uid)}"><div><strong>${esc(f.displayName)}</strong><small>${f.sharedDie?` Sharing ${esc(titleKey(f.sharedDie.key))} C${f.sharedDie.instance.cls}`:' No Shared Die'}</small></div>${self.selectedSupportUid===f.uid?'<span class="supportBadge">SUPPORT</span>':''}</div>`).join(''):'<p class="emptyText">No friends yet. Share your Friend Code or add someone above.</p>'}</div>
  `,true);

  el('v6SaveName')?.addEventListener('click',async()=>{
    try {
      social=(await call('setPublicDisplayName',{displayName:el('v6DisplayName').value})).social;
      if(el('accountLabel')) el('accountLabel').textContent=social.self.displayName;
      await renderFriendsModal();
    } catch(err){alert(humanize(err));}
  });
  el('v6CopyCode')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(self.friendCode);el('v6CopyCode').textContent='Copied';}catch(_){}});
  el('v6SharedDie')?.addEventListener('change',async(event)=>{try{social=(await call('setSharedDie',{instanceId:event.target.value||null})).social;await renderFriendsModal();}catch(err){alert(humanize(err));}});
  el('v6AddFriend')?.addEventListener('click',async()=>{
    const button=el('v6AddFriend');button.disabled=true;
    try{social=(await call('sendFriendRequest',{friendCode:el('v6FriendCodeInput').value})).social;await renderFriendsModal();}catch(err){alert(humanize(err));button.disabled=false;}
  });
  modalCard.querySelectorAll('[data-accept]').forEach((button)=>button.addEventListener('click',async()=>{try{social=(await call('acceptFriendRequest',{uid:button.dataset.accept})).social;progression=null;await renderFriendsModal();}catch(err){alert(humanize(err));}}));
  modalCard.querySelectorAll('[data-decline]').forEach((button)=>button.addEventListener('click',async()=>{try{social=(await call('declineFriendRequest',{uid:button.dataset.decline})).social;await renderFriendsModal();}catch(err){alert(humanize(err));}}));
  modalCard.querySelectorAll('[data-friend]').forEach((row)=>{const f=accepted.find((x)=>x.uid===row.dataset.friend);if(f)attachLongPress(row,f);});
}

async function openFriendMenu(friend) {
  const using=social?.self?.selectedSupportUid===friend.uid;
  showModal(`
    <h2>${esc(friend.displayName)}</h2>
    <p class="micro">${esc(friend.friendCode||'')}</p>
    ${friend.sharedDie?`<div class="sharedDiePreview"><strong>Shared Die</strong><span>${esc(titleKey(friend.sharedDie.key))} · Class ${friend.sharedDie.instance.cls}</span></div>`:'<p>This friend is not currently sharing a die.</p>'}
    <div class="friendMenuButtons">
      <button id="v6ViewProfile">View Profile</button>
      <button id="v6ViewDeck">View Deck</button>
      <button id="v6UseSupport" ${friend.sharedDie?'':'disabled'}>${using?'Stop Using Shared Die':'Use Shared Die'}</button>
      <button id="v6RemoveFriend" class="danger">Remove Friend</button>
    </div>
  `);
  el('v6ViewProfile')?.addEventListener('click',async()=>{try{const p=(await call('getPublicProfile',{uid:friend.uid})).profile;showModal(`<h2>${esc(p.displayName)}</h2><p>Friend Code: <strong>${esc(p.friendCode||'')}</strong></p>${p.sharedDie?`<p>Shared Die: <strong>${esc(titleKey(p.sharedDie.key))} · Class ${p.sharedDie.instance.cls}</strong></p>`:'<p>No Shared Die selected.</p>'}`);}catch(err){alert(humanize(err));}});
  el('v6ViewDeck')?.addEventListener('click',async()=>{try{const deck=(await call('getFriendDeck',{uid:friend.uid})).deck;hideModal();postToGame({type:'ttd:friend-deck-view',deck});}catch(err){alert(humanize(err));}});
  el('v6UseSupport')?.addEventListener('click',async()=>{try{social=(await call('selectSharedSupport',{uid:using?null:friend.uid})).social;await renderFriendsModal();}catch(err){alert(humanize(err));}});
  el('v6RemoveFriend')?.addEventListener('click',async()=>{if(!confirm(`Remove ${friend.displayName} from your friends list?`))return;try{social=(await call('removeFriend',{uid:friend.uid})).social;await renderFriendsModal();}catch(err){alert(humanize(err));}});
}

function rewardSummary(item) {
  const parts=[];
  if(Number(item.rewardPips||0)>0)parts.push(`${item.rewardPips} Pips`);
  if(Number(item.rewardAstras||0)>0)parts.push(`${item.rewardAstras} Astras`);
  if(Number(item.rewardDice||0)>0)parts.push(`${item.rewardDice} Dice`);
  return parts.join(' · ')||'Reward';
}
async function renderProgressModal() {
  if(!progression)await refreshProgression();
  const a=progression.achievements||[],d=progression.daily?.tasks||[];
  const row=(item,kind)=>`<div class="progressRow ${item.claimed?'claimed':item.eligible?'ready':''}"><div><strong>${esc(item.name)}</strong><small>${esc(item.desc)}</small></div><div class="progressReward">${esc(rewardSummary(item))} <button data-${kind}="${esc(item.id)}" ${item.claimed||!item.eligible?'disabled':''}>${item.claimed?'Claimed':item.eligible?'Claim':'Locked'}</button></div></div>`;
  showModal(`<h2>Quests</h2><h3>Daily · ${esc(progression.daily?.dayKey||'')}</h3>${d.map((x)=>row(x,'daily')).join('')}<h3>Achievements</h3>${a.map((x)=>row(x,'achievement')).join('')}`,true);
  modalCard.querySelectorAll('[data-achievement]').forEach((button)=>button.addEventListener('click',async()=>{
    button.disabled=true;const old=button.textContent;button.textContent='Claiming…';
    try{const data=await call('claimAchievement',{id:button.dataset.achievement});applyMutationPayload(data);await renderProgressModal();}catch(err){button.disabled=false;button.textContent=old;alert(humanize(err));}
  }));
  modalCard.querySelectorAll('[data-daily]').forEach((button)=>button.addEventListener('click',async()=>{
    button.disabled=true;const old=button.textContent;button.textContent='Claiming…';
    try{const data=await call('claimDaily',{id:button.dataset.daily});applyMutationPayload(data);await renderProgressModal();}catch(err){button.disabled=false;button.textContent=old;alert(humanize(err));}
  }));
}

friendsBtn?.addEventListener('click',()=>renderFriendsModal().catch((err)=>alert(humanize(err))));
progressBtn?.addEventListener('click',()=>renderProgressModal().catch((err)=>alert(humanize(err))));

giftBtn?.addEventListener('click',async()=>{
  if(!giftInput?.value.trim())return;
  giftBtn.disabled=true;giftStatus.textContent='Redeeming…';
  try{
    const data=await call('redeemOnlineGiftCode',{code:giftInput.value});
    applyMutationPayload(data);
    progression=null;
    giftInput.value='';
    const bits=[];
    if(data.reward?.pips)bits.push(`${data.reward.pips} Pips`);
    if(data.reward?.astras)bits.push(`${data.reward.astras} Astras`);
    if(data.reward?.dice?.length)bits.push(`${data.reward.dice.length} die${data.reward.dice.length===1?'':'s'}`);
    if(data.reward?.jewels?.length)bits.push(`${data.reward.jewels.length} jewel${data.reward.jewels.length===1?'':'s'}`);
    giftStatus.textContent=`Redeemed ${data.reward?.label||'gift'}${bits.length?`: ${bits.join(', ')}`:''}.`;
  } catch(err){giftStatus.textContent=humanize(err);} finally{giftBtn.disabled=false;}
});

async function operation(name,data,resultType,requestId) {
  try{
    const result=await call(name,data);
    applyMutationPayload(result);
    postToGame({type:resultType,requestId,...result});
    return result;
  }catch(err){postToGame({type:`${resultType}-error`,requestId,message:humanize(err)});throw err;}
}

window.addEventListener('message',async(event)=>{
  if(event.origin!==location.origin||event.source!==gameFrame?.contentWindow)return;
  const m=event.data||{};

  if(m.type==='ttd:deck-state-request'&&Array.isArray(m.decks)&&m.decks.length>3){
    event.stopImmediatePropagation();
    try{
      await call('setDeckState',{decks:m.decks,activeDeckIdx:m.activeDeckIdx});
      await refreshSnapshot(false);
      postToGame({type:'ttd:v6-deck-state-result',requestId:m.requestId,snapshot});
    }catch(err){postToGame({type:'ttd:v6-deck-state-error',requestId:m.requestId,message:humanize(err)});}
    return;
  }

  if(m.type==='ttd:bridge-synced'){queueMicrotask(()=>{if(!v6Synced)gameFrame.style.pointerEvents='none';});return;}
  if(m.type==='ttd:v6-ready'){v6BridgeReady=true;gameFrame.style.pointerEvents='none';sendSnapshot();return;}
  if(m.type==='ttd:v6-synced'){v6Synced=true;gameFrame.style.pointerEvents='auto';return;}
  if(m.type==='ttd:v6-refresh-request'){
    try{await refreshSnapshot(true);progression=null;}catch(err){console.error(err);}
    return;
  }

  const rid=m.requestId;
  try{
    if(m.type==='ttd:v6-socket-request')await operation('socketJewel',{dieId:m.dieId,jewelId:m.jewelId,slot:m.slot},'ttd:v6-socket-result',rid);
    else if(m.type==='ttd:v6-unsocket-request')await operation('unsocketJewel',{dieId:m.dieId,slot:m.slot},'ttd:v6-unsocket-result',rid);
    else if(m.type==='ttd:v6-enchant-request')await operation('enchantJewel',{jewelId:m.jewelId,cardId:m.cardId},'ttd:v6-enchant-result',rid);
    else if(m.type==='ttd:v6-shop-buy-request')await operation('shopPurchase',{itemId:m.itemId,quantity:m.quantity},'ttd:v6-shop-buy-result',rid);
    else if(m.type==='ttd:v6-shop-sell-request')await operation('shopSell',{kind:m.kind,itemId:m.itemId},'ttd:v6-shop-sell-result',rid);
    else if(m.type==='ttd:v6-chest-open-request')await operation('openChest',{chestId:m.chestId},'ttd:v6-chest-open-result',rid);
    else if(m.type==='ttd:v6-setting-request')await operation('updateGameSettings',{showDamageNumbers:!!m.showDamageNumbers},'ttd:v6-setting-result',rid);
    else if(m.type==='ttd:v6-run-begin-request'){
      const data=await call('beginRun',{modeKey:m.modeKey,difficultyKey:m.difficultyKey||null,campaign:!!m.campaign});
      postToGame({type:'ttd:v6-run-begin-result',requestId:rid,...data});
    }else if(m.type==='ttd:v6-run-finish-request'){
      const data=await call('finishRun',{runId:m.runId,completedWaves:m.completedWaves,kills:m.kills,coinGold:m.coinGold,wave:m.wave,typhoonDefeated:!!m.typhoonDefeated,luckBonus:m.luckBonus,playSeconds:m.playSeconds});
      applyMutationPayload(data);progression=null;postToGame({type:'ttd:v6-run-finish-result',requestId:rid,...data});
    }
  }catch(err){console.error('V9 online operation failed.',m.type,err);}
},true);

async function start() {
  const app=await waitForApp();auth=getAuth(app);functions=getFunctions(app,REGION);
  onAuthStateChanged(auth,async(user)=>{
    currentUser=user;snapshot=null;social=null;progression=null;v6Synced=false;
    if(!user)return;
    try{await refreshBootstrap();}
    catch(err){
      console.error('Could not load complete online account.',err);
      const status=el('status');
      if(status){status.hidden=false;status.textContent=`Online account load failed: ${humanize(err)}`;status.dataset.kind='error';}
      gameFrame.style.pointerEvents='none';
    }
  });
}
start().catch((err)=>console.error('Single-player v9 client could not start.',err));