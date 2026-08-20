  /* ================= DICE CATALOG EXTENSIONS V8 =================
     Loaded inside the v33 game IIFE by online/game-loader.js.
     dicefile.json owns data; this bridge owns behavior/visuals that cannot live in JSON.
  */
  if(typeof __TTD_DICEFILE !== 'undefined' && __TTD_DICEFILE.lore){
    Object.assign(DICE_LORE, __TTD_DICEFILE.lore);
  }

  GLYPHS.scimitar = GLYPHS.scimitar || {
    fill:false,
    d:'M3 7c6 1 11 0 17-4-1 6-5 11-11 14l-3 4-2-2 3-4C10 12 7 10 3 7z',
    lines:[[8,16,4,20],[6,18,10,22],[9,15,12,18]]
  };

  (function installSoulScimitarStyle(){
    if(document.getElementById('ttdSoulScimitarStyle')) return;
    const style = document.createElement('style');
    style.id = 'ttdSoulScimitarStyle';
    style.textContent = `
      .tile.pulse-soul-heal{
        box-shadow:
          inset 0 0 0 2px rgba(255,225,225,.95),
          inset 0 0 16px rgba(180,12,36,.85),
          0 0 16px rgba(255,30,56,.95),
          0 0 30px rgba(150,0,28,.55) !important;
        filter:brightness(1.16) saturate(1.25);
      }
    `;
    document.head.appendChild(style);
  })();

  function soulScimitarTierStats(cls, sp){
    return {
      bladeCount: (sp.baseBladeCount||2) + (cls>=3?(sp.class3ExtraBlades||2):0) + (cls>=7?(sp.class7ExtraBlades||2):0),
      healFraction: cls >= (sp.healClass||4) ? (sp.healFraction||0.25) : 0,
      targetSlowChance: cls >= (sp.targetSlowClass||5) ? (sp.targetSlowChance||0.15) : 0,
      pierce: cls >= (sp.pierceClass||6),
      pierceDamageMult: sp.pierceDamageMult||0.30,
      pierceSlowChance: cls >= (sp.pierceSlowClass||7) ? (sp.pierceSlowChance||0.07) : 0,
      slowAmount: sp.slowAmount||0.35,
      slowDuration: sp.slowDuration||2.0
    };
  }

  function soulScimitarState(){
    if(!state.soulScimitars) state.soulScimitars = [];
    if(!state.soulScimitarAsh) state.soulScimitarAsh = [];
    return state.soulScimitars;
  }

  function fireSoulScimitar(idx, die, d, dmg, dieAff, potencyBonus, isCrit){
    const enemies = aliveEnemies();
    if(!enemies.length) return;
    const sp = d.special || {};
    const cls = slottedClassOf(die.key);
    const tier = soulScimitarTierStats(cls, sp);
    const list = soulScimitarState();
    const pairCount = Math.ceil(tier.bladeCount/2);
    const summonDur = sp.summonDuration || 0.92;
    const travelMin = sp.travelMin || 0.48;
    const travelMax = sp.travelMax || 0.78;

    for(let i=0;i<tier.bladeCount;i++){
      const side = (i%2===0) ? 'left' : 'right';
      const pair = Math.floor(i/2);
      const yNorm = pairCount===1 ? 0.50 : (0.28 + (0.44*pair/Math.max(1,pairCount-1)));
      const target = enemies[Math.floor(Math.random()*enemies.length)];
      list.push({
        kind:'soulScimitar', sourceIndex:idx, sourceDie:die, dieKey:die.key, cls, tier, side, pair, yNorm, target,
        t:0, summonDur, travelDur:travelMin + Math.random()*Math.max(0,travelMax-travelMin), launchAt:summonDur*0.61,
        damage:dmg, affinities:dieAff, potencyBonus:potencyBonus||0, isCrit:!!isCrit,
        prevX:null, prevY:null, x:null, y:null, trail:[], pierced:new Set()
      });
    }
  }

  function soulRetarget(blade){
    if(blade.target && blade.target.alive) return blade.target;
    const enemies = aliveEnemies();
    blade.target = enemies.length ? enemies[Math.floor(Math.random()*enemies.length)] : null;
    return blade.target;
  }

  function soulSegmentDistanceSq(px,py,x1,y1,x2,y2){
    const vx=x2-x1, vy=y2-y1, wx=px-x1, wy=py-y1;
    const len2=vx*vx+vy*vy;
    if(len2<=0.0001) return (px-x1)*(px-x1)+(py-y1)*(py-y1);
    const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/len2));
    const dx=px-(x1+vx*t), dy=py-(y1+vy*t);
    return dx*dx+dy*dy;
  }

  function soulDoDamage(blade, enemy, amount, isTrueTarget){
    if(!enemy || !enemy.alive) return 0;
    const before = Math.max(0, enemy.hp);
    const previousAttacker = currentAttackerDieKey;
    currentAttackerDieKey = blade.dieKey;
    damageEnemy(enemy, amount, 'special', blade.affinities);
    currentAttackerDieKey = previousAttacker;
    const dealt = Math.max(0, Math.min(before, before - enemy.hp));

    if(isTrueTarget){
      if(blade.tier.targetSlowChance>0 && enemy.alive && statusRoll(enemy, blade.tier.targetSlowChance)){
        applySlow(enemy, blade.tier.slowAmount, blade.tier.slowDuration*(1+blade.potencyBonus));
      }
      if(blade.tier.healFraction>0 && dealt>0 && state.board[blade.sourceIndex]===blade.sourceDie){
        healDie(blade.sourceIndex, dealt*blade.tier.healFraction);
        triggerTilePulse(blade.sourceIndex, 'pulse-soul-heal', 0.58);
      }
    }else if(blade.tier.pierceSlowChance>0 && enemy.alive && statusRoll(enemy, blade.tier.pierceSlowChance)){
      applySlow(enemy, blade.tier.slowAmount, blade.tier.slowDuration*(1+blade.potencyBonus));
    }
    return dealt;
  }

  function soulSpawnAsh(x,y,count=16){
    soulScimitarState();
    const ash = state.soulScimitarAsh;
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2;
      const speed=7+Math.random()*26;
      ash.push({x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*8,vx:Math.cos(a)*speed*0.45,vy:-10-Math.random()*30+Math.sin(a)*speed*0.2,t:0,life:0.45+Math.random()*0.55,r:1.0+Math.random()*2.4});
    }
    if(ash.length>160) ash.splice(0,ash.length-160);
  }

  function updateSoulScimitars(dt){
    if(!state) return;
    const list = soulScimitarState();
    const sp = DICE.soulscimitar && DICE.soulscimitar.special || {};
    const collisionRadius = sp.collisionRadius || 14;

    for(let i=list.length-1;i>=0;i--){
      const b=list[i]; b.t += dt;
      if(b.t < b.launchAt) continue;
      const target = soulRetarget(b);
      if(!target){ if(b.t > b.summonDur+0.35) list.splice(i,1); continue; }

      const tp = enemyRenderPos(target);
      const r = Math.max(22,Math.min(48,Math.min(cw,ch)*0.085));
      const x0 = b.side==='left' ? r*0.78 : cw-r*0.78;
      const y0 = ch*b.yNorm;
      const travelP = Math.max(0,Math.min(1,(b.t-b.launchAt)/b.travelDur));
      const eased = 1-Math.pow(1-travelP,2.2);
      const bow = Math.sin(travelP*Math.PI) * (b.side==='left'?1:-1) * Math.min(22,ch*0.045);
      b.x = x0 + (tp.x-x0)*eased;
      b.y = y0 + (tp.y-y0)*eased + bow;

      if(b.prevX!=null){
        b.trail.push({x:b.prevX,y:b.prevY,t:0});
        if(b.trail.length>9) b.trail.shift();
        if(b.tier.pierce && travelP>0.08 && travelP<0.98){
          const hitR2 = collisionRadius*collisionRadius;
          aliveEnemies().forEach(enemy=>{
            if(enemy===target || b.pierced.has(enemy)) return;
            const ep=enemyRenderPos(enemy);
            if(soulSegmentDistanceSq(ep.x,ep.y,b.prevX,b.prevY,b.x,b.y)<=hitR2){
              b.pierced.add(enemy);
              soulDoDamage(b,enemy,b.damage*b.tier.pierceDamageMult,false);
              soulSpawnAsh(ep.x,ep.y,7);
            }
          });
        }
      }
      b.prevX=b.x; b.prevY=b.y;
      for(const tr of b.trail) tr.t += dt;
      if(travelP>=1){
        const impactPos=enemyRenderPos(target);
        soulDoDamage(b,target,b.damage,true);
        soulSpawnAsh(impactPos.x,impactPos.y,b.isCrit?24:18);
        if(b.isCrit) fx('critFlash',impactPos);
        list.splice(i,1);
      }
    }

    const ash=state.soulScimitarAsh||[];
    for(let i=ash.length-1;i>=0;i--){
      const p=ash[i]; p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vx*=Math.pow(0.96,dt*60);
      if(p.t>=p.life) ash.splice(i,1);
    }
  }

  function soulSigilStrokeColor(phase, radial){
    if(phase<0.43) return 'rgba(242,246,255,.92)';
    if(phase<0.64){ const wave=(phase-0.43)/0.21; return radial<=wave ? 'rgba(255,26,52,.98)' : 'rgba(242,246,255,.92)'; }
    if(phase<0.84){ const wave=(phase-0.64)/0.20; return radial<=wave ? 'rgba(247,249,255,.96)' : 'rgba(255,26,52,.98)'; }
    return 'rgba(247,249,255,.9)';
  }

  function drawSoulSigil(blade){
    if(blade.t>blade.summonDur) return;
    const p=Math.max(0,Math.min(1,blade.t/blade.summonDur));
    const grow=Math.min(1,p/0.34);
    const fade=p>0.80 ? Math.max(0,1-(p-0.80)/0.20) : 1;
    const maxR=Math.max(22,Math.min(48,Math.min(cw,ch)*0.085));
    const r=maxR*(0.12+0.88*(1-Math.pow(1-grow,2.4)));
    const x=blade.side==='left' ? r*0.78 : cw-r*0.78;
    const y=ch*blade.yNorm;
    const rot=(blade.side==='left'?1:-1)*blade.t*2.25;

    ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.globalAlpha*=fade; ctx.lineCap='round';
    ctx.shadowBlur=7; ctx.shadowColor=p>=0.43&&p<0.84?'rgba(255,20,46,.75)':'rgba(245,248,255,.55)';
    [0.35,0.58,0.82,1].forEach((rr,idx)=>{
      ctx.strokeStyle=soulSigilStrokeColor(p,rr); ctx.lineWidth=idx===3?1.7:1.1;
      ctx.beginPath(); ctx.arc(0,0,r*rr,0,Math.PI*2); ctx.stroke();
    });
    ctx.strokeStyle=soulSigilStrokeColor(p,0.70); ctx.lineWidth=1.15;
    for(let pass=0;pass<2;pass++){
      ctx.beginPath();
      for(let k=0;k<3;k++){
        const a=(pass?Math.PI:0)+k*Math.PI*2/3-Math.PI/2;
        const xx=Math.cos(a)*r*0.70, yy=Math.sin(a)*r*0.70;
        if(k===0)ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
      }
      ctx.closePath(); ctx.stroke();
    }
    for(let k=0;k<12;k++){
      const a=k*Math.PI/6, inner=r*0.87, outer=r*(k%3===0?0.98:0.94);
      ctx.strokeStyle=soulSigilStrokeColor(p,0.92); ctx.lineWidth=k%3===0?1.6:1.0;
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner); ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer); ctx.stroke();
    }
    ctx.restore();
  }

  function drawGhostScimitar(x,y,angle,scale=1,alpha=1){
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.scale(scale,scale); ctx.globalAlpha*=alpha;
    const wake=ctx.createLinearGradient(-38,0,6,0);
    wake.addColorStop(0,'rgba(160,0,26,0)'); wake.addColorStop(1,'rgba(255,26,52,.55)');
    ctx.fillStyle=wake; ctx.beginPath(); ctx.moveTo(-42,-5); ctx.lineTo(3,-8); ctx.lineTo(8,8); ctx.lineTo(-42,5); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=9; ctx.shadowColor='rgba(250,250,255,.65)'; ctx.fillStyle='rgba(239,242,248,.58)'; ctx.strokeStyle='rgba(255,255,255,.92)'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(35,-3); ctx.quadraticCurveTo(13,-19,-24,-15); ctx.quadraticCurveTo(-8,-9,7,-2); ctx.quadraticCurveTo(18,3,30,7); ctx.quadraticCurveTo(34,4,35,-3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=4; ctx.shadowColor='rgba(50,42,58,.45)'; ctx.fillStyle='rgba(39,42,50,.46)';
    ctx.beginPath(); ctx.moveTo(-20,-9); ctx.quadraticCurveTo(-5,-14,8,-8); ctx.lineTo(3,2); ctx.quadraticCurveTo(-8,-3,-20,-5); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(45,45,52,.62)'; ctx.fillRect(-31,-4,18,8); ctx.fillStyle='rgba(180,18,38,.66)'; ctx.fillRect(-36,-3,10,6);
    ctx.shadowBlur=10; ctx.shadowColor='rgba(255,20,42,.95)'; ctx.fillStyle='rgba(255,50,62,.95)'; ctx.beginPath(); ctx.ellipse(-14,0,5.8,3.4,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,226,184,.95)'; ctx.beginPath(); ctx.ellipse(-14,0,2.6,2.0,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(25,4,8,.95)'; ctx.beginPath(); ctx.ellipse(-14,0,0.85,1.8,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawSoulScimitars(){
    if(!state) return;
    const list=state.soulScimitars||[];
    ctx.save();
    for(const b of list){
      drawSoulSigil(b);
      if(b.t<b.launchAt || b.x==null) continue;
      for(let i=0;i<b.trail.length;i++){
        const tr=b.trail[i], a=(i+1)/Math.max(1,b.trail.length);
        ctx.globalAlpha=0.12+0.34*a; ctx.fillStyle='rgba(220,8,38,.9)'; ctx.beginPath(); ctx.arc(tr.x,tr.y,1.4+2.2*a,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
      const target=soulRetarget(b);
      let ang=b.side==='left'?0:Math.PI;
      if(target){ const tp=enemyRenderPos(target); ang=Math.atan2(tp.y-b.y,tp.x-b.x); }
      const emergeP=Math.max(0,Math.min(1,(b.t-b.launchAt)/(b.summonDur*0.22)));
      drawGhostScimitar(b.x,b.y,ang,0.58+0.42*emergeP,0.72+0.22*emergeP);
    }
    for(const p of (state.soulScimitarAsh||[])){
      const lifeP=Math.max(0,1-p.t/p.life);
      ctx.globalAlpha=lifeP*0.82; ctx.fillStyle='rgba(204,20,43,.95)'; ctx.shadowBlur=5; ctx.shadowColor='rgba(255,30,52,.7)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r*(0.55+0.45*lifeP),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= MAGMA FORCE =================
     Random ground emplacement projectile. The base game calls these hooks through the catalog
     dispatcher so the v33 monolith stays stable while this die keeps its bespoke battlefield
     geometry, staged warning, pulse statuses, launch, and debris rendering here. */
  function magmaForceTierStats(cls, sp){
    let radius=sp.baseExplosionRadius||34;
    if(cls>=3) radius*=sp.class3RadiusMult||1.10;
    if(cls>=6) radius*=sp.class6RadiusMult||1.10;
    let explosionMult=1;
    if(cls>=4) explosionMult*=sp.class4ExplosionMult||1.10;
    if(cls>=7) explosionMult*=sp.class7ExplosionMult||1.08;
    return {
      count: cls>=4 ? (sp.class4BoulderCount||5) : (sp.baseBoulderCount||4),
      radius,
      explosionMult,
      pulseDps: cls>=7 ? (sp.pulseDpsC7||3.5) : cls>=2 ? (sp.pulseDpsC2||3.2) : 0,
      slowChance: cls>=5 ? (sp.slowChance||0.20) : 0,
      launch: cls>=6,
      animMult: cls>=7 ? (sp.class7AnimationMult||0.97) : 1,
    };
  }

  function magmaForceState(){
    if(!state.magmaBoulders) state.magmaBoulders=[];
    return state.magmaBoulders;
  }

  function magmaPointSegmentDistance(px,py,ax,ay,bx,by){
    const vx=bx-ax, vy=by-ay, wx=px-ax, wy=py-ay;
    const len2=vx*vx+vy*vy;
    if(len2<=0.0001) return Math.hypot(px-ax,py-ay);
    const t=Math.max(0,Math.min(1,(wx*vx+wy*vy)/len2));
    return Math.hypot(px-(ax+vx*t),py-(ay+vy*t));
  }

  function magmaDistanceToMarchPath(x,y){
    let best=Infinity;
    for(let i=1;i<pathPts.length;i++){
      const a=pathPts[i-1], b=pathPts[i];
      best=Math.min(best,magmaPointSegmentDistance(x,y,a.x,a.y,b.x,b.y));
    }
    return best;
  }

  function magmaHorizontalBands(){
    const ys=[];
    for(let i=1;i<pathPts.length;i++){
      const a=pathPts[i-1], b=pathPts[i];
      if(Math.abs(b.x-a.x) >= Math.abs(b.y-a.y)*2){
        const y=(a.y+b.y)*0.5;
        if(!ys.some(v=>Math.abs(v-y)<2)) ys.push(y);
      }
    }
    ys.sort((a,b)=>a-b);
    const bands=[];
    for(let i=1;i<ys.length;i++) bands.push({lo:ys[i-1],hi:ys[i]});
    return bands;
  }

  function magmaCandidatePoints(count, sp, tier){
    const avgLen=sp.averageEnemyLength||15;
    const boulderR=avgLen*(sp.boulderScale||1.25)*0.5;
    // Four full average-enemy lengths must remain EMPTY between boulder edges.
    const minSep=avgLen*4 + boulderR*2;
    const anchors=magmaForceState().filter(b=>!b.exploded).map(b=>({x:b.x,y:b.y}));
    const noMarchPath=!!(state.zombieMode||state.typhoonPhase||pathPts.length<2);
    const bands=noMarchPath?[]:magmaHorizontalBands();
    const edge=Math.max(tier.radius+4,boulderR+8);
    const candidates=[];
    const pushCandidate=(x,y)=>{
      if(x<edge||x>cw-edge||y<Math.max(8,boulderR+3)||y>ch-Math.max(8,boulderR+3)) return;
      if(!noMarchPath && magmaDistanceToMarchPath(x,y)<boulderR+4) return;
      if(anchors.some(a=>Math.hypot(x-a.x,y-a.y)<minSep)) return;
      candidates.push({x,y});
    };

    if(noMarchPath || !bands.length){
      for(let i=0;i<900;i++) pushCandidate(edge+Math.random()*Math.max(1,cw-edge*2), edge*0.55+Math.random()*Math.max(1,ch-edge*1.1));
      const step=Math.max(12,avgLen*0.75);
      for(let y=Math.max(boulderR+5,edge*0.55);y<=ch-Math.max(boulderR+5,edge*0.55);y+=step){
        for(let x=edge;x<=cw-edge;x+=step) pushCandidate(x,y);
      }
    }else{
      for(let i=0;i<1100;i++){
        const band=bands[Math.floor(Math.random()*bands.length)];
        const pad=boulderR+5;
        const lo=band.lo+pad, hi=band.hi-pad;
        if(hi<=lo) continue;
        pushCandidate(edge+Math.random()*Math.max(1,cw-edge*2),lo+Math.random()*(hi-lo));
      }
      const stepX=Math.max(12,avgLen*0.72), stepY=Math.max(8,avgLen*0.55);
      for(const band of bands){
        const pad=boulderR+5, lo=band.lo+pad, hi=band.hi-pad;
        for(let y=lo;y<=hi;y+=stepY){
          for(let x=edge;x<=cw-edge;x+=stepX) pushCandidate(x,y);
        }
      }
    }

    if(candidates.length<count) return [];
    let best=[];
    // Repeated farthest-point sampling gives random casts while aggressively preserving the
    // unusually large hard spacing requirement on phone-sized battlefields.
    const trials=Math.min(90,candidates.length);
    for(let trial=0;trial<trials;trial++){
      const chosen=[];
      let first=candidates[Math.floor(Math.random()*candidates.length)];
      chosen.push(first);
      while(chosen.length<count){
        let bestPt=null, bestDist=-1;
        const sampleCount=Math.min(260,candidates.length);
        for(let s=0;s<sampleCount;s++){
          const p=candidates[Math.floor(Math.random()*candidates.length)];
          let d=Infinity;
          for(const q of chosen) d=Math.min(d,Math.hypot(p.x-q.x,p.y-q.y));
          for(const q of anchors) d=Math.min(d,Math.hypot(p.x-q.x,p.y-q.y));
          if(d>=minSep && d>bestDist){bestDist=d;bestPt=p;}
        }
        if(!bestPt) break;
        chosen.push(bestPt);
      }
      if(chosen.length>best.length) best=chosen;
      if(best.length===count) break;
    }
    return best.length===count?best:[];
  }

  function magmaSeedVisuals(boulder){
    const n=10;
    boulder.rockShape=[];
    for(let i=0;i<n;i++) boulder.rockShape.push(0.82+Math.random()*0.28);
    boulder.hotSpots=[];
    const br=boulder.boulderR;
    for(let i=0;i<7;i++){
      const a=Math.random()*Math.PI*2, rr=Math.sqrt(Math.random())*br*0.67;
      boulder.hotSpots.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr*0.68-1,r:1.1+Math.random()*1.7,yellow:Math.random()<0.34});
    }
  }

  function fireMagmaForce(idx, die, d, dmg, dieAff, potencyBonus, isCrit){
    const sp=d.special||{};
    const cls=slottedClassOf(die.key);
    const tier=magmaForceTierStats(cls,sp);
    const points=magmaCandidatePoints(tier.count,sp,tier);
    if(points.length!==tier.count) return false; // preserve count + spacing; retry soon instead of cheating either rule

    const avgLen=sp.averageEnemyLength||15;
    const boulderR=avgLen*(sp.boulderScale||1.25)*0.5;
    const anim=tier.animMult;
    const riseDur=(sp.riseDuration||0.22)*anim;
    const heatDur=(sp.heatDuration||1.85)*anim;
    const magmaDur=(sp.magmaDuration||1.0)*anim;
    const flareDur=(sp.flareDuration||0.30)*anim;
    const pulseStart=riseDur+heatDur;
    const explodeAt=pulseStart+magmaDur+flareDur;
    const sourceDie=die;
    const insightBonus=dieJewelBonus(die,'insight');

    for(const p of points){
      const b={
        x:p.x,y:p.y,sourceIndex:idx,sourceDie,dieKey:die.key,cls,tier,sp,
        t:0,riseDur,heatDur,magmaDur,flareDur,pulseStart,explodeAt,
        boulderR,radius:tier.radius,damage:dmg,affinities:Object.assign({},dieAff),
        potencyBonus:potencyBonus||0,insightBonus,isCrit:!!isCrit,
        slowChecked:new Set(),dotTick:new Map(),exploded:false,explosionT:0,particles:[]
      };
      magmaSeedVisuals(b);
      magmaForceState().push(b);
    }
    triggerTilePulse(idx,'pulse-explosion',0.45);
    return true;
  }

  function magmaElementFactor(enemy, affinities){
    const base={earth:0.5,fire:0.5};
    let factor=0.5*enemyElementalMult(enemy,'earth') + 0.5*enemyElementalMult(enemy,'fire');
    for(const [el,pct] of Object.entries(affinities||{})){
      const bonus=Math.max(0,pct-(base[el]||0));
      if(bonus>0) factor += bonus*enemyElementalMult(enemy,el);
    }
    return factor;
  }

  function magmaDamageEnemy(b,enemy,amount){
    if(!enemy||!enemy.alive||amount<=0) return;
    const prev=currentAttackerDieKey;
    currentAttackerDieKey=b.dieKey;
    damageEnemy(enemy,amount*magmaElementFactor(enemy,b.affinities),'physical');
    currentAttackerDieKey=prev;
  }

  function magmaSpawnExplosionParticles(b){
    const total=32;
    for(let i=0;i<total;i++){
      const roll=Math.random();
      const kind=roll<0.42?'rock':roll<0.78?'magma':'fire';
      const a=Math.random()*Math.PI*2;
      const speed=20+Math.random()*72;
      b.particles.push({
        kind,x:b.x+(Math.random()-.5)*b.boulderR,y:b.y-b.boulderR*0.55,
        vx:Math.cos(a)*speed,vy:-28-Math.random()*72+Math.sin(a)*speed*0.28,
        g:105+Math.random()*45,r:kind==='rock'?1.4+Math.random()*2.7:kind==='magma'?1.5+Math.random()*2.8:2+Math.random()*4,
        t:0,life:0.48+Math.random()*0.52,landed:false,groundY:b.y+(Math.random()-.5)*5
      });
    }
  }

  function magmaResolveExplosion(b){
    if(b.exploded) return;
    b.exploded=true; b.explosionT=0;
    const blastDamage=b.damage*b.tier.explosionMult;
    const launchR=b.radius*(b.sp.launchRadiusMult||0.48);
    const victims=aliveEnemies().slice();
    for(const enemy of victims){
      const p=enemyRenderPos(enemy);
      const dist=Math.hypot(p.x-b.x,p.y-b.y);
      if(dist>b.radius) continue;
      magmaDamageEnemy(b,enemy,blastDamage);
      if(b.tier.launch && enemy.alive && !enemy.isBoss && !enemy.isTyphoon && dist<=launchR){
        startLift(enemy,'airborne',{rise:0.28,hold:0.30,fall:0.40,height:20,juggleable:true,
          onLand:(e)=>{e.pausedT=Math.max(e.pausedT||0,0.22);}});
      }
    }
    magmaSpawnExplosionParticles(b);
  }

  function updateMagmaForce(dt){
    if(!state) return;
    const list=magmaForceState();
    for(let i=list.length-1;i>=0;i--){
      const b=list[i];
      if(!b.exploded){
        b.t+=dt;
        if(b.t>=b.pulseStart){
          for(const enemy of aliveEnemies()){
            const p=enemyRenderPos(enemy);
            if(Math.hypot(p.x-b.x,p.y-b.y)>b.radius) continue;
            if(b.tier.slowChance>0 && !b.slowChecked.has(enemy)){
              b.slowChecked.add(enemy);
              if(statusRoll(enemy,Math.min(1,b.tier.slowChance+b.insightBonus))){
                applySlow(enemy,b.sp.slowAmount||0.30,(b.sp.slowDuration||1.8)*(1+b.potencyBonus));
              }
            }
            if(b.tier.pulseDps>0){
              const next=(b.dotTick.get(enemy)||0)+dt;
              const interval=b.sp.pulseTickInterval||0.25;
              if(next>=interval){
                const ticks=Math.floor(next/interval);
                const scaledDps=b.damage*(b.tier.pulseDps/Math.max(1,DICE.magmaforce.dmg));
                magmaDamageEnemy(b,enemy,scaledDps*interval*ticks);
                b.dotTick.set(enemy,next-interval*ticks);
              }else b.dotTick.set(enemy,next);
            }
          }
        }
        if(b.t>=b.explodeAt) magmaResolveExplosion(b);
      }else{
        b.explosionT+=dt;
        for(const p of b.particles){
          p.t+=dt;
          if(!p.landed){
            p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=p.g*dt;
            if(p.y>=p.groundY && p.vy>0){p.y=p.groundY;p.vy=0;p.vx*=0.18;p.landed=true;}
          }else p.x+=p.vx*dt;
        }
        b.particles=b.particles.filter(p=>p.t<p.life);
        if(b.explosionT>Math.max(b.sp.explosionLife||0.82,1.0) && b.particles.length===0) list.splice(i,1);
      }
    }
  }

  function magmaMixRgb(a,b,t){
    const aa=a.match(/\w\w/g).map(v=>parseInt(v,16)), bb=b.match(/\w\w/g).map(v=>parseInt(v,16));
    const c=aa.map((v,i)=>Math.round(v+(bb[i]-v)*Math.max(0,Math.min(1,t))));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  function drawMagmaRock(b,color,alpha=1){
    const riseP=Math.max(0,Math.min(1,b.t/Math.max(0.001,b.riseDur)));
    const br=b.boulderR;
    ctx.save(); ctx.translate(b.x,b.y); ctx.scale(1,0.18+0.82*(1-Math.pow(1-riseP,2.3))); ctx.globalAlpha*=alpha;
    ctx.translate(0,-br*0.72);
    ctx.fillStyle=color; ctx.strokeStyle='rgba(20,10,7,.78)'; ctx.lineWidth=1.3;
    ctx.beginPath();
    for(let i=0;i<b.rockShape.length;i++){
      const a=-Math.PI/2 + i*Math.PI*2/b.rockShape.length;
      const rr=br*b.rockShape[i];
      const x=Math.cos(a)*rr, y=Math.sin(a)*rr*0.82;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();

    const hotP=Math.max(0,Math.min(1,(b.t-b.riseDur)/(Math.max(0.001,b.heatDur)*0.78)));
    if(hotP>0){
      for(const spot of b.hotSpots){
        ctx.globalAlpha=alpha*hotP*(spot.yellow?0.9:0.78);
        ctx.fillStyle=spot.yellow?'#ffc34a':'#d74325';
        ctx.shadowBlur=spot.yellow?5:3; ctx.shadowColor=ctx.fillStyle;
        ctx.beginPath(); ctx.ellipse(spot.x,spot.y,spot.r,spot.r*0.55,spot.x*0.05,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0;
    }
    ctx.restore();
  }

  function drawMagmaForceGround(){
    if(!state||!state.magmaBoulders) return;
    ctx.save();
    for(const b of state.magmaBoulders){
      if(b.exploded) continue;
      if(b.t>=b.pulseStart){
        const pulsePhase=(state.time*2.4 + b.x*0.007)%1;
        ctx.globalAlpha=1;
        ctx.fillStyle='rgba(95,10,10,0.055)'; ctx.beginPath(); ctx.arc(b.x,b.y,b.radius,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(125,18,20,0.78)'; ctx.lineWidth=1.3; ctx.beginPath(); ctx.arc(b.x,b.y,b.radius,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha=0.62*(1-pulsePhase);
        ctx.strokeStyle='#7e1717'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.arc(b.x,b.y,b.radius*(0.72+0.28*pulsePhase),0,Math.PI*2); ctx.stroke();
      }

      let color='#513520';
      const heatStart=b.riseDur, blackAt=b.pulseStart;
      if(b.t>heatStart && b.t<blackAt) color=magmaMixRgb('513520','161211',(b.t-heatStart)/Math.max(0.001,b.heatDur));
      else if(b.t>=blackAt && b.t<blackAt+b.magmaDur) color=magmaMixRgb('161211','6e2018',(b.t-blackAt)/Math.max(0.001,b.magmaDur));
      else if(b.t>=blackAt+b.magmaDur) color=magmaMixRgb('6e2018','df4327',(b.t-blackAt-b.magmaDur)/Math.max(0.001,b.flareDur));
      drawMagmaRock(b,color,1);

      const magmaP=Math.max(0,Math.min(1,(b.t-b.pulseStart)/Math.max(0.001,b.magmaDur)));
      if(magmaP>0){
        const br=b.boulderR;
        ctx.save(); ctx.globalAlpha=0.35+0.55*magmaP; ctx.strokeStyle='#ff6a2a'; ctx.lineWidth=1.6; ctx.lineCap='round';
        ctx.shadowBlur=5;ctx.shadowColor='#ff5a22';ctx.beginPath();ctx.moveTo(b.x+br*0.18,b.y-br*1.15);ctx.quadraticCurveTo(b.x+br*0.34,b.y-br*0.72,b.x+br*0.22,b.y-1);ctx.stroke();ctx.restore();
        for(let k=0;k<4;k++){
          const phase=(state.time*0.55+k*0.23+b.x*0.002)%1;
          ctx.globalAlpha=0.22*(1-phase)*magmaP; ctx.fillStyle='#d7d2c8';
          ctx.beginPath();ctx.ellipse(b.x+(k-1.5)*2.5+Math.sin(phase*5+k)*2,b.y-b.boulderR*1.35-phase*13,2.1+phase*2.2,1.2+phase*1.4,0,0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawMagmaForceOverlay(){
    if(!state||!state.magmaBoulders) return;
    ctx.save();
    for(const b of state.magmaBoulders){
      if(!b.exploded) continue;
      const ep=b.explosionT;
      if(ep<0.42){
        const p=Math.min(1,ep/0.42);
        ctx.globalAlpha=(1-p)*0.72;
        const grad=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.radius*(0.35+0.65*p));
        grad.addColorStop(0,'rgba(255,226,115,.96)');grad.addColorStop(0.28,'rgba(255,99,31,.80)');grad.addColorStop(0.72,'rgba(135,24,12,.38)');grad.addColorStop(1,'rgba(80,8,4,0)');
        ctx.fillStyle=grad;ctx.beginPath();ctx.arc(b.x,b.y,b.radius*(0.35+0.65*p),0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=(1-p)*0.85;ctx.strokeStyle='#ff7a31';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(b.x,b.y,b.radius*Math.min(1,0.55+p*0.45),0,Math.PI*2);ctx.stroke();
      }
      for(const part of b.particles){
        const life=Math.max(0,1-part.t/part.life);
        ctx.globalAlpha=life*(part.landed?0.58:0.92);
        if(part.kind==='rock'){
          ctx.fillStyle='#171311';ctx.fillRect(part.x-part.r,part.y-part.r,part.r*2,part.r*1.45);
        }else if(part.kind==='magma'){
          ctx.shadowBlur=5;ctx.shadowColor='#ff5422';ctx.fillStyle='#ff6b2a';ctx.beginPath();ctx.arc(part.x,part.y,part.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        }else{
          const g=ctx.createRadialGradient(part.x,part.y,0,part.x,part.y,part.r*1.8);g.addColorStop(0,'rgba(255,225,116,.9)');g.addColorStop(0.45,'rgba(255,94,30,.7)');g.addColorStop(1,'rgba(120,15,5,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(part.x,part.y,part.r*1.8,0,Math.PI*2);ctx.fill();
        }
      }
    }
    ctx.restore();
  }

