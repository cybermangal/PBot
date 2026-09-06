const assert = require("node:assert/strict");
const test = require("node:test");
const { __test: { estimateBossComboRubles, assertBossComboAffordable } } = require("../lib/ui-service");

test("combo budget accounts for inventory, repeated melee and active cooldowns", () => {
  const sequence = ["knife", "knife", "poison", "punchChest", "punchChest", "kickBalls"];
  const counts = { knife: 1, poison: 0 };
  const cooldowns = { kickBalls: { remainingMs: 10000 } };
  assert.equal(estimateBossComboRubles(sequence, counts, cooldowns, {
    autoBuyMissingWeapons: true, autoRestoreMeleeCooldown: true,
  }), 28);
  assert.equal(counts.knife, 1);
  assert.equal(estimateBossComboRubles(["punchChest", "punchChest"], {}, {
    punchChest: { cooldownSec: 1 },
  }, { delayMs: 1000 }), 0);
});

test("combo pauses below the full cost and accepts the exact balance", async () => {
  let rubles = 21;
  const client = {
    players: { init: async () => ({ ok: true, data: { currencies: { rubles } } }) },
    bosses: {
      weapons: async () => ({ ok: true, data: { knifeCount: 0, poisonCount: 0, gunshotCount: 0 } }),
      checkSession: async () => ({ ok: true, data: { hasSession: true, session: {} } }),
    },
  };
  const options = { autoBuyMissingWeapons: true };
  await assert.rejects(assertBossComboAffordable(client, ["knife", "poison"], options), /нужно 22 ₽, доступно 21 ₽/);
  rubles = 22;
  await assertBossComboAffordable(client, ["knife", "poison"], options);
  rubles = undefined;
  await assert.rejects(assertBossComboAffordable(client, ["knife"], options), /не удалось проверить/);
});
