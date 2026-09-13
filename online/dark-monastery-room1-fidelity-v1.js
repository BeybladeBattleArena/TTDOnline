(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_ROOM1_FIDELITY_V1)return;
  window.__TTD_DARK_MONASTERY_ROOM1_FIDELITY_V1=true;

  const TAU=Math.PI*2;
  const ROOM_ID='holding_cells_i';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const runtime={back:null,mid:null,fore:null,w:1,h:1,dpr:1,lastPaint:0,active:false,gateState:new Map(),debris:[],paintCount:0};

  const style=document.createElement('style');
  style.id='ttdDarkMonasteryRoom1FidelityStyleV1';
  style.textContent=`
    #gameScreen.ttd-dm-room1-fidelity-v1 #laneWrap{background:#070b10!important;isolation:isolate;}
    #gameScreen.ttd-dm-room1-fidelity-v1 #ttdDarkMonasteryBackV1,
    #gameScreen.ttd-dm-room1-fidelity-v1 #ttdDarkMonasteryPresentationBackV2,
    #gameScreen.ttd-dm-room1-fidelity-v1 #ttdDarkMonasteryPresentationForeV2{opacity:0!important;}
    #ttdDarkMonasteryRoom1BackV1,#ttdDarkMonasteryRoom1MidV1,#ttdDarkMonasteryRoom1ForeV1{
      position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;
    }
    #ttdDarkMonasteryRoom1BackV1{z-index:1;}
    #ttdDarkMonasteryRoom1MidV1{z-index:3;}
    #ttdDarkMonasteryRoom1ForeV1{z-index:5.4;}
  `;
  document.head.appendChild(style);

  function api(){return window.__TTD_DARK_MONASTERY_ADVENTURE_V2_API||window.__TTD_DARK_MONASTERY_API_V1||null;}
  function roomOneActive(){
    const a=api(),game=document.getElementById('gameScreen');
    if(!a||!game?.classList.contains('active'))return false;
    return Number(a.roomIndex)===0&&(a.room?.id===ROOM_ID||!a.room?.id);
  }

  function ensureCanvas(id,z){
    const lane=document.getElementById('laneWrap');if(!lane)return null;
    let c=document.getElementById(id);
    if(!c){c=document.createElement('canvas');c.id=id;c.style.zIndex=String(z);lane.appendChild(c);}
    const r=lane.getBoundingClientRect(),dpr=clamp(window.devicePixelRatio||1,1,2);
    runtime.w=Math.max(1,r.width);runtime.h=Math.max(1,r.height);runtime.dpr=dpr;
    const pw=Math.max(1,Math.round(runtime.w*dpr)),ph=Math.max(1,Math.round(runtime.h*dpr));
    if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
    c.style.width=runtime.w+'px';c.style.height=runtime.h+'px';c.style.display='block';
    const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.imageSmoothingEnabled=true;
    return{c,g};
  }

  function ensure(){
    const game=document.getElementById('gameScreen');if(!game)return false;
    game.classList.add('ttd-dm-room1-fidelity-v1');
    runtime.back=ensureCanvas('ttdDarkMonasteryRoom1BackV1',1);
    runtime.mid=ensureCanvas('ttdDarkMonasteryRoom1MidV1',3);
    runtime.fore=ensureCanvas('ttdDarkMonasteryRoom1ForeV1',5.4);
    runtime.active=!!(runtime.back&&runtime.mid&&runtime.fore);
    return runtime.active;
  }

  function hide(){
    document.getElementById('gameScreen')?.classList.remove('ttd-dm-room1-fidelity-v1');
    for(const id of ['ttdDarkMonasteryRoom1BackV1','ttdDarkMonasteryRoom1MidV1','ttdDarkMonasteryRoom1ForeV1']){
      const c=document.getElementById(id);if(c)c.style.display='none';
    }
    runtime.active=false;
  }

  function readNumber(...values){for(const value of values){const n=Number(value);if(Number.isFinite(n))return n;}return null;}
  function camera(){
    const a=api(),c=a?.camera||a?.view||a?.runtime?.camera||null;
    return{
      x:readNumber(c?.x,a?.cameraX,a?.viewX,0)||0,
      z:readNumber(c?.z,a?.cameraZ,a?.viewZ,0)||0,
      zoom:clamp(readNumber(c?.zoom,a?.cameraZoom,a?.map?.cameraZoom,1)||1,.75,1.4),
    };
  }
  function objectPos(o){
    return{
      x:readNumber(o?.x,o?.cx,o?.pos?.x,o?.position?.x,0)||0,
      z:readNumber(o?.z,o?.cz,o?.pos?.z,o?.position?.z,-145)??-145,
    };
  }
  function project(x,z,y=0){
    const {x:camX,z:camZ,zoom}=camera(),w=runtime.w,h=runtime.h;
    const farZ=-180,nearZ=180;
    const localX=x-camX,localZ=z-camZ;
    const depth=clamp((localZ-farZ)/(nearZ-farZ),0,1);
    const sc=(.72+depth*.38)*Math.max(.76,Math.min(1.18,w/410))*zoom;
    const horizon=h*.365;
    return{x:w*.5+localX*sc,y:horizon+depth*h*.55-y*sc,scale:sc,depth};
  }

  function gateObjects(){
    const items=Array.isArray(api()?.interactives)?api().interactives:[];
    return items.filter(o=>{
      const id=String(o?.id||'').toLowerCase(),kind=String(o?.kind||o?.type||'').toLowerCase();
      return id.startsWith('cellbars_')||id.includes('cell_bar')||kind.includes('cellbar')||kind==='bars'||kind==='cell_gate';
    });
  }

  function worldCellCenters(){
    const xs=gateObjects().map(o=>objectPos(o).x).filter(Number.isFinite).sort((a,b)=>a-b);
    const unique=[];for(const x of xs)if(!unique.some(v=>Math.abs(v-x)<20))unique.push(x);
    // The original hall is a repeating run of compact holding cells. Preserve authored interactive
    // positions when present, then fill any missing visual bays so the wall reads as one real corridor.
    const fallback=[-220,-110,0,110,220];
    for(const x of fallback)if(!unique.some(v=>Math.abs(v-x)<55))unique.push(x);
    return unique.sort((a,b)=>a-b).slice(0,7);
  }

  function stoneRect(g,x,y,w,h,seed=0){
    const shade=34+(Math.abs(seed*17)%12);
    const grd=g.createLinearGradient(x,y,x+w,y+h);
    grd.addColorStop(0,`rgb(${shade+8},${shade+11},${shade+12})`);
    grd.addColorStop(.55,`rgb(${shade+2},${shade+5},${shade+7})`);
    grd.addColorStop(1,`rgb(${Math.max(16,shade-8)},${Math.max(19,shade-5)},${Math.max(21,shade-3)})`);
    g.fillStyle=grd;g.fillRect(x,y,w,h);
    g.strokeStyle='rgba(135,150,153,.11)';g.strokeRect(x+.5,y+.5,w-1,h-1);
  }

  function drawBackWall(g,t){
    const w=runtime.w,h=runtime.h,horizon=h*.39;
    const wall=g.createLinearGradient(0,0,0,horizon+12);
    wall.addColorStop(0,'#10151a');wall.addColorStop(.46,'#1d272c');wall.addColorStop(1,'#26343a');
    g.fillStyle=wall;g.fillRect(0,0,w,horizon+14);

    // Large irregular blue-gray monastery masonry, intentionally muted and non-grid-like.
    const bh=Math.max(22,h*.066),bw=Math.max(46,w*.145);
    for(let row=0,y=-bh*.25;y<horizon+8;y+=bh,row++){
      const off=(row%2)*bw*.48;
      for(let col=-1,x=-bw+off;x<w+bw;x+=bw,col++)stoneRect(g,x,y,bw+1,bh+1,row*11+col*7);
    }

    const cells=worldCellCenters();
    for(let i=0;i<cells.length;i++)drawCellBay(g,cells[i],i,horizon,t);

    // Thick vertical stone piers between cells: these are architecture, not parallax props.
    for(let i=0;i<cells.length-1;i++){
      const mid=(cells[i]+cells[i+1])/2,p=project(mid,-150),pw=Math.max(18,24*p.scale);
      const top=0,base=horizon+10;
      const grad=g.createLinearGradient(p.x-pw/2,0,p.x+pw/2,0);
      grad.addColorStop(0,'#121a1f');grad.addColorStop(.28,'#3a4546');grad.addColorStop(.64,'#293536');grad.addColorStop(1,'#0d1317');
      g.fillStyle=grad;g.fillRect(p.x-pw/2,top,pw,base);
      g.fillStyle='rgba(151,155,143,.13)';g.fillRect(p.x-pw*.34,top,pw*.13,base);
      g.fillStyle='#354142';g.fillRect(p.x-pw*.68,base-8,pw*1.36,8);
    }

    // Wall-cap shadow implies a ceiling/roof immediately above the camera's open fourth wall.
    const cap=g.createLinearGradient(0,0,0,h*.09);cap.addColorStop(0,'rgba(0,0,0,.74)');cap.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=cap;g.fillRect(0,0,w,h*.12);
  }

  function drawCellBay(g,worldX,index,horizon,t){
    const p=project(worldX,-150),h=runtime.h;
    const bayW=Math.max(72,104*p.scale),bayTop=h*.055,bayBottom=horizon+3,bayH=bayBottom-bayTop;
    const x=p.x-bayW/2;
    if(x>runtime.w+40||x+bayW<-40)return;

    // Stone recess + deep cell interior.
    const recess=g.createLinearGradient(x,bayTop,x,bayBottom);
    recess.addColorStop(0,'#05090c');recess.addColorStop(.62,'#080d0e');recess.addColorStop(1,'#111812');
    g.fillStyle=recess;g.fillRect(x,bayTop,bayW,bayH);
    const inner=g.createRadialGradient(p.x,bayTop+bayH*.56,4,p.x,bayTop+bayH*.55,bayW*.68);
    inner.addColorStop(0,'rgba(42,50,31,.25)');inner.addColorStop(.65,'rgba(8,13,12,.10)');inner.addColorStop(1,'rgba(0,0,0,.62)');
    g.fillStyle=inner;g.fillRect(x,bayTop,bayW,bayH);

    // Deep jambs make each holding cell visibly recessed into the wall.
    const jamb=Math.max(7,bayW*.075);
    const jl=g.createLinearGradient(x,0,x+jamb,0);jl.addColorStop(0,'#3d4848');jl.addColorStop(1,'#182125');g.fillStyle=jl;g.fillRect(x,bayTop,jamb,bayH);
    const jr=g.createLinearGradient(x+bayW-jamb,0,x+bayW,0);jr.addColorStop(0,'#182125');jr.addColorStop(1,'#394445');g.fillStyle=jr;g.fillRect(x+bayW-jamb,bayTop,jamb,bayH);
    g.fillStyle='#303c3e';g.fillRect(x,bayTop,bayW,8);

    // Hay and indistinct floor clutter from the source hall, kept subtle so real randomized goodies win.
    if(index%2===0){
      g.save();g.globalAlpha=.42;g.strokeStyle='#806338';g.lineWidth=1;
      for(let j=0;j<10;j++){
        const hx=p.x-bayW*.26+j*bayW*.055,hy=bayBottom-8-(j%3)*2;
        g.beginPath();g.moveTo(hx,hy);g.lineTo(hx+8+(j%2)*3,hy-4-(j%4));g.stroke();
      }
      g.restore();
    }

    // A little cold reflected light on the lintel, as in the blue-black original corridor.
    g.fillStyle='rgba(95,142,175,.10)';g.fillRect(x+6,bayTop+6,bayW-12,3);
  }

  function floorNoise(ix,iz){let n=(ix*73856093)^(iz*19349663);n=(n^(n>>>13))*1274126177;return ((n^(n>>>16))>>>0)/4294967295;}
  function drawFloor(g){
    const w=runtime.w,h=runtime.h,horizon=h*.39;
    const base=g.createLinearGradient(0,horizon,0,h);base.addColorStop(0,'#273942');base.addColorStop(.55,'#20343f');base.addColorStop(1,'#142631');g.fillStyle=base;g.fillRect(0,horizon,w,h-horizon);

    // World-anchored broad stone slabs. No luminous square grid; seams are irregular and subdued.
    const cam=camera(),tileW=94,tileD=68;
    const minX=Math.floor((cam.x-330)/tileW)*tileW,maxX=Math.ceil((cam.x+330)/tileW)*tileW;
    const minZ=-155,maxZ=195;
    for(let z=minZ;z<maxZ;z+=tileD){
      const row=Math.floor(z/tileD),offset=(row&1)*tileW*.42;
      for(let x=minX-offset;x<maxX;x+=tileW){
        const ix=Math.floor(x/tileW),iz=row,n=floorNoise(ix,iz),j=(n-.5)*8;
        const x0=x+3+j,x1=x+tileW-3+j,z0=z+3,z1=z+tileD-3;
        const a=project(x0,z0),b=project(x1,z0),c=project(x1,z1),d=project(x0,z1);
        g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();
        const s=31+Math.floor(n*11);g.fillStyle=`rgb(${s},${s+13},${s+19})`;g.fill();
        g.strokeStyle='rgba(128,154,164,.13)';g.lineWidth=.8;g.stroke();
        if(n>.56){g.strokeStyle='rgba(8,16,20,.22)';g.beginPath();g.moveTo(lerp(a.x,d.x,.35),lerp(a.y,d.y,.35));g.lineTo(lerp(b.x,c.x,.62),lerp(b.y,c.y,.62));g.stroke();}
      }
    }
    const cold=g.createLinearGradient(0,horizon,0,h);cold.addColorStop(0,'rgba(28,74,100,.04)');cold.addColorStop(1,'rgba(28,77,105,.16)');g.fillStyle=cold;g.fillRect(0,horizon,w,h-horizon);
  }

  function drawTorch(g,x,y,t,scale=1){
    const flick=.88+Math.sin(t*9.1+x*.07)*.08+Math.sin(t*14.7+x*.03)*.04;
    g.save();g.translate(x,y);g.scale(scale,scale);
    const glow=g.createRadialGradient(0,0,2,0,0,34);glow.addColorStop(0,`rgba(255,191,91,${.30*flick})`);glow.addColorStop(.5,'rgba(238,139,50,.10)');glow.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=glow;g.fillRect(-38,-38,76,76);
    g.fillStyle='#493725';g.fillRect(-2,5,4,17);g.fillStyle='#806246';g.fillRect(-7,2,14,3);
    g.strokeStyle='#2b2520';g.lineWidth=2;g.strokeRect(-7,-8,14,14);g.beginPath();g.moveTo(-7,-8);g.lineTo(7,6);g.moveTo(7,-8);g.lineTo(-7,6);g.stroke();
    g.shadowBlur=12;g.shadowColor='#ff9e37';g.fillStyle=`rgba(255,214,122,${flick})`;g.beginPath();g.ellipse(0,-5,3.3,7.5,0,0,TAU);g.fill();g.restore();
  }

  function drawTorches(g,t){
    const cells=worldCellCenters();if(cells.length<2)return;
    for(let i=0;i<cells.length-1;i+=2){const x=(cells[i]+cells[i+1])/2,p=project(x,-150);drawTorch(g,p.x,runtime.h*.185,t,.9);}
  }

  function drawGate(g,o,index){
    if(o?.destroyed||o?.open||o?.broken)return;
    const pos=objectPos(o),p=project(pos.x,pos.z),h=runtime.h;
    const gateW=Math.max(70,(readNumber(o?.w,o?.width,98)||98)*p.scale),gateH=Math.max(h*.20,122*p.scale);
    const baseY=h*.39+3,topY=baseY-gateH,x0=p.x-gateW/2;
    if(x0>runtime.w+30||x0+gateW<-30)return;

    g.save();
    // Deep cool iron closely follows the source: three massive riveted horizontal rails,
    // narrow vertical bars, and pointed lower spikes.
    const railH=Math.max(9,12*p.scale);
    const metal=g.createLinearGradient(x0,0,x0+gateW,0);metal.addColorStop(0,'#16252f');metal.addColorStop(.23,'#304a5f');metal.addColorStop(.52,'#1d3546');metal.addColorStop(.78,'#35536a');metal.addColorStop(1,'#101c25');
    const railYs=[topY,topY+gateH*.48,baseY-railH];
    for(const y of railYs){
      g.fillStyle=metal;g.fillRect(x0,y,gateW,railH);
      g.fillStyle='rgba(117,182,230,.20)';g.fillRect(x0+2,y+1,gateW-4,2);
      const rivets=6;for(let i=0;i<=rivets;i++){const rx=x0+(i+.15)*gateW/(rivets+.3);g.fillStyle='rgba(104,183,235,.66)';g.beginPath();g.arc(rx,y+railH*.48,Math.max(1.2,1.7*p.scale),0,TAU);g.fill();}
    }
    const count=Math.max(6,Math.round(gateW/17));
    for(let i=0;i<count;i++){
      const x=x0+(i+.5)*gateW/count,bw=Math.max(3,4.5*p.scale);
      const bg=g.createLinearGradient(x-bw,0,x+bw,0);bg.addColorStop(0,'#152532');bg.addColorStop(.52,'#48677b');bg.addColorStop(1,'#101d28');
      g.fillStyle=bg;g.fillRect(x-bw/2,topY+railH*.6,bw,gateH-railH*1.7);
      g.fillStyle='rgba(141,196,226,.18)';g.fillRect(x-bw*.24,topY+railH*.8,Math.max(1,bw*.25),gateH-railH*2.1);
      const spikeY=baseY+Math.max(7,11*p.scale);g.beginPath();g.moveTo(x-bw*.62,baseY-railH*.1);g.lineTo(x+bw*.62,baseY-railH*.1);g.lineTo(x,spikeY);g.closePath();g.fillStyle='#1a2a34';g.fill();
    }
    g.restore();
  }

  function seeded(id,i){let h=2166136261;for(const ch of String(id)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}h^=i*2654435761;h=Math.imul(h^(h>>>15),2246822519);return ((h^(h>>>13))>>>0)/4294967295;}
  function spawnDebris(o){
    const p=project(objectPos(o).x,objectPos(o).z),baseY=runtime.h*.39-30*p.scale;
    for(let i=0;i<9;i++){
      const r=seeded(o?.id||'cell',i),big=i<3;
      runtime.debris.push({x:p.x+(r-.5)*58*p.scale,y:baseY+(seeded(o?.id,i+17)-.5)*70*p.scale,vx:(r-.5)*(big?82:130),vy:-45-seeded(o?.id,i+31)*(big?75:120),rot:r*TAU,vr:(seeded(o?.id,i+47)-.5)*5.5,w:(big?18:8)+seeded(o?.id,i+61)*(big?15:10),h:(big?9:5)+seeded(o?.id,i+73)*(big?9:7),life:1.05,age:0});
    }
  }
  function syncGateStates(){
    const live=new Set();
    for(const o of gateObjects()){
      const id=String(o?.id||`gate-${live.size}`),destroyed=!!(o?.destroyed||o?.broken||o?.open);live.add(id);
      const prior=runtime.gateState.get(id);
      if(prior===false&&destroyed)spawnDebris(o);
      runtime.gateState.set(id,destroyed);
    }
    for(const id of [...runtime.gateState.keys()])if(!live.has(id))runtime.gateState.delete(id);
  }
  function updateDebris(dt){
    for(const d of runtime.debris){d.age+=dt;d.vy+=210*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;d.rot+=d.vr*dt;}
    runtime.debris=runtime.debris.filter(d=>d.age<d.life);
  }
  function drawDebris(g){
    for(const d of runtime.debris){const q=clamp(1-d.age/d.life,0,1);g.save();g.globalAlpha=q;g.translate(d.x,d.y);g.rotate(d.rot);const grad=g.createLinearGradient(-d.w/2,0,d.w/2,0);grad.addColorStop(0,'#14232d');grad.addColorStop(.5,'#3f5b6d');grad.addColorStop(1,'#101b23');g.fillStyle=grad;g.fillRect(-d.w/2,-d.h/2,d.w,d.h);g.strokeStyle='rgba(128,177,207,.24)';g.strokeRect(-d.w/2,-d.h/2,d.w,d.h);g.restore();}
  }

  function drawEnclosure(g,t){
    const w=runtime.w,h=runtime.h;
    g.clearRect(0,0,w,h);
    // Side-wall returns seal the room like a three-wall set. They stay narrow enough not to steal play space.
    const leftW=Math.max(18,w*.052),rightW=leftW;
    const lg=g.createLinearGradient(0,0,leftW,0);lg.addColorStop(0,'#080d11');lg.addColorStop(.76,'#263238');lg.addColorStop(1,'rgba(38,50,56,0)');g.fillStyle=lg;g.fillRect(0,0,leftW*1.55,h);
    const rg=g.createLinearGradient(w-rightW,0,w,0);rg.addColorStop(0,'rgba(38,50,56,0)');rg.addColorStop(.24,'#263238');rg.addColorStop(1,'#080d11');g.fillStyle=rg;g.fillRect(w-rightW*1.55,0,rightW*1.55,h);
    const top=g.createLinearGradient(0,0,0,h*.11);top.addColorStop(0,'rgba(2,5,8,.90)');top.addColorStop(1,'rgba(3,7,10,0)');g.fillStyle=top;g.fillRect(0,0,w,h*.12);
    // Foreground edge stones subtly define the open fourth wall without boxing the controls in.
    g.fillStyle='rgba(8,13,17,.40)';g.fillRect(0,h*.94,w,h*.06);
    const vign=g.createRadialGradient(w*.5,h*.54,w*.20,w*.5,h*.54,Math.max(w,h)*.72);vign.addColorStop(.56,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.43)');g.fillStyle=vign;g.fillRect(0,0,w,h);
  }

  let lastTs=0;
  function paint(ts){
    const active=roomOneActive();
    if(!active){if(runtime.active)hide();lastTs=ts;requestAnimationFrame(paint);return;}
    if(!ensure()){lastTs=ts;requestAnimationFrame(paint);return;}
    const dt=clamp((ts-(lastTs||ts))/1000,0,.05);lastTs=ts;
    if(ts-runtime.lastPaint<30){updateDebris(dt);requestAnimationFrame(paint);return;}
    runtime.lastPaint=ts;runtime.paintCount++;syncGateStates();updateDebris(dt);

    const bg=runtime.back.g,mg=runtime.mid.g,fg=runtime.fore.g,t=ts/1000,w=runtime.w,h=runtime.h;
    bg.clearRect(0,0,w,h);drawBackWall(bg,t);drawFloor(bg);drawTorches(bg,t);
    mg.clearRect(0,0,w,h);const gates=gateObjects();for(let i=0;i<gates.length;i++)drawGate(mg,gates[i],i);drawDebris(mg);
    drawEnclosure(fg,t);
    requestAnimationFrame(paint);
  }

  const ready=window.__TTD_DARK_MONASTERY_V2_READY;
  Promise.resolve(ready).catch(()=>null).finally(()=>requestAnimationFrame(paint));

  window.__TTD_DARK_MONASTERY_ROOM1_FIDELITY_V1_API=Object.freeze({
    version:1,
    build:'holding-cells-source-fidelity-v1',
    roomId:ROOM_ID,
    get active(){return runtime.active;},
    get paintCount(){return runtime.paintCount;},
    get gates(){return gateObjects();},
    get debrisCount(){return runtime.debris.length;},
    get backCanvas(){return document.getElementById('ttdDarkMonasteryRoom1BackV1');},
    get gateCanvas(){return document.getElementById('ttdDarkMonasteryRoom1MidV1');},
    get foregroundCanvas(){return document.getElementById('ttdDarkMonasteryRoom1ForeV1');},
  });
})();