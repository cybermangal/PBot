const assert = require("node:assert/strict");
const test = require("node:test");

const { __test } = require("../lib/ui-service");

function candidate(userId, authority, rank) {
  return {
    userId: String(userId),
    appearances: [{
      source: "authority-top",
      metricName: "authority",
      metricValue: authority,
      rank,
    }],
  };
}

test("negative actions start from the lowest-authority end of the authority pool", () => {
  const collected = {
    uniqueIds: {
      values: [candidate(1, 500, 2), candidate(2, 20, 99), candidate(3, 80, 70)],
    },
  };
  const progress = __test.normalizeInteractionProgress({}, "2026-07-11");
  const result = __test.selectCollectedInteractionTargets(collected, { max: 2 }, "999", "TossDroj", progress);

  assert.equal(result.selection.strategy, "lowest_authority");
  assert.deepEqual(result.targets.map((item) => item.userId), ["2", "3"]);
});

test("once-per-day actions skip targets recorded as completed while fights remain repeatable", () => {
  const collected = {
    uniqueIds: {
      values: [candidate(1, 10, 100), candidate(2, 20, 99)],
    },
  };
  const progress = __test.normalizeInteractionProgress({
    dayKey: "2026-07-11",
    completedByType: { UpgradeBiceps: ["1"] },
  }, "2026-07-11");
  const biceps = __test.selectCollectedInteractionTargets(collected, {}, "999", "UpgradeBiceps", progress);
  const fight = __test.selectCollectedInteractionTargets(collected, {}, "999", "Fight", progress);

  assert.deepEqual(biceps.targets.map((item) => item.userId), ["2"]);
  assert.equal(biceps.selection.skippedAlreadyPerformed, 1);
  assert.deepEqual(fight.targets.map((item) => item.userId), ["1", "2"]);
});

test("friend actions choose the highest-authority friends for biceps", () => {
  const progress = __test.normalizeInteractionProgress({}, "2026-07-11");
  const result = __test.selectFriendInteractionTargets([
    { userId: "1", authority: 50 },
    { userId: "2", authority: 900 },
    { userId: "3", authority: 450 },
  ], { max: 2 }, "999", "UpgradeBiceps", progress);

  assert.equal(result.selection.strategy, "highest_authority");
  assert.deepEqual(result.targets.map((item) => item.userId), ["2", "3"]);
  assert.deepEqual(result.targets.map((item) => item.authorityRank), [1, 2]);
});

test("negative friend actions choose the lowest-authority friends", () => {
  const progress = __test.normalizeInteractionProgress({}, "2026-07-11");
  const result = __test.selectFriendInteractionTargets([
    { userId: "1", authority: 50 },
    { userId: "2", authority: 900 },
    { userId: "3", authority: 450 },
  ], { max: 2 }, "999", "Harknut", progress);

  assert.equal(result.selection.strategy, "lowest_authority");
  assert.deepEqual(result.targets.map((item) => item.userId), ["1", "3"]);
});

test("friend profile normalization retains only current friends with numeric authority", () => {
  const profiles = __test.normalizeFriendProfileRecords([
    { userId: 1, nickname: "friend", authority: 70 },
    { userId: 2, nickname: "not-friend", authority: 10 },
    { userId: 3, nickname: "self", authority: 100 },
    { userId: 4, nickname: "missing", authority: null },
  ], new Set(["1", "3", "4"]), "3");

  assert.deepEqual(profiles, [{ userId: "1", nickname: "friend", authority: 70 }]);
});

test("friend profile normalization can use the profile feed as the authoritative source", () => {
  const profiles = __test.normalizeFriendProfileRecords([
    { userId: 1, nickname: "friend", authority: 70 },
    { userId: 2, nickname: "another friend", authority: 10 },
    { userId: 3, nickname: "self", authority: 100 },
  ], null, "3");

  assert.deepEqual(profiles.map((item) => item.userId), ["1", "2"]);
});

test("incoming request normalization keeps the universal talent field", () => {
  const requests = __test.normalizeIncomingFriendRequestRecords([
    {
      userId: 1,
      nickname: "candidate",
      isIncoming: true,
      talentsCount: 75,
    },
    { userId: 2, isIncoming: false, talentsCount: 100 },
  ], "999");

  assert.deepEqual(requests, [{
    userId: "1",
    nickname: "candidate",
    photoUrl: null,
    isIncoming: true,
    isPending: null,
    talentsCount: 75,
    weeklyDamage: null,
    weeklyRank: null,
    weeklyDamageListed: null,
    authority: null,
  }]);

  const criteria = __test.normalizeFriendCriteriaOptions({
    minTalents: 50,
    minWeeklyDamage: 1_000_000,
  });
  const evaluation = __test.evaluateFriendCriteria({ ...requests[0], weeklyDamage: 1_000_001 }, criteria);
  assert.equal(evaluation.passed, true);
});

test("friend cleanup selects explicit failures but skips unknown-only profiles", () => {
  const criteria = __test.normalizeFriendCriteriaOptions({
    minTalents: 50,
    minWeeklyDamage: 1_000,
  });
  const result = __test.selectFriendCleanupTargets([
    { userId: "1", talentsCount: 40, weeklyDamage: 5_000 },
    { userId: "2", weeklyDamage: 5_000 },
    { userId: "3", talentsCount: 70, weeklyDamage: 500 },
    { userId: "4", talentsCount: 80, weeklyDamage: 5_000 },
  ], criteria, null);

  assert.deepEqual(result.targets.map((item) => item.userId), ["3", "1"]);
  assert.equal(result.skippedUnknownCriteria, 1);
  assert.equal(result.skippedPassed, 1);
});

test("friend cleanup reuses the same talent threshold as incoming requests", () => {
  const criteria = __test.normalizeFriendCleanupCriteria({
    minTalents: 50,
  });

  assert.equal(criteria.minTalents, null);
  assert.equal(criteria.minWeeklyDamage, null);
  assert.equal(criteria.minTalentAchievement, 50);
  assert.equal(criteria.needsTalents, false);
  assert.equal(criteria.needsTalentAchievement, true);
  assert.throws(
    () => __test.normalizeFriendCleanupCriteria({}),
    /weekly damage threshold or a minimum talent total/i,
  );
});

test("personal-file summary exposes the exact external talent total", () => {
  assert.equal(__test.extractTalentPointsTotal({
    data: {
      overview: { talentPointsTotal: 982 },
      unlockedAchievements: ["talents_888"],
    },
  }), 982);
  assert.equal(__test.extractTalentPointsTotal({ data: { overview: {} } }), null);
});

test("friend cleanup compares the exact talent total and skips unavailable summaries", () => {
  const criteria = __test.normalizeFriendCleanupCriteria({ minTalentAchievement: 50 });
  const result = __test.selectFriendCleanupTargets([
    { userId: "1", talentPointsTotal: 49 },
    { userId: "2", talentPointsTotal: 50 },
    { userId: "3", talentPointsTotal: null },
  ], criteria, null);

  assert.deepEqual(result.targets.map((item) => item.userId), ["1"]);
  assert.equal(result.skippedPassed, 1);
  assert.equal(result.skippedUnknownCriteria, 1);
});

test("incoming requests accept matches and decline every non-match", () => {
  const criteria = __test.normalizeFriendCriteriaOptions({
    minTalents: 50,
    minWeeklyDamage: 1_000,
  });
  const plan = __test.buildIncomingFriendRequestPlan([
    { userId: "1", talentsCount: 75, weeklyDamage: 2_000 },
    { userId: "2", talentsCount: 30, weeklyDamage: 2_000 },
    { userId: "3", talentsCount: 75, weeklyDamage: 500 },
    { userId: "4", talentsCount: null, weeklyDamage: 2_000 },
    { userId: "5", talentsCount: 100, weeklyDamage: 3_000 },
  ], criteria, 1);

  assert.deepEqual(plan.acceptedTargets.map((item) => item.userId), ["1"]);
  assert.deepEqual(plan.rejectedTargets.map((item) => item.userId), ["2", "3", "4"]);
  assert.equal(plan.skippedEligibleOverflow, 1);
  assert.deepEqual(plan.actions.map((item) => item.action), ["accept", "decline", "decline", "decline"]);
});
