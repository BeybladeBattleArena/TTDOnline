(() => {
  'use strict';
  if (window.__TTD_MOVING_SCREEN_UI_V1) return;
  window.__TTD_MOVING_SCREEN_UI_V1 = true;

  const STAGE_ID = 'neon_rooftops_v2';
  const GOLD = '#f3d491';
  const CYAN = '#72ddff';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let odCatalog = null;
  let odLoadStarted = false;
  let lastLoadoutSignature = '';
  let lastRouteSignature = '';
  let inferredSourceId = null;
  let pendingDestinationId = null;
  let lastHintIdentity = '';
  let routeRaf = 0;

  const asset = (path) => typeof window.__TTD_ASSET_URL === 'function' ? window.__TTD_ASSET_URL(path) : path;
  const stage = () => window.TTDMovingScreenStages?.[STAGE_ID] || null;
  const modeState = () => window.TTDMovingScreen?.state || null;
  const active = () => document.getElementById('gameScreen')?.classList.contains('ttd-moving-screen-v4') === true;

  function installStyles() {
    if (document.getElementById('ttdMovingScreenUiV1Style')) return;
    const style = document.createElement('style');
    style.id = 'ttdMovingScreenUiV1Style';
    style.textContent = `
      #gameScreen.ttd-moving-screen-v4{top:0!important;bottom:max(18px,env(safe-area-inset-bottom))!important;height:auto!important;}
      #gameScreen.ttd-moving-screen-v4 #ttdMsMoveV4{display:none!important;}
      #ttdMsPathHighlightV1{position:absolute;inset:0;width:100%;height:100%;z-index:6;pointer-events:none;}
      #ttdMsDirectionPromptV1{position:absolute;left:50%;top:12%;z-index:11;transform:translate(-50%,-10px) scale(.92);opacity:0;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;transition:opacity .18s ease,transform .18s ease;}
      #ttdMsDirectionPromptV1.show{opacity:1;transform:translate(-50%,0) scale(1);}
      #ttdMsDirectionPromptV1 .arrows{display:flex;flex-direction:column;align-items:center;font:900 clamp(26px,7vw,48px)/.48 'Space Mono',monospace;color:#fff6cb;text-shadow:0 2px 0 #7b3232,0 0 16px rgba(243,212,145,.92),0 0 34px rgba(255,89,113,.55);animation:ttdMsDirectionBobV1 .58s ease-in-out infinite alternate;}
      #ttdMsDirectionPromptV1.down .arrows{animation-name:ttdMsDirectionBobDownV1;}
      #ttdMsDirectionPromptV1 .caption{margin-top:7px;padding:4px 9px;border:1px solid rgba(243,212,145,.48);border-radius:10px;background:rgba(8,10,21,.78);font:900 9px 'Cinzel',serif;letter-spacing:.10em;color:#fff1c6;box-shadow:0 4px 14px rgba(0,0,0,.34);}
      @keyframes ttdMsDirectionBobV1{from{transform:translateY(5px);filter:brightness(.92)}to{transform:translateY(-5px);filter:brightness(1.22)}}
      @keyframes ttdMsDirectionBobDownV1{from{transform:translateY(-5px);filter:brightness(.92)}to{transform:translateY(5px);filter:brightness(1.22)}}
      #ttdMsLoadoutRailV1{position:absolute;left:5px;top:50%;z-index:10;transform:translateY(-50%);width:42px;padding:5px 4px;border:1px solid rgba(124,186,225,.32);border-radius:11px;background:linear-gradient(180deg,rgba(8,13,28,.88),rgba(7,10,21,.78));backdrop-filter:blur(3px);box-shadow:0 6px 20px rgba(0,0,0,.38);pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:4px;}
      #ttdMsLoadoutRailV1 .railLabel{width:100%;text-align:center;font:900 6px 'Space Mono',monospace;letter-spacing:.06em;color:#9cb9d0;text-shadow:0 1px #000;}
      #ttdMsLoadoutRailV1 .railDivider{width:28px;height:1px;margin:2px 0;background:linear-gradient(90deg,transparent,rgba(85,207,255,.62),transparent);}
      .ttdMsLoadoutSlotV1{position:relative;width:32px;height:32px;border-radius:8px;border:1px solid rgba(180,198,220,.35);display:grid;place-items:center;overflow:visible;background:linear-gradient(145deg,#151d34,#0a1020);box-shadow:inset 0 0 9px rgba(255,255,255,.035);}
      .ttdMsLoadoutSlotV1.die{border-color:var(--slot-glow,rgba(180,198,220,.42));background:linear-gradient(145deg,var(--slot-color,#28324c),#0a1020);}
      .ttdMsLoadoutSlotV1.od{border-color:#258fd1;background:linear-gradient(145deg,#0a2948,#08152a);box-shadow:inset 0 0 10px rgba(85,207,255,.10);}
      .ttdMsLoadoutSlotV1.empty{opacity:.48;}
      .ttdMsLoadoutSlotV1 .glyph{width:22px;height:22px;display:grid;place-items:center;color:#f2f7ff;font:900 8px 'Space Mono',monospace;text-shadow:0 1px 2px #000;overflow:hidden;}
      .ttdMsLoadoutSlotV1 .glyph svg{width:100%;height:100%;display:block;}
      .ttdMsLoadoutSlotV1 .miniTag{position:absolute;right:-3px;bottom:-3px;min-width:13px;padding:1px 2px;border-radius:4px;border:1px solid rgba(85,207,255,.72);background:#06111f;color:#bdefff;font:900 5.5px 'Space Mono',monospace;text-align:center;}
      .ttdMsLoadoutSlotV1 .slotIndex{position:absolute;left:-3px;top:-3px;width:11px;height:11px;border-radius:50%;display:grid;place-items:center;background:#090d19;border:1px solid rgba(255,255,255,.22);color:#d8dfed;font:800 5.5px 'Space Mono',monospace;}
      @media(max-width:560px){
        #gameScreen.ttd-moving-screen-v4{bottom:max(26px,env(safe-area-inset-bottom))!important;}
        #ttdMsLoadoutRailV1{left:3px;width:38px;padding:4px 3px;gap:3px;}
        .ttdMsLoadoutSlotV1{width:29px;height:29px;border-radius:7px}.ttdMsLoadoutSlotV1 .glyph{width:20px;height:20px;font-size:7px}
        #ttdMsDirectionPromptV1{top:10%;}
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeDeck() {
    try {
      const deck = typeof window.getActiveDeck === 'function' ? window.getActiveDeck() : [];
      return Array.isArray(deck) ? deck.slice(0, 5) : [];
    } catch (_) { return []; }
  }
  function normalizeOdPair() {
    try {
      const account = window.account;
      const idx = Number.isSafeInteger(account?.activeDeckIdx) ? account.activeDeckIdx : 0;
      const pair = Array.isArray(account?.overdriveDecks?.[idx]) ? account.overdriveDecks[idx].slice(0, 2) : [];
      while (pair.length < 2) pair.push(null);
      return pair.map((slot) => typeof slot === 'string' ? slot : slot?.key || null);
    } catch (_) { return [null, null]; }
  }
  function dieDefinition(key) {
    try { return window.DICE?.[key] || null; } catch (_) { return null; }
  }
  function renderGlyph(def, fallback) {
    if (def?.glyph && typeof window.renderGlyph === 'function') {
      try { return window.renderGlyph(def.glyph, '#f2f7ff'); } catch (_) {}
    }
    const letters = String(def?.name || fallback || '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
    return letters;
  }
  async function loadOdCatalog() {
    if (odLoadStarted) return;
    odLoadStarted = true;
    try {
      const response = await fetch(asset('/overdrivefile.json'), { cache:'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.dice && typeof data.dice === 'object') odCatalog = data.dice;
    } catch (_) {}
    lastLoadoutSignature = '';
  }
  function odDefinition(key) { return key ? odCatalog?.[key] || null : null; }

  function ensureRail(lane) {
    let rail = document.getElementById('ttdMsLoadoutRailV1');
    if (!rail) {
      rail = document.createElement('div');
      rail.id = 'ttdMsLoadoutRailV1';
      rail.innerHTML = '<div class="railLabel">DECK</div><div class="deckSlots"></div><div class="railDivider"></div><div class="railLabel">OD</div><div class="odSlots"></div>';
      lane.appendChild(rail);
    }
    return rail;
  }
  function renderLoadoutRail(rail) {
    const deck = normalizeDeck();
    const ods = normalizeOdPair();
    const signature = JSON.stringify([deck.map((x) => typeof x === 'string' ? x : [x?.key, x?.instId]), ods, !!odCatalog]);
    if (signature === lastLoadoutSignature) return;
    lastLoadoutSignature = signature;
    const deckHost = rail.querySelector('.deckSlots');
    const odHost = rail.querySelector('.odSlots');
    deckHost.innerHTML = '';
    odHost.innerHTML = '';
    deckHost.style.display = odHost.style.display = 'flex';
    deckHost.style.flexDirection = odHost.style.flexDirection = 'column';
    deckHost.style.gap = odHost.style.gap = '4px';
    deck.forEach((entry, index) => {
      const key = typeof entry === 'string' ? entry : entry?.key;
      const def = dieDefinition(key);
      const slot = document.createElement('div');
      slot.className = `ttdMsLoadoutSlotV1 die${key ? '' : ' empty'}`;
      slot.style.setProperty('--slot-color', def?.color || '#28324c');
      slot.style.setProperty('--slot-glow', def?.glow || 'rgba(180,198,220,.42)');
      slot.title = def?.name || key || `Deck slot ${index + 1}`;
      slot.innerHTML = `<span class="slotIndex">${index + 1}</span><div class="glyph">${renderGlyph(def, key)}</div>`;
      deckHost.appendChild(slot);
    });
    while (deckHost.children.length < 5) {
      const index = deckHost.children.length;
      const slot = document.createElement('div');
      slot.className = 'ttdMsLoadoutSlotV1 die empty';
      slot.innerHTML = `<span class="slotIndex">${index + 1}</span><div class="glyph">—</div>`;
      deckHost.appendChild(slot);
    }
    ods.forEach((key, index) => {
      const def = odDefinition(key);
      const slot = document.createElement('div');
      slot.className = `ttdMsLoadoutSlotV1 od${key ? '' : ' empty'}`;
      slot.title = def?.name || key || `Overdrive slot ${index + 1}`;
      const cost = Number(def?.dpCost);
      slot.innerHTML = `<div class="glyph">${key ? renderGlyph(def, key) : 'OD'}</div>${Number.isFinite(cost) ? `<span class="miniTag">${cost}</span>` : ''}`;
      odHost.appendChild(slot);
    });
  }

  function ensureDirectionPrompt(lane) {
    let prompt = document.getElementById('ttdMsDirectionPromptV1');
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'ttdMsDirectionPromptV1';
      prompt.innerHTML = '<div class="arrows"><span>▲</span><span>▲</span></div><div class="caption">MOVE UP</div>';
      lane.appendChild(prompt);
    }
    return prompt;
  }
  function phaseSeconds() {
    const text = document.getElementById('ttdMsPhaseV4')?.textContent || '';
    const match = text.match(/(PAUSE|MOVING)\s+(\d+)s?/i);
    return match ? { kind:match[1].toLowerCase(), seconds:Number(match[2]) } : null;
  }
  function updateDirectionPrompt(prompt) {
    const s = stage(), state = modeState(), phase = phaseSeconds();
    if (!s || !state) { prompt.classList.remove('show'); return; }
    const down = String(s.direction || 'up').toLowerCase() === 'down';
    const canAdvance = state.stopIndex < (s.cameraStops?.length || 1) - 1;
    const warning = canAdvance && (state.phase === 'transition' || (state.phase === 'pause' && phase?.kind === 'pause' && phase.seconds <= 5 && phase.seconds > 0));
    prompt.classList.toggle('down', down);
    prompt.querySelector('.arrows').innerHTML = down ? '<span>▼</span><span>▼</span>' : '<span>▲</span><span>▲</span>';
    prompt.querySelector('.caption').textContent = down ? 'MOVE DOWN' : 'MOVE UP';
    prompt.classList.toggle('show', !!warning);
  }

  function allNodes(s) { return [...(s?.zones || []), ...(s?.junctions || [])]; }
  function nodeById(s, id) { return allNodes(s).find((n) => n.id === id) || null; }
  function nodeByName(s, name) { return allNodes(s).find((n) => String(n.name || '').trim() === name) || null; }
  function adjacentIds(s, id) {
    const out = [];
    for (const e of s?.edges || []) {
      if (e.from === id) out.push({ id:e.to, edge:e });
      else if (e.to === id) out.push({ id:e.from, edge:e });
    }
    return out;
  }
  function routeDestinationNodes() {
    const s = stage(); if (!s) return [];
    return [...document.querySelectorAll('#ttdMsRoutesV4 .ttdMsRouteBtnV4')].map((button) => {
      const label = String(button.textContent || '').replace(/^\s*⚠\s*/, '').trim();
      return nodeByName(s, label);
    }).filter(Boolean);
  }
  function inferSource(destinations) {
    const s = stage(); if (!s || !destinations.length) return null;
    if (pendingDestinationId) {
      const pending = nodeById(s, pendingDestinationId);
      if (pending && destinations.every((d) => adjacentIds(s, pending.id).some((a) => a.id === d.id))) {
        inferredSourceId = pending.id;
        pendingDestinationId = null;
        return pending;
      }
      pendingDestinationId = null;
    }
    if (inferredSourceId) {
      const existing = nodeById(s, inferredSourceId);
      if (existing && destinations.every((d) => adjacentIds(s, existing.id).some((a) => a.id === d.id))) return existing;
    }
    const candidates = allNodes(s).filter((candidate) => destinations.every((d) => adjacentIds(s, candidate.id).some((a) => a.id === d.id)));
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const ea = Math.max(0, adjacentIds(s, a.id).length - destinations.length);
      const eb = Math.max(0, adjacentIds(s, b.id).length - destinations.length);
      return ea - eb;
    });
    inferredSourceId = candidates[0].id;
    return candidates[0];
  }

  function projection(node, cameraY, W, H) {
    const s = stage(); if (!s) return { x:0, y:0 };
    const sx = clamp(W / 520, .58, 1.05);
    const sy = clamp(H / 430, 1.05, 2.55);
    const baseY = H * .72;
    const depth = clamp((Number(node.z) + 260) / 520, 0, 1);
    const persp = .78 + depth * .28;
    const relX = Number(node.x) - Number(s.cameraX || 520);
    const relY = Number(node.y) - Number(cameraY || 0);
    return { x:W * .50 + relX * sx * persp, y:baseY + Number(node.z) * .28 * sx - relY * sy - relX * .035 * sx };
  }
  function ensurePathCanvas(lane) {
    let canvas = document.getElementById('ttdMsPathHighlightV1');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'ttdMsPathHighlightV1';
      lane.appendChild(canvas);
    }
    return canvas;
  }
  function sizePathCanvas(canvas, lane) {
    const rect = lane.getBoundingClientRect();
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    const targetW = Math.max(1, Math.round(rect.width * dpr));
    const targetH = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) { canvas.width = targetW; canvas.height = targetH; }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, W:rect.width, H:rect.height };
  }
  function drawChevron(g, a, b, t, size=7) {
    const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    g.save(); g.translate(x, y); g.rotate(angle); g.beginPath(); g.moveTo(-size, -size*.65); g.lineTo(0, 0); g.lineTo(-size, size*.65); g.stroke(); g.restore();
  }
  function drawRouteOverlay(canvas, lane) {
    const { g, W, H } = sizePathCanvas(canvas, lane);
    g.clearRect(0, 0, W, H);
    const state = modeState(), s = stage();
    if (!state || !s) return;
    const hint = document.getElementById('ttdMsHintV4')?.textContent || '';
    const identity = hint.split('·')[0].trim();
    if (identity && identity !== lastHintIdentity && !/tap a die|summon directly|camera moving/i.test(identity)) {
      inferredSourceId = null;
      lastHintIdentity = identity;
    }
    const destinations = routeDestinationNodes();
    const routeSignature = destinations.map((d) => d.id).sort().join('|');
    if (!destinations.length) { lastRouteSignature = ''; return; }
    if (routeSignature !== lastRouteSignature) lastRouteSignature = routeSignature;
    const source = inferSource(destinations);
    const time = performance.now();
    g.save();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const dest of destinations) {
      const B = projection(dest, state.cameraY, W, H);
      const pulse = .82 + Math.sin(time / 180) * .16;
      g.strokeStyle = `rgba(114,221,255,${pulse})`;
      g.fillStyle = 'rgba(18,72,101,.24)';
      g.lineWidth = 2.5;
      g.shadowColor = CYAN;
      g.shadowBlur = 12;
      g.beginPath(); g.arc(B.x, B.y, 15 + Math.sin(time/160)*2, 0, Math.PI*2); g.fill(); g.stroke();
      if (!source) continue;
      const A = projection(source, state.cameraY, W, H);
      const grad = g.createLinearGradient(A.x, A.y, B.x, B.y);
      grad.addColorStop(0, GOLD); grad.addColorStop(.5, '#fff0a8'); grad.addColorStop(1, CYAN);
      g.strokeStyle = grad;
      g.lineWidth = 5;
      g.shadowColor = CYAN;
      g.shadowBlur = 14;
      g.setLineDash([13, 8]);
      g.lineDashOffset = -(time / 35) % 21;
      g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke();
      g.setLineDash([]);
      g.strokeStyle = '#fff4bd'; g.lineWidth = 2.4; g.shadowBlur = 8;
      drawChevron(g, A, B, .54); drawChevron(g, A, B, .70);
    }
    g.restore();
  }

  function bindRouteTracking() {
    const routes = document.getElementById('ttdMsRoutesV4');
    if (!routes || routes.dataset.ttdMsUiBound === '1') return;
    routes.dataset.ttdMsUiBound = '1';
    routes.addEventListener('click', (event) => {
      const button = event.target.closest?.('.ttdMsRouteBtnV4');
      if (!button) return;
      const s = stage(); if (!s) return;
      const label = String(button.textContent || '').replace(/^\s*⚠\s*/, '').trim();
      const dest = nodeByName(s, label);
      if (dest) pendingDestinationId = dest.id;
    }, true);
  }

  function cleanup() {
    ['ttdMsLoadoutRailV1','ttdMsDirectionPromptV1','ttdMsPathHighlightV1'].forEach((id) => document.getElementById(id)?.remove());
    lastLoadoutSignature = '';
    lastRouteSignature = '';
    inferredSourceId = null;
    pendingDestinationId = null;
    lastHintIdentity = '';
  }

  function tick() {
    if (active()) {
      const lane = document.getElementById('laneWrap');
      if (lane) {
        const rail = ensureRail(lane); renderLoadoutRail(rail);
        const prompt = ensureDirectionPrompt(lane); updateDirectionPrompt(prompt);
        const pathCanvas = ensurePathCanvas(lane); drawRouteOverlay(pathCanvas, lane);
        bindRouteTracking();
        loadOdCatalog();
      }
    } else if (document.getElementById('ttdMsLoadoutRailV1') || document.getElementById('ttdMsDirectionPromptV1') || document.getElementById('ttdMsPathHighlightV1')) cleanup();
    routeRaf = requestAnimationFrame(tick);
  }

  installStyles();
  cancelAnimationFrame(routeRaf);
  routeRaf = requestAnimationFrame(tick);
})();
