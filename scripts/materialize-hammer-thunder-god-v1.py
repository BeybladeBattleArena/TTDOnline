from pathlib import Path
import json

ROOT=Path('.')
CATALOG=ROOT/'overdrivefile.json'
MIRROR=ROOT/'functions/overdrivefile.generated.json'
ABIL=ROOT/'online/overdrive-abilities-v1.js'
GIFT=ROOT/'functions/gift-v7-secure.js'
CHECK=ROOT/'scripts/check-overdrive-v1.mjs'

def require_once(text, needle, label):
    n=text.count(needle)
    if n!=1: raise SystemExit(f'{label}: expected exactly one marker, found {n}: {needle[:120]}')

catalog=json.loads(CATALOG.read_text())
if 'hammerthundergod' in catalog.get('dice',{}): raise SystemExit('Hammer of Thunder God already exists.')
catalog['dice']['hammerthundergod']={
  'name':'Hammer of Thunder God',
  'element':'Lightning',
  'dpCost':18,
  'glyph':{'path':'M5 5 H18 V10 H5 Z M10 10 H13 V21 H10 Z M3 6 H5 V9 H3 Z M18 6 H21 V9 H18 Z'},
  'flavor':'First the sky warns you. Then the hammer answers.',
  'description':'Choose an impact point, darken the battlefield, and call a metal war hammer down inside a concentrated white-blue lightning strike. The mixed Lightning/Metal impact leaves the charged hammer behind, which discharges a larger field 1.1 seconds later and inflicts Electrocution.',
  'acquisition':{'kind':'test-code','testCode':'TTD-HAMMER-THUNDER','rollout':'playtest'},
  'special':{
    'kind':'hammerThunderGod',
    'placementSeconds':4,
    'defaultTarget':'battlefield-center',
    'tapToActivateEarly':True,
    'draggable':True,
    'stormDarkenAlpha':0.48,
    'firstSkyFlashDelaySeconds':0,
    'secondSkyFlashDelaySeconds':0.6,
    'strikeDelayAfterSecondFlashSeconds':0.4,
    'impactDelaySeconds':1.0,
    'boltDurationSeconds':0.16,
    'boltWidth':14,
    'damage':56,
    'damageTuning':'provisional-moderate-good',
    'damageCategory':'special',
    'affinities':{'lightning':0.5,'metal':0.5},
    'impactRadiusFractionOfBattleWidth':0.15,
    'impactRadiusMin':50,
    'impactRadiusMax':78,
    'skyClearSeconds':0.7,
    'hammerDischargeDelaySeconds':1.1,
    'dischargeRadiusMultiplier':1.1,
    'electrocutionSeconds':1.8,
    'hammerDissolveSeconds':0.45
  }
}
text=json.dumps(catalog,indent=2)+'\n'
CATALOG.write_text(text); MIRROR.write_text(text)

gift=GIFT.read_text()
gift_marker="  'TTD-BLACK-TAURUS': { label:'Black Taurus Overdrive Test Grant', reward:{ overdriveDice:[{ key:'blacktaurus' }] } },"
require_once(gift,gift_marker,'gift insertion')
gift=gift.replace(gift_marker,gift_marker+"\n  'TTD-HAMMER-THUNDER': { label:'Hammer of Thunder God Overdrive Test Grant', reward:{ overdriveDice:[{ key:'hammerthundergod' }] } },")
GIFT.write_text(gift)

abilities=ABIL.read_text()
marker="  let taurus = null;\n  let cauldron = null;"
require_once(abilities,marker,'runtime state')
abilities=abilities.replace(marker,"  let taurus = null;\n  let cauldron = null;\n  let thunderHammer = null;\n  const electrocuted = new Set();")

marker="""  function nearby(center, radius) {
    return alive().filter((e) => {
      const p = point(e); return Math.hypot(p.x - center.x, p.y - center.y) <= radius;
    });
  }
"""
require_once(abilities,marker,'Electrocution authority insertion')
electro=r'''  function isElectrocutionStatusActive(e) {
    return !!(e?.alive && e.__ttdElectrocution && Number(e.__ttdElectrocution.until || 0) > now());
  }
  function applyElectrocutionStatus(e, seconds, options = {}) {
    if (!e?.alive) return false;
    const requested = Math.max(0, Number(seconds || 0));
    const duration = options.exactDuration === false ? statusDuration(e, requested) : requested;
    if (duration <= 0) return false;
    const appliedAt = now(), prior = e.__ttdElectrocution;
    e.__ttdElectrocution = {
      appliedAt: prior?.appliedAt || appliedAt,
      until: Math.max(Number(prior?.until || 0), appliedAt + duration),
      source: options.source || prior?.source || 'electrocution',
    };
    electrocuted.add(e);
    e.pausedT = Math.max(Number(e.pausedT || 0), Math.min(0.14, duration));
    return true;
  }
  function clearElectrocutionStatus(e) {
    if (!e) return;
    delete e.__ttdElectrocution;
    electrocuted.delete(e);
  }
  function tickElectrocutionStatus() {
    const t = now();
    for (const e of [...electrocuted]) {
      if (!e?.alive || !e.__ttdElectrocution || Number(e.__ttdElectrocution.until || 0) <= t) { clearElectrocutionStatus(e); continue; }
      const left = Number(e.__ttdElectrocution.until) - t;
      e.pausedT = Math.max(Number(e.pausedT || 0), Math.min(0.12, left));
      if (Array.isArray(e.skills)) for (const skill of e.skills) if (skill && Number(skill.cd || 0) < 0.08) skill.cd = 0.08;
    }
  }
  function drawElectrocutionStatuses(ctx, t) {
    for (const e of [...electrocuted]) {
      if (!isElectrocutionStatusActive(e)) continue;
      const p = point(e), pulse = 0.65 + 0.35 * Math.sin(t * 28 + progress(e) * 11);
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = 0.72 + 0.22 * pulse;
      ctx.strokeStyle = '#8edcff'; ctx.lineWidth = 1.8;
      for (let k = 0; k < 3; k++) {
        const a = t * (7 + k) + k * 2.1, r = 10 + k * 4;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.55 - 3);
        for (let j = 1; j <= 4; j++) {
          const q = j / 4, aa = a + q * 1.25;
          ctx.lineTo(Math.cos(aa) * (r + (j % 2 ? 5 : -2)), Math.sin(aa) * r * 0.55 - 3 + q * 8);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#eefcff';
      for (let k = 0; k < 3; k++) { const a=t*9+k*2.4; ctx.beginPath(); ctx.arc(Math.cos(a)*(9+k*3), -7+Math.sin(a*1.3)*7, 1.2, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
  }
  window.applyElectrocutionStatus = applyElectrocutionStatus;
  window.isElectrocutionStatusActive = isElectrocutionStatusActive;
  window.clearElectrocutionStatus = clearElectrocutionStatus;

'''
abilities=abilities.replace(marker,marker+'\n'+electro)

marker="  function clearTargeting() {"
require_once(abilities,marker,'Hammer runtime insertion')
hammer=r'''  function makeHammerReticle(def) {
    const wrap=document.getElementById('laneWrap'); if(!wrap||targeting)return false;
    const cfg=def.special||{},node=document.createElement('div'); node.id='ttdHammerThunderGodTargetV1';
    Object.assign(node.style,{position:'absolute',left:'50%',top:'50%',width:'82px',height:'82px',transform:'translate(-50%,-50%)',border:'3px solid #8bd8ff',borderRadius:'50%',boxSizing:'border-box',zIndex:'80',pointerEvents:'auto',touchAction:'none',boxShadow:'0 0 0 2px rgba(20,48,94,.72),0 0 17px rgba(118,211,255,.72),inset 0 0 14px rgba(136,221,255,.2)',cursor:'grab'});
    const center=document.createElement('div'); center.style.cssText='position:absolute;left:50%;top:50%;width:18px;height:8px;transform:translate(-50%,-50%);background:#b9c7d1;border:2px solid #f1fbff;border-radius:2px;box-shadow:0 0 8px #76d8ff;pointer-events:none;';
    const countdown=document.createElement('div'); countdown.style.cssText="position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);font:900 18px 'Space Mono',monospace;color:#dff7ff;text-shadow:0 2px 4px #000,0 0 9px #59bfff;white-space:nowrap;"; node.append(center,countdown); wrap.appendChild(node);
    const start=now(),placement=Math.max(.25,Number(cfg.placementSeconds||4)); targeting={kind:'hammerthundergod',node,countdown,def,cfg,point:{x:Number(window.cw||300)*.5,y:Number(window.ch||200)*.5},start,armedAt:start+.15,deadline:start+placement,dragging:false,moved:false,downX:0,downY:0};
    const updateNode=(clientX,clientY)=>{if(!targeting||targeting.kind!=='hammerthundergod')return;const rect=wrap.getBoundingClientRect(),x=clamp(clientX-rect.left,10,rect.width-10),y=clamp(clientY-rect.top,10,rect.height-10);targeting.point=cssToGame(clientX,clientY);node.style.left=`${x}px`;node.style.top=`${y}px`;};
    node.addEventListener('pointerdown',event=>{if(!targeting)return;event.preventDefault();event.stopPropagation();targeting.dragging=true;targeting.moved=false;targeting.downX=event.clientX;targeting.downY=event.clientY;node.setPointerCapture?.(event.pointerId);node.style.cursor='grabbing';});
    node.addEventListener('pointermove',event=>{if(!targeting?.dragging)return;event.preventDefault();event.stopPropagation();if(Math.hypot(event.clientX-targeting.downX,event.clientY-targeting.downY)>5)targeting.moved=true;updateNode(event.clientX,event.clientY);});
    node.addEventListener('pointerup',event=>{if(!targeting)return;event.preventDefault();event.stopPropagation();const moved=targeting.moved;targeting.dragging=false;node.style.cursor='grab';node.releasePointerCapture?.(event.pointerId);if(!moved&&now()>=targeting.armedAt)commitHammerThunderGod();});
    return true;
  }
  function hammerSkyFlash(h, second=false) {
    const w=Number(window.cw||300),x=w*(second?0.68:0.31)+(Math.random()-.5)*w*.16,y=Number(window.ch||200)*(.08+Math.random()*.08);
    timedFx.push({kind:'hammerSkyFlash',x,y,start:now(),seconds:.16});
  }
  function commitHammerThunderGod() {
    if(!targeting||targeting.kind!=='hammerthundergod'||!battleActive()){clearTargeting();return;}
    const api=od(),def=targeting.def,p={...targeting.point}; if(!api?.spendDp?.(Number(def.dpCost||18))){toast('Hammer of Thunder God needs full Drive and enough DP.');clearTargeting();return;}
    api.resetDrive?.(); clearTargeting(); resolveHammerThunderGod(def,p);
  }
  function resolveHammerThunderGod(def,center) {
    const cfg=def.special||{},t=now(),impactDelay=Math.max(.01,Number(cfg.impactDelaySeconds||1)),impactAt=t+impactDelay,dischargeAt=impactAt+Math.max(.01,Number(cfg.hammerDischargeDelaySeconds||1.1));
    thunderHammer={def,center:{...center},start:t,flash2At:t+Number(cfg.secondSkyFlashDelaySeconds||.6),impactAt,dischargeAt,dissolveEnd:dischargeAt+Math.max(.1,Number(cfg.hammerDissolveSeconds||.45)),skyClearEnd:impactAt+Math.max(.1,Number(cfg.skyClearSeconds||.7)),flash2:false,impacted:false,discharged:false,impactRadius:0};
    hammerSkyFlash(thunderHammer,false); toast('Hammer of Thunder God!');
  }
  function hammerImpactRadius(h) {
    const cfg=h.def.special||{}; return clamp(Number(window.cw||300)*Number(cfg.impactRadiusFractionOfBattleWidth||.15),Number(cfg.impactRadiusMin||50),Number(cfg.impactRadiusMax||78));
  }
  function resolveHammerImpact(h) {
    if(!h||h.impacted)return; h.impacted=true; const cfg=h.def.special||{},r=hammerImpactRadius(h); h.impactRadius=r;
    timedFx.push({kind:'hammerThunderBolt',x:h.center.x,y:h.center.y,start:now(),seconds:Number(cfg.boltDurationSeconds||.16),width:Number(cfg.boltWidth||14)});
    timedFx.push({kind:'hammerCracks',x:h.center.x,y:h.center.y,start:now(),seconds:.72,radius:r});
    ring(h.center.x,h.center.y,r,'rgba(91,185,255,.85)',.52,4); ring(h.center.x,h.center.y,r*.68,'rgba(222,248,255,.9)',.34,2.4);
    for(let i=0;i<28;i++){const a=Math.random()*Math.PI*2,s=25+Math.random()*80;particles.push({x:h.center.x,y:h.center.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.42-18-Math.random()*30,life:.45+Math.random()*.4,max:.85,color:Math.random()<.45?'#9fcfff':'#8a7664',size:1.3+Math.random()*2.7,gravity:105});}
    for(const e of nearby(h.center,r)) damage(e,Number(cfg.damage||56),cfg.damageCategory||'special',cfg.affinities||{lightning:.5,metal:.5});
  }
  function resolveHammerDischarge(h) {
    if(!h||h.discharged)return; h.discharged=true; const cfg=h.def.special||{},r=(h.impactRadius||hammerImpactRadius(h))*Number(cfg.dischargeRadiusMultiplier||1.1);
    timedFx.push({kind:'hammerElectricField',x:h.center.x,y:h.center.y,start:now(),seconds:.46,radius:r}); ring(h.center.x,h.center.y,r,'rgba(105,206,255,.88)',.48,3.2);
    burst(h.center.x,h.center.y,'#a6e6ff',24,72,2.1); burst(h.center.x,h.center.y,'#f3fdff',12,50,1.5);
    for(const e of nearby(h.center,r)) applyElectrocutionStatus(e,Number(cfg.electrocutionSeconds||1.8),{exactDuration:true,source:'hammerthundergod'});
  }
  function tickThunderHammer() {
    if(!thunderHammer)return; const t=now();
    if(!thunderHammer.flash2&&t>=thunderHammer.flash2At){thunderHammer.flash2=true;hammerSkyFlash(thunderHammer,true);}
    if(!thunderHammer.impacted&&t>=thunderHammer.impactAt)resolveHammerImpact(thunderHammer);
    if(!thunderHammer.discharged&&t>=thunderHammer.dischargeAt)resolveHammerDischarge(thunderHammer);
    if(t>=thunderHammer.dissolveEnd)thunderHammer=null;
  }
  function drawThunderHammerShape(ctx,h,t) {
    if(!h||!h.impacted||t<h.impactAt)return; const cfg=h.def.special||{},fade=t>=h.dischargeAt?1-clamp((t-h.dischargeAt)/Math.max(.1,Number(cfg.hammerDissolveSeconds||.45)),0,1):1;
    ctx.save();ctx.globalAlpha*=fade;ctx.translate(h.center.x,h.center.y-5);ctx.rotate(-.18);ctx.fillStyle='#9baab5';ctx.strokeStyle='#e9f8ff';ctx.lineWidth=1.8;ctx.fillRect(-14,-8,28,13);ctx.strokeRect(-14,-8,28,13);ctx.fillStyle='#53616c';ctx.fillRect(-3,5,6,22);ctx.strokeRect(-3,5,6,22);
    ctx.strokeStyle='#67cfff';ctx.lineWidth=1.6;for(let k=0;k<3;k++){const a=t*(9+k*2)+k*1.7;ctx.beginPath();ctx.moveTo(-12+Math.cos(a)*4,-7+k*4);ctx.lineTo(-2+Math.sin(a*1.4)*6,-2+k*3);ctx.lineTo(11+Math.cos(a*.8)*4,-6+k*5);ctx.stroke();}ctx.restore();
  }

'''
abilities=abilities.replace(marker,hammer+marker)

marker="    if (t >= targeting.deadline) { if(targeting.kind==='zetsascauldron') commitZetsa(); else commitGaia(); }"
require_once(abilities,marker,'targeting fallback')
abilities=abilities.replace(marker,"    if (t >= targeting.deadline) { if(targeting.kind==='zetsascauldron') commitZetsa(); else if(targeting.kind==='hammerthundergod') commitHammerThunderGod(); else commitGaia(); }")

marker="    if (key === 'zetsascauldron') {\n      busy = true;\n      if (!makeZetsaReticle(def)) busy = false;\n    }"
require_once(abilities,marker,'activation')
abilities=abilities.replace(marker,marker+"\n    if (key === 'hammerthundergod') {\n      busy = true;\n      if (!makeHammerReticle(def)) busy = false;\n      return;\n    }")

marker="    const t = now();\n    for (let i = timedFx.length - 1; i >= 0; i--) {"
require_once(abilities,marker,'draw storm insertion')
storm=r'''    const t = now();
    if (thunderHammer && t < thunderHammer.skyClearEnd) {
      const cfg=thunderHammer.def.special||{},base=Number(cfg.stormDarkenAlpha||.48),fade=t<=thunderHammer.impactAt?1:1-clamp((t-thunderHammer.impactAt)/Math.max(.1,thunderHammer.skyClearEnd-thunderHammer.impactAt),0,1);
      ctx.save();ctx.fillStyle=`rgba(4,8,18,${base*fade})`;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
    }
    for (let i = timedFx.length - 1; i >= 0; i--) {'''
abilities=abilities.replace(marker,storm)

marker="      } else if (f.kind === 'wolfGhost') drawWolfShape(ctx, f.x, f.y, a * 0.45, true);"
require_once(abilities,marker,'timed FX insertion')
fxextra=r'''      } else if (f.kind === 'hammerSkyFlash') {
        const g=ctx.createRadialGradient(f.x,f.y,2,f.x,f.y,58);g.addColorStop(0,`rgba(245,253,255,${.95*a})`);g.addColorStop(.25,`rgba(150,218,255,${.55*a})`);g.addColorStop(1,'rgba(72,139,255,0)');ctx.fillStyle=g;ctx.fillRect(Math.max(0,f.x-70),0,140,Math.min(canvas.height,100));ctx.fillStyle=`rgba(220,245,255,${.12*a})`;ctx.fillRect(0,0,canvas.width,canvas.height);
      } else if (f.kind === 'hammerThunderBolt') {
        ctx.save();ctx.globalAlpha=.95*a;const segments=8,top=-20;for(const [width,color] of [[f.width||14,'rgba(91,180,255,.35)'],[(f.width||14)*.55,'#9fe5ff'],[(f.width||14)*.18,'#ffffff']]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(f.x,top);for(let s=1;s<=segments;s++){const q=s/segments,yy=top+(f.y-top)*q,xx=f.x+(s===segments?0:Math.sin(s*5.13+f.start*17)*8*(1-q));ctx.lineTo(xx,yy);}ctx.stroke();}ctx.restore();
      } else if (f.kind === 'hammerCracks') {
        ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=.72*a;ctx.strokeStyle='#54738d';ctx.lineWidth=1.6;for(let k=0;k<9;k++){const ang=k*Math.PI*2/9+.17,len=(f.radius||60)*(.35+(k%4)*.13);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(ang)*len*.55,Math.sin(ang)*len*.32);ctx.lineTo(Math.cos(ang+.08)*len,Math.sin(ang+.08)*len*.55);ctx.stroke();}ctx.restore();
      } else if (f.kind === 'hammerElectricField') {
        ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=.8*a;ctx.strokeStyle='#7ed8ff';ctx.lineWidth=2;const r=f.radius||68;for(let k=0;k<5;k++){const a0=t*(5+k)+k*1.2;ctx.beginPath();for(let j=0;j<=6;j++){const q=j/6,ang=a0+q*1.7,rr=r*(.35+.55*q);const x=Math.cos(ang)*rr,y=Math.sin(ang)*rr*.62;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}ctx.restore();
      } else if (f.kind === 'wolfGhost') drawWolfShape(ctx, f.x, f.y, a * 0.45, true);'''
abilities=abilities.replace(marker,fxextra)

marker="    drawCauldronShape(ctx,cauldron,t);\n    drawTaurusStampLog(ctx,t);"
require_once(abilities,marker,'persistent draw insertion')
abilities=abilities.replace(marker,"    drawCauldronShape(ctx,cauldron,t);\n    drawThunderHammerShape(ctx,thunderHammer,t);\n    drawElectrocutionStatuses(ctx,t);\n    drawTaurusStampLog(ctx,t);")

marker="        tickTargeting();\n        tickCauldron();"
require_once(abilities,marker,'frame tick insertion')
abilities=abilities.replace(marker,"        tickTargeting();\n        tickCauldron();\n        tickThunderHammer();\n        tickElectrocutionStatus();")

marker="    if (event.key === 'Escape' && targeting) { event.preventDefault(); const name=targeting.kind==='zetsascauldron'?\"Zetsa's Cauldron\":'Gaia Crash'; clearTargeting(); toast(`${name} targeting canceled.`); }"
require_once(abilities,marker,'escape label')
abilities=abilities.replace(marker,"    if (event.key === 'Escape' && targeting) { event.preventDefault(); const name=targeting.kind==='zetsascauldron'?\"Zetsa's Cauldron\":targeting.kind==='hammerthundergod'?'Hammer of Thunder God':'Gaia Crash'; clearTargeting(); toast(`${name} targeting canceled.`); }")

marker="    get blackTaurus() { return taurus ? { alive: taurus.alive, hp: taurus.hp, maxHp: taurus.maxHp, targetId: taurus.targetId, action: taurus.action?.kind || null, position: { ...taurus.pos } } : null; },"
require_once(abilities,marker,'public API')
abilities=abilities.replace(marker,marker+"\n    get thunderHammer() { return thunderHammer ? { impacted: thunderHammer.impacted, discharged: thunderHammer.discharged, point: { ...thunderHammer.center } } : null; },\n    applyElectrocutionStatus, isElectrocutionStatusActive, clearElectrocutionStatus,")
ABIL.write_text(abilities)

check=CHECK.read_text()
marker="const zetsa=catalog.dice.zetsascauldron;"
require_once(check,marker,'catalog test insertion')
hchecks="""const hammer=catalog.dice.hammerthundergod;
must(hammer?.name==='Hammer of Thunder God'&&hammer?.dpCost===18,'Hammer of Thunder God identity/cost drifted.');
must(hammer?.special?.placementSeconds===4&&hammer?.special?.defaultTarget==='battlefield-center','Hammer targeting must remain four seconds with center fallback.');
must(hammer?.special?.secondSkyFlashDelaySeconds===0.6&&hammer?.special?.strikeDelayAfterSecondFlashSeconds===0.4&&hammer?.special?.impactDelaySeconds===1.0,'Hammer sky telegraph timing drifted.');
must(hammer?.special?.affinities?.lightning===0.5&&hammer?.special?.affinities?.metal===0.5,'Hammer impact must remain split Lightning/Metal.');
must(hammer?.special?.hammerDischargeDelaySeconds===1.1&&hammer?.special?.dischargeRadiusMultiplier===1.1&&hammer?.special?.electrocutionSeconds===1.8,'Hammer delayed Electrocution contract drifted.');
must(hammer?.special?.damageTuning==='provisional-moderate-good','Hammer first-pass impact damage must remain explicitly provisional.');

"""
check=check.replace(marker,hchecks+marker)
marker="must(fs.readFileSync('functions/gift-v7-secure.js','utf8').includes(\"'TTD-BLACK-TAURUS'\")&&fs.readFileSync('functions/gift-v7-secure.js','utf8').includes(\"key:'blacktaurus'\"),'Black Taurus online playtest ownership grant missing.');"
require_once(check,marker,'gift test')
check=check.replace(marker,marker+"\nmust(gift.includes(\"'TTD-HAMMER-THUNDER'\")&&gift.includes(\"key:'hammerthundergod'\"),'Hammer of Thunder God online playtest ownership grant missing.');")
marker="  'moonwolfsummon','gaiacrash','blacktaurus','summonWolf'"
require_once(check,marker,'ability marker list')
check=check.replace(marker,"  'moonwolfsummon','gaiacrash','blacktaurus','hammerthundergod','summonWolf'")
marker="for(const marker of ['biteGapSeconds','stunSeconds','confusionChance','secondHitKnockback','relaunchAirborne']){"
require_once(check,marker,'ability contract insertion')
statuschecks="""for(const marker of ['applyElectrocutionStatus','isElectrocutionStatusActive','clearElectrocutionStatus','tickElectrocutionStatus','drawElectrocutionStatuses','makeHammerReticle','commitHammerThunderGod','resolveHammerThunderGod','resolveHammerImpact','resolveHammerDischarge','drawThunderHammerShape','ttdHammerThunderGodTargetV1'])must(abilities.includes(marker),`Hammer/Electrocution runtime contract missing: ${marker}`);
must(abilities.includes("if(targeting.kind==='hammerthundergod') commitHammerThunderGod()"),'Hammer center fallback must resolve through the targeting deadline.');
must(abilities.includes("applyElectrocutionStatus(e,Number(cfg.electrocutionSeconds||1.8),{exactDuration:true,source:'hammerthundergod'})"),'Hammer discharge must apply exact-duration reusable Electrocution.');

"""
check=check.replace(marker,statuschecks+marker)
CHECK.write_text(check)

print('Materialized Hammer of Thunder God, reusable Electrocution status, presentation, and online playtest grant.')
