  /* ================= HG-A1 rapid-fire handguns / Bullet Halo ================= */
  const HGA1_KEY = 'hga1';
  const hga1TopAsset = window.__TTD_GAME_ASSETS?.hga1Topdown;
  const hga1SideAsset = window.__TTD_GAME_ASSETS?.hga1Side;
  const hga1TopImage = new Image();
  const hga1SideImage = new Image();
  if (hga1TopAsset?.path) hga1TopImage.src = window.__TTD_ASSET_URL(hga1TopAsset.path);
  if (hga1SideAsset?.path) hga1SideImage.src = window.__TTD_ASSET_URL(hga1SideAsset.path);

  const hga1Style = document.createElement('style');
  hga1Style.id = 'ttdHga1RuntimeStyleV30';
  hga1Style.textContent = `
    .hga1AmmoRail{position:absolute;top:5px;bottom:5px;width:7px;display:flex;flex-direction:column;justify-content:center;gap:1px;z-index:8;pointer-events:none;filter:drop-shadow(0 0 2px rgba(0,0,0,.72));}
    .hga1AmmoRail.left{left:2px}.hga1AmmoRail.right{right:2px}
    .hga1AmmoNotch{position:relative;flex:0 1 7px;min-height:3px;max-height:7px;width:6px;background:#050505;clip-path:polygon(50% 0,82% 17%,82% 78%,66% 100%,34% 100%,18% 78%,18% 17%);}
    .hga1AmmoRound{position:absolute;inset:1px;background:linear-gradient(180deg,#e9c954 0%,#8b721e 70%,#55430f 100%);clip-path:inherit;box-shadow:0 0 4px rgba(255,220,80,.8);filter:drop-shadow(0 0 2px rgba(255,214,62,.75));}
    .hga1AmmoNotch.empty .hga1AmmoRound{display:none}
    .hga1AmmoNotch.akimboFlash .hga1AmmoRound{display:block;background:linear-gradient(180deg,#ff673e 0%,#9b1709 75%,#4b0804 100%);box-shadow:0 0 7px rgba(255,70,35,.98);filter:drop-shadow(0 0 3px rgba(255,60,30,1));}
    .tile.hga1HaloQueued{box-shadow:inset 0 0 0 2px rgba(255,188,45,.8),0 0 14px rgba(255,142,30,.55)}
    .tile.hga1HaloLocked{box-shadow:inset 0 0 0 2px rgba(255,116,34,.76),0 0 12px rgba(255,68,20,.38)}
  `;
  document.head.appendChild(hga1Style);

  function hga1Tier(die) {
    const cls = Math.max(1, Math.min(7, slottedClassOf(HGA1_KEY)));
    const sp = DICE[HGA1_KEY].special;
    return {
      cls,
      maxAmmo: cls >= 7 ? sp.class7Magazine : cls >= 5 ? sp.class5Magazine : cls >= 3 ? sp.class3Magazine : sp.baseMagazine,
      reload: cls >= 6 ? sp.class6Reload : cls >= 2 ? sp.class2Reload : sp.baseReload,
      akimboEvery: cls >= 4 ? sp.class4AkimboEvery : sp.baseAkimboEvery,
      akimboMult: cls >= 5 ? sp.class5AkimboDamageMult : 1,
      stun: cls >= 6 ? sp.class6HaloStun : cls >= 3 ? sp.class3HaloStun : sp.baseHaloStun,
      launch: cls >= sp.launchClass,
      haloCooldown: (cls >= 6 ? sp.class6Reload : cls >= 2 ? sp.class2Reload : sp.baseReload) + sp.postHaloCooldownBonus,
    };
  }

  function ensureHga1State(die) {
    const T = hga1Tier(die);
    let h = die._hga1;
    if (!h) {
      h = die._hga1 = {
        maxAmmo:T.maxAmmo,leftAmmo:T.maxAmmo,rightAmmo:T.maxAmmo,nextGun:0,shotCount:0,
        phase:'normal',phaseT:0,reloadT:0,haloCooldownT:0,haloQueued:false,
        kickLeft:0,kickRight:0,aimLeft:-Math.PI/2,aimRight:-Math.PI/2,
        redLeft:null,redRight:null,cast:null,reloadOpacity:0,
      };
    }
    if (h.maxAmmo !== T.maxAmmo) {
      const dl = Math.max(0, T.maxAmmo - h.maxAmmo);
      h.leftAmmo = Math.min(T.maxAmmo, h.leftAmmo + dl);
      h.rightAmmo = Math.min(T.maxAmmo, h.rightAmmo + dl);
      h.maxAmmo = T.maxAmmo;
    }
    return {h,T};
  }

  function hga1NormalGunOrigin(side, aim, kick) {
    const baseX = side === 0 ? cw * 0.405 : cw * 0.595;
    const baseY = ch * 0.895;
    const recoil = 7 * Math.max(0, Math.min(1, kick / 0.11));
    return {x:baseX - Math.cos(aim) * recoil, y:baseY - Math.sin(aim) * recoil};
  }

  function hga1Spend(h, side, akimboFlash) {
    const ammoKey = side === 0 ? 'leftAmmo' : 'rightAmmo';
    if (h[ammoKey] <= 0) return false;
    const slot = h.maxAmmo - h[ammoKey];
    h[ammoKey] -= 1;
    if (akimboFlash) {
      const flash = {slot,t:0.14};
      if (side === 0) h.redLeft = flash; else h.redRight = flash;
    }
    return true;
  }

  function hga1QueueShot(die, side, target, dmg, akimbo) {
    if (!target?.alive) return;
    const {h} = ensureHga1State(die);
    const tp = enemyRenderPos(target);
    const base = hga1NormalGunOrigin(side, side===0?h.aimLeft:h.aimRight, side===0?h.kickLeft:h.kickRight);
    const angle = Math.atan2(tp.y-base.y,tp.x-base.x);
    if (side===0) { h.aimLeft=angle; h.kickLeft=0.11; }
    else { h.aimRight=angle; h.kickRight=0.11; }
    const muzzle = {x:base.x+Math.cos(angle)*31,y:base.y+Math.sin(angle)*31};
    const dist = Math.hypot(tp.x-muzzle.x,tp.y-muzzle.y);
    state.hga1Shots ||= [];
    state.hga1Shots.push({kind:'normal',x:muzzle.x,y:muzzle.y,px:muzzle.x,py:muzzle.y,target,dmg,akimbo,
      t:0,dur:Math.max(0.055,Math.min(0.22,dist/Math.max(1,DICE.hga1.special.normalBulletSpeed))),done:false});
    fx('muzzle',muzzle);
  }

  function hga1FireNormal(idx, die, d) {
    const {h,T} = ensureHga1State(die);
    const list = aliveEnemies();
    const target = pickTarget(d.target,list);
    if (!target) return;
    h.shotCount += 1;
    const wantsAkimbo = (h.shotCount % T.akimboEvery) === 0;
    const baseDmg = effDmg(die);
    if (wantsAkimbo && h.leftAmmo>0 && h.rightAmmo>0) {
      hga1Spend(h,0,true); hga1Spend(h,1,true);
      hga1QueueShot(die,0,target,baseDmg*T.akimboMult,true);
      hga1QueueShot(die,1,target,baseDmg*T.akimboMult,true);
      return;
    }
    let side = h.nextGun;
    if ((side===0?h.leftAmmo:h.rightAmmo)<=0) side = side===0?1:0;
    if ((side===0?h.leftAmmo:h.rightAmmo)<=0) return;
    hga1Spend(h,side,false);
    hga1QueueShot(die,side,target,baseDmg,false);
    h.nextGun = side===0?1:0;
  }

  function hga1StartReload(h,T,phase='reload') {
    h.phase=phase; h.phaseT=0; h.reloadT=T.reload; h.reloadOpacity=phase==='haloWaitReload'?0.55:0;
  }

  function hga1StartHalo(die) {
    const {h,T}=ensureHga1State(die);
    const total=T.maxAmmo*2;
    h.phase='haloPlacing'; h.phaseT=0; h.haloQueued=true;
    h.cast={id:`hga1-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`,cx:cw*.5,cy:ch*.43,
      ringR:52+(T.maxAmmo-10)*2.6,total,placed:[],placeN:0,gunAL:-Math.PI*.15,gunAR:Math.PI*1.15,
      velL:4.9,velR:-4.9,selfL:0,selfR:0,opacity:1,shockT:0,released:false,stun:T.stun,launch:T.launch};
  }

  function engageHga1(idx,die) {
    if (!die || die.key!==HGA1_KEY) return false;
    const {h,T}=ensureHga1State(die);
    if (h.phase!=='normal' || h.haloCooldownT>0 || h.haloQueued) return false;
    h.haloQueued=true;
    die.sinceLastShot=0;
    if (h.leftAmmo===T.maxAmmo && h.rightAmmo===T.maxAmmo) hga1StartHalo(die);
    else hga1StartReload(h,T,'haloWaitReload');
    triggerTilePulse(idx,'pulse-gold',0.45);
    toast('Bullet Halo armed');
    return true;
  }

  function hga1ReleaseHalo(die,h,T) {
    const c=h.cast; if(!c || c.released) return;
    c.released=true; c.shockT=0.42;
    state.hga1Shots ||= [];
    const dmg=effDmg(die)*DICE.hga1.special.haloDamageMult;
    for (const b of c.placed) {
      const a=b.a;
      state.hga1Shots.push({kind:'halo',x:c.cx+Math.cos(a)*c.ringR,y:c.cy+Math.sin(a)*c.ringR,
        px:c.cx+Math.cos(a)*c.ringR,py:c.cy+Math.sin(a)*c.ringR,vx:Math.cos(a)*DICE.hga1.special.haloBulletSpeed,
        vy:Math.sin(a)*DICE.hga1.special.haloBulletSpeed,life:1.0,dmg,castId:c.id,stun:c.stun,launch:c.launch,done:false});
    }
    h.phase='postHaloReloadIn'; h.phaseT=0; h.reloadOpacity=0;
  }

  function tickHga1Die(idx,die,d,dt,disabled) {
    const {h,T}=ensureHga1State(die);
    if (h.redLeft) { h.redLeft.t-=dt; if(h.redLeft.t<=0)h.redLeft=null; }
    if (h.redRight) { h.redRight.t-=dt; if(h.redRight.t<=0)h.redRight=null; }
    h.kickLeft=Math.max(0,h.kickLeft-dt); h.kickRight=Math.max(0,h.kickRight-dt);
    if (h.cast?.shockT>0) h.cast.shockT=Math.max(0,h.cast.shockT-dt);

    if (h.phase==='normal') {
      if (disabled) return;
      if (h.leftAmmo<=0 && h.rightAmmo<=0) { hga1StartReload(h,T); return; }
      die.sinceLastShot=(die.sinceLastShot||0)+dt;
      const interval=effAtk(die);
      if (die.sinceLastShot>=interval) {
        die.sinceLastShot=0; die.attackCount=(die.attackCount||0)+1;
        hga1FireNormal(idx,die,d);
        if (h.leftAmmo<=0 && h.rightAmmo<=0) hga1StartReload(h,T);
      }
      return;
    }

    if (h.phase==='reload' || h.phase==='haloWaitReload') {
      h.reloadT-=dt; h.phaseT+=dt;
      if (h.phase==='haloWaitReload') h.reloadOpacity=Math.min(1,h.phaseT/.2);
      if (h.reloadT<=0) {
        h.leftAmmo=T.maxAmmo; h.rightAmmo=T.maxAmmo;
        if (h.phase==='haloWaitReload') hga1StartHalo(die); else {h.phase='normal';h.phaseT=0;}
      }
      return;
    }

    const c=h.cast;
    if (h.phase==='haloPlacing' && c) {
      h.phaseT+=dt; c.gunAL+=c.velL*dt; c.gunAR+=c.velR*dt;
      const desired=Math.min(c.total,Math.floor((h.phaseT/1.05)*c.total));
      while(c.placeN<desired){
        const n=c.placeN++; const a=-Math.PI/2+(n/c.total)*Math.PI*2;
        c.placed.push({a});
        hga1Spend(h,n%2,false);
      }
      if(c.placeN>=c.total){h.phase='haloBrake';h.phaseT=0;}
      return;
    }
    if (h.phase==='haloBrake' && c) {
      h.phaseT+=dt; const k=Math.max(0,1-h.phaseT/.32); c.velL=4.9*k; c.velR=-4.9*k;
      c.gunAL+=c.velL*dt; c.gunAR+=c.velR*dt;
      if(h.phaseT>=.32){h.phase='haloReverse';h.phaseT=0;c.velL=0;c.velR=0;}
      return;
    }
    if (h.phase==='haloReverse' && c) {
      h.phaseT+=dt; const p=Math.min(1,h.phaseT/.44); c.velL=-3.8*p; c.velR=3.8*p;
      c.gunAL+=c.velL*dt; c.gunAR+=c.velR*dt;
      if(p>=1){h.phase='haloSelfSpinFade';h.phaseT=0;}
      return;
    }
    if (h.phase==='haloSelfSpinFade' && c) {
      h.phaseT+=dt; c.gunAL+=c.velL*dt; c.gunAR+=c.velR*dt;
      c.selfL+=10.5*dt; c.selfR-=10.5*dt; c.opacity=Math.max(0,1-h.phaseT/.58);
      if(h.phaseT>=.58){c.opacity=0;h.phase='haloPreFire';h.phaseT=0;}
      return;
    }
    if (h.phase==='haloPreFire' && c) {
      h.phaseT+=dt;
      if(h.phaseT>=.11) hga1ReleaseHalo(die,h,T);
      return;
    }
    if (h.phase==='postHaloReloadIn') {
      h.phaseT+=dt; h.reloadOpacity=Math.min(1,h.phaseT/.25);
      if(h.phaseT>=.25){h.phase='postHaloReload';h.phaseT=0;h.reloadT=T.reload;h.reloadOpacity=1;}
      return;
    }
    if (h.phase==='postHaloReload') {
      h.reloadT-=dt; h.reloadOpacity=1;
      if(h.reloadT<=0){h.leftAmmo=T.maxAmmo;h.rightAmmo=T.maxAmmo;h.phase='postHaloReloadOut';h.phaseT=0;}
      return;
    }
    if (h.phase==='postHaloReloadOut') {
      h.phaseT+=dt; h.reloadOpacity=Math.max(0,1-h.phaseT/.25);
      if(h.phaseT>=.25){h.reloadOpacity=0;h.phase='haloCooldown';h.phaseT=0;h.haloCooldownT=T.haloCooldown;}
      return;
    }
    if (h.phase==='haloCooldown') {
      h.haloCooldownT=Math.max(0,h.haloCooldownT-dt);
      if(h.haloCooldownT<=0){h.phase='normal';h.phaseT=0;h.haloQueued=false;h.cast=null;die.sinceLastShot=0;}
    }
  }

  function hga1SegmentDistance(px,py,x1,y1,x2,y2){
    const vx=x2-x1,vy=y2-y1,wx=px-x1,wy=py-y1,den=vx*vx+vy*vy||1;
    const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/den));
    return Math.hypot(px-(x1+vx*t),py-(y1+vy*t));
  }

  function updateHga1Shots(dt) {
    const shots=state.hga1Shots||[];
    for(let i=shots.length-1;i>=0;i--){
      const s=shots[i]; if(s.done){shots.splice(i,1);continue;}
      s.px=s.x;s.py=s.y;
      if(s.kind==='normal'){
        s.t+=dt; const p=Math.min(1,s.t/s.dur);
        if(!s.tx && s.target?.alive){const tp=enemyRenderPos(s.target);s.sx=s.x;s.sy=s.y;s.tx=tp.x;s.ty=tp.y;}
        s.x=(s.sx??s.x)+((s.tx??s.x)-(s.sx??s.x))*p; s.y=(s.sy??s.y)+((s.ty??s.y)-(s.sy??s.y))*p;
        if(p>=1){if(s.target?.alive)damageEnemy(s.target,s.dmg,'physical',{});s.done=true;}
      } else {
        s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
        for(const e of aliveEnemies()){
          const ep=enemyRenderPos(e);
          if(hga1SegmentDistance(ep.x,ep.y,s.px,s.py,s.x,s.y)>12)continue;
          damageEnemy(e,s.dmg,'physical',{});
          if(e._hga1HaloStunCast!==s.castId){e._hga1HaloStunCast=s.castId;e.pausedT=Math.max(e.pausedT||0,s.stun);}
          if(s.launch && !e.isBoss && !e.isTyphoon && e._hga1HaloLaunchCast!==s.castId){
            e._hga1HaloLaunchCast=s.castId; startLift(e,'airborne',{rise:.13,hold:.10,fall:.32,height:24,juggleable:true});
          }
          s.done=true;break;
        }
        if(s.life<=0||s.x<-50||s.x>cw+50||s.y<-50||s.y>ch+50)s.done=true;
      }
      if(s.done)shots.splice(i,1);
    }
  }

  function drawHga1Image(img,x,y,w,h,angle,alpha=1){
    if(!img.complete||!img.naturalWidth)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
  }

  function drawHga1Runtime(){
    const hga1Dice=[];
    state.board.forEach((die,idx)=>{if(die?.key===HGA1_KEY)hga1Dice.push({die,idx,...ensureHga1State(die)});});
    for(const rec of hga1Dice){
      const {h}=rec;
      if(h.phase==='normal' || h.phase==='reload'){
        const list=aliveEnemies();const target=pickTarget(DICE.hga1.target,list);const tp=target?enemyRenderPos(target):{x:cw*.5,y:ch*.3};
        for(const side of [0,1]){
          const aim=Math.atan2(tp.y-ch*.895,tp.x-(side===0?cw*.405:cw*.595));
          if(side===0)h.aimLeft=aim;else h.aimRight=aim;
          const o=hga1NormalGunOrigin(side,aim,side===0?h.kickLeft:h.kickRight);
          drawHga1Image(hga1TopImage,o.x,o.y,74,19,aim,1);
        }
      }
      if(h.phase==='haloWaitReload' || h.phase==='postHaloReloadIn' || h.phase==='postHaloReload' || h.phase==='postHaloReloadOut'){
        const a=-Math.PI/2;
        drawHga1Image(hga1TopImage,cw*.405,ch*.895,74,19,a,h.reloadOpacity);
        drawHga1Image(hga1TopImage,cw*.595,ch*.895,74,19,a,h.reloadOpacity);
      }
      const c=h.cast;
      if(c && ['haloPlacing','haloBrake','haloReverse','haloSelfSpinFade','haloPreFire'].includes(h.phase)){
        for(const b of c.placed){
          const x=c.cx+Math.cos(b.a)*c.ringR,y=c.cy+Math.sin(b.a)*c.ringR;
          ctx.save();ctx.translate(x,y);ctx.rotate(b.a);ctx.fillStyle='rgba(255,158,38,.96)';ctx.shadowColor='rgba(255,70,25,.95)';ctx.shadowBlur=5;ctx.fillRect(-4,-1,8,2);ctx.restore();
        }
        const gxL=c.cx+Math.cos(c.gunAL)*c.ringR,gyL=c.cy+Math.sin(c.gunAL)*c.ringR;
        const gxR=c.cx+Math.cos(c.gunAR)*c.ringR,gyR=c.cy+Math.sin(c.gunAR)*c.ringR;
        const selfPhase=h.phase==='haloSelfSpinFade'?c.selfL:0;
        const selfPhaseR=h.phase==='haloSelfSpinFade'?c.selfR:0;
        drawHga1Image(hga1SideImage,gxL,gyL,46,31,c.gunAL+Math.PI/2+selfPhase,c.opacity);
        drawHga1Image(hga1SideImage,gxR,gyR,46,31,c.gunAR-Math.PI/2+selfPhaseR,c.opacity);
      }
      if(c?.shockT>0){
        const p=1-c.shockT/.42,r=18+p*96;
        ctx.save();ctx.globalAlpha=Math.max(0,1-p);ctx.beginPath();ctx.arc(c.cx,c.cy,r,0,Math.PI*2);ctx.fillStyle='rgba(255,221,70,.18)';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='rgba(255,126,28,.9)';ctx.stroke();ctx.restore();
      }
    }
    for(const s of state.hga1Shots||[]){
      ctx.save();ctx.lineCap='round';ctx.lineWidth=s.kind==='halo'?2.4:2;
      ctx.strokeStyle=s.kind==='halo'||s.akimbo?'rgba(255,82,34,.98)':'rgba(255,222,70,.98)';
      ctx.shadowColor=s.kind==='halo'||s.akimbo?'rgba(255,82,28,.9)':'rgba(255,220,65,.85)';ctx.shadowBlur=5;
      ctx.beginPath();ctx.moveTo(s.px,s.py);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.restore();
    }
  }

  function hga1AmmoRailHtml(h,side){
    const ammo=side===0?h.leftAmmo:h.rightAmmo,flash=side===0?h.redLeft:h.redRight;
    const spent=h.maxAmmo-ammo;let out=`<div class="hga1AmmoRail ${side===0?'left':'right'}">`;
    for(let i=0;i<h.maxAmmo;i++){
      const filled=i>=spent;const red=flash&&flash.slot===i;
      out+=`<div class="hga1AmmoNotch ${filled?'':'empty'} ${red?'akimboFlash':''}"><span class="hga1AmmoRound"></span></div>`;
    }
    return out+'</div>';
  }

  function syncHga1Hud(){
    for(let i=0;i<15;i++){
      const die=state.board[i],tile=tileEls[i];if(!tile)continue;
      tile.querySelectorAll('.hga1AmmoRail').forEach(el=>el.remove());
      tile.classList.remove('hga1HaloQueued','hga1HaloLocked');
      if(!die||die.key!==HGA1_KEY)continue;
      const {h}=ensureHga1State(die);
      tile.insertAdjacentHTML('beforeend',hga1AmmoRailHtml(h,0)+hga1AmmoRailHtml(h,1));
      if(h.haloQueued)tile.classList.add('hga1HaloQueued');
      if(h.phase!=='normal')tile.classList.add('hga1HaloLocked');
    }
  }

  const originalTickTileHga1 = tickTile;
  tickTile = function ttdHga1TickTile(idx,dt){
    const die=state.board[idx];
    if(!die||die.key!==HGA1_KEY)return originalTickTileHga1(idx,dt);
    if(die.buffs)die.buffs=die.buffs.filter(b=>{b.t-=dt;return b.t>0;});
    let disabled=false;if(die.disabledT>0){die.disabledT=Math.max(0,die.disabledT-dt);disabled=true;}
    tickHga1Die(idx,die,DICE.hga1,dt,disabled);
  };

  const originalUpdatePlayerShotsHga1 = updatePlayerShots;
  updatePlayerShots = function ttdHga1UpdateShots(dt){originalUpdatePlayerShotsHga1(dt);updateHga1Shots(dt);};
  const originalDrawLaneHga1 = drawLane;
  drawLane = function ttdHga1DrawLane(dt){originalDrawLaneHga1(dt);drawHga1Runtime();};
  const originalRenderBoardHga1 = renderBoard;
  renderBoard = function ttdHga1RenderBoard(){originalRenderBoardHga1();syncHga1Hud();};

  const originalIsAsclepiusReadyHga1 = isAsclepiusReady;
  isAsclepiusReady = function ttdHga1SkillReady(die){
    if(die?.key===HGA1_KEY){const {h}=ensureHga1State(die);return h.phase==='normal'&&!h.haloQueued&&h.haloCooldownT<=0;}
    return originalIsAsclepiusReadyHga1(die);
  };
  const originalTriggerAsclepiusHealHga1 = triggerAsclepiusHeal;
  triggerAsclepiusHeal = function ttdHga1HoldDispatch(sourceIdx,anchorEl){
    const die=state.board[sourceIdx];
    if(die?.key===HGA1_KEY){engageHga1(sourceIdx,die);return;}
    return originalTriggerAsclepiusHealHga1(sourceIdx,anchorEl);
  };
