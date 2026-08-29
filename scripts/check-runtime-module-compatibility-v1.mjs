import fs from 'node:fs';
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';

const runtimeFiles = [
  'online/dice-catalog-bridge-v8.js',
  'online/soul-scimitar-svg-v14.js',
  'online/slither-vine-bridge-v8.js',
  'online/game-bridge-inner.js',
  'online/progression-bridge-v5.js',
  'online/singleplayer-bridge-v6.js',
  'online/merge-bridge-v6.js',
  'online/run-ui-bridge-v21.js',
  'online/refresh-bridge-v6.js',
  'online/mobile-input-bridge-v9.js',
  'online/interaction-effects-v10.js',
  'online/collection-portrait-fit-v16.js',
  'online/deck-editor-v18.js',
  // Item/world/avatar authorities are ordinary runtime modules and must stay facade-safe.
  'online/item-assets-v1.js',
  'online/world-items-v1.js',
  'online/avatar-inventory-v22.js',
  // Moving Screen stage data and rebuilt game-shell engine are ordinary committed runtime modules.
  'online/moving-screen-neon-rooftops-v2.js',
  'online/moving-screen-engine-v4.js',
  // These files are fetched/evaluated by run-ui-bridge-v21. They must be audited separately;
  // identifiers inside fetched source strings are invisible to a static audit of run-ui itself.
  'online/adventure-platforming-v2.js',
  'online/adventure-platforming-selector-v6.js',
  'online/adventure-continuous-world-v1.js',
  'online/adventure-pseudo3d-battle-v1.js',
  'online/game-presentation-v1.js',
];

const intentionallyOptionalLegacy = new Set(['renderCollection']);
const browserGlobals = new Set([
  'window','document','location','navigator','console','performance','requestAnimationFrame','cancelAnimationFrame',
  'setTimeout','clearTimeout','setInterval','clearInterval','fetch','URL','URLSearchParams','Blob','Image','Audio','Event','CustomEvent',
  'MutationObserver','ResizeObserver','IntersectionObserver','HTMLElement','HTMLCanvasElement','Node','Element','DOMParser',
  'localStorage','sessionStorage','crypto','structuredClone','atob','btoa','alert','confirm','prompt','eval',
  'innerHeight','innerWidth','Math','Date','JSON','Object','Array','Set','Map','WeakSet','WeakMap','Promise','Number','String',
  'Boolean','RegExp','Error','TypeError','parseInt','parseFloat','isNaN','Infinity','NaN','undefined','Intl','CSS',
  'getComputedStyle','devicePixelRatio','queueMicrotask','TextDecoder','TextEncoder','AbortController',
]);

function analyze(source, file) {
  const ast = espree.parse(source, { ecmaVersion:'latest', sourceType:'script', range:true, loc:true, comment:true });
  return eslintScope.analyze(ast, { ecmaVersion:2024, sourceType:'script', optimistic:true, ignoreEval:true });
}
function refMode(ref) {const r=ref.isRead(),w=ref.isWrite();return r&&w?'RW':w?'W':'R';}

const html=fs.readFileSync('random-dice-game-33.html','utf8');
const scriptBodies=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
const coreSource=scriptBodies.sort((a,b)=>b.length-a.length)[0];
if(!coreSource)throw new Error('Could not locate the main inline game script.');
const coreManager=analyze(coreSource,'random-dice-game-33.html#main-script'),candidateScopes=[];
(function walk(scope){candidateScopes.push(scope);for(const child of scope.childScopes||[])walk(child);})(coreManager.globalScope);
const coreScope=candidateScopes.filter(scope=>scope.type==='function').sort((a,b)=>(b.block?.range?.[1]-b.block?.range?.[0])-(a.block?.range?.[1]-a.block?.range?.[0]))[0];
if(!coreScope)throw new Error('Could not locate the monolith core IIFE scope.');
const coreBindings=new Set(coreScope.variables.map(v=>v.name)),exposureLines=new Map();
for(const line of coreSource.split('\n')){const match=line.match(/__ttdExposeCore\('([^']+)'/);if(match)exposureLines.set(match[1],line);}

const missing=new Map(),missingWritable=new Map(),unknown=new Map();
for(const file of runtimeFiles){const source=fs.readFileSync(file,'utf8'),manager=analyze(source,file);for(const ref of manager.globalScope.through){const name=ref.identifier.name;if(browserGlobals.has(name)||intentionallyOptionalLegacy.has(name))continue;const mode=refMode(ref);if(coreBindings.has(name)){if(!exposureLines.has(name)){if(!missing.has(name))missing.set(name,new Set());missing.get(name).add(`${file}:${mode}`);}else if((mode==='W'||mode==='RW')&&!exposureLines.get(name).includes('(value)=>')){if(!missingWritable.has(name))missingWritable.set(name,new Set());missingWritable.get(name).add(`${file}:${mode}`);}}else{if(!unknown.has(name))unknown.set(name,new Set());unknown.get(name).add(`${file}:${mode}`);}}}
if(unknown.size){console.log('Runtime-module non-core externals (informational):');for(const[name,refs]of[...unknown].sort(([a],[b])=>a.localeCompare(b)))console.log(`  ${name} <- ${[...refs].sort().join(', ')}`);}
if(missing.size||missingWritable.size){console.error('Runtime compatibility facade is incomplete for code that actually executes:');for(const[name,refs]of[...missing].sort(([a],[b])=>a.localeCompare(b)))console.error(`  missing ${name} <- ${[...refs].sort().join(', ')}`);for(const[name,refs]of[...missingWritable].sort(([a],[b])=>a.localeCompare(b)))console.error(`  getter-only but written ${name} <- ${[...refs].sort().join(', ')}`);process.exit(1);}
console.log(`Runtime module compatibility verified across ${runtimeFiles.length} active/static-and-fetched modules.`);