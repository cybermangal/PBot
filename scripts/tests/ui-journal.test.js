const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");
const appSource = fs.readFileSync(path.join(projectRoot, "ui", "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(projectRoot, "ui", "index.html"), "utf8");
const styleSource = fs.readFileSync(path.join(projectRoot, "ui", "styles.css"), "utf8");

test("shared journal is available from every tab with source, type, and search filters", () => {
  assert.match(htmlSource, /id="journal-toggle"/);
  assert.match(htmlSource, /id="journal-source-filter"/);
  assert.match(htmlSource, /value="current">Текущая вкладка/);
  assert.match(htmlSource, /value="system">Система/);
  assert.match(htmlSource, /id="journal-kind-filter"/);
  assert.match(htmlSource, /id="journal-search"/);
  assert.match(appSource, /syncJournalContext\(tab === "misc" && state\.activeMiscSection === "events" \? "events" : tab\)/);
  assert.doesNotMatch(appSource, /activeTab === "bosses"/);
});

test("old per-block history mounts are removed in favor of the shared journal", () => {
  for (const id of [
    "boss-automation-activity",
    "log-list",
    "misc-game-result",
    "lets-cook-activity",
    "loot-container-history",
    "boss-result-summary",
    "boss-result-body",
    "boss-raw",
    "prison-result-summary",
    "prison-result-body",
    "prison-raw",
    "friends-result-summary",
    "friends-result-body",
    "friends-raw",
  ]) {
    assert.doesNotMatch(htmlSource, new RegExp(`id="${id}"`));
  }
  assert.match(htmlSource, /id="journal-list"/);
});

test("journal reward streams retain game icons for currencies, combo loot, and wearables", () => {
  assert.match(appSource, /redgained:\s*"red_matches"/);
  assert.match(appSource, /grassgained:\s*"green_matches"/);
  assert.match(appSource, /imageUrl:\s*BOSS_STASH_ICON_URL/);
  assert.match(appSource, /findJournalWearableCatalogItem\("tattoo", id\)/);
  assert.match(appSource, /renderBossComboNetChips\(economy\.net, entry\.comboRewards\)/);
  assert.match(appSource, /item && \(item\.imageUrl \|\| item\.image \|\| item\.previewUrl\)/);
});

test("journal native select menus keep explicit dark, readable option colors", () => {
  assert.match(styleSource, /\.journal-filter-field select option\s*\{[^}]*background-color:\s*var\(--panel-2\);[^}]*color:\s*var\(--text\);/s);
  assert.match(styleSource, /\.journal-filter-field select option:checked\s*\{[^}]*background-color:\s*#24584f;[^}]*color:\s*#ffffff;/s);
});

test("journal keeps a compact actionable history and translates common infrastructure errors", () => {
  assert.match(appSource, /const JOURNAL_MAX_ENTRIES = 200;/);
  assert.match(appSource, /JOURNAL_ROUTINE_MESSAGE_PATTERNS/);
  assert.match(appSource, /Сервер игры временно ограничил запросы\. Повторим автоматически\./);
  assert.match(appSource, /Игровая сессия истекла\. Войди снова по InitData\./);
  assert.match(appSource, /< 30_000/);
  assert.match(appSource, /"Boss run queue cleared": "Очередь запусков боссов очищена"/);
  assert.doesNotMatch(appSource, /"Boss run queue cleared": "Босс run очередь/);
});
