const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appSource = fs.readFileSync(path.resolve(__dirname, "../../ui/app.js"), "utf8");
const stylesSource = fs.readFileSync(path.resolve(__dirname, "../../ui/styles.css"), "utf8");

function extractFunctionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}`);
  assert.notEqual(start, -1, `${functionName} not found`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
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

test("mini-game balance rendering prefers normalized balances and supports raw aliases", () => {
  const context = {};
  vm.runInNewContext(
    [
      extractFunctionSource(appSource, "getMiniGameBalanceValue"),
      "this.getMiniGameBalanceValue = getMiniGameBalanceValue;",
    ].join("\n"),
    context,
  );

  const definition = { key: "pink_matches", aliases: ["pinkMatches"] };
  assert.equal(context.getMiniGameBalanceValue({
    balances: { pink_matches: 300 },
    pinkMatches: 10,
  }, definition), 300);
  assert.equal(context.getMiniGameBalanceValue({ pinkMatches: 10 }, definition), 10);
});

test("gambling cards use the game currency icons with cropped icon frames", () => {
  assert.match(appSource, /\/slots\/slots_match_gr\.webp/);
  assert.match(appSource, /\/slots\/slot_match_ora\.webp/);
  assert.match(appSource, /\/slots\/slot_match_red\.webp/);
  assert.match(appSource, /\/poker\/pokerMatch\.webp/);
  assert.match(appSource, /\/FortuneScene\/Match_blue_reward\.webp/);
  assert.match(appSource, /\/FortuneScene\/biletic_jackpot\.webp/);
  assert.match(appSource, /renderMiniGameBalances\("fartovy"/);
  assert.match(appSource, /renderMiniGameBalances\("poker"/);
  assert.match(appSource, /renderMiniGameBalances\("wheel"/);
  assert.match(stylesSource, /\.mini-game-balance-icon\.is-cropped img\s*\{/);
});

test("running autoplay locks only its own manual game controls", () => {
  assert.match(appSource, /const fartovyLocked = automationRunning && automationKind === "fartovy"/);
  assert.match(appSource, /const katalaLocked = automationRunning && automationKind === "katala"/);
  assert.match(appSource, /const pokerLocked = automationRunning && automationKind === "poker"/);
  assert.match(appSource, /const wheelLocked = automationRunning && automationKind === "wheel"/);
  assert.match(appSource, /data-game-action="katala-start"[\s\S]*?\$\{katalaDisabled\}/);
  assert.match(appSource, /data-game-action="wheel-buy"[\s\S]*?\$\{wheelDisabled\}/);
  assert.match(appSource, /wheelTickets <= 0 \|\| wheelLocked/);
  assert.doesNotMatch(appSource, /const disabled = automationRunning \? "disabled" : ""/);
});

test("mini-game history names only the confirmed new wearable from a card combination", () => {
  const context = {};
  vm.runInNewContext(
    [
      "const formatNumber = (value) => String(value);",
      extractFunctionSource(appSource, "formatPlayingCard"),
      extractFunctionSource(appSource, "summarizeMiniGameReward"),
      extractFunctionSource(appSource, "summarizeMiniGameWearable"),
      extractFunctionSource(appSource, "describeMiniGameOutcome"),
      "this.describeMiniGameOutcome = describeMiniGameOutcome;",
    ].join("\n"),
    context,
  );

  const description = context.describeMiniGameOutcome({
    ok: true,
    outcome: {
      message: "Комбинация KK",
      cards: ["K_spades", "K_clubs"],
      reward: { cigarettes: 700, clothingId: 19 },
      rewardWearables: [{
        type: "clothing",
        id: 19,
        name: "Шляпа",
        setName: "Комплект \"Катала\"",
      }],
      newWearables: [{
        type: "tattoo",
        id: 42,
        zone: 4,
        name: "Падший Ангел",
        setName: "Комплект \"Падший Ангел\"",
      }],
    },
  });

  assert.equal(
    description,
    "Комбинация KK · K♠, K♣ · +700 папирос · Выпало новое: Падший Ангел · зона 4 · Комплект \"Падший Ангел\"",
  );
  assert.doesNotMatch(description, /Шляпа/);
});
