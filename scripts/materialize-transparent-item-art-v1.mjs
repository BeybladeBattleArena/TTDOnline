import fs from 'node:fs';
import zlib from 'node:zlib';

const ITEM_PATHS=[
  'assets/items/chest-frozen-island-normal.png',
  'assets/items/chest-frozen-island-hard.png',
  'assets/items/chest-frozen-island-hell.png',
  'assets/items/key-normal.png',
  'assets/items/key-hard.png',
  'assets/items/key-hell.png',
  'assets/items/mystery-chest.png',
  'assets/items/epic-summon-ticket.png',
  'assets/items/exp-tome.png',
  'assets/items/ore-common.png',
  'assets/items/ore-rare.png',
  'assets/items/ore-unique.png',
  'assets/items/ore-legendary.png',
  'assets/items/ore-omni.png',
  'assets/items/gift-box-pink.png',
  'assets/items/gift-box-icy.png',
];

const PNG_SIG=Buffer.from([137,80,78,71,13,10,26,10]);
const CHANNELS={2:3,6:4};

function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
function decodePng(buf){
  if(buf.length<33||!buf.subarray(0,8).equals(PNG_SIG))throw new Error('Not a PNG');
  let pos=8,ihdr=null,idats=[];
  while(pos+12<=buf.length){
    const len=buf.readUInt32BE(pos),type=buf.subarray(pos+4,pos+8).toString('ascii'),data=buf.subarray(pos+8,pos+8+len);pos+=12+len;
    if(type==='IHDR')ihdr=Buffer.from(data);else if(type==='IDAT')idats.push(Buffer.from(data));else if(type==='IEND')break;
  }
  if(!ihdr||!idats.length)throw new Error('PNG missing IHDR/IDAT');
  const width=ihdr.readUInt32BE(0),height=ihdr.readUInt32BE(4),bitDepth=ihdr[8],colorType=ihdr[9],interlace=ihdr[12],channels=CHANNELS[colorType];
  if(bitDepth!==8||!channels||interlace!==0)throw new Error(`Unsupported PNG format bitDepth=${bitDepth} colorType=${colorType} interlace=${interlace}`);
  const stride=width*channels,packed=zlib.inflateSync(Buffer.concat(idats)),expected=height*(stride+1);
  if(packed.length!==expected)throw new Error(`Unexpected PNG scanline length ${packed.length} != ${expected}`);
  const raw=Buffer.alloc(width*height*channels);let src=0;
  for(let y=0;y<height;y++){
    const filter=packed[src++],row=y*stride,prev=(y-1)*stride;
    for(let x=0;x<stride;x++){
      const f=packed[src++],a=x>=channels?raw[row+x-channels]:0,b=y?raw[prev+x]:0,c=(y&&x>=channels)?raw[prev+x-channels]:0;
      let v;if(filter===0)v=f;else if(filter===1)v=(f+a)&255;else if(filter===2)v=(f+b)&255;else if(filter===3)v=(f+Math.floor((a+b)/2))&255;else if(filter===4)v=(f+paeth(a,b,c))&255;else throw new Error(`Unsupported PNG filter ${filter}`);
      raw[row+x]=v;
    }
  }
  const rgba=Buffer.alloc(width*height*4);
  for(let i=0,j=0;i<raw.length;i+=channels,j+=4){rgba[j]=raw[i];rgba[j+1]=raw[i+1];rgba[j+2]=raw[i+2];rgba[j+3]=channels===4?raw[i+3]:255;}
  return{width,height,rgba};
}

const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function crc32(buf){let c=0xffffffff;for(const b of buf)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function chunk(type,data=Buffer.alloc(0)){const t=Buffer.from(type,'ascii'),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([t,data])),8+data.length);return out;}
function filterByte(filter,x,a,b,c){if(filter===0)return x;if(filter===1)return(x-a)&255;if(filter===2)return(x-b)&255;if(filter===3)return(x-Math.floor((a+b)/2))&255;return(x-paeth(a,b,c))&255;}
function encodeRgba(width,height,rgba){
  const stride=width*4,rows=[];
  for(let y=0;y<height;y++){
    const row=y*stride,prev=(y-1)*stride;let best=null,bestScore=Infinity;
    for(let filter=0;filter<=4;filter++){
      const candidate=Buffer.alloc(stride+1);candidate[0]=filter;let score=0;
      for(let x=0;x<stride;x++){
        const cur=rgba[row+x],a=x>=4?rgba[row+x-4]:0,b=y?rgba[prev+x]:0,c=(y&&x>=4)?rgba[prev+x-4]:0,v=filterByte(filter,cur,a,b,c);candidate[x+1]=v;score+=Math.min(v,256-v);
      }
      if(score<bestScore){bestScore=score;best=candidate;}
    }
    rows.push(best);
  }
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  const compressed=zlib.deflateSync(Buffer.concat(rows),{level:9});
  return Buffer.concat([PNG_SIG,chunk('IHDR',ihdr),chunk('IDAT',compressed),chunk('IEND')]);
}

function colorAt(rgba,width,x,y){const i=(y*width+x)*4;return[rgba[i],rgba[i+1],rgba[i+2],rgba[i+3]];}
function rgbDist(a,b){const dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];return Math.sqrt(dr*dr+dg*dg+db*db);}
function patchAverage(rgba,width,height,x0,y0,x1,y1){let r=0,g=0,b=0,n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const p=colorAt(rgba,width,x,y);if(p[3]<128)continue;r+=p[0];g+=p[1];b+=p[2];n++;}return n?[r/n,g/n,b/n]:[255,255,255];}
function borderRefs(rgba,width,height){
  const band=Math.max(2,Math.round(Math.min(width,height)*0.012)),bins=new Map();
  const add=(x,y)=>{const p=colorAt(rgba,width,x,y);if(p[3]<128)return;const key=`${p[0]>>4},${p[1]>>4},${p[2]>>4}`;let v=bins.get(key);if(!v){v={n:0,r:0,g:0,b:0};bins.set(key,v);}v.n++;v.r+=p[0];v.g+=p[1];v.b+=p[2];};
  for(let y=0;y<height;y+=Math.max(1,Math.floor(height/256))){for(let x=0;x<band;x++)add(x,y);for(let x=width-band;x<width;x++)add(x,y);}
  for(let x=0;x<width;x+=Math.max(1,Math.floor(width/256))){for(let y=0;y<band;y++)add(x,y);for(let y=height-band;y<height;y++)add(x,y);}
  return [...bins.values()].sort((a,b)=>b.n-a.n).slice(0,18).map(v=>[v.r/v.n,v.g/v.n,v.b/v.n]);
}
function bilinear(c00,c10,c01,c11,u,v){const out=[0,0,0];for(let k=0;k<3;k++){const top=c00[k]*(1-u)+c10[k]*u,bottom=c01[k]*(1-u)+c11[k]*u;out[k]=top*(1-v)+bottom*v;}return out;}
function analyzeAlpha(rgba,width,height){
  let transparent=0,opaque=0,borderTransparent=0,borderCount=0;const band=Math.max(2,Math.round(Math.min(width,height)*0.01));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const a=rgba[(y*width+x)*4+3];if(a<=16)transparent++;if(a>=240)opaque++;if(x<band||x>=width-band||y<band||y>=height-band){borderCount++;if(a<=16)borderTransparent++;}}
  const total=width*height;return{transparentRatio:transparent/total,opaqueRatio:opaque/total,borderTransparentRatio:borderTransparent/borderCount};
}
function makeTransparent(image){
  const{width,height,rgba}=image,pre=analyzeAlpha(rgba,width,height);
  if(pre.borderTransparentRatio>=.94&&pre.transparentRatio>=.08)return{rgba,changed:false,analysis:pre};
  const refs=borderRefs(rgba,width,height);if(!refs.length)throw new Error('Could not infer item background colors');
  const patch=Math.max(16,Math.round(Math.min(width,height)*.035)),c00=patchAverage(rgba,width,height,0,0,patch,patch),c10=patchAverage(rgba,width,height,width-patch,0,width,patch),c01=patchAverage(rgba,width,height,0,height-patch,patch,height),c11=patchAverage(rgba,width,height,width-patch,height-patch,width,height);
  const scoreAt=(x,y)=>{const p=colorAt(rgba,width,x,y),u=width>1?x/(width-1):0,v=height>1?y/(height-1):0,expected=bilinear(c00,c10,c01,c11,u,v);let d=rgbDist(p,expected);for(const ref of refs)d=Math.min(d,rgbDist(p,ref));return d;};
  const n=width*height,seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
  const seed=(x,y)=>{const idx=y*width+x;if(seen[idx])return;seen[idx]=1;queue[tail++]=idx;};
  for(let x=0;x<width;x++){seed(x,0);seed(x,height-1);}for(let y=1;y<height-1;y++){seed(0,y);seed(width-1,y);}
  const dirs=[[-1,0],[1,0],[0,-1],[0,1]];
  while(head<tail){const idx=queue[head++],x=idx%width,y=Math.floor(idx/width),cur=colorAt(rgba,width,x,y);for(const[dX,dY]of dirs){const nx=x+dX,ny=y+dY;if(nx<0||ny<0||nx>=width||ny>=height)continue;const ni=ny*width+nx;if(seen[ni])continue;const next=colorAt(rgba,width,nx,ny),score=scoreAt(nx,ny),local=rgbDist(cur,next);if(next[3]<250||score<=58||(score<=96&&local<=22)){seen[ni]=1;queue[tail++]=ni;}}}
  let changedPixels=0;
  for(let idx=0;idx<n;idx++)if(seen[idx]){const x=idx%width,y=Math.floor(idx/width),score=scoreAt(x,y),aIndex=idx*4+3,old=rgba[aIndex];let next;if(score<=16)next=0;else if(score>=72)next=Math.min(old,255);else next=Math.min(old,Math.round(((score-16)/(72-16))*255));if(next!==old){rgba[aIndex]=next;changedPixels++;}}
  const analysis=analyzeAlpha(rgba,width,height);
  if(analysis.borderTransparentRatio<.90)throw new Error(`Transparent border coverage too low: ${(analysis.borderTransparentRatio*100).toFixed(1)}%`);
  if(analysis.transparentRatio<.08)throw new Error(`Too little background became transparent: ${(analysis.transparentRatio*100).toFixed(1)}%`);
  if(analysis.opaqueRatio<.02)throw new Error(`Foreground item was over-removed: opaque ${(analysis.opaqueRatio*100).toFixed(1)}%`);
  return{rgba,changed:changedPixels>0,analysis,changedPixels};
}

let changedFiles=0;
for(const path of ITEM_PATHS){
  if(!fs.existsSync(path))throw new Error(`Missing item PNG: ${path}`);
  const decoded=decodePng(fs.readFileSync(path)),result=makeTransparent(decoded);
  if(result.changed){fs.writeFileSync(path,encodeRgba(decoded.width,decoded.height,result.rgba));changedFiles++;}
  const a=result.analysis;
  console.log(`${path}: ${result.changed?'materialized':'already transparent'}; transparent=${(a.transparentRatio*100).toFixed(1)}% border=${(a.borderTransparentRatio*100).toFixed(1)}% opaque=${(a.opaqueRatio*100).toFixed(1)}%`);
}
console.log(`Transparent item-art v1 complete: ${changedFiles}/${ITEM_PATHS.length} files changed.`);
