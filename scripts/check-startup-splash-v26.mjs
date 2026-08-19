import fs from 'node:fs';

const splash=fs.readFileSync('online/startup-splash-v26.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
new Function(splash);

const required=[
  'const DICE_COUNT = 240',
  "font-family:'Cinzel',serif!important",
  '>TIME<',
  '>TO<',
  '>DIE<',
  "translate3d(-125vw,0,0)",
  "translate3d(125vw,0,0)",
  "translate3d(0,125vh,0)",
  "impactWord(timeWord,COLORS.time)",
  "impactWord(toWord,COLORS.to)",
  "impactWord(dieWord,COLORS.die,true)",
  "typeText(greeting,'Okay, Die Master'",
  "typeText(tapButton,'TAP to DIE'",
  "statusEl?.dataset?.kind === 'ok'",
  "/cloud account ready/i",
  "new MutationObserver(syncAuthState).observe(signedInEl",
  "createAudioContext(window)",
  "createAudioContext(child)",
  "'ttd:audio-unlock'",
  "window.__ttdAudioContext",
  "if(!active||!tapped||!bootstrapReady)return",
];
for(const marker of required)if(!splash.includes(marker))throw new Error(`Startup splash v26 missing: ${marker}`);
if(!entry.includes("import './startup-splash-v26.js?v=26';"))throw new Error('Online client does not load startup splash v26.');
if(entry.indexOf('startup-splash-v26')>entry.indexOf('singleplayer-client-v9-core'))throw new Error('Startup splash must initialize before the legacy game core client.');
if(!/DICE_COUNT\s*=\s*(?:2\d\d|[3-9]\d\d)/.test(splash))throw new Error('Startup background must contain hundreds of generated dice.');
if(splash.indexOf("'Okay, Die Master'")>splash.indexOf("'TAP to DIE'"))throw new Error('Greeting must type before TAP to DIE.');
if(splash.indexOf('unlockAudioFromGesture()')>splash.indexOf("tapButton.textContent=accountReady()?"))throw new Error('Audio unlock must happen synchronously before post-tap waiting UI.');
console.log('Startup splash v26 verified: TIME/TO/DIE impacts, 240-die reveal, typewriter landing, auth gate, and audio unlock are wired.');
