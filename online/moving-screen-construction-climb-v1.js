(() => {
  'use strict';
  const registry=window.TTDMovingScreenStages=window.TTDMovingScreenStages||{};
  if(registry.construction_climb)return;

  const stage={
    id:'construction_climb',
    name:'Construction Climb',
    subtitle:'Scale an unfinished tower through ramps, scaffolds and suspended steel',
    direction:'up',
    theme:'construction',
    cameraX:520,
    cameraStops:[75,250,430,610,790,970,1150],
    timing:{pause:22,travel:16},
    world:{minX:70,maxX:970,minZ:-250,maxZ:250,minY:0,maxY:1235},
    objective:{
      startingLives:10,
      killGoal:30,
      emptyGraceSeconds:3,
      emptyCountdownSeconds:5,
      summonCameraBand:190,
      flag:{homeZone:'crane_crown',homeSlot:3,pickupRange:135,respawnSeconds:1.35},
    },

    tiers:[
      {id:'tier1',name:'WORK YARD',y:105},
      {id:'tier2',name:'SCAFFOLD FLOORS',y:420},
      {id:'tier3',name:'UNFINISHED SLABS',y:735},
      {id:'tier4',name:'CRANE CROWN',y:1035},
    ],

    // Every listed zone is real footing: entities may stop, fight and be fought on it.
    zones:[
      {id:'yard_main',name:'Ground Work Yard',tier:1,x:520,z:18,y:105,w:690,d:340,slots:11,summon:true,enemySpawn:true,material:'concrete',facade:70,guardDestructible:'yard_rail'},
      {id:'container_roof',name:'Container Roof',tier:1,x:245,z:-35,y:155,w:230,d:118,slots:4,material:'metal'},
      {id:'lumber_stack',name:'Lumber Stack',tier:1,x:420,z:55,y:190,w:195,d:108,slots:3,material:'wood'},
      {id:'ramp_landing',name:'Temporary Ramp Landing',tier:1,x:535,z:4,y:245,w:210,d:112,slots:4,material:'wood'},
      {id:'outside_scaffold_low',name:'Outside Scaffold',tier:1,x:235,z:-5,y:310,w:215,d:118,slots:4,material:'scaffold'},
      {id:'stairwell_low',name:'Interior Stair Landing',tier:1,x:785,z:42,y:315,w:225,d:132,slots:4,material:'concrete'},

      {id:'floor2_west',name:'Second Floor West',tier:2,x:325,z:-20,y:415,w:375,d:245,slots:7,summon:true,material:'concrete',facade:115,guardDestructible:'floor2_west_rail'},
      {id:'floor2_east',name:'Second Floor East',tier:2,x:760,z:28,y:430,w:365,d:240,slots:7,enemySpawn:true,material:'concrete',facade:120},
      {id:'scaffold_mid',name:'Mid Scaffold Deck',tier:2,x:245,z:-32,y:520,w:220,d:112,slots:4,material:'scaffold'},
      {id:'plywood_deck',name:'Plywood Work Deck',tier:2,x:515,z:34,y:540,w:235,d:125,slots:4,material:'wood'},
      {id:'crate_step',name:'Crate Step',tier:2,x:805,z:12,y:565,w:190,d:108,slots:3,material:'wood'},
      {id:'steel_beam_low',name:'Lower Steel Beam',tier:2,x:690,z:-42,y:645,w:285,d:78,slots:4,material:'metal'},

      {id:'floor3_main',name:'Third Floor Slab',tier:3,x:515,z:5,y:725,w:585,d:285,slots:10,summon:true,enemySpawn:true,material:'concrete',facade:135,guardDestructible:'floor3_rail'},
      {id:'utility_platform',name:'Utility Platform',tier:3,x:260,z:38,y:800,w:220,d:118,slots:4,material:'metal'},
      {id:'stairhouse_mid',name:'Unfinished Stairhouse',tier:3,x:610,z:55,y:820,w:220,d:135,slots:4,material:'concrete'},
      {id:'beam_crossing',name:'Suspended Crane Beam',tier:3,x:815,z:-28,y:865,w:295,d:76,slots:4,choke:true,material:'metal'},
      {id:'floor3_upper',name:'Upper Work Slab',tier:3,x:455,z:-18,y:915,w:440,d:235,slots:8,material:'concrete'},

      {id:'upper_slab_west',name:'Upper Slab West',tier:4,x:315,z:-15,y:1020,w:355,d:235,slots:6,summon:true,material:'concrete',facade:120,guardDestructible:'upper_west_rail'},
      {id:'upper_slab_east',name:'Upper Slab East',tier:4,x:735,z:26,y:1035,w:350,d:235,slots:6,enemySpawn:true,material:'concrete',facade:120,guardDestructible:'upper_east_rail'},
      {id:'crane_hook_deck',name:'Crane Hook Deck',tier:4,x:530,z:-8,y:1110,w:235,d:112,slots:4,choke:true,material:'metal'},
      {id:'crane_crown',name:'Rooftop Crane Crown',tier:4,x:520,z:0,y:1190,w:400,d:195,slots:7,enemySpawn:true,final:true,material:'concrete',facade:80},
    ],

    junctions:[
      {id:'j1_yard_split',name:'Yard Split',x:510,z:5,y:145},
      {id:'j2_floor2_split',name:'Second Floor Split',x:535,z:0,y:485},
      {id:'j3_floor3_split',name:'Upper Floor Split',x:520,z:0,y:795},
    ],

    edges:[
      // Broad novice opening: three visually distinct ways out of the yard.
      {id:'c01',from:'yard_main',to:'j1_yard_split',kind:'stairs'},
      {id:'c02',from:'j1_yard_split',to:'container_roof',kind:'bridge'},
      {id:'c03',from:'container_roof',to:'outside_scaffold_low',kind:'scaffold'},
      {id:'c04',from:'outside_scaffold_low',to:'floor2_west',kind:'scaffold',requiresIntact:'rotten_temp_stair'},
      {id:'c05',from:'j1_yard_split',to:'lumber_stack',kind:'bridge'},
      {id:'c06',from:'lumber_stack',to:'ramp_landing',kind:'stairs'},
      {id:'c07',from:'ramp_landing',to:'floor2_west',kind:'stairs'},
      {id:'c08',from:'ramp_landing',to:'floor2_east',kind:'stairs'},
      {id:'c09',from:'yard_main',to:'stairwell_low',kind:'stairs'},
      {id:'c10',from:'stairwell_low',to:'floor2_east',kind:'stairs'},

      // Mid climb keeps three answers: exterior scaffold, opened interior, or steel route.
      {id:'c11',from:'floor2_west',to:'j2_floor2_split',kind:'bridge'},
      {id:'c12',from:'floor2_east',to:'j2_floor2_split',kind:'bridge'},
      {id:'c13',from:'j2_floor2_split',to:'scaffold_mid',kind:'scaffold'},
      {id:'c14',from:'scaffold_mid',to:'floor3_main',kind:'scaffold'},
      {id:'c15',from:'j2_floor2_split',to:'plywood_deck',kind:'bridge',requiresBroken:'plywood_partition'},
      {id:'c16',from:'plywood_deck',to:'utility_platform',kind:'stairs',requiresBroken:'plywood_partition'},
      {id:'c17',from:'utility_platform',to:'floor3_main',kind:'stairs'},
      {id:'c18',from:'floor2_east',to:'crate_step',kind:'stairs'},
      {id:'c19',from:'floor2_west',to:'crate_step',kind:'bridge',requiresBroken:'lumber_barricade'},
      {id:'c20',from:'crate_step',to:'steel_beam_low',kind:'scaffold'},
      {id:'c21',from:'steel_beam_low',to:'floor3_main',kind:'scaffold'},

      // Upper half begins to tighten, mirroring the reference video's exposed unfinished floors.
      {id:'c22',from:'floor3_main',to:'j3_floor3_split',kind:'stairs'},
      {id:'c23',from:'floor3_main',to:'stairhouse_mid',kind:'stairs'},
      {id:'c24',from:'stairhouse_mid',to:'upper_slab_east',kind:'stairs'},
      {id:'c25',from:'j3_floor3_split',to:'utility_platform',kind:'bridge'},
      {id:'c26',from:'utility_platform',to:'floor3_upper',kind:'stairs'},
      {id:'c27',from:'floor3_upper',to:'upper_slab_west',kind:'stairs'},
      {id:'c28',from:'j3_floor3_split',to:'beam_crossing',kind:'scaffold'},
      {id:'c29',from:'beam_crossing',to:'upper_slab_east',kind:'scaffold'},
      {id:'c30',from:'floor3_upper',to:'upper_slab_east',kind:'bridge',requiresBroken:'upper_plywood_wall'},

      // Final choke: both upper slabs feed the crane deck, but a broken partition supplies a late bypass.
      {id:'c31',from:'upper_slab_west',to:'crane_hook_deck',kind:'scaffold'},
      {id:'c32',from:'upper_slab_east',to:'crane_hook_deck',kind:'scaffold'},
      {id:'c33',from:'crane_hook_deck',to:'crane_crown',kind:'stairs'},
      {id:'c34',from:'upper_slab_west',to:'crane_crown',kind:'bridge',requiresBroken:'upper_plywood_wall'},
    ],

    destructibles:[
      {id:'rotten_temp_stair',name:'Rotten Temporary Stair',x:270,z:-16,y:360,hp:78,maxHp:78,r:34,losBlocker:false,description:'The temporary stair collapses and removes the outside scaffold route.'},
      {id:'plywood_partition',name:'Plywood Partition',x:535,z:30,y:520,hp:88,maxHp:88,r:40,losBlocker:true,description:'Break it to open the unfinished interior and utility-platform route.'},
      {id:'lumber_barricade',name:'Lumber Barricade',x:585,z:-8,y:520,hp:76,maxHp:76,r:35,losBlocker:true,description:'Smash the stacked lumber to open a cross-floor shortcut.'},
      {id:'upper_plywood_wall',name:'Upper Plywood Wall',x:575,z:-6,y:960,hp:112,maxHp:112,r:44,losBlocker:true,description:'Break it to open a late cross-slab route and crown bypass.'},
      {id:'yard_rail',name:'Yard Safety Rail',x:735,z:142,y:112,hp:92,maxHp:92,r:36,guard:true,description:'Temporary safety rail catches ordinary knockback in the work yard.'},
      {id:'floor2_west_rail',name:'Second Floor Safety Rail',x:185,z:95,y:423,hp:96,maxHp:96,r:36,guard:true,description:'Raised edge protection catches ordinary knockback.'},
      {id:'floor3_rail',name:'Third Floor Slab Lip',x:285,z:125,y:733,hp:104,maxHp:104,r:38,guard:true,description:'The raised concrete lip catches ordinary knockback.'},
      {id:'upper_west_rail',name:'Upper West Rail',x:190,z:92,y:1028,hp:108,maxHp:108,r:38,guard:true,description:'Upper safety rail catches standard knockback.'},
      {id:'upper_east_rail',name:'Upper East Rail',x:850,z:96,y:1043,hp:108,maxHp:108,r:38,guard:true,description:'Upper safety rail catches standard knockback.'},
    ],

    obstacles:[
      {id:'site_office',x:700,z:70,y:110,r:62,h:92,label:'Site office'},
      {id:'cement_mixer',x:360,z:-55,y:110,r:48,h:65,label:'Cement mixer'},
      {id:'pallet_stack',x:690,z:65,y:435,r:44,h:64,label:'Pallet stack'},
      {id:'rebar_bundle',x:365,z:52,y:730,r:38,h:100,label:'Rebar bundle'},
      {id:'generator',x:690,z:68,y:1038,r:44,h:62,label:'Generator'},
    ],

    lamps:[
      {x:205,z:115,y:112,h:95,glow:'#ffd36a'},
      {x:825,z:110,y:435,h:96,glow:'#ffd36a'},
      {x:285,z:100,y:730,h:96,glow:'#ffd36a'},
      {x:785,z:92,y:1038,h:100,glow:'#ffd36a'},
    ],

    signs:[
      {id:'sign_caution',x:820,z:-76,y:330,w:155,h:70,text:'CAUTION',color:'#f5bd4f',tilt:-.025},
      {id:'sign_level3',x:245,z:-78,y:770,w:165,h:72,text:'LEVEL 3',color:'#8fc4e8',tilt:.018},
      {id:'sign_topout',x:520,z:-70,y:1210,w:210,h:88,text:'TOP OUT',color:'#f3d491',tilt:0},
    ],

    foreground:[
      {kind:'pipe',x:90,z:225,y:430,h:510,parallax:1.08},
      {kind:'fire_escape',x:925,z:215,y:700,h:560,parallax:1.12},
      {kind:'cable',x:520,z:230,y:1010,w:900,parallax:1.08},
    ],

    constructionDecor:[
      {kind:'craneTower',x:875,z:120,y:780,h:520},
      {kind:'craneBoom',x:720,z:80,y:1125,w:430},
      {kind:'rebar',x:250,z:35,y:425,count:5},
      {kind:'rebar',x:760,z:25,y:730,count:6},
      {kind:'rebar',x:330,z:30,y:1020,count:6},
      {kind:'safetyFence',x:520,z:120,y:725,w:330},
      {kind:'safetyFence',x:735,z:110,y:1035,w:230},
      {kind:'plywoodStack',x:430,z:65,y:540,w:110,h:48},
      {kind:'crateStack',x:805,z:18,y:565,w:90,h:70},
    ],

    enemyArchetypes:{
      goblin:{name:'Goblin',hp:58,moveSpeed:166,damage:7.5,attackInterval:1.02,range:165,knockback:8,color:'#77a35f',risk:-2},
      goblin_dog:{name:'Goblin Dog',hp:44,moveSpeed:196,damage:5.5,attackInterval:.78,range:145,knockback:18,color:'#87934e',risk:-8},
      goblin_thrower:{name:'Goblin Thrower',hp:62,moveSpeed:150,damage:7,attackInterval:1.25,range:315,knockback:5,color:'#b3856e',risk:4},
      goblin_brute:{name:'Goblin Brute',hp:120,moveSpeed:125,damage:12,attackInterval:1.38,range:170,knockback:24,launch:105,color:'#6b8252',risk:10},
    },

    encounters:[
      {stop:0,cap:2,spawnEvery:5.8,pool:['goblin','goblin_dog']},
      {stop:1,cap:2,spawnEvery:5.5,pool:['goblin','goblin_dog','goblin_thrower']},
      {stop:2,cap:3,spawnEvery:5.1,pool:['goblin','goblin_thrower']},
      {stop:3,cap:3,spawnEvery:4.8,pool:['goblin','goblin_dog','goblin_thrower']},
      {stop:4,cap:4,spawnEvery:4.5,pool:['goblin','goblin_thrower','goblin_brute']},
      {stop:5,cap:4,spawnEvery:4.2,pool:['goblin','goblin_dog','goblin_thrower','goblin_brute']},
      {stop:6,cap:5,spawnEvery:3.9,pool:['goblin','goblin_dog','goblin_thrower','goblin_brute']},
    ],
  };

  registry[stage.id]=stage;
})();
