const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateDamagePlan,
  resolveBossTargetDamage,
} = require("../../ui/damage-calculator");

test("damage action adds its percentage to the base 100%", () => {
  const plan = calculateDamagePlan({
    baseDamage: 20_000,
    actionPercent: 350,
  });

  assert.equal(plan.actionMultiplier, 4.5);
  assert.equal(plan.hitDamage, 90_000);
});

test("expected damage includes additive critical-chance buffs", () => {
  const plan = calculateDamagePlan({
    baseDamage: 20_000,
    actionPercent: 350,
    critChance: 27,
    critBonusPoints: 5,
    weaponCount: 10,
  });

  assert.equal(plan.critChance, 0.32);
  assert.equal(plan.expectedHitDamage, 118_800);
  assert.equal(plan.guaranteedDamage, 900_000);
  assert.equal(plan.expectedDamage, 1_188_000);
  assert.equal(plan.maximumDamage, 1_800_000);
});

test("target mode returns guaranteed and expected weapon counts", () => {
  const plan = calculateDamagePlan({
    baseDamage: 20_000,
    actionPercent: 350,
    critChance: 27,
    critBonusPoints: 5,
    targetDamage: 1_000_000,
  });

  assert.equal(plan.guaranteedCount, 12);
  assert.equal(plan.expectedCount, 9);
  assert.ok(plan.guaranteedPlanDamage >= 1_000_000);
  assert.ok(plan.expectedPlanDamage >= 1_000_000);
});

test("boss target accounts for the selected battle mode", () => {
  assert.equal(resolveBossTargetDamage(100_000, "pacansky"), 100_000);
  assert.equal(resolveBossTargetDamage(100_000, "vorovskoy"), 1_200_000);
  assert.equal(resolveBossTargetDamage(100_000, "odin"), 100_000);
});

test("critical chance is capped at 100%", () => {
  const plan = calculateDamagePlan({
    baseDamage: 10_000,
    critChance: 98,
    critBonusPoints: 5,
    weaponCount: 1,
  });

  assert.equal(plan.critChance, 1);
  assert.equal(plan.expectedDamage, 20_000);
  assert.equal(plan.maximumDamage, 20_000);
});
