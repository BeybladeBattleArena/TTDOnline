import fs from 'node:fs';
import vm from 'node:vm';

const loader=fs.readFileSync('online/game-loader.js','utf8');
const game=fs.readFileSync('random-dice-game-33.html','utf8');
const soul=fs.readFileSync('online/dice-catalog-bridge-v8.js','utf8');
const slither=fs.readFileSync('online/slither-vine-bridge-v8.js','utf8');

const need=(text,markers,label)=>{for(const marker of markers){if(!text.includes(marker))throw new Error(`${label} missing: ${marker}`);}};

need(loader,[
  'TTD_BATTLE_HOOK_SCOPE_V20',
  'const __TTD_BATTLE_HOOKS = {',
  'fireMagmaForce(){return false;}',
  'fireSoulScimitar(){}',
  'fireSlitherVine(){}',
  'const catalogSource=sources[0]',
  'const soulAssetSource=sources[1]',
  'const slitherSource=sources[2]',
  'sources.slice(3).map',
  'Object.assign(__TTD_BATTLE_HOOKS,{fireMagmaForce,updateMagmaForce,drawMagmaForceGround,drawMagmaForceOverlay,fireSoulScimitar,updateSoulScimitars,drawSoulScimitars})',
  'Object.assign(__TTD_BATTLE_HOOKS,{fireSlitherVine,updateSlitherVines,drawSlitherVines})',
],'battle bridge scope');

need(game,[
  'TTD_NATIVE_LOADER_TRANSFORMS_V1',
  "case 'magmaForce'",
  "case 'soulScimitar'",
  "case 'slitherVine'",
  '__TTD_BATTLE_HOOKS.fireMagmaForce',
  '__TTD_BATTLE_HOOKS.fireSoulScimitar',
  '__TTD_BATTLE_HOOKS.fireSlitherVine',
  '__TTD_BATTLE_HOOKS.updateMagmaForce(dt)',
  '__TTD_BATTLE_HOOKS.updateSoulScimitars(dt)',
  '__TTD_BATTLE_HOOKS.updateSlitherVines(dt)',
  '__TTD_BATTLE_HOOKS.drawSlitherVines()',
  '__TTD_BATTLE_HOOKS.drawSoulScimitars()',
  '__TTD_BATTLE_HOOKS.drawMagmaForceGround()',
  '__TTD_BATTLE_HOOKS.drawMagmaForceOverlay()',
],'native battle loop');

need(soul,['function fireMagmaForce(','function updateMagmaForce(','function drawMagmaForceGround(','function drawMagmaForceOverlay(','function fireSoulScimitar(','function updateSoulScimitars(','function drawSoulScimitars('],'Catalog combat bridge');
need(slither,['function fireSlitherVine(','function updateSlitherVines(','function drawSlitherVines('],'Slither combat bridge');

if(loader.includes('const isolatedSources=sources.map((source,index)=>')){
  throw new Error('Catalog combat bridges are still being generically block-isolated.');
}
if(game.includes('updateSoulScimitars(dt);\n    updateSlitherVines(dt);')){
  throw new Error('The native battle loop calls bridge declarations directly instead of the stable battle-hook authority.');
}

// Execute the strict-mode scoping pattern that caused the live freeze. Hooks exported through
// a stable object must remain callable after the source block exits.
const sandbox={soul:0,slither:0};
vm.createContext(sandbox);
new vm.Script(`
  'use strict';
  const hooks={updateSoulScimitars(){},updateSlitherVines(){}};
  try {
    function updateSoulScimitars(){ soul += 1; }
    Object.assign(hooks,{updateSoulScimitars});
  } catch (_) {}
  try {
    function updateSlitherVines(){ slither += 1; }
    Object.assign(hooks,{updateSlitherVines});
  } catch (_) {}
  hooks.updateSoulScimitars();
  hooks.updateSlitherVines();
`).runInContext(sandbox);
if(sandbox.soul!==1||sandbox.slither!==1)throw new Error('Strict-mode battle hook export simulation failed.');

console.log('Battle loop v20 verified: native game source owns Magma/Soul/Slither call sites, while the loader owns only guarded bridge scope/export and unrelated bridge isolation.');
