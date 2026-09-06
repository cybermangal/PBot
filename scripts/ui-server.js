const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { exec } = require("node:child_process");
const { VERBOSE_LOGGING, flushLogs, logEvent } = require("./lib/logger");
const { getSupportersDirectory: initializeSupportersDirectory } = require("./lib/supporters-directory");
const { getComboDirectory } = require("./lib/combo-directory");

const SLOW_UI_REQUEST_MS = Math.max(250, Number(process.env.PBOT_SLOW_UI_REQUEST_MS) || 1_000);

const {
  INTERACTION_TYPES,
  acceptFriendRequests,
  buyBossKey,
  buyBossWeapon,
  buyMissingMasterItems,
  buyMonthlyDay,
  collectBusinessProfit,
  cleanupFriends,
  collectIds,
  collectPodogrev,
  getBagsDashboard,
  getBusinessStatus,
  getBarygaShop,
  getBaulAutomationState,
  getDamageIntel,
  getDamageReport,
  getAuthStatus,
  getSavedAuthAccounts,
  getBossAutomationState,
  getBossAutomationLog,
  getEconomyStatus,
  getHeaderExtras,
  getLetsCookAutomationState,
  getLetsCookDashboard,
  getLootContainersDashboard,
  getFriendsBatchProgress,
  getFriendStatuses,
  getFriendsList,
  getFriendsAutomationState,
  getFriendsSummary,
  getMiscAutomationState,
  getMiniGameAutomationState,
  getMiscDashboard,
  getGuildDashboard,
  getWearableCollection,
  getVparitStatus,
  getPodogrevStatus,
  getSponsorsDirectory,
  getBossBuffs,
  getBossDashboard,
  getBossState,
  getPrisonDetail,
  getPrisonDashboard,
  getPrisonAutomationState,
  getPrisonEnergyCosts,
  getPrisonStatus,
  getTalentCalculator,
  getZarubaAutomationState,
  getZarubaDashboard,
  hitBoss,
  inviteCollected,
  inviteUsers,
  initializeBossAutomation,
  initializeDamageHistory,
  initializeLetsCookAutomation,
  initializeMiscAutomation,
  initializeProPrisonAutomations,
  initializePrisonAutomation,
  initializeVpiAutomation,
  initializeDailyToiletPaperAutomation,
  keepAliveSavedAuthAccounts,
  loginByInitData,
  loginByTokens,
  loopBoss,
  openLootContainer,
  openVorkutaBox,
  probeBossKeyPrices,
  runFriendsAction,
  runFriendsAutomationTick,
  runMiniGameAction,
  runLetsCookAutomationTick,
  runMiscAutomationTick,
  runBossAutomationTick,
  runPrison,
  runPrisonAutomationTick,
  runBaulAutomationTick,
  runBagsAction,
  runZarubaAction,
  runZarubaAutomationTick,
  updateFartovyAutoSpin,
  startMiniGameAutomation,
  startVparitAll,
  startBoss,
  startNextBossFromAutomationQueue,
  restoreBossMeleeCooldown,
  spendVpiDamage,
  switchSavedAuthAccount,
  surrenderBoss,
  takeDamageSnapshot,
  updateBossAutomation,
  updateBaulAutomation,
  updateFriendsAutomation,
  updateLetsCookAutomation,
  updateMiscAutomation,
  updatePrisonAutomation,
  updateZarubaAutomation,
  useBossWeaponBatch,
  stopMiniGameAutomation,
} = require("./lib/ui-service");

const ROOT_DIR = path.resolve(__dirname, "..");
const UI_DIR = path.join(ROOT_DIR, "ui");
const DEFAULT_PORT = 4311;
let uiRequestSequence = 0;
const staticFileCache = new Map();
function nextUiRequestId() {
  uiRequestSequence += 1;
  return `ui-${process.pid}-${Date.now()}-${uiRequestSequence}`;
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const body = token.slice(2);
    const eqIndex = body.indexOf("=");
    if (eqIndex !== -1) {
      args[body.slice(0, eqIndex)] = body.slice(eqIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[body] = next;
      index += 1;
      continue;
    }

    args[body] = true;
  }

  return args;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function sendJson(response, statusCode, payload) {
  const body = Buffer.from(`${JSON.stringify(payload)}\n`, "utf8");
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": body.length,
  });
  response.end(body);
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) {
    return {};
  }

  const body = JSON.parse(raw);
  request.pbotLogBody = body;
  return body;
}

function sanitizeStaticPath(urlPath) {
  const relative = urlPath === "/" ? "/index.html" : urlPath;
  const resolvedPath = path.normalize(path.join(UI_DIR, relative));

  if (!resolvedPath.startsWith(UI_DIR)) {
    return null;
  }

  return resolvedPath;
}

function getContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

async function loadStaticFile(filePath) {
  const stat = await fs.stat(filePath);
  const cached = staticFileCache.get(filePath);
  if (cached && cached.size === stat.size && cached.mtimeMs === stat.mtimeMs) {
    return cached;
  }

  const body = await fs.readFile(filePath);
  const entry = {
    body,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    etag: `W/"${stat.size}-${Math.trunc(stat.mtimeMs)}"`,
  };
  staticFileCache.set(filePath, entry);
  return entry;
}

async function serveStatic(request, requestPath, response) {
  const filePath = sanitizeStaticPath(requestPath);
  if (!filePath) {
    sendJson(response, 404, { ok: false, error: "Not found" });
    return;
  }

  try {
    const file = await loadStaticFile(filePath);
    if (request.headers["if-none-match"] === file.etag) {
      response.writeHead(304, {
        ETag: file.etag,
        "Cache-Control": "no-cache",
      });
      response.end();
      return;
    }

    response.writeHead(200, {
      "Content-Type": getContentType(filePath),
      "Cache-Control": "no-cache",
      "Content-Length": file.body.length,
      ETag: file.etag,
    });
    response.end(file.body);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      sendJson(response, 404, { ok: false, error: "Not found" });
      return;
    }

    sendJson(response, 500, {
      ok: false,
      error: error && error.message ? error.message : "Static file error",
    });
  }
}

function queryToOptions(searchParams) {
  return Object.fromEntries(searchParams.entries());
}

function openUrl(url) {
  const escaped = `"${url}"`;

  if (process.platform === "win32") {
    exec(`start "" ${escaped}`);
    return;
  }

  if (process.platform === "darwin") {
    exec(`open ${escaped}`);
    return;
  }

  exec(`xdg-open ${escaped}`);
}

async function handleApi(request, response, url, requestShutdown) {
  const method = request.method || "GET";
  const pathname = url.pathname;

  if (method === "GET" && pathname === "/api/meta") {
    sendJson(response, 200, {
      ok: true,
      data: {
        interactionTypes: [...INTERACTION_TYPES],
      },
    });
    return;
  }

  if (method === "POST" && pathname === "/api/system/shutdown") {
    sendJson(response, 202, {
      ok: true,
      data: { stopping: true },
    });
    requestShutdown();
    return;
  }

  if (method === "GET" && pathname === "/api/auth/status") {
    const result = await getAuthStatus(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/login-initdata") {
    const result = await loginByInitData(await readJsonBody(request));
    await initializeAuthenticatedRuntime();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/login-tokens") {
    const result = await loginByTokens(await readJsonBody(request));
    await initializeAuthenticatedRuntime();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/auth/accounts") {
    const result = await getSavedAuthAccounts();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/auth/switch-account") {
    const result = await switchSavedAuthAccount(await readJsonBody(request));
    await initializeAuthenticatedRuntime();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/friends/collect") {
    const result = await collectIds(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/friends/summary") {
    const result = await getFriendsSummary(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/friends/batch-progress") {
    sendJson(response, 200, { ok: true, data: getFriendsBatchProgress() });
    return;
  }

  if (method === "POST" && pathname === "/api/damage/snapshot") {
    const result = await takeDamageSnapshot(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/damage/intel") {
    const result = await getDamageIntel(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/damage/report") {
    const rawOptions = queryToOptions(url.searchParams);
    const result = await getDamageReport({
      ...rawOptions,
      useLive: rawOptions.live === undefined ? undefined : toBool(rawOptions.live, true),
    });
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/player/init") {
    const result = await getEconomyStatus();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/player/header-extras") {
    const result = await getHeaderExtras(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/about/sponsors") {
    const result = await getSponsorsDirectory();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/friends/status") {
    const result = await getFriendStatuses(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/friends/invite-collected") {
    const result = await inviteCollected(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/friends/invite-users") {
    const result = await inviteUsers(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/friends/accept-requests") {
    const result = await acceptFriendRequests(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/friends/cleanup") {
    const result = await cleanupFriends(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/friends/action") {
    const result = await runFriendsAction(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/friends/automation") {
    sendJson(response, 200, { ok: true, data: await getFriendsAutomationState() });
    return;
  }

  if (method === "POST" && pathname === "/api/friends/automation") {
    const result = await updateFriendsAutomation(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/friends/automation/tick") {
    const result = await runFriendsAutomationTick(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/guild/dashboard") {
    sendJson(response, 200, { ok: true, data: await getGuildDashboard() });
    return;
  }

  if (method === "GET" && pathname === "/api/zaruba/dashboard") {
    sendJson(response, 200, { ok: true, data: await getZarubaDashboard() });
    return;
  }

  if (method === "GET" && pathname === "/api/zaruba/automation") {
    sendJson(response, 200, { ok: true, data: await getZarubaAutomationState() });
    return;
  }

  if (method === "POST" && pathname === "/api/zaruba/automation") {
    const result = await updateZarubaAutomation(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/zaruba/automation/tick") {
    const result = await runZarubaAutomationTick(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/zaruba/action") {
    const result = await runZarubaAction(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/monthly/buy-day") {
    const result = await buyMonthlyDay(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/misc/dashboard") {
    const result = await getMiscDashboard(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/misc/loot-containers") {
    const result = await getLootContainersDashboard(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/loot-containers/open") {
    const result = await openLootContainer(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/misc/bags") {
    sendJson(response, 200, { ok: true, data: await getBagsDashboard() });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/bags/action") {
    const result = await runBagsAction(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/misc/baryga-shop") {
    sendJson(response, 200, { ok: true, data: await getBarygaShop() });
    return;
  }

  if (method === "GET" && pathname === "/api/misc/baul-automation") {
    sendJson(response, 200, { ok: true, data: await getBaulAutomationState() });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/baul-automation") {
    const result = await updateBaulAutomation(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/baul-automation/tick") {
    const result = await runBaulAutomationTick(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/collection/dashboard") {
    const result = await getWearableCollection(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/events/lets-cook") {
    const result = await getLetsCookDashboard();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/events/lets-cook/automation") {
    sendJson(response, 200, { ok: true, data: await getLetsCookAutomationState() });
    return;
  }

  if (method === "POST" && pathname === "/api/events/lets-cook/automation") {
    const result = await updateLetsCookAutomation(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/events/lets-cook/tick") {
    const result = await runLetsCookAutomationTick({ ...(await readJsonBody(request)), reason: "manual" });
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/misc/automation") {
    const result = await getMiscAutomationState();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/automation") {
    const result = await updateMiscAutomation(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/automation/tick") {
    const result = await runMiscAutomationTick({ ...(await readJsonBody(request)), force: true });
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/stashes/vparit-all") {
    const result = await startVparitAll(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/misc/stashes/vparit-status") {
    sendJson(response, 200, { ok: true, data: getVparitStatus() });
    return;
  }

  if (method === "GET" && pathname === "/api/misc/minigame/automation") {
    sendJson(response, 200, { ok: true, data: getMiniGameAutomationState() });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/minigame/automation/start") {
    const result = await startMiniGameAutomation(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/minigame/automation/stop") {
    const result = await stopMiniGameAutomation();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/minigame/fartovy/autospin") {
    const result = await updateFartovyAutoSpin(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/misc/minigame") {
    const result = await runMiniGameAction(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/prison/status") {
    const result = await getPrisonStatus();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/prison/dashboard") {
    const result = await getPrisonDashboard();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/prison/automation") {
    const result = await getPrisonAutomationState();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/prison/automation") {
    const result = await updatePrisonAutomation(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/prison/automation/tick") {
    const result = await runPrisonAutomationTick({
      ...(await readJsonBody(request)),
      forceMaintenance: true,
    });
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/prison/master/buy-missing") {
    const result = await buyMissingMasterItems(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/prison/costs") {
    const result = await getPrisonEnergyCosts(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/prison/detail") {
    const result = await getPrisonDetail(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/prison/run") {
    const result = await runPrison(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/bosses/dashboard") {
    const [result, comboLibrary] = await Promise.all([
      getBossDashboard(queryToOptions(url.searchParams)),
      getComboDirectory(),
    ]);
    sendJson(response, 200, { ok: true, data: { ...result, comboLibrary } });
    return;
  }

  if (method === "GET" && pathname === "/api/bosses/buffs") {
    const result = await getBossBuffs();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/bosses/state") {
    const result = await getBossState(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/bosses/automation") {
    const result = await getBossAutomationState();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/bosses/automation/log") {
    const result = await getBossAutomationLog(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/automation") {
    const result = await updateBossAutomation(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/automation/start-next") {
    const result = await startNextBossFromAutomationQueue(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/automation/tick") {
    const result = await runBossAutomationTick(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/start") {
    const result = await startBoss(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/hit") {
    const result = await hitBoss(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/surrender") {
    const result = await surrenderBoss(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/needle") {
    const result = await spendVpiDamage(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/use-weapon") {
    const result = await useBossWeaponBatch(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/restore-melee") {
    const result = await restoreBossMeleeCooldown(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/loop") {
    const result = await loopBoss(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/buy-key") {
    const result = await buyBossKey(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/buy-weapon") {
    const result = await buyBossWeapon(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/key-prices/probe") {
    const result = await probeBossKeyPrices(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/bosses/vorkuta-box/open") {
    const result = await openVorkutaBox();
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/player/business/all") {
    const result = await getBusinessStatus(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/player/business/collect") {
    const result = await collectBusinessProfit(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/podogrev/status") {
    const result = await getPodogrevStatus(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/talents/calculator") {
    const result = await getTalentCalculator(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "POST" && pathname === "/api/podogrev/collect") {
    const result = await collectPodogrev(await readJsonBody(request));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  if (method === "GET" && pathname === "/api/friends/all") {
    const result = await getFriendsList(queryToOptions(url.searchParams));
    sendJson(response, 200, { ok: true, data: result });
    return;
  }

  sendJson(response, 404, { ok: false, error: "Unknown API route" });
}

async function initializeAuthenticatedRuntime() {
  const authStatus = await getAuthStatus();
  const accountId = String(authStatus && authStatus.auth && authStatus.auth.selfUserId || "").trim();
  if (!authStatus.auth || !authStatus.auth.isActive || !/^\d+$/.test(accountId)) {
    logEvent("ui.server.automation_initialization_skipped", {
      reason: authStatus.reason || authStatus.auth && authStatus.auth.reason || "login_required",
    });
    return { initialized: false, reason: "login_required" };
  }

  await initializeBossAutomation();
  await initializePrisonAutomation();
  await initializeMiscAutomation();
  await initializeProPrisonAutomations();
  await initializeLetsCookAutomation();
  await initializeDamageHistory();
  await initializeVpiAutomation();
  initializeDailyToiletPaperAutomation();
  return { initialized: true, accountId };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const port = Number.parseInt(String(args.port || DEFAULT_PORT), 10) || DEFAULT_PORT;
  const host = args.host ? String(args.host) : "127.0.0.1";
  const autoOpen = !toBool(args["no-open"], false);

  logEvent("ui.server.starting", { host, port, autoOpen });
  await initializeAuthenticatedRuntime();
  // Revalidate the small public directory once per process start. The ETag keeps
  // unchanged restarts cheap, while newly added supporters appear immediately.
  await initializeSupportersDirectory({ forceRefresh: true });
  // Warm successful profile nicknames before the browser can request the About
  // page. Failed lookups are deliberately retried by the authenticated UI later.
  await getSponsorsDirectory();

  let server;
  let shutdownRequested = false;
  const requestShutdown = () => {
    if (shutdownRequested) {
      return;
    }

    shutdownRequested = true;
    setImmediate(() => {
      process.stdout.write("Stopping UI server...\n");
      logEvent("ui.server.stopping", { host, port });
      server.close(async () => {
        process.stdout.write("UI server stopped.\n");
        logEvent("ui.server.stopped", { host, port });
        await flushLogs();
        process.exit(0);
      });
      if (typeof server.closeIdleConnections === "function") {
        server.closeIdleConnections();
      }
      setTimeout(async () => {
        process.stdout.write("UI server shutdown timed out; exiting.\n");
        logEvent("ui.server.shutdown_timeout", { host, port, timeoutMs: 2_000 });
        await flushLogs();
        process.exit(0);
      }, 2000).unref();
    });
  };

  server = http.createServer(async (request, response) => {
    let apiRequestId = null;
    let requestUrl = null;
    let apiResponseFinished = false;
    const requestStartedAt = Date.now();
    try {
      const url = new URL(request.url || "/", `http://${host}:${port}`);
      requestUrl = url;

      if (url.pathname.startsWith("/api/")) {
        apiRequestId = nextUiRequestId();
        const requestDetails = {
          requestId: apiRequestId,
          method: request.method || "GET",
          pathname: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          remoteAddress: request.socket.remoteAddress || null,
          contentLength: Number(request.headers["content-length"] || 0) || 0,
        };
        if (VERBOSE_LOGGING) {
          logEvent("ui.request", requestDetails);
        }
        response.once("finish", () => {
          apiResponseFinished = true;
          const elapsedMs = Date.now() - requestStartedAt;
          if (VERBOSE_LOGGING || response.statusCode >= 400 || elapsedMs >= SLOW_UI_REQUEST_MS) {
            logEvent("ui.response", {
              ...requestDetails,
              status: response.statusCode,
              elapsedMs,
              requestBody: VERBOSE_LOGGING || response.statusCode >= 400
                ? request.pbotLogBody
                : undefined,
            });
          }
        });
        response.once("close", () => {
          if (apiResponseFinished) {
            return;
          }
          const elapsedMs = Date.now() - requestStartedAt;
          if (VERBOSE_LOGGING || elapsedMs >= SLOW_UI_REQUEST_MS) {
            logEvent("ui.request.aborted", {
              ...requestDetails,
              elapsedMs,
              requestBody: VERBOSE_LOGGING ? request.pbotLogBody : undefined,
            });
          }
        });
        await handleApi(request, response, url, requestShutdown);
        return;
      }

      await serveStatic(request, url.pathname, response);
    } catch (error) {
      if (apiRequestId) {
        logEvent("ui.request.error", {
          requestId: apiRequestId,
          method: request.method || "GET",
          pathname: requestUrl ? requestUrl.pathname : null,
          elapsedMs: Date.now() - requestStartedAt,
          requestBody: request.pbotLogBody,
          error,
        });
      }
      sendJson(response, 500, {
        ok: false,
        error: error && error.message ? error.message : "Internal server error",
      });
    }
  });

  await new Promise((resolve) => server.listen(port, host, resolve));
  const appUrl = `http://${host}:${port}`;
  process.stdout.write(`UI server listening on ${appUrl}\n`);
  logEvent("ui.server.listening", { host, port, appUrl, autoOpen });

  keepAliveSavedAuthAccounts().catch((error) => {
    logEvent("auth.accounts.keep_alive_error", { error });
  });

  if (autoOpen) {
    openUrl(appUrl);
  }
}

main().catch(async (error) => {
  logEvent("ui.server.start_error", { error });
  await flushLogs();
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
