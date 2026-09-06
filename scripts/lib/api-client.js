const fs = require("node:fs/promises");
const path = require("node:path");

const { ARTIFACTS_DIR } = require("./pbot");
const { VERBOSE_LOGGING, logEvent } = require("./logger");

const DEFAULT_SESSION_PATH = path.join(ARTIFACTS_DIR, "session-latest.json");
const DEFAULT_BASE_URL = "https://oldprison-prod.luckygem.online";
const DEFAULT_REQUEST_INTERVAL_MS = 250;
const SLOW_GAME_REQUEST_MS = 1_000;
const SLOW_GAME_QUEUE_MS = 2_000;

let globalRequestQueue = Promise.resolve();
let globalNextRequestAt = 0;
let gameRequestSequence = 0;
const authRefreshPromises = new Map();

function nextGameRequestId() {
  gameRequestSequence += 1;
  return `game-${process.pid}-${Date.now()}-${gameRequestSequence}`;
}

function resolveSessionPath(sessionPath) {
  return path.resolve(sessionPath || DEFAULT_SESSION_PATH);
}

async function loadSessionSnapshot(sessionPath) {
  const resolvedPath = resolveSessionPath(sessionPath);
  try {
    const body = await fs.readFile(resolvedPath, "utf8");
    return JSON.parse(body);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function buildBaseUrl(session) {
  const frameUrl = session && session.frameUrl ? session.frameUrl : session && session.game ? session.game.frameUrl : null;

  if (!frameUrl) {
    return DEFAULT_BASE_URL;
  }

  try {
    return new URL(frameUrl).origin;
  } catch (error) {
    void error;
    return DEFAULT_BASE_URL;
  }
}

function normalizeQuery(query) {
  if (!query) {
    return null;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
      continue;
    }

    searchParams.set(key, String(value));
  }

  return searchParams;
}

function withQuery(pathname, query) {
  const searchParams = normalizeQuery(query);
  if (!searchParams || [...searchParams.keys()].length === 0) {
    return pathname;
  }

  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}${searchParams.toString()}`;
}

function parseMaybeJson(text, contentType) {
  if (!text) {
    return null;
  }

  if (contentType && contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (error) {
      void error;
    }
  }

  return text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(headers) {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const value = headers["retry-after"] ?? headers["Retry-After"];
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const delayMs = timestamp - Date.now();
  return delayMs > 0 ? delayMs : null;
}

function getRateLimitDelayMs(result, attemptIndex) {
  const fromHeader = parseRetryAfterMs(result && result.headers ? result.headers : null);
  if (fromHeader !== null) {
    return fromHeader;
  }

  const fallbackDelaysMs = [800, 1600, 3000, 5000];
  return fallbackDelaysMs[Math.min(attemptIndex, fallbackDelaysMs.length - 1)];
}

async function waitForRequestSlot(intervalMs) {
  const normalizedIntervalMs = Math.max(0, Number(intervalMs) || 0);
  if (normalizedIntervalMs === 0) {
    return;
  }

  const run = globalRequestQueue
    .catch(() => undefined)
    .then(async () => {
      const waitMs = Math.max(0, globalNextRequestAt - Date.now());
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      globalNextRequestAt = Date.now() + normalizedIntervalMs;
    });

  globalRequestQueue = run.catch(() => undefined);
  await run;
}

function extractTokens(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const sources = [payload, payload.data, payload.result].filter(Boolean);

  for (const source of sources) {
    if (!source || typeof source !== "object") {
      continue;
    }

    const accessToken = source.accessToken || source.access_token || source.token || null;
    const refreshToken = source.refreshToken || source.refresh_token || null;

    if (accessToken || refreshToken) {
      return { accessToken, refreshToken };
    }
  }

  return null;
}

function getGameResponseMessage(data) {
  if (!data || typeof data !== "object") {
    return "";
  }
  return String(data.message || data.error || data.code || "").trim();
}

function isExpectedGameState(endpoint, status, data) {
  const message = getGameResponseMessage(data).toLowerCase();
  if (
    /prison is closed|master is closed|not enough energy|cooldown|session in progress|reward (?:is )?not ready|тюрьма ещё закрыта|не хватает энергии|недостаточно энергии|перезарядка|награда ещё не готова|пока закрыт/.test(message)
  ) {
    return true;
  }
  if (
    Number(status) === 403
    && String(endpoint || "") === "/api/zaruba/state"
    && !/unauthor|forbidden|token|auth|jwt|expired|сесси/i.test(message)
  ) {
    return true;
  }
  return Number(status) === 200
    && /\/api\/player\/(?:masters\/\d+|prison\/\d+)\/work$/.test(String(endpoint || ""));
}

function isAuthenticationFailure(result, endpoint) {
  if (!result || isExpectedGameState(endpoint, result.status, result.data)) {
    return false;
  }
  if (Number(result.status) === 401) {
    return true;
  }
  if (Number(result.status) !== 403) {
    return false;
  }
  return /unauthor|forbidden|token|auth|jwt|expired|сесси/i.test(getGameResponseMessage(result.data));
}

function shouldLogGameResponse({ endpoint, status, ok, data, elapsedMs, queueWaitMs }) {
  const applicationError = data
    && typeof data === "object"
    && data.success === false
    && Boolean(getGameResponseMessage(data));
  const expectedState = isExpectedGameState(endpoint, status, data);
  return VERBOSE_LOGGING
    || (!ok && !expectedState)
    || (applicationError && !expectedState)
    || elapsedMs >= SLOW_GAME_REQUEST_MS
    || queueWaitMs >= SLOW_GAME_QUEUE_MS;
}

async function writeSessionSnapshot(sessionPath, session) {
  const resolvedPath = resolveSessionPath(sessionPath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

async function createApiClient(options = {}) {
  const sessionPath = resolveSessionPath(options.sessionPath);
  const session = options.session || (await loadSessionSnapshot(sessionPath));
  const baseUrl = options.baseUrl || buildBaseUrl(session);
  let accessToken = options.accessToken || (session && session.game && session.game.accessToken);
  let refreshToken = options.refreshToken || (session && session.game && session.game.refreshToken);
  const persistSession = options.persistSession !== false;
  const minRequestIntervalMs = options.minRequestIntervalMs === undefined
    ? DEFAULT_REQUEST_INTERVAL_MS
    : Math.max(0, Number(options.minRequestIntervalMs) || 0);

  if (!accessToken) {
    throw new Error("Missing accessToken. Open the UI and sign in with InitData first.");
  }

  async function persistTokens() {
    if (!persistSession || !session || !session.game) {
      return;
    }

    session.game.accessToken = accessToken;
    session.game.refreshToken = refreshToken;
    session.generatedAt = new Date().toISOString();
    await writeSessionSnapshot(sessionPath, session);
  }

  async function reusePersistedTokensIfChanged() {
    if (!persistSession) {
      return null;
    }
    const latestSession = await loadSessionSnapshot(sessionPath);
    const latestAccessToken = latestSession && latestSession.game && latestSession.game.accessToken;
    const latestRefreshToken = latestSession && latestSession.game && latestSession.game.refreshToken;
    if (!latestAccessToken || latestAccessToken === accessToken) {
      if (latestRefreshToken) {
        refreshToken = latestRefreshToken;
      }
      return null;
    }
    accessToken = latestAccessToken;
    refreshToken = latestRefreshToken || refreshToken;
    return {
      ok: true,
      status: 0,
      data: null,
      reusedPersistedTokens: true,
      tokens: { accessToken, refreshToken },
    };
  }

  async function performRefreshAuth() {
    if (!refreshToken) {
      throw new Error("Cannot refresh auth without refreshToken.");
    }

    const attempts = [
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
          "Content-Type": "application/json",
          Connection: "keep-alive",
        },
        body: JSON.stringify({ refreshToken }),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Connection: "keep-alive",
        },
        body: JSON.stringify({ refreshToken }),
      },
      {
        headers: {
          "Content-Type": "application/json",
          Connection: "keep-alive",
        },
        body: JSON.stringify({ token: refreshToken }),
      },
    ];

    let lastError = null;

    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
      const attempt = attempts[attemptIndex];
      const requestId = nextGameRequestId();
      const startedAt = Date.now();
      if (VERBOSE_LOGGING) {
        logEvent("game.auth.refresh.request", {
          requestId,
          attempt: attemptIndex + 1,
          origin: new URL(baseUrl).origin,
          endpoint: "/api/auth/refresh",
        });
      }

      try {
        const response = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: "POST",
          headers: attempt.headers,
          body: attempt.body,
        });

        const text = await response.text();
        const payload = parseMaybeJson(text, response.headers.get("content-type"));
        const responseBytes = Buffer.byteLength(text);
        const applicationError = payload && typeof payload === "object" && payload.success === false;
        const elapsedMs = Date.now() - startedAt;
        if (VERBOSE_LOGGING || !response.ok || applicationError || elapsedMs >= SLOW_GAME_REQUEST_MS) {
          logEvent("game.auth.refresh.response", {
            requestId,
            attempt: attemptIndex + 1,
            status: response.status,
            ok: response.ok,
            elapsedMs,
            retryAfter: response.headers.get("retry-after"),
            responseBytes,
            data: VERBOSE_LOGGING || !response.ok || applicationError ? payload : undefined,
          });
        }

        if (!response.ok) {
          lastError = new Error(`Refresh failed: HTTP ${response.status}`);
          continue;
        }

        const nextTokens = extractTokens(payload) || {};
        accessToken = nextTokens.accessToken || accessToken;
        refreshToken = nextTokens.refreshToken || refreshToken;
        await persistTokens();

        return {
          ok: true,
          status: response.status,
          data: payload,
          tokens: { accessToken, refreshToken },
        };
      } catch (error) {
        logEvent("game.auth.refresh.error", {
          requestId,
          attempt: attemptIndex + 1,
          elapsedMs: Date.now() - startedAt,
          error,
        });
        throw error;
      }
    }

    throw lastError || new Error("Refresh failed.");
  }

  async function refreshAuth() {
    const reused = await reusePersistedTokensIfChanged();
    if (reused) {
      return reused;
    }

    if (!persistSession) {
      return performRefreshAuth();
    }

    const refreshKey = `${sessionPath}|${baseUrl}`;
    let refreshPromise = authRefreshPromises.get(refreshKey);
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          return await performRefreshAuth();
        } finally {
          authRefreshPromises.delete(refreshKey);
        }
      })();
      authRefreshPromises.set(refreshKey, refreshPromise);
    }
    const result = await refreshPromise;
    if (result && result.tokens) {
      accessToken = result.tokens.accessToken || accessToken;
      refreshToken = result.tokens.refreshToken || refreshToken;
    }
    return result;
  }

  async function request(method, pathname, options = {}) {
    const url = new URL(withQuery(pathname, options.query), baseUrl);
    const requestId = nextGameRequestId();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Connection: "keep-alive",
      ...options.headers,
    };

    let body;

    if (options.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.json);
    } else if (options.body !== undefined) {
      body = options.body;
    }

    const logPayload = options.json !== undefined ? options.json : body;
    let requestAttempt = 0;

    const doFetch = async () => {
      requestAttempt += 1;
      const queuedAt = Date.now();
      if (VERBOSE_LOGGING) {
        logEvent("game.request", {
          requestId,
          attempt: requestAttempt,
          method,
          origin: url.origin,
          endpoint: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
          payload: logPayload,
        });
      }

      if (options.throttle !== false) {
        await waitForRequestSlot(minRequestIntervalMs);
      }

      const fetchStartedAt = Date.now();
      try {
        const response = await fetch(url, {
          method,
          headers,
          body,
        });

        const text = await response.text();
        const data = parseMaybeJson(text, response.headers.get("content-type"));
        const responseBytes = Buffer.byteLength(text);
        const applicationError = data
          && typeof data === "object"
          && data.success === false
          && Boolean(getGameResponseMessage(data));
        const queueWaitMs = fetchStartedAt - queuedAt;
        const elapsedMs = Date.now() - fetchStartedAt;
        const result = {
          ok: response.ok,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data,
        };
        if (shouldLogGameResponse({
          endpoint: url.pathname,
          status: response.status,
          ok: response.ok,
          data,
          elapsedMs,
          queueWaitMs,
        })) {
          logEvent("game.response", {
            requestId,
            attempt: requestAttempt,
            method,
            endpoint: url.pathname,
            status: response.status,
            ok: response.ok,
            queueWaitMs,
            elapsedMs,
            retryAfter: response.headers.get("retry-after"),
            responseBytes,
            query: Object.fromEntries(url.searchParams.entries()),
            data: VERBOSE_LOGGING || !response.ok || applicationError ? data : undefined,
          });
        }
        return result;
      } catch (error) {
        logEvent("game.request.error", {
          requestId,
          attempt: requestAttempt,
          method,
          endpoint: url.pathname,
          queueWaitMs: fetchStartedAt - queuedAt,
          elapsedMs: Date.now() - fetchStartedAt,
          error,
        });
        throw error;
      }
    };

    const rateLimitRetries = options.rateLimitRetries === undefined
      ? method === "GET" ? 3 : 0
      : Math.max(0, Number(options.rateLimitRetries) || 0);
    let authRetried = false;
    let rateLimitAttempt = 0;
    let result;

    while (true) {
      result = await doFetch();

      if (!result.ok && isAuthenticationFailure(result, url.pathname) && options.retryOnAuth !== false && !authRetried) {
        if (VERBOSE_LOGGING) {
          logEvent("game.retry", {
            requestId,
            reason: "auth",
            status: result.status,
            nextAction: "refresh_auth",
          });
        }
        await refreshAuth();
        headers.Authorization = `Bearer ${accessToken}`;
        authRetried = true;
        continue;
      }

      if (!result.ok && result.status === 429 && options.retryOnRateLimit !== false && rateLimitAttempt < rateLimitRetries) {
        const delayMs = getRateLimitDelayMs(result, rateLimitAttempt);
        rateLimitAttempt += 1;
        if (VERBOSE_LOGGING) {
          logEvent("game.retry", {
            requestId,
            reason: "rate_limit",
            status: result.status,
            retryAttempt: rateLimitAttempt,
            delayMs,
          });
        }
        if (delayMs > 0) {
          await sleep(delayMs);
        }
        continue;
      }

      break;
    }

    result.requestAttempts = requestAttempt;
    result.rateLimitRetries = rateLimitAttempt;
    result.authRetried = authRetried;

    if (!result.ok && options.throwOnHttpError) {
      throw new Error(`${method} ${url.pathname} failed: HTTP ${result.status}`);
    }

    return result;
  }

  return {
    get baseUrl() {
      return baseUrl;
    },
    get accessToken() {
      return accessToken;
    },
    get refreshToken() {
      return refreshToken;
    },
    refreshAuth,
    request,
    get(pathname, options) {
      return request("GET", pathname, options);
    },
    post(pathname, options) {
      return request("POST", pathname, options);
    },
    friends: {
      achievementSummary(userId) {
        return request("GET", `/api/summary/${encodeURIComponent(userId)}`);
      },
      list() {
        return request("GET", "/api/friendship/list");
      },
      top100(options = {}) {
        return request("GET", "/api/friend/top100", {
          query: options.type ? { type: options.type } : undefined,
        });
      },
      profiles(page = 0, options = {}) {
        return request("GET", "/api/friendship/profiles", {
          query: {
            page,
            pageSize: options.pageSize ?? 64,
          },
        });
      },
      requests(options = {}) {
        return request("GET", "/api/friendship/requests", {
          query: {
            page: options.page ?? 0,
            pageSize: options.pageSize ?? 30,
          },
        });
      },
      sendRequest(toUserId) {
        return request("POST", "/api/friendship/send-request", {
          query: { toUserId },
        });
      },
      remove(friendUserId) {
        return request("POST", "/api/friendship/remove-friend", {
          query: { friendUserId },
        });
      },
      acceptRequest(fromUserId) {
        return request("POST", "/api/friendship/accept-request", {
          query: { fromUserId },
        });
      },
      declineRequest(fromUserId) {
        return request("POST", "/api/friendship/decline-request", {
          query: { fromUserId },
        });
      },
      findRequest(fromUserId) {
        return request("GET", "/api/friendship/find-request", {
          query: { fromUserId },
        });
      },
    },
    weekly: {
      top(limit = 100) {
        return request("GET", "/api/weekly-top/top", {
          query: { limit },
        });
      },
      achievements(limit = 100) {
        return request("GET", "/api/weekly-top/achievements", {
          query: { limit },
        });
      },
      overview() {
        return request("GET", "/api/weekly-top/overview");
      },
      claimInfo(userId) {
        return request("GET", "/api/weekly-top/claim-info", {
          query: { userId },
        });
      },
    },
    guild: {
      status() {
        return request("GET", "/api/guild/status");
      },
    },
    players: {
      init(options = {}) {
        return request("POST", "/api/player/init", { ...options, json: {} });
      },
      useChefir(requestOptions = {}) {
        return request("POST", "/api/player/energy/use-chefir", {
          ...requestOptions,
          json: requestOptions.json === undefined ? {} : requestOptions.json,
        });
      },
      me() {
        return request("GET", "/api/player/me");
      },
      view(userId) {
        return request("GET", `/api/player/view/${userId}`);
      },
      prisonDetail(prisonId, requestOptions = {}) {
        return request("GET", `/api/player/prison/${prisonId}`, requestOptions);
      },
      prisonCheckpoints(prisonId, options = {}) {
        return request("GET", `/api/player/prison/${prisonId}/checkpoints`, {
          ...options,
          query: { isDay: options.isDay ?? true },
        });
      },
      prisonWork(prisonId, options = {}) {
        return request("POST", `/api/player/prison/${prisonId}/work`, {
          query: { isDay: options.isDay ?? true },
          json: options.payload === undefined ? {} : options.payload,
        });
      },
    },
    talents: {
      status(options = {}) {
        return request("GET", "/api/talent/status", options);
      },
    },
    interactions: {
      notifications(userId) {
        return request("GET", "/api/interaction/notifications", {
          query: { userId },
        });
      },
      perform(payload) {
        return request("POST", "/api/interaction/perform", {
          json: payload,
        });
      },
    },
    prisons: {
      all(options = {}) {
        return request("GET", "/api/prisons/all", options);
      },
      topsAll(options = {}) {
        return request("GET", "/api/prisons/tops-all", options);
      },
    },
    masters: {
      all(options = {}) {
        return request("GET", "/api/masters", options);
      },
      enter(masterId, options = {}) {
        return request("GET", `/api/player/masters/${masterId}/enter`, options);
      },
      work(masterId) {
        return request("POST", `/api/player/masters/${masterId}/work`, {
          json: {},
        });
      },
      buyItem(masterId, itemIndex) {
        return request("POST", `/api/master-items/${masterId}/buy/${itemIndex}`, {
          json: {},
        });
      },
      top(masterId) {
        return request("GET", `/api/masters/${masterId}/top`);
      },
    },
    mobile: {
      progress() {
        return request("GET", "/api/mobile/progress");
      },
      collect(payload) {
        return request("POST", "/api/mobile/collect", {
          json: payload,
        });
      },
      escapeProgress() {
        return request("GET", "/api/mobile/escape-progress");
      },
      escapeCollect(payload) {
        return request("POST", "/api/mobile/escape-collect", {
          json: payload,
        });
      },
    },
    bosses: {
      bootstrap() {
        return request("GET", "/api/boss/bootstrap");
      },
      weapons(options = {}) {
        return request("GET", "/api/boss/weapons", options);
      },
      list(categoryId) {
        return request("GET", "/api/boss/list", {
          query: { categoryId },
        });
      },
      arrivals(ids) {
        return request("GET", "/api/boss/arrivals", {
          query: { ids: Array.isArray(ids) ? ids.join(",") : ids },
        });
      },
      rewards() {
        return request("GET", "/api/boss/rewards");
      },
      checkSession(query, requestOptions = {}) {
        return request("GET", "/api/boss/check-session", {
          query,
          ...requestOptions,
        });
      },
      startAttack(payload, requestOptions = {}) {
        return request("POST", "/api/boss/start-attack", {
          json: payload,
          ...requestOptions,
        });
      },
      friendDamage(query) {
        return request("GET", "/api/boss/friend-damage", {
          query,
        });
      },
      useWeapon(payload, requestOptions = {}) {
        return request("POST", "/api/boss/use-weapon", {
          json: payload,
          ...requestOptions,
        });
      },
      surrender(payload) {
        return request("POST", "/api/boss/surrender", {
          json: payload,
        });
      },
      restoreFreeHit(payload, requestOptions = {}) {
        return request("POST", "/api/boss/restore-free-hit", {
          json: payload,
          ...requestOptions,
        });
      },
      saveEquippedWeapons(payload) {
        return request("POST", "/api/boss/save-equipped-weapons", {
          json: payload,
        });
      },
      buyKeys(payload) {
        return request("POST", "/api/boss/buy-keys", {
          json: payload,
        });
      },
      buyWeapon(payload, requestOptions = {}) {
        return request("POST", "/api/boss/weapon/buy", {
          json: payload,
          ...requestOptions,
        });
      },
      claim(payload) {
        return request("POST", "/api/boss/claim", {
          json: payload,
        });
      },
    },
    collection: {
      full(userId, options = {}) {
        return request("GET", "/api/collection/player/full", {
          ...options,
          query: { userId },
        });
      },
      give(payload) {
        return request("POST", "/api/collection/player/give", {
          json: payload,
        });
      },
      vparit(payload, options = {}) {
        return request("POST", "/api/collection/player/vparit", {
          ...options,
          json: payload,
        });
      },
      wishlistAdd(payload) {
        return request("POST", "/api/collection/player/wishlist/add", {
          json: payload,
        });
      },
      wishlistRemove(payload) {
        return request("POST", "/api/collection/player/wishlist/remove", {
          json: payload,
        });
      },
    },
    parcels: {
      status(options = {}) {
        const { rebuild = false, ...requestOptions } = options;
        return request("GET", "/api/achievement/stew/status", {
          ...requestOptions,
          query: {
            ...(requestOptions.query || {}),
            rebuild,
          },
        });
      },
      open(requestOptions = {}) {
        return request("POST", "/api/stew/open", {
          ...requestOptions,
          json: requestOptions.json === undefined ? {} : requestOptions.json,
        });
      },
    },
    bauls: {
      status(options = {}) {
        return request("GET", "/api/bauls/stat", options);
      },
      open(baulId = "baul_basic", requestOptions = {}) {
        return request("POST", "/api/bauls/buy", {
          ...requestOptions,
          json: {
            ...(requestOptions.json || {}),
            baulId,
          },
        });
      },
    },
    vbox: {
      open(options = {}) {
        return request("POST", "/api/player/vbox/open", {
          ...options,
          json: options.json === undefined ? {} : options.json,
        });
      },
    },
    business: {
      all(options = {}) {
        return request("GET", "/api/player/business/all", options);
      },
      collect() {
        return request("POST", "/api/player/business/collect", {
          json: {},
        });
      },
    },
    podogrev: {
      status(options = {}) {
        return request("GET", "/api/podogrev/status", options);
      },
      collectAll() {
        return request("POST", "/api/podogrev/collect/all", {
          json: {},
        });
      },
      collectSelected(tokens) {
        const selectedTokens = (Array.isArray(tokens) ? tokens : [tokens])
          .map((token) => String(token || "").trim())
          .filter(Boolean);
        if (selectedTokens.length === 0) {
          throw new Error("At least one podogrev token is required.");
        }
        return request("POST", "/api/podogrev/collect/selected", {
          json: { tokens: selectedTokens },
        });
      },
    },
    vpi: {
      state(options = {}) {
        return request("GET", "/api/vpi/state", options);
      },
      claim(options = {}) {
        return request("POST", "/api/vpi/claim", {
          ...options,
          json: {},
        });
      },
      damageLeft(options = {}) {
        return request("GET", "/api/vpi/damage-left", options);
      },
      spendDamage(payload, options = {}) {
        return request("POST", "/api/vpi/spend-damage", {
          ...options,
          json: payload,
        });
      },
    },
    zaruba: {
      skip(taskId) {
        return request("POST", "/api/zaruba/skip", { json: { TaskId: taskId }, rateLimitRetries: 0 });
      },
      state() {
        return request("GET", "/api/zaruba/state");
      },
      wellState(options = {}) {
        return request("GET", "/api/zaruba/well/state", options);
      },
      bag(mode, bagId) {
        return request("GET", "/api/zaruba/bag", {
          query: { mode, bagId },
        });
      },
      start(payload) {
        return request("POST", "/api/zaruba/start", {
          json: payload,
        });
      },
      claim() {
        return request("POST", "/api/zaruba/claim", {
          json: {},
        });
      },
      openBag(payload = {}, options = {}) {
        return request("POST", "/api/zaruba/open-bag", {
          ...options,
          json: payload,
        });
      },
      exchangeOre(payload = {}, options = {}) {
        return request("POST", "/api/zaruba/exchange-ore", {
          ...options,
          json: payload,
        });
      },
    },
    menyala: {
      state(options = {}) {
        return request("GET", "/api/menyala/state", options);
      },
      bag(bagId) {
        return request("GET", `/api/menyala/bag/${encodeURIComponent(bagId)}`);
      },
      openBag(payload) {
        return request("POST", "/api/menyala/open-bag", {
          json: payload,
        });
      },
    },
  };
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_SESSION_PATH,
  createApiClient,
  loadSessionSnapshot,
  resolveSessionPath,
};
