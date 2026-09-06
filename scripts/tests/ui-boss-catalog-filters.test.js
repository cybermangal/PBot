const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..", "..");
const appSource = fs.readFileSync(path.join(projectRoot, "ui", "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(projectRoot, "ui", "index.html"), "utf8");

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `${functionName} not found`);
  const paramsEnd = source.indexOf(")", start);
  assert.notEqual(paramsEnd, -1, `${functionName} params not found`);
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

test("boss catalog exposes category and status filters independently from the queue picker", () => {
  const statusSelect = htmlSource.match(/<select id="boss-catalog-status-filter"[^>]*>([\s\S]*?)<\/select>/)?.[1] || "";

  assert.match(htmlSource, /id="boss-catalog-category-nav"/);
  assert.match(htmlSource, /id="boss-catalog-status-filter" aria-label="Состояние"/);
  assert.match(statusSelect, /value="all">Все боссы</);
  assert.match(statusSelect, /value="startable">Доступные для атаки</);
  assert.match(statusSelect, /value="missing">Не собранные</);
  assert.match(appSource, /data-boss-catalog-category-filter/);
  assert.match(appSource, /title:\s*"Беспредельщики"/);
  assert.match(appSource, /title:\s*"Надзиратели"/);
  assert.match(appSource, /title:\s*"Рецидивисты"/);
});

test("boss catalog browser filters can combine a category with availability or missing rewards", () => {
  const context = {
    state: {
      bossDashboard: null,
    },
    isBossCatalogStartable(item) {
      return Boolean(item && item.startable);
    },
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "getBossRewardBoss"),
      extractFunctionSource(appSource, "isBossCatalogCollectionIncomplete"),
      extractFunctionSource(appSource, "bossCatalogItemMatchesBrowserFilters"),
      "this.bossCatalogItemMatchesBrowserFilters = bossCatalogItemMatchesBrowserFilters;",
    ].join("\n"),
    context,
  );

  const rewards = {
    bosses: [
      {
        id: 1,
        battleModes: [{ total: 3, collected: 2, missing: [{ id: 10 }] }],
      },
      {
        id: 2,
        battleModes: [{ total: 2, collected: 2, missing: [] }],
      },
    ],
  };
  const missingGuard = { id: 1, categoryId: 2, startable: true };
  const completeGuard = { id: 2, categoryId: 2, startable: false };

  assert.equal(context.bossCatalogItemMatchesBrowserFilters(missingGuard, {
    categoryFilter: "2",
    statusFilter: "missing",
    rewards,
  }), true);
  assert.equal(context.bossCatalogItemMatchesBrowserFilters(completeGuard, {
    categoryFilter: "2",
    statusFilter: "missing",
    rewards,
  }), false);
  assert.equal(context.bossCatalogItemMatchesBrowserFilters(missingGuard, {
    categoryFilter: "1",
    statusFilter: "missing",
    rewards,
  }), false);
  assert.equal(context.bossCatalogItemMatchesBrowserFilters(completeGuard, {
    categoryFilter: "2",
    statusFilter: "startable",
    rewards,
  }), false);
});
