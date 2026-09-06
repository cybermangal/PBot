const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DEFAULT_SETTINGS,
  SAFE_OUTSTANDING_OFFERS,
  assertFreeEndpoint,
  assertSoapEnergyEndpoint,
  buildRoleSwitchPlan,
  buildStrategy,
  getDealerPartnerUid,
  getDealerPartnerUids,
  getOutstandingTrustedDealerOffers,
  isCompatibleDealerRequest,
  isInactiveLetsCookError,
  isTransientLetsCookError,
  loadLetsCookState,
  normalizeLockerAction,
  normalizeLockerRewards,
  normalizePositiveUid,
  normalizePositiveUidList,
  normalizeLetsCookState,
  resolveDealerPartner,
} = require("../lib/lets-cook");

test("dealer strategy has no client-side accumulation limit", () => {
  assert.equal(Object.hasOwn(DEFAULT_SETTINGS, "batchTarget"), false);
  assert.equal(DEFAULT_SETTINGS.allowSoapEnergy, false);
  const strategy = buildStrategy({
    stack: 1,
    possibleStackTotal: 40,
    actionSecondsLeft: 86400,
    progress: 20,
    progressMax: 90,
  });
  assert.equal(Object.hasOwn(strategy, "effectiveBatchTarget"), false);
  assert.equal(Object.hasOwn(strategy, "plannedBatches"), false);
  assert.match(strategy.recommendation, /Клиентского лимита накопления нет/);
});

test("Lets Cook energy regenerates for free and active play ends after six days", () => {
  const start = 1_000_000;
  const now = start + 600;
  const state = normalizeLetsCookState({
    role: "cook",
    energy: 4,
    energyMax: 100,
    energyTs: start,
    progress: 68,
    progressMax: 90,
    stack: 0,
    phase: "active",
    windowStartUnix: start,
    windowEndUnix: start + 7 * 86400,
  }, now);

  assert.equal(state.eventEnergy, 9);
  assert.equal(state.actionEndUnix, start + 6 * 86400);
  assert.equal(state.claimSecondsLeft - state.actionSecondsLeft, 86400);
  assert.ok(state.totalFreeEnergyLeft > 4000);
});

test("deal reward tier comes from the server event-level table", () => {
  const state = normalizeLetsCookState({
    eventLevel: 4,
    eventPoints: 432,
    pointsToNext: 68,
    dealReward: {
      currentTierMinLevel: 1,
      tiers: [
        { minLevel: 1, eventPoint: 90, tokenDrop: 50, rating: 90, sigs: 90, collectionsDrop: 30 },
        { minLevel: 10, eventPoint: 135, tokenDrop: 75, rating: 135, sigs: 135, collectionsDrop: 30 },
        { minLevel: 20, eventPoint: 180, tokenDrop: 100, rating: 180, sigs: 180, collectionsDrop: 30 },
        { minLevel: 30, eventPoint: 225, tokenDrop: 125, rating: 225, sigs: 225, collectionsDrop: 30 },
      ],
    },
  });

  assert.equal(state.eventLevel, 4);
  assert.equal(state.eventPoints, 432);
  assert.equal(state.currentDealTier.minLevel, 1);
  assert.equal(state.currentDealTier.eventPoint, 90);
  assert.equal(state.currentDealTier.tokenDrop, 50);
  assert.equal(state.currentDealTier.collectionsDrop, 30);
});

test("dealer keeps working outside the final reserve without a batch threshold", () => {
  const strategy = buildStrategy({
    stack: 7,
    possibleStackTotal: 9,
    actionSecondsLeft: 3600,
    progress: 0,
    progressMax: 90,
  });

  assert.equal(strategy.forceDeal, false);
});

test("strategy forces a deal only inside the final active-time reserve", () => {
  const strategy = buildStrategy({
    stack: 7,
    possibleStackTotal: 9,
    actionSecondsLeft: 1200,
    progress: 0,
    progressMax: 90,
  });

  assert.equal(strategy.forceDeal, true);
});

test("paid event energy endpoint is blocked by the allowlist", () => {
  assert.equal(assertFreeEndpoint("POST", "/api/lets-cook/do-action"), true);
  assert.equal(assertFreeEndpoint("POST", "/api/lets-cook/watcher-action"), true);
  assert.equal(assertFreeEndpoint("POST", "/api/lets-cook/complete-case"), true);
  assert.throws(
    () => assertFreeEndpoint("POST", "/api/lets-cook/buy-energy"),
    /Blocked non-free Lets Cook endpoint/,
  );
  assert.throws(
    () => assertSoapEnergyEndpoint("/api/lets-cook/buy-energy", false),
    /disabled/,
  );
  assert.equal(assertSoapEnergyEndpoint("/api/lets-cook/buy-energy", true), true);
  assert.throws(
    () => assertSoapEnergyEndpoint("/api/lets-cook/buy-shield", true),
    /Blocked paid Lets Cook endpoint/,
  );
});

test("server click cooldown is a normal retry state instead of a failed tick", () => {
  assert.equal(isTransientLetsCookError({ code: "cooldown" }), true);
  assert.equal(isTransientLetsCookError({ code: "duplicate_click" }), true);
  assert.equal(isTransientLetsCookError({ code: "not_enough_soap" }), false);
});

test("inactive event window is a normal state while other API failures remain errors", async () => {
  assert.equal(isInactiveLetsCookError({ code: "window_inactive" }), true);
  assert.equal(isInactiveLetsCookError({ code: "unauthorized" }), false);

  const inactiveState = await loadLetsCookState({
    async get() {
      return { ok: false, status: 400, data: { error: "window_inactive" } };
    },
  });
  assert.equal(inactiveState.inactive, true);
  assert.equal(inactiveState.state.phase, "inactive");
  assert.equal(inactiveState.state.status, "inactive");
  assert.equal(inactiveState.state.inactiveReason, "window_inactive");

  await assert.rejects(
    () => loadLetsCookState({
      async get() {
        return { ok: false, status: 401, data: { error: "unauthorized" } };
      },
    }),
    /unauthorized/,
  );
});

test("offer fan-out is limited to one active request for the trusted pool", () => {
  assert.equal(SAFE_OUTSTANDING_OFFERS, 1);
  assert.equal(Object.hasOwn(DEFAULT_SETTINGS, "maxOutstandingOffers"), false);
});

test("dealer automation supports an ordered trusted ID pool and legacy saved IDs", () => {
  assert.deepEqual(DEFAULT_SETTINGS.cookPartnerUids, []);
  assert.deepEqual(DEFAULT_SETTINGS.barygaPartnerUids, []);
  assert.equal(normalizePositiveUid(" 123456 "), 123456);
  assert.equal(normalizePositiveUid("123x"), null);
  assert.deepEqual(normalizePositiveUidList("123456, 234567; 123456"), [123456, 234567]);
  assert.equal(getDealerPartnerUid({ cookPartnerUid: 123456 }, "cook"), 123456);
  assert.deepEqual(getDealerPartnerUids({ cookPartnerUid: 123456 }, "cook"), [123456]);
  assert.deepEqual(getDealerPartnerUids({ cookPartnerUids: [222, "333", 222] }, "cook"), [222, 333]);

  const unresolved = resolveDealerPartner({ role: "cook" }, {}, [
    { uid: 111, role: "baryga", canInteract: true },
  ]);
  assert.deepEqual(unresolved, { partnerUid: null, candidate: null, reason: "partner_required" });

  const manual = resolveDealerPartner({ role: "cook" }, { cookPartnerUid: 222 }, [
    { uid: 111, role: "baryga", canInteract: true },
  ]);
  assert.equal(manual.partnerUid, 222);
  assert.equal(manual.candidate, null);
  assert.equal(manual.reason, null);

  const pool = resolveDealerPartner({ role: "cook" }, { cookPartnerUids: [222, 333] }, [
    { uid: 222, role: "watcher", canInteract: true },
    { uid: 333, role: "baryga", canInteract: true },
  ]);
  assert.equal(pool.partnerUid, 333);
  assert.equal(pool.reason, null);

  const knownAvailable = resolveDealerPartner({ role: "cook" }, { cookPartnerUids: [444, 555] }, [
    { uid: 555, role: "baryga", canInteract: true },
  ]);
  assert.equal(knownAvailable.partnerUid, 555);
});

test("dealer automation accepts only trusted incoming IDs and ignores manual outgoing offers to other IDs", () => {
  const state = { role: "cook" };
  assert.equal(isCompatibleDealerRequest(state, { fromUid: 222, fromRole: "baryga" }, [222, 333]), true);
  assert.equal(isCompatibleDealerRequest(state, { fromUid: 111, fromRole: "baryga" }, [222, 333]), false);
  assert.deepEqual(getOutstandingTrustedDealerOffers([
    { toUid: 111 },
    { toUid: 222 },
  ], [222, 333]).map((offer) => offer.toUid), [222]);

  const watcher = resolveDealerPartner(state, { cookPartnerUid: 333 }, [
    { uid: 333, role: "watcher", canInteract: true },
  ]);
  assert.equal(watcher.reason, "configured_partner_is_watcher");
});

test("locker history keeps fixed shelf loot and names unique drops", () => {
  const rewards = normalizeLockerRewards({
    tattoo: {
      id: 731,
      name: "Тихий ход",
      setName: "Лаборатория",
      setOwned: 4,
      setCount: 12,
    },
    respirator: {
      id: 88,
      name: "Фильтр лаборанта",
    },
  });

  assert.deepEqual(rewards.slice(0, 3).map(({ key, amount }) => ({ key, amount })), [
    { key: "authority", amount: 100 },
    { key: "cigarettes", amount: 50 },
    { key: "collectionsDrop", amount: 10 },
  ]);
  assert.deepEqual(rewards[3], {
    key: "tattoo",
    label: "Наколка",
    amount: 1,
    itemId: 731,
    name: "Тихий ход",
    setName: "Лаборатория",
    setOwned: 4,
    setCount: 12,
  });
  assert.equal(rewards[4].name, "Фильтр лаборанта");
});

test("locker history supports compact legacy item ids", () => {
  const rewards = normalizeLockerRewards({ tattooId: 9, respiratorItemId: 12 });
  assert.deepEqual(rewards.slice(-2).map(({ key, itemId, name }) => ({ key, itemId, name })), [
    { key: "tattoo", itemId: 9, name: null },
    { key: "respirator", itemId: 12, name: null },
  ]);
});

test("stored locker openings are enriched with reward details on read", () => {
  const entry = normalizeLockerAction({
    type: "locker_opened",
    lockerId: 13,
    response: {
      tattoo: { id: 5225, name: "Пора варить!", setOwned: 1, setCount: 42 },
      respirator: null,
    },
  });

  assert.equal(entry.lockerRole, "cook");
  assert.deepEqual(entry.rewards.map((item) => item.label), [
    "Авторитет",
    "Папиросы",
    "Нычки",
    "Наколка",
  ]);
  assert.equal(entry.rewards.at(-1).name, "Пора варить!");
});

test("dealer role switch finishes a partial stack and deals before changing", () => {
  const state = {
    role: "cook",
    status: "game",
    stack: 1,
    progress: 20,
    progressMax: 90,
    possibleStackTotal: 20,
    actionSecondsLeft: 86400,
    shieldRemainingSeconds: 0,
  };
  const plan = buildRoleSwitchPlan(state, { preferredRole: "baryga" });
  const strategy = buildStrategy(state, { preferredRole: "baryga" });

  assert.equal(plan.pending, true);
  assert.equal(plan.ready, false);
  assert.equal(plan.reason, "finish_dealer_cycle");
  assert.equal(Object.hasOwn(plan, "cycleTarget"), false);
  assert.equal(strategy.forceDeal, false);
});

test("dealer role switch deals an already finished stack immediately", () => {
  const strategy = buildStrategy({
    role: "cook",
    status: "game",
    stack: 1,
    progress: 0,
    progressMax: 90,
    possibleStackTotal: 10,
    actionSecondsLeft: 86400,
    shieldRemainingSeconds: 0,
  }, { preferredRole: "watcher" });

  assert.equal(Object.hasOwn(strategy.roleSwitch, "cycleTarget"), false);
  assert.equal(strategy.forceDeal, true);
});

test("clean role state can switch while watcher investigation progress is preserved", () => {
  const clean = buildRoleSwitchPlan({
    role: "cook",
    status: "game",
    stack: 0,
    progress: 0,
    shieldRemainingSeconds: 0,
  }, { preferredRole: "watcher" });
  const watcher = buildRoleSwitchPlan({
    role: "watcher",
    status: "game",
    stack: 0,
    progress: 40,
  }, { preferredRole: "cook" });

  assert.equal(clean.ready, true);
  assert.equal(clean.reason, "safe_to_switch");
  assert.equal(watcher.ready, false);
  assert.equal(watcher.reason, "finish_watcher_case");
});
