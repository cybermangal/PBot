const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { __test } = require("../lib/ui-service");

const projectRoot = path.resolve(__dirname, "..", "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("boss surrender requires a confirmed, unchanged active fight", () => {
  const active = {
    stateReliable: true,
    stateUnknown: false,
    hasSession: true,
    isCompleted: false,
    currentHp: 500,
    sessionId: "fight-1",
    bossId: 17,
  };

  assert.throws(
    () => __test.validateBossSurrenderRequest({}, active),
    /Подтвердите выход/,
  );
  assert.throws(
    () => __test.validateBossSurrenderRequest({ confirmed: true }, { ...active, stateUnknown: true }),
    /Не удалось проверить/,
  );
  assert.throws(
    () => __test.validateBossSurrenderRequest({ confirmed: true }, { ...active, hasSession: false }),
    /не найден/,
  );
  assert.throws(
    () => __test.validateBossSurrenderRequest({
      confirmed: true,
      sessionId: "fight-2",
      bossId: 17,
    }, active),
    /бой изменился/,
  );
  assert.throws(
    () => __test.validateBossSurrenderRequest({
      confirmed: true,
      sessionId: "fight-1",
      bossId: 3,
    }, active),
    /босс изменился/,
  );
  assert.deepEqual(
    __test.validateBossSurrenderRequest({
      confirmed: true,
      sessionId: "fight-1",
      bossId: 17,
    }, active),
    { sessionId: "fight-1", bossId: 17 },
  );
  assert.deepEqual(
    __test.validateBossSurrenderRequest({
      confirmed: true,
      sessionId: "fight-1",
      bossId: 17,
    }, { ...active, currentHp: null }),
    { sessionId: "fight-1", bossId: 17 },
  );
});

test("active fight UI exposes a confirmed two-soap surrender action", () => {
  const html = readProjectFile("ui/index.html");
  const app = readProjectFile("ui/app.js");
  const server = readProjectFile("scripts/ui-server.js");

  assert.match(html, /id="boss-surrender-btn"[\s\S]*?Выйти из боя · 2 мыла/);
  assert.match(html, /id="boss-surrender-dialog"/);
  assert.match(html, /id="boss-surrender-confirm"[\s\S]*?Да, выйти за 2 мыла/);
  assert.match(app, /confirmBossSurrender\(context\)/);
  assert.match(app, /"POST", "\/api\/bosses\/surrender", \{\s*confirmed: true,/);
  assert.match(server, /POST" && pathname === "\/api\/bosses\/surrender"/);
});
