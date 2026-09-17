const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const ROOT_DIR = path.resolve(__dirname, "../..");
const ASSET_ROOT = "https://oldprison-prod-assets-cdn-yandex.luckygem.online/assets/PrisonV3/bosses/";

function findFrame(atlas, name) {
  return Array.isArray(atlas.frames)
    ? atlas.frames.find((item) => (item.filename || item.name || item.frameName) === name)
    : atlas.frames && atlas.frames[name];
}

function positive(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) throw new Error("Invalid boss artwork dimensions");
  return Number(value);
}

// Embed only raster data and numeric geometry; remote JSON cannot inject SVG markup.
function renderAvatarSvg(image, atlas, entry) {
  const frame = entry.frame || entry;
  const width = positive(frame.w ?? frame.width);
  const height = positive(frame.h ?? frame.height);
  const x = Number(frame.x);
  const y = Number(frame.y);
  const atlasWidth = positive(atlas.meta?.size?.w);
  const atlasHeight = positive(atlas.meta?.size?.h);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0
    || x + width > atlasWidth || y + height > atlasHeight) throw new Error("Invalid boss artwork frame");
  const visibleWidth = entry.rotated ? height : width;
  const visibleHeight = entry.rotated ? width : height;
  const cropSize = Math.max(visibleWidth * 1.1, visibleHeight * 0.62);
  const cropLeft = (visibleWidth - cropSize) / 2;
  const cropTop = -cropSize * 0.045;
  const transform = entry.rotated ? ` transform="translate(${visibleWidth} 0) rotate(90)"` : "";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="${cropLeft} ${cropTop} ${cropSize} ${cropSize}"><g${transform}><svg width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" overflow="hidden"><image width="${atlasWidth}" height="${atlasHeight}" href="data:image/webp;base64,${image.toString("base64")}"/></svg></g></svg>`);
}

function createBossAvatarStore(options = {}) {
  const localDir = options.localDir || path.join(ROOT_DIR, "ui/assets/bosses");
  // Public game artwork is shared by all local account instances.
  const cacheDir = options.cacheDir || path.join(ROOT_DIR, ".state/boss-avatars");
  const fetchImpl = options.fetchImpl || fetch;
  const now = options.now || Date.now;
  const retryMs = options.retryMs ?? 60_000;
  const pending = new Map();
  const failures = new Map();

  async function download(relative, json = false) {
    const url = new URL(relative, ASSET_ROOT);
    if (!url.href.startsWith(ASSET_ROOT)) throw new Error("Invalid boss artwork path");
    const response = await fetchImpl(url.href, { signal: AbortSignal.timeout(15_000), redirect: "error" });
    if (!response.ok) throw Object.assign(new Error(`Boss artwork HTTP ${response.status}`), { status: response.status });
    if (json) return response.json();
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length < 12 || body.toString("ascii", 0, 4) !== "RIFF" || body.toString("ascii", 8, 12) !== "WEBP") {
      throw new Error("Invalid boss WebP artwork");
    }
    return body;
  }

  async function loadArtwork(id) {
    try {
      return { body: await download(`LiteBosses/${id}/1.webp`), extension: "webp" };
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    const root = `AnimationBossesAll/${id}/`;
    const phases = await download(`${root}phase_config.json`, true);
    const phase = phases["1"];
    if (!phase) throw new Error("Boss artwork has no phase 1");
    const configPath = phase.config || "1/config_1.json";
    const config = await download(`${root}${configPath}`, true);
    const first = config.sequence?.[0];
    const frameName = typeof first === "string" ? first : first?.frame;
    if (!frameName) throw new Error("Boss artwork has no first frame");
    const directory = path.posix.dirname(configPath);
    const count = positive(phase.atlasCount ?? 1);
    if (!Number.isInteger(count) || count > 32) throw new Error("Invalid boss atlas count");
    for (let index = 0; index < count; index += 1) {
      const name = count === 1 ? "1" : `1-${index}`;
      const atlasPath = `${root}${directory}/${name}`;
      const atlas = await download(`${atlasPath}.json`, true);
      const entry = findFrame(atlas, frameName);
      if (!entry) continue;
      const image = await download(`${atlasPath}.webp`);
      return { body: renderAvatarSvg(image, atlas, entry), extension: "svg" };
    }
    throw new Error("Boss artwork frame not found");
  }

  async function existing(filePath, contentType) {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile() && stat.size > 0 ? { filePath, contentType } : null;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async function resolve(id) {
    for (const [directory, extension, type] of [
      [localDir, "webp", "image/webp"],
      [cacheDir, "webp", "image/webp"],
      [cacheDir, "svg", "image/svg+xml"],
    ]) {
      const asset = await existing(path.join(directory, `${id}.${extension}`), type);
      if (asset) return asset;
    }
    if (failures.get(id) > now()) return null;
    try {
      const { body, extension } = await loadArtwork(id);
      await fs.mkdir(cacheDir, { recursive: true });
      const filePath = path.join(cacheDir, `${id}.${extension}`);
      const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporaryPath, body);
        await fs.rename(temporaryPath, filePath);
      } finally {
        await fs.rm(temporaryPath, { force: true });
      }
      failures.delete(id);
      return { filePath, contentType: extension === "svg" ? "image/svg+xml" : "image/webp" };
    } catch (error) {
      for (const [key, expires] of failures) if (expires <= now()) failures.delete(key);
      if (failures.size >= 1000) failures.delete(failures.keys().next().value);
      failures.set(id, now() + retryMs);
      options.onError?.({ bossId: id, message: error.message });
      return null;
    }
  }

  function getAvatar(bossId) {
    const id = Number(bossId);
    if (!Number.isSafeInteger(id) || id <= 0) return Promise.resolve(null);
    if (!pending.has(id)) {
      pending.set(id, resolve(id).finally(() => pending.delete(id)));
    }
    return pending.get(id);
  }

  return { getAvatar };
}

module.exports = { createBossAvatarStore, renderAvatarSvg };
