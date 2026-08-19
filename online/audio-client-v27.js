(() => {
  'use strict';
  if (window.__TTD_AUDIO_V27) return;

  const frame = document.getElementById('gameFrame');
  const TRACKS = Object.freeze({
    main: { url:'/assets/audio/main-menu.webm', loopStart:4.49, loopEnd:195.23 },
    shop: { url:'/assets/audio/shop-remix.webm', loopStart:13.02, loopEnd:159.43 },
    deck: { url:'/assets/audio/deck-construction.webm', loopStart:21.18, loopEnd:112.45 },
  });
  const WELCOME = Object.freeze([
    '/assets/audio/welcome-rng-1.mp3',
    '/assets/audio/welcome-rng-2.mp3',
    '/assets/audio/welcome-rng-3.mp3',
    '/assets/audio/welcome-rng-4.mp3',
  ]);
  const SILENT_SCREENS = new Set(['gameModesScreen','modeScreen','zombieModeScreen','adventureScreen','stageScreen','missionScreen','gameScreen']);
  const buffers = new Map();
  const positions = new Map();
  let context = null;
  let master = null;
  let musicGain = null;
  let voiceGain = null;
  let current = null;
  let entered = false;
  let lastScreen = '';
  let poll = 0;

  function ensureContext() {
    if (context && context.state !== 'closed') return context;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = window.__ttdAudioContext && window.__ttdAudioContext.state !== 'closed' ? window.__ttdAudioContext : new Ctor();
    window.__ttdAudioContext = context;
    master = context.createGain(); musicGain = context.createGain(); voiceGain = context.createGain();
    master.gain.value = 1; musicGain.gain.value = .56; voiceGain.gain.value = .92;
    musicGain.connect(master); voiceGain.connect(master); master.connect(context.destination);
    return context;
  }

  async function unlock() {
    const ctx = ensureContext();
    if (!ctx) return null;
    try { await ctx.resume(); } catch (_) {}
    window.__ttdAudioUnlocked = true;
    return ctx;
  }

  async function load(url) {
    if (buffers.has(url)) return buffers.get(url);
    const promise = fetch(url, { cache:'force-cache' })
      .then(r => { if (!r.ok) throw new Error(`Audio ${r.status}: ${url}`); return r.arrayBuffer(); })
      .then(bytes => ensureContext().decodeAudioData(bytes));
    buffers.set(url, promise);
    try { return await promise; } catch (error) { buffers.delete(url); throw error; }
  }

  const preloadPromise = Promise.allSettled([...Object.values(TRACKS).map(t => load(t.url)), ...WELCOME.map(load)]);

  function fadeParam(param, value, seconds=.22) {
    if (!context) return;
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  function stopCurrent(savePosition=true, fade=.18) {
    const playing = current;
    if (!playing || !context) return;
    if (savePosition) {
      const elapsed = Math.max(0, context.currentTime - playing.startedAt);
      const t = playing.track;
      let pos = playing.offset + elapsed;
      if (pos >= t.loopEnd) pos = t.loopStart + ((pos - t.loopStart) % (t.loopEnd - t.loopStart));
      positions.set(playing.key, pos);
    }
    fadeParam(musicGain.gain, 0, fade);
    const src = playing.source;
    setTimeout(() => { try { src.stop(); } catch (_) {} }, Math.ceil((fade + .04) * 1000));
    current = null;
  }

  async function playTrack(key, {restart=false}={}) {
    if (!entered || !TRACKS[key]) return;
    if (current?.key === key && !restart) return;
    const ctx = await unlock();
    if (!ctx) return;
    if (current) stopCurrent(true, .16);
    const track = TRACKS[key];
    let buffer;
    try { buffer = await load(track.url); } catch (error) { console.error('TTD music load failed', error); return; }
    if (!entered) return;
    if (restart) positions.delete(key);
    const offset = restart ? 0 : Math.max(0, Math.min(positions.get(key) || 0, track.loopEnd - .02));
    const source = ctx.createBufferSource();
    source.buffer = buffer; source.loop = true; source.loopStart = track.loopStart; source.loopEnd = Math.min(track.loopEnd, buffer.duration);
    source.connect(musicGain);
    musicGain.gain.cancelScheduledValues(ctx.currentTime); musicGain.gain.setValueAtTime(0, ctx.currentTime); musicGain.gain.linearRampToValueAtTime(.56, ctx.currentTime + .26);
    source.start(0, offset);
    current = { key, track, source, offset, startedAt:ctx.currentTime };
  }

  function activeScreenId() {
    try { return frame?.contentDocument?.querySelector('.screen.active')?.id || ''; } catch (_) { return ''; }
  }

  function routeFor(screen) {
    if (!entered || !screen) return null;
    if (screen === 'shopScreen') return 'shop';
    if (screen === 'deckScreen') return 'deck';
    if (SILENT_SCREENS.has(screen)) return null;
    return 'main';
  }

  function syncRoute(force=false) {
    if (!entered) return;
    const screen = activeScreenId();
    if (!force && screen === lastScreen) return;
    lastScreen = screen;
    const route = routeFor(screen);
    if (!route) { stopCurrent(true, .18); return; }
    playTrack(route).catch(error => console.error('TTD music route failed', error));
  }

  async function playWelcome() {
    const ctx = await unlock();
    if (!ctx) return;
    const url = WELCOME[Math.floor(Math.random() * WELCOME.length)];
    let buffer;
    try { buffer = await load(url); } catch (error) { console.error('TTD welcome voice load failed', error); return; }
    return new Promise(resolve => {
      const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(voiceGain);
      source.addEventListener('ended', resolve, {once:true});
      source.start();
    });
  }

  async function enterMainMenu() {
    entered = true; positions.clear(); lastScreen = '';
    await playTrack('main', {restart:true});
  }

  function silence() { stopCurrent(true, .15); }

  frame?.addEventListener('load', () => setTimeout(() => syncRoute(true), 80));
  poll = window.setInterval(syncRoute, 180);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { context?.suspend?.().catch?.(()=>{}); }
    else if (entered) { context?.resume?.().catch?.(()=>{}); syncRoute(true); }
  });

  window.__TTD_AUDIO_V27 = Object.freeze({ TRACKS, WELCOME, SILENT_SCREENS, preloadPromise, unlock, playWelcome, enterMainMenu, syncRoute, silence });
})();
