from pathlib import Path
import json

ROOT = Path('.')
CATALOG = ROOT / 'overdrivefile.json'
MIRROR = ROOT / 'functions/overdrivefile.generated.json'
ABIL = ROOT / 'online/overdrive-abilities-v1.js'
GIFT = ROOT / 'functions/gift-v7-secure.js'
CHECK = ROOT / 'scripts/check-overdrive-v1.mjs'


def require_once(text, needle, label):
    count = text.count(needle)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one marker, found {count}: {needle[:100]}')

catalog = json.loads(CATALOG.read_text())
if 'blacktaurus' in catalog.get('dice', {}):
    raise SystemExit('Black Taurus already exists; refusing duplicate materialization.')

catalog['dice']['blacktaurus'] = {
    'name': 'Black Taurus',
    'element': 'Earth',
    'dpCost': 20,
    'glyph': {
        'path': 'M4 6 L8 9 L7 4 L11 7 H13 L17 4 L16 9 L20 6 L18 12 C18 18 15 21 12 21 C9 21 6 18 6 12 Z M9 13 H10 M14 13 H15 M10 17 Q12 19 14 17'
    },
    'flavor': 'The strongest thing on the field becomes the next thing in his way.',
    'description': 'Summons a huge dark-slate minotaur that hunts the enemy with the highest current HP. Black Taurus travels the battlefield, stops in place to attack, and delivers slow, heavy Earth-aligned pressure through Winding Rush, Impede Stamp, and Bull Rush.',
    'acquisition': {
        'kind': 'test-code',
        'testCode': 'TTD-BLACK-TAURUS',
        'rollout': 'playtest'
    },
    'special': {
        'kind': 'blackTaurusSummon',
        'oneActivePerPlayer': True,
        'sizeReference': '1.08x-standard-ogre',
        'color': '#343c43',
        'hp': 330,
        'attack': 32,
        'damageReduction': 0.08,
        'combatTuning': 'provisional-playtest',
        'moveSpeed': 51,
        'moveSpeedReference': 'standard-goblin-x1.5',
        'target': 'highest-current-hp',
        'adjacentDistance': 30,
        'aggroRadius': 70,
        'attackIntervalMin': 2.6,
        'attackIntervalMax': 3.3,
        'deathFadeSeconds': 1.2,
        'attacks': {
            'windingRush': {
                'category': 'physical',
                'affinities': {'earth': 1},
                'reference': 'Relentless Mace spinning skill',
                'radius': 38,
                'weights': [0.28, 0.28, 0.34, 0.90],
                'hitGapSeconds': 0.16,
                'finalRecoverySeconds': 0.22,
                'damageRole': 'primary-heavy'
            },
            'impedeStamp': {
                'category': 'status',
                'target': 'single',
                'logAppearLingerSeconds': 0.25,
                'pullbackTravelSeconds': 0.15,
                'pulledBackLingerSeconds': 0.5,
                'slamTravelSeconds': 0.14,
                'stunSeconds': 3.5,
                'slowAmount': 0.30,
                'slowSeconds': 0.6,
                'sameTargetWindingFollowupChance': 0.75,
                'directDamage': 0
            },
            'bullRush': {
                'category': 'physical',
                'affinities': {'earth': 1},
                'triggerDistance': 115,
                'hornDownWindupSeconds': 0.4,
                'dashSpeedMultiplier': 2.2,
                'dashSpeed': 112.2,
                'overlapDamageWeight': 0.65,
                'overlapRadius': 24,
                'goreSeconds': 0.4,
                'goreHeight': 38,
                'landingStunSeconds': 1,
                'retrackTargetDuringRush': True
            }
        }
    }
}

catalog_text = json.dumps(catalog, indent=2) + '\n'
CATALOG.write_text(catalog_text)
MIRROR.write_text(catalog_text)

# Secure online playtest grant.
gift = GIFT.read_text()
gift_marker = "  'TTD-ZETSA': { label:\"Zetsa's Cauldron Overdrive Test Grant\", reward:{ overdriveDice:[{ key:'zetsascauldron' }] } },"
require_once(gift, gift_marker, 'gift code insertion')
gift = gift.replace(gift_marker, gift_marker + "\n  'TTD-BLACK-TAURUS': { label:'Black Taurus Overdrive Test Grant', reward:{ overdriveDice:[{ key:'blacktaurus' }] } },")
GIFT.write_text(gift)

abilities = ABIL.read_text()

# Runtime state.
marker = "  let wolf = null;\n  let cauldron = null;"
require_once(abilities, marker, 'runtime state insertion')
abilities = abilities.replace(marker, "  let wolf = null;\n  let taurus = null;\n  let cauldron = null;")

# Highest-HP target authority.
marker = "  function frontmost() { return alive().sort((a, b) => progress(b) - progress(a))[0] || null; }"
require_once(abilities, marker, 'highest HP helper insertion')
abilities = abilities.replace(marker, marker + "\n  function highestHpTarget() { return alive().sort((a,b)=>Number(b.hp||0)-Number(a.hp||0)||Number(b.maxHp||0)-Number(a.maxHp||0)||progress(b)-progress(a))[0] || null; }")

# Black Taurus combat/movement state machine, kept inside the existing Overdrive ability authority.
marker = "  function makeGaiaReticle(def) {"
require_once(abilities, marker, 'Taurus combat insertion')
taurus_block = r'''  function taurusEnemyId(e){
    if(!e)return null;
    if(!e.__ttdTaurusEnemyId)e.__ttdTaurusEnemyId='bt'+Math.random().toString(36).slice(2);
    return e.__ttdTaurusEnemyId;
  }
  function taurusEnemyById(id){return id?alive().find(e=>taurusEnemyId(e)===id)||null:null;}
  function taurusPoint(){return taurus?.pos || {x:Number(window.cw||300)*.5,y:Number(window.ch||200)*.78};}
  function taurusAttackDelay(def){const sp=def?.special||{},lo=Number(sp.attackIntervalMin||2.6),hi=Math.max(lo,Number(sp.attackIntervalMax||3.3));return lo+Math.random()*(hi-lo);}
  function summonTaurus(def){
    if(taurus?.alive){taurus.alive=false;taurus.deadAt=now();}
    const sp=def.special||{},spawn={x:Number(window.cw||300)*.5,y:Number(window.ch||200)*.76};
    taurus={key:'blacktaurus',alive:true,hp:Number(sp.hp||330),maxHp:Number(sp.hp||330),atk:Number(sp.attack||32),dr:Number(sp.damageReduction||.08),pos:spawn,facing:-Math.PI/2,targetId:null,nextAttack:now()+1,action:null,followTargetId:null,deadAt:0};
    ring(spawn.x,spawn.y,34,'rgba(154,125,87,.75)',.58,2.8);ring(spawn.x,spawn.y,49,'rgba(88,70,53,.52)',.78,1.6);burst(spawn.x,spawn.y,'#8b765f',18,52,2.2);toast('Black Taurus enters the field!');
  }
  function hurtTaurus(raw,element,source){
    if(!taurus?.alive)return 0;
    const amount=Math.max(0,Number(raw||0))*(1-taurus.dr);taurus.hp=Math.max(0,taurus.hp-amount);const p=taurusPoint();burst(p.x,p.y,'#7d868a',5,30,1.8);
    if(taurus.hp<=0){taurus.alive=false;taurus.deadAt=now();taurus.action=null;toast('Black Taurus falls.');}
    if(source)source.__ttdTaurusAttackT=.95+Math.random()*.7;return amount;
  }
  function applyTaurusAggro(dt){
    if(!taurus?.alive)return;const tp=taurusPoint(),sp=catalogDef('blacktaurus')?.special||{},aggro=Number(sp.aggroRadius||70),contact=Number(sp.adjacentDistance||30)+5;
    for(const e of alive()){
      const ep=point(e),dist=Math.hypot(ep.x-tp.x,ep.y-tp.y);if(dist>aggro){e.__ttdBlackTaurusAggro=false;continue;}e.__ttdBlackTaurusAggro=true;
      if(dist<=contact&&!taurus.action)e.pausedT=Math.max(Number(e.pausedT||0),.12);
      e.__ttdTaurusAttackT=Number(e.__ttdTaurusAttackT??(.4+Math.random()*.9))-dt;
      if(e.__ttdTaurusAttackT<=0){const profile=enemyAttackProfile(e);hurtTaurus(profile.amount,profile.element,e);slash(tp.x,tp.y,Math.random()*1.2-.6,'#bd7d6f',.18);}
    }
  }
  function finishTaurusAction(def){if(!taurus)return;taurus.action=null;taurus.nextAttack=now()+taurusAttackDelay(def);}
  function startTaurusWinding(target,def){
    if(!taurus?.alive||!target?.alive)return;const cfg=def.special.attacks.windingRush;taurus.action={kind:'winding',start:now(),targetId:taurusEnemyId(target),hitIndex:0};taurus.targetId=taurusEnemyId(target);taurus.followTargetId=null;ring(taurus.pos.x,taurus.pos.y,Number(cfg.radius||38),'rgba(126,94,61,.48)',.36,2.4);
  }
  function startTaurusStamp(target,def){
    if(!taurus?.alive||!target?.alive)return;taurus.action={kind:'stamp',start:now(),targetId:taurusEnemyId(target),slammed:false};taurus.targetId=taurusEnemyId(target);taurus.followTargetId=taurusEnemyId(target);
  }
  function startTaurusBullRush(target,def){
    if(!taurus?.alive||!target?.alive)return;taurus.action={kind:'bullWindup',start:now(),targetId:taurusEnemyId(target),hitIds:new Set()};taurus.targetId=taurusEnemyId(target);taurus.followTargetId=null;
  }
  function taurusOverlapRush(def,action){
    const cfg=def.special.attacks.bullRush,p=taurusPoint(),radius=Number(cfg.overlapRadius||24);for(const e of nearby(p,radius)){const id=taurusEnemyId(e);if(action.hitIds.has(id))continue;action.hitIds.add(id);damage(e,taurus.atk*Number(cfg.overlapDamageWeight||.65),'physical',cfg.affinities||{earth:1});burst(point(e).x,point(e).y,'#96714d',7,36,1.8);}
  }
  function beginTaurusGore(target,def,action){
    if(!taurus?.alive||!target?.alive){finishTaurusAction(def);return;}const cfg=def.special.attacks.bullRush;taurusOverlapRush(def,action);const seconds=Number(cfg.goreSeconds||.4);target.pausedT=Math.max(Number(target.pausedT||0),seconds+.03);launch(target,{rise:seconds*.38,hold:seconds*.48,fall:seconds*.14,height:Number(cfg.goreHeight||38),juggleable:false});ring(point(target).x,point(target).y,22,'rgba(177,139,84,.68)',.32,2.6);taurus.action={kind:'gore',start:now(),targetId:taurusEnemyId(target)};
  }
  function updateTaurusAction(dt,def){
    if(!taurus?.alive||!taurus.action)return;const sp=def.special||{},a=taurus.action,target=taurusEnemyById(a.targetId),elapsed=now()-a.start;
    if(target){const ep=point(target);taurus.facing=Math.atan2(ep.y-taurus.pos.y,ep.x-taurus.pos.x);}
    if(a.kind==='winding'){
      const cfg=sp.attacks.windingRush,weights=cfg.weights||[.28,.28,.34,.9],gap=Number(cfg.hitGapSeconds||.16);while(a.hitIndex<weights.length&&elapsed>=a.hitIndex*gap){const weight=Number(weights[a.hitIndex]||0),radius=Number(cfg.radius||38);for(const e of nearby(taurus.pos,radius))damage(e,taurus.atk*weight,'physical',cfg.affinities||{earth:1});ring(taurus.pos.x,taurus.pos.y,radius*(.68+a.hitIndex*.09),'rgba(142,103,66,.55)',.24,2.3);burst(taurus.pos.x,taurus.pos.y,'#8d704f',8+a.hitIndex*2,42,1.7);a.hitIndex++;}
      const total=(weights.length-1)*gap+Number(cfg.finalRecoverySeconds||.22);if(elapsed>=total)finishTaurusAction(def);return;
    }
    if(a.kind==='stamp'){
      const cfg=sp.attacks.impedeStamp,t0=Number(cfg.logAppearLingerSeconds||.25),pull=Number(cfg.pullbackTravelSeconds||.15),hold=Number(cfg.pulledBackLingerSeconds||.5),slam=Number(cfg.slamTravelSeconds||.14),impactAt=t0+pull+hold+slam;
      if(!a.slammed&&elapsed>=impactAt){a.slammed=true;if(target?.alive){const stun=Number(cfg.stunSeconds||3.5),slow=Number(cfg.slowAmount||.3),slowSec=Number(cfg.slowSeconds||.6);target.pausedT=Math.max(Number(target.pausedT||0),stun);const ep=point(target);ring(ep.x,ep.y,26,'rgba(91,72,55,.72)',.38,3);burst(ep.x,ep.y,'#6d5b49',14,48,2.1);setTimeout(()=>{try{if(target?.alive)window.applySlow?.(target,slow,slowSec);}catch(_){}},stun*1000);}}
      if(elapsed>=impactAt+.18)finishTaurusAction(def);return;
    }
    if(a.kind==='bullWindup'){
      const cfg=sp.attacks.bullRush,wind=Number(cfg.hornDownWindupSeconds||.4);if(!target?.alive){const next=highestHpTarget();if(!next){finishTaurusAction(def);return;}a.targetId=taurusEnemyId(next);}if(elapsed>=wind){a.kind='bullDash';a.start=now();}return;
    }
    if(a.kind==='bullDash'){
      const cfg=sp.attacks.bullRush;let tracked=target;if(!tracked?.alive&&cfg.retrackTargetDuringRush!==false){tracked=highestHpTarget();if(tracked)a.targetId=taurusEnemyId(tracked);}if(!tracked){finishTaurusAction(def);return;}const ep=point(tracked),dx=ep.x-taurus.pos.x,dy=ep.y-taurus.pos.y,dist=Math.max(.001,Math.hypot(dx,dy)),speed=Number(cfg.dashSpeed||Number(sp.moveSpeed||51)*Number(cfg.dashSpeedMultiplier||2.2)),step=Math.min(dist,speed*dt);taurus.facing=Math.atan2(dy,dx);taurus.pos.x+=dx/dist*step;taurus.pos.y+=dy/dist*step;taurusOverlapRush(def,a);if(dist<=Number(sp.adjacentDistance||30)||elapsed>2.4)beginTaurusGore(tracked,def,a);return;
    }
    if(a.kind==='gore'){
      const cfg=sp.attacks.bullRush,seconds=Number(cfg.goreSeconds||.4);if(elapsed>=seconds){if(target?.alive)target.pausedT=Math.max(Number(target.pausedT||0),Number(cfg.landingStunSeconds||1));finishTaurusAction(def);}return;
    }
  }
  function updateTaurus(dt){
    if(!taurus?.alive)return;const def=catalogDef('blacktaurus');if(!def)return;updateTaurusAction(dt,def);if(taurus.action)return;const sp=def.special||{},target=highestHpTarget();if(!target){taurus.targetId=null;return;}const id=taurusEnemyId(target);if(taurus.targetId&&taurus.targetId!==id)taurus.followTargetId=null;taurus.targetId=id;const ep=point(target),dx=ep.x-taurus.pos.x,dy=ep.y-taurus.pos.y,dist=Math.max(.001,Math.hypot(dx,dy));taurus.facing=Math.atan2(dy,dx);const cfgBull=sp.attacks.bullRush||{};
    if(dist>Number(sp.adjacentDistance||30)){if(now()>=taurus.nextAttack&&dist>=Number(cfgBull.triggerDistance||115)){startTaurusBullRush(target,def);return;}const step=Math.min(dist,Number(sp.moveSpeed||51)*dt);taurus.pos.x+=dx/dist*step;taurus.pos.y+=dy/dist*step;return;}
    if(now()<taurus.nextAttack)return;const stamp=sp.attacks.impedeStamp||{},sameFollow=taurus.followTargetId===id&&Math.random()<Number(stamp.sameTargetWindingFollowupChance||.75);if(sameFollow||Math.random()<.64)startTaurusWinding(target,def);else startTaurusStamp(target,def);
  }

'''
abilities = abilities.replace(marker, taurus_block + marker)

# Activation route.
marker = "    if (key === 'gaiacrash') {"
require_once(abilities, marker, 'Taurus activation insertion')
activation = "    if (key === 'blacktaurus') {\n      if (!api.spendDp?.(Number(def.dpCost || 20))) return;\n      api.resetDrive?.();\n      busy = true; summonTaurus(def); setTimeout(() => { busy = false; }, 250);\n      return;\n    }\n"
abilities = abilities.replace(marker, activation + marker)

# Procedural minotaur + Stamp log presentation.
marker = "  function drawCauldronShape(ctx,c,t){"
require_once(abilities, marker, 'Taurus render insertion')
render_block = r'''  function drawTaurusShape(ctx,x,y,angle=0,alpha=1,action=null){
    ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);let rot=angle;if(action?.kind==='winding')rot+=(now()-action.start)*18;ctx.rotate(rot);const gore=action?.kind==='gore'?clamp((now()-action.start)/.4,0,1):0;
    ctx.fillStyle='#343c43';ctx.strokeStyle='#79838a';ctx.lineWidth=1.8;ctx.beginPath();ctx.ellipse(-2,1,18,13,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#2a3036';ctx.beginPath();ctx.ellipse(12,-1-gore*3,10,9,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#414a50';ctx.fillRect(-10,9,6,12);ctx.fillRect(6,9,6,12);ctx.fillRect(-13,-7,7,12);ctx.fillRect(5,-8,7,11);
    const hornLen=action?.kind==='bullWindup'||action?.kind==='bullDash'||action?.kind==='gore'?20:14;ctx.strokeStyle='#d5d0bd';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(15,-6-gore*4);ctx.quadraticCurveTo(22,-9-gore*5,15+hornLen,-8-gore*5);ctx.moveTo(15,5-gore*4);ctx.quadraticCurveTo(22,8-gore*5,15+hornLen,7-gore*5);ctx.stroke();ctx.lineCap='butt';
    ctx.fillStyle='#11171b';ctx.beginPath();ctx.arc(16,-3-gore*3,1.4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(16,3-gore*3,1.4,0,Math.PI*2);ctx.fill();
    if(action?.kind==='bullWindup'){const q=clamp((now()-action.start)/.4,0,1);ctx.strokeStyle=`rgba(194,162,113,${.25+.55*q})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(22,-7);ctx.lineTo(38,-7);ctx.moveTo(22,7);ctx.lineTo(38,7);ctx.stroke();}
    ctx.restore();
  }
  function drawTaurusStampLog(ctx,t){
    if(!taurus?.alive||taurus.action?.kind!=='stamp')return;const def=catalogDef('blacktaurus'),cfg=def?.special?.attacks?.impedeStamp||{},a=taurus.action,target=taurusEnemyById(a.targetId);if(!target)return;const elapsed=t-a.start,t0=Number(cfg.logAppearLingerSeconds||.25),pull=Number(cfg.pullbackTravelSeconds||.15),hold=Number(cfg.pulledBackLingerSeconds||.5),slam=Number(cfg.slamTravelSeconds||.14),tp=point(target),p=taurusPoint(),dx=tp.x-p.x,dy=tp.y-p.y,len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;let x=p.x,y=p.y-27;
    if(elapsed>t0&&elapsed<=t0+pull){const q=(elapsed-t0)/pull;x-=ux*28*q;y-=uy*28*q+Math.sin(q*Math.PI)*6;}else if(elapsed>t0+pull&&elapsed<=t0+pull+hold){x-=ux*28;y-=uy*28;}else if(elapsed>t0+pull+hold){const q=clamp((elapsed-t0-pull-hold)/slam,0,1);const sx=p.x-ux*28,sy=p.y-27-uy*28;x=sx+(tp.x-sx)*q;y=sy+(tp.y-sy)*q;}
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(dy,dx));ctx.fillStyle='#55483f';ctx.strokeStyle='#827166';ctx.lineWidth=2;const w=30,h=10;ctx.beginPath();ctx.roundRect?ctx.roundRect(-w/2,-h/2,w,h,4):ctx.rect(-w/2,-h/2,w,h);ctx.fill();ctx.stroke();ctx.fillStyle='#77655a';ctx.beginPath();ctx.ellipse(-w/2,0,4,h/2,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
  }

'''
abilities = abilities.replace(marker, render_block + marker)

# Draw Taurus and HP bar.
marker = "    drawCauldronShape(ctx,cauldron,t);\n    if (wolf) {"
require_once(abilities, marker, 'Taurus draw loop insertion')
draw_insert = "    drawCauldronShape(ctx,cauldron,t);\n    drawTaurusStampLog(ctx,t);\n    if (taurus) {\n      if (taurus.alive) {\n        const p=taurusPoint(); drawTaurusShape(ctx,p.x,p.y,taurus.facing,1,taurus.action);\n        const w=48,ratio=clamp(taurus.hp/Math.max(1,taurus.maxHp),0,1);ctx.fillStyle='rgba(12,14,14,.82)';ctx.fillRect(p.x-w/2,p.y-29,w,5);ctx.fillStyle='#8a7760';ctx.fillRect(p.x-w/2,p.y-29,w*ratio,5);\n      } else {\n        const fade=Number(catalogDef('blacktaurus')?.special?.deathFadeSeconds||1.2),q=clamp((t-taurus.deadAt)/fade,0,1);if(q>=1)taurus=null;else{const p=taurusPoint();drawTaurusShape(ctx,p.x,p.y,taurus.facing,1-q,null);}\n      }\n    }\n    if (wolf) {"
abilities = abilities.replace(marker, draw_insert)

# Frame authority.
marker = "        applyWolfAggro(dt);\n        if (wolf?.alive) chooseWolfAttack();"
require_once(abilities, marker, 'Taurus frame insertion')
abilities = abilities.replace(marker, "        applyWolfAggro(dt);\n        applyTaurusAggro(dt);\n        if (wolf?.alive) chooseWolfAttack();\n        if (taurus?.alive) updateTaurus(dt);")

# Runtime inspection/testing API.
marker = "    get moonWolf() { return wolf ? { alive: wolf.alive, hp: wolf.hp, maxHp: wolf.maxHp } : null; },"
require_once(abilities, marker, 'Taurus API insertion')
abilities = abilities.replace(marker, marker + "\n    get blackTaurus() { return taurus ? { alive: taurus.alive, hp: taurus.hp, maxHp: taurus.maxHp, targetId: taurus.targetId, action: taurus.action?.kind || null, position: { ...taurus.pos } } : null; },")
marker = "    damageMoonWolf(amount, element = null) { return hurtWolf(amount, element, null); },"
require_once(abilities, marker, 'Taurus damage API insertion')
abilities = abilities.replace(marker, marker + "\n    damageBlackTaurus(amount, element = null) { return hurtTaurus(amount, element, null); },")

ABIL.write_text(abilities)

# Persistent regression contracts.
check = CHECK.read_text()
marker = "const gaia=catalog.dice.gaiacrash;"
require_once(check, marker, 'Taurus catalog regression insertion')
checks = r'''const taurus=catalog.dice.blacktaurus;
must(taurus?.name==='Black Taurus','Black Taurus display name drifted.');
must(taurus?.dpCost===20&&taurus?.element==='Earth','Black Taurus must cost 20 DP and be Earth aligned.');
must(taurus?.special?.hp===330&&taurus?.special?.attack===32&&taurus?.special?.damageReduction===0.08,'Black Taurus provisional summon stats drifted.');
must(taurus?.special?.moveSpeed===51&&taurus?.special?.moveSpeedReference==='standard-goblin-x1.5','Black Taurus must move 50% faster than a standard Goblin.');
must(taurus?.special?.target==='highest-current-hp','Black Taurus must target the enemy with the highest current HP.');
must(taurus?.special?.attacks?.windingRush?.reference==='Relentless Mace spinning skill','Winding Rush must retain its Relentless Mace spin reference.');
must(taurus?.special?.attacks?.impedeStamp?.logAppearLingerSeconds===0.25&&taurus?.special?.attacks?.impedeStamp?.pulledBackLingerSeconds===0.5,'Impede Stamp telegraph timing drifted.');
must(taurus?.special?.attacks?.impedeStamp?.stunSeconds===3.5&&taurus?.special?.attacks?.impedeStamp?.slowSeconds===0.6,'Impede Stamp Stun/Slow timing drifted.');
must(taurus?.special?.attacks?.bullRush?.hornDownWindupSeconds===0.4&&taurus?.special?.attacks?.bullRush?.dashSpeedMultiplier===2.2,'Bull Rush windup/speed drifted.');
must(taurus?.special?.attacks?.bullRush?.goreSeconds===0.4&&taurus?.special?.attacks?.bullRush?.landingStunSeconds===1,'Bull Rush gore/landing Stun timing drifted.');

'''
check = check.replace(marker, checks + marker)

marker = "for(const marker of [\n  'moonwolfsummon','gaiacrash','summonWolf'"
require_once(check, marker, 'Taurus ability marker regression insertion')
check = check.replace(marker, "for(const marker of [\n  'moonwolfsummon','gaiacrash','blacktaurus','summonWolf','summonTaurus','highestHpTarget','startTaurusWinding','startTaurusStamp','startTaurusBullRush','updateTaurus','drawTaurusShape','drawTaurusStampLog','damageBlackTaurus',")

# Gift ownership path must be present in backend source checked by overdrive suite.
marker = "must(main.includes(\"require('./overdrive-v1')\")&&main.includes('...overdrive'),'Overdrive cloud functions are not exported from main-v6.js.');"
require_once(check, marker, 'Taurus gift regression insertion')
check = check.replace(marker, marker + "\nmust(fs.readFileSync('functions/gift-v7-secure.js','utf8').includes(\"'TTD-BLACK-TAURUS'\")&&fs.readFileSync('functions/gift-v7-secure.js','utf8').includes(\"key:'blacktaurus'\"),'Black Taurus online playtest ownership grant missing.');")
CHECK.write_text(check)

print('Materialized Black Taurus Overdrive, combat brain, presentation, and online playtest grant.')
