(() => {
  'use strict';
  if (window.__TTD_OVERDRIVE_STARTER_PACK_V2) return;
  window.__TTD_OVERDRIVE_STARTER_PACK_V2 = true;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const now = () => performance.now() / 1000;
  const od = () => window.__TTD_OVERDRIVE || null;
  const defFor = (key) => od()?.catalog?.()?.dice?.[key] || null;
  const battleActive = () => !!(window.state?.running && document.getElementById('gameScreen')?.classList.contains('active'));
  const toast = (message) => {
    try { if (typeof window.toast === 'function') return window.toast(message); } catch (_) {}
    try { if (typeof window.toastGlobal === 'function') return window.toastGlobal(message); } catch (_) {}
    console.info(message);
  };

  const HANDLED = new Set(['embracedryad', 'meteorimpact']);
  let overlay = null;
  let ctx = null;
  let dryad = null;
  let dryadCooldownUntil = 0;
  let meteor = null;
  let lastFrame = performance.now();
  let observedState = null;
  let lastLives = null;
  let baseDieDamage = null;
  let baseEndMatch = null;
  let baseEndEndlessHorde = null;
  let wrapped = false;

  const style = document.createElement('style');
  style.id = 'ttd-overdrive-starter-pack-v2-style';
  style.textContent = `
    .ttdOdCastButton.ttdStarterBlocked{opacity:.34!important;filter:saturate(.58) brightness(.76)!important;border-color:#4f4566!important;background:linear-gradient(180deg,#29243a,#171524)!important;color:#9d94ad!important;box-shadow:0 2px 0 #0b0a10!important;text-shadow:none!important;}
    .ttdOverdriveBattleSlot.ttdStarterBlocked{opacity:.42!important;filter:saturate(.58) brightness(.76)!important;border-color:#237eb8!important;box-shadow:inset 0 0 8px rgba(50,40,65,.2)!important;}
  `;
  document.head.appendChild(style);

  function ensureOverlay() {
    const host = document.getElementById('gameScreen');
    if (!host) return null;
    if (!overlay || !overlay.isConnected) {
      overlay = document.createElement('canvas');
      overlay.id = 'ttdOverdriveStarterPackFxV2';
      Object.assign(overlay.style, {
        position: 'absolute', inset: '0', width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: '57'
      });
      host.appendChild(overlay);
      ctx = overlay.getContext('2d');
    }
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (overlay.width !== w || overlay.height !== h) {
      overlay.width = w;
      overlay.height = h;
    }
    return overlay;
  }

  function hostRect() { return document.getElementById('gameScreen')?.getBoundingClientRect() || null; }
  function relativeRect(node) {
    const h = hostRect(), r = node?.getBoundingClientRect();
    if (!h || !r) return null;
    return { left:r.left-h.left, top:r.top-h.top, right:r.right-h.left, bottom:r.bottom-h.top, width:r.width, height:r.height };
  }
  function trayRect() { return relativeRect(document.getElementById('deckRow') || document.getElementById('tray')); }
  function laneRect() { return relativeRect(document.getElementById('laneWrap')); }

  function currentPair() {
    try {
      const pair = od()?.equipped?.();
      return Array.isArray(pair) ? pair : [null, null];
    } catch (_) { return [null, null]; }
  }
  function keyAt(index) {
    const entry = currentPair()[index];
    return typeof entry === 'string' ? entry : entry?.key || null;
  }
  function readyForBaseCast(key) {
    const def = defFor(key), api = od();
    if (!def || !api || !battleActive()) return false;
    const drive = api.drive?.(), dp = api.dp?.();
    return !!drive?.ready && Number(dp?.current || 0) >= Number(def.dpCost || 0);
  }
  function dryadIsGrowingOrActive() { return !!(dryad && !dryad.ended); }
  function dryadIsProtecting() { return !!(dryad && !dryad.ended && dryad.protecting && dryad.branches.some((b) => b.hp > 0)); }
  function dryadBlocked() { return dryadIsGrowingOrActive() || now() < dryadCooldownUntil; }
  function meteorBlocked() { return !!meteor; }
  function canActivate(key) {
    if (!readyForBaseCast(key)) return false;
    if (key === 'embracedryad') return !dryadBlocked();
    if (key === 'meteorimpact') return !meteorBlocked();
    return true;
  }

  function syncCastability() {
    const pair = currentPair();
    for (let i = 0; i < 2; i++) {
      const key = typeof pair[i] === 'string' ? pair[i] : pair[i]?.key;
      const specialBlocked = key === 'embracedryad' ? dryadBlocked() : key === 'meteorimpact' ? meteorBlocked() : false;
      const button = document.getElementById(`ttdOdCast${i + 1}`);
      const slot = document.querySelector(`.ttdOverdriveBattleSlot[data-od-battle="${i}"]`);
      if (button) button.classList.toggle('ttdStarterBlocked', !!specialBlocked);
      if (slot) slot.classList.toggle('ttdStarterBlocked', !!specialBlocked);
    }
  }

  function spendFor(def) {
    const api = od();
    const cost = Number(def?.dpCost || 0);
    if (!api?.spendDp?.(cost)) return false;
    api.resetDrive?.();
    api.refresh?.();
    return true;
  }

  function branchHpFor(def) {
    const maxHp = Math.max(1, Number(od()?.playerStats?.()?.hp || 50));
    const sp = def.special || {};
    return Math.floor(Number(sp.branchBaseHp || 12) + maxHp * Number(sp.playerMaxHpScale || 0.5));
  }

  function startDryad(def) {
    if (dryadBlocked() || !spendFor(def)) return false;
    const sp = def.special || {};
    const hp = branchHpFor(def);
    const t = now();
    const growStart = t + Number(sp.branchGrowDelaySeconds || 0.5);
    const grownAt = growStart + Number(sp.branchGrowthSeconds || 0.8);
    const frontIndex = Math.random() < 0.5 ? 0 : 1;
    const upperIndex = Math.random() < 0.5 ? 0 : 1;
    dryad = {
      def, start:t, growStart, grownAt,
      expiresAt:grownAt + Number(sp.activeSeconds || 12),
      frontIndex, upperIndex, protecting:false, ended:false, endReason:null, endAt:0,
      branches:[
        { side:'left', hp, maxHp:hp, destroyedAt:0, flashUntil:0 },
        { side:'right', hp, maxHp:hp, destroyedAt:0, flashUntil:0 },
      ],
      rainSeed:Math.random() * 10000,
    };
    syncCastability();
    return true;
  }

  function finishDryad(reason) {
    if (!dryad || dryad.ended) return;
    dryad.ended = true;
    dryad.protecting = false;
    dryad.endReason = reason;
    dryad.endAt = now();
    dryadCooldownUntil = dryad.endAt + Number(dryad.def?.special?.cooldownSeconds || 2);
    syncCastability();
  }

  function inferredIncomingElement(flavor) {
    try {
      const explicit = window.__TTD_INCOMING_DAMAGE_CONTEXT_V1?.()?.element;
      if (explicit) return String(explicit).toLowerCase();
    } catch (_) {}
    const f = String(flavor || '').toLowerCase();
    if (/fire|burn|bomb|explosion|magma/.test(f)) return 'fire';
    if (/frost|ice|blizzard/.test(f)) return 'ice';
    if (/poison|pollen|acid/.test(f)) return 'poison';
    if (/nature|vine|thorn|leaf/.test(f)) return 'nature';
    if (/lightning|shock|electric/.test(f)) return 'lightning';
    if (/shadow|dark/.test(f)) return 'shadow';
    if (/holy|radiance|light/.test(f)) return 'holy';
    return null;
  }

  function natureIncomingMultiplier(def, element) {
    // The current game defense authority gives a 100% elemental affinity a 50% reduction
    // against matching incoming elemental damage. There is not yet a global cross-element
    // player-defense chart in the live game, so Dryad deliberately mirrors that existing rule.
    if (String(element || '').toLowerCase() === 'nature') {
      return Number(def?.special?.currentGameMatchingElementDamageMultiplier || 0.5);
    }
    return 1;
  }

  function absorbThroughBranches(rawAmount, element = null) {
    if (!dryadIsProtecting()) return Math.max(0, Number(rawAmount || 0));
    const mult = Math.max(0.01, natureIncomingMultiplier(dryad.def, element));
    let adjusted = Math.max(0, Number(rawAmount || 0)) * mult;
    const order = dryad.frontIndex === 0 ? [0, 1] : [1, 0];
    for (const index of order) {
      const branch = dryad.branches[index];
      if (!branch || branch.hp <= 0 || adjusted <= 0) continue;
      const taken = Math.min(branch.hp, adjusted);
      branch.hp -= taken;
      adjusted -= taken;
      branch.flashUntil = now() + 0.14;
      if (branch.hp <= 0 && !branch.destroyedAt) branch.destroyedAt = now();
    }
    if (dryad.branches.every((b) => b.hp <= 0)) finishDryad('destroyed');
    // Convert any damage that pierced both Nature-aligned branches back into raw incoming
    // damage before handing it to the original target's own defenses.
    return adjusted > 0 ? adjusted / mult : 0;
  }

  function installDamageRedirects() {
    if (wrapped) return;
    wrapped = true;
    if (typeof window.dieDamage === 'function') {
      baseDieDamage = window.dieDamage;
      window.dieDamage = function dryadRedirectedDieDamage(index, amount, flavor) {
        if (!dryadIsProtecting()) return baseDieDamage.apply(this, arguments);
        const leftover = absorbThroughBranches(amount, inferredIncomingElement(flavor));
        if (leftover <= 0) return;
        return baseDieDamage.call(this, index, leftover, flavor);
      };
    }
    if (typeof window.endMatch === 'function') {
      baseEndMatch = window.endMatch;
      window.endMatch = function dryadAwareEndMatch(reason) {
        if (reason === 'defeat' && dryadIsProtecting()) {
          reconcilePlayerDamage();
          if (Number(window.state?.lives || 0) > 0) return;
        }
        return baseEndMatch.apply(this, arguments);
      };
    }
    if (typeof window.endEndlessHorde === 'function') {
      baseEndEndlessHorde = window.endEndlessHorde;
      window.endEndlessHorde = function dryadAwareEndlessEnd() {
        if (dryadIsProtecting() && Number(window.state?.lives || 0) <= 0) {
          reconcilePlayerDamage();
          if (Number(window.state?.lives || 0) > 0) return;
        }
        return baseEndEndlessHorde.apply(this, arguments);
      };
    }
  }

  function reconcilePlayerDamage() {
    const state = window.state;
    if (!state || !dryadIsProtecting()) return;
    const current = Number(state.lives);
    if (!Number.isFinite(current)) return;
    if (observedState !== state || lastLives == null) {
      observedState = state;
      lastLives = current;
      return;
    }
    if (current >= lastLives) { lastLives = current; return; }
    const lost = lastLives - current;
    const hpMode = !!state.showPlayerHpBar;
    // Tower-life modes do not expose raw incoming HP damage. Their existing Drive conversion
    // treats one life as roughly ten HP of damage, so use the same 10:1 bridge for shielding.
    const rawEquivalent = hpMode ? lost : lost * 10;
    const leftoverEquivalent = absorbThroughBranches(rawEquivalent, null);
    const absorbedEquivalent = Math.max(0, rawEquivalent - leftoverEquivalent);
    // HP modes preserve exact leftover damage. Tower lives are indivisible: if any portion of
    // a life-equivalent hit pierces the branches, that tower life is lost as a whole unit.
    const leftoverLives = hpMode ? leftoverEquivalent : Math.ceil(leftoverEquivalent / 10);
    state.lives = Math.max(0, lastLives - leftoverLives);
    if (hpMode && Number.isFinite(Number(state.zTotalDamageTaken))) {
      state.zTotalDamageTaken = Math.max(0, Number(state.zTotalDamageTaken) - absorbedEquivalent);
    }
    lastLives = Number(state.lives);
    try { window.renderHUD?.(); } catch (_) {}
  }

  function meteorTarget() {
    const state = window.state || {};
    if (state.pvpMode || state.isPvp) {
      try {
        const p = window.__TTD_PVP_OPPONENT_TRAY_POINT_V1?.();
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return { game:{x:p.x,y:p.y}, pvp:true };
      } catch (_) {}
    }
    return { game:{ x:Number(window.cw || 300) * 0.5, y:Number(window.ch || 200) * 0.5 }, pvp:false };
  }
  function gamePointToOverlay(point) {
    const lane = laneRect();
    if (!lane) return { x:(overlay?.width || 1) * 0.5, y:(overlay?.height || 1) * 0.45 };
    return {
      x: lane.left + point.x / Math.max(1, Number(window.cw || lane.width)) * lane.width,
      y: lane.top + point.y / Math.max(1, Number(window.ch || lane.height)) * lane.height,
    };
  }

  function startMeteor(def) {
    if (meteorBlocked() || !spendFor(def)) return false;
    const t = now();
    const sp = def.special || {};
    const charge = Number(sp.chargeSeconds || 0.8);
    const afterLaunch = Number(sp.postLaunchDelaySeconds || 0.4);
    const tintGap = Number(sp.tintToMeteorDelaySeconds || 0.2);
    const fall = Number(sp.fallSeconds || 1.1);
    const embed = Number(sp.embedSeconds || 0.3);
    const hesitate = Number(sp.hesitateSeconds || 0.2);
    const target = meteorTarget();
    meteor = {
      def, start:t, target,
      launchAt:t + charge,
      tintAt:t + charge + afterLaunch,
      appearAt:t + charge + afterLaunch + tintGap,
      impactAt:t + charge + afterLaunch + tintGap + fall,
      explodeAt:t + charge + afterLaunch + tintGap + fall + embed + hesitate,
      resolved:false,
      particles:[],
    };
    syncCastability();
    return true;
  }

  function resolveMeteor() {
    if (!meteor || meteor.resolved) return;
    meteor.resolved = true;
    const sp = meteor.def.special || {};
    const center = meteor.target.game;
    const radius = clamp(Number(window.cw || 300) * Number(sp.radiusFractionOfBattleWidth || 0.18), Number(sp.radiusMin || 58), Number(sp.radiusMax || 92));
    const damage = Number(sp.damage || 72);
    if (meteor.target.pvp) {
      try { window.__TTD_PVP_OVERDRIVE_METEOR_HIT_V1?.({ center, radius, damage, affinities:{ fire:1 } }); } catch (error) { console.error('Meteor Impact PvP hook failed', error); }
    } else {
      let enemies = [];
      try { enemies = typeof window.aliveEnemies === 'function' ? window.aliveEnemies() : (window.state?.enemies || []).filter((e) => e?.alive); } catch (_) {}
      for (const enemy of enemies) {
        let p;
        try { p = window.enemyRenderPos(enemy); } catch (_) { continue; }
        if (Math.hypot(p.x - center.x, p.y - center.y) <= radius) {
          try { window.damageEnemy(enemy, damage, sp.damageCategory || 'special', sp.affinities || { fire:1 }, { source:'overdrive', overdrive:'meteorimpact' }); }
          catch (error) { console.error('Meteor Impact damage failed', error); }
        }
      }
    }
    const endAfter = Number(sp.explosionFadeSeconds || 0.8);
    setTimeout(() => { meteor = null; syncCastability(); }, Math.max(0.2, endAfter) * 1000);
  }

  function activateHandled(key) {
    const def = defFor(key);
    if (!def || !battleActive()) return false;
    if (!canActivate(key)) return false;
    if (key === 'embracedryad') return startDryad(def);
    if (key === 'meteorimpact') return startMeteor(def);
    return false;
  }

  // Explicit OD 1 / OD 2 buttons remain the casting surface. Capture only the two new
  // starter keys; Moon Wolf and Gaia Crash continue through the original ability authority.
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('.ttdOdCastButton');
    if (!button) return;
    const match = /^ttdOdCast([12])$/.exec(button.id || '');
    if (!match) return;
    const index = Number(match[1]) - 1;
    const key = keyAt(index);
    if (!HANDLED.has(key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activateHandled(key);
  }, true);

  function drawLeaf(x, y, scale, alpha, green = '#5fb36b') {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.ellipse(0, 0, 4.4 * scale, 2.5 * scale, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function branchGeometry(branch, growth) {
    const tray = trayRect();
    if (!tray) return null;
    const dieWidth = Math.max(28, tray.width / 7);
    const maxLen = tray.width * Number(dryad?.def?.special?.branchLengthFractionOfTray || 0.6667);
    const length = maxLen * growth;
    const isLeft = branch.side === 'left';
    const verticalSign = (dryad?.upperIndex === (isLeft ? 0 : 1)) ? -1 : 1;
    const baseX = isLeft ? tray.left - 16 : tray.right + 16;
    const tipX = isLeft ? baseX + length : baseX - length;
    const baseY = tray.top + tray.height * 0.51 + verticalSign * 3;
    const tipY = baseY + verticalSign * Math.min(7, length * 0.025);
    const baseW = dieWidth * Number(dryad?.def?.special?.branchBaseWidthDieFraction || 0.3333);
    const tipW = baseW * Number(dryad?.def?.special?.branchTipWidthScale || 0.5);
    return { tray, isLeft, baseX, baseY, tipX, tipY, baseW, tipW, length, verticalSign };
  }

  function drawBranch(branch, growth, alpha, front) {
    if (growth <= 0) return;
    const g = branchGeometry(branch, growth);
    if (!g) return;
    const destroyedQ = branch.destroyedAt ? clamp((now() - branch.destroyedAt) / Number(dryad.def.special.destroyFadeSeconds || 0.65), 0, 1) : 0;
    const liveAlpha = alpha * (1 - destroyedQ);
    const flash = branch.flashUntil > now();
    ctx.save();
    ctx.globalAlpha = liveAlpha;
    const grad = ctx.createLinearGradient(g.baseX, g.baseY, g.tipX, g.tipY);
    grad.addColorStop(0, flash ? '#58c96f' : '#5b3c24');
    grad.addColorStop(0.55, flash ? '#4fad5e' : '#755035');
    grad.addColorStop(1, flash ? '#61c976' : '#8d6846');
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, g.baseW * (front ? 1.03 : 0.96));
    ctx.beginPath();
    ctx.moveTo(g.baseX, g.baseY);
    const midX = (g.baseX + g.tipX) * 0.5;
    const midY = (g.baseY + g.tipY) * 0.5 + g.verticalSign * 3;
    ctx.quadraticCurveTo(midX, midY, g.tipX, g.tipY);
    ctx.stroke();
    ctx.strokeStyle = flash ? 'rgba(182,255,188,.72)' : 'rgba(51,28,17,.55)';
    ctx.lineWidth = Math.max(1, g.baseW * 0.12);
    ctx.beginPath(); ctx.moveTo(g.baseX, g.baseY - 1); ctx.quadraticCurveTo(midX, midY - 1, g.tipX, g.tipY); ctx.stroke();
    ctx.restore();

    const leafFade = branch.destroyedAt ? Math.max(0, 1 - destroyedQ * 1.65) : 1;
    const leafColor = branch.destroyedAt ? '#756c43' : (dryad?.ended && dryad.endReason === 'natural' ? '#58d86b' : '#4e9f58');
    const count = Math.max(2, Math.floor(9 * growth));
    for (let i = 0; i < count; i++) {
      const q = (i + 0.7) / (count + 0.3);
      const x = g.baseX + (g.tipX - g.baseX) * q;
      const y = g.baseY + (g.tipY - g.baseY) * q + Math.sin(i * 2.1 + (g.isLeft ? 0 : 1.3)) * 5;
      drawLeaf(x, y - 5, 0.75 + (i % 3) * 0.12, liveAlpha * leafFade, leafColor);
      if (i % 2 === 0) drawLeaf(x + (g.isLeft ? 4 : -4), y + 4, 0.65, liveAlpha * leafFade, leafColor);
    }

    if (branch.hp > 0 && dryad?.protecting) {
      const w = Math.max(42, Math.min(82, g.length * 0.34));
      const x = g.isLeft ? g.baseX + Math.min(g.length * 0.35, 52) : g.baseX - Math.min(g.length * 0.35, 52) - w;
      const y = g.baseY - 17 - (g.verticalSign < 0 ? 3 : 0);
      const ratio = clamp(branch.hp / Math.max(1, branch.maxHp), 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(5,17,9,.82)'; ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = '#52bd68'; ctx.fillRect(x, y, w * ratio, 5);
      ctx.strokeStyle = 'rgba(145,235,157,.75)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, 5);
      ctx.restore();
    }
  }

  function drawDryad(t) {
    if (!dryad) return;
    const tray = trayRect();
    if (!tray) return;
    const sp = dryad.def.special || {};
    const rainEnd = dryad.start + Number(sp.particleRainSeconds || 0.35);
    const growDur = Number(sp.branchGrowthSeconds || 0.8);
    const growth = clamp((t - dryad.growStart) / Math.max(0.01, growDur), 0, 1);
    if (!dryad.ended && t >= dryad.grownAt) dryad.protecting = true;
    if (!dryad.ended && t >= dryad.expiresAt) finishDryad('natural');

    let alpha = 1;
    if (dryad.ended) {
      const fade = dryad.endReason === 'natural' ? Number(sp.naturalDisperseSeconds || 0.8) : Number(sp.destroyFadeSeconds || 0.65);
      alpha = 1 - clamp((t - dryad.endAt) / Math.max(0.01, fade), 0, 1);
      if (alpha <= 0) { dryad = null; return; }
    }

    const tintProgress = clamp((t - dryad.start) / 0.35, 0, 1) * alpha;
    ctx.save();
    ctx.globalAlpha = 0.22 * tintProgress;
    ctx.fillStyle = '#1c6f38';
    ctx.fillRect(tray.left - 4, tray.top - 3, tray.width + 8, tray.height + 6);
    ctx.restore();

    if (t <= rainEnd + 0.45 && !dryad.ended) {
      const rainQ = t <= rainEnd ? 1 : 1 - clamp((t - rainEnd) / 0.45, 0, 1);
      for (let i = 0; i < 24; i++) {
        const seed = dryad.rainSeed + i * 31.7;
        const x = tray.left - 10 + ((Math.sin(seed) * 0.5 + 0.5) * (tray.width + 20));
        const phase = ((t - dryad.start) * (28 + (i % 5) * 5) + (seed % 100)) % (tray.height + 120);
        const y = tray.top - 105 + phase;
        ctx.save(); ctx.globalAlpha = (0.2 + (i % 4) * 0.08) * rainQ;
        ctx.fillStyle = i % 3 ? '#78d983' : '#a9ef9f';
        ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3) * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }

    const back = dryad.frontIndex === 0 ? 1 : 0;
    drawBranch(dryad.branches[back], growth, alpha, false);
    drawBranch(dryad.branches[dryad.frontIndex], growth, alpha, true);

    if (dryad.ended && dryad.endReason === 'natural') {
      const q = clamp((t - dryad.endAt) / Number(sp.naturalDisperseSeconds || 0.8), 0, 1);
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2 + q * 0.8;
        const x = tray.left + tray.width * (0.5 + Math.cos(a) * 0.42 * q);
        const y = tray.top + tray.height * (0.5 + Math.sin(a) * 0.7 * q);
        ctx.save(); ctx.globalAlpha = (1 - q) * 0.65; ctx.fillStyle = '#78e486';
        ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
  }

  function drawMeteorRock(x, y, r, alpha, rotation) {
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rotation || 0);
    ctx.fillStyle = '#6e432d'; ctx.strokeStyle = '#e7a45e'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2;
      const rr = r * (0.78 + (i % 3) * 0.09);
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d47b42';
    ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.22, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawMeteor(t) {
    if (!meteor) return;
    const lane = laneRect(), tray = trayRect();
    if (!lane || !tray) return;
    const sp = meteor.def.special || {};
    const target = gamePointToOverlay(meteor.target.game);
    const dieSize = Math.max(28, tray.width / 7) * Number(sp.meteorSizeDieScale || 0.95);
    const chargeQ = clamp((t - meteor.start) / Math.max(0.01, Number(sp.chargeSeconds || 0.8)), 0, 1);

    if (t < meteor.launchAt) {
      const x = tray.left + tray.width * 0.5, y = tray.top - 16;
      const r = 7 + dieSize * 0.34 * chargeQ;
      const pulse = 0.88 + Math.sin(t * 27) * 0.08;
      const grad = ctx.createRadialGradient(x - r * .2, y - r * .2, 1, x, y, r * 1.2);
      grad.addColorStop(0, '#e13d35'); grad.addColorStop(.42, '#67151c'); grad.addColorStop(1, '#090308');
      ctx.save(); ctx.globalAlpha = .95; ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(x, y, r * pulse, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      for (let i = 0; i < 12; i++) {
        const a = t * (1.8 + i * .03) + i * .52;
        const rr = r * (1 + (i % 4) * .12);
        ctx.save(); ctx.globalAlpha = .35 + (i % 3) * .12; ctx.fillStyle = i % 2 ? '#f05a36' : '#a41f2b';
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.3 + (i % 3), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      return;
    }

    if (t < meteor.tintAt) {
      const q = clamp((t - meteor.launchAt) / Math.max(.01, meteor.tintAt - meteor.launchAt), 0, 1);
      const x = tray.left + tray.width * .5;
      const y = (tray.top - 16) + (lane.top - 70 - (tray.top - 16)) * q;
      const r = Math.max(8, dieSize * .35 * (1 - q * .45));
      ctx.save(); ctx.globalAlpha = 1 - q * .25; ctx.fillStyle = '#8d1520'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      for (let i = 0; i < 7; i++) {
        ctx.save(); ctx.globalAlpha = (1 - q) * .55; ctx.strokeStyle = '#d83c31'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + (i - 3) * 3, y + 3); ctx.lineTo(x + (i - 3) * 5, y + 32 + i * 2); ctx.stroke(); ctx.restore();
      }
      return;
    }

    const explosionEnd = meteor.explodeAt + Number(sp.explosionFadeSeconds || 0.8);
    const tintAlpha = t < meteor.explodeAt ? 0.22 : 0.22 * (1 - clamp((t - meteor.explodeAt) / Math.max(.01, explosionEnd - meteor.explodeAt), 0, 1));
    ctx.save(); ctx.globalAlpha = tintAlpha; ctx.fillStyle = '#6d0714'; ctx.fillRect(lane.left, lane.top, lane.width, lane.height); ctx.restore();

    if (t >= meteor.appearAt && t < meteor.impactAt) {
      const q = clamp((t - meteor.appearAt) / Math.max(.01, meteor.impactAt - meteor.appearAt), 0, 1);
      const sx = target.x - lane.width * .13, sy = lane.top - dieSize * 1.3;
      const x = sx + (target.x - sx) * q;
      const y = sy + (target.y - sy) * q;
      ctx.save(); ctx.globalAlpha = .18 + q * .3; ctx.fillStyle = '#120708'; ctx.beginPath();
      ctx.ellipse(target.x, target.y + dieSize * .18, dieSize * (.25 + q * .28), dieSize * (.10 + q * .14), 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      for (let i = 0; i < 8; i++) {
        const len = dieSize * (1.1 + i * .09);
        ctx.save(); ctx.globalAlpha = .35 + (i % 3) * .12; ctx.strokeStyle = i % 2 ? '#f07a31' : '#d13c22'; ctx.lineWidth = 2.5 + (i % 2);
        ctx.beginPath(); ctx.moveTo(x - i * 1.4, y - i * .8); ctx.lineTo(x - len * .45, y - len); ctx.stroke(); ctx.restore();
      }
      drawMeteorRock(x, y, dieSize * .48, 1, t * 3.2);
      return;
    }

    if (t >= meteor.impactAt && t < meteor.explodeAt) {
      const embedEnd = meteor.impactAt + Number(sp.embedSeconds || .3);
      const q = clamp((t - meteor.impactAt) / Math.max(.01, embedEnd - meteor.impactAt), 0, 1);
      ctx.save(); ctx.globalAlpha = .48; ctx.fillStyle = '#190b08'; ctx.beginPath(); ctx.ellipse(target.x, target.y + dieSize * .22, dieSize * .64, dieSize * .23, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      drawMeteorRock(target.x, target.y + q * dieSize * .14, dieSize * .48, 1, meteor.impactAt * 2.3);
      return;
    }

    if (t >= meteor.explodeAt) {
      if (!meteor.resolved) resolveMeteor();
      const q = clamp((t - meteor.explodeAt) / Math.max(.01, Number(sp.explosionFadeSeconds || .8)), 0, 1);
      const radius = dieSize * (1.1 + q * 3.6);
      const grad = ctx.createRadialGradient(target.x, target.y, 2, target.x, target.y, radius);
      grad.addColorStop(0, `rgba(255,236,128,${.95 * (1 - q)})`);
      grad.addColorStop(.28, `rgba(255,102,38,${.8 * (1 - q)})`);
      grad.addColorStop(1, 'rgba(130,14,14,0)');
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(target.x, target.y, radius, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 22; i++) {
        const a = i / 22 * Math.PI * 2 + i * .37;
        const d = dieSize * (.4 + q * (2.2 + (i % 5) * .22));
        const x = target.x + Math.cos(a) * d, y = target.y + Math.sin(a) * d * .72;
        ctx.save(); ctx.globalAlpha = (1 - q) * .8; ctx.fillStyle = i % 2 ? '#f07331' : '#7a3225';
        ctx.beginPath(); ctx.arc(x, y, 2 + (i % 4), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
  }

  function frame(ts) {
    const dt = Math.min(.05, Math.max(0, (ts - lastFrame) / 1000));
    lastFrame = ts;
    void dt;
    try {
      ensureOverlay();
      if (ctx && overlay) ctx.clearRect(0, 0, overlay.width, overlay.height);
      const state = window.state;
      if (state !== observedState) {
        observedState = state;
        lastLives = Number.isFinite(Number(state?.lives)) ? Number(state.lives) : null;
      }
      if (battleActive()) {
        reconcilePlayerDamage();
        drawDryad(now());
        drawMeteor(now());
      } else {
        if (dryad && !dryad.ended) finishDryad('battle-ended');
        dryad = null;
        meteor = null;
        dryadCooldownUntil = 0;
      }
      syncCastability();
    } catch (error) { console.error('Starter Overdrive pack frame failed', error); }
    requestAnimationFrame(frame);
  }

  async function start() {
    try { await window.__TTD_BRIDGES_READY; } catch (_) {}
    // The base Overdrive runtime also waits on the bridge promise. Give its continuation one
    // task turn to install its die-damage Drive hook first, then wrap that final authority.
    setTimeout(installDamageRedirects, 0);
    requestAnimationFrame(frame);
  }

  window.__TTD_OVERDRIVE_STARTER_ABILITIES_V2 = Object.freeze({
    handles:(key) => HANDLED.has(key),
    canActivate,
    activate:activateHandled,
    get dryad() {
      return dryad ? {
        active:!dryad.ended,
        protecting:dryad.protecting,
        branches:dryad.branches.map((b) => ({ hp:b.hp, maxHp:b.maxHp })),
        cooldownRemaining:Math.max(0, dryadCooldownUntil - now()),
      } : { active:false, protecting:false, branches:[], cooldownRemaining:Math.max(0, dryadCooldownUntil - now()) };
    },
    get meteorActive() { return !!meteor; },
  });

  start().catch((error) => console.error('Starter Overdrive pack could not start', error));
})();
