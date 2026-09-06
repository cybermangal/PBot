const test = require("node:test");
const assert = require("node:assert/strict");

const { buildBossQueueView } = require("../scripts/lib/boss-runner");

function createCatalog(arrival = null) {
  return {
    generatedAt: "2026-04-05T00:00:00.000Z",
    account: {
      state: "idle",
      claimReady: false,
      dailyBossBattleLimit: 7,
      totalUsedToday: 0,
      activeSession: null,
    },
    bosses: [
      {
        id: 1,
        title: "Boss",
        categoryId: 1,
        categoryKey: "test",
        battleModeKeys: ["pacansky"],
        comboModeKeys: [],
        arrival,
        attacks: {
          dailyLimit: 7,
          usedToday: 0,
          remainingToday: 7,
        },
        keys: {
          requiredForAttack: 0,
          ownedSourceKeys: 0,
          bypassedForAttack: true,
          sourceBossId: null,
          sourceBossTitle: null,
          sourceLabel: null,
          rewardPerWin: 1,
          owned: 0,
          openByKeychain: false,
        },
      },
    ],
  };
}

test("openOnly does not block bosses without arrival windows", () => {
  const queue = buildBossQueueView(createCatalog(), { openOnly: true });
  const [boss] = queue.bosses;

  assert.equal(boss.arrivalOpen, null);
  assert.equal(boss.canStart, true);
  assert.equal(boss.blockedReason, null);
});

test("closed arrival windows stay blocked with openOnly enabled", () => {
  const queue = buildBossQueueView(createCatalog({
    isOpen: false,
    windowEndUtc: "2026-04-11T09:00:00Z",
  }), { openOnly: true });
  const [boss] = queue.bosses;

  assert.equal(boss.arrivalOpen, false);
  assert.equal(boss.canStart, false);
  assert.equal(boss.blockedReason, "arrival_not_open");
});
