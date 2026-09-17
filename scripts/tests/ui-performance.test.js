const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../ui/app.js"), "utf8");
function between(start, end) {
  return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
}

test("translation compiles patterns once and bounds memory during long runs", () => {
  let compilations = 0;
  const context = vm.createContext({
    UI_TEXT_TRANSLATIONS: { Ready: "Готово" },
    UI_TEXT_REPLACEMENTS: [["Boss", "Босс"], ["ready", "готово"]],
    RegExp: function (...args) { compilations += 1; return new RegExp(...args); },
  });
  vm.runInContext(between("function translateUiText(", "function localizeUiTree("), context);
  assert.equal(context.translateUiText(" Boss ready "), " Босс готово ");
  for (let i = 0; i < 10_000; i += 1) context.translateUiText(`Boss ready ${i}`);
  assert.equal(compilations, 2);
  assert.equal(context.translateUiText.cache.size, 512);
  assert.equal(context.translateUiText("Ready"), "Готово");
  assert.equal(context.translateUiText("Без перевода"), "Без перевода");
  assert.equal(context.translateUiText("Boss ready 9999"), "Босс готово 9999");
});

test("closed journal avoids building rows even after many background updates", () => {
  const count = {};
  const context = vm.createContext({
    document: { hidden: false, body: { classList: { contains: () => false } } },
    state: { logs: Array.from({ length: 200 }, (_, index) => ({ message: String(index) })) },
    $: (selector) => { assert.equal(selector, "#journal-count"); return count; },
    formatNumber: String,
    renderJournalEntry: () => assert.fail("Closed journal must not create DOM rows"),
  });
  vm.runInContext(between("function renderLog()", "function appendLog("), context);
  for (let i = 0; i < 1000; i += 1) context.renderLog();
  assert.equal(count.textContent, "200");
});

test("unchanged stat grids preserve their DOM nodes", () => {
  let markup = "";
  let writes = 0;
  const target = { get innerHTML() { return markup; }, set innerHTML(value) { markup = value; writes += 1; } };
  const context = vm.createContext({ escapeHtml: String, translateUiText: String });
  vm.runInContext(between("function renderStatGrid(", "function setTextIfChanged("), context);
  for (let i = 0; i < 1000; i += 1) context.renderStatGrid(target, [{ value: 5, label: "HP" }]);
  assert.equal(writes, 1);
  context.renderStatGrid(target, [{ value: 4, label: "HP" }]);
  assert.equal(writes, 2);
});

test("boss polling sleeps in hidden tabs and resumes without overlapping requests", async () => {
  let active = true;
  let polls = 0;
  let release;
  const context = vm.createContext({
    document: { hidden: true, body: { classList: { contains: () => false } } },
    state: { bossAuto: { running: false }, bossRunQueue: [1] },
    isBossTabActive: () => active,
    refreshBossAutomationOnly: () => { polls += 1; return new Promise((resolve) => { release = resolve; }); },
    updateBossAutoStatus() {},
  });
  vm.runInContext(between("async function bossAutoTick()", "function startBossAutoRefresh("), context);
  await context.bossAutoTick();
  assert.equal(polls, 0);
  context.document.hidden = false;
  active = false;
  await context.bossAutoTick();
  assert.equal(polls, 0);
  active = true;
  const pending = context.bossAutoTick();
  await context.bossAutoTick();
  assert.equal(polls, 1);
  release();
  await pending;
  assert.equal(context.state.bossAuto.running, false);
});

test("localization ignores its own mutations and translates only the changed attribute", () => {
  let callback;
  let observed = 0;
  let disconnected = 0;
  let treeWalks = 0;
  const context = vm.createContext({
    document: { body: {} },
    MutationObserver: class {
      constructor(fn) { callback = fn; }
      disconnect() { disconnected += 1; }
      observe() { observed += 1; }
    },
    localizeUiTree: () => { treeWalks += 1; },
    translateUiText: () => "Готово",
  });
  const start = source.indexOf("function initializeRussianUi()");
  const end = source.indexOf("\nfunction ", start + 1);
  vm.runInContext(source.slice(start, end), context);
  context.initializeRussianUi();
  let translated;
  callback([{ type: "attributes", attributeName: "title", target: {
    isConnected: true, getAttribute: () => "Ready", setAttribute: (_name, value) => { translated = value; },
  } }]);
  assert.equal(translated, "Готово");
  assert.equal(treeWalks, 1);
  assert.equal(disconnected, 1);
  assert.equal(observed, 2);
});
