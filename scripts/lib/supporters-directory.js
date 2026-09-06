const fs = require("node:fs/promises");
const path = require("node:path");

const { ARTIFACTS_DIR } = require("./pbot");

const SUPPORTERS_DIRECTORY_URL = "https://raw.githubusercontent.com/cybermangal/Pbot-supporters/main/supporters.json";
const SUPPORTERS_CACHE_PATH = path.join(ARTIFACTS_DIR, "supporters-cache.json");
const SUPPORTERS_CACHE_TTL_MS = 12 * 60 * 60_000;
const MAX_DIRECTORY_BYTES = 1_000_000;
const MAX_SUPPORTERS = 5_000;
const SUPPORTER_TIERS = new Set(["authority", "blatnoy", "patsan"]);

function normalizeSupportersDirectory(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.sponsors)) {
    throw new Error("Invalid supporters directory");
  }
  if (value.sponsors.length > MAX_SUPPORTERS) {
    throw new Error("Supporters directory is too large");
  }
  const seen = new Set();
  const sponsors = [];
  for (const item of value.sponsors) {
    const userId = String(item && (item.userId ?? item.id) || "").trim();
    const tier = String(item && item.tier || "").trim().toLowerCase();
    if (!/^\d{1,20}$/.test(userId) || !SUPPORTER_TIERS.has(tier) || seen.has(userId)) {
      continue;
    }
    seen.add(userId);
    sponsors.push({ userId, tier });
  }
  return {
    version: Number(value.version) || 1,
    updatedAt: String(value.updatedAt || "").trim() || null,
    sponsors,
  };
}

function normalizeCache(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const fetchedAt = Date.parse(String(value.fetchedAt || ""));
  if (!Number.isFinite(fetchedAt)) {
    return null;
  }
  return {
    version: 1,
    sourceUrl: String(value.sourceUrl || SUPPORTERS_DIRECTORY_URL),
    fetchedAt: new Date(fetchedAt).toISOString(),
    etag: String(value.etag || "").trim() || null,
    payload: normalizeSupportersDirectory(value.payload),
  };
}

async function readCacheFile(cachePath) {
  try {
    return normalizeCache(JSON.parse(await fs.readFile(cachePath, "utf8")));
  } catch {
    return null;
  }
}

async function writeCacheFile(cachePath, value) {
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createSupportersDirectory(options = {}) {
  const sourceUrl = options.sourceUrl || SUPPORTERS_DIRECTORY_URL;
  const cachePath = options.cachePath || SUPPORTERS_CACHE_PATH;
  const cacheTtlMs = Number.isFinite(options.cacheTtlMs)
    ? Math.max(0, options.cacheTtlMs)
    : SUPPORTERS_CACHE_TTL_MS;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || Date.now;
  let memoryCache = null;
  let refreshPromise = null;

  function currentTimeMs() {
    const value = now();
    return value instanceof Date ? value.getTime() : Number(value);
  }

  function isFresh(cache) {
    if (!cache) {
      return false;
    }
    const age = currentTimeMs() - Date.parse(cache.fetchedAt);
    return Number.isFinite(age) && age >= 0 && age < cacheTtlMs;
  }

  async function loadCache() {
    if (!memoryCache) {
      memoryCache = await readCacheFile(cachePath);
    }
    return memoryCache;
  }

  async function fetchDirectory(cache) {
    if (typeof fetchImpl !== "function") {
      throw new Error("Global fetch is unavailable");
    }
    const headers = { Accept: "application/json" };
    if (cache && cache.etag) {
      headers["If-None-Match"] = cache.etag;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetchImpl(sourceUrl, { headers, signal: controller.signal });
      const fetchedAt = new Date(currentTimeMs()).toISOString();
      if (response.status === 304 && cache) {
        return { ...cache, sourceUrl, fetchedAt };
      }
      if (!response.ok) {
        throw new Error(`Supporters directory HTTP ${response.status}`);
      }
      const raw = await response.text();
      if (Buffer.byteLength(raw, "utf8") > MAX_DIRECTORY_BYTES) {
        throw new Error("Supporters directory response is too large");
      }
      const payload = normalizeSupportersDirectory(JSON.parse(raw));
      return {
        version: 1,
        sourceUrl,
        fetchedAt,
        etag: response.headers && typeof response.headers.get === "function"
          ? response.headers.get("etag") || null
          : null,
        payload,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function getDirectory(options = {}) {
    const cache = await loadCache();
    const forceRefresh = options.forceRefresh === true;
    if (!forceRefresh && isFresh(cache)) {
      return cache.payload;
    }
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshed = await fetchDirectory(cache);
          memoryCache = refreshed;
          await writeCacheFile(cachePath, refreshed).catch(() => null);
          return refreshed.payload;
        } catch {
          return cache ? cache.payload : { version: 1, updatedAt: null, sponsors: [] };
        } finally {
          refreshPromise = null;
        }
      })();
    }
    return refreshPromise;
  }

  return { getDirectory };
}

const defaultDirectory = createSupportersDirectory();

module.exports = {
  SUPPORTERS_CACHE_PATH,
  SUPPORTERS_CACHE_TTL_MS,
  SUPPORTERS_DIRECTORY_URL,
  createSupportersDirectory,
  getSupportersDirectory: (options) => defaultDirectory.getDirectory(options),
  normalizeSupportersDirectory,
};
