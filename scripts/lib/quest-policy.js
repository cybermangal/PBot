// Additive settings: absent fields keep the established quest workflow.
function flag(value, fallback = true) {
  return value === undefined ? fallback : value === true;
}

function optionalLimit(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}

function recipientId(value) {
  const id = String(value ?? "").trim();
  return /^[1-9]\d{0,19}$/.test(id) ? id : null;
}

function normalizeBossRules(value) {
  return (Array.isArray(value) ? value : []).slice(0, 50)
    .filter((rule) => rule && typeof rule === "object")
    .map((rule) => ({
      bossId: optionalLimit(rule.bossId) || 0,
      objective: ["kill", "damage"].includes(rule.objective) ? rule.objective : "any",
      mode: ["pacansky", "blotnoy", "avtoritetny", "vorovskoy", "odin"].includes(rule.mode) ? rule.mode : null,
      maxWeaponValue: optionalLimit(rule.maxWeaponValue),
    }));
}

function normalizeZarubaPolicy(value = {}) {
  return {
    claimRewards: flag(value.claimRewards),
    directTasks: flag(value.directTasks),
    queuePrisons: flag(value.queuePrisons),
    queueMasters: flag(value.queueMasters),
    queueBosses: flag(value.queueBosses, false),
    playKatala: flag(value.playKatala),
    playSlots: flag(value.playSlots),
    slotsBuyMatches: flag(value.slotsBuyMatches, false),
    playWheel: flag(value.playWheel),
    // Existing installations already buy tickets. Make that choice explicit,
    // without silently changing a running automation during an upgrade.
    wheelBuyTickets: flag(value.wheelBuyTickets),
    wheelRublesDailyLimit: optionalLimit(value.wheelRublesDailyLimit),
    rublesDailyLimit: optionalLimit(value.rublesDailyLimit === undefined ? value.wheelRublesDailyLimit : value.rublesDailyLimit),
    maxLevel: optionalLimit(value.maxLevel) || null,
    stashRecipientId: recipientId(value.stashRecipientId),
    bossInsertPosition: value.bossInsertPosition === "front" ? "front" : "back",
    bossRules: normalizeBossRules(value.bossRules),
  };
}

function zarubaTaskPolicy(task, policy) {
  const strategy = task.execution?.strategy;
  if (task.kind === "boss") {
    if (!policy.queueBosses) return { allowed: false, reason: "Боссы добавляются вручную" };
    const rules = policy.bossRules || [];
    const rule = rules.find((item) => (!item.bossId || item.bossId === Number(task.targetId))
      && (item.objective === "any" || item.objective === task.objective))
      || { bossId: 0, objective: "any", mode: "pacansky", maxWeaponValue: null };
    if (task.objective === "damage" && rule.maxWeaponValue !== null
      && (!Number.isFinite(task.execution?.priceRubles) || task.execution.priceRubles > rule.maxWeaponValue)) {
      return { allowed: false, reason: "Оружие для задания превышает лимит правила" };
    }
    return { allowed: true, rule };
  }
  if (task.kind === "prison" && task.execution?.queueable !== false) {
    return { allowed: policy.queuePrisons, reason: "Очередь зон отключена" };
  }
  if (task.kind === "master") return { allowed: policy.queueMasters, reason: "Очередь мастеров отключена" };
  const gameFlag = { katala_cheap: "playKatala", fartovy_spin: "playSlots", wheel_spin: "playWheel" }[strategy];
  return gameFlag
    ? { allowed: policy[gameFlag], reason: "Эта мини-игра отключена для Зарубы" }
    : { allowed: policy.directTasks, reason: "Прямые действия отключены" };
}

function normalizeMonthlyPolicy(value = {}) {
  return {
    claimRewards: flag(value.claimRewards),
    simpleTasks: flag(value.simpleTasks),
    interactions: flag(value.interactions),
    playKatala: flag(value.playKatala),
    energyTasks: flag(value.energyTasks),
    queueBosses: flag(value.queueBosses),
    queueMasterSessions: flag(value.queueMasterSessions, false),
    intellectMasterId: optionalLimit(value.intellectMasterId) || 1,
    authorityPrisonId: optionalLimit(value.authorityPrisonId) || 1,
    stashRecipientId: recipientId(value.stashRecipientId),
  };
}

function monthlyTaskEnabled(action, policy) {
  if (["PrisonRun", "PrisonEarnAuthority", "MasterSession", "MasterEarnIntellect"].includes(action)) return policy.energyTasks;
  if (["SpitSoup", "AddYeast", "BicepsTrain", "StressVictim"].includes(action)) return policy.interactions;
  if (action === "KillBoss") return policy.queueBosses;
  if (action === "ScamGambler") return policy.playKatala;
  return policy.simpleTasks;
}

function applyMonthlyTargets(day, policy) {
  if (!day) return day;
  const context = { ...day.context };
  if (day.action === "MasterEarnIntellect" && !context.masterId) context.masterId = policy.intellectMasterId;
  // A preferred work location is not a restriction from the game. In
  // particular, profit from all zones can still satisfy an unrestricted quest.
  return { ...day, context,
    ...(day.action === "PrisonEarnAuthority" ? { authorityPrisonId: policy.authorityPrisonId } : {}),
  };
}

module.exports = { normalizeZarubaPolicy, zarubaTaskPolicy, normalizeMonthlyPolicy, monthlyTaskEnabled, applyMonthlyTargets };
