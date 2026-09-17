const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { createBossAvatarStore, renderAvatarSvg } = require("../lib/boss-avatars");

const webp = Buffer.from("RIFFxxxxWEBPtest");
const entry = { frame: { x: 10, y: 20, w: 100, h: 150 } };
const meta = { size: { w: 500, h: 500 } };

async function setup(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pbot-avatars-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const localDir = path.join(root, "local");
  const cacheDir = path.join(root, "cache");
  await fs.mkdir(localDir);
  return { localDir, cacheDir, ...options };
}

test("existing avatars need no network and invalid IDs cannot become paths", async (t) => {
  const options = await setup(t, { fetchImpl: () => assert.fail("unexpected download") });
  await fs.writeFile(path.join(options.localDir, "49.webp"), webp);
  const store = createBossAvatarStore(options);
  assert.equal((await store.getAvatar(49)).contentType, "image/webp");
  for (const id of ["../50", 0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(await store.getAvatar(id), null);
  }
});

test("future IDs download once across concurrent requests and persist across restarts", async (t) => {
  let requests = 0;
  const options = await setup(t, { fetchImpl: async () => { requests += 1; return new Response(webp); } });
  const store = createBossAvatarStore(options);
  const assets = await Promise.all(Array.from({ length: 8 }, () => store.getAvatar(1234)));
  assert.equal(requests, 1);
  assert.deepEqual(await fs.readFile(assets[0].filePath), webp);
  await createBossAvatarStore({ ...options, fetchImpl: () => assert.fail("cached") }).getAvatar(1234);
  assert.deepEqual(await fs.readdir(options.cacheDir), ["1234.webp"]);
});

for (const arrayFrames of [false, true]) {
  test(`animation fallback searches later atlases (${arrayFrames ? "array" : "object"} format)`, async (t) => {
    const requested = [];
    const options = await setup(t, { fetchImpl: async (url) => {
      requested.push(url);
      if (url.includes("LiteBosses")) return new Response(null, { status: 404 });
      if (url.endsWith("phase_config.json")) return Response.json({ 1: { config: "1/config_1.json", atlasCount: 2 } });
      if (url.endsWith("config_1.json")) return Response.json({ sequence: [{ frame: "first.webp" }] });
      if (url.endsWith("1-0.json")) return Response.json({ frames: {} });
      if (url.endsWith("1-1.json")) return Response.json({ meta, frames: arrayFrames ? [{ filename: "first.webp", ...entry }] : { "first.webp": entry } });
      if (url.endsWith("1-1.webp")) return new Response(webp);
      assert.fail(url);
    } });
    const asset = await createBossAvatarStore(options).getAvatar(999);
    assert.equal(asset.contentType, "image/svg+xml");
    const svg = await fs.readFile(asset.filePath, "utf8");
    assert.match(svg, /viewBox="10 20 100 150"/);
    assert.match(svg, /data:image\/webp;base64,/);
    assert.equal(requested.length, 6);
  });
}

test("network failures and unpublished artwork retry after cooldown without poisoning disk cache", async (t) => {
  let time = 0;
  let requests = 0;
  const options = await setup(t, { now: () => time, retryMs: 100, fetchImpl: async () => {
    requests += 1;
    return time < 100 ? new Response(null, { status: 503 }) : new Response(webp);
  } });
  const store = createBossAvatarStore(options);
  assert.equal(await store.getAvatar(55), null);
  assert.equal(await store.getAvatar(55), null);
  assert.equal(requests, 1);
  time = 101;
  assert.ok(await store.getAvatar(55));
  assert.equal(requests, 2);
});

test("invalid image responses are not cached as avatars", async (t) => {
  const options = await setup(t, { fetchImpl: async () => new Response("<html>maintenance</html>") });
  assert.equal(await createBossAvatarStore(options).getAvatar(55), null);
  await assert.rejects(fs.stat(options.cacheDir), { code: "ENOENT" });
});

test("rotated frames are clipped and restored; invalid geometry is rejected", () => {
  const svg = renderAvatarSvg(webp, { meta }, { ...entry, rotated: true }).toString();
  assert.match(svg, /translate\(150 0\) rotate\(90\)/);
  assert.match(svg, /overflow="hidden"/);
  assert.throws(() => renderAvatarSvg(webp, { meta }, { frame: { ...entry.frame, x: '" onload="bad' } }));
  assert.throws(() => renderAvatarSvg(webp, { meta }, { frame: { ...entry.frame, w: 999 } }));
});

test("static avatar route serves generated SVG with correct MIME and supports conditional caching", async () => {
  const source = await fs.readFile(path.join(__dirname, "../ui-server.js"), "utf8");
  const fn = source.slice(source.indexOf("async function serveStatic("), source.indexOf("function queryToOptions("));
  const responses = [];
  let asset = { filePath: "/cache/55.svg", contentType: "image/svg+xml" };
  const context = vm.createContext({
    sanitizeStaticPath: () => "/ui/assets/bosses/55.webp", getContentType: () => "image/webp",
    bossAvatars: { getAvatar: async () => asset },
    loadStaticFile: async (filePath) => { assert.equal(filePath, asset.filePath); return { body: Buffer.from("<svg/>"), etag: "v1" }; },
    sendJson: (response, status) => responses.push({ status }),
  });
  vm.runInContext(fn, context);
  const response = { writeHead: (status, headers) => responses.push({ status, headers }), end() {} };
  await context.serveStatic({ headers: {} }, "/assets/bosses/55.webp", response);
  assert.equal(responses[0].headers["Content-Type"], "image/svg+xml");
  await context.serveStatic({ headers: { "if-none-match": "v1" } }, "/assets/bosses/55.webp", response);
  assert.equal(responses[1].status, 304);
  asset = null;
  await context.serveStatic({ headers: {} }, "/assets/bosses/55.webp", response);
  assert.equal(responses[2].status, 404);
});

test("UI retries failed avatars and removes fallback when the image recovers", async () => {
  const source = await fs.readFile(path.join(__dirname, "../../ui/app.js"), "utf8");
  const fn = source.slice(source.indexOf("function bindBossAvatarFallbacks("), source.indexOf("function hasSelectOption("));
  let timer;
  let fallback = false;
  const handlers = {};
  const image = { dataset: {}, isConnected: true, complete: false, src: "http://localhost/assets/bosses/55.webp",
    addEventListener: (name, handler) => { handlers[name] = handler; },
    closest: () => ({ classList: { add: () => { fallback = true; }, remove: () => { fallback = false; } } }),
  };
  const context = vm.createContext({ URL, Date, window: { location: { href: "http://localhost/" } },
    setTimeout: (handler, ms) => { assert.equal(ms, 65000); timer = handler; return 1; }, clearTimeout() {},
  });
  vm.runInContext(fn, context);
  context.bindBossAvatarFallbacks({ querySelectorAll: () => [image] });
  handlers.error();
  assert.equal(image.hidden, true);
  timer();
  assert.match(image.src, /retry=/);
  handlers.load();
  assert.equal(image.hidden, false);
  assert.equal(fallback, false);
  handlers.error();
  image.isConnected = false;
  const previousSrc = image.src;
  timer();
  assert.equal(image.src, previousSrc);
});
