import fs from 'node:fs';
import vm from 'node:vm';

const files=[
  'online/al-hata-stage1-core-v1.js',
  'online/al-hata-stage1-beach-v1.js',
  'online/al-hata-stage1-jungle-v1.js',
  'online/al-hata-stage1-fork-v1.js',
  'online/al-hata-stage1-temple-v1.js',
  'online/al-hata-stage1-polish-v1.js',
  'online/al-hata-stage1-playtest-v1.js',
];
const combined=files.map(path=>fs.readFileSync(path,'utf8')).join('\n\n');
const must=(condition,message)=>{if(!condition)throw new Error(message);};
const noop=()=>{};
const classList={contains:()=>false,add:noop,remove:noop,toggle:noop};
const makeNode=()=>({
  style:{setProperty:noop},classList,dataset:{},children:[],innerHTML:'',textContent:'',disabled:false,
  appendChild:noop,insertBefore:noop,remove:noop,addEventListener:noop,setAttribute:noop,
  querySelector:()=>null,querySelectorAll:()=>[],getContext:()=>null,getBoundingClientRect:()=>({width:700,height:700,left:0,top:0}),
});
const stage={name:'Beach Landing',waves:4,carryover:[],introduce:{},smallBoss:null,subBoss:null};
const context={
  console,Math,JSON,Date,Object,Array,Map,Set,Promise,
  ADVENTURES:{al_hata:{name:'Al Hata',stages:[stage]}},
  state:null,session:null,modeLabel:null,cw:700,ch:700,pathPts:[],segLens:[],totalLen:0,towerPos:null,lastT:0,
  performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame:noop,setTimeout:()=>0,clearTimeout:noop,
  document:{
    head:{appendChild:noop},body:{appendChild:noop},documentElement:{},
    getElementById:()=>null,createElement:()=>makeNode(),querySelector:()=>null,querySelectorAll:()=>[],
  },
  startAdventure:noop,currentPlatforms:()=>[],initObjectHp:noop,attackObject:noop,objectHit:()=>false,
  updateNavigator:noop,drawScene:noop,updateSpawns:noop,buildPath:noop,
  enemyRenderPos:()=>({x:0,y:0}),posAtDistance:()=>({x:0,y:0}),spawnAdventureEnemy:noop,
  drawPath:noop,drawLane:noop,resizeCanvas:noop,resizePlatformCanvas:()=>true,
  renderBoard:noop,renderHUD:noop,loop:noop,enterPlatformLayout:noop,leavePlatformLayout:noop,
  restoreTrayChildren:noop,clearNavigatorSelectionUi:noop,setupNavigatorSelection:noop,
  effDmg:()=>1,groundAt:()=>({y:0}),inputVector:()=>({x:0,z:0}),collectNearbyDrops:noop,navigatorDamage:noop,
  makeDie:(key)=>({key,hp:10,maxHp:10}),randDeckKey:()=> 'starter',DICE:{starter:{name:'Starter'}},
  toast:noop,toastGlobal:noop,floatObjectText:noop,buildAdventureWave:()=>[],
  addEventListener:noop,removeEventListener:noop,postMessage:noop,
};
context.window=context;
context.parent=context;
context.location={origin:'https://example.test'};
context.window.parent=context;
context.window.location=context.location;
vm.createContext(context);
try{
  new vm.Script(combined,{filename:'al-hata-stage1-runtime-execution.js'}).runInContext(context,{timeout:3000});
}catch(err){
  console.error('AL_HATA_RUNTIME_EXECUTION_FAILURE',err?.stack||err);
  throw err;
}
must(context.__TTD_AL_HATA_STAGE1_RUNTIME_V1===true,'Al Hata core runtime did not execute.');
must(context.__TTD_AL_HATA_STAGE1_PLAYTEST_V2===true,'Al Hata playtest runtime did not reach its module body.');
must(typeof context.__TTD_AL_HATA_STAGE1_PLAYTEST_API?.prepareInMapNavigator==='function','Al Hata Navigator API was not registered after runtime execution.');
console.log('Al Hata runtime execution verified through Navigator API registration.');
