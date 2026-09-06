const fs = require("node:fs/promises");
const path = require("node:path");

let atomicWriteSequence = 0;

function getMoscowDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function sanitizeSensitive(value, depth = 0) {
  if (depth > 8) {
    return "[max-depth]";
  }
  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeSensitive(item, depth + 1));
  }
  const result = {};
  for (const [key, nested] of Object.entries(value)) {
    if (/token|authorization|cookie|initdata|tgwebappdata|headers|hash/i.test(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = sanitizeSensitive(nested, depth + 1);
    }
  }
  return result;
}

async function writeJsonAtomically(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${atomicWriteSequence += 1}.tmp`;
  try {
    const handle = await fs.open(temporaryPath, "w");
    try {
      await handle.writeFile(`${JSON.stringify(value, null, 2)}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function archiveCorruptFile(filePath) {
  const parsed = path.parse(filePath);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const archivePath = path.join(
      parsed.dir,
      `${parsed.name}.corrupt-${Date.now()}-${attempt}${parsed.ext || ".json"}`,
    );
    try {
      await fs.rename(filePath, archivePath);
      return archivePath;
    } catch (error) {
      if (error && error.code === "EEXIST") {
        continue;
      }
      if (error && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
  throw new Error(`Could not archive corrupt state ${path.basename(filePath)}.`);
}

function createAtomicJsonStore({
  filePath,
  normalize,
  safeState = {},
  label = path.basename(filePath),
}) {
  let cache = null;
  let operation = Promise.resolve();

  const normalizeValue = (value) => normalize({
    ...safeState,
    ...(value && typeof value === "object" ? value : {}),
  });

  async function loadFromDisk() {
    try {
      const body = await fs.readFile(filePath, "utf8");
      return normalizeValue(JSON.parse(body));
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return normalizeValue(safeState);
      }
      if (!(error instanceof SyntaxError)) {
        throw error;
      }
      const archivedAs = await archiveCorruptFile(filePath).catch(() => null);
      const restored = normalizeValue({
        ...safeState,
        enabled: false,
        lastError: `Повреждённое состояние ${label} сброшено безопасно.`,
        recovery: {
          at: new Date().toISOString(),
          archivedAs: archivedAs ? path.basename(archivedAs) : null,
        },
      });
      await writeJsonAtomically(filePath, restored);
      return restored;
    }
  }

  async function load() {
    if (!cache) {
      cache = await loadFromDisk();
    }
    return normalizeValue(cache);
  }

  async function save(nextValue, options = {}) {
    operation = operation.catch(() => undefined).then(async () => {
      const current = await load();
      const now = new Date().toISOString();
      const resolvedValue = typeof nextValue === "function"
        ? await nextValue(normalizeValue(current))
        : nextValue;
      const next = normalizeValue({
        ...current,
        ...(resolvedValue && typeof resolvedValue === "object" ? resolvedValue : {}),
        version: options.keepVersion
          ? current.version
          : Math.max(0, Number(current.version) || 0) + 1,
        updatedAt: now,
      });
      await writeJsonAtomically(filePath, next);
      cache = next;
      return normalizeValue(next);
    });
    return operation;
  }

  function clearCache() {
    cache = null;
  }

  return {
    filePath,
    load,
    save,
    clearCache,
  };
}

function normalizeAmounts(value = {}) {
  const result = {};
  for (const [currency, rawAmount] of Object.entries(value && typeof value === "object" ? value : {})) {
    const amount = Number(rawAmount);
    if (Number.isFinite(amount) && amount > 0) {
      result[String(currency).toLowerCase()] = amount;
    }
  }
  return result;
}

function createMutationCoordinator({ ledgerPath }) {
  const ledgerStore = createAtomicJsonStore({
    filePath: ledgerPath,
    label: "mutation budget ledger",
    safeState: {
      version: 0,
      dayKey: getMoscowDateKey(),
      spent: {},
      history: [],
    },
    normalize(value = {}) {
      const currentDayKey = getMoscowDateKey();
      const dayKey = String(value.dayKey || currentDayKey);
      const sameDay = dayKey === currentDayKey;
      return {
        version: Math.max(0, Number(value.version) || 0),
        updatedAt: value.updatedAt || null,
        dayKey: currentDayKey,
        spent: sameDay ? normalizeAmounts(value.spent) : {},
        history: (Array.isArray(value.history) ? value.history : [])
          .map((entry) => sanitizeSensitive(entry))
          .slice(-200),
      };
    },
  });
  let serialized = Promise.resolve();

  function run(name, options, callback) {
    const task = serialized.catch(() => undefined).then(async () => {
      const expected = normalizeAmounts(options && options.expectedCost);
      const limits = normalizeAmounts(options && options.dailyLimits);
      const ledger = await ledgerStore.load();
      for (const [currency, amount] of Object.entries(expected)) {
        const limit = Number(limits[currency]);
        const spent = Number(ledger.spent[currency] || 0);
        if (Number.isFinite(limit) && limit >= 0 && spent + amount > limit) {
          const error = new Error(`Суточный лимит ${currency} не позволяет выполнить операцию.`);
          error.code = "daily_budget_exceeded";
          error.currency = currency;
          throw error;
        }
      }

      const result = await callback({
        expectedCost: expected,
        ledger,
      });
      const actual = normalizeAmounts(
        result && result.actualCost && typeof result.actualCost === "object"
          ? result.actualCost
          : expected,
      );
      const currencies = [...new Set([
        ...Object.keys(ledger.spent || {}),
        ...Object.keys(actual),
      ])];
      const saved = await ledgerStore.save({
        ...ledger,
        spent: Object.fromEntries(currencies.map((currency) => [
          currency,
          Number(ledger.spent[currency] || 0) + Number(actual[currency] || 0),
        ])),
        history: [
          ...(ledger.history || []),
          {
            at: new Date().toISOString(),
            name: String(name || "mutation"),
            spent: actual,
            ok: true,
          },
        ].slice(-200),
      });
      return {
        result,
        budget: saved,
      };
    });
    serialized = task.then(() => undefined, () => undefined);
    return task;
  }

  return {
    run,
    getLedger: () => ledgerStore.load(),
  };
}

module.exports = {
  createAtomicJsonStore,
  createMutationCoordinator,
  getMoscowDateKey,
  normalizeAmounts,
  sanitizeSensitive,
  writeJsonAtomically,
};
