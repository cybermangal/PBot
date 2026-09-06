const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const htmlSource = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const styleSource = fs.readFileSync(path.join(root, "ui", "styles.css"), "utf8");

test("manual hit queue lives in a dialog opened from the active fight card", () => {
  const activeFightStart = htmlSource.indexOf('<section class="card boss-status-card');
  const fightQueueStart = htmlSource.indexOf('<section class="card control-card boss-queue-card');
  const activeFightMarkup = htmlSource.slice(activeFightStart, fightQueueStart);

  assert.ok(activeFightStart >= 0);
  assert.ok(fightQueueStart > activeFightStart);
  assert.match(activeFightMarkup, /id="boss-attack-plan-open-btn"/);
  assert.match(activeFightMarkup, /aria-controls="boss-attack-plan-dialog"/);
  assert.match(activeFightMarkup, /id="boss-attack-plan-count"/);
  assert.match(activeFightMarkup, />Очередь ударов</);

  assert.match(
    htmlSource,
    /<dialog id="boss-attack-plan-dialog" class="boss-attack-plan-dialog">/,
  );
  assert.doesNotMatch(htmlSource, /<section class="[^"]*boss-attack-card/);
});

test("hit queue dialog preserves the manual queue and combo controls", () => {
  const requiredIds = [
    "boss-attack-select",
    "boss-attack-count",
    "boss-queue-add",
    "boss-combo-open-btn",
    "boss-attack-body",
    "boss-attack-summary",
    "boss-cost-summary",
    "boss-types",
    "boss-hit-btn",
    "boss-queue-clear",
  ];

  for (const id of requiredIds) {
    assert.equal(
      (htmlSource.match(new RegExp(`id="${id}"`, "g")) || []).length,
      1,
      `${id} should remain present exactly once`,
    );
  }
  assert.match(htmlSource, /<h2>Очередь ударов<\/h2>/);
  assert.match(htmlSource, />Пробить по очереди<\/button>/);
});

test("hit queue dialog has open, close, backdrop, and queue badge behavior", () => {
  assert.match(appSource, /function openBossAttackPlanDialog\(\)/);
  assert.match(appSource, /function closeBossAttackPlanDialog\(\)/);
  assert.match(appSource, /function syncBossAttackPlanButton\(\)/);
  assert.match(appSource, /boss-attack-plan-dialog"\)\?\.addEventListener\("cancel"/);
  assert.match(appSource, /boss-attack-plan-dialog"\)\?\.addEventListener\("keydown"/);
  assert.match(appSource, /event\.target === event\.currentTarget/);
  assert.match(appSource, /badge\.hidden = totalHits === 0/);

  assert.match(styleSource, /\.boss-attack-plan-open-button\s*\{/);
  assert.match(styleSource, /\.boss-attack-plan-dialog::backdrop\s*\{/);
  assert.match(styleSource, /\.boss-attack-plan-card\s*\{/);
});
