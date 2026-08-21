(() => {
  'use strict';
  if(window.__TTD_TEST_MAINMAP_BATTLE_V2)return;
  window.__TTD_TEST_MAINMAP_BATTLE_V2=true;

  const TEST_ID='test_map';
  const BACK_ID='ttdMainMapCombatBackV2';
  const FRONT_ID='ttdMainMapCombatFrontV2';
  const snapshot=document.createElement('canvas');
  let snapshotReady=false;

  const style=document.createElement('style');
  style.id='ttdMainMapCombatStyleV2';
  style.textContent=`
    #laneWrap.ttd-mainmap-combat-v2{background:#101522!important;overflow:hidden;}
    #laneWrap.ttd-mainmap-combat-v2 #${BACK_ID},
    #laneWrap.ttd-mainmap-combat-v2 #${FRONT_ID}{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}
    #laneWrap.ttd-mainmap-combat-v2 #${BACK_ID}{z-index:0;}
    #laneWrap.ttd-mainmap-combat-v2 #laneCanvas{z-index:2;background:transparent!important;}
    #laneWrap.ttd-mainmap-combat-v2 #${FRONT_ID}{z-index:3;}
    #laneWrap.ttd-mainmap-combat-v2 #toast{z-index:7;}
    #laneWrap.ttd-mainmap-combat-v2 #ttdPseudoBattleBackV1,
    #laneWrap.ttd-mainmap-combat-v2 #ttdPseudoBattleFrontV1,
    #laneWrap.ttd-mainmap-combat-v2 #ttdPseudoBattleBadgeV1{display:none!important;}
  `;
  document.head.appendChild(style);

  function isTestState(){
    return !!state?.__ttdTestMap && !!state?.adventure && !state?.typhoonPhase;
  }
  function combatActive(){
    return isTestState() && !!state?.__ttdPlatformDone && snapshotReady;
  }

  function cacheTraversalFrame(){
    try{
      const src=document.getElementById('ttdPlatformCanvas');
      if(src&&src.width>0&&src.height>0){
        const cs=getComputedStyle(src);
        const visible=cs.display!=='none'&&cs.visibility!=='hidden'&&Number(cs.opacity||1)>.03;
        if(visible){
          if(snapshot.width!==src.width||snapshot.height!==src.height){snapshot.width=src.width;snapshot.height=src.height;}
          const g=snapshot.getContext('2d');
          g.clearRect(0,0,snapshot.width,snapshot.height);
          g.drawImage(src,0,0);
          snapshotReady=true;
        }
      }
    }catch(err){console.warn('Could not cache traversal frame for combat.',err);}
    requestAnimationFrame(cacheTraversalFrame);
  }
  requestAnimationFrame(cacheTraversalFrame);

  function ensureCanvas(id,z){
    const lane=document.getElementById('laneWrap');if(!lane)return null;
    let c=document.getElementById(id);
    if(!c){
      c=document.createElement('canvas');c.id=id;c.style.zIndex=String(z);
      lane.insertBefore(c,document.getElementById('laneCanvas')||lane.firstChild);
    }
    const r=lane.getBoundingClientRect();
    const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    const pw=Math.max(1,Math.round(r.width*dpr)),ph=Math.max(1,Math.round(r.height*dpr));
    if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
    const g=c.getContext('2d');if(!g)return null;
    g.setTransform(dpr,0,0,dpr,0,0);
    return {c,g,w:r.width,h:r.height};
  }

  function drawExactBackdrop(){
    const pack=ensureCanvas(BACK_ID,0);if(!pack||!snapshotReady)return;
    const {g,w,h}=pack;
    g.clearRect(0,0,w,h);
    /* This is the actual final traversal frame — not a second renderer imitating it. */
    g.drawImage(snapshot,0,0,snapshot.width,snapshot.height,0,0,w,h);
  }

  function drawCombatBounds(){
    const pack=ensureCanvas(FRONT_ID,3);if(!pack)return;
    const {g,w,h}=pack;
    g.clearRect(0,0,w,h);
    const left=w*.105,right=w*.895,top=h*.25,bottom=h*.82;
    const pulse=.34+.11*Math.sin(performance.now()/510);
    const drawGate=(x,flip)=>{
      const grad=g.createLinearGradient(x,top,x,bottom);
      grad.addColorStop(0,'rgba(212,236,250,0)');
      grad.addColorStop(.18,`rgba(212,236,250,${pulse*.62})`);
      grad.addColorStop(.75,`rgba(143,196,232,${pulse})`);
      grad.addColorStop(1,'rgba(143,196,232,0)');
      g.strokeStyle=grad;g.lineWidth=2;
      g.beginPath();g.moveTo(x,top);g.lineTo(x,bottom);g.stroke();
      g.fillStyle='rgba(143,196,232,.20)';
      g.beginPath();g.moveTo(x,bottom-5);g.lineTo(x+flip*13,bottom+2);g.lineTo(x,bottom+8);g.closePath();g.fill();
    };
    drawGate(left,1);drawGate(right,-1);
    g.save();g.strokeStyle='rgba(143,196,232,.12)';g.lineWidth=1;g.setLineDash([6,8]);
    g.beginPath();g.moveTo(left,bottom);g.lineTo(right,bottom);g.stroke();g.restore();
  }

  function showCombatWorld(){
    const lane=document.getElementById('laneWrap');if(!lane)return;
    lane.classList.add('ttd-mainmap-combat-v2');
    drawExactBackdrop();drawCombatBounds();
  }
  function hideCombatWorld(){
    document.getElementById('laneWrap')?.classList.remove('ttd-mainmap-combat-v2');
    document.getElementById(BACK_ID)?.remove();
    document.getElementById(FRONT_ID)?.remove();
  }

  function installCombatPath(w,h){
    /* A contained marching lane inside the visible clearing, instead of changing worlds. */
    pathPts=[
      {x:w*.87,y:h*.55},
      {x:w*.72,y:h*.61},
      {x:w*.56,y:h*.54},
      {x:w*.40,y:h*.61},
      {x:w*.18,y:h*.55},
    ];
    segLens=[];totalLen=0;
    for(let i=1;i<pathPts.length;i++){
      const dx=pathPts[i].x-pathPts[i-1].x,dy=pathPts[i].y-pathPts[i-1].y;
      const len=Math.hypot(dx,dy);segLens.push(len);totalLen+=len;
    }
    towerPos=pathPts[pathPts.length-1];
  }

  const baseBuildPath=buildPath;
  buildPath=function buildPathOnMainMap(w,h){
    if(combatActive())return installCombatPath(w,h);
    return baseBuildPath(w,h);
  };

  const baseDrawLane=drawLane;
  drawLane=function drawLaneOnMainMap(dt){
    if(!combatActive()){
      hideCombatWorld();
      return baseDrawLane(dt);
    }
    showCombatWorld();
    /* Preserve all normal battle actors/effects, but make their old stage wash transparent. */
    const themeIdx=state.typhoonPhase?2:Math.min(2,state.adventureStageIdx||0);
    const theme=STAGE_THEMES?.[themeIdx];
    const saved=theme?{top:theme.top,bottom:theme.bottom,tint:theme.tint}:null;
    if(theme){theme.top='rgba(0,0,0,0)';theme.bottom='rgba(0,0,0,0)';theme.tint='rgba(0,0,0,0)';}
    try{return baseDrawLane(dt);}finally{
      if(theme&&saved)Object.assign(theme,saved);
      drawCombatBounds();
    }
  };

  const baseRenderStageScreen=renderStageScreen;
  renderStageScreen=function renderStageScreenWithMainMapCombat(){
    baseRenderStageScreen();
    if(selectedAdventureId!==TEST_ID)return;
    const p=document.querySelector('#stageList .stageCard p');
    if(p)p.textContent='Traverse the stage, then fight inside sectioned combat areas on that exact same map.';
  };

  window.__TTD_TEST_PSEUDO3D_BATTLE_API={
    version:2,
    get active(){return combatActive();},
    get usesExactTraversalFrame(){return snapshotReady;}
  };

  /* This file is already loaded into the child game by the online bridge; load the shared presentation layer beside it. */
  if(!window.__TTD_GAME_PRESENTATION_LOADER_V1){
    window.__TTD_GAME_PRESENTATION_LOADER_V1=true;
    fetch('/online/game-presentation-v1.js?v=1',{cache:'no-store'})
      .then((r)=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text();})
      .then((source)=>eval(`${source}\n//# sourceURL=/online/game-presentation-v1.js`))
      .catch((err)=>console.error('Game presentation V1 could not load.',err));
  }
})();
