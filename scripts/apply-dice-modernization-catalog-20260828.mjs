import fs from 'node:fs';

const path = 'dicefile.json';
const catalog = JSON.parse(fs.readFileSync(path, 'utf8'));
const dice = catalog.dice;

function merge(key, patch){
  if(!dice[key]) throw new Error(`Missing existing die ${key}`);
  dice[key] = {...dice[key], ...patch, special: patch.special || dice[key].special};
}
function glyph(pathData){ return {path:pathData}; }
function add(key, def){
  if(dice[key]) throw new Error(`New die key already exists: ${key}`);
  dice[key]=def;
}

catalog.catalogVersion = '2026-08-28-dice-modernization-master';

merge('iron', {
  name:'Iron Ball', rarity:'rare', category:'physical', dmg:16, atk:6.5, hp:60,
  target:'strongest', range:'map', affinities:{metal:1},
  special:{kind:'canonIronBall', c3Cooldown:6.2, c5Damage:17, c6Cooldown:5.9}
});

if(!dice.arrow) throw new Error('Legacy arrow key is missing; Skyhorn migration cannot be made losslessly.');
const oldArrow = dice.arrow;
delete dice.arrow;
dice.skyhorn = {
  ...oldArrow,
  name:'Skyhorn', rarity:'rare', category:'physical', dmg:11, atk:0.75, hp:42,
  target:'front', range:'map', affinities:{},
  special:{kind:'canonSkyhorn', postPowerCooldown:3.2, c2RapidDamage:11.5, c3PostPowerCooldown:3.0, c4PowerMult:4.15, c7RapidDamage:12, c7PowerMult:4.25, c7PostPowerCooldown:2.8}
};

merge('light', {name:'Light', rarity:'rare', category:'status', dmg:0, atk:6.5, hp:36, target:'none', range:'map', affinities:{holy:1}, special:{kind:'canonLight'}});
merge('crack', {name:'Crack', rarity:'rare', category:'status', dmg:6, atk:1.10, hp:46, target:'front', range:'map', affinities:{metal:1}, special:{kind:'canonCrack'}});
merge('laser', {name:'Laser', rarity:'unique', category:'special', dmg:8, atk:0.70, hp:44, target:'front', range:'map', affinities:{}, special:{kind:'canonLaser'}});
merge('teleport', {name:'Teleport', rarity:'unique', category:'status', dmg:12, atk:1.10, hp:46, target:'front', range:'map', affinities:{arcane:1}, special:{kind:'canonTeleport'}});
merge('mine', {name:'Mine', rarity:'unique', category:'status', dmg:0, atk:1.4, hp:40, target:'none', range:'map', affinities:{metal:1}, special:{kind:'canonMine'}});
merge('mimic', {name:'Mimic', rarity:'unique', category:'special', dmg:10, atk:1.0, hp:46, target:'front', range:'map', affinities:{arcane:1}, special:{kind:'canonMimic'}});
merge('absorb', {name:'Absorb', rarity:'unique', category:'status', dmg:9, atk:1.2, hp:44, target:'random', range:'map', affinities:{shadow:0.5,nature:0.5}, special:{kind:'canonAbsorb'}});
merge('growth', {name:'Growth', rarity:'legendary', category:'special', dmg:5, atk:2.0, hp:60, target:'front', range:'map', affinities:{nature:1}, special:{kind:'canonGrowth'}});
merge('joker', {name:'Joker', rarity:'legendary', category:'special', dmg:8, atk:1.0, hp:55, target:'front', range:'map', affinities:{arcane:1}, special:{kind:'canonJoker'}});
merge('gun', {name:'Marksman', rarity:'legendary', category:'physical', dmg:24, atk:1.0, hp:58, target:'front', range:'map', affinities:{}, special:{kind:'canonMarksman'}});
merge('blizzard', {name:'Snowfall', rarity:'legendary', category:'special', dmg:0, atk:5.0, hp:62, target:'none', range:'map', affinities:{ice:1}, special:{kind:'canonSnowfall'}});
merge('nuclear', {name:'Nuclear', rarity:'legendary', category:'special', dmg:11, atk:1.0, hp:60, target:'front', range:'map', affinities:{fire:0.75,arcane:0.25}, special:{kind:'canonNuclear', criticalMassBase:72, groundZeroRadius:26, blastRadius:55, shockRadius:90}});

add('chainlightning', {
  name:'Chain Lightning', rarity:'rare', category:'special', dmg:12, atk:2.8, hp:44,
  color:'#d6c76e', glow:'#fff3a6', glyph:glyph('M5 3 L14 3 L10 10 L19 10 L7 22 L10 13 L3 13 Z'),
  target:'front', range:'map', affinities:{lightning:1}, special:{kind:'canonChainLightning'}
});
add('bloomblade', {
  name:'Bloomblade', rarity:'unique', category:'special', dmg:6, atk:1.35, hp:46,
  color:'#8fcf86', glow:'#d9ffd0', glyph:glyph('M12 2 C15 6 19 7 22 7 C19 11 18 15 19 20 C15 18 12 19 9 22 C8 17 5 14 2 12 C6 10 8 7 12 2 Z'),
  target:'front', range:'map', affinities:{nature:1}, special:{kind:'canonBloomblade'}
});
add('undinessong', {
  name:'Undine’s Song', rarity:'rare', category:'special', dmg:4, atk:6.0, hp:44,
  color:'#69bfe2', glow:'#c8f3ff', glyph:glyph('M12 2 C8 7 5 11 5 15 A7 7 0 0 0 19 15 C19 11 16 7 12 2 Z M9 15 Q12 18 15 15'),
  target:'strongest', range:'map', affinities:{water:1}, special:{kind:'canonUndinesSong'}
});
add('graceofthespider', {
  name:'Grace of the Spider', rarity:'unique', category:'physical', dmg:8, atk:2.2, hp:54,
  color:'#6f8d55', glow:'#b2d487', glyph:glyph('M12 7 A5 5 0 1 1 11.9 7 M7 10 L2 6 M7 13 L2 13 M8 16 L3 20 M17 10 L22 6 M17 13 L22 13 M16 16 L21 20'),
  target:'strongest', range:'map', affinities:{nature:0.5,poison:0.5}, special:{kind:'canonGraceSpider'}
});
add('padlock', {
  name:'Padlock', rarity:'unique', category:'status', dmg:4, atk:1.6, hp:50,
  color:'#8f949a', glow:'#d6dbe0', glyph:glyph('M7 10 V7 A5 5 0 0 1 17 7 V10 M5 10 H19 V21 H5 Z M12 14 V18'),
  target:'front', range:'map', affinities:{metal:1}, special:{kind:'canonPadlock'}
});
add('relentlessmace', {
  name:'Relentless Mace', rarity:'rare', category:'physical', dmg:24, atk:4.8, hp:60,
  color:'#816f68', glow:'#cbb8ad', glyph:glyph('M5 4 H14 V12 H5 Z M12 10 L21 21 M3 6 H16 M7 2 V14'),
  target:'front', range:'map', affinities:{}, special:{kind:'canonRelentlessMace'}
});
add('goldenlion', {
  name:'Golden Lion', rarity:'legendary', category:'special', dmg:18, atk:3.6, hp:62,
  color:'#d7ad45', glow:'#ffe49a', glyph:glyph('M12 3 L16 7 L21 8 L19 13 L20 19 L14 18 L12 22 L10 18 L4 19 L5 13 L3 8 L8 7 Z M8 11 Q12 15 16 11'),
  target:'front', range:'map', affinities:{holy:1}, special:{kind:'canonGoldenLion'}
});
add('ace', {
  name:'Ace', rarity:'rare', category:'physical', dmg:18, atk:2.8, hp:46,
  color:'#d9e8f0', glow:'#ffffff', glyph:glyph('M12 3 A8 8 0 1 1 11.9 3 M6 7 Q12 12 18 17 M18 7 Q12 12 6 17'),
  target:'front', range:'map', affinities:{}, special:{kind:'canonAce'}
});
add('basesloaded', {
  name:'Bases Loaded', rarity:'rare', category:'physical', dmg:20, atk:2.9, hp:50,
  color:'#d7c8aa', glow:'#fff0ce', glyph:glyph('M12 2 L22 12 L12 22 L2 12 Z M12 7 L17 12 L12 17 L7 12 Z'),
  target:'front', range:'map', affinities:{}, special:{kind:'canonBasesLoaded'}
});

fs.writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n');
fs.copyFileSync(path, 'functions/dicefile.generated.json');
console.log(`Modernization catalog staged with ${Object.keys(dice).length} dice.`);
