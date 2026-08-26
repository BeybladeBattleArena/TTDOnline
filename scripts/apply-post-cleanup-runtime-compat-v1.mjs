import fs from 'node:fs';

const file='random-dice-game-33.html';
let source=fs.readFileSync(file,'utf8');
const marker='TTD_POST_CLEANUP_RUNTIME_COMPAT_V1';
if(source.includes(marker)){
  console.log('Runtime compatibility recovery already materialized.');
  process.exit(0);
}

function replaceExactly(from,to){
  const count=source.split(from).length-1;
  if(count!==1)throw new Error(`Expected exactly one runtime facade binding: ${from} (found ${count})`);
  source=source.replace(from,to);
}

for(const name of ['buildPath','chestSVG','enemyRenderPos','keySVG','pathPts']){
  replaceExactly(
    `__ttdExposeCore('${name}',()=>${name});`,
    `__ttdExposeCore('${name}',()=>${name},(value)=>{${name}=value;});`,
  );
}

const anchor='window.__TTD_CORE_API_V1=Object.freeze(__ttdCoreApi);';
if(!source.includes(anchor))throw new Error('Could not locate native core API finalization anchor.');

const readOnly=[
  'buildAdventureWave','ch','effHp','posAtDistance','renderAdventureList','renderDeckTray','renderHUD','resizeCanvas',
  'selectedAdventureId','selectedDifficulty','shopActiveSub','shopActiveTab','STAGE_THEMES',
];
const writable=[
  'openInventoryItemDetail','renderShopGrid','renderStageScreen','segLens','showZombieSummary','totalLen','towerPos','updateSpawns',
];

for(const name of [...readOnly,...writable]){
  if(source.includes(`__ttdExposeCore('${name}'`))throw new Error(`Runtime facade already exposes ${name}; recovery must stay single-authority.`);
}

const block=[
  `// ${marker}`,
  '// These bindings are the exact additional lexical dependencies proven by the post-cleanup',
  '// runtime-module audit. Keep this surface bounded; do not expose unrelated monolith state.',
  ...readOnly.map(name=>`__ttdExposeCore('${name}',()=>${name});`),
  ...writable.map(name=>`__ttdExposeCore('${name}',()=>${name},(value)=>{${name}=value;});`),
  anchor,
].join('\n');
source=source.replace(anchor,block);
fs.writeFileSync(file,source);
console.log(`Materialized ${marker}: ${readOnly.length} read-only and ${writable.length} writable recovered bindings; 5 existing bindings made intentionally writable.`);
