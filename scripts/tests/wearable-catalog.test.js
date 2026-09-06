const test = require("node:test");
const assert = require("node:assert/strict");

const {
  _internals,
  buildWearableCollectionDashboard,
  buildWearableDashboard,
  fetchWearableCatalog,
  inferWearableCollectionSource,
  inferWearableSource,
  normalizeBonusMap,
  normalizeWearableCatalog,
} = require("../lib/wearable-catalog");

test("wearable catalog only requests the eight clothing zones supported by the API", async () => {
  const calls = [];
  const client = {
    async get(endpoint, options = {}) {
      const zone = Number(options.query && options.query.zone);
      calls.push({ endpoint, zone });
      if (endpoint === "/api/clothing/by-zone") {
        assert.ok(zone >= 1 && zone <= 8);
        return { ok: true, status: 200, data: { success: true, clothing: [] } };
      }
      assert.equal(endpoint, "/api/tattoo/by-zone");
      assert.ok(zone >= 1 && zone <= 42);
      return { ok: true, status: 200, data: { success: true, tattoos: [] } };
    },
  };

  const catalog = await fetchWearableCatalog(client, { writeCache: false });
  const clothingZones = calls
    .filter((call) => call.endpoint === "/api/clothing/by-zone")
    .map((call) => call.zone);
  const tattooZones = calls
    .filter((call) => call.endpoint === "/api/tattoo/by-zone")
    .map((call) => call.zone);

  assert.deepEqual(clothingZones, Array.from({ length: 8 }, (_, index) => index + 1));
  assert.deepEqual(tattooZones, Array.from({ length: 42 }, (_, index) => index + 1));
  assert.equal(catalog.zoneCount, 42);
});

test("wearable catalog tracks boss IDs and detects newly added bosses", () => {
  const catalog = normalizeWearableCatalog([], {
    bossIds: [49, 48, 48, "47", 0, null],
  });

  assert.deepEqual(catalog.bossIds, [47, 48, 49]);
  assert.deepEqual(_internals.findUnobservedBossIds(catalog, [47, 48, 49]), []);
  assert.deepEqual(_internals.findUnobservedBossIds(catalog, [47, 48, 49, 50, 51]), [50, 51]);
  assert.deepEqual(_internals.findUnobservedBossIds({ items: [] }, [1, 2]), [1, 2]);
});

test("wearable source recognizes prison and master rewards", () => {
  assert.deepEqual(
    inferWearableSource({ description: "Выпадает в дневной тюрьме: «Бутырка»" }),
    {
      sourceType: "prison",
      sourceId: 1,
      sourceMode: "day",
      sourceLabel: "Выпадает в дневной тюрьме: «Бутырка»",
    },
  );
  assert.equal(inferWearableSource({ description: "Награда мастера Яша, уровень 3" }).sourceId, 2);
});

test("wearable dashboard counts owned items and only their active bonuses", () => {
  const catalog = {
    generatedAt: "2026-07-11T00:00:00.000Z",
    items: [
      { type: "clothing", id: 1, setName: "Крепыш", sourceType: "prison", sourceId: 1, combatStatsBonus: { knife: 10 } },
      { type: "tattoo", id: 2, setName: "Крепыш", sourceType: "prison", sourceId: 1, combatStatsBonus: { maxEnergy: 2 } },
      { type: "clothing", id: 3, setName: "Без прибавки", sourceType: "master", sourceId: 1, combatStatsBonus: {} },
    ],
  };
  const dashboard = buildWearableDashboard(catalog, { ownedClothing: [1, 3], ownedTattoos: [] }, {
    prisons: [{ id: 1 }],
    masters: [{ id: 1 }],
  });

  assert.equal(dashboard.totals.collected, 2);
  assert.equal(dashboard.totals.total, 3);
  assert.deepEqual(dashboard.totals.collectedBonuses, { knife: 10 });
  assert.deepEqual(dashboard.totals.potentialBonuses, { knife: 10, maxEnergy: 2 });
  assert.equal(dashboard.prisons[1].sets.find((item) => item.type === "tattoo").complete, false);
});

test("bonus keys with different server casing are merged", () => {
  assert.deepEqual(normalizeBonusMap({ maxEnergy: 2, maxenergy: 3, poison: 4 }), {
    maxEnergy: 5,
    poison: 4,
  });
});

test("collection source classifier covers every requested block", () => {
  const cases = [
    ["Выпадает в тюрьме: Бутырка", "prison_master"],
    ["Выпадает у мастера Пантелей", "prison_master"],
    ["Можно получить за убийство босса", "bosses"],
    ["Выпадает только в бауле", "stashes"],
    ["Награда из посылки", "parcels"],
    ["Можно получить во время события Взлом", "events"],
    ["Выпадает в покере", "gambling"],
    ["Выпадает из чемодана Колеса фортуны", "gambling"],
    ["Падает в зарубах", "zaruba"],
    ["Выпадает за бои в лагерях", "brigades"],
    ["Можно получить у слепого кольщика", "blind_tattooist"],
    ["Только за достижения", "parcels"],
    ["Можно получить при оптовой закупке", "wholesale"],
  ];

  for (const [description, categoryId] of cases) {
    assert.equal(inferWearableCollectionSource({ description }).categoryId, categoryId, description);
  }
});

test("duplicate source text is removed and unrelated loose items stay separate", () => {
  const source = inferWearableCollectionSource({
    description: "Редкая награда из посылки",
    sourceDescription: "Редкая награда из посылки",
  });
  assert.equal(source.sourceLabel, "Редкая награда из посылки");

  const dashboard = buildWearableCollectionDashboard({
    items: [
      {
        type: "clothing",
        id: 1,
        name: "Шапка",
        setName: "Без комплекта",
        description: "Только за достижения",
        combatStatsBonus: {},
      },
      {
        type: "clothing",
        id: 2,
        name: "Куртка",
        setName: "Без комплекта",
        description: "Только за достижения",
        combatStatsBonus: {},
      },
    ],
  }, {});

  assert.equal(dashboard.categories.find((category) => category.id === "parcels").groups.length, 2);
});

test("parcel achievement clothing is restored from otherwise generic catalog descriptions", () => {
  const expectedSources = new Map([
    [212, "Награда за достижения «Пацанские посылки»"],
    [213, "Награда за достижения «Блатные посылки»"],
    [214, "Награда за достижения «Авторитетные посылки»"],
    [215, "Награда за общее количество любых посылок"],
  ]);

  for (const [id, sourceLabel] of expectedSources) {
    assert.deepEqual(
      inferWearableCollectionSource({
        type: "clothing",
        id,
        description: "Только за достижения!",
      }),
      {
        categoryId: "parcels",
        sourceLabel,
      },
    );
  }

  assert.deepEqual(
    inferWearableCollectionSource({
      type: "clothing",
      id: 211,
      description: "Только за достижения!",
    }),
    {
      categoryId: "parcels",
      sourceLabel: "Только за достижения!",
    },
  );
});

test("buyable achievement clothing moves to other and live buyability overrides the cache fallback", () => {
  assert.deepEqual(
    inferWearableCollectionSource({
      type: "clothing",
      id: 143,
      description: "Только за достижения!",
      canBeBought: true,
    }),
    {
      categoryId: "other",
      sourceLabel: "Можно купить в магазине",
    },
  );
  assert.equal(
    inferWearableCollectionSource({
      type: "clothing",
      id: 143,
      description: "Только за достижения!",
    }).categoryId,
    "other",
  );
  assert.equal(
    inferWearableCollectionSource({
      type: "clothing",
      id: 143,
      description: "Только за достижения!",
      canBeBought: false,
    }).categoryId,
    "parcels",
  );
  assert.equal(
    inferWearableCollectionSource({
      type: "clothing",
      id: 211,
      description: "Только за достижения!",
      canBeBought: false,
    }).categoryId,
    "parcels",
  );
});

test("raven tattoos stay in other while the poker raven clothing remains gambling", () => {
  assert.equal(
    inferWearableCollectionSource({
      type: "tattoo",
      id: 500,
      description: "Выпадает с ворона.",
    }).categoryId,
    "other",
  );
  assert.equal(
    inferWearableCollectionSource({
      type: "clothing",
      id: 222,
      name: "Ворон",
      description: "Выпадает в покере.",
    }).categoryId,
    "gambling",
  );
});

test("full collection groups sets, sums bonuses, separates cosmetics, and marks specials", () => {
  const catalog = {
    generatedAt: "2026-07-24T20:00:00.000Z",
    zoneCount: 42,
    items: [
      {
        type: "tattoo",
        id: 10,
        zone: 1,
        name: "Клинок",
        setName: "Комплект «Клинок»",
        description: "Падает в зарубах",
        imageUrl: "https://example.test/10.webp",
        combatStatsBonus: { knife: 7 },
      },
      {
        type: "tattoo",
        id: 11,
        zone: 2,
        name: "Клинок",
        setName: "Комплект «Клинок»",
        description: "Падает в зарубах",
        imageUrl: "https://example.test/11.webp",
        combatStatsBonus: { knife: 8, maxEnergy: 1 },
      },
      {
        type: "clothing",
        id: 12,
        zone: 1,
        name: "Кепка",
        setName: "Комплект «Кепка»",
        description: "Выпадает только в бауле",
        imageUrl: "https://example.test/12.webp",
        combatStatsBonus: {},
      },
      {
        type: "clothing",
        id: 222,
        zone: 8,
        name: "Ворон",
        setName: "Комплект «Ворон»",
        description: "Выпадает в покере.",
        imageUrl: "https://example.test/voron.webp",
        combatStatsBonus: {},
      },
    ],
  };
  const dashboard = buildWearableCollectionDashboard(
    catalog,
    { ownedClothing: [222], ownedTattoos: [10] },
    { bossPlayerStats: { openByKeychainBossIds: [2, 3, 4] } },
  );

  const zaruba = dashboard.categories.find((category) => category.id === "zaruba");
  const stashes = dashboard.categories.find((category) => category.id === "stashes");
  const gambling = dashboard.categories.find((category) => category.id === "gambling");

  assert.equal(dashboard.totals.total, 4);
  assert.equal(dashboard.totals.collected, 2);
  assert.deepEqual(zaruba.totals.potentialBonuses, { knife: 15, maxEnergy: 1 });
  assert.deepEqual(zaruba.totals.collectedBonuses, { knife: 7 });
  assert.equal(zaruba.groups.length, 1);
  assert.equal(stashes.groups[0].visualOnly, true);
  assert.equal(gambling.groups[0].special, "raven");
  assert.equal(dashboard.specials.find((item) => item.id === "raven").owned, true);
  assert.equal(dashboard.specials.find((item) => item.id === "keychain").affectedBossCount, 3);
});
