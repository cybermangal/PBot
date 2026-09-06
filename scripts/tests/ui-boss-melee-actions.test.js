const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..", "..");
const appSource = fs.readFileSync(path.join(root, "ui", "app.js"), "utf8");
const htmlSource = fs.readFileSync(path.join(root, "ui", "index.html"), "utf8");
const styleSource = fs.readFileSync(path.join(root, "ui", "styles.css"), "utf8");

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}`;
  const start = source.indexOf(signature);
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

function createRenderContext() {
  const context = {
    BOSS_MELEE_ACTION_KEYS: new Set(["punchChest", "kickBalls", "pokeEyes", "kneeEar"]),
    BOSS_WEAPON_ACTION_KEYS: new Set(["poison", "gunshot", "knife"]),
    BOSS_WEAPON_BATCH_COUNTS: [1, 10, 50, 100, 1000],
    BOSS_WEAPON_BUY_BATCH_COUNTS: [1, 10, 100],
    BOSS_FIXED_PRICES: { poison: 18, gunshot: 5, knife: 4, restoreMelee: 3 },
    BOSS_MELEE_ACTION_LABELS: {
      punchChest: "Удар в грудь",
      kickBalls: "Удар в пах",
      pokeEyes: "Тычок в глаза",
      kneeEar: "Коленом в ухо",
    },
    BOSS_WEAPON_LABELS: {
      poison: "Яд",
      gunshot: "Самопал",
      knife: "Финка",
    },
    BOSS_MELEE_ACTION_ICON_URLS: {
      punchChest: "/icon/4/1.jpg",
      kickBalls: "/icon/4/2.jpg",
      pokeEyes: "/icon/4/3.jpg",
      kneeEar: "/icon/4/4.jpg",
    },
    BOSS_WEAPON_ICON_URLS: {
      poison: "/poison.webp",
      gunshot: "/gunshot.webp",
      knife: "/knife.webp",
    },
    state: {
      bossState: null,
      bossMeleeRestoreRunning: new Set(),
      economy: { currencies: { rubles: 100 } },
    },
    escapeHtml(value) {
      return String(value);
    },
    formatBossCompactNumber(value) {
      return String(value);
    },
    formatNumber(value) {
      return String(value);
    },
  };
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "getBossCombatActionLabel"),
      extractFunctionSource(appSource, "getBossCombatActionIconUrl"),
      extractFunctionSource(appSource, "getBossMeleeCooldownState"),
      extractFunctionSource(appSource, "formatBossMeleeCooldownRemaining"),
      extractFunctionSource(appSource, "formatBossMeleeReadyTime"),
      extractFunctionSource(appSource, "formatBossMeleeCooldownLabel"),
      extractFunctionSource(appSource, "renderBossCombatAction"),
      "this.renderBossCombatAction = renderBossCombatAction;",
    ].join("\n"),
    context,
  );
  return context;
}

test("melee rows render official icons, names, damage, and one direct hit button", () => {
  const context = createRenderContext();
  const markup = context.renderBossCombatAction({
    key: "punchChest",
    itemLabel: "Удар в грудь",
    damage: 24,
    available: true,
    hasCharges: false,
  }, true);

  assert.match(markup, /\/icon\/4\/1\.jpg/);
  assert.match(markup, /Удар в грудь/);
  assert.match(markup, /24 урона/);
  assert.match(markup, /aria-label="Пробить: Удар в грудь"/);
  assert.doesNotMatch(markup, /<select/);
  assert.doesNotMatch(markup, /×1/);
});

test("melee cooldown rows show the countdown and three-ruble restore action", () => {
  const context = createRenderContext();
  context.state.bossState = {
    snapshot: {
      summary: {
        meleeCooldowns: {
          punchChest: {
            active: true,
            readyAt: "2099-07-29T18:00:30.000Z",
            remainingMs: 20_000,
            restorePriceRubles: 3,
          },
        },
      },
    },
  };
  const markup = context.renderBossCombatAction({
    key: "punchChest",
    damage: 24,
    available: true,
    hasCharges: false,
  }, true);

  assert.match(markup, /class="boss-weapon-cooldown js-boss-melee-cooldown"/);
  assert.match(markup, /КД/);
  assert.match(markup, /js-boss-melee-restore/);
  assert.match(markup, /3 ₽/);
  assert.doesNotMatch(markup, /js-boss-weapon-hit/);
});

test("consumable rows retain stock and safe batch choices", () => {
  const context = createRenderContext();
  const markup = context.renderBossCombatAction({
    key: "poison",
    itemLabel: "Яд",
    damage: 27213,
    count: 1070,
    available: true,
    hasCharges: true,
  }, true);

  assert.match(markup, /×1070/);
  assert.match(markup, /<select/);
  for (const count of [1, 10, 50, 100, 1000]) {
    assert.match(markup, new RegExp(`value="${count}"`));
  }
  for (const count of [1, 10, 100]) {
    assert.match(markup, new RegExp(`data-count="${count}"`));
  }
  assert.match(markup, /×10 · 180 ₽/);
});

test("active fight groups actions compactly below the fight state", () => {
  assert.match(htmlSource, />Удары и оружие</);
  assert.match(htmlSource, /class="boss-combat-auxiliary"/);
  assert.match(appSource, /renderBossCombatActionGroup\("Рукопашные"/);
  assert.match(appSource, /renderBossCombatActionGroup\("Оружие"/);
  assert.match(styleSource, /\.boss-combat-action-grid\s*\{[\s\S]*auto-fit/);
  assert.match(styleSource, /\.boss-fight-layout\s*\{[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(styleSource, /\.boss-weapon-meta \.boss-weapon-cooldown/);
  assert.match(appSource, /\/api\/bosses\/restore-melee/);
  assert.match(appSource, /scheduleBossStartUiSync\(\)/);
});
