(() => {
  'use strict';
  if (window.__TTD_OVERDRIVE_ABILITIES_V1) return;
  window.__TTD_OVERDRIVE_ABILITIES_V1 = true;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const now = () => performance.now() / 1000;
  const core = () => window.__TTD_CORE_API_V1 || null;
  const od = () => window.__TTD_OVERDRIVE || null;
  const toast = (message) => {
    try { if (typeof window.toast === 'function') return window.toast(message); } catch (_) {}
    try { if (typeof window.toastGlobal === 'function') return window.toastGlobal(message); } catch (_) {}
    console.info(message);
  };

  let overlay = null;
  let overlayCtx = null;
  let busy = false;
  let targeting = null;
  let wolf = null;
  let taurus = null;
  let cauldron = null;
  let lastFrame = performance.now();
  const particles = [];
  const timedFx = [];

  function battleActive() {
    const s = window.state;
    return !!(s && s.running && document.getElementById('gameScreen')?.classList.contains('active'));
  }
  function catalogDef(key) { return od()?.catalog?.()?.dice?.[key] || null; }
  function alive() {
    try { return typeof window.aliveEnemies === 'function' ? window.aliveEnemies() : (window.state?.enemies || []).filter((e) => e?.alive); }
    catch (_) { return []; }
  }
  function totalLength() { return Math.max(1, Number(window.totalLen || 1)); }
  function progress(e) {
    if (!e) return -1;
    if (e.isZombie || e.isTyphoon) return Number(e.approach || 0);
    return Number(e.dist || 0) / totalLength();
  }
  function frontmost() { return alive().sort((a, b) => progress(b) - progress(a))[0] || null; }
  function highestHpTarget() { return alive().sort((a,b)=>Number(b.hp||0)-Number(a.hp||0)||Number(b.maxHp||0)-Number(a.maxHp||0)||progress(b)-progress(a))[0] || null; }
  function point(e) {
    try { return typeof window.enemyRenderPos === 'function' ? window.enemyRenderPos(e) : { x: 0, y: 0 }; }
    catch (_) { return { x: 0, y: 0 }; }
  }
  function isMajorBoss(e) {
    return !!(e && (e.isTyphoon || e.majorBoss || e.isMajorBoss || e.bossTier === 'major' || e.key === 'typhoon'));
  }
  function statusDuration(e, seconds) {
    try { return typeof window.statusResistDuration === 'function' ? window.statusResistDuration(e, seconds) : seconds; }
    catch (_) { return seconds; }
  }
  function statusRollSafe(e, chance) {
    try { return typeof window.statusRoll === 'function' ? window.statusRoll(e, chance) : Math.random() < chance; }
    catch (_) { return Math.random() < chance; }
  }
  function damage(e, amount, category = 'physical', affinities = {}) {
    if (!e?.alive || amount <= 0) return 0;
    try { return typeof window.damageEnemy === 'function' ? window.damageEnemy(e, amount, category, affinities, { source: 'overdrive' }) : 0; }
    catch (error) { console.error('Overdrive enemy damage failed', error); return 0; }
  }
  function launch(e, cfg) {
    if (!e?.alive) return;
    try {
      if (typeof window.startLift === 'function') window.startLift(e, 'airborne', cfg);
    } catch (error) { console.error('Overdrive launch failed', error); }
  }
  function knockback(e, amount) {
    if (!e?.alive) return;
    if (e.isZombie || e.isTyphoon) e.approach = Math.max(0, Number(e.approach || 0) - amount / 260);
    else e.dist = Math.max(0, Number(e.dist || 0) - amount * (e.isBoss ? 0.45 : 1));
  }
  function nearby(center, radius) {
    return alive().filter((e) => {
      const p = point(e); return Math.hypot(p.x - center.x, p.y - center.y) <= radius;
    });
  }

  function ensureOverlay() {
    const wrap = document.getElementById('laneWrap');
    if (!wrap) return null;
    if (!overlay || !overlay.isConnected) {
      overlay = document.createElement('canvas');
      overlay.id = 'ttdOverdriveFxCanvasV1';
      Object.assign(overlay.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '34' });
      wrap.appendChild(overlay);
      overlayCtx = overlay.getContext('2d');
    }
    const w = Math.max(1, Math.round(Number(window.cw || wrap.clientWidth || 1)));
    const h = Math.max(1, Math.round(Number(window.ch || wrap.clientHeight || 1)));
    if (overlay.width !== w || overlay.height !== h) { overlay.width = w; overlay.height = h; }
    return overlay;
  }
  function cssToGame(clientX, clientY) {
    const wrap = document.getElementById('laneWrap');
    const rect = wrap?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clamp((clientX - rect.left) / Math.max(1, rect.width) * Number(window.cw || rect.width), 0, Number(window.cw || rect.width)),
      y: clamp((clientY - rect.top) / Math.max(1, rect.height) * Number(window.ch || rect.height), 0, Number(window.ch || rect.height)),
    };
  }
  function gameToCss(p) {
    const wrap = document.getElementById('laneWrap');
    return {
      x: p.x / Math.max(1, Number(window.cw || wrap?.clientWidth || 1)) * (wrap?.clientWidth || 1),
      y: p.y / Math.max(1, Number(window.ch || wrap?.clientHeight || 1)) * (wrap?.clientHeight || 1),
    };
  }

  function ring(x, y, radius, color, seconds = 0.5, width = 2) {
    timedFx.push({ kind: 'ring', x, y, radius, color, start: now(), seconds, width });
  }
  function slash(x, y, angle, color, seconds = 0.28) {
    timedFx.push({ kind: 'slash', x, y, angle, color, start: now(), seconds });
  }
  function burst(x, y, color, count = 8, speed = 45, size = 2) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.45 + Math.random() * 0.8);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, max: 0.7, color, size: size * (0.6 + Math.random()) });
    }
  }
  function afterImage(x, y) { timedFx.push({ kind: 'wolfGhost', x, y, start: now(), seconds: 0.32 }); }

  function wolfHome() {
    const s = window.state || {};
    if (s.zombieMode || frontmost()?.isZombie || frontmost()?.isTyphoon) return { x: Number(window.cw || 300) * 0.5, y: Number(window.ch || 200) * 0.78 };
    try {
      if (typeof window.posAtDistance === 'function') return window.posAtDistance(totalLength() * 0.82);
    } catch (_) {}
    return { x: Number(window.cw || 300) * 0.72, y: Number(window.ch || 200) * 0.78 };
  }
  function wolfPoint() {
    if (!wolf) return wolfHome();
    if (!wolf.motion) return wolf.home || wolfHome();
    const m = wolf.motion;
    const t = clamp((now() - m.start) / Math.max(0.01, m.seconds), 0, 1);
    const q = t < 0.5 ? t * 2 : (1 - t) * 2;
    return { x: m.home.x + (m.target.x - m.home.x) * q, y: m.home.y + (m.target.y - m.home.y) * q };
  }
  function startWolfMotion(targetPoint, seconds = 0.4) {
    if (!wolf) return;
    const home = wolf.home || wolfHome();
    wolf.motion = { home, target: targetPoint, start: now(), seconds };
    for (let i = 1; i <= 4; i++) setTimeout(() => {
      if (!wolf?.alive) return;
      const p = wolfPoint(); afterImage(p.x, p.y);
    }, i * Math.max(28, seconds * 1000 / 7));
    setTimeout(() => { if (wolf) wolf.motion = null; }, seconds * 1000 + 20);
  }
  function summonWolf(def) {
    if (wolf?.alive) { wolf.alive = false; wolf.deadAt = now(); }
    const sp = def.special || {};
    const home = wolfHome();
    wolf = {
      key: 'moonwolfsummon', alive: true, hp: Number(sp.hp || 210), maxHp: Number(sp.hp || 210), atk: Number(sp.attack || 24),
      dr: Number(sp.damageReduction || 0.03), weak: sp.weak || [], resist: sp.resist || [], home, motion: null,
      nextAttack: now() + 0.8, damageWindow: [], deadAt: 0, alpha: 1,
    };
    ring(home.x, home.y, 30, '#72d7ff', 0.6, 2.5);
    ring(home.x, home.y, 44, '#6c75ff', 0.8, 1.4);
    burst(home.x, home.y, '#9be9ff', 16, 55, 2.2);
    toast('Moon Wolf answers your call!');
  }
  function wolfElementMult(element, def) {
    const sp = def?.special || {};
    if (!element) return 1;
    if ((sp.weak || []).includes(element)) return Number(sp.weaknessMultiplier || 1.5);
    if ((sp.resist || []).includes(element)) return Number(sp.resistanceMultiplier || 0.5);
    return 1;
  }
  function enemyAttackProfile(e) {
    const skill = Array.isArray(e?.skills) ? e.skills.find((s) => s && (s.element || s.category)) : null;
    return { amount: Math.max(1, Number(skill?.dmg || e?.atk || (e?.isBoss ? 12 : 5))), element: skill?.element || null };
  }
  function hurtWolf(raw, element, source) {
    if (!wolf?.alive) return 0;
    const def = catalogDef('moonwolfsummon');
    const amount = Math.max(0, Number(raw || 0)) * (1 - wolf.dr) * wolfElementMult(element, def);
    wolf.hp = Math.max(0, wolf.hp - amount);
    wolf.damageWindow.push({ t: now(), amount });
    burst(wolfPoint().x, wolfPoint().y, '#88b8e8', 4, 28, 1.6);
    if (wolf.hp <= 0) {
      wolf.alive = false; wolf.deadAt = now();
      wolf.motion = null;
      toast('Moon Wolf fades away.');
    }
    if (source) source.__ttdWolfAttackT = 0.9 + Math.random() * 0.65;
    return amount;
  }
  function applyWolfAggro(dt) {
    if (!wolf?.alive) return;
    wolf.home = wolfHome();
    const wp = wolfPoint();
    const blockProgress = (window.state?.zombieMode || frontmost()?.isZombie || frontmost()?.isTyphoon) ? 0.78 : 0.82;
    for (const e of alive()) {
      const ep = point(e);
      const near = Math.hypot(ep.x - wp.x, ep.y - wp.y) <= (e.isBoss ? 92 : 70);
      const blocked = progress(e) >= blockProgress;
      if (!near && !blocked) { e.__ttdMoonWolfAggro = false; continue; }
      e.__ttdMoonWolfAggro = true;
      if (e.isZombie || e.isTyphoon) e.approach = Math.min(Number(e.approach || 0), blockProgress);
      else e.dist = Math.min(Number(e.dist || 0), totalLength() * blockProgress);
      if (Array.isArray(e.skills)) for (const skill of e.skills) if (skill && Number(skill.cd) < 0.22) skill.cd = 0.22;
      e.__ttdWolfAttackT = Number(e.__ttdWolfAttackT ?? (0.35 + Math.random() * 0.8)) - dt;
      if (e.__ttdWolfAttackT <= 0) {
        const profile = enemyAttackProfile(e);
        hurtWolf(profile.amount, profile.element, e);
        slash(wp.x, wp.y, Math.random() * 1.2 - 0.6, '#e77e83', 0.18);
      }
    }
  }
  function wolfRecentDamage() {
    if (!wolf) return 0;
    const cutoff = now() - 2;
    wolf.damageWindow = wolf.damageWindow.filter((d) => d.t >= cutoff);
    return wolf.damageWindow.reduce((sum, d) => sum + d.amount, 0);
  }

  async function wolfDashAndSnack(target, def) {
    if (!wolf?.alive || !target?.alive) return;
    const cfg = def.special.attacks.dashAndSnack;
    const tp = point(target);
    startWolfMotion(tp, 0.42);
    await sleep(190);
    if (!wolf?.alive || !target?.alive) return;
    const intercepted = alive().filter((e) => e !== target).map((e) => ({ e, p: point(e) }))
      .filter(({ p }) => Math.hypot(p.x - wolfPoint().x, p.y - wolfPoint().y) < 22)
      .sort((a, b) => progress(b.e) - progress(a.e))[0]?.e;
    if (intercepted) target = intercepted;
    const major = isMajorBoss(target);
    const weights = major ? cfg.majorBossWeights : cfg.weights;
    if (!major && cfg.restrainNonMajorBoss) launch(target, { rise: 0.08, hold: 0.45, fall: 0.12, height: 10, juggleable: false });
    damage(target, wolf.atk * weights[0], 'physical', {});
    const p1 = point(target); ring(p1.x, p1.y, 14, '#78cfff', 0.22, 2.4); burst(p1.x, p1.y, 'rgba(143,221,255,.72)', 5, 25, 1.4);
    await sleep(Number(cfg.biteGapSeconds || 0.35) * 1000);
    if (!wolf?.alive || !target?.alive) return;
    damage(target, wolf.atk * weights[1], 'physical', {});
    const p2 = point(target); ring(p2.x, p2.y, 17, '#acdfff', 0.23, 2.6); burst(p2.x, p2.y, 'rgba(173,232,255,.72)', 7, 30, 1.5);
    if (!major) target.pausedT = Math.max(Number(target.pausedT || 0), statusDuration(target, Number(cfg.stunSeconds || 0.8)));
  }
  async function wolfClaw(target, def) {
    if (!wolf?.alive || !target?.alive) return;
    const cfg = def.special.attacks.clawCombo;
    startWolfMotion(point(target), 0.34);
    await sleep(120);
    if (!target?.alive) return;
    damage(target, wolf.atk * cfg.weights[0], 'physical', {});
    let p = point(target); slash(p.x, p.y, -0.65, '#d84c62'); slash(p.x + 5, p.y - 2, -0.65, '#9d263a');
    await sleep(Number(cfg.hitGapSeconds || 0.22) * 1000);
    if (!target?.alive) return;
    damage(target, wolf.atk * cfg.weights[1], 'physical', {});
    p = point(target); slash(p.x, p.y, 0.6, '#ed5069'); slash(p.x - 6, p.y - 2, 0.6, '#a9263d');
    knockback(target, Number(cfg.secondHitKnockback || 15));
  }
  async function wolfHowl(def) {
    if (!wolf?.alive) return;
    const cfg = def.special.attacks.howl;
    const wp = wolfPoint();
    ring(wp.x, wp.y, 82, '#a1c8ff', 0.65, 3);
    ring(wp.x, wp.y, 60, '#775fd4', 0.55, 1.5);
    for (const e of nearby(wp, 88)) {
      knockback(e, Number(cfg.knockback || 7));
      if (statusRollSafe(e, Number(cfg.confusionChance || 0.4))) {
        e.confusion = { t: statusDuration(e, Number(cfg.confusionSeconds || 2.4)), dirT: 0, dir: 1 };
      }
    }
    await sleep(350);
  }
  async function wolfRaidKick(target, def) {
    if (!wolf?.alive || !target?.alive) return;
    const cfg = def.special.attacks.raidKick;
    const home = wolf.home || wolfHome();
    timedFx.push({ kind: 'wolfBackstep', x: home.x, y: home.y, start: now(), seconds: Number(cfg.windupSeconds || 0.5) });
    await sleep(Number(cfg.windupSeconds || 0.5) * 1000);
    if (!wolf?.alive || !target?.alive) return;
    const tp = point(target); startWolfMotion(tp, 0.3);
    await sleep(105);
    const targets = nearby(tp, Number(cfg.hitRadius || 38));
    ring(tp.x, tp.y, Number(cfg.hitRadius || 38), '#d9f2ff', 0.34, 3.4);
    ring(tp.x, tp.y, Number(cfg.hitRadius || 38) * 0.72, '#5ebeff', 0.28, 2);
    for (const e of targets) {
      damage(e, wolf.atk * Number(cfg.weight || 0.95), 'physical', {});
      launch(e, cfg.launch || { rise: 0.18, hold: 0.08, fall: 0.36, height: 34, juggleable: true });
    }
    await sleep(230);
    if (wolf?.alive && target?.alive && Math.random() < 0.7) await wolfClaw(target, def);
  }
  async function chooseWolfAttack() {
    if (!wolf?.alive || now() < wolf.nextAttack) return;
    const def = catalogDef('moonwolfsummon');
    const target = frontmost();
    if (!def || !target) { wolf.nextAttack = now() + 0.35; return; }
    const wp = wolfPoint();
    const close = nearby(wp, 90);
    const targetCluster = nearby(point(target), 46);
    const pressure = wolfRecentDamage();
    const roll = Math.random();
    wolf.nextAttack = now() + 1.45 + Math.random() * 0.65;
    try {
      if ((close.length >= 4 || pressure >= 24) && roll < 0.52) await wolfHowl(def);
      else if (targetCluster.length >= 2 && roll < 0.36) await wolfRaidKick(target, def);
      else if (roll < 0.58) await wolfDashAndSnack(target, def);
      else await wolfClaw(target, def);
    } catch (error) { console.error('Moon Wolf attack failed', error); }
  }

  function taurusEnemyId(e){
    if(!e)return null;
    if(!e.__ttdTaurusEnemyId)e.__ttdTaurusEnemyId='bt'+Math.random().toString(36).slice(2);
    return e.__ttdTaurusEnemyId;
  }
  function taurusEnemyById(id){return id?alive().find(e=>taurusEnemyId(e)===id)||null:null;}
  function taurusPoint(){return taurus?.pos || {x:Number(window.cw||300)*.5,y:Number(window.ch||200)*.78};}
  function taurusAttackDelay(def){const sp=def?.special||{},lo=Number(sp.attackIntervalMin||2.6),hi=Math.max(lo,Number(sp.attackIntervalMax||3.3));return lo+Math.random()*(hi-lo);}
  function summonTaurus(def){
    if(taurus?.alive){taurus.alive=false;taurus.deadAt=now();}
    const sp=def.special||{},spawn={x:Number(window.cw||300)*.5,y:Number(window.ch||200)*.76};
    taurus={key:'blacktaurus',alive:true,hp:Number(sp.hp||330),maxHp:Number(sp.hp||330),atk:Number(sp.attack||32),dr:Number(sp.damageReduction||.08),pos:spawn,facing:-Math.PI/2,targetId:null,nextAttack:now()+1,action:null,followTargetId:null,deadAt:0};
    ring(spawn.x,spawn.y,34,'rgba(154,125,87,.75)',.58,2.8);ring(spawn.x,spawn.y,49,'rgba(88,70,53,.52)',.78,1.6);burst(spawn.x,spawn.y,'#8b765f',18,52,2.2);toast('Black Taurus enters the field!');
  }
  function hurtTaurus(raw,element,source){
    if(!taurus?.alive)return 0;
    const amount=Math.max(0,Number(raw||0))*(1-taurus.dr);taurus.hp=Math.max(0,taurus.hp-amount);const p=taurusPoint();burst(p.x,p.y,'#7d868a',5,30,1.8);
    if(taurus.hp<=0){taurus.alive=false;taurus.deadAt=now();taurus.action=null;toast('Black Taurus falls.');}
    if(source)source.__ttdTaurusAttackT=.95+Math.random()*.7;return amount;
  }
  function applyTaurusAggro(dt){
    if(!taurus?.alive)return;const tp=taurusPoint(),sp=catalogDef('blacktaurus')?.special||{},aggro=Number(sp.aggroRadius||70),contact=Number(sp.adjacentDistance||30)+5;
    for(const e of alive()){
      const ep=point(e),dist=Math.hypot(ep.x-tp.x,ep.y-tp.y);if(dist>aggro){e.__ttdBlackTaurusAggro=false;continue;}e.__ttdBlackTaurusAggro=true;
      if(dist<=contact&&!taurus.action)e.pausedT=Math.max(Number(e.pausedT||0),.12);
      e.__ttdTaurusAttackT=Number(e.__ttdTaurusAttackT??(.4+Math.random()*.9))-dt;
      if(e.__ttdTaurusAttackT<=0){const profile=enemyAttackProfile(e);hurtTaurus(profile.amount,profile.element,e);slash(tp.x,tp.y,Math.random()*1.2-.6,'#bd7d6f',.18);}
    }
  }
  function finishTaurusAction(def){if(!taurus)return;taurus.action=null;taurus.nextAttack=now()+taurusAttackDelay(def);}
  function startTaurusWinding(target,def){
    if(!taurus?.alive||!target?.alive)return;const cfg=def.special.attacks.windingRush;taurus.action={kind:'winding',start:now(),targetId:taurusEnemyId(target),hitIndex:0};taurus.targetId=taurusEnemyId(target);taurus.followTargetId=null;ring(taurus.pos.x,taurus.pos.y,Number(cfg.radius||38),'rgba(126,94,61,.48)',.36,2.4);
  }
  function startTaurusStamp(target,def){
    if(!taurus?.alive||!target?.alive)return;taurus.action={kind:'stamp',start:now(),targetId:taurusEnemyId(target),slammed:false};taurus.targetId=taurusEnemyId(target);taurus.followTargetId=taurusEnemyId(target);
  }
  function startTaurusBullRush(target,def){
    if(!taurus?.alive||!target?.alive)return;taurus.action={kind:'bullWindup',start:now(),targetId:taurusEnemyId(target),hitIds:new Set()};taurus.targetId=taurusEnemyId(target);taurus.followTargetId=null;
  }
  function taurusOverlapRush(def,action){
    const cfg=def.special.attacks.bullRush,p=taurusPoint(),radius=Number(cfg.overlapRadius||24);for(const e of nearby(p,radius)){const id=taurusEnemyId(e);if(action.hitIds.has(id))continue;action.hitIds.add(id);damage(e,taurus.atk*Number(cfg.overlapDamageWeight||.65),'physical',cfg.affinities||{earth:1});burst(point(e).x,point(e).y,'#96714d',7,36,1.8);}
  }
  function beginTaurusGore(target,def,action){
    if(!taurus?.alive||!target?.alive){finishTaurusAction(def);return;}const cfg=def.special.attacks.bullRush;taurusOverlapRush(def,action);const seconds=Number(cfg.goreSeconds||.4);target.pausedT=Math.max(Number(target.pausedT||0),seconds+.03);launch(target,{rise:seconds*.38,hold:seconds*.48,fall:seconds*.14,height:Number(cfg.goreHeight||38),juggleable:false});ring(point(target).x,point(target).y,22,'rgba(177,139,84,.68)',.32,2.6);taurus.action={kind:'gore',start:now(),targetId:taurusEnemyId(target)};
  }
  function updateTaurusAction(dt,def){
    if(!taurus?.alive||!taurus.action)return;const sp=def.special||{},a=taurus.action,target=taurusEnemyById(a.targetId),elapsed=now()-a.start;
    if(target){const ep=point(target);taurus.facing=Math.atan2(ep.y-taurus.pos.y,ep.x-taurus.pos.x);}
    if(a.kind==='winding'){
      const cfg=sp.attacks.windingRush,weights=cfg.weights||[.28,.28,.34,.9],gap=Number(cfg.hitGapSeconds||.16);while(a.hitIndex<weights.length&&elapsed>=a.hitIndex*gap){const weight=Number(weights[a.hitIndex]||0),radius=Number(cfg.radius||38);for(const e of nearby(taurus.pos,radius))damage(e,taurus.atk*weight,'physical',cfg.affinities||{earth:1});ring(taurus.pos.x,taurus.pos.y,radius*(.68+a.hitIndex*.09),'rgba(142,103,66,.55)',.24,2.3);burst(taurus.pos.x,taurus.pos.y,'#8d704f',8+a.hitIndex*2,42,1.7);a.hitIndex++;}
      const total=(weights.length-1)*gap+Number(cfg.finalRecoverySeconds||.22);if(elapsed>=total)finishTaurusAction(def);return;
    }
    if(a.kind==='stamp'){
      const cfg=sp.attacks.impedeStamp,t0=Number(cfg.logAppearLingerSeconds||.25),pull=Number(cfg.pullbackTravelSeconds||.15),hold=Number(cfg.pulledBackLingerSeconds||.5),slam=Number(cfg.slamTravelSeconds||.14),impactAt=t0+pull+hold+slam;
      if(!a.slammed&&elapsed>=impactAt){a.slammed=true;if(target?.alive){const stun=Number(cfg.stunSeconds||3.5),slow=Number(cfg.slowAmount||.3),slowSec=Number(cfg.slowSeconds||.6);target.pausedT=Math.max(Number(target.pausedT||0),stun);const ep=point(target);ring(ep.x,ep.y,26,'rgba(91,72,55,.72)',.38,3);burst(ep.x,ep.y,'#6d5b49',14,48,2.1);setTimeout(()=>{try{if(target?.alive)window.applySlow?.(target,slow,slowSec);}catch(_){}},stun*1000);}}
      if(elapsed>=impactAt+.18)finishTaurusAction(def);return;
    }
    if(a.kind==='bullWindup'){
      const cfg=sp.attacks.bullRush,wind=Number(cfg.hornDownWindupSeconds||.4);if(!target?.alive){const next=highestHpTarget();if(!next){finishTaurusAction(def);return;}a.targetId=taurusEnemyId(next);}if(elapsed>=wind){a.kind='bullDash';a.start=now();}return;
    }
    if(a.kind==='bullDash'){
      const cfg=sp.attacks.bullRush;let tracked=target;if(!tracked?.alive&&cfg.retrackTargetDuringRush!==false){tracked=highestHpTarget();if(tracked)a.targetId=taurusEnemyId(tracked);}if(!tracked){finishTaurusAction(def);return;}const ep=point(tracked),dx=ep.x-taurus.pos.x,dy=ep.y-taurus.pos.y,dist=Math.max(.001,Math.hypot(dx,dy)),speed=Number(cfg.dashSpeed||Number(sp.moveSpeed||51)*Number(cfg.dashSpeedMultiplier||2.2)),step=Math.min(dist,speed*dt);taurus.facing=Math.atan2(dy,dx);taurus.pos.x+=dx/dist*step;taurus.pos.y+=dy/dist*step;taurusOverlapRush(def,a);if(dist<=Number(sp.adjacentDistance||30)||elapsed>2.4)beginTaurusGore(tracked,def,a);return;
    }
    if(a.kind==='gore'){
      const cfg=sp.attacks.bullRush,seconds=Number(cfg.goreSeconds||.4);if(elapsed>=seconds){if(target?.alive)target.pausedT=Math.max(Number(target.pausedT||0),Number(cfg.landingStunSeconds||1));finishTaurusAction(def);}return;
    }
  }
  function updateTaurus(dt){
    if(!taurus?.alive)return;const def=catalogDef('blacktaurus');if(!def)return;updateTaurusAction(dt,def);if(taurus.action)return;const sp=def.special||{},target=highestHpTarget();if(!target){taurus.targetId=null;return;}const id=taurusEnemyId(target);if(taurus.targetId&&taurus.targetId!==id)taurus.followTargetId=null;taurus.targetId=id;const ep=point(target),dx=ep.x-taurus.pos.x,dy=ep.y-taurus.pos.y,dist=Math.max(.001,Math.hypot(dx,dy));taurus.facing=Math.atan2(dy,dx);const cfgBull=sp.attacks.bullRush||{};
    if(dist>Number(sp.adjacentDistance||30)){if(now()>=taurus.nextAttack&&dist>=Number(cfgBull.triggerDistance||115)){startTaurusBullRush(target,def);return;}const step=Math.min(dist,Number(sp.moveSpeed||51)*dt);taurus.pos.x+=dx/dist*step;taurus.pos.y+=dy/dist*step;return;}
    if(now()<taurus.nextAttack)return;const stamp=sp.attacks.impedeStamp||{},sameFollow=taurus.followTargetId===id&&Math.random()<Number(stamp.sameTargetWindingFollowupChance||.75);if(sameFollow||Math.random()<.64)startTaurusWinding(target,def);else startTaurusStamp(target,def);
  }

  function makeGaiaReticle(def) {
    const wrap = document.getElementById('laneWrap');
    if (!wrap || targeting) return false;
    const cfg = def.special || {};
    const node = document.createElement('div');
    node.id = 'ttdGaiaCrashTargetV1';
    Object.assign(node.style, {
      position: 'absolute', left: '50%', top: '50%', width: '74px', height: '74px', transform: 'translate(-50%,-50%)',
      border: '5px solid #ff3535', borderRadius: '50%', boxSizing: 'border-box', zIndex: '80', pointerEvents: 'auto', touchAction: 'none',
      boxShadow: '0 0 0 2px rgba(70,0,0,.72),0 0 14px rgba(255,45,45,.7),inset 0 0 13px rgba(255,45,45,.22)', cursor: 'grab'
    });
    const cross = document.createElement('div');
    cross.innerHTML = '<span></span><span></span><b></b>';
    cross.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    const countdown = document.createElement('div');
    countdown.style.cssText = "position:absolute;left:50%;bottom:calc(100% + 7px);transform:translateX(-50%);font:900 18px 'Space Mono',monospace;color:#ffd8d8;text-shadow:0 2px 4px #000,0 0 8px #ff3535;white-space:nowrap;display:none;";
    node.append(cross, countdown);
    const style = document.createElement('style');
    style.textContent = '#ttdGaiaCrashTargetV1 span{position:absolute;background:#ff3535;box-shadow:0 0 6px #ff3535}#ttdGaiaCrashTargetV1 span:first-child{left:50%;top:-12px;bottom:-12px;width:3px;transform:translateX(-50%)}#ttdGaiaCrashTargetV1 span:nth-child(2){top:50%;left:-12px;right:-12px;height:3px;transform:translateY(-50%)}#ttdGaiaCrashTargetV1 b{position:absolute;width:9px;height:9px;border:2px solid #ff9a9a;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%)}';
    node.appendChild(style);
    wrap.appendChild(node);
    const start = now();
    targeting = { kind:'gaiacrash', node, countdown, def, cfg, point: { x: Number(window.cw || 300) * 0.5, y: Number(window.ch || 200) * 0.5 }, start, armedAt: start + Number(cfg.reticleArmSeconds || 0.45), deadline: start + Number(cfg.reticleArmSeconds || 0.45) + Number(cfg.countdownSeconds || 3), dragging: false, moved: false, downX: 0, downY: 0 };
    const updateNode = (clientX, clientY) => {
      if (!targeting) return;
      const rect = wrap.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 10, rect.width - 10), y = clamp(clientY - rect.top, 10, rect.height - 10);
      targeting.point = cssToGame(clientX, clientY);
      node.style.left = `${x}px`; node.style.top = `${y}px`;
    };
    node.addEventListener('pointerdown', (event) => {
      if (!targeting) return;
      event.preventDefault(); event.stopPropagation();
      targeting.dragging = true; targeting.moved = false; targeting.downX = event.clientX; targeting.downY = event.clientY;
      node.setPointerCapture?.(event.pointerId); node.style.cursor = 'grabbing';
    });
    node.addEventListener('pointermove', (event) => {
      if (!targeting?.dragging) return;
      event.preventDefault(); event.stopPropagation();
      if (Math.hypot(event.clientX - targeting.downX, event.clientY - targeting.downY) > 5) targeting.moved = true;
      updateNode(event.clientX, event.clientY);
    });
    node.addEventListener('pointerup', (event) => {
      if (!targeting) return;
      event.preventDefault(); event.stopPropagation();
      const wasMoved = targeting.moved;
      targeting.dragging = false; node.style.cursor = 'grab';
      node.releasePointerCapture?.(event.pointerId);
      if (!wasMoved && now() >= targeting.armedAt) commitGaia();
    });
    return true;
  }

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

  function clearTargeting() {
    targeting?.node?.remove(); targeting = null; busy = false;
  }
  function commitGaia() {
    if (!targeting || !battleActive()) { clearTargeting(); return; }
    const api = od();
    const def = targeting.def;
    const p = { ...targeting.point };
    if (!api?.spendDp?.(Number(def.dpCost || 15))) { toast('Gaia Crash needs full Drive and enough DP.'); clearTargeting(); return; }
    api.resetDrive?.();
    clearTargeting();
    resolveGaia(def, p);
  }
  function resolveGaia(def, center) {
    const cfg = def.special || {};
    const radius = clamp(Number(window.cw || 300) * Number(cfg.radiusFractionOfBattleWidth || 0.15), Number(cfg.radiusMin || 48), Number(cfg.radiusMax || 78));
    ring(center.x, center.y, radius, '#e2b174', 0.52, 4);
    ring(center.x, center.y, radius * 0.68, '#95663f', 0.38, 2.5);
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * radius;
      particles.push({ x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r, vx: (Math.random() - 0.5) * 30, vy: -35 - Math.random() * 70, life: 0.55 + Math.random() * 0.4, max: 0.95, color: Math.random() < 0.45 ? '#c89b66' : '#755139', size: 2 + Math.random() * 3.5, gravity: 115 });
    }
    for (const e of nearby(center, radius)) {
      damage(e, Number(cfg.damage || 42), cfg.damageCategory || 'special', cfg.affinities || { earth: 1 });
      launch(e, cfg.launch || { rise: 0.2, hold: 0.08, fall: 0.4, height: 42, juggleable: true });
    }
    toast('Gaia Crash!');
  }
  function tickTargeting() {
    if (!targeting) return;
    if (!battleActive()) { clearTargeting(); return; }
    const t = now();
    if (t >= targeting.armedAt) {
      targeting.countdown.style.display = 'block';
      targeting.countdown.textContent = Math.max(0, targeting.deadline - t).toFixed(1);
    }
    if (t >= targeting.deadline) { if(targeting.kind==='zetsascauldron') commitZetsa(); else commitGaia(); }
  }

  function activateSlot(index) {
    if (busy || !battleActive()) return;
    if (!Number.isSafeInteger(index) || index < 0 || index > 1) return;
    const api = od();
    const pair = api?.equipped?.();
    const entry = Array.isArray(pair) ? pair[index] : null;
    const key = typeof entry === 'string' ? entry : entry?.key;
    const def = catalogDef(key);
    if (!key || !def) return;
    const drive = api.drive?.(); const dp = api.dp?.();
    if (!drive?.ready) { toast('Drive Meter is not full yet.'); return; }
    if (Number(dp?.current || 0) < Number(def.dpCost || 0)) { toast(`Not enough DP for ${def.name || key}.`); return; }
    if (key === 'moonwolfsummon') {
      if (!api.spendDp?.(Number(def.dpCost || 20))) return;
      api.resetDrive?.();
      busy = true; summonWolf(def); setTimeout(() => { busy = false; }, 250);
      return;
    }
    if (key === 'blacktaurus') {
      if (!api.spendDp?.(Number(def.dpCost || 20))) return;
      api.resetDrive?.();
      busy = true; summonTaurus(def); setTimeout(() => { busy = false; }, 250);
      return;
    }
    if (key === 'gaiacrash') {
      busy = true;
      if (!makeGaiaReticle(def)) busy = false;
      return;
    }
    if (key === 'zetsascauldron') {
      busy = true;
      if (!makeZetsaReticle(def)) busy = false;
    }
  }

  function drawWolfShape(ctx, x, y, alpha = 1, ghost = false) {
    ctx.save(); ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.fillStyle = ghost ? '#416fc8' : '#234b8d';
    ctx.strokeStyle = ghost ? '#80b2ff' : '#a6dcff'; ctx.lineWidth = ghost ? 1.1 : 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, -0.08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -6); ctx.lineTo(20, -13); ctx.lineTo(22, -5); ctx.lineTo(18, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(13, -10); ctx.lineTo(13, -18); ctx.lineTo(18, -12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -8); ctx.lineTo(4, -17); ctx.lineTo(9, -10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-14, -2); ctx.quadraticCurveTo(-25, -9, -28, -2); ctx.quadraticCurveTo(-22, -2, -16, 4); ctx.stroke();
    ctx.fillStyle = '#c9efff'; ctx.beginPath(); ctx.arc(18, -8, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawTaurusShape(ctx,x,y,angle=0,alpha=1,action=null){
    ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);let rot=angle;if(action?.kind==='winding')rot+=(now()-action.start)*18;ctx.rotate(rot);const gore=action?.kind==='gore'?clamp((now()-action.start)/.4,0,1):0;
    ctx.fillStyle='#343c43';ctx.strokeStyle='#79838a';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(-2,1,18,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#2a3036';ctx.beginPath();ctx.ellipse(12,-1-gore*3,10,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#414a50';ctx.fillRect(-10,9,6,12);ctx.fillRect(6,9,6,12);ctx.fillRect(-13,-7,7,12);ctx.fillRect(5,-8,7,11);
    const hornLen=action?.kind==='bullWindup'||action?.kind==='bullDash'||action?.kind==='gore'?20:14;ctx.strokeStyle='#d5d0bd';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(15,-6-gore*4);ctx.quadraticCurveTo(22,-9-gore*5,15+hornLen,-8-gore*5);ctx.moveTo(15,5-gore*4);ctx.quadraticCurveTo(22,8-gore*5,15+hornLen,7-gore*5);ctx.stroke();ctx.lineCap='butt';
    ctx.fillStyle='#11171b';ctx.beginPath();ctx.arc(16,-3-gore*3,1.4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(16,3-gore*3,1.4,0,Math.PI*2);ctx.fill();
    if(action?.kind==='bullWindup'){const q=clamp((now()-action.start)/.4,0,1);ctx.strokeStyle=`rgba(194,162,113,${.25+.55*q})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,-7);ctx.lineTo(38,-7);ctx.moveTo(22,7);ctx.lineTo(38,7);ctx.stroke();}
    ctx.restore();
  }
  function drawTaurusStampLog(ctx,t){
    if(!taurus?.alive||taurus.action?.kind!=='stamp')return;const def=catalogDef('blacktaurus'),cfg=def?.special?.attacks?.impedeStamp||{},a=taurus.action,target=taurusEnemyById(a.targetId);if(!target)return;const elapsed=t-a.start,t0=Number(cfg.logAppearLingerSeconds||.25),pull=Number(cfg.pullbackTravelSeconds||.15),hold=Number(cfg.pulledBackLingerSeconds||.5),slam=Number(cfg.slamTravelSeconds||.14),tp=point(target),p=taurusPoint(),dx=tp.x-p.x,dy=tp.y-p.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;let x=p.x,y=p.y-27;
    if(elapsed>t0&&elapsed<=t0+pull){const q=(elapsed-t0)/pull;x-=ux*28*q;y-=uy*28*q+Math.sin(q*Math.PI)*6;}else if(elapsed>t0+pull&&elapsed<=t0+pull+hold){x-=ux*28;y-=uy*28;}else if(elapsed>t0+pull+hold){const q=clamp((elapsed-t0-pull-hold)/slam,0,1);const sx=p.x-ux*28,sy=p.y-27-uy*28;x=sx+(tp.x-sx)*q;y=sy+(tp.y-sy)*q;}
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx));ctx.fillStyle='#55483f';ctx.strokeStyle='#827166';ctx.lineWidth=2;const w=30,h=10;ctx.beginPath();ctx.roundRect?ctx.roundRect(-w/2,-h/2,w,h,4):ctx.rect(-w/2,-h/2,w,h);ctx.fill();ctx.stroke();ctx.fillStyle='#77655a';ctx.beginPath();ctx.ellipse(-w/2,0,4,h/2,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
  }

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

  function drawFx(dt) {
    const canvas = ensureOverlay(); if (!canvas || !overlayCtx) return;
    const ctx = overlayCtx; ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = now();
    for (let i = timedFx.length - 1; i >= 0; i--) {
      const f = timedFx[i], q = clamp((t - f.start) / f.seconds, 0, 1), a = 1 - q;
      if (q >= 1) { timedFx.splice(i, 1); continue; }
      if (f.kind === 'ring') {
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = f.color; ctx.lineWidth = f.width || 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.radius * (0.35 + q * 0.65), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      } else if (f.kind === 'slash') {
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.angle || 0); ctx.globalAlpha = a; ctx.strokeStyle = f.color; ctx.lineWidth = 3;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(-14, k * 5 - 7); ctx.lineTo(14, k * 5 + 7); ctx.stroke(); }
        ctx.restore();
      } else if (f.kind === 'wolfGhost') drawWolfShape(ctx, f.x, f.y, a * 0.45, true);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += Number(p.gravity || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.save(); ctx.globalAlpha = clamp(p.life / Math.max(0.01, p.max || p.life), 0, 1); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    drawCauldronShape(ctx,cauldron,t);
    drawTaurusStampLog(ctx,t);
    if (taurus) {
      if (taurus.alive) {
        const p=taurusPoint(); drawTaurusShape(ctx,p.x,p.y,taurus.facing,1,taurus.action);
        const w=48,ratio=clamp(taurus.hp/Math.max(1,taurus.maxHp),0,1);ctx.fillStyle='rgba(12,14,14,.82)';ctx.fillRect(p.x-w/2,p.y-29,w,5);ctx.fillStyle='#8a7760';ctx.fillRect(p.x-w/2,p.y-29,w*ratio,5);
      } else {
        const fade=Number(catalogDef('blacktaurus')?.special?.deathFadeSeconds||1.2),q=clamp((t-taurus.deadAt)/fade,0,1);if(q>=1)taurus=null;else{const p=taurusPoint();drawTaurusShape(ctx,p.x,p.y,taurus.facing,1-q,null);}
      }
    }
    if (wolf) {
      if (wolf.alive) {
        const p = wolfPoint(); drawWolfShape(ctx, p.x, p.y, 1, false);
        const w = 38, ratio = clamp(wolf.hp / Math.max(1, wolf.maxHp), 0, 1);
        ctx.fillStyle = 'rgba(4,10,25,.78)'; ctx.fillRect(p.x - w / 2, p.y - 22, w, 4);
        ctx.fillStyle = '#69cfff'; ctx.fillRect(p.x - w / 2, p.y - 22, w * ratio, 4);
      } else {
        const fade = Number(catalogDef('moonwolfsummon')?.special?.deathFadeSeconds || 1.2);
        const q = clamp((t - wolf.deadAt) / fade, 0, 1);
        if (q >= 1) wolf = null;
        else { const p = wolf.home || wolfHome(); drawWolfShape(ctx, p.x, p.y, 1 - q, false); }
      }
    }
  }
  async function frame(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - lastFrame) / 1000)); lastFrame = ts;
    try {
      if (battleActive()) {
        applyWolfAggro(dt);
        applyTaurusAggro(dt);
        if (wolf?.alive) chooseWolfAttack();
        if (taurus?.alive) updateTaurus(dt);
        tickTargeting();
        tickCauldron();
      } else if (targeting) clearTargeting();
      drawFx(dt);
    } catch (error) { console.error('Overdrive ability frame failed', error); }
    requestAnimationFrame(frame);
  }

  document.addEventListener('click', (event) => {
    const slot = event.target?.closest?.('.ttdOverdriveBattleSlot.filled');
    if (!slot) return;
    const index = Number(slot.dataset.odBattle);
    if (!Number.isSafeInteger(index) || index < 0 || index > 1) return;
    event.preventDefault(); event.stopPropagation();
    activateSlot(index);
  }, true);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && targeting) { event.preventDefault(); const name=targeting.kind==='zetsascauldron'?"Zetsa's Cauldron":'Gaia Crash'; clearTargeting(); toast(`${name} targeting canceled.`); }
  });

  window.__TTD_OVERDRIVE_ABILITIES = Object.freeze({
    activateSlot,
    get moonWolf() { return wolf ? { alive: wolf.alive, hp: wolf.hp, maxHp: wolf.maxHp } : null; },
    get blackTaurus() { return taurus ? { alive: taurus.alive, hp: taurus.hp, maxHp: taurus.maxHp, targetId: taurus.targetId, action: taurus.action?.kind || null, position: { ...taurus.pos } } : null; },
    get targeting() { return targeting ? { key: targeting.kind || 'gaiacrash', point: { ...targeting.point }, deadline: targeting.deadline } : null; },
    damageMoonWolf(amount, element = null) { return hurtWolf(amount, element, null); },
    damageBlackTaurus(amount, element = null) { return hurtTaurus(amount, element, null); },
    cancelTargeting: clearTargeting,
  });

  requestAnimationFrame(frame);
})();
