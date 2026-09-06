(function initPbotDamageCalculator(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PbotDamageCalculator = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  const BOSS_MODE_HP_MULTIPLIERS = Object.freeze({
    pacansky: 1,
    blotnoy: 3,
    avtoritetny: 6,
    vorovskoy: 12,
    odin: 1,
  });

  function toFiniteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function normalizeCritChance(value) {
    const parsed = Math.max(0, toFiniteNumber(value, 0));
    const ratio = parsed > 1 ? parsed / 100 : parsed;
    return Math.min(1, ratio);
  }

  function normalizeActionPercent(value) {
    return Math.min(10000, Math.max(0, toFiniteNumber(value, 0)));
  }

  function normalizeCritBonusPoints(value) {
    return Math.min(100, Math.max(0, toFiniteNumber(value, 0)));
  }

  function resolveBossTargetDamage(baseHp, mode) {
    const hp = Math.max(0, toFiniteNumber(baseHp, 0));
    const multiplier = BOSS_MODE_HP_MULTIPLIERS[String(mode || "").trim().toLowerCase()] || 1;
    return Math.round(hp * multiplier);
  }

  function calculateDamagePlan(input = {}) {
    const baseDamage = Math.max(0, Math.round(toFiniteNumber(input.baseDamage, 0)));
    const actionPercent = normalizeActionPercent(input.actionPercent);
    const actionMultiplier = 1 + actionPercent / 100;
    const hitDamage = Math.max(0, Math.round(baseDamage * actionMultiplier));
    const baseCritChance = normalizeCritChance(input.critChance);
    const critBonusPoints = normalizeCritBonusPoints(input.critBonusPoints);
    const critChance = Math.min(1, baseCritChance + critBonusPoints / 100);
    const criticalHitDamage = hitDamage * 2;
    const expectedHitDamage = hitDamage * (1 + critChance);
    const weaponCount = Math.max(0, Math.floor(toFiniteNumber(input.weaponCount, 0)));
    const targetDamage = Math.max(0, Math.ceil(toFiniteNumber(input.targetDamage, 0)));

    const guaranteedDamage = hitDamage * weaponCount;
    const expectedDamageExact = expectedHitDamage * weaponCount;
    const maximumDamage = criticalHitDamage * weaponCount;
    const guaranteedCount = targetDamage > 0 && hitDamage > 0
      ? Math.ceil(targetDamage / hitDamage)
      : 0;
    const expectedCount = targetDamage > 0 && expectedHitDamage > 0
      ? Math.ceil(targetDamage / expectedHitDamage)
      : 0;

    return {
      baseDamage,
      actionPercent,
      actionMultiplier,
      hitDamage,
      baseCritChance,
      critBonusPoints,
      critChance,
      criticalHitDamage,
      expectedHitDamage,
      weaponCount,
      targetDamage,
      guaranteedDamage,
      expectedDamageExact,
      expectedDamage: Math.round(expectedDamageExact),
      maximumDamage,
      guaranteedCount,
      expectedCount,
      guaranteedPlanDamage: guaranteedCount * hitDamage,
      expectedPlanDamage: Math.round(expectedCount * expectedHitDamage),
      expectedPlanGuaranteedDamage: expectedCount * hitDamage,
    };
  }

  return Object.freeze({
    BOSS_MODE_HP_MULTIPLIERS,
    calculateDamagePlan,
    normalizeActionPercent,
    normalizeCritBonusPoints,
    normalizeCritChance,
    resolveBossTargetDamage,
  });
});
