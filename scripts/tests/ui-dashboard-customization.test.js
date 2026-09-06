const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../..");
const appSource = fs.readFileSync(path.join(rootDir, "ui", "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(rootDir, "ui", "index.html"), "utf8");
const cssSource = fs.readFileSync(path.join(rootDir, "ui", "styles.css"), "utf8");
const serviceSource = fs.readFileSync(path.join(rootDir, "scripts", "lib", "ui-service.js"), "utf8");

test("header exposes configurable single-value nine-slot and three-slot dashboards", () => {
  assert.match(appSource, /const DASHBOARD_RESOURCE_SLOT_LIMIT = 9;/);
  assert.match(appSource, /const DASHBOARD_HERO_SLOT_LIMIT = 3;/);
  assert.match(appSource, /const DASHBOARD_SLOT_ITEM_LIMIT = 1;/);
  assert.match(appSource, /pbot\.dashboard\.resources\.v3/);
  assert.match(appSource, /pbot\.dashboard\.hero\.v2/);
  assert.match(appSource, /function initializeResourceDashboard\(\)/);
  assert.match(appSource, /function addDashboardResourceToSlot\(key, zone = "wallet", slotIndex = null\)/);
  assert.match(appSource, /slots\[targetIndex\] = \[definition\.key\];/);
  assert.match(appSource, /function handleDashboardDrop\(event\)/);
  assert.match(appSource, /writeAccountStorage\(DASHBOARD_RESOURCE_STORAGE_KEY/);
  assert.match(appSource, /function activateAccountScopedUiStorage\(accountId\)/);
  assert.match(appSource, /\.account\.\$\{encodeURIComponent\(normalizedAccountId\)\}/);
  assert.match(htmlSource, /id="dashboard-hero-slots"/);
  assert.match(htmlSource, /id="dashboard-resource-details"/);
  assert.match(htmlSource, /id="dashboard-resource-catalog"/);
  assert.match(htmlSource, /id="dashboard-clear"/);
  assert.match(htmlSource, /Каждая плашка показывает один ресурс или метрику/);
  assert.doesNotMatch(appSource, /dashboardSlotSelect|dashboard-resource-select|is-multi-resource|dashboard-slot-item-count/);
  assert.doesNotMatch(cssSource, /dashboard-resource-select|is-multi-resource|dashboard-slot-item-count/);
  assert.doesNotMatch(htmlSource, />Оружие и статистика</);
  assert.doesNotMatch(cssSource, /currency-item\[data-primary="true"\]/);
});

test("chefir is a regular catalog resource and is not fused with energy", () => {
  const defaultOrder = appSource.match(/const CURRENCY_DISPLAY_ORDER = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(defaultOrder, "default dashboard order not found");
  const keys = [...defaultOrder[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(keys.length, 9);
  assert.equal(keys.includes("chefir"), false);
  assert.equal(keys.includes("chips"), true);
  assert.match(appSource, /"chefir",/);
  assert.doesNotMatch(htmlSource, /energy-chefir/);
  assert.doesNotMatch(htmlSource, />Прогресс</);
});

test("resource catalog uses native icons and excludes event resources", () => {
  for (const expectedPath of [
    "/PrisonV3/achievements/imgAll/Star_Small_Deactiv.png",
    "/craftZS/sicon_coolness.png",
    "/PrisonV3/interaction/bitsepsAdd.png",
    "/Zaruba/ZarubActiv/ore_icon.webp",
    "/PrisonV3/Vorkuta/box_inon_vor.webp",
    "/Guild/Camps/bandages/bandage_1.webp",
    "/Guild/Camps/bandages/bandage_2.webp",
    "/Guild/Camps/bandages/bandage_3.webp",
    "/Guild/Camps/bandages/bandage_4.webp",
    "/Guild/Camps/bandages/bandage_5.webp",
  ]) {
    assert.match(appSource, new RegExp(expectedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(appSource, /\^eventtoken_/);
  const dashboardKeys = appSource.match(/const DASHBOARD_CURRENCY_KEYS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  assert.ok(dashboardKeys);
  assert.doesNotMatch(dashboardKeys[1], /"ep"|"eventtoken_13"/);
});

test("level experience and auxiliary balances are forwarded", () => {
  assert.match(serviceSource, /currentLevelXp: asNumber\(data\.currentLevelXp, null\)/);
  assert.match(serviceSource, /nextLevelXp: asNumber\(data\.nextLevelXp, null\)/);
  assert.match(serviceSource, /client\.get\("\/api\/menyala\/state"\)/);
  assert.match(serviceSource, /client\.get\("\/api\/slots-game\/info"\)/);
  assert.match(appSource, /опыт \$\{formatNumber\(economy\.currentLevelXp\)\}/);
});

test("dashboard labels and counters match the requested wording", () => {
  assert.match(appSource, /fortune_tickets: "Билеты"/);
  assert.match(appSource, /biceps: "Бицуха"/);
  assert.match(appSource, /signet: "Печатки"/);
  assert.match(appSource, /ore_signet: "Руда"/);
  assert.match(appSource, /vbox: "Ящик Воркуты"/);
  assert.match(appSource, /label: "ЗШ"/);
  assert.match(appSource, /value: formatNumber\(achievements\.unlockedReward \|\| 0\)/);
  assert.match(appSource, /value: formatNumber\(total\)/);
  for (const expected of ["Мой урон", "Общий урон", "Урон друзей", "Бригадный урон"]) {
    assert.match(appSource, new RegExp(expected));
  }
  for (const expected of ["за час", "за день", "за неделю"]) {
    assert.match(appSource, new RegExp(expected));
  }
});

test("combat catalog exposes weapon damage separately from weapon inventory", () => {
  for (const [key, label, weaponKey] of [
    ["weapon_damage_poison", "Урон яда", "poison"],
    ["weapon_damage_gunshot", "Урон самопала", "gunshot"],
    ["weapon_damage_knife", "Урон финки", "knife"],
  ]) {
    const definitionPattern = new RegExp(
      `${key}: Object\\.freeze\\(\\{[\\s\\S]*?label: "${label}"[\\s\\S]*?group: "combat"[\\s\\S]*?source: "weapon-damage"[\\s\\S]*?weaponKey: "${weaponKey}"`,
    );
    assert.match(appSource, definitionPattern);
  }
  assert.match(appSource, /if \(definition\.source === "weapon-damage"\)/);
  assert.match(appSource, /value: Number\.isFinite\(damage\) \? formatBossCompactNumber\(damage\) : "—"/);
  assert.match(appSource, /meta: "за 1 применение"/);
});
