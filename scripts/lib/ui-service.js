const fs = require("node:fs/promises");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { purchaseMonthlyDay } = require("./monthly-purchase");
const { createDailyToiletPaperCollector } = require("./daily-toilet-paper");
const dailyToiletPaperCollector = createDailyToiletPaperCollector({ withContext });
const { normalizeMonthlyPolicy, monthlyTaskEnabled, applyMonthlyTargets } = require("./quest-policy");

const {
  DEFAULT_BASE_URL,
  createApiClient,
  loadSessionSnapshot,
  resolveSessionPath,
} = require("./api-client");
const { collectLeaderboardIds } = require("./id-collector");
const {
  createDamageIntel,
  createDamageReport,
  createDamageSnapshot,
  saveDamageSnapshot,
} = require("./damage-history");
const {
  attachWeeklyDamage,
  evaluateFriendCriteria,
  loadWeeklyDamageMap,
  normalizeCriteriaOptions: normalizeFriendCriteriaOptions,
  normalizeFriendCandidateRecord,
  normalizeIncomingFriendRequestRecords,
  serializeCriteria: serializeFriendCriteria,
} = require("./friends-maintenance");
const { buildBossCatalog, buildBossLimitsView } = require("./boss-catalog");
const {
  ACTION_DEFINITIONS,
  buildBossActionCatalog,
  buildBossUseWeaponPayload,
  normalizeBossActionType,
  parseBossHitSequence,
} = require("./boss-actions");
const {
  buildActiveSessionView,
  buildBossQueueView,
  prepareBossRunnerHit,
  prepareBossRunnerStart,
} = require("./boss-runner");
const {
  buildPrisonWorkRequest,
  executePrisonRunnerOnce,
  loadPrisonDetail,
} = require("./prison-runner");
const {
  normalizeBusinessDashboard,
  normalizeMasterEnterResponse,
  normalizePodogrevDashboard,
  normalizePrisonAutomationState,
} = require("./prison-dashboard");
const {
  addAmounts,
  calculatePlayerResourceDelta,
  classifyMonthlyDay,
  getMonthlyPrisonProfitPlan,
  normalizeMiscAutomationState,
  normalizeMonthlyDashboard,
  normalizePlayerResourceSnapshot,
  normalizeStashDashboard,
} = require("./misc-dashboard");
const {
  buildLootContainersDashboard,
  enrichLootContainerEntryWithCatalog,
  enrichLootRewardsWithCatalog,
  normalizeBaulOpenResult,
  normalizeParcelOpenResult,
} = require("./loot-containers");
const {
  buildWearableCollectionDashboard,
  buildWearableDashboard,
  loadWearableCatalog,
  normalizeSearchText,
  readWearableCatalogCache,
} = require("./wearable-catalog");
const { canBuyKeysForBoss } = require("./boss-keys");
const {
  getLetsCookAutomationState,
  getLetsCookDashboard,
  initializeLetsCookAutomation,
  runLetsCookAutomationTick,
  updateLetsCookAutomation,
} = require("./lets-cook");
const { ARTIFACTS_DIR } = require("./pbot");
const { getSupportersDirectory: loadSupportersDirectory } = require("./supporters-directory");
const { VERBOSE_LOGGING, logEvent } = require("./logger");
const {
  createProPrisonFeatureService,
  normalizeZarubaWeaponStats,
  normalizeZarubaState,
  normalizeZarubaTasks,
  selectZarubaDamageWeapon,
} = require("./pro-prison-features");
const {
  buildMasterKnowledgePlan,
  buildPrisonRespectPlan,
  sumFirst,
} = require("./zaruba-planner");

const INTERACTION_TYPES = new Set([
  "UpgradeBiceps",
  "Fight",
  "Harknut",
  "TossDroj",
]);
const ONE_PER_DAY_INTERACTION_TYPES = new Set([
  "UpgradeBiceps",
  "Harknut",
  "TossDroj",
]);
const LOWEST_AUTHORITY_INTERACTION_TYPES = new Set([
  "Fight",
  "Harknut",
  "TossDroj",
]);
const HIGHEST_AUTHORITY_INTERACTION_TYPES = new Set([
  "UpgradeBiceps",
]);
const FRIEND_PROFILE_PAGE_SIZE = 100;
const MAX_FRIEND_PROFILE_PAGES = 512;

const DEFAULT_KEY_PRICE_RUBLES = 6;
const DEFAULT_KEY_PRICE_PROBE_DELAY_MS = 300;
const DEFAULT_MAX_KEY_SHORTAGE_BUY_ROUNDS = 8;
const BOSS_SURRENDER_SOAP_COST = 2;
const DEFAULT_BOSS_AUTOMATION_INTERVAL_SEC = 10;
const MIN_BOSS_AUTOMATION_INTERVAL_SEC = 5;
const BOSS_AUTOMATION_ERROR_BACKOFF_MS = 60_000;
const BOSS_AUTOMATION_DAILY_LIMIT_BACKOFF_MS = 30 * 60_000;
const BOSS_AUTOMATION_RATE_LIMIT_BACKOFF_MS = 90_000;
const BOSS_AUTOMATION_AFTER_START_POLL_MS = 1_250;
const BOSS_AUTOMATION_ACTIVE_POLL_MS = 2_500;
const BOSS_AUTOMATION_START_CONFIRM_RETRY_MS = 650;
const BOSS_AUTOMATION_MAX_CHAIN_STARTS = 5;
const BOSS_REWARD_SETTLE_RETRY_DELAYS_MS = Object.freeze([0]);
const BOSS_REWARD_BACKGROUND_RETRY_DELAYS_MS = Object.freeze([
  100, 250, 500, 1_000, 2_000, 4_000, 8_000, 15_000, 30_000, 30_000,
]);
const ALWAYS_AUTO_BUY_START_BOSS_IDS = new Set([3]);
const BOSS_KEY_PRICES_LATEST_PATH = path.join(ARTIFACTS_DIR, "boss-key-prices-latest.json");
const BOSS_AUTOMATION_LATEST_PATH = path.join(ARTIFACTS_DIR, "boss-automation-latest.json");
const BOSS_AUTOMATION_EVENTS_LATEST_PATH = path.join(ARTIFACTS_DIR, "boss-automation-events-latest.json");
const PRISON_AUTOMATION_LATEST_PATH = path.join(ARTIFACTS_DIR, "prison-automation-latest.json");
const PRISON_AUTOMATION_ACCOUNT_MIGRATION_PATH = path.join(
  ARTIFACTS_DIR,
  "prison-automation-account-migration.json",
);
const PRISON_ENERGY_COSTS_LATEST_PATH = path.join(ARTIFACTS_DIR, "prison-energy-costs-latest.json");
const MISC_AUTOMATION_LATEST_PATH = path.join(ARTIFACTS_DIR, "misc-automation-latest.json");
const MISC_VPARIT_LATEST_PATH = path.join(ARTIFACTS_DIR, "misc-vparit-latest.json");
const MISC_MINIGAME_HISTORY_PATH = path.join(ARTIFACTS_DIR, "misc-minigame-history.json");
const MISC_MINIGAME_AUTOMATION_LATEST_PATH = path.join(ARTIFACTS_DIR, "misc-minigame-automation-latest.json");
const FARTOVY_AUTOSPIN_SETTINGS_PATH = path.join(ARTIFACTS_DIR, "fartovy-autospin-settings.json");
const LOOT_CONTAINERS_HISTORY_PATH = path.join(ARTIFACTS_DIR, "loot-containers-history.json");
const LOOT_CONTAINERS_STATS_PATH = path.join(ARTIFACTS_DIR, "loot-container-stats.json");
const SPONSOR_PROFILE_CACHE_TTL_MS = 24 * 60 * 60_000;
const SPONSOR_PROFILE_CONCURRENCY = 4;
const SLOTS_AUTOSPIN_POLL_INTERVAL_MS = 5_000;
const FARTOVY_AUTOSPIN_SUPERVISOR_INTERVAL_MS = 5_000;
const MISC_DASHBOARD_CACHE_TTL_MS = 30_000;
const MONTHLY_ENERGY_SOURCES_CACHE_TTL_MS = 5 * 60_000;
const PRISON_ENERGY_COSTS_CACHE_TTL_MS = 24 * 60 * 60_000;
const FRIENDS_INTERACTION_PROGRESS_PATH = path.join(ARTIFACTS_DIR, "friends-interaction-progress-latest.json");
const ECONOMY_HISTORY_PATH = path.join(ARTIFACTS_DIR, "economy-history.json");
const ECONOMY_HISTORY_RETENTION_MS = 8 * 24 * 60 * 60_000;
const ECONOMY_HISTORY_HEARTBEAT_MS = 15 * 60_000;
const HEADER_EXTRAS_CACHE_TTL_MS = 5 * 60_000;
const HEADER_ACHIEVEMENT_TYPE = "battle12";
const VPI_AUTO_CLAIM_GRACE_MS = 1_500;
const VPI_AUTO_CLAIM_RETRY_MS = 60_000;
const VPI_AUTO_CLAIM_IDLE_RECHECK_MS = 15 * 60_000;
const VPI_AUTO_CLAIM_MAX_DELAY_MS = 2_147_000_000;
// Live measurements show that the vparit endpoint accepts one completed sale
// roughly every 2.5 seconds. These requests bypass the busy background queue,
// then follow that server cooldown; 429 responses still retain retry backoff.
const VPARIT_REQUEST_INTERVAL_MS = 2_500;
const VPARIT_RATE_LIMIT_RETRIES = 8;
let prisonAutomationStateWriteSequence = 0;
const BOSS_COMBO_REWARDS_URL = "https://oldprison-prod.luckygem.online/assets/PrisonV3/bosses/JSON/boss_combo_rewards_v5.json";
const MAX_BOSS_AUTOMATION_EVENTS = 800;
const MAX_BOSS_AUTOMATION_ROUTINE_EVENTS = 100;
const MAX_BOSS_RECENT_ACTIVITY = 60;
const BOSS_CONSUMABLE_PRICES_RUBLES = Object.freeze({
  poison: 18,
  gunshot: 5,
  knife: 4,
});
const BOSS_MELEE_RESTORE_PRICE_RUBLES = 3;
const ZARUBA_WHEEL_TICKET_PRICE_RUBLES = 10;
const PODOGREV_ENERGY_BY_TYPE = Object.freeze({
  1: 3,
  2: 5,
  3: 7,
  4: 8,
  5: 10,
});
const MELEE_BOSS_ACTION_KEYS = new Set(
  ACTION_DEFINITIONS
    .filter((definition) => definition && definition.category === "melee")
    .map((definition) => String(definition.key)),
);
const BOSS_CONSUMABLE_ACTION_KEYS = new Set(
  ACTION_DEFINITIONS
    .filter((definition) => definition && definition.category === "consumable")
    .map((definition) => String(definition.key)),
);
const BOSS_WEAPON_BATCH_COUNTS = new Set([1, 10, 50, 100, 1000]);
const RESTORE_FREE_HIT_WEAPON_TYPE_BY_KEY = {
  punchChest: "PunchChest",
  kickBalls: "KickBalls",
  pokeEyes: "PokeEyes",
  kneeEar: "KneeEar",
};
const BOSS_MELEE_COOLDOWN_FIELDS = Object.freeze({
  punchChest: Object.freeze({
    last: "lastPunchChestTime",
    cooldown: "punchChestCooldownSec",
    reduction: "punchChestCooldownReduction",
  }),
  kickBalls: Object.freeze({
    last: "lastKickBallsTime",
    cooldown: "kickBallsCooldownSec",
    reduction: "kickBallsCooldownReduction",
  }),
  pokeEyes: Object.freeze({
    last: "lastPokeEyesTime",
    cooldown: "pokeEyesCooldownSec",
    reduction: "pokeEyesCooldownReduction",
  }),
  kneeEar: Object.freeze({
    last: "lastKneeEarTime",
    cooldown: "kneeEarCooldownSec",
    reduction: "kneeEarCooldownReduction",
  }),
});
const DEFAULT_BOSS_MELEE_COOLDOWN_MS = 8 * 60 * 60 * 1000;
const BOSS_HIT_SNAPSHOT_GRACE_MS = 5000;
const MAX_FRIENDS_INVITE_PROGRESS_ENTRIES = 25;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAMAGE_HISTORY_CAPTURE_INTERVAL_MS = 15 * 60_000;
const friendsInviteProgressByKey = new Map();
const sponsorProfileCache = new Map();
const bossAutomationRuntime = {
  initialized: false,
  state: null,
  accountId: null,
  statePath: null,
  eventsPath: null,
  timerId: null,
  followupTimerId: null,
  running: false,
  tickCount: 0,
  lastTickStartedAt: null,
  lastTickFinishedAt: null,
  lastError: null,
  lastAction: null,
  lastStarted: null,
  snoozedUntil: null,
  snoozeReason: null,
  pendingReward: null,
  recentActivity: [],
  events: [],
};
let bossAutomationSerializedOperation = Promise.resolve();
let bossAutomationStateSerializedOperation = Promise.resolve();
let bossAutomationEventSerializedOperation = Promise.resolve();
const bossRewardSettlementTasks = new Map();
const prisonAutomationRuntime = {
  initialized: false,
  state: null,
  accountId: null,
  statePath: null,
  sessionPath: null,
  timerId: null,
  running: false,
  tickCount: 0,
  lastMaintenanceCheckAt: 0,
};
let prisonAutomationSerializedOperation = Promise.resolve();
const miscAutomationRuntime = {
  initialized: false,
  state: null,
  accountId: null,
  statePath: null,
  sessionPath: null,
  timerId: null,
  running: false,
  tickCount: 0,
};
const miscVparitRuntime = {
  running: false,
  phase: "idle",
  startedAt: null,
  finishedAt: null,
  sellingStartedAt: null,
  sellingFinishedAt: null,
  planned: 0,
  processed: 0,
  sold: 0,
  failed: 0,
  rateLimitRetries: 0,
  failures: [],
  rewards: {},
  authority: 0,
  rewardsMeasured: false,
  resourceSnapshotError: null,
  current: null,
  lastError: null,
  lastResult: null,
};
const damageHistoryRuntime = {
  initialized: false,
  timerId: null,
  running: false,
  tickCount: 0,
  lastStartedAt: null,
  lastCapturedAt: null,
  lastError: null,
};
const friendsBatchRuntime = {
  active: null,
  last: null,
  nextId: 1,
};
let miscAutomationSerializedOperation = Promise.resolve();
let friendsActionSerializedOperation = Promise.resolve();
let miscVparitPromise = null;
let miscMiniGameHistoryCache = null;
let miscMiniGameWearableCatalogCache;
let miscMiniGameAutomationPromise = null;
const miniGameSerializedOperations = new Map();
let fartovyAutoSpinSettingsCache = null;
let fartovyAutoSpinSettingsAccountId = null;
let fartovyAutoSpinSupervisorTimerId = null;
let fartovyAutoSpinSupervisorRunning = false;
let lootContainerHistoryCache = null;
let lootContainerStatsCache = null;
let lootContainerWearableCatalogCache;
let lootContainerSerializedOperation = Promise.resolve();
let miscDashboardCache = null;
let miscDashboardInflight = null;
let prisonEnergyCostsCache = null;
let prisonEnergyCostsInflight = null;
let economyHistoryCache = null;
let economyHistoryOperation = Promise.resolve();
const economyStatusCache = new Map();
const headerExtrasCache = new Map();
const wearableInventoryCache = new Map();
const wearableInventoryInflight = new Map();
const vpiAutoClaimRuntime = {
  initialized: false,
  timerId: null,
  inFlight: null,
  generation: 0,
  sessionPath: null,
  nextCheckAt: null,
};
const miscMiniGameAutomationRuntime = {
  running: false,
  stopRequested: false,
  kind: null,
  startedAt: null,
  finishedAt: null,
  settings: null,
  planned: 0,
  processed: 0,
  successes: 0,
  bonusRounds: 0,
  spent: {},
  current: null,
  lastOutcome: null,
  lastError: null,
  reason: null,
  lastResult: null,
};
let lowestAuthorityTargetsCache = { loadedAt: 0, items: [] };
let bossComboRewardsCache = { loadedAt: 0, data: null };
let monthlyEnergySourcesCache = { loadedAt: 0, key: "", sources: { masters: {}, prisons: {} } };

const BOSS_WEAPON_COUNT_FIELDS = Object.freeze({
  poison: "poisonCount",
  gunshot: "gunshotCount",
  knife: "knifeCount",
});

function getMoscowDateKey(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const safeDate = Number.isNaN(value.getTime()) ? new Date() : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(safeDate);
  const values = {};
  for (const part of parts) {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      values[part.type] = part.value;
    }
  }
  if (values.year && values.month && values.day) {
    return `${values.year}-${values.month}-${values.day}`;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(safeDate);
}

function normalizeInteractionProgress(rawValue, dayKey = getMoscowDateKey()) {
  const raw = rawValue && typeof rawValue === "object" ? rawValue : {};
  const completedByType = {};
  const source = raw.dayKey === dayKey && raw.completedByType && typeof raw.completedByType === "object"
    ? raw.completedByType
    : {};

  for (const type of ONE_PER_DAY_INTERACTION_TYPES) {
    const seen = new Set();
    const ids = Array.isArray(source[type]) ? source[type] : [];
    completedByType[type] = ids
      .map((value) => String(value || "").trim())
      .filter((value) => /^\d+$/.test(value) && !seen.has(value) && (seen.add(value), true));
  }

  return {
    version: 1,
    dayKey,
    updatedAt: raw.dayKey === dayKey && raw.updatedAt ? raw.updatedAt : null,
    completedByType,
  };
}

async function readInteractionProgress(dayKey = getMoscowDateKey()) {
  try {
    const body = await fs.readFile(FRIENDS_INTERACTION_PROGRESS_PATH, "utf8");
    return normalizeInteractionProgress(JSON.parse(body), dayKey);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return normalizeInteractionProgress({}, dayKey);
    }
    throw error;
  }
}

async function saveInteractionProgress(progress) {
  const normalized = normalizeInteractionProgress(progress, progress && progress.dayKey ? progress.dayKey : getMoscowDateKey());
  normalized.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(FRIENDS_INTERACTION_PROGRESS_PATH), { recursive: true });
  await fs.writeFile(FRIENDS_INTERACTION_PROGRESS_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

function hasCompletedInteraction(progress, type, userId) {
  if (!ONE_PER_DAY_INTERACTION_TYPES.has(type)) {
    return false;
  }
  const values = progress && progress.completedByType && Array.isArray(progress.completedByType[type])
    ? progress.completedByType[type]
    : [];
  return values.includes(String(userId));
}

function markCompletedInteraction(progress, type, userId) {
  if (!ONE_PER_DAY_INTERACTION_TYPES.has(type)) {
    return false;
  }
  const userIdValue = String(userId || "").trim();
  if (!/^\d+$/.test(userIdValue)) {
    return false;
  }
  if (!Array.isArray(progress.completedByType[type])) {
    progress.completedByType[type] = [];
  }
  if (progress.completedByType[type].includes(userIdValue)) {
    return false;
  }
  progress.completedByType[type].push(userIdValue);
  return true;
}

function runFriendsActionSerialized(operation) {
  const run = friendsActionSerializedOperation.catch(() => undefined).then(operation);
  friendsActionSerializedOperation = run.catch(() => undefined);
  return run;
}

function getFriendsBatchProgressView(batch) {
  if (!batch) {
    return null;
  }

  const nowMs = Date.now();
  const startedAtMs = Number(batch.startedAtMs) || nowMs;
  const endedAtMs = Number(batch.finishedAtMs) || nowMs;
  const elapsedMs = Math.max(0, endedAtMs - startedAtMs);
  const completed = Math.max(0, Number(batch.completed) || 0);
  const total = batch.total === null || batch.total === undefined
    ? null
    : Math.max(0, Number(batch.total) || 0);
  const talentTotalsTotal = batch.talentTotalsTotal === null || batch.talentTotalsTotal === undefined
    ? null
    : Math.max(0, Number(batch.talentTotalsTotal) || 0);
  const displayCompleted = total === null
    ? talentTotalsTotal !== null
      ? Math.max(0, Number(batch.talentTotalsLoaded) || 0)
      : Math.max(0, Number(batch.profilePagesLoaded ?? batch.requestPagesLoaded) || 0)
    : completed;
  const displayTotal = total === null
    ? talentTotalsTotal !== null
      ? talentTotalsTotal
      : batch.profilePagesTotal === null || batch.profilePagesTotal === undefined
        ? null
        : Math.max(0, Number(batch.profilePagesTotal) || 0)
    : total;
  const phaseStartedAtMs = Number(batch.phaseStartedAtMs) || startedAtMs;
  const phaseElapsedMs = Math.max(0, endedAtMs - phaseStartedAtMs);
  const ratePerSecond = phaseElapsedMs > 0 && displayCompleted > 0
    ? displayCompleted / (phaseElapsedMs / 1000)
    : null;
  const remaining = displayTotal === null ? null : Math.max(0, displayTotal - displayCompleted);
  const estimatedRemainingMs = ratePerSecond && remaining !== null
    ? Math.ceil((remaining / ratePerSecond) * 1000)
    : null;

  return {
    id: batch.id,
    kind: batch.kind,
    status: batch.status,
    stage: batch.stage,
    total,
    completed,
    displayTotal,
    displayCompleted,
    okCount: Math.max(0, Number(batch.okCount) || 0),
    failCount: Math.max(0, Number(batch.failCount) || 0),
    currentTarget: batch.currentTarget || null,
    friendsTotal: batch.friendsTotal ?? null,
    authorityProfilesTotal: batch.authorityProfilesTotal ?? null,
    profilePagesLoaded: batch.profilePagesLoaded ?? null,
    profilePagesTotal: batch.profilePagesTotal ?? null,
    requestPagesLoaded: batch.requestPagesLoaded ?? null,
    incomingRequestsLoaded: batch.incomingRequestsLoaded ?? null,
    talentTotalsLoaded: batch.talentTotalsLoaded ?? null,
    talentTotalsTotal,
    talentTotalsUnavailable: batch.talentTotalsUnavailable ?? null,
    startedAt: new Date(startedAtMs).toISOString(),
    updatedAt: batch.updatedAt,
    finishedAt: batch.finishedAt || null,
    elapsedMs,
    phaseElapsedMs,
    ratePerSecond,
    remaining,
    estimatedRemainingMs,
    error: batch.error || null,
  };
}

function startFriendsBatch(kind) {
  const startedAtMs = Date.now();
  const batch = {
    id: friendsBatchRuntime.nextId,
    kind,
    status: "running",
    stage: "Preparing",
    total: null,
    completed: 0,
    okCount: 0,
    failCount: 0,
    currentTarget: null,
    friendsTotal: null,
    authorityProfilesTotal: null,
    profilePagesLoaded: null,
    profilePagesTotal: null,
    requestPagesLoaded: null,
    incomingRequestsLoaded: null,
    talentTotalsLoaded: null,
    talentTotalsTotal: null,
    talentTotalsUnavailable: null,
    startedAtMs,
    phaseStartedAtMs: startedAtMs,
    updatedAt: new Date(startedAtMs).toISOString(),
    finishedAtMs: null,
    finishedAt: null,
    error: null,
  };
  friendsBatchRuntime.nextId += 1;
  friendsBatchRuntime.active = batch;

  const update = (patch = {}) => {
    Object.assign(batch, patch, { updatedAt: new Date().toISOString() });
    return batch;
  };

  return {
    update,
    setPlan(total, patch = {}) {
      return update({
        total: Math.max(0, Number(total) || 0),
        phaseStartedAtMs: Date.now(),
        ...patch,
      });
    },
    completeTarget(target, ok) {
      return update({
        completed: batch.completed + 1,
        okCount: batch.okCount + (ok ? 1 : 0),
        failCount: batch.failCount + (ok ? 0 : 1),
        currentTarget: target ? String(target) : null,
      });
    },
  };
}

function runFriendsBatchSerialized(kind, operation) {
  return runFriendsActionSerialized(async () => {
    const progress = startFriendsBatch(kind);
    const batch = friendsBatchRuntime.active;
    try {
      const result = await operation(progress);
      progress.update({
        status: "completed",
        stage: "Completed",
        currentTarget: null,
        finishedAtMs: Date.now(),
        finishedAt: new Date().toISOString(),
      });
      return result;
    } catch (error) {
      progress.update({
        status: "failed",
        stage: "Failed",
        currentTarget: null,
        error: error && error.message ? error.message : String(error),
        finishedAtMs: Date.now(),
        finishedAt: new Date().toISOString(),
      });
      throw error;
    } finally {
      friendsBatchRuntime.last = batch;
      if (friendsBatchRuntime.active === batch) {
        friendsBatchRuntime.active = null;
      }
    }
  });
}

function getFriendsBatchProgress() {
  return {
    active: getFriendsBatchProgressView(friendsBatchRuntime.active),
    last: getFriendsBatchProgressView(friendsBatchRuntime.last),
  };
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

function asPositiveInt(value, fallback = null) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function asNonNegativeInt(value, fallback = null) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function asNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function decodeJwtPayload(token) {
  if (typeof token !== "string" || token.trim() === "") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0
      ? ""
      : "=".repeat(4 - (normalized.length % 4));
    return JSON.parse(Buffer.from(`${normalized}${padding}`, "base64").toString("utf8"));
  } catch (error) {
    void error;
    return null;
  }
}

function getTokenUserId(token) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const value = payload.userId ?? payload.user_id ?? payload.sub ?? null;
  return value === null || value === undefined || String(value).trim() === ""
    ? null
    : String(value).trim();
}

function toIsoFromUnixSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const milliseconds = Math.trunc(seconds * 1000);
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseInitDataUnsafeString(initData) {
  const raw = typeof initData === "string" ? initData.trim() : "";
  if (!raw) {
    return null;
  }

  const params = new URLSearchParams(raw);
  const payload = {};

  for (const [key, value] of params.entries()) {
    if (key === "user") {
      try {
        payload[key] = JSON.parse(value);
      } catch (error) {
        void error;
        payload[key] = value;
      }
      continue;
    }

    payload[key] = value;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

function extractTokensFromAuthResponse(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const sources = [payload, payload.data, payload.result].filter(Boolean);
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }
    const accessToken = source.accessToken || source.access_token || source.token || null;
    const refreshToken = source.refreshToken || source.refresh_token || null;
    if (accessToken || refreshToken) {
      return { accessToken, refreshToken };
    }
  }

  return null;
}

function extractPlayerNickname(payload, selfUserId = null) {
  const targetId = selfUserId === null || selfUserId === undefined ? null : String(selfUserId);
  const queue = [{ value: payload, depth: 0 }];
  const seen = new Set();
  let fallback = null;

  while (queue.length > 0) {
    const { value, depth } = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value) || depth > 5) {
      continue;
    }
    seen.add(value);
    const objectId = value.userId ?? value.user_id ?? value.id ?? value.uid ?? null;
    const nickname = [value.nickname, value.nick, value.playerName]
      .find((candidate) => typeof candidate === "string" && candidate.trim());
    if (nickname) {
      const normalized = nickname.trim();
      if (targetId && objectId !== null && objectId !== undefined && String(objectId) === targetId) {
        return normalized;
      }
      if (depth <= 2) {
        fallback ||= normalized;
      }
    }
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") {
        queue.push({ value: child, depth: depth + 1 });
      }
    }
  }
  return fallback;
}

async function loadPlayerNickname(baseUrl, session, tokens, selfUserId) {
  try {
    const client = await createApiClient({
      baseUrl,
      session,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || null,
      persistSession: false,
    });
    const response = await client.players.init({ rateLimitRetries: 0 });
    return extractPlayerNickname(response && response.data, selfUserId);
  } catch (error) {
    logEvent("auth.accounts.nickname_error", { error });
    return null;
  }
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    void error;
    return { raw: text };
  }
}

function resolveBaseUrlForSession(session, overrideValue) {
  const override = typeof overrideValue === "string" ? overrideValue.trim() : "";
  if (override) {
    try {
      return new URL(override).origin;
    } catch (error) {
      void error;
      return override.replace(/\/+$/, "");
    }
  }

  const frameUrl = session && session.frameUrl
    ? session.frameUrl
    : session && session.game
      ? session.game.frameUrl
      : null;

  if (frameUrl) {
    try {
      return new URL(frameUrl).origin;
    } catch (error) {
      void error;
    }
  }

  return DEFAULT_BASE_URL;
}

async function loadSessionSnapshotSafe(resolvedSessionPath) {
  try {
    const session = await loadSessionSnapshot(resolvedSessionPath);
    if (!session || typeof session !== "object") {
      return { session: {}, exists: false };
    }

    return {
      session,
      exists: true,
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { session: {}, exists: false };
    }
    throw error;
  }
}

async function saveSessionSnapshot(resolvedSessionPath, session) {
  await fs.mkdir(path.dirname(resolvedSessionPath), { recursive: true });
  await fs.writeFile(resolvedSessionPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

function getAuthAccountMeta(initData, options = {}) {
  const normalizedInitData = typeof initData === "string" ? initData.trim() : "";
  if (!normalizedInitData) {
    return null;
  }

  const unsafe = parseInitDataUnsafeString(normalizedInitData) || {};
  const user = unsafe.user && typeof unsafe.user === "object" ? unsafe.user : {};
  const selfUserId = user.id !== undefined && user.id !== null ? String(user.id) : null;
  const fallbackId = createHash("sha256").update(normalizedInitData).digest("hex").slice(0, 16);
  const accountId = selfUserId || `initdata-${fallbackId}`;
  const nickname = typeof options.nickname === "string" ? options.nickname.trim() : "";

  return {
    accountId,
    selfUserId,
    authSource: "initData",
    nickname: nickname || null,
    displayName: nickname || `Аккаунт ${accountId}`,
    authDateUtc: toIsoFromUnixSeconds(unsafe.auth_date),
    initData: normalizedInitData,
    accessToken: null,
    refreshToken: null,
  };
}

function normalizeAuthAccountEntry(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const initDataMeta = getAuthAccountMeta(value.initData, { nickname: value.nickname });
  const accessToken = typeof value.accessToken === "string" ? value.accessToken.trim() : "";
  const refreshToken = typeof value.refreshToken === "string" ? value.refreshToken.trim() : "";
  const tokenUserId = getTokenUserId(accessToken) || getTokenUserId(refreshToken);
  const directUserId = value.selfUserId !== undefined && value.selfUserId !== null
    ? String(value.selfUserId).trim()
    : "";
  const directAccountId = value.accountId !== undefined && value.accountId !== null
    ? String(value.accountId).trim()
    : "";
  const selfUserId = initDataMeta && initDataMeta.selfUserId || tokenUserId || directUserId || null;
  const accountId = initDataMeta && initDataMeta.accountId || selfUserId || directAccountId;
  if (!accountId || (!initDataMeta && !accessToken)) {
    return null;
  }
  const nickname = typeof value.nickname === "string" && value.nickname.trim()
    ? value.nickname.trim()
    : initDataMeta && initDataMeta.nickname || null;
  const authSource = value.authSource === "tokens" ? "tokens" : initDataMeta ? "initData" : "tokens";
  return {
    accountId,
    selfUserId,
    authSource,
    nickname,
    displayName: nickname || `Аккаунт ${accountId}`,
    authDateUtc: initDataMeta ? initDataMeta.authDateUtc : null,
    initData: initDataMeta ? initDataMeta.initData : null,
    accessToken: accessToken || null,
    refreshToken: refreshToken || null,
    addedAt: typeof value.addedAt === "string" ? value.addedAt : null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    lastUsedAt: typeof value.lastUsedAt === "string" ? value.lastUsedAt : null,
  };
}

function compareAuthAccountFreshness(left, right) {
  const leftUpdated = Date.parse(left && (left.lastUsedAt || left.updatedAt) || "") || 0;
  const rightUpdated = Date.parse(right && (right.lastUsedAt || right.updatedAt) || "") || 0;
  if (leftUpdated !== rightUpdated) {
    return leftUpdated - rightUpdated;
  }
  const leftAuth = Date.parse(left && left.authDateUtc || "") || 0;
  const rightAuth = Date.parse(right && right.authDateUtc || "") || 0;
  if (leftAuth !== rightAuth) {
    return leftAuth - rightAuth;
  }
  return 0;
}

function mergeAuthAccountEntries(entries) {
  const merged = new Map();
  for (const rawEntry of entries) {
    const entry = normalizeAuthAccountEntry(rawEntry);
    if (!entry) {
      continue;
    }
    const existing = merged.get(entry.accountId);
    if (!existing) {
      merged.set(entry.accountId, entry);
      continue;
    }
    const fresher = compareAuthAccountFreshness(entry, existing) >= 0 ? entry : existing;
    merged.set(entry.accountId, {
      ...fresher,
      nickname: fresher.nickname || existing.nickname || entry.nickname || null,
      displayName: fresher.nickname || existing.nickname || entry.nickname || `Аккаунт ${entry.accountId}`,
      initData: fresher.initData || existing.initData || entry.initData || null,
      accessToken: fresher.accessToken || existing.accessToken || entry.accessToken || null,
      refreshToken: fresher.refreshToken || existing.refreshToken || entry.refreshToken || null,
      addedAt: existing.addedAt || entry.addedAt || fresher.updatedAt || null,
      lastUsedAt: [existing.lastUsedAt, entry.lastUsedAt]
        .filter(Boolean)
        .sort()
        .at(-1) || null,
    });
  }
  return [...merged.values()].sort((left, right) => (
    String(left.displayName || left.accountId).localeCompare(String(right.displayName || right.accountId), "ru")
  ));
}

async function readAuthAccountRegistry(resolvedSessionPath) {
  const registryPath = path.join(path.dirname(resolvedSessionPath), "auth-accounts.json");
  try {
    const payload = JSON.parse(await fs.readFile(registryPath, "utf8"));
    return {
      registryPath,
      accounts: Array.isArray(payload && payload.accounts) ? payload.accounts : [],
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { registryPath, accounts: [] };
    }
    throw error;
  }
}

async function readLegacyAuthAccounts(resolvedSessionPath) {
  const directory = path.dirname(resolvedSessionPath);
  const paths = new Set([resolvedSessionPath]);
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && /^session(?:-latest|-[^/]+)?\.json$/i.test(entry.name)) {
        paths.add(path.join(directory, entry.name));
      }
    }
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  const accounts = [];
  for (const sessionFilePath of paths) {
    try {
      const session = await loadSessionSnapshot(sessionFilePath);
      const initData = session && session.telegram && session.telegram.initData;
      const meta = getAuthAccountMeta(initData, {
        nickname: session && session.game && session.game.nickname,
      });
      if (meta) {
        accounts.push({
          ...meta,
          accessToken: session && session.game && session.game.accessToken || null,
          refreshToken: session && session.game && session.game.refreshToken || null,
          addedAt: session.generatedAt || meta.authDateUtc,
          updatedAt: session.generatedAt || meta.authDateUtc,
          lastUsedAt: sessionFilePath === resolvedSessionPath ? session.generatedAt || null : null,
        });
      }
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        logEvent("auth.accounts.legacy_read_error", {
          fileName: path.basename(sessionFilePath),
          error,
        });
      }
    }
  }
  return accounts;
}

async function saveAuthAccountRegistry(registryPath, accounts) {
  await fs.mkdir(path.dirname(registryPath), { recursive: true });
  await fs.writeFile(registryPath, `${JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    accounts,
  }, null, 2)}\n`, "utf8");
}

async function loadAuthAccountRegistry(sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const [{ registryPath, accounts: storedAccounts }, legacyAccounts] = await Promise.all([
    readAuthAccountRegistry(resolvedSessionPath),
    readLegacyAuthAccounts(resolvedSessionPath),
  ]);
  const accounts = mergeAuthAccountEntries([...storedAccounts, ...legacyAccounts]);
  if (JSON.stringify(mergeAuthAccountEntries(storedAccounts)) !== JSON.stringify(accounts)) {
    await saveAuthAccountRegistry(registryPath, accounts);
  }
  return { resolvedSessionPath, registryPath, accounts };
}

function sanitizeAuthAccount(entry, activeAccountId) {
  return {
    accountId: entry.accountId,
    selfUserId: entry.selfUserId,
    nickname: entry.nickname,
    displayName: entry.nickname || `Аккаунт ${entry.accountId}`,
    authSource: entry.authSource,
    authDateUtc: entry.authDateUtc,
    updatedAt: entry.updatedAt,
    lastUsedAt: entry.lastUsedAt,
    active: entry.accountId === activeAccountId,
  };
}

async function getSavedAuthAccounts(sessionPath) {
  const registry = await loadAuthAccountRegistry(sessionPath);
  const { session } = await loadSessionSnapshotSafe(registry.resolvedSessionPath);
  const activeAccountId = buildAuthSummary(session, { sessionExists: true }).selfUserId;
  return {
    activeAccountId,
    count: registry.accounts.length,
    accounts: registry.accounts.map((entry) => sanitizeAuthAccount(entry, activeAccountId)),
  };
}

async function rememberAuthAccount(credentials, resolvedSessionPath) {
  const meta = normalizeAuthAccountEntry(
    typeof credentials === "string" ? { initData: credentials } : credentials,
  );
  if (!meta) {
    return null;
  }
  const registry = await loadAuthAccountRegistry(resolvedSessionPath);
  const now = new Date().toISOString();
  const accounts = mergeAuthAccountEntries([
    ...registry.accounts,
    {
      ...meta,
      addedAt: now,
      updatedAt: now,
      lastUsedAt: now,
    },
  ]);
  await saveAuthAccountRegistry(registry.registryPath, accounts);
  return sanitizeAuthAccount(
    accounts.find((entry) => entry.accountId === meta.accountId),
    meta.accountId,
  );
}

async function requestInitDataTokens(initData, baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });
  const payload = await parseResponseBody(response);
  const payloadSuccess = payload && typeof payload === "object" && Object.hasOwn(payload, "success")
    ? Boolean(payload.success)
    : true;
  const tokens = extractTokensFromAuthResponse(payload);
  if (!response.ok || !payloadSuccess || !tokens || !tokens.accessToken) {
    const message = payload && payload.message ? String(payload.message) : `HTTP ${response.status}`;
    throw new Error(`Keep-alive auth failed: ${message}`);
  }
  return {
    tokens,
    nickname: extractPlayerNickname(payload),
  };
}

async function pingSavedAuthAccount(account, baseUrl) {
  let tokenError = null;
  if (account.accessToken) {
    const client = await createApiClient({
      baseUrl,
      session: {
        frameUrl: `${baseUrl}/game`,
        game: {
          accessToken: account.accessToken,
          refreshToken: account.refreshToken || null,
          frameUrl: `${baseUrl}/game`,
        },
      },
      accessToken: account.accessToken,
      refreshToken: account.refreshToken || null,
      persistSession: false,
    });
    if (account.refreshToken) {
      try {
        await client.refreshAuth();
        return {
          accessToken: client.accessToken,
          refreshToken: client.refreshToken || null,
          nickname: account.nickname || null,
        };
      } catch (error) {
        tokenError = error;
      }
    }
    try {
      const response = await client.players.init({ rateLimitRetries: 0, retryOnAuth: false });
      const payload = response && response.data;
      const payloadSuccess = payload && typeof payload === "object" && Object.hasOwn(payload, "success")
        ? Boolean(payload.success)
        : true;
      if (!response || !response.ok || !payloadSuccess) {
        throw new Error(`Keep-alive request failed: HTTP ${response && response.status || 0}`);
      }
      return {
        accessToken: client.accessToken,
        refreshToken: client.refreshToken || null,
        nickname: extractPlayerNickname(payload, account.selfUserId),
      };
    } catch (error) {
      tokenError ||= error;
    }
  }

  if (account.initData) {
    return requestInitDataTokens(account.initData, baseUrl).then((result) => ({
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken || null,
      nickname: result.nickname,
    }));
  }
  throw tokenError || new Error("Saved account does not contain reusable credentials.");
}

async function keepAliveSavedAuthAccounts(sessionPath) {
  const registry = await loadAuthAccountRegistry(sessionPath);
  const { session } = await loadSessionSnapshotSafe(registry.resolvedSessionPath);
  const baseUrl = resolveBaseUrlForSession(session);
  const activeAccountId = buildAuthSummary(session, { sessionExists: true }).selfUserId;
  const updatedAccounts = [];
  const failures = [];
  let skippedActive = 0;

  for (const account of registry.accounts) {
    if (activeAccountId && account.accountId === activeAccountId) {
      updatedAccounts.push(account);
      skippedActive += 1;
      continue;
    }
    try {
      const refreshed = await pingSavedAuthAccount(account, baseUrl);
      updatedAccounts.push({
        ...account,
        accessToken: refreshed.accessToken || account.accessToken || null,
        refreshToken: refreshed.refreshToken || account.refreshToken || null,
        nickname: refreshed.nickname || account.nickname || null,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      updatedAccounts.push(account);
      failures.push({
        accountId: account.accountId,
        error: error && error.message ? String(error.message) : "keep-alive failed",
      });
    }
  }

  if (registry.accounts.length > 0) {
    await saveAuthAccountRegistry(registry.registryPath, mergeAuthAccountEntries(updatedAccounts));
  }
  const result = {
    attempted: registry.accounts.length - skippedActive,
    succeeded: registry.accounts.length - skippedActive - failures.length,
    failed: failures.length,
    skippedActive,
    failedAccountIds: failures.map((item) => item.accountId),
  };
  logEvent("auth.accounts.keep_alive", result);
  return result;
}

function getJwtExpMs(payload) {
  const expSeconds = Number(payload && payload.exp);
  if (!Number.isFinite(expSeconds) || expSeconds <= 0) {
    return null;
  }
  return Math.trunc(expSeconds * 1000);
}

function buildAuthSummary(session, options = {}) {
  const sessionExists = options.sessionExists !== false;
  const initData = session && session.telegram && typeof session.telegram.initData === "string"
    ? session.telegram.initData
    : "";
  const initDataUnsafeStored = session
    && session.telegram
    && session.telegram.initDataUnsafe
    && typeof session.telegram.initDataUnsafe === "object"
    ? session.telegram.initDataUnsafe
    : null;
  const initDataUnsafeParsed = parseInitDataUnsafeString(initData);
  const initDataUnsafe = initDataUnsafeStored || initDataUnsafeParsed;
  const userId = initDataUnsafe
    && initDataUnsafe.user
    && initDataUnsafe.user.id !== undefined
    && initDataUnsafe.user.id !== null
    ? String(initDataUnsafe.user.id)
    : null;

  const accessToken = session && session.game && typeof session.game.accessToken === "string"
    ? session.game.accessToken
    : "";
  const refreshToken = session && session.game && typeof session.game.refreshToken === "string"
    ? session.game.refreshToken
    : "";
  const accessPayload = decodeJwtPayload(accessToken);
  const refreshPayload = decodeJwtPayload(refreshToken);
  const nowMs = Date.now();
  const accessExpMs = getJwtExpMs(accessPayload);
  const refreshExpMs = getJwtExpMs(refreshPayload);
  const accessExpired = accessExpMs !== null && nowMs >= accessExpMs;
  const refreshExpired = refreshExpMs !== null && nowMs >= refreshExpMs;
  const hasUsableAccessToken = Boolean(accessToken) && !accessExpired;
  const hasUsableRefreshToken = Boolean(refreshToken) && !refreshExpired;

  let reason = "session-ready";
  if (!sessionExists) {
    reason = "session-file-missing";
  } else if (!accessToken) {
    reason = "access-token-missing";
  } else if (accessExpired && !refreshToken) {
    reason = "access-token-expired-and-refresh-missing";
  } else if (accessExpired && refreshExpired) {
    reason = "tokens-expired";
  } else if (accessExpired && hasUsableRefreshToken) {
    reason = "access-token-expired-refresh-available";
  }

  const isActive = Boolean(accessToken) && (
    reason === "session-ready"
    || reason === "access-token-expired-refresh-available"
    || hasUsableAccessToken
  );

  return {
    selfUserId: userId,
    isActive,
    requiresLogin: !isActive,
    reason,
    hasInitData: Boolean(initData),
    initDataLength: initData.length,
    hasAccessToken: Boolean(accessToken),
    accessTokenLength: accessToken.length,
    hasRefreshToken: Boolean(refreshToken),
    refreshTokenLength: refreshToken.length,
    authDateUtc: toIsoFromUnixSeconds(initDataUnsafe && initDataUnsafe.auth_date),
    accessTokenExpUtc: toIsoFromUnixSeconds(accessPayload && accessPayload.exp),
    refreshTokenExpUtc: toIsoFromUnixSeconds(refreshPayload && refreshPayload.exp),
    updatedAt: session && session.generatedAt ? session.generatedAt : null,
  };
}

async function getAuthStatus(options = {}, sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const { session, exists } = await loadSessionSnapshotSafe(resolvedSessionPath);
  const baseUrl = resolveBaseUrlForSession(session, options.baseUrl);
  const auth = buildAuthSummary(session, { sessionExists: exists });

  return {
    sessionPath: resolvedSessionPath,
    sessionExists: exists,
    baseUrl,
    requiresLogin: auth.requiresLogin,
    reason: auth.reason,
    auth,
  };
}

async function loginByInitData(options = {}, sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const { session, exists } = await loadSessionSnapshotSafe(resolvedSessionPath);
  const providedInitData = typeof options.initData === "string" ? options.initData.trim() : "";
  const useStoredInitData = toBool(options.useStoredInitData, false);
  const storedInitData = session
    && session.telegram
    && typeof session.telegram.initData === "string"
    ? session.telegram.initData.trim()
    : "";
  const initData = providedInitData || (useStoredInitData ? storedInitData : "");

  if (!initData) {
    throw new Error(
      useStoredInitData
        ? "No stored initData in session file."
        : "initData is required.",
    );
  }

  const baseUrl = resolveBaseUrlForSession(session, options.baseUrl);
  const loginStartedAt = Date.now();
  logEvent("game.auth.login.request", {
    origin: new URL(baseUrl).origin,
    endpoint: "/api/auth/login",
    initDataSource: providedInitData ? "provided" : "stored",
    initDataLength: initData.length,
  });

  let response;
  let payload;
  try {
    response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ initData }),
    });
    payload = await parseResponseBody(response);
    logEvent("game.auth.login.response", {
      endpoint: "/api/auth/login",
      status: response.status,
      ok: response.ok,
      elapsedMs: Date.now() - loginStartedAt,
      data: payload,
    });
  } catch (error) {
    logEvent("game.auth.login.error", {
      endpoint: "/api/auth/login",
      elapsedMs: Date.now() - loginStartedAt,
      error,
    });
    throw error;
  }
  const payloadSuccess = payload && typeof payload === "object" && Object.prototype.hasOwnProperty.call(payload, "success")
    ? Boolean(payload.success)
    : true;

  if (!response.ok || !payloadSuccess) {
    const message = payload && payload.message
      ? String(payload.message)
      : `HTTP ${response.status}`;
    throw new Error(`Auth login failed: ${message}`);
  }

  const tokens = extractTokensFromAuthResponse(payload);
  if (!tokens || !tokens.accessToken) {
    throw new Error("Auth login response did not contain accessToken.");
  }

  const initDataUnsafe = parseInitDataUnsafeString(initData);
  const previousAuth = buildAuthSummary(session, { sessionExists: exists });
  const nextUserId = initDataUnsafe
    && initDataUnsafe.user
    && initDataUnsafe.user.id !== undefined
    && initDataUnsafe.user.id !== null
    ? String(initDataUnsafe.user.id)
    : null;
  const sameAccount = previousAuth.selfUserId && nextUserId
    ? previousAuth.selfUserId === nextUserId
    : Boolean(storedInitData && storedInitData === initData);
  const accountChanged = Boolean(storedInitData && !sameAccount);
  session.generatedAt = new Date().toISOString();
  session.frameUrl = session.frameUrl || `${baseUrl}/game`;
  session.telegram = {
    initData,
    initDataLength: initData.length,
    ...(initDataUnsafe ? { initDataUnsafe } : {}),
    initParams: { tgWebAppData: initData },
  };

  if (!session.game || typeof session.game !== "object") {
    session.game = {};
  }
  session.game.accessToken = tokens.accessToken;
  session.game.refreshToken = tokens.refreshToken || (sameAccount ? session.game.refreshToken : null) || null;
  session.game.frameUrl = session.game.frameUrl || session.frameUrl || `${baseUrl}/game`;
  const existingLocalStorageKeys = Array.isArray(session.game.localStorageKeys) ? session.game.localStorageKeys : [];
  session.game.localStorageKeys = [...new Set([...existingLocalStorageKeys, "accessToken", "refreshToken"])];
  const existingSessionStorageKeys = Array.isArray(session.game.sessionStorageKeys) ? session.game.sessionStorageKeys : [];
  session.game.sessionStorageKeys = [...new Set([...existingSessionStorageKeys, "__telegram__initParams"])];

  const nickname = extractPlayerNickname(payload, nextUserId)
    || await loadPlayerNickname(baseUrl, session, tokens, nextUserId);
  session.game.nickname = nickname || (sameAccount ? session.game.nickname : null) || null;
  await saveSessionSnapshot(resolvedSessionPath, session);
  if (vpiAutoClaimRuntime.initialized) {
    scheduleVpiAutoClaim(0, "login", resolvedSessionPath);
  }
  dailyToiletPaperCollector.onLogin(resolvedSessionPath);
  let savedAccount = null;
  try {
    savedAccount = await rememberAuthAccount({
      initData,
      nickname: session.game.nickname,
      accessToken: session.game.accessToken,
      refreshToken: session.game.refreshToken,
    }, resolvedSessionPath);
  } catch (error) {
    logEvent("auth.accounts.remember_error", { error });
  }

  return {
    sessionPath: resolvedSessionPath,
    sessionExistsBefore: exists,
    baseUrl,
    login: {
      ok: true,
      message: payload && payload.message ? String(payload.message) : null,
      accountChanged,
      previousSelfUserId: previousAuth.selfUserId,
      selfUserId: nextUserId,
      accessTokenReceived: Boolean(tokens.accessToken),
      refreshTokenReceived: Boolean(tokens.refreshToken),
    },
    savedAccount,
    auth: buildAuthSummary(session),
  };
}

async function loginByTokens(options = {}, sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const { session, exists } = await loadSessionSnapshotSafe(resolvedSessionPath);
  const providedAccessToken = typeof options.accessToken === "string" ? options.accessToken.trim() : "";
  const providedRefreshToken = typeof options.refreshToken === "string" ? options.refreshToken.trim() : "";

  if (!providedAccessToken) {
    throw new Error("accessToken is required.");
  }

  const providedAccessUserId = getTokenUserId(providedAccessToken);
  const providedRefreshUserId = getTokenUserId(providedRefreshToken);
  if (providedAccessUserId && providedRefreshUserId && providedAccessUserId !== providedRefreshUserId) {
    throw new Error("Token login failed: accessToken and refreshToken belong to different users.");
  }

  const baseUrl = resolveBaseUrlForSession(session, options.baseUrl);
  const validationSession = {
    ...session,
    game: {
      ...(session.game && typeof session.game === "object" ? session.game : {}),
      accessToken: providedAccessToken,
      refreshToken: providedRefreshToken || null,
      frameUrl: session.game && session.game.frameUrl || session.frameUrl || `${baseUrl}/game`,
    },
  };
  const client = await createApiClient({
    baseUrl,
    session: validationSession,
    accessToken: providedAccessToken,
    refreshToken: providedRefreshToken || null,
    persistSession: false,
  });
  let validation;
  try {
    validation = await client.players.init({ rateLimitRetries: 0 });
  } catch (error) {
    const message = error && error.message ? String(error.message) : "token validation failed";
    throw new Error(`Token login failed: ${message}`);
  }
  const validationPayload = validation && validation.data;
  const payloadSuccess = validationPayload
    && typeof validationPayload === "object"
    && Object.prototype.hasOwnProperty.call(validationPayload, "success")
    ? Boolean(validationPayload.success)
    : true;
  if (!validation || !validation.ok || !payloadSuccess) {
    const message = validationPayload && validationPayload.message
      ? String(validationPayload.message)
      : validation && validation.status
        ? `HTTP ${validation.status}`
        : "token validation failed";
    throw new Error(`Token login failed: ${message}`);
  }

  const accessToken = client.accessToken;
  const refreshToken = client.refreshToken || null;
  const accessUserId = getTokenUserId(accessToken);
  const refreshUserId = getTokenUserId(refreshToken);
  if (accessUserId && refreshUserId && accessUserId !== refreshUserId) {
    throw new Error("Token login failed: refreshed tokens belong to different users.");
  }
  const selfUserId = accessUserId || refreshUserId;
  if (!selfUserId) {
    throw new Error("Token login failed: token does not contain userId.");
  }

  const previousAuth = buildAuthSummary(session, { sessionExists: exists });
  const sameAccount = Boolean(previousAuth.selfUserId)
    && previousAuth.selfUserId === selfUserId;
  const accountChanged = Boolean(previousAuth.selfUserId) && !sameAccount;
  const nickname = extractPlayerNickname(validationPayload, selfUserId);
  const previousTelegram = session.telegram && typeof session.telegram === "object"
    ? session.telegram
    : {};
  const previousUser = previousTelegram.initDataUnsafe
    && previousTelegram.initDataUnsafe.user
    && typeof previousTelegram.initDataUnsafe.user === "object"
    ? previousTelegram.initDataUnsafe.user
    : {};

  session.generatedAt = new Date().toISOString();
  session.frameUrl = session.frameUrl || `${baseUrl}/game`;
  session.telegram = {
    ...(sameAccount ? previousTelegram : {}),
    authSource: "tokens",
    initDataUnsafe: {
      ...(sameAccount && previousTelegram.initDataUnsafe ? previousTelegram.initDataUnsafe : {}),
      user: {
        ...(sameAccount ? previousUser : {}),
        id: /^\d+$/.test(selfUserId) ? Number(selfUserId) : selfUserId,
      },
    },
  };
  if (!sameAccount) {
    delete session.telegram.initData;
    delete session.telegram.initDataLength;
    delete session.telegram.initParams;
  }

  session.game = {
    ...(session.game && typeof session.game === "object" ? session.game : {}),
    accessToken,
    refreshToken,
    frameUrl: session.game && session.game.frameUrl || session.frameUrl || `${baseUrl}/game`,
    nickname: nickname || (sameAccount && session.game && session.game.nickname) || null,
  };
  const existingLocalStorageKeys = Array.isArray(session.game.localStorageKeys) ? session.game.localStorageKeys : [];
  session.game.localStorageKeys = [...new Set([...existingLocalStorageKeys, "accessToken", "refreshToken"])];
  await saveSessionSnapshot(resolvedSessionPath, session);

  if (vpiAutoClaimRuntime.initialized) {
    scheduleVpiAutoClaim(0, "login", resolvedSessionPath);
  }
  dailyToiletPaperCollector.onLogin(resolvedSessionPath);

  let savedAccount = null;
  try {
    savedAccount = await rememberAuthAccount({
      accountId: selfUserId,
      selfUserId,
      nickname: session.game.nickname,
      accessToken,
      refreshToken,
    }, resolvedSessionPath);
  } catch (error) {
    logEvent("auth.accounts.remember_error", { error });
  }

  return {
    sessionPath: resolvedSessionPath,
    sessionExistsBefore: exists,
    baseUrl,
    login: {
      ok: true,
      method: "tokens",
      accountChanged,
      previousSelfUserId: previousAuth.selfUserId,
      selfUserId,
      accessTokenReceived: true,
      refreshTokenReceived: Boolean(refreshToken),
      accessTokenRefreshed: accessToken !== providedAccessToken,
    },
    savedAccount,
    auth: buildAuthSummary(session),
  };
}

async function switchSavedAuthAccount(options = {}, sessionPath) {
  const accountId = typeof options.accountId === "string" ? options.accountId.trim() : "";
  if (!accountId) {
    throw new Error("accountId is required.");
  }
  const registry = await loadAuthAccountRegistry(sessionPath);
  const account = registry.accounts.find((entry) => entry.accountId === accountId);
  if (!account) {
    throw new Error("Saved account was not found.");
  }
  let tokenError = null;
  if (account.accessToken) {
    try {
      return await loginByTokens({
        accessToken: account.accessToken,
        refreshToken: account.refreshToken || "",
      }, registry.resolvedSessionPath);
    } catch (error) {
      tokenError = error;
    }
  }
  if (account.initData) {
    try {
      return await loginByInitData({ initData: account.initData }, registry.resolvedSessionPath);
    } catch (error) {
      // Prefer the token error because it explains whether refresh credentials expired.
      throw tokenError || error;
    }
  }
  throw tokenError || new Error("Saved account does not contain reusable credentials.");
}

function parsePositiveIntList(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  const output = [];
  const seen = new Set();

  for (const chunk of values) {
    for (const part of String(chunk).split(/[\s,;]+/)) {
      const parsed = Number.parseInt(part, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        continue;
      }
      if (seen.has(parsed)) {
        continue;
      }
      seen.add(parsed);
      output.push(parsed);
    }
  }

  return output;
}

function pickNumeric(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
}

function pickString(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }

  return null;
}

function createEmptyBossKeyPriceCache() {
  return {
    generatedAt: null,
    sources: {},
  };
}

function normalizeCurrencyCode(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return String(value).trim().toLowerCase();
}

function normalizeBossKeyPriceCache(raw) {
  const payload = raw && typeof raw === "object" ? raw : {};
  const sourceEntries = payload.sources && typeof payload.sources === "object"
    ? Object.entries(payload.sources)
    : [];
  const sources = {};

  for (const [sourceBossIdRaw, entryRaw] of sourceEntries) {
    const sourceBossId = Number(sourceBossIdRaw);
    if (!Number.isFinite(sourceBossId) || sourceBossId <= 0) {
      continue;
    }

    const entry = entryRaw && typeof entryRaw === "object" ? entryRaw : {};
    const addedTotal = Math.max(0, Number(entry.addedTotal || 0));
    const spentTotal = Math.max(0, Number(entry.spentTotal || 0));
    const observations = Math.max(0, Number(entry.observations || 0));
    const priceRubles = Number.isFinite(Number(entry.priceRubles))
      ? Number(entry.priceRubles)
      : addedTotal > 0
        ? spentTotal / addedTotal
        : null;
    const currency = normalizeCurrencyCode(entry.currency);

    sources[String(sourceBossId)] = {
      sourceBossId,
      priceRubles: priceRubles === null ? null : Math.max(0, priceRubles),
      currency,
      addedTotal,
      spentTotal,
      observations,
      lastSeenAt: entry.lastSeenAt || null,
    };
  }

  return {
    generatedAt: payload.generatedAt || null,
    sources,
  };
}

async function loadBossKeyPriceCache() {
  try {
    const body = await fs.readFile(BOSS_KEY_PRICES_LATEST_PATH, "utf8");
    return normalizeBossKeyPriceCache(JSON.parse(body));
  } catch (error) {
    void error;
    return createEmptyBossKeyPriceCache();
  }
}

async function saveBossKeyPriceCache(cache) {
  const normalized = normalizeBossKeyPriceCache(cache);
  normalized.generatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(BOSS_KEY_PRICES_LATEST_PATH), { recursive: true });
  await fs.writeFile(BOSS_KEY_PRICES_LATEST_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

function getObservedKeyPrice(cache, sourceBossId) {
  const normalizedSourceBossId = Number(sourceBossId);
  if (!Number.isFinite(normalizedSourceBossId) || normalizedSourceBossId <= 0) {
    return null;
  }

  if (!cache || !cache.sources || typeof cache.sources !== "object") {
    return null;
  }

  const entry = cache.sources[String(normalizedSourceBossId)] || null;
  if (!entry) {
    return null;
  }

  const price = Number(entry.priceRubles);
  return Number.isFinite(price) ? Math.max(0, price) : null;
}

function getObservedKeyPriceCurrency(cache, sourceBossId) {
  const normalizedSourceBossId = Number(sourceBossId);
  if (!Number.isFinite(normalizedSourceBossId) || normalizedSourceBossId <= 0) {
    return null;
  }

  if (!cache || !cache.sources || typeof cache.sources !== "object") {
    return null;
  }

  const entry = cache.sources[String(normalizedSourceBossId)] || null;
  if (!entry) {
    return null;
  }

  return normalizeCurrencyCode(entry.currency);
}

function getErrorMessage(error) {
  if (error && error.message) {
    return error.message;
  }
  return String(error || "Unknown error");
}

function normalizeElapsedMs(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : null;
}

function sanitizeBossAutomationValue(value, depth = 0) {
  if (depth > 10) {
    return "[max-depth]";
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeBossAutomationValue(item, depth + 1));
  }

  const output = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (/token|initdata|authorization|cookie|headers|tgwebappdata|hash/i.test(key)) {
      output[key] = "[redacted]";
      continue;
    }
    output[key] = sanitizeBossAutomationValue(nestedValue, depth + 1);
  }
  return output;
}

function summarizeBossAutomationItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }
  return {
    bossId: item.bossId ?? null,
    queueItemId: item.queueItemId ?? null,
    origin: item.origin ?? null,
    serverTaskId: item.serverTaskId ?? null,
    priority: item.priority ?? 0,
    taskLabel: item.taskLabel ?? null,
    taskRequiredAmount: item.taskRequiredAmount ?? null,
    taskCurrentAmount: item.taskCurrentAmount ?? null,
    plannedDamage: item.plannedDamage ?? null,
    zarubaObjective: item.zarubaObjective ?? null,
    mode: item.mode ?? null,
    comboMode: item.comboMode ?? null,
    label: item.label ?? null,
    hitTypes: Array.isArray(item.hitTypes) ? item.hitTypes : null,
    finishWithNeedle: item.finishWithNeedle === true,
    autoKillSolo: item.autoKillSolo !== false,
    skipCombo: item.skipCombo === true,
    lastDeferredReason: item.lastDeferredReason ?? null,
    deferredCount: item.deferredCount ?? null,
  };
}

function summarizeBossAutomationSelectedBoss(boss) {
  if (!boss || typeof boss !== "object") {
    return null;
  }
  return {
    id: boss.id ?? null,
    title: boss.title ?? null,
    selectedMode: boss.selectedMode ?? null,
    selectedComboMode: boss.selectedComboMode ?? null,
    canStart: boss.canStart ?? null,
    blockedReason: boss.blockedReason ?? null,
    hasEnoughKeys: boss.hasEnoughKeys ?? null,
    requiredKeys: boss.requiredKeys ?? null,
    keysOwned: boss.keysOwned ?? null,
    keysMissing: boss.keysMissing ?? null,
    keyBypassed: boss.keyBypassed ?? null,
    keySourceBossId: boss.keySourceBossId ?? null,
    ownBossKeysOwned: boss.ownBossKeysOwned ?? null,
    ownedSourceKeys: boss.ownedSourceKeys ?? null,
    ownedTargetKeys: boss.ownedTargetKeys ?? null,
    usedToday: boss.usedToday ?? null,
    dailyLimit: boss.dailyLimit ?? null,
    remainingToday: boss.remainingToday ?? null,
  };
}

function summarizeBossAutomationPlan(plan) {
  if (!plan || typeof plan !== "object") {
    return null;
  }
  return {
    action: plan.action ?? null,
    reason: plan.reason ?? null,
    payload: sanitizeBossAutomationValue(plan.payload || null),
    selectedBoss: summarizeBossAutomationSelectedBoss(plan.selectedBoss),
    activeSession: plan.activeSession && plan.activeSession.session
      ? {
          bossId: plan.activeSession.session.bossId ?? null,
          mode: plan.activeSession.session.mode ?? null,
          currentHp: plan.activeSession.session.currentHp ?? null,
          endsAt: plan.activeSession.session.endsAt ?? null,
        }
      : null,
  };
}

function summarizeBossAutomationResponse(response) {
  if (!response || typeof response !== "object") {
    return null;
  }
  const payload = response.data && typeof response.data === "object" ? response.data : {};
  const rewardsPayload = resolveBossRewardPayload(payload);
  return {
    ok: response.ok ?? null,
    status: response.status ?? null,
    success: payload.success ?? null,
    message: getGameResponseMessage(response),
    code: payload.code ?? payload.errorCode ?? null,
    sessionId: payload.sessionId ?? null,
    bossId: payload.bossId ?? null,
    mode: payload.mode ?? null,
    rewards: summarizeBossClaimRewards(rewardsPayload),
  };
}

function summarizeBossAutomationHitResult(result) {
  if (!result || typeof result !== "object") {
    return null;
  }
  const cycles = Array.isArray(result.cycles) ? result.cycles : [];
  const comboHits = cycles.reduce((sum, cycle) => sum + (
    Array.isArray(cycle && cycle.hits) ? cycle.hits.length : 0
  ), 0);
  const soloFinisherHits = result.soloFinisher && result.soloFinisher.attempted
    ? Math.max(0, Number(result.soloFinisher.hits) || 0)
    : 0;
  const comboRewards = cycles
    .flatMap((cycle) => Array.isArray(cycle && cycle.hits) ? cycle.hits : [])
    .map((hit) => hit && hit.comboReward)
    .filter((reward) => reward && typeof reward === "object");
  return {
    dryRun: Boolean(result.dryRun),
    haltedReason: result.haltedReason ?? null,
    elapsedMs: normalizeElapsedMs(result.elapsedMs),
    timing: result.timing && typeof result.timing === "object"
      ? {
          startedAt: result.timing.startedAt ?? null,
          finishedAt: result.timing.finishedAt ?? null,
          elapsedMs: normalizeElapsedMs(result.timing.elapsedMs),
          operationElapsedMs: normalizeElapsedMs(result.timing.operationElapsedMs),
          hitSequenceElapsedMs: normalizeElapsedMs(result.timing.hitSequenceElapsedMs),
          comboElapsedMs: normalizeElapsedMs(result.timing.comboElapsedMs),
          finisherPreparationElapsedMs: normalizeElapsedMs(result.timing.finisherPreparationElapsedMs),
          finisherHitElapsedMs: normalizeElapsedMs(result.timing.finisherHitElapsedMs),
          automationElapsedMs: normalizeElapsedMs(result.timing.automationElapsedMs),
        }
      : null,
    hits: comboHits + soloFinisherHits,
    soloFinisher: result.soloFinisher && typeof result.soloFinisher === "object"
      ? {
          attempted: Boolean(result.soloFinisher.attempted),
          hits: soloFinisherHits,
          haltedReason: result.soloFinisher.haltedReason ?? null,
          elapsedMs: normalizeElapsedMs(result.soloFinisher.elapsedMs),
          preparationElapsedMs: normalizeElapsedMs(result.soloFinisher.preparationElapsedMs),
          hitElapsedMs: normalizeElapsedMs(result.soloFinisher.hitElapsedMs),
          error: result.soloFinisher.error ?? null,
        }
      : null,
    comboRewards,
    comboEconomy: result.comboEconomy && typeof result.comboEconomy === "object"
      ? sanitizeBossAutomationValue(result.comboEconomy)
      : null,
    needleFinisher: result.needleFinisher && typeof result.needleFinisher === "object"
      ? sanitizeBossAutomationValue(result.needleFinisher)
      : null,
    weaponDelta: result.weaponDelta && typeof result.weaponDelta === "object"
      ? {
          measured: Boolean(result.weaponDelta.measured),
          before: normalizeEconomyResourceValues(result.weaponDelta.before),
          after: normalizeEconomyResourceValues(result.weaponDelta.after),
          delta: normalizeEconomyResourceValues(result.weaponDelta.delta),
          capturedAt: result.weaponDelta.capturedAt ?? null,
          error: result.weaponDelta.error ?? null,
        }
      : null,
    meleeAcceleration: result.meleeAcceleration && typeof result.meleeAcceleration === "object"
      ? {
          requested: Boolean(result.meleeAcceleration.requested),
          active: Boolean(result.meleeAcceleration.active),
          fastRequests: Math.max(0, Number(result.meleeAcceleration.fastRequests) || 0),
          fallbacks: Math.max(0, Number(result.meleeAcceleration.fallbacks) || 0),
          fallbackReason: result.meleeAcceleration.fallbackReason ?? null,
        }
      : null,
    claim: result.claim
      ? {
          ok: result.claim.ok ?? null,
          response: summarizeBossAutomationResponse(result.claim.response),
        }
      : null,
    rewardSettlement: result.rewardSettlement && typeof result.rewardSettlement === "object"
      ? {
          completionObserved: Boolean(result.rewardSettlement.completionObserved),
          pending: Boolean(result.rewardSettlement.pending),
          attempts: Math.max(0, Number(result.rewardSettlement.attempts) || 0),
          background: result.rewardSettlement.background
            ? {
                bossId: result.rewardSettlement.background.bossId ?? null,
                startedAt: result.rewardSettlement.background.startedAt ?? null,
                attempts: Math.max(0, Number(result.rewardSettlement.background.attempts) || 0),
              }
            : null,
        }
      : null,
    finalSnapshot: result.finalSnapshot && result.finalSnapshot.summary
      ? result.finalSnapshot.summary
      : null,
  };
}

function summarizeBossAutomationSnapshot(snapshot) {
  const summary = snapshot && snapshot.snapshot && snapshot.snapshot.summary
    ? snapshot.snapshot.summary
    : snapshot && snapshot.summary
      ? snapshot.summary
      : null;
  if (!summary || typeof summary !== "object") {
    return null;
  }
  return {
    stateReliable: summary.stateReliable ?? null,
    stateUnknown: summary.stateUnknown ?? null,
    unknownReason: summary.unknownReason ?? null,
    hasSession: summary.hasSession ?? null,
    bossId: summary.bossId ?? null,
    title: summary.title ?? summary.bossName ?? null,
    mode: summary.mode ?? null,
    currentHp: summary.currentHp ?? summary.hpCurrent ?? null,
    maxHp: summary.maxHp ?? summary.hpTotal ?? null,
    rewardReady: summary.rewardReady ?? null,
    rewardBossId: summary.rewardBossId ?? null,
  };
}

async function loadBossAutomationEvents() {
  const eventsPath = bossAutomationRuntime.eventsPath || BOSS_AUTOMATION_EVENTS_LATEST_PATH;
  try {
    const body = await fs.readFile(eventsPath, "utf8");
    const payload = JSON.parse(body);
    const events = Array.isArray(payload && payload.events) ? payload.events : [];
    bossAutomationRuntime.events = events.slice(-MAX_BOSS_AUTOMATION_EVENTS);
    return bossAutomationRuntime.events;
  } catch (error) {
    void error;
    return bossAutomationRuntime.events;
  }
}

function runBossAutomationEventSerialized(task) {
  const pending = bossAutomationEventSerializedOperation
    .catch(() => undefined)
    .then(task);
  bossAutomationEventSerializedOperation = pending.catch(() => undefined);
  return pending;
}

function trimBossAutomationEvents(events) {
  const source = Array.isArray(events) ? events.filter(Boolean) : [];
  if (source.length <= MAX_BOSS_AUTOMATION_EVENTS) {
    return source;
  }

  const routineTypes = new Set(["tick_begin", "tick_noop"]);
  const kept = [];
  let routineCount = 0;
  for (let index = source.length - 1; index >= 0 && kept.length < MAX_BOSS_AUTOMATION_EVENTS; index -= 1) {
    const event = source[index];
    const routine = routineTypes.has(String(event && event.type || ""));
    if (routine && routineCount >= MAX_BOSS_AUTOMATION_ROUTINE_EVENTS) {
      continue;
    }
    if (routine) {
      routineCount += 1;
    }
    kept.push(event);
  }
  return kept.reverse();
}

async function appendBossAutomationEvent(type, details = {}) {
  return runBossAutomationEventSerialized(async () => {
    if (!Array.isArray(bossAutomationRuntime.events) || bossAutomationRuntime.events.length === 0) {
      await loadBossAutomationEvents();
    }
    const event = {
      at: new Date().toISOString(),
      type: String(type || "event"),
      details: sanitizeBossAutomationValue(details),
    };
    const events = trimBossAutomationEvents([
      ...(Array.isArray(bossAutomationRuntime.events) ? bossAutomationRuntime.events : []),
      event,
    ]);
    bossAutomationRuntime.events = events;
    try {
      const eventsPath = bossAutomationRuntime.eventsPath || BOSS_AUTOMATION_EVENTS_LATEST_PATH;
      await fs.mkdir(path.dirname(eventsPath), { recursive: true });
      await fs.writeFile(
        eventsPath,
        `${JSON.stringify({ updatedAt: event.at, events }, null, 2)}\n`,
        "utf8",
      );
    } catch (error) {
      void error;
    }
    return event;
  });
}

async function getBossAutomationLog(options = {}) {
  await ensureBossAutomationLoaded(options.sessionPath);
  const limit = Math.max(1, Math.min(500, asPositiveInt(options.limit, 100) || 100));
  const events = await loadBossAutomationEvents();
  return {
    path: bossAutomationRuntime.eventsPath || BOSS_AUTOMATION_EVENTS_LATEST_PATH,
    count: events.length,
    events: events.slice(-limit),
  };
}

function restoreBossAutomationRecentActivity(events) {
  if (
    !Array.isArray(events)
    || events.length === 0
    || Array.isArray(bossAutomationRuntime.recentActivity)
      && bossAutomationRuntime.recentActivity.length > 0
  ) {
    return bossAutomationRuntime.recentActivity;
  }

  const persistedAutoHitResults = [];
  for (const event of events) {
    const details = event && event.details && typeof event.details === "object"
      ? event.details
      : {};
    if (event.type === "auto_hit_result" && details.result && typeof details.result === "object") {
      persistedAutoHitResults.push({
        at: details.finishedAt || event.at,
        item: details.item || null,
        result: details.result,
        used: false,
      });
      if (persistedAutoHitResults.length > 100) {
        persistedAutoHitResults.shift();
      }
      continue;
    }
    if (event.type === "boss_reward_activity") {
      const restoredReward = pushBossAutomationRecentActivity({
        ...details,
        at: details.at || event.at,
      });
      markBossAutomationLastStartedRewardSettled(restoredReward);
      continue;
    }
    if (event.type === "queue_item_start_confirmed") {
      const restoredStart = pushBossAutomationRecentActivity({
        at: details.at || event.at,
        type: "start",
        status: "started",
        item: details.item,
        startElapsedMs: details.startElapsedMs,
        startRequestElapsedMs: details.startRequestElapsedMs,
        sessionId: details.sessionId,
      });
      bossAutomationRuntime.lastStarted = {
        at: details.at || event.at,
        finishedAt: details.at || event.at,
        item: restoredStart.item,
        confirmation: details.confirmation || { started: true, reason: "restored_start_confirmation" },
        startElapsedMs: details.startElapsedMs ?? null,
        startRequestElapsedMs: details.startRequestElapsedMs ?? null,
        snapshot: {
          bossId: restoredStart.item && restoredStart.item.bossId,
          sessionId: details.sessionId || null,
          hasSession: true,
        },
        settle: {
          bossId: restoredStart.item && restoredStart.item.bossId,
          sessionId: details.sessionId || null,
          hasSession: true,
        },
        status: "active",
        rewardSettledAt: null,
        claim: null,
        autoHit: null,
      };
      continue;
    }
    if (!["queue_item_started", "active_session_auto_hit"].includes(event.type)) {
      continue;
    }

    const nestedAutoHit = details.autoHit && details.autoHit.result
      ? details.autoHit.result
      : null;
    const eventAtMs = Date.parse(details.at || event.at || "");
    const bossId = Number(details.item && details.item.bossId);
    const persistedAutoHit = [...persistedAutoHitResults].reverse().find((candidate) => {
      const candidateAtMs = Date.parse(candidate.at || "");
      const candidateBossId = Number(candidate.item && candidate.item.bossId);
      return !candidate.used
        && Number.isFinite(eventAtMs)
        && Number.isFinite(candidateAtMs)
        && candidateAtMs <= eventAtMs + 2_000
        && eventAtMs - candidateAtMs <= 120_000
        && (!Number.isFinite(bossId) || !Number.isFinite(candidateBossId) || bossId === candidateBossId);
    }) || null;
    if (persistedAutoHit) {
      persistedAutoHit.used = true;
    }
    const autoHit = persistedAutoHit
      ? {
          ...(nestedAutoHit || {}),
          ...persistedAutoHit.result,
          claim: nestedAutoHit && nestedAutoHit.claim
            ? nestedAutoHit.claim
            : persistedAutoHit.result.claim,
          finalSnapshot: nestedAutoHit && nestedAutoHit.finalSnapshot
            ? nestedAutoHit.finalSnapshot
            : persistedAutoHit.result.finalSnapshot,
        }
      : nestedAutoHit;
    const claimResponse = details.claim && details.claim.response
      ? details.claim.response
      : autoHit && autoHit.claim && autoHit.claim.response
        ? autoHit.claim.response
        : null;
    const restoredActivity = pushBossAutomationRecentActivity({
      at: details.at || event.at,
      type: autoHit ? "fight_result" : details.type || "start",
      status: details.status || null,
      item: details.item,
      reason: details.reason || details.autoHit && details.autoHit.error || null,
      currentHp: details.settle && details.settle.currentHp,
      maxHp: details.settle && details.settle.maxHp,
      hits: autoHit && autoHit.hits,
      elapsedMs: autoHit && autoHit.elapsedMs,
      comboElapsedMs: autoHit && autoHit.timing && autoHit.timing.comboElapsedMs,
      finisherElapsedMs: autoHit && autoHit.soloFinisher && autoHit.soloFinisher.elapsedMs,
      finisherPreparationElapsedMs: autoHit && autoHit.soloFinisher && autoHit.soloFinisher.preparationElapsedMs,
      finisherHitElapsedMs: autoHit && autoHit.soloFinisher && autoHit.soloFinisher.hitElapsedMs,
      totalElapsedMs: autoHit && autoHit.timing && autoHit.timing.automationElapsedMs,
      startElapsedMs: details.startElapsedMs,
      startRequestElapsedMs: details.startRequestElapsedMs,
      sessionId: pickString(
        details.sessionId,
        autoHit && autoHit.finalSnapshot
          ? autoHit.finalSnapshot.sessionId
          : null,
        null,
      ),
      claimOk: Boolean(details.claim && details.claim.ok || autoHit && autoHit.claim && autoHit.claim.ok),
      rewards: claimResponse && claimResponse.rewards,
      comboRewards: autoHit && autoHit.comboRewards,
      weaponDelta: autoHit && autoHit.weaponDelta,
      comboEconomy: autoHit && autoHit.comboEconomy,
    });
    const restoredSessionId = pickString(
      restoredActivity && restoredActivity.sessionId,
      autoHit && autoHit.finalSnapshot && autoHit.finalSnapshot.sessionId,
      null,
    );
    bossAutomationRuntime.lastStarted = {
      at: details.startedAt || details.at || event.at,
      finishedAt: details.at || event.at,
      item: restoredActivity && restoredActivity.item
        ? restoredActivity.item
        : normalizeBossAutomationQueueEntry(details.item || {}),
      confirmation: details.confirmation || { started: true, reason: "restored_activity" },
      startElapsedMs: details.startElapsedMs ?? null,
      startRequestElapsedMs: details.startRequestElapsedMs ?? null,
      snapshot: {
        ...(details.settle && typeof details.settle === "object" ? details.settle : {}),
        sessionId: restoredSessionId,
        hasSession: details.settle && details.settle.hasSession !== undefined
          ? details.settle.hasSession
          : details.status === "active",
      },
      settle: {
        ...(details.settle && typeof details.settle === "object" ? details.settle : {}),
        sessionId: restoredSessionId,
      },
      status: details.status || null,
      rewardSettledAt: restoredActivity && restoredActivity.claimOk === true
        ? details.at || event.at
        : null,
      claim: details.claim || null,
      autoHit: details.autoHit || null,
    };
  }
  return bossAutomationRuntime.recentActivity;
}

function clampBossAutomationIntervalSec(value) {
  const parsed = asPositiveInt(value, DEFAULT_BOSS_AUTOMATION_INTERVAL_SEC)
    ?? DEFAULT_BOSS_AUTOMATION_INTERVAL_SEC;
  return Math.max(MIN_BOSS_AUTOMATION_INTERVAL_SEC, parsed);
}

function normalizeBossAutomationHitTypes(rawTypes) {
  if (rawTypes === undefined || rawTypes === null || rawTypes === "") {
    return [];
  }

  const values = Array.isArray(rawTypes) ? rawTypes : [rawTypes];
  const output = [];
  for (const value of values) {
    const parts = String(value).split(/[\s,;]+/);
    for (const part of parts) {
      const token = part.trim();
      if (!token) {
        continue;
      }
      try {
        output.push(normalizeBossActionType(token));
      } catch (error) {
        void error;
      }
    }
  }
  return output;
}

function normalizeBossAutomationQueueEntry(rawEntry) {
  if (!rawEntry || typeof rawEntry !== "object") {
    return null;
  }

  const bossId = Number(rawEntry.bossId || rawEntry.id || 0);
  if (!Number.isFinite(bossId) || bossId <= 0) {
    return null;
  }

  const mode = typeof rawEntry.mode === "string" ? rawEntry.mode.trim() : "";
  const comboMode = typeof rawEntry.comboMode === "string" ? rawEntry.comboMode.trim() : "";
  const label = typeof rawEntry.label === "string" ? rawEntry.label.trim() : "";
  const queueItemId = typeof rawEntry.queueItemId === "string" ? rawEntry.queueItemId.trim() : "";
  const lastDeferredAt = typeof rawEntry.lastDeferredAt === "string" ? rawEntry.lastDeferredAt.trim() : "";
  const lastDeferredReason = typeof rawEntry.lastDeferredReason === "string" ? rawEntry.lastDeferredReason.trim() : "";
  const deferredCount = Math.max(0, Number(rawEntry.deferredCount || 0) || 0);
  const origin = typeof rawEntry.origin === "string" ? rawEntry.origin.trim() : "";
  const serverTaskId = typeof rawEntry.serverTaskId === "string" ? rawEntry.serverTaskId.trim() : "";
  const priority = Math.max(-1_000, Math.min(1_000, Number(rawEntry.priority || 0) || 0));
  const taskRequiredAmount = asNonNegativeInt(rawEntry.taskRequiredAmount, null);
  const taskCurrentAmount = asNonNegativeInt(rawEntry.taskCurrentAmount, null);
  const plannedDamage = asNonNegativeInt(rawEntry.plannedDamage, null);
  const taskLabel = typeof rawEntry.taskLabel === "string" ? rawEntry.taskLabel.trim() : "";
  const zarubaObjective = typeof rawEntry.zarubaObjective === "string" ? rawEntry.zarubaObjective.trim() : "";
  const hitTypes = normalizeBossAutomationHitTypes(
    rawEntry.hitTypes !== undefined ? rawEntry.hitTypes : rawEntry.types,
  );
  return {
    bossId,
    // Preserve the mode chosen in the UI.  A Zaruba task only adds metadata;
    // it must not turn an explicitly selected solo fight into "Автоматически".
    mode: mode || null,
    comboMode,
    label: label || `#${bossId}`,
    ...(queueItemId ? { queueItemId } : {}),
    ...(hitTypes.length > 0 ? { hitTypes } : {}),
    ...(rawEntry.finishWithNeedle === true ? { finishWithNeedle: true } : {}),
    ...(rawEntry.autoKillSolo === false ? { autoKillSolo: false } : {}),
    ...(rawEntry.skipCombo === true ? { skipCombo: true } : {}),
    ...(lastDeferredAt ? { lastDeferredAt } : {}),
    ...(lastDeferredReason ? { lastDeferredReason } : {}),
    ...(deferredCount > 0 ? { deferredCount } : {}),
    ...(origin ? { origin } : {}),
    ...(serverTaskId ? { serverTaskId } : {}),
    ...(priority !== 0 ? { priority } : {}),
    ...(taskLabel ? { taskLabel } : {}),
    ...(taskRequiredAmount !== null ? { taskRequiredAmount } : {}),
    ...(taskCurrentAmount !== null ? { taskCurrentAmount } : {}),
    ...(plannedDamage !== null ? { plannedDamage } : {}),
    ...(zarubaObjective ? { zarubaObjective } : {}),
    ...(rawEntry.zarubaMaxWeaponValue != null ? { zarubaMaxWeaponValue: asNonNegativeInt(rawEntry.zarubaMaxWeaponValue, 0) } : {}),
  };
}

let bossAutomationQueueItemSequence = 0;

function createBossAutomationQueueItemId() {
  bossAutomationQueueItemSequence += 1;
  return `queue-${Date.now().toString(36)}-${bossAutomationQueueItemSequence.toString(36)}`;
}

function ensureBossAutomationQueueItemIds(queue) {
  return normalizeBossAutomationQueue(queue).map((item) => (
    item.queueItemId ? item : { ...item, queueItemId: createBossAutomationQueueItemId() }
  ));
}

function normalizeBossAutomationQueue(queue) {
  return (Array.isArray(queue) ? queue : [])
    .map((entry) => normalizeBossAutomationQueueEntry(entry))
    .filter(Boolean);
}

function normalizeBossAutomationComboMode(value) {
  return String(value || "").trim().toLowerCase();
}

function clearBossAutomationQueueItemCombo(item) {
  const next = {
    ...item,
    comboMode: "",
  };
  delete next.hitTypes;
  delete next.types;
  delete next.finishWithNeedle;
  return normalizeBossAutomationQueueEntry(next);
}

function removeUnavailableBossAutomationQueueCombos(queue, catalog) {
  const bossById = new Map(
    (Array.isArray(catalog && catalog.bosses) ? catalog.bosses : [])
      .filter((boss) => boss && Number.isFinite(Number(boss.id)))
      .map((boss) => [Number(boss.id), boss]),
  );
  const removed = [];
  const normalizedQueue = normalizeBossAutomationQueue(queue).map((item) => {
    const comboMode = normalizeBossAutomationComboMode(item.comboMode);
    const boss = bossById.get(Number(item.bossId));
    // An absent combo list can only occur in a legacy or incomplete catalog.
    // Do not alter the queue until the game has supplied an authoritative list.
    if (!comboMode || !boss || !Array.isArray(boss.comboModeKeys)) {
      return item;
    }
    const availableModes = new Set(
      boss.comboModeKeys.map(normalizeBossAutomationComboMode).filter(Boolean),
    );
    if (availableModes.has(comboMode)) {
      return item;
    }
    const cleaned = clearBossAutomationQueueItemCombo(item);
    removed.push({ from: item, item: cleaned });
    return cleaned;
  });
  return { queue: normalizedQueue, removed };
}

async function reconcileBossAutomationQueueComboAvailability(catalog) {
  const current = await ensureBossAutomationLoaded();
  const cleanup = removeUnavailableBossAutomationQueueCombos(current.queue, catalog);
  if (cleanup.removed.length === 0) {
    return current;
  }
  const result = await applyAndSaveBossAutomationQueueOperations(
    cleanup.removed.map(({ from, item }) => ({ type: "replace", from, item })),
  );
  if (result.applied.length > 0) {
    await appendBossAutomationEvent("queue_combo_modes_removed", {
      removed: result.applied.map((operation) => summarizeBossAutomationItem(operation.item)),
    });
  }
  return result.saved;
}

function areBossAutomationQueuesEqual(left, right) {
  return JSON.stringify(normalizeBossAutomationQueue(left))
    === JSON.stringify(normalizeBossAutomationQueue(right));
}

function getBossAutomationQueueUpdateDecision(currentState, options = {}) {
  const hasQueueUpdate = Object.prototype.hasOwnProperty.call(options, "queue");
  const currentQueueRevision = asNonNegativeInt(currentState && currentState.queueRevision, 0) ?? 0;
  const baseQueueRevision = asNonNegativeInt(options.queueBaseRevision, null);

  if (!hasQueueUpdate) {
    return {
      hasQueueUpdate: false,
      accepted: true,
      reason: null,
      baseQueueRevision,
      currentQueueRevision,
    };
  }

  if (currentQueueRevision > 0 && baseQueueRevision !== currentQueueRevision) {
    return {
      hasQueueUpdate: true,
      accepted: false,
      reason: baseQueueRevision === null ? "queue_revision_required" : "queue_revision_mismatch",
      baseQueueRevision,
      currentQueueRevision,
    };
  }

  return {
    hasQueueUpdate: true,
    accepted: true,
    reason: null,
    baseQueueRevision,
    currentQueueRevision,
  };
}

function normalizeBossAutomationQueueOperations(rawOperations) {
  return (Array.isArray(rawOperations) ? rawOperations : [])
    .map((rawOperation) => {
      if (!rawOperation || typeof rawOperation !== "object") {
        return null;
      }
      const type = typeof rawOperation.type === "string" ? rawOperation.type.trim().toLowerCase() : "";
      if (type === "clear") {
        return { type };
      }
      if (type === "append") {
        const item = normalizeBossAutomationQueueEntry(rawOperation.item || rawOperation.entry);
        return item ? { type, item } : null;
      }
      if (type === "remove") {
        const item = normalizeBossAutomationQueueEntry(rawOperation.item || rawOperation.entry || rawOperation.from);
        return item ? { type, item } : null;
      }
      if (type === "defer") {
        const item = normalizeBossAutomationQueueEntry(rawOperation.item || rawOperation.entry || rawOperation.from);
        const at = typeof rawOperation.at === "string" ? rawOperation.at.trim() : "";
        const reason = String(rawOperation.reason || "start_not_confirmed");
        return item ? { type, item, reason, ...(at ? { at } : {}) } : null;
      }
      if (type !== "replace") {
        return null;
      }
      const from = normalizeBossAutomationQueueEntry(rawOperation.from || rawOperation.item || rawOperation.entry);
      const item = normalizeBossAutomationQueueEntry(rawOperation.item || rawOperation.entry);
      return from && item ? { type, from, item } : null;
    })
    .filter(Boolean);
}

function areBossAutomationQueueItemsAddressableEqual(left, right) {
  const normalizedLeft = normalizeBossAutomationQueueEntry(left);
  const normalizedRight = normalizeBossAutomationQueueEntry(right);
  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft.bossId === normalizedRight.bossId
    && (
      !normalizedLeft.queueItemId
      || !normalizedRight.queueItemId
      || normalizedLeft.queueItemId === normalizedRight.queueItemId
    )
    && normalizedLeft.mode === normalizedRight.mode
    && normalizedLeft.comboMode === normalizedRight.comboMode
    && normalizedLeft.label === normalizedRight.label
    && JSON.stringify(normalizedLeft.hitTypes || []) === JSON.stringify(normalizedRight.hitTypes || [])
    && normalizedLeft.finishWithNeedle === normalizedRight.finishWithNeedle
    && normalizedLeft.autoKillSolo === normalizedRight.autoKillSolo
    && normalizedLeft.skipCombo === normalizedRight.skipCombo;
}

function applyBossAutomationQueueOperations(queue, rawOperations) {
  const nextQueue = normalizeBossAutomationQueue(queue);
  const applied = [];
  const skipped = [];
  for (const operation of normalizeBossAutomationQueueOperations(rawOperations)) {
    if (operation.type === "append") {
      const duplicateIndex = operation.item.queueItemId
        ? nextQueue.findIndex((entry) => entry.queueItemId === operation.item.queueItemId)
        : -1;
      if (duplicateIndex >= 0) {
        skipped.push({
          type: operation.type,
          item: operation.item,
          reason: "queue_item_already_present",
        });
        continue;
      }
      nextQueue.push(operation.item);
      applied.push({
        type: operation.type,
        item: operation.item,
      });
      continue;
    }

    if (operation.type === "clear") {
      if (nextQueue.length === 0) {
        skipped.push({ type: operation.type, reason: "queue_already_empty" });
        continue;
      }
      nextQueue.splice(0, nextQueue.length);
      applied.push({ type: operation.type });
      continue;
    }

    const match = operation.type === "replace" ? operation.from : operation.item;
    const index = operation.type === "defer"
      ? nextQueue.length > 0 && areBossAutomationQueueItemsAddressableEqual(nextQueue[0], match) ? 0 : -1
      : nextQueue.findIndex((entry) => areBossAutomationQueueItemsAddressableEqual(entry, match));
    if (index === -1) {
      skipped.push({ type: operation.type, item: match, reason: "queue_item_not_found" });
      continue;
    }

    if (operation.type === "remove") {
      const [item] = nextQueue.splice(index, 1);
      applied.push({ type: operation.type, item });
      continue;
    }

    if (operation.type === "defer") {
      const [previous] = nextQueue.splice(index, 1);
      const item = normalizeBossAutomationQueueEntry({
        ...previous,
        lastDeferredAt: operation.at || new Date().toISOString(),
        lastDeferredReason: operation.reason,
        deferredCount: Math.max(0, Number(previous.deferredCount || 0) || 0) + 1,
      });
      nextQueue.push(item);
      applied.push({ type: operation.type, from: previous, item });
      continue;
    }

    if (operation.type === "replace") {
      const previous = nextQueue[index];
      const item = normalizeBossAutomationQueueEntry({
        ...previous,
        ...operation.item,
        // Normalization omits default combat settings. Override the old values
        // explicitly so switching back to a default survives the merge, while
        // retaining server metadata (identity, deferrals, task information).
        autoKillSolo: operation.item.autoKillSolo !== false,
        skipCombo: operation.item.skipCombo === true,
        finishWithNeedle: operation.item.finishWithNeedle === true,
        hitTypes: operation.item.hitTypes || [],
      });
      nextQueue[index] = item;
      applied.push({ type: operation.type, from: previous, item });
    }
  }
  return {
    queue: nextQueue,
    applied,
    skipped,
  };
}

function deferBossAutomationQueueHead(queue, reason, now = new Date().toISOString()) {
  const normalizedQueue = normalizeBossAutomationQueue(queue);
  if (normalizedQueue.length === 0) {
    return {
      queue: [],
      item: null,
    };
  }

  const [item, ...rest] = normalizedQueue;
  const deferredItem = {
    ...item,
    lastDeferredAt: now,
    lastDeferredReason: String(reason || "start_not_confirmed"),
    deferredCount: Math.max(0, Number(item.deferredCount || 0) || 0) + 1,
  };

  return {
    queue: [...rest, deferredItem],
    item: deferredItem,
  };
}

function createDefaultBossAutomationState(now = new Date()) {
  return {
    enabled: true,
    autoStartNext: true,
    intervalSec: DEFAULT_BOSS_AUTOMATION_INTERVAL_SEC,
    queue: [],
    queueRevision: 0,
    queueDate: getMoscowDateKey(now),
    updatedAt: now.toISOString(),
  };
}

function getBossAutomationQueueDateKey(payload, updatedAtDate, now = new Date()) {
  const explicitDate = typeof payload.queueDate === "string" ? payload.queueDate.trim() : "";
  if (DATE_KEY_PATTERN.test(explicitDate)) {
    return explicitDate;
  }

  if (updatedAtDate instanceof Date && !Number.isNaN(updatedAtDate.getTime())) {
    return getMoscowDateKey(updatedAtDate);
  }

  return getMoscowDateKey(now);
}

function normalizeBossAutomationState(rawState, options = {}) {
  const now = options.now instanceof Date && !Number.isNaN(options.now.getTime())
    ? options.now
    : new Date();
  const defaults = createDefaultBossAutomationState(now);
  const payload = rawState && typeof rawState === "object" ? rawState : {};
  const updatedAtDate = new Date(payload.updatedAt || defaults.updatedAt);
  const queueDate = getBossAutomationQueueDateKey(payload, updatedAtDate, now);
  const currentQueueDate = getMoscowDateKey(now);
  const queue = queueDate === currentQueueDate
    ? normalizeBossAutomationQueue(payload.queue)
    : [];
  const queueRevision = asNonNegativeInt(payload.queueRevision, queue.length > 0 ? 1 : 0) ?? 0;

  return {
    enabled: toBool(payload.enabled, defaults.enabled),
    autoStartNext: toBool(payload.autoStartNext, defaults.autoStartNext),
    intervalSec: clampBossAutomationIntervalSec(payload.intervalSec),
    queue,
    queueRevision,
    queueDate: currentQueueDate,
    updatedAt: Number.isNaN(updatedAtDate.getTime())
      ? defaults.updatedAt
      : updatedAtDate.toISOString(),
  };
}

async function loadBossAutomationState(options = {}) {
  const statePath = options.statePath || bossAutomationRuntime.statePath || BOSS_AUTOMATION_LATEST_PATH;
  try {
    const body = await fs.readFile(statePath, "utf8");
    return normalizeBossAutomationState(JSON.parse(body));
  } catch (error) {
    void error;
    return createDefaultBossAutomationState();
  }
}

function runBossAutomationStateSerialized(task) {
  const pending = bossAutomationStateSerializedOperation
    .catch(() => undefined)
    .then(task);
  bossAutomationStateSerializedOperation = pending.catch(() => undefined);
  return pending;
}

async function saveBossAutomationStateUnlocked(state) {
  const now = new Date();
  const previous = normalizeBossAutomationState(
    bossAutomationRuntime.state || createDefaultBossAutomationState(now),
    { now },
  );
  const normalized = normalizeBossAutomationState({
    ...state,
    queue: ensureBossAutomationQueueItemIds(state && state.queue),
  }, { now });
  normalized.queueRevision = areBossAutomationQueuesEqual(previous.queue, normalized.queue)
    ? previous.queueRevision
    : previous.queueRevision + 1;
  normalized.queueDate = getMoscowDateKey(now);
  normalized.updatedAt = now.toISOString();
  const statePath = bossAutomationRuntime.statePath || BOSS_AUTOMATION_LATEST_PATH;
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  bossAutomationRuntime.state = normalized;
  applyBossAutomationTimer(normalized);
  return normalized;
}

async function applyAndSaveBossAutomationQueueOperations(rawOperations) {
  return runBossAutomationStateSerialized(async () => {
    const current = await ensureBossAutomationLoaded();
    const queueOperations = applyBossAutomationQueueOperations(current.queue, rawOperations);
    const saved = queueOperations.applied.length > 0
      ? await saveBossAutomationStateUnlocked({
          ...current,
          queue: queueOperations.queue,
          queueRevision: current.queueRevision,
        })
      : current;
    return {
      saved,
      ...queueOperations,
    };
  });
}

function buildBossAutomationView(state = null) {
  const current = normalizeBossAutomationState(
    state || bossAutomationRuntime.state || createDefaultBossAutomationState(),
  );

  return {
    ...current,
    accountId: bossAutomationRuntime.accountId,
    running: bossAutomationRuntime.running,
    timerActive: Boolean(bossAutomationRuntime.timerId),
    tickCount: bossAutomationRuntime.tickCount,
    lastTickStartedAt: bossAutomationRuntime.lastTickStartedAt,
    lastTickFinishedAt: bossAutomationRuntime.lastTickFinishedAt,
    lastError: bossAutomationRuntime.lastError,
    lastAction: bossAutomationRuntime.lastAction,
    lastStarted: bossAutomationRuntime.lastStarted,
    snoozedUntil: bossAutomationRuntime.snoozedUntil,
    snoozeReason: bossAutomationRuntime.snoozeReason,
    pendingReward: bossAutomationRuntime.pendingReward,
    recentActivity: Array.isArray(bossAutomationRuntime.recentActivity)
      ? bossAutomationRuntime.recentActivity
      : [],
  };
}

function clearBossAutomationSnooze() {
  bossAutomationRuntime.snoozedUntil = null;
  bossAutomationRuntime.snoozeReason = null;
}

function snoozeBossAutomation(reason, durationMs) {
  const normalizedDurationMs = Math.max(0, Number(durationMs) || 0);
  if (normalizedDurationMs <= 0) {
    clearBossAutomationSnooze();
    return null;
  }

  const until = new Date(Date.now() + normalizedDurationMs).toISOString();
  bossAutomationRuntime.snoozedUntil = until;
  bossAutomationRuntime.snoozeReason = reason || "backoff";
  return until;
}

function getBossAutomationSnoozeRemainingMs() {
  if (!bossAutomationRuntime.snoozedUntil) {
    return 0;
  }

  const timestamp = Date.parse(bossAutomationRuntime.snoozedUntil);
  if (!Number.isFinite(timestamp)) {
    clearBossAutomationSnooze();
    return 0;
  }

  const remainingMs = timestamp - Date.now();
  if (remainingMs <= 0) {
    clearBossAutomationSnooze();
    return 0;
  }

  return remainingMs;
}

function getBossAutomationBackoffMs(reason) {
  const text = String(reason || "").toLowerCase();
  if (text.includes("too many requests") || text.includes("rate") || text.includes("429")) {
    return BOSS_AUTOMATION_RATE_LIMIT_BACKOFF_MS;
  }
  if (text.includes("daily_limit_reached")) {
    return BOSS_AUTOMATION_DAILY_LIMIT_BACKOFF_MS;
  }
  return BOSS_AUTOMATION_ERROR_BACKOFF_MS;
}

function runBossAutomationSerialized(task) {
  const pending = bossAutomationSerializedOperation
    .catch(() => undefined)
    .then(task);
  bossAutomationSerializedOperation = pending.catch(() => undefined);
  return pending;
}

function clearBossAutomationFollowupTimer() {
  if (bossAutomationRuntime.followupTimerId) {
    clearTimeout(bossAutomationRuntime.followupTimerId);
  }
  bossAutomationRuntime.followupTimerId = null;
}

function scheduleBossAutomationFollowupTick(reason, delayMs) {
  const safeDelayMs = Math.max(500, Number(delayMs || 0) || BOSS_AUTOMATION_ACTIVE_POLL_MS);
  clearBossAutomationFollowupTimer();
  bossAutomationRuntime.followupTimerId = setTimeout(() => {
    bossAutomationRuntime.followupTimerId = null;
    void runBossAutomationTick({ reason });
  }, safeDelayMs);
}

function mergeBossAutomationRecentActivityRecords(previous, incoming) {
  if (!previous) {
    return incoming;
  }
  const merged = {
    ...previous,
    ...incoming,
    item: {
      ...(previous.item || {}),
      ...(incoming.item || {}),
    },
  };
  for (const key of [
    "label",
    "reason",
    "currentHp",
    "maxHp",
    "hits",
    "elapsedMs",
    "comboElapsedMs",
    "finisherElapsedMs",
    "finisherPreparationElapsedMs",
    "finisherHitElapsedMs",
    "totalElapsedMs",
    "startElapsedMs",
    "startRequestElapsedMs",
    "sessionId",
    "claimOk",
    "rewards",
    "weaponDelta",
    "comboEconomy",
  ]) {
    if (
      (incoming[key] === null || incoming[key] === undefined || incoming[key] === "")
      && previous[key] !== null
      && previous[key] !== undefined
      && previous[key] !== ""
    ) {
      merged[key] = previous[key];
    }
  }
  if (
    (!Array.isArray(incoming.comboRewards) || incoming.comboRewards.length === 0)
    && Array.isArray(previous.comboRewards)
  ) {
    merged.comboRewards = previous.comboRewards;
  }
  return merged;
}

function pushBossAutomationRecentActivity(entry = {}) {
  const item = entry.item ? normalizeBossAutomationQueueEntry(entry.item) : null;
  const record = {
    at: entry.at || new Date().toISOString(),
    type: String(entry.type || "event"),
    status: entry.status || null,
    item,
    label: entry.label || (item ? item.label || `#${item.bossId}` : null),
    reason: entry.reason || null,
    currentHp: entry.currentHp ?? null,
    maxHp: entry.maxHp ?? null,
    hits: entry.hits ?? null,
    elapsedMs: normalizeElapsedMs(entry.elapsedMs),
    comboElapsedMs: normalizeElapsedMs(entry.comboElapsedMs),
    finisherElapsedMs: normalizeElapsedMs(entry.finisherElapsedMs),
    finisherPreparationElapsedMs: normalizeElapsedMs(entry.finisherPreparationElapsedMs),
    finisherHitElapsedMs: normalizeElapsedMs(entry.finisherHitElapsedMs),
    totalElapsedMs: normalizeElapsedMs(entry.totalElapsedMs),
    startElapsedMs: normalizeElapsedMs(entry.startElapsedMs),
    startRequestElapsedMs: normalizeElapsedMs(entry.startRequestElapsedMs),
    sessionId: pickString(entry.sessionId, null),
    claimOk: entry.claimOk ?? null,
    rewards: entry.rewards && typeof entry.rewards === "object" ? entry.rewards : null,
    comboRewards: Array.isArray(entry.comboRewards)
      ? entry.comboRewards.filter((reward) => reward && typeof reward === "object")
      : [],
    weaponDelta: entry.weaponDelta && typeof entry.weaponDelta === "object"
      ? entry.weaponDelta
      : null,
    comboEconomy: entry.comboEconomy && typeof entry.comboEconomy === "object"
      ? sanitizeBossAutomationValue(entry.comboEconomy)
      : null,
  };
  const recent = Array.isArray(bossAutomationRuntime.recentActivity)
    ? bossAutomationRuntime.recentActivity
    : [];
  const queueItemId = String(record.item && record.item.queueItemId || "").trim();
  const existingIndex = queueItemId
    ? recent.findIndex((candidate) => (
        String(candidate && candidate.item && candidate.item.queueItemId || "").trim() === queueItemId
      ))
    : -1;
  const mergedRecord = existingIndex >= 0
    ? mergeBossAutomationRecentActivityRecords(recent[existingIndex], record)
    : record;
  bossAutomationRuntime.recentActivity = [
    mergedRecord,
    ...recent.filter((_, index) => index !== existingIndex),
  ].slice(0, MAX_BOSS_RECENT_ACTIVITY);
  return mergedRecord;
}

function findBossAutomationTrackedItem(bossId, preferredItem = null) {
  const numericBossId = Number(bossId);
  const normalizedPreferred = preferredItem && typeof preferredItem === "object"
    ? normalizeBossAutomationQueueEntry(preferredItem)
    : null;
  // A caller that captured a concrete queue item before an asynchronous hit or
  // claim is authoritative. Re-resolving it after the request is exactly what
  // makes a rapid next fight steal the previous fight's reward activity.
  if (normalizedPreferred && String(normalizedPreferred.queueItemId || "").trim()) {
    return normalizedPreferred;
  }
  const candidates = [
    normalizedPreferred,
    ...(Array.isArray(bossAutomationRuntime.recentActivity)
      ? bossAutomationRuntime.recentActivity.map((entry) => entry && entry.item)
      : []),
    bossAutomationRuntime.lastStarted && bossAutomationRuntime.lastStarted.item,
  ].filter(Boolean);

  const matching = candidates.find((item) => (
    Number.isFinite(numericBossId)
      ? Number(item && item.bossId) === numericBossId
      : Number(item && item.bossId) > 0
  ));
  return matching ? normalizeBossAutomationQueueEntry(matching) : null;
}

function captureBossRewardActivityContext(summary = {}, preferredItem = null) {
  const source = summary && typeof summary === "object" ? summary : {};
  const bossId = pickNumeric(
    preferredItem && preferredItem.bossId,
    source.rewardBossId,
    source.bossId,
    null,
  );
  return {
    bossId,
    sessionId: pickString(source.rewardSessionId, source.sessionId, null),
    item: findBossAutomationTrackedItem(bossId, preferredItem),
  };
}

function getBossAutomationSessionLossRewardContext(lastStarted, summary, recentActivity = []) {
  const current = summary && typeof summary === "object" ? summary : null;
  const started = lastStarted && typeof lastStarted === "object" ? lastStarted : null;
  const item = started && started.item && typeof started.item === "object"
    ? normalizeBossAutomationQueueEntry(started.item)
    : null;
  if (
    !current
    || current.stateUnknown === true
    || current.hasSession !== false
    || current.hasReward === true
    || current.rewardReady === true
    || current.rewardClaimed === true
    || !started
    || !item
  ) {
    return null;
  }

  const previous = started.settle && typeof started.settle === "object"
    ? started.settle
    : started.snapshot && typeof started.snapshot === "object"
      ? started.snapshot
      : {};
  const wasActive = previous.hasSession === true
    || started.status === "active"
    || started.confirmation && started.confirmation.started === true;
  const alreadySettled = Boolean(
    started.rewardSettledAt
    || started.claim && started.claim.ok
    || previous.rewardClaimed === true
    || started.autoHit && started.autoHit.result
      && started.autoHit.result.claim && started.autoHit.result.claim.ok,
  );
  if (!wasActive || alreadySettled) {
    return null;
  }

  const queueItemId = String(item.queueItemId || "").trim();
  const sessionId = pickString(
    previous.rewardSessionId,
    previous.sessionId,
    started.snapshot && started.snapshot.sessionId,
    null,
  );
  const hasRecordedReward = (Array.isArray(recentActivity) ? recentActivity : []).some((entry) => {
    if (!entry || entry.claimOk !== true) {
      return false;
    }
    const entryQueueItemId = String(entry.item && entry.item.queueItemId || "").trim();
    const entrySessionId = String(entry.sessionId || "").trim();
    return Boolean(
      queueItemId && entryQueueItemId === queueItemId
      || sessionId && entrySessionId === sessionId,
    );
  });
  if (hasRecordedReward) {
    return null;
  }

  const bossId = pickNumeric(item.bossId, previous.bossId, current.bossId, null);
  return {
    bossId,
    sessionId,
    item,
    observedSummary: {
      ...previous,
      ...current,
      bossId,
      sessionId,
      hasSession: false,
      isCompleted: true,
    },
  };
}

function shouldPollBossAutomationUnsettledReward(lastStarted, recentActivity = []) {
  return Boolean(getBossAutomationSessionLossRewardContext(
    lastStarted,
    {
      stateReliable: true,
      stateUnknown: false,
      hasSession: false,
      hasReward: false,
      rewardReady: false,
      rewardClaimed: false,
    },
    recentActivity,
  ));
}

function markBossAutomationLastStartedRewardSettled(activity) {
  if (!activity || activity.claimOk !== true || !bossAutomationRuntime.lastStarted) {
    return false;
  }
  const started = bossAutomationRuntime.lastStarted;
  const startedQueueItemId = String(started.item && started.item.queueItemId || "").trim();
  const activityQueueItemId = String(activity.item && activity.item.queueItemId || "").trim();
  const startedSessionId = pickString(
    started.settle && (started.settle.rewardSessionId || started.settle.sessionId),
    started.snapshot && started.snapshot.sessionId,
    null,
  );
  const activitySessionId = String(activity.sessionId || "").trim();
  if (!(
    startedQueueItemId && activityQueueItemId === startedQueueItemId
    || startedSessionId && activitySessionId === startedSessionId
  )) {
    return false;
  }
  started.rewardSettledAt = activity.at || new Date().toISOString();
  return true;
}

function buildBossAutomationClaimActivity(claimResponse, options = {}) {
  const response = summarizeBossAutomationResponse(claimResponse);
  const fallbackItem = options.item && typeof options.item === "object"
    ? options.item
    : null;
  const bossId = pickNumeric(
    fallbackItem && fallbackItem.bossId,
    options.bossId,
    response && response.bossId,
    response && response.rewards && response.rewards.bossId,
    null,
  );
  const item = findBossAutomationTrackedItem(bossId, fallbackItem)
    || (bossId !== null ? { bossId, label: `#${bossId}` } : null);
  const claimOk = options.claimOk === undefined
    ? Boolean(response && response.ok)
    : Boolean(options.claimOk);

  return {
    at: options.at || new Date().toISOString(),
    type: "claim",
    status: claimOk ? "claimed" : "claim_error",
    item,
    reason: claimOk ? null : pickString(options.reason, response && response.message, null),
    sessionId: pickString(
      options.sessionId,
      response && response.sessionId,
      null,
    ),
    claimOk,
    rewards: response && response.rewards ? response.rewards : null,
  };
}

async function recordBossAutomationClaimActivity(claimResponse, options = {}) {
  const activity = buildBossAutomationClaimActivity(claimResponse, options);
  const queueItemId = String(activity.item && activity.item.queueItemId || "").trim();
  const sessionId = String(activity.sessionId || "").trim();
  const existingSuccess = (bossAutomationRuntime.recentActivity || []).find((candidate) => {
    if (!candidate || candidate.claimOk !== true) {
      return false;
    }
    const candidateQueueItemId = String(candidate.item && candidate.item.queueItemId || "").trim();
    const candidateSessionId = String(candidate.sessionId || "").trim();
    return Boolean(
      queueItemId && candidateQueueItemId === queueItemId
      || sessionId && candidateSessionId === sessionId,
    );
  }) || null;
  // A delayed retry can finish after another request has already claimed and
  // recorded the same reward. Never let that late failure overwrite a valid
  // claimed row, and never persist a second successful reward for one fight.
  if (existingSuccess) {
    if (activity.claimOk && activity.rewards && !existingSuccess.rewards) {
      const enrichedActivity = pushBossAutomationRecentActivity(activity);
      await appendBossAutomationEvent("boss_reward_activity", activity);
      clearMatchingBossRewardSettlementTask(
        enrichedActivity.item && enrichedActivity.item.bossId,
        sessionId || options.sessionId,
      );
      markBossAutomationLastStartedRewardSettled(enrichedActivity);
      return enrichedActivity;
    }
    clearMatchingBossRewardSettlementTask(
      existingSuccess.item && existingSuccess.item.bossId,
      sessionId || options.sessionId,
    );
    markBossAutomationLastStartedRewardSettled(existingSuccess);
    return existingSuccess;
  }
  const recordedActivity = pushBossAutomationRecentActivity(activity);
  await appendBossAutomationEvent("boss_reward_activity", activity);
  if (activity.claimOk) {
    clearMatchingBossRewardSettlementTask(
      activity.item && activity.item.bossId,
      options.sessionId,
    );
    markBossAutomationLastStartedRewardSettled(recordedActivity);
  }
  return recordedActivity;
}

async function recordBossClaimResultActivity(result, options = {}) {
  if (!result || typeof result !== "object") {
    return null;
  }
  if (result.rewardActivity) {
    return result.rewardActivity;
  }
  if (!result.claim || !result.claim.response) {
    return null;
  }

  const finalSummary = getBossAutomationSummaryFrom(result);
  const rewardBossId = pickNumeric(
    options.item && options.item.bossId,
    options.bossId,
    result.claim.rewards && result.claim.rewards.bossId,
    finalSummary && finalSummary.rewardBossId,
    finalSummary && finalSummary.bossId,
    null,
  );
  const recordActivity = typeof options.recordActivity === "function"
    ? options.recordActivity
    : recordBossAutomationClaimActivity;
  const activity = await recordActivity(result.claim.response, {
    at: options.at,
    claimOk: result.claim.ok,
    bossId: rewardBossId,
    item: findBossAutomationTrackedItem(rewardBossId, options.item),
    sessionId: options.sessionId,
    reason: result.claim.ok
      ? null
      : options.reason || getGameResponseMessage(result.claim.response),
  });
  result.rewardActivity = activity;
  return activity;
}

function shouldRunBossAutomationQueue(state) {
  return Boolean(
    state
    && state.autoStartNext
    && Array.isArray(state.queue)
    && state.queue.length > 0,
  );
}

function clearBossAutomationTimer() {
  if (bossAutomationRuntime.timerId) {
    clearInterval(bossAutomationRuntime.timerId);
  }
  bossAutomationRuntime.timerId = null;
}

function applyBossAutomationTimer(state) {
  clearBossAutomationTimer();

  if (!shouldRunBossAutomationQueue(state)) {
    clearBossAutomationFollowupTimer();
    return;
  }

  const intervalSec = clampBossAutomationIntervalSec(state.intervalSec);
  bossAutomationRuntime.timerId = setInterval(() => {
    void runBossAutomationTick({ reason: "interval" });
  }, intervalSec * 1000);
}

function scheduleBossAutomationImmediateTick(reason = "state_update") {
  setTimeout(() => {
    void runBossAutomationTick({ reason });
  }, 0);
}

async function ensureBossAutomationLoaded(sessionPath) {
  const context = await resolvePrisonAutomationAccountContext(sessionPath);
  if (
    bossAutomationRuntime.initialized
    && bossAutomationRuntime.state
    && bossAutomationRuntime.accountId === context.accountId
  ) {
    const normalized = normalizeBossAutomationState(bossAutomationRuntime.state);
    const previousQueue = Array.isArray(bossAutomationRuntime.state.queue)
      ? bossAutomationRuntime.state.queue
      : [];
    if (
      normalized.queueDate !== bossAutomationRuntime.state.queueDate
      || normalized.queue.length !== previousQueue.length
    ) {
      bossAutomationRuntime.state = normalized;
      applyBossAutomationTimer(normalized);
    }
    return bossAutomationRuntime.state;
  }

  clearBossAutomationTimer();
  clearBossAutomationFollowupTimer();
  bossAutomationRuntime.accountId = context.accountId;
  bossAutomationRuntime.statePath = path.join(path.dirname(context.statePath), "boss-automation-latest.json");
  bossAutomationRuntime.eventsPath = path.join(path.dirname(context.statePath), "boss-automation-events-latest.json");
  bossAutomationRuntime.events = [];
  bossAutomationRuntime.recentActivity = [];
  bossAutomationRuntime.lastStarted = null;
  const state = await loadBossAutomationState({ statePath: bossAutomationRuntime.statePath });
  bossAutomationRuntime.state = state;
  bossAutomationRuntime.initialized = true;
  applyBossAutomationTimer(state);
  return state;
}

function buildBossAutomationStartPayload(item, options = {}) {
  const payload = {
    bossId: Number(item.bossId),
  };
  const mode = item && item.mode;

  if (mode) {
    payload.mode = mode;
  }
  if (item.comboMode && item.skipCombo !== true) {
    payload.comboMode = item.comboMode;
  }
  if (options.autoBuyKeysIfProfitable !== undefined) {
    payload.autoBuyKeysIfProfitable = toBool(options.autoBuyKeysIfProfitable, false);
  }

  return payload;
}

function isSoloBossAutomationMode(mode) {
  return String(mode || "").trim().toLowerCase() === "odin";
}

function isBossAutomationSkippableError(error) {
  const message = getErrorMessage(error);
  if (!message.includes("cannot be started with the current filters")) {
    return false;
  }

  const reasonMatch = message.match(/current filters:\s*([a-z_]+)/i);
  const reason = reasonMatch ? reasonMatch[1] : "";
  return [
    "arrival_not_open",
    "mode_unavailable",
    "no_matching_mode",
    "daily_limit_reached",
  ].includes(reason);
}

function getBossAutomationStartConfirmation(item, startResult) {
  const itemBossId = Number(item && item.bossId || 0);
  const summary = startResult && startResult.snapshot && startResult.snapshot.summary
    ? startResult.snapshot.summary
    : {};
  const plan = startResult && startResult.plan ? startResult.plan : {};
  const response = startResult && startResult.response ? startResult.response : null;
  const activeBossId = Number(summary.bossId || 0);
  const rewardBossId = Number(summary.rewardBossId || 0);
  const planBossId = Number(
    plan.payload && plan.payload.bossId
      ? plan.payload.bossId
      : plan.selectedBoss && plan.selectedBoss.id
        ? plan.selectedBoss.id
        : plan.activeSession && plan.activeSession.session && plan.activeSession.session.bossId
          ? plan.activeSession.session.bossId
          : 0,
  );
  const responseSuccess = isSuccessfulGameResponse(response);
  const reused = Boolean(startResult && startResult.reused);
  const snapshotHasActiveSession = Boolean(
    summary.hasSession === true
    || (
      summary.hasSession !== false
      && summary.isCompleted !== true
      && summary.sessionId
    )
    || (
      summary.hasSession !== false
      && summary.isCompleted !== true
      &&
      summary.currentHp !== null
      && summary.currentHp !== undefined
      && Number.isFinite(Number(summary.currentHp))
      && Number(summary.currentHp) > 0
    ),
  );

  if (itemBossId > 0 && reused && planBossId === itemBossId) {
    return {
      started: false,
      reason: "active_session_reused",
      activeBossId,
      rewardBossId,
      planBossId,
      responseSuccess,
      reused,
    };
  }

  if (itemBossId > 0 && activeBossId === itemBossId && snapshotHasActiveSession) {
    return {
      started: true,
      reason: "snapshot_active_session",
      activeBossId,
      rewardBossId,
      planBossId,
      responseSuccess,
      reused,
    };
  }

  if (itemBossId > 0 && responseSuccess && (planBossId === 0 || planBossId === itemBossId)) {
    return {
      started: true,
      reason: "start_response_success",
      activeBossId,
      rewardBossId,
      planBossId,
      responseSuccess,
      reused,
    };
  }

  if (itemBossId > 0 && responseSuccess && rewardBossId === itemBossId) {
    return {
      started: true,
      reason: "reward_after_start",
      activeBossId,
      rewardBossId,
      planBossId,
      responseSuccess,
      reused,
    };
  }

  return {
    started: false,
    reason: responseSuccess ? "start_response_success_boss_mismatch" : "start_not_confirmed",
    activeBossId,
    rewardBossId,
    planBossId,
    responseSuccess,
    reused,
  };
}

async function reconcileBossAutomationStartConfirmation(item, startResult, options = {}) {
  let currentResult = startResult;
  let confirmation = getBossAutomationStartConfirmation(item, currentResult);
  const loadSnapshot = typeof options.loadSnapshot === "function"
    ? options.loadSnapshot
    : null;
  const wait = typeof options.wait === "function" ? options.wait : sleep;
  const retryDelayMs = Math.max(
    0,
    Number(options.retryDelayMs ?? BOSS_AUTOMATION_START_CONFIRM_RETRY_MS) || 0,
  );
  const planAction = currentResult && currentResult.plan ? currentResult.plan.action : null;

  if (
    confirmation.started
    || confirmation.reused
    || !loadSnapshot
    || !currentResult
    || currentResult.dryRun
    || planAction !== "start-attack"
  ) {
    return {
      startResult: currentResult,
      confirmation,
      retried: false,
      retryError: null,
    };
  }

  if (retryDelayMs > 0) {
    await wait(retryDelayMs);
  }

  try {
    const snapshot = await loadSnapshot(Number(item && item.bossId || 0) || null);
    currentResult = {
      ...currentResult,
      snapshot,
    };
    confirmation = getBossAutomationStartConfirmation(item, currentResult);
    return {
      startResult: currentResult,
      confirmation,
      retried: true,
      retryError: null,
    };
  } catch (error) {
    return {
      startResult: currentResult,
      confirmation,
      retried: true,
      retryError: getErrorMessage(error),
    };
  }
}

async function claimBossRewardForAutomation(sessionPath, trigger = "automation") {
  await appendBossAutomationEvent("reward_claim_begin", { trigger });
  const result = await withContext(sessionPath, async ({ client }) => {
    const response = await client.bosses.claim();
    const snapshot = await loadBossRuntimeSnapshot(client, null);
    return {
      ok: isSuccessfulGameResponse(response),
      response,
      snapshot,
    };
  });
  await appendBossAutomationEvent("reward_claim_result", {
    trigger,
    ok: result.ok,
    response: summarizeBossAutomationResponse(result.response),
    snapshot: result.snapshot && result.snapshot.summary ? result.snapshot.summary : null,
  });
  return result;
}

async function recordBossComboRunOutcome(startedItem, result, details = {}) {
  const hitTypes = startedItem?.skipCombo === true ? [] : normalizeBossAutomationHitTypes(startedItem && startedItem.hitTypes);
  if (hitTypes.length === 0) {
    return null;
  }

  const combo = summarizeBossComboRun(result, hitTypes.length);
  const completed = combo.completed;
  const record = {
    item: summarizeBossAutomationItem(startedItem),
    startedAt: details.startedAt ?? null,
    finishedAt: details.finishedAt ?? new Date().toISOString(),
    elapsedMs: normalizeElapsedMs(details.elapsedMs),
    totalElapsedMs: normalizeElapsedMs(details.totalElapsedMs),
    ...combo,
    reason: completed ? null : details.reason || combo.reason,
  };
  const suffix = completed ? "completed" : "incomplete";
  await appendBossAutomationEvent(`combo_${suffix}`, record);
  await logEvent(`boss.combo.${suffix}`, record);
  return record;
}

function getBossNeedleFinisherDecision(options = {}, summary = {}, vpiDamage = null) {
  const hitTypes = normalizeBossAutomationHitTypes(options.hitTypes ?? options.types);
  const comboMode = String(options.comboMode || "").trim();
  const bossId = asPositiveInt(summary.bossId, null);
  const expectedBossId = asPositiveInt(options.bossId, null);
  const maxHp = pickNumeric(summary.maxHp, summary.hpTotal, summary.currentHp);
  const currentHp = pickNumeric(summary.currentHp, summary.hpCurrent);

  if (!toBool(options.finishWithNeedle, false)) {
    return { eligible: false, useNeedle: false, blockWeapons: false, reason: "needle_finisher_disabled" };
  }
  if (!comboMode || hitTypes.length === 0) {
    return { eligible: false, useNeedle: false, blockWeapons: false, reason: "combo_not_configured" };
  }
  if (
    !summary
    || summary.stateUnknown === true
    || summary.stateReliable === false
  ) {
    return { eligible: true, useNeedle: false, blockWeapons: true, reason: "fight_state_unknown" };
  }
  if (
    summary.hasSession !== true
    || summary.isCompleted === true
    || currentHp === null
    || currentHp <= 0
  ) {
    return {
      eligible: true,
      useNeedle: false,
      blockWeapons: false,
      reason: "fight_already_finished",
      bossId: bossId || expectedBossId,
      maxHp,
      currentHp,
    };
  }
  if (expectedBossId && bossId && expectedBossId !== bossId) {
    return {
      eligible: true,
      useNeedle: false,
      blockWeapons: true,
      reason: "active_boss_changed",
    };
  }
  if (!vpiDamage) {
    return {
      eligible: true,
      useNeedle: false,
      blockWeapons: false,
      reason: "vpi_unchecked",
      bossId: bossId || expectedBossId,
      maxHp,
      currentHp,
    };
  }
  if (vpiDamage.active !== true) {
    return {
      eligible: true,
      useNeedle: false,
      blockWeapons: false,
      reason: "no_common_fund",
      bossId: bossId || expectedBossId,
      maxHp,
      currentHp,
      damageLeft: 0,
    };
  }

  const damageLeft = Math.max(0, asNumber(vpiDamage.damageLeft, 0));
  if (damageLeft <= 0) {
    return {
      eligible: true,
      useNeedle: false,
      blockWeapons: false,
      reason: "needle_damage_exhausted",
      bossId: bossId || expectedBossId,
      maxHp,
      currentHp,
      damageLeft: 0,
    };
  }

  return {
    eligible: true,
    useNeedle: true,
    blockWeapons: true,
    reason: "needle_available",
    bossId: bossId || expectedBossId,
    maxHp,
    currentHp,
    damageLeft,
    amount: Math.min(damageLeft, currentHp),
  };
}

function summarizeBossNeedleFinisher(result) {
  if (!result || typeof result !== "object") {
    return null;
  }
  return {
    eligible: result.eligible === true,
    attempted: result.attempted === true,
    ok: result.ok === true,
    blockWeapons: result.blockWeapons === true,
    reason: result.reason || null,
    error: result.error || null,
    bossId: result.bossId ?? null,
    maxHp: result.maxHp ?? null,
    currentHp: result.currentHp ?? null,
    damageLeftBefore: result.damageLeftBefore ?? null,
    requestedAmount: result.requestedAmount ?? null,
    actualSpent: result.actualSpent ?? null,
    damageLeftAfter: result.damageLeftAfter ?? null,
  };
}

async function executeBossNeedleFinisher(client, requestOptions, options = {}) {
  const loadSnapshot = typeof options.loadSnapshot === "function"
    ? options.loadSnapshot
    : (bossId) => loadBossRuntimeSnapshotLite(client, bossId);
  const initialSnapshot = options.initialSnapshot
    || await loadSnapshot(asPositiveInt(requestOptions && requestOptions.bossId, null));
  const summary = initialSnapshot && initialSnapshot.summary ? initialSnapshot.summary : {};
  const unchecked = getBossNeedleFinisherDecision(requestOptions, summary);
  if (!unchecked.eligible) {
    return {
      ...unchecked,
      attempted: false,
      ok: true,
      blockWeapons: false,
      initialSnapshot,
      finalSnapshot: initialSnapshot,
    };
  }
  if (unchecked.reason === "fight_already_finished") {
    return {
      ...unchecked,
      attempted: false,
      ok: true,
      initialSnapshot,
      finalSnapshot: initialSnapshot,
    };
  }
  if (unchecked.blockWeapons) {
    return {
      ...unchecked,
      attempted: false,
      ok: false,
      error: "Не удалось подтвердить активный бой перед добитием Иглой.",
      initialSnapshot,
      finalSnapshot: initialSnapshot,
    };
  }

  const damageResponse = await client.vpi.damageLeft();
  const vpiDamage = normalizeVpiDamageLeft(damageResponse);
  if (!vpiDamage) {
    return {
      ...unchecked,
      attempted: false,
      ok: false,
      blockWeapons: true,
      reason: "needle_state_unavailable",
      error: "Не удалось проверить остаток урона Иглы.",
      initialSnapshot,
      finalSnapshot: initialSnapshot,
    };
  }

  const decision = getBossNeedleFinisherDecision(requestOptions, summary, vpiDamage);
  if (!decision.useNeedle) {
    return {
      ...decision,
      attempted: false,
      ok: true,
      blockWeapons: false,
      damageLeftBefore: decision.damageLeft ?? 0,
      damageLeftAfter: decision.damageLeft ?? 0,
      initialSnapshot,
      finalSnapshot: initialSnapshot,
    };
  }

  const response = await client.vpi.spendDamage({
    bossId: decision.bossId,
    amount: decision.amount,
    Amount: decision.amount,
  }, {
    rateLimitRetries: 1,
  });
  if (!isSuccessfulGameResponse(response)) {
    const rateLimited = isBossRateLimitedResponse(response);
    const reason = getGameResponseMessage(response) || (
      response && response.status ? `HTTP ${response.status}` : "неизвестная ошибка"
    );
    return {
      ...decision,
      attempted: true,
      ok: false,
      blockWeapons: true,
      reason: rateLimited ? "needle_rate_limited" : "needle_request_failed",
      error: rateLimited
        ? "Игла временно ограничен по частоте запросов. Комбо уже выполнено; своё оружие не расходуем."
        : `Игла недоступен: ${reason}.`,
      damageLeftBefore: decision.damageLeft,
      damageLeftAfter: decision.damageLeft,
      requestedAmount: decision.amount,
      actualSpent: 0,
      initialSnapshot,
      finalSnapshot: initialSnapshot,
    };
  }

  const responseData = getGamePayload(response) || {};
  const actualSpent = Math.max(
    0,
    asNumber(responseData.actualSpent ?? responseData.ActualSpent, decision.amount),
  );
  const [finalSnapshot, finalDamageResponse] = await Promise.all([
    loadSnapshot(decision.bossId),
    client.vpi.damageLeft(),
  ]);
  const finalDamage = normalizeVpiDamageLeft(finalDamageResponse);
  const finalSummary = finalSnapshot && finalSnapshot.summary ? finalSnapshot.summary : {};
  const fightFinished = isBossAutomationSummaryFinished(finalSummary)
    || finalSummary.hasSession === false;
  const damageLeftAfter = finalDamage && finalDamage.active
    ? finalDamage.damageLeft
    : finalDamage && finalDamage.active === false
      ? 0
      : null;

  return {
    ...decision,
    attempted: true,
    ok: true,
    blockWeapons: !fightFinished && damageLeftAfter !== 0,
    reason: fightFinished
      ? "needle_finished_fight"
      : damageLeftAfter === 0
        ? "needle_exhausted"
        : "needle_still_available",
    error: null,
    damageLeftBefore: decision.damageLeft,
    damageLeftAfter,
    requestedAmount: decision.amount,
    actualSpent,
    initialSnapshot,
    finalSnapshot,
  };
}

function shouldUseWeaponsAfterBossNeedleFinisher(needleFinisher) {
  if (!needleFinisher || needleFinisher.eligible !== true) {
    return true;
  }
  return [
    "no_common_fund",
    "needle_damage_exhausted",
    "needle_exhausted",
  ].includes(needleFinisher.reason);
}

function shouldRunZarubaDamageFallback(startedItem, hitTypes, liveTaskResult) {
  return Boolean(
    startedItem
    && String(startedItem.origin || "").includes("zaruba")
    && startedItem.zarubaObjective === "damage"
    && String(startedItem.comboMode || "").trim()
    && Array.isArray(hitTypes)
    && hitTypes.length > 0
    && liveTaskResult
    && liveTaskResult.checked === true
    && liveTaskResult.task
    && liveTaskResult.task.completed !== true
  );
}

async function buildLiveZarubaDamageWeaponPlan(client, task) {
  const remaining = Math.max(
    0,
    Number(task && task.requiredAmount || 0) - Number(task && task.currentAmount || 0),
  );
  const bootstrap = client.bosses && typeof client.bosses.bootstrap === "function"
    ? await client.bosses.bootstrap()
    : null;
  return selectZarubaDamageWeapon(normalizeZarubaWeaponStats(bootstrap), remaining);
}

function isQueuedZarubaDamageTask(item) {
  return Boolean(
    item
    && String(item.origin || "").includes("zaruba")
    && item.zarubaObjective === "damage"
  );
}

async function clearQueuedZarubaDamageTasks() {
  const current = await ensureBossAutomationLoaded();
  const queued = normalizeBossAutomationQueue(current.queue).filter(isQueuedZarubaDamageTask);
  if (queued.length === 0) {
    return { saved: current, removed: 0 };
  }
  const operations = queued.map((item) => {
    if (!String(item.origin || "").includes("manual")) {
      return { type: "remove", item };
    }
    const restored = { ...item, origin: "manual" };
    for (const key of [
      "serverTaskId",
      "taskLabel",
      "strategy",
      "objective",
      "zarubaObjective",
      "taskRequiredAmount",
      "taskCurrentAmount",
      "plannedDamage",
    ]) {
      delete restored[key];
    }
    if (!String(restored.comboMode || "").trim()) {
      restored.hitTypes = [];
    }
    return { type: "replace", from: item, item: restored };
  });
  const mutation = await applyAndSaveBossAutomationQueueOperations(operations);
  return { saved: mutation.saved, removed: queued.length };
}

function mergeZarubaDamageFallbackResult(primaryResult, fallbackResult) {
  const primary = primaryResult && typeof primaryResult === "object" ? primaryResult : {};
  const fallback = fallbackResult && typeof fallbackResult === "object" ? fallbackResult : {};
  return {
    ...primary,
    ...(fallback.finalSnapshot ? { finalSnapshot: fallback.finalSnapshot } : {}),
    ...(fallback.claim ? { claim: fallback.claim } : {}),
    ...(fallback.rewardActivity ? { rewardActivity: fallback.rewardActivity } : {}),
    ...(Array.isArray(primary.cycles) || Array.isArray(fallback.cycles)
      ? { cycles: [...(primary.cycles || []), ...(fallback.cycles || [])] }
      : {}),
    ...(Array.isArray(primary.hits) || Array.isArray(fallback.hits)
      ? { hits: [...(primary.hits || []), ...(fallback.hits || [])] }
      : {}),
    zarubaDamageFallback: {
      attempted: true,
      ok: true,
      type: null,
    },
  };
}

async function runBossAutomationAutoHit(startedItem, options = {}, sessionPath) {
  if (
    startedItem
    && startedItem.serverTaskId
    && String(startedItem.origin || "").includes("zaruba")
  ) {
    const userOwnedQueueItem = String(startedItem.origin || "").includes("manual");
    let live = { checked: false, task: null };
    try {
      live = await withContext(sessionPath, async ({ client }) => (
        loadLiveZarubaTaskWithClient(client, startedItem.serverTaskId)
      ));
    } catch (_error) {
      live = { checked: false, task: null };
    }
    if (!live.checked && !userOwnedQueueItem) {
      return {
        attempted: false,
        result: null,
        error: "Не удалось сверить прогресс задания Зарубы перед ударом.",
        reason: "zaruba_state_unavailable",
      };
    }
    if ((!live.task || live.task.completed) && !userOwnedQueueItem) {
      return {
        attempted: false,
        result: null,
        error: null,
        reason: live.task ? "zaruba_task_completed" : "zaruba_task_expired",
      };
    }
  }
  let hitTypes = startedItem?.skipCombo === true
    ? []
    : normalizeBossAutomationHitTypes(startedItem && startedItem.hitTypes);
  if (startedItem?.origin === "zaruba" && startedItem.zarubaObjective === "damage"
    && !startedItem.comboMode && startedItem.skipCombo !== true) {
    const features = await getProPrisonFeatures(sessionPath);
    const prepared = await withContext(sessionPath, async ({ client }) => {
      const live = await loadLiveZarubaTaskWithClient(client, startedItem.serverTaskId);
      if (!live.checked || !live.task || live.task.completed) return { ok: false, reason: "zaruba_state_unavailable" };
      return prepareZarubaDamageWeapons(client, live.task, {
        allowPurchase: true, reserveRubles: features.reserveRubles,
        maxWeaponValue: startedItem.zarubaMaxWeaponValue,
      });
    });
    if (!prepared.ok) return { attempted: false, result: null, error: null, reason: prepared.reason };
    hitTypes = normalizeBossAutomationHitTypes(prepared.hitTypes);
  }
  const soloMode = isSoloBossAutomationMode(startedItem && startedItem.mode);
  if (soloMode && startedItem && startedItem.autoKillSolo === false && hitTypes.length === 0) {
    await appendBossAutomationEvent("auto_hit_skipped", {
      item: summarizeBossAutomationItem(startedItem),
      reason: "solo_auto_kill_disabled",
    });
    return {
      attempted: false,
      result: null,
      error: null,
      reason: "solo_auto_kill_disabled",
    };
  }
  if (hitTypes.length === 0 && !soloMode) {
    return {
      attempted: false,
      result: null,
      error: null,
    };
  }

  const delayMs = asNonNegativeInt(
    options.hitDelayMs !== undefined ? options.hitDelayMs : options.delayMs,
    0,
  ) ?? 0;
  await appendBossAutomationEvent("auto_hit_begin", {
    item: summarizeBossAutomationItem(startedItem),
    hitTypes: hitTypes.length > 0 ? hitTypes : null,
    autoSolo: soloMode && hitTypes.length === 0,
    delayMs,
  });

  const comboStartedAtMs = Date.now();
  const comboStartedAt = new Date(comboStartedAtMs).toISOString();
  try {
    const request = {
      bossId: startedItem.bossId,
      mode: startedItem.mode || undefined,
      comboMode: startedItem.skipCombo === true ? undefined : startedItem.comboMode || undefined,
      autoKillSolo: startedItem.autoKillSolo !== false,
      finishWithNeedle: startedItem.skipCombo !== true && startedItem.autoKillSolo !== false && startedItem.finishWithNeedle === true,
      delayMs,
      claimWhenReady: true,
      continueOnError: true,
      autoRestoreMeleeCooldown: true,
      autoBuyMissingWeapons: !(
        String(startedItem && startedItem.origin || "").includes("zaruba")
        && startedItem.zarubaObjective === "damage"
      ),
      forceNew: false,
      requireActiveSession: true,
      rewardActivityItem: startedItem,
    };
    if (hitTypes.length > 0) {
      request.types = hitTypes.join(",");
    }

    let result = await hitBoss(request, sessionPath);
    if (
      String(startedItem && startedItem.origin || "").includes("zaruba")
      && startedItem.zarubaObjective === "damage"
      && String(startedItem.comboMode || "").trim()
    ) {
      let liveAfterCombo = { checked: false, task: null };
      try {
        liveAfterCombo = await withContext(sessionPath, async ({ client }) => (
          loadLiveZarubaTaskWithClient(client, startedItem.serverTaskId)
        ));
      } catch (_error) {
        liveAfterCombo = { checked: false, task: null };
      }
      if ((!soloMode || startedItem.autoKillSolo !== false)
        && shouldRunZarubaDamageFallback(startedItem, hitTypes, liveAfterCombo)) {
        try {
          const fallbackPlan = await withContext(sessionPath, async ({ client }) => (
            buildLiveZarubaDamageWeaponPlan(client, liveAfterCombo.task)
          ));
          if (!fallbackPlan.sufficient) {
            result = {
              ...(result && typeof result === "object" ? result : {}),
              zarubaDamageFallback: {
                attempted: false,
                ok: false,
                type: null,
                reason: fallbackPlan.reason,
                error: `Нечем нанести оставшиеся ${fallbackPlan.requiredDamage} урона по заданию Зарубы.`,
              },
            };
          } else {
            const fallbackResult = await hitBoss({
              bossId: startedItem.bossId,
              mode: startedItem.mode || undefined,
              types: fallbackPlan.hitTypes.join(","),
              finishWithNeedle: false,
              delayMs,
              claimWhenReady: true,
              continueOnError: true,
              autoRestoreMeleeCooldown: true,
              autoBuyMissingWeapons: false,
              forceNew: false,
              requireActiveSession: true,
              rewardActivityItem: startedItem,
            }, sessionPath);
            result = mergeZarubaDamageFallbackResult(result, fallbackResult);
            result.zarubaDamageFallback.type = fallbackPlan.hitTypes.length === 1
              ? fallbackPlan.hitTypes[0]
              : fallbackPlan.hitTypes.join(",");
            result.zarubaDamageFallback.types = fallbackPlan.hitTypes;
            result.zarubaDamageFallback.damage = fallbackPlan.plannedDamage;
            result.zarubaDamageFallback.priceRubles = fallbackPlan.priceRubles;
          }
        } catch (fallbackError) {
          result = {
            ...(result && typeof result === "object" ? result : {}),
            zarubaDamageFallback: {
              attempted: true,
              ok: false,
              type: null,
              error: getErrorMessage(fallbackError),
            },
          };
        }
      }
    }
    const finishedAtMs = Date.now();
    const totalElapsedMs = normalizeElapsedMs(finishedAtMs - comboStartedAtMs) ?? 0;
    const executionElapsedMs = normalizeElapsedMs(result && result.elapsedMs);
    const comboElapsedMs = resolveBossComboElapsedMs(result)
      ?? executionElapsedMs
      ?? totalElapsedMs;
    if (result && typeof result === "object") {
      result.elapsedMs = totalElapsedMs;
      result.timing = {
        ...(result.timing && typeof result.timing === "object" ? result.timing : {}),
        automationStartedAt: comboStartedAt,
        automationFinishedAt: new Date(finishedAtMs).toISOString(),
        automationElapsedMs: totalElapsedMs,
        executionElapsedMs,
      };
    }
    const finishedAt = new Date(finishedAtMs).toISOString();
    await appendBossAutomationEvent("auto_hit_result", {
      item: summarizeBossAutomationItem(startedItem),
      startedAt: comboStartedAt,
      finishedAt,
      elapsedMs: comboElapsedMs,
      totalElapsedMs,
      result: summarizeBossAutomationHitResult(result),
    });
    if (result && result.claim && result.claim.response && !result.rewardActivity) {
      await recordBossClaimResultActivity(result, {
        at: finishedAt,
        bossId: startedItem && startedItem.bossId,
        item: startedItem,
      });
    }
    await recordBossComboRunOutcome(startedItem, result, {
      startedAt: comboStartedAt,
      finishedAt,
      elapsedMs: comboElapsedMs,
      totalElapsedMs,
    });
    return {
      attempted: true,
      result,
      error: null,
      elapsedMs: totalElapsedMs,
      comboElapsedMs,
      totalElapsedMs,
    };
  } catch (error) {
    const reason = getErrorMessage(error);
    const elapsedMs = normalizeElapsedMs(Date.now() - comboStartedAtMs) ?? 0;
    await appendBossAutomationEvent("auto_hit_error", {
      item: summarizeBossAutomationItem(startedItem),
      startedAt: comboStartedAt,
      finishedAt: new Date().toISOString(),
      elapsedMs,
      reason,
    });
    await recordBossComboRunOutcome(startedItem, null, {
      startedAt: comboStartedAt,
      elapsedMs,
      reason: "auto_hit_error",
    });
    return {
      attempted: true,
      result: null,
      error: reason,
      elapsedMs,
    };
  }
}

function getBossAutomationSummaryFrom(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (value.summary && typeof value.summary === "object") {
    return value.summary;
  }
  if (value.snapshot && value.snapshot.summary && typeof value.snapshot.summary === "object") {
    return value.snapshot.summary;
  }
  if (value.finalSnapshot && value.finalSnapshot.summary && typeof value.finalSnapshot.summary === "object") {
    return value.finalSnapshot.summary;
  }
  return null;
}

function isBossAutomationSummaryFinished(summary) {
  if (!summary || typeof summary !== "object") {
    return false;
  }
  return Boolean(
    summary.isCompleted === true
    || summary.rewardReady === true
    || summary.hasReward === true
    || (
      summary.currentHp !== null
      && summary.currentHp !== undefined
      && Number(summary.currentHp) <= 0
    ),
  );
}

function getBossAutomationRunStatus(settle = {}, autoHit = {}) {
  const summary = getBossAutomationSummaryFrom(settle.snapshot)
    || getBossAutomationSummaryFrom(autoHit.result)
    || null;
  const claimOk = Boolean(
    settle.claim && settle.claim.ok
    || autoHit.result && autoHit.result.claim && autoHit.result.claim.ok
    || summary && summary.rewardClaimed === true
  );

  if (autoHit.error) {
    return "hit_error";
  }
  if (claimOk) {
    return "claimed";
  }
  if (isBossAutomationSummaryFinished(summary)) {
    return "finished";
  }
  if (summary && summary.hasSession) {
    return "active";
  }
  if (autoHit.attempted) {
    return "hit_done";
  }
  return "started";
}

function shouldBossAutomationChainAfterSettle(settle = {}, queue = [], chainDepth = 0) {
  if (!Array.isArray(queue) || queue.length === 0) {
    return false;
  }
  if (Number(chainDepth || 0) >= BOSS_AUTOMATION_MAX_CHAIN_STARTS) {
    return false;
  }
  const summary = getBossAutomationSummaryFrom(settle.snapshot);
  if (!summary || summary.stateUnknown) {
    return false;
  }
  return Boolean(
    summary.hasSession === false
    && summary.hasReward !== true
    && summary.rewardReady !== true
  );
}

async function settleBossAutomationStartedItem(startedItem, autoHit, startResult, sessionPath) {
  let snapshot = autoHit && autoHit.result && autoHit.result.finalSnapshot
    ? autoHit.result.finalSnapshot
    : startResult && startResult.snapshot
      ? startResult.snapshot
      : null;
  let summary = getBossAutomationSummaryFrom(snapshot);
  const completionObserved = Boolean(
    autoHit && autoHit.result && autoHit.result.rewardSettlement
      && autoHit.result.rewardSettlement.completionObserved
  ) || isBossAutomationSummaryFinished(summary) || Boolean(
    autoHit && autoHit.attempted
      && summary
      && summary.stateUnknown !== true
      && summary.hasSession === false,
  );
  let rewardClaimed = Boolean(
    autoHit && autoHit.result && autoHit.result.claim && autoHit.result.claim.ok
  ) || Boolean(summary && summary.rewardClaimed);

  // A successful claim made by the hit runner is authoritative. Its final snapshot is
  // deliberately captured before the claim to keep the foreground path fast, so clear
  // those stale reward flags locally instead of issuing the same claim a second time.
  if (rewardClaimed && snapshot && summary) {
    snapshot = {
      ...snapshot,
      summary: {
        ...summary,
        stateReliable: true,
        stateUnknown: false,
        unknownReason: null,
        hasSession: false,
        hasReward: false,
        rewardReady: false,
        rewardClaimed: true,
        rewardStatus: "claimed",
      },
    };
    summary = snapshot.summary;
  }

  if (
    !summary
    || (
      summary.stateUnknown
      && summary.unknownReason !== "reward_settlement_pending"
    )
    || (
      summary.hasSession === true
      && !(autoHit && autoHit.attempted)
    )
  ) {
    await sleep(BOSS_AUTOMATION_AFTER_START_POLL_MS);
    snapshot = await withContext(sessionPath, async ({ client }) => (
      loadBossRuntimeSnapshot(client, startedItem && startedItem.bossId ? startedItem.bossId : null)
    ));
    summary = getBossAutomationSummaryFrom(snapshot);
  }

  let claim = null;
  let backgroundSettlement = autoHit && autoHit.result && autoHit.result.rewardSettlement
    ? autoHit.result.rewardSettlement.background || null
    : null;
  if (!rewardClaimed && summary && (summary.hasReward || summary.rewardReady)) {
    claim = await claimBossRewardForAutomation(sessionPath, "started_item_settle");
    if (claim && claim.response) {
      await recordBossAutomationClaimActivity(claim.response, {
        claimOk: claim.ok,
        bossId: startedItem && startedItem.bossId,
        item: startedItem,
        sessionId: summary && (summary.rewardSessionId || summary.sessionId),
        reason: claim.ok ? null : getGameResponseMessage(claim.response),
      });
    }
    snapshot = claim.snapshot || snapshot;
    summary = getBossAutomationSummaryFrom(snapshot) || summary;
    rewardClaimed = rewardClaimed || Boolean(claim && claim.ok);
  }

  if (
    rewardClaimed
    && !(autoHit && autoHit.result && autoHit.result.claim && autoHit.result.claim.ok)
    && !(claim && claim.response)
  ) {
    await recordBossAutomationClaimActivity({
      ok: true,
      status: 200,
      data: {
        success: true,
        bossId: startedItem && startedItem.bossId,
        sessionId: summary && (summary.rewardSessionId || summary.sessionId),
      },
    }, {
      claimOk: true,
      bossId: startedItem && startedItem.bossId,
      item: startedItem,
      sessionId: summary && (summary.rewardSessionId || summary.sessionId),
    });
  }

  if (
    completionObserved
    && !rewardClaimed
    && summary
    && summary.hasSession === false
    && summary.hasReward !== true
    && summary.rewardReady !== true
  ) {
    const observedSummary = summary;
    snapshot = markBossRewardSettlementPending(
      snapshot,
      startedItem && startedItem.bossId ? startedItem.bossId : null,
      observedSummary,
    );
    summary = getBossAutomationSummaryFrom(snapshot);
    backgroundSettlement = await withContext(sessionPath, async ({ client }) => (
      scheduleBossRewardSettlement(
        client,
        startedItem && startedItem.bossId ? startedItem.bossId : null,
        snapshot,
        {
          observedSummary,
          item: startedItem,
        },
      )
    ));
  }

  return {
    snapshot,
    summary,
    claim,
    backgroundSettlement,
  };
}

async function startNextBossFromAutomationQueueInternal(options = {}, sessionPath) {
  let automationState = await ensureBossAutomationLoaded();
  let queue = normalizeBossAutomationQueue(automationState.queue);
  const skipped = [];
  const autoBuyKeysIfProfitable = toBool(options.autoBuyKeysIfProfitable, false);
  const chainDepth = Math.max(0, Number(options.chainDepth || 0) || 0);
  await appendBossAutomationEvent("start_next_begin", {
    options: {
      reason: options.reason || null,
      autoBuyKeysIfProfitable,
      chainDepth,
    },
    queueLength: queue.length,
    queueHead: summarizeBossAutomationItem(queue[0]),
  });
  if (bossAutomationRuntime.pendingReward) {
    bossAutomationRuntime.lastAction = {
      type: "noop",
      at: new Date().toISOString(),
      reason: "reward_settlement_pending",
      pendingReward: bossAutomationRuntime.pendingReward,
    };
    await appendBossAutomationEvent("start_next_noop", bossAutomationRuntime.lastAction);
    return {
      ok: true,
      started: false,
      reason: "reward_settlement_pending",
      pendingReward: bossAutomationRuntime.pendingReward,
      snapshot: null,
      skipped,
      automation: buildBossAutomationView(automationState),
    };
  }
  let snapshot = await getBossState({}, sessionPath);
  let summary = snapshot && snapshot.snapshot && snapshot.snapshot.summary
    ? snapshot.snapshot.summary
    : null;
  await appendBossAutomationEvent("start_next_state", {
    snapshot: summarizeBossAutomationSnapshot(snapshot),
  });

  if (summary && summary.hasSession) {
    if (isSoloBossAutomationMode(summary.mode) && Number(summary.bossId || 0) > 0) {
      const rememberedItem = bossAutomationRuntime.lastStarted
        && bossAutomationRuntime.lastStarted.item
        && Number(bossAutomationRuntime.lastStarted.item.bossId || 0) === Number(summary.bossId)
        ? bossAutomationRuntime.lastStarted.item
        : null;
      const activeItem = {
        ...(rememberedItem || {}),
        ...(rememberedItem?.autoKillSolo === false ? { skipCombo: true } : {}),
        bossId: Number(summary.bossId),
        mode: summary.mode,
        comboMode: rememberedItem ? rememberedItem.comboMode || "" : "",
        label: summary.title ? `#${summary.bossId} ${summary.title}` : `#${summary.bossId}`,
      };
      const autoHit = await runBossAutomationAutoHit(activeItem, options, sessionPath);
      const settle = await settleBossAutomationStartedItem(activeItem, autoHit, { snapshot }, sessionPath);
      const status = getBossAutomationRunStatus(settle, autoHit);
      const settleClaimResponse = settle.claim
        ? summarizeBossAutomationResponse(settle.claim.response)
        : null;
      const autoHitSummary = autoHit.attempted
        ? summarizeBossAutomationHitResult(autoHit.result)
        : null;
      const claimRewards = (settleClaimResponse && settleClaimResponse.rewards)
        || (autoHitSummary && autoHitSummary.claim && autoHitSummary.claim.response
          ? autoHitSummary.claim.response.rewards
          : null);
      const snoozedUntil = snoozeBossAutomation(
        autoHit.error || "active solo boss checked",
        autoHit.error ? getBossAutomationBackoffMs(autoHit.error) : BOSS_AUTOMATION_AFTER_START_POLL_MS,
      );
      const at = new Date().toISOString();
      bossAutomationRuntime.lastError = autoHit.error || null;
      bossAutomationRuntime.lastAction = {
        type: "active_auto_hit",
        at,
        reason: "active_solo_session",
        item: activeItem,
        activeBossId: summary.bossId ?? null,
        currentHp: summary.currentHp ?? null,
        snoozedUntil,
        status,
        settle: summarizeBossAutomationSnapshot(settle.snapshot),
        claim: settleClaimResponse
          ? {
              ok: settle.claim.ok,
              response: settleClaimResponse,
            }
          : null,
        autoHit: autoHitSummary
          ? {
              ok: !autoHit.error,
              error: autoHit.error,
              result: autoHitSummary,
            }
          : null,
      };
      pushBossAutomationRecentActivity({
        at,
        type: "active_auto_hit",
        status,
        item: activeItem,
        reason: autoHit.error || null,
        currentHp: settle.summary ? settle.summary.currentHp ?? null : null,
        maxHp: settle.summary ? settle.summary.maxHp ?? null : null,
        hits: autoHitSummary ? autoHitSummary.hits : null,
        elapsedMs: autoHit.elapsedMs,
        comboElapsedMs: autoHit.comboElapsedMs,
        finisherElapsedMs: autoHitSummary && autoHitSummary.soloFinisher
          ? autoHitSummary.soloFinisher.elapsedMs
          : null,
        finisherPreparationElapsedMs: autoHitSummary && autoHitSummary.soloFinisher
          ? autoHitSummary.soloFinisher.preparationElapsedMs
          : null,
        finisherHitElapsedMs: autoHitSummary && autoHitSummary.soloFinisher
          ? autoHitSummary.soloFinisher.hitElapsedMs
          : null,
        totalElapsedMs: autoHit.totalElapsedMs,
        claimOk: Boolean((settle.claim && settle.claim.ok) || (autoHitSummary && autoHitSummary.claim && autoHitSummary.claim.ok)),
        rewards: claimRewards,
        comboRewards: autoHitSummary ? autoHitSummary.comboRewards : [],
        weaponDelta: autoHitSummary ? autoHitSummary.weaponDelta : null,
        comboEconomy: autoHitSummary ? autoHitSummary.comboEconomy : null,
      });
      await appendBossAutomationEvent("active_session_auto_hit", bossAutomationRuntime.lastAction);
      if (shouldBossAutomationChainAfterSettle(settle, queue, chainDepth)) {
        await appendBossAutomationEvent("active_session_quick_chain", {
          item: summarizeBossAutomationItem(activeItem),
          status,
          queueLength: queue.length,
        });
        return startNextBossFromAutomationQueueInternal({
          ...options,
          reason: "active_session_quick_chain",
          chainDepth: chainDepth + 1,
        }, sessionPath);
      }
      if (
        queue.length > 0
        || shouldPollBossAutomationUnsettledReward(
          bossAutomationRuntime.lastStarted,
          bossAutomationRuntime.recentActivity,
        )
      ) {
        scheduleBossAutomationFollowupTick("active_session_followup", BOSS_AUTOMATION_ACTIVE_POLL_MS);
      }
      return {
        ok: !autoHit.error,
        started: false,
        reason: "active_solo_session_auto_hit",
        snapshot,
        settle,
        autoHitAttempted: autoHit.attempted,
        autoHit: autoHit.result,
        autoHitError: autoHit.error,
        skipped,
        automation: buildBossAutomationView(automationState),
      };
    }

    bossAutomationRuntime.lastError = null;
    bossAutomationRuntime.lastAction = {
      type: "noop",
      at: new Date().toISOString(),
      reason: "active_session",
      activeBossId: summary.bossId ?? null,
      currentHp: summary.currentHp ?? null,
    };
    if (
      queue.length > 0
      || shouldPollBossAutomationUnsettledReward(
        bossAutomationRuntime.lastStarted,
        bossAutomationRuntime.recentActivity,
      )
    ) {
      scheduleBossAutomationFollowupTick("active_session_followup", BOSS_AUTOMATION_ACTIVE_POLL_MS);
    }
    await appendBossAutomationEvent("start_next_noop", bossAutomationRuntime.lastAction);
    return {
      ok: true,
      started: false,
      reason: "active_session",
      snapshot,
      skipped,
      automation: buildBossAutomationView(automationState),
    };
  }

  if (summary && (summary.hasReward || summary.rewardReady)) {
    const lastStartedItem = bossAutomationRuntime.lastStarted
      && bossAutomationRuntime.lastStarted.item;
    const lastStartedSessionId = pickString(
      summary.rewardSessionId,
      summary.sessionId,
      bossAutomationRuntime.lastStarted && bossAutomationRuntime.lastStarted.settle
        && (bossAutomationRuntime.lastStarted.settle.rewardSessionId
          || bossAutomationRuntime.lastStarted.settle.sessionId),
      bossAutomationRuntime.lastStarted && bossAutomationRuntime.lastStarted.snapshot
        && bossAutomationRuntime.lastStarted.snapshot.sessionId,
      null,
    );
    const pendingRewardBossId = pickNumeric(
      summary.rewardBossId,
      summary.bossId,
      lastStartedItem && lastStartedItem.bossId,
      null,
    );
    const claim = await claimBossRewardForAutomation(sessionPath, "start_next_reward_pending");
    await recordBossAutomationClaimActivity(claim.response, {
      claimOk: claim.ok,
      bossId: pendingRewardBossId,
      item: lastStartedItem,
      sessionId: lastStartedSessionId,
    });
    snapshot = {
      ...snapshot,
      snapshot: claim.snapshot,
    };
    summary = claim.snapshot && claim.snapshot.summary ? claim.snapshot.summary : summary;

    if (!claim.ok || (summary && (summary.hasReward || summary.rewardReady))) {
      bossAutomationRuntime.lastError = claim.ok ? null : getGameResponseMessage(claim.response);
      bossAutomationRuntime.lastAction = {
        type: claim.ok ? "noop" : "claim_reward_failed",
        at: new Date().toISOString(),
        reason: "reward_pending",
        rewardBossId: summary ? summary.rewardBossId ?? null : null,
        claim: {
          ok: claim.ok,
          response: summarizeBossAutomationResponse(claim.response),
        },
      };
      await appendBossAutomationEvent("start_next_noop", bossAutomationRuntime.lastAction);
      return {
        ok: claim.ok,
        started: false,
        reason: "reward_pending",
        claim,
        snapshot,
        skipped,
        automation: buildBossAutomationView(automationState),
      };
    }
  }

  // `/api/boss/check-session` and `/api/boss/rewards` are not an atomic pair.
  // During a fast team kill they can briefly report neither an active fight nor
  // a ready reward. Starting the next fight in that gap makes the game consume
  // the previous reward, so its exact contents can no longer be written to the
  // journal. Treat an active -> no-session edge as authoritative and claim once
  // before touching the next queue item, even when `/rewards` is still stale.
  const sessionLossReward = getBossAutomationSessionLossRewardContext(
    bossAutomationRuntime.lastStarted,
    summary,
    bossAutomationRuntime.recentActivity,
  );
  if (sessionLossReward) {
    const claim = await claimBossRewardForAutomation(sessionPath, "start_next_session_lost");
    await recordBossAutomationClaimActivity(claim.response, {
      claimOk: claim.ok,
      bossId: sessionLossReward.bossId,
      item: sessionLossReward.item,
      sessionId: sessionLossReward.sessionId,
      reason: claim.ok ? null : getGameResponseMessage(claim.response),
    });
    snapshot = {
      ...snapshot,
      snapshot: claim.snapshot,
    };
    summary = claim.snapshot && claim.snapshot.summary ? claim.snapshot.summary : summary;

    if (!claim.ok) {
      const pendingSnapshot = markBossRewardSettlementPending(
        claim.snapshot,
        sessionLossReward.bossId,
        sessionLossReward.observedSummary,
      );
      const backgroundSettlement = await withContext(sessionPath, async ({ client }) => (
        scheduleBossRewardSettlement(
          client,
          sessionLossReward.bossId,
          pendingSnapshot,
          {
            observedSummary: sessionLossReward.observedSummary,
            item: sessionLossReward.item,
          },
        )
      ));
      snapshot = {
        ...snapshot,
        snapshot: pendingSnapshot,
      };
      bossAutomationRuntime.lastError = getGameResponseMessage(claim.response) || "reward settlement pending";
      bossAutomationRuntime.lastAction = {
        type: "noop",
        at: new Date().toISOString(),
        reason: "reward_settlement_pending",
        item: sessionLossReward.item,
        sessionId: sessionLossReward.sessionId,
        pendingReward: backgroundSettlement,
      };
      await appendBossAutomationEvent("start_next_noop", bossAutomationRuntime.lastAction);
      return {
        ok: false,
        started: false,
        reason: "reward_settlement_pending",
        claim,
        pendingReward: backgroundSettlement,
        snapshot,
        skipped,
        automation: buildBossAutomationView(automationState),
      };
    }
  }

  let attemptsRemaining = queue.length;

  while (queue.length > 0 && attemptsRemaining > 0) {
    attemptsRemaining -= 1;
    const item = queue[0];
    let preview;
    await appendBossAutomationEvent("queue_item_preview_begin", {
      item: summarizeBossAutomationItem(item),
      attemptsRemaining,
    });

    try {
      preview = await startBoss({
        ...buildBossAutomationStartPayload(item, { autoBuyKeysIfProfitable }),
        dryRun: true,
      }, sessionPath);
      await appendBossAutomationEvent("queue_item_preview_ok", {
        item: summarizeBossAutomationItem(item),
        plan: summarizeBossAutomationPlan(preview && preview.plan),
      });
    } catch (error) {
      const reason = getErrorMessage(error);
      await appendBossAutomationEvent("queue_item_preview_error", {
        item: summarizeBossAutomationItem(item),
        reason,
      });
      if (
        String(item && item.comboMode || "").trim()
        && /(?:has no combo modes|unsupported combo mode)/i.test(reason)
      ) {
        const cleanedItem = clearBossAutomationQueueItemCombo(item);
        const queueMutation = await applyAndSaveBossAutomationQueueOperations([{
          type: "replace",
          from: item,
          item: cleanedItem,
        }]);
        automationState = queueMutation.saved;
        queue = normalizeBossAutomationQueue(automationState.queue);
        const updatedItem = queueMutation.applied[0] && queueMutation.applied[0].item || cleanedItem;
        skipped.push({
          item: updatedItem,
          reason: "combo_mode_removed",
        });
        bossAutomationRuntime.lastAction = {
          type: "remove_unavailable_combo",
          at: new Date().toISOString(),
          item: updatedItem,
          reason,
        };
        await appendBossAutomationEvent("queue_item_combo_mode_removed", bossAutomationRuntime.lastAction);
        continue;
      }
      if (!isBossAutomationSkippableError(error)) {
        const snoozedUntil = snoozeBossAutomation(reason, getBossAutomationBackoffMs(reason));
        bossAutomationRuntime.lastError = reason;
        bossAutomationRuntime.lastAction = {
          type: "start_error",
          at: new Date().toISOString(),
          item,
          reason,
          snoozedUntil,
        };
        await appendBossAutomationEvent("start_next_error", bossAutomationRuntime.lastAction);
        return {
          ok: false,
          started: false,
          reason: "start_error",
          error: reason,
          skipped,
          automation: buildBossAutomationView(automationState),
        };
      }

      const deferred = deferBossAutomationQueueHead(queue, reason);
      const queueMutation = await applyAndSaveBossAutomationQueueOperations([{
        type: "defer",
        item: queue[0],
        reason,
        at: deferred.item && deferred.item.lastDeferredAt,
      }]);
      automationState = queueMutation.saved;
      queue = normalizeBossAutomationQueue(automationState.queue);
      deferred.item = queueMutation.applied[0] && queueMutation.applied[0].item || deferred.item;
      skipped.push({
        item: deferred.item,
        reason,
      });
      bossAutomationRuntime.lastAction = {
        type: "defer",
        at: new Date().toISOString(),
        item: deferred.item,
        reason,
      };
      await appendBossAutomationEvent("queue_item_deferred", bossAutomationRuntime.lastAction);
      continue;
    }

    const previewBoss = preview && preview.plan ? preview.plan.selectedBoss : null;
    if (
      previewBoss
      && previewBoss.hasEnoughKeys === false
      && !autoBuyKeysIfProfitable
      && !shouldAlwaysAutoBuyKeysForBoss(previewBoss.id)
    ) {
      const reason = `missing_keys_preflight: need ${previewBoss.requiredKeys ?? "?"}, ` +
        `have ${previewBoss.keysOwned ?? "?"}, source boss ${previewBoss.keySourceBossId ?? "unknown"}`;
      const autoGenerated = String(item && item.origin || "").trim().toLowerCase() === "auto";
      const deferred = deferBossAutomationQueueHead(queue, reason);
      const queueMutation = await applyAndSaveBossAutomationQueueOperations([{
        type: autoGenerated ? "remove" : "defer",
        item: queue[0],
        reason,
        at: deferred.item && deferred.item.lastDeferredAt,
      }]);
      automationState = queueMutation.saved;
      queue = normalizeBossAutomationQueue(automationState.queue);
      deferred.item = queueMutation.applied[0] && queueMutation.applied[0].item || deferred.item;
      skipped.push({
        item: deferred.item,
        reason,
        removed: autoGenerated,
      });
      bossAutomationRuntime.lastAction = {
        type: autoGenerated ? "remove_invalid_auto_item" : "defer_preflight",
        at: new Date().toISOString(),
        item: deferred.item,
        reason,
        plan: summarizeBossAutomationPlan(preview.plan),
      };
      await appendBossAutomationEvent(
        autoGenerated ? "queue_item_removed_missing_keys" : "queue_item_deferred",
        bossAutomationRuntime.lastAction,
      );
      continue;
    }

    let startResult;
    let startAttemptStartedAtMs = null;
    try {
      await appendBossAutomationEvent("queue_item_start_begin", {
        item: summarizeBossAutomationItem(item),
        payload: preview && preview.plan ? preview.plan.payload : buildBossAutomationStartPayload(item, { autoBuyKeysIfProfitable }),
      });
      const latestState = await ensureBossAutomationLoaded();
      const latestQueue = normalizeBossAutomationQueue(latestState.queue);
      if (
        latestQueue.length === 0
        || !areBossAutomationQueueItemsAddressableEqual(latestQueue[0], item)
      ) {
        automationState = latestState;
        queue = latestQueue;
        await appendBossAutomationEvent("queue_item_start_cancelled", {
          item: summarizeBossAutomationItem(item),
          reason: "queue_head_changed",
          queueHead: summarizeBossAutomationItem(queue[0]),
        });
        continue;
      }
      startAttemptStartedAtMs = Date.now();
      startResult = await startBoss(
        buildBossAutomationStartPayload(item, { autoBuyKeysIfProfitable }),
        sessionPath,
        {
          preparedPlan: preview && preview.plan ? preview.plan : null,
          liteSnapshot: true,
        },
      );
      await appendBossAutomationEvent("queue_item_start_result", {
        item: summarizeBossAutomationItem(item),
        reused: Boolean(startResult && startResult.reused),
        plan: summarizeBossAutomationPlan(startResult && startResult.plan),
        response: summarizeBossAutomationResponse(startResult && startResult.response),
        snapshot: summarizeBossAutomationSnapshot(startResult && startResult.snapshot),
        autoBuy: startResult && startResult.autoBuy ? startResult.autoBuy : null,
        timing: startResult && startResult.timing ? startResult.timing : null,
      });
      const pendingRewardRecovery = startResult && startResult.pendingRewardRecovery;
      if (
        pendingRewardRecovery
        && pendingRewardRecovery.attempted
        && !pendingRewardRecovery.rewardActivity
      ) {
        const previousItem = bossAutomationRuntime.lastStarted
          && bossAutomationRuntime.lastStarted.item
          ? bossAutomationRuntime.lastStarted.item
          : null;
        await recordBossAutomationClaimActivity(pendingRewardRecovery.claimResponse, {
          claimOk: pendingRewardRecovery.claimOk,
          bossId: previousItem && previousItem.bossId
            ? previousItem.bossId
            : item.bossId,
          item: previousItem,
        });
      }
    } catch (error) {
      const reason = getErrorMessage(error);
      const snoozedUntil = snoozeBossAutomation(reason, getBossAutomationBackoffMs(reason));
      bossAutomationRuntime.lastError = reason;
      bossAutomationRuntime.lastAction = {
        type: "start_error",
        at: new Date().toISOString(),
        item,
        reason,
        snoozedUntil,
      };
      await appendBossAutomationEvent("queue_item_start_error", bossAutomationRuntime.lastAction);
      return {
        ok: false,
        started: false,
        reason: "start_error",
        error: reason,
        preview,
        skipped,
        automation: buildBossAutomationView(automationState),
      };
    }
    const reconciliation = await reconcileBossAutomationStartConfirmation(item, startResult, {
      loadSnapshot: (bossId) => withContext(sessionPath, async ({ client }) => (
        loadBossRuntimeSnapshotLite(client, bossId)
      )),
    });
    startResult = reconciliation.startResult;
    const confirmation = reconciliation.confirmation;
    const started = confirmation.started;
    const startConfirmedAtMs = Date.now();
    const startElapsedMs = normalizeElapsedMs(startConfirmedAtMs - startAttemptStartedAtMs) ?? 0;
    const startRequestElapsedMs = normalizeElapsedMs(
      startResult && startResult.timing && startResult.timing.startRequestElapsedMs,
    );
    if (reconciliation.retried) {
      await appendBossAutomationEvent("queue_item_start_confirmation_retry", {
        item: summarizeBossAutomationItem(item),
        confirmation,
        retryError: reconciliation.retryError,
        snapshot: summarizeBossAutomationSnapshot(startResult && startResult.snapshot),
      });
    }

    if (started) {
      const startedItem = queue[0];
      const queueMutation = await applyAndSaveBossAutomationQueueOperations([{
        type: "remove",
        item: startedItem,
      }]);
      automationState = queueMutation.saved;
      queue = normalizeBossAutomationQueue(automationState.queue);
      const bossStartedAt = new Date(startConfirmedAtMs).toISOString();
      pushBossAutomationRecentActivity({
        at: bossStartedAt,
        type: "start",
        status: "started",
        item: startedItem,
        startElapsedMs,
        startRequestElapsedMs,
        sessionId: startResult && startResult.snapshot && startResult.snapshot.summary
          ? startResult.snapshot.summary.sessionId ?? null
          : null,
        currentHp: startResult && startResult.snapshot && startResult.snapshot.summary
          ? startResult.snapshot.summary.currentHp ?? null
          : null,
        maxHp: startResult && startResult.snapshot && startResult.snapshot.summary
          ? startResult.snapshot.summary.maxHp ?? null
          : null,
      });
      await appendBossAutomationEvent("queue_item_start_confirmed", {
        at: bossStartedAt,
        item: summarizeBossAutomationItem(startedItem),
        confirmation,
        startElapsedMs,
        startRequestElapsedMs,
        sessionId: startResult && startResult.snapshot && startResult.snapshot.summary
          ? startResult.snapshot.summary.sessionId ?? null
          : null,
        timing: startResult && startResult.timing ? startResult.timing : null,
      });
      const autoHit = await runBossAutomationAutoHit(startedItem, options, sessionPath);
      if (isQueuedZarubaDamageTask(startedItem) && autoHit.attempted && !autoHit.error) {
        const cleanup = await clearQueuedZarubaDamageTasks();
        automationState = cleanup.saved;
        queue = normalizeBossAutomationQueue(automationState.queue);
        if (cleanup.removed > 0) {
          await appendBossAutomationEvent("zaruba_damage_queue_cleared", {
            item: summarizeBossAutomationItem(startedItem),
            removed: cleanup.removed,
            reason: "one_damage_task_per_zaruba",
          });
        }
      }
      const settle = await settleBossAutomationStartedItem(startedItem, autoHit, startResult, sessionPath);
      const status = getBossAutomationRunStatus(settle, autoHit);
      const settleClaimResponse = settle.claim
        ? summarizeBossAutomationResponse(settle.claim.response)
        : null;
      const autoHitSummary = autoHit.attempted
        ? summarizeBossAutomationHitResult(autoHit.result)
        : null;
      const claimRewards = (settleClaimResponse && settleClaimResponse.rewards)
        || (autoHitSummary && autoHitSummary.claim && autoHitSummary.claim.response
          ? autoHitSummary.claim.response.rewards
          : null);
      const snoozedUntil = snoozeBossAutomation(
        `started ${startedItem.label || `#${startedItem.bossId}`}; ${status}`,
        status === "active" ? BOSS_AUTOMATION_ACTIVE_POLL_MS : BOSS_AUTOMATION_AFTER_START_POLL_MS,
      );
      const finishedAt = new Date().toISOString();
      const lastStarted = {
        at: bossStartedAt,
        finishedAt,
        item: startedItem,
        confirmation,
        startElapsedMs,
        startRequestElapsedMs,
        snapshot: startResult && startResult.snapshot && startResult.snapshot.summary
          ? startResult.snapshot.summary
          : null,
        settle: settle.snapshot && settle.snapshot.summary ? settle.snapshot.summary : null,
        status,
        rewardSettledAt: (settle.claim && settle.claim.ok)
          || (autoHitSummary && autoHitSummary.claim && autoHitSummary.claim.ok)
          ? finishedAt
          : null,
        claim: settleClaimResponse
          ? {
              ok: settle.claim.ok,
              response: settleClaimResponse,
            }
          : null,
        autoHit: autoHitSummary
          ? {
              ok: !autoHit.error,
              error: autoHit.error,
              result: autoHitSummary,
            }
          : null,
      };
      bossAutomationRuntime.lastError = autoHit.error || null;
      bossAutomationRuntime.lastStarted = lastStarted;
      bossAutomationRuntime.lastAction = {
        type: startResult.reused ? "reuse_active" : "start",
        at: finishedAt,
        startedAt: bossStartedAt,
        item: startedItem,
        confirmation,
        startElapsedMs,
        startRequestElapsedMs,
        snoozedUntil,
        status,
        settle: summarizeBossAutomationSnapshot(settle.snapshot),
        claim: lastStarted.claim,
        autoHit: lastStarted.autoHit,
      };
      pushBossAutomationRecentActivity({
        at: finishedAt,
        type: autoHit.attempted ? "fight_result" : startResult.reused ? "reuse_active" : "start",
        status,
        item: startedItem,
        reason: autoHit.error || null,
        currentHp: settle.summary ? settle.summary.currentHp ?? null : null,
        maxHp: settle.summary ? settle.summary.maxHp ?? null : null,
        hits: autoHitSummary ? autoHitSummary.hits : null,
        elapsedMs: autoHit.elapsedMs,
        comboElapsedMs: autoHit.comboElapsedMs,
        finisherElapsedMs: autoHitSummary && autoHitSummary.soloFinisher
          ? autoHitSummary.soloFinisher.elapsedMs
          : null,
        finisherPreparationElapsedMs: autoHitSummary && autoHitSummary.soloFinisher
          ? autoHitSummary.soloFinisher.preparationElapsedMs
          : null,
        finisherHitElapsedMs: autoHitSummary && autoHitSummary.soloFinisher
          ? autoHitSummary.soloFinisher.hitElapsedMs
          : null,
        totalElapsedMs: autoHit.totalElapsedMs,
        startElapsedMs,
        startRequestElapsedMs,
        sessionId: settle.summary
          ? settle.summary.rewardSessionId || settle.summary.sessionId || null
          : null,
        claimOk: Boolean((settle.claim && settle.claim.ok) || (autoHitSummary && autoHitSummary.claim && autoHitSummary.claim.ok)),
        rewards: claimRewards,
        comboRewards: autoHitSummary ? autoHitSummary.comboRewards : [],
        weaponDelta: autoHitSummary ? autoHitSummary.weaponDelta : null,
        comboEconomy: autoHitSummary ? autoHitSummary.comboEconomy : null,
      });
      await appendBossAutomationEvent("queue_item_started", bossAutomationRuntime.lastAction);
      if (shouldBossAutomationChainAfterSettle(settle, queue, chainDepth)) {
        await appendBossAutomationEvent("queue_item_quick_chain", {
          item: summarizeBossAutomationItem(startedItem),
          status,
          queueLength: queue.length,
          chainDepth,
        });
        const chained = await startNextBossFromAutomationQueueInternal({
          ...options,
          reason: "quick_chain",
          chainDepth: chainDepth + 1,
        }, sessionPath);
        return {
          ok: true,
          started: true,
          preview,
          startResult,
          settle,
          autoHitAttempted: autoHit.attempted,
          autoHit: autoHit.result,
          autoHitError: autoHit.error,
          startedItem,
          confirmation,
          skipped,
          chained,
          automation: chained && chained.automation ? chained.automation : buildBossAutomationView(),
        };
      }
      if (
        queue.length > 0
        || shouldPollBossAutomationUnsettledReward(
          bossAutomationRuntime.lastStarted,
          bossAutomationRuntime.recentActivity,
        )
      ) {
        scheduleBossAutomationFollowupTick(
          status === "active" ? "post_start_active_followup" : "post_start_followup",
          status === "active" ? BOSS_AUTOMATION_ACTIVE_POLL_MS : BOSS_AUTOMATION_AFTER_START_POLL_MS,
        );
      }
      return {
        ok: true,
        started: true,
        preview,
        startResult,
        settle,
        autoHitAttempted: autoHit.attempted,
        autoHit: autoHit.result,
        autoHitError: autoHit.error,
        startedItem,
        confirmation,
        skipped,
        automation: buildBossAutomationView(automationState),
      };
    }

    if (!confirmation.responseSuccess && startResult && startResult.response) {
      const reason = getGameResponseMessage(startResult.response) || confirmation.reason;
      const deferred = deferBossAutomationQueueHead(queue, reason);
      const queueMutation = await applyAndSaveBossAutomationQueueOperations([{
        type: "defer",
        item: queue[0],
        reason,
        at: deferred.item && deferred.item.lastDeferredAt,
      }]);
      automationState = queueMutation.saved;
      queue = normalizeBossAutomationQueue(automationState.queue);
      deferred.item = queueMutation.applied[0] && queueMutation.applied[0].item || deferred.item;
      skipped.push({
        item: deferred.item,
        reason,
      });
      bossAutomationRuntime.lastAction = {
        type: "defer_start_failed",
        at: new Date().toISOString(),
        item: deferred.item,
        reason,
        confirmation,
      };
      await appendBossAutomationEvent("queue_item_deferred", bossAutomationRuntime.lastAction);
      continue;
    }

    bossAutomationRuntime.lastAction = {
      type: "start_attempt",
      at: new Date().toISOString(),
      item,
      reason: confirmation.reason,
      confirmation,
    };
    await appendBossAutomationEvent("queue_item_start_unconfirmed", bossAutomationRuntime.lastAction);
    return {
      ok: Boolean(startResult && !startResult.dryRun),
      started: false,
      reason: confirmation.reason,
      preview,
      startResult,
      confirmation,
      skipped,
      automation: buildBossAutomationView(automationState),
    };
  }

  if (queue.length > 0) {
    bossAutomationRuntime.lastAction = {
      type: "noop",
      at: new Date().toISOString(),
      reason: "no_startable_queue_items",
      skipped,
    };
    await appendBossAutomationEvent("start_next_noop", bossAutomationRuntime.lastAction);
    return {
      ok: true,
      started: false,
      reason: "no_startable_queue_items",
      skipped,
      automation: buildBossAutomationView(automationState),
    };
  }

  bossAutomationRuntime.lastAction = {
    type: "noop",
    at: new Date().toISOString(),
    reason: "queue_empty",
  };
  await appendBossAutomationEvent("start_next_noop", bossAutomationRuntime.lastAction);
  return {
    ok: true,
    started: false,
    reason: "queue_empty",
    skipped,
    automation: buildBossAutomationView(automationState),
  };
}

async function initializeBossAutomation(sessionPath) {
  const state = await ensureBossAutomationLoaded(sessionPath);
  restoreBossAutomationRecentActivity(await loadBossAutomationEvents());
  if (
    shouldRunBossAutomationQueue(state)
    || state && state.enabled && state.autoStartNext
      && shouldPollBossAutomationUnsettledReward(
        bossAutomationRuntime.lastStarted,
        bossAutomationRuntime.recentActivity,
      )
  ) {
    scheduleBossAutomationImmediateTick("initialize");
  }
  return buildBossAutomationView(state);
}

async function getBossAutomationState(sessionPath) {
  const state = await ensureBossAutomationLoaded(sessionPath);
  return buildBossAutomationView(state);
}

async function updateBossAutomation(options = {}, sessionPath) {
  const update = await runBossAutomationStateSerialized(async () => {
    const current = await ensureBossAutomationLoaded(sessionPath);
    const queueUpdate = getBossAutomationQueueUpdateDecision(current, options);
    const queueOperations = applyBossAutomationQueueOperations(current.queue, options.queueOperations);
    const nextQueue = queueOperations.applied.length > 0
      ? queueOperations.queue
      : queueUpdate.accepted && options.queue !== undefined
        ? options.queue
        : current.queue;
    const next = normalizeBossAutomationState({
      ...current,
      ...options,
      queue: nextQueue,
      queueRevision: current.queueRevision,
    });
    const saved = await saveBossAutomationStateUnlocked(next);
    clearBossAutomationSnooze();
    bossAutomationRuntime.lastError = null;
    bossAutomationRuntime.lastAction = {
      type: "update",
      at: new Date().toISOString(),
    };
    return {
      saved,
      view: buildBossAutomationView(saved),
      queueUpdate,
      queueOperations,
    };
  });

  await appendBossAutomationEvent("automation_update", {
      enabled: update.saved.enabled,
      autoStartNext: update.saved.autoStartNext,
      intervalSec: update.saved.intervalSec,
      queueLength: update.saved.queue.length,
      queueHead: summarizeBossAutomationItem(update.saved.queue[0]),
      queueUpdate: {
        ...update.queueUpdate,
        operationsApplied: update.queueOperations.applied.length,
        operationsSkipped: update.queueOperations.skipped.length,
      },
    });

  if (shouldRunBossAutomationQueue(update.saved)) {
    scheduleBossAutomationImmediateTick("update");
  }
  return {
    ...update.view,
    queueUpdate: {
      ...update.queueUpdate,
      operationsApplied: update.queueOperations.applied.length,
      operationsSkipped: update.queueOperations.skipped.length,
      currentQueueRevision: update.saved.queueRevision,
    },
  };
}

async function startNextBossFromAutomationQueue(options = {}, sessionPath) {
  return runBossAutomationSerialized(async () => startNextBossFromAutomationQueueInternal(options, sessionPath));
}

async function runBossAutomationTick(options = {}, sessionPath) {
  return runBossAutomationSerialized(async () => {
    const state = await ensureBossAutomationLoaded();
    bossAutomationRuntime.running = true;
    bossAutomationRuntime.lastTickStartedAt = new Date().toISOString();
    bossAutomationRuntime.tickCount += 1;
    await appendBossAutomationEvent("tick_begin", {
      reason: options.reason || null,
      tickCount: bossAutomationRuntime.tickCount,
      enabled: state.enabled,
      autoStartNext: state.autoStartNext,
      queueLength: Array.isArray(state.queue) ? state.queue.length : 0,
      queueHead: summarizeBossAutomationItem(Array.isArray(state.queue) ? state.queue[0] : null),
    });

    try {
      if (!state.autoStartNext) {
        clearBossAutomationFollowupTimer();
        bossAutomationRuntime.lastAction = {
          type: "noop",
          at: new Date().toISOString(),
          reason: "auto_start_disabled",
        };
        await appendBossAutomationEvent("tick_noop", bossAutomationRuntime.lastAction);
        return {
          ok: true,
          started: false,
          reason: "auto_start_disabled",
          automation: buildBossAutomationView(state),
        };
      }

      if (bossAutomationRuntime.pendingReward) {
        bossAutomationRuntime.lastAction = {
          type: "noop",
          at: new Date().toISOString(),
          reason: "reward_settlement_pending",
          pendingReward: bossAutomationRuntime.pendingReward,
        };
        await appendBossAutomationEvent("tick_noop", bossAutomationRuntime.lastAction);
        return {
          ok: true,
          started: false,
          reason: "reward_settlement_pending",
          pendingReward: bossAutomationRuntime.pendingReward,
          automation: buildBossAutomationView(state),
        };
      }

      const snoozeRemainingMs = getBossAutomationSnoozeRemainingMs();
      if (snoozeRemainingMs > 0) {
        scheduleBossAutomationFollowupTick("snoozed_followup", snoozeRemainingMs + 50);
        bossAutomationRuntime.lastAction = {
          type: "noop",
          at: new Date().toISOString(),
          reason: "snoozed",
          snoozedUntil: bossAutomationRuntime.snoozedUntil,
          snoozeReason: bossAutomationRuntime.snoozeReason,
        };
        await appendBossAutomationEvent("tick_noop", bossAutomationRuntime.lastAction);
        return {
          ok: true,
          started: false,
          reason: "snoozed",
          snoozedUntil: bossAutomationRuntime.snoozedUntil,
          snoozeReason: bossAutomationRuntime.snoozeReason,
          snoozeRemainingMs,
          automation: buildBossAutomationView(state),
        };
      }

      const snapshot = await getBossState({}, sessionPath);
      const summary = snapshot && snapshot.snapshot && snapshot.snapshot.summary
        ? snapshot.snapshot.summary
        : null;

      if (!summary || summary.stateUnknown) {
        const reason = summary && summary.unknownReason
          ? summary.unknownReason
          : "boss_state_unknown";
        const snoozedUntil = snoozeBossAutomation(reason, getBossAutomationBackoffMs(reason));
        bossAutomationRuntime.lastError = reason;
        bossAutomationRuntime.lastAction = {
          type: "noop",
          at: new Date().toISOString(),
          reason: "state_unknown",
          snoozedUntil,
        };
        await appendBossAutomationEvent("tick_noop", bossAutomationRuntime.lastAction);
        return {
          ok: false,
          started: false,
          reason: "state_unknown",
          error: reason,
          automation: buildBossAutomationView(state),
        };
      }

      const hasSession = Boolean(summary.hasSession);
      if (hasSession) {
        if (isSoloBossAutomationMode(summary.mode)) {
          const result = await startNextBossFromAutomationQueueInternal(options, sessionPath);
          if (result && result.ok) {
            bossAutomationRuntime.lastError = null;
          }
          return result;
        }

        bossAutomationRuntime.lastError = null;
        bossAutomationRuntime.lastAction = {
          type: "noop",
          at: new Date().toISOString(),
          reason: "active_session",
          activeBossId: summary.bossId ?? null,
          currentHp: summary.currentHp ?? null,
        };
        if (
          Array.isArray(state.queue) && state.queue.length > 0
          || shouldPollBossAutomationUnsettledReward(
            bossAutomationRuntime.lastStarted,
            bossAutomationRuntime.recentActivity,
          )
        ) {
          scheduleBossAutomationFollowupTick("active_session_followup", BOSS_AUTOMATION_ACTIVE_POLL_MS);
        } else {
          clearBossAutomationFollowupTimer();
        }
        await appendBossAutomationEvent("tick_noop", bossAutomationRuntime.lastAction);
        return {
          ok: true,
          started: false,
          reason: "active_session",
          automation: buildBossAutomationView(state),
        };
      }

      if (summary.hasReward || summary.rewardReady) {
        const lastStartedItem = bossAutomationRuntime.lastStarted
          && bossAutomationRuntime.lastStarted.item;
        const lastStartedSessionId = pickString(
          summary.rewardSessionId,
          summary.sessionId,
          bossAutomationRuntime.lastStarted && bossAutomationRuntime.lastStarted.settle
            && (bossAutomationRuntime.lastStarted.settle.rewardSessionId
              || bossAutomationRuntime.lastStarted.settle.sessionId),
          bossAutomationRuntime.lastStarted && bossAutomationRuntime.lastStarted.snapshot
            && bossAutomationRuntime.lastStarted.snapshot.sessionId,
          null,
        );
        const pendingRewardBossId = pickNumeric(
          summary.rewardBossId,
          summary.bossId,
          lastStartedItem && lastStartedItem.bossId,
          null,
        );
        const claim = await claimBossRewardForAutomation(sessionPath, "tick_reward_pending");
        const claimSummary = claim.snapshot && claim.snapshot.summary ? claim.snapshot.summary : null;
        await recordBossAutomationClaimActivity(claim.response, {
          claimOk: claim.ok,
          bossId: pickNumeric(
            claimSummary && claimSummary.rewardBossId,
            pendingRewardBossId,
            null,
          ),
          item: lastStartedItem,
          sessionId: lastStartedSessionId,
          reason: claim.ok ? null : getGameResponseMessage(claim.response),
        });
        if (claim.ok && claimSummary && !claimSummary.hasReward && !claimSummary.rewardReady) {
          const result = await startNextBossFromAutomationQueueInternal(options, sessionPath);
          return {
            ...result,
            claim,
          };
        }

        bossAutomationRuntime.lastError = claim.ok ? null : getGameResponseMessage(claim.response);
        bossAutomationRuntime.lastAction = {
          type: claim.ok ? "noop" : "claim_reward_failed",
          at: new Date().toISOString(),
          reason: "reward_pending",
          claim: {
            ok: claim.ok,
            response: summarizeBossAutomationResponse(claim.response),
          },
        };
        await appendBossAutomationEvent("tick_noop", bossAutomationRuntime.lastAction);
        return {
          ok: claim.ok,
          started: false,
          reason: "reward_pending",
          claim,
          automation: buildBossAutomationView(state),
        };
      }

      if (!Array.isArray(state.queue) || state.queue.length === 0) {
        const sessionLossReward = getBossAutomationSessionLossRewardContext(
          bossAutomationRuntime.lastStarted,
          summary,
          bossAutomationRuntime.recentActivity,
        );
        if (sessionLossReward) {
          const result = await startNextBossFromAutomationQueueInternal(options, sessionPath);
          if (result && result.reason === "queue_empty") {
            clearBossAutomationFollowupTimer();
            clearBossAutomationSnooze();
          }
          return result;
        }
        clearBossAutomationFollowupTimer();
        clearBossAutomationSnooze();
        bossAutomationRuntime.lastAction = {
          type: "noop",
          at: new Date().toISOString(),
          reason: "queue_empty",
        };
        await appendBossAutomationEvent("tick_noop", bossAutomationRuntime.lastAction);
        return {
          ok: true,
          started: false,
          reason: "queue_empty",
          automation: buildBossAutomationView(state),
        };
      }

      const result = await startNextBossFromAutomationQueueInternal(options, sessionPath);
      if (result && result.ok) {
        bossAutomationRuntime.lastError = null;
      }
      return result;
    } catch (error) {
      const message = getErrorMessage(error);
      bossAutomationRuntime.lastError = message;
      bossAutomationRuntime.lastAction = {
        type: "tick_error",
        at: new Date().toISOString(),
        reason: message,
      };
      await appendBossAutomationEvent("tick_error", bossAutomationRuntime.lastAction);
      return {
        ok: false,
        started: false,
        reason: "tick_error",
        error: message,
        automation: buildBossAutomationView(state),
      };
    } finally {
      bossAutomationRuntime.running = false;
      bossAutomationRuntime.lastTickFinishedAt = new Date().toISOString();
    }
  });
}

function addBossKeyPriceObservation(cache, sourceBossId, added, spent, currency = null) {
  const normalizedSourceBossId = Number(sourceBossId);
  const normalizedAdded = Number(added);
  const normalizedSpent = Number(spent);
  const normalizedCurrency = normalizeCurrencyCode(currency);

  if (
    !Number.isFinite(normalizedSourceBossId) || normalizedSourceBossId <= 0
    || !Number.isFinite(normalizedAdded) || normalizedAdded <= 0
    || !Number.isFinite(normalizedSpent) || normalizedSpent < 0
  ) {
    return cache;
  }

  const output = normalizeBossKeyPriceCache(cache || createEmptyBossKeyPriceCache());
  const key = String(normalizedSourceBossId);
  const current = output.sources[key] || {
    sourceBossId: normalizedSourceBossId,
    priceRubles: null,
    currency: null,
    addedTotal: 0,
    spentTotal: 0,
    observations: 0,
    lastSeenAt: null,
  };

  const addedTotal = current.addedTotal + normalizedAdded;
  const spentTotal = current.spentTotal + normalizedSpent;
  const priceRubles = addedTotal > 0 ? spentTotal / addedTotal : current.priceRubles;

  output.sources[key] = {
    sourceBossId: normalizedSourceBossId,
    priceRubles,
    currency: normalizedCurrency || normalizeCurrencyCode(current.currency),
    addedTotal,
    spentTotal,
    observations: current.observations + 1,
    lastSeenAt: new Date().toISOString(),
  };

  return output;
}

function buildBossKeyPriceView(catalog, cache) {
  const sources = new Map();
  const sourceCategoryByBossId = new Map(
    (Array.isArray(catalog && catalog.bosses) ? catalog.bosses : [])
      .map((boss) => [Number(boss.id), boss.categoryKey || null]),
  );

  for (const boss of Array.isArray(catalog && catalog.bosses) ? catalog.bosses : []) {
    const sourceBossId = Number(boss && boss.keys ? boss.keys.sourceBossId : null);
    if (!Number.isFinite(sourceBossId) || sourceBossId <= 0) {
      continue;
    }

    const sourceBossTitle = boss && boss.keys ? boss.keys.sourceBossTitle || null : null;
    const sourceLabel = boss && boss.keys ? boss.keys.sourceLabel || null : null;
    const targetBossId = Number(boss.id);
    const targetBossTitle = boss.title || null;
    const requiredKeys = Math.max(0, Number(boss && boss.keys ? boss.keys.requiredForAttack : 0));

    if (!sources.has(sourceBossId)) {
      sources.set(sourceBossId, {
        sourceBossId,
        sourceBossTitle,
        sourceLabel,
        targets: [],
      });
    }

    sources.get(sourceBossId).targets.push({
      bossId: Number.isFinite(targetBossId) ? targetBossId : null,
      title: targetBossTitle,
      requiredKeys,
    });
  }

  const rows = [...sources.values()]
    .map((entry) => {
      const observedPriceRubles = getObservedKeyPrice(cache, entry.sourceBossId);
      const observedCurrency = getObservedKeyPriceCurrency(cache, entry.sourceBossId);
      const inferredCurrency = sourceCategoryByBossId.get(Number(entry.sourceBossId)) === "guards"
        ? "paper"
        : "rubles";
      const currency = observedCurrency || inferredCurrency;
      const currencySource = observedCurrency ? "observed" : "inferred";
      const priceRubles = observedPriceRubles !== null
        ? observedPriceRubles
        : DEFAULT_KEY_PRICE_RUBLES;
      const priceSource = observedPriceRubles !== null ? "observed" : "default";

      return {
        sourceBossId: entry.sourceBossId,
        sourceBossTitle: entry.sourceBossTitle,
        sourceLabel: entry.sourceLabel,
        observedPriceRubles,
        observedCurrency,
        priceRubles,
        priceSource,
        currency,
        currencySource,
        targets: entry.targets.sort((left, right) => (left.bossId || 0) - (right.bossId || 0)),
      };
    })
    .sort((left, right) => left.sourceBossId - right.sourceBossId);

  return {
    generatedAt: new Date().toISOString(),
    defaultKeyPriceRubles: DEFAULT_KEY_PRICE_RUBLES,
    sources: rows,
  };
}

function buildBossKeyPriceProbeTargets(catalog, options = {}) {
  const requestedSourceBossIds = parsePositiveIntList(options.sourceBossIds);
  const requestedSet = requestedSourceBossIds.length > 0 ? new Set(requestedSourceBossIds) : null;
  const includePrisonSources = toBool(options.includePrisonSources, false);
  const bySourceBossId = new Map();

  for (const boss of Array.isArray(catalog && catalog.bosses) ? catalog.bosses : []) {
    const sourceBossId = Number(boss && boss.keys ? boss.keys.sourceBossId : null);
    const requiredKeys = Math.max(0, Number(boss && boss.keys ? boss.keys.requiredForAttack : 0));

    if (
      !Number.isFinite(sourceBossId)
      || sourceBossId <= 0
      || requiredKeys <= 0
      || !canBuyKeysForBoss(Number(boss && boss.id))
    ) {
      continue;
    }

    if (requestedSet && !requestedSet.has(sourceBossId)) {
      continue;
    }

    const sourceLabel = boss && boss.keys ? String(boss.keys.sourceLabel || "") : "";
    if (!includePrisonSources && sourceLabel.toLowerCase() === "in prisons") {
      continue;
    }

    const existing = bySourceBossId.get(sourceBossId);
    const candidate = {
      sourceBossId,
      sourceBossTitle: boss && boss.keys ? boss.keys.sourceBossTitle || null : null,
      sourceLabel: boss && boss.keys ? boss.keys.sourceLabel || null : null,
      targetBossId: Number(boss.id),
      targetBossTitle: boss.title || null,
      requiredKeys,
    };

    if (!existing || candidate.targetBossId < existing.targetBossId) {
      bySourceBossId.set(sourceBossId, candidate);
    }
  }

  return [...bySourceBossId.values()].sort((left, right) => left.sourceBossId - right.sourceBossId);
}

const FRIEND_ID_KEYS = new Set([
  "userId",
  "friendUserId",
  "fromUserId",
  "toUserId",
  "id",
]);

const FRIEND_CONTAINER_KEYS = new Set([
  "user",
  "profile",
  "friend",
  "fromUser",
  "toUser",
]);

const FRIEND_ARRAY_KEYS = new Set([
  "friends",
  "requests",
  "items",
  "list",
  "rows",
  "profiles",
  "values",
]);

function isNumericId(value) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    return /^\d+$/.test(value.trim());
  }
  return false;
}

function normalizeId(value) {
  return String(value).trim();
}

function addFriendIdsFromRecord(record, ids) {
  if (!record || typeof record !== "object") {
    return;
  }

  for (const key of FRIEND_ID_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key) && isNumericId(record[key])) {
      ids.push(normalizeId(record[key]));
    }
  }

  for (const key of FRIEND_CONTAINER_KEYS) {
    if (record[key] && typeof record[key] === "object") {
      addFriendIdsFromRecord(record[key], ids);
    }
  }
}

function collectFriendIdsFromPayload(payload) {
  const ids = [];
  const seen = new Set();

  const pushId = (value) => {
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    ids.push(value);
  };

  const visit = (value, depth = 0, keyHint = null) => {
    if (!value || depth > 5) {
      return;
    }

    if (isNumericId(value)) {
      pushId(normalizeId(value));
      return;
    }

    if (Array.isArray(value)) {
      if (!keyHint || FRIEND_ARRAY_KEYS.has(keyHint) || keyHint === "data" || keyHint === "result" || depth === 0) {
        for (const item of value) {
          if (isNumericId(item)) {
            pushId(normalizeId(item));
            continue;
          }
          const localIds = [];
          addFriendIdsFromRecord(item, localIds);
          localIds.forEach(pushId);
          visit(item, depth + 1, null);
        }
      } else {
        for (const item of value) {
          visit(item, depth + 1, null);
        }
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    for (const [key, nested] of Object.entries(value)) {
      if (FRIEND_ARRAY_KEYS.has(key)) {
        visit(nested, depth + 1, key);
      } else if (FRIEND_CONTAINER_KEYS.has(key)) {
        visit(nested, depth + 1, key);
      } else if (key === "data" || key === "result") {
        visit(nested, depth + 1, key);
      }
    }
  };

  visit(payload, 0, null);
  return ids;
}

function extractIncomingRequestUserIds(payload) {
  let records = [];

  if (Array.isArray(payload)) {
    records = payload;
  } else if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) {
      records = payload.data;
    } else if (payload.data && Array.isArray(payload.data.data)) {
      records = payload.data.data;
    } else if (Array.isArray(payload.requests)) {
      records = payload.requests;
    }
  }

  const ids = [];
  const seen = new Set();

  for (const item of records) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const isIncoming = item.isIncoming === undefined ? true : Boolean(item.isIncoming);
    if (!isIncoming) {
      continue;
    }

    const candidate = item.fromUserId
      ?? item.userId
      ?? item.id
      ?? (item.user && (item.user.id ?? item.user.userId))
      ?? null;

    if (!isNumericId(candidate)) {
      continue;
    }

    const id = normalizeId(candidate);
    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function summarizeCheckpointCosts(items) {
  const checkpoints = Array.isArray(items) ? items : [];
  const energyCosts = [];
  const checkpointCosts = [];

  for (const checkpoint of checkpoints) {
    const energyCost = asNumber(checkpoint.energyCost, null);
    const clicksRequired = asNumber(checkpoint.clicksRequired, null);
    if (energyCost !== null) {
      energyCosts.push(energyCost);
    }
    if (energyCost !== null && clicksRequired !== null) {
      checkpointCosts.push(energyCost * clicksRequired);
    }
  }

  const summarize = (values) => {
    if (!values.length) {
      return { min: null, max: null, avg: null, total: null };
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: total / values.length,
      total,
    };
  };

  return {
    count: checkpoints.length,
    energy: summarize(energyCosts),
    checkpoint: summarize(checkpointCosts),
    checkpoints: checkpoints.map((checkpoint) => ({
      checkpointId: checkpoint.checkpointId,
      title: checkpoint.title,
      clicksRequired: checkpoint.clicksRequired,
      energyCost: checkpoint.energyCost,
    })),
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function normalizeWearableInventoryResponse(response) {
  if (!isSuccessfulGameResponse(response)) {
    return null;
  }
  const payload = getGamePayload(response);
  if (
    !payload
    || typeof payload !== "object"
    || !Array.isArray(payload.ownedClothing)
    || !Array.isArray(payload.ownedTattoos)
  ) {
    return null;
  }
  return payload;
}

async function loadWearableInventory(client, options = {}) {
  const accountKey = String(options.accountKey || client.baseUrl || "default");
  if (wearableInventoryInflight.has(accountKey)) {
    return wearableInventoryInflight.get(accountKey);
  }

  const promise = (async () => {
    let emptyInventory = null;
    let lastResponse = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      lastResponse = await client.get("/api/clothing/inventory");
      const inventory = normalizeWearableInventoryResponse(lastResponse);
      if (inventory) {
        if (inventory.ownedClothing.length > 0 || inventory.ownedTattoos.length > 0) {
          wearableInventoryCache.set(accountKey, inventory);
          return inventory;
        }
        emptyInventory = inventory;
      }
      if (attempt < 2) {
        await sleep(150);
      }
    }

    const cached = wearableInventoryCache.get(accountKey);
    if (cached) {
      logEvent("wearable.inventory.fallback", {
        status: lastResponse ? lastResponse.status : null,
        reason: emptyInventory ? "unexpected_empty_inventory" : "invalid_response",
      });
      return cached;
    }
    if (emptyInventory) {
      return emptyInventory;
    }
    throw new Error("Не удалось загрузить инвентарь одежды и наколок.");
  })().finally(() => {
    wearableInventoryInflight.delete(accountKey);
  });
  wearableInventoryInflight.set(accountKey, promise);
  return promise;
}

function isPendingBossRewardResponse(response) {
  if (isSuccessfulGameResponse(response)) {
    return false;
  }

  const payload = getGameResponsePayload(response);
  const code = String(payload.code ?? payload.errorCode ?? "").trim().toUpperCase();
  const message = [
    payload.message,
    payload.error,
    payload.reason,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();

  return code === "PENDING_REWARD"
    || message.includes("reward not claimed")
    || /награда.{0,40}не (?:получена|забрана|собрана)/i.test(message);
}

async function retryBossStartAfterPendingReward(client, payload, response) {
  if (!isPendingBossRewardResponse(response)) {
    return {
      response,
      recovery: null,
    };
  }

  const claimResponse = await client.bosses.claim();
  const claimOk = isSuccessfulGameResponse(claimResponse);
  let retryResponse = null;

  if (claimOk) {
    retryResponse = await client.bosses.startAttack(payload);
  }

  return {
    response: retryResponse || response,
    recovery: {
      attempted: true,
      claimOk,
      claimResponse,
      retriedStart: Boolean(retryResponse),
      retryOk: retryResponse ? isSuccessfulGameResponse(retryResponse) : false,
      retryResponse,
    },
  };
}

function findCatalogBoss(catalog, bossId) {
  if (!catalog || !Array.isArray(catalog.bosses)) {
    return null;
  }

  const numericBossId = Number(bossId);
  return catalog.bosses.find((boss) => Number(boss.id) === numericBossId) || null;
}

function extractBossCurrencyReward(boss, currency) {
  if (!boss || !boss.globalReward || !Array.isArray(boss.globalReward.currencies)) {
    return 0;
  }

  const normalizedCurrency = normalizeCurrencyCode(currency) || "rubles";
  const targetCurrency = boss.globalReward.currencies.find(
    (item) => item && String(item.type || "").trim().toLowerCase() === normalizedCurrency,
  );

  return targetCurrency ? Number(targetCurrency.amount) || 0 : 0;
}

function shouldAlwaysAutoBuyKeysForBoss(bossId) {
  const numericBossId = Number(bossId);
  return Number.isFinite(numericBossId) && ALWAYS_AUTO_BUY_START_BOSS_IDS.has(numericBossId);
}

function evaluateAutoBuyKeyForBoss(
  catalog,
  selectedBoss,
  keyPriceRubles,
  observedKeyPriceRubles = null,
  observedKeyCurrency = null,
) {
  const selectedBossId = selectedBoss ? Number(selectedBoss.id) : null;
  const boss = selectedBossId === null ? null : findCatalogBoss(catalog, selectedBossId);
  const requiredKeys = Math.max(
    0,
    Number(
      pickNumeric(
        selectedBoss && selectedBoss.requiredKeys,
        boss && boss.keys ? boss.keys.requiredForAttack : null,
        0,
      ),
    ) || 0,
  );
  const availableKeys = Math.max(
    0,
    Number(
      pickNumeric(
        selectedBoss && selectedBoss.keysOwned,
        boss && boss.keys
          ? pickNumeric(
            boss.keys.ownedAttackKeys,
            boss.keys.owned,
            boss.keys.ownedSourceKeys,
          )
          : null,
        0,
      ),
    ) || 0,
  );
  const missingKeys = Math.max(0, requiredKeys - availableKeys);
  const manualPriceRubles = asNumber(keyPriceRubles, null);
  const observedPrice = asNumber(observedKeyPriceRubles, null);
  const keyPriceRublesFinal = manualPriceRubles !== null && manualPriceRubles > 0
    ? Math.max(0, manualPriceRubles)
    : observedPrice !== null && observedPrice > 0
      ? Math.max(0, observedPrice)
      : DEFAULT_KEY_PRICE_RUBLES;
  const keyPriceSource = manualPriceRubles !== null && manualPriceRubles > 0
    ? "manual"
    : observedPrice !== null && observedPrice > 0
      ? "observed"
      : "default";
  const sourceBossId = selectedBoss && selectedBoss.keySourceBossId !== undefined
    ? selectedBoss.keySourceBossId
    : boss && boss.keys
      ? boss.keys.sourceBossId
      : null;
  const sourceBoss = sourceBossId === null || sourceBossId === undefined
    ? null
    : findCatalogBoss(catalog, sourceBossId);
  const inferredCurrency = sourceBoss && sourceBoss.categoryKey === "guards"
    ? "paper"
    : "rubles";
  const keyCurrency = normalizeCurrencyCode(observedKeyCurrency) || inferredCurrency;
  const rewardAmount = extractBossCurrencyReward(boss, keyCurrency);
  const buyCostRubles = missingKeys * keyPriceRublesFinal;
  const netAmount = rewardAmount - buyCostRubles;
  const sourceBossTitle = selectedBoss && selectedBoss.keySourceBossTitle !== undefined
    ? selectedBoss.keySourceBossTitle
    : boss && boss.keys
      ? boss.keys.sourceBossTitle
      : null;
  const sourceLabel = selectedBoss && selectedBoss.keySourceLabel !== undefined
    ? selectedBoss.keySourceLabel
    : boss && boss.keys
      ? boss.keys.sourceLabel
      : null;
  const sourceLabelNormalized = String(sourceLabel || "").trim().toLowerCase();
  const keyBypassed = selectedBoss && selectedBoss.keyBypassed !== undefined
    ? Boolean(selectedBoss.keyBypassed)
    : Boolean(boss && boss.keys && boss.keys.bypassedForAttack);
  const canBuy = !keyBypassed
    && requiredKeys > 0
    && canBuyKeysForBoss(selectedBossId)
    && sourceBossId !== null
    && sourceBossId !== undefined
    && sourceLabelNormalized !== "in prisons";
  const profitable = canBuy && missingKeys > 0 && netAmount > 0;

  return {
    bossId: boss ? Number(boss.id) : selectedBossId,
    bossTitle: boss ? boss.title || null : selectedBoss ? selectedBoss.title || null : null,
    sourceBossId,
    sourceBossTitle,
    sourceLabel,
    requiredKeys,
    availableKeys,
    missingKeys,
    keyBypassed,
    keyPriceRubles: keyPriceRublesFinal,
    keyPriceSource,
    keyCurrency,
    rewardAmount,
    rewardCurrency: keyCurrency,
    buyCost: buyCostRubles,
    buyCostRubles,
    netAmount,
    net: netAmount,
    rewardRubles: keyCurrency === "rubles" ? rewardAmount : null,
    netRubles: keyCurrency === "rubles" ? netAmount : null,
    canBuy,
    profitable,
  };
}

function isNoKeysStartResponse(response) {
  if (!response || response.ok) {
    return false;
  }

  const data = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const message = [
    data.message,
    data.error,
    data.code,
  ].filter(Boolean).join(" ").toLowerCase();

  return /\u043a\u043b\u044e\u0447|not_enough_keys|insufficient.*keys|no.*keys/i.test(message);
}

async function tryBuyBossKeys(client, bossId) {
  const payload = { bossId: Number(bossId) };
  const response = await client.bosses.buyKeys(payload);
  const data = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const added = pickNumeric(
    data.added,
    data.addedKeys,
    data.keysAdded,
    data.deltaKeys,
    data.count,
    data.amount,
    null,
  );
  const spent = pickNumeric(
    data.spent,
    data.spentRubles,
    data.rublesSpent,
    data.price,
    data.priceRubles,
    data.cost,
    data.totalPrice,
    null,
  );

  return {
    ok: isSuccessfulGameResponse(response),
    payload,
    response,
    added,
    spent,
    pricePerKey: Number.isFinite(Number(spent)) && Number.isFinite(Number(added)) && Number(added) > 0
      ? Number(spent) / Number(added)
      : pickNumeric(data.pricePerKey, data.unitPrice, null),
    currency: data.currency || null,
    keyBossId: data.keyBossId ?? null,
    visibleBossId: data.visibleBossId ?? null,
    message: data.message || null,
  };
}

async function buyMissingBossKeys(client, bossId, missingKeys) {
  const attempts = [];
  let remaining = Math.max(0, Number(missingKeys) || 0);
  const maxAttempts = Math.max(1, remaining || 1) + 2;

  for (let attemptIndex = 0; attemptIndex < maxAttempts && remaining > 0; attemptIndex += 1) {
    const attempt = await tryBuyBossKeys(client, bossId);
    attempts.push({
      attemptIndex,
      ...attempt,
    });

    if (!attempt.ok) {
      break;
    }

    const added = Math.max(0, Number(attempt.added || 0));
    if (added <= 0) {
      break;
    }

    remaining = Math.max(0, remaining - added);
  }

  const purchasedKeys = attempts.reduce(
    (sum, attempt) => sum + Math.max(0, Number(attempt.added || 0)),
    0,
  );
  const spentRubles = attempts.reduce((sum, attempt) => {
    const spent = Number(attempt.spent);
    return sum + (Number.isFinite(spent) && spent > 0 ? spent : 0);
  }, 0);
  const lastAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const success = remaining === 0 || purchasedKeys > 0;
  const reason = remaining === 0
    ? "covered_missing_keys"
    : lastAttempt && !lastAttempt.ok
      ? "buy_request_failed"
      : purchasedKeys > 0
        ? "partial_buy"
        : "buy_zero_result";

  return {
    attempts,
    purchasedKeys,
    spentRubles,
    remainingKeys: remaining,
    success,
    reason,
  };
}

function parseBossTimestampMs(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value > 1_000_000_000_000 ? value : value * 1000;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  }
  const raw = String(value).trim();
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  const utcFallback = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(raw)
    ? Date.parse(`${raw}Z`)
    : NaN;
  return Number.isFinite(utcFallback) ? utcFallback : null;
}

function parseBossCooldownReductionMs(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  const parts = String(value).trim().split(":").map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) {
    return 0;
  }
  const [hours, minutes, seconds] = parts;
  return Math.max(0, ((hours * 60 + minutes) * 60 + seconds) * 1000);
}

function getBossMeleeStatSources(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const session = source.session && typeof source.session === "object"
    ? source.session
    : null;
  const candidates = [
    source.weaponStatsEffective,
    session && session.weaponStatsEffective,
    source.weaponStats,
    session && session.weaponStats,
    source,
    session,
  ];
  const sources = [];
  const seen = new Set();

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object" || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    sources.push(candidate);
  }

  return sources;
}

function hasBossMeleeStatValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function pickBossMeleeStatValue(sources, key, flatKey, nestedKey = null, cooldownField = null) {
  for (const source of Array.isArray(sources) ? sources : []) {
    if (flatKey && hasBossMeleeStatValue(source[flatKey])) {
      return source[flatKey];
    }

    const nested = nestedKey && source[nestedKey] && typeof source[nestedKey] === "object"
      ? source[nestedKey]
      : null;
    if (nested && hasBossMeleeStatValue(nested[key])) {
      return nested[key];
    }

    const cooldowns = source.meleeCooldowns && typeof source.meleeCooldowns === "object"
      ? source.meleeCooldowns
      : null;
    const cooldown = cooldowns && cooldowns[key] && typeof cooldowns[key] === "object"
      ? cooldowns[key]
      : null;
    if (cooldown && cooldownField && hasBossMeleeStatValue(cooldown[cooldownField])) {
      return cooldown[cooldownField];
    }
  }

  return null;
}

function buildBossMeleeCooldowns(payload, nowMs = Date.now()) {
  const source = payload && typeof payload === "object" ? payload : {};
  const statSources = getBossMeleeStatSources(source);
  const result = {};

  for (const [key, fields] of Object.entries(BOSS_MELEE_COOLDOWN_FIELDS)) {
    const lastUsedAtMs = parseBossTimestampMs(
      pickBossMeleeStatValue(statSources, key, fields.last, "lastUsedAt", "lastUsedAt"),
    );
    const effectiveCooldownSec = pickNumeric(
      pickBossMeleeStatValue(statSources, key, fields.cooldown, "cooldownSec", "cooldownSec"),
      null,
    );
    const cooldownMs = effectiveCooldownSec !== null && effectiveCooldownSec >= 0
      ? Number(effectiveCooldownSec) * 1000
      : Math.max(
          0,
          DEFAULT_BOSS_MELEE_COOLDOWN_MS
            - parseBossCooldownReductionMs(
              pickBossMeleeStatValue(statSources, key, fields.reduction, "cooldownReduction"),
            ),
        );
    const explicitReadyAtMs = parseBossTimestampMs(
      pickBossMeleeStatValue(statSources, key, "readyAt", "readyAt", "readyAt"),
    );
    const readyAtMs = lastUsedAtMs === null
      ? explicitReadyAtMs
      : lastUsedAtMs + cooldownMs;
    const remainingMs = readyAtMs === null
      ? 0
      : Math.max(0, readyAtMs - Number(nowMs || Date.now()));

    result[key] = {
      active: remainingMs > 0,
      cooldownSec: Math.max(0, Math.round(cooldownMs / 1000)),
      lastUsedAt: lastUsedAtMs === null ? null : new Date(lastUsedAtMs).toISOString(),
      readyAt: readyAtMs === null ? null : new Date(readyAtMs).toISOString(),
      remainingMs,
      restorePriceRubles: BOSS_MELEE_RESTORE_PRICE_RUBLES,
    };
  }

  return result;
}

function summarizeBossCheckSession(response) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const nestedSession = payload && payload.session && typeof payload.session === "object"
    ? payload.session
    : null;
  const directSession = !nestedSession && (
    payload.sessionId !== undefined
    || payload.bossId !== undefined
    || payload.mode !== undefined
    || payload.currentHp !== undefined
    || payload.baseHp !== undefined
  )
    ? payload
    : null;
  const session = nestedSession || directSession;
  const currentHp = session ? pickNumeric(session.currentHp) : null;
  const isCompleted = session
    ? Boolean(session.isCompleted) || (currentHp !== null && currentHp <= 0)
    : false;
  const explicitHasSession = payload.hasSession === undefined || payload.hasSession === null
    ? null
    : Boolean(payload.hasSession);
  const sessionLooksActive = Boolean(
    session
    && !isCompleted
    && (
      session.sessionId !== undefined && session.sessionId !== null && session.sessionId !== ""
      || session.bossId !== undefined && session.bossId !== null && session.bossId !== ""
      || currentHp !== null && currentHp > 0
    )
  );
  const hasSession = explicitHasSession === null
    ? sessionLooksActive
    : Boolean(explicitHasSession || sessionLooksActive);

  return {
    ok: isSuccessfulGameResponse(response),
    hasSession,
    hasReward: Boolean(payload.hasReward || payload.rewardReady || payload.claimReady || payload.canClaim),
    sessionId: session ? session.sessionId ?? null : null,
    bossId: session ? session.bossId ?? null : null,
    mode: session ? session.mode ?? null : null,
    currentHp,
    baseHp: session ? pickNumeric(session.baseHp) : null,
    maxHp: session ? pickNumeric(session.maxHp, session.baseHp) : null,
    personalDamage: session ? pickNumeric(session.personalDamage, session.personalRawDamage) : null,
    isCompleted,
    rewardClaimed: session ? Boolean(session.rewardClaimed) : false,
    endsAt: session ? session.endsAt ?? null : null,
    title: session ? session.title ?? null : null,
    meleeCooldowns: buildBossMeleeCooldowns(payload),
  };
}

function summarizeBossFriendDamage(response) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};

  return {
    ok: isSuccessfulGameResponse(response),
    sessionId: payload.sessionId ?? null,
    itemsCount: Array.isArray(payload.items) ? payload.items.length : 0,
    isOver: payload.isOver === undefined ? null : Boolean(payload.isOver),
    currentHp: pickNumeric(payload.currentHp),
  };
}

function summarizeBossRewards(response) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const status = payload.status ?? null;
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const ready = payload.ready === true
    || payload.hasReward === true
    || payload.rewardReady === true
    || payload.claimReady === true
    || payload.canClaim === true
    || normalizedStatus === "ready"
    || normalizedStatus === "claim_ready"
    || normalizedStatus === "reward_ready"
    || normalizedStatus === "can_claim";
  const rewardsPayload = resolveBossRewardPayload(payload);

  return {
    ok: isSuccessfulGameResponse(response),
    ready,
    status,
    bossId: ready && rewardsPayload ? rewardsPayload.bossId ?? null : null,
    sessionId: ready && rewardsPayload ? rewardsPayload.sessionId ?? null : null,
    readyAt: payload.readyAt ?? null,
    retryAfterMs: pickNumeric(payload.retryAfterMs),
  };
}

function buildBossRuntimeFailureReason(response, fallback = "request_failed") {
  const message = getGameResponseMessage(response);
  if (message) {
    return message;
  }
  if (response && response.status) {
    return `HTTP ${response.status}`;
  }
  return fallback;
}

function getGameResponsePayload(response) {
  return response && response.data && typeof response.data === "object"
    ? response.data
    : {};
}

function getGameResponseMessage(response) {
  const payload = getGameResponsePayload(response);
  const message = pickString(
    payload.message,
    payload.error,
    payload.reason,
    payload.code,
    payload.errorCode,
    null,
  );
  return message === null ? null : String(message);
}

function isMeleeBossActionType(type) {
  return MELEE_BOSS_ACTION_KEYS.has(String(type || "").trim());
}

function isBossConsumableActionType(type) {
  return BOSS_CONSUMABLE_ACTION_KEYS.has(String(type || "").trim());
}

function isBossConsumableShortageResponse(response, type) {
  if (isSuccessfulGameResponse(response) || !isBossConsumableActionType(type)) {
    return false;
  }

  const payload = getGameResponsePayload(response);
  const text = [
    payload.message,
    payload.error,
    payload.reason,
    payload.code,
    payload.errorCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const weaponType = String(type || "").trim().toLowerCase();
  const mentionsWeapon = weaponType && text.includes(weaponType);
  const shortage = payload.insufficient === true
    || payload.notEnough === true
    || /not_?enough|insufficient|out_?of_?stock/.test(text)
    || text.includes("\u043d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447");

  return Boolean(shortage && mentionsWeapon);
}

function getBossConsumablePurchaseCount(item) {
  const count = pickNumeric(item && item.payload ? item.payload.count : null);
  return count !== null && count > 0 ? Math.floor(count) : 1;
}

async function tryBuyBossConsumable(client, item, requestOptions = {}) {
  const weaponType = String(item && item.type ? item.type : "").trim();
  if (!isBossConsumableActionType(weaponType)) {
    return {
      attempted: false,
      ok: false,
      weaponType: weaponType || null,
      count: null,
      message: "not_a_consumable",
    };
  }

  const count = getBossConsumablePurchaseCount(item);
  const response = await client.bosses.buyWeapon({ weaponType, count }, requestOptions);
  const payload = getGameResponsePayload(response);
  const unitPrice = pickNumeric(
    payload.unitPrice,
    payload.pricePerItem,
    payload.pricePerWeapon,
    BOSS_CONSUMABLE_PRICES_RUBLES[weaponType],
    null,
  );
  const explicitSpent = pickNumeric(
    payload.spent,
    payload.spentRubles,
    payload.rublesSpent,
    payload.totalPrice,
    payload.totalCost,
    null,
  );
  const spent = explicitSpent !== null
    ? explicitSpent
    : unitPrice !== null
      ? unitPrice * count
      : null;
  const currency = normalizeCurrencyCode(
    pickString(payload.currency, payload.spentCurrency, payload.priceCurrency, "rubles"),
  ) || "rubles";
  return {
    attempted: true,
    ok: isSuccessfulGameResponse(response),
    weaponType,
    count,
    unitPrice,
    spent,
    currency,
    estimated: explicitSpent === null && spent !== null,
    message: getGameResponseMessage(response),
  };
}

function resolveBossRewardPayload(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (value.rewards && typeof value.rewards === "object") {
    return value.rewards;
  }
  if (value.data && typeof value.data === "object") {
    const nested = resolveBossRewardPayload(value.data);
    if (nested) {
      return nested;
    }
  }
  return (
    Array.isArray(value.reward)
    || Array.isArray(value.items)
    || Array.isArray(value.tattoos)
    || Array.isArray(value.clothing)
    || Array.isArray(value.cameras)
    || Array.isArray(value.stashGearReward)
    || Array.isArray(value.stashGear)
    || Array.isArray(value.weapons)
    || value.weapons && typeof value.weapons === "object"
    || Array.isArray(value.currencies)
    || value.globalReward && typeof value.globalReward === "object"
    || value.bossId !== undefined
    || value.authority !== undefined
    || value.keys !== undefined
  )
    ? value
    : null;
}

function summarizeBossClaimRewards(rewards) {
  const source = resolveBossRewardPayload(rewards) || rewards;
  if (!source || typeof source !== "object") {
    return null;
  }

  const toItem = (item, idFields = [], fallbackType = null) => {
    if (!item || typeof item !== "object") {
      return null;
    }
    const id = idFields
      .map((field) => item[field])
      .find((value) => value !== null && value !== undefined && value !== "") ?? null;
    return {
      type: pickString(item.type, item.kind, fallbackType, null),
      id,
      name: pickString(item.name, item.title, null),
      amount: pickNumeric(item.amount, item.qty, item.count, null),
    };
  };
  const items = [
    ...(Array.isArray(source.reward) ? source.reward : [])
      .map((item) => toItem(item, ["id", "tattooId", "clothingId", "cameraId", "rewardId"])),
    ...(Array.isArray(source.items) ? source.items : [])
      .map((item) => toItem(item, ["id", "tattooId", "clothingId", "cameraId", "rewardId", "itemId"])),
    ...(Array.isArray(source.tattoos) ? source.tattoos : [])
      .map((item) => toItem(item, ["id", "tattooId", "rewardId"], "tattoo")),
    ...(Array.isArray(source.clothing) ? source.clothing : [])
      .map((item) => toItem(item, ["id", "clothingId", "rewardId"], "clothing")),
    ...(Array.isArray(source.cameras) ? source.cameras : [])
      .map((item) => toItem(item, ["id", "cameraId", "rewardId"], "camera")),
  ].filter(Boolean);
  const stashGear = [
    ...(Array.isArray(source.stashGearReward) ? source.stashGearReward : [])
      .map((item) => toItem(item, ["id", "gearId", "itemId"])),
    ...(Array.isArray(source.stashGear) ? source.stashGear : [])
      .map((item) => toItem(item, ["id", "gearId", "itemId"], "stash")),
  ].filter(Boolean);
  const globalReward = source.globalReward && typeof source.globalReward === "object"
    ? source.globalReward
    : {};
  const currencies = [
    ...(Array.isArray(globalReward.currencies) ? globalReward.currencies : []),
    ...(Array.isArray(source.currencies) ? source.currencies : []),
  ]
    .map((currency) => {
      if (!currency || typeof currency !== "object") {
        return null;
      }
      return {
        type: pickString(currency.type, currency.currency, currency.name, null),
        amount: pickNumeric(currency.amount, currency.qty, currency.count, null),
      };
    })
    .filter(Boolean);
  const collectWeapons = (value) => {
    if (Array.isArray(value)) {
      return value;
    }
    if (value && typeof value === "object") {
      return Object.entries(value).map(([type, amount]) => ({ type, amount }));
    }
    return [];
  };
  const weapons = collectWeapons(source.weapons)
    .map((item) => toItem(
      item,
      ["id", "weaponId"],
      pickString(item && item.type, item && item.weaponType, "weapon"),
    ))
    .filter(Boolean);
  const authority = pickNumeric(globalReward.authority, source.authority, null);
  const keys = pickNumeric(globalReward.keys, source.keys, null);
  const stashCount = pickNumeric(
    source.stashCount,
    source.stash && typeof source.stash === "object" ? source.stash.count : null,
    source.stash && typeof source.stash === "object" ? source.stash.amount : null,
    typeof source.stash === "number" ? source.stash : null,
    null,
  );

  if (
    items.length === 0
    && stashGear.length === 0
    && weapons.length === 0
    && currencies.length === 0
    && authority === null
    && keys === null
    && stashCount === null
  ) {
    return null;
  }

  const summary = {
    bossId: source.bossId ?? null,
    title: pickString(source.title, null),
    mode: pickString(source.mode, null),
    items,
    stashGear,
    currencies,
    authority,
    keys,
  };
  if (weapons.length > 0) {
    summary.weapons = weapons;
  }
  if (stashCount !== null) {
    summary.stashCount = stashCount;
  }
  return summary;
}

function summarizeBossHitCombo(payload) {
  const combo = payload && payload.combo && typeof payload.combo === "object"
    ? payload.combo
    : null;
  if (!combo) {
    return null;
  }

  const summary = {
    selectedType: pickString(combo.selectedType, combo.type, null),
    progress: pickNumeric(combo.progress, null),
    required: pickNumeric(combo.required, combo.length, null),
    lastOutcome: pickString(combo.lastOutcome, combo.outcome, null),
  };
  return summary.selectedType !== null
    || summary.progress !== null
    || summary.required !== null
    || summary.lastOutcome !== null
    ? summary
    : null;
}

function summarizeBossComboReward(response) {
  const payload = getGameResponsePayload(response);
  const combo = payload.combo && typeof payload.combo === "object" ? payload.combo : null;
  const comboReward = payload.comboReward && typeof payload.comboReward === "object"
    ? payload.comboReward
    : combo && combo.comboReward && typeof combo.comboReward === "object"
      ? combo.comboReward
      : null;
  const zshReward = payload.zshReward && typeof payload.zshReward === "object"
    ? payload.zshReward
    : payload.zsh && typeof payload.zsh === "object"
      ? payload.zsh
      : combo && combo.zshReward && typeof combo.zshReward === "object"
        ? combo.zshReward
        : combo && combo.zsh && typeof combo.zsh === "object"
          ? combo.zsh
          : null;
  const zshDrops = Array.isArray(zshReward && zshReward.drops) ? zshReward.drops : [];

  if (!comboReward && zshDrops.length === 0) {
    return null;
  }

  const claimed = summarizeBossClaimRewards(comboReward);
  const knownWeaponTypes = new Set(["poison", "gunshot", "knife"]);
  const toItem = (item, fallbackType = null) => {
    if (!item || typeof item !== "object") {
      return null;
    }
    const type = pickString(
      item.type === "weapon" || item.type === "consumable" ? item.weaponType : null,
      item.type,
      item.weaponType,
      item.kind,
      fallbackType,
      null,
    );
    const id = ["id", "tattooId", "clothingId", "cameraId", "gearId", "rewardId", "itemId"]
      .map((field) => item[field])
      .find((value) => value !== null && value !== undefined && value !== "") ?? null;
    return {
      type,
      id,
      name: pickString(item.name, item.title, item.label, null),
      amount: pickNumeric(item.amount, item.qty, item.count, item.value, null),
    };
  };
  const appendUnique = (target, values) => {
    const known = new Set(target.map((value) => JSON.stringify(value)));
    for (const value of values) {
      if (!value || typeof value !== "object") {
        continue;
      }
      const key = JSON.stringify(value);
      if (!known.has(key)) {
        known.add(key);
        target.push(value);
      }
    }
  };
  const comboItems = [
    ...(Array.isArray(comboReward && comboReward.reward) ? comboReward.reward : [])
      .map((item) => toItem(item)),
    ...(Array.isArray(comboReward && comboReward.items) ? comboReward.items : [])
      .map((item) => toItem(item)),
    ...(Array.isArray(comboReward && comboReward.tattoos) ? comboReward.tattoos : [])
      .map((item) => toItem(item, "tattoo")),
    ...(Array.isArray(comboReward && comboReward.clothing) ? comboReward.clothing : [])
      .map((item) => toItem(item, "clothing")),
    ...(Array.isArray(comboReward && comboReward.cameras) ? comboReward.cameras : [])
      .map((item) => toItem(item, "camera")),
  ].filter(Boolean);
  const items = [];
  const weapons = [];
  for (const item of claimed ? claimed.items : []) {
    if (knownWeaponTypes.has(String(item.type || "").toLowerCase())) {
      appendUnique(weapons, [item]);
    } else {
      appendUnique(items, [item]);
    }
  }
  for (const item of comboItems) {
    if (knownWeaponTypes.has(String(item.type || "").toLowerCase())) {
      appendUnique(weapons, [item]);
    } else {
      appendUnique(items, [item]);
    }
  }

  const stashGear = [];
  appendUnique(stashGear, claimed ? claimed.stashGear : []);
  appendUnique(stashGear, [
    ...(Array.isArray(comboReward && comboReward.stashGear) ? comboReward.stashGear : []),
    ...zshDrops,
  ].map((item) => toItem(item, "stash")).filter(Boolean));

  const currencies = [];
  appendUnique(currencies, claimed ? claimed.currencies : []);
  appendUnique(currencies, (Array.isArray(comboReward && comboReward.currencies) ? comboReward.currencies : [])
    .map((currency) => {
      if (!currency || typeof currency !== "object") {
        return null;
      }
      return {
        type: pickString(currency.type, currency.currency, currency.name, null),
        amount: pickNumeric(currency.amount, currency.qty, currency.count, currency.value, null),
      };
    })
    .filter(Boolean));

  const collectWeapons = (source) => {
    if (Array.isArray(source)) {
      return source;
    }
    if (source && typeof source === "object") {
      return Object.entries(source).map(([type, amount]) => ({ type, amount }));
    }
    return [];
  };
  const rawWeapons = [
    ...collectWeapons(comboReward && comboReward.weapons),
    ...collectWeapons(comboReward && comboReward.weaponRewards),
  ]
    .map((weapon) => toItem(weapon, "weapon"))
    .filter(Boolean);
  appendUnique(weapons, rawWeapons);
  for (const weaponType of knownWeaponTypes) {
    const amount = pickNumeric(comboReward && comboReward[weaponType], null);
    if (amount !== null && amount !== 0) {
      appendUnique(weapons, [{ type: weaponType, id: null, name: null, amount }]);
    }
  }

  return {
    outcome: pickString(combo && combo.lastOutcome, payload.comboOutcome, payload.lastOutcome, null),
    items,
    stashGear,
    stashCount: pickNumeric(
      comboReward && comboReward.stash && comboReward.stash.count,
      comboReward && comboReward.stash && comboReward.stash.amount,
      comboReward && comboReward.stashCount,
      typeof (comboReward && comboReward.stash) === "number" ? comboReward.stash : null,
      null,
    ),
    currencies,
    weapons,
    authority: claimed ? claimed.authority : pickNumeric(comboReward && comboReward.authority, null),
    keys: claimed ? claimed.keys : pickNumeric(comboReward && comboReward.keys, null),
  };
}

function summarizeBossComboRun(result, configuredHits = 0) {
  const hits = (Array.isArray(result && result.cycles) ? result.cycles : [])
    .flatMap((cycle) => Array.isArray(cycle && cycle.hits) ? cycle.hits : []);
  const comboHits = hits.filter((hit) => hit && hit.combo && typeof hit.combo === "object");
  const lastCombo = comboHits.length > 0 ? comboHits[comboHits.length - 1].combo : null;
  const completed = comboHits.some((hit) => hit.combo.lastOutcome === "completed")
    || hits.some((hit) => hit && hit.comboReward && typeof hit.comboReward === "object");
  const haltedReason = result && typeof result === "object" ? result.haltedReason ?? null : null;
  let reason = null;
  if (!completed) {
    if (lastCombo && ["lose", "miss_lose"].includes(lastCombo.lastOutcome)) {
      reason = "combo_lost";
    } else if (["session_finished", "session_already_finished"].includes(haltedReason)) {
      reason = "boss_finished_before_combo_completed";
    } else if (hits.length === 0) {
      reason = "no_combo_hits_sent";
    } else {
      reason = haltedReason || "combo_not_completed";
    }
  }

  return {
    completed,
    configuredHits: Math.max(0, Number(configuredHits) || 0),
    sentHits: hits.length,
    progress: lastCombo ? lastCombo.progress ?? null : null,
    required: lastCombo ? lastCombo.required ?? null : null,
    lastOutcome: lastCombo ? lastCombo.lastOutcome ?? null : null,
    haltedReason,
    reason,
  };
}

function normalizeBossComboCurrencyKey(value) {
  const key = normalizeCurrencyCode(value);
  if (["ruble", "rub", "money"].includes(key)) {
    return "rubles";
  }
  return key;
}

function addBossComboResource(target, key, amount) {
  const normalizedKey = String(key || "").trim();
  const numeric = Number(amount);
  if (!normalizedKey || !Number.isFinite(numeric) || numeric === 0) {
    return;
  }
  target[normalizedKey] = (target[normalizedKey] || 0) + numeric;
}

function compactBossComboResources(resources) {
  return Object.fromEntries(
    Object.entries(resources || {})
      .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) !== 0)
      .map(([key, value]) => [key, Number(value)]),
  );
}

function buildBossComboResourceNet(rewards, costs) {
  const net = {};
  const keys = new Set([
    ...Object.keys(rewards || {}),
    ...Object.keys(costs || {}),
  ]);
  for (const key of keys) {
    const value = Number(rewards && rewards[key] || 0) - Number(costs && costs[key] || 0);
    if (Number.isFinite(value) && value !== 0) {
      net[key] = value;
    }
  }
  return net;
}

function getBossComboResultHits(result) {
  return (Array.isArray(result && result.cycles) ? result.cycles : [])
    .flatMap((cycle) => Array.isArray(cycle && cycle.hits) ? cycle.hits : []);
}

function buildBossComboEconomy(result) {
  const hits = getBossComboResultHits(result);
  const weaponCosts = {};
  const currencyCosts = {};
  const weaponRewards = {};
  const currencyRewards = {};
  const purchases = {};
  let purchaseRubles = 0;
  let restoreRubles = 0;
  let estimated = false;
  let hasComboReward = false;

  for (const hit of hits) {
    const weaponType = String(hit && hit.type || "").trim().toLowerCase();
    if (hit && hit.ok !== false && BOSS_CONSUMABLE_ACTION_KEYS.has(weaponType)) {
      const count = Math.max(1, Math.floor(Number(hit.payload && hit.payload.count || 1) || 1));
      addBossComboResource(weaponCosts, weaponType, count);
    }

    const purchase = hit && hit.purchase;
    if (purchase && purchase.attempted && purchase.ok) {
      const purchasedWeapon = String(purchase.weaponType || weaponType).trim().toLowerCase();
      const count = Math.max(0, Math.floor(Number(purchase.count || 0) || 0));
      addBossComboResource(purchases, purchasedWeapon, count);
      const explicitSpent = pickNumeric(purchase.spent, null);
      const fallbackSpent = Number(BOSS_CONSUMABLE_PRICES_RUBLES[purchasedWeapon] || 0) * count;
      const spent = explicitSpent !== null ? explicitSpent : fallbackSpent;
      const currency = normalizeBossComboCurrencyKey(purchase.currency) || "rubles";
      if (spent > 0) {
        addBossComboResource(currencyCosts, currency, spent);
        if (currency === "rubles") {
          purchaseRubles += spent;
        }
      }
      estimated = estimated || purchase.estimated === true || explicitSpent === null;
    }

    const reward = hit && hit.comboReward;
    if (!reward || typeof reward !== "object") {
      continue;
    }
    hasComboReward = true;
    for (const weapon of Array.isArray(reward.weapons) ? reward.weapons : []) {
      const type = String(weapon && (weapon.type || weapon.weaponType) || "").trim().toLowerCase();
      addBossComboResource(weaponRewards, type, weapon && weapon.amount);
    }
    for (const currency of Array.isArray(reward.currencies) ? reward.currencies : []) {
      const type = normalizeBossComboCurrencyKey(
        currency && (currency.type || currency.currency || currency.name),
      );
      addBossComboResource(currencyRewards, type, currency && currency.amount);
    }
    addBossComboResource(currencyRewards, "authority", reward.authority);
    addBossComboResource(currencyRewards, "keys", reward.keys);
  }

  const restore = result && result.restore && typeof result.restore === "object"
    ? result.restore
    : {};
  const restoreCurrencies = restore.spentByCurrency && typeof restore.spentByCurrency === "object"
    ? restore.spentByCurrency
    : {};
  const restoreEntries = Object.entries(restoreCurrencies)
    .filter(([, amount]) => Number.isFinite(Number(amount)) && Number(amount) > 0);
  for (const [currency, amount] of restoreEntries) {
    const normalizedCurrency = normalizeBossComboCurrencyKey(currency) || "rubles";
    addBossComboResource(currencyCosts, normalizedCurrency, Number(amount));
    if (normalizedCurrency === "rubles") {
      restoreRubles += Number(amount);
    }
  }
  if (restoreEntries.length === 0 && Number(restore.succeeded || 0) > 0) {
    restoreRubles = Math.max(0, Number(restore.succeeded || 0)) * BOSS_MELEE_RESTORE_PRICE_RUBLES;
    addBossComboResource(currencyCosts, "rubles", restoreRubles);
    estimated = true;
  }

  const costs = {
    weapons: compactBossComboResources(weaponCosts),
    currencies: compactBossComboResources(currencyCosts),
  };
  const rewards = {
    weapons: compactBossComboResources(weaponRewards),
    currencies: compactBossComboResources(currencyRewards),
  };
  const net = {
    weapons: buildBossComboResourceNet(rewards.weapons, costs.weapons),
    currencies: buildBossComboResourceNet(rewards.currencies, costs.currencies),
  };
  const totalRubles = Number(costs.currencies.rubles || 0);

  return {
    measured: hits.length > 0,
    hasComboReward,
    costs,
    rewards,
    net,
    purchases: compactBossComboResources(purchases),
    rubles: {
      total: totalRubles,
      purchases: purchaseRubles,
      cooldowns: restoreRubles,
    },
    estimated,
  };
}

function resolveBossComboElapsedMs(result) {
  const timing = result && result.timing && typeof result.timing === "object"
    ? result.timing
    : {};
  const comboTiming = result && result.comboTiming && typeof result.comboTiming === "object"
    ? result.comboTiming
    : {};
  return normalizeElapsedMs(
    comboTiming.elapsedMs
      ?? timing.comboElapsedMs
      ?? timing.hitSequenceElapsedMs
      ?? (result && result.elapsedMs),
  );
}

function isBossCooldownBlockedResponse(response) {
  if (isSuccessfulGameResponse(response)) {
    return false;
  }

  const payload = getGameResponsePayload(response);
  if (payload.cooldownActive === true || payload.onCooldown === true) {
    return true;
  }

  const text = [
    payload.message,
    payload.error,
    payload.reason,
    payload.code,
    payload.errorCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /cooldown|on_?cooldown|cooldown_active|weapon_?cooldown|weapon_?not_?ready/.test(text)
    || text.includes("\u043f\u0435\u0440\u0435\u0437\u0430\u0440")
    || text.includes("\u043e\u0442\u043a\u0430\u0442")
    || text.includes("\u043a\u0434")
  ) {
    return true;
  }

  return /cooldown|on_?cooldown|cooldown_active|weapon_?cooldown|weapon_?not_?ready|перезар|откат|кд/.test(text);
}

function isBossRateLimitedResponse(response) {
  if (Number(response && response.status) === 429) {
    return true;
  }
  const text = String(getGameResponseMessage(response) || "").toLowerCase();
  return /too many requests|rate.?limit|\b429\b/.test(text);
}

function toRestoreFreeHitWeaponType(value) {
  try {
    const normalizedType = normalizeBossActionType(value);
    return RESTORE_FREE_HIT_WEAPON_TYPE_BY_KEY[normalizedType] || null;
  } catch (error) {
    void error;
    return null;
  }
}

function buildRestoreFreeHitPayloadCandidates(item) {
  const weapon = item && item.type ? String(item.type).trim() : "";
  if (!weapon) {
    return [];
  }

  const weaponType = toRestoreFreeHitWeaponType(weapon);
  const count = pickNumeric(item && item.payload ? item.payload.count : null);
  const variants = [];
  const add = (payload) => {
    if (!payload || typeof payload !== "object") {
      return;
    }
    variants.push(payload);
  };

  if (weaponType) {
    add({ weaponType });
  }

  if (count !== null && count > 0) {
    if (weaponType) {
      add({ weaponType, count });
    }
    add({ weapon, count });
    add({ type: weapon, count });
  }
  if (weaponType) {
    add({ weaponType: weapon });
  }
  add({ weapon });
  add({ type: weapon });

  const deduped = [];
  const seen = new Set();
  for (const payload of variants) {
    const key = JSON.stringify(payload);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(payload);
  }

  return deduped;
}

function summarizeRestoreFreeHitAttempt(response, payload) {
  const data = getGameResponsePayload(response);
  const spent = pickNumeric(
    data.spent,
    data.spentRubles,
    data.rublesSpent,
    data.price,
    data.priceRubles,
    data.cost,
    data.totalPrice,
    data.amountSpent,
    null,
  );
  const currency = normalizeCurrencyCode(
    pickString(data.currency, data.spentCurrency, data.priceCurrency, "rubles"),
  ) || "rubles";

  return {
    ok: isSuccessfulGameResponse(response),
    payload,
    status: response ? response.status : null,
    message: getGameResponseMessage(response),
    spent: spent !== null ? Number(spent) : null,
    currency,
    response,
  };
}

async function tryRestoreBossMeleeCooldown(client, item, requestOptions = {}) {
  const payloadCandidates = buildRestoreFreeHitPayloadCandidates(item);
  const attempts = [];
  const spentByCurrency = {};

  for (const payload of payloadCandidates) {
    const response = await client.bosses.restoreFreeHit(payload, requestOptions);
    const attempt = summarizeRestoreFreeHitAttempt(response, payload);
    attempts.push(attempt);

    if (attempt.spent !== null && Number.isFinite(attempt.spent) && attempt.spent > 0) {
      const currency = attempt.currency || "rubles";
      spentByCurrency[currency] = (spentByCurrency[currency] || 0) + attempt.spent;
    }

    if (attempt.ok) {
      break;
    }
    if (isBossRateLimitedResponse(response)) {
      break;
    }
  }

  const selectedAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const ok = Boolean(selectedAttempt && selectedAttempt.ok);

  return {
    ok,
    attempts,
    selectedAttempt,
    message: selectedAttempt ? selectedAttempt.message : null,
    spentByCurrency,
    spentTotal: Object.values(spentByCurrency).reduce((sum, value) => sum + Number(value || 0), 0),
  };
}

async function loadBossRuntimeSnapshot(client, bossId) {
  const query = bossId === null || bossId === undefined ? null : { bossId };
  const sessionResponse = await client.bosses.checkSession(query);
  const session = summarizeBossCheckSession(sessionResponse);

  if (!session.ok) {
    return {
      sessionResponse,
      friendDamageResponse: null,
      rewardsResponse: null,
      summary: {
        ok: false,
        stateReliable: false,
        stateUnknown: true,
        unknownReason: buildBossRuntimeFailureReason(sessionResponse, "check_session_failed"),
        bossId: bossId ?? null,
        sessionId: null,
        hasSession: null,
        hasReward: false,
        rewardReady: false,
        rewardClaimed: false,
        isCompleted: false,
        currentHp: null,
        baseHp: null,
        maxHp: null,
        mode: null,
        personalDamage: null,
        friendDamageItemsCount: 0,
        rewardStatus: null,
        rewardBossId: null,
        rewardSessionId: null,
        rewardReadyAt: null,
        rewardRetryAfterMs: null,
        endsAt: null,
        title: null,
        meleeCooldowns: {},
      },
    };
  }

  const friendDamageResponse = session.hasSession || bossId !== null && bossId !== undefined
    ? await client.bosses.friendDamage(query)
    : null;
  const rewardsResponse = await client.bosses.rewards();
  const friendDamage = summarizeBossFriendDamage(friendDamageResponse);
  const rewards = summarizeBossRewards(rewardsResponse);
  const friendDamageReliable = Boolean(friendDamageResponse) && friendDamage.ok;
  const rewardsReliable = Boolean(rewardsResponse) && rewards.ok;
  const currentHp = pickNumeric(
    session.currentHp,
    friendDamageReliable ? friendDamage.currentHp : null,
  );
  const isCompleted = session.isCompleted
    || (friendDamageReliable && friendDamage.isOver === true)
    || (currentHp !== null && currentHp === 0);
  const hasActiveSession = Boolean(session.hasSession && !isCompleted);
  const sessionRewardReady = Boolean(
    session.hasReward
    || (session.hasSession && isCompleted && !session.rewardClaimed)
  );
  const rewardReady = sessionRewardReady || (!hasActiveSession && rewardsReliable && rewards.ready);
  const rewardSource = sessionRewardReady
    ? {
        status: "ready",
        bossId: session.bossId ?? bossId ?? null,
        sessionId: session.sessionId,
        readyAt: null,
        retryAfterMs: null,
      }
    : !hasActiveSession && rewardsReliable && rewards.ready
      ? rewards
      : null;

  return {
    sessionResponse,
    friendDamageResponse,
    rewardsResponse,
    summary: {
      ok: true,
      stateReliable: true,
      stateUnknown: false,
      unknownReason: null,
      bossId: session.bossId ?? bossId ?? null,
      sessionId: session.sessionId,
      hasSession: hasActiveSession,
      // `/api/boss/rewards` is global and may contain a claimed/ready reward from another boss.
      // When an active session exists, trust `/api/boss/check-session` for reward state.
      hasReward: rewardReady,
      rewardReady,
      rewardClaimed: session.rewardClaimed,
      isCompleted,
      currentHp,
      baseHp: session.baseHp,
      maxHp: session.maxHp,
      mode: session.mode,
      personalDamage: session.personalDamage,
      friendDamageItemsCount: friendDamageReliable ? friendDamage.itemsCount : 0,
      rewardStatus: rewardSource ? rewardSource.status : null,
      rewardBossId: rewardSource ? rewardSource.bossId : null,
      rewardSessionId: rewardSource ? rewardSource.sessionId : null,
      rewardReadyAt: rewardSource ? rewardSource.readyAt : null,
      rewardRetryAfterMs: rewardSource ? rewardSource.retryAfterMs : null,
      endsAt: session.endsAt,
      title: session.title,
      meleeCooldowns: session.meleeCooldowns,
    },
  };
}

async function loadBossRuntimeSnapshotLite(client, bossId) {
  const query = bossId === null || bossId === undefined ? null : { bossId };
  const sessionResponse = await client.bosses.checkSession(query, { throttle: false });
  const session = summarizeBossCheckSession(sessionResponse);

  if (!session.ok) {
    return {
      sessionResponse,
      friendDamageResponse: null,
      rewardsResponse: null,
      summary: {
        ok: false,
        stateReliable: false,
        stateUnknown: true,
        unknownReason: buildBossRuntimeFailureReason(sessionResponse, "check_session_failed"),
        bossId: bossId ?? null,
        sessionId: null,
        hasSession: null,
        hasReward: false,
        rewardReady: false,
        rewardClaimed: false,
        isCompleted: false,
        currentHp: null,
        baseHp: null,
        maxHp: null,
        mode: null,
        personalDamage: null,
        friendDamageItemsCount: 0,
        rewardStatus: null,
        rewardBossId: null,
        rewardSessionId: null,
        rewardReadyAt: null,
        rewardRetryAfterMs: null,
        endsAt: null,
        title: null,
        meleeCooldowns: {},
      },
    };
  }

  const currentHp = pickNumeric(session.currentHp);
  const isCompleted = session.isCompleted || (currentHp !== null && currentHp <= 0);
  const hasActiveSession = Boolean(session.hasSession && !isCompleted);
  const rewardReady = Boolean(
    session.hasReward
    || (session.hasSession && isCompleted && !session.rewardClaimed)
  );

  return {
    sessionResponse,
    friendDamageResponse: null,
    rewardsResponse: null,
    summary: {
      ok: true,
      stateReliable: true,
      stateUnknown: false,
      unknownReason: null,
      bossId: session.bossId ?? bossId ?? null,
      sessionId: session.sessionId,
      hasSession: hasActiveSession,
      hasReward: rewardReady,
      rewardReady,
      rewardClaimed: session.rewardClaimed,
      isCompleted,
      currentHp,
      baseHp: session.baseHp,
      maxHp: session.maxHp,
      mode: session.mode,
      personalDamage: session.personalDamage,
      friendDamageItemsCount: 0,
      rewardStatus: rewardReady ? "ready" : null,
      rewardBossId: rewardReady ? session.bossId ?? bossId ?? null : null,
      rewardSessionId: rewardReady ? session.sessionId : null,
      rewardReadyAt: null,
      rewardRetryAfterMs: null,
      endsAt: session.endsAt,
      title: session.title,
      meleeCooldowns: session.meleeCooldowns,
    },
  };
}

function markBossRewardSettlementPending(snapshot, bossId, observedSummary = null) {
  const currentSummary = getBossAutomationSummaryFrom(snapshot) || {};
  const observed = observedSummary && typeof observedSummary === "object" ? observedSummary : {};
  return {
    ...(snapshot && typeof snapshot === "object" ? snapshot : {}),
    summary: {
      ...observed,
      ...currentSummary,
      bossId: pickNumeric(currentSummary.bossId, observed.bossId, bossId, null),
      sessionId: currentSummary.sessionId ?? observed.sessionId ?? null,
      hasSession: false,
      isCompleted: true,
      stateReliable: false,
      stateUnknown: true,
      unknownReason: "reward_settlement_pending",
    },
  };
}

async function settleBossRewardClaim(client, bossId, initialSnapshot, options = {}) {
  const claimWhenReady = options.claimWhenReady !== false;
  const forceClaimOnCompletion = options.forceClaimOnCompletion !== false;
  const refreshAfterClaim = options.refreshAfterClaim !== false;
  const observedSummary = options.observedSummary && typeof options.observedSummary === "object"
    ? options.observedSummary
    : getBossAutomationSummaryFrom(initialSnapshot);
  const completionObserved = options.completionObserved === true
    || isBossAutomationSummaryFinished(observedSummary)
    || isBossAutomationSummaryFinished(getBossAutomationSummaryFrom(initialSnapshot));
  const retryDelaysMs = Array.isArray(options.retryDelaysMs) && options.retryDelaysMs.length > 0
    ? options.retryDelaysMs.map((value) => Math.max(0, Number(value) || 0))
    : BOSS_REWARD_SETTLE_RETRY_DELAYS_MS;
  const wait = typeof options.wait === "function" ? options.wait : sleep;
  const loadSnapshot = typeof options.loadSnapshot === "function"
    ? options.loadSnapshot
    : (targetBossId) => loadBossRuntimeSnapshot(client, targetBossId);
  let snapshot = initialSnapshot;
  let claim = null;
  let attempts = 0;

  if (!claimWhenReady) {
    return { snapshot, claim, completionObserved, pending: false, attempts };
  }

  for (let index = 0; index < retryDelaysMs.length; index += 1) {
    if (index > 0) {
      const delayMs = retryDelaysMs[index];
      if (delayMs > 0) {
        await wait(delayMs);
      }
      snapshot = await loadSnapshot(bossId) || snapshot;
    }

    const summary = getBossAutomationSummaryFrom(snapshot) || {};
    if (summary.rewardClaimed === true) {
      return { snapshot, claim, completionObserved, pending: false, attempts };
    }
    if (summary.hasSession === true && !isBossAutomationSummaryFinished(summary)) {
      return { snapshot, claim, completionObserved, pending: false, attempts };
    }

    const rewardReady = summary.rewardReady === true || summary.hasReward === true;
    if (!completionObserved && !rewardReady) {
      return { snapshot, claim, completionObserved, pending: false, attempts };
    }
    const forceClaim = forceClaimOnCompletion
      && completionObserved
      && (index === 0 || index === retryDelaysMs.length - 1);
    if (!rewardReady && !forceClaim) {
      continue;
    }

    const response = await client.bosses.claim();
    attempts += 1;
    if (refreshAfterClaim) {
      const refreshedSnapshot = await loadSnapshot(bossId);
      if (refreshedSnapshot) {
        snapshot = refreshedSnapshot;
      }
    }
    claim = {
      ok: isSuccessfulGameResponse(response),
      response,
      rewards: summarizeBossClaimRewards(response),
      snapshot: getBossAutomationSummaryFrom(snapshot),
    };
    if (claim.ok) {
      return { snapshot, claim, completionObserved, pending: false, attempts };
    }
    if (response && [401, 403].includes(Number(response.status))) {
      break;
    }
  }

  const finalSummary = getBossAutomationSummaryFrom(snapshot) || {};
  const pending = completionObserved
    && finalSummary.rewardClaimed !== true
    && !(finalSummary.hasSession === true && !isBossAutomationSummaryFinished(finalSummary));
  if (pending) {
    snapshot = markBossRewardSettlementPending(snapshot, bossId, observedSummary);
  }
  return { snapshot, claim, completionObserved, pending, attempts };
}

function buildBossRewardSettlementTaskView(task) {
  if (!task) {
    return null;
  }
  return {
    key: task.key,
    bossId: task.bossId,
    sessionId: task.sessionId,
    startedAt: task.startedAt,
    attempts: task.attempts,
    item: summarizeBossAutomationItem(task.item),
  };
}

function clearBossRewardSettlementTask(task) {
  if (!task || bossRewardSettlementTasks.get(task.key) !== task) {
    return false;
  }
  bossRewardSettlementTasks.delete(task.key);
  if (bossAutomationRuntime.pendingReward && bossAutomationRuntime.pendingReward.key === task.key) {
    bossAutomationRuntime.pendingReward = null;
  }
  return true;
}

function doesBossRewardSettlementTaskMatch(task, bossId, sessionId = null) {
  if (!task) {
    return false;
  }
  const normalizedSessionId = String(sessionId || "").trim();
  if (normalizedSessionId) {
    return task.sessionId === normalizedSessionId;
  }
  const numericBossId = Number(bossId);
  return Number.isFinite(numericBossId) && numericBossId > 0 && task.bossId === numericBossId;
}

function clearMatchingBossRewardSettlementTask(bossId, sessionId = null) {
  for (const task of bossRewardSettlementTasks.values()) {
    if (doesBossRewardSettlementTaskMatch(task, bossId, sessionId)) {
      clearBossRewardSettlementTask(task);
    }
  }
}

async function runBossRewardSettlementTask(task) {
  await appendBossAutomationEvent("reward_settlement_scheduled", {
    bossId: task.bossId,
    sessionId: task.sessionId,
    item: summarizeBossAutomationItem(task.item),
  });

  let lastResponse = null;
  for (let index = 0; index < BOSS_REWARD_BACKGROUND_RETRY_DELAYS_MS.length; index += 1) {
    await sleep(BOSS_REWARD_BACKGROUND_RETRY_DELAYS_MS[index]);
    if (bossRewardSettlementTasks.get(task.key) !== task) {
      return;
    }

    let snapshot;
    try {
      snapshot = await loadBossRuntimeSnapshot(task.client, task.bossId);
    } catch (error) {
      task.lastError = getErrorMessage(error);
      bossAutomationRuntime.pendingReward = buildBossRewardSettlementTaskView(task);
      continue;
    }
    const summary = getBossAutomationSummaryFrom(snapshot) || {};
    if (summary.rewardClaimed === true) {
      await recordBossAutomationClaimActivity({
        ok: true,
        status: 200,
        data: {
          success: true,
          bossId: task.bossId,
          sessionId: task.sessionId,
        },
      }, {
        claimOk: true,
        bossId: task.bossId,
        item: task.item,
        sessionId: task.sessionId,
      });
      clearBossRewardSettlementTask(task);
      clearBossAutomationSnooze();
      await appendBossAutomationEvent("reward_settlement_resolved", {
        bossId: task.bossId,
        sessionId: task.sessionId,
        reason: "already_claimed",
      });
      scheduleBossAutomationImmediateTick("reward_settlement_resolved");
      return;
    }

    const rewardReady = summary.hasReward === true || summary.rewardReady === true;
    const finalAttempt = index === BOSS_REWARD_BACKGROUND_RETRY_DELAYS_MS.length - 1;
    if (!rewardReady && !finalAttempt) {
      continue;
    }

    lastResponse = await task.client.bosses.claim();
    task.attempts += 1;
    bossAutomationRuntime.pendingReward = buildBossRewardSettlementTaskView(task);
    if (isSuccessfulGameResponse(lastResponse)) {
      await recordBossAutomationClaimActivity(lastResponse, {
        claimOk: true,
        bossId: task.bossId,
        item: task.item,
        sessionId: task.sessionId,
      });
      clearBossRewardSettlementTask(task);
      clearBossAutomationSnooze();
      scheduleBossAutomationImmediateTick("reward_settlement_claimed");
      return;
    }
    if (lastResponse && [401, 403].includes(Number(lastResponse.status))) {
      break;
    }
  }

  if (lastResponse) {
    await recordBossAutomationClaimActivity(lastResponse, {
      claimOk: false,
      bossId: task.bossId,
      item: task.item,
      sessionId: task.sessionId,
      reason: getGameResponseMessage(lastResponse) || "reward settlement timeout",
    });
  } else {
    await appendBossAutomationEvent("reward_settlement_error", {
      bossId: task.bossId,
      sessionId: task.sessionId,
      item: summarizeBossAutomationItem(task.item),
      reason: task.lastError || "reward settlement timeout",
    });
  }
  clearBossRewardSettlementTask(task);
  scheduleBossAutomationImmediateTick("reward_settlement_finished");
}

function scheduleBossRewardSettlement(client, bossId, initialSnapshot, options = {}) {
  const summary = getBossAutomationSummaryFrom(initialSnapshot) || {};
  const observedSummary = options.observedSummary && typeof options.observedSummary === "object"
    ? options.observedSummary
    : summary;
  const numericBossId = pickNumeric(summary.bossId, observedSummary.bossId, bossId, null);
  if (!client || numericBossId === null) {
    return null;
  }
  const sessionId = String(summary.sessionId || observedSummary.sessionId || "").trim() || null;
  const key = sessionId
    ? `session:${sessionId}`
    : `boss:${numericBossId}:${String(observedSummary.endsAt || "current")}`;
  const existing = bossRewardSettlementTasks.get(key);
  if (existing) {
    if (options.item) {
      existing.item = normalizeBossAutomationQueueEntry(options.item);
      bossAutomationRuntime.pendingReward = buildBossRewardSettlementTaskView(existing);
    }
    return buildBossRewardSettlementTaskView(existing);
  }

  const task = {
    key,
    bossId: numericBossId,
    sessionId,
    startedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    client,
    item: options.item
      ? normalizeBossAutomationQueueEntry(options.item)
      : findBossAutomationTrackedItem(numericBossId),
  };
  bossRewardSettlementTasks.set(key, task);
  bossAutomationRuntime.pendingReward = buildBossRewardSettlementTaskView(task);
  void runBossRewardSettlementTask(task).catch((error) => {
    task.lastError = getErrorMessage(error);
    clearBossRewardSettlementTask(task);
    void appendBossAutomationEvent("reward_settlement_error", {
      bossId: task.bossId,
      sessionId: task.sessionId,
      item: summarizeBossAutomationItem(task.item),
      reason: task.lastError,
    }).catch(() => undefined);
    scheduleBossAutomationImmediateTick("reward_settlement_error");
  });
  return buildBossRewardSettlementTaskView(task);
}

function buildBossHitOutcome(item, response, previousSnapshot, nextSnapshot) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const previous = previousSnapshot && previousSnapshot.summary ? previousSnapshot.summary : {};
  const next = nextSnapshot && nextSnapshot.summary ? nextSnapshot.summary : {};
  const previousHp = pickNumeric(previous.currentHp);
  const nextHp = pickNumeric(
    payload.currentHp,
    payload.bossHp,
    payload.hp,
    next.currentHp,
  );
  const previousPersonalDamage = pickNumeric(previous.personalDamage);
  const nextPersonalDamage = pickNumeric(
    payload.personalDamage,
    payload.personalRawDamage,
    next.personalDamage,
  );
  const hpDelta = previousHp !== null && nextHp !== null ? previousHp - nextHp : null;
  const personalDamageDelta = previousPersonalDamage !== null && nextPersonalDamage !== null
    ? nextPersonalDamage - previousPersonalDamage
    : null;
  const directDamage = pickNumeric(payload.damage, payload.rawDamage, payload.hitDamage, payload.deltaDamage);
  const progressed = (hpDelta !== null && hpDelta > 0)
    || (personalDamageDelta !== null && personalDamageDelta > 0)
    || (directDamage !== null && directDamage > 0);

  return {
    type: item.type,
    payload: item.payload,
    ok: isSuccessfulGameResponse(response),
    status: response ? response.status : null,
    message: payload && typeof payload.message === "string" ? payload.message : null,
    currentHp: nextHp,
    previousHp,
    hpDelta,
    personalDamage: nextPersonalDamage,
    previousPersonalDamage,
    personalDamageDelta,
    directDamage,
    progressed,
    combo: summarizeBossHitCombo(payload),
    comboReward: summarizeBossComboReward(response),
    snapshot: nextSnapshot && nextSnapshot.summary ? nextSnapshot.summary : null,
  };
}

function isBossMeleeCooldownActiveAt(cooldown, nowMs = Date.now()) {
  if (!cooldown || typeof cooldown !== "object" || cooldown.active === false) {
    return false;
  }
  const readyAtMs = parseBossTimestampMs(cooldown.readyAt);
  if (readyAtMs !== null) {
    return readyAtMs > Number(nowMs || Date.now());
  }
  const remainingMs = pickNumeric(cooldown.remainingMs, null);
  if (remainingMs !== null) {
    return remainingMs > 0;
  }
  return cooldown.active === true;
}

function applyBossMeleeCooldownAfterHit(snapshot, item, hit, previousSnapshot = null, nowMs = Date.now()) {
  const key = String(item && item.type || hit && hit.type || "").trim();
  if (
    !snapshot
    || !snapshot.summary
    || !isMeleeBossActionType(key)
    || !hit
    || (hit.ok !== true && hit.progressed !== true)
  ) {
    return snapshot;
  }

  const summary = snapshot.summary;
  const currentHp = pickNumeric(hit.currentHp, summary.currentHp, null);
  if (summary.hasSession === false || summary.isCompleted === true || (currentHp !== null && currentHp <= 0)) {
    return snapshot;
  }

  const previousSummary = previousSnapshot && previousSnapshot.summary ? previousSnapshot.summary : {};
  const currentCooldowns = summary.meleeCooldowns && typeof summary.meleeCooldowns === "object"
    ? summary.meleeCooldowns
    : {};
  const previousCooldowns = previousSummary.meleeCooldowns && typeof previousSummary.meleeCooldowns === "object"
    ? previousSummary.meleeCooldowns
    : {};
  const currentCooldown = currentCooldowns[key] && typeof currentCooldowns[key] === "object"
    ? currentCooldowns[key]
    : {};
  const previousCooldown = previousCooldowns[key] && typeof previousCooldowns[key] === "object"
    ? previousCooldowns[key]
    : {};

  if (isBossMeleeCooldownActiveAt(currentCooldown, nowMs)) {
    return snapshot;
  }

  const cooldownSec = pickNumeric(
    currentCooldown.cooldownSec,
    previousCooldown.cooldownSec,
    Math.round(DEFAULT_BOSS_MELEE_COOLDOWN_MS / 1000),
  );
  if (cooldownSec === null || cooldownSec <= 0) {
    return snapshot;
  }

  const startedAtMs = Number(nowMs || Date.now());
  const readyAtMs = startedAtMs + cooldownSec * 1000;
  const nextCooldown = {
    ...previousCooldown,
    ...currentCooldown,
    active: true,
    cooldownSec,
    lastUsedAt: new Date(startedAtMs).toISOString(),
    readyAt: new Date(readyAtMs).toISOString(),
    remainingMs: cooldownSec * 1000,
    optimisticUntil: new Date(startedAtMs + BOSS_HIT_SNAPSHOT_GRACE_MS).toISOString(),
    restorePriceRubles: pickNumeric(
      currentCooldown.restorePriceRubles,
      previousCooldown.restorePriceRubles,
      BOSS_MELEE_RESTORE_PRICE_RUBLES,
    ),
  };

  return {
    ...snapshot,
    summary: {
      ...summary,
      meleeCooldowns: {
        ...currentCooldowns,
        [key]: nextCooldown,
      },
    },
  };
}

function hasExplicitBossHitTypes(value) {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  return true;
}

async function prepareFastActiveBossHitPlan(client, options = {}) {
  if (toBool(options.forceNew, false) || !hasExplicitBossHitTypes(options.types)) {
    return null;
  }

  const requestedBossId = pickNumeric(options.bossId);
  const sessionResponse = await client.bosses.checkSession(
    requestedBossId === null ? null : { bossId: requestedBossId },
    { throttle: false },
  );
  const session = summarizeBossCheckSession(sessionResponse);
  if (!session.ok || !session.hasSession || session.isCompleted) {
    return null;
  }

  const bossId = pickNumeric(session.bossId);
  if (bossId === null) {
    return null;
  }

  const currentHp = pickNumeric(session.currentHp);
  if (currentHp !== null && currentHp <= 0) {
    return null;
  }

  const requestedMismatch = requestedBossId !== null && requestedBossId !== bossId;
  const mode = pickString(session.mode, options.mode, null);
  const now = new Date().toISOString();
  const activeSession = {
    sessionId: session.sessionId,
    bossId,
    mode,
    startedAt: session.startedAt ?? null,
    endsAt: session.endsAt ?? null,
    isCompleted: session.isCompleted ?? false,
    baseHp: session.baseHp ?? null,
    maxHp: session.maxHp ?? session.baseHp ?? null,
    currentHp,
    phase: session.phase ?? null,
    title: session.title ?? null,
    personalDamage: session.personalDamage ?? null,
    personalRawDamage: session.personalRawDamage ?? null,
    maxSingleHitRaw: session.maxSingleHitRaw ?? null,
    iglaDamage: session.iglaDamage ?? null,
    rewardClaimed: session.rewardClaimed ?? null,
  };
  const selectedBoss = {
    id: bossId,
    title: session.title || `#${bossId}`,
    baseHp: session.baseHp ?? null,
    selectedMode: mode,
    selectedComboMode: null,
    currentSession: activeSession,
  };
  const sequence = parseBossHitSequence(options.types);

  return {
    generatedAt: now,
    action: "runner-hit",
    fastActiveSessionPlan: true,
    startPlan: {
      generatedAt: now,
      action: "reuse-active",
      reason: requestedMismatch ? "active_session_overrides_requested_boss" : "active_session_exists",
      requestedBossId: requestedMismatch ? requestedBossId : null,
      activeSession: {
        generatedAt: now,
        state: "active",
        sessionActive: true,
        claimReady: false,
        session: activeSession,
        activeBoss: selectedBoss,
        friendDamage: null,
        talentState: null,
        weaponStatsEffective: null,
      },
      selectedBoss,
      payload: null,
    },
    selectedBoss,
    selectedMode: mode,
    targetHp: currentHp ?? session.maxHp ?? session.baseHp ?? null,
    soloHitPlan: null,
    sequence,
    requests: sequence.map((type) => ({
      type,
      payload: buildBossUseWeaponPayload(type, null),
    })),
  };
}

function buildBossFastInitialSnapshot(plan) {
  const activeSession = plan && plan.startPlan && plan.startPlan.activeSession
    && plan.startPlan.activeSession.session
    ? plan.startPlan.activeSession.session
    : null;
  const selectedBoss = plan && plan.selectedBoss ? plan.selectedBoss : null;
  const mode = pickString(
    plan && plan.selectedMode,
    activeSession ? activeSession.mode : null,
    selectedBoss ? selectedBoss.selectedMode : null,
    null,
  );
  const bossId = pickNumeric(
    activeSession ? activeSession.bossId : null,
    selectedBoss ? selectedBoss.id : null,
    null,
  );
  const maxHp = pickNumeric(
    activeSession ? activeSession.maxHp : null,
    plan ? plan.targetHp : null,
    selectedBoss ? selectedBoss.baseHp : null,
    null,
  );
  const currentHp = pickNumeric(
    activeSession ? activeSession.currentHp : null,
    maxHp,
    null,
  );

  return {
    summary: {
      ok: true,
      stateReliable: true,
      stateUnknown: false,
      unknownReason: null,
      bossId,
      sessionId: activeSession ? activeSession.sessionId ?? null : null,
      hasSession: bossId !== null,
      hasReward: false,
      rewardReady: false,
      rewardClaimed: false,
      isCompleted: false,
      currentHp,
      baseHp: pickNumeric(
        activeSession ? activeSession.baseHp : null,
        selectedBoss ? selectedBoss.baseHp : null,
        null,
      ),
      maxHp,
      mode,
      personalDamage: pickNumeric(activeSession ? activeSession.personalDamage : null, 0, null),
      friendDamageItemsCount: 0,
      rewardStatus: null,
      rewardBossId: null,
      rewardSessionId: null,
      rewardReadyAt: null,
      rewardRetryAfterMs: null,
      endsAt: activeSession ? activeSession.endsAt ?? null : null,
      title: pickString(
        activeSession ? activeSession.title : null,
        selectedBoss ? selectedBoss.title : null,
        null,
      ),
    },
  };
}

function buildBossSnapshotFromHitResponse(previousSnapshot, response) {
  const previousSummary = previousSnapshot && previousSnapshot.summary
    ? previousSnapshot.summary
    : {};
  const payload = getGameResponsePayload(response);
  const currentHp = pickNumeric(
    payload.currentHp,
    payload.bossHp,
    payload.hp,
    null,
  );
  const directDamage = pickNumeric(payload.damage, payload.rawDamage, payload.hitDamage, payload.deltaDamage);
  const previousHp = pickNumeric(previousSummary.currentHp);
  const inferredHp = currentHp !== null
    ? currentHp
    : previousHp !== null && directDamage !== null
      ? Math.max(0, previousHp - directDamage)
      : previousHp;
  const personalDamage = pickNumeric(
    payload.personalDamage,
    payload.personalRawDamage,
    previousSummary.personalDamage,
    null,
  );
  const completed = inferredHp !== null && inferredHp <= 0;

  return {
    summary: {
      ...previousSummary,
      currentHp: inferredHp,
      personalDamage,
      hasSession: completed ? false : previousSummary.hasSession,
      rewardReady: completed ? true : previousSummary.rewardReady,
      isCompleted: completed ? true : previousSummary.isCompleted,
    },
  };
}

async function executeBossRunnerLoop(client, plan, options = {}) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const delayMs = options.delayMs ?? 0;
  const continueOnError = Boolean(options.continueOnError);
  const stopOnNoProgress = options.stopOnNoProgress !== false;
  const maxCycles = Math.max(1, Number(options.maxCycles) || 1);
  const claimWhenReady = Boolean(options.claimWhenReady);
  const autoRestoreMeleeCooldown = toBool(options.autoRestoreMeleeCooldown, true);
  const autoBuyMissingWeapons = toBool(options.autoBuyMissingWeapons, false);
  const fastMode = toBool(options.fastMode, false);
  const snapshotAfterEachHit = options.snapshotAfterEachHit === undefined
    ? !fastMode
    : toBool(options.snapshotAfterEachHit, true);
  const throttleWeaponRequests = options.throttleWeaponRequests === undefined
    ? !fastMode
    : toBool(options.throttleWeaponRequests, true);
  const rewardActivityItem = options.rewardActivityItem && typeof options.rewardActivityItem === "object"
    ? normalizeBossAutomationQueueEntry(options.rewardActivityItem)
    : null;
  const requestOptions = throttleWeaponRequests ? {} : { throttle: false, rateLimitRetries: 1 };
  const safeMeleeRequestOptions = { rateLimitRetries: 1 };
  const fastMeleeRequestOptions = { throttle: false, rateLimitRetries: 0 };
  const meleeAccelerationRequested = fastMode && !throttleWeaponRequests;
  const selectedBossId = plan.selectedBoss ? plan.selectedBoss.id : null;
  const result = {
    options: {
      delayMs,
      continueOnError,
      stopOnNoProgress,
      maxCycles,
      claimWhenReady,
      autoRestoreMeleeCooldown,
      autoBuyMissingWeapons,
      fastMode,
      snapshotAfterEachHit,
      throttleWeaponRequests,
    },
    plan,
    startResponse: null,
    initialSnapshot: null,
    cycles: [],
    restore: {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      spentByCurrency: {},
    },
    weaponPurchases: {
      attempted: 0,
      succeeded: 0,
      failed: 0,
    },
    meleeAcceleration: {
      requested: meleeAccelerationRequested,
      active: meleeAccelerationRequested,
      fastRequests: 0,
      fallbacks: 0,
      fallbackReason: null,
    },
    haltedReason: null,
    claim: null,
    rewardSettlement: null,
    finalSnapshot: null,
    elapsedMs: null,
    timing: {
      startedAt,
      finishedAt: null,
      elapsedMs: null,
      startAttackElapsedMs: null,
      hitsStartedAt: null,
      hitsFinishedAt: null,
      hitSequenceElapsedMs: null,
      comboFinishedAt: null,
      comboElapsedMs: null,
    },
  };
  let hitsStartedAtMs = null;
  let lastHitResponseAtMs = null;
  let comboFinishedAtMs = null;
  const finishResult = () => {
    const elapsedMs = normalizeElapsedMs(Date.now() - startedAtMs) ?? 0;
    result.elapsedMs = elapsedMs;
    result.timing.finishedAt = new Date().toISOString();
    result.timing.elapsedMs = elapsedMs;
    result.timing.hitsStartedAt = hitsStartedAtMs === null
      ? null
      : new Date(hitsStartedAtMs).toISOString();
    result.timing.hitsFinishedAt = lastHitResponseAtMs === null
      ? null
      : new Date(lastHitResponseAtMs).toISOString();
    result.timing.hitSequenceElapsedMs = hitsStartedAtMs === null || lastHitResponseAtMs === null
      ? null
      : normalizeElapsedMs(lastHitResponseAtMs - hitsStartedAtMs);
    result.timing.comboFinishedAt = comboFinishedAtMs === null
      ? null
      : new Date(comboFinishedAtMs).toISOString();
    result.timing.comboElapsedMs = hitsStartedAtMs === null || comboFinishedAtMs === null
      ? null
      : normalizeElapsedMs(comboFinishedAtMs - hitsStartedAtMs);
    return result;
  };
  const disableMeleeAcceleration = async (item, phase, response) => {
    if (!result.meleeAcceleration.active) {
      return;
    }
    const reason = `rate_limited_${phase}`;
    result.meleeAcceleration.active = false;
    result.meleeAcceleration.fallbacks += 1;
    result.meleeAcceleration.fallbackReason = reason;
    await logEvent("boss.melee_acceleration_fallback", {
      bossId: selectedBossId,
      weapon: item && item.type ? item.type : null,
      phase,
      status: response && response.status ? response.status : null,
      reason,
    });
  };
  const useMeleeWeapon = async (item) => {
    const accelerated = result.meleeAcceleration.active;
    if (accelerated) {
      result.meleeAcceleration.fastRequests += 1;
    }
    let response = await client.bosses.useWeapon(
      item.payload,
      accelerated ? fastMeleeRequestOptions : safeMeleeRequestOptions,
    );
    if (accelerated && isBossRateLimitedResponse(response)) {
      await disableMeleeAcceleration(item, "use_weapon", response);
      response = await client.bosses.useWeapon(item.payload, safeMeleeRequestOptions);
    }
    return response;
  };
  const restoreMeleeCooldown = async (item) => {
    const accelerated = result.meleeAcceleration.active;
    if (accelerated) {
      result.meleeAcceleration.fastRequests += 1;
    }
    let restore = await tryRestoreBossMeleeCooldown(
      client,
      item,
      accelerated ? fastMeleeRequestOptions : safeMeleeRequestOptions,
    );
    const wasRateLimited = restore.attempts.some((attempt) => isBossRateLimitedResponse(attempt.response));
    if (accelerated && !restore.ok && wasRateLimited) {
      await disableMeleeAcceleration(item, "restore_free_hit", restore.selectedAttempt && restore.selectedAttempt.response);
      restore = await tryRestoreBossMeleeCooldown(client, item, safeMeleeRequestOptions);
    }
    return restore;
  };

  if (plan.startPlan.action === "start-attack") {
    const startAttackStartedAtMs = Date.now();
    result.startResponse = await client.bosses.startAttack(plan.startPlan.payload, requestOptions);
    result.timing.startAttackElapsedMs = normalizeElapsedMs(Date.now() - startAttackStartedAtMs);
    if (!isSuccessfulGameResponse(result.startResponse)) {
      result.haltedReason = "start_attack_failed";
      result.finalSnapshot = await loadBossRuntimeSnapshot(client, selectedBossId);
      return finishResult();
    }
  }

  result.initialSnapshot = fastMode
    ? buildBossFastInitialSnapshot(plan)
    : await loadBossRuntimeSnapshot(client, selectedBossId);
  let currentSnapshot = result.initialSnapshot;

  if (currentSnapshot.summary.rewardReady) {
    result.haltedReason = "reward_ready_before_hits";
  }

  for (let cycleIndex = 0; cycleIndex < maxCycles && !result.haltedReason; cycleIndex += 1) {
    const cycle = {
      cycleIndex,
      hits: [],
      preSnapshot: currentSnapshot.summary,
      postSnapshot: null,
    };
    let cycleProgressed = false;

    if (currentSnapshot.summary.stateUnknown) {
      result.haltedReason = "state_unknown";
      cycle.postSnapshot = currentSnapshot.summary;
      result.cycles.push(cycle);
      break;
    }

    if (!currentSnapshot.summary.hasSession) {
      result.haltedReason = "no_active_session";
      cycle.postSnapshot = currentSnapshot.summary;
      result.cycles.push(cycle);
      break;
    }

    if (currentSnapshot.summary.rewardReady || currentSnapshot.summary.isCompleted) {
      result.haltedReason = "session_already_finished";
      cycle.postSnapshot = currentSnapshot.summary;
      result.cycles.push(cycle);
      break;
    }

    for (let hitIndex = 0; hitIndex < plan.requests.length; hitIndex += 1) {
      const item = plan.requests[hitIndex];
      const meleeAction = isMeleeBossActionType(item.type);
      const hitRequestOptions = meleeAction ? safeMeleeRequestOptions : requestOptions;
      if (hitsStartedAtMs === null) {
        hitsStartedAtMs = Date.now();
      }
      let response = meleeAction
        ? await useMeleeWeapon(item)
        : await client.bosses.useWeapon(item.payload, hitRequestOptions);
      let restore = null;
      let purchase = null;

      if (
        autoRestoreMeleeCooldown
        && meleeAction
        && isBossCooldownBlockedResponse(response)
      ) {
        restore = await restoreMeleeCooldown(item);
        result.restore.attempted += 1;

        if (restore.ok) {
          result.restore.succeeded += 1;
          for (const [currency, amount] of Object.entries(restore.spentByCurrency || {})) {
            result.restore.spentByCurrency[currency] = (result.restore.spentByCurrency[currency] || 0) + Number(amount || 0);
          }
          response = await useMeleeWeapon(item);
        } else {
          result.restore.failed += 1;
        }
      }

      if (
        autoBuyMissingWeapons
        && isBossConsumableShortageResponse(response, item.type)
      ) {
        purchase = await tryBuyBossConsumable(client, item, { rateLimitRetries: 1 });
        result.weaponPurchases.attempted += 1;
        if (purchase.ok) {
          result.weaponPurchases.succeeded += 1;
          response = meleeAction
            ? await useMeleeWeapon(item)
            : await client.bosses.useWeapon(item.payload, hitRequestOptions);
        } else {
          result.weaponPurchases.failed += 1;
        }
      }

      lastHitResponseAtMs = Date.now();
      let nextSnapshot = snapshotAfterEachHit
        ? await loadBossRuntimeSnapshot(client, selectedBossId)
        : buildBossSnapshotFromHitResponse(currentSnapshot, response);
      const hit = buildBossHitOutcome(item, response, currentSnapshot, nextSnapshot);
      nextSnapshot = applyBossMeleeCooldownAfterHit(nextSnapshot, item, hit, currentSnapshot, lastHitResponseAtMs);
      hit.snapshot = nextSnapshot && nextSnapshot.summary ? nextSnapshot.summary : null;
      if (
        comboFinishedAtMs === null
        && (
          hit.comboReward
          || hit.combo && String(hit.combo.lastOutcome || "").toLowerCase() === "completed"
        )
      ) {
        comboFinishedAtMs = lastHitResponseAtMs;
      }
      hit.hitIndex = hitIndex;
      if (restore) {
        hit.restore = {
          attempted: true,
          ok: restore.ok,
          message: restore.message,
          spentByCurrency: restore.spentByCurrency,
          spentTotal: restore.spentTotal,
          attempts: restore.attempts.map((attempt) => ({
            ok: attempt.ok,
            status: attempt.status,
            payload: attempt.payload,
            message: attempt.message,
            spent: attempt.spent,
            currency: attempt.currency,
        })),
      };
      }
      if (purchase) {
        hit.purchase = purchase;
      }
      cycle.hits.push(hit);
      currentSnapshot = nextSnapshot;

      if (hit.progressed) {
        cycleProgressed = true;
      }

      if (!hit.ok && !continueOnError) {
        result.haltedReason = "hit_failed";
        break;
      }

      if (currentSnapshot.summary.rewardReady || currentSnapshot.summary.isCompleted) {
        result.haltedReason = "session_finished";
        break;
      }

      if (delayMs > 0 && hitIndex !== plan.requests.length - 1) {
        await sleep(delayMs);
      }
    }

    cycle.postSnapshot = currentSnapshot.summary;
    result.cycles.push(cycle);

    if (!result.haltedReason && stopOnNoProgress && !cycleProgressed) {
      result.haltedReason = "no_progress";
      break;
    }
  }

  const observedFinalSummary = getBossAutomationSummaryFrom(currentSnapshot);
  const completionObserved = isBossAutomationSummaryFinished(observedFinalSummary);
  const refreshedFinalSnapshot = snapshotAfterEachHit
    ? currentSnapshot
    : fastMode
      ? await loadBossRuntimeSnapshotLite(client, selectedBossId)
      : await loadBossRuntimeSnapshot(client, selectedBossId);
  const rewardSettlement = await settleBossRewardClaim(
    client,
    selectedBossId,
    refreshedFinalSnapshot,
    {
      claimWhenReady,
      completionObserved,
      observedSummary: observedFinalSummary,
      forceClaimOnCompletion: false,
      refreshAfterClaim: false,
    },
  );
  const backgroundSettlement = rewardSettlement.pending
    ? scheduleBossRewardSettlement(client, selectedBossId, rewardSettlement.snapshot, {
        observedSummary: observedFinalSummary,
        item: rewardActivityItem,
      })
    : null;
  result.finalSnapshot = rewardSettlement.snapshot;
  result.claim = rewardSettlement.claim;
  result.rewardSettlement = {
    completionObserved: rewardSettlement.completionObserved,
    pending: rewardSettlement.pending,
    attempts: rewardSettlement.attempts,
    background: backgroundSettlement,
  };
  currentSnapshot = result.finalSnapshot;

  if (!result.haltedReason) {
    result.haltedReason = "max_cycles_reached";
  }

  result.restore.spentTotal = Object.values(result.restore.spentByCurrency || {})
    .reduce((sum, value) => sum + Number(value || 0), 0);

  return finishResult();
}

async function withContext(sessionPath, callback) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const session = await loadSessionSnapshot(resolvedSessionPath);
  const client = await createApiClient({ sessionPath: resolvedSessionPath, session });
  const selfUserId = String(
    session.telegram && session.telegram.initDataUnsafe && session.telegram.initDataUnsafe.user
      ? session.telegram.initDataUnsafe.user.id
      : "",
  );

  return callback({
    client,
    session,
    sessionPath: resolvedSessionPath,
    selfUserId: selfUserId || null,
  });
}

function isNoVorkutaBoxesResponse(response, payload = getGamePayload(response) || {}) {
  if (isSuccessfulGameResponse(response)) return false;
  const message = String(getGameResponseMessage(response) || payload.reason || payload.code || "").toLowerCase();
  const explicitlyEmpty = Number(payload.vboxLeft) === 0
    || Number(payload.newBalances && payload.newBalances.vbox) === 0;
  return /(?:not[_\s-]*enough|insufficient|no[_\s-]*vbox|vbox[_\s-]*empty|нет|законч).*?(?:vbox|ящик|воркут)|(?:vbox|ящик|воркут).*?(?:not[_\s-]*enough|insufficient|empty|нет|законч)/i.test(message)
    || (payload.success === false && explicitlyEmpty);
}

async function openVorkutaBox(sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const response = await client.vbox.open();
    const payload = getGamePayload(response) || {};
    if (!isSuccessfulGameResponse(response)) {
      if (isNoVorkutaBoxesResponse(response, payload)) {
        return {
          ...sanitizeBossAutomationValue(payload),
          success: false,
          opened: false,
          reason: "no_vbox",
          vboxLeft: 0,
        };
      }
      const reason = getGameResponseMessage(response)
        || `Игровой сервер отклонил открытие ящика Воркуты (HTTP ${response.status || "?"}).`;
      throw new Error(reason);
    }
    return {
      ...sanitizeBossAutomationValue(payload),
      opened: true,
    };
  });
}

function pickTargets(collected, options, selfUserId) {
  const excludeSelf = toBool(options.excludeSelf, true);
  const max = asPositiveInt(options.max, null);
  const excludedIds = new Set(
    (Array.isArray(options.excludeIds) ? options.excludeIds : [])
      .map((value) => String(value)),
  );
  const targets = [];

  for (const item of collected.uniqueIds.values) {
    if (excludeSelf && selfUserId && String(item.userId) === String(selfUserId)) {
      continue;
    }
    if (excludedIds.has(String(item.userId))) {
      continue;
    }

    targets.push(item);
    if (max !== null && targets.length >= max) {
      break;
    }
  }

  return targets;
}

function ensureAuthoritySourceForInteraction(type, sources) {
  if (!LOWEST_AUTHORITY_INTERACTION_TYPES.has(type)) {
    return sources;
  }

  const values = Array.isArray(sources)
    ? sources
    : sources === undefined || sources === null || sources === ""
      ? []
      : [sources];
  const normalized = values
    .flatMap((value) => String(value).split(/[\s,;]+/))
    .map((value) => value.trim())
    .filter(Boolean);
  return ["authority-top", ...normalized.filter((value) => value !== "authority-top")];
}

function getAuthorityCandidateMeta(target) {
  const appearances = Array.isArray(target && target.appearances) ? target.appearances : [];
  const authorityAppearance = appearances.find((item) => item && item.source === "authority-top") || null;
  if (!authorityAppearance) {
    return { authority: null, authorityRank: null };
  }

  const authority = Number(authorityAppearance.metricValue);
  const authorityRank = Number(authorityAppearance.rank);
  return {
    authority: Number.isFinite(authority) ? authority : null,
    authorityRank: Number.isFinite(authorityRank) && authorityRank > 0 ? authorityRank : null,
  };
}

function selectCollectedInteractionTargets(collected, options, selfUserId, type, progress) {
  const excludeSelf = toBool(options.excludeSelf, true);
  const max = asPositiveInt(options.max, null);
  const values = Array.isArray(collected && collected.uniqueIds && collected.uniqueIds.values)
    ? collected.uniqueIds.values
    : [];
  const selection = {
    strategy: LOWEST_AUTHORITY_INTERACTION_TYPES.has(type) ? "lowest_authority" : "collection_order",
    skippedSelf: 0,
    skippedAlreadyPerformed: 0,
    skippedWithoutAuthority: 0,
    eligibleTotal: 0,
  };
  const candidates = [];

  for (const item of values) {
    const userId = item && item.userId !== undefined && item.userId !== null ? String(item.userId) : "";
    if (!/^\d+$/.test(userId)) {
      continue;
    }
    if (excludeSelf && selfUserId && userId === String(selfUserId)) {
      selection.skippedSelf += 1;
      continue;
    }
    if (hasCompletedInteraction(progress, type, userId)) {
      selection.skippedAlreadyPerformed += 1;
      continue;
    }

    const authorityMeta = getAuthorityCandidateMeta(item);
    if (LOWEST_AUTHORITY_INTERACTION_TYPES.has(type) && authorityMeta.authority === null && authorityMeta.authorityRank === null) {
      selection.skippedWithoutAuthority += 1;
      continue;
    }
    candidates.push({
      ...item,
      ...authorityMeta,
    });
  }

  if (LOWEST_AUTHORITY_INTERACTION_TYPES.has(type)) {
    candidates.sort((left, right) => {
      const leftAuthority = left.authority === null ? Number.POSITIVE_INFINITY : left.authority;
      const rightAuthority = right.authority === null ? Number.POSITIVE_INFINITY : right.authority;
      if (leftAuthority !== rightAuthority) {
        return leftAuthority - rightAuthority;
      }
      const leftRank = left.authorityRank === null ? Number.NEGATIVE_INFINITY : left.authorityRank;
      const rightRank = right.authorityRank === null ? Number.NEGATIVE_INFINITY : right.authorityRank;
      if (leftRank !== rightRank) {
        return rightRank - leftRank;
      }
      return Number(left.userId) - Number(right.userId);
    });
  }

  selection.eligibleTotal = candidates.length;
  return {
    targets: max === null ? candidates : candidates.slice(0, max),
    selection,
  };
}

function isInteractionResponseSuccessful(response) {
  const payload = getGamePayload(response);
  return isSuccessfulGameResponse(response) && !(payload && typeof payload === "object" && payload.success === false);
}

function isAlreadyPerformedInteractionResponse(response) {
  const payload = getGamePayload(response);
  const text = [
    payload && payload.message,
    payload && payload.error,
    response && response.message,
  ].filter(Boolean).join(" ").toLowerCase();
  return Boolean(text) && /(already|\u0443\u0436\u0435|\u0441\u0435\u0433\u043e\u0434\u043d\u044f|tomorrow|\u0437\u0430\u0432\u0442\u0440\u0430)/iu.test(text);
}

function buildFriendsInviteProgressKey(collected, options, selfUserId) {
  const signature = {
    selfUserId: selfUserId ? String(selfUserId) : null,
    excludeSelf: toBool(options.excludeSelf, true),
    limit: asPositiveInt(options.limit, 100) ?? 100,
    requestedSources: Array.isArray(options && options.sources)
      ? options.sources.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
      : Array.isArray(collected && collected.requestedSources)
        ? collected.requestedSources.map((value) => String(value).trim().toLowerCase()).filter(Boolean)
        : [],
  };

  return createHash("sha1").update(JSON.stringify(signature)).digest("hex");
}

function pruneFriendsInviteProgressStore() {
  if (friendsInviteProgressByKey.size <= MAX_FRIENDS_INVITE_PROGRESS_ENTRIES) {
    return;
  }

  const oldestFirst = [...friendsInviteProgressByKey.entries()].sort((left, right) => {
    const leftTime = Number(new Date(left[1].updatedAt).getTime()) || 0;
    const rightTime = Number(new Date(right[1].updatedAt).getTime()) || 0;
    return leftTime - rightTime;
  });

  const removeCount = Math.max(0, friendsInviteProgressByKey.size - MAX_FRIENDS_INVITE_PROGRESS_ENTRIES);
  for (let index = 0; index < removeCount; index += 1) {
    const [key] = oldestFirst[index] || [];
    if (!key) {
      continue;
    }
    friendsInviteProgressByKey.delete(key);
  }
}

function createFriendsInviteProgressState(key, meta) {
  const now = new Date().toISOString();
  return {
    key,
    createdAt: now,
    updatedAt: now,
    runs: 0,
    processedUserIds: [],
    processedSet: new Set(),
    meta,
  };
}

function ensureFriendsInviteProgressState(key, meta, reset) {
  if (reset) {
    friendsInviteProgressByKey.delete(key);
  }

  let state = friendsInviteProgressByKey.get(key);
  if (!state) {
    state = createFriendsInviteProgressState(key, meta);
    friendsInviteProgressByKey.set(key, state);
  } else {
    state.meta = meta;
    state.updatedAt = new Date().toISOString();
  }

  pruneFriendsInviteProgressStore();
  return state;
}

async function loadFriendIds(client) {
  const response = await client.friends.list();
  if (!response || !response.ok) {
    return new Set();
  }

  const ids = collectFriendIdsFromPayload(response.data);
  return new Set(ids.map((id) => String(id)));
}

function normalizeFriendProfileRecords(payload, friendIds, selfUserId) {
  const values = Array.isArray(payload) ? payload : [];
  const allowedIds = friendIds instanceof Set && friendIds.size > 0 ? friendIds : null;
  const selfId = selfUserId ? String(selfUserId) : null;
  const seen = new Set();
  const profiles = [];

  for (const item of values) {
    const userId = item && item.userId !== undefined && item.userId !== null
      ? String(item.userId)
      : "";
    const rawAuthority = item && item.authority;
    const authority = rawAuthority === null || rawAuthority === undefined || rawAuthority === ""
      ? Number.NaN
      : Number(rawAuthority);
    if (
      !/^\d+$/.test(userId)
      || (allowedIds && !allowedIds.has(userId))
      || userId === selfId
      || seen.has(userId)
      || !Number.isFinite(authority)
    ) {
      continue;
    }
    seen.add(userId);
    const candidate = normalizeFriendCandidateRecord(item);
    profiles.push({
      userId,
      nickname: item.nickname ? String(item.nickname) : null,
      authority,
      ...(candidate.talentsCount !== null ? { talentsCount: candidate.talentsCount } : {}),
      ...(candidate.weeklyDamage !== null ? { weeklyDamage: candidate.weeklyDamage } : {}),
    });
  }

  return profiles;
}

async function loadFriendAuthorityProfiles(client, selfUserId, progress) {
  const profilesById = new Map();
  let effectivePageSize = null;

  for (let page = 0; page < MAX_FRIEND_PROFILE_PAGES; page += 1) {
    const response = await client.friends.profiles(page, { pageSize: FRIEND_PROFILE_PAGE_SIZE });
    if (!response || !response.ok) {
      throw new Error(`Could not load friend profiles page ${page + 1}: HTTP ${response ? response.status : "unknown"}`);
    }
    const pageItems = Array.isArray(response.data) ? response.data : [];
    // The game itself fills its Friends screen from this endpoint.  Do not filter
    // it through /friendship/list: that endpoint has previously changed shape and
    // can otherwise discard every valid profile before an action is sent.
    const pageProfiles = normalizeFriendProfileRecords(pageItems, null, selfUserId);
    const profilesBeforePage = profilesById.size;
    for (const profile of pageProfiles) {
      profilesById.set(profile.userId, profile);
    }
    if (effectivePageSize === null && pageItems.length > 0) {
      // Some game versions ignore pageSize and return their own fixed page size.
      // Use the first non-empty page as the stop threshold in either case.
      effectivePageSize = Math.min(FRIEND_PROFILE_PAGE_SIZE, pageItems.length);
    }
    progress.update({
      friendsTotal: profilesById.size,
      stage: "Loading friends profiles",
      authorityProfilesTotal: profilesById.size,
      profilePagesLoaded: page + 1,
      profilePagesTotal: null,
    });
    if (
      pageItems.length === 0
      || (effectivePageSize !== null && pageItems.length < effectivePageSize)
      || (page > 0 && pageItems.length > 0 && profilesById.size === profilesBeforePage)
    ) {
      break;
    }
  }

  return [...profilesById.values()];
}

function selectFriendInteractionTargets(profiles, options, selfUserId, type, progress) {
  const max = asPositiveInt(options.max, null);
  const selection = {
    strategy: HIGHEST_AUTHORITY_INTERACTION_TYPES.has(type)
      ? "highest_authority"
      : "lowest_authority",
    skippedSelf: 0,
    skippedAlreadyPerformed: 0,
    skippedWithoutAuthority: 0,
    eligibleTotal: 0,
  };
  const selfId = selfUserId ? String(selfUserId) : null;
  const candidates = [];

  for (const item of Array.isArray(profiles) ? profiles : []) {
    const userId = item && item.userId !== undefined && item.userId !== null ? String(item.userId) : "";
    const rawAuthority = item && item.authority;
    const authority = rawAuthority === null || rawAuthority === undefined || rawAuthority === ""
      ? Number.NaN
      : Number(rawAuthority);
    if (!/^\d+$/.test(userId)) {
      continue;
    }
    if (selfId && userId === selfId) {
      selection.skippedSelf += 1;
      continue;
    }
    if (!Number.isFinite(authority)) {
      selection.skippedWithoutAuthority += 1;
      continue;
    }
    if (hasCompletedInteraction(progress, type, userId)) {
      selection.skippedAlreadyPerformed += 1;
      continue;
    }
    candidates.push({
      userId,
      nickname: item.nickname || null,
      authority,
    });
  }

  const direction = HIGHEST_AUTHORITY_INTERACTION_TYPES.has(type) ? -1 : 1;
  candidates.sort((left, right) => {
    if (left.authority !== right.authority) {
      return direction * (left.authority - right.authority);
    }
    return Number(left.userId) - Number(right.userId);
  });
  selection.eligibleTotal = candidates.length;

  const ordered = candidates.map((item, index) => ({
    ...item,
    authorityRank: index + 1,
  }));
  return {
    targets: max === null ? ordered : ordered.slice(0, max),
    selection,
  };
}

async function getFriendsSummary(options = {}, sessionPath) {
  void options;
  return withContext(sessionPath, async ({ client }) => {
    const response = await client.friends.list();
    if (!response || !response.ok) {
      throw new Error(`Could not load friends list: HTTP ${response ? response.status : "unknown"}`);
    }
    return {
      friendsTotal: new Set(collectFriendIdsFromPayload(response.data).map((id) => String(id))).size,
      refreshedAt: new Date().toISOString(),
    };
  });
}

function normalizeFriendStatusRequestedIds(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(values.map((item) => String(item).trim()).filter((item) => /^\d+$/.test(item)))].slice(0, 500);
}

function extractFriendStatusRequestRecords(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload.data && Array.isArray(payload.data.data)) {
    return payload.data.data;
  }
  for (const key of ["requests", "items", "list", "rows", "values"]) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }
  return [];
}

function friendRequestStatusTarget(record, selfUserId) {
  const item = record && typeof record === "object" ? record : {};
  const selfId = selfUserId ? String(selfUserId) : null;
  const fromUserId = isNumericId(item.fromUserId) ? normalizeId(item.fromUserId) : null;
  const toUserId = isNumericId(item.toUserId) ? normalizeId(item.toUserId) : null;
  if (selfId && fromUserId === selfId && toUserId) {
    return { userId: toUserId, status: "requested" };
  }
  if (selfId && toUserId === selfId && fromUserId) {
    return { userId: fromUserId, status: "incoming" };
  }
  const candidate = normalizeFriendCandidateRecord(item);
  if (!candidate.userId) {
    return null;
  }
  return {
    userId: candidate.userId,
    status: candidate.isIncoming === false ? "requested" : "incoming",
  };
}

async function getFriendStatuses(options = {}, sessionPath) {
  const requestedIds = normalizeFriendStatusRequestedIds(options.ids ?? options.userIds);
  if (requestedIds.length === 0) {
    return { statuses: {}, refreshedAt: new Date().toISOString() };
  }
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const [friendsResponse, requestsResponse] = await Promise.all([
      client.friends.list(),
      client.friends.requests({ page: 0, pageSize: 100 }),
    ]);
    if (!friendsResponse || !friendsResponse.ok) {
      throw new Error(`Could not load friends list: HTTP ${friendsResponse ? friendsResponse.status : "unknown"}`);
    }
    const friendIds = new Set(collectFriendIdsFromPayload(friendsResponse.data).map((value) => String(value)));
    const statuses = Object.fromEntries(requestedIds.map((userId) => [
      userId,
      String(selfUserId || "") === userId
        ? "self"
        : friendIds.has(userId)
          ? "friend"
          : "available",
    ]));

    if (requestsResponse && requestsResponse.ok) {
      for (const record of extractFriendStatusRequestRecords(requestsResponse.data)) {
        const pending = friendRequestStatusTarget(record, selfUserId);
        if (
          pending
          && Object.prototype.hasOwnProperty.call(statuses, pending.userId)
          && !["friend", "self"].includes(statuses[pending.userId])
        ) {
          statuses[pending.userId] = pending.status;
        }
      }
    }

    return { statuses, refreshedAt: new Date().toISOString() };
  });
}

function findSponsorNickname(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 4) {
    return null;
  }
  const direct = String(value.nickname ?? value.displayName ?? value.nick ?? value.name ?? "").trim();
  if (direct) {
    return direct;
  }
  for (const key of ["data", "result", "player", "profile", "user"]) {
    const nested = findSponsorNickname(value[key], depth + 1);
    if (nested) {
      return nested;
    }
  }
  return null;
}

async function resolveSponsorProfileNickname(client, userId) {
  const cached = sponsorProfileCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.nickname;
  }
  let nickname = null;
  try {
    const response = await client.players.view(userId);
    nickname = findSponsorNickname(response);
  } catch {
    nickname = null;
  }
  if (nickname) {
    sponsorProfileCache.set(userId, {
      nickname,
      expiresAt: Date.now() + SPONSOR_PROFILE_CACHE_TTL_MS,
    });
  } else {
    sponsorProfileCache.delete(userId);
  }
  return nickname;
}

async function getSponsorsDirectory() {
  const payload = await loadSupportersDirectory();
  const sponsors = payload.sponsors.map((item) => ({ ...item, nickname: null }));
  const unresolved = sponsors.filter((item) => !item.nickname);
  if (unresolved.length > 0) {
    try {
      await withContext(undefined, async ({ client }) => {
        for (let index = 0; index < unresolved.length; index += SPONSOR_PROFILE_CONCURRENCY) {
          const batch = unresolved.slice(index, index + SPONSOR_PROFILE_CONCURRENCY);
          await Promise.all(batch.map(async (item) => {
            item.nickname = await resolveSponsorProfileNickname(client, item.userId);
          }));
        }
      });
    } catch {
      // The public directory remains usable by ID while the game session is unavailable.
    }
  }
  return {
    version: Number(payload && payload.version) || 1,
    updatedAt: payload && payload.updatedAt || null,
    sponsors: sponsors.map((item) => ({
      ...item,
      nickname: item.nickname || `ID ${item.userId}`,
    })),
  };
}

function buildIdCollectionOptions(options = {}) {
  return {
    limit: asPositiveInt(options.limit, 100) ?? 100,
    sources: options.sources,
  };
}

function filterCollectedExistingFriends(collected, existingFriendIds) {
  const excludedIds = existingFriendIds instanceof Set ? existingFriendIds : new Set();
  const sourceMap = collected && collected.sources && typeof collected.sources === "object"
    ? collected.sources
    : {};
  const rawUniqueValues = Array.isArray(collected && collected.uniqueIds && collected.uniqueIds.values)
    ? collected.uniqueIds.values
    : [];
  const shouldKeepItem = (item) => {
    const userId = item && item.userId !== undefined && item.userId !== null
      ? String(item.userId)
      : "";
    return Boolean(userId) && !excludedIds.has(userId);
  };
  const uniqueValues = rawUniqueValues.filter(shouldKeepItem);
  const sources = Object.fromEntries(
    Object.entries(sourceMap).map(([key, source]) => {
      const items = Array.isArray(source && source.items)
        ? source.items.filter(shouldKeepItem)
        : [];
      return [
        key,
        {
          ...source,
          total: items.length,
          items,
        },
      ];
    }),
  );

  return {
    ...collected,
    sources,
    uniqueIds: {
      ...(collected && collected.uniqueIds && typeof collected.uniqueIds === "object"
        ? collected.uniqueIds
        : {}),
      total: uniqueValues.length,
      ids: uniqueValues.map((item) => String(item.userId)),
      values: uniqueValues,
    },
    existingFriendsTotal: excludedIds.size,
    skippedExisting: Math.max(0, rawUniqueValues.length - uniqueValues.length),
  };
}

async function collectAvailableFriendIds(client, options = {}) {
  const [collected, existingFriendIds] = await Promise.all([
    collectLeaderboardIds(client, buildIdCollectionOptions(options)),
    loadFriendIds(client),
  ]);

  return {
    collected: filterCollectedExistingFriends(collected, existingFriendIds),
    existingFriendIds,
  };
}

async function collectIds(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const { collected } = await collectAvailableFriendIds(client, options);

    return {
      selfUserId,
      collected,
    };
  });
}

async function inviteCollected(options = {}, sessionPath) {
  return runFriendsBatchSerialized("invites", async (batch) => withContext(sessionPath, async ({ client, selfUserId }) => {
    batch.update({ stage: "Collecting IDs from selected sources" });
    const { collected, existingFriendIds } = await collectAvailableFriendIds(client, options);
    const batchSize = asPositiveInt(options.max, 50) ?? 50;
    const queueTargets = pickTargets(collected, { ...options, max: null }, selfUserId);
    const progressKey = buildFriendsInviteProgressKey(collected, options, selfUserId);
    const resetProgress = toBool(options.resetProgress, false);
    const progressState = ensureFriendsInviteProgressState(
      progressKey,
      {
        selfUserId,
        requestedSources: collected.requestedSources,
        collectedUniqueTotal: collected.uniqueIds.total,
        queueTotal: queueTargets.length,
        batchSize,
        excludeSelf: toBool(options.excludeSelf, true),
      },
      resetProgress,
    );
    const unprocessedTargets = queueTargets.filter(
      (item) => !progressState.processedSet.has(String(item.userId)),
    );
    const selectedTargets = unprocessedTargets.slice(0, batchSize);
    const delayMs = asNonNegativeInt(options.delayMs, 300) ?? 300;
    const dryRun = toBool(options.dryRun, false);
    const results = [];
    const queuePositionByUserId = new Map(
      queueTargets.map((item, index) => [String(item.userId), index + 1]),
    );
    const selectedPositions = selectedTargets
      .map((item) => queuePositionByUserId.get(String(item.userId)))
      .filter((value) => Number.isFinite(value));
    const batchRangeStart = selectedPositions.length > 0 ? Math.min(...selectedPositions) : null;
    const batchRangeEnd = selectedPositions.length > 0 ? Math.max(...selectedPositions) : null;
    const runNumber = selectedTargets.length > 0 ? progressState.runs + 1 : progressState.runs;

    batch.setPlan(selectedTargets.length, {
      stage: dryRun ? "Previewing friend invites" : "Sending friend invites",
      friendsTotal: existingFriendIds.size,
    });

    for (const target of selectedTargets) {
      const queuePosition = queuePositionByUserId.get(String(target.userId)) || null;
      if (dryRun) {
        results.push({
          userId: target.userId,
          nickname: target.nickname,
          dryRun: true,
          sources: target.sources,
          queuePosition,
          runNumber,
        });
      } else {
        const response = await client.friends.sendRequest(target.userId);
        results.push({
          userId: target.userId,
          nickname: target.nickname,
          ok: response.ok,
          status: response.status,
          data: response.data,
          sources: target.sources,
          queuePosition,
          runNumber,
        });
      }

      const row = results[results.length - 1];
      batch.completeTarget(target.userId, row.ok === undefined || row.ok);

      const userId = String(target.userId);
      if (!progressState.processedSet.has(userId)) {
        progressState.processedSet.add(userId);
        progressState.processedUserIds.push(userId);
      }

      if (delayMs > 0 && target !== selectedTargets[selectedTargets.length - 1]) {
        await sleep(delayMs);
      }
    }

    if (selectedTargets.length > 0) {
      progressState.runs += 1;
    }
    progressState.updatedAt = new Date().toISOString();

    const processedTotal = queueTargets.filter((item) => progressState.processedSet.has(String(item.userId))).length;
    const remainingTotal = Math.max(0, queueTargets.length - processedTotal);
    const nextTargets = queueTargets
      .filter((item) => !progressState.processedSet.has(String(item.userId)))
      .slice(0, Math.max(1, Math.min(batchSize, 10)));

    return {
      selfUserId,
      requestedSources: collected.requestedSources,
      collectedUniqueTotal: collected.uniqueIds.total,
      requestedTotal: queueTargets.length,
      selectedTotal: selectedTargets.length,
      skippedExisting: collected.skippedExisting ?? 0,
      skippedProcessed: queueTargets.length - unprocessedTargets.length,
      existingFriendsTotal: collected.existingFriendsTotal ?? existingFriendIds.size,
      okCount: dryRun ? selectedTargets.length : results.filter((item) => item.ok).length,
      failCount: dryRun ? 0 : results.filter((item) => !item.ok).length,
      dryRun,
      delayMs,
      batchSize,
      remainingTotal,
      results,
      targets: selectedTargets,
      progress: {
        key: progressKey,
        resetApplied: resetProgress,
        runNumber,
        batchSize,
        queueTotal: queueTargets.length,
        queueRangeStart: batchRangeStart,
        queueRangeEnd: batchRangeEnd,
        processedTotal,
        remainingTotal,
        completed: remainingTotal === 0,
        skippedExisting: collected.skippedExisting ?? 0,
        skippedProcessedBeforeRun: queueTargets.length - unprocessedTargets.length,
        selectedUserIds: selectedTargets.map((item) => String(item.userId)),
        nextUserIds: nextTargets.map((item) => String(item.userId)),
        nextQueuePositions: nextTargets.map((item) => queuePositionByUserId.get(String(item.userId)) || null),
        processedUserIds: [...progressState.processedUserIds],
        updatedAt: progressState.updatedAt,
        createdAt: progressState.createdAt,
      },
    };
  }));
}

function normalizeExplicitInviteTargets(rawTargets) {
  const sourceItems = Array.isArray(rawTargets)
    ? rawTargets
    : typeof rawTargets === "string"
      ? rawTargets.split(",")
      : [];
  const seen = new Set();
  const targets = [];

  for (const item of sourceItems) {
    const rawUserId = item && typeof item === "object"
      ? item.userId ?? item.id ?? null
      : item;
    const userId = String(rawUserId ?? "").trim();
    if (!/^\d+$/.test(userId) || seen.has(userId)) {
      continue;
    }

    seen.add(userId);
    targets.push({
      userId,
      nickname: item && typeof item === "object" && item.nickname
        ? String(item.nickname).trim()
        : null,
      rank: item && typeof item === "object"
        ? asPositiveInt(item.rank, null)
        : null,
      metricValue: item && typeof item === "object"
        ? pickNumeric(item.metricValue, item.damage, item.deltaDamage)
        : null,
    });
  }

  return targets;
}

function buildExplicitInviteMessage(target, options = {}) {
  const parts = [];
  if (options.period) {
    parts.push(`${String(options.period)} top`);
  }
  if (target && Number.isFinite(target.rank)) {
    parts.push(`#${target.rank}`);
  }
  if (target && target.metricValue !== null && target.metricValue !== undefined) {
    parts.push(`dmg ${target.metricValue}`);
  }
  return parts.join(" | ");
}

async function inviteUsers(options = {}, sessionPath) {
  return runFriendsBatchSerialized("invites", async (batch) => withContext(sessionPath, async ({ client, selfUserId }) => {
    const requestedTargets = normalizeExplicitInviteTargets(options.targets ?? options.ids ?? options.userIds);
    if (requestedTargets.length === 0) {
      throw new Error("No valid friend targets provided.");
    }

    const existingFriendIds = await loadFriendIds(client);
    const excludeSelf = toBool(options.excludeSelf, true);
    const batchSize = asPositiveInt(options.max, 10) ?? 10;
    const delayMs = asNonNegativeInt(options.delayMs, 300) ?? 300;
    const dryRun = toBool(options.dryRun, false);
    const selfId = selfUserId ? String(selfUserId) : null;
    const eligibleTargets = [];
    let skippedExisting = 0;
    let skippedSelf = 0;

    for (const target of requestedTargets) {
      const userId = String(target.userId);
      if (excludeSelf && selfId && userId === selfId) {
        skippedSelf += 1;
        continue;
      }
      if (existingFriendIds.has(userId)) {
        skippedExisting += 1;
        continue;
      }
      eligibleTargets.push(target);
    }

    const selectedTargets = eligibleTargets.slice(0, batchSize);
    const skippedOverflow = Math.max(0, eligibleTargets.length - selectedTargets.length);
    const results = [];
    batch.setPlan(selectedTargets.length, {
      stage: dryRun ? "Previewing friend invites" : "Sending friend invites",
      friendsTotal: existingFriendIds.size,
    });

    for (const target of selectedTargets) {
      const queuePosition = results.length + 1;
      const message = buildExplicitInviteMessage(target, options);
      if (dryRun) {
        results.push({
          userId: target.userId,
          nickname: target.nickname,
          rank: target.rank,
          metricValue: target.metricValue,
          dryRun: true,
          queuePosition,
          message,
        });
      } else {
        const response = await client.friends.sendRequest(target.userId);
        results.push({
          userId: target.userId,
          nickname: target.nickname,
          rank: target.rank,
          metricValue: target.metricValue,
          ok: response.ok,
          status: response.status,
          data: response.data,
          queuePosition,
          message,
        });
      }

      const row = results[results.length - 1];
      batch.completeTarget(target.userId, row.ok === undefined || row.ok);

      if (delayMs > 0 && target !== selectedTargets[selectedTargets.length - 1]) {
        await sleep(delayMs);
      }
    }

    return {
      selfUserId,
      source: options.source || "explicit_targets",
      period: options.period || null,
      requestedTotal: requestedTargets.length,
      selectedTotal: selectedTargets.length,
      skippedExisting,
      skippedSelf,
      skippedOverflow,
      existingFriendsTotal: existingFriendIds.size,
      okCount: dryRun ? selectedTargets.length : results.filter((item) => item.ok).length,
      failCount: dryRun ? 0 : results.filter((item) => !item.ok).length,
      dryRun,
      delayMs,
      batchSize,
      results,
      targets: selectedTargets,
    };
  }));
}

function buildFriendCriteriaRecord(candidate, evaluation = null) {
  const item = candidate && typeof candidate === "object" ? candidate : {};
  const details = evaluation || evaluateFriendCriteria(item, normalizeFriendCriteriaOptions({}));
  return {
    userId: item.userId ? String(item.userId) : null,
    nickname: item.nickname || null,
    talentsCount: item.talentsCount ?? null,
    talentPointsTotal: item.talentPointsTotal ?? null,
    weeklyDamage: item.weeklyDamage ?? null,
    weeklyRank: item.weeklyRank ?? null,
    weeklyDamageListed: item.weeklyDamageListed ?? null,
    checks: details.checks,
    failedCriteria: details.failed.map((check) => check.key),
    unknownCriteria: details.unknown.map((check) => check.key),
  };
}

async function loadIncomingFriendRequestCandidates(client, options, selfUserId, batch, criteria) {
  const max = asPositiveInt(options.max, null);
  const requestedPageSize = asPositiveInt(options.pageSize ?? options["page-size"], 30) ?? 30;
  const pageSize = Math.min(100, Math.max(requestedPageSize, max ?? 0, criteria.hasAny ? 100 : 0));
  const defaultMaxPages = criteria.hasAny ? MAX_FRIEND_PROFILE_PAGES : 1;
  const maxPages = asPositiveInt(options.maxPages ?? options["max-pages"], defaultMaxPages) ?? defaultMaxPages;
  const candidatesById = new Map();

  for (let page = 0; page < maxPages; page += 1) {
    const response = await client.friends.requests({ page, pageSize });
    if (!response || !response.ok) {
      throw new Error(`Could not load incoming friend requests page ${page + 1}: HTTP ${response ? response.status : "unknown"}`);
    }
    const pageCandidates = normalizeIncomingFriendRequestRecords(
      response && response.data ? response.data : null,
      selfUserId,
    );
    for (const candidate of pageCandidates) {
      if (candidate.userId && !candidatesById.has(candidate.userId)) {
        candidatesById.set(candidate.userId, candidate);
      }
    }
    batch.update({
      stage: "Loading incoming requests",
      incomingRequestsLoaded: candidatesById.size,
      requestPagesLoaded: page + 1,
    });
    if (
      pageCandidates.length === 0
      || pageCandidates.length < pageSize
      || (!criteria.hasAny && max !== null && candidatesById.size >= max)
    ) {
      break;
    }
  }

  return [...candidatesById.values()];
}

function buildIncomingFriendRequestPlan(candidates, criteria, max) {
  const evaluated = candidates.map((candidate) => ({
    candidate,
    evaluation: evaluateFriendCriteria(candidate, criteria),
  }));
  const eligibleTargets = evaluated
    .filter((item) => item.evaluation.failed.length === 0 && item.evaluation.unknown.length === 0)
    .map((item) => ({ ...item.candidate, evaluation: item.evaluation }));
  const acceptedTargets = max !== null ? eligibleTargets.slice(0, max) : eligibleTargets;
  const rejectedTargets = evaluated
    .filter((item) => item.evaluation.failed.length > 0 || item.evaluation.unknown.length > 0)
    .map((item) => ({ ...item.candidate, evaluation: item.evaluation }));
  return {
    evaluated,
    eligibleTargets,
    acceptedTargets,
    rejectedTargets,
    actions: [
      ...acceptedTargets.map((target) => ({ action: "accept", target })),
      ...rejectedTargets.map((target) => ({ action: "decline", target })),
    ],
    skippedEligibleOverflow: Math.max(0, eligibleTargets.length - acceptedTargets.length),
  };
}

async function acceptFriendRequests(options = {}, sessionPath) {
  return runFriendsBatchSerialized("accept", async (batch) => withContext(sessionPath, async ({ client, selfUserId }) => {
    batch.update({ stage: "Loading incoming requests" });
    const delayMs = asNonNegativeInt(options.delayMs ?? options["delay-ms"], 300) ?? 300;
    const max = asPositiveInt(options.max, null);
    const criteria = normalizeFriendCriteriaOptions(options);
    const dryRun = criteria.dryRun;
    let candidates = await loadIncomingFriendRequestCandidates(client, options, selfUserId, batch, criteria);
    if (criteria.needsWeeklyDamage) {
      batch.update({ stage: "Loading weekly damage" });
      const weeklyDamageByUserId = await loadWeeklyDamageMap(client, criteria.weeklyTopLimit);
      candidates = attachWeeklyDamage(candidates, weeklyDamageByUserId);
    }

    const plan = buildIncomingFriendRequestPlan(candidates, criteria, max);
    const results = [];
    batch.setPlan(plan.actions.length, {
      stage: dryRun ? "Previewing incoming requests" : "Processing incoming requests",
      incomingRequestsLoaded: candidates.length,
    });

    for (const item of plan.actions) {
      const { action, target } = item;
      const userId = String(target.userId);
      const criteriaRecord = buildFriendCriteriaRecord(target, target.evaluation);
      batch.update({
        stage: dryRun
          ? "Previewing incoming requests"
          : action === "accept"
            ? "Accepting friend requests"
            : "Declining friend requests",
      });
      if (dryRun) {
        results.push({
          ...criteriaRecord,
          userId,
          action,
          dryRun: true,
        });
      } else {
        const response = action === "accept"
          ? await client.friends.acceptRequest(userId)
          : await client.friends.declineRequest(userId);
        results.push({
          ...criteriaRecord,
          userId,
          action,
          ok: response.ok,
          status: response.status,
          data: response.data,
        });
      }

      const row = results[results.length - 1];
      batch.completeTarget(userId, row.ok === undefined || row.ok);

      if (delayMs > 0 && item !== plan.actions[plan.actions.length - 1]) {
        await sleep(delayMs);
      }
    }

    const acceptedResults = results.filter((item) => item.action === "accept");
    const declinedResults = results.filter((item) => item.action === "decline");

    return {
      selfUserId,
      requestedTotal: candidates.length,
      eligibleTotal: plan.eligibleTargets.length,
      selectedTotal: plan.acceptedTargets.length,
      rejectedTotal: plan.rejectedTargets.length,
      skippedEligibleOverflow: plan.skippedEligibleOverflow,
      skippedByCriteria: plan.evaluated.filter((item) => item.evaluation.failed.length > 0).length,
      skippedUnknownCriteria: plan.evaluated.filter((item) => item.evaluation.failed.length === 0 && item.evaluation.unknown.length > 0).length,
      acceptedCount: dryRun ? acceptedResults.length : acceptedResults.filter((item) => item.ok).length,
      declinedCount: dryRun ? declinedResults.length : declinedResults.filter((item) => item.ok).length,
      acceptFailCount: dryRun ? 0 : acceptedResults.filter((item) => !item.ok).length,
      declineFailCount: dryRun ? 0 : declinedResults.filter((item) => !item.ok).length,
      okCount: dryRun ? results.length : results.filter((item) => item.ok).length,
      failCount: dryRun ? 0 : results.filter((item) => !item.ok).length,
      delayMs,
      dryRun,
      criteria: serializeFriendCriteria(criteria),
      results,
      targets: plan.acceptedTargets.map((target) => buildFriendCriteriaRecord(target, target.evaluation)),
      rejectedTargets: plan.rejectedTargets.map((target) => buildFriendCriteriaRecord(target, target.evaluation)),
    };
  }));
}

async function loadFriendMaintenanceProfiles(client, friendIds, selfUserId, progress) {
  const ids = friendIds instanceof Set ? friendIds : new Set();
  const selfId = selfUserId ? String(selfUserId) : null;
  const profilesById = new Map();
  let effectivePageSize = null;

  for (let page = 0; page < MAX_FRIEND_PROFILE_PAGES; page += 1) {
    const response = await client.friends.profiles(page, { pageSize: FRIEND_PROFILE_PAGE_SIZE });
    if (!response || !response.ok) {
      throw new Error(`Could not load friend profiles page ${page + 1}: HTTP ${response ? response.status : "unknown"}`);
    }
    const pageItems = Array.isArray(response.data) ? response.data : [];
    const profilesBeforePage = profilesById.size;
    for (const item of pageItems) {
      const candidate = normalizeFriendCandidateRecord(item);
      if (!candidate.userId || candidate.userId === selfId || (ids.size > 0 && !ids.has(candidate.userId))) {
        continue;
      }
      profilesById.set(candidate.userId, candidate);
    }
    if (effectivePageSize === null && pageItems.length > 0) {
      effectivePageSize = Math.min(FRIEND_PROFILE_PAGE_SIZE, pageItems.length);
    }
    progress.update({
      stage: "Loading friends profiles",
      authorityProfilesTotal: profilesById.size,
      profilePagesLoaded: page + 1,
      profilePagesTotal: null,
    });
    if (
      pageItems.length === 0
      || (effectivePageSize !== null && pageItems.length < effectivePageSize)
      || (page > 0 && pageItems.length > 0 && profilesById.size === profilesBeforePage)
    ) {
      break;
    }
  }

  return profilesById;
}

function selectFriendCleanupTargets(candidates, criteria, max) {
  const evaluated = [];
  const targets = [];
  let skippedPassed = 0;
  let skippedUnknownCriteria = 0;

  for (const candidate of candidates) {
    const evaluation = evaluateFriendCriteria(candidate, criteria);
    evaluated.push({ candidate, evaluation });
    if (evaluation.failed.length > 0) {
      targets.push({
        ...candidate,
        evaluation,
      });
      continue;
    }
    if (evaluation.unknown.length > 0) {
      skippedUnknownCriteria += 1;
      continue;
    }
    skippedPassed += 1;
  }

  targets.sort((left, right) => {
    const leftDamage = Number(left.weeklyDamage ?? Number.POSITIVE_INFINITY);
    const rightDamage = Number(right.weeklyDamage ?? Number.POSITIVE_INFINITY);
    if (leftDamage !== rightDamage) {
      return leftDamage - rightDamage;
    }
    const leftTalents = Number(left.talentPointsTotal ?? left.talentsCount ?? Number.POSITIVE_INFINITY);
    const rightTalents = Number(right.talentPointsTotal ?? right.talentsCount ?? Number.POSITIVE_INFINITY);
    if (leftTalents !== rightTalents) {
      return leftTalents - rightTalents;
    }
    return Number(left.userId) - Number(right.userId);
  });

  return {
    evaluated,
    targets: max === null ? targets : targets.slice(0, max),
    skippedPassed,
    skippedUnknownCriteria,
    failedTotal: targets.length,
    skippedOverflow: max === null ? 0 : Math.max(0, targets.length - max),
  };
}

function unwrapFriendSummaryPayload(payload) {
  const root = payload && typeof payload === "object" ? payload : null;
  if (!root) {
    return null;
  }
  return root.data && typeof root.data === "object" && !Array.isArray(root.data)
    ? root.data
    : root;
}

function extractTalentPointsTotal(payload) {
  const root = unwrapFriendSummaryPayload(payload);
  const value = root && root.overview ? Number(root.overview.talentPointsTotal) : Number.NaN;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

async function attachTalentPointsTotals(client, candidates, batch) {
  const enriched = [];
  let loaded = 0;
  let unavailable = 0;
  for (const candidate of candidates) {
    const response = await client.friends.achievementSummary(candidate.userId);
    const talentPointsTotal = response && response.ok ? extractTalentPointsTotal(response.data) : null;
    if (talentPointsTotal === null) {
      unavailable += 1;
      enriched.push({ ...candidate, talentPointsTotal: null });
    } else {
      enriched.push({ ...candidate, talentPointsTotal });
    }
    loaded += 1;
    if (loaded === 1 || loaded % 25 === 0 || loaded === candidates.length) {
      batch.update({
        stage: "Checking talent totals",
        talentTotalsLoaded: loaded,
        talentTotalsTotal: candidates.length,
        talentTotalsUnavailable: unavailable,
      });
    }
  }
  return {
    candidates: enriched,
    unavailable,
  };
}

function normalizeFriendCleanupCriteria(options = {}) {
  const criteria = normalizeFriendCriteriaOptions(options);
  const minTalentTotal = criteria.minTalents ?? criteria.minTalentAchievement;
  if (!criteria.needsWeeklyDamage && minTalentTotal === null) {
    throw new Error("Friend cleanup requires a weekly damage threshold or a minimum talent total.");
  }

  // The profile list itself omits talents, but the public personal-file summary
  // exposes the exact total as overview.talentPointsTotal.
  return {
    ...criteria,
    minTalents: null,
    minTalentAchievement: minTalentTotal,
    needsTalents: false,
    needsTalentAchievement: minTalentTotal !== null,
    hasAny: criteria.needsWeeklyDamage || minTalentTotal !== null,
  };
}

async function cleanupFriends(options = {}, sessionPath) {
  return runFriendsBatchSerialized("cleanup", async (batch) => withContext(sessionPath, async ({ client, selfUserId }) => {
    const criteria = normalizeFriendCleanupCriteria(options);

    const max = asPositiveInt(options.max, null);
    const delayMs = asNonNegativeInt(options.delayMs ?? options["delay-ms"], 300) ?? 300;
    const dryRun = criteria.dryRun;

    batch.update({
      stage: "Loading friends profiles",
    });
    // /friendship/profiles is the source used by the game's Friends screen.
    // Unlike /friendship/list, its response shape has remained usable for
    // actions and it cannot leave cleanup with an incomplete target set.
    const profileMap = await loadFriendMaintenanceProfiles(client, null, selfUserId, batch);
    let candidates = [...profileMap.values()];
    const friendIdSet = new Set(candidates.map((item) => item.userId));
    if (criteria.needsWeeklyDamage) {
      batch.update({ stage: "Loading weekly damage" });
      const weeklyDamageByUserId = await loadWeeklyDamageMap(client, criteria.weeklyTopLimit);
      candidates = attachWeeklyDamage(candidates, weeklyDamageByUserId);
    }
    let talentAchievementInfo = null;
    if (criteria.needsTalentAchievement) {
      talentAchievementInfo = await attachTalentPointsTotals(client, candidates, batch);
      candidates = talentAchievementInfo.candidates;
    }

    const selection = selectFriendCleanupTargets(candidates, criteria, max);
    const targets = selection.targets;
    const results = [];
    batch.setPlan(targets.length, {
      stage: dryRun ? "Previewing friend cleanup" : "Cleaning friends",
      friendsTotal: friendIdSet.size,
      authorityProfilesTotal: candidates.length,
    });

    for (const target of targets) {
      const userId = String(target.userId);
      const criteriaRecord = buildFriendCriteriaRecord(target, target.evaluation);
      if (dryRun) {
        results.push({
          ...criteriaRecord,
          userId,
          dryRun: true,
        });
      } else {
        const removeResponse = await client.friends.remove(userId);
        results.push({
          ...criteriaRecord,
          userId,
          ok: removeResponse.ok,
          status: removeResponse.status,
          data: removeResponse.data,
        });
      }

      const row = results[results.length - 1];
      batch.completeTarget(userId, row.ok === undefined || row.ok);

      if (delayMs > 0 && target !== targets[targets.length - 1]) {
        await sleep(delayMs);
      }
    }

    return {
      selfUserId,
      friendsTotal: friendIdSet.size,
      requestedTotal: candidates.length,
      failedCriteriaTotal: selection.failedTotal,
      selectedTotal: targets.length,
      skippedPassed: selection.skippedPassed,
      skippedUnknownCriteria: selection.skippedUnknownCriteria,
      skippedOverflow: selection.skippedOverflow,
      talentTotalsUnavailable: talentAchievementInfo ? talentAchievementInfo.unavailable : 0,
      okCount: dryRun ? targets.length : results.filter((item) => item.ok).length,
      failCount: dryRun ? 0 : results.filter((item) => !item.ok).length,
      delayMs,
      dryRun,
      criteria: serializeFriendCriteria(criteria),
      results,
      targets: targets.map((target) => buildFriendCriteriaRecord(target, target.evaluation)),
    };
  }));
}

async function runFriendsAction(options = {}, sessionPath) {
  return runFriendsBatchSerialized("action", async (batch) => withContext(sessionPath, async ({ client, selfUserId }) => {
    const type = String(options.type || "").trim();
    if (!INTERACTION_TYPES.has(type)) {
      throw new Error(`Unsupported interaction type: ${type}`);
    }

    batch.update({ stage: "Loading friends profiles" });
    const profiles = await loadFriendAuthorityProfiles(client, selfUserId, batch);
    const friendIds = new Set(profiles.map((profile) => profile.userId));
    const progress = await readInteractionProgress();
    const { targets, selection } = selectFriendInteractionTargets(
      profiles,
      options,
      selfUserId,
      type,
      progress,
    );
    const delayMs = asNonNegativeInt(options.delayMs, 0) ?? 0;
    const dryRun = toBool(options.dryRun, false);
    const continueOnError = toBool(options.continueOnError, true);
    const fromUserId = options.fromUserId ? String(options.fromUserId) : selfUserId;
    const results = [];

    batch.setPlan(targets.length, {
      stage: dryRun ? "Previewing targets" : "Performing actions",
      authorityProfilesTotal: profiles.length,
      currentTarget: null,
    });

    for (const target of targets) {
      if (dryRun) {
        results.push({
          toUserId: target.userId,
          nickname: target.nickname,
          dryRun: true,
          authority: target.authority,
          authorityRank: target.authorityRank,
        });
        batch.completeTarget(target.userId, true);
      } else {
        const response = await client.interactions.perform({
          fromUserId,
          toUserId: target.userId,
          type,
        });
        const row = {
          toUserId: target.userId,
          nickname: target.nickname,
          ok: isInteractionResponseSuccessful(response),
          status: response.status,
          data: response.data,
          authority: target.authority,
          authorityRank: target.authorityRank,
        };
        results.push(row);
        batch.completeTarget(target.userId, row.ok);

        if (
          ONE_PER_DAY_INTERACTION_TYPES.has(type)
          && (row.ok || isAlreadyPerformedInteractionResponse(response))
          && markCompletedInteraction(progress, type, target.userId)
        ) {
          await saveInteractionProgress(progress);
        }

        if (!row.ok && !continueOnError) {
          break;
        }
      }

      if (delayMs > 0 && target !== targets[targets.length - 1]) {
        await sleep(delayMs);
      }
    }

    return {
      selfUserId,
      fromUserId,
      type,
      friendsTotal: friendIds.size,
      authorityProfilesTotal: profiles.length,
      authorityProfilesMissing: Math.max(0, friendIds.size - profiles.length),
      selection,
      selectedTotal: targets.length,
      okCount: dryRun ? targets.length : results.filter((item) => item.ok).length,
      failCount: dryRun ? 0 : results.filter((item) => !item.ok).length,
      dryRun,
      continueOnError,
      delayMs,
      results,
      targets,
    };
  }));
}

function getGamePayload(response) {
  return response && Object.prototype.hasOwnProperty.call(response, "data") ? response.data : response;
}

async function getZarubaProfitCollectionGate(client) {
  if (!client || !client.zaruba || typeof client.zaruba.state !== "function") {
    return {
      canCollect: false,
      active: false,
      checked: false,
      reason: "zaruba_state_unavailable",
    };
  }

  const response = await client.zaruba.state();
  if (!isSuccessfulGameResponse(response)) {
    return {
      canCollect: false,
      active: false,
      checked: false,
      reason: "zaruba_state_unavailable",
      status: response ? response.status : null,
    };
  }

  const state = normalizeZarubaState(response);
  const active = Boolean(state.active);
  return {
    canCollect: active,
    active,
    checked: true,
    reason: active ? null : "zaruba_not_started",
    mode: state.active ? state.active.mode ?? state.active.Mode ?? state.active.id ?? null : null,
  };
}

async function assertZarubaStartedForProfitCollection(client) {
  const gate = await getZarubaProfitCollectionGate(client);
  if (gate.canCollect) {
    return gate;
  }

  const error = new Error(
    gate.reason === "zaruba_state_unavailable"
      ? "Не удалось проверить, начата ли Заруба; прибыль не собираю."
      : "Прибыль не собрана: сначала начните Зарубу.",
  );
  error.code = gate.reason;
  error.gate = gate;
  throw error;
}

async function collectBusinessProfitAfterZarubaCheck(client) {
  const gate = await assertZarubaStartedForProfitCollection(client);
  const response = await client.business.collect();
  return { gate, response };
}

async function loadPrisonAutomationState(options = {}) {
  const statePath = options.statePath || PRISON_AUTOMATION_LATEST_PATH;
  let body;
  try {
    body = await fs.readFile(statePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return normalizePrisonAutomationState({});
    }
    throw error;
  }

  try {
    return normalizePrisonAutomationState(JSON.parse(body));
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    let backupPath = null;
    try {
      backupPath = await archiveCorruptPrisonAutomationState(statePath);
    } catch (archiveError) {
      console.warn(
        `[ui-service] Prison automation state is invalid JSON and could not be archived: ${archiveError.message}`,
      );
    }

    const safeState = normalizePrisonAutomationState({
      enabled: false,
      autoCollectProfit: false,
      usePodogrev: false,
    });
    try {
      await writePrisonAutomationStateAtomically(
        statePath,
        `${JSON.stringify(safeState, null, 2)}\n`,
      );
    } catch (saveError) {
      console.warn(
        `[ui-service] Could not save the safely disabled prison automation state: ${saveError.message}`,
      );
    }

    const backupMessage = backupPath
      ? ` Archived as ${path.basename(backupPath)}.`
      : "";
    console.warn(
      `[ui-service] Prison automation state is invalid JSON; its automation settings were reset and disabled.${backupMessage}`,
    );
    return safeState;
  }
}

function getSessionSelfUserId(session) {
  const user = session && session.telegram && session.telegram.initDataUnsafe
    ? session.telegram.initDataUnsafe.user
    : null;
  const selfUserId = user && user.id !== undefined && user.id !== null
    ? String(user.id).trim()
    : "";
  return /^\d+$/.test(selfUserId) ? selfUserId : null;
}

function getAccountArtifactPath(accountId, fileName) {
  const normalizedAccountId = String(accountId || "").trim();
  if (!/^\d+$/.test(normalizedAccountId)) {
    throw new Error("A numeric account ID is required for account-scoped state.");
  }
  return path.join(ARTIFACTS_DIR, "accounts", normalizedAccountId, fileName);
}

async function migrateLegacyPrisonAutomationState(accountId, statePath) {
  try {
    await fs.access(PRISON_AUTOMATION_ACCOUNT_MIGRATION_PATH);
    return false;
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  void statePath;
  await writePrisonAutomationStateAtomically(
    PRISON_AUTOMATION_ACCOUNT_MIGRATION_PATH,
    `${JSON.stringify({
      accountId,
      copied: 0,
      legacyStatePreserved: true,
      migratedAt: new Date().toISOString(),
    }, null, 2)}\n`,
  );
  return false;
}

async function resolvePrisonAutomationAccountContext(sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const session = await loadSessionSnapshot(resolvedSessionPath);
  const accountId = getSessionSelfUserId(session);
  if (!accountId) {
    throw new Error("Cannot isolate prison automation without the active account ID.");
  }
  const statePath = getAccountArtifactPath(accountId, "prison-automation-latest.json");
  await migrateLegacyPrisonAutomationState(accountId, statePath);
  return { accountId, statePath, sessionPath: resolvedSessionPath };
}

async function savePrisonAutomationState(value, options = {}) {
  const previousVersion = Math.max(
    0,
    Number(prisonAutomationRuntime.state && prisonAutomationRuntime.state.version) || 0,
  );
  const state = normalizePrisonAutomationState({
    ...value,
    version: previousVersion + 1,
    updatedAt: new Date().toISOString(),
  });
  await writePrisonAutomationStateAtomically(
    options.statePath || prisonAutomationRuntime.statePath || PRISON_AUTOMATION_LATEST_PATH,
    `${JSON.stringify(state, null, 2)}\n`,
  );
  prisonAutomationRuntime.state = state;
  return state;
}

async function archiveCorruptPrisonAutomationState(statePath) {
  const parsedPath = path.parse(statePath);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const backupPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}.corrupt-${Date.now()}-${attempt}${parsedPath.ext || ".json"}`,
    );
    try {
      await fs.rename(statePath, backupPath);
      return backupPath;
    } catch (error) {
      if (error && error.code === "EEXIST") {
        continue;
      }
      if (error && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  throw new Error("Could not reserve a filename for the corrupt prison automation state.");
}

async function writePrisonAutomationStateAtomically(statePath, body) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.${prisonAutomationStateWriteSequence += 1}.tmp`;
  try {
    const fileHandle = await fs.open(temporaryPath, "w");
    try {
      await fileHandle.writeFile(body, "utf8");
      await fileHandle.sync();
    } finally {
      await fileHandle.close();
    }
    await fs.rename(temporaryPath, statePath);
  } catch (error) {
    try {
      await fs.unlink(temporaryPath);
    } catch (cleanupError) {
      if (!cleanupError || cleanupError.code !== "ENOENT") {
        console.warn(`[ui-service] Could not remove temporary prison automation state: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

function buildPrisonAutomationView(value) {
  const state = normalizePrisonAutomationState(value || prisonAutomationRuntime.state || {});
  return {
    ...state,
    serverRunning: prisonAutomationRuntime.running,
    tickCount: prisonAutomationRuntime.tickCount,
    accountId: prisonAutomationRuntime.accountId,
  };
}

function getInitResourceBalance(initData, resourceKey) {
  if (!initData || typeof initData !== "object") {
    return null;
  }
  const currencies = initData.currencies && typeof initData.currencies === "object"
    ? initData.currencies
    : {};
  return asNonNegativeInt(currencies[resourceKey] ?? initData[resourceKey], null);
}

function getChefirRecoveryDecision(energyPolicy, initData, requiredEnergy) {
  const policy = energyPolicy && typeof energyPolicy === "object" ? energyPolicy : {};
  const energy = asNumber(initData && initData.energy, null);
  const maxEnergy = asNumber(initData && (initData.maxEnergy ?? initData.maxenergy), null);
  const chefirBalance = getInitResourceBalance(initData, "chefir");
  const chefirReserve = asNonNegativeInt(policy.chefirReserve, 0) ?? 0;
  const chefirDailyLimit = asNonNegativeInt(policy.chefirDailyLimit, 0) ?? 0;
  const chefirSpentToday = asNonNegativeInt(policy.chefirSpentToday, 0) ?? 0;
  const remainingDailyLimit = Math.max(0, chefirDailyLimit - chefirSpentToday);
  let reason = null;

  if (!policy.allowChefir) {
    reason = "chefir_disabled";
  } else if (remainingDailyLimit <= 0) {
    reason = "chefir_daily_limit";
  } else if (chefirBalance === null) {
    reason = "chefir_balance_unknown";
  } else if (chefirBalance <= chefirReserve) {
    reason = "chefir_reserve";
  } else if (maxEnergy !== null && maxEnergy < requiredEnergy) {
    reason = "required_energy_above_max";
  } else if (energy !== null && maxEnergy !== null && energy >= maxEnergy) {
    reason = "energy_full";
  }

  return {
    source: "chefir",
    canUse: reason === null,
    reason,
    energy,
    maxEnergy,
    requiredEnergy,
    chefirBalance,
    chefirReserve,
    remainingDailyLimit,
  };
}

async function restorePrisonAutomationEnergyIfNeeded(client, state, initData, requiredEnergy) {
  const energy = asNumber(initData && initData.energy, null);
  const recovery = {
    attempted: false,
    used: false,
    source: null,
    reason: null,
    beforeEnergy: energy,
    afterEnergy: energy,
    requiredEnergy,
    attempts: [],
  };

  if (energy === null || energy >= requiredEnergy) {
    return { ...recovery, initData, energy };
  }

  const policy = state && state.energyPolicy && typeof state.energyPolicy === "object"
    ? state.energyPolicy
    : {};
  const order = policy.order === "soap_chefir"
    ? ["soap", "chefir"]
    : ["chefir", "soap"];

  for (const source of order) {
    if (source === "soap") {
      if (policy.allowSoap) {
        recovery.attempts.push({ source, canUse: false, reason: "soap_not_supported" });
      }
      continue;
    }

    const decision = getChefirRecoveryDecision(policy, initData, requiredEnergy);
    recovery.attempts.push(decision);
    if (!decision.canUse) {
      continue;
    }

    recovery.attempted = true;
    recovery.source = "chefir";
    const response = client.players && typeof client.players.useChefir === "function"
      ? await client.players.useChefir()
      : await client.post("/api/player/energy/use-chefir", { json: {} });

    if (!isSuccessfulGameResponse(response)) {
      return {
        ...recovery,
        reason: "chefir_failed",
        status: response ? response.status : null,
        initData,
        energy,
      };
    }

    policy.chefirSpentToday = asNonNegativeInt(policy.chefirSpentToday, 0) + 1;
    state.energyPolicy = policy;
    const nextInitData = getGamePayload(await client.players.init()) || {};
    const nextEnergy = asNumber(nextInitData.energy, null);

    return {
      ...recovery,
      used: true,
      reason: "chefir_used",
      afterEnergy: nextEnergy,
      status: response ? response.status : null,
      initData: nextInitData,
      energy: nextEnergy,
    };
  }

  return {
    ...recovery,
    reason: recovery.attempts.find((attempt) => attempt.reason)?.reason || "energy_recovery_unavailable",
    initData,
    energy,
  };
}

function advancePrisonAutomationQueue(queue, options = {}) {
  const normalizedQueue = normalizePrisonAutomationState({ queue }).queue;
  if (normalizedQueue.length === 0) {
    return { queue: [], completedItem: null, repeated: false };
  }
  const [completedItem, ...rest] = normalizedQueue;
  const skipRemaining = options.skipRemaining === true;
  const creditedRuns = Math.max(1, asPositiveInt(options.completedRuns, 1) ?? 1);
  if (!skipRemaining && completedItem.goalType === "collection") {
    return {
      queue: [
        { ...completedItem, completedRuns: Number(completedItem.completedRuns || 0) + creditedRuns },
        ...rest,
      ],
      completedItem,
      repeated: true,
    };
  }
  const runTarget = Math.max(1, Number(completedItem.runTarget || completedItem.repeatCount || 1));
  const completedRuns = Math.min(
    runTarget,
    Number(completedItem.completedRuns || 0) + creditedRuns,
  );
  if (!skipRemaining && completedItem.goalType === "runs" && completedRuns < runTarget) {
    return {
      queue: [
        {
          ...completedItem,
          runTarget,
          completedRuns,
          repeatCount: runTarget - completedRuns,
        },
        ...rest,
      ],
      completedItem,
      repeated: true,
    };
  }
  return {
    queue: rest,
    completedItem,
    repeated: false,
  };
}

function getPodogrevInboxItemEnergy(item) {
  const type = Number(item && item.type);
  return Math.max(0, Number(PODOGREV_ENERGY_BY_TYPE[type] || 0));
}

function selectPodogrevTokensUpToEnergy(inbox, requestedEnergy) {
  const target = Math.max(0, Math.trunc(Number(requestedEnergy) || 0));
  if (target <= 0) {
    return { tokens: [], energy: 0, exact: true };
  }

  const items = (Array.isArray(inbox) ? inbox : [])
    .map((item) => ({
      token: String(item && item.token || "").trim(),
      energy: getPodogrevInboxItemEnergy(item),
    }))
    .filter((item) => item.token && item.energy > 0 && item.energy <= target);
  const bestByEnergy = new Map([[0, []]]);

  for (const item of items) {
    const known = [...bestByEnergy.entries()].sort((left, right) => right[0] - left[0]);
    for (const [energy, tokens] of known) {
      const nextEnergy = energy + item.energy;
      if (nextEnergy > target || bestByEnergy.has(nextEnergy)) {
        continue;
      }
      bestByEnergy.set(nextEnergy, [...tokens, item.token]);
    }
    if (bestByEnergy.has(target)) {
      break;
    }
  }

  const energy = Math.max(...bestByEnergy.keys());
  return {
    tokens: bestByEnergy.get(energy) || [],
    energy,
    exact: energy === target,
  };
}

async function loadActiveZarubaPodogrevTask(client) {
  if (!client || !client.zaruba || typeof client.zaruba.state !== "function") {
    return { checked: false, active: false, task: null, reason: "zaruba_state_unavailable" };
  }
  const response = await client.zaruba.state();
  if (!isSuccessfulGameResponse(response)) {
    return { checked: false, active: false, task: null, reason: "zaruba_state_unavailable" };
  }
  const state = normalizeZarubaState(response);
  const tasks = normalizeZarubaTasks(state.active);
  const task = tasks.find((entry) => (
    entry
    && entry.kind === "podogrev"
    && entry.completed !== true
    && Number(entry.requiredAmount || 0) > Number(entry.currentAmount || 0)
  )) || null;
  return {
    checked: true,
    active: Boolean(state.active),
    task,
    reason: !state.active
      ? "zaruba_not_started"
      : task
        ? null
        : "zaruba_podogrev_task_absent",
  };
}

async function collectPodogrevForActiveZaruba(client) {
  const gate = await loadActiveZarubaPodogrevTask(client);
  if (!gate.checked || !gate.active || !gate.task) {
    return {
      ok: gate.checked,
      executed: false,
      reason: gate.reason,
      zaruba: gate,
    };
  }

  const remaining = Math.max(
    0,
    Number(gate.task.requiredAmount || 0) - Number(gate.task.currentAmount || 0),
  );
  const statusResponse = await client.podogrev.status();
  const statusPayload = getGamePayload(statusResponse) || {};
  const status = normalizePodogrevDashboard(statusResponse);
  const targetEnergy = Math.max(0, Math.min(remaining, Number(status.leftQuota || 0)));
  if (status.available <= 0 || targetEnergy <= 0) {
    return {
      ok: true,
      executed: false,
      reason: status.available <= 0 ? "podogrev_unavailable" : "podogrev_quota_exhausted",
      remaining,
      targetEnergy,
      status,
      zaruba: gate,
    };
  }

  const selection = selectPodogrevTokensUpToEnergy(statusPayload.inbox, targetEnergy);
  if (!selection.exact || selection.energy <= 0 || selection.tokens.length === 0) {
    return {
      ok: true,
      executed: false,
      reason: "podogrev_exact_amount_unavailable",
      remaining,
      targetEnergy,
      selection,
      status,
      zaruba: gate,
    };
  }

  const response = await client.podogrev.collectSelected(selection.tokens);
  return {
    ok: isSuccessfulGameResponse(response),
    executed: true,
    type: "podogrev",
    remaining,
    requestedEnergy: selection.energy,
    exact: selection.exact,
    selectedCount: selection.tokens.length,
    before: status,
    response: sanitizeBossAutomationValue(getGamePayload(response)),
    zaruba: gate,
  };
}

function getPrisonAutomationRunCount(runView) {
  if (!runView || typeof runView !== "object") {
    return null;
  }
  const progress = runView.progress && typeof runView.progress === "object" ? runView.progress : {};
  const value = runView.runs ?? progress.runs ?? progress.completedRuns ?? progress.level;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
}

function getPrisonAutomationCompletionToken(runView) {
  if (!runView || (runView.completed !== true && !isMasterRunComplete(runView))) {
    return null;
  }
  const runs = getPrisonAutomationRunCount(runView);
  const checkpoint = asNonNegativeInt(
    runView.currentCheckpointIndex ?? (runView.progress && runView.progress.currentCheckpoint),
    0,
  ) ?? 0;
  return `completed:${runs === null ? "unknown" : runs}:${checkpoint}`;
}

function observePrisonAutomationRun(queueItem, runView, options = {}) {
  const currentRuns = getPrisonAutomationRunCount(runView);
  const hadBaseline = queueItem.observedRuns !== undefined && queueItem.observedRuns !== null;
  const previousRuns = hadBaseline ? Math.max(0, Number(queueItem.observedRuns) || 0) : null;
  const completionToken = getPrisonAutomationCompletionToken(runView);
  let completedRuns = hadBaseline && currentRuns !== null && currentRuns >= previousRuns
    ? currentRuns - previousRuns
    : 0;
  if (
    completedRuns === 0
    && hadBaseline
    && options.creditCompletedSnapshot === true
    && completionToken
    && completionToken !== queueItem.lastCompletionToken
  ) {
    completedRuns = 1;
  }
  if (currentRuns !== null) {
    queueItem.observedRuns = currentRuns;
  }
  if (completionToken) {
    queueItem.lastCompletionToken = completionToken;
  }
  return {
    baselineInitialized: !hadBaseline && currentRuns !== null,
    previousRuns,
    currentRuns,
    completedRuns: Math.max(0, Math.trunc(completedRuns)),
    completionToken,
  };
}

function isMasterRunComplete(view) {
  if (!view || typeof view !== "object") {
    return false;
  }
  const completedCheckpoints = Array.isArray(view.completed) ? view.completed : [];
  if (completedCheckpoints.length > 0 && completedCheckpoints.every(Boolean)) {
    return true;
  }
  const checkpoints = Array.isArray(view.checkpoints) ? view.checkpoints : [];
  return checkpoints.length > 0
    && Number(view.currentCheckpointIndex) >= checkpoints.length;
}

function getMasterRunCompletionCount(before, after) {
  const beforeRuns = getPrisonAutomationRunCount(before);
  const afterRuns = getPrisonAutomationRunCount(after);
  if (beforeRuns !== null && afterRuns !== null && afterRuns > beforeRuns) {
    return afterRuns - beforeRuns;
  }
  if (!isMasterRunComplete(before) && isMasterRunComplete(after)) {
    return 1;
  }
  const beforeProgress = before && before.progress && typeof before.progress === "object" ? before.progress : {};
  const afterProgress = after && after.progress && typeof after.progress === "object" ? after.progress : {};
  const beforeCheckpoint = asNonNegativeInt(
    (before && before.currentCheckpointIndex) ?? beforeProgress.currentCheckpoint,
    0,
  ) ?? 0;
  const afterCheckpoint = asNonNegativeInt(
    (after && after.currentCheckpointIndex) ?? afterProgress.currentCheckpoint,
    0,
  ) ?? 0;
  if (beforeCheckpoint > 0 && afterCheckpoint < beforeCheckpoint) {
    return 1;
  }
  return 0;
}

async function loadPrisonQueueCollectionStatus(client, queueItem) {
  const [catalog, inventoryResponse] = await Promise.all([
    loadWearableCatalog(client, { allowStale: true }),
    client.get("/api/clothing/inventory"),
  ]);
  if (!isSuccessfulGameResponse(inventoryResponse)) {
    throw new Error("Не удалось проверить собранные вещи для цели тюремной очереди.");
  }
  const targetType = queueItem.targetType === "master" ? "master" : "prison";
  const targetId = Number(queueItem.targetId);
  const dashboard = buildWearableDashboard(catalog, getGamePayload(inventoryResponse) || {}, {
    prisons: targetType === "prison" ? [{ id: targetId }] : [],
    masters: targetType === "master" ? [{ id: targetId }] : [],
  });
  const source = targetType === "master"
    ? dashboard.masters[String(targetId)] || dashboard.masters[targetId]
    : dashboard.prisons[String(targetId)] || dashboard.prisons[targetId];
  const totals = source && source.totals ? source.totals : {};
  const collected = Math.max(0, Number(totals.collected) || 0);
  const total = Math.max(0, Number(totals.total) || 0);
  const missingItems = source && Array.isArray(source.sets)
    ? source.sets.flatMap((set) => Array.isArray(set.missing) ? set.missing : [])
    : [];
  const missingModes = [...new Set(missingItems
    .map((item) => String(item && item.sourceMode || "").toLowerCase())
    .filter((mode) => mode === "day" || mode === "night"))];
  return {
    checkedAt: new Date().toISOString(),
    collected,
    total,
    missing: Math.max(0, total - collected),
    missingModes,
    complete: total > 0 && collected >= total,
    known: total > 0,
  };
}

function applyPrisonQueueCollectionStatus(queueItem, status) {
  queueItem.collectionCollected = status.collected;
  queueItem.collectionTotal = status.total;
  queueItem.collectionMissing = status.missing;
  queueItem.collectionCheckedAt = status.checkedAt;
  if (queueItem.targetType === "prison" && status.missingModes.length > 0) {
    const currentMode = queueItem.isDay === false ? "night" : "day";
    const selectedMode = status.missingModes.includes(currentMode) ? currentMode : status.missingModes[0];
    queueItem.isDay = selectedMode !== "night";
  }
  return status;
}

function applyPrisonAutomationQueueAdvance(state, options = {}) {
  const advanced = advancePrisonAutomationQueue(state.queue, options);
  state.queue = advanced.queue;
  const next = advanced.queue[0];
  if (next) {
    state.targetType = next.targetType;
    state.targetId = next.targetId;
    state.isDay = next.isDay;
  }
  return advanced;
}

function clearPrisonAutomationTimer() {
  if (prisonAutomationRuntime.timerId) {
    clearInterval(prisonAutomationRuntime.timerId);
  }
  prisonAutomationRuntime.timerId = null;
}

function applyPrisonAutomationTimer(state) {
  clearPrisonAutomationTimer();
  if (!state || (!state.enabled && !state.autoCollectProfit && !state.usePodogrev)) {
    return;
  }
  const intervalSec = state.enabled ? state.intervalSec : 60;
  prisonAutomationRuntime.timerId = setInterval(() => {
    void runPrisonAutomationTick({ reason: "interval" });
  }, Math.max(5, intervalSec) * 1000);
}

function schedulePrisonAutomationImmediateTick(reason = "state_update") {
  setTimeout(() => {
    void runPrisonAutomationTick({ reason });
  }, 0);
}

async function ensurePrisonAutomationLoaded(sessionPath) {
  const context = await resolvePrisonAutomationAccountContext(sessionPath);
  if (
    prisonAutomationRuntime.initialized
    && prisonAutomationRuntime.state
    && prisonAutomationRuntime.accountId === context.accountId
  ) {
    return prisonAutomationRuntime.state;
  }
  clearPrisonAutomationTimer();
  const state = await loadPrisonAutomationState({ statePath: context.statePath });
  prisonAutomationRuntime.state = state;
  prisonAutomationRuntime.accountId = context.accountId;
  prisonAutomationRuntime.statePath = context.statePath;
  prisonAutomationRuntime.sessionPath = context.sessionPath;
  prisonAutomationRuntime.tickCount = 0;
  prisonAutomationRuntime.lastMaintenanceCheckAt = 0;
  prisonAutomationRuntime.initialized = true;
  applyPrisonAutomationTimer(state);
  return state;
}

function runPrisonAutomationSerialized(operation) {
  const run = prisonAutomationSerializedOperation
    .catch(() => undefined)
    .then(operation);
  prisonAutomationSerializedOperation = run.catch(() => undefined);
  return run;
}

function hasEnoughCurrencies(balances, costs) {
  const missing = {};
  for (const [currency, cost] of Object.entries(costs || {})) {
    const balance = asNumber(balances && balances[currency], 0);
    if (balance < asNumber(cost, 0)) {
      missing[currency] = asNumber(cost, 0) - balance;
    }
  }
  return {
    enough: Object.keys(missing).length === 0,
    missing,
  };
}

async function buyMissingMasterItemsWithClient(client, masterId, options = {}) {
  const entryResponse = await client.masters.enter(masterId);
  let view = normalizeMasterEnterResponse(entryResponse, { id: masterId });
  if (!view.available) {
    return {
      ok: false,
      reason: view.locked ? "master_locked" : "master_unavailable",
      view,
      purchased: [],
    };
  }
  if (view.missingItems.length === 0) {
    return {
      ok: true,
      reason: "already_owned",
      view,
      purchased: [],
    };
  }

  const initResponse = await client.players.init();
  const initData = getGamePayload(initResponse) || {};
  const balances = initData.currencies && typeof initData.currencies === "object" ? initData.currencies : {};
  const affordability = hasEnoughCurrencies(balances, view.missingCost);
  if (options.dryRun || !affordability.enough) {
    return {
      ok: options.dryRun ? true : false,
      dryRun: Boolean(options.dryRun),
      reason: options.dryRun ? "preview" : "insufficient_currency",
      view,
      balances,
      affordability,
      purchased: [],
    };
  }

  const purchased = [];
  for (const item of view.missingItems) {
    const response = await client.masters.buyItem(masterId, item.itemIndex);
    const payload = getGamePayload(response) || {};
    const ok = isSuccessfulGameResponse(response) && payload.success !== false;
    purchased.push({
      itemIndex: item.itemIndex,
      currency: item.currency,
      price: item.price,
      ok,
      status: response.status,
      error: payload.error || payload.message || null,
    });
    if (!ok) {
      break;
    }
  }

  view = normalizeMasterEnterResponse(await client.masters.enter(masterId), { id: masterId });
  return {
    ok: purchased.length > 0 && purchased.every((item) => item.ok),
    reason: view.missingItems.length === 0 ? "all_purchased" : "purchase_incomplete",
    view,
    balances,
    affordability,
    purchased,
  };
}

function summarizeMasterStep(before, after, response) {
  const beforeProgress = before.progress || {};
  const afterProgress = after.progress || {};
  return {
    ok: isSuccessfulGameResponse(response),
    responseStatus: response ? response.status : null,
    before: {
      currentCheckpointIndex: asNumber(beforeProgress.currentCheckpoint, 0),
      clicksInCheckpoint: asNumber(beforeProgress.clicksInCheckpoint, 0),
      level: asNumber(beforeProgress.level, 0),
      intellect: asNumber(beforeProgress.intellect, 0),
    },
    after: {
      currentCheckpointIndex: asNumber(afterProgress.currentCheckpoint, 0),
      clicksInCheckpoint: asNumber(afterProgress.clicksInCheckpoint, 0),
      level: asNumber(afterProgress.level, 0),
      intellect: asNumber(afterProgress.intellect, 0),
    },
    delta: {
      checkpointAdvance: asNumber(afterProgress.currentCheckpoint, 0) - asNumber(beforeProgress.currentCheckpoint, 0),
      clicksAdvance: asNumber(afterProgress.clicksInCheckpoint, 0) - asNumber(beforeProgress.clicksInCheckpoint, 0),
      levelGain: asNumber(afterProgress.level, 0) - asNumber(beforeProgress.level, 0),
      intellectGain: asNumber(afterProgress.intellect, 0) - asNumber(beforeProgress.intellect, 0),
    },
    responseData: getGamePayload(response),
  };
}

async function executeMasterRunnerOnce(client, options = {}) {
  const masterId = asPositiveInt(options.masterId, 1) ?? 1;
  const steps = asPositiveInt(options.steps, 1) ?? 1;
  const delayMs = asNonNegativeInt(options.delayMs, 250) ?? 250;
  let currentView = normalizeMasterEnterResponse(await client.masters.enter(masterId), { id: masterId });
  const before = currentView;
  const results = [];

  if (!currentView.available || currentView.missingItems.length > 0 || !currentView.canStartTraining) {
    return {
      masterId,
      stepsRequested: steps,
      stepsCompleted: 0,
      before,
      after: currentView,
      results,
      blockedReason: !currentView.available
        ? "master_locked"
        : currentView.missingItems.length > 0
          ? "master_items_required"
          : "training_unavailable",
    };
  }

  for (let stepIndex = 0; stepIndex < steps; stepIndex += 1) {
    const response = await client.masters.work(masterId);
    const after = normalizeMasterEnterResponse(await client.masters.enter(masterId), { id: masterId });
    const summary = summarizeMasterStep(currentView, after, response);
    results.push({ stepIndex, summary });
    currentView = after;

    const noProgress = summary.delta.checkpointAdvance === 0
      && summary.delta.clicksAdvance === 0
      && summary.delta.levelGain === 0
      && summary.delta.intellectGain === 0;
    if (!summary.ok || noProgress || !after.canStartTraining) {
      break;
    }
    if (delayMs > 0 && stepIndex !== steps - 1) {
      await sleep(delayMs);
    }
  }

  return {
    masterId,
    stepsRequested: steps,
    stepsCompleted: results.length,
    before,
    after: currentView,
    results,
    blockedReason: null,
  };
}

async function getPrisonDashboard(sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    let userId = selfUserId;
    if (!userId) {
      const me = getGamePayload(await client.players.me()) || {};
      userId = me.id || me.userId || (me.data && (me.data.id || me.data.userId)) || null;
    }

    const [prisonsResponse, mastersResponse, businessResponse, podogrevResponse, wearableInventory, wearableCatalog] = await Promise.all([
      client.prisons.all(),
      client.masters.all(),
      client.business.all(),
      client.podogrev.status(),
      loadWearableInventory(client, { accountKey: selfUserId }),
      loadWearableCatalog(client, { allowStale: true }),
    ]);
    const prisonsPayload = getGamePayload(prisonsResponse) || {};
    const mastersPayload = getGamePayload(mastersResponse) || {};
    const prisons = Array.isArray(prisonsPayload.prisons) ? prisonsPayload.prisons : [];
    const masters = Array.isArray(mastersPayload.masters) ? mastersPayload.masters : [];
    const access = mastersPayload.access && typeof mastersPayload.access === "object" ? mastersPayload.access : {};
    const wearables = buildWearableDashboard(wearableCatalog, wearableInventory, { prisons, masters });
    const unlockedMasters = masters.filter((master) => access[String(master.id)] === true || access[master.id] === true);
    const enterResponses = await Promise.all(unlockedMasters.map((master) => client.masters.enter(master.id)));
    const enterById = new Map(unlockedMasters.map((master, index) => [
      Number(master.id),
      normalizeMasterEnterResponse(enterResponses[index], master),
    ]));

    return {
      selfUserId: userId ? String(userId) : null,
      generatedAt: new Date().toISOString(),
      prisons: prisons.map((prison) => ({
        ...prison,
        gear: wearables.prisons[String(prison.id)] || wearables.prisons[prison.id] || null,
      })),
      masters: masters.map((master) => ({
        ...master,
        isUnlocked: access[String(master.id)] === true || access[master.id] === true,
        training: enterById.get(Number(master.id)) || null,
        gear: wearables.masters[String(master.id)] || wearables.masters[master.id] || null,
      })),
      wearables,
      business: normalizeBusinessDashboard(businessResponse),
      podogrev: normalizePodogrevDashboard(podogrevResponse),
      automation: buildPrisonAutomationView(await ensurePrisonAutomationLoaded(sessionPath)),
    };
  });
}

async function buyMissingMasterItems(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => ({
    selfUserId,
    masterId: asPositiveInt(options.masterId, 1) ?? 1,
    ...(await buyMissingMasterItemsWithClient(
      client,
      asPositiveInt(options.masterId, 1) ?? 1,
      { dryRun: toBool(options.dryRun, false) },
    )),
  }));
}

async function runPrisonAutomationTick(options = {}, sessionPath) {
  return runPrisonAutomationSerialized(async () => {
    const state = await ensurePrisonAutomationLoaded(sessionPath);
    if (prisonAutomationRuntime.running) {
      return { ok: true, skipped: true, reason: "already_running", automation: buildPrisonAutomationView(state) };
    }

    prisonAutomationRuntime.running = true;
    prisonAutomationRuntime.tickCount += 1;
    const startedAt = new Date().toISOString();
    state.lastTickStartedAt = startedAt;
    state.lastError = null;
    let maintenance = null;
    let action = null;

    try {
      await withContext(sessionPath, async ({ client }) => {
        const now = Date.now();
        const maintenanceDue = options.forceMaintenance === true
          || now - prisonAutomationRuntime.lastMaintenanceCheckAt >= 60_000;
        if (maintenanceDue) {
          prisonAutomationRuntime.lastMaintenanceCheckAt = now;
          maintenance = { profit: null, podogrev: null };
          if (state.autoCollectProfit) {
            const business = normalizeBusinessDashboard(await client.business.all(), now);
            maintenance.profit = { canCollect: business.canCollect, collected: false };
            if (business.canCollect) {
              const profitGate = await getZarubaProfitCollectionGate(client);
              maintenance.profit.zaruba = profitGate;
              if (profitGate.canCollect) {
                const collected = await client.business.collect();
                maintenance.profit.collected = isSuccessfulGameResponse(collected);
                maintenance.profit.result = getGamePayload(collected);
              } else {
                maintenance.profit.reason = profitGate.reason;
              }
            }
          }
          if (state.usePodogrev) {
            const podogrev = await collectPodogrevForActiveZaruba(client);
            maintenance.podogrev = {
              ...podogrev,
              collected: Boolean(podogrev.executed && podogrev.ok),
            };
          }
        }

        if (!state.enabled) {
          action = { type: "maintenance", reason: "target_automation_disabled", at: new Date().toISOString() };
          return;
        }

        const activeQueueItem = Array.isArray(state.queue) ? state.queue[0] : null;
        if (!activeQueueItem) {
          action = {
            type: "wait",
            reason: "queue_empty",
            at: new Date().toISOString(),
          };
          return;
        }
        state.targetType = activeQueueItem.targetType;
        state.targetId = activeQueueItem.targetId;
        state.isDay = activeQueueItem.isDay;
        if (activeQueueItem.origin === "monthly") {
          const response = await client.get("/api/monthly/state");
          const progress = getMonthlyQueueProgress(activeQueueItem, response);
          if (!progress.checked) {
            action = { type: "wait", reason: "monthly_state_unavailable", at: new Date().toISOString() };
            return;
          }
          if (progress.finished) {
            applyPrisonAutomationQueueAdvance(state, { skipRemaining: true });
            action = { type: "queue_advance", reason: "monthly_task_completed_or_expired", at: new Date().toISOString() };
            return;
          }
          activeQueueItem.runTarget = Number(activeQueueItem.completedRuns || 0) + progress.remaining;
          activeQueueItem.repeatCount = progress.remaining;
        }
        if (
          activeQueueItem.goalType === "runs"
          && Number(activeQueueItem.completedRuns || 0) >= Number(activeQueueItem.runTarget || 1)
        ) {
          const advanced = applyPrisonAutomationQueueAdvance(state, { skipRemaining: true });
          action = {
            type: "queue_advance",
            targetType: activeQueueItem.targetType,
            targetId: activeQueueItem.targetId,
            queueItemId: activeQueueItem.queueItemId,
            reason: "run_target_completed",
            repeated: advanced.repeated,
            nextQueueItemId: state.queue[0] ? state.queue[0].queueItemId : null,
            at: new Date().toISOString(),
          };
          return;
        }
        const isZarubaQueueItem = Boolean(
          activeQueueItem.serverTaskId
          && String(activeQueueItem.origin || "").includes("zaruba"),
        );
        let liveZarubaTask = null;
        if (isZarubaQueueItem) {
          const live = await loadLiveZarubaTaskWithClient(client, activeQueueItem.serverTaskId);
          if (!live.checked) {
            action = {
              type: "wait",
              targetType: state.targetType,
              targetId: state.targetId,
              queueItemId: activeQueueItem.queueItemId,
              reason: "zaruba_state_unavailable",
              at: new Date().toISOString(),
            };
            return;
          }
          liveZarubaTask = live.task;
          if (!liveZarubaTask || liveZarubaTask.completed) {
            const advanced = applyPrisonAutomationQueueAdvance(state, { skipRemaining: true });
            action = {
              type: "queue_advance",
              targetType: activeQueueItem.targetType,
              targetId: activeQueueItem.targetId,
              queueItemId: activeQueueItem.queueItemId,
              reason: liveZarubaTask ? "zaruba_task_completed" : "zaruba_task_expired",
              repeated: advanced.repeated,
              nextQueueItemId: state.queue[0] ? state.queue[0].queueItemId : null,
              at: new Date().toISOString(),
            };
            return;
          }
        }

        if (state.targetType === "master") {
          let entry = normalizeMasterEnterResponse(await client.masters.enter(state.targetId), { id: state.targetId });
          if (!entry.available) {
            action = { type: "wait", targetType: "master", targetId: state.targetId, reason: "master_locked", at: new Date().toISOString() };
            return;
          }
          let collectionStatus = null;
          if (activeQueueItem.goalType === "collection") {
            collectionStatus = applyPrisonQueueCollectionStatus(
              activeQueueItem,
              await loadPrisonQueueCollectionStatus(client, activeQueueItem),
            );
            if (!collectionStatus.known) {
              action = {
                type: "wait",
                targetType: "master",
                targetId: state.targetId,
                queueItemId: activeQueueItem.queueItemId,
                reason: "collection_catalog_empty",
                collection: collectionStatus,
                at: new Date().toISOString(),
              };
              return;
            }
            if (collectionStatus.complete) {
              const advanced = applyPrisonAutomationQueueAdvance(state, { skipRemaining: true });
              action = {
                type: "queue_advance",
                targetType: "master",
                targetId: activeQueueItem.targetId,
                queueItemId: activeQueueItem.queueItemId,
                reason: "collection_completed",
                collection: collectionStatus,
                repeated: advanced.repeated,
                nextQueueItemId: state.queue[0] ? state.queue[0].queueItemId : null,
                at: new Date().toISOString(),
              };
              return;
            }
          }
          const runObservation = observePrisonAutomationRun(activeQueueItem, entry, {
            creditCompletedSnapshot: true,
          });
          if (runObservation.baselineInitialized) {
            await savePrisonAutomationState(state);
          }
          if (runObservation.completedRuns > 0) {
            if (activeQueueItem.goalType === "collection") {
              collectionStatus = applyPrisonQueueCollectionStatus(
                activeQueueItem,
                await loadPrisonQueueCollectionStatus(client, activeQueueItem),
              );
            }
            const advanced = applyPrisonAutomationQueueAdvance(state, {
              completedRuns: runObservation.completedRuns,
              skipRemaining: Boolean(collectionStatus && collectionStatus.complete),
            });
            action = {
              type: "queue_recovered",
              targetType: "master",
              targetId: activeQueueItem.targetId,
              queueItemId: activeQueueItem.queueItemId,
              reason: "completed_run_recovered_after_restart",
              completedRuns: runObservation.completedRuns,
              collection: collectionStatus,
              repeated: advanced.repeated,
              nextQueueItemId: state.queue[0] ? state.queue[0].queueItemId : null,
              at: new Date().toISOString(),
            };
            return;
          }
          if (entry.missingItems.length > 0 && state.autoBuyMasterItems) {
            const purchase = await buyMissingMasterItemsWithClient(client, state.targetId);
            action = {
              type: "master_items",
              targetType: "master",
              targetId: state.targetId,
              reason: purchase.reason,
              purchased: purchase.purchased.length,
              missingCost: entry.missingCost,
              at: new Date().toISOString(),
            };
            entry = purchase.view;
          }
          if (entry.missingItems.length > 0) {
            action = {
              type: "wait",
              targetType: "master",
              targetId: state.targetId,
              reason: "master_items_required",
              missingCost: entry.missingCost,
              at: new Date().toISOString(),
            };
            return;
          }
          if (!entry.canStartTraining) {
            action = {
              type: "wait",
              targetType: "master",
              targetId: activeQueueItem.targetId,
              queueItemId: activeQueueItem.queueItemId,
              reason: isZarubaQueueItem ? "zaruba_master_exhausted" : "training_unavailable",
              at: new Date().toISOString(),
            };
            return;
          }

          const remainingTaskAmount = liveZarubaTask
            ? Math.max(0, Number(liveZarubaTask.requiredAmount || 0) - Number(liveZarubaTask.currentAmount || 0))
            : null;
          const zarubaPlan = liveZarubaTask
            ? buildMasterKnowledgePlan(entry, remainingTaskAmount)
            : null;
          if (liveZarubaTask && !zarubaPlan) {
            action = {
              type: "wait",
              targetType: "master",
              targetId: state.targetId,
              queueItemId: activeQueueItem.queueItemId,
              reason: "zaruba_master_plan_unavailable",
              remaining: remainingTaskAmount,
              at: new Date().toISOString(),
            };
            return;
          }
          const stepsToRun = zarubaPlan
            ? Math.max(1, Math.min(state.stepsPerTick, zarubaPlan.steps))
            : state.stepsPerTick;
          let initData = getGamePayload(await client.players.init()) || {};
          let energy = asNumber(initData.energy, null);
          const requiredEnergy = Math.max(
            state.minEnergy,
            zarubaPlan
              ? sumFirst(zarubaPlan.stepEnergy, stepsToRun)
              : asNumber(entry.energyCost, 0) * stepsToRun,
          );
          let energyRecovery = null;
          if (energy !== null && energy < requiredEnergy) {
            energyRecovery = await restorePrisonAutomationEnergyIfNeeded(client, state, initData, requiredEnergy);
            initData = energyRecovery.initData || initData;
            energy = asNumber(initData.energy, energy);
          }
          if (energy !== null && energy < requiredEnergy) {
            action = {
              type: "wait",
              status: "waiting_for_energy",
              targetType: "master",
              targetId: state.targetId,
              reason: "not_enough_energy",
              energy,
              requiredEnergy,
              energyPolicy: state.energyPolicy,
              energyRecovery,
              at: new Date().toISOString(),
            };
            return;
          }
          const result = await executeMasterRunnerOnce(client, {
            masterId: state.targetId,
            steps: stepsToRun,
            delayMs: state.delayMs,
          });
          let completed = Boolean(
            getMasterRunCompletionCount(result.before, result.after) > 0,
          );
          const completedRunCount = completed ? getMasterRunCompletionCount(result.before, result.after) : 0;
          observePrisonAutomationRun(activeQueueItem, {
            ...(result.after || {}),
            completed: completedRunCount > 0 && getPrisonAutomationRunCount(result.after) === getPrisonAutomationRunCount(result.before),
          }, { creditCompletedSnapshot: completedRunCount > 0 });
          let zarubaProgress = null;
          if (liveZarubaTask) {
            const liveAfter = await loadLiveZarubaTaskWithClient(client, activeQueueItem.serverTaskId);
            if (liveAfter.checked) {
              const afterTask = liveAfter.task;
              completed = !afterTask || afterTask.completed;
              zarubaProgress = {
                before: liveZarubaTask.currentAmount,
                after: afterTask ? afterTask.currentAmount : liveZarubaTask.requiredAmount,
                required: liveZarubaTask.requiredAmount,
              };
              if (afterTask && !afterTask.completed) {
                activeQueueItem.taskCurrentAmount = asNonNegativeInt(afterTask.currentAmount, 0);
                activeQueueItem.taskRequiredAmount = asNonNegativeInt(afterTask.requiredAmount, 0);
              }
            } else {
              completed = false;
            }
          }
          if (completed && activeQueueItem.goalType === "collection") {
            collectionStatus = applyPrisonQueueCollectionStatus(
              activeQueueItem,
              await loadPrisonQueueCollectionStatus(client, activeQueueItem),
            );
          }
          const advanced = completed
            ? applyPrisonAutomationQueueAdvance(state, {
                completedRuns: completedRunCount,
                skipRemaining: Boolean(collectionStatus && collectionStatus.complete),
              })
            : null;
          action = {
            type: "run",
            targetType: "master",
            targetId: state.targetId,
            queueItemId: activeQueueItem.queueItemId,
            stepsCompleted: result.stepsCompleted,
            reason: result.blockedReason,
            completed,
            completedRuns: completedRunCount,
            collection: collectionStatus,
            zarubaProgress,
            energyRecovery: energyRecovery && energyRecovery.used ? energyRecovery : null,
            plan: zarubaPlan ? {
              steps: zarubaPlan.steps,
              energy: zarubaPlan.energy,
              points: zarubaPlan.points,
            } : null,
            repeated: advanced ? advanced.repeated : false,
            nextQueueItemId: state.queue[0] ? state.queue[0].queueItemId : null,
            at: new Date().toISOString(),
          };
          return;
        }

        let collectionStatus = null;
        if (activeQueueItem.goalType === "collection") {
          collectionStatus = applyPrisonQueueCollectionStatus(
            activeQueueItem,
            await loadPrisonQueueCollectionStatus(client, activeQueueItem),
          );
          state.isDay = activeQueueItem.isDay;
          if (!collectionStatus.known) {
            action = {
              type: "wait",
              targetType: "prison",
              targetId: state.targetId,
              queueItemId: activeQueueItem.queueItemId,
              reason: "collection_catalog_empty",
              collection: collectionStatus,
              at: new Date().toISOString(),
            };
            return;
          }
          if (collectionStatus.complete) {
            const advanced = applyPrisonAutomationQueueAdvance(state, { skipRemaining: true });
            action = {
              type: "queue_advance",
              targetType: "prison",
              targetId: activeQueueItem.targetId,
              isDay: activeQueueItem.isDay,
              queueItemId: activeQueueItem.queueItemId,
              reason: "collection_completed",
              collection: collectionStatus,
              repeated: advanced.repeated,
              nextQueueItemId: state.queue[0] ? state.queue[0].queueItemId : null,
              at: new Date().toISOString(),
            };
            return;
          }
        }
        const detail = await loadPrisonDetail(client, state.targetId);
        const remainingTaskAmount = liveZarubaTask
          ? Math.max(0, Number(liveZarubaTask.requiredAmount || 0) - Number(liveZarubaTask.currentAmount || 0))
          : null;
        const zarubaPlan = liveZarubaTask
          ? buildPrisonRespectPlan(detail.view, remainingTaskAmount)
          : null;
        if (liveZarubaTask && !zarubaPlan) {
          action = {
            type: "wait",
            targetType: "prison",
            targetId: state.targetId,
            queueItemId: activeQueueItem.queueItemId,
            reason: "zaruba_prison_plan_unavailable",
            remaining: remainingTaskAmount,
            at: new Date().toISOString(),
          };
          return;
        }
        if (zarubaPlan) {
          state.isDay = zarubaPlan.isDay;
          activeQueueItem.isDay = zarubaPlan.isDay;
          activeQueueItem.planMode = zarubaPlan.modeKey;
          activeQueueItem.plannedSteps = zarubaPlan.steps;
          activeQueueItem.plannedEnergy = zarubaPlan.energy;
          activeQueueItem.plannedPoints = zarubaPlan.points;
          activeQueueItem.taskCurrentAmount = asNonNegativeInt(liveZarubaTask.currentAmount, 0);
          activeQueueItem.taskRequiredAmount = asNonNegativeInt(liveZarubaTask.requiredAmount, 0);
        }
        const mode = detail.view[state.isDay ? "day" : "night"];
        const runObservation = observePrisonAutomationRun(activeQueueItem, mode, {
          creditCompletedSnapshot: true,
        });
        if (runObservation.baselineInitialized) {
          await savePrisonAutomationState(state);
        }
        if (runObservation.completedRuns > 0 && !liveZarubaTask) {
          if (activeQueueItem.goalType === "collection") {
            collectionStatus = applyPrisonQueueCollectionStatus(
              activeQueueItem,
              await loadPrisonQueueCollectionStatus(client, activeQueueItem),
            );
          }
          const advanced = applyPrisonAutomationQueueAdvance(state, {
            completedRuns: runObservation.completedRuns,
            skipRemaining: Boolean(collectionStatus && collectionStatus.complete),
          });
          action = {
            type: "queue_recovered",
            targetType: "prison",
            targetId: activeQueueItem.targetId,
            isDay: activeQueueItem.isDay,
            queueItemId: activeQueueItem.queueItemId,
            reason: "completed_run_recovered_after_restart",
            completedRuns: runObservation.completedRuns,
            collection: collectionStatus,
            repeated: advanced.repeated,
            nextQueueItemId: state.queue[0] ? state.queue[0].queueItemId : null,
            at: new Date().toISOString(),
          };
          return;
        }
        const stepsToRun = zarubaPlan
          ? Math.max(1, Math.min(state.stepsPerTick, zarubaPlan.steps))
          : state.stepsPerTick;
        let initData = getGamePayload(await client.players.init()) || {};
        let energy = asNumber(initData.energy, null);
        const requiredEnergy = Math.max(
          state.minEnergy,
          zarubaPlan
            ? sumFirst(zarubaPlan.stepEnergy, stepsToRun)
            : asNumber(mode && mode.activeCheckpoint ? mode.activeCheckpoint.energyCost : 0, 0) * stepsToRun,
        );
        let energyRecovery = null;
        if (energy !== null && energy < requiredEnergy) {
          energyRecovery = await restorePrisonAutomationEnergyIfNeeded(client, state, initData, requiredEnergy);
          initData = energyRecovery.initData || initData;
          energy = asNumber(initData.energy, energy);
        }
        if (energy !== null && energy < requiredEnergy) {
          action = {
            type: "wait",
            status: "waiting_for_energy",
            targetType: "prison",
            targetId: state.targetId,
            reason: "not_enough_energy",
            energy,
            requiredEnergy,
            energyPolicy: state.energyPolicy,
            energyRecovery,
            at: new Date().toISOString(),
          };
          return;
        }
        const result = await executePrisonRunnerOnce(client, {
          prisonId: state.targetId,
          isDay: state.isDay,
          steps: stepsToRun,
          delayMs: state.delayMs,
          continueOnError: false,
          stopOnNoProgress: true,
        });
        const afterMode = result.after && result.after[result.modeKey];
        const afterObservation = observePrisonAutomationRun(activeQueueItem, afterMode, {
          creditCompletedSnapshot: true,
        });
        const completedRunCount = Math.max(
          0,
          Number(result.runsCompleted || 0),
          Number(afterObservation.completedRuns || 0),
        );
        let completed = completedRunCount > 0;
        let zarubaProgress = null;
        if (liveZarubaTask) {
          const liveAfter = await loadLiveZarubaTaskWithClient(client, activeQueueItem.serverTaskId);
          if (liveAfter.checked) {
            const afterTask = liveAfter.task;
            completed = !afterTask || afterTask.completed;
            zarubaProgress = {
              before: liveZarubaTask.currentAmount,
              after: afterTask ? afterTask.currentAmount : liveZarubaTask.requiredAmount,
              required: liveZarubaTask.requiredAmount,
            };
            if (afterTask && !afterTask.completed) {
              activeQueueItem.taskCurrentAmount = asNonNegativeInt(afterTask.currentAmount, 0);
              activeQueueItem.taskRequiredAmount = asNonNegativeInt(afterTask.requiredAmount, 0);
            }
          } else {
            completed = false;
          }
        }
        if (completed && activeQueueItem.goalType === "collection") {
          collectionStatus = applyPrisonQueueCollectionStatus(
            activeQueueItem,
            await loadPrisonQueueCollectionStatus(client, activeQueueItem),
          );
        }
        const advanced = completed
          ? applyPrisonAutomationQueueAdvance(state, {
              completedRuns: completedRunCount,
              skipRemaining: Boolean(collectionStatus && collectionStatus.complete),
            })
          : null;
        action = {
          type: "run",
          targetType: "prison",
          targetId: state.targetId,
          isDay: state.isDay,
          queueItemId: activeQueueItem.queueItemId,
          stepsCompleted: result.stepsCompleted,
          completed,
          completedRuns: completedRunCount,
          collection: collectionStatus,
          zarubaProgress,
          energyRecovery: energyRecovery && energyRecovery.used ? energyRecovery : null,
          plan: zarubaPlan ? {
            steps: zarubaPlan.steps,
            energy: zarubaPlan.energy,
            points: zarubaPlan.points,
            modeKey: zarubaPlan.modeKey,
          } : null,
          repeated: advanced ? advanced.repeated : false,
          nextQueueItemId: state.queue[0] ? state.queue[0].queueItemId : null,
          at: new Date().toISOString(),
        };
      });

      state.lastAction = action;
      state.lastTickFinishedAt = new Date().toISOString();
      const saved = await savePrisonAutomationState(state);
      return { ok: true, skipped: false, action, maintenance, automation: buildPrisonAutomationView(saved) };
    } catch (error) {
      state.lastError = {
        at: new Date().toISOString(),
        message: error && error.message ? error.message : String(error),
      };
      state.lastTickFinishedAt = new Date().toISOString();
      await savePrisonAutomationState(state);
      return { ok: false, error: state.lastError, action, maintenance, automation: buildPrisonAutomationView(state) };
    } finally {
      prisonAutomationRuntime.running = false;
    }
  });
}

async function initializePrisonAutomation(sessionPath) {
  const state = await ensurePrisonAutomationLoaded(sessionPath);
  if (state.enabled || state.autoCollectProfit || state.usePodogrev) {
    schedulePrisonAutomationImmediateTick("initialize");
  }
  return buildPrisonAutomationView(state);
}

async function getPrisonAutomationState(sessionPath) {
  return buildPrisonAutomationView(await ensurePrisonAutomationLoaded(sessionPath));
}

function getPrisonAutomationUpdatedQueue(current, options = {}) {
  const hasTargetUpdate = options.targetType !== undefined
    || options.targetId !== undefined
    || options.isDay !== undefined;
  if (options.queue !== undefined) {
    return options.queue;
  }
  if (!hasTargetUpdate || Array.isArray(current.queue) && current.queue.length > 0) {
    return current.queue;
  }
  return [{
    targetType: options.targetType ?? current.targetType,
    targetId: options.targetId ?? current.targetId,
    isDay: options.isDay ?? current.isDay,
    goalType: "runs",
    runTarget: 1,
    completedRuns: 0,
    repeatCount: 1,
    origin: "manual",
  }];
}

async function updatePrisonAutomation(options = {}, sessionPath) {
  return runPrisonAutomationSerialized(async () => {
    const current = await ensurePrisonAutomationLoaded(sessionPath);
    const queue = getPrisonAutomationUpdatedQueue(current, options);
    const next = await savePrisonAutomationState({ ...current, ...options, queue });
    applyPrisonAutomationTimer(next);
    if (next.enabled || next.autoCollectProfit || next.usePodogrev) {
      schedulePrisonAutomationImmediateTick("state_update");
    }
    return buildPrisonAutomationView(next);
  });
}

async function getPrisonStatus(sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const [prisons, mobile, escape] = await Promise.all([
      client.prisons.all(),
      client.mobile.progress(),
      client.mobile.escapeProgress(),
    ]);

    return {
      selfUserId,
      prisons: prisons.data,
      mobile: mobile.data,
      escape: escape.data,
    };
  });
}

async function getPrisonDetail(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const prisonId = asPositiveInt(options.prisonId, 1) ?? 1;
    const detail = await loadPrisonDetail(client, prisonId);

    return {
      selfUserId,
      prisonId,
      view: detail.view,
    };
  });
}

async function runPrison(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const targetType = String(options.targetType || "prison").toLowerCase() === "master" ? "master" : "prison";
    const prisonId = asPositiveInt(options.prisonId, 1) ?? 1;
    const masterId = asPositiveInt(options.masterId ?? options.targetId, 1) ?? 1;
    const isDay = toBool(options.isDay, true);
    const steps = asPositiveInt(options.steps, 1) ?? 1;
    const delayMs = asNonNegativeInt(options.delayMs, 250) ?? 250;
    const dryRun = toBool(options.dryRun, false);

    if (targetType === "master") {
      let detail = normalizeMasterEnterResponse(await client.masters.enter(masterId), { id: masterId });
      let purchase = null;
      if (!dryRun && detail.missingItems.length > 0 && toBool(options.autoBuyMasterItems, false)) {
        purchase = await buyMissingMasterItemsWithClient(client, masterId);
        detail = purchase.view;
      }
      if (dryRun) {
        return {
          selfUserId,
          dryRun: true,
          targetType,
          masterId,
          steps,
          delayMs,
          detail,
        };
      }
      const result = await executeMasterRunnerOnce(client, { masterId, steps, delayMs });
      return {
        selfUserId,
        dryRun: false,
        targetType,
        purchase,
        ...result,
      };
    }

    if (dryRun) {
      const detail = await loadPrisonDetail(client, prisonId);
      return {
        selfUserId,
        dryRun: true,
        targetType,
        prisonId,
        isDay,
        steps,
        delayMs,
        request: buildPrisonWorkRequest(prisonId, isDay),
        detail: detail.view,
      };
    }

    const result = await executePrisonRunnerOnce(client, {
      prisonId,
      isDay,
      steps,
      delayMs,
      continueOnError: toBool(options.continueOnError, true),
      stopOnNoProgress: toBool(options.stopOnNoProgress, true),
    });

    return {
      selfUserId,
      dryRun: false,
      targetType,
      ...result,
    };
  });
}

function normalizeEconomyResourceValues(values) {
  const normalized = {};
  for (const [key, value] of Object.entries(values && typeof values === "object" ? values : {})) {
    const numeric = Number(value);
    if (key && Number.isFinite(numeric)) {
      normalized[String(key)] = numeric;
    }
  }
  return normalized;
}

function normalizeEconomyResourceSnapshot(data) {
  return normalizeEconomyResourceValues({
    ...(data && data.currencies && typeof data.currencies === "object" ? data.currencies : {}),
    authority: data ? data.authority : null,
    ...Object.fromEntries(Object.entries(BOSS_WEAPON_COUNT_FIELDS).map(([weapon, field]) => (
      [`weapon_${weapon}`, data ? data[field] : null]
    ))),
  });
}

function normalizeHeaderWeaponStats(data) {
  const combatStats = data && data.combatStats && typeof data.combatStats === "object"
    ? data.combatStats
    : {};
  return Object.fromEntries(Object.entries(BOSS_WEAPON_COUNT_FIELDS).map(([weapon, field]) => [
    weapon,
    {
      count: asNumber(data && data[field], 0),
      damage: asNumber(combatStats[weapon], 0),
      critChance: asNumber(combatStats[`${weapon}Crit`], 0),
    },
  ]));
}

function getRequiredTalentDamage(totalPoints) {
  const nextPoint = Math.trunc(asNumber(totalPoints, 0)) + 1;
  if (nextPoint < 1 || nextPoint > 999) {
    return 1;
  }

  let requiredDamage = 50;
  requiredDamage *= Math.pow(1.05, Math.max(Math.min(nextPoint, 99) - 1, 0));
  requiredDamage *= Math.pow(1.01, Math.max(Math.min(nextPoint - 99, 100), 0));
  requiredDamage *= Math.pow(1.007, Math.max(Math.min(nextPoint - 199, 158), 0));
  requiredDamage *= Math.pow(1.007, Math.max(Math.min(nextPoint - 357, 107), 0));
  requiredDamage *= Math.pow(1.015, Math.max(Math.min(nextPoint - 464, 312), 0));
  requiredDamage *= Math.pow(1.014, Math.max(nextPoint - 776, 0));
  return Math.round(requiredDamage);
}

function normalizeHeaderTalentStatus(response) {
  if (!response || response.ok === false) {
    return null;
  }

  let payload = response.data && typeof response.data === "object" ? response.data : response;
  if (!payload.state && payload.data && typeof payload.data === "object") {
    payload = payload.data;
  }
  const state = payload && payload.state && typeof payload.state === "object"
    ? payload.state
    : null;
  if (!state) {
    return null;
  }

  const spentPoints = Math.max(0, Math.trunc(asNumber(state.spentPoints, 0)));
  const unspentPoints = Math.max(0, Math.trunc(asNumber(state.unspentPoints, 0)));
  const currentDamage = Math.max(0, Math.trunc(asNumber(state.currentDamage, 0)));
  const totalPoints = spentPoints + unspentPoints;
  const isMax = state.isMax === true || totalPoints >= 999;
  const requiredDamage = isMax ? 0 : getRequiredTalentDamage(totalPoints);
  const remainingDamage = isMax ? 0 : Math.max(0, requiredDamage - currentDamage);
  const progressPercent = isMax
    ? 100
    : requiredDamage > 0
      ? Math.min(100, (currentDamage / requiredDamage) * 100)
      : 0;

  return {
    spentPoints,
    unspentPoints,
    totalPoints,
    currentDamage,
    requiredDamage,
    remainingDamage,
    progressPercent,
    nextPoint: isMax ? null : totalPoints + 1,
    isMax,
  };
}

function normalizeEconomyHistory(payload) {
  const samples = Array.isArray(payload && payload.samples) ? payload.samples : [];
  return {
    version: 2,
    samples: samples
      .map((sample) => ({
        at: sample && typeof sample.at === "string" ? sample.at : null,
        selfUserId: sample && sample.selfUserId !== undefined && sample.selfUserId !== null
          ? String(sample.selfUserId).trim() || null
          : null,
        resources: normalizeEconomyResourceValues(sample && sample.resources),
      }))
      .filter((sample) => sample.at && Number.isFinite(Date.parse(sample.at)))
      .sort((left, right) => Date.parse(left.at) - Date.parse(right.at)),
  };
}

function getEconomyHistorySamples(history, selfUserId) {
  const accountId = selfUserId === undefined || selfUserId === null
    ? ""
    : String(selfUserId).trim();
  if (!accountId) {
    return [];
  }
  return (Array.isArray(history && history.samples) ? history.samples : [])
    .filter((sample) => sample && sample.selfUserId === accountId);
}

async function loadEconomyHistory() {
  if (economyHistoryCache) {
    return economyHistoryCache;
  }
  try {
    economyHistoryCache = normalizeEconomyHistory(JSON.parse(await fs.readFile(ECONOMY_HISTORY_PATH, "utf8")));
  } catch (error) {
    economyHistoryCache = normalizeEconomyHistory(null);
  }
  return economyHistoryCache;
}

async function saveEconomyHistory(history) {
  economyHistoryCache = normalizeEconomyHistory(history);
  await fs.mkdir(path.dirname(ECONOMY_HISTORY_PATH), { recursive: true });
  await fs.writeFile(ECONOMY_HISTORY_PATH, `${JSON.stringify(economyHistoryCache, null, 2)}\n`, "utf8");
  return economyHistoryCache;
}

function areEconomyResourcesEqual(left, right) {
  const keys = new Set([
    ...Object.keys(left || {}),
    ...Object.keys(right || {}),
  ]);
  for (const key of keys) {
    if (Number(left && left[key] || 0) !== Number(right && right[key] || 0)) {
      return false;
    }
  }
  return true;
}

function buildEconomyTrendWindow(samples, current, nowMs, windowMs) {
  const cutoff = nowMs - windowMs;
  const available = (Array.isArray(samples) ? samples : [])
    .filter((sample) => Number.isFinite(Date.parse(sample && sample.at)))
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  if (available.length === 0) {
    return {
      baselineAt: null,
      complete: false,
      delta: {},
    };
  }

  const delta = {};
  const baselineAtByKey = {};
  const completeByKey = {};
  const keys = new Set([
    ...Object.keys(current || {}),
    ...available.flatMap((sample) => Object.keys(sample.resources || {})),
  ]);
  for (const key of keys) {
    const samplesWithKey = available.filter((sample) => Object.hasOwn(sample.resources || {}, key));
    if (samplesWithKey.length === 0) {
      continue;
    }
    const older = samplesWithKey.filter((sample) => Date.parse(sample.at) <= cutoff);
    const baseline = older.length > 0 ? older[older.length - 1] : samplesWithKey[0];
    delta[key] = Number(current && current[key] || 0) - Number(baseline.resources[key] || 0);
    baselineAtByKey[key] = baseline.at;
    completeByKey[key] = Date.parse(baseline.at) <= cutoff;
  }

  const baselineAt = Object.values(baselineAtByKey).sort()[0] || null;

  return {
    baselineAt,
    baselineAtByKey,
    complete: Object.values(completeByKey).length > 0 && Object.values(completeByKey).every(Boolean),
    completeByKey,
    delta,
  };
}

function buildEconomyTrends(samples, current, nowMs = Date.now()) {
  return {
    day: buildEconomyTrendWindow(samples, current, nowMs, 24 * 60 * 60_000),
    week: buildEconomyTrendWindow(samples, current, nowMs, 7 * 24 * 60 * 60_000),
  };
}

function recordEconomySnapshot(resources, selfUserId, nowMs = Date.now()) {
  const normalized = normalizeEconomyResourceValues(resources);
  const accountId = selfUserId === undefined || selfUserId === null
    ? ""
    : String(selfUserId).trim();
  if (!accountId) {
    return Promise.resolve(buildEconomyTrends([], normalized, nowMs));
  }
  const operation = economyHistoryOperation
    .catch(() => undefined)
    .then(async () => {
      const history = await loadEconomyHistory();
      const oldestAllowed = nowMs - ECONOMY_HISTORY_RETENTION_MS;
      const samples = history.samples.filter((sample) => Date.parse(sample.at) >= oldestAllowed);
      const accountSamples = getEconomyHistorySamples({ samples }, accountId);
      const last = accountSamples.length > 0 ? accountSamples[accountSamples.length - 1] : null;
      const shouldAppend = !last
        || !areEconomyResourcesEqual(last.resources, normalized)
        || nowMs - Date.parse(last.at) >= ECONOMY_HISTORY_HEARTBEAT_MS;
      if (shouldAppend) {
        const sample = {
          at: new Date(nowMs).toISOString(),
          selfUserId: accountId,
          resources: normalized,
        };
        samples.push(sample);
        accountSamples.push(sample);
      }
      if (shouldAppend || samples.length !== history.samples.length) {
        await saveEconomyHistory({ version: 2, samples });
      } else {
        economyHistoryCache = { version: 2, samples };
      }
      return buildEconomyTrends(accountSamples, normalized, nowMs);
    });
  economyHistoryOperation = operation.catch(() => undefined);
  return operation;
}

function isUsableEconomyInitResponse(response) {
  if (!response || response.ok !== true) {
    return false;
  }
  const data = response.data;
  if (!data || typeof data !== "object" || data.success !== true) {
    return false;
  }
  if (!data.currencies || typeof data.currencies !== "object" || Array.isArray(data.currencies)) {
    return false;
  }
  if (Object.keys(data.currencies).length === 0) {
    return false;
  }
  return [data.energy, data.maxEnergy, data.authority, data.level, data.biceps]
    .every((value) => asNumber(value, null) !== null);
}

function buildStaleEconomyStatus(cached, response) {
  if (!cached) {
    return null;
  }
  return {
    ...cached,
    stale: true,
    refreshStatus: asNumber(response && response.status, null),
  };
}

function buildPersistedEconomyStatus(history, selfUserId, response, nowMs = Date.now()) {
  const samples = getEconomyHistorySamples(history, selfUserId);
  const latest = [...samples].reverse().find((sample) => (
    sample
    && sample.resources
    && typeof sample.resources === "object"
    && Object.keys(sample.resources).length > 0
  ));
  if (!latest) {
    return null;
  }
  const resources = normalizeEconomyResourceValues(latest.resources);
  const currencies = Object.fromEntries(
    Object.entries(resources).filter(([key]) => (
      key !== "authority" && !key.startsWith("weapon_")
    )),
  );
  if (Object.keys(currencies).length === 0) {
    return null;
  }
  return {
    selfUserId,
    ok: false,
    energy: null,
    maxEnergy: null,
    lastEnergyRestoreTime: null,
    currencies,
    selectedCurrency1: null,
    selectedCurrency2: null,
    authority: asNumber(resources.authority, null),
    level: null,
    currentLevelXp: null,
    nextLevelXp: null,
    biceps: null,
    weapons: null,
    talents: null,
    trends: buildEconomyTrends(samples, resources, nowMs),
    updatedAt: latest.at || null,
    stale: true,
    staleSource: "history",
    refreshStatus: asNumber(response && response.status, null),
  };
}

function normalizeBossWeaponCounts(response) {
  if (!response || response.ok === false) {
    return null;
  }
  const data = response.data && typeof response.data === "object" ? response.data : response;
  const counts = {};
  for (const [weapon, field] of Object.entries(BOSS_WEAPON_COUNT_FIELDS)) {
    const value = Number(data && data[field]);
    if (!Number.isFinite(value)) {
      return null;
    }
    counts[weapon] = value;
  }
  return counts;
}

async function captureBossWeaponCounts(client) {
  try {
    const response = await client.bosses.weapons({ throttle: false, rateLimitRetries: 1 });
    const counts = normalizeBossWeaponCounts(response);
    return {
      counts,
      capturedAt: new Date().toISOString(),
      error: counts ? null : "weapon_counts_unavailable",
    };
  } catch (error) {
    return {
      counts: null,
      capturedAt: new Date().toISOString(),
      error: getErrorMessage(error),
    };
  }
}

function buildBossWeaponDelta(before, after) {
  const beforeCounts = before && before.counts ? before.counts : null;
  const afterCounts = after && after.counts ? after.counts : null;
  const delta = {};
  if (beforeCounts && afterCounts) {
    for (const weapon of Object.keys(BOSS_WEAPON_COUNT_FIELDS)) {
      delta[weapon] = Number(afterCounts[weapon] || 0) - Number(beforeCounts[weapon] || 0);
    }
  }
  return {
    measured: Boolean(beforeCounts && afterCounts),
    before: beforeCounts,
    after: afterCounts,
    delta,
    capturedAt: after && after.capturedAt ? after.capturedAt : null,
    error: [before && before.error, after && after.error].filter(Boolean).join("; ") || null,
  };
}

function unwrapGameResponse(response) {
  if (!response || response.ok === false) {
    return null;
  }
  const payload = response.data && typeof response.data === "object" ? response.data : response;
  if (!payload || typeof payload !== "object" || payload.success === false) {
    return null;
  }
  return payload.data && typeof payload.data === "object" ? payload.data : payload;
}

function normalizeDashboardExtraCurrencies(menyalaResponse, slotsResponse) {
  const currencies = {};
  const menyala = unwrapGameResponse(menyalaResponse) || {};
  const brigade = menyala.families && menyala.families.brigade
    ? menyala.families.brigade
    : {};
  const armbands = brigade.balances && brigade.balances.armband
    ? brigade.balances.armband
    : {};
  for (let index = 1; index <= 5; index += 1) {
    const key = `armband_${index}`;
    const source = armbands[key];
    const value = asNumber(
      source && typeof source === "object" ? source.balance : source,
      null,
    );
    if (value !== null) {
      currencies[key] = value;
    }
  }

  const zaruba = menyala.families && menyala.families.zaruba
    ? menyala.families.zaruba
    : {};
  for (const key of ["ore_signet", "signet"]) {
    const value = asNumber(zaruba.balances && zaruba.balances[key], null);
    if (value !== null) {
      currencies[key] = value;
    }
  }

  const slotsPayload = unwrapGameResponse(slotsResponse) || {};
  const slots = slotsPayload.state && typeof slotsPayload.state === "object"
    ? slotsPayload.state
    : slotsPayload;
  const slotAliases = {
    green_matches: ["slotsGrass", "greenMatches", "green_matches"],
    orange_matches: ["slotsOrenge", "slotsOrange", "orangeMatches", "orange_matches"],
    red_matches: ["slotsRed", "redMatches", "red_matches"],
  };
  for (const [key, aliases] of Object.entries(slotAliases)) {
    const alias = aliases.find((candidate) => Object.hasOwn(slots, candidate));
    const value = alias ? asNumber(slots[alias], null) : null;
    if (value !== null) {
      currencies[key] = value;
    }
  }
  return currencies;
}

function normalizeAchievementHeaderSummary(response) {
  const data = unwrapGameResponse(response);
  if (!data) {
    return null;
  }
  const unlockedReward = asNumber(data.unlockedReward, null);
  const totalReward = asNumber(data.totalReward, null);
  if (unlockedReward === null || totalReward === null) {
    return null;
  }
  return {
    unlockedReward,
    totalReward,
    percent: totalReward > 0 ? Math.round((unlockedReward / totalReward) * 1000) / 10 : 0,
  };
}

function normalizeStashGearHeaderSummary(response) {
  const data = unwrapGameResponse(response);
  if (!data || !data.slots || typeof data.slots !== "object") {
    return null;
  }
  return {
    coolnessTotal: asNumber(data.slots.coolnessTotal, 0),
  };
}

const VPI_TIER_LABELS = Object.freeze({
  pacansky: "Пацанский",
  blatnoy: "Блатной",
  avtoritetny: "Авторитетный",
  vorovskoy: "Воровской",
});

function normalizeVpiTierId(value) {
  const raw = value && typeof value === "object"
    ? value.id ?? value.tier ?? value.key
    : value;
  const normalized = String(raw || "").trim().toLowerCase();
  return normalized || null;
}

function normalizeVpiHeaderSummary(response, nowMs = Date.now()) {
  const data = unwrapGameResponse(response);
  if (!data) {
    return null;
  }

  const tierId = normalizeVpiTierId(data.tier);
  const offer = data.offer && typeof data.offer === "object" ? data.offer : {};
  const tiers = Array.isArray(offer.tiers) ? offer.tiers : [];
  const tierOffer = tiers.find((item) => normalizeVpiTierId(item) === tierId) || null;
  const active = data.active === true && Boolean(tierId);
  const fallbackNowUnix = Math.floor(nowMs / 1000);
  const nowUnix = asNumber(data.nowUnix ?? offer.nowUnix, fallbackNowUnix);
  const expiresAtUnix = asNumber(data.expiresAtUnix, null);
  const claimCountdownValue = data.claimAvailableInSec ?? data.ClaimAvailableInSec;
  const hasClaimCountdown = claimCountdownValue !== undefined && claimCountdownValue !== null;
  const claimAvailableInSec = Math.max(0, asNumber(claimCountdownValue, 0));
  const explicitlyClaimable = data.claimReady === true
    || data.ClaimReady === true
    || data.canClaim === true
    || data.CanClaim === true
    || data.rewardReady === true;
  const damageLeft = Math.max(0, asNumber(data.damageLeft, 0));
  const remainingSec = active && expiresAtUnix !== null
    ? Math.max(0, Math.floor(expiresAtUnix - nowUnix))
    : 0;

  return {
    active,
    tier: active ? {
      id: tierId,
      title: String(
        tierOffer && tierOffer.title
        || VPI_TIER_LABELS[tierId]
        || tierId,
      ),
      dailyDamage: Math.max(0, asNumber(tierOffer && tierOffer.dailyDamage, damageLeft)),
    } : null,
    expiresAtUnix: active ? expiresAtUnix : null,
    remainingSec,
    claimAvailableInSec: active ? claimAvailableInSec : 0,
    claimReady: active && (explicitlyClaimable || hasClaimCountdown && claimAvailableInSec <= 0),
    damageLeft: active ? damageLeft : 0,
    nextDailyPreview: active && data.nextDailyPreview && typeof data.nextDailyPreview === "object"
      ? data.nextDailyPreview
      : null,
    offerAvailable: offer.available === true,
  };
}

async function collectVpiRewardIfReady(client, options = {}) {
  const nowMs = Number.isFinite(Number(options.nowMs)) ? Number(options.nowMs) : Date.now();
  let stateResponse;
  try {
    stateResponse = Object.prototype.hasOwnProperty.call(options, "stateResponse")
      ? options.stateResponse
      : await client.vpi.state();
  } catch (error) {
    return {
      checked: false,
      attempted: false,
      claimed: false,
      reason: "state_request_failed",
      error: getErrorMessage(error),
      vpi: null,
    };
  }

  const before = normalizeVpiHeaderSummary(stateResponse, nowMs);
  if (!before) {
    return {
      checked: false,
      attempted: false,
      claimed: false,
      reason: "state_unavailable",
      error: getGameResponseMessage(stateResponse),
      vpi: null,
    };
  }
  if (!before.active) {
    return {
      checked: true,
      attempted: false,
      claimed: false,
      reason: "no_common_fund",
      error: null,
      vpi: before,
    };
  }
  if (!before.claimReady) {
    return {
      checked: true,
      attempted: false,
      claimed: false,
      reason: "not_ready",
      error: null,
      vpi: before,
    };
  }
  if (toBool(options.dryRun, false)) {
    return {
      checked: true,
      attempted: false,
      claimed: false,
      reason: "dry_run",
      error: null,
      vpi: before,
    };
  }

  let claimResponse;
  try {
    claimResponse = await client.vpi.claim({ rateLimitRetries: 1 });
  } catch (error) {
    return {
      checked: true,
      attempted: true,
      claimed: false,
      reason: "claim_request_failed",
      error: getErrorMessage(error),
      vpi: before,
    };
  }
  if (!isSuccessfulGameResponse(claimResponse)) {
    const status = asNumber(claimResponse && claimResponse.status, null);
    return {
      checked: true,
      attempted: true,
      claimed: false,
      reason: "claim_rejected",
      error: getGameResponseMessage(claimResponse) || (status ? `HTTP ${status}` : "неизвестная ошибка"),
      vpi: before,
    };
  }

  let after = null;
  try {
    after = normalizeVpiHeaderSummary(await client.vpi.state(), Date.now());
  } catch {
    after = null;
  }
  return {
    checked: true,
    attempted: true,
    claimed: true,
    reason: "claimed",
    error: null,
    vpi: after || before,
  };
}

async function runVpiAutoClaimTick(options = {}, sessionPath) {
  if (vpiAutoClaimRuntime.inFlight) {
    return vpiAutoClaimRuntime.inFlight;
  }

  const operation = withContext(sessionPath, async ({ client, selfUserId }) => {
    const result = await collectVpiRewardIfReady(client, options);
    if (result.claimed) {
      headerExtrasCache.delete(String(selfUserId || "default"));
      await logEvent("vpi.auto_claim.claimed", {
        selfUserId,
        tier: result.vpi && result.vpi.tier ? result.vpi.tier.id : null,
        reason: options.reason || "tick",
      });
    } else if (result.attempted) {
      await logEvent("vpi.auto_claim.failed", {
        selfUserId,
        reason: result.reason,
        error: result.error,
      });
    }
    return result;
  });
  vpiAutoClaimRuntime.inFlight = operation;
  try {
    return await operation;
  } finally {
    if (vpiAutoClaimRuntime.inFlight === operation) {
      vpiAutoClaimRuntime.inFlight = null;
    }
  }
}

function getVpiAutoClaimDelayMs(result) {
  const vpi = result && result.vpi;
  if (vpi && vpi.active === true) {
    const claimAvailableInSec = Number(vpi.claimAvailableInSec);
    if (
      vpi.claimReady !== true
      && Number.isFinite(claimAvailableInSec)
      && claimAvailableInSec > 0
    ) {
      return Math.min(
        VPI_AUTO_CLAIM_MAX_DELAY_MS,
        Math.ceil(claimAvailableInSec * 1000) + VPI_AUTO_CLAIM_GRACE_MS,
      );
    }
    if (vpi.claimReady !== true) {
      return VPI_AUTO_CLAIM_IDLE_RECHECK_MS;
    }
  }
  if (result && result.reason === "no_common_fund") {
    return VPI_AUTO_CLAIM_IDLE_RECHECK_MS;
  }
  return VPI_AUTO_CLAIM_RETRY_MS;
}

function scheduleVpiAutoClaim(delayMs, reason, sessionPath = vpiAutoClaimRuntime.sessionPath) {
  const normalizedDelayMs = Math.min(
    VPI_AUTO_CLAIM_MAX_DELAY_MS,
    Math.max(0, Math.ceil(Number(delayMs) || 0)),
  );
  if (vpiAutoClaimRuntime.timerId) {
    clearTimeout(vpiAutoClaimRuntime.timerId);
  }
  vpiAutoClaimRuntime.generation += 1;
  const generation = vpiAutoClaimRuntime.generation;
  vpiAutoClaimRuntime.sessionPath = sessionPath;
  vpiAutoClaimRuntime.nextCheckAt = new Date(Date.now() + normalizedDelayMs).toISOString();
  vpiAutoClaimRuntime.timerId = setTimeout(() => {
    const executeScheduledTick = async () => {
      if (generation !== vpiAutoClaimRuntime.generation) {
        return;
      }
      vpiAutoClaimRuntime.timerId = null;
      vpiAutoClaimRuntime.nextCheckAt = null;

      const activeOperation = vpiAutoClaimRuntime.inFlight;
      if (activeOperation) {
        try {
          await activeOperation;
        } catch {
          // The scheduled check below will retry with the current session.
        }
      }
      if (generation !== vpiAutoClaimRuntime.generation) {
        return;
      }

      let result = null;
      try {
        result = await runVpiAutoClaimTick({ reason }, sessionPath);
      } catch (error) {
        await logEvent("vpi.auto_claim.error", {
          reason,
          error: getErrorMessage(error),
        });
      }
      if (generation === vpiAutoClaimRuntime.generation) {
        scheduleVpiAutoClaim(
          getVpiAutoClaimDelayMs(result),
          result && result.vpi && result.vpi.active ? "countdown" : "retry",
          sessionPath,
        );
      }
    };
    void executeScheduledTick();
  }, normalizedDelayMs);
  vpiAutoClaimRuntime.timerId.unref?.();
  return vpiAutoClaimRuntime.nextCheckAt;
}

function initializeDailyToiletPaperAutomation(sessionPath) {
  dailyToiletPaperCollector.initialize(sessionPath);
}

async function initializeVpiAutomation(sessionPath) {
  vpiAutoClaimRuntime.initialized = true;
  vpiAutoClaimRuntime.sessionPath = sessionPath;
  if (!vpiAutoClaimRuntime.timerId && !vpiAutoClaimRuntime.inFlight) {
    scheduleVpiAutoClaim(0, "initialize", sessionPath);
  }
  return {
    enabled: true,
    nextCheckAt: vpiAutoClaimRuntime.nextCheckAt,
  };
}

function normalizeVpiDamageLeft(response) {
  const status = asNumber(response && response.status, null);
  if (
    !response
    || response.ok === false
    || status !== null && status >= 400
  ) {
    return null;
  }
  const data = unwrapGameResponse(response);
  if (!data) {
    return null;
  }
  const message = String(data.message ?? data.Message ?? "").trim().toLowerCase() || null;
  const active = data.active !== false && message !== "no_vpi";
  return {
    active,
    message,
    damageLeft: active
      ? Math.max(0, asNumber(data.damageLeft ?? data.DamageLeft, 0))
      : 0,
  };
}

function normalizeDamageHeaderSummary(report) {
  const summary = report && report.summary;
  const metric = report && report.period === "weekly" ? "damage" : "deltaDamage";
  if (!report || report.available === false || !summary) {
    return {
      period: report && report.period ? report.period : null,
      available: false,
      self: null,
      all: null,
      friends: null,
      guild: null,
      complete: false,
      generatedAt: report && report.generatedAt ? report.generatedAt : null,
    };
  }
  const normalizeScope = (source, valueKey, includeRank = false) => {
    const damage = asNumber(source && source[valueKey], null);
    if (damage === null) {
      return null;
    }
    return {
      damage,
      players: asNumber(source && source.players, null),
      ...(includeRank ? { rank: asNumber(source && source.rank, null) } : {}),
    };
  };
  return {
    period: report.period,
    available: true,
    self: normalizeScope(summary.self, metric, true),
    all: normalizeScope(summary.all, "totalDamage"),
    friends: normalizeScope(summary.friends, "totalDamage"),
    guild: normalizeScope(summary.guild, "totalDamage"),
    complete: report.complete === true,
    generatedAt: report.generatedAt || null,
  };
}

async function executeBossRunnerLoopWithWeaponDelta(client, plan, options) {
  const operationStartedAtMs = Date.now();
  const before = await captureBossWeaponCounts(client);
  const result = await executeBossRunnerLoop(client, plan, options);
  const after = await captureBossWeaponCounts(client);
  result.weaponDelta = buildBossWeaponDelta(before, after);
  result.comboEconomy = buildBossComboEconomy(result);
  result.timing = {
    ...(result.timing && typeof result.timing === "object" ? result.timing : {}),
    operationElapsedMs: normalizeElapsedMs(Date.now() - operationStartedAtMs),
  };
  return result;
}

async function getEconomyStatus(sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const [response, talentResponse, menyalaResponse, slotsResponse] = await Promise.all([
      client.players.init().catch((error) => ({
        ok: false,
        status: null,
        error: getErrorMessage(error),
      })),
      client.talents.status().catch(() => null),
      client.get("/api/menyala/state").catch(() => null),
      client.get("/api/slots-game/info").catch(() => null),
    ]);
    const cacheKey = String(selfUserId);
    if (!isUsableEconomyInitResponse(response)) {
      const stale = buildStaleEconomyStatus(economyStatusCache.get(cacheKey), response);
      if (stale) {
        return stale;
      }
      const persisted = buildPersistedEconomyStatus(
        await loadEconomyHistory(),
        selfUserId,
        response,
      );
      if (persisted) {
        economyStatusCache.set(cacheKey, persisted);
        return persisted;
      }
      const status = asNumber(response && response.status, null);
      throw new Error(`Player economy is temporarily unavailable${status ? ` (${status})` : ""}.`);
    }

    const data = response.data;
    const currencies = {
      ...(data.currencies || {}),
      ...normalizeDashboardExtraCurrencies(menyalaResponse, slotsResponse),
    };
    const trends = await recordEconomySnapshot(
      normalizeEconomyResourceSnapshot({
        ...data,
        currencies,
      }),
      selfUserId,
    );
    const payload = {
      selfUserId,
      ok: response.ok,
      energy: asNumber(data.energy, null),
      maxEnergy: asNumber(data.maxEnergy, null),
      lastEnergyRestoreTime: data.lastEnergyRestoreTime ?? null,
      currencies,
      selectedCurrency1: data.selectedCurrency1 ?? null,
      selectedCurrency2: data.selectedCurrency2 ?? null,
      authority: asNumber(data.authority, null),
      level: asNumber(data.level, null),
      currentLevelXp: asNumber(data.currentLevelXp, null),
      nextLevelXp: asNumber(data.nextLevelXp, null),
      biceps: asNumber(data.biceps, null),
      weapons: normalizeHeaderWeaponStats(data),
      talents: normalizeHeaderTalentStatus(talentResponse)
        || economyStatusCache.get(cacheKey)?.talents
        || null,
      trends,
      updatedAt: new Date().toISOString(),
      stale: false,
      refreshStatus: null,
    };
    economyStatusCache.set(cacheKey, payload);
    return payload;
  });
}

async function getHeaderExtras(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const cacheKey = String(selfUserId || "default");
    let cache = headerExtrasCache.get(cacheKey);
    if (!cache) {
      cache = { values: {}, pending: {} };
      headerExtrasCache.set(cacheKey, cache);
    }
    const loaders = {
      damage: async () => {
        const periods = ["hourly", "daily", "weekly"];
        const results = await Promise.allSettled(periods.map((period) => (
          createDamageReport(client, { period, useLive: false, selfUserId, top: 25 })
        )));
        const previous = cache.values.damage?.value || {};
        const value = {};
        let stale = false;
        results.forEach((result, index) => {
          const period = periods[index];
          value[period] = result.status === "fulfilled"
            ? normalizeDamageHeaderSummary(result.value)
            : previous[period] || null;
          stale ||= result.status !== "fulfilled";
        });
        return { value, stale };
      },
      achievements: async () => ({ value: normalizeAchievementHeaderSummary(
        await client.get("/api/achievement/load", { query: { type: HEADER_ACHIEVEMENT_TYPE } }),
      ) }),
      stashGear: async () => ({ value: normalizeStashGearHeaderSummary(
        await client.get("/api/stashgear/inventory"),
      ) }),
      vpi: async () => ({ value: normalizeVpiHeaderSummary(await client.vpi.state(), Date.now()) }),
    };
    const sections = options.section ? [String(options.section)] : Object.keys(loaders);
    if (sections.some((section) => !Object.hasOwn(loaders, section))) {
      throw new Error("Unknown header statistics section.");
    }
    const loadSection = async (section) => {
      const cached = cache.values[section];
      // Failed refreshes must be retried on the next poll, not cached for five minutes.
      if (!toBool(options.force, false) && cached && !cached.stale
        && Date.now() - Date.parse(cached.updatedAt) < HEADER_EXTRAS_CACHE_TTL_MS) {
        return cached;
      }
      if (cache.pending[section]) return cache.pending[section];
      const request = (async () => {
        let result;
        try {
          result = await loaders[section]();
        } catch {
          result = { value: null, stale: true };
        }
        const stale = result.stale === true || result.value == null;
        const entry = {
          value: result.value ?? cached?.value ?? null,
          updatedAt: new Date().toISOString(),
          stale,
        };
        cache.values[section] = entry;
        return entry;
      })();
      cache.pending[section] = request;
      try {
        return await request;
      } finally {
        delete cache.pending[section];
      }
    };
    const entries = await Promise.all(sections.map(loadSection));
    return {
      selfUserId,
      ...Object.fromEntries(sections.map((section, index) => [section, entries[index].value])),
      updatedAt: entries.map((entry) => entry.updatedAt).sort()[0],
      stale: entries.some((entry) => entry.stale),
    };
  });
}

async function loadFreshPrisonEnergyCosts(sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const prisonsResponse = await client.prisons.all();
    const prisonsPayload = prisonsResponse && prisonsResponse.data ? prisonsResponse.data : {};
    const prisonList = Array.isArray(prisonsPayload.prisons) ? prisonsPayload.prisons : [];

    const entries = await Promise.all(prisonList.map(async (prison) => {
      const prisonId = prison.id;
      const detail = await loadPrisonDetail(client, prisonId);

      return {
        prisonId,
        prisonName: prison.name,
        day: {
          ...summarizeCheckpointCosts(detail.view.checkpoints.day),
          run: detail.view.day,
        },
        night: {
          ...summarizeCheckpointCosts(detail.view.checkpoints.night),
          run: detail.view.night,
        },
      };
    }));

    return {
      selfUserId,
      generatedAt: new Date().toISOString(),
      prisons: entries,
    };
  });
}

function getSessionUserId(session) {
  const user = session
    && session.telegram
    && session.telegram.initDataUnsafe
    && session.telegram.initDataUnsafe.user;
  return user && user.id !== undefined && user.id !== null ? String(user.id) : null;
}

async function readPrisonEnergyCostsCache(sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const memory = prisonEnergyCostsCache;
  if (
    memory
    && memory.sessionPath === resolvedSessionPath
    && Date.now() - memory.loadedAt < PRISON_ENERGY_COSTS_CACHE_TTL_MS
  ) {
    return memory.payload;
  }

  try {
    const [body, session] = await Promise.all([
      fs.readFile(PRISON_ENERGY_COSTS_LATEST_PATH, "utf8"),
      loadSessionSnapshot(resolvedSessionPath),
    ]);
    const payload = JSON.parse(body);
    const generatedAt = Date.parse(payload && payload.generatedAt ? payload.generatedAt : "");
    const currentUserId = getSessionUserId(session);
    if (
      !payload
      || !Array.isArray(payload.prisons)
      || !Number.isFinite(generatedAt)
      || Date.now() - generatedAt >= PRISON_ENERGY_COSTS_CACHE_TTL_MS
      || (currentUserId && payload.selfUserId && String(payload.selfUserId) !== currentUserId)
    ) {
      return null;
    }

    prisonEnergyCostsCache = {
      sessionPath: resolvedSessionPath,
      loadedAt: generatedAt,
      payload,
    };
    return payload;
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      logEvent("prison.energy_costs.cache_read_error", { error });
    }
    return null;
  }
}

async function getPrisonEnergyCosts(options = {}, sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const forceRefresh = toBool(options.refresh ?? options.forceRefresh, false);
  if (!forceRefresh) {
    const cached = await readPrisonEnergyCostsCache(resolvedSessionPath);
    if (cached) {
      return cached;
    }
  }

  if (
    !forceRefresh
    && prisonEnergyCostsInflight
    && prisonEnergyCostsInflight.sessionPath === resolvedSessionPath
  ) {
    return prisonEnergyCostsInflight.promise;
  }

  const promise = loadFreshPrisonEnergyCosts(resolvedSessionPath);
  prisonEnergyCostsInflight = { sessionPath: resolvedSessionPath, promise };
  try {
    const payload = await promise;
    prisonEnergyCostsCache = {
      sessionPath: resolvedSessionPath,
      loadedAt: Date.parse(payload.generatedAt) || Date.now(),
      payload,
    };
    await fs.mkdir(path.dirname(PRISON_ENERGY_COSTS_LATEST_PATH), { recursive: true });
    await fs.writeFile(
      PRISON_ENERGY_COSTS_LATEST_PATH,
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8",
    );
    return payload;
  } finally {
    if (prisonEnergyCostsInflight && prisonEnergyCostsInflight.promise === promise) {
      prisonEnergyCostsInflight = null;
    }
  }
}

function doesBossRewardModeMatch(text, modeKey) {
  const value = normalizeSearchText(text);
  const key = String(modeKey || "").toLowerCase();
  if (key === "pacansky") {
    return value.includes("пацанск");
  }
  if (key === "blotnoy") {
    return value.includes("блатн");
  }
  if (key === "avtoritetny") {
    return value.includes("авторитетн");
  }
  if (key === "odin") {
    return value.includes("одиноч") || value.includes("соло");
  }
  return false;
}

function dedupeBossRewardItems(items) {
  const unique = new Map();
  for (const item of items || []) {
    if (!item || !item.type || !item.id) {
      continue;
    }
    unique.set(`${item.type}:${item.id}`, item);
  }
  return [...unique.values()];
}

function createBossRewardItemCatalog(items) {
  return new Map(
    (items || [])
      .filter((item) => item && item.type && item.id)
      .map((item) => [`${item.type}:${Number(item.id)}`, item]),
  );
}

function enrichBossRewardItems(items, sourceRewardItemCatalog) {
  const catalog = sourceRewardItemCatalog instanceof Map
    ? sourceRewardItemCatalog
    : createBossRewardItemCatalog(sourceRewardItemCatalog);

  return dedupeBossRewardItems(items).map((item) => {
    const source = catalog.get(`${item.type}:${Number(item.id)}`) || {};
    const sourceBonuses = source.combatStatsBonus && typeof source.combatStatsBonus === "object"
      ? source.combatStatsBonus
      : source.combat_stats_bonus && typeof source.combat_stats_bonus === "object"
        ? source.combat_stats_bonus
        : {};
    const itemBonuses = item.combatStatsBonus && typeof item.combatStatsBonus === "object"
      ? item.combatStatsBonus
      : item.combat_stats_bonus && typeof item.combat_stats_bonus === "object"
        ? item.combat_stats_bonus
        : {};

    return {
      ...item,
      previewUrl: item.previewUrl || source.imageUrl || source.cardPreviewUrl || null,
      name: item.name || source.name || null,
      setName: item.setName || source.setName || null,
      combatStatsBonus: Object.fromEntries(
        Object.entries({ ...sourceBonuses, ...itemBonuses })
          .map(([key, value]) => [String(key), Number(value) || 0])
          .filter(([, value]) => value !== 0),
      ),
    };
  });
}

function inferBossRewardItems(items, boss, modeKey, options = {}) {
  const bossTitle = normalizeSearchText(boss && boss.title);
  const wantCombo = Boolean(options.combo);
  if (!bossTitle) {
    return [];
  }
  return (items || []).filter((item) => {
    const sourceText = options.searchTextByItem && options.searchTextByItem.has(item)
      ? options.searchTextByItem.get(item)
      : normalizeSearchText(`${item.description || ""} ${item.sourceDescription || ""}`);
    if (!sourceText.includes(bossTitle)) {
      return false;
    }
    const isCombo = sourceText.includes("комбо");
    if (isCombo !== wantCombo) {
      return false;
    }
    if (!wantCombo && !sourceText.includes("убийств") && !sourceText.includes("побед")) {
      return false;
    }
    return doesBossRewardModeMatch(sourceText, modeKey);
  }).map((item) => ({
    type: item.type,
    id: Number(item.id),
    tattooId: item.type === "tattoo" ? Number(item.id) : null,
    clothingId: item.type === "clothing" ? Number(item.id) : null,
    cameraId: item.type === "camera" ? Number(item.id) : null,
    previewUrl: item.imageUrl || null,
    name: item.name || null,
    setName: item.setName || null,
    combatStatsBonus: item.combatStatsBonus || {},
  }));
}

async function loadBossComboRewards() {
  const now = Date.now();
  if (bossComboRewardsCache.data && now - bossComboRewardsCache.loadedAt < 60 * 60_000) {
    if (VERBOSE_LOGGING) {
      logEvent("game.catalog.combo_rewards.cache_hit", {
        ageMs: now - bossComboRewardsCache.loadedAt,
      });
    }
    return bossComboRewardsCache.data;
  }
  const requestStartedAt = Date.now();
  const comboRewardsUrl = new URL(BOSS_COMBO_REWARDS_URL);
  if (VERBOSE_LOGGING) {
    logEvent("game.catalog.combo_rewards.request", {
      origin: comboRewardsUrl.origin,
      endpoint: comboRewardsUrl.pathname,
    });
  }
  try {
    const response = await fetch(BOSS_COMBO_REWARDS_URL, { cache: "no-store" });
    const elapsedMs = Date.now() - requestStartedAt;
    if (!response.ok) {
      logEvent("game.catalog.combo_rewards.response", {
        endpoint: comboRewardsUrl.pathname,
        status: response.status,
        ok: false,
        elapsedMs,
      });
      throw new Error(`Combo rewards HTTP ${response.status}`);
    }
    const data = await response.json();
    if (VERBOSE_LOGGING || elapsedMs >= 1_000) {
      logEvent("game.catalog.combo_rewards.response", {
        endpoint: comboRewardsUrl.pathname,
        status: response.status,
        ok: true,
        elapsedMs,
        data: VERBOSE_LOGGING ? data : undefined,
      });
    }
    bossComboRewardsCache = { loadedAt: now, data };
    return data;
  } catch (error) {
    logEvent("game.catalog.combo_rewards.error", {
      endpoint: comboRewardsUrl.pathname,
      elapsedMs: Date.now() - requestStartedAt,
      fallbackToCache: Boolean(bossComboRewardsCache.data),
      error,
    });
    if (bossComboRewardsCache.data) {
      return bossComboRewardsCache.data;
    }
    return { boss: {} };
  }
}

function normalizeExternalComboItems(combo) {
  const source = combo && combo.items ? combo.items : {};
  const entries = [
    ["tattoo", source.tattoos],
    ["clothing", source.clothing],
    ["camera", source.cameras],
  ];
  return entries.flatMap(([type, items]) => (Array.isArray(items) ? items : []).map((item) => ({
    type,
    id: Number(item && item.id),
    tattooId: type === "tattoo" ? Number(item && item.id) : null,
    clothingId: type === "clothing" ? Number(item && item.id) : null,
    cameraId: type === "camera" ? Number(item && item.id) : null,
    previewUrl: item && item.previewUrl ? item.previewUrl : null,
  })));
}

function normalizeBossBuffEffect(effect) {
  if (!effect || typeof effect !== "object") {
    return null;
  }
  const stat = String(effect.stat || "").trim();
  const value = Number(effect.value);
  if (!stat || !Number.isFinite(value)) {
    return null;
  }
  return { stat, value };
}

function normalizeBossBuff(buff) {
  if (!buff || typeof buff !== "object") {
    return null;
  }
  const rawEffects = Array.isArray(buff.effects)
    ? buff.effects
    : Array.isArray(buff.buffs)
      ? buff.buffs
      : [];
  const effects = rawEffects
    ? rawEffects.map(normalizeBossBuffEffect).filter(Boolean)
    : [];
  return {
    id: String(buff.id || "").trim(),
    title: buff.titleRu || buff.title || null,
    description: buff.descriptionRu || buff.description || null,
    type: buff.type || null,
    category: buff.category || null,
    icon: buff.icon || null,
    durationHits: Number.isFinite(Number(buff.durationHits)) ? Number(buff.durationHits) : null,
    cooldownSeconds: Number.isFinite(Number(buff.cooldownSeconds)) ? Number(buff.cooldownSeconds) : null,
    isPurchasable: Boolean(buff.isPurchasable),
    priceTp: Number.isFinite(Number(buff.priceTp)) ? Number(buff.priceTp) : null,
    effects,
  };
}

async function getBossBuffs(sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const response = await client.get("/api/boss-buffs");
    const payload = getGamePayload(response) || {};
    const catalog = payload && payload.data && typeof payload.data === "object"
      ? payload.data
      : payload;
    const buffs = Array.isArray(catalog.buffs)
      ? catalog.buffs.map(normalizeBossBuff).filter((buff) => buff && buff.id)
      : [];
    return {
      generatedAt: new Date().toISOString(),
      buffs,
    };
  });
}

function buildBossRewardComboModes(boss, externalComboModes = {}, sourceRewardItems = [], options = {}) {
  const activeCombos = boss && boss.combos && typeof boss.combos === "object"
    ? boss.combos
    : {};

  return Object.keys(activeCombos).map((key) => {
    const combo = activeCombos[key];
    const externalCombo = externalComboModes && externalComboModes[key]
      ? externalComboModes[key]
      : null;
    const itemCatalog = combo && combo.itemCatalog ? combo.itemCatalog : {};
    const explicit = [
      ...(itemCatalog.tattoos || []),
      ...(itemCatalog.clothing || []),
      ...(itemCatalog.cameras || []),
      ...normalizeExternalComboItems(externalCombo),
    ];
    const items = dedupeBossRewardItems([
      ...explicit,
      ...inferBossRewardItems(sourceRewardItems, boss, key, {
        combo: true,
        searchTextByItem: options.searchTextByItem,
      }),
    ]);

    return {
      key,
      length: combo && combo.length !== undefined
        ? combo.length
        : externalCombo && externalCombo.length !== undefined
          ? externalCombo.length
          : null,
      items,
    };
  });
}

async function getBossDashboard(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const fast = toBool(options.fast, false);
    const catalog = await buildBossCatalog(client, { fast });
    const bossIds = (catalog.bosses || []).map((boss) => Number(boss.id)).filter(Boolean);
    const [wearableInventory, wearableCatalog, cameraCatalogResponse, comboRewardsCatalog, avatarSync] = fast
      ? [{ ownedClothing: [], ownedTattoos: [] }, { items: [] }, null, null, null]
      : await Promise.all([
          loadWearableInventory(client, { accountKey: selfUserId }),
          loadWearableCatalog(client, {
            allowStale: true,
            bossIds,
          }),
          client.get("/api/camera/all"),
          loadBossComboRewards(),
          Promise.resolve({
            generatedIds: [],
            skippedIds: bossIds,
            failures: [],
          }),
        ]);
    if (avatarSync && (avatarSync.generatedIds.length > 0 || avatarSync.failures.length > 0)) {
      logEvent("boss.avatar_sync", avatarSync);
    }
    const cameraCatalogPayload = getGamePayload(cameraCatalogResponse) || {};
    const sourceRewardItems = [
      ...(wearableCatalog.items || []),
      ...(Array.isArray(cameraCatalogPayload.cameras) ? cameraCatalogPayload.cameras : []).map((item) => ({
        type: "camera",
        id: Number(item.id),
        name: item.name || null,
        setName: item.name || null,
        description: item.name || "",
        sourceDescription: "",
        imageUrl: item.imageUrl || null,
      })),
    ];
    const rewardSearchTextByItem = new Map(sourceRewardItems.map((item) => [
      item,
      normalizeSearchText(`${item.description || ""} ${item.sourceDescription || ""}`),
    ]));
    const sourceRewardItemCatalog = createBossRewardItemCatalog(sourceRewardItems);
    const rawRewardBosses = catalog.bosses.map((boss) => {
      const battleModes = (boss.modes || []).map((mode) => {
        const explicit = mode.rewards && Array.isArray(mode.rewards.items) ? mode.rewards.items : [];
        const items = enrichBossRewardItems([
          ...explicit,
          ...inferBossRewardItems(sourceRewardItems, boss, mode.key, {
            combo: false,
            searchTextByItem: rewardSearchTextByItem,
          }),
        ], sourceRewardItemCatalog);
        return { key: mode.key, items };
      });
      const externalComboModes = comboRewardsCatalog
        && comboRewardsCatalog.boss
        && comboRewardsCatalog.boss[String(boss.id)]
        && comboRewardsCatalog.boss[String(boss.id)].comboModes
        ? comboRewardsCatalog.boss[String(boss.id)].comboModes
        : {};
      const comboModes = buildBossRewardComboModes(boss, externalComboModes, sourceRewardItems, {
        searchTextByItem: rewardSearchTextByItem,
      })
        .map((mode) => ({
          ...mode,
          items: enrichBossRewardItems(mode.items, sourceRewardItemCatalog),
        }));
      return { boss, battleModes, comboModes };
    });
    const rewardItems = rawRewardBosses.flatMap((item) => [
      ...item.battleModes.flatMap((mode) => mode.items),
      ...item.comboModes.flatMap((mode) => mode.items),
    ]);
    const cameraIds = [...new Set(
      rewardItems.filter((item) => item.type === "camera").map((item) => Number(item.id)),
    )];
    const cameraInventoryResponse = !fast && cameraIds.length > 0
      ? await client.post("/api/player/has-items-multi", { json: { camera: cameraIds } })
      : { ok: true, data: { success: true, result: { camera: {} } } };
    const cameraInventoryPayload = getGamePayload(cameraInventoryResponse) || {};
    const cameraInventory = cameraInventoryPayload.result && cameraInventoryPayload.result.camera
      ? cameraInventoryPayload.result.camera
      : {};
    const ownedByType = {
      tattoo: new Set((wearableInventory.ownedTattoos || []).map((value) => Number(value))),
      clothing: new Set((wearableInventory.ownedClothing || []).map((value) => Number(value))),
      camera: new Set(
        Object.entries(cameraInventory)
          .filter(([, value]) => Boolean(value))
          .map(([id]) => Number(id)),
      ),
    };
    const markRewardItems = (items) => (items || []).map((item) => ({
      ...item,
      owned: Boolean(ownedByType[item.type] && ownedByType[item.type].has(Number(item.id))),
    }));
    const rewardBosses = rawRewardBosses.map(({ boss, battleModes: rawBattleModes, comboModes: rawComboModes }) => {
      const battleModes = rawBattleModes.map((mode) => {
        const items = markRewardItems(mode.items);
        return {
          key: mode.key,
          items,
          collected: items.filter((item) => item.owned).length,
          total: items.length,
          missing: items.filter((item) => !item.owned),
        };
      });
      const comboModes = rawComboModes.map((mode) => {
        const items = markRewardItems(mode.items);
        return {
          key: mode.key,
          length: mode.length,
          items,
          collected: items.filter((item) => item.owned).length,
          total: items.length,
          missing: items.filter((item) => !item.owned),
        };
      });
      const all = [...battleModes.flatMap((mode) => mode.items), ...comboModes.flatMap((mode) => mode.items)];
      return {
        id: boss.id,
        title: boss.title,
        categoryId: boss.categoryId,
        collected: all.filter((item) => item.owned).length,
        total: all.length,
        missing: all.filter((item) => !item.owned).length,
        imageUrl: all.find((item) => item.previewUrl)?.previewUrl || null,
        battleModes,
        comboModes,
      };
    });
    const uniqueRewards = new Map();
    for (const item of rewardItems) {
      uniqueRewards.set(`${item.type}:${item.id}`, {
        ...item,
        owned: Boolean(ownedByType[item.type] && ownedByType[item.type].has(Number(item.id))),
      });
    }
    const bossRewards = {
      collected: [...uniqueRewards.values()].filter((item) => item.owned).length,
      total: uniqueRewards.size,
      missing: [...uniqueRewards.values()].filter((item) => !item.owned).length,
      bosses: rewardBosses,
    };
    const keyPriceCache = await loadBossKeyPriceCache();
    const keyPriceView = buildBossKeyPriceView(catalog, keyPriceCache);
    const keyPriceMap = new Map(
      keyPriceView.sources.map((source) => [Number(source.sourceBossId), source]),
    );
    const queue = buildBossQueueView(catalog, {
      categoryId: options.categoryId ? Number(options.categoryId) : null,
      openOnly: toBool(options.openOnly, false),
      mode: options.mode || null,
      preferredModes: options.preferredModes || null,
      bossIds: options.bossIds || null,
    });
    const queueWithPrices = {
      ...queue,
      bosses: Array.isArray(queue.bosses)
        ? queue.bosses.map((boss) => ({
            ...boss,
            observedKeyPriceRubles: getObservedKeyPrice(keyPriceCache, boss.keySourceBossId),
            keyPriceRubles: keyPriceMap.has(Number(boss.keySourceBossId))
              ? keyPriceMap.get(Number(boss.keySourceBossId)).priceRubles
              : DEFAULT_KEY_PRICE_RUBLES,
            keyPriceSource: keyPriceMap.has(Number(boss.keySourceBossId))
              ? keyPriceMap.get(Number(boss.keySourceBossId)).priceSource
              : "default",
            keyPriceCurrency: keyPriceMap.has(Number(boss.keySourceBossId))
              ? keyPriceMap.get(Number(boss.keySourceBossId)).currency
              : "rubles",
            keyPriceCurrencySource: keyPriceMap.has(Number(boss.keySourceBossId))
              ? keyPriceMap.get(Number(boss.keySourceBossId)).currencySource
              : "inferred",
          }))
        : [],
    };

    const activeSession = buildActiveSessionView(catalog);
    const meleeCooldowns = activeSession && activeSession.sessionActive
      ? buildBossMeleeCooldowns({
          session: catalog.account ? catalog.account.activeSession : null,
          weaponStatsEffective: catalog.account ? catalog.account.weaponStatsEffective : null,
        })
      : {};
    const activeSessionWithCooldowns = activeSession
      ? {
          ...activeSession,
          meleeCooldowns,
          session: activeSession.session
            ? {
                ...activeSession.session,
                meleeCooldowns,
              }
            : activeSession.session,
        }
      : activeSession;
    const automation = await reconcileBossAutomationQueueComboAvailability(catalog);

    return {
      selfUserId,
      fast,
      activeSession: activeSessionWithCooldowns,
      limits: buildBossLimitsView(catalog),
      actions: buildBossActionCatalog(catalog.account && catalog.account.weaponStatsEffective),
      automation: buildBossAutomationView(automation),
      queue: queueWithPrices,
      keyPrices: keyPriceView,
      categories: catalog.categories,
      arrivals: catalog.arrivals,
      rewards: bossRewards,
      catalogSource: catalog.account ? catalog.account.catalogSource : null,
      avatarSync,
    };
  });
}

async function buyBossKey(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const bossId = asPositiveInt(options.bossId, null);
    if (!bossId) {
      throw new Error("bossId is required.");
    }
    if (!canBuyKeysForBoss(bossId)) {
      throw new Error(`Buying keys is not supported for boss ${bossId}.`);
    }

    const count = asPositiveInt(options.count, 1) ?? 1;
    const delayMs = asNonNegativeInt(options.delayMs, 200) ?? 200;
    let keyPriceCache = await loadBossKeyPriceCache();
    const attempts = [];
    let cacheChanged = false;

    for (let attemptIndex = 0; attemptIndex < count; attemptIndex += 1) {
      const attempt = await tryBuyBossKeys(client, bossId);
      attempts.push({
        attemptIndex,
        ...attempt,
      });

      const sourceBossId = pickNumeric(attempt.keyBossId, null);
      const added = Number(attempt.added);
      const spent = Number(attempt.spent);

      if (
        sourceBossId !== null
        && Number.isFinite(added) && added > 0
        && Number.isFinite(spent) && spent >= 0
      ) {
        keyPriceCache = addBossKeyPriceObservation(
          keyPriceCache,
          sourceBossId,
          added,
          spent,
          attempt.currency,
        );
        cacheChanged = true;
      }

      if (!attempt.ok) {
        break;
      }

      if (!(Number.isFinite(added) && added > 0)) {
        break;
      }

      if (attemptIndex < count - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    if (cacheChanged) {
      keyPriceCache = await saveBossKeyPriceCache(keyPriceCache);
    }

    const purchasedKeys = attempts.reduce(
      (sum, attempt) => sum + Math.max(0, Number(attempt.added || 0)),
      0,
    );
    const spentByCurrency = {};

    for (const attempt of attempts) {
      const currency = normalizeCurrencyCode(attempt.currency) || "rubles";
      const spent = Number(attempt.spent);
      if (!Number.isFinite(spent) || spent <= 0) {
        continue;
      }
      spentByCurrency[currency] = (spentByCurrency[currency] || 0) + spent;
    }

    return {
      selfUserId,
      bossId,
      requestedCount: count,
      performedAttempts: attempts.length,
      purchasedKeys,
      spentByCurrency,
      cacheUpdated: cacheChanged,
      attempts,
    };
  });
}

async function probeBossKeyPrices(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const dryRun = toBool(options.dryRun, true);
    const force = toBool(options.force, false);
    const onlyMissing = toBool(options.onlyMissing, true);
    const includePrisonSources = toBool(options.includePrisonSources, false);
    const delayMs = asNonNegativeInt(options.delayMs, DEFAULT_KEY_PRICE_PROBE_DELAY_MS)
      ?? DEFAULT_KEY_PRICE_PROBE_DELAY_MS;

    const catalog = await buildBossCatalog(client);
    let keyPriceCache = await loadBossKeyPriceCache();
    const targets = buildBossKeyPriceProbeTargets(catalog, {
      sourceBossIds: options.sourceBossIds ?? options.sourceBossId ?? null,
      includePrisonSources,
    });
    const results = [];
    let cacheChanged = false;

    for (const target of targets) {
      const observedBefore = getObservedKeyPrice(keyPriceCache, target.sourceBossId);

      if (!force && onlyMissing && observedBefore !== null && observedBefore > 0) {
        results.push({
          ...target,
          skipped: true,
          reason: "already_observed",
          observedBefore,
          observedAfter: observedBefore,
        });
        continue;
      }

      if (dryRun) {
        results.push({
          ...target,
          skipped: false,
          dryRun: true,
          observedBefore,
          observedAfter: observedBefore,
        });
        continue;
      }

      const attempt = await tryBuyBossKeys(client, target.targetBossId);
      const sourceBossId = pickNumeric(attempt.keyBossId, target.sourceBossId, null);
      const added = Number(attempt.added);
      const spent = Number(attempt.spent);
      let observedAfter = observedBefore;
      let updated = false;

      if (
        sourceBossId !== null
        && Number.isFinite(added) && added > 0
        && Number.isFinite(spent) && spent >= 0
      ) {
        keyPriceCache = addBossKeyPriceObservation(
          keyPriceCache,
          sourceBossId,
          added,
          spent,
          attempt.currency,
        );
        observedAfter = getObservedKeyPrice(keyPriceCache, sourceBossId);
        updated = true;
        cacheChanged = true;
      }

      results.push({
        ...target,
        skipped: false,
        observedBefore,
        observedAfter,
        updated,
        attempt: {
          ok: attempt.ok,
          added: attempt.added,
          spent: attempt.spent,
          pricePerKey: attempt.pricePerKey,
          currency: attempt.currency,
          keyBossId: attempt.keyBossId,
          visibleBossId: attempt.visibleBossId,
          message: attempt.message,
        },
      });

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }

    if (cacheChanged) {
      keyPriceCache = await saveBossKeyPriceCache(keyPriceCache);
    }

    return {
      selfUserId,
      generatedAt: new Date().toISOString(),
      dryRun,
      force,
      onlyMissing,
      includePrisonSources,
      delayMs,
      totalTargets: targets.length,
      processed: results.filter((item) => !item.skipped).length,
      updatedSources: results.filter((item) => item.updated).length,
      cacheUpdated: cacheChanged,
      results,
      keyPrices: buildBossKeyPriceView(catalog, keyPriceCache),
    };
  });
}

async function startBoss(options = {}, sessionPath, runtimeOptions = {}) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const operationStartedAtMs = Date.now();
    const operationStartedAt = new Date(operationStartedAtMs).toISOString();
    const preparedPlan = runtimeOptions.preparedPlan
      && runtimeOptions.preparedPlan.action
      && runtimeOptions.preparedPlan.payload
      ? runtimeOptions.preparedPlan
      : null;
    let catalog = runtimeOptions.preparedCatalog || null;
    let plan = preparedPlan;
    if (!plan) {
      catalog = catalog || await buildBossCatalog(client);
      plan = prepareBossRunnerStart(catalog, {
        bossId: options.bossId ? Number(options.bossId) : null,
        mode: options.mode || null,
        comboMode: options.comboMode || null,
        preferredModes: options.preferredModes || null,
        openOnly: toBool(options.openOnly, false),
        forceNew: toBool(options.forceNew, false),
      });
    }
    const previousStarted = bossAutomationRuntime.lastStarted;
    const pendingRewardActivityContext = captureBossRewardActivityContext(
      previousStarted && (previousStarted.settle || previousStarted.snapshot)
        ? previousStarted.settle || previousStarted.snapshot
        : {},
      runtimeOptions.pendingRewardItem
        || previousStarted && previousStarted.item
        || null,
    );
    let keyPriceCache = null;

    if (toBool(options.dryRun, false)) {
      return {
        selfUserId,
        dryRun: true,
        plan,
        options: {
          autoRestoreMeleeCooldown: toBool(options.autoRestoreMeleeCooldown, true),
        },
        timing: {
          startedAt: operationStartedAt,
          finishedAt: new Date().toISOString(),
          elapsedMs: normalizeElapsedMs(Date.now() - operationStartedAtMs),
          startRequestElapsedMs: null,
          snapshotElapsedMs: null,
        },
      };
    }

    if (plan.action === "reuse-active") {
      const snapshotStartedAtMs = Date.now();
      const snapshot = runtimeOptions.liteSnapshot
        ? await loadBossRuntimeSnapshotLite(client, plan.selectedBoss ? plan.selectedBoss.id : null)
        : await loadBossRuntimeSnapshot(client, plan.selectedBoss ? plan.selectedBoss.id : null);
      return {
        selfUserId,
        dryRun: false,
        reused: true,
        plan,
        snapshot,
        timing: {
          startedAt: operationStartedAt,
          finishedAt: new Date().toISOString(),
          elapsedMs: normalizeElapsedMs(Date.now() - operationStartedAtMs),
          startRequestElapsedMs: null,
          snapshotElapsedMs: normalizeElapsedMs(Date.now() - snapshotStartedAtMs),
        },
      };
    }

    const selectedBossId = plan.selectedBoss ? Number(plan.selectedBoss.id) : null;
    const forceAutoBuy = shouldAlwaysAutoBuyKeysForBoss(selectedBossId);
    const autoBuyEnabled = forceAutoBuy || toBool(options.autoBuyKeysIfProfitable, false);
    if (autoBuyEnabled) {
      catalog = catalog || await buildBossCatalog(client);
      keyPriceCache = await loadBossKeyPriceCache();
    }
    keyPriceCache = keyPriceCache || createEmptyBossKeyPriceCache();
    const observedKeyPriceRubles = getObservedKeyPrice(
      keyPriceCache,
      plan.selectedBoss ? plan.selectedBoss.keySourceBossId : null,
    );
    const observedKeyCurrency = getObservedKeyPriceCurrency(
      keyPriceCache,
      plan.selectedBoss ? plan.selectedBoss.keySourceBossId : null,
    );
    const autoBuyDecision = evaluateAutoBuyKeyForBoss(
      catalog,
      plan.selectedBoss || null,
      options.keyPriceRubles,
      observedKeyPriceRubles,
      observedKeyCurrency,
    );
    const autoBuy = {
      enabled: autoBuyEnabled,
      forced: forceAutoBuy,
      ...autoBuyDecision,
      observedKeyPriceRubles,
      observedKeyCurrency,
      attempted: false,
      retriedStart: false,
      buyAttempts: [],
      buy: null,
      purchasedKeys: 0,
      spentRubles: 0,
      remainingKeys: autoBuyDecision.missingKeys,
      cacheUpdated: false,
      reason: autoBuyEnabled
        ? autoBuyDecision.keyBypassed || autoBuyDecision.missingKeys === 0
          ? "keys_not_required"
          : autoBuyDecision.canBuy
            ? autoBuyDecision.profitable || forceAutoBuy
              ? "waiting_for_key_shortage_signal"
              : "not_profitable"
            : "cannot_buy_for_boss"
        : "disabled",
    };

    const startRequestStartedAtMs = Date.now();
    let response = await client.bosses.startAttack(plan.payload);
    const pendingRewardResult = await retryBossStartAfterPendingReward(
      client,
      plan.payload,
      response,
    );
    if (
      pendingRewardResult.recovery
      && pendingRewardResult.recovery.attempted
      && pendingRewardResult.recovery.claimResponse
    ) {
      pendingRewardResult.recovery.rewardActivity = await recordBossAutomationClaimActivity(
        pendingRewardResult.recovery.claimResponse,
        {
          claimOk: pendingRewardResult.recovery.claimOk,
          bossId: pendingRewardActivityContext.bossId,
          item: pendingRewardActivityContext.item,
          sessionId: pendingRewardActivityContext.sessionId,
          reason: pendingRewardResult.recovery.claimOk
            ? null
            : getGameResponseMessage(pendingRewardResult.recovery.claimResponse),
        },
      );
    }
    response = pendingRewardResult.response;

    if (autoBuyEnabled && isNoKeysStartResponse(response)) {
      if (!autoBuyDecision.canBuy) {
        autoBuy.reason = "cannot_buy_for_boss";
      } else if (!autoBuyDecision.profitable && !forceAutoBuy) {
        autoBuy.reason = "not_profitable";
      } else {
        autoBuy.attempted = true;
        const maxBuyRounds = asPositiveInt(options.maxKeyBuyRounds, DEFAULT_MAX_KEY_SHORTAGE_BUY_ROUNDS)
          ?? DEFAULT_MAX_KEY_SHORTAGE_BUY_ROUNDS;
        let buyRound = 0;
        let nextMissingKeys = Math.max(1, autoBuyDecision.missingKeys || 0);

        while (isNoKeysStartResponse(response) && buyRound < maxBuyRounds) {
          buyRound += 1;
          autoBuy.reason = buyRound === 1 ? "buy_after_key_shortage" : "buy_after_retry_shortage";

          const purchase = await buyMissingBossKeys(
            client,
            plan.selectedBoss.id,
            nextMissingKeys,
          );

          const taggedAttempts = purchase.attempts.map((attempt) => ({
            buyRound,
            ...attempt,
          }));
          autoBuy.buyAttempts.push(...taggedAttempts);
          autoBuy.buy = taggedAttempts.length > 0
            ? taggedAttempts[taggedAttempts.length - 1]
            : autoBuy.buy;
          autoBuy.purchasedKeys += purchase.purchasedKeys;
          autoBuy.spentRubles += purchase.spentRubles;
          autoBuy.remainingKeys = purchase.remainingKeys;

          let cacheChanged = false;
          for (const attempt of purchase.attempts) {
            const added = Number(attempt.added);
            const spent = Number(attempt.spent);
            const sourceBossId = pickNumeric(attempt.keyBossId, autoBuyDecision.sourceBossId, null);
            if (
              Number.isFinite(added) && added > 0
              && Number.isFinite(spent) && spent >= 0
              && sourceBossId !== null
            ) {
              keyPriceCache = addBossKeyPriceObservation(
                keyPriceCache,
                sourceBossId,
                added,
                spent,
                attempt.currency,
              );
              cacheChanged = true;
            }
          }
          if (cacheChanged) {
            keyPriceCache = await saveBossKeyPriceCache(keyPriceCache);
            autoBuy.cacheUpdated = true;
          }

          if (purchase.purchasedKeys <= 0) {
            autoBuy.reason = purchase.reason;
            break;
          }

          autoBuy.retriedStart = true;
          response = await client.bosses.startAttack(plan.payload);
          if (!isNoKeysStartResponse(response)) {
            autoBuy.reason = isSuccessfulGameResponse(response)
              ? "bought_and_retried"
              : "retried_after_buy";
            break;
          }

          autoBuy.reason = "still_not_enough_keys_after_retry";
          nextMissingKeys = Math.max(1, Number(purchase.remainingKeys || 0) || 1);
        }

        if (isNoKeysStartResponse(response) && buyRound >= maxBuyRounds) {
          autoBuy.reason = "max_key_buy_retries_reached";
        }
      }
    }
    const startRequestElapsedMs = normalizeElapsedMs(Date.now() - startRequestStartedAtMs);
    const snapshotStartedAtMs = Date.now();
    const snapshot = runtimeOptions.liteSnapshot
      ? await loadBossRuntimeSnapshotLite(client, plan.selectedBoss ? plan.selectedBoss.id : null)
      : await loadBossRuntimeSnapshot(client, plan.selectedBoss ? plan.selectedBoss.id : null);
    const snapshotElapsedMs = normalizeElapsedMs(Date.now() - snapshotStartedAtMs);
    const finishedAt = new Date().toISOString();

    return {
      selfUserId,
      dryRun: false,
      reused: false,
      plan,
      autoBuy: autoBuyEnabled ? autoBuy : null,
      pendingRewardRecovery: pendingRewardResult.recovery,
      response,
      snapshot,
      timing: {
        startedAt: operationStartedAt,
        finishedAt,
        elapsedMs: normalizeElapsedMs(Date.now() - operationStartedAtMs),
        startRequestElapsedMs,
        snapshotElapsedMs,
        preparedPlan: Boolean(preparedPlan),
        liteSnapshot: Boolean(runtimeOptions.liteSnapshot),
      },
    };
  });
}

function validateBossSurrenderRequest(options = {}, summary = {}) {
  if (!toBool(options.confirmed, false)) {
    throw new Error("Подтвердите выход из боя за 2 мыла.");
  }
  if (
    !summary
    || summary.stateUnknown === true
    || summary.stateReliable === false
  ) {
    throw new Error("Не удалось проверить активный бой. Обновите состояние и попробуйте снова.");
  }

  const currentHp = summary.currentHp === null
    || summary.currentHp === undefined
    || summary.currentHp === ""
    ? null
    : Number(summary.currentHp);
  if (
    summary.hasSession !== true
    || summary.isCompleted === true
    || currentHp !== null && Number.isFinite(currentHp) && currentHp <= 0
  ) {
    throw new Error("Активный бой уже завершён или не найден.");
  }

  const expectedSessionId = options.sessionId === null || options.sessionId === undefined
    ? ""
    : String(options.sessionId).trim();
  const activeSessionId = summary.sessionId === null || summary.sessionId === undefined
    ? ""
    : String(summary.sessionId).trim();
  if (expectedSessionId && activeSessionId && expectedSessionId !== activeSessionId) {
    throw new Error("Активный бой изменился. Обновите состояние перед выходом.");
  }

  const expectedBossId = asPositiveInt(options.bossId, null);
  const activeBossId = asPositiveInt(summary.bossId, null);
  if (expectedBossId !== null && activeBossId !== null && expectedBossId !== activeBossId) {
    throw new Error("Активный босс изменился. Обновите состояние перед выходом.");
  }

  return {
    sessionId: activeSessionId || null,
    bossId: activeBossId,
  };
}

function validateVpiDamageRequest(options = {}, summary = {}, vpiDamage = {}) {
  if (
    !summary
    || summary.stateUnknown === true
    || summary.stateReliable === false
  ) {
    throw new Error("Не удалось проверить активный бой. Обновите состояние и попробуйте снова.");
  }

  const currentHp = summary.currentHp === null
    || summary.currentHp === undefined
    || summary.currentHp === ""
    ? null
    : Number(summary.currentHp);
  if (
    summary.hasSession !== true
    || summary.isCompleted === true
    || currentHp !== null && Number.isFinite(currentHp) && currentHp <= 0
  ) {
    throw new Error("Активный бой уже завершён или не найден.");
  }
  if (!vpiDamage || vpiDamage.active !== true) {
    throw new Error("Нет общака.");
  }

  const damageLeft = Math.max(0, asNumber(vpiDamage.damageLeft, 0));
  if (damageLeft <= 0) {
    throw new Error("Урон Иглы на сегодня закончился.");
  }

  const expectedSessionId = options.sessionId === null || options.sessionId === undefined
    ? ""
    : String(options.sessionId).trim();
  const activeSessionId = summary.sessionId === null || summary.sessionId === undefined
    ? ""
    : String(summary.sessionId).trim();
  if (expectedSessionId && activeSessionId && expectedSessionId !== activeSessionId) {
    throw new Error("Активный бой изменился. Обновите состояние перед ударом Иглы.");
  }

  const expectedBossId = asPositiveInt(options.bossId, null);
  const activeBossId = asPositiveInt(summary.bossId, null);
  if (!activeBossId) {
    throw new Error("Не удалось определить активного босса.");
  }
  if (expectedBossId !== null && expectedBossId !== activeBossId) {
    throw new Error("Активный босс изменился. Обновите состояние перед ударом Иглы.");
  }

  const requestedAmount = asPositiveInt(options.amount, damageLeft) ?? damageLeft;
  return {
    sessionId: activeSessionId || null,
    bossId: activeBossId,
    damageLeft,
    amount: Math.min(damageLeft, requestedAmount),
  };
}

async function spendVpiDamage(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const [initialSnapshot, damageResponse] = await Promise.all([
      loadBossRuntimeSnapshotLite(client, null),
      client.vpi.damageLeft(),
    ]);
    const vpiDamage = normalizeVpiDamageLeft(damageResponse);
    if (!vpiDamage) {
      const reason = getGameResponseMessage(damageResponse) || (
        damageResponse && damageResponse.status ? `HTTP ${damageResponse.status}` : "неизвестная ошибка"
      );
      throw new Error(`Не удалось проверить Иглу: ${reason}.`);
    }

    const summary = initialSnapshot && initialSnapshot.summary
      ? initialSnapshot.summary
      : {};
    const target = validateVpiDamageRequest(options, summary, vpiDamage);
    const response = await client.vpi.spendDamage({
      bossId: target.bossId,
      amount: target.amount,
      Amount: target.amount,
    }, {
      rateLimitRetries: 1,
    });
    if (!isSuccessfulGameResponse(response)) {
      const reason = getGameResponseMessage(response) || (
        response && response.status ? `HTTP ${response.status}` : "неизвестная ошибка"
      );
      throw new Error(`Не удалось пробить урон Иглой: ${reason}.`);
    }

    const responseData = getGamePayload(response) || {};
    const actualSpent = Math.max(
      0,
      asNumber(responseData.actualSpent ?? responseData.ActualSpent, target.amount),
    );
    const [finalSnapshot, vpiStateResponse, finalDamageResponse] = await Promise.all([
      loadBossRuntimeSnapshotLite(client, target.bossId),
      client.vpi.state(),
      client.vpi.damageLeft(),
    ]);
    const vpiState = normalizeVpiHeaderSummary(vpiStateResponse);
    const finalDamage = normalizeVpiDamageLeft(finalDamageResponse);
    const vpi = vpiState ? {
      ...vpiState,
      active: vpiState.active && (!finalDamage || finalDamage.active),
      damageLeft: finalDamage ? finalDamage.damageLeft : vpiState.damageLeft,
    } : null;

    headerExtrasCache.delete(String(selfUserId || "default"));
    return {
      selfUserId,
      bossId: target.bossId,
      sessionId: target.sessionId,
      requestedAmount: target.amount,
      actualSpent,
      damageBefore: target.damageLeft,
      damageLeft: vpi ? vpi.damageLeft : Math.max(0, target.damageLeft - actualSpent),
      vpi,
      response,
      initialSnapshot,
      finalSnapshot,
    };
  });
}

async function surrenderBoss(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const initialSnapshot = await loadBossRuntimeSnapshotLite(client, null);
    const summary = initialSnapshot && initialSnapshot.summary
      ? initialSnapshot.summary
      : {};
    const activeSession = validateBossSurrenderRequest(options, summary);
    const response = await client.bosses.surrender();

    if (!isSuccessfulGameResponse(response)) {
      const reason = getGameResponseMessage(response) || (
        response && response.status ? `HTTP ${response.status}` : "неизвестная ошибка"
      );
      throw new Error(`Не удалось выйти из боя: ${reason}`);
    }

    const finalSnapshot = await loadBossRuntimeSnapshotLite(client, activeSession.bossId);
    return {
      selfUserId,
      surrendered: true,
      soapCost: BOSS_SURRENDER_SOAP_COST,
      activeSession,
      response,
      initialSnapshot,
      finalSnapshot,
    };
  });
}

function countBossRunnerResultHits(result) {
  return (Array.isArray(result && result.cycles) ? result.cycles : [])
    .reduce((total, cycle) => total + (
      Array.isArray(cycle && cycle.hits) ? cycle.hits.length : 0
    ), 0);
}

function shouldRunSoloBossFinisher(options = {}, plan = {}, result = {}) {
  if (options.autoKillSolo === false) return false;
  if (!String(options.comboMode || "").trim() || !hasExplicitBossHitTypes(options.types)) {
    return false;
  }

  const summary = getBossAutomationSummaryFrom(result);
  const mode = pickString(
    summary ? summary.mode : null,
    plan.selectedMode,
    plan.selectedBoss ? plan.selectedBoss.selectedMode : null,
    options.mode,
    null,
  );
  const currentHp = pickNumeric(summary ? summary.currentHp : null);

  return Boolean(
    isSoloBossAutomationMode(mode)
    && summary
    && summary.stateUnknown !== true
    && summary.hasSession === true
    && !isBossAutomationSummaryFinished(summary)
    && (currentHp === null || currentHp > 0),
  );
}

function shouldRunBossNeedleFinisher(options = {}, result = {}) {
  if (
    !toBool(options.finishWithNeedle, false)
    || !String(options.comboMode || "").trim()
    || !hasExplicitBossHitTypes(options.types ?? options.hitTypes)
  ) {
    return false;
  }

  const summary = getBossAutomationSummaryFrom(result);
  const currentHp = pickNumeric(summary ? summary.currentHp : null);
  return Boolean(
    summary
    && summary.stateUnknown !== true
    && summary.stateReliable !== false
    && summary.hasSession === true
    && !isBossAutomationSummaryFinished(summary)
    && (currentHp === null || currentHp > 0),
  );
}

function mergeBossHitWeaponDeltas(firstResult, secondResult) {
  const firstDelta = firstResult && firstResult.weaponDelta && typeof firstResult.weaponDelta === "object"
    ? firstResult.weaponDelta
    : null;
  const secondDelta = secondResult && secondResult.weaponDelta && typeof secondResult.weaponDelta === "object"
    ? secondResult.weaponDelta
    : null;
  const before = firstDelta && firstDelta.before
    ? { counts: firstDelta.before, error: firstDelta.error }
    : secondDelta && secondDelta.before
      ? { counts: secondDelta.before, error: secondDelta.error }
      : null;
  const after = secondDelta && secondDelta.after
    ? {
        counts: secondDelta.after,
        capturedAt: secondDelta.capturedAt,
        error: secondDelta.error,
      }
    : firstDelta && firstDelta.after
      ? {
          counts: firstDelta.after,
          capturedAt: firstDelta.capturedAt,
          error: firstDelta.error,
        }
      : null;

  if (!before && !after) {
    return null;
  }
  return buildBossWeaponDelta(before, after);
}

function mergeSoloBossComboAndFinisherResult(comboResult, finisherResult, options = {}) {
  const comboElapsedMs = normalizeElapsedMs(comboResult && comboResult.elapsedMs) ?? 0;
  const finisherPreparationElapsedMs = normalizeElapsedMs(options.preparationElapsedMs) ?? 0;
  const finisherHitElapsedMs = normalizeElapsedMs(finisherResult && finisherResult.elapsedMs) ?? 0;
  const finisherElapsedMs = finisherPreparationElapsedMs + finisherHitElapsedMs;
  const elapsedMs = comboElapsedMs + finisherElapsedMs;
  const comboTiming = comboResult && comboResult.timing && typeof comboResult.timing === "object"
    ? comboResult.timing
    : {};
  const finisherTiming = finisherResult && finisherResult.timing && typeof finisherResult.timing === "object"
    ? finisherResult.timing
    : {};
  const comboPhaseElapsedMs = resolveBossComboElapsedMs(comboResult) ?? comboElapsedMs;

  return {
    ...comboResult,
    haltedReason: finisherResult && finisherResult.haltedReason !== undefined
      ? finisherResult.haltedReason
      : comboResult.haltedReason,
    claim: finisherResult && finisherResult.claim ? finisherResult.claim : comboResult.claim,
    finalSnapshot: finisherResult && finisherResult.finalSnapshot
      ? finisherResult.finalSnapshot
      : comboResult.finalSnapshot,
    weaponDelta: mergeBossHitWeaponDeltas(comboResult, finisherResult),
    comboEconomy: comboResult && comboResult.comboEconomy
      ? comboResult.comboEconomy
      : buildBossComboEconomy(comboResult),
    comboTiming: {
      startedAt: comboTiming.hitsStartedAt ?? comboTiming.startedAt ?? null,
      finishedAt: comboTiming.comboFinishedAt ?? comboTiming.hitsFinishedAt ?? comboTiming.finishedAt ?? null,
      elapsedMs: comboPhaseElapsedMs,
    },
    elapsedMs,
    timing: {
      ...comboTiming,
      startedAt: comboTiming.startedAt ?? null,
      finishedAt: finisherTiming.finishedAt ?? comboTiming.finishedAt ?? null,
      elapsedMs,
      finisherPreparationElapsedMs,
      finisherHitElapsedMs,
      operationElapsedMs: (
        normalizeElapsedMs(comboTiming.operationElapsedMs) ?? comboElapsedMs
      ) + (
        normalizeElapsedMs(finisherTiming.operationElapsedMs) ?? finisherHitElapsedMs
      ) + finisherPreparationElapsedMs,
    },
    soloFinisher: {
      attempted: true,
      hits: countBossRunnerResultHits(finisherResult),
      haltedReason: finisherResult && finisherResult.haltedReason !== undefined
        ? finisherResult.haltedReason
        : null,
      elapsedMs: finisherElapsedMs,
      preparationElapsedMs: finisherPreparationElapsedMs,
      hitElapsedMs: finisherHitElapsedMs,
      error: null,
      plan: finisherResult ? finisherResult.plan : null,
      cycles: finisherResult && Array.isArray(finisherResult.cycles) ? finisherResult.cycles : [],
      restore: finisherResult ? finisherResult.restore : null,
      weaponPurchases: finisherResult ? finisherResult.weaponPurchases : null,
      meleeAcceleration: finisherResult ? finisherResult.meleeAcceleration : null,
      claim: finisherResult ? finisherResult.claim : null,
      finalSnapshot: finisherResult ? finisherResult.finalSnapshot : null,
      weaponDelta: finisherResult ? finisherResult.weaponDelta : null,
    },
  };
}

async function prepareFastSoloBossFinisherPlan(client, options = {}, summary = {}, dependencies = {}) {
  const loadCatalog = typeof dependencies.buildCatalog === "function"
    ? dependencies.buildCatalog
    : buildBossCatalog;
  // During an active fight the live bootstrap already contains the session and
  // effective weapon stats. Category/arrival requests add no useful finisher data
  // and can take tens of seconds when the game API rate-limits them.
  const catalog = await loadCatalog(client, { fast: true });
  return prepareBossRunnerHit(catalog, {
    bossId: summary && summary.bossId ? Number(summary.bossId) : options.bossId ? Number(options.bossId) : null,
    mode: summary && summary.mode ? summary.mode : options.mode || "odin",
    preferredModes: options.preferredModes || null,
    openOnly: false,
    forceNew: false,
    types: null,
  });
}

function mergeBossComboAndNeedleFinisherResult(comboResult, needleFinisher) {
  const finalSnapshot = needleFinisher && needleFinisher.finalSnapshot
    ? needleFinisher.finalSnapshot
    : comboResult.finalSnapshot;
  const finalSummary = getBossAutomationSummaryFrom(finalSnapshot);
  const fightFinished = isBossAutomationSummaryFinished(finalSummary)
    || Boolean(finalSummary && finalSummary.hasSession === false);
  return {
    ...comboResult,
    haltedReason: fightFinished
      ? "needle_finisher_finished"
      : needleFinisher && needleFinisher.reason
        ? needleFinisher.reason
        : comboResult.haltedReason,
    finalSnapshot,
    needleFinisher: summarizeBossNeedleFinisher(needleFinisher),
  };
}

function estimateBossComboRubles(sequence, counts, cooldowns, options = {}) {
  const remaining = { ...counts };
  const readyAt = {};
  let total = 0;
  let elapsed = 0;
  for (const type of sequence) {
    if (Object.hasOwn(BOSS_CONSUMABLE_PRICES_RUBLES, type)) {
      if (Number(remaining[type] || 0) > 0) remaining[type] -= 1;
      else if (options.autoBuyMissingWeapons) total += BOSS_CONSUMABLE_PRICES_RUBLES[type];
    }
    if (Object.hasOwn(BOSS_MELEE_COOLDOWN_FIELDS, type)) {
      const cooldown = cooldowns[type] || {};
      const nextReady = readyAt[type] ?? Math.max(0, Number(cooldown.remainingMs || 0));
      if (nextReady > elapsed && options.autoRestoreMeleeCooldown !== false) {
        total += BOSS_MELEE_RESTORE_PRICE_RUBLES;
      }
      readyAt[type] = elapsed + (cooldown.cooldownSec === undefined
        ? DEFAULT_BOSS_MELEE_COOLDOWN_MS : cooldown.cooldownSec * 1000);
    }
    elapsed += Math.max(0, Number(options.delayMs || 0));
  }
  return total;
}

async function assertBossComboAffordable(client, sequence, options) {
  const [playerResponse, weaponResponse, sessionResponse] = await Promise.all([
    client.players.init(),
    client.bosses.weapons({ throttle: false, rateLimitRetries: 1 }),
    client.bosses.checkSession(null, { throttle: false }),
  ]);
  const player = getGamePayload(playerResponse) || {};
  const rubles = asNumber(player.currencies?.rubles ?? player.rubles, null);
  const counts = normalizeBossWeaponCounts(weaponResponse);
  if (!isSuccessfulGameResponse(playerResponse) || !isSuccessfulGameResponse(sessionResponse)
    || rubles === null || !counts) {
    throw new Error("Комбо приостановлено: не удалось проверить рубли и запас оружия.");
  }
  const required = estimateBossComboRubles(sequence, counts,
    buildBossMeleeCooldowns({ ...getGamePayload(weaponResponse), ...getGamePayload(sessionResponse) }), options);
  if (rubles < required) {
    throw new Error(`Комбо приостановлено: на полную последовательность нужно ${required} ₽, доступно ${rubles} ₽.`);
  }
}

async function hitBoss(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    let plan = await prepareFastActiveBossHitPlan(client, options);
    if (!plan) {
      const catalog = await buildBossCatalog(client);
      plan = prepareBossRunnerHit(catalog, {
        bossId: options.bossId ? Number(options.bossId) : null,
        mode: options.mode || null,
        comboMode: options.comboMode || null,
        preferredModes: options.preferredModes || null,
        openOnly: toBool(options.openOnly, false),
        forceNew: toBool(options.forceNew, false),
        types: options.types || null,
      });
    }
    const plannedSession = plan && plan.startPlan && plan.startPlan.activeSession
      && plan.startPlan.activeSession.session
      ? plan.startPlan.activeSession.session
      : plan && plan.selectedBoss && plan.selectedBoss.currentSession
        ? plan.selectedBoss.currentSession
        : null;
    const rewardActivityContext = captureBossRewardActivityContext(
      plannedSession || {
        bossId: plan && plan.selectedBoss ? plan.selectedBoss.id : options.bossId,
      },
      options.rewardActivityItem,
    );

    if (
      toBool(options.requireActiveSession, false)
      && !toBool(options.dryRun, false)
      && plan
      && plan.startPlan
      && plan.startPlan.action === "start-attack"
    ) {
      const checkedAt = new Date().toISOString();
      const snapshot = await loadBossRuntimeSnapshotLite(
        client,
        options.bossId ? Number(options.bossId) : null,
      );
      const summary = snapshot && snapshot.summary ? snapshot.summary : {};
      return {
        selfUserId,
        dryRun: false,
        plan,
        options: {
          requireActiveSession: true,
        },
        startResponse: null,
        initialSnapshot: snapshot,
        cycles: [],
        restore: {
          attempted: 0,
          succeeded: 0,
          failed: 0,
          spentByCurrency: {},
        },
        weaponPurchases: {
          attempted: 0,
          succeeded: 0,
          failed: 0,
        },
        meleeAcceleration: {
          requested: false,
          active: false,
          fastRequests: 0,
          fallbacks: 0,
          fallbackReason: null,
        },
        haltedReason: summary.hasReward || summary.rewardReady || summary.isCompleted
          ? "session_already_finished"
          : summary.stateUnknown
            ? "state_unknown"
            : "no_active_session",
        claim: null,
        finalSnapshot: snapshot,
        elapsedMs: 0,
        timing: {
          startedAt: checkedAt,
          finishedAt: checkedAt,
          elapsedMs: 0,
        },
        weaponDelta: buildBossWeaponDelta(null, null),
      };
    }

    if (toBool(options.dryRun, false)) {
      return {
        selfUserId,
        dryRun: true,
        plan,
      };
    }

    const runnerOptions = {
      delayMs: asNonNegativeInt(options.delayMs, 0) ?? 0,
      continueOnError: toBool(options.continueOnError, true),
      stopOnNoProgress: false,
      maxCycles: 1,
      claimWhenReady: toBool(options.claimWhenReady, true),
      autoRestoreMeleeCooldown: toBool(options.autoRestoreMeleeCooldown, true),
      autoBuyMissingWeapons: toBool(options.autoBuyMissingWeapons, false),
      fastMode: toBool(options.fastMode, true),
      snapshotAfterEachHit: toBool(options.snapshotAfterEachHit, false),
      throttleWeaponRequests: toBool(options.throttleWeaponRequests, false),
      rewardActivityItem: rewardActivityContext.item,
    };
    if (String(options.comboMode || "").trim() && hasExplicitBossHitTypes(options.types)) {
      await assertBossComboAffordable(client, plan.sequence, runnerOptions);
    }
    let result = await executeBossRunnerLoopWithWeaponDelta(client, plan, runnerOptions);

    const runNeedleFinisher = shouldRunBossNeedleFinisher(options, result);
    const runSoloFinisher = shouldRunSoloBossFinisher(options, plan, result);
    if (runNeedleFinisher || runSoloFinisher) {
      let summary = getBossAutomationSummaryFrom(result);
      try {
        let useWeaponFinisher = true;
        if (runNeedleFinisher) {
          const needleFinisher = await executeBossNeedleFinisher(client, {
            bossId: summary && summary.bossId ? Number(summary.bossId) : options.bossId,
            mode: summary && summary.mode ? summary.mode : options.mode,
            comboMode: options.comboMode,
            hitTypes: options.types ?? options.hitTypes,
            finishWithNeedle: true,
          }, {
            initialSnapshot: result.finalSnapshot,
          });
          result = mergeBossComboAndNeedleFinisherResult(result, needleFinisher);
          summary = getBossAutomationSummaryFrom(result);
          useWeaponFinisher = shouldUseWeaponsAfterBossNeedleFinisher(needleFinisher);
          await logEvent("boss.needle_finisher", {
            bossId: summary && summary.bossId
              ? Number(summary.bossId)
              : Number(options.bossId || 0) || null,
            ...summarizeBossNeedleFinisher(needleFinisher),
          });
        }

        if (useWeaponFinisher && shouldRunSoloBossFinisher(options, plan, result)) {
          const finisherPreparationStartedAtMs = Date.now();
          const finisherPlan = await prepareFastSoloBossFinisherPlan(client, options, summary);
          const finisherPreparationElapsedMs = normalizeElapsedMs(
            Date.now() - finisherPreparationStartedAtMs,
          ) ?? 0;
          const finisherResult = await executeBossRunnerLoopWithWeaponDelta(client, finisherPlan, runnerOptions);
          result = mergeSoloBossComboAndFinisherResult(result, finisherResult, {
            preparationElapsedMs: finisherPreparationElapsedMs,
          });
        }
      } catch (error) {
        const reason = getErrorMessage(error);
        const errorResult = {
          attempted: true,
          hits: 0,
          haltedReason: "finisher_error",
          elapsedMs: 0,
          error: reason,
        };
        if (runSoloFinisher) {
          result.soloFinisher = errorResult;
        } else {
          result.needleFinisher = errorResult;
        }
        await logEvent(runSoloFinisher ? "boss.solo_finisher.error" : "boss.needle_finisher.error", {
          bossId: summary && summary.bossId ? Number(summary.bossId) : Number(options.bossId || 0) || null,
          mode: summary && summary.mode ? summary.mode : options.mode || "odin",
          reason,
        });
      }
    }

    let finalSummary = getBossAutomationSummaryFrom(result) || {};
    const completionObservedAfterFinisher = isBossAutomationSummaryFinished(finalSummary)
      || Boolean(
        rewardActivityContext.sessionId
        && finalSummary.stateUnknown !== true
        && finalSummary.hasSession === false,
      );
    if (
      runnerOptions.claimWhenReady
      && !(result.claim && result.claim.ok)
      && completionObservedAfterFinisher
      && !(result.rewardSettlement && result.rewardSettlement.completionObserved)
    ) {
      const observedSummary = {
        ...finalSummary,
        bossId: pickNumeric(finalSummary.bossId, rewardActivityContext.bossId, null),
        sessionId: pickString(finalSummary.sessionId, rewardActivityContext.sessionId, null),
        hasSession: false,
        isCompleted: true,
      };
      const rewardSettlement = await settleBossRewardClaim(
        client,
        observedSummary.bossId,
        result.finalSnapshot,
        {
          claimWhenReady: true,
          completionObserved: true,
          observedSummary,
          forceClaimOnCompletion: false,
          refreshAfterClaim: false,
        },
      );
      result.finalSnapshot = rewardSettlement.snapshot;
      result.claim = rewardSettlement.claim;
      result.rewardSettlement = {
        completionObserved: rewardSettlement.completionObserved,
        pending: rewardSettlement.pending,
        attempts: rewardSettlement.attempts,
        background: null,
      };
      finalSummary = getBossAutomationSummaryFrom(result) || observedSummary;
    }
    if (result.rewardSettlement && result.rewardSettlement.pending) {
      const background = scheduleBossRewardSettlement(
        client,
        pickNumeric(finalSummary.bossId, rewardActivityContext.bossId, null),
        result.finalSnapshot,
        {
          observedSummary: {
            ...finalSummary,
            bossId: pickNumeric(finalSummary.bossId, rewardActivityContext.bossId, null),
            sessionId: pickString(finalSummary.sessionId, rewardActivityContext.sessionId, null),
          },
          item: rewardActivityContext.item,
        },
      );
      result.rewardSettlement.background = background;
    }

    const rewardActivity = await recordBossClaimResultActivity(result, {
      bossId: rewardActivityContext.bossId || options.bossId,
      item: rewardActivityContext.item,
      sessionId: rewardActivityContext.sessionId,
    });

    return {
      selfUserId,
      dryRun: false,
      ...result,
      rewardActivity,
    };
  });
}

function normalizeBossWeaponBatchOptions(options = {}) {
  const weapon = normalizeBossActionType(options.weapon);
  const count = asPositiveInt(options.count, null);
  if (MELEE_BOSS_ACTION_KEYS.has(weapon)) {
    if (count !== 1) {
      throw new Error("Melee actions support exactly one hit per request.");
    }
    return { weapon, count };
  }
  if (!BOSS_CONSUMABLE_ACTION_KEYS.has(weapon)) {
    throw new Error(`Unsupported boss action: ${weapon}`);
  }
  if (!BOSS_WEAPON_BATCH_COUNTS.has(count)) {
    throw new Error("Weapon batch count must be one of: 1, 10, 50, 100, 1000.");
  }

  return { weapon, count };
}

async function useBossWeaponBatch(options = {}, sessionPath) {
  const { weapon, count } = normalizeBossWeaponBatchOptions(options);
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const initialSnapshot = await loadBossRuntimeSnapshotLite(client, null);
    const summary = initialSnapshot && initialSnapshot.summary ? initialSnapshot.summary : {};
    const rewardActivityContext = captureBossRewardActivityContext(summary);
    const currentHp = Number(summary.currentHp);
    if (!summary.hasSession || summary.isCompleted || (Number.isFinite(currentHp) && currentHp <= 0)) {
      return {
        selfUserId,
        dryRun: false,
        weapon,
        count,
        haltedReason: "no_active_session",
        initialSnapshot,
        cycles: [],
        finalSnapshot: initialSnapshot,
        weaponDelta: buildBossWeaponDelta(null, null),
      };
    }

    const before = await captureBossWeaponCounts(client);
    const item = {
      type: weapon,
      payload: buildBossUseWeaponPayload(weapon, count),
    };
    const response = await client.bosses.useWeapon(item.payload, {
      throttle: false,
      rateLimitRetries: 1,
    });
    let finalSnapshot = await loadBossRuntimeSnapshotLite(client, summary.bossId || null);
    const after = await captureBossWeaponCounts(client);
    const hit = buildBossHitOutcome(item, response, initialSnapshot, finalSnapshot);
    finalSnapshot = applyBossMeleeCooldownAfterHit(finalSnapshot, item, hit, initialSnapshot);
    hit.snapshot = finalSnapshot && finalSnapshot.summary ? finalSnapshot.summary : null;
    hit.hitIndex = 0;
    const finalSummary = finalSnapshot && finalSnapshot.summary ? finalSnapshot.summary : {};
    const hitHp = Number(hit.currentHp);
    const completionObserved = isBossAutomationSummaryFinished(finalSummary)
      || (Number.isFinite(hitHp) && hitHp <= 0);
    const observedSummary = completionObserved
      ? {
          ...finalSummary,
          currentHp: Number.isFinite(hitHp) ? hitHp : finalSummary.currentHp,
          hasSession: false,
          isCompleted: true,
        }
      : finalSummary;
    const rewardSettlement = await settleBossRewardClaim(
      client,
      finalSummary.bossId || summary.bossId || null,
      finalSnapshot,
      {
        claimWhenReady: toBool(options.claimWhenReady, true),
        completionObserved,
        observedSummary,
        forceClaimOnCompletion: false,
        refreshAfterClaim: false,
      },
    );
    const backgroundSettlement = rewardSettlement.pending
      ? scheduleBossRewardSettlement(
          client,
          finalSummary.bossId || summary.bossId || null,
          rewardSettlement.snapshot,
          {
            observedSummary,
            item: rewardActivityContext.item,
          },
        )
      : null;
    finalSnapshot = rewardSettlement.snapshot;
    let rewardActivity = null;
    if (rewardSettlement.claim && rewardSettlement.claim.response) {
      rewardActivity = await recordBossAutomationClaimActivity(rewardSettlement.claim.response, {
        claimOk: rewardSettlement.claim.ok,
        bossId: rewardActivityContext.bossId || finalSummary.bossId || summary.bossId || null,
        item: rewardActivityContext.item,
        sessionId: rewardActivityContext.sessionId,
        reason: rewardSettlement.claim.ok
          ? null
          : getGameResponseMessage(rewardSettlement.claim.response),
      });
    }

    return {
      selfUserId,
      dryRun: false,
      weapon,
      count,
      haltedReason: hit.ok ? "batch_complete" : "batch_failed",
      claimWhenReady: toBool(options.claimWhenReady, true),
      claim: rewardSettlement.claim,
      rewardSettlement: {
        completionObserved: rewardSettlement.completionObserved,
        pending: rewardSettlement.pending,
        attempts: rewardSettlement.attempts,
        background: backgroundSettlement,
      },
      initialSnapshot,
      cycles: [{
        cycleIndex: 0,
        hits: [hit],
        preSnapshot: initialSnapshot.summary,
        postSnapshot: finalSnapshot.summary,
      }],
      finalSnapshot,
      rewardActivity,
      weaponDelta: buildBossWeaponDelta(before, after),
    };
  });
}

async function restoreBossMeleeCooldown(options = {}, sessionPath) {
  const weapon = normalizeBossActionType(options.weapon);
  if (!MELEE_BOSS_ACTION_KEYS.has(weapon)) {
    throw new Error(`Cooldown restore is supported only for melee actions: ${weapon}.`);
  }

  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const initialSnapshot = await loadBossRuntimeSnapshotLite(client, null);
    const summary = initialSnapshot && initialSnapshot.summary ? initialSnapshot.summary : {};
    const cooldown = summary.meleeCooldowns && summary.meleeCooldowns[weapon]
      ? summary.meleeCooldowns[weapon]
      : null;

    if (!summary.hasSession || summary.isCompleted) {
      return {
        selfUserId,
        ok: false,
        restored: false,
        weapon,
        haltedReason: "no_active_session",
        message: "No active boss session.",
        spentByCurrency: {},
        spentRubles: 0,
        initialSnapshot,
        finalSnapshot: initialSnapshot,
      };
    }
    if (cooldown && cooldown.active === false) {
      return {
        selfUserId,
        ok: true,
        restored: false,
        weapon,
        haltedReason: "already_ready",
        message: "Melee action is already ready.",
        spentByCurrency: {},
        spentRubles: 0,
        initialSnapshot,
        finalSnapshot: initialSnapshot,
      };
    }

    const result = await tryRestoreBossMeleeCooldown(client, {
      type: weapon,
      payload: buildBossUseWeaponPayload(weapon, 1),
    }, {
      throttle: false,
      rateLimitRetries: 1,
    });
    const finalSnapshot = await loadBossRuntimeSnapshotLite(client, summary.bossId || null);
    const spentRubles = Number(result.spentByCurrency && result.spentByCurrency.rubles) > 0
      ? Number(result.spentByCurrency.rubles)
      : result.ok
        ? BOSS_MELEE_RESTORE_PRICE_RUBLES
        : 0;

    return {
      selfUserId,
      ok: result.ok,
      restored: result.ok,
      weapon,
      haltedReason: result.ok ? "restored" : "restore_failed",
      message: result.message,
      spentByCurrency: result.spentByCurrency,
      spentRubles,
      restorePriceRubles: BOSS_MELEE_RESTORE_PRICE_RUBLES,
      selectedAttempt: result.selectedAttempt
        ? {
            ok: result.selectedAttempt.ok,
            status: result.selectedAttempt.status,
            message: result.selectedAttempt.message,
            spent: result.selectedAttempt.spent,
            currency: result.selectedAttempt.currency,
          }
        : null,
      initialSnapshot,
      finalSnapshot,
    };
  });
}

async function loopBoss(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    let plan = await prepareFastActiveBossHitPlan(client, options);
    if (!plan) {
      const catalog = await buildBossCatalog(client);
      plan = prepareBossRunnerHit(catalog, {
        bossId: options.bossId ? Number(options.bossId) : null,
        mode: options.mode || null,
        comboMode: options.comboMode || null,
        preferredModes: options.preferredModes || null,
        openOnly: toBool(options.openOnly, false),
        forceNew: toBool(options.forceNew, false),
        types: options.types || null,
      });
    }

    if (toBool(options.dryRun, false)) {
      return {
        selfUserId,
        dryRun: true,
        plan,
        options: {
          delayMs: asNonNegativeInt(options.delayMs, 0) ?? 0,
          maxCycles: asPositiveInt(options.maxCycles, 1) ?? 1,
          claimWhenReady: toBool(options.claimWhenReady, true),
          autoRestoreMeleeCooldown: toBool(options.autoRestoreMeleeCooldown, true),
          autoBuyMissingWeapons: toBool(options.autoBuyMissingWeapons, false),
        },
      };
    }

    const result = await executeBossRunnerLoopWithWeaponDelta(client, plan, {
      delayMs: asNonNegativeInt(options.delayMs, 0) ?? 0,
      continueOnError: toBool(options.continueOnError, true),
      stopOnNoProgress: toBool(options.stopOnNoProgress, true),
      maxCycles: asPositiveInt(options.maxCycles, 1) ?? 1,
      claimWhenReady: toBool(options.claimWhenReady, true),
      autoRestoreMeleeCooldown: toBool(options.autoRestoreMeleeCooldown, true),
      autoBuyMissingWeapons: toBool(options.autoBuyMissingWeapons, false),
      fastMode: toBool(options.fastMode, true),
      snapshotAfterEachHit: toBool(options.snapshotAfterEachHit, false),
      throttleWeaponRequests: toBool(options.throttleWeaponRequests, false),
    });

    return {
      selfUserId,
      dryRun: false,
      ...result,
    };
  });
}

async function getBossState(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const bossId = asPositiveInt(options.bossId, null);
    const fast = toBool(options.fast, false);
    const snapshot = fast
      ? await loadBossRuntimeSnapshotLite(client, bossId)
      : await loadBossRuntimeSnapshot(client, bossId);

    return {
      selfUserId,
      bossId,
      fast,
      snapshot,
      automation: await getBossAutomationState(),
    };
  });
}

async function takeDamageSnapshot(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const snapshot = await createDamageSnapshot(client, {
      kind: options.kind,
      limit: asPositiveInt(options.limit, null),
      selfUserId,
    });
    const storage = await saveDamageSnapshot(snapshot);

    return {
      selfUserId,
      snapshotKind: snapshot.snapshotKind,
      generatedAt: snapshot.generatedAt,
      dayKey: snapshot.dayKey,
      timeKey: snapshot.timeKey,
      timeZoneOffset: snapshot.timeZoneOffset,
      reset: snapshot.reset,
      request: snapshot.request,
      summary: snapshot.summary,
      storage,
    };
  });
}

function buildDamageHistoryRuntimeView() {
  return {
    enabled: damageHistoryRuntime.initialized,
    intervalMs: DAMAGE_HISTORY_CAPTURE_INTERVAL_MS,
    intervalMinutes: DAMAGE_HISTORY_CAPTURE_INTERVAL_MS / 60_000,
    running: damageHistoryRuntime.running,
    tickCount: damageHistoryRuntime.tickCount,
    lastStartedAt: damageHistoryRuntime.lastStartedAt,
    lastCapturedAt: damageHistoryRuntime.lastCapturedAt,
    lastError: damageHistoryRuntime.lastError,
  };
}

async function runDamageHistoryTick(options = {}, sessionPath) {
  if (damageHistoryRuntime.running) {
    return {
      skipped: true,
      reason: "capture_in_progress",
      history: buildDamageHistoryRuntimeView(),
    };
  }

  damageHistoryRuntime.running = true;
  damageHistoryRuntime.lastStartedAt = new Date().toISOString();
  try {
    const capture = await takeDamageSnapshot({
      kind: options.kind || "hourly",
      limit: options.limit,
    }, sessionPath);
    damageHistoryRuntime.tickCount += 1;
    damageHistoryRuntime.lastCapturedAt = capture.generatedAt;
    damageHistoryRuntime.lastError = null;
    return {
      ...capture,
      history: buildDamageHistoryRuntimeView(),
    };
  } catch (error) {
    damageHistoryRuntime.lastError = error && error.message ? error.message : String(error);
    throw error;
  } finally {
    damageHistoryRuntime.running = false;
  }
}

async function initializeDamageHistory(sessionPath) {
  if (damageHistoryRuntime.initialized) {
    return buildDamageHistoryRuntimeView();
  }

  damageHistoryRuntime.initialized = true;
  damageHistoryRuntime.timerId = setInterval(() => {
    void runDamageHistoryTick({ kind: "hourly" }, sessionPath).catch(() => undefined);
  }, DAMAGE_HISTORY_CAPTURE_INTERVAL_MS);
  setTimeout(() => {
    void runDamageHistoryTick({ kind: "hourly" }, sessionPath).catch(() => undefined);
  }, 2_000);
  return buildDamageHistoryRuntimeView();
}

async function getDamageIntel(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const intel = await createDamageIntel(client, {
      kind: options.kind || "manual",
      limit: asPositiveInt(options.limit, null),
      top: asPositiveInt(options.top, null),
      selfUserId,
    });
    const storage = await saveDamageSnapshot(intel.snapshot);
    damageHistoryRuntime.lastCapturedAt = intel.snapshot.generatedAt;
    damageHistoryRuntime.lastError = null;

    return {
      captured: {
        snapshotKind: intel.snapshot.snapshotKind,
        generatedAt: intel.snapshot.generatedAt,
        dayKey: intel.snapshot.dayKey,
        timeKey: intel.snapshot.timeKey,
        timeZoneOffset: intel.snapshot.timeZoneOffset,
        request: intel.snapshot.request,
        summary: intel.snapshot.summary,
        storage,
      },
      reports: intel.reports,
      history: buildDamageHistoryRuntimeView(),
    };
  });
}

async function getDamageReport(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    return createDamageReport(client, {
      period: options.period,
      dayKey: options.dayKey || options.date || null,
      useLive: options.useLive,
      limit: asPositiveInt(options.limit, null),
      top: asPositiveInt(options.top, null),
      selfUserId,
    });
  });
}

async function getBusinessStatus(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const response = await client.business.all();
    return response.data;
  });
}

async function collectBusinessProfit(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const { response } = await collectBusinessProfitAfterZarubaCheck(client);
    return response.data;
  });
}

async function readMiscAutomationState(options = {}) {
  const statePath = options.statePath || miscAutomationRuntime.statePath || MISC_AUTOMATION_LATEST_PATH;
  try {
    const body = await fs.readFile(statePath, "utf8");
    return normalizeMiscAutomationState(JSON.parse(body));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return normalizeMiscAutomationState({});
    }
    throw error;
  }
}

async function saveMiscAutomationState(value) {
  const state = normalizeMiscAutomationState({
    ...value,
    updatedAt: new Date().toISOString(),
  });
  const statePath = miscAutomationRuntime.statePath || MISC_AUTOMATION_LATEST_PATH;
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  miscAutomationRuntime.state = state;
  return state;
}

function buildMiscAutomationView(value) {
  const state = normalizeMiscAutomationState(value || miscAutomationRuntime.state || {});
  return {
    ...state,
    accountId: miscAutomationRuntime.accountId,
    serverRunning: miscAutomationRuntime.running,
    tickCount: miscAutomationRuntime.tickCount,
  };
}

function clearMiscAutomationTimer() {
  if (miscAutomationRuntime.timerId) {
    clearInterval(miscAutomationRuntime.timerId);
  }
  miscAutomationRuntime.timerId = null;
}

function applyMiscAutomationTimer(state) {
  clearMiscAutomationTimer();
  if (!state || !state.enabled) {
    return;
  }
  miscAutomationRuntime.timerId = setInterval(() => {
    void runMiscAutomationTick({ reason: "interval" }, miscAutomationRuntime.sessionPath);
  }, Math.max(30, Number(state.intervalSec) || 60) * 1000);
}

async function ensureMiscAutomationLoaded(sessionPath) {
  const context = await resolvePrisonAutomationAccountContext(sessionPath);
  if (
    miscAutomationRuntime.initialized
    && miscAutomationRuntime.state
    && miscAutomationRuntime.accountId === context.accountId
  ) {
    return miscAutomationRuntime.state;
  }
  clearMiscAutomationTimer();
  const statePath = getAccountArtifactPath(context.accountId, "misc-automation-latest.json");
  const state = await readMiscAutomationState({ statePath });
  miscAutomationRuntime.accountId = context.accountId;
  miscAutomationRuntime.statePath = statePath;
  miscAutomationRuntime.sessionPath = context.sessionPath;
  miscAutomationRuntime.state = state;
  miscAutomationRuntime.initialized = true;
  applyMiscAutomationTimer(state);
  return state;
}

function runMiscAutomationSerialized(operation) {
  const run = miscAutomationSerializedOperation.catch(() => undefined).then(operation);
  miscAutomationSerializedOperation = run.catch(() => undefined);
  return run;
}

async function loadLowestAuthorityTargets(client, selfUserId, options = {}) {
  const now = Date.now();
  if (!options.force && lowestAuthorityTargetsCache.items.length > 0
    && now - lowestAuthorityTargetsCache.loadedAt < 15 * 60_000) {
    return lowestAuthorityTargetsCache.items;
  }

  const items = [];
  try {
    for (let page = 0; page < 30; page += 1) {
      const response = await client.friends.profiles(page);
      const pageItems = Array.isArray(response && response.data) ? response.data : [];
      if (pageItems.length === 0) {
        break;
      }
      items.push(...pageItems);
      if (pageItems.length < 64) {
        break;
      }
    }
  } catch {
    // Some game versions keep the route but return no usable profile list.
    // The ordinary friendship list below is enough for interaction tasks.
  }

  if (items.length === 0) {
    const response = await client.friends.list();
    items.push(...collectFriendIdsFromPayload(response && response.data).map((userId) => ({
      userId,
      nickname: null,
      authority: 0,
    })));
  }
  const seen = new Set();
  const sorted = items
    .filter((item) => item && item.userId !== undefined && String(item.userId) !== String(selfUserId))
    .sort((left, right) => (Number(left.authority) || 0) - (Number(right.authority) || 0))
    .filter((item) => {
      const id = String(item.userId);
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  lowestAuthorityTargetsCache = { loadedAt: now, items: sorted };
  return sorted;
}

async function performMonthlyInteraction(client, selfUserId, type, requestedCount) {
  const targets = await loadLowestAuthorityTargets(client, selfUserId);
  const progress = await readInteractionProgress();
  const successes = [];
  const failures = [];
  const repeatable = !ONE_PER_DAY_INTERACTION_TYPES.has(type);
  const eligibleTargets = repeatable
    ? targets
    : targets.filter((target) => !hasCompletedInteraction(progress, type, target.userId));
  const maxAttempts = repeatable
    ? Math.max(requestedCount * 8, 20)
    : Math.min(eligibleTargets.length, Math.max(requestedCount * 8, 20));
  let progressChanged = false;

  for (let attempt = 0; attempt < maxAttempts && eligibleTargets.length > 0; attempt += 1) {
    if (successes.length >= requestedCount) {
      break;
    }
    const target = eligibleTargets[attempt % eligibleTargets.length];
    const response = await client.interactions.perform({
      fromUserId: selfUserId,
      toUserId: target.userId,
      type,
    });
    const payload = getGamePayload(response) || {};
    const item = {
      userId: String(target.userId),
      nickname: target.nickname || null,
      authority: Number(target.authority) || 0,
      status: response.status,
      message: payload.message || payload.error || null,
    };
    if (isInteractionResponseSuccessful(response)) {
      successes.push(item);
      if (!repeatable) {
        progressChanged = markCompletedInteraction(progress, type, target.userId) || progressChanged;
      }
    } else {
      failures.push(item);
      if (!repeatable && isAlreadyPerformedInteractionResponse(response)) {
        progressChanged = markCompletedInteraction(progress, type, target.userId) || progressChanged;
      }
    }
  }

  if (progressChanged) {
    await saveInteractionProgress(progress);
  }

  return {
    type,
    requestedCount,
    eligibleTargets: eligibleTargets.length,
    successes,
    failures,
  };
}

function findDuplicateStash(collectionResponse) {
  const payload = getGamePayload(collectionResponse) || {};
  const progress = payload.playerProgress && payload.playerProgress.data
    ? payload.playerProgress.data
    : {};
  let best = null;
  for (const zone of Array.isArray(payload.collections) ? payload.collections : []) {
    const prisonId = Number(zone.prisonid) || 0;
    for (const collection of Array.isArray(zone.collections) ? zone.collections : []) {
      const collectionId = Number(collection.id) || 0;
      const counts = progress[String(prisonId)]?.[String(collectionId)]?.items || {};
      for (const item of collection.items || []) {
        const count = Number(counts[String(item.id)] || 0);
        if (count <= 1 || (best && best.count >= count)) {
          continue;
        }
        best = {
          prisonId,
          collectionId,
          itemId: Number(item.id),
          count,
          collectionName: collection.name || null,
        };
      }
    }
  }
  return best;
}

async function sendDuplicateStashes(client, selfUserId, requestedCount, recipientId = null) {
  if (recipientId && String(recipientId) === String(selfUserId)) {
    return { requestedCount, successes: [], failures: [], reason: "stash_recipient_is_self" };
  }
  const targets = recipientId
    ? Array.from({ length: requestedCount }, () => ({ userId: recipientId }))
    : await loadLowestAuthorityTargets(client, selfUserId);
  const successes = [];
  const failures = [];
  let reason = targets.length > 0 ? null : "no_available_targets";
  const maxAttempts = Math.min(targets.length, Math.max(requestedCount * 8, 20));
  for (const target of targets.slice(0, maxAttempts)) {
    if (successes.length >= requestedCount) break;
    const collectionResponse = await client.collection.full(selfUserId);
    const stash = findDuplicateStash(collectionResponse);
    if (!stash) {
      reason = "no_duplicate_stashes";
      break;
    }
    const response = await client.collection.give({
      fromUserId: selfUserId,
      toUserId: target.userId,
      prisonId: stash.prisonId,
      collectionId: stash.collectionId,
      itemId: stash.itemId,
    });
    const payload = getGamePayload(response) || {};
    const row = {
      ...stash,
      toUserId: String(target.userId),
      nickname: target.nickname || null,
      authority: Number(target.authority) || 0,
      status: response.status,
      message: payload.message || payload.error || null,
    };
    if (isSuccessfulGameResponse(response) && payload.success !== false) {
      successes.push(row);
    } else {
      failures.push(row);
      reason = "stash_give_failed";
    }
  }
  if (successes.length >= requestedCount) reason = null;
  return { requestedCount, successes, failures, reason };
}

async function runMonthlyEnergyAction(client, day) {
  const initPayload = getGamePayload(await client.players.init()) || {};
  const energy = Number(initPayload.energy) || 0;
  if (energy <= 0) {
    return { type: "wait", reason: "not_enough_energy", energy };
  }

  if (day.action === "PrisonRun" || day.action === "PrisonEarnAuthority") {
    const prisonId = Number(day.context?.prisonId) || Number(day.authorityPrisonId) || 1;
    const response = await client.players.prisonWork(prisonId, { isDay: true });
    return {
      type: "prison_work",
      prisonId,
      ok: isSuccessfulGameResponse(response),
      status: response.status,
      data: getGamePayload(response),
    };
  }

  const masterId = day.context && day.context.masterId ? Number(day.context.masterId) : 1;
  const entry = normalizeMasterEnterResponse(await client.masters.enter(masterId), { id: masterId });
  if (!entry.available || entry.missingItems.length > 0 || !entry.canStartTraining) {
    return {
      type: "wait",
      reason: !entry.available ? "master_locked" : entry.missingItems.length > 0 ? "master_items_required" : "training_unavailable",
      masterId,
    };
  }
  const response = await client.masters.work(masterId);
  return {
    type: "master_work",
    masterId,
    ok: isSuccessfulGameResponse(response),
    status: response.status,
    data: getGamePayload(response),
  };
}

function buildMonthlyPrisonQueueItem(monthly, day) {
  if (!day || !["PrisonRun", "MasterSession"].includes(day.action)) {
    return null;
  }
  const targetType = day.action === "MasterSession" ? "master" : "prison";
  const prisonId = Number(day.context && day.context[targetType === "master" ? "masterId" : "prisonId"]) || 1;
  const remaining = Math.max(1, Number(day.target || 0) - Number(day.progress || 0));
  const identity = [monthly && monthly.year, monthly && monthly.month, day.dayId]
    .map((value) => String(value ?? "unknown"))
    .join("-");
  return {
    queueItemId: `monthly-${targetType}-${identity}`,
    targetType,
    targetId: prisonId,
    isDay: true,
    goalType: "runs",
    runTarget: remaining,
    completedRuns: 0,
    repeatCount: remaining,
    origin: "monthly",
    priority: 50,
    taskLabel: day.title || `Делюга · тюрьма #${prisonId}`,
  };
}

async function enqueueMonthlyPrisonRun(monthly, day, sessionPath) {
  const item = buildMonthlyPrisonQueueItem(monthly, day);
  if (!item) {
    return null;
  }
  const current = await getPrisonAutomationState(sessionPath);
  const duplicate = (current.queue || []).find((entry) => entry.queueItemId === item.queueItemId);
  if (duplicate) {
    return {
      type: "wait",
      reason: "prison_already_queued",
      queueItemId: duplicate.queueItemId,
      prisonId: duplicate.targetId,
    };
  }
  const saved = await updatePrisonAutomation({
    queue: [...(current.queue || []), item],
  }, sessionPath);
  return {
    type: "prison_queued",
    queued: true,
    queueItemId: item.queueItemId,
    prisonId: item.targetId,
    runs: item.runTarget,
    automationEnabled: saved.enabled,
  };
}

function getMonthlyQueueProgress(item, response) {
  const payload = getGamePayload(response);
  if (!isSuccessfulGameResponse(response) || !payload?.global || !payload?.user
    || typeof payload.active !== "boolean" || !Number.isInteger(payload.user.activeDayId)
    || !Array.isArray(payload.global.days) || !payload.user.days) return { checked: false };
  const monthly = normalizeMonthlyDashboard(response);
  const day = monthly.today;
  const expected = buildMonthlyPrisonQueueItem(monthly, day);
  if (!monthly.active || !day || day.completed || expected?.queueItemId !== item.queueItemId) {
    return { checked: true, finished: true };
  }
  return { checked: true, finished: false, remaining: Math.max(0, Number(day.target || 0) - Number(day.progress || 0)) };
}

async function executeMonthlyCheapAction(client, selfUserId, monthly, sessionPath, options = {}) {
  const policy = normalizeMonthlyPolicy(options);
  const today = applyMonthlyTargets(monthly.today, policy);
  if (!today || today.completed) {
    return { type: "wait", reason: today ? "already_completed" : "no_active_day" };
  }
  const rule = classifyMonthlyDay(today);
  if (!monthlyTaskEnabled(today.action, policy)) {
    return { type: "wait", reason: "task_category_disabled", action: today.action };
  }
  if (!rule.automatic) {
    return { type: "manual_required", reason: rule.cost, action: today.action, note: rule.note };
  }
  const remaining = Math.max(1, Number(today.target || 0) - Number(today.progress || 0));

  if (today.action === "PrisonRun" || (today.action === "MasterSession" && policy.queueMasterSessions)) {
    return enqueueMonthlyPrisonRun(monthly, today, sessionPath);
  }
  if (today.action === "MasterSession") {
    const item = buildMonthlyPrisonQueueItem(monthly, today);
    const current = await getPrisonAutomationState(sessionPath);
    if (current.queue.some((entry) => entry.queueItemId === item.queueItemId)) {
      return { type: "wait", reason: "master_already_queued", queueItemId: item.queueItemId };
    }
  }

  if (today.action === "PrisonEarnAuthority") {
    const business = normalizeBusinessDashboard(await client.business.all());
    const profitPlan = getMonthlyPrisonProfitPlan(today, business);
    if (profitPlan) {
      if (!profitPlan.canCollect) {
        return {
          type: "wait",
          reason: "business_profit_not_ready",
          profitRespect: profitPlan.profitRespect,
          collectAvailableAt: profitPlan.collectAvailableAt,
        };
      }
      const profitGate = await getZarubaProfitCollectionGate(client);
      if (!profitGate.canCollect) {
        return {
          type: "wait",
          reason: profitGate.reason,
          profitRespect: profitPlan.profitRespect,
          zaruba: profitGate,
        };
      }
      const response = await client.business.collect();
      return {
        type: "business_profit",
        ok: isSuccessfulGameResponse(response),
        profitRespect: profitPlan.profitRespect,
        data: getGamePayload(response),
      };
    }
  }

  if (rule.interactionType) {
    return {
      type: "interaction",
      action: today.action,
      result: await performMonthlyInteraction(client, selfUserId, rule.interactionType, Math.min(5, remaining)),
    };
  }
  if (today.action === "UseHomieHeat") {
    const result = await collectPodogrevForActiveZaruba(client);
    return result.executed
      ? { type: "podogrev", ok: result.ok, data: result }
      : { type: "wait", reason: result.reason, data: result };
  }
  if (today.action === "SendStashToPlayer") {
    return {
      type: "send_stash",
      result: await sendDuplicateStashes(client, selfUserId, Math.min(3, remaining), policy.stashRecipientId),
    };
  }
  if (today.action === "KillBoss") {
    const bossId = Number(today.context && today.context.bossId) || 1;
    const bossAutomation = await ensureBossAutomationLoaded();
    const alreadyQueued = (bossAutomation.queue || []).some((item) => Number(item.bossId) === bossId);
    if (!alreadyQueued) {
      const queueMutation = await applyAndSaveBossAutomationQueueOperations([{
        type: "append",
        item: { bossId, mode: "odin", label: `Ежедневка · босс #${bossId}` },
      }]);
      const saved = queueMutation.saved;
      if (shouldRunBossAutomationQueue(saved)) {
        setTimeout(() => void runBossAutomationTick({ reason: "monthly_quest" }), 0);
      }
      return { type: "boss_queued", bossId, automationEnabled: saved.enabled };
    }
    return { type: "wait", reason: "boss_already_queued", bossId };
  }
  if (today.action === "ScamGambler") {
    const started = await client.post("/api/card/start", { json: {} });
    if (!isSuccessfulGameResponse(started)) {
      return { type: "katala", ok: false, stage: "start", data: getGamePayload(started) };
    }
    const finished = await client.post("/api/card/finish", { json: {} });
    const result = { type: "katala", ok: isSuccessfulGameResponse(finished), stage: "finish", data: getGamePayload(finished) };
    await appendMiniGameHistory({ action: "katala-auto", ok: result.ok, data: result.data });
    return result;
  }
  return runMonthlyEnergyAction(client, today);
}

function millisecondsUntilNextGameDay(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(21, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function collectMonthlyEnergyRequirements(monthlyResponse, policy = normalizeMonthlyPolicy()) {
  const payload = getGamePayload(monthlyResponse) || {};
  const days = payload.global && Array.isArray(payload.global.days) ? payload.global.days : [];
  const masterIds = new Set();
  const prisonIds = new Set();

  for (const rawDay of days) {
    const day = applyMonthlyTargets(rawDay, policy);
    if (day.action === "MasterSession") {
      masterIds.add(Number(day.context && day.context.masterId) || 1);
    }
    if (day.action === "MasterEarnIntellect") {
      masterIds.add(Number(day.context?.masterId) || policy.intellectMasterId);
    }
    if (day.action === "PrisonRun") {
      prisonIds.add(Number(day.context && day.context.prisonId) || 1);
    }
    if (day.action === "PrisonEarnAuthority") {
      // Keep the estimate aligned with runMonthlyEnergyAction().
      prisonIds.add(Number(day.context?.prisonId) || policy.authorityPrisonId);
    }
  }

  return {
    masterIds: [...masterIds].filter((id) => Number.isFinite(id) && id > 0).sort((left, right) => left - right),
    prisonIds: [...prisonIds].filter((id) => Number.isFinite(id) && id > 0).sort((left, right) => left - right),
  };
}

async function loadMonthlyEnergySources(client, monthlyResponse, policy) {
  const requirements = collectMonthlyEnergyRequirements(monthlyResponse, policy);
  const key = JSON.stringify(requirements);
  const now = Date.now();
  if (
    monthlyEnergySourcesCache.key === key
    && now - monthlyEnergySourcesCache.loadedAt < MONTHLY_ENERGY_SOURCES_CACHE_TTL_MS
  ) {
    return monthlyEnergySourcesCache.sources;
  }

  const readOptions = { throttle: false };
  const needMasters = requirements.masterIds.length > 0;
  const needPrisons = requirements.prisonIds.length > 0;
  const [mastersResponse, prisonsResponse] = await Promise.all([
    needMasters ? client.masters.all(readOptions) : Promise.resolve(null),
    needPrisons ? client.prisons.all(readOptions) : Promise.resolve(null),
  ]);
  const mastersPayload = getGamePayload(mastersResponse) || {};
  const prisonsPayload = getGamePayload(prisonsResponse) || {};
  const mastersById = new Map((Array.isArray(mastersPayload.masters) ? mastersPayload.masters : [])
    .map((master) => [Number(master.id), master]));
  const prisonsById = new Map((Array.isArray(prisonsPayload.prisons) ? prisonsPayload.prisons : [])
    .map((prison) => [Number(prison.id), prison]));

  const [masterEntries, prisonEntries] = await Promise.all([
    Promise.all(requirements.masterIds.map(async (masterId) => {
      const master = mastersById.get(masterId) || { id: masterId };
      const response = await client.masters.enter(masterId, readOptions);
      return [String(masterId), normalizeMasterEnterResponse(response, master)];
    })),
    Promise.all(requirements.prisonIds.map(async (prisonId) => {
      const detail = await loadPrisonDetail(client, prisonId, readOptions);
      return [String(prisonId), {
        ...detail.view,
        name: prisonsById.get(prisonId)?.name || `Тюрьма #${prisonId}`,
      }];
    })),
  ]);

  const sources = {
    masters: Object.fromEntries(masterEntries),
    prisons: Object.fromEntries(prisonEntries),
  };
  monthlyEnergySourcesCache = { loadedAt: now, key, sources };
  return sources;
}

async function buyMonthlyDay(options = {}, sessionPath) {
  return runMiscAutomationSerialized(() => withContext(sessionPath, async ({ client }) => {
    try {
      return await purchaseMonthlyDay(client, options);
    } finally {
      invalidateMiscDashboardCache();
    }
  }));
}

async function runMiscAutomationTick(options = {}, sessionPath) {
  return runMiscAutomationSerialized(async () => {
    const state = await ensureMiscAutomationLoaded(sessionPath);
    if (!state.enabled && !options.force) {
      return { ok: true, skipped: true, reason: "disabled", automation: buildMiscAutomationView(state) };
    }
    if (miscAutomationRuntime.running) {
      return { ok: true, skipped: true, reason: "already_running", automation: buildMiscAutomationView(state) };
    }
    miscAutomationRuntime.running = true;
    miscAutomationRuntime.tickCount += 1;
    try {
      const result = await withContext(sessionPath, async ({ client, selfUserId }) => {
        let monthly = normalizeMonthlyDashboard(await client.get("/api/monthly/state"), state);
        const claims = [];
        for (const tier of state.claimRewards ? monthly.claimableTiers : []) {
          const response = await client.post("/api/monthly/claim", { json: { Tier: tier } });
          claims.push({ tier, ok: isSuccessfulGameResponse(response), data: getGamePayload(response) });
        }
        if (claims.length > 0) {
          monthly = normalizeMonthlyDashboard(await client.get("/api/monthly/state"), state);
        }
        const action = await executeMonthlyCheapAction(client, selfUserId, monthly, sessionPath, state);
        return { monthly, claims, action };
      });
      state.lastCheckAt = new Date().toISOString();
      state.lastAction = result.action;
      state.lastError = null;
      const saved = await saveMiscAutomationState(state);
      return { ok: true, skipped: false, ...result, automation: buildMiscAutomationView(saved) };
    } catch (error) {
      state.lastCheckAt = new Date().toISOString();
      state.lastError = error && error.message ? error.message : String(error);
      await saveMiscAutomationState(state);
      return { ok: false, error: state.lastError, automation: buildMiscAutomationView(state) };
    } finally {
      miscAutomationRuntime.running = false;
    }
  });
}

async function initializeMiscAutomation(sessionPath) {
  const state = await ensureMiscAutomationLoaded(sessionPath);
  if (state.enabled) {
    setTimeout(() => void runMiscAutomationTick({ reason: "initialize" }, sessionPath), 0);
  }
  const fartovyAutoSpin = await loadFartovyAutoSpinSettings(sessionPath);
  if (fartovyAutoSpin.enabled) {
    setTimeout(() => {
      void withContext(sessionPath, async ({ client }) => {
        await ensureFartovyAutoSpinRunning(client, fartovyAutoSpin);
      }).catch((error) => {
        logEvent("misc.fartovy.autospin_start_error", { error });
      });
    }, 0);
  }
  if (!fartovyAutoSpinSupervisorTimerId) {
    fartovyAutoSpinSupervisorTimerId = setInterval(() => {
      void runFartovyAutoSpinSupervisor(sessionPath);
    }, FARTOVY_AUTOSPIN_SUPERVISOR_INTERVAL_MS);
    fartovyAutoSpinSupervisorTimerId.unref?.();
  }
  return buildMiscAutomationView(state);
}

async function getMiscAutomationState(sessionPath) {
  return buildMiscAutomationView(await ensureMiscAutomationLoaded(sessionPath));
}

async function updateMiscAutomation(options = {}, sessionPath) {
  return runMiscAutomationSerialized(async () => {
    const current = await ensureMiscAutomationLoaded(sessionPath);
    const next = await saveMiscAutomationState({ ...current, ...options });
    invalidateMiscDashboardCache();
    applyMiscAutomationTimer(next);
    if (next.enabled) {
      setTimeout(() => void runMiscAutomationTick({ reason: "state_update" }, miscAutomationRuntime.sessionPath), 0);
    }
    return buildMiscAutomationView(next);
  });
}

function buildVparitRuntimeView() {
  const startedAtMs = Date.parse(miscVparitRuntime.startedAt || "");
  const finishedAtMs = miscVparitRuntime.running
    ? Date.now()
    : Date.parse(miscVparitRuntime.finishedAt || "");
  const elapsedMs = Number.isFinite(startedAtMs) && Number.isFinite(finishedAtMs)
    ? Math.max(0, finishedAtMs - startedAtMs)
    : 0;
  const sellingStartedAtMs = Date.parse(miscVparitRuntime.sellingStartedAt || "");
  const sellingFinishedAtMs = miscVparitRuntime.running
    ? Date.now()
    : Date.parse(miscVparitRuntime.sellingFinishedAt || miscVparitRuntime.finishedAt || "");
  const sellingElapsedMs = Number.isFinite(sellingStartedAtMs) && Number.isFinite(sellingFinishedAtMs)
    ? Math.max(0, sellingFinishedAtMs - sellingStartedAtMs)
    : 0;
  const planned = Math.max(0, Number(miscVparitRuntime.planned) || 0);
  const processed = Math.max(0, Number(miscVparitRuntime.processed) || 0);
  const remaining = Math.max(0, planned - processed);
  const ratePerSecond = processed > 0 && sellingElapsedMs > 0
    ? processed / (sellingElapsedMs / 1000)
    : null;
  const estimatedRemainingMs = ratePerSecond
    ? Math.ceil((remaining / ratePerSecond) * 1000)
    : null;

  return {
    running: miscVparitRuntime.running,
    phase: miscVparitRuntime.phase,
    startedAt: miscVparitRuntime.startedAt,
    finishedAt: miscVparitRuntime.finishedAt,
    sellingStartedAt: miscVparitRuntime.sellingStartedAt,
    sellingFinishedAt: miscVparitRuntime.sellingFinishedAt,
    planned,
    processed,
    sold: miscVparitRuntime.sold,
    failed: miscVparitRuntime.failed,
    rateLimitRetries: miscVparitRuntime.rateLimitRetries,
    elapsedMs,
    sellingElapsedMs,
    remaining,
    ratePerSecond,
    estimatedRemainingMs,
    failures: Array.isArray(miscVparitRuntime.failures) ? miscVparitRuntime.failures : [],
    rewards: { ...miscVparitRuntime.rewards },
    authority: miscVparitRuntime.authority,
    rewardsMeasured: miscVparitRuntime.rewardsMeasured,
    resourceSnapshotError: miscVparitRuntime.resourceSnapshotError,
    current: miscVparitRuntime.current,
    lastError: miscVparitRuntime.lastError,
    lastResult: miscVparitRuntime.lastResult,
  };
}

function getVparitStatus() {
  return buildVparitRuntimeView();
}

function recoverLegacyVparitView(view, stashes) {
  const last = view && view.lastResult;
  const hasRecordedReward = last && Object.values(last.rewards || {}).some((value) => Number(value || 0) !== 0);
  if (!last || hasRecordedReward || Number(last.sold || 0) <= 0 || Number(last.planned || 0) <= Number(stashes.totals.totalCollections || 0)) {
    return view;
  }
  const soldSets = (stashes.zones || []).flatMap((zone) => zone.sets || []).filter((set) => set.sellableCycles === 0);
  if (soldSets.length !== Number(last.sold || 0)) {
    return view;
  }
  const rewards = soldSets.reduce((total, set) => addAmounts(total, set.rewardsPerCycle || {}), {});
  return {
    ...view,
    lastResult: {
      ...last,
      rewards,
      authority: Number(rewards.authority || 0),
      recoveredRewards: true,
    },
  };
}

async function loadLastVparitResult() {
  if (miscVparitRuntime.lastResult) {
    return miscVparitRuntime.lastResult;
  }
  try {
    miscVparitRuntime.lastResult = JSON.parse(await fs.readFile(MISC_VPARIT_LATEST_PATH, "utf8"));
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }
  return miscVparitRuntime.lastResult;
}

function getVparitFailureMessage(response) {
  const envelope = getGamePayload(response);
  const payload = envelope && envelope.data && typeof envelope.data === "object"
    ? envelope.data
    : envelope;
  const message = typeof payload === "string"
    ? payload
    : payload && typeof payload === "object"
      ? payload.message || payload.error || envelope.message || envelope.error
      : null;

  if (message) {
    return String(message).replace(/\s+/g, " ").trim().slice(0, 240);
  }
  return `HTTP ${response && response.status ? response.status : "error"}`;
}

async function executeVparitAll(client, selfUserId) {
  miscVparitRuntime.running = true;
  miscVparitRuntime.phase = "preparing";
  miscVparitRuntime.startedAt = new Date().toISOString();
  miscVparitRuntime.finishedAt = null;
  miscVparitRuntime.sellingStartedAt = null;
  miscVparitRuntime.sellingFinishedAt = null;
  miscVparitRuntime.planned = 0;
  miscVparitRuntime.processed = 0;
  miscVparitRuntime.sold = 0;
  miscVparitRuntime.failed = 0;
  miscVparitRuntime.rateLimitRetries = 0;
  miscVparitRuntime.failures = [];
  miscVparitRuntime.rewards = {};
  miscVparitRuntime.authority = 0;
  miscVparitRuntime.rewardsMeasured = false;
  miscVparitRuntime.resourceSnapshotError = null;
  miscVparitRuntime.current = null;
  miscVparitRuntime.lastError = null;
  let beforeResources = null;

  try {
    const dashboard = normalizeStashDashboard(await client.collection.full(selfUserId, {
      throttle: false,
      rateLimitRetries: VPARIT_RATE_LIMIT_RETRIES,
    }));
    const queue = dashboard.zones.flatMap((zone) => zone.sets
      .filter((set) => set.sellableCycles > 0)
      .flatMap((set) => Array.from({ length: set.sellableCycles }, (_, cycleIndex) => ({
        prisonId: set.prisonId,
        collectionId: set.collectionId,
        collectionName: set.name,
        cycleIndex: cycleIndex + 1,
        cycleCount: set.sellableCycles,
      }))));
    miscVparitRuntime.planned = queue.length;

    if (queue.length > 0) {
      const beforeResponse = await client.players.init({
        throttle: false,
        rateLimitRetries: VPARIT_RATE_LIMIT_RETRIES,
      });
      if (isSuccessfulGameResponse(beforeResponse)) {
        beforeResources = normalizePlayerResourceSnapshot(beforeResponse);
      } else {
        miscVparitRuntime.resourceSnapshotError = `Не удалось снять баланс до впаривания: ${getVparitFailureMessage(beforeResponse)}`;
      }
    }

    miscVparitRuntime.phase = queue.length > 0 ? "selling" : "verifying";
    miscVparitRuntime.sellingStartedAt = queue.length > 0 ? new Date().toISOString() : null;
    for (let index = 0; index < queue.length; index += 1) {
      const item = queue[index];
      miscVparitRuntime.current = item;
      const response = await client.collection.vparit({
        userId: selfUserId,
        prisonId: item.prisonId,
        collectionId: item.collectionId,
      }, {
        throttle: false,
        rateLimitRetries: VPARIT_RATE_LIMIT_RETRIES,
      });
      miscVparitRuntime.processed += 1;
      miscVparitRuntime.rateLimitRetries += Math.max(0, Number(response.rateLimitRetries) || 0);
      if (isSuccessfulGameResponse(response)) {
        miscVparitRuntime.sold += 1;
      } else {
        miscVparitRuntime.failed += 1;
        if (miscVparitRuntime.failures.length < 20) {
          miscVparitRuntime.failures.push({
            prisonId: item.prisonId,
            collectionId: item.collectionId,
            collectionName: item.collectionName,
            message: getVparitFailureMessage(response),
          });
        }
      }

      if (VPARIT_REQUEST_INTERVAL_MS > 0 && index < queue.length - 1) {
        await sleep(VPARIT_REQUEST_INTERVAL_MS);
      }
    }
    miscVparitRuntime.sellingFinishedAt = miscVparitRuntime.sellingStartedAt
      ? new Date().toISOString()
      : null;
    miscVparitRuntime.phase = "verifying";
  } catch (error) {
    miscVparitRuntime.lastError = error && error.message ? error.message : String(error);
  } finally {
    miscVparitRuntime.phase = "verifying";
    if (beforeResources && beforeResources.available && miscVparitRuntime.sold > 0) {
      try {
        const afterResponse = await client.players.init({
          throttle: false,
          rateLimitRetries: VPARIT_RATE_LIMIT_RETRIES,
        });
        if (!isSuccessfulGameResponse(afterResponse)) {
          miscVparitRuntime.resourceSnapshotError = `Не удалось снять баланс после впаривания: ${getVparitFailureMessage(afterResponse)}`;
        } else {
          const delta = calculatePlayerResourceDelta(beforeResources, normalizePlayerResourceSnapshot(afterResponse));
          if (delta) {
            miscVparitRuntime.rewards = delta.currencies;
            miscVparitRuntime.authority = delta.authority;
            miscVparitRuntime.rewardsMeasured = true;
          } else {
            miscVparitRuntime.resourceSnapshotError = "Баланс после впаривания не содержит данных о ресурсах.";
          }
        }
      } catch (error) {
        miscVparitRuntime.resourceSnapshotError = `Не удалось сверить полученные ресурсы: ${error && error.message ? error.message : String(error)}`;
      }
    }
    // The cached dashboard still contains the inventory from before the sale.
    // Invalidate it before exposing the completed runtime so the first client
    // poll that observes `running: false` reloads the updated collections.
    invalidateMiscDashboardCache();
    miscVparitRuntime.running = false;
    miscVparitRuntime.finishedAt = new Date().toISOString();
    miscVparitRuntime.current = null;
    miscVparitRuntime.phase = miscVparitRuntime.lastError ? "failed" : "completed";
    const finishedView = buildVparitRuntimeView();
    miscVparitRuntime.lastResult = {
      startedAt: miscVparitRuntime.startedAt,
      finishedAt: miscVparitRuntime.finishedAt,
      planned: miscVparitRuntime.planned,
      processed: miscVparitRuntime.processed,
      sold: miscVparitRuntime.sold,
      failed: miscVparitRuntime.failed,
      rateLimitRetries: miscVparitRuntime.rateLimitRetries,
      elapsedMs: finishedView.elapsedMs,
      sellingElapsedMs: finishedView.sellingElapsedMs,
      ratePerSecond: finishedView.ratePerSecond,
      failures: [...miscVparitRuntime.failures],
      rewards: { ...miscVparitRuntime.rewards },
      authority: miscVparitRuntime.authority,
      rewardsMeasured: miscVparitRuntime.rewardsMeasured,
      resourceSnapshotError: miscVparitRuntime.resourceSnapshotError,
      error: miscVparitRuntime.lastError,
    };
    await fs.mkdir(path.dirname(MISC_VPARIT_LATEST_PATH), { recursive: true });
    await fs.writeFile(MISC_VPARIT_LATEST_PATH, `${JSON.stringify(miscVparitRuntime.lastResult, null, 2)}\n`, "utf8");
  }
}

async function startVparitAll(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    if (miscVparitRuntime.running) {
      return { started: false, reason: "already_running", job: buildVparitRuntimeView() };
    }
    miscVparitPromise = executeVparitAll(client, selfUserId).catch((error) => {
      miscVparitRuntime.lastError = error && error.message ? error.message : String(error);
    });
    return { started: true, job: buildVparitRuntimeView() };
  });
}

function unwrapMiniGamePayload(value) {
  let payload = value && Object.prototype.hasOwnProperty.call(value, "data") ? value.data : value;

  for (let depth = 0; depth < 3; depth += 1) {
    if (!payload || typeof payload !== "object" || !Object.prototype.hasOwnProperty.call(payload, "data")) {
      break;
    }
    if (payload.success === false) {
      break;
    }
    payload = payload.data;
  }

  return payload || {};
}

function getMiniGameFailureMessage(result, fallback = "Game action was rejected") {
  const payload = result && result.data && typeof result.data === "object" ? result.data : result;
  return String(
    (payload && (payload.error || payload.message || payload.reason))
    || (result && result.error)
    || fallback,
  );
}

async function performMiniGameRequest(client, action, pathname, payload = {}, options = {}) {
  let wearableInventoryBefore = null;
  if (options.captureWearableDelta === true) {
    try {
      wearableInventoryBefore = await loadMiniGameWearableInventory(client);
    } catch (error) {
      logEvent("ui-service", "Could not capture wearable inventory before a mini-game reward", {
        action,
        error: error && error.message,
      });
    }
  }

  const response = await client.post(pathname, {
    json: payload,
    rateLimitRetries: Math.max(0, Number(options.rateLimitRetries) || 0),
  });
  const result = {
    action,
    ok: isSuccessfulGameResponse(response),
    status: response.status,
    data: unwrapMiniGamePayload(response),
  };

  result.newWearables = [];
  if (result.ok && wearableInventoryBefore) {
    const retries = Math.max(0, Math.min(3, Number(options.wearableDeltaRetries) || 0));
    try {
      let wearableInventoryAfter = await loadMiniGameWearableInventory(client);
      let newWearables = buildMiniGameWearableInventoryDelta(wearableInventoryBefore, wearableInventoryAfter);
      for (let attempt = 0; newWearables.length === 0 && attempt < retries; attempt += 1) {
        await sleep(300);
        wearableInventoryAfter = await loadMiniGameWearableInventory(client);
        newWearables = buildMiniGameWearableInventoryDelta(wearableInventoryBefore, wearableInventoryAfter);
      }
      const catalog = await loadMiniGameWearableCatalog();
      result.newWearables = resolveMiniGameWearableRefs(newWearables, catalog);
    } catch (error) {
      logEvent("ui-service", "Could not capture wearable inventory after a mini-game reward", {
        action,
        error: error && error.message,
      });
    }
  }

  result.history = await appendMiniGameHistory(result);
  return result;
}

function normalizeKatalaRank(value) {
  const rank = String(value || "").trim().toUpperCase();
  if (rank === "T") {
    return "10";
  }
  return /^(?:A|K|Q|J|10|[2-9])$/.test(rank) ? rank : null;
}

function extractKatalaRank(card) {
  return normalizeKatalaRank(String(card || "").split("_")[0]);
}

function normalizeKatalaTargets(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[\s,;]+/);
  const targets = [];

  for (const rawTarget of source) {
    const ranks = String(rawTarget || "").toUpperCase().match(/10|[2-9AJQK]/g) || [];
    if (ranks.length !== 2) {
      continue;
    }
    const normalized = ranks.map(normalizeKatalaRank);
    if (normalized.every(Boolean)) {
      const code = katalaCombinationCode(normalized[0], normalized[1]);
      if (code && !targets.includes(code)) {
        targets.push(code);
      }
    }
  }

  return targets.slice(0, 24);
}

function katalaCombinationCode(first, second) {
  const ranks = [normalizeKatalaRank(first), normalizeKatalaRank(second)];
  if (!ranks[0] || !ranks[1]) {
    return null;
  }

  const order = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  const [left, right] = ranks.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return `${left}${right}`;
}

function getKatalaCards(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  if (source.card1 && source.card2) {
    return [source.card1, source.card2];
  }
  if (Array.isArray(source.cards) && source.cards.length >= 2) {
    return source.cards.slice(0, 2);
  }
  return [];
}

function chooseKatalaRerollIndex(cards, targets) {
  const ranks = cards.map(extractKatalaRank);
  for (let index = 0; index < ranks.length; index += 1) {
    if (ranks[index] && targets.some((target) => target.includes(ranks[index]))) {
      return index === 0 ? 1 : 0;
    }
  }
  return 0;
}

function getKatalaAttemptDecision({ combination, targets, attemptsCompleted, maxAttempts, stopRequested }) {
  const matched = Array.isArray(targets) && targets.includes(combination);
  if (stopRequested) {
    return { matched, continuePlaying: false, reason: "stopped" };
  }
  if (attemptsCompleted >= maxAttempts) {
    return { matched, continuePlaying: false, reason: "completed" };
  }
  return { matched, continuePlaying: true, reason: null };
}

function clampMiniGameNumber(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, parsed));
}

function runMiniGameSerialized(kind, operation) {
  const key = String(kind || "unknown");
  const previous = miniGameSerializedOperations.get(key) || Promise.resolve();
  const run = previous.catch(() => undefined).then(operation);
  const barrier = run.then(() => undefined, () => undefined);
  miniGameSerializedOperations.set(key, barrier);
  void barrier.then(() => {
    if (miniGameSerializedOperations.get(key) === barrier) {
      miniGameSerializedOperations.delete(key);
    }
  });
  return run;
}

function getMiniGameState(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  return source.state && typeof source.state === "object" ? source.state : source;
}

function pickMiniGameBalance(sources, aliases) {
  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }
    for (const alias of aliases) {
      if (!Object.prototype.hasOwnProperty.call(source, alias)) {
        continue;
      }
      const value = Number(source[alias]);
      if (Number.isFinite(value)) {
        return Math.max(0, value);
      }
    }
  }
  return 0;
}

function normalizeMiniGameBalances({ currencies = {}, fartovy = {}, katala = {}, poker = {}, wheel = {} } = {}) {
  return {
    fartovy: {
      green_matches: pickMiniGameBalance([fartovy, currencies], ["slotsGrass", "greenMatches", "green_matches"]),
      orange_matches: pickMiniGameBalance([fartovy, currencies], ["slotsOrenge", "slotsOrange", "orangeMatches", "orange_matches"]),
      red_matches: pickMiniGameBalance([fartovy, currencies], ["slotsRed", "redMatches", "red_matches"]),
      rubles: pickMiniGameBalance([fartovy, currencies], ["rubles"]),
    },
    katala: {
      rubles: pickMiniGameBalance([katala, currencies], ["rubles"]),
    },
    poker: {
      chips: pickMiniGameBalance([poker, currencies], ["chips"]),
      pink_matches: pickMiniGameBalance([poker, currencies], ["pinkMatches", "pink_matches"]),
      soap: pickMiniGameBalance([poker, currencies], ["soap"]),
    },
    wheel: {
      fortune_tickets: pickMiniGameBalance([wheel, currencies], ["tickets", "fortuneTickets", "fortune_tickets"]),
      blue_matches: pickMiniGameBalance([wheel, currencies], ["blueMatches", "blue_matches"]),
      rubles: pickMiniGameBalance([wheel, currencies], ["rubles"]),
    },
  };
}

async function getSlotsGameState(client) {
  const response = await client.get("/api/slots-game/info");
  if (!isSuccessfulGameResponse(response)) {
    throw new Error(getMiniGameFailureMessage({ data: unwrapMiniGamePayload(response) }, "Could not load Fartovy state"));
  }
  return getMiniGameState(unwrapMiniGamePayload(response));
}

async function resolveZarubaSlotsBonus(client, initialState) {
  let state = initialState && typeof initialState === "object"
    ? initialState
    : await getSlotsGameState(client);
  let nextBoxId = 1;

  for (let guard = 0; guard < 8 && state.bonusActive; guard += 1) {
    const opened = await performMiniGameRequest(
      client,
      "fartovy-bonus-open-zaruba",
      "/api/slots-game/bonus/open-box",
      { boxId: nextBoxId },
      { rateLimitRetries: 3 },
    );
    if (!opened.ok) {
      return {
        ok: false,
        state,
        reason: getMiniGameFailureMessage(opened, "bonus_open_failed"),
      };
    }
    const outcome = opened.data || {};
    const superGame = outcome.superGame && typeof outcome.superGame === "object"
      ? outcome.superGame
      : null;
    if (superGame && superGame.available && !superGame.resolved) {
      const resolved = await performMiniGameRequest(
        client,
        "fartovy-bonus-super-zaruba",
        "/api/slots-game/bonus/open-box",
        { superGame: true, side: "left" },
        { rateLimitRetries: 3 },
      );
      if (!resolved.ok) {
        return {
          ok: false,
          state,
          reason: getMiniGameFailureMessage(resolved, "super_game_failed"),
        };
      }
    }
    state = await getSlotsGameState(client);
    if (String(outcome.boxResult || "").toLowerCase() === "fail") {
      break;
    }
    nextBoxId += 1;
  }

  return {
    ok: !state.bonusActive,
    state,
    reason: state.bonusActive ? "slots_bonus_incomplete" : null,
  };
}

async function getWheelGameState(client) {
  const response = await client.get("/api/wheel/state");
  if (!isSuccessfulGameResponse(response)) {
    throw new Error(getMiniGameFailureMessage({ data: unwrapMiniGamePayload(response) }, "Could not load Fortune state"));
  }
  return getMiniGameState(unwrapMiniGamePayload(response));
}

async function getKatalaGameState(client) {
  const response = await client.get("/api/card/state");
  if (!isSuccessfulGameResponse(response)) {
    throw new Error(getMiniGameFailureMessage({ data: unwrapMiniGamePayload(response) }, "Could not load Katala state"));
  }
  return getMiniGameState(unwrapMiniGamePayload(response));
}

function getSlotsSpinAvailability(state, bet) {
  const source = state && typeof state === "object" ? state : {};
  const freeSpins = Math.max(0, Number(source.freeSpins) || 0);
  const slotsGrass = Math.max(0, Number(source.slotsGrass) || 0);
  const requiredBet = clampMiniGameNumber(bet, 1, 1, 10);
  return {
    freeSpins,
    slotsGrass,
    requiredBet,
    canSpin: freeSpins > 0 || slotsGrass >= requiredBet,
  };
}

function shouldSetFartovyBet(state, bet) {
  const currentBet = Number(state && state.bet);
  const requestedBet = clampMiniGameNumber(bet, 1, 1, 10);
  return !Number.isFinite(currentBet) || currentBet !== requestedBet;
}

function normalizeFartovyAutoSpinSettings(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: source.enabled === true,
    bet: clampMiniGameNumber(source.bet, 1, 1, 10),
    autoBonus: source.autoBonus !== false,
    maxSpins: clampMiniGameNumber(source.maxSpins, 100, 1, 10_000),
    delayMs: clampMiniGameNumber(source.delayMs, 1_000, 250, 60_000),
    superGameSide: source.superGameSide === "right" ? "right" : "left",
  };
}

async function loadFartovyAutoSpinSettings(sessionPath) {
  const context = await resolvePrisonAutomationAccountContext(sessionPath);
  if (fartovyAutoSpinSettingsCache && fartovyAutoSpinSettingsAccountId === context.accountId) {
    return { ...fartovyAutoSpinSettingsCache };
  }
  const settingsPath = getAccountArtifactPath(context.accountId, "fartovy-autospin-settings.json");
  try {
    const raw = JSON.parse(await fs.readFile(settingsPath, "utf8"));
    fartovyAutoSpinSettingsCache = normalizeFartovyAutoSpinSettings(raw);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      logEvent("ui-service", "Fartovy autospin settings could not be read; using safe defaults", { error: error && error.message });
    }
    fartovyAutoSpinSettingsCache = normalizeFartovyAutoSpinSettings();
  }
  fartovyAutoSpinSettingsAccountId = context.accountId;
  return { ...fartovyAutoSpinSettingsCache };
}

async function saveFartovyAutoSpinSettings(raw, sessionPath) {
  const context = await resolvePrisonAutomationAccountContext(sessionPath);
  const settingsPath = getAccountArtifactPath(context.accountId, "fartovy-autospin-settings.json");
  fartovyAutoSpinSettingsCache = normalizeFartovyAutoSpinSettings(raw);
  fartovyAutoSpinSettingsAccountId = context.accountId;
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(
    settingsPath,
    `${JSON.stringify(fartovyAutoSpinSettingsCache, null, 2)}\n`,
    "utf8",
  );
  return { ...fartovyAutoSpinSettingsCache };
}

async function waitForSlotsSpinAvailability(client, initialState, bet) {
  let state = initialState;

  while (!shouldStopMiniGameAutomation()) {
    const availability = getSlotsSpinAvailability(state, bet);
    if (availability.canSpin) {
      return { state, availability };
    }

    miscMiniGameAutomationRuntime.current = `Фартовый · ждёт ${availability.requiredBet} зелёных спичек (${availability.slotsGrass}/${availability.requiredBet})`;
    await sleep(SLOTS_AUTOSPIN_POLL_INTERVAL_MS);
    if (shouldStopMiniGameAutomation()) {
      break;
    }
    state = await getSlotsGameState(client);
  }

  return { state, availability: getSlotsSpinAvailability(state, bet) };
}

function buildMiniGameAutomationView() {
  return {
    running: miscMiniGameAutomationRuntime.running,
    stopRequested: miscMiniGameAutomationRuntime.stopRequested,
    kind: miscMiniGameAutomationRuntime.kind,
    startedAt: miscMiniGameAutomationRuntime.startedAt,
    finishedAt: miscMiniGameAutomationRuntime.finishedAt,
    settings: miscMiniGameAutomationRuntime.settings ? { ...miscMiniGameAutomationRuntime.settings } : null,
    planned: miscMiniGameAutomationRuntime.planned,
    processed: miscMiniGameAutomationRuntime.processed,
    successes: miscMiniGameAutomationRuntime.successes,
    bonusRounds: miscMiniGameAutomationRuntime.bonusRounds,
    spent: { ...miscMiniGameAutomationRuntime.spent },
    current: miscMiniGameAutomationRuntime.current,
    lastOutcome: miscMiniGameAutomationRuntime.lastOutcome,
    lastError: miscMiniGameAutomationRuntime.lastError,
    reason: miscMiniGameAutomationRuntime.reason,
    lastResult: miscMiniGameAutomationRuntime.lastResult,
  };
}

function resetMiniGameAutomationRuntime(kind, settings, planned) {
  Object.assign(miscMiniGameAutomationRuntime, {
    running: true,
    stopRequested: false,
    kind,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    settings,
    planned,
    processed: 0,
    successes: 0,
    bonusRounds: 0,
    spent: {},
    current: null,
    lastOutcome: null,
    lastError: null,
    reason: null,
    lastResult: null,
  });
}

function rememberMiniGameAutomationResult(result) {
  miscMiniGameAutomationRuntime.lastOutcome = {
    action: result.action,
    ok: result.ok,
    outcome: result.history && result.history.outcome
      ? result.history.outcome
      : normalizeMiniGameOutcome(result.data, null, { newWearables: result.newWearables }),
  };
}

async function performAutomatedMiniGameRequest(client, action, pathname, payload, options = {}) {
  const result = await performMiniGameRequest(client, action, pathname, payload, {
    ...options,
    rateLimitRetries: 3,
  });
  rememberMiniGameAutomationResult(result);
  return result;
}

function shouldStopMiniGameAutomation() {
  return miscMiniGameAutomationRuntime.stopRequested;
}

async function resolveSlotsBonusGame(client, options, initialState) {
  let state = initialState && typeof initialState === "object" ? initialState : await getSlotsGameState(client);
  let nextBoxId = 1;

  for (let guard = 0; guard < 8 && state.bonusActive && !shouldStopMiniGameAutomation(); guard += 1) {
    miscMiniGameAutomationRuntime.current = "Разыгрывает бонус Фартового";
    const result = await performAutomatedMiniGameRequest(client, "fartovy-bonus-open-auto", "/api/slots-game/bonus/open-box", {
      boxId: nextBoxId,
    });
    miscMiniGameAutomationRuntime.bonusRounds += 1;
    if (!result.ok) {
      miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(result, "bonus_open_failed");
      return state;
    }

    const outcome = result.data || {};
    const superGame = outcome.superGame && typeof outcome.superGame === "object" ? outcome.superGame : null;
    if (superGame && superGame.available && !superGame.resolved && !shouldStopMiniGameAutomation()) {
      const side = options.superGameSide === "right" ? "right" : "left";
      const superResult = await performAutomatedMiniGameRequest(
        client,
        "fartovy-bonus-super-auto",
        "/api/slots-game/bonus/open-box",
        { superGame: true, side },
      );
      miscMiniGameAutomationRuntime.bonusRounds += 1;
      if (!superResult.ok) {
        miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(superResult, "super_game_failed");
        return state;
      }
    }

    state = await getSlotsGameState(client);
    if (String(outcome.boxResult || "").toLowerCase() === "fail") {
      break;
    }
    nextBoxId += 1;
  }

  return state;
}

async function runKatalaAutomation(client, options) {
  const targets = normalizeKatalaTargets(options.targets);
  if (targets.length === 0) {
    throw new Error("Choose at least one Katala combination, for example AA or AK.");
  }

  const initialState = await getKatalaGameState(client);
  const level = Number(initialState.level) || 0;
  const maxRerolls = level >= 60 ? 2 : level >= 20 ? 1 : 0;
  const freeOnly = options.freeOnly === true;
  const maxAttempts = freeOnly
    ? 1
    : clampMiniGameNumber(options.maxAttempts, 1, 1, 1_000);
  const delayMs = clampMiniGameNumber(options.delayMs, 900, 500, 60_000);
  miscMiniGameAutomationRuntime.planned = maxAttempts;
  miscMiniGameAutomationRuntime.settings = {
    targets,
    maxAttempts,
    maxRerolls,
    delayMs,
    freeOnly,
  };

  for (let attempt = 0; attempt < maxAttempts && !shouldStopMiniGameAutomation(); attempt += 1) {
    miscMiniGameAutomationRuntime.current = `Катала · партия ${attempt + 1} из ${maxAttempts}`;
    const started = await performAutomatedMiniGameRequest(client, "katala-start-auto", "/api/card/start", {});
    if (!started.ok) {
      miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(started, "katala_start_failed");
      break;
    }

    miscMiniGameAutomationRuntime.processed += 1;
    const spentKey = freeOnly ? "freeAttempts" : "rubles";
    miscMiniGameAutomationRuntime.spent[spentKey] = (miscMiniGameAutomationRuntime.spent[spentKey] || 0) + 1;
    let cards = getKatalaCards(started.data);
    let combination = katalaCombinationCode(extractKatalaRank(cards[0]), extractKatalaRank(cards[1]));

    for (let reroll = 0; reroll < maxRerolls && !shouldStopMiniGameAutomation() && !targets.includes(combination); reroll += 1) {
      // The game commits a newly dealt card after its flip animation. Its API
      // rejects an earlier reroll, so keep a conservative player-like pause.
      await sleep(delayMs);
      const cardIndex = chooseKatalaRerollIndex(cards, targets);
      const rerolled = await performAutomatedMiniGameRequest(client, "katala-reroll-auto", "/api/card/reroll", { cardIndex });
      if (!rerolled.ok) {
        miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(rerolled, "katala_reroll_failed");
        break;
      }
      cards = getKatalaCards(rerolled.data);
      combination = katalaCombinationCode(extractKatalaRank(cards[0]), extractKatalaRank(cards[1]));
    }

    await sleep(delayMs);
    const finished = await performAutomatedMiniGameRequest(
      client,
      "katala-finish-auto",
      "/api/card/finish",
      {},
      {
        captureWearableDelta: combination === "AA" || combination === "KK",
        wearableDeltaRetries: 2,
      },
    );
    if (!finished.ok) {
      miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(finished, "katala_finish_failed");
      break;
    }

    const decision = getKatalaAttemptDecision({
      combination,
      targets,
      attemptsCompleted: attempt + 1,
      maxAttempts,
      stopRequested: shouldStopMiniGameAutomation(),
    });
    if (decision.matched) {
      miscMiniGameAutomationRuntime.successes += 1;
    }
    if (!decision.continuePlaying) {
      miscMiniGameAutomationRuntime.reason = decision.reason;
      break;
    }
  }
}

const POKER_RANK_VALUE = Object.freeze({
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, "10": 10, T: 10, J: 11, Q: 12, K: 13, A: 14,
});

function normalizePokerCard(card, index = 0) {
  const raw = typeof card === "string"
    ? card
    : card && typeof card === "object"
      ? String(card.code || card.id || card.card || `${card.rank || ""}_${card.suit || ""}`)
      : "";
  const normalized = raw.trim().replace(/-/g, "_");
  const [rankRaw, suitRaw] = normalized.split("_");
  const rankToken = String(rankRaw || "").trim().toUpperCase();
  const rank = POKER_RANK_VALUE[rankToken] || Number(rankToken) || 0;
  const suit = String(suitRaw || card && card.suit || "").trim().toLowerCase();
  return {
    index,
    raw,
    rank,
    suit,
  };
}

function getPokerCards(value) {
  const source = getMiniGameState(unwrapMiniGamePayload(value)) || {};
  const cards = source.cards || source.hand || source.activeHand?.cards || source.currentHand?.cards || [];
  return (Array.isArray(cards) ? cards : []).map(normalizePokerCard).filter((card) => card.rank > 0);
}

function getPokerStraightHigh(cards) {
  const ranks = [...new Set(cards.map((card) => card.rank))].sort((left, right) => left - right);
  if (ranks.includes(14)) ranks.unshift(1);
  let streak = 1;
  let best = 0;
  for (let index = 1; index < ranks.length; index += 1) {
    if (ranks[index] === ranks[index - 1] + 1) {
      streak += 1;
      if (streak >= 5) best = ranks[index];
    } else {
      streak = 1;
    }
  }
  return best;
}

function evaluatePokerHand(rawCards) {
  const cards = (Array.isArray(rawCards) ? rawCards : []).map(normalizePokerCard).filter((card) => card.rank > 0);
  if (cards.length < 5) {
    return { code: "incomplete", rank: 0, cards };
  }
  const counts = new Map();
  cards.forEach((card) => counts.set(card.rank, (counts.get(card.rank) || 0) + 1));
  const groups = [...counts.entries()].sort((left, right) => (
    right[1] - left[1] || right[0] - left[0]
  ));
  const flush = cards.every((card) => card.suit && card.suit === cards[0].suit);
  const straightHigh = getPokerStraightHigh(cards);
  let code = "high_card";
  let rank = 1;
  if (flush && straightHigh === 14 && cards.some((card) => card.rank === 10)) {
    code = "royal_flush"; rank = 10;
  } else if (flush && straightHigh) {
    code = "straight_flush"; rank = 9;
  } else if (groups[0][1] === 4) {
    code = "four_of_a_kind"; rank = 8;
  } else if (groups[0][1] === 3 && groups[1] && groups[1][1] === 2) {
    code = "full_house"; rank = 7;
  } else if (flush) {
    code = "flush"; rank = 6;
  } else if (straightHigh) {
    code = "straight"; rank = 5;
  } else if (groups[0][1] === 3) {
    code = "three_of_a_kind"; rank = 4;
  } else if (groups[0][1] === 2 && groups[1] && groups[1][1] === 2) {
    code = "two_pair"; rank = 3;
  } else if (groups[0][1] === 2) {
    code = "pair"; rank = 2;
  }
  return { code, rank, cards, groups, flush, straightHigh };
}

function choosePokerReplacementIndexes(rawCards) {
  const cards = (Array.isArray(rawCards) ? rawCards : []).map(normalizePokerCard).filter((card) => card.rank > 0);
  if (cards.length !== 5) return [];
  const evaluation = evaluatePokerHand(cards);
  if (evaluation.rank >= 5 || ["full_house", "four_of_a_kind"].includes(evaluation.code)) {
    return [];
  }
  const kept = new Set();
  const repeatedRanks = new Set(
    evaluation.groups.filter(([, count]) => count >= 2).map(([rank]) => rank),
  );
  cards.forEach((card) => {
    if (repeatedRanks.has(card.rank)) kept.add(card.index);
  });
  if (kept.size === 0) {
    const bySuit = new Map();
    cards.forEach((card) => {
      if (!bySuit.has(card.suit)) bySuit.set(card.suit, []);
      bySuit.get(card.suit).push(card);
    });
    const flushDraw = [...bySuit.values()].sort((left, right) => right.length - left.length)[0] || [];
    if (flushDraw.length >= 4) flushDraw.forEach((card) => kept.add(card.index));
  }
  if (kept.size === 0) {
    let bestStraight = [];
    const rankVariants = cards.flatMap((card) => card.rank === 14
      ? [{ ...card, rank: 14 }, { ...card, rank: 1 }]
      : [card]);
    for (let start = 1; start <= 10; start += 1) {
      const window = rankVariants.filter((card) => card.rank >= start && card.rank <= start + 4);
      const unique = [...new Map(window.map((card) => [card.rank, card])).values()];
      if (unique.length > bestStraight.length) bestStraight = unique;
    }
    if (bestStraight.length >= 4) bestStraight.forEach((card) => kept.add(card.index));
  }
  if (kept.size === 0) {
    cards
      .slice()
      .sort((left, right) => right.rank - left.rank)
      .slice(0, 2)
      .forEach((card) => kept.add(card.index));
  }
  return cards.map((card) => card.index).filter((index) => !kept.has(index));
}

function normalizePokerTargets(value) {
  const aliases = {
    royalflush: "royal_flush",
    straightflush: "straight_flush",
    fourofakind: "four_of_a_kind",
    fullhouse: "full_house",
    threeofakind: "three_of_a_kind",
    twopair: "two_pair",
    highcard: "high_card",
  };
  return [...new Set(
    (Array.isArray(value) ? value : String(value || "").split(/[\s,;]+/))
      .map((item) => String(item).trim().toLowerCase().replace(/[\s-]+/g, "_"))
      .map((item) => aliases[item.replaceAll("_", "")] || item)
      .filter(Boolean),
  )];
}

async function getPokerGameState(client) {
  const response = await client.get("/api/poker/state");
  if (!isSuccessfulGameResponse(response)) {
    throw new Error(getMiniGameFailureMessage({ data: unwrapMiniGamePayload(response) }, "Could not load Poker state"));
  }
  return getMiniGameState(unwrapMiniGamePayload(response));
}

async function runPokerAutomation(client, options) {
  const allowChips = options.allowChips === true;
  const allowSoap = options.allowSoap === true;
  const chipHands = allowChips ? clampMiniGameNumber(options.chipHands, 0, 0, 1_000) : 0;
  const soapHands = allowSoap ? clampMiniGameNumber(options.soapHands, 0, 0, 1_000) : 0;
  const maxDraws = clampMiniGameNumber(options.maxDraws, 1, 0, 5);
  const delayMs = clampMiniGameNumber(options.delayMs, 900, 500, 60_000);
  const targets = normalizePokerTargets(options.targets);
  if (chipHands + soapHands <= 0) {
    throw new Error("Разрешите хотя бы одну раздачу за фишки или мыло.");
  }
  const initialState = await getPokerGameState(client);
  if (initialState.handActive || initialState.activeHand) {
    miscMiniGameAutomationRuntime.reason = "active_foreign_hand";
    return;
  }
  miscMiniGameAutomationRuntime.planned = chipHands + soapHands;
  miscMiniGameAutomationRuntime.settings = {
    allowChips,
    allowSoap,
    chipHands,
    soapHands,
    maxDraws,
    delayMs,
    targets,
    autoDailyRaven: options.autoDailyRaven === true,
  };

  if (options.autoDailyRaven === true && !shouldStopMiniGameAutomation()) {
    const daily = await client.get("/api/poker/daily/status");
    const dailyState = unwrapMiniGamePayload(daily) || {};
    if (dailyState.claimable === true) {
      await performAutomatedMiniGameRequest(client, "poker-daily-claim-auto", "/api/poker/daily/claim", {});
    }
  }

  const modes = [
    ...Array.from({ length: chipHands }, () => "chips"),
    ...Array.from({ length: soapHands }, () => "soap"),
  ];
  for (let handIndex = 0; handIndex < modes.length && !shouldStopMiniGameAutomation(); handIndex += 1) {
    const mode = modes[handIndex];
    miscMiniGameAutomationRuntime.current = `Покер · раздача ${handIndex + 1} из ${modes.length}`;
    const started = await performAutomatedMiniGameRequest(
      client,
      `poker-${mode}-auto`,
      `/api/poker/start?mode=${mode}`,
      {},
    );
    if (!started.ok) {
      miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(started, "poker_start_failed");
      break;
    }
    miscMiniGameAutomationRuntime.processed += 1;
    const currency = mode === "soap" ? "soap" : "chips";
    const amount = mode === "soap" ? 5 : 1;
    miscMiniGameAutomationRuntime.spent[currency] = (miscMiniGameAutomationRuntime.spent[currency] || 0) + amount;
    let cards = getPokerCards(started.data);
    let evaluation = evaluatePokerHand(cards);
    for (let draw = 0; draw < maxDraws && !shouldStopMiniGameAutomation(); draw += 1) {
      if (targets.includes(evaluation.code)) break;
      const cardIndexes = choosePokerReplacementIndexes(cards);
      if (cardIndexes.length === 0) break;
      await sleep(delayMs);
      const drawn = await performAutomatedMiniGameRequest(
        client,
        "poker-draw-auto",
        "/api/poker/draw",
        { cardIndexes },
      );
      if (!drawn.ok) {
        miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(drawn, "poker_draw_failed");
        break;
      }
      cards = getPokerCards(drawn.data);
      evaluation = evaluatePokerHand(cards);
    }
    await sleep(delayMs);
    const finished = await performAutomatedMiniGameRequest(
      client,
      "poker-finish-auto",
      "/api/poker/finish",
      {},
      { captureWearableDelta: true, wearableDeltaRetries: 2 },
    );
    if (!finished.ok) {
      miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(finished, "poker_finish_failed");
      break;
    }
    if (targets.includes(evaluation.code)) {
      miscMiniGameAutomationRuntime.successes += 1;
      miscMiniGameAutomationRuntime.reason = "target_reached";
      break;
    }
    if (handIndex < modes.length - 1) await sleep(delayMs);
  }
}

async function runSlotsAutomation(client, options) {
  const bet = clampMiniGameNumber(options.bet, 1, 1, 10);
  const autoBonus = options.autoBonus !== false;
  const autoSpin = options.autoSpin === true;
  const freeOnly = options.freeOnly === true;
  const maxSpins = clampMiniGameNumber(options.maxSpins, 100, 1, 10_000);
  const delayMs = clampMiniGameNumber(options.delayMs, 1_000, 250, 60_000);
  miscMiniGameAutomationRuntime.planned = null;
  miscMiniGameAutomationRuntime.settings = {
    bet,
    autoBonus,
    autoSpin,
    freeOnly,
    maxSpins,
    delayMs,
    superGameSide: options.superGameSide === "right" ? "right" : "left",
  };

  let state = await getSlotsGameState(client);
  if (shouldSetFartovyBet(state, bet)) {
    const setBet = await performAutomatedMiniGameRequest(client, "fartovy-set-bet-auto", "/api/slots-game/set-bet", { bet });
    if (!setBet.ok) {
      miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(setBet, "slots_set_bet_failed");
      return;
    }
    state = await getSlotsGameState(client);
  }
  if (autoBonus && state.bonusActive && !shouldStopMiniGameAutomation()) {
    state = await resolveSlotsBonusGame(client, options, state);
  }
  let spinIndex = 0;
  while (!shouldStopMiniGameAutomation() && spinIndex < maxSpins) {
    let availability = getSlotsSpinAvailability(state, bet);
    if (freeOnly && availability.freeSpins <= 0) {
      miscMiniGameAutomationRuntime.reason = "no_free_spins";
      break;
    }
    if (!availability.canSpin) {
      if (!autoSpin) {
        miscMiniGameAutomationRuntime.reason = "not_enough_slots_grass";
        break;
      }
      const waitingResult = await waitForSlotsSpinAvailability(client, state, bet);
      state = waitingResult.state;
      availability = waitingResult.availability;
      if (!availability.canSpin) {
        break;
      }
    }

    miscMiniGameAutomationRuntime.current = `Фартовый · спин ${spinIndex + 1}`;
    const spun = await performAutomatedMiniGameRequest(client, "fartovy-spin-auto", "/api/slots-game/spin", {});
    if (!spun.ok) {
      miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(spun, "slots_spin_failed");
      break;
    }

    miscMiniGameAutomationRuntime.processed += 1;
    if (availability.freeSpins <= 0) {
      miscMiniGameAutomationRuntime.spent.slotsGrass = (miscMiniGameAutomationRuntime.spent.slotsGrass || 0) + bet;
    }
    const spinData = spun.data || {};
    if (Array.isArray(spinData.comboHits) && spinData.comboHits.length > 0) {
      miscMiniGameAutomationRuntime.successes += 1;
    }
    state = await getSlotsGameState(client);
    if (autoBonus && state.bonusActive && !shouldStopMiniGameAutomation()) {
      state = await resolveSlotsBonusGame(client, options, state);
    }
    spinIndex += 1;
    if (spinIndex < maxSpins && !shouldStopMiniGameAutomation()) {
      await sleep(delayMs);
    }
  }
  if (!shouldStopMiniGameAutomation() && spinIndex >= maxSpins) {
    miscMiniGameAutomationRuntime.reason = "max_spins_reached";
  }
}

async function runWheelAutomation(client, options) {
  const maxSpins = clampMiniGameNumber(options.maxSpins, 1, 1, 1_000);
  miscMiniGameAutomationRuntime.planned = maxSpins;
  miscMiniGameAutomationRuntime.settings = { maxSpins };

  let state = await getWheelGameState(client);
  for (let spinIndex = 0; spinIndex < maxSpins && !shouldStopMiniGameAutomation(); spinIndex += 1) {
    const tickets = Number(state.tickets ?? state.balances?.tickets ?? state.balances?.fortune_tickets) || 0;
    const pending = Boolean(state.pending || state.prizePending || state.hasPendingPrize);
    if (pending) {
      miscMiniGameAutomationRuntime.reason = "pending_prize";
      break;
    }
    if (tickets <= 0) {
      miscMiniGameAutomationRuntime.reason = "not_enough_tickets";
      break;
    }

    miscMiniGameAutomationRuntime.current = `Фортуна · спин ${spinIndex + 1} из ${maxSpins}`;
    const spun = await performAutomatedMiniGameRequest(client, "wheel-spin-auto", "/api/wheel/spin", {});
    if (!spun.ok) {
      miscMiniGameAutomationRuntime.reason = getMiniGameFailureMessage(spun, "wheel_spin_failed");
      break;
    }

    miscMiniGameAutomationRuntime.processed += 1;
    miscMiniGameAutomationRuntime.successes += 1;
    miscMiniGameAutomationRuntime.spent.tickets = (miscMiniGameAutomationRuntime.spent.tickets || 0) + 1;
    state = await getWheelGameState(client);
    if (state.pending || state.prizePending || state.hasPendingPrize) {
      miscMiniGameAutomationRuntime.reason = "pending_prize";
      break;
    }
  }
}

async function executeMiniGameAutomation(client, kind, options) {
  try {
    if (kind === "katala") {
      await runKatalaAutomation(client, options);
    } else if (kind === "fartovy") {
      await runSlotsAutomation(client, options);
    } else if (kind === "wheel") {
      await runWheelAutomation(client, options);
    } else if (kind === "poker") {
      await runPokerAutomation(client, options);
    } else {
      throw new Error(`Unsupported mini-game automation: ${kind}`);
    }
  } catch (error) {
    miscMiniGameAutomationRuntime.lastError = error && error.message ? error.message : String(error);
  } finally {
    miscMiniGameAutomationRuntime.running = false;
    miscMiniGameAutomationRuntime.finishedAt = new Date().toISOString();
    miscMiniGameAutomationRuntime.current = null;
    if (!miscMiniGameAutomationRuntime.reason) {
      miscMiniGameAutomationRuntime.reason = miscMiniGameAutomationRuntime.stopRequested ? "stopped" : "completed";
    }
    miscMiniGameAutomationRuntime.lastResult = buildMiniGameAutomationView();
    await fs.mkdir(path.dirname(MISC_MINIGAME_AUTOMATION_LATEST_PATH), { recursive: true });
    await fs.writeFile(
      MISC_MINIGAME_AUTOMATION_LATEST_PATH,
      `${JSON.stringify(miscMiniGameAutomationRuntime.lastResult, null, 2)}\n`,
      "utf8",
    );
    invalidateMiscDashboardCache();
  }
}

async function startMiniGameAutomation(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    return launchMiniGameAutomation(client, options);
  });
}

function launchMiniGameAutomation(client, options = {}) {
  if (miscMiniGameAutomationRuntime.running) {
    return { started: false, reason: "already_running", job: buildMiniGameAutomationView() };
  }

  const kind = String(options.kind || "").trim().toLowerCase();
  if (!["katala", "fartovy", "poker", "wheel"].includes(kind)) {
    throw new Error("Выберите автоматику: Катала, Фартовый, Покер или Фортуна.");
  }

  const planned = kind === "fartovy"
    ? null
    : kind === "poker"
      ? clampMiniGameNumber(options.chipHands, 0, 0, 1_000)
        + clampMiniGameNumber(options.soapHands, 0, 0, 1_000)
    : clampMiniGameNumber(options.maxAttempts ?? options.maxSpins, 1, 1, 1_000);
  resetMiniGameAutomationRuntime(kind, {}, planned);
  invalidateMiscDashboardCache();
  miscMiniGameAutomationPromise = runMiniGameSerialized(
    kind,
    () => executeMiniGameAutomation(client, kind, options),
  ).catch((error) => {
    miscMiniGameAutomationRuntime.lastError = error && error.message ? error.message : String(error);
  });
  return { started: true, job: buildMiniGameAutomationView() };
}

async function ensureFartovyAutoSpinRunning(client, settings) {
  if (!settings.enabled || miscMiniGameAutomationRuntime.running) {
    return { started: false, reason: "disabled_or_busy", job: buildMiniGameAutomationView() };
  }
  return launchMiniGameAutomation(client, { kind: "fartovy", ...settings, autoSpin: true });
}

async function runFartovyAutoSpinSupervisor(sessionPath) {
  if (fartovyAutoSpinSupervisorRunning) {
    return { started: false, reason: "supervisor_busy", job: buildMiniGameAutomationView() };
  }
  fartovyAutoSpinSupervisorRunning = true;
  try {
    const settings = await loadFartovyAutoSpinSettings(sessionPath);
    if (!settings.enabled) {
      return { started: false, reason: "disabled", job: buildMiniGameAutomationView() };
    }
    return await withContext(sessionPath, async ({ client }) => (
      ensureFartovyAutoSpinRunning(client, settings)
    ));
  } catch (error) {
    logEvent("misc.fartovy.autospin_supervisor_error", { error });
    return {
      started: false,
      reason: "supervisor_error",
      error: error && error.message ? error.message : String(error),
      job: buildMiniGameAutomationView(),
    };
  } finally {
    fartovyAutoSpinSupervisorRunning = false;
  }
}

async function updateFartovyAutoSpin(options = {}, sessionPath) {
  const settings = await saveFartovyAutoSpinSettings(options, sessionPath);
  if (!settings.enabled) {
    const stopped = await stopMiniGameAutomation(sessionPath);
    return { settings, started: false, stopped: stopped.stopped, job: stopped.job };
  }

  return withContext(sessionPath, async ({ client }) => {
    const started = launchMiniGameAutomation(client, { kind: "fartovy", ...settings, autoSpin: true });
    return { settings, ...started };
  });
}

async function stopMiniGameAutomation(sessionPath) {
  if (miscMiniGameAutomationRuntime.kind === "fartovy") {
    const settings = await loadFartovyAutoSpinSettings(sessionPath);
    if (settings.enabled) {
      await saveFartovyAutoSpinSettings({ ...settings, enabled: false }, sessionPath);
    }
  }
  if (!miscMiniGameAutomationRuntime.running) {
    return { stopped: false, reason: "not_running", job: buildMiniGameAutomationView() };
  }
  miscMiniGameAutomationRuntime.stopRequested = true;
  miscMiniGameAutomationRuntime.reason = "stopping";
  invalidateMiscDashboardCache();
  return { stopped: true, job: buildMiniGameAutomationView() };
}

function getMiniGameAutomationState() {
  return buildMiniGameAutomationView();
}

function getMiniGameActionKind(action) {
  const match = /^(fartovy|katala|poker|wheel)-/.exec(String(action || ""));
  return match ? match[1] : null;
}

function isMiniGameActionBlockedByAutomation(action, automation = {}) {
  const actionKind = getMiniGameActionKind(action);
  return Boolean(automation.running && actionKind && automation.kind === actionKind);
}

async function runMiniGameAction(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const action = String(options.action || "");
    const routes = {
      "fartovy-set-bet": ["/api/slots-game/set-bet", { bet: clampMiniGameNumber(options.bet, 1, 1, 10) }],
      "fartovy-spin": ["/api/slots-game/spin", {}],
      "fartovy-buy-grass": ["/api/slots-game/buy-grass", { amount: clampMiniGameNumber(options.amount, 1, 1, 10_000) }],
      "fartovy-bonus-open": ["/api/slots-game/bonus/open-box", options.superGame
        ? { superGame: true, side: options.side === "right" ? "right" : "left" }
        : { boxId: clampMiniGameNumber(options.boxId, 1, 1, 4) }],
      "katala-start": ["/api/card/start", null],
      "katala-reroll": ["/api/card/reroll", { cardIndex: asNonNegativeInt(options.cardIndex, 0) ?? 0 }],
      "katala-finish": ["/api/card/finish", null],
      "poker-soap": ["/api/poker/start?mode=soap", null],
      "poker-chips": ["/api/poker/start?mode=chips", null],
      "poker-draw": ["/api/poker/draw", {
        replaceIndexes: Array.isArray(options.cardIndexes)
          ? options.cardIndexes.map((value) => asNonNegativeInt(value, null)).filter((value) => value !== null)
          : [asNonNegativeInt(options.cardIndex, 0) ?? 0],
      }],
      "poker-finish": ["/api/poker/finish", null],
      "wheel-buy": ["/api/wheel/buy-tickets", { count: asPositiveInt(options.count, 1) ?? 1 }],
      "wheel-spin": ["/api/wheel/spin", {}],
      "wheel-cash": ["/api/wheel/prize-choice", { choice: "cash" }],
      "wheel-risk": ["/api/wheel/prize-choice", { choice: "risk" }],
    };
    if (!Object.prototype.hasOwnProperty.call(routes, action)) {
      throw new Error(`Unsupported mini-game action: ${action}`);
    }
    if (isMiniGameActionBlockedByAutomation(action, miscMiniGameAutomationRuntime)) {
      throw new Error(`Automation for ${getMiniGameActionKind(action)} is running. Stop it before using that game's manual controls.`);
    }
    const [pathname, payload] = routes[action];
    const capturesWearableReward = action === "katala-finish" || action === "poker-finish";
    const result = await runMiniGameSerialized(getMiniGameActionKind(action), () => performMiniGameRequest(
      client,
      action,
      pathname,
      payload === null ? {} : payload,
      capturesWearableReward
        ? { captureWearableDelta: true, wearableDeltaRetries: 2 }
        : {},
    ));
    invalidateMiscDashboardCache();
    return result;
  });
}

function collectMiniGameWearableRefs(value, refs = new Map(), depth = 0, seen = new Set()) {
  if (!value || typeof value !== "object" || depth > 6 || seen.has(value)) {
    return refs;
  }
  seen.add(value);

  const addRefs = (type, rawIds) => {
    const ids = Array.isArray(rawIds) ? rawIds : [rawIds];
    for (const rawId of ids) {
      const id = Number(rawId);
      if (Number.isInteger(id) && id > 0) {
        refs.set(`${type}:${id}`, { type, id });
      }
    }
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      collectMiniGameWearableRefs(item, refs, depth + 1, seen);
    }
    return refs;
  }

  addRefs("clothing", value.clothingId);
  addRefs("clothing", value.clothingIds);
  addRefs("tattoo", value.tattooId);
  addRefs("tattoo", value.tattooIds);

  for (const item of Object.values(value)) {
    if (item && typeof item === "object") {
      collectMiniGameWearableRefs(item, refs, depth + 1, seen);
    }
  }
  return refs;
}

function resolveMiniGameWearableRefs(refs, catalog = null) {
  const items = catalog && Array.isArray(catalog.items)
    ? catalog.items
    : Array.isArray(catalog)
      ? catalog
      : [];
  const catalogByKey = new Map(
    items
      .filter((item) => item && item.type && Number(item.id) > 0)
      .map((item) => [`${item.type}:${Number(item.id)}`, item]),
  );
  const uniqueRefs = new Map();
  for (const ref of Array.isArray(refs) ? refs : []) {
    const type = ref && ref.type === "tattoo" ? "tattoo" : ref && ref.type === "clothing" ? "clothing" : null;
    const id = Number(ref && ref.id);
    if (type && Number.isInteger(id) && id > 0) {
      uniqueRefs.set(`${type}:${id}`, { type, id });
    }
  }
  return [...uniqueRefs.values()].map((ref) => {
    const item = catalogByKey.get(`${ref.type}:${ref.id}`) || {};
    return {
      type: ref.type,
      id: ref.id,
      name: item.name ? String(item.name) : ref.type === "tattoo" ? `Наколка #${ref.id}` : `Вещь #${ref.id}`,
      setName: item.setName ? String(item.setName) : null,
      imageUrl: item.imageUrl || item.cardPreviewUrl || null,
      zone: Number.isInteger(Number(item.zone)) ? Number(item.zone) : null,
    };
  });
}

function resolveMiniGameWearableRewards(value, catalog = null) {
  return resolveMiniGameWearableRefs([...collectMiniGameWearableRefs(value).values()], catalog);
}

function normalizeMiniGameWearableInventory(value) {
  const payload = unwrapMiniGamePayload(value);
  const normalizeIds = (items) => new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => Number(item && typeof item === "object" ? item.id : item))
      .filter((id) => Number.isInteger(id) && id > 0),
  );
  return {
    clothing: normalizeIds(payload.ownedClothing),
    tattoo: normalizeIds(payload.ownedTattoos),
  };
}

async function loadMiniGameWearableInventory(client) {
  const response = await client.get("/api/clothing/inventory");
  if (!isSuccessfulGameResponse(response)) {
    throw new Error(`Wearable inventory returned HTTP ${response.status}`);
  }
  return normalizeMiniGameWearableInventory(response);
}

function buildMiniGameWearableInventoryDelta(before, after) {
  const refs = [];
  for (const type of ["clothing", "tattoo"]) {
    const beforeIds = before && before[type] instanceof Set ? before[type] : new Set();
    const afterIds = after && after[type] instanceof Set ? after[type] : new Set();
    for (const id of afterIds) {
      if (!beforeIds.has(id)) {
        refs.push({ type, id });
      }
    }
  }
  return refs;
}

function normalizeMiniGameOutcome(data, catalog = null, options = {}) {
  const payload = unwrapMiniGamePayload(data);
  const result = payload.result && typeof payload.result === "object" ? payload.result : {};
  const cards = payload.cards
    || payload.hand
    || payload.lastCards
    || (payload.activeHand && payload.activeHand.cards)
    || (payload.card1 && payload.card2 ? [payload.card1, payload.card2] : null)
    || (result.card1 && result.card2 ? [result.card1, result.card2] : null)
    || [];
  const reward = payload.reward
    || payload.rewards
    || payload.randomRewards
    || payload.prize
    || payload.loot
    || payload.granted
    || payload.rewardId
    || result.reward
    || payload.result
    || null;
  return {
    message: payload.message || payload.resultText || payload.handLabel || payload.lastBestHandLabel || (result.pair ? `Комбинация ${result.pair}` : null),
    cards: Array.isArray(cards) ? cards : [],
    reward,
    rewardWearables: resolveMiniGameWearableRewards([payload, result, reward], catalog),
    newWearables: resolveMiniGameWearableRefs(options.newWearables, catalog),
    pending: payload.pending || null,
  };
}

function enrichMiniGameHistoryEntry(entry, catalog) {
  if (!entry || typeof entry !== "object" || !entry.outcome || typeof entry.outcome !== "object") {
    return entry;
  }
  const existingRewardWearables = Array.isArray(entry.outcome.rewardWearables)
    ? entry.outcome.rewardWearables
    : Array.isArray(entry.outcome.wearables)
      ? entry.outcome.wearables
      : [];
  const rewardWearableRefs = existingRewardWearables.map((item) => (
    item && item.type === "tattoo"
      ? { tattooId: item.id }
      : { clothingId: item && item.id }
  ));
  const newWearableRefs = (Array.isArray(entry.outcome.newWearables) ? entry.outcome.newWearables : [])
    .map((item) => ({ type: item && item.type, id: item && item.id }));
  const { wearables: legacyWearables, ...outcome } = entry.outcome;
  void legacyWearables;
  return {
    ...entry,
    outcome: {
      ...outcome,
      rewardWearables: resolveMiniGameWearableRewards([entry.outcome.reward, rewardWearableRefs], catalog),
      newWearables: resolveMiniGameWearableRefs(newWearableRefs, catalog),
    },
  };
}

async function loadMiniGameWearableCatalog() {
  if (miscMiniGameWearableCatalogCache !== undefined) {
    return miscMiniGameWearableCatalogCache;
  }
  try {
    miscMiniGameWearableCatalogCache = await readWearableCatalogCache({ allowStale: true });
  } catch (error) {
    miscMiniGameWearableCatalogCache = null;
    logEvent("ui-service", "Mini-game wearable rewards will use IDs because the catalog cache could not be read", {
      error: error && error.message,
    });
  }
  return miscMiniGameWearableCatalogCache;
}

async function loadMiniGameHistory() {
  if (miscMiniGameHistoryCache) {
    return miscMiniGameHistoryCache;
  }
  try {
    const body = await fs.readFile(MISC_MINIGAME_HISTORY_PATH, "utf8");
    const parsed = JSON.parse(body);
    const catalog = await loadMiniGameWearableCatalog();
    miscMiniGameHistoryCache = Array.isArray(parsed)
      ? parsed.map((entry) => enrichMiniGameHistoryEntry(entry, catalog))
      : [];
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
    miscMiniGameHistoryCache = [];
  }
  return miscMiniGameHistoryCache;
}

async function appendMiniGameHistory(result) {
  const history = await loadMiniGameHistory();
  const catalog = await loadMiniGameWearableCatalog();
  const entry = {
    at: new Date().toISOString(),
    action: result.action,
    ok: result.ok,
    outcome: normalizeMiniGameOutcome(result.data, catalog, {
      newWearables: result.newWearables,
    }),
  };
  history.unshift(entry);
  miscMiniGameHistoryCache = history.slice(0, 100);
  await fs.mkdir(path.dirname(MISC_MINIGAME_HISTORY_PATH), { recursive: true });
  await fs.writeFile(MISC_MINIGAME_HISTORY_PATH, `${JSON.stringify(miscMiniGameHistoryCache, null, 2)}\n`, "utf8");
  return entry;
}

function collectMiniGameRewardAmounts(value, output = {}, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return output;
  if (Array.isArray(value)) {
    value.forEach((item) => collectMiniGameRewardAmounts(item, output, depth + 1));
    return output;
  }
  if (typeof value !== "object") return output;
  for (const [key, nested] of Object.entries(value)) {
    if (
      typeof nested === "number"
      && Number.isFinite(nested)
      && nested !== 0
      && !/id|level|index|chance|percent|status/i.test(key)
    ) {
      output[key] = (output[key] || 0) + nested;
    } else {
      collectMiniGameRewardAmounts(nested, output, depth + 1);
    }
  }
  return output;
}

function buildMiniGameDailyStats(history = []) {
  const days = new Map();
  for (const entry of Array.isArray(history) ? history : []) {
    const timestamp = Date.parse(entry && entry.at || "");
    const action = String(entry && entry.action || "");
    const kind = getMiniGameActionKind(action);
    if (!Number.isFinite(timestamp) || !["katala", "fartovy"].includes(kind)) continue;
    const dayKey = getMoscowDateKey(new Date(timestamp));
    const mapKey = `${dayKey}:${kind}`;
    const current = days.get(mapKey) || {
      dayKey,
      kind,
      actions: 0,
      successes: 0,
      wearables: 0,
      rewards: {},
    };
    current.actions += 1;
    if (entry.ok !== false) current.successes += 1;
    const outcome = entry.outcome && typeof entry.outcome === "object" ? entry.outcome : {};
    current.wearables += (Array.isArray(outcome.newWearables) ? outcome.newWearables.length : 0);
    collectMiniGameRewardAmounts(outcome.reward, current.rewards);
    days.set(mapKey, current);
  }
  return [...days.values()]
    .sort((left, right) => right.dayKey.localeCompare(left.dayKey) || left.kind.localeCompare(right.kind))
    .slice(0, 28);
}

async function loadMiscDashboard(sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const readOptions = { throttle: false };
    const [
      collectionResponse,
      monthlyResponse,
      cardResponse,
      pokerResponse,
      pokerDailyResponse,
      slotsResponse,
      wheelResponse,
      initResponse,
      podogrevResponse,
      businessResponse,
    ] = await Promise.all([
      client.collection.full(selfUserId, readOptions),
      client.get("/api/monthly/state", readOptions),
      client.get("/api/card/state", readOptions),
      client.get("/api/poker/state", readOptions),
      client.get("/api/poker/daily/status", readOptions),
      client.get("/api/slots-game/info", readOptions),
      client.get("/api/wheel/state", readOptions),
      client.players.init({ ...readOptions, rateLimitRetries: 1 }),
      client.podogrev.status(readOptions),
      client.business.all(readOptions),
    ]);
    await loadLastVparitResult();
    const fartovyAutoSpin = await loadFartovyAutoSpinSettings(sessionPath);
    await ensureFartovyAutoSpinRunning(client, fartovyAutoSpin);
    const miniGameHistory = await loadMiniGameHistory();
    const automation = buildMiscAutomationView(await ensureMiscAutomationLoaded());
    const init = getGamePayload(initResponse) || {};
    const podogrev = normalizePodogrevDashboard(podogrevResponse);
    const energySources = await loadMonthlyEnergySources(client, monthlyResponse, automation);
    const freeHeat = Number(podogrev.collectableEnergy || 0);
    const analysis = {
      ...energySources,
      energy: Number(init.energy || 0),
      maxEnergy: Number(init.maxEnergy || 0),
      defaultMasterId: automation.intellectMasterId,
      defaultAuthorityPrisonId: automation.authorityPrisonId,
      business: normalizeBusinessDashboard(businessResponse),
      todayFreeEnergy: Number(init.energy || 0) + Math.floor(millisecondsUntilNextGameDay() / 120_000) + freeHeat,
      fullDayFreeEnergy: Number(init.maxEnergy || 0) + 720 + Number(podogrev.dailyEnergyLimit || 0),
    };
    const stashes = normalizeStashDashboard(collectionResponse);
    const vparit = recoverLegacyVparitView(buildVparitRuntimeView(), stashes);
    const fartovy = getMiniGameState(unwrapMiniGamePayload(slotsResponse));
    const katala = unwrapMiniGamePayload(cardResponse);
    const poker = unwrapMiniGamePayload(pokerResponse);
    const wheel = getMiniGameState(unwrapMiniGamePayload(wheelResponse));
    const miniGameBalances = normalizeMiniGameBalances({
      currencies: init.currencies,
      fartovy,
      katala,
      poker,
      wheel,
    });
    return {
      selfUserId,
      generatedAt: new Date().toISOString(),
      stashes,
      vparit,
      monthly: normalizeMonthlyDashboard(monthlyResponse, automation, analysis),
      miniGames: {
        fartovy: {
          ...fartovy,
          grassPriceRubles: 1,
          betMin: 1,
          betMax: 10,
          balances: miniGameBalances.fartovy,
          autoSpin: fartovyAutoSpin,
        },
        katala: { ...katala, balances: miniGameBalances.katala },
        poker: {
          ...poker,
          daily: unwrapMiniGamePayload(pokerDailyResponse),
          balances: miniGameBalances.poker,
        },
        wheel: { ...wheel, balances: miniGameBalances.wheel, ticketPriceRubles: 10 },
        automation: buildMiniGameAutomationView(),
        history: miniGameHistory.slice(0, 30),
        dailyStats: buildMiniGameDailyStats(miniGameHistory),
      },
    };
  });
}

function withLiveMiscRuntime(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  return {
    ...payload,
    vparit: payload.stashes
      ? recoverLegacyVparitView(buildVparitRuntimeView(), payload.stashes)
      : payload.vparit,
    miniGames: payload.miniGames
      ? {
          ...payload.miniGames,
          automation: buildMiniGameAutomationView(),
        }
      : payload.miniGames,
  };
}

function invalidateMiscDashboardCache() {
  miscDashboardCache = null;
}

async function getMiscDashboard(options = {}, sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const forceRefresh = toBool(options.refresh ?? options.forceRefresh, false);
  const now = Date.now();
  const cached = miscDashboardCache
    && miscDashboardCache.sessionPath === resolvedSessionPath
    ? miscDashboardCache
    : null;
  const liveAutomation = buildMiniGameAutomationView();
  const cachedAutomation = cached
    && cached.payload
    && cached.payload.miniGames
    ? cached.payload.miniGames.automation
    : null;
  const automationJustFinished = Boolean(
    cachedAutomation
    && cachedAutomation.running
    && !liveAutomation.running,
  );

  if (
    !forceRefresh
    && !automationJustFinished
    && cached
    && now - cached.loadedAt < MISC_DASHBOARD_CACHE_TTL_MS
  ) {
    return withLiveMiscRuntime(cached.payload);
  }

  if (!forceRefresh && miscDashboardInflight && miscDashboardInflight.sessionPath === resolvedSessionPath) {
    return withLiveMiscRuntime(await miscDashboardInflight.promise);
  }

  const promise = loadMiscDashboard(resolvedSessionPath);
  miscDashboardInflight = { sessionPath: resolvedSessionPath, promise };
  try {
    const payload = await promise;
    miscDashboardCache = {
      sessionPath: resolvedSessionPath,
      loadedAt: Date.now(),
      payload,
    };
    return withLiveMiscRuntime(payload);
  } finally {
    if (miscDashboardInflight && miscDashboardInflight.promise === promise) {
      miscDashboardInflight = null;
    }
  }
}

async function loadLootContainerHistory() {
  if (lootContainerHistoryCache) {
    return lootContainerHistoryCache;
  }
  try {
    const parsed = JSON.parse(await fs.readFile(LOOT_CONTAINERS_HISTORY_PATH, "utf8"));
    lootContainerHistoryCache = Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch (error) {
    if (error && error.code !== "ENOENT" && !(error instanceof SyntaxError)) {
      throw error;
    }
    lootContainerHistoryCache = [];
  }
  return lootContainerHistoryCache;
}

function getLootContainerWearableItems(entry) {
  const rewards = entry && entry.rewards && typeof entry.rewards === "object" ? entry.rewards : {};
  return [
    ...(Array.isArray(rewards.clothing) ? rewards.clothing : []),
    ...(Array.isArray(rewards.tattoos) ? rewards.tattoos : []),
  ].filter(Boolean);
}

function buildLootContainerStats(history = []) {
  const parcels = (Array.isArray(history) ? history : [])
    .filter((entry) => entry && entry.kind === "parcel")
    .sort((left, right) => Date.parse(left.openedAt || "") - Date.parse(right.openedAt || ""));
  let currentDryStreak = 0;
  let maxDryStreak = 0;
  let withWearable = 0;
  let lastItem = null;
  for (const entry of parcels) {
    const wearables = getLootContainerWearableItems(entry);
    if (wearables.length > 0) {
      withWearable += 1;
      currentDryStreak = 0;
      const item = wearables[wearables.length - 1];
      lastItem = {
        at: entry.openedAt || null,
        type: item.type || null,
        id: item.id || null,
        name: item.name || item.label || null,
      };
    } else {
      currentDryStreak += 1;
      maxDryStreak = Math.max(maxDryStreak, currentDryStreak);
    }
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    coverageStartedAt: parcels[0] ? parcels[0].openedAt || null : null,
    totalOpened: parcels.length,
    withWearable,
    withoutWearable: Math.max(0, parcels.length - withWearable),
    currentDryStreak,
    maxDryStreak,
    dropPercent: parcels.length > 0 ? Math.round((withWearable / parcels.length) * 10_000) / 100 : 0,
    lastItem,
  };
}

async function loadLootContainerStats(history = null) {
  if (lootContainerStatsCache) {
    return lootContainerStatsCache;
  }
  try {
    const parsed = JSON.parse(await fs.readFile(LOOT_CONTAINERS_STATS_PATH, "utf8"));
    lootContainerStatsCache = {
      ...buildLootContainerStats([]),
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
  } catch (error) {
    if (error && error.code !== "ENOENT" && !(error instanceof SyntaxError)) {
      throw error;
    }
    lootContainerStatsCache = buildLootContainerStats(
      history || await loadLootContainerHistory(),
    );
    await fs.mkdir(path.dirname(LOOT_CONTAINERS_STATS_PATH), { recursive: true });
    await fs.writeFile(
      LOOT_CONTAINERS_STATS_PATH,
      `${JSON.stringify(lootContainerStatsCache, null, 2)}\n`,
      "utf8",
    );
  }
  return lootContainerStatsCache;
}

async function saveLootContainerHistory(entry) {
  const history = await loadLootContainerHistory();
  lootContainerHistoryCache = [entry, ...history].slice(0, 50);
  await fs.mkdir(path.dirname(LOOT_CONTAINERS_HISTORY_PATH), { recursive: true });
  await fs.writeFile(
    LOOT_CONTAINERS_HISTORY_PATH,
    `${JSON.stringify(lootContainerHistoryCache, null, 2)}\n`,
    "utf8",
  );
  if (entry && entry.kind === "parcel") {
    const stats = await loadLootContainerStats(history);
    const wearables = getLootContainerWearableItems(entry);
    const hasWearable = wearables.length > 0;
    const totalOpened = Number(stats.totalOpened || 0) + 1;
    const currentDryStreak = hasWearable ? 0 : Number(stats.currentDryStreak || 0) + 1;
    lootContainerStatsCache = {
      ...stats,
      version: 1,
      updatedAt: new Date().toISOString(),
      coverageStartedAt: stats.coverageStartedAt || entry.openedAt || null,
      totalOpened,
      withWearable: Number(stats.withWearable || 0) + (hasWearable ? 1 : 0),
      withoutWearable: Number(stats.withoutWearable || 0) + (hasWearable ? 0 : 1),
      currentDryStreak,
      maxDryStreak: Math.max(Number(stats.maxDryStreak || 0), currentDryStreak),
      dropPercent: Math.round((
        (Number(stats.withWearable || 0) + (hasWearable ? 1 : 0)) / totalOpened
      ) * 10_000) / 100,
      lastItem: hasWearable
        ? {
            at: entry.openedAt || null,
            type: wearables[wearables.length - 1].type || null,
            id: wearables[wearables.length - 1].id || null,
            name: wearables[wearables.length - 1].name || wearables[wearables.length - 1].label || null,
          }
        : stats.lastItem || null,
    };
    await fs.writeFile(
      LOOT_CONTAINERS_STATS_PATH,
      `${JSON.stringify(lootContainerStatsCache, null, 2)}\n`,
      "utf8",
    );
  }
  return lootContainerHistoryCache;
}

async function loadLootContainerWearableCatalog() {
  if (lootContainerWearableCatalogCache !== undefined) {
    return lootContainerWearableCatalogCache;
  }
  try {
    lootContainerWearableCatalogCache = await readWearableCatalogCache({ allowStale: true });
  } catch (error) {
    lootContainerWearableCatalogCache = null;
    logEvent("ui-service", "Loot container wearables will use server data because the catalog cache could not be read", {
      error: error && error.message,
    });
  }
  return lootContainerWearableCatalogCache;
}

async function loadLootContainersWithClient(client, options = {}) {
  const rebuild = toBool(options.rebuild, false);
  const [parcelResponse, baulResponse, initResponse] = await Promise.all([
    client.parcels.status({ rebuild }),
    client.bauls.status(),
    client.players.init(),
  ]);
  const dashboard = buildLootContainersDashboard({
    parcelStatus: getGamePayload(parcelResponse),
    baulStatus: getGamePayload(baulResponse),
    playerInit: getGamePayload(initResponse),
  });
  dashboard.baul.pending = enrichLootRewardsWithCatalog(
    dashboard.baul.pending,
    options.catalog || null,
  );
  if (!parcelResponse.ok && !dashboard.parcel.error) {
    dashboard.parcel.error = `HTTP ${parcelResponse.status}`;
  }
  if (!baulResponse.ok && !dashboard.baul.error) {
    dashboard.baul.error = `HTTP ${baulResponse.status}`;
  }
  return dashboard;
}

async function getLootContainersDashboard(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const [catalog, history] = await Promise.all([
      loadLootContainerWearableCatalog(),
      loadLootContainerHistory(),
    ]);
    const stats = await loadLootContainerStats(history);
    const dashboard = await loadLootContainersWithClient(client, { ...options, catalog });
    const enrichedHistory = history.map((entry) => enrichLootContainerEntryWithCatalog(entry, catalog));
    return {
      ...dashboard,
      lastOpen: enrichedHistory[0] || null,
      history: enrichedHistory.slice(0, 20),
      stats,
    };
  });
}

function serializeLootContainerOperation(operation) {
  const run = lootContainerSerializedOperation.catch(() => undefined).then(operation);
  lootContainerSerializedOperation = run.catch(() => undefined);
  return run;
}

function getLootContainerBlockedReason(kind, dashboard, options = {}) {
  const target = kind === "parcel" ? dashboard.parcel : dashboard.baul;
  if (kind === "parcel") {
    if (!target.ok) {
      return target.error || "parcel_status_unavailable";
    }
    if (target.stewBalance < target.cost.amount) {
      return "not_enough_stew";
    }
    return null;
  }

  if (!target.ok) {
    return target.error || "baul_status_unavailable";
  }
  if (!target.active) {
    return "baul_not_active";
  }
  if (!target.pending || target.pending.items.length === 0) {
    return "baul_no_pending_rewards";
  }
  if (target.canAfford === false) {
    return "not_enough_soap";
  }
  if (target.belowMaxLevel && !toBool(options.allowBelowMax, false)) {
    return "baul_below_max_level";
  }
  return null;
}

async function openLootContainer(options = {}, sessionPath) {
  const kind = String(options.kind || "").trim().toLowerCase();
  if (!["parcel", "baul"].includes(kind)) {
    throw new Error("kind must be parcel or baul");
  }

  const dryRun = toBool(options.dryRun, true);
  const confirmed = toBool(options.confirmed, false);
  if (!dryRun && !confirmed) {
    throw new Error("Opening a parcel or baul requires confirmed=true.");
  }

  return serializeLootContainerOperation(() => withContext(sessionPath, async ({ client }) => {
    const catalog = await loadLootContainerWearableCatalog();
    const before = await loadLootContainersWithClient(client, { rebuild: false, catalog });
    const blockedReason = getLootContainerBlockedReason(kind, before, options);
    const target = kind === "parcel" ? before.parcel : before.baul;

    if (dryRun || blockedReason) {
      return {
        kind,
        dryRun,
        opened: false,
        reason: blockedReason || "preview",
        cost: target.cost,
        before,
        dashboard: before,
      };
    }

    const response = kind === "parcel"
      ? await client.parcels.open({ rateLimitRetries: 0 })
      : await client.bauls.open(before.baul.baulId, { rateLimitRetries: 0 });
    const result = enrichLootContainerEntryWithCatalog(
      kind === "parcel"
        ? normalizeParcelOpenResult(getGamePayload(response))
        : normalizeBaulOpenResult(getGamePayload(response)),
      catalog,
    );

    if (!response.ok || !result.success) {
      return {
        kind,
        dryRun: false,
        opened: false,
        reason: result.error || `HTTP ${response.status}`,
        cost: target.cost,
        before,
        result,
        dashboard: before,
      };
    }

    const dashboard = await loadLootContainersWithClient(client, { rebuild: false, catalog });
    const historyEntry = {
      kind,
      openedAt: result.openedAt,
      levelBefore: kind === "baul" ? before.baul.level : null,
      spent: result.spent,
      remaining: result.remaining || null,
      rewards: result.rewards,
      tattooSets: result.tattooSets || [],
    };
    const history = await saveLootContainerHistory(historyEntry);
    const stats = await loadLootContainerStats(history);

    return {
      kind,
      dryRun: false,
      opened: true,
      reason: "opened",
      cost: target.cost,
      before,
      result,
      dashboard: {
        ...dashboard,
        lastOpen: history[0],
        history: history.slice(0, 20),
        stats,
      },
    };
  }));
}

async function getWearableCollection(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client, selfUserId }) => {
    const [catalog, inventory, bossBootstrapResult] = await Promise.all([
      loadWearableCatalog(client, {
        allowStale: true,
        forceRefresh: toBool(options.forceRefresh ?? options.refresh, false),
      }),
      loadWearableInventory(client, { accountKey: selfUserId }),
      client.get("/api/boss/bootstrap"),
    ]);
    const bossBootstrap = getGamePayload(bossBootstrapResult) || {};

    return buildWearableCollectionDashboard(catalog, inventory, {
      bossPlayerStats: bossBootstrap.playerStats || {},
    });
  });
}

async function getPodogrevStatus(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const response = await client.podogrev.status();
    return response.data;
  });
}

async function collectPodogrev(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const response = await client.podogrev.collectAll();
    return response.data;
  });
}

async function getFriendsList(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const response = await client.friends.list();
    return response.data;
  });
}

function buildZarubaQueueTaskMetadata(task) {
  const execution = task && task.execution && typeof task.execution === "object"
    ? task.execution
    : {};
  return {
    taskLabel: task && task.label || null,
    strategy: execution.strategy || null,
    objective: task && task.objective || execution.objective || null,
    taskRequiredAmount: asNonNegativeInt(task && task.requiredAmount, 0),
    taskCurrentAmount: asNonNegativeInt(task && task.currentAmount, 0),
    plannedSteps: asNonNegativeInt(execution.steps, 0),
    plannedEnergy: asNonNegativeInt(execution.energy, 0),
    plannedPoints: asNonNegativeInt(execution.points, 0),
    plannedDamage: asNonNegativeInt(execution.plannedDamage, asNonNegativeInt(execution.remaining, 0)),
    profitRespect: asNonNegativeInt(execution.profitRespect, 0),
    waitingForProfit: execution.strategy === "wait_profit",
    planMode: execution.modeKey || null,
    imageUrl: task && task.imageUrl || execution.imageUrl || null,
    zarubaObjective: task && task.objective || execution.objective || null,
  };
}

async function loadLiveZarubaTaskWithClient(client, serverTaskId) {
  const normalizedTaskId = String(serverTaskId || "").trim();
  if (!normalizedTaskId || !client.zaruba || typeof client.zaruba.state !== "function") {
    return { checked: false, task: null };
  }
  const response = await client.zaruba.state();
  if (!isSuccessfulGameResponse(response)) {
    return { checked: false, task: null };
  }
  const state = normalizeZarubaState(response);
  return {
    checked: true,
    task: normalizeZarubaTasks(state.active)
      .find((task) => String(task.taskId || "") === normalizedTaskId) || null,
  };
}

async function reconcileZarubaQueues(tasks = [], sessionPath) {
  const activeTasks = new Map(
    (Array.isArray(tasks) ? tasks : [])
      .filter((task) => task && task.taskId && !task.completed)
      .map((task) => [String(task.taskId), task]),
  );
  const prisonState = await getPrisonAutomationState(sessionPath);
  const prisonQueue = (prisonState.queue || []).flatMap((item) => {
    if (String(item.origin || "") !== "zaruba") return [item];
    const task = activeTasks.get(String(item.serverTaskId || ""));
    if (!task || task.execution?.queueable === false) return [];
    return [{
      ...item,
      targetId: task.targetId || item.targetId,
      isDay: task.execution?.isDay ?? task.isDay ?? item.isDay,
      ...buildZarubaQueueTaskMetadata(task),
    }];
  });
  let savedPrison = prisonState;
  if (JSON.stringify(prisonQueue) !== JSON.stringify(prisonState.queue || [])) {
    savedPrison = await updatePrisonAutomation({ queue: prisonQueue }, sessionPath);
  }

  const bossState = await getBossAutomationState(sessionPath);
  const bossQueue = (bossState.queue || []).flatMap((item) => {
    const origin = String(item.origin || "");
    // Legacy background-created boss entries are removed once. Boss tasks are
    // now added only by an explicit user action and always after the user's queue.
    if (origin === "zaruba") return [];
    if (!origin.includes("zaruba") || !item.serverTaskId) return [item];
    const task = activeTasks.get(String(item.serverTaskId || ""));
    if (!task || task.kind !== "boss" || task.execution?.queueable === false) {
      const normalized = { ...item, origin: "manual" };
      for (const key of [
        "serverTaskId",
        "taskLabel",
        "taskRequiredAmount",
        "taskCurrentAmount",
        "plannedDamage",
        "zarubaObjective",
        "strategy",
        "objective",
      ]) {
        delete normalized[key];
      }
      return [normalized];
    }
    return [{
      ...item,
      ...buildZarubaQueueTaskMetadata(task),
    }];
  });
  let savedBoss = bossState;
  if (JSON.stringify(bossQueue) !== JSON.stringify(bossState.queue || [])) {
    savedBoss = await updateBossAutomation({
      queue: bossQueue,
      queueBaseRevision: bossState.queueRevision,
    }, sessionPath);
  }
  return {
    prison: {
      before: (prisonState.queue || []).length,
      after: (savedPrison.queue || []).length,
    },
    boss: {
      before: (bossState.queue || []).length,
      after: (savedBoss.queue || []).length,
    },
  };
}

async function executeZarubaDirectTask(task, options = {}, dependencies = {}) {
  const miniRequest = dependencies.performMiniGameRequest || performMiniGameRequest;
  const strategy = task && task.execution ? task.execution.strategy : null;
  const miniGameKind = strategy === "fartovy_spin"
    ? "fartovy"
    : strategy === "wheel_spin"
      ? "wheel"
      : strategy === "katala_cheap"
        ? "katala"
        : null;
  if (miniGameKind && options.serializedMiniGameKind !== miniGameKind) {
    if (miscMiniGameAutomationRuntime.running && miscMiniGameAutomationRuntime.kind === miniGameKind) {
      return {
        ok: true,
        executed: false,
        type: miniGameKind,
        reason: `${miniGameKind}_automation_running`,
      };
    }
    return runMiniGameSerialized(miniGameKind, () => executeZarubaDirectTask(task, {
      ...options,
      serializedMiniGameKind: miniGameKind,
    }, dependencies));
  }
  return (dependencies.withContext || withContext)(options.sessionPath, async ({ client, selfUserId }) => {
    if (strategy === "podogrev_free") {
      return collectPodogrevForActiveZaruba(client);
    }
    if (["collect_profit_first", "wait_profit"].includes(strategy)) {
      const status = normalizeBusinessDashboard(await client.business.all());
      if (!status.canCollect) {
        return { ok: true, executed: false, reason: "profit_not_ready", status };
      }
      const profitGate = await getZarubaProfitCollectionGate(client);
      if (!profitGate.canCollect) {
        return { ok: true, executed: false, reason: profitGate.reason, status, zaruba: profitGate };
      }
      const response = await client.business.collect();
      return {
        ok: isSuccessfulGameResponse(response),
        executed: true,
        type: "profit",
        before: status,
        response: sanitizeBossAutomationValue(getGamePayload(response)),
      };
    }
    if (strategy === "friend_send_stash") {
      const requestedCount = Math.max(
        1,
        Math.min(5, Number(task && task.execution && task.execution.remaining) || 1),
      );
      const transfer = await sendDuplicateStashes(client, selfUserId, requestedCount, options.stashRecipientId);
      const successes = transfer.successes.length;
      return {
        ok: successes === requestedCount,
        executed: successes > 0,
        type: "friend_send_stash",
        requestedCount,
        successes,
        failures: transfer.failures.length,
        reason: successes === requestedCount ? null : transfer.reason || "stash_transfer_incomplete",
      };
    }
    if (strategy === "friend_harknut") {
      const requestedCount = Math.max(
        1,
        Math.min(5, Number(task && task.execution && task.execution.remaining) || 1),
      );
      const interaction = await performMonthlyInteraction(
        client,
        selfUserId,
        "Harknut",
        requestedCount,
      );
      return {
        ok: interaction.successes.length > 0,
        executed: interaction.successes.length > 0,
        type: "friend_harknut",
        requestedCount,
        successes: interaction.successes.length,
        failures: interaction.failures.length,
        reason: interaction.successes.length > 0 ? null : "no_available_interaction_targets",
      };
    }
    if (strategy === "friend_fight") {
      const requestedCount = Math.max(
        1,
        Math.min(5, Number(task && task.execution && task.execution.remaining) || 1),
      );
      const interaction = await performMonthlyInteraction(
        client,
        selfUserId,
        "Fight",
        requestedCount,
      );
      return {
        ok: interaction.successes.length === requestedCount,
        executed: interaction.successes.length > 0,
        type: "friend_fight",
        requestedCount,
        successes: interaction.successes.length,
        failures: interaction.failures.length,
        reason: interaction.successes.length === requestedCount ? null : "no_available_interaction_targets",
      };
    }
    if (strategy === "fartovy_spin") {
      const requestedCount = Math.max(
        1,
        Math.min(5, Number(task && task.execution && task.execution.remaining) || 1),
      );
      if (
        options.serializedMiniGameKind !== "fartovy"
        && miscMiniGameAutomationRuntime.running
        && miscMiniGameAutomationRuntime.kind === "fartovy"
      ) {
        return {
          ok: true,
          executed: false,
          type: "fartovy_spin",
          requestedCount,
          successes: 0,
          reason: "fartovy_automation_running",
        };
      }

      const setBet = await miniRequest(
        client,
        "fartovy-set-bet-zaruba",
        "/api/slots-game/set-bet",
        { bet: 1 },
      );
      if (!setBet.ok) {
        return {
          ok: false,
          executed: true,
          type: "fartovy_spin",
          requestedCount,
          successes: 0,
          reason: getMiniGameFailureMessage(setBet, "slots_set_bet_failed"),
        };
      }

      let state = await getSlotsGameState(client);
      let successes = 0;
      let failure = null;
      if (state.bonusActive) {
        const bonus = await resolveZarubaSlotsBonus(client, state);
        state = bonus.state;
        if (!bonus.ok) failure = bonus.reason;
      }
      while (successes < requestedCount) {
        if (failure) break;
        const availability = getSlotsSpinAvailability(state, 1);
        if (!availability.canSpin) {
          if (!options.slotsBuyMatches) {
            failure = "waiting_free_slots_spin";
            break;
          }
          const reservation = options.reserveRubles
            ? await options.reserveRubles(1, "slots") : { allowed: false, reason: "rubles_purchase_disabled" };
          if (!reservation.allowed) { failure = reservation.reason; break; }
          const bought = await miniRequest(client, "fartovy-buy-zaruba", "/api/slots-game/buy-grass", { amount: 1 });
          if (!bought.ok || bought.data?.ok === false || bought.data?.error) { failure = getMiniGameFailureMessage(bought, "slots_purchase_failed"); break; }
          await reservation.confirm?.();
          state = await getSlotsGameState(client);
          if (!getSlotsSpinAvailability(state, 1).canSpin) { failure = "purchased_matches_not_credited"; break; }
        }
        const spun = await miniRequest(
          client,
          "fartovy-spin-zaruba",
          "/api/slots-game/spin",
          {},
          { rateLimitRetries: 3 },
        );
        if (!spun.ok) {
          failure = getMiniGameFailureMessage(spun, "slots_spin_failed");
          break;
        }
        successes += 1;
        state = await getSlotsGameState(client);
        if (state.bonusActive) {
          const bonus = await resolveZarubaSlotsBonus(client, state);
          state = bonus.state;
          if (!bonus.ok) {
            failure = bonus.reason;
            break;
          }
        }
      }
      return {
        ok: successes === requestedCount,
        executed: successes > 0,
        type: "fartovy_spin",
        requestedCount,
        successes,
        reason: successes === requestedCount ? null : failure || "fartovy_task_incomplete",
      };
    }
    if (strategy === "wheel_spin") {
      let state = await getWheelGameState(client);
      let tickets = Number(state.tickets ?? state.balances?.tickets ?? state.balances?.fortune_tickets) || 0;
      let hasPendingPrize = Boolean(state.pending || state.prizePending || state.hasPendingPrize);
      let settledPrize = false;
      let purchasedTickets = 0;
      let spentRubles = 0;

      if (hasPendingPrize) {
        const choice = await miniRequest(
          client,
          "wheel-cash-zaruba",
          "/api/wheel/prize-choice",
          { choice: "cash" },
        );
        if (!choice.ok) {
          return {
            ok: false,
            executed: true,
            type: "wheel",
            stage: "settle_pending_prize",
            reason: getMiniGameFailureMessage(choice, "wheel_prize_choice_failed"),
          };
        }
        settledPrize = true;
        state = await getWheelGameState(client);
        tickets = Number(state.tickets ?? state.balances?.tickets ?? state.balances?.fortune_tickets) || 0;
        hasPendingPrize = Boolean(state.pending || state.prizePending || state.hasPendingPrize);
      }

      if (tickets <= 0) {
        const rubles = Number(state.rubles ?? state.balances?.rubles) || 0;
        if (rubles < ZARUBA_WHEEL_TICKET_PRICE_RUBLES) {
          return {
            ok: true,
            executed: settledPrize,
            type: "wheel",
            reason: "not_enough_rubles_for_ticket",
            rubles,
            requiredRubles: ZARUBA_WHEEL_TICKET_PRICE_RUBLES,
          };
        }
        const reservation = options.reserveWheelTicket
          ? await options.reserveWheelTicket()
          : { allowed: false, reason: "wheel_purchase_policy_missing" };
        if (!reservation.allowed) {
          return { ok: true, executed: settledPrize, type: "wheel", reason: reservation.reason };
        }
        const purchase = await miniRequest(
          client,
          "wheel-buy-zaruba",
          "/api/wheel/buy-tickets",
          { count: 1 },
        );
        if (!purchase.ok || purchase.data?.ok === false || purchase.data?.error) {
          return {
            ok: false,
            executed: true,
            type: "wheel",
            stage: "buy_ticket",
            reason: getMiniGameFailureMessage(purchase, "wheel_ticket_purchase_failed"),
          };
        }
        await reservation.confirm?.();
        purchasedTickets = 1;
        spentRubles = ZARUBA_WHEEL_TICKET_PRICE_RUBLES;
        state = await getWheelGameState(client);
        tickets = Number(state.tickets ?? state.balances?.tickets ?? state.balances?.fortune_tickets) || 0;
        if (tickets <= 0) {
          return {
            ok: false,
            executed: true,
            type: "wheel",
            stage: "verify_ticket",
            reason: "purchased_ticket_not_credited",
            purchasedTickets,
            spentRubles,
          };
        }
      }

      const result = await miniRequest(client, "wheel-spin-zaruba", "/api/wheel/spin", {});
      if (!result.ok) {
        return {
          ok: false,
          executed: true,
          type: "wheel",
          stage: "spin",
          reason: getMiniGameFailureMessage(result, "wheel_spin_failed"),
          purchasedTickets,
          spentRubles,
        };
      }
      state = await getWheelGameState(client);
      hasPendingPrize = Boolean(state.pending || state.prizePending || state.hasPendingPrize);
      if (hasPendingPrize) {
        const choice = await miniRequest(
          client,
          "wheel-cash-zaruba",
          "/api/wheel/prize-choice",
          { choice: "cash" },
        );
        if (!choice.ok) {
          return {
            ok: false,
            executed: true,
            type: "wheel",
            stage: "settle_spin_prize",
            reason: getMiniGameFailureMessage(choice, "wheel_prize_choice_failed"),
            purchasedTickets,
            spentRubles,
            spun: true,
          };
        }
        settledPrize = true;
      }
      invalidateMiscDashboardCache();
      return {
        ok: true,
        executed: true,
        type: "wheel",
        ticketsBefore: tickets,
        purchasedTickets,
        spentRubles,
        settledPrize,
        spun: true,
        response: sanitizeBossAutomationValue(result.data),
      };
    }
    if (strategy === "katala_cheap") {
      const katalaState = await getKatalaGameState(client);
      // The original client grants a free deal once per 24 hours.
      const lastFree = Date.parse(katalaState.lastFreePlayTime);
      const free = Object.prototype.hasOwnProperty.call(katalaState, "lastFreePlayTime")
        && (!katalaState.lastFreePlayTime || (Number.isFinite(lastFree) && Date.now() - lastFree >= 86_400_000));
      let reservation;
      if (!free) {
        reservation = options.reserveRubles
          ? await options.reserveRubles(1, "katala") : { allowed: false, reason: "rubles_purchase_disabled" };
        if (!reservation.allowed) return { ok: true, executed: false, type: "katala", reason: reservation.reason };
      }
      const started = await client.post("/api/card/start", { json: {} });
      if (!isSuccessfulGameResponse(started) || started.data?.ok === false || started.data?.error) {
        return { ok: false, executed: true, type: "katala", stage: "start" };
      }
      await reservation?.confirm?.();
      const finished = await client.post("/api/card/finish", { json: {} });
      const result = {
        ok: isSuccessfulGameResponse(finished),
        executed: true,
        type: "katala",
        stage: "finish",
        maxRubles: Math.min(1, asNonNegativeInt(options.maxRubles, 1) ?? 1),
        response: sanitizeBossAutomationValue(getGamePayload(finished)),
      };
      await (dependencies.appendMiniGameHistory || appendMiniGameHistory)({ action: "katala-zaruba", ok: result.ok, data: result.response });
      return result;
    }
    return { ok: false, executed: false, reason: "unsupported_direct_task", strategy };
  });
}

async function prepareZarubaDamageWeapons(client, task, options = {}) {
  const successful = (response) => isSuccessfulGameResponse(response)
    && response.data?.ok !== false && !response.data?.error;
  const bootstrap = await client.bosses.bootstrap();
  if (!successful(bootstrap)) return { ok: false, reason: "weapon_state_unavailable" };
  const remaining = Math.max(0, Number(task.requiredAmount) - Number(task.currentAmount));
  const plan = selectZarubaDamageWeapon(normalizeZarubaWeaponStats(bootstrap), remaining,
    { allowPurchase: options.allowPurchase === true });
  if (!plan.sufficient) return { ok: false, reason: "no_suitable_weapon" };
  if (options.maxWeaponValue != null && plan.priceRubles > options.maxWeaponValue) {
    return { ok: false, reason: "weapon_rule_limit" };
  }
  if (plan.purchaseRubles > 0) {
    const reservation = options.reserveRubles
      ? await options.reserveRubles(plan.purchaseRubles, "weapon") : { allowed: false, reason: "rubles_purchase_disabled" };
    if (!reservation.allowed) return { ok: false, reason: reservation.reason };
    let confirmedRubles = 0;
    for (const [weaponType, count] of Object.entries(plan.purchases)) {
      const bought = await client.bosses.buyWeapon({ weaponType, count }, { rateLimitRetries: 0 });
      if (!successful(bought)) return { ok: false, reason: "weapon_purchase_failed" };
      confirmedRubles += BOSS_CONSUMABLE_PRICES_RUBLES[weaponType] * count;
      await reservation.confirm?.(confirmedRubles);
    }
    const verified = await client.bosses.bootstrap();
    if (!successful(verified)) return { ok: false, reason: "weapon_state_unavailable" };
    const inventory = normalizeZarubaWeaponStats(verified);
    if (plan.weapons.some((weapon) => inventory[weapon.key].count < weapon.uses)) {
      return { ok: false, reason: "purchased_weapons_not_credited" };
    }
  }
  return { ok: true, ...plan };
}

async function enqueueZarubaTask(task, metadata = {}, sessionPath) {
  const serverTaskId = String(task && task.taskId || "").trim();
  const targetId = asPositiveInt(task && task.targetId, null);
  if (!serverTaskId || !targetId) {
    throw new Error("Задание Зарубы не содержит подтверждённые taskId и targetId.");
  }
  const origin = String(metadata.origin || "manual+zaruba");
  const priority = Number(metadata.priority || 0);
  const taskMetadata = buildZarubaQueueTaskMetadata(task);
  let damageHitTypes = task.objective === "damage"
    ? normalizeBossAutomationHitTypes(task.execution && task.execution.hitTypes)
    : [];
  if (task.objective === "damage" && damageHitTypes.length === 0) {
    return { queued: false, reason: "no_suitable_weapon", queue: "boss" };
  }
  if (task.kind === "boss") {
    const current = await getBossAutomationState(sessionPath);
    if ((current.queue || []).some((item) => String(item.serverTaskId || "") === serverTaskId)) {
      return { queued: false, reason: "duplicate", queue: "boss" };
    }
    const existingBossIndex = (current.queue || [])
      .findIndex((item) => Number(item.bossId) === targetId);
    if (existingBossIndex >= 0) {
      if (origin === "zaruba") {
        // Automatic rules do not rewrite a boss already configured by the user.
        return { queued: false, reason: "boss_already_queued", queue: "boss" };
      }
      const queue = [...current.queue];
      const existing = queue[existingBossIndex];
      queue[existingBossIndex] = {
        ...existing,
        serverTaskId,
        origin: "manual+zaruba",
        priority: Number(existing.priority || 0),
        ...taskMetadata,
        ...(task.objective === "damage" && !existing.comboMode ? { hitTypes: damageHitTypes } : {}),
      };
      const saved = await updateBossAutomation({
        queue,
        queueBaseRevision: current.queueRevision,
      }, sessionPath);
      return {
        queued: true,
        reason: "tagged_existing",
        queue: "boss",
        queueItemId: queue[existingBossIndex].queueItemId,
        queueRevision: saved.queueRevision,
      };
    }
    if (task.objective === "damage") {
      const prepared = await withContext(sessionPath, async ({ client }) => {
        const live = await loadLiveZarubaTaskWithClient(client, serverTaskId);
        if (!live.checked) return { ok: false, reason: "zaruba_state_unavailable" };
        if (!live.task || live.task.completed) return { ok: false, reason: "zaruba_task_completed" };
        return prepareZarubaDamageWeapons(client, live.task, {
          allowPurchase: origin === "zaruba", reserveRubles: metadata.reserveRubles,
          maxWeaponValue: metadata.bossRule?.maxWeaponValue,
        });
      });
      if (!prepared.ok) return { queued: false, reason: prepared.reason, queue: "boss" };
      damageHitTypes = normalizeBossAutomationHitTypes(prepared.hitTypes);
    }
    const item = {
      bossId: targetId,
      mode: metadata.bossRule?.mode || null,
      zarubaMaxWeaponValue: metadata.bossRule?.maxWeaponValue ?? null,
      comboMode: "",
      label: task.label || `Заруба · босс #${targetId}`,
      queueItemId: `zaruba-boss-${serverTaskId}`,
      serverTaskId,
      origin,
      priority,
      ...taskMetadata,
      ...(task.objective === "damage" ? { hitTypes: damageHitTypes } : {}),
    };
    const saved = await updateBossAutomation({
      queue: metadata.insertPosition === "front"
        ? [...(current.queue || []).slice(0, current.enabled || current.running ? 1 : 0), item, ...(current.queue || []).slice(current.enabled || current.running ? 1 : 0)]
        : [...(current.queue || []), item],
      queueBaseRevision: current.queueRevision,
    }, sessionPath);
    return { queued: true, queue: "boss", queueItemId: item.queueItemId, queueRevision: saved.queueRevision };
  }
  if (task.kind === "prison" || task.kind === "master") {
    const current = await getPrisonAutomationState(sessionPath);
    if ((current.queue || []).some((item) => String(item.serverTaskId || "") === serverTaskId)) {
      return { queued: false, reason: "duplicate", queue: "prison" };
    }
    const item = {
      queueItemId: `zaruba-${task.kind}-${serverTaskId}`,
      targetType: task.kind,
      targetId,
      isDay: task.isDay !== false,
      repeatCount: 1,
      serverTaskId,
      origin,
      priority,
      ...taskMetadata,
    };
    const saved = await updatePrisonAutomation({
      queue: [item, ...(current.queue || [])],
    }, sessionPath);
    return { queued: true, queue: "prison", queueItemId: item.queueItemId, version: saved.version };
  }
  throw new Error(`Задание ${task.kind} нельзя поставить в существующую очередь.`);
}

const proPrisonFeaturesByAccount = new Map();

async function getProPrisonFeatures(sessionPath) {
  const context = await resolvePrisonAutomationAccountContext(sessionPath);
  let service = proPrisonFeaturesByAccount.get(context.accountId);
  if (!service) {
    service = createProPrisonFeatureService({
      stateDir: path.dirname(context.statePath),
      sessionPath: context.sessionPath,
      withContext,
      enqueueZarubaTask: (task, metadata) => enqueueZarubaTask(task, metadata, context.sessionPath),
      reconcileZarubaQueues: (tasks) => reconcileZarubaQueues(tasks, context.sessionPath),
      executeZarubaDirectTask: (task, options = {}) => executeZarubaDirectTask(task, {
        ...options,
        sessionPath: context.sessionPath,
      }),
      inviteCollected,
      acceptFriendRequests,
      getLootContainersDashboard,
      openLootContainer,
    });
    proPrisonFeaturesByAccount.set(context.accountId, service);
  }
  return service;
}

async function getZarubaDashboard(sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).getZarubaDashboard(sessionPath);
}

async function getBagsDashboard(sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).getBagsDashboard(sessionPath);
}

async function getZarubaAutomationState(sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).getZarubaAutomation();
}

async function updateZarubaAutomation(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).updateZarubaAutomation(options);
}

async function runZarubaAutomationTick(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).runZarubaAutomationTick(options, sessionPath);
}

async function runZarubaAction(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).runZarubaAction(options, sessionPath);
}

async function runBagsAction(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).runBagsAction(options, sessionPath);
}

async function buyBossWeapon(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).buyBossWeapon(options, sessionPath);
}

async function getBarygaShop(sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).getBarygaShop(sessionPath);
}

async function getGuildDashboard(sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).getGuildDashboard(sessionPath);
}

async function getBaulAutomationState(sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).getBaulAutomation();
}

async function updateBaulAutomation(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).updateBaulAutomation(options);
}

async function runBaulAutomationTick(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).runBaulAutomationTick(options, sessionPath);
}

async function getFriendsAutomationState(sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).getFriendsAutomation();
}

async function updateFriendsAutomation(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).updateFriendsAutomation(options);
}

async function runFriendsAutomationTick(options = {}, sessionPath) {
  return (await getProPrisonFeatures(sessionPath)).runFriendsAutomationTick(options, sessionPath);
}

const proPrisonAutomationRuntime = {
  timerId: null,
  running: false,
  lastRunAt: {
    zaruba: 0,
    baul: 0,
    friends: 0,
  },
};

async function runProPrisonBackgroundAutomations(sessionPath) {
  if (proPrisonAutomationRuntime.running) return;
  proPrisonAutomationRuntime.running = true;
  try {
    const now = Date.now();
    const [zaruba, baul, friends] = await Promise.all([
      getZarubaAutomationState(),
      getBaulAutomationState(),
      getFriendsAutomationState(),
    ]);
    if ((zaruba.enabled || zaruba.autoClaimFree) && now - proPrisonAutomationRuntime.lastRunAt.zaruba >= 15_000) {
      proPrisonAutomationRuntime.lastRunAt.zaruba = now;
      await runZarubaAutomationTick({ dryRun: false }, sessionPath);
    }
    if (baul.enabled && now - proPrisonAutomationRuntime.lastRunAt.baul >= 60_000) {
      proPrisonAutomationRuntime.lastRunAt.baul = now;
      await runBaulAutomationTick({ dryRun: false }, sessionPath);
    }
    const friendsIntervalMs = Math.max(5, Number(friends.intervalMinutes || 30)) * 60_000;
    if (friends.enabled && now - proPrisonAutomationRuntime.lastRunAt.friends >= friendsIntervalMs) {
      proPrisonAutomationRuntime.lastRunAt.friends = now;
      await runFriendsAutomationTick({ dryRun: false }, sessionPath);
    }
  } catch (error) {
    await logEvent("pro_prison.background.error", {
      message: getErrorMessage(error),
    });
  } finally {
    proPrisonAutomationRuntime.running = false;
  }
}

async function initializeProPrisonAutomations(sessionPath) {
  if (proPrisonAutomationRuntime.timerId) {
    return { running: proPrisonAutomationRuntime.running, timerActive: true };
  }
  proPrisonAutomationRuntime.timerId = setInterval(() => {
    void runProPrisonBackgroundAutomations(sessionPath);
  }, 15_000);
  proPrisonAutomationRuntime.timerId.unref?.();
  return { running: false, timerActive: true };
}

function calculateTalentProjection(status, options = {}) {
  const talentStatus = status && typeof status === "object" ? status : {};
  const currentPoints = Math.max(
    0,
    Math.trunc(asNumber(
      talentStatus.totalPoints,
      asNumber(talentStatus.spentPoints, 0) + asNumber(talentStatus.unspentPoints, 0),
    )),
  );
  const currentDamage = Math.max(0, Math.trunc(asNumber(talentStatus.currentDamage, 0)));
  const targetPoints = Math.max(
    currentPoints,
    Math.min(999, Math.trunc(asNumber(options.targetPoints, currentPoints))),
  );
  let damageToTarget = 0;
  for (let points = currentPoints; points < targetPoints; points += 1) {
    const required = getRequiredTalentDamage(points);
    damageToTarget += points === currentPoints
      ? Math.max(0, required - currentDamage)
      : required;
  }

  let damageBudget = Math.max(0, Math.trunc(asNumber(options.damage, 0)));
  let simulatedDamage = currentDamage + damageBudget;
  let projectedPoints = currentPoints;
  while (projectedPoints < 999) {
    const required = getRequiredTalentDamage(projectedPoints);
    if (simulatedDamage < required) {
      break;
    }
    simulatedDamage -= required;
    projectedPoints += 1;
  }
  return {
    currentPoints,
    currentDamage,
    targetPoints,
    damageToTarget,
    damageBudget,
    projectedPoints,
    gainedPoints: projectedPoints - currentPoints,
    remainingDamage: simulatedDamage,
    isMax: projectedPoints >= 999,
  };
}

async function getTalentCalculator(options = {}, sessionPath) {
  return withContext(sessionPath, async ({ client }) => {
    const response = await client.talents.status();
    const status = normalizeHeaderTalentStatus(response);
    if (!status) {
      throw new Error("Игровой сервер не вернул состояние талантов.");
    }
    const payload = getGamePayload(response) || {};
    return {
      status,
      projection: calculateTalentProjection(status, options),
      config: sanitizeBossAutomationValue(payload.config || null),
    };
  });
}

module.exports = {
  INTERACTION_TYPES,
  acceptFriendRequests,
  buyBossKey,
  buyBossWeapon,
  buyMissingMasterItems,
  buyMonthlyDay,
  collectBusinessProfit,
  cleanupFriends,
  collectIds,
  collectPodogrev,
  getBusinessStatus,
  getBagsDashboard,
  getBarygaShop,
  getBaulAutomationState,
  getDamageIntel,
  getDamageReport,
  getAuthStatus,
  getSavedAuthAccounts,
  getBossAutomationLog,
  getBossAutomationState,
  getEconomyStatus,
  getHeaderExtras,
  getLetsCookAutomationState,
  getLetsCookDashboard,
  getLootContainersDashboard,
  getFriendsList,
  getFriendStatuses,
  getFriendsAutomationState,
  getFriendsSummary,
  getFriendsBatchProgress,
  getMiscAutomationState,
  getMiniGameAutomationState,
  getMiscDashboard,
  getGuildDashboard,
  getWearableCollection,
  getVparitStatus,
  getPodogrevStatus,
  getSponsorsDirectory,
  getBossBuffs,
  getBossDashboard,
  getBossState,
  getPrisonDetail,
  getPrisonDashboard,
  getPrisonAutomationState,
  getPrisonEnergyCosts,
  getPrisonStatus,
  getTalentCalculator,
  getZarubaAutomationState,
  getZarubaDashboard,
  hitBoss,
  inviteCollected,
  inviteUsers,
  initializeBossAutomation,
  initializeDamageHistory,
  initializeLetsCookAutomation,
  initializeMiscAutomation,
  initializeProPrisonAutomations,
  initializePrisonAutomation,
  initializeVpiAutomation,
  initializeDailyToiletPaperAutomation,
  keepAliveSavedAuthAccounts,
  loginByInitData,
  loginByTokens,
  loopBoss,
  openLootContainer,
  openVorkutaBox,
  probeBossKeyPrices,
  runFriendsAction,
  runFriendsAutomationTick,
  runMiniGameAction,
  runLetsCookAutomationTick,
  runMiscAutomationTick,
  runBossAutomationTick,
  runDamageHistoryTick,
  runPrison,
  runPrisonAutomationTick,
  runVpiAutoClaimTick,
  runBaulAutomationTick,
  runBagsAction,
  runZarubaAction,
  runZarubaAutomationTick,
  startVparitAll,
  startMiniGameAutomation,
  startBoss,
  startNextBossFromAutomationQueue,
  restoreBossMeleeCooldown,
  spendVpiDamage,
  switchSavedAuthAccount,
  surrenderBoss,
  takeDamageSnapshot,
  updateBossAutomation,
  updateBaulAutomation,
  updateFriendsAutomation,
  updateFartovyAutoSpin,
  updateLetsCookAutomation,
  updateMiscAutomation,
  updatePrisonAutomation,
  updateZarubaAutomation,
  useBossWeaponBatch,
  stopMiniGameAutomation,
  __test: {
    estimateBossComboRubles,
    assertBossComboAffordable,
    buildBossAutomationStartPayload,
    deferBossAutomationQueueHead,
    getBossAutomationStartConfirmation,
    reconcileBossAutomationStartConfirmation,
    getBossAutomationRunStatus,
    shouldRunBossAutomationQueue,
    getMoscowDateKey,
    isBossAutomationSkippableError,
    shouldBossAutomationChainAfterSettle,
    loadBossRuntimeSnapshot,
    normalizeBossAutomationState,
    normalizeBossAutomationHitTypes,
    normalizeBossAutomationQueueEntry,
    removeUnavailableBossAutomationQueueCombos,
    getBossAutomationQueueUpdateDecision,
    getAuthorityCandidateMeta,
    applyBossAutomationQueueOperations,
    areBossAutomationQueueItemsAddressableEqual,
    evaluateFriendCriteria,
    normalizeInteractionProgress,
    normalizeFriendCriteriaOptions,
    normalizeFriendCleanupCriteria,
    buildIncomingFriendRequestPlan,
    extractTalentPointsTotal,
    normalizeIncomingFriendRequestRecords,
    normalizeFriendProfileRecords,
    selectFriendCleanupTargets,
    loadLowestAuthorityTargets,
    performMonthlyInteraction,
    pickNumeric,
    isBossConsumableShortageResponse,
    isNoVorkutaBoxesResponse,
    isPendingBossRewardResponse,
    isBossRateLimitedResponse,
    retryBossStartAfterPendingReward,
    settleBossRewardClaim,
    recordBossClaimResultActivity,
    getBossAutomationSessionLossRewardContext,
    shouldPollBossAutomationUnsettledReward,
    doesBossRewardSettlementTaskMatch,
    trimBossAutomationEvents,
    buildBossAutomationClaimActivity,
    executeBossRunnerLoop,
    buildBossComboEconomy,
    resolveBossComboElapsedMs,
    prepareFastActiveBossHitPlan,
    prepareFastSoloBossFinisherPlan,
    shouldRunBossNeedleFinisher,
    shouldRunSoloBossFinisher,
    validateBossSurrenderRequest,
    mergeSoloBossComboAndFinisherResult,
    settleBossAutomationStartedItem,
    summarizeBossAutomationResponse,
    summarizeBossAutomationHitResult,
    sanitizeBossAutomationValue,
    mergeBossAutomationRecentActivityRecords,
    summarizeBossClaimRewards,
    summarizeBossHitCombo,
    summarizeBossComboReward,
    summarizeBossComboRun,
    selectCollectedInteractionTargets,
    selectFriendInteractionTargets,
    summarizeBossCheckSession,
    buildBossMeleeCooldowns,
    parseBossTimestampMs,
    parseBossCooldownReductionMs,
    summarizeBossFriendDamage,
    summarizeBossRewards,
    normalizeEconomyResourceSnapshot,
    normalizeHeaderWeaponStats,
    applyBossMeleeCooldownAfterHit,
    getRequiredTalentDamage,
    normalizeHeaderTalentStatus,
    normalizeDashboardExtraCurrencies,
    normalizeAchievementHeaderSummary,
    normalizeStashGearHeaderSummary,
    normalizeVpiHeaderSummary,
    collectVpiRewardIfReady,
    getVpiAutoClaimDelayMs,
    normalizeVpiDamageLeft,
    normalizeDamageHeaderSummary,
    validateVpiDamageRequest,
    getBossNeedleFinisherDecision,
    executeBossNeedleFinisher,
    summarizeBossNeedleFinisher,
    shouldUseWeaponsAfterBossNeedleFinisher,
    mergeBossComboAndNeedleFinisherResult,
    shouldRunZarubaDamageFallback,
    buildLiveZarubaDamageWeaponPlan,
    isQueuedZarubaDamageTask,
    mergeZarubaDamageFallbackResult,
    buildEconomyTrends,
    buildStaleEconomyStatus,
    buildPersistedEconomyStatus,
    isUsableEconomyInitResponse,
    normalizeBossWeaponCounts,
    normalizeBossWeaponBatchOptions,
    buildBossWeaponDelta,
    buildBossRewardComboModes,
    enrichBossRewardItems,
    normalizeWearableInventoryResponse,
    loadWearableInventory,
    getKatalaAttemptDecision,
    getSlotsSpinAvailability,
    isMiniGameActionBlockedByAutomation,
    buildMiniGameWearableInventoryDelta,
    normalizeMiniGameWearableInventory,
    normalizeMiniGameOutcome,
    normalizeMiniGameBalances,
    resolveMiniGameWearableRefs,
    resolveMiniGameWearableRewards,
    normalizeFartovyAutoSpinSettings,
    shouldSetFartovyBet,
    buildMiniGameDailyStats,
    evaluatePokerHand,
    choosePokerReplacementIndexes,
    normalizePokerTargets,
    calculateTalentProjection,
    buildLootContainerStats,
    enqueueZarubaTask,
    prepareZarubaDamageWeapons,
    executeZarubaDirectTask,
    reconcileZarubaQueues,
    findDuplicateStash,
    sendDuplicateStashes,
    buildMonthlyPrisonQueueItem,
    getMonthlyQueueProgress,
    executeMonthlyCheapAction,
    collectMonthlyEnergyRequirements,
    advancePrisonAutomationQueue,
    observePrisonAutomationRun,
    getMasterRunCompletionCount,
    getPrisonAutomationUpdatedQueue,
    runMiniGameSerialized,
    getChefirRecoveryDecision,
    restorePrisonAutomationEnergyIfNeeded,
    getZarubaProfitCollectionGate,
    getPodogrevInboxItemEnergy,
    selectPodogrevTokensUpToEnergy,
    loadActiveZarubaPodogrevTask,
    collectPodogrevForActiveZaruba,
    getSessionSelfUserId,
    getAccountArtifactPath,
    assertZarubaStartedForProfitCollection,
    collectBusinessProfitAfterZarubaCheck,
    loadPrisonAutomationState,
    writePrisonAutomationStateAtomically,
  },
};
