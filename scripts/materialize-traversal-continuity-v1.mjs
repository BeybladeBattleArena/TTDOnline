import fs from 'node:fs';
import vm from 'node:vm';

const bridgePath='online/game-bridge-inner.js';
const platformPath='online/adventure-platforming-v2.js';
const bridge=fs.readFileSync(bridgePath,'utf8');
const platform=fs.readFileSync(platformPath,'utf8');

const fnStart=bridge.indexOf('  function patchTraversalSourceV1(source) {');
const fnEnd=bridge.indexOf('\n  window.fetch=async function ttdTraversalAwareFetch',fnStart);
if(fnStart<0||fnEnd<0)throw new Error('Could not locate the existing traversal continuity patch function.');
const fnSource=bridge.slice(fnStart,fnEnd).trim();
const patchTraversalSourceV1=vm.runInNewContext(`(${fnSource})`,Object.create(null),{filename:'patchTraversalSourceV1'});
if(typeof patchTraversalSourceV1!=='function')throw new Error('Existing traversal patch did not evaluate to a function.');

const materialized=patchTraversalSourceV1(platform);
if(materialized===platform)throw new Error('Existing traversal patch produced no source change; refusing ambiguous migration.');
for(const marker of [
  "d.source==='combat'&&d.t>=Math.max(.1,Number(d.ttl)||6)",
  "isGold:kind==='coin'?value>=5:null",
  "g.fillStyle=d.isGold?'#f3d491':'#c7d0e0'",
  "g.arc(0,0,7,0,Math.PI*2)",
])if(!materialized.includes(marker))throw new Error(`Materialized traversal source lost expected behavior: ${marker}`);
if(materialized.includes("${bonusXp?` (~+${bonusXp} base EXP)`:''}"))throw new Error('Old approximate EXP suffix survived traversal materialization.');

const patchBlockStart=bridge.indexOf('  // The Test Map traversal source owns private draw/drop helpers');
const nextAuthority=bridge.indexOf('  function validGameState',patchBlockStart);
if(patchBlockStart<0||nextAuthority<0)throw new Error('Could not isolate traversal fetch patch ownership in game bridge.');
const simplifiedBridge=bridge.slice(0,patchBlockStart)
  +'  // Traversal continuity is committed directly in adventure-platforming-v2.js; no runtime source patching.\n\n'
  +bridge.slice(nextAuthority);
for(const stale of ['patchTraversalSourceV1','ttdTraversalAwareFetch','__TTD_TRAVERSAL_SOURCE_PATCH_V1','nativeFetchForTraversal']){
  if(simplifiedBridge.includes(stale))throw new Error(`Runtime traversal source mutation survived migration: ${stale}`);
}

fs.writeFileSync(platformPath,materialized);
fs.writeFileSync(bridgePath,simplifiedBridge);
console.log('Materialized the existing traversal continuity patch into adventure-platforming-v2.js and removed its runtime fetch interception.');
