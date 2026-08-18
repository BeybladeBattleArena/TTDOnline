  /* ================= SLITHER VINE EXTENSION V8 =================
     Runtime behavior/visuals for the canonical dicefile.json Slither Vine entry.
  */
  GLYPHS.slithervine = GLYPHS.slithervine || {
    fill:false,
    d:'M4 21c4-7 3-12 8-18 1 5 6 5 8 3-1 5-5 7-9 8-4 1-5 4-7 7',
    lines:[[7,17,12,16],[10,12,15,11],[12,7,16,6]]
  };

  (function installSlitherVineStyle(){
    if(document.getElementById('ttdSlitherVineStyle')) return;
    const style=document.createElement('style');
    style.id='ttdSlitherVineStyle';
    style.textContent=`
      .tile.pulse-slither-cast{
        box-shadow:
          inset 0 0 0 2px rgba(205,255,180,.88),
          inset 0 0 16px rgba(73,170,76,.70),
          0 0 15px rgba(113,235,91,.75),
          0 0 28px rgba(55,130,58,.35) !important;
        filter:brightness(1.10) saturate(1.22);
      }
    `;
    document.head.appendChild(style);
  })();

  function slitherTierStats(cls,sp){
    const sectionHpMult=(cls>=3?(sp.class3SectionHpMult||1.10):1)
      *(cls>=5?(sp.class5SectionHpMult||1.05):1)
      *(cls>=7?(sp.class7SectionHpMult||1.12):1);
    const damageReduction=(sp.baseDamageReduction||0.02)
      +(cls>=3?(sp.class3DamageReductionBonus||0.03):0)
      +(cls>=5?(sp.class5DamageReductionBonus||0.02):0)
      +(cls>=7?(sp.class7DamageReductionBonus||0.02):0);
    return {
      sectionHpMult,
      damageReduction:Math.min(0.75,damageReduction),
      barbs:cls>=(sp.barbsClass||4),
      mainDamageMult:cls>=(sp.mainDamageBoostClass||5)?(sp.class5MainDamageMult||1.18):1,
      barbDamageMult:cls>=(sp.barbDamageBoostClass||5)?(sp.class5BarbDamageMult||1.35):1,
      confusionChance:cls>=(sp.statusClass||6)?(sp.mainConfusionChance||0.20):0,
      silenceChance:cls>=(sp.statusClass||6)?(sp.barbSilenceChance||0.12):0,
      statusDuration:sp.statusDuration||2.0,
      glow:cls>=(sp.glowClass||6),
      persist:cls>=(sp.persistClass||7),
    };
  }

  function slitherState(){
    if(!state.slitherVines) state.slitherVines=[];
    if(!state.slitherParticles) state.slitherParticles=[];
    return state.slitherVines;
  }

  function slitherEffectiveSpeed(e){
    if(!e) return -Infinity;
    const slow=Number.isFinite(e.slowMult)?e.slowMult:1;
    return Math.max(0,(Number(e.speed)||0)*slow);
  }

  function pickSlitherTarget(){
    const enemies=aliveEnemies();
    if(!enemies.length) return null;
    let best=enemies[0], bestSpeed=slitherEffectiveSpeed(best);
    for(let i=1;i<enemies.length;i++){
      const e=enemies[i], speed=slitherEffectiveSpeed(e);
      if(speed>bestSpeed+0.001 || (Math.abs(speed-bestSpeed)<=0.001 && e.hp>best.hp)){
        best=e; bestSpeed=speed;
      }
    }
    return best;
  }

  function slitherPathPoint(cast,p){
    const a=cast.origin,b=cast.targetPoint;
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len;
    const snake=Math.sin(p*Math.PI*5.0)*Math.min(7,len*0.025)*(Math.sin(p*Math.PI));
    return {x:a.x+dx*p+nx*snake,y:a.y+dy*p+ny*snake};
  }

  function slitherSpawnParticle(kind,x,y,opts={}){
    slitherState();
    const ang=opts.angle!=null?opts.angle:Math.random()*Math.PI*2;
    const speed=opts.speed!=null?opts.speed:(8+Math.random()*26);
    state.slitherParticles.push({
      kind,x,y,vx:Math.cos(ang)*speed+(opts.vx||0),vy:Math.sin(ang)*speed+(opts.vy||0),
      t:0,life:opts.life||(.45+Math.random()*.55),r:opts.r||(1.2+Math.random()*2.4),gravity:opts.gravity||0,
    });
    if(state.slitherParticles.length>260) state.slitherParticles.splice(0,state.slitherParticles.length-260);
  }

  function slitherBurstAt(x,y,count=14,kind='energy',dir=null){
    for(let i=0;i<count;i++){
      const a=dir==null?Math.random()*Math.PI*2:dir+(Math.random()-.5)*1.4;
      slitherSpawnParticle(kind,x+(Math.random()-.5)*7,y+(Math.random()-.5)*5,{
        angle:a,speed:(kind==='dirt'?12:9)+Math.random()*(kind==='dirt'?28:22),
        life:kind==='dirt'?.55+Math.random()*.45:.42+Math.random()*.55,
        r:kind==='dirt'?1.4+Math.random()*2.0:1.1+Math.random()*2.1,
        gravity:kind==='dirt'?70:0,
        vy:kind==='energy'?-5-Math.random()*8:0,
      });
    }
  }

  function slitherDissolvePrior(sourceDie){
    const list=slitherState();
    for(let i=list.length-1;i>=0;i--){
      const cast=list[i];
      if(cast.sourceDie!==sourceDie || cast.phase!=='persist') continue;
      for(const seg of cast.segments){
        if(seg.alive){ const p=slitherPathPoint(cast,seg.centerT); slitherBurstAt(p.x,p.y,9,'energy'); }
      }
      list.splice(i,1);
    }
  }

  function fireSlitherVine(idx,die,d,dmg,dieAff,potencyBonus,isCrit){
    const target=pickSlitherTarget();
    if(!target) return;
    const sp=d.special||{};
    const cls=slottedClassOf(die.key);
    const tier=slitherTierStats(cls,sp);
    slitherDissolvePrior(die);
    const origin={x:cw*.50,y:ch*.925};
    const targetPoint={...enemyRenderPos(target)};
    const count=Math.max(3,Math.min(5,sp.sectionCount||4));
    const baseSectionHp=Math.max(1,(die.maxHp||d.hp||45)/3);
    const segments=[];
    for(let i=0;i<count;i++){
      const centerT=(i+1)/(count+1);
      segments.push({
        centerT,
        hp:baseSectionHp*tier.sectionHpMult,
        maxHp:baseSectionHp*tier.sectionHpMult,
        alive:true,revealed:false,brokenBeforeImpact:false,contactTimers:new Map(),
        revealAt:(sp.travelDuration||.82)*Math.max(.08,centerT-.08),
      });
    }
    const cast={
      kind:'slitherVine',sourceIndex:idx,sourceDie:die,dieKey:die.key,cls,tier,target,
      origin,targetPoint,segments,t:0,phase:'travel',phaseT:0,headP:0,
      travelDur:sp.travelDuration||.82,windupDur:sp.windupDuration||.58,strikeDur:sp.strikeDuration||.14,
      holdDur:sp.headHoldDuration||1.2,dissolveDur:sp.bodyDissolveDuration||.8,
      damage:dmg*tier.mainDamageMult,affinities:dieAff,potencyBonus:potencyBonus||0,isCrit:!!isCrit,
      preImpactBroken:false,impactResolved:false,headAnchor:null,headTarget:null,
    };
    slitherState().push(cast);
    triggerTilePulse(idx,'pulse-slither-cast',.52);
    slitherBurstAt(origin.x,origin.y,12,'dirt');
    slitherBurstAt(origin.x,origin.y,14,'energy');
  }

  function slitherEnemySkillProfile(e){
    const skills=e.isZombie?(e.def&&e.def.skills||[]):(e.skills||[]);
    let chosen=null;
    for(const s of skills){
      if(!chosen || Number(s.dmg||0)>Number(chosen.dmg||0)) chosen=s;
    }
    return {
      category:(chosen&&chosen.category)||'physical',
      element:(chosen&&chosen.element)||null,
      damage:Math.max(1,Number(chosen&&chosen.dmg)||Number(e.atk)||3),
    };
  }

  function slitherDamageSegment(cast,seg,e,sp){
    if(!seg.alive) return;
    const profile=slitherEnemySkillProfile(e);
    let amount=profile.damage*(e.dmgMult||1)*(sp.enemyBarrierDamageMult||.30);
    if(e.isBoss || e.tier==='sub') amount*=1.55;
    if(e.isTyphoon) amount*=1.45;
    const defKey=profile.category==='special'?'specDef':'physDef';
    const flat=Math.max(0,dieJewelBonus(cast.sourceDie,defKey)||0)*(sp.jewelDefenseCarry||.65);
    amount=Math.max(amount*.30,amount-flat);
    const bypass=profile.element==='fire'||profile.element==='ice'||profile.element==='metal';
    if(!bypass) amount*=Math.max(.05,1-cast.tier.damageReduction);
    seg.hp-=amount;
    if(seg.hp>0) return;
    seg.hp=0; seg.alive=false;
    if(!cast.impactResolved){ cast.preImpactBroken=true; seg.brokenBeforeImpact=true; }
    const p=slitherPathPoint(cast,seg.centerT);
    const ep=enemyRenderPos(e);
    const dir=Math.atan2(cast.origin.y-p.y,cast.origin.x-p.x) || Math.atan2(cast.origin.y-ep.y,cast.origin.x-ep.x);
    slitherBurstAt(p.x,p.y,16,'energy',dir);
    slitherBurstAt(p.x,p.y,12,'dirt',dir);
  }

  function slitherPushEnemy(e,sp){
    const knock=sp.barrierHoldKnockback||2.3;
    if(e.isZombie){
      e.approach=Math.max(0,(e.approach||0)-knock/260);
      e.pausedT=Math.max(e.pausedT||0,.08);
    }else{
      e.dist=Math.max(0,(e.dist||0)-knock*(e.isBoss?.45:1));
      e.pausedT=Math.max(e.pausedT||0,e.isBoss?.045:.08);
    }
    e._slitherBlocked=true;
  }

  function slitherKnockback(e,amount){
    if(!e) return;
    if(e.isZombie) e.approach=Math.max(0,(e.approach||0)-amount/260);
    else e.dist=Math.max(0,(e.dist||0)-amount*(e.isBoss?.45:1));
  }

  function slitherBarbDamage(cast,e,sp){
    if(!cast.tier.barbs || !e.alive) return;
    const clsMult=classMultFor(cast.dieKey);
    const powerBonus=dieJewelBonus(cast.sourceDie,'power')||0;
    const amount=(sp.barbDamage||2.2)*clsMult*(1+powerBonus)*cast.tier.barbDamageMult;
    const old=currentAttackerDieKey; currentAttackerDieKey=cast.dieKey;
    damageEnemy(e,amount,'physical',cast.affinities);
    currentAttackerDieKey=old;
    if(e.alive){
      slitherKnockback(e,sp.barbKnockback||8);
      if(cast.tier.silenceChance>0){
        const chance=Math.min(1,cast.tier.silenceChance+(dieJewelBonus(cast.sourceDie,'insight')||0));
        if(statusRoll(e,chance)) applySilence(e,cast.tier.statusDuration*(1+cast.potencyBonus));
      }
    }
  }

  function slitherBarrierInteractions(cast,dt){
    const sp=DICE.slithervine&&DICE.slithervine.special||{};
    const radius=sp.sectionCollisionRadius||19;
    const enemies=aliveEnemies();
    for(const seg of cast.segments){
      if(!seg.alive||!seg.revealed) continue;
      if(cast.phase==='dissolve'){
        const dp=Math.min(1,cast.phaseT/cast.dissolveDur);
        if(seg.centerT>1-dp+.08) continue;
      }
      const p=slitherPathPoint(cast,seg.centerT);
      for(const [enemy,t] of seg.contactTimers){ const next=t-dt; if(next<=0)seg.contactTimers.delete(enemy); else seg.contactTimers.set(enemy,next); }
      for(const e of enemies){
        if(e.lift) continue;
        const ep=enemyRenderPos(e);
        if(Math.hypot(ep.x-p.x,ep.y-p.y)>radius) continue;
        slitherPushEnemy(e,sp);
        if(seg.contactTimers.has(e)) continue;
        seg.contactTimers.set(e,(e.isBoss?sp.bossAttackInterval:sp.enemyAttackInterval)|| (e.isBoss?.40:.58));
        slitherBarbDamage(cast,e,sp);
        if(e.alive) slitherDamageSegment(cast,seg,e,sp);
      }
    }
  }

  function resolveSlitherImpact(cast){
    cast.impactResolved=true;
    const target=cast.target;
    if(!target||!target.alive) return;
    let amount=cast.damage*(cast.preImpactBroken?.5:1);
    const old=currentAttackerDieKey; currentAttackerDieKey=cast.dieKey;
    damageEnemy(target,amount,'physical',cast.affinities);
    currentAttackerDieKey=old;
    if(target.alive){
      slitherKnockback(target,(DICE.slithervine.special.mainKnockback||12));
      if(cast.tier.confusionChance>0){
        const chance=Math.min(1,cast.tier.confusionChance+(dieJewelBonus(cast.sourceDie,'insight')||0));
        if(statusRoll(target,chance)){
          target.confusion={t:statusResistDuration(target,cast.tier.statusDuration*(1+cast.potencyBonus)),dirT:0,dir:1};
        }
      }
    }
    const p=enemyRenderPos(target);
    slitherBurstAt(p.x,p.y,15,'energy');
    if(cast.isCrit) fx('critFlash',p);
  }

  function updateSlitherVines(dt){
    if(!state) return;
    const list=slitherState();
    for(const e of aliveEnemies()) e._slitherBlocked=false;
    for(let i=list.length-1;i>=0;i--){
      const cast=list[i]; cast.t+=dt; cast.phaseT+=dt;
      if(cast.phase==='travel'){
        cast.headP=Math.min(1,cast.phaseT/cast.travelDur);
        for(const seg of cast.segments){
          if(!seg.revealed&&cast.phaseT>=seg.revealAt){
            seg.revealed=true;
            const p=slitherPathPoint(cast,seg.centerT);
            slitherBurstAt(p.x,p.y,8,'dirt'); slitherBurstAt(p.x,p.y,7,'energy');
          }
        }
        if(cast.phaseT>=cast.travelDur){
          cast.phase='windup';cast.phaseT=0;cast.headP=1;
          cast.headAnchor=slitherPathPoint(cast,1);
        }
      }else if(cast.phase==='windup'){
        if(cast.phaseT>=cast.windupDur){ cast.phase='strike';cast.phaseT=0; }
      }else if(cast.phase==='strike'){
        if(!cast.impactResolved && cast.phaseT>=cast.strikeDur*.72) resolveSlitherImpact(cast);
        if(cast.phaseT>=cast.strikeDur){ cast.phase='hold';cast.phaseT=0; }
      }else if(cast.phase==='hold'){
        if(cast.phaseT>=cast.holdDur){
          if(cast.tier.persist){ cast.phase='persist';cast.phaseT=0; }
          else { cast.phase='dissolve';cast.phaseT=0; }
        }
      }else if(cast.phase==='dissolve'){
        if(cast.phaseT>=cast.dissolveDur){
          for(const seg of cast.segments){ if(seg.alive){ const p=slitherPathPoint(cast,seg.centerT); slitherBurstAt(p.x,p.y,4,'energy'); } }
          list.splice(i,1); continue;
        }
      }
      slitherBarrierInteractions(cast,dt);
    }
    const particles=state.slitherParticles||[];
    for(let i=particles.length-1;i>=0;i--){
      const p=particles[i];p.t+=dt;p.vy+=p.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.975,dt*60);
      if(p.t>=p.life)particles.splice(i,1);
    }
  }

  function drawSlitherVineStroke(cast,fromT,toT,alpha=1){
    const steps=18;
    ctx.save();ctx.globalAlpha*=alpha;ctx.lineCap='round';ctx.lineJoin='round';
    if(cast.tier.glow){ctx.shadowBlur=7;ctx.shadowColor='rgba(185,255,78,.36)';}
    ctx.strokeStyle=cast.tier.glow?'rgba(109,181,55,.95)':'rgba(54,137,62,.96)';ctx.lineWidth=7.2;
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const p=fromT+(toT-fromT)*(i/steps),pt=slitherPathPoint(cast,p);
      if(i===0)ctx.moveTo(pt.x,pt.y);else ctx.lineTo(pt.x,pt.y);
    }
    ctx.stroke();
    ctx.strokeStyle='rgba(135,211,83,.72)';ctx.lineWidth=2.0;ctx.stroke();
    ctx.restore();
  }

  function drawSlitherBarbs(cast,seg,alpha){
    if(!cast.tier.barbs||!seg.alive||!seg.revealed)return;
    const p=slitherPathPoint(cast,seg.centerT);
    const p2=slitherPathPoint(cast,Math.min(.99,seg.centerT+.02));
    const ang=Math.atan2(p2.y-p.y,p2.x-p.x);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ang);ctx.globalAlpha*=alpha;
    ctx.strokeStyle='rgba(191,220,65,.95)';ctx.fillStyle='rgba(175,208,58,.92)';ctx.lineWidth=1;
    for(let k=-2;k<=2;k++){
      const x=k*5;
      ctx.beginPath();ctx.moveTo(x,-2);ctx.lineTo(x-3,-8-(Math.abs(k)%2)*2);ctx.lineTo(x+1,-4);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(x,2);ctx.lineTo(x+3,8+(Math.abs(k)%2)*2);ctx.lineTo(x-1,4);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }

  function drawSlitherHeads(cast){
    if(cast.phase==='persist'||cast.phase==='dissolve')return;
    let base=slitherPathPoint(cast,Math.min(1,cast.headP||1));
    let tip=base;
    let fan=0;
    if(cast.phase==='windup'){
      const target=cast.target&&cast.target.alive?enemyRenderPos(cast.target):cast.targetPoint;
      const a=Math.atan2(target.y-base.y,target.x-base.x);
      const retreat=7+Math.sin(Math.min(1,cast.phaseT/cast.windupDur)*Math.PI)*9;
      base={x:base.x-Math.cos(a)*retreat,y:base.y-Math.sin(a)*retreat};tip=base;fan=.42;
    }else if(cast.phase==='strike'||cast.phase==='hold'){
      const target=cast.target&&cast.target.alive?enemyRenderPos(cast.target):cast.targetPoint;
      const a=Math.atan2(target.y-base.y,target.x-base.x);
      const p=cast.phase==='strike'?Math.min(1,cast.phaseT/cast.strikeDur):1;
      tip={x:base.x+(target.x-base.x)*p,y:base.y+(target.y-base.y)*p};fan=.18;
    }else{
      tip=base;fan=.24;
    }
    const aim=cast.target&&cast.target.alive?enemyRenderPos(cast.target):cast.targetPoint;
    const ang=Math.atan2(aim.y-base.y,aim.x-base.x);
    ctx.save();ctx.lineCap='round';
    for(let h=-1;h<=1;h++){
      const a=ang+h*fan;
      const len=cast.phase==='strike'||cast.phase==='hold'?Math.max(10,Math.hypot(tip.x-base.x,tip.y-base.y)):14;
      const end={x:base.x+Math.cos(a)*len,y:base.y+Math.sin(a)*len};
      ctx.strokeStyle=cast.tier.glow?'rgba(128,205,70,.98)':'rgba(61,145,65,.98)';ctx.lineWidth=4.4;
      ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.quadraticCurveTo(base.x+Math.cos(a-h*.18)*len*.55,base.y+Math.sin(a-h*.18)*len*.55,end.x,end.y);ctx.stroke();
      ctx.fillStyle='rgba(175,220,82,.96)';ctx.beginPath();ctx.moveTo(end.x+Math.cos(a)*5,end.y+Math.sin(a)*5);ctx.lineTo(end.x+Math.cos(a+2.5)*3,end.y+Math.sin(a+2.5)*3);ctx.lineTo(end.x+Math.cos(a-2.5)*3,end.y+Math.sin(a-2.5)*3);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }

  function drawSlitherVines(){
    if(!state)return;
    ctx.save();
    for(const cast of (state.slitherVines||[])){
      let visibleEnd=cast.phase==='travel'?Math.min(1,cast.headP):1;
      let dissolveProgress=cast.phase==='dissolve'?Math.min(1,cast.phaseT/cast.dissolveDur):0;
      const overallAlpha=cast.phase==='dissolve'?Math.max(.08,1-dissolveProgress*.65):1;
      for(const seg of cast.segments){
        if(!seg.revealed||!seg.alive||seg.centerT>visibleEnd+.05)continue;
        if(cast.phase==='dissolve'&&seg.centerT>1-dissolveProgress+.08)continue;
        const p=slitherPathPoint(cast,seg.centerT);
        ctx.globalAlpha=.42*overallAlpha;ctx.fillStyle='rgba(43,32,20,.85)';ctx.beginPath();ctx.ellipse(p.x,p.y+3,11,4,0,0,Math.PI*2);ctx.fill();
      }
      ctx.globalAlpha=1;
      for(const seg of cast.segments){
        if(!seg.revealed||!seg.alive||seg.centerT>visibleEnd+.05)continue;
        if(cast.phase==='dissolve'&&seg.centerT>1-dissolveProgress+.08)continue;
        const half=(1/(cast.segments.length+1))*.47;
        drawSlitherVineStroke(cast,Math.max(0,seg.centerT-half),Math.min(visibleEnd,seg.centerT+half),overallAlpha);
        drawSlitherBarbs(cast,seg,overallAlpha);
        const p=slitherPathPoint(cast,seg.centerT);
        const hpPct=Math.max(0,seg.hp/seg.maxHp);
        if(hpPct<.999){
          ctx.globalAlpha=.75;ctx.fillStyle='rgba(8,15,8,.72)';ctx.fillRect(p.x-11,p.y-15,22,3);
          ctx.fillStyle='rgba(116,200,80,.92)';ctx.fillRect(p.x-11,p.y-15,22*hpPct,3);
        }
      }
      drawSlitherHeads(cast);
      if(cast.phase==='travel'&&cast.phaseT<.28){
        const p=1-cast.phaseT/.28, r=8+(1-p)*18;
        const g=ctx.createRadialGradient(cast.origin.x,cast.origin.y,0,cast.origin.x,cast.origin.y,r);
        g.addColorStop(0,`rgba(117,235,90,${.45*p})`);g.addColorStop(1,'rgba(117,235,90,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(cast.origin.x,cast.origin.y,r,0,Math.PI*2);ctx.fill();
      }
    }
    for(const p of (state.slitherParticles||[])){
      const life=Math.max(0,1-p.t/p.life);ctx.globalAlpha=life*(p.kind==='dirt'?.75:.82);
      ctx.fillStyle=p.kind==='dirt'?'rgba(105,72,38,.95)':'rgba(122,235,91,.92)';
      if(p.kind!=='dirt'){ctx.shadowBlur=4;ctx.shadowColor='rgba(123,255,90,.55)';}else ctx.shadowBlur=0;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r*(.55+.45*life),0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
