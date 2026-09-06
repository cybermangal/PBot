const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  SUPPORTERS_CACHE_TTL_MS,
  createSupportersDirectory,
  normalizeSupportersDirectory,
} = require("../lib/supporters-directory");

function response(payload, options = {}) {
  return {
    ok: options.status ? options.status >= 200 && options.status < 300 : true,
    status: options.status || 200,
    headers: { get: (name) => name.toLowerCase() === "etag" ? options.etag || null : null },
    text: async () => JSON.stringify(payload),
  };
}

async function temporaryCache(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-supporters-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return path.join(directory, "supporters-cache.json");
}

test("missing cache downloads and stores the public directory", async (t) => {
  const cachePath = await temporaryCache(t);
  let calls = 0;
  const store = createSupportersDirectory({
    cachePath,
    now: () => Date.parse("2026-08-23T12:00:00.000Z"),
    fetchImpl: async () => {
      calls += 1;
      return response({
        version: 1,
        updatedAt: "2026-08-23T11:00:00.000Z",
        sponsors: [{ userId: "408066374", tier: "blatnoy" }],
      }, { etag: "directory-v1" });
    },
  });

  const directory = await store.getDirectory();
  const cached = JSON.parse(await fs.readFile(cachePath, "utf8"));
  assert.equal(calls, 1);
  assert.deepEqual(directory.sponsors, [{ userId: "408066374", tier: "blatnoy" }]);
  assert.equal(cached.etag, "directory-v1");
  assert.equal(cached.fetchedAt, "2026-08-23T12:00:00.000Z");
});

test("fresh cache avoids the network until twelve hours have passed", async (t) => {
  const cachePath = await temporaryCache(t);
  const initialTime = Date.parse("2026-08-23T00:00:00.000Z");
  await fs.writeFile(cachePath, JSON.stringify({
    version: 1,
    sourceUrl: "test",
    fetchedAt: new Date(initialTime).toISOString(),
    etag: null,
    payload: { version: 1, updatedAt: null, sponsors: [{ userId: "10", tier: "patsan" }] },
  }));
  let now = initialTime + SUPPORTERS_CACHE_TTL_MS - 1;
  let calls = 0;
  const store = createSupportersDirectory({
    cachePath,
    now: () => now,
    fetchImpl: async () => {
      calls += 1;
      return response({ version: 1, sponsors: [{ userId: "20", tier: "authority" }] });
    },
  });

  assert.deepEqual((await store.getDirectory()).sponsors, [{ userId: "10", tier: "patsan" }]);
  assert.equal(calls, 0);
  now = initialTime + SUPPORTERS_CACHE_TTL_MS;
  assert.deepEqual((await store.getDirectory()).sponsors, [{ userId: "20", tier: "authority" }]);
  assert.equal(calls, 1);
});

test("forced startup refresh revalidates even a fresh cache", async (t) => {
  const cachePath = await temporaryCache(t);
  const now = Date.parse("2026-08-23T12:00:00.000Z");
  await fs.writeFile(cachePath, JSON.stringify({
    version: 1,
    fetchedAt: new Date(now).toISOString(),
    etag: "directory-v1",
    payload: { version: 1, sponsors: [{ userId: "10", tier: "patsan" }] },
  }));
  let calls = 0;
  const store = createSupportersDirectory({
    cachePath,
    now: () => now,
    fetchImpl: async () => {
      calls += 1;
      return response({ version: 1, sponsors: [{ userId: "20", tier: "authority" }] });
    },
  });

  assert.deepEqual(
    (await store.getDirectory({ forceRefresh: true })).sponsors,
    [{ userId: "20", tier: "authority" }],
  );
  assert.equal(calls, 1);
});

test("failed refresh falls back to stale cache", async (t) => {
  const cachePath = await temporaryCache(t);
  await fs.writeFile(cachePath, JSON.stringify({
    version: 1,
    fetchedAt: "2026-08-22T00:00:00.000Z",
    payload: { version: 1, sponsors: [{ userId: "8369207862", tier: "patsan" }] },
  }));
  const store = createSupportersDirectory({
    cachePath,
    now: () => Date.parse("2026-08-23T00:00:00.000Z"),
    fetchImpl: async () => { throw new Error("offline"); },
  });
  assert.deepEqual((await store.getDirectory()).sponsors, [{ userId: "8369207862", tier: "patsan" }]);
});

test("public schema keeps unique numeric IDs and canonical tiers only", () => {
  assert.deepEqual(normalizeSupportersDirectory({
    version: 1,
    sponsors: [
      { userId: "1", tier: "authority", nickname: "ignored" },
      { userId: "1", tier: "patsan" },
      { userId: "bad", tier: "blatnoy" },
      { userId: "2", tier: "unknown" },
    ],
  }).sponsors, [{ userId: "1", tier: "authority" }]);
  assert.throws(() => normalizeSupportersDirectory([]), /Invalid supporters directory/);
});
