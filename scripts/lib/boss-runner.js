const {
  DEFAULT_BOSS_HIT_SEQUENCE,
  buildBossActionCatalog,
  buildBossUseWeaponPayload,
  parseBossHitSequence,
} = require("./boss-actions");
const {
  canBuyKeysForBoss,
  isPrisonKeySourceTargetBoss,
} = require("./boss-keys");

const DEFAULT_MODE_PRIORITY = [
  "pacansky",
  "blotnoy",
  "avtoritetny",
  "vorovskoy",
  "odin",
];

const BOSS_MODE_HP_MULTIPLIERS = Object.freeze({
  pacansky: 1,
  blotnoy: 3,
  avtoritetny: 6,
  vorovskoy: 12,
});

const SOLO_BOSS_MODE = "odin";
const SOLO_BOSS_CONSUMABLE_PRICES = Object.freeze({
  poison: 18,
  gunshot: 5,
  knife: 4,
});
const SOLO_BOSS_CONSUMABLE_KEYS = Object.freeze(Object.keys(SOLO_BOSS_CONSUMABLE_PRICES));
const SOLO_BOSS_MAX_EXPECTED_SHORTFALL_RATIO = 0.02;

function asFiniteNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeModeList(value) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  const output = [];

  for (let i = 0; i < values.length; i++) {
    const item = values[i];
    if (item === undefined || item === null || item === "") {
      continue;
    }
    const parts = String(item).split(/[\s,;]+/);
    for (let j = 0; j < parts.length; j++) {
      const normalized = parts[j].trim().toLowerCase();
      if (normalized) {
        output.push(normalized);
      }
    }
  }

  return output;
}

function normalizeBossIds(value) {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  const output = [];

  for (let i = 0; i < values.length; i++) {
    const num = asFiniteNumber(values[i], null);
    if (num !== null) {
      output.push(num);
    }
  }

  return output;
}

function pickPreferredMode(availableModes, preferredModes = []) {
  if (!Array.isArray(availableModes) || availableModes.length === 0) {
    return null;
  }

  const exactMap = new Map();
  let firstAvailable = null;

  for (let i = 0; i < availableModes.length; i++) {
    const mode = availableModes[i];
    if (mode === undefined || mode === null) continue;
    const strMode = String(mode).trim();
    if (strMode) {
      if (firstAvailable === null) firstAvailable = strMode;
      const key = strMode.toLowerCase();
      if (!exactMap.has(key)) {
        exactMap.set(key, strMode);
      }
    }
  }

  if (firstAvailable === null) {
    return null;
  }

  const preferred = normalizeModeList(preferredModes);
  const order = preferred.length > 0 ? preferred : DEFAULT_MODE_PRIORITY;

  for (let i = 0; i < order.length; i++) {
    const key = order[i];
    if (exactMap.has(key)) {
      return exactMap.get(key);
    }
  }

  return firstAvailable;
}

function normalizeStringValue(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text ? text : null;
}

function normalizeModeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function isSoloBossMode(value) {
  return normalizeModeKey(value) === SOLO_BOSS_MODE;
}

function resolveBossModeHp(baseHp, mode) {
  const baseValue = asFiniteNumber(baseHp, null);
  if (baseValue === null || baseValue <= 0) {
    return null;
  }

  const multiplier = BOSS_MODE_HP_MULTIPLIERS[normalizeModeKey(mode)] || 1;
  return Math.max(baseValue, Math.round(baseValue * multiplier));
}

function hasExplicitHitTypes(value) {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  return true;
}

function normalizeCritChanceValue(value) {
  const parsed = asFiniteNumber(value, 0) || 0;
  const asRatio = parsed > 1 ? parsed / 100 : parsed;
  return Math.max(0, Math.min(1, asRatio));
}

function buildSoloBossConsumableOptions(weaponStatsEffective) {
  return buildBossActionCatalog(weaponStatsEffective)
    .filter((action) => (
      action
      && SOLO_BOSS_CONSUMABLE_KEYS.includes(action.key)
      && Number(action.count || 0) > 0
      && Number(action.damage || 0) > 0
    ))
    .map((action) => {
      const rawDamage = Number(action.damage);
      const critChance = normalizeCritChanceValue(action.critChance);
      return {
        key: action.key,
        count: Math.max(0, Math.floor(Number(action.count || 0))),
        rawDamage,
        critChance,
        expectedDamage: rawDamage * (1 + critChance),
        cost: SOLO_BOSS_CONSUMABLE_PRICES[action.key],
      };
    })
    .filter((action) => Number.isFinite(action.cost) && action.cost > 0);
}

function compareSoloHitCandidates(left, right) {
  if (!right) {
    return -1;
  }

  const fields = [
    "totalCost",
    "expectedOverkill",
    "hits",
    "rawOverkill",
    "rawDamage",
  ];

  for (const field of fields) {
    const delta = Number(left[field] || 0) - Number(right[field] || 0);
    if (Math.abs(delta) > 1e-9) {
      return delta;
    }
  }

  return left.sequence.join(",").localeCompare(right.sequence.join(","));
}

function buildSoloHitSequenceFromCounts(counts, weapons) {
  const weaponMap = new Map(weapons.map((weapon) => [weapon.key, weapon]));
  const ordered = Object.entries(counts)
    .map(([key, count]) => ({
      key,
      count: Math.max(0, Math.floor(Number(count || 0))),
      weapon: weaponMap.get(key) || null,
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => {
      const leftExpected = left.weapon ? left.weapon.expectedDamage : 0;
      const rightExpected = right.weapon ? right.weapon.expectedDamage : 0;
      if (rightExpected !== leftExpected) {
        return rightExpected - leftExpected;
      }

      const leftRaw = left.weapon ? left.weapon.rawDamage : 0;
      const rightRaw = right.weapon ? right.weapon.rawDamage : 0;
      if (rightRaw !== leftRaw) {
        return rightRaw - leftRaw;
      }

      const leftCost = left.weapon ? left.weapon.cost : Number.MAX_SAFE_INTEGER;
      const rightCost = right.weapon ? right.weapon.cost : Number.MAX_SAFE_INTEGER;
      return leftCost - rightCost;
    });

  const sequence = [];
  for (const item of ordered) {
    for (let index = 0; index < item.count; index += 1) {
      sequence.push(item.key);
    }
  }
  return sequence;
}

function evaluateSoloHitCounts(counts, weapons, targetHp) {
  let rawDamage = 0;
  let expectedDamage = 0;
  let totalCost = 0;
  let hits = 0;

  for (const weapon of weapons) {
    const count = Math.max(0, Math.floor(Number(counts[weapon.key] || 0)));
    if (count <= 0) {
      continue;
    }
    rawDamage += weapon.rawDamage * count;
    expectedDamage += weapon.expectedDamage * count;
    totalCost += weapon.cost * count;
    hits += count;
  }

  const rawShortfall = Math.max(0, targetHp - rawDamage);
  const expectedCovers = expectedDamage + 1e-9 >= targetHp;
  const shortfallAllowed = rawShortfall <= 1e-9
    || rawShortfall <= targetHp * SOLO_BOSS_MAX_EXPECTED_SHORTFALL_RATIO;

  if (hits === 0 || !expectedCovers || !shortfallAllowed) {
    return null;
  }

  return {
    counts: { ...counts },
    sequence: buildSoloHitSequenceFromCounts(counts, weapons),
    rawDamage,
    expectedDamage,
    totalCost,
    hits,
    rawShortfall,
    rawOverkill: Math.max(0, rawDamage - targetHp),
    expectedOverkill: Math.max(0, expectedDamage - targetHp),
  };
}

function buildCheapestSoloBossHitPlan(weaponStatsEffective, targetHp) {
  const normalizedTargetHp = asFiniteNumber(targetHp, null);
  const weapons = buildSoloBossConsumableOptions(weaponStatsEffective);
  const basePlan = {
    mode: SOLO_BOSS_MODE,
    targetHp: normalizedTargetHp,
    critModel: "expected_double_damage",
    maxExpectedShortfallRatio: SOLO_BOSS_MAX_EXPECTED_SHORTFALL_RATIO,
    priceModel: { ...SOLO_BOSS_CONSUMABLE_PRICES },
    weapons: weapons.map((weapon) => ({
      key: weapon.key,
      count: weapon.count,
      rawDamage: weapon.rawDamage,
      critChance: weapon.critChance,
      expectedDamage: weapon.expectedDamage,
      cost: weapon.cost,
    })),
    counts: {},
    sequence: [],
    rawDamage: 0,
    expectedDamage: 0,
    totalCost: 0,
    hits: 0,
    rawShortfall: 0,
    sufficient: false,
    reason: null,
  };

  if (normalizedTargetHp === null || normalizedTargetHp <= 0) {
    return {
      ...basePlan,
      reason: "invalid_target_hp",
    };
  }

  if (weapons.length === 0) {
    return {
      ...basePlan,
      reason: "no_available_consumables",
    };
  }

  // Inventory can contain thousands of consumables, but an optimal plan never needs
  // more copies of one weapon than that weapon alone would need to cover the target.
  // Capping the search by useful damage changes a multi-million-iteration scan into
  // a tiny exact search while preserving the same cost/overkill ordering.
  const enumWeapons = weapons
    .map((weapon) => ({
      ...weapon,
      searchLimit: Math.min(
        weapon.count,
        Math.max(1, Math.ceil(normalizedTargetHp / weapon.rawDamage)),
      ),
    }))
    .sort((left, right) => left.searchLimit - right.searchLimit);
  const first = enumWeapons[0] || null;
  const second = enumWeapons[1] || null;
  const third = enumWeapons[2] || null;
  let best = null;

  for (let firstCount = 0; firstCount <= (first ? first.searchLimit : 0); firstCount += 1) {
    const firstDamage = first ? first.expectedDamage * firstCount : 0;
    const firstRawDamage = first ? first.rawDamage * firstCount : 0;
    const secondMax = second ? second.searchLimit : 0;

    for (let secondCount = 0; secondCount <= secondMax; secondCount += 1) {
      const secondDamage = second ? second.expectedDamage * secondCount : 0;
      const secondRawDamage = second ? second.rawDamage * secondCount : 0;
      const counts = {};
      if (first && firstCount > 0) {
        counts[first.key] = firstCount;
      }
      if (second && secondCount > 0) {
        counts[second.key] = secondCount;
      }

      const remainingDamage = normalizedTargetHp - firstDamage - secondDamage;
      const remainingRawDamage = (
        normalizedTargetHp * (1 - SOLO_BOSS_MAX_EXPECTED_SHORTFALL_RATIO)
      ) - firstRawDamage - secondRawDamage;
      let thirdCount = 0;
      if (remainingDamage > 1e-9 || remainingRawDamage > 1e-9) {
        if (!third || third.expectedDamage <= 0 || third.rawDamage <= 0) {
          continue;
        }
        thirdCount = Math.max(
          0,
          Math.ceil(remainingDamage / third.expectedDamage),
          Math.ceil(remainingRawDamage / third.rawDamage),
        );
        if (thirdCount > third.searchLimit) {
          continue;
        }
      }

      if (third && thirdCount > 0) {
        counts[third.key] = thirdCount;
      }

      const candidate = evaluateSoloHitCounts(counts, weapons, normalizedTargetHp);
      if (!candidate) {
        continue;
      }
      if (compareSoloHitCandidates(candidate, best) < 0) {
        best = candidate;
      }
    }
  }

  if (!best) {
    return {
      ...basePlan,
      reason: "insufficient_expected_damage",
    };
  }

  return {
    ...basePlan,
    counts: best.counts,
    sequence: best.sequence,
    rawDamage: best.rawDamage,
    expectedDamage: best.expectedDamage,
    totalCost: best.totalCost,
    hits: best.hits,
    rawShortfall: best.rawShortfall,
    sufficient: true,
    reason: "ok",
  };
}

function getBossRunnerPlanMode(startPlan) {
  return normalizeStringValue(
    startPlan && startPlan.selectedBoss && startPlan.selectedBoss.selectedMode
      ? startPlan.selectedBoss.selectedMode
      : startPlan && startPlan.payload && startPlan.payload.mode
        ? startPlan.payload.mode
        : startPlan && startPlan.activeSession && startPlan.activeSession.session
          ? startPlan.activeSession.session.mode
          : null,
  );
}

function getBossRunnerTargetHp(startPlan, selectedBoss) {
  const activeSession = startPlan && startPlan.activeSession && startPlan.activeSession.session
    ? startPlan.activeSession.session
    : null;
  const activeBossId = activeSession && activeSession.bossId !== undefined && activeSession.bossId !== null
    ? Number(activeSession.bossId)
    : null;
  const selectedBossId = selectedBoss && selectedBoss.id !== undefined && selectedBoss.id !== null
    ? Number(selectedBoss.id)
    : null;
  const activeCurrentHp = activeSession ? asFiniteNumber(activeSession.currentHp, null) : null;

  if (
    activeCurrentHp !== null
    && activeCurrentHp > 0
    && (selectedBossId === null || activeBossId === null || selectedBossId === activeBossId)
  ) {
    return activeCurrentHp;
  }

  return resolveBossModeHp(
    selectedBoss ? selectedBoss.baseHp : null,
    getBossRunnerPlanMode(startPlan),
  );
}

function uniqueStringValues(values) {
  const output = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = normalizeStringValue(value);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(normalized);
  }
  return output;
}

function resolveAvailableComboModes(boss) {
  if (!boss || typeof boss !== "object") {
    return [];
  }

  // An explicitly empty live list means combos were removed from this boss.
  // Only fall back to legacy combo metadata when the field is absent entirely.
  if (Array.isArray(boss.comboModeKeys)) {
    return uniqueStringValues(boss.comboModeKeys);
  }

  if (boss.combos && typeof boss.combos === "object") {
    return uniqueStringValues(Object.keys(boss.combos));
  }

  const modesWithCombo = Array.isArray(boss.modes)
    ? boss.modes
      .filter((mode) => mode && mode.combo)
      .map((mode) => mode.key)
    : [];

  return uniqueStringValues(modesWithCombo);
}

function pickComboMode(selectedBoss, requestedComboMode) {
  const normalizedRequested = normalizeStringValue(requestedComboMode);
  if (!normalizedRequested) {
    return null;
  }

  const comboModes = uniqueStringValues(
    Array.isArray(selectedBoss && selectedBoss.availableComboModes)
      ? selectedBoss.availableComboModes
      : [],
  );
  const bossLabel = selectedBoss && selectedBoss.id ? selectedBoss.id : "unknown";

  if (comboModes.length === 0) {
    throw new Error(`Boss ${bossLabel} has no combo modes.`);
  }

  const matched = comboModes.find(
    (value) => String(value).trim().toLowerCase() === normalizedRequested.toLowerCase(),
  );

  if (matched) {
    return matched;
  }

  throw new Error(
    `Unsupported combo mode "${normalizedRequested}" for boss ${bossLabel}. ` +
    `Available: ${comboModes.join(", ")}.`,
  );
}

function buildActiveSessionView(catalog) {
  const account = catalog && catalog.account ? catalog.account : {};
  const dailyBossBattleLimit = account.dailyBossBattleLimit ?? null;
  const activeSession = account.activeSession || null;
  const activeBoss = activeSession
    ? catalog.bosses.find((boss) => Number(boss.id) === Number(activeSession.bossId)) || null
    : null;

  return {
    generatedAt: catalog.generatedAt,
    state: account.state ?? null,
    sessionActive: Boolean(activeSession),
    claimReady: Boolean(account.claimReady),
    dailyBossBattleLimit,
    totalUsedToday: null,
    remainingToday: null,
    session: activeSession,
    activeBoss: activeBoss
      ? {
          id: activeBoss.id,
          title: activeBoss.title,
          categoryId: activeBoss.categoryId,
          categoryKey: activeBoss.categoryKey,
          baseHp: activeBoss.baseHp,
          battleModeKeys: activeBoss.battleModeKeys,
        }
      : null,
    friendDamage: account.friendDamage ?? null,
    talentState: account.talentState ?? null,
    weaponStatsEffective: account.weaponStatsEffective ?? null,
  };
}

function buildBossCandidate(boss, context = {}) {
  const active = context.active || null;
  const preferredModes = context.preferredModes ?? [];
  const explicitMode = context.explicitMode ? String(context.explicitMode).trim().toLowerCase() : null;
  const availableModes = Array.isArray(boss.battleModeKeys) ? boss.battleModeKeys : [];
  const availableComboModes = resolveAvailableComboModes(boss);
  const mode = explicitMode
    ? availableModes.find((item) => String(item).trim().toLowerCase() === explicitMode) || null
    : pickPreferredMode(availableModes, preferredModes);
  const arrivalKnown = Boolean(boss.arrival);
  const arrivalOpen = boss.arrival ? Boolean(boss.arrival.isOpen) : null;

  let blockedReason = null;

  if (arrivalKnown && arrivalOpen === false) {
    blockedReason = "arrival_not_open";
  } else if (explicitMode && !mode) {
    blockedReason = "mode_unavailable";
  } else if (!mode) {
    blockedReason = "no_matching_mode";
  } else if (
    boss.attacks
    && boss.attacks.dailyLimit !== null
    && Number(boss.attacks.usedToday ?? 0) >= Number(boss.attacks.dailyLimit)
  ) {
    blockedReason = "daily_limit_reached";
  }

  const activeSession = context.activeSession || null;
  const requiredKeys = Math.max(0, Number(boss.keys && boss.keys.requiredForAttack || 0));
  const ownedAttackKeys = Math.max(
    0,
    Number(
      boss.keys && (
        boss.keys.ownedAttackKeys
        ?? boss.keys.owned
        ?? boss.keys.ownedSourceKeys
      ) || 0,
    ),
  );
  const keyBypassed = Boolean(boss.keys && boss.keys.bypassedForAttack);
  const keySourceBossId = boss.keys ? boss.keys.sourceBossId : null;
  const keySourceLabel = boss.keys ? boss.keys.sourceLabel : null;
  const keysMissing = keyBypassed ? 0 : Math.max(0, requiredKeys - ownedAttackKeys);
  const hasEnoughKeys = keyBypassed || keysMissing === 0;
  const keySourceIsPrison = isPrisonKeySourceTargetBoss(boss.id)
    || String(keySourceLabel || "").trim().toLowerCase() === "in prisons";
  const canBuyKeys = !keyBypassed
    && requiredKeys > 0
    && canBuyKeysForBoss(boss.id)
    && Number.isFinite(Number(keySourceBossId))
    && Number(keySourceBossId) > 0
    && !keySourceIsPrison;

  return {
    id: boss.id,
    title: boss.title,
    categoryId: boss.categoryId,
    categoryKey: boss.categoryKey,
    sortIndex: Number.isFinite(Number(boss.sortIndex)) ? Number(boss.sortIndex) : null,
    baseHp: boss.baseHp,
    battleTimeSec: boss.battleTimeSec,
    availableModes,
    availableComboModes,
    selectedMode: mode,
    keysOwned: ownedAttackKeys,
    ownBossKeysOwned: Math.max(
      0,
      Number(
        boss.keys && (
          boss.keys.ownedTargetKeys
          ?? boss.keys.owned
          ?? 0
        ) || 0,
      ),
    ),
    ownedTargetKeys: Math.max(0, Number(boss.keys && boss.keys.ownedTargetKeys || 0)),
    ownedSourceKeys: Math.max(0, Number(boss.keys && boss.keys.ownedSourceKeys || 0)),
    requiredKeys,
    keysMissing,
    hasEnoughKeys,
    keyBypassed,
    keySourceBossId,
    keySourceBossTitle: boss.keys ? boss.keys.sourceBossTitle : null,
    keySourceLabel,
    canBuyKeys,
    baseRewardKeysPerWin: boss.keys ? boss.keys.baseRewardPerWin : null,
    bonusKeysByDamage: boss.keys ? boss.keys.bonusKeysByDamage : null,
    bonusKeyDamageTiers: boss.keys ? boss.keys.bonusKeyDamageTiers : [],
    rewardKeysPerWin: boss.keys ? boss.keys.rewardPerWin : null,
    dailyLimit: boss.attacks ? boss.attacks.dailyLimit : null,
    usedToday: boss.attacks ? boss.attacks.usedToday : null,
    remainingToday: boss.attacks ? boss.attacks.remainingToday : null,
    globalDailyLimit: null,
    globalUsedToday: null,
    globalRemainingToday: null,
    arrivalOpen,
    arrivalWindowEndUtc: boss.arrival ? boss.arrival.windowEndUtc : null,
    openByKeychain: Boolean(boss.keys && boss.keys.openByKeychain),
    currentSession: activeSession && Number(activeSession.bossId) === Number(boss.id)
      ? {
          sessionId: activeSession.sessionId,
          mode: activeSession.mode,
          currentHp: activeSession.currentHp,
          personalDamage: activeSession.personalDamage,
          endsAt: activeSession.endsAt,
        }
      : null,
    canStart: blockedReason === null,
    blockedReason,
  };
}

function compareBossCandidates(left, right) {
  if (Boolean(left.currentSession) !== Boolean(right.currentSession)) {
    return Boolean(right.currentSession) - Boolean(left.currentSession);
  }

  if (Boolean(left.arrivalOpen) !== Boolean(right.arrivalOpen)) {
    return Boolean(right.arrivalOpen) - Boolean(left.arrivalOpen);
  }

  if ((right.rewardKeysPerWin || 0) !== (left.rewardKeysPerWin || 0)) {
    return (right.rewardKeysPerWin || 0) - (left.rewardKeysPerWin || 0);
  }

  if (Boolean(left.hasEnoughKeys) !== Boolean(right.hasEnoughKeys)) {
    return Boolean(right.hasEnoughKeys) - Boolean(left.hasEnoughKeys);
  }

  if ((left.keysMissing || 0) !== (right.keysMissing || 0)) {
    return (left.keysMissing || 0) - (right.keysMissing || 0);
  }

  if ((right.keysOwned || 0) !== (left.keysOwned || 0)) {
    return (right.keysOwned || 0) - (left.keysOwned || 0);
  }

  if ((left.categoryId || 0) !== (right.categoryId || 0)) {
    return (left.categoryId || 0) - (right.categoryId || 0);
  }

  return (left.id || 0) - (right.id || 0);
}

function buildBossQueueView(catalog, options = {}) {
  const active = buildActiveSessionView(catalog);
  const explicitBossIds = normalizeBossIds(options.bossIds);
  const bossIdSet = explicitBossIds.length > 0 ? new Set(explicitBossIds.map((id) => Number(id))) : null;
  const categoryId = options.categoryId ? Number(options.categoryId) : null;

  const bosses = catalog.bosses
    .filter((boss) => (categoryId ? Number(boss.categoryId) === categoryId : true))
    .filter((boss) => (bossIdSet ? bossIdSet.has(Number(boss.id)) : true))
    .map((boss) => buildBossCandidate(boss, {
      active,
      activeSession: active.session,
      explicitMode: options.mode,
      preferredModes: options.preferredModes,
      openOnly: Boolean(options.openOnly),
    }))
    .sort(compareBossCandidates);

  return {
    generatedAt: catalog.generatedAt,
    filters: {
      categoryId,
      bossIds: explicitBossIds,
      openOnly: Boolean(options.openOnly),
      mode: options.mode ?? null,
      preferredModes: normalizeModeList(options.preferredModes),
    },
    activeSession: active,
    totalBosses: bosses.length,
    startableCount: bosses.filter((boss) => boss.canStart).length,
    blockedCount: bosses.filter((boss) => !boss.canStart).length,
    bosses,
  };
}

function resolveExplicitBoss(catalog, bossId) {
  const numericBossId = Number(bossId);
  return catalog.bosses.find((boss) => Number(boss.id) === numericBossId) || null;
}

function prepareBossRunnerStart(catalog, options = {}) {
  const active = buildActiveSessionView(catalog);
  const explicitBossId = options.bossId !== undefined && options.bossId !== null
    ? Number(options.bossId)
    : null;
  const explicitMode = options.mode ? String(options.mode).trim() : null;
  const explicitComboMode = normalizeStringValue(options.comboMode);

  if (active.sessionActive && !options.forceNew) {
    const activeBossMatchesRequest = explicitBossId === null || Number(active.session.bossId) === explicitBossId;
    if (activeBossMatchesRequest || options.allowActiveSessionMismatch) {
      const activeBoss = resolveExplicitBoss(catalog, active.session.bossId);
      const reuseMode = activeBossMatchesRequest ? explicitMode || active.session.mode : active.session.mode;
      const reuseComboMode = activeBossMatchesRequest ? explicitComboMode : null;
      const selectedBossRaw = activeBoss
        ? buildBossCandidate(activeBoss, {
            active,
            activeSession: active.session,
            explicitMode: reuseMode,
            preferredModes: options.preferredModes,
            openOnly: Boolean(options.openOnly),
          })
        : null;
      const selectedBoss = selectedBossRaw
        ? {
            ...selectedBossRaw,
            selectedComboMode: pickComboMode(selectedBossRaw, reuseComboMode),
          }
        : null;

      return {
        generatedAt: catalog.generatedAt,
        action: "reuse-active",
        reason: activeBossMatchesRequest ? "active_session_exists" : "active_session_overrides_requested_boss",
        requestedBossId: activeBossMatchesRequest ? null : explicitBossId,
        activeSession: active,
        selectedBoss,
        payload: null,
      };
    }

    throw new Error(
      `Active boss session already exists for boss ${active.session.bossId} (${active.session.mode}). ` +
      "Finish or surrender it first, or pass --force-new true.",
    );
  }

  const queue = buildBossQueueView(catalog, options);
  let selectedBoss = null;

  if (explicitBossId !== null) {
    const explicitBoss = resolveExplicitBoss(catalog, explicitBossId);
    if (!explicitBoss) {
      throw new Error(`Boss ${explicitBossId} was not found in the current catalog.`);
    }

    selectedBoss = buildBossCandidate(explicitBoss, {
      active,
      activeSession: active.session,
      explicitMode,
      preferredModes: options.preferredModes,
      openOnly: Boolean(options.openOnly),
    });
  } else {
    selectedBoss = queue.bosses.find((boss) => boss.canStart) || null;
  }

  if (!selectedBoss) {
    throw new Error("No boss matched the current runner filters.");
  }

  if (!selectedBoss.canStart) {
    const limitInfo = selectedBoss.dailyLimit === null
      ? `used ${selectedBoss.usedToday}`
      : `used ${selectedBoss.usedToday}/${selectedBoss.dailyLimit}`;
    throw new Error(
      `Boss ${selectedBoss.id} (${selectedBoss.title || "unknown"}) cannot be started with the current filters: ` +
      `${selectedBoss.blockedReason} (${limitInfo}).`,
    );
  }
  const selectedComboMode = pickComboMode(selectedBoss, explicitComboMode);
  const selectedBossWithCombo = {
    ...selectedBoss,
    selectedComboMode,
  };

  return {
    generatedAt: catalog.generatedAt,
    action: "start-attack",
    activeSession: active,
    queue,
    selectedBoss: selectedBossWithCombo,
    payload: {
      bossId: selectedBossWithCombo.id,
      mode: selectedBossWithCombo.selectedMode,
      comboMode: selectedComboMode,
    },
  };
}

function prepareBossRunnerHit(catalog, options = {}) {
  const startPlan = prepareBossRunnerStart(catalog, {
    ...options,
    allowActiveSessionMismatch: true,
  });
  const selectedBoss = startPlan.selectedBoss || startPlan.activeSession && startPlan.activeSession.activeBoss || null;
  const selectedMode = getBossRunnerPlanMode(startPlan);
  const targetHp = getBossRunnerTargetHp(startPlan, selectedBoss);
  const soloHitPlan = !hasExplicitHitTypes(options.types) && isSoloBossMode(selectedMode)
    ? buildCheapestSoloBossHitPlan(
        catalog && catalog.account ? catalog.account.weaponStatsEffective : null,
        targetHp,
      )
    : null;
  const sequence = soloHitPlan
    ? soloHitPlan.sequence
    : parseBossHitSequence(
        options.types === undefined || options.types === null ? DEFAULT_BOSS_HIT_SEQUENCE : options.types,
      );
  const requests = sequence.map((type) => ({
    type,
    payload: buildBossUseWeaponPayload(type, null),
  }));

  return {
    generatedAt: catalog.generatedAt,
    action: "runner-hit",
    startPlan,
    selectedBoss,
    selectedMode,
    targetHp,
    soloHitPlan,
    sequence,
    requests,
  };
}

module.exports = {
  DEFAULT_MODE_PRIORITY,
  buildActiveSessionView,
  buildBossQueueView,
  buildCheapestSoloBossHitPlan,
  normalizeModeList,
  pickPreferredMode,
  prepareBossRunnerHit,
  prepareBossRunnerStart,
  resolveBossModeHp,
};
