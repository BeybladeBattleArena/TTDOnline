import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('online/adventure-continuous-map-contract-v1.js','utf8');
const must=(c,m)=>{if(!c)throw new Error(m);};
const need=(marker)=>must(source.includes(marker),`Continuous Adventure map contract missing: ${marker}`);
new vm.Script(source,{filename:'adventure-continuous-map-contract-v1.js'});

for(const marker of [
  'window.__TTD_CONTINUOUS_ADVENTURE_MAP_CONTRACT_V1',
  "const CONTRACT='one-world-one-camera-persistent-objects'",
  'one persistent world object per run',
  'one world-space coordinate system for traversal and combat',
  'camera position persists across mode transitions',
  'combat routes are authored in world coordinates inside traversal terrain',
  'interactable object mutations persist into combat and back into traversal',
  'navigation-to-combat transitions glide the existing camera instead of loading a second map',
  'function ensureWorldShape',
  'function bindSession',
  'function syncSession',
  'function assertArena',
  'function sameWorld',
])need(marker);

const fakeWindow={};
const context={window:fakeWindow,Date,Math};context.window.window=context.window;
vm.createContext(context);new vm.Script(source).runInContext(context);
const api=context.window.__TTD_CONTINUOUS_ADVENTURE_MAP_CONTRACT_V1;
must(api?.contract==='one-world-one-camera-persistent-objects','Continuous Adventure contract did not initialize.');
const world={objects:[{id:'chest',opened:true}],drops:[{kind:'coin'}],camera:{x:100,z:20},checkpoint:{x:90,z:15,y:0}};
const session={objects:null,drops:null,cameraX:0,cameraZ:0,checkpoint:{x:90,z:15,y:0}};
api.ensureWorldShape(world,{cameraX:0,cameraZ:0});must(api.bindSession(world,session),'Session did not bind to persistent world collections.');
must(session.objects===world.objects&&session.drops===world.drops,'Traversal session must retain exact persistent object/drop references.');
session.cameraX=140;session.cameraZ=-30;session.objects[0].opened=true;api.syncSession(world,session);
must(world.camera.x===140&&world.camera.z===-30,'World camera did not persist both map axes.');
must(world.objects[0].opened===true,'Interactable mutation did not persist on shared world object.');
const arena={id:'test',bounds:{x1:0,x2:200,z1:-100,z2:100},route:[{x:180,z:-40},{x:100,z:20},{x:20,z:50}]};
must(api.assertArena(arena,arena.route),'World-space combat arena validation failed.');

console.log('Continuous Adventure map contract verified: one world instance, shared object/drop references, persistent two-axis camera, and world-space combat arenas.');
