function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function unwrapResponseData(response) {
  const payload = response && response.data;

  if (payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }

  return payload;
}

function isSuccessfulGameResponse(response) {
  if (!response || !response.ok) {
    return false;
  }

  const payload = response.data;
  if (payload && typeof payload === "object" && payload.success === false) {
    return false;
  }

  return true;
}

function normalizeCheckpoint(item, index) {
  const checkpointIndex = index + 1;

  return {
    checkpointId: asNumber(item && item.checkpointId, checkpointIndex),
    checkpointIndex: index,
    checkpointNumber: checkpointIndex,
    title: item && item.title ? String(item.title) : `Checkpoint ${checkpointIndex}`,
    clicksRequired: asNumber(item && item.clicksRequired, 0),
    energyCost: asNumber(item && item.energyCost, 0),
    rewardCigarettes: asNumber(item && item.rewardCigarettes, 0),
    rewardRating: asNumber(item && item.rewardRating, 0),
    rewardAuthority: asNumber(item && item.rewardAuthority, 0),
    imageUrl: item && item.imageUrl ? String(item.imageUrl) : null,
  };
}

function normalizeCheckpoints(response) {
  const raw = unwrapResponseData(response);
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item, index) => normalizeCheckpoint(item, index));
}

function normalizePrisonProgress(response) {
  const raw = unwrapResponseData(response);

  return raw && typeof raw === "object" ? raw : null;
}

function buildPrisonModeView(prisonData, checkpoints, isDay) {
  const prefix = isDay ? "day" : "night";
  const currentCheckpointIndex = asNumber(prisonData && prisonData[`${prefix}CurrentCheckpoint`], 0);
  const clicksInCheckpoint = asNumber(prisonData && prisonData[`${prefix}ClicksInCheckpoint`], 0);
  const rating = asNumber(prisonData && prisonData[`${prefix}Rating`], 0);
  const runs = asNumber(prisonData && prisonData[`${prefix}Runs`], 0);
  const completed = checkpoints.length > 0 && currentCheckpointIndex >= checkpoints.length;
  const activeCheckpoint = completed ? null : checkpoints[currentCheckpointIndex] || null;
  const remainingClicks = activeCheckpoint
    ? Math.max(0, activeCheckpoint.clicksRequired - clicksInCheckpoint)
    : 0;

  return {
    modeKey: isDay ? "day" : "night",
    isDay: Boolean(isDay),
    currentCheckpointIndex,
    currentCheckpointNumber: currentCheckpointIndex + 1,
    clicksInCheckpoint,
    rating,
    runs,
    completed,
    totalCheckpoints: checkpoints.length,
    activeCheckpoint,
    remainingClicks,
  };
}

function buildPrisonDetailView(detailResponse, dayCheckpointsResponse, nightCheckpointsResponse) {
  const prisonData = normalizePrisonProgress(detailResponse);
  const dayCheckpoints = normalizeCheckpoints(dayCheckpointsResponse);
  const nightCheckpoints = normalizeCheckpoints(nightCheckpointsResponse);

  return {
    prison: prisonData,
    day: buildPrisonModeView(prisonData, dayCheckpoints, true),
    night: buildPrisonModeView(prisonData, nightCheckpoints, false),
    checkpoints: {
      day: dayCheckpoints,
      night: nightCheckpoints,
    },
  };
}

function buildPrisonWorkRequest(prisonId, isDay = true) {
  return {
    method: "POST",
    path: `/api/player/prison/${prisonId}/work`,
    query: { isDay: Boolean(isDay) },
    json: {},
  };
}

function summarizePrisonStep(beforeView, afterView, response, isDay) {
  const modeKey = isDay ? "day" : "night";
  const before = beforeView[modeKey];
  const after = afterView[modeKey];

  return {
    ok: isSuccessfulGameResponse(response),
    modeKey,
    responseStatus: response ? response.status : null,
    responseData: response ? response.data : null,
    before: {
      currentCheckpointIndex: before.currentCheckpointIndex,
      clicksInCheckpoint: before.clicksInCheckpoint,
      rating: before.rating,
      runs: before.runs,
    },
    after: {
      currentCheckpointIndex: after.currentCheckpointIndex,
      clicksInCheckpoint: after.clicksInCheckpoint,
      rating: after.rating,
      runs: after.runs,
    },
    delta: {
      checkpointAdvance: after.currentCheckpointIndex - before.currentCheckpointIndex,
      clicksAdvance: after.clicksInCheckpoint - before.clicksInCheckpoint,
      ratingGain: after.rating - before.rating,
      runsGain: after.runs - before.runs,
      completedRuns: getPrisonRunCompletionCount(before, after),
    },
  };
}

function getPrisonRunCompletionCount(before, after) {
  if (!before || !after) {
    return 0;
  }
  const runsGain = Math.max(0, asNumber(after.runs, 0) - asNumber(before.runs, 0));
  if (runsGain > 0) {
    return Math.trunc(runsGain);
  }
  if (after.completed === true && before.completed !== true) {
    return 1;
  }
  const checkpointWrapped = asNumber(before.currentCheckpointIndex, 0) > 0
    && asNumber(after.currentCheckpointIndex, 0) < asNumber(before.currentCheckpointIndex, 0);
  return checkpointWrapped ? 1 : 0;
}

async function loadPrisonDetail(client, prisonId, requestOptions = {}) {
  const [detailResponse, dayCheckpointsResponse, nightCheckpointsResponse] = await Promise.all([
    client.players.prisonDetail(prisonId, requestOptions),
    client.players.prisonCheckpoints(prisonId, { ...requestOptions, isDay: true }),
    client.players.prisonCheckpoints(prisonId, { ...requestOptions, isDay: false }),
  ]);

  return {
    responses: {
      detailResponse,
      dayCheckpointsResponse,
      nightCheckpointsResponse,
    },
    view: buildPrisonDetailView(detailResponse, dayCheckpointsResponse, nightCheckpointsResponse),
  };
}

async function executePrisonRunnerOnce(client, options = {}) {
  const prisonId = Number(options.prisonId);
  const isDay = options.isDay !== false;
  const steps = Number.isFinite(Number(options.steps)) ? Math.max(1, Number(options.steps)) : 1;
  const delayMs = Number.isFinite(Number(options.delayMs)) ? Math.max(0, Number(options.delayMs)) : 250;
  const continueOnError = Boolean(options.continueOnError);
  const stopOnNoProgress = options.stopOnNoProgress !== false;
  const modeKey = isDay ? "day" : "night";
  const before = await loadPrisonDetail(client, prisonId);
  const results = [];
  let currentView = before.view;

  for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
    const response = await client.players.prisonWork(prisonId, { isDay });
    const after = await loadPrisonDetail(client, prisonId);
    const summary = summarizePrisonStep(currentView, after.view, response, isDay);

    results.push({
      stepIndex,
      request: buildPrisonWorkRequest(prisonId, isDay),
      summary,
    });

    currentView = after.view;

    if (!summary.ok && !continueOnError) {
      break;
    }

    const noProgress = summary.delta.checkpointAdvance === 0
      && summary.delta.clicksAdvance === 0
      && summary.delta.ratingGain === 0
      && summary.delta.runsGain === 0;

    if (stopOnNoProgress && noProgress) {
      break;
    }

    if (currentView[modeKey].completed) {
      break;
    }

    if (delayMs > 0 && stepIndex !== steps - 1) {
      await sleep(delayMs);
    }
  }

  return {
    prisonId,
    modeKey,
    stepsRequested: steps,
    stepsCompleted: results.length,
    runsCompleted: results.reduce(
      (total, item) => total + asNumber(item && item.summary && item.summary.delta.completedRuns, 0),
      0,
    ),
    before: before.view,
    after: currentView,
    results,
  };
}

module.exports = {
  buildPrisonDetailView,
  buildPrisonWorkRequest,
  executePrisonRunnerOnce,
  getPrisonRunCompletionCount,
  isSuccessfulGameResponse,
  loadPrisonDetail,
  normalizeCheckpoints,
  normalizePrisonProgress,
};
