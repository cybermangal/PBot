const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "ui/index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "ui/app.js"), "utf8");
const server = fs.readFileSync(path.join(root, "scripts/ui-server.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "ui/styles.css"), "utf8");

test("active Zaruba shows per-run spending with the game ruble icon and a tooltip, not daily reserve text", () => {
  assert.doesNotMatch(html, /id="zaruba-wheel-budget"/);
  assert.doesNotMatch(app, /Расходы Зарубы за сегодня/);
  assert.match(app, /renderZarubaSpending\(payload.spending\)/);
  const vm = require("node:vm");
  const helper = app.slice(app.indexOf("function renderZarubaSpending("), app.indexOf("function renderZarubaDashboard("));
  const context = { formatNumber: String, escapeHtml: String, CURRENCY_ICON_URLS: { rubles: "/HUD/rubles.png" } };
  const result = vm.runInNewContext(`${helper};renderZarubaSpending({spent:30,reserved:40})`, context);
  assert.match(result, />30\/40<\/span>/);
  assert.match(result, /src="\/HUD\/rubles.png"/);
  assert.match(result, /title="Расходы текущей Зарубы:/);
  assert.match(result, /tabindex="0"/);
  assert.match(styles, /\.zaruba-active-heading\s*\{[^}]*justify-content: space-between/s);
});

test("Zaruba is a first-class responsive tab with automatic refresh and concise controls", () => {
  assert.match(html, /data-tab="zaruba"/);
  assert.match(html, /id="zaruba-modes"/);
  assert.doesNotMatch(html, /id="zaruba-task-catalog"/);
  assert.doesNotMatch(app, /label: "Пул заданий"/);
  assert.match(html, /id="zaruba-skip-soap"[^>]*disabled/);
  assert.doesNotMatch(html, /id="zaruba-(?:boss|podogrev)-skip"/);
  assert.match(app, /data-zaruba-skip/);
  assert.match(app, /\/api\/zaruba\/dashboard/);
  assert.match(app, /Комбо доступно — можно вбить; резерв:/);
  assert.match(app, /Сначала сохранённое комбо; если урона не хватит/);
  assert.match(app, /data-zaruba-boss-queue-task/);
  assert.match(app, /buildZarubaBossQueuePlan/);
  assert.match(html, /Тюрьмы и мастера/);
  assert.match(html, /card full-span zaruba-task-card/);
  assert.match(html, /Награды, Тюрьмы и мастера/);
  assert.match(html, /Забирает награды и добавляет задания в очередь/);
  assert.doesNotMatch(html, /id="zaruba-auto-(?:claim|enqueue)"/);
  assert.equal((html.match(/<h2>Состояние и прогресс<\/h2>/g) || []).length, 1);
  assert.equal((html.match(/<h3>Правила выполнения<\/h3>/g) || []).length, 1);
  assert.doesNotMatch(html, /zaruba-automation-card/);
  assert.match(app, /expectedStateVersion/);
  assert.match(styles, /\.zaruba-mode-grid/);
  assert.match(styles, /\.zaruba-task-state\s*\{[^}]*grid-template-columns:\s*repeat\(4,/s);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*?\.zaruba-task-state\s*\{[^}]*repeat\(2,/);
  assert.match(styles, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(styles, /\.zaruba-automation-card\s*\{[^}]*order:/s);
  assert.match(html, /zaruba-automation-icons/);
  assert.match(app, /function zarubaModeIconUrl\(mode\)/);
  assert.match(app, /patsanskaya-posylka-4x\.png/);
  assert.match(app, /execution\.status === "blocked"[\s\S]*?execution\.label/);
  assert.match(app, /function startZarubaSync/);
  assert.match(app, /ZARUBA_REFRESH_INTERVAL_MS = 15_000/);
  assert.match(app, /handleZarubaDashboard\(\{ silent: true, syncControls: true \}\)/);
  assert.match(app, /Правила сохранены ✓/);
  assert.match(app, /function meaningfulZarubaHistory/);
  assert.doesNotMatch(html, /Безопасные действия/);
  assert.doesNotMatch(html, /id="zaruba-tick-btn"/);
  assert.doesNotMatch(html, /data-zaruba-action="(?:openBag|exchangeOre)"/);
});

test("bags have a compact misc section with game art, opening actions, and ore smelting", () => {
  assert.match(html, /data-misc-section="bags"/);
  assert.match(html, /id="misc-section-bags"/);
  assert.match(html, /id="zaruba-bags-link"/);
  assert.match(html, /id="bags-family-switch"/);
  assert.match(app, /id="bags-forge-button"/);
  assert.match(app, /Zaruba\/bagsScene/);
  assert.match(app, /Guild\/Camps\/GuildWell\/bags/);
  assert.match(app, /\/api\/misc\/bags/);
  assert.match(app, /expectedStateVersion:\s*state\.bagsDashboard\.stateVersion/);
  assert.match(app, /function brigadeArmbandSummary\(balances\)/);
  assert.match(app, /Повязки для бригадных сумок · отдельный баланс у каждого типа/);
  assert.match(app, /title="Доступно: \$\{formatNumber\(bag\.balance/);
  assert.match(app, /const visibleBags = \[\.\.\.bags\]\.sort/);
  assert.doesNotMatch(app, /Object\.values\(payload\.brigade\?\.balances \|\| \{\}\)\.reduce/);
  assert.match(styles, /\.bags-card-grid/);
  assert.match(styles, /\.bags-forge/);
  assert.match(styles, /\.bags-armband-balances/);
});

test("events live in the misc dropdown instead of a standalone tab", () => {
  assert.match(html, /data-misc-section="events"[^>]*>События<\/button>/);
  assert.match(html, /id="misc-section-events"/);
  assert.doesNotMatch(html, /class="tab-button" data-tab="events"/);
  assert.match(app, /events:\s*"events"/);
  assert.match(app, /misc-section-panel\[data-misc-section="events"\]/);
});

test("Zaruba UI explains minimum-work queues and omits participant names", () => {
  assert.match(html, /class="prison-queue-flow"/);
  assert.match(html, /Минимальный шаг/);
  assert.match(app, /После каждого шага цель сверяется/);
  assert.match(app, /План: 1 удар · \$\{plannedWeaponLabel\}/);
  assert.match(app, /function resolveZarubaTaskUiKnowledge/);
  assert.match(app, /objective: "send_stash"/);
  assert.match(app, /objective: "harknut"/);
  assert.match(app, /objective: "fight"/);
  assert.match(app, /objective: "spin"/);
  assert.match(app, /Zaruba\/ZarubActiv\/i_harknyt\.webp/);
  assert.match(app, /Zaruba\/ZarubActiv\/i_winPlayer\.webp/);
  assert.match(app, /slots\/slotsIcon\/bgSlots\.webp/);
  assert.match(app, /poker\/hidesicon\.png/);
  assert.match(app, /FortuneScene\/coleso_jack\.webp/);
  assert.match(app, /knowledge\.known \? "распознано" : "неизвестно"/);
  assert.match(app, /prison-queue-removal-rule/);
  assert.doesNotMatch(app, /payload\.active\?\.participants/);
  assert.doesNotMatch(html, /id="zaruba-only-without-profit"/);
});

test("Zaruba enabled checkbox persists immediately instead of waiting for a later restart", () => {
  assert.match(app, /\$\("#zaruba-auto-enabled"\)\?\.addEventListener\("change", handleZarubaAutomationSave\)/);
  assert.match(app, /\$\("#zaruba-auto-start"\)\?\.addEventListener\("change", handleZarubaAutomationSave\)/);
  assert.match(app, /catch \(error\)[\s\S]*?await handleZarubaDashboard\(\{ silent: true \}\)/);
});

test("prison queue accepts either a walk count or a full-collection goal", () => {
  assert.match(html, /id="prison-queue-goal"/);
  assert.match(html, /До полного сбора вещей/);
  assert.match(html, /id="prison-queue-runs"/);
  assert.match(app, /goalType === "collection"/);
  assert.match(app, /completedRuns/);
  assert.match(app, /runTarget/);
});

test("paid weapon batches live next to combat actions and require explicit confirmation", () => {
  assert.match(app, /\/api\/bosses\/buy-weapon/);
  assert.match(app, /BOSS_WEAPON_BUY_BATCH_COUNTS/);
  assert.match(app, /js-boss-weapon-buy/);
  assert.match(app, /data-unit-price/);
  assert.match(app, /confirmBossWeaponPurchase/);
  assert.match(app, /confirmed:\s*true/);
  assert.match(html, /boss-weapon-purchase-dialog/);
  assert.match(html, /boss-weapon-purchase-total/);
  assert.match(app, /window\.confirm/);
  assert.doesNotMatch(html, /boss-weapon-buy-preview-btn/);
  assert.doesNotMatch(html, /Оптовая закупка оружия/);
});

test("local gateway exposes every new read and automation route", () => {
  for (const route of [
    "/api/zaruba/dashboard",
    "/api/zaruba/automation",
    "/api/zaruba/automation/tick",
    "/api/zaruba/action",
    "/api/misc/bags",
    "/api/misc/bags/action",
    "/api/bosses/buy-weapon",
    "/api/misc/baryga-shop",
    "/api/misc/baul-automation",
    "/api/guild/dashboard",
    "/api/friends/automation",
  ]) {
    assert.match(server, new RegExp(route.replaceAll("/", "\\/")));
  }
});

test("boss queue offers one explicit source, hidden preset management, and manual reordering", () => {
  assert.match(html, /id="boss-run-preset-select"/);
  assert.match(html, /id="boss-run-source-select"/);
  assert.match(html, /id="boss-run-source-apply"/);
  assert.match(html, /Управление пресетами/);
  assert.doesNotMatch(html, /id="boss-run-schedule-at"/);
  assert.doesNotMatch(html, /id="boss-run-repeat-cycles"/);
  assert.match(app, /BOSS_RUN_QUEUE_PRESETS_STORAGE_KEY/);
  assert.match(app, /js-boss-run-move/);
});

test("Katala and Fartovy keep manual controls and reward summaries without schedules", () => {
  assert.doesNotMatch(app, /fartovy-schedule-enabled/);
  assert.doesNotMatch(app, /katala-schedule-enabled/);
  assert.doesNotMatch(app, /data-minigame-schedule-save/);
  assert.match(app, /renderMiniGameDailyStats/);
  assert.match(app, /freeSpins/);
  assert.doesNotMatch(server, /\/api\/misc\/minigame\/schedules/);
});

test("read-only Brigade and Baryga sections are not exposed in navigation", () => {
  assert.doesNotMatch(html, /data-friends-section="guild"/);
  assert.doesNotMatch(html, /data-misc-section="baryga"/);
  assert.doesNotMatch(html, /id="guild-members-body"/);
  assert.doesNotMatch(html, /id="baryga-items"/);
});
