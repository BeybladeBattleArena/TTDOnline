import fs from 'node:fs';
const fx=fs.readFileSync('online/gacha-atmosphere-v30.js','utf8');
const audio=fs.readFileSync('online/audio-client-v27.js','utf8');
const entry=fs.readFileSync('online/singleplayer-client-v6.js','utf8');
for(const marker of ['ttdGachaDiceField','count=Math.max(220','COLORS=','y+tileH','y-tileH','requestAnimationFrame(draw)','background:#020307'])if(!fx.includes(marker))throw new Error(`Gacha atmosphere missing ${marker}`);
for(const marker of ["gacha:{url:'/assets/audio/gacha.webm'","screen==='gachaScreen'","return'gacha'"])if(!audio.includes(marker))throw new Error(`Gacha audio route missing ${marker}`);
if(!entry.includes("./gacha-atmosphere-v30.js?v=30"))throw new Error('Gacha atmosphere is not loaded.');
console.log('Gacha v30 verified: repository-hosted music and seamless dice field.');
