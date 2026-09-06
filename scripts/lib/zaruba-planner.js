function asNonNegativeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function asNonNegativeInt(value, fallback = 0) {
  return Math.floor(asNonNegativeNumber(value, fallback));
}

function pickCheckpointReward(checkpoint, rewardFields) {
  for (const field of rewardFields) {
    const value = Number(checkpoint && checkpoint[field]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }
  return 0;
}

function normalizeCheckpointState(source = {}) {
  const progress = source.progress && typeof source.progress === "object" ? source.progress : source;
  return {
    currentCheckpointIndex: asNonNegativeInt(
      source.currentCheckpointIndex
      ?? source.currentCheckpoint
      ?? progress.currentCheckpointIndex
      ?? progress.currentCheckpoint,
    ),
    clicksInCheckpoint: asNonNegativeInt(
      source.clicksInCheckpoint ?? progress.clicksInCheckpoint,
    ),
  };
}

function buildMinimumCheckpointPlan(checkpoints, source, requiredPoints, options = {}) {
  const normalized = (Array.isArray(checkpoints) ? checkpoints : [])
    .map((checkpoint) => ({
      clicksRequired: Math.max(1, asNonNegativeInt(checkpoint && checkpoint.clicksRequired, 1)),
      energyCost: asNonNegativeInt(checkpoint && checkpoint.energyCost),
      reward: pickCheckpointReward(checkpoint, options.rewardFields || [
        "rewardRating",
        "rewardRespect",
        "rewardIntellect",
        "rewardKnowledge",
      ]),
    }))
    .filter((checkpoint) => checkpoint.reward > 0);
  const target = asNonNegativeInt(requiredPoints);
  if (normalized.length === 0 || target <= 0) {
    return null;
  }

  const state = normalizeCheckpointState(source);
  let checkpointIndex = state.currentCheckpointIndex % normalized.length;
  let clicksInCheckpoint = state.currentCheckpointIndex >= normalized.length
    ? 0
    : state.clicksInCheckpoint;
  let energy = 0;
  let points = 0;
  let steps = 0;
  let completedRuns = 0;
  const stepEnergy = [];
  const stepRewards = [];
  const maxSteps = Math.max(1, asNonNegativeInt(options.maxSteps, 100_000));

  while (points < target && steps < maxSteps) {
    let checkpoint = normalized[checkpointIndex];
    while (clicksInCheckpoint >= checkpoint.clicksRequired) {
      checkpointIndex = (checkpointIndex + 1) % normalized.length;
      clicksInCheckpoint = 0;
      checkpoint = normalized[checkpointIndex];
    }

    energy += checkpoint.energyCost;
    points += checkpoint.reward;
    steps += 1;
    stepEnergy.push(checkpoint.energyCost);
    stepRewards.push(checkpoint.reward);
    clicksInCheckpoint += 1;

    if (clicksInCheckpoint >= checkpoint.clicksRequired) {
      checkpointIndex = (checkpointIndex + 1) % normalized.length;
      clicksInCheckpoint = 0;
      if (checkpointIndex === 0) {
        completedRuns += 1;
      }
    }
  }

  if (points < target) {
    return null;
  }
  return {
    steps,
    energy,
    points,
    overage: Math.max(0, points - target),
    completedRuns,
    stepEnergy,
    stepRewards,
    averagePointsPerEnergy: energy > 0 ? points / energy : null,
  };
}

function compareMinimumPlans(left, right) {
  if (!left) return 1;
  if (!right) return -1;
  return Number(left.energy || 0) - Number(right.energy || 0)
    || Number(left.overage || 0) - Number(right.overage || 0)
    || Number(left.steps || 0) - Number(right.steps || 0)
    || Number(left.targetId || 0) - Number(right.targetId || 0);
}

function selectMinimumPlan(plans) {
  return (Array.isArray(plans) ? plans : [])
    .filter(Boolean)
    .sort(compareMinimumPlans)[0] || null;
}

function buildPrisonRespectPlan(detailView, requiredRespect) {
  if (!detailView || typeof detailView !== "object") {
    return null;
  }
  const candidates = [
    { modeKey: "day", isDay: true },
    { modeKey: "night", isDay: false },
  ].map((mode) => {
    const plan = buildMinimumCheckpointPlan(
      detailView.checkpoints && detailView.checkpoints[mode.modeKey],
      detailView[mode.modeKey],
      requiredRespect,
      { rewardFields: ["rewardRating", "rewardRespect"] },
    );
    return plan ? { ...plan, ...mode } : null;
  });
  return selectMinimumPlan(candidates);
}

function buildMasterKnowledgePlan(training, requiredKnowledge) {
  if (!training || training.available === false || training.canStartTraining === false) {
    return null;
  }
  return buildMinimumCheckpointPlan(training.checkpoints, training, requiredKnowledge, {
    rewardFields: ["rewardRating", "rewardIntellect", "rewardKnowledge"],
  });
}

function sumFirst(values, count) {
  return (Array.isArray(values) ? values : [])
    .slice(0, Math.max(0, asNonNegativeInt(count)))
    .reduce((total, value) => total + asNonNegativeNumber(value), 0);
}

module.exports = {
  buildMasterKnowledgePlan,
  buildMinimumCheckpointPlan,
  buildPrisonRespectPlan,
  compareMinimumPlans,
  selectMinimumPlan,
  sumFirst,
};
