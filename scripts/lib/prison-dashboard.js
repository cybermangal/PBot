const { getMoscowDateKey } = require("./automation-state");

const BUSINESS_COLLECT_COOLDOWN_MS = 8 * 60 * 60 * 1000;
const PRISON_COLLECTION_ZONE_COUNT = 15;
const DEFAULT_PRISON_AUTOMATION_INTERVAL_SEC = 10;
const MIN_PRISON_AUTOMATION_INTERVAL_SEC = 5;
const PODOGREV_DAILY_ENERGY_LIMIT = 50;

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asPositiveInt(value, fallback = 1) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function asNonNegativeInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function unwrapTransportResponse(response) {
  if (response && typeof response === "object" && Object.prototype.hasOwnProperty.call(response, "ok")
    && Object.prototype.hasOwnProperty.call(response, "status")) {
    return response.data;
  }
  return response;
}

function addAmounts(target, source) {
  if (!source || typeof source !== "object") {
    return target;
  }
  for (const [key, rawValue] of Object.entries(source)) {
    const value = asNumber(rawValue, 0);
    if (value !== 0) {
      target[key] = asNumber(target[key], 0) + value;
    }
  }
  return target;
}

function normalizeMasterEnterResponse(response, master = null) {
  const root = unwrapTransportResponse(response) || {};
  const data = root && root.data && typeof root.data === "object" ? root.data : root;
  const masterId = asPositiveInt(data.masterId ?? master?.id, null);
  const itemsCatalog = Array.isArray(root.itemsCatalog) ? root.itemsCatalog : [];
  const checkpoints = Array.isArray(root.checkpoints) ? root.checkpoints : [];
  const itemsOwned = Array.isArray(data.itemsOwned) ? data.itemsOwned.map(Boolean) : [];
  const missingItems = itemsCatalog.filter((item) => !itemsOwned[asNonNegativeInt(item.itemIndex, 0)]);
  const missingCost = {};

  for (const item of missingItems) {
    const currency = String(item.currency || "unknown").toLowerCase();
    missingCost[currency] = asNumber(missingCost[currency], 0) + asNumber(item.price, 0);
  }

  const completed = Array.isArray(data.completed) ? data.completed.map(Boolean) : [];
  const progress = data.progress && typeof data.progress === "object" ? data.progress : null;
  const currentCheckpoint = progress ? asNonNegativeInt(progress.currentCheckpoint, 0) : 0;
  const checkpointIdIndex = checkpoints.findIndex(
    (checkpoint) => asNonNegativeInt(checkpoint && checkpoint.checkpointId, -1) === currentCheckpoint,
  );
  const firstIncompleteIndex = completed.findIndex((isCompleted) => !isCompleted);
  const currentCheckpointIndex = checkpointIdIndex >= 0
    ? checkpointIdIndex
    : firstIncompleteIndex >= 0 && firstIncompleteIndex < checkpoints.length
      ? firstIncompleteIndex
      : completed.length >= checkpoints.length && checkpoints.length > 0 && completed.every(Boolean)
        ? checkpoints.length
        : Math.min(Math.max(0, currentCheckpoint - 1), checkpoints.length);
  const activeCheckpoint = checkpoints[currentCheckpointIndex] || null;
  const clicksInCheckpoint = progress ? asNonNegativeInt(progress.clicksInCheckpoint, 0) : 0;
  const runs = progress
    ? asNonNegativeInt(progress.runs ?? progress.completedRuns ?? progress.level, 0)
    : 0;

  return {
    masterId,
    name: master && master.name ? String(master.name) : masterId ? `Мастер #${masterId}` : "Мастер",
    available: root.success !== false && root.locked !== true,
    locked: root.locked === true,
    error: root.error ? String(root.error) : null,
    requiredMasterId: asPositiveInt(root.requiredMasterId, null),
    canStartTraining: toBool(data.canStartTraining, false),
    completed,
    progress,
    runs,
    currentCheckpointIndex,
    currentCheckpointNumber: currentCheckpointIndex + 1,
    clicksInCheckpoint,
    activeCheckpoint,
    remainingClicks: activeCheckpoint
      ? Math.max(0, asNonNegativeInt(activeCheckpoint.clicksRequired, 0) - clicksInCheckpoint)
      : 0,
    energyCost: activeCheckpoint ? asNonNegativeInt(activeCheckpoint.energyCost, 0) : null,
    checkpoints,
    itemsCatalog,
    itemsOwned,
    ownedItems: itemsCatalog.filter((item) => itemsOwned[asNonNegativeInt(item.itemIndex, 0)]).length,
    totalItems: itemsCatalog.length,
    missingItems,
    missingCost,
  };
}

function normalizeCollectionDashboard(response, options = {}) {
  const root = unwrapTransportResponse(response) || {};
  const definitions = Array.isArray(root.collections) ? root.collections : [];
  const progressRoot = root.playerProgress && root.playerProgress.data && typeof root.playerProgress.data === "object"
    ? root.playerProgress.data
    : {};
  const prisonNames = new Map((options.prisons || []).map((item) => [Number(item.id), item.name]));
  const masterNames = new Map((options.masters || []).map((item) => [Number(item.id), item.name]));
  const totals = {
    collectedItems: 0,
    totalItems: 0,
    completedSets: 0,
    totalSets: 0,
    earnedRewards: {},
    potentialRewards: {},
  };

  const zones = definitions.map((zone) => {
    const zoneId = asPositiveInt(zone.prisonid, 1);
    const sourceType = zoneId <= PRISON_COLLECTION_ZONE_COUNT ? "prison" : "master";
    const sourceId = sourceType === "prison" ? zoneId : zoneId - PRISON_COLLECTION_ZONE_COUNT;
    const zoneProgress = progressRoot[String(zoneId)] || progressRoot[zoneId] || {};
    const zoneTotals = {
      collectedItems: 0,
      totalItems: 0,
      completedSets: 0,
      totalSets: 0,
      earnedRewards: {},
      potentialRewards: {},
    };

    const sets = (Array.isArray(zone.collections) ? zone.collections : []).map((set) => {
      const setId = asPositiveInt(set.id, 1);
      const setProgress = zoneProgress[String(setId)] || zoneProgress[setId] || {};
      const itemCounts = setProgress.items && typeof setProgress.items === "object" ? setProgress.items : {};
      const items = Array.isArray(set.items) ? set.items : [];
      const collectedItems = items.filter((item) => asNumber(itemCounts[String(item.id)] ?? itemCounts[item.id], 0) > 0).length;
      const completed = items.length > 0 && collectedItems === items.length;
      const rewards = set.rewards && typeof set.rewards === "object" ? set.rewards : {};

      zoneTotals.collectedItems += collectedItems;
      zoneTotals.totalItems += items.length;
      zoneTotals.totalSets += 1;
      addAmounts(zoneTotals.potentialRewards, rewards);
      if (completed) {
        zoneTotals.completedSets += 1;
        addAmounts(zoneTotals.earnedRewards, rewards);
      }

      return {
        id: setId,
        name: set.name ? String(set.name) : `Комплект #${setId}`,
        imageUrl: set.mainimage ? String(set.mainimage) : null,
        collectedItems,
        totalItems: items.length,
        completed,
        completedTimes: asNonNegativeInt(setProgress.completedTimes, 0),
        rewards,
        itemCounts,
      };
    });

    totals.collectedItems += zoneTotals.collectedItems;
    totals.totalItems += zoneTotals.totalItems;
    totals.completedSets += zoneTotals.completedSets;
    totals.totalSets += zoneTotals.totalSets;
    addAmounts(totals.earnedRewards, zoneTotals.earnedRewards);
    addAmounts(totals.potentialRewards, zoneTotals.potentialRewards);

    const catalogName = sourceType === "prison" ? prisonNames.get(sourceId) : masterNames.get(sourceId);
    return {
      zoneId,
      sourceType,
      sourceId,
      name: catalogName || zone.prison || `${sourceType === "prison" ? "Тюрьма" : "Мастер"} #${sourceId}`,
      shortName: zone.prison || catalogName || null,
      sets,
      ...zoneTotals,
    };
  });

  return {
    zones,
    prisons: zones.filter((item) => item.sourceType === "prison"),
    masters: zones.filter((item) => item.sourceType === "master"),
    totals,
  };
}

function normalizeBusinessDashboard(response, nowMs = Date.now()) {
  const root = unwrapTransportResponse(response) || {};
  const businesses = Array.isArray(root.businesses) ? root.businesses : [];
  const playerBusinesses = Array.isArray(root.playerBusinesses) ? root.playerBusinesses : [];
  const expectedRewards = { cigarettes: 0, authority: 0, respect: 0 };
  const expectedRewardsByPrison = {};

  for (const owned of playerBusinesses) {
    const config = businesses.find((item) => Number(item.businessId) === Number(owned.businessId)
      && Number(item.prisonId) === Number(owned.prisonId));
    if (!config || asNumber(owned.level, 0) <= 0) {
      continue;
    }
    const amount = asNumber(config.rewardPerLevel, 0) * asNumber(owned.level, 0);
    const rewardType = String(config.rewardType || "").toLowerCase();
    const prisonId = String(asPositiveInt(owned.prisonId, 0));
    if (!expectedRewardsByPrison[prisonId]) {
      expectedRewardsByPrison[prisonId] = { cigarettes: 0, authority: 0, respect: 0 };
    }
    if (rewardType === "cigarettes") {
      expectedRewards.cigarettes += amount;
      expectedRewardsByPrison[prisonId].cigarettes += amount;
    } else if (rewardType === "authority") {
      expectedRewards.authority += amount;
      expectedRewardsByPrison[prisonId].authority += amount;
    } else if (rewardType === "respect") {
      expectedRewards.respect += amount;
      expectedRewardsByPrison[prisonId].respect += amount;
    }
  }

  const lastCollectMs = Date.parse(root.lastCollectTime || "");
  const collectAvailableAtMs = Number.isFinite(lastCollectMs)
    ? lastCollectMs + BUSINESS_COLLECT_COOLDOWN_MS
    : null;
  const remainingMs = collectAvailableAtMs === null ? null : Math.max(0, collectAvailableAtMs - nowMs);

  return {
    lastCollectTime: Number.isFinite(lastCollectMs) ? new Date(lastCollectMs).toISOString() : null,
    collectAvailableAt: collectAvailableAtMs === null ? null : new Date(collectAvailableAtMs).toISOString(),
    remainingMs,
    canCollect: remainingMs === 0 && playerBusinesses.length > 0,
    cooldownMs: BUSINESS_COLLECT_COOLDOWN_MS,
    expectedRewards,
    expectedRewardsByPrison,
    ownedBusinesses: playerBusinesses.length,
    totalBusinesses: businesses.length,
  };
}

function normalizePodogrevDashboard(response, now = new Date()) {
  const root = unwrapTransportResponse(response) || {};
  const inbox = Array.isArray(root.inbox) ? root.inbox : [];
  const meta = root.meta && typeof root.meta === "object" ? root.meta : {};
  const reportedClaimedToday = asNonNegativeInt(meta.claimedToday, 0);
  const reportedLeftQuota = asNonNegativeInt(meta.leftQuota, 0);
  const lastClaimDate = String(meta.lastClaimDate || "").slice(0, 10) || null;
  const quotaIsStale = Boolean(lastClaimDate && lastClaimDate !== getMoscowDateKey(now));
  const reportedDailyEnergyLimit = reportedClaimedToday + reportedLeftQuota;
  const dailyEnergyLimit = reportedDailyEnergyLimit > 0
    ? reportedDailyEnergyLimit
    : quotaIsStale ? PODOGREV_DAILY_ENERGY_LIMIT : 0;
  const claimedToday = quotaIsStale ? 0 : reportedClaimedToday;
  const leftQuota = quotaIsStale ? dailyEnergyLimit : reportedLeftQuota;
  return {
    available: inbox.length,
    claimedToday,
    leftQuota,
    dailyEnergyLimit,
    collectableEnergy: Math.min(inbox.length, leftQuota),
    lastClaimDate,
    inboxTypes: inbox.reduce((result, item) => {
      const key = String(item.type ?? "unknown");
      result[key] = asNonNegativeInt(result[key], 0) + 1;
      return result;
    }, {}),
  };
}

function normalizePrisonAutomationState(value = {}) {
  const targetType = String(value.targetType || "prison").toLowerCase() === "master" ? "master" : "prison";
  const fallbackTargetId = asPositiveInt(value.targetId, 1);
  const sourceQueue = Array.isArray(value.queue)
    ? value.queue
    : [{
        targetType,
        targetId: fallbackTargetId,
        isDay: toBool(value.isDay, true),
        repeatCount: 1,
        origin: "migration",
        priority: 0,
      }];
  const seenQueueItemIds = new Set();
  const queue = sourceQueue.map((rawItem, index) => {
    if (!rawItem || typeof rawItem !== "object") {
      return null;
    }
    const itemTargetType = String(rawItem.targetType || "prison").toLowerCase() === "master"
      ? "master"
      : "prison";
    const targetId = asPositiveInt(rawItem.targetId, null);
    if (!targetId) {
      return null;
    }
    let queueItemId = String(
      rawItem.queueItemId
      || `${rawItem.origin || "manual"}-${itemTargetType}-${targetId}-${index + 1}`,
    ).trim();
    if (seenQueueItemIds.has(queueItemId)) {
      queueItemId = `${queueItemId}-${index + 1}`;
    }
    seenQueueItemIds.add(queueItemId);
    const origin = String(rawItem.origin || "manual").trim() || "manual";
    const isZarubaTask = Boolean(rawItem.serverTaskId && origin.includes("zaruba"));
    const goalType = isZarubaTask
      ? "task"
      : String(rawItem.goalType || rawItem.targetMetric || "runs").toLowerCase() === "collection"
        ? "collection"
        : "runs";
    const completedRuns = Math.min(10_000, asNonNegativeInt(rawItem.completedRuns, 0));
    const legacyRemainingRuns = Math.min(10_000, asPositiveInt(rawItem.repeatCount, 1));
    const runTarget = goalType === "runs"
      ? Math.min(
          10_000,
          Math.max(1, asPositiveInt(rawItem.runTarget, completedRuns + legacyRemainingRuns)),
        )
      : null;
    const remainingRuns = goalType === "runs"
      ? Math.max(0, runTarget - completedRuns)
      : 1;
    return {
      queueItemId,
      targetType: itemTargetType,
      targetId,
      isDay: itemTargetType === "master" ? true : toBool(rawItem.isDay, true),
      goalType,
      runTarget,
      completedRuns,
      repeatCount: remainingRuns,
      origin,
      priority: Math.min(1_000, Math.max(-1_000, asNumber(rawItem.priority, 0))),
      ...(rawItem.observedRuns !== undefined && rawItem.observedRuns !== null
        ? { observedRuns: Math.min(1_000_000_000, asNonNegativeInt(rawItem.observedRuns, 0)) }
        : {}),
      ...(rawItem.lastCompletionToken ? { lastCompletionToken: String(rawItem.lastCompletionToken) } : {}),
      ...(asNonNegativeInt(rawItem.collectionCollected, 0) > 0
        ? { collectionCollected: asNonNegativeInt(rawItem.collectionCollected, 0) }
        : {}),
      ...(asNonNegativeInt(rawItem.collectionTotal, 0) > 0
        ? { collectionTotal: asNonNegativeInt(rawItem.collectionTotal, 0) }
        : {}),
      ...(asNonNegativeInt(rawItem.collectionMissing, 0) > 0
        ? { collectionMissing: asNonNegativeInt(rawItem.collectionMissing, 0) }
        : {}),
      ...(rawItem.collectionCheckedAt ? { collectionCheckedAt: String(rawItem.collectionCheckedAt) } : {}),
      ...(rawItem.serverTaskId ? { serverTaskId: String(rawItem.serverTaskId) } : {}),
      ...(rawItem.taskLabel ? { taskLabel: String(rawItem.taskLabel) } : {}),
      ...(rawItem.strategy ? { strategy: String(rawItem.strategy) } : {}),
      ...(rawItem.objective ? { objective: String(rawItem.objective) } : {}),
      ...(rawItem.planMode ? { planMode: String(rawItem.planMode) } : {}),
      ...(rawItem.imageUrl ? { imageUrl: String(rawItem.imageUrl) } : {}),
      ...(asNonNegativeInt(rawItem.taskRequiredAmount, 0) > 0
        ? { taskRequiredAmount: asNonNegativeInt(rawItem.taskRequiredAmount, 0) }
        : {}),
      ...(asNonNegativeInt(rawItem.taskCurrentAmount, 0) > 0
        ? { taskCurrentAmount: asNonNegativeInt(rawItem.taskCurrentAmount, 0) }
        : {}),
      ...(asNonNegativeInt(rawItem.plannedSteps, 0) > 0
        ? { plannedSteps: asNonNegativeInt(rawItem.plannedSteps, 0) }
        : {}),
      ...(asNonNegativeInt(rawItem.plannedEnergy, 0) > 0
        ? { plannedEnergy: asNonNegativeInt(rawItem.plannedEnergy, 0) }
        : {}),
      ...(asNonNegativeInt(rawItem.plannedPoints, 0) > 0
        ? { plannedPoints: asNonNegativeInt(rawItem.plannedPoints, 0) }
        : {}),
      ...(asNonNegativeInt(rawItem.profitRespect, 0) > 0
        ? { profitRespect: asNonNegativeInt(rawItem.profitRespect, 0) }
        : {}),
      ...(toBool(rawItem.waitingForProfit, false) ? { waitingForProfit: true } : {}),
    };
  }).filter(Boolean);
  const activeTarget = queue[0] || {
    targetType,
    targetId: fallbackTargetId,
    isDay: toBool(value.isDay, true),
  };
  const energyPolicyValue = value.energyPolicy && typeof value.energyPolicy === "object"
    ? value.energyPolicy
    : {};
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const sameDay = String(energyPolicyValue.dayKey || "") === dayKey;
  return {
    version: asNonNegativeInt(value.version, 0),
    enabled: toBool(value.enabled, false),
    targetType: activeTarget.targetType,
    targetId: activeTarget.targetId,
    isDay: activeTarget.isDay,
    queue,
    stepsPerTick: Math.min(50, asPositiveInt(value.stepsPerTick, 1)),
    delayMs: Math.min(60_000, asNonNegativeInt(value.delayMs, 250)),
    intervalSec: Math.max(
      MIN_PRISON_AUTOMATION_INTERVAL_SEC,
      asPositiveInt(value.intervalSec, DEFAULT_PRISON_AUTOMATION_INTERVAL_SEC),
    ),
    minEnergy: asNonNegativeInt(value.minEnergy, 0),
    usePodogrev: toBool(value.usePodogrev, true),
    autoCollectProfit: toBool(value.autoCollectProfit, true),
    autoBuyMasterItems: toBool(value.autoBuyMasterItems, false),
    energyPolicy: {
      order: energyPolicyValue.order === "soap_chefir" ? "soap_chefir" : "chefir_soap",
      allowChefir: toBool(energyPolicyValue.allowChefir, false),
      allowSoap: toBool(energyPolicyValue.allowSoap, false),
      chefirReserve: asNonNegativeInt(energyPolicyValue.chefirReserve, 0),
      soapDailyLimit: asNonNegativeInt(energyPolicyValue.soapDailyLimit, 0),
      chefirDailyLimit: asNonNegativeInt(energyPolicyValue.chefirDailyLimit, 0),
      dayKey,
      soapSpentToday: sameDay ? asNonNegativeInt(energyPolicyValue.soapSpentToday, 0) : 0,
      chefirSpentToday: sameDay ? asNonNegativeInt(energyPolicyValue.chefirSpentToday, 0) : 0,
    },
    updatedAt: value.updatedAt || null,
    lastTickStartedAt: value.lastTickStartedAt || null,
    lastTickFinishedAt: value.lastTickFinishedAt || null,
    lastAction: value.lastAction || null,
    lastError: value.lastError || null,
  };
}

module.exports = {
  BUSINESS_COLLECT_COOLDOWN_MS,
  DEFAULT_PRISON_AUTOMATION_INTERVAL_SEC,
  MIN_PRISON_AUTOMATION_INTERVAL_SEC,
  PRISON_COLLECTION_ZONE_COUNT,
  normalizeBusinessDashboard,
  normalizeCollectionDashboard,
  normalizeMasterEnterResponse,
  normalizePodogrevDashboard,
  normalizePrisonAutomationState,
};
