(() => {
  'use strict';
  if (window.__TTD_STARTUP_POLISH_V31) return;
  window.__TTD_STARTUP_POLISH_V31 = true;

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
  ].filter(([el])=>el);
  if (!splash || !tap || !content) return;

  if (!document.getElementById('ttd-danger-girl-open-v28')) {
    const link = document.createElement('link');
    link.id = 'ttd-danger-girl-open-v28';
    link.rel = 'stylesheet';
    link.href = 'https://db.onlinewebfonts.com/c/b77ffe43cef50a333c65862751db2b5b?family=CCDangerGirlOpen';
    document.head.appendChild(link);
  }
  if (!document.getElementById('ttd-carter-one-fallback-v28')) {
    const link = document.createElement('link');
    link.id = 'ttd-carter-one-fallback-v28';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Carter+One&display=swap';
    document.head.appendChild(link);
  }

  const style = document.createElement('style');
  style.id = 'ttd-startup-polish-style-v31';
  style.textContent = `
    #ttdStartupSplashV26 .ttdSplashWordV26{
      font-family:'CCDangerGirlOpen','Carter One',sans-serif!important;
      font-weight:400!important;
      letter-spacing:.012em!important;
      -webkit-font-smoothing:antialiased;
      paint-order:stroke fill;
    }
    #ttdSplashTimeV26{filter:drop-shadow(0 0 4px rgba(139,127,232,.55)) drop-shadow(0 0 15px rgba(139,127,232,.2));}
    #ttdSplashToV26{filter:drop-shadow(0 0 4px rgba(243,212,145,.5)) drop-shadow(0 0 14px rgba(217,178,106,.2));}
    #ttdSplashDieV26{filter:drop-shadow(0 0 4px rgba(226,88,79,.56)) drop-shadow(0 0 16px rgba(226,88,79,.22));}
    #ttdHeavyBoltCanvasV28{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
    #ttdStartupShadeV26{z-index:2} #ttdStartupContentV26{z-index:3}
    #ttdAudioEntryFadeV28{position:fixed;inset:0;z-index:1100;background:#000;opacity:0;pointer-events:none;transition:opacity .44s ease}
    #ttdAudioEntryFadeV28.ttdBlackV28{opacity:1;pointer-events:auto}
    #ttdAudioEntryFadeV28.ttdRevealV28{opacity:0;transition-duration:.34s}
  `;
  document.head.appendChild(style);

  const heavy = document.createElement('canvas');
  heavy.id = 'ttdHeavyBoltCanvasV28';
  heavy.setAttribute('aria-hidden','true');
  originalFx?.insertAdjacentElement('afterend', heavy);
  const ctx = heavy.getContext('2d');
  let w=1,h=1,dpr=1,raf=0,bursts=[];
  const TAU=Math.PI*2;
  const rand=(min=0,max=1)=>min+Math.random()*(max-min);
  function resize(){
    if(!ctx)return;
    dpr=Math.min(2,Math.max(1,devicePixelRatio||1));
    w=Math.max(1,innerWidth);h=Math.max(1,innerHeight);
    heavy.width=Math.round(w*dpr);heavy.height=Math.round(h*dpr);
    heavy.style.width=w+'px';heavy.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); addEventListener('resize',resize,{passive:true});
  function center(el){const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,el};}
  function pointOnWord(el){
    const r=el.getBoundingClientRect();
    return {x:rand(r.left+r.width*.18,r.right-r.width*.18),y:rand(r.top+r.height*.25,r.bottom-r.height*.25)};
  }
  function randomRay(c){
    const angle=rand(0,TAU);
    const len=Math.max(w,h)*rand(.58,1.18);
    return {x:c.x+Math.cos(angle)*len,y:c.y+Math.sin(angle)*len};
  }
  function bolt(from,to,color,a,seed,widthScale=1){
    const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    const steps=Math.max(5,Math.min(15,Math.floor(len/58)));
    ctx.beginPath();ctx.moveTo(from.x,from.y);
    for(let i=1;i<steps;i++){
      const t=i/steps;
      const wobble=Math.sin((i*17.7+seed)*2.41+Math.sin(seed*.37))*Math.min(34,len*.065)*(1-Math.abs(t-.5)*.75);
      ctx.lineTo(from.x+dx*t+nx*wobble,from.y+dy*t+ny*wobble);
    }
    ctx.lineTo(to.x,to.y);
    ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=25*widthScale;
    ctx.globalAlpha=a*.34;ctx.lineWidth=11*widthScale;ctx.stroke();
    ctx.globalAlpha=a;ctx.lineWidth=4.2*widthScale;ctx.shadowBlur=14*widthScale;ctx.stroke();ctx.shadowBlur=0;
  }
  function makeBurst(centers,final){
    const rays=[];
    centers.forEach((c,ci)=>{
      const count=final?13:9;
      for(let i=0;i<count;i++)rays.push({from:c,to:randomRay(c),color:c.color,seed:rand(0,999)+ci*31});
    });
    const links=[];
    if(final&&centers.length>1){
      const count=6;
      for(let i=0;i<count;i++){
        const fromIndex=Math.floor(rand(0,centers.length));
        let toIndex=Math.floor(rand(0,centers.length-1));
        if(toIndex>=fromIndex)toIndex+=1;
        const a=centers[fromIndex],b=centers[toIndex];
        links.push({from:pointOnWord(a.el),to:pointOnWord(b.el),color:i%2?a.color:b.color,seed:rand(0,999)});
      }
    }
    return {centers,rays,links,start:performance.now(),duration:final?1550:900,final};
  }
  function render(now){
    raf=0;if(!ctx)return;ctx.clearRect(0,0,w,h);
    bursts=bursts.filter(b=>{
      const age=(now-b.start)/b.duration;if(age>1)return false;
      const p=Math.min(1,age/.12)*Math.min(1,(1-age)/.38);
      const crack=Math.floor(age*31);
      b.rays.forEach((ray,i)=>bolt(ray.from,ray.to,ray.color,(b.final?.8:.65)*p,ray.seed+crack+i*.7,1));
      b.links.forEach((link,i)=>bolt(link.from,link.to,link.color,.62*p,link.seed+crack+i*2,.42));
      return true;
    });
    ctx.globalAlpha=1;if(bursts.length)raf=requestAnimationFrame(render);
  }
  function burst(centers,final=false){bursts.push(makeBurst(centers,final));if(!raf)raf=requestAnimationFrame(render);}

  words.forEach(([el,color],index)=>{
    let was=false;
    const observer=new MutationObserver(()=>{
      const hit=el.classList.contains('ttdImpactV26');
      if(hit&&!was){
        if(index===2){
          burst(words.map(([x,c])=>({...center(x),color:c})),true);
        }else{
          burst([{...center(el),color}],false);
        }
      }
      was=hit;
    });
    observer.observe(el,{attributes:true,attributeFilter:['class']});
  });

  const fade=document.createElement('div');fade.id='ttdAudioEntryFadeV28';fade.setAttribute('aria-hidden','true');document.body.appendChild(fade);
  let entering=false;
  let skipGestureUntil=0;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  function accountReady(){return !signedIn?.hidden&&!frame?.hidden&&status?.dataset?.kind==='ok'&&/cloud account ready/i.test(status?.textContent||'');}
  async function waitReady(maxMs=8000){
    const deadline=performance.now()+Math.max(0,maxMs);
    while(!accountReady()&&performance.now()<deadline)await sleep(45);
    return accountReady();
  }
  function revealFromBlack(){
    fade.classList.add('ttdRevealV28');fade.classList.remove('ttdBlackV28');
    setTimeout(()=>fade.classList.remove('ttdRevealV28'),370);
  }
  async function enter(){
    if(entering)return;entering=true;
    const audio=window.__TTD_AUDIO_V27;
    try{await audio?.unlock?.();}catch(_){}
    tap.disabled=true;tap.classList.remove('ttdTapReadyV26');tap.textContent='ENTERING…';
    fade.classList.add('ttdBlackV28');
    try{
      await sleep(95);
      let welcomePromise=Promise.resolve();
      try{welcomePromise=Promise.resolve(audio?.playWelcome?.());}catch(error){console.error('TTD welcome failed',error);}
      await sleep(350);
      try{await Promise.race([welcomePromise,sleep(5000)]);}catch(error){console.error('TTD welcome failed',error);}
      await sleep(90);
      const ready=await waitReady(8000);
      if(!ready)console.warn('TTD startup reveal timed out waiting for account-ready; revealing shell instead of holding a black screen.');
      if(ready){
        try{Promise.resolve(audio?.enterMainMenu?.()).catch(error=>console.error('TTD main music failed',error));}catch(error){console.error('TTD main music failed',error);}
      }
      splash.hidden=true;document.documentElement.classList.remove('ttdStartupOpenV26');
    } finally {
      revealFromBlack();
      entering=false;
    }
  }
  function promptIsReady(){return !!window.__TTD_STARTUP_SPLASH_V31?.promptReady || !tap.disabled;}
  function stopEvent(event){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();}
  function intercept(event){
    if(splash.hidden)return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    if(event.type==='click'&&performance.now()<skipGestureUntil){stopEvent(event);return;}
    if(!promptIsReady()){
      stopEvent(event);
      const skipped=window.__TTD_STARTUP_SPLASH_V31?.skipToEnd?.();
      if(skipped)skipGestureUntil=performance.now()+500;
      return;
    }
    if(entering||tap.disabled)return;
    stopEvent(event);enter();
  }
  splash.addEventListener('pointerup',intercept,true);
  splash.addEventListener('click',intercept,true);
  splash.addEventListener('keydown',intercept,true);
})();