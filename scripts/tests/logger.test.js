const assert = require("node:assert/strict");
const test = require("node:test");

const { REDACTED, sanitizeForLog, __test } = require("../lib/logger");

test("logger redacts credentials while retaining useful interaction fields", () => {
  const result = sanitizeForLog({
    endpoint: "/api/boss/hit",
    accessToken: "access-secret",
    headers: { Authorization: "Bearer bearer-secret" },
    initData: "query_id=secret",
    detail: "failed at ?token=query-secret&bossId=7",
    bossId: 7,
  });

  assert.equal(result.endpoint, "/api/boss/hit");
  assert.equal(result.accessToken, REDACTED);
  assert.equal(result.headers.Authorization, REDACTED);
  assert.equal(result.initData, REDACTED);
  assert.equal(result.detail.includes("query-secret"), false);
  assert.equal(result.bossId, 7);
});

test("logger bounds oversized payloads and circular structures", () => {
  const circular = { values: Array.from({ length: 55 }, (_, index) => index) };
  circular.self = circular;

  const result = sanitizeForLog(circular);

  assert.equal(result.values.length, 51);
  assert.match(result.values[50], /truncated 5 items/);
  assert.equal(result.self, "<circular>");
});

test("logger pruning keeps recent files within the configured total", () => {
  const day = 24 * 60 * 60_000;
  const nowMs = Date.parse("2026-08-18T00:00:00.000Z");
  const files = [
    { path: "old.jsonl", size: 40, mtimeMs: nowMs - 20 * day },
    { path: "large.jsonl", size: 70, mtimeMs: nowMs - 2 * day },
    { path: "current.jsonl", size: 40, mtimeMs: nowMs },
  ];

  assert.deepEqual(
    __test.selectLogFilesToPrune(files, {
      nowMs,
      retentionDays: 14,
      maxTotalBytes: 80,
      excludePaths: ["current.jsonl"],
    }),
    ["old.jsonl", "large.jsonl"],
  );
});
