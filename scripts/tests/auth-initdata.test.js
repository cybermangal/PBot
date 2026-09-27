const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  getAuthStatus,
  getSavedAuthAccounts,
  keepAliveSavedAuthAccounts,
  loginByInitData,
  loginByTokens,
  switchSavedAuthAccount,
} = require("../lib/ui-service");

function makeInitData(userId, authDate = 1_800_000_000) {
  return new URLSearchParams({
    query_id: `query-${userId}`,
    user: JSON.stringify({ id: userId, first_name: `User ${userId}` }),
    auth_date: String(authDate),
    hash: `hash-${userId}`,
  }).toString();
}

function makeToken(userId, tokenType = "access", exp = 2_000_000_000) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ userId, tokenType, exp })}.signature`;
}

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    async text() {
      return JSON.stringify(payload);
    },
  };
}

test("switching InitData replaces account credentials without retaining the old refresh token", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-switch-"));
  const sessionPath = path.join(directory, "session.json");
  const originalFetch = global.fetch;

  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      generatedAt: "2026-08-16T00:00:00.000Z",
      frameUrl: "https://game.example/game",
      telegram: {
        initData: makeInitData(101),
        initDataUnsafe: { user: { id: 101 }, auth_date: 1_800_000_000 },
        platform: "web",
      },
      game: {
        accessToken: "old-access",
        refreshToken: "old-refresh",
      },
    }), "utf8");

    global.fetch = async () => jsonResponse({
      success: true,
      data: { accessToken: "new-access" },
    });

    const result = await loginByInitData({ initData: makeInitData(202) }, sessionPath);
    const saved = JSON.parse(await fs.readFile(sessionPath, "utf8"));

    assert.equal(result.login.accountChanged, true);
    assert.equal(result.login.previousSelfUserId, "101");
    assert.equal(result.login.selfUserId, "202");
    assert.equal(saved.game.accessToken, "new-access");
    assert.equal(saved.game.refreshToken, null);
    assert.equal(saved.telegram.initDataUnsafe.user.id, 202);
    assert.equal(Object.hasOwn(saved.telegram, "platform"), false);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("an active token without stored InitData is an active session", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-status-"));
  const sessionPath = path.join(directory, "session.json");

  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      game: { accessToken: "legacy-access-token" },
    }), "utf8");

    const status = await getAuthStatus({}, sessionPath);
    assert.equal(status.auth.isActive, true);
    assert.equal(status.auth.requiresLogin, false);
    assert.equal(status.reason, "session-ready");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("expired access token is refreshed before the session is reported active", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-refresh-status-"));
  const sessionPath = path.join(directory, "session.json");
  const originalFetch = global.fetch;
  const nextAccessToken = makeToken(303);

  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      frameUrl: "https://game.example/game",
      game: { accessToken: makeToken(303, "access", 1), refreshToken: makeToken(303, "refresh") },
    }), "utf8");
    global.fetch = async () => new Response(JSON.stringify({
      success: true,
      data: { accessToken: nextAccessToken },
    }), { status: 200, headers: { "content-type": "application/json" } });

    const status = await getAuthStatus({}, sessionPath);
    assert.equal(status.auth.isActive, true);
    assert.equal(status.reason, "session-ready");
    const saved = JSON.parse(await fs.readFile(sessionPath, "utf8"));
    assert.equal(saved.game.accessToken, nextAccessToken);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("access token is renewed shortly before expiry", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-proactive-"));
  const sessionPath = path.join(directory, "session.json");
  const originalFetch = global.fetch;
  const nextAccessToken = makeToken(303, "access", Math.floor(Date.now() / 1000) + 900);
  let calls = 0;
  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      frameUrl: "https://game.example/game",
      game: {
        accessToken: makeToken(303, "access", Math.floor(Date.now() / 1000) + 60),
        refreshToken: makeToken(303, "refresh"),
      },
    }), "utf8");
    global.fetch = async (url) => {
      assert.equal(String(url), "https://game.example/api/auth/refresh");
      calls += 1;
      return new Response(JSON.stringify({ success: true, accessToken: nextAccessToken }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    };
    const status = await getAuthStatus({}, sessionPath);
    assert.equal(status.auth.isActive, true);
    assert.equal(status.reason, "session-ready");
    assert.equal(calls, 1);
    assert.equal(JSON.parse(await fs.readFile(sessionPath, "utf8")).game.accessToken, nextAccessToken);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("a temporary refresh outage does not expire a still-valid access token", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-refresh-outage-"));
  const sessionPath = path.join(directory, "session.json");
  const originalFetch = global.fetch;
  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      frameUrl: "https://game.example/game",
      game: {
        accessToken: makeToken(303, "access", Math.floor(Date.now() / 1000) + 60),
        refreshToken: makeToken(303, "refresh"),
      },
    }));
    global.fetch = async () => { throw new Error("network unavailable"); };
    const status = await getAuthStatus({}, sessionPath);
    assert.equal(status.auth.isActive, true);
    assert.equal(status.reason, "session-ready");
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejected refresh token requires login without repeated refresh requests", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-refresh-rejected-"));
  const sessionPath = path.join(directory, "session.json");
  const originalFetch = global.fetch;
  let calls = 0;

  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      frameUrl: "https://game.example/game",
      game: { accessToken: makeToken(303, "access", 1), refreshToken: makeToken(303, "refresh") },
    }), "utf8");
    global.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ success: false, message: "invalid_token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    };

    const status = await getAuthStatus({}, sessionPath);
    assert.equal(status.auth.isActive, false);
    assert.equal(status.auth.requiresLogin, true);
    assert.equal(status.reason, "refresh-failed");
    assert.equal(calls, 1);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("token login validates credentials, binds the user ID, and removes another account's InitData", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-token-login-"));
  const sessionPath = path.join(directory, "session.json");
  const originalFetch = global.fetch;
  const accessToken = makeToken(303);
  const refreshToken = makeToken(303, "refresh");

  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      frameUrl: "https://game.example/game",
      telegram: {
        initData: makeInitData(101),
        initDataUnsafe: { user: { id: 101, first_name: "Old" } },
      },
      game: { accessToken: "old-access", refreshToken: "old-refresh" },
    }), "utf8");
    global.fetch = async (url, options = {}) => {
      if (String(url).endsWith("/api/auth/refresh")) {
        assert.deepEqual(JSON.parse(options.body), { refresh: refreshToken });
        assert.equal(options.headers.Authorization, undefined);
        return new Response(JSON.stringify({ success: true, accessToken, refreshToken }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      assert.equal(String(url), "https://game.example/api/player/init");
      assert.equal(options.headers.Authorization, `Bearer ${accessToken}`);
      return new Response(JSON.stringify({
        success: true,
        data: { energy: 10, player: { userId: 303, nickname: "Тестовый Арестант" } },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await loginByTokens({ accessToken, refreshToken }, sessionPath);
    const saved = JSON.parse(await fs.readFile(sessionPath, "utf8"));

    assert.equal(result.login.method, "tokens");
    assert.equal(result.login.accountChanged, true);
    assert.equal(result.login.selfUserId, "303");
    assert.equal(result.auth.isActive, true);
    assert.equal(saved.telegram.authSource, "tokens");
    assert.equal(saved.telegram.initDataUnsafe.user.id, 303);
    assert.equal(Object.hasOwn(saved.telegram, "initData"), false);
    assert.equal(saved.game.accessToken, accessToken);
    assert.equal(saved.game.refreshToken, refreshToken);
    assert.equal(saved.game.nickname, "Тестовый Арестант");

    const accounts = await getSavedAuthAccounts(sessionPath);
    assert.equal(accounts.count, 1);
    assert.equal(accounts.activeAccountId, "303");
    assert.equal(accounts.accounts[0].nickname, "Тестовый Арестант");
    assert.equal(accounts.accounts[0].displayName, "Тестовый Арестант");
    assert.equal(accounts.accounts[0].authSource, "tokens");
    assert.equal(Object.hasOwn(accounts.accounts[0], "accessToken"), false);
    assert.equal(Object.hasOwn(accounts.accounts[0], "refreshToken"), false);

    const switched = await switchSavedAuthAccount({ accountId: "303" }, sessionPath);
    assert.equal(switched.login.method, "tokens");
    assert.equal(switched.auth.selfUserId, "303");
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("token login rejects an invalid refresh token before saving the session", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-invalid-refresh-"));
  const sessionPath = path.join(directory, "session.json");
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url, options = {}) => {
      assert.equal(String(url), "https://game.example/api/auth/refresh");
      assert.ok(JSON.parse(options.body).refresh);
      return new Response(JSON.stringify({ success: false, message: "invalid_token" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    };
    await assert.rejects(
      loginByTokens({
        accessToken: makeToken(303),
        refreshToken: makeToken(303, "refresh"),
        baseUrl: "https://game.example",
      }, sessionPath),
      /invalid_token/,
    );
    await assert.rejects(fs.access(sessionPath), { code: "ENOENT" });
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("token login rejects access and refresh tokens from different users", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-token-mismatch-"));
  const sessionPath = path.join(directory, "session.json");
  const originalFetch = global.fetch;
  let requestMade = false;

  try {
    global.fetch = async () => {
      requestMade = true;
      throw new Error("unexpected request");
    };
    await assert.rejects(
      loginByTokens({ accessToken: makeToken(303), refreshToken: makeToken(404, "refresh") }, sessionPath),
      /belong to different users/,
    );
    assert.equal(requestMade, false);
    await assert.rejects(fs.access(sessionPath), { code: "ENOENT" });
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("startup keep-alive touches every saved account and persists refreshed credentials", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-keep-alive-"));
  const sessionPath = path.join(directory, "session.json");
  const registryPath = path.join(directory, "auth-accounts.json");
  const originalFetch = global.fetch;
  const token202 = makeToken(202);
  const refresh202 = makeToken(202, "refresh");
  const refreshedToken202 = makeToken(202, "access", 2_100_000_000);

  try {
    await fs.writeFile(registryPath, JSON.stringify({
      version: 1,
      accounts: [
        { accountId: "101", selfUserId: "101", initData: makeInitData(101) },
        {
          accountId: "202",
          selfUserId: "202",
          accessToken: token202,
          refreshToken: refresh202,
          authSource: "tokens",
          nickname: "Двести второй",
        },
      ],
    }), "utf8");

    const calls = [];
    global.fetch = async (url, options = {}) => {
      calls.push(String(url));
      if (String(url).endsWith("/api/auth/login")) {
        return new Response(JSON.stringify({
          success: true,
          data: { accessToken: makeToken(101), refreshToken: makeToken(101, "refresh") },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      assert.equal(String(url).endsWith("/api/auth/refresh"), true);
      assert.deepEqual(JSON.parse(options.body), { refresh: refresh202 });
      assert.equal(options.headers.Authorization, undefined);
      return new Response(JSON.stringify({
        success: true,
        data: { accessToken: refreshedToken202, refreshToken: refresh202 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    };

    const result = await keepAliveSavedAuthAccounts(sessionPath);
    assert.deepEqual(result, {
      attempted: 2,
      succeeded: 2,
      failed: 0,
      skippedActive: 0,
      failedAccountIds: [],
    });
    assert.equal(calls.filter((url) => url.endsWith("/api/auth/login")).length, 1);
    assert.equal(calls.filter((url) => url.endsWith("/api/auth/refresh")).length, 1);
    assert.equal(calls.filter((url) => url.endsWith("/api/player/init")).length, 0);

    const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
    const account101 = registry.accounts.find((account) => account.accountId === "101");
    const account202 = registry.accounts.find((account) => account.accountId === "202");
    assert.equal(account101.accessToken, makeToken(101));
    assert.equal(account202.nickname, "Двести второй");
    assert.equal(account202.accessToken, refreshedToken202);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("inactive account keep-alive saves rotated refresh credentials for switching", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-rotation-"));
  const sessionPath = path.join(directory, "session.json");
  const registryPath = path.join(directory, "auth-accounts.json");
  const originalFetch = global.fetch;
  const rotatedAccess = makeToken(202, "access", Math.floor(Date.now() / 1000) + 900);
  const rotatedRefresh = makeToken(202, "refresh", Math.floor(Date.now() / 1000) + 604800);
  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      frameUrl: "https://game.example/game",
      telegram: { initDataUnsafe: { user: { id: 101 } } },
      game: { accessToken: makeToken(101) },
    }));
    await fs.writeFile(registryPath, JSON.stringify({ version: 1, accounts: [
      {
        accountId: "202", selfUserId: "202", accessToken: makeToken(202), refreshToken: makeToken(202, "refresh"),
        lastUsedAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z",
      },
    ] }));
    await fs.writeFile(path.join(directory, "session-2026-01-01.json"), JSON.stringify({
      generatedAt: "2026-01-01T00:00:00.000Z",
      telegram: { initData: makeInitData(202) },
      game: { accessToken: makeToken(202), refreshToken: makeToken(202, "refresh") },
    }));
    let refreshCalls = 0;
    let signalRefreshStarted;
    let releaseFirstRefresh;
    const refreshStarted = new Promise((resolve) => { signalRefreshStarted = resolve; });
    const firstRefreshReleased = new Promise((resolve) => { releaseFirstRefresh = resolve; });
    global.fetch = async (url, options = {}) => {
      if (String(url).endsWith("/api/auth/refresh")) {
        refreshCalls += 1;
        if (refreshCalls === 1) {
          signalRefreshStarted();
          await firstRefreshReleased;
        }
        if (refreshCalls === 2) assert.equal(JSON.parse(options.body).refresh, rotatedRefresh);
        return new Response(JSON.stringify({ success: true, accessToken: rotatedAccess, refreshToken: rotatedRefresh }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, player: { userId: 202, nickname: "Two" } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    };
    const maintenance = keepAliveSavedAuthAccounts(sessionPath);
    await refreshStarted;
    const switching = switchSavedAuthAccount({ accountId: "202" }, sessionPath);
    releaseFirstRefresh();
    assert.equal((await maintenance).succeeded, 1);
    const saved = JSON.parse(await fs.readFile(registryPath, "utf8"));
    assert.equal(saved.accounts[0].refreshToken, rotatedRefresh);
    assert.equal((await switching).auth.selfUserId, "202");
    assert.equal(refreshCalls, 2);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("rejected saved credentials are retried after the account receives new tokens", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-keep-alive-retry-"));
  const sessionPath = path.join(directory, "session.json");
  const registryPath = path.join(directory, "auth-accounts.json");
  const originalFetch = global.fetch;
  let calls = 0;
  try {
    await fs.writeFile(registryPath, JSON.stringify({ version: 1, accounts: [
      { accountId: "909", selfUserId: "909", accessToken: makeToken(909), refreshToken: makeToken(909, "refresh") },
    ] }));
    global.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ success: false, message: "invalid_token" }), {
        status: 401, headers: { "content-type": "application/json" },
      });
    };
    assert.equal((await keepAliveSavedAuthAccounts(sessionPath)).failed, 1);
    assert.equal((await keepAliveSavedAuthAccounts(sessionPath)).failed, 1);
    assert.equal(calls, 1);

    const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
    registry.accounts[0].accessToken = makeToken(909, "access", 2_100_000_000);
    registry.accounts[0].refreshToken = makeToken(909, "refresh", 2_100_000_000);
    await fs.writeFile(registryPath, JSON.stringify(registry));
    global.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({
        success: true, accessToken: makeToken(909, "access", 2_200_000_000),
        refreshToken: makeToken(909, "refresh", 2_200_000_000),
      }), { status: 200, headers: { "content-type": "application/json" } });
    };
    assert.equal((await keepAliveSavedAuthAccounts(sessionPath)).succeeded, 1);
    assert.equal(calls, 2);
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("legacy session snapshots become saved accounts and can be switched without resubmitting InitData", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-auth-accounts-"));
  const sessionPath = path.join(directory, "session-latest.json");
  const archivedSessionPath = path.join(directory, "session-2026-03-13T20-18-25-334Z.json");
  const originalFetch = global.fetch;

  try {
    await fs.writeFile(sessionPath, JSON.stringify({
      generatedAt: "2026-08-16T00:00:00.000Z",
      telegram: { initData: makeInitData(101, 1_800_000_000) },
      game: { accessToken: "active-access" },
    }), "utf8");
    await fs.writeFile(archivedSessionPath, JSON.stringify({
      generatedAt: "2026-03-13T20:18:25.334Z",
      telegram: { initData: makeInitData(202, 1_700_000_000) },
      game: { accessToken: "archived-access" },
    }), "utf8");

    const accounts = await getSavedAuthAccounts(sessionPath);
    assert.equal(accounts.count, 2);
    assert.equal(accounts.activeAccountId, "101");
    assert.deepEqual(
      new Set(accounts.accounts.map((account) => account.accountId)),
      new Set(["101", "202"]),
    );
    assert.equal(JSON.stringify(accounts).includes("query_id"), false);

    global.fetch = async () => jsonResponse({
      success: true,
      data: { accessToken: "switched-access", refreshToken: "switched-refresh" },
    });
    const switched = await switchSavedAuthAccount({ accountId: "202" }, sessionPath);
    const saved = JSON.parse(await fs.readFile(sessionPath, "utf8"));

    assert.equal(switched.auth.selfUserId, "202");
    assert.equal(saved.telegram.initDataUnsafe.user.id, 202);
    assert.equal(saved.game.accessToken, "switched-access");
    assert.equal((await getSavedAuthAccounts(sessionPath)).activeAccountId, "202");
  } finally {
    global.fetch = originalFetch;
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("the full UI exposes InitData and token login and supports account switching", async () => {
  const rootDir = path.resolve(__dirname, "..", "..");
  const [fullHtml, fullApp, fullServer, packageJson] = await Promise.all([
    fs.readFile(path.join(rootDir, "ui", "index.html"), "utf8"),
    fs.readFile(path.join(rootDir, "ui", "app.js"), "utf8"),
    fs.readFile(path.join(rootDir, "scripts", "ui-server.js"), "utf8"),
    fs.readFile(path.join(rootDir, "package.json"), "utf8"),
  ]);
  let compactHtml = null;
  let compactApp = null;
  try {
    [compactHtml, compactApp] = await Promise.all([
      fs.readFile(path.join(rootDir, "bosses-system-only", "ui", "index.html"), "utf8"),
      fs.readFile(path.join(rootDir, "bosses-system-only", "ui", "app.js"), "utf8"),
    ]);
  } catch (error) {
    if (!error || error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const source of [fullHtml, fullApp, fullServer, compactHtml].filter(Boolean)) {
    assert.doesNotMatch(source, /auth-(?:gate-)?telegram|\/api\/auth\/telegram|handleTelegramAuth/);
  }
  for (const source of [fullHtml, fullApp, compactHtml].filter(Boolean)) {
    assert.doesNotMatch(source, /auth-(?:gate-)?base-url|Базовый URL/);
  }
  for (const source of [fullHtml, compactHtml].filter(Boolean)) {
    assert.match(source, /Network, открой игру и введи <code>login<\/code>/);
    assert.match(source, /href="https:\/\/youtu\.be\/_6xYERiqVY4"/);
  }
  for (const source of [fullHtml, fullApp, compactHtml, compactApp].filter(Boolean)) {
    assert.doesNotMatch(source, /auth-(?:gate-)?login-stored-btn|Войти по сохранённой InitData/);
  }
  assert.match(fullHtml, /id="auth-login-btn"[^>]*>Сохранить и войти</);
  assert.match(fullHtml, /id="auth-token-login-btn"[^>]*>Проверить и войти по токенам</);
  assert.match(fullHtml, /id="auth-gate-token-login-btn"[^>]*>Войти по токенам</);
  assert.match(fullHtml, /id="auth-account-select"/);
  assert.match(fullHtml, /id="auth-switch-saved-btn"[^>]*>Переключиться</);
  assert.match(fullApp, /async function restoreStoredAuth\(authStatus\)/);
  assert.match(fullApp, /authStatus = await restoreStoredAuth\(authStatus\)/);
  assert.match(fullApp, /\/api\/auth\/switch-account/);
  assert.match(fullServer, /pathname === "\/api\/auth\/accounts"/);
  assert.match(fullServer, /pathname === "\/api\/auth\/switch-account"/);
  assert.match(fullServer, /pathname === "\/api\/auth\/login-tokens"/);
  assert.doesNotMatch(packageJson, /playwright/i);
});

test("fresh portable startup waits for InitData before initializing account-scoped services", async () => {
  const rootDir = path.resolve(__dirname, "..", "..");
  const [serverSource, launcherSource, nodeResolverSource] = await Promise.all([
    fs.readFile(path.join(rootDir, "scripts", "ui-server.js"), "utf8"),
    fs.readFile(path.join(rootDir, "start-ui.bat"), "utf8"),
    fs.readFile(path.join(rootDir, "scripts", "resolve-node.bat"), "utf8"),
  ]);

  assert.match(serverSource, /async function initializeAuthenticatedRuntime\(\)/);
  assert.match(serverSource, /!authStatus\.auth\.isActive/);
  assert.match(serverSource, /reason: "login_required"/);
  assert.match(serverSource, /loginByInitData[\s\S]*?await initializeAuthenticatedRuntime\(\)/);
  assert.match(serverSource, /loginByTokens[\s\S]*?await initializeAuthenticatedRuntime\(\)/);
  assert.match(serverSource, /switchSavedAuthAccount[\s\S]*?await initializeAuthenticatedRuntime\(\)/);
  assert.match(serverSource, /logEvent\("ui\.server\.starting"[\s\S]*?await initializeAuthenticatedRuntime\(\)/);
  assert.match(launcherSource, /The server stopped with exit code/);
  assert.match(launcherSource, /pause >nul/);
  assert.match(launcherSource, /call "scripts\\resolve-node\.bat"/);
  assert.match(nodeResolverSource, /%ProgramFiles%\\nodejs\\node\.exe/);
});
