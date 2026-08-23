import fs from 'node:fs';
const audio=fs.readFileSync('online/audio-client-v27.js','utf8');
const splash=fs.readFileSync('online/startup-polish-v28.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const requiredAudio=[
  '/assets/audio/main-menu.webm','loopStart:4.49','loopEnd:195.23',
  '/assets/audio/shop-remix.webm','loopStart:13.02','loopEnd:159.43',
  '/assets/audio/deck-construction.webm','loopStart:21.18','loopEnd:112.45',
  '/assets/audio/gacha.webm','loopEnd:88.63',
  'welcome-rng-1.mp3','welcome-rng-2.mp3','welcome-rng-3.mp3','welcome-rng-4.mp3',
  '/assets/audio/announcer/Mission.mp3','/assets/audio/announcer/Start.mp3','/assets/audio/announcer/CombatStart.mp3',
  '/assets/audio/announcer/MissionClear.mp3','/assets/audio/announcer/MissionFail.mp3','/assets/audio/announcer/Finish.mp3',
  '/assets/audio/announcer/RedTeam.mp3','/assets/audio/announcer/BlueTeam.mp3','/assets/audio/announcer/Wins.mp3',
  'ANNOUNCER','playVoiceCue','playVoiceNow','voiceQueue=Promise.resolve()','voiceQueue.then(run,run)','ttd:voice-cue','...Object.values(ANNOUNCER).map(load)',
  'shopScreen','deckScreen','gachaScreen','gameModesScreen','gameScreen','source.loopStart','source.loopEnd','Math.random()','enterMainMenu','source.start(0,0)'
];
for(const marker of requiredAudio)if(!audio.includes(marker))throw new Error(`Audio v32 missing: ${marker}`);
if(audio.includes('activeVoice.stop()'))throw new Error('Announcer cues must not pre-empt a phrase already playing.');
if(audio.includes('positions.set(')||audio.includes('positions.get('))throw new Error('Music must not resume saved positions after leaving a page.');
for(const marker of ["font-family:'CCDangerGirlOpen'",'randomRay(c)','links.push','b.links.forEach','audio?.playWelcome?.()','await sleep(95)','audio?.enterMainMenu?.()','ttdBlackV28'])if(!splash.includes(marker))throw new Error(`Splash polish v28 missing: ${marker}`);
if(!entry.includes("import './audio-client-v27.js?v=32';"))throw new Error('Single-player client does not load audio v32.');
if(entry.indexOf('audio-client-v27')>entry.indexOf('startup-splash-v26'))throw new Error('Audio manager must load before splash.');
if(entry.indexOf('startup-polish-v28')<entry.indexOf('startup-splash-v26'))throw new Error('Splash polish must load after the base splash.');
if(splash.indexOf('playWelcome')>splash.indexOf('enterMainMenu'))throw new Error('Welcome voice must begin before main-menu music starts.');
console.log('Audio v32 verified: page music and welcome RNG remain wired, while announcer phrases serialize so FAIL/CLEAR finish before later cues.');
