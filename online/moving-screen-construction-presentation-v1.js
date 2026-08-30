(() => {
  'use strict';
  if(window.__TTD_MOVING_SCREEN_CONSTRUCTION_PRESENTATION_V1)return;
  window.__TTD_MOVING_SCREEN_CONSTRUCTION_PRESENTATION_V1=true;

  const CANVAS_ID='ttdMsConstructionCanvasV1';
  const OPENING_DECOR=Object.freeze([
    Object.freeze({kind:'safetyFence',x:330,z:118,y:112,w:245}),
    Object.freeze({kind:'crateStack',x:790,z:48,y:112,w:104,h:72}),
    Object.freeze({kind:'plywoodStack',x:595,z:78,y:112,w:118,h:46}),
    Object.freeze({kind:'rebar',x:175,z:68,y:112,count:4}),
  ]);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let canvas=null,ctx=null,raf=0;

  function active(){return window.TTDMovingScreen?.active&&window.TTDMovingScreen?.stageId==='construction_climb';}
  function stage(){return window.TTDMovingScreen?.stage||window.TTDMovingScreenStages?.construction_climb||null;}
  function state(){return window.TTDMovingScreen?.state||null;}
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
  function rod(g,x,y,h,s){g.strokeStyle='rgba(150,166,183,.78)';g.lineWidth=Math.max(1,1.5*s);g.beginPath();g.moveTo(x,y);g.lineTo(x,y-h*s);g.stroke();g.strokeStyle='rgba(215,224,232,.20)';g.beginPath();g.moveTo(x+2*s,y);g.lineTo(x+2*s,y-h*s);g.stroke();}
  function drawRebar(g,d,cam,W,H){const p=projection(d,cam,W,H),count=d.count||5;for(let i=0;i<count;i++){const ox=(i-(count-1)/2)*7*p.scale;rod(g,p.x+ox,p.y,62+(i%2)*10,p.scale);}}
  function drawFence(g,d,cam,W,H){const a=projection({x:d.x-d.w/2,z:d.z,y:d.y},cam,W,H),b=projection({x:d.x+d.w/2,z:d.z,y:d.y},cam,W,H);g.save();g.strokeStyle='rgba(239,144,55,.78)';g.lineWidth=2;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();for(let i=0;i<=6;i++){const t=i/6,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;g.beginPath();g.moveTo(x,y);g.lineTo(x,y-25);g.stroke();}g.strokeStyle='rgba(255,196,96,.38)';for(let i=0;i<6;i+=2){const t=i/6,u=(i+1)/6,gx=a.x+(b.x-a.x)*t,gy=a.y+(b.y-a.y)*t,hx=a.x+(b.x-a.x)*u,hy=a.y+(b.y-a.y)*u;g.beginPath();g.moveTo(gx,gy-22);g.lineTo(hx,hy-2);g.stroke();}g.restore();}
  function drawStack(g,d,cam,W,H,crate=false){const p=projection(d,cam,W,H),s=p.scale,w=(d.w||90)*s*.48,h=(d.h||60)*s*.62;g.save();g.translate(p.x,p.y);g.fillStyle=crate?'rgba(121,82,48,.86)':'rgba(147,104,62,.82)';g.strokeStyle=crate?'rgba(222,167,104,.60)':'rgba(224,181,126,.52)';g.lineWidth=1.4;g.fillRect(-w/2,-h,w,h);g.strokeRect(-w/2,-h,w,h);for(let i=1;i<3;i++){const yy=-h+i*h/3;g.beginPath();g.moveTo(-w/2,yy);g.lineTo(w/2,yy);g.stroke();}if(crate){g.beginPath();g.moveTo(-w/2,-h);g.lineTo(w/2,0);g.moveTo(w/2,-h);g.lineTo(-w/2,0);g.stroke();}g.restore();}
  function drawCraneTower(g,d,cam,W,H){const base=projection(d,cam,W,H),top=projection({x:d.x,z:d.z,y:d.y+d.h},cam,W,H),half=15*base.scale;g.save();g.strokeStyle='rgba(129,143,160,.68)';g.lineWidth=2.2;g.beginPath();g.moveTo(base.x-half,base.y);g.lineTo(top.x-half*.55,top.y);g.moveTo(base.x+half,base.y);g.lineTo(top.x+half*.55,top.y);g.stroke();g.strokeStyle='rgba(180,192,205,.42)';for(let i=0;i<12;i++){const t=i/12,u=(i+1)/12,y0=base.y+(top.y-base.y)*t,y1=base.y+(top.y-base.y)*u,xL0=base.x-half+(half-half*.55)*t,xR0=base.x+half-(half-half*.55)*t,xL1=base.x-half+(half-half*.55)*u,xR1=base.x+half-(half-half*.55)*u;g.beginPath();g.moveTo(xL0,y0);g.lineTo(xR1,y1);g.moveTo(xR0,y0);g.lineTo(xL1,y1);g.stroke();}g.restore();}
  function drawCraneBoom(g,d,cam,W,H){const a=projection({x:d.x-d.w/2,z:d.z,y:d.y},cam,W,H),b=projection({x:d.x+d.w/2,z:d.z,y:d.y},cam,W,H);g.save();g.strokeStyle='rgba(145,157,173,.78)';g.lineWidth=4;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();g.strokeStyle='rgba(209,216,224,.38)';g.lineWidth=1.2;for(let i=0;i<10;i++){const t=i/10,u=(i+1)/10,x0=a.x+(b.x-a.x)*t,y0=a.y+(b.y-a.y)*t,x1=a.x+(b.x-a.x)*u,y1=a.y+(b.y-a.y)*u;g.beginPath();g.moveTo(x0,y0-7);g.lineTo(x1,y1+7);g.moveTo(x0,y0+7);g.lineTo(x1,y1-7);g.stroke();}const hookX=a.x+(b.x-a.x)*.62,hookY=a.y+(b.y-a.y)*.62;g.strokeStyle='rgba(100,110,125,.72)';g.beginPath();g.moveTo(hookX,hookY);g.lineTo(hookX,hookY+62);g.stroke();g.fillStyle='rgba(217,178,106,.88)';g.beginPath();g.arc(hookX,hookY+66,6,0,Math.PI*2);g.fill();g.restore();}
  function drawDecor(g,d,cam,W,H){if(d.kind==='rebar')drawRebar(g,d,cam,W,H);else if(d.kind==='safetyFence')drawFence(g,d,cam,W,H);else if(d.kind==='plywoodStack')drawStack(g,d,cam,W,H,false);else if(d.kind==='crateStack')drawStack(g,d,cam,W,H,true);else if(d.kind==='craneTower')drawCraneTower(g,d,cam,W,H);else if(d.kind==='craneBoom')drawCraneBoom(g,d,cam,W,H);}
  function draw(){const lane=document.getElementById('laneWrap'),s=stage(),st=state();if(!lane||!s||!st)return;ensure(lane);const{W,H}=size(lane);ctx.clearRect(0,0,W,H);for(const d of OPENING_DECOR)drawDecor(ctx,d,st.cameraY,W,H);for(const d of s.constructionDecor||[])drawDecor(ctx,d,st.cameraY,W,H);}
  function tick(){if(active())draw();else if(canvas?.isConnected){canvas.remove();canvas=null;ctx=null;}raf=requestAnimationFrame(tick);}
  cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
})();
