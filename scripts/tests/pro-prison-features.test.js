const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { normalizePrisonAutomationState } = require("../lib/prison-dashboard");
const {
  BAG_ORE_PER_SIGNET,
  buildZarubaTaskExecutionPlans,
  classifyZarubaTask,
  buildZarubaTaskCatalogView,
  createProPrisonFeatureService,
  isZarubaClaimCostVerifiedFree,
  isZarubaCompletionClaimReady,
  normalizeBarygaShop,
  normalizeBagsDashboard,
  normalizeFriendsAutomation,
  normalizeZarubaAutomation,
  normalizeZarubaState,
  normalizeZarubaTasks,
  selectZarubaDamageWeapon,
} = require("../lib/pro-prison-features");
const { __test } = require("../lib/ui-service");

function createFeatureServiceForTest(client, stateDir) {
  return createProPrisonFeatureService({
    stateDir,
    withContext: async (_sessionPath, callback) => callback({ client, selfUserId: "1" }),
    enqueueZarubaTask: async () => ({ queued: true }),
    inviteCollected: async () => ({}),
    acceptFriendRequests: async () => ({}),
    getLootContainersDashboard: async () => ({}),
    openLootContainer: async () => ({}),
  });
}

test("Zaruba damage chooses the cheapest owned weapon that covers the task", () => {
  const plan = selectZarubaDamageWeapon({
    knife: { count: 3, damage: 900 },
    gunshot: { count: 1, damage: 1800 },
    poison: { count: 2, damage: 5000 },
  }, 1700);

  assert.equal(plan.sufficient, true);
  assert.equal(plan.weapon.key, "gunshot");
  assert.deepEqual(plan.hitTypes, ["gunshot"]);
  assert.equal(plan.weapon.priceRubles, 5);
});

test("Zaruba damage combines several owned weapons to cover the task", () => {
  const plan = selectZarubaDamageWeapon({
    knife: { count: 4, damage: 900 },
    gunshot: { count: 0, damage: 1800 },
    poison: { count: 0, damage: 5000 },
  }, 1700);

  assert.equal(plan.sufficient, true);
  assert.equal(plan.reason, "ok");
  assert.deepEqual(plan.hitTypes, ["knife", "knife"]);
  assert.equal(plan.plannedDamage, 1800);
  assert.equal(plan.priceRubles, 8);
});

test("Zaruba damage reports when all owned hits are insufficient in total", () => {
  const plan = selectZarubaDamageWeapon({
    knife: { count: 1, damage: 900 },
    gunshot: { count: 0, damage: 1800 },
    poison: { count: 0, damage: 5000 },
  }, 1700);

  assert.equal(plan.sufficient, false);
  assert.equal(plan.reason, "insufficient_total_damage");
  assert.deepEqual(plan.hitTypes, []);
});

test("an empty Vorkuta box balance is a normal state, not an opening error", () => {
  assert.equal(__test.isNoVorkutaBoxesResponse({
    ok: false,
    status: 400,
    data: { success: false, error: "not_enough_vbox", vboxLeft: 0 },
  }), true);
  assert.equal(__test.isNoVorkutaBoxesResponse({
    ok: false,
    status: 401,
    data: { success: false, error: "token expired" },
  }), false);
});

test("Zaruba damage execution reads the live weapon state and plans the cheapest hit sequence", async () => {
  const plans = await buildZarubaTaskExecutionPlans({
    bosses: {
      bootstrap: async () => ({
        data: {
          weaponStatsEffective: {
            counts: { knife: 7, gunshot: 1, poison: 0 },
            damage: { knife: 500, gunshot: 900, poison: 5_000 },
          },
        },
      }),
    },
  }, [{
    taskId: "boss-damage-1",
    kind: "boss",
    objective: "damage",
    targetId: 5,
    requiredAmount: 1300,
    currentAmount: 0,
    completed: false,
  }]);

  assert.equal(plans.length, 1);
  assert.equal(plans[0].execution.strategy, "boss_minimum_damage");
  assert.deepEqual(plans[0].execution.hitTypes, ["gunshot", "knife"]);
  assert.equal(plans[0].execution.remaining, 1300);
  assert.equal(plans[0].execution.plannedDamage, 1400);
});

test("a failed optional gambling state does not break unrelated Zaruba task planning", async () => {
  const plans = await buildZarubaTaskExecutionPlans({
    get: async () => { throw new Error("fetch failed"); },
  }, [{
    taskId: "wheel-1",
    kind: "wheel",
    objective: "count",
    requiredAmount: 1,
    currentAmount: 0,
    completed: false,
  }]);

  assert.equal(plans.length, 1);
  assert.equal(plans[0].execution.status, "waiting");
});

test("bags dashboard combines Zaruba and Brigade collections without exposing transport details", () => {
  const dashboard = normalizeBagsDashboard({
    data: {
      balances: { signet: 9, ore_signet: 31 },
      pacanBags: [{
        bagId: "p1",
        title: "Пацанская сумка",
        iconKey: "bag_p1",
        costSignet: 5,
        unlocked: true,
        sets: [{ setName: "Наколки", collected: 2, total: 4 }],
      }],
      blatBags: [],
      avtoritetBags: [],
    },
  }, {
    data: {
      families: {
        brigade: {
          balances: { armband: { armband_1: { balance: 7, cap: 20 } } },
          bags: [{
            bagId: "g1",
            title: "Бригадная сумка",
            armbandKey: "armband_1",
            cost: 5,
            sets: [{ setName: "Бригада", collected: 0, total: 3 }],
          }],
        },
      },
    },
  });

  assert.equal(BAG_ORE_PER_SIGNET, 15);
  assert.deepEqual(dashboard.exchange, {
    ore: 31,
    signet: 9,
    orePerSignet: 15,
    availableExchanges: 2,
    canExchange: true,
  });
  assert.equal(dashboard.zaruba.groups[0].bags[0].canOpen, true);
  assert.deepEqual(dashboard.zaruba.groups[0].bags[0].progress, { collected: 2, total: 4, remaining: 2 });
  assert.equal(dashboard.brigade.bags[0].canOpen, true);
  assert.equal(dashboard.stateVersion.length, 16);
});

test("bag opening rechecks state, requires confirmation, and uses the confirmed game payload", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-bags-action-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  const openCalls = [];
  const client = {
    zaruba: {
      wellState: async () => ({
        ok: true,
        status: 200,
        data: {
          balances: { signet: 9, ore_signet: 31 },
          pacanBags: [{
            bagId: "p1",
            title: "Пацанская сумка",
            costSignet: 5,
            unlocked: true,
            sets: [{ setName: "Наколки", collected: 2, total: 4 }],
          }],
        },
      }),
      openBag: async (payload) => {
        openCalls.push(payload);
        return { ok: true, status: 200, data: { success: true, reward: { name: "Татуировка" } } };
      },
    },
    menyala: {
      state: async () => ({ ok: true, status: 200, data: { families: {} } }),
    },
  };
  const service = createFeatureServiceForTest(client, stateDir);
  const dashboard = await service.getBagsDashboard();

  await assert.rejects(
    service.runBagsAction({ family: "zaruba", action: "open", mode: "pacan", bagId: "p1" }),
    /confirmed=true/,
  );
  const result = await service.runBagsAction({
    family: "zaruba",
    action: "open",
    mode: "pacan",
    bagId: "p1",
    confirmed: true,
    expectedStateVersion: dashboard.stateVersion,
  });

  assert.deepEqual(openCalls, [{ mode: 1, bagId: "p1" }]);
  assert.equal(result.executed, true);
  assert.equal(result.result.reward.name, "Татуировка");
});

test("Zaruba bag actions refresh balances without fetching brigade bags twice", async (t) => {
  for (const action of ["open", "exchangeOre"]) {
    await t.test(action, async (t) => {
      const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-bags-refresh-"));
      t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
      const calls = [];
      const requestOptionsSeen = [];
      let signet = 9;
      let ore = 31;
      const brigade = { families: { brigade: { balances: { armband: {} }, bags: [] } } };
      const client = {
        zaruba: {
          wellState: async (options) => {
            requestOptionsSeen.push(options);
            calls.push("well");
            return { ok: true, data: {
              balances: { signet, ore_signet: ore },
              pacanBags: [{ bagId: "p1", costSignet: 5, unlocked: true }],
            } };
          },
          openBag: async (payload, options) => {
            requestOptionsSeen.push(options);
            calls.push("open");
            signet -= 5;
            return { ok: true, data: { success: true } };
          },
          exchangeOre: async (payload, options) => {
            requestOptionsSeen.push(options);
            calls.push("exchangeOre");
            ore -= 15;
            signet += 1;
            return { ok: true, data: { success: true } };
          },
        },
        menyala: { state: async (options) => {
          requestOptionsSeen.push(options);
          calls.push("brigade");
          return { ok: true, data: brigade };
        } },
      };
      const service = createFeatureServiceForTest(client, stateDir);
      const before = await service.getBagsDashboard();
      calls.length = 0;
      requestOptionsSeen.length = 0;
      const result = await service.runBagsAction({
        family: "zaruba", action, bagId: "p1", mode: "pacan",
        confirmed: true, expectedStateVersion: before.stateVersion,
      });
      assert.deepEqual(calls, ["well", "brigade", action, "well"]);
      assert.deepEqual(requestOptionsSeen, Array.from({ length: 4 }, () => ({ throttle: false })));
      assert.equal(result.dashboard.exchange.signet, signet);
      assert.equal(result.dashboard.exchange.ore, ore);
      assert.deepEqual(result.dashboard.brigade, before.brigade);
      const fresh = await service.getBagsDashboard();
      assert.equal(result.dashboard.stateVersion, fresh.stateVersion);
      await assert.rejects(service.runBagsAction({
        family: "zaruba", action, bagId: "p1", mode: "pacan",
        confirmed: true, expectedStateVersion: before.stateVersion,
      }), { code: "state_version_mismatch" });
      assert.equal(calls.filter((call) => call === action).length, 1);
    });
  }
});

test("podogrev selector never collects more energy than the active Zaruba needs", () => {
  const selection = __test.selectPodogrevTokensUpToEnergy([
    { token: "three", type: 1 },
    { token: "five", type: 2 },
    { token: "seven", type: 3 },
    { token: "ten", type: 5 },
  ], 12);

  assert.equal(selection.energy, 12);
  assert.equal(selection.exact, true);
  assert.deepEqual(new Set(selection.tokens), new Set(["five", "seven"]));

  const belowTarget = __test.selectPodogrevTokensUpToEnergy([
    { token: "eight", type: 4 },
    { token: "ten", type: 5 },
  ], 9);
  assert.equal(belowTarget.energy, 8);
  assert.equal(belowTarget.exact, false);
  assert.deepEqual(belowTarget.tokens, ["eight"]);
});

test("automatic podogrev waits before Zaruba starts and collects a capped selected subset", async () => {
  let active = null;
  const selectedCalls = [];
  const client = {
    zaruba: {
      state: async () => ({ ok: true, status: 200, data: { active } }),
    },
    podogrev: {
      status: async () => ({
        ok: true,
        status: 200,
        data: {
          inbox: [
            { token: "three", type: 1 },
            { token: "five", type: 2 },
            { token: "seven", type: 3 },
          ],
          meta: { claimedToday: 0, leftQuota: 50 },
        },
      }),
      collectSelected: async (tokens) => {
        selectedCalls.push(tokens);
        return { ok: true, status: 200, data: { success: true } };
      },
    },
  };

  const beforeStart = await __test.collectPodogrevForActiveZaruba(client);
  assert.equal(beforeStart.executed, false);
  assert.equal(beforeStart.reason, "zaruba_not_started");
  assert.equal(selectedCalls.length, 0);

  active = {
    mode: 1,
    tasks: [{ taskId: "heat", type: 3, requiredAmount: 12, currentAmount: 0 }],
  };
  const duringZaruba = await __test.collectPodogrevForActiveZaruba(client);
  assert.equal(duringZaruba.executed, true);
  assert.equal(duringZaruba.requestedEnergy, 12);
  assert.deepEqual(new Set(selectedCalls[0]), new Set(["five", "seven"]));

  active.tasks[0].requiredAmount = 9;
  active.tasks[0].currentAmount = 0;
  client.podogrev.status = async () => ({
    ok: true,
    status: 200,
    data: {
      inbox: [{ token: "eight", type: 4 }, { token: "ten", type: 5 }],
      meta: { claimedToday: 0, leftQuota: 50 },
    },
  });
  const withoutExactSubset = await __test.collectPodogrevForActiveZaruba(client);
  assert.equal(withoutExactSubset.executed, false);
  assert.equal(withoutExactSubset.reason, "podogrev_exact_amount_unavailable");
  assert.equal(selectedCalls.length, 1);
});

test("Zaruba state keeps server-provided modes, locks, progress, balances, and pending reward", () => {
  const result = normalizeZarubaState({
    data: {
      modes: [
        { id: "easy", title: "Дворовая", unlocked: true, usedToday: 1, dailyLimit: 3 },
        { id: "hard", title: "Сходняк", locked: true, reason: "Нужен 20 уровень" },
      ],
      playerProgress: { level: 7, exp: 31, nextLevelXp: 80 },
      currencies: { ore_signet: 14, signets: 6 },
      current: { id: "fight-1", currentTask: { id: "task-1", type: "boss", bossId: 12 } },
      rewardPending: { id: "reward-1", cost: { soap: 0 } },
    },
  });

  assert.deepEqual(result.modes.map((mode) => ({
    id: mode.id,
    name: mode.name,
    unlocked: mode.unlocked,
    lockReason: mode.lockReason,
    used: mode.used,
    max: mode.max,
  })), [
    { id: "easy", name: "Дворовая", unlocked: true, lockReason: null, used: 1, max: 3 },
    { id: "hard", name: "Сходняк", unlocked: false, lockReason: "Нужен 20 уровень", used: 0, max: 0 },
  ]);
  assert.deepEqual(result.progress, { level: 7, xp: 31, xpRequired: 80 });
  assert.deepEqual(result.balances, { ore: 14, signet: 6 });
  assert.equal(result.pendingReward.id, "reward-1");
});

test("Zaruba completion is claimable only with a verified free reward", () => {
  const completedDashboard = {
    active: { mode: 1 },
    tasks: [{ completed: true }, { completed: true }],
    pendingReward: null,
  };
  assert.equal(isZarubaCompletionClaimReady(completedDashboard), true);
  assert.equal(isZarubaClaimCostVerifiedFree(completedDashboard, true), true);
  assert.equal(isZarubaCompletionClaimReady({
    active: { mode: 1 },
    tasks: [{ completed: true }, { completed: false }],
  }), false);
  assert.equal(isZarubaClaimCostVerifiedFree({ pendingReward: { mode: 1 } }, true), true);
  assert.equal(isZarubaClaimCostVerifiedFree({ pendingReward: { mode: 1 } }, false), false);
  assert.equal(isZarubaClaimCostVerifiedFree({ pendingReward: { cost: { soap: 1 } } }, true), false);
  assert.equal(isZarubaClaimCostVerifiedFree({ pendingReward: { cost: { soap: 0 } } }, false), true);
});

test("disabled Zaruba automation does not claim rewards", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-auto-claim-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  let claimed = false;
  let claimCalls = 0;
  const client = {
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: claimed
          ? { active: null, pendingReward: null }
          : {
              active: {
                mode: 1,
                tasks: [
                  { taskId: "done-1", type: 8, requiredAmount: 1, currentAmount: 1 },
                  { taskId: "done-2", type: 14, requiredAmount: 2, currentAmount: 2 },
                ],
              },
            },
      }),
      claim: async () => {
        claimCalls += 1;
        claimed = true;
        return { ok: true, status: 200, data: { claimed: true } };
      },
    },
  };
  const service = createFeatureServiceForTest(client, stateDir);
  await service.updateZarubaAutomation({ enabled: false, autoClaimFree: true });

  const result = await service.runZarubaAutomationTick({ dryRun: false });

  assert.equal(result.skipped, true);
  assert.equal(result.reason, "disabled");
  assert.equal(result.automation.enabled, false);
  assert.equal(result.automation.autoClaimFree, false);
  assert.equal(claimCalls, 0);
});

test("Zaruba starts the selected next run immediately after auto-claim", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-auto-next-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  let claimed = false;
  let started = false;
  let startCalls = 0;
  const client = {
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: {
          modes: [{ id: 1, unlocked: true }],
          active: started
            ? { mode: 1, tasks: [{ taskId: "next-1", type: 2, requiredAmount: 10, currentAmount: 0 }] }
            : claimed
              ? null
              : {
                  mode: 1,
                  tasks: [{ taskId: "done-1", type: 2, requiredAmount: 10, currentAmount: 10 }],
                  finishedSuccess: true,
                },
          pendingReward: claimed ? null : { mode: 1, success: true },
        },
      }),
      claim: async () => {
        claimed = true;
        return { ok: true, status: 200, data: { claimed: true } };
      },
      start: async ({ Mode }) => {
        startCalls += 1;
        assert.equal(Mode, 1);
        started = true;
        return { ok: true, status: 200, data: { started: true } };
      },
    },
  };
  const service = createFeatureServiceForTest(client, stateDir);
  await service.updateZarubaAutomation({
    enabled: true,
    autoClaimFree: true,
    autoStart: true,
    selectedMode: "1",
  });

  const result = await service.runZarubaAutomationTick({ dryRun: false });

  assert.equal(result.action.type, "claim");
  assert.deepEqual(result.action.nextStart, { started: true, mode: "1" });
  assert.equal(startCalls, 1);
  assert.equal(started, true);
});

test("Zaruba task classification is conservative and stops at unknown tasks", () => {
  assert.deepEqual(classifyZarubaTask({
    task: { taskId: "q-1", type: "prison", prisonId: 5, title: "Пройти зону" },
  }), {
    kind: "prison",
    taskId: "q-1",
    targetId: 5,
    isDay: true,
    label: "Пройти зону",
    subtitle: null,
    rawType: "prison",
    objective: "respect",
    requiredAmount: 0,
    currentAmount: 0,
    status: 0,
    completed: false,
    queueable: true,
    rewardAvailable: false,
    serverCost: null,
    skipCostSoap: 4,
  });
  assert.equal(classifyZarubaTask({
    task: { taskId: "q-2", type: "mystery_action", title: "Неизвестная механика" },
  }).kind, "unknown");
});

test("Zaruba normalizes the live task array without mixing unrelated task types", () => {
  const result = normalizeZarubaTasks({
    tasks: [
      {
        taskId: "prison-4",
        type: 4,
        prisonId: 4,
        requiredAmount: 50,
        currentAmount: 12,
        status: 0,
        title: "Набери 50 уважения зеков 'КРЕСТЫ'",
        subtitle: "Зона: КРЕСТЫ",
      },
      {
        taskId: "master",
        type: 11,
        bossId: null,
        prisonId: null,
        requiredAmount: 40,
        currentAmount: 0,
        title: "Получи 40 очков знаний у мастеров",
      },
      {
        taskId: "boss-damage",
        type: 6,
        bossId: 3,
        requiredAmount: 1100,
        currentAmount: 0,
        title: "Нанеси 1100 урона боссу: Махно",
      },
      {
        taskId: "friend",
        type: 9,
        bossId: null,
        prisonId: null,
        requiredAmount: 6,
        currentAmount: 0,
        title: "Напряги терпилу 6 раз",
      },
      {
        taskId: "katala",
        type: 12,
        bossId: null,
        prisonId: null,
        requiredAmount: 1,
        currentAmount: 0,
        title: "Разведи каталу 1 раз",
      },
    ],
  });

  assert.deepEqual(result.map((task) => task.kind), [
    "prison",
    "master",
    "boss",
    "friend",
    "katala",
  ]);
  assert.equal(result[0].taskId, "prison-4");
  assert.equal(result[0].targetId, 4);
  assert.equal(result[0].currentAmount, 12);
  assert.equal(result[0].requiredAmount, 50);
  assert.equal(result[1].targetId, null);
  assert.equal(result[2].targetId, 3);
});

test("Zaruba recognizes stash, player fight, Fartovy, Harknut, and Fortune tasks", () => {
  const tasks = normalizeZarubaTasks({
    tasks: [
      { taskId: "stash-1", type: 1, requiredAmount: 3, title: "Отправь нычку 3 раза другому игроку" },
      { taskId: "hark-1", type: 8, requiredAmount: 4, title: "Харкни 4 раза" },
      { taskId: "fight-1", type: 9, requiredAmount: 5, title: "Напряги терпилу 5 раз" },
      { taskId: "fartovy-1", type: 13, requiredAmount: 2, title: "Сыграй фартового 2 раза" },
      { taskId: "wheel-1", type: 14, requiredAmount: 2, title: "Крути Колесо Фортуны 2 раза" },
    ],
  });

  assert.deepEqual(tasks.map((task) => [task.kind, task.objective]), [
    ["friend", "send_stash"],
    ["friend", "harknut"],
    ["friend", "fight"],
    ["fartovy", "spin"],
    ["wheel", "spin"],
  ]);
  assert.equal(tasks.every((task) => task.queueable === false), true);
  assert.match(tasks[2].imageUrl, /Zaruba\/ZarubActiv\/i_winPlayer\.webp$/);
  assert.match(tasks[3].imageUrl, /slots\/slotsIcon\/bgSlots\.webp$/);
});

test("Harknut target loading falls back to the ordinary friend list", async () => {
  const calls = [];
  const targets = await __test.loadLowestAuthorityTargets({
    friends: {
      profiles: async () => {
        calls.push("profiles");
        return { ok: true, status: 200, data: [] };
      },
      list: async () => {
        calls.push("list");
        return {
          ok: true,
          status: 200,
          data: [{ userId: "100" }, { userId: "200" }, { userId: "100" }],
        };
      },
    },
  }, "200", { force: true });

  assert.deepEqual(calls, ["profiles", "list"]);
  assert.deepEqual(targets, [{ userId: "100", nickname: null, authority: 0 }]);
});

test("Zaruba task catalog learns live types once and never persists task IDs", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-task-catalog-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  const client = {
    get: async (pathname) => {
      assert.equal(pathname, "/api/wheel/state");
      return { ok: true, status: 200, data: { tickets: 3 } };
    },
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: {
          active: {
            tasks: [
              { taskId: "private-stash-id", type: 1, requiredAmount: 3, title: "Отправь нычку 3 раза" },
              { taskId: "private-hark-id", type: 8, requiredAmount: 4, title: "Харкни 4 раза" },
              { taskId: "private-fight-id", type: 9, requiredAmount: 5, title: "Напряги терпилу 5 раз" },
              { taskId: "private-fartovy-id", type: 13, requiredAmount: 2, title: "Сыграй фартового 2 раза" },
              { taskId: "private-wheel-id", type: 14, requiredAmount: 2, title: "Крути Колесо Фортуны 2 раза" },
            ],
          },
        },
      }),
    },
  };
  const service = createFeatureServiceForTest(client, stateDir);

  const first = await service.getZarubaDashboard();
  const second = await service.getZarubaDashboard();

  assert.deepEqual(first.taskCatalog.summary, { observed: 5, known: 5, unknown: 0 });
  assert.deepEqual(first.tasks.map((task) => task.execution.strategy), [
    "friend_send_stash",
    "friend_harknut",
    "friend_fight",
    "fartovy_spin",
    "wheel_spin",
  ]);
  assert.deepEqual(second.taskCatalog.entries.map((entry) => entry.occurrences), [1, 1, 1, 1, 1]);
  const stored = fs.readFileSync(path.join(stateDir, "zaruba-task-catalog-latest.json"), "utf8");
  assert.doesNotMatch(stored, /private-(?:stash|hark|fight|fartovy|wheel)-id/);
});

test("Zaruba catalog upgrades a historical Fartovy task to the built-in definition", () => {
  const catalog = buildZarubaTaskCatalogView({
    entries: [{
      key: "type:13",
      rawType: 13,
      kind: "unknown",
      objective: "unknown",
      known: false,
      samples: ["Сыграй фартового 2 раза"],
    }],
  });

  assert.deepEqual(catalog.summary, { observed: 1, known: 1, unknown: 0 });
  assert.equal(catalog.entries[0].kind, "fartovy");
  assert.equal(catalog.entries[0].objective, "spin");
  assert.equal(catalog.entries[0].actionKey, "fartovy_spin");
});

test("Zaruba Wheel plan buys only one ten-ruble ticket when the task has no tickets", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-wheel-ticket-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  const client = {
    get: async (pathname) => {
      assert.equal(pathname, "/api/wheel/state");
      return { ok: true, status: 200, data: { tickets: 0, balances: { rubles: 100 } } };
    },
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: {
          active: {
            tasks: [
              { taskId: "wheel-paid", type: 14, requiredAmount: 2, currentAmount: 0, title: "Крути Колесо Фортуны 2 раза" },
            ],
          },
        },
      }),
    },
  };
  const service = createFeatureServiceForTest(client, stateDir);

  const dashboard = await service.getZarubaDashboard();
  const execution = dashboard.tasks[0].execution;

  assert.equal(execution.strategy, "wheel_spin");
  assert.equal(execution.canAct, true);
  assert.equal(execution.needsTicketPurchase, true);
  assert.equal(execution.plannedRubles, 10);
  assert.equal(execution.ticketPriceRubles, 10);
  assert.match(execution.label, /Купить 1 билет за 10 ₽/);
});

test("Zaruba automation executes the recognized stash task directly", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-stash-task-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  const directCalls = [];
  const client = {
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: {
          active: {
            tasks: [{
              taskId: "stash-task",
              type: 1,
              requiredAmount: 3,
              currentAmount: 0,
              title: "Отправь нычку 3 раза другому игроку",
            }],
          },
        },
      }),
    },
  };
  const service = createProPrisonFeatureService({
    stateDir,
    withContext: async (_sessionPath, callback) => callback({ client, selfUserId: "1" }),
    enqueueZarubaTask: async () => ({ queued: false }),
    executeZarubaDirectTask: async (task) => {
      directCalls.push(task.execution.strategy);
      return { ok: true, executed: true, successes: 3 };
    },
    inviteCollected: async () => ({}),
    acceptFriendRequests: async () => ({}),
    getLootContainersDashboard: async () => ({}),
    openLootContainer: async () => ({}),
  });
  await service.updateZarubaAutomation({ enabled: true });

  const preview = await service.runZarubaAutomationTick({ force: true, dryRun: true });
  const executed = await service.runZarubaAutomationTick({ force: true, dryRun: false });

  assert.equal(preview.action.type, "planned_direct");
  assert.equal(preview.action.strategy, "friend_send_stash");
  assert.equal(executed.action.type, "direct");
  assert.equal(executed.action.strategy, "friend_send_stash");
  assert.deepEqual(directCalls, ["friend_send_stash"]);
});

test("Zaruba automation executes player fights and Fartovy instead of observing them", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-fight-fartovy-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  let fightDone = false;
  let fartovyDone = false;
  const directCalls = [];
  const client = {
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: {
          active: {
            tasks: [
              {
                taskId: "fight-1",
                type: 9,
                requiredAmount: 5,
                currentAmount: fightDone ? 5 : 0,
                title: "Напряги терпилу 5 раз",
              },
              {
                taskId: "fartovy-1",
                type: 13,
                requiredAmount: 2,
                currentAmount: fartovyDone ? 2 : 0,
                title: "Сыграй фартового 2 раза",
              },
            ],
          },
        },
      }),
    },
  };
  const service = createProPrisonFeatureService({
    stateDir,
    withContext: async (_sessionPath, callback) => callback({ client, selfUserId: "1" }),
    enqueueZarubaTask: async () => ({ queued: false }),
    executeZarubaDirectTask: async (task) => {
      directCalls.push(task.execution.strategy);
      if (task.execution.strategy === "friend_fight") fightDone = true;
      if (task.execution.strategy === "fartovy_spin") fartovyDone = true;
      return { ok: true, executed: true };
    },
    inviteCollected: async () => ({}),
    acceptFriendRequests: async () => ({}),
    getLootContainersDashboard: async () => ({}),
    openLootContainer: async () => ({}),
  });
  await service.updateZarubaAutomation({ enabled: true });

  const fight = await service.runZarubaAutomationTick({ force: true, dryRun: false });
  const fartovy = await service.runZarubaAutomationTick({ force: true, dryRun: false });

  assert.equal(fight.action.strategy, "friend_fight");
  assert.equal(fartovy.action.strategy, "fartovy_spin");
  assert.deepEqual(directCalls, ["friend_fight", "fartovy_spin"]);
});

test("Zaruba automation stays enabled after a transient API failure", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-transient-failure-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  const service = createFeatureServiceForTest({
    zaruba: {
      state: async () => {
        throw new Error("temporary timeout");
      },
    },
  }, stateDir);
  await service.updateZarubaAutomation({ enabled: true });

  const result = await service.runZarubaAutomationTick({ dryRun: false });
  const saved = await service.getZarubaAutomation();

  assert.equal(result.ok, false);
  assert.equal(saved.enabled, true);
  assert.equal(saved.lastError, "temporary timeout");
  assert.equal(saved.lastAction.type, "error");
  assert.equal(saved.lastAction.details.reason, "temporary timeout");
});

test("Zaruba settings save survives a background state version change", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-settings-race-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  const service = createFeatureServiceForTest({ zaruba: {} }, stateDir);
  const initial = await service.updateZarubaAutomation({ enabled: false, autoStart: false });
  await service.updateZarubaAutomation({ autoStart: true });

  const saved = await service.updateZarubaAutomation({
    expectedVersion: initial.version,
    enabled: true,
  });

  assert.equal(saved.enabled, true);
  assert.equal(saved.autoStart, true);
  assert.ok(saved.version > initial.version);
});

test("Zaruba background tick cannot overwrite freshly saved toggles", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-settings-tick-race-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  let releaseState;
  let stateRequested;
  const stateRequestedPromise = new Promise((resolve) => { stateRequested = resolve; });
  const releaseStatePromise = new Promise((resolve) => { releaseState = resolve; });
  const service = createFeatureServiceForTest({
    zaruba: {
      state: async () => {
        stateRequested();
        await releaseStatePromise;
        return { ok: true, status: 200, data: { modes: [], active: null } };
      },
    },
  }, stateDir);
  await service.updateZarubaAutomation({ enabled: false, autoStart: false, autoClaimFree: true });

  const tick = service.runZarubaAutomationTick({ force: true, dryRun: true });
  await stateRequestedPromise;
  await service.updateZarubaAutomation({ enabled: true, autoStart: true });
  releaseState();
  await tick;

  const saved = await service.getZarubaAutomation();
  assert.equal(saved.enabled, true);
  assert.equal(saved.autoStart, true);
});

test("Zaruba automation leaves boss tasks manual and queues only prison work", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-live-tasks-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  const queuedTasks = [];
  const client = {
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: {
          modes: [{ mode: 1, unlocked: true }],
          active: {
            mode: 1,
            tasks: [
              { taskId: "p-4", type: 4, prisonId: 4, title: "Набери уважение зеков" },
              { taskId: "m-1", type: 11, title: "Получи знания у мастеров" },
              { taskId: "b-3", type: 6, bossId: 3, title: "Нанеси урон боссу" },
            ],
          },
        },
      }),
    },
  };
  const service = createProPrisonFeatureService({
    stateDir,
    withContext: async (_sessionPath, callback) => callback({ client, selfUserId: "1" }),
    enqueueZarubaTask: async (task) => {
      queuedTasks.push(task);
      return { queued: true };
    },
    inviteCollected: async () => ({}),
    acceptFriendRequests: async () => ({}),
    getLootContainersDashboard: async () => ({}),
    openLootContainer: async () => ({}),
  });
  await service.updateZarubaAutomation({
    enabled: true,
    enqueueTasks: true,
    intellectMasterId: 9,
  });

  const dryRun = await service.runZarubaAutomationTick({ force: true, dryRun: true });
  assert.equal(dryRun.action.type, "planned");
  assert.equal(dryRun.action.count, 2);
  assert.equal(dryRun.action.dryRun, true);
  assert.equal(dryRun.action.manualTasks.some((task) => task.kind === "boss"), true);
  assert.deepEqual(queuedTasks, []);
  assert.equal(dryRun.automation.processedTaskIds.length, 0);

  const executed = await service.runZarubaAutomationTick({ force: true, dryRun: false });
  assert.equal(executed.action.count, 2);
  assert.deepEqual(queuedTasks.map((task) => [task.kind, task.targetId]), [
    ["master", 9],
    ["prison", 4],
  ]);
  assert.equal(executed.automation.processedTaskIds.length, 2);
});

test("Zaruba automation keeps every valid history entry and drops malformed legacy values", () => {
  const history = Array.from({ length: 12 }, (_, index) => ({
    at: `2026-07-30T10:${String(index).padStart(2, "0")}:00.000Z`,
    type: `event-${index}`,
    details: { reason: `reason-${index}` },
  }));
  const result = normalizeZarubaAutomation({
    history: [
      ...history,
      "[max-depth]",
      { at: "[max-depth]", type: "[max-depth]", details: "[max-depth]" },
      { at: "2026-07-30T11:00:00.000Z", type: "damaged", details: { reason: "[max-depth]" } },
      null,
    ],
  });

  assert.equal(result.history.length, 12);
  assert.equal(result.history[9].type, "event-9");
  assert.equal(result.history[11].details.reason, "reason-11");
});

test("Zaruba automation recovers a state disabled by the removed unknown-task stop", () => {
  const state = normalizeZarubaAutomation({
    enabled: false,
    lastError: "Неизвестное задание: Получи авторитет",
    lastAction: {
      type: "stopped",
      details: { reason: "unknown_task" },
    },
  });

  assert.equal(state.enabled, true);
  assert.equal(state.lastError, null);
  assert.equal(state.recoveredLegacyUnknownTaskStop, true);
});

test("Zaruba main automation toggle owns reward claims and task queueing", () => {
  const enabled = normalizeZarubaAutomation({
    enabled: true,
    autoClaimFree: false,
    enqueueTasks: false,
  });
  const disabled = normalizeZarubaAutomation({
    enabled: false,
    autoClaimFree: true,
    enqueueTasks: true,
  });

  assert.equal(enabled.autoClaimFree, true);
  assert.equal(enabled.enqueueTasks, true);
  assert.equal(disabled.autoClaimFree, false);
  assert.equal(disabled.enqueueTasks, false);
});

test("Zaruba actions reject locked modes before a game POST", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-safety-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  let mutations = 0;
  const client = {
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: {
          modes: [
            { id: "open", unlocked: true },
            { id: "locked", unlocked: false, reason: "Нужен уровень" },
          ],
          balances: { ore: 5 },
        },
      }),
      start: async () => {
        mutations += 1;
        return { ok: true, data: { success: true } };
      },
      exchangeOre: async () => {
        mutations += 1;
        return { ok: true, data: { success: true } };
      },
    },
  };
  const service = createFeatureServiceForTest(client, stateDir);

  await assert.rejects(
    service.runZarubaAction({ action: "start", mode: "locked", dryRun: false, confirmed: true }),
    /Нужен уровень/,
  );
  assert.equal(mutations, 0);
});

test("Zaruba start uses the official case-sensitive Mode contract", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-zaruba-start-contract-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
  let startPayload = null;
  const client = {
    zaruba: {
      state: async () => ({
        ok: true,
        status: 200,
        data: {
          modes: [{ mode: 1, unlocked: true }],
          balances: { ore_signet: 0, signet: 0 },
        },
      }),
      start: async (payload) => {
        startPayload = payload;
        return { ok: true, status: 200, data: { ok: true } };
      },
    },
  };
  const service = createFeatureServiceForTest(client, stateDir);

  const result = await service.runZarubaAction({
    action: "start",
    mode: "1",
    dryRun: false,
    confirmed: true,
  });

  assert.equal(result.executed, true);
  assert.deepEqual(startPayload, { Mode: 1 });
});

test("legacy single prison target migrates into a resource-safe queue", () => {
  const state = normalizePrisonAutomationState({
    enabled: true,
    targetType: "master",
    targetId: 9,
    energyPolicy: {
      order: "soap_chefir",
      allowChefir: true,
      allowSoap: true,
      chefirReserve: 30,
      soapDailyLimit: 5,
      chefirDailyLimit: 8,
      dayKey: "2000-01-01",
      soapSpentToday: 99,
      chefirSpentToday: 99,
    },
  });

  assert.equal(state.queue.length, 1);
  assert.deepEqual(state.queue[0], {
    queueItemId: "migration-master-9-1",
    targetType: "master",
    targetId: 9,
    isDay: true,
    goalType: "runs",
    runTarget: 1,
    completedRuns: 0,
    repeatCount: 1,
    origin: "migration",
    priority: 0,
  });
  assert.equal(state.energyPolicy.order, "soap_chefir");
  assert.equal(state.energyPolicy.chefirReserve, 30);
  assert.equal(state.energyPolicy.soapSpentToday, 0);
  assert.equal(state.energyPolicy.chefirSpentToday, 0);
});

test("prison queue decrements repeats only after completion and then advances", () => {
  const queue = [
    {
      queueItemId: "first",
      targetType: "prison",
      targetId: 3,
      isDay: true,
      repeatCount: 2,
      origin: "manual",
      priority: 0,
    },
    {
      queueItemId: "second",
      targetType: "master",
      targetId: 9,
      isDay: true,
      repeatCount: 1,
      origin: "zaruba",
      priority: 100,
    },
  ];
  const repeated = __test.advancePrisonAutomationQueue(queue);
  assert.equal(repeated.repeated, true);
  assert.equal(repeated.queue[0].queueItemId, "first");
  assert.equal(repeated.queue[0].repeatCount, 1);
  assert.equal(repeated.queue[0].completedRuns, 1);
  assert.equal(repeated.queue[0].runTarget, 2);

  const advanced = __test.advancePrisonAutomationQueue(repeated.queue);
  assert.equal(advanced.repeated, false);
  assert.equal(advanced.queue[0].queueItemId, "second");

  const alreadyCompleted = __test.advancePrisonAutomationQueue(queue, { skipRemaining: true });
  assert.equal(alreadyCompleted.queue[0].queueItemId, "second");
});

test("prison queue restores a server-counted walk after a restart", () => {
  const state = normalizePrisonAutomationState({
    queue: [{
      queueItemId: "restart",
      targetType: "prison",
      targetId: 11,
      isDay: true,
      goalType: "runs",
      runTarget: 2,
      completedRuns: 0,
      repeatCount: 2,
      origin: "manual",
    }],
  });

  const baseline = __test.observePrisonAutomationRun(state.queue[0], { runs: 7 });
  assert.equal(baseline.baselineInitialized, true);
  assert.equal(baseline.completedRuns, 0);

  const restored = normalizePrisonAutomationState(JSON.parse(JSON.stringify(state)));
  const recovered = __test.observePrisonAutomationRun(restored.queue[0], { runs: 8 });
  assert.equal(recovered.baselineInitialized, false);
  assert.equal(recovered.completedRuns, 1);

  const advanced = __test.advancePrisonAutomationQueue(restored.queue, {
    completedRuns: recovered.completedRuns,
  });
  assert.equal(advanced.queue[0].queueItemId, "restart");
  assert.equal(advanced.queue[0].completedRuns, 1);
  assert.equal(advanced.queue[0].repeatCount, 1);
  assert.equal(advanced.queue[0].observedRuns, 8);
});

test("collection queue keeps running until the collection check confirms completion", () => {
  const queue = [{
    queueItemId: "collection",
    targetType: "master",
    targetId: 12,
    goalType: "collection",
    completedRuns: 0,
    repeatCount: 1,
    origin: "manual",
  }];

  const afterWalk = __test.advancePrisonAutomationQueue(queue, { completedRuns: 1 });
  assert.equal(afterWalk.repeated, true);
  assert.equal(afterWalk.queue[0].queueItemId, "collection");
  assert.equal(afterWalk.queue[0].completedRuns, 1);

  const afterCollection = __test.advancePrisonAutomationQueue(afterWalk.queue, { skipRemaining: true });
  assert.deepEqual(afterCollection.queue, []);
});

test("saving general prison settings does not rewrite an active queue head", () => {
  const current = normalizePrisonAutomationState({
    queue: [{
      queueItemId: "active",
      targetType: "prison",
      targetId: 11,
      isDay: true,
      goalType: "runs",
      runTarget: 3,
      completedRuns: 1,
      observedRuns: 8,
      repeatCount: 2,
      origin: "manual",
    }],
  });

  const queue = __test.getPrisonAutomationUpdatedQueue(current, {
    targetType: "master",
    targetId: 12,
    isDay: false,
    enabled: true,
  });

  assert.deepEqual(queue, current.queue);
  assert.equal(queue[0].targetId, 11);
  assert.equal(queue[0].completedRuns, 1);
  assert.equal(queue[0].observedRuns, 8);
});

test("boss automation ignores removed schedule and cycle fields while preserving Zaruba metadata", () => {
  const now = new Date("2026-07-30T10:00:00.000Z");
  const state = __test.normalizeBossAutomationState({
    queueDate: "2026-07-30",
    queue: [{
      bossId: 12,
      mode: "odin",
      origin: "zaruba",
      serverTaskId: "task-12",
      priority: 100,
    }],
    queueTemplate: [{ bossId: 12, mode: "odin" }],
    scheduleAt: "2026-07-30T12:00:00.000Z",
    repeatCycles: 3,
    completedCycles: 1,
  }, { now });

  assert.equal("scheduleAt" in state, false);
  assert.equal("repeatCycles" in state, false);
  assert.equal("completedCycles" in state, false);
  assert.equal("queueTemplate" in state, false);
  assert.equal(state.queue[0].origin, "zaruba");
  assert.equal(state.queue[0].serverTaskId, "task-12");
  assert.equal(state.queue[0].priority, 100);
});

test("boss automation preserves an explicit solo mode for Zaruba damage", () => {
  const entry = __test.normalizeBossAutomationQueueEntry({
    bossId: 5,
    mode: "odin",
    origin: "zaruba",
    zarubaObjective: "damage",
    hitTypes: ["knife"],
  });

  assert.equal(entry.mode, "odin");
  assert.deepEqual(entry.hitTypes, ["knife"]);
});

test("boss start payload preserves solo mode for Zaruba damage", () => {
  const payload = __test.buildBossAutomationStartPayload({
    bossId: 5,
    mode: "odin",
    origin: "zaruba",
    zarubaObjective: "damage",
    hitTypes: ["knife"],
  });

  assert.deepEqual(payload, { bossId: 5, mode: "odin" });
  assert.equal(__test.buildBossAutomationStartPayload({ bossId: 5, mode: "odin", origin: "manual" }).mode, "odin");
});

test("Baryga dashboard accepts a direct inventory array and maps item quantities", () => {
  const dashboard = normalizeBarygaShop(
    { data: { cameraItems: [{ id: "coat", name: "Куртка" }] } },
    { data: [{ id: "active-coat" }] },
    { data: [{ itemId: "coat", count: 4 }] },
  );

  assert.equal(dashboard.cameraItems[0].quantity, 4);
  assert.equal(dashboard.inventory.length, 1);
  assert.equal(dashboard.slots.length, 1);
});

test("Baryga dashboard expands the live inventory map, active slots, and discount", () => {
  const dashboard = normalizeBarygaShop(
    { data: { barygaItems: [{ id: "7", name: "Перстень" }] } },
    { data: { cameraSlots: ["7", null], barygaSlots: ["8"], permanent: { poison: 10 } } },
    { data: { items: { 7: 3, 8: 1 }, hasDiscount: true, discount: 20 } },
  );

  assert.equal(dashboard.barygaItems[0].quantity, 3);
  assert.equal(dashboard.inventory.length, 2);
  assert.equal(dashboard.activeSlots.length, 2);
  assert.equal(dashboard.hiddenGear.hasDiscount, true);
  assert.equal(dashboard.hiddenGear.discount, 20);
  assert.equal(dashboard.hiddenGear.purchaseEnabled, false);
});

test("bulk weapon dry-run checks current balances without issuing the game POST", async () => {
  let purchased = false;
  const client = {
    bosses: {
      weapons: async () => ({ data: { poisonCount: 4, gunshotCount: 3, knifeCount: 2 } }),
      buyWeapon: async () => {
        purchased = true;
        return { ok: true, data: { success: true } };
      },
    },
    players: {
      init: async () => ({ data: { currencies: { rubles: 1_000 } } }),
    },
  };
  const service = createProPrisonFeatureService({
    withContext: async (_sessionPath, callback) => callback({ client, selfUserId: "1" }),
    enqueueZarubaTask: async () => ({ queued: true }),
    inviteCollected: async () => ({}),
    acceptFriendRequests: async () => ({}),
    getLootContainersDashboard: async () => ({}),
    openLootContainer: async () => ({}),
  });

  const result = await service.buyBossWeapon({
    weaponType: "poison",
    count: 10,
    dryRun: true,
    maxRubles: 180,
    expectedUnitPrice: 18,
  });

  assert.equal(result.dryRun, true);
  assert.equal(result.purchased, false);
  assert.equal(result.preview.totalRubles, 180);
  assert.equal(result.preview.before.weapons.poison, 4);
  assert.equal(result.preview.before.rubles, 1_000);
  assert.equal(purchased, false);
});

test("bulk weapon contract rejects auth, conflict, rate-limit, and server failures", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-pro-prison-contract-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

  for (const status of [401, 403, 409, 429, 500]) {
    const client = {
      bosses: {
        weapons: async () => ({ ok: true, status: 200, data: { poisonCount: 0 } }),
        buyWeapon: async () => ({ ok: false, status, data: { success: false } }),
      },
      players: {
        init: async () => ({ ok: true, status: 200, data: { currencies: { rubles: 100 } } }),
      },
    };
    const service = createFeatureServiceForTest(client, stateDir);
    await assert.rejects(
      service.buyBossWeapon({
        weaponType: "poison",
        count: 1,
        dryRun: false,
        confirmed: true,
        maxRubles: 18,
        expectedUnitPrice: 18,
      }),
      new RegExp(`HTTP ${status}`),
    );
  }
});

test("bulk weapon purchase stops on incomplete reads and price changes but reports accepted partial results", async (t) => {
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "pbot-pro-prison-verification-"));
  t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

  const incompleteService = createFeatureServiceForTest({
    bosses: {
      weapons: async () => ({ ok: true, status: 200, data: { success: true } }),
    },
    players: {
      init: async () => ({ ok: true, status: 200, data: { currencies: { rubles: 100 } } }),
    },
  }, stateDir);
  await assert.rejects(
    incompleteService.buyBossWeapon({ weaponType: "knife", count: 1, dryRun: true }),
    (error) => error.code === "incomplete_api_response",
  );

  await assert.rejects(
    incompleteService.buyBossWeapon({
      weaponType: "knife",
      count: 1,
      dryRun: true,
      expectedUnitPrice: 5,
    }),
    /Цена оружия изменилась/,
  );
  await assert.rejects(
    incompleteService.buyBossWeapon({ weaponType: "knife", count: 10_001, dryRun: true }),
    /от 1 до 10 000/,
  );

  let weaponChecks = 0;
  let balanceChecks = 0;
  const partialService = createFeatureServiceForTest({
    bosses: {
      weapons: async () => {
        weaponChecks += 1;
        return {
          ok: true,
          status: 200,
          data: { knifeCount: weaponChecks === 1 ? 0 : 1 },
        };
      },
      buyWeapon: async () => ({ ok: true, status: 200, data: { success: true } }),
    },
    players: {
      init: async () => {
        balanceChecks += 1;
        return {
          ok: true,
          status: 200,
          data: { currencies: { rubles: balanceChecks === 1 ? 100 : 92 } },
        };
      },
    },
  }, stateDir);
  const partialResult = await partialService.buyBossWeapon({
    weaponType: "knife",
    count: 2,
    dryRun: false,
    confirmed: true,
    maxRubles: 8,
    expectedUnitPrice: 4,
  });
  assert.equal(partialResult.purchased, true);
  assert.equal(partialResult.verified, false);
  assert.equal(partialResult.delta.weapon, 1);
  assert.equal(partialResult.delta.rubles, -8);
});

test("poker evaluator supports all strong hands and keeps an existing pair", () => {
  assert.equal(__test.evaluatePokerHand([
    { rank: 10, suit: "hearts" },
    { rank: 11, suit: "hearts" },
    { rank: 12, suit: "hearts" },
    { rank: 13, suit: "hearts" },
    { rank: 14, suit: "hearts" },
  ]).code, "royal_flush");
  assert.equal(__test.evaluatePokerHand([
    { rank: 9, suit: "hearts" },
    { rank: 9, suit: "clubs" },
    { rank: 9, suit: "spades" },
    { rank: 4, suit: "hearts" },
    { rank: 4, suit: "diamonds" },
  ]).code, "full_house");
  assert.deepEqual(__test.choosePokerReplacementIndexes([
    { rank: 9, suit: "hearts" },
    { rank: 9, suit: "clubs" },
    { rank: 2, suit: "spades" },
    { rank: 5, suit: "hearts" },
    { rank: 13, suit: "diamonds" },
  ]), [2, 3, 4]);
});

test("mini-game reward aggregates are grouped by Moscow day and game", () => {
  const stats = __test.buildMiniGameDailyStats([
    {
      at: "2026-07-30T06:00:00.000Z",
      action: "fartovy-spin-auto",
      ok: true,
      outcome: { reward: { rubles: 10 }, newWearables: [{ id: 1 }] },
    },
    {
      at: "2026-07-30T07:00:00.000Z",
      action: "katala-finish-auto",
      ok: true,
      outcome: { reward: { rubles: 2 } },
    },
  ]);
  assert.equal(stats.length, 2);
  assert.equal(stats.find((entry) => entry.kind === "fartovy").rewards.rubles, 10);
  assert.equal(stats.find((entry) => entry.kind === "fartovy").wearables, 1);
  assert.equal(stats.find((entry) => entry.kind === "katala").actions, 1);
});

test("parcel statistics preserve dry streaks and the last wearable", () => {
  const stats = __test.buildLootContainerStats([
    { kind: "parcel", openedAt: "2026-07-30T00:00:00.000Z", rewards: {} },
    { kind: "parcel", openedAt: "2026-07-30T00:01:00.000Z", rewards: {} },
    {
      kind: "parcel",
      openedAt: "2026-07-30T00:02:00.000Z",
      rewards: { clothing: [{ id: 7, type: "clothing", name: "Куртка" }] },
    },
    { kind: "parcel", openedAt: "2026-07-30T00:03:00.000Z", rewards: {} },
  ]);

  assert.equal(stats.totalOpened, 4);
  assert.equal(stats.withWearable, 1);
  assert.equal(stats.withoutWearable, 3);
  assert.equal(stats.currentDryStreak, 1);
  assert.equal(stats.maxDryStreak, 2);
  assert.equal(stats.dropPercent, 25);
  assert.equal(stats.lastItem.name, "Куртка");
});

test("friends automation resets Moscow-day counters and retains processed IDs", () => {
  const state = normalizeFriendsAutomation({
    enabled: true,
    autoInvite: true,
    dayKey: "2000-01-01",
    invitedToday: 50,
    processedIds: [10, 20, 10],
    hourlyLimit: 7,
    dailyLimit: 30,
  });
  assert.equal(state.invitedToday, 0);
  assert.equal(state.hourlyLimit, 7);
  assert.equal(state.dailyLimit, 30);
  assert.deepEqual(state.processedIds, ["10", "20"]);
});
