const assert = require("node:assert/strict");
const test = require("node:test");

const { __test } = require("../lib/damage-history");

function snapshot({ generatedAt, dayKey, weekStartDayKey = "2026-07-06", kind = "hourly" }) {
  return {
    generatedAt,
    snapshotKind: kind,
    dayKey,
    timeZoneOffsetMinutes: 180,
    timeZoneOffset: "+03:00",
    reset: { weekStartDayKey },
  };
}

test("hourly baseline prefers a nearby sample and rejects stale history", () => {
  const end = snapshot({ generatedAt: "2026-07-11T09:00:00.000Z", dayKey: "2026-07-11" });
  const stale = snapshot({ generatedAt: "2026-03-27T21:40:03.000Z", dayKey: "2026-03-28", weekStartDayKey: "2026-03-23", kind: "boundary" });
  const close = snapshot({ generatedAt: "2026-07-11T08:00:00.000Z", dayKey: "2026-07-11" });
  const tooRecent = snapshot({ generatedAt: "2026-07-11T08:40:00.000Z", dayKey: "2026-07-11" });

  assert.equal(__test.selectHourlyBaseline(end, [stale, tooRecent, close]), close);
  assert.equal(__test.selectHourlyBaseline(end, [stale, tooRecent]), null);
});

test("daily baseline uses the last compatible sample before local midnight", () => {
  const end = snapshot({ generatedAt: "2026-07-11T09:00:00.000Z", dayKey: "2026-07-11" });
  const nearClose = snapshot({ generatedAt: "2026-07-10T20:50:00.000Z", dayKey: "2026-07-10", kind: "boundary" });
  const result = __test.selectDailyBaseline(end, [nearClose]);

  assert.equal(result.baseline, nearClose);
  assert.equal(result.baselineType, "previous_day_near_close");
  assert.equal(result.complete, true);
});

test("daily baseline falls back to the first same-day sample without claiming completeness", () => {
  const end = snapshot({ generatedAt: "2026-07-11T09:00:00.000Z", dayKey: "2026-07-11" });
  const firstToday = snapshot({ generatedAt: "2026-07-11T06:00:00.000Z", dayKey: "2026-07-11" });
  const result = __test.selectDailyBaseline(end, [firstToday]);

  assert.equal(result.baseline, firstToday);
  assert.equal(result.baselineType, "current_day_first_sample");
  assert.equal(result.complete, false);
});

test("daily history waits instead of showing a meaningless seconds-long partial window", () => {
  const end = snapshot({ generatedAt: "2026-07-11T09:02:00.000Z", dayKey: "2026-07-11" });
  const firstToday = snapshot({ generatedAt: "2026-07-11T09:00:00.000Z", dayKey: "2026-07-11" });
  const result = __test.selectDailyBaseline(end, [firstToday]);

  assert.equal(result.baseline, null);
});

test("hourly baseline loader reads only the closest timestamp candidate", async () => {
  const end = snapshot({ generatedAt: "2026-07-11T09:00:00.000Z", dayKey: "2026-07-11" });
  const close = snapshot({ generatedAt: "2026-07-11T08:00:00.000Z", dayKey: "2026-07-11" });
  const loadedPaths = [];
  const byPath = new Map([
    ["close.json", close],
    ["older.json", snapshot({ generatedAt: "2026-07-11T07:45:00.000Z", dayKey: "2026-07-11" })],
  ]);

  const result = await __test.loadHourlyBaselineSnapshot(end, {
    entries: [
      { filePath: "older.json", generatedAt: "2026-07-11T07:45:00.000Z", dayKey: "2026-07-11" },
      { filePath: "close.json", generatedAt: "2026-07-11T08:00:00.000Z", dayKey: "2026-07-11" },
      { filePath: "recent.json", generatedAt: "2026-07-11T08:40:00.000Z", dayKey: "2026-07-11" },
    ],
    async loadSnapshot(filePath) {
      loadedPaths.push(filePath);
      return byPath.get(filePath) || null;
    },
  });

  assert.equal(result, close);
  assert.deepEqual(loadedPaths, ["close.json"]);
});

test("daily baseline loader reads the latest previous-day snapshot without loading the full day", async () => {
  const end = snapshot({ generatedAt: "2026-07-11T09:00:00.000Z", dayKey: "2026-07-11" });
  const nearClose = snapshot({ generatedAt: "2026-07-10T20:50:00.000Z", dayKey: "2026-07-10", kind: "boundary" });
  const loadedPaths = [];

  const result = await __test.loadDailyBaselineSnapshot(end, {
    entries: [
      { filePath: "first-today.json", generatedAt: "2026-07-10T21:00:00.000Z", dayKey: "2026-07-11" },
      { filePath: "near-close.json", generatedAt: "2026-07-10T20:50:00.000Z", dayKey: "2026-07-10" },
      { filePath: "older.json", generatedAt: "2026-07-10T20:35:00.000Z", dayKey: "2026-07-10" },
    ],
    async loadSnapshot(filePath) {
      loadedPaths.push(filePath);
      return filePath === "near-close.json" ? nearClose : null;
    },
  });

  assert.equal(result.baseline, nearClose);
  assert.equal(result.baselineType, "previous_day_near_close");
  assert.deepEqual(loadedPaths, ["near-close.json"]);
});

test("guild status and leaderboard rows preserve the roster needed for brigade damage", () => {
  const guild = __test.normalizeGuildStatus({
    inGuild: true,
    guild: { guildId: 307, name: "БАЗАР", memberCount: 3, level: 11 },
    members: [
      { userId: 10, nickname: "Leader" },
      { userId: 20, nickname: "Member" },
      { userId: 20, nickname: "Duplicate" },
    ],
  });
  const rows = __test.normalizeLeaderboardRows([
    { userId: 10, nickname: "Leader", rank: 1, damage: 450 },
    { userId: 20, nickname: "Member", rank: 2, damage: 300 },
    { userId: 30, nickname: "Other", rank: 3, damage: 200 },
  ], [], guild.memberIds);
  const aggregate = __test.buildAggregate(rows, "10", "damage", 10);

  assert.equal(guild.name, "БАЗАР");
  assert.deepEqual(guild.memberIds, ["10", "20"]);
  assert.equal(aggregate.guild.players, 2);
  assert.equal(aggregate.guild.totalDamage, 750);
  assert.equal(aggregate.guild.sharePct, 78.95);
  assert.deepEqual(aggregate.topGuild.map((row) => row.userId), ["10", "20"]);
});
