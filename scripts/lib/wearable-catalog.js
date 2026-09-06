const fs = require("node:fs/promises");
const path = require("node:path");

const { ARTIFACTS_DIR } = require("./pbot");

const WEARABLE_CATALOG_CACHE_PATH = path.join(ARTIFACTS_DIR, "wearable-catalog-latest.json");
const WEARABLE_CATALOG_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const CLOTHING_ZONE_COUNT = 8;
const TATTOO_ZONE_COUNT = 42;
const WEARABLE_ZONE_COUNT = Math.max(CLOTHING_ZONE_COUNT, TATTOO_ZONE_COUNT);
let wearableCatalogRefreshPromise = null;

const PRISON_ALIASES = new Map([
  [1, ["бутырка"]],
  [2, ["красная пресня", "к. пресня", "к пресня"]],
  [3, ["софийка"]],
  [4, ["кресты"]],
  [5, ["в. централ", "в централ"]],
  [6, ["угольки"]],
  [7, ["матросская тишина", "м. тишина", "м тишина"]],
  [8, ["вологодский пятак", "в. пятак", "в пятак"]],
  [9, ["лефортовка"]],
  [10, ["белый лебедь", "б. лебедь", "б лебедь"]],
  [11, ["орловский централ", "о. централ", "о централ"]],
  [12, ["елецкая крытка", "е. крытка", "е крытка"]],
  [13, ["черный дельфин", "чёрный дельфин", "ч. дельфин", "ч дельфин"]],
  [14, ["гродненская крытка", "г. крытка", "г крытка"]],
  [15, ["а. централ", "а централ"]],
]);

const MASTER_ALIASES = new Map([
  [1, ["петя"]],
  [2, ["яша"]],
  [3, ["илюша"]],
  [4, ["нинка"]],
  [5, ["ашот"]],
  [6, ["шура"]],
  [7, ["макар"]],
  [8, ["сева"]],
  [9, ["жора"]],
  [10, ["янка"]],
  [11, ["ванька"]],
  [12, ["пантелей"]],
  [13, ["кеша"]],
  [14, ["саня"]],
  [15, ["захар", "захар дизель"]],
  [16, ["паша"]],
]);

const WEARABLE_SOURCE_CATEGORIES = Object.freeze([
  Object.freeze({
    id: "prison_master",
    title: "Тюрьмы / Мастерские",
    description: "Награды за дневные и ночные ходки, а также занятия у мастеров.",
  }),
  Object.freeze({
    id: "bosses",
    title: "Боссы",
    description: "Обычные, режимные и комбо-награды за боссов.",
  }),
  Object.freeze({
    id: "stashes",
    title: "Баулы",
    description: "Вещи и наколки, которые сервер помечает как награды из баулов.",
  }),
  Object.freeze({
    id: "parcels",
    title: "Посылки",
    description: "Непокупаемые вещи с пометкой «Только за достижения!», включая отдельные награды за посылки.",
  }),
  Object.freeze({
    id: "wholesale",
    title: "Оптовая закупка",
    description: "Предметы, которые можно получить при оптовой закупке.",
  }),
  Object.freeze({
    id: "events",
    title: "События",
    description: "Временные события, шкафчики и специальные активности.",
  }),
  Object.freeze({
    id: "gambling",
    title: "Азартные активности",
    description: "Покер, Катала, Фартовый и Колесо фортуны.",
  }),
  Object.freeze({
    id: "zaruba",
    title: "Зарубы",
    description: "Награды, которые падают в зарубах.",
  }),
  Object.freeze({
    id: "brigades",
    title: "Бригады / Лагеря",
    description: "Награды за лагерные бои и бригадные активности.",
  }),
  Object.freeze({
    id: "blind_tattooist",
    title: "Слепой кольщик",
    description: "Наколки из отдельного пула слепого кольщика.",
  }),
  Object.freeze({
    id: "other",
    title: "Прочее",
    description: "Покупаемые комплекты, наколки с Ворона, месячные делюги и другие редкие источники.",
  }),
]);

const WEARABLE_CATEGORY_BY_ID = new Map(
  WEARABLE_SOURCE_CATEGORIES.map((category) => [category.id, category]),
);

const DAMAGE_BONUS_KEYS = new Set(["poison", "gunshot", "knife"]);
const KEYCHAIN_IMAGE_URL = "https://oldprison-prod-assets-cdn-yandex.luckygem.online/assets/poker/keySva.png";
const PARCEL_ACHIEVEMENT_CLOTHING_SOURCES = new Map([
  [212, "Награда за достижения «Пацанские посылки»"],
  [213, "Награда за достижения «Блатные посылки»"],
  [214, "Награда за достижения «Авторитетные посылки»"],
  [215, "Награда за общее количество любых посылок"],
]);
const BUYABLE_ACHIEVEMENT_CLOTHING_IDS = new Set([
  ...Array.from({ length: 23 }, (_, index) => 141 + index),
  206,
]);

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"'().,:№—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function combineSourceText(item) {
  const parts = [
    String(item?.description || "").trim(),
    String(item?.sourceDescription || "").trim(),
  ].filter(Boolean);
  const seen = new Set();
  return parts
    .filter((part) => {
      const normalized = normalizeSearchText(part);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(" · ");
}

function normalizeBonusMap(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const aliases = {
    maxenergy: "maxEnergy",
    punchchest: "punchChest",
    kickballs: "kickBalls",
    pokeeyes: "pokeEyes",
    kneeear: "kneeEar",
  };
  const normalized = {};
  for (const [sourceKey, sourceAmount] of Object.entries(value)) {
    const amount = Number(sourceAmount) || 0;
    if (amount === 0) {
      continue;
    }
    const rawKey = String(sourceKey);
    const key = aliases[rawKey.toLowerCase()] || rawKey;
    normalized[key] = (Number(normalized[key]) || 0) + amount;
  }
  return normalized;
}

function addBonusMaps(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (Number(target[key]) || 0) + (Number(value) || 0);
  }
  return target;
}

function hasBonuses(value) {
  return Object.values(value || {}).some((amount) => Number(amount) !== 0);
}

function getDamageBonusTotal(value) {
  return Object.entries(value || {}).reduce(
    (total, [key, amount]) => total + (DAMAGE_BONUS_KEYS.has(key) ? Number(amount) || 0 : 0),
    0,
  );
}

function normalizeWearableItem(item, type) {
  return {
    type,
    id: Number(item && item.id) || 0,
    zone: Number(item && item.zone) || 0,
    name: item && item.name ? String(item.name) : "Предмет",
    setName: item && item.setName ? String(item.setName) : "Без комплекта",
    setDescription: item && item.setDescription ? String(item.setDescription) : "",
    description: item && item.description ? String(item.description) : "",
    sourceDescription: item && item.sourceDescription ? String(item.sourceDescription) : "",
    imageUrl: item && (item.cardPreviewUrl || item.imageUrl)
      ? String(item.cardPreviewUrl || item.imageUrl)
      : null,
    price: Number.isFinite(Number(item && item.price)) ? Number(item.price) : null,
    currency: item && item.currency ? String(item.currency) : null,
    canBeBought: typeof item?.canBeBought === "boolean" ? item.canBeBought : null,
    combatStatsBonus: normalizeBonusMap(item && item.combat_stats_bonus),
  };
}

function inferWearableSource(item) {
  const raw = combineSourceText(item);
  const text = normalizeSearchText(raw);

  if (text.includes("тюрьм")) {
    for (const [sourceId, aliases] of PRISON_ALIASES.entries()) {
      if (aliases.some((alias) => text.includes(alias))) {
        return {
          sourceType: "prison",
          sourceId,
          sourceMode: text.includes("ночн") ? "night" : text.includes("дневн") ? "day" : null,
          sourceLabel: raw,
        };
      }
    }
  }

  if (text.includes("мастер")) {
    for (const [sourceId, aliases] of MASTER_ALIASES.entries()) {
      if (aliases.some((alias) => text.includes(alias))) {
        const levelMatch = text.match(/уровень\s+(\d+)/);
        return {
          sourceType: "master",
          sourceId,
          sourceMode: null,
          sourceLevel: levelMatch ? Number(levelMatch[1]) : null,
          sourceLabel: raw,
        };
      }
    }
  }

  return null;
}

function inferWearableCollectionSource(item) {
  const raw = combineSourceText(item);
  const text = normalizeSearchText(raw);
  const isRavenTattoo = item?.type === "tattoo" && text.includes("ворон");
  const isAchievementItem = text.includes("достижен");
  const hasLiveBuyability = typeof item?.canBeBought === "boolean";
  const isBuyableAchievement = isAchievementItem
    && item?.type === "clothing"
    && (
      item.canBeBought === true
      || (!hasLiveBuyability && BUYABLE_ACHIEVEMENT_CLOTHING_IDS.has(Number(item.id)))
    );
  const parcelAchievementSource = item?.type === "clothing"
    ? PARCEL_ACHIEVEMENT_CLOTHING_SOURCES.get(Number(item.id))
    : null;

  if (isRavenTattoo) {
    return {
      categoryId: "other",
      sourceLabel: raw || "Наколка с Ворона",
    };
  }

  if (isBuyableAchievement) {
    return {
      categoryId: "other",
      sourceLabel: "Можно купить в магазине",
    };
  }

  if (parcelAchievementSource) {
    return {
      categoryId: "parcels",
      sourceLabel: parcelAchievementSource,
    };
  }

  let categoryId = "other";

  if (text.includes("оптов")) {
    categoryId = "wholesale";
  } else if (isAchievementItem) {
    categoryId = "parcels";
  } else if (text.includes("тюрьм") || text.includes("мастер")) {
    categoryId = "prison_master";
  } else if (text.includes("заруб")) {
    categoryId = "zaruba";
  } else if (text.includes("баул")) {
    categoryId = "stashes";
  } else if (text.includes("слеп") && text.includes("кольщик")) {
    categoryId = "blind_tattooist";
  } else if (text.includes("лагер") || text.includes("бригад")) {
    categoryId = "brigades";
  } else if (
    text.includes("покер")
    || text.includes("фартов")
    || text.includes("карт")
    || text.includes("колес")
    || text.includes("ворон")
  ) {
    categoryId = "gambling";
  } else if (
    text.includes("событ")
    || text.includes("взлом")
    || text.includes("пора варить")
    || text.includes("шкафчик")
  ) {
    categoryId = "events";
  } else if (text.includes("посыл") || text.includes("почт") || text.includes("подар")) {
    categoryId = "parcels";
  } else if (text.includes("убийств") || text.includes("босс") || text.includes("комбо")) {
    categoryId = "bosses";
  }

  return {
    categoryId,
    sourceLabel: raw || "Источник в каталоге не указан",
  };
}

function normalizeBossIds(values) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  )].sort((left, right) => left - right);
}

function findUnobservedBossIds(catalog, bossIds) {
  const observedIds = new Set(normalizeBossIds(catalog && catalog.bossIds));
  return normalizeBossIds(bossIds).filter((bossId) => !observedIds.has(bossId));
}

function normalizeWearableCatalog(items, options = {}) {
  const unique = new Map();

  for (const item of items || []) {
    if (!item || !item.id || !item.type) {
      continue;
    }
    const source = inferWearableSource(item);
    unique.set(`${item.type}:${item.id}`, source ? { ...item, ...source } : { ...item });
  }

  const catalog = {
    generatedAt: new Date().toISOString(),
    zoneCount: WEARABLE_ZONE_COUNT,
    items: [...unique.values()],
  };
  if (options.bossIds !== undefined) {
    catalog.bossIds = normalizeBossIds(options.bossIds);
  }
  return catalog;
}

async function readWearableCatalogCache(options = {}) {
  try {
    const body = await fs.readFile(WEARABLE_CATALOG_CACHE_PATH, "utf8");
    const parsed = JSON.parse(body);
    if (!parsed || !Array.isArray(parsed.items)) {
      return null;
    }
    const ageMs = Date.now() - (Date.parse(parsed.generatedAt) || 0);
    if (!options.allowStale && ageMs > WEARABLE_CATALOG_CACHE_MAX_AGE_MS) {
      return null;
    }
    return parsed;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function fetchWearableCatalog(client, options = {}) {
  const items = [];

  for (let zone = 1; zone <= WEARABLE_ZONE_COUNT; zone += 1) {
    const [clothingResponse, tattooResponse] = await Promise.all([
      zone <= CLOTHING_ZONE_COUNT
        ? client.get("/api/clothing/by-zone", { query: { zone } })
        : null,
      zone <= TATTOO_ZONE_COUNT
        ? client.get("/api/tattoo/by-zone", { query: { zone } })
        : null,
    ]);
    const clothing = clothingResponse && clothingResponse.data && clothingResponse.data.clothing;
    const tattoos = tattooResponse && tattooResponse.data && tattooResponse.data.tattoos;
    if (
      zone <= CLOTHING_ZONE_COUNT
      && (
        !clothingResponse
        || clothingResponse.ok === false
        || clothingResponse.data && clothingResponse.data.success === false
        || !Array.isArray(clothing)
      )
    ) {
      throw new Error(`Clothing catalog zone ${zone} could not be loaded.`);
    }
    if (
      zone <= TATTOO_ZONE_COUNT
      && (
        !tattooResponse
        || tattooResponse.ok === false
        || tattooResponse.data && tattooResponse.data.success === false
        || !Array.isArray(tattoos)
      )
    ) {
      throw new Error(`Tattoo catalog zone ${zone} could not be loaded.`);
    }
    items.push(
      ...(Array.isArray(clothing)
        ? clothing.map((item) => normalizeWearableItem(item, "clothing"))
        : []),
      ...(Array.isArray(tattoos)
        ? tattoos.map((item) => normalizeWearableItem(item, "tattoo"))
        : []),
    );
  }

  const catalog = normalizeWearableCatalog(items, {
    bossIds: options.bossIds,
  });
  if (options.writeCache !== false) {
    await fs.mkdir(path.dirname(WEARABLE_CATALOG_CACHE_PATH), { recursive: true });
    await fs.writeFile(WEARABLE_CATALOG_CACHE_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  }
  return catalog;
}

async function loadWearableCatalog(client, options = {}) {
  const cached = await readWearableCatalogCache({ allowStale: Boolean(options.allowStale) });
  const currentBossIds = options.bossIds === undefined
    ? null
    : normalizeBossIds(options.bossIds);
  const unobservedBossIds = currentBossIds === null
    ? []
    : findUnobservedBossIds(cached, currentBossIds);
  if (cached && !options.forceRefresh && unobservedBossIds.length === 0) {
    return cached;
  }

  if (wearableCatalogRefreshPromise) {
    let refreshed;
    try {
      refreshed = await wearableCatalogRefreshPromise;
    } catch (error) {
      if (cached && options.allowStale && !options.forceRefresh) {
        return cached;
      }
      throw error;
    }
    if (
      currentBossIds === null
      || findUnobservedBossIds(refreshed, currentBossIds).length === 0
    ) {
      return refreshed;
    }
  }

  const bossIds = currentBossIds === null
    ? cached && Array.isArray(cached.bossIds) ? cached.bossIds : undefined
    : currentBossIds;
  wearableCatalogRefreshPromise = fetchWearableCatalog(client, { bossIds })
    .finally(() => {
      wearableCatalogRefreshPromise = null;
    });
  try {
    return await wearableCatalogRefreshPromise;
  } catch (error) {
    if (cached && options.allowStale && !options.forceRefresh) {
      return cached;
    }
    throw error;
  }
}

function createOwnedWearableSets(inventory) {
  return {
    clothing: new Set(
      Array.isArray(inventory && inventory.ownedClothing)
        ? inventory.ownedClothing.map((value) => Number(value))
        : [],
    ),
    tattoo: new Set(
      Array.isArray(inventory && inventory.ownedTattoos)
        ? inventory.ownedTattoos.map((value) => Number(value))
        : [],
    ),
  };
}

function buildSourceWearableView(items, sourceType, sourceId, owned) {
  const sourceItems = (items || []).filter(
    (item) => item.sourceType === sourceType && Number(item.sourceId) === Number(sourceId),
  );
  const groups = new Map();

  for (const item of sourceItems) {
    const key = `${item.type}:${item.setName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        type: item.type,
        name: item.setName,
        description: item.setDescription || "",
        items: [],
      });
    }
    const isOwned = owned[item.type] ? owned[item.type].has(Number(item.id)) : false;
    groups.get(key).items.push({ ...item, owned: isOwned });
  }

  const sets = [...groups.values()].map((group) => {
    const collected = group.items.filter((item) => item.owned);
    const potentialBonuses = {};
    const collectedBonuses = {};
    for (const item of group.items) {
      addBonusMaps(potentialBonuses, item.combatStatsBonus);
      if (item.owned) {
        addBonusMaps(collectedBonuses, item.combatStatsBonus);
      }
    }
    return {
      ...group,
      collected: collected.length,
      total: group.items.length,
      complete: collected.length === group.items.length && group.items.length > 0,
      missing: group.items.filter((item) => !item.owned),
      collectedBonuses,
      potentialBonuses,
      dayItems: group.items.filter((item) => item.sourceMode === "day").length,
      nightItems: group.items.filter((item) => item.sourceMode === "night").length,
    };
  }).sort((left, right) => left.name.localeCompare(right.name, "ru"));

  const totals = {
    collected: sets.reduce((sum, item) => sum + item.collected, 0),
    total: sets.reduce((sum, item) => sum + item.total, 0),
    completedSets: sets.filter((item) => item.complete).length,
    totalSets: sets.length,
    collectedBonuses: {},
    potentialBonuses: {},
  };
  for (const set of sets) {
    addBonusMaps(totals.collectedBonuses, set.collectedBonuses);
    addBonusMaps(totals.potentialBonuses, set.potentialBonuses);
  }

  return { sets, totals };
}

function buildWearableDashboard(catalog, inventory, options = {}) {
  const owned = createOwnedWearableSets(inventory || {});
  const prisonIds = Array.isArray(options.prisons)
    ? options.prisons.map((item) => Number(item.id)).filter(Boolean)
    : [...PRISON_ALIASES.keys()];
  const masterIds = Array.isArray(options.masters)
    ? options.masters.map((item) => Number(item.id)).filter(Boolean)
    : [...MASTER_ALIASES.keys()];
  const prisons = Object.fromEntries(
    prisonIds.map((sourceId) => [sourceId, buildSourceWearableView(catalog.items, "prison", sourceId, owned)]),
  );
  const masters = Object.fromEntries(
    masterIds.map((sourceId) => [sourceId, buildSourceWearableView(catalog.items, "master", sourceId, owned)]),
  );
  const allViews = [...Object.values(prisons), ...Object.values(masters)];
  const totals = {
    collected: allViews.reduce((sum, item) => sum + item.totals.collected, 0),
    total: allViews.reduce((sum, item) => sum + item.totals.total, 0),
    completedSets: allViews.reduce((sum, item) => sum + item.totals.completedSets, 0),
    totalSets: allViews.reduce((sum, item) => sum + item.totals.totalSets, 0),
    collectedBonuses: {},
    potentialBonuses: {},
  };
  for (const view of allViews) {
    addBonusMaps(totals.collectedBonuses, view.totals.collectedBonuses);
    addBonusMaps(totals.potentialBonuses, view.totals.potentialBonuses);
  }

  return {
    generatedAt: catalog.generatedAt,
    totals,
    prisons,
    masters,
  };
}

function pickMostFrequent(values, fallback = "") {
  const counts = new Map();
  for (const value of values || []) {
    const normalized = String(value || "").trim();
    if (!normalized) {
      continue;
    }
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)[0]?.[0] || fallback;
}

function buildCollectionGroup(group) {
  const collectedBonuses = {};
  const potentialBonuses = {};
  const sortedItems = [...group.items].sort(
    (left, right) => Number(left.zone) - Number(right.zone) || String(left.name).localeCompare(String(right.name), "ru"),
  );

  for (const item of sortedItems) {
    addBonusMaps(potentialBonuses, item.combatStatsBonus);
    if (item.owned) {
      addBonusMaps(collectedBonuses, item.combatStatsBonus);
    }
  }

  const collected = sortedItems.filter((item) => item.owned).length;
  const sourceLabel = pickMostFrequent(
    sortedItems.map((item) => item.collectionSourceLabel),
    "Источник в каталоге не указан",
  );
  const special = sortedItems.some((item) => (
    item.type === "clothing"
    && (Number(item.id) === 222 || normalizeSearchText(item.name) === "ворон")
  )) ? "raven" : null;
  const sourceLabels = [...new Set(
    sortedItems.map((item) => String(item.collectionSourceLabel || "").trim()).filter(Boolean),
  )].sort((left, right) => left.localeCompare(right, "ru"));

  return {
    key: group.key,
    categoryId: group.categoryId,
    type: group.type,
    name: group.name,
    description: pickMostFrequent(sortedItems.map((item) => item.setDescription), ""),
    sourceLabel,
    sourceLabels,
    imageUrl: sortedItems.find((item) => item.imageUrl)?.imageUrl || null,
    collected,
    total: sortedItems.length,
    complete: collected === sortedItems.length && sortedItems.length > 0,
    collectedBonuses,
    potentialBonuses,
    visualOnly: !hasBonuses(potentialBonuses),
    damageBonusTotal: getDamageBonusTotal(potentialBonuses),
    special,
    items: sortedItems.map((item) => ({
      type: item.type,
      id: item.id,
      zone: item.zone,
      name: item.name,
      description: item.description || "",
      imageUrl: item.imageUrl,
      combatStatsBonus: item.combatStatsBonus,
      owned: item.owned,
    })),
  };
}

function buildCollectionCategory(category, groups) {
  const sortedGroups = [...groups].sort((left, right) => (
    Number(Boolean(right.special)) - Number(Boolean(left.special))
    || Number(!right.visualOnly) - Number(!left.visualOnly)
    || right.damageBonusTotal - left.damageBonusTotal
    || left.name.localeCompare(right.name, "ru")
  ));
  const totals = {
    collected: 0,
    total: 0,
    completedSets: 0,
    totalSets: sortedGroups.length,
    bonusSets: 0,
    cosmeticSets: 0,
    collectedBonuses: {},
    potentialBonuses: {},
  };

  for (const group of sortedGroups) {
    totals.collected += group.collected;
    totals.total += group.total;
    totals.completedSets += group.complete ? 1 : 0;
    totals.bonusSets += group.visualOnly ? 0 : 1;
    totals.cosmeticSets += group.visualOnly ? 1 : 0;
    addBonusMaps(totals.collectedBonuses, group.collectedBonuses);
    addBonusMaps(totals.potentialBonuses, group.potentialBonuses);
  }

  return {
    ...category,
    totals,
    groups: sortedGroups,
  };
}

function buildWearableCollectionDashboard(catalog, inventory, options = {}) {
  const owned = createOwnedWearableSets(inventory || {});
  const grouped = new Map();
  const genericSetNames = new Set([
    "без комплекта",
    "комплект наколка",
    "комплект одежда",
    "наколка",
    "одежда",
  ]);

  for (const sourceItem of catalog && Array.isArray(catalog.items) ? catalog.items : []) {
    const source = inferWearableCollectionSource(sourceItem);
    const item = {
      ...sourceItem,
      combatStatsBonus: normalizeBonusMap(sourceItem.combatStatsBonus),
      owned: Boolean(owned[sourceItem.type] && owned[sourceItem.type].has(Number(sourceItem.id))),
      collectionSourceLabel: source.sourceLabel,
    };
    const normalizedSetName = normalizeSearchText(item.setName);
    const groupIdentity = genericSetNames.has(normalizedSetName)
      ? `${item.name}:${normalizeSearchText(source.sourceLabel)}`
      : item.setName;
    const key = `${source.categoryId}:${item.type}:${groupIdentity}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        categoryId: source.categoryId,
        type: item.type,
        name: item.setName,
        items: [],
      });
    }
    grouped.get(key).items.push(item);
  }

  const collectionGroups = [...grouped.values()].map(buildCollectionGroup);
  const categories = WEARABLE_SOURCE_CATEGORIES.map((category) => buildCollectionCategory(
    category,
    collectionGroups.filter((group) => group.categoryId === category.id),
  ));
  const totals = {
    collected: 0,
    total: 0,
    completedSets: 0,
    totalSets: 0,
    bonusSets: 0,
    cosmeticSets: 0,
    clothing: 0,
    tattoos: 0,
    collectedBonuses: {},
    potentialBonuses: {},
  };

  for (const category of categories) {
    totals.collected += category.totals.collected;
    totals.total += category.totals.total;
    totals.completedSets += category.totals.completedSets;
    totals.totalSets += category.totals.totalSets;
    totals.bonusSets += category.totals.bonusSets;
    totals.cosmeticSets += category.totals.cosmeticSets;
    addBonusMaps(totals.collectedBonuses, category.totals.collectedBonuses);
    addBonusMaps(totals.potentialBonuses, category.totals.potentialBonuses);
  }
  for (const item of catalog && Array.isArray(catalog.items) ? catalog.items : []) {
    if (item.type === "clothing") totals.clothing += 1;
    if (item.type === "tattoo") totals.tattoos += 1;
  }

  const ravenGroup = collectionGroups.find((group) => group.special === "raven") || null;
  const bossPlayerStats = options.bossPlayerStats && typeof options.bossPlayerStats === "object"
    ? options.bossPlayerStats
    : {};
  const keychainBossIds = Array.isArray(bossPlayerStats.openByKeychainBossIds)
    ? bossPlayerStats.openByKeychainBossIds.map((value) => Number(value)).filter(Boolean)
    : [];

  return {
    generatedAt: new Date().toISOString(),
    catalogGeneratedAt: catalog && catalog.generatedAt ? catalog.generatedAt : null,
    zoneCount: catalog && catalog.zoneCount ? Number(catalog.zoneCount) : WEARABLE_ZONE_COUNT,
    totals,
    specials: [
      {
        id: "raven",
        name: "Ворон",
        sourceLabel: "Редкий предмет из покера",
        effect: "Раз в сутки приносит ресурсы: яд, самопалы или рубли; иногда — наколку. Сам по себе постоянного боевого бонуса не даёт.",
        owned: Boolean(ravenGroup && ravenGroup.collected > 0),
        imageUrl: ravenGroup ? ravenGroup.imageUrl : null,
        categoryId: "gambling",
      },
      {
        id: "keychain",
        name: "Связка ключей",
        sourceLabel: "Редкий приз покера",
        effect: "Позволяет нападать на большинство боссов без обычных ключей.",
        owned: keychainBossIds.length > 0,
        affectedBossCount: keychainBossIds.length,
        imageUrl: KEYCHAIN_IMAGE_URL,
        categoryId: "gambling",
      },
    ],
    categories,
  };
}

module.exports = {
  DAMAGE_BONUS_KEYS,
  KEYCHAIN_IMAGE_URL,
  WEARABLE_CATALOG_CACHE_PATH,
  WEARABLE_SOURCE_CATEGORIES,
  addBonusMaps,
  buildWearableCollectionDashboard,
  buildWearableDashboard,
  fetchWearableCatalog,
  inferWearableCollectionSource,
  inferWearableSource,
  loadWearableCatalog,
  normalizeBonusMap,
  normalizeSearchText,
  normalizeWearableCatalog,
  normalizeWearableItem,
  readWearableCatalogCache,
  _internals: {
    CLOTHING_ZONE_COUNT,
    TATTOO_ZONE_COUNT,
    WEARABLE_CATEGORY_BY_ID,
    buildCollectionCategory,
    buildCollectionGroup,
    createOwnedWearableSets,
    findUnobservedBossIds,
    getDamageBonusTotal,
    hasBonuses,
    normalizeBossIds,
    pickMostFrequent,
  },
};
