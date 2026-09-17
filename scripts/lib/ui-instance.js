const path = require("node:path");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const { fork } = require("node:child_process");

const DEFAULT_PORT = 4311;

function parsePort(value = DEFAULT_PORT) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Порт должен быть целым числом от 1 до 65535.");
  }
  return port;
}

// Must run before importing services: their paths and runtimes are process-local.
function configureUiInstance(argv) {
  let port = DEFAULT_PORT;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--port") port = parsePort(argv[++index] ?? "");
    else if (argv[index].startsWith("--port=")) port = parsePort(argv[index].slice(7));
  }
  process.env.PBOT_INSTANCE_PORT = String(port);
  return port;
}

function getInstancePaths(rootDir, port = process.env.PBOT_INSTANCE_PORT || DEFAULT_PORT) {
  port = parsePort(port);
  const dataRoot = path.resolve(process.env.PBOT_DATA_ROOT || rootDir);
  const suffix = port === DEFAULT_PORT ? [] : ["instances", `port-${port}`];
  return {
    artifactsDir: path.join(dataRoot, "artifacts", ...suffix),
    logDir: path.join(dataRoot, "logs", ...suffix),
  };
}

function getInstanceInfo(rootDir, port) {
  port = parsePort(port);
  const { artifactsDir } = getInstancePaths(rootDir, port);
  return {
    port,
    label: port === DEFAULT_PORT ? "Основной экземпляр" : `Экземпляр :${port}`,
    instanceId: createHash("sha256").update(path.resolve(rootDir)).update(artifactsDir).digest("hex"),
  };
}

async function getKnownInstancePorts(rootDir, port) {
  const directory = path.join(getInstancePaths(rootDir, DEFAULT_PORT).artifactsDir, "instances");
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  return [...new Set([DEFAULT_PORT, parsePort(port), ...entries
    .filter((entry) => entry.isDirectory() && /^port-\d+$/.test(entry.name))
    .map((entry) => Number(entry.name.slice(5)))
    .filter((value) => value > 0 && value <= 65535)])].sort((a, b) => a - b);
}

async function listUiInstances(rootDir, port) {
  return {
    currentPort: port,
    instances: (await getKnownInstancePorts(rootDir, port)).map((value) => ({
      ...getInstanceInfo(rootDir, value),
      url: `http://127.0.0.1:${value}`,
      current: value === port,
    })),
  };
}

function createInstanceLauncher({ rootDir, port, forkProcess = fork, fetchImpl = fetch, timeoutMs = 60_000 }) {
  const opening = new Map();

  async function launch(nextPort) {
    const url = `http://127.0.0.1:${nextPort}`;
    const expected = getInstanceInfo(rootDir, nextPort);
    let response;
    try {
      response = await fetchImpl(`${url}/api/meta`, { signal: AbortSignal.timeout(2_000) });
    } catch (error) {
      // Only a refused connection means the slot is free. A slow/foreign server
      // must not trigger another process using the same profile.
      if (error.cause?.code !== "ECONNREFUSED" && error.code !== "ECONNREFUSED") {
        throw new Error(`Порт ${nextPort} не отвечает. Проверь запущенный экземпляр.`, { cause: error });
      }
    }
    if (response) {
      let payload;
      try { payload = await response.json(); } catch { /* Occupied by another app. */ }
      if (!response.ok || payload?.data?.instance?.instanceId !== expected.instanceId) {
        throw new Error(`Порт ${nextPort} занят другим сервером.`);
      }
      return { url, reused: true, instance: expected };
    }

    return new Promise((resolve, reject) => {
      const child = forkProcess(path.join(rootDir, "scripts", "ui-server.js"), [
        "--host", "127.0.0.1", "--port", String(nextPort), "--no-open",
      ], {
        cwd: rootDir,
        env: { ...process.env },
        execArgv: [],
        detached: true,
        windowsHide: true,
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      });
      let finished = false;
      const finish = (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        child.removeListener("message", onMessage);
        child.removeListener("exit", onExit);
        if (error) child.kill();
        if (child.connected) child.disconnect();
        child.unref();
        if (error) reject(error);
        else resolve({ url, reused: false, instance: expected });
      };
      const onMessage = (message) => {
        if (message?.type === "pbot-ready" && message.instanceId === expected.instanceId) finish();
        else if (message?.type === "pbot-start-error") finish(new Error(message.error));
      };
      const onExit = () => finish(new Error(`Не удалось запустить экземпляр на порту ${nextPort}.`));
      const timer = setTimeout(() => finish(new Error("Запуск экземпляра занял слишком много времени.")), timeoutMs);
      child.on("message", onMessage);
      child.once("error", finish);
      child.once("exit", onExit);
    });
  }

  async function createNew() {
    const ports = await getKnownInstancePorts(rootDir, port);
    // Atomic directory creation reserves a fresh profile across all processes.
    // Existing (including stopped) profiles are never reused for "Create".
    let nextPort = Math.max(...ports) + 1;
    const parent = path.join(getInstancePaths(rootDir, DEFAULT_PORT).artifactsDir, "instances");
    await fs.mkdir(parent, { recursive: true });
    for (; nextPort <= 65535; nextPort += 1) {
      try {
        await fs.mkdir(getInstancePaths(rootDir, nextPort).artifactsDir);
      } catch (error) {
        if (error.code === "EEXIST") continue;
        throw error;
      }
      return launch(nextPort);
    }
    throw new Error("Нет свободных портов для нового экземпляра.");
  }

  return function openInstance(options = {}) {
    const selectedPort = options.port == null ? null : parsePort(options.port);
    const key = selectedPort ?? "new";
    if (!opening.has(key)) {
      const request = (async () => {
        if (selectedPort === null) return createNew();
        if (!(await getKnownInstancePorts(rootDir, port)).includes(selectedPort)) {
          throw new Error("Экземпляр не найден. Обнови список или создай новый.");
        }
        return launch(selectedPort);
      })().finally(() => opening.delete(key));
      opening.set(key, request);
    }
    return opening.get(key);
  };
}

module.exports = { DEFAULT_PORT, parsePort, configureUiInstance, getInstancePaths, getInstanceInfo, listUiInstances, createInstanceLauncher };
