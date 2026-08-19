(() => {
  'use strict';
  if (window.__TTD_STARTUP_POLISH_V27) return;
  window.__TTD_STARTUP_POLISH_V27 = true;

  const splash = document.getElementById('ttdStartupSplashV26');
  const originalFx = document.getElementById('ttdStartupFxV26');
  const content = document.getElementById('ttdStartupContentV26');
  const tap = document.getElementById('ttdStartupTapV26');
  const frame = document.getElementById('gameFrame');
  const status = document.getElementById('status');
  const signedIn = document.getElementById('signedIn');
  const words = [
    [document.getElementById('ttdSplashTimeV26'),'#8b7fe8'],
    [document.getElementById('ttdSplashToV26'),'#f3d491'],
    [document.getElementById('ttdSplashDieV26'),'#e2584f'],
  ];
  if (!splash || !tap || !content) return;

  if (!document.getElementById('ttd-carter-one-v27')) {
    const link = document.createElement('link');
    link.id = 'ttd-carter-one-v27'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Carter+One&display=swap';
    document.head.appendChild(link);
  }

  const style = document.createElement('style');
  style.id = 'ttd-startup-polish-style-v27';
  style.textContent = `
    #ttdStartupSplashV26 .ttdSplashWordV26{font-family:'Carter One',sans-serif!important;font-weight:400!important;letter-spacing:.015em!important}
    #ttdHeavyBoltCanvasV27{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
    #ttdStartupShadeV26{z-index:2} #ttdStartupContentV26{z-index:3}
    #ttdAudioEntryFadeV27{position:fixed;inset:0;z-index:1100;background:#000;opacity:0;pointer-events:none;transition:opacity .44s ease}
    #ttdAudioEntryFadeV27.ttdBlackV27{opacity:1;pointer-events:auto}
    #ttdAudioEntryFadeV27.ttdRevealV27{opacity:0;transition-duration:.34s}
  `;
  document.head.appendChild(style);

  const heavy = document.createElement('canvas'); heavy.id = 'ttdHeavyBoltCanvasV27'; heavy.setAttribute('aria-hidden','true');
  originalFx?.insertAdjacentElement('afterend', heavy);
  const ctx = heavy.getContext('2d');
  let w=1,h=1,dpr=1,raf=0,bursts=[];
  function resize(){ if(!ctx)return; dpr=Math.min(2,Math.max(1,devicePixelRatio||1));w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);heavy.width=Math.round(w*dpr);heavy.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0); }
  resize(); addEventListener('resize',resize,{passive:true});
  function center(el){const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
  function edge(i,phase){const side=i%4,t=((i*.267+phase*.071)%1+1)%1;if(side===0)return{x:t*w,y:-25};if(side===1)return{x:w+25,y:t*h};if(side===2)return{x:t*w,y:h+25};return{x:-25,y:t*h};}
  function bolt(from,to,color,a,seed){
    const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,steps=Math.max(6,Math.min(14,Math.floor(len/65)));
    ctx.beginPath();ctx.moveTo(from.x,from.y);
    for(let i=1;i<steps;i++){const t=i/steps;const wobble=Math.sin((i*17.7+seed)*2.41)*Math.min(30,len*.058)*(1-Math.abs(t-.5)*.8);ctx.lineTo(from.x+dx*t+nx*wobble,from.y+dy*t+ny*wobble);}ctx.lineTo(to.x,to.y);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=24;
    ctx.globalAlpha=a*.38;ctx.lineWidth=9;ctx.stroke();
    ctx.globalAlpha=a;ctx.lineWidth=3.4;ctx.shadowBlur=13;ctx.stroke();ctx.shadowBlur=0;
  }
  function render(now){raf=0;if(!ctx)return;ctx.clearRect(0,0,w,h);bursts=bursts.filter(b=>{const age=(now-b.start)/b.duration;if(age>1)return false;const p=Math.min(1,age/.12)*Math.min(1,(1-age)/.4);const crack=Math.floor(age*26);b.centers.forEach((c,ci)=>{for(let i=0;i<(b.final?12:8);i++)bolt(c,edge(i+ci*3,crack*.13),c.color,(b.final?.78:.62)*p,crack+i*11+ci*17);});return true;});ctx.globalAlpha=1;if(bursts.length)raf=requestAnimationFrame(render);}
  function burst(centers,final=false){bursts.push({centers,start:performance.now(),duration:final?1500:900,final});if(!raf)raf=requestAnimationFrame(render);}
  const observed = new WeakMap();
  words.forEach(([el,color],index)=>{if(!el)return;let was=false;const observer=new MutationObserver(()=>{const hit=el.classList.contains('ttdImpactV26');if(hit&&!was){if(index===2)burst(words.filter(([x])=>x).map(([x,c])=>({...center(x),color:c})),true);else burst([{...center(el),color}],false);}was=hit;});observer.observe(el,{attributes:true,attributeFilter:['class']});observed.set(el,observer);});

  const fade = document.createElement('div'); fade.id='ttdAudioEntryFadeV27'; fade.setAttribute('aria-hidden','true'); document.body.appendChild(fade);
  let entering=false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function accountReady(){return !signedIn?.hidden && !frame?.hidden && status?.dataset?.kind==='ok' && /cloud account ready/i.test(status?.textContent||'');}
  async function waitReady(){while(!accountReady())await sleep(45);}

  async function enter(){
    if(entering)return;entering=true;
    const audio=window.__TTD_AUDIO_V27;
    try{await audio?.unlock?.();}catch(_){}
    tap.disabled=true;tap.classList.remove('ttdTapReadyV26');tap.textContent='ENTERING…';
    fade.classList.add('ttdBlackV27');
    await sleep(470);
    try{await audio?.playWelcome?.();}catch(error){console.error('TTD welcome failed',error);}
    await sleep(220);
    await waitReady();
    try{await audio?.enterMainMenu?.();}catch(error){console.error('TTD main music failed',error);}
    splash.hidden=true;document.documentElement.classList.remove('ttdStartupOpenV26');
    fade.classList.add('ttdRevealV27');fade.classList.remove('ttdBlackV27');
    await sleep(370);fade.classList.remove('ttdRevealV27');
  }
  function intercept(event){
    if(entering || tap.disabled || splash.hidden) return;
    if(event.type==='keydown' && !['Enter',' '].includes(event.key)) return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();enter();
  }
  splash.addEventListener('pointerup',intercept,true);
  splash.addEventListener('click',intercept,true);
  splash.addEventListener('keydown',intercept,true);
})();
