(() => {
  'use strict';
  if (window.__TTD_UI_FUSION_V29) return;
  window.__TTD_UI_FUSION_V29 = true;
  const frame=document.getElementById('gameFrame');
  if(!frame)return;
  const CSS=`
  :root{--ttd-frame-hi:#4f6fb0;--ttd-frame:#243d75;--ttd-frame-lo:#101a39;--ttd-well:#070b18;--ttd-well2:#0e1530;--ttd-blue:#1d64b5;--ttd-blue-hi:#3f8be0;--ttd-gold:#d9b26a;--ttd-gold-hi:#f5d892;--ttd-edge:rgba(121,163,229,.42)}
  #app{background:radial-gradient(120% 60% at 50% -10%,rgba(83,84,184,.18),transparent 60%),linear-gradient(180deg,#0b1020,#070a13)!important}
  .screen:not(#gameScreen){background:linear-gradient(180deg,#0a1020,#070a13)!important}
  .topbar{border-bottom:1px solid #15234a!important;background:linear-gradient(180deg,#17274e 0%,#101a38 47%,#080d1e 100%)!important;box-shadow:inset 0 1px 0 rgba(130,175,236,.28),inset 0 -2px 0 rgba(0,0,0,.62),0 3px 10px rgba(0,0,0,.42)!important}
  .topbar .title{text-shadow:0 1px 0 #000,0 0 12px rgba(217,178,106,.26)!important}
  .goldPill,.astraPill,.invBtn,.gearBtn{background:linear-gradient(180deg,#28375a,#11192f 48%,#080d1b)!important;border:1px solid #51658f!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -2px 2px rgba(0,0,0,.65),0 2px 5px rgba(0,0,0,.38)!important}
  .backBtn,.shopSubBtn,.qtyBtn,.enchantCardOption,.deckTab,.filterBtn,.sortBtn,.secondaryBtn,.rewardPopupCard button,.modalCard button:not(.dangerBtn),.infoModal button:not(.dangerBtn){background:linear-gradient(180deg,#31466f 0%,#1a2848 45%,#10182f 53%,#0b1021 100%)!important;border:1px solid #5b73a3!important;color:#edf2ff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 -2px 3px rgba(0,0,0,.72),0 2px 5px rgba(0,0,0,.4)!important;text-shadow:0 1px 1px #000!important}
  .backBtn:active,.shopSubBtn:active,.qtyBtn:active,.enchantCardOption:active,.deckTab:active,.filterBtn:active,.sortBtn:active,.secondaryBtn:active{transform:translateY(1px);box-shadow:inset 0 2px 4px rgba(0,0,0,.65),0 1px 1px rgba(0,0,0,.3)!important}
  .shopSubBtn.active,.deckTab.active,.filterBtn.active,.sortBtn.active{color:var(--ttd-gold-hi)!important;border-color:#b99654!important;background:linear-gradient(180deg,#38558a,#20375f 48%,#131d37)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -2px 3px rgba(0,0,0,.7),0 0 10px rgba(217,178,106,.18)!important}
  .shopGoBtn,.shopItemCard .siBuyBtn,.chestOpenBtn,.primaryBtn,.saveDeckBtn,#ttdDeckSaveBtn,.rewardPopupCard .primary{border:1px solid #f1d58c!important;background:linear-gradient(180deg,#fff0b2 0%,#e8c472 44%,#b9893d 52%,#8f652c 100%)!important;color:#171006!important;text-shadow:0 1px 0 rgba(255,255,255,.45)!important;box-shadow:inset 0 1px 0 #fff8d8,inset 0 -3px 4px rgba(72,42,5,.5),0 3px 7px rgba(0,0,0,.46)!important}
  .shopGoBtn:active,.shopItemCard .siBuyBtn:active,.chestOpenBtn:active,.primaryBtn:active,.saveDeckBtn:active,#ttdDeckSaveBtn:active{transform:translateY(1px);box-shadow:inset 0 3px 5px rgba(86,49,6,.55),0 1px 2px rgba(0,0,0,.35)!important}
  .shopItemCard,.chestCard,.collectionCard,.diceCard,.dieCard,.invCard,.modeCard:not(.zombieSub),.stageCard,.friendCard,.socialCard,.deckSlot,.equippedSlot{background:linear-gradient(180deg,#18264a 0%,#101a35 10%,#0b1022 100%)!important;border:2px solid #263e73!important;outline:1px solid rgba(104,147,211,.16);box-shadow:inset 0 0 0 2px rgba(0,0,0,.5),inset 0 1px 0 rgba(115,167,231,.24),0 3px 7px rgba(0,0,0,.5)!important}
  .shopItemCard::before,.chestCard::before,.collectionCard::before,.diceCard::before,.dieCard::before,.invCard::before{content:'';position:absolute;inset:3px;border-radius:inherit;pointer-events:none;border-top:1px solid rgba(255,255,255,.08)}
  #shopGrid,#invGrid,#collectionGrid,.modeBody,.stageBody,.deckBody,.friendsBody,.socialBody{background:linear-gradient(180deg,rgba(19,31,61,.72),rgba(5,8,17,.94))!important;box-shadow:inset 0 0 0 2px rgba(0,0,0,.72),inset 0 0 18px rgba(0,0,0,.62)!important}
  #collectionGrid{border-top:2px solid #263b6b!important}
  .rewardPopup,.modalOverlay,.infoOverlay,.confirmOverlay{background:rgba(2,5,13,.84)!important;backdrop-filter:blur(2px)}
  .rewardPopupCard,.modalCard,.infoModal,.confirmCard,.detailCard{background:linear-gradient(180deg,#263b68 0%,#17274b 6%,#0c142b 100%)!important;border:2px solid #5974aa!important;box-shadow:inset 0 0 0 2px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.17),0 12px 32px rgba(0,0,0,.72),0 0 18px rgba(56,102,174,.24)!important}
  .rewardPopupCard h3,.modalCard h3,.infoModal h3,.detailCard h3{color:#f6dc98!important;text-shadow:0 1px 0 #000,0 0 8px rgba(217,178,106,.22)!important}
  input,select,textarea,.searchInput,.filterSelect{background:linear-gradient(180deg,#070b16,#10182d)!important;border:1px solid #425a89!important;color:#eef3ff!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.75),0 1px 0 rgba(255,255,255,.05)!important}
  .scrollY::-webkit-scrollbar,#collectionGrid::-webkit-scrollbar{width:15px!important}
  .scrollY::-webkit-scrollbar-track,#collectionGrid::-webkit-scrollbar-track{background:linear-gradient(90deg,#080d1b,#1b2a4b,#080d1b)!important;border:1px solid #31466f!important;border-radius:8px!important;box-shadow:inset 0 2px 5px #000!important}
  .scrollY::-webkit-scrollbar-thumb,#collectionGrid::-webkit-scrollbar-thumb{background:linear-gradient(90deg,#2b4777,#7595ca 45%,#38588d)!important;border:2px solid #182746!important;border-radius:8px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.32),0 0 5px rgba(76,133,205,.35)!important}
  .bottomNav,.navBar,.footerNav{background:linear-gradient(180deg,#263654 0%,#16233f 28%,#0b1122 100%)!important;border-top:1px solid #536c9a!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 -4px 12px rgba(0,0,0,.4)!important}
  .bottomNav button,.navBar button,.footerNav button{filter:drop-shadow(0 1px 0 #000)}
  /* Zombie Mode's established gradient is protected by excluding .zombieSub from all card skin rules. */
  @media(max-width:520px){.shopItemCard,.chestCard,.collectionCard,.diceCard,.dieCard,.invCard{border-width:1.5px!important}}
  `;
  function install(){let doc;try{doc=frame.contentDocument;}catch(_){return}if(!doc?.head||!doc.getElementById('app'))return;let style=doc.getElementById('ttd-ui-fusion-v29');if(!style){style=doc.createElement('style');style.id='ttd-ui-fusion-v29';doc.head.appendChild(style)}style.textContent=CSS;doc.documentElement.dataset.ttdUi='fusion-v29'}
  frame.addEventListener('load',()=>setTimeout(install,60));
  const timer=setInterval(()=>{install();try{if(frame.contentDocument?.getElementById('ttd-ui-fusion-v29'))clearInterval(timer)}catch(_){}},100);
})();
