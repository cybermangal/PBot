const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildMasterKnowledgePlan,
  buildPrisonRespectPlan,
  selectMinimumPlan,
  sumFirst,
} = require("../lib/zaruba-planner");

test("prison Zaruba plan stops at the minimum energy that reaches the live target", () => {
  const checkpoints = [
    { clicksRequired: 7, energyCost: 5, rewardRating: 6 },
    { clicksRequired: 15, energyCost: 9, rewardRating: 5 },
  ];
  const detail = {
    day: { currentCheckpointIndex: 1, clicksInCheckpoint: 11 },
    night: { currentCheckpointIndex: 0, clicksInCheckpoint: 0 },
    checkpoints: {
      day: checkpoints,
      night: [{ clicksRequired: 99, energyCost: 11, rewardRating: 3 }],
    },
  };

  const plan = buildPrisonRespectPlan(detail, 25);
  assert.equal(plan.isDay, true);
  assert.equal(plan.steps, 5);
  assert.equal(plan.energy, 41);
  assert.equal(plan.points, 26);
  assert.equal(plan.overage, 1);
  assert.equal(sumFirst(plan.stepEnergy, 1), 9);
});

test("master plan uses rating earned by each step and supports an in-progress checkpoint", () => {
  const plan = buildMasterKnowledgePlan({
    available: true,
    canStartTraining: true,
    currentCheckpointIndex: 1,
    clicksInCheckpoint: 1,
    checkpoints: [
      { clicksRequired: 2, energyCost: 2, rewardRating: 2 },
      { clicksRequired: 3, energyCost: 4, rewardRating: 5 },
    ],
  }, 9);

  assert.equal(plan.steps, 2);
  assert.equal(plan.energy, 8);
  assert.equal(plan.points, 10);
});

test("minimum plan prefers lower energy before fewer steps", () => {
  const selected = selectMinimumPlan([
    { targetId: 2, energy: 9, overage: 0, steps: 1 },
    { targetId: 1, energy: 8, overage: 2, steps: 2 },
  ]);
  assert.equal(selected.targetId, 1);
});
