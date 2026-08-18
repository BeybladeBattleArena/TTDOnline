  /* ================= DICE CATALOG EXTENSIONS V7 =================
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
