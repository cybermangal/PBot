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
      assert.equal(options.headers.Authorization, `Bearer ${refresh202}`);
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
  const [serverSource, launcherSource] = await Promise.all([
    fs.readFile(path.join(rootDir, "scripts", "ui-server.js"), "utf8"),
    fs.readFile(path.join(rootDir, "start-ui.bat"), "utf8"),
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
  assert.match(launcherSource, /%ProgramFiles%\\nodejs\\node\.exe/);
});
