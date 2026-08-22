(() => {
  'use strict';

  const DICE_COUNT = 240;
  const COLORS = Object.freeze({ time:'#8b7fe8', to:'#f3d491', die:'#e2584f' });
  const statusEl = document.getElementById('status');
  const signedInEl = document.getElementById('signedIn');
  const gameFrame = document.getElementById('gameFrame');
  if (!signedInEl || !gameFrame) return;

  const style = document.createElement('style');
  style.id = 'ttd-startup-splash-style-v26';
  style.textContent = `
    #ttdStartupSplashV26{position:fixed;inset:0;z-index:1000;overflow:hidden;background:#070911;color:#ece7da;touch-action:manipulation;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;opacity:1;transition:opacity .38s ease;}
    #ttdStartupSplashV26.ttdSplashLeaving{opacity:0;pointer-events:none;}
    #ttdStartupFxV26{position:absolute;inset:0;width:100%;height:100%;display:block;}
    #ttdStartupShadeV26{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,rgba(8,10,20,.08) 0%,rgba(7,9,17,.22) 46%,rgba(3,4,10,.72) 100%);pointer-events:none;}
    #ttdStartupContentV26{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 14px calc(22px + env(safe-area-inset-bottom));pointer-events:none;}
    #ttdStartupLogoV26{display:flex;align-items:baseline;justify-content:center;gap:clamp(5px,1.8vw,16px);width:100%;white-space:nowrap;filter:drop-shadow(0 8px 20px rgba(0,0,0,.7));}
    .ttdSplashWordV26{--fly-ms:620ms;display:inline-block;font-family:'Cinzel',serif!important;font-weight:700!important;font-size:clamp(39px,11.7vw,82px)!important;line-height:.94;letter-spacing:.025em;will-change:transform,filter;transition:transform var(--fly-ms) cubic-bezier(.13,.82,.18,1.06);}
    #ttdSplashTimeV26{color:${COLORS.time};text-shadow:0 0 8px rgba(139,127,232,.65),0 0 28px rgba(139,127,232,.28);transform:translate3d(-125vw,0,0);}
    #ttdSplashToV26{color:${COLORS.to};font-size:clamp(27px,8vw,56px)!important;text-shadow:0 0 8px rgba(243,212,145,.6),0 0 26px rgba(217,178,106,.27);transform:translate3d(125vw,0,0);}
    #ttdSplashDieV26{color:${COLORS.die};text-shadow:0 0 8px rgba(226,88,79,.68),0 0 30px rgba(226,88,79,.3);transform:translate3d(0,125vh,0);}
    .ttdSplashWordV26.ttdArrivedV26{transform:translate3d(0,0,0)!important;}
    .ttdSplashWordV26.ttdImpactV26{animation:ttdLogoImpactV26 .28s ease-out;}
    @keyframes ttdLogoImpactV26{0%{filter:brightness(2.4) saturate(1.6);transform:scale(1.045)}42%{filter:brightness(1.35) saturate(1.2);transform:scale(.985)}100%{filter:none;transform:scale(1)}}
    #ttdStartupCopyV26{display:flex;flex-direction:column;align-items:center;min-height:91px;margin-top:clamp(28px,7vh,70px);text-align:center;text-shadow:0 2px 8px #000;}
    #ttdStartupGreetingV26{min-height:25px;font-size:clamp(15px,4.4vw,22px);letter-spacing:.035em;color:#ece7da;}
    #ttdStartupTapV26{appearance:none;border:0!important;background:transparent!important;box-shadow:none!important;padding:8px 18px!important;margin-top:6px;color:#f3d491!important;font-size:clamp(16px,4.8vw,23px)!important;font-weight:400!important;letter-spacing:.105em;min-width:180px;min-height:42px;pointer-events:auto;opacity:0;cursor:pointer;}
    #ttdStartupTapV26.ttdTapReadyV26{opacity:1;animation:ttdTapPulseV26 1.05s ease-in-out infinite;}
    #ttdStartupTapV26.ttdTapWaitingV26{opacity:.72;animation:none;letter-spacing:.08em;}
    @keyframes ttdTapPulseV26{0%,100%{opacity:.34}50%{opacity:1}}
    #ttdStartupSplashV26.ttdCanTapV26{cursor:pointer;}
    @media (orientation:landscape) and (max-height:520px){#ttdStartupCopyV26{margin-top:22px;min-height:70px}.ttdSplashWordV26{font-size:clamp(36px,8.5vw,70px)!important}#ttdSplashToV26{font-size:clamp(25px,5.8vw,48px)!important}}
    @media (prefers-reduced-motion:reduce){.ttdSplashWordV26{transition-duration:.01ms!important}.ttdSplashWordV26.ttdImpactV26{animation:none!important}#ttdStartupTapV26.ttdTapReadyV26{animation:ttdTapPulseV26 1.7s ease-in-out infinite}}
  `;
  document.head.appendChild(style);

  const splash = document.createElement('section');
  splash.id = 'ttdStartupSplashV26';
  splash.hidden = true;
  splash.dataset.ttdPromptReady = '0';
  splash.setAttribute('aria-label','Time to Die');
  splash.innerHTML = `
    <canvas id="ttdStartupFxV26" aria-hidden="true"></canvas>
    <div id="ttdStartupShadeV26" aria-hidden="true"></div>
    <div id="ttdStartupContentV26">
      <div id="ttdStartupLogoV26" aria-label="Time to Die">
        <span class="ttdSplashWordV26" id="ttdSplashTimeV26">TIME</span>
        <span class="ttdSplashWordV26" id="ttdSplashToV26">TO</span>
        <span class="ttdSplashWordV26" id="ttdSplashDieV26">DIE</span>
      </div>
      <div id="ttdStartupCopyV26">
        <div id="ttdStartupGreetingV26" aria-live="polite"></div>
        <button id="ttdStartupTapV26" type="button" disabled aria-label="Tap to Die"></button>
      </div>
    </div>
  `;
  document.body.appendChild(splash);

  const canvas = document.getElementById('ttdStartupFxV26');
  const ctx = canvas.getContext('2d');
  const timeWord = document.getElementById('ttdSplashTimeV26');
  const toWord = document.getElementById('ttdSplashToV26');
  const dieWord = document.getElementById('ttdSplashDieV26');
  const greeting = document.getElementById('ttdStartupGreetingV26');
  const tapButton = document.getElementById('ttdStartupTapV26');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let active = false;
  let sequenceToken = 0;
  let tapped = false;
  let promptReady = false;
  let bootstrapReady = false;
  let raf = 0;
  let diceRevealStarted = 0;
  let diceReveal = 0;
  let bursts = [];
  let cssWidth = 1;
  let cssHeight = 1;
  let dpr = 1;
  let seed = 0x54_54_44_26;

  function rand() {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) / 4294967296);
  }
  const dice = Array.from({length:DICE_COUNT},(_,index)=>({
    x:rand(), y:rand(), size:7+rand()*21, rot:(rand()-.5)*1.3,
    hue:Math.floor(rand()*360), face:1+Math.floor(rand()*6), ornate:rand()<.3,
    depth:.45+rand()*.55, index,
  }));

  function signedIn() { return !signedInEl.hidden; }
  function accountReady() {
    return signedIn() && !gameFrame.hidden && statusEl?.dataset?.kind === 'ok' && /cloud account ready/i.test(statusEl.textContent || '');
  }
  function wait(ms) { return new Promise((resolve)=>setTimeout(resolve, reducedMotion ? Math.min(ms,40) : ms)); }

  function resetWord(word, transform) {
    word.classList.remove('ttdArrivedV26','ttdImpactV26');
    word.style.transition = 'none';
    word.style.transform = transform;
    void word.offsetWidth;
    word.style.transition = '';
  }

  function resizeCanvas() {
    if (!ctx) return;
    dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    cssWidth = Math.max(1, innerWidth);
    cssHeight = Math.max(1, innerHeight);
    canvas.width = Math.round(cssWidth*dpr);
    canvas.height = Math.round(cssHeight*dpr);
    canvas.style.width = cssWidth+'px';
    canvas.style.height = cssHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    requestFrame();
  }

  function roundRectPath(c,x,y,w,h,r) {
    const rr=Math.min(r,w/2,h/2);
    c.beginPath();c.moveTo(x+rr,y);c.arcTo(x+w,y,x+w,y+h,rr);c.arcTo(x+w,y+h,x,y+h,rr);c.arcTo(x,y+h,x,y,rr);c.arcTo(x,y,x+w,y,rr);c.closePath();
  }
  function pip(c,x,y,r,fill){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function drawFacePips(c,face,s,ink) {
    const a=s*.23,b=s*.5,d=s*.77,r=Math.max(1,s*.07);
    const points={1:[[b,b]],2:[[a,a],[d,d]],3:[[a,a],[b,b],[d,d]],4:[[a,a],[d,a],[a,d],[d,d]],5:[[a,a],[d,a],[b,b],[a,d],[d,d]],6:[[a,a],[d,a],[a,b],[d,b],[a,d],[d,d]]}[face];
    points.forEach(([x,y])=>pip(c,x,y,r,ink));
  }
  function drawOrnateFace(c,s,ink,type) {
    c.strokeStyle=ink;c.fillStyle=ink;c.lineWidth=Math.max(1,s*.055);c.lineCap='round';c.lineJoin='round';
    const m=s*.5,r=s*.27;
    if(type%4===0){c.beginPath();c.arc(m,m,r,0,Math.PI*2);c.stroke();c.beginPath();c.arc(m,m,r*.48,0,Math.PI*2);c.stroke();for(let i=0;i<6;i++){const a=i*Math.PI/3;c.beginPath();c.moveTo(m+Math.cos(a)*r*.55,m+Math.sin(a)*r*.55);c.lineTo(m+Math.cos(a)*r*1.22,m+Math.sin(a)*r*1.22);c.stroke();}}
    else if(type%4===1){c.beginPath();for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4,rr=i%2?r*.45:r;const x=m+Math.cos(a)*rr,y=m+Math.sin(a)*rr;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.stroke();pip(c,m,m,s*.045,ink);}
    else if(type%4===2){c.beginPath();c.moveTo(s*.25,s*.68);c.quadraticCurveTo(s*.43,s*.2,s*.57,s*.55);c.quadraticCurveTo(s*.69,s*.82,s*.78,s*.27);c.stroke();c.beginPath();c.moveTo(s*.25,s*.4);c.lineTo(s*.75,s*.62);c.stroke();}
    else {for(let i=0;i<3;i++){c.save();c.translate(m,m);c.rotate(i*Math.PI/3);c.beginPath();c.moveTo(-r,0);c.lineTo(r,0);c.moveTo(-r*.5,-r*.5);c.lineTo(0,0);c.lineTo(-r*.5,r*.5);c.stroke();c.restore();}pip(c,m,m,s*.045,ink);}
  }
  function drawDie(die,alpha) {
    const s=die.size*die.depth;
    const x=die.x*cssWidth,y=die.y*cssHeight;
    ctx.save();ctx.globalAlpha=alpha*(.42+.38*die.depth);ctx.translate(x,y);ctx.rotate(die.rot);ctx.translate(-s/2,-s/2);
    const grad=ctx.createLinearGradient(0,0,s,s);grad.addColorStop(0,`hsl(${die.hue} 82% 68%)`);grad.addColorStop(.52,`hsl(${die.hue} 70% 50%)`);grad.addColorStop(1,`hsl(${(die.hue+22)%360} 68% 31%)`);
    ctx.shadowColor=`hsla(${die.hue} 80% 60% / .42)`;ctx.shadowBlur=s*.45;roundRectPath(ctx,0,0,s,s,s*.18);ctx.fillStyle=grad;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=Math.max(.55,s*.04);ctx.stroke();
    const ink=die.hue>38&&die.hue<195?'rgba(4,7,13,.82)':'rgba(250,247,238,.88)';
    if(die.ornate)drawOrnateFace(ctx,s,ink,die.index);else drawFacePips(ctx,die.face,s,ink);
    ctx.restore();
  }

  function wordCenter(word) {
    const r=word.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
  }
  function addBurst(centers, final=false) {
    bursts.push({centers,start:performance.now(),duration:final?1680:920,final});
    requestFrame();
  }
  function edgePoint(i,phase) {
    const side=i%4;
    const t=((i*.271+phase*.067)%1+1)%1;
    if(side===0)return{x:t*cssWidth,y:-20};
    if(side===1)return{x:cssWidth+20,y:t*cssHeight};
    if(side===2)return{x:t*cssWidth,y:cssHeight+20};
    return{x:-20,y:t*cssHeight};
  }
  function drawBolt(from,to,color,alpha,seedOffset) {
    const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy),nx=-dy/(len||1),ny=dx/(len||1);const steps=Math.max(5,Math.min(13,Math.floor(len/75)));
    ctx.beginPath();ctx.moveTo(from.x,from.y);
    for(let i=1;i<steps;i++){const t=i/steps;const wobble=Math.sin((i*19.13+seedOffset)*2.17)*Math.min(24,len*.05)*(1-Math.abs(t-.5)*.9);ctx.lineTo(from.x+dx*t+nx*wobble,from.y+dy*t+ny*wobble);}ctx.lineTo(to.x,to.y);
    ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=1.25;ctx.shadowColor=color;ctx.shadowBlur=9;ctx.stroke();ctx.shadowBlur=0;
  }
  function drawBurst(b,now) {
    const age=(now-b.start)/b.duration;if(age<0||age>1)return false;
    const rise=Math.min(1,age/.16),fall=Math.min(1,(1-age)/.45),power=Math.max(0,Math.min(rise,fall));
    b.centers.forEach((center,ci)=>{
      const radial=ctx.createRadialGradient(center.x,center.y,0,center.x,center.y,Math.max(cssWidth,cssHeight)*(.42+(b.final?.22:0)));
      radial.addColorStop(0,hexAlpha(center.color,.20*power));radial.addColorStop(.2,hexAlpha(center.color,.07*power));radial.addColorStop(1,hexAlpha(center.color,0));ctx.globalAlpha=1;ctx.fillStyle=radial;ctx.fillRect(0,0,cssWidth,cssHeight);
      ctx.strokeStyle=center.color;ctx.globalAlpha=.22*power;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(center.x,center.y,(24+age*(b.final?320:190)),0,Math.PI*2);ctx.stroke();
      const boltCount=b.final?10:7;const crack=Math.floor(age*24);
      for(let i=0;i<boltCount;i++)drawBolt(center,edgePoint(i+ci*3,crack*.11),center.color,(b.final?.7:.48)*power,crack+i*7+ci*17);
    });
    ctx.globalAlpha=1;return true;
  }
  function hexAlpha(hex,a){const h=hex.replace('#','');const n=parseInt(h,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${Math.max(0,Math.min(1,a))})`;}

  function render(now=performance.now()) {
    raf=0;if(!ctx||splash.hidden)return;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssWidth,cssHeight);
    const bg=ctx.createRadialGradient(cssWidth*.5,cssHeight*.42,0,cssWidth*.5,cssHeight*.45,Math.max(cssWidth,cssHeight)*.8);bg.addColorStop(0,'#11162d');bg.addColorStop(.42,'#090d1b');bg.addColorStop(1,'#03050b');ctx.fillStyle=bg;ctx.fillRect(0,0,cssWidth,cssHeight);
    if(diceRevealStarted){diceReveal=Math.min(1,(now-diceRevealStarted)/(reducedMotion?60:900));}
    if(diceReveal>0){dice.forEach((die)=>drawDie(die,diceReveal));const veil=ctx.createRadialGradient(cssWidth*.5,cssHeight*.45,0,cssWidth*.5,cssHeight*.45,Math.max(cssWidth,cssHeight)*.58);veil.addColorStop(0,'rgba(4,6,13,.55)');veil.addColorStop(.55,'rgba(4,6,13,.23)');veil.addColorStop(1,'rgba(4,6,13,.08)');ctx.fillStyle=veil;ctx.fillRect(0,0,cssWidth,cssHeight);}
    bursts=bursts.filter((b)=>drawBurst(b,now));
    if(bursts.length || (diceRevealStarted&&diceReveal<1)) requestFrame();
  }
  function requestFrame(){if(!raf)raf=requestAnimationFrame(render);}

  async function flyWord(word,ms,token) {
    if(token!==sequenceToken)return false;
    word.style.setProperty('--fly-ms',(reducedMotion?1:ms)+'ms');
    requestAnimationFrame(()=>word.classList.add('ttdArrivedV26'));
    await wait(ms+20);return token===sequenceToken;
  }
  function impactWord(word,color,final=false) {
    word.classList.remove('ttdImpactV26');void word.offsetWidth;word.classList.add('ttdImpactV26');
    if(final){addBurst([{...wordCenter(timeWord),color:COLORS.time},{...wordCenter(toWord),color:COLORS.to},{...wordCenter(dieWord),color:COLORS.die}],true);}
    else addBurst([{...wordCenter(word),color}],false);
  }
  async function typeText(el,text,perChar,token){el.textContent='';for(const ch of text){if(token!==sequenceToken)return false;el.textContent+=ch;await wait(perChar);}return token===sequenceToken;}

  function markPromptReady(){
    promptReady=true;
    splash.dataset.ttdPromptReady='1';
    tapButton.disabled=false;
    tapButton.classList.add('ttdTapReadyV26');
    splash.classList.add('ttdCanTapV26');
  }
  async function playLanding(token) {
    await wait(220);
    if(!await flyWord(timeWord,620,token))return;impactWord(timeWord,COLORS.time);await wait(690);
    if(!await flyWord(toWord,560,token))return;impactWord(toWord,COLORS.to);await wait(690);
    if(!await flyWord(dieWord,620,token))return;impactWord(dieWord,COLORS.die,true);
    await wait(700);if(token!==sequenceToken)return;diceRevealStarted=performance.now();requestFrame();await wait(970);
    if(!await typeText(greeting,'Okay, Die Master',42,token))return;await wait(150);
    tapButton.textContent='';
    if(!await typeText(tapButton,'TAP to DIE',54,token))return;
    markPromptReady();
  }
  function finishLandingImmediately(){
    if(!active||promptReady||tapped||splash.hidden)return false;
    sequenceToken++;
    bursts=[];
    for(const word of [timeWord,toWord,dieWord]){
      word.classList.remove('ttdImpactV26');
      word.style.setProperty('--fly-ms','1ms');
      word.classList.add('ttdArrivedV26');
    }
    diceRevealStarted=performance.now()-1000;
    diceReveal=1;
    greeting.textContent='Okay, Die Master';
    tapButton.textContent='TAP to DIE';
    markPromptReady();
    requestFrame();
    return true;
  }

  function createAudioContext(win) {
    try {
      const Ctor=win.AudioContext||win.webkitAudioContext;if(!Ctor)return null;
      let audio=win.__ttdAudioContext;
      if(!audio||audio.state==='closed')audio=new Ctor();
      win.__ttdAudioContext=audio;
      const resume=audio.resume?.();if(resume?.catch)resume.catch(()=>{});
      const gain=audio.createGain();gain.gain.value=0;const oscillator=audio.createOscillator();oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+.025);
      return audio;
    } catch (_) { return null; }
  }
  function signalAudioUnlocked(win,parentContext=null) {
    try {
      if(parentContext)win.__ttdParentAudioContext=parentContext;
      win.__ttdAudioUnlocked=true;
      win.dispatchEvent(new win.CustomEvent('ttd:audio-unlock',{detail:{unlocked:true,parentContext:!!parentContext}}));
    } catch (_) {}
  }
  function unlockAudioFromGesture() {
    const parentContext=createAudioContext(window);window.__ttdAudioUnlocked=true;signalAudioUnlocked(window,parentContext);
    try { const child=gameFrame.contentWindow;if(child){createAudioContext(child);signalAudioUnlocked(child,parentContext);} } catch (_) {}
  }
  function relayAudioUnlockToFrame() {
    if(!tapped)return;
    try {const child=gameFrame.contentWindow;if(child)signalAudioUnlocked(child,window.__ttdAudioContext||null);} catch (_) {}
  }

  function dismissWhenReady() {
    bootstrapReady=accountReady();
    if(!active||!tapped||!bootstrapReady)return;
    splash.classList.add('ttdSplashLeaving');
    setTimeout(()=>{if(active&&tapped){splash.hidden=true;active=false;document.documentElement.classList.remove('ttdStartupOpenV26');}},390);
  }
  function acceptTap(event) {
    if(!active||!promptReady||tapped)return;
    if(event?.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    event?.preventDefault?.();
    tapped=true;unlockAudioFromGesture();
    tapButton.disabled=true;tapButton.classList.remove('ttdTapReadyV26');tapButton.classList.add('ttdTapWaitingV26');tapButton.textContent=accountReady()?'ENTERING…':'LOADING…';
    splash.classList.remove('ttdCanTapV26');dismissWhenReady();
  }

  function resetLanding() {
    sequenceToken++;
    active=false;tapped=false;promptReady=false;bootstrapReady=false;diceRevealStarted=0;diceReveal=0;bursts=[];if(raf){cancelAnimationFrame(raf);raf=0;}
    splash.dataset.ttdPromptReady='0';
    greeting.textContent='';tapButton.textContent='';tapButton.disabled=true;tapButton.classList.remove('ttdTapReadyV26','ttdTapWaitingV26');splash.classList.remove('ttdCanTapV26','ttdSplashLeaving');
    resetWord(timeWord,'translate3d(-125vw,0,0)');resetWord(toWord,'translate3d(125vw,0,0)');resetWord(dieWord,'translate3d(0,125vh,0)');
    splash.hidden=true;document.documentElement.classList.remove('ttdStartupOpenV26');
  }
  function beginLanding() {
    if(active||!signedIn())return;
    active=true;tapped=false;promptReady=false;bootstrapReady=accountReady();diceRevealStarted=0;diceReveal=0;bursts=[];
    splash.dataset.ttdPromptReady='0';
    greeting.textContent='';tapButton.textContent='';tapButton.disabled=true;tapButton.classList.remove('ttdTapReadyV26','ttdTapWaitingV26');splash.classList.remove('ttdCanTapV26','ttdSplashLeaving');
    resetWord(timeWord,'translate3d(-125vw,0,0)');resetWord(toWord,'translate3d(125vw,0,0)');resetWord(dieWord,'translate3d(0,125vh,0)');
    splash.hidden=false;document.documentElement.classList.add('ttdStartupOpenV26');resizeCanvas();const token=++sequenceToken;requestFrame();playLanding(token);
  }
  function syncAuthState() {
    if(signedIn())beginLanding();
    else if(active||!splash.hidden)resetLanding();
  }

  window.__TTD_STARTUP_SPLASH_V31=Object.freeze({
    version:31,
    skipToEnd:finishLandingImmediately,
    get active(){return active&&!splash.hidden;},
    get promptReady(){return promptReady;},
  });

  splash.addEventListener('pointerup',acceptTap);
  tapButton.addEventListener('click',acceptTap);
  splash.addEventListener('keydown',acceptTap);
  gameFrame.addEventListener('load',relayAudioUnlockToFrame);
  new MutationObserver(syncAuthState).observe(signedInEl,{attributes:true,attributeFilter:['hidden']});
  if(statusEl)new MutationObserver(dismissWhenReady).observe(statusEl,{attributes:true,childList:true,subtree:true});
  new MutationObserver(dismissWhenReady).observe(gameFrame,{attributes:true,attributeFilter:['hidden']});
  addEventListener('resize',resizeCanvas,{passive:true});
  addEventListener('orientationchange',()=>setTimeout(resizeCanvas,100),{passive:true});
  syncAuthState();
})();