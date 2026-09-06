const SOURCE_OPTIONS = [
  { key: "authority-top", label: "Топ авторитета" },
  { key: "weekly-damage", label: "Урон за неделю" },
  { key: "weekly-achievements", label: "Достижения за неделю" },
  { key: "prison-tops", label: "Топы тюрьмы" },
  { key: "boss-last-killers", label: "Последние убийцы боссов" },
  { key: "weekly-overview", label: "Итоги недели" },
];

const ABOUT_SPONSOR_FILTERS = Object.freeze([
  Object.freeze({ key: "all", label: "Все" }),
  Object.freeze({ key: "authority", label: "Авторитеты" }),
  Object.freeze({ key: "blatnoy", label: "Блатные" }),
  Object.freeze({ key: "patsan", label: "Пацаны" }),
]);
const ABOUT_SPONSOR_TIERS = Object.freeze({
  authority: Object.freeze({
    label: "Авторитет",
    priority: 3,
    iconUrl: "/assets/game-icons/extracted/png-4x/avtoritetnaya-posylka-4x.png",
  }),
  blatnoy: Object.freeze({
    label: "Блатной",
    priority: 2,
    iconUrl: "/assets/game-icons/extracted/png-4x/blatnaya-posylka-4x.png",
  }),
  patsan: Object.freeze({
    label: "Пацан",
    priority: 1,
    iconUrl: "/assets/game-icons/extracted/png-4x/patsanskaya-posylka-4x.png",
  }),
});

const FRIENDS_AUTO_ACCEPT_INTERVAL_MS = 60000;
const BOSS_AUTO_REFRESH_DEFAULT_SEC = 10;
const BOSS_HIT_SNAPSHOT_GRACE_MS = 5000;
const DEFAULT_BOSS_MELEE_COOLDOWN_MS = 8 * 60 * 60 * 1000;
const AUTO_BOSS_QUEUE_MODE = "auto";
const DEFAULT_BOSS_MODE = "pacansky";
const DEFAULT_BOSS_LOOP_CYCLES = 3;
const BOSS_FIXED_PRICES = Object.freeze({
  poison: 18,
  gunshot: 5,
  knife: 4,
  restoreMelee: 3,
});
const BUYABLE_BOSS_IDS = new Set([2, 3, 4, 10, 11, 12]);
const ALWAYS_AUTO_BUY_QUEUE_BOSS_IDS = new Set([3]);
const BOSS_MODE_LABELS = {
  pacansky: "Пацанский",
  blotnoy: "Блатной",
  avtoritetny: "Авторитетный",
  vorovskoy: "Воровской",
  odin: "В одного",
};
const SOLO_BOSS_MODE = "odin";
const SOLO_BOSS_QUEUE_WARNING_HP_THRESHOLD = 1_000_000;
const BOSS_MODE_HP_MULTIPLIERS = Object.freeze({
  pacansky: 1,
  blotnoy: 3,
  avtoritetny: 6,
  vorovskoy: 12,
});
const BOSS_COMBO_STORAGE_KEY = "pbot.boss.combo.templates.v1";
const BOSS_RUN_QUEUE_STORAGE_KEY = "pbot.boss.run.queue.v1";
const BOSS_RUN_QUEUE_PRESETS_STORAGE_KEY = "pbot.boss.run.queue.presets.v1";
const BOSS_QUEUE_SETTINGS_STORAGE_KEY = "pbot.boss.queue.settings.v2";
const BOSS_QUEUE_LEGACY_SETTINGS_STORAGE_KEY = "pbot.boss.queue.settings.v1";
const SOLO_BOSS_QUEUE_WARNING_STORAGE_KEY = "pbot.boss.solo.queue.warning.v1";
const BOSS_EXCLUDE_TEMPLATE_STORAGE_KEY = "pbot.boss.exclude.templates.v1";
const BOSS_SMART_QUEUE_COLLECTION_STORAGE_KEY = "pbot.boss.smart.queue.collection.v1";
const BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID = "default-selection";
const BOSS_RUN_QUEUE_DEFAULT_EXCLUDED_IDS = Object.freeze([17, 32, 33, 34, 35, 36, 18, 24, 22, 28, 16, 31, 30, 25, 29]);
const BOSS_EXCLUDE_BUILT_IN_TEMPLATES = Object.freeze([
  Object.freeze({
    id: "daily-exclusions",
    name: "Ежедневное",
    excludedIds: Object.freeze([5, 6, 7, 12, 13, 14, 15, 16, 18, 21, 22, 23, 24, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 43, 45]),
    modeByBossId: Object.freeze({ 1: "odin", 2: "odin", 39: "avtoritetny" }),
  }),
  Object.freeze({
    id: "daily-combo-exclusions",
    name: "Ежедневное + Комбо",
    excludedIds: Object.freeze([6, 7, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 40, 43, 45]),
    modeByBossId: Object.freeze({ 1: "odin", 2: "odin", 17: "blotnoy", 39: "avtoritetny" }),
  }),
]);
const SMART_BOSS_QUEUE_COLLECTION_HP_LIMIT = 3_000_000_000;
const BOSS_COMBO_MODE_MARKERS = {
  pacansky: "П",
  blotnoy: "Б",
  avtoritetny: "А",
  vorovskoy: "В",
  odin: "О",
};
const BOSS_COMBO_MODE_ORDER = ["pacansky", "blotnoy", "avtoritetny", "vorovskoy", "odin"];
const BOSS_COMBO_ACTION_KEYS = new Set([
  "punchChest",
  "kickBalls",
  "pokeEyes",
  "kneeEar",
  "poison",
  "gunshot",
  "knife",
]);
const BOSS_WEAPON_ACTION_KEYS = new Set(["poison", "gunshot", "knife"]);
const BOSS_MELEE_ACTION_KEYS = new Set(["punchChest", "kickBalls", "pokeEyes", "kneeEar"]);
const BOSS_DIRECT_HIT_ACTION_KEYS = new Set([
  ...BOSS_MELEE_ACTION_KEYS,
  ...BOSS_WEAPON_ACTION_KEYS,
]);
const BOSS_WEAPON_BATCH_COUNTS = Object.freeze([1, 10, 50, 100, 1000]);
const BOSS_WEAPON_BUY_BATCH_COUNTS = Object.freeze([1, 10, 100]);
const BOSS_ACTIVITY_VISIBLE_LIMIT = 60;
const BOSS_COMBO_ACTION_ALIASES = {
  // Melee
  "грудь": "punchChest",
  "удар в грудь": "punchChest",
  "chest": "punchChest",
  "punch": "punchChest",
  "punchchest": "punchChest",
  "\u0432 \u0433\u0440\u0443\u0434\u044c": "punchChest",
  "пах": "kickBalls",
  "удар в пах": "kickBalls",
  "яйца": "kickBalls",
  "balls": "kickBalls",
  "kick": "kickBalls",
  "kickballs": "kickBalls",
  "\u0432 \u043f\u0430\u0445": "kickBalls",
  "глаза": "pokeEyes",
  "глаз": "pokeEyes",
  "eyes": "pokeEyes",
  "poke": "pokeEyes",
  "pokeeyes": "pokeEyes",
  "\u0432 \u0433\u043b\u0430\u0437": "pokeEyes",
  "\u0432 \u0433\u043b\u0430\u0437\u0430": "pokeEyes",
  "ухо": "kneeEar",
  "уши": "kneeEar",
  "ear": "kneeEar",
  "knee": "kneeEar",
  "kneeear": "kneeEar",
  "\u043a\u043e\u043b\u0435\u043d\u043e": "kneeEar",
  "\u043a\u043e\u043b\u0435\u043d\u043e\u043c": "kneeEar",
  "\u043a\u043e\u043b\u0435\u043d\u043a\u043e": "kneeEar",
  // Consumables
  "яд": "poison",
  "poison": "poison",
  "\u044f\u0434\u043e\u043c": "poison",
  "\u043e\u0442\u0440\u0430\u0432\u0430": "poison",
  "финка": "knife",
  "нож": "knife",
  "knife": "knife",
  "\u0444\u0438\u043d\u043a\u043e\u0439": "knife",
  "\u043d\u043e\u0436\u043e\u043c": "knife",
  "самопал": "gunshot",
  "пистолет": "gunshot",
  "gunshot": "gunshot",
  "gun": "gunshot",
  "\u0441\u0430\u043c\u043e\u043f\u0430\u043b\u043e\u043c": "gunshot",
  "\u0432\u044b\u0441\u0442\u0440\u0435\u043b": "gunshot",
};
const BOSS_COMBO_ACTION_TO_RU = {
  punchChest: "грудь",
  kickBalls: "пах",
  pokeEyes: "глаза",
  kneeEar: "ухо",
  poison: "яд",
  gunshot: "самопал",
  knife: "финка",
};

const CURRENCY_LABELS = {
  ep: "Очки события",
  cigarettes: "Папиросы",
  rubles: "Рубли",
  paper: "Бумага",
  sugar: "Сахар",
  chefir: "Чифир",
  signet: "Печатки",
  soap: "Мыло",
  stew: "Тушёнка",
  chips: "Фишки",
  sprats: "Шпроты",
  ore_signet: "Руда",
  blue_matches: "Синие спички",
  pink_matches: "Розовые спички",
  green_matches: "Зелёные спички",
  orange_matches: "Оранжевые спички",
  red_matches: "Красные спички",
  condensed_milk: "Сгущёнка",
  fortune_tickets: "Билеты",
  vbox: "Ящик Воркуты",
  armband_1: "Повязка актива I",
  armband_2: "Повязка актива II",
  armband_3: "Повязка актива III",
  armband_4: "Повязка актива IV",
  armband_5: "Повязка актива V",
  eventtoken_13: "Жетоны события",
  authority: "Авторитет",
  level: "Уровень",
  biceps: "Бицуха",
};

const GAME_ASSET_BASE_URL = "https://oldprison-prod-assets-cdn-yandex.luckygem.online/assets";
const ZARUBA_BAG_ASSET_BASE_URL = `${GAME_ASSET_BASE_URL}/Zaruba/bagsScene`;
const BRIGADE_BAG_ASSET_BASE_URL = `${GAME_ASSET_BASE_URL}/Guild/Camps/GuildWell/bags`;
const BAGS_REFRESH_INTERVAL_MS = 15_000;
const ZARUBA_REFRESH_INTERVAL_MS = 15_000;
const CURRENCY_ICON_URLS = Object.freeze({
  ep: `${GAME_ASSET_BASE_URL}/event/doorBreaker/resurs/dbr_exp.webp`,
  authority: `${GAME_ASSET_BASE_URL}/Avtoritet.png`,
  cigarettes: `${GAME_ASSET_BASE_URL}/HUD/cigarettes.png`,
  rubles: `${GAME_ASSET_BASE_URL}/HUD/rubles.png`,
  paper: `${GAME_ASSET_BASE_URL}/HUD/paper.png`,
  sugar: `${GAME_ASSET_BASE_URL}/HUD/sugar.png`,
  soap: `${GAME_ASSET_BASE_URL}/HUD/soap.png`,
  condensed_milk: `${GAME_ASSET_BASE_URL}/HUD/condensed_milk.png`,
  chefir: `${GAME_ASSET_BASE_URL}/MainRoom/chefir.png`,
  sprats: `${GAME_ASSET_BASE_URL}/PrisonV3/Vorkuta/Sprats.png`,
  chips: `${GAME_ASSET_BASE_URL}/poker/pokerChips.webp`,
  pink_matches: `${GAME_ASSET_BASE_URL}/poker/pokerMatch.webp`,
  blue_matches: `${GAME_ASSET_BASE_URL}/FortuneScene/Match_blue_reward.webp`,
  fortune_tickets: `${GAME_ASSET_BASE_URL}/FortuneScene/biletic_jackpot.webp`,
  green_matches: `${GAME_ASSET_BASE_URL}/slots/slots_match_gr.webp`,
  orange_matches: `${GAME_ASSET_BASE_URL}/slots/slot_match_ora.webp`,
  red_matches: `${GAME_ASSET_BASE_URL}/slots/slot_match_red.webp`,
  stew: `${GAME_ASSET_BASE_URL}/PrisonV3/BARIGA/img/stewBalance.webp`,
  signet: `${GAME_ASSET_BASE_URL}/Zaruba/ZarunIconfix.webp`,
  ore_signet: `${GAME_ASSET_BASE_URL}/Zaruba/ZarubActiv/ore_icon.webp`,
  vbox: `${GAME_ASSET_BASE_URL}/PrisonV3/Vorkuta/box_inon_vor.webp`,
  armband_1: `${GAME_ASSET_BASE_URL}/Guild/Camps/bandages/bandage_1.webp`,
  armband_2: `${GAME_ASSET_BASE_URL}/Guild/Camps/bandages/bandage_2.webp`,
  armband_3: `${GAME_ASSET_BASE_URL}/Guild/Camps/bandages/bandage_3.webp`,
  armband_4: `${GAME_ASSET_BASE_URL}/Guild/Camps/bandages/bandage_4.webp`,
  armband_5: `${GAME_ASSET_BASE_URL}/Guild/Camps/bandages/bandage_5.webp`,
});
const CURRENCY_DISPLAY_ORDER = Object.freeze([
  "cigarettes",
  "rubles",
  "paper",
  "sugar",
  "soap",
  "stew",
  "sprats",
  "signet",
  "chips",
]);
const BOSS_WEAPON_LABELS = Object.freeze({
  poison: "Яд",
  gunshot: "Самопал",
  knife: "Финка",
});
const BOSS_MELEE_ACTION_LABELS = Object.freeze({
  punchChest: "Удар в грудь",
  kickBalls: "Удар в пах",
  pokeEyes: "Тычок в глаза",
  kneeEar: "Коленом в ухо",
});
const BOSS_WEAPON_ICON_URLS = Object.freeze({
  poison: `${GAME_ASSET_BASE_URL}/PrisonV3/collections/imgReward/PoisonIconReward.webp`,
  gunshot: `${GAME_ASSET_BASE_URL}/PrisonV3/collections/imgReward/GunshotIconReward.webp`,
  knife: `${GAME_ASSET_BASE_URL}/PrisonV3/collections/imgReward/KnifeIconReward.webp`,
});
const BOSS_MELEE_ACTION_ICON_URLS = Object.freeze({
  punchChest: `${GAME_ASSET_BASE_URL}/PrisonV3/WeaponsScene/icon/4/1.jpg`,
  kickBalls: `${GAME_ASSET_BASE_URL}/PrisonV3/WeaponsScene/icon/4/2.jpg`,
  pokeEyes: `${GAME_ASSET_BASE_URL}/PrisonV3/WeaponsScene/icon/4/3.jpg`,
  kneeEar: `${GAME_ASSET_BASE_URL}/PrisonV3/WeaponsScene/icon/4/4.jpg`,
});
const BOSS_STASH_ICON_URL = `${GAME_ASSET_BASE_URL}/poker/hidesicon.png`;
const TALENTS_ICON_URL = `${GAME_ASSET_BASE_URL}/PrisonV3/Friend/talantCount.webp`;
const DASHBOARD_RESOURCE_STORAGE_KEY = "pbot.dashboard.resources.v3";
const DASHBOARD_HERO_STORAGE_KEY = "pbot.dashboard.hero.v2";
const ACCOUNT_STORAGE_MIGRATION_KEY = "pbot.storage.account-scope.v1";

function buildAccountStorageKey(baseKey, accountId) {
  const normalizedAccountId = String(accountId || "").trim();
  return normalizedAccountId
    ? `${baseKey}.account.${encodeURIComponent(normalizedAccountId)}`
    : baseKey;
}

function getAccountStorageKey(baseKey) {
  return buildAccountStorageKey(baseKey, state.activeStorageAccountId);
}

function readAccountStorage(baseKey) {
  return localStorage.getItem(getAccountStorageKey(baseKey));
}

function writeAccountStorage(baseKey, value) {
  localStorage.setItem(getAccountStorageKey(baseKey), value);
}

function activateAccountScopedUiStorage(accountId) {
  const normalizedAccountId = String(accountId || "").trim();
  if (!normalizedAccountId || state.activeStorageAccountId === normalizedAccountId) {
    return false;
  }

  try {
    if (!localStorage.getItem(ACCOUNT_STORAGE_MIGRATION_KEY)) {
      localStorage.setItem(ACCOUNT_STORAGE_MIGRATION_KEY, JSON.stringify({
        activatedFor: normalizedAccountId,
        legacyStatePreserved: true,
      }));
    }
  } catch (_error) {
    // Runtime state still remains isolated for this page even if storage is unavailable.
  }

  state.activeStorageAccountId = normalizedAccountId;
  state.dashboardResourceSlots = readDashboardResourceSlots();
  state.dashboardHeroSlots = readDashboardHeroSlots();
  loadBossComboTemplates();
  loadBossRunQueue();
  loadBossRunQueuePresets();
  loadBossExcludeTemplates();
  loadBossSmartQueueCollectionPreference();
  loadBossQueueSettings();
  renderDashboardResources();
  populateBossExcludeTemplateSelect();
  renderBossRunQueueExcludeList();
  renderBossRunQueue();
  populateBossComboDialogBossSelect();
  populateBossComboDialogModeSelect();
  refreshBossComboDialogMeta({ fillTextarea: false });
  return true;
}
const DASHBOARD_RESOURCE_SLOT_LIMIT = 9;
const DASHBOARD_HERO_SLOT_LIMIT = 3;
const DASHBOARD_SLOT_ITEM_LIMIT = 1;
const DASHBOARD_RESOURCE_GROUPS = Object.freeze([
  Object.freeze({ key: "resources", label: "Валюты и ресурсы" }),
  Object.freeze({ key: "profile", label: "Профиль и прогресс" }),
  Object.freeze({ key: "combat", label: "Бой и статистика" }),
]);
const DASHBOARD_CURRENCY_KEYS = Object.freeze([
  "cigarettes",
  "rubles",
  "paper",
  "sugar",
  "chefir",
  "soap",
  "stew",
  "sprats",
  "signet",
  "ore_signet",
  "chips",
  "vbox",
  "armband_1",
  "armband_2",
  "armband_3",
  "armband_4",
  "armband_5",
  "blue_matches",
  "pink_matches",
  "green_matches",
  "orange_matches",
  "red_matches",
  "condensed_milk",
  "fortune_tickets",
]);
const DASHBOARD_RESOURCE_DEFINITIONS = Object.freeze({
  ...Object.fromEntries(DASHBOARD_CURRENCY_KEYS.map((key) => [key, Object.freeze({
    key,
    label: CURRENCY_LABELS[key] || key,
    group: "resources",
    source: "currency",
    iconUrl: CURRENCY_ICON_URLS[key] || "",
    trendKey: key,
  })])),
  energy: Object.freeze({
    key: "energy",
    label: "Энергия",
    group: "profile",
    source: "energy",
    iconUrl: `${GAME_ASSET_BASE_URL}/Energy.png`,
  }),
  authority: Object.freeze({
    key: "authority",
    label: CURRENCY_LABELS.authority,
    group: "profile",
    source: "economy",
    iconUrl: CURRENCY_ICON_URLS.authority,
    trendKey: "authority",
  }),
  level: Object.freeze({
    key: "level",
    label: CURRENCY_LABELS.level,
    group: "profile",
    source: "economy",
    iconUrl: `${GAME_ASSET_BASE_URL}/PrisonV3/slotlvl.png`,
  }),
  biceps: Object.freeze({
    key: "biceps",
    label: CURRENCY_LABELS.biceps,
    group: "profile",
    source: "economy",
    iconUrl: `${GAME_ASSET_BASE_URL}/PrisonV3/interaction/bitsepsAdd.png`,
  }),
  talents: Object.freeze({
    key: "talents",
    label: "Очки талантов",
    group: "profile",
    source: "talents",
    iconUrl: TALENTS_ICON_URL,
  }),
  achievements: Object.freeze({
    key: "achievements",
    label: "Достижения",
    group: "profile",
    source: "header-extra",
    iconUrl: `${GAME_ASSET_BASE_URL}/PrisonV3/achievements/imgAll/Star_Small_Deactiv.png`,
  }),
  "stash-coolness": Object.freeze({
    key: "stash-coolness",
    label: "ЗШ",
    group: "profile",
    source: "header-extra",
    iconUrl: `${GAME_ASSET_BASE_URL}/craftZS/sicon_coolness.png`,
  }),
  weapon_poison: Object.freeze({
    key: "weapon_poison",
    label: BOSS_WEAPON_LABELS.poison,
    group: "combat",
    source: "weapon",
    weaponKey: "poison",
    iconUrl: BOSS_WEAPON_ICON_URLS.poison,
    trendKey: "weapon_poison",
  }),
  weapon_damage_poison: Object.freeze({
    key: "weapon_damage_poison",
    label: "Урон яда",
    group: "combat",
    source: "weapon-damage",
    weaponKey: "poison",
    iconUrl: BOSS_WEAPON_ICON_URLS.poison,
  }),
  weapon_gunshot: Object.freeze({
    key: "weapon_gunshot",
    label: BOSS_WEAPON_LABELS.gunshot,
    group: "combat",
    source: "weapon",
    weaponKey: "gunshot",
    iconUrl: BOSS_WEAPON_ICON_URLS.gunshot,
    trendKey: "weapon_gunshot",
  }),
  weapon_damage_gunshot: Object.freeze({
    key: "weapon_damage_gunshot",
    label: "Урон самопала",
    group: "combat",
    source: "weapon-damage",
    weaponKey: "gunshot",
    iconUrl: BOSS_WEAPON_ICON_URLS.gunshot,
  }),
  weapon_knife: Object.freeze({
    key: "weapon_knife",
    label: BOSS_WEAPON_LABELS.knife,
    group: "combat",
    source: "weapon",
    weaponKey: "knife",
    iconUrl: BOSS_WEAPON_ICON_URLS.knife,
    trendKey: "weapon_knife",
  }),
  weapon_damage_knife: Object.freeze({
    key: "weapon_damage_knife",
    label: "Урон финки",
    group: "combat",
    source: "weapon-damage",
    weaponKey: "knife",
    iconUrl: BOSS_WEAPON_ICON_URLS.knife,
  }),
  ...Object.fromEntries([
    ["self", "Мой урон"],
    ["all", "Общий урон"],
    ["friends", "Урон друзей"],
    ["guild", "Бригадный урон"],
  ].flatMap(([scope, label]) => [
    ["hourly", "за час"],
    ["daily", "за день"],
    ["weekly", "за неделю"],
  ].map(([period, periodLabel]) => {
    const key = `damage-${scope}-${period}`;
    return [key, Object.freeze({
      key,
      label: `${label} ${periodLabel}`,
      group: "combat",
      source: "damage",
      scope,
      period,
      symbol: "⚔",
    })];
  }))),
});
const VPI_TIER_ICON_URLS = Object.freeze({
  pacansky: `${GAME_ASSET_BASE_URL}/VIP/P_StashV2.webp`,
  blatnoy: `${GAME_ASSET_BASE_URL}/VIP/B_StashV2.webp`,
  avtoritetny: `${GAME_ASSET_BASE_URL}/VIP/A_StashV2.webp`,
  vorovskoy: `${GAME_ASSET_BASE_URL}/VIP/V_StashV2.webp`,
});
const VPI_DEFAULT_ICON_URL = VPI_TIER_ICON_URLS.pacansky;
const VPI_NEEDLE_ICON_URL = `${GAME_ASSET_BASE_URL}/VIP/iglaDamage.webp`;
const BOSS_REWARD_BONUS_DEFINITIONS = Object.freeze([
  { key: "poison", sourceKeys: ["poison"], label: BOSS_WEAPON_LABELS.poison, iconUrl: BOSS_WEAPON_ICON_URLS.poison },
  { key: "gunshot", sourceKeys: ["gunshot"], label: BOSS_WEAPON_LABELS.gunshot, iconUrl: BOSS_WEAPON_ICON_URLS.gunshot },
  { key: "knife", sourceKeys: ["knife"], label: BOSS_WEAPON_LABELS.knife, iconUrl: BOSS_WEAPON_ICON_URLS.knife },
  { key: "energy", sourceKeys: ["maxEnergy", "maxenergy"], label: "Энергия", iconUrl: `${GAME_ASSET_BASE_URL}/Energy.png` },
]);
const JOURNAL_MAX_ENTRIES = 200;
const JOURNAL_ROUTINE_MESSAGE_PATTERNS = Object.freeze([
  /^Auth status refreshed$/i,
  /^Boss (?:state|dashboard) refreshed$/i,
  /^Prison costs refreshed$/i,
  /^Запуск завершён$/i,
  /^Boss combo templates (?:loaded|reset)$/i,
  /^Boss run queue (?:loaded|reset)$/i,
  /^Boss exclusion templates loaded$/i,
  /^Статус авторизации обновлено$/i,
  /^Босс (?:состояние|панель) обновлено$/i,
  /^Босс (?:комбо шаблоны|run очередь|exclusion шаблоны) (?:загружено|reset)$/i,
]);
const JOURNAL_EXPECTED_DIAGNOSTIC_PATTERNS = Object.freeze([
  /prison is closed|тюрьма закрыта/i,
  /not enough energy|недостаточно энергии/i,
  /cooldown|перезаряд/i,
  /session in progress|бой уже ид[её]т/i,
  /reward (?:is )?not ready|награда (?:ещ[её] )?не готова/i,
]);
const JOURNAL_SOURCE_META = Object.freeze({
  system: { label: "Система", shortLabel: "Система" },
  bosses: { label: "Боссы", shortLabel: "Боссы" },
  prison: { label: "Тюрьма", shortLabel: "Тюрьма" },
  zaruba: { label: "Зарубы", shortLabel: "Зарубы" },
  friends: { label: "Друзья", shortLabel: "Друзья" },
  misc: { label: "Разное", shortLabel: "Разное" },
  events: { label: "События", shortLabel: "События" },
});
const JOURNAL_KIND_META = Object.freeze({
  action: { label: "Действие" },
  reward: { label: "Награда" },
  error: { label: "Ошибка" },
});

const PRISON_CURRENCY_LABELS = {
  cigarettes: "папирос",
  rubles: "рублей",
  paper: "бумаги",
  sugar: "сахара",
  chefir: "чифира",
  signet: "печаток",
  soap: "мыла",
  stew: "тушёнки",
  chips: "фишек",
  ore_signet: "руды",
  blue_matches: "синих спичек",
  pink_matches: "розовых спичек",
  condensed_milk: "сгущёнки",
  fortune_tickets: "билетов",
  authority: "авторитета",
  respect: "уважения",
  level: "уровней",
  biceps: "бицухи",
};

const DAMAGE_PERIOD_ORDER = ["hourly", "daily", "weekly"];
const DAMAGE_INVITE_TOP_LIMIT = 20;
const FRIENDS_BATCH_KIND_LABELS = Object.freeze({
  invites: "Приглашения в друзья",
  accept: "Обработка входящих заявок",
  cleanup: "Чистка друзей",
  action: "Действия с друзьями",
});
const FRIENDS_BATCH_STAGE_LABELS = Object.freeze({
  Preparing: "Подготовка",
  Completed: "Операция завершена",
  Failed: "Операция завершилась с ошибкой",
  "Loading friends profiles": "Загрузка профилей друзей",
  "Collecting IDs from selected sources": "Сбор игроков из выбранных источников",
  "Previewing friend invites": "Проверка приглашений",
  "Sending friend invites": "Отправка приглашений",
  "Loading incoming requests": "Загрузка входящих заявок",
  "Loading friends list": "Загрузка списка друзей",
  "Loading weekly damage": "Загрузка недельного урона",
  "Checking talent totals": "Формирование списка по талантам",
  "Previewing incoming requests": "Проверка входящих заявок",
  "Processing incoming requests": "Обработка входящих заявок",
  "Accepting friend requests": "Приём заявок в друзья",
  "Declining friend requests": "Отклонение неподходящих заявок",
  "Previewing friend cleanup": "Проверка чистки друзей",
  "Cleaning friends": "Чистка друзей",
  "Previewing targets": "Проверка выбранных целей",
  "Performing actions": "Выполнение действий",
});
const FRIENDS_BATCH_STATUS_LABELS = Object.freeze({
  running: "Выполняется",
  completed: "Готово",
  failed: "Ошибка",
});
const DAMAGE_PERIOD_META = Object.freeze({
  hourly: {
    label: "За час",
    metricKey: "deltaDamage",
    allLabel: "Все за час",
    friendsLabel: "Друзья за час",
    guildLabel: "Бригада за час",
  },
  daily: {
    label: "За день",
    metricKey: "deltaDamage",
    allLabel: "Все за день",
    friendsLabel: "Друзья за день",
    guildLabel: "Бригада за день",
  },
  weekly: {
    label: "За неделю",
    metricKey: "damage",
    allLabel: "Все за неделю",
    friendsLabel: "Друзья за неделю",
    guildLabel: "Бригада за неделю",
  },
});
const DAMAGE_BASELINE_LABELS = Object.freeze({
  previous_snapshot: "Предыдущий снимок",
  previous_day_near_close: "Около начала дня",
  previous_day_fallback: "Более раннее значение",
  current_day_first_sample: "Первый замер сегодня",
  weekly_reset_zero: "Сброс недели",
  collecting: "Сбор данных",
});
const INTERACTION_ACTION_META = Object.freeze({
  UpgradeBiceps: {
    label: "Прокачать бицепс",
    note: "Выбираются друзья с наибольшим авторитетом. Каждая цель используется один раз за игровой день; завершённые цели пропускаются.",
  },
  Fight: {
    label: "Подраться",
    note: "Выбираются друзья с наименьшим авторитетом. Повторные действия с одной целью разрешены.",
  },
  Harknut: {
    label: "Харкнуть",
    note: "Выбираются друзья с наименьшим авторитетом. Каждая цель используется один раз за игровой день.",
  },
  TossDroj: {
    label: "Подкинуть дрожжи",
    note: "Выбираются друзья с наименьшим авторитетом. Каждая цель используется один раз за игровой день.",
  },
});

const UI_TEXT_TRANSLATIONS = Object.freeze({
  "Active": "Активен",
  "Action": "Действие",
  "All bosses": "Все боссы",
  "Auto": "Автоматически",
  "Attack": "Атака",
  "Authority": "Авторитет",
  "Auto-run": "Автопрохождение",
  "Battle": "Бой",
  "Battle mode": "Режим боя",
  "Blocked": "Заблокирован",
  "Boss": "Босс",
  "Brigade": "Бригада",
  "Buy": "Купить",
  "Buying...": "Покупка…",
  "Camera": "Камера",
  "Can kill": "Можно победить",
  "Claim failed": "Не удалось забрать награду",
  "Claimed": "Награда получена",
  "Clothing": "Одежда",
  "Collecting": "Сбор данных",
  "Collection": "Коллекция",
  "Combo": "Комбо",
  "Combo cost": "Стоимость комбо",
  "Combo pierced": "Комбо пробито",
  "Complete modes": "Завершённые режимы",
  "Count": "Количество",
  "Current HP": "Текущее здоровье",
  "Cycles": "Циклы",
  "Daily": "За день",
  "Damage": "Урон",
  "Default exclusions": "Исключения по умолчанию",
  "Delay": "Задержка",
  "Dry run": "Проверка без действий",
  "Excluded": "Исключено",
  "Fail": "Ошибка",
  "Finished": "Завершено",
  "Friends": "Друзья",
  "Generated": "Сформировано",
  "Hit": "Удар",
  "Hit failed": "Ошибка удара",
  "Hits": "Удары",
  "Hourly": "За час",
  "Issue": "Ошибка",
  "Level": "Уровень",
  "Loading": "Загрузка",
  "Log is empty": "Журнал пуст",
  "Mode": "Режим",
  "No combo": "Без комбо",
  "No history yet": "Истории пока нет",
  "OK": "Готово",
  "Online": "В сети",
  "Other": "Другое",
  "Punch Chest": "Удар в грудь",
  "Kick Balls": "Удар в пах",
  "Poke Eyes": "Удар в глаза",
  "Knee Ear": "Удар коленом",
  "Poison": "Яд",
  "Gunshot": "Самопал",
  "Knife": "Финка",
  "Player economy response is incomplete.": "Ответ с данными экономики игрока неполный.",
  "Preparing": "Подготовка",
  "Preparing targets": "Подготовка целей",
  "Prison": "Тюрьма",
  "Processed": "Обработано",
  "Queue length": "Длина очереди",
  "Queue total": "Всего в очереди",
  "Queued bosses": "Боссов в очереди",
  "Ready": "Готово",
  "Remaining": "Осталось",
  "Requested": "Запрошено",
  "Reward": "Награда",
  "Rubles now": "Рублей сейчас",
  "Run #": "Запуск №",
  "Selected": "Выбрано",
  "Skipped done": "Пропущено завершённых",
  "Skipped existing": "Пропущено существующих",
  "Skipped processed": "Пропущено обработанных",
  "Startable": "Доступные для запуска",
  "Started": "Запущено",
  "Status": "Статус",
  "Step": "Шаг",
  "Steps": "Шаги",
  "Steps completed": "Шагов выполнено",
  "Still missing": "Ещё не собрано",
  "Target": "Цель",
  "Targeting": "Выбор целей",
  "Tattoo": "Наколка",
  "Time left": "Осталось времени",
  "Top All": "Топ всех",
  "Top Brigade": "Топ бригады",
  "Top Friends": "Топ друзей",
  "Total damage": "Общий урон",
  "Total HP": "Всего здоровья",
  "Tracked since": "Отслеживается с",
  "Unique IDs": "Уникальные ID",
  "Unique rewards": "Уникальные награды",
  "Unknown item": "Неизвестный предмет",
  "Unlocked": "Открыто",
  "Update": "Обновление",
  "Updated": "Обновлено",
  "Use": "Расход",
  "Visible": "Показано",
  "Waiting for a reliable window": "Ожидание надёжного периода",
  "Weapons net": "Изменение оружия",
  "Weekly": "За неделю",
  "Without authority": "Без авторитета",
  "Attack queue add": "Удар добавлен в очередь",
  "Attack queue cleared": "Очередь ударов очищена",
  "Attack queue remove": "Удар удалён из очереди",
  "Auth accounts failed": "Не удалось загрузить аккаунты",
  "Auth account switched": "Аккаунт переключён",
  "Auth account switch failed": "Не удалось переключить аккаунт",
  "Auth status refreshed": "Статус авторизации обновлён",
  "Auth status failed": "Не удалось обновить авторизацию",
  "Auth login": "Вход в аккаунт",
  "Auth login failed": "Не удалось войти в аккаунт",
  "Boss run queue cleared": "Очередь запусков боссов очищена",
  "Boss run queue loaded": "Очередь запусков боссов загружена",
  "Boss run queue reset": "Очередь запусков боссов сброшена",
  "Boss queue add": "Босс добавлен в очередь",
  "Boss queue add skipped": "Босс не добавлен в очередь",
  "Boss queue add cancelled": "Добавление босса отменено",
  "Boss queue build empty": "Автоочередь боссов пуста",
  "Boss queue build cancelled": "Формирование очереди отменено",
  "Boss queue build failed": "Не удалось сформировать очередь боссов",
  "Boss queue reordered": "Порядок боссов изменён",
  "Boss queue remove": "Босс удалён из очереди",
  "Boss queued": "Босс поставлен в очередь",
  "Boss dequeued": "Босс удалён из очереди",
  "Boss queue sync conflict": "Очередь боссов обновлена с сервера",
  "Boss combo template saved": "Шаблон комбо сохранён",
  "Boss combo template loaded": "Шаблон комбо загружен",
  "Boss combo template deleted": "Шаблон комбо удалён",
  "Boss combo templates reset": "Шаблоны комбо сброшены",
  "Boss combo templates loaded": "Шаблоны комбо загружены",
  "Boss combo setup requested": "Нужно настроить комбо",
  "Boss exclusion templates loaded": "Наборы выбора боссов загружены",
  "Boss selection template applied": "Набор выбора боссов применён",
  "Boss selection template saved": "Набор выбора боссов сохранён",
  "Boss selection template created": "Набор выбора боссов создан",
  "Boss selection template deleted": "Набор выбора боссов удалён",
  "Boss auto hit skipped": "Автоудар по боссу пропущен",
  "Boss auto hit failed": "Автоудар по боссу не выполнен",
  "Boss start next": "Запуск следующего босса",
  "Boss start next failed": "Не удалось запустить следующего босса",
  "Boss auto refresh enabled": "Автообновление боссов включено",
  "Boss auto refresh disabled": "Автообновление боссов выключено",
  "Boss auto refresh": "Автообновление боссов",
  "Boss auto refresh failed": "Не удалось изменить автообновление боссов",
  "Boss auto interval": "Интервал автоматики боссов",
  "Boss auto interval failed": "Не удалось изменить интервал автоматики боссов",
  "Boss auto start": "Автозапуск боссов",
  "Boss auto start failed": "Не удалось изменить автозапуск боссов",
  "Boss queue preset saved": "Набор очереди боссов сохранён",
  "Boss queue preset loaded": "Набор очереди боссов загружен",
  "Boss queue preset deleted": "Набор очереди боссов удалён",
  "Prison costs refreshed": "Расходы тюрьмы обновлены",
  "Server shutdown": "Локальный сервер останавливается",
  "Server shutdown failed": "Не удалось остановить локальный сервер",
  "Auto-run enabled": "Автопрохождение включено",
  "Auto-run disabled": "Автопрохождение выключено",
  "yes": "да",
  "no": "нет",
  "pending": "ожидание",
  "planned": "запланировано",
  "found": "найден",
  "missing": "отсутствует",
  "unknown": "неизвестно",
  "blocked": "заблокировано",
  "active": "активен",
  "startable": "доступен для запуска",
  "defaults": "по умолчанию",
  "measuring": "измерение",
  "none excluded": "исключений нет",
  "reward claimed": "награда получена",
  "no change": "без изменений",
  "all bosses": "все боссы",
  "bespredelschiki": "беспредельщики",
  "nadzirateli": "надзиратели",
  "recidivisty": "рецидивисты",
  "auth status": "проверка авторизации",
  "auth status error": "ошибка проверки авторизации",
  "auth login": "вход в аккаунт",
  "auth login error": "ошибка входа",
  "boss state": "обновление состояния босса",
  "boss state error": "ошибка состояния босса",
  "saving boss automation": "сохранение автоматики боссов",
  "boss automation error": "ошибка автоматики боссов",
  "building boss queue": "формирование очереди боссов",
  "boss queue build error": "ошибка формирования очереди боссов",
  "starting next boss": "запуск следующего босса",
  "boss start error": "ошибка запуска босса",
  "loading bosses": "загрузка боссов",
  "boss error": "ошибка данных боссов",
  "boss action error": "ошибка действия с боссом",
  "collecting": "сбор данных",
  "friends error": "ошибка работы с друзьями",
  "friends summary error": "ошибка сводки друзей",
  "sending invites": "отправка приглашений",
  "invite preview": "проверка приглашений",
  "invite error": "ошибка приглашений",
  "accepting requests": "приём заявок",
  "accept preview": "проверка приёма заявок",
  "accept error": "ошибка приёма заявок",
  "cleaning friends": "чистка друзей",
  "cleanup preview": "проверка чистки друзей",
  "cleanup error": "ошибка чистки друзей",
  "running action": "выполнение действия",
  "action preview": "проверка действия",
  "action error": "ошибка действия",
  "damage intel": "обновление статистики урона",
  "damage invite error": "ошибка приглашений из статистики урона",
  "loading MISC": "загрузка раздела «Разное»",
  "MISC error": "ошибка раздела «Разное»",
  "checking daily task": "проверка ежедневного задания",
  "daily task error": "ошибка ежедневного задания",
  "loading event": "загрузка события",
  "event error": "ошибка события",
  "event inactive": "событие неактивно",
  "saving event automation": "сохранение автоматики события",
  "event save error": "ошибка сохранения события",
  "running event tick": "запуск проверки события",
  "event tick error": "ошибка проверки события",
  "loading prison": "загрузка тюрьмы",
  "loading detail": "загрузка подробностей",
  "detail error": "ошибка загрузки подробностей",
  "saving prison": "сохранение настроек тюрьмы",
  "prison save error": "ошибка сохранения тюрьмы",
  "checking prison": "проверка тюрьмы",
  "prison tick error": "ошибка проверки тюрьмы",
  "collecting profit": "сбор общака",
  "collecting heat": "сбор подогрева",
  "profit error": "ошибка сбора общака",
  "heat error": "ошибка сбора подогрева",
  "buying master items": "покупка вещей мастера",
  "purchase blocked": "покупка недоступна",
  "master purchase error": "ошибка покупки вещей мастера",
  "prison preview": "проверка прохода",
  "running prison": "прохождение тюрьмы",
  "prison run error": "ошибка прохождения тюрьмы",
  "stopping server": "остановка сервера",
  "server stopped": "сервер остановлен",
  "server shutdown error": "ошибка остановки сервера",
  "meta error": "ошибка загрузки метаданных",
  "Connected": "Подключено",
  "The local server is stopping": "Локальный сервер останавливается",
  "Stopping...": "Остановка…",
  "spin_cooldown": "пауза между вращениями",
  "wheel-spin": "вращение колеса",
  "arrival closed": "прибытие закрыто",
  "mode unavailable": "режим недоступен",
  "no mode": "режим не выбран",
  "boss daily limit": "дневной лимит босса",
  "unknown source": "неизвестный источник",
  "Custom exclusions": "Свои исключения",
  "Default template is locked.": "Шаблон по умолчанию защищён от изменений.",
  "Automation changed the queue; loaded the latest server queue.": "Автоматика изменила очередь — загружена последняя версия с сервера.",
  "Select boss to see key purchase options.": "Выберите босса, чтобы увидеть варианты покупки ключа.",
  "Combo list is empty or has unsupported actions.": "Список комбо пуст или содержит неподдерживаемые действия.",
  "Select boss and combo mode before load.": "Перед загрузкой выберите босса и режим комбо.",
  "Select boss and combo mode before save.": "Перед сохранением выберите босса и режим комбо.",
  "All rewards collected.": "Все награды собраны.",
  "Damage report loaded.": "Отчёт об уроне загружен.",
  "Uses your current friends, ordered by authority.": "Используются текущие друзья в порядке авторитета.",
});

const UI_TEXT_REPLACEMENTS = Object.freeze([
  ["Auth status", "Статус авторизации"],
  ["Access token", "Токен доступа"],
  ["Refresh token", "Токен обновления"],
  ["Access exp", "Срок токена доступа"],
  ["Refresh exp", "Срок токена обновления"],
  ["Session file", "Файл сессии"],
  ["Current day checkpoint", "Текущая дневная точка"],
  ["Current night checkpoint", "Текущая ночная точка"],
  ["Full window", "Полный период"],
  ["Tracked since", "Отслеживается с"],
  ["Day runs", "Дневные проходы"],
  ["Night runs", "Ночные проходы"],
  ["Escape parts", "Детали побега"],
  ["Mobile parts", "Детали телефона"],
  ["Friend requests", "Заявки в друзья"],
  ["Collected IDs", "Собранные ID"],
  ["Batch range", "Диапазон пачки"],
  ["Pool order", "Порядок списка"],
  ["Halted reason", "Причина остановки"],
  ["Total HP", "Всего здоровья"],
  ["Current HP", "Текущее здоровье"],
  ["Need keys", "Нужны ключи"],
  ["Complete modes", "Завершённые режимы"],
  ["Bosses with rewards", "Боссы с наградами"],
  ["Punch Chest", "Удар в грудь"],
  ["Kick Balls", "Удар в пах"],
  ["Poke Eyes", "Удар в глаза"],
  ["Knee Ear", "Удар коленом"],
  ["Poison", "Яд"],
  ["Gunshot", "Самопал"],
  ["Knife", "Финка"],
  ["keychain bypass", "ключ не требуется"],
  ["in prisons", "в тюрьмах"],
  ["Buy x", "Купить ×"],
  ["Battle mode", "Режим боя"],
  ["Combo mode", "Режим комбо"],
  ["from boss", "от босса"],
  ["missing keys", "не хватает ключей"],
  ["left today", "осталось сегодня"],
  ["rewards are not described in the catalog", "награды не описаны в каталоге"],
  ["spin_cooldown", "пауза между вращениями"],
  ["wheel-spin", "вращение колеса"],
  ["collected", "собрано"],
  ["in stock", "в запасе"],
  ["damage / stock", "урон / запас"],
  ["hits", "ударов"],
  ["hit", "удар"],
  ["reward", "награда"],
  ["started", "запущен"],
  ["queued", "в очереди"],
  ["excluded", "исключено"],
  ["blocked", "заблокировано"],
  ["Bespredelschiki", "Беспредельщики"],
  ["Nadzirateli", "Надзиратели"],
  ["Recidivisty", "Рецидивисты"],
  ["pacansky", "пацанский"],
  ["blotnoy", "блатной"],
  ["avtoritetny", "авторитетный"],
  ["vorovskoy", "воровской"],
  ["complete", "собрано"],
  ["missing", "не хватает"],
  ["have", "в наличии"],
  ["rubles", "рублей"],
  ["paper", "бумаги"],
  ["dmg", "урона"],
  ["left", "осталось"],
  ["templates", "шаблоны"],
  ["template", "шаблон"],
  ["dashboard", "панель"],
  ["refreshed", "обновлено"],
  ["refresh", "обновление"],
  ["loaded", "загружено"],
  ["saved", "сохранено"],
  ["deleted", "удалено"],
  ["cleared", "очищено"],
  ["queue", "очередь"],
  ["added", "добавлено"],
  ["removed", "удалено"],
  ["enabled", "включено"],
  ["disabled", "выключено"],
  ["interval", "интервал"],
  ["friends", "друзья"],
  ["invites", "приглашения"],
  ["requests", "заявки"],
  ["login", "вход"],
  ["preload", "предзагрузка"],
  ["startup", "запуск"],
  ["catalog", "каталог"],
  ["state", "состояние"],
  ["server", "сервер"],
  ["keys", "ключи"],
  ["skipped", "пропущено"],
  ["automation", "автоматика"],
  ["duration", "длительность"],
  ["ready", "готово"],
]);

const state = {
  activeStorageAccountId: null,
  interactionTypes: [],
  auth: null,
  savedAuthAccounts: null,
  economy: null,
  economyPollTimerId: null,
  economyRefreshRunning: false,
  headerExtras: null,
  headerExtrasPollTimerId: null,
  headerExtrasRefreshRunning: false,
  dashboardResourceSlots: [],
  dashboardHeroSlots: [],
  dashboardResourceDrag: null,
  dashboardCatalogTarget: null,
  friendsCollected: null,
  friendsResult: null,
  friendsSummary: null,
  activeFriendsSection: "friends",
  friendsBatchProgress: null,
  friendsBatchPollTimerId: null,
  aboutSponsors: [],
  aboutSponsorsLoaded: false,
  aboutSponsorsLoadPromise: null,
  aboutSponsorsLoadError: null,
  aboutSponsorsRetryTimer: null,
  aboutSponsorsRetryCount: 0,
  aboutSponsorFilter: "all",
  aboutSponsorFriendStatuses: new Map(),
  aboutSponsorFriendStatusesLoaded: false,
  aboutSponsorFriendStatusesLoading: false,
  aboutSponsorInvitesRunning: new Set(),
  friendsDamageReports: {
    hourly: null,
    daily: null,
    weekly: null,
  },
  friendsDamageErrors: {
    hourly: null,
    daily: null,
    weekly: null,
  },
  friendsDamageHistory: null,
  friendsDamageScope: "overall",
  friendsDamageInviteRunning: {
    hourly: false,
    daily: false,
    weekly: false,
  },
  prisonCosts: null,
  prisonStatus: null,
  prisonDetail: null,
  prisonResult: null,
  prisonDashboard: null,
  prisonAutomation: null,
  prisonCountdownTimerId: null,
  zarubaDashboard: null,
  zarubaActionPreview: null,
  zarubaPollTimerId: null,
  zarubaRefreshRunning: false,
  miscDashboard: null,
  activeMiscSection: "deals",
  bagsDashboard: null,
  bagsFamily: "zaruba",
  bagsZarubaMode: "pacan",
  bagsLastReward: null,
  bagsRefreshTimerId: null,
  bagsRefreshRunning: false,
  lootContainersDashboard: null,
  lootContainerOpeningKind: null,
  wearableCollectionDashboard: null,
  wearableCollectionGroups: new Map(),
  wearableCollectionRenderFrame: null,
  wearableCollectionCategoryFilter: "all",
  wearableCollectionKindFilter: "all",
  miscPollTimerId: null,
  miscVparitPollTimerId: null,
  miscGameSession: null,
  miscPokerSelection: [],
  letsCookDashboard: null,
  letsCookPollTimerId: null,
  bossDashboard: null,
  bossBuffs: null,
  bossBuffsError: null,
  bossBuffsLoading: false,
  bossCatalogCategoryFilter: "all",
  damageCalculator: {
    weapon: "poison",
    mode: "quantity",
    targetKind: "boss",
    selectedBuffIds: new Set(),
  },
  bossRewardBossId: null,
  bossState: null,
  bossStateRequestVersion: 0,
  bossStateAppliedRequestVersion: 0,
  bossDashboardRequestVersion: 0,
  bossDashboardAppliedRequestVersion: 0,
  bossDashboardFullRequestPromise: null,
  bossResumeRefreshRunning: false,
  bossResult: null,
  bossSurrenderRunning: false,
  bossNeedleRunning: false,
  bossMeleeRestoreRunning: new Set(),
  bossStartSyncVersion: 0,
  bossQueue: [],
  bossFightHpCache: {
    key: null,
    maxHp: null,
  },
  bossFightMeta: {
    bossId: null,
    mode: null,
    sessionId: null,
    endsAt: null,
    comboMode: null,
    comboSuccess: null,
    comboCostRubles: null,
  },
  bossRunQueue: [],
  bossRunQueueDateKey: null,
  bossRunQueueLastLocalEditAt: 0,
  bossRunQueueLastServerUpdatedAt: 0,
  bossRunQueueServerRevision: 0,
  bossRunQueuePendingSaves: 0,
  bossRunQueueSaveVersion: 0,
  zarubaAutomationSaveOperation: null,
  zarubaAutomationSaveSequence: 0,
  zarubaAutomationSaveResetTimerId: null,
  bossRunQueuePresets: {},
  bossRunQueueModeOverrides: {},
  bossRunQueueDrag: null,
  // `null` means "all bosses" until the catalog is available.  Keeping this
  // explicit makes the UI a whitelist without accidentally persisting an
  // empty selection during initial page load.
  bossRunQueueSelectedIds: null,
  bossRunQueueLegacyExcludedIds: null,
  bossQueueSettings: null,
  bossSmartQueueCollectionEnabled: false,
  bossExcludeTemplates: {},
  bossExcludeTemplateId: BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID,
  bossExcludeDeletedBuiltInIds: new Set(),
  bossComboTemplates: {},
  bossComboLibrary: null,
  bossComboDateKey: null,
  bossComboDialogApplyToMainSelection: true,
  bossComboMidnightTimerId: null,
  bossCountdownTimerId: null,
  bossAuto: {
    enabled: false,
    running: false,
    timerId: null,
    intervalSec: BOSS_AUTO_REFRESH_DEFAULT_SEC,
    localIntervalSec: null,
    timerActive: false,
    tickCount: 0,
    lastTickStartedAt: null,
    lastTickFinishedAt: null,
    autoStartNext: true,
    serverRunning: false,
    lastError: null,
    lastAction: null,
    lastStarted: null,
    snoozedUntil: null,
    snoozeReason: null,
    pendingReward: null,
    rewardSettlementTimers: [],
    recentActivity: [],
    activityLogInitialized: false,
    seenActivityKeys: new Set(),
    logRefreshing: false,
  },
  apiRequestInflight: new Map(),
  authGateActive: false,
  logs: [],
  journal: {
    currentSource: "bosses",
    dismissedKeys: new Set(),
    nextId: 1,
  },
  friendsAutoAccept: {
    enabled: false,
    running: false,
    timerId: null,
  },
  autoRun: {
    enabled: false,
    running: false,
    timerId: null,
  },
  pageLoads: new Map(),
  pageLoadingEnabled: false,
  pagePrefetchGeneration: 0,
};

function $(selector) {
  return document.querySelector(selector);
}

function initializeInitialLoader() {
  const retryButton = $("#initial-loader-retry");
  if (retryButton && retryButton.dataset.bound !== "true") {
    retryButton.dataset.bound = "true";
    retryButton.addEventListener("click", () => window.location.reload());
  }
}

function updateInitialLoadProgress(progress, status, detail = "") {
  const normalizedProgress = Math.max(0, Math.min(100, Number(progress) || 0));
  const loader = $("#initial-loader");
  const progressElement = $("#initial-loader-progress");
  const progressBar = $("#initial-loader-progress-bar");
  const statusElement = $("#initial-loader-status");
  const detailElement = $("#initial-loader-detail");

  if (loader) {
    loader.dataset.state = "loading";
  }
  if (progressElement) {
    progressElement.setAttribute("aria-valuenow", String(Math.round(normalizedProgress)));
  }
  if (progressBar) {
    progressBar.style.width = `${normalizedProgress}%`;
  }
  if (statusElement && status) {
    statusElement.textContent = status;
  }
  if (detailElement) {
    detailElement.textContent = detail || "Это займёт несколько секунд.";
  }
}

function finishInitialLoad() {
  updateInitialLoadProgress(100, "Готово", "Основные данные загружены. Остальное обновляется в фоне.");

  revealApplicationShell();
}

function revealApplicationShell() {
  const loader = $("#initial-loader");
  const shell = $(".app-shell");
  const authGate = $("#auth-gate");
  const retryButton = $("#initial-loader-retry");

  state.authGateActive = false;
  document.body.classList.remove("app-loading", "app-load-error", "app-auth-required");
  document.body.classList.add("app-ready");
  syncJournalContext();
  if (shell) {
    shell.removeAttribute("inert");
    shell.setAttribute("aria-hidden", "false");
  }
  if (authGate) {
    authGate.hidden = true;
    authGate.setAttribute("aria-hidden", "true");
  }
  if (retryButton) {
    retryButton.hidden = true;
  }
  if (loader) {
    loader.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      loader.hidden = true;
    }, 280);
  }
}

function failInitialLoad(error) {
  const loader = $("#initial-loader");
  const title = $("#initial-loader-title");
  const statusElement = $("#initial-loader-status");
  const detailElement = $("#initial-loader-detail");
  const retryButton = $("#initial-loader-retry");
  const reason = error && error.message ? error.message : String(error || "Неизвестная ошибка");

  if (document.body.classList.contains("app-ready")) {
    setServerStatus("Ошибка загрузки данных", "error");
    appendLog("Ошибка фоновой загрузки", reason);
    renderLog();
    return;
  }

  document.body.classList.remove("app-loading", "app-ready");
  document.body.classList.add("app-load-error");
  if (loader) {
    loader.hidden = false;
    loader.dataset.state = "error";
    loader.setAttribute("role", "alert");
    loader.removeAttribute("aria-hidden");
  }
  if (title) {
    title.textContent = "Не удалось загрузить панель";
  }
  if (statusElement) {
    statusElement.textContent = "Проверь, запущен ли локальный сервер, и попробуй ещё раз.";
  }
  if (detailElement) {
    detailElement.textContent = reason;
  }
  if (retryButton) {
    retryButton.hidden = false;
  }
}

const PAGE_LOAD_DEFINITIONS = Object.freeze({
  bosses: Object.freeze({
    label: "Боссы",
    detail: "Получаем каталог, оружие и состояние активного боя.",
    targets: ['.tab-panel[data-panel="bosses"]'],
    async load() {
      const dashboard = await handleBossDashboard({
        silent: true,
        showStatus: false,
        syncQueue: true,
      });
      requirePageLoadResult(dashboard, "Не удалось загрузить панель боссов.");
      const bossState = await handleBossStateRefresh({ silent: true, showStatus: false });
      requirePageLoadResult(bossState, "Не удалось получить состояние активного боя.");
      applyStoredComboTemplateForMainSelection({ silent: true });
      syncBossAutoRefreshLocal({ silent: true });
      updateBossAutoStatus();
      return { dashboard, bossState };
    },
  }),
  prison: Object.freeze({
    label: "Тюрьма",
    detail: "Загружаем зоны, стоимость ходок и выбранную цель.",
    targets: ['.tab-panel[data-panel="prison"]'],
    async load() {
      return requirePageLoadResult(
        await handlePrisonStatus({ syncControls: true }),
        "Не удалось загрузить тюрьму.",
      );
    },
  }),
  zaruba: Object.freeze({
    label: "Зарубы",
    detail: "Получаем задания, режимы и состояние автоматики.",
    targets: ['.tab-panel[data-panel="zaruba"]'],
    async load() {
      return requirePageLoadResult(
        await handleZarubaDashboard({ silent: true, syncControls: true }),
        "Не удалось загрузить Зарубы.",
      );
    },
  }),
  "friends-main": Object.freeze({
    label: "Друзья",
    detail: "Получаем список друзей и готовность массовых действий.",
    targets: ['.friends-section-panel[data-friends-section="friends"]'],
    singleSurface: true,
    async load() {
      return requirePageLoadResult(
        await refreshFriendsSummary({ silent: true }),
        "Не удалось загрузить сводку друзей.",
      );
    },
  }),
  "friends-damage": Object.freeze({
    label: "Статистика урона",
    detail: "Собираем отчёты за час, день и неделю.",
    targets: ['.friends-section-panel[data-friends-section="damage"]'],
    async load() {
      return requirePageLoadResult(
        await handleFriendsDamageRefresh({ silent: true, showStatus: false }),
        "Не удалось загрузить статистику урона.",
      );
    },
  }),
  "misc-core": Object.freeze({
    label: "Делюги",
    detail: "Загружаем делюги, нычки и игровые активности.",
    targets: [
      '.misc-section-panel[data-misc-section="deals"]',
      '.misc-section-panel[data-misc-section="stashes"]',
      '.misc-section-panel[data-misc-section="games"]',
    ],
    async load() {
      return requirePageLoadResult(
        await handleMiscDashboard({ silent: true }),
        "Не удалось загрузить раздел «Делюги».",
      );
    },
  }),
  bags: Object.freeze({
    label: "Сумки",
    detail: "Получаем сумки Зарубы и бригады.",
    targets: ['.misc-section-panel[data-misc-section="bags"]'],
    async load() {
      return requirePageLoadResult(
        await handleBagsDashboard({ silent: true }),
        "Не удалось загрузить сумки.",
      );
    },
  }),
  containers: Object.freeze({
    label: "Посылки и баулы",
    detail: "Проверяем содержимое, уровни и доступные награды.",
    targets: ['.misc-section-panel[data-misc-section="containers"]'],
    async load() {
      return requirePageLoadResult(
        await handleLootContainersDashboard({ silent: true }),
        "Не удалось загрузить посылки и баулы.",
      );
    },
  }),
  collection: Object.freeze({
    label: "Коллекция вещей",
    detail: "Загружаем сохранённый каталог вещей и наколок.",
    targets: ['.misc-section-panel[data-misc-section="collection"]'],
    async load() {
      return requirePageLoadResult(
        await handleWearableCollectionDashboard(),
        "Не удалось загрузить коллекцию вещей.",
      );
    },
  }),
  events: Object.freeze({
    label: "События",
    detail: "Проверяем активное событие и его автоматику.",
    targets: ['.misc-section-panel[data-misc-section="events"]'],
    async load() {
      return requirePageLoadResult(
        await handleLetsCookDashboard({ silent: true }),
        "Не удалось загрузить события.",
      );
    },
  }),
  about: Object.freeze({
    label: "О боте",
    detail: "Загружаем список тех, кто подогрел проект.",
    targets: ['.tab-panel[data-panel="about"]'],
    async load() {
      await handleAboutTabOpen();
      if (state.aboutSponsorsLoadError) {
        throw state.aboutSponsorsLoadError;
      }
      return state.aboutSponsors;
    },
  }),
});

const PAGE_PREFETCH_ORDER = Object.freeze([
  "prison",
  "zaruba",
  "friends-main",
  "misc-core",
  "friends-damage",
  "bags",
  "containers",
  "events",
  "about",
  "collection",
]);
const PAGE_CACHE_STALE_MS = 60_000;

function requirePageLoadResult(payload, message) {
  if (payload === null || payload === undefined) {
    throw new Error(message);
  }
  return payload;
}

function getPageLoadEntry(key) {
  if (!state.pageLoads.has(key)) {
    state.pageLoads.set(key, {
      status: "idle",
      promise: null,
      value: null,
      error: null,
      loadedAt: null,
    });
  }
  return state.pageLoads.get(key);
}

function createPageLoadSurface(key, definition) {
  const surface = document.createElement("div");
  surface.className = "page-load-surface";
  surface.dataset.pageLoadSurface = key;
  surface.setAttribute("role", "status");
  surface.setAttribute("aria-live", "polite");
  surface.innerHTML = `
    <div class="page-load-card">
      <div class="page-load-spinner" aria-hidden="true"><span></span></div>
      <div class="page-load-copy">
        <strong></strong>
        <span></span>
      </div>
      <div class="page-load-skeleton" aria-hidden="true">
        <i></i><i></i><i></i>
      </div>
      <button class="action-button action-button-ghost" type="button" data-page-load-retry="${key}" hidden>Повторить</button>
    </div>
  `;
  surface.querySelector("strong").textContent = `Загружаем: ${definition.label}`;
  surface.querySelector(".page-load-copy > span").textContent = definition.detail;
  return surface;
}

function ensurePageLoadSurfaces() {
  Object.entries(PAGE_LOAD_DEFINITIONS).forEach(([key, definition]) => {
    let surfaceCreated = false;
    definition.targets.forEach((selector) => {
      document.querySelectorAll(selector).forEach((target) => {
        const existingSurface = target.querySelector(`:scope > [data-page-load-surface="${key}"]`);
        if (existingSurface) {
          surfaceCreated = true;
          return;
        }
        if (
          (!definition.singleSurface || !surfaceCreated)
        ) {
          target.prepend(createPageLoadSurface(key, definition));
          surfaceCreated = true;
        }
      });
    });
    renderPageLoadState(key);
  });
}

function renderPageLoadState(key) {
  const definition = PAGE_LOAD_DEFINITIONS[key];
  if (!definition) return;
  const entry = getPageLoadEntry(key);
  let targetIndex = 0;
  definition.targets.forEach((selector) => {
    document.querySelectorAll(selector).forEach((target) => {
      const surface = target.querySelector(`:scope > [data-page-load-surface="${key}"]`);
      const isReady = entry.status === "ready";
      const isError = entry.status === "error";
      target.classList.toggle("is-page-loading", !isReady);
      target.classList.toggle("page-load-secondary", Boolean(definition.singleSurface && targetIndex > 0 && !isReady));
      target.setAttribute("aria-busy", String(entry.status === "loading"));
      targetIndex += 1;
      if (!surface) return;
      surface.hidden = isReady;
      surface.dataset.state = entry.status;
      const title = surface.querySelector("strong");
      const detail = surface.querySelector(".page-load-copy > span");
      const retry = surface.querySelector("[data-page-load-retry]");
      if (title) {
        title.textContent = isError
          ? `Не удалось загрузить: ${definition.label}`
          : entry.status === "idle"
            ? `${definition.label} ещё не загружен`
            : `Загружаем: ${definition.label}`;
      }
      if (detail) {
        detail.textContent = isError
          ? formatUserFacingError(entry.error) || "Повторите попытку."
          : definition.detail;
      }
      if (retry) retry.hidden = !isError;
    });
  });
}

function setPageLoadState(key, status, patch = {}) {
  const entry = getPageLoadEntry(key);
  Object.assign(entry, patch, { status });
  renderPageLoadState(key);
  return entry;
}

async function ensurePageLoaded(key, options = {}) {
  const definition = PAGE_LOAD_DEFINITIONS[key];
  if (!definition || (!state.pageLoadingEnabled && !options.allowBeforeReady)) {
    return null;
  }
  const entry = getPageLoadEntry(key);
  if (entry.promise) return entry.promise;
  const loadedAtMs = entry.loadedAt ? Date.parse(entry.loadedAt) : 0;
  const cacheIsStale = !loadedAtMs || Date.now() - loadedAtMs >= PAGE_CACHE_STALE_MS;
  if (
    entry.status === "ready"
    && !options.force
    && (!options.refreshIfStale || !cacheIsStale)
  ) {
    return entry.value;
  }
  const preserveReadyState = entry.status === "ready" && options.refreshIfStale && !options.force;

  const request = (async () => {
    if (!preserveReadyState) {
      setPageLoadState(key, "loading", { error: null });
    }
    try {
      const value = await definition.load();
      setPageLoadState(key, "ready", {
        value,
        error: null,
        loadedAt: new Date().toISOString(),
      });
      return value;
    } catch (error) {
      if (preserveReadyState) {
        setPageLoadState(key, "ready", { error });
      } else {
        setPageLoadState(key, "error", { error });
      }
      if (!options.background) {
        appendLog(`Не загрузилось: ${definition.label}`, formatUserFacingError(error) || String(error), {
          kind: "error",
          important: true,
        });
      }
      throw error;
    } finally {
      if (entry.promise === request) entry.promise = null;
    }
  })();
  entry.promise = request;
  return request;
}

function miscSectionPageKey(section = state.activeMiscSection) {
  return {
    deals: "misc-core",
    stashes: "misc-core",
    games: "misc-core",
    bags: "bags",
    events: "events",
    containers: "containers",
    collection: "collection",
  }[section] || "misc-core";
}

function loadActiveTabPage(tab) {
  const key = tab === "misc"
    ? miscSectionPageKey()
    : tab === "friends"
      ? (state.activeFriendsSection === "damage" ? "friends-damage" : "friends-main")
      : tab;
  if (!PAGE_LOAD_DEFINITIONS[key]) return Promise.resolve(null);
  return ensurePageLoaded(key, { refreshIfStale: true, background: true });
}

function resetPageLoadRegistry() {
  state.pagePrefetchGeneration += 1;
  state.pageLoads.clear();
  ensurePageLoadSurfaces();
}

function waitForPagePrefetchIdle() {
  return new Promise((resolve) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => resolve(), { timeout: 1500 });
    } else {
      window.setTimeout(resolve, 250);
    }
  });
}

function startPagePrefetch() {
  const generation = ++state.pagePrefetchGeneration;
  void (async () => {
    for (const key of PAGE_PREFETCH_ORDER) {
      await waitForPagePrefetchIdle();
      if (generation !== state.pagePrefetchGeneration) return;
      const entry = getPageLoadEntry(key);
      if (entry.status === "ready" || entry.promise) continue;
      await ensurePageLoaded(key, { background: true }).catch(() => null);
    }
  })();
}

function initializePageLoading() {
  ensurePageLoadSurfaces();
  document.addEventListener("click", (event) => {
    const retry = event.target.closest("[data-page-load-retry]");
    if (!retry) return;
    void ensurePageLoaded(retry.dataset.pageLoadRetry, { force: true }).catch(() => null);
  });
}

function translateUiText(value) {
  const source = String(value ?? "");
  if (!/[A-Za-z]/.test(source)) {
    return source;
  }

  const parts = source.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const leading = parts ? parts[1] : "";
  const trailing = parts ? parts[3] : "";
  let text = parts ? parts[2] : source;
  if (!text) {
    return source;
  }

  if (Object.hasOwn(UI_TEXT_TRANSLATIONS, text)) {
    return `${leading}${UI_TEXT_TRANSLATIONS[text]}${trailing}`;
  }

  for (const [english, russian] of UI_TEXT_REPLACEMENTS) {
    const escaped = english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(/^[A-Za-z0-9_]+$/.test(english) ? `\\b${escaped}\\b` : escaped, "gi");
    text = text.replace(pattern, russian);
  }

  text = text
    .replace(/\b(\d+(?:[.,]\d+)?)\s*chars?\b/gi, "$1 симв.")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*hits?\b/gi, "$1 ударов")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*ms\b/gi, "$1 мс")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*sec(?:onds?)?\b/gi, "$1 сек.")
    .replace(/\b(\d+(?:[.,]\d+)?)\s*s\b/gi, "$1 сек.")
    .replace(/\b(\d+)d\b/gi, "$1 д.")
    .replace(/\b(\d+)h\b/gi, "$1 ч.")
    .replace(/\b(\d+)m\b/gi, "$1 мин.")
    .replace(/\bon\b/gi, "включено")
    .replace(/\boff\b/gi, "выключено")
    .replace(/\berror\b/gi, "ошибка")
    .replace(/\bfailed\b/gi, "не выполнено")
    .replace(/\bloading\b/gi, "загрузка")
    .replace(/\bunknown\b/gi, "неизвестно")
    .replace(/\bnone\b/gi, "нет")
    .replace(/\bavailable\b/gi, "доступно")
    .replace(/\bremaining\b/gi, "осталось")
    .replace(/\btotal\b/gi, "всего")
    .replace(/\bused\b/gi, "использовано")
    .replace(/\blimit\b/gi, "лимит")
    .replace(/\baction\b/gi, "действие")
    .replace(/\bstatus\b/gi, "статус")
    .replace(/\bmessage\b/gi, "сообщение")
    .replace(/\bmode\b/gi, "режим")
    .replace(/\bboss\b/gi, "босс")
    .replace(/\bcombo\b/gi, "комбо")
    .replace(/\bMSK\b/g, "МСК");

  return `${leading}${text}${trailing}`;
}

function localizeUiTree(root = document.body) {
  if (!root) {
    return;
  }

  const translateAttributes = (element) => {
    if (!(element instanceof Element)) {
      return;
    }
    for (const name of ["title", "aria-label", "placeholder"]) {
      if (!element.hasAttribute(name)) {
        continue;
      }
      const value = element.getAttribute(name);
      const translated = translateUiText(value);
      if (translated !== value) {
        element.setAttribute(name, translated);
      }
    }
  };

  if (root instanceof Element) {
    translateAttributes(root);
    root.querySelectorAll("[title], [aria-label], [placeholder]").forEach(translateAttributes);
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script, style, pre, code, textarea")) {
      continue;
    }
    const translated = translateUiText(node.nodeValue);
    if (translated !== node.nodeValue) {
      node.nodeValue = translated;
    }
  }
}

function initializeRussianUi() {
  localizeUiTree(document.body);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        const node = mutation.target;
        if (!node.parentElement || node.parentElement.closest("script, style, pre, code, textarea")) {
          continue;
        }
        const translated = translateUiText(node.nodeValue);
        if (translated !== node.nodeValue) {
          node.nodeValue = translated;
        }
        continue;
      }
      if (mutation.type === "attributes") {
        localizeUiTree(mutation.target);
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const translated = translateUiText(node.nodeValue);
          if (translated !== node.nodeValue) {
            node.nodeValue = translated;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          localizeUiTree(node);
        }
      }
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["title", "aria-label", "placeholder"],
  });
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("ru-RU").format(numeric);
}

function russianPlural(value, one, few, many) {
  const number = Math.abs(Math.trunc(Number(value) || 0));
  const lastTwo = number % 100;
  const last = number % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

function formatOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return formatNumber(value);
}

function formatBossCompactNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  const absolute = Math.abs(numeric);
  const compact = (divisor, suffix) => {
    const reduced = numeric / divisor;
    const digits = Math.abs(reduced) >= 100 ? 0 : Math.abs(reduced) >= 10 ? 1 : 2;
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(reduced)} ${suffix}`;
  };

  if (absolute >= 1_000_000_000) {
    return compact(1_000_000_000, "млрд");
  }
  if (absolute >= 1_000_000) {
    return compact(1_000_000, "млн");
  }
  if (absolute >= 1_000) {
    return compact(1_000, "тыс.");
  }
  return formatNumber(numeric);
}

function formatBossPacanskyHp(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  const absolute = Math.abs(numeric);
  if (absolute < 1_000) {
    return formatNumber(numeric);
  }

  let divisor = 1_000;
  let tier = 1;
  while (absolute >= divisor * 1_000 && Number.isFinite(divisor * 1_000)) {
    divisor *= 1_000;
    tier += 1;
  }

  const reduced = Math.trunc((numeric / divisor) * 100) / 100;
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(reduced)}${"к".repeat(tier)}`;
}

function formatBossCountdownValue(value) {
  if (!value) {
    return "-";
  }

  const deadline = new Date(value);
  if (Number.isNaN(deadline.getTime())) {
    return "-";
  }

  const totalSeconds = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

  return days > 0 ? `${days}d ${clock}` : clock;
}

function formatVpiTimeLeft(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) {
    return hours > 0 ? `${days} дн. ${hours} ч.` : `${days} дн.`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} ч. ${minutes} мин.` : `${hours} ч.`;
  }
  if (minutes > 0) {
    return `${minutes} мин.`;
  }
  return totalSeconds > 0 ? `${totalSeconds} сек.` : "сейчас";
}

function getVpiTierIconUrl(vpi) {
  const tierId = String(vpi && vpi.tier && vpi.tier.id || "").trim().toLowerCase();
  return VPI_TIER_ICON_URLS[tierId] || VPI_DEFAULT_ICON_URL;
}

function formatDurationMs(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "0 ms";
  }

  if (numeric < 1000) {
    return `${Math.round(numeric)} ms`;
  }

  const totalSeconds = numeric / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(totalSeconds >= 10 ? 1 : 2)} s`;
  }

  const totalWholeSeconds = Math.round(totalSeconds);
  const hours = Math.floor(totalWholeSeconds / 3600);
  const minutes = Math.floor((totalWholeSeconds % 3600) / 60);
  const seconds = totalWholeSeconds % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("ru-RU");
}

function formatCurrency(key, value) {
  if (!key) {
    return "-";
  }
  const label = CURRENCY_LABELS[key] || key;
  return `${label}: ${formatNumber(value ?? 0)}`;
}

function formatCurrencyAmounts(amounts) {
  const entries = amounts && typeof amounts === "object" ? Object.entries(amounts) : [];
  if (entries.length === 0) {
    return "ничего";
  }
  return entries
    .filter(([, value]) => Number(value || 0) !== 0)
    .map(([key, value]) => `${formatNumber(value)} ${PRISON_CURRENCY_LABELS[key] || CURRENCY_LABELS[key] || key}`)
    .join(" + ") || "ничего";
}

function compareCurrencyEntries(left, right) {
  const leftOrder = CURRENCY_DISPLAY_ORDER.indexOf(String(left[0]));
  const rightOrder = CURRENCY_DISPLAY_ORDER.indexOf(String(right[0]));
  if (leftOrder !== -1 || rightOrder !== -1) {
    if (leftOrder === -1) {
      return 1;
    }
    if (rightOrder === -1) {
      return -1;
    }
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
  }
  const leftValue = Number(left[1] ?? 0);
  const rightValue = Number(right[1] ?? 0);
  if (rightValue !== leftValue) {
    return rightValue - leftValue;
  }
  return String(left[0]).localeCompare(String(right[0]), "ru");
}

function buildBadge(label, tone = "neutral") {
  const className = tone === "danger"
    ? "badge badge-danger"
    : tone === "success"
      ? "badge"
      : "badge badge-neutral";
  return `<span class="${className}">${translateUiText(label)}</span>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderStatGrid(target, items) {
  if (!target) {
    return;
  }
  target.innerHTML = items.map((item) => `
    <div class="stat-card${item.iconUrl ? " has-icon" : ""}">
      ${item.iconUrl ? `<img class="stat-card-icon" src="${escapeHtml(item.iconUrl)}" alt="" loading="lazy">` : ""}
      <strong>${escapeHtml(translateUiText(item.value))}</strong>
      <span>${escapeHtml(translateUiText(item.label))}</span>
    </div>
  `).join("");
}

function setTextIfChanged(target, value) {
  const translated = translateUiText(value);
  if (target && target.textContent !== translated) {
    target.textContent = translated;
  }
}

function hasFocusedSelect(target) {
  const active = document.activeElement;
  return Boolean(
    target
    && active
    && String(active.tagName || "").toLowerCase() === "select"
    && (active === target || target.contains(active)),
  );
}

function syncSelectOptions(select, items) {
  if (!select) {
    return false;
  }
  // Replacing <option> nodes closes the native select popup. Background
  // refreshes must leave a list alone while the user is choosing a value.
  if (hasFocusedSelect(select)) {
    return false;
  }
  const options = (Array.isArray(items) ? items : []).map((item) => ({
    value: String(item && item.value !== undefined ? item.value : ""),
    label: String(item && item.label !== undefined ? item.label : ""),
    disabled: Boolean(item && item.disabled),
  }));
  const currentOptions = [...select.options];
  const unchanged = currentOptions.length === options.length
    && options.every((item, index) => (
      currentOptions[index].value === item.value
      && currentOptions[index].textContent === item.label
      && currentOptions[index].disabled === item.disabled
    ));
  if (unchanged) {
    return true;
  }
  const nodes = options.map((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    option.disabled = item.disabled;
    return option;
  });
  select.replaceChildren(...nodes);
  return true;
}

function replaceHtmlUnlessSelectFocused(target, markup) {
  if (!target || hasFocusedSelect(target)) {
    return false;
  }
  const nextMarkup = String(markup || "");
  if (target.innerHTML !== nextMarkup) {
    target.innerHTML = nextMarkup;
  }
  return true;
}

function formatSignedNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  if (numeric > 0) {
    return `+${formatNumber(numeric)}`;
  }
  if (numeric < 0) {
    return `−${formatNumber(Math.abs(numeric))}`;
  }
  return "0";
}

function ensureTrendMarkup(target) {
  if (!target) {
    return null;
  }
  let day = target.querySelector('[data-trend-window="day"]');
  let week = target.querySelector('[data-trend-window="week"]');
  if (!day || !week) {
    target.replaceChildren();
    day = document.createElement("span");
    day.dataset.trendWindow = "day";
    day.innerHTML = `<span class="trend-label">24 ч. </span><span class="trend-value">—</span>`;
    const divider = document.createElement("span");
    divider.className = "trend-divider";
    divider.textContent = " · ";
    week = document.createElement("span");
    week.dataset.trendWindow = "week";
    week.innerHTML = `<span class="trend-label">7 д. </span><span class="trend-value">—</span>`;
    target.append(day, divider, week);
  }
  return { day, week };
}

function renderResourceTrend(target, trends, key) {
  const markup = ensureTrendMarkup(target);
  if (!markup) {
    return;
  }
  for (const [windowKey, container] of Object.entries(markup)) {
    const windowData = trends && trends[windowKey] ? trends[windowKey] : null;
    const rawValue = windowData && windowData.delta ? windowData.delta[key] : null;
    const value = rawValue === null || rawValue === undefined ? null : Number(rawValue);
    const valueNode = container.querySelector(".trend-value");
    setTextIfChanged(valueNode, value === null || !Number.isFinite(value) ? "—" : formatSignedNumber(value));
    valueNode.classList.toggle("is-positive", Number.isFinite(value) && value > 0);
    valueNode.classList.toggle("is-negative", Number.isFinite(value) && value < 0);
    const baselineAt = windowData && windowData.baselineAtByKey && windowData.baselineAtByKey[key]
      ? windowData.baselineAtByKey[key]
      : windowData && windowData.baselineAt;
    const complete = windowData && windowData.completeByKey && Object.hasOwn(windowData.completeByKey, key)
      ? windowData.completeByKey[key]
      : windowData && windowData.complete;
    container.title = baselineAt
      ? `${complete ? "Полный период" : "Отслеживается с"} ${formatDate(baselineAt)}`
      : "Истории пока нет";
  }
}

function isDashboardTechnicalCurrency(key) {
  return /^guild_/i.test(key)
    || /^lager_/i.test(key)
    || /^eventtoken_/i.test(key)
    || String(key).toLowerCase() === "ep";
}

function getDashboardResourceDefinition(key) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey || isDashboardTechnicalCurrency(normalizedKey)) {
    return null;
  }
  if (DASHBOARD_RESOURCE_DEFINITIONS[normalizedKey]) {
    return DASHBOARD_RESOURCE_DEFINITIONS[normalizedKey];
  }
  const armbandMatch = normalizedKey.match(/^armband_(\d+)$/i);
  return {
    key: normalizedKey,
    label: armbandMatch
      ? `Повязка актива ${armbandMatch[1]}`
      : normalizedKey.replaceAll("_", " "),
    group: "resources",
    source: "currency",
    iconUrl: armbandMatch
      ? `${GAME_ASSET_BASE_URL}/Guild/Camps/bandages/bandage_${armbandMatch[1]}.webp`
      : "",
    trendKey: normalizedKey,
  };
}

function getDashboardResourceDefinitions() {
  const definitions = Object.values(DASHBOARD_RESOURCE_DEFINITIONS);
  const knownKeys = new Set(definitions.map((definition) => definition.key));
  const currencies = state.economy && state.economy.currencies && typeof state.economy.currencies === "object"
    ? state.economy.currencies
    : {};
  for (const key of Object.keys(currencies)) {
    if (knownKeys.has(key) || isDashboardTechnicalCurrency(key)) {
      continue;
    }
    const definition = getDashboardResourceDefinition(key);
    if (definition) {
      definitions.push(definition);
      knownKeys.add(key);
    }
  }
  return definitions;
}

function normalizeDashboardSlots(slots, limit, options = {}) {
  const keepEmpty = options.keepEmpty === true;
  const normalized = [];
  const seen = new Set();
  for (const rawSlot of Array.isArray(slots) ? slots : []) {
    if (normalized.length >= limit) {
      break;
    }
    const values = Array.isArray(rawSlot) ? rawSlot : [rawSlot];
    const slot = [];
    for (const rawKey of values) {
      const key = String(rawKey || "").trim();
      if (
        !key
        || seen.has(key)
        || slot.length >= DASHBOARD_SLOT_ITEM_LIMIT
        || !getDashboardResourceDefinition(key)
      ) {
        continue;
      }
      slot.push(key);
      seen.add(key);
    }
    if (slot.length > 0 || keepEmpty) {
      normalized.push(slot);
    }
  }
  if (keepEmpty) {
    while (normalized.length < limit) {
      normalized.push([]);
    }
  }
  return normalized;
}

function readDashboardResourceSlots() {
  try {
    const saved = readAccountStorage(DASHBOARD_RESOURCE_STORAGE_KEY);
    if (saved !== null) {
      return normalizeDashboardSlots(JSON.parse(saved), DASHBOARD_RESOURCE_SLOT_LIMIT, { keepEmpty: true });
    }
    const previous = readAccountStorage("pbot.dashboard.resources.v2");
    if (previous !== null) {
      return normalizeDashboardSlots(JSON.parse(previous), DASHBOARD_RESOURCE_SLOT_LIMIT, { keepEmpty: true });
    }
    const legacy = readAccountStorage("pbot.dashboard.resources.v1");
    if (legacy !== null) {
      return normalizeDashboardSlots(JSON.parse(legacy), DASHBOARD_RESOURCE_SLOT_LIMIT, { keepEmpty: true });
    }
  } catch (error) {
    void error;
  }
  return CURRENCY_DISPLAY_ORDER.map((key) => [key]);
}

function readDashboardHeroSlots() {
  try {
    const saved = readAccountStorage(DASHBOARD_HERO_STORAGE_KEY);
    if (saved !== null) {
      return normalizeDashboardSlots(JSON.parse(saved), DASHBOARD_HERO_SLOT_LIMIT, { keepEmpty: true });
    }
    const previous = readAccountStorage("pbot.dashboard.hero.v1");
    if (previous !== null) {
      return normalizeDashboardSlots(JSON.parse(previous), DASHBOARD_HERO_SLOT_LIMIT, { keepEmpty: true });
    }
  } catch (error) {
    void error;
  }
  return [["energy"], ["authority"], []];
}

function saveDashboardSlots() {
  try {
    writeAccountStorage(DASHBOARD_RESOURCE_STORAGE_KEY, JSON.stringify(state.dashboardResourceSlots));
    writeAccountStorage(DASHBOARD_HERO_STORAGE_KEY, JSON.stringify(state.dashboardHeroSlots));
  } catch (error) {
    void error;
  }
}

function setDashboardCustomizerStatus(message) {
  const status = $("#dashboard-customizer-status");
  if (status) {
    setTextIfChanged(status, message || "");
  }
}

function getDashboardZoneSlots(zone) {
  return zone === "hero" ? state.dashboardHeroSlots : state.dashboardResourceSlots;
}

function setDashboardZoneSlots(zone, slots, options = {}) {
  if (zone === "hero") {
    state.dashboardHeroSlots = normalizeDashboardSlots(slots, DASHBOARD_HERO_SLOT_LIMIT, { keepEmpty: true });
  } else {
    state.dashboardResourceSlots = normalizeDashboardSlots(slots, DASHBOARD_RESOURCE_SLOT_LIMIT, { keepEmpty: true });
  }
  saveDashboardSlots();
  renderDashboardResources();
  if (options.announce) {
    setDashboardCustomizerStatus(options.announce);
  }
}

function findDashboardResourceSlot(slots, key) {
  for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
    const itemIndex = slots[slotIndex].indexOf(key);
    if (itemIndex >= 0) {
      return { slotIndex, itemIndex };
    }
  }
  return null;
}

function addDashboardResourceToSlot(key, zone = "wallet", slotIndex = null) {
  const definition = getDashboardResourceDefinition(key);
  if (!definition) {
    return false;
  }
  const slots = getDashboardZoneSlots(zone).map((slot) => [...slot]);
  if (findDashboardResourceSlot(slots, key)) {
    setDashboardCustomizerStatus(`${definition.label} уже добавлено в эту область.`);
    return false;
  }
  const zoneLimit = zone === "hero" ? DASHBOARD_HERO_SLOT_LIMIT : DASHBOARD_RESOURCE_SLOT_LIMIT;
  const targetIndex = Number.isInteger(slotIndex)
    ? slotIndex
    : slots.findIndex((slot) => slot.length === 0);
  if (targetIndex < 0 || targetIndex >= zoneLimit) {
    setDashboardCustomizerStatus(zone === "hero"
      ? "Все три верхние плашки заняты. Освободите нужную плашку или перетащите на неё новый показатель."
      : "Все 9 плашек заняты. Освободите нужную плашку или перетащите на неё новый показатель.");
    return false;
  }
  slots[targetIndex] = [definition.key];
  state.dashboardCatalogTarget = { zone, slotIndex: targetIndex };
  setDashboardZoneSlots(zone, slots, {
    announce: `${definition.label} установлено в плашку ${targetIndex + 1}.`,
  });
  return true;
}

function removeDashboardResourceFromSlot(zone, slotIndex, key) {
  const slots = getDashboardZoneSlots(zone).map((slot) => [...slot]);
  if (!slots[slotIndex]) {
    return;
  }
  const definition = getDashboardResourceDefinition(key);
  slots[slotIndex] = slots[slotIndex].filter((item) => item !== key);
  state.dashboardCatalogTarget = null;
  setDashboardZoneSlots(zone, slots, {
    announce: `${definition ? definition.label : key} убрано из плашки.`,
  });
}

function getDashboardResourceSnapshot(definition) {
  const economy = state.economy || {};
  const currencies = economy.currencies && typeof economy.currencies === "object"
    ? economy.currencies
    : {};
  const headerExtras = state.headerExtras || {};
  const unavailable = (meta = "Данные загружаются") => ({
    available: false,
    value: "—",
    meta,
    title: `${definition.label}: нет данных`,
  });

  if (definition.source === "currency") {
    if (!Object.hasOwn(currencies, definition.key)) {
      return unavailable("Нет в текущем балансе");
    }
    const amount = Number(currencies[definition.key]);
    return {
      available: Number.isFinite(amount),
      value: Number.isFinite(amount) ? formatNumber(amount) : "—",
      meta: "",
      title: Number.isFinite(amount) ? formatCurrency(definition.key, amount) : `${definition.label}: нет данных`,
    };
  }
  if (definition.source === "energy") {
    if (!Number.isFinite(Number(economy.energy)) || !Number.isFinite(Number(economy.maxEnergy))) {
      return unavailable();
    }
    return {
      available: true,
      value: `${formatNumber(economy.energy)} / ${formatNumber(economy.maxEnergy)}`,
      meta: "сейчас / максимум",
      title: `Энергия: ${formatNumber(economy.energy)} из ${formatNumber(economy.maxEnergy)}`,
    };
  }
  if (definition.source === "economy") {
    const numeric = Number(economy[definition.key]);
    if (!Number.isFinite(numeric)) {
      return unavailable();
    }
    const levelMeta = definition.key === "level"
      && Number.isFinite(Number(economy.currentLevelXp))
      && Number.isFinite(Number(economy.nextLevelXp))
      ? `опыт ${formatNumber(economy.currentLevelXp)} / ${formatNumber(economy.nextLevelXp)}`
      : "";
    return {
      available: true,
      value: formatNumber(numeric),
      meta: levelMeta,
      title: `${definition.label}: ${formatNumber(numeric)}${levelMeta ? ` · ${levelMeta}` : ""}`,
    };
  }
  if (definition.source === "weapon") {
    const weapon = economy.weapons && economy.weapons[definition.weaponKey];
    if (!weapon) {
      return unavailable();
    }
    const count = Number(weapon.count);
    const damage = Number(weapon.damage);
    return {
      available: Number.isFinite(count),
      value: Number.isFinite(count) ? formatNumber(count) : "—",
      meta: Number.isFinite(damage) ? `${formatBossCompactNumber(damage)} урона` : "",
      title: `${definition.label}: ${formatNumber(count || 0)} · ${formatNumber(damage || 0)} урона`,
    };
  }
  if (definition.source === "weapon-damage") {
    const weapon = economy.weapons && economy.weapons[definition.weaponKey];
    if (!weapon) {
      return unavailable();
    }
    const damage = Number(weapon.damage);
    return {
      available: Number.isFinite(damage),
      value: Number.isFinite(damage) ? formatBossCompactNumber(damage) : "—",
      meta: "за 1 применение",
      title: Number.isFinite(damage)
        ? `${definition.label}: ${formatNumber(damage)}`
        : `${definition.label}: нет данных`,
    };
  }
  if (definition.source === "talents") {
    const talents = economy.talents;
    if (!talents) {
      return unavailable();
    }
    const total = Math.max(0, Number(talents.totalPoints) || 0);
    const unspent = Math.max(0, Number(talents.unspentPoints) || 0);
    const meta = talents.isMax
      ? "все очки получены"
      : `свободно ${formatNumber(unspent)} · до следующего ${formatBossCompactNumber(talents.remainingDamage || 0)}`;
    return {
      available: true,
      value: formatNumber(total),
      meta,
      title: `Очки талантов: ${formatNumber(total)} · ${meta}`,
    };
  }
  if (definition.key === "achievements") {
    const achievements = headerExtras.achievements;
    if (!achievements) {
      return unavailable();
    }
    return {
      available: true,
      value: formatNumber(achievements.unlockedReward || 0),
      meta: `из ${formatNumber(achievements.totalReward || 0)}`,
      title: `Достижения: ${formatNumber(achievements.unlockedReward || 0)} из ${formatNumber(achievements.totalReward || 0)}`,
    };
  }
  if (definition.key === "stash-coolness") {
    const stashGear = headerExtras.stashGear;
    if (!stashGear) {
      return unavailable();
    }
    return {
      available: true,
      value: formatNumber(stashGear.coolnessTotal || 0),
      meta: "зачёт шмота",
      title: `ЗШ: ${formatNumber(stashGear.coolnessTotal || 0)}`,
    };
  }
  if (definition.source === "damage") {
    const periodDamage = headerExtras.damage && headerExtras.damage[definition.period];
    const damage = periodDamage && periodDamage[definition.scope];
    if (!periodDamage || !periodDamage.available || !damage || !Number.isFinite(Number(damage.damage))) {
      return unavailable();
    }
    const scopeMeta = definition.scope === "self"
      ? damage.rank ? `место #${formatNumber(damage.rank)}` : "личный урон"
      : Number.isFinite(Number(damage.players)) ? `${formatNumber(damage.players)} игроков` : "";
    return {
      available: true,
      value: formatBossCompactNumber(damage.damage || 0),
      meta: scopeMeta,
      title: `${definition.label}: ${formatNumber(damage.damage || 0)}`,
    };
  }
  return unavailable();
}

function createDashboardResourceIcon(definition, className = "currency-icon") {
  if (definition.iconUrl) {
    const icon = document.createElement("img");
    icon.className = className;
    icon.src = definition.iconUrl;
    icon.alt = "";
    icon.loading = "lazy";
    return icon;
  }
  const fallback = document.createElement("span");
  fallback.className = `${className} currency-icon-fallback`;
  fallback.textContent = definition.symbol || "◆";
  fallback.setAttribute("aria-hidden", "true");
  return fallback;
}

function createDashboardResourceCard(slot, zone, slotIndex) {
  const key = slot[0];
  const definition = getDashboardResourceDefinition(key);
  const snapshot = getDashboardResourceSnapshot(definition);
  const item = document.createElement("div");
  item.className = zone === "hero"
    ? "status-chip status-chip-resource dashboard-resource-card dashboard-hero-slot"
    : "currency-item dashboard-resource-card";
  item.dataset.dashboardSlot = String(slotIndex);
  item.dataset.dashboardZone = zone;
  item.title = snapshot.title;

  if (zone === "wallet") {
    const dragHandle = document.createElement("span");
    dragHandle.className = "dashboard-resource-drag-handle";
    dragHandle.dataset.dashboardDragSlot = String(slotIndex);
    dragHandle.draggable = true;
    dragHandle.tabIndex = 0;
    dragHandle.title = "Перетащить плашку";
    dragHandle.setAttribute("aria-label", `Перетащить плашку ${definition.label}`);
    dragHandle.textContent = "⋮⋮";
    item.append(dragHandle);
  }

  const icon = createDashboardResourceIcon(definition, zone === "hero" ? "status-resource-icon" : "currency-icon");
  const copy = document.createElement("span");
  copy.className = "dashboard-resource-copy";
  const name = document.createElement("span");
  name.className = "currency-name dashboard-resource-name";
  name.textContent = definition.label;

  const value = document.createElement("strong");
  value.className = zone === "hero" ? "status-value" : "currency-value";
  value.textContent = snapshot.value;
  const meta = document.createElement("span");
  meta.className = zone === "hero" ? "status-sub currency-trend" : "currency-trend";
  if (definition.trendKey && snapshot.available) {
    renderResourceTrend(meta, state.economy && state.economy.trends, definition.trendKey);
  } else {
    meta.textContent = snapshot.meta || "";
  }
  copy.append(name, value, meta);

  const remove = document.createElement("button");
  remove.className = "dashboard-resource-remove";
  remove.type = "button";
  remove.dataset.dashboardRemoveResource = key;
  remove.dataset.dashboardSlotIndex = String(slotIndex);
  remove.dataset.dashboardZone = zone;
  remove.title = "Убрать выбранный показатель";
  remove.setAttribute("aria-label", `Убрать ${definition.label} из плашки`);
  remove.textContent = "×";
  item.append(icon, copy, remove);
  return item;
}

function createDashboardAddCard(zone = "wallet", slotIndex = null) {
  const add = document.createElement("button");
  add.className = zone === "hero"
    ? "status-chip dashboard-add-card dashboard-hero-slot dashboard-hero-slot-empty"
    : "dashboard-add-card";
  add.type = "button";
  add.dataset.dashboardAddResource = "true";
  add.dataset.dashboardZone = zone;
  if (Number.isInteger(slotIndex)) {
    add.dataset.dashboardSlot = String(slotIndex);
  }
  add.innerHTML = `
    <span class="dashboard-add-icon" aria-hidden="true">+</span>
    <strong>${zone === "hero" ? "Настроить плашку" : "Добавить ресурс"}</strong>
    <small>1 показатель</small>
  `;
  add.setAttribute("aria-label", zone === "hero" ? "Настроить верхнюю плашку" : "Добавить ресурс или метрику в шапку");
  return add;
}

function renderDashboardCatalog() {
  const catalog = $("#dashboard-resource-catalog");
  const count = $("#dashboard-slot-count");
  if (count) {
    const occupiedCount = state.dashboardResourceSlots.filter((slot) => slot.length > 0).length;
    setTextIfChanged(count, `${occupiedCount} / ${DASHBOARD_RESOURCE_SLOT_LIMIT}`);
  }
  if (!catalog) {
    return;
  }
  const target = state.dashboardCatalogTarget;
  const targetSlots = target ? getDashboardZoneSlots(target.zone) : state.dashboardResourceSlots;
  const selected = new Set(targetSlots.flat());
  const isFull = !target && !state.dashboardResourceSlots.some((slot) => slot.length === 0);
  const definitions = getDashboardResourceDefinitions();
  const groups = [];
  for (const group of DASHBOARD_RESOURCE_GROUPS) {
    const section = document.createElement("section");
    section.className = "dashboard-catalog-section";
    const heading = document.createElement("h3");
    heading.textContent = group.label;
    const grid = document.createElement("div");
    grid.className = "dashboard-catalog-grid";
    for (const definition of definitions.filter((item) => item.group === group.key)) {
      const snapshot = getDashboardResourceSnapshot(definition);
      const active = selected.has(definition.key);
      const button = document.createElement("button");
      button.className = "dashboard-catalog-item";
      button.type = "button";
      button.draggable = true;
      button.dataset.catalogResource = definition.key;
      button.classList.toggle("is-selected", active);
      button.classList.toggle("is-full", isFull && !active);
      button.setAttribute("aria-pressed", String(active));
      button.setAttribute("aria-label", active
        ? `${definition.label} уже в шапке`
        : `Добавить ${definition.label} в выбранную плашку`);
      const icon = createDashboardResourceIcon(definition, "dashboard-catalog-icon");
      const copy = document.createElement("span");
      copy.className = "dashboard-catalog-copy";
      const name = document.createElement("strong");
      name.textContent = definition.label;
      const value = document.createElement("span");
      value.textContent = snapshot.value;
      copy.append(name, value);
      const marker = document.createElement("span");
      marker.className = "dashboard-catalog-marker";
      marker.textContent = active ? "✓" : "+";
      button.append(icon, copy, marker);
      grid.append(button);
    }
    section.append(heading, grid);
    groups.push(section);
  }
  catalog.replaceChildren(...groups);
}

function renderDashboardResources() {
  const target = $("#currency-all");
  const heroTarget = $("#dashboard-hero-slots");
  state.dashboardResourceSlots = normalizeDashboardSlots(state.dashboardResourceSlots, DASHBOARD_RESOURCE_SLOT_LIMIT, { keepEmpty: true });
  state.dashboardHeroSlots = normalizeDashboardSlots(state.dashboardHeroSlots, DASHBOARD_HERO_SLOT_LIMIT, { keepEmpty: true });
  if (target) {
    target.replaceChildren(...state.dashboardResourceSlots.map((slot, slotIndex) => (
      slot.length > 0
        ? createDashboardResourceCard(slot, "wallet", slotIndex)
        : createDashboardAddCard("wallet", slotIndex)
    )));
  }
  if (heroTarget) {
    heroTarget.replaceChildren(...state.dashboardHeroSlots.map((slot, slotIndex) => (
      slot.length > 0
        ? createDashboardResourceCard(slot, "hero", slotIndex)
        : createDashboardAddCard("hero", slotIndex)
    )));
  }
  renderDashboardCatalog();
}

function renderAllCurrencies() {
  renderDashboardResources();
}

function openDashboardResourceCatalog(target = null) {
  const details = $("#dashboard-resource-details");
  if (!details) {
    return;
  }
  state.dashboardCatalogTarget = target;
  details.open = true;
  renderDashboardCatalog();
  requestAnimationFrame(() => {
    details.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

function clearDashboardDragState() {
  state.dashboardResourceDrag = null;
  document.querySelectorAll(".is-dashboard-dragging, .is-dashboard-drop-target").forEach((item) => {
    item.classList.remove("is-dashboard-dragging", "is-dashboard-drop-target");
  });
}

function handleDashboardDragStart(event) {
  const slotHandle = event.target.closest("[data-dashboard-drag-slot]");
  const catalogItem = event.target.closest("[data-catalog-resource]");
  if (!slotHandle && !catalogItem) {
    return;
  }
  state.dashboardResourceDrag = {
    key: catalogItem?.dataset.catalogResource || null,
    slotIndex: slotHandle ? Number(slotHandle.dataset.dashboardDragSlot) : null,
    source: slotHandle ? "wallet-slot" : "catalog",
  };
  const dragging = slotHandle
    ? slotHandle.closest("[data-dashboard-slot]")
    : catalogItem;
  dragging?.classList.add("is-dashboard-dragging");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = slotHandle ? "move" : "copy";
    event.dataTransfer.setData("text/plain", catalogItem?.dataset.catalogResource || String(slotHandle.dataset.dashboardDragSlot));
  }
}

function handleDashboardDragOver(event) {
  if (!state.dashboardResourceDrag) {
    return;
  }
  const target = event.target.closest("[data-dashboard-slot], [data-dashboard-add-resource]");
  if (!target) {
    return;
  }
  event.preventDefault();
  document.querySelectorAll(".is-dashboard-drop-target").forEach((item) => {
    if (item !== target) item.classList.remove("is-dashboard-drop-target");
  });
  target.classList.add("is-dashboard-drop-target");
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = state.dashboardResourceDrag.source === "catalog" ? "copy" : "move";
  }
}

function handleDashboardDrop(event) {
  const drag = state.dashboardResourceDrag;
  const targetCard = event.target.closest("[data-dashboard-slot]");
  const addCard = event.target.closest("[data-dashboard-add-resource]");
  if (!drag || (!targetCard && !addCard)) {
    clearDashboardDragState();
    return;
  }
  event.preventDefault();
  if (drag.source === "catalog") {
    const dropTarget = targetCard || addCard;
    const zone = dropTarget.dataset.dashboardZone || "wallet";
    const slotIndex = dropTarget.dataset.dashboardSlot === undefined
      ? null
      : Number(dropTarget.dataset.dashboardSlot);
    addDashboardResourceToSlot(drag.key, zone, slotIndex);
    clearDashboardDragState();
    return;
  }
  const dropTarget = targetCard || addCard;
  if ((dropTarget.dataset.dashboardZone || "wallet") !== "wallet") {
    clearDashboardDragState();
    return;
  }
  const fromIndex = drag.slotIndex;
  const toIndex = targetCard ? Number(targetCard.dataset.dashboardSlot) : state.dashboardResourceSlots.length - 1;
  if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
    const next = state.dashboardResourceSlots.map((slot) => [...slot]);
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setDashboardZoneSlots("wallet", next, { announce: "Порядок плашек изменён." });
  }
  clearDashboardDragState();
}

function initializeResourceDashboard() {
  state.dashboardResourceSlots = readDashboardResourceSlots();
  state.dashboardHeroSlots = readDashboardHeroSlots();
  const grid = $("#currency-all");
  const heroGrid = $("#dashboard-hero-slots");
  const catalog = $("#dashboard-resource-catalog");
  const handleGridClick = (event) => {
    const remove = event.target.closest("[data-dashboard-remove-resource]");
    if (remove) {
      removeDashboardResourceFromSlot(
        remove.dataset.dashboardZone || "wallet",
        Number(remove.dataset.dashboardSlotIndex),
        remove.dataset.dashboardRemoveResource,
      );
      return;
    }
    const add = event.target.closest("[data-dashboard-add-resource]");
    if (add) {
      openDashboardResourceCatalog({
        zone: add.dataset.dashboardZone || "wallet",
        slotIndex: add.dataset.dashboardSlot === undefined ? null : Number(add.dataset.dashboardSlot),
      });
    }
  };
  for (const target of [grid, heroGrid]) {
    target?.addEventListener("click", handleGridClick);
    target?.addEventListener("dragstart", handleDashboardDragStart);
    target?.addEventListener("dragover", handleDashboardDragOver);
    target?.addEventListener("drop", handleDashboardDrop);
    target?.addEventListener("dragend", clearDashboardDragState);
  }
  catalog?.addEventListener("click", (event) => {
    const item = event.target.closest("[data-catalog-resource]");
    if (!item) {
      return;
    }
    const target = state.dashboardCatalogTarget || { zone: "wallet", slotIndex: null };
    addDashboardResourceToSlot(item.dataset.catalogResource, target.zone, target.slotIndex);
  });
  catalog?.addEventListener("dragstart", handleDashboardDragStart);
  catalog?.addEventListener("dragend", clearDashboardDragState);
  $("#dashboard-reset")?.addEventListener("click", () => {
    state.dashboardResourceSlots = CURRENCY_DISPLAY_ORDER.map((key) => [key]);
    state.dashboardHeroSlots = [["energy"], ["authority"], []];
    state.dashboardCatalogTarget = null;
    saveDashboardSlots();
    renderDashboardResources();
    setDashboardCustomizerStatus("Вернули исходные девять ресурсов и верхние плашки.");
  });
  $("#dashboard-clear")?.addEventListener("click", () => {
    state.dashboardResourceSlots = Array.from({ length: DASHBOARD_RESOURCE_SLOT_LIMIT }, () => []);
    state.dashboardHeroSlots = [[], [], []];
    state.dashboardCatalogTarget = null;
    saveDashboardSlots();
    renderDashboardResources();
    setDashboardCustomizerStatus("Все настраиваемые плашки очищены. Нажмите плюс, чтобы добавить нужное.");
  });
  renderDashboardResources();
}

function createBossTalentsCard() {
  const card = document.createElement("div");
  card.className = "boss-talents-card-inner";

  const icon = document.createElement("img");
  icon.className = "boss-talents-icon";
  icon.src = TALENTS_ICON_URL;
  icon.alt = "Таланты";

  const content = document.createElement("div");
  content.className = "boss-talents-content";

  const head = document.createElement("div");
  head.className = "boss-talents-head";
  const label = document.createElement("span");
  label.textContent = "Прогресс таланта";
  const unspent = document.createElement("strong");
  unspent.className = "boss-talents-unspent";
  head.append(label, unspent);

  const progress = document.createElement("div");
  progress.className = "boss-talents-progress";
  progress.setAttribute("role", "progressbar");
  progress.setAttribute("aria-label", "Урон до следующего очка таланта");
  progress.setAttribute("aria-valuemin", "0");
  progress.setAttribute("aria-valuemax", "100");
  const progressFill = document.createElement("span");
  progressFill.className = "boss-talents-progress-fill";
  progress.append(progressFill);

  const metrics = document.createElement("div");
  metrics.className = "boss-talents-metrics";
  for (const [key, text] of [
    ["current", "Есть"],
    ["required", "Нужно"],
    ["remaining", "Осталось"],
  ]) {
    const metric = document.createElement("span");
    metric.dataset.talentMetric = key;
    const name = document.createElement("small");
    name.textContent = text;
    const value = document.createElement("b");
    metric.append(name, value);
    metrics.append(metric);
  }

  content.append(head, progress, metrics);
  card.append(icon, content);
  return card;
}

function renderBossTalents(talents) {
  const target = $("#boss-talents");
  if (!target) {
    return;
  }
  if (!talents || typeof talents !== "object") {
    target.hidden = true;
    return;
  }

  let card = target.querySelector(".boss-talents-card-inner");
  if (!card) {
    card = createBossTalentsCard();
    target.replaceChildren(card);
  }

  const currentDamage = Math.max(0, Number(talents.currentDamage) || 0);
  const requiredDamage = Math.max(0, Number(talents.requiredDamage) || 0);
  const remainingDamage = Math.max(0, Number(talents.remainingDamage) || 0);
  const unspentPoints = Math.max(0, Number(talents.unspentPoints) || 0);
  const isMax = talents.isMax === true;
  const progressPercent = isMax
    ? 100
    : Math.max(0, Math.min(100, Number(talents.progressPercent) || 0));
  const unspent = card.querySelector(".boss-talents-unspent");
  const progress = card.querySelector(".boss-talents-progress");
  const progressFill = card.querySelector(".boss-talents-progress-fill");

  setTextIfChanged(unspent, `${formatNumber(unspentPoints)} невложено`);
  unspent.dataset.tone = unspentPoints > 0 ? "available" : "muted";
  progress.setAttribute("aria-valuenow", String(progressPercent));
  progress.setAttribute(
    "aria-valuetext",
    isMax
      ? "Все очки талантов получены"
      : `${formatNumber(currentDamage)} из ${formatNumber(requiredDamage)} урона`,
  );
  progressFill.style.width = currentDamage > 0 && !isMax
    ? `max(1px, ${progressPercent}%)`
    : `${progressPercent}%`;
  for (const [key, value] of Object.entries({
    current: isMax ? "Максимум" : formatNumber(currentDamage),
    required: isMax ? "—" : formatNumber(requiredDamage),
    remaining: isMax ? "—" : formatNumber(remainingDamage),
  })) {
    setTextIfChanged(card.querySelector(`[data-talent-metric="${key}"] b`), value);
  }

  target.title = isMax
    ? `Таланты: максимум · вложено ${formatNumber(talents.spentPoints || 0)}`
    : `Следующее очко #${formatNumber(talents.nextPoint || 0)} · вложено ${formatNumber(talents.spentPoints || 0)}`;
  target.hidden = false;
}

function renderHeaderVpi(vpi) {
  const chip = $("#header-vpi");
  const icon = $("#header-vpi-icon");
  const status = $("#header-vpi-status");
  const meta = $("#header-vpi-meta");
  const damage = $("#header-vpi-damage");
  if (!chip || !icon || !status || !meta || !damage) {
    return;
  }

  icon.src = getVpiTierIconUrl(vpi);
  if (!vpi || typeof vpi !== "object") {
    chip.dataset.active = "false";
    chip.title = "Не удалось проверить общак. Данные обновятся автоматически.";
    setTextIfChanged(status, "Не проверен");
    setTextIfChanged(meta, "Повторим автоматически");
    setTextIfChanged(damage, "Игла —");
    return;
  }

  const active = vpi.active === true && Boolean(vpi.tier);
  chip.dataset.active = String(active);
  if (!active) {
    chip.title = "Общака нет";
    setTextIfChanged(status, "Общака нет");
    setTextIfChanged(meta, "Ежедневные бонусы недоступны");
    setTextIfChanged(damage, "Игла недоступен");
    return;
  }

  const tierTitle = vpi.tier.title || String(vpi.tier.id || "Активный");
  const duration = vpi.expiresAtUnix
    ? `ещё ${formatVpiTimeLeft(vpi.remainingSec)}`
    : "активен";
  const reward = vpi.claimReady
    ? "награда готова"
    : `награда через ${formatVpiTimeLeft(vpi.claimAvailableInSec)}`;
  const needleDamage = Math.max(0, Number(vpi.damageLeft) || 0);
  setTextIfChanged(status, tierTitle);
  setTextIfChanged(meta, `${duration} · ${reward}`);
  setTextIfChanged(damage, `Игла ${formatBossCompactNumber(needleDamage)}`);
  chip.title = [
    `Общак: ${tierTitle}`,
    `Срок: ${duration}`,
    `Ежедневная награда: ${vpi.claimReady ? "готова" : `через ${formatVpiTimeLeft(vpi.claimAvailableInSec)}`}`,
    `Урон Иглы сегодня: ${formatNumber(needleDamage)}`,
  ].join("\n");
}

function renderHeaderExtras(payload) {
  if (!payload) {
    return;
  }
  state.headerExtras = payload;
  renderHeaderVpi(payload.vpi);
  renderBossNeedleAction();
  renderDashboardResources();
}

function initializeCollapsibleCards() {
  document.querySelectorAll(".collapsible-card > .card-head").forEach((head) => {
    if (head.dataset.collapsibleBound === "true") {
      return;
    }
    head.dataset.collapsibleBound = "true";
    head.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, select, textarea, summary")) {
        return;
      }
      const card = head.parentElement;
      if (!card) {
        return;
      }
      card.classList.toggle("is-collapsed");
    });
  });
}

function setHeaderTrendWindow(windowKey) {
  const selectedWindow = windowKey === "week" ? "week" : "day";
  const header = document.querySelector(".hero");
  if (header) {
    header.dataset.trendWindow = selectedWindow;
  }
  document.querySelectorAll("[data-trend-window-button]").forEach((button) => {
    const active = button.dataset.trendWindowButton === selectedWindow;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function initializeHeaderTrendSwitch() {
  document.querySelectorAll("[data-trend-window-button]").forEach((button) => {
    button.addEventListener("click", () => setHeaderTrendWindow(button.dataset.trendWindowButton));
  });
  setHeaderTrendWindow("day");
}

function getMoscowDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      values[part.type] = part.value;
    }
  }
  if (values.year && values.month && values.day) {
    return `${values.year}-${values.month}-${values.day}`;
  }
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getMoscowSecondsSinceMidnight(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type === "hour" || part.type === "minute" || part.type === "second") {
      values[part.type] = Number(part.value);
    }
  }
  const hour = Number.isFinite(values.hour) ? values.hour : 0;
  const minute = Number.isFinite(values.minute) ? values.minute : 0;
  const second = Number.isFinite(values.second) ? values.second : 0;
  return hour * 3600 + minute * 60 + second;
}

function getMsUntilNextMoscowMidnight(date = new Date()) {
  const secondsSinceMidnight = getMoscowSecondsSinceMidnight(date);
  const secondsLeft = Math.max(1, 24 * 3600 - secondsSinceMidnight);
  return (secondsLeft + 1) * 1000;
}

function normalizeBossComboMode(value) {
  return String(value || "").trim().toLowerCase();
}

function isSoloBossMode(mode) {
  return normalizeBossComboMode(mode) === SOLO_BOSS_MODE;
}

function getBossModeHpMultiplier(mode) {
  const modeKey = normalizeBossComboMode(mode);
  return BOSS_MODE_HP_MULTIPLIERS[modeKey] || 1;
}

function resolveBossModeHp(baseHp, mode) {
  const baseValue = Number(baseHp);
  if (!Number.isFinite(baseValue) || baseValue <= 0) {
    return null;
  }

  return Math.max(baseValue, Math.round(baseValue * getBossModeHpMultiplier(mode)));
}

function getBossRunQueueSoloWarningCandidate(entry, candidate) {
  const mode = entry && entry.mode ? entry.mode : candidate && candidate.selectedMode;
  const hp = candidate ? resolveBossModeHp(candidate.baseHp, mode) : null;
  if (!isSoloBossMode(mode) || !Number.isFinite(hp) || hp <= SOLO_BOSS_QUEUE_WARNING_HP_THRESHOLD) {
    return null;
  }

  const bossId = Number(entry && entry.bossId || candidate && candidate.id || 0);
  return {
    bossId: Number.isFinite(bossId) && bossId > 0 ? bossId : null,
    label: entry && entry.label
      ? entry.label
      : candidate && candidate.title
        ? `#${candidate.id} ${candidate.title}`
        : "Boss",
    hp,
  };
}

function getBossRunQueueSoloWarningCandidates(entries, candidates = getBossQueueCandidateMap()) {
  const candidateMap = candidates instanceof Map
    ? candidates
    : new Map(
      (Array.isArray(candidates) ? candidates : [])
        .map((candidate) => [Number(candidate && candidate.id || 0), candidate])
        .filter(([bossId, candidate]) => Number.isFinite(bossId) && bossId > 0 && candidate),
    );
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => getBossRunQueueSoloWarningCandidate(
      entry,
      candidateMap.get(Number(entry && entry.bossId || 0)) || null,
    ))
    .filter(Boolean);
}

function isBossRunQueueSoloWarningSuppressedToday() {
  try {
    const raw = readAccountStorage(SOLO_BOSS_QUEUE_WARNING_STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const stored = JSON.parse(raw);
    return Boolean(
      stored
      && stored.mskDate === getMoscowDateKey()
      && stored.suppressed === true,
    );
  } catch (_error) {
    return false;
  }
}

function suppressBossRunQueueSoloWarningForToday() {
  try {
    writeAccountStorage(SOLO_BOSS_QUEUE_WARNING_STORAGE_KEY, JSON.stringify({
      mskDate: getMoscowDateKey(),
      suppressed: true,
    }));
  } catch (_error) {
    // Warning preferences are best-effort; queue editing must still work without storage.
  }
}

function confirmBossRunQueueSoloWarning(entries, candidates) {
  const riskyEntries = getBossRunQueueSoloWarningCandidates(entries, candidates);
  if (riskyEntries.length === 0 || isBossRunQueueSoloWarningSuppressedToday()) {
    return Promise.resolve(true);
  }

  const dialog = $("#boss-solo-queue-warning-dialog");
  const list = $("#boss-solo-queue-warning-list");
  const checkbox = $("#boss-solo-queue-warning-suppress");
  const confirmButton = $("#boss-solo-queue-warning-confirm");
  const cancelButton = $("#boss-solo-queue-warning-cancel");
  if (!dialog || !list || !checkbox || !confirmButton || !cancelButton) {
    const names = riskyEntries.map((item) => item.label).join(", ");
    return Promise.resolve(window.confirm(
      `Boss above 1M HP will be added in solo mode: ${names}. Continue?`,
    ));
  }

  list.innerHTML = riskyEntries.map((item) => `
    <li>
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(formatNumber(item.hp))} HP</span>
    </li>
  `).join("");
  checkbox.checked = false;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (confirmed) => {
      if (settled) {
        return;
      }
      settled = true;
      const shouldSuppress = Boolean(confirmed && checkbox.checked);
      confirmButton.removeEventListener("click", handleConfirm);
      cancelButton.removeEventListener("click", handleCancel);
      dialog.removeEventListener("cancel", handleDialogCancel);
      if (dialog.open && typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
      if (shouldSuppress) {
        suppressBossRunQueueSoloWarningForToday();
      }
      resolve(Boolean(confirmed));
    };
    const handleConfirm = () => finish(true);
    const handleCancel = () => finish(false);
    const handleDialogCancel = (event) => {
      event.preventDefault();
      finish(false);
    };

    confirmButton.addEventListener("click", handleConfirm);
    cancelButton.addEventListener("click", handleCancel);
    dialog.addEventListener("cancel", handleDialogCancel);
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "open");
      }
    }
  });
}

function formatBossModeShortLabel(mode) {
  const modeKey = normalizeBossComboMode(mode);
  if (modeKey === "pacansky") {
    return "П";
  }
  if (modeKey === "blotnoy") {
    return "Б";
  }
  if (modeKey === "avtoritetny") {
    return "А";
  }
  if (modeKey === "vorovskoy") {
    return "В";
  }
  if (modeKey === "odin") {
    return "О";
  }

  const label = formatBossModeLabel(mode);
  return label ? label.slice(0, 1).toUpperCase() : "?";
}

function buildBossSelectHpLabel(boss) {
  const baseHp = boss ? boss.baseHp : null;
  const availableModes = boss && Array.isArray(boss.availableModes) ? boss.availableModes : [];
  const hpModes = BOSS_COMBO_MODE_ORDER.filter((mode) => availableModes.some(
    (candidateMode) => normalizeBossComboMode(candidateMode) === mode
      && Object.prototype.hasOwnProperty.call(BOSS_MODE_HP_MULTIPLIERS, mode),
  ));

  if (hpModes.length === 0) {
    const hp = resolveBossModeHp(baseHp, null);
    return hp === null ? "" : `HP ${formatBossCompactNumber(hp)}`;
  }

  if (hpModes.length === 1) {
    const hp = resolveBossModeHp(baseHp, hpModes[0]);
    return hp === null ? "" : `HP ${formatBossCompactNumber(hp)}`;
  }

  return `HP ${hpModes.map((mode) => {
    const hp = resolveBossModeHp(baseHp, mode);
    return `${formatBossModeShortLabel(mode)} ${hp === null ? "-" : formatBossCompactNumber(hp)}`;
  }).join(" / ")}`;
}

function buildBossComboTemplateKey(bossId, comboMode) {
  const numericBossId = Number(bossId || 0);
  const modeKey = normalizeBossComboMode(comboMode);
  if (!Number.isFinite(numericBossId) || numericBossId <= 0 || !modeKey) {
    return "";
  }
  return `${numericBossId}:${modeKey}`;
}

function normalizeBossComboToken(value) {
  return String(value ?? "")
    .trim()
    .replace(/^[0-9]+\s*[.)\-:]\s*/u, "")
    .replace(/^[0-9]+\s+/u, "")
    .replace(/[.,;:!?]+$/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е");
}

function parseBossComboSequence(rawValue) {
  const sequence = [];
  const unknown = [];
  const lines = String(rawValue || "").split(/\r?\n/);

  for (const line of lines) {
    const chunks = String(line || "").split(",");
    for (const chunk of chunks) {
      const token = normalizeBossComboToken(chunk);
      if (!token) {
        continue;
      }
      const mapped = BOSS_COMBO_ACTION_ALIASES[token];
      if (mapped) {
        sequence.push(mapped);
      } else {
        unknown.push(token);
      }
    }
  }

  return { sequence, unknown };
}

function buildBossQueueFromTypes(types) {
  const queue = [];
  for (const value of Array.isArray(types) ? types : []) {
    const key = String(value || "").trim();
    if (!BOSS_COMBO_ACTION_KEYS.has(key)) {
      continue;
    }
    queue.push({ key, count: 1 });
  }
  return queue;
}

function formatBossComboSequence(sequence) {
  return (Array.isArray(sequence) ? sequence : []).map((key, index) => {
    const label = BOSS_COMBO_ACTION_TO_RU[key] || key;
    return `${index + 1}.${label}`;
  }).join("\n");
}

function normalizeBossRunQueueHitTypes(rawTypes) {
  if (rawTypes === undefined || rawTypes === null || rawTypes === "") {
    return [];
  }
  const values = Array.isArray(rawTypes) ? rawTypes : [rawTypes];
  const output = [];

  for (const value of values) {
    for (const part of String(value).split(/[\s,;]+/)) {
      const key = part.trim();
      if (BOSS_COMBO_ACTION_KEYS.has(key)) {
        output.push(key);
      }
    }
  }

  return output;
}

function resolveBossRunQueueHitTypes(entry) {
  if (!entry || typeof entry !== "object" || entry.skipCombo === true) {
    return [];
  }
  const storedTemplate = resolveBossComboTemplateForBossAndMode({
    bossId: entry.bossId,
    mode: entry.mode,
    comboMode: entry.comboMode,
  });
  const storedTypes = storedTemplate && Array.isArray(storedTemplate.sequence)
    ? normalizeBossRunQueueHitTypes(storedTemplate.sequence)
    : [];
  if (storedTypes.length > 0) {
    return storedTypes;
  }

  return normalizeBossRunQueueHitTypes(
    entry.hitTypes !== undefined ? entry.hitTypes : entry.types,
  );
}

function resolveBossRunQueueFinishWithNeedle(entry) {
  if (!entry || typeof entry !== "object" || entry.skipCombo === true) {
    return false;
  }
  const storedTemplate = resolveBossComboTemplateForBossAndMode({
    bossId: entry.bossId,
    mode: entry.mode,
    comboMode: entry.comboMode,
  });
  if (storedTemplate) {
    return storedTemplate.finishWithNeedle === true;
  }
  return entry.finishWithNeedle === true;
}

function withBossRunQueueHitTypes(entry) {
  const hitTypes = resolveBossRunQueueHitTypes(entry);
  const finishWithNeedle = resolveBossRunQueueFinishWithNeedle(entry);
  const normalized = { ...entry };
  if (hitTypes.length > 0) {
    normalized.hitTypes = hitTypes;
  } else {
    delete normalized.hitTypes;
  }
  if (finishWithNeedle) {
    normalized.finishWithNeedle = true;
  } else {
    delete normalized.finishWithNeedle;
  }
  delete normalized.types;
  return normalized;
}

function removeUnavailableBossRunQueueCombos() {
  const candidates = getBossQueueCandidateMap();
  let removed = 0;
  state.bossRunQueue = normalizeBossRunQueueEntries(state.bossRunQueue).map((entry) => {
    const comboMode = normalizeBossComboMode(entry.comboMode);
    const candidate = candidates.get(Number(entry.bossId)) || null;
    if (!comboMode || !candidate) {
      return entry;
    }
    const availableModes = new Set(
      resolveBossComboModes(candidate)
        .map((mode) => normalizeBossComboMode(mode))
        .filter(Boolean),
    );
    if (availableModes.has(comboMode)) {
      return entry;
    }
    removed += 1;
    const cleaned = {
      ...entry,
      comboMode: "",
    };
    delete cleaned.hitTypes;
    delete cleaned.types;
    delete cleaned.finishWithNeedle;
    return withBossRunQueueHitTypes(cleaned);
  });
  if (removed > 0) {
    markBossRunQueueEdited();
    persistBossRunQueue();
  }
  return removed;
}

function normalizeBossRunQueueEntry(rawEntry) {
  if (!rawEntry || typeof rawEntry !== "object") {
    return null;
  }

  const bossId = Number(rawEntry.bossId || rawEntry.id || 0);
  if (!Number.isFinite(bossId) || bossId <= 0) {
    return null;
  }

  const mode = typeof rawEntry.mode === "string" ? rawEntry.mode.trim() : "";
  const comboMode = typeof rawEntry.comboMode === "string" ? rawEntry.comboMode.trim() : "";
  const label = typeof rawEntry.label === "string" ? rawEntry.label.trim() : "";
  const queueItemId = typeof rawEntry.queueItemId === "string" ? rawEntry.queueItemId.trim() : "";
  const lastDeferredAt = typeof rawEntry.lastDeferredAt === "string" ? rawEntry.lastDeferredAt.trim() : "";
  const lastDeferredReason = typeof rawEntry.lastDeferredReason === "string" ? rawEntry.lastDeferredReason.trim() : "";
  const deferredCount = Math.max(0, Number(rawEntry.deferredCount || 0) || 0);
  const origin = typeof rawEntry.origin === "string" ? rawEntry.origin.trim() : "";
  const serverTaskId = typeof rawEntry.serverTaskId === "string" ? rawEntry.serverTaskId.trim() : "";
  const priority = Math.max(-1_000, Math.min(1_000, Number(rawEntry.priority || 0) || 0));
  const taskLabel = typeof rawEntry.taskLabel === "string" ? rawEntry.taskLabel.trim() : "";
  const strategy = typeof rawEntry.strategy === "string" ? rawEntry.strategy.trim() : "";
  const objective = typeof rawEntry.objective === "string" ? rawEntry.objective.trim() : "";
  const zarubaObjective = typeof rawEntry.zarubaObjective === "string" ? rawEntry.zarubaObjective.trim() : "";
  const taskRequiredAmount = Math.max(0, Number(rawEntry.taskRequiredAmount || 0) || 0);
  const taskCurrentAmount = Math.max(0, Number(rawEntry.taskCurrentAmount || 0) || 0);
  const plannedDamage = Math.max(0, Number(rawEntry.plannedDamage || 0) || 0);
  const hitTypes = normalizeBossRunQueueHitTypes(
    rawEntry.hitTypes !== undefined ? rawEntry.hitTypes : rawEntry.types,
  );
  return {
    bossId,
    // The selected fight mode is an explicit user choice.  In particular, a
    // manually queued Zaruba damage task must not silently turn "в одного"
    // into the empty ("Автоматически") mode while it is being decorated with task data.
    mode: mode || null,
    comboMode,
    label: label || `#${bossId}`,
    ...(queueItemId ? { queueItemId } : {}),
    ...(hitTypes.length > 0 ? { hitTypes } : {}),
    ...(rawEntry.finishWithNeedle === true ? { finishWithNeedle: true } : {}),
    ...(rawEntry.autoKillSolo === false ? { autoKillSolo: false } : {}),
    ...(rawEntry.skipCombo === true ? { skipCombo: true } : {}),
    ...(lastDeferredAt ? { lastDeferredAt } : {}),
    ...(lastDeferredReason ? { lastDeferredReason } : {}),
    ...(deferredCount > 0 ? { deferredCount } : {}),
    ...(origin ? { origin } : {}),
    ...(serverTaskId ? { serverTaskId } : {}),
    ...(priority !== 0 ? { priority } : {}),
    ...(taskLabel ? { taskLabel } : {}),
    ...(strategy ? { strategy } : {}),
    ...(objective ? { objective } : {}),
    ...(zarubaObjective ? { zarubaObjective } : {}),
    ...(taskRequiredAmount > 0 ? { taskRequiredAmount } : {}),
    ...(taskCurrentAmount > 0 ? { taskCurrentAmount } : {}),
    ...(plannedDamage > 0 ? { plannedDamage } : {}),
  };
}

function normalizeBossRunQueueEntries(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeBossRunQueueEntry(entry))
    .filter(Boolean);
}

let bossRunQueueItemSequence = 0;

function ensureBossRunQueueItemId(entry) {
  if (!entry || typeof entry !== "object" || entry.queueItemId) {
    return entry;
  }
  bossRunQueueItemSequence += 1;
  const randomId = globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${bossRunQueueItemSequence.toString(36)}`;
  return {
    ...entry,
    queueItemId: `ui-${randomId}`,
  };
}

function readBossRunQueueStorage() {
  try {
    const raw = readAccountStorage(BOSS_RUN_QUEUE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function getBossRunQueueStorageDateKey(stored) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return "";
  }
  const explicitDate = typeof stored.mskDate === "string"
    ? stored.mskDate.trim()
    : typeof stored.queueDate === "string"
      ? stored.queueDate.trim()
      : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(explicitDate)) {
    return explicitDate;
  }
  const updatedAt = new Date(stored.updatedAt || "");
  return Number.isNaN(updatedAt.getTime()) ? "" : getMoscowDateKey(updatedAt);
}

function getTimestampMs(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getBossRunQueueStorageTimestamp(stored, key) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
    return 0;
  }
  return getTimestampMs(stored[key]);
}

function getBossAutomationUpdatedAtMs(automation) {
  if (!automation || typeof automation !== "object") {
    return 0;
  }
  return getTimestampMs(automation.updatedAt);
}

function getBossAutomationQueueRevision(automation) {
  const revision = Number.parseInt(String(automation && automation.queueRevision), 10);
  return Number.isFinite(revision) && revision >= 0 ? revision : 0;
}

function markBossRunQueueEdited() {
  state.bossRunQueueLastLocalEditAt = Date.now();
  state.bossRunQueueSaveVersion += 1;
  return state.bossRunQueueSaveVersion;
}

function shouldApplyBossAutomationQueue(automation, options = {}) {
  if (options.syncQueue === false) {
    return false;
  }
  if (options.forceSyncQueue === true) {
    return true;
  }
  if (state.bossRunQueuePendingSaves > 0) {
    return false;
  }

  const serverUpdatedAt = getBossAutomationUpdatedAtMs(automation);
  const lastServerUpdatedAt = Number(state.bossRunQueueLastServerUpdatedAt || 0);
  if (lastServerUpdatedAt > 0 && (!serverUpdatedAt || serverUpdatedAt < lastServerUpdatedAt)) {
    return false;
  }

  const lastLocalEditAt = Number(state.bossRunQueueLastLocalEditAt || 0);
  if (lastLocalEditAt > 0 && (!serverUpdatedAt || serverUpdatedAt < lastLocalEditAt)) {
    return false;
  }

  return true;
}

function ensureBossRunQueueCurrentDate(options = {}) {
  const nowKey = getMoscowDateKey();
  if (!state.bossRunQueueDateKey) {
    state.bossRunQueueDateKey = nowKey;
    return false;
  }
  if (state.bossRunQueueDateKey === nowKey) {
    return false;
  }

  const previousCount = Array.isArray(state.bossRunQueue) ? state.bossRunQueue.length : 0;
  state.bossRunQueueDateKey = nowKey;
  state.bossRunQueue = [];
  state.bossRunQueueLastServerUpdatedAt = 0;
  markBossRunQueueEdited();
  persistBossRunQueue();

  if (previousCount > 0 && options.notify !== false) {
    appendLog("Boss run queue reset", `${nowKey} MSK`);
  }
  if (previousCount > 0 && options.refreshUi !== false) {
    renderBossRunQueue();
  }
  return previousCount > 0;
}

function persistBossRunQueue() {
  const nowKey = getMoscowDateKey();
  if (state.bossRunQueueDateKey && state.bossRunQueueDateKey !== nowKey) {
    state.bossRunQueue = [];
  }
  state.bossRunQueueDateKey = nowKey;
  state.bossRunQueue = normalizeBossRunQueueEntries(state.bossRunQueue)
    .map((entry) => withBossRunQueueHitTypes(entry));
  const payload = {
    mskDate: state.bossRunQueueDateKey,
    updatedAt: new Date().toISOString(),
    entries: state.bossRunQueue,
  };
  if (state.bossRunQueueLastLocalEditAt > 0) {
    payload.localEditedAt = new Date(state.bossRunQueueLastLocalEditAt).toISOString();
  }
  if (state.bossRunQueueLastServerUpdatedAt > 0) {
    payload.serverUpdatedAt = new Date(state.bossRunQueueLastServerUpdatedAt).toISOString();
  }
  payload.serverRevision = Math.max(0, Number(state.bossRunQueueServerRevision || 0) || 0);

  try {
    writeAccountStorage(BOSS_RUN_QUEUE_STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore localStorage write issues and keep runtime state.
  }
}

function loadBossRunQueue() {
  const stored = readBossRunQueueStorage();
  const nowKey = getMoscowDateKey();
  const storedDateKey = getBossRunQueueStorageDateKey(stored);
  const isSameDate = storedDateKey === nowKey;
  const storedEntries = Array.isArray(stored)
    ? stored
    : stored && Array.isArray(stored.entries)
      ? stored.entries
      : [];
  const rawEntries = isSameDate ? storedEntries : [];

  state.bossRunQueueDateKey = nowKey;
  state.bossRunQueue = normalizeBossRunQueueEntries(rawEntries);
  state.bossRunQueueLastLocalEditAt = isSameDate
    ? getBossRunQueueStorageTimestamp(stored, "localEditedAt")
    : 0;
  state.bossRunQueueLastServerUpdatedAt = isSameDate
    ? getBossRunQueueStorageTimestamp(stored, "serverUpdatedAt")
    : 0;
  state.bossRunQueueServerRevision = isSameDate
    ? Math.max(0, Number(stored && stored.serverRevision || 0) || 0)
    : 0;
  persistBossRunQueue();
  return {
    loaded: state.bossRunQueue.length,
    resetByDate: storedEntries.length > 0 && !isSameDate,
  };
}

function readBossQueueSettingsStorage() {
  try {
    const raw = readAccountStorage(BOSS_QUEUE_SETTINGS_STORAGE_KEY)
      || readAccountStorage(BOSS_QUEUE_LEGACY_SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function normalizeBossQueueRules(raw) {
  const result = {};
  for (const [id, rule] of Object.entries(raw && typeof raw === "object" ? raw : {})) {
    if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0 || !rule || typeof rule !== "object") continue;
    const combo = String(rule.combo || "");
    result[id] = {
      ...(["auto", "none", "pacansky", "blotnoy", "avtoritetny", "vorovskoy"].includes(combo) ? { combo } : {}),
      ...(typeof rule.autoKillSolo === "boolean" ? { autoKillSolo: rule.autoKillSolo } : {}),
    };
  }
  return result;
}

function resolveBossAutoQueueRule(bossId, settings = state.bossQueueSettings || {}) {
  const rule = settings.rulesByBossId?.[String(bossId)] || {};
  return {
    combo: rule.combo || (settings.autoQueueUseCombo === false ? "none" : settings.autoQueueComboMode || "auto"),
    autoKillSolo: rule.autoKillSolo ?? (settings.autoQueueKillSolo !== false),
  };
}

function normalizeBossQueueSettings(rawValue) {
  const raw = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
    ? rawValue
    : {};
  const bossId = Number(raw.bossId || 0);
  const delayMs = Number(raw.delayMs);
  const hasSelectedIds = raw.selectedIds === null || Array.isArray(raw.selectedIds);
  const selectedIds = Array.isArray(raw.selectedIds) ? normalizeBossIdList(raw.selectedIds) : null;
  // The v1 control was an exclusion list.  Keep it only long enough to turn it
  // into a selection after the live catalog has loaded, so existing users keep
  // exactly the same effective queue after the UI upgrade.
  const legacyExcludedIds = hasSelectedIds
    ? Array.isArray(raw.legacyExcludedIds)
      ? normalizeBossIdList(raw.legacyExcludedIds)
      : null
    : Array.isArray(raw.excludedIds)
      ? normalizeBossIdList(raw.excludedIds)
      : null;

  return {
    category: typeof raw.category === "string" ? raw.category : "startable",
    bossId: Number.isFinite(bossId) && bossId > 0 ? bossId : null,
    mode: normalizeBossComboMode(raw.mode),
    comboMode: normalizeBossComboMode(raw.comboMode),
    autoKillSolo: raw.autoKillSolo !== false,
    useCombo: raw.useCombo !== false,
    autoQueueKillSolo: raw.autoQueueKillSolo !== false,
    autoQueueUseCombo: raw.autoQueueUseCombo !== false,
    autoQueueComboMode: normalizeBossComboMode(raw.autoQueueComboMode),
    rulesByBossId: normalizeBossQueueRules(raw.rulesByBossId),
    smartCollection: raw.smartCollection === undefined
      ? Boolean(state.bossSmartQueueCollectionEnabled)
      : Boolean(raw.smartCollection),
    autoBuyKeys: Boolean(raw.autoBuyKeys),
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? Math.floor(delayMs) : 0,
    selectedIds,
    legacyExcludedIds,
    modeByBossId: normalizeBossRunQueueModeOverrides(raw.modeByBossId || raw.modeOverrides),
    excludeTemplateId: typeof (raw.selectionTemplateId || raw.excludeTemplateId) === "string" && String(raw.selectionTemplateId || raw.excludeTemplateId).trim()
      ? String(raw.selectionTemplateId || raw.excludeTemplateId).trim()
      : BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID,
    autoStartNext: raw.autoStartNext === undefined ? true : Boolean(raw.autoStartNext),
    rulesOpen: Boolean(raw.rulesOpen),
    exclusionsOpen: Boolean(raw.selectionOpen ?? raw.exclusionsOpen),
  };
}

function applyBossQueueSettingsToControls() {
  const settings = state.bossQueueSettings;
  if (!settings) {
    return;
  }

  for (const [id, key] of [["boss-auto-kill-solo", "autoKillSolo"], ["boss-use-combo", "useCombo"], ["boss-auto-queue-kill-solo", "autoQueueKillSolo"], ["boss-auto-queue-use-combo", "autoQueueUseCombo"]]) {
    if ($(`#${id}`)) $(`#${id}`).checked = settings[key];
  }
  if ($("#boss-auto-queue-combo-mode")) $("#boss-auto-queue-combo-mode").value = settings.autoQueueComboMode;
  const category = $("#boss-category");
  if (category && [...category.options].some((option) => option.value === settings.category)) {
    category.value = settings.category;
  }
  const smartCollection = $("#boss-run-queue-smart-collection");
  if (smartCollection) {
    smartCollection.checked = settings.smartCollection;
  }
  const autoBuyKeys = $("#boss-auto-buy-keys");
  if (autoBuyKeys) {
    autoBuyKeys.checked = settings.autoBuyKeys;
  }
  const delay = $("#boss-delay");
  if (delay) {
    delay.value = String(settings.delayMs);
  }
  const autoStartNext = $("#boss-auto-start-next");
  if (autoStartNext) {
    autoStartNext.checked = settings.autoStartNext;
  }
  const rules = $("#boss-queue-settings");
  if (rules) {
    rules.open = settings.rulesOpen;
  }
  const exclusions = $("#boss-run-queue-exclude-panel");
  if (exclusions) {
    exclusions.open = settings.exclusionsOpen;
  }
}

function collectBossQueueSettings() {
  const previous = state.bossQueueSettings || normalizeBossQueueSettings(null);
  const category = $("#boss-category");
  const boss = $("#boss-select");
  const mode = $("#boss-mode");
  const comboMode = $("#boss-combo-mode");
  const delayMs = Number($("#boss-delay")?.value);
  const selectedBossId = Number(boss && boss.value || 0);
  const modeByBossId = {};
  for (const [bossId, selectedMode] of getBossRunQueueModeOverrides()) {
    modeByBossId[String(bossId)] = selectedMode;
  }

  const selectedIds = getBossRunQueueSelectedIds();
  return normalizeBossQueueSettings({
    category: category ? category.value : previous.category,
    bossId: Number.isFinite(selectedBossId) && selectedBossId > 0 ? selectedBossId : previous.bossId,
    mode: mode ? mode.value : previous.mode,
    comboMode: comboMode && !comboMode.disabled ? comboMode.value : previous.comboMode,
    autoKillSolo: $("#boss-auto-kill-solo")?.checked !== false,
    useCombo: $("#boss-use-combo")?.checked !== false,
    autoQueueKillSolo: $("#boss-auto-queue-kill-solo")?.checked !== false,
    autoQueueUseCombo: $("#boss-auto-queue-use-combo")?.checked !== false,
    autoQueueComboMode: $("#boss-auto-queue-combo-mode")?.value || "",
    rulesByBossId: previous.rulesByBossId,
    smartCollection: isBossSmartQueueCollectionEnabled(),
    autoBuyKeys: Boolean($("#boss-auto-buy-keys")?.checked),
    delayMs: Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : previous.delayMs,
    selectedIds: selectedIds === null
      ? null
      : normalizeBossIdList(selectedIds),
    legacyExcludedIds: selectedIds === null && state.bossRunQueueLegacyExcludedIds instanceof Set
      ? normalizeBossIdList(state.bossRunQueueLegacyExcludedIds)
      : null,
    modeByBossId,
    excludeTemplateId: state.bossExcludeTemplateId,
    autoStartNext: Boolean($("#boss-auto-start-next")?.checked),
    rulesOpen: Boolean($("#boss-queue-settings")?.open),
    exclusionsOpen: Boolean($("#boss-run-queue-exclude-panel")?.open),
  });
}

function persistBossQueueSettings() {
  const settings = collectBossQueueSettings();
  state.bossQueueSettings = settings;
  state.bossRunQueueSelectedIds = settings.selectedIds === null ? null : new Set(settings.selectedIds);
  state.bossRunQueueLegacyExcludedIds = null;
  state.bossRunQueueModeOverrides = normalizeBossRunQueueModeOverrides(settings.modeByBossId);
  try {
    writeAccountStorage(BOSS_QUEUE_SETTINGS_STORAGE_KEY, JSON.stringify({
      ...settings,
      updatedAt: new Date().toISOString(),
    }));
  } catch (_error) {
    // Keep the current page state even when browser storage is unavailable.
  }
  return settings;
}

function loadBossQueueSettings() {
  const settings = normalizeBossQueueSettings(readBossQueueSettingsStorage());
  state.bossQueueSettings = settings;
  state.bossRunQueueSelectedIds = settings.selectedIds === null ? null : new Set(settings.selectedIds);
  state.bossRunQueueLegacyExcludedIds = settings.legacyExcludedIds === null
    ? null
    : new Set(settings.legacyExcludedIds);
  state.bossRunQueueModeOverrides = normalizeBossRunQueueModeOverrides(settings.modeByBossId);
  state.bossExcludeTemplateId = settings.excludeTemplateId;
  state.bossSmartQueueCollectionEnabled = settings.smartCollection;
  state.bossAuto.autoStartNext = settings.autoStartNext;
  applyBossQueueSettingsToControls();
  return settings;
}

function collectBossAutomationPayload(overrides = {}, options = {}) {
  ensureBossRunQueueCurrentDate({ notify: true, refreshUi: true });
  const intervalInput = $("#boss-auto-interval");
  const autoRefreshToggle = $("#boss-auto-refresh");
  const autoStartToggle = $("#boss-auto-start-next");
  const intervalSec = Math.max(
    5,
    Number(
      intervalInput
        ? intervalInput.value
        : state.bossAuto.intervalSec || BOSS_AUTO_REFRESH_DEFAULT_SEC,
    ) || state.bossAuto.intervalSec || BOSS_AUTO_REFRESH_DEFAULT_SEC,
  );

  const payload = {
    enabled: autoRefreshToggle ? autoRefreshToggle.checked : state.bossAuto.enabled,
    autoStartNext: autoStartToggle ? autoStartToggle.checked : state.bossAuto.autoStartNext,
    intervalSec,
    ...overrides,
  };
  if (options.includeQueue !== false) {
    payload.queue = normalizeBossRunQueueEntries(state.bossRunQueue)
      .map((entry) => withBossRunQueueHitTypes(entry));
    payload.queueBaseRevision = Math.max(0, Number(state.bossRunQueueServerRevision || 0) || 0);
  }
  return payload;
}

function applyBossAutomationState(automation, options = {}) {
  if (!automation || typeof automation !== "object") {
    return null;
  }

  const syncQueue = shouldApplyBossAutomationQueue(automation, options);
  if (syncQueue) {
    const queueDate = getBossRunQueueStorageDateKey(automation) || getMoscowDateKey();
    state.bossRunQueueDateKey = queueDate;
    state.bossRunQueue = normalizeBossRunQueueEntries(automation.queue);
    state.bossRunQueueServerRevision = getBossAutomationQueueRevision(automation);
    const serverUpdatedAt = getBossAutomationUpdatedAtMs(automation);
    if (serverUpdatedAt > 0) {
      state.bossRunQueueLastServerUpdatedAt = serverUpdatedAt;
      if (
        state.bossRunQueueLastLocalEditAt > 0
        && serverUpdatedAt >= state.bossRunQueueLastLocalEditAt
      ) {
        state.bossRunQueueLastLocalEditAt = 0;
      }
    }
  }
  state.bossAuto.enabled = Boolean(automation.enabled);
  state.bossAuto.intervalSec = Math.max(
    5,
    Number(automation.intervalSec || BOSS_AUTO_REFRESH_DEFAULT_SEC) || BOSS_AUTO_REFRESH_DEFAULT_SEC,
  );
  state.bossAuto.autoStartNext = Boolean(automation.autoStartNext);
  state.bossAuto.serverRunning = Boolean(automation.running);
  state.bossAuto.timerActive = Boolean(automation.timerActive);
  state.bossAuto.tickCount = Math.max(0, Number(automation.tickCount || 0) || 0);
  state.bossAuto.lastTickStartedAt = automation.lastTickStartedAt || null;
  state.bossAuto.lastTickFinishedAt = automation.lastTickFinishedAt || null;
  state.bossAuto.lastError = automation.lastError || null;
  state.bossAuto.lastAction = automation.lastAction || null;
  state.bossAuto.lastStarted = automation.lastStarted || null;
  state.bossAuto.snoozedUntil = automation.snoozedUntil || null;
  state.bossAuto.snoozeReason = automation.snoozeReason || null;
  state.bossAuto.pendingReward = automation.pendingReward || null;
  const recentActivity = Array.isArray(automation.recentActivity)
    ? automation.recentActivity
    : [];
  syncBossAutomationActivityToMainLog(recentActivity);
  state.bossAuto.recentActivity = recentActivity;
  if (syncQueue) {
    persistBossRunQueue();
  }

  if (options.syncControls !== false) {
    const intervalInput = $("#boss-auto-interval");
    const autoRefreshToggle = $("#boss-auto-refresh");
    const autoStartToggle = $("#boss-auto-start-next");
    if (intervalInput) {
      intervalInput.value = String(state.bossAuto.intervalSec);
    }
    if (autoRefreshToggle) {
      autoRefreshToggle.checked = state.bossAuto.enabled;
    }
    if (autoStartToggle) {
      autoStartToggle.checked = state.bossAuto.autoStartNext;
    }
  }

  if (options.syncLocalTimer !== false) {
    syncBossAutoRefreshLocal({ silent: true });
  }
  if (options.renderQueue !== false) {
    renderBossRunQueue();
  }
  updateBossAutoStatus();
  renderBossAutomationActivity();
  return automation;
}

async function syncBossAutomationState(overrides = {}, options = {}) {
  const silent = Boolean(options.silent);
  if (!silent) {
    setServerStatus("saving boss automation", "busy");
  }

  const syncQueueResponse = options.syncQueue !== false;
  const requestQueueVersion = state.bossRunQueueSaveVersion;
  if (syncQueueResponse) {
    state.bossRunQueuePendingSaves += 1;
    updateBossAutoStatus();
  }

  try {
    const payload = collectBossAutomationPayload(overrides, {
      includeQueue: syncQueueResponse && options.includeQueue !== false,
    });
    const automation = await apiRequest(
      "POST",
      "/api/bosses/automation",
      payload,
      { timeoutMs: options.requestTimeoutMs },
    );
    const isLatestQueueSave = !syncQueueResponse
      || requestQueueVersion === state.bossRunQueueSaveVersion;
    applyBossAutomationState(automation, {
      syncControls: true,
      syncLocalTimer: true,
      renderQueue: options.renderQueue !== false,
      syncQueue: syncQueueResponse && isLatestQueueSave,
      forceSyncQueue: syncQueueResponse && isLatestQueueSave,
    });
    if (automation && automation.queueUpdate && automation.queueUpdate.accepted === false) {
      appendLog("Boss queue sync conflict", "Automation changed the queue; loaded the latest server queue.");
    }
    if (!silent) {
      setServerStatus("ready", "ok");
    }
    return automation;
  } catch (error) {
    if (!silent) {
      setServerStatus("boss automation error", "error");
    }
    throw error;
  } finally {
    if (syncQueueResponse) {
      state.bossRunQueuePendingSaves = Math.max(0, state.bossRunQueuePendingSaves - 1);
      updateBossAutoStatus();
    }
  }
}

async function syncBossAutomationAfterQueueEdit(actionLabel, overrides = {}, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 2) || 2);
  const requestTimeoutMs = Math.max(1_000, Number(options.requestTimeoutMs || 8_000) || 8_000);
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await syncBossAutomationState(overrides, {
        silent: true,
        renderQueue: false,
        ...options,
        requestTimeoutMs,
      });
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(Math.min(1_000, attempt * 250));
      }
    }
  }
  appendLog(`${actionLabel} sync failed`, lastError && lastError.message || "error");
  appendDiagnosticError("bosses", lastError);
  return null;
}

function normalizeBossComboTemplateRecord(rawRecord) {
  if (!rawRecord || typeof rawRecord !== "object") {
    return null;
  }
  const bossId = Number(rawRecord.bossId || 0);
  const comboMode = normalizeBossComboMode(rawRecord.comboMode || rawRecord.mode);
  const rawSequence = Array.isArray(rawRecord.sequence) ? rawRecord.sequence : [];
  const sequence = rawSequence
    .map((value) => String(value || "").trim())
    .filter((value) => BOSS_COMBO_ACTION_KEYS.has(value));

  if (!Number.isFinite(bossId) || bossId <= 0 || !comboMode || sequence.length === 0) {
    return null;
  }

  const updatedDate = new Date(rawRecord.updatedAt || Date.now());
  const updatedAt = Number.isNaN(updatedDate.getTime())
    ? new Date().toISOString()
    : updatedDate.toISOString();

  return {
    bossId,
    comboMode,
    sequence,
    finishWithNeedle: rawRecord.finishWithNeedle === true,
    updatedAt,
  };
}

function syncBossRunQueueNeedleFinisher(bossId, comboMode, enabled) {
  const numericBossId = Number(bossId || 0);
  const normalizedComboMode = normalizeBossComboMode(comboMode);
  const operations = [];
  state.bossRunQueue = (Array.isArray(state.bossRunQueue) ? state.bossRunQueue : []).map((entry) => {
    if (
      Number(entry && entry.bossId || 0) !== numericBossId
      || normalizeBossComboMode(entry && entry.comboMode) !== normalizedComboMode
    ) {
      return entry;
    }
    const previous = { ...entry };
    const next = { ...entry };
    if (enabled) {
      next.finishWithNeedle = true;
    } else {
      delete next.finishWithNeedle;
    }
    const normalized = withBossRunQueueHitTypes(next);
    if (JSON.stringify(previous) !== JSON.stringify(normalized)) {
      operations.push({ type: "replace", from: previous, item: normalized });
    }
    return normalized;
  });
  if (operations.length === 0) {
    return;
  }
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  void syncBossAutomationAfterQueueEdit(
    "Boss combo Needle finisher",
    { queueOperations: operations },
    { includeQueue: false },
  );
}

function readBossComboStorage() {
  try {
    const raw = readAccountStorage(BOSS_COMBO_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function persistBossComboTemplates() {
  const payload = {
    mskDate: state.bossComboDateKey || getMoscowDateKey(),
    templates: Object.values(state.bossComboTemplates || {}),
  };
  try {
    writeAccountStorage(BOSS_COMBO_STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore localStorage write issues and keep runtime state.
  }
}

function renderBossComboTemplateDependents() {
  populateBossComboDialogBossSelect();
  populateBossComboDialogModeSelect();
  updateBossComboInlineButtonState();
  if (state.bossDashboard) {
    renderBossDashboard(state.bossDashboard);
  } else {
    renderBossAttackQueue();
    renderBossRunQueue();
  }
}

function ensureBossComboTemplatesCurrentDate(options = {}) {
  const nowKey = getMoscowDateKey();
  if (!state.bossComboDateKey) {
    state.bossComboDateKey = nowKey;
    return false;
  }
  if (state.bossComboDateKey === nowKey) {
    return false;
  }

  const hadTemplates = Object.keys(state.bossComboTemplates || {}).length > 0;
  state.bossComboDateKey = nowKey;
  state.bossComboTemplates = {};
  persistBossComboTemplates();

  if (hadTemplates && options.notify !== false) {
    appendLog("Boss combo templates reset", `${nowKey} MSK`);
  }
  if (hadTemplates && options.refreshUi !== false) {
    renderBossComboTemplateDependents();
  }
  return hadTemplates;
}

function loadBossComboTemplates() {
  const nowKey = getMoscowDateKey();
  state.bossComboDateKey = nowKey;
  state.bossComboTemplates = {};

  const stored = readBossComboStorage();
  if (!stored) {
    persistBossComboTemplates();
    return { loaded: 0, resetByDate: false };
  }

  const isSameDate = stored.mskDate === nowKey;
  if (!isSameDate) {
    persistBossComboTemplates();
    return { loaded: 0, resetByDate: Boolean(stored.mskDate) };
  }

  const templates = Array.isArray(stored.templates) ? stored.templates : [];
  for (const rawRecord of templates) {
    if (rawRecord && rawRecord.source === "library") {
      continue;
    }
    const record = normalizeBossComboTemplateRecord(rawRecord);
    if (!record) {
      continue;
    }
    const key = buildBossComboTemplateKey(record.bossId, record.comboMode);
    if (!key) {
      continue;
    }
    state.bossComboTemplates[key] = record;
  }
  persistBossComboTemplates();
  return { loaded: Object.keys(state.bossComboTemplates).length, resetByDate: false };
}

function scheduleBossComboMidnightReset() {
  if (state.bossComboMidnightTimerId) {
    clearTimeout(state.bossComboMidnightTimerId);
  }
  state.bossComboMidnightTimerId = setTimeout(() => {
    ensureBossComboTemplatesCurrentDate({ notify: true, refreshUi: true });
    const queueReset = ensureBossRunQueueCurrentDate({ notify: true, refreshUi: true });
    if (queueReset) {
      syncBossAutomationAfterQueueEdit(
        "Boss queue daily reset",
        { queueOperations: [{ type: "clear" }] },
        { includeQueue: false },
      ).catch((error) => {
        appendLog("Boss queue daily reset sync failed", error.message || "error");
      });
    }
    scheduleBossComboMidnightReset();
  }, getMsUntilNextMoscowMidnight());
}

function getBossComboTemplateCount() {
  ensureBossComboTemplatesCurrentDate({ notify: true, refreshUi: false });
  return Object.keys(getEffectiveBossComboTemplates()).length;
}

function applyBossComboLibrary(library) {
  if (!library || library.mskDate !== getMoscowDateKey() || !Array.isArray(library.combos)) {
    state.bossComboLibrary = null;
    return;
  }
  const templates = {};
  for (const item of library.combos) {
    const key = buildBossComboTemplateKey(item.bossId, item.comboMode);
    if (!key || !["pacansky", "blotnoy", "avtoritetny"].includes(item.comboMode)
      || !Array.isArray(item.sequence) || item.sequence.length === 0
      || !item.sequence.every((hit) => BOSS_COMBO_ACTION_KEYS.has(hit))) continue;
    templates[key] = {
      bossId: item.bossId, comboMode: item.comboMode, sequence: [...item.sequence],
      updatedAt: library.updatedAt, automatic: true, finishWithNeedle: false,
    };
  }
  state.bossComboLibrary = { mskDate: library.mskDate, templates };
}

function getEffectiveBossComboTemplates() {
  const library = state.bossComboLibrary;
  const automatic = library && library.mskDate === getMoscowDateKey() ? library.templates : {};
  return { ...automatic, ...(state.bossComboTemplates || {}) };
}

function getBossComboTemplate(bossId, comboMode) {
  ensureBossComboTemplatesCurrentDate({ notify: true, refreshUi: false });
  const key = buildBossComboTemplateKey(bossId, comboMode);
  if (!key) {
    return null;
  }
  return getEffectiveBossComboTemplates()[key] || null;
}

function hasBossComboTemplate(bossId, comboMode) {
  return Boolean(getBossComboTemplate(bossId, comboMode));
}

function resolveBossComboTemplateForBossAndMode(options = {}) {
  const bossId = Number(options.bossId || 0);
  if (!Number.isFinite(bossId) || bossId <= 0) {
    return null;
  }

  const comboMode = normalizeBossComboMode(options.comboMode);
  if (!comboMode) {
    return null;
  }

  return getBossComboTemplate(bossId, comboMode);
}

function getBossComboModesForBoss(bossId) {
  ensureBossComboTemplatesCurrentDate({ notify: true, refreshUi: false });
  const numericBossId = Number(bossId || 0);
  if (!Number.isFinite(numericBossId) || numericBossId <= 0) {
    return [];
  }

  const modes = new Set();
  for (const template of Object.values(getEffectiveBossComboTemplates())) {
    if (!template || Number(template.bossId) !== numericBossId) {
      continue;
    }
    const modeKey = normalizeBossComboMode(template.comboMode);
    if (modeKey) {
      modes.add(modeKey);
    }
  }

  const orderIndex = new Map(BOSS_COMBO_MODE_ORDER.map((value, index) => [value, index]));
  return [...modes].sort((left, right) => {
    const leftOrder = orderIndex.has(left) ? orderIndex.get(left) : Number.MAX_SAFE_INTEGER;
    const rightOrder = orderIndex.has(right) ? orderIndex.get(right) : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.localeCompare(right, "ru");
  });
}

function getBossComboModeMarker(mode) {
  const modeKey = normalizeBossComboMode(mode);
  if (!modeKey) {
    return "";
  }
  if (BOSS_COMBO_MODE_MARKERS[modeKey]) {
    return BOSS_COMBO_MODE_MARKERS[modeKey];
  }
  return modeKey.slice(0, 1).toUpperCase();
}

function renderBossComboMarks(bossId) {
  const modes = getBossComboModesForBoss(bossId);
  if (modes.length === 0) {
    return "";
  }
  return `
    <div class="boss-combo-marks">
      ${modes.map((mode) => `
        <span class="boss-combo-mark" title="${escapeHtml(formatComboModeLabel(mode))}">
          ${escapeHtml(getBossComboModeMarker(mode))}
        </span>
      `).join("")}
    </div>
  `;
}

function getBossAvatarUrl(bossId) {
  const numericBossId = Number(bossId);
  return Number.isInteger(numericBossId) && numericBossId > 0
    ? `/assets/bosses/${numericBossId}.webp`
    : null;
}

function renderBossAvatar(boss, options = {}) {
  const bossId = Number(boss && boss.id);
  const avatarUrl = getBossAvatarUrl(bossId);
  if (!avatarUrl) {
    return "";
  }

  const title = options.title || boss && boss.title || `Босс #${bossId}`;
  const categoryId = Number(options.categoryId ?? (boss && boss.categoryId)) || 0;
  const variant = options.variant === "active" ? "is-active" : "is-catalog";
  const loading = options.eager ? "eager" : "lazy";
  const alt = options.alt === undefined ? "" : options.alt;
  return `
    <span class="boss-avatar ${variant} category-${escapeHtml(categoryId)}" title="${escapeHtml(title)}">
      <img
        class="boss-avatar-image"
        src="${escapeHtml(avatarUrl)}"
        alt="${escapeHtml(alt)}"
        loading="${loading}"
        decoding="async"
      >
      <span class="boss-avatar-id" aria-hidden="true">${escapeHtml(bossId)}</span>
    </span>
  `;
}

function bindBossAvatarFallbacks(root) {
  const container = root && root.querySelectorAll ? root : document;
  for (const image of container.querySelectorAll(".boss-avatar-image")) {
    if (image.dataset.fallbackBound === "1") {
      continue;
    }
    image.dataset.fallbackBound = "1";
    const markUnavailable = () => {
      image.hidden = true;
      image.closest(".boss-avatar")?.classList.add("is-fallback");
    };
    image.addEventListener("error", markUnavailable, { once: true });
    if (image.complete && image.naturalWidth === 0) {
      markUnavailable();
    }
  }
}

function hasSelectOption(select, value) {
  if (!select) {
    return false;
  }
  const text = String(value ?? "");
  return [...select.options].some((item) => item.value === text);
}

function setBossComboDialogNote(message, tone = "neutral") {
  const node = $("#boss-combo-template-note");
  if (!node) {
    return;
  }
  node.textContent = message;
  node.dataset.tone = tone;
}

function getBossComboDialogSelection() {
  const bossSelect = $("#boss-combo-template-boss");
  const modeSelect = $("#boss-combo-template-mode");
  const bossId = bossSelect ? Number(bossSelect.value || 0) : 0;
  const comboMode = modeSelect ? normalizeBossComboMode(modeSelect.value || "") : "";
  return {
    bossId,
    comboMode,
  };
}

function collectBossComboDialogModeOptions(bossId) {
  const map = getBossQueueCandidateMap();
  const candidate = map.get(Number(bossId || 0)) || null;
  const source = resolveBossComboModes(candidate);
  const seen = new Set();
  const output = [];
  for (const rawMode of source) {
    const mode = normalizeBossComboMode(rawMode);
    if (!mode || seen.has(mode)) {
      continue;
    }
    seen.add(mode);
    output.push(mode);
  }
  return output;
}

function populateBossComboDialogBossSelect(options = {}) {
  const select = $("#boss-combo-template-boss");
  if (!select) {
    return;
  }
  const currentValue = select.value;
  const queueBosses = state.bossDashboard && state.bossDashboard.queue
    ? state.bossDashboard.queue.bosses || []
    : [];
  const seen = new Set();
  const bosses = queueBosses
    .filter((boss) => {
      const key = Number(boss.id || 0);
      if (
        !Number.isFinite(key)
        || key <= 0
        || seen.has(key)
        || resolveBossComboModes(boss).length === 0
      ) {
        return false;
      }
      seen.add(key);
      return true;
    });

  if (!syncSelectOptions(select, bosses.map((boss) => ({
    value: String(boss.id),
    label: `#${boss.id} ${boss.title}`,
  })))) {
    return;
  }

  const preferredBossId = options.preferredBossId
    ? String(options.preferredBossId)
    : $("#boss-select")
      ? $("#boss-select").value
      : "";

  if (options.forcePreferred === true && hasSelectOption(select, preferredBossId)) {
    select.value = preferredBossId;
  } else if (hasSelectOption(select, currentValue)) {
    select.value = currentValue;
  } else if (hasSelectOption(select, preferredBossId)) {
    select.value = preferredBossId;
  } else if (bosses.length > 0) {
    select.value = String(bosses[0].id);
  } else {
    select.value = "";
  }
}

function populateBossComboDialogModeSelect(options = {}) {
  const select = $("#boss-combo-template-mode");
  const bossSelect = $("#boss-combo-template-boss");
  if (!select || !bossSelect) {
    return;
  }
  const currentValue = normalizeBossComboMode(select.value || "");
  const bossId = Number(bossSelect.value || 0);
  const modes = collectBossComboDialogModeOptions(bossId);

  if (!syncSelectOptions(select, modes.map((mode) => ({
    value: mode,
    label: formatComboModeLabel(mode),
  })))) {
    return;
  }

  const preferredMode = normalizeBossComboMode(
    options.preferredMode
    || ($("#boss-combo-mode") ? $("#boss-combo-mode").value : ""),
  );

  if (options.forcePreferred === true && hasSelectOption(select, preferredMode)) {
    select.value = preferredMode;
  } else if (hasSelectOption(select, currentValue)) {
    select.value = currentValue;
  } else if (hasSelectOption(select, preferredMode)) {
    select.value = preferredMode;
  } else if (modes.length > 0) {
    select.value = modes[0];
  } else {
    select.value = "";
  }
}

function refreshBossComboDialogMeta(options = {}) {
  const input = $("#boss-combo-template-text");
  const finishWithNeedle = $("#boss-combo-template-finish-with-needle");
  const { bossId, comboMode } = getBossComboDialogSelection();
  const count = getBossComboTemplateCount();
  if (!bossId || !comboMode) {
    if (options.fillTextarea && input) {
      input.value = "";
    }
    if (options.fillTextarea && finishWithNeedle) {
      finishWithNeedle.checked = false;
    }
    setBossComboDialogNote(`Выберите босса и режим комбо. Сохранено шаблонов: ${count}.`);
    return;
  }

  const template = getBossComboTemplate(bossId, comboMode);
  if (!template) {
    if (options.fillTextarea && input) {
      input.value = "";
    }
    if (options.fillTextarea && finishWithNeedle) {
      finishWithNeedle.checked = false;
    }
    setBossComboDialogNote(
      `No saved combo for #${bossId} / ${formatComboModeLabel(comboMode)}. Saved templates: ${count}.`,
    );
    return;
  }

  if (options.fillTextarea && input) {
    input.value = formatBossComboSequence(template.sequence);
  }
  if (options.fillTextarea && finishWithNeedle) {
    finishWithNeedle.checked = template.finishWithNeedle === true;
  }
  const needleSuffix = template.finishWithNeedle ? " · добитие Иглой" : "";
  setBossComboDialogNote(
    `${template.automatic ? "Автозагрузка" : "Сохранено вручную"}: ${formatNumber(template.sequence.length)} ударов для #${bossId} / ${formatComboModeLabel(comboMode)}${needleSuffix}.`,
    "success",
  );
}

function applyBossComboSequenceToQueue(sequence) {
  state.bossQueue = buildBossQueueFromTypes(sequence);
  renderBossAttackQueue();
}

function applyBossComboDialogTemplateToMainSelection(bossId, comboMode, sequence) {
  if (state.bossComboDialogApplyToMainSelection === false) {
    return false;
  }
  applyBossComboSequenceToQueue(sequence);
  syncMainBossSelectors(bossId, comboMode);
  return true;
}

function syncMainBossSelectors(bossId, comboMode) {
  const bossSelect = $("#boss-select");
  if (!bossSelect || !hasSelectOption(bossSelect, String(bossId))) {
    return;
  }
  bossSelect.value = String(bossId);
  populateBossModeSelect();

  const comboSelect = $("#boss-combo-mode");
  if (comboSelect && hasSelectOption(comboSelect, comboMode)) {
    comboSelect.value = comboMode;
  }
  renderBossRunQueue();
}

function applyStoredComboTemplateForMainSelection(options = {}) {
  const bossSelect = $("#boss-select");
  if (!bossSelect) {
    return false;
  }
  const bossId = Number(bossSelect.value || 0);
  if (!Number.isFinite(bossId) || bossId <= 0) {
    applyBossComboSequenceToQueue([]);
    return false;
  }
  const candidate = getSelectedBossCandidate();
  if (candidate && resolveBossComboModes(candidate).length === 0) {
    applyBossComboSequenceToQueue([]);
    return false;
  }

  const mode = $("#boss-mode") ? $("#boss-mode").value || "" : "";
  const comboMode = $("#boss-combo-mode") ? $("#boss-combo-mode").value || "" : "";
  const template = resolveBossComboTemplateForBossAndMode({ bossId, mode, comboMode });
  if (!template || !Array.isArray(template.sequence) || template.sequence.length === 0) {
    applyBossComboSequenceToQueue([]);
    return false;
  }

  applyBossComboSequenceToQueue(template.sequence);
  if (!options.silent) {
    appendLog(
      "Attack queue template applied",
      `#${bossId} / ${formatComboModeLabel(template.comboMode)} (${template.sequence.length} hits)`,
    );
  }
  return true;
}

function handleBossComboDialogSave() {
  const input = $("#boss-combo-template-text");
  const finishWithNeedle = $("#boss-combo-template-finish-with-needle");
  const { bossId, comboMode } = getBossComboDialogSelection();
  if (!bossId || !comboMode) {
    setBossComboDialogNote("Select boss and combo mode before save.", "danger");
    return;
  }

  const parsed = parseBossComboSequence(input ? input.value : "");
  if (parsed.sequence.length === 0) {
    setBossComboDialogNote("Combo list is empty or has unsupported actions.", "danger");
    return;
  }
  if (parsed.unknown.length > 0) {
    const preview = parsed.unknown.slice(0, 6).join(", ");
    const suffix = parsed.unknown.length > 6 ? "..." : "";
    setBossComboDialogNote(`Unknown actions: ${preview}${suffix}`, "danger");
    return;
  }

  ensureBossComboTemplatesCurrentDate({ notify: true, refreshUi: true });
  const key = buildBossComboTemplateKey(bossId, comboMode);
  state.bossComboTemplates[key] = {
    bossId,
    comboMode,
    sequence: [...parsed.sequence],
    finishWithNeedle: Boolean(finishWithNeedle && finishWithNeedle.checked),
    updatedAt: new Date().toISOString(),
  };
  persistBossComboTemplates();
  syncBossRunQueueNeedleFinisher(bossId, comboMode, Boolean(finishWithNeedle && finishWithNeedle.checked));

  if (input) {
    input.value = formatBossComboSequence(parsed.sequence);
  }
  const appliedToMainSelection = applyBossComboDialogTemplateToMainSelection(
    bossId,
    comboMode,
    parsed.sequence,
  );
  renderBossComboTemplateDependents();
  setBossComboDialogNote(
    `${appliedToMainSelection ? "Saved and applied" : "Saved"}: ${formatNumber(parsed.sequence.length)} hits for #${bossId} / ${formatComboModeLabel(comboMode)}` +
      `${finishWithNeedle && finishWithNeedle.checked ? " · добитие Иглой" : ""}.`,
    "success",
  );
  appendLog("Boss combo template saved", `#${bossId} / ${comboMode} (${parsed.sequence.length} hits)`);
}

function handleBossComboDialogLoad() {
  const input = $("#boss-combo-template-text");
  const finishWithNeedle = $("#boss-combo-template-finish-with-needle");
  const { bossId, comboMode } = getBossComboDialogSelection();
  if (!bossId || !comboMode) {
    setBossComboDialogNote("Select boss and combo mode before load.", "danger");
    return;
  }

  const template = getBossComboTemplate(bossId, comboMode);
  if (!template) {
    setBossComboDialogNote(`No saved combo for #${bossId} / ${formatComboModeLabel(comboMode)}.`, "danger");
    return;
  }

  if (input) {
    input.value = formatBossComboSequence(template.sequence);
  }
  if (finishWithNeedle) {
    finishWithNeedle.checked = template.finishWithNeedle === true;
  }
  const appliedToMainSelection = applyBossComboDialogTemplateToMainSelection(
    bossId,
    comboMode,
    template.sequence,
  );
  setBossComboDialogNote(
    `${appliedToMainSelection ? "Loaded and applied" : "Loaded"} combo: ${formatNumber(template.sequence.length)} hits for #${bossId} / ${formatComboModeLabel(comboMode)}.`,
    "success",
  );
  appendLog("Boss combo template loaded", `#${bossId} / ${comboMode}`);
}

function handleBossComboDialogDelete() {
  const { bossId, comboMode } = getBossComboDialogSelection();
  if (!bossId || !comboMode) {
    setBossComboDialogNote("Select boss and combo mode before delete.", "danger");
    return;
  }
  const key = buildBossComboTemplateKey(bossId, comboMode);
  if (!key || !state.bossComboTemplates[key]) {
    setBossComboDialogNote(getBossComboTemplate(bossId, comboMode)?.automatic
      ? "Это комбо загружено автоматически. Его можно изменить и сохранить как ручное."
      : `No saved combo for #${bossId} / ${formatComboModeLabel(comboMode)}.`, "danger");
    return;
  }

  delete state.bossComboTemplates[key];
  persistBossComboTemplates();
  syncBossRunQueueNeedleFinisher(bossId, comboMode, false);
  const finishWithNeedle = $("#boss-combo-template-finish-with-needle");
  if (finishWithNeedle) {
    finishWithNeedle.checked = false;
  }
  renderBossComboTemplateDependents();
  refreshBossComboDialogMeta({ fillTextarea: true });
  setBossComboDialogNote(getBossComboTemplate(bossId, comboMode)?.automatic
    ? "Ручная правка удалена, используется автоматически загруженное комбо."
    : `Deleted combo for #${bossId} / ${formatComboModeLabel(comboMode)}.`);
  appendLog("Boss combo template deleted", `#${bossId} / ${comboMode}`);
}

function openBossComboDialog(options = {}) {
  const dialog = $("#boss-combo-dialog");
  if (!dialog) {
    return;
  }
  state.bossComboDialogApplyToMainSelection = options.applyToMainSelection !== false;
  const forcePreferred = options.forcePreferred === true;
  populateBossComboDialogBossSelect({
    preferredBossId: options.preferredBossId || ($("#boss-select") ? $("#boss-select").value : ""),
    forcePreferred,
  });
  populateBossComboDialogModeSelect({
    preferredMode: options.preferredMode || ($("#boss-combo-mode") ? $("#boss-combo-mode").value : ""),
    forcePreferred,
  });
  refreshBossComboDialogMeta({ fillTextarea: true });

  if (!dialog.open) {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "open");
    }
  }
}

function openBossComboDialogForCurrentSelection() {
  const candidate = getSelectedBossCandidate();
  if (resolveBossComboModes(candidate).length === 0) {
    const label = candidate && candidate.title ? `#${candidate.id} ${candidate.title}` : "Выбранный босс";
    appendLog("Комбо недоступно", `${label}: игра больше не поддерживает комбо.`);
    return false;
  }
  openBossComboDialog({ forcePreferred: true });
  return true;
}

function closeBossComboDialog() {
  const dialog = $("#boss-combo-dialog");
  if (!dialog) {
    return;
  }
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function getAuthReasonLabel(reason) {
  switch (String(reason || "")) {
    case "session-file-missing":
      return "файл сессии отсутствует";
    case "initdata-missing":
      return "InitData отсутствует";
    case "access-token-missing":
      return "токен доступа отсутствует";
    case "access-token-expired-and-refresh-missing":
      return "токен доступа истёк, токена обновления нет";
    case "tokens-expired":
      return "токены авторизации истекли";
    case "access-token-expired-refresh-available":
      return "токен доступа истёк, но доступно обновление";
    case "session-ready":
      return "сессия активна";
    default:
      return reason ? String(reason) : "статус неизвестен";
  }
}

function isAuthStatusActive(payload) {
  const auth = payload && payload.auth ? payload.auth : {};
  if (auth.isActive !== undefined || auth.requiresLogin !== undefined || (payload && payload.requiresLogin !== undefined)) {
    return Boolean(auth.isActive && !auth.requiresLogin && !(payload && payload.requiresLogin));
  }

  const tokenStillValid = (expiresAt) => {
    if (!expiresAt) {
      return true;
    }
    const timestamp = Date.parse(expiresAt);
    return !Number.isFinite(timestamp) || timestamp > Date.now();
  };

  return Boolean(
    (auth.hasAccessToken && tokenStillValid(auth.accessTokenExpUtc))
    || (auth.hasRefreshToken && tokenStillValid(auth.refreshTokenExpUtc)),
  );
}

function setAuthGateMessage(message, tone = "") {
  const target = $("#auth-gate-status-note");
  if (!target) {
    return;
  }
  target.textContent = message;
  if (tone) {
    target.dataset.tone = tone;
  } else {
    delete target.dataset.tone;
  }
}

function setAuthGateControlsDisabled(disabled) {
  [
    "#auth-gate-account-select",
    "#auth-gate-switch-saved-btn",
    "#auth-gate-initdata",
    "#auth-gate-login-btn",
    "#auth-gate-access-token",
    "#auth-gate-refresh-token",
    "#auth-gate-token-login-btn",
    "#auth-gate-status-btn",
  ].forEach((selector) => {
    const node = $(selector);
    if (node) {
      node.disabled = Boolean(disabled);
    }
  });
}

function showAuthGate(payload) {
  const loader = $("#initial-loader");
  const authGate = $("#auth-gate");
  const shell = $(".app-shell");

  state.authGateActive = true;
  renderAuthStatus(payload);
  document.body.classList.remove("app-loading", "app-ready", "app-load-error");
  document.body.classList.add("app-auth-required");
  if (loader) {
    loader.hidden = true;
    loader.setAttribute("aria-hidden", "true");
  }
  if (shell) {
    shell.setAttribute("inert", "");
    shell.setAttribute("aria-hidden", "true");
  }
  if (authGate) {
    authGate.hidden = false;
    authGate.removeAttribute("inert");
    authGate.setAttribute("aria-hidden", "false");
  }

  const reason = getAuthReasonLabel(payload && (payload.reason || (payload.auth && payload.auth.reason)));
  setAuthGateMessage(`Нужен вход: ${reason}.`, "error");
  window.setTimeout(() => {
    $('#auth-gate .auth-method-panel:not([hidden]) input, #auth-gate .auth-method-panel:not([hidden]) textarea')?.focus({ preventScroll: true });
  }, 0);
}

function renderAuthStatus(payload) {
  state.auth = payload;
  const auth = payload && payload.auth ? payload.auth : {};
  const selfUserId = auth.selfUserId ? String(auth.selfUserId) : "";
  const selfUserIdTarget = $("#self-user-id");
  if (selfUserIdTarget) {
    selfUserIdTarget.textContent = selfUserId || "—";
  }

  const items = [
    { label: "Файл сессии", value: payload && payload.sessionExists ? "найден" : "отсутствует" },
    { label: "Статус", value: isAuthStatusActive(payload) ? "активна" : "нужен вход" },
    { label: "InitData", value: auth.hasInitData ? `${formatNumber(auth.initDataLength || 0)} симв.` : "отсутствует" },
    { label: "Токен доступа", value: auth.hasAccessToken ? "да" : "нет" },
    { label: "Токен обновления", value: auth.hasRefreshToken ? "да" : "нет" },
    { label: "Срок токена доступа", value: auth.accessTokenExpUtc ? formatDate(auth.accessTokenExpUtc) : "-" },
    { label: "Срок токена обновления", value: auth.refreshTokenExpUtc ? formatDate(auth.refreshTokenExpUtc) : "-" },
  ];

  renderStatGrid($("#auth-summary"), items);
  renderStatGrid($("#auth-gate-summary"), items);

  const reason = getAuthReasonLabel(payload && (payload.reason || auth.reason));
  const noteParts = [];
  if (selfUserId) {
    noteParts.push(`игрок ${selfUserId}`);
  }
  noteParts.push(isAuthStatusActive(payload) ? "сессия активна" : `нужен вход: ${reason}`);
  if (auth.authDateUtc) {
    noteParts.push(`авторизация ${formatDate(auth.authDateUtc)}`);
  }
  if (auth.updatedAt) {
    noteParts.push(`обновлено ${formatDate(auth.updatedAt)}`);
  }
  const note = noteParts.length > 0
    ? `Статус авторизации: ${noteParts.join(" | ")}`
    : "Статус авторизации: данные игрового аккаунта ещё не получены.";
  ["#auth-status-note", "#auth-gate-status-note"].forEach((selector) => {
    const noteTarget = $(selector);
    if (noteTarget) {
      noteTarget.textContent = note;
      noteTarget.dataset.tone = isAuthStatusActive(payload) ? "ok" : "error";
    }
  });
}

function normalizeJournalSource(value) {
  const source = String(value || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(JOURNAL_SOURCE_META, source)
    ? source
    : "system";
}

function getActiveJournalSource() {
  const activeTab = document.querySelector(".tab-button.is-active")?.dataset.tab;
  return normalizeJournalSource(activeTab || state.journal.currentSource || "system");
}

function inferJournalSource(message) {
  const text = String(message || "").toLowerCase();
  const groups = [
    ["bosses", /boss|босс|attack queue|attack queue|игл[аы]|комбо|combo|оружи|выход из боя/],
    ["prison", /prison|тюрьм|общак|подогрев|вещи мастера|ручной проход|auto-run|цель выбрана|дефолтная цель/],
    ["friends", /friend|друз|приглаш|заявк|статистика урона|ids?\b|автоприём/],
    ["misc", /разное|делюг|нычк|впар|посыл|баул|контейнер|автоплей|мини-игр|фартов|коллекция вещей/],
    ["events", /пора варить|lets.?cook|бодряк|шкаф|варщик|барыг|смотрящ/],
    ["system", /server|сервер|auth|авторизац|запуск заверш|ошибка запуска|фонов|startup|сессия|session/],
  ];
  const match = groups.find(([, pattern]) => pattern.test(text));
  return match ? match[0] : getActiveJournalSource();
}

function inferJournalKind(message, meta, source) {
  const text = `${message || ""} ${meta || ""}`.toLowerCase();
  if (/ошиб|error|failed|fail\b|не удалось|отказ|rejected|invalid|conflict/.test(text)) {
    return "error";
  }
  if (/награ|reward|выпал|получен|собран|открыт|комбо.*итог/.test(text)) {
    return "reward";
  }
  return source === "system" ? "action" : "action";
}

function normalizeJournalKind(value, message, meta, source) {
  const kind = String(value || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(JOURNAL_KIND_META, kind)
    ? kind
    : inferJournalKind(message, meta, source);
}

function upsertJournalEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const key = String(entry.key || `local:${Date.now()}:${state.journal.nextId++}`);
  if (state.journal.dismissedKeys.has(key)) {
    return null;
  }
  const source = normalizeJournalSource(entry.source);
  const message = String(entry.message || "Событие");
  const meta = String(entry.meta || "");
  const atDate = new Date(entry.at || Date.now());
  const at = Number.isFinite(atDate.getTime()) ? atDate.toISOString() : new Date().toISOString();
  const normalized = {
    ...entry,
    key,
    at,
    source,
    kind: normalizeJournalKind(entry.kind, message, meta, source),
    message,
    meta,
  };
  const existingIndex = state.logs.findIndex((item) => item.key === key);
  if (existingIndex >= 0) {
    state.logs[existingIndex] = {
      ...state.logs[existingIndex],
      ...normalized,
    };
  } else {
    state.logs.push(normalized);
  }
  if (state.logs.length > JOURNAL_MAX_ENTRIES) {
    state.logs = state.logs
      .sort((left, right) => Date.parse(left.at || "") - Date.parse(right.at || ""))
      .slice(-JOURNAL_MAX_ENTRIES);
  }
  return normalized;
}

function getJournalFilters() {
  return {
    source: $("#journal-source-filter")?.value || "current",
    kind: $("#journal-kind-filter")?.value || "all",
    search: String($("#journal-search")?.value || "").trim().toLowerCase(),
    currentSource: state.journal.currentSource || getActiveJournalSource(),
  };
}

function journalEntryMatchesFilters(entry, filters = {}) {
  const requestedSource = filters.source === "current"
    ? normalizeJournalSource(filters.currentSource)
    : filters.source || "all";
  if (requestedSource !== "all" && entry.source !== requestedSource) {
    return false;
  }
  if (filters.kind && filters.kind !== "all" && entry.kind !== filters.kind) {
    return false;
  }
  if (filters.search) {
    const bossRewardItems = entry.bossActivity
      ? [
        ...collectBossClaimJournalRewardItems(entry.bossActivity.rewards),
        ...collectBossComboJournalRewardItems(entry.bossActivity.comboRewards),
      ]
      : [];
    const rewardText = [
      ...(Array.isArray(entry.rewardItems) ? entry.rewardItems : []),
      ...bossRewardItems,
    ]
      .map((item) => {
        const typeLabel = item.type === "tattoo"
          ? "Наколка"
          : item.type === "clothing"
            ? "Вещь"
            : item.type === "currency"
              ? "Валюта"
              : "";
        return `${typeLabel} ${item.label || ""} ${item.amount || ""}`;
      })
      .join(" ");
    const haystack = `${entry.message || ""} ${entry.meta || ""} ${rewardText}`.toLowerCase();
    if (!haystack.includes(filters.search)) {
      return false;
    }
  }
  return true;
}

function formatJournalEntryTime(value) {
  const date = new Date(value || "");
  if (!Number.isFinite(date.getTime())) {
    return "—";
  }
  const now = new Date();
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  return date.toLocaleString("ru-RU", sameDay
    ? { hour: "2-digit", minute: "2-digit", second: "2-digit" }
    : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function renderJournalRewardChip(item) {
  if (!item || typeof item !== "object") {
    return "";
  }
  const amount = Number(item.amount);
  const hasAmount = Number.isFinite(amount) && amount !== 0;
  const amountLabel = hasAmount
    ? `${amount > 0 ? "+" : "−"}${formatNumber(Math.abs(amount))}`
    : "";
  const label = String(item.label || item.name || "Награда");
  const title = String(item.title || `${label}${amountLabel ? ` ${amountLabel}` : ""}`);
  const imageUrl = String(item.imageUrl || item.image || "").trim();
  const wearableClass = item.type === "tattoo" || item.type === "clothing" ? " is-wearable" : "";
  return `
    <span class="journal-reward-chip${wearableClass}" title="${escapeHtml(title)}">
      ${imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="">`
        : `<span class="journal-reward-fallback" aria-hidden="true">${escapeHtml(item.symbol || "◆")}</span>`}
      <span>${escapeHtml(amountLabel ? `${amountLabel} ${label}` : label)}</span>
    </span>
  `;
}

function renderJournalRewardLine(label, items) {
  const rewards = (Array.isArray(items) ? items : []).filter(Boolean);
  if (rewards.length === 0) {
    return "";
  }
  return `
    <span class="journal-reward-line">
      ${label ? `<span class="journal-reward-line-label">${escapeHtml(label)}</span>` : ""}
      ${rewards.map(renderJournalRewardChip).join("")}
    </span>
  `;
}

function renderJournalEntryRewards(entry) {
  const lines = [];
  if (Array.isArray(entry.rewardItems) && entry.rewardItems.length > 0) {
    lines.push(renderJournalRewardLine(entry.rewardLabel || "", entry.rewardItems));
  }
  if (entry.bossActivity) {
    const claimItems = collectBossClaimJournalRewardItems(entry.bossActivity.rewards);
    if (claimItems.length > 0) {
      lines.push(renderJournalRewardLine("Награда за бой", claimItems));
    }
    const economy = entry.bossActivity.comboEconomy && entry.bossActivity.comboEconomy.measured
      ? entry.bossActivity.comboEconomy
      : null;
    if (economy) {
      lines.push(`
        <span class="journal-reward-line">
          <span class="journal-reward-line-label">Итог комбо</span>
          ${entry.bossComboMarkup || renderBossComboNetChips(economy.net, entry.bossActivity.comboRewards)}
        </span>
      `);
    } else {
      const comboItems = collectBossComboJournalRewardItems(entry.bossActivity.comboRewards);
      if (comboItems.length > 0) {
        lines.push(renderJournalRewardLine("Награда за комбо", comboItems));
      }
    }
  }
  return lines.filter(Boolean).length > 0
    ? `<span class="journal-rewards">${lines.filter(Boolean).join("")}</span>`
    : "";
}

function renderJournalEntry(entry) {
  const source = JOURNAL_SOURCE_META[entry.source] || JOURNAL_SOURCE_META.system;
  const kind = JOURNAL_KIND_META[entry.kind] || JOURNAL_KIND_META.action;
  const fullDate = new Date(entry.at || "").toLocaleString("ru-RU");
  return `
    <article class="journal-entry" data-source="${escapeHtml(entry.source)}" data-kind="${escapeHtml(entry.kind)}">
      <span class="journal-entry-aside">
        <time class="journal-entry-time" datetime="${escapeHtml(entry.at)}" title="${escapeHtml(fullDate)}">${escapeHtml(formatJournalEntryTime(entry.at))}</time>
        <span class="journal-source-badge">${escapeHtml(source.shortLabel)}</span>
        <span class="journal-kind-badge">${escapeHtml(kind.label)}</span>
      </span>
      <span class="journal-entry-main">
        <strong class="journal-entry-title">${escapeHtml(entry.message)}</strong>
        ${entry.meta ? `<span class="journal-entry-meta">${escapeHtml(entry.meta)}</span>` : ""}
        ${renderJournalEntryRewards(entry)}
      </span>
    </article>
  `;
}

function renderLog() {
  const target = $("#journal-list");
  if (!target) {
    return;
  }
  const filters = getJournalFilters();
  const items = state.logs
    .filter((entry) => journalEntryMatchesFilters(entry, filters))
    .sort((left, right) => Date.parse(right.at || "") - Date.parse(left.at || ""));
  const count = $("#journal-count");
  if (count) {
    count.textContent = formatNumber(items.length);
  }
  const sourceLabel = filters.source === "current"
    ? JOURNAL_SOURCE_META[filters.currentSource]?.label || "текущей вкладки"
    : filters.source === "all"
      ? "всех разделов"
      : JOURNAL_SOURCE_META[filters.source]?.label || "выбранного раздела";
  const note = $("#journal-context-note");
  if (note) {
    note.textContent = `События: ${sourceLabel.toLowerCase()} · найдено ${formatNumber(items.length)}`;
  }
  target.innerHTML = items.length > 0
    ? items.map(renderJournalEntry).join("")
    : `
      <div class="journal-empty">
        <strong>Здесь пока тихо</strong>
        <span>Попробуй другой источник, тип события или сбрось поиск.</span>
      </div>
    `;
}

function appendLog(message, meta, options = {}) {
  const translatedMessage = translateUiText(message);
  if (
    !options.important
    && JOURNAL_ROUTINE_MESSAGE_PATTERNS.some((pattern) => (
      pattern.test(String(message || "")) || pattern.test(translatedMessage)
    ))
  ) {
    return null;
  }
  const source = normalizeJournalSource(options.source || inferJournalSource(message));
  const entry = upsertJournalEntry({
    key: options.key,
    at: options.at || new Date().toISOString(),
    source,
    kind: options.kind,
    message: translatedMessage,
    meta: meta ? translateUiText(meta) : "",
    rewardItems: Array.isArray(options.rewardItems) ? options.rewardItems : [],
    rewardLabel: options.rewardLabel || "",
    bossActivity: options.bossActivity || null,
    bossRewardBossId: options.bossRewardBossId || null,
    bossRewardSignature: options.bossRewardSignature || "",
  });
  renderLog();
  return entry;
}

function formatUserFacingError(error) {
  const detail = String(error && (error.message || error.stack) || error || "Неизвестная ошибка");
  if (JOURNAL_EXPECTED_DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(detail))) {
    return null;
  }
  if (/invalid.*initdata|initdata.*(?:expired|invalid)|query.*(?:expired|invalid)/i.test(detail)) {
    return "InitData недействительна или устарела. Скопируй новую InitData из игры.";
  }
  if (/\b429\b|too many requests|rate.?limit|slow down/i.test(detail)) {
    return "Сервер игры временно ограничил запросы. Повторим автоматически.";
  }
  if (/missing accesstoken|cannot refresh|refresh token|unauthori[sz]ed|token.*expired/i.test(detail)) {
    return "Игровая сессия истекла. Войди снова по InitData.";
  }
  if (/aborterror|timed?\s*out|timeout/i.test(detail)) {
    return "Игровой сервер отвечает слишком долго. Повторим автоматически.";
  }
  return translateUiText(detail).replace(/\s+/g, " ").trim().slice(0, 500);
}

function appendDiagnosticError(source, error) {
  const normalizedSource = normalizeJournalSource(source);
  const userDetail = formatUserFacingError(error);
  if (!userDetail) {
    return null;
  }
  const now = Date.now();
  const duplicate = state.logs.some((entry) => (
    entry.source === normalizedSource
    && entry.kind === "error"
    && entry.meta === userDetail
    && now - Date.parse(entry.at || "") < 30_000
  ));
  if (duplicate) {
    return null;
  }
  return appendLog("Не удалось обновить данные", userDetail, {
    source: normalizedSource,
    kind: "error",
    important: true,
  });
}

async function apiRequest(method, url, payload, requestOptions = {}) {
  const requestKey = method === "GET" && payload === undefined ? `${method} ${url}` : null;
  if (requestKey && state.apiRequestInflight.has(requestKey)) {
    return state.apiRequestInflight.get(requestKey);
  }

  const requestPromise = (async () => {
    const options = {
      method,
      headers: {},
    };
    const timeoutMs = Math.max(0, Number(requestOptions.timeoutMs || 0) || 0);
    const controller = timeoutMs > 0 ? new AbortController() : null;
    let timeoutId = null;

    if (payload !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(payload);
    }

    if (controller) {
      options.signal = controller.signal;
      timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        const message = data && data.error ? data.error : `HTTP ${response.status}`;
        throw new Error(message);
      }

      return data.data;
    } catch (error) {
      if (controller && controller.signal.aborted) {
        throw new Error(`Локальный запрос ${method} ${url} не ответил за ${timeoutMs} мс.`);
      }
      throw error;
    } finally {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    }
  })();

  if (requestKey) {
    state.apiRequestInflight.set(requestKey, requestPromise);
  }

  try {
    return await requestPromise;
  } finally {
    if (requestKey && state.apiRequestInflight.get(requestKey) === requestPromise) {
      state.apiRequestInflight.delete(requestKey);
    }
  }
}

async function handleServerShutdown() {
  const button = $("#server-shutdown-btn");
  if (!button || !window.confirm("Stop the local Pbot server and exit? Any active automation will stop.")) {
    return;
  }

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Stopping...";
  setServerStatus("stopping server", "busy");

  try {
    await apiRequest("POST", "/api/system/shutdown");
    appendLog("Server shutdown", "The local server is stopping");
    setServerStatus("server stopped", "ok");
    window.setTimeout(() => window.close(), 400);
  } catch (error) {
    button.disabled = false;
    button.textContent = originalLabel;
    setServerStatus("server shutdown error", "error");
    appendLog("Server shutdown failed", error.message || "error");
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setServerStatus(text, tone = "ok") {
  const node = $("#server-status");
  const activity = $("#server-activity");
  const stableText = tone === "error" ? "Ошибка" : "В сети";
  const stableTone = tone === "error" ? "error" : "ok";
  setTextIfChanged(node, stableText);
  node.dataset.tone = stableTone;
  setTextIfChanged(activity, tone === "error" ? text : "Подключено");
}

function selectedSources() {
  return [...document.querySelectorAll('input[name="friends-source"]:checked')].map((input) => input.value);
}

function populateSourcePicks() {
  const markup = SOURCE_OPTIONS.map((item, index) => `
    <label class="source-chip">
      <input type="checkbox" name="friends-source" value="${item.key}" ${index < 4 ? "checked" : ""}>
      <span>${escapeHtml(item.label)}</span>
    </label>
  `).join("");

  $("#friends-source-picks").innerHTML = markup;
}

function initializeDrawerNavigation() {
  const menu = $("#main-menu");
  if (!menu) {
    return;
  }
  document.body.classList.remove("drawer-open");
  menu.removeAttribute("inert");
  menu.setAttribute("aria-hidden", "false");
}

function bindAuthMethodTabs() {
  document.querySelectorAll("[data-auth-methods]").forEach((group) => {
    const tabs = [...group.querySelectorAll('[role="tab"]')];
    const selectTab = (selected) => {
      tabs.forEach((tab) => {
        const active = tab === selected;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
      });
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => selectTab(tab));
      tab.addEventListener("keydown", (event) => {
        let nextIndex;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") nextIndex = (index + tabs.length - 1) % tabs.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = tabs.length - 1;
        else return;
        event.preventDefault();
        selectTab(tabs[nextIndex]);
        tabs[nextIndex].focus();
      });
    });
  });
}

function bindTabs() {
  const buttons = [...document.querySelectorAll(".tab-button")];
  const panels = [...document.querySelectorAll(".tab-panel")];

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      buttons.forEach((item) => item.classList.toggle("is-active", item === button));
      panels.forEach((panel) => panel.classList.toggle("is-active", panel.dataset.panel === tab));
      syncJournalContext(tab === "misc" && state.activeMiscSection === "events" ? "events" : tab);
      void loadActiveTabPage(tab).catch(() => null);
      const eventsSectionActive = tab === "misc" && state.activeMiscSection === "events";
      if (!eventsSectionActive && state.letsCookPollTimerId) {
        clearTimeout(state.letsCookPollTimerId);
        state.letsCookPollTimerId = null;
      } else if (
        eventsSectionActive
        && !state.letsCookPollTimerId
        && state.letsCookDashboard?.automation?.settings?.enabled
      ) {
        state.letsCookPollTimerId = setTimeout(
          () => void handleLetsCookDashboard({ silent: true, syncControls: false }),
          10000,
        );
      }
    });
  }
}

function normalizeAboutSponsorTier(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const aliases = {
    authority: "authority",
    avtoritet: "authority",
    avtoritetny: "authority",
    "авторитет": "authority",
    "авторитеты": "authority",
    blatnoy: "blatnoy",
    blotnoy: "blatnoy",
    blat: "blatnoy",
    "блатной": "blatnoy",
    "блатные": "blatnoy",
    patsan: "patsan",
    pacan: "patsan",
    pacansky: "patsan",
    "пацан": "patsan",
    "пацаны": "patsan",
  };
  return aliases[normalized] || null;
}

function normalizeAboutSponsors(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload && Array.isArray(payload.sponsors)
      ? payload.sponsors
      : [];
  const seen = new Set();
  const sponsors = [];

  for (const item of source) {
    const userId = String(item && (item.userId ?? item.gameUserId ?? item.id) || "").trim();
    const nickname = String(item && (item.nickname ?? item.displayName ?? item.nick) || "").trim()
      || `ID ${userId}`;
    const tier = normalizeAboutSponsorTier(item && (item.tier ?? item.level));
    if (!/^\d+$/.test(userId) || !nickname || !tier || seen.has(userId)) {
      continue;
    }
    seen.add(userId);
    sponsors.push({ userId, nickname, tier });
  }

  return sponsors.sort((left, right) => {
    const tierDifference = ABOUT_SPONSOR_TIERS[right.tier].priority - ABOUT_SPONSOR_TIERS[left.tier].priority;
    return tierDifference || left.nickname.localeCompare(right.nickname, "ru");
  });
}

function aboutSponsorStatusMeta(status) {
  if (status === "profile-loading") {
    return { icon: "…", label: "Загружаем ник", disabled: true };
  }
  if (status === "self") {
    return { icon: "•", label: "Это вы", disabled: true };
  }
  if (status === "friend") {
    return { icon: "✓", label: "Уже в друзьях", disabled: true };
  }
  if (status === "requested") {
    return { icon: "↗", label: "Заявка отправлена", disabled: true };
  }
  if (status === "incoming") {
    return { icon: "↙", label: "Есть входящая заявка", disabled: true };
  }
  if (status === "loading") {
    return { icon: "…", label: "Отправляем заявку", disabled: true };
  }
  return { icon: "+", label: "Добавить в друзья", disabled: false };
}

let authoritySponsorGlowFrameId = 0;
let authoritySponsorGlowPending = null;

function scheduleAuthoritySponsorGlow(card, x, y, edgeOpacity) {
  authoritySponsorGlowPending = { card, x, y, edgeOpacity };
  if (authoritySponsorGlowFrameId) {
    return;
  }
  authoritySponsorGlowFrameId = window.requestAnimationFrame(() => {
    authoritySponsorGlowFrameId = 0;
    const pending = authoritySponsorGlowPending;
    authoritySponsorGlowPending = null;
    if (!pending || !pending.card.isConnected) {
      return;
    }
    pending.card.style.setProperty("--authority-glow-x", `${pending.x.toFixed(1)}px`);
    pending.card.style.setProperty("--authority-glow-y", `${pending.y.toFixed(1)}px`);
    pending.card.style.setProperty("--authority-edge-opacity", pending.edgeOpacity.toFixed(3));
  });
}

function handleAuthoritySponsorPointerMove(event) {
  if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const card = event.target.closest(".about-sponsor-card.is-authority");
  if (!card) {
    return;
  }
  const rect = card.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
  const edgeDistance = Math.max(0, Math.min(x, y, rect.width - x, rect.height - y));
  const edgeThreshold = Math.max(18, Math.min(34, Math.min(rect.width, rect.height) * 0.38));
  const edgeOpacity = Math.max(0, Math.min(1, 1 - edgeDistance / edgeThreshold));
  scheduleAuthoritySponsorGlow(card, x, y, edgeOpacity);
}

function handleAuthoritySponsorPointerOut(event) {
  const card = event.target.closest(".about-sponsor-card.is-authority");
  if (!card || (event.relatedTarget && card.contains(event.relatedTarget))) {
    return;
  }
  scheduleAuthoritySponsorGlow(card, card.clientWidth / 2, card.clientHeight / 2, 0);
}

function renderAboutSponsorFilters() {
  const target = $("#about-sponsor-filters");
  if (!target) {
    return;
  }
  const counts = new Map(ABOUT_SPONSOR_FILTERS.map((item) => [item.key, 0]));
  counts.set("all", state.aboutSponsors.length);
  for (const sponsor of state.aboutSponsors) {
    counts.set(sponsor.tier, (counts.get(sponsor.tier) || 0) + 1);
  }
  target.innerHTML = ABOUT_SPONSOR_FILTERS.map((filter) => {
    const active = filter.key === state.aboutSponsorFilter;
    const iconTiers = filter.key === "all"
      ? ["authority", "blatnoy", "patsan"]
      : [filter.key];
    const icons = iconTiers.map((tierKey) => {
      const tier = ABOUT_SPONSOR_TIERS[tierKey];
      return `<img src="${escapeHtml(tier.iconUrl)}" alt="">`;
    }).join("");
    return `
      <button
        type="button"
        class="${active ? "is-active" : ""}"
        data-about-sponsor-filter="${escapeHtml(filter.key)}"
        aria-pressed="${active ? "true" : "false"}"
      >
        <span class="about-sponsor-filter-icon${filter.key === "all" ? " is-all" : ""}" aria-hidden="true">${icons}</span>
        <span>${escapeHtml(filter.label)}</span>
        <b>${escapeHtml(formatNumber(counts.get(filter.key) || 0))}</b>
      </button>
    `;
  }).join("");
}

function renderAboutSponsors() {
  const target = $("#about-sponsors-list");
  if (!target) {
    return;
  }
  renderAboutSponsorFilters();
  const visibleSponsors = state.aboutSponsorFilter === "all"
    ? state.aboutSponsors
    : state.aboutSponsors.filter((sponsor) => sponsor.tier === state.aboutSponsorFilter);

  if (visibleSponsors.length === 0) {
    target.innerHTML = '<div class="about-sponsors-empty">Пока никто не подогрел проект</div>';
    return;
  }

  target.innerHTML = visibleSponsors.map((sponsor) => {
    const tier = ABOUT_SPONSOR_TIERS[sponsor.tier];
    const nicknameResolved = !/^ID \d+$/.test(String(sponsor.nickname || ""));
    const sponsorName = nicknameResolved ? sponsor.nickname : "Загружаем ник…";
    const selfUserId = String(state.auth && state.auth.auth && state.auth.auth.selfUserId || "");
    const status = !nicknameResolved
      ? "profile-loading"
      : selfUserId && sponsor.userId === selfUserId
      ? "self"
      : state.aboutSponsorInvitesRunning.has(sponsor.userId)
      ? "loading"
      : state.aboutSponsorFriendStatuses.get(sponsor.userId) || "available";
    const statusMeta = aboutSponsorStatusMeta(status);
    const authorityEffects = sponsor.tier === "authority"
      ? '<span class="about-sponsor-authority-border-glow" aria-hidden="true"></span><span class="about-sponsor-authority-glare" aria-hidden="true"></span>'
      : "";
    return `
      <article class="about-sponsor-card is-${escapeHtml(sponsor.tier)}">
        ${authorityEffects}
        <span class="about-sponsor-tier-icon" title="${escapeHtml(tier.label)}">
          <img src="${escapeHtml(tier.iconUrl)}" alt="${escapeHtml(tier.label)}">
        </span>
        <strong class="about-sponsor-name" title="${escapeHtml(sponsorName)}">${escapeHtml(sponsorName)}</strong>
        <button
          class="about-sponsor-friend-button"
          type="button"
          data-about-sponsor-invite
          data-user-id="${escapeHtml(sponsor.userId)}"
          data-status="${escapeHtml(status)}"
          aria-label="${escapeHtml(`${statusMeta.label}: ${sponsorName}`)}"
          title="${escapeHtml(statusMeta.label)}"
          ${statusMeta.disabled ? "disabled" : ""}
        ><span aria-hidden="true">${escapeHtml(statusMeta.icon)}</span></button>
      </article>
    `;
  }).join("");
}

function hasUnresolvedAboutSponsorNames() {
  return state.aboutSponsors.some((sponsor) => /^ID \d+$/.test(String(sponsor.nickname || "")));
}

function scheduleAboutSponsorsRetry() {
  if (!hasUnresolvedAboutSponsorNames() || state.aboutSponsorsRetryTimer || state.aboutSponsorsRetryCount >= 6) {
    return;
  }
  const delayMs = Math.min(15_000, 2_000 * (state.aboutSponsorsRetryCount + 1));
  state.aboutSponsorsRetryCount += 1;
  state.aboutSponsorsRetryTimer = window.setTimeout(() => {
    state.aboutSponsorsRetryTimer = null;
    void loadAboutSponsors({ force: true }).catch(() => {});
  }, delayMs);
}

async function loadAboutSponsors(options = {}) {
  if (state.aboutSponsorsLoaded && !options.force) {
    return state.aboutSponsors;
  }
  if (state.aboutSponsorsLoadPromise) {
    return state.aboutSponsorsLoadPromise;
  }

  state.aboutSponsorsLoadPromise = (async () => {
    let loadError = null;
    try {
      const payload = await apiRequest("GET", "/api/about/sponsors");
      const previousNames = new Map(state.aboutSponsors
        .filter((sponsor) => !/^ID \d+$/.test(String(sponsor.nickname || "")))
        .map((sponsor) => [sponsor.userId, sponsor.nickname]));
      state.aboutSponsors = normalizeAboutSponsors(payload).map((sponsor) => ({
        ...sponsor,
        nickname: /^ID \d+$/.test(sponsor.nickname) && previousNames.has(sponsor.userId)
          ? previousNames.get(sponsor.userId)
          : sponsor.nickname,
      }));
      state.aboutSponsorFriendStatusesLoaded = false;
      state.aboutSponsorsLoadError = null;
    } catch (error) {
      loadError = error;
      state.aboutSponsorsLoadError = error;
      state.aboutSponsors = [];
      appendDiagnosticError("system", error);
    } finally {
      state.aboutSponsorsLoaded = true;
      state.aboutSponsorsLoadPromise = null;
      renderAboutSponsors();
      if (hasUnresolvedAboutSponsorNames()) {
        scheduleAboutSponsorsRetry();
      } else {
        state.aboutSponsorsRetryCount = 0;
      }
    }
    if (loadError) throw loadError;
    return state.aboutSponsors;
  })();

  return state.aboutSponsorsLoadPromise;
}

async function refreshAboutSponsorFriendStatuses() {
  if (
    state.aboutSponsorFriendStatusesLoaded
    || state.aboutSponsorFriendStatusesLoading
    || state.aboutSponsors.length === 0
  ) {
    return;
  }
  state.aboutSponsorFriendStatusesLoading = true;
  try {
    const ids = state.aboutSponsors.map((sponsor) => sponsor.userId).join(",");
    const payload = await apiRequest("GET", `/api/friends/status?ids=${encodeURIComponent(ids)}`);
    const statuses = payload && payload.statuses && typeof payload.statuses === "object"
      ? payload.statuses
      : {};
    state.aboutSponsorFriendStatuses = new Map(
      Object.entries(statuses).map(([userId, status]) => [String(userId), String(status)]),
    );
    state.aboutSponsorFriendStatusesLoaded = true;
  } catch (error) {
    appendDiagnosticError("friends", error);
  } finally {
    state.aboutSponsorFriendStatusesLoading = false;
    renderAboutSponsors();
  }
}

async function handleAboutSponsorInvite(event) {
  const button = event.target.closest("[data-about-sponsor-invite]");
  if (!button || button.disabled) {
    return;
  }
  const userId = String(button.dataset.userId || "");
  const sponsor = state.aboutSponsors.find((item) => item.userId === userId);
  if (!sponsor || state.aboutSponsorInvitesRunning.has(userId)) {
    return;
  }

  state.aboutSponsorInvitesRunning.add(userId);
  renderAboutSponsors();
  try {
    const payload = await apiRequest("POST", "/api/friends/invite-users", {
      source: "about_sponsors",
      max: 1,
      delayMs: 0,
      excludeSelf: true,
      targets: [{ userId: sponsor.userId, nickname: sponsor.nickname }],
    });
    const result = Array.isArray(payload.results) ? payload.results[0] : null;
    if (Number(payload.skippedExisting || 0) > 0) {
      state.aboutSponsorFriendStatuses.set(userId, "friend");
    } else if (result && result.ok) {
      state.aboutSponsorFriendStatuses.set(userId, "requested");
    } else {
      throw new Error(result && result.data && result.data.message ? result.data.message : "Не удалось отправить заявку в друзья.");
    }
    appendLog("Подогрели проект", `${sponsor.nickname}: ${aboutSponsorStatusMeta(state.aboutSponsorFriendStatuses.get(userId)).label}`);
  } catch (error) {
    appendDiagnosticError("friends", error);
  } finally {
    state.aboutSponsorInvitesRunning.delete(userId);
    renderAboutSponsors();
  }
}

function initializeAboutSponsors() {
  $("#about-sponsor-filters")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-about-sponsor-filter]");
    if (!button) {
      return;
    }
    state.aboutSponsorFilter = button.dataset.aboutSponsorFilter || "all";
    renderAboutSponsors();
  });
  const sponsorsList = $("#about-sponsors-list");
  sponsorsList?.addEventListener("click", handleAboutSponsorInvite);
  sponsorsList?.addEventListener("pointermove", handleAuthoritySponsorPointerMove, { passive: true });
  sponsorsList?.addEventListener("pointerout", handleAuthoritySponsorPointerOut, { passive: true });
  renderAboutSponsors();
}

async function handleAboutTabOpen() {
  if (state.aboutSponsorsLoadError || !state.aboutSponsorsLoaded || hasUnresolvedAboutSponsorNames()) {
    await loadAboutSponsors({ force: state.aboutSponsorsLoaded });
  }
  await refreshAboutSponsorFriendStatuses();
}

function initializeSectionDropdown({
  dropdownSelector,
  triggerSelector,
  toggleSelector,
  triggerLabelSelector,
  menuSelector,
  itemSelector,
  panelSelector,
  sectionDataKey,
  defaultSection,
  defaultLabel,
  titlePrefix,
  onSelect,
}) {
  const dropdown = $(dropdownSelector);
  const trigger = $(triggerSelector);
  const toggle = $(toggleSelector);
  const triggerLabel = $(triggerLabelSelector);
  const menu = $(menuSelector);
  if (!dropdown || !trigger || !toggle || !triggerLabel || !menu) {
    return;
  }

  const items = [...menu.querySelectorAll(itemSelector)];
  const panels = [...document.querySelectorAll(panelSelector)];
  const setOpen = (open) => {
    dropdown.classList.toggle("is-open", open);
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };
  const showSection = (selectedSection) => {
    const selectedItem = items.find((item) => item.dataset[sectionDataKey] === selectedSection);
    const selectedLabel = selectedItem ? selectedItem.textContent.trim() : defaultLabel;
    panels.forEach((panel) => {
      panel.hidden = panel.dataset[sectionDataKey] !== selectedSection;
    });
    items.forEach((item) => {
      const active = item.dataset[sectionDataKey] === selectedSection;
      item.classList.toggle("is-active", active);
      if (active) {
        item.setAttribute("aria-current", "page");
      } else {
        item.removeAttribute("aria-current");
      }
    });
    triggerLabel.textContent = selectedLabel;
    trigger.title = `${titlePrefix} · ${selectedLabel}`;
    toggle.setAttribute("aria-label", `Открыть список разделов вкладки «${selectedLabel}»`);
    onSelect?.(selectedSection);
  };

  trigger.addEventListener("click", () => {
    setOpen(false);
  });
  toggle.addEventListener("click", () => {
    setOpen(menu.hidden);
  });
  toggle.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    if (menu.hidden) {
      toggle.click();
    } else {
      setOpen(true);
    }
    const activeIndex = Math.max(0, items.findIndex((item) => item.classList.contains("is-active")));
    const targetIndex = event.key === "ArrowUp" ? items.length - 1 : activeIndex;
    items[targetIndex]?.focus();
  });
  items.forEach((item) => {
    item.addEventListener("click", () => {
      showSection(item.dataset[sectionDataKey]);
      setOpen(false);
      trigger.click();
      trigger.focus();
    });
  });
  menu.addEventListener("keydown", (event) => {
    const currentIndex = items.indexOf(document.activeElement);
    if (currentIndex < 0 || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % items.length;
    if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    items[nextIndex]?.focus();
  });
  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target)) {
      setOpen(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  showSection(items.find((item) => item.classList.contains("is-active"))?.dataset[sectionDataKey] || defaultSection);
  setOpen(false);
}

function initializeMiscSectionDropdown() {
  initializeSectionDropdown({
    dropdownSelector: "#misc-tab-dropdown",
    triggerSelector: "#misc-tab-trigger",
    toggleSelector: "#misc-tab-toggle",
    triggerLabelSelector: "#misc-tab-label",
    menuSelector: "#misc-section-menu",
    itemSelector: "[data-misc-section]",
    panelSelector: ".misc-section-panel",
    sectionDataKey: "miscSection",
    defaultSection: "deals",
    defaultLabel: "Делюги",
    titlePrefix: "Разное",
    onSelect(selectedSection) {
      state.activeMiscSection = selectedSection;
      syncJournalContext(selectedSection === "events" ? "events" : "misc");
      if (selectedSection !== "events" && state.letsCookPollTimerId) {
        clearTimeout(state.letsCookPollTimerId);
        state.letsCookPollTimerId = null;
      }
      if (state.pageLoadingEnabled) {
        void ensurePageLoaded(miscSectionPageKey(selectedSection)).catch(() => null);
      }
    },
  });
}

function initializeFriendsSectionDropdown() {
  initializeSectionDropdown({
    dropdownSelector: "#friends-tab-dropdown",
    triggerSelector: "#friends-tab-trigger",
    toggleSelector: "#friends-tab-toggle",
    triggerLabelSelector: "#friends-tab-label",
    menuSelector: "#friends-section-menu",
    itemSelector: "[data-friends-section]",
    panelSelector: ".friends-section-panel",
    sectionDataKey: "friendsSection",
    defaultSection: "friends",
    defaultLabel: "Друзья",
    titlePrefix: "Друзья",
    onSelect(selectedSection) {
      state.activeFriendsSection = selectedSection;
      if (state.pageLoadingEnabled) {
        const key = selectedSection === "damage" ? "friends-damage" : "friends-main";
        void ensurePageLoaded(key).catch(() => null);
      }
    },
  });
}

function renderInteractionTypes() {
  const select = $("#friends-action-type");
  const values = state.interactionTypes.length > 0
    ? state.interactionTypes
    : ["UpgradeBiceps", "Fight", "Harknut", "TossDroj"];
  const currentValue = select.value;

  if (!syncSelectOptions(select, values.map((value) => ({
    value,
    label: (INTERACTION_ACTION_META[value] || {}).label || value,
  })))) {
    return;
  }

  if (values.includes(currentValue)) {
    select.value = currentValue;
  }
  updateFriendsActionNote();
}

function updateFriendsActionNote() {
  const action = $("#friends-action-type").value;
  const meta = INTERACTION_ACTION_META[action];
  $("#friends-action-note").textContent = meta
    ? meta.note
    : "Используется текущий список друзей с сортировкой по авторитету.";
}

function collectFriendsOptions() {
  return {
    limit: Number($("#friends-collect-limit").value || 100),
    max: Number($("#friends-invite-max").value || 50),
    delayMs: Number($("#friends-invite-delay").value || 0),
    sources: selectedSources(),
    excludeSelf: $("#friends-exclude-self").checked,
    dryRun: false,
    resetProgress: Boolean($("#friends-reset-progress") && $("#friends-reset-progress").checked),
  };
}

function readOptionalNumberInput(selector) {
  const field = $(selector);
  const value = field ? String(field.value || "").trim() : "";
  if (!value) {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : undefined;
}

function collectFriendsCriteriaOptions() {
  return {
    minTalents: readOptionalNumberInput("#friends-min-talents"),
    minWeeklyDamage: readOptionalNumberInput("#friends-min-weekly-damage"),
  };
}

function collectFriendsBatchOptions() {
  return {
    max: Number($("#friends-invite-max").value || 50),
    delayMs: Number($("#friends-invite-delay").value || 0),
    dryRun: false,
    ...collectFriendsCriteriaOptions(),
  };
}

function collectFriendsCleanupOptions() {
  return {
    max: Number($("#friends-cleanup-max").value || 50),
    delayMs: Number($("#friends-invite-delay").value || 0),
    dryRun: false,
    ...collectFriendsCriteriaOptions(),
  };
}

function collectFriendsActionOptions() {
  return {
    max: Number($("#friends-action-count").value || 100),
    delayMs: Number($("#friends-action-delay").value || 0),
    type: $("#friends-action-type").value,
    dryRun: false,
  };
}

function renderEconomyStatus(payload) {
  state.economy = payload;
  setTextIfChanged(
    $("#wallet-updated"),
    payload.stale
      ? `Сохранённые данные · ${payload.updatedAt ? formatDate(payload.updatedAt) : "время неизвестно"}`
      : payload.updatedAt
        ? "В реальном времени · обновление каждые 15 сек."
        : "Балансы загружены",
  );
  renderAllCurrencies();
  renderBossTalents(payload.talents);
  renderPrisonAutomationProgress();
  renderBossAttackQueue();
}

function renderEconomyUnavailable() {
  if (state.economy) {
    return;
  }
  setTextIfChanged(
    $("#wallet-updated"),
    "Игровой сервер недоступен · повторяем автоматически",
  );
  const target = $("#currency-all");
  if (target && target.children.length === 0) {
    target.innerHTML = `
      <div class="currency-unavailable" role="status">
        Балансы временно недоступны. Интерфейс продолжает работать и обновится после восстановления связи.
      </div>
    `;
  }
}

function renderFriendsCollectedLegacy(payload) {
  state.friendsCollected = payload;
  $("#self-user-id").textContent = payload.selfUserId || "—";

  const collected = payload.collected;
  const progress = state.friendsResult && state.friendsResult.progress
    ? state.friendsResult.progress
    : null;
  const processedSet = new Set(
    progress && Array.isArray(progress.processedUserIds)
      ? progress.processedUserIds.map((value) => String(value))
      : [],
  );
  const nextSet = new Set(
    progress && Array.isArray(progress.nextUserIds)
      ? progress.nextUserIds.map((value) => String(value))
      : [],
  );
  const resolveProgressStatus = (userId) => {
    const key = String(userId);
    if (processedSet.has(key)) {
      return buildBadge("processed", "success");
    }
    if (nextSet.has(key)) {
      return buildBadge("next", "neutral");
    }
    if (progress) {
      return buildBadge("pending", "neutral");
    }
    return "—";
  };
  const perSource = Object.entries(collected.sources).map(([key, value]) => ({
    label: key,
    value: formatNumber(value.total),
  }));

  renderStatGrid($("#friends-summary"), [
    { label: "Unique IDs", value: formatNumber(collected.uniqueIds.total) },
    ...perSource.slice(0, 5),
  ]);

  $("#friends-collected-body").innerHTML = collected.uniqueIds.values.slice(0, 40).map((item) => `
    <tr>
      <td>${escapeHtml(item.userId)}</td>
      <td>${escapeHtml(item.nickname || "—")}</td>
      <td>${escapeHtml(item.sources.join(", "))}</td>
      <td>${escapeHtml(item.bestRank ?? "—")}</td>
      <td>${resolveProgressStatus(item.userId)}</td>
    </tr>
  `).join("");
}

function renderFriendsCollected(payload) {
  state.friendsCollected = payload;
  $("#self-user-id").textContent = payload.selfUserId || "-";

  const collected = payload && payload.collected ? payload.collected : { uniqueIds: { total: 0 } };
  renderStatGrid($("#friends-summary"), [
    { label: "Найдено новых ID", value: formatNumber(collected.uniqueIds.total) },
  ]);
}

function renderFriendsActionSummary(payload = state.friendsSummary) {
  const target = $("#friends-action-summary");
  if (!target) {
    return;
  }
  const summary = payload || {};
  const items = [
    { label: "Друзей", value: summary.friendsTotal === null || summary.friendsTotal === undefined ? "-" : formatNumber(summary.friendsTotal) },
  ];
  if (summary.authorityProfilesTotal !== undefined && summary.authorityProfilesTotal !== null) {
    items.push({ label: "Профилей загружено", value: formatNumber(summary.authorityProfilesTotal) });
  }
  if (summary.authorityProfilesMissing !== undefined && summary.authorityProfilesMissing !== null) {
    items.push({ label: "Без данных", value: formatNumber(summary.authorityProfilesMissing) });
  }
  if (summary.refreshedAt) {
    items.push({ label: "Обновлено", value: formatDate(summary.refreshedAt) });
  }
  renderStatGrid(target, items);
}

function formatBatchDuration(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) {
    return "-";
  }
  if (ms < 1000) {
    return `${Math.round(ms)} мс`;
  }
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds} сек.`;
  }
  return `${Math.floor(seconds / 60)} мин. ${seconds % 60} сек.`;
}

function renderFriendsBatchProgress(payload) {
  const progress = payload && (payload.active || payload.last) ? (payload.active || payload.last) : null;
  state.friendsBatchProgress = progress;
  const targets = [...document.querySelectorAll("[data-friends-batch-progress]")];
  if (targets.length === 0) {
    return;
  }
  if (!progress) {
    targets.forEach((target) => {
      target.innerHTML = "";
    });
    return;
  }

  const total = progress.displayTotal;
  const completed = Number(progress.displayCompleted || 0);
  const ratio = total !== null && total !== undefined && total > 0
    ? Math.min(100, Math.round((completed / total) * 100))
    : 0;
  const rate = Number(progress.ratePerSecond);
  const rateLabel = Number.isFinite(rate) && rate > 0
    ? `${rate.toFixed(2).replace(".", ",")} в сек.`
    : "измеряется";
  const profileProgress = progress.profilePagesTotal
    ? `${formatNumber(progress.profilePagesLoaded || 0)} / ${formatNumber(progress.profilePagesTotal)}`
    : progress.profilePagesLoaded
      ? formatNumber(progress.profilePagesLoaded)
      : "-";
  const kindLabel = FRIENDS_BATCH_KIND_LABELS[progress.kind] || translateUiText(progress.kind || "Массовая операция");
  const stageLabel = FRIENDS_BATCH_STAGE_LABELS[progress.stage] || translateUiText(progress.stage || "Подготовка");
  const statusLabel = FRIENDS_BATCH_STATUS_LABELS[progress.status] || translateUiText(progress.status || "Выполняется");
  const isIndeterminate = progress.status === "running" && (total === null || total === undefined);
  const markup = `
    <div class="friends-batch-head">
      <strong>${escapeHtml(kindLabel)}</strong>
      ${buildBadge(statusLabel, progress.status === "failed" ? "danger" : progress.status === "completed" ? "success" : "neutral")}
    </div>
    <p>${escapeHtml(stageLabel)}${progress.currentTarget ? ` · цель #${escapeHtml(progress.currentTarget)}` : ""}</p>
    <div class="friends-batch-track${isIndeterminate ? " is-indeterminate" : ""}" role="progressbar" aria-label="Прогресс массовой операции" aria-valuemin="0" aria-valuemax="100"${isIndeterminate ? "" : ` aria-valuenow="${ratio}"`}><span style="width:${isIndeterminate ? 36 : ratio}%"></span></div>
    <div class="friends-batch-meta">
      <span>${total === null || total === undefined ? "Подготовка списка" : `Обработано ${formatNumber(completed)} из ${formatNumber(total)}`}</span>
      <span>Успешно ${formatNumber(progress.okCount || 0)} · ошибок ${formatNumber(progress.failCount || 0)}</span>
      <span>Скорость: ${rateLabel}</span>
      <span>Осталось: ${formatBatchDuration(progress.estimatedRemainingMs)}</span>
      ${progress.friendsTotal !== null && progress.friendsTotal !== undefined ? `<span>Друзей: ${formatNumber(progress.friendsTotal)}</span>` : ""}
      ${progress.profilePagesLoaded ? `<span>Страницы профилей: ${profileProgress}</span>` : ""}
      ${progress.incomingRequestsLoaded !== null && progress.incomingRequestsLoaded !== undefined ? `<span>Заявок найдено: ${formatNumber(progress.incomingRequestsLoaded)}</span>` : ""}
      ${progress.talentTotalsTotal !== null && progress.talentTotalsTotal !== undefined ? `<span>Таланты проверены: ${formatNumber(progress.talentTotalsLoaded || 0)} из ${formatNumber(progress.talentTotalsTotal)}</span>` : ""}
    </div>
    ${progress.error ? `<p class="friends-batch-error">${escapeHtml(translateUiText(progress.error))}</p>` : ""}
  `;
  targets.forEach((target) => {
    target.innerHTML = markup;
  });
}

function renderFriendsResult(payload) {
  state.friendsResult = payload;
  if (payload.friendsTotal !== undefined) {
    state.friendsSummary = {
      ...(state.friendsSummary || {}),
      friendsTotal: payload.friendsTotal,
      authorityProfilesTotal: payload.authorityProfilesTotal,
      authorityProfilesMissing: payload.authorityProfilesMissing,
      refreshedAt: new Date().toISOString(),
    };
    renderFriendsActionSummary();
  }
}

function formatDamageValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return formatNumber(value);
}

function formatDamageShare(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return `${numeric.toFixed(2)}%`;
}

function formatDamageSnapshotRef(snapshot) {
  if (!snapshot) {
    return "-";
  }
  const parts = [];
  if (snapshot.generatedAt) {
    const date = new Date(snapshot.generatedAt);
    parts.push(Number.isNaN(date.getTime())
      ? String(snapshot.generatedAt)
      : date.toLocaleString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }));
  }
  if (snapshot.snapshotKind) {
    const snapshotKindLabels = {
      manual: "ручной снимок",
      hourly: "часовой снимок",
      boundary: "контрольный снимок",
      startup: "снимок при запуске",
    };
    parts.push(snapshotKindLabels[snapshot.snapshotKind] || translateUiText(String(snapshot.snapshotKind).replaceAll("_", " ")));
  }
  return parts.length > 0 ? parts.join(" · ") : "-";
}

function summarizeDamageError(error) {
  const message = error && error.message ? error.message : String(error || "Неизвестная ошибка");
  if (message.includes("No baseline damage snapshot")) {
    return "Нужен контрольный снимок за предыдущий день.";
  }
  if (message.includes("No previous damage snapshot")) {
    return "Нужен более ранний сохранённый снимок.";
  }
  if (message.includes("No saved damage snapshot")) {
    return "Сохранённых снимков урона пока нет.";
  }
  if (message.includes("No damage snapshot available")) {
    return "Доступных снимков урона пока нет.";
  }
  return translateUiText(message);
}

function summarizeDamageCollection(report) {
  const reason = report && report.collection ? report.collection.reason : null;
  if (reason === "hourly_baseline_missing") {
    return "Собираем часовую базу. Корректное сравнение появится через 45–90 минут сохранённой истории.";
  }
  if (reason === "daily_baseline_missing") {
    return "Собираем дневную базу. Оставьте локальный сервер включённым, чтобы сохранить снимок около полуночи.";
  }
  return "История урона собирает данные для корректного сравнения.";
}

function formatDamageWindow(window) {
  if (!window || !Number.isFinite(Number(window.elapsedMinutes))) {
    return "-";
  }
  const minutes = Math.max(0, Math.round(Number(window.elapsedMinutes)));
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return hours > 0 ? `${hours} ч. ${restMinutes} мин.` : `${restMinutes} мин.`;
}

function getDamageInviteCandidates(period, limit = DAMAGE_INVITE_TOP_LIMIT, scope = state.friendsDamageScope) {
  const report = state.friendsDamageReports[period];
  const topKey = scope === "guild" ? "topGuild" : "topAll";
  const rows = report && report.summary && Array.isArray(report.summary[topKey])
    ? report.summary[topKey].slice(0, limit)
    : [];
  const selfUserId = report && report.selfUserId ? String(report.selfUserId) : "";
  const seen = new Set();
  const candidates = [];

  for (const row of rows) {
    const userId = row && row.userId ? String(row.userId) : "";
    if (!userId || seen.has(userId) || row.isFriend || (selfUserId && userId === selfUserId)) {
      continue;
    }
    seen.add(userId);
    candidates.push(row);
    if (candidates.length >= limit) {
      break;
    }
  }

  return candidates;
}

function renderDamageTopList(title, rows, metricKey) {
  const items = Array.isArray(rows) ? rows.slice(0, 5) : [];
  const content = items.length > 0
    ? `<ol>${items.map((row) => {
        const labelParts = [];
        if (row && row.rank !== null && row.rank !== undefined) {
          labelParts.push(`#${row.rank}`);
        }
        labelParts.push(row && row.nickname ? row.nickname : row && row.userId ? row.userId : "Неизвестный игрок");
        return `
          <li>
            <span>${escapeHtml(labelParts.join(" "))}</span>
            <strong>${escapeHtml(formatDamageValue(row ? row[metricKey] : null))}</strong>
          </li>
        `;
      }).join("")}</ol>`
    : '<p class="muted">За этот период урона нет.</p>';
  return `
    <section class="friends-damage-toplist">
      <h4>${escapeHtml(title)}</h4>
      ${content}
    </section>
  `;
}

function renderFriendsDamagePanel(period, report, error) {
  const meta = DAMAGE_PERIOD_META[period] || {
    label: period,
    metricKey: "deltaDamage",
  };
  const isGuildScope = state.friendsDamageScope === "guild";
  const title = isGuildScope ? `Бригада · ${meta.label.toLowerCase()}` : meta.label;
  const message = error ? summarizeDamageError(error) : "";
  const canInviteDamageTop = DAMAGE_PERIOD_ORDER.includes(period);
  const inviteScope = isGuildScope ? "guild" : "overall";
  const inviteCandidates = canInviteDamageTop ? getDamageInviteCandidates(period, DAMAGE_INVITE_TOP_LIMIT, inviteScope) : [];
  const inviteRunning = canInviteDamageTop ? Boolean(state.friendsDamageInviteRunning[period]) : false;

  if (!report || report.available === false) {
    const collectingMessage = report && report.available === false
      ? summarizeDamageCollection(report)
      : message || "Обновите блок после начала сбора истории урона.";
    return `
      <article class="mini-card friends-damage-card">
        <div class="friends-damage-head">
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(report && report.dayKey ? report.dayKey : "Ожидание достаточного периода")}</p>
          </div>
          <div class="friends-damage-badges">${buildBadge(error ? "Нет данных" : "Сбор данных", error ? "danger" : "neutral")}</div>
        </div>
        <p class="${error ? "friends-damage-error" : "muted"}">${escapeHtml(collectingMessage)}</p>
      </article>
    `;
  }

  const metricKey = meta.metricKey;
  const summary = report.summary || {};
  const all = summary.all || {};
  const friends = summary.friends || {};
  const guild = summary.guild || {};
  const self = summary.self || null;
  const reportGuild = report.guild || {};
  if (isGuildScope && (!reportGuild.available || !reportGuild.inGuild)) {
    const unavailableMessage = reportGuild.available
      ? "Вы сейчас не состоите в бригаде. После вступления обновите статистику."
      : "Не удалось получить состав бригады. Обновите статистику и повторите попытку.";
    return `
      <article class="mini-card friends-damage-card">
        <div class="friends-damage-head">
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(report.dayKey || "Статус бригады")}</p>
          </div>
          <div class="friends-damage-badges">${buildBadge("Недоступно", "neutral")}</div>
        </div>
        <p class="muted">${escapeHtml(unavailableMessage)}</p>
      </article>
    `;
  }
  const subtitleParts = [];
  if (isGuildScope && reportGuild.name) {
    subtitleParts.push(reportGuild.name);
  }
  if (report.generatedAt) {
    subtitleParts.push(`обновлено ${formatDate(report.generatedAt)}`);
  } else if (report.dayKey) {
    subtitleParts.push(report.dayKey);
  }

  const badges = [
    buildBadge(report.complete ? "Полный период" : "Текущий период", report.complete ? "success" : "neutral"),
    buildBadge(report.reportSource === "live" ? "Данные API" : "Сохранённый снимок", report.reportSource === "live" ? "success" : "neutral"),
  ];
  if (report.baselineType) {
    badges.push(buildBadge(DAMAGE_BASELINE_LABELS[report.baselineType] || "База сравнения", "neutral"));
  }

  const startLabel = report.baselineType === "weekly_reset_zero"
    ? "начало недели"
    : formatDamageSnapshotRef(report.snapshots ? report.snapshots.baseline : null);
  const endLabel = formatDamageSnapshotRef(report.snapshots ? report.snapshots.end : null);
  const observedWindow = formatDamageWindow(report.window);
  const inviteActionMarkup = canInviteDamageTop
    ? `
      <div class="friends-damage-invite">
        <p class="friends-damage-invite-copy">
          <strong>${escapeHtml(isGuildScope ? `Добавление из топ-${DAMAGE_INVITE_TOP_LIMIT} бригады` : `Добавление из топ-${DAMAGE_INVITE_TOP_LIMIT}`)}</strong>
          <span>${escapeHtml(
            inviteRunning
              ? `Отправляем приглашения: ${inviteCandidates.length}`
              : inviteCandidates.length > 0
                ? `Доступно ${isGuildScope ? "участников" : "новых игроков"}: ${inviteCandidates.length}`
                : isGuildScope ? "Новых участников нет" : "Новых игроков нет"
          )}</span>
        </p>
        <button
          class="action-button action-button-mini action-button-ghost js-friends-damage-invite"
          data-period="${escapeHtml(period)}"
          data-scope="${escapeHtml(inviteScope)}"
          ${inviteRunning || inviteCandidates.length === 0 ? "disabled" : ""}
        >${escapeHtml(inviteRunning ? "Добавляю…" : `Добавить ${inviteCandidates.length}`)}</button>
      </div>
    `
    : "";
  const statsMarkup = isGuildScope
    ? `
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(guild.totalDamage))}</strong>
        <span>Урон бригады</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageShare(guild.sharePct))}</strong>
        <span>Доля бригады</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(self ? self[metricKey] : null))}</strong>
        <span>Мой урон</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(guild.players))}</strong>
        <span>В рейтинге</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(reportGuild.totalMembers))}</strong>
        <span>Участников в бригаде</span>
      </div>
    `
    : `
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(all.totalDamage))}</strong>
        <span>Общий урон</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(friends.totalDamage))}</strong>
        <span>Урон друзей</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageShare(friends.sharePct))}</strong>
        <span>Доля друзей</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(self ? self[metricKey] : null))}</strong>
        <span>Мой урон</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(all.players))}</strong>
        <span>Игроков</span>
      </div>
      <div class="stat-card">
        <strong>${escapeHtml(formatDamageValue(friends.players))}</strong>
        <span>Друзей</span>
      </div>
    `;
  const topListsMarkup = isGuildScope
    ? renderDamageTopList("Топ-5 бригады", summary.topGuild, metricKey)
    : `${renderDamageTopList("Топ-5 игроков", summary.topAll, metricKey)}${renderDamageTopList("Топ-5 друзей", summary.topFriends, metricKey)}`;

  return `
    <article class="mini-card friends-damage-card">
      <div class="friends-damage-head">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitleParts.join(" · ") || "Отчёт об уроне загружен.")}</p>
        </div>
        <div class="friends-damage-badges">${badges.join("")}</div>
      </div>
      <div class="friends-damage-window">
        <span>Период сравнения</span>
        <div class="friends-damage-window-values">
          <strong>${escapeHtml(startLabel)}</strong>
          <b aria-hidden="true">→</b>
          <strong>${escapeHtml(endLabel)}</strong>
          ${observedWindow !== "-" ? `<small>${escapeHtml(observedWindow)}</small>` : ""}
        </div>
      </div>
      <div class="stats-grid stats-grid-tight friends-damage-stats">
        ${statsMarkup}
      </div>
      ${message ? `<p class="friends-damage-error">${escapeHtml(message)}</p>` : ""}
      <div class="friends-damage-toplists">
        ${topListsMarkup}
      </div>
      ${inviteActionMarkup}
    </article>
  `;
}

function renderFriendsDamage() {
  const isGuildScope = state.friendsDamageScope === "guild";
  const guildReports = DAMAGE_PERIOD_ORDER
    .map((period) => state.friendsDamageReports[period])
    .filter((report) => report && report.guild);
  const confirmedGuildReport = guildReports.find((report) => report.guild.available && report.guild.inGuild)
    || guildReports.find((report) => report.guild.available);
  const isConfirmedWithoutGuild = Boolean(
    isGuildScope
    && confirmedGuildReport
    && !confirmedGuildReport.guild.inGuild,
  );
  const summaryItems = [];
  DAMAGE_PERIOD_ORDER.forEach((period) => {
    const report = state.friendsDamageReports[period];
    const meta = DAMAGE_PERIOD_META[period];
    const summary = report && report.summary ? report.summary : null;
    if (isGuildScope) {
      summaryItems.push(
        {
          label: meta.guildLabel,
          value: report && report.available !== false && summary && summary.guild ? formatDamageValue(summary.guild.totalDamage) : "-",
        },
        {
          label: `Доля бригады · ${meta.label.toLowerCase()}`,
          value: report && report.available !== false && summary && summary.guild ? formatDamageShare(summary.guild.sharePct) : "-",
        },
      );
    } else {
      summaryItems.push(
        {
          label: meta.allLabel,
          value: report && report.available !== false && summary && summary.all ? formatDamageValue(summary.all.totalDamage) : "-",
        },
        {
          label: meta.friendsLabel,
          value: report && report.available !== false && summary && summary.friends ? formatDamageValue(summary.friends.totalDamage) : "-",
        },
      );
    }
  });
  renderStatGrid($("#friends-damage-summary"), isConfirmedWithoutGuild ? [] : summaryItems);
  document.querySelectorAll(".friends-damage-scope-button").forEach((button) => {
    const active = button.dataset.damageScope === state.friendsDamageScope;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  if (isConfirmedWithoutGuild) {
    $("#friends-damage-note").textContent = "Вы не состоите в бригаде.";
    $("#friends-damage-panels").innerHTML = "";
    return;
  }

  const latestGeneratedAt = DAMAGE_PERIOD_ORDER
    .map((period) => state.friendsDamageReports[period] && state.friendsDamageReports[period].generatedAt)
    .filter(Boolean)
    .sort()
    .pop();
  const errorNotes = DAMAGE_PERIOD_ORDER
    .filter((period) => state.friendsDamageErrors[period])
    .map((period) => `${DAMAGE_PERIOD_META[period].label}: ${summarizeDamageError(state.friendsDamageErrors[period])}`);
  const noteParts = [];
  if (latestGeneratedAt) {
    noteParts.push(`Отчёты об уроне обновлены ${formatDate(latestGeneratedAt)}.`);
  } else {
    noteParts.push("Отчёты об уроне ещё не загружены.");
  }
  if (state.friendsDamageHistory) {
    const history = state.friendsDamageHistory;
    if (history.lastCapturedAt) {
      noteParts.push(`Последний снимок сохранён ${formatDate(history.lastCapturedAt)}; интервал — ${history.intervalMinutes || 15} мин.`);
    } else if (history.enabled) {
      noteParts.push(`Сервер сохраняет снимки каждые ${history.intervalMinutes || 15} мин.`);
    }
  }
  if (isGuildScope) {
    const guildReport = DAMAGE_PERIOD_ORDER
      .map((period) => state.friendsDamageReports[period])
      .find((report) => report && report.guild && report.guild.inGuild);
    if (guildReport && guildReport.guild.name) {
      noteParts.push(`Бригада «${guildReport.guild.name}»: ${formatNumber(guildReport.guild.totalMembers || 0)} участников.`);
    }
  }
  if (errorNotes.length > 0) {
    noteParts.push(errorNotes.join(" | "));
  }
  $("#friends-damage-note").textContent = noteParts.join(" ");
  $("#friends-damage-panels").innerHTML = DAMAGE_PERIOD_ORDER
    .map((period) => renderFriendsDamagePanel(period, state.friendsDamageReports[period], state.friendsDamageErrors[period]))
    .join("");
}

async function fetchFriendsDamageIntel() {
  return apiRequest("POST", "/api/damage/intel", { top: DAMAGE_INVITE_TOP_LIMIT });
}

async function handleFriendsDamageRefresh({ silent = false, showStatus = true } = {}) {
  if (showStatus) {
    setServerStatus("Обновление статистики урона", "busy");
  }

  let payload = null;
  let requestError = null;
  try {
    payload = await fetchFriendsDamageIntel();
    state.friendsDamageHistory = payload.history || null;
    DAMAGE_PERIOD_ORDER.forEach((period) => {
      state.friendsDamageReports[period] = payload.reports && payload.reports[period] ? payload.reports[period] : null;
      state.friendsDamageErrors[period] = null;
    });
  } catch (error) {
    requestError = error;
    DAMAGE_PERIOD_ORDER.forEach((period) => {
      state.friendsDamageErrors[period] = error;
    });
  }
  renderFriendsDamage();

  const successCount = payload ? DAMAGE_PERIOD_ORDER.length : 0;
  const failed = requestError ? DAMAGE_PERIOD_ORDER.map((period) => ({ period, error: requestError })) : [];
  if (!silent) {
    const suffix = failed.length > 0
      ? ` | ${failed.map((item) => `${DAMAGE_PERIOD_META[item.period].label}: ${summarizeDamageError(item.error)}`).join("; ")}`
      : "";
    appendLog("Статистика урона", `Готово отчётов: ${successCount} из ${DAMAGE_PERIOD_ORDER.length}${suffix}`);
  }

  if (showStatus) {
    setServerStatus(failed.length === DAMAGE_PERIOD_ORDER.length ? "Ошибка статистики урона" : "Готово", failed.length === DAMAGE_PERIOD_ORDER.length ? "error" : "ok");
  }
  return payload;
}

async function handleFriendsDamageInvite(period, scope = state.friendsDamageScope) {
  const meta = DAMAGE_PERIOD_META[period];
  if (!meta || state.friendsDamageInviteRunning[period]) {
    return;
  }

  const inviteScope = scope === "guild" ? "guild" : "overall";
  const inviteSourceLabel = inviteScope === "guild" ? "бригады" : "рейтинга";
  const metricKey = meta.metricKey;
  const candidates = getDamageInviteCandidates(period, DAMAGE_INVITE_TOP_LIMIT, inviteScope);
  if (candidates.length === 0) {
    appendLog(`Приглашения из ${inviteSourceLabel}`, `${meta.label}: в топ-${DAMAGE_INVITE_TOP_LIMIT} нет новых игроков`);
    return;
  }

  state.friendsDamageInviteRunning[period] = true;
  renderFriendsDamage();
  setServerStatus(`Приглашения из ${inviteSourceLabel} · ${meta.label.toLowerCase()}`, "busy");

  try {
    const payload = await runWithFriendsBatchProgress(() => apiRequest("POST", "/api/friends/invite-users", {
      period,
      source: inviteScope === "guild" ? "damage_guild_top" : "damage_top",
      max: DAMAGE_INVITE_TOP_LIMIT,
      delayMs: Number($("#friends-invite-delay").value || 0),
      excludeSelf: true,
      targets: candidates.map((row) => ({
        userId: row.userId,
        nickname: row.nickname || null,
        rank: row.rank ?? null,
        metricValue: row ? row[metricKey] : null,
      })),
    }));
    const normalizedPayload = {
      ...payload,
      results: Array.isArray(payload.results)
        ? payload.results.map((row) => ({
            ...row,
            data: row && row.data && typeof row.data === "object"
              ? { ...row.data, message: row.message || row.data.message }
              : row && row.message
                ? { success: row.ok === undefined ? undefined : row.ok, message: row.message }
                : row.data,
          }))
        : [],
    };
    renderFriendsResult(normalizedPayload);
    if (state.friendsCollected) {
      renderFriendsCollected(state.friendsCollected);
    }
    appendLog(
      `Приглашения из ${inviteSourceLabel}`,
      `${meta.label}: успешно ${payload.okCount}, ошибок ${payload.failCount}, выбрано ${formatNumber(payload.selectedTotal)}${payload.skippedExisting ? `, уже в друзьях ${formatNumber(payload.skippedExisting)}` : ""}${payload.skippedOverflow ? `, сверх лимита ${formatNumber(payload.skippedOverflow)}` : ""}`,
    );
    setServerStatus("Готово", "ok");
  } catch (error) {
    setServerStatus(`Ошибка приглашений из ${inviteSourceLabel}`, "error");
    appendDiagnosticError("friends", error);
  } finally {
    state.friendsDamageInviteRunning[period] = false;
    renderFriendsDamage();
  }
}

function handleFriendsDamagePanelClick(event) {
  const trigger = event && event.target && event.target.closest
    ? event.target.closest(".js-friends-damage-invite")
    : null;
  if (!trigger) {
    return;
  }
  event.preventDefault();
  const period = trigger.dataset.period || "";
  const scope = trigger.dataset.scope || "overall";
  handleFriendsDamageInvite(period, scope);
}

function handleFriendsDamageScopeClick(event) {
  const trigger = event && event.target && event.target.closest
    ? event.target.closest(".friends-damage-scope-button")
    : null;
  const scope = trigger && trigger.dataset ? trigger.dataset.damageScope : "";
  if (scope !== "overall" && scope !== "guild") {
    return;
  }
  state.friendsDamageScope = scope;
  renderFriendsDamage();
}

function renderPrisonStatus(payload) {
  state.prisonStatus = payload;
  const prisons = payload.prisons && Array.isArray(payload.prisons.prisons) ? payload.prisons.prisons : [];
  const unlocked = prisons.filter((item) => item.isUnlocked).length;
  const mobileUnlocked = Object.values(payload.mobile || {}).filter((value) => value === true).length;
  const escapeUnlocked = Object.values(payload.escape || {}).filter((value) => value === true).length;

  renderStatGrid($("#prison-summary"), [
    { label: "Prisons", value: formatNumber(prisons.length) },
    { label: "Unlocked", value: formatNumber(unlocked) },
    { label: "Mobile parts", value: formatNumber(mobileUnlocked) },
    { label: "Escape parts", value: formatNumber(escapeUnlocked) },
  ]);

  const grid = $("#prison-grid");
  if (grid) {
    grid.innerHTML = prisons.map((item) => `
      <article class="mini-card">
        <h3>#${escapeHtml(item.id)} ${escapeHtml(item.name)}</h3>
        <p>${item.isUnlocked ? buildBadge("unlocked", "success") : buildBadge("locked", "danger")}</p>
        <p><strong>Day top:</strong> ${escapeHtml(item.dayTop ? `${item.dayTop.nickname} (${formatNumber(item.dayTop.rating)})` : "-")}</p>
        <p><strong>Night top:</strong> ${escapeHtml(item.nightTop ? `${item.nightTop.nickname} (${formatNumber(item.nightTop.rating)})` : "-")}</p>
      </article>
    `).join("");
  }

  populatePrisonSelect(prisons);
}

function populatePrisonSelect(prisons) {
  const select = $("#prison-select");
  if (!select) {
    return;
  }
  const currentValue = select.value;
  const options = Array.isArray(prisons)
    ? prisons.map((item) => ({
        value: String(item.id),
        label: `#${item.id} ${item.name}`,
      }))
    : [];

  if (!syncSelectOptions(select, options)) {
    return;
  }

  if (options.some((item) => item.value === currentValue)) {
    select.value = currentValue;
  } else if (options.length > 0) {
    select.value = options[0].value;
  }
}

function formatRange(value) {
  if (!value || value.min === null || value.max === null) {
    return "-";
  }
  if (value.min === value.max) {
    return formatNumber(value.min);
  }
  return `${formatNumber(value.min)}-${formatNumber(value.max)}`;
}

function normalizeRunCount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : null;
}

function getPrisonZoneRunStats(item) {
  const prisonId = Number(item && item.id);
  const liveDetail = state.prisonDetail
    && Number(state.prisonDetail.prisonId) === prisonId
    && state.prisonDetail.view
    ? state.prisonDetail.view
    : null;
  const cachedDetail = state.prisonCosts && Array.isArray(state.prisonCosts.prisons)
    ? state.prisonCosts.prisons.find((entry) => Number(entry.prisonId) === prisonId)
    : null;
  const day = normalizeRunCount(
    liveDetail && liveDetail.day
      ? liveDetail.day.runs
      : cachedDetail && cachedDetail.day && cachedDetail.day.run
        ? cachedDetail.day.run.runs
        : null,
  );
  const night = normalizeRunCount(
    liveDetail && liveDetail.night
      ? liveDetail.night.runs
      : cachedDetail && cachedDetail.night && cachedDetail.night.run
        ? cachedDetail.night.run.runs
        : null,
  );

  return {
    day,
    night,
    total: day === null || night === null ? null : day + night,
  };
}

function getMasterRunCount(item) {
  const training = item && item.training;
  if (!training) {
    return null;
  }
  const progress = training.progress || {};
  return normalizeRunCount(training.runs ?? progress.runs ?? progress.completedRuns ?? progress.level);
}

function getPrisonRunStatistics() {
  const dashboard = state.prisonDashboard;
  if (!dashboard) {
    return { prisonRuns: null, masterRuns: null };
  }

  const prisons = Array.isArray(dashboard.prisons) ? dashboard.prisons : [];
  const prisonCounts = prisons.map((item) => getPrisonZoneRunStats(item).total);
  const unlockedMasters = Array.isArray(dashboard.masters)
    ? dashboard.masters.filter((item) => item.isUnlocked === true)
    : [];
  const masterCounts = unlockedMasters.map((item) => getMasterRunCount(item));

  return {
    prisonRuns: prisonCounts.length > 0 && prisonCounts.every((value) => value !== null)
      ? prisonCounts.reduce((total, value) => total + value, 0)
      : null,
    masterRuns: unlockedMasters.length === 0
      ? 0
      : masterCounts.every((value) => value !== null)
        ? masterCounts.reduce((total, value) => total + value, 0)
        : null,
  };
}

function renderPrisonCollectionSummary() {
  const dashboard = state.prisonDashboard;
  const collectionSummary = $("#prison-collection-summary");
  if (!dashboard || !collectionSummary) {
    return;
  }

  const collectionTotals = dashboard.wearables ? dashboard.wearables.totals : {};
  const runStatistics = getPrisonRunStatistics();
  renderStatGrid(collectionSummary, [
    { label: "Надеваемые вещи", value: `${formatNumber(collectionTotals.collected || 0)} / ${formatNumber(collectionTotals.total || 0)}` },
    { label: "Собрано комплектов", value: `${formatNumber(collectionTotals.completedSets || 0)} / ${formatNumber(collectionTotals.totalSets || 0)}` },
    { label: "Ходок в тюрьмах", value: runStatistics.prisonRuns === null ? "—" : formatNumber(runStatistics.prisonRuns) },
    { label: "Ходок в мастерских", value: runStatistics.masterRuns === null ? "—" : formatNumber(runStatistics.masterRuns) },
  ]);
  collectionSummary.insertAdjacentHTML("beforeend", `
    <div class="wearable-owned-bonus-card">
      <div class="wearable-owned-bonus-copy">
        <strong>Текущие бонусы</strong>
        <span>Дают уже собранные вещи</span>
      </div>
      <div class="wearable-set-bonuses">
        ${renderWearableBonusChips(collectionTotals.collectedBonuses, "боевых бонусов пока нет")}
      </div>
    </div>
    <div class="wearable-owned-bonus-card is-potential">
      <div class="wearable-owned-bonus-copy">
        <strong>После полного сбора</strong>
        <span>Дадут все вещи из тюрем и мастерских</span>
      </div>
      <div class="wearable-set-bonuses">
        ${renderWearableBonusChips(collectionTotals.potentialBonuses, "боевых бонусов в каталоге нет")}
      </div>
    </div>
  `);
}

function renderPrisonCosts(payload) {
  state.prisonCosts = payload;
  const items = Array.isArray(payload.prisons) ? payload.prisons : [];
  const summary = $("#prison-cost-summary");
  const body = $("#prison-cost-body");
  if (summary) {
    renderStatGrid(summary, [
      { label: "Prisons", value: formatNumber(items.length) },
      { label: "Generated", value: formatDate(payload.generatedAt) },
    ]);
  }
  renderPrisonCollectionSummary();
  renderPrisonZoneGrids();
  if (!body) {
    return;
  }

  body.innerHTML = items.map((item) => `
    <tr>
      <td>${escapeHtml(`#${item.prisonId} ${item.prisonName}`)}</td>
      <td>${escapeHtml(formatRange(item.day.energy))}</td>
      <td>${escapeHtml(formatRange(item.night.energy))}</td>
      <td>${escapeHtml(formatRange(item.day.checkpoint))}</td>
      <td>${escapeHtml(formatRange(item.night.checkpoint))}</td>
      <td>${escapeHtml(formatOptionalNumber(item.day.checkpoint.total))}</td>
      <td>${escapeHtml(formatOptionalNumber(item.night.checkpoint.total))}</td>
    </tr>
  `).join("");

  renderPrisonAutomationProgress();
}

function computeSelectedPrisonCost() {
  const targetType = $("#prison-target-type") ? $("#prison-target-type").value : "prison";
  if (targetType === "master") {
    const masterId = Number($("#prison-select").value || 1);
    const master = state.prisonDashboard && Array.isArray(state.prisonDashboard.masters)
      ? state.prisonDashboard.masters.find((item) => Number(item.id) === masterId)
      : null;
    const training = master ? master.training : null;
    const steps = 1;
    return {
      targetType,
      energyCost: training && training.energyCost !== null ? Number(training.energyCost) : null,
      remainingClicks: training ? Number(training.remainingClicks) : null,
      steps,
      totalCost: training && training.energyCost !== null ? Number(training.energyCost) * steps : null,
      fullCheckpointCost: training && training.energyCost !== null
        ? Number(training.energyCost) * Number(training.remainingClicks || 0)
        : null,
      zoneTotal: null,
      missingCost: training ? training.missingCost : null,
      missingItems: training ? training.missingItems.length : null,
    };
  }
  const prisonId = Number($("#prison-select").value || 1);
  const modeKey = $("#prison-mode").value === "day" ? "day" : "night";
  const steps = 1;
  const detail = state.prisonDetail && state.prisonDetail.view ? state.prisonDetail.view[modeKey] : null;
  const prisonEntry = state.prisonCosts && Array.isArray(state.prisonCosts.prisons)
    ? state.prisonCosts.prisons.find((item) => Number(item.prisonId) === prisonId)
    : null;
  const checkpointList = prisonEntry ? prisonEntry[modeKey].checkpoints : [];
  const checkpointId = detail ? detail.currentCheckpointNumber : null;
  const checkpoint = checkpointList.find((item) => Number(item.checkpointId) === Number(checkpointId));
  const energyCost = checkpoint
    ? Number(checkpoint.energyCost)
    : detail && detail.activeCheckpoint
      ? Number(detail.activeCheckpoint.energyCost)
      : null;
  const remainingClicks = detail ? Number(detail.remainingClicks) : null;
  const zoneTotal = prisonEntry ? prisonEntry[modeKey].checkpoint.total : null;

  return {
    targetType,
    energyCost,
    remainingClicks,
    steps,
    totalCost: energyCost !== null ? energyCost * steps : null,
    fullCheckpointCost: energyCost !== null && remainingClicks !== null
      ? energyCost * remainingClicks
      : null,
    zoneTotal,
  };
}

function renderPrisonDetail(payload) {
  state.prisonDetail = payload;
  const view = payload.view;

  renderStatGrid($("#prison-detail-summary"), [
    { label: "Prison ID", value: formatNumber(payload.prisonId) },
    { label: "Day runs", value: formatNumber(view.day.runs) },
    { label: "Night runs", value: formatNumber(view.night.runs) },
    { label: "Current day checkpoint", value: formatNumber(view.day.currentCheckpointNumber) },
    { label: "Current night checkpoint", value: formatNumber(view.night.currentCheckpointNumber) },
  ]);

  $("#prison-detail-panels").innerHTML = [view.day, view.night].map((mode) => `
    <article class="mini-card">
      <h3>${escapeHtml(mode.modeKey.toUpperCase())}</h3>
      <p><strong>Checkpoint:</strong> ${escapeHtml(mode.currentCheckpointNumber)} / ${escapeHtml(mode.totalCheckpoints)}</p>
      <p><strong>Clicks in checkpoint:</strong> ${escapeHtml(mode.clicksInCheckpoint)}</p>
      <p><strong>Remaining clicks:</strong> ${escapeHtml(mode.remainingClicks)}</p>
      <p><strong>Rating:</strong> ${escapeHtml(formatNumber(mode.rating))}</p>
      <p><strong>Runs:</strong> ${escapeHtml(formatNumber(mode.runs))}</p>
      <p><strong>Active title:</strong> ${escapeHtml(mode.activeCheckpoint ? mode.activeCheckpoint.title : "completed")}</p>
    </article>
  `).join("");

  renderPrisonAutomationProgress();
}

function renderPrisonResult(payload) {
  state.prisonResult = payload;
}

function getPrisonTargetItems(targetType) {
  if (!state.prisonDashboard) {
    return [];
  }
  return targetType === "master"
    ? Array.isArray(state.prisonDashboard.masters) ? state.prisonDashboard.masters : []
    : Array.isArray(state.prisonDashboard.prisons) ? state.prisonDashboard.prisons : [];
}

function populatePrisonTargetSelect(preferredValue = null) {
  const select = $("#prison-select");
  const targetType = $("#prison-target-type").value === "master" ? "master" : "prison";
  const items = getPrisonTargetItems(targetType);
  const currentValue = preferredValue === null ? select.value : String(preferredValue);
  const options = items.map((item) => {
    const unlocked = targetType === "prison" ? item.isUnlocked !== false : item.isUnlocked === true;
    return {
      value: String(item.id),
      label: `#${item.id} ${item.name}${unlocked ? "" : " · закрыт"}`,
    };
  });
  if (!syncSelectOptions(select, options)) {
    return;
  }
  if (items.some((item) => String(item.id) === String(currentValue))) {
    select.value = String(currentValue);
  } else if (items.length > 0) {
    select.value = String(items[0].id);
  }
  $("#prison-mode-field").hidden = targetType === "master";
}

function prisonRewardLabel(key) {
  const labels = {
    authority: "авторитета",
    cigarettes: "папирос",
    respect: "уважения",
  };
  return labels[key] || key;
}

function renderPrisonRewardChips(rewards) {
  const entries = rewards && typeof rewards === "object" ? Object.entries(rewards) : [];
  return entries
    .filter(([, value]) => Number(value || 0) > 0)
    .map(([key, value]) => `<span class="prison-bonus-chip">+${escapeHtml(formatNumber(value))} ${escapeHtml(prisonRewardLabel(key))}</span>`)
    .join("");
}

function wearableBonusLabel(key) {
  const labels = {
    gunshot: "к самопалу",
    poison: "к яду",
    knife: "к финке",
    maxEnergy: "к энергии",
    energy: "к энергии",
    biceps: "к бицухе",
    melee: "к кулакам",
    damage: "к урону",
    punchChest: "к удару в грудь",
    kickBalls: "к удару в пах",
    pokeEyes: "к удару в глаза",
    kneeEar: "к удару коленом",
    kneeear: "к удару коленом",
  };
  return labels[key] || key;
}

function wearableBonusIconUrl(key) {
  return BOSS_WEAPON_ICON_URLS[key] || "";
}

const WEARABLE_BONUS_ORDER = new Map([
  "poison",
  "gunshot",
  "knife",
  "maxEnergy",
  "energy",
  "biceps",
].map((key, index) => [key, index]));

function wearableBonusEntries(bonuses) {
  return Object.entries(bonuses || {})
    .filter(([, value]) => Number(value || 0) !== 0)
    .sort(([leftKey], [rightKey]) => (
      (WEARABLE_BONUS_ORDER.get(leftKey) ?? Number.MAX_SAFE_INTEGER)
      - (WEARABLE_BONUS_ORDER.get(rightKey) ?? Number.MAX_SAFE_INTEGER)
    ));
}

function renderWearableBonusChips(bonuses, emptyLabel = "без бонуса") {
  const entries = wearableBonusEntries(bonuses);
  if (entries.length === 0) {
    return `<span class="prison-bonus-chip wearable-bonus-chip is-neutral">${escapeHtml(emptyLabel)}</span>`;
  }
  return entries.map(([key, value]) => {
    const iconUrl = wearableBonusIconUrl(key);
    return `
      <span class="prison-bonus-chip wearable-bonus-chip">
        ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy">` : ""}
        <span>+${escapeHtml(formatNumber(value))} ${escapeHtml(wearableBonusLabel(key))}</span>
      </span>
    `;
  }).join("");
}

function buildPrisonRunProgress(run, checkpoints) {
  if (!run || !Array.isArray(checkpoints) || checkpoints.length === 0) {
    return null;
  }

  const clickRequirements = checkpoints.map((checkpoint) => Math.max(0, Number(checkpoint && checkpoint.clicksRequired || 0)));
  const totalClicks = clickRequirements.reduce((total, clicks) => total + clicks, 0);
  if (totalClicks === 0) {
    return null;
  }

  const currentCheckpointIndex = Math.min(
    checkpoints.length,
    Math.max(0, Number.parseInt(String(run.currentCheckpointIndex || 0), 10) || 0),
  );
  const clicksBeforeCurrent = clickRequirements
    .slice(0, currentCheckpointIndex)
    .reduce((total, clicks) => total + clicks, 0);
  const currentCheckpointClicks = currentCheckpointIndex < checkpoints.length
    ? Math.min(
      clickRequirements[currentCheckpointIndex],
      Math.max(0, Number.parseInt(String(run.clicksInCheckpoint || 0), 10) || 0),
    )
    : 0;
  const completedClicks = Math.min(totalClicks, clicksBeforeCurrent + currentCheckpointClicks);
  const completed = run.completed === true || currentCheckpointIndex >= checkpoints.length || completedClicks >= totalClicks;

  return {
    completed,
    completedClicks,
    totalClicks,
    remainingClicks: Math.max(0, totalClicks - completedClicks),
    percent: Math.round(completedClicks / totalClicks * 100),
    currentCheckpointNumber: currentCheckpointIndex + 1,
    totalCheckpoints: checkpoints.length,
    clicksInCheckpoint: currentCheckpointClicks,
    clicksRequired: currentCheckpointIndex < checkpoints.length ? clickRequirements[currentCheckpointIndex] : 0,
  };
}

function renderPrisonRunProgress(label, run, checkpoints) {
  const progress = buildPrisonRunProgress(run, checkpoints);
  if (!progress) {
    return "";
  }

  const energyRemaining = calculatePrisonRunEnergyRemaining(run, checkpoints);
  const energyTotal = calculatePrisonRunEnergyTotal(checkpoints);
  const energySpent = Math.max(0, energyTotal - energyRemaining);
  const detail = `${formatNumber(energySpent)}/${formatNumber(energyTotal)} энергии`;

  return `
    <div class="prison-run-progress" role="progressbar" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="${escapeHtml(progress.totalClicks)}" aria-valuenow="${escapeHtml(progress.completedClicks)}">
      <div class="prison-run-progress-head">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(detail)}</strong>
      </div>
      <div class="prison-run-progress-track"><span style="width:${escapeHtml(progress.percent)}%"></span></div>
    </div>
  `;
}

function calculatePrisonRunEnergyTotal(checkpoints) {
  if (!Array.isArray(checkpoints)) {
    return null;
  }

  return checkpoints.reduce((total, checkpoint) => {
    const clicksRequired = Math.max(0, Number(checkpoint && checkpoint.clicksRequired || 0));
    const energyCost = Math.max(0, Number(checkpoint && checkpoint.energyCost || 0));
    return total + clicksRequired * energyCost;
  }, 0);
}

function calculatePrisonRunEnergyRemaining(run, checkpoints) {
  const progress = buildPrisonRunProgress(run, checkpoints);
  if (!progress) {
    return null;
  }

  const currentCheckpointIndex = progress.currentCheckpointNumber - 1;
  return checkpoints.reduce((total, checkpoint, index) => {
    const clicksRequired = Math.max(0, Number(checkpoint && checkpoint.clicksRequired || 0));
    const energyCost = Math.max(0, Number(checkpoint && checkpoint.energyCost || 0));
    const remainingClicks = index < currentCheckpointIndex
      ? 0
      : index === currentCheckpointIndex
        ? Math.max(0, clicksRequired - progress.clicksInCheckpoint)
        : clicksRequired;
    return total + remainingClicks * energyCost;
  }, 0);
}

function formatPrisonDuration(milliseconds) {
  const totalMinutes = Math.max(0, Math.ceil(Number(milliseconds || 0) / 60_000));
  if (totalMinutes === 0) {
    return "меньше минуты";
  }
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor(totalMinutes % 1_440 / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days > 0) {
    parts.push(`${days} д`);
  }
  if (hours > 0) {
    parts.push(`${hours} ч`);
  }
  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} мин`);
  }
  return `≈ ${parts.join(" ")}`;
}

function getPrisonAutomationRunSource(automation) {
  const dashboard = state.prisonDashboard;
  if (!automation || !dashboard) {
    return null;
  }

  const targetId = Number(automation.targetId);
  if (automation.targetType === "master") {
    const master = (dashboard.masters || []).find((item) => Number(item.id) === targetId);
    if (!master || !master.training) {
      return null;
    }
    return {
      label: `Мастерская #${master.id} ${master.name || ""}`.trim(),
      run: master.training,
      checkpoints: master.training.checkpoints,
    };
  }

  const modeKey = automation.isDay === false ? "night" : "day";
  const modeLabel = modeKey === "day" ? "день" : "ночь";
  const prison = (dashboard.prisons || []).find((item) => Number(item.id) === targetId);
  const detail = state.prisonDetail;
  if (detail && Number(detail.prisonId) === targetId && detail.view && detail.view[modeKey]) {
    return {
      label: `Тюрьма #${targetId} ${prison && prison.name ? prison.name : ""} · ${modeLabel}`.trim(),
      run: detail.view[modeKey],
      checkpoints: detail.view.checkpoints && detail.view.checkpoints[modeKey],
    };
  }

  const costEntry = state.prisonCosts && Array.isArray(state.prisonCosts.prisons)
    ? state.prisonCosts.prisons.find((item) => Number(item.prisonId) === targetId)
    : null;
  if (costEntry && costEntry[modeKey] && costEntry[modeKey].run) {
    return {
      label: `Тюрьма #${targetId} ${prison && prison.name ? prison.name : ""} · ${modeLabel}`.trim(),
      run: costEntry[modeKey].run,
      checkpoints: costEntry[modeKey].checkpoints,
    };
  }
  return null;
}

function renderPrisonAutomationProgress(automation = state.prisonAutomation) {
  const container = $("#prison-automation-progress");
  if (!container) {
    return;
  }

  const source = getPrisonAutomationRunSource(automation);
  if (!source) {
    container.innerHTML = `<p class="prison-automation-progress-note">Выберите цель — покажем энергию и время.</p>`;
    return;
  }

  const progress = buildPrisonRunProgress(source.run, source.checkpoints);
  const energyRemaining = calculatePrisonRunEnergyRemaining(source.run, source.checkpoints);
  const energyTotal = calculatePrisonRunEnergyTotal(source.checkpoints);
  if (!progress || energyRemaining === null || energyTotal === null) {
    container.innerHTML = `<p class="prison-automation-progress-note">Данные текущей ходки ещё загружаются.</p>`;
    return;
  }
  const energySpent = Math.max(0, energyTotal - energyRemaining);

  const energyNow = state.economy && Number.isFinite(Number(state.economy.energy))
    ? Number(state.economy.energy)
    : null;
  const podogrev = state.prisonDashboard && state.prisonDashboard.podogrev ? state.prisonDashboard.podogrev : {};
  const heatAvailable = Math.max(0, Number(podogrev.collectableEnergy ?? Math.min(podogrev.available || 0, podogrev.leftQuota || 0)) || 0);
  const heatIncluded = automation && automation.usePodogrev !== false ? heatAvailable : 0;
  const energyShortage = energyNow === null ? null : Math.max(0, energyRemaining - energyNow - heatIncluded);
  const actionIntervalMs = Math.max(5, Number(automation && automation.intervalSec || 10)) * 1_000;
  const estimatedMs = energyShortage === null
    ? null
    : energyShortage * 120_000 + Math.max(0, progress.remainingClicks - 1) * actionIntervalMs;
  const estimatedLabel = progress.completed
    ? "готово"
    : estimatedMs === null
      ? "—"
      : formatPrisonDuration(estimatedMs);

  container.innerHTML = `
    <div class="prison-automation-progress-head">
      <span>${escapeHtml(source.label)}</span>
      <strong>${escapeHtml(progress.percent)}%</strong>
    </div>
    <div class="prison-automation-progress-track"><span style="width:${escapeHtml(progress.percent)}%"></span></div>
    <div class="prison-progress-metrics">
      <div>
        <span>Пройдено энергии</span>
        <strong>${escapeHtml(formatNumber(energySpent))}/${escapeHtml(formatNumber(energyTotal))}</strong>
      </div>
      <div>
        <span>Время</span>
        <strong>${escapeHtml(estimatedLabel)}</strong>
      </div>
    </div>
  `;
}

function renderPrisonZoneCard(item, targetType) {
  const gear = item.gear || { sets: [], totals: {} };
  const totals = gear.totals || {};
  const collectedItems = Number(totals.collected || 0);
  const totalItems = Number(totals.total || 0);
  const completedSets = Number(totals.completedSets || 0);
  const totalSets = Number(totals.totalSets || 0);
  const progressPercent = totalItems > 0 ? Math.min(100, Math.round(collectedItems / totalItems * 100)) : 0;
  const automation = state.prisonDashboard ? state.prisonDashboard.automation : null;
  const isDefault = automation
    && automation.targetType === targetType
    && Number(automation.targetId) === Number(item.id);
  const unlocked = targetType === "prison" ? item.isUnlocked !== false : item.isUnlocked === true;
  const iconUrl = targetType === "master" ? item.icon : item.imageUrl;
  const training = targetType === "master" ? item.training : null;
  const runStats = targetType === "master"
    ? { total: getMasterRunCount(item), day: null, night: null }
    : getPrisonZoneRunStats(item);
  const runCountLabel = runStats.total === null ? "—" : formatNumber(runStats.total);
  const runCountTitle = targetType === "prison" && runStats.day !== null && runStats.night !== null
    ? `День: ${formatNumber(runStats.day)} · ночь: ${formatNumber(runStats.night)}`
    : `Завершено ходок: ${runCountLabel}`;
  const prisonCost = targetType === "prison" && state.prisonCosts && Array.isArray(state.prisonCosts.prisons)
    ? state.prisonCosts.prisons.find((entry) => Number(entry.prisonId) === Number(item.id))
    : null;
  const prisonDetail = targetType === "prison"
    && state.prisonDetail
    && Number(state.prisonDetail.prisonId) === Number(item.id)
    && state.prisonDetail.view
    ? state.prisonDetail.view
    : null;
  const runProgress = targetType === "master"
    ? renderPrisonRunProgress("Ходка", training, training && training.checkpoints)
    : [
      renderPrisonRunProgress(
        "День",
        prisonDetail ? prisonDetail.day : prisonCost && prisonCost.day && prisonCost.day.run,
        prisonDetail && prisonDetail.checkpoints ? prisonDetail.checkpoints.day : prisonCost && prisonCost.day && prisonCost.day.checkpoints,
      ),
      renderPrisonRunProgress(
        "Ночь",
        prisonDetail ? prisonDetail.night : prisonCost && prisonCost.night && prisonCost.night.run,
        prisonDetail && prisonDetail.checkpoints ? prisonDetail.checkpoints.night : prisonCost && prisonCost.night && prisonCost.night.checkpoints,
      ),
    ].join("");
  const sets = Array.isArray(gear.sets) ? gear.sets : [];
  const classes = ["prison-zone-card", isDefault ? "is-default" : "", unlocked ? "" : "is-locked"]
    .filter(Boolean)
    .join(" ");
  const masterInfo = targetType === "master"
    ? training
      ? `Вещи доступа: ${formatNumber(training.ownedItems)} / ${formatNumber(training.totalItems)}`
      : unlocked ? "Данные мастерской загружаются" : "Откроется после круга у предыдущего мастера"
    : item.isUnlocked === false ? "Тюрьма пока закрыта" : "";
  const missingCost = training && training.missingItems.length > 0
    ? `<p class="prison-zone-extra">Выкупить ${escapeHtml(training.missingItems.length)} шт.: <strong>${escapeHtml(formatCurrencyAmounts(training.missingCost))}</strong></p>`
    : "";
  const buyButton = training && training.missingItems.length > 0
    ? `<button class="prison-zone-action" type="button" data-prison-action="buy" data-target-id="${escapeHtml(item.id)}">Выкупить недостающие</button>`
    : "";

  return `
    <article class="${classes}">
      ${iconUrl ? `<img class="prison-zone-icon" src="${escapeHtml(iconUrl)}" alt="">` : `<div class="prison-zone-icon"></div>`}
      <div class="prison-zone-content">
        <div class="prison-zone-head">
          <h3>#${escapeHtml(item.id)} ${escapeHtml(item.name)}</h3>
          ${isDefault ? buildBadge("дефолт", "success") : unlocked ? "" : buildBadge("закрыт", "neutral")}
        </div>
        <div class="prison-zone-meta">
          <span>Шмотки ${escapeHtml(collectedItems)} / ${escapeHtml(totalItems)}</span>
          <span title="${escapeHtml(runCountTitle)}">Комплекты ${escapeHtml(completedSets)} / ${escapeHtml(totalSets)} · Ходок ${escapeHtml(runCountLabel)}</span>
        </div>
        <div class="prison-progress-track"><div class="prison-progress-fill" style="width:${escapeHtml(progressPercent)}%"></div></div>
        ${runProgress}
        <div class="prison-zone-bonus-summary">
          <div>
            <span>Сейчас</span>
            <div class="wearable-set-bonuses">${renderWearableBonusChips(totals.collectedBonuses)}</div>
          </div>
          <div class="is-potential">
            <span>Полный сбор</span>
            <div class="wearable-set-bonuses">${renderWearableBonusChips(totals.potentialBonuses)}</div>
          </div>
        </div>
        ${masterInfo ? `<p class="prison-zone-extra">${escapeHtml(masterInfo)}</p>` : ""}
        ${missingCost}
        <div class="prison-zone-actions">
          <button class="prison-zone-action" type="button" data-prison-action="select" data-target-type="${targetType}" data-target-id="${escapeHtml(item.id)}">Выбрать целью</button>
          ${buyButton}
        </div>
      </div>
      <details class="prison-zone-details">
        <summary>Комплекты и вещи</summary>
        <div class="prison-set-list">
          ${sets.map((set) => `
            <div class="prison-set-row">
              <div class="prison-set-copy">
                <strong>${escapeHtml(set.name)}</strong>
                <span>${escapeHtml(set.collected)} / ${escapeHtml(set.total)} · ${set.complete ? "собран" : `не хватает ${formatNumber(set.missing.length)}`}</span>
              </div>
              <div class="wearable-set-detail-head prison-set-bonus-summary">
                <div>
                  <span>Текущий бонус</span>
                  <div class="wearable-set-bonuses">${renderWearableBonusChips(set.collectedBonuses, "ничего не собрано")}</div>
                </div>
                <div>
                  <span>После полного сбора</span>
                  <div class="wearable-set-bonuses">${renderWearableBonusChips(set.potentialBonuses, "боевых бонусов нет")}</div>
                </div>
              </div>
              <div class="wearable-piece-grid prison-wearable-piece-grid">
                ${(set.items || []).map((piece) => `
                  <article class="wearable-piece ${piece.owned ? "is-owned" : "is-missing"}" title="${escapeHtml(piece.description || piece.name || "")}">
                    <div class="wearable-piece-art">
                      ${piece.imageUrl ? `<img src="${escapeHtml(piece.imageUrl)}" alt="" loading="lazy">` : `<span aria-hidden="true">◇</span>`}
                      <span class="wearable-piece-state" title="${piece.owned ? "Есть в коллекции" : "Не собрано"}">${piece.owned ? "✓" : "−"}</span>
                    </div>
                    <strong>${escapeHtml(piece.name || set.name)}</strong>
                    <small>${piece.owned ? "собрано" : "не собрано"}</small>
                    <div class="wearable-piece-bonuses">${renderWearableBonusChips(piece.combatStatsBonus, "без бонуса")}</div>
                  </article>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </details>
    </article>
  `;
}

function renderPrisonAutomation(automation) {
  state.prisonAutomation = automation;
  startEconomySync(automation && automation.enabled ? 5000 : 15000);
  const enabled = Boolean(automation && automation.enabled);
  const badge = $("#prison-automation-badge");
  badge.className = enabled ? "badge" : "badge badge-neutral";
  badge.textContent = enabled ? "автозапуск включён" : "только обслуживание";
  renderPrisonAutomationProgress(automation);
  renderPrisonQueueEditor(automation);
  const message = $("#prison-automation-message");
  message.hidden = true;
  message.textContent = "";
  if (automation && automation.lastError) {
    message.hidden = false;
    message.textContent = `Ошибка: ${automation.lastError.message || automation.lastError}`;
    return;
  }
  const action = automation ? automation.lastAction : null;
  if (action && action.type === "wait" && action.reason === "master_items_required") {
    message.hidden = false;
    message.textContent = `Для мастера нужны вещи на ${formatCurrencyAmounts(action.missingCost)}`;
  }
}

function updatePrisonBusinessCountdown() {
  const business = state.prisonDashboard ? state.prisonDashboard.business : null;
  if (!business) {
    return;
  }
  const availableAt = business.collectAvailableAt ? new Date(business.collectAvailableAt).getTime() : null;
  const remainingMs = Number.isFinite(availableAt) ? Math.max(0, availableAt - Date.now()) : null;
  const ready = remainingMs === 0;
  const summary = $("#prison-business-summary");
  if (summary) {
    summary.innerHTML = `
      <strong>${escapeHtml(formatCurrencyAmounts(business.expectedRewards))}</strong>
      <span>${escapeHtml(ready ? "готово к сбору" : remainingMs === null ? "время неизвестно" : `через ${formatBossCountdownValue(business.collectAvailableAt)}`)}</span>
    `;
  }
  $("#prison-profit-collect-btn").disabled = !ready;
}

function startPrisonCountdownTicker() {
  if (state.prisonCountdownTimerId) {
    clearInterval(state.prisonCountdownTimerId);
  }
  state.prisonCountdownTimerId = setInterval(updatePrisonBusinessCountdown, 1000);
}

function renderPrisonDashboard(payload, options = {}) {
  state.prisonDashboard = payload;
  const automation = payload.automation || {};
  if (options.syncControls !== false) {
    $("#prison-target-type").value = automation.targetType === "master" ? "master" : "prison";
    $("#prison-mode").value = automation.isDay === false ? "night" : "day";
    $("#prison-auto-min-energy").value = automation.minEnergy || 0;
    $("#prison-auto").checked = Boolean(automation.enabled);
    $("#prison-use-podogrev").checked = automation.usePodogrev !== false;
    $("#prison-auto-profit").checked = automation.autoCollectProfit !== false;
    $("#prison-auto-buy-items").checked = Boolean(automation.autoBuyMasterItems);
    const energyPolicy = automation.energyPolicy || {};
    $("#prison-energy-order").value = energyPolicy.order || "chefir_soap";
    $("#prison-chefir-reserve").value = energyPolicy.chefirReserve || 0;
    $("#prison-soap-daily-limit").value = energyPolicy.soapDailyLimit || 0;
    $("#prison-chefir-daily-limit").value = energyPolicy.chefirDailyLimit || 0;
    $("#prison-allow-chefir").checked = Boolean(energyPolicy.allowChefir);
    $("#prison-allow-soap").checked = Boolean(energyPolicy.allowSoap);
  }
  populatePrisonTargetSelect(options.syncControls === false ? null : automation.targetId);
  syncPrisonQueueGoalControls();
  renderPrisonAutomation(automation);

  const business = payload.business || {};
  updatePrisonBusinessCountdown();

  renderPrisonCollectionSummary();

  renderPrisonZoneGrids();
  $("#prison-zone-count").textContent = `${formatNumber((payload.prisons || []).length)} зон`;
  $("#prison-master-count").textContent = `${formatNumber((payload.masters || []).filter((item) => item.isUnlocked).length)} открыто из ${formatNumber((payload.masters || []).length)}`;
  populateZarubaMasterSelect(state.zarubaDashboard?.automation?.intellectMasterId || null);
  startPrisonCountdownTicker();
}

function renderPrisonZoneGrids() {
  const dashboard = state.prisonDashboard;
  if (!dashboard) {
    return;
  }
  $("#prison-zone-grid").innerHTML = (dashboard.prisons || []).map((item) => renderPrisonZoneCard(item, "prison")).join("");
  $("#prison-master-grid").innerHTML = (dashboard.masters || []).map((item) => renderPrisonZoneCard(item, "master")).join("");
}

function populateBossSelect() {
  const select = $("#boss-select");
  if (!select || !state.bossDashboard || !state.bossDashboard.queue) {
    return;
  }
  const currentValue = select.value;
  const savedValue = state.bossQueueSettings && state.bossQueueSettings.bossId
    ? String(state.bossQueueSettings.bossId)
    : "";
  const bosses = getFilteredBossCatalogItems();
  const seen = new Set();
  const options = bosses
    .filter((boss) => {
      if (seen.has(boss.id)) {
        return false;
      }
      seen.add(boss.id);
      return true;
    })
    .map((boss) => ({
      value: String(boss.id),
      label: (() => {
        const hpLabel = buildBossSelectHpLabel(boss);
        return hpLabel
          ? `#${boss.id} ${boss.title} [${hpLabel}]`
          : `#${boss.id} ${boss.title}`;
      })(),
    }));

  if (!syncSelectOptions(select, options)) {
    return;
  }

  if (options.some((item) => item.value === currentValue)) {
    select.value = currentValue;
  } else if (options.some((item) => item.value === savedValue)) {
    select.value = savedValue;
  } else if (
    state.bossDashboard &&
    state.bossDashboard.activeSession &&
    state.bossDashboard.activeSession.session &&
    state.bossDashboard.activeSession.session.bossId &&
    options.some((item) => item.value === String(state.bossDashboard.activeSession.session.bossId))
  ) {
    select.value = String(state.bossDashboard.activeSession.session.bossId);
  } else if (options.length > 0) {
    select.value = options[0].value;
  } else {
    select.value = "";
  }

  populateBossModeSelect();
}

function formatBossModeLabel(mode) {
  const key = String(mode || "").trim().toLowerCase();
  return BOSS_MODE_LABELS[key] || key || "-";
}

function formatBossBlockedReason(reason) {
  const key = String(reason || "").trim();
  const labels = {
    arrival_not_open: "прибытие закрыто",
    mode_unavailable: "режим недоступен",
    no_matching_mode: "нет подходящего режима",
    daily_limit_reached: "дневной лимит босса",
  };
  return labels[key] || translateUiText(key.replaceAll("_", " ")) || "заблокировано";
}

function formatBossKeySource(item) {
  if (!item) {
    return "-";
  }

  if (item.keySourceLabel) {
    return item.keySourceLabel;
  }

  if (item.keySourceBossTitle) {
    return `от босса: ${item.keySourceBossTitle}`;
  }

  if (item.keySourceBossId !== null && item.keySourceBossId !== undefined) {
    return `от босса #${item.keySourceBossId}`;
  }

  return "неизвестный источник";
}

function formatBossKeyRequirement(item) {
  if (!item) {
    return "-";
  }

  if (item.keyBypassed || Number(item.requiredKeys || 0) === 0) {
    if (item.keyBypassed) {
      return "0 (keychain bypass)";
    }
    return "0 (no keys required)";
  }

  const required = Math.max(0, Number(item.requiredKeys || 0));
  const owned = Math.max(0, Number(item.keysOwned || 0));
  const keyPriceFromQueue = Number(item.keyPriceRubles);
  const keyPriceObserved = Number(item.observedKeyPriceRubles);
  const keyPriceRubles = Number.isFinite(keyPriceFromQueue) && keyPriceFromQueue > 0
    ? keyPriceFromQueue
    : Number.isFinite(keyPriceObserved) && keyPriceObserved > 0
      ? keyPriceObserved
      : NaN;
  const keyPriceCurrency = String(item.keyPriceCurrency || "rubles").trim().toLowerCase() || "rubles";
  const keyPriceSource = String(item.keyPriceSource || "").trim().toLowerCase();
  const priceSuffix = canBuyBossKeys(item) && Number.isFinite(keyPriceRubles) && keyPriceRubles > 0
    ? ` по ${keyPriceSource === "default" ? "~" : ""}${formatNumber(keyPriceRubles)} ${CURRENCY_LABELS[keyPriceCurrency] || keyPriceCurrency} за ключ`
    : "";
  return `${formatNumber(required)} (${formatBossKeySource(item)}), в наличии ${formatNumber(owned)}${priceSuffix}`;
}

function resolveBossKeyPurchaseCount(item) {
  if (!item) {
    return 0;
  }
  if (item.keyBypassed) {
    return 0;
  }
  const required = Math.max(0, Number(item.requiredKeys || 0));
  if (required <= 0) {
    return 0;
  }
  const missing = Math.max(0, Number(item.keysMissing || 0));
  return Math.max(1, missing > 0 ? missing : required);
}

function canBuyBossKeys(item) {
  if (!item) {
    return false;
  }
  const bossId = Number(item.id || item.bossId || 0);
  if (!BUYABLE_BOSS_IDS.has(bossId)) {
    return false;
  }
  if (typeof item.canBuyKeys === "boolean") {
    return item.canBuyKeys;
  }
  const sourceBossId = Number(item.keySourceBossId || 0);
  if (!Number.isFinite(sourceBossId) || sourceBossId <= 0) {
    return false;
  }
  const sourceLabel = String(item.keySourceLabel || "").trim().toLowerCase();
  if (sourceLabel === "in prisons" || sourceLabel.includes("prison")) {
    return false;
  }
  return true;
}

function isAlwaysAutoBuyBossId(value) {
  const bossId = Number(value);
  return Number.isFinite(bossId) && ALWAYS_AUTO_BUY_QUEUE_BOSS_IDS.has(bossId);
}

function shouldTreatBossAsAlwaysAutoBuy(item) {
  if (!item) {
    return false;
  }
  return isAlwaysAutoBuyBossId(item.id ?? item.bossId) && canBuyBossKeys(item);
}

function formatSpentByCurrency(spentByCurrency) {
  const entries = Object.entries(spentByCurrency || {})
    .filter(([, value]) => Number(value) > 0)
    .sort(compareCurrencyEntries);
  if (entries.length === 0) {
    return "";
  }
  return entries
    .map(([currency, value]) => `${formatNumber(value)} ${CURRENCY_LABELS[currency] || currency}`)
    .join(", ");
}

function populateBossModeSelect() {
  const select = $("#boss-mode");
  if (!select || !state.bossDashboard || !state.bossDashboard.queue) {
    return;
  }

  const queueBosses = state.bossDashboard.queue.bosses || [];
  const selectedBossId = Number($("#boss-select") ? $("#boss-select").value || 0 : 0);
  const selectedBoss = selectedBossId
    ? queueBosses.find((boss) => Number(boss.id) === selectedBossId) || null
    : null;

  const modeKeys = selectedBoss
    ? selectedBoss.availableModes || []
    : [...new Set(queueBosses.flatMap((boss) => boss.availableModes || []))];
  const modes = [...new Set(modeKeys.map((item) => String(item).trim()).filter(Boolean))];
  const currentValue = select.value;
  const savedMode = state.bossQueueSettings
    && Number(state.bossQueueSettings.bossId || 0) === selectedBossId
    ? state.bossQueueSettings.mode
    : "";
  const options = [{ value: "", label: "Автоматически" }, ...modes.map((mode) => ({ value: mode, label: formatBossModeLabel(mode) }))];

  if (!syncSelectOptions(select, options)) {
    return;
  }

  if (options.some((item) => item.value === currentValue)) {
    select.value = currentValue;
    populateBossComboModeSelect();
    return;
  }

  if (options.some((item) => item.value === savedMode)) {
    select.value = savedMode;
    populateBossComboModeSelect();
    return;
  }

  if (selectedBoss && selectedBoss.selectedMode && options.some((item) => item.value === selectedBoss.selectedMode)) {
    select.value = selectedBoss.selectedMode;
    populateBossComboModeSelect();
    return;
  }

  if (options.some((item) => item.value === DEFAULT_BOSS_MODE)) {
    select.value = DEFAULT_BOSS_MODE;
  } else if (options.length > 0) {
    select.value = options[0].value;
  } else {
    select.value = "";
  }
  populateBossComboModeSelect();
}

function formatComboModeLabel(mode) {
  const normalized = String(mode || "").trim();
  if (!normalized) {
    return "-";
  }
  return formatBossModeLabel(normalized);
}

function resolveBossComboModes(candidate) {
  if (!candidate || !Array.isArray(candidate.availableComboModes)) {
    return [];
  }
  const rawValues = candidate.availableComboModes;
  const seen = new Set();
  const modes = [];
  for (const value of rawValues) {
    const text = String(value || "").trim();
    if (!text) {
      continue;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    modes.push(text);
  }
  return modes;
}

function updateBossComboInlineButtonState(candidate = getSelectedBossCandidate()) {
  const button = $("#boss-combo-inline-btn");
  const comboModes = resolveBossComboModes(candidate);
  const comboSelect = $("#boss-combo-mode");
  const hasComboModes = comboModes.length > 0;
  const comboField = comboSelect ? comboSelect.closest(".boss-combo-field") : null;
  const soloField = $("#boss-auto-kill-solo-field");
  if (soloField) soloField.hidden = !isSoloBossMode($("#boss-mode")?.value || candidate?.selectedMode);
  const dialogButton = $("#boss-combo-open-btn");

  // The live catalog is authoritative: a boss with an empty combo list must
  // not retain an editor affordance from cached UI state.
  if (comboField) {
    comboField.hidden = !hasComboModes;
  }
  if (dialogButton) {
    dialogButton.hidden = !hasComboModes;
    dialogButton.disabled = !hasComboModes;
    dialogButton.title = hasComboModes ? "Открыть редактор комбо выбранного босса" : "";
  }
  if (!button) {
    return;
  }
  button.hidden = !hasComboModes;
  button.disabled = !hasComboModes;
  if (!hasComboModes) {
    button.title = "";
    return;
  }

  const comboMode = comboSelect && comboSelect.value ? comboSelect.value : comboModes[0];
  button.title = `Open combo template for ${formatComboModeLabel(comboMode)}`;
}

function populateBossComboModeSelect(settings = {}) {
  const select = $("#boss-combo-mode");
  if (!select) {
    return;
  }

  const currentValue = select.value;
  const candidate = getSelectedBossCandidate();
  const comboModes = resolveBossComboModes(candidate);
  const hasComboModes = comboModes.length > 0;
  const comboOptions = hasComboModes
    ? comboModes.map((value) => ({ value, label: formatComboModeLabel(value) }))
    : [{ value: "", label: "No combo" }];

  if (!syncSelectOptions(select, comboOptions)) {
    return;
  }

  const savedMode = state.bossQueueSettings
    && Number(state.bossQueueSettings.bossId || 0) === Number(candidate && candidate.id || 0)
    ? state.bossQueueSettings.comboMode
    : "";
  const preferredMode = normalizeBossComboMode(settings.preferredMode || savedMode);

  if (settings.forcePreferred === true && comboOptions.some((item) => item.value === preferredMode)) {
    select.value = preferredMode;
    select.disabled = !hasComboModes;
    updateBossComboInlineButtonState(candidate);
    return;
  }

  if (comboOptions.some((item) => item.value === currentValue)) {
    select.value = currentValue;
    select.disabled = !hasComboModes;
    updateBossComboInlineButtonState(candidate);
    return;
  }

  if (hasComboModes && comboOptions.some((item) => item.value === preferredMode)) {
    select.value = preferredMode;
  } else if (hasComboModes && comboOptions.some((item) => item.value === DEFAULT_BOSS_MODE)) {
    select.value = DEFAULT_BOSS_MODE;
  } else if (hasComboModes && comboOptions.length > 0) {
    select.value = comboOptions[0].value;
  } else {
    select.value = "";
  }
  select.disabled = !hasComboModes;
  updateBossComboInlineButtonState(candidate);
}

function populateBossAttackSelect() {
  const select = $("#boss-attack-select");
  if (!select || !state.bossDashboard) {
    return;
  }
  const currentValue = select.value;
  const actions = state.bossDashboard.actions || [];
  const options = actions.map((action) => {
    const damage = action.damage !== null && action.damage !== undefined ? formatNumber(action.damage) : "-";
    const charges = action.hasCharges ? `, осталось ${formatNumber(action.count)}` : "";
    return {
      value: action.key,
      label: `${action.label} (${damage} урона${charges})`,
    };
  });
  if (!syncSelectOptions(select, options)) {
    return;
  }

  if (actions.some((item) => item.key === currentValue)) {
    select.value = currentValue;
  }
}

function getBossPriceConfig() {
  return { ...BOSS_FIXED_PRICES };
}

function getBossQueueCandidateMap() {
  const bosses = state.bossDashboard && state.bossDashboard.queue && Array.isArray(state.bossDashboard.queue.bosses)
    ? state.bossDashboard.queue.bosses
    : [];
  return new Map(bosses.map((boss) => [Number(boss.id), boss]));
}

function getBossCategoryFilterValue() {
  const select = $("#boss-category");
  return select ? String(select.value || "").trim().toLowerCase() : "";
}

function getBossCategoryFilterLabel(filterValue = getBossCategoryFilterValue()) {
  const labels = {
    "": "все боссы",
    "1": "беспредельщики",
    "2": "надзиратели",
    "3": "рецидивисты",
    startable: "доступные для запуска",
    available: "доступные для запуска",
    combo: "только с комбо",
  };
  return labels[filterValue] || filterValue || "все боссы";
}

function getBossCatalogItems() {
  return state.bossDashboard && state.bossDashboard.queue && Array.isArray(state.bossDashboard.queue.bosses)
    ? state.bossDashboard.queue.bosses
    : [];
}

function getBossCatalogSortHp(item) {
  const baseHp = Number(item && item.baseHp);
  return Number.isFinite(baseHp) && baseHp > 0 ? baseHp : null;
}

function compareBossCatalogItems(left, right) {
  const leftCategory = Number(left && left.categoryId || 0);
  const rightCategory = Number(right && right.categoryId || 0);
  if (leftCategory !== rightCategory) {
    return leftCategory - rightCategory;
  }

  // The game orders bosses inside a category by HP, then by id.
  const leftHp = getBossCatalogSortHp(left);
  const rightHp = getBossCatalogSortHp(right);
  if (leftHp !== null && rightHp !== null) {
    if (leftHp !== rightHp) {
      return leftHp - rightHp;
    }
    return Number(left && left.id || 0) - Number(right && right.id || 0);
  }
  if ((leftHp === null) !== (rightHp === null)) {
    return leftHp === null ? 1 : -1;
  }

  const leftSortValue = left && left.sortIndex;
  const rightSortValue = right && right.sortIndex;
  const leftHasSort = leftSortValue !== null
    && leftSortValue !== undefined
    && leftSortValue !== ""
    && Number.isFinite(Number(leftSortValue));
  const rightHasSort = rightSortValue !== null
    && rightSortValue !== undefined
    && rightSortValue !== ""
    && Number.isFinite(Number(rightSortValue));
  const leftSort = leftHasSort ? Number(leftSortValue) : 0;
  const rightSort = rightHasSort ? Number(rightSortValue) : 0;
  if (leftHasSort && rightHasSort && leftSort !== rightSort) {
    return leftSort - rightSort;
  }
  if (leftHasSort !== rightHasSort) {
    return leftHasSort ? -1 : 1;
  }

  return Number(left && left.id || 0) - Number(right && right.id || 0);
}

function getBossCandidateRemainingToday(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const directRemaining = Number(candidate.remainingToday);
  if (Number.isFinite(directRemaining)) {
    return Math.max(0, Math.floor(directRemaining));
  }

  const dailyLimit = Number(candidate.dailyLimit);
  const usedToday = Number(candidate.usedToday);
  if (Number.isFinite(dailyLimit) && dailyLimit >= 0 && Number.isFinite(usedToday)) {
    return Math.max(0, Math.floor(dailyLimit - usedToday));
  }

  return null;
}

function isBossCandidateDailyLimitReached(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const blockedReason = String(
    candidate.blockedReason || candidate.blockReason || candidate.reason || "",
  ).toLowerCase();
  if (blockedReason.includes("daily_limit_reached")) {
    return true;
  }

  const remainingToday = getBossCandidateRemainingToday(candidate);
  return remainingToday !== null && remainingToday <= 0;
}

function isBossCatalogStartable(item) {
  return Boolean(
    item
    && item.canStart
    && item.hasEnoughKeys
    && !item.currentSession
    && !isBossCandidateDailyLimitReached(item)
  );
}

function getAllBossCatalogItems(items = getBossCatalogItems()) {
  return (Array.isArray(items) ? [...items] : []).sort(compareBossCatalogItems);
}

function getFilteredBossCatalogItems(items = getBossCatalogItems()) {
  const filterValue = getBossCategoryFilterValue();
  let filtered = getAllBossCatalogItems(items);
  if (filterValue === "startable" || filterValue === "available") {
    filtered = filtered.filter((item) => isBossCatalogStartable(item));
  } else if (filterValue === "combo") {
    filtered = filtered.filter((item) => resolveBossComboModes(item).length > 0);
  } else if (/^\d+$/.test(filterValue)) {
    filtered = filtered.filter((item) => String(item.categoryId || "") === filterValue);
  }
  return filtered;
}

function getBossCatalogBrowserCategoryFilter() {
  const value = String(state.bossCatalogCategoryFilter || "all").trim().toLowerCase();
  return ["all", "1", "2", "3"].includes(value) ? value : "all";
}

function getBossCatalogBrowserStatusFilter() {
  const value = String($("#boss-catalog-status-filter")?.value || "all").trim().toLowerCase();
  return ["all", "startable", "missing", "combo"].includes(value) ? value : "all";
}

function isBossCatalogCollectionIncomplete(item, rewards = state.bossDashboard && state.bossDashboard.rewards) {
  const rewardBoss = getBossRewardBoss(item && item.id, rewards);
  if (!rewardBoss) {
    return false;
  }

  if (Number(rewardBoss.missing) > 0) {
    return true;
  }

  const modes = [
    ...(Array.isArray(rewardBoss.battleModes) ? rewardBoss.battleModes : []),
    ...(Array.isArray(rewardBoss.comboModes) ? rewardBoss.comboModes : []),
  ];
  return modes.some((mode) => {
    if (Array.isArray(mode && mode.missing)) {
      return mode.missing.length > 0;
    }
    const total = Number(mode && mode.total || 0);
    const collected = Number(mode && mode.collected || 0);
    return total > 0 && collected < total;
  });
}

function bossCatalogItemMatchesBrowserFilters(item, options = {}) {
  const categoryFilter = String(options.categoryFilter || "all");
  const statusFilter = String(options.statusFilter || "all");
  if (categoryFilter !== "all" && String(item && item.categoryId || "") !== categoryFilter) {
    return false;
  }
  if (statusFilter === "startable" && !isBossCatalogStartable(item)) {
    return false;
  }
  if (statusFilter === "missing" && !isBossCatalogCollectionIncomplete(item, options.rewards)) {
    return false;
  }
  if (statusFilter === "combo" && resolveBossComboModes(item).length === 0) {
    return false;
  }
  return true;
}

function filterBossCatalogBrowserItems(items, options = {}) {
  return getAllBossCatalogItems(items).filter((item) => bossCatalogItemMatchesBrowserFilters(item, options));
}

function renderBossCatalogCategoryNav(items) {
  const target = $("#boss-catalog-category-nav");
  if (!target) {
    return;
  }

  const bosses = Array.isArray(items) ? items : [];
  const selected = getBossCatalogBrowserCategoryFilter();
  const categories = [
    { id: "all", title: "Все", total: bosses.length },
    { id: "1", title: "Беспредельщики", total: bosses.filter((item) => Number(item && item.categoryId) === 1).length },
    { id: "2", title: "Надзиратели", total: bosses.filter((item) => Number(item && item.categoryId) === 2).length },
    { id: "3", title: "Рецидивисты", total: bosses.filter((item) => Number(item && item.categoryId) === 3).length },
  ];
  target.innerHTML = categories.map((category) => `
    <button
      type="button"
      class="${category.id === selected ? "is-active" : ""}"
      data-boss-catalog-category-filter="${escapeHtml(category.id)}"
      aria-pressed="${category.id === selected ? "true" : "false"}"
    >
      <span>${escapeHtml(category.title)}</span>
      <b>${escapeHtml(formatNumber(category.total))}</b>
    </button>
  `).join("");
}

function handleBossCatalogCategoryNavClick(event) {
  const button = event.target.closest("[data-boss-catalog-category-filter]");
  if (!button) {
    return;
  }
  state.bossCatalogCategoryFilter = button.dataset.bossCatalogCategoryFilter || "all";
  if (state.bossDashboard) {
    renderBossCatalog(state.bossDashboard);
  }
}

function getBossAutoQueueCandidates() {
  // The catalog picker is only a browsing aid. Reusing its category filter for
  // auto-build made the queue look broken whenever the user had inspected a
  // narrow category before pressing the button.
  return getBossCatalogItems().slice().sort(compareBossCatalogItems);
}

function readBossSmartQueueCollectionPreference() {
  try {
    return readAccountStorage(BOSS_SMART_QUEUE_COLLECTION_STORAGE_KEY) === "true";
  } catch (_error) {
    return false;
  }
}

function setBossSmartQueueCollectionEnabled(enabled, options = {}) {
  const nextEnabled = Boolean(enabled);
  state.bossSmartQueueCollectionEnabled = nextEnabled;
  const checkbox = $("#boss-run-queue-smart-collection");
  if (checkbox) {
    checkbox.checked = nextEnabled;
  }
  if (options.persist !== false) {
    try {
      writeAccountStorage(BOSS_SMART_QUEUE_COLLECTION_STORAGE_KEY, String(nextEnabled));
    } catch (_error) {
      // The preference is optional; auto-queue planning still works for this page session.
    }
    persistBossQueueSettings();
  }
  if (options.render !== false) {
    renderBossRunQueue();
  }
}

function loadBossSmartQueueCollectionPreference() {
  setBossSmartQueueCollectionEnabled(readBossSmartQueueCollectionPreference(), {
    persist: false,
    render: false,
  });
}

function isBossSmartQueueCollectionEnabled() {
  const checkbox = $("#boss-run-queue-smart-collection");
  return checkbox ? Boolean(checkbox.checked) : Boolean(state.bossSmartQueueCollectionEnabled);
}

function handleBossSmartQueueCollectionChange() {
  setBossSmartQueueCollectionEnabled(Boolean($("#boss-run-queue-smart-collection")?.checked));
}

function buildBossCatalogSections(items = getAllBossCatalogItems(), filterValue = "") {
  const sections = [];
  const definitions = filterValue === "startable" || filterValue === "available"
    ? [{ key: "startable", label: "Startable", match: (item) => isBossCatalogStartable(item) }]
    : filterValue === "1"
      ? [{ key: "bers", label: "Bespredelschiki", match: (item) => item.categoryKey === "bers" }]
      : filterValue === "2"
        ? [{ key: "guards", label: "Nadzirateli", match: (item) => item.categoryKey === "guards" }]
        : filterValue === "3"
          ? [{ key: "recid", label: "Recidivisty", match: (item) => item.categoryKey === "recid" }]
          : [
            { key: "bers", label: "Bespredelschiki", match: (item) => item.categoryKey === "bers" },
            { key: "guards", label: "Nadzirateli", match: (item) => item.categoryKey === "guards" },
            { key: "recid", label: "Recidivisty", match: (item) => item.categoryKey === "recid" },
          ];

  for (const definition of definitions) {
    const groupItems = items.filter((item) => definition.match(item));
    if (groupItems.length === 0) {
      continue;
    }
    sections.push({
      key: definition.key,
      label: definition.label,
      items: groupItems,
    });
  }

  return sections;
}

function getDefaultBossRunQueueExcludedIds() {
  return new Set(BOSS_RUN_QUEUE_DEFAULT_EXCLUDED_IDS);
}

function normalizeBossIdList(values) {
  const source = values instanceof Set
    ? [...values]
    : Array.isArray(values)
      ? values
      : [];
  return [...new Set(
    source
      .map((value) => Number(value))
      .filter((bossId) => Number.isFinite(bossId) && bossId > 0),
  )].sort((left, right) => left - right);
}

function normalizeBossRunQueueModeOverrides(rawValue) {
  const isMapLike = rawValue
    && typeof rawValue === "object"
    && typeof rawValue.entries === "function";
  const entries = rawValue instanceof Map || isMapLike
    ? [...rawValue.entries()]
    : rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? Object.entries(rawValue)
      : [];
  const output = {};
  for (const [rawBossId, rawMode] of entries) {
    const bossId = Number(rawBossId);
    const mode = normalizeBossComboMode(rawMode);
    if (!Number.isFinite(bossId) || bossId <= 0 || !mode) {
      continue;
    }
    output[String(bossId)] = mode;
  }
  return output;
}

function getBossRunQueueModeOverrideCount(rawValue = state.bossRunQueueModeOverrides) {
  return Object.values(normalizeBossRunQueueModeOverrides(rawValue))
    .filter((mode) => normalizeBossComboMode(mode) !== AUTO_BOSS_QUEUE_MODE)
    .length;
}

function collectBossExcludeModeSelects() {
  const list = $("#boss-run-queue-exclude-list");
  return list ? [...list.querySelectorAll(".js-boss-exclude-mode")] : [];
}

function getBossRunQueueModeOverrides() {
  const overrides = normalizeBossRunQueueModeOverrides(state.bossRunQueueModeOverrides);
  for (const select of collectBossExcludeModeSelects()) {
    const bossId = Number(select.dataset.bossId || 0);
    if (!Number.isFinite(bossId) || bossId <= 0) {
      continue;
    }
    const mode = normalizeBossComboMode(select.value || "");
    if (mode && (mode !== AUTO_BOSS_QUEUE_MODE || overrides[String(bossId)] === AUTO_BOSS_QUEUE_MODE)) {
      overrides[String(bossId)] = mode;
    } else {
      delete overrides[String(bossId)];
    }
  }
  state.bossRunQueueModeOverrides = overrides;
  return new Map(Object.entries(overrides).map(([bossId, mode]) => [Number(bossId), mode]));
}

function setBossRunQueueModeOverride(bossId, mode) {
  const numericBossId = Number(bossId);
  if (!Number.isFinite(numericBossId) || numericBossId <= 0) {
    return;
  }
  const overrides = normalizeBossRunQueueModeOverrides(state.bossRunQueueModeOverrides);
  const modeKey = normalizeBossComboMode(mode);
  if (modeKey) {
    overrides[String(numericBossId)] = modeKey;
  } else {
    delete overrides[String(numericBossId)];
  }
  state.bossRunQueueModeOverrides = overrides;
}

function createDefaultBossExcludeTemplate() {
  return {
    id: BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID,
    name: "Все боссы",
    locked: false,
    builtIn: true,
    overridden: false,
    selectAll: true,
    selectedIds: [],
    // Retained only so v1 template data can be recognized and migrated.
    excludedIds: [],
    modeByBossId: {},
    updatedAt: null,
  };
}

function createBuiltInBossExcludeTemplates() {
  return [
    createDefaultBossExcludeTemplate(),
    ...BOSS_EXCLUDE_BUILT_IN_TEMPLATES.map((template) => ({
      id: template.id,
      name: template.name,
      locked: false,
      builtIn: true,
      overridden: false,
      selectedIds: normalizeBossIdList(template.selectedIds),
      excludedIds: normalizeBossIdList(template.excludedIds),
      modeByBossId: normalizeBossRunQueueModeOverrides(template.modeByBossId),
      updatedAt: null,
    })),
  ];
}

function normalizeBossExcludeTemplate(rawTemplate, fallbackId = "") {
  if (!rawTemplate || typeof rawTemplate !== "object" || Array.isArray(rawTemplate)) {
    return null;
  }
  const id = String(rawTemplate.id || fallbackId || "").trim();
  if (!id) {
    return null;
  }
  const name = String(rawTemplate.name || rawTemplate.label || "Boss selection").trim() || "Boss selection";
  const hasSelectedIds = rawTemplate.selectAll === true || Array.isArray(rawTemplate.selectedIds)
    || Array.isArray(rawTemplate.includedIds);
  const selectedIds = Array.isArray(rawTemplate.selectedIds)
    ? normalizeBossIdList(rawTemplate.selectedIds)
    : normalizeBossIdList(rawTemplate.includedIds);
  const excludedIds = hasSelectedIds
    ? []
    : normalizeBossIdList(rawTemplate.excludedIds || rawTemplate.ids || rawTemplate.bossIds);
  const modeByBossId = normalizeBossRunQueueModeOverrides(
    rawTemplate.modeByBossId || rawTemplate.modeOverrides || rawTemplate.modes,
  );
  const updatedAt = typeof rawTemplate.updatedAt === "string"
    ? rawTemplate.updatedAt.trim()
    : null;
  return {
    id,
    name,
    locked: false,
    builtIn: Boolean(rawTemplate.builtIn),
    overridden: Boolean(rawTemplate.overridden),
    selectAll: Boolean(rawTemplate.selectAll),
    selectedIds,
    excludedIds,
    modeByBossId,
    ...(rawTemplate.rulesByBossId ? { rulesByBossId: normalizeBossQueueRules(rawTemplate.rulesByBossId) } : {}),
    updatedAt,
  };
}

function normalizeBossExcludeDeletedBuiltInIds(rawValue) {
  const isSetLike = rawValue
    && typeof rawValue.add === "function"
    && typeof rawValue.has === "function"
    && typeof rawValue[Symbol.iterator] === "function";
  const rawIds = isSetLike
    ? [...rawValue]
    : rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? rawValue.deletedBuiltInIds
      : rawValue;
  const deletableIds = new Set([
    BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID,
    ...BOSS_EXCLUDE_BUILT_IN_TEMPLATES.map((template) => template.id),
  ]);
  return new Set(
    (Array.isArray(rawIds) ? rawIds : [])
      .map((templateId) => String(templateId || "").trim())
      .filter((templateId) => deletableIds.has(templateId)),
  );
}

function normalizeBossExcludeTemplates(rawValue) {
  const output = {};
  const builtInTemplateNames = new Set();
  const deletedBuiltInIds = normalizeBossExcludeDeletedBuiltInIds(rawValue);
  createBuiltInBossExcludeTemplates().forEach((template) => {
    if (deletedBuiltInIds.has(template.id)) {
      return;
    }
    output[template.id] = template;
    builtInTemplateNames.add(template.name.trim().toLocaleLowerCase());
  });
  const rawTemplates = Array.isArray(rawValue)
    ? rawValue
    : rawValue && Array.isArray(rawValue.templates)
      ? rawValue.templates
      : [];
  rawTemplates.forEach((rawTemplate, index) => {
    const template = normalizeBossExcludeTemplate(rawTemplate, `template-${index + 1}`);
    const normalizedName = template ? template.name.trim().toLocaleLowerCase() : "";
    if (!template) {
      return;
    }
    if (deletedBuiltInIds.has(template.id)) {
      return;
    }
    const builtInTemplate = output[template.id];
    if (builtInTemplate && builtInTemplate.builtIn) {
      if (!template.overridden) {
        return;
      }
      output[template.id] = {
        ...template,
        locked: builtInTemplate.locked,
        builtIn: true,
        overridden: true,
      };
      return;
    }
    if (output[template.id] || builtInTemplateNames.has(normalizedName)) {
      return;
    }
    output[template.id] = {
      ...template,
      locked: false,
      builtIn: false,
      overridden: false,
    };
  });
  return output;
}

function readBossExcludeTemplateStorage() {
  try {
    const raw = readAccountStorage(BOSS_EXCLUDE_TEMPLATE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
}

function getBossExcludeTemplateList() {
  const templates = Object.values(state.bossExcludeTemplates || {});
  return templates.sort((left, right) => {
    if (left.id === BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID) {
      return -1;
    }
    if (right.id === BOSS_EXCLUDE_DEFAULT_TEMPLATE_ID) {
      return 1;
    }
    return String(left.name || "").localeCompare(String(right.name || ""));
  });
}

function getBossExcludeTemplateById(templateId) {
  const key = String(templateId || "").trim();
  return key && state.bossExcludeTemplates ? state.bossExcludeTemplates[key] || null : null;
}

function persistBossExcludeTemplates() {
  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    deletedBuiltInIds: [...normalizeBossExcludeDeletedBuiltInIds(
      state.bossExcludeDeletedBuiltInIds,
    )].sort(),
    templates: getBossExcludeTemplateList().filter((template) => !template.builtIn || template.overridden),
  };
  try {
    writeAccountStorage(BOSS_EXCLUDE_TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore localStorage write issues and keep runtime state.
  }
}

function loadBossExcludeTemplates() {
  const stored = readBossExcludeTemplateStorage();
  state.bossExcludeDeletedBuiltInIds = normalizeBossExcludeDeletedBuiltInIds(stored);
  state.bossExcludeTemplates = normalizeBossExcludeTemplates(stored);
  if (!getBossExcludeTemplateById(state.bossExcludeTemplateId)) {
    state.bossExcludeTemplateId = getBossExcludeTemplateList()[0]?.id || "";
  }
  return {
    loaded: getBossExcludeTemplateList().filter((template) => !template.builtIn || template.overridden).length,
  };
}

function setBossExcludeTemplateNote(message = "") {
  const note = $("#boss-exclude-template-note");
  if (note) {
    note.textContent = message;
  }
}

function canDeleteBossExcludeTemplate(template) {
  return Boolean(template);
}

function populateBossExcludeTemplateSelect(preferredId = state.bossExcludeTemplateId) {
  const select = $("#boss-exclude-template-select");
  if (!select) {
    return;
  }
  const templates = getBossExcludeTemplateList();
  const preferred = getBossExcludeTemplateById(preferredId)
    ? String(preferredId)
    : "";
  const placeholder = {
    value: "",
    label: templates.length > 0 ? "Выберите сохранённый набор" : "Сохранённых наборов нет",
    disabled: true,
  };
  if (!syncSelectOptions(select, [
    placeholder,
    ...templates.map((template) => ({
      value: template.id,
      label: template.name,
    })),
  ])) {
    return;
  }
  select.value = preferred;
  state.bossExcludeTemplateId = preferred;

  const selected = getBossExcludeTemplateById(preferred);
  const nameInput = $("#boss-exclude-template-name");
  if (nameInput && document.activeElement !== nameInput) {
    nameInput.value = selected ? selected.name : "";
  }
  const deleteButton = $('[data-action="delete-template"]');
  if (deleteButton) {
    deleteButton.disabled = !canDeleteBossExcludeTemplate(selected);
  }
  const saveButton = $('[data-action="save-template"]');
  if (saveButton) {
    saveButton.disabled = !selected;
  }
}

function buildBossExcludeTemplateId() {
  return `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildBossExcludeTemplateDraft({
  id,
  name,
  locked = false,
  builtIn = false,
  overridden = false,
}) {
  const modeByBossId = {};
  for (const [bossId, mode] of getBossRunQueueModeOverrides()) {
    modeByBossId[String(bossId)] = mode;
  }
  return {
    id,
    name,
    locked,
    builtIn,
    overridden,
    selectedIds: normalizeBossIdList(getBossRunQueueSelectedIds()),
    modeByBossId,
    rulesByBossId: Object.fromEntries(getBossCatalogItems().map((item) => [String(item.id), resolveBossAutoQueueRule(item.id)])),
    updatedAt: new Date().toISOString(),
  };
}

function getBossTemplateSelectedIds(template, items = getBossCatalogItems()) {
  if (!template) {
    return new Set();
  }
  const catalogIds = new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => Number(item && item.id || 0))
      .filter((bossId) => Number.isFinite(bossId) && bossId > 0),
  );
  if (template.selectAll) {
    return catalogIds;
  }
  if (Array.isArray(template.selectedIds) && template.excludedIds.length === 0) {
    return new Set(template.selectedIds);
  }
  // v1 templates stored bosses to omit. Convert them after the catalog loads
  // so an upgrade keeps the same effective auto queue.
  const legacyExcludedIds = new Set(normalizeBossIdList(template.excludedIds));
  return new Set([...catalogIds].filter((bossId) => !legacyExcludedIds.has(bossId)));
}

function applyBossExcludeTemplate(template, options = {}) {
  if (!template) {
    return;
  }
  state.bossQueueSettings = { ...state.bossQueueSettings, rulesByBossId: normalizeBossQueueRules(template.rulesByBossId) };
  state.bossExcludeTemplateId = template.id;
  state.bossRunQueueModeOverrides = normalizeBossRunQueueModeOverrides(template.modeByBossId);
  const selectedIds = getBossTemplateSelectedIds(template);
  state.bossRunQueueSelectedIds = selectedIds;
  state.bossRunQueueLegacyExcludedIds = null;
  populateBossExcludeTemplateSelect(template.id);
  renderBossRunQueueExcludeList({
    selectedIds,
    modeOverrides: state.bossRunQueueModeOverrides,
  });
  renderBossRunQueue();
  persistBossQueueSettings();
  const modeCount = getBossRunQueueModeOverrideCount(state.bossRunQueueModeOverrides);
  setBossExcludeTemplateNote(
    `${template.name}: ${formatNumber(selectedIds.size)} selected${modeCount > 0 ? `, ${formatNumber(modeCount)} modes` : ""}.`,
  );
  if (options.log !== false) {
    appendLog("Boss selection template applied", template.name);
  }
}

function handleBossExcludeTemplateSelectChange() {
  const select = $("#boss-exclude-template-select");
  const template = select ? getBossExcludeTemplateById(select.value) : null;
  if (!template) {
    return;
  }
  applyBossExcludeTemplate(template);
}

function handleBossExcludeTemplateSave() {
  const selected = getBossExcludeTemplateById(state.bossExcludeTemplateId);
  if (!selected) {
    handleBossExcludeTemplateCreate();
    return;
  }
  const nameInput = $("#boss-exclude-template-name");
  const typedName = nameInput ? String(nameInput.value || "").trim() : "";
  const name = typedName || selected.name;
  const id = selected.id;
  const template = buildBossExcludeTemplateDraft({
    id,
    name,
    locked: false,
    builtIn: Boolean(selected.builtIn),
    overridden: Boolean(selected.builtIn || selected.overridden),
  });
  state.bossExcludeTemplates[id] = template;
  state.bossExcludeTemplateId = id;
  persistBossExcludeTemplates();
  persistBossQueueSettings();
  populateBossExcludeTemplateSelect(id);
  setBossExcludeTemplateNote(`Пресет «${template.name}» обновлён.`);
  appendLog("Boss selection template saved", template.name);
}

function handleBossExcludeTemplateCreate() {
  const selected = getBossExcludeTemplateById(state.bossExcludeTemplateId);
  const nameInput = $("#boss-exclude-template-name");
  const typedName = nameInput ? String(nameInput.value || "").trim() : "";
  const name = typedName && (!selected || typedName !== selected.name)
    ? typedName
    : selected
      ? `${selected.name} — копия`
      : "Новый набор";
  const template = buildBossExcludeTemplateDraft({
    id: buildBossExcludeTemplateId(),
    name,
  });
  state.bossExcludeTemplates[template.id] = template;
  state.bossExcludeTemplateId = template.id;
  persistBossExcludeTemplates();
  populateBossExcludeTemplateSelect(template.id);
  persistBossQueueSettings();
  setBossExcludeTemplateNote(
    `Создан набор «${template.name}»: выбрано ${formatNumber(template.selectedIds.length)} боссов.`,
  );
  appendLog("Boss selection template created", template.name);
}

function handleBossExcludeTemplateDelete() {
  const selected = getBossExcludeTemplateById(state.bossExcludeTemplateId);
  if (!canDeleteBossExcludeTemplate(selected)) {
    setBossExcludeTemplateNote("Выберите набор для удаления.");
    return;
  }
  if (selected.builtIn) {
    const deletedBuiltInIds = normalizeBossExcludeDeletedBuiltInIds(
      state.bossExcludeDeletedBuiltInIds,
    );
    deletedBuiltInIds.add(selected.id);
    state.bossExcludeDeletedBuiltInIds = deletedBuiltInIds;
  }
  delete state.bossExcludeTemplates[selected.id];
  persistBossExcludeTemplates();
  const nextTemplate = getBossExcludeTemplateList()[0] || null;
  if (nextTemplate) {
    applyBossExcludeTemplate(nextTemplate, { log: false });
    setBossExcludeTemplateNote(`Набор «${selected.name}» удалён. Выбран набор «${nextTemplate.name}».`);
  } else {
    state.bossExcludeTemplateId = "";
    persistBossQueueSettings();
    populateBossExcludeTemplateSelect("");
    setBossExcludeTemplateNote(`Набор «${selected.name}» удалён. Сохранённых наборов больше нет.`);
  }
  appendLog("Boss selection template deleted", selected.name);
}

function collectBossExcludeCheckboxes() {
  const list = $("#boss-run-queue-exclude-list");
  return list ? [...list.querySelectorAll(".js-boss-run-exclude")] : [];
}

function getBossRunQueueSelectedIds(items = getBossCatalogItems()) {
  const checkboxes = collectBossExcludeCheckboxes();
  if (checkboxes.length > 0) {
    const selectedIds = new Set(
      checkboxes
        .filter((input) => input.checked)
        .map((input) => Number(input.value || 0))
        .filter((bossId) => Number.isFinite(bossId) && bossId > 0),
    );
    state.bossRunQueueSelectedIds = selectedIds;
    state.bossRunQueueLegacyExcludedIds = null;
    return new Set(selectedIds);
  }
  if (state.bossRunQueueSelectedIds instanceof Set) {
    return new Set(state.bossRunQueueSelectedIds);
  }
  const catalogIds = new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => Number(item && item.id || 0))
      .filter((bossId) => Number.isFinite(bossId) && bossId > 0),
  );
  if (catalogIds.size === 0) {
    return null;
  }
  const legacyExcludedIds = state.bossRunQueueLegacyExcludedIds instanceof Set
    ? state.bossRunQueueLegacyExcludedIds
    : null;
  return legacyExcludedIds
    ? new Set([...catalogIds].filter((bossId) => !legacyExcludedIds.has(bossId)))
    : catalogIds;
}

// Compatibility helper for the old planner API and old local templates.  The
// UI itself now uses the selected (included) IDs exclusively.
function getBossRunQueueExcludedIds(items = getBossCatalogItems()) {
  const selectedIds = getBossRunQueueSelectedIds(items);
  const catalogIds = new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => Number(item && item.id || 0))
      .filter((bossId) => Number.isFinite(bossId) && bossId > 0),
  );
  return new Set([...catalogIds].filter((bossId) => !selectedIds || !selectedIds.has(bossId)));
}

function getBossExcludeCategoryLabel(item) {
  const categoryKey = String(item && item.categoryKey || "").trim().toLowerCase();
  const labels = {
    bers: "Беспредельщики",
    guards: "Надзиратели",
    recid: "Рецидивисты",
  };
  if (labels[categoryKey]) {
    return labels[categoryKey];
  }
  const categoryId = String(item && item.categoryId || "").trim();
  return getBossCategoryFilterLabel(categoryId) || "Другое";
}

function buildBossExcludeSections(items = getBossCatalogItems()) {
  const groups = new Map();
  for (const item of Array.isArray(items) ? items.slice().sort(compareBossCatalogItems) : []) {
    const label = getBossExcludeCategoryLabel(item);
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label).push(item);
  }
  return [...groups.entries()].map(([label, groupItems]) => ({
    label,
    items: groupItems,
  }));
}

function formatBossExcludeMeta(item) {
  if (!item) {
    return "";
  }

  const parts = [];
  if (item.selectedMode) {
    parts.push(formatBossModeLabel(item.selectedMode));
  }
  if (item.currentSession) {
    parts.push("активен");
  } else if (isBossCatalogStartable(item)) {
    parts.push("доступен для запуска");
  } else if (item.canStart && !item.hasEnoughKeys) {
    parts.push(`не хватает ключей: ${formatNumber(item.keysMissing || 0)}`);
  } else if (!item.canStart) {
    parts.push(formatBossBlockedReason(item.blockedReason));
  }
  const remainingToday = getBossCandidateRemainingToday(item);
  if (remainingToday !== null) {
    parts.push(`осталось сегодня: ${formatNumber(remainingToday)}`);
  }
  return parts.join(" | ");
}

function renderBossExcludeModeSelect(item, bossId, modeOverrides = state.bossRunQueueModeOverrides, isSelected = true) {
  const modes = Array.isArray(item && item.availableModes)
    ? [...new Set(item.availableModes.map((mode) => String(mode || "").trim()).filter(Boolean))]
    : [];
  if (modes.length === 0) {
    return `<span class="muted">-</span>`;
  }
  const overrides = normalizeBossRunQueueModeOverrides(modeOverrides);
  const selectedMode = overrides[String(bossId)] || AUTO_BOSS_QUEUE_MODE;
  return `
    <select
      class="boss-exclude-mode js-boss-exclude-mode"
      data-boss-id="${escapeHtml(String(bossId))}"
      ${isSelected ? "" : " disabled"}
      title="Режим для автоочереди"
    >
      <option value="${AUTO_BOSS_QUEUE_MODE}"${selectedMode === AUTO_BOSS_QUEUE_MODE ? " selected" : ""}>Автоматически</option>
      ${modes.map((mode) => `
        <option value="${escapeHtml(mode)}"${normalizeBossComboMode(mode) === selectedMode ? " selected" : ""}>
          ${escapeHtml(formatBossModeShortLabel(mode))}
        </option>
      `).join("")}
    </select>
  `;
}

function updateBossRunQueueExcludeSummary(
  selectedIds = getBossRunQueueSelectedIds(),
  modeOverrides = state.bossRunQueueModeOverrides,
) {
  const summary = $("#boss-run-queue-exclude-summary");
  if (!summary) {
    return;
  }
  const modeCount = getBossRunQueueModeOverrideCount(modeOverrides);
  const selectedText = selectedIds && selectedIds.size > 0
    ? `выбрано: ${formatNumber(selectedIds.size)}`
    : "никто не выбран";
  summary.textContent = modeCount > 0
    ? `${selectedText} / режимов: ${formatNumber(modeCount)}`
    : selectedText;
}

function renderBossRunQueueExcludeList(options = {}) {
  const list = $("#boss-run-queue-exclude-list");
  if (!list) {
    return;
  }

  const selectedIds = options.selectedIds instanceof Set
    ? options.selectedIds
    : getBossRunQueueSelectedIds();
  const modeOverrides = options.modeOverrides !== undefined
    ? normalizeBossRunQueueModeOverrides(options.modeOverrides)
    : normalizeBossRunQueueModeOverrides(state.bossRunQueueModeOverrides);
  state.bossRunQueueModeOverrides = modeOverrides;
  state.bossRunQueueSelectedIds = selectedIds === null ? null : new Set(selectedIds);
  if (selectedIds !== null) {
    state.bossRunQueueLegacyExcludedIds = null;
  }
  const sections = buildBossExcludeSections();
  if (sections.length === 0) {
    list.innerHTML = `<div class="boss-exclude-empty">Каталог боссов ещё не загружен.</div>`;
    updateBossRunQueueExcludeSummary(selectedIds, modeOverrides);
    return;
  }

  list.innerHTML = sections.flatMap((section) => [
    `<div class="boss-exclude-section">${escapeHtml(section.label)}</div>`,
    ...section.items.map((item) => {
      const bossId = Number(item && item.id || 0);
      const checked = selectedIds && selectedIds.has(bossId) ? " checked" : "";
      const meta = formatBossExcludeMeta(item);
      const rule = resolveBossAutoQueueRule(bossId);
      return `
        <div class="boss-exclude-item">
          <label class="boss-exclude-check">
            <input class="js-boss-run-exclude" type="checkbox" value="${escapeHtml(String(bossId))}"${checked}>
            <span>
              <span class="boss-exclude-title">${escapeHtml(`#${bossId} ${item.title || ""}`.trim())}</span>
              ${meta ? `<span class="boss-exclude-meta">${escapeHtml(meta)}</span>` : ""}
            </span>
          </label>
          ${renderBossExcludeModeSelect(item, bossId, modeOverrides, Boolean(selectedIds && selectedIds.has(bossId)))}
          <div class="boss-exclude-rules">
            <label class="field"><span>Комбо</span><select class="boss-exclude-mode js-boss-exclude-combo" data-boss-id="${bossId}">
              ${[["auto", "Автоматически — по сохранённому"], ["none", "Не пробивать"], ["pacansky", "Пацанское"], ["blotnoy", "Блатное"], ["avtoritetny", "Авторитетное"], ["vorovskoy", "Воровское"]].map(([value, label]) => `<option value="${value}"${rule.combo === value ? " selected" : ""}>${label}</option>`).join("")}
            </select></label>
            <label class="toggle"><input class="js-boss-exclude-solo" data-boss-id="${bossId}" type="checkbox"${rule.autoKillSolo ? " checked" : ""}><span>Убивать «в одного» автоматически</span></label>
          </div>
        </div>
      `;
    }),
  ]).join("");

  updateBossRunQueueExcludeSummary(selectedIds, modeOverrides);
}

function setBossRunQueueSelectedIds(selectedIds, options = {}) {
  const normalizedSelectedIds = selectedIds instanceof Set ? selectedIds : new Set();
  state.bossRunQueueSelectedIds = new Set(normalizedSelectedIds);
  state.bossRunQueueLegacyExcludedIds = null;
  if (options.modeOverrides !== undefined) {
    state.bossRunQueueModeOverrides = normalizeBossRunQueueModeOverrides(options.modeOverrides);
  }
  const modeOverrides = normalizeBossRunQueueModeOverrides(state.bossRunQueueModeOverrides);
  const checkboxes = collectBossExcludeCheckboxes();
  if (checkboxes.length === 0 || options.renderList === true) {
    renderBossRunQueueExcludeList({ selectedIds: normalizedSelectedIds, modeOverrides });
    renderBossRunQueue();
    if (options.persist !== false) {
      persistBossQueueSettings();
    }
    return;
  }
  for (const input of checkboxes) {
    input.checked = normalizedSelectedIds.has(Number(input.value || 0));
  }
  for (const select of collectBossExcludeModeSelects()) {
    const bossId = Number(select.dataset.bossId || 0);
    select.value = modeOverrides[String(bossId)] || AUTO_BOSS_QUEUE_MODE;
  }
  updateBossRunQueueExcludeSummary(normalizedSelectedIds, modeOverrides);
  renderBossRunQueue();
  if (options.persist !== false) {
    persistBossQueueSettings();
  }
}

function setBossRunQueueExcludedIds(excludedIds, options = {}) {
  const catalogIds = new Set(
    getBossCatalogItems()
      .map((item) => Number(item && item.id || 0))
      .filter((bossId) => Number.isFinite(bossId) && bossId > 0),
  );
  const legacyExcludedIds = excludedIds instanceof Set ? excludedIds : new Set();
  return setBossRunQueueSelectedIds(
    new Set([...catalogIds].filter((bossId) => !legacyExcludedIds.has(bossId))),
    options,
  );
}

function applyBossAutoQueueRulesToSelected() {
  const settings = persistBossQueueSettings();
  const selectedIds = getBossRunQueueSelectedIds();
  const rules = { ...settings.rulesByBossId };
  for (const item of getBossCatalogItems()) {
    if (selectedIds && !selectedIds.has(Number(item.id))) continue;
    rules[String(item.id)] = {
      combo: settings.autoQueueUseCombo === false ? "none" : settings.autoQueueComboMode || "auto",
      autoKillSolo: settings.autoQueueKillSolo !== false,
    };
  }
  state.bossQueueSettings = { ...settings, rulesByBossId: rules };
  persistBossQueueSettings();
  renderBossRunQueueExcludeList();
  renderBossRunQueue();
}

function handleBossRunQueueExcludeChange(event) {
  const ruleTrigger = event?.target?.closest?.(".js-boss-exclude-combo, .js-boss-exclude-solo");
  if (ruleTrigger) {
    const id = ruleTrigger.dataset.bossId;
    const settings = state.bossQueueSettings || normalizeBossQueueSettings(null);
    const rule = { ...settings.rulesByBossId?.[id] };
    if (ruleTrigger.matches(".js-boss-exclude-combo")) rule.combo = ruleTrigger.value;
    else rule.autoKillSolo = ruleTrigger.checked;
    state.bossQueueSettings = { ...settings, rulesByBossId: { ...settings.rulesByBossId, [id]: rule } };
    persistBossQueueSettings();
    renderBossRunQueue();
    return;
  }

  const modeTrigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-exclude-mode")
    : null;
  if (modeTrigger) {
    setBossRunQueueModeOverride(modeTrigger.dataset.bossId, modeTrigger.value || "");
    renderBossRunQueue();
    persistBossQueueSettings();
    return;
  }

  const trigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-run-exclude")
    : null;
  if (!trigger) {
    return;
  }
  const item = trigger.closest(".boss-exclude-item");
  const modeSelect = item ? item.querySelector(".js-boss-exclude-mode") : null;
  if (modeSelect) {
    modeSelect.disabled = !trigger.checked;
  }
  renderBossRunQueue();
  persistBossQueueSettings();
}

function handleBossRunQueueExcludeActionClick(event) {
  const trigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-exclude-action")
    : null;
  if (!trigger) {
    return;
  }
  event.preventDefault();

  const action = String(trigger.dataset.action || "").trim();
  if (action === "create-template") {
    handleBossExcludeTemplateCreate();
  } else if (action === "all") {
    setBossRunQueueSelectedIds(new Set(getBossCatalogItems().map((item) => Number(item.id || 0)).filter((bossId) => bossId > 0)));
  } else if (action === "available") {
    setBossRunQueueSelectedIds(new Set(
      getBossCatalogItems()
        .filter((item) => isBossCatalogStartable(item))
        .map((item) => Number(item.id || 0))
        .filter((bossId) => bossId > 0),
    ));
  } else if (action === "clear") {
    setBossRunQueueSelectedIds(new Set());
  } else if (action === "save-template") {
    handleBossExcludeTemplateSave();
  } else if (action === "delete-template") {
    handleBossExcludeTemplateDelete();
  }
}

function getCandidateQueueModeBundle(candidate, preferredMode, preferredComboMode) {
  if (!candidate) {
    return null;
  }

  const availableModes = Array.isArray(candidate.availableModes) ? candidate.availableModes : [];
  const availableModeMap = new Map(
    availableModes
      .map((mode) => [normalizeBossComboMode(mode), mode])
      .filter(([key, mode]) => Boolean(key) && Boolean(mode)),
  );
  const comboModes = resolveBossComboModes(candidate);
  const comboModeMap = new Map(
    comboModes
      .map((mode) => [normalizeBossComboMode(mode), mode])
      .filter(([key, mode]) => Boolean(key) && Boolean(mode)),
  );
  const modePreferences = [
    preferredMode,
    candidate.selectedMode,
    DEFAULT_BOSS_MODE,
    ...availableModes,
  ]
    .map((mode) => normalizeBossComboMode(mode))
    .filter(Boolean);

  let selectedMode = "";
  for (const modeKey of [...new Set(modePreferences)]) {
    if (availableModeMap.has(modeKey)) {
      selectedMode = availableModeMap.get(modeKey);
      break;
    }
  }

  if (!selectedMode) {
    return null;
  }

  const comboPreferences = [
    preferredComboMode,
    DEFAULT_BOSS_MODE,
    ...comboModes,
  ]
    .map((mode) => normalizeBossComboMode(mode))
    .filter(Boolean);

  let selectedComboMode = "";
  for (const modeKey of [...new Set(comboPreferences)]) {
    if (comboModeMap.has(modeKey)) {
      selectedComboMode = comboModeMap.get(modeKey);
      break;
    }
  }

  return {
    mode: selectedMode,
    comboMode: selectedComboMode,
  };
}

function getPreferredBossComboTemplateMode(candidate) {
  if (!candidate || !candidate.id) {
    return null;
  }
  const bossId = Number(candidate.id);
  const comboModeKeys = new Set(
    resolveBossComboModes(candidate)
      .map((mode) => normalizeBossComboMode(mode))
      .filter(Boolean),
  );
  const priorities = ["avtoritetny", ...BOSS_COMBO_MODE_ORDER.filter((mode) => mode !== "avtoritetny")];
  for (const mode of priorities) {
    if (comboModeKeys.has(mode) && hasBossComboTemplate(bossId, mode)) {
      return mode;
    }
  }
  return null;
}

function applySavedZarubaCombosToBossRunQueue() {
  const candidateMap = getBossQueueCandidateMap();
  const operations = [];
  state.bossRunQueue = (Array.isArray(state.bossRunQueue) ? state.bossRunQueue : []).map((entry) => {
    const isZarubaDamage = String(entry && entry.origin || "").includes("zaruba")
      && entry && entry.zarubaObjective === "damage";
    if (!isZarubaDamage) {
      return entry;
    }
    const candidate = candidateMap.get(Number(entry.bossId)) || null;
    const preferredComboMode = getPreferredBossComboTemplateMode(candidate);
    if (!preferredComboMode) {
      return entry;
    }
    const next = withBossRunQueueHitTypes({
      ...entry,
      mode: String(entry.mode || "").toLowerCase() === "odin" ? null : entry.mode,
      comboMode: preferredComboMode,
    });
    if (JSON.stringify(next) === JSON.stringify(entry)) {
      return entry;
    }
    operations.push({ type: "replace", from: entry, item: next });
    return next;
  });
  if (operations.length === 0) {
    return operations;
  }
  markBossRunQueueEdited();
  persistBossRunQueue();
  setTimeout(() => {
    void syncBossAutomationAfterQueueEdit(
      "Заруба · сохранённое комбо",
      { queueOperations: operations },
      { includeQueue: false },
    );
  }, 0);
  return operations;
}

function applyZarubaBossTasksToExistingQueue() {
  if (state.zarubaBossQueueAnnotationSyncing) return [];
  const tasks = getActiveZarubaBossTasks();
  if (tasks.length === 0 || !Array.isArray(state.bossRunQueue) || state.bossRunQueue.length === 0) {
    return [];
  }
  const candidateMap = getBossQueueCandidateMap();
  const operations = [];
  const usedTaskIds = new Set();
  state.bossRunQueue = state.bossRunQueue.map((entry) => {
    // Exact `zaruba` entries are legacy background inserts and are removed by
    // the server reconciliation. Never turn them into user-owned entries here.
    if (String(entry && entry.origin || "") === "zaruba") return entry;
    const task = tasks.find((candidateTask) => (
      !usedTaskIds.has(String(candidateTask.taskId || ""))
      && Number(candidateTask.targetId || 0) === Number(entry && entry.bossId || 0)
    ));
    if (!task) return entry;
    usedTaskIds.add(String(task.taskId || ""));
    const next = decorateBossRunQueueEntryWithZarubaTask(
      entry,
      task,
      candidateMap.get(Number(entry.bossId)) || null,
    );
    if (JSON.stringify(next) === JSON.stringify(entry)) return entry;
    operations.push({ type: "replace", from: entry, item: next });
    return next;
  });
  if (operations.length === 0) return operations;
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  state.zarubaBossQueueAnnotationSyncing = true;
  setTimeout(() => {
    void syncBossAutomationAfterQueueEdit(
      "Заруба · отметка в пользовательской очереди",
      { queueOperations: operations },
      { includeQueue: false },
    ).finally(() => {
      state.zarubaBossQueueAnnotationSyncing = false;
    });
  }, 0);
  return operations;
}

function getBossSmartQueueMissingBattleModes(candidate, rewards) {
  const bossId = Number(candidate && candidate.id || 0);
  if (!Number.isFinite(bossId) || bossId <= 0) {
    return [];
  }

  const rewardBoss = getBossRewardBoss(bossId, rewards);
  const battleModes = Array.isArray(rewardBoss && rewardBoss.battleModes)
    ? rewardBoss.battleModes
    : [];
  const rewardModeByKey = new Map(
    battleModes
      .map((mode) => [normalizeBossComboMode(mode && mode.key), mode])
      .filter(([key, mode]) => Boolean(key) && Boolean(mode)),
  );
  const availableModeByKey = new Map();
  for (const mode of Array.isArray(candidate && candidate.availableModes) ? candidate.availableModes : []) {
    const key = normalizeBossComboMode(mode);
    if (key && !availableModeByKey.has(key)) {
      availableModeByKey.set(key, mode);
    }
  }

  return [...availableModeByKey.entries()]
    .map(([key, availableMode], index) => {
      const rewardMode = rewardModeByKey.get(key);
      const missingItems = Array.isArray(rewardMode && rewardMode.missing)
        ? rewardMode.missing
        : Array.isArray(rewardMode && rewardMode.items)
          ? rewardMode.items.filter((item) => !item.owned)
          : [];
      const missingCollectionItems = missingItems.filter((item) => (
        item && (item.type === "clothing" || item.type === "tattoo")
      ));
      return {
        mode: availableMode,
        missingCount: missingCollectionItems.length,
        hp: resolveBossModeHp(candidate.baseHp, availableMode),
        priority: BOSS_COMBO_MODE_ORDER.indexOf(key),
        index,
      };
    })
    .filter((item) => (
      normalizeBossComboMode(item.mode) !== SOLO_BOSS_MODE
      &&
      item.missingCount > 0
      && Number.isFinite(item.hp)
      && item.hp <= SMART_BOSS_QUEUE_COLLECTION_HP_LIMIT
    ))
    .sort((left, right) => {
      const leftPriority = left.priority >= 0 ? left.priority : Number.MAX_SAFE_INTEGER;
      const rightPriority = right.priority >= 0 ? right.priority : Number.MAX_SAFE_INTEGER;
      return leftPriority - rightPriority || left.index - right.index;
    });
}

function buildBossKeyBudgetMap(candidates = []) {
  const budgets = new Map();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const bossId = Number(candidate && candidate.id || 0);
    if (!Number.isFinite(bossId) || bossId <= 0) {
      continue;
    }
    budgets.set(bossId, Math.max(0, Number(candidate.ownBossKeysOwned || 0)));
  }
  return budgets;
}

function buildBossRewardTargetsBySource(candidates = []) {
  const targetsBySource = new Map();
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const bossId = Number(candidate && candidate.id || 0);
    const sourceBossId = Number(candidate && candidate.keySourceBossId || 0);
    if (
      !Number.isFinite(bossId) || bossId <= 0
      || !Number.isFinite(sourceBossId) || sourceBossId <= 0
    ) {
      continue;
    }
    const targets = targetsBySource.get(sourceBossId) || [];
    targets.push(bossId);
    targetsBySource.set(sourceBossId, targets);
  }
  return targetsBySource;
}

function getBossAttackKeyBudgetId(candidate) {
  const sourceBossId = Number(candidate && candidate.keySourceBossId || 0);
  return Number.isFinite(sourceBossId) && sourceBossId > 0 ? sourceBossId : null;
}

function creditBossRewardKeysToBudget(budgets, rewardTargetsBySource, bossId, rewardKeys) {
  const normalizedBossId = Number(bossId || 0);
  const normalizedRewardKeys = Math.max(0, Number(rewardKeys || 0));
  if (!Number.isFinite(normalizedBossId) || normalizedBossId <= 0 || normalizedRewardKeys <= 0) {
    return;
  }

  void rewardTargetsBySource;
  budgets.set(normalizedBossId, (budgets.get(normalizedBossId) || 0) + normalizedRewardKeys);
}

function getBossCandidateBaseRewardKeys(candidate) {
  const declaredBase = Number(candidate && candidate.baseRewardKeysPerWin);
  if (Number.isFinite(declaredBase) && declaredBase >= 0) {
    return declaredBase;
  }

  const maximumReward = Math.max(0, Number(candidate && candidate.rewardKeysPerWin) || 0);
  const maximumBonus = Math.max(0, Number(candidate && candidate.bonusKeysByDamage) || 0);
  return Math.max(0, maximumReward - maximumBonus);
}

function getBossCandidateBonusKeyDamageTiers(candidate) {
  const baseRewardKeys = getBossCandidateBaseRewardKeys(candidate);
  return (Array.isArray(candidate && candidate.bonusKeyDamageTiers)
    ? candidate.bonusKeyDamageTiers
    : [])
    .map((tier) => ({
      personalDamage: Math.max(0, Number(tier && tier.personalDamage) || 0),
      rewardKeys: Math.max(baseRewardKeys, Number(tier && tier.rewardKeys) || 0),
    }))
    .filter((tier) => tier.personalDamage > 0 && tier.rewardKeys > baseRewardKeys)
    .sort((left, right) => left.personalDamage - right.personalDamage);
}

function getBossQueueProjectedPersonalDamage(entry, candidate, actions = []) {
  if (!candidate) {
    return 0;
  }

  const mode = entry && entry.mode ? entry.mode : candidate.selectedMode;
  const targetHp = resolveBossModeHp(candidate.baseHp, mode);
  // In the solo mode the automation follows a combo with the solo finisher,
  // which plans enough consumables to defeat the boss. Its personal damage is
  // therefore the whole solo HP pool.
  if (isSoloBossMode(mode)) {
    if (entry && entry.autoKillSolo === false) {
      return 0;
    }
    return Math.max(0, Number(targetHp) || 0);
  }

  const actionByKey = new Map(
    (Array.isArray(actions) ? actions : [])
      .map((action) => [String(action && action.key || ""), action])
      .filter(([key, action]) => Boolean(key) && Boolean(action)),
  );
  const comboDamage = normalizeBossRunQueueHitTypes(entry && entry.hitTypes)
    .reduce((total, actionKey) => {
      const action = actionByKey.get(actionKey);
      const damage = Math.max(0, Number(action && action.damage) || 0);
      return total + damage;
    }, 0);

  return Number.isFinite(Number(targetHp)) && Number(targetHp) > 0
    ? Math.min(comboDamage, Number(targetHp))
    : comboDamage;
}

function getBossQueueProjectedRewardKeys(candidate, entry, actions = [], options = {}) {
  const baseRewardKeys = getBossCandidateBaseRewardKeys(candidate);
  const tiers = getBossCandidateBonusKeyDamageTiers(candidate);
  const mode = entry && entry.mode ? entry.mode : candidate && candidate.selectedMode;
  const targetHp = resolveBossModeHp(candidate && candidate.baseHp, mode);
  const projectedDamage = getBossQueueProjectedPersonalDamage(entry, candidate, actions);
  if (
    !options.assumeVictory
    && (!Number.isFinite(Number(targetHp)) || Number(targetHp) <= 0 || projectedDamage < Number(targetHp))
  ) {
    return 0;
  }
  if (tiers.length === 0) {
    return Math.max(baseRewardKeys, Number(candidate && candidate.rewardKeysPerWin) || 0);
  }

  return tiers
    .filter((tier) => projectedDamage >= tier.personalDamage)
    .reduce((rewardKeys, tier) => Math.max(rewardKeys, tier.rewardKeys), baseRewardKeys);
}

function getActiveZarubaBossTasks(tasks = state.zarubaDashboard && state.zarubaDashboard.tasks) {
  return (Array.isArray(tasks) ? tasks : [])
    .filter((task) => (
      task
      && task.kind === "boss"
      && task.completed !== true
      && Number(task.targetId) > 0
    ))
    .sort((left, right) => {
      if (left.objective === right.objective) return 0;
      return left.objective === "damage" ? -1 : 1;
    });
}

function getZarubaBossTaskForQueueEntry(entry, tasks = getActiveZarubaBossTasks()) {
  if (!entry) return null;
  const serverTaskId = String(entry.serverTaskId || "").trim();
  if (serverTaskId) {
    const exact = tasks.find((task) => String(task && task.taskId || "") === serverTaskId);
    if (exact) return exact;
  }
  const bossId = Number(entry.bossId || 0);
  return tasks.find((task) => Number(task && task.targetId || 0) === bossId) || null;
}

function getBossQueueEntrySavedComboMode(entry, candidate) {
  if (entry?.skipCombo === true) return "";
  const currentMode = normalizeBossComboMode(entry && entry.comboMode);
  if (currentMode) {
    return currentMode;
  }
  return getPreferredBossComboTemplateMode(candidate);
}

function decorateBossRunQueueEntryWithZarubaTask(entry, task, candidate) {
  if (!entry || !task || task.kind !== "boss" || Number(task.targetId) !== Number(entry.bossId)) {
    return entry;
  }
  const objective = task.objective === "kill" ? "kill" : "damage";
  const remaining = Math.max(0, Number(task.requiredAmount || 0) - Number(task.currentAmount || 0));
  const plannedDamageHitTypes = normalizeBossRunQueueHitTypes(
    task.execution && task.execution.hitTypes,
  );
  let decorated = {
    ...entry,
    serverTaskId: String(task.taskId || ""),
    origin: "manual+zaruba",
    taskLabel: task.label || entry.taskLabel || null,
    strategy: task.execution && task.execution.strategy || entry.strategy || null,
    objective,
    zarubaObjective: objective,
    taskRequiredAmount: Math.max(0, Number(task.requiredAmount || 0)),
    taskCurrentAmount: Math.max(0, Number(task.currentAmount || 0)),
    plannedDamage: remaining,
  };

  if (objective !== "damage") {
    return withBossRunQueueHitTypes(decorated);
  }

  const savedComboMode = getBossQueueEntrySavedComboMode(decorated, candidate);
  if (savedComboMode) {
    decorated.comboMode = savedComboMode;
    decorated = withBossRunQueueHitTypes(decorated);
  } else {
    decorated.comboMode = "";
    decorated.hitTypes = plannedDamageHitTypes;
    decorated = withBossRunQueueHitTypes(decorated);
  }
  return decorated;
}

function canPlanBossCandidateWithKeys(candidate) {
  if (!candidate || candidate.currentSession || isBossCandidateDailyLimitReached(candidate)) {
    return false;
  }
  if (candidate.canStart) {
    return true;
  }
  const blockedReason = String(candidate.blockedReason || candidate.blockReason || "").toLowerCase();
  if (/daily|arrival|level|locked|unavailable|cooldown/.test(blockedReason)) {
    return false;
  }
  return Boolean(
    Number(candidate.keysMissing || 0) > 0
    || candidate.hasEnoughKeys === false
    || /key|ключ/.test(blockedReason)
  );
}

function createBossQueueEntryForCandidate(candidate) {
  if (!candidate) return null;
  const preferredComboMode = getPreferredBossComboTemplateMode(candidate);
  const modeBundle = getCandidateQueueModeBundle(
    candidate,
    DEFAULT_BOSS_MODE,
    preferredComboMode,
  );
  if (!modeBundle) return null;
  return ensureBossRunQueueItemId(withBossRunQueueHitTypes({
    bossId: Number(candidate.id),
    mode: modeBundle.mode,
    comboMode: preferredComboMode || modeBundle.comboMode || "",
    label: `#${Number(candidate.id)} ${candidate.title || ""}`.trim(),
    origin: "manual",
  }));
}

function buildZarubaBossQueuePlan(options = {}) {
  const tasks = getActiveZarubaBossTasks(options.tasks);
  const candidates = Array.isArray(options.candidates)
    ? options.candidates
    : getBossAutoQueueCandidates();
  const existingQueue = Array.isArray(options.existingQueue)
    ? options.existingQueue
    : state.bossRunQueue || [];
  const actions = Array.isArray(options.actions)
    ? options.actions
    : state.bossDashboard && Array.isArray(state.bossDashboard.actions)
      ? state.bossDashboard.actions
      : [];
  const candidateMap = new Map(
    candidates
      .map((candidate) => [Number(candidate && candidate.id || 0), candidate])
      .filter(([bossId, candidate]) => Number.isFinite(bossId) && bossId > 0 && candidate),
  );
  const budgets = buildBossKeyBudgetMap(candidates);
  const rewardTargetsBySource = buildBossRewardTargetsBySource(candidates);
  const remainingRuns = new Map(
    candidates.map((candidate) => {
      const remaining = getBossCandidateRemainingToday(candidate);
      return [Number(candidate.id), remaining === null ? 1 : remaining];
    }),
  );
  const entries = [];
  const replacements = [];
  const blocked = [];
  const existingTargetIndexes = new Set();
  const existingProjectedIndexes = new Set();

  for (let existingIndex = 0; existingIndex < existingQueue.length; existingIndex += 1) {
    const entry = existingQueue[existingIndex];
    const candidate = candidateMap.get(Number(entry && entry.bossId || 0));
    if (!candidate) continue;
    const bossId = Number(candidate.id);
    remainingRuns.set(bossId, Math.max(0, (remainingRuns.get(bossId) || 0) - 1));
    const requiredKeys = Math.max(0, Number(candidate.requiredKeys || 0));
    const bypassed = Boolean(candidate.keyBypassed) || requiredKeys <= 0 || shouldTreatBossAsAlwaysAutoBuy(candidate);
    const budgetId = getBossAttackKeyBudgetId(candidate);
    const available = budgetId === null ? 0 : budgets.get(budgetId) || 0;
    if (!bypassed && (budgetId === null || available < requiredKeys)) {
      continue;
    }
    if (!bypassed && budgetId !== null) {
      budgets.set(budgetId, available - requiredKeys);
    }
    creditBossRewardKeysToBudget(
      budgets,
      rewardTargetsBySource,
      bossId,
      getBossQueueProjectedRewardKeys(candidate, entry, actions, { assumeVictory: true }),
    );
    existingProjectedIndexes.add(existingIndex);
  }

  const reserveAttackKeys = (candidate) => {
    if (!candidate || candidate.keyBypassed || Number(candidate.requiredKeys || 0) <= 0) {
      return true;
    }
    if (shouldTreatBossAsAlwaysAutoBuy(candidate)) return true;
    const budgetId = getBossAttackKeyBudgetId(candidate);
    const required = Math.max(0, Number(candidate.requiredKeys || 0));
    if (budgetId === null || (budgets.get(budgetId) || 0) < required) return false;
    budgets.set(budgetId, (budgets.get(budgetId) || 0) - required);
    return true;
  };

  const appendCandidate = (candidate, task, path = []) => {
    const bossId = Number(candidate && candidate.id || 0);
    if (!Number.isFinite(bossId) || bossId <= 0 || path.includes(bossId)) {
      return false;
    }
    if (!canPlanBossCandidateWithKeys(candidate) || (remainingRuns.get(bossId) || 0) <= 0) {
      return false;
    }
    const entryCountBefore = entries.length;
    const budgetsBefore = new Map(budgets);
    const remainingRunsBefore = new Map(remainingRuns);
    const rollback = () => {
      entries.length = entryCountBefore;
      budgets.clear();
      for (const [key, value] of budgetsBefore) budgets.set(key, value);
      remainingRuns.clear();
      for (const [key, value] of remainingRunsBefore) remainingRuns.set(key, value);
      return false;
    };
    const requiredKeys = Math.max(0, Number(candidate.requiredKeys || 0));
    const budgetId = getBossAttackKeyBudgetId(candidate);
    if (!candidate.keyBypassed && requiredKeys > 0 && !shouldTreatBossAsAlwaysAutoBuy(candidate)) {
      if (budgetId === null) return rollback();
      while ((budgets.get(budgetId) || 0) < requiredKeys) {
        const source = candidateMap.get(budgetId) || null;
        const before = budgets.get(budgetId) || 0;
        if (!source || !appendCandidate(source, null, [...path, bossId])) return rollback();
        if ((budgets.get(budgetId) || 0) <= before) return rollback();
      }
    }
    if (!reserveAttackKeys(candidate)) return rollback();
    let entry = createBossQueueEntryForCandidate(candidate);
    if (!entry) return rollback();
    if (task) {
      entry = decorateBossRunQueueEntryWithZarubaTask(entry, task, candidate);
    } else {
      entry.label = `${entry.label} · ключи для Зарубы`;
    }
    entries.push(entry);
    remainingRuns.set(bossId, Math.max(0, (remainingRuns.get(bossId) || 0) - 1));
    creditBossRewardKeysToBudget(
      budgets,
      rewardTargetsBySource,
      bossId,
      getBossQueueProjectedRewardKeys(candidate, entry, actions, { assumeVictory: true }),
    );
    return true;
  };

  for (const task of tasks) {
    const bossId = Number(task.targetId || 0);
    const candidate = candidateMap.get(bossId) || null;
    if (task.objective === "damage" && task.execution && task.execution.queueable === false) {
      blocked.push({ task, reason: task.execution.reason || "no_suitable_weapon" });
      continue;
    }
    if (!candidate) {
      blocked.push({ task, reason: "boss_not_in_catalog" });
      continue;
    }
    const existingIndex = existingQueue.findIndex((entry, index) => (
      !existingTargetIndexes.has(index) && Number(entry && entry.bossId || 0) === bossId
    ));
    if (existingIndex >= 0) {
      existingTargetIndexes.add(existingIndex);
      const previous = existingQueue[existingIndex];
      const item = decorateBossRunQueueEntryWithZarubaTask(previous, task, candidate);
      if (JSON.stringify(previous) !== JSON.stringify(item)) {
        replacements.push({ index: existingIndex, from: previous, item, task });
      }
      const requiredKeys = Math.max(0, Number(candidate.requiredKeys || 0));
      const budgetId = getBossAttackKeyBudgetId(candidate);
      if (
        !existingProjectedIndexes.has(existingIndex)
        &&
        !candidate.keyBypassed
        && requiredKeys > 0
        && !shouldTreatBossAsAlwaysAutoBuy(candidate)
      ) {
        const source = budgetId === null ? null : candidateMap.get(budgetId);
        while (source && (budgets.get(budgetId) || 0) < requiredKeys) {
          const before = budgets.get(budgetId) || 0;
          if (!appendCandidate(source, null, [bossId]) || (budgets.get(budgetId) || 0) <= before) break;
        }
        if (budgetId === null || (budgets.get(budgetId) || 0) < requiredKeys) {
          blocked.push({ task, reason: "key_chain_unavailable" });
        } else if (reserveAttackKeys(candidate)) {
          creditBossRewardKeysToBudget(
            budgets,
            rewardTargetsBySource,
            bossId,
            getBossQueueProjectedRewardKeys(candidate, item, actions, { assumeVictory: true }),
          );
        }
      }
      continue;
    }
    if (!appendCandidate(candidate, task, [])) {
      blocked.push({ task, reason: "key_chain_unavailable" });
    }
  }

  return { tasks, entries, replacements, blocked };
}

function buildBossAutoQueuePlan(options = {}) {
  const toBossIdSet = (value) => {
    const values = value && typeof value.values === "function"
      ? [...value.values()]
      : Array.isArray(value)
        ? value
        : [];
    return new Set(values
      .map((bossId) => Number(bossId))
      .filter((bossId) => Number.isFinite(bossId) && bossId > 0));
  };
  const hasSelectedIds = options.selectedIds && (
    Array.isArray(options.selectedIds) || typeof options.selectedIds.values === "function"
  );
  const explicitSelectedIds = hasSelectedIds ? toBossIdSet(options.selectedIds) : null;
  const legacyExcludedIds = options.excludedIds && (
    Array.isArray(options.excludedIds) || typeof options.excludedIds.values === "function"
  )
    ? toBossIdSet(options.excludedIds)
    : typeof getBossRunQueueSelectedIds === "function"
      ? null
      : getBossRunQueueExcludedIds();
  const smartCollectionEnabled = options.smartCollectionEnabled !== undefined
    ? Boolean(options.smartCollectionEnabled)
    : isBossSmartQueueCollectionEnabled();
  const smartCollectionRewards = options.rewards !== undefined
    ? options.rewards
    : state.bossDashboard && state.bossDashboard.rewards;
  const buildModeOverrideMap = (rawValue) => {
    const rawEntries = rawValue
      && typeof rawValue === "object"
      && typeof rawValue.entries === "function"
      ? [...rawValue.entries()]
      : rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
        ? Object.entries(rawValue)
        : [];
    return new Map(
      rawEntries
        .map(([bossId, mode]) => [Number(bossId), normalizeBossComboMode(mode)])
        .filter(([bossId, mode]) => Number.isFinite(bossId) && bossId > 0 && Boolean(mode)),
    );
  };
  const modeOverrides = options.modeOverrides !== undefined
    ? buildModeOverrideMap(options.modeOverrides)
    : typeof getBossRunQueueModeOverrides === "function"
      ? getBossRunQueueModeOverrides()
      : new Map();
  const candidates = Array.isArray(options.candidates)
    ? options.candidates
    : getBossAutoQueueCandidates();
  const actions = Array.isArray(options.actions)
    ? options.actions
    : state.bossDashboard && Array.isArray(state.bossDashboard.actions)
      ? state.bossDashboard.actions
      : [];
  const activeZarubaBossTasks = getActiveZarubaBossTasks(options.zarubaTasks);
  const remainingByBossId = new Map();
  const queueCandidates = candidates
    .filter((candidate) => candidate && Number(candidate.id) > 0)
    .map((candidate) => ({ ...candidate }));
  const catalogIds = new Set(queueCandidates.map((candidate) => Number(candidate.id)));
  const runtimeSelectedIds = !explicitSelectedIds && typeof getBossRunQueueSelectedIds === "function"
    ? getBossRunQueueSelectedIds(queueCandidates)
    : null;
  const selectedIds = explicitSelectedIds
    || runtimeSelectedIds
    || new Set([...catalogIds].filter((bossId) => !legacyExcludedIds || !legacyExcludedIds.has(bossId)));
  const unselectedIds = new Set([...catalogIds].filter((bossId) => !selectedIds.has(bossId)));
  const budgets = buildBossKeyBudgetMap(queueCandidates);
  const rewardTargetsBySource = buildBossRewardTargetsBySource(queueCandidates);
  const smartModesByBossId = new Map();
  const entries = [];
  const usedZarubaTaskIds = new Set();
  let unselectedCount = 0;
  let blockedCount = 0;
  let activeCount = 0;
  let keyShortageCount = 0;
  let noModeCount = 0;
  let smartPreferredCount = 0;
  let smartFallbackCount = 0;

  for (const candidate of queueCandidates) {
    const bossId = Number(candidate.id || 0);
    if (smartCollectionEnabled) {
      smartModesByBossId.set(
        bossId,
        getBossSmartQueueMissingBattleModes(candidate, smartCollectionRewards),
      );
    }
    const remainingToday = getBossCandidateRemainingToday(candidate);
    remainingByBossId.set(
      bossId,
      remainingToday !== null ? remainingToday : 1,
    );
    if (!selectedIds.has(bossId)) {
      unselectedCount += 1;
    } else if (candidate.currentSession) {
      activeCount += 1;
    } else if (isBossCandidateDailyLimitReached(candidate)) {
      blockedCount += 1;
    } else if (!canPlanBossCandidateWithKeys(candidate)) {
      blockedCount += 1;
    } else if (smartCollectionEnabled) {
      if ((smartModesByBossId.get(bossId) || []).length > 0) {
        smartPreferredCount += 1;
      } else {
        smartFallbackCount += 1;
      }
    }
  }

  const usedKey = (candidate) => {
    if (!candidate || candidate.keyBypassed || Number(candidate.requiredKeys || 0) <= 0) {
      return true;
    }
    if (shouldTreatBossAsAlwaysAutoBuy(candidate)) {
      return true;
    }
    const required = Math.max(0, Number(candidate.requiredKeys || 0));
    const keyBudgetBossId = getBossAttackKeyBudgetId(candidate);
    if (keyBudgetBossId === null) {
      return false;
    }
    const available = budgets.get(keyBudgetBossId) || 0;
    if (available < required) {
      return false;
    }
    budgets.set(keyBudgetBossId, available - required);
    return true;
  };

  const getPreferredQueueMode = (candidate) => {
    const bossId = Number(candidate && candidate.id || 0);
    if (smartCollectionEnabled && Number.isFinite(bossId) && bossId > 0) {
      const modes = smartModesByBossId.get(bossId) || [];
      if (modes[0]) {
        return modes[0].mode;
      }
    }
    if (Number.isFinite(bossId) && bossId > 0 && modeOverrides.has(bossId)) {
      return modeOverrides.get(bossId);
    }
    if (smartCollectionEnabled) {
      return DEFAULT_BOSS_MODE;
    }
    return null;
  };

  const sortAttackableCandidates = (left, right) => {
    const leftPreferred = getPreferredQueueMode(left);
    const rightPreferred = getPreferredQueueMode(right);
    const leftModeBundle = getCandidateQueueModeBundle(left, leftPreferred, null);
    const rightModeBundle = getCandidateQueueModeBundle(right, rightPreferred, null);
    const leftHp = Number(
      resolveBossModeHp(left && left.baseHp, leftModeBundle ? leftModeBundle.mode : left && left.selectedMode)
      || Number.MAX_SAFE_INTEGER,
    );
    const rightHp = Number(
      resolveBossModeHp(right && right.baseHp, rightModeBundle ? rightModeBundle.mode : right && right.selectedMode)
      || Number.MAX_SAFE_INTEGER,
    );
    if (leftHp !== rightHp) {
      return leftHp - rightHp;
    }
    return compareBossCatalogItems(left, right);
  };

  while (true) {
    const attackable = queueCandidates
      .filter((candidate) => {
        const bossId = Number(candidate.id || 0);
        if (!Number.isFinite(bossId) || bossId <= 0) {
          return false;
        }
        if (
          !selectedIds.has(bossId)
          || candidate.currentSession
          || isBossCandidateDailyLimitReached(candidate)
          || !canPlanBossCandidateWithKeys(candidate)
        ) {
          return false;
        }
        return (remainingByBossId.get(bossId) || 0) > 0;
      })
      .filter((candidate) => {
        const bossId = Number(candidate.id || 0);
        if (!Number.isFinite(bossId) || bossId <= 0) {
          return false;
        }
        if (candidate.keyBypassed || Number(candidate.requiredKeys || 0) <= 0) {
          return true;
        }
        if (shouldTreatBossAsAlwaysAutoBuy(candidate)) {
          return true;
        }
        const keyBudgetBossId = getBossAttackKeyBudgetId(candidate);
        if (keyBudgetBossId === null) {
          return false;
        }
        return (budgets.get(keyBudgetBossId) || 0) >= Math.max(0, Number(candidate.requiredKeys || 0));
      })
      .sort(sortAttackableCandidates);

    if (attackable.length === 0) {
      break;
    }

    const candidate = attackable[0];
    const bossId = Number(candidate.id || 0);
    const preferredMode = getPreferredQueueMode(candidate);
    const rule = resolveBossAutoQueueRule(bossId);
    const preferredComboMode = rule.combo === "none"
      ? state.bossQueueSettings?.autoQueueComboMode || getPreferredBossComboTemplateMode(candidate)
      : rule.combo === "auto" ? getPreferredBossComboTemplateMode(candidate) : rule.combo;
    const modeBundle = getCandidateQueueModeBundle(candidate, preferredMode, preferredComboMode);
    if (!modeBundle) {
      remainingByBossId.set(bossId, 0);
      noModeCount += 1;
      continue;
    }
    if (!usedKey(candidate)) {
      remainingByBossId.set(bossId, 0);
      keyShortageCount += 1;
      continue;
    }

    let entry = withBossRunQueueHitTypes({
      bossId,
      // An explicit Auto override must stay automatic in the queue. Resolving it to
      // the default battle mode here makes a saved combo look like a battle-mode choice.
      mode: normalizeBossComboMode(preferredMode) === AUTO_BOSS_QUEUE_MODE ? null : modeBundle.mode,
      comboMode: modeBundle.comboMode || "",
      label: `#${bossId} ${candidate.title || ""}`.trim(),
      origin: "auto",
      autoKillSolo: rule.autoKillSolo,
      skipCombo: rule.combo === "none",
    });
    const zarubaTask = activeZarubaBossTasks
      .find((task) => (
        !usedZarubaTaskIds.has(String(task.taskId || ""))
        && Number(task.targetId || 0) === bossId
      )) || null;
    if (zarubaTask) {
      usedZarubaTaskIds.add(String(zarubaTask.taskId || ""));
      entry = decorateBossRunQueueEntryWithZarubaTask(entry, zarubaTask, candidate);
    }
    entries.push(entry);

    remainingByBossId.set(bossId, Math.max(0, (remainingByBossId.get(bossId) || 0) - 1));
    creditBossRewardKeysToBudget(
      budgets,
      rewardTargetsBySource,
      bossId,
      // Auto-formation models a queue whose entries are completed successfully.
      // Credit the guaranteed win keys even when the configured opening combo
      // alone does not account for the boss's entire HP pool.
      getBossQueueProjectedRewardKeys(candidate, entry, actions, { assumeVictory: true }),
    );
  }

  keyShortageCount = queueCandidates.filter((candidate) => {
    const bossId = Number(candidate && candidate.id || 0);
    if (!Number.isFinite(bossId) || bossId <= 0) {
      return false;
    }
    if (
      !selectedIds.has(bossId)
      || candidate.currentSession
      || isBossCandidateDailyLimitReached(candidate)
      || !canPlanBossCandidateWithKeys(candidate)
    ) {
      return false;
    }
    if ((remainingByBossId.get(bossId) || 0) <= 0) {
      return false;
    }
    if (
      candidate.keyBypassed
      || Number(candidate.requiredKeys || 0) <= 0
      || shouldTreatBossAsAlwaysAutoBuy(candidate)
    ) {
      return false;
    }
    const keyBudgetBossId = getBossAttackKeyBudgetId(candidate);
    if (keyBudgetBossId === null) {
      return true;
    }
    return (budgets.get(keyBudgetBossId) || 0) < Math.max(0, Number(candidate.requiredKeys || 0));
  }).length;

  return {
    entries,
    selectedIds,
    unselectedIds,
    // Kept for external callers that still consume the old plan shape.
    excludedIds: unselectedIds,
    modeOverrides,
    smartCollectionEnabled,
    unselectedCount,
    excludedCount: unselectedCount,
    blockedCount,
    activeCount,
    noModeCount,
    smartPreferredCount,
    smartFallbackCount,
    keyShortageCount,
  };
}

function buildBossRunQueueKeyProjection(
  queueEntries = state.bossRunQueue,
  candidates = getBossCatalogItems(),
  actions = state.bossDashboard && Array.isArray(state.bossDashboard.actions) ? state.bossDashboard.actions : [],
) {
  const candidateList = Array.isArray(candidates) ? candidates : [];
  const candidateMap = new Map(
    candidateList
      .map((candidate) => [Number(candidate && candidate.id || 0), candidate])
      .filter(([bossId, candidate]) => Number.isFinite(bossId) && bossId > 0 && candidate),
  );
  const budgets = buildBossKeyBudgetMap(candidateList);
  const rewardTargetsBySource = buildBossRewardTargetsBySource(candidateList);
  const projection = new Map();

  (Array.isArray(queueEntries) ? queueEntries : []).forEach((entry, index) => {
    const bossId = Number(entry && entry.bossId || 0);
    const candidate = candidateMap.get(bossId) || null;
    if (!candidate) {
      projection.set(index, {
        hasEnoughKeys: false,
        keysMissing: null,
        planned: false,
      });
      return;
    }

    const requiredKeys = Math.max(0, Number(candidate.requiredKeys || 0));
    const bypassed = Boolean(candidate.keyBypassed) || requiredKeys <= 0 || shouldTreatBossAsAlwaysAutoBuy(candidate);
    const keyBudgetBossId = getBossAttackKeyBudgetId(candidate);
    const availableKeys = keyBudgetBossId === null ? 0 : budgets.get(keyBudgetBossId) || 0;
    const keysMissing = bypassed ? 0 : Math.max(0, requiredKeys - availableKeys);
    const hasEnoughKeys = bypassed || keysMissing <= 0;

    projection.set(index, {
      hasEnoughKeys,
      keysMissing,
      planned: hasEnoughKeys && !candidate.hasEnoughKeys && !bypassed,
      availableKeys,
      requiredKeys,
    });

    if (!hasEnoughKeys) {
      return;
    }

    if (!bypassed && requiredKeys > 0 && keyBudgetBossId !== null) {
      budgets.set(keyBudgetBossId, Math.max(0, availableKeys - requiredKeys));
    }
    creditBossRewardKeysToBudget(
      budgets,
      rewardTargetsBySource,
      bossId,
      getBossQueueProjectedRewardKeys(candidate, entry, actions),
    );
  });

  return projection;
}

function renderBossComboModeMarks(modes, bossId) {
  const uniqueModes = [...new Set((Array.isArray(modes) ? modes : []).map((value) => normalizeBossComboMode(value)).filter(Boolean))];
  if (uniqueModes.length === 0) {
    return `<span class="muted">-</span>`;
  }
  return `
    <div class="boss-combo-marks">
      ${uniqueModes.map((mode) => {
        const template = getBossComboTemplate(bossId, mode);
        const saved = Boolean(template);
        return `
          <span
            class="boss-combo-mark ${saved ? "is-ready" : "is-missing"}"
            title="${escapeHtml(`${formatComboModeLabel(mode)}: ${template?.automatic ? "загружено автоматически" : saved ? "введено вручную" : "нет комбо"}`)}"
          >
            ${escapeHtml(getBossComboModeMarker(mode))}
          </span>
        `;
      }).join("")}
    </div>
  `;
}

function getSelectedBossCandidate() {
  const map = getBossQueueCandidateMap();
  const select = $("#boss-select");
  const selectedBossId = select ? Number(select.value || 0) : 0;

  if (selectedBossId) {
    return map.get(selectedBossId) || null;
  }

  const activeBossId = state.bossDashboard
    && state.bossDashboard.activeSession
    && state.bossDashboard.activeSession.session
    ? Number(state.bossDashboard.activeSession.session.bossId || 0)
    : 0;

  if (activeBossId) {
    return map.get(activeBossId) || null;
  }

  return null;
}

function updateBossSelectedKeyControls(candidate = getSelectedBossCandidate()) {
  const button = $("#boss-buy-selected-key-btn");
  const note = $("#boss-selected-key-note");
  if (!button || !note) {
    return;
  }

  if (!candidate) {
    button.hidden = true;
    button.dataset.bossId = "";
    button.dataset.count = "";
    note.textContent = "Select boss to see key purchase options.";
    return;
  }

  const purchaseCount = resolveBossKeyPurchaseCount(candidate);
  const canBuy = purchaseCount > 0 && canBuyBossKeys(candidate);
  if (!canBuy) {
    button.hidden = true;
    button.dataset.bossId = "";
    button.dataset.count = "";
    note.textContent = formatBossKeyRequirement(candidate);
    return;
  }

  button.hidden = false;
  button.dataset.bossId = String(candidate.id);
  button.dataset.count = String(purchaseCount);
  button.textContent = `Buy Key x${formatNumber(purchaseCount)}`;
  note.textContent = `Selected: #${candidate.id} ${candidate.title}. ${formatBossKeyRequirement(candidate)}`;
}

function renderBossRunQueueModeSelect(item, candidate, index) {
  const options = Array.isArray(candidate && candidate.availableModes) ? candidate.availableModes : [];
  if (options.length === 0) {
    return `<span class="muted">-</span>`;
  }
  const selectedValue = item && item.mode ? String(item.mode) : "";
  return `
    <select class="queue-inline-select js-boss-run-mode" data-index="${escapeHtml(String(index))}">
      <option value=""${selectedValue ? "" : " selected"}>Автоматически</option>
      ${options.map((mode) => `
        <option value="${escapeHtml(String(mode))}" ${String(mode) === selectedValue ? "selected" : ""}>
          ${escapeHtml(formatBossModeLabel(mode))}
        </option>
      `).join("")}
    </select>
  `;
}

function renderBossRunQueueComboSelect(item, candidate, index) {
  const comboModes = resolveBossComboModes(candidate);
  if (comboModes.length === 0) {
    return `<span class="muted">-</span>`;
  }
  const selectedComboMode = item && item.comboMode ? String(item.comboMode) : String(comboModes[0] || "");
  const marker = selectedComboMode
    ? renderBossComboModeMarks([selectedComboMode], item.bossId)
    : `<span class="muted">template?</span>`;
  return `
    <div class="queue-inline-stack">
      <select aria-label="Режим комбо" class="queue-inline-select js-boss-run-combo" data-index="${escapeHtml(String(index))}">
        ${comboModes.map((mode) => `
          <option value="${escapeHtml(String(mode))}" ${String(mode) === selectedComboMode ? "selected" : ""}>
            ${escapeHtml(formatComboModeLabel(mode))}
          </option>
        `).join("")}
      </select>
      ${marker}
      <label class="queue-toggle"><input type="checkbox" class="js-boss-run-use-combo" data-index="${index}" ${item.skipCombo === true ? "" : "checked"}><span>Пробивать комбо, если вбито</span></label>
    </div>
  `;
}

function renderBossRunQueueBossCell(item, candidate) {
  const label = item && item.label ? item.label : `#${item && item.bossId ? item.bossId : "-"}`;
  const mode = item && item.mode ? item.mode : candidate && candidate.selectedMode ? candidate.selectedMode : null;
  const hp = candidate ? resolveBossModeHp(candidate.baseHp, mode) : null;
  const hitTypes = normalizeBossRunQueueHitTypes(item && item.hitTypes);
  const liveZarubaTask = getZarubaBossTaskForQueueEntry(item);
  const zarubaObjective = item && item.zarubaObjective
    ? item.zarubaObjective
    : liveZarubaTask && liveZarubaTask.objective;
  const isZaruba = Boolean(liveZarubaTask) || String(item && item.origin || "").includes("zaruba");
  const isZarubaDamage = isZaruba && zarubaObjective === "damage";
  const taskCurrentAmount = liveZarubaTask
    ? Number(liveZarubaTask.currentAmount || 0)
    : Number(item && item.taskCurrentAmount || 0);
  const taskRequiredAmount = liveZarubaTask
    ? Number(liveZarubaTask.requiredAmount || 0)
    : Number(item && item.taskRequiredAmount || 0);
  const comboModes = resolveBossComboModes(candidate);
  const hasBossCombo = comboModes.length > 0;
  const savedComboMode = getPreferredBossComboTemplateMode(candidate);
  const plannedWeaponLabel = liveZarubaTask && liveZarubaTask.execution && liveZarubaTask.execution.weapon
    ? liveZarubaTask.execution.weapon.label
    : BOSS_WEAPON_LABELS[hitTypes[0]] || "подходящее оружие";
  const hitMeta = hitTypes.length > 0
    ? `<span class="boss-name-meta">${escapeHtml(
        isZarubaDamage && !item.comboMode
          ? `План: 1 удар · ${plannedWeaponLabel}`
          : `Комбо: ${formatNumber(hitTypes.length)} ударов`,
      )}</span>`
    : "";
  const needleMeta = item && item.finishWithNeedle
    ? `<span class="boss-name-meta">Добитие: Игла</span>`
    : "";
  const zarubaMeta = isZaruba
    ? `<span class="boss-name-meta boss-name-meta-zaruba">Заруба · ${escapeHtml(zarubaObjective === "damage" ? "нанесение урона" : "убийство")}${taskRequiredAmount > 0 ? ` · ${formatNumber(taskCurrentAmount)}/${formatNumber(taskRequiredAmount)}` : ""}</span>
      ${isZarubaDamage ? `<span class="boss-name-meta boss-name-meta-zaruba-action">${escapeHtml(
        hasBossCombo
          ? savedComboMode
            ? `Сначала сохранённое комбо; если урона не хватит — ${plannedWeaponLabel}`
            : `Комбо доступно — можно вбить; резерв: ${plannedWeaponLabel}`
          : `Комбо нет — план: 1 удар · ${plannedWeaponLabel}`,
      )}</span>` : ""}`
    : "";

  if (hp === null) {
    return `<span class="boss-name-cell">${escapeHtml(label)}</span>${zarubaMeta}${hitMeta}${needleMeta}`;
  }

  const hpFull = formatNumber(hp);
  return `
    <span class="boss-name-cell">${escapeHtml(label)}</span>
    <span class="boss-name-meta" title="${escapeHtml(`HP ${hpFull}`)}">HP ${escapeHtml(formatBossCompactNumber(hp))}</span>
    ${zarubaMeta}
    ${hitMeta}
    ${needleMeta}
  `;
}

function renderBossRunQueue() {
  const target = $("#boss-run-queue-body");
  if (!target) {
    return;
  }
  const map = getBossQueueCandidateMap();
  const autoPlan = buildBossAutoQueuePlan();
  const selectedIds = autoPlan.selectedIds;
  const keyProjection = buildBossRunQueueKeyProjection(state.bossRunQueue, getBossCatalogItems());
  const totalQueuedHp = state.bossRunQueue.reduce((sum, item) => {
    const candidate = map.get(Number(item && item.bossId));
    const mode = item && item.mode ? item.mode : candidate && candidate.selectedMode ? candidate.selectedMode : null;
    const hp = candidate ? resolveBossModeHp(candidate.baseHp, mode) : null;
    return sum + (Number.isFinite(hp) ? hp : 0);
  }, 0);
  const queueRows = state.bossRunQueue.map((item, index) => {
    const candidate = map.get(Number(item.bossId));
    const deferredReason = item && item.lastDeferredReason ? String(item.lastDeferredReason) : "";
    const plannedKeys = keyProjection.get(index) || null;
    const label = item && item.label
      ? String(item.label)
      : candidate && candidate.title
        ? `#${candidate.id} ${candidate.title}`
        : `#${item && item.bossId ? item.bossId : index + 1}`;
    const queueItemId = item && item.queueItemId ? String(item.queueItemId) : "";
    const effectiveMode = item && item.mode
      ? item.mode
      : candidate && candidate.selectedMode
        ? candidate.selectedMode
        : null;
    const soloKillControl = isSoloBossMode(effectiveMode)
      ? `<div class="queue-field queue-solo-kill-field">
          <span>После запуска</span>
          <label class="queue-toggle">
            <input
              class="js-boss-run-auto-kill-solo"
              data-index="${escapeHtml(String(index))}"
              type="checkbox"
              ${item && item.autoKillSolo === false ? "" : "checked"}
            >
            <span>Убить автоматически</span>
          </label>
        </div>`
      : "";
    const status = deferredReason
      ? buildBadge(`Отложено: ${formatBossBlockedReason(deferredReason)}`, "neutral")
      : candidate
      ? candidate.canStart
        ? plannedKeys && plannedKeys.hasEnoughKeys
          ? buildBadge(plannedKeys.planned ? "Ключи появятся по плану" : "Можно запускать", "success")
          : buildBadge(
            `Не хватает ключей: ${formatNumber(
              plannedKeys && plannedKeys.keysMissing !== null
                ? plannedKeys.keysMissing
                : candidate.keysMissing || 0,
            )}`,
            "neutral",
          )
        : buildBadge(formatBossBlockedReason(candidate.blockedReason), "danger")
      : buildBadge("Босс не найден", "neutral");
      return `
        <article
          class="boss-run-queue-item${index === 0 ? " is-next" : ""}"
          data-index="${escapeHtml(String(index))}"
          ${queueItemId ? `data-queue-item-id="${escapeHtml(queueItemId)}"` : ""}
          role="listitem"
        >
          <div class="boss-run-queue-order">
            <span
              class="boss-run-queue-drag-handle"
              data-boss-run-drag-index="${escapeHtml(String(index))}"
              draggable="true"
              tabindex="0"
              title="Перетащить в очереди"
              aria-label="Перетащить ${escapeHtml(label)}"
            >⋮⋮</span>
            <strong>${escapeHtml(index + 1)}</strong>
          </div>
          <div class="boss-run-queue-main">
            <div class="boss-run-queue-title">${renderBossRunQueueBossCell(item, candidate)}</div>
            <div class="boss-run-queue-controls">
              <label class="queue-field">
                <span>Режим</span>
                ${renderBossRunQueueModeSelect(item, candidate, index)}
              </label>
              <div class="queue-field">
                <span>Комбо</span>
                ${renderBossRunQueueComboSelect(item, candidate, index)}
              </div>
              ${soloKillControl}
              <div class="queue-field queue-status-field">
                <span>Статус</span>
                ${status}
              </div>
            </div>
          </div>
          <div class="boss-queue-row-actions">
            <button class="action-button action-button-mini action-button-ghost js-boss-run-move" type="button" data-index="${escapeHtml(String(index))}" data-direction="-1" ${index === 0 ? "disabled" : ""} aria-label="Переместить вверх" title="Переместить вверх">↑</button>
            <button class="action-button action-button-mini action-button-ghost js-boss-run-move" type="button" data-index="${escapeHtml(String(index))}" data-direction="1" ${index === state.bossRunQueue.length - 1 ? "disabled" : ""} aria-label="Переместить вниз" title="Переместить вниз">↓</button>
            <button
              class="action-button action-button-mini action-button-ghost js-boss-run-remove"
              type="button"
              data-index="${escapeHtml(String(index))}"
              aria-label="Удалить ${escapeHtml(label)} из очереди"
              title="Удалить из очереди"
            >×</button>
          </div>
        </article>
    `;
  }).join("");
  replaceHtmlUnlessSelectFocused(target, queueRows || `
    <div class="boss-run-queue-empty" role="listitem">
      Очередь пуста — добавьте выбранного босса или соберите доступных автоматически.
    </div>
  `);

    renderStatGrid($("#boss-run-queue-summary"), [
      { label: "В очереди", value: formatNumber(state.bossRunQueue.length) },
      { label: "Суммарное HP", value: formatBossCompactNumber(totalQueuedHp) },
      { label: "Можно победить", value: formatNumber(autoPlan.entries.length) },
      { label: "Выбрано", value: formatNumber(selectedIds.size) },
      { label: "Охват автосбора", value: "выбранные боссы" },
    ]);
  const note = $("#boss-run-queue-note");
  if (note) {
    const modeCount = autoPlan.modeOverrides instanceof Map ? autoPlan.modeOverrides.size : 0;
    note.textContent = autoPlan.smartCollectionEnabled
      ? `Подбор по коллекции включён · приоритетных режимов: ${formatNumber(autoPlan.smartPreferredCount)}.`
      : `Автосбор идёт только по выбранным боссам и учитывает ключи · выбрано: ${formatNumber(selectedIds.size)}${modeCount > 0 ? ` · настроено режимов: ${formatNumber(modeCount)}` : ""}.`;
  }
  updateBossRunQueueExcludeSummary(selectedIds, autoPlan.modeOverrides);
  updateBossAutoStatus();
}

function buildBossRunQueueEntry() {
  const selectedId = Number($("#boss-select").value || 0);
  if (!selectedId) {
    return null;
  }
  const map = getBossQueueCandidateMap();
  const candidate = map.get(selectedId) || null;
  const modeInput = ($("#boss-mode").value || "").trim();
  const comboModeInput = ($("#boss-combo-mode") && $("#boss-combo-mode").value
    ? $("#boss-combo-mode").value
    : "").trim();
  const preferredTemplateComboMode = getPreferredBossComboTemplateMode(candidate);
  const bundle = getCandidateQueueModeBundle(
    candidate,
    modeInput,
    comboModeInput || preferredTemplateComboMode,
  );
  const mode = modeInput || null;
  const comboMode = comboModeInput || preferredTemplateComboMode || (bundle ? bundle.comboMode : "") || "";
  const label = candidate ? `#${candidate.id} ${candidate.title}` : `#${selectedId}`;
  let entry = ensureBossRunQueueItemId(withBossRunQueueHitTypes({
    bossId: selectedId,
    mode,
    comboMode,
    label,
    autoKillSolo: $("#boss-auto-kill-solo")?.checked !== false,
    skipCombo: $("#boss-use-combo")?.checked === false,
  }));
  const zarubaTask = getActiveZarubaBossTasks()
    .find((task) => Number(task.targetId || 0) === selectedId) || null;
  if (zarubaTask) {
    entry = decorateBossRunQueueEntryWithZarubaTask(entry, zarubaTask, candidate);
  }
  return entry;
}

function shouldOfferBossComboSetup(entry, candidate) {
  if (entry?.skipCombo === true) return false;
  const comboMode = normalizeBossComboMode(entry && entry.comboMode);
  const availableComboModes = resolveBossComboModes(candidate)
    .map((mode) => normalizeBossComboMode(mode))
    .filter(Boolean);
  return (
    Boolean(comboMode)
    && availableComboModes.includes(comboMode)
    && !hasBossComboTemplate(entry && entry.bossId, comboMode)
  );
}

function offerBossComboSetup(entry, candidate) {
  if (!shouldOfferBossComboSetup(entry, candidate)) {
    return false;
  }

  const title = candidate && candidate.title ? candidate.title : entry.label || `#${entry.bossId}`;
  const comboMode = normalizeBossComboMode(entry.comboMode);
  const shouldOpenDialog = window.confirm(
    `${title}: ввести комбо ${formatComboModeLabel(comboMode)} перед добавлением или стартом этого босса?`,
  );
  if (!shouldOpenDialog) {
    return false;
  }

  syncMainBossSelectors(entry.bossId, comboMode);
  openBossComboDialog({
    preferredBossId: entry.bossId,
    preferredMode: comboMode,
    forcePreferred: true,
  });
  setBossComboDialogNote(
    `Введите и сохраните комбо для ${title}, затем снова добавьте или запустите этого босса.`,
  );
  appendLog("Boss combo setup requested", `${title} / ${comboMode}`);
  return true;
}

function getBossComboSetupPromptTargets(entries, candidates = getBossQueueCandidateMap()) {
  const candidateMap = candidates instanceof Map
    ? candidates
    : new Map(
      (Array.isArray(candidates) ? candidates : [])
        .map((candidate) => [Number(candidate && candidate.id || 0), candidate])
        .filter(([bossId, candidate]) => Number.isFinite(bossId) && bossId > 0 && candidate),
    );
  const seenBossIds = new Set();
  const targets = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (entry?.skipCombo === true) continue;
    const bossId = Number(entry && entry.bossId || 0);
    if (!Number.isFinite(bossId) || bossId <= 0 || seenBossIds.has(bossId)) {
      continue;
    }
    seenBossIds.add(bossId);
    const candidate = candidateMap.get(bossId) || null;
    const comboModes = resolveBossComboModes(candidate)
      .map((mode) => normalizeBossComboMode(mode))
      .filter(Boolean);
    if (comboModes.length === 0 || comboModes.some((mode) => hasBossComboTemplate(bossId, mode))) {
      continue;
    }
    targets.push({ entry, candidate, comboModes });
  }
  return targets;
}

function confirmBossComboSetupOffer(target, index, total) {
  const dialog = $("#boss-combo-offer-dialog");
  const context = $("#boss-combo-offer-context");
  const configureButton = $("#boss-combo-offer-configure");
  const skipButton = $("#boss-combo-offer-skip");
  const skipAllButton = $("#boss-combo-offer-skip-all");
  const title = target && target.candidate && target.candidate.title
    ? `#${target.candidate.id} ${target.candidate.title}`
    : target && target.entry && target.entry.label
      ? target.entry.label
      : "Boss";
  const preferredMode = target && target.entry ? normalizeBossComboMode(target.entry.comboMode) : "";
  const message = `${title} будет добавлен в очередь. Ввести комбо${preferredMode ? ` (${formatComboModeLabel(preferredMode)})` : ""}? ${index + 1}/${total}`;

  if (!dialog || !context || !configureButton || !skipButton || !skipAllButton) {
    return Promise.resolve(window.confirm(message) ? "configure" : "skip");
  }

  context.textContent = message;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (choice) => {
      if (settled) {
        return;
      }
      settled = true;
      configureButton.removeEventListener("click", onConfigure);
      skipButton.removeEventListener("click", onSkip);
      skipAllButton.removeEventListener("click", onSkipAll);
      dialog.removeEventListener("cancel", onCancel);
      if (dialog.open) {
        if (typeof dialog.close === "function") {
          dialog.close();
        } else {
          dialog.removeAttribute("open");
        }
      }
      resolve(choice);
    };
    const onConfigure = () => finish("configure");
    const onSkip = () => finish("skip");
    const onSkipAll = () => finish("skip-all");
    const onCancel = (event) => {
      event.preventDefault();
      finish("skip");
    };
    configureButton.addEventListener("click", onConfigure);
    skipButton.addEventListener("click", onSkip);
    skipAllButton.addEventListener("click", onSkipAll);
    dialog.addEventListener("cancel", onCancel);
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "open");
    }
  });
}

function waitForBossComboDialogClose() {
  const dialog = $("#boss-combo-dialog");
  if (!dialog || !dialog.open) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    dialog.addEventListener("close", resolve, { once: true });
  });
}

async function offerBossComboSetupForQueue(entries, candidates) {
  const targets = getBossComboSetupPromptTargets(entries, candidates);
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const choice = await confirmBossComboSetupOffer(target, index, targets.length);
    if (choice === "skip-all") {
      break;
    }
    if (choice !== "configure") {
      continue;
    }
    const preferredMode = normalizeBossComboMode(target.entry.comboMode) || target.comboModes[0] || "";
    openBossComboDialog({
      preferredBossId: target.entry.bossId,
      preferredMode,
      forcePreferred: true,
      applyToMainSelection: false,
    });
    setBossComboDialogNote(
      `Сохраните одно или несколько комбо для ${target.entry.label || `#${target.entry.bossId}`}, затем закройте редактор для продолжения формирования очереди.`,
    );
    await waitForBossComboDialogClose();
  }
}

function buildBossTypesFromQueue() {
  const types = [];
  for (const item of state.bossQueue) {
    const count = Math.max(1, Number(item.count) || 1);
    for (let index = 0; index < count; index += 1) {
      types.push(item.key);
    }
  }
  return types.join(",");
}

function syncBossAttackPlanButton() {
  const button = $("#boss-attack-plan-open-btn");
  const badge = $("#boss-attack-plan-count");
  const totalHits = state.bossQueue.reduce(
    (total, item) => total + Math.max(1, Number(item.count) || 1),
    0,
  );
  if (button) {
    button.dataset.hasPlan = String(totalHits > 0);
    button.title = totalHits > 0
      ? `Открыть очередь ударов · ударов: ${formatNumber(totalHits)}`
      : "Открыть очередь ударов";
  }
  if (badge) {
    badge.textContent = totalHits > 99 ? "99+" : String(totalHits);
    badge.hidden = totalHits === 0;
  }
}

function openBossAttackPlanDialog() {
  const dialog = $("#boss-attack-plan-dialog");
  const button = $("#boss-attack-plan-open-btn");
  if (!dialog) {
    return;
  }
  renderBossAttackQueue();
  if (!dialog.open) {
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "open");
    }
  }
  if (button) {
    button.setAttribute("aria-expanded", "true");
  }
  const select = $("#boss-attack-select");
  if (select) {
    window.setTimeout(() => select.focus(), 0);
  }
}

function closeBossAttackPlanDialog() {
  const dialog = $("#boss-attack-plan-dialog");
  const button = $("#boss-attack-plan-open-btn");
  if (!dialog) {
    return;
  }
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
  if (button) {
    button.setAttribute("aria-expanded", "false");
    button.focus({ preventScroll: true });
  }
}

function renderBossAttackQueue() {
  syncBossAttackPlanButton();
  const target = $("#boss-attack-body");
  if (!target) {
    return;
  }
  const actions = state.bossDashboard ? state.bossDashboard.actions || [] : [];
  const actionMap = new Map(actions.map((action) => [action.key, action]));
  const usage = {
    punchChest: 0,
    kickBalls: 0,
    pokeEyes: 0,
    kneeEar: 0,
    poison: 0,
    gunshot: 0,
    knife: 0,
  };
  let totalDamage = 0;

  target.innerHTML = state.bossQueue.length > 0 ? state.bossQueue.map((item, index) => {
    const action = actionMap.get(item.key);
    const label = action ? action.label : item.key;
    const count = Math.max(1, Number(item.count) || 1);
    const cost = action && action.hasCharges ? count : 0;
    const damage = action && action.damage !== null && action.damage !== undefined
      ? Number(action.damage) * count
      : null;
    const queueKey = action ? action.key : item.key;

    if (usage[queueKey] !== undefined) {
      usage[queueKey] += count;
    }
    if (damage !== null) {
      totalDamage += damage;
    }

    return `
      <tr>
        <td>${escapeHtml(index + 1)}</td>
        <td>${escapeHtml(label)}</td>
        <td>${escapeHtml(count)}</td>
        <td>${escapeHtml(cost ? `${cost} ${action.key}` : "-")}</td>
        <td>${escapeHtml(damage !== null ? formatNumber(damage) : "-")}</td>
        <td><button class="row-remove-button" type="button" data-boss-attack-remove="${escapeHtml(index)}" aria-label="Удалить ${escapeHtml(label)} из очереди">×</button></td>
      </tr>
    `;
  }).join("") : `
    <tr class="boss-attack-empty">
      <td colspan="6">Очередь пока пуста. Добавьте удар или загрузите сохранённое комбо.</td>
    </tr>
  `;

  const available = state.bossDashboard && state.bossDashboard.activeSession
    && state.bossDashboard.activeSession.weaponStatsEffective
    ? state.bossDashboard.activeSession.weaponStatsEffective.counts || {}
    : {};
  const prices = getBossPriceConfig();
  const rublesNow = state.economy && state.economy.currencies
    ? Number(state.economy.currencies.rubles || 0)
    : 0;

  function computeRubles(multiplier) {
    const needed = {
      poison: (usage.poison || 0) * multiplier,
      gunshot: (usage.gunshot || 0) * multiplier,
      knife: (usage.knife || 0) * multiplier,
    };
    const missing = {
      poison: Math.max(0, needed.poison - Number(available.poison || 0)),
      gunshot: Math.max(0, needed.gunshot - Number(available.gunshot || 0)),
      knife: Math.max(0, needed.knife - Number(available.knife || 0)),
    };
    const buyRubles = missing.poison * prices.poison
      + missing.gunshot * prices.gunshot
      + missing.knife * prices.knife;
    const restores = Math.max(0, (usage.punchChest || 0) * multiplier - 1)
      + Math.max(0, (usage.kickBalls || 0) * multiplier - 1)
      + Math.max(0, (usage.pokeEyes || 0) * multiplier - 1)
      + Math.max(0, (usage.kneeEar || 0) * multiplier - 1);
    const restoreRubles = restores * prices.restoreMelee;

    return {
      needed,
      missing,
      restores,
      buyRubles,
      restoreRubles,
      totalRubles: buyRubles + restoreRubles,
    };
  }

  const rublesSingleCycle = computeRubles(1);

  renderStatGrid($("#boss-attack-summary"), [
    { label: "Позиций в очереди", value: formatNumber(state.bossQueue.length) },
    { label: "Ожидаемый урон", value: totalDamage ? formatNumber(totalDamage) : "-" },
  ]);
  renderStatGrid($("#boss-cost-summary"), [
    { label: "Рублей сейчас", value: formatNumber(rublesNow) },
    { label: "Стоимость очереди", value: formatNumber(rublesSingleCycle.totalRubles) },
  ]);

  const typesInput = $("#boss-types");
  if (typesInput) {
    typesInput.value = state.bossQueue.length > 0 ? buildBossTypesFromQueue() : "";
  }
}

function pickBossLiveValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "") {
      return value;
    }
  }
  return null;
}

function pickBossLiveNumber(...values) {
  const value = pickBossLiveValue(...values);
  if (value === null) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function pickBossLiveString(...values) {
  const value = pickBossLiveValue(...values);
  if (value === null) {
    return null;
  }
  const text = String(value).trim();
  return text ? text : null;
}

function buildBossFightCacheKey({ sessionId, bossId, mode, endsAt } = {}) {
  const sessionKey = pickBossLiveString(sessionId);
  const bossKey = pickBossLiveNumber(bossId);
  if (!sessionKey && bossKey === null) {
    return null;
  }

  return [
    sessionKey || `boss:${bossKey}`,
    normalizeBossComboMode(mode) || "-",
    pickBossLiveString(endsAt) || "-",
  ].join("|");
}

function syncBossFightHpCache(cacheKey, values) {
  if (!cacheKey) {
    state.bossFightHpCache = { key: null, maxHp: null };
    return null;
  }

  const candidates = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const nextMax = candidates.length > 0 ? Math.max(...candidates) : null;
  const previousMax = state.bossFightHpCache.key === cacheKey
    && Number.isFinite(Number(state.bossFightHpCache.maxHp))
    ? Number(state.bossFightHpCache.maxHp)
    : null;
  const maxHp = previousMax !== null && nextMax !== null
    ? Math.max(previousMax, nextMax)
    : previousMax !== null
      ? previousMax
      : nextMax;

  state.bossFightHpCache = { key: cacheKey, maxHp };
  return maxHp;
}

function clearBossFightRuntimeState(options = {}) {
  state.bossFightHpCache = { key: null, maxHp: null };
  state.bossFightMeta = {
    bossId: null,
    mode: null,
    sessionId: null,
    endsAt: null,
    comboMode: null,
    comboSuccess: null,
    comboCostRubles: null,
  };
}

function isBossFightMetaMatch(meta, context) {
  if (!meta || !meta.comboMode || !context) {
    return false;
  }

  const metaBossId = pickBossLiveNumber(meta.bossId);
  const contextBossId = pickBossLiveNumber(context.bossId);
  if (metaBossId !== null && contextBossId !== null && metaBossId !== contextBossId) {
    return false;
  }

  const metaMode = normalizeBossComboMode(meta.mode);
  const contextMode = normalizeBossComboMode(context.mode);
  if (metaMode && contextMode && metaMode !== contextMode) {
    return false;
  }

  const metaSessionId = pickBossLiveString(meta.sessionId);
  const contextSessionId = pickBossLiveString(context.sessionId);
  if (metaSessionId && contextSessionId && metaSessionId !== contextSessionId) {
    return false;
  }

  const metaEndsAt = pickBossLiveString(meta.endsAt);
  const contextEndsAt = pickBossLiveString(context.endsAt);
  if (metaEndsAt && contextEndsAt && metaEndsAt !== contextEndsAt) {
    return false;
  }

  return true;
}

function rememberBossFightMeta(options = {}) {
  const comboMode = normalizeBossComboMode(options.comboMode);
  if (!comboMode) {
    return;
  }

  const bossId = pickBossLiveNumber(options.bossId);
  const mode = pickBossLiveString(options.mode);
  state.bossFightMeta = {
    bossId,
    mode,
    sessionId: pickBossLiveString(options.sessionId),
    endsAt: pickBossLiveString(options.endsAt),
    comboMode,
    comboSuccess: typeof options.comboSuccess === "boolean" ? options.comboSuccess : null,
    comboCostRubles: Number.isFinite(Number(options.comboCostRubles))
      ? Math.max(0, Number(options.comboCostRubles))
      : null,
  };
}

function updateBossFightComboSuccess(options = {}) {
  const comboMode = normalizeBossComboMode(options.comboMode || state.bossFightMeta.comboMode);
  const comboSuccess = typeof options.comboSuccess === "boolean" ? options.comboSuccess : null;
  if (!comboMode || comboSuccess === null) {
    return;
  }

  if (state.bossFightMeta.comboMode && !isBossFightMetaMatch(state.bossFightMeta, options)) {
    return;
  }

  rememberBossFightMeta({
    ...state.bossFightMeta,
    ...options,
    comboMode,
    comboSuccess,
    comboCostRubles: Number.isFinite(Number(options.comboCostRubles))
      ? Number(options.comboCostRubles)
      : state.bossFightMeta.comboCostRubles,
  });
}

function resolveBossFightComboMode(context) {
  const summary = context.summary || {};
  const activeSession = context.activeSession || null;
  const directComboMode = pickBossLiveString(
    summary.comboMode,
    summary.selectedComboMode,
    activeSession ? activeSession.comboMode : null,
  );
  if (directComboMode) {
    return normalizeBossComboMode(directComboMode);
  }

  return isBossFightMetaMatch(state.bossFightMeta, context)
    ? state.bossFightMeta.comboMode
    : null;
}

function resolveBossFightComboSuccess(context) {
  const summary = context.summary || {};
  if (typeof summary.comboSuccess === "boolean") {
    return summary.comboSuccess;
  }
  if (typeof summary.comboCompleted === "boolean") {
    return summary.comboCompleted;
  }
  if (typeof summary.comboPassed === "boolean") {
    return summary.comboPassed;
  }

  return isBossFightMetaMatch(state.bossFightMeta, context)
    && typeof state.bossFightMeta.comboSuccess === "boolean"
    ? state.bossFightMeta.comboSuccess
    : null;
}

function formatBossHpValue(currentHp, maxHp, compact = true) {
  const format = compact ? formatBossCompactNumber : formatNumber;
  const hpValue = Number.isFinite(Number(currentHp)) ? Math.max(0, Number(currentHp)) : null;
  const hpMax = Number.isFinite(Number(maxHp)) && Number(maxHp) > 0 ? Number(maxHp) : null;
  if (hpValue === null) {
    return "-";
  }

  return hpMax ? `${format(hpValue)} / ${format(hpMax)}` : format(hpValue);
}

function formatBossComboSuccess(value) {
  if (value === true) {
    return "да";
  }
  if (value === false) {
    return "нет";
  }
  return "ожидание";
}

function isBossSummarySameFightAsSession(summary, session) {
  if (!summary || !session) {
    return false;
  }

  const summarySessionId = pickBossLiveString(summary.sessionId);
  const sessionSessionId = pickBossLiveString(session.sessionId);
  if (summarySessionId && sessionSessionId) {
    return summarySessionId === sessionSessionId;
  }

  const summaryBossId = pickBossLiveNumber(summary.bossId);
  const sessionBossId = pickBossLiveNumber(session.bossId);
  if (summaryBossId !== null && sessionBossId !== null && summaryBossId !== sessionBossId) {
    return false;
  }

  const summaryEndsAt = pickBossLiveString(summary.endsAt);
  const sessionEndsAt = pickBossLiveString(session.endsAt);
  if (summaryEndsAt && sessionEndsAt && summaryEndsAt !== sessionEndsAt) {
    return false;
  }

  return summaryBossId !== null && sessionBossId !== null && summaryBossId === sessionBossId
    || Boolean(summaryEndsAt && sessionEndsAt && summaryEndsAt === sessionEndsAt);
}

function resolveBossLiveContext() {
  const snapshotSummary = state.bossState && state.bossState.snapshot && state.bossState.snapshot.summary
    ? state.bossState.snapshot.summary
    : null;
  const dashboardActive = state.bossDashboard && state.bossDashboard.activeSession
    ? state.bossDashboard.activeSession
    : null;
  const dashboardSession = dashboardActive
    ? dashboardActive.session || null
    : null;
  const snapshotSessionEnded = Boolean(
    snapshotSummary
    && (
      snapshotSummary.isCompleted === true
      || (
        snapshotSummary.currentHp !== null
        && snapshotSummary.currentHp !== undefined
        && Number(snapshotSummary.currentHp) <= 0
      )
      || snapshotSummary.rewardReady === true
      || snapshotSummary.hasReward === true
    ),
  );
  const snapshotHasSession = Boolean(
    snapshotSummary
    && !snapshotSessionEnded
    && (
      snapshotSummary.hasSession === true
      || snapshotSummary.sessionId
      || (
        snapshotSummary.bossId !== null
        && snapshotSummary.bossId !== undefined
        && snapshotSummary.currentHp !== null
        && snapshotSummary.currentHp !== undefined
      )
    ),
  );
  const snapshotSession = snapshotHasSession
    ? {
        sessionId: snapshotSummary.sessionId ?? null,
        bossId: snapshotSummary.bossId ?? null,
        mode: snapshotSummary.mode ?? null,
        currentHp: snapshotSummary.currentHp ?? null,
        baseHp: snapshotSummary.baseHp ?? null,
        maxHp: snapshotSummary.maxHp ?? null,
        personalDamage: snapshotSummary.personalDamage ?? null,
        isCompleted: Boolean(snapshotSummary.isCompleted),
        rewardClaimed: Boolean(snapshotSummary.rewardClaimed),
        endsAt: snapshotSummary.endsAt ?? null,
        title: snapshotSummary.title ?? null,
      }
    : null;
  // A plain `hasSession: false` response can arrive after a newer dashboard
  // response when a browser tab resumes from the background.  It must not hide
  // a concrete active session.  Explicit completion/reward state still wins,
  // but only when it describes the same fight rather than the previous fight.
  const snapshotExplicitlyEndsDashboard = Boolean(
    snapshotSessionEnded
    && (
      !dashboardSession
      || isBossSummarySameFightAsSession(snapshotSummary, dashboardSession)
    ),
  );
  const activeSession = snapshotSession || (snapshotExplicitlyEndsDashboard ? null : dashboardSession);
  const activeBossId = pickBossLiveNumber(
    activeSession ? activeSession.bossId : null,
    snapshotHasSession && snapshotSummary ? snapshotSummary.bossId : null,
    dashboardActive && dashboardActive.activeBoss ? dashboardActive.activeBoss.id : null,
  );
  const catalogBoss = activeBossId !== null
    ? getBossQueueCandidateMap().get(Number(activeBossId)) || null
    : null;
  const dashboardBoss = dashboardActive && dashboardActive.activeBoss
    ? dashboardActive.activeBoss
    : null;
  const snapshotMatchesActiveBoss = Boolean(
    snapshotHasSession
    && snapshotSummary
    && (
      pickBossLiveNumber(snapshotSummary.bossId) === null
      || pickBossLiveNumber(snapshotSummary.bossId) === activeBossId
    ),
  );
  const dashboardMatchesActiveBoss = Boolean(
    dashboardBoss
    && (
      pickBossLiveNumber(dashboardBoss.id) === null
      || pickBossLiveNumber(dashboardBoss.id) === activeBossId
    ),
  );
  const snapshotBoss = snapshotHasSession || activeBossId !== null
    ? {
        id: activeBossId,
        title: pickBossLiveString(
          snapshotMatchesActiveBoss ? snapshotSummary.title : null,
          activeSession ? activeSession.title : null,
          dashboardMatchesActiveBoss ? dashboardBoss.title : null,
          catalogBoss ? catalogBoss.title : null,
        ),
        baseHp: pickBossLiveNumber(
          snapshotMatchesActiveBoss ? snapshotSummary.baseHp : null,
          activeSession ? activeSession.baseHp : null,
          dashboardMatchesActiveBoss ? dashboardBoss.baseHp : null,
          catalogBoss ? catalogBoss.baseHp : null,
        ),
      }
    : null;
  const activeBoss = snapshotBoss || dashboardBoss || catalogBoss || null;
  const summary = snapshotHasSession
    ? snapshotSummary
    : activeSession || snapshotSummary || {};
  const currentHp = summary.currentHp !== null && summary.currentHp !== undefined
    ? Number(summary.currentHp)
    : null;
  const baseHp = summary.baseHp !== null && summary.baseHp !== undefined
    ? Number(summary.baseHp)
    : activeSession && activeSession.baseHp !== null && activeSession.baseHp !== undefined
      ? Number(activeSession.baseHp)
    : activeBoss && activeBoss.baseHp !== null && activeBoss.baseHp !== undefined
      ? Number(activeBoss.baseHp)
      : null;
  const mode = pickBossLiveString(
    summary.mode,
    activeSession ? activeSession.mode : null,
    dashboardSession ? dashboardSession.mode : null,
    catalogBoss ? catalogBoss.selectedMode : null,
  );
  const explicitMaxHp = summary.maxHp !== null && summary.maxHp !== undefined
    ? Number(summary.maxHp)
    : activeSession && activeSession.maxHp !== null && activeSession.maxHp !== undefined
      ? Number(activeSession.maxHp)
      : null;
  const computedMaxHp = resolveBossModeHp(baseHp, mode);
  const endsAt = pickBossLiveString(
    summary.endsAt,
    activeSession ? activeSession.endsAt : null,
  );
  const sessionId = pickBossLiveString(
    summary.sessionId,
    activeSession ? activeSession.sessionId : null,
  );
  const fightKey = buildBossFightCacheKey({
    sessionId,
    bossId: activeBossId,
    mode,
    endsAt,
  });
  const maxHp = activeSession
    ? syncBossFightHpCache(fightKey, [explicitMaxHp, computedMaxHp, currentHp])
    : null;
  const personalDamage = summary.personalDamage !== null && summary.personalDamage !== undefined
    ? Number(summary.personalDamage)
    : activeSession && activeSession.personalDamage !== null && activeSession.personalDamage !== undefined
      ? Number(activeSession.personalDamage)
      : null;
  const comboContext = {
    summary,
    activeSession,
    bossId: activeBossId,
    mode,
    sessionId,
    endsAt,
  };
  const comboMode = activeSession ? resolveBossFightComboMode(comboContext) : null;
  const comboSuccess = comboMode ? resolveBossFightComboSuccess(comboContext) : null;
  const comboCostRubles = comboMode
    && isBossFightMetaMatch(state.bossFightMeta, comboContext)
    && Number.isFinite(Number(state.bossFightMeta.comboCostRubles))
    ? Math.max(0, Number(state.bossFightMeta.comboCostRubles))
    : null;

  if (!activeSession) {
    clearBossFightRuntimeState();
  }

  return {
    summary,
    activeSession,
    activeBoss,
    mode,
    sessionId,
    endsAt,
    fightKey,
    currentHp: Number.isFinite(currentHp) ? currentHp : null,
    maxHp: Number.isFinite(maxHp) ? maxHp : null,
    personalDamage: Number.isFinite(personalDamage) ? personalDamage : null,
    comboMode,
    comboSuccess,
    comboCostRubles,
  };
}

function resolveBossNeedleActionState(context = resolveBossLiveContext()) {
  const vpi = state.headerExtras && state.headerExtras.vpi;
  const damageLeft = Math.max(0, Number(vpi && vpi.damageLeft) || 0);
  if (state.bossNeedleRunning) {
    return {
      enabled: false,
      state: "running",
      damageLeft,
      meta: "Пробиваем урон…",
      tooltip: "удар Иглы выполняется",
    };
  }
  if (!vpi || typeof vpi !== "object") {
    return {
      enabled: false,
      state: "loading",
      damageLeft: 0,
      meta: "Проверяем общак…",
      tooltip: "общак ещё не проверен",
    };
  }
  if (vpi.active !== true) {
    return {
      enabled: false,
      state: "unavailable",
      damageLeft: 0,
      meta: "Общак не куплен",
      tooltip: "нет общака",
    };
  }
  if (!context || !context.activeSession) {
    return {
      enabled: false,
      state: "unavailable",
      damageLeft,
      meta: `Доступно ${formatBossCompactNumber(damageLeft)} · нужен активный бой`,
      tooltip: "нет активного боя",
    };
  }
  if (damageLeft <= 0) {
    return {
      enabled: false,
      state: "unavailable",
      damageLeft: 0,
      meta: "Урон на сегодня закончился",
      tooltip: "урон Иглы на сегодня закончился",
    };
  }
  return {
    enabled: true,
    state: "ready",
    damageLeft,
    meta: `Доступно сегодня: ${formatBossCompactNumber(damageLeft)}`,
    tooltip: "",
  };
}

function renderBossNeedleAction(context = resolveBossLiveContext()) {
  const panel = $("#boss-needle-action");
  const icon = panel && panel.querySelector(".boss-needle-icon");
  const meta = $("#boss-needle-meta");
  const wrapper = $("#boss-needle-button-wrap");
  const button = $("#boss-needle-btn");
  if (!panel || !meta || !wrapper || !button) {
    return;
  }

  const action = resolveBossNeedleActionState(context);
  panel.dataset.state = action.state;
  if (icon) {
    icon.src = VPI_NEEDLE_ICON_URL;
  }
  setTextIfChanged(meta, action.meta);
  button.disabled = !action.enabled;
  setTextIfChanged(button, state.bossNeedleRunning ? "Пробиваем…" : "Пробить урон");
  button.setAttribute(
    "aria-label",
    action.enabled
      ? `Пробить ${formatNumber(action.damageLeft)} урона Иглой`
      : action.tooltip,
  );
  if (action.tooltip) {
    wrapper.dataset.tooltip = action.tooltip;
    wrapper.title = action.tooltip;
  } else {
    wrapper.removeAttribute("data-tooltip");
    wrapper.removeAttribute("title");
  }
}

function renderBossFightBars() {
  const target = $("#boss-fight-bars");
  if (!target) {
    return;
  }

  const context = resolveBossLiveContext();
  renderBossSurrenderButton(context);
  renderBossActiveAvatar(context);
  renderBossNeedleAction(context);
  if (!context.activeSession) {
    target.innerHTML = `
      <div class="fight-bar-card is-empty">
        <div class="fight-bar-head">
          <span class="fight-bar-label">Бой</span>
          <strong class="fight-bar-value">Нет активного боя</strong>
        </div>
        <div class="fight-bar-meta">Обновите панель или запустите босса, чтобы увидеть здоровье и нанесённый урон.</div>
      </div>
    `;
    return;
  }

  const hpMax = Number.isFinite(context.maxHp) && context.maxHp > 0 ? context.maxHp : null;
  const hpValue = Number.isFinite(context.currentHp) ? Math.max(0, context.currentHp) : null;
  const personalDamage = Number.isFinite(context.personalDamage) ? Math.max(0, context.personalDamage) : null;
  const hpPercent = hpMax && hpValue !== null ? Math.max(0, Math.min(100, (hpValue / hpMax) * 100)) : 0;
  const damagePercent = hpMax && personalDamage !== null ? Math.max(0, Math.min(100, (personalDamage / hpMax) * 100)) : 0;
  const hpCompact = formatBossHpValue(hpValue, hpMax, true);
  const hpFull = formatBossHpValue(hpValue, hpMax, false);
  const damageCompact = personalDamage === null ? "-" : formatBossCompactNumber(personalDamage);
  const damageFull = personalDamage === null ? "-" : formatNumber(personalDamage);

  target.innerHTML = `
    <div class="fight-bar-card">
      <div class="fight-bar-head">
        <span class="fight-bar-label">HP</span>
        <strong class="fight-bar-value" title="${escapeHtml(hpFull)}">${escapeHtml(hpCompact)}</strong>
      </div>
      <div class="fight-bar-track">
        <span class="fight-bar-fill fight-bar-fill-hp" style="width: ${hpPercent.toFixed(2)}%;"></span>
      </div>
      <div class="fight-bar-meta">${escapeHtml(hpFull)}</div>
    </div>
    <div class="fight-bar-card">
      <div class="fight-bar-head">
        <span class="fight-bar-label">Мой урон</span>
        <strong class="fight-bar-value" title="${escapeHtml(damageFull)}">${escapeHtml(damageCompact)}</strong>
      </div>
      <div class="fight-bar-track">
        <span class="fight-bar-fill fight-bar-fill-damage" style="width: ${damagePercent.toFixed(2)}%;"></span>
      </div>
      <div class="fight-bar-meta">${escapeHtml(damageFull)}${hpMax ? ` of ${escapeHtml(formatNumber(hpMax))}` : ""}</div>
    </div>
  `;
}

async function handleBossNeedleHit() {
  if (state.bossNeedleRunning) {
    return;
  }

  const context = resolveBossLiveContext();
  const action = resolveBossNeedleActionState(context);
  if (!action.enabled) {
    renderBossNeedleAction(context);
    return;
  }

  const bossId = pickBossLiveNumber(
    context.activeSession && context.activeSession.bossId,
    context.activeBoss && context.activeBoss.id,
    context.summary && context.summary.bossId,
  );
  state.bossNeedleRunning = true;
  renderBossNeedleAction(context);
  setServerStatus("удар Иглы", "busy");
  try {
    const payload = await apiRequest("POST", "/api/bosses/needle", {
      bossId: bossId || undefined,
      sessionId: context.sessionId || undefined,
      amount: action.damageLeft,
    });
    if (payload.vpi) {
      state.headerExtras = {
        ...(state.headerExtras || {}),
        vpi: payload.vpi,
      };
      renderHeaderVpi(payload.vpi);
    }
    if (payload.finalSnapshot) {
      state.bossState = { snapshot: payload.finalSnapshot };
    }
    renderBossFightBars();
    renderBossLiveSummary();
    await Promise.all([
      handleBossDashboard({ fast: true, silent: true, showStatus: false }),
      handleBossStateRefresh({ silent: true, showStatus: false }),
      handleHeaderExtrasRefresh({ force: true }),
    ]);
    appendLog(
      "Игла пробил урон",
      `${formatNumber(payload.actualSpent || action.damageLeft)} · босс #${formatNumber(payload.bossId || bossId || 0)}`,
    );
    setServerStatus("готово", "ok");
  } catch (error) {
    appendLog("Ошибка удара Иглы", error.message || "неизвестная ошибка");
    setServerStatus("ошибка Иглы", "error");
    appendDiagnosticError("bosses", error);
  } finally {
    state.bossNeedleRunning = false;
    renderBossNeedleAction();
  }
}

function renderBossSurrenderButton(context = resolveBossLiveContext()) {
  const button = $("#boss-surrender-btn");
  if (!button) {
    return;
  }
  const hasActiveFight = Boolean(context && context.activeSession);
  button.hidden = !hasActiveFight;
  button.disabled = !hasActiveFight || state.bossSurrenderRunning;
  button.textContent = state.bossSurrenderRunning
    ? "Выходим…"
    : "Выйти из боя · 2 мыла";
}

function runDialogConfirmation({ dialog, confirmButton, cancelButton }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (confirmed) => {
      if (settled) {
        return;
      }
      settled = true;
      confirmButton.removeEventListener("click", handleConfirm);
      cancelButton.removeEventListener("click", handleCancel);
      dialog.removeEventListener("cancel", handleCancel);
      if (dialog.open && typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
      resolve(Boolean(confirmed));
    };
    const handleConfirm = () => finish(true);
    const handleCancel = (event) => {
      event?.preventDefault?.();
      finish(false);
    };
    confirmButton.addEventListener("click", handleConfirm);
    cancelButton.addEventListener("click", handleCancel);
    dialog.addEventListener("cancel", handleCancel);
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "open");
    }
  });
}

function confirmBossSurrender(context = resolveBossLiveContext()) {
  const dialog = $("#boss-surrender-dialog");
  const confirmButton = $("#boss-surrender-confirm");
  const cancelButton = $("#boss-surrender-cancel");
  const contextNode = $("#boss-surrender-context");
  const bossTitle = context && context.activeBoss && context.activeBoss.title
    ? context.activeBoss.title
    : context && context.activeSession && context.activeSession.bossId
      ? `Босс #${context.activeSession.bossId}`
      : "Текущий бой";
  const message = `Бой с «${bossTitle}» завершится досрочно, а игра спишет 2 мыла. Это действие нельзя отменить.`;

  if (!dialog || !confirmButton || !cancelButton) {
    return Promise.resolve(window.confirm(`${message}\n\nВыйти из боя?`));
  }
  if (contextNode) {
    contextNode.textContent = message;
  }

  return runDialogConfirmation({ dialog, confirmButton, cancelButton });
}

async function handleBossSurrender() {
  if (state.bossSurrenderRunning) {
    return;
  }

  const context = resolveBossLiveContext();
  if (!context.activeSession) {
    renderBossSurrenderButton(context);
    return;
  }
  if (!await confirmBossSurrender(context)) {
    return;
  }

  const bossId = pickBossLiveNumber(
    context.activeSession.bossId,
    context.activeBoss ? context.activeBoss.id : null,
    context.summary ? context.summary.bossId : null,
  );
  const bossTitle = context.activeBoss && context.activeBoss.title
    ? context.activeBoss.title
    : bossId ? `Босс #${bossId}` : "активный бой";

  state.bossSurrenderRunning = true;
  renderBossSurrenderButton(context);
  setServerStatus("выход из боя", "busy");
  try {
    const payload = await apiRequest("POST", "/api/bosses/surrender", {
      confirmed: true,
      sessionId: context.sessionId || undefined,
      bossId: bossId || undefined,
    });
    clearBossFightRuntimeState({ clearComboResult: true });
    renderBossResult(payload);
    await Promise.all([
      handleBossDashboard({ fast: true, silent: true, showStatus: false }),
      handleBossStateRefresh({ silent: true, showStatus: false }),
      handleEconomyRefresh(),
    ]);
    appendLog("Выход из боя", `${bossTitle} · списано ${formatNumber(payload.soapCost || 2)} мыла`);
    setServerStatus("готово", "ok");
  } catch (error) {
    appendLog("Ошибка выхода из боя", error.message || "неизвестная ошибка");
    setServerStatus("ошибка выхода из боя", "error");
    appendDiagnosticError("bosses", error);
  } finally {
    state.bossSurrenderRunning = false;
    renderBossSurrenderButton();
  }
}

function renderBossActiveAvatar(context = resolveBossLiveContext()) {
  const target = $("#boss-active-avatar");
  if (!target) {
    return;
  }

  const bossId = Number(
    context
    && context.activeBoss
    && context.activeBoss.id
    || context
    && context.activeSession
    && context.activeSession.bossId,
  );
  if (!context || !context.activeSession || !Number.isInteger(bossId) || bossId <= 0) {
    target.innerHTML = "";
    target.hidden = true;
    return;
  }

  const catalogBoss = getBossQueueCandidateMap().get(bossId) || {};
  const activeBoss = {
    ...catalogBoss,
    ...(context.activeBoss || {}),
    id: bossId,
  };
  const title = activeBoss.title || `Босс #${bossId}`;
  target.innerHTML = renderBossAvatar(activeBoss, {
    variant: "active",
    eager: true,
    alt: title,
    title,
  });
  target.hidden = false;
  bindBossAvatarFallbacks(target);
}

function buildBossFightDetailItems(context = resolveBossLiveContext()) {
  const hasActiveFight = Boolean(context.activeSession);
  const bossTitle = context.activeBoss && context.activeBoss.title
    ? context.activeBoss.title
    : context.activeSession && context.activeSession.bossId
      ? `#${context.activeSession.bossId}`
      : "-";
  const details = [
    { label: "Режим", value: hasActiveFight && context.mode ? formatBossModeLabel(context.mode) : "-" },
    { label: "Босс", value: hasActiveFight ? bossTitle : "-" },
    { label: "Осталось", value: hasActiveFight ? formatBossCountdownValue(context.endsAt) : "-" },
  ];

  if (hasActiveFight && context.comboMode) {
    details.push(
      { label: "Комбо", value: formatComboModeLabel(context.comboMode) },
      { label: "Пробито", value: formatBossComboSuccess(context.comboSuccess) },
    );
    if (context.comboCostRubles !== null) {
      details.push({ label: "Стоимость комбо", value: `${formatNumber(context.comboCostRubles)} руб.` });
    }
  }

  return details;
}

function renderBossLiveSummary() {
  const context = resolveBossLiveContext();
  renderStatGrid($("#boss-summary"), buildBossFightDetailItems(context));
  const legacyTarget = $("#boss-live-summary");
  if (legacyTarget) {
    legacyTarget.innerHTML = "";
    legacyTarget.hidden = true;
  }
}

function renderBossDashboardSummary(payload = state.bossDashboard) {
  if (!payload) {
    return;
  }

  renderBossLiveSummary();
}

function bossRewardTypeLabel(type) {
  return type === "tattoo" ? "тату" : type === "clothing" ? "одежда" : type === "camera" ? "камера" : type;
}

function renderBossRewardItems(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="boss-reward-empty">${escapeHtml(emptyText)}</p>`;
  }
  const visible = items.slice(0, 18);
  return `
    <div class="boss-reward-items">
      ${visible.map((item) => `
        <div class="boss-reward-item ${item.owned ? "is-owned" : "is-missing"}" title="${escapeHtml(item.name || item.setName || `#${item.id}`)}">
          ${item.previewUrl ? `<img src="${escapeHtml(item.previewUrl)}" alt="">` : `<span class="boss-reward-placeholder">?</span>`}
          <span>${escapeHtml(item.name || item.setName || `#${item.id}`)}</span>
          <small>${escapeHtml(bossRewardTypeLabel(item.type))}</small>
        </div>
      `).join("")}
    </div>
    ${items.length > visible.length ? `<p class="boss-reward-more">И ещё ${escapeHtml(formatNumber(items.length - visible.length))}</p>` : ""}
  `;
}

function renderBossRewards(rewards) {
  const select = $("#boss-reward-select");
  if (!select || !rewards) {
    return;
  }
  const bosses = Array.isArray(rewards.bosses) ? rewards.bosses : [];
  const preferred = state.bossRewardBossId || Number(select.value) || Number($("#boss-select")?.value) || bosses[0]?.id;
  const selectReady = syncSelectOptions(select, bosses.map((boss) => ({
    value: String(boss.id),
    label: `#${boss.id} ${boss.title} · не собрано ${boss.missing}`,
  })));
  const selected = bosses.find((boss) => Number(boss.id) === Number(preferred)) || bosses[0] || null;
  if (!selected) {
    $("#boss-reward-grid").innerHTML = `<p class="boss-reward-empty">Нет данных о наградах.</p>`;
    return;
  }
  state.bossRewardBossId = Number(selected.id);
  if (selectReady) {
    select.value = String(selected.id);
  }
  renderStatGrid($("#boss-reward-summary"), [
    { label: "Уникально собрано", value: `${formatNumber(rewards.collected)} / ${formatNumber(rewards.total)}` },
    { label: "Всего не собрано", value: formatNumber(rewards.missing) },
    { label: selected.title, value: `${formatNumber(selected.total - selected.missing)} / ${formatNumber(selected.total)}` },
    { label: "Не хватает у босса", value: formatNumber(selected.missing) },
  ]);
  const sections = [
    ...(selected.battleModes || []).map((mode) => ({
      title: `Бой · ${formatBossModeLabel(mode.key)}`,
      ...mode,
    })),
    ...(selected.comboModes || []).map((mode) => ({
      title: `Комбо · ${formatComboModeLabel(mode.key)}`,
      ...mode,
    })),
  ];
  $("#boss-reward-grid").innerHTML = sections.map((mode) => `
    <article class="boss-reward-mode-card">
      <div class="boss-reward-mode-head">
        <strong>${escapeHtml(mode.title)}</strong>
        ${mode.missing.length === 0 ? buildBadge("всё собрано", "success") : buildBadge(`не хватает ${mode.missing.length}`, "neutral")}
      </div>
      <p>${escapeHtml(`${mode.collected} / ${mode.total} собрано`)}</p>
      ${renderBossRewardItems(mode.missing, mode.total > 0 ? "Все вещи этого режима уже собраны." : "Для режима нет вещей в каталоге.")}
      ${mode.collected > 0 ? `
        <details class="boss-collected-details">
          <summary>Показать собранные · ${escapeHtml(mode.collected)}</summary>
          ${renderBossRewardItems(mode.items.filter((item) => item.owned), "Собранных вещей нет.")}
        </details>
      ` : ""}
    </article>
  `).join("") || `<p class="boss-reward-empty">У этого босса нет привязанных комплектов.</p>`;
}

function getBossRewardBoss(bossId, rewards = state.bossDashboard && state.bossDashboard.rewards) {
  const numericBossId = Number(bossId || 0);
  const bosses = rewards && Array.isArray(rewards.bosses) ? rewards.bosses : [];
  return bosses.find((boss) => Number(boss && boss.id) === numericBossId) || null;
}

function getBossRewardMode(bossId, kind, modeKey) {
  const boss = getBossRewardBoss(bossId);
  if (!boss) {
    return null;
  }
  const source = kind === "combo" ? boss.comboModes : boss.battleModes;
  const key = String(modeKey || "").trim().toLowerCase();
  return (Array.isArray(source) ? source : []).find((mode) => (
    String(mode && mode.key || "").trim().toLowerCase() === key
  )) || null;
}

function getBossRewardMissingItems(mode) {
  if (!mode) {
    return [];
  }
  if (Array.isArray(mode.missing)) {
    return mode.missing;
  }
  return (Array.isArray(mode.items) ? mode.items : []).filter((item) => !item.owned);
}

function getBossRewardItemLabel(item) {
  if (!item) {
    return "Unknown item";
  }
  if (item.name || item.setName) {
    return item.name || item.setName;
  }
  const type = {
    tattoo: "Tattoo",
    clothing: "Clothing",
    camera: "Camera",
  }[item.type] || "Reward";
  return `${type} #${item.id || "?"}`;
}

function getBossCollectionModeLabel(kind, modeKey) {
  const prefix = kind === "combo" ? "Комбо" : "Бой";
  return `${prefix}: ${kind === "combo" ? formatComboModeLabel(modeKey) : formatBossModeLabel(modeKey)}`;
}

function formatBossMissingRewardTypeCounts(items) {
  const counts = new Map();
  const supportedTypes = new Set(["tattoo", "clothing", "camera"]);
  for (const item of Array.isArray(items) ? items : []) {
    const type = supportedTypes.has(item && item.type) ? item.type : "other";
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  const labels = {
    tattoo: "\u041d\u0430\u043a\u043e\u043b\u043a\u0438",
    clothing: "\u0412\u0435\u0449\u0438",
    camera: "\u041a\u0430\u043c\u0435\u0440\u044b",
    other: "\u0414\u0440\u0443\u0433\u043e\u0435",
  };
  return ["tattoo", "clothing", "camera", "other"]
    .filter((type) => Number(counts.get(type) || 0) > 0)
    .map((type) => `${labels[type]}: ${counts.get(type)}`)
    .join(" \u00b7 ");
}

function buildBossCollectionTooltip(mode, label) {
  if (!mode || Number(mode.total || 0) <= 0) {
    return `${label}: награды не описаны в каталоге.`;
  }
  const missing = getBossRewardMissingItems(mode);
  const collected = Number(mode.collected || 0);
  const total = Number(mode.total || 0);
  const lines = [`${label}: собрано ${collected}/${total}`];
  if (missing.length === 0) {
    lines.push("Все награды собраны.");
    return lines.join("\n");
  }
  lines.push(`\u041d\u0435 \u0441\u043e\u0431\u0440\u0430\u043d\u043e: ${formatBossMissingRewardTypeCounts(missing)}`);
  return lines.join("\n");
}

function setBossCollectionCounter(target, mode, label) {
  if (!target) {
    return;
  }
  const total = Number(mode && mode.total || 0);
  if (!mode || total <= 0) {
    target.hidden = true;
    target.textContent = "";
    target.title = "";
    target.classList.remove("is-complete", "is-missing");
    return;
  }
  const collected = Math.max(0, Number(mode.collected || 0));
  const missing = Math.max(0, total - collected);
  target.hidden = false;
  target.textContent = `${collected}/${total}`;
  target.title = buildBossCollectionTooltip(mode, label);
  target.setAttribute("aria-label", target.title);
  target.classList.toggle("is-complete", missing === 0);
  target.classList.toggle("is-missing", missing > 0);
}

function renderSelectedBossCollectionCounters() {
  const candidate = getSelectedBossCandidate();
  const bossId = candidate ? candidate.id : null;
  const battleMode = $("#boss-mode") ? $("#boss-mode").value : "";
  const comboMode = $("#boss-combo-mode") ? $("#boss-combo-mode").value : "";
  setBossCollectionCounter(
    $("#boss-mode-collection"),
    getBossRewardMode(bossId, "battle", battleMode),
    getBossCollectionModeLabel("battle", battleMode),
  );
  setBossCollectionCounter(
    $("#boss-combo-mode-collection"),
    getBossRewardMode(bossId, "combo", comboMode),
    getBossCollectionModeLabel("combo", comboMode),
  );
}

function getBossRewardModes(bossId) {
  const boss = getBossRewardBoss(bossId);
  if (!boss) {
    return [];
  }
  return [
    ...(Array.isArray(boss.battleModes) ? boss.battleModes : []).map((mode) => ({ ...mode, kind: "battle" })),
    ...(Array.isArray(boss.comboModes) ? boss.comboModes : []).map((mode) => ({ ...mode, kind: "combo" })),
  ];
}

function addBossRewardWeaponBonuses(target, bonuses) {
  for (const definition of BOSS_REWARD_BONUS_DEFINITIONS) {
    const value = definition.sourceKeys
      .map((key) => Number(bonuses && bonuses[key] || 0))
      .find((amount) => amount !== 0) || 0;
    if (value !== 0) {
      target[definition.key] = (Number(target[definition.key]) || 0) + value;
    }
  }
  return target;
}

function getBossRewardSetName(item) {
  const rawName = String(item && (item.setName || item.name) || "").trim();
  if (!rawName) {
    return "Без названия";
  }
  const compactName = rawName.match(/^Комплект\s+["«](.+)["»]\s*$/i);
  return compactName ? compactName[1].trim() : rawName;
}

function getBossRewardSetTypeLabel(type) {
  return {
    tattoo: "Наколки",
    clothing: "Одежда",
    camera: "Камеры",
  }[type] || "Награды";
}

function buildBossRewardSetGroups(items) {
  const groups = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const name = getBossRewardSetName(item);
    const type = String(item && item.type || "other");
    const key = `${type}:${String(item && item.setName || name).trim().toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        type,
        name,
        items: [],
        collected: 0,
        total: 0,
        weaponBonuses: {},
      });
    }
    const group = groups.get(key);
    group.items.push(item);
    group.total += 1;
    group.collected += item && item.owned ? 1 : 0;
    addBossRewardWeaponBonuses(group.weaponBonuses, item && item.combatStatsBonus);
  }
  return [...groups.values()].sort((left, right) => (
    left.name.localeCompare(right.name, "ru") || left.type.localeCompare(right.type)
  ));
}

function getBossRewardWeaponTotals(modes) {
  const uniqueItems = new Map();
  for (const mode of Array.isArray(modes) ? modes : []) {
    for (const item of Array.isArray(mode && mode.items) ? mode.items : []) {
      const key = `${item && item.type || "other"}:${item && item.id || "?"}`;
      if (!uniqueItems.has(key)) {
        uniqueItems.set(key, item);
      }
    }
  }
  const totals = {};
  for (const item of uniqueItems.values()) {
    addBossRewardWeaponBonuses(totals, item && item.combatStatsBonus);
  }
  return totals;
}

function formatBossRewardWeaponBonuses(bonuses) {
  const parts = BOSS_REWARD_BONUS_DEFINITIONS
    .filter((definition) => Number(bonuses && bonuses[definition.key] || 0) !== 0)
    .map((definition) => `${definition.label} +${formatNumber(bonuses[definition.key])}`);
  return parts.length > 0 ? parts.join(" · ") : "бонусов нет";
}

function renderBossRewardWeaponBonusChips(bonuses, options = {}) {
  const chips = BOSS_REWARD_BONUS_DEFINITIONS
    .filter((definition) => Number(bonuses && bonuses[definition.key] || 0) !== 0)
    .map((definition) => {
      const title = `${definition.label} +${formatNumber(bonuses[definition.key])}`;
      return `
        <span class="boss-catalog-weapon-bonus" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
          <img src="${escapeHtml(definition.iconUrl || "")}" alt="">
          <strong>+${escapeHtml(formatNumber(bonuses[definition.key]))}</strong>
        </span>
      `;
    });
  if (chips.length > 0) {
    return chips.join("");
  }
  return options.emptyLabel
    ? `<span class="boss-catalog-weapon-bonus-empty">${escapeHtml(options.emptyLabel)}</span>`
    : "";
}

function renderBossCatalogRewardItems(items) {
  const ordered = [...(Array.isArray(items) ? items : [])].sort((left, right) => Number(left.owned) - Number(right.owned));
  return ordered.map((item) => {
    const label = getBossRewardItemLabel(item);
    const stateLabel = item.owned ? "collected" : "missing";
    const title = `${label} · ${stateLabel}`;
    return `
      <span class="boss-catalog-reward-item ${item.owned ? "is-owned" : "is-missing"}" title="${escapeHtml(title)}">
        ${item.previewUrl
          ? `<img src="${escapeHtml(item.previewUrl)}" alt="">`
          : `<span class="boss-catalog-reward-placeholder">?</span>`}
        ${item.owned ? `<span class="boss-catalog-reward-owned-mark" aria-hidden="true">✓</span>` : ""}
      </span>
    `;
  }).join("");
}

function getOpenBossCatalogRewardIds(container) {
  if (!container || typeof container.querySelectorAll !== "function") {
    return new Set();
  }
  return new Set(
    Array.from(container.querySelectorAll(".boss-catalog-reward-details[open][data-boss-id]"))
      .map((details) => String(details && details.dataset ? details.dataset.bossId || "" : "").trim())
      .filter(Boolean),
  );
}

function renderBossCatalogCollectionCell(item, options = {}) {
  const modes = getBossRewardModes(item && item.id).filter((mode) => Number(mode.total || 0) > 0);
  if (modes.length === 0) {
    return `<span class="muted">Нет наград</span>`;
  }

  const bossId = String(item && item.id || "");
  const total = modes.reduce((sum, mode) => sum + Number(mode.total || 0), 0);
  const collected = modes.reduce((sum, mode) => sum + Number(mode.collected || 0), 0);
  const missing = Math.max(0, total - collected);
  const weaponTotals = getBossRewardWeaponTotals(modes);
  const summaryTitle = `Собрано ${collected}/${total}${missing > 0 ? `, не хватает ${missing}` : ""}. Полная сборка: ${formatBossRewardWeaponBonuses(weaponTotals)}.`;

  return `
    <details class="boss-catalog-reward-details" data-boss-id="${escapeHtml(bossId)}"${options.expanded ? " open" : ""}>
      <summary title="${escapeHtml(summaryTitle)}">
        <span class="boss-catalog-reward-summary ${missing === 0 ? "is-complete" : "is-missing"}">
          <strong>${escapeHtml(`${collected}/${total}`)}</strong>
          ${missing === 0 ? "<small>собрано</small>" : ""}
        </span>
        <span class="boss-catalog-weapon-total">
          <small>Полный сбор</small>
          <span class="boss-catalog-weapon-bonuses">
            ${renderBossRewardWeaponBonusChips(weaponTotals, { emptyLabel: "без бонуса" })}
          </span>
        </span>
      </summary>
      <div class="boss-catalog-reward-modes">
        ${modes.map((mode) => {
          const label = getBossCollectionModeLabel(mode.kind, mode.key);
          const modeMissing = getBossRewardMissingItems(mode).length;
          const sets = buildBossRewardSetGroups(mode.items);
          return `
            <section class="boss-catalog-reward-mode ${modeMissing === 0 ? "is-complete" : "is-missing"}">
              <div class="boss-catalog-reward-mode-head">
                <strong>${escapeHtml(label)}</strong>
                <span title="${escapeHtml(buildBossCollectionTooltip(mode, label))}">${escapeHtml(`${mode.collected}/${mode.total}`)}</span>
              </div>
              <div class="boss-catalog-reward-sets">
                ${sets.map((set) => `
                  <div class="boss-catalog-reward-set">
                    <div class="boss-catalog-reward-set-head">
                      <span class="boss-catalog-reward-set-copy">
                        <strong title="${escapeHtml(set.name)}">${escapeHtml(set.name)}</strong>
                        <small>${escapeHtml(`${getBossRewardSetTypeLabel(set.type)} · ${set.collected}/${set.total}`)}</small>
                      </span>
                      <span class="boss-catalog-reward-set-bonus">
                        <small>Полный сет</small>
                        <span class="boss-catalog-weapon-bonuses">
                          ${renderBossRewardWeaponBonusChips(set.weaponBonuses, { emptyLabel: "—" })}
                        </span>
                      </span>
                    </div>
                    <div class="boss-catalog-reward-items">
                      ${renderBossCatalogRewardItems(set.items)}
                    </div>
                  </div>
                `).join("")}
              </div>
            </section>
          `;
        }).join("")}
      </div>
    </details>
  `;
}

function renderBossCollectionOverview(rewards) {
  const target = $("#boss-collection-summary");
  if (!target) {
    return;
  }
  const bosses = rewards && Array.isArray(rewards.bosses) ? rewards.bosses : [];
  const modes = bosses.flatMap((boss) => getBossRewardModes(boss.id)).filter((mode) => Number(mode.total || 0) > 0);
  renderStatGrid(target, [
    { label: "Unique rewards", value: `${formatNumber(rewards && rewards.collected || 0)} / ${formatNumber(rewards && rewards.total || 0)}` },
    { label: "Still missing", value: formatNumber(rewards && rewards.missing || 0) },
    { label: "Complete modes", value: `${formatNumber(modes.filter((mode) => Number(mode.collected || 0) >= Number(mode.total || 0)).length)} / ${formatNumber(modes.length)}` },
    { label: "Bosses with rewards", value: formatNumber(bosses.filter((boss) => getBossRewardModes(boss.id).some((mode) => Number(mode.total || 0) > 0)).length) },
  ]);
}

function formatBossWeaponDeltaSummary(weaponDelta, options = {}) {
  if (!weaponDelta || !weaponDelta.measured) {
    return options.fallback || "Weapon change unavailable";
  }
  const after = weaponDelta && weaponDelta.after || {};
  const delta = weaponDelta && weaponDelta.delta || {};
  return Object.keys(BOSS_WEAPON_LABELS).map((key) => {
    const current = Number(after[key] || 0);
    const change = Number(delta[key] || 0);
    return `${BOSS_WEAPON_LABELS[key]} ${formatSignedNumber(change)} → ${formatNumber(current)}`;
  }).join(" · ");
}

function isBossWeaponDeltaNewer(candidate, current) {
  if (!candidate) {
    return false;
  }
  if (!current) {
    return true;
  }

  const candidateTime = Date.parse(candidate.capturedAt || "");
  const currentTime = Date.parse(current.capturedAt || "");
  if (Number.isFinite(candidateTime) && Number.isFinite(currentTime)) {
    return candidateTime > currentTime;
  }

  return candidate.capturedAt !== current.capturedAt;
}

function getDamageCalculatorEngine() {
  return globalThis.PbotDamageCalculator || null;
}

function getDamageCalculatorWeaponActions() {
  const actions = state.bossDashboard && Array.isArray(state.bossDashboard.actions)
    ? state.bossDashboard.actions
    : [];
  const byKey = new Map(actions.map((item) => [String(item && item.key || ""), item]));
  return Object.keys(BOSS_WEAPON_LABELS).map((key) => {
    const item = byKey.get(key) || {};
    return {
      ...item,
      key,
      label: item.itemLabel || item.label || BOSS_WEAPON_LABELS[key],
      damage: Math.max(0, Number(item.damage || 0)),
      critChance: Math.max(0, Number(item.critChance || 0)),
      count: Math.max(0, Math.floor(Number(item.count || 0))),
    };
  });
}

function getDamageCalculatorWeapon() {
  const actions = getDamageCalculatorWeaponActions();
  return actions.find((item) => item.key === state.damageCalculator.weapon)
    || actions.find((item) => item.damage > 0)
    || actions[0]
    || null;
}

function getDamageCalculatorBuffEffects(buff, weapon = state.damageCalculator.weapon) {
  const expectedStat = `${weapon}CritChance`.toLowerCase();
  const effects = buff && Array.isArray(buff.effects) ? buff.effects : [];
  return effects.filter((effect) => (
    String(effect && effect.stat || "").trim().toLowerCase() === expectedStat
    && Number(effect && effect.value || 0) > 0
  ));
}

function getDamageCalculatorCritBuffs(weapon = state.damageCalculator.weapon) {
  const buffs = state.bossBuffs && Array.isArray(state.bossBuffs.buffs)
    ? state.bossBuffs.buffs
    : [];
  return buffs.filter((buff) => getDamageCalculatorBuffEffects(buff, weapon).length > 0);
}

function getDamageCalculatorCritBonusPoints(weapon = state.damageCalculator.weapon) {
  return getDamageCalculatorCritBuffs(weapon).reduce((sum, buff) => {
    if (!state.damageCalculator.selectedBuffIds.has(String(buff.id || ""))) {
      return sum;
    }
    return sum + getDamageCalculatorBuffEffects(buff, weapon)
      .reduce((effectSum, effect) => effectSum + Number(effect.value || 0), 0);
  }, 0);
}

function renderDamageCalculatorWeapons() {
  const target = $("#damage-calculator-weapons");
  if (!target) {
    return;
  }

  const actions = getDamageCalculatorWeaponActions();
  const selected = getDamageCalculatorWeapon();
  if (selected && selected.key !== state.damageCalculator.weapon) {
    state.damageCalculator.weapon = selected.key;
  }
  target.innerHTML = actions.map((item) => {
    const isActive = item.key === state.damageCalculator.weapon;
    const damageLabel = item.damage > 0 ? formatBossCompactNumber(item.damage) : "нет данных";
    const critPercent = item.critChance > 1 ? item.critChance : item.critChance * 100;
    return `
      <button
        type="button"
        class="damage-calculator-weapon${isActive ? " is-active" : ""}"
        data-calculator-weapon="${escapeHtml(item.key)}"
        role="radio"
        aria-checked="${isActive ? "true" : "false"}"
      >
        <img src="${escapeHtml(BOSS_WEAPON_ICON_URLS[item.key] || "")}" alt="">
        <span class="damage-calculator-weapon-copy">
          <strong>${escapeHtml(BOSS_WEAPON_LABELS[item.key] || item.label)}</strong>
          <small>${escapeHtml(`${damageLabel} · ×${formatNumber(item.count)} · крит ${formatNumber(critPercent)}%`)}</small>
        </span>
      </button>
    `;
  }).join("");
}

function renderDamageCalculatorBuffs() {
  const target = $("#damage-calculator-buffs");
  if (!target) {
    return;
  }
  if (state.bossBuffsLoading && !state.bossBuffs) {
    target.innerHTML = `<span class="damage-calculator-muted">Загружаю усиления игры…</span>`;
    return;
  }
  if (state.bossBuffsError && !state.bossBuffs) {
    target.innerHTML = `<span class="damage-calculator-muted">Не удалось загрузить усиления: ${escapeHtml(state.bossBuffsError)}</span>`;
    return;
  }

  const buffs = getDamageCalculatorCritBuffs();
  if (buffs.length === 0) {
    target.innerHTML = `<span class="damage-calculator-muted">Для этого оружия в каталоге игры нет усилений крита.</span>`;
    return;
  }

  target.innerHTML = buffs.map((buff) => {
    const bonus = getDamageCalculatorBuffEffects(buff)
      .reduce((sum, effect) => sum + Number(effect.value || 0), 0);
    const checked = state.damageCalculator.selectedBuffIds.has(String(buff.id || ""));
    return `
      <label class="damage-calculator-buff">
        ${buff.icon ? `<img src="${escapeHtml(buff.icon)}" alt="">` : `<span></span>`}
        <span class="damage-calculator-buff-copy">
          <strong>${escapeHtml(buff.title || buff.id || "Усиление")}</strong>
          <small>${escapeHtml(`+${formatNumber(bonus)} п.п. к криту${buff.description ? ` · ${buff.description}` : ""}`)}</small>
        </span>
        <input
          class="js-damage-calculator-buff"
          type="checkbox"
          data-buff-id="${escapeHtml(String(buff.id || ""))}"
          ${checked ? "checked" : ""}
        >
      </label>
    `;
  }).join("");
}

async function loadDamageCalculatorBuffs() {
  if (state.bossBuffsLoading || state.bossBuffs) {
    return;
  }
  state.bossBuffsLoading = true;
  state.bossBuffsError = null;
  renderDamageCalculatorBuffs();
  try {
    state.bossBuffs = await apiRequest("GET", "/api/bosses/buffs");
  } catch (error) {
    state.bossBuffsError = error && error.message ? error.message : String(error);
  } finally {
    state.bossBuffsLoading = false;
    if ($("#damage-calculator-dialog")?.open) {
      renderDamageCalculatorBuffs();
      renderDamageCalculatorResult();
    }
  }
}

function populateDamageCalculatorBossSelect(preferredBossId = null) {
  const select = $("#damage-calculator-boss-select");
  if (!select) {
    return;
  }
  const bosses = getAllBossCatalogItems();
  const currentValue = Number(preferredBossId || select.value || 0);
  const options = bosses.map((boss) => {
    const hp = Number(boss.baseHp || 0);
    const hpLabel = hp > 0 ? ` · ${formatBossCompactNumber(hp)} HP` : "";
    return {
      value: String(boss.id),
      label: `#${boss.id} ${boss.title || "Босс"}${hpLabel}`,
    };
  });
  if (!syncSelectOptions(select, options)) {
    return;
  }
  if (bosses.some((boss) => Number(boss.id) === currentValue)) {
    select.value = String(currentValue);
  }
}

function getDamageCalculatorSelectedBoss() {
  const bossId = Number($("#damage-calculator-boss-select")?.value || 0);
  return getAllBossCatalogItems().find((boss) => Number(boss.id) === bossId) || null;
}

function getDamageCalculatorActiveTarget() {
  const context = resolveBossLiveContext();
  if (!context.activeSession || !Number.isFinite(context.currentHp) || context.currentHp <= 0) {
    return null;
  }
  const title = context.activeBoss && context.activeBoss.title
    ? context.activeBoss.title
    : context.activeSession.bossId
      ? `Босс #${context.activeSession.bossId}`
      : "Текущий бой";
  return {
    damage: Math.ceil(context.currentHp),
    title,
    detail: `${formatBossModeLabel(context.mode || DEFAULT_BOSS_MODE)} · осталось ${formatNumber(context.currentHp)} HP`,
  };
}

function getDamageCalculatorTarget() {
  const engine = getDamageCalculatorEngine();
  if (state.damageCalculator.targetKind === "active") {
    return getDamageCalculatorActiveTarget();
  }
  if (state.damageCalculator.targetKind === "custom") {
    const damage = Math.max(0, Math.ceil(Number($("#damage-calculator-target-damage")?.value || 0)));
    return { damage, title: "Свой план", detail: `${formatNumber(damage)} урона` };
  }
  const boss = getDamageCalculatorSelectedBoss();
  if (!boss || !engine) {
    return null;
  }
  const damage = engine.resolveBossTargetDamage(boss.baseHp, DEFAULT_BOSS_MODE);
  return {
    damage,
    title: boss.title || `Босс #${boss.id}`,
    detail: `Пацанский · ${formatNumber(damage)} HP`,
  };
}

function renderDamageCalculatorTargetControls() {
  const isTargetMode = state.damageCalculator.mode === "target";
  $("#damage-calculator-quantity-panel").hidden = isTargetMode;
  $("#damage-calculator-target-panel").hidden = !isTargetMode;
  document.querySelectorAll("[data-calculator-mode]").forEach((button) => {
    const isActive = button.dataset.calculatorMode === state.damageCalculator.mode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  const activeTarget = getDamageCalculatorActiveTarget();
  const activeButton = document.querySelector('[data-target-kind="active"]');
  if (activeButton) {
    activeButton.disabled = !activeTarget;
  }
  if (state.damageCalculator.targetKind === "active" && !activeTarget) {
    state.damageCalculator.targetKind = "boss";
  }
  document.querySelectorAll("[data-target-kind]").forEach((button) => {
    const isActive = button.dataset.targetKind === state.damageCalculator.targetKind;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  const activePanel = $("#damage-calculator-active-target");
  const bossPanel = $("#damage-calculator-boss-target");
  const customPanel = $("#damage-calculator-custom-target");
  activePanel.hidden = state.damageCalculator.targetKind !== "active";
  bossPanel.hidden = state.damageCalculator.targetKind !== "boss";
  customPanel.hidden = state.damageCalculator.targetKind !== "custom";
  if (activePanel && activeTarget) {
    activePanel.className = "damage-calculator-target-source damage-calculator-active-target";
    activePanel.innerHTML = `<strong>${escapeHtml(activeTarget.title)}</strong><span>${escapeHtml(activeTarget.detail)}</span>`;
  }
}

function renderDamageCalculatorResultCard(tone, label, value, detail) {
  return `
    <div class="damage-calculator-result-card is-${escapeHtml(tone)}">
      <span>${escapeHtml(label)}</span>
      <strong class="damage-calculator-result-value">${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function renderDamageCalculatorResult() {
  const target = $("#damage-calculator-result");
  const engine = getDamageCalculatorEngine();
  const weapon = getDamageCalculatorWeapon();
  if (!target || !engine || !weapon || weapon.damage <= 0) {
    if (target) {
      target.innerHTML = `<span class="damage-calculator-muted">Обновите панель босса, чтобы получить урон оружия из игры.</span>`;
    }
    return;
  }

  renderDamageCalculatorTargetControls();
  const actionPercent = Number($("#damage-calculator-action-percent")?.value || 0);
  const weaponCount = Number($("#damage-calculator-weapon-count")?.value || 0);
  const critBonusPoints = getDamageCalculatorCritBonusPoints(weapon.key);
  const calculationTarget = state.damageCalculator.mode === "target" ? getDamageCalculatorTarget() : null;
  const plan = engine.calculateDamagePlan({
    baseDamage: weapon.damage,
    actionPercent,
    critChance: weapon.critChance,
    critBonusPoints,
    weaponCount,
    targetDamage: calculationTarget ? calculationTarget.damage : 0,
  });

  const critSummary = $("#damage-calculator-crit-summary");
  if (critSummary) {
    const baseCritPercent = plan.baseCritChance * 100;
    const totalCritPercent = plan.critChance * 100;
    critSummary.textContent = critBonusPoints > 0
      ? `Из игры ${formatNumber(baseCritPercent)}% + усиления ${formatNumber(critBonusPoints)} п.п. = ${formatNumber(totalCritPercent)}%`
      : `Из игры: ${formatNumber(baseCritPercent)}%`;
  }
  document.querySelectorAll("[data-action-percent]").forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.actionPercent) === plan.actionPercent);
  });

  const weaponName = BOSS_WEAPON_LABELS[weapon.key] || weapon.label;
  const multiplier = String(Number(plan.actionMultiplier.toFixed(2))).replace(".", ",");
  const equation = `${formatNumber(plan.baseDamage)} × ${multiplier} = ${formatNumber(plan.hitDamage)} за удар · крит ${formatNumber(plan.critChance * 100)}%`;
  if (state.damageCalculator.mode === "quantity") {
    const stockShort = plan.weaponCount > weapon.count;
    target.innerHTML = `
      <div class="damage-calculator-result-head">
        <strong>${escapeHtml(`${weaponName} ×${formatNumber(plan.weaponCount)}`)}</strong>
        <span>Итоговый урон с выбранной акцией и шансом крита</span>
      </div>
      <div class="damage-calculator-equation">${escapeHtml(equation)}</div>
      <div class="damage-calculator-result-grid">
        ${renderDamageCalculatorResultCard("guaranteed", "Гарантированно", formatNumber(plan.guaranteedDamage), "Если не сработает ни одного крита")}
        ${renderDamageCalculatorResultCard("expected", "Ожидаемо", `≈ ${formatNumber(plan.expectedDamage)}`, `Среднее при ${formatNumber(plan.critChance * 100)}% шанса крита`)}
        ${renderDamageCalculatorResultCard("maximum", "Максимум", formatNumber(plan.maximumDamage), "Если кританёт каждый удар")}
      </div>
      <p class="damage-calculator-stock-note${stockShort ? " is-short" : ""}">
        ${escapeHtml(stockShort
          ? `Не хватает ${formatNumber(plan.weaponCount - weapon.count)} шт.: в наличии ×${formatNumber(weapon.count)}.`
          : `В наличии ×${formatNumber(weapon.count)} · после плана останется ×${formatNumber(weapon.count - plan.weaponCount)}.`)}
      </p>
    `;
    return;
  }

  if (!calculationTarget || calculationTarget.damage <= 0) {
    target.innerHTML = `<span class="damage-calculator-muted">Выберите босса или укажите планируемый урон больше нуля.</span>`;
    return;
  }
  const enoughGuaranteed = weapon.count >= plan.guaranteedCount;
  const enoughExpected = weapon.count >= plan.expectedCount;
  target.innerHTML = `
    <div class="damage-calculator-result-head">
      <strong>${escapeHtml(calculationTarget.title)}</strong>
      <span>${escapeHtml(calculationTarget.detail)}</span>
    </div>
    <div class="damage-calculator-equation">${escapeHtml(`${equation} · цель ${formatNumber(plan.targetDamage)}`)}</div>
    <div class="damage-calculator-result-grid">
      ${renderDamageCalculatorResultCard("guaranteed", "Нужно гарантированно", `×${formatNumber(plan.guaranteedCount)}`, `${formatNumber(plan.guaranteedPlanDamage)} урона без критов`)}
      ${renderDamageCalculatorResultCard("expected", "Нужно ожидаемо", `≈ ×${formatNumber(plan.expectedCount)}`, `Ожидаемый урон ${formatNumber(plan.expectedPlanDamage)}`)}
      ${renderDamageCalculatorResultCard("maximum", "Если кританёт всё", `×${formatNumber(Math.ceil(plan.targetDamage / plan.criticalHitDamage))}`, `${formatNumber(plan.criticalHitDamage)} урона за критический удар`)}
    </div>
    <p class="damage-calculator-stock-note${enoughExpected ? "" : " is-short"}">
      ${escapeHtml(
        enoughGuaranteed
          ? `Запаса ×${formatNumber(weapon.count)} хватает даже без критов.`
          : enoughExpected
            ? `Запаса ×${formatNumber(weapon.count)} хватает по среднему ожиданию, но без критов не хватит ${formatNumber(plan.guaranteedCount - weapon.count)} шт.`
            : `Запаса ×${formatNumber(weapon.count)} не хватает: по ожиданию нужно ещё ${formatNumber(plan.expectedCount - weapon.count)} шт.`,
      )}
    </p>
  `;
}

function renderDamageCalculator() {
  const bossSelect = $("#damage-calculator-boss-select");
  if (bossSelect && bossSelect.options.length === 0 && getAllBossCatalogItems().length > 0) {
    const context = resolveBossLiveContext();
    const preferredBossId = context.activeBoss && context.activeBoss.id
      ? context.activeBoss.id
      : Number($("#boss-select")?.value || 0);
    populateDamageCalculatorBossSelect(preferredBossId);
  }
  renderDamageCalculatorWeapons();
  renderDamageCalculatorBuffs();
  renderDamageCalculatorResult();
}

function openDamageCalculatorDialog() {
  const dialog = $("#damage-calculator-dialog");
  if (!dialog) {
    return;
  }
  const context = resolveBossLiveContext();
  const preferredBossId = context.activeBoss && context.activeBoss.id
    ? context.activeBoss.id
    : Number($("#boss-select")?.value || 0);
  populateDamageCalculatorBossSelect(preferredBossId);
  state.damageCalculator.targetKind = getDamageCalculatorActiveTarget() ? "active" : "boss";
  renderDamageCalculator();
  if (!dialog.open) {
    dialog.showModal();
  }
  void loadDamageCalculatorBuffs();
}

function closeDamageCalculatorDialog() {
  const dialog = $("#damage-calculator-dialog");
  if (dialog && dialog.open) {
    dialog.close();
  }
}

function handleDamageCalculatorClick(event) {
  const weaponButton = event.target.closest("[data-calculator-weapon]");
  if (weaponButton) {
    state.damageCalculator.weapon = weaponButton.dataset.calculatorWeapon;
    renderDamageCalculator();
    return;
  }
  const presetButton = event.target.closest("[data-action-percent]");
  if (presetButton) {
    $("#damage-calculator-action-percent").value = presetButton.dataset.actionPercent;
    renderDamageCalculatorResult();
    return;
  }
  const modeButton = event.target.closest("[data-calculator-mode]");
  if (modeButton) {
    state.damageCalculator.mode = modeButton.dataset.calculatorMode;
    renderDamageCalculatorResult();
    return;
  }
  const targetButton = event.target.closest("[data-target-kind]");
  if (targetButton && !targetButton.disabled) {
    state.damageCalculator.targetKind = targetButton.dataset.targetKind;
    renderDamageCalculatorResult();
  }
}

function handleDamageCalculatorChange(event) {
  if (event.target.matches(".js-damage-calculator-buff")) {
    const id = String(event.target.dataset.buffId || "");
    if (event.target.checked) {
      state.damageCalculator.selectedBuffIds.add(id);
    } else {
      state.damageCalculator.selectedBuffIds.delete(id);
    }
    renderDamageCalculatorResult();
    return;
  }
  renderDamageCalculatorResult();
}

function getBossCombatActionLabel(item) {
  const key = String(item && item.key || item || "").trim();
  return String(
    item && (item.itemLabel || item.attackLabel || item.label)
    || BOSS_MELEE_ACTION_LABELS[key]
    || BOSS_WEAPON_LABELS[key]
    || key,
  );
}

function getBossCombatActionIconUrl(key) {
  const normalizedKey = String(key || "").trim();
  return BOSS_MELEE_ACTION_ICON_URLS[normalizedKey]
    || BOSS_WEAPON_ICON_URLS[normalizedKey]
    || "";
}

function getBossMeleeCooldownState(key, nowMs = Date.now()) {
  const summary = state.bossState
    && state.bossState.snapshot
    && state.bossState.snapshot.summary
    ? state.bossState.snapshot.summary
    : {};
  const source = summary.meleeCooldowns && summary.meleeCooldowns[key]
    ? summary.meleeCooldowns[key]
    : null;
  if (!source) {
    return {
      active: false,
      readyAt: null,
      remainingMs: 0,
      restorePriceRubles: BOSS_FIXED_PRICES.restoreMelee,
    };
  }
  const readyAtMs = Date.parse(source.readyAt || "");
  const remainingMs = Number.isFinite(readyAtMs)
    ? Math.max(0, readyAtMs - Number(nowMs || Date.now()))
    : Math.max(0, Number(source.remainingMs) || 0);
  return {
    ...source,
    active: source.active !== false && remainingMs > 0,
    readyAt: Number.isFinite(readyAtMs) ? new Date(readyAtMs).toISOString() : null,
    remainingMs,
    restorePriceRubles: Math.max(
      0,
      Number(source.restorePriceRubles ?? BOSS_FIXED_PRICES.restoreMelee)
        || BOSS_FIXED_PRICES.restoreMelee,
    ),
  };
}

function formatBossMeleeCooldownRemaining(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBossMeleeReadyTime(readyAt) {
  const value = new Date(readyAt || "");
  return Number.isNaN(value.getTime())
    ? ""
    : value.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function formatBossMeleeCooldownLabel(cooldown) {
  if (!cooldown || !cooldown.active) {
    return "Готов";
  }
  const readyTime = formatBossMeleeReadyTime(cooldown.readyAt);
  return `КД ${formatBossMeleeCooldownRemaining(cooldown.remainingMs)}${readyTime ? ` · до ${readyTime}` : ""}`;
}

function renderBossCombatAction(item, hasActiveFight) {
  const key = String(item && item.key || "").trim();
  const label = getBossCombatActionLabel(item);
  const isMelee = BOSS_MELEE_ACTION_KEYS.has(key);
  const cooldown = isMelee ? getBossMeleeCooldownState(key) : null;
  const cooldownActive = Boolean(cooldown && cooldown.active);
  const restoreRunning = isMelee && state.bossMeleeRestoreRunning.has(key);
  const availableCount = Math.max(0, Math.floor(Number(item && item.count || 0)));
  const canHit = hasActiveFight
    && !cooldownActive
    && item.available !== false
    && (isMelee || availableCount > 0);
  const rubles = state.economy && state.economy.currencies
    ? Number(state.economy.currencies.rubles)
    : null;
  const restorePriceRubles = cooldown
    ? cooldown.restorePriceRubles
    : BOSS_FIXED_PRICES.restoreMelee;
  const hasRestoreBalance = rubles === null
    || !Number.isFinite(rubles)
    || rubles >= restorePriceRubles;
  const canRestore = hasActiveFight && cooldownActive && !restoreRunning && hasRestoreBalance;
  const inventoryMarkup = isMelee
    ? cooldownActive
      ? `<span
          class="boss-weapon-cooldown js-boss-melee-cooldown"
          data-weapon="${escapeHtml(key)}"
          data-ready-at="${escapeHtml(cooldown.readyAt || "")}"
        >${escapeHtml(formatBossMeleeCooldownLabel(cooldown))}</span>`
      : `<span class="boss-weapon-ready">Готов</span>`
    : `<span>${escapeHtml(`×${formatNumber(item.count || 0)}`)}</span>`;
  const countSelectMarkup = isMelee
    ? ""
    : `
      <select class="boss-weapon-hit-count js-boss-weapon-count" aria-label="Количество ударов ${escapeHtml(label)}"${canHit ? "" : " disabled"}>
        ${BOSS_WEAPON_BATCH_COUNTS.map((count) => `<option value="${count}">×${count}</option>`).join("")}
      </select>
    `;
  const buyMarkup = isMelee
    ? ""
    : `
      <span class="boss-weapon-buy-strip" aria-label="Купить ${escapeHtml(label)}">
        <span class="boss-weapon-buy-label">Купить</span>
        ${BOSS_WEAPON_BUY_BATCH_COUNTS.map((count) => {
          const total = Number(BOSS_FIXED_PRICES[key] || 0) * count;
          const affordable = !Number.isFinite(rubles) || rubles >= total;
          return `
            <button
              class="boss-weapon-buy-button js-boss-weapon-buy"
              type="button"
              data-weapon="${escapeHtml(key)}"
              data-count="${count}"
              data-unit-price="${escapeHtml(String(BOSS_FIXED_PRICES[key] || 0))}"
              title="${escapeHtml(affordable ? `${label} ×${count} за ${formatNumber(total)} ₽` : `Не хватает рублей: нужно ${formatNumber(total)} ₽`)}"
              ${affordable ? "" : "disabled"}
            >×${count} · ${escapeHtml(formatNumber(total))} ₽</button>
          `;
        }).join("")}
      </span>
    `;
  return `
    <div class="boss-weapon-pill${isMelee ? " is-melee" : " is-consumable"}" data-weapon="${escapeHtml(key)}">
      <img class="boss-weapon-icon" src="${escapeHtml(getBossCombatActionIconUrl(key))}" alt="">
      <span class="boss-weapon-copy">
        <strong>${escapeHtml(label)}</strong>
        <span class="boss-weapon-meta">
          <span>${escapeHtml(formatBossCompactNumber(item.damage))} урона</span>
          ${inventoryMarkup}
        </span>
        ${buyMarkup}
      </span>
      <span class="boss-weapon-hit-control">
        ${countSelectMarkup}
        ${isMelee && cooldownActive ? `
          <button
            class="action-button boss-weapon-hit-button boss-melee-restore-button js-boss-melee-restore"
            type="button"
            data-weapon="${escapeHtml(key)}"
            aria-label="Откатить ${escapeHtml(label)} за ${escapeHtml(formatNumber(restorePriceRubles))} рублей"
            title="${escapeHtml(hasRestoreBalance ? `Откатить удар за ${formatNumber(restorePriceRubles)} рублей` : `Не хватает рублей: нужно ${formatNumber(restorePriceRubles)}`)}"
            ${canRestore ? "" : "disabled"}
          >${restoreRunning ? "Откатываю…" : `Откатить · ${escapeHtml(formatNumber(restorePriceRubles))} ₽`}</button>
        ` : `
          <button
            class="action-button boss-weapon-hit-button js-boss-weapon-hit"
            type="button"
            data-weapon="${escapeHtml(key)}"
            data-available-count="${escapeHtml(String(availableCount))}"
            aria-label="Пробить: ${escapeHtml(label)}"
            ${canHit ? "" : "disabled"}
          >Пробить</button>
        `}
      </span>
    </div>
  `;
}

function renderBossCombatActionGroup(label, className, items, hasActiveFight) {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }
  return `
    <section class="boss-combat-action-group ${escapeHtml(className)}" aria-label="${escapeHtml(label)}">
      <div class="boss-combat-action-group-title">${escapeHtml(label)}</div>
      <div class="boss-combat-action-grid">
        ${items.map((item) => renderBossCombatAction(item, hasActiveFight)).join("")}
      </div>
    </section>
  `;
}

function renderBossWeaponPanel(actions) {
  const target = $("#boss-actions-body");
  if (!target) {
    return;
  }
  const selectedCounts = new Map(
    [...target.querySelectorAll(".boss-weapon-pill")]
      .map((row) => [
        String(row.dataset.weapon || ""),
        String(row.querySelector(".js-boss-weapon-count")?.value || ""),
      ])
      .filter(([key, value]) => key && value),
  );
  const supportedActions = (Array.isArray(actions) ? actions : []).filter((item) => (
    item
    && BOSS_DIRECT_HIT_ACTION_KEYS.has(String(item.key || ""))
    && Number(item.damage || 0) > 0
  ));
  const meleeActions = supportedActions.filter((item) => BOSS_MELEE_ACTION_KEYS.has(String(item.key || "")));
  const weaponActions = supportedActions.filter((item) => BOSS_WEAPON_ACTION_KEYS.has(String(item.key || "")));
  const hasActiveFight = Boolean(resolveBossLiveContext().activeSession);
  const contentUpdated = replaceHtmlUnlessSelectFocused(target, supportedActions.length > 0
    ? [
      renderBossCombatActionGroup("Рукопашные", "is-melee", meleeActions, hasActiveFight),
      renderBossCombatActionGroup("Оружие", "is-consumable", weaponActions, hasActiveFight),
    ].join("")
    : `<span class="boss-weapon-empty">Нет данных об уроне оружия</span>`);
  if (contentUpdated) {
    for (const [key, value] of selectedCounts) {
      const select = target.querySelector(`.boss-weapon-pill[data-weapon="${key}"] .js-boss-weapon-count`);
      if (select && [...select.options].some((option) => option.value === value)) {
        select.value = value;
      }
    }
  }
  if ($("#damage-calculator-dialog")?.open) {
    renderDamageCalculator();
  }
}

function updateBossMeleeCooldownUi() {
  const target = $("#boss-actions-body");
  if (!target) {
    return;
  }
  let shouldRerender = false;
  for (const node of target.querySelectorAll(".js-boss-melee-cooldown")) {
    const key = String(node.dataset.weapon || "").trim();
    const cooldown = getBossMeleeCooldownState(key);
    if (!cooldown.active) {
      shouldRerender = true;
      break;
    }
    setTextIfChanged(node, formatBossMeleeCooldownLabel(cooldown));
  }
  if (shouldRerender && state.bossDashboard && Array.isArray(state.bossDashboard.actions)) {
    renderBossWeaponPanel(state.bossDashboard.actions);
  }
}

function getBossComboResourceLabel(key) {
  const rawKey = String(key || "").trim();
  const normalizedKey = ["ruble", "rub", "money"].includes(rawKey.toLowerCase())
    ? "rubles"
    : rawKey.toLowerCase();
  return BOSS_WEAPON_LABELS[normalizedKey]
    || CURRENCY_LABELS[normalizedKey]
    || (normalizedKey === "keys" ? "Ключи" : rawKey);
}

function getBossComboResourceIconUrl(key) {
  const rawKey = String(key || "").trim().toLowerCase();
  const normalizedKey = ["ruble", "rub", "money"].includes(rawKey) ? "rubles" : rawKey;
  return BOSS_WEAPON_ICON_URLS[normalizedKey] || CURRENCY_ICON_URLS[normalizedKey] || "";
}

function getBossComboRewardsForDisplay(source) {
  if (Array.isArray(source)) {
    return source.filter((reward) => reward && typeof reward === "object");
  }
  if (!source || typeof source !== "object") {
    return [];
  }
  if (Array.isArray(source.comboRewards)) {
    return source.comboRewards.filter((reward) => reward && typeof reward === "object");
  }
  if (source.comboReward && typeof source.comboReward === "object") {
    return [source.comboReward];
  }
  return (Array.isArray(source.cycles) ? source.cycles : [])
    .flatMap((cycle) => (Array.isArray(cycle && cycle.hits) ? cycle.hits : []))
    .map((hit) => hit && hit.comboReward)
    .filter((reward) => reward && typeof reward === "object");
}

function findBossComboTattooCatalogItem(tattooId) {
  const id = String(tattooId ?? "").trim();
  if (!id) {
    return null;
  }
  const bossRewardItems = (
    state.bossDashboard
    && state.bossDashboard.rewards
    && Array.isArray(state.bossDashboard.rewards.bosses)
      ? state.bossDashboard.rewards.bosses
      : []
  ).flatMap((boss) => [
    ...(Array.isArray(boss && boss.battleModes) ? boss.battleModes : []),
    ...(Array.isArray(boss && boss.comboModes) ? boss.comboModes : []),
  ]).flatMap((mode) => (Array.isArray(mode && mode.items) ? mode.items : []));
  const wearableItems = (
    state.wearableCollectionDashboard
    && Array.isArray(state.wearableCollectionDashboard.categories)
      ? state.wearableCollectionDashboard.categories
      : []
  ).flatMap((category) => (Array.isArray(category && category.groups) ? category.groups : []))
    .flatMap((group) => (Array.isArray(group && group.items) ? group.items : []));
  return [...bossRewardItems, ...wearableItems].find((item) => (
    String(item ? (item.id ?? item.tattooId ?? "") : "").trim() === id
    && String(item && item.type || "tattoo").trim().toLowerCase() === "tattoo"
  )) || null;
}

function collectBossComboExtraRewards(source) {
  let stashCount = 0;
  const tattoosById = new Map();
  for (const reward of getBossComboRewardsForDisplay(source)) {
    const rewardStashCount = Number(reward && reward.stashCount);
    if (Number.isFinite(rewardStashCount) && rewardStashCount > 0) {
      stashCount += rewardStashCount;
    }
    const tattooItems = [
      ...(Array.isArray(reward && reward.items) ? reward.items : []),
      ...(Array.isArray(reward && reward.tattoos)
        ? reward.tattoos.map((item) => ({ ...item, type: item && item.type || "tattoo" }))
        : []),
    ];
    const seenInReward = new Set();
    for (const item of tattooItems) {
      const type = String(item && (item.type || item.kind) || "").trim().toLowerCase();
      if (type !== "tattoo") {
        continue;
      }
      const id = String(item ? (item.id ?? item.tattooId ?? "") : "").trim();
      const rawName = String(item && (item.name || item.title || item.tattooName) || "").trim();
      const rewardKey = id || rawName || `tattoo-${seenInReward.size + 1}`;
      if (seenInReward.has(rewardKey)) {
        continue;
      }
      seenInReward.add(rewardKey);
      const catalogItem = findBossComboTattooCatalogItem(id);
      const name = rawName
        || String(catalogItem && (catalogItem.name || catalogItem.setName) || "").trim()
        || (id ? `Наколка #${id}` : "Наколка");
      const imageUrl = String(
        item && (item.image || item.imageUrl || item.previewUrl)
        || catalogItem && (catalogItem.image || catalogItem.imageUrl || catalogItem.previewUrl)
        || "",
      ).trim();
      const amount = Math.max(1, Number(item && (item.amount ?? item.qty ?? item.count)) || 1);
      const existing = tattoosById.get(rewardKey);
      tattoosById.set(rewardKey, {
        id,
        name,
        imageUrl: imageUrl || existing && existing.imageUrl || "",
        amount: amount + Number(existing && existing.amount || 0),
      });
    }
  }
  return {
    stashCount,
    tattoos: [...tattoosById.values()],
  };
}

function renderBossComboExtraChips(source, options = {}) {
  const extras = collectBossComboExtraRewards(source);
  const chipClass = "boss-combo-economy-chip";
  const chips = [];
  if (extras.stashCount > 0) {
    const title = `Нычки +${formatNumber(extras.stashCount)}`;
    chips.push(`
      <span class="${chipClass} is-positive is-stash" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
        <img src="${escapeHtml(BOSS_STASH_ICON_URL)}" alt="" loading="lazy">
        <span>+${escapeHtml(formatNumber(extras.stashCount))} Нычки</span>
      </span>
    `);
  }
  for (const tattoo of extras.tattoos) {
    const title = `Наколка: ${tattoo.name}`;
    chips.push(`
      <span class="${chipClass} is-positive is-tattoo" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
        ${tattoo.imageUrl
          ? `<img src="${escapeHtml(tattoo.imageUrl)}" alt="" loading="lazy">`
          : `<span class="boss-combo-special-fallback-icon" aria-hidden="true">✦</span>`}
        <span>+${escapeHtml(formatNumber(tattoo.amount))} Наколка</span>
      </span>
    `);
  }
  return chips.join("");
}

function getBossComboEconomyEntries(group) {
  return [
    ...Object.entries(group && group.weapons || {}).map(([key, value]) => ({ key, value })),
    ...Object.entries(group && group.currencies || {}).map(([key, value]) => ({ key, value })),
  ].filter((item) => Number.isFinite(Number(item.value)) && Number(item.value) !== 0);
}

function renderBossComboEconomyChips(group, signMode) {
  const entries = getBossComboEconomyEntries(group);
  if (entries.length === 0) {
    return `<span class="boss-combo-economy-empty">нет</span>`;
  }
  return entries.map(({ key, value }) => {
    const numeric = Number(value);
    const signedValue = signMode === "cost"
      ? `−${formatNumber(Math.abs(numeric))}`
      : signMode === "reward"
        ? `+${formatNumber(Math.abs(numeric))}`
        : formatSignedNumber(numeric);
    const tone = signMode === "cost" || numeric < 0
      ? "is-negative"
      : signMode === "reward" || numeric > 0
        ? "is-positive"
        : "";
    const iconUrl = getBossComboResourceIconUrl(key);
    return `
      <span class="boss-combo-economy-chip ${tone}">
        ${iconUrl ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy">` : `<span class="boss-combo-economy-fallback-icon" aria-hidden="true">◆</span>`}
        <span>${escapeHtml(signedValue)} ${escapeHtml(getBossComboResourceLabel(key))}</span>
      </span>
    `;
  }).join("");
}

function renderBossComboNetChips(group, comboRewards) {
  const economyMarkup = getBossComboEconomyEntries(group).length > 0
    ? renderBossComboEconomyChips(group, "net")
    : "";
  const extraMarkup = renderBossComboExtraChips(comboRewards);
  return economyMarkup || extraMarkup
    ? `${economyMarkup}${extraMarkup}`
    : `<span class="boss-combo-economy-empty">нет</span>`;
}

function formatBossComboEconomySummary(economy) {
  if (!economy || !economy.measured) {
    return "";
  }
  const formatGroup = (group, mode) => getBossComboEconomyEntries(group)
    .map(({ key, value }) => {
      const numeric = Number(value);
      const signed = mode === "cost"
        ? `−${formatNumber(Math.abs(numeric))}`
        : mode === "reward"
          ? `+${formatNumber(Math.abs(numeric))}`
          : formatSignedNumber(numeric);
      return `${signed} ${getBossComboResourceLabel(key)}`;
    })
    .join(", ");
  const costs = formatGroup(economy.costs, "cost");
  const rewards = formatGroup(economy.rewards, "reward");
  const net = formatGroup(economy.net, "net");
  return [
    costs ? `затраты: ${costs}` : null,
    rewards ? `награда: ${rewards}` : null,
    net ? `итог: ${net}` : null,
  ].filter(Boolean).join(" · ");
}

function formatBossComboNetSummary(economy) {
  if (!economy || !economy.measured) {
    return "";
  }
  const net = getBossComboEconomyEntries(economy.net)
    .map(({ key, value }) => `${formatSignedNumber(Number(value))} ${getBossComboResourceLabel(key)}`)
    .join(", ");
  return `итог комбо: ${net || "без изменений"}`;
}

async function handleBossMeleeRestoreClick(trigger) {
  const weapon = String(trigger && trigger.dataset.weapon || "").trim();
  if (!BOSS_MELEE_ACTION_KEYS.has(weapon) || state.bossMeleeRestoreRunning.has(weapon)) {
    return;
  }

  const actionLabel = getBossCombatActionLabel(weapon);
  state.bossMeleeRestoreRunning.add(weapon);
  if (state.bossDashboard && Array.isArray(state.bossDashboard.actions)) {
    renderBossWeaponPanel(state.bossDashboard.actions);
  }
  setServerStatus(`restore ${weapon}`, "busy");

  try {
    const payload = await apiRequest("POST", "/api/bosses/restore-melee", { weapon });
    renderBossResult(payload);
    const restored = Boolean(payload && payload.restored);
    const cooldownReady = restored || payload && payload.haltedReason === "already_ready";
    if (cooldownReady) {
      clearBossMeleeCooldownState(weapon);
      if (state.bossDashboard && Array.isArray(state.bossDashboard.actions)) {
        renderBossWeaponPanel(state.bossDashboard.actions);
      }
    }
    appendLog(
      restored ? "Boss melee restored" : "Boss melee restore skipped",
      `${actionLabel}${payload && payload.spentRubles ? ` · ${formatNumber(payload.spentRubles)} ₽` : ""}${payload && payload.message ? `: ${payload.message}` : ""}`,
    );
    await Promise.all([
      handleBossDashboard({ fast: true, silent: true, showStatus: false }),
      handleBossStateRefresh({ fast: true, silent: true, showStatus: false }),
      handleEconomyRefresh(),
    ]);
    setServerStatus(cooldownReady ? "ready" : "restore failed", cooldownReady ? "ok" : "error");
  } catch (error) {
    appendLog("Boss melee restore failed", `${actionLabel}: ${error.message || "error"}`);
    setServerStatus("restore error", "error");
    appendDiagnosticError("bosses", error);
  } finally {
    state.bossMeleeRestoreRunning.delete(weapon);
    if (state.bossDashboard && Array.isArray(state.bossDashboard.actions)) {
      renderBossWeaponPanel(state.bossDashboard.actions);
    }
  }
}

async function handleBossWeaponPanelClick(event) {
  const buyTrigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-weapon-buy")
    : null;
  if (buyTrigger) {
    await handleBossWeaponBuyClick(buyTrigger);
    return;
  }

  const restoreTrigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-melee-restore")
    : null;
  if (restoreTrigger) {
    await handleBossMeleeRestoreClick(restoreTrigger);
    return;
  }

  const trigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-weapon-hit")
    : null;
  if (!trigger) {
    return;
  }

  const row = trigger.closest(".boss-weapon-pill");
  const countSelect = row ? row.querySelector(".js-boss-weapon-count") : null;
  const weapon = String(trigger.dataset.weapon || "").trim();
  const count = Number(countSelect ? countSelect.value : 1);
  const availableCount = Math.max(0, Number(trigger.dataset.availableCount || 0));
  const isMelee = BOSS_MELEE_ACTION_KEYS.has(weapon);
  const isConsumable = BOSS_WEAPON_ACTION_KEYS.has(weapon);
  const hasValidCount = isMelee ? count === 1 : BOSS_WEAPON_BATCH_COUNTS.includes(count);
  if ((!isMelee && !isConsumable) || !hasValidCount) {
    appendLog("Boss weapon hit failed", "Некорректное оружие или множитель");
    return;
  }
  const actionLabel = getBossCombatActionLabel(weapon);
  if (isConsumable && count > availableCount) {
    appendLog(
      "Boss weapon hit skipped",
      `${actionLabel}: нужно ${formatNumber(count)}, в наличии ${formatNumber(availableCount)}`,
    );
    setServerStatus("not enough weapons", "error");
    return;
  }

  const initialLabel = trigger.textContent || "Пробить";
  trigger.disabled = true;
  if (countSelect) {
    countSelect.disabled = true;
  }
  trigger.textContent = isMelee ? "Бью…" : `Пробиваю ×${count}`;
  setServerStatus(`weapon ${weapon} x${count}`, "busy");

  try {
    const payload = await apiRequest("POST", "/api/bosses/use-weapon", { weapon, count });
    renderBossResult(payload);
    const hit = payload && Array.isArray(payload.cycles) && payload.cycles[0]
      && Array.isArray(payload.cycles[0].hits)
      ? payload.cycles[0].hits[0] || null
      : null;
    const ok = Boolean(hit && hit.ok);
    appendLog(
      ok ? "Boss weapon hit" : "Boss weapon hit failed",
      `${actionLabel}${isMelee ? "" : ` ×${formatNumber(count)}`}${hit && hit.message ? `: ${hit.message}` : ""}`,
    );
    appendBossClaimRewardLog(payload, hit && hit.snapshot ? hit.snapshot : {});
    scheduleBossRewardSettlementLogRefresh(payload);
    await Promise.all([
      handleBossDashboard({ fast: true, silent: true, showStatus: false }),
      handleBossStateRefresh({ silent: true, showStatus: false }),
      handleEconomyRefresh(),
    ]);
    setServerStatus(ok ? "ready" : "weapon hit failed", ok ? "ok" : "error");
  } catch (error) {
    appendLog("Boss weapon hit failed", error.message || "error");
    setServerStatus("weapon hit error", "error");
    appendDiagnosticError("bosses", error);
  } finally {
    if (trigger.isConnected) {
      trigger.disabled = false;
      trigger.textContent = initialLabel;
    }
    if (countSelect && countSelect.isConnected) {
      countSelect.disabled = false;
    }
  }
}

function applyBossWeaponDelta(weaponDelta) {
  if (!weaponDelta || !weaponDelta.measured || !weaponDelta.after) {
    return false;
  }
  if (state.economy && state.economy.weapons) {
    for (const [key, count] of Object.entries(weaponDelta.after)) {
      state.economy.weapons[key] = {
        ...(state.economy.weapons[key] || {}),
        count: Number(count || 0),
      };
    }
    renderDashboardResources();
  }
  if (state.bossDashboard) {
    state.bossDashboard.actions = (state.bossDashboard.actions || []).map((action) => (
      Object.hasOwn(weaponDelta.after, action.key)
        ? {
            ...action,
            count: Number(weaponDelta.after[action.key] || 0),
            available: Number(weaponDelta.after[action.key] || 0) > 0,
          }
        : action
    ));
    const weaponStats = state.bossDashboard.activeSession
      && state.bossDashboard.activeSession.weaponStatsEffective;
    if (weaponStats) {
      weaponStats.counts = {
        ...(weaponStats.counts || {}),
        ...weaponDelta.after,
      };
    }
    renderBossWeaponPanel(state.bossDashboard.actions);
    renderBossAttackQueue();
  }
  return true;
}

function buildBossRuntimeSnapshotFromDashboard(payload) {
  const active = payload && payload.activeSession && typeof payload.activeSession === "object"
    ? payload.activeSession
    : null;
  const session = active && active.session && typeof active.session === "object"
    ? active.session
    : null;
  if (!active || !session) {
    return null;
  }

  const currentHp = pickBossLiveNumber(session.currentHp);
  const isCompleted = Boolean(session.isCompleted) || (currentHp !== null && currentHp <= 0);
  const hasSession = Boolean(active.sessionActive !== false && !isCompleted);
  const activeBoss = active.activeBoss && typeof active.activeBoss === "object"
    ? active.activeBoss
    : {};
  const meleeCooldowns = session.meleeCooldowns && typeof session.meleeCooldowns === "object"
    ? session.meleeCooldowns
    : active.meleeCooldowns && typeof active.meleeCooldowns === "object"
      ? active.meleeCooldowns
      : {};

  return {
    summary: {
      ok: true,
      stateReliable: true,
      stateUnknown: false,
      unknownReason: null,
      bossId: pickBossLiveNumber(session.bossId, activeBoss.id),
      sessionId: pickBossLiveString(session.sessionId),
      hasSession,
      hasReward: Boolean(active.claimReady && !hasSession),
      rewardReady: Boolean(active.claimReady && !hasSession),
      rewardClaimed: Boolean(session.rewardClaimed),
      isCompleted,
      currentHp,
      baseHp: pickBossLiveNumber(session.baseHp, activeBoss.baseHp),
      maxHp: pickBossLiveNumber(session.maxHp, session.baseHp, activeBoss.baseHp),
      mode: pickBossLiveString(session.mode),
      personalDamage: pickBossLiveNumber(session.personalDamage, session.personalRawDamage),
      friendDamageItemsCount: pickBossLiveNumber(active.friendDamage && active.friendDamage.itemsCount, 0),
      rewardStatus: active.claimReady && !hasSession ? "ready" : null,
      rewardBossId: active.claimReady && !hasSession ? pickBossLiveNumber(session.bossId, activeBoss.id) : null,
      rewardSessionId: active.claimReady && !hasSession ? pickBossLiveString(session.sessionId) : null,
      rewardReadyAt: null,
      rewardRetryAfterMs: null,
      endsAt: pickBossLiveString(session.endsAt),
      title: pickBossLiveString(session.title, activeBoss.title),
      meleeCooldowns,
    },
  };
}

function syncBossStateFromDashboard(payload) {
  const snapshot = buildBossRuntimeSnapshotFromDashboard(payload);
  if (!snapshot || !snapshot.summary) {
    return false;
  }

  const previousSnapshot = state.bossState && state.bossState.snapshot
    ? state.bossState.snapshot
    : null;
  state.bossState = {
    ...(state.bossState || {}),
    snapshot: mergeBossRuntimeSnapshots(previousSnapshot, snapshot),
  };
  return true;
}

function renderBossDashboard(payload, options = {}) {
  if (payload && Object.prototype.hasOwnProperty.call(payload, "comboLibrary")) {
    applyBossComboLibrary(payload.comboLibrary);
  }
  state.bossDashboard = payload;
  syncBossStateFromDashboard(payload);
  applyBossAutomationState(payload && payload.automation ? payload.automation : null, {
    syncControls: true,
    syncLocalTimer: true,
    renderQueue: false,
    syncQueue: options.syncQueue === true,
  });
  removeUnavailableBossRunQueueCombos();
  populateBossSelect();
  applySavedZarubaCombosToBossRunQueue();
  renderBossDashboardSummary(payload);
  renderBossCollectionOverview(payload.rewards);

  renderBossWeaponPanel(payload.actions);
  renderBossCatalog(payload);

  populateBossAttackSelect();
  populateBossComboDialogBossSelect();
  populateBossComboDialogModeSelect();
  renderSelectedBossCollectionCounters();
  updateBossSelectedKeyControls();
  if ($("#boss-combo-dialog") && $("#boss-combo-dialog").open) {
    refreshBossComboDialogMeta({ fillTextarea: false });
  }
  renderBossRunQueueExcludeList();
  renderBossRunQueue();
  renderBossAttackQueue();
  renderBossFightBars();
  renderBossLiveSummary();
}

function renderBossCatalog(payload = state.bossDashboard) {
  if (!payload) {
    return;
  }
  const queue = payload.queue;
  const catalogBosses = getAllBossCatalogItems(Array.isArray(queue && queue.bosses) ? queue.bosses : []);
  const categoryFilter = getBossCatalogBrowserCategoryFilter();
  const statusFilter = getBossCatalogBrowserStatusFilter();
  const visibleBosses = filterBossCatalogBrowserItems(catalogBosses, {
    categoryFilter,
    statusFilter,
    rewards: payload.rewards,
  });
  const sections = buildBossCatalogSections(
    visibleBosses,
    categoryFilter === "all" ? "" : categoryFilter,
  );
  renderBossCatalogCategoryNav(catalogBosses);
  renderStatGrid($("#boss-queue-summary"), [
    { label: "Visible", value: formatNumber(visibleBosses.length) },
    { label: "Startable", value: formatNumber(visibleBosses.filter((item) => isBossCatalogStartable(item)).length) },
    { label: "Need keys", value: formatNumber(visibleBosses.filter((item) => item.canStart && !item.hasEnoughKeys).length) },
    { label: "Blocked", value: formatNumber(visibleBosses.filter((item) => !item.canStart).length) },
  ]);

  const catalogBody = $("#boss-queue-body");
  if (!catalogBody) {
    return;
  }
  const expandedRewardBossIds = getOpenBossCatalogRewardIds(catalogBody);
  const rows = sections.flatMap((section) => {
    const rows = section.items.map((item) => {
      const purchaseCount = resolveBossKeyPurchaseCount(item);
      const canBuyKeys = purchaseCount > 0 && canBuyBossKeys(item);
      const comboCell = renderBossComboModeMarks(resolveBossComboModes(item), item.id);
      const catalogHp = resolveBossModeHp(item.baseHp, DEFAULT_BOSS_MODE);
      const catalogHpLabel = catalogHp === null ? "" : `HP ${formatBossPacanskyHp(catalogHp)}`;
      const actionCell = canBuyKeys
        ? `
          <button
            class="action-button action-button-ghost action-button-mini js-boss-buy-key"
            type="button"
            data-boss-id="${escapeHtml(String(item.id))}"
            data-count="${escapeHtml(String(purchaseCount))}"
          >
            Buy x${escapeHtml(formatNumber(purchaseCount))}
          </button>
        `
        : `<span class="muted">-</span>`;
      return `
        <tr>
          <td>
            <span class="boss-name-cell">
              ${renderBossAvatar(item)}
              <span>
                <span>${escapeHtml(item.title)}</span>
                ${catalogHpLabel
                  ? `<span class="boss-name-meta" title="${escapeHtml(`Пацанский режим: HP ${formatNumber(catalogHp)}`)}">${escapeHtml(catalogHpLabel)}</span>`
                  : ""}
              </span>
            </span>
          </td>
          <td>${comboCell}</td>
          <td>${renderBossCatalogCollectionCell(item, { expanded: expandedRewardBossIds.has(String(item.id)) })}</td>
          <td>${escapeHtml(formatBossKeyRequirement(item))}</td>
          <td>${escapeHtml(`${formatOptionalNumber(item.usedToday)} / ${formatOptionalNumber(item.dailyLimit)}`)}</td>
          <td>${item.canStart
            ? item.hasEnoughKeys
              ? buildBadge("startable", "success")
              : buildBadge(`missing keys: ${formatNumber(item.keysMissing || 0)}`, "neutral")
            : buildBadge(formatBossBlockedReason(item.blockedReason), "danger")}</td>
          <td>${actionCell}</td>
        </tr>
      `;
    });

    return [
      `<tr class="section-row"><td colspan="7">${escapeHtml(section.label)}</td></tr>`,
      ...rows,
    ];
  });
  catalogBody.innerHTML = rows.length > 0
    ? rows.join("")
    : `<tr><td colspan="7" class="boss-catalog-empty">По выбранным фильтрам боссов нет.</td></tr>`;
  bindBossAvatarFallbacks(catalogBody);
}

const BOSS_CLAIM_REWARD_CONTAINER_KEYS = [
  "response",
  "data",
  "payload",
  "result",
  "claim",
  "claimResponse",
  "claimResult",
  "rewardPayload",
  "rewardResponse",
  "rewardResult",
  "autoHit",
  "startResult",
  "settle",
  "settlement",
  "finalReward",
];

function isBossRewardObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasBossClaimRewardFields(source) {
  if (!isBossRewardObject(source)) {
    return false;
  }
  return Boolean(
    Array.isArray(source.reward)
    || Array.isArray(source.items)
    || Array.isArray(source.tattoos)
    || Array.isArray(source.clothing)
    || Array.isArray(source.cameras)
    || Array.isArray(source.stashGearReward)
    || Array.isArray(source.stashGear)
    || Array.isArray(source.currencies)
    || Array.isArray(source.weapons)
    || isBossRewardObject(source.weapons)
    || isBossRewardObject(source.globalReward)
    || source.authority !== undefined
    || source.keys !== undefined
    || source.stashCount !== undefined
  );
}

function normalizeBossClaimRewardPayload(source) {
  if (!source || typeof source !== "object") {
    return null;
  }
  const responseData = source.response && source.response.data && typeof source.response.data === "object"
    ? source.response.data
    : source.data && typeof source.data === "object"
      ? source.data
      : null;
  if (responseData && responseData.rewards && typeof responseData.rewards === "object") {
    return responseData.rewards;
  }
  if (hasBossClaimRewardFields(responseData)) {
    return responseData;
  }
  if (source.rewards && typeof source.rewards === "object") {
    return source.rewards;
  }
  return hasBossClaimRewardFields(source) ? source : null;
}

function collectBossClaimRewardPayloads(source) {
  const result = [];
  const seenObjects = new WeakSet();
  const seenPayloads = new WeakSet();

  const appendPayload = (payload) => {
    if (!isBossRewardObject(payload) || seenPayloads.has(payload)) {
      return;
    }
    seenPayloads.add(payload);
    result.push(payload);
  };

  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item));
      return;
    }
    if (!isBossRewardObject(value) || seenObjects.has(value)) {
      return;
    }
    seenObjects.add(value);
    appendPayload(normalizeBossClaimRewardPayload(value));
    if (isBossRewardObject(value.rewards)) {
      return;
    }
    for (const key of BOSS_CLAIM_REWARD_CONTAINER_KEYS) {
      visit(value[key]);
    }
  };

  visit(source);
  return result;
}

function getBossClaimRewardsForDisplay(source) {
  return collectBossClaimRewardPayloads(source)[0] || null;
}

function collectBossRewardWearableEntries(rewards) {
  const result = [];
  const appendItems = (items, fallbackType) => {
    if (!Array.isArray(items)) {
      return;
    }
    for (const item of items) {
      if (item && typeof item === "object") {
        result.push({ item, fallbackType });
      }
    }
  };

  appendItems(rewards.reward, "reward");
  appendItems(rewards.items, "reward");
  appendItems(rewards.tattoos, "tattoo");
  appendItems(rewards.clothing, "clothing");
  appendItems(rewards.cameras, "camera");
  return result;
}

function collectBossRewardWeaponsForDisplay(rewards) {
  if (Array.isArray(rewards.weapons)) {
    return rewards.weapons;
  }
  if (isBossRewardObject(rewards.weapons)) {
    return Object.entries(rewards.weapons)
      .map(([type, amount]) => ({ type, amount }))
      .filter((item) => Number(item.amount) !== 0);
  }
  return [];
}

function formatBossClaimRewardItem(item, fallbackLabel) {
  if (!item || typeof item !== "object") {
    return null;
  }
  const type = String(item.type || item.kind || fallbackLabel || "item").trim() || "item";
  const id = item.id ?? item.itemId ?? item.tattooId ?? item.clothingId ?? item.cameraId ?? item.rewardId ?? item.gearId ?? item.weaponId ?? null;
  const name = String(item.name || item.title || "").trim();
  const amount = Number(item.amount ?? item.qty ?? item.count);
  const label = name || `${type}${id === null || id === undefined || id === "" ? "" : ` #${id}`}`;
  return Number.isFinite(amount) && amount > 1
    ? `${label} x${formatNumber(amount)}`
    : label;
}

function formatBossClaimRewardSummary(source) {
  const rewardPayloads = collectBossClaimRewardPayloads(source);
  if (rewardPayloads.length === 0) {
    return source && source.ok === false ? "не удалось получить награду" : "награда получена, состав не указан";
  }

  const parts = [];
  const appendPart = (part) => {
    if (part && !parts.includes(part)) {
      parts.push(part);
    }
  };

  for (const rewards of rewardPayloads) {
    const uniqueItems = collectBossRewardWearableEntries(rewards)
      .map(({ item, fallbackType }) => formatBossClaimRewardItem(item, fallbackType))
      .filter(Boolean);
    if (uniqueItems.length > 0) {
      appendPart(`предметы: ${uniqueItems.join(", ")}`);
    }

    const stashGear = Array.isArray(rewards.stashGearReward)
      ? rewards.stashGearReward
      : Array.isArray(rewards.stashGear)
        ? rewards.stashGear
        : [];
    const gear = stashGear
      .map((item) => formatBossClaimRewardItem(item, "gear"))
      .filter(Boolean);
    if (gear.length > 0) {
      appendPart(`нычка: ${gear.join(", ")}`);
    }

    const globalReward = rewards.globalReward && typeof rewards.globalReward === "object"
      ? rewards.globalReward
      : rewards;
    const authority = Number(globalReward.authority);
    const keys = Number(globalReward.keys);
    if (Number.isFinite(authority) && authority !== 0) {
      appendPart(`авторитет +${formatNumber(authority)}`);
    }
    if (Number.isFinite(keys) && keys !== 0) {
      appendPart(`ключи +${formatNumber(keys)}`);
    }
    const currencies = Array.isArray(globalReward.currencies) ? globalReward.currencies : [];
    const currencySummary = currencies.map((currency) => {
      if (!currency || typeof currency !== "object") {
        return null;
      }
      const type = String(currency.type || currency.currency || currency.name || "currency").trim() || "currency";
      const amount = Number(currency.amount ?? currency.qty ?? currency.count);
      return Number.isFinite(amount)
        ? `${getBossComboResourceLabel(type)} +${formatNumber(amount)}`
        : getBossComboResourceLabel(type);
    }).filter(Boolean);
    currencySummary.forEach(appendPart);

    const weapons = collectBossRewardWeaponsForDisplay(rewards)
      .map((weapon) => formatBossClaimRewardItem(weapon, "weapon"))
      .filter(Boolean);
    if (weapons.length > 0) {
      appendPart(`оружие: ${weapons.join(", ")}`);
    }
  }

  return parts.length > 0 ? parts.join(" | ") : "награда получена, состав не указан";
}

function formatBossComboRewardSummary(reward) {
  if (!reward || typeof reward !== "object") {
    return "награда за комбо получена";
  }

  const parts = [];
  const items = (Array.isArray(reward.items) ? reward.items : [])
    .map((item) => formatBossClaimRewardItem(item, "collection item"))
    .filter(Boolean);
  if (items.length > 0) {
    parts.push(`предметы: ${items.join(", ")}`);
  }

  const stashGear = (Array.isArray(reward.stashGear) ? reward.stashGear : [])
    .map((item) => formatBossClaimRewardItem(item, "stash"))
    .filter(Boolean);
  if (stashGear.length > 0) {
    parts.push(`нычка: ${stashGear.join(", ")}`);
  }
  const stashCount = Number(reward.stashCount);
  if (Number.isFinite(stashCount) && stashCount !== 0) {
    parts.push(`нычки +${formatNumber(stashCount)}`);
  }

  const authority = Number(reward.authority);
  const keys = Number(reward.keys);
  if (Number.isFinite(authority) && authority !== 0) {
    parts.push(`авторитет +${formatNumber(authority)}`);
  }
  if (Number.isFinite(keys) && keys !== 0) {
    parts.push(`ключи +${formatNumber(keys)}`);
  }

  const currencies = (Array.isArray(reward.currencies) ? reward.currencies : [])
    .map((currency) => {
      if (!currency || typeof currency !== "object") {
        return null;
      }
      const type = String(currency.type || currency.currency || currency.name || "currency").trim() || "currency";
      const amount = Number(currency.amount ?? currency.qty ?? currency.count);
      return Number.isFinite(amount)
        ? `${getBossComboResourceLabel(type)} +${formatNumber(amount)}`
        : getBossComboResourceLabel(type);
    })
    .filter(Boolean);
  parts.push(...currencies);

  const weapons = (Array.isArray(reward.weapons) ? reward.weapons : [])
    .map((weapon) => formatBossClaimRewardItem(weapon, "weapon"))
    .filter(Boolean);
  if (weapons.length > 0) {
    parts.push(`оружие: ${weapons.join(", ")}`);
  }

  return parts.length > 0 ? `комбо: ${parts.join(" | ")}` : "награда за комбо получена";
}

function findJournalWearableCatalogItem(type, itemId) {
  const normalizedType = String(type || "").trim().toLowerCase();
  const id = String(itemId ?? "").trim();
  if (!["tattoo", "clothing"].includes(normalizedType) || !id) {
    return null;
  }
  const bossRewardItems = (
    state.bossDashboard
    && state.bossDashboard.rewards
    && Array.isArray(state.bossDashboard.rewards.bosses)
      ? state.bossDashboard.rewards.bosses
      : []
  ).flatMap((boss) => [
    ...(Array.isArray(boss && boss.battleModes) ? boss.battleModes : []),
    ...(Array.isArray(boss && boss.comboModes) ? boss.comboModes : []),
  ]).flatMap((mode) => (Array.isArray(mode && mode.items) ? mode.items : []));
  const wearableItems = (
    state.wearableCollectionDashboard
    && Array.isArray(state.wearableCollectionDashboard.categories)
      ? state.wearableCollectionDashboard.categories
      : []
  ).flatMap((category) => (Array.isArray(category && category.groups) ? category.groups : []))
    .flatMap((group) => (Array.isArray(group && group.items) ? group.items : []));
  return [...bossRewardItems, ...wearableItems].find((item) => (
    String(item ? (item.id ?? item.tattooId ?? item.clothingId ?? "") : "").trim() === id
    && String(item && item.type || normalizedType).trim().toLowerCase() === normalizedType
  )) || null;
}

function mergeJournalRewardItems(items) {
  const merged = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const key = String(item.key || `${item.type || "reward"}:${item.id || item.label || merged.size}`);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...item, key });
      continue;
    }
    const nextAmount = Number(existing.amount || 0) + Number(item.amount || 0);
    merged.set(key, {
      ...existing,
      ...item,
      key,
      amount: Number.isFinite(nextAmount) && nextAmount !== 0 ? nextAmount : item.amount,
      imageUrl: item.imageUrl || existing.imageUrl || "",
    });
  }
  return [...merged.values()];
}

function bossJournalWearableRewardItem(item, fallbackType = "reward") {
  if (!item || typeof item !== "object") {
    return null;
  }
  const type = String(item.type || item.kind || fallbackType || "reward").trim().toLowerCase();
  const id = item.id ?? item.tattooId ?? item.clothingId ?? item.rewardId ?? item.gearId ?? null;
  const catalogItem = findJournalWearableCatalogItem(type, id);
  const name = String(
    item.name
    || item.title
    || catalogItem && (catalogItem.name || catalogItem.setName)
    || (type === "tattoo" ? `Наколка #${id || "?"}` : type === "clothing" ? `Вещь #${id || "?"}` : type),
  ).trim();
  const amount = Math.max(1, Number(item.amount ?? item.qty ?? item.count) || 1);
  return {
    key: `${type}:${id ?? name}`,
    type,
    id,
    label: name,
    amount,
    imageUrl: String(
      item.image
      || item.imageUrl
      || item.previewUrl
      || catalogItem && (catalogItem.image || catalogItem.imageUrl || catalogItem.previewUrl)
      || "",
    ),
    symbol: type === "tattoo" ? "✦" : type === "clothing" ? "★" : "◆",
    title: catalogItem && catalogItem.setName ? `${name} · ${catalogItem.setName}` : name,
  };
}

function collectBossClaimJournalRewardItems(source) {
  const rewardPayloads = collectBossClaimRewardPayloads(source);
  if (rewardPayloads.length === 0) {
    return [];
  }
  const result = [];

  for (const rewards of rewardPayloads) {
    result.push(
      ...collectBossRewardWearableEntries(rewards)
        .map(({ item, fallbackType }) => bossJournalWearableRewardItem(item, fallbackType))
        .filter(Boolean),
    );

    const stashGear = Array.isArray(rewards.stashGearReward)
      ? rewards.stashGearReward
      : Array.isArray(rewards.stashGear)
        ? rewards.stashGear
        : [];

    const globalReward = rewards.globalReward && typeof rewards.globalReward === "object"
      ? rewards.globalReward
      : rewards;
    const authority = Number(globalReward.authority);
    const keys = Number(globalReward.keys);
    if (Number.isFinite(authority) && authority !== 0) {
      result.push({
        key: "currency:authority",
        type: "currency",
        label: CURRENCY_LABELS.authority,
        amount: authority,
        imageUrl: CURRENCY_ICON_URLS.authority,
      });
    }
    if (Number.isFinite(keys) && keys !== 0) {
      result.push({
        key: "boss:keys",
        type: "keys",
        label: "Ключи",
        amount: keys,
        symbol: "◆",
      });
    }
    for (const currency of Array.isArray(globalReward.currencies) ? globalReward.currencies : []) {
      const key = String(currency && (currency.type || currency.currency || currency.name) || "currency").trim();
      const amount = Number(currency && (currency.amount ?? currency.qty ?? currency.count));
      result.push({
        key: `currency:${key}`,
        type: "currency",
        label: getBossComboResourceLabel(key),
        amount: Number.isFinite(amount) ? amount : 1,
        imageUrl: getBossComboResourceIconUrl(key),
        symbol: "◆",
      });
    }
    for (const weapon of collectBossRewardWeaponsForDisplay(rewards)) {
      const key = String(weapon && (weapon.type || weapon.weaponType || weapon.name) || "weapon").trim().toLowerCase();
      result.push({
        key: `weapon:${key}`,
        type: "weapon",
        label: BOSS_WEAPON_LABELS[key] || String(weapon && (weapon.name || weapon.title) || key),
        amount: Math.max(1, Number(weapon && (weapon.amount ?? weapon.qty ?? weapon.count)) || 1),
        imageUrl: BOSS_WEAPON_ICON_URLS[key] || "",
        symbol: "⚔",
      });
    }
    const explicitStashCount = Number(rewards.stashCount);
    const stashCount = Number.isFinite(explicitStashCount) && explicitStashCount > 0
      ? explicitStashCount
      : stashGear.reduce(
          (total, item) => total + Math.max(1, Number(item && (item.amount ?? item.qty ?? item.count)) || 1),
          0,
        );
    if (stashCount > 0) {
      result.push({
        key: "stash:count",
        type: "stash",
        label: "Нычки",
        amount: stashCount,
        imageUrl: BOSS_STASH_ICON_URL,
        symbol: "▣",
      });
    }
  }
  return mergeJournalRewardItems(result);
}

function getBossClaimOk(source) {
  if (!source || typeof source !== "object") {
    return false;
  }
  return Boolean(
    source.claimOk
    || source.ok === true && source.claim && source.claim.ok !== false
    || source.claim && source.claim.ok === true
  );
}

function getBossClaimSummaryCandidates(source, fallbackSummary = {}) {
  const candidates = [];
  const append = (value) => {
    if (value && typeof value === "object") {
      candidates.push(value);
    }
  };
  append(source && source.rewardActivity);
  append(source && source.rewardActivity && source.rewardActivity.item);
  append(source && source.item);
  append(source && source.startedItem);
  append(source && source.finalSnapshot && source.finalSnapshot.summary);
  append(source && source.snapshot && source.snapshot.summary);
  append(source && source.initialSnapshot && source.initialSnapshot.summary);
  append(source && source.claim && source.claim.snapshot);
  append(source && source.claim && source.claim.response && source.claim.response.data);
  append(source && source.rewards);
  append(source);
  append(fallbackSummary);
  return candidates;
}

function pickBossClaimSummaryValue(candidates, ...keys) {
  for (const candidate of candidates) {
    for (const key of keys) {
      const value = candidate && candidate[key];
      if (value !== undefined && value !== null && value !== "") {
        return value;
      }
    }
  }
  return null;
}

function buildBossClaimJournalKey(source, fallbackSummary = {}) {
  const candidates = getBossClaimSummaryCandidates(source, fallbackSummary);
  const sessionId = pickBossClaimSummaryValue(candidates, "rewardSessionId", "sessionId");
  return sessionId ? `boss-reward:${sessionId}` : undefined;
}

function buildBossRewardJournalSignature(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const key = String(
        item.key
        || `${item.type || "reward"}:${item.id ?? item.label ?? item.name ?? ""}`,
      ).trim().toLowerCase();
      const amount = Number(item.amount);
      return `${key}=${Number.isFinite(amount) ? amount : ""}`;
    })
    .sort()
    .join("|");
}

function getBossRewardJournalBossId(entry) {
  const structured = Number(
    entry && entry.bossRewardBossId
    || entry && entry.bossActivity && entry.bossActivity.rewards && entry.bossActivity.rewards.bossId
    || entry && entry.bossActivity && entry.bossActivity.item && entry.bossActivity.item.bossId,
  );
  if (Number.isFinite(structured) && structured > 0) {
    return structured;
  }
  const match = /Награда босса\s*#(\d+)/i.exec(String(entry && entry.message || ""));
  return match ? Number(match[1]) : null;
}

function getBossRewardJournalQueueItemId(entry) {
  return String(
    entry && entry.bossRewardQueueItemId
    || entry && entry.bossActivity && entry.bossActivity.item && entry.bossActivity.item.queueItemId
    || "",
  ).trim();
}

function findDuplicateBossRewardJournalEntryIndex(entries, target, options = {}) {
  const targetBossId = getBossRewardJournalBossId(target);
  const targetQueueItemId = getBossRewardJournalQueueItemId(target);
  const targetSignature = String(
    target && target.bossRewardSignature
    || buildBossRewardJournalSignature(target && target.rewardItems),
  );
  const targetAtMs = Date.parse(target && target.at || "");
  const requestedWindowMs = Number(options.windowMs);
  const windowMs = Number.isFinite(requestedWindowMs) && requestedWindowMs >= 0
    ? requestedWindowMs
    : 1_500;
  if (!targetBossId || !targetSignature || !Number.isFinite(targetAtMs)) {
    return -1;
  }

  let bestIndex = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const [index, entry] of (Array.isArray(entries) ? entries : []).entries()) {
    if (!entry || entry.key === options.excludeKey || entry.source !== "bosses" || entry.kind !== "reward") {
      continue;
    }
    if (options.localOnly === true && entry.bossActivity) {
      continue;
    }
    if (options.activityOnly === true && !entry.bossActivity) {
      continue;
    }
    if (getBossRewardJournalBossId(entry) !== targetBossId) {
      continue;
    }
    const entryQueueItemId = getBossRewardJournalQueueItemId(entry);
    if (targetQueueItemId && entryQueueItemId && entryQueueItemId !== targetQueueItemId) {
      continue;
    }
    const sameQueueItem = Boolean(
      targetQueueItemId
      && entryQueueItemId
      && entryQueueItemId === targetQueueItemId,
    );
    const signature = String(
      entry.bossRewardSignature
      || buildBossRewardJournalSignature(entry.rewardItems),
    );
    if (signature !== targetSignature) {
      continue;
    }
    const atMs = Date.parse(entry.at || "");
    const distance = Math.abs(atMs - targetAtMs);
    if (Number.isFinite(distance) && (sameQueueItem || distance <= windowMs) && distance < bestDistance) {
      bestIndex = index;
      bestDistance = distance;
    }
  }
  return bestIndex;
}

function appendBossClaimRewardLog(source, fallbackSummary = {}, options = {}) {
  const claimedRewards = collectBossClaimJournalRewardItems(source);
  const claimOk = getBossClaimOk(source);
  if (claimedRewards.length === 0 && !claimOk) {
    return null;
  }
  const candidates = getBossClaimSummaryCandidates(source, fallbackSummary);
  const bossId = pickBossClaimSummaryValue(candidates, "rewardBossId", "bossId");
  const bossRewardQueueItemId = String(pickBossClaimSummaryValue(candidates, "queueItemId") || "").trim();
  const at = options.at || new Date().toISOString();
  const bossRewardSignature = buildBossRewardJournalSignature(claimedRewards);
  const existingActivityIndex = findDuplicateBossRewardJournalEntryIndex(state.logs, {
    at,
    source: "bosses",
    kind: "reward",
    bossRewardBossId: bossId,
    bossRewardQueueItemId,
    bossRewardSignature,
  }, { activityOnly: true });
  if (existingActivityIndex >= 0) {
    return state.logs[existingActivityIndex];
  }
  return appendLog(
    `Награда босса #${bossId || "?"}`,
    formatBossClaimRewardSummary(source),
    {
      key: options.key || buildBossClaimJournalKey(source, fallbackSummary),
      source: "bosses",
      kind: "reward",
      rewardItems: claimedRewards,
      rewardLabel: "Награда за бой",
      bossRewardBossId: bossId,
      bossRewardQueueItemId,
      bossRewardSignature,
      at,
    },
  );
}

function getPendingBossRewardSettlement(source) {
  if (!source || typeof source !== "object") {
    return null;
  }
  if (source.rewardSettlement && source.rewardSettlement.pending) {
    return source.rewardSettlement.background || source.rewardSettlement;
  }
  for (const key of ["result", "autoHit", "settle", "settlement"]) {
    const pending = getPendingBossRewardSettlement(source[key]);
    if (pending) {
      return pending;
    }
  }
  return null;
}

function scheduleBossRewardSettlementLogRefresh(source) {
  const pending = getPendingBossRewardSettlement(source);
  if (!pending) {
    return false;
  }
  for (const timerId of state.bossAuto.rewardSettlementTimers || []) {
    clearTimeout(timerId);
  }
  state.bossAuto.pendingReward = pending;
  state.bossAuto.rewardSettlementTimers = [300, 1_000, 2_500, 5_000, 10_000, 20_000, 40_000, 80_000]
    .map((delayMs) => setTimeout(() => {
      if (!state.bossAuto.pendingReward) {
        return;
      }
      void refreshBossAutomationOnly().catch(() => {});
    }, delayMs));
  return true;
}

function collectBossComboJournalRewardItems(source) {
  return mergeJournalRewardItems(
    getBossComboRewardsForDisplay(source)
      .flatMap((reward) => collectBossClaimJournalRewardItems(reward)),
  );
}

function isBossCooldownActiveAt(cooldown, nowMs = Date.now()) {
  if (!cooldown || typeof cooldown !== "object" || cooldown.active === false) {
    return false;
  }
  const readyAtMs = Date.parse(cooldown.readyAt || "");
  if (Number.isFinite(readyAtMs)) {
    return readyAtMs > Number(nowMs || Date.now());
  }
  const remainingMs = Number(cooldown.remainingMs);
  if (Number.isFinite(remainingMs)) {
    return remainingMs > 0;
  }
  return cooldown.active === true;
}

function isSameBossRuntimeSnapshot(previousSnapshot, incomingSnapshot) {
  const previous = previousSnapshot && previousSnapshot.summary;
  const incoming = incomingSnapshot && incomingSnapshot.summary;
  if (!previous || !incoming) {
    return false;
  }

  const previousSessionId = pickBossLiveString(previous.sessionId);
  const incomingSessionId = pickBossLiveString(incoming.sessionId);
  if (previousSessionId || incomingSessionId) {
    return Boolean(
      previousSessionId
      && incomingSessionId
      && previousSessionId === incomingSessionId
    );
  }

  const previousBossId = pickBossLiveNumber(previous.bossId);
  const incomingBossId = pickBossLiveNumber(incoming.bossId);
  const previousEndsAt = pickBossLiveString(previous.endsAt);
  const incomingEndsAt = pickBossLiveString(incoming.endsAt);
  return previousBossId !== null
    && incomingBossId !== null
    && previousBossId === incomingBossId
    && Boolean(previousEndsAt)
    && previousEndsAt === incomingEndsAt;
}

function mergeBossRuntimeSnapshots(previousSnapshot, incomingSnapshot, nowMs = Date.now()) {
  if (!incomingSnapshot || !incomingSnapshot.summary) {
    return incomingSnapshot || previousSnapshot || null;
  }
  if (
    !previousSnapshot
    || !previousSnapshot.summary
    || !isSameBossRuntimeSnapshot(previousSnapshot, incomingSnapshot)
    || incomingSnapshot.summary.hasSession === false
    || incomingSnapshot.summary.isCompleted === true
  ) {
    return incomingSnapshot;
  }

  const previous = previousSnapshot.summary;
  const incoming = incomingSnapshot.summary;
  const summary = { ...incoming };
  const optimisticHitUntilMs = Date.parse(previous.optimisticHitUntil || "");
  if (
    Number.isFinite(optimisticHitUntilMs)
    && optimisticHitUntilMs > Number(nowMs || Date.now())
  ) {
    const previousHp = pickBossLiveNumber(previous.currentHp);
    const incomingHp = pickBossLiveNumber(incoming.currentHp);
    if (previousHp !== null || incomingHp !== null) {
      summary.currentHp = previousHp === null
        ? incomingHp
        : incomingHp === null
          ? previousHp
          : Math.min(previousHp, incomingHp);
    }

    const previousPersonalDamage = pickBossLiveNumber(previous.personalDamage);
    const incomingPersonalDamage = pickBossLiveNumber(incoming.personalDamage);
    if (previousPersonalDamage !== null || incomingPersonalDamage !== null) {
      summary.personalDamage = previousPersonalDamage === null
        ? incomingPersonalDamage
        : incomingPersonalDamage === null
          ? previousPersonalDamage
          : Math.max(previousPersonalDamage, incomingPersonalDamage);
    }
    summary.optimisticHitUntil = previous.optimisticHitUntil;
  }

  const previousCooldowns = previous.meleeCooldowns && typeof previous.meleeCooldowns === "object"
    ? previous.meleeCooldowns
    : {};
  const incomingCooldowns = incoming.meleeCooldowns && typeof incoming.meleeCooldowns === "object"
    ? incoming.meleeCooldowns
    : {};
  const meleeCooldowns = { ...incomingCooldowns };
  for (const [key, cooldown] of Object.entries(previousCooldowns)) {
    const incomingCooldown = incomingCooldowns[key];
    const clearUntilMs = Date.parse(cooldown && cooldown.clearUntil || "");
    if (
      Number.isFinite(clearUntilMs)
      && clearUntilMs > Number(nowMs || Date.now())
      && isBossCooldownActiveAt(incomingCooldown, nowMs)
    ) {
      meleeCooldowns[key] = {
        ...cooldown,
        active: false,
        readyAt: null,
        remainingMs: 0,
      };
      continue;
    }

    if (
      isBossCooldownActiveAt(cooldown, nowMs)
      && !isBossCooldownActiveAt(incomingCooldown, nowMs)
    ) {
      const readyAtMs = Date.parse(cooldown.readyAt || "");
      meleeCooldowns[key] = {
        ...cooldown,
        active: true,
        remainingMs: Number.isFinite(readyAtMs)
          ? Math.max(0, readyAtMs - Number(nowMs || Date.now()))
          : Math.max(0, Number(cooldown.remainingMs) || 0),
      };
    }
  }
  summary.meleeCooldowns = meleeCooldowns;

  return {
    ...incomingSnapshot,
    summary,
  };
}

function getBossSuccessfulResultHits(payload) {
  return (Array.isArray(payload && payload.cycles) ? payload.cycles : [])
    .flatMap((cycle) => (Array.isArray(cycle && cycle.hits) ? cycle.hits : []))
    .filter((hit) => (
      hit
      && (
        hit.ok === true
        || hit.progressed === true
        || getBossResultHitDamageDelta(hit) > 0
      )
    ));
}

function getBossResultHitDamageDelta(hit) {
  for (const value of [hit && hit.hpDelta, hit && hit.personalDamageDelta, hit && hit.directDamage]) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return 0;
}

function reconcileBossHitSnapshot(payload, previousSnapshot, actions = [], nowMs = Date.now()) {
  const incomingSnapshot = payload && (payload.finalSnapshot || payload.snapshot);
  const snapshot = mergeBossRuntimeSnapshots(previousSnapshot, incomingSnapshot, nowMs);
  const hits = getBossSuccessfulResultHits(payload);
  if (
    !snapshot
    || !snapshot.summary
    || hits.length === 0
    || snapshot.summary.hasSession === false
    || snapshot.summary.isCompleted === true
  ) {
    return snapshot;
  }

  const summary = { ...snapshot.summary };
  let currentHp = pickBossLiveNumber(summary.currentHp);
  let personalDamage = pickBossLiveNumber(summary.personalDamage);
  for (const hit of hits) {
    let damageDelta = getBossResultHitDamageDelta(hit);
    const hitPreviousHp = pickBossLiveNumber(hit.previousHp);
    const hitCurrentHp = pickBossLiveNumber(hit.currentHp);
    if (hitPreviousHp !== null) {
      damageDelta = Math.min(damageDelta, Math.max(0, hitPreviousHp));
    }
    if (hitCurrentHp !== null && (currentHp === null || hitCurrentHp < currentHp)) {
      currentHp = Math.max(0, hitCurrentHp);
    } else if (
      damageDelta > 0
      && hitPreviousHp !== null
      && (currentHp === null || currentHp >= hitPreviousHp)
    ) {
      currentHp = Math.max(0, hitPreviousHp - damageDelta);
    }

    const hitPreviousPersonalDamage = pickBossLiveNumber(hit.previousPersonalDamage);
    const hitPersonalDamage = pickBossLiveNumber(hit.personalDamage);
    if (
      hitPersonalDamage !== null
      && (personalDamage === null || hitPersonalDamage > personalDamage)
    ) {
      personalDamage = hitPersonalDamage;
    } else if (
      damageDelta > 0
      && hitPreviousPersonalDamage !== null
      && (personalDamage === null || personalDamage <= hitPreviousPersonalDamage)
    ) {
      personalDamage = hitPreviousPersonalDamage + damageDelta;
    }
  }
  if (currentHp !== null) {
    summary.currentHp = currentHp;
  }
  if (personalDamage !== null) {
    summary.personalDamage = personalDamage;
  }
  summary.optimisticHitUntil = new Date(
    Number(nowMs || Date.now()) + BOSS_HIT_SNAPSHOT_GRACE_MS,
  ).toISOString();

  const actionMap = new Map(
    (Array.isArray(actions) ? actions : [])
      .map((action) => [String(action && action.key || ""), action])
      .filter(([key]) => Boolean(key)),
  );
  const previousCooldowns = previousSnapshot
    && previousSnapshot.summary
    && previousSnapshot.summary.meleeCooldowns
    && typeof previousSnapshot.summary.meleeCooldowns === "object"
    ? previousSnapshot.summary.meleeCooldowns
    : {};
  const meleeCooldowns = summary.meleeCooldowns && typeof summary.meleeCooldowns === "object"
    ? { ...summary.meleeCooldowns }
    : {};
  for (const hit of hits) {
    const key = String(hit.type || "").trim();
    if (!BOSS_MELEE_ACTION_KEYS.has(key) || isBossCooldownActiveAt(meleeCooldowns[key], nowMs)) {
      continue;
    }
    const fallbackCooldownSec = typeof DEFAULT_BOSS_MELEE_COOLDOWN_MS === "number"
      ? Math.round(DEFAULT_BOSS_MELEE_COOLDOWN_MS / 1000)
      : 8 * 60 * 60;
    const action = actionMap.get(key);
    const cooldownSec = pickBossLiveNumber(
      action && action.cooldownSec,
      meleeCooldowns[key] && meleeCooldowns[key].cooldownSec,
      previousCooldowns[key] && previousCooldowns[key].cooldownSec,
      fallbackCooldownSec,
    );
    if (cooldownSec === null || cooldownSec <= 0) {
      continue;
    }
    const readyAtMs = Number(nowMs || Date.now()) + cooldownSec * 1000;
    meleeCooldowns[key] = {
      ...(previousCooldowns[key] || {}),
      ...(meleeCooldowns[key] || {}),
      active: true,
      cooldownSec,
      lastUsedAt: new Date(Number(nowMs || Date.now())).toISOString(),
      readyAt: new Date(readyAtMs).toISOString(),
      remainingMs: cooldownSec * 1000,
      optimisticUntil: new Date(
        Number(nowMs || Date.now()) + BOSS_HIT_SNAPSHOT_GRACE_MS,
      ).toISOString(),
      restorePriceRubles: Number(
        meleeCooldowns[key] && meleeCooldowns[key].restorePriceRubles
        || previousCooldowns[key] && previousCooldowns[key].restorePriceRubles
        || BOSS_FIXED_PRICES.restoreMelee,
      ),
    };
  }
  summary.meleeCooldowns = meleeCooldowns;

  return {
    ...snapshot,
    summary,
  };
}

function clearBossMeleeCooldownState(key) {
  const snapshot = state.bossState && state.bossState.snapshot;
  const summary = snapshot && snapshot.summary;
  if (!summary || !summary.meleeCooldowns || !summary.meleeCooldowns[key]) {
    return;
  }
  const nowMs = Date.now();
  state.bossState = {
    ...state.bossState,
    snapshot: {
      ...snapshot,
      summary: {
        ...summary,
        meleeCooldowns: {
          ...summary.meleeCooldowns,
          [key]: {
            ...summary.meleeCooldowns[key],
            active: false,
            lastUsedAt: null,
            clearedAt: new Date(nowMs).toISOString(),
            clearUntil: new Date(nowMs + BOSS_HIT_SNAPSHOT_GRACE_MS).toISOString(),
            readyAt: null,
            remainingMs: 0,
            optimisticUntil: null,
          },
        },
      },
    },
  };
}

function renderBossResult(payload) {
  state.bossResult = payload;
  if (payload && payload.weaponDelta) {
    applyBossWeaponDelta(payload.weaponDelta);
  }
  if (payload && (payload.finalSnapshot || payload.snapshot)) {
    const previousSnapshot = state.bossState && state.bossState.snapshot
      ? state.bossState.snapshot
      : null;
    state.bossState = {
      snapshot: reconcileBossHitSnapshot(
        payload,
        previousSnapshot,
        state.bossDashboard && Array.isArray(state.bossDashboard.actions)
          ? state.bossDashboard.actions
          : [],
      ),
    };
  }
  renderBossFightBars();
  renderBossLiveSummary();
  if (state.bossDashboard && Array.isArray(state.bossDashboard.actions)) {
    renderBossWeaponPanel(state.bossDashboard.actions);
  }
}

function getSavedAuthAccountLabel(account) {
  const name = account && account.nickname ? String(account.nickname) : "Аккаунт";
  const userId = account && account.selfUserId ? String(account.selfUserId) : "без ID";
  return `${name} · ID ${userId}${account && account.active ? " · текущий" : ""}`;
}

function updateSavedAuthAccountSwitchButtons() {
  const activeAccountId = state.savedAuthAccounts && state.savedAuthAccounts.activeAccountId
    ? String(state.savedAuthAccounts.activeAccountId)
    : "";
  [
    ["#auth-account-select", "#auth-switch-saved-btn"],
    ["#auth-gate-account-select", "#auth-gate-switch-saved-btn"],
  ].forEach(([selectSelector, buttonSelector]) => {
    const select = $(selectSelector);
    const button = $(buttonSelector);
    if (button) {
      button.disabled = !select || !select.value || select.value === activeAccountId;
    }
  });
}

function setSavedAuthAccountsNote(message, tone = "") {
  ["#auth-accounts-note", "#auth-gate-accounts-note"].forEach((selector) => {
    const target = $(selector);
    if (!target) {
      return;
    }
    target.textContent = message;
    if (tone) {
      target.dataset.tone = tone;
    } else {
      delete target.dataset.tone;
    }
  });
}

function renderSavedAuthAccounts(payload) {
  state.savedAuthAccounts = payload || { activeAccountId: null, count: 0, accounts: [] };
  const accounts = Array.isArray(state.savedAuthAccounts.accounts)
    ? state.savedAuthAccounts.accounts
    : [];
  const activeAccountId = state.savedAuthAccounts.activeAccountId
    ? String(state.savedAuthAccounts.activeAccountId)
    : "";
  const options = accounts.length > 0
    ? accounts.map((account) => ({
        value: account.accountId,
        label: getSavedAuthAccountLabel(account),
      }))
    : [{ value: "", label: "Сохранённых аккаунтов нет", disabled: true }];

  ["#auth-account-select", "#auth-gate-account-select"].forEach((selector) => {
    const select = $(selector);
    if (!select) {
      return;
    }
    const previousValue = select.value;
    syncSelectOptions(select, options);
    const preferredValue = accounts.some((account) => account.accountId === previousValue)
      ? previousValue
      : activeAccountId;
    select.value = preferredValue || (accounts[0] ? accounts[0].accountId : "");
  });

  const active = accounts.find((account) => account.accountId === activeAccountId);
  setSavedAuthAccountsNote(
    accounts.length > 0
      ? `Сохранено аккаунтов: ${formatNumber(accounts.length)}${active ? ` · сейчас ${active.nickname || "Аккаунт"} (ID ${active.selfUserId || "—"})` : ""}.`
      : "Сохранённых аккаунтов пока нет. Добавь InitData ниже.",
    accounts.length > 0 ? "ok" : "",
  );
  updateSavedAuthAccountSwitchButtons();
}

async function handleSavedAuthAccountsRefresh(options = {}) {
  try {
    const payload = await apiRequest("GET", "/api/auth/accounts");
    renderSavedAuthAccounts(payload);
    if (!options.silent) {
      appendLog("Список аккаунтов обновлён", formatNumber(payload.count || 0));
    }
    return payload;
  } catch (error) {
    setSavedAuthAccountsNote(error.message || "Не удалось загрузить сохранённые аккаунты.", "error");
    if (!options.silent) {
      appendLog("Auth accounts failed", error.message || "error");
    }
    throw error;
  }
}

async function handleSavedAuthAccountSwitch(options = {}) {
  const select = options.gate ? $("#auth-gate-account-select") : $("#auth-account-select");
  const accountId = select ? select.value : "";
  if (!accountId) {
    setSavedAuthAccountsNote("Выбери сохранённый аккаунт.", "error");
    return null;
  }

  ["#auth-switch-saved-btn", "#auth-gate-switch-saved-btn"].forEach((selector) => {
    const button = $(selector);
    if (button) button.disabled = true;
  });
  setServerStatus("auth login", "busy");
  setSavedAuthAccountsNote("Проверяем сохранённую InitData и переключаем аккаунт…");
  try {
    const payload = await apiRequest("POST", "/api/auth/switch-account", { accountId });
    renderAuthStatus(payload);
    setSavedAuthAccountsNote("Аккаунт переключён. Перезагружаем данные…", "ok");
    appendLog("Auth account switched", payload && payload.auth && payload.auth.selfUserId || accountId);
    resetPageLoadRegistry();
    window.setTimeout(() => window.location.reload(), 450);
    return payload;
  } catch (error) {
    setServerStatus("auth login error", "error");
    setSavedAuthAccountsNote(error.message || "Сохранённая InitData больше не активна.", "error");
    updateSavedAuthAccountSwitchButtons();
    appendLog("Auth account switch failed", error.message || "error");
    return null;
  }
}

async function handleAuthPanelRefresh() {
  const results = await Promise.allSettled([
    handleAuthStatusRefresh(),
    handleSavedAuthAccountsRefresh(),
  ]);
  return results;
}

function collectAuthOptions() {
  const gateVisible = state.authGateActive && !$("#auth-gate")?.hidden;
  const initDataInput = gateVisible
    ? ($("#auth-gate-initdata") || $("#auth-initdata"))
    : ($("#auth-initdata") || $("#auth-gate-initdata"));
  return {
    initData: initDataInput ? initDataInput.value.trim() : "",
  };
}

function collectTokenAuthOptions() {
  const gateVisible = state.authGateActive && !$("#auth-gate")?.hidden;
  const accessTokenInput = gateVisible
    ? ($("#auth-gate-access-token") || $("#auth-access-token"))
    : ($("#auth-access-token") || $("#auth-gate-access-token"));
  const refreshTokenInput = gateVisible
    ? ($("#auth-gate-refresh-token") || $("#auth-refresh-token"))
    : ($("#auth-refresh-token") || $("#auth-gate-refresh-token"));
  return {
    accessToken: accessTokenInput ? accessTokenInput.value.trim() : "",
    refreshToken: refreshTokenInput ? refreshTokenInput.value.trim() : "",
  };
}

async function handleAuthStatusRefresh(options = {}) {
  const silent = Boolean(options.silent);
  const showStatus = options.showStatus !== false;
  if (showStatus) {
    setServerStatus("auth status", "busy");
  }
  if (state.authGateActive) {
    setAuthGateMessage("Проверяем авторизацию…");
  }

  try {
    const payload = await apiRequest("GET", "/api/auth/status");
    renderAuthStatus(payload);
    if (state.authGateActive) {
      if (isAuthStatusActive(payload)) {
        setAuthGateMessage("Сессия активна. Загружаем панель…", "ok");
        window.setTimeout(() => window.location.reload(), 350);
      } else {
        const reason = getAuthReasonLabel(payload.reason || (payload.auth && payload.auth.reason));
        setAuthGateMessage(`Нужен вход: ${reason}.`, "error");
      }
    }
    if (!silent) {
      appendLog("Auth status refreshed");
    }
    if (showStatus) {
      setServerStatus("ready", "ok");
    }
    return payload;
  } catch (error) {
    if (showStatus) {
      setServerStatus("auth status error", "error");
    }
    if (state.authGateActive) {
      setAuthGateMessage(error.message || "Ошибка проверки авторизации.", "error");
    }
    appendLog("Auth status failed", error.message || "error");
    throw error;
  }
}

async function handleAuthLogin() {
  const authOptions = collectAuthOptions();
  if (!authOptions.initData) {
    if (state.authGateActive) {
      setAuthGateMessage("Вставь InitData перед входом.", "error");
      $("#auth-gate-initdata")?.focus();
    } else {
      const note = $("#auth-status-note");
      if (note) {
        note.textContent = "Чтобы сменить аккаунт, вставь его InitData.";
        note.dataset.tone = "error";
      }
      $("#auth-initdata")?.focus();
    }
    return null;
  }
  setServerStatus("auth login", "busy");
  if (state.authGateActive) {
    setAuthGateControlsDisabled(true);
    setAuthGateMessage("Проверяем InitData и получаем токены…");
  }
  try {
    const payload = await apiRequest("POST", "/api/auth/login-initdata", {
      initData: authOptions.initData,
    });
    renderAuthStatus(payload);
    appendLog("Auth login", `InitData введена вручную (${formatNumber(authOptions.initData.length)} симв.)`);
    const accountChanged = Boolean(payload && payload.login && payload.login.accountChanged);
    if (state.authGateActive) {
      setAuthGateMessage("Вход выполнен. Загружаем панель…", "ok");
    } else {
      const note = $("#auth-status-note");
      if (note) {
        note.textContent = accountChanged
          ? "Аккаунт сменён. Перезагружаем данные…"
          : "InitData обновлена. Перезагружаем данные…";
        note.dataset.tone = "ok";
      }
    }
    setServerStatus("ready", "ok");
    resetPageLoadRegistry();
    window.setTimeout(() => window.location.reload(), 450);
    return payload;
  } catch (error) {
    setServerStatus("auth login error", "error");
    if (state.authGateActive) {
      setAuthGateControlsDisabled(false);
      setAuthGateMessage(error.message || "Ошибка входа по InitData.", "error");
    } else {
      const note = $("#auth-status-note");
      if (note) {
        note.textContent = error.message || "Не удалось сменить аккаунт по этой InitData.";
        note.dataset.tone = "error";
      }
    }
    appendLog("Auth login failed", error.message || "error");
    throw error;
  }
}

async function handleTokenAuthLogin() {
  const authOptions = collectTokenAuthOptions();
  if (!authOptions.accessToken) {
    const note = state.authGateActive ? null : $("#auth-status-note");
    if (note) {
      note.textContent = "Вставь accessToken перед входом.";
      note.dataset.tone = "error";
    } else {
      setAuthGateMessage("Вставь accessToken перед входом.", "error");
    }
    (state.authGateActive ? $("#auth-gate-access-token") : $("#auth-access-token"))?.focus();
    return null;
  }

  setServerStatus("token login", "busy");
  if (state.authGateActive) {
    setAuthGateControlsDisabled(true);
    setAuthGateMessage("Проверяем токены через игровой API…");
  }
  try {
    const payload = await apiRequest("POST", "/api/auth/login-tokens", authOptions);
    renderAuthStatus(payload);
    appendLog("Auth login", `вход по токенам, игрок ${payload && payload.auth && payload.auth.selfUserId || "—"}`);
    if (state.authGateActive) {
      setAuthGateMessage("Токены приняты. Загружаем панель…", "ok");
    } else {
      const note = $("#auth-status-note");
      if (note) {
        note.textContent = "Токены проверены и сохранены. Перезагружаем данные…";
        note.dataset.tone = "ok";
      }
    }
    setServerStatus("ready", "ok");
    resetPageLoadRegistry();
    window.setTimeout(() => window.location.reload(), 450);
    return payload;
  } catch (error) {
    setServerStatus("token login error", "error");
    if (state.authGateActive) {
      setAuthGateControlsDisabled(false);
      setAuthGateMessage(error.message || "Не удалось войти по токенам.", "error");
    } else {
      const note = $("#auth-status-note");
      if (note) {
        note.textContent = error.message || "Не удалось войти по токенам.";
        note.dataset.tone = "error";
      }
    }
    appendLog("Token auth failed", error.message || "error");
    throw error;
  }
}

async function restoreStoredAuth(authStatus) {
  if (isAuthStatusActive(authStatus) || !(authStatus && authStatus.auth && authStatus.auth.hasInitData)) {
    return authStatus;
  }

  updateInitialLoadProgress(28, "Восстанавливаем сессию…", "Проверяем сохранённую InitData.");
  try {
    const payload = await apiRequest("POST", "/api/auth/login-initdata", { useStoredInitData: true });
    renderAuthStatus(payload);
    appendLog("Auth login", "Сохранённая InitData использована автоматически");
    return payload;
  } catch (error) {
    appendLog("Сохранённая InitData больше не активна", error.message || "ошибка");
    return authStatus;
  }
}

async function handleEconomyRefresh() {
  if (state.economyRefreshRunning) {
    return state.economy;
  }
  state.economyRefreshRunning = true;
  try {
    const payload = await apiRequest("GET", "/api/player/init");
    const hasCurrencies = payload && payload.currencies
      && typeof payload.currencies === "object"
      && Object.keys(payload.currencies).length > 0;
    if (payload && payload.stale && state.economy) {
      return state.economy;
    }
    if (!hasCurrencies) {
      if (state.economy) {
        return state.economy;
      }
      throw new Error("Player economy response is incomplete.");
    }
    renderEconomyStatus(payload);
    return payload;
  } catch (error) {
    renderEconomyUnavailable();
    appendDiagnosticError("bosses", error);
    throw error;
  } finally {
    state.economyRefreshRunning = false;
  }
}

function startEconomySync(intervalMs = 15000) {
  if (state.economyPollTimerId) {
    clearInterval(state.economyPollTimerId);
  }
  state.economyPollTimerId = setInterval(() => {
    if (document.visibilityState === "visible") {
      void handleEconomyRefresh().catch(() => {});
    }
  }, Math.max(3000, Number(intervalMs) || 15000));
}

async function handleHeaderExtrasRefresh(options = {}) {
  if (state.headerExtrasRefreshRunning) {
    return state.headerExtrasRefreshRunning;
  }
  const request = (async () => {
    const results = await Promise.allSettled(["damage", "achievements", "stashGear", "vpi"].map(async (section) => {
      const payload = await apiRequest(
        "GET",
        `/api/player/header-extras?section=${section}${options.force ? "&force=true" : ""}`,
      );
      if (!payload) return;
      const previous = state.headerExtras || {};
      const merged = { ...previous, ...payload };
      // A failed section must not erase an already displayed value.
      if (payload[section] == null) merged[section] = previous[section] || null;
      if (section === "damage") {
        merged.damage = { ...(previous.damage || {}) };
        for (const [period, value] of Object.entries(payload.damage || {})) {
          if (value != null) merged.damage[period] = value;
        }
      }
      renderHeaderExtras(merged);
    }));
    const failure = results.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    return state.headerExtras;
  })();
  state.headerExtrasRefreshRunning = request;
  try {
    return await request;
  } finally {
    state.headerExtrasRefreshRunning = false;
  }
}

function startHeaderExtrasSync(intervalMs = 60_000) {
  if (state.headerExtrasPollTimerId) {
    clearInterval(state.headerExtrasPollTimerId);
  }
  state.headerExtrasPollTimerId = setInterval(() => {
    if (document.visibilityState === "visible") {
      void handleHeaderExtrasRefresh().catch(() => {});
    }
  }, Math.max(30_000, Number(intervalMs) || 60_000));
}

async function handlePrisonCosts() {
  try {
    const payload = await apiRequest("GET", "/api/prison/costs");
    renderPrisonCosts(payload);
    appendLog("Prison costs refreshed");
    return payload;
  } catch (error) {
    appendDiagnosticError("prison", error);
    throw error;
  }
}

async function handleBossStateRefresh(options = {}) {
  const silent = Boolean(options.silent);
  const showStatus = options.showStatus !== false;
  const requestVersion = Number(state.bossStateRequestVersion || 0) + 1;
  state.bossStateRequestVersion = requestVersion;
  if (showStatus) {
    setServerStatus("boss state", "busy");
  }
  try {
    const params = new URLSearchParams();
    if (options.fast === true) {
      params.set("fast", "1");
    }
    const query = params.toString();
    const payload = await apiRequest("GET", query ? `/api/bosses/state?${query}` : "/api/bosses/state");
    if (requestVersion < Number(state.bossStateAppliedRequestVersion || 0)) {
      return payload;
    }
    state.bossStateAppliedRequestVersion = requestVersion;
    const previousSnapshot = state.bossState && state.bossState.snapshot
      ? state.bossState.snapshot
      : null;
    state.bossState = {
      ...payload,
      snapshot: mergeBossRuntimeSnapshots(previousSnapshot, payload && payload.snapshot),
    };
    applyBossAutomationState(payload && payload.automation ? payload.automation : null, {
      syncControls: true,
      syncLocalTimer: true,
      renderQueue: false,
      syncQueue: false,
    });
    if (state.bossDashboard) {
      renderBossDashboardSummary(state.bossDashboard);
    }
    renderBossFightBars();
    renderBossLiveSummary();
    if (state.bossDashboard && Array.isArray(state.bossDashboard.actions)) {
      renderBossWeaponPanel(state.bossDashboard.actions);
    }
    renderBossAttackQueue();
    if (!silent) {
      appendLog("Boss state refreshed", payload.snapshot && payload.snapshot.summary
        ? `HP ${payload.snapshot.summary.currentHp ?? "-"}` : "");
    }
    if (showStatus) {
      setServerStatus("ready", "ok");
    }
    return payload;
  } catch (error) {
    if (showStatus) {
      setServerStatus("boss state error", "error");
    }
    appendDiagnosticError("bosses", error);
    return null;
  }
}

function scheduleBossStartUiSync(options = {}) {
  const version = state.bossStartSyncVersion + 1;
  state.bossStartSyncVersion = version;
  const maxAttempts = Math.max(1, Number(options.maxAttempts) || 80);
  const intervalMs = Math.max(100, Number(options.intervalMs) || 250);
  let observedQueueLength = state.bossRunQueue.length;
  let observedLastStartedAt = state.bossAuto.lastStarted && state.bossAuto.lastStarted.at || null;

  void (async () => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await delay(attempt === 0 ? 25 : intervalMs);
      if (state.bossStartSyncVersion !== version) {
        return;
      }
      const automation = await apiRequest("GET", "/api/bosses/automation");
      if (state.bossStartSyncVersion !== version) {
        return;
      }
      applyBossAutomationState(automation, {
        syncControls: false,
        syncLocalTimer: false,
        renderQueue: true,
        syncQueue: true,
      });

      const queueLength = Array.isArray(automation && automation.queue)
        ? automation.queue.length
        : state.bossRunQueue.length;
      const lastStartedAt = automation && automation.lastStarted && automation.lastStarted.at || null;
      const queueShrank = queueLength < observedQueueLength;
      const startChanged = Boolean(lastStartedAt && lastStartedAt !== observedLastStartedAt);
      observedQueueLength = queueLength;
      observedLastStartedAt = lastStartedAt || observedLastStartedAt;

      if (queueShrank || startChanged) {
        const payload = await handleBossStateRefresh({
          fast: true,
          silent: true,
          showStatus: false,
        });
        const summary = payload && payload.snapshot && payload.snapshot.summary
          ? payload.snapshot.summary
          : {};
        if (summary.hasSession === true && !summary.isCompleted) {
          await handleBossDashboard({
            fast: true,
            silent: true,
            showStatus: false,
            syncQueue: false,
          });
        }
        return;
      }

      if (
        attempt >= 3
        && automation
        && automation.running !== true
        && automation.serverRunning !== true
        && queueLength === 0
      ) {
        return;
      }
    }
  })().catch((error) => {
    appendDiagnosticError("bosses", error);
  });
}

function handleBossQueueAdd() {
  const select = $("#boss-attack-select");
  const countInput = $("#boss-attack-count");
  if (!select || !countInput) {
    return;
  }
  const key = select.value;
  const count = Math.max(1, Number(countInput.value) || 1);
  if (!key) {
    return;
  }
  state.bossQueue.push({ key, count });
  renderBossAttackQueue();
  appendLog("Attack queue add", `${key} x${count}`);
}

function handleBossQueueClear() {
  state.bossQueue = [];
  renderBossAttackQueue();
  appendLog("Attack queue cleared");
}

function handleBossAttackQueueClick(event) {
  const button = event.target.closest("[data-boss-attack-remove]");
  if (!button) {
    return;
  }
  const index = Number(button.dataset.bossAttackRemove);
  if (!Number.isInteger(index) || index < 0 || index >= state.bossQueue.length) {
    return;
  }
  const [removed] = state.bossQueue.splice(index, 1);
  renderBossAttackQueue();
  appendLog("Attack queue remove", removed ? `${removed.key} x${removed.count}` : `#${index + 1}`);
}

async function handleBossRunQueueAdd() {
  // Use the already loaded Zaruba snapshot here. A network refresh before the
  // optimistic insert made the button appear frozen whenever that endpoint was slow.
  const entry = buildBossRunQueueEntry();
  if (!entry) {
    appendLog("Boss queue add skipped", "Сначала выберите босса");
    return;
  }
  const candidate = getBossQueueCandidateMap().get(Number(entry.bossId)) || null;
  if (candidate && !candidate.canStart) {
    appendLog(
      "Boss queue add skipped",
      `${entry.label}: ${formatBossBlockedReason(candidate.blockedReason)} (${formatOptionalNumber(candidate.usedToday)}/${formatOptionalNumber(candidate.dailyLimit)})`,
    );
    return;
  }
  if (offerBossComboSetup(entry, candidate)) {
    return;
  }
  if (!await confirmBossRunQueueSoloWarning([entry], new Map([[Number(entry.bossId), candidate]]))) {
    appendLog("Boss queue add cancelled", `${entry.label}: здоровье одиночного босса больше 1 млн`);
    return;
  }
  state.bossRunQueue.push(entry);
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  await syncBossAutomationAfterQueueEdit(
    "Boss queue add",
    {
      queueOperations: [{ type: "append", item: entry }],
    },
    { includeQueue: false },
  );
  if (state.bossAuto.autoStartNext) {
    scheduleBossStartUiSync();
  }
  appendLog(
    "Boss queued",
      `${entry.label} (${entry.mode || "-"}${entry.comboMode ? `, combo ${entry.comboMode}` : ""})`,
    );
}

async function handleBossRunQueueBuild() {
  setServerStatus("building boss queue", "busy");
  try {
    await handleBossDashboard({
      fast: true,
      silent: true,
      showStatus: false,
      syncQueue: true,
    });
    await handleZarubaDashboard({ silent: true, syncControls: false });
    const initialPlan = buildBossAutoQueuePlan();
    await offerBossComboSetupForQueue(initialPlan.entries);
    const plan = buildBossAutoQueuePlan();
    if (plan.entries.length === 0) {
      const reason = `Среди выбранных боссов нет доступных запусков: выбрано ${formatNumber(plan.selectedIds.size)}, `
        + `активных ${formatNumber(plan.activeCount)}, без ключей ${formatNumber(plan.keyShortageCount)}, `
        + `заблокировано ${formatNumber(plan.blockedCount)}.`;
      appendLog("Boss queue build empty", reason);
      const note = $("#boss-run-queue-note");
      if (note) {
        note.textContent = reason;
      }
      setServerStatus("boss queue is empty", "error");
      return;
    }
    if (!await confirmBossRunQueueSoloWarning(plan.entries)) {
      appendLog("Boss queue build cancelled", "Solo boss above 1M HP");
      setServerStatus("ready", "ok");
      return;
    }
    state.bossRunQueue = plan.entries;
    markBossRunQueueEdited();
    persistBossRunQueue();
    renderBossRunQueue();
    await syncBossAutomationState({}, { silent: true, renderQueue: false });
    if (state.bossAuto.autoStartNext) {
      scheduleBossStartUiSync();
    }
    appendLog(
      "Boss queue built",
      `queued ${formatNumber(plan.entries.length)}, selected ${formatNumber(plan.selectedIds.size)}, active ${formatNumber(plan.activeCount)}, no mode ${formatNumber(plan.noModeCount)}, smart priority ${formatNumber(plan.smartPreferredCount)}, pacansky fallback ${formatNumber(plan.smartFallbackCount)}, stopped by keys ${formatNumber(plan.keyShortageCount)}, blocked ${formatNumber(plan.blockedCount)}`,
    );
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("boss queue build error", "error");
    appendLog("Boss queue build failed", error.message || "error");
    appendDiagnosticError("bosses", error);
  }
}

function clearBossRunQueueDragState() {
  state.bossRunQueueDrag = null;
  document.querySelectorAll(
    ".boss-run-queue-item.is-dragging, .boss-run-queue-item.is-drop-before, .boss-run-queue-item.is-drop-after",
  ).forEach((item) => {
    item.classList.remove("is-dragging", "is-drop-before", "is-drop-after");
  });
}

function getBossRunQueueDropIndex(event) {
  const drag = state.bossRunQueueDrag;
  if (!drag) {
    return -1;
  }
  const row = event && event.target && event.target.closest
    ? event.target.closest(".boss-run-queue-item")
    : null;
  if (!row) {
    const list = $("#boss-run-queue-body");
    const rect = list && typeof list.getBoundingClientRect === "function"
      ? list.getBoundingClientRect()
      : null;
    return rect && Number.isFinite(event.clientY) && event.clientY < rect.top + rect.height / 2
      ? 0
      : state.bossRunQueue.length - 1;
  }
  const targetIndex = Number(row.dataset.index || -1);
  if (!Number.isInteger(targetIndex) || targetIndex < 0) {
    return -1;
  }
  const rect = typeof row.getBoundingClientRect === "function"
    ? row.getBoundingClientRect()
    : null;
  const insertAfter = rect && Number.isFinite(event.clientY)
    ? event.clientY > rect.top + rect.height / 2
    : false;
  let toIndex = targetIndex + (insertAfter ? 1 : 0);
  if (drag.fromIndex < toIndex) {
    toIndex -= 1;
  }
  return Math.max(0, Math.min(state.bossRunQueue.length - 1, toIndex));
}

function updateBossRunQueueDropMarker(event) {
  const drag = state.bossRunQueueDrag;
  if (!drag) {
    return;
  }
  const row = event && event.target && event.target.closest
    ? event.target.closest(".boss-run-queue-item")
    : null;
  document.querySelectorAll(".boss-run-queue-item.is-drop-before, .boss-run-queue-item.is-drop-after").forEach((item) => {
    if (item !== row) {
      item.classList.remove("is-drop-before", "is-drop-after");
    }
  });
  if (!row || row.dataset.index === String(drag.fromIndex)) {
    return;
  }
  const rect = typeof row.getBoundingClientRect === "function"
    ? row.getBoundingClientRect()
    : null;
  const insertAfter = rect && Number.isFinite(event.clientY)
    ? event.clientY > rect.top + rect.height / 2
    : false;
  row.classList.toggle("is-drop-before", !insertAfter);
  row.classList.toggle("is-drop-after", insertAfter);
}

async function moveBossRunQueueItem(fromIndex, toIndex, options = {}) {
  if (
    !Number.isInteger(fromIndex)
    || !Number.isInteger(toIndex)
    || fromIndex < 0
    || toIndex < 0
    || fromIndex >= state.bossRunQueue.length
    || toIndex >= state.bossRunQueue.length
    || fromIndex === toIndex
  ) {
    return false;
  }
  const [item] = state.bossRunQueue.splice(fromIndex, 1);
  state.bossRunQueue.splice(toIndex, 0, item);
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  await syncBossAutomationState({}, { silent: true, renderQueue: false });
  if (options.log !== false) {
    appendLog("Boss queue reordered", `${fromIndex + 1} → ${toIndex + 1}`);
  }
  return true;
}

function handleBossRunQueueDragStart(event) {
  const handle = event && event.target && event.target.closest
    ? event.target.closest("[data-boss-run-drag-index]")
    : null;
  if (!handle) {
    return;
  }
  const fromIndex = Number(handle.dataset.bossRunDragIndex || -1);
  if (!Number.isInteger(fromIndex) || fromIndex < 0 || fromIndex >= state.bossRunQueue.length) {
    return;
  }
  state.bossRunQueueDrag = { fromIndex };
  handle.closest(".boss-run-queue-item")?.classList.add("is-dragging");
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(fromIndex));
  }
}

function handleBossRunQueueDragOver(event) {
  if (!state.bossRunQueueDrag) {
    return;
  }
  event.preventDefault();
  updateBossRunQueueDropMarker(event);
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

async function handleBossRunQueueDrop(event) {
  const drag = state.bossRunQueueDrag;
  if (!drag) {
    return;
  }
  event.preventDefault();
  const fromIndex = drag.fromIndex;
  const toIndex = getBossRunQueueDropIndex(event);
  clearBossRunQueueDragState();
  await moveBossRunQueueItem(fromIndex, toIndex);
}

async function handleBossRunQueueRemoveClick(event) {
  const moveTrigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-run-move")
    : null;
  if (moveTrigger) {
    event.preventDefault();
    const fromIndex = Number(moveTrigger.dataset.index || -1);
    const toIndex = fromIndex + Number(moveTrigger.dataset.direction || 0);
    if (
      Number.isInteger(fromIndex)
      && Number.isInteger(toIndex)
      && fromIndex >= 0
      && toIndex >= 0
      && fromIndex < state.bossRunQueue.length
      && toIndex < state.bossRunQueue.length
    ) {
      await moveBossRunQueueItem(fromIndex, toIndex);
    }
    return;
  }
  const trigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-run-remove")
    : null;
  if (!trigger) {
    return;
  }
  event.preventDefault();
  const index = Number(trigger.dataset.index || -1);
  if (!Number.isInteger(index) || index < 0 || index >= state.bossRunQueue.length) {
    return;
  }
  const [removed] = state.bossRunQueue.splice(index, 1);
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  await syncBossAutomationAfterQueueEdit(
    "Boss queue remove",
    { queueOperations: [{ type: "remove", item: removed }] },
    { includeQueue: false },
  );
  appendLog("Boss dequeued", removed && removed.label ? removed.label : `#${index + 1}`);
}

async function handleBossRunQueueModeChange(event) {
  const trigger = event && event.target && event.target.matches
    ? event.target
    : null;
  if (!trigger || !trigger.matches(".js-boss-run-mode")) {
    return;
  }
  const index = Number(trigger.dataset.index || -1);
  if (!Number.isInteger(index) || index < 0 || index >= state.bossRunQueue.length) {
    return;
  }
  const item = state.bossRunQueue[index];
  const previousItem = { ...item };
  const candidate = getBossQueueCandidateMap().get(Number(item.bossId)) || null;
  const requestedMode = String(trigger.value || "").trim();
  const modeBundle = getCandidateQueueModeBundle(candidate, requestedMode, item.comboMode);
  item.mode = requestedMode ? (modeBundle ? modeBundle.mode : requestedMode) : null;
  if (modeBundle) {
    item.comboMode = modeBundle.comboMode || "";
  }
  state.bossRunQueue[index] = withBossRunQueueHitTypes(item);
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  await syncBossAutomationAfterQueueEdit(
    "Boss queue mode",
    { queueOperations: [{ type: "replace", from: previousItem, item: state.bossRunQueue[index] }] },
    { includeQueue: false },
  );
}

async function handleBossRunQueueComboChange(event) {
  const trigger = event && event.target && event.target.matches
    ? event.target
    : null;
  if (!trigger || !trigger.matches(".js-boss-run-combo")) {
    return;
  }
  const index = Number(trigger.dataset.index || -1);
  if (!Number.isInteger(index) || index < 0 || index >= state.bossRunQueue.length) {
    return;
  }
  const previousItem = { ...state.bossRunQueue[index] };
  state.bossRunQueue[index] = withBossRunQueueHitTypes({
    ...state.bossRunQueue[index],
    comboMode: trigger.value || "",
  });
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  await syncBossAutomationAfterQueueEdit(
    "Boss queue combo",
    { queueOperations: [{ type: "replace", from: previousItem, item: state.bossRunQueue[index] }] },
    { includeQueue: false },
  );
}

async function handleBossRunQueueClear() {
  state.bossRunQueue = [];
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  await syncBossAutomationAfterQueueEdit(
    "Boss queue clear",
    { queueOperations: [{ type: "clear" }] },
    { includeQueue: false },
  );
  appendLog("Boss run queue cleared");
}

function shouldAutoHitAfterStart() {
  return false;
}

async function runBossHitQueueAfterStart(options = {}) {
  const silent = Boolean(options.silent);
  const baseOptions = collectBossOptions();
  const bossId = options.bossId ? Number(options.bossId) : baseOptions.bossId;
  const mode = options.mode || baseOptions.mode;
  const comboMode = options.comboMode || baseOptions.comboMode;
  const storedTemplate = resolveBossComboTemplateForBossAndMode({
    bossId,
    mode,
    comboMode,
  });
  const hasStoredTemplate = Boolean(storedTemplate && Array.isArray(storedTemplate.sequence) && storedTemplate.sequence.length > 0);

  if (!hasStoredTemplate && !shouldAutoHitAfterStart()) {
    return null;
  }

  const requestPayload = {
    ...baseOptions,
    dryRun: false,
    bossId,
    mode,
    comboMode,
    finishWithNeedle: storedTemplate ? storedTemplate.finishWithNeedle === true : false,
    autoBuyMissingWeapons: Boolean(comboMode),
  };

  if (!requestPayload.bossId) {
    if (!silent) {
      appendLog("Boss auto hit skipped", "No boss selected");
    }
    return null;
  }

  if (hasStoredTemplate) {
    requestPayload.types = storedTemplate.sequence.join(",");
    applyBossComboSequenceToQueue(storedTemplate.sequence);
  }

  try {
    const startedAt = performance.now();
    const payload = await apiRequest("POST", "/api/bosses/hit", requestPayload);
    const elapsedMs = performance.now() - startedAt;
    const comboSuccess = inferBossComboSuccess(payload, requestPayload);
    const comboCost = attachBossComboCost(payload, requestPayload);
    updateBossFightComboSuccess({
      bossId: requestPayload.bossId,
      mode: requestPayload.mode,
      comboMode: requestPayload.comboMode,
      comboSuccess,
      comboCostRubles: comboCost ? comboCost.totalRubles : null,
    });
    renderBossResult(payload);
    appendBossClaimRewardLog(payload, { bossId: requestPayload.bossId });
    scheduleBossRewardSettlementLogRefresh(payload);
    await handleBossDashboard({ fast: true, silent: true, showStatus: false });
    await handleBossStateRefresh({ silent: true, showStatus: false });
    logBossComboDuration({
      payload,
      requestPayload,
      elapsedMs,
      bossId: requestPayload.bossId,
      label: hasStoredTemplate ? `${storedTemplate.comboMode} template` : "auto",
    });
    if (!silent) {
      appendLog(
        "Boss auto hit",
        hasStoredTemplate
          ? `#${requestPayload.bossId} / ${storedTemplate.comboMode} template`
          : `#${requestPayload.bossId}`,
      );
    }
    return payload;
  } catch (error) {
    if (!silent) {
      appendLog("Boss auto hit failed", error.message || "error");
    }
    appendDiagnosticError("bosses", error);
    return null;
  }
}

async function startNextBossFromQueue(options = {}) {
  const silent = Boolean(options.silent);
  const baseOptions = collectBossOptions();

  if (!silent) {
    setServerStatus("starting next boss", "busy");
  }

  try {
    const payload = await apiRequest("POST", "/api/bosses/automation/start-next", {
      autoBuyKeysIfProfitable: baseOptions.autoBuyKeysIfProfitable,
    });
    applyBossAutomationState(payload && payload.automation ? payload.automation : null, {
      syncControls: true,
      syncLocalTimer: true,
      renderQueue: true,
    });
    if (payload && payload.started && payload.startedItem) {
      clearBossFightRuntimeState({ clearComboResult: true });
      rememberBossFightMeta({
        bossId: payload.startedItem.bossId,
        mode: payload.startedItem.mode || baseOptions.mode,
        comboMode: payload.startedItem.comboMode || baseOptions.comboMode,
      });
    }
    if (payload && payload.autoHit) {
      const autoHitRequest = {
        bossId: payload.startedItem ? payload.startedItem.bossId : baseOptions.bossId,
        mode: payload.startedItem ? payload.startedItem.mode : baseOptions.mode,
        comboMode: payload.startedItem ? payload.startedItem.comboMode : baseOptions.comboMode,
        types: payload.startedItem ? payload.startedItem.hitTypes : baseOptions.types,
        finishWithNeedle: payload.startedItem
          ? payload.startedItem.finishWithNeedle === true
          : baseOptions.finishWithNeedle === true,
      };
      const comboSuccess = inferBossComboSuccess(payload.autoHit, autoHitRequest);
      const comboCost = attachBossComboCost(payload.autoHit, autoHitRequest);
      updateBossFightComboSuccess({
        bossId: autoHitRequest.bossId,
        mode: autoHitRequest.mode,
        comboMode: autoHitRequest.comboMode,
        comboSuccess,
        comboCostRubles: comboCost ? comboCost.totalRubles : null,
      });
      renderBossResult(payload.autoHit);
      appendBossClaimRewardLog(payload.autoHit, {
        bossId: autoHitRequest.bossId,
        queueItemId: payload.startedItem && payload.startedItem.queueItemId,
      });
      scheduleBossRewardSettlementLogRefresh(payload.autoHit);
      logBossComboDuration({
        payload: payload.autoHit,
        requestPayload: autoHitRequest,
        elapsedMs: payload.autoHit.elapsedMs,
        bossId: autoHitRequest.bossId,
        label: "automation",
      });
    } else if (payload && payload.startResult) {
      renderBossResult(payload.startResult);
    }
    await handleBossDashboard({ fast: true, silent: true, showStatus: false });
    await handleBossStateRefresh({ silent: true, showStatus: false });

    if (payload && payload.started && payload.startedItem && !payload.autoHitAttempted) {
      await runBossHitQueueAfterStart({
        silent,
        bossId: payload.startedItem.bossId,
        mode: payload.startedItem.mode || baseOptions.mode,
        comboMode: payload.startedItem.comboMode || baseOptions.comboMode,
      });
    }

    if (!silent) {
      const logMessage = payload && payload.started && payload.startedItem
        ? `${payload.startedItem.label || `#${payload.startedItem.bossId}`} started`
        : payload && payload.reason
          ? payload.reason
          : "no change";
      appendLog("Boss start next", logMessage);
      setServerStatus("ready", "ok");
    }
    return payload;
  } catch (error) {
    if (!silent) {
      setServerStatus("boss start error", "error");
      appendLog("Boss start next failed", error.message || "error");
    }
    appendDiagnosticError("bosses", error);
    return null;
  }
}

function formatBossAutomationActivityStatus(entry) {
  const status = String(entry && entry.status || "").trim();
  const type = String(entry && entry.type || "").trim();
  const labels = {
    active: "Активен",
    claimed: "Награда получена",
    claim: "Награда получена",
    claim_error: "Не удалось забрать награду",
    finished: "Завершено",
    hit_done: "Удар",
    hit_error: "Ошибка удара",
    started: "Запущено",
    fight_result: "Итог боя",
    start: "Запущено",
  };
  return labels[status] || labels[type] || translateUiText(status || type) || "Обновление";
}

function formatBossAutomationActivityTime(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getBossAutomationActivityKey(entry) {
  const item = entry && entry.item ? entry.item : {};
  return [
    entry && entry.at || "",
    entry && entry.type || "",
    entry && entry.status || "",
    item.bossId || "",
  ].join("|");
}

function buildBossAutomationActivityMeta(entry, options = {}) {
  const meta = [];
  const includeRewards = options.includeRewards !== false;
  const hasComboEconomy = Boolean(
    entry && entry.comboEconomy && entry.comboEconomy.measured,
  );
  if (entry && entry.startElapsedMs !== null && entry.startElapsedMs !== undefined) {
    const requestSuffix = entry.startRequestElapsedMs !== null && entry.startRequestElapsedMs !== undefined
      ? `, API ${formatDurationMs(entry.startRequestElapsedMs)}`
      : "";
    meta.push(`запуск ${formatDurationMs(entry.startElapsedMs)}${requestSuffix}`);
  }
  if (entry && entry.hits !== null && entry.hits !== undefined) {
    meta.push(`${formatNumber(entry.hits)} ударов`);
  }
  if (
    entry
    && entry.comboElapsedMs !== null
    && entry.comboElapsedMs !== undefined
    && Number(entry.comboElapsedMs) > 0
  ) {
    meta.push(`комбо ${formatDurationMs(entry.comboElapsedMs)}`);
  }
  if (
    entry
    && entry.finisherElapsedMs !== null
    && entry.finisherElapsedMs !== undefined
    && Number(entry.finisherElapsedMs) > 0
  ) {
    const finisherParts = [];
    if (entry.finisherPreparationElapsedMs !== null && entry.finisherPreparationElapsedMs !== undefined) {
      finisherParts.push(`подбор ${formatDurationMs(entry.finisherPreparationElapsedMs)}`);
    }
    if (entry.finisherHitElapsedMs !== null && entry.finisherHitElapsedMs !== undefined) {
      finisherParts.push(`удары ${formatDurationMs(entry.finisherHitElapsedMs)}`);
    }
    meta.push(
      `добивание ${formatDurationMs(entry.finisherElapsedMs)}`
      + (finisherParts.length > 0 ? ` (${finisherParts.join(", ")})` : ""),
    );
  }
  if (
    entry
    && entry.totalElapsedMs !== null
    && entry.totalElapsedMs !== undefined
    && Number(entry.totalElapsedMs) !== Number(entry.comboElapsedMs)
  ) {
    meta.push(`весь цикл ${formatDurationMs(entry.totalElapsedMs)}`);
  } else if (
    entry
    && entry.elapsedMs !== null
    && entry.elapsedMs !== undefined
    && (entry.comboElapsedMs === null || entry.comboElapsedMs === undefined)
  ) {
    meta.push(`за ${formatDurationMs(entry.elapsedMs)}`);
  }
  if (entry && entry.currentHp !== null && entry.currentHp !== undefined) {
    const hp = entry.maxHp !== null && entry.maxHp !== undefined
      ? `${formatBossCompactNumber(entry.currentHp)} / ${formatBossCompactNumber(entry.maxHp)} HP`
      : `${formatBossCompactNumber(entry.currentHp)} HP`;
    meta.push(hp);
  }
  if (includeRewards && entry && entry.claimOk === true) {
    meta.push("награда получена");
  }
  if (includeRewards && entry && entry.rewards) {
    meta.push(formatBossClaimRewardSummary(entry.rewards));
  }
  if (includeRewards && entry && Array.isArray(entry.comboRewards) && !hasComboEconomy) {
    for (const reward of entry.comboRewards) {
      meta.push(formatBossComboRewardSummary(reward));
    }
  }
  if (hasComboEconomy) {
    if (options.includeEconomy !== false) {
      const summary = formatBossComboNetSummary(entry.comboEconomy);
      if (summary) {
        meta.push(summary);
      }
    }
  } else if (entry && entry.weaponDelta && entry.weaponDelta.measured) {
    meta.push(formatBossWeaponDeltaSummary(entry.weaponDelta));
  }
  if (entry && entry.reason) {
    meta.push(String(entry.reason));
  }
  return meta.filter(Boolean);
}

function mergeBossAutomationActivityEntries(primary, secondary) {
  const merged = {
    ...(secondary || {}),
    ...(primary || {}),
    item: {
      ...(secondary && secondary.item || {}),
      ...(primary && primary.item || {}),
    },
  };
  const fallbackKeys = [
    "label",
    "reason",
    "currentHp",
    "maxHp",
    "hits",
    "elapsedMs",
    "comboElapsedMs",
    "finisherElapsedMs",
    "finisherPreparationElapsedMs",
    "finisherHitElapsedMs",
    "totalElapsedMs",
    "startElapsedMs",
    "startRequestElapsedMs",
    "sessionId",
    "claimOk",
    "rewards",
    "weaponDelta",
    "comboEconomy",
  ];
  for (const key of fallbackKeys) {
    if (
      (merged[key] === null || merged[key] === undefined || merged[key] === "")
      && secondary
      && secondary[key] !== null
      && secondary[key] !== undefined
      && secondary[key] !== ""
    ) {
      merged[key] = secondary[key];
    }
  }
  if (
    (!Array.isArray(primary && primary.comboRewards) || primary.comboRewards.length === 0)
    && Array.isArray(secondary && secondary.comboRewards)
  ) {
    merged.comboRewards = secondary.comboRewards;
  }
  return merged;
}

function compactBossAutomationActivity(recentActivity) {
  const entries = Array.isArray(recentActivity) ? recentActivity.filter(Boolean) : [];
  const groups = [];
  const keyedGroups = new Map();

  for (const entry of entries) {
    const queueItemId = String(entry && entry.item && entry.item.queueItemId || "").trim();
    if (!queueItemId) {
      groups.push({
        key: null,
        row: { ...entry },
        consumed: false,
      });
      continue;
    }
    const key = `queue:${queueItemId}`;
    const known = keyedGroups.get(key);
    if (known) {
      known.row = mergeBossAutomationActivityEntries(known.row, entry);
      continue;
    }
    const group = {
      key,
      row: { ...entry },
      consumed: false,
    };
    keyedGroups.set(key, group);
    groups.push(group);
  }

  for (const looseGroup of groups) {
    const loose = looseGroup.row;
    if (
      looseGroup.key
      || String(loose && loose.type || "") !== "start"
      || String(loose && loose.status || "") !== "started"
    ) {
      continue;
    }
    const bossId = Number(loose && loose.item && loose.item.bossId);
    const startedAt = Date.parse(loose && loose.at || "");
    if (!Number.isFinite(bossId) || !Number.isFinite(startedAt)) {
      continue;
    }
    const candidate = groups
      .filter((group) => {
        const row = group.row;
        const rowAt = Date.parse(row && row.at || "");
        return Boolean(
          group.key
          && !group.looseStartMatched
          && Number(row && row.item && row.item.bossId) === bossId
          && Number.isFinite(rowAt)
          && rowAt >= startedAt
          && rowAt - startedAt <= 15_000
        );
      })
      .sort((left, right) => Date.parse(left.row.at) - Date.parse(right.row.at))[0];
    if (candidate) {
      candidate.row = mergeBossAutomationActivityEntries(candidate.row, loose);
      candidate.looseStartMatched = true;
      looseGroup.consumed = true;
    }
  }

  for (const looseGroup of groups) {
    const loose = looseGroup.row;
    if (
      looseGroup.key
      || !["claim", "claimed"].includes(String(loose && (loose.type || loose.status) || ""))
    ) {
      continue;
    }
    const bossId = Number(loose && loose.item && loose.item.bossId);
    const claimAt = Date.parse(loose && loose.at || "");
    if (!Number.isFinite(bossId) || !Number.isFinite(claimAt)) {
      continue;
    }
    const candidate = groups
      .filter((group) => {
        const row = group.row;
        const rowAt = Date.parse(row && row.at || "");
        return Boolean(
          group.key
          && !group.consumed
          && Number(row && row.item && row.item.bossId) === bossId
          && !["claimed", "claim_error"].includes(String(row && row.status || ""))
          && Number.isFinite(rowAt)
          && rowAt <= claimAt
          && claimAt - rowAt <= 5 * 60_000
        );
      })
      .sort((left, right) => Date.parse(right.row.at) - Date.parse(left.row.at))[0];
    if (candidate) {
      candidate.row = mergeBossAutomationActivityEntries(loose, candidate.row);
      looseGroup.consumed = true;
    }
  }

  const compacted = groups
    .filter((group) => !group.consumed)
    .map((group) => group.row)
    .sort((left, right) => Date.parse(right && right.at || "") - Date.parse(left && left.at || ""));

  for (const entry of compacted) {
    if (!["active", "started"].includes(String(entry && entry.status || ""))) {
      continue;
    }
    const bossId = Number(entry && entry.item && entry.item.bossId);
    const entryAt = Date.parse(entry && entry.at || "");
    const superseded = compacted.some((candidate) => {
      const candidateAt = Date.parse(candidate && candidate.at || "");
      return Boolean(
        candidate !== entry
        && Number(candidate && candidate.item && candidate.item.bossId) === bossId
        && Number.isFinite(candidateAt)
        && Number.isFinite(entryAt)
        && candidateAt > entryAt
        && candidateAt - entryAt <= 5 * 60_000
      );
    });
    if (superseded) {
      entry.type = "fight_result";
      entry.status = "finished";
    }
  }

  return compacted;
}

function reconcileBossAutomationActivityWithFightState(rows, bossState) {
  const recent = Array.isArray(rows) ? rows : [];
  const summary = bossState && bossState.snapshot && bossState.snapshot.summary
    ? bossState.snapshot.summary
    : null;
  if (!summary || summary.stateUnknown === true) {
    return recent;
  }

  const currentHp = summary.currentHp !== null && summary.currentHp !== undefined
    ? Number(summary.currentHp)
    : Number.NaN;
  const fightEnded = summary.isCompleted === true
    || summary.rewardReady === true
    || summary.hasReward === true
    || (Number.isFinite(currentHp) && currentHp <= 0);
  const stateKnown = typeof summary.hasSession === "boolean" || fightEnded;
  if (!stateKnown) {
    return recent;
  }

  const hasActiveSession = summary.hasSession === true && !fightEnded;
  const activeBossId = summary.bossId !== null && summary.bossId !== undefined
    ? Number(summary.bossId)
    : Number.NaN;
  let activeRowMatched = false;
  return recent.map((entry) => {
    if (!["active", "started"].includes(String(entry && entry.status || ""))) {
      return entry;
    }
    const bossId = Number(entry && entry.item && entry.item.bossId);
    const matchesActiveBoss = !Number.isFinite(activeBossId)
      || !Number.isFinite(bossId)
      || bossId === activeBossId;
    if (hasActiveSession && matchesActiveBoss && !activeRowMatched) {
      activeRowMatched = true;
      return entry;
    }
    return {
      ...entry,
      type: "fight_result",
      status: "finished",
    };
  });
}

function syncBossAutomationActivityToMainLog(recentActivity) {
  state.bossAuto.recentActivity = Array.isArray(recentActivity) ? recentActivity : [];
  renderBossAutomationActivity();
}

function renderBossAutomationActivity() {
  const compacted = reconcileBossAutomationActivityWithFightState(
    compactBossAutomationActivity(state.bossAuto.recentActivity),
    state.bossState,
  );
  for (const sourceEntry of compacted.slice(0, BOSS_ACTIVITY_VISIBLE_LIMIT)) {
    const sourceItem = sourceEntry && sourceEntry.item ? sourceEntry.item : null;
    const sourceQueueItemId = String(sourceItem && sourceItem.queueItemId || "").trim();
    const journalKey = `boss:${sourceQueueItemId || getBossAutomationActivityKey(sourceEntry)}`;
    const existingEntry = state.logs.find((item) => item.key === journalKey);
    const entry = existingEntry && existingEntry.bossActivity
      ? mergeBossAutomationActivityEntries(sourceEntry, existingEntry.bossActivity)
      : sourceEntry;
    const item = entry && entry.item ? entry.item : null;
    const label = entry && entry.label
      ? entry.label
      : item
        ? item.label || `#${item.bossId || "?"}`
        : "-";
    const economy = entry && entry.comboEconomy && entry.comboEconomy.measured
      ? entry.comboEconomy
      : null;
    const meta = buildBossAutomationActivityMeta(entry, {
      includeEconomy: !economy,
      includeRewards: false,
    });
    const comboMarkup = economy
      ? renderBossComboNetChips(economy.net, entry.comboRewards)
      : "";
    const hasRewards = Boolean(
      entry && entry.rewards
      || Array.isArray(entry && entry.comboRewards) && entry.comboRewards.length > 0
      || economy,
    );
    const bossRewardItems = collectBossClaimJournalRewardItems(entry && entry.rewards);
    const bossRewardBossId = Number(
      entry && entry.rewards && entry.rewards.bossId
      || item && item.bossId,
    ) || null;
    const bossRewardSignature = buildBossRewardJournalSignature(bossRewardItems);
    if (bossRewardSignature) {
      const duplicateIndex = findDuplicateBossRewardJournalEntryIndex(state.logs, {
        at: entry && entry.at,
        source: "bosses",
        kind: "reward",
        bossRewardBossId,
        bossRewardQueueItemId: sourceQueueItemId,
        bossRewardSignature,
      }, {
        excludeKey: journalKey,
        localOnly: true,
      });
      if (duplicateIndex >= 0) {
        state.logs.splice(duplicateIndex, 1);
      }
    }
    upsertJournalEntry({
      key: journalKey,
      at: entry && entry.at,
      source: "bosses",
      kind: /error/.test(String(entry && (entry.status || entry.type) || ""))
        ? "error"
        : hasRewards
          ? "reward"
          : "action",
      message: `${formatBossAutomationActivityStatus(entry)} · ${label}`,
      meta: meta.join(" · "),
      bossActivity: entry,
      bossComboMarkup: comboMarkup,
      rewardItems: [],
      rewardLabel: "",
      bossRewardBossId,
      bossRewardQueueItemId: sourceQueueItemId,
      bossRewardSignature,
    });
  }
  renderLog();
}

function setJournalDrawerOpen(open) {
  const drawer = $("#journal-drawer");
  const toggle = $("#journal-toggle");
  const backdrop = $("#journal-backdrop");
  if (!drawer || !toggle || !backdrop) {
    return;
  }
  const nextOpen = Boolean(open);
  document.body.classList.toggle("journal-open", nextOpen);
  drawer.setAttribute("aria-hidden", String(!nextOpen));
  drawer.toggleAttribute("inert", !nextOpen);
  toggle.setAttribute("aria-expanded", String(nextOpen));
  backdrop.setAttribute("aria-hidden", String(!nextOpen));
  if (nextOpen) {
    if (state.journal.currentSource === "bosses") {
      void refreshBossLogActivityOnly();
    }
    renderLog();
    $("#journal-close")?.focus();
  }
}

function syncJournalContext(tabName = "") {
  const toggle = $("#journal-toggle");
  if (!toggle) {
    return;
  }
  const activeTab = tabName || document.querySelector(".tab-button.is-active")?.dataset.tab || "";
  state.journal.currentSource = normalizeJournalSource(activeTab || "system");
  const currentOption = $("#journal-current-source-option");
  if (currentOption) {
    const label = JOURNAL_SOURCE_META[state.journal.currentSource]?.label || "Текущая вкладка";
    currentOption.textContent = `Текущая вкладка · ${label}`;
  }
  toggle.hidden = !document.body.classList.contains("app-ready");
  renderLog();
}

async function refreshBossLogActivityOnly() {
  if (state.bossAuto.logRefreshing) {
    return;
  }
  state.bossAuto.logRefreshing = true;
  try {
    const payload = await apiRequest("GET", "/api/bosses/automation");
    applyBossAutomationState(payload, {
      syncControls: false,
      syncLocalTimer: false,
      renderQueue: false,
      syncQueue: false,
    });
  } catch (_error) {
    // The normal boss refresh remains the fallback; avoid filling the UI log
    // with transient read-only polling errors.
  } finally {
    state.bossAuto.logRefreshing = false;
  }
}

function clearVisibleJournalEntries() {
  const filters = getJournalFilters();
  const hiddenKeys = state.logs
    .filter((entry) => journalEntryMatchesFilters(entry, filters))
    .map((entry) => entry.key);
  for (const key of hiddenKeys) {
    state.journal.dismissedKeys.add(key);
  }
  state.logs = state.logs.filter((entry) => !hiddenKeys.includes(entry.key));
  renderLog();
}

function initializeJournalDrawer() {
  $("#journal-toggle")?.addEventListener("click", () => setJournalDrawerOpen(true));
  $("#journal-close")?.addEventListener("click", () => {
    setJournalDrawerOpen(false);
    $("#journal-toggle")?.focus();
  });
  $("#journal-backdrop")?.addEventListener("click", () => setJournalDrawerOpen(false));
  $("#journal-source-filter")?.addEventListener("change", renderLog);
  $("#journal-kind-filter")?.addEventListener("change", renderLog);
  $("#journal-search")?.addEventListener("input", renderLog);
  $("#journal-clear-btn")?.addEventListener("click", clearVisibleJournalEntries);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("journal-open")) {
      setJournalDrawerOpen(false);
      $("#journal-toggle")?.focus();
    }
  });
}

function updateBossAutoStatus() {
  const node = $("#boss-auto-status");
  if (!node) {
    return;
  }
  const enabled = state.bossAuto.enabled;
  const intervalSec = Math.max(
    5,
    Number(state.bossAuto.intervalSec || BOSS_AUTO_REFRESH_DEFAULT_SEC) || BOSS_AUTO_REFRESH_DEFAULT_SEC,
  );
  const autoStart = state.bossAuto.autoStartNext;
  const runnerState = state.bossAuto.serverRunning ? "running" : "idle";
  const lastActionReason = state.bossAuto.lastAction && state.bossAuto.lastAction.reason
    ? String(state.bossAuto.lastAction.reason)
    : "";
  const lastActionType = state.bossAuto.lastAction && state.bossAuto.lastAction.type
    ? String(state.bossAuto.lastAction.type)
    : "";
  const lastActionSuffix = lastActionReason || lastActionType
    ? ` | Последнее действие: ${translateUiText(lastActionReason || lastActionType)}`
    : "";
  const lastStartedItem = state.bossAuto.lastStarted && state.bossAuto.lastStarted.item
    ? state.bossAuto.lastStarted.item
    : null;
  const lastStartedLabel = lastStartedItem
    ? lastStartedItem.label || `#${lastStartedItem.bossId || "?"}`
    : "";
  const lastStartedSuffix = lastStartedLabel
    ? ` | Последний запуск: ${lastStartedLabel}${state.bossAuto.lastStarted && state.bossAuto.lastStarted.status ? ` (${translateUiText(state.bossAuto.lastStarted.status)})` : ""}`
    : "";
  const lastErrorSuffix = state.bossAuto.lastError
    ? ` | Последняя ошибка: ${translateUiText(state.bossAuto.lastError)}`
    : "";
  const snoozeSuffix = state.bossAuto.snoozedUntil
    ? ` | Пауза до ${new Date(state.bossAuto.snoozedUntil).toLocaleTimeString("ru-RU")}` +
      `${state.bossAuto.snoozeReason ? ` (${translateUiText(state.bossAuto.snoozeReason)})` : ""}`
    : "";
  const runnerLabels = {
    idle: "ожидает",
    running: "работает",
    paused: "приостановлен",
    stopped: "остановлен",
  };
  node.textContent =
    `Автообновление: ${enabled ? "включено" : "выключено"} (${intervalSec} сек.) | ` +
    `Автозапуск: ${autoStart ? "включён" : "выключен"} | ` +
    `Обработчик: ${runnerLabels[runnerState] || translateUiText(runnerState)} | Очередь: ${formatNumber(state.bossRunQueue.length)}` +
    `${lastActionSuffix}${lastStartedSuffix}${snoozeSuffix}${lastErrorSuffix}`;
}

function startBossCountdownTicker() {
  if (state.bossCountdownTimerId) {
    clearInterval(state.bossCountdownTimerId);
  }
  state.bossCountdownTimerId = setInterval(() => {
    renderBossLiveSummary();
    updateBossMeleeCooldownUi();
  }, 1000);
}

async function handleBossRunQueueAutoKillSoloChange(event) {
  const trigger = event && event.target && event.target.matches
    ? event.target
    : null;
  if (!trigger || !trigger.matches(".js-boss-run-auto-kill-solo, .js-boss-run-use-combo")) {
    return;
  }
  const index = Number(trigger.dataset.index || -1);
  if (!Number.isInteger(index) || index < 0 || index >= state.bossRunQueue.length) {
    return;
  }
  const previousItem = { ...state.bossRunQueue[index] };
  const nextItem = { ...state.bossRunQueue[index] };
  if (trigger.matches(".js-boss-run-use-combo")) {
    nextItem.skipCombo = !trigger.checked;
  } else if (trigger.checked) {
    delete nextItem.autoKillSolo;
  } else {
    nextItem.autoKillSolo = false;
  }
  state.bossRunQueue[index] = withBossRunQueueHitTypes(nextItem);
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  await syncBossAutomationAfterQueueEdit(
    "Boss queue solo auto-kill",
    { queueOperations: [{ type: "replace", from: previousItem, item: state.bossRunQueue[index] }] },
    { includeQueue: false },
  );
}

async function refreshBossAfterVisibilityResume() {
  if (
    state.bossResumeRefreshRunning
    || state.authGateActive
    || !document.body.classList.contains("app-ready")
  ) {
    return null;
  }

  state.bossResumeRefreshRunning = true;
  try {
    // Both endpoints probe `/api/boss/check-session`.  Run them in sequence:
    // simultaneous probes are more likely to produce a transient empty state
    // when a throttled browser tab becomes active again.
    const dashboard = await handleBossDashboard({
      fast: true,
      silent: true,
      showStatus: false,
      syncQueue: false,
    });
    const bossState = await handleBossStateRefresh({
      fast: true,
      silent: true,
      showStatus: false,
    });
    return { dashboard, bossState };
  } finally {
    state.bossResumeRefreshRunning = false;
  }
}

function initializeBossVisibilitySync() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refreshBossAfterVisibilityResume();
    }
  });
}

function openBagsTab() {
  const item = document.querySelector('[data-misc-section="bags"]');
  if (item) {
    item.click();
    window.requestAnimationFrame(() => {
      document.querySelector('[data-panel="misc"]')?.scrollIntoView({ block: "start" });
    });
  }
}

function hasBossActiveSession() {
  const context = resolveBossLiveContext();
  return Boolean(context.activeSession);
}

async function refreshBossAutomationOnly() {
  const payload = await apiRequest("GET", "/api/bosses/automation");
  applyBossAutomationState(payload, {
    syncControls: true,
    syncLocalTimer: false,
    renderQueue: true,
  });

  await handleBossDashboard({
    fast: true,
    silent: true,
    showStatus: false,
    syncQueue: false,
  });
  await handleBossStateRefresh({ fast: true, silent: true, showStatus: false });

  return payload;
}

function isBossTabActive() {
  const panel = document.querySelector('.tab-panel[data-panel="bosses"]');
  return Boolean(panel && panel.classList.contains("is-active"));
}

async function bossAutoTick() {
  if (state.bossAuto.running) {
    return;
  }
  state.bossAuto.running = true;
  try {
    const queueActive = state.bossRunQueue.length > 0
      || state.bossAuto.serverRunning
      || Boolean(state.bossAuto.pendingReward);
    if (queueActive) {
      await refreshBossAutomationOnly();
      return;
    }

    if (hasBossActiveSession()) {
      await handleBossStateRefresh({ silent: true, showStatus: false });
      return;
    }

    if (!isBossTabActive()) {
      return;
    }

    await handleBossDashboard({ fast: true, silent: true, showStatus: false, syncQueue: true });
  } finally {
    state.bossAuto.running = false;
    updateBossAutoStatus();
  }
}

function startBossAutoRefresh(options = {}) {
  const silent = Boolean(options.silent);
  const intervalSec = Math.max(
    5,
    Number(state.bossAuto.intervalSec || BOSS_AUTO_REFRESH_DEFAULT_SEC) || BOSS_AUTO_REFRESH_DEFAULT_SEC,
  );
  if (state.bossAuto.timerId) {
    clearInterval(state.bossAuto.timerId);
  }
  state.bossAuto.timerId = setInterval(bossAutoTick, intervalSec * 1000);
  state.bossAuto.localIntervalSec = intervalSec;
  if (!silent) {
    appendLog("Boss auto refresh enabled", `${intervalSec}s`);
  }
  updateBossAutoStatus();
  if (!options.skipImmediateTick) {
    bossAutoTick();
  }
}

function stopBossAutoRefresh(options = {}) {
  const silent = Boolean(options.silent);
  if (state.bossAuto.timerId) {
    clearInterval(state.bossAuto.timerId);
  }
  state.bossAuto.timerId = null;
  state.bossAuto.localIntervalSec = null;
  if (!silent) {
    appendLog("Boss auto refresh disabled");
  }
  updateBossAutoStatus();
}

function syncBossAutoRefreshLocal(options = {}) {
  const desiredIntervalSec = Math.max(
    5,
    Number(state.bossAuto.intervalSec || BOSS_AUTO_REFRESH_DEFAULT_SEC) || BOSS_AUTO_REFRESH_DEFAULT_SEC,
  );

  if (state.bossAuto.enabled) {
    if (
      state.bossAuto.timerId
      && Number(state.bossAuto.localIntervalSec) === desiredIntervalSec
    ) {
      updateBossAutoStatus();
      return;
    }
    startBossAutoRefresh({
      ...options,
      skipImmediateTick: options.skipImmediateTick !== false,
    });
  } else {
    stopBossAutoRefresh(options);
  }
}

async function handleBossAutoRefreshToggle() {
  try {
    await syncBossAutomationState({}, { renderQueue: false, syncQueue: false });
    appendLog("Boss auto refresh", state.bossAuto.enabled ? "enabled" : "disabled");
  } catch (error) {
    appendLog("Boss auto refresh failed", error.message || "error");
    appendDiagnosticError("bosses", error);
  }
}

async function handleBossAutoIntervalChange() {
  try {
    await syncBossAutomationState({}, { renderQueue: false, syncQueue: false });
    appendLog("Boss auto interval", `${state.bossAuto.intervalSec}s`);
  } catch (error) {
    appendLog("Boss auto interval failed", error.message || "error");
    appendDiagnosticError("bosses", error);
  }
}

async function handleBossAutoStartNextChange() {
  persistBossQueueSettings();
  try {
    await syncBossAutomationState({}, { renderQueue: false, syncQueue: false });
    appendLog("Boss auto start", state.bossAuto.autoStartNext ? "enabled" : "disabled");
  } catch (error) {
    appendLog("Boss auto start failed", error.message || "error");
    appendDiagnosticError("bosses", error);
  }
}

async function handleFriendsCollect() {
  setServerStatus("collecting", "busy");
  try {
    const options = collectFriendsOptions();
    const params = new URLSearchParams();
    params.set("limit", String(options.limit));
    params.set("sources", options.sources.join(","));
    const payload = await apiRequest("GET", `/api/friends/collect?${params.toString()}`);
    renderFriendsResult({
      selectedTotal: 0,
      okCount: 0,
      failCount: 0,
      delayMs: options.delayMs,
      results: [],
    });
    renderFriendsCollected(payload);
    const skippedExisting = payload.collected && payload.collected.skippedExisting
      ? `, пропущено уже существующих: ${payload.collected.skippedExisting}`
      : "";
    appendLog("Friends collected", `ID собрано: ${payload.collected.uniqueIds.total}${skippedExisting}`);
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("friends error", "error");
    appendDiagnosticError("friends", error);
  }
}

async function refreshFriendsSummary({ silent = false } = {}) {
  try {
    const payload = await apiRequest("GET", "/api/friends/summary");
    state.friendsSummary = payload;
    renderFriendsActionSummary();
    if (!silent) {
      appendLog("Friends", `${formatNumber(payload.friendsTotal)} в текущем списке`);
    }
    return payload;
  } catch (error) {
    if (!silent) {
      setServerStatus("friends summary error", "error");
      appendDiagnosticError("friends", error);
    }
    return null;
  }
}

async function refreshFriendsBatchProgress() {
  try {
    const payload = await apiRequest("GET", "/api/friends/batch-progress");
    renderFriendsBatchProgress(payload);
    return payload;
  } catch (_error) {
    return null;
  }
}

function startFriendsBatchProgressPolling() {
  if (state.friendsBatchPollTimerId) {
    clearInterval(state.friendsBatchPollTimerId);
  }
  void refreshFriendsBatchProgress();
  state.friendsBatchPollTimerId = setInterval(() => {
    void refreshFriendsBatchProgress();
  }, 500);
}

async function runWithFriendsBatchProgress(operation) {
  startFriendsBatchProgressPolling();
  try {
    return await operation();
  } finally {
    if (state.friendsBatchPollTimerId) {
      clearInterval(state.friendsBatchPollTimerId);
      state.friendsBatchPollTimerId = null;
    }
    await refreshFriendsBatchProgress();
  }
}

async function handleFriendsInvites() {
  const options = collectFriendsOptions();
  setServerStatus(options.dryRun ? "invite preview" : "sending invites", "busy");
  try {
    const payload = await runWithFriendsBatchProgress(() => apiRequest("POST", "/api/friends/invite-collected", options));
    renderFriendsResult(payload);
    if (state.friendsCollected) {
      renderFriendsCollected(state.friendsCollected);
    }
    if (options.resetProgress && $("#friends-reset-progress")) {
      $("#friends-reset-progress").checked = false;
    }
    const skipped = payload.skippedExisting ? `, пропущено: ${payload.skippedExisting}` : "";
    const progress = payload.progress && typeof payload.progress === "object"
      ? payload.progress
      : null;
    const progressMeta = progress
      ? ` | обработано ${formatNumber(progress.processedTotal || 0)}/${formatNumber(progress.queueTotal || 0)}, осталось ${formatNumber(progress.remainingTotal || 0)}`
      : "";
    appendLog("Friends invites", `${payload.okCount} успешно / ${payload.failCount} с ошибкой${skipped}${progressMeta}`);
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("invite error", "error");
    appendDiagnosticError("friends", error);
  }
}

async function handleFriendsAccept() {
  const options = collectFriendsBatchOptions();
  setServerStatus(options.dryRun ? "requests preview" : "processing requests", "busy");
  try {
    const payload = await runWithFriendsBatchProgress(() => apiRequest("POST", "/api/friends/accept-requests", options));
    renderFriendsResult(payload);
    await handleFriendsDamageRefresh({ silent: true, showStatus: false });
    const overflow = payload.skippedEligibleOverflow
      ? ` · ждут следующей пачки ${formatNumber(payload.skippedEligibleOverflow)}`
      : "";
    appendLog(
      "Friend requests",
      `${formatNumber(payload.acceptedCount || 0)} принято · ${formatNumber(payload.declinedCount || 0)} отклонено · ${formatNumber(payload.failCount || 0)} ошибок${overflow}`,
    );
    setServerStatus("ready", "ok");
    return payload;
  } catch (error) {
    setServerStatus("requests error", "error");
    appendDiagnosticError("friends", error);
    return null;
  }
}

function hasFriendsCleanupCriteria(options) {
  return options.minWeeklyDamage !== undefined || options.minTalents !== undefined;
}

async function handleFriendsCleanup() {
  const options = collectFriendsCleanupOptions();
  if (!hasFriendsCleanupCriteria(options)) {
    appendDiagnosticError("friends", new Error("Для чистки укажите порог недельного урона или минимум талантов."));
    return null;
  }
  const confirmed = window.confirm("Почистить друзей, которые явно не проходят выбранные условия?");
  if (!confirmed) {
    return null;
  }
  setServerStatus(options.dryRun ? "cleanup preview" : "cleaning friends", "busy");
  try {
    const payload = await runWithFriendsBatchProgress(() => apiRequest("POST", "/api/friends/cleanup", options));
    renderFriendsResult(payload);
    await refreshFriendsSummary({ silent: true });
    const skipped = [
      payload.skippedPassed ? `прошли условия ${formatNumber(payload.skippedPassed)}` : "",
      payload.skippedUnknownCriteria ? `неизвестные данные ${formatNumber(payload.skippedUnknownCriteria)}` : "",
      payload.skippedOverflow ? `сверх лимита ${formatNumber(payload.skippedOverflow)}` : "",
    ].filter(Boolean).join(", ");
    appendLog("Friends cleanup", `${payload.okCount} удалено / ${payload.failCount} с ошибкой${skipped ? ` · пропущено ${skipped}` : ""}`);
    setServerStatus("ready", "ok");
    return payload;
  } catch (error) {
    setServerStatus("cleanup error", "error");
    appendDiagnosticError("friends", error);
    return null;
  }
}

async function handleFriendsAction() {
  const options = collectFriendsActionOptions();
  setServerStatus(options.dryRun ? "action preview" : "running action", "busy");
  try {
    const payload = await runWithFriendsBatchProgress(() => apiRequest("POST", "/api/friends/action", options));
    renderFriendsResult(payload);
    appendLog("Friends action", `${payload.type}: ${payload.okCount} успешно / ${payload.failCount} с ошибкой · друзей: ${formatNumber(payload.friendsTotal)}`);
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("action error", "error");
    appendDiagnosticError("friends", error);
  }
}

async function autoAcceptTick() {
  if (state.friendsAutoAccept.running) {
    return;
  }
  state.friendsAutoAccept.running = true;
  try {
    await handleFriendsAccept();
  } finally {
    state.friendsAutoAccept.running = false;
  }
}

function startFriendsAutoAccept() {
  if (state.friendsAutoAccept.timerId) {
    clearInterval(state.friendsAutoAccept.timerId);
  }
  state.friendsAutoAccept.enabled = true;
  state.friendsAutoAccept.timerId = setInterval(autoAcceptTick, FRIENDS_AUTO_ACCEPT_INTERVAL_MS);
  appendLog("Auto-accept enabled", `${Math.round(FRIENDS_AUTO_ACCEPT_INTERVAL_MS / 1000)}s`);
  autoAcceptTick();
}

function stopFriendsAutoAccept() {
  if (state.friendsAutoAccept.timerId) {
    clearInterval(state.friendsAutoAccept.timerId);
  }
  state.friendsAutoAccept.timerId = null;
  state.friendsAutoAccept.enabled = false;
  appendLog("Auto-accept disabled");
}

function handleFriendsAutoAcceptToggle() {
  if ($("#friends-auto-accept").checked) {
    startFriendsAutoAccept();
  } else {
    stopFriendsAutoAccept();
  }
}

const MONTHLY_ACTION_LABELS = Object.freeze({
  SpitSoup: "Харкнуть в суп",
  AddYeast: "Подкинуть дрожжи",
  BicepsTrain: "Качнуть бицуху",
  UseHomieHeat: "Использовать подогрев",
  PrisonRun: "Пройти тюрьму",
  PrisonEarnAuthority: "Заработать авторитет в тюрьме",
  MasterSession: "Заняться у мастера",
  MasterEarnIntellect: "Получить интеллект у мастера",
  SendStashToPlayer: "Передать нычки",
  StressVictim: "Напасть на игрока",
  KillBoss: "Убить босса",
  UseChefirDrink: "Использовать чифир",
  ScamGambler: "Сыграть у Каталы",
});

function monthlyActionTitle(day) {
  if (day.title) {
    return day.title;
  }
  const suffix = day.targetId || day.prisonId || day.masterId || day.bossId;
  return `${MONTHLY_ACTION_LABELS[day.action] || day.action || "Неизвестное задание"}${suffix ? ` · #${suffix}` : ""}`;
}

function monthlyProgressLabel(day) {
  const required = Number(day.requiredAmount ?? day.targetAmount ?? day.target ?? day.amount ?? day.count ?? 0);
  return required > 0 ? `${formatNumber(day.progress)} / ${formatNumber(required)}` : formatNumber(day.progress);
}

function renderMiscMonthly(monthly) {
  const automation = monthly.automation || {};
  const monthlyControls = $("#monthly-policy-controls");
  if (monthlyControls && monthlyControls.dataset.dirty !== "true") {
    for (const [key, catalog, count, label] of [
      ["intellectMasterId", state.prisonDashboard?.masters || [], 16, "Мастер"],
      ["authorityPrisonId", state.prisonDashboard?.prisons || [], 15, "Тюрьма"],
    ]) {
      const select = monthlyControls.querySelector(`[data-quest-setting="${key}"]`);
      const ids = [...new Set([...Array.from({ length: count }, (_, i) => i + 1), Number(automation[key] || 1)])];
      select.innerHTML = ids.map((id) => `<option value="${id}">${escapeHtml(catalog.find((item) => Number(item.id) === id)?.name || `${label} #${id}`)}</option>`).join("");
    }
    syncQuestPolicyControls(monthlyControls, automation);
  }
  $("#misc-monthly-auto").checked = automation.enabled !== false;
  renderStatGrid($("#misc-monthly-summary"), [
    { label: "Месяц", value: `${String(monthly.month || 0).padStart(2, "0")}.${String(monthly.year || "—")}` },
    { label: "Выполнено", value: `${formatNumber(monthly.completedCount)} / ${formatNumber(monthly.daysInMonth)}` },
    { label: "Автоматика", value: automation.enabled !== false ? "включена" : "выключена" },
    { label: "Последняя проверка", value: automation.lastCheckAt ? formatDate(automation.lastCheckAt) : "ещё не было" },
  ]);
  const today = monthly.today;
  const todayEvaluation = today && today.evaluation ? today.evaluation : null;
  $("#misc-monthly-today").innerHTML = today ? `
    <div>
      <span class="misc-day-number">Сегодня · день ${escapeHtml(today.dayId)}</span>
      <strong>${escapeHtml(monthlyActionTitle(today))}</strong>
      <p>${escapeHtml(todayEvaluation ? todayEvaluation.note : today.note || "")}</p>
    </div>
    <div class="misc-today-status">
      ${today.completed ? buildBadge("выполнено", "success") : buildBadge(todayEvaluation ? todayEvaluation.label : today.label, todayEvaluation && todayEvaluation.tone === "expensive" ? "danger" : "success")}
      <span>${escapeHtml(monthlyProgressLabel(today))}</span>
    </div>
  ` : `<p>Сегодня нет активного задания.</p>`;
  $("#misc-monthly-calendar").innerHTML = (monthly.days || []).map((day) => {
    const evaluation = day.evaluation || {};
    const priceSoap = Number(monthly.buyPriceSoapByDay?.[String(day.dayId)]);
    const canBuy = monthly.active && day.expired && !day.completed && !day.isToday
      && Number.isSafeInteger(priceSoap) && priceSoap > 0;
    const tone = day.completed ? "is-complete" : day.isToday ? "is-today" : evaluation.tone === "expensive" ? "is-expensive" : "is-cheap";
    return `
      <article class="misc-month-day ${tone}" title="${escapeHtml(evaluation.note || day.note || "")}">
        <span class="misc-day-number">${escapeHtml(day.dayId)}</span>
        <strong>${escapeHtml(monthlyActionTitle(day))}</strong>
        <small>${day.completed ? "✓ выполнено" : day.expired ? "Пропущено" : escapeHtml(evaluation.label || day.label)}</small>
        ${canBuy ? `<button type="button" class="action-button action-button-mini" data-monthly-buy="${escapeHtml(day.dayId)}" ${monthlyPurchasePending ? "disabled" : ""}>Купить за ${formatNumber(priceSoap)} мыла</button>` : ""}
      </article>
    `;
  }).join("");
}

function renderMiscStashes(stashes, vparit) {
  const totals = stashes.totals || {};
  renderStatGrid($("#misc-stash-summary"), [
    { label: "Готово к впариванию", value: `${formatNumber(totals.readyCollections)} комплектов` },
    { label: "Ожидаемая награда", value: formatCurrencyAmounts(totals.rewards) },
  ]);
  const button = $("#misc-vparit-all-btn");
  button.disabled = Boolean(vparit.running) || Number(totals.sellableCycles || 0) === 0;
  button.textContent = vparit.running ? "Впаривание…" : "Впарить всё";
  button.setAttribute("aria-busy", vparit.running ? "true" : "false");
  const last = vparit.lastResult;
  const receivedResources = last && last.rewardsMeasured
    ? [
      Number(last.authority || 0) !== 0 ? `+${formatNumber(last.authority)} авторитета` : null,
      formatCurrencyAmounts(last.rewards),
    ].filter((value) => value && value !== "ничего").join(" · ") || "изменений не обнаружено"
    : null;
  const phaseLabels = {
    preparing: "Собираем готовые комплекты",
    selling: vparit.current && vparit.current.collectionName
      ? `Сейчас: ${vparit.current.collectionName}`
      : "Отправляем комплекты по очереди",
    verifying: "Сверяем полученные ресурсы",
  };
  const planned = Math.max(0, Number(vparit.planned) || 0);
  const processed = Math.max(0, Number(vparit.processed) || 0);
  const progress = planned > 0
    ? Math.min(100, Math.round((processed / planned) * 100))
    : 0;
  const rate = Number(vparit.ratePerSecond);
  const rateLabel = Number.isFinite(rate) && rate > 0
    ? `${rate.toFixed(rate >= 10 ? 1 : 2)} компл./с`
    : "замеряем скорость";
  const retries = Math.max(0, Number(vparit.rateLimitRetries) || 0);

  $("#misc-vparit-status").innerHTML = vparit.running ? `
    <div class="misc-vparit-progress is-running">
      <div class="misc-vparit-progress-head">
        <div>
          <strong>Впариваем нычки</strong>
          <span>${escapeHtml(phaseLabels[vparit.phase] || "Подготавливаем впаривание")}</span>
        </div>
        <b>${formatNumber(progress)}%</b>
      </div>
      <div class="misc-vparit-progress-track" role="progressbar" aria-label="Прогресс впаривания нычек" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
        <span style="width:${progress}%"></span>
      </div>
      <div class="misc-vparit-progress-meta">
        <span>${planned > 0 ? `${formatNumber(processed)} из ${formatNumber(planned)}` : "Подготовка очереди"}</span>
        <span>Успешно ${formatNumber(vparit.sold)}${Number(vparit.failed) > 0 ? ` · ошибок ${formatNumber(vparit.failed)}` : ""}</span>
        <span>${escapeHtml(rateLabel)}</span>
        ${vparit.estimatedRemainingMs !== null && vparit.estimatedRemainingMs !== undefined ? `<span>Осталось ≈ ${escapeHtml(formatBatchDuration(vparit.estimatedRemainingMs))}</span>` : ""}
        ${retries > 0 ? `<span>Ожиданий лимита: ${formatNumber(retries)}</span>` : ""}
      </div>
    </div>
  ` : last ? `
    <div class="misc-vparit-progress ${last.error ? "is-failed" : "is-complete"}">
      <div class="misc-vparit-progress-head">
        <div>
          <strong>${last.error ? "Впаривание остановлено" : "Последнее впаривание завершено"}</strong>
          <span>${escapeHtml(`${formatNumber(last.sold)} успешно · ${formatNumber(last.failed)} с ошибкой`)}</span>
        </div>
        ${buildBadge(last.error ? "ошибка" : "готово", last.error ? "danger" : "success")}
      </div>
      <div class="misc-vparit-progress-track" role="progressbar" aria-label="Прогресс последнего впаривания" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100">
        <span style="width:100%"></span>
      </div>
      <div class="misc-vparit-result">
        ${receivedResources ? `<span>Получено: <strong>${escapeHtml(receivedResources)}</strong></span>` : `<small>${escapeHtml(last.resourceSnapshotError || "В старом запуске ресурс не был сверен.")}</small>`}
        ${Number(last.elapsedMs) > 0 ? `<small>${formatNumber(last.processed)} комплектов за ${escapeHtml(formatBatchDuration(last.elapsedMs))}${Number(last.ratePerSecond) > 0 ? ` · ${Number(last.ratePerSecond).toFixed(2)} компл./с` : ""}</small>` : ""}
        ${last.error ? `<small>${escapeHtml(last.error)}</small>` : ""}
      </div>
    </div>
  ` : `
    <div class="misc-vparit-empty">
      <strong>Готово к запуску</strong>
      <span>После старта здесь появятся прогресс, скорость и оставшееся время.</span>
    </div>
  `;
}

function unwrapMiniGameData(value) {
  let current = value || {};
  for (let index = 0; index < 2; index += 1) {
    if (current && current.data && typeof current.data === "object") {
      current = current.data;
    }
  }
  return current || {};
}

function getMiniGameCards(value) {
  const payload = unwrapMiniGameData(value);
  const cards = payload.cards
    || payload.hand
    || payload.lastCards
    || payload.activeHand?.cards
    || (payload.card1 && payload.card2 ? [payload.card1, payload.card2] : []);
  return Array.isArray(cards) ? cards : [];
}

const MINI_GAME_BALANCE_DEFINITIONS = Object.freeze({
  fartovy: [
    { key: "green_matches", label: "Зелёные · ставки", aliases: ["slotsGrass"] },
    { key: "orange_matches", label: "Оранжевые · сумки", aliases: ["slotsOrenge", "slotsOrange"] },
    { key: "red_matches", label: "Красные · сумки", aliases: ["slotsRed"] },
    { key: "rubles", label: "Рубли", crop: false },
  ],
  katala: [
    { key: "rubles", label: "Баланс игры", crop: false },
  ],
  poker: [
    { key: "chips", label: "Фишки · партии" },
    { key: "pink_matches", label: "Розовые · сумки", aliases: ["pinkMatches"] },
    { key: "soap", label: "Мыло · партии", crop: false },
  ],
  wheel: [
    { key: "fortune_tickets", label: "Билеты · спины", aliases: ["tickets"] },
    { key: "blue_matches", label: "Синие · сумки", aliases: ["blueMatches"] },
    { key: "rubles", label: "Рубли", crop: false },
  ],
});

function getMiniGameBalanceValue(game, definition) {
  const source = game && typeof game === "object" ? game : {};
  const balances = source.balances && typeof source.balances === "object" ? source.balances : {};
  const keys = [definition.key, ...(definition.aliases || [])];
  for (const container of [balances, source]) {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(container, key)) {
        continue;
      }
      const value = Number(container[key]);
      if (Number.isFinite(value)) {
        return Math.max(0, value);
      }
    }
  }
  return 0;
}

function renderMiniGameBalances(kind, game) {
  const definitions = MINI_GAME_BALANCE_DEFINITIONS[kind] || [];
  return `
    <div class="mini-game-balances" data-mini-game-balances="${escapeHtml(kind)}" aria-label="Баланс">
      ${definitions.map((definition) => {
        const iconUrl = CURRENCY_ICON_URLS[definition.key];
        return `
          <span class="mini-game-balance" title="${escapeHtml(CURRENCY_LABELS[definition.key] || definition.label)}">
            <span class="mini-game-balance-icon ${definition.crop === false ? "" : "is-cropped"}">
              ${iconUrl
                ? `<img src="${escapeHtml(iconUrl)}" alt="" loading="lazy">`
                : `<span>${escapeHtml(definition.label.slice(0, 1))}</span>`}
            </span>
            <span class="mini-game-balance-copy">
              <small>${escapeHtml(definition.label)}</small>
              <strong>${escapeHtml(formatNumber(getMiniGameBalanceValue(game, definition)))}</strong>
            </span>
          </span>
        `;
      }).join("")}
    </div>
  `;
}

function formatPlayingCard(card) {
  const raw = typeof card === "string" ? card : card && (card.id || card.code || card.card) ? String(card.id || card.code || card.card) : "?";
  const [rankRaw, suitRaw] = raw.split("_");
  const suits = { hearts: "♥", diamonds: "♦", clubs: "♣", spades: "♠" };
  return { raw, rank: rankRaw || raw, suit: suits[suitRaw] || "", red: suitRaw === "hearts" || suitRaw === "diamonds" };
}

function renderPlayingCards(cards, options = {}) {
  if (!cards.length) {
    return `<div class="mini-card-empty">Карты появятся после начала партии</div>`;
  }
  return `<div class="mini-card-hand">${cards.map((card, index) => {
    const view = formatPlayingCard(card);
    const selected = options.selected && options.selected.includes(index);
    return `<button class="mini-playing-card ${view.red ? "is-red" : ""} ${selected ? "is-selected" : ""}" type="button" ${options.action ? `data-game-card-action="${options.action}" data-card-index="${index}"` : "disabled"}><strong>${escapeHtml(view.rank)}</strong><span>${escapeHtml(view.suit)}</span></button>`;
  }).join("")}</div>`;
}

function summarizeMiniGameReward(reward) {
  if (reward === null || reward === undefined) {
    return "";
  }
  if (Array.isArray(reward)) {
    return reward.map((item) => summarizeMiniGameReward(item)).filter(Boolean).join(", ");
  }
  if (typeof reward !== "object") {
    return String(reward);
  }
  const labels = {
    redGained: "красных",
    orangeGained: "оранжевых",
    orengeGained: "оранжевых",
    grassGained: "зелёных спичек",
    freeSpinsGained: "бесплатных спинов",
    rublesGained: "₽",
    ticketsGained: "билетов",
    expGained: "опыта",
    experienceGained: "опыта",
    chipsGained: "фишек",
    wheel_xp: "опыта колеса",
    cigarettes: "папирос",
    authority: "авторитета",
    blueMatches: "синих спичек",
    blue_matches: "синих спичек",
    paper: "бумаги",
    rubles: "₽",
    fortune_tickets: "билетов",
    ticket: "билетов",
    gunshot: "самопал",
    poison: "яд",
    chefir: "чифира",
    cheifir: "чифира",
    weapon: "оружие",
  };
  const gains = Object.entries(reward)
    .filter(([key, value]) => labels[key] && Number(value) > 0)
    .map(([key, value]) => `+${formatNumber(value)} ${labels[key]}`);
  if (gains.length > 0) {
    return gains.join(", ");
  }
  const name = reward.name || reward.title || reward.label || reward.itemName || reward.id;
  const amount = reward.amount ?? reward.count ?? reward.value;
  if (name && amount !== undefined) {
    return `${name}: ${formatNumber(amount)}`;
  }
  if (name) {
    return String(name);
  }
  const wearableKeys = new Set(["clothingId", "clothingIds", "tattooId", "tattooIds"]);
  const keys = Object.keys(reward);
  if (keys.length > 0 && keys.every((key) => wearableKeys.has(key))) {
    return "";
  }
  return keys.length > 0 ? "награда получена" : "";
}

function summarizeMiniGameWearable(item) {
  if (!item || typeof item !== "object") {
    return "";
  }
  const id = Number(item.id) || 0;
  const fallback = item.type === "tattoo" ? `Наколка #${id || "?"}` : `Вещь #${id || "?"}`;
  const name = String(item.name || fallback);
  const zone = item.type === "tattoo" && Number(item.zone) > 0 ? ` · зона ${Number(item.zone)}` : "";
  const setName = String(item.setName || "").trim();
  return `Выпало новое: ${name}${zone}${setName ? ` · ${setName}` : ""}`;
}

function describeMiniGameOutcome(entry) {
  const outcome = entry && entry.outcome ? entry.outcome : {};
  const parts = [];
  if (outcome.message) {
    parts.push(String(outcome.message));
  }
  if (Array.isArray(outcome.cards) && outcome.cards.length > 0) {
    parts.push(outcome.cards.map((card) => {
      const view = formatPlayingCard(card);
      return `${view.rank}${view.suit}`;
    }).join(", "));
  }
  if (outcome.reward !== null && outcome.reward !== undefined) {
    const reward = summarizeMiniGameReward(outcome.reward);
    if (reward) {
      parts.push(reward);
    }
  }
  if (Array.isArray(outcome.newWearables) && outcome.newWearables.length > 0) {
    const wearables = outcome.newWearables.map(summarizeMiniGameWearable).filter(Boolean);
    if (wearables.length > 0) {
      parts.push(wearables.join(", "));
    }
  }
  return parts.join(" · ") || (entry.ok ? "действие выполнено" : "игра вернула отказ");
}

function renderMiniGameAutomationStatus(automation) {
  if (!automation || (!automation.running && !automation.lastResult)) {
    return "";
  }
  const job = automation.running ? automation : automation.lastResult;
  if (!job) {
    return "";
  }
  const labels = { katala: "Катала", fartovy: "Фартовый", poker: "Покер", wheel: "Фортуна" };
  const progress = job.planned === null
    ? `${formatNumber(job.processed || 0)} спинов`
    : `${formatNumber(job.processed || 0)} / ${formatNumber(job.planned || 0)}`;
  const spent = job.spent && Object.entries(job.spent).filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => `${formatNumber(value)} ${key === "rubles" ? "₽" : key === "tickets" ? "билет." : "зелёных спичек"}`)
    .join(" · ");
  const reasonLabels = {
    completed: "лимит выполнен",
    stopped: "остановлен",
    target_found: "комбинация поймана",
    pending_prize: "приз ждёт решения",
    insufficient_grass: "не хватило зелёных спичек",
    insufficient_tickets: "не хватило билетов",
  };
  const reason = job.reason ? (reasonLabels[job.reason] || job.reason) : "";
  return `
    <div class="mini-game-automation ${automation.running ? "is-running" : ""}">
      <strong>${automation.running ? "Автоплей работает" : "Последний автоплей"} · ${escapeHtml(labels[job.kind] || job.kind || "игра")}</strong>
      <span>${escapeHtml(progress)} ${job.current ? `· ${escapeHtml(job.current)}` : ""}</span>
      <small>${escapeHtml(`Удач: ${formatNumber(job.successes || 0)}${spent ? ` · списано: ${spent}` : ""}${reason ? ` · ${reason}` : ""}`)}</small>
    </div>
  `;
}

const MINI_GAME_JOURNAL_REWARD_KEYS = Object.freeze({
  redgained: "red_matches",
  orangegained: "orange_matches",
  orengegained: "orange_matches",
  grassgained: "green_matches",
  rublesgained: "rubles",
  ticketsgained: "fortune_tickets",
  chipsgained: "chips",
  bluematches: "blue_matches",
  blue_matches: "blue_matches",
  pinkmatches: "pink_matches",
  greenmatches: "green_matches",
  cigarettes: "cigarettes",
  authority: "authority",
  paper: "paper",
  rubles: "rubles",
  fortune_tickets: "fortune_tickets",
  ticket: "fortune_tickets",
  gunshot: "gunshot",
  poison: "poison",
  knife: "knife",
  chefir: "chefir",
  cheifir: "chefir",
  soap: "soap",
  chips: "chips",
});

function collectMiniGameJournalRewardItems(entry) {
  const outcome = entry && entry.outcome && typeof entry.outcome === "object"
    ? entry.outcome
    : {};
  const rewards = [];
  const seenObjects = new Set();
  const visitReward = (value, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 4 || seenObjects.has(value)) {
      return;
    }
    seenObjects.add(value);
    if (Array.isArray(value)) {
      value.forEach((item) => visitReward(item, depth + 1));
      return;
    }
    for (const [rawKey, rawValue] of Object.entries(value)) {
      const key = MINI_GAME_JOURNAL_REWARD_KEYS[String(rawKey).toLowerCase()];
      const amount = Number(rawValue);
      if (key && Number.isFinite(amount) && amount > 0) {
        rewards.push({
          key: `minigame:${key}`,
          type: BOSS_WEAPON_ICON_URLS[key] ? "weapon" : "currency",
          label: BOSS_WEAPON_LABELS[key] || CURRENCY_LABELS[key] || key,
          amount,
          imageUrl: BOSS_WEAPON_ICON_URLS[key] || CURRENCY_ICON_URLS[key] || "",
          symbol: BOSS_WEAPON_ICON_URLS[key] ? "⚔" : "◆",
        });
      }
      if (rawValue && typeof rawValue === "object") {
        visitReward(rawValue, depth + 1);
      }
    }
  };
  visitReward(outcome.reward);

  const wearables = [
    ...(Array.isArray(outcome.newWearables) ? outcome.newWearables : []),
    ...(Array.isArray(outcome.rewardWearables) ? outcome.rewardWearables : []),
  ];
  for (const item of wearables) {
    const type = item && item.type === "tattoo" ? "tattoo" : "clothing";
    const id = item && item.id;
    rewards.push({
      key: `${type}:${id || item && item.name || rewards.length}`,
      type,
      id,
      label: String(item && item.name || (type === "tattoo" ? `Наколка #${id || "?"}` : `Вещь #${id || "?"}`)),
      amount: 1,
      imageUrl: String(item && (item.imageUrl || item.image || item.previewUrl) || ""),
      symbol: type === "tattoo" ? "✦" : "★",
      title: String(item && item.setName ? `${item.name || "Награда"} · ${item.setName}` : item && item.name || ""),
    });
  }
  return mergeJournalRewardItems(rewards);
}

function formatMiniGameJournalAction(action) {
  const labels = {
    "fartovy-spin": "Фартовый · прокрутка",
    "fartovy-bonus-open": "Фартовый · сумка",
    "fartovy-bonus-open-auto": "Фартовый · сумка",
    "fartovy-bonus-super": "Фартовый · суперигра",
    "katala-start": "Катала · новая партия",
    "katala-reroll": "Катала · пересдача",
    "katala-finish": "Катала · результат",
    "poker-finish": "Покер · результат",
    "wheel-spin": "Колесо фортуны · прокрутка",
    "wheel-cash": "Колесо фортуны · приз",
  };
  return labels[action] || translateUiText(String(action || "Мини-игра").replaceAll("-", " · "));
}

function syncMiniGameHistoryToJournal(history) {
  for (const entry of Array.isArray(history) ? history.slice(0, 30) : []) {
    const rewardItems = collectMiniGameJournalRewardItems(entry);
    const meta = describeMiniGameOutcome(entry);
    upsertJournalEntry({
      key: `minigame:${entry && entry.at || "unknown"}:${entry && entry.action || "action"}`,
      at: entry && entry.at,
      source: "misc",
      kind: entry && entry.ok === false ? "error" : rewardItems.length > 0 ? "reward" : "action",
      message: formatMiniGameJournalAction(entry && entry.action),
      meta,
      rewardItems,
      rewardLabel: rewardItems.length > 0 ? "Выпало" : "",
    });
  }
  renderLog();
}

function renderMiniGameHistory(history, automation) {
  void automation;
  syncMiniGameHistoryToJournal(history);
}

async function handleBossWeaponBuyClick(trigger) {
  const weaponType = String(trigger.dataset.weapon || "").trim();
  const count = Number(trigger.dataset.count || 0);
  const unitPrice = Number(trigger.dataset.unitPrice || BOSS_FIXED_PRICES[weaponType]);
  const totalRubles = unitPrice * count;
  if (
    !BOSS_WEAPON_ACTION_KEYS.has(weaponType)
    || !BOSS_WEAPON_BUY_BATCH_COUNTS.includes(count)
    || !Number.isFinite(unitPrice)
    || unitPrice <= 0
  ) {
    appendLog("Закупка оружия", "Некорректный тип оружия или размер партии", {
      source: "bosses",
      kind: "error",
    });
    return;
  }
  if (!await confirmBossWeaponPurchase({ weaponType, count, unitPrice, totalRubles })) {
    return;
  }

  const row = trigger.closest(".boss-weapon-pill");
  const buttons = row ? [...row.querySelectorAll(".js-boss-weapon-buy")] : [trigger];
  const initialLabel = trigger.textContent;
  buttons.forEach((button) => {
    button.disabled = true;
  });
  trigger.textContent = "Покупаю…";
  setServerStatus(`buy ${weaponType} x${count}`, "busy");
  try {
    const result = await apiRequest("POST", "/api/bosses/buy-weapon", {
      weaponType,
      count,
      dryRun: false,
      confirmed: true,
      maxRubles: totalRubles,
      expectedUnitPrice: unitPrice,
    });
    const verified = result.verified !== false;
    appendLog(
      "Закупка оружия",
      verified
        ? `${BOSS_WEAPON_LABELS[weaponType]} +${formatNumber(result.delta?.weapon ?? count)} · −${formatNumber(totalRubles)} ₽`
        : `${BOSS_WEAPON_LABELS[weaponType]} ×${formatNumber(count)}: запрос принят игрой, остатки обновляются`,
      { source: "bosses", kind: verified ? "action" : "automation" },
    );
    await Promise.all([
      handleEconomyRefresh(),
      handleBossDashboard({ fast: true, silent: true }),
    ]);
    setServerStatus("ready", "ok");
  } catch (error) {
    appendLog("Закупка оружия", error.message || String(error), {
      source: "bosses",
      kind: "error",
    });
    setServerStatus("weapon purchase error", "error");
  } finally {
    if (trigger.isConnected) {
      trigger.textContent = initialLabel;
    }
    if (state.bossDashboard && Array.isArray(state.bossDashboard.actions)) {
      renderBossWeaponPanel(state.bossDashboard.actions);
    }
  }
}

function renderMiniGameDailyStats(stats, kind) {
  const rows = (Array.isArray(stats) ? stats : [])
    .filter((entry) => entry.kind === kind)
    .slice(0, 3);
  if (rows.length === 0) {
    return `<p class="inline-note">Достоверная дневная статистика начнёт накапливаться с новых игровых действий.</p>`;
  }
  return `<div class="mini-game-daily-stats">${rows.map((entry) => {
    const rewards = Object.entries(entry.rewards || {})
      .slice(0, 4)
      .map(([key, amount]) => `${translateUiText(key)} ${formatSignedNumber(Number(amount))}`)
      .join(", ");
    return `<span><strong>${escapeHtml(entry.dayKey)}</strong> · действий ${formatNumber(entry.actions)} · успешно ${formatNumber(entry.successes)}${entry.wearables ? ` · вещей ${formatNumber(entry.wearables)}` : ""}${rewards ? ` · ${escapeHtml(rewards)}` : ""}</span>`;
  }).join("")}</div>`;
}

function renderMiscGames(games) {
  const last = state.miscGameSession || {};
  const lastPayload = unwrapMiniGameData(last.data);
  const katalaSession = String(last.action || "").startsWith("katala-") ? lastPayload : {};
  const katalaCards = getMiniGameCards(katalaSession);
  const pokerState = games.poker || {};
  const pokerSession = String(last.action || "").startsWith("poker-") ? lastPayload : {};
  const pokerCards = getMiniGameCards(pokerSession).length > 0
    ? getMiniGameCards(pokerSession)
    : getMiniGameCards(pokerState.activeHand || pokerState);
  const fartovy = games.fartovy || {};
  const wheel = games.wheel || {};
  const dailyStats = games.dailyStats || [];
  const automation = games.automation || {};
  const automationRunning = Boolean(automation.running);
  const automationKind = automation.kind || "";
  const fartovyAutoSpinEnabled = Boolean(fartovy.autoSpin && fartovy.autoSpin.enabled);
  const automationDisabled = automationRunning ? "disabled" : "";
  const fartovyLocked = automationRunning && automationKind === "fartovy";
  const katalaLocked = automationRunning && automationKind === "katala";
  const pokerLocked = automationRunning && automationKind === "poker";
  const wheelLocked = automationRunning && automationKind === "wheel";
  const fartovyDisabled = fartovyLocked ? "disabled" : "";
  const katalaDisabled = katalaLocked ? "disabled" : "";
  const pokerDisabled = pokerLocked ? "disabled" : "";
  const wheelDisabled = wheelLocked ? "disabled" : "";
  const pokerChips = getMiniGameBalanceValue(pokerState, MINI_GAME_BALANCE_DEFINITIONS.poker[0]);
  const pokerSoap = getMiniGameBalanceValue(pokerState, MINI_GAME_BALANCE_DEFINITIONS.poker[2]);
  const wheelTickets = getMiniGameBalanceValue(wheel, MINI_GAME_BALANCE_DEFINITIONS.wheel[0]);
  const wheelRewardLabels = {
    empty: "Пусто", prize: "Приз", ticket_1: "+1 билет", chefir_1: "+1 чифир",
    gun_1: "+1 самопал", poison_1: "+1 яд", rubles_10: "+10 ₽", paper_12: "+12 бумаги",
    cigs_3000: "+3 000 папирос", blue_50: "+50 синих спичек", blue_40: "+40 синих спичек",
    blue_30: "+30 синих спичек", blue_20: "+20 синих спичек", blue_10: "+10 синих спичек",
    wheel_xp_30: "+30 опыта колеса",
  };

  $("#misc-games-grid").innerHTML = `
    <article class="misc-game-card">
      <div class="misc-game-title"><span>🎰</span><strong>Фартовый</strong></div>
      <p>Зелёные спички идут на ставки, красные и оранжевые — на сумки с наколками. Бесплатных спинов: ${escapeHtml(formatNumber(fartovy.freeSpins || 0))}.</p>
      ${renderMiniGameBalances("fartovy", fartovy)}
      <div class="mini-game-fields">
        <label>Ставка <input id="fartovy-bet" type="number" min="1" max="10" value="${escapeHtml(String(fartovy.bet || 1))}" ${fartovyDisabled}></label>
        <label>Лимит игр <input id="fartovy-max-spins" type="number" min="1" max="10000" value="${escapeHtml(String(fartovy.autoSpin?.maxSpins || 100))}" ${fartovyDisabled}></label>
        <label>Задержка, мс <input id="fartovy-delay" type="number" min="250" max="60000" value="${escapeHtml(String(fartovy.autoSpin?.delayMs || 1000))}" ${fartovyDisabled}></label>
        <button class="text-button" type="button" data-game-action="fartovy-set-bet" ${fartovyDisabled}>Применить</button>
        <label>Купить зелёные спички <input id="fartovy-grass-amount" type="number" min="1" max="10000" value="10" ${fartovyDisabled}></label>
        <button class="text-button" type="button" data-game-action="fartovy-buy-grass" data-paid="1" ${fartovyDisabled}>Купить · ₽</button>
      </div>
      <div class="button-row compact-actions">
        <button class="action-button" type="button" data-game-automation="start" data-game-kind="fartovy" ${automationDisabled}>Крутить на всё</button>
        ${automationRunning && automationKind === "fartovy"
          ? `<label class="mini-game-check"><input id="fartovy-auto-spin" type="checkbox" ${fartovyAutoSpinEnabled ? "checked" : ""} disabled> Автопрокрут при наличии ставки</label><button class="text-button danger-button" type="button" data-game-automation="stop">Остановить прокрутку</button>`
          : `<label class="mini-game-check"><input id="fartovy-auto-bonus" type="checkbox" checked ${automationDisabled}> Авторазбор бонуса</label><label class="mini-game-check"><input id="fartovy-auto-spin" type="checkbox" ${fartovyAutoSpinEnabled ? "checked" : ""} ${automationDisabled}> Автопрокрут при наличии ставки</label>`}
      </div>
      ${renderMiniGameDailyStats(dailyStats, "fartovy")}
    </article>

    <article class="misc-game-card">
      <div class="misc-game-title"><span>🃏</span><strong>Катала</strong></div>
      <p>Уровень ${escapeHtml(formatNumber(games.katala?.level || 0))} · партий ${escapeHtml(formatNumber(games.katala?.totalPlays || 0))}. Нажми карту, которую хочешь пересдать.</p>
      ${renderMiniGameBalances("katala", games.katala || {})}
      ${renderPlayingCards(katalaCards, { action: katalaCards.length && !katalaLocked ? "katala-reroll" : null })}
      <div class="button-row compact-actions">
        ${katalaCards.length === 0 ? `<button class="action-button" type="button" data-game-action="katala-start" data-paid="1" ${katalaDisabled}>Начать · до 1 ₽</button>` : `<button class="action-button" type="button" data-game-action="katala-finish" ${katalaDisabled}>Забрать результат</button>`}
        ${automationRunning && automationKind === "katala"
          ? `<button class="text-button danger-button" type="button" data-game-automation="stop">Остановить автоплей</button>`
          : `<label>Цель <input id="katala-targets" type="text" value="AA" placeholder="AA, AK, KK" ${automationDisabled}></label><label>Лимит, ₽ <input id="katala-max-attempts" type="number" min="1" max="1000" value="100" ${automationDisabled}></label><label>Задержка, мс <input id="katala-delay" type="number" min="500" max="60000" value="900" ${automationDisabled}></label><button class="text-button" type="button" data-game-automation="start" data-game-kind="katala" ${automationDisabled}>Ловить комбинацию</button>`}
      </div>
      ${renderMiniGameDailyStats(dailyStats, "katala")}
    </article>

    <article class="misc-game-card">
      <div class="misc-game-title"><span>♠</span><strong>Покер</strong></div>
      <p>Фишки или мыло запускают партию, розовые спички идут на сумки с наколками. Ежедневный Ворон: ${pokerState.daily?.claimable ? "награду можно забрать" : "пока недоступен"}.</p>
      ${renderMiniGameBalances("poker", pokerState)}
      ${renderPlayingCards(pokerCards, { action: pokerCards.length && !pokerLocked ? "poker-select" : null, selected: state.miscPokerSelection })}
      <div class="button-row compact-actions">
        ${pokerCards.length === 0 ? `
          <button class="text-button" type="button" data-game-action="poker-soap" data-paid="1" ${pokerSoap < 5 || pokerLocked ? "disabled" : ""}>Начать · 5 мыла</button>
          <button class="text-button" type="button" data-game-action="poker-chips" data-paid="1" ${pokerChips <= 0 || pokerLocked ? "disabled" : ""}>Начать · 1 фишка</button>
        ` : `
          <button class="text-button" type="button" data-game-action="poker-draw" ${state.miscPokerSelection.length === 0 || pokerLocked ? "disabled" : ""}>Заменить выбранные</button>
          <button class="action-button" type="button" data-game-action="poker-finish" ${pokerDisabled}>Забрать комбинацию</button>
        `}
      </div>
      <details class="inline-settings">
        <summary>Автоматика покера</summary>
        <div class="inline-settings-body">
          <label class="toggle"><input id="poker-auto-chips" type="checkbox" checked ${automationDisabled}><span>Играть за фишки</span></label>
          <label class="toggle"><input id="poker-auto-soap" type="checkbox" ${automationDisabled}><span>Играть за мыло</span></label>
          <label class="toggle"><input id="poker-auto-raven" type="checkbox" checked ${automationDisabled}><span>Забирать ежедневного Ворона при claimable</span></label>
          <div class="field-grid">
            <label class="field"><span>Раздач за фишки</span><input id="poker-chip-hands" type="number" min="0" max="1000" value="10" ${automationDisabled}></label>
            <label class="field"><span>Раздач за мыло</span><input id="poker-soap-hands" type="number" min="0" max="1000" value="0" ${automationDisabled}></label>
            <label class="field"><span>Целевые комбинации</span><input id="poker-targets" type="text" value="straight,flush,full_house,four_of_a_kind,straight_flush,royal_flush" ${automationDisabled}></label>
            <label class="field"><span>Макс. замен</span><input id="poker-max-draws" type="number" min="0" max="5" value="1" ${automationDisabled}></label>
            <label class="field"><span>Задержка, мс</span><input id="poker-delay" type="number" min="500" max="60000" value="900" ${automationDisabled}></label>
          </div>
          ${automationRunning && automationKind === "poker"
            ? `<button class="text-button danger-button" type="button" data-game-automation="stop">Остановить покер</button>`
            : `<button class="action-button action-button-ghost" type="button" data-game-automation="start" data-game-kind="poker" ${automationDisabled}>Запустить покер</button>`}
        </div>
      </details>
    </article>

    <article class="misc-game-card">
      <div class="misc-game-title"><span>☸</span><strong>Колесо фортуны</strong></div>
      <p>Билеты идут на вращения, синие спички — на сумки с наколками. Уровень ${escapeHtml(formatNumber(wheel.wheelLevel || 0))} · банк ${escapeHtml(formatNumber(wheel.jackpotBank || 0))}.</p>
      ${renderMiniGameBalances("wheel", wheel)}
      <div class="mini-wheel-grid">${(wheel.slots || []).map((slot) => `<span class="mini-wheel-slot">${escapeHtml(wheelRewardLabels[slot.rewardId] || String(slot.rewardId || "?").replaceAll("_", " "))}</span>`).join("")}</div>
      <div class="mini-game-fields">
        <label>Билетов <input id="wheel-ticket-count" type="number" min="1" max="425" value="1" ${wheelDisabled}></label>
        <button class="text-button" type="button" data-game-action="wheel-buy" data-paid="1" ${wheelDisabled}>Купить · 10 ₽/шт.</button>
      </div>
      <div class="button-row compact-actions">
        <button class="action-button" type="button" data-game-action="wheel-spin" ${wheelTickets <= 0 || wheelLocked ? "disabled" : ""}>Крутить</button>
        ${wheel.hasPendingPrize ? `<button class="text-button" type="button" data-game-action="wheel-cash" ${wheelDisabled}>Забрать валютой</button><button class="text-button" type="button" data-game-action="wheel-risk" ${wheelDisabled}>Рискнуть призом</button>` : ""}
        ${automationRunning && automationKind === "wheel"
          ? `<button class="text-button danger-button" type="button" data-game-automation="stop">Остановить автоплей</button>`
          : `<label>Лимит спинов <input id="wheel-max-spins" type="number" min="1" max="1000" value="25" ${automationDisabled}></label><button class="text-button" type="button" data-game-automation="start" data-game-kind="wheel" ${automationDisabled}>Автоплей</button>`}
      </div>
    </article>
  `;
  renderMiniGameHistory(games.history || [], automation);
}

function wearableCollectionTypeLabel(type) {
  return type === "tattoo" ? "Наколка" : type === "clothing" ? "Одежда" : type || "Предмет";
}

function wearableCollectionSearchText(value) {
  return String(value || "").toLocaleLowerCase("ru").replace(/ё/g, "е").trim();
}

function collectionHasBonus(group, key) {
  return Number(group?.potentialBonuses?.[key] || 0) !== 0;
}

function collectionGroupMatchesStatus(group, statusFilter) {
  const collected = Number(group?.collected || 0);
  const total = Number(group?.total || 0);
  const complete = Boolean(group?.complete) || (total > 0 && collected >= total);

  if (statusFilter === "complete") {
    return complete;
  }
  if (statusFilter === "missing") {
    return !complete;
  }
  if (statusFilter === "partial") {
    return collected > 0 && collected < total;
  }
  return true;
}

function collectionGroupMatchesFilters(group) {
  const search = wearableCollectionSearchText($("#wearable-collection-search")?.value);
  const bonusFilter = $("#wearable-collection-bonus-filter")?.value || "all";
  const statusFilter = $("#wearable-collection-status-filter")?.value || "all";
  const kindFilter = state.wearableCollectionKindFilter || "all";

  if (
    kindFilter !== "all"
    && !(group.items || []).some((item) => String(item.type || "") === kindFilter)
  ) {
    return false;
  }

  if (search) {
    const haystack = wearableCollectionSearchText([
      group.name,
      group.description,
      group.sourceLabel,
      ...(group.items || []).map((item) => `${item.name} ${item.description || ""}`),
    ].join(" "));
    if (!haystack.includes(search)) {
      return false;
    }
  }

  if (bonusFilter === "damage" && !["poison", "gunshot", "knife"].some((key) => collectionHasBonus(group, key))) {
    return false;
  }
  if (["poison", "gunshot", "knife", "maxEnergy"].includes(bonusFilter) && !collectionHasBonus(group, bonusFilter)) {
    return false;
  }
  if (bonusFilter === "visual" && !group.visualOnly) {
    return false;
  }
  if (bonusFilter === "other") {
    const otherKeys = Object.entries(group.potentialBonuses || {})
      .filter(([key, value]) => Number(value) !== 0 && !["poison", "gunshot", "knife", "maxEnergy"].includes(key));
    if (otherKeys.length === 0) {
      return false;
    }
  }

  if (!collectionGroupMatchesStatus(group, statusFilter)) {
    return false;
  }

  return true;
}

function renderWearableCollectionMatrix(payload) {
  const target = $("#wearable-collection-matrix");
  if (!target) {
    return;
  }
  const groups = (payload.categories || []).flatMap((category) => category.groups || []);
  const definitions = [
    ["poison", "Яд"],
    ["gunshot", "Самопал"],
    ["knife", "Финка"],
    ["maxEnergy", "Энергия"],
  ];
  target.innerHTML = definitions.map(([key, label]) => {
    const matching = groups.filter((group) => collectionHasBonus(group, key));
    const collected = matching.filter((group) => (
      group.complete || Number(group.collected || 0) >= Number(group.total || 0)
    )).length;
    return `
      <article>
        <strong>${escapeHtml(label)}</strong>
        <span>${formatNumber(collected)} / ${formatNumber(matching.length)} собрано</span>
        <small>Не собрано: ${formatNumber(Math.max(0, matching.length - collected))}</small>
      </article>
    `;
  }).join("");
}

function renderWearableSpecials(specials) {
  const target = $("#wearable-collection-specials");
  if (!target) {
    return;
  }
  target.innerHTML = (specials || []).map((item) => {
    const availability = item.owned
      ? buildBadge("есть в коллекции", "success")
      : buildBadge("не найдено", "neutral");
    const affected = item.id === "keychain" && Number(item.affectedBossCount) > 0
      ? `<small>Сейчас открывает без ключей: ${escapeHtml(formatNumber(item.affectedBossCount))} боссов</small>`
      : "";
    return `
      <article class="wearable-special-card ${item.owned ? "is-owned" : ""}" data-special="${escapeHtml(item.id)}">
        <div class="wearable-special-art">
          ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy">` : `<span aria-hidden="true">★</span>`}
        </div>
        <div class="wearable-special-copy">
          <div class="wearable-special-title">
            <span>ОСОБЫЙ ПРЕДМЕТ</span>
            ${availability}
          </div>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.effect)}</p>
          <small>${escapeHtml(item.sourceLabel)}</small>
          ${affected}
        </div>
      </article>
    `;
  }).join("");
}

function wearableCollectionGroupMarkup(group) {
  const progress = group.complete
    ? buildBadge("собрано", "success")
    : buildBadge(`${formatNumber(group.collected)} / ${formatNumber(group.total)}`, group.collected > 0 ? "neutral" : "danger");
  return `
    <details
      class="wearable-set-card ${group.special ? "is-special" : ""} ${group.complete ? "is-complete" : ""}"
      data-collection-group-key="${escapeHtml(group.key)}"
    >
      <summary>
        <span class="wearable-set-preview">
          ${group.imageUrl ? `<img src="${escapeHtml(group.imageUrl)}" alt="" loading="lazy">` : `<span aria-hidden="true">◇</span>`}
        </span>
        <span class="wearable-set-main">
          <span class="wearable-set-title-line">
            <strong>${escapeHtml(group.name)}</strong>
            ${group.special === "raven" ? `<span class="wearable-rare-label">ОСОБЫЙ</span>` : ""}
          </span>
          <small>${escapeHtml(wearableCollectionTypeLabel(group.type))} · ${escapeHtml(group.sourceLabel)}</small>
          <span class="wearable-set-bonuses">${renderWearableBonusChips(group.potentialBonuses, "только внешний вид")}</span>
        </span>
        <span class="wearable-set-progress">
          ${progress}
          <small>${group.complete ? "весь комплект" : `${formatNumber(group.total - group.collected)} не собрано`}</small>
        </span>
        <span class="wearable-set-chevron" aria-hidden="true"></span>
      </summary>
      <div class="wearable-set-detail">
        <div class="collection-loading-state is-compact">Открываю состав комплекта…</div>
      </div>
    </details>
  `;
}

function renderWearableCollectionGroupDetail(details) {
  if (!details?.open || details.dataset.itemsRendered === "true") {
    return;
  }
  const group = state.wearableCollectionGroups.get(details.dataset.collectionGroupKey);
  const target = details.querySelector(".wearable-set-detail");
  if (!group || !target) {
    return;
  }

  target.innerHTML = `
    <div class="wearable-set-detail-head">
      <div>
        <span>Бонус всего комплекта</span>
        <div class="wearable-set-bonuses">${renderWearableBonusChips(group.potentialBonuses, "боевых бонусов нет")}</div>
      </div>
      <div>
        <span>Уже действует у тебя</span>
        <div class="wearable-set-bonuses">${renderWearableBonusChips(group.collectedBonuses, "ничего не собрано")}</div>
      </div>
    </div>
    ${group.description ? `<p class="wearable-set-description">${escapeHtml(group.description)}</p>` : ""}
    ${(group.sourceLabels || []).length > 1 ? `<p class="wearable-set-description"><strong>Где достаётся:</strong> ${escapeHtml(group.sourceLabels.join(" · "))}</p>` : ""}
    <div class="wearable-piece-grid">
      ${(group.items || []).map((item) => `
        <article class="wearable-piece ${item.owned ? "is-owned" : "is-missing"}">
          <div class="wearable-piece-art">
            ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy">` : `<span aria-hidden="true">◇</span>`}
            <span class="wearable-piece-state" title="${item.owned ? "Есть в коллекции" : "Не собрано"}">${item.owned ? "✓" : "−"}</span>
          </div>
          <strong>${escapeHtml(item.name || group.name)}</strong>
          <small>${item.zone ? `Зона ${escapeHtml(formatNumber(item.zone))}` : escapeHtml(wearableCollectionTypeLabel(item.type))}</small>
          <div class="wearable-piece-bonuses">${renderWearableBonusChips(item.combatStatsBonus, "без бонуса")}</div>
        </article>
      `).join("")}
    </div>
  `;
  details.dataset.itemsRendered = "true";
}

function renderWearableCategory(category) {
  const filtered = (category.groups || []).filter(collectionGroupMatchesFilters);
  const bonusGroups = filtered.filter((group) => !group.visualOnly);
  const cosmeticGroups = filtered.filter((group) => group.visualOnly);
  const allBonuses = renderWearableBonusChips(category.totals?.potentialBonuses, "боевых бонусов нет");
  const collectedBonuses = renderWearableBonusChips(category.totals?.collectedBonuses, "ничего не собрано");
  const emptyMessage = "По выбранным фильтрам здесь ничего нет.";

  return `
    <section id="collection-category-${escapeHtml(category.id)}" class="wearable-category-card">
      <div class="wearable-category-head">
        <div>
          <span class="wearable-category-kicker">ИСТОЧНИК</span>
          <h3>${escapeHtml(category.title)}</h3>
          <p>${escapeHtml(category.description || "")}</p>
        </div>
        <div class="wearable-category-counters">
          <strong>${escapeHtml(formatNumber(category.totals?.collected || 0))} / ${escapeHtml(formatNumber(category.totals?.total || 0))}</strong>
          <span>${escapeHtml(formatNumber(category.totals?.totalSets || 0))} комплектов</span>
        </div>
      </div>
      <div class="wearable-category-total">
        <div>
          <span>Суммарный плюс всех предметов</span>
          <div class="wearable-set-bonuses">${allBonuses}</div>
        </div>
        <div class="wearable-category-owned-bonuses">
          <span>У тебя уже действует</span>
          <div class="wearable-set-bonuses">${collectedBonuses}</div>
        </div>
      </div>
      ${bonusGroups.length > 0 ? `
        <div class="wearable-set-grid">
          ${bonusGroups.map(wearableCollectionGroupMarkup).join("")}
        </div>
      ` : ""}
      ${cosmeticGroups.length > 0 ? `
        <details class="wearable-cosmetic-folder">
          <summary>
            <span class="wearable-folder-icon" aria-hidden="true"></span>
            <span><strong>Только внешний вид</strong><small>${escapeHtml(formatNumber(cosmeticGroups.length))} комплектов без боевого бонуса</small></span>
            <span class="wearable-set-chevron" aria-hidden="true"></span>
          </summary>
          <div class="wearable-set-grid">
            ${cosmeticGroups.map(wearableCollectionGroupMarkup).join("")}
          </div>
        </details>
      ` : ""}
      ${filtered.length === 0 ? `<div class="wearable-category-empty">${escapeHtml(emptyMessage)}</div>` : ""}
    </section>
  `;
}

function renderWearableCollectionCategories() {
  const payload = state.wearableCollectionDashboard;
  if (!payload) {
    return;
  }
  const categories = payload.categories || [];
  const categoryTarget = $("#wearable-collection-categories");
  const navTarget = $("#wearable-collection-category-nav");
  if (!categoryTarget || !navTarget) {
    return;
  }

  const availableCategoryIds = new Set(categories.map((category) => String(category.id)));
  if (
    state.wearableCollectionCategoryFilter !== "all"
    && !availableCategoryIds.has(String(state.wearableCollectionCategoryFilter))
  ) {
    state.wearableCollectionCategoryFilter = "all";
  }
  const selectedCategoryId = String(state.wearableCollectionCategoryFilter || "all");
  const categoryFilters = [
    {
      id: "all",
      title: "Все",
      total: payload.totals?.total || 0,
    },
    ...categories.map((category) => ({
      id: String(category.id),
      title: category.title,
      total: category.totals?.total || 0,
    })),
  ];
  const visibleCategories = selectedCategoryId === "all"
    ? categories
    : categories.filter((category) => String(category.id) === selectedCategoryId);

  navTarget.innerHTML = categoryFilters.map((category) => `
    <button
      type="button"
      class="${category.id === selectedCategoryId ? "is-active" : ""}"
      data-collection-category-filter="${escapeHtml(category.id)}"
      aria-pressed="${category.id === selectedCategoryId ? "true" : "false"}"
    >
      <span>${escapeHtml(category.title)}</span>
      <b>${escapeHtml(formatNumber(category.total))}</b>
    </button>
  `).join("");
  categoryTarget.innerHTML = visibleCategories.map(renderWearableCategory).join("");
}

function handleWearableCollectionCategoryNavClick(event) {
  const button = event.target.closest("[data-collection-category-filter]");
  if (!button) {
    return;
  }
  state.wearableCollectionCategoryFilter = button.dataset.collectionCategoryFilter || "all";
  renderWearableCollectionCategories();
}

function renderWearableCollectionDashboard(payload) {
  state.wearableCollectionDashboard = payload;
  state.wearableCollectionGroups = new Map(
    (payload.categories || []).flatMap((category) => category.groups || []).map((group) => [group.key, group]),
  );
  const totals = payload.totals || {};
  const summaryTarget = $("#wearable-collection-summary");
  renderStatGrid(summaryTarget, [
    { label: "Собрано предметов", value: `${formatNumber(totals.collected || 0)} / ${formatNumber(totals.total || 0)}` },
    { label: "Одежда / наколки", value: `${formatNumber(totals.clothing || 0)} / ${formatNumber(totals.tattoos || 0)}` },
    { label: "Комплекты с бонусом", value: formatNumber(totals.bonusSets || 0) },
  ]);
  summaryTarget?.insertAdjacentHTML("beforeend", `
    <div class="wearable-owned-bonus-card">
      <div class="wearable-owned-bonus-copy">
        <strong>Собранные вещи дают</strong>
        <span>Сумма только тех предметов и наколок, которые уже есть у тебя</span>
      </div>
      <div class="wearable-set-bonuses">
        ${renderWearableBonusChips(totals.collectedBonuses, "собранных боевых бонусов пока нет")}
      </div>
    </div>
    <div class="wearable-owned-bonus-card is-potential">
      <div class="wearable-owned-bonus-copy">
        <strong>Общий плюс всех вещей</strong>
        <span>Сумма полного каталога, если собрать каждый предмет и каждую наколку</span>
      </div>
      <div class="wearable-set-bonuses">
        ${renderWearableBonusChips(totals.potentialBonuses, "боевых бонусов в каталоге нет")}
      </div>
    </div>
  `);
  renderWearableSpecials(payload.specials || []);
  renderWearableCollectionMatrix(payload);
  const updated = payload.catalogGeneratedAt || payload.generatedAt;
  $("#wearable-collection-updated").textContent = updated ? `Каталог: ${formatDate(updated)}` : "";
  $("#wearable-collection-status").hidden = true;
  renderWearableCollectionCategories();
}

function scheduleWearableCollectionRender() {
  if (state.wearableCollectionRenderFrame) {
    cancelAnimationFrame(state.wearableCollectionRenderFrame);
  }
  state.wearableCollectionRenderFrame = requestAnimationFrame(() => {
    state.wearableCollectionRenderFrame = null;
    renderWearableCollectionCategories();
  });
}

async function handleWearableCollectionDashboard(options = {}) {
  const button = $("#wearable-collection-refresh");
  const status = $("#wearable-collection-status");
  const forceRefresh = Boolean(options.forceRefresh);
  if (button) {
    button.disabled = true;
    button.textContent = forceRefresh ? "Собираю 42 зоны…" : "Загружаю…";
  }
  if (status) {
    status.hidden = false;
    status.textContent = forceRefresh
      ? "Обновляю одежду и наколки во всех 42 зонах. Это займёт около полуминуты."
      : "Загружаю коллекцию вещей…";
  }

  try {
    const payload = await apiRequest("GET", `/api/collection/dashboard${forceRefresh ? "?refresh=1" : ""}`);
    renderWearableCollectionDashboard(payload);
    appendLog("Коллекция вещей", `${formatNumber(payload.totals?.total || 0)} предметов · ${formatNumber(payload.totals?.bonusSets || 0)} комплектов с бонусом`);
    return payload;
  } catch (error) {
    if (status) {
      status.hidden = false;
      status.textContent = `Не удалось загрузить каталог: ${error.message || String(error)}`;
    }
    appendLog("Коллекция вещей", error.message || String(error));
    return null;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Обновить каталог";
    }
  }
}

const LOOT_REWARD_GROUP_META = Object.freeze([
  { key: "currency", label: "Валюта", icon: "₽" },
  { key: "stashes", label: "Нычки", icon: "▣" },
  { key: "weapons", label: "Оружие", icon: "⚔" },
  { key: "keys", label: "Ключи боссов", icon: "◆" },
  { key: "tattoos", label: "Наколки", icon: "✦" },
  { key: "clothing", label: "Шмотка", icon: "★" },
]);

function lootResourceIconMarkup(currency, className = "loot-resource-icon") {
  const iconUrl = CURRENCY_ICON_URLS[currency];
  return iconUrl
    ? `<img class="${escapeHtml(className)}" src="${escapeHtml(iconUrl)}" alt="" loading="lazy">`
    : "";
}

function setLootBadge(target, label, tone = "neutral") {
  if (!target) {
    return;
  }
  target.className = tone === "danger"
    ? "badge badge-danger"
    : tone === "success"
      ? "badge"
      : "badge badge-neutral";
  target.textContent = label;
}

function lootRewardItemMarkup(item) {
  const amount = Number(item?.amount || 0);
  const image = item?.image
    || (item?.type === "currency" ? CURRENCY_ICON_URLS[item.id] : null)
    || (item?.type === "weapon" ? BOSS_WEAPON_ICON_URLS[item.id] : null);
  const bonus = item?.tattooTotalBonus !== null && item?.tattooTotalBonus !== undefined
    ? ` · бонус ${formatNumber(item.tattooTotalBonus)}`
    : "";
  const details = item?.setName || item?.bossTitle || item?.description || "";
  return `
    <span class="loot-reward-chip ${item?.type === "clothing" || item?.type === "tattoo" ? "is-special" : ""}">
      ${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy">` : ""}
      <span>
        <strong>${escapeHtml(item?.label || item?.name || item?.id || "Награда")}</strong>
        <small>${amount > 0 ? `+${escapeHtml(formatNumber(amount))}` : "выпало"}${escapeHtml(bonus)}${details ? ` · ${escapeHtml(details)}` : ""}</small>
      </span>
    </span>
  `;
}

function lootRewardGroupAmount(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (total, item) => total + Math.max(0, Number(item?.amount) || 0),
    0,
  );
}

function lootRewardGroupMarkup(group) {
  if (group.key === "stashes") {
    const total = lootRewardGroupAmount(group.items) || group.items.length;
    return `
      <section class="loot-reward-group is-summary" data-loot-group="${escapeHtml(group.key)}">
        <div class="loot-reward-group-title">
          <span aria-hidden="true">${escapeHtml(group.icon)}</span>
          <strong>${escapeHtml(group.label)}</strong>
          <small>Всего ${escapeHtml(formatNumber(total))}</small>
        </div>
      </section>
    `;
  }

  return `
    <section class="loot-reward-group" data-loot-group="${escapeHtml(group.key)}">
      <div class="loot-reward-group-title">
        <span aria-hidden="true">${escapeHtml(group.icon)}</span>
        <strong>${escapeHtml(group.label)}</strong>
        <small>${escapeHtml(formatNumber(group.items.length))}</small>
      </div>
      <div class="loot-reward-chip-list">
        ${group.items.map(lootRewardItemMarkup).join("")}
      </div>
    </section>
  `;
}

function renderLootRewardGroups(rewards, options = {}) {
  const source = rewards && typeof rewards === "object" ? rewards : {};
  const groups = LOOT_REWARD_GROUP_META
    .map((meta) => ({ ...meta, items: Array.isArray(source[meta.key]) ? source[meta.key] : [] }))
    .filter((group) => group.items.length > 0);

  if (groups.length === 0) {
    return `<div class="loot-reward-empty">${escapeHtml(options.empty || "Содержимое пока не получено.")}</div>`;
  }

  return groups.map(lootRewardGroupMarkup).join("");
}

function collectLootJournalRewardItems(rewards) {
  const source = rewards && typeof rewards === "object" ? rewards : {};
  const result = [];
  for (const group of LOOT_REWARD_GROUP_META) {
    const groupItems = Array.isArray(source[group.key]) ? source[group.key] : [];
    if (group.key === "stashes" && groupItems.length > 0) {
      const amount = lootRewardGroupAmount(groupItems) || groupItems.length;
      result.push({
        key: "loot:stashes",
        type: "stash",
        id: "stash",
        label: "Нычки",
        amount,
        imageUrl: BOSS_STASH_ICON_URL,
        symbol: group.icon,
        title: `Нычки +${formatNumber(amount)}`,
      });
      continue;
    }
    for (const item of groupItems) {
      const type = String(item && item.type || (
        group.key === "tattoos" ? "tattoo"
          : group.key === "clothing" ? "clothing"
            : group.key === "weapons" ? "weapon"
              : group.key === "currency" ? "currency"
                : group.key
      ));
      const id = item && item.id;
      const amountValue = Number(item && item.amount);
      const amount = Number.isFinite(amountValue) && amountValue !== 0
        ? amountValue
        : ["tattoo", "clothing"].includes(type)
          ? 1
          : null;
      const imageUrl = String(
        item && (item.image || item.imageUrl || item.previewUrl)
        || (type === "currency" ? CURRENCY_ICON_URLS[id] : "")
        || (type === "weapon" ? BOSS_WEAPON_ICON_URLS[id] : "")
        || (type === "stashes" || type === "stash" ? BOSS_STASH_ICON_URL : "")
        || "",
      );
      result.push({
        key: `loot:${group.key}:${id || item && (item.label || item.name) || result.length}`,
        type,
        id,
        label: String(item && (item.label || item.name) || group.label),
        amount,
        imageUrl,
        symbol: group.icon,
        title: String(item && (item.setName || item.description || item.bossTitle) || ""),
      });
    }
  }
  return mergeJournalRewardItems(result);
}

function syncLootContainerHistoryToJournal(history) {
  for (const entry of Array.isArray(history) ? history.slice(0, 30) : []) {
    if (!entry) {
      continue;
    }
    const rewardItems = collectLootJournalRewardItems(entry.rewards);
    const clothing = Boolean(entry.rewards?.hasClothing || (entry.rewards?.clothing || []).length);
    const tattoo = Boolean(entry.rewards?.hasTattoo || (entry.rewards?.tattoos || []).length);
    const details = [
      Number(entry.levelBefore) > 0 ? `уровень ${formatNumber(entry.levelBefore)}` : "",
      clothing ? "выпала шмотка" : "",
      tattoo ? "выпала наколка" : "",
    ].filter(Boolean);
    upsertJournalEntry({
      key: `loot:${entry.openedAt || "unknown"}:${entry.kind || "container"}`,
      at: entry.openedAt,
      source: "misc",
      kind: "reward",
      message: entry.kind === "baul" ? "Баул открыт" : "Посылка открыта",
      meta: details.join(" · ") || "Награды получены",
      rewardItems,
      rewardLabel: "Выпало",
    });
  }
  renderLog();
}

function renderLootContainerResult(entry, options = {}) {
  if (entry) {
    syncLootContainerHistoryToJournal([entry]);
  }
  void options;
}

function renderLootContainerHistory(history) {
  syncLootContainerHistoryToJournal(history);
}

function findLatestLootContainerEntry(payload, kind, preferred = null) {
  return [
    preferred,
    payload && payload.lastOpen,
    ...(Array.isArray(payload && payload.history) ? payload.history : []),
  ].find((entry) => entry && entry.kind === kind) || null;
}

function renderLootParcelResult(entry, options = {}) {
  const target = $("#loot-parcel-rewards");
  if (!target) {
    return;
  }
  if (!entry) {
    target.innerHTML = `
      <div class="loot-reward-empty">
        После открытия здесь появится всё содержимое посылки.
      </div>
    `;
    return;
  }

  const openedAt = entry.openedAt || "";
  const fullDate = new Date(openedAt).toLocaleString("ru-RU");
  target.innerHTML = `
    <div class="loot-parcel-result-head">
      <strong>${options.fresh ? "Только что выпало" : "Последняя посылка"}</strong>
      ${openedAt
        ? `<time datetime="${escapeHtml(openedAt)}" title="${escapeHtml(fullDate)}">${escapeHtml(formatJournalEntryTime(openedAt))}</time>`
        : ""}
    </div>
    <div class="loot-reward-groups">
      ${renderLootRewardGroups(entry.rewards, { empty: "Посылка открыта без распознанных наград." })}
    </div>
  `;
}

function bagImageUrl(bag) {
  if (!bag) return "";
  if (bag.family === "brigade") {
    const variant = Math.max(1, Number(bag.variant || String(bag.bagId || "").match(/\d+/)?.[0] || 1));
    return `${BRIGADE_BAG_ASSET_BASE_URL}/bagGuildWell_${variant}.webp`;
  }
  const iconKey = String(bag.iconKey || `bag_${bag.bagId || "p1"}`).replace(/[^a-z0-9_-]/gi, "");
  return `${ZARUBA_BAG_ASSET_BASE_URL}/${iconKey}.webp`;
}

function bagCurrencyMeta(bag) {
  if (bag?.family === "brigade") {
    return {
      label: "повязок",
      iconUrl: CURRENCY_ICON_URLS[bag.currency] || CURRENCY_ICON_URLS.armband_1,
    };
  }
  return { label: "печаток", iconUrl: CURRENCY_ICON_URLS.signet };
}

function brigadeArmbandSummary(balances) {
  return Object.entries(balances && typeof balances === "object" ? balances : {})
    .filter(([key]) => /^armband_\d+$/i.test(key))
    .sort(([left], [right]) => Number(left.match(/\d+/)?.[0] || 0) - Number(right.match(/\d+/)?.[0] || 0))
    .map(([key, entry]) => ({
      key,
      balance: Number(entry && typeof entry === "object" ? entry.balance : entry || 0),
    }));
}

function selectDefaultZarubaBagMode(payload) {
  const groups = Array.isArray(payload?.zaruba?.groups) ? payload.zaruba.groups : [];
  if (groups.some((group) => group.mode === state.bagsZarubaMode && group.bags?.length > 0)) return;
  state.bagsZarubaMode = groups.find((group) => group.bags?.some((bag) => bag.canOpen))?.mode
    || groups.find((group) => group.bags?.length > 0)?.mode
    || "pacan";
}

function renderBagReward() {
  const target = $("#bags-last-reward");
  if (!target) return;
  const reward = state.bagsLastReward;
  target.hidden = !reward;
  if (!reward) {
    target.innerHTML = "";
    return;
  }
  const visual = reward.imageUrl
    ? `<img src="${escapeHtml(reward.imageUrl)}" alt="" loading="lazy" onerror="this.hidden=true">`
    : `<span aria-hidden="true">${reward.kind === "exchange" ? "◆" : "✓"}</span>`;
  target.innerHTML = `
    <div class="bags-last-reward-art">${visual}</div>
    <div>
      <span>${reward.kind === "exchange" ? "ПЕРЕПЛАВКА ГОТОВА" : "ПОЛУЧЕНО"}</span>
      <strong>${escapeHtml(reward.title || "Новая вещь")}</strong>
      <small>${escapeHtml(reward.subtitle || "Баланс и прогресс уже обновлены.")}</small>
    </div>
    <button type="button" class="text-button" data-bags-reward-close aria-label="Скрыть результат">Скрыть</button>
  `;
}

function renderBagsDashboard(payload) {
  state.bagsDashboard = payload;
  selectDefaultZarubaBagMode(payload);
  const exchange = payload.exchange || {};
  const zarubaGroups = Array.isArray(payload.zaruba?.groups) ? payload.zaruba.groups : [];
  const brigadeBags = Array.isArray(payload.brigade?.bags) ? payload.brigade.bags : [];
  const allZarubaBags = zarubaGroups.flatMap((group) => group.bags || []);
  const openableZaruba = allZarubaBags.filter((bag) => bag.canOpen).length;
  const openableBrigade = brigadeBags.filter((bag) => bag.canOpen).length;
  const armbands = brigadeArmbandSummary(payload.brigade?.balances);
  const summary = $("#bags-summary");
  if (summary) {
    const standardSummary = `
      <article class="bags-summary-item bags-balance-card">
        <img src="${escapeHtml(CURRENCY_ICON_URLS.signet)}" alt="">
        <div><small>Печатки</small><strong>${formatNumber(exchange.signet || 0)}</strong><em>для зарубских сумок</em></div>
      </article>
      <article class="bags-summary-item bags-balance-card">
        <img src="${escapeHtml(CURRENCY_ICON_URLS.ore_signet)}" alt="">
        <div><small>Руда</small><strong>${formatNumber(exchange.ore || 0)}</strong><em>можно переплавить</em></div>
      </article>
      <article class="bags-summary-item bags-ready-card">
        <span aria-hidden="true">✓</span>
        <div>
          <small>Готово к открытию</small>
          <strong>${formatNumber(openableZaruba + openableBrigade)}</strong>
          <em>${formatNumber(openableZaruba)} заруб. · ${formatNumber(openableBrigade)} бриг.</em>
        </div>
      </article>
      <article class="bags-summary-item bags-forge">
        <div class="bags-forge-copy">
          <small>ПЕРЕПЛАВКА РУДЫ</small>
          <strong id="bags-forge-title">15 руды → 1 печатка</strong>
          <em id="bags-forge-status">Баланс загрузится вместе с сумками.</em>
        </div>
        <button id="bags-forge-button" class="action-button action-button-mini" type="button" disabled>Переплавить</button>
      </article>
    `;
    const armbandSummary = armbands.length > 0 ? `
      <article class="bags-summary-item bags-armbands-summary">
        <div>
          <small>Повязки для бригадных сумок · отдельный баланс у каждого типа</small>
          <div class="bags-armband-balances">
            ${armbands.map((entry) => `
              <span title="${escapeHtml(CURRENCY_LABELS[entry.key] || entry.key)}">
                <img src="${escapeHtml(CURRENCY_ICON_URLS[entry.key] || CURRENCY_ICON_URLS.armband_1)}" alt="">
                <b>${formatNumber(entry.balance)}</b>
              </span>
            `).join("")}
          </div>
        </div>
      </article>
    ` : "";
    summary.innerHTML = standardSummary + armbandSummary;
  }

  $("#bags-updated").textContent = payload.generatedAt
    ? `обновлено ${formatDate(payload.generatedAt)}`
    : "обновлено";
  document.querySelectorAll("[data-bags-family]").forEach((button) => {
    const active = button.dataset.bagsFamily === state.bagsFamily;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    if (button.dataset.bagsFamily === "brigade") {
      button.disabled = payload.brigade?.available === false;
      button.title = button.disabled ? "На аккаунте нет бригады." : "";
    }
  });

  const modeSwitch = $("#bags-zaruba-mode-switch");
  modeSwitch.hidden = state.bagsFamily !== "zaruba";
  modeSwitch.innerHTML = zarubaGroups.map((group) => {
    const active = group.mode === state.bagsZarubaMode;
    const canOpen = (group.bags || []).filter((bag) => bag.canOpen).length;
    return `<button type="button" class="${active ? "is-active" : ""}" data-bags-mode="${escapeHtml(group.mode)}" aria-pressed="${active}">${escapeHtml(group.label)}${canOpen ? `<b>${canOpen}</b>` : ""}</button>`;
  }).join("");

  const selectedGroup = zarubaGroups.find((group) => group.mode === state.bagsZarubaMode);
  const bags = state.bagsFamily === "brigade" ? brigadeBags : selectedGroup?.bags || [];
  const visibleBags = [...bags].sort((left, right) => {
    const priority = (bag) => bag.canOpen ? 0 : bag.unlocked && !bag.completed ? 1 : bag.completed ? 2 : 3;
    return priority(left) - priority(right);
  });
  const listTitle = $("#bags-list-title");
  const listCount = $("#bags-list-count");
  if (listTitle) {
    listTitle.textContent = state.bagsFamily === "brigade"
      ? "Бригадные сумки"
      : selectedGroup?.label || "Зарубские сумки";
  }
  if (listCount) {
    const openableCount = bags.filter((bag) => bag.canOpen).length;
    listCount.textContent = `${formatNumber(bags.length)} ${russianPlural(bags.length, "сумка", "сумки", "сумок")} · ${formatNumber(openableCount)} ${openableCount === 1 ? "доступна" : "доступно"}`;
    listCount.className = openableCount > 0 ? "badge" : "badge badge-neutral";
  }
  const list = $("#bags-list");
  if (state.bagsFamily === "brigade" && payload.brigade?.available === false) {
    list.innerHTML = `<div class="bags-empty-state"><strong>Бригадные сумки недоступны</strong><span>Аккаунт не состоит в бригаде или игра пока не вернула её состояние.</span></div>`;
  } else {
    list.innerHTML = visibleBags.map((bag) => {
      const progress = bag.progress || {};
      const percent = Number(progress.total) > 0
        ? Math.max(0, Math.min(100, Number(progress.collected || 0) / Number(progress.total) * 100))
        : 0;
      const currency = bagCurrencyMeta(bag);
      const shortfall = Math.max(0, Number(bag.cost || 0) - Number(bag.balance || 0));
      const status = bag.completed
        ? "Комплект собран"
        : !bag.unlocked
          ? "Пока закрыта"
          : shortfall > 0
            ? `Не хватает ${formatNumber(shortfall)}`
            : "Можно открыть";
      const sets = Array.isArray(bag.sets) ? bag.sets : [];
      return `
        <article class="bag-card ${bag.canOpen ? "is-openable" : ""} ${bag.completed ? "is-complete" : ""} ${!bag.unlocked ? "is-locked" : ""}">
          <div class="bag-card-main">
            <div class="bag-card-art"><img src="${escapeHtml(bagImageUrl(bag))}" alt="" loading="lazy"></div>
            <div class="bag-card-copy">
              <div class="bag-card-title"><strong>${escapeHtml(bag.title)}</strong>${buildBadge(status, bag.canOpen ? "success" : "neutral")}</div>
              <div class="bag-card-progress">
                <span><b>Прогресс вещей</b><em>${formatNumber(progress.collected || 0)} / ${formatNumber(progress.total || 0)}</em></span>
                <div class="loot-progress-track"><span style="width:${percent}%"></span></div>
              </div>
              <details class="bag-sets-details">
                <summary>${formatNumber(sets.length)} комплектов · осталось ${formatNumber(progress.remaining || 0)} вещей</summary>
                <div>${sets.map((set) => `<span><b>${escapeHtml(set.setName)}</b><em>${formatNumber(set.collected)} / ${formatNumber(set.total)}</em></span>`).join("")}</div>
              </details>
            </div>
          </div>
          <div class="bag-card-action">
            <div class="bag-card-cost" title="Доступно: ${formatNumber(bag.balance || 0)}">
              <img src="${escapeHtml(currency.iconUrl)}" alt="">
              <span><small>Цена открытия</small><strong>${formatNumber(bag.cost || 0)} ${escapeHtml(currency.label)}</strong></span>
            </div>
            <button
              type="button"
              class="action-button action-button-mini"
              data-bag-open
              data-bag-family="${escapeHtml(bag.family)}"
              data-bag-mode="${escapeHtml(bag.mode || "")}"
              data-bag-id="${escapeHtml(bag.bagId)}"
              ${bag.canOpen ? "" : "disabled"}
            >${bag.canOpen ? "Открыть сумку" : bag.completed ? "Собрано" : !bag.unlocked ? "Закрыто" : `Не хватает ${formatNumber(shortfall)}`}</button>
          </div>
        </article>
      `;
    }).join("") || `<div class="bags-empty-state"><strong>Сумок пока нет</strong><span>Обновите раздел чуть позже.</span></div>`;
  }

  const forgeButton = $("#bags-forge-button");
  const orePerSignet = Number(exchange.orePerSignet || 15);
  $("#bags-forge-title").textContent = `${formatNumber(orePerSignet)} руды → 1 печатка`;
  const availableExchanges = Number(exchange.availableExchanges || 0);
  $("#bags-forge-status").textContent = exchange.canExchange
    ? `Хватит на ${formatNumber(availableExchanges)} ${russianPlural(availableExchanges, "переплавку", "переплавки", "переплавок")} · сейчас ${formatNumber(exchange.ore || 0)} руды.`
    : `Нужно ещё ${formatNumber(Math.max(0, orePerSignet - Number(exchange.ore || 0)))} руды.`;
  forgeButton.disabled = !exchange.canExchange;
  forgeButton.textContent = exchange.canExchange ? `Переплавить ${formatNumber(orePerSignet)}` : "Недостаточно руды";
  renderBagReward();
}

function bagRewardFromAction(result) {
  const response = result?.result || {};
  const granted = response.granted || response.reward || {};
  const tattoo = granted.tattoo || granted.item || {};
  const fallbackBag = result?.bag || {};
  const title = tattoo.name || tattoo.setName || granted.name || granted.setName || "Новая вещь";
  const setName = tattoo.setName || tattoo.collectionName || granted.setName || "";
  return {
    kind: "bag",
    title,
    subtitle: setName ? `${fallbackBag.title || "Сумка"} · ${setName}` : fallbackBag.title || "Сумка открыта",
    imageUrl: tattoo.cardPreviewUrl || tattoo.previewUrl || granted.cardPreviewUrl || granted.previewUrl || "",
  };
}

async function handleBagsDashboard(options = {}) {
  if (state.bagsRefreshRunning) return state.bagsDashboard;
  state.bagsRefreshRunning = true;
  if (!options.silent) setServerStatus("обновляем сумки", "busy");
  try {
    const payload = await apiRequest("GET", "/api/misc/bags");
    renderBagsDashboard(payload);
    if (!options.silent) setServerStatus("ready", "ok");
    return payload;
  } catch (error) {
    if (!options.silent) appendDiagnosticError("misc", error);
    const list = $("#bags-list");
    if (list && !state.bagsDashboard) {
      list.innerHTML = `<div class="bags-empty-state"><strong>Не удалось загрузить сумки</strong><span>${escapeHtml(formatUserFacingError(error) || "Повторите обновление.")}</span></div>`;
    }
    return null;
  } finally {
    state.bagsRefreshRunning = false;
  }
}

async function handleBagOpen(button) {
  if (!state.bagsDashboard || !button) return;
  const family = button.dataset.bagFamily;
  const mode = button.dataset.bagMode || null;
  const bagId = button.dataset.bagId;
  const bags = family === "brigade"
    ? state.bagsDashboard.brigade?.bags || []
    : (state.bagsDashboard.zaruba?.groups || []).flatMap((group) => group.bags || []);
  const bag = bags.find((entry) => entry.bagId === bagId && (family === "brigade" || entry.mode === mode));
  if (!bag) return;
  const currency = bagCurrencyMeta(bag);
  if (!window.confirm(`Открыть «${bag.title}» за ${formatNumber(bag.cost)} ${currency.label}?`)) return;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Открываю…";
  try {
    const result = await apiRequest("POST", "/api/misc/bags/action", {
      family,
      action: "open",
      mode,
      bagId,
      confirmed: true,
      expectedStateVersion: state.bagsDashboard.stateVersion,
    });
    state.bagsLastReward = bagRewardFromAction(result);
    renderBagsDashboard(result.dashboard);
    appendLog(`Сумки · ${bag.title}`, state.bagsLastReward.title, { source: "misc", kind: "reward", important: true });
    void Promise.allSettled([
      handleEconomyRefresh(),
      handleZarubaDashboard({ silent: true, syncControls: false }),
    ]);
  } catch (error) {
    appendDiagnosticError("misc", error);
    await handleBagsDashboard({ silent: true });
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function handleBagOreExchange() {
  const dashboard = state.bagsDashboard;
  if (!dashboard?.exchange?.canExchange) return;
  const orePerSignet = Number(dashboard.exchange.orePerSignet || 15);
  if (!window.confirm(`Переплавить ${formatNumber(orePerSignet)} руды в 1 печатку?`)) return;
  const button = $("#bags-forge-button");
  button.disabled = true;
  button.textContent = "Переплавляю…";
  try {
    const before = dashboard.exchange;
    const result = await apiRequest("POST", "/api/misc/bags/action", {
      family: "zaruba",
      action: "exchangeOre",
      confirmed: true,
      expectedStateVersion: dashboard.stateVersion,
    });
    const after = result.dashboard?.exchange || {};
    state.bagsLastReward = {
      kind: "exchange",
      title: `+${formatNumber(Math.max(1, Number(after.signet || 0) - Number(before.signet || 0)))} печатка`,
      subtitle: `Руда: ${formatNumber(before.ore || 0)} → ${formatNumber(after.ore || 0)}`,
      imageUrl: CURRENCY_ICON_URLS.signet,
    };
    renderBagsDashboard(result.dashboard);
    appendLog("Сумки · переплавка", state.bagsLastReward.title, { source: "misc", kind: "reward" });
    void Promise.allSettled([
      handleEconomyRefresh(),
      handleZarubaDashboard({ silent: true, syncControls: false }),
    ]);
  } catch (error) {
    appendDiagnosticError("misc", error);
    await handleBagsDashboard({ silent: true });
  }
}

function startBagsSync(intervalMs = BAGS_REFRESH_INTERVAL_MS) {
  if (state.bagsRefreshTimerId) clearInterval(state.bagsRefreshTimerId);
  state.bagsRefreshTimerId = setInterval(() => {
    const miscActive = document.querySelector('[data-panel="misc"]')?.classList.contains("is-active");
    if (!document.hidden && miscActive && state.activeMiscSection === "bags") {
      void handleBagsDashboard({ silent: true });
    }
  }, intervalMs);
}

function renderLootContainersDashboard(payload, options = {}) {
  state.lootContainersDashboard = payload;
  const parcel = payload?.parcel || {};
  const baul = payload?.baul || {};
  const openingKind = state.lootContainerOpeningKind;

  renderStatGrid($("#loot-containers-summary"), [
    { label: "Тушёнка", value: formatNumber(parcel.stewBalance || 0), iconUrl: CURRENCY_ICON_URLS.stew },
    { label: "До следующей тушёнки", value: `${formatNumber(parcel.progress?.remaining || 0)} очк.` },
    {
      label: "Мыло",
      value: baul.soapBalance === null || baul.soapBalance === undefined ? "—" : formatNumber(baul.soapBalance),
      iconUrl: CURRENCY_ICON_URLS.soap,
    },
    { label: "Уровень баула", value: baul.active ? `${formatNumber(baul.level)} / ${formatNumber(baul.maxLevel || 25)}` : "не активен" },
  ]);
  const stats = payload?.stats || {};
  renderStatGrid($("#loot-parcel-statistics"), [
    { label: "Открыто за период", value: formatNumber(stats.totalOpened || 0) },
    { label: "С предметом", value: `${formatNumber(stats.withWearable || 0)} · ${formatNumber(stats.dropPercent || 0)}%` },
    { label: "Без предмета", value: formatNumber(stats.withoutWearable || 0) },
    { label: "Сухая серия", value: `${formatNumber(stats.currentDryStreak || 0)} · максимум ${formatNumber(stats.maxDryStreak || 0)}` },
    { label: "Последний предмет", value: stats.lastItem?.name || "ещё не выпадал" },
    { label: "Учёт с", value: stats.coverageStartedAt ? formatDate(stats.coverageStartedAt) : "нет данных" },
  ]);

  setLootBadge(
    $("#loot-parcel-badge"),
    parcel.canOpen ? "готова" : parcel.error ? "ошибка" : "нет тушёнки",
    parcel.canOpen ? "success" : parcel.error ? "danger" : "neutral",
  );
  $("#loot-parcel-status").innerHTML = `
    <strong class="loot-resource-value">
      ${lootResourceIconMarkup("stew")}
      <span>${formatNumber(parcel.stewBalance || 0)} тушёнки</span>
    </strong>
    <span>Стоимость открытия: ${formatNumber(parcel.cost?.amount || 1)}</span>
  `;
  const parcelStep = Math.max(1, Number(parcel.progress?.step || 50));
  const parcelCurrent = Math.max(0, Number(parcel.progress?.current || 0));
  const parcelPercent = Math.max(0, Math.min(100, Math.round((parcelCurrent / parcelStep) * 100)));
  $("#loot-parcel-progress").innerHTML = `
    <div>
      <span>Прогресс к следующей тушёнке</span>
      <strong>${escapeHtml(parcel.progress?.text || `${formatNumber(parcelCurrent)} / ${formatNumber(parcelStep)}`)}</strong>
    </div>
    <div class="loot-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${parcelStep}" aria-valuenow="${parcelCurrent}">
      <span style="width:${parcelPercent}%"></span>
    </div>
  `;
  const latestParcel = findLatestLootContainerEntry(
    payload,
    "parcel",
    options.result?.kind === "parcel" ? options.result : null,
  );
  renderLootParcelResult(latestParcel, {
    fresh: Boolean(options.result && options.result.kind === "parcel"),
  });
  const parcelButton = $("#loot-parcel-open");
  parcelButton.disabled = openingKind !== null || !parcel.canOpen;
  parcelButton.innerHTML = openingKind === "parcel"
    ? "Открываем…"
    : `Открыть · ${lootResourceIconMarkup("stew", "loot-button-resource-icon")} ${formatNumber(parcel.cost?.amount || 1)}`;

  const earlyWrap = $("#loot-baul-early-wrap");
  const earlyInput = $("#loot-baul-allow-early");
  earlyWrap.hidden = !baul.belowMaxLevel;
  if (!baul.belowMaxLevel) {
    earlyInput.checked = false;
  }
  const earlyAllowed = Boolean(earlyInput.checked);
  setLootBadge(
    $("#loot-baul-badge"),
    !baul.active
      ? "не активен"
      : baul.isMaxLevel
        ? "MAX · можно забирать"
        : `ур. ${formatNumber(baul.level)} из ${formatNumber(baul.maxLevel || 25)}`,
    baul.isMaxLevel ? "success" : "neutral",
  );
  const expText = baul.isMaxLevel
    ? "Максимальный уровень достигнут"
    : `${formatNumber(baul.currentExp || 0)} / ${formatNumber(baul.expToNext || 0)} опыта`;
  const soapText = baul.soapBalance === null || baul.soapBalance === undefined
    ? "баланс мыла не получен"
    : `${formatNumber(baul.soapBalance)} мыла · нужно ${formatNumber(baul.cost?.amount || 20)}`;
  $("#loot-baul-status").innerHTML = `
    <strong>${baul.active ? `Баул ${formatNumber(baul.level)} уровня` : "Активного баула нет"}</strong>
    <span>${escapeHtml(expText)}</span>
    <span class="loot-resource-line">${lootResourceIconMarkup("soap")}${escapeHtml(soapText)}</span>
    ${baul.belowMaxLevel ? `<em>Лучше дождаться 25-го уровня: содержимое ещё будет расти.</em>` : ""}
  `;
  $("#loot-baul-rewards").innerHTML = renderLootRewardGroups(
    baul.pending,
    { empty: baul.active ? "В бауле пока нет накопленных наград." : "Активного баула нет." },
  );
  const baulButton = $("#loot-baul-open");
  baulButton.disabled = openingKind !== null
    || !baul.canOpen
    || (baul.belowMaxLevel && !earlyAllowed);
  baulButton.textContent = openingKind === "baul"
    ? "Открываем…"
    : "";
  if (openingKind !== "baul") {
    baulButton.innerHTML = `Открыть · ${lootResourceIconMarkup("soap", "loot-button-resource-icon")} ${formatNumber(baul.cost?.amount || 20)}`;
  }

  renderLootContainerResult(options.result || payload?.lastOpen || null, { fresh: Boolean(options.result) });
  renderLootContainerHistory(payload?.history || []);
}

async function handleLootContainersDashboard(options = {}) {
  const refreshButton = $("#loot-containers-refresh");
  if (refreshButton) {
    refreshButton.disabled = true;
    refreshButton.textContent = "Обновляю…";
  }
  if (!options.silent) {
    setServerStatus("loading loot containers", "busy");
  }
  try {
    const query = options.rebuild ? "?rebuild=1" : "";
    const payload = await apiRequest("GET", `/api/misc/loot-containers${query}`);
    renderLootContainersDashboard(payload);
    void loadBaulAutomation();
    if (!options.silent) {
      appendLog("Посылки и баулы", `тушёнка ${formatNumber(payload.parcel?.stewBalance || 0)} · баул ур. ${formatNumber(payload.baul?.level || 0)}`);
      setServerStatus("ready", "ok");
    }
    return payload;
  } catch (error) {
    setServerStatus("loot containers error", "error");
    appendLog("Посылки и баулы", error.message || String(error), {
      source: "misc",
      kind: "error",
    });
    return null;
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "Обновить содержимое";
    }
  }
}

function lootContainerReasonLabel(reason) {
  const labels = {
    baul_below_max_level: "Баул ещё не достиг 25-го уровня.",
    baul_no_pending_rewards: "В бауле пока нет наград.",
    baul_not_active: "Активного баула нет.",
    not_enough_soap: "Недостаточно мыла.",
    not_enough_stew: "Недостаточно тушёнки.",
  };
  return labels[reason] || reason || "Открытие не выполнено.";
}

async function handleLootContainerOpen(kind) {
  const dashboard = state.lootContainersDashboard;
  const target = kind === "baul" ? dashboard?.baul : dashboard?.parcel;
  if (!dashboard || !target) {
    await handleLootContainersDashboard();
    return;
  }

  const allowBelowMax = kind === "baul" && Boolean($("#loot-baul-allow-early")?.checked);
  const confirmation = kind === "parcel"
    ? `Открыть одну посылку за ${formatNumber(target.cost?.amount || 1)} тушёнку? Сейчас на балансе ${formatNumber(target.stewBalance || 0)}.`
    : `Открыть баул ${formatNumber(target.level || 0)} уровня за ${formatNumber(target.cost?.amount || 20)} мыла?${target.belowMaxLevel ? " До максимального 25-го уровня содержимое ещё увеличивается." : ""}`;
  if (!window.confirm(confirmation)) {
    return;
  }

  state.lootContainerOpeningKind = kind;
  renderLootContainersDashboard(dashboard);
  setServerStatus(`opening ${kind}`, "busy");
  let failureMessage = null;
  try {
    const payload = await apiRequest("POST", "/api/misc/loot-containers/open", {
      kind,
      dryRun: false,
      confirmed: true,
      allowBelowMax,
    });
    if (!payload.opened) {
      throw new Error(lootContainerReasonLabel(payload.reason));
    }
    state.lootContainersDashboard = payload.dashboard;
    renderLootContainersDashboard(payload.dashboard, { result: payload.result });
    setServerStatus("ready", "ok");
  } catch (error) {
    failureMessage = error.message || String(error);
    setServerStatus("loot open error", "error");
    appendLog("Открытие контейнера", failureMessage);
  } finally {
    state.lootContainerOpeningKind = null;
    if (state.lootContainersDashboard) {
      renderLootContainersDashboard(state.lootContainersDashboard);
    }
  }
}

function renderMiscDashboard(payload) {
  state.miscDashboard = payload;
  renderMiscMonthly(payload.monthly || {});
  renderMiscStashes(payload.stashes || {}, payload.vparit || {});
  renderMiscGames(payload.miniGames || {});
  if (payload.vparit && payload.vparit.running) {
    scheduleVparitPoll();
  }
  if (payload.miniGames && payload.miniGames.automation && payload.miniGames.automation.running) {
    scheduleMiscPoll();
  }
}

function scheduleVparitPoll() {
  if (state.miscVparitPollTimerId) {
    clearTimeout(state.miscVparitPollTimerId);
  }
  state.miscVparitPollTimerId = setTimeout(() => void handleVparitStatusPoll(), 500);
}

async function handleVparitStatusPoll() {
  try {
    const vparit = await apiRequest("GET", "/api/misc/stashes/vparit-status");
    const wasRunning = Boolean(state.miscDashboard && state.miscDashboard.vparit && state.miscDashboard.vparit.running);
    if (state.miscDashboard) {
      state.miscDashboard.vparit = vparit;
      renderMiscStashes(state.miscDashboard.stashes || {}, vparit);
    }
    if (vparit.running) {
      scheduleVparitPoll();
      return;
    }
    state.miscVparitPollTimerId = null;
    if (wasRunning) {
      appendLog("Нычки", `готово: ${formatNumber(vparit.sold)} успешно · ${formatNumber(vparit.failed)} ошибок`);
      await handleMiscDashboard({ silent: true, forceRefresh: true });
    }
  } catch (error) {
    state.miscVparitPollTimerId = null;
    appendLog("Нычки", `не удалось обновить прогресс: ${error.message || String(error)}`);
  }
}

function scheduleMiscPoll() {
  if (state.miscPollTimerId) {
    clearTimeout(state.miscPollTimerId);
  }
  state.miscPollTimerId = setTimeout(() => void handleMiniGameAutomationPoll(), 3000);
}

async function handleMiniGameAutomationPoll() {
  try {
    const automation = await apiRequest("GET", "/api/misc/minigame/automation");
    if (state.miscDashboard && state.miscDashboard.miniGames) {
      state.miscDashboard.miniGames.automation = automation;
      renderMiscGames(state.miscDashboard.miniGames);
    }
    if (automation.running) {
      scheduleMiscPoll();
      return;
    }

    state.miscPollTimerId = null;
    await handleMiscDashboard({ silent: true });
  } catch (error) {
    state.miscPollTimerId = null;
    appendLog("Автоплей", `не удалось обновить прогресс: ${error.message || String(error)}`);
  }
}

async function handleMiscDashboard(options = {}) {
  if (!options.silent) {
    setServerStatus("loading MISC", "busy");
  }
  try {
    const forceRefresh = options.forceRefresh === true || !options.silent;
    const payload = await apiRequest(
      "GET",
      forceRefresh ? "/api/misc/dashboard?refresh=1" : "/api/misc/dashboard",
    );
    renderMiscDashboard(payload);
    if (!options.silent) {
      appendLog("Раздел «Разное» обновлён", `${payload.monthly.completedCount} заданий месяца · ${payload.stashes.totals.readyCollections} комплектов нычек готово`);
      setServerStatus("ready", "ok");
    }
    return payload;
  } catch (error) {
    setServerStatus("MISC error", "error");
    appendLog("Раздел «Разное»", error.message || String(error), {
      source: "misc",
      kind: "error",
    });
    return null;
  }
}

async function handleMiscAutomationToggle() {
  const enabled = $("#misc-monthly-auto").checked;
  await apiRequest("POST", "/api/misc/automation", { enabled });
  appendLog("Ежедневная делюга", enabled ? "автоматика включена" : "автоматика выключена");
  await handleMiscDashboard({ silent: true });
}

function readQuestPolicyControls(container) {
  return Object.fromEntries([...container.querySelectorAll("[data-quest-setting]")].map((control) => {
    if (!control.reportValidity()) throw new Error("Проверьте выделенное поле настройки.");
    const value = control.type === "checkbox" ? control.checked
      : control.type === "number" || control.dataset.questNumber === "true"
        ? control.value === "" ? null : Number(control.value)
        : control.value || null;
    return [control.dataset.questSetting, value];
  }));
}

function syncQuestPolicyControls(container, policy) {
  for (const control of container.querySelectorAll("[data-quest-setting]")) {
    const value = policy[control.dataset.questSetting];
    if (value === undefined) continue;
    if (control.type === "checkbox") control.checked = value === true;
    else control.value = value ?? "";
  }
}

async function saveMonthlyPolicy() {
  const container = $("#monthly-policy-controls");
  const button = $("#monthly-policy-save");
  const status = $("#monthly-policy-status");
  button.disabled = true;
  const revision = container.dataset.revision || "0";
  try {
    status.textContent = "Сохраняю…";
    await apiRequest("POST", "/api/misc/automation", readQuestPolicyControls(container));
    if ((container.dataset.revision || "0") === revision) container.dataset.dirty = "false";
    status.textContent = "Настройки сохранены";
    await handleMiscDashboard({ silent: true });
  } catch (error) {
    status.textContent = error.message || String(error);
  } finally {
    button.disabled = false;
  }
}

function renderZarubaBossRules(rules) {
  const bosses = getAllBossCatalogItems();
  $("#zaruba-boss-rules").innerHTML = rules.map((rule) => `
    <div class="field-grid quest-boss-rule" data-boss-rule>
      <label class="field"><span>Босс</span><select data-rule="bossId"><option value="0">Любой босс</option>${bosses.map((boss) => `<option value="${escapeHtml(boss.id)}" ${Number(rule.bossId) === Number(boss.id) ? "selected" : ""}>${escapeHtml(boss.name || boss.title)}</option>`).join("")}${rule.bossId && !bosses.some((boss) => Number(boss.id) === Number(rule.bossId)) ? `<option value="${escapeHtml(rule.bossId)}" selected>Босс недоступен в каталоге</option>` : ""}</select></label>
      <label class="field"><span>Задание</span><select data-rule="objective">${[["any", "Любое"], ["kill", "Убийство"], ["damage", "Урон"]].map(([value, label]) => `<option value="${value}" ${rule.objective === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span>Режим</span><select data-rule="mode">${[["pacansky", "Пацанский"], ["blotnoy", "Блатной"], ["avtoritetny", "Авторитетный"], ["vorovskoy", "Воровской"], ["odin", "Один"], ["", "Авто"]].map(([value, label]) => `<option value="${value}" ${(rule.mode || "") === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <label class="field"><span>Макс. оценка оружия для урона, ₽</span><input type="number" min="0" step="1" placeholder="Без ограничения" data-rule="maxWeaponValue" value="${escapeHtml(rule.maxWeaponValue ?? "")}"><small>Фильтр плана при добавлении в очередь.</small></label>
      <button type="button" class="text-button" data-boss-rule-remove>Удалить правило</button>
    </div>`).join("");
}

function readZarubaBossRules() {
  return [...document.querySelectorAll("[data-boss-rule]")].map((row) => Object.fromEntries(
    [...row.querySelectorAll("[data-rule]")].map((control) => {
      if (!control.reportValidity()) throw new Error("Проверьте правило босса.");
      return [control.dataset.rule, control.type === "number" || control.dataset.rule === "bossId"
        ? control.value === "" ? null : Number(control.value) : control.value || null];
    }),
  ));
}

let monthlyPurchasePending = false;

async function handleMonthlyDayPurchase(event) {
  const button = event.target.closest("[data-monthly-buy]");
  if (!button || monthlyPurchasePending) return;
  const monthly = state.miscDashboard?.monthly;
  const dayId = Number(button.dataset.monthlyBuy);
  const priceSoap = Number(monthly?.buyPriceSoapByDay?.[String(dayId)]);
  if (!monthly || !Number.isSafeInteger(priceSoap) || priceSoap <= 0) return;
  if (!window.confirm(`Купить пропущенный день ${dayId} за ${formatNumber(priceSoap)} мыла?`)) return;
  monthlyPurchasePending = true;
  renderMiscMonthly(monthly);
  try {
    await apiRequest("POST", "/api/misc/monthly/buy-day", {
      dayId, year: Number(monthly.year), month: Number(monthly.month), priceSoap,
    });
    appendLog("Делюги", `День ${dayId} куплен за ${formatNumber(priceSoap)} мыла`);
  } catch (error) {
    appendLog("Покупка дня", error.message || String(error), { source: "misc", kind: "error" });
  } finally {
    await handleMiscDashboard({ silent: true, forceRefresh: true });
    monthlyPurchasePending = false;
    if (state.miscDashboard?.monthly) renderMiscMonthly(state.miscDashboard.monthly);
  }
}

async function handleMiscAutomationTick() {
  setServerStatus("checking daily task", "busy");
  try {
    const result = await apiRequest("POST", "/api/misc/automation/tick", {});
    appendLog("Ежедневная делюга", result.action ? result.action.type || result.action.reason : "проверено");
    await handleMiscDashboard({ silent: true });
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("daily task error", "error");
    appendLog("Ежедневная делюга", error.message || String(error), {
      source: "misc",
      kind: "error",
    });
  }
}

async function handleVparitAll() {
  const totals = state.miscDashboard && state.miscDashboard.stashes ? state.miscDashboard.stashes.totals : null;
  if (!totals || !window.confirm(`Впарить ${formatNumber(totals.readyCollections)} готовых коллекций? Каждая отправится ровно один раз. Ожидается ${formatCurrencyAmounts(totals.rewards)}.`)) {
    return;
  }
  const result = await apiRequest("POST", "/api/misc/stashes/vparit-all", {});
  appendLog("Нычки", result.started ? "впаривание запущено" : result.reason || "не запущено");
  if (result.job && state.miscDashboard) {
    state.miscDashboard.vparit = result.job;
    renderMiscStashes(state.miscDashboard.stashes || {}, result.job);
  }
  if (result.started || (result.job && result.job.running)) {
    scheduleVparitPoll();
  }
}

async function handleMiscGameClick(event) {
  const automationButton = event.target.closest("[data-game-automation]");
  if (automationButton) {
    const command = automationButton.dataset.gameAutomation;
    automationButton.disabled = true;
    try {
      if (command === "stop") {
        const result = await apiRequest("POST", "/api/misc/minigame/automation/stop", {});
        appendLog("Автоплей", result.stopped ? "остановка запрошена" : result.reason || "не запущен");
      } else if (command === "start") {
        const kind = automationButton.dataset.gameKind;
        let request;
        let confirmation;
        if (kind === "katala") {
          const targets = $("#katala-targets").value;
          const maxAttempts = Number($("#katala-max-attempts").value || 1);
          request = {
            kind,
            targets,
            maxAttempts,
            delayMs: Number($("#katala-delay").value || 900),
          };
          confirmation = `Запустить Каталу до ${formatNumber(maxAttempts)} партий (максимум ${formatNumber(maxAttempts)} ₽) с целью: ${targets || "не выбрано"}?`;
        } else if (kind === "fartovy") {
          const bet = Number($("#fartovy-bet").value || 1);
          request = {
            kind,
            bet,
            autoBonus: $("#fartovy-auto-bonus").checked,
            autoSpin: false,
            maxSpins: Number($("#fartovy-max-spins").value || 100),
            delayMs: Number($("#fartovy-delay").value || 1000),
            superGameSide: "left",
          };
          const fartovyState = state.miscDashboard?.miniGames?.fartovy || {};
          const grass = getMiniGameBalanceValue(fartovyState, MINI_GAME_BALANCE_DEFINITIONS.fartovy[0]);
          const currentCost = Math.floor(grass / Math.max(1, bet)) * Math.max(1, bet);
          const maxSpins = Math.max(1, Number(request.maxSpins || 1));
          const boundedCost = Math.min(currentCost, maxSpins * Math.max(1, bet));
          confirmation = `Крутить Фартового до ${formatNumber(maxSpins)} игр по ставке ${formatNumber(bet)}? Будет потрачено до ${formatNumber(boundedCost)} зелёных спичек без учёта бесплатных спинов.`;
        } else if (kind === "poker") {
          const allowChips = $("#poker-auto-chips").checked;
          const allowSoap = $("#poker-auto-soap").checked;
          const chipHands = allowChips ? Number($("#poker-chip-hands").value || 0) : 0;
          const soapHands = allowSoap ? Number($("#poker-soap-hands").value || 0) : 0;
          request = {
            kind,
            allowChips,
            allowSoap,
            chipHands,
            soapHands,
            targets: $("#poker-targets").value,
            maxDraws: Number($("#poker-max-draws").value || 1),
            delayMs: Number($("#poker-delay").value || 900),
            autoDailyRaven: $("#poker-auto-raven").checked,
          };
          confirmation = `Запустить Покер: до ${formatNumber(chipHands)} раздач за фишки и ${formatNumber(soapHands)} за мыло (до ${formatNumber(soapHands * 5)} мыла)?`;
        } else {
          const maxSpins = Number($("#wheel-max-spins").value || 1);
          request = { kind: "wheel", maxSpins };
          confirmation = `Запустить Колесо фортуны до ${formatNumber(maxSpins)} спинов? Автоплей остановится перед неразобранным призом.`;
        }
        if (!window.confirm(confirmation)) {
          return;
        }
        const result = await apiRequest("POST", "/api/misc/minigame/automation/start", request);
        appendLog("Автоплей", result.started ? `${kind}: запущен` : result.reason || "не запущен");
      }
      await handleMiscDashboard({ silent: true });
    } catch (error) {
      appendLog("Автоплей", error.message || String(error), {
        source: "misc",
        kind: "error",
      });
    } finally {
      automationButton.disabled = false;
    }
    return;
  }

  const cardButton = event.target.closest("[data-game-card-action]");
  if (cardButton) {
    const cardAction = cardButton.dataset.gameCardAction;
    const cardIndex = Number(cardButton.dataset.cardIndex || 0);
    if (cardAction === "poker-select") {
      state.miscPokerSelection = state.miscPokerSelection.includes(cardIndex)
        ? state.miscPokerSelection.filter((value) => value !== cardIndex)
        : [...state.miscPokerSelection, cardIndex].sort((left, right) => left - right);
      renderMiscGames(state.miscDashboard ? state.miscDashboard.miniGames || {} : {});
      return;
    }
    if (cardAction === "katala-reroll") {
      const result = await apiRequest("POST", "/api/misc/minigame", { action: "katala-reroll", cardIndex });
      state.miscGameSession = result;
      await handleMiscDashboard({ silent: true });
      return;
    }
  }
  const button = event.target.closest("[data-game-action]");
  if (!button) {
    return;
  }
  const action = button.dataset.gameAction;
  if (button.dataset.paid === "1" && !window.confirm(`Выполнить платное действие «${button.textContent.trim()}»?`)) {
    return;
  }
  button.disabled = true;
  try {
    const request = { action };
    if (action === "poker-draw") {
      request.cardIndexes = [...state.miscPokerSelection];
    } else if (action === "fartovy-set-bet") {
      request.bet = Number($("#fartovy-bet").value || 1);
    } else if (action === "fartovy-buy-grass") {
      request.amount = Number($("#fartovy-grass-amount").value || 1);
    } else if (action === "wheel-buy") {
      request.count = Number($("#wheel-ticket-count").value || 1);
    }
    const result = await apiRequest("POST", "/api/misc/minigame", request);
    if (action === "poker-finish" || action === "katala-finish") {
      state.miscGameSession = null;
      state.miscPokerSelection = [];
    } else {
      state.miscGameSession = result;
      if (action === "poker-draw") {
        state.miscPokerSelection = [];
      }
    }
    appendLog("Мини-игра", `${action}: ${result.ok ? "готово" : "отказ"}`);
    await handleMiscDashboard({ silent: true });
  } catch (error) {
    appendLog("Мини-игра", error.message || String(error), {
      source: "misc",
      kind: "error",
    });
  } finally {
    button.disabled = false;
  }
}

async function handleFartovyAutoSpinChange(event) {
  const checkbox = event.target.closest("#fartovy-auto-spin");
  if (!checkbox || checkbox.disabled) {
    return;
  }
  checkbox.disabled = true;
  try {
    const result = await apiRequest("POST", "/api/misc/minigame/fartovy/autospin", {
      enabled: checkbox.checked,
      bet: Number($("#fartovy-bet").value || 1),
      autoBonus: $("#fartovy-auto-bonus").checked,
      maxSpins: Number($("#fartovy-max-spins").value || 100),
      delayMs: Number($("#fartovy-delay").value || 1000),
      superGameSide: "left",
    });
    appendLog("Фартовый", result.settings.enabled ? "автопрокрут включён" : "автопрокрут выключен");
    await handleMiscDashboard({ silent: true });
  } catch (error) {
    checkbox.checked = !checkbox.checked;
    appendLog("Фартовый", error.message || String(error), {
      source: "misc",
      kind: "error",
    });
  } finally {
    checkbox.disabled = false;
  }
}

function formatEventCountdown(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) {
    return `${days} д. ${hours} ч.`;
  }
  if (hours > 0) {
    return `${hours} ч. ${minutes} мин.`;
  }
  return `${minutes} мин.`;
}

function formatLetsCookAction(entry) {
  if (!entry) {
    return "Автоматизация ещё не выполняла действий.";
  }
  const labels = {
    energy_spent: "Потрачены бесплатные бодряки",
    watcher_energy_spent: "Смотрящий продолжил расследование",
    reward_claimed: "Награда забрана",
    quick_reward_claimed: "Быстрая награда забрана",
    karma_claimed: "Комплект кармы забран",
    locker_opened: "Шкаф открыт",
    role_selected: "Роль выбрана",
    role_changed: "Роль безопасно изменена",
    role_switch_deferred: "Смена роли отложена",
    request_accepted: "Сделка принята",
    offer_expired: "Предложение уже неактуально",
    offer_sent: "Предложение сделки отправлено",
    waiting_for_partner: "Ожидаем партнёра",
    partner_required: "Нужен ID проверенного партнёра",
    partner_unavailable: "Подходящий партнёр не найден",
    soap_energy_bought: "Бодряки восстановлены за мыло",
    soap_energy_unavailable: "Мыло не потрачено",
    watcher_request_waiting: "Смотрящий ждёт 50 бодряков для раскрытия",
    watcher_request_revealed: "Входящее предложение раскрыто",
    watcher_target_selected: "Смотрящий выбрал цель",
    watcher_target_unavailable: "Цель для расследования не найдена",
    watcher_case_completed: "Расследование завершено",
    revealed_by_watcher: "Смотрящий раскрыл роль — накопление потеряно",
    waiting: "Ожидание",
    tick_failed: "Ошибка проверки",
  };
  const reasonLabels = {
    energy_regeneration: "ждём восстановления бодряков",
    server_cooldown: "сервер просит немного подождать",
    server_stack_limit: "достигнут серверный предел готового запаса",
    tick_action_limit: "продолжим на следующей проверке",
    dealer_idle: "ожидаем следующего действия",
    not_enough_soap: "не хватает мыла для восстановления бодряков",
    already_full: "бодряки уже восстановлены",
    configured_partner_is_watcher: "указанный ID принадлежит смотрящему — отправка отменена",
    configured_partner_unavailable: "указанный партнёр сейчас недоступен",
    active_offer: "предложение этому партнёру уже активно",
    target_limit: "у партнёра достигнут лимит предложений",
    pair_cooldown: "между партнёрами действует пауза",
    not_ready: "сделка пока недоступна",
    event_inactive: "событие сейчас неактивно",
  };
  const details = [];
  if (entry.actions) details.push(`${formatNumber(entry.actions)} запрос.`);
  if (entry.stack !== undefined) details.push(`партий ${formatNumber(entry.stack)}`);
  if (entry.eventEnergy !== undefined) details.push(`бодряков ${formatNumber(entry.eventEnergy)}`);
  if (entry.outstandingOffers) details.push(`предложений ${formatNumber(entry.outstandingOffers)}`);
  if (entry.externalOffers) details.push(`ручных другим ID ${formatNumber(entry.externalOffers)}`);
  if (entry.requiredEnergy) details.push(`нужно ${formatNumber(entry.requiredEnergy)} бодряков`);
  if (entry.requiredSoap) details.push(`нужно ${formatNumber(entry.requiredSoap)} мыла`);
  if (entry.soapSpent) details.push(`потрачено ${formatNumber(entry.soapSpent)} мыла`);
  if (entry.toUid) details.push(`получатель #${String(entry.toUid)}`);
  if (entry.fromUid) details.push(`отправитель #${String(entry.fromUid)}`);
  if (entry.guessedRole) details.push(`догадка: ${entry.guessedRole === "cook" ? "варщик" : "барыга"}`);
  if (entry.outcome) details.push(`исход: ${String(entry.outcome).replaceAll("_", " ")}`);
  if (Array.isArray(entry.rewards) && entry.rewards.length) {
    details.push(entry.rewards.map((reward) => {
      const label = reward.label || reward.key || "Награда";
      if (["tattoo", "respirator"].includes(reward.key)) {
        const identity = reward.name ? ` «${reward.name}»` : reward.itemId !== undefined ? ` #${reward.itemId}` : "";
        const setProgress = reward.key === "tattoo" && Number(reward.setCount) > 0
          ? ` (${formatNumber(reward.setOwned)} / ${formatNumber(reward.setCount)} в комплекте)`
          : "";
        return `${label}${identity}${setProgress}`;
      }
      return `${label} +${formatNumber(reward.amount || 0)}`;
    }).join(", "));
  }
  if (entry.lostAmount) details.push(`потеряно ${formatNumber(entry.lostAmount)}`);
  if (entry.nickname) details.push(entry.nickname);
  if (entry.reason) details.push(reasonLabels[entry.reason] || String(entry.reason).replaceAll("_", " "));
  return `${labels[entry.type] || entry.type || "Проверка"}${details.length ? ` · ${details.join(" · ")}` : ""}`;
}

function collectLetsCookJournalRewardItems(entry) {
  const result = [];
  for (const reward of Array.isArray(entry && entry.rewards) ? entry.rewards : []) {
    const key = String(reward && reward.key || "reward");
    if (key === "tattoo") {
      const id = reward.itemId;
      const catalogItem = findJournalWearableCatalogItem("tattoo", id);
      result.push({
        key: `tattoo:${id || reward.name || result.length}`,
        type: "tattoo",
        id,
        label: String(reward.name || catalogItem && (catalogItem.name || catalogItem.setName) || `Наколка #${id || "?"}`),
        amount: Math.max(1, Number(reward.amount) || 1),
        imageUrl: String(catalogItem && (catalogItem.imageUrl || catalogItem.previewUrl || catalogItem.image) || ""),
        symbol: "✦",
        title: String(reward.setName || catalogItem && catalogItem.setName || ""),
      });
      continue;
    }
    const normalizedKey = key === "collectionsDrop" ? "stashes" : key;
    result.push({
      key: `lets-cook:${normalizedKey}`,
      type: normalizedKey === "stashes" ? "stash" : "currency",
      label: String(reward.label || CURRENCY_LABELS[normalizedKey] || key),
      amount: Math.max(1, Number(reward.amount) || 1),
      imageUrl: normalizedKey === "stashes"
        ? BOSS_STASH_ICON_URL
        : CURRENCY_ICON_URLS[normalizedKey] || "",
      symbol: normalizedKey === "stashes" ? "▣" : key === "respirator" ? "◈" : "◆",
    });
  }
  return mergeJournalRewardItems(result);
}

function syncLetsCookHistoryToJournal(history) {
  for (const entry of Array.isArray(history) ? history.slice(0, 40) : []) {
    if (!entry) {
      continue;
    }
    const formatted = formatLetsCookAction(entry);
    const [message, ...details] = formatted.split(" · ");
    const rewardItems = collectLetsCookJournalRewardItems(entry);
    const isError = entry.type === "tick_failed" || /error|failed/.test(String(entry.type || ""));
    const isReward = rewardItems.length > 0 || /reward|locker_opened|karma_claimed/.test(String(entry.type || ""));
    upsertJournalEntry({
      key: `lets-cook:${entry.at || "unknown"}:${entry.type || "action"}`,
      at: entry.at,
      source: "events",
      kind: isError ? "error" : isReward ? "reward" : "action",
      message,
      meta: details.filter((detail) => !/^(?:Авторитет|Папиросы|Нычки|Наколка|Респиратор)\b/.test(detail)).join(" · "),
      rewardItems,
      rewardLabel: rewardItems.length > 0 ? "Получено" : "",
    });
  }
  renderLog();
}

const LETS_COOK_ROLE_LABELS = {
  cook: "Варщик",
  baryga: "Барыга",
  watcher: "Смотрящий",
};

function letsCookRoleSwitchText(event, strategy, settings) {
  const desiredRole = settings.preferredRole || event.role || "cook";
  const desiredLabel = LETS_COOK_ROLE_LABELS[desiredRole] || desiredRole;
  const currentRole = event.role || "none";
  let switchPlan = strategy.roleSwitch || {};
  if (currentRole !== "none" && currentRole !== desiredRole) {
    let reason = "safe_to_switch";
    if (["reward", "loose"].includes(event.status) || event.hasQuickReward) {
      reason = "pending_reward";
    } else if (["cook", "baryga"].includes(currentRole) && (Number(event.stack) > 0 || Number(event.progress) > 0)) {
      reason = "finish_dealer_cycle";
    } else if (["cook", "baryga"].includes(currentRole) && Number(event.shieldRemainingSeconds) > 0) {
      reason = "shield_active";
    } else if (currentRole === "watcher" && Number(event.progress) > 0) {
      reason = "finish_watcher_case";
    }
    switchPlan = { pending: true, reason };
  } else if (currentRole === desiredRole) {
    switchPlan = { pending: false, reason: "same_role" };
  }
  if (!switchPlan.pending) {
    if (desiredRole === "watcher") {
      return "Смотрящий сначала раскрывает входящие предложения за 50 бодряков, затем ведёт расследования. Роль цели скрыта сервером; догадки чередуются.";
    }
    return "Бот держит не больше одного исходящего предложения доверенному пулу. Ручное предложение другому ID не мешает автоматической отправке.";
  }
  if (switchPlan.reason === "finish_dealer_cycle") {
    return `Переход на роль «${desiredLabel}» поставлен в очередь: сначала бот завершит текущую заготовку, проведёт сделку и заберёт награду.`;
  }
  if (switchPlan.reason === "finish_watcher_case") {
    return `Переход на роль «${desiredLabel}» поставлен в очередь: сначала бот завершит уже начатое расследование.`;
  }
  if (switchPlan.reason === "shield_active") {
    return `Переход на роль «${desiredLabel}» выполнится после окончания щита, чтобы не сжечь оплаченную защиту.`;
  }
  if (switchPlan.reason === "pending_reward") {
    return `Переход на роль «${desiredLabel}» выполнится сразу после получения текущей награды.`;
  }
  return `Переход на роль «${desiredLabel}» безопасно выполнится на ближайшей проверке.`;
}

function updateLetsCookRoleControls(settings = {}, event = {}, strategy = {}) {
  const selectedRole = $("#lets-cook-role")?.value || settings.preferredRole || event.role || "cook";
  for (const role of ["cook", "baryga"]) {
    const active = selectedRole === role;
    $(`#lets-cook-${role}-partner`).disabled = !active;
    $(`#lets-cook-${role}-partner-field`).classList.toggle("is-disabled", !active);
  }
  const roleNote = $("#lets-cook-role-note");
  if (roleNote) roleNote.textContent = letsCookRoleSwitchText(event, strategy, { ...settings, preferredRole: selectedRole });
}

function renderLetsCookDashboard(payload, options = {}) {
  state.letsCookDashboard = payload;
  const event = payload.state || {};
  const strategy = payload.strategy || {};
  const automation = payload.automation || {};
  const settings = automation.settings || {};
  const currentRole = event.role || "none";
  const isWatcher = currentRole === "watcher";
  const resourceLabel = currentRole === "baryga" ? "Клиенты" : "Партии";
  const roleSwitch = strategy.roleSwitch || {};
  const desiredRole = settings.preferredRole || (currentRole === "none" ? "cook" : currentRole);
  const active = event.phase === "active";
  const inactive = payload.inactive === true || !["active", "claim_only"].includes(event.phase);
  const phase = $("#lets-cook-phase");
  phase.textContent = active ? "активно" : event.phase === "claim_only" ? "только награды" : "неактивно";
  phase.className = active ? "badge" : "badge badge-neutral";
  const briefPhase = $("#lets-cook-brief-phase");
  briefPhase.textContent = phase.textContent;
  briefPhase.className = phase.className;

  const lockerIdByRole = { cook: 13, baryga: 14, watcher: 15 };
  const currentLocker = (event.lockers || []).find((locker) => locker.lockerId === lockerIdByRole[currentRole]) || null;
  $("#lets-cook-brief-role").textContent = event.roleLabel || "—";
  $("#lets-cook-brief-energy").textContent = `${formatNumber(event.eventEnergy || 0)} / ${formatNumber(event.energyMax || 100)}`;
  $("#lets-cook-brief-locker").textContent = currentLocker
    ? `${formatNumber(currentLocker.tokenBalance)} / ${formatNumber(currentLocker.tokenCost)}`
    : "—";
  $("#lets-cook-brief-resource-label").textContent = isWatcher ? "Расследование" : resourceLabel;
  $("#lets-cook-brief-resource").textContent = isWatcher
    ? `${formatNumber(event.progress || 0)} / ${formatNumber(event.progressMax || 90)}`
    : formatNumber(event.stack || 0);

  renderStatGrid($("#lets-cook-summary"), [
    { label: "Роль", value: roleSwitch.pending ? `${event.roleLabel || "—"} → ${LETS_COOK_ROLE_LABELS[desiredRole] || desiredRole}` : event.roleLabel || "—" },
    { label: "Бодряки", value: `${formatNumber(event.eventEnergy)} / ${formatNumber(event.energyMax)}` },
    { label: "Уровень события", value: event.pointsToNext === null || event.pointsToNext === undefined
      ? `${formatNumber(event.eventLevel || 1)} · ${formatNumber(event.eventPoints || 0)} очк.`
      : `${formatNumber(event.eventLevel || 1)} · ${formatNumber(event.eventPoints || 0)} / ${formatNumber((event.eventPoints || 0) + event.pointsToNext)}` },
    { label: isWatcher ? "Расследование" : resourceLabel, value: isWatcher ? `${formatNumber(event.progress || 0)} / ${formatNumber(event.progressMax || 90)}` : formatNumber(event.stack || 0) },
    { label: "Предложения", value: `${formatNumber((payload.sent || []).length)} исх. · ${formatNumber((payload.requests || []).length)} вх.` },
    { label: "Активная часть", value: formatEventCountdown(event.actionSecondsLeft) },
  ]);

  const progress = Math.max(0, Math.min(100, Number(event.progress || 0) / Math.max(1, Number(event.progressMax || 90)) * 100));
  $("#lets-cook-progress-label").textContent = `${formatNumber(event.progress || 0)} / ${formatNumber(event.progressMax || 90)}`;
  $("#lets-cook-progress-fill").style.width = `${progress}%`;
  $("#lets-cook-progress-title").textContent = isWatcher ? "Ход расследования" : currentRole === "baryga" ? "Поиск клиента" : "Текущая партия";
  $("#lets-cook-progress-note").textContent = inactive
    ? "Событие сейчас неактивно. Данные появятся после его запуска."
    : isWatcher
      ? `До завершения дела: ${formatNumber(strategy.remainingEnergyToStack || 0)} действий. Бесплатный реген — 1 бодряк в 2 минуты.`
      : `${currentRole === "baryga" ? "До следующего клиента" : "До следующей партии"}: ${formatNumber(strategy.remainingEnergyToStack || 0)} бодряков. Бесплатный реген — 1 раз в 2 минуты.`;

  if (isWatcher) {
    const targetName = event.target?.nickname || (event.targetUid ? `#${event.targetUid}` : "не выбрана");
    $("#lets-cook-batch-title").textContent = "Цель и догадка";
    $("#lets-cook-batch-label").textContent = targetName;
    $("#lets-cook-batch-fill").style.width = `${progress}%`;
    $("#lets-cook-strategy-note").textContent = event.targetRole
      ? `Предполагаемая роль: ${LETS_COOK_ROLE_LABELS[event.targetRole] || event.targetRole}. Настоящая роль станет известна только в итоге дела.`
      : "Бот выберет доступную цель и будет чередовать догадки «варщик» / «барыга»: API не раскрывает правильный ответ.";
  } else {
    $("#lets-cook-batch-title").textContent = currentRole === "baryga" ? "Готовые клиенты" : "Готовые партии";
    $("#lets-cook-batch-label").textContent = formatNumber(event.stack || 0);
    $("#lets-cook-batch-fill").style.width = Number(event.stack || 0) > 0 ? "100%" : "0%";
    const tier = event.currentDealTier || null;
    const tierReward = tier
      ? ` Серверный тир сделки для уровня ${formatNumber(event.eventLevel || 1)}: ${formatNumber(tier.eventPoint)} очков события, ${formatNumber(tier.tokenDrop)} жетонов, ${formatNumber(tier.rating)} авторитета, ${formatNumber(tier.sigs)} папирос, ${formatNumber(tier.collectionsDrop)} нычек.`
      : "";
    $("#lets-cook-strategy-note").textContent = inactive
      ? "Автоматика будет спокойно ждать следующего запуска события."
      : `${strategy.recommendation || ""}${tierReward}`;
  }

  const cookPartnerUids = Array.isArray(settings.cookPartnerUids)
    ? settings.cookPartnerUids
    : settings.cookPartnerUid ? [settings.cookPartnerUid] : [];
  const barygaPartnerUids = Array.isArray(settings.barygaPartnerUids)
    ? settings.barygaPartnerUids
    : settings.barygaPartnerUid ? [settings.barygaPartnerUid] : [];
  if (options.syncControls !== false) {
    $("#lets-cook-auto").checked = settings.enabled === true;
    $("#lets-cook-role").value = desiredRole;
    $("#lets-cook-soap-energy").checked = settings.allowSoapEnergy === true;
    $("#lets-cook-cook-partner").value = cookPartnerUids.join(", ");
    $("#lets-cook-baryga-partner").value = barygaPartnerUids.join(", ");
    $("#lets-cook-interval").value = String(settings.intervalSec || 60);
    $("#lets-cook-actions").value = String(settings.maxActionsPerTick || 20);
  }
  updateLetsCookRoleControls(settings, event, strategy);
  const soapAllowed = settings.allowSoapEnergy === true;
  $("#lets-cook-soap-status").textContent = soapAllowed ? "Мыло разрешено · 8 за восстановление" : "Мыло запрещено";
  $("#lets-cook-soap-status").closest(".event-safe-row")?.classList.toggle("is-warning", soapAllowed);

  const formatOfferParty = (item, direction) => {
    const offer = item && typeof item === "object" ? item : {};
    const uid = direction === "sent" ? (offer.toUid ?? offer.uid) : (offer.fromUid ?? offer.uid);
    const name = offer.nickname || offer.fromNickname || offer.toNickname || null;
    return `${name ? `${name} · ` : ""}#${uid || "?"}`;
  };
  const sentOffers = Array.isArray(payload.sent) ? payload.sent : [];
  const incomingOffers = Array.isArray(payload.requests) ? payload.requests : [];
  const offerStatus = [];
  const trustedUids = currentRole === "cook"
    ? cookPartnerUids
    : currentRole === "baryga"
      ? barygaPartnerUids
      : [];
  if (trustedUids.length) {
    offerStatus.push(`<span><strong>Доверенный пул:</strong> ${trustedUids.map((uid) => `#${escapeHtml(String(uid))}`).join(", ")}. Ручная заявка другому ID не блокирует автоматическую отправку.</span>`);
  }
  if (sentOffers.length) {
    offerStatus.push(`<span><strong>Уже отправлено:</strong> ${sentOffers.map((item) => escapeHtml(formatOfferParty(item, "sent"))).join(", ")}. Отмены в API события нет.</span>`);
  }
  if (incomingOffers.length) {
    offerStatus.push(`<span><strong>Входящие:</strong> ${incomingOffers.map((item) => escapeHtml(formatOfferParty(item, "incoming"))).join(", ")}. Бот примет только запрос от указанного партнёра.</span>`);
  }
  $("#lets-cook-offer-status").innerHTML = offerStatus.join("");

  const activity = automation.history && automation.history.length ? automation.history : automation.lastAction ? [automation.lastAction] : [];
  syncLetsCookHistoryToJournal(activity);

  const lockerNames = { 13: "Варщик", 14: "Барыга", 15: "Смотрящий" };
  $("#lets-cook-lockers").innerHTML = (event.lockers || []).map((locker) => `
    <article class="event-locker ${locker.canOpen ? "is-ready" : ""}">
      <strong>${escapeHtml(lockerNames[locker.lockerId] || `Шкаф #${locker.lockerId}`)}</strong>
      <span>${escapeHtml(`${formatNumber(locker.tokenBalance)} / ${formatNumber(locker.tokenCost)} жетонов`)}</span>
    </article>
  `).join("");

  const leaders = Array.isArray(payload.top) ? payload.top.slice(0, 3) : [];
  const rows = [...leaders];
  if (payload.selfTop && !rows.some((item) => Number(item.uid) === Number(payload.selfTop.uid))) {
    rows.push(payload.selfTop);
  }
  $("#lets-cook-ranking").innerHTML = rows.map((item) => `
    <div class="event-ranking-row ${payload.selfTop && Number(item.uid) === Number(payload.selfTop.uid) ? "is-self" : ""}">
      <strong>#${escapeHtml(formatNumber(item.place))}</strong>
      <span>${escapeHtml(item.nickname || `#${item.uid}`)}</span>
      <b>${escapeHtml(formatNumber(item.score))}</b>
    </div>
  `).join("");

  if (state.letsCookPollTimerId) clearTimeout(state.letsCookPollTimerId);
  const eventsSectionActive = document.querySelector(".tab-button.is-active")?.dataset.tab === "misc"
    && state.activeMiscSection === "events";
  if (settings.enabled && eventsSectionActive) {
    state.letsCookPollTimerId = setTimeout(() => void handleLetsCookDashboard({ silent: true, syncControls: false }), 10000);
  }
}

async function handleLetsCookDashboard(options = {}) {
  if (!options.silent) setServerStatus("loading event", "busy");
  try {
    const payload = await apiRequest("GET", "/api/events/lets-cook");
    renderLetsCookDashboard(payload, { syncControls: options.syncControls !== false });
    if (!options.silent) {
      const inactive = payload.inactive === true || !["active", "claim_only"].includes(payload.state.phase);
      appendLog("Пора варить", inactive
        ? "Событие сейчас неактивно"
        : `${payload.state.roleLabel} · ${formatNumber(payload.state.eventEnergy)} бодряков · ${formatNumber(payload.state.stack)} партий`);
      setServerStatus(inactive ? "event inactive" : "ready", "ok");
    }
    return payload;
  } catch (error) {
    setServerStatus("event error", "error");
    appendLog("Пора варить", error.message || String(error), {
      source: "events",
      kind: "error",
    });
    return null;
  }
}

function collectLetsCookPartnerUids(selector, label) {
  const input = $(selector);
  const raw = String(input.value || "").trim();
  if (!raw) return [];
  const values = raw.split(/[\s,;]+/).filter(Boolean);
  if (!values.length || values.some((value) => !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))) {
    input.focus();
    throw new Error(`${label}: укажите положительные ID через запятую, пробел или точку с запятой.`);
  }
  return [...new Set(values.map(Number))];
}

function collectLetsCookSettings() {
  return {
    enabled: $("#lets-cook-auto").checked,
    allowSoapEnergy: $("#lets-cook-soap-energy").checked,
    cookPartnerUids: collectLetsCookPartnerUids("#lets-cook-cook-partner", "Пул ID барыг"),
    barygaPartnerUids: collectLetsCookPartnerUids("#lets-cook-baryga-partner", "Пул ID варщиков"),
    intervalSec: Number($("#lets-cook-interval").value || 60),
    maxActionsPerTick: Number($("#lets-cook-actions").value || 20),
    autoAccept: true,
    autoInvite: true,
    autoClaim: true,
    autoOpenLockers: true,
    autoSelectRole: true,
    preferredRole: $("#lets-cook-role").value || "cook",
  };
}

function confirmLetsCookSoapSpending() {
  const dialog = $("#lets-cook-soap-warning-dialog");
  const confirmButton = $("#lets-cook-soap-warning-confirm");
  const cancelButton = $("#lets-cook-soap-warning-cancel");
  if (!dialog || !confirmButton || !cancelButton) {
    return Promise.resolve(window.confirm(
      "Когда бодряки закончатся, бот будет автоматически покупать 100 бодряков за 8 мыла. Разрешить постоянную автоматическую трату мыла?",
    ));
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (confirmed) => {
      if (settled) return;
      settled = true;
      confirmButton.removeEventListener("click", handleConfirm);
      cancelButton.removeEventListener("click", handleCancel);
      dialog.removeEventListener("cancel", handleCancel);
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      resolve(Boolean(confirmed));
    };
    const handleConfirm = () => finish(true);
    const handleCancel = (event) => {
      event?.preventDefault?.();
      finish(false);
    };
    confirmButton.addEventListener("click", handleConfirm);
    cancelButton.addEventListener("click", handleCancel);
    dialog.addEventListener("cancel", handleCancel);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");
  });
}

async function handleLetsCookSave() {
  try {
    const settings = collectLetsCookSettings();
    const soapWasAllowed = state.letsCookDashboard?.automation?.settings?.allowSoapEnergy === true;
    if (settings.allowSoapEnergy && !soapWasAllowed) {
      const confirmed = await confirmLetsCookSoapSpending();
      if (!confirmed) {
        $("#lets-cook-soap-energy").checked = false;
        setServerStatus("ready", "ok");
        return;
      }
    }
    setServerStatus("saving event automation", "busy");
    await apiRequest("POST", "/api/events/lets-cook/automation", settings);
    appendLog("Пора варить", settings.enabled
      ? `автопрохождение включено · мыло ${settings.allowSoapEnergy ? "разрешено" : "запрещено"}`
      : "автопрохождение выключено");
    await handleLetsCookDashboard({ silent: true });
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("event save error", "error");
    appendLog("Пора варить", error.message || String(error), {
      source: "events",
      kind: "error",
    });
  }
}

async function handleLetsCookTick() {
  const button = $("#lets-cook-tick-btn");
  button.disabled = true;
  setServerStatus("running event tick", "busy");
  try {
    const result = await apiRequest("POST", "/api/events/lets-cook/tick", {
      maxActions: Number($("#lets-cook-actions").value || 20),
    });
    appendLog("Пора варить", formatLetsCookAction(result.action));
    await handleLetsCookDashboard({ silent: true });
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("event tick error", "error");
    appendLog("Пора варить", error.message || String(error), {
      source: "events",
      kind: "error",
    });
  } finally {
    button.disabled = false;
  }
}

function renderBaulAutomation(automation) {
  state.baulAutomation = automation;
  $("#baul-auto-enabled").checked = Boolean(automation.enabled);
  $("#baul-auto-require-wearable").checked = Boolean(automation.requireWearable);
  $("#baul-auto-allow-soap").checked = Boolean(automation.allowSoap);
  $("#baul-auto-min-level").value = automation.minLevel ?? 25;
  $("#baul-auto-soap-limit").value = automation.soapDailyLimit ?? 0;
  $("#baul-auto-status").textContent = automation.lastError
    ? `Остановлено: ${automation.lastError}`
    : `${automation.enabled ? "Включена" : "Выключена"} · мыло сегодня ${formatNumber(automation.soapSpentToday || 0)} / ${formatNumber(automation.soapDailyLimit || 0)}`;
  if (automation.lastAction && automation.lastAction.at) {
    appendLog("Автоматика баула", automation.lastAction.reason || automation.lastAction.type || "обновлена", {
      key: `baul:${automation.lastAction.at}`,
      at: automation.lastAction.at,
      source: "misc",
      kind: automation.lastError ? "error" : "automation",
    });
  }
}

async function loadBaulAutomation() {
  try {
    renderBaulAutomation(await apiRequest("GET", "/api/misc/baul-automation"));
  } catch (error) {
    appendLog("Автоматика баула", error.message || String(error), { source: "misc", kind: "error" });
  }
}

async function handleBaulAutomationSave() {
  const current = state.baulAutomation || {};
  const allowSoap = $("#baul-auto-allow-soap").checked;
  const soapDailyLimit = Number($("#baul-auto-soap-limit").value || 0);
  if (allowSoap && soapDailyLimit <= 0) {
    $("#baul-auto-allow-soap").checked = false;
    appendLog("Автоматика баула", "Для расхода мыла задайте положительный суточный лимит.", { source: "misc", kind: "error" });
    return;
  }
  if (allowSoap && !window.confirm(`Разрешить автоматике баула тратить до ${formatNumber(soapDailyLimit)} мыла за московские сутки?`)) {
    $("#baul-auto-allow-soap").checked = false;
    return;
  }
  try {
    renderBaulAutomation(await apiRequest("POST", "/api/misc/baul-automation", {
      expectedVersion: current.version,
      enabled: $("#baul-auto-enabled").checked,
      minLevel: Number($("#baul-auto-min-level").value || 25),
      requireWearable: $("#baul-auto-require-wearable").checked,
      allowSoap: $("#baul-auto-allow-soap").checked,
      soapDailyLimit,
    }));
  } catch (error) {
    appendLog("Автоматика баула", error.message || String(error), { source: "misc", kind: "error" });
  }
}

function zarubaModeLabel(mode) {
  const limit = Number(mode.max) > 0 ? `${formatNumber(mode.used)} / ${formatNumber(mode.max)}` : "без лимита";
  const reward = mode.reward === null || mode.reward === undefined ? "награда сервера" : `+${formatNumber(mode.reward)}`;
  return `${mode.name} · ${reward} · ${limit}`;
}

function zarubaModeIconUrl(mode) {
  const id = Number(mode && mode.id);
  const name = String(mode && mode.name || "").toLowerCase();
  if (id === 1 || /пацан/.test(name)) {
    return "/assets/game-icons/extracted/png-4x/patsanskaya-posylka-4x.png";
  }
  if (id === 2 || /блат/.test(name)) {
    return "/assets/game-icons/extracted/png-4x/blatnaya-posylka-4x.png";
  }
  if (id === 3 || /авторитет/.test(name)) {
    return "/assets/game-icons/extracted/png-4x/avtoritetnaya-posylka-4x.png";
  }
  return "/assets/pbot-logo-square.png";
}

function zarubaTaskKindLabel(kind) {
  return {
    prison: "Тюрьма",
    master: "Мастер",
    boss: "Босс",
    friend: "Друзья",
    wheel: "Фортуна",
    fartovy: "Фартовый",
    economy: "Ресурсы",
    katala: "Катала",
    podogrev: "Подогрев",
    claim: "Награда",
    bag: "Мешок",
    unknown: "Неизвестно",
  }[kind] || String(kind || "Задание");
}

const ZARUBA_TASK_UI_DEFINITIONS = Object.freeze({
  1: Object.freeze({
    kind: "friend",
    objective: "send_stash",
    actionLabel: "Отправить лишнюю нычку другому игроку",
    imageUrl: `${GAME_ASSET_BASE_URL}/poker/hidesicon.png`,
  }),
  2: Object.freeze({ kind: "economy", objective: "authority", actionLabel: "Получить авторитет" }),
  3: Object.freeze({ kind: "podogrev", objective: "podogrev", actionLabel: "Собрать подогрев" }),
  4: Object.freeze({ kind: "prison", objective: "respect", actionLabel: "Получить уважение в указанной тюрьме" }),
  5: Object.freeze({ kind: "boss", objective: "kill", actionLabel: "Убить указанного босса" }),
  6: Object.freeze({ kind: "boss", objective: "damage", actionLabel: "Нанести урон указанному боссу" }),
  8: Object.freeze({
    kind: "friend",
    objective: "harknut",
    actionLabel: "Харкнуть через взаимодействие с игроком",
    imageUrl: `${GAME_ASSET_BASE_URL}/Zaruba/ZarubActiv/i_harknyt.webp`,
  }),
  9: Object.freeze({
    kind: "friend",
    objective: "fight",
    actionLabel: "Напрячь терпилу через взаимодействие с игроком",
    imageUrl: `${GAME_ASSET_BASE_URL}/Zaruba/ZarubActiv/i_winPlayer.webp`,
  }),
  11: Object.freeze({ kind: "master", objective: "knowledge", actionLabel: "Получить знания у мастера" }),
  12: Object.freeze({ kind: "katala", objective: "katala", actionLabel: "Сыграть с Каталой" }),
  13: Object.freeze({
    kind: "fartovy",
    objective: "spin",
    actionLabel: "Сыграть в Фартового",
    imageUrl: `${GAME_ASSET_BASE_URL}/slots/slotsIcon/bgSlots.webp`,
  }),
  14: Object.freeze({
    kind: "wheel",
    objective: "spin",
    actionLabel: "Крутить Колесо Фортуны",
    imageUrl: `${GAME_ASSET_BASE_URL}/FortuneScene/coleso_jack.webp`,
  }),
});

function resolveZarubaTaskUiKnowledge(task) {
  const serverKnowledge = task && task.knowledge && typeof task.knowledge === "object"
    ? task.knowledge
    : null;
  const definition = ZARUBA_TASK_UI_DEFINITIONS[Number(task && task.rawType)] || null;
  const fallbackKind = definition && definition.kind || task && task.kind || "unknown";
  const known = serverKnowledge
    ? serverKnowledge.known === true
    : Boolean(definition || fallbackKind !== "unknown");
  return {
    ...(serverKnowledge || {}),
    known,
    status: known ? "known" : "unknown",
    kind: definition && definition.kind || fallbackKind,
    objective: definition && definition.objective || task && task.objective || "unknown",
    actionLabel: serverKnowledge && serverKnowledge.actionLabel
      || definition && definition.actionLabel
      || null,
    imageUrl: task && task.imageUrl || definition && definition.imageUrl || null,
  };
}

function buildZarubaTaskCatalogUiView(payload) {
  const serverCatalog = payload && payload.taskCatalog && typeof payload.taskCatalog === "object"
    ? payload.taskCatalog
    : null;
  if (serverCatalog && Array.isArray(serverCatalog.entries)) {
    return serverCatalog;
  }
  const byType = new Map();
  for (const task of Array.isArray(payload && payload.tasks) ? payload.tasks : []) {
    if (!task || typeof task !== "object") continue;
    const knowledge = resolveZarubaTaskUiKnowledge(task);
    const key = task.rawType === undefined || task.rawType === null
      ? `label:${String(task.label || "unknown")}`
      : `type:${String(task.rawType)}`;
    const previous = byType.get(key);
    byType.set(key, {
      key,
      rawType: task.rawType ?? null,
      kind: knowledge.kind,
      objective: knowledge.objective,
      known: knowledge.known,
      status: knowledge.status,
      actionLabel: knowledge.actionLabel,
      labelPattern: task.label || "",
      samples: [...new Set([...(previous && previous.samples || []), task.label].filter(Boolean))],
      occurrences: Number(previous && previous.occurrences || 0) + 1,
    });
  }
  const entries = [...byType.values()];
  const known = entries.filter((entry) => entry.known).length;
  return {
    summary: { observed: entries.length, known, unknown: entries.length - known },
    entries,
  };
}

function renderZarubaTaskCatalog(payload) {
  const catalog = buildZarubaTaskCatalogUiView(payload);
  const entries = Array.isArray(catalog.entries) ? catalog.entries : [];
  const summary = catalog.summary || {};
  const summaryTarget = $("#zaruba-task-catalog-summary");
  const target = $("#zaruba-task-catalog");
  if (summaryTarget) {
    summaryTarget.textContent = `${formatNumber(summary.known || 0)}/${formatNumber(summary.observed || 0)} известных`;
    summaryTarget.className = `badge ${Number(summary.unknown || 0) > 0 ? "badge-danger" : "badge-success"}`;
  }
  if (!target) return;
  target.innerHTML = entries.map((entry) => {
    const sample = Array.isArray(entry.samples) && entry.samples.length > 0
      ? entry.samples[entry.samples.length - 1]
      : entry.labelPattern || `Тип ${entry.rawType ?? "?"}`;
    const actionLabel = entry.actionLabel || "Действие ещё не определено";
    return `
      <article class="zaruba-task-catalog-entry">
        <div>
          <strong>${escapeHtml(sample)}</strong>
          ${buildBadge(entry.known ? "известно" : "неизвестно", entry.known ? "success" : "danger")}
        </div>
        <small>Тип ${escapeHtml(entry.rawType ?? "?")} · ${escapeHtml(zarubaTaskKindLabel(entry.kind))} · встречалось ${escapeHtml(formatNumber(entry.occurrences || 0))}</small>
        <small>${escapeHtml(actionLabel)}</small>
      </article>
    `;
  }).join("") || `<p class="inline-note">Пул заполнится при получении первого задания.</p>`;
}

function populateZarubaMasterSelect(preferredId = null) {
  const select = $("#zaruba-intellect-master");
  if (!select) return;
  const masters = (state.prisonDashboard?.masters || [])
    .filter((master) => master && master.isUnlocked !== false && Number(master.id) > 0);
  const selectedId = preferredId || select.value || "";
  const options = [
    { value: "", label: "Автовыбор по энергии" },
    ...masters.map((master) => ({
      value: String(master.id),
      label: master.name || `Мастер #${master.id}`,
    })),
  ];
  if (!syncSelectOptions(select, options)) {
    return;
  }
  if (masters.some((master) => String(master.id) === String(selectedId))) {
    select.value = String(selectedId);
  }
}

function zarubaActivityLabel(entry) {
  const type = String(entry?.type || "event").toLowerCase();
  const labels = {
    start: "Заруба начата",
    claim: "Награда получена",
    completed: "Задание выполнено",
    task_completed: "Задание выполнено",
    enqueue: "Цель добавлена в очередь",
    queued: "Цель добавлена в очередь",
    error: "Ошибка",
    stopped: "Автоматика остановлена",
  };
  return labels[type] || translateUiText(entry?.type || "Событие");
}

function zarubaActivityDetails(entry) {
  const details = entry?.details || {};
  const reason = String(details.reason || "").toLowerCase();
  const reasons = {
    insufficient_energy: "Недостаточно энергии",
    insufficient_chefir: "Не хватает чифира с учётом резерва",
    no_active_zaruba: "Активной зарубы нет",
    all_tasks_completed: "Все задания закрыты",
    reward_ready: "Награда готова к получению",
    max_level_reached: "Достигнут заданный уровень; новые Зарубы не начинаются",
    reward_claim_disabled: "Награда ожидает ручного сбора",
  };
  return details.task?.label
    || details.label
    || details.message
    || reasons[reason]
    || (reason && reason !== "manual_tasks_only" ? translateUiText(reason.replaceAll("_", " ")) : "");
}

function meaningfulZarubaHistory(history) {
  const ignored = new Set(["manual_tasks_only", "automation_disabled", "nothing_to_do"]);
  const newest = history.slice().reverse().filter((entry) => {
    const reason = String(entry?.details?.reason || "").toLowerCase();
    const technicalReadFailure = String(entry?.type || "").toLowerCase() === "error"
      && /(?:http\s*403|получить состояние зарубы)/i.test(zarubaActivityDetails(entry));
    return !ignored.has(reason) && !technicalReadFailure;
  });
  const collapsed = [];
  for (const entry of newest) {
    const label = zarubaActivityLabel(entry);
    const details = zarubaActivityDetails(entry);
    const signature = `${label}|${details}`;
    const previous = collapsed[collapsed.length - 1];
    if (previous && previous.signature === signature) {
      previous.count += 1;
      continue;
    }
    collapsed.push({ entry, label, details, signature, count: 1 });
    if (collapsed.length >= 6) break;
  }
  return collapsed;
}

function renderZarubaSpending(spending = {}) {
  const spent = Number(spending.spent) || 0;
  const reserved = Number(spending.reserved) || 0;
  const hint = `Расходы текущей Зарубы: ${formatNumber(spent)} ₽ подтверждено / ${formatNumber(reserved)} ₽ зарезервировано. Резерв включает подтверждённые покупки и запросы без подтверждения. Катала, Колесо, спички и оружие. Суточный лимит настраивается отдельно. Учёт с момента обновления бота.`;
  return `<span class="zaruba-spending" tabindex="0" title="${escapeHtml(hint)}" aria-label="${escapeHtml(hint)}"><span>${formatNumber(spent)}/${formatNumber(reserved)}</span><img src="${escapeHtml(CURRENCY_ICON_URLS.rubles)}" alt="₽"></span>`;
}

function renderZarubaDashboard(payload, options = {}) {
  state.zarubaDashboard = payload;
  const automation = payload.automation || {};
  const modes = Array.isArray(payload.modes) ? payload.modes : [];
  const tasks = Array.isArray(payload.tasks)
    ? payload.tasks
    : payload.task
      ? [payload.task]
      : [];
  const activeBossTasks = getActiveZarubaBossTasks(tasks);
  const bossQueueToolbar = activeBossTasks.length > 1
    ? `<div class="zaruba-task-queue-toolbar">
        <span>Боссовые задания не меняют вашу очередь автоматически.</span>
        <button class="action-button action-button-mini" type="button" data-zaruba-boss-queue-all>Добавить всех с ключами</button>
      </div>`
    : "";
  const select = $("#zaruba-mode-select");
  const currentMode = select ? select.value : "";
  const preserveControls = options.syncControls === false;
  const selectedMode = preserveControls
    && modes.some((mode) => String(mode.id) === String(currentMode) && mode.unlocked)
    ? currentMode
    : automation.selectedMode || modes.find((mode) => mode.unlocked)?.id || "";
  renderStatGrid($("#zaruba-summary"), [
    { label: "Уровень", value: formatNumber(payload.progress?.level || 0) },
    { label: "Опыт", value: `${formatNumber(payload.progress?.xp || 0)} / ${formatNumber(payload.progress?.xpRequired || 0)}` },
    { label: "Печатки", value: formatNumber(payload.balances?.signet || 0) },
    { label: "Руда", value: formatNumber(payload.balances?.ore || 0) },
  ]);
  const updated = $("#zaruba-updated");
  if (updated) {
    updated.textContent = payload.generatedAt ? `обновлено ${formatDate(payload.generatedAt)}` : "обновлено сейчас";
  }
  $("#zaruba-modes").innerHTML = modes.map((mode) => `
    <article class="zaruba-mode-card ${mode.unlocked ? "" : "is-locked"} ${String(mode.id) === String(selectedMode) ? "is-selected" : ""}">
      <div class="zaruba-mode-head">
        <img class="zaruba-mode-icon" src="${escapeHtml(zarubaModeIconUrl(mode))}" alt="" loading="lazy">
        <div>
          <strong>${escapeHtml(mode.name)}</strong>
          ${mode.unlocked ? buildBadge("доступен", "success") : buildBadge("закрыт", "neutral")}
        </div>
      </div>
      <span>${escapeHtml(zarubaModeLabel(mode))}</span>
      ${mode.lockReason ? `<small>${escapeHtml(mode.lockReason)}</small>` : ""}
      <button class="text-button" type="button" data-zaruba-mode="${escapeHtml(mode.id)}" ${mode.unlocked ? "" : "disabled"}>Выбрать</button>
    </article>
  `).join("") || `<p class="inline-note">Игра не вернула список режимов.</p>`;
  const selectReady = syncSelectOptions(select, modes.map((mode) => ({
    value: String(mode.id),
    label: zarubaModeLabel(mode),
    disabled: !mode.unlocked,
  })));
  if (selectReady && modes.some((mode) => String(mode.id) === String(selectedMode) && mode.unlocked)) {
    select.value = String(selectedMode);
  }
  const activeEndsAt = Number(payload.active?.endUnix) > 0
    ? new Date(Number(payload.active.endUnix) * 1000)
    : null;
  $("#zaruba-active").innerHTML = payload.active
    ? `
      <div class="zaruba-active-heading"><strong>Заруба активна · режим ${escapeHtml(payload.active.mode || "—")}</strong>${renderZarubaSpending(payload.spending)}</div>
      <span>${escapeHtml(tasks.filter((task) => task.completed).length)} из ${escapeHtml(tasks.length)} заданий закрыто${activeEndsAt ? ` · до ${escapeHtml(formatDate(activeEndsAt))}` : ""}</span>
      <small>Автоматика работает только с вашими заданиями и не зависит от состава участников.</small>
    `
    : `<strong>Активной зарубы нет</strong><span>Можно выбрать доступный режим и запустить вручную.</span>`;
  $("#zaruba-task").innerHTML = tasks.length > 0
    ? `${bossQueueToolbar}${tasks.map((task) => {
      const knowledge = resolveZarubaTaskUiKnowledge(task);
      const displayKind = knowledge.kind || task.kind || "unknown";
      const required = Number(task.requiredAmount || 0);
      const current = Number(task.currentAmount || 0);
      const percent = required > 0 ? Math.max(0, Math.min(100, current / required * 100)) : 0;
      const progress = required > 0
        ? `<div class="zaruba-task-progress">
            <div><span>${escapeHtml(formatNumber(current))} / ${escapeHtml(formatNumber(required))}</span><strong>${escapeHtml(Math.round(percent))}%</strong></div>
            <div class="loot-progress-track"><span style="width:${percent}%"></span></div>
          </div>`
        : "";
      const execution = task.execution || {};
      const taskImage = knowledge.imageUrl
        ? knowledge.imageUrl
        : displayKind === "boss" && Number(task.targetId) > 0
          ? `/assets/bosses/${Number(task.targetId)}.webp`
          : "";
      const planParts = [];
      if (Number(execution.steps) > 0) planParts.push(`${formatNumber(execution.steps)} шаг.`);
      if (Number(execution.energy) > 0) planParts.push(`${formatNumber(execution.energy)} энергии`);
      if (Number(execution.points) > 0) planParts.push(`+${formatNumber(execution.points)} к цели`);
      if (Number(execution.profitRespect) > 0) planParts.push(`прибыль +${formatNumber(execution.profitRespect)}`);
      const planTone = execution.status === "blocked"
        ? "danger"
        : execution.status === "waiting"
          ? "neutral"
          : "success";
      const taskNote = task.automationPolicy?.allowed === false
        ? task.automationPolicy.reason
        : displayKind === "boss" && automation.queueBosses
          ? "Босс будет добавлен по подходящему правилу; существующие бои сохраняют настройки."
        : displayKind === "boss"
        ? execution.status === "blocked"
          ? execution.label || "Для этого удара нет подходящего оружия."
          : "Ваша очередь первая; цель и цепочка ключей добавятся только по кнопке."
        : execution.status === "blocked"
          ? execution.label || "Это действие пока недоступно на текущем аккаунте."
        : execution.strategy === "wait_profit"
          ? "Ждём бесплатную прибыль — ходка не ставится."
          : task.queueable && execution.queueable !== false
            ? "После каждого шага цель сверяется с игрой."
            : "Прогресс отслеживается по ответу игры.";
      return `
        <article class="zaruba-task-row ${task.completed ? "is-completed" : ""}" title="${escapeHtml(task.label)}">
          <div class="zaruba-task-main">
            <div class="zaruba-task-icon ${taskImage ? "has-image" : ""}">
              ${taskImage
                ? `<img src="${escapeHtml(taskImage)}" alt="" loading="lazy" onerror="this.hidden=true">`
                : `<span aria-hidden="true">${displayKind === "prison" ? "⛓" : displayKind === "master" ? "🛠" : displayKind === "boss" ? "⚔" : displayKind === "podogrev" ? "⚡" : displayKind === "katala" ? "♠" : displayKind === "friend" ? "👥" : displayKind === "wheel" ? "◉" : "◆"}</span>`}
            </div>
            <div class="zaruba-task-copy">
              <div class="zaruba-task-row-head">
                <strong>${escapeHtml(task.label)}</strong>
                ${buildBadge(task.completed ? "готово" : zarubaTaskKindLabel(displayKind), task.completed ? "success" : "neutral")}
                ${task.completed ? "" : buildBadge(knowledge.known ? "распознано" : "неизвестно", knowledge.known ? "success" : "danger")}
              </div>
              ${task.subtitle ? `<small>${escapeHtml(task.subtitle)}</small>` : ""}
            </div>
          </div>
          ${progress}
          ${!task.completed ? `<div class="zaruba-task-actions"><button class="text-button" type="button" data-zaruba-skip="${escapeHtml(task.taskId)}" ${payload.active?.finishedSuccess || payload.active?.finishedFail ? "disabled" : ""}>Пропустить · ${formatNumber(task.skipCostSoap)} мыла</button></div>` : ""}
          ${task.completed ? "" : `<div class="zaruba-task-plan">
            ${buildBadge(
              knowledge.known && (!task.knowledge || execution.strategy === "observe") && knowledge.actionLabel
                  ? knowledge.actionLabel
                  : execution.label || "наблюдение",
              planTone,
            )}
            ${planParts.length ? `<span>${escapeHtml(planParts.join(" · "))}</span>` : ""}
          </div>`}
          ${!task.completed && displayKind === "boss" ? `
            <div class="zaruba-task-actions">
              <button
                class="action-button action-button-mini"
                type="button"
                data-zaruba-boss-queue-task="${escapeHtml(String(task.taskId || ""))}"
                title="Добавить босса и недостающую цепочку ключей после вашей очереди"
                ${task.taskId && Number(task.targetId) > 0 && execution.queueable !== false ? "" : "disabled"}
              >В очередь с ключами</button>
            </div>
          ` : ""}
          ${task.completed ? "" : `<small class="zaruba-task-note">${escapeHtml(taskNote)}</small>`}
        </article>
      `;
    }).join("")}`
    : `<span>Текущих заданий нет.</span>`;
  const selectedModeEntry = modes.find((mode) => String(mode.id) === String(select.value));
  const startButton = document.querySelector('[data-zaruba-action="start"]');
  const claimButton = document.querySelector('[data-zaruba-action="claim"]');
  if (startButton) {
    startButton.disabled = Boolean(payload.active) || !selectedModeEntry?.unlocked;
    startButton.title = payload.active ? "Сначала завершите текущую Зарубу." : "";
  }
  if (claimButton) {
    claimButton.disabled = !payload.pendingReward
      && !payload.active?.finishedSuccess
      && !payload.active?.finishedFail
      && !payload.active?.allClosed;
  }
  const badge = $("#zaruba-automation-badge");
  badge.className = automation.enabled ? "badge" : "badge badge-neutral";
  badge.textContent = automation.enabled ? "автоматика включена" : "автоматика выключена";
  populateZarubaMasterSelect(options.syncControls === false ? null : automation.intellectMasterId || null);
  if (options.syncControls !== false) {
    const controls = $("#zaruba-policy-controls");
    if (controls.dataset.dirty !== "true") {
      syncQuestPolicyControls(controls, automation);
      renderZarubaBossRules(automation.bossRules || []);
    }
    $("#zaruba-auto-enabled").checked = Boolean(automation.enabled);
    $("#zaruba-auto-start").checked = Boolean(automation.autoStart);
    if ($("#zaruba-only-without-profit")) {
      $("#zaruba-only-without-profit").checked = Boolean(automation.onlyWithoutProfit);
    }
    $("#zaruba-intellect-master").value = automation.intellectMasterId || "";
    $("#zaruba-chefir-reserve").value = automation.chefirReserve || 0;
  }
  const last = automation.lastAction;
  const lastReason = String(last?.reason || last?.details?.reason || "").toLowerCase();
  $("#zaruba-last-action").textContent = automation.lastError
    ? `Остановлено: ${automation.lastError}`
    : lastReason === "manual_tasks_only"
      ? "Задания отслеживаются. Действия, требующие вашего решения, оставлены вам."
      : last
        ? `${zarubaActivityLabel(last)}${zarubaActivityDetails(last) ? ` · ${zarubaActivityDetails(last)}` : ""}`
        : "Задания отслеживаются автоматически; выполненных действий пока нет.";
  const history = (Array.isArray(automation.history) ? automation.history : [])
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry));
  const activity = meaningfulZarubaHistory(history);
  $("#zaruba-history").innerHTML = activity.length > 0
    ? `<div class="zaruba-activity-head"><strong>Последние события</strong><span>без технических проверок</span></div>${activity.map((item) => `
      <div class="zaruba-activity-entry">
        <span class="zaruba-activity-dot ${["error", "stopped"].includes(String(item.entry.type).toLowerCase()) ? "is-error" : ""}" aria-hidden="true"></span>
        <div><strong>${escapeHtml(item.label)}${item.count > 1 ? ` ×${formatNumber(item.count)}` : ""}</strong>${item.details ? `<span>${escapeHtml(item.details)}</span>` : ""}</div>
        <time>${escapeHtml(item.entry.at ? formatDate(item.entry.at) : "")}</time>
      </div>
    `).join("")}`
    : `<div class="zaruba-activity-empty">Значимых событий пока нет. Технические проверки сюда не попадают.</div>`;
  applyZarubaBossTasksToExistingQueue();
}

async function handleZarubaDashboard(options = {}) {
  if (state.zarubaRefreshRunning) return state.zarubaDashboard;
  state.zarubaRefreshRunning = true;
  if (!options.silent) setServerStatus("loading zaruba", "busy");
  try {
    const payload = await apiRequest("GET", "/api/zaruba/dashboard");
    if (!state.bossDashboard && options.syncControls !== false) {
      await handleBossDashboard({ silent: true, showStatus: false, fast: true });
    }
    renderZarubaDashboard(payload, options);
    if (!options.silent) {
      setServerStatus("ready", "ok");
    }
    return payload;
  } catch (error) {
    if (!options.silent) {
      setServerStatus("zaruba error", "error");
      appendDiagnosticError("zaruba", error);
    }
    return null;
  } finally {
    state.zarubaRefreshRunning = false;
  }
}

function startZarubaSync(intervalMs = ZARUBA_REFRESH_INTERVAL_MS) {
  if (state.zarubaPollTimerId) clearInterval(state.zarubaPollTimerId);
  state.zarubaPollTimerId = setInterval(() => {
    const panelActive = document.querySelector('[data-panel="zaruba"]')?.classList.contains("is-active");
    if (document.visibilityState === "visible" && panelActive) {
      void handleZarubaDashboard({ silent: true, syncControls: false });
    }
  }, Math.max(5_000, Number(intervalMs) || ZARUBA_REFRESH_INTERVAL_MS));
}

async function handleZarubaBossQueueBuild(taskId = null) {
  const status = $("#zaruba-boss-queue-status");
  setServerStatus("building Zaruba boss queue", "busy");
  if (status) status.textContent = "Сверяю ключи и существующую очередь…";
  try {
    await handleBossDashboard({
      fast: true,
      silent: true,
      showStatus: false,
      syncQueue: true,
    });
    const allTasks = getActiveZarubaBossTasks();
    const tasks = taskId
      ? allTasks.filter((task) => String(task.taskId || "") === String(taskId))
      : allTasks;
    if (tasks.length === 0) {
      if (status) status.textContent = "Активных заданий Зарубы на боссов уже нет.";
      setServerStatus("ready", "ok");
      return;
    }

    const initialPlan = buildZarubaBossQueuePlan({ tasks });
    await offerBossComboSetupForQueue([
      ...initialPlan.entries,
      ...initialPlan.replacements.map((item) => item.item),
    ]);
    const plan = buildZarubaBossQueuePlan({ tasks });
    const operations = [
      ...plan.replacements.map((item) => ({ type: "replace", from: item.from, item: item.item })),
      ...plan.entries.map((item) => ({ type: "append", item })),
    ];
    if (operations.length === 0) {
      const message = plan.blocked.length > 0
        ? "Не удалось построить доступную цепочку ключей в пределах сегодняшних попыток."
        : "Эти боссы уже отмечены в вашей очереди; порядок не менялся.";
      if (status) status.textContent = message;
      appendLog("Заруба · очередь боссов", message, { source: "zaruba" });
      setServerStatus(plan.blocked.length > 0 ? "Zaruba boss queue blocked" : "ready", plan.blocked.length > 0 ? "error" : "ok");
      return;
    }

    const nextQueue = [...state.bossRunQueue];
    for (const replacement of plan.replacements) {
      if (replacement.index >= 0 && replacement.index < nextQueue.length) {
        nextQueue[replacement.index] = replacement.item;
      }
    }
    nextQueue.push(...plan.entries);
    state.bossRunQueue = nextQueue;
    markBossRunQueueEdited();
    persistBossRunQueue();
    renderBossRunQueue();
    await syncBossAutomationAfterQueueEdit(
      "Заруба · очередь боссов",
      { queueOperations: operations },
      { includeQueue: false },
    );
    if (state.bossAuto.autoStartNext) scheduleBossStartUiSync();
    const targetCount = plan.entries.filter((entry) => entry.serverTaskId).length + plan.replacements.length;
    const keyBossCount = plan.entries.length - plan.entries.filter((entry) => entry.serverTaskId).length;
    const message = `Ваша очередь сохранена первой. Добавлено для Зарубы: целей ${formatNumber(targetCount)}, боссов для ключей ${formatNumber(keyBossCount)}.${plan.blocked.length > 0 ? ` Не удалось построить: ${formatNumber(plan.blocked.length)}.` : ""}`;
    if (status) status.textContent = message;
    appendLog("Заруба · очередь боссов", message, { source: "zaruba" });
    setServerStatus("ready", "ok");
  } catch (error) {
    const message = error.message || String(error);
    if (status) status.textContent = `Не удалось сформировать очередь: ${message}`;
    appendLog("Заруба · очередь боссов", message, { source: "zaruba", kind: "error" });
    setServerStatus("Zaruba boss queue error", "error");
  }
}

function collectZarubaAutomationOptions() {
  const current = state.zarubaDashboard?.automation || {};
  const enabled = $("#zaruba-auto-enabled").checked;
  return {
    expectedVersion: current.version,
    enabled,
    selectedMode: $("#zaruba-mode-select").value || null,
    autoStart: $("#zaruba-auto-start").checked,
    autoClaimFree: enabled,
    enqueueTasks: enabled,
    onlyWithoutProfit: false,
    ...readQuestPolicyControls($("#zaruba-policy-controls")),
    bossRules: readZarubaBossRules(),
    intellectMasterId: Number($("#zaruba-intellect-master").value || 0) || null,
    chefirReserve: Number($("#zaruba-chefir-reserve").value || 0),
    allowBossSkipSoap: false,
    bossSkipSoapDailyLimit: 0,
    allowPodogrevSkipSoap: false,
    podogrevSkipSoapDailyLimit: 0,
  };
}

function loadBossRunQueuePresets() {
  try {
    const parsed = JSON.parse(readAccountStorage(BOSS_RUN_QUEUE_PRESETS_STORAGE_KEY) || "{}");
    state.bossRunQueuePresets = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? Object.fromEntries(
        Object.entries(parsed)
          .map(([id, preset]) => {
            const entries = normalizeBossRunQueueEntries(preset && preset.entries);
            if (!entries.length) return null;
            return [id, {
              id,
              name: String(preset.name || id).slice(0, 80),
              entries,
              updatedAt: preset.updatedAt || null,
            }];
          })
          .filter(Boolean),
      )
      : {};
  } catch (_error) {
    state.bossRunQueuePresets = {};
  }
  renderBossRunQueuePresetSelect();
}

function persistBossRunQueuePresets() {
  try {
    writeAccountStorage(
      BOSS_RUN_QUEUE_PRESETS_STORAGE_KEY,
      JSON.stringify(state.bossRunQueuePresets || {}),
    );
  } catch (_error) {
    // Keep runtime presets when localStorage is unavailable.
  }
}

function renderBossRunQueuePresetSelect(selectedId = "") {
  const select = $("#boss-run-preset-select");
  const sourceSelect = $("#boss-run-source-select");
  if (!select && !sourceSelect) return;
  const presets = Object.values(state.bossRunQueuePresets || {})
    .sort((left, right) => String(left.name).localeCompare(String(right.name), "ru"));
  if (select) {
    const selectReady = syncSelectOptions(select, [
      { value: "", label: "Выберите пресет" },
      ...presets.map((preset) => ({
        value: preset.id,
        label: `${preset.name} · ${formatNumber(preset.entries.length)}`,
      })),
    ]);
    if (selectReady && selectedId && state.bossRunQueuePresets[selectedId]) {
      select.value = selectedId;
    }
  }
  if (sourceSelect) {
    const previousSource = sourceSelect.value;
    const sourceReady = syncSelectOptions(sourceSelect, [
      { value: "auto", label: "По правилам автоформирования" },
      ...presets.map((preset) => ({
        value: `preset:${preset.id}`,
        label: `Из пресета · ${preset.name} (${formatNumber(preset.entries.length)})`,
      })),
    ]);
    const preferredSource = selectedId && state.bossRunQueuePresets[selectedId]
      ? `preset:${selectedId}`
      : previousSource;
    if (sourceReady && [...sourceSelect.options].some((option) => option.value === preferredSource)) {
      sourceSelect.value = preferredSource;
    }
  }
}

function confirmBossWeaponPurchase({ weaponType, count, unitPrice, totalRubles }) {
  const label = BOSS_WEAPON_LABELS[weaponType] || weaponType;
  const message = `Купить ${label} ×${formatNumber(count)} за ${formatNumber(totalRubles)} ₽?`;
  const dialog = $("#boss-weapon-purchase-dialog");
  const confirmButton = $("#boss-weapon-purchase-confirm");
  const cancelButton = $("#boss-weapon-purchase-cancel");
  const contextNode = $("#boss-weapon-purchase-context");
  const nameNode = $("#boss-weapon-purchase-name");
  const countNode = $("#boss-weapon-purchase-count");
  const unitPriceNode = $("#boss-weapon-purchase-unit-price");
  const totalNode = $("#boss-weapon-purchase-total");

  if (!dialog || !confirmButton || !cancelButton) {
    return Promise.resolve(window.confirm(message));
  }
  if (contextNode) {
    contextNode.textContent = "Игра спишет рубли сразу после подтверждения.";
  }
  if (nameNode) nameNode.textContent = label;
  if (countNode) countNode.textContent = `×${formatNumber(count)}`;
  if (unitPriceNode) unitPriceNode.textContent = `${formatNumber(unitPrice)} ₽`;
  if (totalNode) totalNode.textContent = `${formatNumber(totalRubles)} ₽`;
  confirmButton.textContent = `Купить за ${formatNumber(totalRubles)} ₽`;

  return runDialogConfirmation({ dialog, confirmButton, cancelButton });
}

async function handleBossRunPresetSave() {
  const name = String($("#boss-run-preset-name")?.value || "").trim();
  if (!name || state.bossRunQueue.length === 0) {
    setServerStatus("нужно название и непустая очередь", "error");
    return;
  }
  const id = `queue-preset-${name.toLocaleLowerCase("ru").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 48) || Date.now().toString(36)}`;
  state.bossRunQueuePresets[id] = {
    id,
    name: name.slice(0, 80),
    entries: normalizeBossRunQueueEntries(state.bossRunQueue),
    updatedAt: new Date().toISOString(),
  };
  persistBossRunQueuePresets();
  renderBossRunQueuePresetSelect(id);
  appendLog("Boss queue preset saved", name);
  setServerStatus("ready", "ok");
}

async function loadBossRunPreset(id) {
  const preset = state.bossRunQueuePresets[id];
  if (!preset) return;
  state.bossRunQueue = normalizeBossRunQueueEntries(preset.entries);
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueue();
  await syncBossAutomationState({}, { silent: true, renderQueue: false });
  appendLog("Boss queue preset loaded", preset.name);
}

async function handleBossQueueSourceApply() {
  const source = String($("#boss-run-source-select")?.value || "auto");
  if (source === "auto") {
    await handleBossRunQueueBuild();
    return;
  }
  if (source.startsWith("preset:")) {
    await loadBossRunPreset(source.slice("preset:".length));
  }
}

function handleBossRunPresetDelete() {
  const id = String($("#boss-run-preset-select")?.value || "");
  const preset = state.bossRunQueuePresets[id];
  if (!preset) return;
  delete state.bossRunQueuePresets[id];
  persistBossRunQueuePresets();
  renderBossRunQueuePresetSelect();
  appendLog("Boss queue preset deleted", preset.name);
}

async function handleZarubaAutomationSave() {
  // Checkbox changes can be made back-to-back.  Serialize saves and collect
  // the form values when each request starts, so an older response cannot
  // overwrite newer toggle choices before the next application restart.
  const previousSave = state.zarubaAutomationSaveOperation || Promise.resolve();
  const saveSequence = state.zarubaAutomationSaveSequence + 1;
  state.zarubaAutomationSaveSequence = saveSequence;
  setZarubaSaveButtonState("saving");
  const save = previousSave
    .catch(() => undefined)
    .then(async () => {
      const options = collectZarubaAutomationOptions();
      const controls = $("#zaruba-policy-controls");
      const revision = controls.dataset.revision || "0";
      const automation = await apiRequest("POST", "/api/zaruba/automation", options);
      if ((controls.dataset.revision || "0") === revision) controls.dataset.dirty = "false";
      if (state.zarubaDashboard) {
        state.zarubaDashboard.automation = automation;
        renderZarubaDashboard(state.zarubaDashboard, { syncControls: false });
      }
      appendLog("Зарубы", options.enabled ? "автоматика включена" : "автоматика выключена", { source: "zaruba" });
      if (saveSequence === state.zarubaAutomationSaveSequence) {
        setZarubaSaveButtonState("saved");
      }
      return automation;
    })
    .catch(async (error) => {
      appendLog("Зарубы", error.message || String(error), { source: "zaruba", kind: "error" });
      if (saveSequence === state.zarubaAutomationSaveSequence) {
        setZarubaSaveButtonState("error");
      }
      await handleZarubaDashboard({ silent: true });
      return null;
    });
  state.zarubaAutomationSaveOperation = save;
  return save;
}

function setZarubaSaveButtonState(status) {
  const button = $("#zaruba-save-btn");
  if (!button) return;
  if (state.zarubaAutomationSaveResetTimerId) {
    clearTimeout(state.zarubaAutomationSaveResetTimerId);
    state.zarubaAutomationSaveResetTimerId = null;
  }
  button.classList.toggle("is-saved", status === "saved");
  button.classList.toggle("is-error", status === "error");
  button.disabled = status === "saving";
  button.textContent = status === "saving"
    ? "Сохраняю…"
    : status === "saved"
      ? "Правила сохранены ✓"
      : status === "error"
        ? "Не удалось сохранить"
        : "Сохранить правила";
  if (status === "saved" || status === "error") {
    state.zarubaAutomationSaveResetTimerId = setTimeout(() => {
      button.classList.remove("is-saved", "is-error");
      button.disabled = false;
      button.textContent = "Сохранить правила";
      state.zarubaAutomationSaveResetTimerId = null;
    }, 2_500);
  }
}

async function handleZarubaModeSelect(mode) {
  const selectedMode = String(mode || "").trim();
  const dashboard = state.zarubaDashboard;
  const modes = Array.isArray(dashboard && dashboard.modes) ? dashboard.modes : [];
  const entry = modes.find((candidate) => String(candidate.id) === selectedMode);
  if (!dashboard || !entry || !entry.unlocked) return;

  const previousMode = dashboard.automation && dashboard.automation.selectedMode || null;
  dashboard.automation = {
    ...(dashboard.automation || {}),
    selectedMode,
  };
  const select = $("#zaruba-mode-select");
  if (select) select.value = selectedMode;
  renderZarubaDashboard(dashboard, { syncControls: false });

  try {
    const automation = await apiRequest("POST", "/api/zaruba/automation", { selectedMode });
    dashboard.automation = automation;
    renderZarubaDashboard(dashboard, { syncControls: false });
    appendLog("Зарубы", `Выбран режим: ${zarubaModeLabel(entry)}`, { source: "zaruba" });
  } catch (error) {
    dashboard.automation = {
      ...(dashboard.automation || {}),
      selectedMode: previousMode,
    };
    renderZarubaDashboard(dashboard);
    appendLog("Зарубы", error.message || String(error), { source: "zaruba", kind: "error" });
  }
}

let zarubaSkipPending = false;

async function handleZarubaSkip(button) {
  if (zarubaSkipPending || !state.zarubaDashboard) return;
  zarubaSkipPending = true;
  button.disabled = true;
  try {
    const request = { action: "skip", taskId: button.dataset.zarubaSkip,
      dryRun: true, expectedStateVersion: state.zarubaDashboard.stateVersion };
    const preview = await apiRequest("POST", "/api/zaruba/action", request);
    const soap = preview.plan?.expectedCost?.soap;
    if (!Number.isSafeInteger(soap) || soap <= 0) throw new Error("Цена пропуска неизвестна.");
    if (!window.confirm(`Пропустить это задание за ${formatNumber(soap)} мыла?`)) return;
    const result = await apiRequest("POST", "/api/zaruba/action", {
      ...request, dryRun: false, confirmed: true, maxSoap: soap,
      expectedStateVersion: preview.plan.stateVersion,
    });
    renderZarubaDashboard(result.dashboard);
    await handleEconomyRefresh();
  } catch (error) {
    appendLog("Зарубы", error.message || String(error), { source: "zaruba", kind: "error" });
  } finally {
    zarubaSkipPending = false;
    button.disabled = false;
  }
}

async function handleBossQueueComboSettingChange(event) {
  persistBossQueueSettings();
  const operations = [];
  state.bossRunQueue = state.bossRunQueue.map((previous) => {
    const item = withBossRunQueueHitTypes({ ...previous, skipCombo: !event.target.checked });
    operations.push({ type: "replace", from: previous, item });
    return item;
  });
  markBossRunQueueEdited();
  persistBossRunQueue();
  renderBossRunQueueExcludeList();
  renderBossRunQueue();
  if (operations.length > 0) {
    await syncBossAutomationAfterQueueEdit("Boss queue combo", { queueOperations: operations }, { includeQueue: false });
  }
}

async function handleZarubaAction(action) {
  const button = document.querySelector(`[data-zaruba-action="${action}"]`);
  if (!state.zarubaDashboard || !button) return;
  button.disabled = true;
  const request = {
    action,
    mode: $("#zaruba-mode-select").value || undefined,
    dryRun: true,
    expectedStateVersion: state.zarubaDashboard.stateVersion,
  };
  try {
    const preview = await apiRequest("POST", "/api/zaruba/action", request);
    state.zarubaActionPreview = preview;
    const costSummary = Object.entries(preview.plan?.expectedCost || {})
      .filter(([, amount]) => Number(amount) > 0)
      .map(([currency, amount]) => `${formatNumber(amount)} ${currency}`)
      .join(", ");
    if (!window.confirm(`Выполнить реальное действие Зарубы «${button.textContent.trim()}»?${costSummary ? ` Подтверждённый расход: ${costSummary}.` : ""} Состояние будет повторно сверено.`)) {
      return;
    }
    const result = await apiRequest("POST", "/api/zaruba/action", {
      ...request,
      dryRun: false,
      confirmed: true,
    });
    appendLog("Зарубы", `${action}: выполнено`, { source: "zaruba" });
    renderZarubaDashboard(result.dashboard);
    await handleEconomyRefresh();
  } catch (error) {
    appendLog("Зарубы", error.message || String(error), { source: "zaruba", kind: "error" });
  } finally {
    button.disabled = false;
  }
}

function renderPrisonQueueEditor(automation = state.prisonAutomation || {}) {
  const target = $("#prison-queue-list");
  if (!target) return;
  const queue = Array.isArray(automation.queue) ? automation.queue : [];
  const prisons = state.prisonDashboard?.prisons || [];
  const masters = state.prisonDashboard?.masters || [];
  target.innerHTML = queue.map((item, index) => {
    const catalog = item.targetType === "master" ? masters : prisons;
    const targetEntry = catalog.find((entry) => Number(entry.id) === Number(item.targetId));
    const targetName = targetEntry?.name || `${item.targetType === "master" ? "Мастер" : "Тюрьма"} #${item.targetId}`;
    const imageUrl = item.imageUrl || targetEntry?.icon || targetEntry?.imageUrl || "";
    const isZaruba = String(item.origin || "").includes("zaruba");
    const current = Number(item.taskCurrentAmount || 0);
    const required = Number(item.taskRequiredAmount || 0);
    const remaining = required > 0 ? Math.max(0, required - current) : null;
    const completedRuns = Math.max(0, Number(item.completedRuns || 0));
    const runTarget = Math.max(1, Number(item.runTarget || item.repeatCount || 1));
    const collectionCollected = Math.max(0, Number(item.collectionCollected || 0));
    const collectionTotal = Math.max(0, Number(item.collectionTotal || 0));
    const goalLabel = isZaruba
      ? "до серверного зачёта цели"
      : item.goalType === "collection"
        ? `до полного сбора · ${collectionTotal > 0 ? `${formatNumber(collectionCollected)} / ${formatNumber(collectionTotal)} вещей` : "проверка коллекции"} · ${formatNumber(completedRuns)} ходок`
        : `${formatNumber(completedRuns)} / ${formatNumber(runTarget)} ходок · осталось ${formatNumber(Math.max(0, runTarget - completedRuns))}`;
    const plan = [
      Number(item.plannedSteps) > 0 ? `${formatNumber(item.plannedSteps)} шаг.` : "",
      Number(item.plannedEnergy) > 0 ? `${formatNumber(item.plannedEnergy)} энергии` : "",
      Number(item.plannedPoints) > 0 ? `+${formatNumber(item.plannedPoints)} к цели` : "",
    ].filter(Boolean).join(" · ");
    return `
      <article class="prison-queue-item ${index === 0 ? "is-active" : ""} ${isZaruba ? "is-zaruba" : ""}" data-queue-item-id="${escapeHtml(item.queueItemId)}">
        <div class="prison-queue-item-body">
          <div class="prison-queue-item-icon ${imageUrl ? "has-image" : ""}">
            ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" loading="lazy" onerror="this.hidden=true">` : `<span>${item.targetType === "master" ? "🛠" : "⛓"}</span>`}
          </div>
          <div class="prison-queue-item-copy">
            <div class="prison-queue-item-title">
              <strong>${index + 1}. ${escapeHtml(targetName)}</strong>
              ${index === 0 ? buildBadge("сейчас", "success") : buildBadge("ожидает", "neutral")}
              ${isZaruba ? buildBadge("заруба", "warning") : ""}
            </div>
            ${item.taskLabel ? `<span>${escapeHtml(item.taskLabel)}</span>` : ""}
            <small>${item.targetType === "master" ? "мастерская" : item.isDay ? "день" : "ночь"} · ${escapeHtml(goalLabel)}</small>
            ${required > 0 ? `<div class="prison-queue-target-progress"><span>${formatNumber(current)} / ${formatNumber(required)}</span><b>осталось ${formatNumber(remaining)}</b></div>` : ""}
            ${plan ? `<div class="prison-queue-plan">${escapeHtml(plan)}</div>` : ""}
            ${isZaruba ? `<small class="prison-queue-removal-rule">После шага → сверка Зарубы → удаление сразу после зачёта.</small>` : ""}
          </div>
        </div>
        <div class="queue-row-actions">
          <button class="text-button" type="button" data-prison-queue-action="up" data-index="${index}" ${index === 0 ? "disabled" : ""} aria-label="Выше">↑</button>
          <button class="text-button" type="button" data-prison-queue-action="down" data-index="${index}" ${index === queue.length - 1 ? "disabled" : ""} aria-label="Ниже">↓</button>
          <button class="text-button text-button-danger" type="button" data-prison-queue-action="remove" data-index="${index}" aria-label="Удалить">×</button>
        </div>
      </article>
    `;
  }).join("") || `<p class="inline-note">Очередь пуста. Добавьте обычную цель или включите автоматику Заруб — нужные пункты появятся здесь сами.</p>`;
}

async function savePrisonQueue(queue) {
  const automation = await apiRequest("POST", "/api/prison/automation", { queue });
  if (state.prisonDashboard) state.prisonDashboard.automation = automation;
  renderPrisonAutomation(automation);
  renderPrisonQueueEditor(automation);
  return automation;
}

async function handlePrisonQueueClick(event) {
  const button = event.target.closest("[data-prison-queue-action]");
  if (!button) return;
  const queue = [...(state.prisonAutomation?.queue || [])];
  const index = Number(button.dataset.index);
  const action = button.dataset.prisonQueueAction;
  if (action === "remove") queue.splice(index, 1);
  if (action === "up" && index > 0) [queue[index - 1], queue[index]] = [queue[index], queue[index - 1]];
  if (action === "down" && index < queue.length - 1) [queue[index], queue[index + 1]] = [queue[index + 1], queue[index]];
  await savePrisonQueue(queue);
}

async function handlePrisonQueueAdd() {
  const targetType = $("#prison-target-type").value === "master" ? "master" : "prison";
  const targetId = Number($("#prison-select").value || 0);
  if (!targetId) return;
  const goalType = $("#prison-queue-goal")?.value === "collection" ? "collection" : "runs";
  const runTarget = goalType === "runs"
    ? Math.max(1, Math.min(10_000, Number($("#prison-queue-runs")?.value || 1)))
    : null;
  const queue = [...(state.prisonAutomation?.queue || []), {
    queueItemId: `manual-${targetType}-${targetId}-${Date.now().toString(36)}`,
    targetType,
    targetId,
    isDay: $("#prison-mode").value === "day",
    goalType,
    runTarget,
    completedRuns: 0,
    repeatCount: runTarget || 1,
    origin: "manual",
    priority: 0,
  }];
  await savePrisonQueue(queue);
}

function syncPrisonQueueGoalControls() {
  const collectionGoal = $("#prison-queue-goal")?.value === "collection";
  const runsField = $("#prison-queue-runs-field");
  if (runsField) runsField.hidden = collectionGoal;
}

async function handleTalentCalculator() {
  try {
    const targetPoints = Number($("#talent-calculator-target-points").value || 0);
    const damage = Number($("#talent-calculator-damage").value || 0);
    const payload = await apiRequest("GET", `/api/talents/calculator?targetPoints=${encodeURIComponent(targetPoints)}&damage=${encodeURIComponent(damage)}`);
    if (targetPoints < payload.projection.currentPoints) {
      $("#talent-calculator-target-points").value = payload.projection.currentPoints;
    }
    renderStatGrid($("#talent-calculator-result"), [
      { label: "Сейчас талантов", value: formatNumber(payload.projection.currentPoints) },
      { label: "Урон до цели", value: formatNumber(payload.projection.damageToTarget) },
      { label: "Даст талантов", value: `+${formatNumber(payload.projection.gainedPoints)}` },
      { label: "Итог", value: formatNumber(payload.projection.projectedPoints) },
    ]);
  } catch (error) {
    $("#talent-calculator-result").innerHTML = `<p class="inline-note">${escapeHtml(error.message || String(error))}</p>`;
  }
}

async function handlePrisonStatus(options = {}) {
  setServerStatus("loading prison", "busy");
  try {
    const [payload, costs] = await Promise.all([
      apiRequest("GET", "/api/prison/dashboard"),
      apiRequest("GET", "/api/prison/costs").catch((error) => {
        console.warn("Unable to load full prison-run energy costs", error);
        return null;
      }),
    ]);
    if (costs) {
      renderPrisonCosts(costs);
    }
    renderPrisonDashboard(payload, { syncControls: options.syncControls !== false });
    if ($("#prison-target-type").value === "prison") {
      await handlePrisonDetail({ silent: true });
    }
    appendLog("Тюрьма обновлена", `${payload.prisons.length} тюрем · ${payload.masters.length} мастеров`);
    setServerStatus("ready", "ok");
    return payload;
  } catch (error) {
    setServerStatus("prison error", "error");
    appendDiagnosticError("prison", error);
    throw error;
  }
}

async function handlePrisonDetail(options = {}) {
  if ($("#prison-target-type") && $("#prison-target-type").value === "master") {
    return null;
  }
  if (!options.silent) {
    setServerStatus("loading detail", "busy");
  }
  try {
    const prisonId = Number($("#prison-select").value || 1);
    const payload = await apiRequest("GET", `/api/prison/detail?prisonId=${prisonId}`);
    state.prisonDetail = payload;
    renderPrisonAutomationProgress();
    renderPrisonCollectionSummary();
    renderPrisonZoneGrids();
    if (!options.silent) {
      appendLog("Тюрьма выбрана", `#${prisonId}`);
      setServerStatus("ready", "ok");
    }
    return payload;
  } catch (error) {
    if (!options.silent) {
      setServerStatus("detail error", "error");
      appendDiagnosticError("prison", error);
    }
    return null;
  }
}

function collectPrisonAutomationOptions() {
  const targetType = $("#prison-target-type").value === "master" ? "master" : "prison";
  const allowSoap = $("#prison-allow-soap").checked;
  const allowChefir = $("#prison-allow-chefir").checked;
  const soapDailyLimit = Number($("#prison-soap-daily-limit").value || 0);
  const chefirDailyLimit = Number($("#prison-chefir-daily-limit").value || 0);
  return {
    enabled: $("#prison-auto").checked,
    targetType,
    targetId: Number($("#prison-select").value || 1),
    isDay: $("#prison-mode").value === "day",
    stepsPerTick: 1,
    delayMs: 250,
    intervalSec: 10,
    minEnergy: Number($("#prison-auto-min-energy").value || 0),
    usePodogrev: $("#prison-use-podogrev").checked,
    autoCollectProfit: $("#prison-auto-profit").checked,
    autoBuyMasterItems: $("#prison-auto-buy-items").checked,
    energyPolicy: {
      ...(state.prisonAutomation?.energyPolicy || {}),
      order: $("#prison-energy-order").value || "chefir_soap",
      allowSoap: allowSoap && soapDailyLimit > 0,
      allowChefir: allowChefir && chefirDailyLimit > 0,
      chefirReserve: Number($("#prison-chefir-reserve").value || 0),
      soapDailyLimit,
      chefirDailyLimit,
    },
  };
}

async function handlePrisonAutomationSave() {
  setServerStatus("saving prison", "busy");
  try {
    const options = collectPrisonAutomationOptions();
    const previousPolicy = state.prisonAutomation?.energyPolicy || {};
    const enablesPaid = (
      options.energyPolicy.allowSoap && !previousPolicy.allowSoap
      || options.energyPolicy.allowChefir && !previousPolicy.allowChefir
    );
    if (enablesPaid && !window.confirm(
      `Разрешить платное восстановление энергии? Лимиты: ${formatNumber(options.energyPolicy.soapDailyLimit)} мыла и ${formatNumber(options.energyPolicy.chefirDailyLimit)} чифира за московские сутки.`,
    )) {
      $("#prison-allow-soap").checked = Boolean(previousPolicy.allowSoap);
      $("#prison-allow-chefir").checked = Boolean(previousPolicy.allowChefir);
      return;
    }
    const automation = await apiRequest("POST", "/api/prison/automation", options);
    if (state.prisonDashboard) {
      state.prisonDashboard.automation = automation;
    }
    renderPrisonAutomation(automation);
    appendLog("Дефолтная цель сохранена", `${automation.targetType} #${automation.targetId}`);
    await handlePrisonStatus({ syncControls: false });
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("prison save error", "error");
    appendDiagnosticError("prison", error);
  }
}

async function handlePrisonAutomationTick() {
  setServerStatus("checking prison", "busy");
  try {
    const result = await apiRequest("POST", "/api/prison/automation/tick", {});
    renderPrisonAutomation(result.automation);
    appendLog("Проверка PRISON", result.action ? result.action.reason || result.action.type : "готово");
    await handleEconomyRefresh();
    await handlePrisonStatus({ syncControls: false });
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("prison tick error", "error");
    appendDiagnosticError("prison", error);
  }
}

async function handlePrisonMaintenanceAction(kind) {
  const isProfit = kind === "profit";
  setServerStatus(isProfit ? "collecting profit" : "collecting heat", "busy");
  try {
    await apiRequest("POST", isProfit ? "/api/player/business/collect" : "/api/podogrev/collect", {});
    appendLog(isProfit ? "Общак собран" : "Подогрев собран");
    await handleEconomyRefresh();
    await handlePrisonStatus({ syncControls: false });
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus(isProfit ? "profit error" : "heat error", "error");
    appendDiagnosticError("prison", error);
  }
}

async function handleMasterBuyMissing(masterId = null) {
  const selectedMasterId = Number(masterId || $("#prison-select").value || 1);
  const master = state.prisonDashboard && Array.isArray(state.prisonDashboard.masters)
    ? state.prisonDashboard.masters.find((item) => Number(item.id) === selectedMasterId)
    : null;
  const training = master ? master.training : null;
  if (training && training.missingItems.length > 0) {
    const confirmed = window.confirm(
      `Купить ${training.missingItems.length} вещей у «${master.name}» за ${formatCurrencyAmounts(training.missingCost)}?`,
    );
    if (!confirmed) {
      return;
    }
  }
  setServerStatus("buying master items", "busy");
  try {
    const result = await apiRequest("POST", "/api/prison/master/buy-missing", {
      masterId: selectedMasterId,
      dryRun: false,
    });
    appendLog("Вещи мастера", `${result.purchased.length} куплено · ${result.reason}`);
    await handleEconomyRefresh();
    await handlePrisonStatus({ syncControls: false });
    setServerStatus(result.ok ? "ready" : "purchase blocked", result.ok ? "ok" : "error");
  } catch (error) {
    setServerStatus("master purchase error", "error");
    appendDiagnosticError("prison", error);
  }
}

async function handlePrisonTargetChange() {
  populatePrisonTargetSelect();
  state.prisonDetail = null;
  if ($("#prison-target-type").value === "prison") {
    await handlePrisonDetail({ silent: true });
  }
}

async function handlePrisonZoneGridClick(event) {
  const button = event.target.closest("[data-prison-action]");
  if (!button) {
    return;
  }
  const action = button.dataset.prisonAction;
  const targetId = Number(button.dataset.targetId || 1);
  if (action === "buy") {
    await handleMasterBuyMissing(targetId);
    return;
  }
  if (action === "select") {
    $("#prison-target-type").value = button.dataset.targetType === "master" ? "master" : "prison";
    populatePrisonTargetSelect(targetId);
    await handlePrisonTargetChange();
    $("#prison-save-btn").focus();
    appendLog("Цель выбрана", `${button.dataset.targetType} #${targetId}; нажми «Сохранить как дефолт»`);
  }
}

async function handlePrisonRun(dryRun) {
  setServerStatus(dryRun ? "prison preview" : "running prison", "busy");
  try {
    const targetType = $("#prison-target-type").value === "master" ? "master" : "prison";
    const targetId = Number($("#prison-select").value || 1);
    const payload = await apiRequest("POST", "/api/prison/run", {
      targetType,
      targetId,
      prisonId: targetId,
      masterId: targetId,
      isDay: $("#prison-mode").value === "day",
      steps: 1,
      delayMs: 250,
      autoBuyMasterItems: $("#prison-auto-buy-items").checked,
      dryRun,
    });
    renderPrisonResult(payload);
    if (!dryRun) {
      await handleEconomyRefresh();
      await handlePrisonStatus({ syncControls: false });
    }
    appendLog(dryRun ? "Проверка PRISON" : "Ручной проход", `${targetType} #${targetId}`);
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("prison run error", "error");
    appendDiagnosticError("prison", error);
  }
}

async function autoRunTick() {
  if (state.autoRun.running) {
    return;
  }
  state.autoRun.running = true;
  try {
    if ($("#prison-auto-refresh").checked) {
      await handleEconomyRefresh();
    }
    await handlePrisonDetail();
    const selected = computeSelectedPrisonCost();
    const energyNow = state.economy ? state.economy.energy : null;
    const minEnergy = Number($("#prison-auto-min-energy").value || 0);
    const requiredEnergy = selected && selected.totalCost !== null ? selected.totalCost : null;
    if (energyNow !== null && requiredEnergy !== null && energyNow >= Math.max(minEnergy, requiredEnergy)) {
      appendLog("Auto-run", `energy ${energyNow} >= ${requiredEnergy}`);
      await handlePrisonRun(false);
    }
  } finally {
    state.autoRun.running = false;
  }
}

function startAutoRun() {
  const intervalSec = 10;
  if (state.autoRun.timerId) {
    clearInterval(state.autoRun.timerId);
  }
  state.autoRun.enabled = true;
  state.autoRun.timerId = setInterval(autoRunTick, intervalSec * 1000);
  appendLog("Auto-run enabled", `${intervalSec}s`);
}

function stopAutoRun() {
  if (state.autoRun.timerId) {
    clearInterval(state.autoRun.timerId);
  }
  state.autoRun.timerId = null;
  state.autoRun.enabled = false;
  appendLog("Auto-run disabled");
}

function handleAutoRunToggle() {
  if ($("#prison-auto").checked) {
    startAutoRun();
    autoRunTick();
  } else {
    stopAutoRun();
  }
}

function collectBossOptions() {
  const queuedTypes = buildBossTypesFromQueue();
  const modeSelect = $("#boss-mode");
  const comboModeSelect = $("#boss-combo-mode");
  const selectedBossId = $("#boss-select").value ? Number($("#boss-select").value) : undefined;
  const comboMode = comboModeSelect && !comboModeSelect.disabled ? comboModeSelect.value || undefined : undefined;
  const storedTemplate = resolveBossComboTemplateForBossAndMode({
    bossId: selectedBossId,
    mode: modeSelect ? modeSelect.value || undefined : undefined,
    comboMode,
  });
  return {
    categoryId: $("#boss-category").value || undefined,
    bossId: selectedBossId,
    mode: modeSelect ? modeSelect.value || undefined : undefined,
    comboMode,
    finishWithNeedle: storedTemplate ? storedTemplate.finishWithNeedle === true : false,
    types: queuedTypes || $("#boss-types").value.trim() || undefined,
    maxCycles: DEFAULT_BOSS_LOOP_CYCLES,
    delayMs: Number($("#boss-delay").value || 0),
    openOnly: false,
    claimWhenReady: true,
    autoBuyKeysIfProfitable: ($("#boss-auto-buy-keys") ? $("#boss-auto-buy-keys").checked : false)
      || isAlwaysAutoBuyBossId(selectedBossId),
    autoRestoreMeleeCooldown: true,
    autoBuyMissingWeapons: Boolean(comboMode),
    keyPriceRubles: 0,
    dryRun: false,
  };
}

function formatVorkutaBoxOpenResult(result) {
  const rewards = result && result.rewards && typeof result.rewards === "object"
    ? Object.entries(result.rewards)
      .filter(([, amount]) => Number(amount) > 0)
      .map(([key, amount]) => `${formatNumber(amount)} ${CURRENCY_LABELS[key] || key}`)
    : [];
  const gear = Array.isArray(result && result.stashGearReward)
    ? result.stashGearReward.map((item) => item && (item.name || item.title)).filter(Boolean)
    : [];
  const parts = [];
  if (rewards.length > 0) parts.push(rewards.join(", "));
  if (gear.length > 0) parts.push(`вещи: ${gear.join(", ")}`);
  if (Number(result && result.hidesTotal) > 0) parts.push(`шкурки: ${formatNumber(result.hidesTotal)}`);
  parts.push(`ящиков осталось: ${formatNumber(result && result.vboxLeft || 0)}`);
  return parts.join(" · ");
}

async function handleVorkutaBoxOpen() {
  const button = $("#boss-vorkuta-box-btn");
  if (!button || button.disabled) return;
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "Открываю…";
  let keepDisabled = false;
  setServerStatus("opening Vorkuta box", "busy");
  try {
    const result = await apiRequest("POST", "/api/bosses/vorkuta-box/open", {});
    if (result.opened === false && result.reason === "no_vbox") {
      keepDisabled = true;
      button.textContent = "Ящик Воркуты · 0";
      button.title = "Ящики Воркуты закончились";
      appendLog("Ящик Воркуты", "Ящиков для открытия нет.", { source: "bosses" });
      setServerStatus("ready", "ok");
      return;
    }
    const summary = formatVorkutaBoxOpenResult(result);
    appendLog("Ящик Воркуты", summary, { source: "bosses" });
    button.textContent = `Ящик Воркуты · ${formatNumber(result.vboxLeft || 0)}`;
    await handleEconomyRefresh().catch(() => null);
    setServerStatus("ready", "ok");
  } catch (error) {
    button.textContent = previousText;
    appendLog("Ящик Воркуты", error.message || String(error), { source: "bosses", kind: "error" });
    appendDiagnosticError("bosses", error);
    setServerStatus("Vorkuta box error", "error");
  } finally {
    button.disabled = keepDisabled;
  }
}

async function handleBossDashboard(options = {}) {
  const silent = Boolean(options.silent);
  const showStatus = options.showStatus !== false;
  const fast = options.fast === true;
  if (fast && state.bossDashboardFullRequestPromise) {
    return state.bossDashboardFullRequestPromise;
  }
  const requestVersion = Number(state.bossDashboardRequestVersion || 0) + 1;
  state.bossDashboardRequestVersion = requestVersion;
  let dashboardRequest = null;
  if (showStatus) {
    setServerStatus("loading bosses", "busy");
  }
  try {
    const params = new URLSearchParams();
    // A selected mode belongs to one boss action. Sending it with a catalog
    // refresh makes the backend require that mode from every boss.
    if (options.fast === true) {
      params.set("fast", "1");
    }
    const query = params.toString();
    dashboardRequest = apiRequest(
      "GET",
      query ? `/api/bosses/dashboard?${query}` : "/api/bosses/dashboard",
    );
    if (!fast) {
      state.bossDashboardFullRequestPromise = dashboardRequest;
    }
    let payload = await dashboardRequest;
    if (payload.fast && state.bossDashboard && state.bossDashboard.rewards) {
      payload = {
        ...payload,
        rewards: state.bossDashboard.rewards,
      };
    }
    if (requestVersion < Number(state.bossDashboardAppliedRequestVersion || 0)) {
      return payload;
    }
    state.bossDashboardAppliedRequestVersion = requestVersion;
    renderBossDashboard(payload, { syncQueue: options.syncQueue === true });
    if (!silent) {
      appendLog("Boss dashboard refreshed");
    }
    if (showStatus) {
      setServerStatus("ready", "ok");
    }
    return payload;
  } catch (error) {
    if (showStatus) {
      setServerStatus("boss error", "error");
    }
    appendDiagnosticError("bosses", error);
  } finally {
    if (!fast && state.bossDashboardFullRequestPromise === dashboardRequest) {
      state.bossDashboardFullRequestPromise = null;
    }
  }
}

async function buyBossKeysForTarget(bossId, count, trigger) {
  if (!Number.isFinite(bossId) || bossId <= 0) {
    appendLog("Boss key buy skipped", "Invalid boss id");
    return;
  }

  const initialLabel = trigger.textContent || "Buy";
  trigger.disabled = true;
  trigger.textContent = "Buying...";
  setServerStatus(`buy keys #${bossId}`, "busy");

  try {
    const payload = await apiRequest("POST", "/api/bosses/buy-key", { bossId, count });
    const spent = formatSpentByCurrency(payload.spentByCurrency);
    appendLog(
      "Boss key buy",
      `#${bossId}: +${formatNumber(payload.purchasedKeys || 0)} keys${spent ? `, spent ${spent}` : ""}`,
    );
    await Promise.all([
      handleBossDashboard({ fast: true, silent: true, showStatus: false }),
      handleEconomyRefresh(),
    ]);
    updateBossSelectedKeyControls();
    setServerStatus("ready", "ok");
  } catch (error) {
    appendLog("Boss key buy failed", `#${bossId}: ${error.message || "error"}`);
    setServerStatus("buy-key error", "error");
    appendDiagnosticError("bosses", error);
  } finally {
    trigger.disabled = false;
    trigger.textContent = initialLabel;
  }
}

async function handleBossQueueBuyKeyClick(event) {
  const trigger = event && event.target && event.target.closest
    ? event.target.closest(".js-boss-buy-key")
    : null;
  if (!trigger) {
    return;
  }
  event.preventDefault();
  const bossId = Number(trigger.dataset.bossId || 0);
  const count = Math.max(1, Number(trigger.dataset.count || 1) || 1);
  await buyBossKeysForTarget(bossId, count, trigger);
}

async function handleSelectedBossKeyBuyClick() {
  const trigger = $("#boss-buy-selected-key-btn");
  if (!trigger || trigger.hidden) {
    return;
  }
  const bossId = Number(trigger.dataset.bossId || 0);
  const count = Math.max(1, Number(trigger.dataset.count || 1) || 1);
  await buyBossKeysForTarget(bossId, count, trigger);
}

function countBossComboHits(payload, requestPayload) {
  const cycles = Array.isArray(payload && payload.cycles) ? payload.cycles : [];
  const hitsFromPayload = cycles.reduce(
    (total, cycle) => total + (Array.isArray(cycle && cycle.hits) ? cycle.hits.length : 0),
    0,
  );
  if (hitsFromPayload > 0) {
    return hitsFromPayload;
  }

  const rawTypes = requestPayload && requestPayload.types ? requestPayload.types : "";
  if (Array.isArray(rawTypes)) {
    return rawTypes.map((item) => String(item || "").trim()).filter(Boolean).length;
  }

  return String(rawTypes)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .length;
}

function inferBossComboSuccess(payload, requestPayload) {
  const expectedHits = countBossComboHits(payload, requestPayload);
  if (expectedHits <= 0) {
    return null;
  }

  const cycles = Array.isArray(payload && payload.cycles) ? payload.cycles : [];
  const hits = cycles.flatMap((cycle) => (Array.isArray(cycle && cycle.hits) ? cycle.hits : []));
  if (hits.length < expectedHits) {
    return false;
  }

  return hits.every((hit) => hit && hit.ok !== false);
}

function isBossComboHitRequest(path, requestPayload = {}) {
  return (
    (path === "/api/bosses/hit" || path === "/api/bosses/loop")
    && Boolean(normalizeBossComboMode(requestPayload.comboMode))
  );
}

function calculateBossComboRubles(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const hits = (Array.isArray(payload.cycles) ? payload.cycles : [])
    .flatMap((cycle) => (Array.isArray(cycle && cycle.hits) ? cycle.hits : []));
  if (hits.length === 0) {
    return null;
  }
  let weaponRubles = 0;
  let estimatedPurchases = false;
  for (const hit of hits) {
    const purchase = hit && hit.purchase;
    if (!purchase || !purchase.attempted || !purchase.ok) {
      continue;
    }
    const weaponType = String(purchase.weaponType || hit.type || "").trim();
    const unitPrice = Number(BOSS_FIXED_PRICES[weaponType] || 0);
    const count = Math.max(0, Number(purchase.count || 0));
    const explicitSpent = purchase.spent === null || purchase.spent === undefined
      ? null
      : Number(purchase.spent);
    const hasExplicitSpent = explicitSpent !== null
      && Number.isFinite(explicitSpent)
      && explicitSpent >= 0;
    weaponRubles += hasExplicitSpent
      ? explicitSpent
      : unitPrice * count;
    estimatedPurchases = estimatedPurchases || !hasExplicitSpent;
  }

  const restore = payload.restore && typeof payload.restore === "object" ? payload.restore : {};
  const spentByCurrency = restore.spentByCurrency && typeof restore.spentByCurrency === "object"
    ? restore.spentByCurrency
    : {};
  const currencyEntries = Object.entries(spentByCurrency);
  const explicitRestoreRubles = currencyEntries
    .filter(([currency]) => ["rubles", "ruble", "rub", "money"].includes(String(currency).toLowerCase()))
    .reduce((sum, [, value]) => sum + Math.max(0, Number(value || 0)), 0);
  const usedRestoreFallback = currencyEntries.length === 0 && Number(restore.succeeded || 0) > 0;
  const restoreRubles = usedRestoreFallback
    ? Math.max(0, Number(restore.succeeded || 0)) * BOSS_FIXED_PRICES.restoreMelee
    : explicitRestoreRubles;

  return {
    totalRubles: weaponRubles + restoreRubles,
    weaponRubles,
    restoreRubles,
    estimated: usedRestoreFallback || estimatedPurchases,
  };
}

function addBossComboEconomyResource(target, key, value) {
  const normalizedKey = String(key || "").trim().toLowerCase();
  const numeric = Number(value);
  if (!normalizedKey || !Number.isFinite(numeric) || numeric === 0) {
    return;
  }
  const resolvedKey = ["ruble", "rub", "money"].includes(normalizedKey)
    ? "rubles"
    : normalizedKey;
  target[resolvedKey] = (target[resolvedKey] || 0) + numeric;
}

function compactBossComboEconomyResources(resources) {
  return Object.fromEntries(
    Object.entries(resources || {})
      .filter(([, value]) => Number.isFinite(Number(value)) && Number(value) !== 0)
      .map(([key, value]) => [key, Number(value)]),
  );
}

function subtractBossComboEconomyResources(rewards, costs) {
  const result = {};
  for (const key of new Set([...Object.keys(rewards || {}), ...Object.keys(costs || {})])) {
    const value = Number(rewards && rewards[key] || 0) - Number(costs && costs[key] || 0);
    if (Number.isFinite(value) && value !== 0) {
      result[key] = value;
    }
  }
  return result;
}

function calculateBossComboEconomy(payload) {
  if (payload && payload.comboEconomy && payload.comboEconomy.measured) {
    return payload.comboEconomy;
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const hits = (Array.isArray(payload.cycles) ? payload.cycles : [])
    .flatMap((cycle) => (Array.isArray(cycle && cycle.hits) ? cycle.hits : []));
  if (hits.length === 0) {
    return null;
  }

  const weaponCosts = {};
  const weaponRewards = {};
  const currencyRewards = {};
  let hasComboReward = false;
  for (const hit of hits) {
    const weaponType = String(hit && hit.type || "").trim().toLowerCase();
    if (hit && hit.ok !== false && BOSS_WEAPON_ACTION_KEYS.has(weaponType)) {
      addBossComboEconomyResource(
        weaponCosts,
        weaponType,
        Math.max(1, Math.floor(Number(hit.payload && hit.payload.count || 1) || 1)),
      );
    }

    const reward = hit && hit.comboReward;
    if (!reward || typeof reward !== "object") {
      continue;
    }
    hasComboReward = true;
    for (const weapon of Array.isArray(reward.weapons) ? reward.weapons : []) {
      addBossComboEconomyResource(
        weaponRewards,
        weapon && (weapon.type || weapon.weaponType),
        weapon && weapon.amount,
      );
    }
    for (const currency of Array.isArray(reward.currencies) ? reward.currencies : []) {
      addBossComboEconomyResource(
        currencyRewards,
        currency && (currency.type || currency.currency || currency.name),
        currency && currency.amount,
      );
    }
    addBossComboEconomyResource(currencyRewards, "authority", reward.authority);
    addBossComboEconomyResource(currencyRewards, "keys", reward.keys);
  }

  const rubles = calculateBossComboRubles(payload);
  const currencyCosts = rubles && rubles.totalRubles > 0
    ? { rubles: rubles.totalRubles }
    : {};
  const costs = {
    weapons: compactBossComboEconomyResources(weaponCosts),
    currencies: compactBossComboEconomyResources(currencyCosts),
  };
  const rewards = {
    weapons: compactBossComboEconomyResources(weaponRewards),
    currencies: compactBossComboEconomyResources(currencyRewards),
  };
  return {
    measured: true,
    hasComboReward,
    costs,
    rewards,
    net: {
      weapons: subtractBossComboEconomyResources(rewards.weapons, costs.weapons),
      currencies: subtractBossComboEconomyResources(rewards.currencies, costs.currencies),
    },
    purchases: {},
    rubles: {
      total: rubles ? rubles.totalRubles : 0,
      purchases: rubles ? rubles.weaponRubles : 0,
      cooldowns: rubles ? rubles.restoreRubles : 0,
    },
    estimated: Boolean(rubles && rubles.estimated),
  };
}

function attachBossComboCost(payload, requestPayload) {
  if (!payload || !requestPayload || !normalizeBossComboMode(requestPayload.comboMode)) {
    return null;
  }
  const economy = calculateBossComboEconomy(payload);
  const summary = calculateBossComboRubles(payload);
  if (!summary && !economy) {
    return null;
  }
  const totalRubles = economy && economy.rubles
    ? Number(economy.rubles.total || 0)
    : summary.totalRubles;
  const estimated = economy ? Boolean(economy.estimated) : summary.estimated;
  payload.comboEconomy = economy;
  payload.comboCostRubles = totalRubles;
  payload.comboCostEstimated = estimated;
  return {
    ...(summary || {}),
    totalRubles,
    estimated,
    economy,
  };
}

function logBossComboDuration(options = {}) {
  const payload = options.payload || null;
  const requestPayload = options.requestPayload || null;
  if (!payload || payload.dryRun) {
    return;
  }

  const hitCount = countBossComboHits(payload, requestPayload);
  if (hitCount <= 0) {
    return;
  }

  const bossId = Number(options.bossId || (requestPayload && requestPayload.bossId) || 0);
  const prefix = bossId > 0 ? `#${bossId}` : "boss";
  const label = options.label ? `, ${options.label}` : "";
  const elapsedMs = payload && payload.comboTiming && payload.comboTiming.elapsedMs !== undefined
    ? payload.comboTiming.elapsedMs
    : payload && payload.timing && payload.timing.comboElapsedMs !== undefined
      ? payload.timing.comboElapsedMs
      : options.elapsedMs !== undefined
        ? options.elapsedMs
        : payload.elapsedMs;
  const totalElapsedMs = payload && payload.timing && payload.timing.automationElapsedMs !== undefined
    ? payload.timing.automationElapsedMs
    : options.elapsedMs !== undefined
      ? options.elapsedMs
      : payload.elapsedMs;
  const finisherElapsedMs = payload && payload.soloFinisher
    ? payload.soloFinisher.elapsedMs
    : null;
  const finisherSuffix = Number.isFinite(Number(finisherElapsedMs)) && Number(finisherElapsedMs) > 0
    ? ` | добивание ${formatDurationMs(finisherElapsedMs)}`
    : "";
  const totalSuffix = Number.isFinite(Number(totalElapsedMs))
    && Number(totalElapsedMs) > Number(elapsedMs || 0) + 50
    ? ` | весь цикл ${formatDurationMs(totalElapsedMs)}`
    : "";
  const weaponSuffix = payload.weaponDelta && payload.weaponDelta.measured
    ? ` | ${formatBossWeaponDeltaSummary(payload.weaponDelta)}`
    : "";
  const economy = payload.comboEconomy && payload.comboEconomy.measured
    ? payload.comboEconomy
    : calculateBossComboEconomy(payload);
  const costSuffix = Number.isFinite(Number(payload.comboCostRubles))
    ? ` | комбо: ${formatNumber(payload.comboCostRubles)} руб.${payload.comboCostEstimated ? " (оценка)" : ""}`
    : "";
  appendLog(
    "Boss combo done",
    `${prefix}: ${formatNumber(hitCount)} ударов, комбо ${formatDurationMs(elapsedMs)}${finisherSuffix}${totalSuffix}${label}${costSuffix}${weaponSuffix}`,
    {
      source: "bosses",
      kind: "reward",
      bossActivity: {
        comboEconomy: economy,
        comboRewards: getBossComboRewardsForDisplay(payload),
      },
    },
  );
}

function normalizeBossHitActionOptions(path, options) {
  if (path !== "/api/bosses/hit" && path !== "/api/bosses/loop") {
    return options;
  }

  const context = resolveBossLiveContext();
  if (!context || !context.activeSession) {
    return options;
  }

  const activeBossId = pickBossLiveNumber(
    context.activeSession.bossId,
    context.activeBoss ? context.activeBoss.id : null,
    context.summary ? context.summary.bossId : null,
  );
  if (activeBossId === null) {
    return options;
  }

  const activeMode = pickBossLiveString(
    context.mode,
    context.activeSession.mode,
    context.summary ? context.summary.mode : null,
  );

  return {
    ...options,
    bossId: activeBossId,
    mode: activeMode || options.mode,
    comboMode: context.comboMode || undefined,
  };
}

async function handleBossAction(path) {
  const options = normalizeBossHitActionOptions(path, collectBossOptions());
  if (path === "/api/bosses/start") {
    const candidate = getBossQueueCandidateMap().get(Number(options.bossId || 0)) || null;
    const preferredTemplateComboMode = getPreferredBossComboTemplateMode(candidate);
    if (preferredTemplateComboMode) {
      options.comboMode = preferredTemplateComboMode;
    }
    if (offerBossComboSetup({
      bossId: options.bossId,
      comboMode: options.comboMode || "",
      label: candidate ? `#${candidate.id} ${candidate.title}` : `#${options.bossId}`,
    }, candidate)) {
      return;
    }
  }
  const actionName = path.split("/").pop();
  setServerStatus(options.dryRun ? `${actionName} preview` : `boss ${actionName}`, "busy");
  try {
    const startedAt = performance.now();
    const payload = await apiRequest("POST", path, options);
    const elapsedMs = performance.now() - startedAt;
    const comboCost = attachBossComboCost(payload, options);
    const startSummary = payload && payload.snapshot && payload.snapshot.summary
      ? payload.snapshot.summary
      : {};
    const startedBossId = Number(startSummary.bossId || options.bossId || 0);
    if (!options.dryRun && path === "/api/bosses/start") {
      clearBossFightRuntimeState({ clearComboResult: true });
      rememberBossFightMeta({
        bossId: startedBossId,
        mode: startSummary.mode || options.mode,
        comboMode: options.comboMode,
        sessionId: startSummary.sessionId,
        endsAt: startSummary.endsAt,
      });
      const timing = payload && payload.timing ? payload.timing : {};
      const operationElapsedMs = timing.elapsedMs !== null && timing.elapsedMs !== undefined
        ? timing.elapsedMs
        : elapsedMs;
      const requestElapsedMs = timing.startRequestElapsedMs;
      appendLog(
        `Босс #${startedBossId || options.bossId || "?"} запущен`,
        `запуск ${formatDurationMs(operationElapsedMs)}` +
          `${requestElapsedMs !== null && requestElapsedMs !== undefined ? ` · API ${formatDurationMs(requestElapsedMs)}` : ""}`,
      );
    }
    renderBossResult(payload);
    appendBossClaimRewardLog(payload, { bossId: startedBossId || options.bossId || null });
    scheduleBossRewardSettlementLogRefresh(payload);
    await Promise.all([
      handleBossDashboard({ fast: true, silent: true, showStatus: false }),
      handleBossStateRefresh({ silent: true, showStatus: false }),
      handleEconomyRefresh(),
    ]);
    if (!options.dryRun && path === "/api/bosses/start") {
      if (startedBossId > 0) {
        await runBossHitQueueAfterStart({
          bossId: startedBossId,
          mode: options.mode,
          comboMode: options.comboMode,
        });
      }
    }
    if (
      !options.dryRun
      && path !== "/api/bosses/start"
      && state.bossAuto.autoStartNext
      && state.bossRunQueue.length > 0
      && state.bossState
      && state.bossState.snapshot
      && state.bossState.snapshot.summary
      && !state.bossState.snapshot.summary.hasSession
    ) {
      const nextStarted = await startNextBossFromQueue({ silent: true });
      if (nextStarted && nextStarted.started) {
        appendLog("Boss auto next", "Следующий босс из очереди запущен");
      }
    }
    if (path === "/api/bosses/hit" || path === "/api/bosses/loop") {
      const comboSuccess = inferBossComboSuccess(payload, options);
      updateBossFightComboSuccess({
        bossId: options.bossId,
        mode: options.mode,
        comboMode: options.comboMode || state.bossFightMeta.comboMode,
        comboSuccess,
        comboCostRubles: comboCost ? comboCost.totalRubles : null,
      });
      logBossComboDuration({
        payload,
        requestPayload: options,
        elapsedMs,
        bossId: options.bossId,
        label: actionName,
      });
    }
    appendLog(`Boss ${actionName}`, payload.dryRun ? "dry-run" : "ok");
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("boss action error", "error");
    appendDiagnosticError("bosses", error);
  }
}

async function bootstrap() {
  initializeInitialLoader();
  updateInitialLoadProgress(5, "Подготавливаем интерфейс…", "Восстанавливаем настройки и локальные данные.");
  initializeRussianUi();
  initializeDrawerNavigation();
  initializeJournalDrawer();
  initializeCollapsibleCards();
  initializeHeaderTrendSwitch();
  initializeResourceDashboard();
  initializeAboutSponsors();
  bindTabs();
  initializeBossVisibilitySync();
  initializeMiscSectionDropdown();
  initializeFriendsSectionDropdown();
  initializePageLoading();
  populateSourcePicks();
  updateFriendsActionNote();
  renderFriendsActionSummary();
  renderFriendsBatchProgress();
  renderFriendsDamage();
  startBossCountdownTicker();
  renderBossFightBars();
  renderBossLiveSummary();
  const comboLoad = loadBossComboTemplates();
  scheduleBossComboMidnightReset();
  if (comboLoad.resetByDate) {
    appendLog("Boss combo templates reset", `${state.bossComboDateKey} MSK`);
  } else if (comboLoad.loaded > 0) {
    appendLog("Boss combo templates loaded", formatNumber(comboLoad.loaded));
  }
  const queueLoad = loadBossRunQueue();
  loadBossRunQueuePresets();
  if (queueLoad.resetByDate) {
    appendLog("Boss run queue reset", `${state.bossRunQueueDateKey} MSK`);
  } else if (queueLoad.loaded > 0) {
    appendLog("Boss run queue loaded", formatNumber(queueLoad.loaded));
  }
  const excludeTemplateLoad = loadBossExcludeTemplates();
  if (excludeTemplateLoad.loaded > 0) {
    appendLog("Boss exclusion templates loaded", formatNumber(excludeTemplateLoad.loaded));
  }
  loadBossSmartQueueCollectionPreference();
  loadBossQueueSettings();
  populateBossExcludeTemplateSelect();
  renderBossRunQueue();
  populateBossComboDialogBossSelect();
  populateBossComboDialogModeSelect();
  refreshBossComboDialogMeta({ fillTextarea: false });

  bindAuthMethodTabs();

  $("#auth-status-btn").addEventListener("click", () => handleAuthPanelRefresh());
  $("#auth-account-select")?.addEventListener("change", updateSavedAuthAccountSwitchButtons);
  $("#auth-switch-saved-btn")?.addEventListener("click", () => handleSavedAuthAccountSwitch());
  $("#auth-login-btn").addEventListener("click", () => handleAuthLogin());
  $("#auth-token-login-btn")?.addEventListener("click", () => handleTokenAuthLogin());
  $("#auth-gate-status-btn")?.addEventListener("click", () => handleAuthStatusRefresh());
  $("#auth-gate-account-select")?.addEventListener("change", updateSavedAuthAccountSwitchButtons);
  $("#auth-gate-switch-saved-btn")?.addEventListener("click", () => handleSavedAuthAccountSwitch({ gate: true }));
  $("#auth-gate-login-btn")?.addEventListener("click", () => handleAuthLogin());
  $("#auth-gate-token-login-btn")?.addEventListener("click", () => handleTokenAuthLogin());
  $("#server-shutdown-btn")?.addEventListener("click", handleServerShutdown);

  $("#friends-collect-btn").addEventListener("click", handleFriendsCollect);
  $("#friends-invite-btn").addEventListener("click", handleFriendsInvites);
  $("#friends-accept-btn").addEventListener("click", handleFriendsAccept);
  $("#friends-cleanup-btn").addEventListener("click", handleFriendsCleanup);
  $("#friends-summary-refresh-btn").addEventListener("click", () => refreshFriendsSummary());
  $("#friends-action-btn").addEventListener("click", handleFriendsAction);
  $("#friends-action-type").addEventListener("change", updateFriendsActionNote);
  $("#friends-damage-refresh-btn").addEventListener("click", () => handleFriendsDamageRefresh());
  $("#friends-damage-scope").addEventListener("click", handleFriendsDamageScopeClick);
  $("#friends-damage-panels").addEventListener("click", handleFriendsDamagePanelClick);
  $("#friends-auto-accept").addEventListener("change", handleFriendsAutoAcceptToggle);

  $("#prison-status-btn").addEventListener("click", async () => {
    await handlePrisonStatus({ syncControls: false });
  });
  $("#prison-save-btn").addEventListener("click", handlePrisonAutomationSave);
  $("#prison-tick-btn").addEventListener("click", handlePrisonAutomationTick);
  $("#prison-dry-btn").addEventListener("click", () => handlePrisonRun(true));
  $("#prison-run-btn").addEventListener("click", () => handlePrisonRun(false));
  $("#prison-profit-collect-btn").addEventListener("click", () => handlePrisonMaintenanceAction("profit"));
  $("#prison-target-type").addEventListener("change", handlePrisonTargetChange);
  $("#prison-select").addEventListener("change", handlePrisonTargetChange);
  $("#prison-mode").addEventListener("change", () => renderPrisonAutomationProgress());
  $("#prison-queue-goal")?.addEventListener("change", syncPrisonQueueGoalControls);
  $("#prison-zone-grid").addEventListener("click", handlePrisonZoneGridClick);
  $("#prison-master-grid").addEventListener("click", handlePrisonZoneGridClick);
  $("#prison-queue-add")?.addEventListener("click", handlePrisonQueueAdd);
  $("#prison-queue-list")?.addEventListener("click", handlePrisonQueueClick);

  $("#zaruba-refresh-btn")?.addEventListener("click", () => handleZarubaDashboard());
  $("#zaruba-save-btn")?.addEventListener("click", handleZarubaAutomationSave);
  $("#zaruba-auto-enabled")?.addEventListener("change", handleZarubaAutomationSave);
  $("#zaruba-auto-start")?.addEventListener("change", handleZarubaAutomationSave);
  for (const id of ["#zaruba-policy-controls", "#monthly-policy-controls"]) {
    $(id)?.addEventListener("input", () => {
      $(id).dataset.dirty = "true";
      $(id).dataset.revision = String(Number($(id).dataset.revision || 0) + 1);
    });
  }
  $("#zaruba-boss-rule-add")?.addEventListener("click", () => {
    try {
      const rules = readZarubaBossRules();
      if (rules.length >= 50) return;
      renderZarubaBossRules([...rules, { bossId: 0, objective: "any", mode: "pacansky", maxWeaponValue: null }]);
      $("#zaruba-policy-controls").dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      $("#zaruba-last-action").textContent = error.message;
    }
  });
  $("#zaruba-boss-rules")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-boss-rule-remove]")) return;
    event.target.closest("[data-boss-rule]")?.remove();
    $("#zaruba-policy-controls").dispatchEvent(new Event("input", { bubbles: true }));
  });
  $("#monthly-policy-save")?.addEventListener("click", saveMonthlyPolicy);
  $("#zaruba-mode-select")?.addEventListener("change", (event) => {
    void handleZarubaModeSelect(event.target.value);
  });
  $("#zaruba-bags-link")?.addEventListener("click", openBagsTab);
  $("#zaruba-modes")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zaruba-mode]");
    if (!button) return;
    void handleZarubaModeSelect(button.dataset.zarubaMode);
  });
  $("#zaruba-task")?.addEventListener("click", (event) => {
    const skipButton = event.target.closest("[data-zaruba-skip]");
    if (skipButton) { void handleZarubaSkip(skipButton); return; }
    const taskButton = event.target.closest("[data-zaruba-boss-queue-task]");
    const allButton = event.target.closest("[data-zaruba-boss-queue-all]");
    if (taskButton) {
      void handleZarubaBossQueueBuild(taskButton.dataset.zarubaBossQueueTask || null);
    } else if (allButton) {
      void handleZarubaBossQueueBuild(null);
    }
  });
  $(".zaruba-action-buttons")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-zaruba-action]");
    if (button) void handleZarubaAction(button.dataset.zarubaAction);
  });

  $("#misc-monthly-auto").addEventListener("change", handleMiscAutomationToggle);
  $("#misc-monthly-calendar").addEventListener("click", handleMonthlyDayPurchase);
  $("#misc-monthly-run-btn").addEventListener("click", handleMiscAutomationTick);
  $("#misc-vparit-all-btn").addEventListener("click", handleVparitAll);
  $("#bags-refresh")?.addEventListener("click", () => handleBagsDashboard());
  $("#bags-family-switch")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bags-family]");
    if (!button || button.disabled || !state.bagsDashboard) return;
    state.bagsFamily = button.dataset.bagsFamily;
    renderBagsDashboard(state.bagsDashboard);
  });
  $("#bags-zaruba-mode-switch")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bags-mode]");
    if (!button || !state.bagsDashboard) return;
    state.bagsZarubaMode = button.dataset.bagsMode;
    renderBagsDashboard(state.bagsDashboard);
  });
  $("#bags-list")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bag-open]");
    if (button) void handleBagOpen(button);
  });
  $("#bags-summary")?.addEventListener("click", (event) => {
    if (event.target.closest("#bags-forge-button")) void handleBagOreExchange();
  });
  $("#bags-last-reward")?.addEventListener("click", (event) => {
    if (!event.target.closest("[data-bags-reward-close]")) return;
    state.bagsLastReward = null;
    renderBagReward();
  });
  $("#loot-containers-refresh")?.addEventListener("click", () => handleLootContainersDashboard({ rebuild: true }));
  $("#loot-parcel-open")?.addEventListener("click", () => handleLootContainerOpen("parcel"));
  $("#loot-baul-open")?.addEventListener("click", () => handleLootContainerOpen("baul"));
  $("#baul-auto-save")?.addEventListener("click", handleBaulAutomationSave);
  $("#loot-baul-allow-early")?.addEventListener("change", () => {
    if (state.lootContainersDashboard) {
      renderLootContainersDashboard(state.lootContainersDashboard);
    }
  });
  $("#misc-games-grid").addEventListener("click", handleMiscGameClick);
  $("#misc-games-grid").addEventListener("change", handleFartovyAutoSpinChange);
  $("#wearable-collection-refresh")?.addEventListener("click", () => handleWearableCollectionDashboard({ forceRefresh: true }));
  $("#wearable-collection-search")?.addEventListener("input", scheduleWearableCollectionRender);
  $("#wearable-collection-bonus-filter")?.addEventListener("change", scheduleWearableCollectionRender);
  $("#wearable-collection-status-filter")?.addEventListener("change", scheduleWearableCollectionRender);
  $("#wearable-collection-category-nav")?.addEventListener("click", handleWearableCollectionCategoryNavClick);
  $(".collection-kind-switch")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-collection-kind]");
    if (!button) return;
    state.wearableCollectionKindFilter = button.dataset.collectionKind || "all";
    document.querySelectorAll("[data-collection-kind]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
    });
    scheduleWearableCollectionRender();
  });
  $("#wearable-collection-categories")?.addEventListener("toggle", (event) => {
    if (event.target.matches("[data-collection-group-key]")) {
      renderWearableCollectionGroupDetail(event.target);
    }
  }, true);

  $("#lets-cook-refresh-btn").addEventListener("click", () => handleLetsCookDashboard());
  $("#lets-cook-save-btn").addEventListener("click", handleLetsCookSave);
  $("#lets-cook-tick-btn").addEventListener("click", handleLetsCookTick);
  $("#lets-cook-auto").addEventListener("change", handleLetsCookSave);
  $("#lets-cook-role").addEventListener("change", () => {
    const payload = state.letsCookDashboard || {};
    updateLetsCookRoleControls(payload.automation?.settings || {}, payload.state || {}, payload.strategy || {});
  });

  $("#boss-refresh-btn").addEventListener("click", handleBossDashboard);
  $("#boss-vorkuta-box-btn")?.addEventListener("click", handleVorkutaBoxOpen);
  $("#boss-reward-select")?.addEventListener("change", () => {
    state.bossRewardBossId = Number($("#boss-reward-select").value || 0);
    if (state.bossDashboard) {
      renderBossRewards(state.bossDashboard.rewards);
    }
  });
  $("#boss-state-btn").addEventListener("click", handleBossStateRefresh);
  $("#boss-category").addEventListener("change", () => {
    populateBossSelect();
    if (state.bossDashboard) {
      renderBossDashboard(state.bossDashboard);
    }
    persistBossQueueSettings();
  });
  $("#boss-catalog-category-nav")?.addEventListener("click", handleBossCatalogCategoryNavClick);
  $("#boss-catalog-status-filter")?.addEventListener("change", () => {
    if (state.bossDashboard) {
      renderBossCatalog(state.bossDashboard);
    }
  });
  $("#boss-select").addEventListener("change", () => {
    populateBossModeSelect();
    populateBossComboDialogBossSelect({ preferredBossId: $("#boss-select").value });
    populateBossComboDialogModeSelect();
    updateBossSelectedKeyControls();
    refreshBossComboDialogMeta({ fillTextarea: false });
    applyStoredComboTemplateForMainSelection({ silent: true });
    if (state.bossDashboard) {
      renderBossDashboard(state.bossDashboard);
    }
    persistBossQueueSettings();
  });
  $("#boss-mode").addEventListener("change", () => {
    populateBossComboModeSelect();
    populateBossComboDialogModeSelect();
    refreshBossComboDialogMeta({ fillTextarea: false });
    applyStoredComboTemplateForMainSelection({ silent: true });
    if (state.bossDashboard) {
      renderBossDashboard(state.bossDashboard);
    }
    persistBossQueueSettings();
  });
  $("#boss-combo-mode").addEventListener("change", () => {
    populateBossComboDialogModeSelect({ preferredMode: $("#boss-combo-mode").value });
    updateBossComboInlineButtonState();
    refreshBossComboDialogMeta({ fillTextarea: false });
    applyStoredComboTemplateForMainSelection({ silent: true });
    renderSelectedBossCollectionCounters();
    renderBossRunQueue();
    persistBossQueueSettings();
  });
  $("#boss-combo-open-btn").addEventListener("click", openBossComboDialogForCurrentSelection);
  $("#boss-combo-inline-btn")?.addEventListener("click", openBossComboDialogForCurrentSelection);
  $("#boss-combo-template-close").addEventListener("click", closeBossComboDialog);
  $("#boss-combo-template-save").addEventListener("click", handleBossComboDialogSave);
  $("#boss-combo-template-load").addEventListener("click", handleBossComboDialogLoad);
  $("#boss-combo-template-delete").addEventListener("click", handleBossComboDialogDelete);
  $("#boss-combo-template-boss").addEventListener("change", () => {
    populateBossComboDialogModeSelect();
    refreshBossComboDialogMeta({ fillTextarea: true });
  });
  $("#boss-combo-template-mode").addEventListener("change", () => {
    refreshBossComboDialogMeta({ fillTextarea: true });
  });
  $("#boss-combo-dialog").addEventListener("cancel", (event) => {
    event.preventDefault();
    closeBossComboDialog();
  });
  $("#boss-run-queue-add").addEventListener("click", handleBossRunQueueAdd);
  $("#boss-run-source-apply")?.addEventListener("click", handleBossQueueSourceApply);
  $("#boss-run-queue-clear").addEventListener("click", handleBossRunQueueClear);
  $("#boss-run-preset-save")?.addEventListener("click", handleBossRunPresetSave);
  $("#boss-run-preset-delete")?.addEventListener("click", handleBossRunPresetDelete);
  $("#boss-run-queue-smart-collection")?.addEventListener("change", handleBossSmartQueueCollectionChange);
  $("#boss-auto-queue-apply-selected")?.addEventListener("click", applyBossAutoQueueRulesToSelected);
  for (const id of ["boss-auto-kill-solo", "boss-use-combo", "boss-auto-queue-kill-solo", "boss-auto-queue-use-combo", "boss-auto-queue-combo-mode"]) {
    $(`#${id}`)?.addEventListener("change", id === "boss-use-combo" || id === "boss-auto-queue-use-combo"
      ? handleBossQueueComboSettingChange
      : () => { persistBossQueueSettings(); renderBossRunQueueExcludeList(); renderBossRunQueue(); });
  }
  $("#boss-auto-buy-keys")?.addEventListener("change", persistBossQueueSettings);
  $("#boss-delay")?.addEventListener("change", persistBossQueueSettings);
  $("#boss-queue-settings")?.addEventListener("toggle", persistBossQueueSettings);
  $("#boss-run-queue-exclude-panel")?.addEventListener("toggle", persistBossQueueSettings);
  const bossRunQueueBody = $("#boss-run-queue-body");
  bossRunQueueBody.addEventListener("click", handleBossRunQueueRemoveClick);
  bossRunQueueBody.addEventListener("change", handleBossRunQueueModeChange);
  bossRunQueueBody.addEventListener("change", handleBossRunQueueComboChange);
  bossRunQueueBody.addEventListener("change", handleBossRunQueueAutoKillSoloChange);
  bossRunQueueBody.addEventListener("dragstart", handleBossRunQueueDragStart);
  bossRunQueueBody.addEventListener("dragover", handleBossRunQueueDragOver);
  bossRunQueueBody.addEventListener("drop", handleBossRunQueueDrop);
  bossRunQueueBody.addEventListener("dragend", clearBossRunQueueDragState);
  $("#boss-run-queue-exclude-list").addEventListener("change", handleBossRunQueueExcludeChange);
  $("#boss-run-queue-exclude-actions").addEventListener("click", handleBossRunQueueExcludeActionClick);
  $(".boss-exclude-template-row")?.addEventListener("click", handleBossRunQueueExcludeActionClick);
  $("#boss-exclude-template-select")?.addEventListener("change", handleBossExcludeTemplateSelectChange);
  $("#boss-exclude-template-name")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleBossExcludeTemplateSave();
    }
  });
  $("#boss-run-next-btn").addEventListener("click", () => startNextBossFromQueue());
  $("#boss-auto-refresh").addEventListener("change", handleBossAutoRefreshToggle);
  $("#boss-auto-interval").addEventListener("change", handleBossAutoIntervalChange);
  $("#boss-auto-start-next").addEventListener("change", handleBossAutoStartNextChange);
  $("#boss-start-btn").addEventListener("click", () => handleBossAction("/api/bosses/start"));
  $("#boss-surrender-btn")?.addEventListener("click", handleBossSurrender);
  $("#boss-needle-btn")?.addEventListener("click", handleBossNeedleHit);
  $("#boss-buy-selected-key-btn").addEventListener("click", handleSelectedBossKeyBuyClick);
  $("#boss-hit-btn").addEventListener("click", () => handleBossAction("/api/bosses/hit"));
  $("#boss-queue-add").addEventListener("click", handleBossQueueAdd);
  $("#boss-queue-clear").addEventListener("click", handleBossQueueClear);
  $("#boss-attack-body")?.addEventListener("click", handleBossAttackQueueClick);
  $("#boss-attack-plan-open-btn")?.addEventListener("click", openBossAttackPlanDialog);
  $("#boss-attack-plan-close-btn")?.addEventListener("click", closeBossAttackPlanDialog);
  $("#boss-attack-plan-dialog")?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeBossAttackPlanDialog();
  });
  $("#boss-attack-plan-dialog")?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeBossAttackPlanDialog();
    }
  });
  $("#boss-attack-plan-dialog")?.addEventListener("close", () => {
    $("#boss-attack-plan-open-btn")?.setAttribute("aria-expanded", "false");
  });
  $("#boss-attack-plan-dialog")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeBossAttackPlanDialog();
    }
  });
  $("#boss-actions-body")?.addEventListener("click", handleBossWeaponPanelClick);
  $("#damage-calculator-open-btn")?.addEventListener("click", openDamageCalculatorDialog);
  $("#damage-calculator-close-btn")?.addEventListener("click", closeDamageCalculatorDialog);
  $("#damage-calculator-dialog")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeDamageCalculatorDialog();
      return;
    }
    handleDamageCalculatorClick(event);
  });
  $("#damage-calculator-dialog")?.addEventListener("input", (event) => {
    if (event.target.matches("input[type='number']")) {
      renderDamageCalculatorResult();
    }
  });
  $("#damage-calculator-dialog")?.addEventListener("change", handleDamageCalculatorChange);
  $("#talent-calculator-refresh")?.addEventListener("click", handleTalentCalculator);
  $("#boss-queue-body")?.addEventListener("click", handleBossQueueBuyKeyClick);
  $("#boss-attack-count")?.addEventListener("input", renderBossAttackQueue);
  renderBossRunQueueExcludeList();

  updateInitialLoadProgress(14, "Проверяем подключение…", "Получаем сведения локального сервера.");
  try {
    const meta = await apiRequest("GET", "/api/meta");
    state.interactionTypes = meta.interactionTypes || [];
    renderInteractionTypes();
    setServerStatus("ready", "ok");
  } catch (error) {
    setServerStatus("meta error", "error");
    throw error;
  }

  updateInitialLoadProgress(24, "Проверяем сессию…", "Подтверждаем доступ к игровым данным.");
  let authStatus = null;
  try {
    authStatus = await handleAuthStatusRefresh({ silent: true, showStatus: false });
  } catch (error) {
    appendLog("Не удалось заранее проверить авторизацию", error.message || "ошибка");
  }
  authStatus = await restoreStoredAuth(authStatus);
  try {
    await handleSavedAuthAccountsRefresh({ silent: true });
  } catch (error) {
    appendLog("Не удалось загрузить сохранённые аккаунты", error.message || "ошибка");
  }
  if (!isAuthStatusActive(authStatus)) {
    showAuthGate(authStatus);
    return;
  }

  activateAccountScopedUiStorage(
    authStatus && authStatus.auth && authStatus.auth.selfUserId
      ? authStatus.auth.selfUserId
      : authStatus && authStatus.selfUserId,
  );
  state.pageLoadingEnabled = true;
  ensurePageLoadSurfaces();
  setServerStatus("Загрузка данных", "busy");
  const startupFailures = [];
  const runStartupTask = async (task) => {
    try {
      return await task.run();
    } catch (error) {
      const reason = error && error.message ? error.message : String(error);
      startupFailures.push({ name: task.name, reason });
      const userReason = formatUserFacingError(error);
      if (userReason) {
        appendLog(`Не загрузилось: ${task.name}`, userReason, {
          kind: "error",
          important: true,
        });
      }
      return null;
    }
  };
  updateInitialLoadProgress(38, "Загружаем показатели…", "Кошелёк и данные шапки.");
  void runStartupTask({ name: "статистика в шапке", run: () => handleHeaderExtrasRefresh() });
  await runStartupTask({ name: "экономика", run: () => handleEconomyRefresh() });
  $(".hero")?.classList.remove("is-data-loading");

  updateInitialLoadProgress(64, "Загружаем раздел «Боссы»…", "Каталог, оружие и активный бой.");
  await ensurePageLoaded("bosses", { allowBeforeReady: true }).catch(() => null);
  renderBossAutomationActivity();
  renderLog();
  finishInitialLoad();
  startEconomySync(15000);
  startHeaderExtrasSync(60_000);
  startZarubaSync();
  startBagsSync();
  startPagePrefetch();

  const activePageFailed = getPageLoadEntry("bosses").status === "error";
  if (startupFailures.length > 0 || activePageFailed) {
    setServerStatus("Часть данных недоступна", "error");
  } else {
    setServerStatus("Ready", "ok");
  }
  renderLog();
}

bootstrap().catch((error) => {
  console.error("Pbot bootstrap failed", error);
  failInitialLoad(error);
});
