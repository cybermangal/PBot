const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const dashboard = require("../lib/misc-dashboard");

const ok = (data) => ({ ok: true, status: 200, data });

function inventory() {
  return ok({
    collections: [{ prisonid: 1, collections: [
      { id: 7, name: "Большой запас", items: [{ id: 1 }, { id: 2 }] },
      { id: 8, name: "Второй комплект", items: [{ id: 1 }, { id: 2 }] },
      { id: 9, name: "Неполный", items: [{ id: 1 }, { id: 2 }] },
    ] }],
    playerProgress: { data: { 1: {
      7: { items: { 1: 10000, 2: 15000 } },
      8: { items: { 1: 20, 2: 30 } },
      9: { items: { 1: 100, 2: 0 } },
    } } },
  });
}

function fixture({ full = inventory, vparit = async () => ok({ success: true }) } = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../lib/ui-service.js"), "utf8");
  const calls = [];
  let snapshots = 0;
  let saved;
  let invalidated = false;
  const context = {
    ...dashboard,
    getGamePayload: (response) => response.data,
    path,
    MISC_VPARIT_LATEST_PATH: "test-result.json",
    fs: { mkdir: async () => {}, writeFile: async (_, value) => { saved = JSON.parse(value); } },
    invalidateMiscDashboardCache: () => {
      assert.equal(context.miscVparitRuntime.running, true);
      invalidated = true;
    },
  };
  vm.runInNewContext(source.match(/const VPARIT_RATE_LIMIT_RETRIES = \d+;/)[0], context);
  vm.runInNewContext(source.slice(source.indexOf("const miscVparitRuntime = {"),
    source.indexOf("const damageHistoryRuntime = {")) + "\nglobalThis.miscVparitRuntime = miscVparitRuntime;", context);
  vm.runInNewContext(source.slice(source.indexOf("function isSuccessfulGameResponse("),
    source.indexOf("function normalizeWearableInventoryResponse(")), context);
  vm.runInNewContext(source.slice(source.indexOf("function buildVparitRuntimeView("),
    source.indexOf("function unwrapMiniGamePayload(")), context);
  const client = {
    collection: { full, vparit: async (payload, options) => {
      calls.push({ payload, options });
      return vparit(payload, options);
    } },
    players: { init: async () => ok({
      authority: ++snapshots === 1 ? 100 : 150,
      currencies: { cigarettes: snapshots === 1 ? 200 : 300 },
    }) },
  };
  return { context, calls, run: async () => {
    await context.executeVparitAll(client, 123);
    assert.equal(invalidated, true);
    assert.equal(context.getVparitStatus().running, false);
    return saved;
  } };
}

test("one request per ready collection regardless of copy count, without fixed sleeps", async () => {
  const f = fixture();
  const result = await f.run();
  assert.deepEqual(f.calls.map(({ payload }) => [payload.userId, payload.prisonId, payload.collectionId]),
    [[123, 1, 7], [123, 1, 8]]);
  assert.ok(f.calls.every(({ options }) => options.throttle === false && options.rateLimitRetries === 2));
  assert.equal(result.planned, 2);
  assert.equal(result.processed, 2);
  assert.equal(result.sold, 2);
  assert.equal(result.failed, 0);
  assert.equal(result.error, null);
  assert.equal(result.rewardsMeasured, true);
  assert.deepEqual(result.rewards, { cigarettes: 100 });
  assert.equal(result.authority, 50);
  assert.equal(f.context.getVparitStatus().remaining, 0);
});

test("a rejected collection is not retried for its remaining copies", async () => {
  const f = fixture({ vparit: async ({ collectionId }) => collectionId === 7
    ? ok({ success: false, message: "Коллекция не собрана" }) : ok({ success: true }) });
  const result = await f.run();
  assert.equal(f.calls.length, 2);
  assert.equal(result.sold, 1);
  assert.equal(result.failed, 1);
  assert.equal(result.failures[0].message, "Коллекция не собрана");
  assert.equal(f.context.getVparitStatus().phase, "failed");
});

for (const status of [401, 403, 429, 503]) {
  test(`HTTP ${status} stops the queue instead of flooding every collection`, async () => {
    const f = fixture({ vparit: async () => ({
      ok: false, status, rateLimitRetries: status === 429 ? 2 : 0, data: { message: "Сервер отклонил запрос" },
    }) });
    const result = await f.run();
    assert.equal(f.calls.length, 1);
    assert.equal(result.planned, 2);
    assert.equal(result.processed, 1);
    assert.equal(result.error, "Сервер отклонил запрос");
    assert.equal(result.rateLimitRetries, status === 429 ? 2 : 0);
    assert.equal(f.context.getVparitStatus().remaining, 1);
  });
}

test("inventory loading failure is reported instead of a successful empty run", async () => {
  const f = fixture({ full: async () => ({ ok: false, status: 503, data: {} }) });
  const result = await f.run();
  assert.equal(f.calls.length, 0);
  assert.match(result.error, /Не удалось загрузить нычки: HTTP 503/);
});

test("empty inventory does not submit a sale", async () => {
  const f = fixture({ full: async () => ok({ collections: [] }) });
  const result = await f.run();
  assert.equal(f.calls.length, 0);
  assert.equal(result.planned, 0);
  assert.equal(result.error, null);
});

test("UI shows collection rejection messages even without a fatal error", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../ui/app.js"), "utf8");
  const nodes = new Map();
  const context = {
    $: (selector) => {
      if (!nodes.has(selector)) nodes.set(selector, { setAttribute() {} });
      return nodes.get(selector);
    },
    renderStatGrid() {}, formatNumber: String, escapeHtml: String,
    formatCurrencyAmounts: () => "ничего", buildBadge: (label) => label,
  };
  vm.runInNewContext(source.slice(source.indexOf("function renderMiscStashes("),
    source.indexOf("function unwrapMiniGameData(")), context);
  context.renderMiscStashes({}, { lastResult: {
    sold: 1, failed: 1, error: null, failures: [{ message: "Коллекция не собрана" }],
  } });
  const html = nodes.get("#misc-vparit-status").innerHTML;
  assert.match(html, /is-failed/);
  assert.match(html, /Впаривание завершено с ошибками/);
  assert.match(html, /Коллекция не собрана/);
});
