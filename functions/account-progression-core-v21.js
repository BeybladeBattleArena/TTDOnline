const LEVEL_CAP = 100;
const EARLY_TOTAL_XP = Object.freeze([0,150,350,600,900,1250,1650,2100,2600,3150]);
const DIFFICULTY_XP_MULTIPLIER = Object.freeze({ normal:1, hard:1.3, hell:1.65 });

// Intentionally empty for now. Each level owns an independent reward list so future rewards can
// be attached to any account level without changing the XP curve or run-award machinery.
// Supported reward descriptors are intentionally data-shaped and extensible, e.g.
// {id:'level10-pips',kind:'currency',currency:'pips',amount:500}
// {id:'level20-title',kind:'entitlement',entitlementId:'title_x',data:{...}}
// {id:'level30-item',kind:'item',itemId:'...',data:{...}}
const LEVEL_REWARDS = Object.freeze(Object.fromEntries(
  Array.from({ length:LEVEL_CAP }, (_, index) => [index + 1, Object.freeze([])])
));

function xpToNextLevel(level) {
  const current = Math.max(1, Math.min(LEVEL_CAP, Number(level) || 1));
  if (current >= LEVEL_CAP) return 0;
  if (current <= 9) return EARLY_TOTAL_XP[current] - EARLY_TOTAL_XP[current - 1];
  const n = current - 9;
  return Math.round(550 + 20 * n + n * n);
}

function xpThresholdForLevel(level) {
  const target = Math.max(1, Math.min(LEVEL_CAP, Number(level) || 1));
  if (target <= 10) return EARLY_TOTAL_XP[target - 1];
  let total = EARLY_TOTAL_XP[9];
  for (let current = 10; current < target; current += 1) total += xpToNextLevel(current);
  return total;
}

function levelFromXp(value) {
  const xp = Number.isSafeInteger(value) && value >= 0 ? value : Math.max(0, Math.floor(Number(value) || 0));
  let level = 1;
  while (level < LEVEL_CAP && xp >= xpThresholdForLevel(level + 1)) level += 1;
  return level;
}

function publicLevel(data = {}) {
  const xp = Number.isSafeInteger(data.xp) && data.xp >= 0 ? data.xp : Math.max(0, Math.floor(Number(data.xp) || 0));
  const level = levelFromXp(xp);
  const currentLevelXp = xpThresholdForLevel(level);
  const nextLevelXp = level < LEVEL_CAP ? xpThresholdForLevel(level + 1) : null;
  return {
    schemaVersion: 21,
    level,
    xp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel: xp - currentLevelXp,
    xpNeededForNext: nextLevelXp == null ? 0 : nextLevelXp - xp,
    maxLevel: LEVEL_CAP,
  };
}

function inferModeFamily(modeKey, explicitFamily = '') {
  const explicit = String(explicitFamily || '').toLowerCase();
  if (explicit === 'adventure' || explicit === 'zombie') return explicit;
  const key = String(modeKey || '').toLowerCase();
  if (key === 'adventure' || key.startsWith('adventure') || key.includes('campaign')) return 'adventure';
  if (key === 'endlesshorde' || key.startsWith('zombie') || key.includes('zombie') || key.includes('horde')) return 'zombie';
  return 'other';
}

function calculateRunXp(run = {}) {
  const family = inferModeFamily(run.modeKey, run.modeFamily);
  const completedWaves = Math.max(0, Math.min(10000, Math.floor(Number(run.completedWaves) || 0)));
  const kills = Math.max(0, Math.min(200000, Math.floor(Number(run.kills) || 0)));
  const playSeconds = Math.max(0, Math.min(86400, Number(run.playSeconds) || 0));
  let xp = 0;

  if (family === 'adventure') {
    // Calibrated from real Normal Al Hata play: ~26 waves / 188 kills / ~390 sec => ~107 EXP.
    // Completion matters more than farming kills; a full Typhoon clear adds a meaningful bonus.
    const clearBonus = run.typhoonDefeated ? 30 : 0;
    xp = completedWaves * 2 + kills * 0.25 + Math.min(playSeconds, 1800) * 0.02 + clearBonus;
    xp *= DIFFICULTY_XP_MULTIPLIER[String(run.difficultyKey || 'normal').toLowerCase()] || 1;
  } else if (family === 'zombie') {
    // A Zombie run earns nothing before the first kill. Once kill #1 lands, retain the existing
    // calibrated Horde scale exactly: survival time + kills + the small deep-run quadratic term.
    if (kills > 0) xp = playSeconds * 0.16 + kills * 0.35 + playSeconds * playSeconds * 0.0001;
  }

  return Math.max(0, Math.min(10000, Math.round(xp)));
}

function levelsCrossed(oldXp, newXp) {
  const before = levelFromXp(oldXp);
  const after = levelFromXp(newXp);
  const levels = [];
  for (let level = before + 1; level <= after; level += 1) levels.push(level);
  return levels;
}

function configuredRewardsForLevel(level) {
  const list = LEVEL_REWARDS[level];
  return Array.isArray(list) ? list.map((reward) => JSON.parse(JSON.stringify(reward))) : [];
}

function configuredRewardsForLevels(levels = []) {
  return levels.flatMap((level) => configuredRewardsForLevel(level).map((reward) => ({ level, ...reward })));
}

function curveSummary() {
  return {
    schemaVersion: 21,
    minLevel: 1,
    maxLevel: LEVEL_CAP,
    totalXpForLevel100: xpThresholdForLevel(100),
    thresholds: Array.from({ length:LEVEL_CAP }, (_, index) => xpThresholdForLevel(index + 1)),
  };
}

module.exports = {
  LEVEL_CAP,
  LEVEL_REWARDS,
  xpToNextLevel,
  xpThresholdForLevel,
  levelFromXp,
  publicLevel,
  inferModeFamily,
  calculateRunXp,
  levelsCrossed,
  configuredRewardsForLevel,
  configuredRewardsForLevels,
  curveSummary,
};