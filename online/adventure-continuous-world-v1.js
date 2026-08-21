(() => {
  'use strict';
  if(window.__TTD_CONTINUOUS_WORLD_V1)return;

  /* This module runs after the traversal renderer is installed, inside the same transformed game
     scope. It deliberately wraps that renderer instead of creating a second world. */
  const basePlatforms=currentPlatforms;
  const baseBackground=drawBackground;
  const clamp01=(v)=>Math.max(0,Math.min(1,v));
  const smoothstep=(a,b,v)=>{const t=clamp01((v-a)/Math.max(.0001,b-a));return t*t*(3-2*t);};
  const rgb=(parts,weights)=>{
    const sum=Math.max(.0001,weights.reduce((a,b)=>a+b,0));
    const out=[0,1,2].map((i)=>Math.round(parts.reduce((n,p,j)=>n+p[i]*weights[j],0)/sum));
    return `rgb(${out[0]},${out[1]},${out[2]})`;
  };
  const active=()=>!!state?.__ttdTestMap||!!session?.__ttdWorldPreview;

  /* Oversized ground depth means the player sees terrain, not the artificial lateral edge of a
     rendering slab. World-space region overlaps create terrain transitions without gaps. */
  currentPlatforms=function currentPlatformsContinuousWorldV1(t){
    if(!active())return basePlatforms(t);
    return [
      {id:'beach_ground',x1:-520,x2:690,z1:-1200,z2:1200,y:0,kind:'ground_beach'},
      {id:'jungle_ground',x1:540,x2:1210,z1:-1200,z2:1200,y:0,kind:'ground_jungle'},
      {id:'temple_ground',x1:1030,x2:2600,z1:-1200,z2:1200,y:0,kind:'ground_temple'},
    ];
  };

  drawBackground=function drawBackgroundContinuousWorldV1(g){
    if(!active())return baseBackground(g);
    const W=session.w,H=session.h,cx=Number(session.cameraX)||0;
    const jungleIn=smoothstep(430,760,cx);
    const templeIn=smoothstep(960,1290,cx);
    const beachWeight=1-jungleIn;
    const jungleWeight=jungleIn*(1-templeIn);
    const templeWeight=templeIn;
    const weights=[beachWeight,jungleWeight,templeWeight];

    const top=rgb([[46,102,131],[37,79,70],[24,43,60]],weights);
    const middle=rgb([[120,181,197],[91,137,126],[91,113,117]],weights);
    const low=rgb([[204,208,182],[145,164,129],[132,139,122]],weights);
    const sky=g.createLinearGradient(0,0,0,H*.76);
    sky.addColorStop(0,top);sky.addColorStop(.54,middle);sky.addColorStop(1,low);
    g.fillStyle=sky;g.fillRect(0,0,W,H);
    const horizon=H*.31;

    /* Beach water fades behind jungle vegetation instead of disappearing on a camera threshold. */
    const seaAlpha=clamp01(beachWeight*1.16);
    if(seaAlpha>.01){
      g.save();g.globalAlpha=seaAlpha;
      const sea=g.createLinearGradient(0,horizon,0,H*.60);sea.addColorStop(0,'#65bbc1');sea.addColorStop(1,'#2b7f8d');g.fillStyle=sea;g.fillRect(0,horizon,W,H*.32);
      g.strokeStyle='rgba(235,249,242,.38)';g.lineWidth=1.2;
      for(let i=0;i<5;i++){const y=horizon+18+i*18;g.beginPath();g.moveTo(0,y);for(let x=0;x<=W;x+=28)g.lineTo(x,y+Math.sin((x+i*31)/35)*2.2);g.stroke();}
      g.fillStyle='rgba(39,75,80,.30)';for(let i=0;i<5;i++){const x=(i*151-cx*.08)%(W+180)-90;g.beginPath();g.moveTo(x,horizon+8);g.lineTo(x+45,horizon-24);g.lineTo(x+94,horizon+8);g.fill();}
      g.restore();
    }

    /* Jungle canopy gradually grows over the beach and gradually yields to temple ruins. */
    const jungleAlpha=clamp01(jungleIn*(1-templeIn*.72));
    if(jungleAlpha>.01){
      g.save();g.globalAlpha=jungleAlpha;g.fillStyle='#18392d';
      for(let i=0;i<10;i++){const x=(i*92-cx*.12)%(W+150)-75;const hh=70+(i%3)*25;g.beginPath();g.moveTo(x,horizon+75);g.lineTo(x+20,horizon-hh);g.lineTo(x+42,horizon+75);g.fill();g.beginPath();g.arc(x+21,horizon-hh,34+(i%2)*12,0,Math.PI*2);g.fill();}
      g.fillStyle='rgba(80,119,83,.25)';g.fillRect(0,horizon+42,W,H*.22);g.restore();
    }

    /* Temple silhouette grows in behind the jungle; nothing swaps or teleports. */
    const templeAlpha=clamp01(templeIn*1.08);
    if(templeAlpha>.01){
      g.save();g.globalAlpha=templeAlpha;g.fillStyle='#29383b';
      for(let i=0;i<8;i++){const x=(i*128-cx*.05)%(W+230)-115;g.fillRect(x,horizon-42,52,120);g.beginPath();g.moveTo(x-13,horizon-42);g.lineTo(x+26,horizon-78);g.lineTo(x+65,horizon-42);g.fill();}
      g.fillStyle='rgba(106,118,103,.22)';g.fillRect(0,horizon+35,W,H*.24);g.restore();
    }

    const mist=g.createLinearGradient(0,H*.40,0,H);mist.addColorStop(0,'rgba(232,239,220,.08)');mist.addColorStop(1,'rgba(16,24,25,.17)');g.fillStyle=mist;g.fillRect(0,H*.40,W,H*.60);
  };

  window.__TTD_CONTINUOUS_WORLD_V1=Object.freeze({
    version:1,
    contract:'one-world-one-camera-persistent-objects',
    backdrop:'continuous-crossfade',
    groundDepth:2400,
  });
})();
