const test = require("node:test");
const assert = require("node:assert/strict");

const { __test } = require("../lib/ui-service");
const { createApiClient } = require("../lib/api-client");
const { normalizeBusinessDashboard } = require("../lib/prison-dashboard");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

test("business profit collection is blocked unless Zaruba is active", async () => {
  let zarubaStateCalls = 0;
  let collectCalls = 0;
  const client = {
    zaruba: {
      state: async () => {
        zarubaStateCalls += 1;
        return { ok: true, status: 200, data: { active: null } };
      },
    },
    business: {
      collect: async () => {
        collectCalls += 1;
        return { ok: true, status: 200, data: { collected: true } };
      },
    },
  };

  await assert.rejects(
    () => __test.collectBusinessProfitAfterZarubaCheck(client),
    (error) => {
      assert.equal(error.code, "zaruba_not_started");
      return true;
    },
  );

  assert.equal(zarubaStateCalls, 1);
  assert.equal(collectCalls, 0);
});

test("business profit collection proceeds when Zaruba is active", async () => {
  let collectCalls = 0;
  const client = {
    zaruba: {
      state: async () => ({ ok: true, status: 200, data: { active: { mode: 1, tasks: [] } } }),
    },
    business: {
      collect: async () => {
        collectCalls += 1;
        return { ok: true, status: 200, data: { collected: true } };
      },
    },
  };

  const result = await __test.collectBusinessProfitAfterZarubaCheck(client);

  assert.equal(result.gate.canCollect, true);
  assert.equal(result.response.data.collected, true);
  assert.equal(collectCalls, 1);
});

test("manual collection reports application and HTTP failures instead of false success", async () => {
  for (const response of [
    { ok: true, status: 200, data: { success: false, message: "Общак пока не готов" } },
    { ok: false, status: 503, data: {} },
  ]) {
    const client = {
      zaruba: { state: async () => ({ ok: true, data: { active: { mode: 1 } } }) },
      business: { collect: async () => response },
    };
    await assert.rejects(() => __test.collectBusinessProfitAfterZarubaCheck(client),
      response.ok ? /Общак пока не готов/ : /Игра отклонила сбор общака/);
  }
});

test("manual collection and its Zaruba check overtake queued background requests", async () => {
  const original = global.fetch;
  const endpoints = [];
  const pending = [];
  global.fetch = async (url, options) => {
    const endpoint = new URL(url).pathname;
    endpoints.push(endpoint);
    if (endpoint.endsWith("/collect")) {
      assert.equal(options.method, "POST");
      assert.equal(options.body, "{}");
    }
    return new Response(JSON.stringify({ success: true, active: { mode: 1 }, collected: true }),
      { headers: { "content-type": "application/json" } });
  };
  try {
    const client = await createApiClient({ baseUrl: "https://pbot.test", persistSession: false,
      minRequestIntervalMs: 200, session: { game: { accessToken: "test-token" } } });
    await client.business.all();
    pending.push(client.business.all(), client.business.all());
    const result = await __test.collectBusinessProfitAfterZarubaCheck(client, { throttle: false });
    assert.equal(result.response.data.collected, true);
    assert.deepEqual(endpoints.slice(0, 3), [
      "/api/player/business/all", "/api/zaruba/state", "/api/player/business/collect",
    ]);
  } finally {
    await Promise.allSettled(pending);
    global.fetch = original;
  }
});

test("automation records collection/read failures and retries on the next maintenance check", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../lib/ui-service.js"), "utf8");
  const tickSource = source.slice(source.indexOf("async function runPrisonAutomationTick("),
    source.indexOf("async function initializePrisonAutomation("));
  const collectSource = source.slice(source.indexOf("async function requestBusinessProfitCollection("),
    source.indexOf("async function collectBusinessProfitAfterZarubaCheck("));
  for (const failure of ["read", "collect"]) {
    let failing = true;
    let collectCalls = 0;
    const ok = (data) => ({ ok: true, status: 200, data });
    const client = { business: {
      all: async () => failure === "read" && failing ? { ok: false, status: 503, data: {} } : ok({
        lastCollectTime: "2026-01-01T00:00:00Z", playerBusinesses: [{ level: 1 }],
      }),
      collect: async () => {
        collectCalls++;
        return ok({ success: !failing, message: failing ? "Общак пока не готов" : "Собрано" });
      },
    } };
    const state = { enabled: false, autoCollectProfit: true, usePodogrev: false };
    const runtime = { running: false, tickCount: 0, lastMaintenanceCheckAt: 0 };
    const context = vm.createContext({
      runPrisonAutomationSerialized: (fn) => fn(),
      ensurePrisonAutomationLoaded: async () => state,
      prisonAutomationRuntime: runtime,
      withContext: async (_, fn) => fn({ client }),
      normalizeBusinessDashboard,
      getZarubaProfitCollectionGate: async () => ({ canCollect: true }),
      isSuccessfulGameResponse: (r) => r?.ok && r.data?.success !== false,
      getGameResponseMessage: (r) => r?.data?.message,
      getGamePayload: (r) => r.data,
      savePrisonAutomationState: async (s) => s,
      buildPrisonAutomationView: (s) => s,
    });
    vm.runInContext(collectSource + tickSource, context);
    const failed = await context.runPrisonAutomationTick({ forceMaintenance: true });
    assert.equal(failed.ok, false);
    assert.match(state.lastError.message, failure === "read" ? /проверить готовность/ : /Общак пока не готов/);
    assert.equal(runtime.running, false);
    assert.equal(collectCalls, failure === "read" ? 0 : 1);
    failing = false;
    const retry = await context.runPrisonAutomationTick({ forceMaintenance: true });
    assert.equal(retry.ok, true);
    assert.equal(retry.maintenance.profit.collected, true);
    assert.equal(state.lastError, null);
    assert.equal(runtime.running, false);
  }
});
