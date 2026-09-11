import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const must=(c,m)=>{if(!c)throw new Error(m);};
const need=(s,ms,l)=>{for(const m of ms)must(s.includes(m),`${l} missing: ${m}`);};
const v4=read('online/al-hata-stage1-world-v4.js');
const viewport=read('online/gameplay-viewport-stability-v1.js');
new vm.Script(v4,{filename:'al-hata-stage1-world-v4.js'});
new vm.Script(viewport,{filename:'gameplay-viewport-stability-v1.js'});
need(v4,[
  'AH_WORLD_V4_PROP_WALLS','AH_WORLD_V4_sideCorridor','AH_WORLD_V4_drawShoreline',
  "['palmTall','palmLean','palmFan','palmTwin','beachBroad']",
  "['jungleTall','jungleFork','jungleBanyan','jungleButtress','jungleVine']",
  "x1:4260,x2:4840,z1:-86,z2:86,y:85",
  'items.sort((a,b)=>a.z-b.z).forEach(v=>v.draw())',
  'drawLane=function AH_WORLD_V4_drawLane','w>=cw*.94&&h>=ch*.94',
  'combatRouteReveal','AH_WORLD_V4_drawRouteRibbon','AH_WORLD_V4_primeCombatFrame',
],'Al Hata v4');
need(viewport,['height:clamp(160px,56vw,235px)!important','--ttd-stable-platform-lane-h','Height-only resize deliberately does nothing'],'viewport stability');
const routeBodies=[1,2,3,4,5].map(n=>{const m=v4.match(new RegExp(`AH_ROUTES\\[${n}\\]=\\[([\\s\\S]*?)\\];`));must(m,`route ${n} missing`);return m[1];});
for(let i=0;i<routeBodies.length;i++)must((routeBodies[i].match(/\{x:/g)||[]).length>=5,`route ${i+1} must visibly weave through its battle clearing`);
console.log('Al Hata world v4 verified: prop-defined readable corridors, expanded shoreline world, exact bridge footing, terrain-native route fade, generic TD background masking, and viewport jitter stabilization remain wired.');
