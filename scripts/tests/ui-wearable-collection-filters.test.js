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
  const bodyStart = source.indexOf("{", start);
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

test("wearable collection status filter uses complete-set semantics", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "collectionGroupMatchesStatus"),
      "this.collectionGroupMatchesStatus = collectionGroupMatchesStatus;",
    ].join("\n"),
    context,
  );

  const empty = { collected: 0, total: 3, complete: false };
  const partial = { collected: 1, total: 3, complete: false };
  const complete = { collected: 3, total: 3, complete: true };

  assert.equal(context.collectionGroupMatchesStatus(empty, "complete"), false);
  assert.equal(context.collectionGroupMatchesStatus(partial, "complete"), false);
  assert.equal(context.collectionGroupMatchesStatus(complete, "complete"), true);

  assert.equal(context.collectionGroupMatchesStatus(empty, "missing"), true);
  assert.equal(context.collectionGroupMatchesStatus(partial, "missing"), true);
  assert.equal(context.collectionGroupMatchesStatus(complete, "missing"), false);

  assert.equal(context.collectionGroupMatchesStatus(empty, "partial"), false);
  assert.equal(context.collectionGroupMatchesStatus(partial, "partial"), true);
  assert.equal(context.collectionGroupMatchesStatus(complete, "partial"), false);
});

test("wearable collection exposes the four requested status choices", () => {
  const statusSelect = htmlSource.match(/<select id="wearable-collection-status-filter">([\s\S]*?)<\/select>/)?.[1] || "";

  assert.match(statusSelect, /value="all">Все</);
  assert.match(statusSelect, /value="complete">Собрано</);
  assert.match(statusSelect, /value="missing">Не собрано</);
  assert.match(statusSelect, /value="partial">Частично собрано</);
  assert.doesNotMatch(statusSelect, /value="owned"/);
});

test("wearable source buttons filter categories instead of scrolling", () => {
  const handler = extractFunctionSource(appSource, "handleWearableCollectionCategoryNavClick");

  assert.match(handler, /wearableCollectionCategoryFilter/);
  assert.match(handler, /renderWearableCollectionCategories\(\)/);
  assert.doesNotMatch(handler, /scrollIntoView/);
  assert.match(appSource, /title:\s*"Все"/);
  assert.match(appSource, /visibleCategories\.map\(renderWearableCategory\)/);
});
