import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
function mustReplace(source,needle,replacement,label){
  if(!source.includes(needle)) throw new Error(`Missing ${label}`);
  const next=source.replace(needle,replacement);
  if(next===source) throw new Error(`Could not replace ${label}`);
  return next;
}
function mustReplaceRe(source,re,replacement,label){
  re.lastIndex=0;
  if(!re.test(source)) throw new Error(`Missing ${label}`);
  re.lastIndex=0;
  const next=source.replace(re,replacement);
  if(next===source) throw new Error(`Could not replace ${label}`);
  return next;
}

const gamePath='random-dice-game-33.html';
let game=read(gamePath);

game=mustReplace(game,
  'family=Inter:wght@400;600;700&family=Creepster&display=swap',
  'family=Inter:wght@400;600;700&family=Creepster&family=Russo+One&display=swap',
  'Russo One canonical font link');

game=mustReplace(game,
  "  #gameOverlay .goldline{font-family:'Space Mono',monospace; color:var(--gold-glow); font-size:15px;}\n",
  `  #gameOverlay .goldline{font-family:'Space Mono',monospace; color:var(--gold-glow); font-size:15px;}\n  .resultTallies{width:min(100%,330px);display:flex;flex-direction:column;gap:5px;margin:2px auto;}\n  .resultTallyRow{min-height:30px;display:flex;align-items:baseline;justify-content:center;gap:10px;font-family:'Russo One',sans-serif;line-height:1.15;text-align:center;}\n  .resultTallyLabel{min-width:52px;text-align:right;font-size:17px;font-weight:400;letter-spacing:.045em;color:transparent;background:linear-gradient(180deg,#f6d77f 0%,#e5b64d 31%,#e27827 50%,#e5b64d 69%,#f6d77f 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 1px 0 rgba(51,31,8,.88)) drop-shadow(0 0 4px rgba(226,150,48,.18));}\n  .resultTallyValue{font-size:18px;font-weight:400;color:#fff;-webkit-text-fill-color:#fff;letter-spacing:.02em;}\n  .resultTallyNotes{display:inline-flex;align-items:baseline;gap:6px;}\n  .resultTallyNote{font-size:13px;font-weight:400;color:#fff;-webkit-text-fill-color:#fff;white-space:nowrap;}\n  .resultLevelUp{min-height:12px;margin:-1px auto 3px;color:#d4ecfa;font:400 10px 'Russo One',sans-serif;text-align:center;letter-spacing:.035em;}\n`,
  'native result tally CSS');

game=mustReplace(game,
  '      <div class="goldline" id="overlayGold"></div>\n      <button id="overlayBtn">Continue</button>',
  `      <div class="resultTallies" id="overlayTallies">\n        <div class="resultTallyRow"><span class="resultTallyLabel">PIPS</span><span class="resultTallyValue" id="overlayPipsValue">0</span><span class="resultTallyNotes" id="overlayPipsNotes"></span></div>\n        <div class="resultTallyRow"><span class="resultTallyLabel">EXP</span><span class="resultTallyValue" id="overlayExpValue">…</span><span class="resultTallyNotes" id="overlayExpNotes"></span></div>\n        <div class="resultLevelUp" id="overlayLevelUp"></div>\n      </div>\n      <button id="overlayBtn">Continue</button>`,
  'native result tally markup');

const lifecycleMarker='  /* ============================ MATCH LIFECYCLE ============================ */';
const nativeHelpers=`  /* ============================ CANONICAL RESULT / OUTCOME V35 ============================ */\n  const TTD_NATIVE_RESULT_VERSION = 35;\n  function nativeRewardNum(value){ return Math.max(0, Math.round(Number(value)||0)); }\n  function nativeRewardPct(value){ return Math.max(0, Math.min(10000, Number(value)||0)); }\n  function nativeBonusPercent(kind){\n    const roots=[window.__TTD_AVATAR_REWARD_BONUSES,account?.avatarRewardBonuses,account?.rewardBonuses,account?.equipmentBonuses,account?.avatar?.rewardBonuses].filter(v=>v&&typeof v==='object');\n    const keys=kind==='pips'?['pipsPct','pipPct','bonusPipsPct','bonusPipPct','pipsBonusPercent','pipBonusPercent']:['expPct','xpPct','bonusExpPct','bonusXpPct','expBonusPercent','xpBonusPercent'];\n    let total=0;for(const root of roots){for(const key of keys){const value=Number(root[key]);if(Number.isFinite(value)&&value>0){total+=value;break;}}}return nativeRewardPct(total);\n  }\n  function nativeAdventureXp(completedWaves){\n    if(!state?.adventure)return 0;const waves=Math.max(0,Number(completedWaves)||0),kills=Math.max(0,Number(state.kills)||0),seconds=Math.max(0,Number(state.zPlayTime||state.time)||0);\n    let xp=waves*2+kills*.25+Math.min(seconds,1800)*.02+(state.typhoonDefeated?30:0);xp*=({normal:1,hard:1.3,hell:1.65}[String(state.adventureDiffKey||'normal').toLowerCase()]||1);return Math.max(0,Math.min(10000,Math.round(xp)));\n  }\n  function captureNativeRewardMeta(){\n    const rewards=state?.__ttdPlatformRewards||{},expOrbs=Math.max(0,Math.floor(Number(rewards.expOrbs)||0)),credits=Math.max(0,Math.floor(Number(rewards.bonusWaveCredits)||0)),completed=Math.max(0,Number(state?.completedWaves)||0);\n    const expOrbBonusXp=state?.adventure&&credits>0?Math.max(0,nativeAdventureXp(completed)-nativeAdventureXp(Math.max(0,completed-credits))):0;\n    return {expOrbs,expOrbBonusXp,pipsBonusPct:nativeBonusPercent('pips'),expBonusPct:nativeBonusPercent('exp')};\n  }\n  function nativeNotesHtml(orbBonus,bonusPct){let html='';if(nativeRewardNum(orbBonus)>0)html+='<span class="resultTallyNote">(+'+nativeRewardNum(orbBonus)+')</span>';if(nativeRewardPct(bonusPct)>0)html+='<span class="resultTallyNote">(+'+nativeRewardPct(bonusPct).toLocaleString(undefined,{maximumFractionDigits:2})+'%)</span>';return html;}\n  function renderNativeTallies({pips,xp=null,meta=null,zombie=false,level=null,levelsGained=[]}={}){\n    meta=meta||state?.__ttdEndRewardMeta||captureNativeRewardMeta();const prefix=zombie?'zSummary':'overlay';\n    const pipsValue=document.getElementById(prefix+'PipsValue'),pipsNotes=document.getElementById(prefix+'PipsNotes'),expValue=document.getElementById(prefix+'ExpValue'),expNotes=document.getElementById(prefix+'ExpNotes');\n    if(pipsValue)pipsValue.textContent=nativeRewardNum(pips).toLocaleString();if(pipsNotes)pipsNotes.innerHTML=nativeNotesHtml(0,meta.pipsBonusPct);\n    if(expValue)expValue.textContent=xp==null?'…':nativeRewardNum(xp).toLocaleString();if(expNotes)expNotes.innerHTML=nativeNotesHtml(meta.expOrbBonusXp,meta.expBonusPct);\n    if(!zombie){const levelNode=document.getElementById('overlayLevelUp');if(levelNode)levelNode.textContent=Array.isArray(levelsGained)&&levelsGained.length&&level?.level?'LEVEL UP! Lv.'+nativeRewardNum(level.level):'';}\n  }\n  function applyVerifiedRunResultV35(result){\n    if(!result||typeof result!=='object')return;const zombie=String(result.modeFamily||'')==='zombie';renderNativeTallies({pips:result.pipsEarned,xp:result.xpAwarded,meta:state?.__ttdEndRewardMeta||captureNativeRewardMeta(),zombie,level:result.level,levelsGained:result.levelsGained});\n    if(Number(result.chestCount||0)>0){const text=document.getElementById('overlayText');if(text)text.textContent='Al Hata is cleared! '+(Number(result.chestCount)===1?'A Frozen Island Chest has':Number(result.chestCount)+' Frozen Island Chests have')+' been added to your inventory.';}\n  }\n  window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35=applyVerifiedRunResultV35;\n  window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent)return;const m=event.data||{};if(m.type==='ttd:v6-run-finish-result')applyVerifiedRunResultV35(m);});\n  function revealAdventureNative(){overlay.classList.add('ttdResultCardV1');void overlay.offsetWidth;overlay.classList.add('show');}\n  function nativeOutcome(kind,reveal){\n    if(!state||state.__ttdOutcomeCommitted)return false;state.__ttdOutcomeCommitted=true;\n    const presentation=window.TTDGamePresentation;\n    if(presentation?.presentOutcome){presentation.presentOutcome(kind,{reveal,delay:1850});return true;}\n    try{window.parent?.postMessage({type:'ttd:voice-cue',cue:kind==='clear'?'clear':kind==='finish'?'finish':'fail'},location.origin);}catch(_){}\n    setTimeout(reveal,kind==='fail'?3050:1850);return true;\n  }\n\n`;
game=mustReplace(game,lifecycleMarker,nativeHelpers+lifecycleMarker,'canonical result/outcome helpers');

const newEndMatch=`  function endMatch(reason){\n    if(!state || state.__ttdOutcomeCommitted) return;\n    state.running = false;\n    state.__ttdEndRewardMeta = captureNativeRewardMeta();\n    const goldEarned = Math.round(((state.completedWaves||0)*8 + state.kills + (state.coinGold||0)) * state.cfg.rewardMult);\n    account.gold += goldEarned; saveAccount();\n    const titles = {voluntary:'Run Complete', defeat:'The Gate Has Fallen', wipeout:'Your Dice Have Fallen'};\n    const texts = {voluntary:'You called it before the gate could fall.',defeat:'Your dice held the line as long as they could.',wipeout:'Every die was destroyed, and none remained to summon.'};\n    document.getElementById('overlayTitle').textContent = titles[reason] || titles.defeat;\n    document.getElementById('overlayText').textContent = texts[reason] || texts.defeat;\n    document.getElementById('overlayStats').textContent = 'Reached Wave '+state.wave+' · '+state.kills+' kills';\n    renderNativeTallies({pips:goldEarned,xp:null,meta:state.__ttdEndRewardMeta});\n    overlay.classList.remove('show');\n    const normalized=String(reason||'').toLowerCase(),kind=normalized==='voluntary'?'finish':(normalized==='victory'||normalized==='clear'?'clear':'fail');\n    nativeOutcome(kind,revealAdventureNative);\n  }`;
game=mustReplaceRe(game,/  function endMatch\(reason\)\{[\s\S]*?\n  \}\n  function stageCleared\(\)\{/m,newEndMatch+'\n  function stageCleared(){','canonical endMatch');

const newCampaign=`  function campaignComplete(){\n    if(!state || state.__ttdOutcomeCommitted) return;\n    state.running = false;\n    state.__ttdEndRewardMeta = captureNativeRewardMeta();\n    const goldEarned = Math.round(state.wave*10 + state.kills*1.2 + (state.coinGold||0) + (state.typhoonDefeated?150:0));\n    account.gold += goldEarned;\n    let bonusChest = false;\n    if(state.typhoonDefeated && state.adventureDiffKey){awardChest(state.adventureDiffKey);if(Math.random() < getBonusChestChance()){awardChest(state.adventureDiffKey);bonusChest = true;}}\n    saveAccount();\n    document.getElementById('overlayTitle').textContent = state.typhoonDefeated ? 'Typhoon Has Fallen' : 'Stage Cleared!';\n    document.getElementById('overlayText').textContent = state.typhoonDefeated ? ('Al Hata is cleared! ' + (bonusChest ? 'Two Frozen Island Chests have' : 'A Frozen Island Chest has') + ' been added to your inventory.') : (state.adventureStage.name + ' complete.');\n    document.getElementById('overlayStats').textContent = state.kills+' kills · '+(state.coinGold||0)+' Pips collected';\n    renderNativeTallies({pips:goldEarned,xp:null,meta:state.__ttdEndRewardMeta});\n    overlay.classList.remove('show');\n    nativeOutcome('clear',()=>{revealAdventureNative();if(state.typhoonDefeated && state.adventureDiffKey)setTimeout(()=>showRewardPopup(state.adventureDiffKey),450);});\n  }`;
game=mustReplaceRe(game,/  function campaignComplete\(\)\{[\s\S]*?\n  \}\n  document\.getElementById\('overlayBtn'\)/m,newCampaign+"\n  document.getElementById('overlayBtn')",'canonical campaignComplete');

const newHorde=`  function endEndlessHorde(){\n    if(!state?.running || state.__ttdOutcomeCommitted) return;\n    state.running = false;\n    state.__ttdEndRewardMeta = captureNativeRewardMeta();\n    const pipsEarned = Math.round(state.kills*2 + state.zPlayTime*0.15);\n    account.gold += pipsEarned; saveAccount();\n    nativeOutcome('finish',()=>showZombieSummary(pipsEarned));\n  }`;
game=mustReplaceRe(game,/  function endEndlessHorde\(\)\{[\s\S]*?\n  \}\n  function showZombieSummary\(pipsEarned\)\{/m,newHorde+'\n  function showZombieSummary(pipsEarned){','canonical Endless Horde end');

game=mustReplace(game,
  '      <div class="goldPill" style="margin:14px auto 4px;">+${pipsEarned}</div>\n      <button class="closeBtn" id="zSummaryOkBtn" style="margin-top:8px;">Return Home</button>',
  `      <div class="resultTallies" id="zSummaryTallies" style="margin-top:12px;">\n        <div class="resultTallyRow"><span class="resultTallyLabel">PIPS</span><span class="resultTallyValue" id="zSummaryPipsValue">\${nativeRewardNum(pipsEarned).toLocaleString()}</span><span class="resultTallyNotes" id="zSummaryPipsNotes"></span></div>\n        <div class="resultTallyRow"><span class="resultTallyLabel">EXP</span><span class="resultTallyValue" id="zSummaryExpValue">…</span><span class="resultTallyNotes" id="zSummaryExpNotes"></span></div>\n      </div>\n      <button class="closeBtn" id="zSummaryOkBtn" style="margin-top:8px;">Return Home</button>`,
  'canonical zombie tally markup');

game=mustReplace(game,
  "    document.getElementById('zSummaryOkBtn').addEventListener('click', ()=>{",
  "    renderNativeTallies({pips:pipsEarned,xp:null,meta:state.__ttdEndRewardMeta,zombie:true});\n    document.getElementById('zSummaryOkBtn').addEventListener('click', ()=>{",
  'canonical zombie local tally render');
write(gamePath,game);

const presentationPath='online/game-presentation-v1.js';
let presentation=read(presentationPath);
presentation=mustReplace(presentation,
  "  function installAll(){if(typeof startGame==='function')bindStart('startGame',()=>startGame,fn=>{startGame=fn;});if(typeof startAdventure==='function')bindStart('startAdventure',()=>startAdventure,fn=>{startAdventure=fn;});if(typeof startAdventureCampaign==='function')bindStart('startAdventureCampaign',()=>startAdventureCampaign,fn=>{startAdventureCampaign=fn;});if(typeof startEndlessHorde==='function')bindStart('startEndlessHorde',()=>startEndlessHorde,fn=>{startEndlessHorde=fn;});installSummaryWrapper();decorateAdventureResult();installOutcomeFlows();scanLegacyMissionNodes();}",
  "  function installAll(){if(typeof startGame==='function')bindStart('startGame',()=>startGame,fn=>{startGame=fn;});if(typeof startAdventure==='function')bindStart('startAdventure',()=>startAdventure,fn=>{startAdventure=fn;});if(typeof startAdventureCampaign==='function')bindStart('startAdventureCampaign',()=>startAdventureCampaign,fn=>{startAdventureCampaign=fn;});if(typeof startEndlessHorde==='function')bindStart('startEndlessHorde',()=>startEndlessHorde,fn=>{startEndlessHorde=fn;});decorateAdventureResult();scanLegacyMissionNodes();}",
  'presentation canonical ownership');
write(presentationPath,presentation);

const entryPath='online/singleplayer-client-v6.js';
let entry=read(entryPath);
entry=mustReplace(entry,"import './result-summary-client-v26.js?v=26';\n",'', 'stale result summary import');
entry=mustReplace(entry,"import './result-reward-polish-v1.js?v=1';\n",'', 'downstream reward polish import');
entry=mustReplace(entry,"import './audio-client-v27.js?v=32';","import './audio-client-v27.js?v=33';",'audio v33 import');
write(entryPath,entry);

const continuousPath='online/adventure-continuous-world-v1.js';
let continuous=read(continuousPath);
continuous=mustReplaceRe(continuous,/\n  async function ensureRewardMetaV1\(\)\{[\s\S]*?\n  \}\n\n  ensurePresentationV6\(\);\n  ensureRewardMetaV1\(\);\n  ensureSameMapBattleV6\(\);/,"\n\n  ensurePresentationV6();\n  ensureSameMapBattleV6();",'downstream reward meta wrapper removal');
write(continuousPath,continuous);

const runUiPath='online/run-ui-bridge-v21.js';
let runUi=read(runUiPath);
const runUiReplacement="  window.addEventListener('message',(event)=>{\n"+
  "    if(event.origin!==ORIGIN||event.source!==window.parent)return;\n"+
  "    const m=event.data||{};if(m.type!=='ttd:v6-run-finish-result')return;\n"+
  "    window.__TTD_APPLY_VERIFIED_RUN_RESULT_V35?.(m);\n"+
  "    const count=Number(m.chestCount||0);if(count>0){const text=document.getElementById('overlayText');if(text)text.textContent='Al Hata is cleared! '+(count===1?'A Frozen Island Chest has':count+' Frozen Island Chests have')+' been added to your inventory.';}\n"+
  "  });\n\n  function requiredReplace(source,needle,replacement,label){";
runUi=mustReplaceRe(runUi,/  function expText\(m\)\{[\s\S]*?\n\n  function requiredReplace\(source,needle,replacement,label\)\{/m,runUiReplacement,'run bridge canonical result forwarding');
write(runUiPath,runUi);

const audioPath='online/audio-client-v27.js';
let audio=read(audioPath);
audio=mustReplace(audio,"fail:asset('/assets/audio/announcer/MissionFail.mp3')","fail:asset('/assets/audio/announcer/MissionFail.wav')",'MissionFail WAV mapping');
write(audioPath,audio);

const loaderPath='online/game-loader.js';
let loader=read(loaderPath);
loader=mustReplace(loader,"const GAME_PATH='/random-dice-game-33.html?v=34';","const GAME_PATH='/random-dice-game-33.html?v=35';",'canonical game cache version');
write(loaderPath,loader);

const onlinePath='online.html';
let online=read(onlinePath);
online=mustReplace(online,'href="/random-dice-game-33.html?v=33"','href="/random-dice-game-33.html?v=35"','canonical preload version');
write(onlinePath,online);

console.log('Canonical result/outcome v35 materialized into random-dice-game-33.html and competing downstream result wrappers disabled.');
