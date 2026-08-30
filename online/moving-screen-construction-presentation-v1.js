(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_CONSTRUCTION_PRESENTATION_V1)return;
  window.__TTD_MOVING_SCREEN_CONSTRUCTION_PRESENTATION_V1=true;

  const CANVAS_ID='ttdMsConstructionCanvasV1';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let canvas=null,ctx=null,raf=0;

  function active(){return window.TTDMovingScreen?.active&&window.TTDMovingScreen?.stageId==='construction_climb';}
  function stage(){return window.TTDMovingScreen?.stage||window.TTDMovingScreenStages?.construction_climb||null;}
  function state(){return window.TTDMovingScreen?.state||null;}
  function palette(){return stage()?.palette||{};}
  function projection(n,cameraY,W,H){
    const s=stage();if(!s)return{x:0,y:0,scale:1};
    const sx=clamp(W/520,.58,1.05),sy=clamp(H/430,1.05,2.55),baseY=H*.72;
    const depth=clamp((Number(n.z)+260)/520,0,1),persp=.78+depth*.28,relX=Number(n.x)-Number(s.cameraX||520),relY=Number(n.y)-Number(cameraY||0);
    return{x:W*.5+relX*sx*persp,y:baseY+Number(n.z)*.28*sx-relY*sy-relX*.035*sx,scale:sx*persp};
  }
  function ensure(lane){
    canvas=document.getElementById(CANVAS_ID);
    if(!canvas){canvas=document.createElement('canvas');canvas.id=CANVAS_ID;canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;';lane.appendChild(canvas);}
    ctx=canvas.getContext('2d');return canvas;
  }
  function size(lane){const r=lane.getBoundingClientRect(),dpr=clamp(devicePixelRatio||1,1,2),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(dpr,0,0,dpr,0,0);return{W:r.width,H:r.height};}

  function drawRebar(g,d,cam,W,H){
    const p=projection(d,cam,W,H),count=d.count||5,s=p.scale,steel='#6e6960';
    g.save();g.strokeStyle=steel;g.lineWidth=Math.max(1,1.5*s);
    for(let i=0;i<count;i++){
      const ox=(i-(count-1)/2)*7*s,h=(58+(i%3)*9)*s;
      g.beginPath();g.moveTo(p.x+ox,p.y);g.lineTo(p.x+ox,p.y-h);g.stroke();
      for(let y=10;y<h/s-5;y+=15){g.beginPath();g.moveTo(p.x+ox-2*s,p.y-y*s);g.lineTo(p.x+ox+2*s,p.y-(y+3)*s);g.stroke();}
    }
    g.restore();
  }
  function drawFence(g,d,cam,W,H,tarp=false){
    const p=palette(),a=projection({x:d.x-d.w/2,z:d.z,y:d.y},cam,W,H),b=projection({x:d.x+d.w/2,z:d.z,y:d.y},cam,W,H);
    g.save();g.lineWidth=2;g.strokeStyle=tarp?'rgba(32,35,39,.96)':(p.fence||'#a87525');
    const posts=6;
    if(tarp){
      const h=36;g.fillStyle=p.tarp||'#202327';g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(b.x,b.y-h);g.lineTo(a.x,a.y-h);g.closePath();g.fill();
      g.strokeStyle='rgba(205,207,201,.22)';for(let i=1;i<posts;i++){const t=i/posts,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-h);g.stroke();}
    }else{
      g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.moveTo(a.x,a.y-28);g.lineTo(b.x,b.y-28);g.stroke();
      for(let i=0;i<=posts;i++){const t=i/posts,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-30);g.stroke();}
      g.globalAlpha=.48;g.lineWidth=1;for(let i=0;i<posts;i++){const t=i/posts,u=(i+1)/posts,x0=a.x+(b.x-a.x)*t,y0=a.y+(b.y-a.y)*t,x1=a.x+(b.x-a.x)*u,y1=a.y+(b.y-a.y)*u;g.beginPath();g.moveTo(x0,y0-27);g.lineTo(x1,y1-2);g.moveTo(x0,y0-2);g.lineTo(x1,y1-27);g.stroke();}
    }
    g.restore();
  }
  function drawContainer(g,d,cam,W,H){
    const p=palette(),q=projection(d,cam,W,H),s=q.scale,w=d.w*s*.55,h=d.h*s;
    g.save();g.translate(q.x,q.y);g.fillStyle=p.container||'#6e8793';g.strokeStyle='#435760';g.lineWidth=2;g.fillRect(-w/2,-h,w,h);g.strokeRect(-w/2,-h,w,h);
    g.strokeStyle='rgba(233,239,238,.28)';for(let x=-w/2+9*s;x<w/2;x+=13*s){g.beginPath();g.moveTo(x,-h+4*s);g.lineTo(x,-4*s);g.stroke();}
    g.fillStyle='#394950';g.fillRect(w*.16,-h*.72,w*.20,h*.48);g.restore();
  }
  function drawLogs(g,d,cam,W,H){
    const p=palette(),q=projection(d,cam,W,H),s=q.scale,w=d.w*s*.42,count=d.count||5;
    g.save();g.translate(q.x,q.y);g.lineWidth=1.5;
    for(let i=0;i<count;i++){
      const row=Math.floor(i/2),off=(i%2?1:-1)*w*.16,y=-row*11*s;
      g.strokeStyle='#704426';g.fillStyle=p.log||'#ad7441';g.beginPath();g.roundRect?.(off-w*.33,y-9*s,w*.66,10*s,5*s);if(!g.roundRect){g.rect(off-w*.33,y-9*s,w*.66,10*s);}g.fill();g.stroke();
      g.fillStyle='#c28a55';g.beginPath();g.arc(off+w*.33,y-4*s,4.6*s,0,Math.PI*2);g.fill();
    }
    g.restore();
  }
  function drawSign(g,d,cam,W,H,arrow=false){
    const p=projection(d,cam,W,H),s=p.scale,w=(arrow?52:76)*s,h=(arrow?42:38)*s;
    g.save();g.translate(p.x,p.y);g.fillStyle=arrow?'#f0eee4':'#dfb63f';g.strokeStyle='#4a4030';g.lineWidth=1.5;g.fillRect(-w/2,-h,w,h);g.strokeRect(-w/2,-h,w,h);g.fillStyle=arrow?'#b34832':'#342e25';g.font=`700 ${arrow?28:11}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(d.text||'',0,-h*.50);g.restore();
  }
  function drawSteelFrame(g,d,cam,W,H){
    const p=palette(),columns=d.columns||5,left=d.x-d.w/2,right=d.x+d.w/2;
    g.save();g.strokeStyle=p.steel||'#7e432d';g.lineWidth=6;
    for(let i=0;i<columns;i++){
      const x=left+(right-left)*(i/(columns-1)),a=projection({x,z:d.z,y:d.y},cam,W,H),b=projection({x,z:d.z,y:d.y+d.h},cam,W,H);
      g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
    }
    g.lineWidth=5;for(let level=1;level<=3;level++){const y=d.y+d.h*level/4,a=projection({x:left,z:d.z,y},cam,W,H),b=projection({x:right,z:d.z,y},cam,W,H);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
    g.restore();
  }
  function drawHangingPlatform(g,d,cam,W,H){
    const p=palette(),q=projection(d,cam,W,H),s=q.scale,w=d.w*s*.55,h=Math.max(8,d.h*s*.45);
    g.save();g.strokeStyle='#5b5145';g.lineWidth=1.5;for(const side of [-1,1]){g.beginPath();g.moveTo(q.x+side*w*.38,q.y-h);g.lineTo(q.x+side*w*.38,q.y-105*s);g.stroke();}
    g.fillStyle=p.yellow||'#d0a13b';g.strokeStyle='#76561f';g.fillRect(q.x-w/2,q.y-h,w,h);g.strokeRect(q.x-w/2,q.y-h,w,h);g.restore();
  }
  function drawStack(g,d,cam,W,H,kind='box'){
    const p=palette(),q=projection(d,cam,W,H),s=q.scale,w=(d.w||100)*s*.48,h=(d.h||55)*s*.70;
    g.save();g.translate(q.x,q.y);g.lineWidth=1.3;
    if(kind==='barrels'){
      const count=d.count||3;for(let i=0;i<count;i++){const x=(i-(count-1)/2)*22*s;g.fillStyle=p.barrel||'#63737b';g.strokeStyle='#46545a';g.fillRect(x-9*s,-34*s,18*s,34*s);g.strokeRect(x-9*s,-34*s,18*s,34*s);g.beginPath();g.ellipse(x,-34*s,9*s,3*s,0,0,Math.PI*2);g.fill();g.stroke();}g.restore();return;
    }
    g.fillStyle=kind==='green'?p.greenCrate||'#75865d':kind==='plywood'?p.wood||'#a66f47':p.crate||'#a5774c';g.strokeStyle=kind==='green'?'#4f5b42':'#6c4c32';g.fillRect(-w/2,-h,w,h);g.strokeRect(-w/2,-h,w,h);
    if(kind==='plywood'){for(let i=1;i<4;i++){const yy=-h+i*h/4;g.beginPath();g.moveTo(-w/2,yy);g.lineTo(w/2,yy);g.stroke();}}
    else{g.beginPath();g.moveTo(-w/2,-h);g.lineTo(w/2,0);g.moveTo(w/2,-h);g.lineTo(-w/2,0);g.stroke();}
    g.restore();
  }
  function drawDecor(g,d,cam,W,H){
    if(d.kind==='rebar')drawRebar(g,d,cam,W,H);
    else if(d.kind==='safetyFence')drawFence(g,d,cam,W,H,false);
    else if(d.kind==='tarpFence')drawFence(g,d,cam,W,H,true);
    else if(d.kind==='siteContainer')drawContainer(g,d,cam,W,H);
    else if(d.kind==='logs')drawLogs(g,d,cam,W,H);
    else if(d.kind==='cautionSign')drawSign(g,d,cam,W,H,false);
    else if(d.kind==='arrowSign')drawSign(g,d,cam,W,H,true);
    else if(d.kind==='steelFrame')drawSteelFrame(g,d,cam,W,H);
    else if(d.kind==='hangingPlatform')drawHangingPlatform(g,d,cam,W,H);
    else if(d.kind==='boxStack')drawStack(g,d,cam,W,H,'box');
    else if(d.kind==='greenCrate')drawStack(g,d,cam,W,H,'green');
    else if(d.kind==='barrels')drawStack(g,d,cam,W,H,'barrels');
    else if(d.kind==='plywoodStack')drawStack(g,d,cam,W,H,'plywood');
  }
  function draw(){const lane=document.getElementById('laneWrap'),s=stage(),st=state();if(!lane||!s||!st)return;ensure(lane);const{W,H}=size(lane);ctx.clearRect(0,0,W,H);for(const d of s.constructionDecor||[])drawDecor(ctx,d,st.cameraY,W,H);}
  function tick(){if(active())draw();else if(canvas?.isConnected){canvas.remove();canvas=null;ctx=null;}raf=requestAnimationFrame(tick);}
  cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
})();