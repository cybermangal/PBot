const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { fork } = require("node:child_process");
const { EventEmitter, once } = require("node:events");
const vm = require("node:vm");
const { getInstancePaths, getInstanceInfo, listUiInstances, createInstanceLauncher, parsePort } = require("../lib/ui-instance");

const rootDir = path.resolve(__dirname, "../..");
const refused = async () => { throw Object.assign(new Error("refused"), { cause: { code: "ECONNREFUSED" } }); };
let testDataRoot;
let previousDataRoot;
test.beforeEach(async () => {
  previousDataRoot = process.env.PBOT_DATA_ROOT;
  testDataRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-instance-unit-"));
  process.env.PBOT_DATA_ROOT = testDataRoot;
});
test.afterEach(async () => {
  if (previousDataRoot === undefined) delete process.env.PBOT_DATA_ROOT;
  else process.env.PBOT_DATA_ROOT = previousDataRoot;
  await fs.rm(testDataRoot, { recursive: true, force: true });
});

test("ports isolate all artifact and log paths while preserving the original profile", () => {
  const originalRoot = process.env.PBOT_DATA_ROOT;
  delete process.env.PBOT_DATA_ROOT;
  try {
    const main = getInstancePaths(rootDir, 4311);
    const second = getInstancePaths(rootDir, 4312);
    assert.equal(main.artifactsDir, path.join(rootDir, "artifacts"));
    assert.equal(main.logDir, path.join(rootDir, "logs"));
    assert.equal(second.artifactsDir, path.join(rootDir, "artifacts", "instances", "port-4312"));
    assert.notEqual(main.logDir, second.logDir);
    for (const value of [0, 65536, "4312oops", "../4312", 1.5]) assert.throws(() => parsePort(value));
  } finally {
    if (originalRoot === undefined) delete process.env.PBOT_DATA_ROOT;
    else process.env.PBOT_DATA_ROOT = originalRoot;
  }
});

test("launcher reuses only the expected installation and profile", async () => {
  await fs.mkdir(getInstancePaths(rootDir, 4312).artifactsDir, { recursive: true });
  const instance = getInstanceInfo(rootDir, 4312);
  let forks = 0;
  const launcher = createInstanceLauncher({ rootDir, port: 4311,
    forkProcess: () => { forks += 1; },
    fetchImpl: async () => Response.json({ ok: true, data: { instance } }),
  });
  assert.equal((await launcher({ port: 4312 })).reused, true);
  assert.equal(forks, 0);
  for (const response of [Response.json({ ok: true, data: { instance: { instanceId: "foreign" } } }), new Response("foreign")]) {
    const occupied = createInstanceLauncher({ rootDir, port: 4311, fetchImpl: async () => response,
      forkProcess: () => { assert.fail("Must not spawn on an occupied port"); },
    });
    await assert.rejects(occupied({ port: 4312 }), /занят другим сервером/);
  }
});

test("launcher coalesces concurrent clicks and detaches only after readiness", async () => {
  let forks = 0;
  let disconnected = false;
  let unreferenced = false;
  const child = new EventEmitter();
  Object.assign(child, { connected: true, disconnect() { disconnected = true; }, unref() { unreferenced = true; }, kill() { assert.fail("Ready child must keep running"); } });
  const launcher = createInstanceLauncher({ rootDir, port: 4311, fetchImpl: refused,
    forkProcess: (file, args, options) => {
      forks += 1;
      assert.equal(file, path.join(rootDir, "scripts", "ui-server.js"));
      assert.deepEqual(args, ["--host", "127.0.0.1", "--port", "4312", "--no-open"]);
      assert.equal(options.windowsHide, true);
      assert.equal(options.detached, true);
      setImmediate(() => child.emit("message", { type: "pbot-ready", instanceId: getInstanceInfo(rootDir, 4312).instanceId }));
      return child;
    },
  });
  const first = launcher();
  assert.equal(launcher(), first);
  const result = await first;
  assert.equal(forks, 1);
  assert.equal(result.url, "http://127.0.0.1:4312");
  assert.equal(disconnected && unreferenced, true);
});

test("startup timeout cleans up the child and allows retry", async () => {
  let killed = 0;
  const launcher = createInstanceLauncher({ rootDir, port: 4311, fetchImpl: refused, timeoutMs: 10,
    forkProcess: () => Object.assign(new EventEmitter(), { kill() { killed += 1; }, unref() {} }),
  });
  await assert.rejects(launcher(), /слишком много времени/);
  await assert.rejects(launcher(), /слишком много времени/);
  assert.equal(killed, 2);
});

test("different launchers atomically reserve fresh profiles and preserve stopped profiles", async () => {
  const saved = getInstancePaths(rootDir, 4312).artifactsDir;
  await fs.mkdir(saved, { recursive: true });
  await fs.writeFile(path.join(saved, "test-settings.json"), '{"value":12}');
  const forkProcess = (_file, args) => {
    const child = Object.assign(new EventEmitter(), { unref() {}, kill() {} });
    setImmediate(() => child.emit("message", { type: "pbot-ready", instanceId: getInstanceInfo(rootDir, Number(args[3])).instanceId }));
    return child;
  };
  const first = createInstanceLauncher({ rootDir, port: 4311, fetchImpl: refused, forkProcess });
  const second = createInstanceLauncher({ rootDir, port: 4312, fetchImpl: refused, forkProcess });
  const results = await Promise.all([first(), second()]);
  assert.deepEqual(results.map((item) => item.instance.port).sort(), [4313, 4314]);
  assert.deepEqual((await listUiInstances(rootDir, 4311)).instances.map((item) => item.port), [4311, 4312, 4313, 4314]);
  for (const result of results) {
    assert.deepEqual(await fs.readdir(getInstancePaths(rootDir, result.instance.port).artifactsDir), []);
  }
  assert.equal(await fs.readFile(path.join(saved, "test-settings.json"), "utf8"), '{"value":12}');
  assert.equal((await first({ port: 4312 })).instance.port, 4312);
  await assert.rejects(first({ port: 4999 }), /не найден/);
});

test("UI opens the tab during the click, handles popup blocking and displays startup errors", async () => {
  const source = await fs.readFile(path.join(rootDir, "ui", "app.js"), "utf8");
  const handler = source.slice(source.indexOf("async function handleOpenInstance(event)"), source.indexOf("async function refreshInstanceList()"));
  for (const mode of ["success", "blocked", "error", "existing"]) {
    const order = [];
    const buttons = [{ disabled: false }, { disabled: false }];
    const links = [{ hidden: true }, { hidden: true }];
    const feedback = { hidden: true };
    let destination = null;
    let closed = false;
    const popup = { document: { body: {} }, location: { replace(url) { destination = url; } }, close() { closed = true; } };
    const context = vm.createContext({
      URL,
      $: (selector) => selector === "#instance-select" && mode === "existing" ? { value: "4312" } : feedback,
      document: { querySelectorAll: (selector) => selector === "[data-open-instance]" ? buttons : selector === "[data-instance-link]" ? links : [feedback] },
      window: { open() { order.push("open"); return mode === "blocked" ? null : popup; }, location: { assign(url) { destination = url; } } },
      apiRequest: async (_method, _url, body) => {
        order.push("request");
        if (mode === "existing") assert.equal(body.port, 4312);
        assert.equal(buttons.every((button) => button.disabled), true);
        if (mode === "error") throw new Error("Порт занят");
        return { url: "http://127.0.0.1:4312", reused: false };
      },
      appendLog() {},
      refreshInstanceList: async () => {},
    });
    await vm.runInContext(`${handler}\nhandleOpenInstance()`, context);
    assert.deepEqual(order, mode === "existing" ? ["request"] : ["open", "request"]);
    assert.equal(buttons.every((button) => !button.disabled), true);
    if (mode === "error") {
      assert.equal(closed, true);
      assert.equal(feedback.hidden, false);
      assert.match(feedback.textContent, /Порт занят/);
    } else {
      assert.equal(links[0].href, "http://127.0.0.1:4312/");
      assert.equal(links[0].hidden, false);
      assert.equal(destination, mode === "blocked" ? null : "http://127.0.0.1:4312/");
    }
  }
});

async function reservePair() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const first = net.createServer();
    await new Promise((resolve) => first.listen(0, "127.0.0.1", resolve));
    const port = first.address().port;
    const second = net.createServer();
    const third = net.createServer();
    try {
      await new Promise((resolve, reject) => { second.once("error", reject); second.listen(port + 1, "127.0.0.1", resolve); });
      await new Promise((resolve, reject) => { third.once("error", reject); third.listen(port + 2, "127.0.0.1", resolve); });
      return port;
    } catch { /* Try another ephemeral pair. */ }
    finally {
      await new Promise((resolve) => first.close(resolve));
      if (second.listening) await new Promise((resolve) => second.close(resolve));
      if (third.listening) await new Promise((resolve) => third.close(resolve));
    }
  }
  throw new Error("No free port pair");
}

test("startup serves the UI without waiting for unresponsive sponsor services", { timeout: 10_000 }, async () => {
  const port = await reservePair();
  const preload = path.join(__dirname, "fixtures", "ui-instance-preload.cjs").replace(/\\/g, "/");
  const startedAt = Date.now();
  const child = fork(path.join(rootDir, "scripts", "ui-server.js"), ["--port", String(port), "--no-open"], {
    env: { ...process.env, NODE_OPTIONS: `--require="${preload}"`, PBOT_TEST_HANG_STARTUP_DIRECTORY: "1" },
    execArgv: [], windowsHide: true, stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  let timer;
  try {
    const ready = await Promise.race([
      once(child, "message").then(([message]) => message),
      new Promise((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`Startup blocked: ${output}`)), 3000); }),
    ]);
    assert.equal(ready.type, "pbot-ready", output);
    assert.ok(Date.now() - startedAt < 3000);
    assert.match(output, /Starting UI/);
    const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /id="auth-gate"/);
    await fetch(`http://127.0.0.1:${port}/api/system/shutdown`, { method: "POST" });
    if (child.exitCode === null) await once(child, "exit");
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
  }
});

test("three real server processes preserve independent accounts, listing, reuse, restart and shutdown", { timeout: 30_000 }, async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-instances-"));
  const port = await reservePair();
  const base = `http://127.0.0.1:${port}`;
  const secondBase = `http://127.0.0.1:${port + 1}`;
  const thirdBase = `http://127.0.0.1:${port + 2}`;
  const preload = path.join(__dirname, "fixtures", "ui-instance-preload.cjs").replace(/\\/g, "/");
  const child = fork(path.join(rootDir, "scripts", "ui-server.js"), ["--port", String(port), "--no-open"], {
    env: { ...process.env, PBOT_DATA_ROOT: directory, NODE_OPTIONS: `--require="${preload}"` },
    execArgv: [], windowsHide: true, stdio: ["ignore", "ignore", "pipe", "ipc"],
  });
  let stderr = "";
  child.stderr.on("data", (data) => { stderr += data; });
  const request = async (url, method = "GET", body) => {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(8_000) });
    const payload = await response.json();
    assert.equal(response.ok, true, payload.error || stderr);
    return payload.data;
  };
  const login = (url, id) => request(`${url}/api/auth/login-initdata`, "POST", {
    initData: new URLSearchParams({ user: JSON.stringify({ id, first_name: `Test ${id}` }), hash: "fake", auth_date: "1800000000" }).toString(),
  });
  async function stop(url) {
    await request(`${url}/api/system/shutdown`, "POST", {});
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try { await fetch(`${url}/api/meta`, { signal: AbortSignal.timeout(100) }); }
      catch { return; }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("Instance did not stop");
  }
  try {
    const ready = await Promise.race([
      once(child, "message").then(([message]) => message),
      once(child, "exit").then(() => { throw new Error(stderr || "Child exited"); }),
    ]);
    assert.equal(ready.type, "pbot-ready", stderr);
    const crossOrigin = await fetch(`${base}/api/system/instances/open`, {
      method: "POST", headers: { Origin: "https://example.com", "Content-Type": "application/json" }, body: "{}",
    });
    assert.equal(crossOrigin.status, 403);
    await login(base, 101);
    const [opened, alsoOpened] = await Promise.all([
      request(`${base}/api/system/instances/open`, "POST", {}),
      request(`${base}/api/system/instances/open`, "POST", {}),
    ]);
    assert.equal(opened.url, secondBase);
    assert.equal(alsoOpened.url, secondBase);
    assert.equal((await request(`${secondBase}/api/auth/status`)).auth.isActive, false);
    await login(secondBase, 202);
    assert.equal((await request(`${base}/api/auth/status`)).auth.selfUserId, "101");
    assert.equal((await request(`${secondBase}/api/auth/status`)).auth.selfUserId, "202");
    // Real API clients must use their own active session's Authorization header.
    assert.equal((await request(`${base}/api/player/init`)).data.player.userId, 101);
    assert.equal((await request(`${secondBase}/api/player/init`)).data.player.userId, 202);
    assert.deepEqual((await request(`${secondBase}/api/auth/accounts`)).accounts.map((a) => a.accountId), ["202"]);
    await login(base, 303);
    assert.equal((await request(`${secondBase}/api/auth/status`)).auth.selfUserId, "202");
    assert.equal((await request(`${base}/api/system/instances/open`, "POST", { port: port + 1 })).reused, true);
    const third = await request(`${base}/api/system/instances/open`, "POST", {});
    assert.equal(third.url, thirdBase);
    assert.equal((await request(`${thirdBase}/api/auth/status`)).auth.isActive, false);
    await login(thirdBase, 404);
    assert.equal((await request(`${thirdBase}/api/player/init`)).data.player.userId, 404);
    assert.equal((await request(`${secondBase}/api/player/init`)).data.player.userId, 202);
    for (const [url, intervalSec] of [[base, 11], [secondBase, 22], [thirdBase, 33]]) {
      await request(`${url}/api/bosses/automation`, "POST", { enabled: false, autoStartNext: false, intervalSec });
    }
    for (const [url, intervalSec] of [[base, 11], [secondBase, 22], [thirdBase, 33]]) {
      assert.equal((await request(`${url}/api/bosses/automation`)).intervalSec, intervalSec);
    }
    const listing = await request(`${thirdBase}/api/system/instances`);
    assert.deepEqual(listing.instances.map((item) => item.port), [4311, port, port + 1, port + 2].sort((a, b) => a - b));
    assert.equal(listing.instances.find((item) => item.current).port, port + 2);
    assert.doesNotMatch(JSON.stringify(listing), /accessToken|initData|refreshToken/);

    const duplicate = fork(path.join(rootDir, "scripts", "ui-server.js"), ["--port", String(port), "--no-open"], {
      env: { ...process.env, PBOT_DATA_ROOT: directory, NODE_OPTIONS: `--require="${preload}"` },
      execArgv: [], windowsHide: true, stdio: "ignore",
    });
    assert.equal((await once(duplicate, "exit"))[0], 1, "Duplicate must exit before running automation");

    await stop(secondBase);
    assert.equal((await request(`${base}/api/auth/status`)).auth.selfUserId, "303");
    assert.equal((await request(`${base}/api/system/instances/open`, "POST", { port: port + 1 })).reused, false);
    assert.equal((await request(`${secondBase}/api/auth/status`)).auth.selfUserId, "202");
    assert.equal((await request(`${secondBase}/api/bosses/automation`)).intervalSec, 22);
    assert.equal((await request(`${thirdBase}/api/bosses/automation`)).intervalSec, 33);
    await stop(base);
    assert.equal((await request(`${secondBase}/api/player/init`)).data.player.userId, 202);
  } finally {
    for (const url of [thirdBase, secondBase, base]) {
      try { await stop(url); } catch { /* Already stopped. */ }
    }
    if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
    await fs.rm(directory, { recursive: true, force: true });
  }
});
