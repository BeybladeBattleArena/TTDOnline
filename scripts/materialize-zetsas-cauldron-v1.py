from pathlib import Path
import json


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one marker, found {count}")
    return text.replace(old, new, 1)

# ---------- Canonical Overdrive catalog ----------
cat_path = Path('overdrivefile.json')
cat = json.loads(cat_path.read_text())
if 'zetsascauldron' in cat.get('dice', {}):
    raise RuntimeError("Zetsa's Cauldron already exists")
cat['dice']['zetsascauldron'] = {
    'name': "Zetsa's Cauldron",
    'element': 'Poison',
    'dpCost': 16,
    'glyph': {'path': 'M5 8 H19 L18 11 C18 17 16 20 12 20 C8 20 6 17 6 11 Z M7 8 C7 5 9 4 12 4 C15 4 17 5 17 8 M4 9 H20 M8 21 H16'},
    'flavor': 'Bubble, boil, hop.',
    'description': 'Place a black iron cauldron that splashes a circular area with cursed green brew. The splash deals no direct damage, but guarantees Poison and briefly transforms every enemy hit into a vulnerable frog.',
    'acquisition': {
        'kind': 'test-code',
        'testCode': 'TTD-ZETSA',
        'rollout': 'playtest'
    },
    'special': {
        'kind': 'zetsasCauldron',
        'placementSeconds': 4,
        'defaultTarget': 'battlefield-center',
        'tapToActivateEarly': True,
        'draggable': True,
        'fallSeconds': 0.55,
        'landingShockwaveSeconds': 0.32,
        'landingShockwaveGameplay': False,
        'cauldronSizeReference': '2x2-standard-ogres',
        'cauldronRadiusFractionOfBattleWidth': 0.09,
        'cauldronRadiusMin': 27,
        'cauldronRadiusMax': 43,
        'violentBubbleSeconds': 1.1,
        'splashRadiusFractionOfBattleWidth': 0.17,
        'splashRadiusMin': 54,
        'splashRadiusMax': 84,
        'directDamage': 0,
        'poisonChance': 1,
        'poisonSeconds': 2.2,
        'poisonPerTick': 3,
        'frogChance': 1,
        'frogSeconds': 2,
        'frogMovementMultiplier': 0.82,
        'frogElementalDamageTakenMultiplier': 1.12,
        'frogSizeReference': 'one-third-standard-goblin',
        'frogEnemyActionsSuppressed': True,
        'transformSmokeSeconds': 0.24,
        'restoreSeconds': 0.32,
        'fadeSeconds': 0.6
    }
}
cat_path.write_text(json.dumps(cat, indent=2) + '\n')
Path('functions/overdrivefile.generated.json').write_text(json.dumps(cat, indent=2) + '\n')

# ---------- Reusable Frog status in the canonical battle core ----------
game_path = Path('random-dice-game-33.html')
game = game_path.read_text()
old_poison = "  function applyPoisonTicks(e, perTick, dur){ e.poison = {t:statusResistDuration(e,dur), tickT:0, tickInterval:0.6, perTick}; }"
new_poison = """  function applyPoisonTicks(e, perTick, dur, options){
    const exact=!!(options&&options.exactDuration),seconds=Math.max(0.05,Number(dur)||0.05);
    e.poison={t:exact?seconds:statusResistDuration(e,seconds),tickT:0,tickInterval:0.6,perTick:Math.max(0,Number(perTick)||0)};
  }
  function isFrogStatusActive(e){return !!(e&&e.frogStatus&&e.frogStatus.until>state.time);}
  function frogMovementMult(e){return isFrogStatusActive(e)?Math.max(0.05,Number(e.frogStatus.moveMult)||0.82):1;}
  function frogElementalTakenMult(e){return isFrogStatusActive(e)?Math.max(1,Number(e.frogStatus.elementalTakenMult)||1.12):1;}
  function applyFrogStatus(e,dur,options){
    if(!e||!e.alive)return false;options=options||{};const t=state.time||0,seconds=Math.max(0.05,Number(dur)||2),restore=Math.max(0.05,Number(options.restoreSeconds)||0.32);
    e.frogStatus={start:t,until:t+seconds,restoreUntil:t+seconds+restore,moveMult:Math.max(0.05,Number(options.moveMultiplier)||0.82),elementalTakenMult:Math.max(1,Number(options.elementalDamageTakenMultiplier)||1.12),smokeSeconds:Math.max(0.05,Number(options.smokeSeconds)||0.24),source:String(options.source||'unknown'),seed:Math.random()*1000};
    return true;
  }
  function updateFrogStatus(e){const f=e&&e.frogStatus;if(!f)return;if((state.time||0)>=f.restoreUntil)e.frogStatus=null;}
"""
game = replace_once(game, old_poison, new_poison.rstrip(), 'frog status insertion')
game = replace_once(game, "      z.x += dir*z.speed*dt;", "      z.x += dir*z.speed*frogMovementMult(z)*dt;", 'frog zombie lane-change speed')
game = replace_once(game, "      z.approach = Math.min(1, z.approach + (z.speed/260)*dt);", "      z.approach = Math.min(1, z.approach + (z.speed/260)*frogMovementMult(z)*dt);", 'frog zombie forward speed')
game = replace_once(game, "      updateCanonEnemyStatus(e, dt);\n      if(!e.alive) continue;", "      updateCanonEnemyStatus(e, dt);\n      updateFrogStatus(e);\n      if(!e.alive) continue;", 'frog status tick')
game = replace_once(game, "      const silenced = (e.statuses && e.statuses.silence && e.statuses.silence.t>0) || !!(e.canon && e.canon.sealedT>0);", "      const silenced = (e.statuses && e.statuses.silence && e.statuses.silence.t>0) || !!(e.canon && e.canon.sealedT>0) || isFrogStatusActive(e);", 'frog action suppression')
game = replace_once(game, "      let speedMult = e.slowMult;", "      let speedMult = e.slowMult*frogMovementMult(e);", 'frog standard marching speed')
old_split = "Object.keys(breakdown).forEach(el=>{finalAmount+=breakdown[el]*enemyElementalMult(e,el==='__nonelemental'?null:el);});"
new_split = "Object.keys(breakdown).forEach(el=>{const frogMult=el==='__nonelemental'?1:frogElementalTakenMult(e);finalAmount+=breakdown[el]*enemyElementalMult(e,el==='__nonelemental'?null:el)*frogMult;});"
game = replace_once(game, old_split, new_split, 'frog elemental vulnerability')

frog_draw = r"""
  function frogOriginalRadius(e){
    if(state.adventure||state.zombieMode){const m=MONSTERS[e.key]||{r:8};return Number(m.r||8)*(e.tier==='typhoon'?1.5:e.tier==='sub'?1.15:e.tier==='small'?1.05:1);}
    return e.isBoss?12:e.kind==='small'?5:7.5;
  }
  function drawFrogSmokePuffs(cx,cy,r,q,seed){
    const alpha=Math.max(0,1-q),spread=r*(0.35+q*.9);ctx.save();
    for(let i=0;i<6;i++){const a=i*1.047+seed*.013,rr=spread*(.35+(i%3)*.28),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.6-q*r*.35;ctx.globalAlpha=alpha*(.28+(i%3)*.12);ctx.fillStyle='#70438d';ctx.beginPath();ctx.arc(x,y,r*(.27+(i%2)*.10),0,Math.PI*2);ctx.fill();}
    for(let i=0;i<7;i++){const a=i*.91+seed*.021,rr=r*(.2+(i%4)*.17),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.45-q*r*1.15;ctx.globalAlpha=alpha*(.45+(i%2)*.18);ctx.fillStyle=i%2?'#9be34f':'#70c93f';ctx.beginPath();ctx.arc(x,y,Math.max(.7,r*.08),0,Math.PI*2);ctx.fill();}
    ctx.restore();
  }
  function drawFrogBody(cx,cy,scale,alpha,stretchX=1,stretchY=1,colorMix=0,e=null){
    const baseR=8/3,r=baseR*scale;let original='#6fae7d';if(e&&(state.adventure||state.zombieMode))original=(MONSTERS[e.key]||{}).color||original;else if(e)original=e.isBoss?'#e2584f':e.kind==='small'?'#6fae7d':'#c98bd6';
    ctx.save();ctx.globalAlpha*=alpha;ctx.translate(cx,cy);ctx.scale(stretchX,stretchY);
    const top=colorMix>0?original:'#8dcc3f';ctx.fillStyle=top;ctx.strokeStyle='rgba(10,20,10,.7)';ctx.lineWidth=Math.max(.6,r*.22);ctx.beginPath();ctx.ellipse(0,-r*.12,r*1.05,r*.82,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.save();ctx.beginPath();ctx.rect(-r*1.2,r*.18,r*2.4,r*.82);ctx.clip();ctx.fillStyle=colorMix>0?original:'#743f8f';ctx.beginPath();ctx.ellipse(0,-r*.12,r*1.05,r*.82,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.fillStyle='#dff6b5';for(const sx of [-1,1]){ctx.beginPath();ctx.arc(sx*r*.48,-r*.68,r*.20,0,Math.PI*2);ctx.fill();ctx.fillStyle='#132013';ctx.beginPath();ctx.arc(sx*r*.48,-r*.70,r*.08,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dff6b5';}
    ctx.strokeStyle='#5e3379';ctx.lineWidth=Math.max(.7,r*.16);for(const sx of [-1,1]){ctx.beginPath();ctx.moveTo(sx*r*.58,r*.38);ctx.lineTo(sx*r*1.20,r*.78);ctx.lineTo(sx*r*1.45,r*.66);ctx.stroke();}
    ctx.restore();
  }
  function drawFrogStatusEnemy(e,p){
    const f=e&&e.frogStatus;if(!f)return false;const t=state.time||0;if(t>=f.restoreUntil)return false;const originalR=Math.max(5,frogOriginalRadius(e)),entry=Math.max(.05,Number(f.smokeSeconds)||.24),active=t<f.until,hop=active?Math.abs(Math.sin((t+f.seed)*Math.PI*3.4))*3.2:0;
    if(active){const entryQ=Math.max(0,Math.min(1,(t-f.start)/entry));if(entryQ<1)drawFrogSmokePuffs(p.x,p.y,originalR,entryQ,f.seed);drawFrogBody(p.x,p.y-hop,1,entryQ<.45?Math.max(0,(entryQ-.15)/.30):1,1,1,0,e);}
    else {const q=Math.max(0,Math.min(1,(t-f.until)/Math.max(.05,f.restoreUntil-f.until))),targetScale=Math.max(1,originalR/(8/3)),scale=1+(targetScale-1)*q,osc=Math.sin(q*Math.PI*3)*(1-q),sx=1+osc*.20,sy=1-osc*.16;drawFrogBody(p.x,p.y,scale,1-q*.20,sx,sy,q>.72?1:0,e);drawFrogSmokePuffs(p.x,p.y,originalR,Math.min(1,q*1.25),f.seed+17);}
    const frogR=8/3,barW=Math.max(12,frogR*4.2),pct=Math.max(0,e.hp/e.maxHp);ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(p.x-barW/2,p.y-hop-9,barW,2.4);ctx.fillStyle=pct>.5?'#6fae7d':pct>.25?'#d9b26a':'#e2584f';ctx.fillRect(p.x-barW/2,p.y-hop-9,barW*pct,2.4);return true;
  }
"""
game = replace_once(game, "  function drawLane(dt){", frog_draw + "\n  function drawLane(dt){", 'frog renderer')
game = replace_once(game, "      const p = airLift ? {x:groundP.x, y:groundP.y-airLift} : groundP;\n      if(e.shakeT>0){", "      const p = airLift ? {x:groundP.x, y:groundP.y-airLift} : groundP;\n      if(drawFrogStatusEnemy(e,p)) continue;\n      if(e.shakeT>0){", 'frog render routing')
game = replace_once(game, "  __ttdExposeCore('applySilence',()=>applySilence);\n  __ttdExposeCore('applySlow',()=>applySlow);", "  __ttdExposeCore('applySilence',()=>applySilence);\n  __ttdExposeCore('applySlow',()=>applySlow);\n  __ttdExposeCore('applyPoisonTicks',()=>applyPoisonTicks);\n  __ttdExposeCore('applyFrogStatus',()=>applyFrogStatus);\n  __ttdExposeCore('isFrogStatusActive',()=>isFrogStatusActive);", 'frog public core api')
game_path.write_text(game)

# ---------- Zetsa cast/animation in existing Overdrive ability authority ----------
ability_path = Path('online/overdrive-abilities-v1.js')
a = ability_path.read_text()
a = replace_once(a, "  let wolf = null;", "  let wolf = null;\n  let cauldron = null;", 'cauldron state')
a = replace_once(a, "    targeting = { node, countdown, def, cfg, point: { x: Number(window.cw || 300) * 0.5, y: Number(window.ch || 200) * 0.5 }, start, armedAt: start + Number(cfg.reticleArmSeconds || 0.45), deadline: start + Number(cfg.reticleArmSeconds || 0.45) + Number(cfg.countdownSeconds || 3), dragging: false, moved: false, downX: 0, downY: 0 };", "    targeting = { kind:'gaiacrash', node, countdown, def, cfg, point: { x: Number(window.cw || 300) * 0.5, y: Number(window.ch || 200) * 0.5 }, start, armedAt: start + Number(cfg.reticleArmSeconds || 0.45), deadline: start + Number(cfg.reticleArmSeconds || 0.45) + Number(cfg.countdownSeconds || 3), dragging: false, moved: false, downX: 0, downY: 0 };", 'tag Gaia targeting')

zetsa_block = r"""
  function makeZetsaReticle(def) {
    const wrap=document.getElementById('laneWrap');if(!wrap||targeting)return false;const cfg=def.special||{},node=document.createElement('div');node.id='ttdZetsasCauldronTargetV1';
    Object.assign(node.style,{position:'absolute',left:'50%',top:'50%',width:'80px',height:'80px',transform:'translate(-50%,-50%)',border:'3px dashed #91db45',borderRadius:'50%',boxSizing:'border-box',zIndex:'80',pointerEvents:'auto',touchAction:'none',boxShadow:'0 0 0 2px rgba(71,38,91,.74),0 0 16px rgba(132,213,66,.48),inset 0 0 15px rgba(112,62,145,.20)',cursor:'grab'});
    const center=document.createElement('div');center.style.cssText='position:absolute;left:50%;top:50%;width:13px;height:9px;transform:translate(-50%,-50%);border-radius:3px 3px 7px 7px;background:#101316;border:2px solid #5d6870;box-shadow:0 -3px 0 -1px #91db45;pointer-events:none;';
    const countdown=document.createElement('div');countdown.style.cssText="position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);font:900 18px 'Space Mono',monospace;color:#d9ffb5;text-shadow:0 2px 4px #000,0 0 8px #73be39;white-space:nowrap;";node.append(center,countdown);wrap.appendChild(node);
    const start=now(),placement=Math.max(.25,Number(cfg.placementSeconds||4));targeting={kind:'zetsascauldron',node,countdown,def,cfg,point:{x:Number(window.cw||300)*.5,y:Number(window.ch||200)*.5},start,armedAt:start+.15,deadline:start+placement,dragging:false,moved:false,downX:0,downY:0};
    const updateNode=(clientX,clientY)=>{if(!targeting||targeting.kind!=='zetsascauldron')return;const rect=wrap.getBoundingClientRect(),x=clamp(clientX-rect.left,10,rect.width-10),y=clamp(clientY-rect.top,10,rect.height-10);targeting.point=cssToGame(clientX,clientY);node.style.left=`${x}px`;node.style.top=`${y}px`;};
    node.addEventListener('pointerdown',event=>{if(!targeting)return;event.preventDefault();event.stopPropagation();targeting.dragging=true;targeting.moved=false;targeting.downX=event.clientX;targeting.downY=event.clientY;node.setPointerCapture?.(event.pointerId);node.style.cursor='grabbing';});
    node.addEventListener('pointermove',event=>{if(!targeting?.dragging)return;event.preventDefault();event.stopPropagation();if(Math.hypot(event.clientX-targeting.downX,event.clientY-targeting.downY)>5)targeting.moved=true;updateNode(event.clientX,event.clientY);});
    node.addEventListener('pointerup',event=>{if(!targeting)return;event.preventDefault();event.stopPropagation();const moved=targeting.moved;targeting.dragging=false;node.style.cursor='grab';node.releasePointerCapture?.(event.pointerId);if(!moved&&now()>=targeting.armedAt)commitZetsa();});return true;
  }
  function commitZetsa(){
    if(!targeting||targeting.kind!=='zetsascauldron'||!battleActive()){clearTargeting();return;}const api=od(),def=targeting.def,p={...targeting.point};if(!api?.spendDp?.(Number(def.dpCost||16))){toast("Zetsa's Cauldron needs full Drive and enough DP.");clearTargeting();return;}api.resetDrive?.();clearTargeting();resolveZetsa(def,p);
  }
  function resolveZetsa(def,center){
    const cfg=def.special||{},t=now(),fall=Math.max(.1,Number(cfg.fallSeconds||.55)),bubble=Math.max(.1,Number(cfg.violentBubbleSeconds||1.1));cauldron={def,center:{...center},start:t,impactAt:t+fall,splashAt:t+fall+bubble,fadeEnd:t+fall+bubble+Math.max(.1,Number(cfg.fadeSeconds||.6)),landed:false,resolved:false};toast("Zetsa's Cauldron!");
  }
  function resolveZetsaSplash(c){
    if(!c||c.resolved)return;c.resolved=true;const cfg=c.def.special||{},radius=clamp(Number(window.cw||300)*Number(cfg.splashRadiusFractionOfBattleWidth||.17),Number(cfg.splashRadiusMin||54),Number(cfg.splashRadiusMax||84));ring(c.center.x,c.center.y,radius,'rgba(132,220,72,.74)',.46,3);
    for(let i=0;i<42;i++){const a=Math.random()*Math.PI*2,s=(35+Math.random()*90),size=1.5+Math.random()*3.6;particles.push({x:c.center.x+Math.cos(a)*6,y:c.center.y-4+Math.sin(a)*4,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.48-30-Math.random()*38,life:.55+Math.random()*.42,max:.97,color:Math.random()<.28?'#b4ef61':Math.random()<.55?'#72c93f':'#4f9d31',size,gravity:115});}
    for(const e of nearby(c.center,radius)){try{window.applyPoisonTicks?.(e,Number(cfg.poisonPerTick||3),Number(cfg.poisonSeconds||2.2),{exactDuration:true});window.applyFrogStatus?.(e,Number(cfg.frogSeconds||2),{moveMultiplier:Number(cfg.frogMovementMultiplier||.82),elementalDamageTakenMultiplier:Number(cfg.frogElementalDamageTakenMultiplier||1.12),smokeSeconds:Number(cfg.transformSmokeSeconds||.24),restoreSeconds:Number(cfg.restoreSeconds||.32),source:'zetsascauldron'});}catch(error){console.error("Zetsa's Cauldron status application failed",error);}}
  }
  function tickCauldron(){if(!cauldron)return;const t=now(),cfg=cauldron.def.special||{};if(!cauldron.landed&&t>=cauldron.impactAt){cauldron.landed=true;ring(cauldron.center.x,cauldron.center.y,32,'rgba(255,255,255,.42)',Number(cfg.landingShockwaveSeconds||.32),1.4);}if(!cauldron.resolved&&t>=cauldron.splashAt)resolveZetsaSplash(cauldron);if(t>=cauldron.fadeEnd)cauldron=null;}
"""
a = replace_once(a, "  function clearTargeting() {", zetsa_block + "\n  function clearTargeting() {", 'Zetsa targeting/resolution')
old_tick = "    if (t >= targeting.deadline) commitGaia();"
new_tick = "    if (t >= targeting.deadline) { if(targeting.kind==='zetsascauldron') commitZetsa(); else commitGaia(); }"
a = replace_once(a, old_tick, new_tick, 'targeting deadline dispatch')
old_activate = "    if (key === 'gaiacrash') {\n      busy = true;\n      if (!makeGaiaReticle(def)) busy = false;\n    }"
new_activate = "    if (key === 'gaiacrash') {\n      busy = true;\n      if (!makeGaiaReticle(def)) busy = false;\n      return;\n    }\n    if (key === 'zetsascauldron') {\n      busy = true;\n      if (!makeZetsaReticle(def)) busy = false;\n    }"
a = replace_once(a, old_activate, new_activate, 'Zetsa activateSlot')
cauldron_draw = r"""
  function drawCauldronShape(ctx,c,t){
    if(!c)return;const cfg=c.def.special||{},fall=Math.max(.1,c.impactAt-c.start),pre=t<c.impactAt,q=pre?clamp((t-c.start)/fall,0,1):1,fade=t>c.splashAt?1-clamp((t-c.splashAt)/Math.max(.1,c.fadeEnd-c.splashAt),0,1):1,r=clamp(Number(window.cw||300)*Number(cfg.cauldronRadiusFractionOfBattleWidth||.09),Number(cfg.cauldronRadiusMin||27),Number(cfg.cauldronRadiusMax||43)),x=c.center.x,y=pre?c.center.y-(1-q)*75:c.center.y,alpha=fade*(pre?q:.98);
    ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);const bodyGrad=ctx.createLinearGradient(0,-r*.45,0,r*.75);bodyGrad.addColorStop(0,'#30363a');bodyGrad.addColorStop(.3,'#14181b');bodyGrad.addColorStop(1,'#050607');ctx.fillStyle=bodyGrad;ctx.strokeStyle='#5b6268';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,r*.15,r,r*.72,0,0,Math.PI);ctx.quadraticCurveTo(r*.78,r*.84,0,r*.9);ctx.quadraticCurveTo(-r*.78,r*.84,-r,r*.15);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#737b80';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-r*.05,r*1.02,r*.28,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#101316';ctx.beginPath();ctx.ellipse(0,-r*.05,r*.91,r*.22,0,0,Math.PI*2);ctx.fill();
    const liquid=ctx.createRadialGradient(-r*.2,-r*.11,1,0,-r*.04,r*.85);liquid.addColorStop(0,'#c5f25c');liquid.addColorStop(.5,'#70c83a');liquid.addColorStop(1,'#2e711f');ctx.fillStyle=liquid;ctx.beginPath();ctx.ellipse(0,-r*.07,r*.82,r*.17,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#4a5054';ctx.lineWidth=3;for(const sx of [-1,1]){ctx.beginPath();ctx.arc(sx*r*.92,r*.1,r*.31,sx<0?-Math.PI*.5:Math.PI*.5,sx<0?Math.PI*.5:Math.PI*1.5);ctx.stroke();}
    ctx.fillStyle='#111416';ctx.fillRect(-r*.62,r*.68,r*.18,r*.28);ctx.fillRect(r*.44,r*.68,r*.18,r*.28);
    if(!pre&&t<c.splashAt){const rage=clamp((t-c.impactAt)/Math.max(.1,Number(cfg.violentBubbleSeconds||1.1)),0,1),count=6+Math.round(rage*8);for(let i=0;i<count;i++){const phase=t*(5+rage*8)+i*1.71,xx=Math.sin(i*7.13)*r*.63,yy=-r*.10-Math.abs(Math.sin(phase))*r*(.06+.16*rage),rr=r*(.035+(i%4)*.015)*(1+rage*.35);ctx.globalAlpha=alpha*(.5+(i%3)*.14);ctx.fillStyle=i%3?'#95dc45':'#c0ef62';ctx.beginPath();ctx.arc(xx,yy,rr,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
  }
"""
a = replace_once(a, "  function drawFx(dt) {", cauldron_draw + "\n  function drawFx(dt) {", 'cauldron renderer')
a = replace_once(a, "    if (wolf) {", "    drawCauldronShape(ctx,cauldron,t);\n    if (wolf) {", 'draw cauldron in overlay')
a = replace_once(a, "        tickTargeting();", "        tickTargeting();\n        tickCauldron();", 'cauldron frame tick')
a = replace_once(a, "    if (event.key === 'Escape' && targeting) { event.preventDefault(); clearTargeting(); toast('Gaia Crash targeting canceled.'); }", "    if (event.key === 'Escape' && targeting) { event.preventDefault(); const name=targeting.kind==='zetsascauldron'?\"Zetsa's Cauldron\":'Gaia Crash'; clearTargeting(); toast(`${name} targeting canceled.`); }", 'targeting cancel message')
a = replace_once(a, "    get targeting() { return targeting ? { key: 'gaiacrash', point: { ...targeting.point }, deadline: targeting.deadline } : null; },", "    get targeting() { return targeting ? { key: targeting.kind || 'gaiacrash', point: { ...targeting.point }, deadline: targeting.deadline } : null; },", 'public targeting state')
ability_path.write_text(a)

# ---------- Online playtest acquisition ----------
gift_path = Path('functions/gift-v7-secure.js')
g = gift_path.read_text()
g = replace_once(g, "const catalog = require('./dicefile.generated.json');\nconst ITEM_DEFS", "const catalog = require('./dicefile.generated.json');\nconst overdriveCatalog = require('./overdrivefile.generated.json');\nconst ITEM_DEFS", 'gift OD catalog import')
g = replace_once(g, "const DICE = new Map(\n", "const OVERDRIVE_DICE = new Set(Object.keys(overdriveCatalog.dice || {}));\nconst DICE = new Map(\n", 'gift OD known keys')
g = replace_once(g, "  'TTD-CRIMSON-C7': { label:'Crimson Current C7 Test Grant', reward:{ dice:[{ key:'crimsoncurrent', cls:7 }] } },\n});", "  'TTD-CRIMSON-C7': { label:'Crimson Current C7 Test Grant', reward:{ dice:[{ key:'crimsoncurrent', cls:7 }] } },\n  'TTD-ZETSA': { label:\"Zetsa's Cauldron Overdrive Test Grant\", reward:{ overdriveDice:[{ key:'zetsascauldron' }] } },\n});", 'Zetsa test code')
g = replace_once(g, "    dice:Array.isArray(raw.dice)?raw.dice.slice(0,20):[],\n    jewels:", "    dice:Array.isArray(raw.dice)?raw.dice.slice(0,20):[],\n    overdriveDice:Array.isArray(raw.overdriveDice)?raw.overdriveDice.slice(0,10):[],\n    jewels:", 'gift reward OD normalization')
g = replace_once(g, "    const reward=rewardOf(codeData.reward), game=gameSnap.data(), outDice=[], outJewels=[];", "    const reward=rewardOf(codeData.reward), game=gameSnap.data(), outDice=[], outOverdrives=[], outJewels=[];", 'gift OD output list')
needle = "    for(const spec of reward.dice){const key=String(spec?.key||''),rarity=DICE.get(key);if(!rarity)continue;const cls=Math.max(1,Math.min(10,Number.isSafeInteger(spec.cls)?spec.cls:1)),dieId=id('d');outDice.push({key,rarity,instance:{id:dieId,cls,enchants:[null,null,null,null]}});tx.set(db.doc(`users/${auth.uid}/dice/${dieId}`),{id:dieId,key,rarity,source:secure?'secure_promo':dev?'builtin_test_code':'gift_code',cls,enchants:[null,null,null,null],createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()});}\n"
addition = needle + "    for(const spec of reward.overdriveDice){const key=String(spec?.key||'');if(!OVERDRIVE_DICE.has(key))continue;outOverdrives.push({key});tx.set(db.doc(`users/${auth.uid}/overdriveDice/${key}`),{key,source:secure?'secure_promo':dev?'builtin_test_code':'gift_code',starter:false,createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()},{merge:true});}\n"
g = replace_once(g, needle, addition, 'gift OD transaction grant')
g = replace_once(g, "dieIds:outDice.map((die)=>die.instance.id),jewelIds:", "dieIds:outDice.map((die)=>die.instance.id),overdriveKeys:outOverdrives.map((die)=>die.key),jewelIds:", 'gift OD transaction audit')
g = replace_once(g, "summary={label:String(codeData.label||'Gift Code').slice(0,80),pips:reward.pips,astras:reward.astras,dice:outDice,jewels:", "summary={label:String(codeData.label||'Gift Code').slice(0,80),pips:reward.pips,astras:reward.astras,dice:outDice,overdriveDice:outOverdrives,jewels:", 'gift OD summary')
gift_path.write_text(g)

# ---------- Persistent regression contracts ----------
check_path = Path('scripts/check-overdrive-v1.mjs')
c = check_path.read_text()
c = replace_once(c, "const starterPack=fs.readFileSync('online/overdrive-starter-pack-v2.js','utf8');", "const starterPack=fs.readFileSync('online/overdrive-starter-pack-v2.js','utf8');\nconst game=fs.readFileSync('random-dice-game-33.html','utf8');\nconst gift=fs.readFileSync('functions/gift-v7-secure.js','utf8');", 'Zetsa check inputs')
meteor_marker = "must(meteor?.special?.impactTargetPve==='battlefield-center'&&meteor?.special?.impactTargetPvp==='opponent-dice-tray','Meteor PvE/PvP targeting contract drifted.');\n"
zchecks = meteor_marker + """
const zetsa=catalog.dice.zetsascauldron;
must(zetsa?.name==="Zetsa's Cauldron"&&zetsa?.dpCost===16,'Zetsa Cauldron identity/cost drifted.');
must(zetsa?.element==='Poison'&&zetsa?.special?.kind==='zetsasCauldron','Zetsa Cauldron Poison/special identity drifted.');
must(zetsa?.special?.placementSeconds===4&&zetsa?.special?.defaultTarget==='battlefield-center','Zetsa placement must remain four seconds with center fallback.');
must(zetsa?.special?.directDamage===0&&zetsa?.special?.poisonChance===1&&zetsa?.special?.frogChance===1,'Zetsa splash must deal zero direct damage and guarantee both statuses.');
must(zetsa?.special?.poisonSeconds===2.2&&zetsa?.special?.frogSeconds===2,'Zetsa Poison/Frog durations drifted.');
must(zetsa?.special?.frogMovementMultiplier===0.82&&zetsa?.special?.frogElementalDamageTakenMultiplier===1.12,'Frog movement/vulnerability contract drifted.');
must(zetsa?.special?.violentBubbleSeconds===1.1&&zetsa?.special?.fadeSeconds===0.6,'Zetsa bubble/fade timing drifted.');
must(zetsa?.special?.frogSizeReference==='one-third-standard-goblin'&&zetsa?.special?.cauldronSizeReference==='2x2-standard-ogres','Zetsa visual scale references drifted.');
"""
c = replace_once(c, meteor_marker, zchecks, 'Zetsa catalog checks')
c = replace_once(c, "  'ttdGaiaCrashTargetV1','commitGaia','resolveGaia','startLift','damageEnemy','__TTD_OVERDRIVE_ABILITIES',", "  'ttdGaiaCrashTargetV1','commitGaia','resolveGaia','ttdZetsasCauldronTargetV1','commitZetsa','resolveZetsa','resolveZetsaSplash','drawCauldronShape','startLift','damageEnemy','__TTD_OVERDRIVE_ABILITIES',", 'Zetsa ability markers')
insert_before = "// activateSlot receives an OD slot index."
core_checks = """
for(const marker of ['applyFrogStatus','isFrogStatusActive','frogMovementMult','frogElementalTakenMult','drawFrogStatusEnemy','8/3','isFrogStatusActive(e);','applyPoisonTicks(e, perTick, dur, options)'])must(game.includes(marker),`Frog core contract missing: ${marker}`);
must(game.includes("const frogMult=el==='__nonelemental'?1:frogElementalTakenMult(e)"),'Frog +12% vulnerability must apply to elemental portions only.');
must(game.includes('z.speed*frogMovementMult(z)*dt')&&game.includes('e.slowMult*frogMovementMult(e)'),'Frog 18% marching slowdown must cover zombie and standard path movement.');
must(gift.includes("'TTD-ZETSA'")&&gift.includes("overdriveDice/${key}")&&gift.includes('OVERDRIVE_DICE'),'Zetsa online playtest grant is missing.');

"""
c = replace_once(c, insert_before, core_checks + insert_before, 'Frog/gift regression checks')
check_path.write_text(c)

print("Materialized Zetsa's Cauldron, reusable Frog status, and online playtest grant.")
