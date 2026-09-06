const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const vm = require("node:vm");
const { createComboDirectory, normalizeComboDirectory } = require("../lib/combo-directory");
const today = "2026-09-03";
function fixture() {
  return { version: 1, mskDate: today, updatedAt: `${today}T12:00:00Z`, combos: [{ bossId: 5, comboMode: "pacansky", sequence: ["knife", "kneeEar", "knife"] }] };
}
const json = (data, headers = {}) => new Response(JSON.stringify(data), { headers });
async function cachePath(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-combo-reader-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return path.join(dir, "cache.json");
}
test("directory validates entire sequences and duplicates instead of silently shortening them", () => {
  const bad = fixture(); bad.combos[0].sequence.push("unknown");
  assert.throws(() => normalizeComboDirectory(bad));
  const duplicate = fixture(); duplicate.combos.push(duplicate.combos[0]);
  assert.throws(() => normalizeComboDirectory(duplicate));
  assert.equal(normalizeComboDirectory(fixture()).combos[0].sequence.length, 3);
});
test("parallel callers share a fetch and no authentication is sent to public GitHub", async (t) => {
  let calls = 0;
  const store = createComboDirectory({ cachePath: await cachePath(t), now: () => Date.parse(`${today}T12:10:00Z`), fetchImpl: async (_, options) => {
    calls++; assert.equal(options.headers.Authorization, undefined); return json(fixture());
  } });
  const [a, b] = await Promise.all([store.getDirectory(), store.getDirectory()]);
  assert.equal(a.status, "ok"); assert.equal(b.combos.length, 1);
  await store.getDirectory(); assert.equal(calls, 1);
});
test("today cache survives network failure, but becomes unusable at Moscow midnight", async (t) => {
  let clock = Date.parse(`${today}T20:59:50Z`), fail = false;
  const file = await cachePath(t);
  const store = createComboDirectory({ cachePath: file, now: () => clock, ttlMs: 0, fetchImpl: async () => { if (fail) throw new Error(); return json(fixture()); } });
  await store.getDirectory(); fail = true;
  assert.equal((await store.getDirectory()).status, "cached");
  clock = Date.parse(`${today}T21:00:01Z`);
  const nextDay = await store.getDirectory();
  assert.equal(nextDay.mskDate, "2026-09-04"); assert.equal(nextDay.combos.length, 0);
  const restarted = createComboDirectory({ cachePath: file, now: () => clock, fetchImpl: async () => { throw new Error(); } });
  assert.equal((await restarted.getDirectory()).combos.length, 0);
});
test("304 respects date boundaries and ETag; invalid payload preserves good current cache", async (t) => {
  let calls = 0;
  const store = createComboDirectory({ cachePath: await cachePath(t), now: () => Date.parse(`${today}T12:10:00Z`), ttlMs: 0, fetchImpl: async (_, options) => {
    calls++;
    if (calls === 1) return json(fixture(), { etag: "v1" });
    assert.equal(options.headers["If-None-Match"], "v1");
    if (calls === 2) return new Response(null, { status: 304 });
    return json({ ...fixture(), version: 2 });
  } });
  await store.getDirectory(); assert.equal((await store.getDirectory()).status, "ok");
  const result = await store.getDirectory(); assert.equal(result.status, "cached"); assert.equal(result.combos.length, 1);
});
test("old upstream JSON cannot be presented as today's combos", async (t) => {
  const store = createComboDirectory({ cachePath: await cachePath(t), now: () => Date.parse("2026-09-04T12:00:00Z"), fetchImpl: async () => json(fixture()) });
  assert.equal((await store.getDirectory()).combos.length, 0);
});
test("UI imported combos are green, fill normal hit queues, and manual overrides win", async () => {
  const source = await fs.readFile(path.resolve(__dirname, "../../ui/app.js"), "utf8");
  function extract(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0);
    const next = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, next);
  }
  let date = today;
  const context = {
    state: { bossComboTemplates: {} }, getMoscowDateKey: () => date,
    ensureBossComboTemplatesCurrentDate() {}, normalizeBossComboMode: (s) => String(s || "").trim().toLowerCase(),
    BOSS_COMBO_ACTION_KEYS: new Set(["knife", "kneeEar"]),
    escapeHtml: (s) => s, formatComboModeLabel: (s) => s, getBossComboModeMarker: () => "П",
  };
  vm.runInNewContext([
    "buildBossComboTemplateKey", "applyBossComboLibrary", "getEffectiveBossComboTemplates", "getBossComboTemplate",
    "hasBossComboTemplate", "resolveBossComboTemplateForBossAndMode", "normalizeBossRunQueueHitTypes", "resolveBossRunQueueHitTypes", "renderBossComboModeMarks",
  ].map(extract).join("\n"), context);
  context.applyBossComboLibrary(fixture());
  assert.equal(context.getBossComboTemplate(5, "pacansky").automatic, true);
  assert.match(context.renderBossComboModeMarks(["pacansky"], 5), /is-ready/);
  const queueItem = { bossId: 5, comboMode: "pacansky" };
  assert.deepEqual(Array.from(context.resolveBossRunQueueHitTypes(queueItem)), ["knife", "kneeEar", "knife"]);
  context.state.bossComboTemplates["5:pacansky"] = { ...queueItem, sequence: ["kneeEar"] };
  assert.deepEqual(Array.from(context.resolveBossRunQueueHitTypes(queueItem)), ["kneeEar"]);
  delete context.state.bossComboTemplates["5:pacansky"];
  date = "2026-09-04";
  assert.equal(context.getBossComboTemplate(5, "pacansky"), null);
  assert.match(context.renderBossComboModeMarks(["pacansky"], 5), /is-missing/);
});
