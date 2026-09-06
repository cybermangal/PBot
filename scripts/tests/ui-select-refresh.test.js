const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..", "..");
const appSource = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `${functionName} not found`);
  const paramsEnd = source.indexOf(")", start);
  const bodyStart = source.indexOf("{", paramsEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${functionName} closing brace not found`);
}

function createSelect(options) {
  return {
    tagName: "SELECT",
    options: options.map((item) => ({ ...item })),
    replaceCount: 0,
    contains(node) {
      return node === this;
    },
    replaceChildren(...nodes) {
      this.replaceCount += 1;
      this.options = nodes;
    },
  };
}

function createContext(activeElement = null) {
  const context = {
    document: {
      activeElement,
      createElement() {
        return { value: "", textContent: "", disabled: false };
      },
    },
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "hasFocusedSelect"),
      extractFunctionSource(appSource, "syncSelectOptions"),
      extractFunctionSource(appSource, "replaceHtmlUnlessSelectFocused"),
      "this.syncSelectOptions = syncSelectOptions;",
      "this.replaceHtmlUnlessSelectFocused = replaceHtmlUnlessSelectFocused;",
    ].join("\n"),
    context,
  );
  return context;
}

test("background refresh does not replace an active native select", () => {
  const select = createSelect([{ value: "1", textContent: "One", disabled: false }]);
  const context = createContext(select);

  const synced = context.syncSelectOptions(select, [
    { value: "1", label: "One" },
    { value: "2", label: "Two" },
  ]);

  assert.equal(synced, false);
  assert.equal(select.replaceCount, 0);
  assert.deepEqual(select.options.map((item) => item.value), ["1"]);
});

test("unchanged select options are not recreated", () => {
  const select = createSelect([
    { value: "1", textContent: "One", disabled: false },
    { value: "2", textContent: "Two", disabled: true },
  ]);
  const context = createContext();

  const synced = context.syncSelectOptions(select, [
    { value: 1, label: "One" },
    { value: 2, label: "Two", disabled: true },
  ]);

  assert.equal(synced, true);
  assert.equal(select.replaceCount, 0);
});

test("dynamic boss containers stay mounted while a nested select is active", () => {
  const select = createSelect([]);
  const target = {
    innerHTML: "before",
    contains(node) {
      return node === select;
    },
  };
  const context = createContext(select);

  const updated = context.replaceHtmlUnlessSelectFocused(target, "after");

  assert.equal(updated, false);
  assert.equal(target.innerHTML, "before");
});

test("refresh-sensitive boss renderers use the interaction-safe helpers", () => {
  const bossDashboard = extractFunctionSource(appSource, "renderBossDashboard");
  const bossQueue = extractFunctionSource(appSource, "renderBossRunQueue");
  const weaponPanel = extractFunctionSource(appSource, "renderBossWeaponPanel");
  const zarubaDashboard = extractFunctionSource(appSource, "renderZarubaDashboard");

  assert.match(bossDashboard, /populateBossSelect\(\)/);
  assert.match(bossQueue, /replaceHtmlUnlessSelectFocused\(target,/);
  assert.match(weaponPanel, /replaceHtmlUnlessSelectFocused\(target,/);
  assert.match(zarubaDashboard, /options\.syncControls === false/);
  assert.match(zarubaDashboard, /syncSelectOptions\(select,/);
});
