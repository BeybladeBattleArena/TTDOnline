(() => {
  'use strict';
  if(window.__TTD_TEST_PSEUDO3D_BATTLE_V1)return;
  window.__TTD_TEST_PSEUDO3D_BATTLE_V1=true;

  const TEST_ID='test_map';
  const BACK_ID='ttdPseudoBattleBackV1';
  const FRONT_ID='ttdPseudoBattleFrontV1';
  const BADGE_ID='ttdPseudoBattleBadgeV1';

  const ROUTES={
    1:[
      {x:-100,z:-140,y:0},{x:220,z:-140,y:0},{x:220,z:120,y:0},
      {x:-20,z:120,y:0},{x:-20,z:0,y:0},
    ],
    2:[
      {x:1570,z:-145,y:20},{x:1370,z:-145,y:20},{x:1370,z:130,y:20},
      {x:1540,z:130,y:20},{x:1540,z:-10,y:20},{x:1450,z:-10,y:20},
    ],
  };
  const CAMERAS={1:60,2:1450};
  const PLATFORMS=[
    {id:'start',x1:-120,x2:270,z1:-190,z2:190,y:0,kind:'stone'},
    {id:'step1',x1:285,x2:420,z1:-155,z2:145,y:28,kind:'step'},
    {id:'step2',x1:435,x2:555,z1:-115,z2:115,y:62,kind:'step'},
    {id:'bridgeA',x1:575,x2:690,z1:-82,z2:82,y:72,kind:'timed'},
    {id:'gatecourt',x1:850,x2:1080,z1:-190,z2:190,y:56,kind:'court'},
    {id:'treasure',x1:1095,x2:1325,z1:-195,z2:195,y:40,kind:'court'},
    {id:'finish',x1:1340,x2:1580,z1:-170,z2:170,y:20,kind:'finish'},
  ];

  const style=document.createElement('style');
  style.id='ttdPseudoBattleStyleV1';
  style.textContent=`
    #laneWrap.ttd-pseudo3d-battle{background:#101522!important;overflow:hidden;}
    #laneWrap.ttd-pseudo3d-battle #${BACK_ID},
    #laneWrap.ttd-pseudo3d-battle #${FRONT_ID}{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}
    #laneWrap.ttd-pseudo3d-battle #${BACK_ID}{z-index:0;}
    #laneWrap.ttd-pseudo3d-battle #laneCanvas{z-index:2;background:transparent!important;}
    #laneWrap.ttd-pseudo3d-battle #${FRONT_ID}{z-index:3;}
    #laneWrap.ttd-pseudo3d-battle #toast{z-index:7;}
    #${BADGE_ID}{position:absolute;right:7px;top:7px;z-index:6;pointer-events:none;padding:4px 7px;border-radius:10px;
      border:1px solid rgba(217,178,106,.38);background:rgba(8,11,20,.72);color:#f3d491;
      font:700 8px 'Space Mono',monospace;letter-spacing:.05em;backdrop-filter:blur(2px);}
  `;
  document.head.appendChild(style);

  function isTestState(){return !!state?.__ttdTestMap && state?.adventure && !state?.typhoonPhase;}
  function routeId(){return state?.__ttdTestBattlePath===2?2:1;}
  function cameraX(id=routeId()){return CAMERAS[id]||CAMERAS[1];}

  function projectWorld(x,z,y=0,W=cw,H=ch,id=routeId()){
    const scale=Math.max(.52,Math.min(.82,W/520));
    const relX=x-cameraX(id),depth=(z+220)/440,persp=.82+depth*.22;
    return {x:W*.47+relX*scale*persp,y:H*.68+z*.28*scale-y*scale-relX*.035*scale,scale:scale*persp,depth};
  }
  function quad(p,W,H,id){return [
    projectWorld(p.x1,p.z1,p.y,W,H,id),projectWorld(p.x2,p.z1,p.y,W,H,id),
    projectWorld(p.x2,p.z2,p.y,W,H,id),projectWorld(p.x1,p.z2,p.y,W,H,id),
  ];}
  function poly(g,pts,fill,stroke){
    if(!pts.length)return;g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();
    if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.stroke();}
  }

  function installProjectedRoute(w,h){
    const id=routeId(),route=ROUTES[id]||ROUTES[1];
    pathPts=route.map(p=>projectWorld(p.x,p.z,p.y||0,w,h,id));
    segLens=[];totalLen=0;
    for(let i=1;i<pathPts.length;i++){
      const dx=pathPts[i].x-pathPts[i-1].x,dy=pathPts[i].y-pathPts[i-1].y;
      const len=Math.hypot(dx,dy);segLens.push(len);totalLen+=len;
    }
    towerPos=pathPts[pathPts.length-1];
    if(state){state.__ttdPseudoRouteApplied=id;state.__ttdPseudoRouteW=w;state.__ttdPseudoRouteH=h;}
  }

  const baseBuildPath=buildPath;
  buildPath=function buildPathWithTestPseudo3D(w,h){
    if(isTestState())return installProjectedRoute(w,h);
    return baseBuildPath(w,h);
  };

  function ensureRoute(){
    if(!isTestState())return;
    const id=routeId();
    if(state.__ttdPseudoRouteApplied!==id||state.__ttdPseudoRouteW!==cw||state.__ttdPseudoRouteH!==ch)installProjectedRoute(cw,ch);
  }

  function ensureCanvas(id,z){
    const lane=document.getElementById('laneWrap');if(!lane)return null;
    let c=document.getElementById(id);
    if(!c){c=document.createElement('canvas');c.id=id;c.style.zIndex=String(z);lane.insertBefore(c,document.getElementById('laneCanvas')||lane.firstChild);}
    const r=lane.getBoundingClientRect(),dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    const pw=Math.max(1,Math.round(r.width*dpr)),ph=Math.max(1,Math.round(r.height*dpr));
    if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
    const g=c.getContext('2d');if(!g)return null;g.setTransform(dpr,0,0,dpr,0,0);return {c,g,w:r.width,h:r.height};
  }
  function ensureWorldDom(){
    const lane=document.getElementById('laneWrap');if(!lane)return;
    lane.classList.add('ttd-pseudo3d-battle');
    ensureCanvas(BACK_ID,0);ensureCanvas(FRONT_ID,3);
    let badge=document.getElementById(BADGE_ID);
    if(!badge){badge=document.createElement('div');badge.id=BADGE_ID;lane.appendChild(badge);}
    badge.textContent=routeId()===1?'PSEUDO-3D · LOWER COURTYARD':'PSEUDO-3D · UPPER COURT';
  }
  function removeWorldDom(){
    document.getElementById('laneWrap')?.classList.remove('ttd-pseudo3d-battle');
    document.getElementById(BACK_ID)?.remove();document.getElementById(FRONT_ID)?.remove();document.getElementById(BADGE_ID)?.remove();
  }

  function drawSky(g,W,H,id){
    const grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,id===1?'#1d3850':'#1b3048');grad.addColorStop(.46,id===1?'#274657':'#293e52');grad.addColorStop(1,'#111725');
    g.fillStyle=grad;g.fillRect(0,0,W,H);
    g.fillStyle='rgba(182,211,199,.10)';
    for(let i=0;i<8;i++){
      const x=((i*131-cameraX(id)*.055)%(W+170))-85;
      g.beginPath();g.moveTo(x,H*.32);g.lineTo(x+46,H*.14+(i%2)*8);g.lineTo(x+96,H*.32);g.fill();
    }
    const horizon=H*.34;g.strokeStyle='rgba(212,236,250,.10)';g.lineWidth=1;
    for(let i=0;i<6;i++){const y=horizon+i*i*7;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
    for(let i=-5;i<=5;i++){g.beginPath();g.moveTo(W*.5+i*18,horizon);g.lineTo(W*.5+i*108,H);g.stroke();}
  }
  function palette(kind){return {stone:['#626775','#383e49'],step:['#6d6e78','#3c404b'],timed:['#70868b','#394c53'],court:['#706758','#423b35'],finish:['#777582','#403e49']}[kind]||['#676a73','#383b45'];}
  function drawPlatform(g,p,W,H,id){
    const pts=quad(p,W,H,id),pal=palette(p.kind),side=pts.map(q=>({x:q.x,y:q.y+13}));
    poly(g,[pts[3],pts[2],side[2],side[3]],pal[1],null);poly(g,pts,pal[0],'rgba(231,224,199,.24)');
    g.save();g.strokeStyle='rgba(235,226,198,.10)';g.lineWidth=.8;
    const xStep=55,zStep=55;
    for(let x=Math.ceil(p.x1/xStep)*xStep;x<p.x2;x+=xStep){const a=projectWorld(x,p.z1,p.y+.4,W,H,id),b=projectWorld(x,p.z2,p.y+.4,W,H,id);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
    for(let z=Math.ceil(p.z1/zStep)*zStep;z<p.z2;z+=zStep){const a=projectWorld(p.x1,z,p.y+.4,W,H,id),b=projectWorld(p.x2,z,p.y+.4,W,H,id);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
    g.restore();
  }
  function drawColumn(g,x,z,y,h,W,H,id,broken=false){
    const b=projectWorld(x,z,y,W,H,id),t=projectWorld(x,z,y+h,W,H,id),sc=b.scale;
    g.save();g.strokeStyle='rgba(20,20,24,.45)';g.lineWidth=1.4;g.fillStyle=broken?'#5d5b5a':'#77736c';
    const ww=15*sc;g.beginPath();g.moveTo(b.x-ww,b.y);g.lineTo(t.x-ww*.72,t.y);g.lineTo(t.x+ww*.72,t.y+(broken?8:0));g.lineTo(b.x+ww,b.y);g.closePath();g.fill();g.stroke();
    if(!broken){g.fillStyle='#8a8479';g.fillRect(t.x-ww*.95,t.y-5,ww*1.9,6);}g.restore();
  }
  function drawPalm(g,x,z,y,W,H,id,flip=1){
    const b=projectWorld(x,z,y,W,H,id),t=projectWorld(x,z,y+80,W,H,id),sc=b.scale;
    g.save();g.strokeStyle='#504536';g.lineWidth=Math.max(2,5*sc);g.beginPath();g.moveTo(b.x,b.y);g.quadraticCurveTo((b.x+t.x)/2+8*flip,(b.y+t.y)/2,t.x,t.y);g.stroke();
    g.translate(t.x,t.y);g.fillStyle='rgba(66,103,76,.88)';for(let i=0;i<6;i++){g.save();g.rotate((i/6)*Math.PI*2+.25);g.beginPath();g.ellipse(18*sc,0,20*sc,5*sc,0,0,Math.PI*2);g.fill();g.restore();}g.restore();
  }
  function drawRouteBed(g,W,H,id){
    const route=ROUTES[id]||ROUTES[1],pts=route.map(p=>projectWorld(p.x,p.z,(p.y||0)+1,W,H,id));
    g.save();g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.strokeStyle='rgba(31,35,43,.52)';g.lineWidth=31;g.stroke();g.strokeStyle='rgba(182,154,98,.16)';g.lineWidth=25;g.stroke();g.restore();
  }
  function drawBackWorld(){
    const pack=ensureCanvas(BACK_ID,0);if(!pack)return;const {g,w:W,h:H}=pack,id=routeId();g.clearRect(0,0,W,H);drawSky(g,W,H,id);
    const visible=id===1?PLATFORMS.filter(p=>p.x1<720):PLATFORMS.filter(p=>p.x2>1040);
    visible.sort((a,b)=>a.z1-b.z1).forEach(p=>drawPlatform(g,p,W,H,id));drawRouteBed(g,W,H,id);
    if(id===1){drawColumn(g,250,-165,0,72,W,H,id,true);drawColumn(g,-105,-160,0,88,W,H,id,false);drawPalm(g,-95,-178,0,W,H,id,-1);}
    else{drawColumn(g,1355,-150,20,76,W,H,id,true);drawColumn(g,1570,-145,20,92,W,H,id,false);}
  }
  function drawFrontWorld(){
    const pack=ensureCanvas(FRONT_ID,3);if(!pack)return;const {g,w:W,h:H}=pack,id=routeId();g.clearRect(0,0,W,H);
    if(id===1){drawPalm(g,248,177,0,W,H,id,1);drawColumn(g,-105,178,0,58,W,H,id,true);}
    else{drawColumn(g,1565,165,20,62,W,H,id,true);drawColumn(g,1345,165,20,54,W,H,id,false);}
    g.save();g.globalAlpha=.22;g.fillStyle='#071019';g.fillRect(0,H*.94,W,H*.06);g.restore();
  }

  const baseDrawLane=drawLane;
  drawLane=function drawLaneWithTestPseudo3D(dt){
    if(!isTestState()){
      removeWorldDom();
      return baseDrawLane(dt);
    }
    ensureWorldDom();ensureRoute();drawBackWorld();
    const themeIdx=state.typhoonPhase?2:Math.min(2,state.adventureStageIdx||0),theme=STAGE_THEMES[themeIdx];
    const saved=theme?{top:theme.top,bottom:theme.bottom,tint:theme.tint}:null;
    if(theme){theme.top='rgba(0,0,0,0)';theme.bottom='rgba(0,0,0,0)';theme.tint='rgba(0,0,0,0)';}
    try{baseDrawLane(dt);}finally{if(theme&&saved)Object.assign(theme,saved);}
    drawFrontWorld();
  };

  const baseRenderStageScreen=renderStageScreen;
  renderStageScreen=function renderStageScreenWithUnifiedPseudo3D(){
    baseRenderStageScreen();
    if(selectedAdventureId!==TEST_ID)return;
    const p=document.querySelector('#stageList .stageCard p');
    if(p)p.textContent='2 pseudo-3D battle waves → summoned-die traversal in the same world → 2 more waves on a new world-space marching path.';
  };

  window.__TTD_TEST_PSEUDO3D_BATTLE_API={version:1,get active(){return isTestState();},get route(){return routeId();},project:(x,z,y=0)=>projectWorld(Number(x),Number(z),Number(y))};
})();
