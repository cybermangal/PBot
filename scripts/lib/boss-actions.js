const DEFAULT_BOSS_HIT_SEQUENCE = [
  "punchChest",
  "kickBalls",
  "pokeEyes",
  "kneeEar",
];

const ACTION_DEFINITIONS = [
  {
    key: "punchChest",
    label: "Punch Chest",
    attackLabel: "Удар в грудь",
    itemLabel: "Удар в грудь",
    category: "melee",
    aliases: ["punchchest", "punch", "chest", "грудь", "ударвгрудь", "удар"],
    defaultCount: 1,
    texturePrefix: "weapon_punchChest_",
    textureKeys: [],
    damageKey: "punchChest",
    critKey: "punchChest",
    cooldownKey: "punchChest",
    countKey: null,
  },
  {
    key: "kickBalls",
    label: "Kick Balls",
    attackLabel: "Удар в пах",
    itemLabel: "Удар в пах",
    category: "melee",
    aliases: ["kickballs", "kick", "balls", "пах", "ударвпах"],
    defaultCount: 1,
    texturePrefix: "weapon_kickBalls_",
    textureKeys: [],
    damageKey: "kickBalls",
    critKey: "kickBalls",
    cooldownKey: "kickBalls",
    countKey: null,
  },
  {
    key: "pokeEyes",
    label: "Poke Eyes",
    attackLabel: "Тычок в глаза",
    itemLabel: "Тычок в глаза",
    category: "melee",
    aliases: ["pokeeyes", "poke", "eyes", "глаза", "тычок", "тычоквглаза"],
    defaultCount: 1,
    texturePrefix: "weapon_pokeEyes_",
    textureKeys: [],
    damageKey: "pokeEyes",
    critKey: "pokeEyes",
    cooldownKey: "pokeEyes",
    countKey: null,
  },
  {
    key: "kneeEar",
    label: "Knee Ear",
    attackLabel: "Коленом в ухо",
    itemLabel: "Коленом в ухо",
    category: "melee",
    aliases: ["kneeear", "knee", "ear", "ухо", "коленомвухо"],
    defaultCount: 1,
    texturePrefix: "weapon_kneeear_",
    textureKeys: [],
    damageKey: "kneeEar",
    critKey: "kneeEar",
    cooldownKey: "kneeEar",
    countKey: null,
  },
  {
    key: "poison",
    label: "Poison",
    attackLabel: "Подкинуть яда",
    itemLabel: "Яд",
    category: "consumable",
    aliases: ["poison1", "poison", "toxin", "яд", "яда", "подкинутьяда"],
    defaultCount: 1,
    texturePrefix: "weapon_poison_",
    textureKeys: ["weapon_poison"],
    damageKey: "poison",
    critKey: "poison",
    cooldownKey: null,
    countKey: "poison",
  },
  {
    key: "gunshot",
    label: "Gunshot",
    attackLabel: "Шмальнуть из самопала",
    itemLabel: "Самопал",
    category: "consumable",
    aliases: ["gunshot", "gun", "shot", "samopal", "самопал", "шмальнуть"],
    defaultCount: 1,
    texturePrefix: "weapon_gunshot_",
    textureKeys: ["weapon_gunshot"],
    damageKey: "gunshot",
    critKey: "gunshot",
    cooldownKey: null,
    countKey: "gunshot",
  },
  {
    key: "knife",
    label: "Knife",
    attackLabel: "Пырнуть финкой",
    itemLabel: "Финка",
    category: "consumable",
    aliases: ["knife", "shiv", "finka", "финка", "нож", "пырнуть"],
    defaultCount: 1,
    texturePrefix: "weapon_knife_",
    textureKeys: ["weapon_knife"],
    damageKey: "knife",
    critKey: "knife",
    cooldownKey: null,
    countKey: "knife",
  },
];

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]/g, "");
}

function getActionDefinitionMap() {
  const map = new Map();

  for (const definition of ACTION_DEFINITIONS) {
    map.set(normalizeToken(definition.key), definition);
    for (const alias of definition.aliases) {
      map.set(normalizeToken(alias), definition);
    }
  }

  return map;
}

const ACTION_BY_ALIAS = getActionDefinitionMap();

function getBossActionDefinition(value) {
  const token = normalizeToken(value);
  return ACTION_BY_ALIAS.get(token) || null;
}

function getBossActionDefinitionByTexture(textureKey) {
  const key = String(textureKey || "");
  return ACTION_DEFINITIONS.find((definition) => {
    if (Array.isArray(definition.textureKeys) && definition.textureKeys.includes(key)) {
      return true;
    }

    return Boolean(definition.texturePrefix && key.startsWith(definition.texturePrefix));
  }) || null;
}

function normalizeBossActionType(value) {
  const definition = getBossActionDefinition(value);

  if (!definition) {
    throw new Error(`Unknown boss action type: ${value}`);
  }

  return definition.key;
}

function getDefaultBossActionCount(value) {
  const definition = getBossActionDefinition(value);
  return definition ? definition.defaultCount : null;
}

function parseBossHitSequence(value) {
  if (!value) {
    return [...DEFAULT_BOSS_HIT_SEQUENCE];
  }

  const values = Array.isArray(value) ? value : [value];
  const sequence = [];

  for (const item of values) {
    for (const part of String(item).split(/[\s,;]+/)) {
      const token = part.trim();
      if (!token) {
        continue;
      }
      sequence.push(normalizeBossActionType(token));
    }
  }

  return sequence;
}

function buildBossUseWeaponPayload(input, count) {
  const definition = getBossActionDefinition(input);

  if (!definition) {
    throw new Error(`Unknown boss action type: ${input}`);
  }

  return {
    weapon: definition.key,
    count: count === undefined || count === null ? definition.defaultCount : Number(count),
  };
}

function buildBossActionCatalog(weaponStatsEffective) {
  const stats = weaponStatsEffective || {};
  const counts = stats.counts || {};
  const damage = stats.damage || {};
  const critChance = stats.critChance || {};
  const cooldownSec = stats.cooldownSec || {};

  return ACTION_DEFINITIONS.map((definition) => {
    const countValue = definition.countKey ? Number(counts[definition.countKey] ?? 0) : null;

    return {
      key: definition.key,
      label: definition.label,
      attackLabel: definition.attackLabel,
      itemLabel: definition.itemLabel,
      category: definition.category,
      aliases: definition.aliases,
      defaultCount: definition.defaultCount,
      texturePrefix: definition.texturePrefix,
      textureKeys: definition.textureKeys,
      count: countValue,
      hasCharges: definition.countKey !== null,
      damage: definition.damageKey ? damage[definition.damageKey] ?? null : null,
      critChance: definition.critKey ? critChance[definition.critKey] ?? null : null,
      cooldownSec: definition.cooldownKey ? cooldownSec[definition.cooldownKey] ?? null : null,
      available: definition.countKey ? countValue > 0 : true,
    };
  });
}

module.exports = {
  ACTION_DEFINITIONS,
  DEFAULT_BOSS_HIT_SEQUENCE,
  buildBossActionCatalog,
  buildBossUseWeaponPayload,
  getBossActionDefinition,
  getBossActionDefinitionByTexture,
  getDefaultBossActionCount,
  normalizeBossActionType,
  parseBossHitSequence,
};
