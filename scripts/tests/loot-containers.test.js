const assert = require("node:assert/strict");
const test = require("node:test");

const {
  BAUL_SOAP_COST,
  buildLootContainersDashboard,
  enrichLootContainerEntryWithCatalog,
  enrichLootRewardsWithCatalog,
  normalizeBaulOpenResult,
  normalizeParcelOpenResult,
} = require("../lib/loot-containers");

test("loot dashboard exposes parcel progress and groups baul preview rewards", () => {
  const dashboard = buildLootContainersDashboard({
    parcelStatus: {
      success: true,
      stewBalance: 10,
      progress: { current: 34, step: 50, remaining: 16, text: "34 / 50" },
      points: 5934,
      issuedBy50: 118,
    },
    baulStatus: {
      success: true,
      stats: {
        active: true,
        baulId: "baul_basic",
        level: 8,
        maxLevel: 25,
        currentExp: 560,
        expToNext: 650,
        isMaxLevel: false,
        pendingRewards: [
          { type: "currency", id: "authority", amount: 5511 },
          { type: "stash", id: "stash", amount: 23 },
          { type: "weapon", id: "poison", amount: 3 },
          { type: "key", id: "14", amount: 1, bossTitle: "Близнецы" },
        ],
      },
    },
    playerInit: {
      currencies: { soap: 77 },
    },
  });

  assert.equal(dashboard.parcel.stewBalance, 10);
  assert.equal(dashboard.parcel.progress.remaining, 16);
  assert.equal(dashboard.parcel.canOpen, true);
  assert.equal(dashboard.baul.level, 8);
  assert.equal(dashboard.baul.belowMaxLevel, true);
  assert.equal(dashboard.baul.recommendedToOpen, false);
  assert.equal(dashboard.baul.soapBalance, 77);
  assert.equal(dashboard.baul.cost.amount, BAUL_SOAP_COST);
  assert.equal(dashboard.baul.pending.currency[0].label, "Авторитет");
  assert.equal(dashboard.baul.pending.stashes[0].amount, 23);
  assert.equal(dashboard.baul.pending.weapons[0].label, "Яд");
  assert.equal(dashboard.baul.pending.keys[0].label, "Ключ: Близнецы");
  assert.equal(dashboard.baul.pending.hasTattoo, false);
});

test("max-level baul with a tattoo is marked as recommended", () => {
  const dashboard = buildLootContainersDashboard({
    parcelStatus: { success: true, stewBalance: 0 },
    baulStatus: {
      success: true,
      stats: {
        active: true,
        level: 25,
        maxLevel: 25,
        isMaxLevel: true,
        pendingRewards: [
          {
            type: "tattoo",
            id: "baul-tattoo",
            amount: 1,
            tattooName: "Удача",
            tattooStat: "poison",
            tattooTotalBonus: 12,
          },
        ],
      },
    },
    playerInit: { currencies: { soap: 20 } },
  });

  assert.equal(dashboard.baul.recommendedToOpen, true);
  assert.equal(dashboard.baul.canOpen, true);
  assert.equal(dashboard.baul.pending.hasTattoo, true);
  assert.equal(dashboard.baul.pending.tattoos[0].name, "Удача");
});

test("parcel open result keeps currencies, stashes, and clothing drop", () => {
  const result = normalizeParcelOpenResult({
    Success: true,
    StewLeft: 9,
    Rewards: {
      rubles: 7,
      cigarettes: 125,
    },
    Hides: [
      { id: "hide-42", name: "Воровская нычка", amount: 1 },
    ],
    ClothingId: 212,
    Clothing: {
      id: 212,
      name: "Фартовая куртка",
      setName: "Посылочный комплект",
      cardPreviewUrl: "https://example.invalid/clothing.webp",
    },
    NewBalances: { rubles: 107 },
  });

  assert.equal(result.success, true);
  assert.equal(result.remaining.stew, 9);
  assert.equal(result.rewards.currency.length, 2);
  assert.equal(result.rewards.stashes.length, 1);
  assert.equal(result.rewards.hasClothing, true);
  assert.equal(result.rewards.clothing[0].id, "212");
  assert.equal(result.rewards.clothing[0].name, "Фартовая куртка");
});

test("baul open result separates weapons, keys, and tattoos", () => {
  const result = normalizeBaulOpenResult({
    success: true,
    rewards: [
      { type: "weapon", id: "gunshot", amount: 4 },
      { type: "key", id: "14", amount: 1, bossTitle: "Близнецы" },
      { type: "tattoo", id: "tattoo-1", amount: 1, tattooName: "Козырь" },
    ],
    tattooSets: [{ id: "set-1", name: "Козырной набор" }],
  });

  assert.equal(result.success, true);
  assert.equal(result.rewards.weapons[0].label, "Самопал");
  assert.equal(result.rewards.keys[0].bossTitle, "Близнецы");
  assert.equal(result.rewards.hasTattoo, true);
  assert.equal(result.tattooSets.length, 1);
});

test("wearable catalog adds exact clothing and tattoo names and preview images", () => {
  const catalog = {
    items: [
      {
        type: "clothing",
        id: 212,
        name: "Перстни",
        setName: "Комплект «Перстни»",
        imageUrl: "https://example.test/clothing-212.webp",
      },
      {
        type: "tattoo",
        id: 2944,
        name: "Тёмная Империя",
        setName: "Комплект «Тёмная Империя»",
        imageUrl: "https://example.test/tattoo-2944.webp",
      },
    ],
  };
  const rewards = enrichLootRewardsWithCatalog({
    items: [
      { type: "clothing", id: "212", amount: 1, label: "Шмотка" },
      { type: "tattoo", id: "2944", amount: 1, label: "Наколка" },
    ],
  }, catalog);

  assert.equal(rewards.clothing[0].name, "Перстни");
  assert.equal(rewards.clothing[0].image, "https://example.test/clothing-212.webp");
  assert.equal(rewards.tattoos[0].name, "Тёмная Империя");
  assert.equal(rewards.tattoos[0].image, "https://example.test/tattoo-2944.webp");

  const entry = enrichLootContainerEntryWithCatalog({
    kind: "baul",
    rewards,
    tattooSets: [{ tattooId: 2944, name: "Тёмная Империя" }],
  }, catalog);
  assert.equal(entry.tattooSets[0].image, "https://example.test/tattoo-2944.webp");
});
