import fs from 'node:fs';
import * as espree from 'espree';
import * as eslintScope from 'eslint-scope';

const files=[
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
  'online/avatar-inventory-v22.js',
];
const browserGlobals=new Set([
  'window','document','location','navigator','console','performance','requestAnimationFrame','cancelAnimationFrame',
  'setTimeout','clearTimeout','setInterval','clearInterval','fetch','URL','URLSearchParams','Blob','Image','Audio','Event','CustomEvent',
  'MutationObserver','ResizeObserver','IntersectionObserver','HTMLElement','HTMLCanvasElement','Node','Element','DOMParser',
  'localStorage','sessionStorage','crypto','structuredClone','atob','btoa','alert','confirm','prompt','eval',
  'innerHeight','innerWidth','Math','Date','JSON','Object','Array','Set','Map','WeakSet','WeakMap','Promise','Number','String',
  'Boolean','RegExp','Error','TypeError','parseInt','parseFloat','isNaN','Infinity','NaN','undefined','Intl','CSS',
  'getComputedStyle','devicePixelRatio','queueMicrotask',
]);

function parse(source,file){
  return espree.parse(source,{ecmaVersion:'latest',sourceType:'script',range:true,loc:true,comment:true});
}
function analyze(source,file){
  const ast=parse(source,file);
  const manager=eslintScope.analyze(ast,{ecmaVersion:2024,sourceType:'script',optimistic:true,ignoreEval:true});
  return {ast,manager};
}
function refMode(ref){
  const r=ref.isRead();
  const w=ref.isWrite();
  return r&&w?'RW':w?'W':'R';
}

const bridgeData=[];
const allRefs=new Set();
const allBridgeDeclarations=new Map();
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  const {manager}=analyze(source,file);
  const globalScope=manager.globalScope;
  const refs=new Map();
  for(const ref of globalScope.through){
    const name=ref.identifier.name;
    if(browserGlobals.has(name))continue;
    const prev=refs.get(name)||new Set();
    prev.add(refMode(ref));
    refs.set(name,prev);
    allRefs.add(name);
  }
  const declarations=[...globalScope.variables]
    .filter(v=>v.name && !browserGlobals.has(v.name))
    .map(v=>v.name)
    .sort();
  declarations.forEach(name=>{
    if(!allBridgeDeclarations.has(name))allBridgeDeclarations.set(name,[]);
    allBridgeDeclarations.get(name).push(file);
  });
  bridgeData.push({file,refs,declarations});
}

const html=fs.readFileSync('random-dice-game-33.html','utf8');
const scriptBodies=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
const coreSource=scriptBodies.sort((a,b)=>b.length-a.length)[0];
if(!coreSource)throw new Error('Could not locate the main inline game script.');
const {manager:coreManager}=analyze(coreSource,'random-dice-game-33.html#main-script');
const candidateScopes=[];
(function walk(scope){candidateScopes.push(scope);for(const child of scope.childScopes||[])walk(child);})(coreManager.globalScope);
const coreScope=candidateScopes
  .filter(scope=>scope.type==='function')
  .sort((a,b)=>(b.block?.range?.[1]-b.block?.range?.[0])-(a.block?.range?.[1]-a.block?.range?.[0]))[0];
if(!coreScope)throw new Error('Could not locate the monolith core IIFE scope.');
const coreBindings=new Map(coreScope.variables.map(v=>[v.name,v]));

function bindingKind(variable){
  const def=variable?.defs?.[0];
  if(!def)return 'unknown';
  if(def.type==='FunctionName')return 'function';
  if(def.type==='ClassName')return 'class';
  if(def.type==='Variable')return def.parent?.kind||'var';
  return def.type||'unknown';
}

for(const {file,refs,declarations} of bridgeData){
  console.log(`BRIDGE ${file}`);
  console.log('REFS '+[...refs].sort(([a],[b])=>a.localeCompare(b)).map(([name,modes])=>`${name}:${[...modes].sort().join('+')}`).join(' '));
  console.log('DECLARES '+declarations.join(' '));
}

const coreDeps=[];
const bridgeShared=[];
const unknown=[];
for(const name of [...allRefs].sort()){
  if(coreBindings.has(name)){
    const modes=new Set();
    for(const item of bridgeData){for(const mode of item.refs.get(name)||[])modes.add(mode);}
    coreDeps.push(`${name}:${bindingKind(coreBindings.get(name))}:${[...modes].sort().join('+')}`);
  }else if(allBridgeDeclarations.has(name)){
    bridgeShared.push(`${name}<-${allBridgeDeclarations.get(name).join(',')}`);
  }else{
    unknown.push(name);
  }
}
console.log('CORE_COMPATIBILITY_BINDINGS');
console.log(coreDeps.join(' '));
console.log('BRIDGE_SHARED_BINDINGS');
console.log(bridgeShared.join(' '));
console.log('UNKNOWN_EXTERNAL_BINDINGS');
console.log(unknown.join(' '));
