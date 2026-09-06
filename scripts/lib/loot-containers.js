const BAUL_DEFAULT_ID = "baul_basic";
const BAUL_MAX_LEVEL = 25;
const BAUL_SOAP_COST = 20;
const PARCEL_STEW_COST = 1;

const CURRENCY_LABELS = Object.freeze({
  authority: "Авторитет",
  cigarettes: "Папиросы",
  condensed_milk: "Сгущёнка",
  ore_signet: "Руда",
  paper: "Бумага",
  rubles: "Рубли",
  signet: "Печатки",
  soap: "Мыло",
  stew: "Тушёнка",
  sugar: "Сахар",
});

const WEAPON_LABELS = Object.freeze({
  gunshot: "Самопал",
  knife: "Финка",
  poison: "Яд",
});

function unwrapPayload(value) {
  let current = value;
  for (let index = 0; index < 2; index += 1) {
    if (
      current
      && typeof current === "object"
      && current.data
      && typeof current.data === "object"
      && (
        Object.prototype.hasOwnProperty.call(current, "ok")
        || Object.keys(current).length === 1
      )
    ) {
      current = current.data;
      continue;
    }
    break;
  }
  return current && typeof current === "object" ? current : {};
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function pickFirst(source, keys, fallback = null) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return fallback;
}

function normalizeRewardType(value, fallbackId = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (["currency", "stash", "weapon", "key", "tattoo", "clothing"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "hide" || normalized === "hides" || normalized === "stashes") {
    return "stash";
  }
  if (normalized === "quest_clothing" || normalized === "cloth" || normalized === "wearable") {
    return "clothing";
  }

  const id = String(fallbackId || "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(WEAPON_LABELS, id)) {
    return "weapon";
  }
  if (["stash", "hide", "hides", "stashes"].includes(id)) {
    return "stash";
  }
  if (["tattoo", "tattoos"].includes(id)) {
    return "tattoo";
  }
  if (["clothing", "quest_clothing", "wearable"].includes(id)) {
    return "clothing";
  }
  return "currency";
}

function rewardLabel(type, id, source = {}) {
  const normalizedId = String(id || "").trim().toLowerCase();
  if (type === "currency") {
    return CURRENCY_LABELS[normalizedId] || String(id || "Валюта");
  }
  if (type === "weapon") {
    return WEAPON_LABELS[normalizedId] || String(id || "Оружие");
  }
  if (type === "stash") {
    return String(source.name || source.title || "Нычка");
  }
  if (type === "key") {
    const bossTitle = source.bossTitle || source.bossName || null;
    return bossTitle ? `Ключ: ${bossTitle}` : `Ключ босса #${id || "?"}`;
  }
  if (type === "tattoo") {
    return String(source.tattooName || source.name || source.title || "Наколка");
  }
  if (type === "clothing") {
    return String(source.name || source.title || "Шмотка");
  }
  return String(source.name || source.title || id || type || "Награда");
}

function normalizeReward(value, options = {}) {
  const source = value && typeof value === "object"
    ? value
    : { amount: value };
  const fallbackId = options.fallbackId === undefined ? "" : options.fallbackId;
  const type = normalizeRewardType(
    pickFirst(source, ["type", "kind", "category"], options.fallbackType),
    fallbackId,
  );
  const idValue = pickFirst(
    source,
    ["id", "key", "currency", "weaponType", "bossId", "clothingId", "tattooId"],
    fallbackId || type,
  );
  const id = String(idValue === undefined || idValue === null ? type : idValue);
  const amount = Math.max(
    0,
    toNumber(pickFirst(source, ["amount", "count", "qty", "quantity", "value"], 1), 1),
  );

  return {
    type,
    id,
    amount,
    label: rewardLabel(type, id, source),
    bossTitle: source.bossTitle || source.bossName || null,
    image: source.image || source.imageUrl || source.previewUrl || source.cardPreviewUrl || null,
    name: source.name || source.title || source.tattooName || null,
    tattooName: source.tattooName || null,
    tattooStat: source.tattooStat || null,
    tattooTotalBonus: toOptionalNumber(source.tattooTotalBonus),
    setName: source.setName || null,
    setDescription: source.setDescription || null,
    description: source.description || null,
  };
}

function flattenRewards(value, options = {}) {
  if (value === undefined || value === null || value === false) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenRewards(item, options));
  }
  if (typeof value !== "object") {
    return [normalizeReward(value, options)];
  }

  const rewardKeys = [
    "type",
    "kind",
    "category",
    "id",
    "key",
    "currency",
    "weaponType",
    "bossId",
    "amount",
    "count",
    "qty",
    "quantity",
    "clothingId",
    "tattooId",
  ];
  if (rewardKeys.some((key) => Object.prototype.hasOwnProperty.call(value, key))) {
    return [normalizeReward(value, options)];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    if (child === undefined || child === null || child === false) {
      return [];
    }
    const fallbackType = options.fallbackType || normalizeRewardType("", key);
    if (Array.isArray(child)) {
      return flattenRewards(child, { fallbackId: key, fallbackType });
    }
    if (typeof child === "object") {
      return flattenRewards(
        { ...child, id: child.id ?? child.key ?? key, type: child.type ?? fallbackType },
        { fallbackId: key, fallbackType },
      );
    }
    return [normalizeReward(child, { fallbackId: key, fallbackType })];
  });
}

function groupRewards(items) {
  const normalized = Array.isArray(items) ? items.filter(Boolean) : [];
  const grouped = {
    currency: [],
    stashes: [],
    weapons: [],
    keys: [],
    tattoos: [],
    clothing: [],
  };
  const groupByType = {
    currency: "currency",
    stash: "stashes",
    weapon: "weapons",
    key: "keys",
    tattoo: "tattoos",
    clothing: "clothing",
  };

  for (const item of normalized) {
    const group = groupByType[item.type];
    if (group) {
      grouped[group].push(item);
    }
  }

  return {
    items: normalized,
    ...grouped,
    hasTattoo: grouped.tattoos.length > 0,
    hasClothing: grouped.clothing.length > 0,
  };
}

function buildWearableCatalogIndexes(catalog) {
  const byId = new Map();
  const byName = new Map();
  const items = catalog && Array.isArray(catalog.items)
    ? catalog.items
    : Array.isArray(catalog)
      ? catalog
      : [];

  for (const item of items) {
    if (!item || !["clothing", "tattoo"].includes(item.type)) {
      continue;
    }
    const numericId = Number(item.id);
    if (numericId > 0) {
      byId.set(`${item.type}:${numericId}`, item);
    }
    for (const value of [item.name, item.setName]) {
      const normalized = String(value || "").trim().toLowerCase().replace(/ё/g, "е");
      if (normalized && !byName.has(`${item.type}:${normalized}`)) {
        byName.set(`${item.type}:${normalized}`, item);
      }
    }
  }

  return { byId, byName };
}

function findWearableCatalogItem(item, indexes) {
  if (!item || !["clothing", "tattoo"].includes(item.type)) {
    return null;
  }
  const numericId = Number(item.id);
  if (numericId > 0) {
    const exact = indexes.byId.get(`${item.type}:${numericId}`);
    if (exact) {
      return exact;
    }
  }
  for (const value of [item.name, item.tattooName, item.setName, item.label]) {
    const normalized = String(value || "").trim().toLowerCase().replace(/ё/g, "е");
    const match = indexes.byName.get(`${item.type}:${normalized}`);
    if (match) {
      return match;
    }
  }
  return null;
}

function enrichLootRewardsWithCatalog(rewards, catalog) {
  const source = rewards && typeof rewards === "object" ? rewards : {};
  const sourceItems = Array.isArray(source.items)
    ? source.items
    : [
        ...(Array.isArray(source.currency) ? source.currency : []),
        ...(Array.isArray(source.stashes) ? source.stashes : []),
        ...(Array.isArray(source.weapons) ? source.weapons : []),
        ...(Array.isArray(source.keys) ? source.keys : []),
        ...(Array.isArray(source.tattoos) ? source.tattoos : []),
        ...(Array.isArray(source.clothing) ? source.clothing : []),
      ];
  const indexes = buildWearableCatalogIndexes(catalog);
  return groupRewards(sourceItems.map((item) => {
    const catalogItem = findWearableCatalogItem(item, indexes);
    if (!catalogItem) {
      return item;
    }
    return {
      ...item,
      label: catalogItem.name || item.label,
      name: catalogItem.name || item.name,
      image: item.image || catalogItem.imageUrl || catalogItem.cardPreviewUrl || null,
      setName: catalogItem.setName || item.setName,
      setDescription: catalogItem.setDescription || item.setDescription,
      description: catalogItem.description || item.description,
    };
  }));
}

function enrichTattooSetsWithCatalog(tattooSets, catalog) {
  const indexes = buildWearableCatalogIndexes(catalog);
  return (Array.isArray(tattooSets) ? tattooSets : []).map((set) => {
    if (!set || typeof set !== "object") {
      return set;
    }
    const catalogItem = findWearableCatalogItem({
      type: "tattoo",
      id: set.tattooId ?? set.id,
      name: set.tattooName || set.name,
      setName: set.setName || set.name,
    }, indexes);
    if (!catalogItem) {
      return set;
    }
    return {
      ...set,
      tattooId: set.tattooId ?? catalogItem.id,
      name: set.name || catalogItem.name,
      setName: set.setName || catalogItem.setName,
      image: set.image || set.imageUrl || catalogItem.imageUrl || catalogItem.cardPreviewUrl || null,
    };
  });
}

function enrichLootContainerEntryWithCatalog(entry, catalog) {
  if (!entry || typeof entry !== "object") {
    return entry;
  }
  return {
    ...entry,
    rewards: enrichLootRewardsWithCatalog(entry.rewards, catalog),
    tattooSets: enrichTattooSetsWithCatalog(entry.tattooSets, catalog),
  };
}

function normalizeParcelStatus(value) {
  const payload = unwrapPayload(value);
  const progress = payload.progress && typeof payload.progress === "object"
    ? payload.progress
    : {};
  const stewBalance = Math.max(0, toNumber(
    pickFirst(payload, ["stewBalance", "StewBalance", "stewLeft", "StewLeft"], 0),
  ));

  return {
    ok: payload.success !== false && payload.Success !== false,
    stewBalance,
    cost: {
      currency: "stew",
      label: CURRENCY_LABELS.stew,
      amount: PARCEL_STEW_COST,
    },
    canOpen: stewBalance >= PARCEL_STEW_COST,
    progress: {
      current: Math.max(0, toNumber(progress.current, 0)),
      step: Math.max(1, toNumber(progress.step, 50)),
      remaining: Math.max(0, toNumber(progress.remaining, 0)),
      text: progress.text || null,
    },
    points: Math.max(0, toNumber(payload.points, 0)),
    issuedBy50: Math.max(0, toNumber(payload.issuedBy50, 0)),
    error: payload.error || payload.message || null,
  };
}

function normalizeBaulStatus(value, options = {}) {
  const payload = unwrapPayload(value);
  const stats = payload.stats && typeof payload.stats === "object"
    ? payload.stats
    : payload;
  const level = Math.max(0, toNumber(stats.level, 0));
  const maxLevel = Math.max(1, toNumber(stats.maxLevel, BAUL_MAX_LEVEL));
  const rewards = groupRewards(flattenRewards(stats.pendingRewards || []));
  const soapBalance = options.soapBalance === undefined
    ? null
    : Math.max(0, toNumber(options.soapBalance, 0));
  const active = Boolean(stats.active);
  const isMaxLevel = Boolean(stats.isMaxLevel) || level >= maxLevel;

  return {
    ok: payload.success !== false,
    active,
    baulId: String(stats.baulId || BAUL_DEFAULT_ID),
    level,
    maxLevel,
    isMaxLevel,
    belowMaxLevel: active && !isMaxLevel,
    currentExp: Math.max(0, toNumber(stats.currentExp, 0)),
    expToNext: Math.max(0, toNumber(stats.expToNext, 0)),
    soapBalance,
    cost: {
      currency: "soap",
      label: CURRENCY_LABELS.soap,
      amount: BAUL_SOAP_COST,
    },
    canAfford: soapBalance === null ? null : soapBalance >= BAUL_SOAP_COST,
    canOpen: active
      && rewards.items.length > 0
      && (soapBalance === null || soapBalance >= BAUL_SOAP_COST),
    recommendedToOpen: active && isMaxLevel && rewards.items.length > 0,
    pending: rewards,
    error: payload.error || payload.message || null,
  };
}

function findCurrencyBalance(value, currency) {
  const payload = unwrapPayload(value);
  const containers = [
    payload.currencies,
    payload.balances,
    payload.newBalances,
    payload.NewBalances,
  ];

  for (const source of containers) {
    if (Array.isArray(source)) {
      const item = source.find((entry) => (
        entry
        && String(entry.type || entry.key || entry.id || "").toLowerCase() === currency
      ));
      if (item) {
        return Math.max(0, toNumber(pickFirst(item, ["amount", "value", "count"], 0), 0));
      }
    } else if (source && typeof source === "object" && source[currency] !== undefined) {
      return Math.max(0, toNumber(source[currency], 0));
    }
  }

  return null;
}

function buildLootContainersDashboard({ parcelStatus, baulStatus, playerInit } = {}) {
  const soapBalance = findCurrencyBalance(playerInit, "soap");
  return {
    generatedAt: new Date().toISOString(),
    parcel: normalizeParcelStatus(parcelStatus),
    baul: normalizeBaulStatus(baulStatus, { soapBalance }),
  };
}

function normalizeClothingReward(payload) {
  const clothing = pickFirst(payload, ["Clothing", "clothing"], null);
  const clothingId = pickFirst(payload, ["ClothingId", "clothingId"], null);
  if (!clothing && clothingId === null) {
    return [];
  }
  const source = clothing && typeof clothing === "object"
    ? { ...clothing, id: clothing.id ?? clothingId, type: "clothing" }
    : { id: clothingId, type: "clothing" };
  return [normalizeReward(source)];
}

function normalizeParcelOpenResult(value) {
  const payload = unwrapPayload(value);
  const rewards = [
    ...flattenRewards(pickFirst(payload, ["Rewards", "rewards"], {})),
    ...flattenRewards(pickFirst(payload, ["Hides", "hides"], []), { fallbackType: "stash" }),
    ...normalizeClothingReward(payload),
  ];

  return {
    kind: "parcel",
    success: (payload.Success ?? payload.success) === true,
    openedAt: new Date().toISOString(),
    spent: {
      currency: "stew",
      label: CURRENCY_LABELS.stew,
      amount: PARCEL_STEW_COST,
    },
    remaining: {
      stew: Math.max(0, toNumber(pickFirst(payload, ["StewLeft", "stewLeft"], 0), 0)),
    },
    rewards: groupRewards(rewards),
    balances: pickFirst(payload, ["NewBalances", "newBalances"], null),
    error: payload.error || payload.message || null,
  };
}

function normalizeBaulOpenResult(value) {
  const payload = unwrapPayload(value);
  return {
    kind: "baul",
    success: payload.success === true,
    openedAt: new Date().toISOString(),
    spent: {
      currency: "soap",
      label: CURRENCY_LABELS.soap,
      amount: BAUL_SOAP_COST,
    },
    rewards: groupRewards(flattenRewards(payload.rewards || [])),
    tattooSets: Array.isArray(payload.tattooSets) ? payload.tattooSets : [],
    stats: payload.stats && typeof payload.stats === "object" ? payload.stats : null,
    error: payload.error || payload.message || null,
  };
}

module.exports = {
  BAUL_DEFAULT_ID,
  BAUL_MAX_LEVEL,
  BAUL_SOAP_COST,
  CURRENCY_LABELS,
  PARCEL_STEW_COST,
  WEAPON_LABELS,
  buildLootContainersDashboard,
  enrichLootContainerEntryWithCatalog,
  enrichLootRewardsWithCatalog,
  enrichTattooSetsWithCatalog,
  findCurrencyBalance,
  flattenRewards,
  groupRewards,
  normalizeBaulOpenResult,
  normalizeBaulStatus,
  normalizeParcelOpenResult,
  normalizeParcelStatus,
  normalizeReward,
};
