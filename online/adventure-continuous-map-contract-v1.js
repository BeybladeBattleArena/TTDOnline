/* Generic Adventure continuous-map contract.
   Adventure maps using this contract keep one persistent world instance for an entire run.
   Traversal and combat are views of that same world: same camera coordinates, object array,
   drop array, interactable mutations, and world-space combat routes. */
(() => {
  'use strict';
  if(window.__TTD_CONTINUOUS_ADVENTURE_MAP_CONTRACT_V1)return;

  const CONTRACT='one-world-one-camera-persistent-objects';
  const REQUIREMENTS=Object.freeze([
    'one persistent world object per run',
    'one world-space coordinate system for traversal and combat',
    'camera position persists across mode transitions',
    'combat routes are authored in world coordinates inside traversal terrain',
    'interactable object mutations persist into combat and back into traversal',
    'drops persist in the same world collection',
    'navigation-to-combat transitions glide the existing camera instead of loading a second map',
    'combat-to-navigation transitions resume the same world instance',
  ]);

  function finite(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:Number(fallback)||0;}
  function makeInstanceId(prefix='adventure-world'){
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
  }
  function ensureWorldShape(world,defaults={}){
    if(!world||typeof world!=='object')throw new Error('Continuous Adventure map requires a persistent world object.');
    world.contract=CONTRACT;
    world.instanceId=world.instanceId||makeInstanceId(defaults.instancePrefix||'adventure-world');
    if(!Array.isArray(world.objects))world.objects=[];
    if(!Array.isArray(world.drops))world.drops=[];
    if(!world.camera||typeof world.camera!=='object')world.camera={};
    world.camera.x=finite(world.camera.x,defaults.cameraX);
    world.camera.z=finite(world.camera.z,defaults.cameraZ);
    if(!world.checkpoint||typeof world.checkpoint!=='object')world.checkpoint={x:finite(defaults.x),z:finite(defaults.z),y:finite(defaults.y)};
    return world;
  }
  function bindSession(world,session){
    if(!world||!session)return false;
    session.objects=world.objects;
    session.drops=world.drops;
    session.cameraX=finite(world.camera?.x,session.cameraX);
    session.cameraZ=finite(world.camera?.z,session.cameraZ);
    return session.objects===world.objects&&session.drops===world.drops;
  }
  function syncSession(world,session){
    if(!world||!session)return false;
    ensureWorldShape(world,{cameraX:session.cameraX,cameraZ:session.cameraZ});
    world.camera.x=finite(session.cameraX,world.camera.x);
    world.camera.z=finite(session.cameraZ,world.camera.z);
    if(session.checkpoint)world.checkpoint={...session.checkpoint};
    world.objects=session.objects||world.objects;
    world.drops=session.drops||world.drops;
    return true;
  }
  function contains(bounds,x,z,padding=0){
    if(!bounds)return false;const p=finite(padding);
    return finite(x)>=finite(bounds.x1)-p&&finite(x)<=finite(bounds.x2)+p&&finite(z)>=finite(bounds.z1)-p&&finite(z)<=finite(bounds.z2)+p;
  }
  function routeInside(bounds,route,padding=0){return Array.isArray(route)&&route.length>1&&route.every(p=>contains(bounds,p.x,p.z,padding));}
  function assertArena(arena,route){
    if(!arena?.bounds)throw new Error(`Continuous Adventure arena ${arena?.id||'?'} has no world bounds.`);
    if(!routeInside(arena.bounds,route,0))throw new Error(`Continuous Adventure route ${arena?.id||'?'} escapes its traversal-space arena bounds.`);
    return true;
  }
  function sameWorld(world,session){return !!world&&!!session&&session.objects===world.objects&&session.drops===world.drops;}

  window.__TTD_CONTINUOUS_ADVENTURE_MAP_CONTRACT_V1=Object.freeze({
    version:1,contract:CONTRACT,requirements:REQUIREMENTS,
    ensureWorldShape,bindSession,syncSession,contains,routeInside,assertArena,sameWorld,
  });
})();
