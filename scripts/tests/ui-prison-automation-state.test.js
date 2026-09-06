const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { __test } = require("../lib/ui-service");

test("cheap monthly prison run is represented as a durable prison queue item", () => {
  const item = __test.buildMonthlyPrisonQueueItem(
    { year: 2026, month: 8 },
    {
      dayId: 29,
      action: "PrisonRun",
      target: 3,
      progress: 1,
      context: { prisonId: 1 },
      title: "Бутырка",
    },
  );

  assert.equal(item.queueItemId, "monthly-prison-2026-8-29");
  assert.equal(item.targetId, 1);
  assert.equal(item.runTarget, 2);
  assert.equal(item.origin, "monthly");
});

test("account-scoped automation paths cannot overlap between players", () => {
  const first = __test.getAccountArtifactPath("1001", "prison-automation-latest.json");
  const second = __test.getAccountArtifactPath("2002", "prison-automation-latest.json");

  assert.notEqual(first, second);
  assert.match(first, /accounts[\\/]1001[\\/]prison-automation-latest\.json$/);
  assert.match(second, /accounts[\\/]2002[\\/]prison-automation-latest\.json$/);
  assert.throws(
    () => __test.getAccountArtifactPath("../shared", "prison-automation-latest.json"),
    /numeric account ID/i,
  );
});

test("every background automation with persistent settings uses the active account directory", async () => {
  const uiServiceSource = await fs.readFile(path.resolve(__dirname, "../lib/ui-service.js"), "utf8");
  const letsCookSource = await fs.readFile(path.resolve(__dirname, "../lib/lets-cook.js"), "utf8");

  assert.match(uiServiceSource, /getAccountArtifactPath\(context\.accountId, "misc-automation-latest\.json"\)/);
  assert.match(uiServiceSource, /getAccountArtifactPath\(context\.accountId, "fartovy-autospin-settings\.json"\)/);
  assert.match(uiServiceSource, /miscAutomationRuntime\.accountId === context\.accountId/);
  assert.match(letsCookSource, /"accounts", accountId, "lets-cook-automation-latest\.json"/);
  assert.match(letsCookSource, /runtime\.initialized && runtime\.accountId === context\.accountId/);
});
const { normalizePrisonAutomationState } = require("../lib/prison-dashboard");

async function createTemporaryStateDirectory(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-prison-state-"));
  t.after(async () => {
    await fs.rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test("a corrupt prison automation state is archived and restored as safely disabled", async (t) => {
  const directory = await createTemporaryStateDirectory(t);
  const statePath = path.join(directory, "prison-automation-latest.json");
  const corruptContents = Buffer.alloc(581);
  await fs.writeFile(statePath, corruptContents);

  const state = await __test.loadPrisonAutomationState({ statePath });

  assert.equal(state.enabled, false);
  assert.equal(state.autoCollectProfit, false);
  assert.equal(state.usePodogrev, false);
  const restoredState = JSON.parse(await fs.readFile(statePath, "utf8"));
  assert.equal(restoredState.enabled, false);
  assert.equal(restoredState.autoCollectProfit, false);
  assert.equal(restoredState.usePodogrev, false);

  const files = await fs.readdir(directory);
  const archivedFile = files.find((file) => /^prison-automation-latest\.corrupt-\d+-0\.json$/.test(file));
  assert.ok(archivedFile);
  assert.deepEqual(await fs.readFile(path.join(directory, archivedFile)), corruptContents);
});

test("prison automation state writes replace the completed JSON file atomically", async (t) => {
  const directory = await createTemporaryStateDirectory(t);
  const statePath = path.join(directory, "prison-automation-latest.json");
  const body = "{\n  \"enabled\": false\n}\n";

  await __test.writePrisonAutomationStateAtomically(statePath, body);

  assert.equal(await fs.readFile(statePath, "utf8"), body);
  assert.deepEqual(await fs.readdir(directory), ["prison-automation-latest.json"]);
});

test("master automation does not count temporary energy exhaustion as a completed walk", () => {
  const incomplete = {
    runs: 0,
    canStartTraining: true,
    currentCheckpointIndex: 6,
    completed: [true, true, true, true, true, true, false],
    checkpoints: Array.from({ length: 7 }, () => ({})),
    progress: { currentCheckpoint: 7, clicksInCheckpoint: 12, level: 0 },
  };

  assert.equal(__test.getMasterRunCompletionCount(incomplete, {
    ...incomplete,
    canStartTraining: false,
    progress: { ...incomplete.progress, clicksInCheckpoint: 13 },
  }), 0);
});

test("master automation counts a walk only after every checkpoint is completed", () => {
  const checkpoints = Array.from({ length: 7 }, () => ({}));
  const before = {
    runs: 0,
    canStartTraining: true,
    currentCheckpointIndex: 6,
    completed: [true, true, true, true, true, true, false],
    checkpoints,
    progress: { currentCheckpoint: 7, clicksInCheckpoint: 21, level: 0 },
  };
  const after = {
    ...before,
    canStartTraining: false,
    currentCheckpointIndex: 7,
    completed: [true, true, true, true, true, true, true],
    progress: { ...before.progress, clicksInCheckpoint: 22 },
  };

  assert.equal(__test.getMasterRunCompletionCount(before, after), 1);
});

test("master automation recovers a completed walk snapshot after restart", () => {
  const queueItem = { observedRuns: 0 };
  const observation = __test.observePrisonAutomationRun(queueItem, {
    runs: 0,
    currentCheckpointIndex: 7,
    completed: [true, true, true, true, true, true, true],
    checkpoints: Array.from({ length: 7 }, () => ({})),
    progress: { currentCheckpoint: 7, level: 0 },
  }, { creditCompletedSnapshot: true });

  assert.equal(observation.completedRuns, 1);
  assert.match(queueItem.lastCompletionToken, /^completed:/);
});

test("Zaruba and regular automation serialize mutations of the same mini-game", async () => {
  const order = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const first = __test.runMiniGameSerialized("wheel-test", async () => {
    order.push("first:start");
    await firstGate;
    order.push("first:end");
  });
  const second = __test.runMiniGameSerialized("wheel-test", async () => {
    order.push("second:start");
    order.push("second:end");
  });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(order, ["first:start"]);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(order, ["first:start", "first:end", "second:start", "second:end"]);
});

test("prison automation spends allowed chefir before waiting for energy", async () => {
  let useChefirCalls = 0;
  const state = normalizePrisonAutomationState({
    energyPolicy: {
      allowChefir: true,
      chefirReserve: 1,
      chefirDailyLimit: 2,
      chefirSpentToday: 0,
    },
  });
  const client = {
    players: {
      useChefir: async () => {
        useChefirCalls += 1;
        return { ok: true, status: 200, data: { success: true } };
      },
      init: async () => ({
        ok: true,
        status: 200,
        data: { energy: 10, maxEnergy: 10, currencies: { chefir: 1 } },
      }),
    },
  };

  const recovery = await __test.restorePrisonAutomationEnergyIfNeeded(
    client,
    state,
    { energy: 8, maxEnergy: 10, currencies: { chefir: 2 } },
    10,
  );

  assert.equal(useChefirCalls, 1);
  assert.equal(recovery.used, true);
  assert.equal(recovery.reason, "chefir_used");
  assert.equal(recovery.afterEnergy, 10);
  assert.equal(state.energyPolicy.chefirSpentToday, 1);
});

test("prison automation keeps the configured chefir reserve", async () => {
  const state = normalizePrisonAutomationState({
    energyPolicy: {
      allowChefir: true,
      chefirReserve: 1,
      chefirDailyLimit: 2,
      chefirSpentToday: 0,
    },
  });
  const client = {
    players: {
      useChefir: async () => {
        throw new Error("reserve should block chefir use");
      },
    },
  };

  const recovery = await __test.restorePrisonAutomationEnergyIfNeeded(
    client,
    state,
    { energy: 8, maxEnergy: 10, currencies: { chefir: 1 } },
    10,
  );

  assert.equal(recovery.used, false);
  assert.equal(recovery.reason, "chefir_reserve");
  assert.equal(state.energyPolicy.chefirSpentToday, 0);
});

test("prison automation does not spend chefir when one restore cannot reach the requested tick energy", async () => {
  const state = normalizePrisonAutomationState({
    energyPolicy: {
      allowChefir: true,
      chefirReserve: 0,
      chefirDailyLimit: 2,
      chefirSpentToday: 0,
    },
  });
  const client = {
    players: {
      useChefir: async () => {
        throw new Error("oversized tick should block chefir use");
      },
    },
  };

  const recovery = await __test.restorePrisonAutomationEnergyIfNeeded(
    client,
    state,
    { energy: 0, maxEnergy: 10, currencies: { chefir: 2 } },
    12,
  );

  assert.equal(recovery.used, false);
  assert.equal(recovery.reason, "required_energy_above_max");
  assert.equal(state.energyPolicy.chefirSpentToday, 0);
});
