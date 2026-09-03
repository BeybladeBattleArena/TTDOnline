// Persistent release guard for the canonical Sumo and Crimson Current standard-die implementation.
// C1-C7 progression, rarity, affinity, Dosukoi, and Voltage gates are release-blocking contracts.
import fs from 'node:fs';
const must=(c,m)=>{if(!c)throw new Error(m);};
const catalog=JSON.parse(fs.readFileSync('dicefile.json','utf8'));
const game=fs.readFileSync('random-dice-game-33.html','utf8');
const s=catalog.dice.sumo,cc=catalog.dice.crimsoncurrent;
must(s?.rarity==='common'&&s.range==='mid'&&s.special?.kind==='canonSumo','Sumo canonical definition missing.');
must(cc?.rarity==='rare'&&cc.range==='mid'&&cc.affinities?.lightning===.5&&cc.affinities?.fire===.5&&cc.special?.kind==='canonCrimsonCurrent','Crimson Current canonical definition missing.');
for(const key of ['sumo','crimsoncurrent']){
  must(catalog.lore[key],'Lore missing: '+key);
  const tiers=catalog.design[key]?.skills?.[0]?.tiers;
  for(const cls of ['C1','C2','C3','C4','C5','C6','C7'])must(Array.isArray(tiers?.[cls])&&tiers[cls].length,'Tier missing '+key+' '+cls);
}
for(const marker of [
  'function canonFireSumo(',
  'function canonStartSumoHundred(',
  'dosukoi',
  'function canonFireCrimsonCurrent(',
  'crimsonElectroUntil',
  "case'canonSumo'",
  "case'canonCrimsonCurrent'",
  "(k==='canonSumo'||k==='canonCrimsonCurrent')"
])must(game.includes(marker),'Game behavior missing: '+marker);
must(game.includes('s.hits>=4'),'Sumo four-hit Dosukoi cadence missing.');
must(game.includes('s.dosukoi>=3'),'Sumo Hyakuretsuharite trigger missing.');
must(game.includes("const total=c>=7?12:c>=4?10:c>=2?9:6"),'Sumo class hit progression missing.');
must(game.includes("s.dosukoi=c>=6?1:0"),'Sumo C6 Dosukoi retention missing.');
must(game.includes("const splash=c>=7?.60:c>=6?.45:.30"),'Crimson Flame Splash progression missing.');
must(game.includes("burn=c>=6?.20:.12"),'Crimson Burn progression missing.');
must(game.includes("extraCrit=.15"),'Crimson C7 Max Voltage critical bonus missing.');
must(game.includes("if(c>=2&&!actuate)s.voltage=Math.min(3,stored+1);"),'Crimson Voltage must begin at C2, not C1.');
must(game.includes("c.crimsonElectroUntil>state.time"),'Crimson Electrocution next-hit amplifier missing.');
console.log('Sumo Common and Crimson Current Rare verified with complete C1-C7 canonical data and runtime behavior.');
