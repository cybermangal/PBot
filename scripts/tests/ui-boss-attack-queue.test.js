const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appPath = path.resolve(__dirname, "../../ui/app.js");
const appSource = fs.readFileSync(appPath, "utf8");

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}`;
  const signatureStart = source.indexOf(signature);
  assert.notEqual(signatureStart, -1, `${functionName} not found`);
  const asyncPrefix = "async ";
  const asyncPrefixStart = signatureStart - asyncPrefix.length;
  const start = asyncPrefixStart >= 0
    && source.slice(asyncPrefixStart, signatureStart) === asyncPrefix
    ? asyncPrefixStart
    : signatureStart;
  const paramsEnd = source.indexOf(")", signatureStart);
  const bodyStart = source.indexOf("{", paramsEnd);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`${functionName} closing brace not found`);
}

function createContext({ bossId, comboMode, template, comboModes = [comboMode] }) {
  const nodes = {
    "#boss-select": { value: String(bossId || "") },
    "#boss-mode": { value: "pacansky" },
    "#boss-combo-mode": { value: comboMode || "" },
  };
  const state = { bossQueue: [{ key: "knife", count: 3 }] };
  let renderCount = 0;
  const context = {
    state,
    $(selector) {
      return nodes[selector] || null;
    },
    getSelectedBossCandidate() {
      return { id: bossId, availableComboModes: comboModes };
    },
    resolveBossComboModes(candidate) {
      return candidate.availableComboModes;
    },
    resolveBossComboTemplateForBossAndMode() {
      return template || null;
    },
    applyBossComboSequenceToQueue(sequence) {
      state.bossQueue = Array.from(sequence, (key) => ({ key, count: 1 }));
      renderCount += 1;
    },
    formatComboModeLabel(value) {
      return value;
    },
    appendLog() {},
  };

  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "applyStoredComboTemplateForMainSelection"),
      "this.applyStoredComboTemplateForMainSelection = applyStoredComboTemplateForMainSelection;",
    ].join("\n"),
    context,
  );
  Object.defineProperty(context, "renderCount", {
    get: () => renderCount,
  });
  return context;
}

test("attack queue is cleared when the selected boss has no saved combo", () => {
  const context = createContext({ bossId: 8, comboMode: "pacansky", template: null });

  const applied = context.applyStoredComboTemplateForMainSelection({ silent: true });

  assert.equal(applied, false);
  assert.deepEqual(context.state.bossQueue, []);
  assert.equal(context.renderCount, 1);
});

test("attack queue follows the saved combo of the selected boss", () => {
  const context = createContext({
    bossId: 9,
    comboMode: "blotnoy",
    template: { comboMode: "blotnoy", sequence: ["punchChest", "knife"] },
  });

  const applied = context.applyStoredComboTemplateForMainSelection({ silent: true });

  assert.equal(applied, true);
  assert.deepEqual(
    context.state.bossQueue,
    [{ key: "punchChest", count: 1 }, { key: "knife", count: 1 }],
  );
  assert.equal(context.renderCount, 1);
});

test("queue combo editor saves a template without replacing current boss attacks", () => {
  const calls = [];
  const context = {
    state: { bossComboDialogApplyToMainSelection: false },
    applyBossComboSequenceToQueue(sequence) {
      calls.push(["queue", ...sequence]);
    },
    syncMainBossSelectors(bossId, comboMode) {
      calls.push(["selection", bossId, comboMode]);
    },
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "applyBossComboDialogTemplateToMainSelection"),
      "this.applyBossComboDialogTemplateToMainSelection = applyBossComboDialogTemplateToMainSelection;",
    ].join("\n"),
    context,
  );

  const applied = context.applyBossComboDialogTemplateToMainSelection(
    12,
    "blotnoy",
    ["punchChest", "knife"],
  );

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test("regular combo editor still applies a template to the selected boss", () => {
  const calls = [];
  const context = {
    state: { bossComboDialogApplyToMainSelection: true },
    applyBossComboSequenceToQueue(sequence) {
      calls.push(["queue", ...sequence]);
    },
    syncMainBossSelectors(bossId, comboMode) {
      calls.push(["selection", bossId, comboMode]);
    },
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "applyBossComboDialogTemplateToMainSelection"),
      "this.applyBossComboDialogTemplateToMainSelection = applyBossComboDialogTemplateToMainSelection;",
    ].join("\n"),
    context,
  );

  const applied = context.applyBossComboDialogTemplateToMainSelection(
    12,
    "blotnoy",
    ["punchChest", "knife"],
  );

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ["queue", "punchChest", "knife"],
    ["selection", 12, "blotnoy"],
  ]);
});

test("auto queue opens combo setup in save-only mode", async () => {
  let openOptions = null;
  const target = {
    entry: { bossId: 12, comboMode: "blotnoy", label: "#12 Test" },
    comboModes: ["blotnoy"],
  };
  const context = {
    getBossComboSetupPromptTargets() {
      return [target];
    },
    async confirmBossComboSetupOffer() {
      return "configure";
    },
    normalizeBossComboMode(value) {
      return String(value || "").trim().toLowerCase();
    },
    openBossComboDialog(options) {
      openOptions = options;
    },
    setBossComboDialogNote() {},
    async waitForBossComboDialogClose() {},
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "offerBossComboSetupForQueue"),
      "this.offerBossComboSetupForQueue = offerBossComboSetupForQueue;",
    ].join("\n"),
    context,
  );

  await context.offerBossComboSetupForQueue([target.entry]);

  assert.equal(openOptions.preferredBossId, 12);
  assert.equal(openOptions.preferredMode, "blotnoy");
  assert.equal(openOptions.forcePreferred, true);
  assert.equal(openOptions.applyToMainSelection, false);
});
