const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appPath = path.resolve(__dirname, "../../ui/app.js");
const appSource = fs.readFileSync(appPath, "utf8");
const standaloneRoot = path.resolve(__dirname, "../../bosses-system-only");
const standaloneAppPath = path.join(standaloneRoot, "ui", "app.js");
const standaloneAppSource = fs.existsSync(standaloneAppPath)
  ? fs.readFileSync(standaloneAppPath, "utf8")
  : null;
const appSources = [appSource, standaloneAppSource].filter(Boolean);

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}`;
  const signatureStart = source.indexOf(signature);
  assert.notEqual(signatureStart, -1, `${functionName} not found`);
  const asyncPrefix = "async ";
  const asyncPrefixStart = signatureStart - asyncPrefix.length;
  const start = asyncPrefixStart >= 0 && source.slice(asyncPrefixStart, signatureStart) === asyncPrefix
    ? asyncPrefixStart
    : signatureStart;
  const paramsEnd = source.indexOf(")", signatureStart);
  assert.notEqual(paramsEnd, -1, `${functionName} params not found`);
  const bodyStart = source.indexOf("{", paramsEnd);
  assert.notEqual(bodyStart, -1, `${functionName} body not found`);

  let depth = 0;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  assert.fail(`${functionName} closing brace not found`);
}

function extractSourceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  assert.notEqual(start, -1, `${startNeedle} not found`);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  assert.notEqual(end, -1, `${endNeedle} not found`);
  return source.slice(start, end);
}

test("combo setting updates and syncs an already formed queue", async () => {
  const synced = [];
  const context = {
    state: { bossRunQueue: [{ bossId: 1, hitTypes: ["knife"] }, { bossId: 2, hitTypes: ["poison"] }] },
    persistBossQueueSettings() {}, markBossRunQueueEdited() {}, persistBossRunQueue() {},
    renderBossRunQueueExcludeList() {}, renderBossRunQueue() {},
    withBossRunQueueHitTypes(item) {
      if (item.skipCombo) delete item.hitTypes;
      return item;
    },
    async syncBossAutomationAfterQueueEdit(_label, payload) { synced.push(payload); },
  };
  vm.runInNewContext(extractFunctionSource(appSource, "handleBossQueueComboSettingChange"), context);
  await context.handleBossQueueComboSettingChange({ target: { checked: false } });
  assert.ok(context.state.bossRunQueue.every((item) => item.skipCombo && !item.hitTypes));
  assert.equal(synced[0].queueOperations.length, 2);
  assert.deepEqual(synced[0].queueOperations[0].from.hitTypes, ["knife"]);
  await context.handleBossQueueComboSettingChange({ target: { checked: true } });
  assert.ok(context.state.bossRunQueue.every((item) => item.skipCombo === false));
});

test("UI uses distinct short labels for solo and vorovskoy boss modes", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "normalizeBossComboMode"),
      extractFunctionSource(appSource, "formatBossModeShortLabel"),
      "this.formatBossModeShortLabel = formatBossModeShortLabel;",
    ].join("\n"),
    context,
  );

  assert.equal(context.formatBossModeShortLabel("vorovskoy"), "В");
  assert.equal(context.formatBossModeShortLabel("odin"), "О");
});

test("UI marks weapon net as combo-only for combo hit requests", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "normalizeBossComboMode"),
      extractFunctionSource(appSource, "isBossComboHitRequest"),
      "this.isBossComboHitRequest = isBossComboHitRequest;",
    ].join("\n"),
    context,
  );

  assert.equal(context.isBossComboHitRequest("/api/bosses/hit", { comboMode: "pacansky" }), true);
  assert.equal(context.isBossComboHitRequest("/api/bosses/loop", { comboMode: "blotnoy" }), true);
  assert.equal(context.isBossComboHitRequest("/api/bosses/hit", { comboMode: "" }), false);
  assert.equal(context.isBossComboHitRequest("/api/bosses/use-weapon", { comboMode: "pacansky" }), false);
});

test("boss dashboard refresh does not filter the whole catalog by the selected boss mode", async () => {
  const calls = [];
  const context = {
    URLSearchParams,
    calls,
    state: { bossDashboard: null },
    collectBossOptions() {
      return { mode: "vorovskoy" };
    },
    setServerStatus() {},
    async apiRequest(method, requestPath) {
      calls.push({ method, requestPath });
      return { fast: true };
    },
    renderBossDashboard() {},
    appendLog() {},
    $() {
      return { textContent: "" };
    },
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "handleBossDashboard"),
      "this.handleBossDashboard = handleBossDashboard;",
    ].join("\n"),
    context,
  );

  await context.handleBossDashboard({
    fast: true,
    silent: true,
    showStatus: false,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].requestPath, "/api/bosses/dashboard?fast=1");
});

test("older automation weapon deltas do not replace a newer manual hit delta", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "isBossWeaponDeltaNewer"),
      "this.isBossWeaponDeltaNewer = isBossWeaponDeltaNewer;",
    ].join("\n"),
    context,
  );

  const older = { capturedAt: "2026-07-24T10:00:00.000Z" };
  const newer = { capturedAt: "2026-07-24T10:00:01.000Z" };
  assert.equal(context.isBossWeaponDeltaNewer(older, newer), false);
  assert.equal(context.isBossWeaponDeltaNewer(newer, older), true);
  assert.equal(context.isBossWeaponDeltaNewer(newer, null), true);
});

const queuePlanHelpersContext = {};
vm.runInNewContext(
  [
    extractFunctionSource(appSource, "getBossCandidateRemainingToday"),
    extractFunctionSource(appSource, "isBossCandidateDailyLimitReached"),
    "this.getBossCandidateRemainingToday = getBossCandidateRemainingToday;",
    "this.isBossCandidateDailyLimitReached = isBossCandidateDailyLimitReached;",
  ].join("\n"),
  queuePlanHelpersContext,
);

const catalogFilterContext = { selectedFilter: "2" };
vm.runInNewContext(
  [
    "function getBossCategoryFilterValue() { return selectedFilter; }",
    "function getBossCatalogItems() { return []; }",
    "function isBossCatalogStartable(item) { return Boolean(item && item.startable); }",
    extractFunctionSource(appSource, "getBossCatalogSortHp"),
    extractFunctionSource(appSource, "compareBossCatalogItems"),
    extractFunctionSource(appSource, "getAllBossCatalogItems"),
    extractFunctionSource(appSource, "getFilteredBossCatalogItems"),
    extractFunctionSource(appSource, "buildBossCatalogSections"),
    "this.getAllBossCatalogItems = getAllBossCatalogItems;",
    "this.getFilteredBossCatalogItems = getFilteredBossCatalogItems;",
    "this.buildBossCatalogSections = buildBossCatalogSections;",
  ].join("\n"),
  catalogFilterContext,
);

const autoQueueCatalogContext = {
  catalogItems: [
    { id: 3, categoryId: 3 },
    { id: 1, categoryId: 1 },
    { id: 2, categoryId: 2 },
  ],
};
vm.runInNewContext(
  [
    "function getBossCatalogItems() { return catalogItems; }",
    "function compareBossCatalogItems(left, right) { return Number(left.id || 0) - Number(right.id || 0); }",
    extractFunctionSource(appSource, "getBossAutoQueueCandidates"),
    "this.getBossAutoQueueCandidates = getBossAutoQueueCandidates;",
  ].join("\n"),
  autoQueueCatalogContext,
);

const queueHpContext = {};
vm.runInNewContext(
  [
    extractSourceBetween(appSource, "const BOSS_MODE_HP_MULTIPLIERS", "const BOSS_COMBO_STORAGE_KEY"),
    extractFunctionSource(appSource, "normalizeBossComboMode"),
    extractFunctionSource(appSource, "getBossModeHpMultiplier"),
    extractFunctionSource(appSource, "resolveBossModeHp"),
    "this.resolveBossModeHp = resolveBossModeHp;",
  ].join("\n"),
  queueHpContext,
);

const soloQueueWarningContext = {};
vm.runInNewContext(
  [
    "const SOLO_BOSS_MODE = 'odin';",
    "const SOLO_BOSS_QUEUE_WARNING_HP_THRESHOLD = 1000000;",
    extractSourceBetween(appSource, "const BOSS_MODE_HP_MULTIPLIERS", "const BOSS_COMBO_STORAGE_KEY"),
    extractFunctionSource(appSource, "normalizeBossComboMode"),
    extractFunctionSource(appSource, "isSoloBossMode"),
    extractFunctionSource(appSource, "getBossModeHpMultiplier"),
    extractFunctionSource(appSource, "resolveBossModeHp"),
    extractFunctionSource(appSource, "getBossRunQueueSoloWarningCandidate"),
    "this.getBossRunQueueSoloWarningCandidate = getBossRunQueueSoloWarningCandidate;",
  ].join("\n"),
  soloQueueWarningContext,
);

const soloQueueWarningPreferenceContext = {};
vm.runInNewContext(
  [
    "const SOLO_BOSS_QUEUE_WARNING_STORAGE_KEY = 'pbot.boss.solo.queue.warning.v1';",
    "const storage = new Map();",
    "const localStorage = { getItem: (key) => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(key, value) };",
    "function getAccountStorageKey(key) { return `pbot.account.8369207862.${key}`; }",
    "function readAccountStorage(key) { return localStorage.getItem(getAccountStorageKey(key)); }",
    "function writeAccountStorage(key, value) { localStorage.setItem(getAccountStorageKey(key), value); }",
    "function getMoscowDateKey() { return '2026-07-11'; }",
    extractFunctionSource(appSource, "isBossRunQueueSoloWarningSuppressedToday"),
    extractFunctionSource(appSource, "suppressBossRunQueueSoloWarningForToday"),
    "this.storage = storage;",
    "this.isBossRunQueueSoloWarningSuppressedToday = isBossRunQueueSoloWarningSuppressedToday;",
    "this.suppressBossRunQueueSoloWarningForToday = suppressBossRunQueueSoloWarningForToday;",
  ].join("\n"),
  soloQueueWarningPreferenceContext,
);

const comboPromptContext = {};
vm.runInNewContext(
  [
    "function normalizeBossComboMode(mode) { return mode ? String(mode).toLowerCase() : ''; }",
    "function resolveBossComboModes(candidate) { return Array.isArray(candidate && candidate.comboModes) ? candidate.comboModes : []; }",
    "const templateKeys = new Set();",
    "function hasBossComboTemplate(bossId, mode) { return templateKeys.has(`${Number(bossId)}:${normalizeBossComboMode(mode)}`); }",
    extractFunctionSource(appSource, "shouldOfferBossComboSetup"),
    extractFunctionSource(appSource, "getBossComboSetupPromptTargets"),
    "this.templateKeys = templateKeys;",
    "this.shouldOfferBossComboSetup = shouldOfferBossComboSetup;",
    "this.getBossComboSetupPromptTargets = getBossComboSetupPromptTargets;",
  ].join("\n"),
  comboPromptContext,
);

const bossExcludeTemplateContext = {};
vm.runInNewContext(
  [
    "const BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID = 'default-exclusions';",
    "const BOSS_RUN_QUEUE_DEFAULT_EXCLUDED_IDS = Object.freeze([17, 32, 33, 34, 35, 36, 18, 24, 22, 28, 16, 31, 30, 25, 29]);",
    "const BOSS_EXCLUDE_BUILT_IN_TEMPLATES = Object.freeze([",
    "  Object.freeze({ id: 'daily-exclusions', name: 'Ежедневное', excludedIds: Object.freeze([5, 6, 7, 12, 13, 14, 15, 16, 18, 21, 22, 23, 24, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 43, 45]), modeByBossId: Object.freeze({ 1: 'odin', 2: 'odin', 39: 'avtoritetny' }) }),",
    "  Object.freeze({ id: 'daily-combo-exclusions', name: 'Ежедневное + Комбо', excludedIds: Object.freeze([6, 7, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 40, 43, 45]), modeByBossId: Object.freeze({ 1: 'odin', 2: 'odin', 17: 'blotnoy', 39: 'avtoritetny' }) }),",
    "]);",
    "function normalizeBossComboMode(mode) { return mode ? String(mode).toLowerCase() : ''; }",
    extractFunctionSource(appSource, "normalizeBossIdList"),
    extractFunctionSource(appSource, "normalizeBossRunQueueModeOverrides"),
    extractFunctionSource(appSource, "createDefaultBossExcludeTemplate"),
    extractFunctionSource(appSource, "createBuiltInBossExcludeTemplates"),
    extractFunctionSource(appSource, "normalizeBossQueueRules"),
    extractFunctionSource(appSource, "normalizeBossExcludeTemplate"),
    extractFunctionSource(appSource, "normalizeBossExcludeDeletedBuiltInIds"),
    extractFunctionSource(appSource, "normalizeBossExcludeTemplates"),
    "this.normalizeBossExcludeTemplates = normalizeBossExcludeTemplates;",
  ].join("\n"),
  bossExcludeTemplateContext,
);

const buildPlanContext = {};
vm.runInNewContext(
  [
    "const DEFAULT_BOSS_MODE = 'pacansky';",
    "const AUTO_BOSS_QUEUE_MODE = 'auto';",
    "const SOLO_BOSS_MODE = 'odin';",
    "const BOSS_COMBO_MODE_ORDER = ['pacansky', 'blotnoy', 'avtoritetny', 'vorovskoy'];",
    "const SMART_BOSS_QUEUE_COLLECTION_HP_LIMIT = 3000000000;",
    "const defaultExcludedBossIds = new Set();",
    "function getBossRunQueueExcludedIds() { return new Set(defaultExcludedBossIds); }",
    "function getBossAutoQueueCandidates() { return []; }",
    "function isBossSmartQueueCollectionEnabled() { return false; }",
    "const state = { bossDashboard: null };",
    "function normalizeBossComboMode(mode) { return mode ? String(mode).toLowerCase() : ''; }",
    "function isSoloBossMode(mode) { return normalizeBossComboMode(mode) === SOLO_BOSS_MODE; }",
    "function normalizeBossRunQueueHitTypes(value) { return Array.isArray(value) ? value : value ? [value] : []; }",
    "function resolveBossComboModes(candidate) { return Array.isArray(candidate.comboModes) ? candidate.comboModes : []; }",
    "const templateKeys = new Set();",
    "function hasBossComboTemplate(bossId, mode) { return templateKeys.has(`${Number(bossId)}:${normalizeBossComboMode(mode)}`); }",
    extractFunctionSource(appSource, "getPreferredBossComboTemplateMode"),
    extractFunctionSource(appSource, "getCandidateQueueModeBundle"),
    "function resolveBossModeHp(baseHp, mode) { const multiplier = { pacansky: 1, blotnoy: 3, avtoritetny: 6, vorovskoy: 12 }[normalizeBossComboMode(mode)] || 1; return (Number(baseHp) || 1) * multiplier; }",
    "function compareBossCatalogItems(left, right) { return Number(left.id || 0) - Number(right.id || 0); }",
    "function shouldTreatBossAsAlwaysAutoBuy() { return false; }",
    "function withBossRunQueueHitTypes(entry) { return entry; }",
    "function ensureBossRunQueueItemId(entry) { return entry; }",
    "function getBossRewardBoss(bossId, rewards) { return (rewards && Array.isArray(rewards.bosses) ? rewards.bosses : []).find((boss) => Number(boss.id) === Number(bossId)) || null; }",
    extractFunctionSource(appSource, "getBossCandidateRemainingToday"),
    extractFunctionSource(appSource, "isBossCandidateDailyLimitReached"),
    extractFunctionSource(appSource, "getBossSmartQueueMissingBattleModes"),
    extractFunctionSource(appSource, "buildBossKeyBudgetMap"),
    extractFunctionSource(appSource, "buildBossRewardTargetsBySource"),
    extractFunctionSource(appSource, "getBossAttackKeyBudgetId"),
    extractFunctionSource(appSource, "creditBossRewardKeysToBudget"),
    extractFunctionSource(appSource, "getBossCandidateBaseRewardKeys"),
    extractFunctionSource(appSource, "getBossCandidateBonusKeyDamageTiers"),
    extractFunctionSource(appSource, "getBossQueueProjectedPersonalDamage"),
    extractFunctionSource(appSource, "getBossQueueProjectedRewardKeys"),
    extractFunctionSource(appSource, "getActiveZarubaBossTasks"),
    extractFunctionSource(appSource, "getBossQueueEntrySavedComboMode"),
    extractFunctionSource(appSource, "decorateBossRunQueueEntryWithZarubaTask"),
    extractFunctionSource(appSource, "canPlanBossCandidateWithKeys"),
    extractFunctionSource(appSource, "createBossQueueEntryForCandidate"),
    extractFunctionSource(appSource, "buildZarubaBossQueuePlan"),
    extractFunctionSource(appSource, "resolveBossAutoQueueRule"),
    extractSourceBetween(appSource, "function buildBossAutoQueuePlan", "function renderBossComboModeMarks"),
    "this.templateKeys = templateKeys;",
    "this.defaultExcludedBossIds = defaultExcludedBossIds;",
    "this.getCandidateQueueModeBundle = getCandidateQueueModeBundle;",
    "this.getBossQueueProjectedRewardKeys = getBossQueueProjectedRewardKeys;",
    "this.buildZarubaBossQueuePlan = buildZarubaBossQueuePlan;",
    "this.buildBossAutoQueuePlan = buildBossAutoQueuePlan;",
    "this.buildBossRunQueueKeyProjection = buildBossRunQueueKeyProjection;",
  ].join("\n"),
  buildPlanContext,
);

const queueEntryContext = {};
vm.runInNewContext(
  [
    "const BOSS_COMBO_ACTION_KEYS = new Set(['punchChest', 'kickBalls', 'pokeEyes', 'kneeEar', 'poison', 'gunshot', 'knife']);",
    "function resolveBossComboTemplateForBossAndMode(options) {",
    "  if (Number(options.bossId) === 2 && options.comboMode === 'pacansky') return { sequence: ['punchChest', 'poison'], finishWithNeedle: true };",
    "  return null;",
    "}",
    extractFunctionSource(appSource, "normalizeBossRunQueueHitTypes"),
    extractFunctionSource(appSource, "resolveBossRunQueueHitTypes"),
    extractFunctionSource(appSource, "resolveBossRunQueueFinishWithNeedle"),
    extractFunctionSource(appSource, "withBossRunQueueHitTypes"),
    extractFunctionSource(appSource, "normalizeBossRunQueueEntry"),
    "this.withBossRunQueueHitTypes = withBossRunQueueHitTypes;",
    "this.normalizeBossRunQueueEntry = normalizeBossRunQueueEntry;",
  ].join("\n"),
  queueEntryContext,
);

const queueItemIdContext = {
  crypto: {
    randomUUID: () => "fixed-queue-id",
  },
};
vm.runInNewContext(
  [
    "let bossRunQueueItemSequence = 0;",
    extractFunctionSource(appSource, "ensureBossRunQueueItemId"),
    "this.ensureBossRunQueueItemId = ensureBossRunQueueItemId;",
  ].join("\n"),
  queueItemIdContext,
);

const zarubaSavedComboContext = {
  state: {
    bossRunQueue: [{
      bossId: 5,
      mode: null,
      comboMode: "",
      origin: "zaruba",
      zarubaObjective: "damage",
      hitTypes: ["knife"],
    }],
  },
  syncCalls: [],
  getBossQueueCandidateMap() {
    return new Map([[5, { id: 5, comboModes: ["pacansky"] }]]);
  },
  getPreferredBossComboTemplateMode() {
    return "pacansky";
  },
  withBossRunQueueHitTypes(entry) {
    return { ...entry, hitTypes: ["punchChest", "kickBalls"] };
  },
  markBossRunQueueEdited() {},
  persistBossRunQueue() {},
  setTimeout(callback) {
    callback();
  },
  syncBossAutomationAfterQueueEdit: async (label, payload) => {
    zarubaSavedComboContext.syncCalls.push({ label, payload });
  },
};
vm.runInNewContext(
  [
    extractFunctionSource(appSource, "applySavedZarubaCombosToBossRunQueue"),
    "this.applySavedZarubaCombosToBossRunQueue = applySavedZarubaCombosToBossRunQueue;",
  ].join("\n"),
  zarubaSavedComboContext,
);

const comboTemplateContext = {};
vm.runInNewContext(
  [
    "const templates = new Map([[\"2:pacansky\", { bossId: 2, comboMode: \"pacansky\", sequence: [\"punchChest\"] }]]);",
    "function normalizeBossComboMode(mode) { return mode ? String(mode).toLowerCase() : ''; }",
    "function getBossComboTemplate(bossId, comboMode) { return templates.get(`${Number(bossId)}:${normalizeBossComboMode(comboMode)}`) || null; }",
    extractFunctionSource(appSource, "resolveBossComboTemplateForBossAndMode"),
    "this.resolveBossComboTemplateForBossAndMode = resolveBossComboTemplateForBossAndMode;",
  ].join("\n"),
  comboTemplateContext,
);

const queueSyncContext = {};
vm.runInNewContext(
  [
    "const state = {",
    "  bossRunQueuePendingSaves: 0,",
    "  bossRunQueueLastLocalEditAt: 0,",
    "  bossRunQueueLastServerUpdatedAt: 0,",
    "};",
    extractFunctionSource(appSource, "getTimestampMs"),
    extractFunctionSource(appSource, "getBossAutomationUpdatedAtMs"),
    extractFunctionSource(appSource, "shouldApplyBossAutomationQueue"),
    "this.state = state;",
    "this.shouldApplyBossAutomationQueue = shouldApplyBossAutomationQueue;",
  ].join("\n"),
  queueSyncContext,
);

const queueMutationRetryContext = {};
vm.runInNewContext(
  [
    "const attempts = [];",
    "const logs = [];",
    "const diagnostics = [];",
    "async function syncBossAutomationState(overrides, options) {",
    "  attempts.push({ overrides, options });",
    "  if (attempts.length === 1) throw new Error('request timeout');",
    "  return { queueRevision: 8 };",
    "}",
    "async function delay() {}",
    "function appendLog(label, message) { logs.push({ label, message }); }",
    "function appendDiagnosticError(source, error) { diagnostics.push({ source, error }); }",
    extractFunctionSource(appSource, "syncBossAutomationAfterQueueEdit"),
    "this.attempts = attempts;",
    "this.logs = logs;",
    "this.diagnostics = diagnostics;",
    "this.syncBossAutomationAfterQueueEdit = syncBossAutomationAfterQueueEdit;",
  ].join("\n"),
  queueMutationRetryContext,
);

const automationRefreshContext = {};
vm.runInNewContext(
  [
    "const calls = [];",
    "const automationPayload = { enabled: true, intervalSec: 10, autoStartNext: true, queue: [{ bossId: 2 }] };",
    "async function apiRequest(method, url) { calls.push({ type: 'api', method, url }); return automationPayload; }",
    "function applyBossAutomationState(payload, options) { calls.push({ type: 'apply', payload, options }); }",
    "async function handleBossDashboard(options) { calls.push({ type: 'dashboard', options }); return { ok: true }; }",
    "async function handleBossStateRefresh(options) { calls.push({ type: 'state-refresh', options }); return { ok: true }; }",
    extractFunctionSource(appSource, "refreshBossAutomationOnly"),
    "this.calls = calls;",
    "this.refreshBossAutomationOnly = refreshBossAutomationOnly;",
  ].join("\n"),
  automationRefreshContext,
);

const backgroundFightRefreshContext = {};
vm.runInNewContext(
  [
    "const calls = [];",
    "const state = { bossAuto: { running: false, serverRunning: false }, bossRunQueue: [] };",
    "function hasBossActiveSession() { return true; }",
    "function isBossTabActive() { return false; }",
    "async function refreshBossAutomationOnly() { calls.push({ type: 'automation-refresh' }); }",
    "async function handleBossStateRefresh(options) { calls.push({ type: 'state-refresh', options }); }",
    "async function handleBossDashboard(options) { calls.push({ type: 'dashboard', options }); }",
    "function updateBossAutoStatus() { calls.push({ type: 'status' }); }",
    extractFunctionSource(appSource, "bossAutoTick"),
    "this.calls = calls;",
    "this.bossAutoTick = bossAutoTick;",
  ].join("\n"),
  backgroundFightRefreshContext,
);

const claimRewardContext = {
  formatNumber: (value) => String(value),
};
vm.runInNewContext(
  [
    "const BOSS_WEAPON_LABELS = { poison: 'Яд', gunshot: 'Самопал', knife: 'Финка' };",
    "const CURRENCY_LABELS = { sugar: 'Сахар', rubles: 'Рубли' };",
    extractFunctionSource(appSource, "getBossComboResourceLabel"),
    extractSourceBetween(
      appSource,
      "const BOSS_CLAIM_REWARD_CONTAINER_KEYS",
      "function formatBossClaimRewardItem",
    ),
    extractFunctionSource(appSource, "formatBossClaimRewardItem"),
    extractFunctionSource(appSource, "formatBossClaimRewardSummary"),
    extractFunctionSource(appSource, "formatBossComboRewardSummary"),
    "this.formatBossClaimRewardSummary = formatBossClaimRewardSummary;",
    "this.formatBossComboRewardSummary = formatBossComboRewardSummary;",
  ].join("\n"),
  claimRewardContext,
);

test("built-in boss exclusion presets provide daily and daily-combo templates", () => {
  const templates = bossExcludeTemplateContext.normalizeBossExcludeTemplates({
    templates: [
      {
        id: "legacy-daily-combo",
        name: "Ежедневное + Комбо",
        excludedIds: [999],
        modeByBossId: { 999: "pacansky" },
      },
      {
        id: "custom-exclusions",
        name: "Custom exclusions",
        excludedIds: [8],
      },
    ],
  });

  assert.equal(templates["default-exclusions"].locked, false);
  assert.equal(templates["daily-exclusions"].locked, false);
  assert.equal(templates["daily-exclusions"].excludedIds.length, 28);
  assert.equal(templates["daily-exclusions"].modeByBossId["39"], "avtoritetny");
  assert.equal(templates["daily-combo-exclusions"].locked, false);
  assert.equal(templates["daily-combo-exclusions"].excludedIds.length, 23);
  assert.equal(templates["daily-combo-exclusions"].modeByBossId["17"], "blotnoy");
  assert.equal(Object.keys(templates["daily-combo-exclusions"].modeByBossId).length, 4);
  assert.equal(templates["legacy-daily-combo"], undefined);
  assert.deepEqual([...templates["custom-exclusions"].excludedIds], [8]);
});

test("saved changes override the selected built-in boss preset without creating a custom preset", () => {
  const templates = bossExcludeTemplateContext.normalizeBossExcludeTemplates({
    templates: [
      {
        id: "daily-exclusions",
        name: "Ежедневное",
        locked: true,
        builtIn: true,
        overridden: true,
        selectedIds: [1, 2, 39],
        modeByBossId: { 39: "vorovskoy" },
      },
    ],
  });

  assert.equal(templates["daily-exclusions"].overridden, true);
  assert.equal(templates["daily-exclusions"].locked, false);
  assert.deepEqual([...templates["daily-exclusions"].selectedIds], [1, 2, 39]);
  assert.equal(templates["daily-exclusions"].modeByBossId["39"], "vorovskoy");
  assert.equal(templates["custom-exclusions"], undefined);
});

test("deleted built-in boss presets stay deleted after templates reload", () => {
  const templates = bossExcludeTemplateContext.normalizeBossExcludeTemplates({
    deletedBuiltInIds: ["default-exclusions", "daily-exclusions"],
    templates: [
      {
        id: "daily-exclusions",
        name: "Ежедневное",
        locked: true,
        builtIn: true,
        overridden: true,
        selectedIds: [1, 2, 39],
      },
    ],
  });

  assert.equal(templates["daily-exclusions"], undefined);
  assert.equal(templates["daily-combo-exclusions"].builtIn, true);
  assert.equal(templates["default-exclusions"], undefined);
});

test("deleting the built-in all-bosses preset selects the next deletable preset", () => {
  const selected = {
    id: "default-exclusions",
    name: "Все боссы",
    locked: false,
    builtIn: true,
  };
  const previouslyDeletedTemplateId = "daily-exclusions";
  const nextTemplate = {
    id: "daily-combo-exclusions",
    name: "Ежедневное + Комбо",
    locked: false,
    builtIn: true,
  };
  let appliedTemplate = null;
  const context = {
    BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID: selected.id,
    BOSS_EXCLUDE_BUILT_IN_TEMPLATES: [
      { id: previouslyDeletedTemplateId },
      { id: nextTemplate.id },
    ],
    state: {
      bossExcludeTemplateId: selected.id,
      bossExcludeTemplates: {
        [selected.id]: selected,
        [nextTemplate.id]: nextTemplate,
      },
      bossExcludeDeletedBuiltInIds: new Set([previouslyDeletedTemplateId]),
    },
    getBossExcludeTemplateById: (templateId) => context.state.bossExcludeTemplates[templateId] || null,
    getBossExcludeTemplateList: () => Object.values(context.state.bossExcludeTemplates),
    persistBossExcludeTemplates: () => {},
    persistBossQueueSettings: () => {},
    populateBossExcludeTemplateSelect: () => {},
    applyBossExcludeTemplate: (template) => {
      appliedTemplate = template;
      context.state.bossExcludeTemplateId = template.id;
    },
    appendLog: () => {},
    setBossExcludeTemplateNote: () => {},
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "normalizeBossExcludeDeletedBuiltInIds"),
      extractFunctionSource(appSource, "canDeleteBossExcludeTemplate"),
      extractFunctionSource(appSource, "handleBossExcludeTemplateDelete"),
      "this.handleBossExcludeTemplateDelete = handleBossExcludeTemplateDelete;",
    ].join("\n"),
    context,
  );

  context.handleBossExcludeTemplateDelete();

  assert.equal(context.state.bossExcludeTemplates[selected.id], undefined);
  assert.equal(context.state.bossExcludeDeletedBuiltInIds.has(selected.id), true);
  assert.equal(context.state.bossExcludeDeletedBuiltInIds.has(previouslyDeletedTemplateId), true);
  assert.equal(context.state.bossExcludeTemplates[nextTemplate.id], nextTemplate);
  assert.equal(context.state.bossExcludeTemplateId, nextTemplate.id);
  assert.equal(appliedTemplate, nextTemplate);
});

test("every saved boss preset can be deleted", () => {
  const context = {
    BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID: "default-exclusions",
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "canDeleteBossExcludeTemplate"),
      "this.canDeleteBossExcludeTemplate = canDeleteBossExcludeTemplate;",
    ].join("\n"),
    context,
  );

  assert.equal(context.canDeleteBossExcludeTemplate({ id: "daily-exclusions", builtIn: true }), true);
  assert.equal(context.canDeleteBossExcludeTemplate({ id: "custom-exclusions", builtIn: false }), true);
  assert.equal(context.canDeleteBossExcludeTemplate({ id: "default-exclusions", builtIn: true }), true);
  assert.equal(context.canDeleteBossExcludeTemplate(null), false);
});

test("boss preset save keeps the selected preset identity", () => {
  const selected = {
    id: "daily-exclusions",
    name: "Ежедневное",
    locked: true,
    builtIn: true,
    overridden: false,
  };
  const context = {
    state: {
      bossExcludeTemplateId: selected.id,
      bossExcludeTemplates: { [selected.id]: selected },
    },
    getBossExcludeTemplateById: () => selected,
    $: () => ({ value: "" }),
    buildBossExcludeTemplateId: () => "unexpected-custom-template",
    buildBossExcludeTemplateDraft: (draft) => ({ ...draft, selectedIds: [1, 2, 39] }),
    persistBossExcludeTemplates: () => {},
    persistBossQueueSettings: () => {},
    populateBossExcludeTemplateSelect: () => {},
    setBossExcludeTemplateNote: () => {},
    appendLog: () => {},
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "handleBossExcludeTemplateSave"),
      "this.handleBossExcludeTemplateSave = handleBossExcludeTemplateSave;",
    ].join("\n"),
    context,
  );

  context.handleBossExcludeTemplateSave();

  assert.equal(context.state.bossExcludeTemplateId, selected.id);
  assert.equal(context.state.bossExcludeTemplates[selected.id].name, selected.name);
  assert.equal(context.state.bossExcludeTemplates[selected.id].locked, false);
  assert.equal(context.state.bossExcludeTemplates[selected.id].overridden, true);
  assert.equal(context.state.bossExcludeTemplates["unexpected-custom-template"], undefined);
});

test("saving a preset as new creates a clearly named copy", () => {
  const selected = { id: "default-exclusions", name: "Все боссы", builtIn: true };
  const context = {
    state: {
      bossExcludeTemplateId: selected.id,
      bossExcludeTemplates: { [selected.id]: selected },
    },
    getBossExcludeTemplateById: () => selected,
    $: () => ({ value: selected.name }),
    buildBossExcludeTemplateId: () => "new-template",
    buildBossExcludeTemplateDraft: (draft) => ({ ...draft, selectedIds: [1, 2, 3] }),
    persistBossExcludeTemplates: () => {},
    persistBossQueueSettings: () => {},
    populateBossExcludeTemplateSelect: () => {},
    setBossExcludeTemplateNote: () => {},
    appendLog: () => {},
    formatNumber: (value) => String(value),
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "handleBossExcludeTemplateCreate"),
      "this.handleBossExcludeTemplateCreate = handleBossExcludeTemplateCreate;",
    ].join("\n"),
    context,
  );

  context.handleBossExcludeTemplateCreate();

  assert.equal(context.state.bossExcludeTemplateId, "new-template");
  assert.equal(context.state.bossExcludeTemplates["new-template"].name, "Все боссы — копия");
});

test("both boss UIs separate saved sets from clearly named quick-selection actions", () => {
  const htmlSources = [
    fs.readFileSync(path.resolve(__dirname, "../../ui/index.html"), "utf8"),
  ];
  const standaloneHtmlPath = path.join(standaloneRoot, "ui", "index.html");
  if (fs.existsSync(standaloneHtmlPath)) {
    htmlSources.push(fs.readFileSync(standaloneHtmlPath, "utf8"));
  }

  for (const htmlSource of htmlSources) {
    assert.match(htmlSource, /Сохранённые наборы/);
    assert.match(htmlSource, /Сохранить изменения/);
    assert.match(htmlSource, /Сохранить как новый/);
    assert.match(htmlSource, /Удалить набор/);
    assert.match(htmlSource, /Быстрый выбор/);
    assert.match(htmlSource, /Выбрать всех/);
    assert.match(htmlSource, /Только доступных/);
    assert.match(htmlSource, /Снять выбор/);
    assert.doesNotMatch(htmlSource, /Сохранить по умолчанию|>По умолчанию<|Доступные сейчас/);
  }
});

test("UI boss collection tooltip summarizes missing rewards by type", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "getBossRewardMissingItems"),
      extractFunctionSource(appSource, "formatBossMissingRewardTypeCounts"),
      extractFunctionSource(appSource, "buildBossCollectionTooltip"),
      "this.buildBossCollectionTooltip = buildBossCollectionTooltip;",
    ].join("\n"),
    context,
  );

  const tooltip = context.buildBossCollectionTooltip({
    collected: 1,
    total: 5,
    missing: [
      { type: "tattoo" },
      { type: "tattoo" },
      { type: "clothing" },
      { type: "camera" },
    ],
  }, "Комбо: Авторитетный");

  assert.equal(
    tooltip,
    "Комбо: Авторитетный: собрано 1/5\n\u041d\u0435 \u0441\u043e\u0431\u0440\u0430\u043d\u043e: \u041d\u0430\u043a\u043e\u043b\u043a\u0438: 2 \u00b7 \u0412\u0435\u0449\u0438: 1 \u00b7 \u041a\u0430\u043c\u0435\u0440\u044b: 1",
  );
});

test("UI groups boss rewards by named set and totals full weapon bonuses once", () => {
  const context = {
    BOSS_WEAPON_LABELS: {
      poison: "Яд",
      gunshot: "Самопал",
      knife: "Финка",
    },
    BOSS_REWARD_BONUS_DEFINITIONS: [
      { key: "poison", sourceKeys: ["poison"], label: "Яд", iconUrl: "/poison.webp" },
      { key: "gunshot", sourceKeys: ["gunshot"], label: "Самопал", iconUrl: "/gunshot.webp" },
      { key: "knife", sourceKeys: ["knife"], label: "Финка", iconUrl: "/knife.webp" },
      { key: "energy", sourceKeys: ["maxEnergy", "maxenergy"], label: "Энергия", iconUrl: "/energy.png" },
    ],
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "addBossRewardWeaponBonuses"),
      extractFunctionSource(appSource, "getBossRewardSetName"),
      extractFunctionSource(appSource, "buildBossRewardSetGroups"),
      extractFunctionSource(appSource, "getBossRewardWeaponTotals"),
      "this.buildBossRewardSetGroups = buildBossRewardSetGroups;",
      "this.getBossRewardWeaponTotals = getBossRewardWeaponTotals;",
    ].join("\n"),
    context,
  );

  const setItems = [
    {
      type: "tattoo",
      id: 4180,
      setName: "Комплект \"Здоровенный Язь\"",
      combatStatsBonus: { gunshot: 11, maxEnergy: 1 },
      owned: true,
    },
    {
      type: "tattoo",
      id: 4181,
      setName: "Комплект \"Здоровенный Язь\"",
      combatStatsBonus: { gunshot: 10, maxenergy: 2 },
      owned: false,
    },
    {
      type: "clothing",
      id: 59,
      setName: "Комплект \"Совет\"",
      combatStatsBonus: { poison: 15 },
      owned: false,
    },
  ];
  const groups = JSON.parse(JSON.stringify(context.buildBossRewardSetGroups(setItems)));
  const totals = JSON.parse(JSON.stringify(context.getBossRewardWeaponTotals([
    { items: setItems },
    { items: [setItems[0]] },
  ])));

  assert.deepEqual(groups.map((group) => ({
    name: group.name,
    collected: group.collected,
    total: group.total,
    weaponBonuses: group.weaponBonuses,
  })), [
    {
      name: "Здоровенный Язь",
      collected: 1,
      total: 2,
      weaponBonuses: { gunshot: 21, energy: 3 },
    },
    {
      name: "Совет",
      collected: 0,
      total: 1,
      weaponBonuses: { poison: 15 },
    },
  ]);
  assert.deepEqual(totals, { gunshot: 21, energy: 3, poison: 15 });
});

test("UI renders energy bonuses with the game energy icon", () => {
  const context = {
    BOSS_REWARD_BONUS_DEFINITIONS: [
      { key: "energy", sourceKeys: ["maxEnergy", "maxenergy"], label: "Энергия", iconUrl: "/Energy.png" },
    ],
    formatNumber: (value) => String(value),
    escapeHtml: (value) => String(value),
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "formatBossRewardWeaponBonuses"),
      extractFunctionSource(appSource, "renderBossRewardWeaponBonusChips"),
      "this.formatBossRewardWeaponBonuses = formatBossRewardWeaponBonuses;",
      "this.renderBossRewardWeaponBonusChips = renderBossRewardWeaponBonusChips;",
    ].join("\n"),
    context,
  );

  assert.equal(context.formatBossRewardWeaponBonuses({ energy: 3 }), "Энергия +3");
  assert.match(context.renderBossRewardWeaponBonusChips({ energy: 3 }), /src="\/Energy\.png"/);
  assert.match(context.renderBossRewardWeaponBonusChips({ energy: 3 }), /aria-label="Энергия \+3"/);
});

test("UI keeps expanded boss collection rows open across dashboard rerenders", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "getOpenBossCatalogRewardIds"),
      "this.getOpenBossCatalogRewardIds = getOpenBossCatalogRewardIds;",
    ].join("\n"),
    context,
  );

  const selectors = [];
  const expandedIds = context.getOpenBossCatalogRewardIds({
    querySelectorAll(selector) {
      selectors.push(selector);
      return [
        { dataset: { bossId: "2" } },
        { dataset: { bossId: "31" } },
      ];
    },
  });

  assert.deepEqual(selectors, [".boss-catalog-reward-details[open][data-boss-id]"]);
  assert.deepEqual([...expandedIds], ["2", "31"]);
});

test("UI collection summary omits the redundant negative missing count", () => {
  const context = {
    getBossRewardModes: () => [{
      total: 34,
      collected: 1,
      items: [],
      kind: "battle",
      key: "pacansky",
    }],
    getBossRewardWeaponTotals: () => ({ gunshot: 10 }),
    formatBossRewardWeaponBonuses: () => "Самопал +10",
    renderBossRewardWeaponBonusChips: () => "<bonus></bonus>",
    getBossRewardMissingItems: () => Array.from({ length: 33 }, () => ({})),
    getBossCollectionModeLabel: () => "Бой: Пацанский",
    buildBossRewardSetGroups: () => [],
    buildBossCollectionTooltip: () => "",
    escapeHtml: (value) => String(value),
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "renderBossCatalogCollectionCell"),
      "this.renderBossCatalogCollectionCell = renderBossCatalogCollectionCell;",
    ].join("\n"),
    context,
  );

  const html = context.renderBossCatalogCollectionCell({ id: 2 }, { expanded: true });

  assert.match(html, /<strong>1\/34<\/strong>/);
  assert.doesNotMatch(html, /−33/);
  assert.match(html, /data-boss-id="2" open/);
});

test("UI formats actual claimed combo rewards from the claim response", () => {
  const summary = claimRewardContext.formatBossClaimRewardSummary({
    ok: true,
    response: {
      data: {
        rewards: {
          reward: [{ type: "tattoo", tattooId: 3637 }],
          globalReward: {
            authority: 10000,
            keys: 1,
            currencies: [{ type: "sugar", amount: 10000 }],
          },
          stashGearReward: [{ id: 32, name: "Match", qty: 2 }],
        },
      },
    },
  });

  assert.equal(
    summary,
    "предметы: tattoo #3637 | нычка: Match x2 | авторитет +10000 | ключи +1 | Сахар +10000",
  );
});

test("UI formats a reward nested in a rapid-hit claim result", () => {
  const summary = claimRewardContext.formatBossClaimRewardSummary({
    haltedReason: "completed",
    claim: {
      ok: true,
      response: {
        data: {
          success: true,
          rewards: {
            bossId: 9,
            globalReward: {
              authority: 25,
              currencies: [{ type: "sugar", amount: 25 }],
            },
          },
        },
      },
    },
  });

  assert.equal(summary, "авторитет +25 | Сахар +25");
});

test("UI formats the separate combo hit reward", () => {
  const summary = claimRewardContext.formatBossComboRewardSummary({
    items: [{ type: "tattoo", id: 3637, amount: null }],
    stashGear: [{ id: 32, name: "Match", amount: 2 }],
    stashCount: 90,
    currencies: [{ type: "sugar", amount: 250 }],
    weapons: [{ type: "poison", amount: 2 }],
    authority: 10,
    keys: 1,
  });

  assert.equal(
    summary,
    "комбо: предметы: tattoo #3637 | нычка: Match x2 | нычки +90 | авторитет +10 | ключи +1 | Сахар +250 | оружие: poison x2",
  );
});

test("UI boss queue planner treats zero remainingToday as a hard daily block", () => {
  const candidate = {
    id: 2,
    canStart: true,
    hasEnoughKeys: true,
    remainingToday: 0,
  };

  assert.equal(queuePlanHelpersContext.getBossCandidateRemainingToday(candidate), 0);
  assert.equal(queuePlanHelpersContext.isBossCandidateDailyLimitReached(candidate), true);
});

test("UI boss queue planner falls back to dailyLimit/usedToday when remainingToday is absent", () => {
  const candidate = {
    id: 2,
    canStart: true,
    hasEnoughKeys: true,
    dailyLimit: 7,
    usedToday: 7,
  };

  assert.equal(queuePlanHelpersContext.getBossCandidateRemainingToday(candidate), 0);
  assert.equal(queuePlanHelpersContext.isBossCandidateDailyLimitReached(candidate), true);
});

test("UI auto queue plan explicitly filters daily-limit candidates before enqueueing", () => {
  const buildPlanSource = extractSourceBetween(
    appSource,
    "function buildBossAutoQueuePlan",
    "function renderBossComboModeMarks",
  );
  const guardMatches = buildPlanSource.match(/isBossCandidateDailyLimitReached\(candidate\)/g) || [];

  assert.ok(
    buildPlanSource.includes("getBossCandidateRemainingToday(candidate)"),
    "buildBossAutoQueuePlan must derive remaining daily attempts through the robust helper",
  );
  assert.ok(
    guardMatches.length >= 2,
    "buildBossAutoQueuePlan must guard both attackable selection and shortage accounting",
  );
});

test("UI queue entry embeds stored combo hit types for backend automation", () => {
  const entry = queueEntryContext.withBossRunQueueHitTypes({
    bossId: 2,
    mode: "pacansky",
    comboMode: "pacansky",
  });

  assert.equal(JSON.stringify(entry.hitTypes), JSON.stringify(["punchChest", "poison"]));
  assert.equal(entry.finishWithNeedle, true);
});

test("UI combo template lookup does not fall back to battle mode", () => {
  assert.equal(
    comboTemplateContext.resolveBossComboTemplateForBossAndMode({
      bossId: 2,
      mode: "pacansky",
      comboMode: "",
    }),
    null,
  );

  assert.equal(
    comboTemplateContext.resolveBossComboTemplateForBossAndMode({
      bossId: 2,
      mode: "avtoritetny",
      comboMode: "pacansky",
    }).comboMode,
    "pacansky",
  );
});

test("UI queue entry normalization keeps explicit hit types and drops unknown values", () => {
  const entry = queueEntryContext.normalizeBossRunQueueEntry({
    bossId: 3,
    mode: "pacansky",
    hitTypes: ["kickBalls", "bad-value", "knife"],
    autoKillSolo: false,
  });

  assert.equal(JSON.stringify(entry.hitTypes), JSON.stringify(["kickBalls", "knife"]));
  assert.equal(entry.autoKillSolo, false);
});

test("UI queue entry keeps Zaruba metadata and an explicit solo mode", () => {
  const entry = queueEntryContext.normalizeBossRunQueueEntry({
    bossId: 5,
    mode: "odin",
    origin: "zaruba",
    zarubaObjective: "damage",
    taskLabel: "Нанеси урон Шайбе",
    taskRequiredAmount: 1800,
    hitTypes: ["knife"],
  });

  assert.equal(entry.mode, "odin");
  assert.equal(entry.zarubaObjective, "damage");
  assert.equal(entry.taskLabel, "Нанеси урон Шайбе");
  assert.equal(entry.taskRequiredAmount, 1800);
});

test("UI gives new queue entries a stable identity for safe request retries", () => {
  const entry = queueItemIdContext.ensureBossRunQueueItemId({ bossId: 5 });
  const sameEntry = queueItemIdContext.ensureBossRunQueueItemId(entry);

  assert.equal(entry.queueItemId, "ui-fixed-queue-id");
  assert.equal(sameEntry, entry);
});

test("UI applies a saved combo to Zaruba damage instead of the fallback knife", () => {
  const operations = zarubaSavedComboContext.applySavedZarubaCombosToBossRunQueue();

  assert.equal(operations.length, 1);
  assert.equal(zarubaSavedComboContext.state.bossRunQueue[0].comboMode, "pacansky");
  assert.equal(
    JSON.stringify(zarubaSavedComboContext.state.bossRunQueue[0].hitTypes),
    JSON.stringify(["punchChest", "kickBalls"]),
  );
});

test("UI automation queue sync ignores stale server snapshots during local edits", () => {
  const state = queueSyncContext.state;
  state.bossRunQueuePendingSaves = 1;
  state.bossRunQueueLastLocalEditAt = Date.parse("2026-07-07T12:00:10.000Z");
  state.bossRunQueueLastServerUpdatedAt = 0;

  assert.equal(
    queueSyncContext.shouldApplyBossAutomationQueue(
      { updatedAt: "2026-07-07T12:00:20.000Z", queue: [{ bossId: 2 }] },
      { syncQueue: true },
    ),
    false,
  );

  state.bossRunQueuePendingSaves = 0;
  assert.equal(
    queueSyncContext.shouldApplyBossAutomationQueue(
      { updatedAt: "2026-07-07T12:00:09.000Z", queue: [{ bossId: 2 }] },
      { syncQueue: true },
    ),
    false,
  );

  assert.equal(
    queueSyncContext.shouldApplyBossAutomationQueue(
      { updatedAt: "2026-07-07T12:00:11.000Z", queue: [] },
      { syncQueue: true },
    ),
    true,
  );
});

test("UI automation queue sync rejects snapshots older than the applied server state", () => {
  const state = queueSyncContext.state;
  state.bossRunQueuePendingSaves = 0;
  state.bossRunQueueLastLocalEditAt = 0;
  state.bossRunQueueLastServerUpdatedAt = Date.parse("2026-07-07T12:00:20.000Z");

  assert.equal(
    queueSyncContext.shouldApplyBossAutomationQueue(
      { updatedAt: "2026-07-07T12:00:19.000Z", queue: [{ bossId: 2 }] },
      { syncQueue: true },
    ),
    false,
  );
  assert.equal(
    queueSyncContext.shouldApplyBossAutomationQueue(
      { updatedAt: "2026-07-07T12:00:21.000Z", queue: [] },
      { syncQueue: true },
    ),
    true,
  );
});

test("UI retries a timed-out queue mutation with a bounded request timeout", async () => {
  queueMutationRetryContext.attempts.length = 0;
  queueMutationRetryContext.logs.length = 0;
  queueMutationRetryContext.diagnostics.length = 0;

  const result = await queueMutationRetryContext.syncBossAutomationAfterQueueEdit(
    "Boss queue add",
    { queueOperations: [{ type: "append", item: { bossId: 4, queueItemId: "ui-4" } }] },
  );

  assert.equal(queueMutationRetryContext.attempts.length, 2);
  assert.equal(queueMutationRetryContext.attempts[0].options.requestTimeoutMs, 8_000);
  assert.equal(result.queueRevision, 8);
  assert.equal(queueMutationRetryContext.logs.length, 0);
  assert.equal(queueMutationRetryContext.diagnostics.length, 0);
});

test("UI queue edits render optimistically and poll lightweight server state in near real time", () => {
  const addSource = extractFunctionSource(appSource, "handleBossRunQueueAdd");
  const syncSource = extractFunctionSource(appSource, "scheduleBossStartUiSync");
  const mutationSyncSource = extractFunctionSource(appSource, "syncBossAutomationAfterQueueEdit");
  const apiRequestSource = extractFunctionSource(appSource, "apiRequest");

  assert.doesNotMatch(addSource, /await handleZarubaDashboard/);
  assert.match(addSource, /state\.bossRunQueue\.push\(entry\)[\s\S]*renderBossRunQueue\(\)/);
  assert.match(syncSource, /Number\(options\.intervalMs\) \|\| 250/);
  assert.match(syncSource, /apiRequest\("GET", "\/api\/bosses\/automation"\)/);
  assert.match(syncSource, /syncQueue: true/);
  assert.match(mutationSyncSource, /maxAttempts/);
  assert.match(mutationSyncSource, /requestTimeoutMs/);
  assert.match(apiRequestSource, /AbortController/);
  assert.match(apiRequestSource, /controller\.abort\(\)/);
});

test("UI automation poll refreshes live boss state and key balances", async () => {
  automationRefreshContext.calls.length = 0;

  await automationRefreshContext.refreshBossAutomationOnly();

  assert.equal(
    JSON.stringify(automationRefreshContext.calls.map((call) => call.type)),
    JSON.stringify(["api", "apply", "dashboard", "state-refresh"]),
  );
  assert.equal(automationRefreshContext.calls[0].method, "GET");
  assert.equal(automationRefreshContext.calls[0].url, "/api/bosses/automation");
  assert.equal(automationRefreshContext.calls[2].options.fast, true);
  assert.equal(automationRefreshContext.calls[2].options.silent, true);
  assert.equal(automationRefreshContext.calls[2].options.showStatus, false);
  assert.equal(automationRefreshContext.calls[2].options.syncQueue, false);
  assert.equal(automationRefreshContext.calls[3].options.silent, true);
  assert.equal(automationRefreshContext.calls[3].options.showStatus, false);
});

test("UI active boss fight refreshes while another tab is open", async () => {
  backgroundFightRefreshContext.calls.length = 0;

  await backgroundFightRefreshContext.bossAutoTick();

  assert.equal(
    JSON.stringify(backgroundFightRefreshContext.calls.map((call) => call.type)),
    JSON.stringify(["state-refresh", "status"]),
  );
  assert.equal(backgroundFightRefreshContext.calls[0].options.silent, true);
  assert.equal(backgroundFightRefreshContext.calls[0].options.showStatus, false);
});

test("UI auto queue plan spends current boss keys and credits reward keys to unlocked bosses", () => {
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    excludedIds: new Set(),
    candidates: [
      {
        id: 12,
        title: "Needs key from 11",
        canStart: true,
        currentSession: false,
        remainingToday: 7,
        requiredKeys: 1,
        ownBossKeysOwned: 0,
        keySourceBossId: 11,
        rewardKeysPerWin: 1,
        selectedMode: "odin",
        availableModes: ["odin"],
        baseHp: 50,
      },
      {
        id: 11,
        title: "Key source",
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        ownBossKeysOwned: 0,
        keyBypassed: true,
        keySourceBossId: 10,
        rewardKeysPerWin: 1,
        selectedMode: "odin",
        availableModes: ["odin"],
        baseHp: 100,
      },
    ],
  });

  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.bossId)), JSON.stringify([11, 12]));
  assert.equal(plan.keyShortageCount, 1);
});

test("UI auto queue includes a boss blocked only by keys earned earlier in the same plan", () => {
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    selectedIds: new Set([11, 12]),
    candidates: [
      {
        id: 12,
        title: "Future key target",
        canStart: false,
        blockedReason: "not_enough_keys",
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 1,
        ownBossKeysOwned: 0,
        keySourceBossId: 11,
        rewardKeysPerWin: 1,
        selectedMode: "odin",
        availableModes: ["odin"],
        baseHp: 50,
      },
      {
        id: 11,
        title: "Key source",
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        ownBossKeysOwned: 0,
        rewardKeysPerWin: 1,
        selectedMode: "odin",
        availableModes: ["odin"],
        baseHp: 25,
      },
    ],
  });

  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.bossId)), JSON.stringify([11, 12]));
  assert.equal(plan.keyShortageCount, 0);
});

test("UI auto queue credits future win keys when the opening combo does not cover full boss HP", () => {
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    selectedIds: new Set([11, 12]),
    actions: [{ key: "punchChest", damage: 10 }],
    candidates: [
      {
        id: 11,
        title: "Key source",
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        ownBossKeysOwned: 0,
        rewardKeysPerWin: 1,
        baseRewardKeysPerWin: 1,
        selectedMode: "pacansky",
        availableModes: ["pacansky"],
        baseHp: 1_000,
      },
      {
        id: 12,
        title: "Future key target",
        canStart: false,
        blockedReason: "not_enough_keys",
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 1,
        ownBossKeysOwned: 0,
        keySourceBossId: 11,
        rewardKeysPerWin: 0,
        selectedMode: "pacansky",
        availableModes: ["pacansky"],
        baseHp: 1_000,
      },
    ],
  });

  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.bossId)), JSON.stringify([11, 12]));
  assert.equal(plan.keyShortageCount, 0);
});

test("UI auto queue attaches one Zaruba damage task to only one repeated boss run", () => {
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    selectedIds: new Set([5]),
    zarubaTasks: [{
      taskId: "damage-5",
      kind: "boss",
      objective: "damage",
      targetId: 5,
      requiredAmount: 900,
      currentAmount: 0,
      completed: false,
      execution: { strategy: "boss_minimum_damage", hitTypes: ["gunshot"] },
    }],
    candidates: [{
      id: 5,
      title: "Сизый",
      canStart: true,
      currentSession: false,
      remainingToday: 3,
      requiredKeys: 0,
      keyBypassed: true,
      rewardKeysPerWin: 0,
      selectedMode: "pacansky",
      availableModes: ["pacansky"],
      baseHp: 5_000,
    }],
  });

  assert.equal(plan.entries.length, 3);
  assert.equal(plan.entries.filter((entry) => entry.serverTaskId === "damage-5").length, 1);
});

test("Zaruba boss plan appends a minimum key chain after the user's queue", () => {
  const existingQueue = [{ bossId: 99, label: "user first", mode: "pacansky" }];
  const chain = [
    {
      id: 1,
      title: "Кирпич",
      canStart: true,
      keyBypassed: true,
      requiredKeys: 0,
      ownBossKeysOwned: 0,
      rewardKeysPerWin: 3,
      baseRewardKeysPerWin: 3,
      remainingToday: 7,
      selectedMode: "odin",
      availableModes: ["odin"],
      comboModes: [],
      baseHp: 100,
    },
    ...[2, 3, 4].map((id) => ({
      id,
      title: `Boss ${id}`,
      canStart: false,
      blockedReason: "not_enough_keys",
      hasEnoughKeys: false,
      keysMissing: 3,
      requiredKeys: 3,
      ownBossKeysOwned: 0,
      keySourceBossId: id - 1,
      rewardKeysPerWin: 3,
      baseRewardKeysPerWin: 3,
      remainingToday: 7,
      selectedMode: "odin",
      availableModes: ["odin"],
      comboModes: [],
      baseHp: id * 100,
    })),
  ];
  const plan = buildPlanContext.buildZarubaBossQueuePlan({
    tasks: [{
      kind: "boss",
      taskId: "lyutyi-damage",
      targetId: 4,
      objective: "damage",
      label: "Нанеси 1700 урона Лютому",
      requiredAmount: 1700,
      currentAmount: 0,
      completed: false,
      execution: { strategy: "boss_minimum_damage", hitTypes: ["gunshot"] },
    }],
    candidates: chain,
    existingQueue,
    actions: [],
  });

  assert.equal(JSON.stringify(existingQueue), JSON.stringify([{ bossId: 99, label: "user first", mode: "pacansky" }]));
  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.bossId)), JSON.stringify([1, 2, 3, 4]));
  assert.equal(plan.entries[3].origin, "manual+zaruba");
  assert.equal(plan.entries[3].comboMode, "");
  assert.equal(JSON.stringify(plan.entries[3].hitTypes), JSON.stringify(["gunshot"]));
  assert.equal(plan.blocked.length, 0);
});

test("Zaruba boss plan completes a 2-of-3 key chain in the regular battle mode", () => {
  const candidates = [
    {
      id: 1,
      title: "Кирпич",
      canStart: true,
      keyBypassed: true,
      requiredKeys: 0,
      ownBossKeysOwned: 2,
      rewardKeysPerWin: 1,
      baseRewardKeysPerWin: 1,
      remainingToday: 7,
      selectedMode: "pacansky",
      availableModes: ["pacansky", "odin"],
      comboModes: [],
      baseHp: 100,
    },
    ...[
      [2, "Сизый"],
      [3, "Махно"],
      [4, "Лютый"],
    ].map(([id, title]) => ({
      id,
      title,
      canStart: false,
      blockedReason: "not_enough_keys",
      hasEnoughKeys: false,
      keysMissing: 1,
      requiredKeys: 3,
      ownBossKeysOwned: id < 4 ? 2 : 0,
      keySourceBossId: id - 1,
      rewardKeysPerWin: 1,
      baseRewardKeysPerWin: 1,
      remainingToday: 7,
      selectedMode: "pacansky",
      availableModes: ["pacansky", "odin"],
      comboModes: [],
      baseHp: id * 100,
    })),
  ];
  const plan = buildPlanContext.buildZarubaBossQueuePlan({
    tasks: [{
      kind: "boss",
      taskId: "lyutyi-2-of-3",
      targetId: 4,
      objective: "damage",
      label: "Нанеси урон Лютому",
      requiredAmount: 1700,
      currentAmount: 0,
      completed: false,
      execution: { strategy: "boss_minimum_damage", hitTypes: ["gunshot"] },
    }],
    candidates,
    existingQueue: [],
    actions: [],
  });

  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.bossId)), JSON.stringify([1, 2, 3, 4]));
  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.mode)), JSON.stringify(["pacansky", "pacansky", "pacansky", "pacansky"]));
  assert.equal(plan.entries[3].serverTaskId, "lyutyi-2-of-3");
  assert.equal(plan.blocked.length, 0);
});

test("Zaruba key-chain projection grants the base key on victory and bonus keys by personal damage", () => {
  const candidate = {
    id: 1,
    baseHp: 1_000,
    selectedMode: "pacansky",
    baseRewardKeysPerWin: 1,
    rewardKeysPerWin: 3,
    bonusKeyDamageTiers: [
      { personalDamage: 200, rewardKeys: 2 },
      { personalDamage: 400, rewardKeys: 3 },
    ],
  };
  const actions = [{ key: "gunshot", damage: 450 }];

  assert.equal(buildPlanContext.getBossQueueProjectedRewardKeys(
    candidate,
    { mode: "pacansky", hitTypes: [] },
    actions,
    { assumeVictory: true },
  ), 1);
  assert.equal(buildPlanContext.getBossQueueProjectedRewardKeys(
    candidate,
    { mode: "pacansky", hitTypes: ["gunshot"] },
    actions,
    { assumeVictory: true },
  ), 3);
});

test("Zaruba boss plan does not leave an orphaned key source when the chain cannot finish", () => {
  const plan = buildPlanContext.buildZarubaBossQueuePlan({
    tasks: [{
      kind: "boss",
      taskId: "blocked-target",
      targetId: 2,
      objective: "damage",
      requiredAmount: 100,
      currentAmount: 0,
      completed: false,
      execution: { strategy: "boss_minimum_damage", hitTypes: ["gunshot"] },
    }],
    candidates: [
      {
        id: 1,
        title: "Источник",
        canStart: true,
        keyBypassed: true,
        requiredKeys: 0,
        ownBossKeysOwned: 0,
        rewardKeysPerWin: 1,
        baseRewardKeysPerWin: 1,
        remainingToday: 1,
        selectedMode: "pacansky",
        availableModes: ["pacansky"],
        comboModes: [],
        baseHp: 100,
      },
      {
        id: 2,
        title: "Цель",
        canStart: false,
        blockedReason: "not_enough_keys",
        hasEnoughKeys: false,
        keysMissing: 3,
        requiredKeys: 3,
        ownBossKeysOwned: 0,
        keySourceBossId: 1,
        remainingToday: 1,
        selectedMode: "pacansky",
        availableModes: ["pacansky"],
        comboModes: [],
        baseHp: 200,
      },
    ],
    existingQueue: [],
    actions: [],
  });

  assert.equal(plan.entries.length, 0);
  assert.equal(plan.blocked.length, 1);
});

test("Zaruba boss plan tags an existing user target instead of replacing its position", () => {
  const existingQueue = [
    { bossId: 50, label: "first" },
    { bossId: 4, label: "Лютый", mode: "pacansky" },
  ];
  const plan = buildPlanContext.buildZarubaBossQueuePlan({
    tasks: [{
      kind: "boss",
      taskId: "existing-target",
      targetId: 4,
      objective: "damage",
      label: "Нанеси 1700 урона Лютому",
      requiredAmount: 1700,
      currentAmount: 0,
      completed: false,
      execution: { strategy: "boss_minimum_damage", hitTypes: ["gunshot"] },
    }],
    candidates: [{
      id: 4,
      title: "Лютый",
      canStart: true,
      keyBypassed: true,
      requiredKeys: 0,
      ownBossKeysOwned: 0,
      rewardKeysPerWin: 1,
      baseRewardKeysPerWin: 1,
      remainingToday: 7,
      selectedMode: "pacansky",
      availableModes: ["pacansky"],
      comboModes: [],
      baseHp: 400,
    }],
    existingQueue,
    actions: [],
  });

  assert.equal(plan.entries.length, 0);
  assert.equal(plan.replacements.length, 1);
  assert.equal(plan.replacements[0].index, 1);
  assert.equal(plan.replacements[0].item.origin, "manual+zaruba");
  assert.equal(JSON.stringify(plan.replacements[0].item.hitTypes), JSON.stringify(["gunshot"]));
});

test("UI auto queue plan includes only explicitly selected bosses", () => {
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    selectedIds: new Set([2]),
    candidates: [
      {
        id: 1,
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        selectedMode: "pacansky",
        availableModes: ["pacansky"],
        baseHp: 10,
      },
      {
        id: 2,
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        selectedMode: "pacansky",
        availableModes: ["pacansky"],
        baseHp: 20,
      },
    ],
  });

  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.bossId)), JSON.stringify([2]));
  assert.equal(plan.selectedIds.size, 1);
  assert.equal(plan.unselectedCount, 1);
});

test("UI queue credits key rewards only when its own automation will finish the boss", () => {
  const shayba = {
    id: 5,
    title: "Шайба",
    baseRewardKeysPerWin: 1,
    bonusKeysByDamage: 2,
    rewardKeysPerWin: 3,
    bonusKeyDamageTiers: [
      { personalDamage: 21_000, rewardKeys: 2 },
      { personalDamage: 70_000, rewardKeys: 3 },
    ],
    baseHp: 70_000,
  };
  assert.equal(
    buildPlanContext.getBossQueueProjectedRewardKeys(
      shayba,
      { bossId: 5, mode: "pacansky", hitTypes: ["gunshot"] },
      [{ key: "gunshot", damage: 21_000 }],
    ),
    0,
  );
  assert.equal(
    buildPlanContext.getBossQueueProjectedRewardKeys(
      shayba,
      { bossId: 5, mode: "pacansky", hitTypes: ["gunshot", "knife"] },
      [{ key: "gunshot", damage: 21_000 }, { key: "knife", damage: 49_000 }],
    ),
    3,
  );
  assert.equal(
    buildPlanContext.getBossQueueProjectedRewardKeys(
      shayba,
      { bossId: 5, mode: "odin", autoKillSolo: false },
      [],
    ),
    0,
  );

  const plan = buildPlanContext.buildBossAutoQueuePlan({
    excludedIds: new Set(),
    candidates: [
      {
        ...shayba,
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        ownBossKeysOwned: 0,
        keyBypassed: true,
        selectedMode: "odin",
        availableModes: ["odin"],
      },
      {
        id: 6,
        title: "Uses Shayba keys",
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 3,
        ownBossKeysOwned: 0,
        keySourceBossId: 5,
        rewardKeysPerWin: 1,
        selectedMode: "pacansky",
        availableModes: ["pacansky"],
        baseHp: 200,
      },
    ],
  });

  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.bossId)), JSON.stringify([5, 6]));
});

test("UI queue mode bundle keeps battle and combo modes independent", () => {
  const bundle = buildPlanContext.getCandidateQueueModeBundle(
    {
      id: 2,
      selectedMode: "pacansky",
      availableModes: ["pacansky", "avtoritetny"],
      comboModes: ["pacansky", "avtoritetny"],
    },
    "avtoritetny",
    "pacansky",
  );

  assert.equal(bundle.mode, "avtoritetny");
  assert.equal(bundle.comboMode, "pacansky");
});

test("UI queue shows the vory mode HP instead of the pacansky amount", () => {
  assert.equal(queueHpContext.resolveBossModeHp(100, "vorovskoy"), 1200);
});

test("Boss Catalog stays grouped by all categories when Boss Queue is filtered", () => {
  const bosses = [
    { id: 1, categoryId: 1, categoryKey: "bers" },
    { id: 2, categoryId: 2, categoryKey: "guards" },
    { id: 3, categoryId: 3, categoryKey: "recid" },
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(catalogFilterContext.getFilteredBossCatalogItems(bosses))),
    [bosses[1]],
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(catalogFilterContext.buildBossCatalogSections(
      catalogFilterContext.getAllBossCatalogItems(bosses),
    ))),
    [
      { key: "bers", label: "Bespredelschiki", items: [bosses[0]] },
      { key: "guards", label: "Nadzirateli", items: [bosses[1]] },
      { key: "recid", label: "Recidivisty", items: [bosses[2]] },
    ],
  );
});

test("UI auto queue covers every category regardless of the catalog picker filter", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(autoQueueCatalogContext.getBossAutoQueueCandidates())),
    [
      { id: 1, categoryId: 1 },
      { id: 2, categoryId: 2 },
      { id: 3, categoryId: 3 },
    ],
  );
});

test("Boss Catalog follows the game's HP order inside each category", () => {
  const bosses = [
    { id: 45, title: "Гвоздь", categoryId: 1, categoryKey: "bers", baseHp: 25_000_000_000, sortIndex: 20 },
    { id: 8, title: "Хирург", categoryId: 1, categoryKey: "bers", baseHp: 30_000_000, sortIndex: 7 },
    { id: 23, title: "Гризли", categoryId: 1, categoryKey: "bers", baseHp: 10_000_000, sortIndex: 11 },
    { id: 40, title: "Абу", categoryId: 1, categoryKey: "bers", baseHp: 8_000_000, sortIndex: 19 },
    { id: 21, title: "Бандяк", categoryId: 1, categoryKey: "bers", baseHp: 5_000_000, sortIndex: 10 },
  ];

  assert.deepEqual(
    JSON.parse(JSON.stringify(catalogFilterContext.getAllBossCatalogItems(bosses))).map((boss) => boss.id),
    [21, 40, 23, 8, 45],
  );
});

test("UI exposes a per-solo-fight automatic kill switch", () => {
  assert.match(appSource, /js-boss-run-auto-kill-solo/);
  assert.match(appSource, /Убить автоматически/);
  assert.match(appSource, /handleBossRunQueueAutoKillSoloChange/);
});

test("UI warns before queueing a solo boss above 1M HP", () => {
  const warning = soloQueueWarningContext.getBossRunQueueSoloWarningCandidate(
    { bossId: 42, mode: "odin", label: "#42 Large boss" },
    { id: 42, title: "Large boss", baseHp: 1_000_001, selectedMode: "odin" },
  );

  assert.equal(JSON.stringify(warning), JSON.stringify({
    bossId: 42,
    label: "#42 Large boss",
    hp: 1_000_001,
  }));
  assert.equal(
    soloQueueWarningContext.getBossRunQueueSoloWarningCandidate(
      { bossId: 42, mode: "odin" },
      { id: 42, title: "Boundary boss", baseHp: 1_000_000, selectedMode: "odin" },
    ),
    null,
  );
  assert.equal(
    soloQueueWarningContext.getBossRunQueueSoloWarningCandidate(
      { bossId: 42, mode: "pacansky" },
      { id: 42, title: "Large boss", baseHp: 2_000_000, selectedMode: "pacansky" },
    ),
    null,
  );
});

test("UI solo warning suppression expires after the Moscow day changes", () => {
  assert.equal(soloQueueWarningPreferenceContext.isBossRunQueueSoloWarningSuppressedToday(), false);

  soloQueueWarningPreferenceContext.suppressBossRunQueueSoloWarningForToday();
  assert.equal(soloQueueWarningPreferenceContext.isBossRunQueueSoloWarningSuppressedToday(), true);

  soloQueueWarningPreferenceContext.storage.set(
    "pbot.account.8369207862.pbot.boss.solo.queue.warning.v1",
    JSON.stringify({ mskDate: "2026-07-10", suppressed: true }),
  );
  assert.equal(soloQueueWarningPreferenceContext.isBossRunQueueSoloWarningSuppressedToday(), false);
});

test("UI offers combo setup for any combo-capable boss without a saved template", () => {
  const target = { bossId: 5, comboMode: "blotnoy" };
  const candidate = { id: 5, comboModes: ["pacansky", "blotnoy"] };

  assert.equal(comboPromptContext.shouldOfferBossComboSetup(target, candidate), true);
  comboPromptContext.templateKeys.add("5:blotnoy");
  assert.equal(comboPromptContext.shouldOfferBossComboSetup(target, candidate), false);
  comboPromptContext.templateKeys.clear();
  assert.equal(
    comboPromptContext.shouldOfferBossComboSetup(
      { bossId: 17, comboMode: "blotnoy" },
      { id: 17, comboModes: ["blotnoy"] },
    ),
    true,
  );
});

test("UI build combo offers are unique per boss and omit bosses with saved combos", () => {
  const entries = [
    { bossId: 5, comboMode: "pacansky", label: "#5 First" },
    { bossId: 5, comboMode: "pacansky", label: "#5 First duplicate" },
    { bossId: 6, comboMode: "pacansky", label: "#6 Second" },
    { bossId: 7, comboMode: "", label: "#7 No combo" },
  ];
  const candidates = [
    { id: 5, comboModes: ["pacansky", "avtoritetny"] },
    { id: 6, comboModes: ["pacansky"] },
    { id: 7, comboModes: [] },
  ];

  assert.equal(
    JSON.stringify(comboPromptContext.getBossComboSetupPromptTargets(entries, candidates).map((item) => item.entry.bossId)),
    JSON.stringify([5, 6]),
  );
  comboPromptContext.templateKeys.add("5:pacansky");
  assert.equal(
    JSON.stringify(comboPromptContext.getBossComboSetupPromptTargets(entries, candidates).map((item) => item.entry.bossId)),
    JSON.stringify([6]),
  );
  comboPromptContext.templateKeys.clear();
});

test("UI auto queue plan uses saved combo template without changing battle mode", () => {
  buildPlanContext.templateKeys.clear();
  buildPlanContext.templateKeys.add("2:pacansky");
  buildPlanContext.templateKeys.add("2:avtoritetny");

  const plan = buildPlanContext.buildBossAutoQueuePlan({
    excludedIds: new Set(),
    candidates: [
      {
        id: 2,
        title: "Combo target",
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        rewardKeysPerWin: 0,
        selectedMode: "pacansky",
        availableModes: ["pacansky", "avtoritetny"],
        comboModes: ["pacansky", "avtoritetny"],
        baseHp: 100,
      },
    ],
  });

  buildPlanContext.templateKeys.clear();

  assert.equal(plan.entries.length, 1);
  assert.equal(plan.entries[0].mode, "pacansky");
  assert.equal(plan.entries[0].comboMode, "avtoritetny");
});

test("UI auto queue plan applies per-boss mode overrides", () => {
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    excludedIds: new Set(),
    modeOverrides: new Map([[2, "avtoritetny"]]),
    candidates: [
      {
        id: 2,
        title: "Override target",
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        rewardKeysPerWin: 0,
        selectedMode: "pacansky",
        availableModes: ["pacansky", "avtoritetny"],
        baseHp: 100,
      },
    ],
  });

  assert.equal(plan.entries.length, 1);
  assert.equal(plan.entries[0].mode, "avtoritetny");
});

test("UI auto battle mode stays automatic while a pacansky combo is retained", () => {
  buildPlanContext.templateKeys.clear();
  buildPlanContext.templateKeys.add("4:pacansky");

  const plan = buildPlanContext.buildBossAutoQueuePlan({
    excludedIds: new Set(),
    modeOverrides: new Map([[4, "auto"]]),
    candidates: [
      {
        id: 4,
        title: "Lyutyi",
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        rewardKeysPerWin: 0,
        selectedMode: "pacansky",
        availableModes: ["pacansky", "avtoritetny"],
        comboModes: ["pacansky", "avtoritetny"],
        baseHp: 100,
      },
    ],
  });

  buildPlanContext.templateKeys.clear();

  assert.equal(plan.entries.length, 1);
  assert.equal(plan.entries[0].mode, null);
  assert.equal(plan.entries[0].comboMode, "pacansky");
});

test("UI smart auto queue prefers an affordable missing battle set without changing combo mode", () => {
  buildPlanContext.templateKeys.clear();
  buildPlanContext.templateKeys.add("17:avtoritetny");

  const plan = buildPlanContext.buildBossAutoQueuePlan({
    excludedIds: new Set(),
    smartCollectionEnabled: true,
    rewards: {
      bosses: [{
        id: 17,
        battleModes: [
          { key: "pacansky", missing: [] },
          { key: "blotnoy", missing: [{ type: "clothing" }, { type: "tattoo" }] },
          { key: "vorovskoy", missing: [{ type: "tattoo" }] },
        ],
      }],
    },
    candidates: [{
      id: 17,
      title: "Collection target",
      canStart: true,
      currentSession: false,
      remainingToday: 1,
      requiredKeys: 0,
      keyBypassed: true,
      rewardKeysPerWin: 0,
      selectedMode: "pacansky",
      availableModes: ["pacansky", "blotnoy", "vorovskoy"],
      comboModes: ["pacansky", "avtoritetny"],
      baseHp: 1_000_000_000,
    }],
  });

  buildPlanContext.templateKeys.clear();

  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.mode)), JSON.stringify(["blotnoy"]));
  assert.equal(JSON.stringify(plan.entries.map((entry) => entry.comboMode)), JSON.stringify(["avtoritetny"]));
  assert.equal(plan.smartPreferredCount, 1);
});

test("UI smart auto queue never selects solo mode for missing collection rewards", () => {
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    excludedIds: new Set(),
    smartCollectionEnabled: true,
    rewards: {
      bosses: [{
        id: 17,
        battleModes: [
          { key: "odin", missing: [{ type: "clothing" }] },
          { key: "blotnoy", missing: [{ type: "tattoo" }] },
        ],
      }],
    },
    candidates: [{
      id: 17,
      title: "Collection target",
      canStart: true,
      currentSession: false,
      remainingToday: 1,
      requiredKeys: 0,
      keyBypassed: true,
      rewardKeysPerWin: 0,
      selectedMode: "pacansky",
      availableModes: ["pacansky", "odin", "blotnoy"],
      baseHp: 1_000_000_000,
    }],
  });

  assert.equal(plan.entries.length, 1);
  assert.equal(plan.entries[0].mode, "blotnoy");
  assert.equal(plan.smartPreferredCount, 1);
});

test("UI smart auto queue keeps eligible bosses and falls back to pacansky above the 3B HP limit", () => {
  buildPlanContext.defaultExcludedBossIds.add(3);
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    smartCollectionEnabled: true,
    rewards: {
      bosses: [
        { id: 17, battleModes: [{ key: "vorovskoy", missing: [{ type: "tattoo" }] }] },
        { id: 3, battleModes: [{ key: "pacansky", missing: [{ type: "tattoo" }] }] },
      ],
    },
    candidates: [
      {
        id: 17,
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        rewardKeysPerWin: 0,
        availableModes: ["pacansky", "vorovskoy"],
        baseHp: 1_000_000_000,
      },
      {
        id: 3,
        canStart: true,
        currentSession: false,
        remainingToday: 1,
        requiredKeys: 0,
        keyBypassed: true,
        rewardKeysPerWin: 0,
        availableModes: ["pacansky"],
      },
    ],
  });

  assert.equal(plan.entries.length, 1);
  assert.equal(plan.entries[0].mode, "pacansky");
  assert.equal(plan.excludedCount, 1);
  assert.equal(plan.smartFallbackCount, 1);
  buildPlanContext.defaultExcludedBossIds.clear();
});

test("UI run queue key status uses planned rewards from earlier rows", () => {
  const candidates = [
    {
      id: 11,
      hasEnoughKeys: true,
      requiredKeys: 0,
      ownBossKeysOwned: 0,
      keyBypassed: true,
      keySourceBossId: 10,
      rewardKeysPerWin: 1,
      baseHp: 100,
      selectedMode: "odin",
    },
    {
      id: 12,
      hasEnoughKeys: false,
      requiredKeys: 1,
      ownBossKeysOwned: 0,
      keySourceBossId: 11,
      rewardKeysPerWin: 1,
      baseHp: 100,
      selectedMode: "odin",
    },
  ];
  const projection = buildPlanContext.buildBossRunQueueKeyProjection(
    [{ bossId: 11, mode: "odin" }, { bossId: 12, mode: "odin" }],
    candidates,
  );

  assert.equal(projection.get(0).hasEnoughKeys, true);
  assert.equal(projection.get(0).planned, false);
  assert.equal(projection.get(1).hasEnoughKeys, true);
  assert.equal(projection.get(1).planned, true);
});

test("UI run queue does not project keys from a solo fight left for the player", () => {
  const projection = buildPlanContext.buildBossRunQueueKeyProjection(
    [
      { bossId: 11, mode: "odin", autoKillSolo: false },
      { bossId: 12, mode: "odin" },
    ],
    [
      {
        id: 11,
        requiredKeys: 0,
        keyBypassed: true,
        rewardKeysPerWin: 1,
        baseHp: 100,
        selectedMode: "odin",
      },
      {
        id: 12,
        requiredKeys: 1,
        ownBossKeysOwned: 0,
        keySourceBossId: 11,
        rewardKeysPerWin: 1,
        baseHp: 100,
        selectedMode: "odin",
      },
    ],
  );

  assert.equal(projection.get(1).hasEnoughKeys, false);
  assert.equal(projection.get(1).keysMissing, 1);
});

test("automatically built boss entries are identifiable for invalid-key cleanup", () => {
  const plan = buildPlanContext.buildBossAutoQueuePlan({
    selectedIds: new Set([1]),
    candidates: [{
      id: 1,
      title: "Кирпич",
      canStart: true,
      currentSession: false,
      remainingToday: 1,
      requiredKeys: 0,
      keyBypassed: true,
      rewardKeysPerWin: 1,
      selectedMode: "odin",
      availableModes: ["odin"],
      baseHp: 100,
    }],
  });

  assert.equal(plan.entries[0].origin, "auto");
});

test("UI queue settings preserve planner rules and selected bosses", () => {
  const context = {};
  vm.runInNewContext(
    [
      "const BOSS_RUN_QUEUE_DEFAULT_EXCLUDED_IDS = Object.freeze([17, 32]);",
      "const BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID = 'default-exclusions';",
      "const state = { bossSmartQueueCollectionEnabled: false };",
      "function normalizeBossComboMode(mode) { return mode ? String(mode).trim().toLowerCase() : ''; }",
      extractFunctionSource(appSource, "normalizeBossIdList"),
      extractFunctionSource(appSource, "normalizeBossRunQueueModeOverrides"),
      extractFunctionSource(appSource, "normalizeBossQueueRules"),
      extractFunctionSource(appSource, "normalizeBossQueueSettings"),
      "this.normalizeBossQueueSettings = normalizeBossQueueSettings;",
    ].join("\n"),
    context,
  );

  const settings = context.normalizeBossQueueSettings({
    category: "2",
    bossId: 39,
    mode: "Avtoritetny",
    comboMode: "Pacansky",
    smartCollection: true,
    autoBuyKeys: true,
    delayMs: 125,
    selectedIds: [39, 2, 39],
    modeByBossId: { 39: "Avtoritetny" },
    excludeTemplateId: "saved-default-exclusions",
    autoStartNext: false,
    rulesOpen: true,
    exclusionsOpen: true,
  });

  assert.equal(JSON.stringify(settings), JSON.stringify({
    category: "2",
    bossId: 39,
    mode: "avtoritetny",
    comboMode: "pacansky",
    autoKillSolo: true,
    useCombo: true,
    autoQueueKillSolo: true,
    autoQueueUseCombo: true,
    autoQueueComboMode: "",
    rulesByBossId: {},
    smartCollection: true,
    autoBuyKeys: true,
    delayMs: 125,
    selectedIds: [2, 39],
    legacyExcludedIds: null,
    modeByBossId: { 39: "avtoritetny" },
    excludeTemplateId: "saved-default-exclusions",
    autoStartNext: false,
    rulesOpen: true,
    exclusionsOpen: true,
  }));
});

test("UI reports actual combo rubles from purchases and cooldown restores", () => {
  const context = {};
  vm.runInNewContext(
    [
      "const BOSS_FIXED_PRICES = Object.freeze({ poison: 18, gunshot: 5, knife: 4, restoreMelee: 3 });",
      extractFunctionSource(appSource, "calculateBossComboRubles"),
      "this.calculateBossComboRubles = calculateBossComboRubles;",
    ].join("\n"),
    context,
  );

  const summary = context.calculateBossComboRubles({
    cycles: [{
      hits: [
        { type: "poison", purchase: { attempted: true, ok: true, weaponType: "poison", count: 2 } },
        { type: "knife", purchase: { attempted: true, ok: true, weaponType: "knife", count: 1 } },
      ],
    }],
    restore: { succeeded: 2, spentByCurrency: { rubles: 6 } },
  });

  assert.equal(JSON.stringify(summary), JSON.stringify({
    totalRubles: 46,
    weaponRubles: 40,
    restoreRubles: 6,
    estimated: true,
  }));
});

test("UI combo economy shows the requested costs, rewards, and clean net", () => {
  const context = {};
  vm.runInNewContext(
    [
      "const BOSS_FIXED_PRICES = Object.freeze({ poison: 18, gunshot: 5, knife: 4, restoreMelee: 3 });",
      "const BOSS_WEAPON_ACTION_KEYS = new Set(['poison', 'gunshot', 'knife']);",
      extractFunctionSource(appSource, "calculateBossComboRubles"),
      extractFunctionSource(appSource, "addBossComboEconomyResource"),
      extractFunctionSource(appSource, "compactBossComboEconomyResources"),
      extractFunctionSource(appSource, "subtractBossComboEconomyResources"),
      extractFunctionSource(appSource, "calculateBossComboEconomy"),
      "this.calculateBossComboEconomy = calculateBossComboEconomy;",
    ].join("\n"),
    context,
  );

  const economy = context.calculateBossComboEconomy({
    cycles: [{
      hits: [
        {
          type: "poison",
          ok: true,
          payload: { weapon: "poison", count: 3 },
          purchase: {
            attempted: true,
            ok: true,
            weaponType: "poison",
            count: 3,
            spent: 30,
          },
        },
        { type: "knife", ok: true, payload: { weapon: "knife", count: 2 } },
        {
          type: "punchChest",
          ok: true,
          comboReward: {
            weapons: [
              { type: "poison", amount: 5 },
              { type: "gunshot", amount: 5 },
              { type: "knife", amount: 5 },
            ],
            currencies: [{ type: "rubles", amount: 10 }],
          },
        },
      ],
    }],
    restore: { succeeded: 0, spentByCurrency: {} },
  });

  assert.equal(JSON.stringify(economy.costs), JSON.stringify({
    weapons: { poison: 3, knife: 2 },
    currencies: { rubles: 30 },
  }));
  assert.equal(JSON.stringify(economy.rewards), JSON.stringify({
    weapons: { poison: 5, gunshot: 5, knife: 5 },
    currencies: { rubles: 10 },
  }));
  assert.equal(JSON.stringify(economy.net), JSON.stringify({
    weapons: { poison: 2, gunshot: 5, knife: 3 },
    currencies: { rubles: -20 },
  }));
});

test("UI fight journal collapses start and result updates into one row per queue fight", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "mergeBossAutomationActivityEntries"),
      extractFunctionSource(appSource, "compactBossAutomationActivity"),
      "this.compactBossAutomationActivity = compactBossAutomationActivity;",
    ].join("\n"),
    context,
  );

  const item = (queueItemId) => ({
    bossId: 11,
    label: "#11 Раиса",
    queueItemId,
  });
  const looseItem = () => ({
    bossId: 11,
    label: "#11 Раиса",
  });
  const rows = context.compactBossAutomationActivity([
    { at: "2026-07-27T20:34:27.990Z", type: "start", status: "claimed", item: item("raisa-3"), rewards: { bossId: 11 } },
    { at: "2026-07-27T20:34:25.415Z", type: "start", status: "started", item: looseItem(), startElapsedMs: 418 },
    { at: "2026-07-27T20:34:21.737Z", type: "claim", status: "claimed", item: { bossId: 11 }, rewards: { bossId: 11 } },
    { at: "2026-07-27T20:34:17.912Z", type: "start", status: "active", item: item("raisa-2"), currentHp: 300000 },
    { at: "2026-07-27T20:34:16.087Z", type: "start", status: "started", item: looseItem(), startElapsedMs: 433 },
    { at: "2026-07-27T20:34:11.597Z", type: "start", status: "active", item: item("raisa-1"), currentHp: 250585 },
    { at: "2026-07-27T20:34:09.748Z", type: "start", status: "started", item: looseItem(), startElapsedMs: 426 },
  ]);

  assert.equal(rows.length, 3);
  assert.equal(JSON.stringify(rows.map((row) => row.item.queueItemId)), JSON.stringify([
    "raisa-3",
    "raisa-2",
    "raisa-1",
  ]));
  assert.equal(JSON.stringify(rows.map((row) => row.status)), JSON.stringify([
    "claimed",
    "claimed",
    "finished",
  ]));
  assert.equal(rows[1].startElapsedMs, 433);
});

test("UI fight journal closes every stale active row when the game has no active session", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "mergeBossAutomationActivityEntries"),
      extractFunctionSource(appSource, "compactBossAutomationActivity"),
      extractFunctionSource(appSource, "reconcileBossAutomationActivityWithFightState"),
      "this.compactBossAutomationActivity = compactBossAutomationActivity;",
      "this.reconcileBossAutomationActivityWithFightState = reconcileBossAutomationActivityWithFightState;",
    ].join("\n"),
    context,
  );

  const item = (queueItemId) => ({
    bossId: 25,
    label: "#25 Пресс",
    queueItemId,
  });
  const compacted = context.compactBossAutomationActivity([
    { at: "2026-07-28T10:29:49.745Z", type: "start", status: "active", item: item("press-2") },
    { at: "2026-07-28T10:29:47.660Z", type: "start", status: "started", item: item("press-2") },
    { at: "2026-07-28T10:27:23.748Z", type: "start", status: "active", item: item("press-1") },
    { at: "2026-07-28T10:27:21.516Z", type: "start", status: "started", item: item("press-1") },
  ]);
  const rows = context.reconcileBossAutomationActivityWithFightState(compacted, {
    snapshot: {
      summary: {
        stateUnknown: false,
        hasSession: false,
        currentHp: null,
      },
    },
  });

  assert.equal(rows.length, 2);
  assert.equal(JSON.stringify(rows.map((row) => row.status)), JSON.stringify([
    "finished",
    "finished",
  ]));
});

test("UI fight journal writes only the clean combo result", () => {
  const context = {
    formatSignedNumber(value) {
      return Number(value) > 0 ? `+${value}` : `−${Math.abs(Number(value))}`;
    },
    getBossComboResourceLabel(key) {
      return {
        rubles: "Рубли",
        poison: "Яд",
        knife: "Финка",
        gunshot: "Самопал",
      }[key] || key;
    },
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "getBossComboEconomyEntries"),
      extractFunctionSource(appSource, "formatBossComboNetSummary"),
      "this.formatBossComboNetSummary = formatBossComboNetSummary;",
    ].join("\n"),
    context,
  );

  const summary = context.formatBossComboNetSummary({
    measured: true,
    costs: {
      weapons: { poison: 3, knife: 2 },
      currencies: { rubles: 30 },
    },
    rewards: {
      weapons: { poison: 5, knife: 5, gunshot: 5 },
      currencies: { rubles: 10 },
    },
    net: {
      weapons: { poison: 2, knife: 3, gunshot: 5 },
      currencies: { rubles: -20 },
    },
  });

  assert.equal(summary, "итог комбо: +2 Яд, +3 Финка, +5 Самопал, −20 Рубли");
  assert.doesNotMatch(summary, /затраты|награда/i);
});

test("UI fight journal merges the local and server copies of one boss reward", () => {
  for (const source of appSources) {
    const context = {};
    vm.runInNewContext(
      [
        extractFunctionSource(source, "buildBossRewardJournalSignature"),
        extractFunctionSource(source, "getBossRewardJournalBossId"),
        extractFunctionSource(source, "getBossRewardJournalQueueItemId"),
        extractFunctionSource(source, "findDuplicateBossRewardJournalEntryIndex"),
        "this.findDuplicateBossRewardJournalEntryIndex = findDuplicateBossRewardJournalEntryIndex;",
      ].join("\n"),
      context,
    );

    const rewardItems = [
      { key: "currency:authority", amount: 25 },
      { key: "boss:keys", amount: 1 },
      { key: "currency:sugar", amount: 25 },
    ];
    const entries = [
      {
        key: "local:old",
        at: "2026-08-16T20:25:20.000Z",
        source: "bosses",
        kind: "reward",
        message: "Награда босса #9",
        rewardItems,
      },
      {
        key: "local:matching",
        at: "2026-08-16T20:26:00.200Z",
        source: "bosses",
        kind: "reward",
        message: "Награда босса #9",
        rewardItems,
      },
      {
        key: "local:other-boss",
        at: "2026-08-16T20:26:00.300Z",
        source: "bosses",
        kind: "reward",
        message: "Награда босса #8",
        rewardItems,
      },
    ];
    const target = {
      at: "2026-08-16T20:26:00.430Z",
      source: "bosses",
      kind: "reward",
      bossRewardBossId: 9,
      rewardItems,
    };

    assert.equal(
      context.findDuplicateBossRewardJournalEntryIndex(entries, target, { localOnly: true }),
      1,
    );
    assert.equal(
      context.findDuplicateBossRewardJournalEntryIndex(entries, {
        ...target,
        at: "2026-08-16T20:26:06.000Z",
      }, { localOnly: true }),
      -1,
    );
    assert.equal(
      context.findDuplicateBossRewardJournalEntryIndex([
        {
          ...entries[1],
          bossRewardQueueItemId: "queue-previous",
        },
      ], {
        ...target,
        bossRewardQueueItemId: "queue-current",
      }, { localOnly: true }),
      -1,
    );
    assert.equal(
      context.findDuplicateBossRewardJournalEntryIndex([
        {
          ...entries[1],
          bossRewardQueueItemId: "queue-current",
        },
      ], {
        ...target,
        at: "2026-08-16T20:26:06.000Z",
        bossRewardQueueItemId: "queue-current",
      }, { localOnly: true }),
      0,
    );
  }
});

test("both boss UIs restore every server-side recent activity row", () => {
  for (const source of appSources) {
    assert.match(source, /const BOSS_ACTIVITY_VISIBLE_LIMIT = 60;/);
  }
});

test("both boss UIs bind an immediate reward response to its exact queue fight", () => {
  for (const source of appSources) {
    const context = {};
    vm.runInNewContext(
      [
        extractFunctionSource(source, "getBossClaimSummaryCandidates"),
        extractFunctionSource(source, "pickBossClaimSummaryValue"),
        "this.getBossClaimSummaryCandidates = getBossClaimSummaryCandidates;",
        "this.pickBossClaimSummaryValue = pickBossClaimSummaryValue;",
      ].join("\n"),
      context,
    );

    const candidates = context.getBossClaimSummaryCandidates({
      rewardActivity: {
        sessionId: "session-finished",
        item: {
          bossId: 11,
          queueItemId: "queue-current",
        },
      },
      finalSnapshot: {
        summary: {
          bossId: 12,
          sessionId: "session-next",
        },
      },
    });
    assert.equal(context.pickBossClaimSummaryValue(candidates, "queueItemId"), "queue-current");
    assert.equal(context.pickBossClaimSummaryValue(candidates, "bossId"), 11);
    assert.equal(context.pickBossClaimSummaryValue(candidates, "sessionId"), "session-finished");
  }
});

test("UI fight journal separates combo, finisher planning, finisher hits, and total time", () => {
  const context = {
    formatDurationMs: (value) => `${Number(value)}ms`,
    formatNumber: (value) => String(value),
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "buildBossAutomationActivityMeta"),
      "this.buildBossAutomationActivityMeta = buildBossAutomationActivityMeta;",
    ].join("\n"),
    context,
  );

  const meta = context.buildBossAutomationActivityMeta({
    hits: 19,
    comboElapsedMs: 3_100,
    finisherElapsedMs: 2_500,
    finisherPreparationElapsedMs: 600,
    finisherHitElapsedMs: 1_900,
    totalElapsedMs: 6_200,
  });

  assert.equal(JSON.stringify(meta), JSON.stringify([
    "19 ударов",
    "комбо 3100ms",
    "добивание 2500ms (подбор 600ms, удары 1900ms)",
    "весь цикл 6200ms",
  ]));
});

test("UI renders the combo result only in the fight journal", () => {
  assert.doesNotMatch(appSource, /Net after combo|renderBossWeaponDelta|syncBossComboPresentationFromActivity/);
  assert.match(
    extractFunctionSource(appSource, "renderBossAutomationActivity"),
    /renderBossComboNetChips\(economy\.net, entry\.comboRewards\)/,
  );
});

test("UI journal combo net renders stash count and resolves a tattoo preview with its hover name", () => {
  const context = {
    state: {
      bossDashboard: {
        rewards: {
          bosses: [{
            battleModes: [],
            comboModes: [{
              items: [{
                type: "tattoo",
                id: 4210,
                name: "Здоровенный Язь",
                previewUrl: "/tattoo-4210.webp",
              }],
            }],
          }],
        },
      },
      wearableCollectionDashboard: null,
    },
    BOSS_STASH_ICON_URL: "/hidesicon.png",
    escapeHtml(value) {
      return String(value);
    },
    formatNumber(value) {
      return String(Number(value));
    },
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "getBossComboRewardsForDisplay"),
      extractFunctionSource(appSource, "findBossComboTattooCatalogItem"),
      extractFunctionSource(appSource, "collectBossComboExtraRewards"),
      extractFunctionSource(appSource, "renderBossComboExtraChips"),
      "this.collectBossComboExtraRewards = collectBossComboExtraRewards;",
      "this.renderBossComboExtraChips = renderBossComboExtraChips;",
    ].join("\n"),
    context,
  );

  const rewards = [{
    stashCount: 90,
    stashGear: [{ id: 32, name: "Спички", amount: 2 }],
    items: [{ type: "tattoo", id: 4210 }],
  }];
  const extras = context.collectBossComboExtraRewards(rewards);
  const markup = context.renderBossComboExtraChips(rewards);

  assert.equal(JSON.stringify(extras), JSON.stringify({
    stashCount: 90,
    tattoos: [{
      id: "4210",
      name: "Здоровенный Язь",
      imageUrl: "/tattoo-4210.webp",
      amount: 1,
    }],
  }));
  assert.match(markup, /\/hidesicon\.png/);
  assert.match(markup, /\+90 Нычки/);
  assert.doesNotMatch(markup, /Спички/);
  assert.match(markup, /\/tattoo-4210\.webp/);
  assert.match(markup, /title="Наколка: Здоровенный Язь"/);
  assert.match(markup, /\+1 Наколка/);
});

test("UI registers damage statistics for idle page preloading", () => {
  const bootstrapSource = extractFunctionSource(appSource, "bootstrap");
  assert.match(appSource, /"friends-damage": Object\.freeze\([\s\S]*?handleFriendsDamageRefresh\(\{ silent: true, showStatus: false \}\)/);
  assert.match(appSource, /PAGE_PREFETCH_ORDER[\s\S]*?"friends-damage"/);
  assert.match(bootstrapSource, /finishInitialLoad\(\);[\s\S]*?startPagePrefetch\(\);/);
  assert.doesNotMatch(bootstrapSource, /handleFriendsDamageRefresh\(\{ silent: true, showStatus: false \}\)/);
});

test("UI persists an unlocked Zaruba mode instead of resetting it on refresh", () => {
  const source = extractFunctionSource(appSource, "handleZarubaModeSelect");
  assert.match(source, /apiRequest\("POST", "\/api\/zaruba\/automation", \{ selectedMode \}\)/);
  assert.match(appSource, /handleZarubaModeSelect\(button\.dataset\.zarubaMode\)/);
  assert.match(appSource, /#zaruba-mode-select"\)\?\.addEventListener\("change", \(event\) => \{/);
  assert.match(appSource, /handleZarubaModeSelect\(event\.target\.value\)/);
});

test("boss header exposes Vorkuta box opening and writes its result to the boss journal", () => {
  const indexSource = fs.readFileSync(path.resolve(__dirname, "../../ui/index.html"), "utf8");
  const serverSource = fs.readFileSync(path.resolve(__dirname, "../ui-server.js"), "utf8");
  const handler = extractFunctionSource(appSource, "handleVorkutaBoxOpen");
  assert.match(indexSource, /id="boss-vorkuta-box-btn"/);
  assert.match(serverSource, /\/api\/bosses\/vorkuta-box\/open/);
  assert.match(handler, /appendLog\("Ящик Воркуты"[\s\S]*source: "bosses"/);
  assert.match(handler, /result\.reason === "no_vbox"[\s\S]*Ящиков для открытия нет/);
});


test("queue combo opt-out survives normalization and can be enabled again", () => {
  const disabled = queueEntryContext.withBossRunQueueHitTypes({
    bossId: 2, mode: "odin", comboMode: "pacansky", autoKillSolo: false,
    skipCombo: true, hitTypes: ["poison"], finishWithNeedle: true,
  });
  assert.equal(disabled.hitTypes, undefined);
  assert.equal(disabled.finishWithNeedle, undefined);
  const restored = queueEntryContext.normalizeBossRunQueueEntry(disabled);
  assert.equal(restored.skipCombo, true);
  assert.equal(restored.autoKillSolo, false);
  const enabled = queueEntryContext.withBossRunQueueHitTypes({ ...restored, skipCombo: false });
  assert.equal(JSON.stringify(enabled.hitTypes), JSON.stringify(["punchChest", "poison"]));
  assert.equal(enabled.autoKillSolo, false);
});


test("auto queue applies independent solo and combo rules to every new entry", () => {
  try {
    for (const kill of [true, false]) {
      for (const combo of [true, false]) {
        vm.runInNewContext(`state.bossQueueSettings = { autoQueueKillSolo: ${kill}, autoQueueUseCombo: ${combo}, autoQueueComboMode: 'blotnoy' };`, buildPlanContext);
        const plan = buildPlanContext.buildBossAutoQueuePlan({
          excludedIds: new Set(), smartCollectionEnabled: false,
          candidates: [1, 2].map((id) => ({
            id, title: `Boss ${id}`, canStart: true, remainingToday: 1,
            requiredKeys: 0, keyBypassed: true, selectedMode: 'odin',
            availableModes: ['odin'], comboModes: ['pacansky', 'blotnoy'],
            baseHp: 100,
          })),
        });
        assert.equal(plan.entries.length, 2);
        for (const entry of plan.entries) {
          assert.equal(entry.autoKillSolo, kill);
          assert.equal(entry.skipCombo, !combo);
          assert.equal(entry.comboMode, 'blotnoy');
        }
      }
    }
  } finally {
    vm.runInNewContext('delete state.bossQueueSettings;', buildPlanContext);
  }
});


test("individual boss rules override global combo and solo defaults in a mixed queue", () => {
  try {
    vm.runInNewContext(`state.bossQueueSettings = {
      autoQueueKillSolo: true, autoQueueUseCombo: true, autoQueueComboMode: 'blotnoy',
      rulesByBossId: { '1': { combo: 'none', autoKillSolo: false }, '2': { combo: 'avtoritetny', autoKillSolo: true } }
    };`, buildPlanContext);
    const plan = buildPlanContext.buildBossAutoQueuePlan({
      excludedIds: new Set(), smartCollectionEnabled: false,
      candidates: [1, 2, 3].map((id) => ({
        id, title: `Boss ${id}`, canStart: true, remainingToday: 1,
        requiredKeys: 0, keyBypassed: true, selectedMode: 'odin',
        availableModes: ['odin'], comboModes: ['pacansky', 'blotnoy', 'avtoritetny'], baseHp: 100,
      })),
    });
    const byId = new Map(plan.entries.map((entry) => [entry.bossId, entry]));
    assert.equal(byId.get(1).skipCombo, true);
    assert.equal(byId.get(1).autoKillSolo, false);
    assert.equal(byId.get(2).comboMode, 'avtoritetny');
    assert.equal(byId.get(2).autoKillSolo, true);
    assert.equal(byId.get(3).comboMode, 'blotnoy');
  } finally { vm.runInNewContext('delete state.bossQueueSettings;', buildPlanContext); }
});

test("mass rules replace selected bosses only and permit a later individual exception", () => {
  const context = {
    state: { bossQueueSettings: {
      autoQueueKillSolo: false, autoQueueUseCombo: true, autoQueueComboMode: 'blotnoy',
      rulesByBossId: { '1': { combo: 'none', autoKillSolo: true }, '3': { combo: 'avtoritetny', autoKillSolo: true } },
    } },
    persistBossQueueSettings() { return context.state.bossQueueSettings; },
    getBossRunQueueSelectedIds() { return new Set([1, 2]); },
    getBossCatalogItems() { return [1, 2, 3].map((id) => ({ id })); },
    renderBossRunQueueExcludeList() {}, renderBossRunQueue() {},
  };
  vm.runInNewContext([
    extractFunctionSource(appSource, 'applyBossAutoQueueRulesToSelected'),
    extractFunctionSource(appSource, 'handleBossRunQueueExcludeChange'),
    'applyBossAutoQueueRulesToSelected();',
  ].join('\n'), context);
  assert.equal(context.state.bossQueueSettings.rulesByBossId[1].combo, 'blotnoy');
  assert.equal(context.state.bossQueueSettings.rulesByBossId[2].autoKillSolo, false);
  assert.equal(context.state.bossQueueSettings.rulesByBossId[3].combo, 'avtoritetny');
  context.trigger = { dataset: { bossId: '2' }, value: 'none', matches() { return true; } };
  vm.runInNewContext('handleBossRunQueueExcludeChange({ target: { closest() { return trigger; } } });', context);
  assert.equal(context.state.bossQueueSettings.rulesByBossId[2].combo, 'none');
  assert.equal(context.state.bossQueueSettings.rulesByBossId[1].combo, 'blotnoy');
});
