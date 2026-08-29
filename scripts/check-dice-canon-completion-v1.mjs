import fs from 'node:fs';

const src = fs.readFileSync('random-dice-game-33.html','utf8');
const must = (needle,label)=>{if(!src.includes(needle))throw new Error(`Canon regression: ${label}`);};
const mustNot = (needle,label)=>{if(src.includes(needle))throw new Error(`Canon regression: ${label}`);};

// Materialized source must be structurally clean.
mustNot("const d = DICE[die.key]; const puMult = 1+die.pu*0.16;",'obsolete effDmg body must not survive below canonical effDmg');
mustNot("transfer:f.transfer",'obsolete recursive Fracture transfer body must not survive');

// Skyhorn sequence and cancellation canon.
must("canonFireSkyRapid(idx,die,s.shot)",'Skyhorn Rapid must receive real tile, die and shot index');
mustNot("canonFireSkyRapid(die,s)",'legacy malformed Skyhorn Rapid call must not return');
must("shot>=4-q.spread",'Skyhorn Spread must unlock on the correct Rapid shots');
must("s.cool=fired?q.post:q.post*.5",'Skyhorn target-loss cancellation must use half post-Power cooldown');
must("cool:canonSkyParams(result).post/3",'newly merged Skyhorn must begin at one-third cooldown');
mustNot("s.cool=q.post+(canonC(die)>=7?.4:0)",'C7 post-Power cooldown must not gain the obsolete +0.4s');

// Chain Lightning charge and Conductive rules.
must("function canonResolveChain(die,target)",'Chain Lightning must separate charge from discharge resolution');
must("state.canonChainCharges",'Chain Lightning must expose a charge-orb presentation state');
must("canonP(die)>=5?2.7:2.8",'P5 Chain Lightning interval improvement must be present');
must("canonApplyConductive(cur,(c>=5?3:2.5)*canonPotency(die))",'Conductive duration must use Potency');
must("case 'chainPath'",'Chain Lightning must draw actual circuit segments rather than a top-of-screen bolt');

// Smaller audited mechanical corrections.
must("base=(d.special&&d.special.kind==='canonMimic'&&canonClassForEffective(die)>=2)?11:d.dmg",'Mimic C2 damage must be 11');
must("transfer:0",'transferred Crack Fracture must not recursively self-transfer');
must("if(actual>0&&gain<1){gain=1",'Absorb tiny positive Siphons must grant at least 1 SP');
must("*canonPotency(die);cs.decayedDrSupp",'Absorb Decayed duration must use Potency');
must("overgrown=false",'Growth must track whether P6->P7 actually Overgrew');
must("p===6&&c>=6&&overgrown",'C6 P6 Growth full heal must require an Overgrowth proc');
must("lvl>0&&p>=5?.03:0",'Grace P5 must add +3pp to each Infestation damage bonus');
must("target.isTyphoon){applySlow(target,c>=5?.30:.25",'Teleport major-boss Slow must begin at 25% and reach 30% at C5');

// Hold / long-form skill correctness.
must("state.canonMaceFalls",'Relentless Mace must have a phased Macefall state');
must("canonUpdateMaceFalls(dt)",'Macefall phases must be updated in world time');
must("if(die.canon.maceBusyT>0){die.canon.maceBusyT=Math.max(0,die.canon.maceBusyT-dt);return true;}",'Macefall must pause standard attack progress during its mutex');
must("state.canonSpiderProcessions",'Grace Procession must visibly manifest before collision resolution');
must("if(!s.resolved&&s.t>=.8)",'Spider Procession must respect the 0.8s manifestation phase');
must("state.canonMarksmanVolleys",'Marksman must use a timed scan/volley state');
must("scan=c>=7?.45:c>=6?.52:c>=2?.60:.65",'Marksman scan timing ladder must match canon');
must("inter=c>=7?.09:c>=6?.10:c>=5?.11:.12",'Marksman volley cadence must match canon');

// Padlock, Golden Lion, Ace, Bases Loaded.
must("secondaryChance=c>=7?1:c>=6?.40:c>=5?.35:c>=4?.25:0",'PvE Padlock secondary chance ladder must be canonical');
must("secDur=c>=7?1.8:c>=6?1.8:c>=5?1.7:1.4",'PvE Padlock secondary duration must not copy primary duration');
must("canonKnockbackEnemy(e,kb)",'Golden Lion Roars must knock enemies back');
must("kingWidth=c>=7?4.25:c>=4?4.4:4",'Golden Lion must carry the C4 King width upgrade and C7 target');
must("form==='kick'&&c>=4&&airborne",'Ace must use its airborne fallback damage rule');
must("canonKnockbackEnemy(target,kb)",'Ace Kick must apply real knockback');
must("radius=42*(1+(c>=7?.15:0)+(p>=5?.08:0))",'Bases Loaded Grand Slam radius ladder must include C7 and P5 bonuses');
must("zones=new Map()",'Grand Slam must use strongest-zone resolution instead of double-dipping');

// Presentation contract: shared states must be visible, not just internal flags.
for(const key of ['sleep','webbed','conductive','infestation','fracture','decayed','sealed','spatial']) must(`{key:'${key}'`,`status tag ${key} must have a render definition`);
must("function drawCanonStatusAura",'modern status aura renderer must exist');
must("drawCanonStatusAura(e,p.x,p.y)",'enemy rendering must invoke modern status visuals');
must("function drawCanonWorldEffects",'persistent canon world renderer must exist');
must("drawCanonWorldEffects();",'battle renderer must invoke persistent canon effects');
must("kind==='canonLight'",'Light must render its live Radiance geometry');
must("kind==='canonGrowth'",'Growth must render Seed-to-Bloom maturation art');
for(const fx of [
  "case 'ironFall'","case 'fractureStrike'","case 'spatialBolt'","case 'mineExtract'","case 'richVein'",
  "case 'mimicMerge'","case 'jokerMask'","case 'growthBloom'","case 'snowfallCast'","case 'radiancePulse'",
  "case 'skyRapid'","case 'skyPower'","case 'widowling'","case 'undineSong'","case 'fullBloom'",
  "case 'padlockSeal'","case 'lionBeam'","case 'lionRoar'","case 'aceFlat'","case 'grandSlam'",
  "case 'pinchHit'","case 'nuclear'"
]) must(fx,`${fx} presentation must exist`);
must("canonTileStateBadge(die)",'board tiles must expose canonical build-up/hold states');
must("canonTileMotif(die)",'board tiles must expose non-text canonical motifs');
must("HOLD READY",'full hold gauges must be visibly announced');

console.log('Dice canon completion regression guard passed.');
