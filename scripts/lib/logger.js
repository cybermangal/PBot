const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..", "..");
const LOG_DIR = path.join(ROOT_DIR, "logs");
const REDACTED = "<redacted>";
const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 60;
const MAX_DEPTH = 6;
const LOG_STREAM_BUFFER_BYTES = 1024 * 1024;
const VERBOSE_LOGGING = /^(?:1|true|yes|on)$/i.test(String(process.env.PBOT_VERBOSE_LOGS || ""));
const LOG_MAX_FILE_BYTES = readPositiveInteger(process.env.PBOT_LOG_MAX_FILE_BYTES, 50 * 1024 * 1024);
const LOG_MAX_TOTAL_BYTES = readPositiveInteger(process.env.PBOT_LOG_MAX_TOTAL_BYTES, 500 * 1024 * 1024);
const LOG_RETENTION_DAYS = readPositiveInteger(process.env.PBOT_LOG_RETENTION_DAYS, 14);
const LOG_AUTO_PRUNE = !/^(?:0|false|no|off)$/i.test(String(process.env.PBOT_LOG_AUTO_PRUNE || ""));
const LOG_FILE_PATTERN = /^pbot-(\d{4}-\d{2}-\d{2})(?:\.(\d+))?\.jsonl$/;

let eventSequence = 0;
let activeLogPath = null;
let activeLogStream = null;
let activeLogBytes = 0;
let logDirectoryPrepared = false;

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isSensitiveKey(key) {
  return /(?:^|[-_])(access[-_]?token|refresh[-_]?token|token|authorization|cookie|set[-_]?cookie|init[-_]?data|tgwebappdata|secret|password|api[-_]?key|session[-_]?token|session[-_]?id)(?:$|[-_])/i.test(String(key));
}

function redactEmbeddedSecrets(value) {
  return String(value)
    .replace(/(bearer\s+)[^\s,;]+/gi, `$1${REDACTED}`)
    .replace(/([?&](?:access[_-]?token|refresh[_-]?token|token|init[_-]?data|tgwebappdata|api[_-]?key|session[_-]?(?:token|id))=)[^&\s]+/gi, `$1${REDACTED}`)
    .replace(/((?:access[_-]?token|refresh[_-]?token|token|init[_-]?data|tgwebappdata|api[_-]?key|password|secret)\s*[:=]\s*["']?)[^\s,;"'}]+/gi, `$1${REDACTED}`);
}

function truncateString(value) {
  const redacted = redactEmbeddedSecrets(value);
  if (redacted.length <= MAX_STRING_LENGTH) {
    return redacted;
  }

  return `${redacted.slice(0, MAX_STRING_LENGTH)}… <truncated ${redacted.length - MAX_STRING_LENGTH} chars>`;
}

function errorDetails(error) {
  if (!(error instanceof Error)) {
    return error;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function sanitizeForLog(value, depth = 0, seen = new WeakSet()) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (value instanceof Error) {
    return sanitizeForLog(errorDetails(value), depth, seen);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return { type: "Buffer", bytes: value.length };
  }

  if (depth >= MAX_DEPTH) {
    return "<max-depth>";
  }

  if (typeof value !== "object") {
    return truncateString(String(value));
  }

  if (seen.has(value)) {
    return "<circular>";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeForLog(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`<truncated ${value.length - MAX_ARRAY_ITEMS} items>`);
    }
    return items;
  }

  const result = {};
  const entries = Object.entries(value);
  for (const [key, item] of entries.slice(0, MAX_OBJECT_KEYS)) {
    result[key] = isSensitiveKey(key) ? REDACTED : sanitizeForLog(item, depth + 1, seen);
  }
  if (entries.length > MAX_OBJECT_KEYS) {
    result._truncatedKeys = entries.length - MAX_OBJECT_KEYS;
  }
  return result;
}

function getLogFilePath(now = new Date(), segment = 0) {
  const dateKey = now.toISOString().slice(0, 10);
  const suffix = Number(segment) > 0 ? `.${Math.trunc(Number(segment))}` : "";
  return path.join(LOG_DIR, `pbot-${dateKey}${suffix}.jsonl`);
}

function listManagedLogFiles() {
  try {
    return fs.readdirSync(LOG_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && LOG_FILE_PATTERN.test(entry.name))
      .map((entry) => {
        const filePath = path.join(LOG_DIR, entry.name);
        const stat = fs.statSync(filePath);
        return {
          path: filePath,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
        };
      });
  } catch (_error) {
    return [];
  }
}

function selectLogFilesToPrune(files, options = {}) {
  const nowMs = Number(options.nowMs) || Date.now();
  const retentionDays = readPositiveInteger(options.retentionDays, LOG_RETENTION_DAYS);
  const maxTotalBytes = readPositiveInteger(options.maxTotalBytes, LOG_MAX_TOTAL_BYTES);
  const cutoffMs = nowMs - retentionDays * 24 * 60 * 60_000;
  const excluded = new Set((options.excludePaths || []).filter(Boolean).map((value) => path.resolve(value)));
  const candidates = (files || [])
    .filter((file) => file && file.path && !excluded.has(path.resolve(file.path)))
    .sort((left, right) => left.mtimeMs - right.mtimeMs);
  const selected = new Set(
    candidates
      .filter((file) => Number(file.mtimeMs) < cutoffMs)
      .map((file) => file.path),
  );
  let retainedBytes = (files || []).reduce(
    (sum, file) => sum + (selected.has(file.path) ? 0 : Math.max(0, Number(file.size) || 0)),
    0,
  );

  for (const file of candidates) {
    if (retainedBytes <= maxTotalBytes) {
      break;
    }
    if (selected.has(file.path)) {
      continue;
    }
    selected.add(file.path);
    retainedBytes -= Math.max(0, Number(file.size) || 0);
  }

  return [...selected];
}

function pruneManagedLogFiles() {
  if (!LOG_AUTO_PRUNE) {
    return;
  }
  const targets = selectLogFilesToPrune(listManagedLogFiles(), {
    excludePaths: [activeLogPath],
  });
  for (const targetPath of targets) {
    try {
      fs.unlinkSync(targetPath);
    } catch (_error) {
      // Diagnostics must never stop the application. A locked file can be
      // reconsidered safely on the next process start.
    }
  }
}

function prepareLogDirectory() {
  if (logDirectoryPrepared) {
    return true;
  }
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    pruneManagedLogFiles();
    logDirectoryPrepared = true;
    return true;
  } catch (_error) {
    return false;
  }
}

function getWritableLogFilePath(now, incomingBytes) {
  const dateKey = now.toISOString().slice(0, 10);
  if (
    activeLogPath
    && path.basename(activeLogPath).startsWith(`pbot-${dateKey}`)
    && activeLogBytes + incomingBytes <= LOG_MAX_FILE_BYTES
  ) {
    return activeLogPath;
  }

  for (let segment = 0; segment < 10_000; segment += 1) {
    const targetPath = getLogFilePath(now, segment);
    try {
      const stat = fs.statSync(targetPath);
      if (stat.isFile() && stat.size + incomingBytes <= LOG_MAX_FILE_BYTES) {
        return targetPath;
      }
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return targetPath;
      }
    }
  }

  return getLogFilePath(now, Date.now());
}

function closeActiveLogStream() {
  const stream = activeLogStream;
  activeLogPath = null;
  activeLogStream = null;
  activeLogBytes = 0;
  if (stream && !stream.destroyed) {
    stream.end();
  }
}

function getLogStream(targetPath) {
  if (activeLogStream && activeLogPath === targetPath && !activeLogStream.destroyed) {
    return activeLogStream;
  }

  closeActiveLogStream();

  try {
    if (!prepareLogDirectory()) {
      return null;
    }
    const stream = fs.createWriteStream(targetPath, {
      flags: "a",
      encoding: "utf8",
      highWaterMark: LOG_STREAM_BUFFER_BYTES,
    });
    activeLogPath = targetPath;
    activeLogStream = stream;
    try {
      activeLogBytes = fs.statSync(targetPath).size;
    } catch (_error) {
      activeLogBytes = 0;
    }
    stream.on("error", () => {
      if (activeLogStream === stream) {
        activeLogPath = null;
        activeLogStream = null;
        activeLogBytes = 0;
      }
    });
    return stream;
  } catch (_error) {
    return null;
  }
}

function logEvent(event, details = {}) {
  const now = new Date();
  const record = {
    at: now.toISOString(),
    sequence: ++eventSequence,
    pid: process.pid,
    event: String(event),
    ...sanitizeForLog(details),
  };
  const line = `${JSON.stringify(record)}\n`;
  const lineBytes = Buffer.byteLength(line);
  if (!prepareLogDirectory()) {
    return Promise.resolve();
  }
  const targetPath = getWritableLogFilePath(now, lineBytes);
  const stream = getLogStream(targetPath);

  // WriteStream batches small records before touching disk. Logging remains
  // deliberately fire-and-forget so diagnostics can never delay game actions.
  if (stream) {
    stream.write(line);
    activeLogBytes += lineBytes;
  }

  return Promise.resolve();
}

async function flushLogs() {
  const stream = activeLogStream;
  if (!stream || stream.destroyed || !stream.writable) {
    return;
  }

  await new Promise((resolve) => {
    const finish = () => resolve();
    stream.once("error", finish);
    stream.write("", () => {
      stream.off("error", finish);
      resolve();
    });
  });
}

module.exports = {
  LOG_DIR,
  REDACTED,
  VERBOSE_LOGGING,
  flushLogs,
  getLogFilePath,
  logEvent,
  sanitizeForLog,
  __test: {
    isSensitiveKey,
    redactEmbeddedSecrets,
    selectLogFilesToPrune,
  },
};
