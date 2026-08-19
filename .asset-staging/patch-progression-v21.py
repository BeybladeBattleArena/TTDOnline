from pathlib import Path

# ---- Cloud run finalization: award EXP atomically with the existing run reward. ----
p=Path('functions/singleplayer-v6.js')
s=p.read_text()
needle="const crypto = require('node:crypto');\n"
insert="const crypto = require('node:crypto');\nconst progressionV21 = require('./account-progression-core-v21');\nconst levelRewardsV21 = require('./account-progression-v21');\n"
if "account-progression-core-v21" not in s:
    if needle not in s: raise SystemExit('singleplayer crypto require marker missing')
    s=s.replace(needle,insert,1)
start=s.find('exports.finishRun = onCall')
end=s.find('\nfunction dailyEligibility',start)
if start<0 or end<0: raise SystemExit('finishRun block markers missing')
new_finish=r'''exports.finishRun = onCall({ region:REGION, timeoutSeconds:30 }, async (request) => {
  const auth = requireAuth(request);
  await ensureV6(auth);
  const runId = cleanString(request.data?.runId, 100);
  const completedWaves = clampInt(request.data?.completedWaves || 0, 0, 10000, 'Completed waves');
  const kills = clampInt(request.data?.kills || 0, 0, 200000, 'Kills');
  const coinGold = clampInt(request.data?.coinGold || 0, 0, 1000000, 'Collected Pips');
  const wave = clampInt(request.data?.wave || 0, 0, 10000, 'Wave');
  const typhoonDefeated = !!request.data?.typhoonDefeated;
  const luckBonus = Math.max(0, Math.min(0.45, Number(request.data?.luckBonus || 0)));
  const playSeconds = Math.max(0, Math.min(86400, Number(request.data?.playSeconds || 0)));
  const runRef = db.doc(`users/${auth.uid}/runs/${runId}`);
  const gameRef = db.doc(`users/${auth.uid}/game/state`);
  const levelRef = db.doc(`users/${auth.uid}/game/accountLevel`);
  const receiptRef = db.collection(`users/${auth.uid}/transactions`).doc();
  let result;
  await db.runTransaction(async (tx) => {
    const [runSnap, gameSnap, levelSnap] = await Promise.all([tx.get(runRef), tx.get(gameRef), tx.get(levelRef)]);
    if (!runSnap.exists || runSnap.data()?.status !== 'active') throw new HttpsError('failed-precondition', 'That run is no longer active.');
    const run = runSnap.data(); const game = gameSnap.data();
    const modeFamily = progressionV21.inferModeFamily(run.modeKey, run.modeFamily);
    let runPipsEarned = 0; let chestCount = 0;
    if (run.modeKey === 'adventure') {
      runPipsEarned = Math.round(wave * 10 + kills * 1.2 + coinGold + (typhoonDefeated ? 150 : 0));
      if (typhoonDefeated && ['normal','hard','hell'].includes(run.difficultyKey)) {
        chestCount = 1 + (randomFloat() < luckBonus ? 1 : 0);
        for (let i = 0; i < chestCount; i++) {
          const chestId = serverId('chest_');
          tx.set(db.doc(`users/${auth.uid}/items/${chestId}`), {
            kind:'chest', chestKey:'frozen_island', difficultyKey:run.difficultyKey,
            desc:`A sealed chest earned by clearing Al Hata on ${run.difficultyKey} difficulty. Requires a matching Chest Key to open.`,
            sourceRunId:runId, createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp(),
          });
        }
      }
    } else if (run.modeKey === 'endlesshorde') {
      runPipsEarned = Math.round(kills * 2 + playSeconds * 0.15);
    } else {
      const mult = run.modeKey === 'bossrush' ? 1.3 : run.modeKey === 'sudden' ? 1.6 : 1;
      runPipsEarned = Math.round((completedWaves * 8 + kills + coinGold) * mult);
    }
    runPipsEarned = Math.max(0, Math.min(5000000, runPipsEarned));

    const previousLevel = progressionV21.publicLevel(levelSnap.exists ? levelSnap.data() : {});
    const xpAwarded = progressionV21.calculateRunXp({
      modeKey:run.modeKey, modeFamily, difficultyKey:run.difficultyKey,
      completedWaves, kills, wave, playSeconds, typhoonDefeated,
    });
    const nextXp = Math.max(0, previousLevel.xp + xpAwarded);
    const nextLevel = progressionV21.publicLevel({ xp:nextXp });
    const levelsGained = progressionV21.levelsCrossed(previousLevel.xp, nextXp);
    const rewardEffects = levelRewardsV21._applyConfiguredLevelRewards(
      tx, auth.uid, levelsGained, levelSnap.exists ? levelSnap.data()?.claimedRewards : []
    );

    const pipsEarned = runPipsEarned + rewardEffects.pipsDelta;
    const astrasEarned = rewardEffects.astrasDelta;
    const revision = Number.isSafeInteger(game.revision) ? game.revision + 1 : 1;
    const nextEconomy = {
      pips:safePips(game) + pipsEarned,
      astras:safeAstras(game) + astrasEarned,
    };
    tx.update(gameRef, { economy:nextEconomy, revision, updatedAt:FieldValue.serverTimestamp() });
    tx.set(levelRef, {
      schemaVersion:21,
      xp:nextXp,
      level:nextLevel.level,
      claimedRewards:rewardEffects.claimedRewards,
      updatedAt:FieldValue.serverTimestamp(),
    }, { merge:true });
    tx.update(runRef, {
      status:'completed', modeFamily, completedWaves, kills, coinGold, wave, playSeconds, typhoonDefeated,
      pipsEarned:runPipsEarned, xpAwarded, levelBefore:previousLevel.level, levelAfter:nextLevel.level,
      chestCount, finishedAt:FieldValue.serverTimestamp(),
    });
    tx.set(receiptRef, {
      operation:typhoonDefeated ? 'adventure_clear' : 'run_finish',
      runId, modeKey:run.modeKey, modeFamily, pipsEarned:runPipsEarned, xpAwarded,
      levelBefore:previousLevel.level, levelAfter:nextLevel.level,
      levelRewardPips:rewardEffects.pipsDelta, levelRewardAstras:rewardEffects.astrasDelta,
      grantedLevelRewards:rewardEffects.grantedRewards, chestCount, dayKey:utcDayKey(), createdAt:FieldValue.serverTimestamp(),
    });
    result = {
      modeFamily,
      pipsEarned:runPipsEarned,
      xpAwarded,
      level:nextLevel,
      levelsGained,
      levelRewards:rewardEffects.grantedRewards,
      levelRewardPips:rewardEffects.pipsDelta,
      levelRewardAstras:rewardEffects.astrasDelta,
      chestCount,
      gameState:gamePublic({ ...game, revision, economy:nextEconomy }),
    };
  });
  return { ok:true, ...result, snapshot:await readFullSnapshot(auth.uid) };
});
'''
s=s[:start]+new_finish+s[end:]
p.write_text(s)

# ---- Deck/social reads use the same canonical level curve as run rewards. ----
p=Path('functions/deck-social-v18.js')
s=p.read_text()
needle="const crypto = require('node:crypto');\n"
insert="const crypto = require('node:crypto');\nconst progressionV21 = require('./account-progression-core-v21');\n"
if "account-progression-core-v21" not in s:
    if needle not in s: raise SystemExit('deck-social crypto require marker missing')
    s=s.replace(needle,insert,1)
s=s.replace('const LEVEL_CAP = 100;', 'const LEVEL_CAP = progressionV21.LEVEL_CAP;', 1)
start=s.find('function xpThresholdForLevel(level) {')
end=s.find('async function validateOwnedSlots',start)
if start<0 or end<0: raise SystemExit('deck-social level helper markers missing')
helpers=r'''function xpThresholdForLevel(level) { return progressionV21.xpThresholdForLevel(level); }
function levelFromXp(xp) { return progressionV21.levelFromXp(xp); }
function publicLevel(data = {}) { return progressionV21.publicLevel(data); }
async function ensureLevel(uid) {
  const ref = db.doc(`users/${uid}/game/accountLevel`);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() || {} : {};
  const level = progressionV21.publicLevel(existing);
  if (!snap.exists || existing.schemaVersion !== 21 || existing.level !== level.level) {
    await ref.set({
      schemaVersion:21,
      xp:level.xp,
      level:level.level,
      claimedRewards:Array.isArray(existing.claimedRewards) ? existing.claimedRewards : [],
      updatedAt:FieldValue.serverTimestamp(),
    }, { merge:true });
  }
  return level;
}
'''
s=s[:start]+helpers+s[end:]
s=s.replace("levelCurve: { minLevel: 1, maxLevel: LEVEL_CAP, formula: '100 * (level - 1)^2' },", "levelCurve: progressionV21.curveSummary(),", 1)
p.write_text(s)

# ---- Keep the outer-shell level manager fresh immediately after a run. ----
p=Path('online/deck-social-client-v18.js')
s=p.read_text()
marker='async function start(){\n'
listener="""window.addEventListener('ttd:account-progression-v21',(event)=>{\n  const level=event.detail;if(!level||!manager)return;\n  manager={...manager,level};syncManager();\n});\n\n"""
if listener not in s:
    if marker not in s: raise SystemExit('deck-social client start marker missing')
    s=s.replace(marker,listener+marker,1)
p.write_text(s)

# ---- Load the EXP-aware in-game result bridge. ----
p=Path('online/game-loader.js')
s=p.read_text()
old="'/online/run-ui-bridge-v6.js?v=6'"
new="'/online/run-ui-bridge-v21.js?v=21'"
if old not in s and new not in s: raise SystemExit('game-loader run-ui marker missing')
s=s.replace(old,new,1)
p.write_text(s)

# ---- Update existing regression guards to the canonical curve and v21 result bridge. ----
p=Path('scripts/check-online-loader-v15.mjs')
s=p.read_text().replace("'online/run-ui-bridge-v6.js'","'online/run-ui-bridge-v21.js'").replace("'/online/run-ui-bridge-v6.js?v=6'","'/online/run-ui-bridge-v21.js?v=21'")
p.write_text(s)

p=Path('scripts/check-deck-social-v18.mjs')
s=p.read_text()
s=s.replace("  'return step * step * 100;',\n", "  'progressionV21.publicLevel',\n  'progressionV21.curveSummary()',\n")
s=s.replace("  \"formula: '100 * (level - 1)^2'\",\n", "  'schemaVersion:21',\n")
p.write_text(s)
