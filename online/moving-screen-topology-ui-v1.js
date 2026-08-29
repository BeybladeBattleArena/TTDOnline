(() => {
  'use strict';
  if (window.__TTD_MOVING_SCREEN_TOPOLOGY_UI_V1) return;
  window.__TTD_MOVING_SCREEN_TOPOLOGY_UI_V1 = true;

  const STAGE_ID='neon_rooftops_v2';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let canvas=null,ctx=null,raf=0,boundLane=null,gesture=null,inferredSourceId=null,pendingDestinationId=null,lastActive=false;

  const stage=()=>window.TTDMovingScreenStages?.[STAGE_ID]||null;
  const state=()=>window.TTDMovingScreen?.state||null;
  const active=()=>document.getElementById('gameScreen')?.classList.contains('ttd-moving-screen-v4')===true;
  const nodes=s=>[...(s?.zones||[]),...(s?.junctions||[])];
  const nodeById=(s,id)=>nodes(s).find(n=>n.id===id)||null;
  const nodeByName=(s,name)=>nodes(s).find(n=>String(n.name||'').trim()===String(name||'').trim())||null;
  function adjacent(s,id){const out=[];for(const e of s?.edges||[]){if(e.from===id)out.push({id:e.to,edge:e});else if(e.to===id)out.push({id:e.from,edge:e});}return out;}

  function installStyle(){
    if(document.getElementById('ttdMsTopologyUiV1Style'))return;
    const style=document.createElement('style');style.id='ttdMsTopologyUiV1Style';style.textContent=`
      #ttdMsTopologyCanvasV1{position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;}
      #gameScreen.ttd-moving-screen-v4 #ttdMsHintV4{color:#c4cee3;}
    `;document.head.appendChild(style);
  }

  function projection(n,cameraY,W,H){const s=stage();if(!s)return{x:0,y:0};const sx=clamp(W/520,.58,1.05),sy=clamp(H/430,1.05,2.55),baseY=H*.72,depth=clamp((Number(n.z)+260)/520,0,1),persp=.78+depth*.28,relX=Number(n.x)-Number(s.cameraX||520),relY=Number(n.y)-Number(cameraY||0);return{x:W*.5+relX*sx*persp,y:baseY+Number(n.z)*.28*sx-relY*sy-relX*.035*sx,scale:sx*persp};}

  function ensureCanvas(lane){
    if(canvas?.isConnected)return canvas;
    canvas=document.getElementById('ttdMsTopologyCanvasV1');
    if(!canvas){canvas=document.createElement('canvas');canvas.id='ttdMsTopologyCanvasV1';lane.appendChild(canvas);}
    ctx=canvas.getContext('2d');return canvas;
  }
  function sizeCanvas(lane){const r=lane.getBoundingClientRect(),dpr=clamp(devicePixelRatio||1,1,2),w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}ctx.setTransform(dpr,0,0,dpr,0,0);return{W:r.width,H:r.height};}

  function lineFrame(A,B){const dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy)||1;return{dx,dy,len,nx:-dy/len,ny:dx/len};}
  function drawTreads(g,A,B,count,width,color){const f=lineFrame(A,B);g.strokeStyle=color;g.lineWidth=1.2;for(let i=1;i<count;i++){const t=i/count,x=A.x+f.dx*t,y=A.y+f.dy*t;g.beginPath();g.moveTo(x-f.nx*width,y-f.ny*width);g.lineTo(x+f.nx*width,y+f.ny*width);g.stroke();}}
  function drawConnector(g,e,A,B){
    const f=lineFrame(A,B);g.save();g.lineCap='round';g.lineJoin='round';
    if(e.kind==='bridge'){
      g.strokeStyle='rgba(116,76,45,.74)';g.lineWidth=10;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.stroke();
      drawTreads(g,A,B,9,7,'rgba(207,159,104,.72)');
    }else if(e.kind==='fire_escape'){
      g.strokeStyle='rgba(117,128,145,.68)';g.lineWidth=2.2;g.beginPath();g.moveTo(A.x+f.nx*7,A.y+f.ny*7);g.lineTo(B.x+f.nx*7,B.y+f.ny*7);g.moveTo(A.x-f.nx*7,A.y-f.ny*7);g.lineTo(B.x-f.nx*7,B.y-f.ny*7);g.stroke();drawTreads(g,A,B,10,6,'rgba(197,205,218,.58)');
    }else if(e.kind==='stairs'){
      g.strokeStyle='rgba(82,91,109,.76)';g.lineWidth=9;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.stroke();drawTreads(g,A,B,9,7,'rgba(205,211,222,.58)');
    }else if(e.kind==='scaffold'){
      g.strokeStyle='rgba(87,98,116,.78)';g.lineWidth=8;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.stroke();
      g.strokeStyle='rgba(175,188,207,.50)';g.lineWidth=1.4;for(let i=0;i<5;i++){const t0=i/5,t1=(i+1)/5,x0=A.x+f.dx*t0,y0=A.y+f.dy*t0,x1=A.x+f.dx*t1,y1=A.y+f.dy*t1;g.beginPath();g.moveTo(x0-f.nx*6,y0-f.ny*6);g.lineTo(x1+f.nx*6,y1+f.ny*6);g.moveTo(x0+f.nx*6,y0+f.ny*6);g.lineTo(x1-f.nx*6,y1-f.ny*6);g.stroke();}
    }else{
      g.strokeStyle='rgba(78,88,106,.48)';g.lineWidth=6;g.beginPath();g.moveTo(A.x,A.y);g.lineTo(B.x,B.y);g.stroke();
    }
    g.restore();
  }

  function drawTopology(lane){
    ensureCanvas(lane);const{W,H}=sizeCanvas(lane),s=stage(),st=state();ctx.clearRect(0,0,W,H);if(!s||!st)return;
    for(const e of s.edges||[]){const a=nodeById(s,e.from),b=nodeById(s,e.to);if(!a||!b)continue;const A=projection(a,st.cameraY,W,H),B=projection(b,st.cameraY,W,H);if((A.y<-100&&B.y<-100)||(A.y>H+100&&B.y>H+100))continue;drawConnector(ctx,e,A,B);}
    // Mute the always-on white route centerline so physical geometry dominates. Selected routes are
    // redrawn brightly by moving-screen-ui-v1 on the layer above this one.
    ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(4,7,15,.23)';ctx.lineWidth=3.2;for(const e of s.edges||[]){const a=nodeById(s,e.from),b=nodeById(s,e.to);if(!a||!b)continue;const A=projection(a,st.cameraY,W,H),B=projection(b,st.cameraY,W,H);ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke();}ctx.restore();
  }

  function routeRows(){const s=stage();if(!s)return[];return[...document.querySelectorAll('#ttdMsRoutesV4 .ttdMsRouteBtnV4')].map(button=>{const label=String(button.textContent||'').replace(/^\s*⚠\s*/,'').trim();return{button,dest:nodeByName(s,label)}}).filter(r=>r.dest);}
  function inferSource(rows){const s=stage();if(!s||!rows.length)return null;const dests=rows.map(r=>r.dest);
    if(pendingDestinationId){const p=nodeById(s,pendingDestinationId);if(p&&dests.every(d=>adjacent(s,p.id).some(a=>a.id===d.id))){inferredSourceId=p.id;pendingDestinationId=null;return p;}pendingDestinationId=null;}
    if(inferredSourceId){const p=nodeById(s,inferredSourceId);if(p&&dests.every(d=>adjacent(s,p.id).some(a=>a.id===d.id)))return p;}
    const candidates=nodes(s).filter(c=>dests.every(d=>adjacent(s,c.id).some(a=>a.id===d.id)));if(!candidates.length)return null;candidates.sort((a,b)=>Math.max(0,adjacent(s,a.id).length-dests.length)-Math.max(0,adjacent(s,b.id).length-dests.length));inferredSourceId=candidates[0].id;return candidates[0];
  }
  function pointSegmentDistance(px,py,A,B){const vx=B.x-A.x,vy=B.y-A.y,wx=px-A.x,wy=py-A.y,vv=vx*vx+vy*vy||1,t=clamp((wx*vx+wy*vy)/vv,0,1),x=A.x+vx*t,y=A.y+vy*t;return{d:Math.hypot(px-x,py-y),t,x,y};}
  function nearestRoute(px,py,lane){const rows=routeRows(),s=stage(),st=state();if(!rows.length||!s||!st)return null;const source=inferSource(rows);if(!source)return null;const r=lane.getBoundingClientRect(),A=projection(source,st.cameraY,r.width,r.height);let best=null;for(const row of rows){const B=projection(row.dest,st.cameraY,r.width,r.height),seg=pointSegmentDistance(px,py,A,B),end=Math.hypot(px-B.x,py-B.y),score=Math.min(seg.d,end*.8);if(!best||score<best.score)best={...row,A,B,seg,score};}return best;}

  function localPoint(ev,lane){const r=lane.getBoundingClientRect();return{x:ev.clientX-r.left,y:ev.clientY-r.top};}
  function consume(ev){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation?.();}
  function onPointerDown(ev){if(!active()||ev.button>0)return;const lane=boundLane;if(!lane)return;const p=localPoint(ev,lane),hit=nearestRoute(p.x,p.y,lane);if(!hit||hit.score>30)return;gesture={pointerId:ev.pointerId,start:p,last:p,hit};pendingDestinationId=hit.dest.id;consume(ev);try{lane.setPointerCapture(ev.pointerId);}catch(_){} }
  function onPointerMove(ev){if(!gesture||gesture.pointerId!==ev.pointerId)return;gesture.last=localPoint(ev,boundLane);consume(ev);}
  function onPointerUp(ev){if(!gesture||gesture.pointerId!==ev.pointerId)return;const g=gesture;gesture=null;const end=localPoint(ev,boundLane),dx=end.x-g.start.x,dy=end.y-g.start.y,move=Math.hypot(dx,dy),vx=g.hit.B.x-g.hit.A.x,vy=g.hit.B.y-g.hit.A.y,vm=Math.hypot(vx,vy)||1,dot=(dx*vx+dy*vy)/(Math.max(1,move)*vm);consume(ev);try{boundLane.releasePointerCapture(ev.pointerId);}catch(_){}if(move<18||dot>.12){g.hit.button.click();}}
  function onPointerCancel(ev){if(gesture?.pointerId===ev.pointerId)gesture=null;}
  function bindLane(lane){if(boundLane===lane)return;if(boundLane){boundLane.removeEventListener('pointerdown',onPointerDown,true);boundLane.removeEventListener('pointermove',onPointerMove,true);boundLane.removeEventListener('pointerup',onPointerUp,true);boundLane.removeEventListener('pointercancel',onPointerCancel,true);}boundLane=lane;lane.addEventListener('pointerdown',onPointerDown,true);lane.addEventListener('pointermove',onPointerMove,true);lane.addEventListener('pointerup',onPointerUp,true);lane.addEventListener('pointercancel',onPointerCancel,true);}

  function updateCopy(){const s=stage();if(!s)return;const goal=s.objective?.killGoal||30,card=document.querySelector('#ttdMovingScreenCardV4 p');if(card)card.textContent=`Climb the neon district. Ten lives, ${goal} KOs, one rooftop flag.`;const hint=document.getElementById('ttdMsHintV4');if(hint&&/60 KOs reached/.test(hint.textContent||''))hint.textContent=hint.textContent.replace('60 KOs reached',`${goal} KOs reached`);const result=document.querySelector('#ttdMsResultV4 p');if(result&&/60 enemies/.test(result.textContent||''))result.textContent=result.textContent.replace('60 enemies',`${goal} enemies`);}

  function cleanup(){canvas?.remove();canvas=null;ctx=null;gesture=null;inferredSourceId=null;pendingDestinationId=null;}
  function tick(){const isActive=active();updateCopy();if(isActive){const lane=document.getElementById('laneWrap');if(lane){bindLane(lane);drawTopology(lane);}if(!lastActive){const goal=stage()?.objective?.killGoal||30;setTimeout(()=>{if(active())try{window.toastGlobal?.(`10 lives · ${goal} KOs · seize the crown flag`);}catch(_){}},40);}}else if(canvas?.isConnected)cleanup();lastActive=isActive;raf=requestAnimationFrame(tick);}

  installStyle();cancelAnimationFrame(raf);raf=requestAnimationFrame(tick);
})();
