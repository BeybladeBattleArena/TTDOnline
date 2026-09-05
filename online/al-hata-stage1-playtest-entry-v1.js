(() => {
  'use strict';
  if(window.__TTD_AL_HATA_PLAYTEST_ENTRY_V1)return;
  window.__TTD_AL_HATA_PLAYTEST_ENTRY_V1=true;
  window.TTDGamePresentation?.rebind?.();
  const AH_ID='al_hata',CENTER_INDEX=7;
  const baseStartAdventure=startAdventure;
  let opening=false,cleanupActive=null;

  const style=document.createElement('style');
  style.id='ttdAlHataOpeningStyleV1';
  style.textContent=`
    #gameScreen.ttd-ah-opening-prelude #boardWrap{display:block!important;position:relative!important;opacity:1!important;filter:none!important;}
    #gameScreen.ttd-ah-opening-prelude #board{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important;}
    #gameScreen.ttd-ah-opening-prelude #tray{opacity:1!important;pointer-events:auto!important;filter:none!important;}
    #gameScreen.ttd-ah-opening-prelude .ttd-ah-prelude-slot{min-height:54px;border:1px dashed rgba(151,160,189,.22)!important;background:rgba(15,19,35,.30)!important;box-shadow:none!important;pointer-events:none!important;}
    #gameScreen.ttd-ah-opening-prelude .ttd-ah-prelude-slot.ttd-ah-nav-center{border-color:rgba(243,212,145,.48)!important;background:radial-gradient(circle,rgba(243,212,145,.10),rgba(15,19,35,.30) 72%)!important;box-shadow:0 0 16px rgba(243,212,145,.12)!important;}
    #ttdAhNavigatorPromptV1{position:absolute;left:50%;top:50%;z-index:30;transform:translate(-50%,-145%) scale(1);width:min(92%,390px);pointer-events:none;text-align:center;color:#f3d491;font:400 clamp(16px,4.8vw,24px) 'Russo One',sans-serif;letter-spacing:.025em;text-shadow:0 2px 0 rgba(0,0,0,.9),0 0 12px rgba(243,212,145,.46);animation:ttdAhNavPromptBounceV1 1.05s ease-in-out infinite;}
    #ttdAhNavigatorPromptV1 strong{color:#d4ecfa;font-weight:400;}
    @keyframes ttdAhNavPromptBounceV1{0%,100%{transform:translate(-50%,-145%) scale(1.12)}50%{transform:translate(-50%,-145%) scale(.91)}}
    #gameScreen.ttd-ah-opening-prelude #summonBtn{box-shadow:0 0 0 1px rgba(212,236,250,.52),0 0 18px rgba(143,196,232,.34)!important;animation:ttdAhSummonPulseV1 1.05s ease-in-out infinite!important;}
    @keyframes ttdAhSummonPulseV1{50%{transform:scale(.97);box-shadow:0 0 0 1px rgba(243,212,145,.68),0 0 24px rgba(243,212,145,.42)}}
    #ttdAhOpeningPreviewV1{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;}
  `;
  document.head.appendChild(style);

  function drawArrivalPreview(){
    const lane=document.getElementById('laneWrap');if(!lane)return;let canvas=document.getElementById('ttdAhOpeningPreviewV1');
    if(!canvas){canvas=document.createElement('canvas');canvas.id='ttdAhOpeningPreviewV1';lane.appendChild(canvas);}
    const r=lane.getBoundingClientRect(),dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1)),w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    const sky=g.createLinearGradient(0,0,0,h*.63);sky.addColorStop(0,'#69b9d3');sky.addColorStop(.58,'#a5d8df');sky.addColorStop(1,'#f0d79f');g.fillStyle=sky;g.fillRect(0,0,w,h);
    const horizon=h*.36,sea=g.createLinearGradient(0,horizon,0,h*.67);sea.addColorStop(0,'#75cad2');sea.addColorStop(1,'#2d879d');g.fillStyle=sea;g.fillRect(0,horizon,w,h*.36);
    g.fillStyle='rgba(43,84,91,.32)';for(let i=0;i<4;i++){const x=w*(.08+i*.27),wide=40+i*9;g.beginPath();g.moveTo(x-wide,horizon+5);g.quadraticCurveTo(x,horizon-25-(i%2)*9,x+wide,horizon+5);g.closePath();g.fill();}
    g.strokeStyle='rgba(245,253,244,.52)';g.lineWidth=1.3;for(let i=0;i<5;i++){const y=horizon+15+i*17;g.beginPath();g.moveTo(0,y);for(let x=0;x<=w+20;x+=20)g.lineTo(x,y+Math.sin((x+i*23)/30)*1.8);g.stroke();}
    const shore=h*.64;g.fillStyle='#dfc68b';g.beginPath();g.moveTo(0,shore);g.quadraticCurveTo(w*.3,shore-8,w*.58,shore+5);g.quadraticCurveTo(w*.8,shore+14,w,shore-2);g.lineTo(w,h);g.lineTo(0,h);g.closePath();g.fill();
    const bx=w*.25,by=shore-4;g.save();g.translate(bx,by);g.fillStyle='#6e472f';g.beginPath();g.moveTo(-48,-7);g.lineTo(46,-7);g.lineTo(31,17);g.lineTo(-35,17);g.closePath();g.fill();g.strokeStyle='#4e3527';g.lineWidth=4;g.beginPath();g.moveTo(-6,-10);g.lineTo(-6,-72);g.stroke();g.fillStyle='#eee1c4';g.beginPath();g.moveTo(-2,-68);g.lineTo(31,-45);g.lineTo(-2,-23);g.closePath();g.fill();g.restore();
    g.strokeStyle='#65503a';g.lineWidth=8;for(const px of [w*.08,w*.82]){g.beginPath();g.moveTo(px,shore+18);g.quadraticCurveTo(px-4,shore-35,px+7,shore-92);g.stroke();g.fillStyle='#34734a';for(let i=0;i<6;i++){const a=-2.65+i*.9;g.beginPath();g.ellipse(px+7+Math.cos(a)*28,shore-92+Math.sin(a)*15,24,7,a,0,Math.PI*2);g.fill();}}
  }

  function renderEmptyNavigatorTray(){
    const game=document.getElementById('gameScreen'),board=document.getElementById('board'),boardWrap=document.getElementById('boardWrap');if(!game||!board||!boardWrap)return;
    game.classList.remove('ttd-platform-mode','ttd-nav-instance-select');game.classList.add('ttd-ah-opening-prelude');
    document.getElementById('ttdPlatformCanvas')?.remove();document.getElementById('ttdPlatformHud')?.remove();document.getElementById('ttdPlatformError')?.remove();
    board.innerHTML='';for(let i=0;i<15;i++){const tile=document.createElement('div');tile.className='tile ttd-ah-prelude-slot'+(i===CENTER_INDEX?' ttd-ah-nav-center':'');board.appendChild(tile);}
    document.getElementById('deckRow')?.replaceChildren();
    let prompt=document.getElementById('ttdAhNavigatorPromptV1');if(!prompt){prompt=document.createElement('div');prompt.id='ttdAhNavigatorPromptV1';boardWrap.appendChild(prompt);}prompt.innerHTML='Tap <strong>[Summon Die]</strong> to create a Navigator Die';
  }

  function cleanupPrelude(){
    const game=document.getElementById('gameScreen');game?.classList.remove('ttd-ah-opening-prelude');document.getElementById('ttdAhNavigatorPromptV1')?.remove();document.getElementById('ttdAhOpeningPreviewV1')?.remove();
    if(cleanupActive){cleanupActive();cleanupActive=null;}
  }

  function showNavigatorPrelude(advId,stageIdx,diffKey,self,args){
    const adv=ADVENTURES?.[advId],stage=adv?.stages?.[stageIdx];if(!adv||!stage)return baseStartAdventure.apply(self,args);
    if(stage.locked){toastGlobal('Coming soon');return;}
    const deck=getActiveDeck();if(deck.length<5){toastGlobal(deck.length===0?'Build a deck first':'Your deck needs all 5 dice filled');showScreen('deck');return;}
    if(opening)return;opening=true;showScreen('game');
    if(modeLabel)modeLabel.textContent='Al Hata · Arrival Cove';document.getElementById('gameOverlay')?.classList.remove('show');document.getElementById('zSummaryOverlay')?.classList.remove('show');
    renderEmptyNavigatorTray();drawArrivalPreview();requestAnimationFrame(drawArrivalPreview);
    const button=document.getElementById('summonBtn'),cost=document.getElementById('summonCost');if(!button){opening=false;cleanupPrelude();return baseStartAdventure.apply(self,args);}button.disabled=false;if(cost)cost.textContent='FREE';
    const onSummon=event=>{
      if(!opening)return;event.preventDefault();event.stopImmediatePropagation();opening=false;window.__TTD_AL_HATA_PLAYTEST_PENDING_NAV_START=true;
      button.removeEventListener('click',onSummon,true);cleanupActive=null;const prompt=document.getElementById('ttdAhNavigatorPromptV1');if(prompt){prompt.textContent='Creating Navigator…';prompt.style.animation='none';}
      const result=baseStartAdventure.apply(self,args);cleanupPrelude();return result;
    };
    button.addEventListener('click',onSummon,true);cleanupActive=()=>button.removeEventListener('click',onSummon,true);return undefined;
  }

  const wrapped=function(...args){const [advId,stageIdx]=args;if(advId===AH_ID&&Number(stageIdx)===0)return showNavigatorPrelude(advId,stageIdx,args[2],this,args);return baseStartAdventure.apply(this,args);};
  wrapped.__ttdMissionWrappedV6=true;wrapped.__ttdMissionBaseV6=baseStartAdventure;startAdventure=wrapped;
})();
