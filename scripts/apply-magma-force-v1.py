from __future__ import annotations

import json
import pathlib
import re
import shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one anchor, found {count}")
    return text.replace(old, new, 1)


def insert_object_entry(text: str, section_key: str, after_key: str, new_key: str, value: dict) -> str:
    section_marker = f'  "{section_key}": {{'
    section_start = text.find(section_marker)
    if section_start < 0:
        raise RuntimeError(f"Missing section {section_key}")
    entry_marker = f'    "{after_key}": '
    entry_start = text.find(entry_marker, section_start)
    if entry_start < 0:
        raise RuntimeError(f"Missing {section_key}.{after_key}")
    brace_start = text.find('{', entry_start + len(entry_marker))
    if brace_start < 0:
        raise RuntimeError(f"Missing object body for {section_key}.{after_key}")

    depth = 0
    in_string = False
    escape = False
    end = None
    for i in range(brace_start, len(text)):
        ch = text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end is None:
        raise RuntimeError(f"Could not balance {section_key}.{after_key}")

    cursor = end
    while cursor < len(text) and text[cursor] in ' \t':
        cursor += 1
    if cursor < len(text) and text[cursor] == ',':
        cursor += 1
    else:
        text = text[:end] + ',' + text[end:]
        cursor += 1

    encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    insertion = f'\n    "{new_key}": {encoded}'
    return text[:cursor] + insertion + text[cursor:]


MAGMA_DIE = {
    "name": "Magma Force",
    "rarity": "legendary",
    "glyph": "crack",
    "color": "#762d22",
    "glow": "#ff8c4a",
    "target": "random",
    "category": "physical",
    "affinities": {"earth": 0.5, "fire": 0.5},
    "dmg": 36,
    "atk": 7.2,
    "hp": 64,
    "range": "map",
    "special": {
        "kind": "magmaForce",
        "baseBoulderCount": 4,
        "class4BoulderCount": 5,
        "averageEnemyLength": 15,
        "boulderScale": 1.25,
        "baseExplosionRadius": 34,
        "class3RadiusMult": 1.10,
        "class6RadiusMult": 1.10,
        "class4ExplosionMult": 1.10,
        "class7ExplosionMult": 1.08,
        "pulseDpsC2": 3.2,
        "pulseDpsC7": 3.5,
        "pulseTickInterval": 0.25,
        "slowChance": 0.20,
        "slowAmount": 0.30,
        "slowDuration": 1.8,
        "launchRadiusMult": 0.48,
        "riseDuration": 0.22,
        "heatDuration": 1.85,
        "magmaDuration": 1.0,
        "flareDuration": 0.30,
        "class7AnimationMult": 0.97,
        "explosionLife": 0.82,
        "classCooldownSteps": [{"atClass": 3, "mult": 0.96}, {"atClass": 7, "mult": 0.96}],
    },
}

MAGMA_LORE = {
    "flavor": "The stone is only pretending to be solid.",
    "desc": "Raises spaced volcanic boulders from random battlefield ground. They heat from earth-brown to black and magma-red while their ground pulse warns the exact blast area, then erupt in Physical damage split evenly between Earth and Fire. Higher Classes add pulse damage, Slow, a fifth boulder, larger blasts, and central Launch.",
}

MAGMA_DESIGN = {
    "skills": [{
        "id": "skill1",
        "name": "Magma Force",
        "type": "projectile",
        "damageCategory": "physical",
        "affinities": {"earth": 0.5, "fire": 0.5},
        "cooldown": 7.2,
        "range": "map",
        "targeting": {
            "marchingPath": "random_ground_between_parallel_march_lanes",
            "noMarchingPath": "random_safe_battlefield_points",
            "neverOverlap": True,
            "minimumEdgeGapAverageEnemyLengths": 4,
        },
        "visual": {
            "rise": "Ground pushes upward into randomized dome-like boulders about 1.25× an average enemy length, initially earthy dark brown.",
            "heat": "Over 1.85s the rock darkens to black while red/yellow superheated patches emerge.",
            "warning": "Once black, a looping dark-red ground shockwave reaches the exact upcoming explosion circumference.",
            "magma": "Over the next 1.0s the black surface becomes volcanic dark red, steams, and grows a visible magma trickle.",
            "flare": "Over 0.3s the whole boulder becomes the superheated red before detonation.",
            "explosion": "Fire, black rock fragments, and liquid magma burst outward. Gameplay damage stops at the warning circumference; debris outside it is visual only and fades after landing.",
        },
        "tiers": {
            "C1": ["Summon 4 well-spaced boulders."],
            "C2": ["Enemies standing inside an active warning pulse take small Physical Earth/Fire damage over time."],
            "C3": ["Slightly reduce cooldown and slightly increase explosion radius."],
            "C4": ["Summon 5 boulders and slightly increase explosion damage."],
            "C5": ["The first overlap with each boulder's pulse has a 20% chance to inflict Slow."],
            "C6": ["Slightly increase explosion radius; non-boss enemies near the epicenter are Launched."],
            "C7": ["Very slightly increase pulse damage and explosion damage, slightly reduce cooldown again, and shorten the full warning animation by 3%."],
        },
    }]
}

MAGMA_CODE = r'''

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
'''


def patch_catalog() -> None:
    path = ROOT / 'dicefile.json'
    text = path.read_text(encoding='utf-8')
    if '"magmaforce"' in text:
        raise RuntimeError('Magma Force already exists in dicefile.json')
    text = re.sub(r'"catalogVersion":\s*"[^"]+"', '"catalogVersion": "2026.08.20-magma-force-v32"', text, count=1)
    text = insert_object_entry(text, 'dice', 'wizardrod', 'magmaforce', MAGMA_DIE)
    text = insert_object_entry(text, 'lore', 'wizardrod', 'magmaforce', MAGMA_LORE)
    text = insert_object_entry(text, 'design', 'wizardrod', 'magmaforce', MAGMA_DESIGN)
    json.loads(text)
    path.write_text(text, encoding='utf-8')


def patch_bridge() -> None:
    old = ROOT / 'online' / 'dice-catalog-bridge-v7.js'
    new = ROOT / 'online' / 'dice-catalog-bridge-v8.js'
    if new.exists():
        raise RuntimeError('dice-catalog-bridge-v8.js already exists')
    text = old.read_text(encoding='utf-8')
    text = replace_once(text, 'DICE CATALOG EXTENSIONS V7', 'DICE CATALOG EXTENSIONS V8', 'catalog bridge version banner')
    text = text.rstrip() + MAGMA_CODE + '\n'
    new.write_text(text, encoding='utf-8')


def patch_loader() -> None:
    path = ROOT / 'online' / 'game-loader.js'
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, "'/online/dice-catalog-bridge-v7.js?v=7'", "'/online/dice-catalog-bridge-v8.js?v=8'", 'catalog bridge URL')
    text = replace_once(
        text,
        "    if(!catalog.dice.slithervine || catalog.dice.slithervine?.special?.kind!=='slitherVine'){\n      throw new Error('dicefile.json does not contain the Slither Vine runtime definition.');\n    }",
        "    if(!catalog.dice.slithervine || catalog.dice.slithervine?.special?.kind!=='slitherVine'){\n      throw new Error('dicefile.json does not contain the Slither Vine runtime definition.');\n    }\n    if(!catalog.dice.magmaforce || catalog.dice.magmaforce?.special?.kind!=='magmaForce'){\n      throw new Error('dicefile.json does not contain the Magma Force runtime definition.');\n    }",
        'canonical Magma Force requirement',
    )
    text = replace_once(
        text,
        "      `${SKILL_SWITCH}\\n      case 'soulScimitar': {",
        "      `${SKILL_SWITCH}\\n      case 'magmaForce': {\\n        if(!__TTD_BATTLE_HOOKS.fireMagmaForce(idx, die, d, dmg, dieAff, potencyBonus, isCrit)){\\n          die.sinceLastShot = Math.max(die.sinceLastShot, effAtk(die)*0.85);\\n        }\\n        break;\\n      }\\n      case 'soulScimitar': {",
        'Magma Force skill dispatcher hook',
    )
    text = replace_once(
        text,
        "      `${LOOP_TIME}\\n    __TTD_BATTLE_HOOKS.updateSoulScimitars(dt);",
        "      `${LOOP_TIME}\\n    __TTD_BATTLE_HOOKS.updateMagmaForce(dt);\\n    __TTD_BATTLE_HOOKS.updateSoulScimitars(dt);",
        'Magma Force update hook',
    )
    text = replace_once(
        text,
        "    source=source.split(DRAW_LANE).join(`${DRAW_LANE} __TTD_BATTLE_HOOKS.drawSlitherVines(); __TTD_BATTLE_HOOKS.drawSoulScimitars();`);",
        "    source=source.split(DRAW_LANE).join(`${DRAW_LANE} __TTD_BATTLE_HOOKS.drawSlitherVines(); __TTD_BATTLE_HOOKS.drawSoulScimitars(); __TTD_BATTLE_HOOKS.drawMagmaForceOverlay();`);",
        'Magma Force overlay draw hook',
    )
    text = replace_once(
        text,
        "    source=replaceOnce(\n      source,\n      TARGET_LABEL,",
        "    source=replaceOnce(\n      source,\n      \"    for(const e of state.enemies){\\n      if(!e.alive) continue;\\n      const groundP = enemyRenderPos(e);\",\n      \"    __TTD_BATTLE_HOOKS.drawMagmaForceGround();\\n\\n    for(const e of state.enemies){\\n      if(!e.alive) continue;\\n      const groundP = enemyRenderPos(e);\",\n      'Magma Force ground draw pass'\n    );\n    source=replaceOnce(\n      source,\n      TARGET_LABEL,",
        'Magma Force ground hook insertion',
    )
    text = replace_once(
        text,
        '      "    const targetLabel = {front:\'Frontmost enemy\', random:\'Random enemy\', strongest:\'Strongest enemy\', fastest:\'Fastest enemy (ties: highest current HP)\', none:\'Does not attack\'}[d.target]||d.target;",',
        '      "    const targetLabel = d.special?.kind===\'magmaForce\' ? \'Random battlefield areas\' : ({front:\'Frontmost enemy\', random:\'Random enemy\', strongest:\'Strongest enemy\', fastest:\'Fastest enemy (ties: highest current HP)\', none:\'Does not attack\'}[d.target]||d.target);",',
        'Magma Force target label',
    )
    text = replace_once(
        text,
        "    fireSoulScimitar(){}, updateSoulScimitars(){}, drawSoulScimitars(){},\n    fireSlitherVine(){}, updateSlitherVines(){}, drawSlitherVines(){}",
        "    fireMagmaForce(){return false;}, updateMagmaForce(){}, drawMagmaForceGround(){}, drawMagmaForceOverlay(){},\n    fireSoulScimitar(){}, updateSoulScimitars(){}, drawSoulScimitars(){},\n    fireSlitherVine(){}, updateSlitherVines(){}, drawSlitherVines(){}",
        'Magma Force battle hook no-ops',
    )
    text = replace_once(
        text,
        "    Object.assign(__TTD_BATTLE_HOOKS,{fireSoulScimitar,updateSoulScimitars,drawSoulScimitars});",
        "    Object.assign(__TTD_BATTLE_HOOKS,{fireMagmaForce,updateMagmaForce,drawMagmaForceGround,drawMagmaForceOverlay,fireSoulScimitar,updateSoulScimitars,drawSoulScimitars});",
        'Magma Force battle hook exports',
    )
    text = text.replace('/online/dice-catalog-bridge-v7.js?v=7', '/online/dice-catalog-bridge-v8.js?v=8')
    path.write_text(text, encoding='utf-8')


def patch_package_and_checks() -> None:
    package = ROOT / 'package.json'
    text = package.read_text(encoding='utf-8')
    text = replace_once(text, 'online/dice-catalog-bridge-v7.js', 'online/dice-catalog-bridge-v8.js', 'package bridge syntax check')
    package.write_text(text, encoding='utf-8')

    check = ROOT / 'scripts' / 'check-online-loader-v15.mjs'
    text = check.read_text(encoding='utf-8')
    text = text.replace('online/dice-catalog-bridge-v7.js', 'online/dice-catalog-bridge-v8.js')
    text = text.replace('/online/dice-catalog-bridge-v7.js?v=7', '/online/dice-catalog-bridge-v8.js?v=8')
    anchor = "if(!loader.includes('TTD_BATTLE_HOOK_SCOPE_V20') || !loader.includes('__TTD_BATTLE_HOOKS.updateSoulScimitars(dt)') || !loader.includes('__TTD_BATTLE_HOOKS.updateSlitherVines(dt)')) throw new Error('Catalog combat hooks are not exported safely to the transformed first-frame battle loop.');"
    replacement = anchor + "\nfor(const marker of [\"case 'magmaForce'\",'__TTD_BATTLE_HOOKS.updateMagmaForce(dt)','drawMagmaForceGround','drawMagmaForceOverlay','fireMagmaForce,updateMagmaForce']) if(!loader.includes(marker)) throw new Error(`Magma Force loader hook missing: ${marker}`);"
    text = replace_once(text, anchor, replacement, 'loader Magma Force assertions')
    check.write_text(text, encoding='utf-8')

    sync = ROOT / 'scripts' / 'sync-dice-catalog.mjs'
    text = sync.read_text(encoding='utf-8')
    magma_checks = r'''
const magma = catalog.dice?.magmaforce;
if (!magma) errors.push('Magma Force is missing.');
else {
  if (magma.atk !== 7.2) errors.push('Magma Force base cooldown must remain 7.2 seconds unless its design is intentionally revised.');
  if (magma.category !== 'physical') errors.push('Magma Force must use Physical damage.');
  if (Number(magma.affinities?.earth) !== 0.5 || Number(magma.affinities?.fire) !== 0.5) errors.push('Magma Force must remain a 50% Earth / 50% Fire split.');
  if (magma.special?.kind !== 'magmaForce') errors.push('Magma Force must use the magmaForce runtime handler.');
  if (magma.special?.baseBoulderCount !== 4 || magma.special?.class4BoulderCount !== 5) errors.push('Magma Force boulder counts must remain C1=4 and C4+=5.');
  if (magma.special?.slowChance !== 0.20) errors.push('Magma Force C5 Slow chance must remain 20%.');
  if (magma.special?.averageEnemyLength !== 15) errors.push('Magma Force spacing reference must remain one 15px average-enemy length unless map scale is intentionally revised.');
}

'''
    text = replace_once(text, 'if (errors.length) {', magma_checks + 'if (errors.length) {', 'Magma Force catalog invariants')
    sync.write_text(text, encoding='utf-8')


def validate_local_shapes() -> None:
    catalog = json.loads((ROOT / 'dicefile.json').read_text(encoding='utf-8'))
    magma = catalog['dice']['magmaforce']
    assert magma['special']['baseBoulderCount'] == 4
    assert magma['special']['class4BoulderCount'] == 5
    assert magma['affinities'] == {'earth': 0.5, 'fire': 0.5}
    loader = (ROOT / 'online' / 'game-loader.js').read_text(encoding='utf-8')
    for marker in ["case 'magmaForce'", 'updateMagmaForce(dt)', 'drawMagmaForceGround', 'drawMagmaForceOverlay']:
        if marker not in loader:
            raise RuntimeError(f'Missing loader marker {marker}')


def main() -> None:
    patch_catalog()
    patch_bridge()
    patch_loader()
    patch_package_and_checks()
    validate_local_shapes()
    print('Magma Force source patch applied successfully.')


if __name__ == '__main__':
    main()
