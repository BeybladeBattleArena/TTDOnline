(() => {
  'use strict';
  const registry = window.TTDMovingScreenStages = window.TTDMovingScreenStages || {};
  if (registry.neon_rooftops_v1) return;

  const stage = {
    id: 'neon_rooftops_v1',
    name: 'Neon Rooftops',
    subtitle: 'Midnight climb through the electric district',
    cameraX: 520,
    cameraStops: [105, 270, 445, 625, 805, 990, 1160],
    timing: { pause: 22, travel: 4.8, finalPause: 60 },
    world: { minX: 85, maxX: 960, minZ: -250, maxZ: 250, minY: 0, maxY: 1240 },

    tiers: [
      {id:'tier1',name:'LOW BLOCK',y:105},
      {id:'tier2',name:'FIRE ESCAPES',y:410},
      {id:'tier3',name:'BILLBOARD ROW',y:735},
      {id:'tier4',name:'SIGN CROWN',y:1045},
    ],

    zones: [
      {id:'roof1_main',name:'Lower Rooftop',tier:1,x:510,z:20,y:110,w:620,d:310,slots:9,summon:true,material:'tar',facade:190,guardDestructible:'lower_rail'},
      {id:'awning_left',name:'Red Awning',tier:1,x:260,z:-42,y:225,w:205,d:92,slots:3,material:'awning'},
      {id:'lower_escape',name:'Lower Fire Escape',tier:1,x:440,z:22,y:305,w:170,d:105,slots:2,choke:true,material:'metal'},

      {id:'roof2_west',name:'West Rooftop',tier:2,x:335,z:-25,y:405,w:330,d:215,slots:5,summon:true,material:'tar',facade:220},
      {id:'roof2_east',name:'East Rooftop',tier:2,x:755,z:35,y:420,w:310,d:205,slots:5,enemySpawn:true,material:'tar',facade:235},
      {id:'roof2_choke',name:'Service Bridge',tier:2,x:565,z:0,y:505,w:180,d:112,slots:2,choke:true,material:'metal'},
      {id:'scaffold_mid',name:'Construction Scaffold',tier:2,x:485,z:-32,y:590,w:180,d:98,slots:2,choke:true,material:'scaffold'},
      {id:'billboard_perch',name:'Billboard Catwalk',tier:2,x:770,z:-15,y:610,w:195,d:90,slots:2,material:'metal'},

      {id:'roof3_main',name:'Midtown Rooftop',tier:3,x:500,z:5,y:730,w:500,d:255,slots:8,summon:true,enemySpawn:true,material:'tar',facade:245,guardDestructible:'upper_rail'},
      {id:'maintenance_ledge',name:'Maintenance Ledge',tier:3,x:245,z:38,y:805,w:210,d:105,slots:3,material:'metal'},
      {id:'roof3_choke',name:'Upper Fire Escape',tier:3,x:385,z:5,y:885,w:175,d:105,slots:2,choke:true,material:'metal'},
      {id:'neon_sign_perch',name:'Neon Sign Walk',tier:3,x:745,z:-28,y:905,w:210,d:92,slots:2,material:'neon'},

      {id:'roof4_main',name:'High Rooftop',tier:4,x:520,z:0,y:1040,w:525,d:260,slots:8,summon:true,enemySpawn:true,material:'tar',facade:275},
      {id:'roof4_final',name:'Sign Crown',tier:4,x:520,z:-8,y:1175,w:360,d:175,slots:6,enemySpawn:true,final:true,material:'neon',facade:120},
    ],

    junctions: [
      {id:'j1_fireescape',name:'Lower Split',x:485,z:0,y:165},
      {id:'j2_roof2_split',name:'Mid Split',x:570,z:0,y:548},
      {id:'j3_roof3_split',name:'Upper Split',x:520,z:0,y:835},
    ],

    edges: [
      {id:'e01',from:'roof1_main',to:'j1_fireescape',kind:'stairs'},
      {id:'e02',from:'j1_fireescape',to:'awning_left',kind:'awning'},
      {id:'e03',from:'awning_left',to:'lower_escape',kind:'fire_escape'},
      {id:'e04',from:'lower_escape',to:'roof2_west',kind:'fire_escape'},
      {id:'e05',from:'j1_fireescape',to:'roof2_east',kind:'fire_escape'},
      {id:'e06',from:'roof2_west',to:'roof2_choke',kind:'bridge'},
      {id:'e07',from:'roof2_east',to:'roof2_choke',kind:'bridge'},
      {id:'e08',from:'roof2_choke',to:'j2_roof2_split',kind:'stairs'},
      {id:'e09',from:'j2_roof2_split',to:'scaffold_mid',kind:'scaffold',requiresBroken:'boarded_passage'},
      {id:'e10',from:'scaffold_mid',to:'roof3_main',kind:'scaffold'},
      {id:'e11',from:'j2_roof2_split',to:'billboard_perch',kind:'billboard'},
      {id:'e12',from:'billboard_perch',to:'roof3_main',kind:'catwalk'},
      {id:'e13',from:'roof3_main',to:'j3_roof3_split',kind:'stairs'},
      {id:'e14',from:'j3_roof3_split',to:'maintenance_ledge',kind:'catwalk'},
      {id:'e15',from:'maintenance_ledge',to:'roof3_choke',kind:'fire_escape'},
      {id:'e16',from:'roof3_choke',to:'roof4_main',kind:'stairs'},
      {id:'e17',from:'j3_roof3_split',to:'neon_sign_perch',kind:'signwalk',requiresIntact:'billboard_brace'},
      {id:'e18',from:'neon_sign_perch',to:'roof4_main',kind:'signwalk',requiresIntact:'billboard_brace'},
      {id:'e19',from:'roof3_main',to:'roof4_main',kind:'collapsed_sign',requiresBroken:'billboard_brace'},
      {id:'e20',from:'roof4_main',to:'roof4_final',kind:'stairs'},
    ],

    destructibles: [
      {id:'boarded_passage',name:'Boarded Scaffold Gate',x:545,z:-26,y:560,hp:90,maxHp:90,r:31,losBlocker:true,description:'Break it to open the scaffold route.'},
      {id:'billboard_brace',name:'Weak Billboard Brace',x:650,z:-20,y:862,hp:110,maxHp:110,r:34,losBlocker:true,description:'Breaking it drops the high sign walk and creates a direct rubble bridge.'},
      {id:'lower_rail',name:'Lower Safety Railing',x:690,z:145,y:118,hp:75,maxHp:75,r:28,guard:true,description:'While intact it catches ordinary knockback from the lower roof.'},
      {id:'upper_rail',name:'Upper Safety Railing',x:300,z:120,y:738,hp:85,maxHp:85,r:30,guard:true,description:'While intact it catches ordinary knockback from Midtown Rooftop.'},
    ],

    obstacles: [
      {id:'roof1_hvac',x:605,z:15,y:116,r:55,h:78,label:'HVAC bank'},
      {id:'roof2_shed',x:690,z:40,y:426,r:62,h:105,label:'Rooftop shed'},
      {id:'water_tank',x:360,z:-42,y:738,r:54,h:128,label:'Water tank'},
      {id:'roof3_ducts',x:575,z:55,y:738,r:48,h:65,label:'Vent stack'},
      {id:'roof4_hvac',x:585,z:42,y:1048,r:60,h:88,label:'HVAC bank'},
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
      goblin:{name:'Goblin',hp:58,moveSpeed:166,damage:7.5,attackInterval:1.02,range:165,knockback:8,color:'#77a35f'},
      goblin_dog:{name:'Goblin Dog',hp:44,moveSpeed:196,damage:5.5,attackInterval:.78,range:145,knockback:18,color:'#87934e'},
      goblin_thrower:{name:'Goblin Thrower',hp:62,moveSpeed:150,damage:7,attackInterval:1.25,range:315,knockback:5,color:'#b3856e'},
      goblin_brute:{name:'Goblin Brute',hp:120,moveSpeed:125,damage:12,attackInterval:1.38,range:170,knockback:24,launch:105,color:'#6b8252'},
    },

    encounters: [
      {stop:0,cap:4,spawnEvery:4.2,pool:['goblin','goblin_dog']},
      {stop:1,cap:5,spawnEvery:3.8,pool:['goblin','goblin_dog','goblin_thrower']},
      {stop:2,cap:6,spawnEvery:3.5,pool:['goblin','goblin_thrower']},
      {stop:3,cap:7,spawnEvery:3.2,pool:['goblin','goblin_dog','goblin_thrower','goblin_brute']},
      {stop:4,cap:8,spawnEvery:3.0,pool:['goblin','goblin_thrower','goblin_brute']},
      {stop:5,cap:9,spawnEvery:2.8,pool:['goblin','goblin_dog','goblin_thrower','goblin_brute']},
      {stop:6,cap:10,spawnEvery:2.3,pool:['goblin','goblin_thrower','goblin_brute'],finalWave:9},
    ],
  };

  registry[stage.id] = stage;
})();
