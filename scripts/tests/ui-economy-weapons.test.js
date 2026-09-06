const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildBossWeaponDelta,
  buildEconomyTrends,
  buildPersistedEconomyStatus,
  buildStaleEconomyStatus,
  getRequiredTalentDamage,
  isUsableEconomyInitResponse,
  normalizeBossWeaponCounts,
  normalizeAchievementHeaderSummary,
  normalizeDamageHeaderSummary,
  normalizeDashboardExtraCurrencies,
  normalizeEconomyResourceSnapshot,
  normalizeHeaderTalentStatus,
  normalizeHeaderWeaponStats,
  normalizeStashGearHeaderSummary,
} = require("../lib/ui-service").__test;

test("economy trends compare against the closest 24 hour and 7 day baselines", () => {
  const now = Date.parse("2026-07-15T12:00:00.000Z");
  const samples = [
    { at: "2026-07-07T12:00:00.000Z", resources: { rubles: 100, soap: 1 } },
    { at: "2026-07-13T12:00:00.000Z", resources: { rubles: 120, soap: 2 } },
    { at: "2026-07-15T00:00:00.000Z", resources: { rubles: 130, soap: 3 } },
  ];

  const trends = buildEconomyTrends(samples, { rubles: 150, soap: 4 }, now);

  assert.deepEqual(trends.day.delta, { rubles: 30, soap: 2 });
  assert.equal(trends.day.baselineAt, "2026-07-13T12:00:00.000Z");
  assert.equal(trends.day.complete, true);
  assert.deepEqual(trends.week.delta, { rubles: 50, soap: 3 });
  assert.equal(trends.week.baselineAt, "2026-07-07T12:00:00.000Z");
  assert.equal(trends.week.complete, true);
});

test("economy snapshot keeps currencies, authority, and weapon inventory", () => {
  assert.deepEqual(normalizeEconomyResourceSnapshot({
    currencies: { rubles: "7", soap: 2 },
    authority: 11,
    poisonCount: 73,
    gunshotCount: 135,
    knifeCount: 587,
    level: 99,
    biceps: 42,
  }), {
    rubles: 7,
    soap: 2,
    authority: 11,
    weapon_poison: 73,
    weapon_gunshot: 135,
    weapon_knife: 587,
  });
});

test("newly tracked resources start at zero delta instead of their full stock", () => {
  const now = Date.parse("2026-07-15T12:00:00.000Z");
  const samples = [
    { at: "2026-07-14T12:00:00.000Z", resources: { rubles: 100 } },
    { at: "2026-07-15T12:00:00.000Z", resources: { rubles: 120, weapon_poison: 73 } },
  ];
  const trends = buildEconomyTrends(samples, { rubles: 120, weapon_poison: 73 }, now);

  assert.equal(trends.day.delta.weapon_poison, 0);
  assert.equal(trends.day.baselineAtByKey.weapon_poison, "2026-07-15T12:00:00.000Z");
  assert.equal(trends.day.completeByKey.weapon_poison, false);
});

test("header weapon stats reuse player init combat data", () => {
  assert.deepEqual(normalizeHeaderWeaponStats({
    poisonCount: 73,
    gunshotCount: 135,
    knifeCount: 587,
    combatStats: {
      poison: 26172,
      gunshot: 7262,
      knife: 1588,
      poisonCrit: 0.27,
      gunshotCrit: 0.31,
      knifeCrit: 0.21,
    },
  }), {
    poison: { count: 73, damage: 26172, critChance: 0.27 },
    gunshot: { count: 135, damage: 7262, critChance: 0.31 },
    knife: { count: 587, damage: 1588, critChance: 0.21 },
  });
});

test("talent damage thresholds match the live game progression formula", () => {
  assert.equal(getRequiredTalentDamage(0), 50);
  assert.equal(getRequiredTalentDamage(700), 3_490_763);
  assert.equal(getRequiredTalentDamage(999), 1);
});

test("header talent status exposes current, required, remaining, and unspent progress", () => {
  const talents = normalizeHeaderTalentStatus({
    ok: true,
    data: {
      state: {
        spentPoints: 700,
        unspentPoints: 0,
        currentDamage: 89,
        isMax: false,
      },
    },
  });

  assert.deepEqual({
    ...talents,
    progressPercent: Number(talents.progressPercent.toFixed(8)),
  }, {
    spentPoints: 700,
    unspentPoints: 0,
    totalPoints: 700,
    currentDamage: 89,
    requiredDamage: 3_490_763,
    remainingDamage: 3_490_674,
    progressPercent: 0.00254959,
    nextPoint: 701,
    isMax: false,
  });
});

test("header extras keep achievement progress, total stash coolness, and scoped damage", () => {
  assert.deepEqual(normalizeAchievementHeaderSummary({
    ok: true,
    data: { success: true, unlockedReward: 5580, totalReward: 19130 },
  }), {
    unlockedReward: 5580,
    totalReward: 19130,
    percent: 29.2,
  });
  assert.deepEqual(normalizeStashGearHeaderSummary({
    ok: true,
    data: { items: { 1: 41 }, slots: { coolnessTotal: 5850 } },
  }), { coolnessTotal: 5850 });
  assert.deepEqual(normalizeDamageHeaderSummary({
    period: "hourly",
    available: true,
    complete: true,
    generatedAt: "2026-07-15T12:00:00.000Z",
    summary: {
      self: { rank: 1817, deltaDamage: 739383 },
      all: { players: 100, totalDamage: 10_000_000 },
      friends: { players: 7, totalDamage: 2_000_000 },
      guild: { players: 5, totalDamage: 1_500_000 },
    },
  }), {
    period: "hourly",
    available: true,
    self: { damage: 739383, players: null, rank: 1817 },
    all: { damage: 10_000_000, players: 100 },
    friends: { damage: 2_000_000, players: 7 },
    guild: { damage: 1_500_000, players: 5 },
    complete: true,
    generatedAt: "2026-07-15T12:00:00.000Z",
  });
});

test("dashboard auxiliary currencies merge five armbands, zaruba balances, and slot matches", () => {
  assert.deepEqual(normalizeDashboardExtraCurrencies({
    ok: true,
    data: {
      families: {
        brigade: {
          balances: {
            armband: {
              armband_1: { balance: 1, cap: 80 },
              armband_2: { balance: 2, cap: 165 },
              armband_3: { balance: 3, cap: 275 },
              armband_4: { balance: 4, cap: 390 },
              armband_5: { balance: 5, cap: 540 },
            },
          },
        },
        zaruba: { balances: { ore_signet: 370, signet: 100 } },
      },
    },
  }, {
    ok: true,
    data: { state: { slotsGrass: 6, slotsOrenge: 232, slotsRed: 102 } },
  }), {
    armband_1: 1,
    armband_2: 2,
    armband_3: 3,
    armband_4: 4,
    armband_5: 5,
    ore_signet: 370,
    signet: 100,
    green_matches: 6,
    orange_matches: 232,
    red_matches: 102,
  });
});

test("economy status rejects rate-limited and incomplete player init responses", () => {
  assert.equal(isUsableEconomyInitResponse({ ok: false, status: 429, data: null }), false);
  assert.equal(isUsableEconomyInitResponse({
    ok: true,
    data: { success: true, currencies: {} },
  }), false);
  assert.equal(isUsableEconomyInitResponse({
    ok: true,
    data: {
      success: true,
      currencies: { cigarettes: 10, rubles: 20 },
      energy: 5,
      maxEnergy: 200,
      authority: 100,
      level: 2,
      biceps: 3,
    },
  }), true);
});

test("rate-limited economy refresh keeps the last complete snapshot", () => {
  const cached = {
    currencies: { cigarettes: 1334460, rubles: 4154 },
    energy: 17,
    trends: { day: { delta: { cigarettes: 17410 } } },
    updatedAt: "2026-07-15T18:00:00.000Z",
    stale: false,
    refreshStatus: null,
  };

  assert.deepEqual(buildStaleEconomyStatus(cached, { ok: false, status: 429 }), {
    ...cached,
    stale: true,
    refreshStatus: 429,
  });
  assert.equal(buildStaleEconomyStatus(null, { ok: false, status: 429 }), null);
});

test("persisted economy history keeps balances visible while the game server is offline", () => {
  const stale = buildPersistedEconomyStatus({
    samples: [
      {
        at: "2026-07-28T05:00:00.000Z",
        selfUserId: "537051799",
        resources: {
          rubles: 120,
          cigarettes: 450,
          authority: 900,
          weapon_poison: 12,
        },
      },
      {
        at: "2026-07-28T06:00:00.000Z",
        selfUserId: "537051799",
        resources: {
          rubles: 135,
          cigarettes: 470,
          authority: 940,
          weapon_poison: 11,
        },
      },
    ],
  }, "537051799", { ok: false, status: null }, Date.parse("2026-07-28T06:00:00.000Z"));

  assert.equal(stale.stale, true);
  assert.equal(stale.staleSource, "history");
  assert.equal(stale.updatedAt, "2026-07-28T06:00:00.000Z");
  assert.deepEqual(stale.currencies, { rubles: 135, cigarettes: 470 });
  assert.equal(stale.authority, 940);
  assert.equal(stale.energy, null);
  assert.equal(stale.level, null);
  assert.equal(Object.hasOwn(stale.currencies, "weapon_poison"), false);
});

test("economy history never mixes resource trends between accounts", () => {
  const history = {
    version: 2,
    samples: [
      {
        at: "2026-07-28T04:00:00.000Z",
        selfUserId: "first-account",
        resources: { rubles: 50_000, cigarettes: 700_000 },
      },
      {
        at: "2026-07-28T05:00:00.000Z",
        resources: { rubles: 40_000, cigarettes: 600_000 },
      },
      {
        at: "2026-07-28T06:00:00.000Z",
        selfUserId: "second-account",
        resources: { rubles: 120, cigarettes: 450 },
      },
    ],
  };

  const stale = buildPersistedEconomyStatus(
    history,
    "second-account",
    { ok: false, status: null },
    Date.parse("2026-07-28T06:00:00.000Z"),
  );

  assert.deepEqual(stale.currencies, { rubles: 120, cigarettes: 450 });
  assert.deepEqual(stale.trends.day.delta, { rubles: 0, cigarettes: 0 });
  assert.equal(buildPersistedEconomyStatus(
    history,
    "unknown-account",
    { ok: false, status: null },
  ), null);
});

test("boss weapon delta reports the net inventory result", () => {
  const before = {
    counts: { poison: 10, gunshot: 5, knife: 2 },
    capturedAt: "2026-07-15T11:59:00.000Z",
    error: null,
  };
  const after = {
    counts: { poison: 8, gunshot: 7, knife: 2 },
    capturedAt: "2026-07-15T12:00:00.000Z",
    error: null,
  };

  assert.deepEqual(buildBossWeaponDelta(before, after), {
    measured: true,
    before: before.counts,
    after: after.counts,
    delta: { poison: -2, gunshot: 2, knife: 0 },
    capturedAt: after.capturedAt,
    error: null,
  });
});

test("boss weapon response normalizes the live count fields", () => {
  assert.deepEqual(normalizeBossWeaponCounts({
    ok: true,
    data: {
      poisonCount: 87,
      gunshotCount: 131,
      knifeCount: 585,
    },
  }), {
    poison: 87,
    gunshot: 131,
    knife: 585,
  });
});
