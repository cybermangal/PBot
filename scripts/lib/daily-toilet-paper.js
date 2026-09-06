const path = require("node:path");
const { ARTIFACTS_DIR } = require("./pbot");
const { createAtomicJsonStore, getMoscowDateKey } = require("./automation-state");

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

// This endpoint only claims the free daily +1; the server enforces its limit.
function createDailyToiletPaperCollector({
  withContext,
  now = () => new Date(),
  store = createAtomicJsonStore({
    filePath: path.join(ARTIFACTS_DIR, "daily-toilet-paper.json"),
    normalize: (value) => ({ claimedDates: { ...value.claimedDates } }),
  }),
}) {
  let timer = null;
  let sessionPath;
  let inFlight = null;
  let pending = false;
  let claimedDates = null;

  function collect() {
    if (inFlight) {
      pending = true;
      return inFlight;
    }
    inFlight = Promise.resolve()
      .then(() => withContext(sessionPath, async ({ client, selfUserId }) => {
        // Account identity, rather than the shared session path, survives switches.
        if (!selfUserId) return null;
        if (!claimedDates) claimedDates = (await store.load()).claimedDates || {};
        const accountId = String(selfUserId);
        const day = getMoscowDateKey(now());
        if (claimedDates[accountId] === day) return null;
        const response = await client.post("/api/daily/toilet-paper", {
          json: {},
          rateLimitRetries: 0,
        });
        const payload = response && response.data;
        if (response && response.ok && !(response.status >= 400)
          && payload?.success !== false && payload?.ok !== false
          && payload?.data?.success !== false) {
          claimedDates[accountId] = day;
          await store.save({ claimedDates });
        }
        return response;
      }))
      // Missing sessions, expired auth and network failures retry on the next tick.
      .catch(() => null)
      .finally(() => {
        inFlight = null;
        if (pending) {
          pending = false;
          void collect();
        }
      });
    return inFlight;
  }

  return {
    initialize(nextSessionPath) {
      sessionPath = nextSessionPath;
      if (!timer) {
        // Local checks only: a claimed account makes no more HTTP calls today.
        timer = setInterval(() => { void collect(); }, CHECK_INTERVAL_MS);
        timer.unref?.();
        void collect();
      }
    },
    onLogin(nextSessionPath) {
      sessionPath = nextSessionPath;
      if (timer) void collect();
    },
    stop() {
      clearInterval(timer);
      timer = null;
      pending = false;
    },
  };
}

module.exports = { createDailyToiletPaperCollector };
