const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.resolve(__dirname, "../../ui/app.js"), "utf8");

function extractFunctionSource(functionName) {
  const signature = `function ${functionName}(`;
  const start = appSource.indexOf(signature);
  assert.notEqual(start, -1, `${functionName} not found`);
  const bodyStart = appSource.indexOf("{", appSource.indexOf(")", start));
  let depth = 0;

  for (let index = bodyStart; index < appSource.length; index += 1) {
    if (appSource[index] === "{") {
      depth += 1;
    } else if (appSource[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return appSource.slice(start, index + 1);
      }
    }
  }

  assert.fail(`${functionName} closing brace not found`);
}

function loadBossHpFormatters() {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource("formatNumber"),
      extractFunctionSource("formatBossPacanskyHp"),
      "this.formatBossPacanskyHp = formatBossPacanskyHp;",
    ].join("\n"),
    context,
  );
  return context;
}

test("boss catalog formats pacansky HP with repeated к suffixes", () => {
  const { formatBossPacanskyHp } = loadBossHpFormatters();

  assert.equal(formatBossPacanskyHp(999), "999");
  assert.equal(formatBossPacanskyHp(1_000), "1к");
  assert.equal(formatBossPacanskyHp(10_000), "10к");
  assert.equal(formatBossPacanskyHp(1_000_000), "1кк");
  assert.equal(formatBossPacanskyHp(1_500_000), "1,5кк");
  assert.equal(formatBossPacanskyHp(1_000_000_000), "1ккк");
});

test("boss catalog uses pacansky HP without changing the queue picker labels", () => {
  const catalogSource = extractFunctionSource("renderBossCatalog");
  const queuePickerSource = extractFunctionSource("buildBossSelectHpLabel");

  assert.match(catalogSource, /formatBossPacanskyHp\(catalogHp\)/);
  assert.match(catalogSource, /Пацанский режим/);
  assert.doesNotMatch(queuePickerSource, /formatBossPacanskyHp/);
  assert.match(queuePickerSource, /hpModes\.map/);
});
