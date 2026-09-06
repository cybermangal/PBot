const NO_KEY_REQUIRED_BOSS_IDS = new Set([
  1,
  9,
  32,
  39,
]);

const REQUIRED_KEYS_BY_BOSS = {
  1: 1,
  2: 3,
  3: 3,
  4: 3,
  5: 1,
  6: 1,
  7: 1,
  8: 1,
  9: 1,
  10: 3,
  11: 1,
  12: 3,
  13: 3,
  14: 1,
  15: 1,
  16: 1,
  17: 3,
  18: 1,
  19: 2,
  20: 1,
  21: 2,
  22: 3,
  23: 3,
  24: 3,
  25: 1,
  26: 3,
  27: 3,
  28: 1,
  29: 1,
  30: 1,
  31: 1,
  32: 1,
  33: 3,
  34: 3,
  35: 1,
  36: 3,
};

const KEY_SOURCE_BOSS_BY_TARGET = {
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  9: 1,
  10: 9,
  11: 10,
  12: 11,
  13: 12,
  14: 13,
  15: 14,
  16: 15,
  17: 8,
  18: 16,
  19: 19,
  20: 15,
  21: 5,
  22: 15,
  23: 5,
  24: 15,
  25: 8,
  26: 5,
  27: 5,
  28: 15,
  29: 25,
  30: 11,
  31: 17,
  33: 32,
  34: 32,
  35: 34,
  36: 32,
};

const RANDOM_PRISON_SOURCE_TARGET_BOSS_IDS = new Set([
  19,
]);
const BUYABLE_KEY_TARGET_BOSS_IDS = new Set([
  2,
  3,
  4,
  10,
  11,
  12,
]);

// The game returns this configuration as `damageScaling.keyBonusThresholds`
// after `/api/boss/start-attack`. Tiers are based on personal damage, not on
// the boss's remaining HP or the battle mode. The regular reward is one key;
// the first tier grants one extra key and the second grants two extra keys.
const BOSS_DAMAGE_BONUS_KEY_TIERS_BY_BOSS_ID = Object.freeze({
  1: Object.freeze([{ personalDamage: 210, rewardKeys: 2 }, { personalDamage: 700, rewardKeys: 3 }]),
  2: Object.freeze([{ personalDamage: 3000, rewardKeys: 2 }, { personalDamage: 10000, rewardKeys: 3 }]),
  3: Object.freeze([{ personalDamage: 9000, rewardKeys: 2 }, { personalDamage: 30000, rewardKeys: 3 }]),
  4: Object.freeze([{ personalDamage: 15000, rewardKeys: 2 }, { personalDamage: 50000, rewardKeys: 3 }]),
  5: Object.freeze([{ personalDamage: 21000, rewardKeys: 2 }, { personalDamage: 70000, rewardKeys: 3 }]),
  9: Object.freeze([{ personalDamage: 15000, rewardKeys: 2 }, { personalDamage: 50000, rewardKeys: 3 }]),
  10: Object.freeze([{ personalDamage: 16500, rewardKeys: 2 }, { personalDamage: 55000, rewardKeys: 3 }]),
  11: Object.freeze([{ personalDamage: 16500, rewardKeys: 2 }, { personalDamage: 55000, rewardKeys: 3 }]),
  12: Object.freeze([{ personalDamage: 21000, rewardKeys: 2 }, { personalDamage: 70000, rewardKeys: 3 }]),
  13: Object.freeze([{ personalDamage: 30000, rewardKeys: 2 }, { personalDamage: 100000, rewardKeys: 3 }]),
});

// Kept as a compact compatibility view for callers that only need the
// maximum possible reward from a completed qualifying run.
const QUALIFIED_KEY_REWARD_BY_BOSS_ID = Object.freeze({
  1: 3,
  2: 3,
  3: 3,
  4: 3,
  5: 3,
  9: 3,
  10: 3,
  11: 3,
  12: 3,
  13: 3,
});

const DEFAULT_REQUIRED_KEYS = 3;

function toBossId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isNoKeyRequiredBoss(bossId) {
  const normalizedBossId = toBossId(bossId);
  return normalizedBossId !== null && NO_KEY_REQUIRED_BOSS_IDS.has(normalizedBossId);
}

function getDeclaredKeySourceBossId(boss) {
  if (!boss || typeof boss !== "object") {
    return null;
  }

  const keyRequirement = boss.keyRequirement && typeof boss.keyRequirement === "object"
    ? boss.keyRequirement
    : {};
  const sourceBossId = toBossId(
    keyRequirement.requiredFromBossId
    ?? keyRequirement.sourceBossId
    ?? keyRequirement.keySourceBossId
    ?? boss.requiredFromBossId
    ?? boss.sourceBossId
    ?? boss.keySourceBossId,
  );
  return sourceBossId !== null && sourceBossId > 0 ? sourceBossId : null;
}

function getDeclaredRequiredKeysForAttack(boss) {
  if (!boss || typeof boss !== "object") {
    return null;
  }

  const keyRequirement = boss.keyRequirement && typeof boss.keyRequirement === "object"
    ? boss.keyRequirement
    : {};
  const requiredKeys = Number(
    keyRequirement.requiredKeyCount
    ?? keyRequirement.requiredKeys
    ?? keyRequirement.count
    ?? boss.requiredKeyCount
    ?? boss.requiredKeys,
  );
  return Number.isFinite(requiredKeys) && requiredKeys >= 0 ? requiredKeys : null;
}

function getPersistedKeySourceBossId(boss) {
  if (!boss || typeof boss !== "object") {
    return null;
  }

  const keyRequirement = boss.persistedKeyRequirement && typeof boss.persistedKeyRequirement === "object"
    ? boss.persistedKeyRequirement
    : {};
  const sourceBossId = toBossId(keyRequirement.requiredFromBossId ?? keyRequirement.sourceBossId);
  return sourceBossId !== null && sourceBossId > 0 ? sourceBossId : null;
}

function getPersistedRequiredKeysForAttack(boss) {
  if (!boss || typeof boss !== "object") {
    return null;
  }

  const keyRequirement = boss.persistedKeyRequirement && typeof boss.persistedKeyRequirement === "object"
    ? boss.persistedKeyRequirement
    : {};
  const requiredKeys = Number(keyRequirement.requiredKeyCount ?? keyRequirement.requiredKeys);
  return Number.isFinite(requiredKeys) && requiredKeys >= 0 ? requiredKeys : null;
}

function getCatalogBoss(targetBossId, catalogBosses = []) {
  const normalizedBossId = toBossId(targetBossId);
  if (normalizedBossId === null || !Array.isArray(catalogBosses)) {
    return null;
  }
  return catalogBosses.find((boss) => toBossId(boss && boss.id) === normalizedBossId) || null;
}

function getRequiredKeysForAttack(bossId, catalogBosses = []) {
  const normalizedBossId = toBossId(bossId);
  if (normalizedBossId === null) {
    return null;
  }

  if (isNoKeyRequiredBoss(normalizedBossId)) {
    return 0;
  }

  const declaredRequiredKeys = getDeclaredRequiredKeysForAttack(
    getCatalogBoss(normalizedBossId, catalogBosses),
  );
  if (declaredRequiredKeys !== null) {
    return declaredRequiredKeys;
  }

  const persistedRequiredKeys = getPersistedRequiredKeysForAttack(
    getCatalogBoss(normalizedBossId, catalogBosses),
  );
  if (persistedRequiredKeys !== null) {
    return persistedRequiredKeys;
  }

  if (Object.prototype.hasOwnProperty.call(REQUIRED_KEYS_BY_BOSS, normalizedBossId)) {
    return Number(REQUIRED_KEYS_BY_BOSS[normalizedBossId]);
  }

  return DEFAULT_REQUIRED_KEYS;
}

function getKeySourceBossId(targetBossId) {
  const normalizedBossId = toBossId(targetBossId);
  if (normalizedBossId === null || isNoKeyRequiredBoss(normalizedBossId)) {
    return null;
  }

  if (!Object.prototype.hasOwnProperty.call(KEY_SOURCE_BOSS_BY_TARGET, normalizedBossId)) {
    return null;
  }

  const sourceBossId = Number(KEY_SOURCE_BOSS_BY_TARGET[normalizedBossId]);
  return Number.isFinite(sourceBossId) ? sourceBossId : null;
}

function getBossKeyRewardCount(boss) {
  if (!boss || typeof boss !== "object") {
    return 0;
  }

  const value = boss.globalReward && boss.globalReward.keys !== undefined
    ? boss.globalReward.keys
    : boss.keys && boss.keys.rewardPerWin !== undefined
      ? boss.keys.rewardPerWin
      : 0;
  return Math.max(0, Number(value) || 0);
}

function getBossDamageBonusKeyTiers(bossId, baseRewardKeys = 0) {
  const normalizedBossId = toBossId(bossId);
  const baseReward = Math.max(0, Number(baseRewardKeys) || 0);
  if (normalizedBossId === null) {
    return [];
  }

  const tiers = BOSS_DAMAGE_BONUS_KEY_TIERS_BY_BOSS_ID[normalizedBossId];
  if (!Array.isArray(tiers)) {
    return [];
  }

  return tiers
    .map((tier) => ({
      personalDamage: Math.max(0, Number(tier && tier.personalDamage) || 0),
      rewardKeys: Math.max(baseReward, Number(tier && tier.rewardKeys) || 0),
    }))
    .filter((tier) => tier.personalDamage > 0 && tier.rewardKeys > baseReward)
    .sort((left, right) => left.personalDamage - right.personalDamage);
}

function getBossKeyRewardForPersonalDamage(bossId, personalDamage, baseRewardKeys = 0) {
  const baseReward = Math.max(0, Number(baseRewardKeys) || 0);
  const normalizedDamage = Math.max(0, Number(personalDamage) || 0);
  return getBossDamageBonusKeyTiers(bossId, baseReward)
    .filter((tier) => normalizedDamage >= tier.personalDamage)
    .reduce((reward, tier) => Math.max(reward, tier.rewardKeys), baseReward);
}

function getQualifiedBossKeyRewardCount(bossId, baseRewardKeys = 0) {
  const baseReward = Math.max(0, Number(baseRewardKeys) || 0);
  return getBossDamageBonusKeyTiers(bossId, baseReward)
    .reduce((reward, tier) => Math.max(reward, tier.rewardKeys), baseReward);
}

function getBossDamageBonusKeyCount(bossId, baseRewardKeys = 0) {
  const baseReward = Math.max(0, Number(baseRewardKeys) || 0);
  return Math.max(0, getQualifiedBossKeyRewardCount(bossId, baseReward) - baseReward);
}

function getBossOrderValue(boss) {
  const sortIndex = Number(boss && boss.sortIndex);
  if (Number.isFinite(sortIndex)) {
    return sortIndex;
  }

  const bossId = toBossId(boss && boss.id);
  return bossId === null ? Number.POSITIVE_INFINITY : bossId;
}

// The game only returns a map of key balances in `bootstrap`; it does not
// return the relationship between a boss and the key it consumes. Keep the
// exceptional historical chains above, then derive new ordinary chains from
// the live catalog: a new boss consumes keys from the latest earlier boss in
// its category that actually awards keys.
function resolveKeySourceBoss(targetBossId, catalogBosses = []) {
  const normalizedBossId = toBossId(targetBossId);
  if (normalizedBossId !== null && isNoKeyRequiredBoss(normalizedBossId)) {
    return {
      sourceBossId: null,
      resolution: "not_required",
    };
  }

  const targetBoss = getCatalogBoss(normalizedBossId, catalogBosses);
  const declaredSourceBossId = getDeclaredKeySourceBossId(targetBoss);
  if (declaredSourceBossId !== null) {
    return {
      sourceBossId: declaredSourceBossId,
      resolution: "game_declared",
    };
  }

  const persistedSourceBossId = getPersistedKeySourceBossId(targetBoss);
  if (persistedSourceBossId !== null) {
    return {
      sourceBossId: persistedSourceBossId,
      resolution: "persisted_snapshot",
    };
  }

  const configuredSourceBossId = getKeySourceBossId(normalizedBossId);
  if (configuredSourceBossId !== null) {
    return {
      sourceBossId: configuredSourceBossId,
      resolution: "configured",
    };
  }

  if (normalizedBossId === null || !Array.isArray(catalogBosses)) {
    return {
      sourceBossId: null,
      resolution: "unresolved",
    };
  }

  const targetCategoryId = Number(targetBoss && targetBoss.categoryId);
  const targetOrder = getBossOrderValue(targetBoss);
  if (!targetBoss || !Number.isFinite(targetCategoryId) || !Number.isFinite(targetOrder)) {
    return {
      sourceBossId: null,
      resolution: "unresolved",
    };
  }

  const sourceBoss = catalogBosses
    .filter((boss) => {
      const bossId = toBossId(boss && boss.id);
      return (
        bossId !== null
        && bossId !== normalizedBossId
        && Number(boss && boss.categoryId) === targetCategoryId
        && getBossOrderValue(boss) < targetOrder
        && getBossKeyRewardCount(boss) > 0
      );
    })
    .sort((left, right) => {
      const orderDiff = getBossOrderValue(right) - getBossOrderValue(left);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return Number(right.id) - Number(left.id);
    })[0] || null;

  return {
    sourceBossId: sourceBoss ? toBossId(sourceBoss.id) : null,
    resolution: sourceBoss ? "inferred_from_catalog" : "unresolved",
  };
}

function isPrisonKeySourceTargetBoss(targetBossId) {
  const normalizedBossId = toBossId(targetBossId);
  return normalizedBossId !== null && RANDOM_PRISON_SOURCE_TARGET_BOSS_IDS.has(normalizedBossId);
}

function canBuyKeysForBoss(targetBossId) {
  const normalizedBossId = toBossId(targetBossId);
  return normalizedBossId !== null && BUYABLE_KEY_TARGET_BOSS_IDS.has(normalizedBossId);
}

function getKeySourceLabelForBoss(targetBossId, sourceBossId, sourceBossTitle) {
  if (isPrisonKeySourceTargetBoss(targetBossId)) {
    return "in prisons";
  }

  if (sourceBossTitle) {
    return `from boss: ${sourceBossTitle}`;
  }

  if (sourceBossId !== null && sourceBossId !== undefined) {
    return `from boss #${sourceBossId}`;
  }

  return null;
}

function getSourceOwnedKeys(keyMap, sourceBossId) {
  if (sourceBossId === null || sourceBossId === undefined) {
    return 0;
  }

  if (!keyMap || typeof keyMap !== "object") {
    return 0;
  }

  return Math.max(0, Number(keyMap[sourceBossId] || 0));
}

module.exports = {
  BOSS_DAMAGE_BONUS_KEY_TIERS_BY_BOSS_ID,
  BUYABLE_KEY_TARGET_BOSS_IDS,
  DEFAULT_REQUIRED_KEYS,
  KEY_SOURCE_BOSS_BY_TARGET,
  NO_KEY_REQUIRED_BOSS_IDS,
  QUALIFIED_KEY_REWARD_BY_BOSS_ID,
  RANDOM_PRISON_SOURCE_TARGET_BOSS_IDS,
  REQUIRED_KEYS_BY_BOSS,
  canBuyKeysForBoss,
  getBossDamageBonusKeyCount,
  getBossDamageBonusKeyTiers,
  getDeclaredKeySourceBossId,
  getDeclaredRequiredKeysForAttack,
  getPersistedKeySourceBossId,
  getPersistedRequiredKeysForAttack,
  getQualifiedBossKeyRewardCount,
  getKeySourceBossId,
  getKeySourceLabelForBoss,
  getBossKeyRewardForPersonalDamage,
  getRequiredKeysForAttack,
  getSourceOwnedKeys,
  isNoKeyRequiredBoss,
  isPrisonKeySourceTargetBoss,
  resolveKeySourceBoss,
};
