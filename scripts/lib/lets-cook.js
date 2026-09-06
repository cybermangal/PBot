const fs = require("node:fs/promises");
const path = require("node:path");

const { createApiClient, loadSessionSnapshot, resolveSessionPath } = require("./api-client");
const { logEvent } = require("./logger");
const { ARTIFACTS_DIR } = require("./pbot");

const BASE_PATH = "/api/lets-cook";
const AUTOMATION_STATE_PATH = path.join(ARTIFACTS_DIR, "lets-cook-automation-latest.json");
const EVENT_ENERGY_MAX = 100;
const EVENT_ENERGY_REGEN_SECONDS = 120;
const STACK_ENERGY = 90;
const ACTIVE_DAYS = 6;
const DEAL_RESERVE_SECONDS = 30 * 60;
const SAFE_OUTSTANDING_OFFERS = 1;
const SOAP_ENERGY_PRICE = 8;
const SOAP_ENERGY_ENDPOINT = `${BASE_PATH}/buy-energy`;
const WATCHER_PONT_ENERGY = 25;
const WATCHER_REVEAL_ENERGY = 50;
const WATCHER_CASE_PROGRESS = 90;

const DEALER_ROLES = new Set(["cook", "baryga"]);
const COUNTERPART_ROLES = Object.freeze({ cook: "baryga", baryga: "cook" });

const ROLE_LABELS = Object.freeze({
  none: "Роль не выбрана",
  cook: "Варщик",
  baryga: "Барыга",
  watcher: "Смотрящий",
});

const ROLE_LOCKERS = Object.freeze({ cook: 13, baryga: 14, watcher: 15 });
const LOCKER_FIXED_REWARDS = Object.freeze([
  { key: "authority", label: "Авторитет", amount: 100 },
  { key: "cigarettes", label: "Папиросы", amount: 50 },
  { key: "collectionsDrop", label: "Нычки", amount: 10 },
]);
const FREE_GET_ENDPOINTS = new Set([
  `${BASE_PATH}/state`,
  `${BASE_PATH}/candidates`,
  `${BASE_PATH}/requests`,
  `${BASE_PATH}/sent`,
  `${BASE_PATH}/top`,
  `${BASE_PATH}/notifications`,
]);

const FREE_POST_ENDPOINTS = new Set([
  `${BASE_PATH}/change-role`,
  `${BASE_PATH}/do-action`,
  `${BASE_PATH}/open-locker`,
  `${BASE_PATH}/claim-reward`,
  `${BASE_PATH}/claim-quick-reward`,
  `${BASE_PATH}/claim-karma`,
  `${BASE_PATH}/send-request`,
  `${BASE_PATH}/accept-request`,
  `${BASE_PATH}/change-target`,
  `${BASE_PATH}/watcher-action`,
  `${BASE_PATH}/complete-case`,
]);

const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  intervalSec: 60,
  maxActionsPerTick: 20,
  cookPartnerUids: [],
  barygaPartnerUids: [],
  autoAccept: true,
  autoInvite: true,
  autoClaim: true,
  autoOpenLockers: true,
  autoSelectRole: true,
  allowSoapEnergy: false,
  preferredRole: "cook",
});

const runtime = {
  initialized: false,
  accountId: null,
  statePath: null,
  sessionPath: null,
  running: false,
  timerId: null,
  settings: { ...DEFAULT_SETTINGS },
  tickCount: 0,
  lastTickAt: null,
  lastAction: null,
  lastError: null,
  history: [],
};

let serializedOperation = Promise.resolve();
let clickSequence = 0;

function clampInteger(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(numeric)));
}

function asBoolean(value, fallback) {
  return value === undefined || value === null ? fallback : Boolean(value);
}

function normalizePositiveUid(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const uid = Number(raw);
  return Number.isSafeInteger(uid) && uid > 0 ? uid : null;
}

function normalizePositiveUidList(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,;]+/)
      : value === undefined || value === null
        ? []
        : [value];
  const seen = new Set();
  return values.reduce((uids, item) => {
    const uid = normalizePositiveUid(item);
    if (uid && !seen.has(uid)) {
      seen.add(uid);
      uids.push(uid);
    }
    return uids;
  }, []);
}

function getSettingPartnerUids(settings, role) {
  const poolKey = `${role}PartnerUids`;
  if (settings && Object.hasOwn(settings, poolKey)) {
    return normalizePositiveUidList(settings[poolKey]);
  }
  const legacyUid = normalizePositiveUid(settings && settings[`${role}PartnerUid`]);
  return legacyUid ? [legacyUid] : [];
}

function normalizeSettings(value = {}) {
  const preferredRole = ["cook", "baryga", "watcher"].includes(String(value.preferredRole || "").toLowerCase())
    ? String(value.preferredRole).toLowerCase()
    : DEFAULT_SETTINGS.preferredRole;
  return {
    enabled: asBoolean(value.enabled, DEFAULT_SETTINGS.enabled),
    intervalSec: clampInteger(value.intervalSec, 15, 600, DEFAULT_SETTINGS.intervalSec),
    maxActionsPerTick: clampInteger(value.maxActionsPerTick, 1, 50, DEFAULT_SETTINGS.maxActionsPerTick),
    cookPartnerUids: getSettingPartnerUids(value, "cook"),
    barygaPartnerUids: getSettingPartnerUids(value, "baryga"),
    autoAccept: asBoolean(value.autoAccept, DEFAULT_SETTINGS.autoAccept),
    autoInvite: asBoolean(value.autoInvite, DEFAULT_SETTINGS.autoInvite),
    autoClaim: asBoolean(value.autoClaim, DEFAULT_SETTINGS.autoClaim),
    autoOpenLockers: asBoolean(value.autoOpenLockers, DEFAULT_SETTINGS.autoOpenLockers),
    autoSelectRole: asBoolean(value.autoSelectRole, DEFAULT_SETTINGS.autoSelectRole),
    allowSoapEnergy: asBoolean(value.allowSoapEnergy, DEFAULT_SETTINGS.allowSoapEnergy),
    preferredRole,
  };
}

function unwrapResponse(result, endpoint) {
  const data = result && Object.hasOwn(result, "data") ? result.data : result;
  const failed = !result
    || result.ok === false
    || (data && typeof data === "object" && (data.ok === false || data.success === false));
  if (!failed) {
    return data;
  }
  const code = data && typeof data === "object"
    ? data.error || data.message || data.code
    : null;
  const error = new Error(`${endpoint}: ${code || `HTTP ${result && result.status ? result.status : "error"}`}`);
  error.code = code || "request_failed";
  error.status = result && result.status ? result.status : null;
  throw error;
}

function assertFreeEndpoint(method, endpoint) {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const allowed = normalizedMethod === "GET" ? FREE_GET_ENDPOINTS : FREE_POST_ENDPOINTS;
  if (!allowed.has(endpoint)) {
    throw new Error(`Blocked non-free Lets Cook endpoint: ${normalizedMethod} ${endpoint}`);
  }
  return true;
}

async function freeGet(client, endpoint, options) {
  assertFreeEndpoint("GET", endpoint);
  return unwrapResponse(await client.get(endpoint, options), endpoint);
}

async function freePost(client, endpoint, json = {}) {
  assertFreeEndpoint("POST", endpoint);
  return unwrapResponse(await client.post(endpoint, { json, rateLimitRetries: 2 }), endpoint);
}

function assertSoapEnergyEndpoint(endpoint, allowed) {
  if (endpoint !== SOAP_ENERGY_ENDPOINT) {
    throw new Error(`Blocked paid Lets Cook endpoint: POST ${endpoint}`);
  }
  if (!allowed) {
    throw new Error("Soap energy spending is disabled");
  }
  return true;
}

function isTransientLetsCookError(error) {
  return ["cooldown", "duplicate_click"].includes(error && error.code);
}

function isInactiveLetsCookError(error) {
  return error && error.code === "window_inactive";
}

async function soapEnergyPost(client) {
  assertSoapEnergyEndpoint(SOAP_ENERGY_ENDPOINT, runtime.settings.allowSoapEnergy);
  return unwrapResponse(await client.post(SOAP_ENERGY_ENDPOINT, { json: {}, rateLimitRetries: 2 }), SOAP_ENERGY_ENDPOINT);
}

function getEventEnergy(rawState, nowUnix = Math.floor(Date.now() / 1000)) {
  const energy = Math.max(0, Number(rawState && rawState.energy) || 0);
  const max = Math.max(1, Number(rawState && rawState.energyMax) || EVENT_ENERGY_MAX);
  const energyTs = Number(rawState && rawState.energyTs);
  if (!Number.isFinite(energyTs) || energy >= max) {
    return Math.min(max, energy);
  }
  return Math.min(max, energy + Math.floor(Math.max(0, nowUnix - energyTs) / EVENT_ENERGY_REGEN_SECONDS));
}

function isDealerRole(role) {
  return DEALER_ROLES.has(String(role || "").toLowerCase());
}

function getDealerPartnerUid(settings, role) {
  return getDealerPartnerUids(settings, role)[0] || null;
}

function getDealerPartnerUids(settings, role) {
  const normalizedRole = String(role || "").toLowerCase();
  if (!isDealerRole(normalizedRole)) {
    return [];
  }
  return getSettingPartnerUids(settings, normalizedRole);
}

function buildRoleSwitchPlan(state, settings = DEFAULT_SETTINGS) {
  const normalizedSettings = normalizeSettings(settings);
  const currentRole = String(state.role || "none").toLowerCase();
  const desiredRole = normalizedSettings.preferredRole;
  const pending = currentRole !== "none" && currentRole !== desiredRole;
  const base = {
    currentRole,
    desiredRole,
    pending,
    ready: currentRole === "none",
    reason: currentRole === "none" ? "role_not_selected" : "same_role",
  };
  if (!pending) {
    return base;
  }
  if (["reward", "loose"].includes(String(state.status || "").toLowerCase()) || state.hasQuickReward) {
    return { ...base, ready: false, reason: "pending_reward" };
  }
  if (isDealerRole(currentRole)) {
    const stack = Math.max(0, Number(state.stack) || 0);
    const progress = Math.max(0, Number(state.progress) || 0);
    if (stack > 0 || progress > 0) {
      return {
        ...base,
        ready: false,
        reason: "finish_dealer_cycle",
      };
    }
    if (Math.max(0, Number(state.shieldRemainingSeconds) || 0) > 0) {
      return { ...base, ready: false, reason: "shield_active" };
    }
  }
  if (currentRole === "watcher" && Math.max(0, Number(state.progress) || 0) > 0) {
    return { ...base, ready: false, reason: "finish_watcher_case" };
  }
  return { ...base, ready: true, reason: "safe_to_switch" };
}

function normalizeDealReward(rawReward = {}, eventLevel = 1) {
  const source = rawReward && typeof rawReward === "object" ? rawReward : {};
  const tiers = (Array.isArray(source.tiers) ? source.tiers : [])
    .map((tier) => ({
      minLevel: Math.max(1, Number(tier && tier.minLevel) || 1),
      eventPoint: Math.max(0, Number(tier && tier.eventPoint) || 0),
      tokenDrop: Math.max(0, Number(tier && tier.tokenDrop) || 0),
      rating: Math.max(0, Number(tier && tier.rating) || 0),
      sigs: Math.max(0, Number(tier && tier.sigs) || 0),
      collectionsDrop: Math.max(0, Number(tier && tier.collectionsDrop) || 0),
    }))
    .sort((left, right) => left.minLevel - right.minLevel);
  const currentTierMinLevel = Math.max(1, Number(source.currentTierMinLevel) || 1);
  const currentTier = tiers.find((tier) => tier.minLevel === currentTierMinLevel)
    || tiers.filter((tier) => tier.minLevel <= eventLevel).at(-1)
    || tiers[0]
    || null;
  return {
    dealReward: {
      ...source,
      currentTierMinLevel,
      tiers,
    },
    currentTier,
  };
}

function normalizeLetsCookState(rawState = {}, nowUnix = Math.floor(Date.now() / 1000)) {
  const role = ["cook", "baryga", "watcher"].includes(String(rawState.role || "").toLowerCase())
    ? String(rawState.role).toLowerCase()
    : "none";
  const windowStartUnix = Math.max(0, Number(rawState.windowStartUnix) || 0);
  const windowEndUnix = Math.max(0, Number(rawState.windowEndUnix) || 0);
  const calculatedActionEnd = windowStartUnix > 0 ? windowStartUnix + ACTIVE_DAYS * 86400 : windowEndUnix;
  const actionEndUnix = windowEndUnix > 0
    ? Math.min(windowEndUnix, calculatedActionEnd || windowEndUnix)
    : calculatedActionEnd;
  const progressMax = Math.max(1, Number(rawState.progressMax) || STACK_ENERGY);
  const progress = Math.max(0, Math.min(progressMax, Number(rawState.progress) || 0));
  const eventEnergy = getEventEnergy(rawState, nowUnix);
  const actionSecondsLeft = Math.max(0, actionEndUnix - nowUnix);
  const claimSecondsLeft = Math.max(0, windowEndUnix - nowUnix);
  const regeneratingEnergyLeft = Math.floor(actionSecondsLeft / EVENT_ENERGY_REGEN_SECONDS);
  const totalFreeEnergyLeft = eventEnergy + regeneratingEnergyLeft;
  const stack = Math.max(0, Number(rawState.stack) || 0);
  const possibleStackTotal = stack + Math.floor((progress + totalFreeEnergyLeft) / progressMax);
  const eventLevel = Math.max(1, Number(rawState.eventLevel) || 1);
  const normalizedReward = normalizeDealReward(rawState.dealReward, eventLevel);
  const lockers = (Array.isArray(rawState.lockers) ? rawState.lockers : []).map((locker) => ({
    lockerId: Number(locker.lockerId) || 0,
    tokenCurrencyKey: locker.tokenCurrencyKey || null,
    tokenCost: Math.max(0, Number(locker.tokenCost) || 0),
    tokenBalance: Math.max(0, Number(locker.tokenBalance) || 0),
    canOpen: Boolean(locker.canOpen),
  }));
  return {
    ...rawState,
    role,
    roleLabel: ROLE_LABELS[role],
    eventEnergy,
    energyMax: Math.max(1, Number(rawState.energyMax) || EVENT_ENERGY_MAX),
    progress,
    progressMax,
    stack,
    eventLevel,
    eventPoints: Math.max(0, Number(rawState.eventPoints) || 0),
    pointsToNext: rawState.pointsToNext === null || rawState.pointsToNext === undefined
      ? null
      : Math.max(0, Number(rawState.pointsToNext) || 0),
    dealReward: normalizedReward.dealReward,
    currentDealTier: normalizedReward.currentTier,
    shieldRemainingSeconds: Math.max(0, Number(rawState.shieldRemainingSeconds) || 0),
    targetUid: rawState.targetUid ?? null,
    targetRole: ["cook", "baryga"].includes(String(rawState.targetRole || "").toLowerCase())
      ? String(rawState.targetRole).toLowerCase()
      : null,
    launchId: typeof rawState.launchId === "string" && rawState.launchId.trim() ? rawState.launchId : null,
    caseReady: Boolean(rawState.caseReady) || (role === "watcher" && progress >= progressMax),
    phase: String(rawState.phase || "not_started").toLowerCase(),
    status: String(rawState.status || "game").toLowerCase(),
    windowStartUnix,
    windowEndUnix,
    actionEndUnix,
    actionSecondsLeft,
    claimSecondsLeft,
    totalFreeEnergyLeft,
    possibleStackTotal,
    lockers,
  };
}

async function loadLetsCookState(client) {
  try {
    const rawState = await freeGet(client, `${BASE_PATH}/state`);
    return {
      inactive: false,
      rawState,
      state: normalizeLetsCookState(rawState),
    };
  } catch (error) {
    if (!isInactiveLetsCookError(error)) {
      throw error;
    }
    const rawState = {
      phase: "inactive",
      status: "inactive",
      inactiveReason: error.code,
    };
    return {
      inactive: true,
      rawState,
      state: normalizeLetsCookState(rawState),
    };
  }
}

function buildStrategy(state, settings = DEFAULT_SETTINGS) {
  const normalizedSettings = normalizeSettings(settings);
  const roleSwitch = buildRoleSwitchPlan(state, normalizedSettings);
  if (state.role === "watcher") {
    const remaining = Math.max(0, (state.progressMax || WATCHER_CASE_PROGRESS) - state.progress);
    return {
      mode: "watcher",
      roleSwitch,
      forceDeal: false,
      stackEnergy: state.progressMax || WATCHER_CASE_PROGRESS,
      remainingEnergyToStack: remaining,
      recommendation: roleSwitch.pending
        ? "Сначала завершаем начатое расследование, затем безопасно меняем роль."
        : state.targetUid
          ? `Расследование по выбранной цели: осталось ${remaining} действий.`
          : "Сначала проверяем входящие предложения, затем выбираем цель для расследования.",
    };
  }
  const forceDeal = state.stack > 0 && (
    state.actionSecondsLeft <= DEAL_RESERVE_SECONDS
    || (roleSwitch.pending && state.progress <= 0)
  );
  return {
    mode: "dealer",
    roleSwitch,
    forceDeal,
    stackEnergy: state.progressMax || STACK_ENERGY,
    remainingEnergyToStack: Math.max(0, (state.progressMax || STACK_ENERGY) - state.progress),
    recommendation: roleSwitch.pending
      ? "Смена роли отложена: завершаем текущую заготовку и проводим сделку без потери прогресса."
      : forceDeal
      ? "Активная часть заканчивается: сдаём накопленную партию без ожидания полного порога."
      : "Клиентского лимита накопления нет: бот продолжает готовить и отправляет весь готовый запас указанному партнёру, как только предыдущее предложение принято.",
  };
}

function listFromPayload(payload, ...keys) {
  if (Array.isArray(payload)) {
    return payload;
  }
  for (const key of keys) {
    if (payload && Array.isArray(payload[key])) {
      return payload[key];
    }
  }
  return [];
}

function normalizeLockerRewards(response = {}) {
  const source = response && typeof response === "object" && response.reward && typeof response.reward === "object"
    ? response.reward
    : response && typeof response === "object" ? response : {};
  const rewards = LOCKER_FIXED_REWARDS.map((item) => ({ ...item }));
  const tattoo = source.tattoo && typeof source.tattoo === "object" ? source.tattoo : null;
  const tattooId = tattoo && tattoo.id !== undefined ? tattoo.id : source.tattooId;
  if (tattooId !== undefined && tattooId !== null) {
    const setOwned = Math.max(0, Number(tattoo && tattoo.setOwned) || 0);
    const setCount = Math.max(0, Number(tattoo && tattoo.setCount) || 0);
    rewards.push({
      key: "tattoo",
      label: "Наколка",
      amount: 1,
      itemId: Number(tattooId) || tattooId,
      name: tattoo && (tattoo.name || tattoo.setName) ? tattoo.name || tattoo.setName : null,
      setName: tattoo && tattoo.setName ? tattoo.setName : null,
      setOwned,
      setCount,
    });
  }
  const respirator = source.respirator && typeof source.respirator === "object" ? source.respirator : null;
  const respiratorId = respirator && respirator.id !== undefined ? respirator.id : source.respiratorItemId;
  if (respiratorId !== undefined && respiratorId !== null) {
    rewards.push({
      key: "respirator",
      label: "Респиратор",
      amount: 1,
      itemId: Number(respiratorId) || respiratorId,
      name: respirator && respirator.name ? respirator.name : null,
    });
  }
  return rewards;
}

function normalizeLockerAction(entry) {
  if (!entry || entry.type !== "locker_opened" || Array.isArray(entry.rewards)) {
    return entry;
  }
  return {
    ...entry,
    lockerRole: entry.lockerRole
      || Object.keys(ROLE_LOCKERS).find((role) => ROLE_LOCKERS[role] === Number(entry.lockerId))
      || null,
    rewards: normalizeLockerRewards(entry.response),
  };
}

function serializeOperation(operation) {
  const run = serializedOperation.catch(() => undefined).then(operation);
  serializedOperation = run.catch(() => undefined);
  return run;
}

function recordAction(type, details = {}) {
  const entry = { at: new Date().toISOString(), type, ...details };
  runtime.lastAction = entry;
  runtime.history = [entry, ...runtime.history].slice(0, 40);
  logEvent(`lets_cook.${type}`, details);
  return entry;
}

function buildAutomationView() {
  const soapSpent = runtime.history.reduce((sum, entry) => sum + Math.max(0, Number(entry && entry.soapSpent) || 0), 0);
  return {
    accountId: runtime.accountId,
    initialized: runtime.initialized,
    running: runtime.running,
    timerActive: Boolean(runtime.timerId),
    settings: { ...runtime.settings },
    tickCount: runtime.tickCount,
    lastTickAt: runtime.lastTickAt,
    lastAction: normalizeLockerAction(runtime.lastAction),
    lastError: runtime.lastError,
    history: runtime.history.map(normalizeLockerAction),
    safety: {
      soapSpendingAllowed: runtime.settings.allowSoapEnergy,
      soapSpent,
      paidEnergyEndpointBlocked: !runtime.settings.allowSoapEnergy,
      soapEnergyPrice: SOAP_ENERGY_PRICE,
      eventEnergySpendingAllowed: true,
      maxConcurrentDealerOffers: SAFE_OUTSTANDING_OFFERS,
      roleSwitchMode: "deferred_until_progress_is_safe",
    },
  };
}

async function persistAutomationState() {
  const payload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    settings: runtime.settings,
    tickCount: runtime.tickCount,
    lastTickAt: runtime.lastTickAt,
    lastAction: runtime.lastAction,
    lastError: runtime.lastError,
    history: runtime.history,
  };
  const statePath = runtime.statePath || AUTOMATION_STATE_PATH;
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function resolveAutomationAccountContext(sessionPath) {
  const resolvedSessionPath = resolveSessionPath(sessionPath);
  const session = await loadSessionSnapshot(resolvedSessionPath);
  const accountId = String(
    session && session.telegram && session.telegram.initDataUnsafe
      && session.telegram.initDataUnsafe.user && session.telegram.initDataUnsafe.user.id || "",
  ).trim();
  if (!/^\d+$/.test(accountId)) {
    throw new Error("Cannot isolate Lets Cook automation without the active account ID.");
  }
  return {
    accountId,
    sessionPath: resolvedSessionPath,
    statePath: path.join(ARTIFACTS_DIR, "accounts", accountId, "lets-cook-automation-latest.json"),
  };
}

function clearTimer() {
  if (runtime.timerId) {
    clearInterval(runtime.timerId);
  }
  runtime.timerId = null;
}

function scheduleTimer() {
  clearTimer();
  if (!runtime.settings.enabled) {
    return;
  }
  runtime.timerId = setInterval(() => {
    void runLetsCookAutomationTick({ reason: "timer" }, runtime.sessionPath).catch((error) => {
      logEvent("lets_cook.background_tick_failed", { reason: "timer", error });
    });
  }, runtime.settings.intervalSec * 1000);
  runtime.timerId.unref?.();
}

async function initializeLetsCookAutomation(sessionPath) {
  const context = await resolveAutomationAccountContext(sessionPath);
  if (runtime.initialized && runtime.accountId === context.accountId) {
    return buildAutomationView();
  }
  clearTimer();
  runtime.accountId = context.accountId;
  runtime.statePath = context.statePath;
  runtime.sessionPath = context.sessionPath;
  runtime.settings = { ...DEFAULT_SETTINGS };
  runtime.tickCount = 0;
  runtime.lastTickAt = null;
  runtime.lastAction = null;
  runtime.lastError = null;
  runtime.history = [];
  try {
    const payload = JSON.parse(await fs.readFile(runtime.statePath, "utf8"));
    runtime.settings = normalizeSettings(payload.settings || payload);
    runtime.tickCount = Math.max(0, Number(payload.tickCount) || 0);
    runtime.lastTickAt = payload.lastTickAt || null;
    runtime.lastAction = payload.lastAction
      && !(payload.lastAction.type === "tick_failed" && isTransientLetsCookError(payload.lastAction.error))
      ? payload.lastAction
      : null;
    runtime.lastError = payload.lastError || null;
    runtime.history = Array.isArray(payload.history)
      ? payload.history
        .filter((entry) => !(entry && entry.type === "tick_failed" && isTransientLetsCookError(entry.error)))
        .slice(0, 40)
      : [];
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      logEvent("lets_cook.state_recovered", { error });
    }
    runtime.settings = { ...DEFAULT_SETTINGS };
    await persistAutomationState();
  }
  runtime.initialized = true;
  scheduleTimer();
  if (runtime.settings.enabled) {
    setImmediate(() => {
      void runLetsCookAutomationTick({ reason: "startup" }, runtime.sessionPath).catch((error) => {
        logEvent("lets_cook.background_tick_failed", { reason: "startup", error });
      });
    });
  }
  return buildAutomationView();
}

async function getOptional(client, endpoint, fallback) {
  try {
    return await freeGet(client, endpoint);
  } catch (error) {
    logEvent("lets_cook.optional_read_failed", { endpoint, error });
    return fallback;
  }
}

async function getLetsCookDashboard(sessionPath) {
  await initializeLetsCookAutomation(sessionPath);
  const client = await createApiClient({ sessionPath });
  const loadedState = await loadLetsCookState(client);
  const { inactive, state } = loadedState;
  const [topPayload, requestsPayload, sentPayload] = inactive
    ? [{}, [], []]
    : await Promise.all([
      getOptional(client, `${BASE_PATH}/top`, {}),
      getOptional(client, `${BASE_PATH}/requests`, []),
      getOptional(client, `${BASE_PATH}/sent`, []),
    ]);
  const strategy = buildStrategy(state, runtime.settings);
  const top = listFromPayload(topPayload, "top", "data");
  return {
    generatedAt: new Date().toISOString(),
    inactive,
    state,
    strategy,
    requests: listFromPayload(requestsPayload, "requests", "offers", "data"),
    sent: listFromPayload(sentPayload, "sent", "offers", "data"),
    top: top.slice(0, 10),
    selfTop: topPayload && topPayload.self ? topPayload.self : null,
    automation: buildAutomationView(),
    rules: {
      activeDays: ACTIVE_DAYS,
      claimDays: 1,
      energyRegenSeconds: EVENT_ENERGY_REGEN_SECONDS,
      soapEnergyPrice: SOAP_ENERGY_PRICE,
      shieldEnergyPrice: 50,
      shieldMinutes: 30,
      stackEnergy: state.progressMax,
      lockerTokenPrice: 100,
      dealRewardBasis: "event_level",
      batchRewardMultiplierConfirmed: false,
      dealerOfferPolicy: {
        maxConcurrent: SAFE_OUTSTANDING_OFFERS,
        serverLimit: null,
        reason: "watcher_exposure",
      },
      watcher: {
        pontEnergy: WATCHER_PONT_ENERGY,
        revealIncomingEnergy: WATCHER_REVEAL_ENERGY,
        investigationProgress: WATCHER_CASE_PROGRESS,
        targetRoleVisible: false,
      },
    },
  };
}

async function claimSafeRewards(client, state) {
  if (!runtime.settings.autoClaim) {
    return null;
  }
  if (state.status === "loose") {
    const response = await freePost(client, `${BASE_PATH}/claim-reward`);
    return recordAction("revealed_by_watcher", {
      lostAmount: Math.max(0, Number(state.lostAmount) || 0),
      revealedByUid: state.revealedByUid || null,
      soapSpent: 0,
      response,
    });
  }
  if (state.status === "reward") {
    const response = await freePost(client, `${BASE_PATH}/claim-reward`);
    return recordAction("reward_claimed", { response });
  }
  if (state.hasQuickReward) {
    const response = await freePost(client, `${BASE_PATH}/claim-quick-reward`);
    return recordAction("quick_reward_claimed", { response });
  }
  if (state.isKarmaSetAvailable) {
    const response = await freePost(client, `${BASE_PATH}/claim-karma`);
    return recordAction("karma_claimed", { response });
  }
  return null;
}

async function openReadyLocker(client, state) {
  if (!runtime.settings.autoOpenLockers) {
    return null;
  }
  const preferredLocker = ROLE_LOCKERS[state.role];
  const locker = state.lockers.find((item) => item.canOpen && item.lockerId === preferredLocker)
    || state.lockers.find((item) => item.canOpen);
  if (!locker) {
    return null;
  }
  const response = await freePost(client, `${BASE_PATH}/open-locker`, { lockerId: locker.lockerId });
  return recordAction("locker_opened", {
    lockerId: locker.lockerId,
    lockerRole: Object.keys(ROLE_LOCKERS).find((role) => ROLE_LOCKERS[role] === locker.lockerId) || null,
    rewards: normalizeLockerRewards(response),
    response,
  });
}

async function buySoapEnergyIfNeeded(client, state) {
  if (!runtime.settings.allowSoapEnergy || state.phase !== "active" || state.eventEnergy > 0) {
    return null;
  }
  try {
    const response = await soapEnergyPost(client);
    const soapSpent = Math.max(0, Number(response && response.soapSpent) || SOAP_ENERGY_PRICE);
    return recordAction("soap_energy_bought", {
      soapSpent,
      eventEnergy: Math.max(0, Number(response && response.energy) || state.energyMax),
      energyMax: state.energyMax,
    });
  } catch (error) {
    if (["not_enough_soap", "already_full"].includes(error && error.code)) {
      return recordAction("soap_energy_unavailable", {
        reason: error.code,
        requiredSoap: SOAP_ENERGY_PRICE,
        eventEnergy: state.eventEnergy,
      });
    }
    throw error;
  }
}

function normalizeRoleValue(value) {
  const numericRoles = { 1: "cook", 2: "baryga", 3: "watcher" };
  const normalized = String(value ?? "").toLowerCase();
  return numericRoles[normalized] || (["cook", "baryga", "watcher"].includes(normalized) ? normalized : null);
}

function isCompatibleDealerRequest(state, request, partnerUids = null) {
  const requestRole = normalizeRoleValue(request && request.fromRole);
  const requestUid = normalizePositiveUid(request && (request.fromUid ?? request.uid));
  const hasPartnerFilter = partnerUids !== null && partnerUids !== undefined;
  const trustedUids = normalizePositiveUidList(partnerUids);
  return requestRole !== "watcher"
    && (!requestRole || requestRole === COUNTERPART_ROLES[state.role])
    && (!hasPartnerFilter || trustedUids.includes(requestUid));
}

async function acceptReadyDealerRequest(client, state, strategy) {
  if (!runtime.settings.autoAccept || !isDealerRole(state.role) || state.stack <= 0) {
    return null;
  }
  const partnerUids = getDealerPartnerUids(runtime.settings, state.role);
  if (!partnerUids.length) {
    return null;
  }
  const payload = await freeGet(client, `${BASE_PATH}/requests`);
  const requests = listFromPayload(payload, "requests", "offers", "data");
  const request = requests.find((item) => item && item.offerId && isCompatibleDealerRequest(state, item, partnerUids));
  if (!request) {
    return null;
  }
  try {
    const response = await freePost(client, `${BASE_PATH}/accept-request`, { offerId: request.offerId });
    return recordAction("request_accepted", {
      role: state.role,
      fromUid: request.uid || request.fromUid || null,
      fromRole: normalizeRoleValue(request.fromRole),
      offerId: request.offerId,
      response,
    });
  } catch (error) {
    if (["offer_not_found", "not_ready", "already_processed"].includes(error && error.code)) {
      return recordAction("offer_expired", { offerId: request.offerId, reason: error.code });
    }
    throw error;
  }
}

function isEligibleCandidate(candidate, expectedRole = null) {
  const uid = Number(candidate && candidate.uid);
  const candidateRole = normalizeRoleValue(candidate && candidate.role);
  return uid > 0
    && candidate.canInteract !== false
    && candidate.activeInEvent !== false
    && !candidate.disabledReason
    && candidateRole !== "watcher"
    && (!expectedRole || !candidateRole || candidateRole === expectedRole);
}

function resolveDealerPartner(state, settings, candidates = []) {
  const partnerUids = getDealerPartnerUids(settings, state && state.role);
  if (!partnerUids.length) {
    return { partnerUid: null, candidate: null, reason: "partner_required" };
  }
  const expectedRole = COUNTERPART_ROLES[state.role];
  let unavailable = null;
  let unknown = null;
  for (const partnerUid of partnerUids) {
    const candidate = candidates.find((item) => normalizePositiveUid(item && item.uid) === partnerUid) || null;
    if (candidate && isEligibleCandidate(candidate, expectedRole)) {
      return { partnerUid, candidate, reason: null };
    }
    if (!candidate && !unknown) {
      unknown = { partnerUid, candidate: null, reason: null };
      continue;
    }
    if (!unavailable) {
      unavailable = {
        partnerUid,
        candidate,
        reason: normalizeRoleValue(candidate.role) === "watcher"
          ? "configured_partner_is_watcher"
          : candidate.disabledReason || "configured_partner_unavailable",
      };
    }
  }
  return unknown || unavailable;
}

function getSentOfferTargetUid(offer) {
  return normalizePositiveUid(offer && (offer.toUid ?? offer.targetUid ?? offer.uid));
}

function getOutstandingTrustedDealerOffers(sentOffers, partnerUids) {
  const trustedUids = new Set(normalizePositiveUidList(partnerUids));
  if (!trustedUids.size) {
    return [];
  }
  return (Array.isArray(sentOffers) ? sentOffers : [])
    .filter((offer) => trustedUids.has(getSentOfferTargetUid(offer)));
}

async function sendOneDealerOffer(client, state, strategy) {
  if (!runtime.settings.autoInvite || !isDealerRole(state.role) || state.stack <= 0) {
    return null;
  }
  const partnerUids = getDealerPartnerUids(runtime.settings, state.role);
  if (!partnerUids.length) {
    return recordAction("partner_required", { role: state.role, stack: state.stack });
  }
  const sentPayload = await freeGet(client, `${BASE_PATH}/sent`);
  const sent = listFromPayload(sentPayload, "sent", "offers", "data");
  const trustedSent = getOutstandingTrustedDealerOffers(sent, partnerUids);
  if (trustedSent.length >= SAFE_OUTSTANDING_OFFERS) {
    return recordAction("waiting_for_partner", {
      outstandingOffers: trustedSent.length,
      externalOffers: Math.max(0, sent.length - trustedSent.length),
      offerPolicy: SAFE_OUTSTANDING_OFFERS,
      stack: state.stack,
    });
  }
  const candidatesPayload = await freeGet(client, `${BASE_PATH}/candidates`);
  const candidates = listFromPayload(candidatesPayload, "candidates", "data");
  const resolvedPartner = resolveDealerPartner(state, runtime.settings, candidates);
  const candidate = resolvedPartner.candidate;
  if (resolvedPartner.reason) {
    return recordAction("partner_unavailable", {
      role: state.role,
      stack: state.stack,
      toUid: resolvedPartner.partnerUid,
      reason: resolvedPartner.reason,
    });
  }
  const partnerUid = resolvedPartner.partnerUid;
  try {
    const response = await freePost(client, `${BASE_PATH}/send-request`, { toUid: partnerUid });
    return recordAction("offer_sent", {
      role: state.role,
      toUid: partnerUid,
      nickname: candidate && candidate.nickname ? candidate.nickname : null,
      targetSource: "trusted_pool",
      response,
    });
  } catch (error) {
    if (["active_offer", "target_limit", "not_ready", "pair_cooldown"].includes(error && error.code)) {
      return recordAction("partner_unavailable", {
        role: state.role,
        stack: state.stack,
        toUid: partnerUid,
        externalOffers: Math.max(0, sent.length - trustedSent.length),
        reason: error.code,
      });
    }
    throw error;
  }
}

async function acceptWatcherRequest(client, state) {
  if (!runtime.settings.autoAccept || state.role !== "watcher") {
    return null;
  }
  const payload = await freeGet(client, `${BASE_PATH}/requests`);
  const requests = listFromPayload(payload, "requests", "offers", "data");
  const request = requests
    .filter((item) => item && item.offerId && normalizeRoleValue(item.fromRole) !== "watcher")
    .sort((left, right) => (Number(right.sellStack) || 0) - (Number(left.sellStack) || 0))[0];
  if (!request) {
    return null;
  }
  if (state.eventEnergy < WATCHER_REVEAL_ENERGY) {
    return recordAction("watcher_request_waiting", {
      requiredEnergy: WATCHER_REVEAL_ENERGY,
      eventEnergy: state.eventEnergy,
      fromUid: request.fromUid || null,
    });
  }
  try {
    const response = await freePost(client, `${BASE_PATH}/accept-request`, { offerId: request.offerId });
    return recordAction("watcher_request_revealed", {
      fromUid: request.fromUid || null,
      fromRole: normalizeRoleValue(request.fromRole),
      sellStack: Math.max(0, Number(request.sellStack) || 0),
      energySpent: WATCHER_REVEAL_ENERGY,
      response,
    });
  } catch (error) {
    if (["no_energy", "not_enough_energy"].includes(error && error.code)) {
      return recordAction("watcher_request_waiting", {
        requiredEnergy: WATCHER_REVEAL_ENERGY,
        eventEnergy: 0,
        reason: "energy_regeneration",
      });
    }
    if (["offer_not_found", "not_ready", "already_processed"].includes(error && error.code)) {
      return recordAction("offer_expired", { offerId: request.offerId, reason: error.code });
    }
    throw error;
  }
}

function getCaughtUids(state) {
  return new Set((Array.isArray(state.caught) ? state.caught : []).map((item) => Number(
    item && typeof item === "object" ? item.uid ?? item.userId ?? item.targetUid : item,
  )).filter(Boolean));
}

function pickWatcherGuess(candidate) {
  const visibleRole = normalizeRoleValue(candidate && candidate.role);
  if (isDealerRole(visibleRole)) {
    return visibleRole;
  }
  const previousGuesses = runtime.history.filter((item) => item.type === "watcher_target_selected").length;
  return previousGuesses % 2 === 0 ? "cook" : "baryga";
}

async function selectWatcherTarget(client, state) {
  const candidatesPayload = await freeGet(client, `${BASE_PATH}/candidates`);
  const candidates = listFromPayload(candidatesPayload, "candidates", "data");
  const caughtUids = getCaughtUids(state);
  const candidate = candidates
    .filter((item) => !caughtUids.has(Number(item && item.uid)) && isEligibleCandidate(item))
    .sort((left, right) => {
      const shieldOrder = Number(Boolean(left.shielded)) - Number(Boolean(right.shielded));
      return shieldOrder || (Number(right.stack) || 0) - (Number(left.stack) || 0);
    })[0];
  if (!candidate) {
    return { action: recordAction("watcher_target_unavailable"), selected: false };
  }
  const guessedRole = pickWatcherGuess(candidate);
  try {
    const response = await freePost(client, `${BASE_PATH}/change-target`, {
      targetUid: Number(candidate.uid),
      guessedRole,
    });
    return {
      action: recordAction("watcher_target_selected", {
        targetUid: Number(candidate.uid),
        nickname: candidate.nickname || null,
        guessedRole,
      }),
      response,
      selected: true,
    };
  } catch (error) {
    if (["already_hunted", "target_shielded", "target_limit", "not_ready"].includes(error && error.code)) {
      return {
        action: recordAction("watcher_target_unavailable", {
          targetUid: Number(candidate.uid),
          reason: error.code,
        }),
        selected: false,
      };
    }
    throw error;
  }
}

function resolveMaxActions(options) {
  return options.maxActions === undefined
    ? runtime.settings.maxActionsPerTick
    : clampInteger(options.maxActions, 1, 50, runtime.settings.maxActionsPerTick);
}

async function runWatcherTick(client, rawState, state, options) {
  const revealed = await acceptWatcherRequest(client, state);
  if (revealed) {
    return { action: revealed, state: normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`)) };
  }

  let selectionAction = null;
  if (!state.targetUid) {
    const selection = await selectWatcherTarget(client, state);
    selectionAction = selection.action;
    if (!selection.selected) {
      return { action: selection.action, state, strategy: buildStrategy(state, runtime.settings) };
    }
    rawState = await freeGet(client, `${BASE_PATH}/state`);
    state = normalizeLetsCookState(rawState);
  }

  const actionResults = [];
  const maxActions = resolveMaxActions(options);
  let launchId = state.launchId;
  while (
    actionResults.length < maxActions
    && state.eventEnergy > 0
    && !state.caseReady
    && state.progress < (state.progressMax || WATCHER_CASE_PROGRESS)
  ) {
    let response;
    try {
      response = await freePost(client, `${BASE_PATH}/watcher-action`, { action: "follow" });
    } catch (error) {
      if (["no_energy", "not_enough_energy"].includes(error && error.code)) {
        state = { ...state, eventEnergy: 0 };
        break;
      }
      if (isTransientLetsCookError(error)) {
        break;
      }
      throw error;
    }
    actionResults.push(response);
    launchId = response && response.launchId ? response.launchId : launchId;
    rawState = {
      ...rawState,
      ...response,
      launchId,
      energy: response && response.energy !== undefined
        ? response.energy
        : Math.max(0, state.eventEnergy - 1),
    };
    state = normalizeLetsCookState(rawState);
  }

  state = normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`));
  launchId = state.launchId || launchId;
  if ((state.caseReady || state.progress >= state.progressMax) && launchId) {
    const response = await freePost(client, `${BASE_PATH}/complete-case`, { launchId });
    const action = recordAction("watcher_case_completed", {
      targetUid: state.targetUid,
      guessedRole: state.targetRole,
      outcome: response && response.outcome ? response.outcome : "unknown",
      rewardCount: Math.max(0, Number(response && (response.rewardCount ?? response.count)) || 0),
      soapSpent: 0,
      response,
    });
    return { action, state: normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`)) };
  }

  if (actionResults.length > 0) {
    const action = recordAction("watcher_energy_spent", {
      actions: actionResults.length,
      progress: state.progress,
      progressMax: state.progressMax,
      eventEnergy: state.eventEnergy,
      soapSpent: 0,
    });
    return { action, state, strategy: buildStrategy(state, runtime.settings) };
  }
  if (selectionAction) {
    return { action: selectionAction, state, strategy: buildStrategy(state, runtime.settings) };
  }
  const action = recordAction("waiting", {
    reason: state.eventEnergy <= 0 ? "energy_regeneration" : "watcher_case",
    eventEnergy: state.eventEnergy,
  });
  return { action, state, strategy: buildStrategy(state, runtime.settings) };
}

async function runDealerTick(client, rawState, state, options) {
  let strategy = buildStrategy(state, runtime.settings);
  const accepted = await acceptReadyDealerRequest(client, state, strategy);
  if (accepted) {
    return { action: accepted, state: normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`)) };
  }

  const actionResults = [];
  const maxActions = resolveMaxActions(options);
  let workPauseReason = null;
  while (
    actionResults.length < maxActions
    && state.eventEnergy > 0
    && !strategy.forceDeal
  ) {
    clickSequence += 1;
    let response;
    try {
      response = await freePost(client, `${BASE_PATH}/do-action`, {
        clickId: `pbot-free-${Date.now()}-${clickSequence}`,
      });
    } catch (error) {
      if (["no_energy", "not_enough_energy"].includes(error && error.code)) {
        state = { ...state, eventEnergy: 0 };
        break;
      }
      if (["cooldown", "duplicate_click", "not_ready", "stack_limit"].includes(error && error.code)) {
        workPauseReason = ["cooldown", "duplicate_click"].includes(error.code)
          ? "server_cooldown"
          : "server_stack_limit";
        break;
      }
      throw error;
    }
    actionResults.push(response);
    rawState = { ...rawState, ...response };
    state = normalizeLetsCookState(rawState);
    strategy = buildStrategy(state, runtime.settings);
  }

  if (actionResults.length > 0) {
    state = normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`));
    strategy = buildStrategy(state, runtime.settings);
    recordAction("energy_spent", {
      role: state.role,
      actions: actionResults.length,
      progress: state.progress,
      progressMax: state.progressMax,
      stack: state.stack,
      eventEnergy: state.eventEnergy,
      soapSpent: 0,
    });
  }

  const acceptedAfterWork = await acceptReadyDealerRequest(client, state, strategy);
  if (acceptedAfterWork) {
    return { action: acceptedAfterWork, state: normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`)) };
  }

  const offer = await sendOneDealerOffer(client, state, strategy);
  if (offer) {
    return { action: offer, state, strategy };
  }

  const action = recordAction("waiting", {
    reason: state.eventEnergy <= 0
      ? "energy_regeneration"
      : workPauseReason || (actionResults.length >= maxActions ? "tick_action_limit" : "dealer_idle"),
    role: state.role,
    stack: state.stack,
    eventEnergy: state.eventEnergy,
  });
  return { action, state, strategy };
}

async function executeAutomationTick(options = {}, sessionPath) {
  const client = await createApiClient({ sessionPath });
  const loadedState = await loadLetsCookState(client);
  let { rawState, state } = loadedState;

  const claimed = await claimSafeRewards(client, state);
  if (claimed) {
    return { action: claimed, state: normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`)) };
  }

  const locker = await openReadyLocker(client, state);
  if (locker) {
    return { action: locker, state: normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`)) };
  }

  if (state.phase !== "active") {
    const action = recordAction("waiting", {
      reason: state.phase === "inactive" ? "event_inactive" : state.phase,
      actionSecondsLeft: state.actionSecondsLeft,
    });
    return { action, state };
  }

  if (state.role === "none" && runtime.settings.autoSelectRole) {
    await freePost(client, `${BASE_PATH}/change-role`, { role: runtime.settings.preferredRole });
    state = normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`));
    const action = recordAction("role_selected", { role: state.role });
    return { action, state, strategy: buildStrategy(state, runtime.settings) };
  }

  const roleSwitch = buildRoleSwitchPlan(state, runtime.settings);
  if (roleSwitch.pending && roleSwitch.ready && runtime.settings.autoSelectRole) {
    const fromRole = state.role;
    await freePost(client, `${BASE_PATH}/change-role`, { role: roleSwitch.desiredRole });
    state = normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`));
    const action = recordAction("role_changed", {
      fromRole,
      role: state.role,
      progressPreserved: true,
    });
    return { action, state, strategy: buildStrategy(state, runtime.settings) };
  }
  if (roleSwitch.pending && roleSwitch.reason === "shield_active") {
    const action = recordAction("role_switch_deferred", {
      fromRole: state.role,
      role: roleSwitch.desiredRole,
      reason: roleSwitch.reason,
      shieldRemainingSeconds: state.shieldRemainingSeconds,
    });
    return { action, state, strategy: buildStrategy(state, runtime.settings) };
  }

  const soapEnergy = await buySoapEnergyIfNeeded(client, state);
  if (soapEnergy) {
    return { action: soapEnergy, state: normalizeLetsCookState(await freeGet(client, `${BASE_PATH}/state`)) };
  }

  if (state.role === "watcher") {
    return runWatcherTick(client, rawState, state, options);
  }
  if (isDealerRole(state.role)) {
    return runDealerTick(client, rawState, state, options);
  }
  const action = recordAction("waiting", { reason: "role_required" });
  return { action, state, strategy: buildStrategy(state, runtime.settings) };
}

async function runLetsCookAutomationTick(options = {}, sessionPath) {
  await initializeLetsCookAutomation(sessionPath);
  return serializeOperation(async () => {
    if (runtime.running) {
      return { ...buildAutomationView(), skipped: true, reason: "already_running" };
    }
    runtime.running = true;
    runtime.tickCount += 1;
    runtime.lastTickAt = new Date().toISOString();
    runtime.lastError = null;
    let result;
    try {
      result = await executeAutomationTick(options, sessionPath);
    } catch (error) {
      if (isInactiveLetsCookError(error)) {
        runtime.lastError = null;
        result = {
          action: recordAction("waiting", { reason: "event_inactive" }),
          state: normalizeLetsCookState({
            phase: "inactive",
            status: "inactive",
            inactiveReason: error.code,
          }),
        };
      } else if (isTransientLetsCookError(error)) {
        runtime.lastError = null;
        result = {
          action: recordAction("waiting", {
            reason: "server_cooldown",
            retryAfterSeconds: runtime.settings.intervalSec,
          }),
        };
      } else {
        runtime.lastError = error && error.message ? error.message : String(error);
        recordAction("tick_failed", { error });
        throw error;
      }
    } finally {
      runtime.running = false;
      await persistAutomationState();
    }
    return { ...result, automation: buildAutomationView() };
  });
}

async function updateLetsCookAutomation(options = {}, sessionPath) {
  await initializeLetsCookAutomation(sessionPath);
  const nextSettings = { ...runtime.settings, ...options };
  for (const role of DEALER_ROLES) {
    const legacyKey = `${role}PartnerUid`;
    const poolKey = `${role}PartnerUids`;
    if (Object.hasOwn(options, legacyKey) && !Object.hasOwn(options, poolKey)) {
      delete nextSettings[poolKey];
    }
  }
  runtime.settings = normalizeSettings(nextSettings);
  scheduleTimer();
  await persistAutomationState();
  if (runtime.settings.enabled && options.runNow !== false) {
    setImmediate(() => {
      void runLetsCookAutomationTick({ reason: "settings_update" }, runtime.sessionPath).catch((error) => {
        logEvent("lets_cook.background_tick_failed", { reason: "settings_update", error });
      });
    });
  }
  return buildAutomationView();
}

async function getLetsCookAutomationState(sessionPath) {
  await initializeLetsCookAutomation(sessionPath);
  return buildAutomationView();
}

module.exports = {
  AUTOMATION_STATE_PATH,
  BASE_PATH,
  DEFAULT_SETTINGS,
  LOCKER_FIXED_REWARDS,
  SAFE_OUTSTANDING_OFFERS,
  assertFreeEndpoint,
  assertSoapEnergyEndpoint,
  buildRoleSwitchPlan,
  buildStrategy,
  getDealerPartnerUid,
  getDealerPartnerUids,
  getLetsCookAutomationState,
  getLetsCookDashboard,
  getOutstandingTrustedDealerOffers,
  getSentOfferTargetUid,
  initializeLetsCookAutomation,
  isCompatibleDealerRequest,
  isInactiveLetsCookError,
  isTransientLetsCookError,
  loadLetsCookState,
  normalizeLetsCookState,
  normalizeLockerAction,
  normalizeLockerRewards,
  normalizePositiveUid,
  normalizePositiveUidList,
  resolveDealerPartner,
  runLetsCookAutomationTick,
  updateLetsCookAutomation,
};
