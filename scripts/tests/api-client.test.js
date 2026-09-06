const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { createApiClient } = require("../lib/api-client");

test("manual bag requests bypass queued polling and do not retry a rejected mutation", async () => {
  const originalFetch = global.fetch;
  const endpoints = [];
  const pending = [];
  global.fetch = async (url) => {
    const endpoint = new URL(url).pathname;
    endpoints.push(endpoint);
    return new Response(JSON.stringify({ success: endpoint !== "/api/zaruba/exchange-ore" }), {
      status: endpoint === "/api/zaruba/exchange-ore" ? 429 : 200,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const client = await createApiClient({
      baseUrl: "https://pbot.test", persistSession: false, minRequestIntervalMs: 250,
      session: { game: { accessToken: "test-token" } },
    });
    await client.zaruba.state();
    pending.push(client.zaruba.state(), client.zaruba.state());
    const options = { throttle: false };
    await client.zaruba.wellState(options);
    await client.menyala.state(options);
    await client.zaruba.openBag({ mode: 1, bagId: "p1" }, options);
    const rejected = await client.zaruba.exchangeOre({}, options);
    assert.equal(rejected.status, 429);
    assert.equal(rejected.requestAttempts, 1);
    assert.deepEqual(endpoints.slice(0, 5), [
      "/api/zaruba/state", "/api/zaruba/well/state", "/api/menyala/state",
      "/api/zaruba/open-bag", "/api/zaruba/exchange-ore",
    ]);
  } finally {
    await Promise.allSettled(pending);
    global.fetch = originalFetch;
  }
});

test("podogrev selected collection sends only the requested inbox tokens", async () => {
  const originalFetch = global.fetch;
  let captured = null;
  global.fetch = async (url, options = {}) => {
    captured = {
      url: String(url),
      method: options.method,
      body: JSON.parse(options.body),
    };
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = await createApiClient({
      baseUrl: "https://pbot.test",
      persistSession: false,
      minRequestIntervalMs: 0,
      session: { game: { accessToken: "test-token" } },
    });
    await client.podogrev.collectSelected(["token-a", "token-b"]);

    assert.deepEqual(captured, {
      url: "https://pbot.test/api/podogrev/collect/selected",
      method: "POST",
      body: { tokens: ["token-a", "token-b"] },
    });
    assert.throws(() => client.podogrev.collectSelected([]), /token is required/i);
  } finally {
    global.fetch = originalFetch;
  }
});

test("vparit retries a rate-limited request when explicitly configured", async () => {
  const originalFetch = global.fetch;
  let requestCount = 0;
  global.fetch = async () => {
    requestCount += 1;
    if (requestCount === 1) {
      return new Response(JSON.stringify({ success: false, error: "Slow down" }), {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "0" },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = await createApiClient({
      baseUrl: "https://pbot.test",
      persistSession: false,
      minRequestIntervalMs: 0,
      session: { game: { accessToken: "test-token" } },
    });
    const response = await client.collection.vparit({ userId: 1, prisonId: 1, collectionId: 1 }, {
      rateLimitRetries: 1,
    });

    assert.equal(response.ok, true);
    assert.equal(response.requestAttempts, 2);
    assert.equal(response.rateLimitRetries, 1);
    assert.equal(requestCount, 2);
  } finally {
    global.fetch = originalFetch;
  }
});

test("parcel and baul helpers use the confirmed game routes and payloads", async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({
      url: String(url),
      method: options.method,
      body: options.body ? JSON.parse(options.body) : null,
    });
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = await createApiClient({
      baseUrl: "https://pbot.test",
      persistSession: false,
      minRequestIntervalMs: 0,
      session: { game: { accessToken: "test-token" } },
    });

    await client.parcels.status({ rebuild: false });
    await client.parcels.open();
    await client.bauls.status();
    await client.bauls.open();

    assert.deepEqual(requests, [
      {
        url: "https://pbot.test/api/achievement/stew/status?rebuild=false",
        method: "GET",
        body: null,
      },
      {
        url: "https://pbot.test/api/stew/open",
        method: "POST",
        body: {},
      },
      {
        url: "https://pbot.test/api/bauls/stat",
        method: "GET",
        body: null,
      },
      {
        url: "https://pbot.test/api/bauls/buy",
        method: "POST",
        body: { baulId: "baul_basic" },
      },
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("Vorkuta box helper opens exactly one box with the confirmed empty payload", async () => {
  const originalFetch = global.fetch;
  let captured = null;
  global.fetch = async (url, options = {}) => {
    captured = {
      url: String(url),
      method: options.method,
      body: JSON.parse(options.body),
    };
    return new Response(JSON.stringify({ success: true, spentVBox: 1, vboxLeft: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = await createApiClient({
      baseUrl: "https://pbot.test",
      persistSession: false,
      minRequestIntervalMs: 0,
      session: { game: { accessToken: "test-token" } },
    });
    const response = await client.vbox.open();

    assert.equal(response.ok, true);
    assert.deepEqual(captured, {
      url: "https://pbot.test/api/player/vbox/open",
      method: "POST",
      body: {},
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test("a closed game area is not mistaken for an expired session", async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url) => {
    requests.push(String(url));
    return new Response(JSON.stringify({ success: false, message: "Тюрьма ещё закрыта." }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const client = await createApiClient({
      baseUrl: "https://pbot.test",
      persistSession: false,
      minRequestIntervalMs: 0,
      session: { game: { accessToken: "test-token", refreshToken: "refresh-token" } },
    });
    const response = await client.get("/api/player/prison/3");

    assert.equal(response.status, 401);
    assert.equal(response.authRetried, false);
    assert.equal(requests.length, 1);
    assert.equal(requests.some((url) => url.endsWith("/api/auth/refresh")), false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("concurrent clients share one token refresh and reuse the persisted result", async () => {
  const originalFetch = global.fetch;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-api-client-"));
  const sessionPath = path.join(tempDir, "session.json");
  await fs.writeFile(sessionPath, JSON.stringify({
    game: {
      frameUrl: "https://pbot.test/game",
      accessToken: "old-token",
      refreshToken: "refresh-token",
    },
  }));
  let refreshCount = 0;

  global.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/api/auth/refresh")) {
      refreshCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(JSON.stringify({
        success: true,
        accessToken: "new-token",
        refreshToken: "new-refresh-token",
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    const authorized = options.headers && options.headers.Authorization === "Bearer new-token";
    return new Response(JSON.stringify(authorized
      ? { success: true }
      : { success: false, message: "unauthorized" }), {
      status: authorized ? 200 : 401,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const [left, right] = await Promise.all([
      createApiClient({ sessionPath, minRequestIntervalMs: 0 }),
      createApiClient({ sessionPath, minRequestIntervalMs: 0 }),
    ]);
    const [leftResult, rightResult] = await Promise.all([
      left.get("/api/test"),
      right.get("/api/test"),
    ]);

    assert.equal(leftResult.ok, true);
    assert.equal(rightResult.ok, true);
    assert.equal(refreshCount, 1);
    const persisted = JSON.parse(await fs.readFile(sessionPath, "utf8"));
    assert.equal(persisted.game.accessToken, "new-token");
  } finally {
    global.fetch = originalFetch;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
