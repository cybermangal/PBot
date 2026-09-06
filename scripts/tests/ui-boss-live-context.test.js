const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..", "..");
const appSource = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}`;
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${functionName} not found`);
  const paramsEnd = source.indexOf(")", start);
  const bodyStart = source.indexOf("{", paramsEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${functionName} closing brace not found`);
}

function createContext({ snapshotSummary, dashboardActive, catalogBosses = [] }) {
  const context = {
    state: {
      bossState: snapshotSummary ? { snapshot: { summary: snapshotSummary } } : null,
      bossDashboard: dashboardActive ? { activeSession: dashboardActive } : null,
      bossFightHpCache: { key: null, maxHp: null },
      bossFightMeta: {},
    },
    getBossQueueCandidateMap() {
      return new Map(catalogBosses.map((boss) => [Number(boss.id), boss]));
    },
    normalizeBossComboMode(value) {
      return value ? String(value).trim().toLowerCase() : "";
    },
    resolveBossModeHp(baseHp) {
      return Number(baseHp);
    },
    resolveBossFightComboMode() {
      return null;
    },
    resolveBossFightComboSuccess() {
      return null;
    },
    isBossFightMetaMatch() {
      return false;
    },
    clearBossFightRuntimeState() {},
  };

  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "pickBossLiveValue"),
      extractFunctionSource(appSource, "pickBossLiveNumber"),
      extractFunctionSource(appSource, "pickBossLiveString"),
      extractFunctionSource(appSource, "buildBossFightCacheKey"),
      extractFunctionSource(appSource, "syncBossFightHpCache"),
      extractFunctionSource(appSource, "isBossSummarySameFightAsSession"),
      extractFunctionSource(appSource, "resolveBossLiveContext"),
      "this.resolveBossLiveContext = resolveBossLiveContext;",
    ].join("\n"),
    context,
  );
  return context;
}

test("boss live context ignores a requested boss id from an unreliable state response", () => {
  const context = createContext({
    snapshotSummary: {
      ok: false,
      stateReliable: false,
      bossId: 99,
      hasSession: null,
      title: null,
    },
    dashboardActive: {
      session: {
        sessionId: "fight-7",
        bossId: 7,
        currentHp: 800,
        baseHp: 1_000,
        title: "Настоящий босс",
      },
      activeBoss: {
        id: 7,
        title: "Настоящий босс",
        baseHp: 1_000,
      },
    },
    catalogBosses: [{ id: 7, title: "Настоящий босс", baseHp: 1_000 }],
  });

  const result = context.resolveBossLiveContext();

  assert.equal(result.activeSession.bossId, 7);
  assert.equal(result.activeBoss.id, 7);
  assert.equal(result.activeBoss.title, "Настоящий босс");
});

test("boss live context keeps a dashboard fight when a delayed state response only says no session", () => {
  const context = createContext({
    snapshotSummary: {
      ok: true,
      stateReliable: true,
      stateUnknown: false,
      hasSession: false,
      hasReward: false,
      rewardReady: false,
      isCompleted: false,
      bossId: null,
      sessionId: null,
      currentHp: null,
    },
    dashboardActive: {
      session: {
        sessionId: "fight-31",
        bossId: 31,
        currentHp: 12_500,
        baseHp: 13_000,
        endsAt: "2026-08-22T21:00:00.000Z",
        title: "Змей",
      },
      activeBoss: {
        id: 31,
        title: "Змей",
        baseHp: 13_000,
      },
    },
  });

  const result = context.resolveBossLiveContext();

  assert.equal(result.activeSession.sessionId, "fight-31");
  assert.equal(result.activeBoss.id, 31);
  assert.equal(result.currentHp, 12_500);
});

test("boss live context lets explicit completion hide the matching dashboard fight", () => {
  const context = createContext({
    snapshotSummary: {
      hasSession: false,
      hasReward: true,
      rewardReady: true,
      isCompleted: true,
      bossId: 31,
      sessionId: "fight-31",
      currentHp: 0,
    },
    dashboardActive: {
      session: {
        sessionId: "fight-31",
        bossId: 31,
        currentHp: 100,
        baseHp: 13_000,
      },
      activeBoss: {
        id: 31,
        title: "Змей",
        baseHp: 13_000,
      },
    },
  });

  const result = context.resolveBossLiveContext();

  assert.equal(result.activeSession, null);
});

test("boss live context does not let the previous completed fight hide a new dashboard fight", () => {
  const context = createContext({
    snapshotSummary: {
      hasSession: false,
      hasReward: true,
      rewardReady: true,
      isCompleted: true,
      bossId: 30,
      sessionId: "fight-30",
      currentHp: 0,
    },
    dashboardActive: {
      session: {
        sessionId: "fight-31",
        bossId: 31,
        currentHp: 12_500,
        baseHp: 13_000,
      },
      activeBoss: {
        id: 31,
        title: "Змей",
        baseHp: 13_000,
      },
    },
  });

  const result = context.resolveBossLiveContext();

  assert.equal(result.activeSession.sessionId, "fight-31");
  assert.equal(result.activeBoss.id, 31);
});

test("boss live context never borrows a title from a different dashboard boss", () => {
  const context = createContext({
    snapshotSummary: {
      hasSession: true,
      sessionId: "fight-7",
      bossId: 7,
      currentHp: 800,
      baseHp: 1_000,
      title: null,
    },
    dashboardActive: {
      session: {
        sessionId: "fight-8",
        bossId: 8,
        currentHp: 2_000,
        baseHp: 2_000,
      },
      activeBoss: {
        id: 8,
        title: "Устаревший босс",
        baseHp: 2_000,
      },
    },
    catalogBosses: [{ id: 7, title: "Босс из каталога", baseHp: 1_000 }],
  });

  const result = context.resolveBossLiveContext();

  assert.equal(result.activeBoss.id, 7);
  assert.equal(result.activeBoss.title, "Босс из каталога");
  assert.equal(result.activeBoss.baseHp, 1_000);
});

test("boss state refresh requests the active session instead of the boss selected in the form", async () => {
  const calls = [];
  const context = {
    URLSearchParams,
    state: {
      bossState: null,
      bossDashboard: null,
    },
    async apiRequest(method, url) {
      calls.push({ method, url });
      return {
        snapshot: {
          summary: {
            hasSession: false,
          },
        },
      };
    },
    collectBossOptions() {
      throw new Error("the selected catalog boss must not scope an active-session refresh");
    },
    mergeBossRuntimeSnapshots(previous, incoming) {
      return incoming || previous;
    },
    applyBossAutomationState() {},
    renderBossFightBars() {},
    renderBossLiveSummary() {},
    renderBossAttackQueue() {},
    appendLog() {},
    appendDiagnosticError() {},
    setServerStatus() {},
  };

  vm.runInNewContext(
    [
      `async ${extractFunctionSource(appSource, "handleBossStateRefresh")}`,
      "this.handleBossStateRefresh = handleBossStateRefresh;",
    ].join("\n"),
    context,
  );

  await context.handleBossStateRefresh({ fast: true, silent: true, showStatus: false });

  assert.deepEqual(calls, [{ method: "GET", url: "/api/bosses/state?fast=1" }]);
});

test("an older boss-state request cannot overwrite a newer active fight", async () => {
  const pending = [];
  const context = {
    URLSearchParams,
    state: {
      bossState: null,
      bossDashboard: null,
      bossStateRequestVersion: 0,
    },
    apiRequest() {
      return new Promise((resolve) => pending.push(resolve));
    },
    mergeBossRuntimeSnapshots(_previous, incoming) {
      return incoming;
    },
    applyBossAutomationState() {},
    renderBossFightBars() {},
    renderBossLiveSummary() {},
    renderBossAttackQueue() {},
    appendLog() {},
    appendDiagnosticError() {},
    setServerStatus() {},
  };

  vm.runInNewContext(
    [
      `async ${extractFunctionSource(appSource, "handleBossStateRefresh")}`,
      "this.handleBossStateRefresh = handleBossStateRefresh;",
    ].join("\n"),
    context,
  );

  const older = context.handleBossStateRefresh({ silent: true, showStatus: false });
  const newer = context.handleBossStateRefresh({ silent: true, showStatus: false });
  pending[1]({ snapshot: { summary: { hasSession: true, sessionId: "fight-new", bossId: 31 } } });
  await newer;
  pending[0]({ snapshot: { summary: { hasSession: false } } });
  await older;

  assert.equal(context.state.bossState.snapshot.summary.hasSession, true);
  assert.equal(context.state.bossState.snapshot.summary.sessionId, "fight-new");
});

test("returning to the browser tab immediately refreshes dashboard and boss state", async () => {
  const calls = [];
  const context = {
    state: {
      authGateActive: false,
      bossResumeRefreshRunning: false,
    },
    document: {
      body: {
        classList: {
          contains(value) {
            return value === "app-ready";
          },
        },
      },
    },
    async handleBossDashboard(options) {
      calls.push({ type: "dashboard", options });
      return { activeSession: true };
    },
    async handleBossStateRefresh(options) {
      calls.push({ type: "state", options });
      return { snapshot: true };
    },
  };

  vm.runInNewContext(
    [
      `async ${extractFunctionSource(appSource, "refreshBossAfterVisibilityResume")}`,
      "this.refreshBossAfterVisibilityResume = refreshBossAfterVisibilityResume;",
    ].join("\n"),
    context,
  );

  const result = await context.refreshBossAfterVisibilityResume();

  assert.equal(context.state.bossResumeRefreshRunning, false);
  assert.deepEqual(calls.map((call) => call.type), ["dashboard", "state"]);
  assert.equal(calls[0].options.fast, true);
  assert.equal(calls[1].options.fast, true);
  assert.equal(result.dashboard.activeSession, true);
  assert.equal(result.bossState.snapshot, true);
});

test("boss dashboard immediately primes melee cooldown state on page load", () => {
  const context = {
    state: {
      bossState: null,
    },
  };

  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "pickBossLiveValue"),
      extractFunctionSource(appSource, "pickBossLiveNumber"),
      extractFunctionSource(appSource, "pickBossLiveString"),
      extractFunctionSource(appSource, "isBossCooldownActiveAt"),
      extractFunctionSource(appSource, "isSameBossRuntimeSnapshot"),
      extractFunctionSource(appSource, "mergeBossRuntimeSnapshots"),
      extractFunctionSource(appSource, "buildBossRuntimeSnapshotFromDashboard"),
      extractFunctionSource(appSource, "syncBossStateFromDashboard"),
      "this.syncBossStateFromDashboard = syncBossStateFromDashboard;",
    ].join("\n"),
    context,
  );

  const readyAt = new Date(Date.now() + 60_000).toISOString();
  context.syncBossStateFromDashboard({
    activeSession: {
      sessionActive: true,
      claimReady: false,
      session: {
        sessionId: "fight-19",
        bossId: 19,
        mode: "pacansky",
        currentHp: 900,
        baseHp: 1_000,
        personalDamage: 100,
        meleeCooldowns: {
          punchChest: {
            active: true,
            cooldownSec: 60,
            readyAt,
            remainingMs: 60_000,
            restorePriceRubles: 3,
          },
        },
      },
      activeBoss: {
        id: 19,
        title: "Boss",
        baseHp: 1_000,
      },
    },
  });

  const summary = context.state.bossState.snapshot.summary;
  assert.equal(summary.hasSession, true);
  assert.equal(summary.bossId, 19);
  assert.equal(summary.meleeCooldowns.punchChest.active, true);
  assert.equal(summary.meleeCooldowns.punchChest.readyAt, readyAt);
});
