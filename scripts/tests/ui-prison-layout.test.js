const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const appSource = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const indexSource = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const stylesSource = fs.readFileSync(path.join(root, "ui", "styles.css"), "utf8");

test("prison controls keep internal scheduling details out of the UI", () => {
  assert.doesNotMatch(indexSource, /id="prison-steps"/);
  assert.doesNotMatch(indexSource, /id="prison-auto-interval"/);
  assert.doesNotMatch(indexSource, /id="prison-automation-summary"/);
  assert.doesNotMatch(indexSource, /id="prison-cost-note"/);
  assert.doesNotMatch(indexSource, /class="automation-status-strip"/);
  assert.doesNotMatch(appSource, /Время учитывает бесплатное восстановление/);
  assert.doesNotMatch(appSource, /Ждём энергию:/);
  assert.doesNotMatch(appSource, /нужно до завершения · сейчас/);
  assert.doesNotMatch(appSource, /<span>Клики<\/span>/);
  assert.doesNotMatch(appSource, /Boolean\(run\.completed\)/);
  assert.match(appSource, /run\.completed === true/);
  assert.match(appSource, /<span>Пройдено энергии<\/span>/);
  assert.match(appSource, /calculatePrisonRunEnergyTotal\(source\.checkpoints\)/);
  assert.match(appSource, /energySpent = Math\.max\(0, energyTotal - energyRemaining\)/);
  assert.match(appSource, /formatNumber\(energySpent\)\)\}\/\$\{escapeHtml\(formatNumber\(energyTotal\)\)\}/);
  assert.match(appSource, /<span>Время<\/span>/);
  assert.match(appSource, /formatPrisonDuration\(estimatedMs\)/);
  assert.match(appSource, /progress\.completed\s*\?\s*"готово"/);
  assert.ok(
    appSource.indexOf("const detail = state.prisonDetail;")
      < appSource.indexOf("const costEntry = state.prisonCosts"),
    "live prison detail must take priority over the day-long energy-cost cache",
  );
  assert.match(appSource, /state\.prisonDetail = payload;\s*renderPrisonAutomationProgress\(\);\s*renderPrisonCollectionSummary\(\);\s*renderPrisonZoneGrids\(\);/);
  assert.match(appSource, /return "меньше минуты"/);
  assert.match(appSource, /class="prison-automation-progress-track"/);
  assert.match(appSource, /\$\{escapeHtml\(progress\.percent\)\}%/);
});

test("prison profit and wearable bonuses use compact collection patterns", () => {
  const controlStart = indexSource.indexOf('class="card control-card full-span prison-control-card"');
  const profitStart = indexSource.indexOf('class="prison-profit-strip"');
  const controlEnd = indexSource.indexOf("</section>", controlStart);

  assert.ok(controlStart >= 0 && profitStart > controlStart && profitStart < controlEnd);
  assert.match(appSource, /renderWearableBonusChips\(piece\.combatStatsBonus, "без бонуса"\)/);
  assert.match(appSource, /class="wearable-owned-bonus-card"/);
  assert.match(appSource, /class="prison-zone-bonus-summary"/);
  assert.match(appSource, /renderWearableBonusChips\(totals\.potentialBonuses\)/);
  assert.match(stylesSource, /\.prison-collection-summary\s*\{[\s\S]*?grid-template-columns:/);
  assert.match(stylesSource, /\.prison-profit-strip\s*\{[\s\S]*?display:\s*grid;/);
});

test("prison and workshop cards show completed run counters", () => {
  assert.match(appSource, /liveDetail\.day\.runs/);
  assert.match(appSource, /cachedDetail\.night\.run\.runs/);
  assert.match(appSource, /training\.runs \?\? progress\.runs \?\? progress\.completedRuns \?\? progress\.level/);
  assert.match(appSource, /label: "Ходок в тюрьмах"/);
  assert.match(appSource, /label: "Ходок в мастерских"/);
  assert.match(appSource, /Ходок \$\{escapeHtml\(runCountLabel\)\}/);
});
