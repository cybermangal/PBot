const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { normalizeZarubaPolicy, normalizeMonthlyPolicy, zarubaTaskPolicy } = require("../lib/quest-policy");
const { normalizeMonthlyDashboard } = require("../lib/misc-dashboard");
const { createProPrisonFeatureService, normalizeZarubaAutomation } = require("../lib/pro-prison-features");
const { getMoscowDateKey } = require("../lib/automation-state");
const { selectZarubaDamageWeapon, classifyZarubaTask, zarubaRunKey } = require("../lib/pro-prison-features");
const { __test } = require("../lib/ui-service");

const response = (data) => ({ ok: true, status: 200, data });
function fixture(t, tasks = [], dependencies = {}, state = {}) {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-quest-policy-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  const client = { zaruba: { state: async () => response({ active: { tasks }, ...state }) } };
  const options = { stateDir, withContext: async (_path, callback) => callback({ client, selfUserId: "1" }), ...dependencies };
  return { service: createProPrisonFeatureService(options), options, client };
}

test("absent quest settings preserve the established workflow and do not autoqueue bosses", () => {
  const zaruba = normalizeZarubaPolicy();
  assert.equal(zaruba.wheelBuyTickets, true);
  assert.equal(zaruba.wheelRublesDailyLimit, null);
  assert.equal(zaruba.queueBosses, false);
  assert.equal(zaruba.queuePrisons, true);
  assert.equal(zaruba.playKatala, true);
  const monthly = normalizeMonthlyPolicy();
  assert.equal(monthly.queueBosses, true);
  assert.equal(monthly.queueMasterSessions, false);
  assert.equal(monthly.intellectMasterId, 1);
});

test("boss rules enforce their cap, with an implicit uncapped pacansky fallback", () => {
  const policy = normalizeZarubaPolicy({ queueBosses: true, bossRules: [{ bossId: 7, objective: "damage", maxWeaponValue: 5 }] });
  const task = { kind: "boss", targetId: 7, objective: "damage", execution: { priceRubles: 5 } };
  assert.equal(zarubaTaskPolicy(task, policy).allowed, true);
  assert.equal(zarubaTaskPolicy({ ...task, execution: { priceRubles: 6 } }, policy).allowed, false);
  assert.equal(zarubaTaskPolicy({ ...task, execution: {} }, policy).allowed, false);
  assert.equal(zarubaTaskPolicy({ ...task, targetId: 8 }, policy).rule.mode, "pacansky");
  const fallback = zarubaTaskPolicy(task, normalizeZarubaPolicy({ queueBosses: true }));
  assert.equal(fallback.allowed, true);
  assert.equal(fallback.rule.mode, "pacansky");
  assert.equal(fallback.rule.maxWeaponValue, null);
});

test("boss autoqueue is opt-in, carries its rule and leaves dry-run without mutations", async (t) => {
  const queued = [];
  const { service } = fixture(t, [{ taskId: "b", type: 5, bossId: 7, requiredAmount: 1 }], {
    enqueueZarubaTask: async (task, metadata) => { queued.push({ task, metadata }); return { queued: true }; },
  });
  await service.updateZarubaAutomation({ enabled: true, queueBosses: true, bossRules: [{ bossId: 7, objective: "kill", mode: "odin" }] });
  const preview = await service.runZarubaAutomationTick({ dryRun: true });
  assert.equal(preview.action.count, 1);
  assert.equal(queued.length, 0);
  await service.runZarubaAutomationTick({ dryRun: false });
  assert.equal(queued.length, 1);
  assert.equal(queued[0].metadata.bossRule.mode, "odin");
  assert.equal(queued[0].metadata.insertPosition, "back");
});

test("disabled direct categories do not prevent enabled prison work", async (t) => {
  const queued = [];
  const { service } = fixture(t, [
    { taskId: "stash", type: 1, requiredAmount: 1 },
    { taskId: "prison", type: 4, prisonId: 1 },
  ], {
    executeZarubaDirectTask: async () => { throw new Error("disabled direct action called"); },
    enqueueZarubaTask: async (task) => { queued.push(task.taskId); return { queued: true }; },
  });
  await service.updateZarubaAutomation({ enabled: true, directTasks: false });
  await service.runZarubaAutomationTick({ dryRun: false });
  assert.deepEqual(queued, ["prison"]);
});

test("unavailable direct tasks back off and allow other queue tasks on the next tick", async (t) => {
  let attempts = 0;
  const queued = [];
  const { service } = fixture(t, [
    { taskId: "stash", type: 1, requiredAmount: 1 },
    { taskId: "prison", type: 4, prisonId: 1 },
  ], {
    executeZarubaDirectTask: async () => { attempts++; return { executed: false, reason: "no_duplicate_stashes" }; },
    enqueueZarubaTask: async (task) => { queued.push(task.taskId); return { queued: true }; },
  });
  await service.updateZarubaAutomation({ enabled: true });
  await service.runZarubaAutomationTick({ dryRun: false });
  await service.runZarubaAutomationTick({ dryRun: false });
  assert.equal(attempts, 1);
  assert.deepEqual(queued, ["prison"]);
});

test("level limit stops new starts without disabling active work", async (t) => {
  const { service } = fixture(t, [], {}, { active: null, progress: { level: 20 } });
  await service.updateZarubaAutomation({ enabled: true, autoStart: true, selectedMode: "1", maxLevel: 20 });
  const result = await service.runZarubaAutomationTick({ dryRun: false });
  assert.equal(result.action.reason, "max_level_reached");
  assert.equal(result.automation.enabled, true);
});

test("disabled reward collection waits instead of starting over pending rewards", async (t) => {
  const { service } = fixture(t, [], {}, { active: null, pendingReward: { ready: true } });
  await service.updateZarubaAutomation({ enabled: true, autoStart: true, selectedMode: "1", claimRewards: false });
  const result = await service.runZarubaAutomationTick({ dryRun: false });
  assert.equal(result.action.reason, "reward_claim_disabled");
});

test("reaching the level limit during a reward claim does not start the next Zaruba", async (t) => {
  const { service, client } = fixture(t);
  let claimed = false;
  client.zaruba.state = async () => response({
    modes: [{ id: 1, unlocked: true }],
    progress: { level: claimed ? 20 : 19 },
    active: claimed ? null : { finishedSuccess: true, tasks: [{ taskId: "done", type: 2, requiredAmount: 10, currentAmount: 10 }] },
    pendingReward: claimed ? null : { mode: 1, success: true },
  });
  client.zaruba.claim = async () => { claimed = true; return response({ claimed: true }); };
  client.zaruba.start = async () => { throw new Error("must not start at the level cap"); };
  await service.updateZarubaAutomation({ enabled: true, autoStart: true, selectedMode: "1", maxLevel: 20 });
  const result = await service.runZarubaAutomationTick({ dryRun: false });
  assert.equal(result.action.type, "claim");
  assert.equal(claimed, true);
  assert.equal(result.action.nextStart, null);
});

test("wheel budget reservations are atomic, survive restart and reset by Moscow day", async (t) => {
  let reservations;
  const { service, options, client } = fixture(t, [{ taskId: "wheel", type: 14, requiredAmount: 3 }], {
    executeZarubaDirectTask: async (_task, options) => {
      reservations = await Promise.all([options.reserveWheelTicket(), options.reserveWheelTicket()]);
      throw new Error("uncertain payment response");
    },
  });
  client.get = async () => response({ tickets: 0, rubles: 100 });
  await service.updateZarubaAutomation({ enabled: true, wheelRublesDailyLimit: 15 });
  await service.runZarubaAutomationTick({ dryRun: true });
  assert.equal((await service.getZarubaAutomation()).wheelRublesCommitted, 0);
  await service.runZarubaAutomationTick({ dryRun: false });
  assert.equal(reservations.filter((item) => item.allowed).length, 1);
  const restored = await createProPrisonFeatureService(options).getZarubaAutomation();
  assert.equal(restored.wheelRublesCommitted, 10);
  assert.equal(normalizeZarubaAutomation({ ...restored, dayKey: "2000-01-01" }).wheelRublesCommitted, 0);
  assert.equal(normalizeZarubaAutomation({ ...restored, dayKey: getMoscowDateKey() }).wheelRublesCommitted, 10);
});

test("wheel purchase toggle still permits owned tickets but never calls a paid task without tickets", async (t) => {
  const { service, client } = fixture(t, [{ taskId: "wheel", type: 14, requiredAmount: 1 }]);
  client.get = async () => response({ tickets: 0, rubles: 100 });
  await service.updateZarubaAutomation({ enabled: true, wheelBuyTickets: false });
  assert.equal((await service.getZarubaDashboard()).tasks[0].execution.canAct, false);
  client.get = async () => response({ tickets: 1, rubles: 0 });
  assert.equal((await service.getZarubaDashboard()).tasks[0].execution.canAct, true);
});

function monthlyResponse(action = "MasterEarnIntellect", context = {}) {
  return response({ active: true,
    global: { year: 2026, month: 9, days: [{ dayId: 5, action, context, target: 4 }] },
    user: { activeDayId: 5, days: { 5: { progress: 1, completed: false } } },
  });
}

test("monthly target choice is consistent between dashboard, estimates and actual execution", async () => {
  const policy = normalizeMonthlyPolicy({ intellectMasterId: 9, authorityPrisonId: 6 });
  const source = monthlyResponse();
  const dashboard = normalizeMonthlyDashboard(source, policy);
  assert.equal(dashboard.today.context.masterId, 9);
  assert.deepEqual(__test.collectMonthlyEnergyRequirements(source, policy).masterIds, [9]);
  const calls = [];
  await __test.executeMonthlyCheapAction({
    players: { init: async () => response({ energy: 100 }) },
    masters: { enter: async (id) => { calls.push(id); return response({}); } },
  }, "1", dashboard, null, policy);
  assert.deepEqual(calls, [9]);
  assert.equal(normalizeMonthlyDashboard(monthlyResponse("MasterEarnIntellect", { masterId: 2 }), policy).today.context.masterId, 2);
});

test("disabled monthly tasks issue no game requests", async () => {
  for (const [action, policy] of [
    ["KillBoss", { queueBosses: false }], ["StressVictim", { interactions: false }],
    ["MasterSession", { energyTasks: false }], ["ScamGambler", { playKatala: false }],
    ["SendStashToPlayer", { simpleTasks: false }],
  ]) {
    const result = await __test.executeMonthlyCheapAction({}, "1", normalizeMonthlyDashboard(monthlyResponse(action)), null, policy);
    assert.equal(result.reason, "task_category_disabled");
  }
});

test("preferred monthly prison does not restrict profit from other zones", () => {
  const source = monthlyResponse("PrisonEarnAuthority");
  source.data.global.days[0].target = 1300;
  source.data.user.days[5].progress = 0;
  const dashboard = normalizeMonthlyDashboard(source, { authorityPrisonId: 6 }, {
    business: { canCollect: true, expectedRewards: { respect: 1300 }, expectedRewardsByPrison: { 1: { respect: 500 }, 4: { respect: 800 } } },
  });
  assert.equal(dashboard.today.authorityPrisonId, 6);
  assert.equal(dashboard.today.context.prisonId, undefined);
  assert.equal(dashboard.today.evaluation.profitRespect, 1300);
  assert.equal(dashboard.today.evaluation.requiredEnergyMax, 0);
});

test("monthly master queue counts full remaining sessions and removes completed/expired work", () => {
  const source = monthlyResponse("MasterSession", { masterId: 4 });
  const monthly = normalizeMonthlyDashboard(source);
  const item = __test.buildMonthlyPrisonQueueItem(monthly, monthly.today);
  assert.equal(item.targetType, "master");
  assert.equal(item.targetId, 4);
  assert.equal(item.runTarget, 3);
  assert.equal(__test.getMonthlyQueueProgress(item, source).remaining, 3);
  source.data.user.days[5].completed = true;
  assert.equal(__test.getMonthlyQueueProgress(item, source).finished, true);
  source.data.user.days[5].completed = false;
  source.data.user.activeDayId = 6;
  assert.equal(__test.getMonthlyQueueProgress(item, source).finished, true);
  assert.equal(__test.getMonthlyQueueProgress(item, { status: 503 }).checked, false);
});

test("explicit stash recipient never sends to self or falls back to unrelated players", async () => {
  const self = await __test.sendDuplicateStashes({}, "42", 1, "42");
  assert.equal(self.reason, "stash_recipient_is_self");
  const calls = [];
  const empty = await __test.sendDuplicateStashes({ collection: { full: async (id) => { calls.push(id); return response({}); } } }, "1", 3, "42");
  assert.equal(empty.reason, "no_duplicate_stashes");
  assert.deepEqual(calls, ["1"]);
});

test("shared ruble budget covers all Zaruba purchases, is atomic, and cannot be reset from UI", async (t) => {
  const { service, options } = fixture(t);
  await service.updateZarubaAutomation({ enabled: true, queueBosses: true, slotsBuyMatches: true, rublesDailyLimit: 16 });
  const results = await Promise.all([
    service.reserveRubles(10, "wheel"), service.reserveRubles(1, "katala"),
    service.reserveRubles(1, "slots"), service.reserveRubles(4, "weapon"), service.reserveRubles(1, "katala"),
  ]);
  assert.equal(results.filter((result) => result.allowed).length, 4);
  await service.updateZarubaAutomation({ rublesCommitted: 0, dayKey: "2000-01-01" });
  const saved = await createProPrisonFeatureService(options).getZarubaAutomation();
  assert.equal(saved.rublesCommitted, 16);
  assert.equal(normalizeZarubaAutomation({ ...saved, dayKey: "2000-01-01" }).rublesCommitted, 0);
  await service.updateZarubaAutomation({ rublesDailyLimit: null });
  assert.equal((await service.reserveRubles(100, "katala")).allowed, true);
  await service.updateZarubaAutomation({ enabled: false });
  assert.equal((await service.reserveRubles(1, "katala")).allowed, false);
});

test("legacy wheel limit and spend migrate without re-enabling slots purchases", () => {
  const migrated = normalizeZarubaAutomation({ wheelRublesDailyLimit: 20, wheelRublesCommitted: 10, dayKey: getMoscowDateKey() });
  assert.equal(migrated.rublesDailyLimit, 20);
  assert.equal(migrated.rublesCommitted, 10);
  assert.equal(migrated.slotsBuyMatches, false);
  assert.equal(normalizeZarubaPolicy({ wheelRublesDailyLimit: 20, rublesDailyLimit: null }).rublesDailyLimit, null);
});

test("per-run spending separates confirmation and reservation, survives restart and never resets at midnight", async (t) => {
  const { service, options } = fixture(t, [], {}, { active: { id: "run-1", tasks: [] } });
  await service.updateZarubaAutomation({ enabled: true, rublesDailyLimit: 40 });
  const payment = await service.reserveRubles(40, "wheel");
  assert.deepEqual((await service.getZarubaDashboard()).spending, { spent: 0, reserved: 40, since: (await service.getZarubaDashboard()).spending.since });
  await Promise.all([payment.confirm(20), payment.confirm(20)]);
  assert.equal((await service.getZarubaDashboard()).spending.spent, 20);
  await payment.confirm(40);
  await payment.confirm(40);
  const restored = createProPrisonFeatureService(options);
  const dashboard = await restored.getZarubaDashboard();
  assert.equal(dashboard.spending.spent, 40);
  assert.equal(dashboard.spending.reserved, 40);
  await restored.updateZarubaAutomation({ rublesByRun: {} });
  const saved = await restored.getZarubaAutomation();
  const tomorrow = normalizeZarubaAutomation({ ...saved, dayKey: "2000-01-01" });
  assert.equal(tomorrow.rublesCommitted, 0);
  assert.equal(tomorrow.rublesByRun[dashboard.runKey].spent, 40);
});

test("next run starts at zero while delayed payment confirmation remains on its original run", async (t) => {
  const { service, client } = fixture(t, [], {}, { active: { id: "first", tasks: [] } });
  await service.updateZarubaAutomation({ enabled: true });
  const payment = await service.reserveRubles(10, "wheel");
  const firstKey = (await service.getZarubaDashboard()).runKey;
  client.zaruba.state = async () => response({ active: { id: "second", tasks: [] } });
  const second = await service.getZarubaDashboard();
  assert.deepEqual(second.spending, { spent: 0, reserved: 0, since: null });
  await payment.confirm();
  assert.equal((await service.getZarubaDashboard()).spending.spent, 0);
  assert.equal((await service.getZarubaAutomation()).rublesByRun[firstKey].spent, 10);
  assert.equal((await service.getZarubaAutomation()).rublesCommitted, 10);
});

test("run identity ignores changing progress and completed tasks when game timestamps identify the run", () => {
  const active = { mode: 1, endUnix: 12345, tasks: [{ taskId: "a", currentAmount: 0 }] };
  assert.equal(zarubaRunKey(active), zarubaRunKey({ ...active, tasks: [] }));
  assert.notEqual(zarubaRunKey(active), zarubaRunKey({ ...active, endUnix: 54321 }));
  assert.equal(zarubaRunKey(null), null);
});

test("skip requires fresh task and exact confirmed price; duplicate and timeout survive restart", async (t) => {
  const { service, client, options } = fixture(t, [{ taskId: "skip-1", type: 12, requiredAmount: 1 }]);
  let posts = 0;
  client.zaruba.skip = async () => { posts++; throw new Error("timeout"); };
  const preview = await service.runZarubaAction({ action: "skip", taskId: "skip-1", dryRun: true });
  assert.equal(preview.plan.expectedCost.soap, 4);
  assert.equal(posts, 0);
  const request = { action: "skip", taskId: "skip-1", dryRun: false, confirmed: true, maxSoap: 4, expectedStateVersion: preview.plan.stateVersion };
  await assert.rejects(service.runZarubaAction({ ...request, maxSoap: 3 }), /цену/);
  await assert.rejects(service.runZarubaAction({ ...request, confirmed: false }), /confirmed/);
  await assert.rejects(service.runZarubaAction({ ...request, taskId: "missing" }), /недоступно/);
  await assert.rejects(service.runZarubaAction(request), /timeout/);
  await assert.rejects(createProPrisonFeatureService(options).runZarubaAction(request), /уже отправлен/);
  assert.equal(posts, 1);
  assert.equal(classifyZarubaTask({ taskId: "skip-1", type: 12, status: 2 }).completed, true);
});

test("manual skip succeeds without enabling automatic soap spending", async (t) => {
  const { service, client } = fixture(t, [{ taskId: "skip-ok", type: 12, requiredAmount: 1 }]);
  const calls = [];
  client.zaruba.skip = async (id) => { calls.push(id); return response({ ok: true }); };
  const preview = await service.runZarubaAction({ action: "skip", taskId: "skip-ok" });
  const result = await service.runZarubaAction({ action: "skip", taskId: "skip-ok", expectedStateVersion: preview.plan.stateVersion,
    dryRun: false, confirmed: true, maxSoap: 4 });
  assert.equal(result.executed, true);
  assert.deepEqual(calls, ["skip-ok"]);
  assert.equal((await service.getZarubaAutomation()).allowBossSkipSoap, false);
});

test("a definite soap shortage is not reported as success and permits retry after replenishment", async (t) => {
  const { service, client } = fixture(t, [{ taskId: "soap", type: 12, requiredAmount: 1 }]);
  const preview = await service.runZarubaAction({ action: "skip", taskId: "soap" });
  const request = { action: "skip", taskId: "soap", expectedStateVersion: preview.plan.stateVersion,
    dryRun: false, confirmed: true, maxSoap: 4 };
  client.zaruba.skip = async () => response({ ok: false, error: "not_enough_soap" });
  await assert.rejects(service.runZarubaAction(request), /Недостаточно мыла/);
  client.zaruba.skip = async () => response({ ok: true });
  assert.equal((await service.runZarubaAction(request)).executed, true);
});

test("weapon planner uses owned inventory first and buys only the damage deficit", () => {
  const plan = selectZarubaDamageWeapon({ knife: { count: 1, damage: 10 }, gunshot: { count: 0, damage: 30 } }, 35, { allowPurchase: true });
  assert.equal(plan.sufficient, true);
  assert.deepEqual(plan.purchases, { gunshot: 1 });
  assert.equal(plan.purchaseRubles, 5);
  assert.equal(plan.plannedDamage, 40);
  const owned = selectZarubaDamageWeapon({ poison: { count: 1, damage: 100 }, knife: { count: 0, damage: 10 } }, 10, { allowPurchase: true });
  assert.equal(owned.purchaseRubles, 0);
});

test("weapon purchases check budget before POST, verify inventory, and never retry an uncertain payment", async () => {
  let knives = 0;
  let posts = 0;
  const client = { bosses: {
    bootstrap: async () => response({ weaponStatsEffective: { knifeCount: knives, knifeDamage: 10 } }),
    buyWeapon: async ({ weaponType, count }, options) => {
      assert.equal(weaponType, "knife"); assert.equal(options.rateLimitRetries, 0);
      posts++; knives += count; return response({ ok: true });
    },
  } };
  const task = { requiredAmount: 20, currentAmount: 0 };
  const denied = await __test.prepareZarubaDamageWeapons(client, task, { allowPurchase: true, reserveRubles: async () => ({ allowed: false, reason: "budget" }) });
  assert.equal(denied.reason, "budget"); assert.equal(posts, 0);
  const result = await __test.prepareZarubaDamageWeapons(client, task, { allowPurchase: true,
    reserveRubles: async (amount, purpose) => { assert.equal(amount, 8); assert.equal(purpose, "weapon"); return { allowed: true }; } });
  assert.equal(result.ok, true); assert.equal(posts, 1); assert.equal(knives, 2);
  const cached = await __test.prepareZarubaDamageWeapons(client, task, { allowPurchase: true, reserveRubles: () => assert.fail("owned inventory must be free") });
  assert.equal(cached.ok, true);
  knives = 0;
  client.bosses.buyWeapon = async () => { posts++; throw new Error("timeout"); };
  await assert.rejects(__test.prepareZarubaDamageWeapons(client, task, { allowPurchase: true, reserveRubles: async () => ({ allowed: true }) }), /timeout/);
  assert.equal(posts, 2);
});

test("Katala reserves only paid deals and does not start when the shared budget is exhausted", async () => {
  const posts = [];
  let lastFreePlayTime = new Date().toISOString();
  const client = { get: async () => response({ lastFreePlayTime }), post: async (url) => { posts.push(url); return response({ success: true }); } };
  const dependencies = { withContext: async (_path, fn) => fn({ client }), appendMiniGameHistory: async () => {} };
  const task = { execution: { strategy: "katala_cheap" } };
  const denied = await __test.executeZarubaDirectTask(task, { reserveRubles: async () => ({ allowed: false, reason: "budget" }) }, dependencies);
  assert.equal(denied.reason, "budget"); assert.equal(posts.length, 0);
  lastFreePlayTime = null;
  const free = await __test.executeZarubaDirectTask(task, { reserveRubles: () => assert.fail("free deal reserved rubles") }, dependencies);
  assert.equal(free.ok, true); assert.deepEqual(posts, ["/api/card/start", "/api/card/finish"]);
  lastFreePlayTime = new Date().toISOString();
  let confirmed = 0;
  await __test.executeZarubaDirectTask(task, { reserveRubles: async () => ({ allowed: true, confirm: async () => { confirmed++; } }) }, dependencies);
  assert.equal(confirmed, 1);
});

test("Fartovy waits free by default and buys one match only when enabled and within budget", async () => {
  let slotsGrass = 0;
  let freeSpins = 0;
  const posts = [];
  const client = { get: async () => response({ slotsGrass, freeSpins }) };
  const dependencies = {
    withContext: async (_path, fn) => fn({ client }),
    performMiniGameRequest: async (_client, _action, url, payload) => {
      posts.push(url);
      if (url.endsWith("buy-grass")) { assert.equal(payload.amount, 1); slotsGrass++; }
      if (url.endsWith("/spin")) { if (freeSpins) freeSpins--; else slotsGrass--; }
      return response({ success: true });
    },
  };
  const task = { execution: { strategy: "fartovy_spin", remaining: 1 } };
  const waiting = await __test.executeZarubaDirectTask(task, {}, dependencies);
  assert.equal(waiting.reason, "waiting_free_slots_spin");
  assert.equal(posts.some((url) => url.endsWith("buy-grass")), false);
  const denied = await __test.executeZarubaDirectTask(task, { slotsBuyMatches: true, reserveRubles: async () => ({ allowed: false, reason: "budget" }) }, dependencies);
  assert.equal(denied.reason, "budget");
  let reserved = 0;
  let confirmed = 0;
  const bought = await __test.executeZarubaDirectTask(task, { slotsBuyMatches: true,
    reserveRubles: async (amount, purpose) => { assert.equal(purpose, "slots"); reserved += amount; return { allowed: true, confirm: async () => { confirmed += amount; } }; } }, dependencies);
  assert.equal(bought.ok, true); assert.equal(reserved, 1);
  assert.equal(confirmed, 1);
  assert.equal(posts.filter((url) => url.endsWith("buy-grass")).length, 1);
  freeSpins = 1;
  assert.equal((await __test.executeZarubaDirectTask(task, { slotsBuyMatches: true,
    reserveRubles: () => assert.fail("free spin reserved rubles") }, dependencies)).ok, true);
});

test("thrown direct task failures back off so queued work can continue", async (t) => {
  const queued = [];
  const { service } = fixture(t, [{ taskId: "stash", type: 1 }, { taskId: "zone", type: 4, prisonId: 1 }], {
    executeZarubaDirectTask: async () => { throw new Error("temporary failure"); },
    enqueueZarubaTask: async (task) => { queued.push(task.taskId); return { queued: true }; },
  });
  await service.updateZarubaAutomation({ enabled: true });
  await service.runZarubaAutomationTick({ dryRun: false });
  await service.runZarubaAutomationTick({ dryRun: false });
  assert.deepEqual(queued, ["zone"]);
});
