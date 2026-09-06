const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BOSS_DAMAGE_BONUS_KEY_TIERS_BY_BOSS_ID,
  getBossDamageBonusKeyCount,
  getBossDamageBonusKeyTiers,
  getBossKeyRewardForPersonalDamage,
  getQualifiedBossKeyRewardCount,
  getRequiredKeysForAttack,
  resolveKeySourceBoss,
} = require("../lib/boss-keys");

test("qualified personal damage follows the live bonus-key thresholds", () => {
  const bonusBossIds = [1, 2, 3, 4, 5, 9, 10, 11, 12, 13];
  assert.deepEqual(Object.keys(BOSS_DAMAGE_BONUS_KEY_TIERS_BY_BOSS_ID).map(Number), bonusBossIds);

  for (const bossId of bonusBossIds) {
    const tiers = getBossDamageBonusKeyTiers(bossId, 1);
    assert.equal(tiers.length, 2);
    assert.equal(getBossKeyRewardForPersonalDamage(bossId, tiers[0].personalDamage - 1, 1), 1);
    assert.equal(getBossKeyRewardForPersonalDamage(bossId, tiers[0].personalDamage, 1), 2);
    assert.equal(getBossKeyRewardForPersonalDamage(bossId, tiers[1].personalDamage, 1), 3);
    assert.equal(getQualifiedBossKeyRewardCount(bossId, 1), 3);
    assert.equal(getBossDamageBonusKeyCount(bossId, 1), 2);
  }

  assert.equal(getQualifiedBossKeyRewardCount(6, 1), 1);
  assert.equal(getBossDamageBonusKeyCount(6, 1), 0);
});

test("configured historical key chains take priority over catalog order", () => {
  const result = resolveKeySourceBoss(36, [
    { id: 32, categoryId: 3, sortIndex: 0, globalReward: { keys: 1 } },
    { id: 35, categoryId: 3, sortIndex: 3, globalReward: { keys: 1 } },
    { id: 36, categoryId: 3, sortIndex: 4, globalReward: { keys: 1 } },
  ]);

  assert.deepEqual(result, {
    sourceBossId: 32,
    resolution: "configured",
  });
});

test("Vorkuta does not require keys and never inherits Bidon as a source", () => {
  const catalog = [
    { id: 37, categoryId: 1, sortIndex: 17, globalReward: { keys: 1 } },
    {
      id: 39,
      categoryId: 1,
      sortIndex: 18,
      globalReward: { keys: 1 },
      persistedKeyRequirement: { requiredFromBossId: 37, requiredKeyCount: 3 },
    },
  ];

  assert.equal(getRequiredKeysForAttack(39, catalog), 0);
  assert.deepEqual(resolveKeySourceBoss(39, catalog), {
    sourceBossId: null,
    resolution: "not_required",
  });
});

test("a newly added boss uses the latest earlier key-rewarding boss in its category", () => {
  const result = resolveKeySourceBoss(45, [
    { id: 37, categoryId: 1, sortIndex: 17, globalReward: { keys: 1 } },
    { id: 39, categoryId: 1, sortIndex: 18, globalReward: { keys: 1 } },
    { id: 40, categoryId: 1, sortIndex: 19, globalReward: { keys: 0 } },
    { id: 45, categoryId: 1, sortIndex: 20, globalReward: { keys: 0 } },
  ]);

  assert.deepEqual(result, {
    sourceBossId: 39,
    resolution: "inferred_from_catalog",
  });
});

test("a live game key requirement overrides the inferred catalog source", () => {
  const catalog = [
    { id: 5, categoryId: 1, sortIndex: 4, globalReward: { keys: 1 } },
    { id: 39, categoryId: 1, sortIndex: 18, globalReward: { keys: 1 } },
    {
      id: 40,
      categoryId: 1,
      sortIndex: 19,
      globalReward: { keys: 0 },
      keyRequirement: { requiredFromBossId: 5, requiredKeyCount: 3 },
    },
  ];

  assert.deepEqual(resolveKeySourceBoss(40, catalog), {
    sourceBossId: 5,
    resolution: "game_declared",
  });
  assert.equal(getRequiredKeysForAttack(40, catalog), 3);
});

test("an unknown boss without an earlier key source remains unresolved", () => {
  const result = resolveKeySourceBoss(99, [
    { id: 99, categoryId: 4, sortIndex: 0, globalReward: { keys: 0 } },
  ]);

  assert.deepEqual(result, {
    sourceBossId: null,
    resolution: "unresolved",
  });
});
