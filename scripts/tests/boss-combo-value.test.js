const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { summarizeComboWeaponPool, loadComboWeaponPool } = require("../lib/boss-combo-value");

const source = fs.readFileSync(path.resolve(__dirname, "../../ui/app.js"), "utf8");

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1);
  const opening = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let index = opening; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} not closed`);
}

test("observed weapon pool counts completed combos once and excludes incomplete hits", () => {
  const event = (at, id, mode, completed, weapons) => ({
    at, type: "auto_hit_result", details: {
      item: { bossId: id, comboMode: mode, queueItemId: at },
      result: { comboEconomy: { measured: true, hasComboReward: completed, rewards: { weapons } } },
    },
  });
  const first = event("a", 8, "avtoritetny", true, { poison: 7, gunshot: 6, knife: 5 });
  const pool = summarizeComboWeaponPool([
    first, first, event("b", 10, "avtoritetny", true, { poison: 4, gunshot: 8, knife: 9 }),
    event("c", 8, "avtoritetny", false, {}),
  ]);
  assert.equal(pool.modes.avtoritetny.samples, 2);
  assert.equal(pool.modes.avtoritetny.distinctBosses, 2);
  assert.equal(pool.modes.avtoritetny.weapons.poison.mean, 5.5);
  assert.deepEqual(pool.bosses["8:avtoritetny"].weapons.knife, { min: 5, max: 5, mean: 5 });
});

test("forecast baseline stays fixed instead of drifting with live logs", async () => {
  const pool = await loadComboWeaponPool();
  assert.deepEqual([pool.modes.avtoritetny.weapons.poison.mean, pool.modes.avtoritetny.weapons.gunshot.mean, pool.modes.avtoritetny.weapons.knife.mean], [5.2, 6.4, 7]);
  assert.equal(pool.bosses["4:blotnoy"].weapons.poison.mean, 2);
});

test("Surgeon forecast subtracts spent weapons and returned rubles exactly once", () => {
  const context = {
    BOSS_COMBO_ACTION_KEYS: new Set(["punchChest", "kickBalls", "pokeEyes", "kneeEar", "poison", "gunshot", "knife"]),
    BOSS_MELEE_ACTION_KEYS: new Set(["punchChest", "kickBalls", "pokeEyes", "kneeEar"]),
    BOSS_WEAPON_ACTION_KEYS: new Set(["poison", "gunshot", "knife"]),
    BOSS_FIXED_PRICES: { poison: 18, gunshot: 5, knife: 4, restoreMelee: 3 },
  };
  vm.runInNewContext(`${extractFunction("estimateBossComboValue")}; this.estimate = estimateBossComboValue;`, context);
  const sequence = [
    ...Array(3).fill("kneeEar"), ...Array(5).fill("punchChest"),
    ...Array(2).fill("kickBalls"), "pokeEyes",
    ...Array(3).fill("poison"), "gunshot", ...Array(4).fill("knife"),
  ];
  const pool = { weapons: {
    poison: { mean: 7 }, gunshot: { mean: 6 }, knife: { mean: 5 },
  } };
  const result = context.estimate(sequence, pool, 10);
  assert.equal(result.netWeapons.poison, 4);
  assert.equal(result.netWeapons.gunshot, 5);
  assert.equal(result.netWeapons.knife, 1);
  assert.equal(result.netRublesReady, -11);
  assert.equal(result.netRublesCost, 11);
  assert.equal(result.rublesReady, 21);
  assert.equal(result.rewardRubles, 10);
  assert.equal(result.weaponCosts, 75);
  assert.equal(result.netValue, 90);
});

test("catalog uses a multi-boss mode pool and leaves unsupported modes unrated", () => {
  const context = {};
  vm.runInNewContext(`${extractFunction("resolveBossComboValuePool")}; this.pick = resolveBossComboValuePool;`, context);
  const summary = { samples: 26, distinctBosses: 6, weapons: {} };
  const singleBoss = { samples: 7, distinctBosses: 1, weapons: {} };
  const pools = {
    modes: { avtoritetny: summary, blotnoy: singleBoss },
    bosses: { "4:blotnoy": singleBoss },
  };
  assert.equal(context.pick({ id: 8 }, "avtoritetny", pools).source, "mode");
  assert.equal(context.pick({ id: 8 }, "blotnoy", pools), null);
  assert.equal(context.pick({ id: 4 }, "blotnoy", pools).source, "boss");
});
