/* ================= Classic Shop Trio V1 =================
   Knight Blade / Guardian Shield / Wizard Rod.
   Runs inside the transformed v33 closure so it can reuse canonical battle state,
   targeting, damage, rendering, and Class/Pip scaling without duplicating the game engine.
*/
const KNIGHT_BLADE_KEY = 'knightblade';
const GUARDIAN_SHIELD_KEY = 'guardianshield';
const WIZARD_ROD_KEY = 'wizardrod';

const knightBladeAsset = window.__TTD_GAME_ASSETS?.knightBlade;
const guardianShieldAsset = window.__TTD_GAME_ASSETS?.guardianShield;
const wizardRodAsset = window.__TTD_GAME_ASSETS?.wizardRod;
const knightBladeImage = new Image();
const guardianShieldImage = new Image();
const wizardRodImage = new Image();
if (knightBladeAsset?.path) knightBladeImage.src = window.__TTD_ASSET_URL(knightBladeAsset.path);
if (guardianShieldAsset?.path) guardianShieldImage.src = window.__TTD_ASSET_URL(guardianShieldAsset.path);
if (wizardRodAsset?.path) wizardRodImage.src = window.__TTD_ASSET_URL(wizardRodAsset.path);
const guardianShieldUrl = guardianShieldAsset?.path ? window.__TTD_ASSET_URL(guardianShieldAsset.path) : '';

const CLASSIC_ELEMENT_COLORS = Object.freeze({
  arcane:'#18245f', lightning:'#f2d84b', fire:'#f05a42', water:'#35a9ef', ice:'#86dff5',
  earth:'#ad7b48', metal:'#c0c8d8', wind:'#bde9cb', nature:'#72c45a', poison:'#8ed653',
  holy:'#fff0a8', shadow:'#7054c9',
});

const classicTrioStyle = document.createElement('style');
classicTrioStyle.id = 'ttdClassicTrioStyleV1';
classicTrioStyle.textContent = `
  .guardianVeil{position:absolute;inset:2px;border-radius:9px;z-index:7;pointer-events:none;overflow:hidden;
    border:1px solid rgba(125,211,255,.28);background:linear-gradient(115deg,rgba(80,170,255,.04),rgba(180,235,255,.18),rgba(80,170,255,.04));
    background-size:220% 100%;box-shadow:inset 0 0 12px rgba(100,190,255,.11),0 0 7px rgba(90,180,255,.08);animation:guardianVeilShimmer 1.05s linear infinite;}
  .guardianVeil::after{content:'';position:absolute;inset:-35%;background:radial-gradient(circle at 50% 50%,rgba(225,250,255,.12),transparent 55%);animation:guardianVeilPulse 1.4s ease-in-out infinite;}
  .guardianShieldManifest{position:absolute;left:50%;top:50%;width:46px;height:54px;object-fit:contain;z-index:9;pointer-events:none;
    transform:translate(-50%,-50%) scale(.9);opacity:.78;filter:drop-shadow(0 0 5px rgba(88,180,255,.82)) drop-shadow(0 0 11px rgba(74,120,255,.35));
    animation:guardianShieldManifest 1.05s ease-in-out infinite;}
  .tile.guardianGuarded{box-shadow:inset 0 0 0 1px rgba(110,205,255,.16),0 0 7px rgba(76,165,255,.08);}
  @keyframes guardianVeilShimmer{0%{background-position:180% 0}100%{background-position:-40% 0}}
  @keyframes guardianVeilPulse{0%,100%{opacity:.38;transform:scale(.94)}50%{opacity:.82;transform:scale(1.04)}}
  @keyframes guardianShieldManifest{0%,100%{opacity:.68;transform:translate(-50%,-50%) scale(.87)}50%{opacity:.88;transform:translate(-50%,-50%) scale(.94)}}
`;
document.head.appendChild(classicTrioStyle);

function classicClamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function classicLerp(a,b,t){ return a+(b-a)*t; }
function classicEaseOut(t){ t=classicClamp(t,0,1); return 1-(1-t)*(1-t); }
function classicEaseInOut(t){ t=classicClamp(t,0,1); return t*t*(3-2*t); }
function classicDist(a,b){ return Math.hypot((a.x||0)-(b.x||0),(a.y||0)-(b.y||0)); }
function classicBoardOrigin(idx){ const col=idx%5; return {x:cw*(0.30+col*0.10),y:ch*0.895}; }
function classicDrawAsset(img,x,y,w,h,rot,alpha=1){
  if(!img?.complete||!img.naturalWidth)return;
  ctx.save();ctx.globalAlpha*=classicClamp(alpha,0,1);ctx.translate(x,y);ctx.rotate(rot||0);ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
}
function classicClass(key){ return Math.max(1,Math.min(7,slottedClassOf(key))); }

/* ---------------- Knight Blade ---------------- */
function knightBladeTier(die){
  const cls=classicClass(KNIGHT_BLADE_KEY),dot=Math.max(1,Number(die?.dot||1));
  let radius=28;if(cls>=2)radius*=1.05;if(dot>=3)radius*=1.15;if(dot>=5)radius*=1.10;if(cls>=7)radius*=1.18;
  return {cls,primary:cls>=7?2.10:cls>=4?1.75:1.50,splash:cls>=7?0.80:cls>=4?0.65:cls>=2?0.60:0.50,
    doubleChance:cls>=5?0.30:cls>=3?0.20:0,execute:cls>=6,radius,compactCombo:dot>=7};
}
function ensureKnightState(die){if(!die._knightBlade)die._knightBlade={step:0};return die._knightBlade;}
function knightBladeStartAttack(idx,die){
  const target=pickTarget('front',aliveEnemies());if(!target)return false;
  const K=knightBladeTier(die),k=ensureKnightState(die),sequence=K.compactCombo?['slash','cleave']:['slash','slash','cleave'];
  const kind=sequence[k.step%sequence.length];k.step=(k.step+1)%sequence.length;
  const repeat=kind==='slash'&&K.doubleChance>0&&Math.random()<K.doubleChance;
  state.knightBladeFx ||= [];
  state.knightBladeFx.push({idx,die,target,kind,repeat,t:0,hit1:false,hit2:false,origin:classicBoardOrigin(idx),baseDmg:effDmg(die),
    primary:K.primary,splash:K.splash,radius:K.radius,execute:K.execute,royal:K.cls>=7});
  return true;
}
function knightBladeHit(fx){
  const target=fx.target;if(!target?.alive)return;currentAttackerDieKey=KNIGHT_BLADE_KEY;
  if(fx.kind==='slash'){damageEnemy(target,fx.baseDmg,'physical',null);return;}
  let primary=fx.baseDmg*fx.primary;if(fx.execute&&target.maxHp>0&&target.hp/target.maxHp<=0.30)primary*=1.20;
  damageEnemy(target,primary,'physical',null);
  const tp=enemyRenderPos(target);
  for(const e of aliveEnemies())if(e!==target&&classicDist(tp,enemyRenderPos(e))<=fx.radius){currentAttackerDieKey=KNIGHT_BLADE_KEY;damageEnemy(e,fx.baseDmg*fx.splash,'physical',null);}
  state.knightBladeArcs ||= [];state.knightBladeArcs.push({x:tp.x,y:tp.y,t:0,life:0.34,r:fx.radius,royal:fx.royal});
}
function updateKnightBladeFx(dt){
  const arr=state.knightBladeFx||[];
  for(let i=arr.length-1;i>=0;i--){const a=arr[i];a.t+=dt;
    if(a.kind==='slash'){
      if(!a.hit1&&a.t>=0.18){a.hit1=true;knightBladeHit(a);}
      if(a.repeat&&!a.hit2&&a.t>=0.34){a.hit2=true;knightBladeHit(a);}
      if(a.t>(a.repeat?0.52:0.37))arr.splice(i,1);
    }else{
      // The sword completes its backward windup at 0.25s, holds exactly 0.38s, then cleaves.
      if(!a.hit1&&a.t>=0.70){a.hit1=true;knightBladeHit(a);}if(a.t>0.92)arr.splice(i,1);
    }
  }
  const arcs=state.knightBladeArcs||[];for(let i=arcs.length-1;i>=0;i--){arcs[i].t+=dt;if(arcs[i].t>=arcs[i].life)arcs.splice(i,1);}
}
function drawKnightBladeFx(){
  for(const a of state.knightBladeFx||[]){
    const tp=a.target?.alive?enemyRenderPos(a.target):a._lastTarget;if(!tp)continue;a._lastTarget={x:tp.x,y:tp.y};
    const ox=a.origin.x,oy=a.origin.y,baseAng=Math.atan2(tp.y-oy,tp.x-ox);let x=tp.x,y=tp.y,rot=baseAng-Math.PI/2,alpha=1;
    if(a.kind==='slash'){
      if(a.t<0.12){const p=classicEaseOut(a.t/0.12);x=classicLerp(ox,tp.x,p);y=classicLerp(oy,tp.y,p);rot=baseAng-Math.PI/2-0.55*(1-p);alpha=p;}
      else if(a.t<0.27){const p=classicEaseInOut((a.t-0.12)/0.15);rot=baseAng-Math.PI/2+classicLerp(-0.95,0.85,p);}
      else if(a.repeat&&a.t<0.43){const p=classicEaseInOut((a.t-0.27)/0.16);rot=baseAng-Math.PI/2+classicLerp(0.75,-0.82,p);}
      else{const end=a.repeat?0.52:0.37;alpha=1-classicClamp((a.t-(end-0.10))/0.10,0,1);}
    }else{
      if(a.t<0.12){const p=classicEaseOut(a.t/0.12);x=classicLerp(ox,tp.x,p);y=classicLerp(oy,tp.y,p);rot=baseAng-Math.PI/2-0.25;alpha=p;}
      else if(a.t<0.25){const p=classicEaseInOut((a.t-0.12)/0.13);rot=baseAng-Math.PI/2+classicLerp(-0.25,-1.28,p);}
      else if(a.t<0.63){rot=baseAng-Math.PI/2-1.28;}
      else if(a.t<0.80){const p=classicEaseInOut((a.t-0.63)/0.17);rot=baseAng-Math.PI/2+classicLerp(-1.28,1.16,p);}
      else alpha=1-classicClamp((a.t-0.80)/0.12,0,1);
    }
    ctx.save();if(a.royal&&a.kind==='cleave'){ctx.shadowColor='rgba(255,215,95,.9)';ctx.shadowBlur=9;}classicDrawAsset(knightBladeImage,x,y,20,66,rot,alpha);ctx.restore();
  }
  for(const a of state.knightBladeArcs||[]){const p=a.t/a.life;ctx.save();ctx.globalAlpha=(1-p)*(a.royal?0.72:0.48);ctx.lineCap='round';ctx.strokeStyle=a.royal?'#ffe183':'#efc14c';ctx.lineWidth=a.royal?4.2:3;ctx.beginPath();ctx.arc(a.x,a.y,a.r*(0.45+0.55*p),-0.92,0.92);ctx.stroke();ctx.restore();}
}

/* ---------------- Guardian Shield ---------------- */
function guardianTier(die){
  const cls=classicClass(GUARDIAN_SHIELD_KEY),dot=Math.max(1,Number(die?.dot||1));let duration=cls>=7?3:cls>=6?2.9:cls>=3?2.7:2.4;
  if(dot>=3)duration+=0.15;if(dot>=7)duration+=0.15;
  let statusChanceDown=cls>=7?0.35:cls>=5?0.30:cls>=3?0.25:cls>=2?0.20:0.15;if(dot>=5)statusChanceDown+=0.05;
  let statusDurationDown=cls>=6?0.20:0;if(dot>=7)statusDurationDown+=0.05;
  const baseInterval=cls>=7?5.8:cls>=5?6:cls>=3?6.2:6.5,cdr=Math.max(0,Number(dieJewelBonus(die,'cooldown')||0));
  return {cls,duration,interval:baseInterval*Math.max(0.35,1-cdr),damageReduction:cls>=7?0.26:cls>=5?0.24:cls>=2?0.20:0.18,
    statusChanceDown:classicClamp(statusChanceDown,0,0.8),statusDurationDown:classicClamp(statusDurationDown,0,0.6)};
}
function ensureGuardianState(die){if(!die._guardianShield)die._guardianShield={cycleT:0,activeT:0,activationId:0};return die._guardianShield;}
function guardianCoverage(idx,cls){
  const row=Math.floor(idx/5),col=idx%5,out=new Set([idx]);if(col>0)out.add(idx-1);if(col<4)out.add(idx+1);if(row>0)out.add(idx-5);if(row<2)out.add(idx+5);
  if(cls>=4)for(const dr of[-1,1])for(const dc of[-1,1]){const r=row+dr,c=col+dc;if(r>=0&&r<3&&c>=0&&c<5)out.add(r*5+c);}
  if(cls>=7){if(col>1)out.add(idx-2);if(col<3)out.add(idx+2);}return out;
}
function tickGuardianShield(idx,die,dt,disabled){
  const G=guardianTier(die),g=ensureGuardianState(die);if(g.activeT>0)g.activeT=Math.max(0,g.activeT-dt);if(disabled)return;g.cycleT+=dt;
  if(g.cycleT>=G.interval){g.cycleT%=G.interval;g.activeT=G.duration;g.activationId+=1;triggerTilePulse(idx,'pulse-frost',0.52);}
}
function guardianProtectionFor(idx){
  let best=null;for(let i=0;i<state.board.length;i++){const die=state.board[i];if(!die||die.key!==GUARDIAN_SHIELD_KEY)continue;const g=ensureGuardianState(die);if(g.activeT<=0)continue;
    const G=guardianTier(die);if(!guardianCoverage(i,G.cls).has(idx))continue;if(!best)best={...G,sourceIdx:i};else{best.damageReduction=Math.max(best.damageReduction,G.damageReduction);best.statusChanceDown=Math.max(best.statusChanceDown,G.statusChanceDown);best.statusDurationDown=Math.max(best.statusDurationDown,G.statusDurationDown);}}
  return best;
}
function processGuardianStatus(idx,die){
  if(!die)return;const cur=Math.max(0,Number(die.disabledT||0)),prev=Math.max(0,Number(die._guardianObservedDisabled||0)),protection=guardianProtectionFor(idx),statusWindow=Number(die._guardianStatusWindowUntil||0)>=Number(state.time||0);
  if(cur>prev+0.035&&(protection||statusWindow)){const P=protection||die._guardianLastProtection;if(P){const delta=cur-prev;if(Math.random()<P.statusChanceDown){die.disabledT=prev;triggerTilePulse(idx,'pulse-frost',0.34);}else if(P.statusDurationDown>0)die.disabledT=prev+delta*(1-P.statusDurationDown);}}
}
function syncGuardianHud(){
  for(let i=0;i<tileEls.length;i++){const tile=tileEls[i];if(!tile)continue;tile.classList.remove('guardianGuarded');tile.querySelectorAll('.guardianVeil,.guardianShieldManifest').forEach(el=>el.remove());}
  for(let i=0;i<state.board.length;i++){const die=state.board[i];if(!die||die.key!==GUARDIAN_SHIELD_KEY)continue;const g=ensureGuardianState(die);if(g.activeT<=0)continue;const G=guardianTier(die);
    for(const idx of guardianCoverage(i,G.cls)){if(!state.board[idx])continue;const tile=tileEls[idx];if(!tile)continue;tile.classList.add('guardianGuarded');const veil=document.createElement('div');veil.className='guardianVeil';tile.appendChild(veil);}
    if(guardianShieldUrl&&tileEls[i]){const img=document.createElement('img');img.className='guardianShieldManifest';img.src=guardianShieldUrl;img.alt='';tileEls[i].appendChild(img);}}
}

/* ---------------- Wizard Rod ---------------- */
function wizardLearnedElements(cls){if(cls<=1)return['arcane'];if(cls===2)return['arcane','lightning','fire','water'];if(cls===3)return['arcane','lightning','fire','water','ice','earth','metal'];return['arcane','lightning','fire','water','ice','earth','metal','wind','nature','poison','holy','shadow'];}
function classicShuffleCopy(arr){const out=arr.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function wizardTier(die){const cls=classicClass(WIZARD_ROD_KEY),dot=Math.max(1,Number(die?.dot||1));return{cls,dot,elements:wizardLearnedElements(cls),siege:cls>=5,radius:30*(dot>=5?1.15:1),splash:dot>=7?0.55:0.45};}
function ensureWizardState(die){if(!die._wizardRod)die._wizardRod={castCount:0,bag:[],bagSignature:''};return die._wizardRod;}
function wizardNextElement(die,W){const w=ensureWizardState(die);if(W.dot<3)return W.elements[Math.floor(Math.random()*W.elements.length)];const sig=W.elements.join('|');if(w.bagSignature!==sig||!w.bag.length){w.bag=classicShuffleCopy(W.elements);w.bagSignature=sig;}return w.bag.pop();}
function wizardStartCast(idx,die){
  const W=wizardTier(die),w=ensureWizardState(die);if(!aliveEnemies().length)return false;w.castCount+=1;let count=1;if(W.cls>=7&&w.castCount%10===0)count=3;else if(W.cls>=6&&w.castCount%5===0)count=2;
  const spells=[];for(let i=0;i<count;i++){const current=aliveEnemies();if(!current.length)break;const target=pickTarget('random',current);if(!target)break;spells.push({element:wizardNextElement(die,W),target});}
  if(!spells.length)return false;state.wizardRodFx ||= [];state.wizardRodFx.push({idx,die,W,spells,t:0,fired:false,origin:{x:cw*.5,y:ch*.86}});return true;
}
function wizardOrbPoint(x,y,rot){const off=17,dir=rot-Math.PI/2;return{x:x+Math.cos(dir)*off,y:y+Math.sin(dir)*off};}
function wizardDamageAffinity(die,element){const live=effAffinities(die)||{};return{[element]:1+Math.max(0,Number(live[element]||0))};}
function wizardFireProjectiles(cast){
  if(cast.fired)return;cast.fired=true;state.wizardProjectiles ||= [];const firstTarget=cast.spells[0]?.target,tp=firstTarget?.alive?enemyRenderPos(firstTarget):{x:cw*.5,y:ch*.3};
  const aim=Math.atan2(tp.y-cast.origin.y,tp.x-cast.origin.x),rot=aim+Math.PI/2,start=wizardOrbPoint(cast.origin.x,cast.origin.y,rot),base=effDmg(cast.die);
  cast.spells.forEach((spell,i)=>{const targetPos=spell.target?.alive?enemyRenderPos(spell.target):tp,dist=classicDist(start,targetPos);state.wizardProjectiles.push({kind:cast.W.siege?'siege':'bolt',element:spell.element,target:spell.target,sourceDie:cast.die,x:start.x,y:start.y,px:start.x,py:start.y,t:-i*0.055,dur:cast.W.siege?classicClamp(dist/520,0.17,0.36):classicClamp(dist/690,0.12,0.28),baseDmg:base,radius:cast.W.radius,splash:cast.W.splash,done:false});});
}
function updateWizardFx(dt){
  const casts=state.wizardRodFx||[];for(let i=casts.length-1;i>=0;i--){const c=casts[i];c.t+=dt;const fireT=c.W.siege?0.68:0.50;if(!c.fired&&c.t>=fireT)wizardFireProjectiles(c);if(c.t>=fireT+0.18)casts.splice(i,1);}
  state.wizardSparks ||= [];const shots=state.wizardProjectiles||[];
  for(let i=shots.length-1;i>=0;i--){const p=shots[i];p.t+=dt;if(p.t<0)continue;const targetPos=p.target?.alive?enemyRenderPos(p.target):p._lastTarget;if(targetPos)p._lastTarget={x:targetPos.x,y:targetPos.y};const dest=p._lastTarget;if(!dest){shots.splice(i,1);continue;}
    const q=classicClamp(p.t/p.dur,0,1),e=classicEaseInOut(q);p.px=p.x;p.py=p.y;if(p.x0==null){p.x0=p.x;p.y0=p.y;}p.x=classicLerp(p.x0,dest.x,e);p.y=classicLerp(p.y0,dest.y,e);
    const color=CLASSIC_ELEMENT_COLORS[p.element]||'#7f8cff',sparkN=p.kind==='siege'?2:1;for(let n=0;n<sparkN;n++)state.wizardSparks.push({x:p.x+(Math.random()-.5)*5,y:p.y+(Math.random()-.5)*5,vx:(Math.random()-.5)*22,vy:(Math.random()-.5)*22,t:0,life:0.20+Math.random()*0.08,color});
    if(q>=1&&!p.done){p.done=true;if(p.target?.alive){currentAttackerDieKey=WIZARD_ROD_KEY;damageEnemy(p.target,p.baseDmg*(p.kind==='siege'?1.25:1),'special',wizardDamageAffinity(p.sourceDie,p.element));if(p.kind==='siege'){const hit=enemyRenderPos(p.target);for(const e2 of aliveEnemies())if(e2!==p.target&&classicDist(hit,enemyRenderPos(e2))<=p.radius){currentAttackerDieKey=WIZARD_ROD_KEY;damageEnemy(e2,p.baseDmg*p.splash,'special',wizardDamageAffinity(p.sourceDie,p.element));}state.wizardBursts ||= [];state.wizardBursts.push({x:hit.x,y:hit.y,t:0,life:0.38,r:p.radius,color});}}shots.splice(i,1);}
  }
  const sparks=state.wizardSparks||[];for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.t+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=0.90;s.vy*=0.90;if(s.t>=s.life)sparks.splice(i,1);}const bursts=state.wizardBursts||[];for(let i=bursts.length-1;i>=0;i--){bursts[i].t+=dt;if(bursts[i].t>=bursts[i].life)bursts.splice(i,1);}
}
function drawWizardRodFx(){
  for(const c of state.wizardRodFx||[]){const target=c.spells[0]?.target,tp=target?.alive?enemyRenderPos(target):{x:c.origin.x,y:c.origin.y-80},aim=Math.atan2(tp.y-c.origin.y,tp.x-c.origin.x),fireT=c.W.siege?0.68:0.50,fade=classicClamp(c.t/0.12,0,1)*(1-classicClamp((c.t-fireT)/0.18,0,1)),aimStart=c.W.siege?0.36:0.30,aimP=classicEaseInOut(classicClamp((c.t-aimStart)/(fireT-aimStart),0,1)),rot=classicLerp(0,aim+Math.PI/2,aimP);classicDrawAsset(wizardRodImage,c.origin.x,c.origin.y,34,70,rot,fade);const orb=wizardOrbPoint(c.origin.x,c.origin.y,rot),cycle=Math.max(0,Math.floor(c.t/0.08)),spell=c.spells[cycle%c.spells.length]||c.spells[0],color=CLASSIC_ELEMENT_COLORS[spell?.element]||CLASSIC_ELEMENT_COLORS.arcane;
    if(c.t<fireT){const charge=classicClamp((c.t-0.08)/(fireT-0.16),0,1);ctx.save();ctx.globalAlpha=fade*(0.32+0.55*charge);ctx.shadowColor=color;ctx.shadowBlur=10+8*charge;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(orb.x,orb.y,6+4*Math.sin((state.time||0)*13),0,Math.PI*2);ctx.stroke();for(let j=0;j<5;j++){const a=(state.time||0)*4.2+j*Math.PI*0.4,r=8+4*charge;ctx.fillStyle=color;ctx.beginPath();ctx.arc(orb.x+Math.cos(a)*r,orb.y+Math.sin(a)*r,1.2,0,Math.PI*2);ctx.fill();}ctx.restore();}}
}
function drawWizardProjectiles(){
  for(const s of state.wizardSparks||[]){const a=1-s.t/s.life;ctx.save();ctx.globalAlpha=a*.85;ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=5;ctx.beginPath();ctx.arc(s.x,s.y,1.1+1.2*a,0,Math.PI*2);ctx.fill();ctx.restore();}
  for(const p of state.wizardProjectiles||[]){if(p.t<0)continue;const color=CLASSIC_ELEMENT_COLORS[p.element]||'#7f8cff',a=Math.atan2(p.y-p.py,p.x-p.px);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.shadowColor=color;ctx.shadowBlur=p.kind==='siege'?16:10;ctx.globalAlpha=.95;
    if(p.kind==='bolt'){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,0,9,4.8,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.75;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(2,0,4.5,1.7,0,0,Math.PI*2);ctx.fill();}
    else{const wobble=Math.sin((state.time||0)*27+p.t*18)*2.2;ctx.fillStyle=color;ctx.globalAlpha=.72;ctx.beginPath();ctx.moveTo(-15,0);ctx.quadraticCurveTo(-7,-9-wobble,4,-7);ctx.quadraticCurveTo(16,-5,20,0);ctx.quadraticCurveTo(13,7,3,7+wobble);ctx.quadraticCurveTo(-8,9,-15,0);ctx.fill();for(let j=0;j<3;j++){const ex=-5+j*7,rr=2.2+1.2*Math.sin((state.time||0)*19+j);ctx.globalAlpha=.8;ctx.fillStyle=j===1?'#fff':color;ctx.beginPath();ctx.arc(ex,(j-1)*1.8,Math.abs(rr),0,Math.PI*2);ctx.fill();}}
    ctx.restore();}
  for(const b of state.wizardBursts||[]){const p=b.t/b.life;ctx.save();ctx.globalAlpha=(1-p)*.58;ctx.strokeStyle=b.color;ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=12;ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y,b.r*(0.28+0.72*p),0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){const a=i*Math.PI/2+(state.time||0)*2.1,r=b.r*(.15+.45*p);ctx.globalAlpha=(1-p)*.42;ctx.beginPath();ctx.arc(b.x+Math.cos(a)*r,b.y+Math.sin(a)*r,3.5*(1-p)+1,0,Math.PI*2);ctx.fill();}ctx.restore();}
}

/* ---------------- Core wrappers ---------------- */
const originalDieDamageClassicTrio=dieDamage;
dieDamage=function ttdGuardianReducedDamage(idx,amount,flavor){const P=guardianProtectionFor(idx);if(P&&state.board[idx]){const die=state.board[idx];die._guardianStatusWindowUntil=(state.time||0)+0.12;die._guardianLastProtection={statusChanceDown:P.statusChanceDown,statusDurationDown:P.statusDurationDown};amount*=1-P.damageReduction;}return originalDieDamageClassicTrio(idx,amount,flavor);};

const originalTickTileClassicTrio=tickTile;
tickTile=function ttdClassicTrioTickTile(idx,dt){
  const die=state.board[idx];if(!die)return originalTickTileClassicTrio(idx,dt);processGuardianStatus(idx,die);
  if(die.key!==KNIGHT_BLADE_KEY&&die.key!==GUARDIAN_SHIELD_KEY&&die.key!==WIZARD_ROD_KEY){const result=originalTickTileClassicTrio(idx,dt),after=state.board[idx];if(after)after._guardianObservedDisabled=Math.max(0,Number(after.disabledT||0));return result;}
  if(die.buffs)die.buffs=die.buffs.filter(b=>{b.t-=dt;return b.t>0;});let disabled=false;if(die.disabledT>0){die.disabledT=Math.max(0,die.disabledT-dt);disabled=true;}
  if(die.key===GUARDIAN_SHIELD_KEY)tickGuardianShield(idx,die,dt,disabled);else if(!disabled){die.sinceLastShot=(die.sinceLastShot||0)+dt;const interval=effAtk(die);if(die.sinceLastShot>=interval){die.sinceLastShot=Math.max(0,die.sinceLastShot-interval);die.attackCount=(die.attackCount||0)+1;if(die.key===KNIGHT_BLADE_KEY)knightBladeStartAttack(idx,die);else wizardStartCast(idx,die);}}
  die._guardianObservedDisabled=Math.max(0,Number(die.disabledT||0));
};
const originalUpdatePlayerShotsClassicTrio=updatePlayerShots;
updatePlayerShots=function ttdClassicTrioUpdatePlayerShots(dt){originalUpdatePlayerShotsClassicTrio(dt);updateKnightBladeFx(dt);updateWizardFx(dt);};
const originalDrawLaneClassicTrio=drawLane;
drawLane=function ttdClassicTrioDrawLane(dt){originalDrawLaneClassicTrio(dt);drawKnightBladeFx();drawWizardRodFx();drawWizardProjectiles();};
const originalRenderBoardClassicTrio=renderBoard;
renderBoard=function ttdClassicTrioRenderBoard(){originalRenderBoardClassicTrio();syncGuardianHud();};
