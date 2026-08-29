(() => {
  'use strict';
  const registry = window.TTDMovingScreenStages = window.TTDMovingScreenStages || {};
  if (registry.neon_rooftops_v2) return;

  const stage = {
    id: 'neon_rooftops_v2',
    name: 'Neon Rooftops',
    subtitle: 'Midnight climb through the electric district',
    direction: 'up',
    cameraX: 520,
    cameraStops: [85, 270, 445, 625, 805, 990, 1160],
    timing: { pause: 22, travel: 16.0 },
    world: { minX: 85, maxX: 960, minZ: -250, maxZ: 250, minY: 0, maxY: 1240 },
    objective: {
      startingLives: 10,
      killGoal: 30,
      emptyGraceSeconds: 3,
      emptyCountdownSeconds: 5,
      summonCameraBand: 190,
      flag: { homeZone:'roof4_final', homeSlot:2, pickupRange:135, respawnSeconds:1.35 },
    },

    tiers: [
      {id:'tier1',name:'LOW BLOCK',y:105},
      {id:'tier2',name:'FIRE ESCAPES',y:410},
      {id:'tier3',name:'BILLBOARD ROW',y:735},
      {id:'tier4',name:'SIGN CROWN',y:1045},
    ],

    // Every zone below is a standable combat-safe surface. Narrow traversal objects are deliberately
    // represented as zones too, so Dice/monsters can stop, fight and be fought while standing there.
    zones: [
      {id:'roof1_main',name:'Lower Rooftop',tier:1,x:510,z:20,y:110,w:650,d:325,slots:10,summon:true,enemySpawn:true,material:'tar',facade:190,guardDestructible:'lower_rail'},
      {id:'roof1_ac_step',name:'Lower AC Bank',tier:1,x:640,z:52,y:168,w:185,d:112,slots:3,material:'metal'},
      {id:'roof1_doorhouse',name:'Stair Doorhouse',tier:1,x:700,z:24,y:238,w:190,d:122,slots:3,material:'metal'},
      {id:'crane_beam_low',name:'Lower Crane Beam',tier:1,x:772,z:-18,y:304,w:245,d:78,slots:3,material:'metal'},
      {id:'awning_left',name:'Red Awning',tier:1,x:260,z:-42,y:225,w:220,d:98,slots:3,material:'awning'},
      {id:'lower_escape',name:'Lower Fire Escape',tier:1,x:440,z:22,y:305,w:205,d:118,slots:3,material:'metal'},

      {id:'roof2_west',name:'West Rooftop',tier:2,x:330,z:-25,y:405,w:360,d:230,slots:6,summon:true,material:'tar',facade:220,guardDestructible:'west_ledge'},
      {id:'roof2_east',name:'East Rooftop',tier:2,x:755,z:35,y:420,w:345,d:225,slots:6,enemySpawn:true,material:'tar',facade:235,guardDestructible:'east_ledge'},
      {id:'roof2_choke',name:'Service Bridge',tier:2,x:560,z:0,y:505,w:230,d:125,slots:4,choke:true,material:'metal'},
      {id:'scaffold_mid',name:'Construction Scaffold',tier:2,x:475,z:-32,y:590,w:220,d:112,slots:3,material:'scaffold'},
      {id:'billboard_perch',name:'Billboard Catwalk',tier:2,x:775,z:-15,y:610,w:230,d:105,slots:3,material:'metal'},
      {id:'roof2_ac_step',name:'Upper AC Bank',tier:2,x:705,z:58,y:525,w:190,d:115,slots:3,material:'metal'},
      {id:'crate_landing',name:'Crate Landing',tier:2,x:840,z:16,y:558,w:185,d:110,slots:3,material:'metal'},
      {id:'steel_beam_mid',name:'Suspended Steel Beam',tier:2,x:690,z:-42,y:652,w:260,d:78,slots:3,material:'metal'},

      {id:'roof3_main',name:'Midtown Rooftop',tier:3,x:500,z:5,y:730,w:535,d:270,slots:9,summon:true,enemySpawn:true,material:'tar',facade:245,guardDestructible:'upper_rail'},
      {id:'roof3_doorhouse',name:'Midtown Doorhouse',tier:3,x:585,z:54,y:815,w:205,d:125,slots:3,material:'metal'},
      {id:'maintenance_ledge',name:'Maintenance Ledge',tier:3,x:245,z:38,y:805,w:230,d:115,slots:3,material:'metal'},
      {id:'roof3_choke',name:'Upper Fire Escape',tier:3,x:385,z:5,y:885,w:195,d:112,slots:3,choke:true,material:'metal'},
      {id:'neon_sign_perch',name:'Neon Sign Walk',tier:3,x:745,z:-28,y:905,w:235,d:105,slots:3,choke:true,material:'neon'},

      {id:'roof4_main',name:'High Rooftop',tier:4,x:520,z:0,y:1040,w:550,d:275,slots:9,summon:true,enemySpawn:true,material:'tar',facade:275,guardDestructible:'crown_ledge'},
      {id:'roof4_final',name:'Sign Crown',tier:4,x:520,z:-8,y:1175,w:380,d:185,slots:7,enemySpawn:true,final:true,material:'neon',facade:120},
    ],

    junctions: [
      {id:'j1_fireescape',name:'Lower Split',x:485,z:0,y:165},
      {id:'j2_roof2_split',name:'Mid Split',x:570,z:0,y:548},
      {id:'j3_roof3_split',name:'Upper Split',x:520,z:0,y:835},
    ],

    edges: [
      // Tier 1 -> Tier 2: three deliberately generous novice routes.
      {id:'e01',from:'roof1_main',to:'j1_fireescape',kind:'stairs'},
      {id:'e02',from:'j1_fireescape',to:'awning_left',kind:'bridge'},
      {id:'e03',from:'awning_left',to:'lower_escape',kind:'fire_escape'},
      {id:'e04',from:'lower_escape',to:'roof2_west',kind:'fire_escape',requiresIntact:'old_fire_escape'},
      {id:'e05',from:'j1_fireescape',to:'roof2_east',kind:'fire_escape'},
      {id:'e21',from:'roof1_main',to:'roof1_ac_step',kind:'stairs'},
      {id:'e22',from:'roof1_ac_step',to:'roof1_doorhouse',kind:'stairs'},
      {id:'e23',from:'roof1_doorhouse',to:'crane_beam_low',kind:'scaffold'},
      {id:'e24',from:'crane_beam_low',to:'roof2_east',kind:'scaffold'},

      // Tier 2 -> Tier 3: a normal catwalk route, an opened scaffold route, and two billboard-opened side routes.
      {id:'e06',from:'roof2_west',to:'roof2_choke',kind:'bridge'},
      {id:'e07',from:'roof2_east',to:'roof2_choke',kind:'bridge'},
      {id:'e08',from:'roof2_choke',to:'j2_roof2_split',kind:'stairs'},
      {id:'e09',from:'j2_roof2_split',to:'scaffold_mid',kind:'scaffold',requiresBroken:'boarded_passage'},
      {id:'e10',from:'scaffold_mid',to:'roof3_main',kind:'scaffold'},
      {id:'e11',from:'j2_roof2_split',to:'billboard_perch',kind:'bridge'},
      {id:'e12',from:'billboard_perch',to:'roof3_main',kind:'fire_escape'},
      {id:'e25',from:'roof2_east',to:'roof2_ac_step',kind:'stairs',requiresBroken:'billboard_blocker'},
      {id:'e26',from:'roof2_east',to:'crate_landing',kind:'stairs',requiresBroken:'billboard_blocker'},
      {id:'e27',from:'roof2_ac_step',to:'steel_beam_mid',kind:'scaffold'},
      {id:'e28',from:'crate_landing',to:'steel_beam_mid',kind:'stairs'},
      {id:'e29',from:'steel_beam_mid',to:'roof3_main',kind:'scaffold'},
      {id:'e30',from:'roof2_west',to:'billboard_perch',kind:'bridge',requiresBroken:'crate_stack_blocker'},

      // Tier 3 -> Tier 4: chokes matter more here, but there are still multiple tactical answers.
      {id:'e13',from:'roof3_main',to:'j3_roof3_split',kind:'stairs'},
      {id:'e31',from:'roof3_main',to:'roof3_doorhouse',kind:'stairs'},
      {id:'e32',from:'roof3_doorhouse',to:'j3_roof3_split',kind:'stairs'},
      {id:'e14',from:'j3_roof3_split',to:'maintenance_ledge',kind:'bridge'},
      {id:'e15',from:'maintenance_ledge',to:'roof3_choke',kind:'fire_escape'},
      {id:'e16',from:'roof3_choke',to:'roof4_main',kind:'stairs'},
      {id:'e17',from:'j3_roof3_split',to:'neon_sign_perch',kind:'bridge',requiresIntact:'billboard_brace'},
      {id:'e18',from:'neon_sign_perch',to:'roof4_main',kind:'bridge',requiresIntact:'billboard_brace'},
      {id:'e19',from:'roof3_main',to:'roof4_main',kind:'bridge',requiresBroken:'billboard_brace'},
      {id:'e33',from:'roof3_doorhouse',to:'neon_sign_perch',kind:'bridge',requiresIntact:'billboard_brace'},
      {id:'e20',from:'roof4_main',to:'roof4_final',kind:'stairs'},
    ],

    destructibles: [
      {id:'boarded_passage',name:'Boarded Scaffold Gate',x:545,z:-26,y:560,hp:90,maxHp:90,r:31,losBlocker:true,description:'Break it to open the scaffold route.'},
      {id:'billboard_blocker',name:'Rooftop Billboard',x:735,z:8,y:515,hp:120,maxHp:120,r:48,losBlocker:true,description:'Break through the billboard to open two side routes.'},
      {id:'crate_stack_blocker',name:'Stacked Shipping Crates',x:515,z:-15,y:505,hp:78,maxHp:78,r:34,losBlocker:true,description:'Smash the old crate stack to open a West-to-catwalk shortcut.'},
      {id:'old_fire_escape',name:'Rust-Eaten Fire Escape',x:405,z:18,y:350,hp:82,maxHp:82,r:34,losBlocker:false,description:'The old fire escape has collapsed; this route is gone.'},
      {id:'billboard_brace',name:'Weak Billboard Brace',x:650,z:-20,y:862,hp:110,maxHp:110,r:34,losBlocker:true,description:'Breaking it drops the high sign walk and creates a direct rubble bridge.'},
      {id:'lower_rail',name:'Lower Rooftop Ledge',x:690,z:145,y:118,hp:90,maxHp:90,r:34,guard:true,description:'This raised ledge catches ordinary knockback from the lower roof.'},
      {id:'west_ledge',name:'West Rooftop Ledge',x:220,z:92,y:412,hp:95,maxHp:95,r:34,guard:true,description:'This raised ledge catches ordinary knockback from the West Rooftop.'},
      {id:'east_ledge',name:'East Rooftop Ledge',x:875,z:104,y:427,hp:95,maxHp:95,r:34,guard:true,description:'This raised ledge catches ordinary knockback from the East Rooftop.'},
      {id:'upper_rail',name:'Midtown Rooftop Ledge',x:300,z:120,y:738,hp:100,maxHp:100,r:36,guard:true,description:'This raised ledge catches ordinary knockback from Midtown Rooftop.'},
      {id:'crown_ledge',name:'High Rooftop Ledge',x:725,z:120,y:1048,hp:110,maxHp:110,r:38,guard:true,description:'This raised ledge catches ordinary knockback from the High Rooftop.'},
    ],

    obstacles: [
      {id:'roof2_shed',x:650,z:58,y:426,r:56,h:96,label:'Rooftop shed'},
      {id:'water_tank',x:350,z:-42,y:738,r:52,h:124,label:'Water tank'},
      {id:'roof3_ducts',x:610,z:76,y:738,r:42,h:58,label:'Vent stack'},
      {id:'roof4_hvac',x:585,z:42,y:1048,r:50,h:76,label:'HVAC bank'},
    ],

    lamps: [
      {x:245,z:105,y:115,h:92,glow:'#ffe94d'},
      {x:775,z:115,y:425,h:94,glow:'#ffe94d'},
      {x:315,z:90,y:412,h:90,glow:'#d8f45a'},
      {x:640,z:105,y:735,h:92,glow:'#7ae7ff'},
      {x:340,z:110,y:1046,h:96,glow:'#ff6bd7'},
      {x:735,z:88,y:1046,h:96,glow:'#7ae7ff'},
    ],

    signs: [
      {id:'sign_luna',x:835,z:-80,y:515,w:170,h:80,text:'LUNA',color:'#ff58cc',tilt:-0.04},
      {id:'sign_arcade',x:220,z:-85,y:675,w:190,h:92,text:'ARCADE',color:'#55d8ff',tilt:0.035},
      {id:'sign_nite',x:748,z:-68,y:920,w:210,h:100,text:'NITE',color:'#b975ff',tilt:-0.02},
      {id:'sign_crown',x:520,z:-70,y:1210,w:250,h:118,text:'DIE',color:'#ff5fae',tilt:0},
    ],

    foreground: [
      {kind:'pipe',x:120,z:220,y:420,h:520,parallax:1.10},
      {kind:'fire_escape',x:910,z:210,y:740,h:480,parallax:1.14},
      {kind:'cable',x:520,z:230,y:980,w:820,parallax:1.08},
    ],

    enemyArchetypes: {
      goblin:{name:'Goblin',hp:58,moveSpeed:166,damage:7.5,attackInterval:1.02,range:165,knockback:8,color:'#77a35f',risk:-2},
      goblin_dog:{name:'Goblin Dog',hp:44,moveSpeed:196,damage:5.5,attackInterval:.78,range:145,knockback:18,color:'#87934e',risk:-8},
      goblin_thrower:{name:'Goblin Thrower',hp:62,moveSpeed:150,damage:7,attackInterval:1.25,range:315,knockback:5,color:'#b3856e',risk:4},
      goblin_brute:{name:'Goblin Brute',hp:120,moveSpeed:125,damage:12,attackInterval:1.38,range:170,knockback:24,launch:105,color:'#6b8252',risk:10},
    },

    // Enemy pressure intentionally ramps slowly so a novice has time to learn movement and preserve space.
    encounters: [
      {stop:0,cap:2,spawnEvery:5.6,pool:['goblin','goblin_dog']},
      {stop:1,cap:2,spawnEvery:5.3,pool:['goblin','goblin_dog','goblin_thrower']},
      {stop:2,cap:3,spawnEvery:5.0,pool:['goblin','goblin_thrower']},
      {stop:3,cap:3,spawnEvery:4.7,pool:['goblin','goblin_dog','goblin_thrower']},
      {stop:4,cap:4,spawnEvery:4.4,pool:['goblin','goblin_thrower','goblin_brute']},
      {stop:5,cap:4,spawnEvery:4.1,pool:['goblin','goblin_dog','goblin_thrower','goblin_brute']},
      {stop:6,cap:5,spawnEvery:3.8,pool:['goblin','goblin_dog','goblin_thrower','goblin_brute']},
    ],
  };

  registry[stage.id] = stage;
})();
