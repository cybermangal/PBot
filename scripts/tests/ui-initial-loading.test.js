const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "../..");
const htmlSource = fs.readFileSync(path.join(rootDir, "ui", "index.html"), "utf8");
const cssSource = fs.readFileSync(path.join(rootDir, "ui", "styles.css"), "utf8");
const appSource = fs.readFileSync(path.join(rootDir, "ui", "app.js"), "utf8");

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}`;
  const signatureStart = source.indexOf(signature);
  assert.notEqual(signatureStart, -1, `${functionName} not found`);
  const asyncPrefix = "async ";
  const asyncPrefixStart = signatureStart - asyncPrefix.length;
  const start = asyncPrefixStart >= 0 && source.slice(asyncPrefixStart, signatureStart) === asyncPrefix
    ? asyncPrefixStart
    : signatureStart;
  const paramsEnd = source.indexOf(")", signatureStart);
  const bodyStart = source.indexOf("{", paramsEnd);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  assert.fail(`${functionName} closing brace not found`);
}

test("initial loader gates the application shell before JavaScript data is ready", () => {
  assert.match(htmlSource, /<body class="app-loading">/);
  assert.match(htmlSource, /id="initial-loader"/);
  assert.match(htmlSource, /class="app-shell" inert aria-hidden="true"/);
  assert.match(cssSource, /body\.app-loading \.app-shell/);
  assert.match(cssSource, /animation:\s*initial-loader-spin/);
});

test("bootstrap waits for the active page and then starts idle page preloading", () => {
  const bootstrapSource = extractFunctionSource(appSource, "bootstrap");
  const bossLoadIndex = bootstrapSource.indexOf('ensurePageLoaded("bosses"');
  const finishIndex = bootstrapSource.indexOf("finishInitialLoad()");
  const prefetchIndex = bootstrapSource.indexOf("startPagePrefetch()");

  assert.ok(bossLoadIndex >= 0, "active boss page load not found");
  assert.ok(finishIndex > bossLoadIndex, "the shell must wait for the active boss page");
  assert.ok(prefetchIndex > finishIndex, "inactive pages must preload only after the shell is ready");
  assert.match(bootstrapSource, /startEconomySync\(15000\)/);
  assert.match(bootstrapSource, /handleHeaderExtrasRefresh\(\)/);
  assert.doesNotMatch(bootstrapSource, /const loadSecondaryData = async \(\) =>/);
  assert.match(appSource, /PAGE_PREFETCH_ORDER = Object\.freeze\(\[/);
  assert.match(appSource, /if \(entry\.promise\) return entry\.promise;/);
  assert.match(cssSource, /\.page-load-surface/);
  assert.match(cssSource, /\.page-load-surface\[data-state="error"\]/);
  assert.match(appSource, /bootstrap\(\)\.catch\(\(error\)\s*=>/);
});

test("economy failure keeps the rendered interface and explains the missing balances", () => {
  const unavailableSource = extractFunctionSource(appSource, "renderEconomyUnavailable");
  assert.match(unavailableSource, /Игровой сервер недоступен/);
  assert.match(unavailableSource, /Балансы временно недоступны/);
  assert.match(cssSource, /\.currency-unavailable/);
});

test("fast boss refresh waits for the initial full dashboard hydration", () => {
  const dashboardSource = extractFunctionSource(appSource, "handleBossDashboard");

  assert.match(
    dashboardSource,
    /if \(fast && state\.bossDashboardFullRequestPromise\) \{\s*return state\.bossDashboardFullRequestPromise;/,
  );
  assert.match(
    dashboardSource,
    /state\.bossDashboardFullRequestPromise = dashboardRequest;/,
  );
});
