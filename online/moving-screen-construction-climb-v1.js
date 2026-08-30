(() => {
  'use strict';
  const registry=window.TTDMovingScreenStages=window.TTDMovingScreenStages||{};
  if(registry.construction_climb)return;

  // Construction Climb deliberately follows the readable physical grammar of Rumble Fighter's
  // Demolition moving-screen stage: broad yard -> unfinished frame -> fenced work deck -> open
  // concrete floors -> exposed top slab.  Navigation follows visible geometry instead of a dense
  // abstract route graph.
  const stage={
    id:'construction_climb',
    name:'Construction Climb',
    subtitle:'Climb an unfinished concrete frame through planks, work decks and open slabs',
    direction:'up',
    theme:'construction',
    cameraX:520,
    cameraStops:[90,265,440,615,790,955],
    timing:{pause:22,travel:16},
    world:{minX:20,maxX:1020,minZ:-260,maxZ:260,minY:0,maxY:1060},
    palette:{
      skyTop:'#4f9fd5',skyBottom:'#d4efff',cloud:'#f4f7f5',
      constructionGround:'#858985',concrete:'#b9bbb6',concreteShade:'#858984',
      steel:'#7e432d',steelDark:'#4e2b22',wood:'#a66f47',woodDark:'#6e432f',
      yellow:'#d0a13b',fence:'#a87525',tarp:'#202327',container:'#6e8793',
      log:'#ad7441',crate:'#a5774c',greenCrate:'#75865d',barrel:'#63737b',
    },
    objective:{
      startingLives:10,
      killGoal:30,
      emptyGraceSeconds:3,
      emptyCountdownSeconds:5,
      summonCameraBand:170,
      flag:{homeZone:'top_floor',homeSlot:5,label:'Top Floor',pickupRange:135,respawnSeconds:1.35},
    },

    tiers:[
      {id:'tier1',name:'WORK YARD',y:95},
      {id:'tier2',name:'LOWER FRAME',y:350},
      {id:'tier3',name:'OPEN FLOORS',y:610},
      {id:'tier4',name:'TOP SLAB',y:865},
    ],

    // Every zone below represents obvious physical footing visible in the Demolition layout.
    zones:[
      {id:'yard_main',name:'Open Work Yard',tier:1,x:520,z:22,y:90,w:760,d:330,slots:12,summon:true,enemySpawn:true,material:'construction_ground',facade:38},
      {id:'container_roof',name:'Site Container',tier:1,x:305,z:-62,y:145,w:225,d:112,slots:4,material:'container',facade:58},
      {id:'ground_ramp',name:'Ground Plank Ramp',tier:1,x:760,z:34,y:190,w:235,d:86,slots:4,material:'wood',facade:26},
      {id:'lower_frame',name:'Lower Unfinished Floor',tier:2,x:555,z:8,y:300,w:620,d:260,slots:10,summon:true,enemySpawn:true,material:'concrete',facade:95},
      {id:'diagonal_plank',name:'Diagonal Plank',tier:2,x:330,z:24,y:390,w:220,d:78,slots:3,material:'wood',facade:24},
      {id:'fenced_platform',name:'Fenced Work Platform',tier:2,x:275,z:-12,y:470,w:255,d:126,slots:4,material:'yellow_platform',facade:32},
      {id:'mid_floor',name:'Middle Concrete Floor',tier:3,x:555,z:6,y:535,w:655,d:280,slots:10,summon:true,enemySpawn:true,material:'concrete',facade:100},
      {id:'hanging_platform',name:'Hanging Work Platform',tier:3,x:805,z:-42,y:610,w:155,d:88,slots:2,choke:true,material:'yellow_platform',facade:25},
      {id:'upper_ramp',name:'Upper Plank Ramp',tier:3,x:650,z:30,y:665,w:235,d:84,slots:3,material:'wood',facade:24},
      {id:'upper_floor',name:'Upper Concrete Floor',tier:3,x:500,z:5,y:745,w:670,d:295,slots:10,summon:true,enemySpawn:true,material:'concrete',facade:100},
      {id:'plywood_step',name:'Plywood Transfer',tier:4,x:725,z:-22,y:850,w:235,d:92,slots:3,material:'wood',facade:24},
      {id:'top_floor',name:'Exposed Top Slab',tier:4,x:520,z:0,y:960,w:730,d:300,slots:11,summon:true,enemySpawn:true,final:true,material:'concrete',facade:80},
    ],

    // No invisible junction nodes.  Choices happen on real surfaces and every line corresponds to
    // an obvious ramp, plank, container transfer or work platform in the level geometry.
    junctions:[],
    edges:[
      {id:'d01',from:'yard_main',to:'ground_ramp',kind:'stairs'},
      {id:'d02',from:'ground_ramp',to:'lower_frame',kind:'stairs'},
      {id:'d03',from:'yard_main',to:'container_roof',kind:'bridge'},
      {id:'d04',from:'container_roof',to:'lower_frame',kind:'stairs'},
      {id:'d05',from:'lower_frame',to:'diagonal_plank',kind:'stairs'},
      {id:'d06',from:'diagonal_plank',to:'fenced_platform',kind:'stairs'},
      {id:'d07',from:'fenced_platform',to:'mid_floor',kind:'stairs'},
      {id:'d08',from:'mid_floor',to:'upper_ramp',kind:'stairs'},
      {id:'d09',from:'upper_ramp',to:'upper_floor',kind:'stairs'},
      {id:'d10',from:'mid_floor',to:'hanging_platform',kind:'scaffold'},
      {id:'d11',from:'hanging_platform',to:'upper_floor',kind:'scaffold'},
      {id:'d12',from:'upper_floor',to:'plywood_step',kind:'stairs'},
      {id:'d13',from:'plywood_step',to:'top_floor',kind:'stairs'},
    ],

    // Demolition's fences/tarps are level geometry rather than puzzle switches.  Construction Climb
    // therefore has no route-gating destructibles; Moving Screen's destructible system remains
    // available to other maps that actually call for it.
    destructibles:[],
    obstacles:[
      {id:'lower_column',x:600,z:62,y:305,r:34,h:145,label:'Concrete column'},
      {id:'mid_column',x:420,z:65,y:540,r:34,h:150,label:'Concrete column'},
      {id:'upper_column',x:615,z:58,y:750,r:34,h:155,label:'Concrete column'},
    ],
    lamps:[],
    signs:[],
    foreground:[],

    // Prop positions mirror the reference video's visual beats: container/logs in the opening lot,
    // rusty frame and diagonal plank, yellow fenced platform, black tarp, hanging platform, then
    // boxes/drums/rebar and plywood before the mostly-open final slab.
    constructionDecor:[
      {kind:'siteContainer',x:305,z:-62,y:90,w:225,h:58},
      {kind:'logs',x:145,z:72,y:92,w:170,count:6},
      {kind:'cautionSign',x:430,z:112,y:94,text:'CAUTION'},
      {kind:'steelFrame',x:570,z:92,y:205,w:610,h:245,columns:5},
      {kind:'arrowSign',x:365,z:104,y:308,text:'↑'},
      {kind:'safetyFence',x:275,z:96,y:470,w:250},
      {kind:'safetyFence',x:160,z:-6,y:470,w:110},
      {kind:'tarpFence',x:550,z:116,y:535,w:340},
      {kind:'hangingPlatform',x:805,z:-42,y:610,w:155,h:28},
      {kind:'rebar',x:250,z:78,y:745,count:6},
      {kind:'rebar',x:785,z:70,y:745,count:5},
      {kind:'boxStack',x:355,z:58,y:745,w:110,h:62},
      {kind:'greenCrate',x:445,z:48,y:745,w:72,h:58},
      {kind:'barrels',x:655,z:65,y:745,count:3},
      {kind:'plywoodStack',x:725,z:36,y:850,w:120,h:48},
      {kind:'rebar',x:175,z:95,y:960,count:7},
      {kind:'rebar',x:840,z:88,y:960,count:7},
      {kind:'rebar',x:520,z:-105,y:960,count:5},
    ],

    enemyArchetypes:{
      goblin:{name:'Goblin',hp:58,moveSpeed:166,damage:7.5,attackInterval:1.02,range:165,knockback:8,color:'#77a35f',risk:-2},
      goblin_dog:{name:'Goblin Dog',hp:44,moveSpeed:196,damage:5.5,attackInterval:.78,range:145,knockback:18,color:'#87934e',risk:-8},
      goblin_thrower:{name:'Goblin Thrower',hp:62,moveSpeed:158,damage:7,attackInterval:1.15,range:315,knockback:6,color:'#8d9b62',risk:4},
      goblin_brute:{name:'Goblin Brute',hp:105,moveSpeed:142,damage:11,attackInterval:1.28,range:170,knockback:24,launch:70,color:'#6e8a54',risk:10},
    },
    encounters:[
      {cap:2,spawnEvery:5.2,pool:['goblin','goblin_dog']},
      {cap:2,spawnEvery:4.9,pool:['goblin','goblin_dog','goblin_thrower']},
      {cap:3,spawnEvery:4.6,pool:['goblin','goblin_dog','goblin_thrower']},
      {cap:4,spawnEvery:4.4,pool:['goblin','goblin_dog','goblin_thrower']},
      {cap:5,spawnEvery:4.2,pool:['goblin','goblin_dog','goblin_thrower','goblin_brute']},
      {cap:5,spawnEvery:4.0,pool:['goblin','goblin_dog','goblin_thrower','goblin_brute']},
    ],
  };

  registry.construction_climb=Object.freeze(stage);
})();