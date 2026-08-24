(() => {
  'use strict';
  if(window.__TTD_AUDIO_V32)return;
  const frame=document.getElementById('gameFrame');
  const asset=(path)=>{try{return window.__TTD_ASSET_URL?.(path)||path;}catch(_){return path;}};
  const TRACKS=Object.freeze({
    main:{url:asset('/assets/audio/main-menu.webm'),loopStart:4.49,loopEnd:195.23},
    shop:{url:asset('/assets/audio/shop-remix.webm'),loopStart:13.02,loopEnd:159.43},
    deck:{url:asset('/assets/audio/deck-construction.webm'),loopStart:21.18,loopEnd:112.45},
    gacha:{url:asset('/assets/audio/gacha.webm'),loopStart:.03,loopEnd:88.63}
  });
  const WELCOME=Object.freeze([
    asset('/assets/audio/welcome-rng-1.mp3'),asset('/assets/audio/welcome-rng-2.mp3'),
    asset('/assets/audio/welcome-rng-3.mp3'),asset('/assets/audio/welcome-rng-4.mp3')
  ]);
  const ANNOUNCER=Object.freeze({
    mission:asset('/assets/audio/announcer/Mission.mp3'),
    start:asset('/assets/audio/announcer/Start.mp3'),
    combatStart:asset('/assets/audio/announcer/CombatStart.mp3'),
    clear:asset('/assets/audio/announcer/MissionClear.mp3'),
    fail:asset('/assets/audio/announcer/MissionFail.mp3'),
    finish:asset('/assets/audio/announcer/Finish.mp3'),
    redTeam:asset('/assets/audio/announcer/RedTeam.mp3'),
    blueTeam:asset('/assets/audio/announcer/BlueTeam.mp3'),
    wins:asset('/assets/audio/announcer/Wins.mp3')
  });
  const SILENT_SCREENS=new Set(['gameModesScreen','modeScreen','zombieModeScreen','adventureScreen','stageScreen','missionScreen','gameScreen']);
  const buffers=new Map();
  let context=null,master=null,musicGain=null,voiceGain=null,current=null,entered=false,lastScreen='';
  let activeVoice=null,lastVoiceKey='',lastVoiceAt=-Infinity,voiceQueue=Promise.resolve();

  function ensureContext(){
    if(context&&context.state!=='closed')return context;
    const Ctor=window.AudioContext||window.webkitAudioContext;if(!Ctor)return null;
    context=window.__ttdAudioContext&&window.__ttdAudioContext.state!=='closed'?window.__ttdAudioContext:new Ctor();
    window.__ttdAudioContext=context;
    master=context.createGain();musicGain=context.createGain();voiceGain=context.createGain();
    master.gain.value=1;musicGain.gain.value=.56;voiceGain.gain.value=.92;
    musicGain.connect(master);voiceGain.connect(master);master.connect(context.destination);return context;
  }
  async function unlock(){const ctx=ensureContext();if(!ctx)return null;try{await ctx.resume();}catch(_){}window.__ttdAudioUnlocked=true;return ctx;}
  async function load(url){
    if(buffers.has(url))return buffers.get(url);
    const promise=fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Audio ${r.status}: ${url}`);return r.arrayBuffer();}).then(bytes=>ensureContext().decodeAudioData(bytes));
    buffers.set(url,promise);try{return await promise;}catch(error){buffers.delete(url);throw error;}
  }
  const preloadPromise=Promise.allSettled([...Object.values(TRACKS).map(t=>load(t.url)),...WELCOME.map(load),...Object.values(ANNOUNCER).map(load)]);
  function fadeParam(param,value,seconds=.22){if(!context)return;const now=context.currentTime;param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);param.linearRampToValueAtTime(value,now+seconds);}
  function stopCurrent(fade=.18){const playing=current;if(!playing||!context)return;fadeParam(musicGain.gain,0,fade);const src=playing.source;setTimeout(()=>{try{src.stop();}catch(_){}},Math.ceil((fade+.04)*1000));current=null;}
  async function playTrack(key){
    if(!entered||!TRACKS[key])return;const ctx=await unlock();if(!ctx)return;if(current)stopCurrent(.16);
    const track=TRACKS[key];let buffer;try{buffer=await load(track.url);}catch(error){console.error('TTD music load failed',error);return;}if(!entered)return;
    const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.loopStart=track.loopStart;source.loopEnd=Math.min(track.loopEnd,buffer.duration);source.connect(musicGain);
    musicGain.gain.cancelScheduledValues(ctx.currentTime);musicGain.gain.setValueAtTime(0,ctx.currentTime);musicGain.gain.linearRampToValueAtTime(.56,ctx.currentTime+.26);source.start(0,0);current={key,track,source,startedAt:ctx.currentTime};
  }
  function activeScreenId(){try{return frame?.contentDocument?.querySelector('.screen.active')?.id||'';}catch(_){return '';}}
  function routeFor(screen){if(!entered||!screen)return null;if(screen==='shopScreen')return'shop';if(screen==='deckScreen')return'deck';if(screen==='gachaScreen')return'gacha';if(SILENT_SCREENS.has(screen))return null;return'main';}
  function syncRoute(force=false){if(!entered)return;const screen=activeScreenId();if(!force&&screen===lastScreen)return;lastScreen=screen;const route=routeFor(screen);if(!route){stopCurrent(.18);return;}playTrack(route).catch(error=>console.error('TTD music route failed',error));}
  async function playWelcome(){const ctx=await unlock();if(!ctx)return;const url=WELCOME[Math.floor(Math.random()*WELCOME.length)];let buffer;try{buffer=await load(url);}catch(error){console.error('TTD welcome voice load failed',error);return;}return new Promise(resolve=>{const source=ctx.createBufferSource();source.buffer=buffer;source.connect(voiceGain);source.addEventListener('ended',resolve,{once:true});source.start();});}
  async function playVoiceNow(key){
    const url=ANNOUNCER[key];if(!url)return false;
    const ctx=await unlock();if(!ctx)return false;let buffer;
    try{buffer=await load(url);}catch(error){console.error('TTD announcer voice load failed',key,error);return false;}
    return new Promise(resolve=>{
      const source=ctx.createBufferSource();source.buffer=buffer;source.connect(voiceGain);activeVoice=source;
      let finished=false;
      const finish=(ok=true)=>{if(finished)return;finished=true;if(activeVoice===source)activeVoice=null;resolve(ok);};
      source.addEventListener('ended',()=>finish(true),{once:true});
      try{source.start();}catch(error){console.error('TTD announcer voice start failed',key,error);finish(false);}
    });
  }
  function playVoiceCue(key){
    if(!ANNOUNCER[key])return Promise.resolve(false);
    const now=performance.now();if(key===lastVoiceKey&&now-lastVoiceAt<300)return Promise.resolve(true);lastVoiceKey=key;lastVoiceAt=now;
    // Do not pre-empt the current phrase. Result follow-up cues wait their turn so a long
    // MissionFail/MissionClear recording is heard all the way through.
    const run=()=>playVoiceNow(key);const queued=voiceQueue.then(run,run);voiceQueue=queued.catch(()=>false);return queued;
  }
  async function enterMainMenu(){entered=true;lastScreen='';await playTrack('main');}
  function silence(){stopCurrent(.15);}
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
    const message=event.data||{};if(message.type!=='ttd:voice-cue')return;
    const cue=String(message.cue||''),requestId=String(message.requestId||'');
    Promise.resolve(playVoiceCue(cue)).then(ok=>{
      if(!requestId)return;
      try{frame?.contentWindow?.postMessage({type:'ttd:voice-cue-complete',requestId,cue,ok:ok!==false},location.origin);}catch(_){}
    }).catch(error=>{
      console.error('TTD announcer cue failed',error);
      if(requestId){try{frame?.contentWindow?.postMessage({type:'ttd:voice-cue-complete',requestId,cue,ok:false},location.origin);}catch(_){} }
    });
  });
  frame?.addEventListener('load',()=>setTimeout(()=>syncRoute(true),80));window.setInterval(syncRoute,180);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){context?.suspend?.().catch?.(()=>{});}else if(entered){context?.resume?.().catch?.(()=>{});syncRoute(true);}});
  window.__TTD_AUDIO_V32=Object.freeze({TRACKS,WELCOME,ANNOUNCER,SILENT_SCREENS,preloadPromise,unlock,playWelcome,playVoiceCue,enterMainMenu,syncRoute,silence});
  window.__TTD_AUDIO_V31=window.__TTD_AUDIO_V32;
  window.__TTD_AUDIO_V27=window.__TTD_AUDIO_V32;
})();