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

test("damage rewards support tattoos, keys and rubles from live scaling without a queue candidate", () => {
  const scaling = {
    enabled: true, thresholds: [10_000_000, 20_000_000, 30_000_000],
    keyBonusEnabled: true, keyBonusSteps: 1, keyBonusThresholds: [20_000_000, 40_000_000],
    rublesByDamage: { threshold: 30_000_000, amount: 50 },
  };
  const context = { escapeHtml: String, formatBossCompactNumber: String };
  vm.runInNewContext([
    extractFunctionSource("formatNumber"),
    extractFunctionSource("getBossDamageRewardTiers"),
    extractFunctionSource("formatBossDamageRewards"),
    extractFunctionSource("renderBossDamageRewards"),
  ].join("\n"), context);
  const render = (damage, damageScaling = scaling) => context.renderBossDamageRewards({ personalDamage: damage, damageScaling }, 30_000_000);
  assert.match(render(9_999_990), /Осталось 10 урона/);
  assert.match(render(10_000_000), /Наколки: \+1/);
  assert.match(render(20_000_000), /Порог достигнут/);
  assert.match(render(30_000_000), /Наколки: \+3 · Ключи: \+1 · Рубли: \+50/);
  assert.equal((render(30_000_000).match(/class="fight-reward-marker is-reached/g) || []).length, 3);
  assert.match(render(0), /left: 33.33%/);
  assert.match(render(0), /left: 100.00%/);
  assert.equal(render(0, null), "");
  assert.equal(render(0, {}), "");
  assert.doesNotMatch(render(0), /fight-bar-card|fight-reward-legend/);
  assert.doesNotMatch(render(0, { ...scaling, enabled: false, keyBonusEnabled: false }), /Наколки:|Ключи:/);
  assert.match(render(0, { ...scaling, enabled: false, keyBonusEnabled: false }), /Рубли: \+50/);
  assert.equal(context.getBossDamageRewardTiers(scaling).length, 3, "same-damage rewards share a marker");
  assert.equal(context.getBossDamageRewardTiers({ enabled: true, thresholds: [-1, NaN, Infinity, 0] }).length, 0);
});

test("fight bars put reward markers inside personal damage and keep only two cards", () => {
  const target = { innerHTML: "" };
  const live = {
    activeSession: {}, maxHp: 1_200_000_000, currentHp: 168_000_000, personalDamage: 15_000_000,
    damageScaling: { enabled: true, thresholds: [10_000_000, 20_000_000, 30_000_000] },
  };
  const context = {
    $: () => target, resolveBossLiveContext: () => live,
    renderBossSurrenderButton() {}, renderBossActiveAvatar() {}, renderBossNeedleAction() {},
    escapeHtml: String, formatBossHpValue: String, formatBossCompactNumber: String,
  };
  vm.runInNewContext([
    "formatNumber", "getBossDamageRewardTiers", "formatBossDamageRewards", "renderBossDamageRewards", "renderBossFightBars",
  ].map(extractFunctionSource).join("\n"), context);
  context.renderBossFightBars();
  assert.equal((target.innerHTML.match(/class="fight-bar-card"/g) || []).length, 2);
  assert.match(target.innerHTML, /fight-bar-fill-damage" style="width: 50.00%/);
  assert.match(target.innerHTML, /Мой урон[\s\S]*fight-reward-marker/);
  assert.match(target.innerHTML, /для доп. наград/);
  live.personalDamage = 40_000_000;
  context.renderBossFightBars();
  assert.match(target.innerHTML, /fight-bar-fill-damage" style="width: 100.00%/);
  live.damageScaling = null;
  context.renderBossFightBars();
  assert.doesNotMatch(target.innerHTML, /fight-reward-marker|для доп. наград/);
  assert.match(target.innerHTML, /fight-bar-fill-damage" style="width: 3.33%/);
});

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
