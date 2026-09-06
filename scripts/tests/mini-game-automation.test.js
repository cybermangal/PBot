const test = require("node:test");
const assert = require("node:assert/strict");

const { __test } = require("../lib/ui-service");

test("Fartovy autospin requires the current bet or a free spin", () => {
  assert.deepEqual(__test.getSlotsSpinAvailability({ slotsGrass: 4, freeSpins: 0 }, 5), {
    freeSpins: 0,
    slotsGrass: 4,
    requiredBet: 5,
    canSpin: false,
  });
  assert.equal(__test.getSlotsSpinAvailability({ slotsGrass: 5, freeSpins: 0 }, 5).canSpin, true);
  assert.equal(__test.getSlotsSpinAvailability({ slotsGrass: 0, freeSpins: 1 }, 10).canSpin, true);
});

test("Fartovy autospin settings are persisted in a safe normalized form", () => {
  assert.deepEqual(__test.normalizeFartovyAutoSpinSettings({
    enabled: true,
    bet: 100,
    autoBonus: false,
    superGameSide: "right",
  }), {
    enabled: true,
    bet: 10,
    autoBonus: false,
    maxSpins: 100,
    delayMs: 1000,
    superGameSide: "right",
  });
});

test("Fartovy autospin does not reapply an already selected bet", () => {
  assert.equal(__test.shouldSetFartovyBet({ bet: 1 }, 1), false);
  assert.equal(__test.shouldSetFartovyBet({ bet: 1 }, 2), true);
  assert.equal(__test.shouldSetFartovyBet({}, 1), true);
});

test("gambling balances combine game state with the shared player currencies", () => {
  const balances = __test.normalizeMiniGameBalances({
    currencies: {
      rubles: 500,
      soap: 16,
      chips: 99,
      pink_matches: 300,
      blue_matches: 130,
      fortune_tickets: 7,
    },
    fartovy: {
      slotsGrass: 4,
      slotsOrenge: 232,
      slotsRed: 126,
      rubles: 450,
    },
    katala: {},
    poker: {
      chips: 0,
      pinkMatches: 301,
    },
    wheel: {
      tickets: 0,
      blueMatches: 131,
      rubles: 451,
    },
  });

  assert.deepEqual(balances.fartovy, {
    green_matches: 4,
    orange_matches: 232,
    red_matches: 126,
    rubles: 450,
  });
  assert.deepEqual(balances.katala, { rubles: 500 });
  assert.deepEqual(balances.poker, {
    chips: 0,
    pink_matches: 301,
    soap: 16,
  });
  assert.deepEqual(balances.wheel, {
    fortune_tickets: 0,
    blue_matches: 131,
    rubles: 451,
  });
});

test("Katala keeps hunting after a target until the declared limit is spent", () => {
  assert.deepEqual(__test.getKatalaAttemptDecision({
    combination: "AA",
    targets: ["AA"],
    attemptsCompleted: 3,
    maxAttempts: 10,
    stopRequested: false,
  }), {
    matched: true,
    continuePlaying: true,
    reason: null,
  });

  assert.deepEqual(__test.getKatalaAttemptDecision({
    combination: "AA",
    targets: ["AA"],
    attemptsCompleted: 10,
    maxAttempts: 10,
    stopRequested: false,
  }), {
    matched: true,
    continuePlaying: false,
    reason: "completed",
  });
});

test("autoplay blocks only manual actions from the same mini-game", () => {
  const fartovyAutomation = { running: true, kind: "fartovy" };

  assert.equal(__test.isMiniGameActionBlockedByAutomation("fartovy-spin", fartovyAutomation), true);
  assert.equal(__test.isMiniGameActionBlockedByAutomation("fartovy-buy-grass", fartovyAutomation), true);
  assert.equal(__test.isMiniGameActionBlockedByAutomation("katala-start", fartovyAutomation), false);
  assert.equal(__test.isMiniGameActionBlockedByAutomation("poker-soap", fartovyAutomation), false);
  assert.equal(__test.isMiniGameActionBlockedByAutomation("wheel-spin", fartovyAutomation), false);
  assert.equal(__test.isMiniGameActionBlockedByAutomation("fartovy-spin", {
    running: false,
    kind: "fartovy",
  }), false);
});

test("Katala reward candidates stay separate from confirmed new wearable drops", () => {
  const outcome = __test.normalizeMiniGameOutcome({
    result: {
      pair: "KK",
      card1: "K_spades",
      card2: "K_clubs",
      reward: {
        cigarettes: 700,
        clothingId: 19,
      },
    },
  }, {
    items: [
      {
        id: 19,
        type: "clothing",
        name: "Шляпа",
        setName: "Комплект \"Катала\"",
        imageUrl: "https://example.test/katala-hat.webp",
      },
      {
        id: 42,
        type: "tattoo",
        zone: 4,
        name: "Падший Ангел",
        setName: "Комплект \"Падший Ангел\"",
        imageUrl: "https://example.test/fallen-angel-zone-4.webp",
      },
    ],
  }, {
    newWearables: [{ type: "tattoo", id: 42 }],
  });

  assert.equal(outcome.message, "Комбинация KK");
  assert.deepEqual(outcome.cards, ["K_spades", "K_clubs"]);
  assert.deepEqual(outcome.reward, { cigarettes: 700, clothingId: 19 });
  assert.deepEqual(outcome.rewardWearables, [{
    type: "clothing",
    id: 19,
    name: "Шляпа",
    setName: "Комплект \"Катала\"",
    imageUrl: "https://example.test/katala-hat.webp",
    zone: null,
  }]);
  assert.deepEqual(outcome.newWearables, [{
    type: "tattoo",
    id: 42,
    name: "Падший Ангел",
    setName: "Комплект \"Падший Ангел\"",
    imageUrl: "https://example.test/fallen-angel-zone-4.webp",
    zone: 4,
  }]);
});

test("wearable inventory delta excludes an owned hat and keeps only a new tattoo", () => {
  const before = __test.normalizeMiniGameWearableInventory({
    ownedClothing: [18, 19],
    ownedTattoos: [40, 41],
  });
  const after = __test.normalizeMiniGameWearableInventory({
    ownedClothing: [18, 19],
    ownedTattoos: [40, 41, 42],
  });

  assert.deepEqual(__test.buildMiniGameWearableInventoryDelta(before, after), [
    { type: "tattoo", id: 42 },
  ]);
});
