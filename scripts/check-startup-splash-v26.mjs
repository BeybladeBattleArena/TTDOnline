import fs from 'node:fs';

const splash=fs.readFileSync('online/startup-splash-v26.js','utf8');
const polish=fs.readFileSync('online/startup-polish-v28.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
new Function(splash);
new Function(polish);

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
  'function finishLandingImmediately()',
  'diceReveal=1',
  "greeting.textContent='Okay, Die Master'",
  "tapButton.textContent='TAP to DIE'",
  'window.__TTD_STARTUP_SPLASH_V31=Object.freeze',
  'skipToEnd:finishLandingImmediately',
  'get promptReady(){return promptReady;}',
];
for(const marker of required)if(!splash.includes(marker))throw new Error(`Startup splash v31 behavior missing: ${marker}`);

const polishRequired=[
  'window.__TTD_STARTUP_POLISH_V31',
  'async function waitReady(maxMs=8000)',
  'Promise.race([welcomePromise,sleep(5000)])',
  "Promise.resolve(audio?.enterMainMenu?.()).catch",
  'function revealFromBlack()',
  'finally {\n      revealFromBlack();',
  'function promptIsReady()',
  'window.__TTD_STARTUP_SPLASH_V31?.skipToEnd?.()',
  'let skipGestureUntil=0',
  "event.type==='click'&&performance.now()<skipGestureUntil",
  'skipGestureUntil=performance.now()+500',
  'event.stopImmediatePropagation()',
];
for(const marker of polishRequired)if(!polish.includes(marker))throw new Error(`Startup polish v31 behavior missing: ${marker}`);
if(polish.includes('await audio?.enterMainMenu?.()'))throw new Error('Visual startup reveal may not wait on main-menu audio.');
if(!entry.includes("import './startup-splash-v26.js?v=31';"))throw new Error('Online client does not load startup splash v31 behavior.');
if(!entry.includes("import './startup-polish-v28.js?v=31';"))throw new Error('Online client does not load startup polish v31 behavior.');
if(entry.indexOf('startup-splash-v26')>entry.indexOf('singleplayer-client-v9-core'))throw new Error('Startup splash must initialize before the legacy game core client.');
if(!/DICE_COUNT\s*=\s*(?:2\d\d|[3-9]\d\d)/.test(splash))throw new Error('Startup background must contain hundreds of generated dice.');
if(splash.indexOf("'Okay, Die Master'")>splash.indexOf("'TAP to DIE'"))throw new Error('Greeting must type before TAP to DIE.');
if(splash.indexOf('unlockAudioFromGesture()')>splash.indexOf("tapButton.textContent=accountReady()?"))throw new Error('Audio unlock must happen synchronously before post-tap waiting UI.');
if(splash.indexOf('sequenceToken++;')>splash.indexOf('diceReveal=1'))throw new Error('Early title skip must cancel the in-flight animation before forcing its final state.');
console.log('Startup splash verified: full animated opener remains intact, an early tap jumps to the complete title card and waits for a distinct second enter tap, and the black entry fade can no longer be held hostage by menu audio or an endless readiness wait.');
