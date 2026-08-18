import fs from 'node:fs';
import vm from 'node:vm';

const loader=fs.readFileSync('online/game-loader.js','utf8');
const editor=fs.readFileSync('online/deck-editor-v18.js','utf8');
const client=fs.readFileSync('online/deck-social-client-v18.js','utf8');
const clientEntry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
const functions=fs.readFileSync('functions/deck-social-v18.js','utf8');
const functionsEntry=fs.readFileSync('functions/main-v6.js','utf8');

new vm.Script(editor,{filename:'online/deck-editor-v18.js'});
new vm.Script(functions,{filename:'functions/deck-social-v18.js'});

const requireMarkers=(text,markers,label)=>{for(const marker of markers)if(!text.includes(marker))throw new Error(`${label} missing: ${marker}`);};

requireMarkers(loader,["'/online/collection-portrait-fit-v16.js?v=16'","'/online/deck-editor-v18.js?v=18'"],'loader');
requireMarkers(loader,['const isolatedSources=sources.map','failed without blocking later bridges.','bridge-runtime-error'],'bridge isolation');
if(loader.indexOf("'/online/deck-editor-v18.js?v=18'")<loader.indexOf("'/online/collection-portrait-fit-v16.js?v=16'"))throw new Error('Deck editor must load after Collection authority.');

const isolationStart=loader.indexOf('    const isolatedSources=sources.map((source,index)=>{');
const isolationEnd=loader.indexOf('    transformed=transformed.slice(0,markerIndex)',isolationStart);
if(isolationStart<0||isolationEnd<0)throw new Error('Could not extract the actual bridge-isolation block for runtime testing.');
const isolationBlock=loader.slice(isolationStart,isolationEnd);
const isolationContext={console:{error(){}},send(){}};
vm.runInNewContext(`const sources=["(()=>{throw new Error('synthetic bridge failure');})();","globalThis.__deckEditorSurvived=true;"];const BRIDGES=['synthetic-first-bridge','synthetic-deck-editor'];${isolationBlock};globalThis.__assembled=isolatedSources.join('\\n');`,isolationContext);
vm.runInNewContext(isolationContext.__assembled,isolationContext);
if(isolationContext.__deckEditorSurvived!==true)throw new Error('A failing earlier bridge still prevents a later Deck Editor bridge from executing.');

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
  'const LEVEL_CAP = 100;',
  "const CUSTOM_DECK_NAME = /^[A-Za-z0-9]{1,12}$/;",
  'if (name === defaultDeckName(index)) return name;',
  'return step * step * 100;',
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
  "formula: '100 * (level - 1)^2'",
],'deck/social functions');
if(!functionsEntry.includes("const deckSocial = require('./deck-social-v18');")||!functionsEntry.includes('...deckSocial'))throw new Error('Cloud entrypoint does not export deck/social v18 services.');

console.log('Deck/social v18 verified: explicit Save and Equip, 12-character alphanumeric names, guarded unsaved exits, bridge-failure isolation, friend active decks/messages/shared dice, and levels 1-100 are wired end to end.');