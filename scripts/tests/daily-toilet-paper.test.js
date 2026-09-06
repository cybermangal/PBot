const test = require("node:test");
const assert = require("node:assert/strict");
const { createDailyToiletPaperCollector } = require("../lib/daily-toilet-paper");
const settle = () => new Promise((resolve) => setImmediate(resolve));
function memoryStore() {
  let state = { claimedDates: {} };
  return {
    load: async () => structuredClone(state),
    save: async (value) => { state = structuredClone(value); },
  };
}

test("collects on startup and account switch, and retries periodically after failure", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const calls = [];
  let fail = true;
  const collector = createDailyToiletPaperCollector({
    store: memoryStore(),
    withContext: async (sessionPath, callback) => {
      if (fail) throw new Error("No active session");
      return callback({ selfUserId: sessionPath, client: { post: async (url, options) => {
        calls.push({ sessionPath, url, options });
        return { ok: true };
      } } });
    },
  });
  t.after(() => collector.stop());
  collector.initialize("first");
  await settle();
  fail = false;
  t.mock.timers.tick(15 * 60 * 1000);
  await settle();
  collector.onLogin("second");
  await settle();
  assert.deepEqual(calls.map((call) => call.sessionPath), ["first", "second"]);
  for (const call of calls) {
    assert.equal(call.url, "/api/daily/toilet-paper");
    assert.deepEqual(call.options, { json: {}, rateLimitRetries: 0 });
  }
});

test("account switch during a claim waits and then collects for the new session", async (t) => {
  const sessions = [];
  let release;
  const collector = createDailyToiletPaperCollector({
    store: memoryStore(),
    withContext: async (sessionPath) => {
      sessions.push(sessionPath);
      if (sessions.length === 1) await new Promise((resolve) => { release = resolve; });
    },
  });
  t.after(() => collector.stop());
  collector.initialize("first");
  await settle();
  collector.onLogin("second");
  collector.onLogin("second");
  assert.deepEqual(sessions, ["first"]);
  release();
  await settle();
  assert.deepEqual(sessions, ["first", "second"]);
});

test("successful claim is skipped until next Moscow day across ticks, switches and restart", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const store = memoryStore();
  let date = new Date("2026-09-06T20:00:00Z");
  const calls = [];
  const options = {
    store,
    now: () => date,
    withContext: async (account, callback) => callback({
      selfUserId: account,
      client: { post: async () => {
        calls.push(account);
        return { ok: true, status: 200, data: { success: true, amount: 1 } };
      } },
    }),
  };
  const collector = createDailyToiletPaperCollector(options);
  t.after(() => collector.stop());
  collector.initialize("first");
  await settle();
  t.mock.timers.tick(15 * 60 * 1000);
  await settle();
  collector.onLogin("second");
  await settle();
  collector.onLogin("first");
  await settle();
  assert.deepEqual(calls, ["first", "second"]);
  collector.stop();
  const restarted = createDailyToiletPaperCollector(options);
  t.after(() => restarted.stop());
  restarted.initialize("first");
  await settle();
  assert.deepEqual(calls, ["first", "second"]);
  date = new Date("2026-09-06T21:00:01Z");
  t.mock.timers.tick(15 * 60 * 1000);
  await settle();
  assert.deepEqual(calls, ["first", "second", "first"]);
});

test("unsuccessful HTTP and game responses do not mark the day claimed", async (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  const responses = [
    { ok: false, status: 500 },
    { ok: true, data: { success: false } },
    { ok: true, data: { ok: false } },
    { ok: true, data: { success: true } },
  ];
  let requests = 0;
  const collector = createDailyToiletPaperCollector({
    store: memoryStore(),
    withContext: async (_path, callback) => callback({
      selfUserId: "123",
      client: { post: async () => responses[requests++] },
    }),
  });
  t.after(() => collector.stop());
  collector.initialize();
  await settle();
  for (let tick = 0; tick < 5; tick += 1) {
    t.mock.timers.tick(15 * 60 * 1000);
    await settle();
  }
  assert.equal(requests, 4);
});
