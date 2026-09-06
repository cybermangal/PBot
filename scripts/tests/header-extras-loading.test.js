const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function backend(client) {
  const source = fs.readFileSync(path.join(__dirname, "../lib/ui-service.js"), "utf8");
  const context = {
    withContext: async (_, callback) => callback({ client, selfUserId: "test" }),
    headerExtrasCache: new Map(), HEADER_EXTRAS_CACHE_TTL_MS: 300000,
    HEADER_ACHIEVEMENT_TYPE: 1,
    toBool: (value) => value === true,
    createDamageReport: async (_, options) => ({ period: options.period }),
    normalizeDamageHeaderSummary: (value) => value,
    normalizeAchievementHeaderSummary: (value) => value,
    normalizeStashGearHeaderSummary: (value) => value,
    normalizeVpiHeaderSummary: (value) => value,
  };
  vm.runInNewContext(source.slice(source.indexOf("async function getHeaderExtras("),
    source.indexOf("async function loadFreshPrisonEnergyCosts(")), context);
  return context;
}

test("damage and stash are available while another header section is pending", async () => {
  const slow = deferred();
  const context = backend({ get: async () => ({ coolnessTotal: 42 }), vpi: { state: () => slow.promise } });
  const pending = context.getHeaderExtras({ section: "vpi" });
  const damage = await context.getHeaderExtras({ section: "damage" });
  const stash = await context.getHeaderExtras({ section: "stashGear" });
  assert.equal(damage.damage.weekly.period, "weekly");
  assert.equal(stash.stashGear.coolnessTotal, 42);
  slow.resolve({ active: true });
  await pending;
});

test("simultaneous requests share one fetch and successful values are cached", async () => {
  const slow = deferred();
  let calls = 0;
  const context = backend({ get: () => { calls++; return slow.promise; } });
  const first = context.getHeaderExtras({ section: "stashGear" });
  const second = context.getHeaderExtras({ section: "stashGear", force: true });
  assert.equal(calls, 1);
  slow.resolve({ coolnessTotal: 42 });
  await Promise.all([first, second]);
  await context.getHeaderExtras({ section: "stashGear" });
  assert.equal(calls, 1);
});

test("failed refresh retains the value and retries without waiting for the cache TTL", async () => {
  let calls = 0;
  const context = backend({ get: async () => {
    calls++;
    if (calls === 2) throw new Error("offline");
    return { coolnessTotal: calls === 1 ? 42 : 43 };
  } });
  await context.getHeaderExtras({ section: "stashGear" });
  const stale = await context.getHeaderExtras({ section: "stashGear", force: true });
  assert.equal(stale.stale, true);
  assert.equal(stale.stashGear.coolnessTotal, 42);
  const fresh = await context.getHeaderExtras({ section: "stashGear" });
  assert.equal(fresh.stashGear.coolnessTotal, 43);
  assert.equal(fresh.stale, false);
});

test("UI renders ready sections before slow ones and preserves previous values on failure", async () => {
  const source = fs.readFileSync(path.join(__dirname, "../../ui/app.js"), "utf8");
  const requests = Object.fromEntries(["damage", "achievements", "stashGear", "vpi"].map((key) => [key, deferred()]));
  const rendered = [];
  const state = { headerExtrasRefreshRunning: false, headerExtras: { stashGear: { coolnessTotal: 42 } } };
  const context = {
    state,
    apiRequest: (_, url) => requests[new URL(url, "http://localhost").searchParams.get("section")].promise,
    renderHeaderExtras: (payload) => { state.headerExtras = payload; rendered.push(payload); },
  };
  vm.runInNewContext(source.slice(source.indexOf("async function handleHeaderExtrasRefresh("),
    source.indexOf("function startHeaderExtrasSync(")), context);
  const running = context.handleHeaderExtrasRefresh();
  requests.damage.resolve({ damage: { weekly: { available: true } } });
  await new Promise(setImmediate);
  assert.equal(rendered.length, 1);
  assert.equal(state.headerExtras.damage.weekly.available, true);
  requests.stashGear.resolve({ stashGear: null, stale: true });
  requests.achievements.resolve({ achievements: { unlockedReward: 7 } });
  requests.vpi.resolve({ vpi: { active: true } });
  await running;
  assert.equal(state.headerExtras.stashGear.coolnessTotal, 42);
  assert.equal(state.headerExtras.achievements.unlockedReward, 7);
  assert.equal(state.headerExtras.damage.weekly.available, true);
});
