const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classifyMonthlyDay,
  calculatePlayerResourceDelta,
  buildMonthlyEvaluation,
  estimateMasterIntellectEnergy,
  estimateMasterSessionEnergy,
  estimatePrisonAuthorityEnergy,
  estimatePrisonRunEnergy,
  normalizeMiscAutomationState,
  normalizePlayerResourceSnapshot,
  normalizeStashDashboard,
} = require("../lib/misc-dashboard");

test("stash dashboard reports how many complete sets can be sold", () => {
  const dashboard = normalizeStashDashboard({
    collections: [{
      prisonid: 1,
      prison: "Бутырка",
      collections: [{
        id: 7,
        name: "Нычки",
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
        rewards: { cigarettes: 20, authority: 10 },
      }],
    }],
    playerProgress: { data: { 1: { 7: { items: { 1: 5, 2: 2, 3: 4 } } } } },
  });

  assert.equal(dashboard.totals.readyCollections, 1);
  assert.equal(dashboard.totals.sellableCycles, 2);
  assert.equal(dashboard.totals.itemsInInventory, 11);
  assert.deepEqual(dashboard.totals.rewards, { cigarettes: 40, authority: 20 });
  assert.equal(dashboard.zones[0].sets[0].completeCopies, 2);
  assert.deepEqual(dashboard.zones[0].sets[0].totalRewards, { cigarettes: 40, authority: 20 });
});

test("player resource delta reports actual authority and currency gains", () => {
  const before = normalizePlayerResourceSnapshot({
    authority: 100,
    currencies: { cigarettes: 200, rubles: 5 },
  });
  const after = normalizePlayerResourceSnapshot({
    authority: 130,
    currencies: { cigarettes: 260, rubles: 5, soap: 1 },
  });

  assert.deepEqual(calculatePlayerResourceDelta(before, after), {
    authority: 30,
    currencies: { cigarettes: 60, soap: 1 },
  });
});

test("daily rules auto-run genuinely cheap actions", () => {
  assert.equal(classifyMonthlyDay({ action: "SpitSoup" }).automatic, true);
  assert.equal(classifyMonthlyDay({ action: "StressVictim" }).automatic, true);
  assert.equal(classifyMonthlyDay({ action: "ScamGambler" }).automatic, true);
  assert.equal(classifyMonthlyDay({ action: "KillBoss" }).label, "Обычно дёшево");
  assert.equal(normalizeMiscAutomationState({}).enabled, true);
});

test("prison daily evaluation compares energy range with free recovery budget", () => {
  const evaluation = buildMonthlyEvaluation({
    action: "PrisonRun",
    target: 5,
    progress: 1,
    completed: false,
    isToday: true,
    context: { prisonId: 2 },
    label: "Только энергия",
    note: "",
  }, {
    prisonCosts: { 2: { min: 3, max: 5 } },
    todayFreeEnergy: 30,
  });
  assert.equal(evaluation.requiredEnergyMin, 12);
  assert.equal(evaluation.requiredEnergyMax, 20);
  assert.equal(evaluation.freeEnergyEnough, true);
});

test("prison respect daily is cheap when one business profit collection completes it", () => {
  const evaluation = buildMonthlyEvaluation({
    action: "PrisonEarnAuthority",
    target: 1300,
    progress: 0,
    completed: false,
    isToday: true,
    label: "Только энергия",
    note: "",
  }, {
    business: {
      canCollect: false,
      collectAvailableAt: "2026-08-06T12:00:00.000Z",
      expectedRewards: { respect: 1300 },
      expectedRewardsByPrison: {
        1: { respect: 500 },
        4: { respect: 800 },
      },
    },
    prisons: {
      4: {
        name: "Кресты",
        day: { currentCheckpointIndex: 0, clicksInCheckpoint: 0 },
        checkpoints: { day: [{ clicksRequired: 10, energyCost: 10, rewardAuthority: 1 }] },
      },
    },
    energy: 0,
    maxEnergy: 100,
  });

  assert.equal(evaluation.tone, "cheap");
  assert.equal(evaluation.profitRespect, 1300);
  assert.equal(evaluation.requiredEnergyMax, 0);
  assert.match(evaluation.note, /Следующий бесплатный сбор прибыли/);
});

test("master monthly estimates count training quests as full checkpoint cycles", () => {
  const training = {
    available: true,
    canStartTraining: true,
    progress: { level: 2, intellect: 200 },
    currentCheckpointIndex: 1,
    clicksInCheckpoint: 1,
    checkpoints: [
      { clicksRequired: 2, energyCost: 3 },
      { clicksRequired: 3, energyCost: 5 },
    ],
  };

  const sessions = estimateMasterSessionEnergy(training, 3);
  assert.equal(sessions.runsNeeded, 3);
  assert.equal(sessions.steps, 12);
  assert.equal(sessions.energy, 52);

  const intellect = estimateMasterIntellectEnergy(training, 150);
  assert.equal(intellect.intellectPerRun, 100);
  assert.equal(intellect.runsNeeded, 2);
  assert.equal(intellect.intellectPlanned, 200);
  assert.equal(intellect.energy, 31);
});

test("prison monthly estimates count each requested run as a full checkpoint cycle", () => {
  const prison = {
    day: { currentCheckpointIndex: 0, clicksInCheckpoint: 1 },
    checkpoints: {
      day: [
        { clicksRequired: 2, energyCost: 2, rewardAuthority: 10 },
        { clicksRequired: 1, energyCost: 4, rewardAuthority: 20 },
      ],
    },
  };

  const runs = estimatePrisonRunEnergy(prison, 2);
  assert.equal(runs.runsNeeded, 2);
  assert.equal(runs.steps, 5);
  assert.equal(runs.energy, 14);

  const authority = estimatePrisonAuthorityEnergy(prison, 40);
  assert.equal(authority.steps, 3);
  assert.equal(authority.authority, 40);
  assert.equal(authority.energy, 8);
});

test("Butyrka run stays cheap when free recovery covers its exact energy cost", () => {
  const evaluation = buildMonthlyEvaluation({
    action: "PrisonRun",
    target: 1,
    progress: 0,
    completed: false,
    isToday: true,
    context: { prisonId: 1 },
    label: "Только энергия",
    note: "",
  }, {
    energy: 0,
    maxEnergy: 5,
    todayFreeEnergy: 14,
    prisons: {
      1: {
        name: "Бутырка",
        day: { currentCheckpointIndex: 0, clicksInCheckpoint: 1 },
        checkpoints: {
          day: [
            { clicksRequired: 2, energyCost: 2 },
            { clicksRequired: 1, energyCost: 4 },
          ],
        },
      },
    },
  });

  assert.equal(evaluation.requiredEnergyMax, 6);
  assert.equal(evaluation.freeEnergyEnough, true);
  assert.equal(evaluation.chefirRestores, 0);
  assert.equal(evaluation.tone, "cheap");
  assert.match(evaluation.label, /хватит бесплатного восстановления/);
});
