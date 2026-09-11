(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_PRESENTATION_V2)return;
  window.__TTD_DARK_MONASTERY_PRESENTATION_V2=true;

  const TAU=Math.PI*2;
  const ROOM={halfX:230,nearZ:175,farZ:-175};
  const PITS=[
    {x:-177,z:69,w:68,h:88},
    {x:177,z:69,w:68,h:88},
  ];
  const BLOCKS=[
    {x:0,z:-146,w:82,h:24},
    {x:-184,z:-88,w:30,h:70},
    {x:184,z:-88,w:30,h:70},
  ];
  const PLAY_PILLARS=[
    {x:-112,z:-18,r:27},
    {x:112,z:-18,r:27},
  ];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const runtime={back:null,fore:null,w:1,h:1,dpr:1,lastPaint:0,paintCount:0};

  const style=document.createElement('style');
  style.id='ttdDarkMonasteryPresentationStyleV2';
  style.textContent=`
    #gameScreen.ttd-dark-monastery-v1.ttd-dark-monastery-presentation-v2 #laneWrap{
      background:#090d14!important;
      isolation:isolate;
    }
    #gameScreen.ttd-dark-monastery-v1.ttd-dark-monastery-presentation-v2 #ttdDarkMonasteryBackV1{
      opacity:0!important;
    }
    #gameScreen.ttd-dark-monastery-v1.ttd-dark-monastery-presentation-v2 #ttdDarkMonasteryPresentationBackV2,
    #gameScreen.ttd-dark-monastery-v1.ttd-dark-monastery-presentation-v2 #ttdDarkMonasteryPresentationForeV2{
      position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;
    }
    #gameScreen.ttd-dark-monastery-v1.ttd-dark-monastery-presentation-v2 #ttdDarkMonasteryPresentationBackV2{z-index:1;}
    #gameScreen.ttd-dark-monastery-v1.ttd-dark-monastery-presentation-v2 #laneCanvas{
      z-index:2!important;
      opacity:.11!important;
      filter:grayscale(.9) contrast(1.35) brightness(1.25)!important;
      mix-blend-mode:screen!important;
      background:transparent!important;
    }
    #gameScreen.ttd-dark-monastery-v1.ttd-dark-monastery-presentation-v2 #ttdDarkMonasteryFrontV1{z-index:4!important;}
    #gameScreen.ttd-dark-monastery-v1.ttd-dark-monastery-presentation-v2 #ttdDarkMonasteryPresentationForeV2{z-index:5;}
  `;
  document.head.appendChild(style);

  function active(){
    return !!(window.__TTD_DARK_MONASTERY_API_V1?.active && document.getElementById('gameScreen')?.classList.contains('ttd-dark-monastery-v1'));
  }

  function ensureCanvas(id,z){
    const lane=document.getElementById('laneWrap');if(!lane)return null;
    let c=document.getElementById(id);
    if(!c){c=document.createElement('canvas');c.id=id;c.style.zIndex=String(z);lane.appendChild(c);}
    const r=lane.getBoundingClientRect(),dpr=clamp(window.devicePixelRatio||1,1,2);
    runtime.w=Math.max(1,r.width);runtime.h=Math.max(1,r.height);runtime.dpr=dpr;
    const pw=Math.max(1,Math.round(runtime.w*dpr)),ph=Math.max(1,Math.round(runtime.h*dpr));
    if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
    c.style.width=runtime.w+'px';c.style.height=runtime.h+'px';
    const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.imageSmoothingEnabled=true;
    return{c,g};
  }

  function ensure(){
    const game=document.getElementById('gameScreen');if(!game)return false;
    game.classList.add('ttd-dark-monastery-presentation-v2');
    runtime.back=ensureCanvas('ttdDarkMonasteryPresentationBackV2',1);
    runtime.fore=ensureCanvas('ttdDarkMonasteryPresentationForeV2',5);
    return !!(runtime.back&&runtime.fore);
  }

  function hide(){
    document.getElementById('gameScreen')?.classList.remove('ttd-dark-monastery-presentation-v2');
    for(const id of ['ttdDarkMonasteryPresentationBackV2','ttdDarkMonasteryPresentationForeV2']){
      const c=document.getElementById(id);if(c)c.style.display='none';
    }
  }

  function project(x,z,y=0){
    const w=runtime.w,h=runtime.h,depth=clamp((z-ROOM.farZ)/(ROOM.nearZ-ROOM.farZ),0,1);
    const sc=(.48+depth*.58)*Math.max(.72,Math.min(1.12,w/410));
    return{x:w*.5+x*sc,y:h*.18+depth*h*.72-y*sc,scale:sc,depth};
  }

  function path(g,pts,fill,stroke,lineWidth=1){
    g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();
    if(fill){g.fillStyle=fill;g.fill();}
    if(stroke){g.lineWidth=lineWidth;g.strokeStyle=stroke;g.stroke();}
  }

  function roundedRect(g,x,y,w,h,r,fill,stroke){
    const rr=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+rr,y);g.arcTo(x+w,y,x+w,y+h,rr);g.arcTo(x+w,y+h,x,y+h,rr);g.arcTo(x,y+h,x,y,rr);g.arcTo(x,y,x+w,y,rr);
    if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.stroke();}
  }

  function drawStoneWall(g,t){
    const w=runtime.w,h=runtime.h,horizon=h*.205;
    const wall=g.createLinearGradient(0,0,0,horizon+45);
    wall.addColorStop(0,'#171a1b');wall.addColorStop(.42,'#292821');wall.addColorStop(.75,'#313229');wall.addColorStop(1,'#161d25');
    g.fillStyle=wall;g.fillRect(0,0,w,horizon+48);

    // Large old monastery blocks: muted olive-gray like the reference hall.
    g.lineWidth=1;
    for(let row=0,y=-8;y<horizon+44;y+=27,row++){
      const off=(row%2)*31;
      for(let x=-62+off;x<w+62;x+=62){
        const shade=30+((row*13+Math.floor(x/31)*7)%11);
        g.fillStyle=`rgb(${shade+4},${shade+4},${shade})`;g.fillRect(x+1,y+1,60,25);
        g.strokeStyle='rgba(117,118,100,.16)';g.strokeRect(x+.5,y+.5,61,26);
      }
    }

    // Decorative carved band running across the cloister wall.
    const bandY=horizon-13;
    g.fillStyle='#2b2c27';g.fillRect(0,bandY,w,13);
    g.fillStyle='#151a1d';g.fillRect(0,bandY+2,w,2);g.fillRect(0,bandY+10,w,2);
    g.strokeStyle='rgba(152,151,128,.26)';g.lineWidth=1;
    for(let x=-8;x<w+12;x+=22){
      g.beginPath();g.moveTo(x,bandY+9);g.lineTo(x+7,bandY+4);g.lineTo(x+14,bandY+9);g.lineTo(x+21,bandY+4);g.stroke();
    }

    // Deep vertical bays and substantial columns, echoing the screenshot's repeating supports.
    const cols=[.08,.31,.69,.92];
    for(const f of cols){
      const x=w*f,colW=Math.max(18,w*.052);
      g.fillStyle='rgba(5,10,14,.60)';g.fillRect(x-colW*.82,0,colW*1.64,horizon+32);
      const cg=g.createLinearGradient(x-colW,0,x+colW,0);
      cg.addColorStop(0,'#171b1c');cg.addColorStop(.33,'#41423a');cg.addColorStop(.62,'#32352f');cg.addColorStop(1,'#111619');
      g.fillStyle=cg;g.fillRect(x-colW*.47,-4,colW*.94,horizon+38);
      g.fillStyle='#34352f';g.fillRect(x-colW*.62,horizon+19,colW*1.24,8);
      g.strokeStyle='rgba(134,137,120,.20)';g.strokeRect(x-colW*.47,-4,colW*.94,horizon+38);
    }

    // Recessed wall panels between columns create long-room depth.
    for(const [a,b] of [[.12,.27],[.36,.64],[.73,.88]]){
      const x0=w*a,x1=w*b;
      const rg=g.createLinearGradient(x0,0,x1,0);rg.addColorStop(0,'rgba(4,9,14,.50)');rg.addColorStop(.5,'rgba(12,18,20,.16)');rg.addColorStop(1,'rgba(4,9,14,.50)');
      g.fillStyle=rg;g.fillRect(x0,6,x1-x0,bandY-10);
    }

    // Blue skull-like sconces from the reference, plus restrained warm spill.
    const sconces=[w*.19,w*.50,w*.81];
    for(let i=0;i<sconces.length;i++)drawSkullSconce(g,sconces[i],h*.085,t+i*1.7,i===1?1.02:.9);
  }

  function drawSkullSconce(g,x,y,t,s=1){
    g.save();g.translate(x,y);
    const pulse=.82+Math.sin(t*3.1)*.08;
    const glow=g.createRadialGradient(0,5,0,0,5,28*s);glow.addColorStop(0,`rgba(55,125,205,${.28*pulse})`);glow.addColorStop(.45,'rgba(25,72,138,.13)');glow.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=glow;g.fillRect(-32*s,-25*s,64*s,64*s);
    g.fillStyle='#27251f';g.beginPath();g.ellipse(0,0,8*s,10*s,0,0,TAU);g.fill();
    g.fillStyle='#142a43';g.beginPath();g.ellipse(0,-2*s,7*s,7.5*s,0,0,TAU);g.fill();
    g.fillStyle='#70b8f0';g.globalAlpha=.75*pulse;for(const sx of [-2.7,2.7]){g.beginPath();g.arc(sx*s,-3*s,1.3*s,0,TAU);g.fill();}
    g.globalAlpha=1;g.fillStyle='#84633f';g.fillRect(-5*s,7*s,10*s,5*s);g.restore();
  }

  function drawFloor(g,t){
    const rows=8,cols=8;
    // Perspective stone tiles. Each tile is a projected quad, so seams genuinely converge with depth.
    for(let r=0;r<rows;r++){
      const z0=lerp(ROOM.farZ,ROOM.nearZ,r/rows),z1=lerp(ROOM.farZ,ROOM.nearZ,(r+1)/rows);
      for(let c=0;c<cols;c++){
        const x0=lerp(-ROOM.halfX,ROOM.halfX,c/cols),x1=lerp(-ROOM.halfX,ROOM.halfX,(c+1)/cols);
        const n=(r*17+c*29)%7;
        const fill=[ '#263848','#2a3c4d','#304354','#293b4b','#334757','#2b4051','#30485a'][n];
        path(g,[project(x0,z0),project(x1,z0),project(x1,z1),project(x0,z1)],fill,'rgba(116,158,181,.24)',.8);
        // worn highlight on the near/top edge of each slab
        const a=project(x0+4,z1-2),b=project(x1-4,z1-2);g.strokeStyle='rgba(142,176,190,.11)';g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
      }
    }

    // Cold blue wash and faint torch warmth over the floor.
    const cool=g.createLinearGradient(0,runtime.h*.22,0,runtime.h);cool.addColorStop(0,'rgba(9,28,48,.10)');cool.addColorStop(1,'rgba(18,67,98,.21)');g.fillStyle=cool;g.fillRect(0,runtime.h*.18,runtime.w,runtime.h*.82);
    for(const fx of [runtime.w*.18,runtime.w*.82]){
      const glow=g.createRadialGradient(fx,runtime.h*.53,0,fx,runtime.h*.53,runtime.w*.24);glow.addColorStop(0,'rgba(238,162,75,.08)');glow.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=glow;g.fillRect(0,runtime.h*.20,runtime.w,runtime.h*.75);
    }
  }

  function drawPit(g,p){
    const x0=p.x-p.w/2,x1=p.x+p.w/2,z0=p.z-p.h/2,z1=p.z+p.h/2;
    const outer=[project(x0-5,z0-5),project(x1+5,z0-5),project(x1+5,z1+5),project(x0-5,z1+5)];
    path(g,outer,'#3b4650','rgba(156,176,178,.34)',1.1);
    const inner=[project(x0,z0),project(x1,z0),project(x1,z1),project(x0,z1)];
    const grd=g.createLinearGradient(0,inner[0].y,0,inner[2].y);grd.addColorStop(0,'#071019');grd.addColorStop(.45,'#02060b');grd.addColorStop(1,'#000207');path(g,inner,grd,'rgba(48,82,106,.58)',1);
    // descending inner wall lines imply a real shaft rather than a black rectangle.
    for(let i=1;i<=3;i++){
      const q0=lerp(z0,z1,i/4),a=project(x0+5,q0),b=project(x1-5,q0);g.strokeStyle=`rgba(52,83,102,${.24-i*.04})`;g.beginPath();g.moveTo(a.x,a.y+5*i);g.lineTo(b.x,b.y+5*i);g.stroke();
    }
  }

  function drawBlock(g,b){
    const x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.h/2,z1=b.z+b.h/2,top=12;
    const topPts=[project(x0,z0,top),project(x1,z0,top),project(x1,z1,top),project(x0,z1,top)];
    path(g,topPts,'#46463e','rgba(152,148,126,.30)',1);
    const a=project(x0,z1),bb=project(x1,z1),at=project(x0,z1,top),bt=project(x1,z1,top);path(g,[at,bt,bb,a],'#242a2b','rgba(94,103,99,.35)',1);
  }

  function drawPlayPillarBase(g,p){
    const pt=project(p.x,p.z),sc=pt.scale,r=p.r*sc;
    // Short broken column bases preserve the existing collision footprint without creating bad
    // always-in-front occlusion against roaming actors.
    const baseY=pt.y+2,bodyH=r*.72;
    const grd=g.createLinearGradient(pt.x-r,0,pt.x+r,0);grd.addColorStop(0,'#1c2427');grd.addColorStop(.42,'#48505a');grd.addColorStop(.75,'#303943');grd.addColorStop(1,'#151b1e');
    g.fillStyle=grd;g.fillRect(pt.x-r*.72,baseY-bodyH,r*1.44,bodyH);
    g.fillStyle='#4a4b43';g.fillRect(pt.x-r*.88,baseY-bodyH-4*sc,r*1.76,5*sc);g.fillRect(pt.x-r*.92,baseY-3*sc,r*1.84,5*sc);
    g.strokeStyle='rgba(150,155,145,.25)';g.strokeRect(pt.x-r*.72,baseY-bodyH,r*1.44,bodyH);
  }

  function drawAtmosphere(g,t){
    const w=runtime.w,h=runtime.h;
    // Soft horizontal haze bands imitate the blue ambient light in the reference hall.
    g.save();g.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){
      const y=h*(.38+i*.16)+Math.sin(t*.35+i)*4;const grd=g.createLinearGradient(0,y-18,0,y+18);grd.addColorStop(0,'rgba(30,88,130,0)');grd.addColorStop(.5,'rgba(35,89,130,.045)');grd.addColorStop(1,'rgba(30,88,130,0)');g.fillStyle=grd;g.fillRect(0,y-20,w,40);
    }
    g.restore();
    const vign=g.createRadialGradient(w*.5,h*.55,w*.18,w*.5,h*.55,Math.max(w,h)*.74);vign.addColorStop(.48,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.58)');g.fillStyle=vign;g.fillRect(0,0,w,h);
  }

  function drawChandelier(g,t){
    const w=runtime.w,h=runtime.h;
    // Large candle chandelier placed high/right like the supplied reference. It lives on the
    // foreground canvas, so actors can visibly pass underneath it and the room gains true layering.
    const cx=w*.68,cy=h*.235,rx=Math.min(75,w*.19),ry=rx*.29;
    g.save();
    const metal='#84502e',metalHi='#aa7042';
    g.strokeStyle='#5d3724';g.lineWidth=3;
    for(const ox of [-rx*.62,0,rx*.62]){g.beginPath();g.moveTo(cx+ox*.32,-8);g.lineTo(cx+ox,cy-4);g.stroke();}
    g.strokeStyle=metal;g.lineWidth=8;g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,TAU);g.stroke();
    g.strokeStyle=metalHi;g.lineWidth=1.3;g.beginPath();g.ellipse(cx,cy-1,rx*.96,ry*.82,0,0,TAU);g.stroke();
    for(let i=0;i<8;i++){
      const a=i/8*TAU,x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry;
      drawCandle(g,x,y-5,t+i*.8,.78);
    }
    g.restore();
  }

  function drawCandle(g,x,y,t,s=1){
    g.save();g.translate(x,y);g.fillStyle='#e8dfc9';g.fillRect(-2*s,-8*s,4*s,10*s);
    const flick=.86+Math.sin(t*8.2)*.12;g.shadowBlur=14*s;g.shadowColor='rgba(255,171,76,.92)';g.fillStyle=`rgba(255,220,142,${flick})`;g.beginPath();g.ellipse(0,-11*s,2.2*s,5.2*s,0,0,TAU);g.fill();g.restore();
  }

  function drawForeground(g,t){
    const w=runtime.w,h=runtime.h;g.clearRect(0,0,w,h);
    drawChandelier(g,t);
    // Foreground brazier edge: a small warm anchor similar to the reference image without covering combat.
    const bx=w*.965,by=h*.79;
    const glow=g.createRadialGradient(bx,by,0,bx,by,42);glow.addColorStop(0,'rgba(255,137,47,.20)');glow.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=glow;g.fillRect(bx-46,by-50,92,100);
    g.fillStyle='#412718';g.beginPath();g.moveTo(bx-17,by+11);g.lineTo(bx+8,by+7);g.lineTo(bx+19,by+18);g.lineTo(bx-12,by+22);g.closePath();g.fill();
    for(let i=0;i<3;i++){g.fillStyle=i===1?'#ffd477':'#ff8a32';g.globalAlpha=.74;g.beginPath();g.ellipse(bx+i*5-5,by+2-Math.sin(t*7+i)*3,3+i,10-i*2,.2,0,TAU);g.fill();}g.globalAlpha=1;
  }

  function paint(ts){
    if(!active()){hide();requestAnimationFrame(paint);return;}
    if(!ensure()){requestAnimationFrame(paint);return;}
    // Static geometry need not burn a full 60Hz; ~30fps is enough for candle/fog motion.
    if(ts-runtime.lastPaint<30){requestAnimationFrame(paint);return;}
    runtime.lastPaint=ts;runtime.paintCount++;
    const t=ts/1000,g=runtime.back.g,w=runtime.w,h=runtime.h;
    runtime.back.c.style.display='block';runtime.fore.c.style.display='block';
    g.clearRect(0,0,w,h);
    drawStoneWall(g,t);
    drawFloor(g,t);
    for(const p of PITS)drawPit(g,p);
    for(const b of BLOCKS)drawBlock(g,b);
    for(const p of PLAY_PILLARS)drawPlayPillarBase(g,p);
    drawAtmosphere(g,t);
    drawForeground(runtime.fore.g,t);
    requestAnimationFrame(paint);
  }

  window.addEventListener('resize',()=>{runtime.lastPaint=0;});
  requestAnimationFrame(paint);

  window.__TTD_DARK_MONASTERY_PRESENTATION_V2_API=Object.freeze({
    version:2,
    get active(){return active();},
    get paintCount(){return runtime.paintCount;},
    get backCanvas(){return document.getElementById('ttdDarkMonasteryPresentationBackV2');},
    get foregroundCanvas(){return document.getElementById('ttdDarkMonasteryPresentationForeV2');},
  });
})();
