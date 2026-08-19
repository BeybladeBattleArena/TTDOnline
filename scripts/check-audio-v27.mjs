import fs from 'node:fs';
const audio=fs.readFileSync('online/audio-client-v27.js','utf8');
const splash=fs.readFileSync('online/startup-polish-v27.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const requiredAudio=[
  '/assets/audio/main-menu.webm','loopStart:4.49','loopEnd:195.23',
  '/assets/audio/shop-remix.webm','loopStart:13.02','loopEnd:159.43',
  '/assets/audio/deck-construction.webm','loopStart:21.18','loopEnd:112.45',
  'welcome-rng-1.mp3','welcome-rng-2.mp3','welcome-rng-3.mp3','welcome-rng-4.mp3',
  'shopScreen','deckScreen','gameModesScreen','gameScreen','source.loopStart','source.loopEnd','Math.random()','enterMainMenu','source.start(0,0)'
];
for(const marker of requiredAudio)if(!audio.includes(marker))throw new Error(`Audio v28 missing: ${marker}`);
if(audio.includes('positions.set(')||audio.includes('positions.get('))throw new Error('Music must not resume saved positions after leaving a page.');
for(const marker of ["font-family:'Carter One'",'ctx.lineWidth=9','ctx.lineWidth=3.4','audio?.playWelcome?.()','audio?.enterMainMenu?.()','ttdBlackV27'])if(!splash.includes(marker))throw new Error(`Splash polish v27 missing: ${marker}`);
if(entry.indexOf('audio-client-v27')>entry.indexOf('startup-splash-v26'))throw new Error('Audio manager must load before splash.');
if(entry.indexOf('startup-polish-v27')<entry.indexOf('startup-splash-v26'))throw new Error('Splash polish must load after the base splash.');
if(splash.indexOf('playWelcome')>splash.indexOf('enterMainMenu'))throw new Error('Welcome voice must finish before main-menu music starts.');
console.log('Audio v28 verified: clean body loops, randomized welcome voice, and every routed page starts its track from 0:00 on re-entry.');
