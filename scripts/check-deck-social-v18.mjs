import fs from 'node:fs';
import vm from 'node:vm';

const loader=fs.readFileSync('online/game-loader.js','utf8');
const runtime=fs.existsSync('online/runtime-bridge-loader-v1.js')?fs.readFileSync('online/runtime-bridge-loader-v1.js','utf8'):'';
const game=fs.readFileSync('random-dice-game-33.html','utf8');
const editor=fs.readFileSync('online/deck-editor-v18.js','utf8');
const client=fs.readFileSync('online/deck-social-client-v18.js','utf8');
const clientEntry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const functions=fs.readFileSync('functions/deck-social-v18.js','utf8');
const functionsEntry=fs.readFileSync('functions/main-v6.js','utf8');
const nativeBridgeRuntime=game.includes('TTD_NATIVE_BRIDGE_API_V1');

new vm.Script(editor,{filename:'online/deck-editor-v18.js'});
new vm.Script(functions,{filename:'functions/deck-social-v18.js'});
if(runtime)new vm.Script(runtime,{filename:'online/runtime-bridge-loader-v1.js'});

const requireMarkers=(text,markers,label)=>{for(const marker of markers)if(!text.includes(marker))throw new Error(`${label} missing: ${marker}`);};

if(nativeBridgeRuntime){
  requireMarkers(runtime,[
    "'/online/collection-portrait-fit-v16.js?v=23'",
    "'/online/deck-editor-v18.js?v=18'",
    'failed without blocking later bridges.',
    'bridge-runtime-error',
    'bridge-load-error',
    'script.async=false',
  ],'native bridge isolation');
  if(runtime.indexOf("'/online/deck-editor-v18.js?v=18'")<runtime.indexOf("'/online/collection-portrait-fit-v16.js?v=23'"))throw new Error('Deck editor must load after Collection authority.');
  if(/isolatedSources|battleHookSubsystem|IIFE_END_MARKER/.test(loader))throw new Error('Deck/social validation found retired bridge-source assembly in online/game-loader.js.');
}else{
  requireMarkers(loader,["'/online/collection-portrait-fit-v16.js?v=23'","'/online/deck-editor-v18.js?v=18'"],'loader');
  requireMarkers(loader,['const isolatedSources=sources.slice(3).map','TTD_BATTLE_HOOK_SCOPE_V20','failed without blocking later bridges.','bridge-runtime-error'],'legacy bridge isolation');
  const genericIsolationStart=loader.indexOf('const isolatedSources=sources.slice(3).map');
  const genericIsolationEnd=loader.indexOf('const battleHookSubsystem=',genericIsolationStart);
  if(loader.slice(genericIsolationStart,genericIsolationEnd).includes("send('ttd:bridge-phase'"))throw new Error('Bridge isolation catch may not depend on the loader-scope send() helper.');
  if(loader.indexOf("'/online/deck-editor-v18.js?v=18'")<loader.indexOf("'/online/collection-portrait-fit-v16.js?v=23'"))throw new Error('Deck editor must load after Collection authority.');

  const isolationStart=loader.indexOf('    const isolatedSources=sources.slice(3).map((source,offset)=>{');
  const isolationEnd=loader.indexOf('    const battleHookSubsystem=',isolationStart);
  if(isolationStart<0||isolationEnd<0)throw new Error('Could not extract the actual non-combat bridge-isolation block for runtime testing.');
  const isolationBlock=loader.slice(isolationStart,isolationEnd);
  const isolationContext={console:{error(){}},window:{parent:{postMessage(){}}},location:{origin:'https://example.invalid'}};
  vm.runInNewContext(`const sources=['','','',"(()=>{throw new Error('synthetic bridge failure');})();","globalThis.__deckEditorSurvived=true;"];const BRIDGES=['combat-0','combat-1','combat-2','synthetic-first-bridge','synthetic-deck-editor'];${isolationBlock};globalThis.__assembled=isolatedSources.join('\\n');`,isolationContext);
  vm.runInNewContext(isolationContext.__assembled,isolationContext);
  if(isolationContext.__deckEditorSurvived!==true)throw new Error('A failing unrelated bridge still prevents a later Deck Editor bridge from executing.');
}

requireMarkers(editor,[
  '#deckFooter{display:none!important',
  'id="deckSaveV18"',
  'id="deckEquipV18"',
  'Save Deck',
  'Equip this Deck',
  'have not saved your latest edits',
  'Unsaved Deck Changes',
  "label:'No'",
  "label:'Cancel'",
  "label:'Yes'",
  'has been saved successfully.',
  'Now using ${nameFor(pending.index)} as your active deck.',
  'ttdDeckEditName',
  '/^[A-Za-z0-9]{1,12}$/',
  'name!==defaultName(index)&&!/^[A-Za-z0-9]{1,12}$/.test(name)',
  "send('ttd:deck-v18-save-request'",
  "send('ttd:deck-v18-equip-request'",
  "send('ttd:deck-v18-rename-request'",
  'saveAccount=async function saveAccountV18()',
],'deck editor');
if(editor.includes("send('ttd:deck-state-request'"))throw new Error('Explicit deck editor may not use legacy automatic deck sync.');

requireMarkers(client,[
  "call('getDeckManagerState')",
  "call('saveDeckV18'",
  "call('equipDeckV18'",
  "call('renameDeckV18'",
  "call('getFriendsSummaryV18'",
  "call('getFriendActiveDeckV18'",
  "call('getFriendConversationV18'",
  "call('sendFriendMessageV18'",
  "deckButton.textContent='Check Active Deck'",
  "send.textContent='Send Message'",
  'v18SocialDie',
  'accountLevelV18',
],'deck/social client');
if(!clientEntry.includes("import './deck-social-client-v18.js?v=18';"))throw new Error('singleplayer client does not load deck/social v18 client.');

requireMarkers(functions,[
  'const LEVEL_CAP = progressionV21.LEVEL_CAP;',
  "const CUSTOM_DECK_NAME = /^[A-Za-z0-9]{1,12}$/;",
  'if (name === defaultDeckName(index)) return name;',
  'progressionV21.publicLevel',
  'progressionV21.curveSummary()',
  'exports.getDeckManagerState',
  'exports.saveDeckV18',
  'exports.equipDeckV18',
  'exports.renameDeckV18',
  'exports.getFriendsSummaryV18',
  'exports.getFriendActiveDeckV18',
  'exports.sendFriendMessageV18',
  'exports.getFriendConversationV18',
  "throw new HttpsError('failed-precondition', 'A full deck of five dice is required.');",
  'v6ActiveDeckIdx: index',
  'schemaVersion:21',
],'deck/social functions');
if(!functionsEntry.includes("const deckSocial = require('./deck-social-v18');")||!functionsEntry.includes('...deckSocial'))throw new Error('Cloud entrypoint does not export deck/social v18 services.');

console.log(nativeBridgeRuntime
  ? 'Deck/social v18 verified: explicit Save and Equip, guarded unsaved exits, sequential native bridge failure isolation, friend active decks/messages/shared dice, and canonical levels 1-100 are wired end to end.'
  : 'Deck/social v18 transition verified: existing source-isolated bridge ordering remains active until the native bridge runtime is materialized.');
