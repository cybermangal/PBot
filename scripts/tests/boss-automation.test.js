const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { __test: bossCatalogTest } = require("../lib/boss-catalog");
const {
  buildCheapestSoloBossHitPlan,
  buildBossQueueView,
  prepareBossRunnerHit,
  prepareBossRunnerStart,
  resolveBossModeHp,
} = require("../lib/boss-runner");
const { getRequiredKeysForAttack, resolveKeySourceBoss } = require("../lib/boss-keys");
const { __test } = require("../lib/ui-service");
const mainServiceSource = fs.readFileSync(path.resolve(__dirname, "../lib/ui-service.js"), "utf8");

const automationImplementations = [["main", __test]];
const hitPlanImplementations = [["main", buildCheapestSoloBossHitPlan]];
const standaloneRoot = path.resolve(__dirname, "..", "..", "bosses-system-only");
const standaloneRunnerPath = path.join(standaloneRoot, "scripts", "lib", "boss-runner.js");
const standaloneServicePath = path.join(standaloneRoot, "scripts", "lib", "ui-service.js");

if (fs.existsSync(standaloneRunnerPath) && fs.existsSync(standaloneServicePath)) {
  const {
    buildCheapestSoloBossHitPlan: buildStandaloneCheapestSoloBossHitPlan,
  } = require(standaloneRunnerPath);
  const { __test: standaloneTest } = require(standaloneServicePath);
  automationImplementations.push(["bosses-system-only", standaloneTest]);
  hitPlanImplementations.push(["bosses-system-only", buildStandaloneCheapestSoloBossHitPlan]);
}

for (const [version, implementation] of automationImplementations) {
  test(`${version} retries a boss claim when a rapid kill is visible before its reward`, async () => {
    const closed = {
      summary: {
        bossId: 9,
        hasSession: false,
        hasReward: false,
        rewardReady: false,
        rewardClaimed: false,
        isCompleted: false,
        currentHp: null,
      },
    };
    const ready = {
      summary: {
        ...closed.summary,
        hasReward: true,
        rewardReady: true,
        isCompleted: true,
        currentHp: 0,
      },
    };
    const claimed = {
      summary: {
        ...ready.summary,
        hasReward: false,
        rewardReady: false,
        rewardClaimed: true,
      },
    };
    const snapshots = [closed, ready, claimed];
    let claimCalls = 0;
    const result = await implementation.settleBossRewardClaim({
      bosses: {
        claim: async () => {
          claimCalls += 1;
          return claimCalls === 1
            ? { ok: true, status: 200, data: { success: false, message: "reward not ready" } }
            : {
                ok: true,
                status: 200,
                data: {
                  success: true,
                  rewards: { bossId: 9, globalReward: { authority: 25 } },
                },
              };
        },
      },
    }, 9, closed, {
      completionObserved: true,
      retryDelaysMs: [0, 0],
      wait: async () => {},
      loadSnapshot: async () => snapshots.shift() || claimed,
    });

    assert.equal(claimCalls, 2);
    assert.equal(result.claim.ok, true);
    assert.equal(result.claim.rewards.authority, 25);
    assert.equal(result.snapshot.summary.rewardClaimed, true);
    assert.equal(result.pending, false);
  });

  test(`${version} persists a reward claimed by the direct boss-hit path exactly once`, async () => {
    const queueItem = {
      bossId: 1,
      queueItemId: "ui-direct-hit-reward",
      mode: "pacansky",
      label: "#1 Кирпич",
    };
    const result = {
      claim: {
        ok: true,
        response: {
          ok: true,
          status: 200,
          data: {
            success: true,
            rewards: {
              bossId: 99,
              globalReward: { authority: 25, keys: 1 },
            },
          },
        },
        rewards: {
          bossId: 99,
          authority: 25,
          keys: 1,
        },
      },
      finalSnapshot: {
        summary: {
          bossId: 99,
          hasSession: false,
          rewardClaimed: true,
        },
      },
    };
    let recordCalls = 0;
    const recordActivity = async (_response, options) => {
      recordCalls += 1;
      return {
        type: "claim",
        status: "claimed",
        claimOk: options.claimOk,
        item: options.item,
        sessionId: options.sessionId,
      };
    };

    const first = await implementation.recordBossClaimResultActivity(result, {
      item: queueItem,
      sessionId: "finished-session",
      recordActivity,
    });
    const second = await implementation.recordBossClaimResultActivity(result, {
      item: queueItem,
      sessionId: "finished-session",
      recordActivity,
    });

    assert.equal(recordCalls, 1);
    assert.equal(first, second);
    assert.equal(result.rewardActivity.claimOk, true);
    assert.equal(result.rewardActivity.item.queueItemId, queueItem.queueItemId);
    assert.equal(result.rewardActivity.item.bossId, queueItem.bossId);
    assert.equal(result.rewardActivity.sessionId, "finished-session");
  });

  test(`${version} never lets an old same-boss session cancel the new reward settlement`, () => {
    const oldTask = { bossId: 9, sessionId: "session-old" };
    const newTask = { bossId: 9, sessionId: "session-new" };

    assert.equal(
      implementation.doesBossRewardSettlementTaskMatch(oldTask, 9, "session-old"),
      true,
    );
    assert.equal(
      implementation.doesBossRewardSettlementTaskMatch(newTask, 9, "session-old"),
      false,
    );
    assert.equal(
      implementation.doesBossRewardSettlementTaskMatch(newTask, 9, null),
      true,
    );
  });

  test(`${version} claims the remembered fight before a rapid session-loss reorder`, () => {
    const lastStarted = {
      item: {
        bossId: 27,
        mode: "blotnoy",
        queueItemId: "ui-fast-session-loss",
        label: "#27 Феня",
      },
      status: "active",
      snapshot: {
        bossId: 27,
        sessionId: "fast-session-27",
        hasSession: true,
        currentHp: 45_000_000,
      },
      settle: {
        bossId: 27,
        sessionId: "fast-session-27",
        hasSession: true,
        currentHp: 45_000_000,
      },
    };
    const staleClosedSnapshot = {
      stateReliable: true,
      stateUnknown: false,
      hasSession: false,
      hasReward: false,
      rewardReady: false,
      rewardClaimed: false,
      bossId: null,
      sessionId: null,
    };

    const context = implementation.getBossAutomationSessionLossRewardContext(
      lastStarted,
      staleClosedSnapshot,
      [],
    );
    assert.equal(context.bossId, 27);
    assert.equal(context.sessionId, "fast-session-27");
    assert.equal(context.item.queueItemId, "ui-fast-session-loss");
    assert.equal(context.observedSummary.hasSession, false);
    assert.equal(context.observedSummary.isCompleted, true);
    assert.equal(
      implementation.shouldPollBossAutomationUnsettledReward(lastStarted, []),
      true,
    );

    const alreadyLogged = implementation.getBossAutomationSessionLossRewardContext(
      lastStarted,
      staleClosedSnapshot,
      [{
        item: lastStarted.item,
        sessionId: "fast-session-27",
        claimOk: true,
      }],
    );
    assert.equal(alreadyLogged, null);
    assert.equal(
      implementation.shouldPollBossAutomationUnsettledReward(lastStarted, [{
        item: lastStarted.item,
        sessionId: "fast-session-27",
        claimOk: true,
      }]),
      false,
    );
  });

  test(`${version} keeps rapid-kill settlement pending when the reward is still unavailable`, async () => {
    const closed = {
      summary: {
        bossId: 9,
        hasSession: false,
        hasReward: false,
        rewardReady: false,
        rewardClaimed: false,
        isCompleted: false,
      },
    };
    const result = await implementation.settleBossRewardClaim({
      bosses: {
        claim: async () => ({
          ok: true,
          status: 200,
          data: { success: false, message: "reward not ready" },
        }),
      },
    }, 9, closed, {
      completionObserved: true,
      retryDelaysMs: [0],
      loadSnapshot: async () => closed,
    });

    assert.equal(result.pending, true);
    assert.equal(result.snapshot.summary.stateUnknown, true);
    assert.equal(result.snapshot.summary.unknownReason, "reward_settlement_pending");
  });

  test(`${version} returns a rapid kill immediately and delegates a delayed reward`, async () => {
    const closed = {
      summary: {
        bossId: 9,
        sessionId: "fast-fight",
        hasSession: false,
        hasReward: false,
        rewardReady: false,
        rewardClaimed: false,
        isCompleted: false,
      },
    };
    let claimCalls = 0;
    let snapshotCalls = 0;
    let waitCalls = 0;
    const result = await implementation.settleBossRewardClaim({
      bosses: {
        claim: async () => {
          claimCalls += 1;
          return { ok: true, status: 200, data: { success: false } };
        },
      },
    }, 9, closed, {
      completionObserved: true,
      forceClaimOnCompletion: false,
      refreshAfterClaim: false,
      wait: async () => {
        waitCalls += 1;
      },
      loadSnapshot: async () => {
        snapshotCalls += 1;
        return closed;
      },
    });

    assert.equal(result.pending, true);
    assert.equal(result.attempts, 0);
    assert.equal(claimCalls, 0);
    assert.equal(snapshotCalls, 0);
    assert.equal(waitCalls, 0);
  });

  test(`${version} skips a duplicate settlement claim after the hit runner already claimed`, async () => {
    const result = await implementation.settleBossAutomationStartedItem(
      { bossId: 3 },
      {
        attempted: true,
        result: {
          claim: { ok: true },
          finalSnapshot: {
            summary: {
              bossId: 3,
              hasSession: false,
              hasReward: true,
              rewardReady: true,
              rewardClaimed: false,
              rewardStatus: "ready",
            },
          },
        },
      },
      null,
      null,
    );

    assert.equal(result.claim, null);
    assert.equal(result.summary.hasReward, false);
    assert.equal(result.summary.rewardReady, false);
    assert.equal(result.summary.rewardClaimed, true);
    assert.equal(result.summary.rewardStatus, "claimed");
  });

  test(`${version} prepares a solo finisher from the fast catalog path`, async () => {
    const client = {};
    const catalog = createSoloCatalog({ id: 3, title: "Makhno", baseHp: 100_000 });
    catalog.account.activeSession = {
      sessionId: "makhno-fast-finisher",
      bossId: 3,
      mode: "odin",
      currentHp: 6_000,
      maxHp: 100_000,
    };
    let receivedClient = null;
    let receivedOptions = null;
    const plan = await implementation.prepareFastSoloBossFinisherPlan(
      client,
      { bossId: 99, mode: "pacansky" },
      { bossId: 3, mode: "odin" },
      {
        buildCatalog: async (actualClient, options) => {
          receivedClient = actualClient;
          receivedOptions = options;
          return catalog;
        },
      },
    );

    assert.equal(receivedClient, client);
    assert.deepEqual(receivedOptions, { fast: true });
    assert.equal(plan.selectedBoss.id, 3);
    assert.equal(plan.selectedMode, "odin");
    assert.ok(plan.soloHitPlan.sequence.length > 0);
  });

  test(`${version} retains meaningful reward events while trimming polling noise`, () => {
    const events = [
      { type: "boss_reward_activity", details: { rewards: { authority: 25 } } },
      ...Array.from({ length: 2_100 }, (_, index) => ({
        type: index % 2 === 0 ? "tick_begin" : "tick_noop",
        index,
      })),
    ];
    const trimmed = implementation.trimBossAutomationEvents(events);

    assert.equal(trimmed.some((event) => event.type === "boss_reward_activity"), true);
    assert.ok(trimmed.length <= 800);
    assert.ok(trimmed.filter((event) => ["tick_begin", "tick_noop"].includes(event.type)).length <= 400);
  });
}

for (const [version, buildPlan] of hitPlanImplementations) {
  test(`${version} finds the Makhno finisher without scanning the full weapon inventory`, () => {
    const startedAtMs = Date.now();
    const plan = buildPlan({
      counts: { poison: 2_205, gunshot: 1_497, knife: 3_583 },
      damage: { poison: 13_139, gunshot: 4_206, knife: 1_584 },
      critChance: { poison: 0.11, gunshot: 0.31, knife: 0.21 },
    }, 6_000);
    const elapsedMs = Date.now() - startedAtMs;

    assert.deepEqual(plan.counts, { gunshot: 2 });
    assert.equal(plan.totalCost, 10);
    assert.ok(elapsedMs < 1_000, `finisher planning took ${elapsedMs}ms`);
  });
}

test("boss direct actions accept single melee hits and safe consumable multipliers", () => {
  assert.deepEqual(__test.normalizeBossWeaponBatchOptions({ weapon: "самопал", count: 1000 }), {
    weapon: "gunshot",
    count: 1000,
  });
  assert.deepEqual(__test.normalizeBossWeaponBatchOptions({ weapon: "punch", count: 1 }), {
    weapon: "punchChest",
    count: 1,
  });
  assert.throws(
    () => __test.normalizeBossWeaponBatchOptions({ weapon: "poison", count: 25 }),
    /1, 10, 50, 100, 1000/,
  );
  assert.throws(
    () => __test.normalizeBossWeaponBatchOptions({ weapon: "punch", count: 10 }),
    /exactly one hit/,
  );
});

test("Zaruba sends only duplicate stashes and keeps the last copy", async () => {
  let stashCount = 4;
  const givePayloads = [];
  const client = {
    friends: {
      profiles: async () => ({
        ok: true,
        status: 200,
        data: [
          { userId: "101", authority: 1 },
          { userId: "102", authority: 2 },
          { userId: "103", authority: 3 },
          { userId: "104", authority: 4 },
        ],
      }),
    },
    collection: {
      full: async () => ({
        ok: true,
        status: 200,
        data: {
          collections: [{
            prisonid: 7,
            collections: [{ id: 8, name: "Test set", items: [{ id: 9 }] }],
          }],
          playerProgress: {
            data: { "7": { "8": { items: { "9": stashCount } } } },
          },
        },
      }),
      give: async (payload) => {
        givePayloads.push(payload);
        if (payload.toUserId === "102") {
          return { ok: true, status: 200, data: { success: false, message: "already received" } };
        }
        stashCount -= 1;
        return { ok: true, status: 200, data: { success: true } };
      },
    },
  };
  await __test.loadLowestAuthorityTargets(client, "self", { force: true });

  const result = await __test.sendDuplicateStashes(client, "self", 3);

  assert.equal(result.successes.length, 3);
  assert.equal(result.failures.length, 1);
  assert.equal(result.reason, null);
  assert.equal(stashCount, 1);
  assert.deepEqual(givePayloads.map((payload) => ({
    toUserId: payload.toUserId,
    prisonId: payload.prisonId,
    collectionId: payload.collectionId,
    itemId: payload.itemId,
  })), [
    { toUserId: "101", prisonId: 7, collectionId: 8, itemId: 9 },
    { toUserId: "102", prisonId: 7, collectionId: 8, itemId: 9 },
    { toUserId: "103", prisonId: 7, collectionId: 8, itemId: 9 },
    { toUserId: "104", prisonId: 7, collectionId: 8, itemId: 9 },
  ]);
});

test("boss automation keeps every combo reward and persists nested reward details", () => {
  const cycles = Array.from({ length: 7 }, (_, index) => ({
    hits: [{
      type: "punchChest",
      comboReward: {
        stashCount: 30,
        weapons: [{ type: "gunshot", amount: index + 1 }],
        currencies: [{ type: "rubles", amount: 5 }],
        items: [{ type: "tattoo", id: 4200 + index, name: `Tattoo ${index + 1}` }],
      },
    }],
  }));
  const summary = __test.summarizeBossAutomationHitResult({
    cycles,
    comboEconomy: {
      measured: true,
      rewards: {
        weapons: { gunshot: 28 },
        currencies: { rubles: 35 },
      },
      net: {
        weapons: { gunshot: 28 },
        currencies: { rubles: 35 },
      },
    },
  });
  const persisted = __test.sanitizeBossAutomationValue({
    autoHit: {
      result: summary,
    },
  });

  assert.equal(summary.comboRewards.length, 7);
  assert.equal(persisted.autoHit.result.comboRewards.length, 7);
  assert.equal(persisted.autoHit.result.comboRewards[6].weapons[0].type, "gunshot");
  assert.equal(persisted.autoHit.result.comboRewards[6].items[0].name, "Tattoo 7");
  assert.equal(persisted.autoHit.result.comboEconomy.net.weapons.gunshot, 28);
});

test("boss activity compaction preserves combo loot while start and claim records merge", () => {
  const start = {
    at: "2026-07-29T18:00:00.000Z",
    type: "start",
    status: "started",
    item: { bossId: 9, queueItemId: "palych-7" },
    startElapsedMs: 420,
    comboRewards: [],
    comboEconomy: null,
  };
  const result = {
    at: "2026-07-29T18:00:20.000Z",
    type: "fight_result",
    status: "finished",
    item: { bossId: 9, queueItemId: "palych-7" },
    comboRewards: Array.from({ length: 7 }, (_, index) => ({
      stashCount: 30,
      weapons: [{ type: "gunshot", amount: index + 1 }],
    })),
    comboEconomy: {
      measured: true,
      net: { weapons: { gunshot: 28 }, currencies: {} },
    },
  };
  const claim = {
    at: "2026-07-29T18:00:21.000Z",
    type: "claim",
    status: "claimed",
    item: { bossId: 9, queueItemId: "palych-7" },
    rewards: { bossId: 9 },
    comboRewards: [],
    comboEconomy: null,
  };

  const withResult = __test.mergeBossAutomationRecentActivityRecords(start, result);
  const merged = __test.mergeBossAutomationRecentActivityRecords(withResult, claim);

  assert.equal(merged.status, "claimed");
  assert.equal(merged.startElapsedMs, 420);
  assert.equal(merged.comboRewards.length, 7);
  assert.equal(merged.comboEconomy.net.weapons.gunshot, 28);
  assert.deepEqual(merged.rewards, { bossId: 9 });
});

test("melee cooldowns expose remaining time and the three-ruble restore price", () => {
  const now = Date.parse("2026-07-29T18:00:10.000Z");
  const cooldowns = __test.buildBossMeleeCooldowns({
    weaponStats: {
      lastPunchChestTime: "2026-07-29T18:00:00Z",
      lastKickBallsTime: null,
    },
    weaponStatsEffective: {
      punchChestCooldownSec: 30,
      kickBallsCooldownSec: 9_600,
    },
  }, now);

  assert.deepEqual(cooldowns.punchChest, {
    active: true,
    cooldownSec: 30,
    lastUsedAt: "2026-07-29T18:00:00.000Z",
    readyAt: "2026-07-29T18:00:30.000Z",
    remainingMs: 20_000,
    restorePriceRubles: 3,
  });
  assert.equal(cooldowns.kickBalls.active, false);
  assert.equal(cooldowns.kickBalls.readyAt, null);
  assert.equal(cooldowns.kickBalls.restorePriceRubles, 3);
});

test("melee cooldowns read normalized session-scoped cooldown stats", () => {
  const now = Date.parse("2026-07-29T18:00:10.000Z");
  const cooldowns = __test.buildBossMeleeCooldowns({
    session: {
      weaponStats: {
        lastPunchChestTime: "2026-07-29T18:00:00Z",
      },
      weaponStatsEffective: {
        cooldownSec: {
          punchChest: 45,
        },
      },
    },
  }, now);

  assert.equal(cooldowns.punchChest.active, true);
  assert.equal(cooldowns.punchChest.cooldownSec, 45);
  assert.equal(cooldowns.punchChest.readyAt, "2026-07-29T18:00:45.000Z");
  assert.equal(cooldowns.punchChest.remainingMs, 35_000);
});

test("melee cooldowns read normalized last-used stats from dashboard weapon data", () => {
  const now = Date.parse("2026-07-29T18:00:10.000Z");
  const cooldowns = __test.buildBossMeleeCooldowns({
    weaponStatsEffective: {
      lastUsedAt: {
        punchChest: "2026-07-29T18:00:00Z",
      },
      cooldownSec: {
        punchChest: 45,
      },
    },
  }, now);

  assert.equal(cooldowns.punchChest.active, true);
  assert.equal(cooldowns.punchChest.cooldownSec, 45);
  assert.equal(cooldowns.punchChest.readyAt, "2026-07-29T18:00:45.000Z");
  assert.equal(cooldowns.punchChest.remainingMs, 35_000);
});

test("successful melee hit marks cooldown even when the final snapshot is stale", () => {
  const now = Date.parse("2026-07-29T18:00:10.000Z");
  const initialSnapshot = {
    summary: {
      hasSession: true,
      isCompleted: false,
      currentHp: 100,
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
  const staleFinalSnapshot = {
    summary: {
      ...initialSnapshot.summary,
      currentHp: 75,
      meleeCooldowns: {
        punchChest: {
          ...initialSnapshot.summary.meleeCooldowns.punchChest,
        },
      },
    },
  };

  const result = __test.applyBossMeleeCooldownAfterHit(
    staleFinalSnapshot,
    { type: "punchChest" },
    { type: "punchChest", ok: true, currentHp: 75 },
    initialSnapshot,
    now,
  );

  const cooldown = result.summary.meleeCooldowns.punchChest;
  assert.equal(cooldown.active, true);
  assert.equal(cooldown.cooldownSec, 60);
  assert.equal(cooldown.lastUsedAt, "2026-07-29T18:00:10.000Z");
  assert.equal(cooldown.readyAt, "2026-07-29T18:01:10.000Z");
  assert.equal(cooldown.remainingMs, 60_000);
  assert.equal(cooldown.optimisticUntil, "2026-07-29T18:00:15.000Z");
});

test("progressed melee hit marks cooldown even when the response ok flag is false", () => {
  const now = Date.parse("2026-07-29T18:00:10.000Z");
  const snapshot = {
    summary: {
      hasSession: true,
      isCompleted: false,
      currentHp: 75,
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

  const result = __test.applyBossMeleeCooldownAfterHit(
    snapshot,
    { type: "punchChest" },
    { type: "punchChest", ok: false, progressed: true, currentHp: 75 },
    null,
    now,
  );

  assert.equal(result.summary.meleeCooldowns.punchChest.active, true);
  assert.equal(result.summary.meleeCooldowns.punchChest.readyAt, "2026-07-29T18:01:10.000Z");
});

function createCatalog(overrides = {}) {
  return {
    generatedAt: "2026-06-05T00:00:00.000Z",
    account: {
      dailyBossBattleLimit: 7,
      totalUsedToday: 0,
      activeSession: null,
      claimReady: false,
      ...overrides.account,
    },
    bosses: [
      {
        id: 2,
        title: "Sizy",
        categoryId: 1,
        categoryKey: "bers",
        sortIndex: 1,
        baseHp: 100000,
        battleModeKeys: ["pacansky"],
        comboModeKeys: ["pacansky"],
        keys: {
          requiredForAttack: 0,
          ownedAttackKeys: 0,
          bypassedForAttack: true,
          rewardPerWin: 1,
        },
        attacks: {
          dailyLimit: 7,
          usedToday: 0,
          remainingToday: 7,
        },
      },
    ],
    ...overrides,
  };
}

function createSoloCatalog(boss) {
  return createCatalog({
    account: {
      weaponStatsEffective: {
        counts: {
          poison: 466,
          gunshot: 501,
          knife: 331,
        },
        damage: {
          poison: 13139,
          gunshot: 4206,
          knife: 1584,
          punchChest: 24,
          kickBalls: 40,
          pokeEyes: 7,
          kneeEar: 18,
        },
        critChance: {
          poison: 0.11,
          gunshot: 0.31,
          knife: 0.21,
          punchChest: 0.11,
          kickBalls: 0.21,
          pokeEyes: 0.11,
          kneeEar: 0.11,
        },
      },
    },
    bosses: [
      {
        id: boss.id,
        title: boss.title,
        categoryId: 1,
        categoryKey: "bers",
        sortIndex: boss.id,
        baseHp: boss.baseHp,
        battleModeKeys: ["odin"],
        comboModeKeys: [],
        keys: {
          requiredForAttack: 0,
          ownedAttackKeys: 0,
          bypassedForAttack: true,
          rewardPerWin: 1,
        },
        attacks: {
          dailyLimit: 7,
          usedToday: 0,
          remainingToday: 7,
        },
      },
    ],
  });
}

test("pickNumeric ignores nullish values instead of treating them as zero", () => {
  assert.equal(__test.pickNumeric(null, undefined, ""), null);
  assert.equal(__test.pickNumeric(null, "7"), 7);
  assert.equal(__test.pickNumeric(0, 7), 0);
});

test("fallback catalogs retain the persisted game key requirement", () => {
  const catalog = bossCatalogTest.buildKeySourceCatalog([], [
    { id: 5, categoryId: 1, sortIndex: 4, globalReward: { keys: 1 } },
    {
      id: 40,
      categoryId: 1,
      sortIndex: 19,
      globalReward: { keys: 0 },
      keys: {
        sourceBossId: 5,
        requiredForAttack: 3,
      },
    },
  ]);

  assert.deepEqual(resolveKeySourceBoss(40, catalog), {
    sourceBossId: 5,
    resolution: "persisted_snapshot",
  });
  assert.equal(getRequiredKeysForAttack(40, catalog), 3);
});

test("live bosses retain cached modes when a response omits battleModes", () => {
  const fallbackRewards = {
    count: 1,
    byType: { tattoo: 1 },
    preview: [{ type: "tattoo", id: 7 }],
    items: [{ type: "tattoo", id: 7 }],
  };
  const view = bossCatalogTest.resolveBossBattleModes(
    { id: 2 },
    {
      id: 2,
      battleModeKeys: ["pacansky", "odin"],
      modes: [
        { key: "pacansky", rewards: fallbackRewards, combo: null },
        { key: "odin", rewards: { count: 0, byType: {}, preview: [], items: [] }, combo: null },
      ],
    },
  );

  assert.deepEqual(view.battleModeKeys, ["pacansky", "odin"]);
  assert.equal(view.modes[0].key, "pacansky");
  assert.deepEqual(view.modes[0].rewards, fallbackRewards);
});

test("live battleModes replace cached mode availability when present", () => {
  const view = bossCatalogTest.resolveBossBattleModes(
    {
      id: 2,
      battleModes: {
        pacansky: { rewards: [] },
      },
    },
    {
      id: 2,
      battleModeKeys: ["pacansky", "odin"],
      modes: [],
    },
  );

  assert.deepEqual(view.battleModeKeys, ["pacansky"]);
  assert.deepEqual(view.modes.map((mode) => mode.key), ["pacansky"]);
});

test("boss runner uses the vory mode HP multiplier", () => {
  assert.equal(resolveBossModeHp(100, "vorovskoy"), 1200);
});

test("dailyWins map is per boss and must not create a global daily block", () => {
  const catalog = createCatalog({
    account: {
      dailyBossBattleLimit: 7,
      totalUsedToday: 7,
    },
  });
  catalog.bosses[0].attacks.usedToday = 5;
  catalog.bosses[0].attacks.remainingToday = 2;

  const queue = buildBossQueueView(catalog, { bossIds: [2], mode: "pacansky" });

  assert.equal(queue.startableCount, 1);
  assert.equal(queue.blockedCount, 0);
  assert.equal(queue.bosses[0].canStart, true);
  assert.equal(queue.bosses[0].blockedReason, null);
  assert.equal(queue.bosses[0].usedToday, 5);
  assert.equal(queue.bosses[0].dailyLimit, 7);
  assert.equal(prepareBossRunnerStart(catalog, { bossId: 2, mode: "pacansky" }).action, "start-attack");
});

test("per-boss daily limit still blocks that boss", () => {
  const catalog = createCatalog();
  catalog.bosses[0].attacks.usedToday = 7;
  catalog.bosses[0].attacks.remainingToday = 0;

  const queue = buildBossQueueView(catalog, { bossIds: [2], mode: "pacansky" });

  assert.equal(queue.startableCount, 0);
  assert.equal(queue.blockedCount, 1);
  assert.equal(queue.bosses[0].canStart, false);
  assert.equal(queue.bosses[0].blockedReason, "daily_limit_reached");
  assert.throws(
    () => prepareBossRunnerStart(catalog, { bossId: 2, mode: "pacansky" }),
    /daily_limit_reached/,
  );
});

test("missing live dailyWins entry means zero used today, not stale fallback", () => {
  assert.equal(
    bossCatalogTest.resolveBossUsedToday({ 8: 1 }, 1, 7, { hasLiveDailyWins: true }),
    0,
  );
  assert.equal(
    bossCatalogTest.resolveBossUsedToday({ 8: 1 }, 8, 7, { hasLiveDailyWins: true }),
    1,
  );
  assert.equal(
    bossCatalogTest.resolveBossUsedToday(null, 1, 7, { hasLiveDailyWins: false }),
    7,
  );
});

test("boss startability uses source boss keys, not target reward bucket", () => {
  const catalog = createCatalog({
    bosses: [
      {
        id: 15,
        title: "Borzov",
        categoryId: 2,
        categoryKey: "guards",
        sortIndex: 6,
        baseHp: 3000000,
        battleModeKeys: ["pacansky", "blotnoy"],
        comboModeKeys: ["pacansky"],
        keys: {
          requiredForAttack: 1,
          ownedAttackKeys: 0,
          owned: 0,
          ownedTargetKeys: 7,
          ownedSourceKeys: 0,
          sourceBossId: 14,
          bypassedForAttack: false,
          rewardPerWin: 1,
        },
        attacks: {
          dailyLimit: 7,
          usedToday: 0,
          remainingToday: 7,
        },
      },
    ],
  });

  const queue = buildBossQueueView(catalog, { bossIds: [15], mode: "blotnoy" });

  assert.equal(queue.bosses[0].canStart, true);
  assert.equal(queue.bosses[0].hasEnoughKeys, false);
  assert.equal(queue.bosses[0].keysOwned, 0);
  assert.equal(queue.bosses[0].ownBossKeysOwned, 7);
  assert.equal(queue.bosses[0].ownedSourceKeys, 0);
});

test("automation does not skip transient or global-limit errors", () => {
  assert.equal(
    __test.isBossAutomationSkippableError(
      new Error("Boss 2 was not found in the current catalog."),
    ),
    false,
  );
  assert.equal(
    __test.isBossAutomationSkippableError(
      new Error("Boss 2 cannot be started with the current filters: global_daily_limit_reached (global used 7/7)."),
    ),
    false,
  );
  assert.equal(
    __test.isBossAutomationSkippableError(
      new Error("Boss 2 cannot be started with the current filters: daily_limit_reached (used 7/7)."),
    ),
    true,
  );
});

test("successful start-attack confirms queue item even when snapshot misses active session", () => {
  const confirmation = __test.getBossAutomationStartConfirmation(
    { bossId: 2 },
    {
      reused: false,
      plan: {
        payload: {
          bossId: 2,
          mode: "pacansky",
        },
      },
      response: {
        ok: true,
        status: 200,
        data: {
          success: true,
          sessionId: "abc",
        },
      },
      snapshot: {
        summary: {
          bossId: null,
          hasSession: false,
          rewardBossId: null,
        },
      },
    },
  );

  assert.equal(confirmation.started, true);
  assert.equal(confirmation.reason, "start_response_success");
});

test("reused active session does not confirm queued item removal", () => {
  const confirmation = __test.getBossAutomationStartConfirmation(
    { bossId: 2 },
    {
      reused: true,
      plan: {
        payload: {
          bossId: 2,
          mode: "pacansky",
        },
      },
      snapshot: {
        summary: {
          bossId: 2,
          hasSession: true,
          sessionId: "active-session",
          currentHp: 50000,
        },
      },
    },
  );

  assert.equal(confirmation.started, false);
  assert.equal(confirmation.reason, "active_session_reused");
});

test("failed start-attack does not confirm queue item", () => {
  const confirmation = __test.getBossAutomationStartConfirmation(
    { bossId: 2 },
    {
      reused: false,
      plan: {
        payload: {
          bossId: 2,
          mode: "pacansky",
        },
      },
      response: {
        ok: true,
        status: 200,
        data: {
          success: false,
          error: "Daily limit reached",
        },
      },
      snapshot: {
        summary: {
          bossId: null,
          hasSession: false,
        },
      },
    },
  );

  assert.equal(confirmation.started, false);
  assert.equal(confirmation.reason, "start_not_confirmed");
});

test("automation rechecks a delayed boss session before reporting an unconfirmed start", async () => {
  const waits = [];
  const result = await __test.reconcileBossAutomationStartConfirmation(
    { bossId: 2 },
    {
      reused: false,
      plan: {
        action: "start-attack",
        payload: {
          bossId: 2,
          mode: "pacansky",
        },
      },
      response: {
        ok: false,
        status: 502,
        data: null,
      },
      snapshot: {
        summary: {
          bossId: 2,
          hasSession: false,
        },
      },
    },
    {
      retryDelayMs: 25,
      wait: async (delayMs) => waits.push(delayMs),
      loadSnapshot: async (bossId) => ({
        summary: {
          bossId,
          hasSession: true,
          sessionId: "delayed-session",
          currentHp: 100000,
        },
      }),
    },
  );

  assert.deepEqual(waits, [25]);
  assert.equal(result.retried, true);
  assert.equal(result.confirmation.started, true);
  assert.equal(result.confirmation.reason, "snapshot_active_session");
});

test("pending boss reward is claimed and the same start request is retried once", async () => {
  const calls = [];
  const payload = {
    bossId: 4,
    mode: "avtoritetny",
    comboMode: "blotnoy",
  };
  const initialResponse = {
    ok: false,
    status: 400,
    data: {
      success: false,
      code: "PENDING_REWARD",
      message: "Reward not claimed",
    },
  };
  const retryResponse = {
    ok: true,
    status: 200,
    data: {
      success: true,
    },
  };
  const result = await __test.retryBossStartAfterPendingReward(
    {
      bosses: {
        async claim() {
          calls.push({ type: "claim" });
          return { ok: true, status: 200, data: { success: true } };
        },
        async startAttack(nextPayload) {
          calls.push({ type: "start", payload: nextPayload });
          return retryResponse;
        },
      },
    },
    payload,
    initialResponse,
  );

  assert.equal(__test.isPendingBossRewardResponse(initialResponse), true);
  assert.deepEqual(calls, [
    { type: "claim" },
    { type: "start", payload },
  ]);
  assert.equal(result.response, retryResponse);
  assert.equal(result.recovery.claimOk, true);
  assert.equal(result.recovery.retriedStart, true);
  assert.equal(result.recovery.retryOk, true);
});

test("a reward recovered during the next start keeps the previous queue fight identity", () => {
  const activity = __test.buildBossAutomationClaimActivity(
    {
      ok: true,
      status: 200,
      data: {
        success: true,
        bossId: 11,
        rewards: {
          bossId: 11,
          globalReward: {
            keys: 1,
            currencies: [{ type: "sugar", amount: 100 }],
          },
        },
      },
    },
    {
      at: "2026-07-27T20:34:15.900Z",
      claimOk: true,
      item: {
        bossId: 11,
        mode: "pacansky",
        label: "#11 Раиса",
        queueItemId: "queue-raisa-1",
      },
    },
  );

  assert.equal(activity.status, "claimed");
  assert.equal(activity.item.bossId, 11);
  assert.equal(activity.item.queueItemId, "queue-raisa-1");
  assert.equal(activity.rewards.bossId, 11);
  assert.equal(activity.rewards.keys, 1);
  assert.deepEqual(activity.rewards.currencies, [{ type: "sugar", amount: 100 }]);
});

test("combo economy separates spent weapons, rewards, purchases, and net result", () => {
  const result = __test.buildBossComboEconomy({
    cycles: [{
      hits: [
        {
          type: "poison",
          ok: true,
          payload: { weapon: "poison", count: 3 },
          purchase: {
            attempted: true,
            ok: true,
            weaponType: "poison",
            count: 3,
            spent: 30,
            currency: "rubles",
            estimated: false,
          },
        },
        { type: "knife", ok: true, payload: { weapon: "knife", count: 2 } },
        {
          type: "punchChest",
          ok: true,
          payload: { weapon: "punchChest" },
          comboReward: {
            weapons: [
              { type: "poison", amount: 5 },
              { type: "gunshot", amount: 5 },
              { type: "knife", amount: 5 },
            ],
            currencies: [{ type: "rubles", amount: 10 }],
          },
        },
      ],
    }],
    restore: {
      succeeded: 0,
      spentByCurrency: {},
    },
  });

  assert.deepEqual(result.costs, {
    weapons: { poison: 3, knife: 2 },
    currencies: { rubles: 30 },
  });
  assert.deepEqual(result.rewards, {
    weapons: { poison: 5, gunshot: 5, knife: 5 },
    currencies: { rubles: 10 },
  });
  assert.deepEqual(result.net, {
    weapons: { poison: 2, gunshot: 5, knife: 3 },
    currencies: { rubles: -20 },
  });
  assert.deepEqual(result.rubles, {
    total: 30,
    purchases: 30,
    cooldowns: 0,
  });
  assert.equal(result.estimated, false);
});

test("combo duration prefers the combo phase over the whole solo finisher cycle", () => {
  assert.equal(__test.resolveBossComboElapsedMs({
    elapsedMs: 15_700,
    comboTiming: { elapsedMs: 3_200 },
    timing: {
      comboElapsedMs: 3_400,
      hitSequenceElapsedMs: 3_500,
      automationElapsedMs: 15_700,
    },
  }), 3_200);
});

test("fast boss hit checks the requested boss session instead of starting it again", async () => {
  const calls = [];
  const plan = await __test.prepareFastActiveBossHitPlan(
    {
      bosses: {
        async checkSession(query, requestOptions) {
          calls.push({ query, requestOptions });
          return {
            ok: true,
            status: 200,
            data: {
              success: true,
              hasSession: true,
              session: {
                sessionId: "active-4",
                bossId: 4,
                mode: "avtoritetny",
                currentHp: 500000,
                maxHp: 500000,
              },
            },
          };
        },
      },
    },
    {
      bossId: 4,
      mode: "avtoritetny",
      types: "knife",
    },
  );

  assert.deepEqual(calls, [
    {
      query: { bossId: 4 },
      requestOptions: { throttle: false },
    },
  ]);
  assert.equal(plan.startPlan.action, "reuse-active");
  assert.equal(plan.selectedBoss.id, 4);
  assert.deepEqual(plan.sequence, ["knife"]);
});

test("deferred queue head is preserved and rotated instead of deleted", () => {
  const result = __test.deferBossAutomationQueueHead(
    [
      { bossId: 2, mode: "pacansky", label: "#2 Sizy" },
      { bossId: 3, mode: "pacansky", label: "#3 Makhno" },
    ],
    "daily_limit_reached",
    "2026-06-07T00:00:00.000Z",
  );

  assert.equal(result.queue.length, 2);
  assert.equal(result.queue[0].bossId, 3);
  assert.equal(result.queue[1].bossId, 2);
  assert.equal(result.queue[1].lastDeferredReason, "daily_limit_reached");
  assert.equal(result.queue[1].lastDeferredAt, "2026-06-07T00:00:00.000Z");
  assert.equal(result.queue[1].deferredCount, 1);
});

test("stale browser queue updates cannot restore an item removed by automation", () => {
  const current = {
    queueRevision: 5,
    queue: [{ bossId: 3, mode: "pacansky", label: "#3 Makhno" }],
  };

  const stale = __test.getBossAutomationQueueUpdateDecision(current, {
    queueBaseRevision: 4,
    queue: [
      { bossId: 2, mode: "pacansky", label: "#2 Sizy" },
      { bossId: 3, mode: "pacansky", label: "#3 Makhno" },
    ],
  });
  assert.equal(stale.accepted, false);
  assert.equal(stale.reason, "queue_revision_mismatch");

  const currentRevision = __test.getBossAutomationQueueUpdateDecision(current, {
    queueBaseRevision: 5,
    queue: [],
  });
  assert.equal(currentRevision.accepted, true);

  const controlsOnly = __test.getBossAutomationQueueUpdateDecision(current, {
    intervalSec: 15,
  });
  assert.equal(controlsOnly.accepted, true);
  assert.equal(controlsOnly.hasQueueUpdate, false);
});

test("manual queue append applies to the current server queue without restoring its removed head", () => {
  const result = __test.applyBossAutomationQueueOperations(
    [{ bossId: 3, mode: "pacansky", label: "#3 Makhno" }],
    [{
      type: "append",
      item: { bossId: 4, mode: "pacansky", label: "#4 Lyutyy" },
    }],
  );

  assert.equal(result.applied.length, 1);
  assert.deepEqual(result.queue.map((item) => item.bossId), [3, 4]);
});

test("manual queue append is idempotent when a timed-out request is retried", () => {
  const item = {
    bossId: 4,
    mode: "pacansky",
    label: "#4 Lyutyy",
    queueItemId: "ui-retry-4",
  };
  const result = __test.applyBossAutomationQueueOperations(
    [item],
    [{ type: "append", item }],
  );

  assert.deepEqual(result.queue.map((entry) => entry.queueItemId), ["ui-retry-4"]);
  assert.equal(result.applied.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, "queue_item_already_present");
});

test("stale manual queue edits apply to the current queue by item identity", () => {
  const currentQueue = [
    { bossId: 3, mode: "pacansky", label: "#3 Makhno", deferredCount: 2 },
    { bossId: 4, mode: "pacansky", label: "#4 Lyutyy" },
  ];
  const result = __test.applyBossAutomationQueueOperations(currentQueue, [
    {
      type: "replace",
      from: { bossId: 3, mode: "pacansky", label: "#3 Makhno" },
      item: { bossId: 3, mode: "blotnoy", label: "#3 Makhno" },
    },
    {
      type: "remove",
      item: { bossId: 4, mode: "pacansky", label: "#4 Lyutyy" },
    },
  ]);

  assert.equal(result.applied.length, 2);
  assert.equal(result.skipped.length, 0);
  assert.deepEqual(result.queue.map((item) => item.mode), ["blotnoy"]);
  assert.equal(result.queue[0].deferredCount, 2);
});

test("queue replacements can restore default combat settings without losing server metadata", () => {
  for (const [field, nonDefault, defaultValue] of [
    ["autoKillSolo", false, true],
    ["skipCombo", true, false],
    ["finishWithNeedle", true, false],
    ["hitTypes", ["punchChest"], []],
  ]) {
    const from = { bossId: 3, mode: "odin", queueItemId: "toggle-test", [field]: nonDefault };
    for (const explicitDefault of [false, true]) {
      const item = { ...from };
      if (explicitDefault) item[field] = defaultValue;
      else delete item[field];
      const result = __test.applyBossAutomationQueueOperations(
        [{ ...from, deferredCount: 2, lastDeferredReason: "daily_limit_reached" }],
        [{ type: "replace", from, item }],
      );
      assert.equal(result.applied.length, 1);
      assert.equal(result.skipped.length, 0);
      assert.equal(result.queue[0][field], undefined, `${field} should return to its default`);
      assert.equal(result.queue[0].queueItemId, from.queueItemId);
      assert.equal(result.queue[0].deferredCount, 2);
      assert.equal(result.queue[0].lastDeferredReason, "daily_limit_reached");
      const toggledBack = __test.applyBossAutomationQueueOperations(result.queue, [
        { type: "replace", from: result.queue[0], item: from },
      ]);
      assert.equal(toggledBack.applied.length, 1);
      assert.deepEqual(toggledBack.queue[0][field], nonDefault);
    }
  }
});

test("automation defers only the live queue head and preserves concurrent edits", () => {
  const currentQueue = [
    { bossId: 3, mode: "pacansky", label: "#3 Makhno", queueItemId: "head" },
    { bossId: 4, mode: "pacansky", label: "#4 Lyutyy", queueItemId: "tail" },
    { bossId: 5, mode: "pacansky", label: "#5 Kirpich", queueItemId: "added-while-running" },
  ];
  const deferred = __test.applyBossAutomationQueueOperations(currentQueue, [{
    type: "defer",
    item: currentQueue[0],
    reason: "daily_limit_reached",
    at: "2026-08-05T12:00:00.000Z",
  }]);

  assert.equal(deferred.applied.length, 1);
  assert.deepEqual(deferred.queue.map((item) => item.queueItemId), ["tail", "added-while-running", "head"]);
  assert.equal(deferred.queue[2].lastDeferredReason, "daily_limit_reached");
  assert.equal(deferred.queue[2].deferredCount, 1);

  const stale = __test.applyBossAutomationQueueOperations(currentQueue.slice(1), [{
    type: "defer",
    item: currentQueue[0],
    reason: "daily_limit_reached",
  }]);
  assert.equal(stale.applied.length, 0);
  assert.equal(stale.skipped[0].reason, "queue_item_not_found");
  assert.deepEqual(stale.queue.map((item) => item.queueItemId), ["tail", "added-while-running"]);
});

test("queue item ID targets the intended duplicate after the queue changes", () => {
  const result = __test.applyBossAutomationQueueOperations([
    { bossId: 40, mode: "blotnoy", label: "#40 Abu", queueItemId: "first" },
    { bossId: 40, mode: "blotnoy", label: "#40 Abu", queueItemId: "second" },
  ], [{
    type: "remove",
    item: { bossId: 40, mode: "blotnoy", label: "#40 Abu", queueItemId: "second" },
  }]);

  assert.equal(result.applied.length, 1);
  assert.deepEqual(result.queue.map((item) => item.queueItemId), ["first"]);
});

test("manual queue clear applies even after automation has changed the queue", () => {
  const result = __test.applyBossAutomationQueueOperations(
    [{ bossId: 40, mode: "blotnoy", label: "#40 Abu" }],
    [{ type: "clear" }],
  );

  assert.deepEqual(result.queue, []);
  assert.equal(result.applied.length, 1);
});

test("automation queue entries preserve stored combo hit types", () => {
  const entry = __test.normalizeBossAutomationQueueEntry({
    bossId: 2,
    mode: "pacansky",
    comboMode: "pacansky",
    hitTypes: ["punchChest", "kickBalls", "unknown", "poison"],
    autoKillSolo: false,
  });

  assert.equal(entry.bossId, 2);
  assert.deepEqual(entry.hitTypes, ["punchChest", "kickBalls", "poison"]);
  assert.equal(entry.autoKillSolo, false);
});

test("empty live combo mode list overrides stale cached combo metadata", () => {
  const catalog = createCatalog();
  catalog.bosses[0].comboModeKeys = [];
  catalog.bosses[0].combos = {};
  catalog.bosses[0].modes = [{
    key: "pacansky",
    combo: { length: 7 },
  }];

  const queue = buildBossQueueView(catalog, { bossIds: [2], mode: "pacansky" });

  assert.deepEqual(queue.bosses[0].availableComboModes, []);
  assert.throws(
    () => prepareBossRunnerStart(catalog, {
      bossId: 2,
      mode: "pacansky",
      comboMode: "pacansky",
    }),
    /has no combo modes/,
  );
});

test("automation queue clears saved combos that the live catalog removed", () => {
  const cleanup = __test.removeUnavailableBossAutomationQueueCombos([
    {
      bossId: 3,
      mode: "odin",
      comboMode: "pacansky",
      hitTypes: ["punchChest", "knife"],
      finishWithNeedle: true,
    },
    { bossId: 5, comboMode: "avtoritetny", hitTypes: ["knife"] },
    { bossId: 99, comboMode: "pacansky", hitTypes: ["knife"] },
  ], {
    bosses: [
      { id: 3, comboModeKeys: [] },
      { id: 5, comboModeKeys: ["pacansky", "avtoritetny"] },
    ],
  });

  assert.equal(cleanup.removed.length, 1);
  assert.equal(cleanup.queue[0].comboMode, "");
  assert.equal(cleanup.queue[0].hitTypes, undefined);
  assert.equal(cleanup.queue[0].finishWithNeedle, undefined);
  assert.equal(cleanup.queue[1].comboMode, "avtoritetny");
  assert.equal(cleanup.queue[2].comboMode, "pacansky");
});

test("missing-key preflight removes invalid auto entries but preserves manual entries", () => {
  assert.match(mainServiceSource, /const autoGenerated = String\(item && item\.origin/);
  assert.match(mainServiceSource, /type: autoGenerated \? "remove" : "defer"/);
  assert.match(mainServiceSource, /"queue_item_removed_missing_keys"/);
});

test("Zaruba damage falls back only when a saved combo did not finish the task", () => {
  const item = {
    bossId: 4,
    origin: "manual+zaruba",
    serverTaskId: "task-4",
    zarubaObjective: "damage",
    comboMode: "pacansky",
  };
  assert.equal(
    __test.shouldRunZarubaDamageFallback(
      item,
      ["punchChest", "kickBalls"],
      { checked: true, task: { completed: false } },
    ),
    true,
  );
  assert.equal(
    __test.shouldRunZarubaDamageFallback(
      { ...item, comboMode: "" },
      ["knife"],
      { checked: true, task: { completed: false } },
    ),
    false,
  );
  assert.equal(
    __test.shouldRunZarubaDamageFallback(
      item,
      ["punchChest"],
      { checked: true, task: { completed: true } },
    ),
    false,
  );

  const merged = __test.mergeZarubaDamageFallbackResult(
    { cycles: [{ hits: [{ key: "punchChest" }] }], finalSnapshot: { summary: { currentHp: 100 } } },
    { cycles: [{ hits: [{ key: "knife" }] }], finalSnapshot: { summary: { currentHp: 0 } } },
  );
  assert.equal(merged.cycles.length, 2);
  assert.equal(merged.finalSnapshot.summary.currentHp, 0);
  assert.equal(merged.zarubaDamageFallback.type, null);
  assert.match(mainServiceSource, /buildLiveZarubaDamageWeaponPlan/);
  assert.match(mainServiceSource, /autoBuyMissingWeapons: false/);
});

test("automation run status reports quick reward claim as claimed", () => {
  const status = __test.getBossAutomationRunStatus(
    {
      snapshot: {
        summary: {
          hasSession: false,
          hasReward: false,
          rewardReady: false,
          rewardClaimed: true,
          currentHp: 0,
        },
      },
      claim: {
        ok: true,
      },
    },
    {
      attempted: true,
      result: {
        finalSnapshot: {
          summary: {
            currentHp: 0,
          },
        },
      },
    },
  );

  assert.equal(status, "claimed");
});

test("automation summary keeps actual claimed combo reward contents", () => {
  const summary = __test.summarizeBossAutomationResponse({
    ok: true,
    status: 200,
    data: {
      success: true,
      rewards: {
        bossId: 30,
        title: "Chugun",
        mode: "pacansky",
        reward: [{ type: "tattoo", tattooId: 3637 }],
        globalReward: {
          authority: 10_000,
          keys: 1,
          currencies: [{ type: "sugar", amount: 10_000 }],
        },
        stashGearReward: [{ id: 32, name: "Match", qty: 2 }],
      },
    },
  });

  assert.deepEqual(summary.rewards, {
    bossId: 30,
    title: "Chugun",
    mode: "pacansky",
    items: [{ type: "tattoo", id: 3637, name: null, amount: null }],
    stashGear: [{ type: null, id: 32, name: "Match", amount: 2 }],
    currencies: [{ type: "sugar", amount: 10_000 }],
    authority: 10_000,
    keys: 1,
  });
});

test("automation summary keeps direct claimed reward payload contents", () => {
  const summary = __test.summarizeBossAutomationResponse({
    ok: true,
    status: 200,
    data: {
      success: true,
      bossId: 31,
      title: "Direct",
      mode: "odin",
      reward: [{ type: "tattoo", tattooId: 4201 }],
      globalReward: {
        authority: 1200,
        keys: 2,
      },
      stashGearReward: [{ id: 33, name: "Wire", qty: 3 }],
    },
  });

  assert.deepEqual(summary.rewards, {
    bossId: 31,
    title: "Direct",
    mode: "odin",
    items: [{ type: "tattoo", id: 4201, name: null, amount: null }],
    stashGear: [{ type: null, id: 33, name: "Wire", amount: 3 }],
    currencies: [],
    authority: 1200,
    keys: 2,
  });
});

test("combo hit response keeps direct combo and stash rewards", () => {
  const reward = __test.summarizeBossComboReward({
    ok: true,
    status: 200,
    data: {
      combo: {
        lastOutcome: "completed",
      },
      comboReward: {
        authority: 8_000,
        currencies: [{ type: "cigarettes", amount: 8_000 }, { type: "rubles", amount: 15 }],
        stash: { icon: "hidesicon", count: 90 },
        tattoos: [{ id: 4210 }],
        weapons: { knife: 8, gunshot: 6, poison: 6 },
      },
      zshReward: {
        drops: [{ id: 32, name: "Match", qty: 2 }],
      },
    },
  });

  assert.deepEqual(reward, {
    outcome: "completed",
    items: [{ type: "tattoo", id: 4210, name: null, amount: null }],
    stashGear: [{ type: "stash", id: 32, name: "Match", amount: 2 }],
    stashCount: 90,
    currencies: [{ type: "cigarettes", amount: 8_000 }, { type: "rubles", amount: 15 }],
    weapons: [
      { type: "knife", id: null, name: null, amount: 8 },
      { type: "gunshot", id: null, name: null, amount: 6 },
      { type: "poison", id: null, name: null, amount: 6 },
    ],
    authority: 8_000,
    keys: null,
  });
});

test("combo run summary distinguishes completed and unfinished started combos", () => {
  const completed = __test.summarizeBossComboRun({
    cycles: [{
      hits: [{
        combo: {
          selectedType: "avtoritetny",
          progress: 25,
          required: 25,
          lastOutcome: "completed",
        },
        comboReward: { authority: 8_000 },
      }],
    }],
    haltedReason: "session_finished",
  }, 25);

  assert.deepEqual(completed, {
    completed: true,
    configuredHits: 25,
    sentHits: 1,
    progress: 25,
    required: 25,
    lastOutcome: "completed",
    haltedReason: "session_finished",
    reason: null,
  });

  const incomplete = __test.summarizeBossComboRun({
    cycles: [{
      hits: [{
        combo: {
          selectedType: "avtoritetny",
          progress: 8,
          required: 25,
          lastOutcome: "hit",
        },
      }],
    }],
    haltedReason: "session_finished",
  }, 25);

  assert.deepEqual(incomplete, {
    completed: false,
    configuredHits: 25,
    sentHits: 1,
    progress: 8,
    required: 25,
    lastOutcome: "hit",
    haltedReason: "session_finished",
    reason: "boss_finished_before_combo_completed",
  });
});

test("consumable shortage is recognized only for the missing consumable", () => {
  const noPoison = {
    ok: false,
    status: 400,
    data: { message: "insufficient poison (0)" },
  };

  assert.equal(__test.isBossConsumableShortageResponse(noPoison, "poison"), true);
  assert.equal(__test.isBossConsumableShortageResponse(noPoison, "punchChest"), false);
  assert.equal(
    __test.isBossConsumableShortageResponse(
      { ok: false, status: 400, data: { message: "weapon cooldown active" } },
      "poison",
    ),
    false,
  );
});

test("rate limited response is recognized for melee acceleration fallback", () => {
  assert.equal(
    __test.isBossRateLimitedResponse({
      ok: false,
      status: 429,
      data: { message: "Too many requests. Slow down." },
    }),
    true,
  );
  assert.equal(
    __test.isBossRateLimitedResponse({
      ok: false,
      status: 400,
      data: { message: "weapon cooldown active" },
    }),
    false,
  );
  assert.equal(
    __test.isBossRateLimitedResponse({
      ok: true,
      status: 200,
      data: { success: true },
    }),
    false,
  );
});

test("combo runner buys the exact missing consumable once and retries the hit", async () => {
  let useCalls = 0;
  const purchased = [];
  const client = {
    bosses: {
      useWeapon: async () => {
        useCalls += 1;
        return useCalls === 1
          ? {
              ok: false,
              status: 400,
              data: { message: "insufficient poison (0)" },
            }
          : { ok: true, status: 200, data: { success: true, currentHp: 90, damage: 10 } };
      },
      buyWeapon: async (payload) => {
        purchased.push(payload);
        return { ok: true, status: 200, data: { success: true } };
      },
      checkSession: async () => ({
        ok: true,
        status: 200,
        data: {
          success: true,
          hasSession: true,
          session: {
            sessionId: "test-session",
            bossId: 1,
            mode: "pacansky",
            currentHp: 90,
            baseHp: 100,
          },
        },
      }),
    },
  };
  const plan = {
    selectedBoss: { id: 1, baseHp: 100, title: "Test boss" },
    selectedMode: "pacansky",
    targetHp: 100,
    startPlan: {
      action: "reuse-active",
      activeSession: {
        session: {
          sessionId: "test-session",
          bossId: 1,
          mode: "pacansky",
          currentHp: 100,
          baseHp: 100,
        },
      },
    },
    requests: [{ type: "poison", payload: { weapon: "poison", count: 2 } }],
  };

  const result = await __test.executeBossRunnerLoop(client, plan, {
    autoBuyMissingWeapons: true,
    claimWhenReady: false,
    continueOnError: false,
    fastMode: true,
    snapshotAfterEachHit: false,
    throttleWeaponRequests: false,
  });

  assert.equal(useCalls, 2);
  assert.deepEqual(purchased, [{ weaponType: "poison", count: 2 }]);
  assert.deepEqual(result.weaponPurchases, { attempted: 1, succeeded: 1, failed: 0 });
  assert.equal(result.cycles[0].hits[0].purchase.ok, true);
});

test("automation quick chain starts only after closed settled state", () => {
  assert.equal(
    __test.shouldBossAutomationChainAfterSettle(
      {
        snapshot: {
          summary: {
            hasSession: false,
            hasReward: false,
            rewardReady: false,
            stateUnknown: false,
          },
        },
      },
      [{ bossId: 3 }],
      0,
    ),
    true,
  );
  assert.equal(
    __test.shouldBossAutomationChainAfterSettle(
      {
        snapshot: {
          summary: {
            hasSession: true,
            hasReward: false,
            rewardReady: false,
            stateUnknown: false,
          },
        },
      },
      [{ bossId: 3 }],
      0,
    ),
    false,
  );
});

test("automation clears queue saved for a previous Moscow date", () => {
  const state = __test.normalizeBossAutomationState(
    {
      enabled: true,
      autoStartNext: true,
      intervalSec: 10,
      queueDate: "2026-06-06",
      updatedAt: "2026-06-06T20:30:00.000Z",
      queue: [
        { bossId: 2, mode: "pacansky", label: "#2 Sizy" },
      ],
    },
    { now: new Date("2026-06-06T21:30:00.000Z") },
  );

  assert.equal(state.queueDate, "2026-06-07");
  assert.deepEqual(state.queue, []);
  assert.equal(state.enabled, true);
  assert.equal(state.autoStartNext, true);
});

test("automation preserves queue saved for the current Moscow date", () => {
  const state = __test.normalizeBossAutomationState(
    {
      enabled: true,
      autoStartNext: true,
      intervalSec: 10,
      queueDate: "2026-06-07",
      updatedAt: "2026-06-06T22:00:00.000Z",
      queue: [
        { bossId: 2, mode: "pacansky", label: "#2 Sizy" },
      ],
    },
    { now: new Date("2026-06-06T22:30:00.000Z") },
  );

  assert.equal(state.queueDate, "2026-06-07");
  assert.equal(state.queue.length, 1);
  assert.equal(state.queue[0].bossId, 2);
});

test("auto-start queue runs even when UI auto refresh is off", () => {
  assert.equal(
    __test.shouldRunBossAutomationQueue({
      enabled: false,
      autoStartNext: true,
      queue: [{ bossId: 2 }],
    }),
    true,
  );
  assert.equal(
    __test.shouldRunBossAutomationQueue({
      enabled: true,
      autoStartNext: false,
      queue: [{ bossId: 2 }],
    }),
    false,
  );
});

test("legacy automation queue date falls back to updatedAt", () => {
  const state = __test.normalizeBossAutomationState(
    {
      enabled: true,
      autoStartNext: true,
      intervalSec: 10,
      updatedAt: "2026-06-06T20:30:00.000Z",
      queue: [
        { bossId: 2, mode: "pacansky", label: "#2 Sizy" },
      ],
    },
    { now: new Date("2026-06-06T21:30:00.000Z") },
  );

  assert.equal(state.queueDate, "2026-06-07");
  assert.deepEqual(state.queue, []);
});

test("solo boss hit plan uses one knife for Kirpich", () => {
  const plan = prepareBossRunnerHit(createSoloCatalog({
    id: 1,
    title: "Kirpich",
    baseHp: 1000,
  }), {
    bossId: 1,
    mode: "odin",
  });

  assert.deepEqual(plan.sequence, ["knife"]);
  assert.equal(plan.soloHitPlan.sufficient, true);
  assert.equal(plan.soloHitPlan.totalCost, 4);
});

test("solo boss hit plan uses two gunshots and one knife for Sizy", () => {
  const plan = prepareBossRunnerHit(createSoloCatalog({
    id: 2,
    title: "Sizy",
    baseHp: 10000,
  }), {
    bossId: 2,
    mode: "odin",
  });

  assert.deepEqual(plan.sequence, ["gunshot", "gunshot", "knife"]);
  assert.equal(plan.soloHitPlan.sufficient, true);
  assert.equal(plan.soloHitPlan.totalCost, 14);
  assert.equal(plan.soloHitPlan.rawDamage, 9996);
});

test("explicit hit types override solo boss auto plan", () => {
  const plan = prepareBossRunnerHit(createSoloCatalog({
    id: 2,
    title: "Sizy",
    baseHp: 10000,
  }), {
    bossId: 2,
    mode: "odin",
    types: "poison",
  });

  assert.deepEqual(plan.sequence, ["poison"]);
  assert.equal(plan.soloHitPlan, null);
});

test("solo combo schedules a finisher only while the same fight is still active", () => {
  const options = {
    bossId: 2,
    mode: "odin",
    comboMode: "pacansky",
    types: "punchChest,kickBalls",
  };
  const plan = { selectedMode: "odin" };
  const activeResult = {
    finalSnapshot: {
      summary: {
        bossId: 2,
        mode: "odin",
        hasSession: true,
        isCompleted: false,
        rewardReady: false,
        currentHp: 7500,
      },
    },
  };

  assert.equal(__test.shouldRunSoloBossFinisher(options, plan, activeResult), true);
  assert.equal(__test.shouldRunSoloBossFinisher({ ...options, autoKillSolo: false }, plan, activeResult), false);
  assert.equal(
    __test.shouldRunSoloBossFinisher({ ...options, comboMode: "" }, plan, activeResult),
    false,
  );
  assert.equal(
    __test.shouldRunSoloBossFinisher(options, { selectedMode: "pacansky" }, {
      finalSnapshot: { summary: { ...activeResult.finalSnapshot.summary, mode: "pacansky" } },
    }),
    false,
  );
  assert.equal(
    __test.shouldRunSoloBossFinisher(options, plan, {
      finalSnapshot: {
        summary: {
          ...activeResult.finalSnapshot.summary,
          hasSession: false,
          isCompleted: true,
          rewardReady: true,
          currentHp: 0,
        },
      },
    }),
    false,
  );
});

test("solo finisher keeps combo hits separate and exposes the finished fight state", () => {
  const comboResult = {
    haltedReason: "max_cycles_reached",
    elapsedMs: 10,
    timing: {
      startedAt: "2026-07-17T00:00:00.000Z",
      finishedAt: "2026-07-17T00:00:00.010Z",
      elapsedMs: 10,
    },
    cycles: [{ hits: [{ type: "punchChest" }, { type: "kickBalls" }] }],
    finalSnapshot: { summary: { mode: "odin", hasSession: true, currentHp: 100 } },
    weaponDelta: {
      measured: true,
      before: { poison: 5 },
      after: { poison: 4 },
      delta: { poison: -1 },
      capturedAt: "2026-07-17T00:00:00.010Z",
      error: null,
    },
  };
  const finisherResult = {
    plan: { sequence: ["poison"] },
    haltedReason: "session_finished",
    elapsedMs: 20,
    timing: {
      startedAt: "2026-07-17T00:00:00.011Z",
      finishedAt: "2026-07-17T00:00:00.031Z",
      elapsedMs: 20,
    },
    cycles: [{ hits: [{ type: "poison" }] }],
    finalSnapshot: {
      summary: {
        mode: "odin",
        hasSession: false,
        isCompleted: true,
        rewardReady: true,
        currentHp: 0,
      },
    },
    claim: { ok: true },
    weaponDelta: {
      measured: true,
      before: { poison: 4 },
      after: { poison: 3 },
      delta: { poison: -1 },
      capturedAt: "2026-07-17T00:00:00.031Z",
      error: null,
    },
  };

  const result = __test.mergeSoloBossComboAndFinisherResult(comboResult, finisherResult, {
    preparationElapsedMs: 5,
  });

  assert.equal(result.elapsedMs, 35);
  assert.equal(result.timing.finisherPreparationElapsedMs, 5);
  assert.equal(result.timing.finisherHitElapsedMs, 20);
  assert.equal(result.soloFinisher.elapsedMs, 25);
  assert.equal(result.soloFinisher.preparationElapsedMs, 5);
  assert.equal(result.soloFinisher.hitElapsedMs, 20);
  assert.equal(result.haltedReason, "session_finished");
  assert.equal(result.finalSnapshot.summary.currentHp, 0);
  assert.equal(result.claim.ok, true);
  assert.equal(result.cycles.length, 1);
  assert.equal(result.cycles[0].hits.length, 2);
  assert.equal(result.soloFinisher.hits, 1);
  assert.equal(result.soloFinisher.plan.sequence[0], "poison");
  assert.equal(result.weaponDelta.delta.poison, -2);
});

test("hit plan uses active session when selected boss is stale", () => {
  const catalog = createCatalog({
    account: {
      activeSession: {
        sessionId: "active-8",
        bossId: 8,
        mode: "pacansky",
        currentHp: 25699969,
        maxHp: 30000000,
        personalDamage: 0,
        endsAt: "2026-07-08T07:32:02Z",
      },
    },
    bosses: [
      {
        id: 1,
        title: "Kirpich",
        categoryId: 1,
        categoryKey: "bers",
        sortIndex: 0,
        baseHp: 1000,
        battleModeKeys: ["odin"],
        comboModeKeys: [],
        keys: {
          requiredForAttack: 0,
          ownedAttackKeys: 0,
          bypassedForAttack: true,
          rewardPerWin: 1,
        },
        attacks: {
          dailyLimit: 7,
          usedToday: 0,
          remainingToday: 7,
        },
      },
      {
        id: 8,
        title: "Hirurg",
        categoryId: 1,
        categoryKey: "bers",
        sortIndex: 7,
        baseHp: 30000000,
        battleModeKeys: ["pacansky", "odin"],
        comboModeKeys: [],
        keys: {
          requiredForAttack: 0,
          ownedAttackKeys: 0,
          bypassedForAttack: true,
          rewardPerWin: 1,
        },
        attacks: {
          dailyLimit: 7,
          usedToday: 0,
          remainingToday: 7,
        },
      },
    ],
  });

  const plan = prepareBossRunnerHit(catalog, {
    bossId: 1,
    mode: "odin",
    types: "knife",
  });

  assert.equal(plan.startPlan.action, "reuse-active");
  assert.equal(plan.startPlan.reason, "active_session_overrides_requested_boss");
  assert.equal(plan.startPlan.requestedBossId, 1);
  assert.equal(plan.selectedBoss.id, 8);
  assert.equal(plan.selectedMode, "pacansky");
  assert.deepEqual(plan.sequence, ["knife"]);
  assert.throws(
    () => prepareBossRunnerStart(catalog, { bossId: 1, mode: "odin" }),
    /Active boss session already exists for boss 8/,
  );
});

test("failed start-attack is not confirmed by matching empty check-session bossId", () => {
  const confirmation = __test.getBossAutomationStartConfirmation(
    { bossId: 3 },
    {
      reused: false,
      plan: {
        payload: {
          bossId: 3,
          mode: "pacansky",
        },
      },
      response: {
        ok: true,
        status: 200,
        data: {
          success: false,
          error: "Not enough keys",
        },
      },
      snapshot: {
        summary: {
          bossId: 3,
          hasSession: false,
          sessionId: null,
          currentHp: null,
          rewardBossId: 3,
        },
      },
    },
  );

  assert.equal(confirmation.started, false);
  assert.equal(confirmation.reason, "start_not_confirmed");
});

test("failed check-session summary is explicitly unknown", () => {
  const session = __test.summarizeBossCheckSession({
    ok: false,
    status: 429,
    data: {
      success: false,
      error: "Too many requests. Slow down.",
    },
  });

  assert.equal(session.ok, false);
  assert.equal(session.hasSession, false);
  assert.equal(session.currentHp, null);
});

test("check-session object confirms an active fight even when hasSession lags", () => {
  const session = __test.summarizeBossCheckSession({
    ok: true,
    status: 200,
    data: {
      success: true,
      hasSession: false,
      session: {
        sessionId: "lagged-session",
        bossId: 4,
        mode: "pacansky",
        currentHp: 75000,
        baseHp: 100000,
      },
    },
  });

  assert.equal(session.hasSession, true);
  assert.equal(session.bossId, 4);
  assert.equal(session.currentHp, 75000);

  const confirmation = __test.getBossAutomationStartConfirmation(
    { bossId: 4 },
    {
      reused: false,
      plan: { action: "start-attack", payload: { bossId: 4, mode: "pacansky" } },
      response: { ok: true, status: 200, data: { success: true } },
      snapshot: {
        summary: {
          bossId: session.bossId,
          hasSession: session.hasSession,
          sessionId: session.sessionId,
          currentHp: session.currentHp,
        },
      },
    },
  );

  assert.equal(confirmation.started, true);
  assert.equal(confirmation.reason, "snapshot_active_session");
});

test("completed boss runtime snapshot is not treated as an active fight", async () => {
  const snapshot = await __test.loadBossRuntimeSnapshot({
    bosses: {
      checkSession: async () => ({
        ok: true,
        status: 200,
        data: {
          success: true,
          hasSession: true,
          hasReward: false,
          session: {
            sessionId: "finished",
            bossId: 2,
            mode: "pacansky",
            currentHp: 0,
            baseHp: 100000,
            isCompleted: true,
            rewardClaimed: false,
          },
        },
      }),
      friendDamage: async () => ({
        ok: true,
        status: 200,
        data: {
          success: true,
          currentHp: 0,
          isOver: true,
          items: [],
        },
      }),
      rewards: async () => ({
        ok: true,
        status: 200,
        data: {
          success: true,
          ready: false,
          status: "none",
        },
      }),
    },
  }, 2);

  assert.equal(snapshot.summary.isCompleted, true);
  assert.equal(snapshot.summary.hasSession, false);
  assert.equal(snapshot.summary.rewardReady, true);
});

test("active boss snapshot hides stale global reward identity", async () => {
  const snapshot = await __test.loadBossRuntimeSnapshot({
    bosses: {
      checkSession: async () => ({
        ok: true,
        status: 200,
        data: {
          success: true,
          hasSession: true,
          hasReward: false,
          session: {
            sessionId: "active",
            bossId: 32,
            mode: "pacansky",
            currentHp: 1000000,
            baseHp: 1000000,
            isCompleted: false,
            rewardClaimed: false,
          },
        },
      }),
      friendDamage: async () => ({
        ok: true,
        status: 200,
        data: {
          success: true,
          currentHp: 1000000,
          isOver: false,
          items: [],
        },
      }),
      rewards: async () => ({
        ok: true,
        status: 200,
        data: {
          success: true,
          ready: false,
          status: "none",
          rewards: {
            bossId: 39,
            sessionId: "previous",
          },
        },
      }),
    },
  }, 32);

  assert.equal(snapshot.summary.hasSession, true);
  assert.equal(snapshot.summary.rewardReady, false);
  assert.equal(snapshot.summary.rewardBossId, null);
  assert.equal(snapshot.summary.rewardSessionId, null);
});


test("automation preserves combo opt-out independently from solo killing", () => {
  for (const autoKillSolo of [true, false]) {
    const entry = __test.normalizeBossAutomationQueueEntry({
      bossId: 2, mode: "odin", comboMode: "pacansky", skipCombo: true, autoKillSolo,
    });
    assert.equal(entry.skipCombo, true);
    assert.equal(entry.autoKillSolo !== false, autoKillSolo);
    const payload = __test.buildBossAutomationStartPayload(entry);
    assert.equal(payload.comboMode, undefined);
    assert.equal(payload.mode, "odin");
  }
});
