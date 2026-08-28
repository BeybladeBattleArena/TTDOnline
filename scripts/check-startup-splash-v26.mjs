import fs from 'node:fs';

const splash=fs.readFileSync('online/startup-splash-v26.js','utf8');
const gate=fs.readFileSync('online/startup-gate-v33.js','utf8');
const polish=fs.readFileSync('online/startup-polish-v28.js','utf8');
const diagnosticGuard=fs.readFileSync('online/bridge-diagnostic-guard-v1.js','utf8');
const sessionGuard=fs.readFileSync('online/bridge-session-guard-v2.js','utf8');
const firebase=fs.readFileSync('online/firebase-client-v4.js','utf8');
const firebaseConfig=fs.readFileSync('firebase.json','utf8');
const onlineHtml=fs.readFileSync('online.html','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
new Function(splash);
new Function(gate);
new Function(polish);
new Function(diagnosticGuard);
new Function(sessionGuard);

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

const gateRequired=[
  'window.__TTD_STARTUP_GATE_V33',
  'const CRITICAL_ASSETS=Object.freeze([',
  "'/assets/ui/loading-endless-horde.png'",
  "'/assets/ui/loading-al-hata.png'",
  "'/assets/items/gift-box-pink.png'",
  "'/assets/items/gift-box-icy.png'",
  'child.__TTD_ASSET_URL(path)',
  'Promise.all(Array.from({length:4},worker))',
  'Promise.race([welcomePromise,sleep(5000)])',
  'waitOperational(20000)',
  "status?.dataset?.kind==='ok'",
  'child.__TTD_CORE_API_V1',
  "home.classList.contains('active')",
  "console.warn('TTD nonfatal startup asset preload failure'",
  'Promise.race([criticalPromise,sleep(1200)])',
  'function startupFailureReason(error)',
  "greeting.textContent=lastError",
  "tap.textContent='TAP TO RETRY'",
  'splash.hidden=true',
  'audio?.enterMainMenu?.()',
  "splash.addEventListener('pointerup',intercept,true)",
  'event.stopImmediatePropagation()',
];
for(const marker of gateRequired)if(!gate.includes(marker))throw new Error(`Startup gate v34 behavior missing: ${marker}`);
if(gate.indexOf('preloadCritical()')>gate.indexOf('waitOperational(20000)'))throw new Error('Critical image preload must begin no later than the operational readiness wait.');
if(gate.includes('child.__TTD_ITEM_ASSETS_V1')||gate.includes('child.__TTD_WORLD_ITEMS_V1'))throw new Error('Startup readiness must not depend on optional item/world bridge globals.');
if(gate.includes("/cloud account ready/i.test(status?.textContent"))throw new Error('Startup gate must not use human-readable status copy as a readiness API.');
if(gate.includes("console.warn('TTD startup reveal timed out"))throw new Error('Startup gate may not reveal the game after a readiness timeout.');

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

const diagnosticRequired=[
  'window.__TTD_BRIDGE_DIAGNOSTIC_GUARD_V1',
  "message.type !== 'ttd:bridge-phase' || message.phase !== 'bridge-runtime-error'",
  "console.warn('[TTD nonfatal bridge diagnostic]'",
  "window.__TTD_BRIDGE_DIAGNOSTICS = diagnostics",
  "sessionStorage.setItem(STORAGE_KEY",
  "event.stopImmediatePropagation()",
];
for(const marker of diagnosticRequired)if(!diagnosticGuard.includes(marker))throw new Error(`Legacy bridge diagnostic guard missing: ${marker}`);

const sessionRequired=[
  'window.__TTD_BRIDGE_SESSION_GUARD_V2',
  "new Set(['loader-started','assets-loaded','document-ready'])",
  "message.type === 'ttd:bridge-synced'",
  "phase === 'bridge-runtime-error' || !isStartupPhase || synced",
  "event.stopImmediatePropagation()",
  "window.__TTD_BRIDGE_DIAGNOSTICS_V2 = diagnostics",
];
for(const marker of sessionRequired)if(!sessionGuard.includes(marker))throw new Error(`Synchronous bridge session guard missing: ${marker}`);

const firebaseRequired=[
  "const STARTUP_BRIDGE_PHASES = new Set(['loader-started', 'assets-loaded', 'document-ready'])",
  'let bridgeSessionSynced = false',
  'if (bridgeSessionSynced) return;',
  'if (bridgeSessionSynced || !STARTUP_BRIDGE_PHASES.has(phase))',
  "console.warn('[TTD ignored non-startup bridge phase]'",
  'bridgeSessionSynced = true',
  'if (bridgeSessionSynced) return;\n    gameFrame.hidden = true;',
];
for(const marker of firebaseRequired)if(!firebase.includes(marker))throw new Error(`Firebase bridge watchdog contract missing: ${marker}`);
if(firebase.includes("armBridgeTimer(`The secure game loader stopped during ${message.phase || 'startup'}.`)"))throw new Error('Firebase may not arm the fatal watchdog for arbitrary bridge phases.');

if(!firebaseConfig.includes('"source": "/assets/**"')||!firebaseConfig.includes('no-cache, no-store, must-revalidate'))throw new Error('Active game assets must remain no-store so replaced art can never be trapped behind a stale immutable cache.');
if(!firebaseConfig.includes('"source": "**/*.@(html|js|css|json)"')||!firebaseConfig.includes('no-cache, no-store, must-revalidate'))throw new Error('Code and manifest shell files must remain no-store.');

const syncGuardTag='<script src="/online/bridge-session-guard-v2.js?v=2"></script>';
const firebaseTag='<script type="module" src="/online/firebase-client-v4.js?v=4"></script>';
if(!onlineHtml.includes(syncGuardTag))throw new Error('Online shell does not synchronously load bridge-session-guard-v2.');
if(onlineHtml.indexOf(syncGuardTag)>onlineHtml.indexOf(firebaseTag))throw new Error('Bridge session guard must be a classic script registered before Firebase installs its message listener.');

const diagnosticImport="import './bridge-diagnostic-guard-v1.js?v=1';";
if(!entry.includes(diagnosticImport))throw new Error('Online client lost the secondary bridge diagnostic logger.');
if(!entry.includes("import './startup-splash-v26.js?v=31';"))throw new Error('Online client does not load startup splash v31 behavior.');
if(!entry.includes("import './startup-gate-v33.js?v=34';"))throw new Error('Online client does not load startup gate v34 behavior.');
if(!entry.includes("import './startup-polish-v28.js?v=31';"))throw new Error('Online client does not load startup polish v31 behavior.');
if(entry.indexOf('startup-splash-v26')>entry.indexOf('startup-gate-v33'))throw new Error('Startup gate must initialize after the splash exists.');
if(entry.indexOf('startup-gate-v33')>entry.indexOf('startup-polish-v28'))throw new Error('Startup gate must register before legacy startup-polish tap interception.');
if(entry.indexOf('startup-splash-v26')>entry.indexOf('singleplayer-client-v9-core'))throw new Error('Startup splash must initialize before the legacy game core client.');
if(!/DICE_COUNT\s*=\s*(?:2\d\d|[3-9]\d\d)/.test(splash))throw new Error('Startup background must contain hundreds of generated dice.');
if(splash.indexOf("'Okay, Die Master'")>splash.indexOf("'TAP to DIE'"))throw new Error('Greeting must type before TAP to DIE.');
if(splash.indexOf('unlockAudioFromGesture()')>splash.indexOf("tapButton.textContent=accountReady()?"))throw new Error('Audio unlock must happen synchronously before post-tap waiting UI.');
if(splash.indexOf('sequenceToken++;')>splash.indexOf('diceReveal=1'))throw new Error('Early title skip must cancel the in-flight animation before forcing its final state.');
console.log('Startup v35 verified: entry waits on Firebase bridge sync plus an active native Home screen, eager PNG preload is nonfatal, and retry exposes the actual startup failure instead of silently bouncing.');
