const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { normalizeBusinessDashboard } = require("../lib/prison-dashboard");
const { __test } = require("../lib/ui-service");
const { createApiClient } = require("../lib/api-client");

const ok = (data) => ({ ok: true, status: 200, data });
const config = { businessId: 1, prisonId: 1, title: "Кольщик", maxLevel: 8,
  rewardType: "Authority", rewardPerLevel: 15, baseUpgradeCost: 700, upgradeIncrement: 400 };
const catalog = (level = 0) => ({ businesses: [config, { ...config, prisonId: 2, title: "Другой бизнес" }],
  playerBusinesses: [{ businessId: 1, prisonId: 1, level }] });

test("businesses match ownership by both IDs and calculate first, next and maximum levels", () => {
  const items = normalizeBusinessDashboard(ok(catalog(3))).items;
  assert.deepEqual(items.map((item) => [item.level, item.upgradeCost, item.currentReward, item.nextReward]),
    [[3, 1900, 45, 60], [0, 700, 0, 15]]);
  const max = normalizeBusinessDashboard(catalog(8)).items[0];
  assert.equal(max.maxed, true);
  assert.equal(max.canUpgrade, false);
  assert.equal(max.upgradeCost, null);
  for (const missing of ["baseUpgradeCost", "maxLevel", "upgradeIncrement"]) {
    const data = catalog();
    data.businesses = [{ ...config, [missing]: undefined }];
    assert.equal(normalizeBusinessDashboard(data).items[0].canUpgrade, false);
  }
});

function fixture({ level = 0, rejected = false, failRefresh = false, receipt = true } = {}) {
  let calls = 0;
  const reads = [];
  const purchases = [];
  const client = { business: {
    all: async (options) => {
      reads.push(options);
      if (++calls > 1 && failRefresh) throw new Error("offline");
      return ok(catalog(level + purchases.length));
    },
    upgrade: async (...args) => {
      purchases.push(args);
      return ok({ success: !rejected, message: "Не хватает папирос", ...(receipt ? { newLevel: level + purchases.length } : {}) });
    },
  } };
  return { client, purchases, reads };
}

test("dry run previews cost without spending; real purchase refreshes income", async () => {
  const preview = fixture({ level: 3 });
  const result = await __test.upgradeBusinessWithClient(preview.client, { prisonId: 1, businessId: 1, dryRun: true });
  assert.equal(result.plan.cost, 1900);
  assert.equal(result.plan.newLevel, 4);
  assert.equal(preview.purchases.length, 0);
  const f = fixture();
  const bought = await __test.upgradeBusinessWithClient(f.client, { prisonId: 1, businessId: 1, expectedLevel: 0, expectedCost: 700 });
  assert.deepEqual(f.purchases, [[1, 1, { throttle: false }]]);
  assert.deepEqual(f.reads, [{ throttle: false }]);
  assert.equal(bought.business.items[0].level, 1);
  assert.equal(bought.business.expectedRewards.authority, 15);
});

test("invalid targets, stale levels/prices and maxed businesses never spend", async () => {
  for (const options of [
    { prisonId: 0 }, { prisonId: "1abc" }, { businessId: 999 }, { prisonId: 3 },
    { expectedLevel: 1 }, { expectedCost: 701 }, { expectedCost: null },
  ]) {
    const f = fixture();
    await assert.rejects(() => __test.upgradeBusinessWithClient(f.client,
      { prisonId: 1, businessId: 1, expectedLevel: 0, expectedCost: 700, ...options }));
    assert.equal(f.purchases.length, 0);
  }
  const f = fixture({ level: 8 });
  await assert.rejects(() => __test.upgradeBusinessWithClient(f.client, { prisonId: 1, businessId: 1, dryRun: true }), /максимума/);
  assert.equal(f.purchases.length, 0);
});

test("server rejection is reported, while a refresh failure preserves completed purchase", async () => {
  const options = { prisonId: 1, businessId: 1, expectedLevel: 0, expectedCost: 700 };
  const rejected = fixture({ rejected: true });
  await assert.rejects(() => __test.upgradeBusinessWithClient(rejected.client, options), /Не хватает папирос/);
  assert.equal(rejected.purchases.length, 1);
  const malformed = fixture();
  malformed.client.business.upgrade = async () => ok({});
  await assert.rejects(() => __test.upgradeBusinessWithClient(malformed.client, options), /отклонила/);
  const f = fixture({ failRefresh: true, receipt: false });
  const result = await __test.upgradeBusinessWithClient(f.client, options);
  assert.equal(result.success, true);
  assert.equal(result.business, null);
  assert.match(result.refreshError, /выкуплен/);
  assert.equal(f.purchases.length, 1);
  assert.deepEqual(f.reads, [{ throttle: false }, { throttle: false }]);
});

test("confirmed upgrades update price, max level and first ownership without rereading the catalogue", async () => {
  for (const level of [0, 3, 7]) {
    const f = fixture({ level, failRefresh: true });
    if (level === 0) f.client.business.all = async () => ok({ ...catalog(), playerBusinesses: [] });
    const result = await __test.upgradeBusinessWithClient(f.client,
      { prisonId: 1, businessId: 1, expectedLevel: level, expectedCost: 700 + level * 400 });
    const item = result.business.items[0];
    assert.equal(item.level, level + 1);
    assert.equal(item.maxed, level === 7);
    assert.equal(item.upgradeCost, level === 7 ? null : 700 + (level + 1) * 400);
    assert.equal(result.business.items[1].level, 0);
    assert.equal(result.business.expectedRewards.authority, (level + 1) * 15);
    assert.equal(result.refreshError, null);
  }
});

test("manual business requests overtake queued background polling", async () => {
  const original = global.fetch;
  const endpoints = [];
  const pending = [];
  global.fetch = async (url) => {
    endpoints.push(new URL(url).pathname);
    return new Response(JSON.stringify({ success: true, newLevel: 1 }), { headers: { "content-type": "application/json" } });
  };
  try {
    const client = await createApiClient({ baseUrl: "https://pbot.test", persistSession: false,
      minRequestIntervalMs: 200, session: { game: { accessToken: "test-token" } } });
    await client.zaruba.state();
    pending.push(client.zaruba.state(), client.zaruba.state());
    await client.business.all({ throttle: false });
    await client.business.upgrade(1, 1, { throttle: false });
    assert.deepEqual(endpoints.slice(0, 3), ["/api/zaruba/state", "/api/player/business/all", "/api/player/business/upgrade"]);
  } finally {
    await Promise.allSettled(pending);
    global.fetch = original;
  }
});

test("upgrade sends the game query parameters with POST and does not retry rejection", async () => {
  const original = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response(JSON.stringify({ success: false }), { status: 429, headers: { "content-type": "application/json" } });
  };
  try {
    const client = await createApiClient({ baseUrl: "https://pbot.test", persistSession: false,
      minRequestIntervalMs: 0, session: { game: { accessToken: "test-token" } } });
    await client.business.upgrade(3, 2);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.method, "POST");
    assert.equal(calls[0].url.pathname, "/api/player/business/upgrade");
    assert.equal(calls[0].url.searchParams.get("businessId"), "3");
    assert.equal(calls[0].url.searchParams.get("prisonId"), "2");
  } finally { global.fetch = original; }
});

test("UI switches businesses with the prison, hides for masters and blocks repeat clicks", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../../ui/app.js"), "utf8");
  const nodes = Object.fromEntries(["prison-business-panel", "prison-business-title", "prison-business-feedback", "prison-business-list",
    "prison-target-type", "prison-select"].map((id) => [`#${id}`, {}]));
  nodes["#prison-target-type"].value = "prison";
  nodes["#prison-select"].value = "1";
  const state = { prisonDashboard: { prisons: [{ id: 1, name: "Первая" }, { id: 2, name: "Вторая" }], business: normalizeBusinessDashboard(catalog()) } };
  let calls = 0;
  let resolvePurchase;
  let rejectBalance;
  const context = { state, $: (id) => nodes[id], escapeHtml: (v) => String(v), formatNumber: String, prisonRewardLabel: String,
    appendLog() {}, appendDiagnosticError() {}, updatePrisonBusinessCountdown() {},
    handleEconomyRefresh: () => new Promise((_, reject) => { rejectBalance = reject; }),
    apiRequest: async () => { calls++; return new Promise((resolve) => { resolvePurchase = resolve; }); } };
  vm.runInNewContext(source.slice(source.indexOf("function renderPrisonBusinesses("), source.indexOf("function startPrisonCountdownTicker(")), context);
  context.renderPrisonBusinesses();
  assert.match(nodes["#prison-business-list"].innerHTML, /Кольщик/);
  assert.doesNotMatch(nodes["#prison-business-list"].innerHTML, /Другой бизнес/);
  nodes["#prison-select"].value = "2";
  context.renderPrisonBusinesses();
  assert.match(nodes["#prison-business-list"].innerHTML, /Другой бизнес/);
  nodes["#prison-target-type"].value = "master";
  context.renderPrisonBusinesses();
  assert.equal(nodes["#prison-business-panel"].hidden, true);
  nodes["#prison-target-type"].value = "prison";
  const event = { target: { closest: () => ({ dataset: { businessUpgrade: "1", prisonId: "1" } }) } };
  const pending = context.handlePrisonBusinessUpgrade(event);
  await context.handlePrisonBusinessUpgrade(event);
  assert.equal(calls, 1);
  resolvePurchase({ business: normalizeBusinessDashboard(catalog(1)), plan: { newLevel: 1, cost: 700 } });
  const completed = await Promise.race([pending.then(() => true), new Promise((resolve) => setImmediate(() => resolve(false)))]);
  assert.equal(completed, true, "purchase buttons must be released even while balance refresh is pending");
  assert.equal(state.prisonBusinessBusy, false);
  assert.equal(state.prisonBusinessNeedsRefresh, false);
  assert.match(state.prisonBusinessMessage, /выкуплен уровень 1/);
  rejectBalance(new Error("balance offline"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.prisonBusinessNeedsRefresh, false);
  assert.match(state.prisonBusinessMessage, /выкуплен уровень 1/);
});
