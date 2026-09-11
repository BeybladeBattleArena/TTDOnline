(() => {
  'use strict';
  if(window.__TTD_DARK_MONASTERY_V1)return;
  window.__TTD_DARK_MONASTERY_V1=true;

  const CORE=window.__TTD_CORE_API_V1;
  if(!CORE)throw new Error('Dark Monastery requires the native TTD core API.');

  const DM_ID='dark_monastery';
  const DM_STAGE={
    name:'The Lower Cloister — Test Chamber',
    waves:1,
    carryover:[],
    introduce:{},
    smallBoss:{},
    subBoss:null,
    darkMonastery:true,
  };
  ADVENTURES[DM_ID]={
    name:'Dark Monastery',
    campaign:true,
    darkMonastery:true,
    roam3d:true,
    stages:[DM_STAGE],
  };

  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const asset=(p)=>typeof window.__TTD_ASSET_URL==='function'?window.__TTD_ASSET_URL(p):p;
  const PLAYER_HP=50;
  const ROOM={halfX:230,nearZ:175,farZ:-175};
  const CLOSE_RANGE=74;
  const MID_RANGE=172;
  const DICE_Z=145;
  const DICE_X=[-120,-60,0,60,120];

  // Static collision. All entries are in logical floor-space; rendering projects them into the
  // pseudo-3D room. Pits are deliberately treated as expanded solids for AI/player movement so
  // an entity's body radius, not merely its center point, must remain on safe floor.
  const PILLARS=[
    {x:-112,z:-18,r:27},
    {x:112,z:-18,r:27},
  ];
  const BLOCKS=[
    {x:0,z:-146,w:82,h:24},
    {x:-184,z:-88,w:30,h:70},
    {x:184,z:-88,w:30,h:70},
  ];
  const PITS=[
    {x:-177,z:69,w:68,h:88},
    {x:177,z:69,w:68,h:88},
  ];

  const TYPES={
    skeleton:{
      name:'Skeleton',rank:'normal',hp:38,speed:30,radius:15,mass:1.0,proxyKey:'goblin',
      physicalDR:.05,stunTimeResist:.05,weak:['holy','metal'],resist:['shadow','fire','nature','water','lightning','ice'],immune:['poison'],
      marker:'#ece4d1',bone:'#e9e0ca',economy:'standard',
    },
    red_skeleton:{
      name:'Red Skeleton',rank:'elite',hp:38,speed:30,radius:15,mass:1.08,proxyKey:'goblin',
      physicalDR:.08,stunTimeResist:.05,weak:['holy'],resist:['shadow','fire','nature','water','lightning','wind'],immune:['poison'],
      marker:'#c84b44',bone:'#bd514c',economy:'standard',revives:true,
    },
    giant_skeleton:{
      name:'Giant Skeleton',rank:'smallBoss',hp:520,speed:18,radius:31,mass:4.6,proxyKey:'ogre',
      physicalDR:.03,stunTimeResist:0,weak:['holy','metal','earth'],resist:['shadow','fire','nature','water','lightning','ice','wind'],immune:['poison'],
      marker:'#eee3c8',bone:'#e5d8bd',economy:'standard',
    },
    dark_goblin:{
      name:'Dark Goblin',rank:'normal',hp:49,speed:34,radius:14,mass:.92,proxyKey:'goblin',
      physicalDR:0,stunTimeResist:0,weak:['holy','fire'],resist:['nature','poison'],immune:[],
      marker:'#7b4c36',bone:null,economy:'standard',
    },
  };

  const runtime={
    active:false,raf:0,lastTs:0,w:1,h:1,back:null,front:null,joy:null,joyKnob:null,
    joyX:0,joyZ:0,keys:new Set(),player:null,actors:[],decor:[],projectiles:[],floaters:[],
    avatar:null,spawnClock:0,spawned:new Set(),clearClock:0,cleared:false,
  };

  const style=document.createElement('style');
  style.id='ttdDarkMonasteryStyleV1';
  style.textContent=`
    #gameScreen.ttd-dark-monastery-v1 #laneWrap{position:relative!important;background:#080b12!important;overflow:hidden!important;}
    #gameScreen.ttd-dark-monastery-v1 #laneCanvas{position:relative;z-index:2;background:transparent!important;}
    #ttdDarkMonasteryBackV1,#ttdDarkMonasteryFrontV1{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;}
    #ttdDarkMonasteryBackV1{z-index:0}#ttdDarkMonasteryFrontV1{z-index:4}
    #ttdDarkMonasteryJoyV1{position:absolute;left:10px;bottom:10px;z-index:9;width:90px;height:90px;border-radius:50%;touch-action:none;pointer-events:auto;
      border:1px solid rgba(143,196,232,.46);background:radial-gradient(circle,rgba(143,196,232,.18),rgba(7,10,17,.74) 70%);box-shadow:inset 0 0 25px #0008,0 4px 14px #0007;}
    #ttdDarkMonasteryJoyKnobV1{position:absolute;left:30px;top:30px;width:30px;height:30px;border-radius:50%;pointer-events:none;
      background:radial-gradient(circle at 35% 30%,#d4ecfa,#8fc4e8 55%,#405e7c);box-shadow:0 3px 10px #0008;}
    #ttdDarkMonasteryHintV1{position:absolute;right:8px;top:8px;z-index:8;pointer-events:none;padding:5px 7px;border-radius:8px;
      border:1px solid rgba(217,178,106,.34);background:rgba(7,10,17,.73);color:#d7c9ac;font:700 8px 'Space Mono',monospace;letter-spacing:.025em;}
  `;
  document.head.appendChild(style);

  const baseStartAdventure=startAdventure;
  const baseUpdateSpawns=updateSpawns;
  const baseEnemyRenderPos=enemyRenderPos;
  const baseBuildPath=buildPath;
  const baseEndMatch=endMatch;
  const baseShowScreen=showScreen;

  function isDM(){return !!state?.__ttdDarkMonastery && state?.adventureStage===DM_STAGE;}

  function ensureCanvases(){
    const lane=document.getElementById('laneWrap');if(!lane)return false;
    const rect=lane.getBoundingClientRect(),dpr=clamp(window.devicePixelRatio||1,1,2);
    runtime.w=Math.max(1,rect.width);runtime.h=Math.max(1,rect.height);
    function one(id,z){
      let c=document.getElementById(id);
      if(!c){c=document.createElement('canvas');c.id=id;c.style.zIndex=String(z);lane.insertBefore(c,document.getElementById('laneCanvas')||lane.firstChild);}
      const pw=Math.max(1,Math.round(runtime.w*dpr)),ph=Math.max(1,Math.round(runtime.h*dpr));
      if(c.width!==pw||c.height!==ph){c.width=pw;c.height=ph;}
      c.style.width=runtime.w+'px';c.style.height=runtime.h+'px';
      const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return{c,g};
    }
    runtime.back=one('ttdDarkMonasteryBackV1',0);runtime.front=one('ttdDarkMonasteryFrontV1',4);
    return !!(runtime.back&&runtime.front);
  }

  function installControls(){
    const lane=document.getElementById('laneWrap');if(!lane||document.getElementById('ttdDarkMonasteryJoyV1'))return;
    const joy=document.createElement('div');joy.id='ttdDarkMonasteryJoyV1';
    const knob=document.createElement('div');knob.id='ttdDarkMonasteryJoyKnobV1';joy.appendChild(knob);
    const hint=document.createElement('div');hint.id='ttdDarkMonasteryHintV1';hint.textContent='FREE ROAM · MOVE WITH JOYSTICK';
    lane.append(joy,hint);runtime.joy=joy;runtime.joyKnob=knob;
    let pid=null;
    const setJoy=(ev)=>{
      const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=ev.clientX-cx,dy=ev.clientY-cy,max=29,len=Math.hypot(dx,dy)||1,k=Math.min(1,max/len);
      dx*=k;dy*=k;runtime.joyX=dx/max;runtime.joyZ=dy/max;
      knob.style.transform=`translate(${dx}px,${dy}px)`;
    };
    const release=(ev)=>{if(pid!=null&&ev?.pointerId!=null&&ev.pointerId!==pid)return;pid=null;runtime.joyX=runtime.joyZ=0;knob.style.transform='translate(0,0)';};
    joy.addEventListener('pointerdown',ev=>{pid=ev.pointerId;joy.setPointerCapture?.(pid);setJoy(ev);ev.preventDefault();},{passive:false});
    joy.addEventListener('pointermove',ev=>{if(ev.pointerId===pid)setJoy(ev);},{passive:false});
    joy.addEventListener('pointerup',release);joy.addEventListener('pointercancel',release);
  }

  function removeUi(){
    ['ttdDarkMonasteryBackV1','ttdDarkMonasteryFrontV1','ttdDarkMonasteryJoyV1','ttdDarkMonasteryHintV1'].forEach(id=>document.getElementById(id)?.remove());
    document.getElementById('gameScreen')?.classList.remove('ttd-dark-monastery-v1');
    runtime.back=runtime.front=runtime.joy=runtime.joyKnob=null;
  }

  function project(x,z,y=0){
    const w=runtime.w,h=runtime.h,depth=clamp((z-ROOM.farZ)/(ROOM.nearZ-ROOM.farZ),0,1),sc=(.48+depth*.58)*Math.max(.72,Math.min(1.12,w/410));
    return{x:w*.5+x*sc,y:h*.18+depth*h*.72-y*sc,scale:sc,depth};
  }

  function quad(g,pts,fill,stroke){
    g.beginPath();g.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);g.closePath();
    if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.stroke();}
  }

  function drawTorch(g,x,y,s=1){
    g.save();g.translate(x,y);g.shadowBlur=14*s;g.shadowColor='rgba(255,165,63,.9)';g.fillStyle='#ffd08a';g.beginPath();g.ellipse(0,-5*s,2.5*s,7*s,0,0,TAU);g.fill();g.shadowBlur=0;g.fillStyle='#6a4b31';g.fillRect(-2*s,1*s,4*s,7*s);g.restore();
  }

  function drawRoom(){
    if(!ensureCanvases())return;const g=runtime.back.g,w=runtime.w,h=runtime.h;g.clearRect(0,0,w,h);
    const wall=g.createLinearGradient(0,0,0,h*.64);wall.addColorStop(0,'#171b20');wall.addColorStop(.55,'#252820');wall.addColorStop(1,'#111922');g.fillStyle=wall;g.fillRect(0,0,w,h*.65);
    // stone wall courses and vertical ribs
    g.strokeStyle='rgba(152,148,119,.12)';g.lineWidth=1;
    for(let y=18;y<h*.62;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
    for(let row=0,y=18;y<h*.62;y+=32,row++)for(let x=(row%2)*27;x<w;x+=54){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+32);g.stroke();}
    for(const x of [w*.12,w*.38,w*.62,w*.88]){g.fillStyle='rgba(8,12,18,.55)';g.fillRect(x-10,0,20,h*.58);g.strokeStyle='rgba(126,130,117,.14)';g.strokeRect(x-10,0,20,h*.58);}
    // floor trapezoid
    const floor=[project(-ROOM.halfX,ROOM.farZ),project(ROOM.halfX,ROOM.farZ),project(ROOM.halfX,ROOM.nearZ),project(-ROOM.halfX,ROOM.nearZ)];
    quad(g,floor,'#172432','rgba(142,172,183,.14)');
    // floor tiles
    g.lineWidth=1;g.strokeStyle='rgba(105,151,175,.18)';
    for(let z=ROOM.farZ;z<=ROOM.nearZ;z+=35){const a=project(-ROOM.halfX,z),b=project(ROOM.halfX,z);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
    for(let x=-ROOM.halfX;x<=ROOM.halfX;x+=46){const a=project(x,ROOM.farZ),b=project(x,ROOM.nearZ);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
    // pits
    for(const p of PITS){const x0=p.x-p.w/2,x1=p.x+p.w/2,z0=p.z-p.h/2,z1=p.z+p.h/2;const pts=[project(x0,z0),project(x1,z0),project(x1,z1),project(x0,z1)];quad(g,pts,'#02050a','rgba(73,111,136,.55)');}
    // altar / wall blocks
    for(const b of BLOCKS){const x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.h/2,z1=b.z+b.h/2,top=12;const topPts=[project(x0,z0,top),project(x1,z0,top),project(x1,z1,top),project(x0,z1,top)];quad(g,topPts,'#33322c','rgba(110,104,87,.36)');}
    // pillars
    for(const p of PILLARS){const pt=project(p.x,p.z),sc=pt.scale,r=p.r*sc;g.fillStyle='#202525';g.fillRect(pt.x-r*.72,pt.y-r*2.5,r*1.44,r*2.6);g.fillStyle='rgba(107,105,84,.15)';g.fillRect(pt.x-r*.72,pt.y-r*2.5,r*.18,r*2.6);g.fillStyle='#37372f';g.fillRect(pt.x-r*.88,pt.y-r*.12,r*1.76,r*.28);}
    // wall lights
    drawTorch(g,w*.19,h*.25,.85);drawTorch(g,w*.81,h*.25,.85);drawTorch(g,w*.50,h*.31,.75);
    // suspended chandelier reminiscent of the supplied reference
    g.save();g.translate(w*.5,h*.24);g.strokeStyle='#7e4c2f';g.lineWidth=3;for(const dx of [-44,0,44]){g.beginPath();g.moveTo(dx,-h*.28);g.lineTo(dx*.62,0);g.stroke();}g.strokeStyle='#7d4a2c';g.lineWidth=7;g.beginPath();g.ellipse(0,0,58,17,0,0,TAU);g.stroke();for(let i=0;i<8;i++){const a=i/8*TAU,x=Math.cos(a)*58,y=Math.sin(a)*17;drawTorch(g,x,y-5,.68);}g.restore();
    const vign=g.createRadialGradient(w*.5,h*.53,10,w*.5,h*.53,Math.max(w,h)*.72);vign.addColorStop(.52,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.62)');g.fillStyle=vign;g.fillRect(0,0,w,h);
  }

  function circleRectBlocked(x,z,r,b){
    const nx=clamp(x,b.x-b.w/2,b.x+b.w/2),nz=clamp(z,b.z-b.h/2,b.z+b.h/2);return Math.hypot(x-nx,z-nz)<r+2;
  }
  function staticValid(x,z,r){
    if(x-r<-ROOM.halfX||x+r>ROOM.halfX||z-r<ROOM.farZ||z+r>ROOM.nearZ)return false;
    for(const p of PILLARS)if(Math.hypot(x-p.x,z-p.z)<r+p.r+2)return false;
    for(const b of BLOCKS)if(circleRectBlocked(x,z,r,b))return false;
    for(const p of PITS)if(circleRectBlocked(x,z,r+3,p))return false;
    return true;
  }
  function slideMove(ent,dx,dz){
    if(!dx&&!dz)return;let nx=ent.x+dx,nz=ent.z+dz;
    if(staticValid(nx,nz,ent.radius)){ent.x=nx;ent.z=nz;return;}
    if(staticValid(nx,ent.z,ent.radius))ent.x=nx;
    if(staticValid(ent.x,nz,ent.radius))ent.z=nz;
  }

  function bodies(){
    const list=[];if(runtime.player)list.push(runtime.player);
    for(const a of runtime.actors)if(a.e?.alive&&!a.deadPile&&!a.finalDead)list.push(a);
    return list;
  }
  function resolveBodySeparation(){
    const list=bodies();
    for(let pass=0;pass<4;pass++){
      for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
        const a=list[i],b=list[j];let dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz),min=a.radius+b.radius+2;
        if(dist>=min)continue;
        if(dist<.001){const seed=((a.id||'a').length*13+(b.id||'b').length*7+i*3+j)%628,ang=seed/100;dx=Math.cos(ang);dz=Math.sin(ang);dist=1;}
        const overlap=min-dist,ux=dx/dist,uz=dz/dist,sum=Math.max(.1,a.mass+b.mass),moveA=overlap*(b.mass/sum),moveB=overlap*(a.mass/sum);
        const ax=a.x-ux*moveA,az=a.z-uz*moveA,bx=b.x+ux*moveB,bz=b.z+uz*moveB;
        if(staticValid(ax,az,a.radius)){a.x=ax;a.z=az;}else if(staticValid(a.x-ux*moveA,a.z,a.radius))a.x-=ux*moveA;else if(staticValid(a.x,a.z-uz*moveA,a.radius))a.z-=uz*moveA;
        if(staticValid(bx,bz,b.radius)){b.x=bx;b.z=bz;}else if(staticValid(b.x+ux*moveB,b.z,b.radius))b.x+=ux*moveB;else if(staticValid(b.x,b.z+uz*moveB,b.radius))b.z+=uz*moveB;
      }
    }
  }

  function crowdPenalty(actor,x,z){
    let p=0;for(const b of bodies()){if(b===actor)continue;const d=Math.hypot(x-b.x,z-b.z),want=actor.radius+b.radius+6;if(d<want)p+=(want-d)*3;}return p;
  }
  function steerToward(actor,tx,tz,dt,speedMul=1,stop=0){
    const dx=tx-actor.x,dz=tz-actor.z,dist=Math.hypot(dx,dz);if(dist<=stop+.5)return;
    const base=Math.atan2(dz,dx),step=Math.min(Math.max(0,dist-stop),actor.def.speed*speedMul*dt),angles=[0,.42,-.42,.85,-.85,1.35,-1.35,1.9,-1.9,Math.PI];
    let best=null,bestScore=Infinity;
    for(const off of angles){const ang=base+off,nx=actor.x+Math.cos(ang)*step,nz=actor.z+Math.sin(ang)*step;if(!staticValid(nx,nz,actor.radius))continue;const score=Math.hypot(tx-nx,tz-nz)+crowdPenalty(actor,nx,nz)+(Math.abs(off)*5);if(score<bestScore){bestScore=score;best={nx,nz};}}
    if(best){actor.x=best.nx;actor.z=best.nz;}
  }

  function dieAnchor(idx){return{x:DICE_X[idx%5],z:DICE_Z,idx,kind:'die',radius:11};}
  function liveFrontDice(){const out=[];for(let i=0;i<5;i++)if(state?.board?.[i])out.push(dieAnchor(i));return out;}
  function highestHpDie(){
    let best=[],hp=-Infinity;for(let i=0;i<15;i++){const d=state?.board?.[i];if(!d)continue;const v=Number(d.hp)||0;if(v>hp){hp=v;best=[i];}else if(v===hp)best.push(i);}if(!best.length)return null;return dieAnchor(best[Math.floor(Math.random()*best.length)]);
  }
  function nearestCloseTarget(a){
    const list=[{kind:'player',x:runtime.player.x,z:runtime.player.z,runtime:runtime.player},...liveFrontDice()];let best=null,bd=Infinity;for(const t of list){const d=Math.hypot(t.x-a.x,t.z-a.z);if(d<bd){bd=d;best=t;}}return best?{...best,d:bd}:null;
  }
  function nearestMovementTarget(a){
    const c=nearestCloseTarget(a);return c||{kind:'player',x:runtime.player.x,z:runtime.player.z,d:Math.hypot(runtime.player.x-a.x,runtime.player.z-a.z)};
  }

  function attackElementMultiplier(actor,aff){
    const d=actor.def;if(!aff)return 1;const entries=Object.entries(aff),primary=entries.some(([,v])=>Number(v)>=1),base=primary?0:1;let total=base;
    for(const [el,val0] of entries){const val=Number(val0)||0;let m=1;if(d.immune.includes(el))m=0;else if(d.weak.includes(el))m=1.5;else if(d.resist.includes(el))m=.5;total+=val*m;}
    const neutral=base+entries.reduce((s,[,v])=>s+(Number(v)||0),0);return neutral>0?total/neutral:1;
  }
  function sourceAffinities(){
    const key=window.currentAttackerDieKey;if(!key||!state?.board)return null;const die=state.board.find(d=>d?.key===key);if(!die)return null;try{return effAffinities(die);}catch(_){return null;}
  }
  function containsHoly(aff){return !!(aff&&Number(aff.holy)>0);}

  function reconcileIncomingDamage(actor){
    const e=actor.e;if(!e)return;
    if(actor.lastAlive && !e.alive){
      const aff=sourceAffinities(),holy=containsHoly(aff),nativeDamage=Math.max(0,actor.lastHp-e.hp);
      const ratio=attackElementMultiplier(actor,aff)*(1-actor.def.physicalDR);
      const correctedHp=actor.lastHp-nativeDamage*ratio;
      const nativeReward=actor.def.rank==='smallBoss'?24:3;
      // A resisted hit can be lethal to the neutral proxy while the authored monster should survive.
      // Undo that native death before considering Blood Revival / true defeat.
      if(correctedHp>0){
        state.kills=Math.max(0,state.kills-1);state.sp=Math.max(0,state.sp-nativeReward);
        e.hp=correctedHp;e.alive=true;if(!state.enemies.includes(e))state.enemies.push(e);
      }else if(actor.def.revives && actor.bloodDrain<3 && !holy){
        // The native kill occurred first, so undo its ordinary-mob accounting and convert it into
        // the Red Skeleton's not-yet-true defeat. Coins are disabled on this proxy, so no drop can leak.
        state.kills=Math.max(0,state.kills-1);state.sp=Math.max(0,state.sp-nativeReward);
        actor.bloodDrain++;actor.deadPile=true;actor.reviveT=10;actor.lastHolyKill=false;e.hp=0;e.alive=false;
        addBonePile(actor,true);toast(`Blood Drained ${actor.bloodDrain}/3`);
      }else{
        actor.finalDead=true;actor.lastHolyKill=holy;actor.deadPile=false;actor.shatterT=.7;
        if(actor.type==='skeleton')addBonePile(actor,false);
        else if(actor.type==='red_skeleton'||actor.type==='giant_skeleton')addShatter(actor);
        standardTrueDeathDrop(actor);
      }
    }else if(e.alive&&e.hp<actor.lastHp-.0001){
      const observed=actor.lastHp-e.hp,aff=sourceAffinities();let ratio=attackElementMultiplier(actor,aff);
      // Current core proxies are deliberately neutral. Apply the authored elemental profile here.
      // Physical DR is represented conservatively on every direct hit in this test slice because
      // the monolith does not expose the per-hit category context to bridge scripts yet.
      ratio*=1-actor.def.physicalDR;
      const wanted=observed*ratio,diff=wanted-observed;e.hp-=diff;
      if(e.hp<=0){e.hp=0;e.alive=false;}
    }
    // Poison immunity is exact because poison is represented directly on the enemy instance.
    if(actor.def.immune.includes('poison')){e.poison=null;if(e.statuses?.poison)e.statuses.poison=null;}
    // Skeleton/Red Skeleton specifically shave only stun/pause duration rather than all statuses.
    if(actor.def.stunTimeResist&&e.pausedT>actor.lastPaused+.015)e.pausedT*=1-actor.def.stunTimeResist;
    actor.lastHp=e.hp;actor.lastAlive=e.alive;actor.lastPaused=e.pausedT||0;
  }

  function standardTrueDeathDrop(actor){
    if(!state?.adventure||Math.random()>=.35)return;const p=project(actor.x,actor.z),gold=Math.random()<.3;state.coins.push({x:p.x,y:p.y,value:gold?(5+Math.floor(Math.random()*6)):(1+Math.floor(Math.random()*3)),isGold:gold,t:0,ttl:4});
  }

  function addBonePile(actor,red=false){runtime.decor.push({kind:'bones',x:actor.x,z:actor.z,t:0,ttl:red?11:6,color:red?'#b24843':'#d8ceb8',persist:red});}
  function addShatter(actor){runtime.decor.push({kind:'shatter',x:actor.x,z:actor.z,t:0,ttl:.75,color:actor.def.marker,seed:Math.random()*100});}

  function spawnActor(type,x,z,id){
    const def=TYPES[type],diff=state?.adventureDiff||{hpMult:1},hp=Math.round(def.hp*(diff.hpMult||1));
    const e={key:def.proxyKey,kind:'normal',tier:def.rank==='smallBoss'?'small':'normal',hp,maxHp:hp,dist:10,speed:0,slowTimers:[],armorBreaks:[],slowMult:1,poison:null,
      isBoss:def.rank==='smallBoss',alive:true,hitFlash:0,dmgReduction:0,dmgMult:1,skills:[],pausedT:0,atk:Math.max(1,Math.round(hp*.12)),lift:null,noCoin:true,__ttdDM:true};
    const a={id:id||`${type}_${Math.random().toString(36).slice(2)}`,type,def,e,x,z,radius:def.radius,mass:def.mass,cool:Math.random()*.8,checkT:Math.random()*1.5,
      cast:null,anim:null,bloodDrain:0,deadPile:false,reviveT:0,finalDead:false,shatterT:0,lastHp:hp,lastAlive:true,lastPaused:0};
    runtime.actors.push(a);state.enemies.push(e);return a;
  }

  function reviveRed(a){
    const diff=state?.adventureDiff||{hpMult:1},hp=Math.round(a.def.hp*(diff.hpMult||1));a.deadPile=false;a.reviveT=0;a.e.hp=hp;a.e.maxHp=hp;a.e.alive=true;a.lastHp=hp;a.lastAlive=true;a.cool=1.1;
    if(!state.enemies.includes(a.e))state.enemies.push(a.e);
    runtime.decor=runtime.decor.filter(d=>!(d.kind==='bones'&&d.persist&&Math.hypot(d.x-a.x,d.z-a.z)<4));
    toast('The Red Skeleton rises again.');
  }

  function syncThreatDist(a){
    // Preserve ordinary die targeting semantics: the closest threat to the player/dice reads as
    // furthest along the old path, while nobody can ever reach the native escape threshold.
    const d=Math.min(330,Math.hypot(a.x-runtime.player.x,a.z-runtime.player.z));a.e.dist=totalLen*clamp(.93-d/520,.16,.93);
  }

  function damagePlayer(amount,kind='hit',status=null){
    if(!isDM()||!state.running)return;state.lives=Math.max(0,state.lives-amount);runtime.player.flash=.18;
    const p=project(runtime.player.x,runtime.player.z,18);runtime.floaters.push({x:p.x,y:p.y,text:`-${Math.round(amount)}`,t:0,ttl:.8,color:'#ff8b7f'});
    if(status?.stun)runtime.player.stunT=Math.max(runtime.player.stunT,status.stun);if(status?.slow)runtime.player.slowT=Math.max(runtime.player.slowT,status.slow);
    if(state.lives<=0){baseEndMatch('defeat');document.getElementById('overlayTitle').textContent='Dark Monastery — Defeated';document.getElementById('overlayText').textContent='Your avatar fell inside the monastery.';}
  }
  function damageDie(idx,amount,category='physical',elements=[] ,status=null){
    const die=state?.board?.[idx];if(!die)return;let v=amount;try{v=Math.max(0,v-dieJewelBonus(die,category==='special'?'specDef':'physDef'));}catch(_){}
    const els=Array.isArray(elements)?elements.filter(Boolean):[elements].filter(Boolean);if(els.length){let mult=0;for(const el of els){let aff=0;try{aff=Number(effAffinities(die)?.[el])||0;}catch(_){}mult+=1-Math.min(.9,aff/2);}v*=mult/els.length;}
    die.hp-=v;triggerTilePulse(idx,category==='special'?'pulse-frost':'pulse-hit',.4);
    if(status?.stun&&Math.random()<(status.chance??1))die.disabledT=Math.max(die.disabledT||0,status.stun+(state.adventureDiff?.durBonus||0));
    if(status?.slow&&Math.random()<(status.chance??1)){die.buffs=die.buffs||[];die.buffs.push({type:'as',amount:-.35,t:status.slow+(state.adventureDiff?.durBonus||0)});}
    if(die.hp<=0){state.board[idx]=null;toast('A die was destroyed!');}
  }
  function hitTarget(t,amount,category,elements,status){if(!t)return;if(t.kind==='player')damagePlayer(amount,category,status);else damageDie(t.idx,amount,category,elements,status);}

  function targetPoint(t){return t?.kind==='player'?{x:runtime.player.x,z:runtime.player.z}:{x:t.x,z:t.z};}
  function startProjectile(a,t,dmg,cfg={}){
    const from=project(a.x,a.z,a.radius*.8),tp=targetPoint(t),to=project(tp.x,tp.z,8);runtime.projectiles.push({from,to,t:0,dur:cfg.dur||.38,color:cfg.color||'#e5dac1',size:cfg.size||4,a,t,dmg,cfg,target:t});
  }
  function resolveProjectile(p){
    const cfg=p.cfg,t=p.target;if(!p.a.e.alive||p.a.deadPile)return;
    if(cfg.splash&&t.kind==='die'){
      hitTarget(t,p.dmg,'physical',[] ,cfg.status||null);const row=Math.floor(t.idx/5),col=t.idx%5;for(const c of [col-1,col+1])if(c>=0&&c<5){const idx=row*5+c;if(state.board[idx])damageDie(idx,p.dmg*.7,'physical',[],cfg.status||null);}
    }else hitTarget(t,p.dmg,cfg.category||'physical',cfg.elements||[],cfg.status||null);
  }

  function beginSkeletonCast(a,t,kind){
    if(kind==='bone'){a.cast={kind:'bone',t:0,dur:.6,target:t};a.anim={kind:'hop',t:0};}
    else a.cast={kind:'headbutt',t:0,dur:.72,target:t};
  }
  function updateSkeleton(a,dt,red=false){
    const dmgMult=state.adventureDiff?.dmgMult||1;if(a.cast)return updateSkeletonCast(a,dt,red,dmgMult);
    a.cool=Math.max(0,a.cool-dt);const close=nearestCloseTarget(a),front=liveFrontDice(),move=nearestMovementTarget(a),d=close?.d??999;
    if(a.cool<=0&&d<=CLOSE_RANGE&&close){beginSkeletonCast(a,close,'head');a.cool=4;return;}
    if(a.cool<=0&&d>CLOSE_RANGE&&front.length){const t=highestHpDie();if(t){beginSkeletonCast(a,t,'bone');a.cool=4;return;}}
    steerToward(a,move.x,move.z,dt,1,CLOSE_RANGE*.78);
  }
  function updateSkeletonCast(a,dt,red,dmgMult){
    const c=a.cast;c.t+=dt;const tp=targetPoint(c.target);
    if(c.kind==='bone'){
      if(c.t>=.6&&!c.fired){c.fired=true;startProjectile(a,c.target,(red?7:5)*dmgMult,{dur:.42,size:4.5});}
      if(c.t>=1.0)a.cast=null;
    }else{
      // Pull back for .6, then snap forward; visual position changes but collision never permits phasing.
      const dx=tp.x-a.x,dz=tp.z-a.z,len=Math.hypot(dx,dz)||1,ux=dx/len,uz=dz/len;
      if(c.t<.6)slideMove(a,-ux*a.def.speed*.15*dt,-uz*a.def.speed*.15*dt);
      else if(c.t<.68)slideMove(a,ux*a.def.speed*5.5*dt,uz*a.def.speed*5.5*dt);
      if(c.t>=.66&&!c.hit){c.hit=true;hitTarget(c.target,(red?12:10)*dmgMult,'physical',[],null);}
      if(c.t>=1.18)a.cast=null;
    }
  }

  function updateGiant(a,dt){
    const dmgMult=state.adventureDiff?.dmgMult||1;if(a.cast)return updateGiantCast(a,dt,dmgMult);
    a.cool=Math.max(0,a.cool-dt);const close=nearestCloseTarget(a),front=liveFrontDice(),move=nearestMovementTarget(a),d=close?.d??999;
    if(a.cool<=0&&d<=CLOSE_RANGE+18&&close){a.cast={kind:'hands',t:0,target:close};a.cool=5;return;}
    if(a.cool<=0&&d>CLOSE_RANGE&&front.length){const t=highestHpDie();if(t){a.cast={kind:'bigbone',t:0,target:t};a.cool=6;return;}}
    steerToward(a,move.x,move.z,dt,1,CLOSE_RANGE*.9);
  }
  function updateGiantCast(a,dt,dmgMult){
    const c=a.cast;c.t+=dt;
    if(c.kind==='bigbone'){
      if(c.t>=.7&&!c.fired){c.fired=true;startProjectile(a,c.target,16*dmgMult,{dur:.46,size:8,splash:true,status:{stun:.8,chance:.10}});}
      if(c.t>=1.2)a.cast=null;
    }else{
      if(c.t>=.52&&!c.hit1){c.hit1=true;hitTarget(c.target,13*dmgMult,'physical',['shadow','ice'],{slow:.6,chance:.05});}
      if(c.t>=.82&&!c.hit2){
        c.hit2=true;let t=c.target;
        if(c.target.kind==='die'){
          const row=Math.floor(c.target.idx/5),pool=[];
          for(let i=0;i<15;i++)if(state.board[i]&&Math.abs(Math.floor(i/5)-row)<=1)pool.push(dieAnchor(i));
          if(pool.length)t=pool[Math.floor(Math.random()*pool.length)]; // may intentionally select the same die twice
        }
        hitTarget(t,13*dmgMult,'physical',['shadow','ice'],{slow:.6,chance:.05});
      }
      if(c.t>=1.92)a.cast=null;
    }
  }

  function updateDarkGoblin(a,dt){
    const dmgMult=state.adventureDiff?.dmgMult||1;if(a.cast)return updateDarkCast(a,dt,dmgMult);
    a.cool=Math.max(0,a.cool-dt);a.checkT-=dt;const close=nearestCloseTarget(a),move=nearestMovementTarget(a),d=close?.d??999;
    if(d>CLOSE_RANGE&&d<=MID_RANGE&&a.checkT<=0){a.checkT=3;if(a.cool<=0&&Math.random()<.45){const t=close||move;a.cast={kind:'leap',t:0,target:t,sx:a.x,sz:a.z};a.cool=4;return;}}
    if(d<=CLOSE_RANGE&&a.cool<=0&&close){a.cast={kind:'slash',t:0,target:close};a.cool=4.5;return;}
    steerToward(a,move.x,move.z,dt,1,CLOSE_RANGE*.72);
  }
  function updateDarkCast(a,dt,dmgMult){
    const c=a.cast;c.t+=dt,tp=targetPoint(c.target),dx=tp.x-a.x,dz=tp.z-a.z,len=Math.hypot(dx,dz)||1,ux=dx/len,uz=dz/len;
    if(c.kind==='leap'){
      if(c.t>=.3&&c.t<.62)slideMove(a,ux*a.def.speed*5.0*dt,uz*a.def.speed*5.0*dt);
      if(c.t>=.58&&!c.hit){c.hit=true;hitTarget(c.target,5*dmgMult,'physical',[],null);}
      if(c.t>=1.23)a.cast=null;
    }else{
      if(c.t>=.35&&c.t<.46)slideMove(a,ux*a.def.speed*4*dt,uz*a.def.speed*4*dt);
      if(c.t>=.42&&!c.hit1){c.hit1=true;hitTarget(c.target,6*dmgMult,'physical',[],null);}
      if(c.t>=.67&&c.t<.83)slideMove(a,ux*a.def.speed*5*dt,uz*a.def.speed*5*dt);
      if(c.t>=.78&&!c.hit2){c.hit2=true;hitTarget(c.target,6*dmgMult,'physical',[],null);}
      if(c.t>=1.53)a.cast=null;
    }
  }

  function updatePlayer(dt){
    const p=runtime.player;if(!p)return;p.flash=Math.max(0,(p.flash||0)-dt);p.stunT=Math.max(0,(p.stunT||0)-dt);p.slowT=Math.max(0,(p.slowT||0)-dt);if(p.stunT>0)return;
    let x=runtime.joyX,z=runtime.joyZ;if(runtime.keys.has('arrowleft')||runtime.keys.has('a'))x-=1;if(runtime.keys.has('arrowright')||runtime.keys.has('d'))x+=1;if(runtime.keys.has('arrowup')||runtime.keys.has('w'))z-=1;if(runtime.keys.has('arrowdown')||runtime.keys.has('s'))z+=1;
    const len=Math.hypot(x,z);if(len>1){x/=len;z/=len;}const speed=82*(p.slowT>0?.65:1);slideMove(p,x*speed*dt,z*speed*dt);
  }

  function spawnSchedule(){
    const t=runtime.spawnClock;
    if(t>=.4&&!runtime.spawned.has('s1')){runtime.spawned.add('s1');spawnActor('skeleton',-88,-92,'s1');}
    if(t>=2.0&&!runtime.spawned.has('dg1')){runtime.spawned.add('dg1');spawnActor('dark_goblin',92,-112,'dg1');}
    if(t>=5.0&&!runtime.spawned.has('rs1')){runtime.spawned.add('rs1');spawnActor('red_skeleton',154,-54,'rs1');}
    if(t>=10.0&&!runtime.spawned.has('g1')){runtime.spawned.add('g1');spawnActor('giant_skeleton',-145,16,'g1');toast('A Giant Skeleton enters the cloister.');}
  }

  function updateActors(dt){
    runtime.spawnClock+=dt;spawnSchedule();
    for(const a of runtime.actors){
      if(a.deadPile){a.reviveT-=dt;if(a.reviveT<=0)reviveRed(a);continue;}
      if(a.finalDead)continue;
      reconcileIncomingDamage(a);if(!a.e.alive)continue;
      if((a.e.pausedT||0)>0||a.e.statuses?.frozen?.t>0)continue;
      if(a.type==='skeleton')updateSkeleton(a,dt,false);
      else if(a.type==='red_skeleton')updateSkeleton(a,dt,true);
      else if(a.type==='giant_skeleton')updateGiant(a,dt);
      else if(a.type==='dark_goblin')updateDarkGoblin(a,dt);
      syncThreatDist(a);
    }
    resolveBodySeparation();
    // A body-separation correction may push something toward static geometry; never leave it there.
    for(const b of bodies())if(!staticValid(b.x,b.z,b.radius)){b.x=clamp(b.x,-ROOM.halfX+b.radius,ROOM.halfX-b.radius);b.z=clamp(b.z,ROOM.farZ+b.radius,ROOM.nearZ-b.radius);}
    if(runtime.spawned.size>=4&&runtime.actors.every(a=>a.finalDead)){
      runtime.clearClock+=dt;if(runtime.clearClock>1.25&&!runtime.cleared){runtime.cleared=true;state.completedWaves=Math.max(1,state.completedWaves||0);baseEndMatch('clear');document.getElementById('overlayTitle').textContent='Dark Monastery Test Cleared';document.getElementById('overlayText').textContent='The lower cloister is quiet — for now.';}
    }
  }

  function updateFx(dt){
    for(let i=runtime.projectiles.length-1;i>=0;i--){const p=runtime.projectiles[i];p.t+=dt;if(p.t>=p.dur){resolveProjectile(p);runtime.projectiles.splice(i,1);}}
    for(let i=runtime.decor.length-1;i>=0;i--){const d=runtime.decor[i];d.t+=dt;if(!d.persist&&d.t>=d.ttl)runtime.decor.splice(i,1);}
    for(let i=runtime.floaters.length-1;i>=0;i--){const f=runtime.floaters[i];f.t+=dt;if(f.t>=f.ttl)runtime.floaters.splice(i,1);}
  }

  function drawBoneFigure(g,p,a){
    const sc=p.scale*(a.type==='giant_skeleton'?1.55:1),r=a.radius*sc*.78,drain=a.bloodDrain||0;
    let color=a.def.marker;if(a.type==='red_skeleton'){const colors=['#c94a43','#b56a4d','#a98c67','#d1c49e'];color=colors[drain]||colors[3];}
    g.save();g.translate(p.x,p.y);g.strokeStyle=color;g.fillStyle=color;g.lineCap='round';g.lineWidth=Math.max(1.5,2.5*sc);
    g.beginPath();g.arc(0,-r*.55,r*.28,0,TAU);g.fill();g.beginPath();g.moveTo(0,-r*.25);g.lineTo(0,r*.45);g.moveTo(-r*.42,0);g.lineTo(r*.42,0);g.moveTo(0,r*.44);g.lineTo(-r*.33,r*.9);g.moveTo(0,r*.44);g.lineTo(r*.33,r*.9);g.stroke();
    if(a.type==='giant_skeleton'){for(const side of [-1,1]){g.strokeStyle='rgba(25,5,35,.75)';g.shadowBlur=8*sc;g.shadowColor='#35114d';g.lineWidth=4*sc;g.beginPath();g.moveTo(side*r*.52,-r*.04);g.lineTo(side*r*1.08,r*.26);g.stroke();g.shadowBlur=0;g.fillStyle='#e4d7bd';g.beginPath();g.arc(side*r*1.08,r*.26,r*.17,0,TAU);g.fill();}}
    g.restore();
  }
  function drawDarkGoblin(g,p,a){
    const sc=p.scale,r=a.radius*sc;g.save();g.translate(p.x,p.y);g.fillStyle='#5d3b2c';g.beginPath();g.arc(0,0,r*.52,0,TAU);g.fill();g.fillStyle='#3b1c1d';g.beginPath();g.moveTo(-r*.72,-r*.65);g.quadraticCurveTo(0,-r*1.05,r*.72,-r*.65);g.lineTo(r*.58,r*.55);g.lineTo(-r*.58,r*.55);g.closePath();g.fill();g.fillStyle='#ff4040';g.shadowBlur=7*sc;g.shadowColor='#ff2020';g.beginPath();g.arc(r*.16,-r*.24,Math.max(1.2,r*.09),0,TAU);g.fill();g.restore();
  }
  function drawHealth(g,p,a){
    const w=(a.type==='giant_skeleton'?44:30)*p.scale,h=3.5,ratio=clamp(a.e.hp/Math.max(1,a.e.maxHp),0,1);g.fillStyle='rgba(0,0,0,.7)';g.fillRect(p.x-w/2,p.y-(a.radius*p.scale+13),w,h);g.fillStyle=a.type==='red_skeleton'?'#d6534d':'#80c66f';g.fillRect(p.x-w/2,p.y-(a.radius*p.scale+13),w*ratio,h);
    if(a.type==='red_skeleton'&&a.bloodDrain){for(let i=0;i<a.bloodDrain;i++){g.fillStyle='#b53d3d';g.beginPath();g.arc(p.x-w/2+4+i*6,p.y-(a.radius*p.scale+18),2.2,0,TAU);g.fill();}}
  }
  function drawPlayer(g){
    const p=runtime.player,pt=project(p.x,p.z,0),size=30*pt.scale;g.save();g.globalAlpha=p.flash>0?.55:1;g.fillStyle='rgba(108,180,230,.18)';g.beginPath();g.ellipse(pt.x,pt.y+2,size*.38,size*.16,0,0,TAU);g.fill();
    if(runtime.avatar?.complete&&runtime.avatar.naturalWidth){g.drawImage(runtime.avatar,pt.x-size*.45,pt.y-size*1.08,size*.9,size*1.08);}else{g.fillStyle='#d9b26a';g.beginPath();g.arc(pt.x,pt.y-size*.45,size*.3,0,TAU);g.fill();}
    g.strokeStyle='rgba(143,196,232,.72)';g.lineWidth=1.2;g.beginPath();g.ellipse(pt.x,pt.y+2,p.radius*pt.scale,p.radius*pt.scale*.42,0,0,TAU);g.stroke();g.restore();
  }
  function drawFront(){
    if(!runtime.front)return;const g=runtime.front.g,w=runtime.w,h=runtime.h;g.clearRect(0,0,w,h);
    const entries=[];entries.push({z:runtime.player.z,kind:'player'});for(const a of runtime.actors)if(a.e.alive&&!a.deadPile&&!a.finalDead)entries.push({z:a.z,kind:'actor',a});entries.sort((a,b)=>a.z-b.z);
    for(const item of entries){if(item.kind==='player')drawPlayer(g);else{const a=item.a,p=project(a.x,a.z);g.fillStyle='rgba(0,0,0,.28)';g.beginPath();g.ellipse(p.x,p.y+4,a.radius*p.scale*.8,a.radius*p.scale*.26,0,0,TAU);g.fill();if(a.type==='dark_goblin')drawDarkGoblin(g,p,a);else drawBoneFigure(g,p,a);drawHealth(g,p,a);}}
    for(const d of runtime.decor){const p=project(d.x,d.z),fade=d.persist?1:clamp(1-d.t/d.ttl,0,1);g.save();g.globalAlpha=fade;if(d.kind==='bones'){g.strokeStyle=d.color;g.lineWidth=2*p.scale;for(let i=0;i<5;i++){const ang=i*.9+.2;g.beginPath();g.moveTo(p.x+Math.cos(ang)*4,p.y+Math.sin(ang)*2);g.lineTo(p.x+Math.cos(ang)*11,p.y+Math.sin(ang)*5);g.stroke();}}else{g.fillStyle=d.color;for(let i=0;i<10;i++){const a=i/10*TAU+d.seed,r=4+d.t*19;g.fillRect(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.45,2.2,2.2);}}g.restore();}
    for(const p of runtime.projectiles){const t=clamp(p.t/p.dur,0,1),x=lerp(p.from.x,p.to.x,t),y=lerp(p.from.y,p.to.y,t)-Math.sin(t*Math.PI)*14;g.fillStyle=p.color;g.beginPath();g.arc(x,y,p.size,0,TAU);g.fill();}
    for(const f of runtime.floaters){g.save();g.globalAlpha=clamp(1-f.t/f.ttl,0,1);g.fillStyle=f.color;g.font="700 11px 'Space Mono',monospace";g.textAlign='center';g.fillText(f.text,f.x,f.y-f.t*22);g.restore();}
    // subtle safe-room edge
    g.strokeStyle='rgba(143,196,232,.16)';g.strokeRect(2,2,w-4,h-4);
  }

  function frame(ts){
    if(!isDM()){if(runtime.active)deactivate();return;}
    if(!runtime.active)activate();let dt=runtime.lastTs?(ts-runtime.lastTs)/1000:0;runtime.lastTs=ts;dt=Math.min(.05,Math.max(0,dt));
    if(state.running){updatePlayer(dt);updateActors(dt);updateFx(dt);}drawRoom();drawFront();runtime.raf=requestAnimationFrame(frame);
  }

  function activate(){
    runtime.active=true;runtime.lastTs=0;runtime.spawnClock=0;runtime.spawned.clear();runtime.actors=[];runtime.decor=[];runtime.projectiles=[];runtime.floaters=[];runtime.clearClock=0;runtime.cleared=false;
    runtime.player={id:'player',kind:'player',x:0,z:118,radius:15,mass:1.35,flash:0,stunT:0,slowT:0};
    state.spawnQueue=[];state.spawnTimer=999;state.enemies=[];state.showPlayerHpBar=true;state.playerHpLabel='Player HP';state.livesMax=PLAYER_HP;state.lives=PLAYER_HP;state.__ttdDMNoWipeout=true;
    document.getElementById('gameScreen')?.classList.add('ttd-dark-monastery-v1');const livesLabel=document.querySelector('#gameScreen #livesStat .label');if(livesLabel)livesLabel.textContent='HP';
    if(modeLabel)modeLabel.textContent='Dark Monastery · Lower Cloister';installControls();buildPath(cw,ch);renderHUD();renderBoard();
    const src=window.__TTD_AVATAR_COMPOSITE_URL||window.__TTD_AVATAR_IMAGE_URL||asset('/assets/ui/avatar-test-base.webp');runtime.avatar=new Image();runtime.avatar.src=src;
  }
  function deactivate(){
    runtime.active=false;if(runtime.raf)cancelAnimationFrame(runtime.raf);runtime.raf=0;runtime.lastTs=0;runtime.keys.clear();runtime.joyX=runtime.joyZ=0;removeUi();
  }

  buildPath=function DM_buildPath(w,h){
    if(!isDM())return baseBuildPath(w,h);
    // Native die logic still expects a path-space distance. Keep a hidden logical path off-screen
    // while enemyRenderPos supplies the real free-roam room coordinates.
    pathPts=[{x:-2200,y:-2200},{x:-1200,y:-2200}];segLens=[1000];totalLen=1000;towerPos=pathPts[1];
  };
  enemyRenderPos=function DM_enemyRenderPos(e){if(e?.__ttdDM){const a=runtime.actors.find(x=>x.e===e);if(a)return project(a.x,a.z);}return baseEnemyRenderPos(e);};
  updateSpawns=function DM_updateSpawns(dt){if(isDM())return;return baseUpdateSpawns(dt);};
  endMatch=function DM_endMatch(reason){
    if(isDM()&&reason==='wipeout'&&state.lives>0){toast('Your dice are down, but you are still standing.');return;}
    return baseEndMatch(reason);
  };
  showScreen=function DM_showScreen(name){const r=baseShowScreen(name);if(name!=='game'&&runtime.active)deactivate();return r;};
  startAdventure=function DM_startAdventure(advId,stageIdx,diffKey){
    const r=baseStartAdventure(advId,stageIdx,diffKey);if(advId===DM_ID){const started=performance.now();const bind=()=>{if(state?.adventureStage===DM_STAGE){state.__ttdDarkMonastery=true;activate();if(!runtime.raf)runtime.raf=requestAnimationFrame(frame);return;}if(performance.now()-started<10000)requestAnimationFrame(bind);};requestAnimationFrame(bind);}return r;
  };

  window.addEventListener('keydown',ev=>{if(!isDM())return;runtime.keys.add(String(ev.key||'').toLowerCase());});
  window.addEventListener('keyup',ev=>runtime.keys.delete(String(ev.key||'').toLowerCase()));
  window.addEventListener('resize',()=>{if(isDM()){ensureCanvases();buildPath(cw,ch);}});

  window.__TTD_DARK_MONASTERY_API_V1=Object.freeze({
    version:1,id:DM_ID,get active(){return isDM();},get player(){return runtime.player;},get actors(){return runtime.actors;},
    definitions:TYPES,
  });
})();
