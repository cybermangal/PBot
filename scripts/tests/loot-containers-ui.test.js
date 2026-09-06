const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..", "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("misc menu exposes parcel and baul controls while their history lives in the shared journal", () => {
  const html = readProjectFile("ui/index.html");

  assert.match(html, /data-misc-section="containers"/);
  assert.match(html, /id="loot-parcel-open"/);
  assert.match(html, /id="loot-parcel-rewards"/);
  assert.match(html, /id="loot-baul-open"/);
  assert.match(html, /id="loot-baul-allow-early"/);
  assert.match(html, /<span>Ждать наколку<\/span>/);
  assert.doesNotMatch(html, /id="baul-auto-tick"/);
  assert.doesNotMatch(html, /Ждать наколку или шмотку/);
  assert.doesNotMatch(html, /Проверить dry-run/);
  assert.match(html, /id="journal-list"/);
  assert.doesNotMatch(html, /id="loot-container-result"/);
  assert.doesNotMatch(html, /id="loot-container-history"/);
});

test("container opening requires an explicit confirmed request", () => {
  const app = readProjectFile("ui/app.js");
  const server = readProjectFile("scripts/ui-server.js");

  assert.match(app, /dryRun:\s*false/);
  assert.match(app, /confirmed:\s*true/);
  assert.match(app, /allowBelowMax,/);
  assert.match(server, /GET" && pathname === "\/api\/misc\/loot-containers"/);
  assert.match(server, /POST" && pathname === "\/api\/misc\/loot-containers\/open"/);
});

test("parcel stashes are rendered as one summed total instead of a chip grid", () => {
  const app = readProjectFile("ui/app.js");

  assert.match(app, /function lootRewardGroupAmount\(items\)/);
  assert.match(app, /group\.key === "stashes"/);
  assert.match(app, /<small>Всего \$\{escapeHtml\(formatNumber\(total\)\)\}<\/small>/);
  assert.doesNotMatch(
    app.match(/if \(group\.key === "stashes"\)[\s\S]*?\n  }\n\n  return `/)?.[0] || "",
    /loot-reward-chip-list/,
  );
  assert.match(app, /key:\s*"loot:stashes"/);
  assert.match(app, /label:\s*"Нычки"/);
});

test("the latest parcel result fills the space below the progress bar and survives refresh", () => {
  const app = readProjectFile("ui/app.js");
  const styles = readProjectFile("ui/styles.css");

  assert.match(app, /function findLatestLootContainerEntry\(payload, kind, preferred = null\)/);
  assert.match(app, /function renderLootParcelResult\(entry, options = \{\}\)/);
  assert.match(app, /renderLootParcelResult\(latestParcel,/);
  assert.match(app, /payload && payload\.lastOpen/);
  assert.match(app, /payload && payload\.history/);
  assert.match(styles, /\.loot-parcel-result\s*\{/);
  assert.match(styles, /\.loot-parcel-result-head\s*\{/);
});

test("stash packs in boss rewards collapse to one authoritative total", () => {
  const app = readProjectFile("ui/app.js");
  const collectorStart = app.indexOf("function collectBossClaimJournalRewardItems(source)");
  const collectorEnd = app.indexOf("function collectBossComboJournalRewardItems", collectorStart);
  const collector = collectorStart >= 0 && collectorEnd > collectorStart
    ? app.slice(collectorStart, collectorEnd)
    : "";

  assert.match(collector, /const explicitStashCount = Number\(rewards\.stashCount\)/);
  assert.match(collector, /key:\s*"stash:count"/);
  assert.doesNotMatch(collector, /key:\s*`stash:\$\{item/);
});

test("loot container balances and wearable drops render their game images", () => {
  const app = readProjectFile("ui/app.js");
  const styles = readProjectFile("ui/styles.css");

  assert.match(app, /iconUrl:\s*CURRENCY_ICON_URLS\.stew/);
  assert.match(app, /iconUrl:\s*CURRENCY_ICON_URLS\.soap/);
  assert.match(app, /lootResourceIconMarkup\("stew", "loot-button-resource-icon"\)/);
  assert.match(app, /lootResourceIconMarkup\("soap", "loot-button-resource-icon"\)/);
  assert.match(app, /const image = item\?\.image/);
  assert.match(styles, /\.loot-reward-chip\.is-special img/);
});
