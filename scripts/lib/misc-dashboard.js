const { normalizeMonthlyPolicy, applyMonthlyTargets, monthlyTaskEnabled } = require("./quest-policy");

const MONTHLY_ACTION_RULES = Object.freeze({
  SpitSoup: {
    cost: "free",
    automatic: true,
    interactionType: "Harknut",
    label: "Бесплатно",
    note: "Выполняется по игрокам с самым низким авторитетом.",
  },
  AddYeast: {
    cost: "free",
    automatic: true,
    interactionType: "TossDroj",
    label: "Бесплатно",
    note: "Выполняется по игрокам с самым низким авторитетом.",
  },
  BicepsTrain: {
    cost: "free",
    automatic: true,
    interactionType: "UpgradeBiceps",
    label: "Бесплатно",
    note: "Автоматика перебирает доступных игроков.",
  },
  UseHomieHeat: {
    cost: "free",
    automatic: true,
    label: "Бесплатно",
    note: "Используется только доступный ежедневный подогрев.",
  },
  PrisonRun: {
    cost: "energy",
    automatic: true,
    label: "Только энергия",
    note: "Выполняется в указанной тюрьме без покупки энергии.",
  },
  PrisonEarnAuthority: {
    cost: "energy",
    automatic: true,
    label: "Только энергия",
    note: "Проходится по одному бесплатному шагу, пока хватает энергии.",
  },
  MasterSession: {
    cost: "energy",
    automatic: true,
    label: "Только энергия",
    note: "Выполняется у указанного открытого мастера.",
  },
  MasterEarnIntellect: {
    cost: "energy",
    automatic: true,
    label: "Только энергия",
    note: "Проходится у доступного мастера без покупок валюты.",
  },
  SendStashToPlayer: {
    cost: "duplicate",
    automatic: true,
    label: "Лишняя нычка",
    note: "Отправляется только дубликат; последняя нычка каждого вида сохраняется.",
  },
  StressVictim: {
    cost: "cheap_currency",
    automatic: true,
    interactionType: "Fight",
    label: "Дёшево",
    note: "100 папирос за нападение; автоматика выполняет по доступным игрокам.",
  },
  KillBoss: {
    cost: "flow",
    automatic: true,
    label: "Обычно дёшево",
    note: "При наличии ключа засчитывается обычной очередью BOSSES; отдельный параллельный бой не запускается.",
  },
  UseChefirDrink: {
    cost: "currency",
    automatic: false,
    label: "Расходует чифир",
    note: "Автоматически не тратится.",
  },
  ScamGambler: {
    cost: "cheap_currency",
    automatic: true,
    label: "Дёшево",
    note: "Одна партия у Каталы стоит не больше 1 рубля; выполняется автоматически.",
  },
});

function addAmounts(target, source, multiplier = 1) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (Number(target[key]) || 0) + (Number(value) || 0) * multiplier;
  }
  return target;
}

function getGamePayload(response) {
  return response && Object.prototype.hasOwnProperty.call(response, "data") ? response.data : response;
}

function normalizePlayerResourceSnapshot(response) {
  const payload = getGamePayload(response) || {};
  const player = payload && payload.data && typeof payload.data === "object"
    ? payload.data
    : payload;
  const rawCurrencies = player && player.currencies;
  const currencies = {};

  if (Array.isArray(rawCurrencies)) {
    for (const item of rawCurrencies) {
      const key = item && String(item.type || item.key || "").trim();
      if (!key) {
        continue;
      }
      currencies[key] = Number(item.amount ?? item.value ?? 0) || 0;
    }
  } else if (rawCurrencies && typeof rawCurrencies === "object") {
    for (const [key, value] of Object.entries(rawCurrencies)) {
      currencies[key] = Number(value) || 0;
    }
  }

  const hasAuthority = Boolean(player && Object.prototype.hasOwnProperty.call(player, "authority"));
  return {
    available: hasAuthority || rawCurrencies !== undefined,
    authority: Number(player && player.authority) || 0,
    currencies,
  };
}

function calculatePlayerResourceDelta(before, after) {
  if (!before || !after || !before.available || !after.available) {
    return null;
  }

  const currencies = {};
  const keys = new Set([
    ...Object.keys(before.currencies || {}),
    ...Object.keys(after.currencies || {}),
  ]);
  for (const key of keys) {
    const delta = (Number(after.currencies && after.currencies[key]) || 0)
      - (Number(before.currencies && before.currencies[key]) || 0);
    if (delta !== 0) {
      currencies[key] = delta;
    }
  }

  return {
    authority: (Number(after.authority) || 0) - (Number(before.authority) || 0),
    currencies,
  };
}

function normalizeStashDashboard(response) {
  const payload = getGamePayload(response) || {};
  const progress = payload.playerProgress && payload.playerProgress.data
    ? payload.playerProgress.data
    : {};
  const zones = [];
  const totals = {
    readyCollections: 0,
    totalCollections: 0,
    sellableCycles: 0,
    itemsInInventory: 0,
    rewards: {},
  };

  for (const zone of Array.isArray(payload.collections) ? payload.collections : []) {
    const prisonId = Number(zone && zone.prisonid) || 0;
    const sets = [];
    for (const collection of Array.isArray(zone && zone.collections) ? zone.collections : []) {
      const collectionId = Number(collection && collection.id) || 0;
      const itemCounts = progress[String(prisonId)]?.[String(collectionId)]?.items || {};
      const counts = (collection.items || []).map((item) => Number(itemCounts[String(item.id)] || 0));
      const completeCopies = counts.length > 0 ? Math.min(...counts) : 0;
      const sellableCycles = completeCopies;
      const inventoryCount = counts.reduce((sum, value) => sum + value, 0);
      const rewardsPerCycle = collection.rewards && typeof collection.rewards === "object"
        ? collection.rewards
        : {};
      const totalRewards = addAmounts({}, rewardsPerCycle, sellableCycles);
      totals.totalCollections += 1;
      totals.itemsInInventory += inventoryCount;
      totals.sellableCycles += sellableCycles;
      if (sellableCycles > 0) {
        totals.readyCollections += 1;
      }
      addAmounts(totals.rewards, totalRewards);
      sets.push({
        prisonId,
        collectionId,
        name: collection.name || `Нычки #${collectionId}`,
        imageUrl: collection.mainimage || null,
        itemCounts,
        itemTotal: (collection.items || []).length,
        inventoryCount,
        completeCopies,
        sellableCycles,
        rewardsPerCycle,
        totalRewards,
      });
    }
    zones.push({
      prisonId,
      name: zone.prison || `Зона #${prisonId}`,
      sets,
      readyCollections: sets.filter((item) => item.sellableCycles > 0).length,
      sellableCycles: sets.reduce((sum, item) => sum + item.sellableCycles, 0),
    });
  }

  return { totals, zones };
}

function classifyMonthlyDay(day) {
  const action = day && day.action ? String(day.action) : "Unknown";
  const rule = MONTHLY_ACTION_RULES[action] || {
    cost: "unknown",
    automatic: false,
    label: "Нужна проверка",
    note: "Неизвестное действие не запускается автоматически.",
  };
  return { ...rule, action };
}

function toNonNegativeInteger(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function normalizeEnergyCheckpoints(checkpoints) {
  return (Array.isArray(checkpoints) ? checkpoints : []).map((checkpoint) => ({
    clicksRequired: Math.max(1, toNonNegativeInteger(checkpoint && checkpoint.clicksRequired, 1)),
    energyCost: toNonNegativeInteger(checkpoint && checkpoint.energyCost),
    rewardAuthority: toNonNegativeInteger(checkpoint && checkpoint.rewardAuthority),
  }));
}

function normalizeEnergyCheckpointState(source = {}) {
  const progress = source.progress && typeof source.progress === "object" ? source.progress : source;
  return {
    currentCheckpointIndex: toNonNegativeInteger(
      source.currentCheckpointIndex ?? source.currentCheckpoint ?? progress.currentCheckpointIndex ?? progress.currentCheckpoint,
    ),
    clicksInCheckpoint: toNonNegativeInteger(source.clicksInCheckpoint ?? progress.clicksInCheckpoint),
  };
}

function createCheckpointWorkSimulator(checkpoints, source = {}) {
  const normalizedCheckpoints = normalizeEnergyCheckpoints(checkpoints);
  const state = normalizeEnergyCheckpointState(source);
  let checkpointIndex = normalizedCheckpoints.length > 0
    ? state.currentCheckpointIndex % normalizedCheckpoints.length
    : 0;
  let clicksInCheckpoint = state.clicksInCheckpoint;

  return {
    next() {
      if (normalizedCheckpoints.length === 0) {
        return null;
      }

      let checkpoint = normalizedCheckpoints[checkpointIndex];
      while (clicksInCheckpoint >= checkpoint.clicksRequired) {
        checkpointIndex = (checkpointIndex + 1) % normalizedCheckpoints.length;
        clicksInCheckpoint = 0;
        checkpoint = normalizedCheckpoints[checkpointIndex];
      }

      clicksInCheckpoint += 1;
      const checkpointCompleted = clicksInCheckpoint >= checkpoint.clicksRequired;
      if (checkpointCompleted) {
        checkpointIndex = (checkpointIndex + 1) % normalizedCheckpoints.length;
        clicksInCheckpoint = 0;
      }

      return {
        energy: checkpoint.energyCost,
        authority: checkpoint.rewardAuthority,
        checkpointCompleted,
        runCompleted: checkpointCompleted && checkpointIndex === 0,
      };
    },
  };
}

function summarizeCheckpointWork(simulator, stopWhen) {
  const summary = {
    energy: 0,
    authority: 0,
    steps: 0,
    runs: 0,
  };
  const maxSteps = 100_000;

  while (!stopWhen(summary) && summary.steps < maxSteps) {
    const step = simulator.next();
    if (!step) {
      return null;
    }
    summary.energy += step.energy;
    summary.authority += step.authority;
    summary.steps += 1;
    if (step.runCompleted) {
      summary.runs += 1;
    }
  }

  return summary.steps < maxSteps ? summary : null;
}

function calculateChefirRestores(requiredEnergy, energy = 0, maxEnergy = 0) {
  const required = toNonNegativeInteger(requiredEnergy);
  const available = toNonNegativeInteger(energy);
  const capacity = toNonNegativeInteger(maxEnergy);
  const deficit = Math.max(0, required - available);

  return {
    requiredEnergy: required,
    availableEnergy: available,
    maxEnergy: capacity,
    energyDeficit: deficit,
    chefirRestores: deficit === 0 ? 0 : capacity > 0 ? Math.ceil(deficit / capacity) : null,
    naturalRecoveryMinutes: deficit * 2,
  };
}

function inferMasterIntellectPerRun(training) {
  const level = toNonNegativeInteger(training && training.progress && training.progress.level);
  const intellect = toNonNegativeInteger(training && training.progress && training.progress.intellect);
  if (level <= 0 || intellect <= 0) {
    return null;
  }

  return Math.floor(intellect / level) || null;
}

function estimateMasterSessionEnergy(training, count) {
  if (!training || training.available === false || training.canStartTraining === false) {
    return null;
  }
  const simulator = createCheckpointWorkSimulator(training.checkpoints, training);
  const runsNeeded = toNonNegativeInteger(count);
  const work = summarizeCheckpointWork(simulator, (summary) => summary.runs >= runsNeeded);
  return work && work.runs >= runsNeeded ? { ...work, runsNeeded } : null;
}

function estimateMasterIntellectEnergy(training, targetIntellect) {
  if (!training || training.available === false || training.canStartTraining === false) {
    return null;
  }
  const intellectPerRun = inferMasterIntellectPerRun(training);
  const target = toNonNegativeInteger(targetIntellect);
  if (!intellectPerRun || target <= 0) {
    return null;
  }

  const runsNeeded = Math.ceil(target / intellectPerRun);
  const simulator = createCheckpointWorkSimulator(training.checkpoints, training);
  const work = summarizeCheckpointWork(simulator, (summary) => summary.runs >= runsNeeded);
  return work ? {
    ...work,
    intellectPerRun,
    intellectPlanned: runsNeeded * intellectPerRun,
    runsNeeded,
  } : null;
}

function estimatePrisonRunEnergy(prison, count) {
  if (!prison || !prison.day || !prison.checkpoints) {
    return null;
  }
  const simulator = createCheckpointWorkSimulator(prison.checkpoints.day, prison.day);
  const runsNeeded = toNonNegativeInteger(count);
  const work = summarizeCheckpointWork(simulator, (summary) => summary.runs >= runsNeeded);
  return work && work.runs >= runsNeeded ? { ...work, runsNeeded } : null;
}

function estimatePrisonAuthorityEnergy(prison, targetAuthority) {
  if (!prison || !prison.day || !prison.checkpoints) {
    return null;
  }
  const target = toNonNegativeInteger(targetAuthority);
  if (target <= 0) {
    return null;
  }
  const simulator = createCheckpointWorkSimulator(prison.checkpoints.day, prison.day);
  const work = summarizeCheckpointWork(simulator, (summary) => summary.authority >= target);
  return work && work.authority >= target ? work : null;
}

function russianPlural(value, one, few, many) {
  const amount = Math.abs(toNonNegativeInteger(value));
  const remainder100 = amount % 100;
  const remainder10 = amount % 10;
  if (remainder100 >= 11 && remainder100 <= 14) {
    return many;
  }
  if (remainder10 === 1) {
    return one;
  }
  if (remainder10 >= 2 && remainder10 <= 4) {
    return few;
  }
  return many;
}

function buildEnergyEvaluation(work, analysis = {}, options = {}) {
  if (!work) {
    return null;
  }
  const energy = calculateChefirRestores(work.energy, analysis.energy, analysis.maxEnergy);
  const suppliedFreeBudget = Number(options.freeEnergyBudget);
  const hasFreeBudget = Number.isFinite(suppliedFreeBudget) && suppliedFreeBudget >= 0;
  const freeEnergyBudget = hasFreeBudget
    ? Math.max(energy.availableEnergy, toNonNegativeInteger(suppliedFreeBudget))
    : energy.availableEnergy;
  const freeEnergyEnough = freeEnergyBudget >= energy.requiredEnergy;
  const paidEnergyDeficit = Math.max(0, energy.requiredEnergy - freeEnergyBudget);
  const restores = paidEnergyDeficit === 0
    ? 0
    : energy.maxEnergy > 0
      ? Math.ceil(paidEnergyDeficit / energy.maxEnergy)
      : null;
  const restoreText = restores === null
    ? "нужна ёмкость энергии"
    : energy.energyDeficit === 0
      ? "хватит текущей энергии"
      : freeEnergyEnough
        ? "хватит бесплатного восстановления"
      : `${restores} ${russianPlural(restores, "восстановление", "восстановления", "восстановлений")} чифиром`;
  const detail = options.detail ? `${options.detail}. ` : "";
  const currentEnergy = energy.maxEnergy > 0
    ? `${energy.availableEnergy}/${energy.maxEnergy}`
    : String(energy.availableEnergy);
  const availabilityNote = energy.energyDeficit === 0
    ? `Сейчас ${currentEnergy} энергии — этого достаточно.`
    : freeEnergyEnough
      ? `Сейчас ${currentEnergy} энергии; с бесплатным восстановлением доступно ${freeEnergyBudget}, этого достаточно.`
      : `Сейчас ${currentEnergy} энергии; после бесплатного восстановления нужно: ${restoreText}.`;

  return {
    tone: freeEnergyEnough ? "cheap" : "expensive",
    label: `${energy.requiredEnergy} энергии · ${restoreText}`,
    note: `${detail}${availabilityNote}`,
    ...energy,
    chefirRestores: restores,
    freeEnergyBudget,
    paidEnergyDeficit,
    requiredEnergyMin: energy.requiredEnergy,
    requiredEnergyMax: energy.requiredEnergy,
    freeEnergyEnough,
    ...options.fields,
  };
}

function getMonthlyPrisonProfitPlan(day, business = null) {
  if (!day || day.action !== "PrisonEarnAuthority" || !business) {
    return null;
  }
  const remaining = Math.max(0, Number(day.target || 0) - Number(day.progress || 0));
  const prisonId = Number(day.context && day.context.prisonId) || null;
  const prisonRewards = prisonId
    && business.expectedRewardsByPrison
    && business.expectedRewardsByPrison[String(prisonId)];
  const profitRespect = Number(prisonId
    ? prisonRewards && prisonRewards.respect
    : business.expectedRewards && business.expectedRewards.respect) || 0;
  if (remaining <= 0 || profitRespect < remaining) {
    return null;
  }
  return {
    prisonId,
    remaining,
    profitRespect,
    canCollect: Boolean(business.canCollect),
    collectAvailableAt: business.collectAvailableAt || null,
  };
}

function buildMonthlyEvaluation(day, analysis = {}) {
  const remaining = Math.max(0, Number(day.target || 0) - Number(day.progress || 0));
  if (day.completed) {
    return { tone: "complete", label: "Выполнено", note: "Задание уже закрыто." };
  }
  if (day.action === "StressVictim") {
    const amount = remaining * 100;
    return { tone: "cheap", label: `Дёшево · ${amount} папирос`, note: `Осталось ${remaining} нападений по 100 папирос.` };
  }
  if (day.action === "ScamGambler") {
    return { tone: "cheap", label: `Дёшево · до ${remaining} рублей`, note: "Бесплатная попытка уменьшит фактическую цену." };
  }
  if (day.action === "KillBoss") {
    return { tone: "cheap", label: "Обычно дёшево", note: "Ключ и обычный бой из очереди BOSSES; отдельная дорогая логика не запускается." };
  }
  if (day.action === "MasterSession") {
    const masterId = Number(day.context && day.context.masterId) || 1;
    const training = analysis.masters && analysis.masters[String(masterId)];
    const work = estimateMasterSessionEnergy(training, remaining);
    const masterName = training && training.name ? training.name : `мастер #${masterId}`;
    const evaluation = buildEnergyEvaluation(work, analysis, {
      freeEnergyBudget: day.isToday ? analysis.todayFreeEnergy : analysis.fullDayFreeEnergy,
      detail: `Осталось ${remaining} ${russianPlural(remaining, "полный цикл", "полных цикла", "полных циклов")} у ${masterName}`,
      fields: { masterId, workSteps: work && work.steps, masterRuns: work && work.runsNeeded },
    });
    if (evaluation) {
      return evaluation;
    }
  }
  if (day.action === "MasterEarnIntellect") {
    const masterId = Number(day.context?.masterId) || Number(analysis.defaultMasterId) || 1;
    const training = analysis.masters && analysis.masters[String(masterId)];
    const work = estimateMasterIntellectEnergy(training, remaining);
    const masterName = training && training.name ? training.name : `мастер #${masterId}`;
    const evaluation = buildEnergyEvaluation(work, analysis, {
      freeEnergyBudget: day.isToday ? analysis.todayFreeEnergy : analysis.fullDayFreeEnergy,
      detail: work
        ? `Автоматика идёт через ${masterName}: ${work.runsNeeded} ${russianPlural(work.runsNeeded, "полный цикл", "полных цикла", "полных циклов")} по ${work.intellectPerRun} интеллекта`
        : "Не удалось определить награду полного цикла мастера",
      fields: work ? {
        masterId,
        workSteps: work.steps,
        masterRuns: work.runsNeeded,
        intellectPerRun: work.intellectPerRun,
        intellectPlanned: work.intellectPlanned,
      } : {},
    });
    if (evaluation) {
      return evaluation;
    }
  }
  if (day.action === "PrisonEarnAuthority") {
    const prisonId = Number(day.context && day.context.prisonId) || Number(day.authorityPrisonId) || Number(analysis.defaultAuthorityPrisonId) || 1;
    const profitPlan = getMonthlyPrisonProfitPlan(day, analysis.business);
    if (profitPlan) {
      return {
        tone: "cheap",
        label: profitPlan.canCollect
          ? `Бесплатно · собрать прибыль (+${profitPlan.profitRespect})`
          : `Бесплатно · прибыль +${profitPlan.profitRespect}`,
        note: profitPlan.canCollect
          ? `Готовый сбор прибыли даст ${profitPlan.profitRespect} уважения зеков и закроет оставшиеся ${profitPlan.remaining}.`
          : `Следующий бесплатный сбор прибыли даст ${profitPlan.profitRespect} уважения зеков и закроет оставшиеся ${profitPlan.remaining}.`,
        prisonId: profitPlan.prisonId,
        profitRespect: profitPlan.profitRespect,
        profitAvailable: profitPlan.canCollect,
        collectAvailableAt: profitPlan.collectAvailableAt,
        requiredEnergyMin: 0,
        requiredEnergyMax: 0,
        freeEnergyEnough: true,
      };
    }
    const prison = analysis.prisons && analysis.prisons[String(prisonId)];
    const work = estimatePrisonAuthorityEnergy(prison, remaining);
    const prisonName = prison && prison.name ? prison.name : `тюрьма #${prisonId}`;
    const evaluation = buildEnergyEvaluation(work, analysis, {
      freeEnergyBudget: day.isToday ? analysis.todayFreeEnergy : analysis.fullDayFreeEnergy,
      detail: work
        ? `Осталось ${remaining} уважения зеков в ${prisonName}; расчёт по каждому рабочему шагу`
        : "Не удалось определить награду тюремных шагов",
      fields: work ? { prisonId, workSteps: work.steps, authorityPlanned: work.authority } : {},
    });
    if (evaluation) {
      return evaluation;
    }
  }
  if (day.action === "PrisonRun") {
    const prisonId = Number(day.context && day.context.prisonId) || 1;
    const prison = analysis.prisons && analysis.prisons[String(prisonId)];
    const exactWork = estimatePrisonRunEnergy(prison, remaining);
    const prisonName = prison && prison.name ? prison.name : `тюрьма #${prisonId}`;
    const exactEvaluation = buildEnergyEvaluation(exactWork, analysis, {
      freeEnergyBudget: day.isToday ? analysis.todayFreeEnergy : analysis.fullDayFreeEnergy,
      detail: `Осталось ${remaining} ${russianPlural(remaining, "полная ходка", "полных ходки", "полных ходок")} в ${prisonName}`,
      fields: exactWork ? { prisonId, workSteps: exactWork.steps, prisonRuns: exactWork.runsNeeded } : {},
    });
    if (exactEvaluation) {
      return exactEvaluation;
    }
    const cost = analysis.prisonCosts && analysis.prisonCosts[String(prisonId)];
    if (cost) {
      const min = remaining * Number(cost.min || 0);
      const max = remaining * Number(cost.max || 0);
      const budget = day.isToday ? Number(analysis.todayFreeEnergy || 0) : Number(analysis.fullDayFreeEnergy || 0);
      const enough = budget >= max;
      return {
        tone: enough ? "cheap" : "expensive",
        label: `${min === max ? min : `${min}–${max}`} энергии · ${enough ? "хватит бесплатно" : "может не хватить"}`,
        note: `Осталось ${remaining} ходок; бесплатный запас на день около ${budget} энергии.`,
        requiredEnergyMin: min,
        requiredEnergyMax: max,
        freeEnergyBudget: budget,
        freeEnergyEnough: enough,
      };
    }
  }
  return {
    tone: day.automatic ? "cheap" : day.cost === "currency" ? "expensive" : "flow",
    label: day.label,
    note: day.note,
  };
}

function normalizeMonthlyDashboard(response, automation = null, analysis = {}) {
  const payload = getGamePayload(response) || {};
  const global = payload.global || {};
  const user = payload.user || {};
  const userDays = user.days || {};
  const rawDays = (Array.isArray(global.days) ? global.days : []).map((day) => {
    const status = userDays[String(day.dayId)] || userDays[day.dayId] || {};
    return {
      ...day,
      ...classifyMonthlyDay(day),
      progress: Number(status.progress || 0),
      completed: Boolean(status.completed),
      expired: Boolean(status.expired),
      isToday: Number(day.dayId) === Number(user.activeDayId),
    };
  });
  const policy = normalizeMonthlyPolicy(automation || {});
  const days = rawDays.map((rawDay) => {
    const day = applyMonthlyTargets(rawDay, policy);
    const enabled = monthlyTaskEnabled(day.action, policy);
    return { ...day, evaluation: !day.completed && !enabled
      ? { tone: "flow", label: "Отключено в настройках", note: "Выполнение этой категории Делюг отключено." }
      : buildMonthlyEvaluation(day, { ...analysis, defaultMasterId: policy.intellectMasterId, defaultAuthorityPrisonId: policy.authorityPrisonId }) };
  });

  return {
    active: Boolean(payload.active),
    year: global.year ?? null,
    month: global.month ?? null,
    daysInMonth: global.daysInMonth ?? days.length,
    completedCount: Number(user.completedCount || 0),
    activeDayId: Number(user.activeDayId || 0),
    today: days.find((day) => day.isToday) || null,
    days,
    tierRewards: global.tierRewards || {},
    claimableTiers: Array.isArray(user.claimableTiers) ? user.claimableTiers : [],
    claimedTiers: Array.isArray(user.claimedTiers) ? user.claimedTiers : [],
    buyPriceSoapByDay: payload.buyPriceSoapByDay || {},
    automation,
  };
}

function normalizeMiscAutomationState(value = {}) {
  return {
    enabled: value.enabled === undefined ? true : Boolean(value.enabled),
    ...normalizeMonthlyPolicy(value),
    intervalSec: Math.max(30, Number(value.intervalSec) || 60),
    lastCheckAt: value.lastCheckAt || null,
    lastAction: value.lastAction || null,
    lastError: value.lastError || null,
    updatedAt: value.updatedAt || null,
  };
}

module.exports = {
  MONTHLY_ACTION_RULES,
  addAmounts,
  buildMonthlyEvaluation,
  calculateChefirRestores,
  calculatePlayerResourceDelta,
  classifyMonthlyDay,
  createCheckpointWorkSimulator,
  estimateMasterIntellectEnergy,
  estimateMasterSessionEnergy,
  estimatePrisonAuthorityEnergy,
  estimatePrisonRunEnergy,
  getMonthlyPrisonProfitPlan,
  inferMasterIntellectPerRun,
  normalizeMiscAutomationState,
  normalizeMonthlyDashboard,
  normalizePlayerResourceSnapshot,
  normalizeStashDashboard,
};
