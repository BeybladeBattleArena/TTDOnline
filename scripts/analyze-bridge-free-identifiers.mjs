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
  'localStorage','sessionStorage','crypto','structuredClone','atob','btoa','alert','confirm','prompt',
  'Math','Date','JSON','Object','Array','Set','Map','WeakSet','WeakMap','Promise','Number','String','Boolean','RegExp','Error','TypeError',
  'parseInt','parseFloat','isNaN','Infinity','NaN','undefined','Intl','CSS','getComputedStyle','devicePixelRatio','queueMicrotask',
]);

const all=new Set();
for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  const ast=espree.parse(source,{ecmaVersion:'latest',sourceType:'script',range:true,loc:true,comment:true});
  const manager=eslintScope.analyze(ast,{ecmaVersion:2024,sourceType:'script',optimistic:true,ignoreEval:true});
  const globalScope=manager.globalScope;
  const unresolved=[...new Set(globalScope.through.map(ref=>ref.identifier.name).filter(name=>!browserGlobals.has(name)))].sort();
  unresolved.forEach(name=>all.add(name));
  console.log(`BRIDGE ${file}`);
  console.log(unresolved.join(' '));
}
console.log('ALL_BRIDGE_CORE_DEPENDENCIES');
console.log([...all].sort().join(' '));
