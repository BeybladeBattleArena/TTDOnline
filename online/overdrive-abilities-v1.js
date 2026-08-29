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
    targeting = { node, countdown, def, cfg, point: { x: Number(window.cw || 300) * 0.5, y: Number(window.ch || 200) * 0.5 }, start, armedAt: start + Number(cfg.reticleArmSeconds || 0.45), deadline: start + Number(cfg.reticleArmSeconds || 0.45) + Number(cfg.countdownSeconds || 3), dragging: false, moved: false, downX: 0, downY: 0 };
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
    if (t >= targeting.deadline) commitGaia();
  }

  function activateSlot(index) {
    if (busy || !battleActive()) return;
    const api = od();
    const entry = api?.equipped?.(index);
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
    if (key === 'gaiacrash') {
      busy = true;
      if (!makeGaiaReticle(def)) busy = false;
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
        if (wolf?.alive) chooseWolfAttack();
        tickTargeting();
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
    if (event.key === 'Escape' && targeting) { event.preventDefault(); clearTargeting(); toast('Gaia Crash targeting canceled.'); }
  });

  window.__TTD_OVERDRIVE_ABILITIES = Object.freeze({
    activateSlot,
    get moonWolf() { return wolf ? { alive: wolf.alive, hp: wolf.hp, maxHp: wolf.maxHp } : null; },
    get targeting() { return targeting ? { key: 'gaiacrash', point: { ...targeting.point }, deadline: targeting.deadline } : null; },
    damageMoonWolf(amount, element = null) { return hurtWolf(amount, element, null); },
    cancelTargeting: clearTargeting,
  });

  requestAnimationFrame(frame);
})();
