(() => {
  'use strict';
  if(window.__TTD_TEST_MAINMAP_BATTLE_V3)return;
  window.__TTD_TEST_MAINMAP_BATTLE_V3=true;

  const TEST_ID='test_map';
  const BACK_ID='ttdMainMapCombatBackV3';
  const FRONT_ID='ttdMainMapCombatFrontV3';

  const style=document.createElement('style');
  style.id='ttdMainMapCombatStyleV3';
  style.textContent=`
    #laneWrap.ttd-mainmap-combat-v3{background:#101522!important;overflow:hidden;}
    #laneWrap.ttd-mainmap-combat-v3 #${BACK_ID},
    #laneWrap.ttd-mainmap-combat-v3 #${FRONT_ID}{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}
    #laneWrap.ttd-mainmap-combat-v3 #${BACK_ID}{z-index:0;}
    #laneWrap.ttd-mainmap-combat-v3 #laneCanvas{z-index:2;background:transparent!important;}
    #laneWrap.ttd-mainmap-combat-v3 #${FRONT_ID}{z-index:3;}
    #laneWrap.ttd-mainmap-combat-v3 #toast{z-index:7;}
    #laneWrap.ttd-mainmap-combat-v3 #ttdPseudoBattleBackV1,
    #laneWrap.ttd-mainmap-combat-v3 #ttdPseudoBattleFrontV1,
    #laneWrap.ttd-mainmap-combat-v3 #ttdPseudoBattleBadgeV1,
    #laneWrap.ttd-mainmap-combat-v3 #ttdMainMapCombatBackV2,
    #laneWrap.ttd-mainmap-combat-v3 #ttdMainMapCombatFrontV2{display:none!important;}
  `;
  document.head.appendChild(style);

  function platformApi(){return window.__TTD_PLATFORM_TEST_API||null;}
  function isTestState(){
    return !!state?.__ttdTestMap && !!state?.adventure && !state?.typhoonPhase;
  }
  function hasExactRenderer(){
    return isTestState() && typeof platformApi()?.renderBattleBackdrop==='function';
  }
  function traversalVisible(){
    return !!platformApi()?.active || document.getElementById('gameScreen')?.classList.contains('ttd-platform-mode');
  }
  function combatVisible(){
    return hasExactRenderer() && !traversalVisible();
  }
  function combatArea(){return state?.__ttdPlatformDone?2:1;}

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
    const pack=ensureCanvas(BACK_ID,0);if(!pack)return false;
    const {g,w,h}=pack;
    g.clearRect(0,0,w,h);
    /* The traversal module itself draws this frame. There is no parallel pseudo-world renderer. */
    return platformApi()?.renderBattleBackdrop?.(g,w,h,combatArea(),performance.now()/1000)===true;
  }

  function drawCombatBounds(){
    const pack=ensureCanvas(FRONT_ID,3);if(!pack)return;
    const {g,w,h}=pack;
    g.clearRect(0,0,w,h);
    const area=combatArea();
    const left=w*(area===1?.10:.105),right=w*(area===1?.91:.895),top=h*.25,bottom=h*.82;
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
    lane.classList.remove('ttd-mainmap-combat-v2');
    lane.classList.add('ttd-mainmap-combat-v3');
    document.getElementById('ttdMainMapCombatBackV2')?.remove();
    document.getElementById('ttdMainMapCombatFrontV2')?.remove();
    drawExactBackdrop();drawCombatBounds();
  }
  function hideCombatWorld(){
    const lane=document.getElementById('laneWrap');
    lane?.classList.remove('ttd-mainmap-combat-v2','ttd-mainmap-combat-v3');
    document.getElementById(BACK_ID)?.remove();
    document.getElementById(FRONT_ID)?.remove();
    document.getElementById('ttdMainMapCombatBackV2')?.remove();
    document.getElementById('ttdMainMapCombatFrontV2')?.remove();
  }

  function installCombatPath(w,h){
    const area=combatArea();
    /* Each battle occupies a bounded clearing of the same traversal world. */
    pathPts=area===1?[
      {x:w*.89,y:h*.61},
      {x:w*.73,y:h*.56},
      {x:w*.56,y:h*.63},
      {x:w*.38,y:h*.57},
      {x:w*.16,y:h*.62},
    ]:[
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
    if(hasExactRenderer())return installCombatPath(w,h);
    return baseBuildPath(w,h);
  };

  const baseDrawLane=drawLane;
  drawLane=function drawLaneOnMainMap(dt){
    if(!combatVisible()){
      hideCombatWorld();
      return baseDrawLane(dt);
    }
    showCombatWorld();
    /* Preserve normal enemies, towers, projectiles and effects while removing only the old flat
       stage wash. The exact traversal renderer is visible directly underneath laneCanvas. */
    const themeIdx=state.typhoonPhase?2:Math.min(2,state.adventureStageIdx||0);
    const theme=STAGE_THEMES?.[themeIdx];
    const saved=theme?{top:theme.top,bottom:theme.bottom,tint:theme.tint}:null;
    if(theme){theme.top='rgba(0,0,0,0)';theme.bottom='rgba(0,0,0,0)';theme.tint='rgba(0,0,0,0)';}
    try{return baseDrawLane(dt);}finally{
      if(theme&&saved)Object.assign(theme,saved);
      drawExactBackdrop();drawCombatBounds();
    }
  };

  const baseRenderStageScreen=renderStageScreen;
  renderStageScreen=function renderStageScreenWithMainMapCombat(){
    baseRenderStageScreen();
    if(selectedAdventureId!==TEST_ID)return;
    const p=document.querySelector('#stageList .stageCard p');
    if(p)p.textContent='Fight in a sectioned combat area, traverse forward through that same map, then fight again in the next area — no map swap.';
  };

  window.__TTD_TEST_PSEUDO3D_BATTLE_API={
    version:3,
    get active(){return combatVisible();},
    get usesExactTraversalRenderer(){return hasExactRenderer();},
    get area(){return combatArea();}
  };
})();
