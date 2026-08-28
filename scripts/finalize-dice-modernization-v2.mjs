import fs from 'node:fs';

const htmlPath = 'random-dice-game-33.html';
const catalogPath = 'dicefile.json';
let html = fs.readFileSync(htmlPath, 'utf8');

function findFunctionEnd(src, start) {
  const brace = src.indexOf('{', start);
  if (brace < 0) throw new Error('Function opening brace not found');
  let depth = 0, quote = null, esc = false, lineComment = false, blockComment = false;
  for (let i = brace; i < src.length; i++) {
    const ch = src[i], nx = src[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nx === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && nx === '/') { lineComment = true; i++; continue; }
    if (ch === '/' && nx === '*') { blockComment = true; i++; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return i + 1; }
  }
  throw new Error('Function closing brace not found');
}

function replaceFunction(name, replacement) {
  const sig = `function ${name}(`;
  const start = html.lastIndexOf(sig);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const end = findFunctionEnd(html, start);
  html = html.slice(0, start) + replacement.trim() + html.slice(end);
}

function replaceOnce(oldText, newText, label) {
  const first = html.indexOf(oldText);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (html.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`Ambiguous ${label}`);
  html = html.slice(0, first) + newText + html.slice(first + oldText.length);
}

if (process.argv.includes('--verify')) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const must = [
    'DICE_MODERNIZATION_FINAL_AUDIT_V2',
    'function canonBaseIntervalFor(',
    "k==='canonIronBall'",
    'function canonDisplayNameFor(',
    'Skyhorn – ',
    'primerDelay:.4',
    'function canonMergeKey(',
    'maskPending',
    'openingAct',
    'result.authenticOrigin=mimics.length===0',
    'e===target&&!e.isBoss',
    'function canonUpdateMaceSwings(',
    'pvpLockdownDeferred'
  ];
  for (const token of must) if (!html.includes(token)) throw new Error(`Final audit marker missing: ${token}`);
  if (catalog.dice?.arrow) throw new Error('Legacy arrow key still present');
  if (catalog.dice?.skyhorn?.name !== 'Skyhorn') throw new Error('Skyhorn catalog entry missing');
  if (catalog.dice?.iron?.special?.c3Cooldown !== 6.2 || catalog.dice?.iron?.special?.c6Cooldown !== 5.9) throw new Error('Iron Ball TBD values drifted');
  if (catalog.dice?.nuclear?.special?.criticalMassBase !== 72) throw new Error('Nuclear raw value drifted');
  if (!catalog.dice?.padlock?.special?.pvpLockdownDeferred) throw new Error('Padlock PvP earmark missing');
  console.log('Final dice modernization audit markers verified.');
  process.exit(0);
}

if (html.includes('DICE_MODERNIZATION_FINAL_AUDIT_V2')) throw new Error('Final audit v2 already applied');
html = html.replace('/* ============================ DICE MODERNIZATION MASTER CANON 2026-08-28 ============================', '/* DICE_MODERNIZATION_FINAL_AUDIT_V2 — final gameplay audit corrections; Padlock PvP Lockdown intentionally deferred until PvP tray authority exists. */\n  /* ============================ DICE MODERNIZATION MASTER CANON 2026-08-28 ============================');

const helperAnchor = '  function canonC(die){';
const helperAt = html.lastIndexOf(helperAnchor);
if (helperAt < 0) throw new Error('Canonical helper anchor missing');
const helpers = `  function canonDisplayNameFor(key,die){
    const d=DICE[key];if(!d)return key;if(key!=='skyhorn'||!die)return d.name;
    const els=[];(die.enchants||[]).forEach(j=>{const info=j&&JEWEL_DEFS[j.jewelId];if(info&&info.isElemental&&!els.includes(info.element))els.push(info.element);});
    return els.length===1?'Skyhorn – '+(ELEMENT_LABELS[els[0]]||els[0]):'Skyhorn';
  }
  function canonBaseIntervalFor(die,d){
    const c=canonClassForEffective(die),k=d&&d.special&&d.special.kind;
    if(k==='canonIronBall')return c>=6?5.9:c>=3?6.2:6.5;
    if(k==='canonCrack')return c>=6?.95:c>=3?1:1.1;
    if(k==='canonBloomblade')return c>=2?1.28:1.35;
    if(k==='canonUndinesSong')return c>=2?5.7:6;
    if(k==='canonGraceSpider')return c>=2?2.05:2.2;
    if(k==='canonRelentlessMace')return c>=7?3.8:c>=5?4:c>=3?4.4:4.8;
    if(k==='canonGoldenLion')return c>=7?3:c>=5?3.2:c>=3?3.4:3.6;
    if(k==='canonAce')return c>=7?2.35:c>=5?2.5:c>=3?2.65:2.8;
    if(k==='canonBasesLoaded')return c>=7?2.45:c>=6?2.55:c>=5?2.65:c>=2?2.8:2.9;
    return d.atk;
  }
  function canonMimicOutMult(die){return 1+(die&&die.buffs?die.buffs.filter(b=>b.type==='canonOut').reduce((m,b)=>Math.max(m,b.amount||0),0):0);}
  function canonOpeningOutputMult(die){return die&&die.canon&&die.canon.openingActionActive?1.10:1;}
  function canonBeginCopiedAction(die){if(die&&die.canon&&die.canon.mask&&die.canon.mask.openingAct){die.canon.mask.openingAct=false;die.canon.openingActionActive=true;return true;}return false;}
  function canonEndCopiedAction(die){if(die&&die.canon)die.canon.openingActionActive=false;}
  function canonTakeOpeningOutputMult(die){if(die&&die.canon&&die.canon.mask&&die.canon.mask.openingAct){die.canon.mask.openingAct=false;return 1.10;}return 1;}
  function canonKnockbackEnemy(e,amount){const scale=e.isBoss?.5:1;if(e.isZombie)e.approach=Math.max(0,e.approach-(amount*scale/260));else e.dist=Math.max(0,e.dist-amount*scale);}
`;
html = html.slice(0, helperAt) + helpers + html.slice(helperAt);

replaceFunction('effAtk', `function effAtk(die){const d=DICE[die.key];let atk=canonBaseIntervalFor(die,d);if(d.special&&d.special.classCooldownSteps){const cls=canonClassForEffective(die);d.special.classCooldownSteps.forEach(step=>{if(cls>=step.atClass)atk*=step.mult;});}const cdr=dieJewelBonus(die,'cooldown');if(cdr>0)atk*=Math.max(.35,1-cdr);return(atk/die.dot)/Math.max(.15,1+totalASBuff(die)+canonRadianceSpeedFor(die));}`);
replaceFunction('canonPowerScale', `function canonPowerScale(die,base){return base*(1+(die.pu||0)*.16)*classMultFromLevel(canonClassForEffective(die))*(1+dieJewelBonus(die,'power'))*canonMimicOutMult(die)*canonOpeningOutputMult(die);}`);
replaceFunction('canonRefreshRadiance', `function canonRefreshRadiance(idx,die,dt){die.canon=die.canon||{};const active=canonRadianceSourceFor(idx);if(active){die.canon.radiance={value:active.value,purity:active.params.purity,t:active.params.after*canonPotency(active.source),active:true};}else if(die.canon.radiance){die.canon.radiance.active=false;die.canon.radiance.t=Math.max(0,(die.canon.radiance.t||0)-dt);if(die.canon.radiance.t<=0)die.canon.radiance=null;}}`);

replaceFunction('canonFireSkyPower', `function canonFireSkyPower(die){const t=canonFront();if(!t)return false;const q=canonSkyParams(die),aff=canonSkyAff(die,true),c=canonC(die);if(c>=7){const primer=canonRollDamage(die,q.rapid*q.powerMult*.5,0,false);damageEnemy(t,primer.amount,'physical',aff,{primer:true});const id=canonEnemyId(t);state.canonDelayed=state.canonDelayed||[];state.canonDelayed.push({t:.4,primerDelay:.4,fn:()=>{const committed=canonEnemyById(id);if(!committed)return;currentAttackerDieKey=die.key;canonFireSimple(die,committed,q.rapid*q.powerMult,'physical',aff);fx('arrowBurst',enemyRenderPos(committed));}});return true;}canonFireSimple(die,t,q.rapid*q.powerMult,'physical',aff);fx('arrowBurst',enemyRenderPos(t));return true;}`);
replaceFunction('canonTickSkyhorn', `function canonTickSkyhorn(idx,die,dt){const q=canonSkyParams(die),s=die.canon.sky||(die.canon.sky={shot:0,rapidT:0,delay:0,cool:0});if(s.cool>0){s.cool-=dt;return true;}if(s.delay>0){s.delay-=dt;if(s.delay<=0){canonFireSkyPower(die);s.shot=0;s.cool=q.post+(canonC(die)>=7?.4:0);}return true;}s.rapidT+=dt;if(s.rapidT>=canonAttackInterval(die,q.rapidInt)){s.rapidT-=canonAttackInterval(die,q.rapidInt);canonFireSkyRapid(die,s);s.shot++;if(s.shot>=4){s.delay=q.powerDelay;}}return true;}`);

replaceFunction('canonBloomAdd', `function canonBloomAdd(target,die,amount,allowFull=true){const cs=canonState(target),b=cs.bloom||(cs.bloom={count:0,t:0});b.count+=amount;b.t=5;if(canonC(die)>=3)b.razorSource=die;if(allowFull&&b.count>=9){b.count-=9;canonFullBloom(target,die);return true;}return false;}`);
replaceFunction('canonFullBloom', `function canonFullBloom(target,die){const c=canonC(die),p=canonP(die);if(c>=7)canonNearby(target,34).forEach(e=>damageEnemy(e,canonPowerScale(die,6*.58*.35),'special',{nature:1}));const n=c>=7?8:c>=5?7:6,slash=c>=5?.58:.55;let crits=0;for(let i=0;i<n&&target.alive;i++){const r=canonRollDamage(die,6*slash,.30,true,.95);if(r.crit)crits++;damageEnemy(target,r.amount,'special',{nature:1});}if(target.alive&&crits>0){let fin=.60+(c>=6?.18:.15)*crits;if(p>=7)fin*=1.10;damageEnemy(target,canonPowerScale(die,6*fin),'special',{nature:1});}if(target.alive&&c>=7){const b=canonState(target).bloom||(canonState(target).bloom={count:0,t:5});b.count=Math.max(b.count||0,2);b.t=5;b.razorSource=die;}if(c>=4)canonNearby(target,34).forEach(e=>canonBloomAdd(e,die,2,true));}`);
replaceFunction('canonFireBloom', `function canonFireBloom(die,target){if(die.canon.bloomFix){const f=canonEnemyById(die.canon.bloomFix);if(f)target=f;else die.canon.bloomFix=null;}const r=canonRollDamage(die,6,.30,true,.95);damageEnemy(target,r.amount,'special',{nature:1});let add=3,p=canonP(die);die.canon.bloomCasts=(die.canon.bloomCasts||0)+1;if(p>=7)add=4;else if(p>=5&&die.canon.bloomCasts%2===0)add++;else if(p>=3&&die.canon.bloomCasts%3===0)add++;const full=canonBloomAdd(target,die,add,true);die.canon.bloomFix=!full&&target.alive?canonEnemyId(target):null;}`);
replaceFunction('canonUpdateBloomRazor', `function canonUpdateBloomRazor(dt){aliveEnemies().forEach(e=>{const b=e.canon&&e.canon.bloom;if(!b||b.count<3||!b.razorSource||canonClassForEffective(b.razorSource)<3)return;b.razorT=(b.razorT||0)+dt;if(b.razorT>=.75){b.razorT-=.75;currentAttackerDieKey=b.razorSource.key;damageEnemy(e,1,'special',{nature:1},{persistent:true});}});}`);

replaceFunction('canonFireRelentless', `function canonFireRelentless(die,target){const c=canonC(die),q=canonRelentlessParams(die),was=!!target.confusion,base=24*(c>=2?1.06:1);const center=enemyRenderPos(target);const hits=[target,...canonNearby(target,q.radius)];hits.forEach(e=>{let amount=base;if(c>=4&&e!==target)amount*=.25;canonFireSimple(die,e,amount,'physical',{});canonKnockbackEnemy(e,6);canonApplyStun(e,.3);canonApplyConfusion(e,q.conf*canonPotency(die));});if(c>=6&&was&&target.alive)damageEnemy(target,canonPowerScale(die,base*.20),'physical',{});if(hits.length)die.canon.maceGauge=Math.min(1,(die.canon.maceGauge||0)+q.gauge);die.canon.maceBusyT=1.7;fx('heavy',center);}`);
replaceFunction('canonRelentlessSwing', `function canonRelentlessSwing(die){const c=canonC(die),p=canonP(die),idx=state.board.indexOf(die);if(idx<0)return;const origin=dieTileLaunchPos(idx),target=canonFront();if(!target)return;const tp=enemyRenderPos(target),dx=tp.x-origin.x,dy=tp.y-origin.y,len=Math.max(1,Math.hypot(dx,dy)),spin=c>=7?.65:c>=3?.75:.8,travelDur=1.2,travel=(Math.max(120,len+90))*(c>=5?1.15:1)*(p>=7?1.10:1),width=28*(1+(c>=5?.08:0)+(c>=7?.07:0)+(p>=5?.07:0));state.canonMaceSwings=state.canonMaceSwings||[];state.canonMaceSwings.push({die,c,p,t:0,spin,travelDur,x:origin.x,y:origin.y,vx:dx/len*travel/travelDur,vy:dy/len*travel/travelDur,width,hits:new Map()});die.canon.maceGauge=p>=7?.15:0;die.canon.maceSwingActive=true;}`);
const maceUpdate = `function canonUpdateMaceSwings(dt){for(let i=(state.canonMaceSwings||[]).length-1;i>=0;i--){const s=state.canonMaceSwings[i];s.t+=dt;if(s.t<s.spin)continue;const activeT=s.t-s.spin;if(activeT>s.travelDur){s.die.canon.maceSwingActive=false;state.canonMaceSwings.splice(i,1);continue;}s.x+=s.vx*dt;s.y+=s.vy*dt;for(const e of aliveEnemies()){const ep=enemyRenderPos(e);if(Math.hypot(ep.x-s.x,ep.y-s.y)>s.width/2)continue;let rec=s.hits.get(e);if(!rec){const confused=!!e.confusion,first=confused?(s.c>=7?1.40:s.c>=4?1.35:1.30):1;damageEnemy(e,canonPowerScale(s.die,24*first*(s.c>=2?1.04:1)),'physical',{});rec={hits:1,confused,firstT:s.t};s.hits.set(e,rec);if(!e.isBoss)startLift(e,'airborne',{rise:.18,hold:.15,fall:.35,height:26,juggleable:true});continue;}if(rec.hits!==1)continue;const naturalFall=!e.isBoss&&e.lift&&e.lift.phase==='fall',bossFallback=e.isBoss&&(s.t-rec.firstT)>=.45;if(!naturalFall&&!bossFallback)continue;const second=rec.confused?(s.c>=7?1.25:s.c>=4?1.18:1.15):1;damageEnemy(e,canonPowerScale(s.die,24*second*(s.p>=5?1.05:1)),'physical',{});rec.hits=2;if(!e.isBoss)startLift(e,'airborne',{rise:.16,hold:.12,fall:.32,height:s.c>=6?30:26,juggleable:true,onLand:(en)=>{if(s.c>=7&&en.alive)canonApplyStun(en,.4);}});else if(s.c>=7)canonApplyStun(e,.4);}}}}`;
const worldSig = 'function updateCanonWorld(dt)';
const worldAt = html.lastIndexOf(worldSig);
if (worldAt < 0) throw new Error('updateCanonWorld missing');
html = html.slice(0, worldAt) + maceUpdate + '\n  ' + html.slice(worldAt);
replaceFunction('updateCanonWorld', `function updateCanonWorld(dt){canonUpdateBeams(dt);canonUpdateSongFields(dt);canonUpdateRain(dt);canonUpdateWeather(dt);canonUpdateBloomRazor(dt);canonUpdateWebBlocks(dt);canonUpdateMaceSwings(dt);for(let i=(state.canonDelayed||[]).length-1;i>=0;i--){const x=state.canonDelayed[i];x.t-=dt;if(x.t<=0){state.canonDelayed.splice(i,1);try{x.fn();}catch(err){console.error('canonical delayed effect',err);}}}}`);

replaceFunction('canonNuclearMerge', `function canonNuclearMerge(die){const target=canonFront();if(!target)return;const c=canonC(die),p=canonP(die),pos=enemyRenderPos(target),sp=DICE.nuclear.special,raw=sp.criticalMassBase*(c>=7?1.18:c>=5?1.12:c>=3?1.06:1)*(p>=7?1.28:p>=6?1.21:p>=5?1.16:p>=4?1.11:p>=3?1.07:p>=2?1.03:1),rad=(p>=7?1.07:p>=5?1.04:p>=3?1.02:1)*(c>=6?1.13:c>=5?1.10:c>=3?1.05:1),r0=sp.groundZeroRadius*rad,r1=sp.blastRadius*rad,r2=sp.shockRadius*rad,aff={fire:.75,arcane:.25};aliveEnemies().forEach(e=>{const ep=enemyRenderPos(e),dist=Math.hypot(ep.x-pos.x,ep.y-pos.y),prePct=e.hp/e.maxHp;if(dist>r2)return;if(e===target&&e.isTyphoon){const pct=c>=7?.35:c>=6?.33:c>=5?.31:c>=4?.27:c>=3?.22:c>=2?.18:.125;damageEnemy(e,e.maxHp*pct,'special',{},{});return;}let mult=dist<=r0?1:dist<=r1?(c>=7?.95:c>=4?.85:.75):(c>=7?.30:c>=4?.10:0);if(mult>0){const rr=canonRollDamage(die,raw*mult);damageEnemy(e,rr.amount,'special',aff);}if(e===target&&!e.isBoss&&((c>=4)||prePct<1)){e.hp=-1;killEnemy(e);return;}if(c>=7&&dist>r0&&dist<=r1&&!e.isBoss&&prePct<.75){e.hp=-1;killEnemy(e);return;}if(dist>r0&&dist<=r1&&c>=2)applyBurn(e,canonPowerScale(die,3),1.8);if(dist>r1){canonKnockbackEnemy(e,c>=7?36:c>=4?30:24);const poisonChance=c>=7?.30:c>=4?.30:c>=2?.20:0;if(poisonChance&&Math.random()<Math.min(.95,poisonChance+canonInsight(die)))applyPoisonTicks(e,canonPowerScale(die,2),c>=4?3.4:3);if(c>=7&&Math.random()<.30)applyBurn(e,canonPowerScale(die,3),1.8);applyArmorBreak(e,.20,c>=4?3.4:3);}if(c>=6&&e.alive)canonApplyStun(e,c>=7?1.8:1.2);});fx('nova',pos);}`);

replaceFunction('canonApplyMimicRewards', `function canonApplyMimicRewards(result,mimic){const c=canonClassForEffective(mimic),p=canonP(mimic);result.buffs=(result.buffs||[]).filter(b=>b.source!=='mimic');state.sp+=c>=7?12:c>=5?10:c>=2?7:5;if(p>=5)state.sp+=2;if(c>=3){const dur=(c>=7?6:c>=5?5:4)+(p>=3?.5:0);result.buffs.push({type:'as',source:'mimic',amount:c>=7?.15:.10,t:dur});if(c>=4)result.buffs.push({type:'canonOut',source:'mimic',amount:c>=7?.12:.08,t:dur});if(c>=6)result.buffs.push({type:'canonDR',source:'mimic',amount:.20,t:c>=7?3:2});}if(p>=7)result.sinceLastShot=Math.max(result.sinceLastShot||0,effAtk(result)*.25);}`);
replaceFunction('canonMaskJoker', `function canonMaskJoker(joker,source){if(!joker||!source||source.key==='joker')return false;const jc=canonC(joker),sc=canonC(source),c=Math.min(jc,sc),p=canonP(joker),dur=(jc>=7?15:jc>=6?14:jc>=4?13.5:jc>=2?12.5:12)+(p>=3?.5:0),start=(jc>=7?.35:jc>=5?.25:jc>=3?.15:0)+(p>=7?.10:0);let transform=jc>=7?.20:jc>=5?.25:jc>=2?.30:.35;if(p>=5)transform-=.05;transform=Math.max(.15,transform);joker.canon.mask=null;joker.canon.maskPending={key:source.key,cls:c,t:transform,dur,start,openingAct:jc>=7};joker.canon.openingActionActive=false;joker.canon.laserGauge=0;joker.canon.ore=0;joker.canon.growthT=0;joker.canon.absorbFix=null;return true;}`);
const finishMask = `function canonFinishJokerMask(joker){const p=joker.canon&&joker.canon.maskPending;if(!p)return;const save=joker.key,saveOverride=joker._canonClassOverride;joker.key=p.key;joker._canonClassOverride=p.cls;const interval=effAtk(joker);joker.key=save;joker._canonClassOverride=saveOverride;joker.canon.mask={key:p.key,cls:p.cls,t:p.dur,total:p.dur,openingAct:p.openingAct};joker.canon.maskPending=null;joker.sinceLastShot=interval*p.start;triggerTilePulse(state.board.indexOf(joker),'pulse-rainbow',.5);}`;
const maskedAt = html.lastIndexOf('function canonMaskedTick(');
if (maskedAt < 0) throw new Error('canonMaskedTick missing');
html = html.slice(0, maskedAt) + finishMask + '\n  ' + html.slice(maskedAt);
replaceFunction('canonMaskedTick', `function canonMaskedTick(idx,die,dt){const m=die.canon.mask;if(!m)return false;m.t-=dt;if(m.t<=0){die.canon.mask=null;const c=canonC(die);if(c>=6)die.buffs.push({type:'as',amount:.10,t:2});return false;}const copied=DICE[m.key];if(!copied)return true;const save=die.key,saveOverride=die._canonClassOverride;die.key=m.key;die._canonClassOverride=m.cls;if(copied.special&&['canonLight','canonMine','canonGrowth','canonSnowfall','canonSkyhorn','canonLaser'].includes(copied.special.kind)){const handled=canonTickTile(idx,die,copied,dt,true);die.key=save;die._canonClassOverride=saveOverride;return handled;}if(copied.target==='none'){die.sinceLastShot+=dt;if(die.sinceLastShot>=effAtk(die)){die.sinceLastShot=0;if(copied.special&&copied.special.kind==='buffAS')applyNeighborBuff(idx,copied.special);else if(copied.special&&copied.special.kind==='spGen'){const mult=canonTakeOpeningOutputMult(die);state.sp+=(copied.special.amount*die.dot*.4+copied.special.amount*.6)*mult;}}die.key=save;die._canonClassOverride=saveOverride;return true;}die.sinceLastShot+=dt;if(die.sinceLastShot>=effAtk(die)){die.sinceLastShot=0;die.attackCount=(die.attackCount||0)+1;const opened=canonBeginCopiedAction(die);fireDie(idx,die);if(opened)canonEndCopiedAction(die);}die.key=save;die._canonClassOverride=saveOverride;currentAttackerDieKey=save;return true;}`);
replaceFunction('canonTickTile', `function canonTickTile(idx,die,d,dt,fromMask=false){if(!fromMask&&die.canon&&die.canon.maskPending){die.canon.maskPending.t-=dt;if(die.canon.maskPending.t<=0)canonFinishJokerMask(die);return true;}if(!fromMask&&die.canon&&die.canon.mask)return canonMaskedTick(idx,die,dt);const k=d.special&&d.special.kind;if(k==='canonLight'){canonLightPulse(idx,die,dt);return true;}if(k==='canonMine'){canonTickMine(idx,die,dt);return true;}if(k==='canonGrowth')return canonTickGrowth(idx,die,dt);if(k==='canonSnowfall')return canonTickSnowfall(idx,die,dt);if(k==='canonSkyhorn')return canonTickSkyhorn(idx,die,dt);if(k==='canonLaser'){die.sinceLastShot+=dt;if(die.sinceLastShot>=canonAttackInterval(die,canonC(die)>=7?.60:canonC(die)>=3?.65:.70)){die.sinceLastShot=0;const t=canonFront();if(t){const opened=fromMask&&canonBeginCopiedAction(die);canonFireSimple(die,t,8,'special',{});if(opened)canonEndCopiedAction(die);const c=canonC(die),p=canonP(die),gain=(c>=7?.11:c>=5?.10:c>=2?.09:.08)*(p>=7?1.10:1);die.canon.laserGauge=Math.min(1,(die.canon.laserGauge||0)+gain);}}return true;}if(k==='canonRelentlessMace'){if(die.canon.maceBusyT>0)die.canon.maceBusyT=Math.max(0,die.canon.maceBusyT-dt);if(die.canon.maceSwingActive)return true;}return false;}`);

replaceFunction('canMerge', `function canMerge(a,b){if(!a||!b)return false;const ak=canonMergeKey(a),bk=canonMergeKey(b);if(a.key==='joker'&&ak==='joker'&&b.key!=='joker')return true;if(a.dot!==b.dot||a.dot>=dotCap())return false;if(ak===bk)return true;return isUniversal(ak)||isUniversal(bk);}`);
const mergeKeyHelper = `function canonMergeKey(d){return d&&d.key==='joker'&&d.canon&&d.canon.mask&&d.canon.mask.key==='mimic'?'mimic':d&&d.key;}`;
const canAt = html.lastIndexOf('function canMerge(');
html = html.slice(0, canAt) + mergeKeyHelper + '\n  ' + html.slice(canAt);
replaceFunction('doMerge', `function doMerge(srcIdx,dstIdx){const a=state.board[srcIdx],b=state.board[dstIdx];if(!canMerge(a,b))return false;const aKey=canonMergeKey(a),bKey=canonMergeKey(b);if(a.key==='joker'&&aKey==='joker'&&b.key!=='joker')return canonMaskJoker(a,b);const mimics=[a,b].filter(x=>canonMergeKey(x)==='mimic'),sameNuke=aKey==='nuclear'&&bKey==='nuclear'&&a.authenticOrigin&&b.authenticOrigin,samePad=aKey==='padlock'&&bKey==='padlock'&&a.authenticOrigin&&b.authenticOrigin,newDot=Math.min(dotCap(),a.dot+1),newKey=randDeckKey();const result=makeDie(newKey);result.dot=newDot;result.authenticOrigin=mimics.length===0;state.board[dstIdx]=result;state.board[srcIdx]=null;if(sameNuke)canonNuclearMerge(a);if(samePad)canonApplyPadlockMerge(a);if(mimics.length){const best=mimics.slice().sort((x,y)=>canonClassForEffective(y)-canonClassForEffective(x)||canonP(y)-canonP(x))[0];canonApplyMimicRewards(result,best);}if(aKey==='skyhorn'||bKey==='skyhorn')result.canon.sky={shot:0,rapidT:0,delay:0,cool:0};if(mimics.length)triggerTilePulse(dstIdx,'pulse-rainbow',.5);if(newDot>=7)triggerTilePulse(dstIdx,'pulse-max',999);return true;}`);

replaceFunction('canonUpdateWeather', `function canonUpdateWeather(dt){const w=state.canonWeather;if(!w)return;w.t-=dt;if(w.phase==='blizzard'){w.tickT+=dt;if(w.tickT>=.5){w.tickT-=.5;aliveEnemies().forEach(e=>damageEnemy(e,canonPowerScale(w.source,w.dmg)*(w.outputMult||1),'special',{ice:1},{persistent:true}));}if(w.t<=0){if(w.terrain){w.phase=w.terrain;w.t=w.terrainDur;w.tickT=0;}else state.canonWeather=null;}}else if(w.t<=0)state.canonWeather=null;}`);
replaceFunction('canonTickSnowfall', `function canonTickSnowfall(idx,die,dt){die.canon.snowT=(die.canon.snowT||0)+dt;const best=state.board.map((d,i)=>d&&canonEffKey(d)==='blizzard'?{d,i}:null).filter(Boolean).sort((a,b)=>canonClassForEffective(b.d)-canonClassForEffective(a.d)||canonP(b.d)-canonP(a.d)||a.i-b.i)[0];if(!best||best.i!==idx)return true;let q=canonSnowParams(die),cycle=q.cycle;const cdr=dieJewelBonus(die,'cooldown');cycle=Math.max(4,cycle*(1-cdr));if(die.canon.snowT>=cycle){die.canon.snowT-=cycle;const outputMult=canonTakeOpeningOutputMult(die);state.canonWeather={phase:'blizzard',t:q.dur,source:die,tickT:0,dmg:q.dmg,outputMult,slowChance:q.slowChance,slowDur:q.slowDur,outgoingMult:q.outgoing,missChance:q.miss,terrain:q.terrain,terrainDur:q.terrainDur,slowRolled:new Set()};aliveEnemies().forEach(e=>{if(statusRoll(e,Math.min(.95,q.slowChance+canonInsight(die))))applySlow(e,.22,q.slowDur*canonPotency(die));});fx('shockwaveFull',{x:cw/2,y:ch/2});}return true;}`);
replaceFunction('canonTickMine', `function canonTickMine(idx,die,dt){die.canon.mineT=(die.canon.mineT||0)+dt;if(die.canon.mineT<canonMineInterval(die))return;die.canon.mineT-=canonMineInterval(die);const c=canonC(die),p=canonP(die),opening=canonTakeOpeningOutputMult(die),base=(6*p*.4+3.6)*(c>=5?1.08:1)*opening;let oreAdd=1,deposit=c>=7?.15:c>=4?.10:0;if(p>=5)deposit+=.03;if(deposit&&Math.random()<Math.min(.95,deposit+canonInsight(die)))oreAdd=2;die.canon.ore=(die.canon.ore||0)+oreAdd;state.sp+=base;while(die.canon.ore>=5){die.canon.ore-=5;let bonus=c>=7?.60:c>=5?.50:c>=3?.40:.25;if(p>=3)bonus+=.05;let b=base*bonus;let mother=c>=7?.25:c>=6?.20:0;if(p>=7)mother+=.05;if(mother&&Math.random()<Math.min(.95,mother+canonInsight(die))){b*=2;if(c>=7)die.canon.ore=Math.max(die.canon.ore,1);}state.sp+=b;}triggerTilePulse(idx,'pulse-gold',.5);}`);
replaceFunction('canonTickGrowth', `function canonTickGrowth(idx,die,dt){const c=canonC(die),p=canonP(die);die.sinceLastShot+=dt;if(die.sinceLastShot>=canonAttackInterval(die,2)){die.sinceLastShot=0;const t=canonFront();if(t){const opened=canonBeginCopiedAction(die);canonFireSimple(die,t,5,'special',{nature:1});if(opened)canonEndCopiedAction(die);}}let dur=c>=7?8.2:c>=5?8.8:c>=3?9.2:c>=2?9.6:10;dur-=p>=7?.6:p>=5?.4:p>=3?.2:0;dur*=1-dieJewelBonus(die,'cooldown');if(die.canon.fertile)dur*=1-die.canon.fertile;dur=Math.max(4.5,dur);die.canon.growthT=(die.canon.growthT||0)+dt;if(die.canon.growthT>=dur)canonGrowthMature(idx,die);return true;}`);

replaceFunction('canonFireUndine', `function canonFireUndine(idx,die,target){const c=canonC(die),p=canonP(die),out=canonOpeningOutputMult(die),heal=((c>=5?10:c>=3?9:8)+(p>=7?4:p>=5?2:p>=3?1:0))*out;canonNearestBoardIndices(idx,6).forEach(i=>healDie(i,heal));const pos=enemyRenderPos(target),fieldDur=c>=7?3:c>=6?2.75:2.25,sleep=(c>=7?.25:c>=3?.20:.15)+canonInsight(die),sleepDur=(c>=6?1.85:c>=3?1.65:1.5)+(p>=7?.5:p>=5?.25:p>=3?.1:0),radius=28*(c>=6?1.15:c>=3?1.10:1);state.canonSongFields=state.canonSongFields||[];state.canonSongFields.push({x:pos.x,y:pos.y,r:radius,t:fieldDur,die,outputMult:out,sleep,sleepDur,hit:new Set(),damage:c>=4?6:4});if(c>=4){const dur=c>=7?5:3,rain=state.canonRain||{};if(!rain.t||dur>=rain.t)state.canonRain={t:dur,healT:0,heal:c>=5?2.5:2,interval:1.75,source:die,outputMult:out,mistT:0};}fx('bubble',pos);}`);
replaceFunction('canonUpdateSongFields', `function canonUpdateSongFields(dt){for(let i=(state.canonSongFields||[]).length-1;i>=0;i--){const f=state.canonSongFields[i];f.t-=dt;for(const e of aliveEnemies()){const p=enemyRenderPos(e);if(Math.hypot(p.x-f.x,p.y-f.y)<=f.r&&!f.hit.has(e)){f.hit.add(e);damageEnemy(e,canonPowerScale(f.die,f.damage)*(f.outputMult||1),'special',{water:1});if(statusRoll(e,Math.min(.95,f.sleep)))canonApplySleep(e,(e.isBoss?.5:1)*f.sleepDur);}}if(f.t<=0)state.canonSongFields.splice(i,1);}}`);
replaceFunction('canonUpdateRain', `function canonUpdateRain(dt){const r=state.canonRain;if(!r)return;if(r.t>0){r.t-=dt;r.healT+=dt;if(r.healT>=r.interval){r.healT-=r.interval;state.board.forEach((d,i)=>{if(d)healDie(i,(r.heal+(canonP(r.source)>=7?1:0))*(r.outputMult||1));});}if(r.t<=0&&canonClassForEffective(r.source)>=7)r.mistT=1.75;}else if(r.mistT>0){r.mistT-=dt;}else state.canonRain=null;}`);

replaceOnce("    const collectionInst = (!battleMode && opts.collectionInstId) ? findInstance(key, opts.collectionInstId) : null;", "    const collectionInst = (!battleMode && opts.collectionInstId) ? findInstance(key, opts.collectionInstId) : null;\n    const displayName = canonDisplayNameFor(key, selectedTile || collectionInst || (battleMode ? getBattleInstance(key) : null));", 'die detail display source');
replaceOnce('      <h2>${d.name}</h2>', '      <h2>${displayName}</h2>', 'die detail heading');
replaceOnce("    document.getElementById('enchantDieName').textContent = d.name;", "    document.getElementById('enchantDieName').textContent = canonDisplayNameFor(enchantTarget.key, inst);", 'enchant display name');
replaceOnce("        slot.title = inst ? `${d.name} · Class ${inst.cls}${jewelCount?' · '+jewelCount+' jewel'+(jewelCount===1?'':'s'):''}` : d.name;", "        const slotName=canonDisplayNameFor(key,inst);\n        slot.title = inst ? `${slotName} · Class ${inst.cls}${jewelCount?' · '+jewelCount+' jewel'+(jewelCount===1?'':'s'):''}` : d.name;", 'deck slot title');
replaceOnce('        <div class="cname">${d.name}</div><div class="ccls">Class ${inst.cls}${item.jewelCount?\' · ◆\'+item.jewelCount:\'\'}</div>', '        <div class="cname">${canonDisplayNameFor(key,inst)}</div><div class="ccls">Class ${inst.cls}${item.jewelCount?\' · ◆\'+item.jewelCount:\'\'}</div>', 'collection dynamic name');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
catalog.catalogVersion = '2026-08-28-dice-modernization-master-final-v2';
const padlock = catalog.dice?.padlock;
if (!padlock?.special) throw new Error('Padlock catalog entry missing');
padlock.special.pvpLockdownDeferred = true;
padlock.special.pvpReturnWhen = 'PvP tray authority is implemented';
padlock.special.pvpCanonRetained = true;
fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
fs.writeFileSync(htmlPath, html);
console.log('Applied final dice modernization gameplay audit fixes.');
