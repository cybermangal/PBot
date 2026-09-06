const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const appPath = path.resolve(__dirname, "../../ui/app.js");
const indexPath = path.resolve(__dirname, "../../ui/index.html");
const stylesPath = path.resolve(__dirname, "../../ui/styles.css");
const appSource = fs.readFileSync(appPath, "utf8");
const indexSource = fs.readFileSync(indexPath, "utf8");
const stylesSource = fs.readFileSync(stylesPath, "utf8");

function extractFunctionSource(source, functionName) {
  const signature = `function ${functionName}(`;
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${functionName} not found`);
  const paramsEnd = source.indexOf(")", start);
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

test("damage friend invites use only the first 20 leaderboard players", () => {
  const context = {};
  vm.runInNewContext(
    [
      "const DAMAGE_INVITE_TOP_LIMIT = 20;",
      "const state = { friendsDamageReports: {} };",
      extractFunctionSource(appSource, "getDamageInviteCandidates"),
      "this.state = state;",
      "this.getDamageInviteCandidates = getDamageInviteCandidates;",
    ].join("\n"),
    context,
  );

  context.state.friendsDamageReports.daily = {
    selfUserId: "10",
    summary: {
      topAll: Array.from({ length: 25 }, (_, index) => ({
        userId: String(index + 1),
        isFriend: index === 0,
      })),
    },
  };

  const candidates = context.getDamageInviteCandidates("daily");
  assert.equal(candidates.length, 18);
  assert.equal(candidates.some((row) => row.userId === "1"), false);
  assert.equal(candidates.some((row) => Number(row.userId) > 20), false);
});

test("brigade damage invites use only non-friends from the brigade leaderboard", () => {
  const context = {};
  vm.runInNewContext(
    [
      "const DAMAGE_INVITE_TOP_LIMIT = 20;",
      'const state = { friendsDamageReports: {}, friendsDamageScope: "guild" };',
      extractFunctionSource(appSource, "getDamageInviteCandidates"),
      "this.state = state;",
      "this.getDamageInviteCandidates = getDamageInviteCandidates;",
    ].join("\n"),
    context,
  );

  context.state.friendsDamageReports.daily = {
    selfUserId: "10",
    summary: {
      topAll: [
        { userId: "999", isFriend: false },
      ],
      topGuild: [
        { userId: "10", isFriend: false },
        { userId: "20", isFriend: true },
        { userId: "30", isFriend: false },
        { userId: "40", isFriend: false },
      ],
    },
  };

  const candidates = context.getDamageInviteCandidates("daily");
  assert.deepEqual(Array.from(candidates, (row) => row.userId), ["30", "40"]);
});

test("damage invite controls include weekly reports and use the top-20 limit", () => {
  const panelSource = extractFunctionSource(appSource, "renderFriendsDamagePanel");
  const inviteSource = extractFunctionSource(appSource, "handleFriendsDamageInvite");

  assert.match(panelSource, /DAMAGE_PERIOD_ORDER\.includes\(period\)/);
  assert.match(panelSource, /Добавление из топ-\$\{DAMAGE_INVITE_TOP_LIMIT\}/);
  assert.match(panelSource, /Добавление из топ-\$\{DAMAGE_INVITE_TOP_LIMIT\} бригады/);
  assert.match(inviteSource, /damage_guild_top/);
  assert.match(inviteSource, /max: DAMAGE_INVITE_TOP_LIMIT/);
  assert.match(appSource, /apiRequest\("POST", "\/api\/damage\/intel", \{ top: DAMAGE_INVITE_TOP_LIMIT \}\)/);
  assert.match(appSource, /friendsDamageInviteRunning:\s*\{[^}]*weekly: false/s);
});

test("friend batch progress is rendered in both friends and damage sections", () => {
  const progressTargets = indexSource.match(/data-friends-batch-progress/g) || [];
  const renderSource = extractFunctionSource(appSource, "renderFriendsBatchProgress");

  assert.equal(progressTargets.length, 2);
  assert.match(renderSource, /querySelectorAll\("\[data-friends-batch-progress\]"\)/);
  assert.match(renderSource, /is-indeterminate/);
  assert.match(renderSource, /talentTotalsLoaded/);
  assert.match(renderSource, /incomingRequestsLoaded/);
  assert.match(stylesSource, /@keyframes friends-batch-indeterminate/);
});

test("damage cards and batch progress use Russian UI text", () => {
  const panelSource = extractFunctionSource(appSource, "renderFriendsDamagePanel");
  const renderSource = extractFunctionSource(appSource, "renderFriendsDamage");
  const progressSource = extractFunctionSource(appSource, "renderFriendsBatchProgress");

  assert.match(panelSource, /Период сравнения/);
  assert.match(panelSource, /Урон друзей/);
  assert.match(panelSource, /Топ-5 игроков/);
  assert.match(renderSource, /Вы не состоите в бригаде/);
  assert.match(renderSource, /isConfirmedWithoutGuild/);
  assert.doesNotMatch(panelSource, /Brigade Damage|Self Damage|Top All|Window:|Adding\.\.\.|not-friends/);
  assert.match(progressSource, /Обработано/);
  assert.match(progressSource, /Осталось/);
  assert.doesNotMatch(progressSource, /Preparing targets|Profile pages|ETA/);
});

test("damage layout groups status, progress, summary, cards, and invite action", () => {
  const notePosition = indexSource.indexOf('id="friends-damage-note"');
  const progressPosition = indexSource.indexOf('id="friends-damage-batch-progress"');
  const summaryPosition = indexSource.indexOf('id="friends-damage-summary"');

  assert.ok(notePosition < progressPosition);
  assert.ok(progressPosition < summaryPosition);
  assert.match(stylesSource, /\.friends-damage-window\s*\{/);
  assert.match(stylesSource, /\.friends-damage-invite\s*\{/);
});
