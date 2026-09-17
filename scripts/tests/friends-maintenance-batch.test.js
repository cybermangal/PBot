const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { __test: service } = require("../lib/ui-service");
const maintenance = require("../lib/friends-maintenance");
const batch = { update() {}, setPlan() {}, completeTarget() {} };
const pause = () => new Promise((resolve) => setImmediate(resolve));

// Run the real orchestration functions with an injected client and in-memory
// progress. These tests cannot load an account or send a game request.
function operation(name, client) {
  const source = fs.readFileSync(require.resolve("../lib/ui-service"), "utf8");
  const start = source.indexOf("async function " + name + "(");
  const rest = source.slice(start);
  const end = rest.slice(1).search(/\n(?:async )?function /) + 1;
  const context = {
    ...maintenance, ...service,
    normalizeFriendCriteriaOptions: maintenance.normalizeCriteriaOptions,
    serializeFriendCriteria: maintenance.serializeCriteria,
    runFriendsBatchSerialized: async (_, fn) => fn(batch),
    withContext: async (_, fn) => fn({ client, selfUserId: "99999" }),
    INTERACTION_TYPES: new Set(["UpgradeBiceps", "Harknut", "Fight", "TossDroj"]),
    ONE_PER_DAY_INTERACTION_TYPES: new Set(["UpgradeBiceps", "Harknut", "TossDroj"]),
    readInteractionProgress: async () => service.normalizeInteractionProgress({}),
    saveInteractionProgress: async () => {},
    isInteractionResponseSuccessful: (r) => r.ok && r.data?.success !== false,
    isSuccessfulGameResponse: (r) => r?.ok && r.data?.success !== false,
    isAlreadyPerformedInteractionResponse: () => false,
    markCompletedInteraction: (progress, type, id) => { progress.completedByType[type].push(id); return true; },
  };
  vm.createContext(context);
  vm.runInContext(rest.slice(0, end) + "\nthis.run = " + name, context);
  return (options) => context.run(options);
}

test("50 friends do not cap 1000 targets from a 10000-player ranking; dry run sends no actions", async () => {
  let reads = 0;
  const client = {
    weekly: { top: async (limit) => {
      reads++;
      assert.equal(limit, 10000);
      return { ok: true, data: { top: Array.from({ length: 10000 }, (_, i) => ({ userId: String(i + 1), damage: i + 1 })) } };
    } },
    friends: { list: async () => { throw new Error("Unnecessary friend read"); }, profiles: async () => { throw new Error("Unnecessary profile read"); } },
    interactions: { perform: async () => { throw new Error("Dry run must not send POST"); } },
  };
  const negative = await operation("runFriendsAction", client)({ type: "Harknut", max: 1000, dryRun: true });
  const positive = await operation("runFriendsAction", client)({ type: "UpgradeBiceps", max: 1000, dryRun: true });
  assert.equal(negative.selectedTotal, 1000);
  assert.equal(negative.targets[0].userId, "1");
  assert.equal(positive.targets[0].userId, "10000");
  assert.equal(positive.targets[999].userId, "9001");
  assert.equal(reads, 2);
});

test("damage selection deduplicates, skips self and completed daily targets and reports shortage", () => {
  const progress = service.normalizeInteractionProgress({});
  progress.completedByType.Harknut.push("2");
  const rows = [1, 2, 3, 3, 4].map((id) => ({ userId: String(id), weeklyDamage: id === 4 ? null : id }));
  const result = service.selectDamageInteractionTargets(rows, { max: 10 }, "1", "Harknut", progress);
  assert.deepEqual(result.targets.map((row) => row.userId), ["3"]);
  assert.equal(result.selection.shortfall, 9);
  assert.equal(service.selectDamageInteractionTargets(rows, {}, "1", "Fight", progress).targets.length, 2);
});

test("4500-friend cleanup stops personal-file reads at the removal limit with at most four in flight", async () => {
  let active = 0, peak = 0, reads = 0;
  const candidates = Array.from({ length: 4500 }, (_, i) => ({ userId: String(i + 1) }));
  const client = { friends: { achievementSummary: async () => {
    reads++; active++; peak = Math.max(peak, active); await pause(); active--;
    return { ok: true, data: { overview: { talentPointsTotal: 10 } } };
  } } };
  const criteria = service.normalizeFriendCleanupCriteria({ minTalents: 50 });
  const enriched = await service.attachTalentPointsTotals(client, candidates, batch, criteria, 50);
  assert.equal(reads, 52);
  assert.equal(peak, 4);
  assert.equal(enriched.unchecked, 4448);
  assert.equal(service.selectFriendCleanupTargets(enriched.candidates, criteria, 50).targets.length, 50);
});

test("damage failures skip talent reads and incoming missing talents use the personal file", async () => {
  let reads = 0;
  const client = { friends: { achievementSummary: async () => { reads++; return { ok: true, data: { overview: { talentPointsTotal: 50 } } }; } } };
  const criteria = maintenance.normalizeCriteriaOptions({ minTalents: 50, minWeeklyDamage: 100 });
  const enriched = await service.attachTalentPointsTotals(client, [
    { userId: "1", talentsCount: null, weeklyDamage: 10 },
    { userId: "2", talentsCount: null, weeklyDamage: 100 },
    { userId: "3", talentsCount: 70, weeklyDamage: 100 },
  ], batch, criteria);
  assert.equal(reads, 1);
  const plan = service.buildIncomingFriendRequestPlan(enriched.candidates, criteria, null);
  assert.deepEqual(plan.acceptedTargets.map((x) => x.userId), ["2", "3"]);
  assert.deepEqual(plan.rejectedTargets.map((x) => x.userId), ["1"]);
});

test("missing ranking entries and null talent totals are unknown, with inclusive minimum damage", () => {
  const criteria = maintenance.normalizeCriteriaOptions({ minWeeklyDamage: 100 });
  const rows = maintenance.attachWeeklyDamage([{ userId: "1", weeklyDamage: 0 }], new Map());
  assert.equal(maintenance.evaluateFriendCriteria(rows[0], criteria).unknown.length, 1);
  assert.equal(maintenance.evaluateFriendCriteria({ weeklyDamage: 100 }, criteria).passed, true);
  assert.equal(service.extractTalentPointsTotal({ overview: { talentPointsTotal: null } }), null);
});

test("failed or malformed ranking never turns into zero-damage players", async () => {
  for (const response of [{ ok: false, status: 500 }, { ok: true, data: { success: false } }, { ok: true, data: {} }]) {
    await assert.rejects(maintenance.loadWeeklyDamageMap({ weekly: { top: async () => response } }));
  }
});

test("incoming pagination handles a server page-size cap, outgoing-only pages and duplicate pages", async () => {
  const pages = [
    [{ userId: "1", isIncoming: "false" }],
    [{ userId: "2", isIncoming: true }],
    [{ userId: "3", isIncoming: true }],
  ];
  let reads = 0;
  const client = { friends: { requests: async ({ page }) => { reads++; return { ok: true, data: { data: { requests: pages[Math.min(page, 2)] } } }; } } };
  const result = await service.loadIncomingFriendRequestCandidates(client, { max: 1000 }, "999", batch, maintenance.normalizeCriteriaOptions({}));
  assert.deepEqual(result.map((x) => x.userId), ["2", "3"]);
  assert.equal(reads, 4);
});

test("batch writes are bounded, maintain result order and stop after throttling", async () => {
  let active = 0, peak = 0;
  const called = [];
  const result = await service.runFriendTargetBatch([1, 2, 3, 4, 5], {}, async (id) => {
    active++; peak = Math.max(peak, active); called.push(id); await pause(); active--;
    return { id, ok: id !== 2, status: id === 2 ? 429 : 200 };
  });
  assert.equal(peak, 3);
  assert.deepEqual(called, [1, 2, 3]);
  assert.deepEqual(result.map((x) => x.id), [1, 2, 3]);
});

test("stop-on-error dispatches exactly one failing action and waits for all in-flight work on exceptions", async () => {
  let count = 0;
  await service.runFriendTargetBatch([1, 2, 3], { continueOnError: false }, async () => { count++; return { ok: false }; });
  assert.equal(count, 1);
  let settled = 0, flushed = 0;
  await assert.rejects(service.runFriendTargetBatch([1, 2, 3, 4], { onChunk: async () => { flushed++; } }, async (id) => {
    if (id === 1) throw new Error("transport");
    await pause(); settled++; return { ok: true };
  }), /transport/);
  assert.equal(settled, 2);
  assert.equal(flushed, 1);
});

test("cleanup and incoming dry runs use real plans without any mutations", async () => {
  const client = { friends: {
    profiles: async (page) => ({ ok: true, data: page === 0 ? [{ userId: "1", talentsCount: 10 }] : [] }),
    requests: async ({ page }) => ({ ok: true, data: page === 0 ? [{ userId: "1", talentsCount: 10 }] : [] }),
    achievementSummary: async () => ({ ok: true, data: { overview: { talentPointsTotal: 10 } } }),
    remove: async () => { throw new Error("Unexpected mutation"); },
    acceptRequest: async () => { throw new Error("Unexpected mutation"); },
    declineRequest: async () => { throw new Error("Unexpected mutation"); },
  } };
  const cleanup = await operation("cleanupFriends", client)({ minTalents: 50, max: 50, dryRun: true });
  const incoming = await operation("acceptFriendRequests", client)({ minTalents: 50, max: 50, dryRun: true });
  assert.equal(cleanup.selectedTotal, 1);
  assert.equal(incoming.declinedCount, 1);
});
