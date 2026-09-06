const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BUSINESS_COLLECT_COOLDOWN_MS,
  normalizeBusinessDashboard,
  normalizeCollectionDashboard,
  normalizeMasterEnterResponse,
  normalizePodogrevDashboard,
  normalizePrisonAutomationState,
} = require("../lib/prison-dashboard");
const { buildPrisonDetailView, getPrisonRunCompletionCount } = require("../lib/prison-runner");

test("collection dashboard separates prisons and masters and counts completed set rewards", () => {
  const payload = {
    collections: [
      {
        prisonid: 1,
        prison: "Prison one",
        collections: [{
          id: 1,
          name: "Set one",
          items: [{ id: 1 }, { id: 2 }],
          rewards: { authority: 50, cigarettes: 25 },
        }],
      },
      {
        prisonid: 16,
        prison: "Master one",
        collections: [{
          id: 1,
          name: "Set two",
          items: [{ id: 1 }, { id: 2 }],
          rewards: { authority: 70, cigarettes: 40 },
        }],
      },
    ],
    playerProgress: {
      data: {
        1: { 1: { items: { 1: 2, 2: 1 }, completedTimes: 3 } },
        16: { 1: { items: { 1: 5, 2: 0 }, completedTimes: 0 } },
      },
    },
  };

  const dashboard = normalizeCollectionDashboard(payload);

  assert.equal(dashboard.prisons.length, 1);
  assert.equal(dashboard.masters.length, 1);
  assert.equal(dashboard.prisons[0].sourceId, 1);
  assert.equal(dashboard.masters[0].sourceId, 1);
  assert.equal(dashboard.totals.collectedItems, 3);
  assert.equal(dashboard.totals.totalItems, 4);
  assert.deepEqual(dashboard.totals.earnedRewards, { authority: 50, cigarettes: 25 });
  assert.deepEqual(dashboard.totals.potentialRewards, { authority: 120, cigarettes: 65 });
});

test("master entry reports missing item totals and active energy cost", () => {
  const view = normalizeMasterEnterResponse({
    success: true,
    data: {
      masterId: 2,
      itemsOwned: [true, false, false],
      canStartTraining: false,
      progress: { currentCheckpoint: 2, clicksInCheckpoint: 2, level: 7 },
    },
    itemsCatalog: [
      { itemIndex: 0, currency: "cigarettes", price: 100 },
      { itemIndex: 1, currency: "cigarettes", price: 200 },
      { itemIndex: 2, currency: "rubles", price: 3 },
    ],
    checkpoints: [
      { clicksRequired: 3, energyCost: 1 },
      { clicksRequired: 8, energyCost: 4 },
    ],
  });

  assert.equal(view.ownedItems, 1);
  assert.equal(view.totalItems, 3);
  assert.deepEqual(view.missingCost, { cigarettes: 200, rubles: 3 });
  assert.equal(view.energyCost, 4);
  assert.equal(view.remainingClicks, 6);
  assert.equal(view.runs, 7);
});

test("master checkpoint numbers are resolved as one-based checkpoint ids", () => {
  const view = normalizeMasterEnterResponse({
    success: true,
    data: {
      masterId: 9,
      itemsOwned: [],
      canStartTraining: true,
      completed: [true, true, true, true, true, true, false],
      progress: { currentCheckpoint: 7, clicksInCheckpoint: 1, level: 0, intellect: 412 },
    },
    checkpoints: Array.from({ length: 7 }, (_, index) => ({
      checkpointId: index + 1,
      clicksRequired: index === 6 ? 20 : 5,
      energyCost: index === 6 ? 22 : 3,
    })),
  });

  assert.equal(view.currentCheckpointIndex, 6);
  assert.equal(view.currentCheckpointNumber, 7);
  assert.equal(view.activeCheckpoint.checkpointId, 7);
  assert.equal(view.remainingClicks, 19);
  assert.equal(view.energyCost, 22);
});

test("prison checkpoint counters remain zero-based", () => {
  const view = buildPrisonDetailView(
    {
      ok: true,
      data: {
        data: {
          dayCurrentCheckpoint: 0,
          dayClicksInCheckpoint: 2,
          nightCurrentCheckpoint: 1,
          nightClicksInCheckpoint: 1,
        },
      },
    },
    {
      ok: true,
      data: {
        data: [
          { checkpointId: 1, clicksRequired: 5, energyCost: 3 },
          { checkpointId: 2, clicksRequired: 7, energyCost: 4 },
        ],
      },
    },
    {
      ok: true,
      data: {
        data: [
          { checkpointId: 1, clicksRequired: 6, energyCost: 4 },
          { checkpointId: 2, clicksRequired: 8, energyCost: 5 },
        ],
      },
    },
  );

  assert.equal(view.day.currentCheckpointIndex, 0);
  assert.equal(view.day.activeCheckpoint.checkpointId, 1);
  assert.equal(view.day.remainingClicks, 3);
  assert.equal(view.night.currentCheckpointIndex, 1);
  assert.equal(view.night.activeCheckpoint.checkpointId, 2);
  assert.equal(view.night.remainingClicks, 7);
});

test("a prison walk is counted when the server increments runs and resets checkpoints", () => {
  const completedRuns = getPrisonRunCompletionCount(
    { runs: 4, currentCheckpointIndex: 6, completed: false },
    { runs: 5, currentCheckpointIndex: 0, completed: false },
  );

  assert.equal(completedRuns, 1);
});

test("business dashboard uses the confirmed eight hour cooldown and sums rewards", () => {
  const lastCollectTime = "2026-07-10T10:00:00.000Z";
  const now = Date.parse(lastCollectTime) + BUSINESS_COLLECT_COOLDOWN_MS - 1_000;
  const dashboard = normalizeBusinessDashboard({
    lastCollectTime,
    businesses: [
      { businessId: 1, prisonId: 1, rewardType: "Authority", rewardPerLevel: 10 },
      { businessId: 2, prisonId: 1, rewardType: "Respect", rewardPerLevel: 4 },
    ],
    playerBusinesses: [
      { businessId: 1, prisonId: 1, level: 3 },
      { businessId: 2, prisonId: 1, level: 2 },
    ],
  }, now);

  assert.equal(dashboard.remainingMs, 1_000);
  assert.equal(dashboard.canCollect, false);
  assert.deepEqual(dashboard.expectedRewards, { cigarettes: 0, authority: 30, respect: 8 });
  assert.deepEqual(dashboard.expectedRewardsByPrison, {
    1: { cigarettes: 0, authority: 30, respect: 8 },
  });
});

test("podogrev exposes the server energy quota and immediately collectable energy", () => {
  const dashboard = normalizePodogrevDashboard({
    inbox: [{ type: 1 }, { type: 5 }, { type: 5 }],
    meta: { claimedToday: 42, leftQuota: 8 },
  });

  assert.equal(dashboard.available, 3);
  assert.equal(dashboard.collectableEnergy, 3);
  assert.equal(dashboard.dailyEnergyLimit, 50);
});

test("podogrev resets stale server quota counters for a new Moscow day", () => {
  const dashboard = normalizePodogrevDashboard({
    inbox: Array.from({ length: 20 }, () => ({ type: 5 })),
    meta: {
      claimedToday: 50,
      leftQuota: 0,
      lastClaimDate: "2026-08-02",
    },
  }, new Date("2026-08-06T11:30:00.000Z"));

  assert.equal(dashboard.claimedToday, 0);
  assert.equal(dashboard.leftQuota, 50);
  assert.equal(dashboard.collectableEnergy, 20);
  assert.equal(dashboard.dailyEnergyLimit, 50);
  assert.equal(dashboard.lastClaimDate, "2026-08-02");
});

test("podogrev preserves exhausted quota from the current Moscow day", () => {
  const dashboard = normalizePodogrevDashboard({
    inbox: [{ type: 5 }],
    meta: {
      claimedToday: 50,
      leftQuota: 0,
      lastClaimDate: "2026-08-06",
    },
  }, new Date("2026-08-06T11:30:00.000Z"));

  assert.equal(dashboard.claimedToday, 50);
  assert.equal(dashboard.leftQuota, 0);
  assert.equal(dashboard.collectableEnergy, 0);
  assert.equal(dashboard.dailyEnergyLimit, 50);
});

test("automation defaults enable maintenance but not spending or target runs", () => {
  const state = normalizePrisonAutomationState({});

  assert.equal(state.enabled, false);
  assert.equal(state.usePodogrev, true);
  assert.equal(state.autoCollectProfit, true);
  assert.equal(state.autoBuyMasterItems, false);
  assert.equal(state.targetType, "prison");
  assert.equal(state.targetId, 1);
});
