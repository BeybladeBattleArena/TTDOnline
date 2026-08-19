import { getApps, getApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js';

const REGION='us-central1';
const el=(id)=>document.getElementById(id);
const gameFrame=el('gameFrame');
const modal=el('v6Modal');
const modalCard=el('v6ModalCard');
let auth=null,functions=null,currentUser=null,manager=null;
let friendContextUid=null,friendContextName='Friend';
let friendSummarySignature='';
let friendSummaryPending=false;

function esc(text){return String(text==null?'':text).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function titleKey(key){return String(key||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase());}
function humanize(err){return err?.message?.replace(/^FirebaseError:\s*/i,'')||'The online service could not complete that action.';}
function postToGame(message){if(gameFrame?.contentWindow)gameFrame.contentWindow.postMessage(message,location.origin);}
async function call(name,data={}){if(!functions||!currentUser)throw new Error('Sign in again before continuing.');const result=await httpsCallable(functions,name)(data);return result.data;}
async function waitForApp(){for(let i=0;i<500;i++){if(getApps().length)return getApp();await new Promise((resolve)=>setTimeout(resolve,20));}throw new Error('Firebase did not initialize.');}

const style=document.createElement('style');
style.id='ttd-deck-social-client-v18-style';
style.textContent=`
  #accountLevelV18{flex:0 0 auto;color:var(--gold-glow);font:700 8px 'Space Mono',monospace;border:1px solid rgba(217,178,106,.42);border-radius:8px;padding:2px 4px;background:rgba(217,178,106,.08);}
  .v18FriendHeading{display:flex!important;align-items:center;gap:6px;flex-wrap:wrap;}
  .v18SocialDie{display:inline-flex;align-items:center;max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 5px;border:1px solid #4d557e;border-radius:7px;background:#0d1020;color:#d8dcf0;font:700 8px Inter,sans-serif;vertical-align:middle;}
  .v18FriendLevel{color:var(--gold-glow)!important;font-weight:700;}
  .v18Conversation{display:flex;flex-direction:column;gap:7px;max-height:52dvh;overflow:auto;padding:8px;border:1px solid var(--line);border-radius:9px;background:#0d1020;}
  .v18Message{max-width:85%;padding:7px 9px;border-radius:10px;background:#202746;font-size:11px;line-height:1.35;align-self:flex-start;}
  .v18Message.self{align-self:flex-end;background:#554725;color:#fff2c9;}
  .v18Message small{display:block;margin-top:3px;opacity:.55;font-size:7px;}
  .v18MessageComposer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:9px;}
  .v18MessageComposer textarea{min-height:66px;resize:none;border:1px solid var(--line);border-radius:9px;background:#0d1020;color:#fff;padding:9px;font:11px Inter,sans-serif;}
  .v18MessageComposer button{align-self:stretch;min-width:68px;}
`;
document.head.appendChild(style);

function renderLevel(){
  const trigger=document.getElementById('accountDropdownBtn');
  const name=trigger?.querySelector('.accountName');
  if(!trigger||!name)return;
  let badge=document.getElementById('accountLevelV18');
  if(!badge){badge=document.createElement('span');badge.id='accountLevelV18';name.insertAdjacentElement('afterend',badge);}
  badge.textContent=`Lv.${manager?.level?.level||1}`;
  badge.title=`${manager?.level?.xp||0} XP${manager?.level?.nextLevelXp==null?' · MAX':` / ${manager.level.nextLevelXp}`}`;
}
function syncManager(){if(manager)postToGame({type:'ttd:deck-v18-state',manager});renderLevel();}
async function loadManager(){const data=await call('getDeckManagerState');manager=data.manager;syncManager();return manager;}

async function handleDeckRequest(message){
  const common={index:message.index,slots:message.slots,name:message.name};
  try{
    let data;
    if(message.type==='ttd:deck-v18-save-request')data=await call('saveDeckV18',common);
    else if(message.type==='ttd:deck-v18-equip-request')data=await call('equipDeckV18',common);
    else if(message.type==='ttd:deck-v18-rename-request')data=await call('renameDeckV18',{index:message.index,name:message.name});
    else return;
    manager=data.manager;syncManager();
    const resultType=message.type.replace('-request','-result');
    postToGame({type:resultType,requestId:message.requestId,index:message.index,manager});
  }catch(err){
    console.error('Deck v18 request failed.',err);
    postToGame({type:'ttd:deck-v18-error',requestId:message.requestId,message:humanize(err)});
  }
}

function friendRows(){return [...document.querySelectorAll('#v6Accepted .friendRow.friendAccepted[data-friend]')];}
async function enhanceFriendRows(){
  const rows=friendRows();if(!rows.length||friendSummaryPending)return;
  const uids=rows.map((row)=>row.dataset.friend).filter(Boolean);
  const signature=uids.join('|');
  if(signature===friendSummarySignature&&rows.every((row)=>row.dataset.v18Enhanced==='1'))return;
  friendSummaryPending=true;
  try{
    const data=await call('getFriendsSummaryV18',{uids});
    const byUid=new Map((data.friends||[]).map((friend)=>[friend.uid,friend]));
    rows.forEach((row)=>{
      const friend=byUid.get(row.dataset.friend);if(!friend)return;
      const strong=row.querySelector('strong');const small=row.querySelector('small');
      if(strong){
        strong.classList.add('v18FriendHeading');
        strong.querySelector('.v18SocialDie')?.remove();
        if(friend.sharedDie){
          const die=document.createElement('span');die.className='v18SocialDie';die.textContent=`${titleKey(friend.sharedDie.key)} C${friend.sharedDie.instance?.cls||1}`;die.title='Shared Social Die';strong.appendChild(die);
        }
      }
      if(small){small.classList.add('v18FriendLevel');small.textContent=`Level ${friend.level?.level||1} · Active: ${friend.activeDeck?.name||`Deck ${(friend.activeDeck?.index||0)+1}`}`;}
      row.dataset.v18Enhanced='1';
    });
    friendSummarySignature=signature;
  }catch(err){console.error('Could not enrich friends list.',err);}finally{friendSummaryPending=false;}
}

function formatTime(ms){if(!ms)return'';try{return new Date(ms).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch(_){return'';}}
async function openConversation(uid,name){
  if(!modal||!modalCard)return;
  try{
    const data=await call('getFriendConversationV18',{uid});
    const messages=data.messages||[];
    modalCard.classList.remove('wide');
    modalCard.innerHTML=`<button class="modalX" id="v18ConversationClose" type="button">×</button><h2>${esc(name)}</h2><p class="micro">Friend Messages</p><div id="v18Conversation" class="v18Conversation">${messages.length?messages.map((m)=>`<div class="v18Message ${m.senderUid===currentUser?.uid?'self':''}">${esc(m.text)}<small>${esc(formatTime(m.createdAtMs))}</small></div>`).join(''):'<p class="micro">No messages yet.</p>'}</div><div class="v18MessageComposer"><textarea id="v18MessageText" maxlength="280" placeholder="Write a message…"></textarea><button id="v18SendMessage" type="button">Send</button></div>`;
    modal.hidden=false;
    const list=el('v18Conversation');if(list)list.scrollTop=list.scrollHeight;
    el('v18ConversationClose')?.addEventListener('click',()=>{modal.hidden=true;modalCard.innerHTML='';});
    el('v18SendMessage')?.addEventListener('click',async()=>{
      const button=el('v18SendMessage');const field=el('v18MessageText');const text=field?.value.trim();if(!text)return;
      button.disabled=true;
      try{await call('sendFriendMessageV18',{uid,text});await openConversation(uid,name);}catch(err){alert(humanize(err));button.disabled=false;}
    });
  }catch(err){alert(humanize(err));}
}

function enhanceFriendMenu(){
  const deckButton=document.getElementById('v6ViewDeck');
  if(!deckButton||!friendContextUid)return;
  deckButton.textContent='Check Active Deck';
  if(deckButton.dataset.v18Bound!=='1'){
    deckButton.dataset.v18Bound='1';
    deckButton.addEventListener('click',async(event)=>{
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      try{const data=await call('getFriendActiveDeckV18',{uid:friendContextUid});modal.hidden=true;postToGame({type:'ttd:friend-deck-view',deck:data.deck});}catch(err){alert(humanize(err));}
    },true);
  }
  const buttons=deckButton.closest('.friendMenuButtons');
  if(buttons&&!document.getElementById('v18SendFriendMessage')){
    const send=document.createElement('button');send.id='v18SendFriendMessage';send.type='button';send.textContent='Send Message';
    send.addEventListener('click',()=>openConversation(friendContextUid,friendContextName));
    deckButton.insertAdjacentElement('afterend',send);
  }
}

let enhanceTimer=0;
function queueEnhance(){clearTimeout(enhanceTimer);enhanceTimer=setTimeout(()=>{enhanceFriendRows();enhanceFriendMenu();},0);}
modalCard?.addEventListener('pointerdown',(event)=>{
  const row=event.target.closest?.('.friendRow.friendAccepted[data-friend]');
  if(row){friendContextUid=row.dataset.friend;friendContextName=row.querySelector('strong')?.childNodes?.[0]?.textContent?.trim()||row.querySelector('strong')?.textContent?.trim()||'Friend';}
},true);
if(modalCard)new MutationObserver(queueEnhance).observe(modalCard,{childList:true,subtree:true});

window.addEventListener('message',(event)=>{
  if(event.origin!==location.origin||event.source!==gameFrame?.contentWindow)return;
  const message=event.data||{};
  if(message.type==='ttd:deck-v18-ready'){syncManager();return;}
  if(message.type?.startsWith?.('ttd:deck-v18-'))handleDeckRequest(message);
});

window.addEventListener('ttd:account-progression-v21',(event)=>{
  const level=event.detail;if(!level||!manager)return;
  manager={...manager,level};syncManager();
});

async function start(){
  const app=await waitForApp();auth=getAuth(app);functions=getFunctions(app,REGION);
  onAuthStateChanged(auth,async(user)=>{
    currentUser=user;manager=null;friendSummarySignature='';
    if(!user){document.getElementById('accountLevelV18')?.remove();return;}
    try{await loadManager();}catch(err){console.error('Could not load deck manager/account level state.',err);}
  });
}
start().catch((err)=>console.error('Deck/social client v18 could not start.',err));