const fs = require("node:fs/promises");
const path = require("node:path");
const { ARTIFACTS_DIR } = require("./pbot");

const COMBO_DIRECTORY_URL = "https://raw.githubusercontent.com/cybermangal/Pbot-supporters/main/combos.json";
const COMBO_CACHE_PATH = path.join(ARTIFACTS_DIR, "combo-directory-cache.json");
const ACTIONS = new Set(["punchChest", "kickBalls", "pokeEyes", "kneeEar", "poison", "gunshot", "knife"]);
const MODES = new Set(["pacansky", "blotnoy", "avtoritetny"]);
function moscowDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function normalizeComboDirectory(value) {
  const invalid = () => { throw new Error("Invalid combo directory"); };
  if (!value || value.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(value.mskDate)
    || !Number.isFinite(Date.parse(value.updatedAt)) || !Array.isArray(value.combos) || value.combos.length > 300) invalid();
  const seen = new Set();
  const combos = value.combos.map((item) => {
    if (!item || !Number.isSafeInteger(item.bossId) || item.bossId <= 0 || !MODES.has(item.comboMode)
      || !Array.isArray(item.sequence) || item.sequence.length < 1 || item.sequence.length > 100
      || !item.sequence.every((key) => ACTIONS.has(key))) invalid();
    const key = `${item.bossId}:${item.comboMode}`;
    if (seen.has(key)) invalid();
    seen.add(key);
    return { bossId: item.bossId, comboMode: item.comboMode, sequence: [...item.sequence] };
  });
  return { version: 1, mskDate: value.mskDate, updatedAt: value.updatedAt, combos };
}

function createComboDirectory(options = {}) {
  const cachePath = options.cachePath || COMBO_CACHE_PATH;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const now = options.now || Date.now;
  const ttlMs = options.ttlMs ?? 10 * 60_000;
  let cache = null, loaded = false, pending = null, nextCheck = 0, checkedDate = "", lastError = null;
  function snapshot() {
    const today = moscowDate(new Date(now()));
    const current = cache && cache.payload.mskDate === today;
    return {
      version: 1, mskDate: today, updatedAt: current ? cache.payload.updatedAt : null,
      combos: current ? cache.payload.combos : [],
      status: current ? lastError ? "cached" : "ok" : cache ? "outdated" : "unavailable",
    };
  }
  async function refresh() {
    try {
      if (!loaded) {
        loaded = true;
        try {
          const stored = JSON.parse(await fs.readFile(cachePath, "utf8"));
          cache = { payload: normalizeComboDirectory(stored.payload), etag: typeof stored.etag === "string" ? stored.etag : null };
        } catch { /* Fetch a clean copy when disk cache is missing or invalid. */ }
      }
      const headers = { Accept: "application/json" };
      if (cache?.etag) headers["If-None-Match"] = cache.etag;
      const response = await fetchImpl(COMBO_DIRECTORY_URL, { headers, signal: AbortSignal.timeout(8_000), redirect: "error" });
      if (response.status === 304 && cache) {
        lastError = null;
        return;
      }
      if (!response.ok) throw new Error("Combo directory request failed");
      let bytes = 0, raw = "";
      const decoder = new TextDecoder();
      for await (const chunk of response.body) {
        bytes += chunk.byteLength;
        if (bytes > 1_000_000) throw new Error("Combo directory is too large");
        raw += decoder.decode(chunk, { stream: true });
      }
      raw += decoder.decode();
      const payload = normalizeComboDirectory(JSON.parse(raw));
      // A stale CDN response must not displace a current-day cache.
      if (payload.mskDate !== moscowDate(new Date(now()))) throw new Error("Combo directory has a different date");
      cache = { payload, etag: response.headers.get("etag") };
      lastError = null;
      const temporary = `${cachePath}.${process.pid}.tmp`;
      try {
        await fs.mkdir(path.dirname(cachePath), { recursive: true });
        await fs.writeFile(temporary, JSON.stringify(cache), "utf8");
        await fs.rename(temporary, cachePath);
      } catch { /* In-memory data remains available if disk is read-only. */ }
      finally { await fs.unlink(temporary).catch(() => {}); }
    } catch { lastError = true; }
    finally { checkedDate = moscowDate(new Date(now())); nextCheck = now() + (lastError ? 60_000 : ttlMs); }
  }
  async function getDirectory() {
    if (pending) { await pending; return snapshot(); }
    if (now() >= nextCheck || checkedDate !== moscowDate(new Date(now()))) {
      pending = refresh();
      try { await pending; } finally { pending = null; }
    }
    return snapshot();
  }
  return { getDirectory };
}
const directory = createComboDirectory();
module.exports = { COMBO_DIRECTORY_URL, normalizeComboDirectory, createComboDirectory, getComboDirectory: () => directory.getDirectory() };
