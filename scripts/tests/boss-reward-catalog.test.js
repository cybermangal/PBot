const assert = require("node:assert/strict");
const test = require("node:test");

const { __test } = require("../lib/ui-service");
const { __test: bossCatalogTest } = require("../lib/boss-catalog");

test("persisted combo item catalogs survive fallback normalization", () => {
  const combo = bossCatalogTest.normalizeCombo({
    length: 25,
    items: {
      tattoos: 2,
      clothing: 0,
      cameras: 0,
    },
    itemCatalog: {
      tattoos: [
        { type: "tattoo", id: 4180, previewUrl: "/tattoo-4180.webp" },
        { type: "tattoo", id: 4181, previewUrl: "/tattoo-4181.webp" },
      ],
      clothing: [],
      cameras: [],
    },
  });

  assert.equal(combo.items.tattoos, 2);
  assert.deepEqual(combo.itemCatalog.tattoos.map((item) => item.id), [4180, 4181]);
  assert.equal(combo.itemCatalog.tattoos[0].previewUrl, "/tattoo-4180.webp");
});

test("fast fallback does not recreate combos that an authoritative catalog removed", () => {
  const comboLookup = bossCatalogTest.resolveFallbackComboLookup(
    {
      comboModeKeys: [],
      combos: {},
      modes: [{ key: "pacansky", combo: { length: 10 } }],
    },
    [{ key: "pacansky", combo: { length: 10 } }],
  );

  assert.deepEqual(comboLookup, {});
});

test("stale external combo rewards cannot recreate a removed boss combo", () => {
  const boss = {
    id: 2,
    title: "Сизый",
    combos: {},
  };
  const externalComboModes = {
    pacansky: {
      length: 12,
      items: {
        tattoos: [{ id: 901, previewUrl: "/stale-tattoo.webp" }],
      },
    },
  };

  assert.deepEqual(
    __test.buildBossRewardComboModes(boss, externalComboModes),
    [],
  );
});

test("live boss combos control additions while external data only enriches rewards", () => {
  const boss = {
    id: 2,
    title: "Сизый",
    combos: {
      blotnoy: {
        length: 8,
        itemCatalog: {
          tattoos: [{ type: "tattoo", id: 902, previewUrl: "/live-tattoo.webp" }],
          clothing: [],
          cameras: [],
        },
      },
    },
  };
  const externalComboModes = {
    pacansky: {
      length: 12,
      items: { tattoos: [{ id: 901 }] },
    },
    blotnoy: {
      length: 99,
      items: { tattoos: [{ id: 903, previewUrl: "/external-tattoo.webp" }] },
    },
  };

  const modes = __test.buildBossRewardComboModes(boss, externalComboModes);

  assert.equal(modes.length, 1);
  assert.equal(modes[0].key, "blotnoy");
  assert.equal(modes[0].length, 8);
  assert.deepEqual(modes[0].items.map((item) => item.id), [902, 903]);
});

test("boss reward items keep set names and full weapon bonuses from the wearable catalog", () => {
  const items = __test.enrichBossRewardItems(
    [
      { type: "tattoo", id: 4180, previewUrl: "/combo-preview.webp" },
      { type: "tattoo", id: 4181 },
    ],
    [
      {
        type: "tattoo",
        id: 4180,
        name: "Здоровенный Язь",
        setName: "Комплект \"Здоровенный Язь\"",
        imageUrl: "/catalog-preview.webp",
        combatStatsBonus: { gunshot: 11, maxEnergy: 1 },
      },
      {
        type: "tattoo",
        id: 4181,
        name: "Здоровенный Язь",
        setName: "Комплект \"Здоровенный Язь\"",
        imageUrl: "/catalog-preview-2.webp",
        combatStatsBonus: { gunshot: 10 },
      },
    ],
  );

  assert.equal(items[0].setName, "Комплект \"Здоровенный Язь\"");
  assert.equal(items[0].previewUrl, "/combo-preview.webp");
  assert.deepEqual(items[0].combatStatsBonus, { gunshot: 11, maxEnergy: 1 });
  assert.equal(items[1].previewUrl, "/catalog-preview-2.webp");
  assert.deepEqual(items[1].combatStatsBonus, { gunshot: 10 });
});

test("wearable inventory retries an incomplete game response instead of reporting zero owned items", async () => {
  let calls = 0;
  const client = {
    baseUrl: "https://inventory-retry.test",
    async get(pathname) {
      assert.equal(pathname, "/api/clothing/inventory");
      calls += 1;
      return calls === 1
        ? { ok: true, status: 200, data: { success: true } }
        : {
            ok: true,
            status: 200,
            data: { success: true, ownedClothing: [101], ownedTattoos: [202] },
          };
    },
  };

  const inventory = await __test.loadWearableInventory(client, { accountKey: "retry-account" });

  assert.equal(calls, 2);
  assert.deepEqual(inventory.ownedClothing, [101]);
  assert.deepEqual(inventory.ownedTattoos, [202]);
});

test("wearable inventory keeps the last known non-empty result across a transient empty response", async () => {
  let mode = "filled";
  let calls = 0;
  const client = {
    baseUrl: "https://inventory-fallback.test",
    async get() {
      calls += 1;
      return {
        ok: true,
        status: 200,
        data: mode === "filled"
          ? { success: true, ownedClothing: [303], ownedTattoos: [404] }
          : { success: true, ownedClothing: [], ownedTattoos: [] },
      };
    },
  };

  await __test.loadWearableInventory(client, { accountKey: "fallback-account" });
  mode = "empty";
  const inventory = await __test.loadWearableInventory(client, { accountKey: "fallback-account" });

  assert.equal(calls, 3);
  assert.deepEqual(inventory.ownedClothing, [303]);
  assert.deepEqual(inventory.ownedTattoos, [404]);
});
