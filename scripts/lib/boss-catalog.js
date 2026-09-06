const fs = require("node:fs/promises");
const path = require("node:path");

const { ARTIFACTS_DIR } = require("./pbot");
const {
  getBossDamageBonusKeyCount,
  getBossDamageBonusKeyTiers,
  getKeySourceLabelForBoss,
  getQualifiedBossKeyRewardCount,
  getRequiredKeysForAttack,
  resolveKeySourceBoss,
} = require("./boss-keys");

const CATEGORY_BY_ID = {
  1: "bers",
  2: "guards",
  3: "recid",
};
const CATEGORY_IDS = Object.keys(CATEGORY_BY_ID).map((value) => Number(value));

const BOSS_CATALOG_LATEST_PATH = path.join(ARTIFACTS_DIR, "boss-catalog-latest.json");
const BOSS_CATALOG_SEED_PATH = path.join(__dirname, "..", "data", "boss-catalog-seed.json");

function normalizeSession(session) {
  if (!session || typeof session !== "object") {
    return null;
  }

  return {
    sessionId: session.sessionId ?? null,
    bossId: session.bossId ?? null,
    mode: session.mode ?? null,
    startedAt: session.startedAt ?? null,
    endsAt: session.endsAt ?? null,
    isCompleted: session.isCompleted ?? null,
    baseHp: session.baseHp ?? null,
    maxHp: session.maxHp ?? session.baseHp ?? null,
    currentHp: session.currentHp ?? null,
    phase: session.phase ?? null,
    title: session.title ?? null,
    personalDamage: session.personalDamage ?? null,
    personalRawDamage: session.personalRawDamage ?? null,
    maxSingleHitRaw: session.maxSingleHitRaw ?? null,
    iglaDamage: session.iglaDamage ?? null,
    rewardClaimed: session.rewardClaimed ?? null,
  };
}

function normalizeFriendDamage(friendDamage) {
  if (!friendDamage || typeof friendDamage !== "object") {
    return null;
  }

  return {
    isOver: friendDamage.isOver ?? null,
    itemsCount: Array.isArray(friendDamage.items) ? friendDamage.items.length : 0,
  };
}

function normalizeTalentState(talentState) {
  if (!talentState || typeof talentState !== "object") {
    return null;
  }

  return {
    spentPoints: talentState.spentPoints ?? null,
    unspentPoints: talentState.unspentPoints ?? null,
    currentDamage: talentState.currentDamage ?? null,
    vipPersistent: talentState.vipPersistent ?? null,
    isMax: talentState.isMax ?? null,
  };
}

function normalizeWeaponStats(weaponStats) {
  if (!weaponStats || typeof weaponStats !== "object") {
    return null;
  }

  return {
    userId: weaponStats.userId ?? null,
    counts: {
      poison: weaponStats.poisonCount ?? 0,
      gunshot: weaponStats.gunshotCount ?? 0,
      knife: weaponStats.knifeCount ?? 0,
    },
    damage: {
      poison: weaponStats.poisonDamage ?? null,
      gunshot: weaponStats.gunshotDamage ?? null,
      knife: weaponStats.knifeDamage ?? null,
      punchChest: weaponStats.punchChestDamage ?? null,
      kickBalls: weaponStats.kickBallsDamage ?? null,
      pokeEyes: weaponStats.pokeEyesDamage ?? null,
      kneeEar: weaponStats.kneeEarDamage ?? null,
      bicepsBonus: weaponStats.bicepsBonus ?? null,
    },
    cooldownSec: {
      punchChest: weaponStats.punchChestCooldownSec ?? null,
      kickBalls: weaponStats.kickBallsCooldownSec ?? null,
      pokeEyes: weaponStats.pokeEyesCooldownSec ?? null,
      kneeEar: weaponStats.kneeEarCooldownSec ?? null,
    },
    lastUsedAt: {
      punchChest: weaponStats.lastPunchChestTime ?? null,
      kickBalls: weaponStats.lastKickBallsTime ?? null,
      pokeEyes: weaponStats.lastPokeEyesTime ?? null,
      kneeEar: weaponStats.lastKneeEarTime ?? null,
    },
    cooldownReduction: {
      punchChest: weaponStats.punchChestCooldownReduction ?? null,
      kickBalls: weaponStats.kickBallsCooldownReduction ?? null,
      pokeEyes: weaponStats.pokeEyesCooldownReduction ?? null,
      kneeEar: weaponStats.kneeEarCooldownReduction ?? null,
    },
    critChance: {
      poison: weaponStats.poisonCritChance ?? null,
      gunshot: weaponStats.gunshotCritChance ?? null,
      knife: weaponStats.knifeCritChance ?? null,
      punchChest: weaponStats.punchChestCritChance ?? null,
      kickBalls: weaponStats.kickBallsCritChance ?? null,
      pokeEyes: weaponStats.pokeEyesCritChance ?? null,
      kneeEar: weaponStats.kneeEarCritChance ?? null,
    },
    inventoryRev: weaponStats.inventoryRev ?? null,
    rulesRev: weaponStats.rulesRev ?? null,
    talentsRev: weaponStats.talentsRev ?? null,
  };
}

function sumValues(object) {
  if (!object || typeof object !== "object") {
    return 0;
  }

  return Object.values(object).reduce((total, value) => total + (Number(value) || 0), 0);
}

function countByType(items) {
  const counts = {};

  for (const item of items || []) {
    const type = item && item.type ? item.type : "unknown";
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts;
}

function normalizeCurrencies(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        type: item && item.type ? item.type : null,
        amount: item && item.amount !== undefined ? Number(item.amount) || 0 : 0,
      }))
    : [];
}

function normalizeRewardItem(item, fallbackType = null) {
  const type = item && item.type ? item.type : fallbackType;
  const id = item && item.id !== undefined
    ? item.id
    : type === "tattoo"
      ? item && item.tattooId
      : type === "clothing"
        ? item && item.clothingId
        : item && item.cameraId;
  return {
    type: type || null,
    id: id === undefined || id === null ? null : Number(id),
    tattooId: type === "tattoo" ? Number(id) : item && item.tattooId !== undefined ? item.tattooId : null,
    clothingId: type === "clothing" ? Number(id) : item && item.clothingId !== undefined ? item.clothingId : null,
    cameraId: type === "camera" ? Number(id) : item && item.cameraId !== undefined ? item.cameraId : null,
    previewUrl: item && item.previewUrl ? item.previewUrl : null,
  };
}

function normalizeRewards(items) {
  const rewards = Array.isArray(items) ? items : [];
  const normalizedItems = rewards.map((item) => normalizeRewardItem(item));

  return {
    count: rewards.length,
    byType: countByType(rewards),
    preview: normalizedItems.slice(0, 5),
    items: normalizedItems,
  };
}

function normalizeCombo(combo) {
  if (!combo || typeof combo !== "object") {
    return null;
  }

  const comboItems = combo.items && typeof combo.items === "object"
    ? combo.items
    : {};
  const comboItemCatalog = combo.itemCatalog && typeof combo.itemCatalog === "object"
    ? combo.itemCatalog
    : {};
  const readItemList = (type) => {
    const persistedItems = comboItemCatalog[type];
    if (Array.isArray(persistedItems)) {
      return persistedItems;
    }
    return Array.isArray(comboItems[type]) ? comboItems[type] : [];
  };
  const readItemCount = (value, itemList) => {
    if (Array.isArray(value)) {
      return value.length;
    }

    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return Math.floor(numeric);
    }

    return itemList.length;
  };
  const tattooItems = readItemList("tattoos");
  const clothingItems = readItemList("clothing");
  const cameraItems = readItemList("cameras");

  return {
    length: combo.length ?? null,
    allowedSet: combo.allowedSet ?? null,
    authority: combo.authority ?? null,
    stash: combo.stash
      ? {
          icon: combo.stash.icon ?? null,
          count: combo.stash.count ?? null,
        }
      : null,
    currencyChoice: normalizeCurrencies(combo.currencyChoice),
    items: {
      tattoos: readItemCount(comboItems.tattoos, tattooItems),
      clothing: readItemCount(comboItems.clothing, clothingItems),
      cameras: readItemCount(comboItems.cameras, cameraItems),
    },
    itemCatalog: {
      tattoos: tattooItems.map((item) => normalizeRewardItem(item, "tattoo")),
      clothing: clothingItems.map((item) => normalizeRewardItem(item, "clothing")),
      cameras: cameraItems.map((item) => normalizeRewardItem(item, "camera")),
    },
  };
}

function normalizeModeKey(modeKey) {
  if (modeKey === undefined || modeKey === null) {
    return null;
  }

  const text = String(modeKey).trim().toLowerCase();
  return text || null;
}

const COMBO_MODE_KEYS = ["pacansky", "blotnoy", "avtoritetny"];

function cloneCombo(combo) {
  if (!combo || typeof combo !== "object") {
    return null;
  }

  return {
    ...combo,
    stash: combo.stash ? { ...combo.stash } : null,
    currencyChoice: Array.isArray(combo.currencyChoice)
      ? combo.currencyChoice.map((item) => ({
          type: item && item.type ? item.type : null,
          amount: item && item.amount !== undefined ? Number(item.amount) || 0 : 0,
        }))
      : [],
    items: combo.items
      ? {
          tattoos: Number(combo.items.tattoos) || 0,
          clothing: Number(combo.items.clothing) || 0,
          cameras: Number(combo.items.cameras) || 0,
        }
      : {
          tattoos: 0,
          clothing: 0,
          cameras: 0,
        },
    itemCatalog: combo.itemCatalog
      ? {
          tattoos: Array.isArray(combo.itemCatalog.tattoos)
            ? combo.itemCatalog.tattoos.map((item) => ({ ...item }))
            : [],
          clothing: Array.isArray(combo.itemCatalog.clothing)
            ? combo.itemCatalog.clothing.map((item) => ({ ...item }))
            : [],
          cameras: Array.isArray(combo.itemCatalog.cameras)
            ? combo.itemCatalog.cameras.map((item) => ({ ...item }))
            : [],
        }
      : {
          tattoos: [],
          clothing: [],
          cameras: [],
        },
  };
}

function expandComboLookupByAllowedSet(inputLookup) {
  if (!inputLookup || typeof inputLookup !== "object") {
    return {};
  }

  const lookup = { ...inputLookup };
  const knownEntries = Object.entries(lookup).filter(([modeKey]) => COMBO_MODE_KEYS.includes(modeKey));
  if (knownEntries.length === 0) {
    return lookup;
  }

  for (const [, combo] of knownEntries) {
    const allowedSet = normalizeModeKey(combo && combo.allowedSet);
    if (allowedSet !== "all") {
      continue;
    }

    for (const comboModeKey of COMBO_MODE_KEYS) {
      if (!lookup[comboModeKey]) {
        lookup[comboModeKey] = cloneCombo(combo);
      }
    }
  }

  return lookup;
}

function buildComboLookupFromMap(combos) {
  if (!combos || typeof combos !== "object") {
    return {};
  }

  const lookup = {};

  for (const [rawModeKey, comboValue] of Object.entries(combos)) {
    const modeKey = normalizeModeKey(rawModeKey);
    const combo = normalizeCombo(comboValue);

    if (!modeKey || !combo) {
      continue;
    }

    lookup[modeKey] = combo;
  }

  return expandComboLookupByAllowedSet(lookup);
}

function buildComboLookupFromModes(modes) {
  if (!Array.isArray(modes)) {
    return {};
  }

  const lookup = {};

  for (const mode of modes) {
    const modeKey = normalizeModeKey(mode && mode.key);
    const combo = normalizeCombo(mode && mode.combo);

    if (!modeKey || !combo) {
      continue;
    }

    if (!lookup[modeKey]) {
      lookup[modeKey] = combo;
    }
  }

  return expandComboLookupByAllowedSet(lookup);
}

function resolveFallbackComboLookup(boss, fallbackModes = []) {
  // An explicitly saved empty list records that the game removed all combos.
  // Do not reconstruct them from legacy reward metadata during fast refreshes.
  if (boss && Array.isArray(boss.comboModeKeys) && boss.comboModeKeys.length === 0) {
    return {};
  }

  const comboLookupFromMap = buildComboLookupFromMap(boss && boss.combos);
  return Object.keys(comboLookupFromMap).length > 0
    ? comboLookupFromMap
    : buildComboLookupFromModes(fallbackModes);
}

function resolveBossBattleModes(boss, fallbackBoss, comboLookup = {}) {
  const liveBattleModes = boss
    && boss.battleModes
    && typeof boss.battleModes === "object"
    && !Array.isArray(boss.battleModes)
    ? boss.battleModes
    : {};
  const liveModeKeys = Object.keys(liveBattleModes);
  const fallbackModes = Array.isArray(fallbackBoss && fallbackBoss.modes)
    ? fallbackBoss.modes
    : [];
  const fallbackModeByKey = new Map(
    fallbackModes
      .map((mode) => [normalizeModeKey(mode && mode.key), mode])
      .filter(([modeKey]) => Boolean(modeKey)),
  );
  const fallbackModeKeys = [
    ...new Set([
      ...(Array.isArray(fallbackBoss && fallbackBoss.battleModeKeys)
        ? fallbackBoss.battleModeKeys
        : []),
      ...fallbackModes.map((mode) => mode && mode.key),
    ]
      .map(normalizeModeKey)
      .filter(Boolean)),
  ];
  const battleModeKeys = liveModeKeys.length > 0 ? liveModeKeys : fallbackModeKeys;

  return {
    battleModeKeys,
    modes: battleModeKeys.map((modeKey) => {
      const normalizedModeKey = normalizeModeKey(modeKey);
      const liveMode = liveBattleModes[modeKey];
      const fallbackMode = fallbackModeByKey.get(normalizedModeKey) || null;
      return {
        key: modeKey,
        rewards: liveMode
          ? normalizeRewards(liveMode.rewards)
          : fallbackMode && fallbackMode.rewards && typeof fallbackMode.rewards === "object"
            ? fallbackMode.rewards
            : normalizeRewards([]),
        combo: comboLookup[normalizedModeKey] || normalizeCombo(fallbackMode && fallbackMode.combo),
      };
    }),
  };
}

function normalizeDrop(drop) {
  return {
    bossId: drop && drop.bossId !== undefined ? drop.bossId : null,
    mode: drop && drop.mode ? drop.mode : null,
    items: Array.isArray(drop && drop.items)
      ? drop.items.map((item) => ({
          id: item && item.id !== undefined ? item.id : null,
          name: item && item.name ? item.name : null,
          image: item && item.image ? item.image : null,
        }))
      : [],
  };
}

function buildBossTitleMap(rawBossItems, fallbackBosses) {
  const titleMap = new Map();

  for (const row of rawBossItems) {
    const boss = row && row.item ? row.item.boss : null;
    if (!boss || boss.id === undefined || boss.id === null) {
      continue;
    }
    titleMap.set(Number(boss.id), boss.title || null);
  }

  for (const boss of fallbackBosses) {
    if (!boss || boss.id === undefined || boss.id === null) {
      continue;
    }
    if (!titleMap.has(Number(boss.id))) {
      titleMap.set(Number(boss.id), boss.title || null);
    }
  }

  return titleMap;
}

function getBossKeyRewardCount(boss) {
  if (!boss || typeof boss !== "object") {
    return 0;
  }

  const value = boss.globalReward && boss.globalReward.keys !== undefined
    ? boss.globalReward.keys
    : boss.keys && boss.keys.rewardPerWin !== undefined
      ? boss.keys.rewardPerWin
      : 0;
  return Math.max(0, Number(value) || 0);
}

function getPersistedKeyRequirement(boss) {
  const keys = boss && boss.keys && typeof boss.keys === "object" ? boss.keys : null;
  if (!keys) {
    return null;
  }

  const sourceBossId = Number(keys.sourceBossId);
  const requiredKeyCount = Number(keys.requiredForAttack);
  const requirement = {};

  if (Number.isFinite(sourceBossId) && sourceBossId > 0) {
    requirement.requiredFromBossId = sourceBossId;
  }
  if (Number.isFinite(requiredKeyCount) && requiredKeyCount >= 0) {
    requirement.requiredKeyCount = requiredKeyCount;
  }

  return Object.keys(requirement).length > 0 ? requirement : null;
}

function buildKeySourceCatalog(rawBossItems, fallbackBosses) {
  const bossById = new Map();

  for (const boss of fallbackBosses) {
    if (!boss || boss.id === undefined || boss.id === null) {
      continue;
    }

    bossById.set(Number(boss.id), {
      id: Number(boss.id),
      categoryId: boss.categoryId,
      sortIndex: boss.sortIndex,
      keyRequirement: boss.keyRequirement || null,
      persistedKeyRequirement: getPersistedKeyRequirement(boss),
      globalReward: {
        keys: getBossKeyRewardCount(boss),
      },
    });
  }

  for (const row of rawBossItems) {
    const boss = row && row.item ? row.item.boss : null;
    if (!boss || boss.id === undefined || boss.id === null) {
      continue;
    }

    bossById.set(Number(boss.id), {
      id: Number(boss.id),
      categoryId: row.categoryId,
      sortIndex: row.sortIndex,
      keyRequirement: row.item && row.item.keyRequirement ? row.item.keyRequirement : boss.keyRequirement || null,
      persistedKeyRequirement: null,
      globalReward: {
        keys: getBossKeyRewardCount(boss),
      },
    });
  }

  return [...bossById.values()];
}

function buildBossKeysView({
  bossId,
  baseRewardPerWin,
  bonusKeysByDamage,
  bonusKeyDamageTiers,
  rewardPerWin,
  keyMap,
  keyLabelByBoss,
  openByKeychain,
  bossTitleMap,
  keySourceCatalog,
}) {
  const normalizedBossId = Number(bossId);
  const requiredForAttack = Number(getRequiredKeysForAttack(normalizedBossId, keySourceCatalog) ?? 0);
  const keySource = resolveKeySourceBoss(normalizedBossId, keySourceCatalog);
  const sourceBossId = keySource.sourceBossId;
  const sourceBossTitle = sourceBossId === null
    ? null
    : bossTitleMap.get(Number(sourceBossId)) || null;
  const sourceLabel = getKeySourceLabelForBoss(normalizedBossId, sourceBossId, sourceBossTitle);
  const ownedTargetKeys = Math.max(0, Number(keyMap[normalizedBossId] || 0));
  const ownedSourceKeys = sourceBossId === null
    ? 0
    : Math.max(0, Number(keyMap[sourceBossId] || 0));
  // Live data is inconsistent across boss chains:
  // some bosses expose spendable keys under the target boss id,
  // while others (for example "Пресс") still expose them under the source boss id.
  // Prefer the target bucket when present, otherwise fall back to the source bucket.
  const ownedAttackKeys = sourceBossId === null ? ownedTargetKeys : ownedSourceKeys;
  const bypassedForAttack = Boolean(openByKeychain) || requiredForAttack === 0;
  const missingForAttack = bypassedForAttack
    ? 0
    : Math.max(0, requiredForAttack - ownedAttackKeys);

  return {
    owned: ownedAttackKeys,
    ownedAttackKeys,
    ownedTargetKeys,
    baseRewardPerWin: Math.max(0, Number(baseRewardPerWin || 0)),
    bonusKeysByDamage: Math.max(0, Number(bonusKeysByDamage || 0)),
    bonusKeyDamageTiers: Array.isArray(bonusKeyDamageTiers)
      ? bonusKeyDamageTiers.map((tier) => ({
          personalDamage: Math.max(0, Number(tier && tier.personalDamage) || 0),
          rewardKeys: Math.max(0, Number(tier && tier.rewardKeys) || 0),
        }))
      : [],
    rewardPerWin: Math.max(0, Number(rewardPerWin || 0)),
    label: keyLabelByBoss[normalizedBossId] || null,
    openByKeychain: Boolean(openByKeychain),
    requiredForAttack,
    sourceBossId,
    sourceResolution: keySource.resolution,
    sourceBossTitle,
    sourceLabel,
    ownedSourceKeys,
    missingForAttack,
    bypassedForAttack,
  };
}

function isBossListBlockedResponse(response) {
  const data = response && response.data ? response.data : {};
  const message = data && typeof data.message === "string" ? data.message.toLowerCase() : "";

  return data && data.success === false && message.includes("session in progress");
}

function isSuccessfulGameResponse(response) {
  if (!response || !response.ok) {
    return false;
  }

  const data = response.data;
  return !(data && typeof data === "object" && data.success === false);
}

function resolveBossUsedToday(dailyWinsMap, bossId, fallbackUsedToday = 0, options = {}) {
  const normalizedBossId = Number(bossId);
  const hasLiveDailyWins = Boolean(options.hasLiveDailyWins);
  const hasDailyWinsMap = dailyWinsMap && typeof dailyWinsMap === "object";

  if (!Number.isFinite(normalizedBossId) || normalizedBossId <= 0) {
    return Math.max(0, Number(fallbackUsedToday || 0) || 0);
  }

  if (hasDailyWinsMap && Object.prototype.hasOwnProperty.call(dailyWinsMap, normalizedBossId)) {
    return Math.max(0, Number(dailyWinsMap[normalizedBossId] || 0) || 0);
  }

  if (hasLiveDailyWins) {
    return 0;
  }

  return Math.max(0, Number(fallbackUsedToday || 0) || 0);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFallbackPlayerStats(fallbackCatalog) {
  const fallbackBosses = fallbackCatalog && Array.isArray(fallbackCatalog.bosses)
    ? fallbackCatalog.bosses
    : [];
  const fallbackAccount = fallbackCatalog && fallbackCatalog.account ? fallbackCatalog.account : {};
  const keyMap = {};
  const dailyWinsMap = {};
  const openByKeychainBossIds = [];
  const keyLabelByBoss = {};

  for (const boss of fallbackBosses) {
    if (!boss || boss.id === undefined || boss.id === null) {
      continue;
    }

    const bossId = Number(boss.id);
    const keys = boss.keys && typeof boss.keys === "object" ? boss.keys : null;
    const attacks = boss.attacks && typeof boss.attacks === "object" ? boss.attacks : null;

    if (attacks && attacks.usedToday !== undefined && attacks.usedToday !== null) {
      dailyWinsMap[bossId] = Number(attacks.usedToday) || 0;
    }

    if (!keys) {
      continue;
    }

    const ownedTargetKeys = Math.max(
      0,
      Number(
        keys.ownedTargetKeys
        ?? keys.ownedAttackKeys
        ?? keys.owned
        ?? 0,
      ) || 0,
    );
    keyMap[bossId] = Math.max(Number(keyMap[bossId] || 0), ownedTargetKeys);

    const sourceBossId = Number(keys.sourceBossId);
    const ownedSourceKeys = Math.max(0, Number(keys.ownedSourceKeys ?? 0) || 0);
    if (Number.isFinite(sourceBossId) && sourceBossId > 0) {
      keyMap[sourceBossId] = Math.max(Number(keyMap[sourceBossId] || 0), ownedSourceKeys);
    }

    if (keys.label) {
      keyLabelByBoss[bossId] = keys.label;
    }

    if (keys.openByKeychain) {
      openByKeychainBossIds.push(bossId);
    }
  }

  return {
    keys: keyMap,
    dailyWins: dailyWinsMap,
    dailyBossBattleLimit: fallbackAccount.dailyBossBattleLimit ?? null,
    lastLimitReset: fallbackAccount.lastLimitReset ?? null,
    openByKeychainBossIds,
    keyLabelByBoss,
  };
}

async function loadBossCategoryResponses(client) {
  const responses = [];

  for (const categoryId of CATEGORY_IDS) {
    if (responses.length > 0) {
      await sleep(150);
    }

    responses.push({
      categoryId,
      response: await client.bosses.list(categoryId),
    });
  }

  return responses;
}

function compareCatalogBosses(left, right) {
  if ((left.categoryId || 0) !== (right.categoryId || 0)) {
    return (left.categoryId || 0) - (right.categoryId || 0);
  }

  if ((left.sortIndex || 0) !== (right.sortIndex || 0)) {
    return (left.sortIndex || 0) - (right.sortIndex || 0);
  }

  return (left.id || 0) - (right.id || 0);
}

async function loadFallbackCatalog() {
  const fallbackPaths = [
    BOSS_CATALOG_LATEST_PATH,
    BOSS_CATALOG_SEED_PATH,
  ];

  for (const fallbackPath of fallbackPaths) {
    try {
      const body = await fs.readFile(fallbackPath, "utf8");
      const payload = JSON.parse(body);
      if (Array.isArray(payload && payload.bosses)) {
        return payload;
      }
    } catch (error) {
      void error;
    }
  }

  return null;
}

async function saveLatestCatalogSnapshot(catalog) {
  if (!catalog || !Array.isArray(catalog.bosses) || catalog.bosses.length === 0) {
    return;
  }

  try {
    await fs.mkdir(path.dirname(BOSS_CATALOG_LATEST_PATH), { recursive: true });
    await fs.writeFile(BOSS_CATALOG_LATEST_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  } catch (error) {
    void error;
  }
}

async function buildBossCatalog(client, options = {}) {
  const fast = Boolean(options.fast);
  const fallbackCatalog = await loadFallbackCatalog();
  const fallbackBosses = fallbackCatalog && Array.isArray(fallbackCatalog.bosses) ? fallbackCatalog.bosses : [];
  const fallbackBossById = new Map(
    fallbackBosses
      .filter((boss) => boss && boss.id !== undefined && boss.id !== null)
      .map((boss) => [Number(boss.id), boss]),
  );
  const fallbackAccount = fallbackCatalog && fallbackCatalog.account ? fallbackCatalog.account : null;
  const fallbackStats = buildFallbackPlayerStats(fallbackCatalog);

  const bootstrapResponse = await client.bosses.bootstrap();
  if (!fast) {
    await sleep(150);
  }
  const categoryResponses = fast ? [] : await loadBossCategoryResponses(client);
  const bootstrapSuccess = isSuccessfulGameResponse(bootstrapResponse);
  const bootstrap = bootstrapSuccess && bootstrapResponse && bootstrapResponse.data
    ? bootstrapResponse.data
    : {};
  const playerStats = bootstrap && bootstrap.playerStats ? bootstrap.playerStats : fallbackStats;
  const keyMap = playerStats && playerStats.keys ? playerStats.keys : {};
  const dailyWinsMap = playerStats && playerStats.dailyWins ? playerStats.dailyWins : {};
  const hasLiveDailyWins = bootstrapSuccess
    && bootstrap
    && bootstrap.playerStats
    && bootstrap.playerStats.dailyWins
    && typeof bootstrap.playerStats.dailyWins === "object";
  const openByKeychain = Array.isArray(playerStats && playerStats.openByKeychainBossIds)
    ? playerStats.openByKeychainBossIds.map((value) => Number(value))
    : [];
  const keyLabelByBoss = playerStats && playerStats.keyLabelByBoss ? playerStats.keyLabelByBoss : {};
  const stashDrops = bootstrapSuccess && Array.isArray(bootstrap && bootstrap.stashGearDrops)
    ? bootstrap.stashGearDrops
    : [];
  const lastKillers = bootstrapSuccess && bootstrap && bootstrap.lastKillers ? bootstrap.lastKillers : {};
  const listBlockedBySession = categoryResponses.every(({ response }) => isBossListBlockedResponse(response));
  const liveCategoryIds = new Set(
    categoryResponses
      .filter(({ response }) => {
        const data = response && response.data ? response.data : {};
        return isSuccessfulGameResponse(response) && Array.isArray(data.bosses) && data.bosses.length > 0;
      })
      .map(({ categoryId }) => categoryId),
  );
  const allCategoriesLive = CATEGORY_IDS.every((categoryId) => liveCategoryIds.has(categoryId));
  const missingCategoryIds = CATEGORY_IDS.filter((categoryId) => !liveCategoryIds.has(categoryId));

  const rawBossItems = categoryResponses.flatMap(({ categoryId, response }) => {
    const data = response && response.data ? response.data : {};
    const bosses = Array.isArray(data && data.bosses) ? data.bosses : [];

    return bosses.map((item, index) => ({
      categoryId,
      sortIndex: index,
      item,
    }));
  });

  const bossTitleMap = buildBossTitleMap(rawBossItems, fallbackBosses);
  const keySourceCatalog = buildKeySourceCatalog(rawBossItems, fallbackBosses);
  const bossIds = rawBossItems.length > 0
    ? [
        ...rawBossItems.map(({ item }) => item && item.boss && item.boss.id).filter(Boolean),
        ...fallbackBosses
          .filter((boss) => missingCategoryIds.includes(Number(boss && boss.categoryId)))
          .map((boss) => boss && boss.id)
          .filter(Boolean),
      ]
    : fallbackBosses.map((boss) => boss && boss.id).filter(Boolean);
  if (!fast && bossIds.length > 0) {
    await sleep(150);
  }
  const arrivalsResponse = !fast && bossIds.length > 0 ? await client.bosses.arrivals(bossIds) : null;
  const arrivals = isSuccessfulGameResponse(arrivalsResponse)
    && arrivalsResponse
    && arrivalsResponse.data
    && Array.isArray(arrivalsResponse.data.items)
    ? arrivalsResponse.data.items
    : Array.isArray(fallbackCatalog && fallbackCatalog.arrivals)
      ? fallbackCatalog.arrivals
      : [];
  const arrivalMap = Object.fromEntries(
    arrivals
      .filter((item) => item && item.bossId !== undefined)
      .map((item) => [Number(item.bossId), item]),
  );

  const bossesFromLive = rawBossItems.map(({ categoryId, sortIndex, item }) => {
    const boss = item && item.boss ? item.boss : {};
    const fallbackBoss = fallbackBossById.get(Number(boss.id)) || null;
    const combos = item && item.combos ? item.combos : {};
    const comboLookup = buildComboLookupFromMap(combos);
    const comboModeKeys = Object.keys(comboLookup);
    const battleModeView = resolveBossBattleModes(boss, fallbackBoss, comboLookup);
    const battleModeKeys = battleModeView.battleModeKeys;
    const openByKeychainForBoss = openByKeychain.includes(Number(boss.id));
    const usedToday = resolveBossUsedToday(
      dailyWinsMap,
      boss.id,
      fallbackBoss && fallbackBoss.attacks ? fallbackBoss.attacks.usedToday : 0,
      { hasLiveDailyWins },
    );
    const dailyLimit = playerStats && playerStats.dailyBossBattleLimit !== undefined
      ? Number(playerStats.dailyBossBattleLimit) || 0
      : fallbackBoss && fallbackBoss.attacks && fallbackBoss.attacks.dailyLimit !== undefined
        ? fallbackBoss.attacks.dailyLimit
      : null;
    const baseRewardPerWin = getBossKeyRewardCount(boss);
    const rewardPerWin = getQualifiedBossKeyRewardCount(boss.id, baseRewardPerWin);
    const bonusKeysByDamage = getBossDamageBonusKeyCount(boss.id, baseRewardPerWin);
    const bonusKeyDamageTiers = getBossDamageBonusKeyTiers(boss.id, baseRewardPerWin);
    const liveBossStashDrops = stashDrops
      .filter((drop) => Number(drop && drop.bossId) === Number(boss.id))
      .map(normalizeDrop);

      return {
        id: boss.id,
        title: boss.title || null,
        categoryId,
        categoryKey: CATEGORY_BY_ID[categoryId] || `category_${categoryId}`,
        sortIndex,
        baseHp: boss.baseHp ?? null,
      battleTimeSec: boss.battleTimeSec ?? null,
      backgroundScene: boss.backgroundScene ?? null,
      titleImage: boss.titleImage ?? null,
      battleModeKeys,
      comboModeKeys,
      combos: comboLookup,
      modes: battleModeView.modes,
      globalReward: {
        authority: boss.globalReward && boss.globalReward.authority !== undefined ? boss.globalReward.authority : null,
        keys: boss.globalReward && boss.globalReward.keys !== undefined ? boss.globalReward.keys : null,
        currencies: normalizeCurrencies(boss.globalReward && boss.globalReward.currencies),
      },
      attacks: {
        dailyLimit,
        usedToday,
        remainingToday: dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday),
      },
      keys: buildBossKeysView({
        bossId: boss.id,
        baseRewardPerWin,
        bonusKeysByDamage,
        bonusKeyDamageTiers,
        rewardPerWin,
        keyMap,
        keyLabelByBoss,
        openByKeychain: openByKeychainForBoss,
        bossTitleMap,
        keySourceCatalog,
      }),
      arrival: arrivalMap[Number(boss.id)] || null,
      stashDrops: liveBossStashDrops.length > 0
        ? liveBossStashDrops
        : Array.isArray(fallbackBoss && fallbackBoss.stashDrops)
          ? fallbackBoss.stashDrops
          : [],
      lastKiller: lastKillers[boss.id] || fallbackBoss && fallbackBoss.lastKiller || null,
      lastComboSolver: item && item.lastComboSolver ? item.lastComboSolver : fallbackBoss && fallbackBoss.lastComboSolver || null,
    };
  });
  const bossesFromFallback = fallbackBosses.map((boss, index) => {
    const openByKeychainForBoss = openByKeychain.includes(Number(boss.id));
    const usedToday = resolveBossUsedToday(
      dailyWinsMap,
      boss.id,
      boss.attacks && boss.attacks.usedToday,
      { hasLiveDailyWins },
    );
    const dailyLimit = playerStats && playerStats.dailyBossBattleLimit !== undefined
      ? Number(playerStats.dailyBossBattleLimit) || 0
      : boss.attacks && boss.attacks.dailyLimit !== undefined
        ? boss.attacks.dailyLimit
      : null;
    const baseRewardPerWin = getBossKeyRewardCount(boss);
    const rewardPerWin = getQualifiedBossKeyRewardCount(boss.id, baseRewardPerWin);
    const bonusKeysByDamage = getBossDamageBonusKeyCount(boss.id, baseRewardPerWin);
    const bonusKeyDamageTiers = getBossDamageBonusKeyTiers(boss.id, baseRewardPerWin);
    const fallbackModes = Array.isArray(boss.modes)
      ? boss.modes.map((mode) => ({
          ...mode,
          combo: normalizeCombo(mode && mode.combo),
        }))
      : [];
    const comboLookup = resolveFallbackComboLookup(boss, fallbackModes);
    const comboModeKeys = Object.keys(comboLookup);

      return {
        id: boss.id,
        title: boss.title || null,
        categoryId: boss.categoryId,
        categoryKey: boss.categoryKey || CATEGORY_BY_ID[boss.categoryId] || `category_${boss.categoryId}`,
        sortIndex: Number.isFinite(Number(boss.sortIndex)) ? Number(boss.sortIndex) : index,
        baseHp: boss.baseHp ?? null,
      battleTimeSec: boss.battleTimeSec ?? null,
      backgroundScene: boss.backgroundScene ?? null,
      titleImage: boss.titleImage ?? null,
      battleModeKeys: Array.isArray(boss.battleModeKeys) ? boss.battleModeKeys : [],
      comboModeKeys,
      combos: comboLookup,
      modes: fallbackModes,
      globalReward: boss.globalReward || {
        authority: null,
        keys: null,
        currencies: [],
      },
      attacks: {
        dailyLimit,
        usedToday,
        remainingToday: dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday),
      },
      keys: {
        ...buildBossKeysView({
          bossId: boss.id,
          baseRewardPerWin,
          bonusKeysByDamage,
          bonusKeyDamageTiers,
          rewardPerWin,
          keyMap,
          keyLabelByBoss,
          openByKeychain: openByKeychainForBoss,
          bossTitleMap,
          keySourceCatalog,
        }),
        label: keyLabelByBoss[boss.id] || (boss.keys ? boss.keys.label : null) || null,
      },
      arrival: arrivalMap[Number(boss.id)] || null,
      stashDrops: stashDrops.filter((drop) => Number(drop && drop.bossId) === Number(boss.id)).map(normalizeDrop),
      lastKiller: lastKillers[boss.id] || boss.lastKiller || null,
      lastComboSolver: boss.lastComboSolver || null,
    };
  });
  const fallbackCategoryIdSet = new Set(missingCategoryIds);
  const mixedBosses = [
    ...bossesFromLive,
    ...bossesFromFallback.filter((boss) => fallbackCategoryIdSet.has(Number(boss.categoryId))),
  ].sort(compareCatalogBosses);
  const bosses = rawBossItems.length > 0 ? mixedBosses : bossesFromFallback.sort(compareCatalogBosses);
  const arrivalsSuccess = isSuccessfulGameResponse(arrivalsResponse);
  const catalogSource = rawBossItems.length === 0
    ? fallbackBosses.length > 0 ? "fallback" : "empty"
    : bootstrapSuccess && allCategoriesLive && arrivalsSuccess
      ? "live"
      : "mixed";
  const catalogFallbackReason = fast
    ? "fast_cache"
    : rawBossItems.length === 0 && listBlockedBySession
    ? "session_in_progress"
    : !bootstrapSuccess || !allCategoriesLive || !arrivalsSuccess
      ? "rate_limited"
      : null;
  const activeSession = bootstrapSuccess
    ? normalizeSession(bootstrap && bootstrap.session)
    : fallbackAccount && fallbackAccount.activeSession
      ? fallbackAccount.activeSession
      : null;
  const friendDamage = bootstrapSuccess
    ? normalizeFriendDamage(bootstrap && bootstrap.friendDamage)
    : fallbackAccount && fallbackAccount.friendDamage
      ? fallbackAccount.friendDamage
      : null;
  const talentState = bootstrapSuccess
    ? normalizeTalentState(bootstrap && bootstrap.talentState)
    : fallbackAccount && fallbackAccount.talentState
      ? fallbackAccount.talentState
      : null;
  const weaponStatsEffective = bootstrapSuccess
    ? normalizeWeaponStats(bootstrap && bootstrap.weaponStatsEffective)
    : fallbackAccount && fallbackAccount.weaponStatsEffective
      ? fallbackAccount.weaponStatsEffective
      : null;

  const catalog = {
    generatedAt: new Date().toISOString(),
    account: {
      catalogSource,
      catalogFallbackReason,
      state: bootstrapSuccess ? bootstrap.state ?? null : fallbackAccount && fallbackAccount.state ? fallbackAccount.state : null,
      hasReward: bootstrapSuccess ? Boolean(bootstrap && bootstrap.hasReward) : Boolean(fallbackAccount && fallbackAccount.hasReward),
      claimReady: bootstrapSuccess ? Boolean(bootstrap && bootstrap.hasReward) : Boolean(fallbackAccount && fallbackAccount.claimReady),
      sessionActive: Boolean(activeSession),
      activeSession,
      friendDamage,
      talentState,
      weaponStatsEffective,
      dailyBossBattleLimit: playerStats && playerStats.dailyBossBattleLimit !== undefined
        ? Number(playerStats.dailyBossBattleLimit) || 0
        : null,
      totalUsedToday: null,
      totalOwnedKeys: sumValues(keyMap),
      lastLimitReset: playerStats && playerStats.lastLimitReset ? playerStats.lastLimitReset : null,
      keyLabelByBoss,
      openByKeychainBossIds: openByKeychain,
    },
    categories: Object.entries(CATEGORY_BY_ID).map(([id, key]) => ({
      id: Number(id),
      key,
      count: bosses.filter((boss) => boss.categoryId === Number(id)).length,
    })),
    arrivals,
    bosses,
  };

  if (!fast && bootstrapSuccess && allCategoriesLive && arrivalsSuccess) {
    await saveLatestCatalogSnapshot(catalog);
  }

  return catalog;
}

function buildBossLimitsView(catalog) {
  return {
    generatedAt: catalog.generatedAt,
    account: catalog.account,
    bosses: catalog.bosses.map((boss) => ({
      id: boss.id,
      title: boss.title,
      categoryId: boss.categoryId,
      categoryKey: boss.categoryKey,
      battleModeKeys: boss.battleModeKeys,
      comboModeKeys: boss.comboModeKeys || [],
      ownedKeys: boss.keys.owned,
      ownedAttackKeys: boss.keys.ownedAttackKeys ?? boss.keys.owned,
      ownedTargetKeys: boss.keys.ownedTargetKeys ?? null,
      requiredKeysForAttack: boss.keys.requiredForAttack,
      keySourceBossId: boss.keys.sourceBossId,
      keySourceBossTitle: boss.keys.sourceBossTitle,
      keySourceLabel: boss.keys.sourceLabel,
      ownedSourceKeys: boss.keys.ownedSourceKeys,
      missingKeysForAttack: boss.keys.missingForAttack,
      bypassedForAttack: boss.keys.bypassedForAttack,
      rewardKeysPerWin: boss.keys.rewardPerWin,
      dailyLimit: boss.attacks.dailyLimit,
      usedToday: boss.attacks.usedToday,
      remainingToday: boss.attacks.remainingToday,
      openArrival: Boolean(boss.arrival && boss.arrival.isOpen),
      arrivalWindowEndUtc: boss.arrival ? boss.arrival.windowEndUtc : null,
    })),
  };
}

module.exports = {
  CATEGORY_BY_ID,
  buildBossCatalog,
  buildBossLimitsView,
  __test: {
    buildKeySourceCatalog,
    getPersistedKeyRequirement,
    loadFallbackCatalog,
    normalizeCombo,
    resolveFallbackComboLookup,
    resolveBossBattleModes,
    resolveBossUsedToday,
  },
};
