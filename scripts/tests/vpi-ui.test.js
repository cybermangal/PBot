const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectVpiRewardIfReady,
  executeBossNeedleFinisher,
  getVpiAutoClaimDelayMs,
  getBossNeedleFinisherDecision,
  mergeBossComboAndNeedleFinisherResult,
  normalizeBossAutomationQueueEntry,
  normalizeVpiDamageLeft,
  normalizeVpiHeaderSummary,
  shouldRunBossNeedleFinisher,
  shouldUseWeaponsAfterBossNeedleFinisher,
  validateVpiDamageRequest,
} = require("../lib/ui-service").__test;

const root = path.resolve(__dirname, "../..");
const standaloneRoot = path.join(root, "bosses-system-only");
const standaloneServicePath = path.join(standaloneRoot, "scripts", "lib", "ui-service.js");
const hasStandalone = fs.existsSync(standaloneServicePath);
const standaloneServiceTest = hasStandalone ? require(standaloneServicePath).__test : null;
const appSource = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const standaloneAppSource = hasStandalone
  ? fs.readFileSync(path.join(standaloneRoot, "ui", "app.js"), "utf8")
  : null;
const htmlSource = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "ui", "styles.css"), "utf8");
const serverSource = fs.readFileSync(path.join(root, "scripts", "ui-server.js"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "scripts", "lib", "api-client.js"), "utf8");
const serviceSource = fs.readFileSync(path.join(root, "scripts", "lib", "ui-service.js"), "utf8");
const standaloneServiceSource = hasStandalone
  ? fs.readFileSync(standaloneServicePath, "utf8")
  : null;
const standaloneClientSource = hasStandalone
  ? fs.readFileSync(path.join(standaloneRoot, "scripts", "lib", "api-client.js"), "utf8")
  : null;
const standaloneServerSource = hasStandalone
  ? fs.readFileSync(path.join(standaloneRoot, "scripts", "ui-server.js"), "utf8")
  : null;

test("VPI header summary distinguishes an absent common fund from an active tier", () => {
  assert.deepEqual(normalizeVpiHeaderSummary({
    ok: true,
    data: {
      active: false,
      tier: null,
      expiresAtUnix: null,
      claimAvailableInSec: 0,
      damageLeft: 0,
      offer: { available: true, tiers: [] },
    },
  }, 1_780_000_000_000), {
    active: false,
    tier: null,
    expiresAtUnix: null,
    remainingSec: 0,
    claimAvailableInSec: 0,
    claimReady: false,
    damageLeft: 0,
    nextDailyPreview: null,
    offerAvailable: true,
  });

  assert.deepEqual(normalizeVpiHeaderSummary({
    ok: true,
    data: {
      active: true,
      tier: "avtoritetny",
      expiresAtUnix: 1_780_086_400,
      claimAvailableInSec: 3600,
      damageLeft: 5_000_000,
      nowUnix: 1_780_000_000,
      nextDailyPreview: { damage: 5_000_000, chefir: 3 },
      offer: {
        available: true,
        tiers: [{
          id: "avtoritetny",
          title: "Авторитетный",
          dailyDamage: 5_000_000,
        }],
      },
    },
  }, 1_780_000_000_000), {
    active: true,
    tier: {
      id: "avtoritetny",
      title: "Авторитетный",
      dailyDamage: 5_000_000,
    },
    expiresAtUnix: 1_780_086_400,
    remainingSec: 86_400,
    claimAvailableInSec: 3600,
    claimReady: false,
    damageLeft: 5_000_000,
    nextDailyPreview: { damage: 5_000_000, chefir: 3 },
    offerAvailable: true,
  });

  assert.equal(normalizeVpiHeaderSummary({
    ok: true,
    data: {
      active: true,
      tier: "pacansky",
      damageLeft: 1_000_000,
      offer: { tiers: [{ id: "pacansky" }] },
    },
  }).claimReady, false);
});

test("VPI auto-claim collects a ready daily Needle reward in both versions", async () => {
  for (const collector of [
    collectVpiRewardIfReady,
    standaloneServiceTest && standaloneServiceTest.collectVpiRewardIfReady,
  ].filter(Boolean)) {
    const calls = [];
    const states = [
      {
        ok: true,
        data: {
          active: true,
          tier: "blatnoy",
          claimAvailableInSec: 0,
          damageLeft: 0,
          offer: { tiers: [{ id: "blatnoy", title: "Блатной" }] },
        },
      },
      {
        ok: true,
        data: {
          active: true,
          tier: "blatnoy",
          claimAvailableInSec: 86_400,
          damageLeft: 2_000_000,
          offer: { tiers: [{ id: "blatnoy", title: "Блатной" }] },
        },
      },
    ];
    const result = await collector({
      vpi: {
        state: async () => {
          calls.push({ type: "state" });
          return states.shift();
        },
        claim: async (options) => {
          calls.push({ type: "claim", options });
          return { ok: true, data: { success: true } };
        },
      },
    });

    assert.equal(result.claimed, true);
    assert.equal(result.reason, "claimed");
    assert.equal(result.vpi.claimReady, false);
    assert.equal(result.vpi.damageLeft, 2_000_000);
    assert.deepEqual(calls, [
      { type: "state" },
      { type: "claim", options: { rateLimitRetries: 1 } },
      { type: "state" },
    ]);
  }
});

test("VPI auto-claim does not call claim before the daily reward is ready", async () => {
  for (const collector of [
    collectVpiRewardIfReady,
    standaloneServiceTest && standaloneServiceTest.collectVpiRewardIfReady,
  ].filter(Boolean)) {
    let claimCalls = 0;
    const result = await collector({
      vpi: {
        state: async () => ({
          ok: true,
          data: {
            active: true,
            tier: "pacansky",
            claimAvailableInSec: 1,
            offer: { tiers: [{ id: "pacansky" }] },
          },
        }),
        claim: async () => {
          claimCalls += 1;
          return { ok: true, data: { success: true } };
        },
      },
    });

    assert.equal(result.claimed, false);
    assert.equal(result.reason, "not_ready");
    assert.equal(claimCalls, 0);
  }
});

test("VPI auto-claim schedules the next check from the server countdown", () => {
  for (const getDelay of [
    getVpiAutoClaimDelayMs,
    standaloneServiceTest && standaloneServiceTest.getVpiAutoClaimDelayMs,
  ].filter(Boolean)) {
    assert.equal(getDelay({
      reason: "not_ready",
      vpi: {
        active: true,
        claimReady: false,
        claimAvailableInSec: 3600,
      },
    }), 3_601_500);
    assert.equal(getDelay({
      reason: "claimed",
      vpi: {
        active: true,
        claimReady: false,
        claimAvailableInSec: 86_400,
      },
    }), 86_401_500);
  }

  for (const source of [serviceSource, standaloneServiceSource].filter(Boolean)) {
    const start = source.indexOf("function getVpiAutoClaimDelayMs");
    const end = source.indexOf("function normalizeVpiDamageLeft", start);
    const schedulerSource = source.slice(start, end);
    assert.match(schedulerSource, /claimAvailableInSec/);
    assert.match(schedulerSource, /setTimeout/);
    assert.doesNotMatch(schedulerSource, /setInterval/);
  }
});

test("VPI damage validation requires a common fund and accepts a solo fight", () => {
  const summary = {
    hasSession: true,
    isCompleted: false,
    stateUnknown: false,
    stateReliable: true,
    sessionId: "boss-session",
    bossId: 12,
    mode: "pacansky",
    currentHp: 9_000_000,
  };

  assert.deepEqual(normalizeVpiDamageLeft({
    ok: true,
    data: { active: false, message: "no_vpi" },
  }), {
    active: false,
    message: "no_vpi",
    damageLeft: 0,
  });
  assert.equal(normalizeVpiDamageLeft({
    ok: false,
    status: 429,
    data: { message: "rate_limited" },
  }), null);
  assert.throws(
    () => validateVpiDamageRequest({}, summary, { active: false, damageLeft: 0 }),
    /Нет общака/,
  );
  assert.deepEqual(validateVpiDamageRequest({
    bossId: 12,
    sessionId: "boss-session",
    amount: 10_000_000,
  }, summary, {
    active: true,
    damageLeft: 2_000_000,
  }), {
    sessionId: "boss-session",
    bossId: 12,
    damageLeft: 2_000_000,
    amount: 2_000_000,
  });
  assert.equal(
    validateVpiDamageRequest(
      { amount: 500_000 },
      { ...summary, mode: "odin" },
      { active: true, damageLeft: 2_000_000 },
    ).amount,
    500_000,
  );
});

test("Needle finisher is opt-in per saved combo", () => {
  const item = {
    bossId: 7,
    mode: "odin",
    comboMode: "pacansky",
    hitTypes: ["punchChest", "kickBalls"],
    finishWithNeedle: true,
  };
  const summary = {
    hasSession: true,
    isCompleted: false,
    stateUnknown: false,
    stateReliable: true,
    bossId: 7,
    mode: "odin",
    currentHp: 420_000,
    maxHp: 900_000,
  };

  assert.deepEqual(
    getBossNeedleFinisherDecision(item, summary, {
      active: true,
      damageLeft: 2_000_000,
    }),
    {
      eligible: true,
      useNeedle: true,
      blockWeapons: true,
      reason: "needle_available",
      bossId: 7,
      maxHp: 900_000,
      currentHp: 420_000,
      damageLeft: 2_000_000,
      amount: 420_000,
    },
  );
  assert.equal(
    getBossNeedleFinisherDecision(
      { ...item, finishWithNeedle: false },
      summary,
      { active: true, damageLeft: 2_000_000 },
    ).reason,
    "needle_finisher_disabled",
  );
  assert.equal(
    getBossNeedleFinisherDecision(
      { ...item, comboMode: "", hitTypes: [] },
      summary,
      { active: true, damageLeft: 2_000_000 },
    ).reason,
    "combo_not_configured",
  );
  assert.equal(
    getBossNeedleFinisherDecision(
      item,
      summary,
      { active: true, damageLeft: 0 },
    ).reason,
    "needle_damage_exhausted",
  );
});

test("checked Needle finisher runs after a combo in every boss battle mode", () => {
  const activeResult = {
    finalSnapshot: {
      summary: {
        hasSession: true,
        isCompleted: false,
        stateUnknown: false,
        stateReliable: true,
        bossId: 9,
        currentHp: 25_000,
      },
    },
  };
  const checked = {
    bossId: 9,
    comboMode: "pacansky",
    types: ["punchChest", "kickBalls"],
    finishWithNeedle: true,
  };

  for (const selector of [
    shouldRunBossNeedleFinisher,
    standaloneServiceTest && standaloneServiceTest.shouldRunBossNeedleFinisher,
  ].filter(Boolean)) {
    assert.equal(selector({ ...checked, mode: "odin" }, activeResult), true);
    assert.equal(selector({ ...checked, mode: "pacansky" }, activeResult), true);
    assert.equal(selector({ ...checked, mode: "blotnoy" }, activeResult), true);
    assert.equal(selector({ ...checked, finishWithNeedle: false }, activeResult), false);
    assert.equal(selector(checked, {
      finalSnapshot: { summary: { ...activeResult.finalSnapshot.summary, currentHp: 0, isCompleted: true } },
    }), false);
  }
});

test("checked Needle finisher spends only remaining boss HP after combo", async () => {
  const spendPayloads = [];
  const spendOptions = [];
  const snapshots = [
    {
      summary: {
        hasSession: true,
        isCompleted: false,
        stateUnknown: false,
        stateReliable: true,
        bossId: 7,
        mode: "odin",
        currentHp: 420_000,
        maxHp: 900_000,
      },
    },
    {
      summary: {
        hasSession: false,
        isCompleted: true,
        rewardReady: true,
        bossId: 7,
        mode: "odin",
        currentHp: 0,
        maxHp: 900_000,
      },
    },
  ];
  const damageResponses = [
    { ok: true, data: { active: true, damageLeft: 2_000_000 } },
    { ok: true, data: { active: true, damageLeft: 1_580_000 } },
  ];
  const client = {
    vpi: {
      damageLeft: async () => damageResponses.shift(),
      spendDamage: async (payload, options) => {
        spendPayloads.push(payload);
        spendOptions.push(options);
        return { ok: true, data: { success: true, actualSpent: 420_000 } };
      },
    },
  };

  const result = await executeBossNeedleFinisher(client, {
    bossId: 7,
    mode: "odin",
    comboMode: "pacansky",
    hitTypes: ["punchChest", "kickBalls"],
    finishWithNeedle: true,
  }, {
    loadSnapshot: async () => snapshots.shift(),
  });

  assert.deepEqual(spendPayloads, [{
    bossId: 7,
    amount: 420_000,
    Amount: 420_000,
  }]);
  assert.deepEqual(spendOptions, [{ rateLimitRetries: 1 }]);
  assert.equal(result.ok, true);
  assert.equal(result.reason, "needle_finished_fight");
  assert.equal(result.actualSpent, 420_000);
  assert.equal(result.blockWeapons, false);
});

test("Needle HTTP 429 keeps the completed combo and blocks own weapons", async () => {
  const comboSnapshot = {
    summary: {
      hasSession: true,
      isCompleted: false,
      stateUnknown: false,
      stateReliable: true,
      bossId: 3,
      mode: "odin",
      currentHp: 50_000,
      maxHp: 50_000,
    },
  };
  const spendCalls = [];
  const client = {
    vpi: {
      damageLeft: async () => ({ ok: true, data: { active: true, damageLeft: 100_000 } }),
      spendDamage: async (payload, options) => {
        spendCalls.push({ payload, options });
        return {
          ok: false,
          status: 429,
          data: { message: "rate_limited" },
        };
      },
    },
  };

  const result = await executeBossNeedleFinisher(client, {
    bossId: 3,
    mode: "odin",
    comboMode: "pacansky",
    hitTypes: ["punchChest", "kickBalls"],
    finishWithNeedle: true,
  }, {
    initialSnapshot: comboSnapshot,
  });

  assert.deepEqual(spendCalls, [{
    payload: {
      bossId: 3,
      amount: 50_000,
      Amount: 50_000,
    },
    options: { rateLimitRetries: 1 },
  }]);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "needle_rate_limited");
  assert.equal(result.blockWeapons, true);
  assert.equal(result.finalSnapshot, comboSnapshot);
  assert.match(result.error, /Комбо уже выполнено/);
  assert.equal(shouldUseWeaponsAfterBossNeedleFinisher(result), false);
});

test("boss hit always executes the combo before the optional Needle finisher", () => {
  for (const source of [serviceSource, standaloneServiceSource].filter(Boolean)) {
    const start = source.indexOf("async function hitBoss");
    const end = source.indexOf("function normalizeBossWeaponBatchOptions", start);
    const hitBossSource = source.slice(start, end);
    const comboIndex = hitBossSource.indexOf(
      "let result = await executeBossRunnerLoopWithWeaponDelta",
    );
    const selectorIndex = hitBossSource.indexOf(
      "const runNeedleFinisher = shouldRunBossNeedleFinisher",
    );
    const needleIndex = hitBossSource.indexOf("await executeBossNeedleFinisher");

    assert.ok(comboIndex >= 0, "combo execution must remain present");
    assert.ok(selectorIndex > comboIndex, "Needle decision must be made after the combo");
    assert.ok(needleIndex > selectorIndex, "Needle must run only after the combo");
  }
});

test("own weapons wait until Needle damage is confirmed exhausted", () => {
  assert.equal(shouldUseWeaponsAfterBossNeedleFinisher(null), true);
  assert.equal(shouldUseWeaponsAfterBossNeedleFinisher({
    eligible: false,
    attempted: false,
    reason: "needle_finisher_disabled",
  }), true);
  assert.equal(shouldUseWeaponsAfterBossNeedleFinisher({
    eligible: true,
    attempted: false,
    reason: "no_common_fund",
  }), true);
  assert.equal(shouldUseWeaponsAfterBossNeedleFinisher({
    eligible: true,
    attempted: true,
    ok: true,
    blockWeapons: false,
    reason: "needle_finished_fight",
  }), false);
  assert.equal(shouldUseWeaponsAfterBossNeedleFinisher({
    eligible: true,
    attempted: true,
    ok: true,
    blockWeapons: true,
    reason: "needle_still_available",
  }), false);
  assert.equal(shouldUseWeaponsAfterBossNeedleFinisher({
    eligible: true,
    attempted: true,
    ok: true,
    blockWeapons: false,
    reason: "needle_exhausted",
  }), true);
});

test("Needle finisher replaces only the final fight state and keeps combo hits intact", () => {
  const comboResult = {
    haltedReason: "max_cycles_reached",
    cycles: [{ hits: [{ type: "punchChest" }, { type: "kickBalls" }] }],
    finalSnapshot: {
      summary: {
        bossId: 9,
        hasSession: true,
        isCompleted: false,
        currentHp: 25_000,
      },
    },
  };
  const result = mergeBossComboAndNeedleFinisherResult(comboResult, {
    eligible: true,
    attempted: true,
    ok: true,
    blockWeapons: false,
    reason: "needle_finished_fight",
    bossId: 9,
    currentHp: 25_000,
    damageLeftBefore: 50_000,
    requestedAmount: 25_000,
    actualSpent: 25_000,
    damageLeftAfter: 25_000,
    finalSnapshot: {
      summary: {
        bossId: 9,
        hasSession: false,
        isCompleted: true,
        currentHp: 0,
      },
    },
  });

  assert.equal(result.haltedReason, "needle_finisher_finished");
  assert.equal(result.cycles.length, 1);
  assert.equal(result.cycles[0].hits.length, 2);
  assert.equal(result.finalSnapshot.summary.currentHp, 0);
  assert.equal(result.needleFinisher.actualSpent, 25_000);
});

test("automation queue preserves the explicit Needle finisher flag", () => {
  assert.deepEqual(normalizeBossAutomationQueueEntry({
    bossId: 7,
    mode: "odin",
    comboMode: "pacansky",
    hitTypes: ["punchChest", "kickBalls"],
    finishWithNeedle: true,
  }), {
    bossId: 7,
    mode: "odin",
    comboMode: "pacansky",
    label: "#7",
    hitTypes: ["punchChest", "kickBalls"],
    finishWithNeedle: true,
  });
});

test("UI exposes common-fund status, game icons, and the disabled needle tooltip", () => {
  assert.match(htmlSource, /id="header-vpi"[\s\S]*?Общак/);
  assert.match(htmlSource, /VIP\/P_StashV2\.webp/);
  assert.match(htmlSource, /id="boss-needle-btn"[\s\S]*?Пробить урон/);
  assert.match(htmlSource, /VIP\/iglaDamage\.webp/);
  assert.match(appSource, /tooltip:\s*"нет общака"/);
  assert.match(appSource, /wrapper\.title = action\.tooltip/);
  assert.match(appSource, /"POST", "\/api\/bosses\/needle"/);
  assert.match(stylesSource, /\.boss-needle-button:disabled[\s\S]*?cursor:\s*not-allowed/);
  assert.match(stylesSource, /\.boss-needle-button-wrap\[data-tooltip\]:hover::after/);
  assert.match(htmlSource, /id="boss-combo-template-finish-with-needle"[\s\S]*?Добить Иглой/);
  assert.match(appSource, /finishWithNeedle:\s*Boolean\(finishWithNeedle && finishWithNeedle\.checked\)/);
  assert.match(appSource, /finishWithNeedle:\s*storedTemplate \? storedTemplate\.finishWithNeedle === true : false/);
  assert.match(stylesSource, /\.combo-needle-toggle:has\(input:checked\)/);
  for (const source of [appSource, standaloneAppSource].filter(Boolean)) {
    assert.match(source, /Игла пробил урон/);
    assert.doesNotMatch(source, /Игла (?:пробила|недоступна|ограничена)/);
  }
});

test("local gateway uses the confirmed VPI game routes", () => {
  for (const source of [clientSource, standaloneClientSource].filter(Boolean)) {
    assert.match(source, /"GET", "\/api\/vpi\/state"/);
    assert.match(source, /"POST", "\/api\/vpi\/claim"/);
    assert.match(source, /"GET", "\/api\/vpi\/damage-left"/);
    assert.match(source, /"POST", "\/api\/vpi\/spend-damage"/);
  }
  for (const source of [serverSource, standaloneServerSource].filter(Boolean)) {
    assert.match(source, /POST" && pathname === "\/api\/bosses\/needle"/);
    assert.match(source, /await initializeVpiAutomation\(\)/);
  }
});
