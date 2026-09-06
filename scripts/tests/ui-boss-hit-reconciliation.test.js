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

function createContext() {
  const context = {
    BOSS_MELEE_ACTION_KEYS: new Set(["punchChest", "kickBalls", "pokeEyes", "kneeEar"]),
    BOSS_FIXED_PRICES: { restoreMelee: 3 },
    BOSS_HIT_SNAPSHOT_GRACE_MS: 5000,
    state: {
      bossDashboard: {
        actions: [{ key: "punchChest", cooldownSec: 60 }],
      },
      bossState: null,
      bossResult: null,
    },
    applyBossWeaponDelta() {},
    renderBossFightBars() {},
    renderBossLiveSummary() {},
    renderBossWeaponPanel() {},
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "pickBossLiveValue"),
      extractFunctionSource(appSource, "pickBossLiveNumber"),
      extractFunctionSource(appSource, "pickBossLiveString"),
      extractFunctionSource(appSource, "isBossCooldownActiveAt"),
      extractFunctionSource(appSource, "isSameBossRuntimeSnapshot"),
      extractFunctionSource(appSource, "mergeBossRuntimeSnapshots"),
      extractFunctionSource(appSource, "getBossSuccessfulResultHits"),
      extractFunctionSource(appSource, "getBossResultHitDamageDelta"),
      extractFunctionSource(appSource, "reconcileBossHitSnapshot"),
      extractFunctionSource(appSource, "clearBossMeleeCooldownState"),
      extractFunctionSource(appSource, "renderBossResult"),
      "this.mergeBossRuntimeSnapshots = mergeBossRuntimeSnapshots;",
      "this.clearBossMeleeCooldownState = clearBossMeleeCooldownState;",
      "this.renderBossResult = renderBossResult;",
    ].join("\n"),
    context,
  );
  return context;
}

function createStaleSnapshot() {
  return {
    summary: {
      bossId: 19,
      sessionId: "session-1",
      hasSession: true,
      isCompleted: false,
      currentHp: 900,
      personalDamage: 100,
      meleeCooldowns: {
        punchChest: {
          active: false,
          cooldownSec: 60,
          readyAt: null,
          remainingMs: 0,
          restorePriceRubles: 3,
        },
      },
    },
  };
}

test("successful melee hit immediately advances damage and starts cooldown when snapshot lags", () => {
  const context = createContext();
  context.state.bossState = { snapshot: createStaleSnapshot() };
  context.renderBossResult({
    finalSnapshot: createStaleSnapshot(),
    cycles: [{
      hits: [{
        type: "punchChest",
        ok: true,
        progressed: true,
        previousHp: 900,
        currentHp: 900,
        previousPersonalDamage: 100,
        personalDamage: 100,
        directDamage: 25,
      }],
    }],
  });

  const summary = context.state.bossState.snapshot.summary;
  assert.equal(summary.currentHp, 875);
  assert.equal(summary.personalDamage, 125);
  assert.equal(summary.meleeCooldowns.punchChest.active, true);
  assert.equal(summary.meleeCooldowns.punchChest.remainingMs, 60_000);
  assert.ok(Date.parse(summary.meleeCooldowns.punchChest.readyAt) > Date.now());
  assert.ok(Date.parse(summary.optimisticHitUntil) > Date.now());
});

test("successful melee hit starts fallback cooldown without dashboard metadata", () => {
  const context = createContext();
  context.state.bossDashboard.actions = [];
  const previousSnapshot = createStaleSnapshot();
  const finalSnapshot = createStaleSnapshot();
  delete previousSnapshot.summary.meleeCooldowns.punchChest.cooldownSec;
  delete finalSnapshot.summary.meleeCooldowns.punchChest.cooldownSec;
  context.state.bossState = { snapshot: previousSnapshot };

  context.renderBossResult({
    finalSnapshot,
    cycles: [{
      hits: [{
        type: "punchChest",
        ok: true,
        progressed: true,
        previousHp: 900,
        currentHp: 900,
        previousPersonalDamage: 100,
        personalDamage: 100,
        directDamage: 25,
      }],
    }],
  });

  const cooldown = context.state.bossState.snapshot.summary.meleeCooldowns.punchChest;
  assert.equal(cooldown.active, true);
  assert.equal(cooldown.cooldownSec, 8 * 60 * 60);
  assert.equal(cooldown.remainingMs, 8 * 60 * 60 * 1000);
});

test("progressed melee hit reconciles damage and cooldown even when ok is false", () => {
  const context = createContext();
  context.state.bossState = { snapshot: createStaleSnapshot() };

  context.renderBossResult({
    finalSnapshot: createStaleSnapshot(),
    cycles: [{
      hits: [{
        type: "punchChest",
        ok: false,
        progressed: true,
        previousHp: 900,
        currentHp: 900,
        previousPersonalDamage: 100,
        personalDamage: 100,
        directDamage: 25,
      }],
    }],
  });

  const summary = context.state.bossState.snapshot.summary;
  assert.equal(summary.currentHp, 875);
  assert.equal(summary.personalDamage, 125);
  assert.equal(summary.meleeCooldowns.punchChest.active, true);
});

test("an immediate stale poll cannot roll damage or an active cooldown backward", () => {
  const context = createContext();
  const staleSnapshot = createStaleSnapshot();
  const optimisticSnapshot = {
    summary: {
      ...staleSnapshot.summary,
      currentHp: 875,
      personalDamage: 125,
      optimisticHitUntil: new Date(Date.now() + 5_000).toISOString(),
      meleeCooldowns: {
        punchChest: {
          ...staleSnapshot.summary.meleeCooldowns.punchChest,
          active: true,
          readyAt: new Date(Date.now() + 60_000).toISOString(),
          remainingMs: 60_000,
          optimisticUntil: new Date(Date.now() + 5_000).toISOString(),
        },
      },
    },
  };

  const merged = context.mergeBossRuntimeSnapshots(
    optimisticSnapshot,
    staleSnapshot,
    Date.now(),
  );
  assert.equal(merged.summary.currentHp, 875);
  assert.equal(merged.summary.personalDamage, 125);
  assert.equal(merged.summary.meleeCooldowns.punchChest.active, true);
});

test("an active cooldown with future readyAt survives a stale inactive poll", () => {
  const context = createContext();
  const staleSnapshot = createStaleSnapshot();
  const nowMs = Date.now();
  const optimisticSnapshot = {
    summary: {
      ...staleSnapshot.summary,
      currentHp: 875,
      personalDamage: 125,
      optimisticHitUntil: new Date(nowMs - 1).toISOString(),
      meleeCooldowns: {
        punchChest: {
          ...staleSnapshot.summary.meleeCooldowns.punchChest,
          active: true,
          readyAt: new Date(nowMs + 60_000).toISOString(),
          remainingMs: 60_000,
          optimisticUntil: new Date(nowMs - 1).toISOString(),
        },
      },
    },
  };

  const merged = context.mergeBossRuntimeSnapshots(
    optimisticSnapshot,
    staleSnapshot,
    nowMs,
  );
  assert.equal(merged.summary.currentHp, 900);
  assert.equal(merged.summary.personalDamage, 100);
  assert.equal(merged.summary.meleeCooldowns.punchChest.active, true);
  assert.equal(merged.summary.meleeCooldowns.punchChest.remainingMs, 60_000);
});

test("a successful paid restore clears an optimistic melee cooldown immediately", () => {
  const context = createContext();
  const snapshot = createStaleSnapshot();
  snapshot.summary.meleeCooldowns.punchChest = {
    ...snapshot.summary.meleeCooldowns.punchChest,
    active: true,
    readyAt: new Date(Date.now() + 60_000).toISOString(),
    remainingMs: 60_000,
    optimisticUntil: new Date(Date.now() + 5_000).toISOString(),
  };
  context.state.bossState = { snapshot };

  context.clearBossMeleeCooldownState("punchChest");

  const cooldown = context.state.bossState.snapshot.summary.meleeCooldowns.punchChest;
  assert.equal(cooldown.active, false);
  assert.equal(cooldown.readyAt, null);
  assert.equal(cooldown.remainingMs, 0);
  assert.equal(cooldown.optimisticUntil, null);
  assert.ok(Date.parse(cooldown.clearUntil) > Date.now());
});

test("a stale active cooldown cannot undo a recent paid restore", () => {
  const context = createContext();
  const snapshot = createStaleSnapshot();
  snapshot.summary.meleeCooldowns.punchChest = {
    ...snapshot.summary.meleeCooldowns.punchChest,
    active: true,
    readyAt: new Date(Date.now() + 60_000).toISOString(),
    remainingMs: 60_000,
  };
  context.state.bossState = { snapshot };
  context.clearBossMeleeCooldownState("punchChest");

  const incoming = createStaleSnapshot();
  incoming.summary.meleeCooldowns.punchChest = {
    ...incoming.summary.meleeCooldowns.punchChest,
    active: true,
    readyAt: new Date(Date.now() + 60_000).toISOString(),
    remainingMs: 60_000,
  };

  const merged = context.mergeBossRuntimeSnapshots(
    context.state.bossState.snapshot,
    incoming,
    Date.now(),
  );

  assert.equal(merged.summary.meleeCooldowns.punchChest.active, false);
  assert.equal(merged.summary.meleeCooldowns.punchChest.readyAt, null);
});

test("a snapshot from a new fight is never merged with previous fight progress", () => {
  const context = createContext();
  const previousSnapshot = createStaleSnapshot();
  previousSnapshot.summary.currentHp = 875;
  previousSnapshot.summary.personalDamage = 125;
  const nextSnapshot = createStaleSnapshot();
  nextSnapshot.summary.sessionId = "session-2";
  nextSnapshot.summary.currentHp = 1_000;
  nextSnapshot.summary.personalDamage = 0;

  const merged = context.mergeBossRuntimeSnapshots(previousSnapshot, nextSnapshot);
  assert.equal(merged.summary.sessionId, "session-2");
  assert.equal(merged.summary.currentHp, 1_000);
  assert.equal(merged.summary.personalDamage, 0);
});
