import fs from 'node:fs';
import crypto from 'node:crypto';
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
  "source.addEventListener('ended',()=>finish(true),{once:true})", "type:'ttd:voice-cue-complete'",'requestId','Promise.resolve(playVoiceCue(cue)).then',
  'shopScreen','deckScreen','gachaScreen','gameModesScreen','gameScreen','source.loopStart','source.loopEnd','Math.random()','enterMainMenu','source.start(0,0)',
  'routeGeneration=0','generation!==routeGeneration','routeFor(activeScreenId())!==key','const source=ctx.createBufferSource(),gain=ctx.createGain()','source.connect(gain);gain.connect(musicGain)',
  'const route=routeFor(screen),generation=++routeGeneration','stopCurrent(.14)','routeGeneration+=1;stopCurrent(.15)',
  "const MEDIA_ELEMENT_CUES=new Set(['combatStart','fail'])",'function playVoiceMediaElement(key,generation)','const audio=new Audio()','audio.playsInline=true',
  "audio.addEventListener('playing'", "audio.addEventListener('ended',()=>finish(true),{once:true})",'Promise.resolve(audio.play())','return playVoiceBuffer(key,generation)',
  // A terminal FAIL may not be trapped behind a stalled CombatStart/media cue. Playback must
  // prove that it began promptly, release itself if it never ends, and invalidate stale queued
  // voice work before MissionFail starts.
  'const MEDIA_START_TIMEOUT_MS=1400','const MEDIA_END_TIMEOUT_MS=12000','voiceGeneration=0','function cancelActiveVoice()',
  "if(key==='fail')",'const generation=++voiceGeneration;cancelActiveVoice()','const priority=Promise.resolve().then(()=>playVoiceNow(key,generation))',
  'if(generation!==voiceGeneration)return false',"TTD media announcer did not begin; falling back to WebAudio","TTD media announcer did not finish; releasing queue"
];
for(const marker of requiredAudio)if(!audio.includes(marker))throw new Error(`Audio v37 missing: ${marker}`);
if(audio.includes('positions.set(')||audio.includes('positions.get('))throw new Error('Music must not resume saved positions after leaving a page.');
if(audio.includes('source.connect(musicGain);'))throw new Error('Page tracks must use independent source gains; a shared fade gain can revive an outgoing track.');
for(const marker of ["font-family:'CCDangerGirlOpen'",'randomRay(c)','links.push','b.links.forEach','audio?.playWelcome?.()','await sleep(95)','audio?.enterMainMenu?.()','ttdBlackV28'])if(!splash.includes(marker))throw new Error(`Splash polish v28 missing: ${marker}`);
if(!entry.includes("import './audio-client-v27.js?v=34';"))throw new Error('Single-player client does not load restored-original audio v34.');
if(entry.indexOf('audio-client-v27')>entry.indexOf('startup-splash-v26'))throw new Error('Audio manager must load before splash.');
if(entry.indexOf('startup-polish-v28')<entry.indexOf('startup-splash-v26'))throw new Error('Splash polish must load after the base splash.');
if(splash.indexOf('playWelcome')>splash.indexOf('enterMainMenu'))throw new Error('Welcome voice must begin before main-menu music starts.');

function gitBlobSha(path){const b=fs.readFileSync(path),header=Buffer.from(`blob ${b.length}\0`);return crypto.createHash('sha1').update(header).update(b).digest('hex');}
const failSha=gitBlobSha('assets/audio/announcer/MissionFail.mp3');
const combatSha=gitBlobSha('assets/audio/announcer/CombatStart.mp3');
if(failSha!=='84370d8bf50f4e95c60efae8f205f1fa68e24a50')throw new Error(`MissionFail.mp3 is not the user-supplied authoritative original (${failSha}).`);
if(combatSha!=='2ce2410a1519cea618b6364acddb90ba693c8058')throw new Error(`CombatStart.mp3 is not the user-supplied authoritative original (${combatSha}).`);

console.log('Audio v37 verified: authoritative announcer masters remain byte-exact; media cues have start/end watchdogs; terminal MissionFail invalidates stale voice work and bypasses the ordinary serialized queue; page music remains route-cancellable.');
