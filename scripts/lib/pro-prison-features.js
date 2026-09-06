const { createHash, randomUUID } = require("node:crypto");
const path = require("node:path");
const { normalizeZarubaPolicy, zarubaTaskPolicy } = require("./quest-policy");

const { ARTIFACTS_DIR } = require("./pbot");
const {
  createAtomicJsonStore,
  createMutationCoordinator,
  getMoscowDateKey,
  sanitizeSensitive,
} = require("./automation-state");
const {
  normalizeBusinessDashboard,
  normalizeMasterEnterResponse,
  normalizePodogrevDashboard,
} = require("./prison-dashboard");
const { loadPrisonDetail } = require("./prison-runner");
const {
  buildMasterKnowledgePlan,
  buildPrisonRespectPlan,
  selectMinimumPlan,
} = require("./zaruba-planner");

const WEAPON_PRICES_RUBLES = Object.freeze({
  poison: 18,
  gunshot: 5,
  knife: 4,
});
const ZARUBA_WEAPON_LABELS = Object.freeze({
  poison: "Яд",
  gunshot: "Самопал",
  knife: "Финка",
});
const BAG_ORE_PER_SIGNET = 15;
const ZARUBA_BAG_GROUPS = Object.freeze([
  Object.freeze({ sourceKey: "pacanBags", mode: "pacan", label: "Пацанские" }),
  Object.freeze({ sourceKey: "blatBags", mode: "blat", label: "Блатные" }),
  Object.freeze({ sourceKey: "avtoritetBags", mode: "avtoritet", label: "Авторитетные" }),
]);
const ZARUBA_BAG_MODE_IDS = Object.freeze({
  pacan: 1,
  blat: 2,
  avtoritet: 3,
});
const ZARUBA_ACTIONS = new Set(["start", "claim", "openBag", "exchangeOre", "skip"]);
// Original game's task card uses skipCost = 4 and POST /api/zaruba/skip { TaskId }.
const ZARUBA_SKIP_SOAP = 4;
const ZARUBA_TASK_KINDS = new Set([
  "prison",
  "master",
  "boss",
  "friend",
  "wheel",
  "fartovy",
  "economy",
  "katala",
  "podogrev",
  "claim",
  "bag",
  "unknown",
]);
const ZARUBA_TASK_DEFINITIONS = Object.freeze({
  1: Object.freeze({
    kind: "friend",
    objective: "send_stash",
    actionKey: "friend_send_stash",
    actionLabel: "Отправить лишнюю нычку другому игроку",
    imageUrl: "https://oldprison-prod-assets-cdn-yandex.luckygem.online/assets/poker/hidesicon.png",
  }),
  2: Object.freeze({ kind: "economy", objective: "authority", actionKey: "collect_profit", actionLabel: "Получить авторитет" }),
  3: Object.freeze({ kind: "podogrev", objective: "podogrev", actionKey: "collect_podogrev", actionLabel: "Собрать подогрев" }),
  4: Object.freeze({ kind: "prison", objective: "respect", actionKey: "prison_respect", actionLabel: "Получить уважение в указанной тюрьме" }),
  5: Object.freeze({ kind: "boss", objective: "kill", actionKey: "boss_kill", actionLabel: "Убить указанного босса" }),
  6: Object.freeze({ kind: "boss", objective: "damage", actionKey: "boss_damage", actionLabel: "Нанести урон указанному боссу" }),
  8: Object.freeze({
    kind: "friend",
    objective: "harknut",
    actionKey: "friend_harknut",
    actionLabel: "Харкнуть через взаимодействие с игроком",
    imageUrl: "https://oldprison-prod-assets-cdn-yandex.luckygem.online/assets/Zaruba/ZarubActiv/i_harknyt.webp",
  }),
  9: Object.freeze({
    kind: "friend",
    objective: "fight",
    actionKey: "friend_fight",
    actionLabel: "Напрячь терпилу через взаимодействие с игроком",
    imageUrl: "https://oldprison-prod-assets-cdn-yandex.luckygem.online/assets/Zaruba/ZarubActiv/i_winPlayer.webp",
  }),
  11: Object.freeze({ kind: "master", objective: "knowledge", actionKey: "master_knowledge", actionLabel: "Получить знания у мастера" }),
  12: Object.freeze({ kind: "katala", objective: "katala", actionKey: "katala", actionLabel: "Сыграть с Каталой" }),
  13: Object.freeze({
    kind: "fartovy",
    objective: "spin",
    actionKey: "fartovy_spin",
    actionLabel: "Сыграть в Фартового",
    imageUrl: "https://oldprison-prod-assets-cdn-yandex.luckygem.online/assets/slots/slotsIcon/bgSlots.webp",
  }),
  14: Object.freeze({
    kind: "wheel",
    objective: "spin",
    actionKey: "wheel_spin",
    actionLabel: "Крутить Колесо Фортуны",
    imageUrl: "https://oldprison-prod-assets-cdn-yandex.luckygem.online/assets/FortuneScene/coleso_jack.webp",
  }),
});

function asInt(value, fallback = 0, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(maximum, parsed));
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function unwrapResponse(response) {
  if (!response || typeof response !== "object") {
    return response;
  }
  let value = Object.prototype.hasOwnProperty.call(response, "data") ? response.data : response;
  if (
    value
    && typeof value === "object"
    && value.data
    && typeof value.data === "object"
    && Object.keys(value).every((key) => ["success", "message", "data"].includes(key))
  ) {
    value = value.data;
  }
  return value;
}

function pickNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function pickString(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function pickDeepNumber(source, aliases, depth = 0) {
  if (!source || typeof source !== "object" || depth > 4) return null;
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(source, alias)) {
      const number = Number(source[alias]);
      if (Number.isFinite(number)) return number;
    }
  }
  for (const value of Object.values(source)) {
    const found = pickDeepNumber(value, aliases, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

function normalizeResourceCost(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([currency, amount]) => [String(currency).toLowerCase(), Number(amount)])
      .filter(([, amount]) => Number.isFinite(amount) && amount > 0),
  );
}

function stableVersion(value) {
  return createHash("sha256")
    .update(JSON.stringify(sanitizeSensitive(value)))
    .digest("hex")
    .slice(0, 16);
}

function normalizeBagSets(value) {
  return (Array.isArray(value) ? value : []).map((entry) => {
    const collected = asInt(entry && entry.collected, 0);
    const total = asInt(entry && entry.total, 0);
    return {
      setName: pickString(entry && entry.setName, entry && entry.name, "Комплект"),
      collected,
      total,
      remaining: Math.max(0, total - collected),
      bonuses: entry && entry.bonuses && typeof entry.bonuses === "object"
        ? sanitizeSensitive(entry.bonuses)
        : {},
      boostText: pickString(entry && entry.boostText) || null,
    };
  });
}

function summarizeBagSets(sets) {
  return sets.reduce((summary, entry) => ({
    collected: summary.collected + entry.collected,
    total: summary.total + entry.total,
    remaining: summary.remaining + entry.remaining,
  }), { collected: 0, total: 0, remaining: 0 });
}

function zarubaBagModeId(value) {
  const mode = String(value || "").trim().toLowerCase();
  const modeId = ZARUBA_BAG_MODE_IDS[mode];
  if (!Number.isInteger(modeId)) {
    throw new Error("Неизвестный режим зарубской сумки.");
  }
  return modeId;
}

function normalizeBagsDashboard(zarubaResponse, menyalaResponse) {
  const zarubaRoot = unwrapResponse(zarubaResponse) || {};
  const menyalaRoot = unwrapResponse(menyalaResponse) || {};
  const zarubaBalances = zarubaRoot.balances && typeof zarubaRoot.balances === "object"
    ? zarubaRoot.balances
    : {};
  const signet = asInt(pickNumber(zarubaBalances.signet, zarubaBalances.signets), 0);
  const ore = asInt(pickNumber(zarubaBalances.ore_signet, zarubaBalances.ore), 0);
  const zarubaGroups = ZARUBA_BAG_GROUPS.map((group) => ({
    mode: group.mode,
    label: group.label,
    bags: (Array.isArray(zarubaRoot[group.sourceKey]) ? zarubaRoot[group.sourceKey] : []).map((entry, index) => {
      const sets = normalizeBagSets(entry && entry.sets);
      const progress = summarizeBagSets(sets);
      const cost = asInt(entry && entry.costSignet, 0);
      const unlocked = entry && entry.unlocked !== false;
      const completed = Boolean(entry && entry.completed);
      return {
        family: "zaruba",
        mode: group.mode,
        bagId: pickString(entry && entry.bagId, entry && entry.id, `${group.mode}-${index + 1}`),
        title: pickString(entry && entry.title, `${group.label} · ${index + 1}`),
        iconKey: pickString(entry && entry.iconKey),
        cost,
        currency: "signet",
        balance: signet,
        unlocked,
        completed,
        canOpen: unlocked && !completed && cost > 0 && signet >= cost,
        progress,
        sets,
      };
    }),
  }));

  const brigadeRoot = menyalaRoot.families && menyalaRoot.families.brigade
    ? menyalaRoot.families.brigade
    : null;
  const armbandBalances = brigadeRoot
    && brigadeRoot.balances
    && brigadeRoot.balances.armband
    && typeof brigadeRoot.balances.armband === "object"
    ? brigadeRoot.balances.armband
    : {};
  const brigadeBags = (brigadeRoot && Array.isArray(brigadeRoot.bags) ? brigadeRoot.bags : [])
    .map((entry, index) => {
      const armbandKey = pickString(entry && entry.armbandKey, `armband_${index + 1}`);
      const balanceEntry = armbandBalances[armbandKey];
      const balance = asInt(
        balanceEntry && typeof balanceEntry === "object" ? balanceEntry.balance : balanceEntry,
        0,
      );
      const cap = asInt(balanceEntry && typeof balanceEntry === "object" ? balanceEntry.cap : 0, 0);
      const sets = normalizeBagSets(entry && entry.sets);
      const progress = summarizeBagSets(sets);
      const cost = asInt(entry && entry.cost, 0);
      const unlocked = entry && entry.unlocked !== false;
      const completed = Boolean(entry && entry.completed);
      return {
        family: "brigade",
        mode: null,
        bagId: pickString(entry && entry.bagId, entry && entry.id, `camp_${index + 1}`),
        variant: index + 1,
        title: pickString(entry && entry.title, `Бригадная сумка ${index + 1}`),
        iconKey: pickString(entry && entry.iconKey),
        cost,
        currency: armbandKey,
        balance,
        cap,
        unlocked,
        completed,
        canOpen: unlocked && !completed && cost > 0 && balance >= cost,
        progress,
        sets,
      };
    });

  const dashboard = {
    generatedAt: new Date().toISOString(),
    exchange: {
      ore,
      signet,
      orePerSignet: BAG_ORE_PER_SIGNET,
      availableExchanges: Math.floor(ore / BAG_ORE_PER_SIGNET),
      canExchange: ore >= BAG_ORE_PER_SIGNET,
    },
    zaruba: {
      available: zarubaGroups.some((group) => group.bags.length > 0),
      balances: { ore, signet },
      groups: zarubaGroups,
    },
    brigade: {
      available: Boolean(brigadeRoot),
      balances: sanitizeSensitive(armbandBalances),
      bags: brigadeBags,
    },
  };
  return {
    ...dashboard,
    stateVersion: stableVersion({
      exchange: dashboard.exchange,
      zaruba: dashboard.zaruba.groups,
      brigade: dashboard.brigade,
    }),
  };
}

function containsSanitizerDepthMarker(value, depth = 0) {
  if (value === "[max-depth]") return true;
  if (depth > 12 || value === null || value === undefined || typeof value !== "object") return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsSanitizerDepthMarker(item, depth + 1));
  }
  return Object.values(value).some((item) => containsSanitizerDepthMarker(item, depth + 1));
}

function normalizeMode(rawMode, index, limitsRoot = {}) {
  const mode = rawMode && typeof rawMode === "object" ? rawMode : { id: rawMode };
  const id = pickString(mode.id, mode.mode, mode.type, mode.key, index + 1);
  const limit = mode.limit && typeof mode.limit === "object"
    ? mode.limit
    : limitsRoot[id] && typeof limitsRoot[id] === "object"
      ? limitsRoot[id]
      : {};
  const unlocked = mode.unlocked !== undefined
    ? Boolean(mode.unlocked)
    : mode.isUnlocked !== undefined
      ? Boolean(mode.isUnlocked)
      : !Boolean(mode.locked || mode.isLocked);
  return {
    id,
    name: pickString(mode.name, mode.title, mode.label, `Режим ${id}`),
    unlocked,
    lockReason: unlocked
      ? null
      : pickString(mode.lockReason, mode.reason, mode.requiredLevel && `Нужен уровень ${mode.requiredLevel}`, "Режим заблокирован"),
    reward: pickNumber(mode.reward, mode.rewardAmount, mode.profit, mode.signetReward, mode.rewardSignet),
    used: asInt(pickNumber(mode.used, mode.usedToday, limit.used), 0),
    max: asInt(pickNumber(mode.max, mode.dailyLimit, limit.max, limit.limit), 0),
  };
}

function normalizeZarubaState(response) {
  const root = unwrapResponse(response) || {};
  const progress = root.progress && typeof root.progress === "object"
    ? root.progress
    : root.playerProgress && typeof root.playerProgress === "object"
      ? root.playerProgress
      : {};
  const balances = root.balances && typeof root.balances === "object"
    ? root.balances
    : root.currencies && typeof root.currencies === "object"
      ? root.currencies
      : {};
  const limits = root.limits && typeof root.limits === "object" ? root.limits : {};
  let modesSource = Array.isArray(root.modes)
    ? root.modes
    : Array.isArray(root.availableModes)
      ? root.availableModes
      : root.modes && typeof root.modes === "object"
        ? Object.entries(root.modes).map(([id, mode]) => ({ id, ...(mode || {}) }))
        : [];
  if (modesSource.length === 0 && Object.keys(limits).length > 0) {
    modesSource = Object.keys(limits).map((id) => ({ id }));
  }
  const active = root.active ?? root.activeZaruba ?? root.current ?? null;
  const pendingReward = root.pendingReward ?? root.rewardPending ?? root.claimableReward ?? null;
  const limitEntries = Object.entries(limits);
  const modes = modesSource.map((mode, index) => {
    const modeObject = mode && typeof mode === "object" ? mode : { id: mode };
    const explicitId = pickString(modeObject.id, modeObject.mode, modeObject.type, modeObject.key);
    const explicitLimit = explicitId && limits[explicitId] && typeof limits[explicitId] === "object"
      ? limits[explicitId]
      : null;
    const positionalLimit = !explicitLimit
      && limitEntries.length === Math.max(0, modesSource.length - 1)
      && index > 0
      ? limitEntries[index - 1][1]
      : null;
    return normalizeMode({
      ...modeObject,
      ...(explicitLimit || positionalLimit ? { limit: explicitLimit || positionalLimit } : {}),
    }, index, limits);
  });
  return {
    generatedAt: new Date().toISOString(),
    modes,
    progress: {
      level: asInt(pickNumber(progress.level, root.level), 0),
      xp: asInt(pickNumber(progress.xp, progress.exp, root.xp), 0),
      xpRequired: asInt(pickNumber(progress.xpRequired, progress.need, progress.nextLevelXp), 0),
    },
    balances: {
      ore: asInt(pickNumber(balances.ore, balances.ore_signet, root.ore), 0),
      signet: asInt(pickNumber(balances.signet, balances.signets, root.signet), 0),
    },
    active: active && typeof active === "object" ? sanitizeSensitive(active) : null,
    pendingReward: pendingReward && typeof pendingReward === "object"
      ? sanitizeSensitive(pendingReward)
      : pendingReward || null,
  };
}

function walkStrings(value, output = [], depth = 0) {
  if (depth > 5 || value === null || value === undefined) return output;
  if (typeof value === "string" || typeof value === "number") {
    output.push(String(value));
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => walkStrings(item, output, depth + 1));
    return output;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((nested) => {
      walkStrings(nested, output, depth + 1);
    });
  }
  return output;
}

function classifyZarubaTask(active) {
  if (!active || typeof active !== "object") {
    return null;
  }
  const task = active.task && typeof active.task === "object"
    ? active.task
    : active.currentTask && typeof active.currentTask === "object"
      ? active.currentTask
      : active;
  const explicit = pickString(task.kind, task.type, task.taskType, task.category);
  const searchable = [explicit, ...walkStrings(task)].filter(Boolean).join(" ").toLowerCase();
  const numericType = Number(task.type ?? task.taskType);
  const definition = ZARUBA_TASK_DEFINITIONS[numericType] || null;
  let kind = definition ? definition.kind : "unknown";
  if (definition) kind = definition.kind;
  else if ([5, 6].includes(numericType) || pickNumber(task.bossId) !== null || /boss|босс/.test(searchable)) kind = "boss";
  else if (numericType === 4 || pickNumber(task.prisonId) !== null || /prison|zone|тюрьм|ходк|зон|уважени[ея]\s+зек/.test(searchable)) kind = "prison";
  else if (numericType === 11 || /master|мастер|интеллект|знани/.test(searchable)) kind = "master";
  else if (numericType === 8 || /harknut|spit|харк|friend|терпил|друг/.test(searchable)) kind = "friend";
  else if (numericType === 14 || /fortune|wheel|колес.{0,12}фортун/.test(searchable)) kind = "wheel";
  else if (numericType === 12 || /katala|катал/.test(searchable)) kind = "katala";
  else if (numericType === 3 || /podogrev|подогрев/.test(searchable)) kind = "podogrev";
  else if (numericType === 2 || /cigarette|папирос|заработай|авторитет|authority/.test(searchable)) kind = "economy";
  else if (/claim|profit|reward|награ|прибыл/.test(searchable)) kind = "claim";
  else if (/bag|мешок/.test(searchable)) kind = "bag";
  const taskId = pickString(task.id, task.taskId, task.questId, active.taskId, active.id);
  const targetId = asInt(
    pickNumber(
      task.targetId,
      task.prisonId,
      task.masterId,
      task.bossId,
      task.entityId,
      task.target && task.target.id,
    ),
    0,
  ) || null;
  const requiredAmount = asInt(
    pickNumber(task.requiredAmount, task.required, task.targetAmount, task.amount),
    0,
  );
  const currentAmount = asInt(
    pickNumber(task.currentAmount, task.current, task.progress, task.completedAmount),
    0,
  );
  const status = asInt(pickNumber(task.status, task.state), 0, 0, 100);
  const completed = Boolean(
    task.completed
    || task.isCompleted
    || status >= 1
    || (requiredAmount > 0 && currentAmount >= requiredAmount),
  );
  const objective = definition
    ? definition.objective
    : kind === "boss"
      ? numericType === 5 || /убей|kill/.test(searchable)
        ? "kill"
        : "damage"
      : kind === "prison"
        ? "respect"
        : kind === "master"
          ? "knowledge"
          : kind;
  const imageUrl = pickString(task.imageUrl, task.iconUrl, task.icon, definition && definition.imageUrl);
  return {
    kind: ZARUBA_TASK_KINDS.has(kind) ? kind : "unknown",
    taskId,
    targetId,
    isDay: task.isDay === undefined ? true : Boolean(task.isDay),
    label: pickString(task.title, task.name, task.description, task.label, `Задание ${taskId || "без ID"}`),
    subtitle: pickString(task.subtitle),
    rawType: task.type ?? task.taskType ?? null,
    objective,
    requiredAmount,
    currentAmount,
    status,
    completed,
    skipCostSoap: asInt(task.skipCostSoap ?? task.skipCost, ZARUBA_SKIP_SOAP),
    queueable: ["prison", "master", "boss"].includes(kind),
    rewardAvailable: Boolean(task.rewardAvailable || task.profitAvailable || task.canClaim),
    serverCost: task.cost && typeof task.cost === "object" ? sanitizeSensitive(task.cost) : null,
    ...(imageUrl ? { imageUrl } : {}),
  };
}

function getRemainingTaskAmount(task) {
  return Math.max(0, asInt(task && task.requiredAmount, 0) - asInt(task && task.currentAmount, 0));
}

function buildExecutionSummary(strategy, values = {}) {
  return {
    strategy,
    queueable: values.queueable !== false,
    status: values.status || "ready",
    label: values.label || null,
    ...sanitizeSensitive(values),
  };
}

function normalizeZarubaWeaponStats(response) {
  const root = unwrapResponse(response) || {};
  const source = root.weaponStatsEffective && typeof root.weaponStatsEffective === "object"
    ? root.weaponStatsEffective
    : root.playerStats && root.playerStats.weaponStatsEffective
      && typeof root.playerStats.weaponStatsEffective === "object"
      ? root.playerStats.weaponStatsEffective
      : root;
  const counts = source.counts && typeof source.counts === "object" ? source.counts : {};
  const damage = source.damage && typeof source.damage === "object" ? source.damage : {};
  return Object.fromEntries(Object.keys(WEAPON_PRICES_RUBLES).map((key) => [key, {
    key,
    label: ZARUBA_WEAPON_LABELS[key] || key,
    priceRubles: WEAPON_PRICES_RUBLES[key],
    count: asInt(pickNumber(source[`${key}Count`], counts[key]), 0),
    damage: asInt(pickNumber(source[`${key}Damage`], damage[key]), 0),
  }]));
}

function selectZarubaDamageWeapon(weaponStats, requiredDamage, options = {}) {
  const required = Math.max(0, asInt(requiredDamage, 0));
  const source = weaponStats && typeof weaponStats === "object" ? weaponStats : {};
  const available = Object.keys(WEAPON_PRICES_RUBLES)
    .map((key) => ({
      key,
      label: source[key] && source[key].label || ZARUBA_WEAPON_LABELS[key] || key,
      priceRubles: WEAPON_PRICES_RUBLES[key],
      count: Math.max(0, asInt(source[key] && source[key].count, 0)),
      damage: Math.max(0, asInt(source[key] && source[key].damage, 0)),
    }))
    .filter((weapon) => (weapon.count > 0 || options.allowPurchase) && weapon.damage > 0);
  const comparePlans = (left, right) => (
    left.purchaseRubles - right.purchaseRubles
    || left.priceRubles - right.priceRubles
    || left.totalDamage - right.totalDamage
    || left.hitTypes.length - right.hitTypes.length
    || left.hitTypes.join(",").localeCompare(right.hitTypes.join(","))
  );
  let states = new Map([[0, {
    totalDamage: 0,
    priceRubles: 0,
    purchaseRubles: 0,
    purchases: {},
    hitTypes: [],
  }]]);

  // Bounded knapsack: every owned weapon can be used more than once, while the
  // damage state is capped at the task remainder. Binary groups keep large
  // inventories cheap to process without losing any possible hit count.
  const groups = available.flatMap((weapon) => [
    { ...weapon, buying: false },
    ...(options.allowPurchase ? [{ ...weapon, count: Math.min(10_000, Math.ceil(required / weapon.damage)), buying: true }] : []),
  ]);
  for (const weaponEntry of groups) {
    let remainingCount = Math.min(weaponEntry.count, Math.ceil(required / weaponEntry.damage));
    let groupSize = 1;
    while (remainingCount > 0) {
      const uses = Math.min(groupSize, remainingCount);
      const nextStates = new Map(states);
      for (const [damage, plan] of states) {
        const totalDamage = plan.totalDamage + (weaponEntry.damage * uses);
        const cappedDamage = Math.min(required, totalDamage);
        const candidate = {
          totalDamage,
          priceRubles: plan.priceRubles + (weaponEntry.priceRubles * uses),
          purchaseRubles: plan.purchaseRubles + (weaponEntry.buying ? weaponEntry.priceRubles * uses : 0),
          purchases: weaponEntry.buying
            ? { ...plan.purchases, [weaponEntry.key]: (plan.purchases[weaponEntry.key] || 0) + uses }
            : plan.purchases,
          hitTypes: [...plan.hitTypes, ...Array(uses).fill(weaponEntry.key)],
        };
        const current = nextStates.get(cappedDamage);
        if (!current || comparePlans(candidate, current) < 0) {
          nextStates.set(cappedDamage, candidate);
        }
      }
      states = nextStates;
      remainingCount -= uses;
      groupSize *= 2;
    }
  }

  const plan = required > 0 ? states.get(required) || null : states.get(0);
  const hitTypes = plan ? plan.hitTypes : [];
  const weapons = available
    .map((weaponEntry) => {
      const uses = hitTypes.filter((key) => key === weaponEntry.key).length;
      return uses > 0 ? {
        ...weaponEntry,
        uses,
        totalDamage: weaponEntry.damage * uses,
        totalPriceRubles: weaponEntry.priceRubles * uses,
      } : null;
    })
    .filter(Boolean);
  const weapon = weapons.length === 1 ? weapons[0] : weapons[0] || null;
  return {
    requiredDamage: required,
    sufficient: Boolean(plan),
    reason: plan ? "ok" : available.length > 0 ? "insufficient_total_damage" : "no_available_weapons",
    weapon,
    weapons,
    hitTypes,
    plannedDamage: plan ? plan.totalDamage : 0,
    priceRubles: plan ? plan.priceRubles : 0,
    purchaseRubles: plan ? plan.purchaseRubles : 0,
    purchases: plan ? plan.purchases : {},
    available,
  };
}

async function buildZarubaTaskExecutionPlans(client, tasks, automation = {}) {
  const source = Array.isArray(tasks) ? tasks : [];
  const incomplete = source.filter((task) => task && !task.completed);
  const needsBusiness = incomplete.some((task) => ["prison", "economy", "claim"].includes(task.kind));
  const needsPrisons = incomplete.some((task) => task.kind === "prison");
  const needsMasters = incomplete.some((task) => task.kind === "master");
  const needsPodogrev = incomplete.some((task) => task.kind === "podogrev");
  const needsWheel = incomplete.some((task) => task.kind === "wheel");
  const needsBossDamage = incomplete.some((task) => task.kind === "boss" && task.objective === "damage");

  const optionalRequest = (request) => Promise.resolve(request).catch(() => null);
  const [businessResponse, prisonsResponse, mastersResponse, podogrevResponse, wheelResponse, bossBootstrapResponse] = await Promise.all([
    optionalRequest(needsBusiness && client.business && typeof client.business.all === "function" ? client.business.all() : null),
    optionalRequest(needsPrisons && client.prisons && typeof client.prisons.all === "function" ? client.prisons.all() : null),
    optionalRequest(needsMasters && client.masters && typeof client.masters.all === "function" ? client.masters.all() : null),
    optionalRequest(needsPodogrev && client.podogrev && typeof client.podogrev.status === "function" ? client.podogrev.status() : null),
    optionalRequest(needsWheel && client && typeof client.get === "function" ? client.get("/api/wheel/state") : null),
    optionalRequest(needsBossDamage && client.bosses && typeof client.bosses.bootstrap === "function"
      ? client.bosses.bootstrap()
      : null),
  ]);
  const business = needsBusiness ? normalizeBusinessDashboard(businessResponse) : null;
  const prisonsRoot = unwrapResponse(prisonsResponse) || {};
  const prisonById = new Map(
    (Array.isArray(prisonsRoot.prisons) ? prisonsRoot.prisons : [])
      .map((prison) => [Number(prison.id), prison]),
  );
  const mastersRoot = unwrapResponse(mastersResponse) || {};
  const masterCatalog = Array.isArray(mastersRoot.masters) ? mastersRoot.masters : [];
  const masterAccess = mastersRoot.access && typeof mastersRoot.access === "object" ? mastersRoot.access : {};
  const unlockedMasters = masterCatalog.filter((master) => (
    masterAccess[String(master.id)] === true || masterAccess[master.id] === true
  ));
  let masterPlansPromise = null;
  const loadMasterPlans = () => {
    if (!masterPlansPromise) {
      masterPlansPromise = Promise.all(unlockedMasters.map(async (master) => {
        const training = normalizeMasterEnterResponse(await client.masters.enter(master.id), master);
        return { master, training };
      }));
    }
    return masterPlansPromise;
  };
  const podogrev = needsPodogrev ? normalizePodogrevDashboard(podogrevResponse) : null;
  const wheel = needsWheel ? unwrapResponse(wheelResponse) || {} : null;
  const wheelTickets = wheel ? Math.max(0, pickDeepNumber(wheel, [
    "tickets",
    "fortuneTickets",
    "fortune_tickets",
  ]) || 0) : 0;
  const wheelRubles = wheel ? Math.max(0, pickDeepNumber(wheel, ["rubles"]) || 0) : 0;
  const wheelHasPendingPrize = Boolean(
    wheel
    && (
      wheel.pending
      || wheel.prizePending
      || wheel.hasPendingPrize
      || wheel.state && (wheel.state.pending || wheel.state.prizePending || wheel.state.hasPendingPrize)
    )
  );
  const zarubaWeaponStats = needsBossDamage
    ? normalizeZarubaWeaponStats(bossBootstrapResponse)
    : {};

  return Promise.all(source.map(async (task) => {
    const remaining = getRemainingTaskAmount(task);
    if (task.completed || (Number(task.requiredAmount || 0) > 0 && remaining <= 0)) {
      return {
        ...task,
        execution: buildExecutionSummary("completed", {
          queueable: false,
          status: "completed",
          remaining: 0,
          label: "Задание закрыто",
        }),
      };
    }

    try {
      if (Number(task.requiredAmount || 0) <= 0 && ["prison", "boss"].includes(task.kind)) {
        return {
          ...task,
          execution: buildExecutionSummary("queue_fallback", {
            queueable: Boolean(task.targetId),
            remaining: null,
            targetId: task.targetId,
            objective: task.objective,
            label: "Точный объём уточнится по живому прогрессу",
          }),
        };
      }
      if (task.kind === "prison" && task.targetId) {
        const prison = prisonById.get(Number(task.targetId)) || null;
        const prisonName = prison && (prison.name || prison.title) || `Тюрьма #${task.targetId}`;
        const profitRespect = Number(
          business
          && business.expectedRewardsByPrison
          && business.expectedRewardsByPrison[String(task.targetId)]
          && business.expectedRewardsByPrison[String(task.targetId)].respect,
        ) || 0;
        if (profitRespect > 0 && business && business.canCollect) {
          return {
            ...task,
            imageUrl: prison && prison.imageUrl || null,
            execution: buildExecutionSummary("collect_profit_first", {
              queueable: false,
              status: "ready",
              remaining,
              profitRespect,
              profitAvailable: true,
              canAct: true,
              label: `Сначала собрать прибыль: +${profitRespect} уважения`,
            }),
          };
        }
        if (profitRespect >= remaining) {
          return {
            ...task,
            imageUrl: prison && prison.imageUrl || null,
            execution: buildExecutionSummary("wait_profit", {
              queueable: false,
              status: "waiting",
              remaining,
              profitRespect,
              profitAvailable: false,
              collectAvailableAt: business && business.collectAvailableAt,
              label: `Закроется следующим сбором прибыли (+${profitRespect})`,
            }),
          };
        }
        if (prison && prison.isUnlocked === false) {
          return {
            ...task,
            imageUrl: prison.imageUrl || null,
            execution: buildExecutionSummary("prison_locked", {
              queueable: false,
              status: "blocked",
              remaining,
              targetId: task.targetId,
              targetName: prisonName,
              reason: "target_prison_locked",
              label: `${prisonName} закрыта на этом аккаунте`,
            }),
          };
        }
        const detail = await loadPrisonDetail(client, task.targetId);
        const plan = buildPrisonRespectPlan(detail.view, remaining);
        return {
          ...task,
          isDay: plan ? plan.isDay : task.isDay,
          imageUrl: prison && prison.imageUrl || null,
          execution: plan
            ? buildExecutionSummary("prison_minimum", {
                remaining,
                targetId: task.targetId,
                targetName: prisonName,
                imageUrl: prison && prison.imageUrl || null,
                isDay: plan.isDay,
                modeKey: plan.modeKey,
                steps: plan.steps,
                energy: plan.energy,
                points: plan.points,
                overage: plan.overage,
                stepEnergy: plan.stepEnergy,
                stepRewards: plan.stepRewards,
                profitRespect,
                label: `${plan.steps} шаг. · ${plan.energy} энергии до цели`,
              })
            : buildExecutionSummary("prison_unavailable", {
                queueable: false,
                status: "blocked",
                remaining,
                targetId: task.targetId,
                targetName: prisonName,
                reason: "checkpoint_rewards_unavailable",
                label: `${prisonName}: игра не вернула награды за шаги`,
              }),
        };
      }

      if (task.kind === "master") {
        if (Number(task.requiredAmount || 0) <= 0) {
          const fallbackMasterId = task.targetId || automation.intellectMasterId || null;
          return {
            ...task,
            targetId: fallbackMasterId,
            execution: buildExecutionSummary("master_queue_fallback", {
              queueable: Boolean(fallbackMasterId),
              targetId: fallbackMasterId,
              label: fallbackMasterId ? `Мастер #${fallbackMasterId}` : "Не выбран мастер",
            }),
          };
        }
        if (!client.masters || typeof client.masters.enter !== "function") {
          const fallbackMasterId = task.targetId || automation.intellectMasterId || null;
          return {
            ...task,
            targetId: fallbackMasterId,
            execution: buildExecutionSummary("master_queue_fallback", {
              queueable: Boolean(fallbackMasterId),
              status: fallbackMasterId ? "ready" : "blocked",
              remaining,
              targetId: fallbackMasterId,
              label: fallbackMasterId ? `Мастер #${fallbackMasterId}` : "Не выбран мастер",
            }),
          };
        }
        const entries = await loadMasterPlans();
        const candidates = entries.map(({ master, training }) => {
          const plan = training.missingItems.length === 0
            ? buildMasterKnowledgePlan(training, remaining)
            : null;
          return plan ? {
            ...plan,
            targetId: Number(master.id),
            targetName: master.name || `Мастер #${master.id}`,
            imageUrl: master.icon || null,
          } : null;
        }).filter(Boolean);
        let selected = selectMinimumPlan(candidates);
        if (!selected && automation.intellectMasterId) {
          selected = candidates.find((entry) => Number(entry.targetId) === Number(automation.intellectMasterId)) || null;
        }
        return {
          ...task,
          targetId: selected ? selected.targetId : task.targetId,
          imageUrl: selected && selected.imageUrl || null,
          execution: selected
            ? buildExecutionSummary("master_minimum", {
                remaining,
                targetId: selected.targetId,
                targetName: selected.targetName,
                imageUrl: selected.imageUrl,
                steps: selected.steps,
                energy: selected.energy,
                points: selected.points,
                overage: selected.overage,
                stepEnergy: selected.stepEnergy,
                stepRewards: selected.stepRewards,
                alternatives: candidates
                  .sort((left, right) => Number(left.energy) - Number(right.energy))
                  .slice(0, 3)
                  .map((entry) => ({
                    targetId: entry.targetId,
                    targetName: entry.targetName,
                    energy: entry.energy,
                    steps: entry.steps,
                    points: entry.points,
                  })),
                label: `${selected.targetName} · ${selected.energy} энергии`,
              })
            : buildExecutionSummary("master_unavailable", {
                queueable: false,
                status: "blocked",
                remaining,
                reason: unlockedMasters.length === 0
                  ? "no_unlocked_masters"
                  : entries.some(({ training }) => training.missingItems.length > 0)
                    ? "master_items_missing"
                    : "master_rewards_unavailable",
                unlockedMasters: unlockedMasters.length,
                missingItems: entries.reduce(
                  (total, { training }) => total + Number(training.missingItems.length || 0),
                  0,
                ),
                label: unlockedMasters.length === 0
                  ? "На этом аккаунте нет открытых мастеров"
                  : entries.some(({ training }) => training.missingItems.length > 0)
                    ? `Для открытого мастера не хватает вещей (${entries.reduce((total, { training }) => total + Number(training.missingItems.length || 0), 0)})`
                    : "Открытый мастер не сообщил награду за обучение",
              }),
        };
      }

      if (task.kind === "boss") {
        const damage = task.objective === "damage";
        const damagePlan = damage ? selectZarubaDamageWeapon(zarubaWeaponStats, remaining, { allowPurchase: true }) : null;
        return {
          ...task,
          execution: buildExecutionSummary(damage ? "boss_minimum_damage" : "boss_kill", {
            queueable: !damage || damagePlan.sufficient,
            status: damage && !damagePlan.sufficient ? "blocked" : "ready",
            remaining,
            targetId: task.targetId,
            objective: task.objective,
            hitTypes: damage ? damagePlan.hitTypes : [],
            weapon: damagePlan && damagePlan.weapon,
            weapons: damagePlan && damagePlan.weapons,
            plannedDamage: damagePlan && damagePlan.plannedDamage,
            priceRubles: damagePlan && damagePlan.priceRubles,
            purchaseRubles: damagePlan && damagePlan.purchaseRubles,
            purchases: damagePlan && damagePlan.purchases,
            availableWeapons: damagePlan && damagePlan.available,
            reason: damagePlan && !damagePlan.sufficient ? damagePlan.reason : null,
            manualQueueOnly: true,
            label: damage
              ? damagePlan.sufficient
                ? `${damagePlan.weapons.map((entry) => `${entry.label} × ${entry.uses}`).join(" + ")}: ${damagePlan.plannedDamage} урона${damagePlan.purchaseRubles ? ` · докупить на ${damagePlan.purchaseRubles} ₽` : " · из запасов"}`
                : `Недостаточно оружия, чтобы нанести ${remaining} урона`
              : "Обычное убийство из очереди боссов",
          }),
        };
      }

      if (task.kind === "friend" && task.objective === "harknut") {
        return {
          ...task,
          execution: buildExecutionSummary("friend_harknut", {
            queueable: false,
            remaining,
            canAct: true,
            actionKey: "Harknut",
            label: `Харкнуть через взаимодействия с игроками · осталось ${remaining}`,
          }),
        };
      }

      if (task.kind === "friend" && task.objective === "send_stash") {
        return {
          ...task,
          execution: buildExecutionSummary("friend_send_stash", {
            queueable: false,
            remaining,
            canAct: true,
            label: `Отправить только лишние нычки · осталось ${remaining}`,
          }),
        };
      }

      if (task.kind === "friend" && task.objective === "fight") {
        return {
          ...task,
          execution: buildExecutionSummary("friend_fight", {
            queueable: false,
            remaining,
            canAct: true,
            actionKey: "Fight",
            label: `Напрячь терпилу через взаимодействие с игроками · осталось ${remaining}`,
          }),
        };
      }

      if (task.kind === "fartovy") {
        return {
          ...task,
          execution: buildExecutionSummary("fartovy_spin", {
            queueable: false,
            remaining,
            canAct: true,
            bet: 1,
            label: `Сыграть в Фартового на минимальной ставке · осталось ${remaining}`,
          }),
        };
      }

      if (task.kind === "wheel") {
        const ticketPriceRubles = 10;
        const needsTicketPurchase = wheelTickets <= 0;
        const purchaseAllowed = automation.wheelBuyTickets !== false
          && (automation.rublesDailyLimit == null
            || Number(automation.rublesCommitted || 0) + ticketPriceRubles <= automation.rublesDailyLimit);
        const canBuyTicket = needsTicketPurchase && purchaseAllowed && wheelRubles >= ticketPriceRubles;
        const canAct = wheelHasPendingPrize || wheelTickets > 0 || canBuyTicket;
        return {
          ...task,
          execution: buildExecutionSummary("wheel_spin", {
            queueable: false,
            status: canAct ? "ready" : "waiting",
            remaining,
            canAct,
            tickets: wheelTickets,
            rubles: wheelRubles,
            ticketPriceRubles,
            needsTicketPurchase,
            plannedRubles: canBuyTicket ? ticketPriceRubles : 0,
            hasPendingPrize: wheelHasPendingPrize,
            label: wheelHasPendingPrize
              ? "Забрать текущий приз валютой и продолжить задание"
              : wheelTickets > 0
                ? `Крутить Колесо Фортуны · осталось ${remaining}`
                : canBuyTicket
                  ? `Купить 1 билет за ${ticketPriceRubles} ₽ и крутить · осталось ${remaining}`
                  : !purchaseAllowed
                    ? "Покупка билета запрещена настройками или дневным лимитом"
                    : `Недостаточно рублей на билет Колеса Фортуны · нужно ${ticketPriceRubles} ₽`,
          }),
        };
      }

      if (task.kind === "podogrev") {
        const canCollect = Boolean(podogrev && podogrev.available > 0 && podogrev.leftQuota > 0);
        const collectTarget = Math.max(
          0,
          Math.min(remaining, Number(podogrev && podogrev.leftQuota || 0)),
        );
        return {
          ...task,
          execution: buildExecutionSummary("podogrev_free", {
            queueable: false,
            status: canCollect ? "ready" : "waiting",
            remaining,
            canAct: canCollect,
            available: podogrev ? podogrev.available : 0,
            leftQuota: podogrev ? podogrev.leftQuota : 0,
            collectTarget,
            exactAmount: true,
            label: canCollect
              ? `Собрать не больше ${collectTarget} энергии — ровно до цели Зарубы`
              : "Ждём доступный подогрев или новый дневной лимит",
          }),
        };
      }

      if (task.kind === "katala") {
        return {
          ...task,
          execution: buildExecutionSummary("katala_cheap", {
            queueable: false,
            remaining,
            maxRubles: 1,
            canAct: true,
            label: "Развести каталу · максимум 1 рубль",
          }),
        };
      }

      if (["economy", "claim"].includes(task.kind)) {
        return {
          ...task,
          execution: buildExecutionSummary("wait_profit", {
            queueable: false,
            status: business && business.canCollect ? "ready" : "waiting",
            remaining,
            canAct: Boolean(business && business.canCollect),
            collectAvailableAt: business && business.collectAvailableAt,
            label: business && business.canCollect ? "Собрать готовую прибыль" : "Ждём бесплатный сбор прибыли",
          }),
        };
      }

      return {
        ...task,
        execution: buildExecutionSummary("observe", {
          queueable: false,
          status: "waiting",
          remaining,
          label: "Отслеживается без остановки остальных заданий",
        }),
      };
    } catch (error) {
      return {
        ...task,
        execution: buildExecutionSummary(task.queueable ? "queue_fallback" : "plan_error", {
          queueable: Boolean(task.queueable && task.targetId),
          status: task.queueable && task.targetId ? "ready" : "blocked",
          remaining,
          error: error.message || String(error),
          label: task.queueable && task.targetId
            ? "Точный план уточнится перед первым шагом"
            : "План временно недоступен",
        }),
      };
    }
  }));
}

function normalizeZarubaTasks(active) {
  if (!active || typeof active !== "object") return [];
  const source = Array.isArray(active.tasks)
    ? active.tasks
    : active.task && typeof active.task === "object"
      ? [active.task]
      : active.currentTask && typeof active.currentTask === "object"
        ? [active.currentTask]
        : (
            active.taskId
            || active.questId
            || active.targetId
            || active.prisonId
            || active.masterId
            || active.bossId
            || active.title
          )
          ? [active]
          : [];
  return source
    .map((task) => classifyZarubaTask(task))
    .filter(Boolean);
}

function isZarubaCompletionClaimReady(dashboard, tasks = dashboard && dashboard.tasks) {
  const active = dashboard && dashboard.active;
  if (!active || typeof active !== "object") return false;
  if (active.finishedSuccess === true || active.finishedFail === true || active.allClosed === true) {
    return true;
  }
  const normalizedTasks = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  return normalizedTasks.length > 0 && normalizedTasks.every((task) => task.completed === true);
}

function isZarubaClaimCostVerifiedFree(dashboard, completionReady = false) {
  const pendingReward = dashboard && dashboard.pendingReward;
  if (!pendingReward) return completionReady === true;
  const cost = pendingReward && pendingReward.cost;
  if (cost === undefined || cost === null) return completionReady === true;
  return cost === 0 || Boolean(
    cost
    && typeof cost === "object"
    && Object.values(cost).every((value) => Number(value) === 0),
  );
}

function normalizeZarubaTaskLabelPattern(value) {
  return String(value || "")
    .trim()
    .replace(/\d[\d\s.,]*/g, "{N}")
    .replace(/\s+/g, " ")
    .slice(0, 240);
}

function buildZarubaTaskKnowledge(task) {
  const numericType = Number(task && task.rawType);
  const definition = Number.isFinite(numericType)
    ? ZARUBA_TASK_DEFINITIONS[numericType] || null
    : null;
  const kind = String(task && task.kind || "unknown");
  const known = Boolean(definition || kind !== "unknown");
  return {
    known,
    status: known ? "known" : "unknown",
    source: definition ? "built-in" : known ? "label-inference" : "unresolved",
    actionKey: definition && definition.actionKey
      || task && task.execution && task.execution.strategy
      || null,
    actionLabel: definition && definition.actionLabel
      || task && task.execution && task.execution.label
      || (known ? task && task.label || null : "Действие ещё не определено"),
  };
}

function normalizeZarubaTaskCatalog(value = {}) {
  const entries = (Array.isArray(value.entries) ? value.entries : [])
    .filter((entry) => entry && typeof entry === "object" && entry.key)
    .map((entry) => ({
      key: String(entry.key),
      rawType: entry.rawType ?? null,
      kind: String(entry.kind || "unknown"),
      objective: String(entry.objective || "unknown"),
      known: entry.known === true,
      status: entry.known === true ? "known" : "unknown",
      source: String(entry.source || (entry.known === true ? "learned" : "unresolved")),
      actionKey: entry.actionKey ? String(entry.actionKey) : null,
      actionLabel: entry.actionLabel ? String(entry.actionLabel) : null,
      labelPattern: normalizeZarubaTaskLabelPattern(entry.labelPattern),
      samples: [...new Set(
        (Array.isArray(entry.samples) ? entry.samples : [])
          .map((sample) => String(sample || "").trim())
          .filter(Boolean),
      )].slice(-5),
      occurrences: asInt(entry.occurrences, 0),
      firstSeenAt: entry.firstSeenAt || null,
      lastSeenAt: entry.lastSeenAt || null,
    }))
    .sort((left, right) => Number(left.rawType ?? Number.MAX_SAFE_INTEGER) - Number(right.rawType ?? Number.MAX_SAFE_INTEGER)
      || left.key.localeCompare(right.key));
  return {
    version: asInt(value.version, 0),
    updatedAt: value.updatedAt || null,
    entries,
    seenTaskHashes: [...new Set(
      (Array.isArray(value.seenTaskHashes) ? value.seenTaskHashes : [])
        .map(String)
        .filter(Boolean),
    )].slice(-2_000),
  };
}

function buildZarubaTaskCatalogView(value = {}) {
  const catalog = normalizeZarubaTaskCatalog(value);
  const entries = catalog.entries.map((entry) => {
    const definition = ZARUBA_TASK_DEFINITIONS[Number(entry.rawType)] || null;
    if (!definition) return entry;
    return {
      ...entry,
      kind: definition.kind,
      objective: definition.objective,
      known: true,
      status: "known",
      source: "built-in",
      actionKey: definition.actionKey,
      actionLabel: definition.actionLabel,
    };
  });
  const known = entries.filter((entry) => entry.known).length;
  return {
    version: catalog.version,
    updatedAt: catalog.updatedAt,
    summary: {
      observed: entries.length,
      known,
      unknown: entries.length - known,
    },
    entries,
  };
}

function compactZarubaHistoryValue(value, depth = 0) {
  const sanitized = depth === 0 ? sanitizeSensitive(value) : value;
  if (sanitized === null || sanitized === undefined) return sanitized;
  if (typeof sanitized === "string") {
    return sanitized.length > 500 ? `${sanitized.slice(0, 497)}…` : sanitized;
  }
  if (typeof sanitized !== "object") return sanitized;
  if (Array.isArray(sanitized)) {
    return sanitized.slice(0, 12).map((item) => compactZarubaHistoryValue(item, depth + 1));
  }
  if (depth >= 4) {
    return Object.fromEntries(
      Object.entries(sanitized)
        .filter(([, nested]) => nested === null || typeof nested !== "object")
        .slice(0, 20),
    );
  }
  return Object.fromEntries(
    Object.entries(sanitized)
      .filter(([key]) => !["dashboard", "raw", "response"].includes(key))
      .slice(0, 40)
      .map(([key, nested]) => [key, compactZarubaHistoryValue(nested, depth + 1)]),
  );
}

function zarubaRunKey(active) {
  if (!active || typeof active !== "object") return null;
  const id = active.id ?? active.runId ?? active.zarubaId;
  const start = active.startUnix ?? active.startedAt ?? active.startTime ?? null;
  const end = active.endUnix ?? active.endsAt ?? null;
  return stableVersion(id != null ? { id } : {
    mode: active.mode ?? null,
    start, end,
    ...(start != null || end != null ? {} : {
      tasks: normalizeZarubaTasks(active).map((task) => task.taskId).filter(Boolean).sort(),
    }),
  });
}

function normalizeZarubaRunSpending(value) {
  return Object.fromEntries(Object.entries(value || {}).slice(-20).map(([key, entry]) => [key, {
    reserved: asInt(entry?.reserved, 0),
    spent: asInt(entry?.spent, 0),
    since: typeof entry?.since === "string" ? entry.since : null,
    pending: Object.fromEntries(Object.entries(entry?.pending || {}).map(([id, item]) => [id, {
      amount: asInt(item?.amount, 0), confirmed: asInt(item?.confirmed, 0),
    }])),
  }]));
}

function normalizeZarubaAutomation(value = {}) {
  const selectedMode = pickString(value.selectedMode);
  const dayKey = getMoscowDateKey();
  const sameDay = value.dayKey === dayKey;
  const legacyUnknownTaskStop = value.enabled === false
    && /^Неизвестное задание:/i.test(String(value.lastError || ""))
    && value.lastAction
    && value.lastAction.type === "stopped"
    && value.lastAction.details
    && value.lastAction.details.reason === "unknown_task";
  const enabled = legacyUnknownTaskStop ? true : toBool(value.enabled, false);
  return {
    version: asInt(value.version, 0),
    updatedAt: value.updatedAt || null,
    enabled,
    ...normalizeZarubaPolicy(value),
    wheelRublesCommitted: sameDay ? asInt(value.wheelRublesCommitted, 0) : 0,
    rublesCommitted: sameDay ? asInt(value.rublesCommitted ?? value.wheelRublesCommitted, 0) : 0,
    rublesByRun: normalizeZarubaRunSpending(value.rublesByRun),
    skipAttempts: value.skipAttempts && typeof value.skipAttempts === "object" ? Object.fromEntries(Object.entries(value.skipAttempts).slice(-200)) : {},
    deferredTasks: Object.fromEntries(Object.entries(value.deferredTasks || {})
      .filter(([, retryAt]) => Number.isFinite(retryAt) && retryAt > Date.now())
      .slice(-50)),
    selectedMode,
    autoStart: toBool(value.autoStart, false),
    autoClaimFree: enabled,
    enqueueTasks: enabled,
    onlyWithoutProfit: toBool(value.onlyWithoutProfit, false),
    intellectMasterId: asInt(value.intellectMasterId, 0) || null,
    chefirReserve: asInt(value.chefirReserve, 0),
    allowBossSkipSoap: toBool(value.allowBossSkipSoap, false),
    bossSkipSoapDailyLimit: asInt(value.bossSkipSoapDailyLimit, 0),
    allowPodogrevSkipSoap: toBool(value.allowPodogrevSkipSoap, false),
    podogrevSkipSoapDailyLimit: asInt(value.podogrevSkipSoapDailyLimit, 0),
    dayKey,
    dailySpent: sameDay && value.dailySpent && typeof value.dailySpent === "object"
      ? sanitizeSensitive(value.dailySpent)
      : { soap: 0, chefir: 0 },
    processedTaskIds: (Array.isArray(value.processedTaskIds) ? value.processedTaskIds : [])
      .map(String)
      .slice(-500),
    history: (Array.isArray(value.history) ? value.history : [])
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      .filter((entry) => !containsSanitizerDepthMarker(entry))
      .map((entry) => compactZarubaHistoryValue(entry))
      .slice(-200),
    lastTickStartedAt: value.lastTickStartedAt || null,
    lastTickFinishedAt: value.lastTickFinishedAt || null,
    lastAction: value.lastAction ? sanitizeSensitive(value.lastAction) : null,
    lastError: legacyUnknownTaskStop ? null : value.lastError ? String(value.lastError) : null,
    recoveredLegacyUnknownTaskStop: legacyUnknownTaskStop,
  };
}

function normalizeBaulAutomation(value = {}) {
  const dayKey = getMoscowDateKey();
  return {
    version: asInt(value.version, 0),
    updatedAt: value.updatedAt || null,
    enabled: toBool(value.enabled, false),
    minLevel: asInt(value.minLevel, 25, 1, 25),
    requireWearable: toBool(value.requireWearable, false),
    allowSoap: toBool(value.allowSoap, false),
    soapDailyLimit: asInt(value.soapDailyLimit, 0),
    dayKey,
    soapSpentToday: value.dayKey === dayKey ? asInt(value.soapSpentToday, 0) : 0,
    lastAction: value.lastAction ? sanitizeSensitive(value.lastAction) : null,
    lastError: value.lastError ? String(value.lastError) : null,
  };
}

function normalizeFriendsAutomation(value = {}) {
  const dayKey = getMoscowDateKey();
  const now = Date.now();
  const hourStartedAt = Date.parse(value.hourStartedAt || "");
  const sameHour = Number.isFinite(hourStartedAt) && now - hourStartedAt < 60 * 60_000;
  return {
    version: asInt(value.version, 0),
    updatedAt: value.updatedAt || null,
    enabled: toBool(value.enabled, false),
    autoAccept: toBool(value.autoAccept, false),
    autoInvite: toBool(value.autoInvite, false),
    sources: (Array.isArray(value.sources) ? value.sources : ["authority-top", "weekly-top"])
      .map(String)
      .slice(0, 20),
    hourlyLimit: asInt(value.hourlyLimit, 5, 0, 100),
    dailyLimit: asInt(value.dailyLimit, 20, 0, 500),
    pendingLimit: asInt(value.pendingLimit, 20, 0, 500),
    intervalMinutes: asInt(value.intervalMinutes, 30, 5, 1440),
    dayKey,
    invitedToday: value.dayKey === dayKey ? asInt(value.invitedToday, 0) : 0,
    hourStartedAt: sameHour ? new Date(hourStartedAt).toISOString() : new Date(now).toISOString(),
    invitedThisHour: sameHour ? asInt(value.invitedThisHour, 0) : 0,
    processedIds: [...new Set(
      (Array.isArray(value.processedIds) ? value.processedIds : []).map(String),
    )].slice(-5000),
    history: (Array.isArray(value.history) ? value.history : [])
      .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
      .filter((entry) => !containsSanitizerDepthMarker(entry))
      .map((entry) => sanitizeSensitive(entry))
      .slice(-200),
    lastAction: value.lastAction ? sanitizeSensitive(value.lastAction) : null,
    lastError: value.lastError ? String(value.lastError) : null,
  };
}

function isSuccessfulResponse(response) {
  const status = Number(response && response.status);
  if (!response || response.ok === false || (Number.isFinite(status) && status >= 400)) return false;
  const data = unwrapResponse(response);
  return !data || typeof data !== "object" || (data.success !== false && data.ok !== false && !data.error);
}

function createApiContractError(label, response, suffix = "") {
  const status = Number(response && response.status);
  const statusLabel = Number.isFinite(status) ? `HTTP ${status}` : "неполный ответ";
  const error = new Error(`${label}: ${statusLabel}${suffix ? `, ${suffix}` : ""}.`);
  error.code = Number.isFinite(status) && status >= 400
    ? "remote_api_error"
    : "incomplete_api_response";
  error.status = Number.isFinite(status) ? status : null;
  return error;
}

function assertSuccessfulReadResponse(response, label) {
  if (!isSuccessfulResponse(response)) {
    throw createApiContractError(label, response);
  }
  const data = unwrapResponse(response);
  if (data === null || data === undefined || (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0)) {
    throw createApiContractError(label, response);
  }
  return data;
}

function isSuccessfulMutationResponse(response) {
  if (!isSuccessfulResponse(response)) return false;
  const data = unwrapResponse(response);
  return data !== null
    && data !== undefined
    && (
      typeof data !== "object"
      || Array.isArray(data)
      || Object.keys(data).length > 0
    );
}

function normalizeBarygaShop(allResponse, slotsResponse, inventoryResponse) {
  const all = unwrapResponse(allResponse) || {};
  const slots = unwrapResponse(slotsResponse) || {};
  const inventory = unwrapResponse(inventoryResponse) || {};
  const cameraItems = Array.isArray(all.cameraItems)
    ? all.cameraItems
    : Array.isArray(all.camera)
      ? all.camera
      : Array.isArray(all.cameras)
        ? all.cameras
        : [];
  const barygaItems = Array.isArray(all.barygaItems)
    ? all.barygaItems
    : Array.isArray(all.baryga)
      ? all.baryga
      : Array.isArray(all.items)
        ? all.items.filter((item) => /baryga/i.test(String(item.source || item.category || "")))
        : [];
  const rawInventoryItems = Array.isArray(inventory)
    ? inventory
    : inventory.items ?? inventory.inventory ?? [];
  const inventoryItems = Array.isArray(rawInventoryItems)
    ? rawInventoryItems
    : rawInventoryItems && typeof rawInventoryItems === "object"
      ? Object.entries(rawInventoryItems).map(([itemId, count]) => ({ itemId, count }))
      : [];
  const activeSlots = [
    ...(Array.isArray(slots.cameraSlots) ? slots.cameraSlots : [])
      .map((itemId, index) => ({ source: "camera", index, itemId }))
      .filter((slot) => slot.itemId !== null && slot.itemId !== undefined && slot.itemId !== ""),
    ...(Array.isArray(slots.barygaSlots) ? slots.barygaSlots : [])
      .map((itemId, index) => ({ source: "baryga", index, itemId }))
      .filter((slot) => slot.itemId !== null && slot.itemId !== undefined && slot.itemId !== ""),
  ];
  const quantities = new Map(inventoryItems.map((item) => [
    String(item.id ?? item.itemId ?? item.type),
    asInt(item.count ?? item.amount ?? item.quantity, 0),
  ]));
  const normalizeItem = (item, source) => ({
    id: pickString(item.id, item.itemId, item.type),
    name: pickString(item.name, item.title, item.label, "Без названия"),
    source,
    quantity: quantities.get(String(item.id ?? item.itemId ?? item.type)) || 0,
    price: pickNumber(item.price, item.cost, item.basePrice),
    currency: pickString(item.currency, item.currencyType),
    bonus: sanitizeSensitive(item.bonus ?? item.bonuses ?? null),
    temporaryBonus: sanitizeSensitive(item.temporaryBonus ?? item.tempBonus ?? null),
    imageUrl: pickString(item.imageUrl, item.image, item.icon),
  });
  return {
    generatedAt: new Date().toISOString(),
    cameraItems: cameraItems.map((item) => normalizeItem(item, "camera")),
    barygaItems: barygaItems.map((item) => normalizeItem(item, "baryga")),
    slots: sanitizeSensitive(slots.slots ?? slots),
    activeSlots: activeSlots.map((slot) => sanitizeSensitive(slot)),
    inventory: inventoryItems.map((item) => sanitizeSensitive(item)),
    hiddenGear: {
      available: Boolean(all.spinAvailable ?? all.canSpin ?? true),
      hasDiscount: Boolean(inventory.hasDiscount ?? all.hasDiscount),
      discount: pickNumber(inventory.discount, inventory.discountPercent, all.discount, all.discountPercent),
      verifiedUnitPrice: pickNumber(
        inventory.spinPrice,
        inventory.randomItemPrice,
        all.spinPrice,
        all.randomItemPrice,
      ),
      purchaseEnabled: false,
      disabledReason: "Контракт и цена Baryga Spin ещё не подтверждены безопасным перехватом.",
    },
  };
}

function normalizeGuildDashboard(response, selfUserId = null) {
  const root = unwrapResponse(response) || {};
  const guild = root.guild && typeof root.guild === "object" ? root.guild : root;
  const members = Array.isArray(root.members)
    ? root.members
    : Array.isArray(guild.members)
      ? guild.members
      : [];
  const normalizedMembers = members.map((member) => ({
    userId: pickString(member.userId, member.uid, member.id),
    nickname: pickString(member.nickname, member.name, member.username, "Без имени"),
    rank: pickString(member.rankName, member.rank, member.role),
    level: asInt(member.level, 0),
    activity: pickNumber(member.activity, member.score, member.contribution, member.weeklyActivity),
    isSelf: selfUserId !== null && String(member.userId ?? member.uid ?? member.id) === String(selfUserId),
  })).sort((left, right) => Number(right.activity || 0) - Number(left.activity || 0));
  const self = normalizedMembers.find((member) => member.isSelf) || null;
  return {
    inGuild: root.inGuild !== false && Boolean(guild.id ?? guild.guildId ?? normalizedMembers.length),
    generatedAt: new Date().toISOString(),
    guild: {
      name: pickString(guild.name, guild.title, "Бригада"),
      level: asInt(guild.level, 0),
      xp: asInt(guild.xp ?? guild.exp, 0),
      membersCount: asInt(guild.membersCount, normalizedMembers.length),
      maxMembers: asInt(guild.maxMembers ?? guild.capacity, 0),
    },
    selfRank: self ? self.rank : pickString(root.myRank, root.rank),
    members: normalizedMembers,
  };
}

function extractWeaponCounts(response) {
  const root = unwrapResponse(response) || {};
  return {
    poison: asInt(pickDeepNumber(root, ["poisonCount", "poison", "poisone"]), 0),
    gunshot: asInt(pickDeepNumber(root, ["gunshotCount", "gunshot", "pistol"]), 0),
    knife: asInt(pickDeepNumber(root, ["knifeCount", "knife", "finka"]), 0),
  };
}

function extractRubles(response) {
  const root = unwrapResponse(response) || {};
  return Math.max(0, pickDeepNumber(root, ["rubles", "ruble", "money"]) || 0);
}

function createProPrisonFeatureService(dependencies) {
  const {
    withContext,
    enqueueZarubaTask,
    reconcileZarubaQueues = async () => ({ prison: null, boss: null }),
    executeZarubaDirectTask = async () => ({ ok: false, reason: "direct_task_unavailable" }),
    inviteCollected,
    acceptFriendRequests,
    getLootContainersDashboard,
    openLootContainer,
  } = dependencies;
  const stateDir = dependencies.stateDir || ARTIFACTS_DIR;
  const zarubaStore = createAtomicJsonStore({
    filePath: path.join(stateDir, "zaruba-automation-latest.json"),
    label: "zaruba automation",
    safeState: { enabled: false },
    normalize: normalizeZarubaAutomation,
  });
  const zarubaTaskCatalogStore = createAtomicJsonStore({
    filePath: path.join(stateDir, "zaruba-task-catalog-latest.json"),
    label: "zaruba task catalog",
    safeState: { entries: [], seenTaskHashes: [] },
    normalize: normalizeZarubaTaskCatalog,
  });
  const baulStore = createAtomicJsonStore({
    filePath: path.join(stateDir, "baul-automation-latest.json"),
    label: "baul automation",
    safeState: { enabled: false, allowSoap: false, soapDailyLimit: 0 },
    normalize: normalizeBaulAutomation,
  });
  const friendsStore = createAtomicJsonStore({
    filePath: path.join(stateDir, "friends-automation-latest.json"),
    label: "friends automation",
    safeState: { enabled: false, autoAccept: false, autoInvite: false },
    normalize: normalizeFriendsAutomation,
  });
  const coordinator = createMutationCoordinator({
    ledgerPath: path.join(stateDir, "mutation-budget-latest.json"),
  });
  let zarubaTaskCatalogOperation = Promise.resolve();
  let zarubaAutomationOperation = Promise.resolve();

  function observeZarubaTasks(tasks = []) {
    const operation = zarubaTaskCatalogOperation.catch(() => undefined).then(async () => {
      const current = await zarubaTaskCatalogStore.load();
      const entries = new Map(current.entries.map((entry) => [entry.key, { ...entry }]));
      const seenTaskHashes = new Set(current.seenTaskHashes);
      const now = new Date().toISOString();
      let changed = false;

      for (const task of Array.isArray(tasks) ? tasks : []) {
        if (!task || typeof task !== "object") continue;
        const rawType = task.rawType ?? null;
        const numericType = Number(rawType);
        const labelPattern = normalizeZarubaTaskLabelPattern(task.label);
        const key = Number.isFinite(numericType)
          ? `type:${numericType}`
          : `label:${createHash("sha256").update(labelPattern || "unknown").digest("hex").slice(0, 12)}`;
        const knowledge = buildZarubaTaskKnowledge(task);
        const taskHash = createHash("sha256")
          .update(String(task.taskId || `${key}|${task.targetId || ""}|${task.requiredAmount || ""}|${task.label || ""}`))
          .digest("hex")
          .slice(0, 20);
        const isNewOccurrence = !seenTaskHashes.has(taskHash);
        const previous = entries.get(key) || null;
        const samples = [...new Set([
          ...(previous && Array.isArray(previous.samples) ? previous.samples : []),
          String(task.label || "").trim(),
        ].filter(Boolean))].slice(-5);
        const next = {
          key,
          rawType,
          kind: knowledge.known || !previous ? task.kind : previous.kind,
          objective: knowledge.known || !previous ? task.objective : previous.objective,
          known: Boolean(previous && previous.known || knowledge.known),
          source: knowledge.known ? knowledge.source : previous && previous.source || knowledge.source,
          actionKey: knowledge.actionKey || previous && previous.actionKey || null,
          actionLabel: knowledge.actionLabel || previous && previous.actionLabel || null,
          labelPattern: labelPattern || previous && previous.labelPattern || "",
          samples,
          occurrences: Number(previous && previous.occurrences || 0) + (isNewOccurrence ? 1 : 0),
          firstSeenAt: previous && previous.firstSeenAt || now,
          lastSeenAt: isNewOccurrence ? now : previous && previous.lastSeenAt || now,
        };
        if (!previous || JSON.stringify(previous) !== JSON.stringify(next)) {
          entries.set(key, next);
          changed = true;
        }
        if (isNewOccurrence) {
          seenTaskHashes.add(taskHash);
          changed = true;
        }
      }

      if (!changed) {
        return buildZarubaTaskCatalogView(current);
      }
      const saved = await zarubaTaskCatalogStore.save({
        ...current,
        entries: [...entries.values()],
        seenTaskHashes: [...seenTaskHashes].slice(-2_000),
      });
      return buildZarubaTaskCatalogView(saved);
    });
    zarubaTaskCatalogOperation = operation.then(() => undefined, () => undefined);
    return operation;
  }

  async function appendZarubaEvent(state, type, details = {}) {
    const event = {
      at: new Date().toISOString(),
      type,
      details: compactZarubaHistoryValue(details),
    };
    return zarubaStore.save((current) => ({
      history: [...(current.history || []), event].slice(-200),
      lastAction: event,
      ...(Object.prototype.hasOwnProperty.call(state, "lastTickFinishedAt")
        ? { lastTickFinishedAt: state.lastTickFinishedAt }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(state, "lastError")
        ? { lastError: state.lastError }
        : {}),
    }));
  }

  async function getBagsDashboard(sessionPath, previousDashboard = null, requestOptions = {}) {
    return withContext(sessionPath, async ({ client }) => {
      const [zarubaResponse, menyalaResponse] = await Promise.all([
        client.zaruba.wellState(requestOptions),
        previousDashboard ? null : client.menyala.state(requestOptions).catch(() => null),
      ]);
      if (!isSuccessfulResponse(zarubaResponse)) {
        throw new Error(`Не удалось получить зарубские сумки (HTTP ${zarubaResponse.status || "?"}).`);
      }
      const dashboard = normalizeBagsDashboard(
        zarubaResponse,
        isSuccessfulResponse(menyalaResponse) ? menyalaResponse : null,
      );
      // Zaruba mutations do not change brigade bags. Keep the preflight snapshot
      // instead of making the result wait for an unrelated game request.
      if (previousDashboard) {
        dashboard.brigade = previousDashboard.brigade;
        dashboard.stateVersion = stableVersion({
          exchange: dashboard.exchange,
          zaruba: dashboard.zaruba.groups,
          brigade: dashboard.brigade,
        });
      }
      return dashboard;
    });
  }

  async function runBagsAction(options = {}, sessionPath) {
    const family = String(pickString(options.family) || "").toLowerCase();
    const action = String(pickString(options.action) || "").toLowerCase();
    if (options.confirmed !== true) {
      throw new Error("Действие с сумками требует confirmed=true.");
    }
    if (!new Set(["zaruba", "brigade"]).has(family)) {
      throw new Error("Неизвестный тип сумки.");
    }
    if (!new Set(["open", "exchangeore"]).has(action)) {
      throw new Error("Неизвестное действие с сумками.");
    }

    // Manual Zaruba actions must not sit behind the automation polling queue.
    // Keep fresh preflight/postflight reads and the mutation coordinator.
    const requestOptions = family === "zaruba" ? { throttle: false } : {};
    const dashboard = await getBagsDashboard(sessionPath, null, requestOptions);
    if (options.expectedStateVersion && options.expectedStateVersion !== dashboard.stateVersion) {
      const error = new Error("Баланс или состояние сумки изменились. Экран уже обновлён — повторите действие.");
      error.code = "state_version_mismatch";
      throw error;
    }

    if (action === "exchangeore") {
      if (family !== "zaruba") {
        throw new Error("Руда переплавляется только в разделе зарубских сумок.");
      }
      if (!dashboard.exchange.canExchange) {
        throw new Error(`Для переплавки нужно ${BAG_ORE_PER_SIGNET} руды.`);
      }
      return withContext(sessionPath, async ({ client }) => {
        const actualCost = { ore_signet: BAG_ORE_PER_SIGNET };
        const mutation = await coordinator.run("bags:exchange-ore", {
          expectedCost: actualCost,
          dailyLimits: {},
        }, async () => {
          const response = await client.zaruba.exchangeOre({}, requestOptions);
          if (!isSuccessfulMutationResponse(response)) {
            throw new Error(`Игровой сервер отклонил переплавку (HTTP ${response.status || "?"}).`);
          }
          return {
            response: sanitizeSensitive(unwrapResponse(response)),
            actualCost,
          };
        });
        return {
          executed: true,
          family,
          action,
          result: mutation.result.response,
          dashboard: await getBagsDashboard(sessionPath, dashboard, requestOptions),
        };
      });
    }

    const bagId = pickString(options.bagId);
    const mode = String(pickString(options.mode) || "").toLowerCase();
    const bags = family === "zaruba"
      ? dashboard.zaruba.groups.flatMap((group) => group.bags)
      : dashboard.brigade.bags;
    const bag = bags.find((entry) => entry.bagId === bagId && (family !== "zaruba" || entry.mode === mode));
    if (!bag) throw new Error("Сумка отсутствует в свежем ответе игры.");
    if (!bag.unlocked) throw new Error("Эта сумка ещё закрыта.");
    if (bag.completed) throw new Error("Все вещи из этой сумки уже собраны.");
    if (bag.balance < bag.cost) {
      throw new Error(`Не хватает валюты: нужно ${bag.cost}, доступно ${bag.balance}.`);
    }

    return withContext(sessionPath, async ({ client }) => {
      const actualCost = { [bag.currency]: bag.cost };
      const mutation = await coordinator.run(`bags:${family}:${bag.bagId}`, {
        expectedCost: actualCost,
        dailyLimits: {},
      }, async () => {
        const response = family === "zaruba"
          ? await client.zaruba.openBag({ mode: zarubaBagModeId(bag.mode), bagId: bag.bagId }, requestOptions)
          : await client.menyala.openBag({ bagId: bag.bagId, idempotencyKey: randomUUID() });
        if (!isSuccessfulMutationResponse(response)) {
          throw new Error(`Игровой сервер отклонил открытие сумки (HTTP ${response.status || "?"}).`);
        }
        return {
          response: sanitizeSensitive(unwrapResponse(response)),
          actualCost,
        };
      });
      return {
        executed: true,
        family,
        action,
        bag: sanitizeSensitive(bag),
        result: mutation.result.response,
        dashboard: await getBagsDashboard(sessionPath, family === "zaruba" ? dashboard : null, requestOptions),
      };
    });
  }

  async function getZarubaDashboard(sessionPath) {
    return withContext(sessionPath, async ({ client }) => {
      const response = await client.zaruba.state();
      if (!isSuccessfulResponse(response)) {
        throw new Error(`Не удалось получить состояние Зарубы (HTTP ${response.status || "?"}).`);
      }
      const game = normalizeZarubaState(response);
      const automation = await zarubaStore.load();
      const runKey = zarubaRunKey(game.active);
      const spending = automation.rublesByRun[runKey];
      const plannedTasks = await buildZarubaTaskExecutionPlans(
        client,
        normalizeZarubaTasks(game.active),
        automation,
      );
      const tasks = plannedTasks.map((task) => {
        const retryAt = automation.deferredTasks[String(task.taskId)];
        const policy = retryAt
          ? { allowed: false, reason: "Ожидание повторной попытки; остальные задания продолжаются", retryAt }
          : zarubaTaskPolicy(task, automation);
        return {
          ...task,
          automationPolicy: policy,
          knowledge: buildZarubaTaskKnowledge(task),
        };
      });
      const taskCatalog = await observeZarubaTasks(tasks);
      const task = tasks.find((entry) => !entry.completed) || null;
      return {
        ...game,
        runKey,
        spending: { spent: spending?.spent || 0, reserved: spending?.reserved || 0, since: spending?.since || null },
        tasks,
        task,
        taskCatalog,
        stateVersion: stableVersion({
          modes: game.modes,
          progress: game.progress,
          balances: game.balances,
          active: game.active,
          pendingReward: game.pendingReward,
        }),
        automation,
      };
    });
  }

  async function updateZarubaAutomation(options = {}) {
    const { expectedVersion: _expectedVersion, wheelRublesCommitted: _committed, rublesCommitted: _rubles, rublesByRun: _runs, skipAttempts: _skips, dayKey: _dayKey, ...changes } = options;
    if (changes.rublesDailyLimit === undefined && changes.wheelRublesDailyLimit !== undefined) {
      changes.rublesDailyLimit = changes.wheelRublesDailyLimit;
    }
    if (Object.prototype.hasOwnProperty.call(changes, "enabled")) {
      const enabled = changes.enabled === true;
      changes.autoClaimFree = enabled;
      changes.enqueueTasks = enabled;
    }
    return zarubaStore.save((current) => ({
      ...changes,
      lastError: options.enabled === true ? null : current.lastError,
      ...(Object.prototype.hasOwnProperty.call(options, "allowBossSkipSoap")
        || Object.prototype.hasOwnProperty.call(options, "bossSkipSoapDailyLimit")
        ? {
            allowBossSkipSoap: options.allowBossSkipSoap === true
              && asInt(options.bossSkipSoapDailyLimit, current.bossSkipSoapDailyLimit) > 0,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(options, "allowPodogrevSkipSoap")
        || Object.prototype.hasOwnProperty.call(options, "podogrevSkipSoapDailyLimit")
        ? {
            allowPodogrevSkipSoap: options.allowPodogrevSkipSoap === true
              && asInt(options.podogrevSkipSoapDailyLimit, current.podogrevSkipSoapDailyLimit) > 0,
          }
        : {}),
    }));
  }

  async function reserveRubles(amount, purpose, runKey) {
    if (runKey === undefined) {
      runKey = await withContext(dependencies.sessionPath, async ({ client }) => {
        const response = await client.zaruba.state();
        if (!isSuccessfulResponse(response)) return null;
        return zarubaRunKey(normalizeZarubaState(response).active);
      });
    }
    if (!runKey) return { allowed: false, reason: "zaruba_state_unavailable" };
    const reservationId = randomUUID();
    // Commit before the POST: a timeout after payment must not allow another
    // request to reuse the same budget. The account's atomic store serializes it.
    let reservation;
    await zarubaStore.save((current) => {
      const enabled = purpose === "wheel" ? current.playWheel && current.wheelBuyTickets
        : purpose === "slots" ? current.playSlots && current.slotsBuyMatches
        : purpose === "katala" ? current.playKatala : purpose === "weapon" && current.queueBosses;
      if (!current.enabled || !enabled || !Number.isSafeInteger(amount) || amount <= 0) {
        reservation = { allowed: false, reason: "rubles_purchase_disabled" };
        return {};
      }
      const next = current.rublesCommitted + amount;
      if (current.rublesDailyLimit !== null && next > current.rublesDailyLimit) {
        reservation = { allowed: false, reason: "rubles_daily_budget_exceeded" };
        return {};
      }
      reservation = { allowed: true, committedRubles: amount };
      const run = current.rublesByRun[runKey] || { reserved: 0, spent: 0, since: new Date().toISOString(), pending: {} };
      return { rublesCommitted: next,
        rublesByRun: { ...current.rublesByRun, [runKey]: { ...run, reserved: run.reserved + amount,
          pending: { ...run.pending, [reservationId]: { amount, confirmed: 0 } } } },
        ...(purpose === "wheel" ? { wheelRublesCommitted: current.wheelRublesCommitted + amount } : {}) };
    });
    if (reservation.allowed) {
      // Confirmation is cumulative and idempotent; partial weapon batches can
      // succeed before a later request fails. Late replies belong to the old run.
      reservation.confirm = async (confirmedAmount = amount) => {
        if (!Number.isSafeInteger(confirmedAmount) || confirmedAmount < 0 || confirmedAmount > amount) return;
        await zarubaStore.save((current) => {
          const run = current.rublesByRun[runKey];
          const pendingEntry = run?.pending[reservationId];
          if (!pendingEntry || confirmedAmount <= pendingEntry.confirmed) return {};
          const pending = { ...run.pending };
          if (confirmedAmount === pendingEntry.amount) delete pending[reservationId];
          else pending[reservationId] = { ...pendingEntry, confirmed: confirmedAmount };
          return { rublesByRun: { ...current.rublesByRun, [runKey]: {
            ...run, spent: run.spent + confirmedAmount - pendingEntry.confirmed, pending,
          } } };
        });
      };
    }
    return reservation;
  }

  async function runZarubaAction(options = {}, sessionPath) {
    const action = String(options.action || "").trim();
    if (!ZARUBA_ACTIONS.has(action)) {
      throw new Error(`Недопустимое действие Зарубы: ${action || "не указано"}.`);
    }
    const dashboard = await getZarubaDashboard(sessionPath);
    if (options.expectedStateVersion && options.expectedStateVersion !== dashboard.stateVersion) {
      const error = new Error("Состояние Зарубы изменилось. Обновите экран перед действием.");
      error.code = "state_version_mismatch";
      throw error;
    }
    const mode = pickString(options.mode);
    const skipTask = action === "skip"
      ? dashboard.tasks.find((task) => String(task.taskId) === String(options.taskId)) : null;
    if (action === "skip" && (!skipTask || skipTask.completed || !dashboard.active
      || dashboard.active.finishedSuccess || dashboard.active.finishedFail)) {
      throw new Error("Задание уже завершено или недоступно для пропуска.");
    }
    const amount = action === "exchangeOre" ? null : asInt(options.amount, 0, 0, 1_000_000);
    const selectedMode = action === "start"
      ? dashboard.modes.find((entry) => String(entry.id) === String(mode))
      : null;
    const pendingCost = normalizeResourceCost(
      dashboard.pendingReward && dashboard.pendingReward.cost,
    );
    const expectedCost = action === "skip" ? { soap: skipTask.skipCostSoap }
      : ["claim", "openBag"].includes(action)
        ? pendingCost
        : {};
    const plan = {
      action,
      mode: action === "start" ? mode : null,
      amount: null,
      expectedCost,
      stateVersion: dashboard.stateVersion,
      ...(skipTask ? { taskId: skipTask.taskId } : {}),
    };
    if (action === "start" && !mode) throw new Error("Для запуска Зарубы выберите режим.");
    if (action === "start" && !selectedMode) {
      throw new Error("Выбранный режим Зарубы отсутствует в свежем ответе игры.");
    }
    if (action === "start" && !selectedMode.unlocked) {
      throw new Error(selectedMode.lockReason || "Выбранный режим Зарубы заблокирован.");
    }
    if (action === "start" && dashboard.active) {
      throw new Error("Заруба уже активна. Дождитесь её завершения или заберите награду.");
    }
    if (options.dryRun !== false) {
      return { dryRun: true, executed: false, plan, dashboard };
    }
    if (options.confirmed !== true) {
      throw new Error("Реальное действие Зарубы требует confirmed=true.");
    }
    if (action === "skip" && (!options.expectedStateVersion
      || Number(options.maxSoap) !== expectedCost.soap || expectedCost.soap <= 0)) {
      throw new Error("Подтвердите свежую цену пропуска за мыло.");
    }
    if (
      ["claim", "openBag"].includes(action)
      && Object.values(expectedCost).some((value) => value > 0)
    ) {
      throw new Error("Платная награда или мешок заблокированы: для этого действия нет отдельного подтверждённого лимита.");
    }

    return withContext(sessionPath, async ({ client }) => {
      const state = await zarubaStore.load();
      const dailyLimits = {};
      const mutation = await coordinator.run(`zaruba:${action}`, {
        expectedCost,
        dailyLimits,
      }, async () => {
        let response;
        if (action === "skip") {
          // Persist before the POST, including uncertain network outcomes. A
          // second click or a process restart must not charge the same task twice.
          await zarubaStore.save((current) => {
            if (current.skipAttempts[skipTask.taskId]) {
              throw new Error("Пропуск этого задания уже отправлен. Обновите состояние игры; повторное списание заблокировано.");
            }
            return { skipAttempts: { ...current.skipAttempts, [skipTask.taskId]: Date.now() } };
          });
          response = await client.zaruba.skip(skipTask.taskId);
          const rejected = unwrapResponse(response);
          if (rejected?.error === "not_enough_soap" || rejected?.reason === "not_enough_soap") {
            await zarubaStore.save((current) => {
              const skipAttempts = { ...current.skipAttempts };
              delete skipAttempts[skipTask.taskId];
              return { skipAttempts };
            });
            throw new Error("Недостаточно мыла для пропуска задания.");
          }
        }
        if (action === "start") {
          const numericMode = Number(mode);
          const gameMode = Number.isFinite(numericMode) ? numericMode : mode;
          response = await client.zaruba.start({ Mode: gameMode });
        }
        if (action === "claim") response = await client.zaruba.claim();
        if (action === "openBag") response = await client.zaruba.openBag();
        if (action === "exchangeOre") response = await client.zaruba.exchangeOre();
        if (!isSuccessfulMutationResponse(response)) {
          throw new Error(`Игровой сервер отклонил действие ${action} (HTTP ${response.status || "?"}).`);
        }
        return {
          response: sanitizeSensitive(unwrapResponse(response)),
          actualCost: expectedCost,
        };
      });
      await appendZarubaEvent({ ...await zarubaStore.load(), lastError: null }, action, { mode, amount, taskId: skipTask?.taskId, ok: true });
      return {
        dryRun: false,
        executed: true,
        action,
        result: mutation.result.response,
        dashboard: await getZarubaDashboard(sessionPath),
      };
    });
  }

  async function runZarubaAutomationTickOnce(options = {}, sessionPath) {
    let automation = await zarubaStore.load();
    const startedAt = new Date().toISOString();
    automation = await zarubaStore.save({ lastTickStartedAt: startedAt });
    if (!automation.enabled && options.force !== true && !automation.autoClaimFree) {
      return { skipped: true, reason: "disabled", automation };
    }
    try {
      const dashboard = await getZarubaDashboard(sessionPath);
      const tasks = (Array.isArray(dashboard.tasks) ? dashboard.tasks : [])
        .filter((task) => !task.completed);
      const completionClaimReady = isZarubaCompletionClaimReady(dashboard, dashboard.tasks);
      const claimReady = completionClaimReady || Boolean(!dashboard.active && dashboard.pendingReward);
      const automationWorkEnabled = automation.enabled || options.force === true;
      const queueReconciliation = options.dryRun === false && (automationWorkEnabled || claimReady)
        ? await reconcileZarubaQueues(tasks, { sessionPath })
        : null;
      let action = { type: "noop", reason: "nothing_to_do" };
      const levelReached = automation.maxLevel !== null && dashboard.progress.level >= automation.maxLevel;
      if (claimReady && automation.autoClaimFree && automation.claimRewards) {
        const free = isZarubaClaimCostVerifiedFree(dashboard, completionClaimReady);
        if (!free) {
          action = { type: "wait", reason: "claim_cost_unverified" };
        } else if (options.dryRun !== false) {
          action = { type: "claim", dryRun: true, completionConfirmed: completionClaimReady };
        } else {
          const claimResult = await runZarubaAction({
            action: "claim",
            dryRun: false,
            confirmed: true,
            expectedStateVersion: dashboard.stateVersion,
          }, sessionPath);
          let nextStart = null;
          const afterClaim = claimResult && claimResult.dashboard;
          if (
            automationWorkEnabled
            && automation.autoStart
            && automation.selectedMode
            && afterClaim
            && !afterClaim.active
            && !afterClaim.pendingReward
            && (automation.maxLevel === null || afterClaim.progress.level < automation.maxLevel)
          ) {
            await runZarubaAction({
              action: "start",
              mode: automation.selectedMode,
              dryRun: false,
              confirmed: true,
              expectedStateVersion: afterClaim.stateVersion,
            }, sessionPath);
            nextStart = {
              started: true,
              mode: automation.selectedMode,
            };
          }
          action = {
            type: "claim",
            dryRun: false,
            completionConfirmed: completionClaimReady,
            nextStart,
          };
        }
      } else if (!automationWorkEnabled) {
        automation = await zarubaStore.save({ lastTickFinishedAt: new Date().toISOString() });
        return { skipped: true, reason: "auto_claim_waiting", automation };
      } else if (claimReady) {
        action = { type: "wait", reason: "reward_claim_disabled" };
      } else if (levelReached && !dashboard.active) {
        action = { type: "wait", reason: "max_level_reached", maxLevel: automation.maxLevel };
      } else if (!dashboard.active && automation.autoStart && automation.selectedMode) {
        if (options.dryRun !== false) {
          action = { type: "start", mode: automation.selectedMode, dryRun: true };
        } else {
          await runZarubaAction({
            action: "start",
            mode: automation.selectedMode,
            dryRun: false,
            confirmed: true,
            expectedStateVersion: dashboard.stateVersion,
          }, sessionPath);
          action = { type: "start", mode: automation.selectedMode, dryRun: false };
        }
      } else if (dashboard.active && tasks.some((task) => (
        task.automationPolicy?.allowed !== false
        &&
        task.execution
        && task.execution.canAct === true
        && [
          "podogrev_free",
          "katala_cheap",
          "collect_profit_first",
          "wait_profit",
          "friend_send_stash",
          "friend_harknut",
          "friend_fight",
          "fartovy_spin",
          "wheel_spin",
        ].includes(task.execution.strategy)
      ))) {
        const task = tasks.find((entry) => (
          entry.automationPolicy?.allowed !== false
          &&
          entry.execution
          && entry.execution.canAct === true
          && [
            "podogrev_free",
            "katala_cheap",
            "collect_profit_first",
            "wait_profit",
            "friend_send_stash",
            "friend_harknut",
            "friend_fight",
            "fartovy_spin",
            "wheel_spin",
          ].includes(entry.execution.strategy)
        ));
        if (options.dryRun !== false) {
          action = {
            type: "planned_direct",
            task,
            strategy: task.execution.strategy,
            dryRun: true,
            queueReconciliation,
          };
        } else {
          let result;
          try {
            result = await executeZarubaDirectTask(task, {
              sessionPath,
              maxRubles: task.execution.maxRubles,
              stashRecipientId: automation.stashRecipientId,
              reserveWheelTicket: () => reserveRubles(10, "wheel", dashboard.runKey),
              reserveRubles: (amount, purpose) => reserveRubles(amount, purpose, dashboard.runKey),
              slotsBuyMatches: automation.slotsBuyMatches,
            });
          } catch (error) {
            await zarubaStore.save((current) => ({
              deferredTasks: { ...current.deferredTasks, [String(task.taskId)]: Date.now() + 60_000 },
            }));
            throw error;
          }
          if (result && (result.executed === false || result.ok === false)) {
            await zarubaStore.save((current) => ({
              deferredTasks: { ...current.deferredTasks, [String(task.taskId)]: Date.now() + 60_000 },
            }));
          }
          action = {
            type: "direct",
            task,
            strategy: task.execution.strategy,
            result,
            dryRun: false,
            queueReconciliation,
          };
        }
      } else if (dashboard.active && tasks.length > 0) {
        const queueCandidates = tasks
          .filter((task) => (
            task.automationPolicy?.allowed !== false
            && task.queueable
            && task.execution?.queueable !== false
          ))
          .map((task) => (
            task.kind === "master" && !task.targetId && automation.intellectMasterId
              ? { ...task, targetId: automation.intellectMasterId }
              : task
          ));
        const queueResults = [];
        const waiting = [];
        if (automation.enqueueTasks) {
          // Queues prepend Zaruba entries, so reverse iteration preserves the server order.
          for (const task of [...queueCandidates].reverse()) {
            if (!task.taskId) {
              waiting.push({ task, reason: "task_id_missing" });
              continue;
            }
            if (!task.targetId) {
              waiting.push({
                task,
                reason: task.kind === "master" ? "master_not_selected" : "target_id_missing",
              });
              continue;
            }
            if (automation.onlyWithoutProfit && task.rewardAvailable) {
              waiting.push({ task, reason: "profit_already_available" });
              continue;
            }
            if (options.dryRun !== false) {
              queueResults.push({
                task,
                queued: { queued: false, planned: true, dryRun: true },
              });
              continue;
            }
            const queued = await enqueueZarubaTask(task, {
              origin: "zaruba",
              priority: 100,
              bossRule: task.automationPolicy?.rule,
              reserveRubles: (amount, purpose) => reserveRubles(amount, purpose, dashboard.runKey),
              insertPosition: automation.bossInsertPosition,
              sessionPath,
            });
            if (queued && queued.queued) {
              automation = await zarubaStore.save((current) => ({
                processedTaskIds: [
                  ...current.processedTaskIds.filter((taskId) => String(taskId) !== String(task.taskId)),
                  String(task.taskId),
                ].slice(-500),
              }));
            } else {
              waiting.push({ task, reason: queued && queued.reason || "queue_wait" });
            }
            queueResults.push({ task, queued });
          }
        }
        const manualTasks = tasks.filter((task) => (
          task.automationPolicy?.allowed === false
          || !task.queueable
          || task.execution?.queueable === false
        ));
        if (queueResults.length > 0) {
          action = {
            type: options.dryRun !== false ? "planned" : "queued",
            count: queueResults.length,
            items: queueResults,
            waiting,
            manualTasks,
            dryRun: options.dryRun !== false,
            queueReconciliation,
          };
        } else if (queueCandidates.length > 0 && !automation.enqueueTasks) {
          action = {
            type: "wait",
            reason: "queue_integration_disabled",
            manualTasks,
            queueReconciliation,
          };
        } else if (waiting.length > 0 || manualTasks.length > 0) {
          action = {
            type: "wait",
            reason: waiting.some((entry) => entry.reason === "master_not_selected")
              ? "master_not_selected"
              : queueCandidates.length > 0
                ? "queue_tasks_already_processed"
                : "manual_tasks_only",
            waiting,
            manualTasks,
            queueReconciliation,
          };
        }
      } else if (dashboard.active) {
        action = { type: "wait", reason: "all_tasks_completed" };
      }
      const finishedAt = new Date().toISOString();
      automation = await appendZarubaEvent(automation, action.type, action);
      automation = await zarubaStore.save({
        lastTickFinishedAt: finishedAt,
        lastError: null,
      });
      return { skipped: false, action, automation };
    } catch (error) {
      const message = error.message || String(error);
      if (/состояние Зарубы \(HTTP 403\)/i.test(message)) {
        automation = await zarubaStore.save({
          lastTickFinishedAt: new Date().toISOString(),
          lastError: null,
        });
        return { skipped: true, reason: "zaruba_unavailable", automation };
      }
      automation = await appendZarubaEvent({
        ...automation,
        lastTickFinishedAt: new Date().toISOString(),
        lastError: message,
      }, "error", { type: "error", reason: message });
      return { skipped: false, ok: false, error: automation.lastError, automation };
    }
  }

  function runZarubaAutomationTick(options = {}, sessionPath) {
    const run = zarubaAutomationOperation
      .catch(() => undefined)
      .then(() => runZarubaAutomationTickOnce(options, sessionPath));
    zarubaAutomationOperation = run.then(() => undefined, () => undefined);
    return run;
  }

  async function buyBossWeapon(options = {}, sessionPath) {
    const weaponType = String(options.weaponType || "").trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(WEAPON_PRICES_RUBLES, weaponType)) {
      throw new Error("Оружие должно быть poison, gunshot или knife.");
    }
    const count = Number(options.count);
    if (!Number.isInteger(count) || count < 1 || count > 10_000) {
      throw new Error("Количество должно быть целым числом от 1 до 10 000.");
    }
    const unitPrice = WEAPON_PRICES_RUBLES[weaponType];
    const totalRubles = unitPrice * count;
    const expectedUnitPrice = Number(options.expectedUnitPrice);
    if (Number.isFinite(expectedUnitPrice) && expectedUnitPrice !== unitPrice) {
      throw new Error("Цена оружия изменилась относительно подтверждённой пользователем.");
    }
    const maxRubles = Number(options.maxRubles);
    if (Number.isFinite(maxRubles) && totalRubles > maxRubles) {
      throw new Error("Итоговая цена превышает maxRubles.");
    }
    return withContext(sessionPath, async ({ client }) => {
      const [weaponsResponse, playerResponse] = await Promise.all([
        client.bosses.weapons({ throttle: false, rateLimitRetries: 1 }),
        client.players.init({ throttle: false, rateLimitRetries: 1 }),
      ]);
      const weaponsPayload = assertSuccessfulReadResponse(weaponsResponse, "Не удалось проверить остаток оружия");
      const playerPayload = assertSuccessfulReadResponse(playerResponse, "Не удалось проверить баланс рублей");
      if (pickDeepNumber(weaponsPayload, [`${weaponType}Count`, weaponType]) === null) {
        throw createApiContractError("Не удалось проверить остаток выбранного оружия", weaponsResponse);
      }
      if (pickDeepNumber(playerPayload, ["rubles", "ruble", "money"]) === null) {
        throw createApiContractError("Не удалось проверить баланс рублей", playerResponse);
      }
      const before = {
        weapons: extractWeaponCounts(weaponsResponse),
        rubles: extractRubles(playerResponse),
      };
      const preview = {
        weaponType,
        count,
        unitPrice,
        totalRubles,
        before,
        afterRubles: before.rubles - totalRubles,
        affordable: before.rubles >= totalRubles,
      };
      if (options.dryRun !== false) {
        return { dryRun: true, purchased: false, preview };
      }
      if (!Number.isFinite(expectedUnitPrice)) {
        throw new Error("Реальная покупка требует expectedUnitPrice из свежего dry-run.");
      }
      if (!Number.isFinite(maxRubles)) {
        throw new Error("Реальная покупка требует максимальный бюджет maxRubles.");
      }
      if (options.confirmed !== true) throw new Error("Покупка требует confirmed=true.");
      if (!preview.affordable) throw new Error("Недостаточно рублей для покупки.");
      const mutation = await coordinator.run("boss:buy-weapon", {
        expectedCost: { rubles: totalRubles },
        dailyLimits: {},
      }, async () => {
        const response = await client.bosses.buyWeapon(
          { weaponType, count },
          { rateLimitRetries: 0 },
        );
        if (!isSuccessfulMutationResponse(response)) {
          throw new Error(`Покупка отклонена (HTTP ${response.status || "?"}).`);
        }
        try {
          const [afterWeaponsResponse, afterPlayerResponse] = await Promise.all([
            client.bosses.weapons({ throttle: false, rateLimitRetries: 1 }),
            client.players.init({ throttle: false, rateLimitRetries: 1 }),
          ]);
          const afterWeaponsPayload = assertSuccessfulReadResponse(
            afterWeaponsResponse,
            "Не удалось подтвердить новый остаток оружия",
          );
          const afterPlayerPayload = assertSuccessfulReadResponse(
            afterPlayerResponse,
            "Не удалось подтвердить новый баланс рублей",
          );
          if (pickDeepNumber(afterWeaponsPayload, [`${weaponType}Count`, weaponType]) === null) {
            throw createApiContractError(
              "Не удалось подтвердить новый остаток выбранного оружия",
              afterWeaponsResponse,
            );
          }
          if (pickDeepNumber(afterPlayerPayload, ["rubles", "ruble", "money"]) === null) {
            throw createApiContractError(
              "Не удалось подтвердить новый баланс рублей",
              afterPlayerResponse,
            );
          }
          const after = {
            weapons: extractWeaponCounts(afterWeaponsResponse),
            rubles: extractRubles(afterPlayerResponse),
          };
          const delta = {
            weapon: after.weapons[weaponType] - before.weapons[weaponType],
            rubles: after.rubles - before.rubles,
          };
          return {
            response,
            after,
            delta,
            actualCost: { rubles: Math.max(0, -delta.rubles) },
          };
        } catch (error) {
          return {
            response,
            after: null,
            delta: null,
            verificationError: error.message || String(error),
            actualCost: { rubles: totalRubles },
          };
        }
      });
      const purchase = mutation.result;
      if (
        purchase.verificationError
        || !purchase.delta
        || purchase.delta.weapon !== count
        || purchase.delta.rubles !== -totalRubles
      ) {
        return {
          dryRun: false,
          purchased: true,
          verified: false,
          warning: purchase.verificationError
            ? `Запрос на покупку принят игрой, но свежие остатки пока недоступны: ${purchase.verificationError}`
            : `Запрос на покупку принят игрой; повторная проверка пока показывает оружие ${purchase.delta.weapon}/${count}, рубли ${purchase.delta.rubles}/${-totalRubles}.`,
          preview,
          after: purchase.after,
          delta: purchase.delta,
          response: sanitizeSensitive(unwrapResponse(purchase.response)),
        };
      }
      return {
        dryRun: false,
        purchased: true,
        verified: true,
        preview,
        after: purchase.after,
        delta: purchase.delta,
        response: sanitizeSensitive(unwrapResponse(purchase.response)),
      };
    });
  }

  async function getBarygaShop(sessionPath) {
    return withContext(sessionPath, async ({ client }) => {
      const [all, slots, inventory] = await Promise.all([
        client.get("/api/stashgear/all"),
        client.get("/api/stashgear/slots"),
        client.get("/api/stashgear/inventory"),
      ]);
      return normalizeBarygaShop(all, slots, inventory);
    });
  }

  async function getGuildDashboard(sessionPath) {
    return withContext(sessionPath, async ({ client, selfUserId }) => (
      normalizeGuildDashboard(await client.guild.status(), selfUserId)
    ));
  }

  async function updateBaulAutomation(options = {}) {
    const current = await baulStore.load();
    if (options.expectedVersion !== undefined && Number(options.expectedVersion) !== current.version) {
      throw new Error("Настройки баула изменились в другой вкладке.");
    }
    return baulStore.save({
      ...current,
      ...options,
      allowSoap: options.allowSoap === true && asInt(options.soapDailyLimit, 0) > 0,
    });
  }

  async function runBaulAutomationTick(options = {}, sessionPath) {
    let state = await baulStore.load();
    if (!state.enabled && options.force !== true) return { skipped: true, reason: "disabled", automation: state };
    try {
      const dashboard = await getLootContainersDashboard({ rebuild: false }, sessionPath);
      const baul = dashboard.baul || {};
      const hasWearable = Boolean(baul.pending && (baul.pending.hasTattoo || baul.pending.hasClothing));
      let action = { type: "wait", reason: "threshold_not_reached" };
      if (!baul.active) action = { type: "wait", reason: "baul_not_active" };
      else if (Number(baul.level || 0) < state.minLevel) action = { type: "wait", reason: "min_level" };
      else if (state.requireWearable && !hasWearable) action = { type: "wait", reason: "wearable_not_present" };
      else if (!state.allowSoap) action = { type: "wait", reason: "soap_disabled" };
      else if (state.soapSpentToday + Number(baul.cost?.amount || 20) > state.soapDailyLimit) {
        action = { type: "wait", reason: "soap_daily_limit" };
      } else if (options.dryRun !== false) {
        action = { type: "open", dryRun: true, cost: baul.cost };
      } else {
        const result = await coordinator.run("baul:open", {
          expectedCost: { soap: Number(baul.cost?.amount || 20) },
          dailyLimits: { soap: state.soapDailyLimit },
        }, async () => ({
          response: await openLootContainer({
            kind: "baul",
            dryRun: false,
            confirmed: true,
            allowBelowMax: Number(baul.level || 0) < Number(baul.maxLevel || 25),
          }, sessionPath),
          actualCost: { soap: Number(baul.cost?.amount || 20) },
        }));
        state = await baulStore.save({
          ...state,
          soapSpentToday: state.soapSpentToday + Number(baul.cost?.amount || 20),
        });
        action = { type: "open", dryRun: false, result: sanitizeSensitive(result.result.response) };
      }
      state = await baulStore.save({ ...state, lastAction: { at: new Date().toISOString(), ...action }, lastError: null });
      return { skipped: false, action, automation: state };
    } catch (error) {
      state = await baulStore.save({ ...state, enabled: false, lastError: error.message || String(error) });
      return { skipped: false, ok: false, error: state.lastError, automation: state };
    }
  }

  async function updateFriendsAutomation(options = {}) {
    const current = await friendsStore.load();
    if (options.expectedVersion !== undefined && Number(options.expectedVersion) !== current.version) {
      throw new Error("Настройки фоновых друзей изменились в другой вкладке.");
    }
    return friendsStore.save({ ...current, ...options });
  }

  async function runFriendsAutomationTick(options = {}, sessionPath) {
    let state = await friendsStore.load();
    if (!state.enabled && options.force !== true) return { skipped: true, reason: "disabled", automation: state };
    const dryRun = options.dryRun !== false;
    const actions = [];
    try {
      if (state.autoAccept) {
        const accepted = await acceptFriendRequests({ max: state.pendingLimit, dryRun, delayMs: 300 }, sessionPath);
        actions.push({ type: "accept", selected: accepted.selectedTotal, ok: accepted.okCount });
      }
      if (state.autoInvite) {
        const availableHourly = Math.max(0, state.hourlyLimit - state.invitedThisHour);
        const availableDaily = Math.max(0, state.dailyLimit - state.invitedToday);
        const max = Math.min(availableHourly, availableDaily);
        if (max > 0) {
          const invited = await inviteCollected({
            sources: state.sources,
            max,
            dryRun,
            delayMs: 500,
            excludeIds: state.processedIds,
          }, sessionPath);
          const processed = (invited.targets || []).map((target) => String(target.userId)).filter(Boolean);
          const count = dryRun ? 0 : Number(invited.okCount || 0);
          state = await friendsStore.save({
            ...state,
            invitedThisHour: state.invitedThisHour + count,
            invitedToday: state.invitedToday + count,
            processedIds: [...new Set([...state.processedIds, ...processed])].slice(-5000),
          });
          actions.push({ type: "invite", selected: invited.selectedTotal, ok: invited.okCount, dryRun });
        } else {
          actions.push({ type: "invite", selected: 0, reason: "limit_reached" });
        }
      }
      const event = { at: new Date().toISOString(), actions, dryRun };
      state = await friendsStore.save({
        ...state,
        history: [...state.history, event].slice(-200),
        lastAction: event,
        lastError: null,
      });
      return { skipped: false, actions, automation: state };
    } catch (error) {
      state = await friendsStore.save({ ...state, enabled: false, lastError: error.message || String(error) });
      return { skipped: false, ok: false, error: state.lastError, automation: state };
    }
  }

  return {
    buyBossWeapon,
    getBagsDashboard,
    getBarygaShop,
    getBaulAutomation: () => baulStore.load(),
    getFriendsAutomation: () => friendsStore.load(),
    getGuildDashboard,
    getMutationBudget: () => coordinator.getLedger(),
    getZarubaAutomation: () => zarubaStore.load(),
    getZarubaDashboard,
    runBaulAutomationTick,
    runBagsAction,
    runFriendsAutomationTick,
    runZarubaAction,
    reserveRubles,
    runZarubaAutomationTick,
    updateBaulAutomation,
    updateFriendsAutomation,
    updateZarubaAutomation,
  };
}

module.exports = {
  BAG_ORE_PER_SIGNET,
  WEAPON_PRICES_RUBLES,
  ZARUBA_ACTIONS,
  ZARUBA_TASK_DEFINITIONS,
  buildZarubaTaskCatalogView,
  buildZarubaTaskKnowledge,
  buildZarubaTaskExecutionPlans,
  classifyZarubaTask,
  createProPrisonFeatureService,
  isZarubaClaimCostVerifiedFree,
  isZarubaCompletionClaimReady,
  normalizeBarygaShop,
  normalizeBagsDashboard,
  normalizeFriendsAutomation,
  normalizeGuildDashboard,
  normalizeZarubaAutomation,
  normalizeZarubaState,
  zarubaRunKey,
  normalizeZarubaTaskCatalog,
  normalizeZarubaTasks,
  normalizeZarubaWeaponStats,
  selectZarubaDamageWeapon,
  stableVersion,
};
