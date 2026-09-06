const fs = require("node:fs/promises");
const path = require("node:path");

const { createApiClient, loadSessionSnapshot } = require("./lib/api-client");
const { buildBossCatalog, buildBossLimitsView } = require("./lib/boss-catalog");
const {
  DEFAULT_BOSS_HIT_SEQUENCE,
  buildBossActionCatalog,
  buildBossUseWeaponPayload: buildBossActionPayload,
  normalizeBossActionType,
  parseBossHitSequence,
} = require("./lib/boss-actions");
const {
  buildActiveSessionView,
  buildBossQueueView,
  normalizeModeList,
  prepareBossRunnerHit,
  prepareBossRunnerStart,
} = require("./lib/boss-runner");
const {
  buildPrisonWorkRequest,
  executePrisonRunnerOnce,
  loadPrisonDetail,
} = require("./lib/prison-runner");
const {
  collectLeaderboardIds,
} = require("./lib/id-collector");
const {
  createDamageReport,
  createDamageSnapshot,
  saveDamageSnapshot,
} = require("./lib/damage-history");
const {
  acceptFriendRequests,
  cleanupFriends,
} = require("./lib/ui-service");
const { writeVersionedJson } = require("./lib/pbot");
const { flushLogs, logEvent } = require("./lib/logger");

const INTERACTION_TYPES = new Set([
  "UpgradeBiceps",
  "Fight",
  "Harknut",
  "TossDroj",
]);
let activeCliCommand = null;
let activeCliStartedAt = 0;

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const body = token.slice(2);
    const eqIndex = body.indexOf("=");

    if (eqIndex !== -1) {
      const key = body.slice(0, eqIndex);
      const value = body.slice(eqIndex + 1);
      args[key] = value;
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

function asPositiveInt(value, name) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected positive integer for --${name}.`);
  }

  return parsed;
}

function asNonNegativeInt(value, name) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Expected non-negative integer for --${name}.`);
  }

  return parsed;
}

function toBool(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function collectRawIds(args) {
  const parts = [];

  if (args.id) {
    parts.push(String(args.id));
  }

  if (args.ids) {
    parts.push(String(args.ids));
  }

  return parts
    .flatMap((value) => value.split(/[\s,;]+/))
    .map((value) => value.trim())
    .filter(Boolean);
}

async function loadIdsFromFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  const body = await fs.readFile(resolvedPath, "utf8");

  return body
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, ""))
    .join("\n")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => !value.startsWith("#"));
}

async function resolveIds(args) {
  const values = collectRawIds(args);

  if (args.file) {
    values.push(...(await loadIdsFromFile(args.file)));
  }

  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    if (!/^\d+$/.test(value)) {
      throw new Error(`Invalid numeric ID: ${value}`);
    }

    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

async function resolveBossIds(args) {
  const aliasArgs = {
    ...args,
    ...(args["boss-id"] !== undefined && args.id === undefined ? { id: args["boss-id"] } : {}),
    ...(args["boss-ids"] !== undefined && args.ids === undefined ? { ids: args["boss-ids"] } : {}),
  };

  return resolveIds(aliasArgs);
}

function isNumericId(value) {
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "string") {
    return /^\d+$/.test(value.trim());
  }
  return false;
}

function collectFriendIdsFromPayload(payload) {
  const ids = [];
  const seen = new Set();

  const pushId = (value) => {
    const id = String(value).trim();
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    ids.push(id);
  };

  const visit = (value, depth = 0) => {
    if (value === null || value === undefined || depth > 6) {
      return;
    }

    if (isNumericId(value)) {
      pushId(value);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, depth + 1);
      }
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    for (const [key, nested] of Object.entries(value)) {
      if ((key === "userId" || key === "friendUserId" || key === "fromUserId" || key === "toUserId")
        && isNumericId(nested)) {
        pushId(nested);
      } else {
        visit(nested, depth + 1);
      }
    }
  };

  visit(payload, 0);
  return ids;
}

async function loadExistingFriendIds(client) {
  const response = await client.friends.list();
  if (!response || !response.ok) {
    return new Set();
  }
  return new Set(collectFriendIdsFromPayload(response.data));
}

function requireValue(args, key) {
  const value = args[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required --${key}.`);
  }
  return value;
}

function collectModeArgs(args) {
  return normalizeModeList([
    args["prefer-mode"],
    args["prefer-modes"],
  ]);
}

function parseScalar(value) {
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  const text = String(value).trim();

  if (/^-?\d+$/.test(text)) {
    return Number.parseInt(text, 10);
  }

  if (/^-?(?:\d+\.\d+|\d+)$/.test(text) && text.includes(".")) {
    return Number.parseFloat(text);
  }

  if (["true", "false"].includes(text.toLowerCase())) {
    return text.toLowerCase() === "true";
  }

  return value;
}

async function loadJsonFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  const body = await fs.readFile(resolvedPath, "utf8");

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`Invalid JSON in file ${resolvedPath}: ${error.message}`);
  }
}

async function resolveJsonArg(args, key, options = {}) {
  const keys = [key, ...(options.altKeys || [])];
  const fileKeys = [options.fileKey || `${key}-file`, ...(options.altFileKeys || [])];

  for (const argKey of keys) {
    if (args[argKey] === undefined) {
      continue;
    }

    try {
      return JSON.parse(String(args[argKey]));
    } catch (error) {
      throw new Error(`Invalid JSON in --${argKey}: ${error.message}`);
    }
  }

  for (const fileKey of fileKeys) {
    if (args[fileKey] !== undefined) {
      return loadJsonFile(args[fileKey]);
    }
  }

  return options.defaultValue;
}

function ensurePlainObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected ${name} to be a JSON object.`);
  }

  return value;
}

function maybeAssign(target, key, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  target[key] = parseScalar(value);
}

function buildBossQueryFromArgs(args) {
  const query = {};

  maybeAssign(query, "bossId", args["boss-id"]);
  maybeAssign(query, "bossSessionId", args["boss-session-id"]);
  maybeAssign(query, "sessionId", args["session-id"]);
  maybeAssign(query, "targetUserId", args["target-user-id"]);
  maybeAssign(query, "friendUserId", args["friend-user-id"]);

  return Object.keys(query).length > 0 ? query : null;
}

function buildBossStartAttackPayload(args) {
  const payload = {};

  maybeAssign(payload, "bossId", args["boss-id"]);
  maybeAssign(payload, "mode", args.mode);
  payload.comboMode = args["combo-mode"] === undefined ? null : args["combo-mode"];

  return Object.keys(payload).length > 0 ? payload : undefined;
}

function buildBossUseWeaponPayload(args) {
  const payload = {};

  maybeAssign(payload, "weapon", args.weapon);
  maybeAssign(payload, "count", args.count === undefined ? 1 : args.count);

  return Object.keys(payload).length > 0 ? payload : undefined;
}

function buildBossHitPayloadFromArgs(args) {
  const rawType = args.type !== undefined ? args.type : args.weapon;
  const type = normalizeBossActionType(requireValue({ type: rawType }, "type"));
  const count = args.count === undefined
    ? buildBossActionPayload(type, null).count
    : asPositiveInt(args.count, "count");

  return {
    type,
    payload: buildBossActionPayload(type, count),
  };
}

function buildBossActionsView(catalog, options = {}) {
  const actions = buildBossActionCatalog(catalog.account && catalog.account.weaponStatsEffective);
  const includeZero = toBool(options["include-zero"], true);
  const equippedSlots = Array.isArray(options.weaponsData && options.weaponsData.equippedSlots)
    ? options.weaponsData.equippedSlots
    : [];

  return {
    generatedAt: catalog.generatedAt,
    session: catalog.account ? catalog.account.activeSession : null,
    weaponStatsEffective: catalog.account ? catalog.account.weaponStatsEffective : null,
    equippedSlots: {
      total: equippedSlots.length,
      occupied: equippedSlots.filter(Boolean).length,
      values: equippedSlots,
    },
    actions: includeZero ? actions : actions.filter((action) => !action.hasCharges || action.count > 0),
  };
}

const BOSS_SLOT_ACTION_TYPES = new Set([
  "poison",
  "gunshot",
  "knife",
]);

function normalizeBossSlotType(value) {
  const type = normalizeBossActionType(value);

  if (!BOSS_SLOT_ACTION_TYPES.has(type)) {
    throw new Error(
      `Boss slot supports only consumables: poison, gunshot, knife. Received: ${value}`,
    );
  }

  return type;
}

function parseBossSlotSequence(value) {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  const sequence = [];

  for (const item of values) {
    for (const part of String(item).split(/[\s,;]+/)) {
      const token = part.trim();
      if (!token) {
        continue;
      }

      sequence.push(normalizeBossSlotType(token));
    }
  }

  return sequence;
}

function buildBossSlotPayloadFromTypes(types) {
  return types.map((type) => ({ type }));
}

function buildBossSlotPayloadFromArgs(args) {
  const rawValue = args.types !== undefined
    ? args.types
    : args.slots !== undefined
      ? args.slots
      : args.items !== undefined
        ? args.items
        : undefined;

  if (rawValue === undefined) {
    return undefined;
  }

  return buildBossSlotPayloadFromTypes(parseBossSlotSequence(rawValue));
}

function buildBossSlotsView(catalog, weaponsData) {
  const actions = buildBossActionCatalog(catalog.account && catalog.account.weaponStatsEffective)
    .filter((action) => BOSS_SLOT_ACTION_TYPES.has(action.key));
  const equippedSlots = Array.isArray(weaponsData && weaponsData.equippedSlots)
    ? weaponsData.equippedSlots
    : [];
  const normalizedSlots = equippedSlots.map((slot, index) => {
    const rawType = slot && slot.type !== undefined ? String(slot.type).trim() : "";
    const type = rawType ? normalizeBossSlotType(rawType) : null;
    const action = type === null ? null : actions.find((item) => item.key === type) || null;

    return {
      index,
      slot: slot && slot.slot !== undefined ? pickNumeric(slot.slot, index) : index,
      type,
      count: slot && slot.count !== undefined ? pickNumeric(slot.count) : null,
      itemLabel: action ? action.itemLabel : null,
      attackLabel: action ? action.attackLabel : null,
      damage: action ? action.damage : null,
      ownedCount: action ? action.count : null,
    };
  });

  return {
    generatedAt: catalog.generatedAt,
    session: catalog.account ? catalog.account.activeSession : null,
    equippedSlots: {
      total: normalizedSlots.length,
      occupied: normalizedSlots.filter((slot) => slot.type !== null).length,
      values: normalizedSlots,
      raw: equippedSlots,
    },
    consumables: actions,
    payloadHints: {
      rootShape: "array",
      itemShape: {
        type: "poison | gunshot | knife",
      },
      examples: {
        poisonOnly: buildBossSlotPayloadFromTypes(["poison"]),
        poisonGunshotKnife: buildBossSlotPayloadFromTypes(["poison", "gunshot", "knife"]),
      },
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSuccessfulGameResponse(response) {
  if (!response || !response.ok) {
    return false;
  }

  const data = response.data;
  if (data && typeof data === "object" && data.success === false) {
    return false;
  }

  return true;
}

function pickNumeric(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
}

function summarizeBossCheckSession(response) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const session = payload && payload.session && typeof payload.session === "object"
    ? payload.session
    : null;

  return {
    ok: isSuccessfulGameResponse(response),
    hasSession: Boolean(payload.hasSession),
    hasReward: Boolean(payload.hasReward),
    sessionId: session ? session.sessionId ?? null : null,
    bossId: session ? session.bossId ?? null : null,
    mode: session ? session.mode ?? null : null,
    currentHp: session ? pickNumeric(session.currentHp) : null,
    baseHp: session ? pickNumeric(session.baseHp) : null,
    personalDamage: session ? pickNumeric(session.personalDamage, session.personalRawDamage) : null,
    isCompleted: session ? Boolean(session.isCompleted) : false,
    rewardClaimed: session ? Boolean(session.rewardClaimed) : false,
    endsAt: session ? session.endsAt ?? null : null,
    title: session ? session.title ?? null : null,
  };
}

function summarizeBossFriendDamage(response) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};

  return {
    ok: isSuccessfulGameResponse(response),
    sessionId: payload.sessionId ?? null,
    itemsCount: Array.isArray(payload.items) ? payload.items.length : 0,
    isOver: payload.isOver === undefined ? null : Boolean(payload.isOver),
    currentHp: pickNumeric(payload.currentHp),
  };
}

function summarizeBossRewards(response) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const status = payload.status ?? null;
  const ready = payload.ready === true
    || status === "ready"
    || status === "claim_ready"
    || (payload.success === true && status !== "not_ready");

  return {
    ok: isSuccessfulGameResponse(response),
    ready,
    status,
    readyAt: payload.readyAt ?? null,
    retryAfterMs: pickNumeric(payload.retryAfterMs),
    data: payload,
  };
}

async function loadBossRuntimeSnapshot(client, bossId) {
  const query = bossId === null || bossId === undefined ? null : { bossId };
  const [sessionResponse, friendDamageResponse, rewardsResponse] = await Promise.all([
    client.bosses.checkSession(query),
    client.bosses.friendDamage(query),
    client.bosses.rewards(),
  ]);
  const session = summarizeBossCheckSession(sessionResponse);
  const friendDamage = summarizeBossFriendDamage(friendDamageResponse);
  const rewards = summarizeBossRewards(rewardsResponse);

  return {
    sessionResponse,
    friendDamageResponse,
    rewardsResponse,
    summary: {
      bossId: session.bossId ?? bossId ?? null,
      sessionId: session.sessionId,
      hasSession: session.hasSession,
      hasReward: session.hasReward || rewards.ready,
      rewardReady: session.hasReward || rewards.ready,
      rewardClaimed: session.rewardClaimed,
      isCompleted: session.isCompleted || friendDamage.isOver === true || pickNumeric(session.currentHp, friendDamage.currentHp) === 0,
      currentHp: pickNumeric(session.currentHp, friendDamage.currentHp),
      baseHp: session.baseHp,
      personalDamage: session.personalDamage,
      friendDamageItemsCount: friendDamage.itemsCount,
      rewardStatus: rewards.status,
      rewardReadyAt: rewards.readyAt,
      rewardRetryAfterMs: rewards.retryAfterMs,
      endsAt: session.endsAt,
      title: session.title,
    },
  };
}

function buildBossHitOutcome(item, response, previousSnapshot, nextSnapshot) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const previous = previousSnapshot && previousSnapshot.summary ? previousSnapshot.summary : {};
  const next = nextSnapshot && nextSnapshot.summary ? nextSnapshot.summary : {};
  const previousHp = pickNumeric(previous.currentHp);
  const nextHp = pickNumeric(
    payload.currentHp,
    payload.bossHp,
    payload.hp,
    next.currentHp,
  );
  const previousPersonalDamage = pickNumeric(previous.personalDamage);
  const nextPersonalDamage = pickNumeric(
    payload.personalDamage,
    payload.personalRawDamage,
    next.personalDamage,
  );
  const hpDelta = previousHp !== null && nextHp !== null ? previousHp - nextHp : null;
  const personalDamageDelta = previousPersonalDamage !== null && nextPersonalDamage !== null
    ? nextPersonalDamage - previousPersonalDamage
    : null;
  const directDamage = pickNumeric(payload.damage, payload.rawDamage, payload.hitDamage, payload.deltaDamage);
  const progressed = (hpDelta !== null && hpDelta > 0)
    || (personalDamageDelta !== null && personalDamageDelta > 0)
    || (directDamage !== null && directDamage > 0);

  return {
    type: item.type,
    payload: item.payload,
    ok: isSuccessfulGameResponse(response),
    status: response ? response.status : null,
    message: payload && typeof payload.message === "string" ? payload.message : null,
    currentHp: nextHp,
    previousHp,
    hpDelta,
    personalDamage: nextPersonalDamage,
    previousPersonalDamage,
    personalDamageDelta,
    directDamage,
    progressed,
    response,
    snapshot: nextSnapshot.summary,
  };
}

async function executeBossRunnerLoop(client, plan, options = {}) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const delayMs = options.delayMs ?? 250;
  const continueOnError = Boolean(options.continueOnError);
  const stopOnNoProgress = options.stopOnNoProgress !== false;
  const maxCycles = Math.max(1, Number(options.maxCycles) || 1);
  const claimWhenReady = Boolean(options.claimWhenReady);
  const selectedBossId = plan.selectedBoss ? plan.selectedBoss.id : null;
  const result = {
    dryRun: false,
    options: {
      delayMs,
      continueOnError,
      stopOnNoProgress,
      maxCycles,
      claimWhenReady,
    },
    plan,
    startResponse: null,
    initialSnapshot: null,
    cycles: [],
    haltedReason: null,
    claim: null,
    finalSnapshot: null,
    elapsedMs: null,
    timing: {
      startedAt,
      finishedAt: null,
      elapsedMs: null,
    },
  };
  const finishResult = () => {
    const elapsedMs = Math.max(0, Math.round(Date.now() - startedAtMs));
    result.elapsedMs = elapsedMs;
    result.timing.finishedAt = new Date().toISOString();
    result.timing.elapsedMs = elapsedMs;
    return result;
  };

  if (plan.startPlan.action === "start-attack") {
    result.startResponse = await client.bosses.startAttack(plan.startPlan.payload);
    if (!isSuccessfulGameResponse(result.startResponse)) {
      result.haltedReason = "start_attack_failed";
      result.finalSnapshot = await loadBossRuntimeSnapshot(client, selectedBossId);
      return finishResult();
    }
  }

  result.initialSnapshot = await loadBossRuntimeSnapshot(client, selectedBossId);
  let currentSnapshot = result.initialSnapshot;

  if (currentSnapshot.summary.rewardReady) {
    result.haltedReason = "reward_ready_before_hits";
  }

  for (let cycleIndex = 0; cycleIndex < maxCycles && !result.haltedReason; cycleIndex += 1) {
    const cycle = {
      cycleIndex,
      hits: [],
      preSnapshot: currentSnapshot.summary,
      postSnapshot: null,
    };
    let cycleProgressed = false;

    if (!currentSnapshot.summary.hasSession) {
      result.haltedReason = "no_active_session";
      cycle.postSnapshot = currentSnapshot.summary;
      result.cycles.push(cycle);
      break;
    }

    if (currentSnapshot.summary.rewardReady || currentSnapshot.summary.isCompleted) {
      result.haltedReason = "session_already_finished";
      cycle.postSnapshot = currentSnapshot.summary;
      result.cycles.push(cycle);
      break;
    }

    for (let hitIndex = 0; hitIndex < plan.requests.length; hitIndex += 1) {
      const item = plan.requests[hitIndex];
      const response = await client.bosses.useWeapon(item.payload);
      const nextSnapshot = await loadBossRuntimeSnapshot(client, selectedBossId);
      const hit = buildBossHitOutcome(item, response, currentSnapshot, nextSnapshot);
      hit.hitIndex = hitIndex;
      cycle.hits.push(hit);
      currentSnapshot = nextSnapshot;

      if (hit.progressed) {
        cycleProgressed = true;
      }

      if (!hit.ok && !continueOnError) {
        result.haltedReason = "hit_failed";
        break;
      }

      if (currentSnapshot.summary.rewardReady || currentSnapshot.summary.isCompleted) {
        result.haltedReason = "session_finished";
        break;
      }

      if (delayMs > 0 && hitIndex !== plan.requests.length - 1) {
        await sleep(delayMs);
      }
    }

    cycle.postSnapshot = currentSnapshot.summary;
    result.cycles.push(cycle);

    if (!result.haltedReason && stopOnNoProgress && !cycleProgressed) {
      result.haltedReason = "no_progress";
      break;
    }
  }

  result.finalSnapshot = currentSnapshot;

  if (
    claimWhenReady &&
    currentSnapshot.summary.rewardReady &&
    !currentSnapshot.summary.rewardClaimed
  ) {
    const response = await client.bosses.claim();
    const afterClaimSnapshot = await loadBossRuntimeSnapshot(client, selectedBossId);
    result.claim = {
      ok: isSuccessfulGameResponse(response),
      response,
      snapshot: afterClaimSnapshot.summary,
    };
    result.finalSnapshot = afterClaimSnapshot;
  }

  if (!result.haltedReason) {
    result.haltedReason = "max_cycles_reached";
  }

  return finishResult();
}

async function runBossRequest(client, options) {
  const requestPreview = {
    method: options.method,
    path: options.path,
    query: options.query ?? null,
    json: options.json === undefined ? null : options.json,
  };

  if (options.dryRun) {
    return {
      dryRun: true,
      request: requestPreview,
    };
  }

  if (options.method === "GET") {
    return client.get(options.path, {
      query: options.query,
    });
  }

  return client.post(options.path, {
    query: options.query,
    ...(options.json === undefined ? {} : { json: options.json }),
  });
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function maybeSaveArtifact(args, prefix, payload) {
  if (!toBool(args.save, false)) {
    return null;
  }

  return writeVersionedJson(prefix, payload);
}

function usage() {
  return [
    "Usage:",
    "  node scripts/api-cli.js ids:collect --save",
    "  node scripts/api-cli.js friends:add --ids 123,456",
    "  node scripts/api-cli.js friends:add-collected --sources authority-top,weekly-damage --max 25",
    "  node scripts/api-cli.js friends:remove --file ids.txt",
    "  node scripts/api-cli.js friends:accept-requests --min-talents 50 --min-weekly-damage 1000000 --dry-run",
    "  node scripts/api-cli.js friends:clean --min-talents 50 --min-weekly-damage 1000000 --max 25 --dry-run",
    "  node scripts/api-cli.js player:view --id 123456",
    "  node scripts/api-cli.js interaction:perform --to 123456 --type UpgradeBiceps",
    "  node scripts/api-cli.js interaction:batch --type Harknut --file ids.txt",
    "  node scripts/api-cli.js interaction:batch-collected --type UpgradeBiceps --max 50",
    "  node scripts/api-cli.js interaction:notifications --id 123456",
    "  node scripts/api-cli.js bosses:list --category 1",
    "  node scripts/api-cli.js bosses:arrivals --ids 13,14",
    "  node scripts/api-cli.js bosses:catalog --save",
    "  node scripts/api-cli.js bosses:limits",
    "  node scripts/api-cli.js bosses:active-session",
    "  node scripts/api-cli.js bosses:actions",
    "  node scripts/api-cli.js bosses:slots",
    "  node scripts/api-cli.js bosses:queue --open-only",
    "  node scripts/api-cli.js bosses:runner-start --boss-id 19 --mode pacansky --dry-run",
    "  node scripts/api-cli.js bosses:runner-hit --boss-id 19 --mode pacansky --types punch,gunshot --dry-run",
    "  node scripts/api-cli.js bosses:runner-loop --boss-id 19 --mode pacansky --types punch,gunshot --max-cycles 3 --claim true --dry-run",
    "  node scripts/api-cli.js bosses:save-slots --types poison,gunshot --dry-run",
    "  node scripts/api-cli.js bosses:hit --type punch --dry-run",
    "  node scripts/api-cli.js bosses:hit-seq --types punch,kick,eyes,knee --dry-run",
    "  node scripts/api-cli.js bosses:check-session --boss-id 13 --dry-run",
    "  node scripts/api-cli.js bosses:start-attack --boss-id 1 --mode pacansky --dry-run",
    "  node scripts/api-cli.js bosses:use-weapon --weapon poison --count 1 --dry-run",
    "  node scripts/api-cli.js bosses:raw --method POST --path /api/boss/start-attack --json-file payload.json",
    "  node scripts/api-cli.js bosses:snapshot",
    "  node scripts/api-cli.js prison:status",
    "  node scripts/api-cli.js prison:detail --prison-id 1",
    "  node scripts/api-cli.js prison:checkpoints --prison-id 1 --is-day true",
    "  node scripts/api-cli.js prison:work --prison-id 1 --is-day true --dry-run",
    "  node scripts/api-cli.js prison:runner-once --prison-id 1 --is-day false --steps 3 --dry-run",
    "  node scripts/api-cli.js mobile:collect --dry-run",
    "  node scripts/api-cli.js mobile:escape-collect --dry-run",
    "  node scripts/api-cli.js damage:snapshot --kind hourly",
    "  node scripts/api-cli.js damage:snapshot --kind boundary",
    "  node scripts/api-cli.js damage:report --period hourly",
    "  node scripts/api-cli.js damage:report --period weekly",
    "  node scripts/api-cli.js damage:report --period daily",
    "",
    "Commands:",
    "  damage:snapshot",
    "  damage:report",
    "  ids:collect",
    "  friends:add",
    "  friends:add-collected",
    "  friends:remove",
    "  friends:accept-requests",
    "  friends:clean",
    "  friends:list",
    "  friends:requests",
    "  player:view",
    "  interaction:perform",
    "  interaction:batch",
    "  interaction:batch-collected",
    "  interaction:notifications",
    "  prisons:all",
    "  prison:status",
    "  prison:detail",
    "  prison:checkpoints",
    "  prison:work",
    "  prison:runner-once",
    "  mobile:progress",
    "  mobile:collect",
    "  mobile:escape-progress",
    "  mobile:escape-collect",
    "  bosses:bootstrap",
    "  bosses:list",
    "  bosses:arrivals",
    "  bosses:catalog",
    "  bosses:limits",
    "  bosses:active-session",
    "  bosses:actions",
    "  bosses:slots",
    "  bosses:queue",
    "  bosses:runner-start",
    "  bosses:runner-hit",
    "  bosses:runner-loop",
    "  bosses:rewards",
    "  bosses:weapons",
    "  bosses:hit",
    "  bosses:hit-seq",
    "  bosses:check-session",
    "  bosses:start-attack",
    "  bosses:friend-damage",
    "  bosses:use-weapon",
    "  bosses:surrender",
    "  bosses:restore-free-hit",
    "  bosses:save-slots",
    "  bosses:save-equipped-weapons",
    "  bosses:buy-keys",
    "  bosses:buy-weapon",
    "  bosses:claim",
    "  bosses:raw",
    "  bosses:snapshot",
  ].join("\n");
}

async function handleBulk(command, args, client) {
  const ids = await resolveIds(args);
  if (ids.length === 0) {
    throw new Error("Provide at least one ID via --id, --ids or --file.");
  }

  const delayMs = args["delay-ms"] === undefined ? 250 : asPositiveInt(args["delay-ms"], "delay-ms");
  const results = [];

  for (const id of ids) {
    let response;

    if (command === "friends:add") {
      response = await client.friends.sendRequest(id);
    } else {
      response = await client.friends.remove(id);
    }

    results.push({
      id,
      ok: response.ok,
      status: response.status,
      data: response.data,
    });

    if (delayMs > 0 && id !== ids[ids.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    command,
    total: ids.length,
    okCount: results.filter((item) => item.ok).length,
    failCount: results.filter((item) => !item.ok).length,
    results,
  };
}

async function collectIdsView(args, client) {
  return collectLeaderboardIds(client, {
    limit: args.limit === undefined ? 100 : asPositiveInt(args.limit, "limit"),
    sources: args.sources !== undefined ? args.sources : args.source,
  });
}

async function handleDamageSnapshot(args, client, selfUserId) {
  const snapshot = await createDamageSnapshot(client, {
    kind: args.kind,
    limit: args.limit === undefined ? undefined : asPositiveInt(args.limit, "limit"),
    selfUserId,
  });
  const storage = await saveDamageSnapshot(snapshot);

  return {
    command: "damage:snapshot",
    snapshotKind: snapshot.snapshotKind,
    generatedAt: snapshot.generatedAt,
    dayKey: snapshot.dayKey,
    timeKey: snapshot.timeKey,
    timeZoneOffset: snapshot.timeZoneOffset,
    reset: snapshot.reset,
    request: snapshot.request,
    summary: snapshot.summary,
    storage,
  };
}

async function handleDamageReport(args, client, selfUserId) {
  const period = args.period === undefined ? "weekly" : String(args.period).trim().toLowerCase();
  const useLive = args.live === undefined ? undefined : toBool(args.live, true);
  const report = await createDamageReport(client, {
    period,
    dayKey: args.date === undefined ? undefined : String(args.date).trim(),
    useLive,
    limit: args.limit === undefined ? undefined : asPositiveInt(args.limit, "limit"),
    top: args.top === undefined ? undefined : asPositiveInt(args.top, "top"),
    selfUserId,
  });
  const artifact = await maybeSaveArtifact(args, "damage-report", report);

  return artifact ? { ...report, artifact } : report;
}

async function handleCollectedInviteBatch(args, client, selfUserId) {
  const collected = await collectIdsView(args, client);
  const excludeSelf = toBool(args["exclude-self"], true);
  const delayMs = args["delay-ms"] === undefined ? 300 : asPositiveInt(args["delay-ms"], "delay-ms");
  const max = args.max === undefined ? null : asPositiveInt(args.max, "max");
  const dryRun = toBool(args["dry-run"], false);
  const targets = [];

  for (const item of collected.uniqueIds.values) {
    if (excludeSelf && selfUserId && String(item.userId) === String(selfUserId)) {
      continue;
    }

    targets.push(item);

    if (max !== null && targets.length >= max) {
      break;
    }
  }

  const existingFriendIds = await loadExistingFriendIds(client);
  const filteredTargets = targets.filter((item) => !existingFriendIds.has(String(item.userId)));

  const results = [];

  for (const target of filteredTargets) {
    if (dryRun) {
      results.push({
        userId: target.userId,
        dryRun: true,
        sources: target.sources,
        bestRank: target.bestRank,
      });
    } else {
      const response = await client.friends.sendRequest(target.userId);
      results.push({
        userId: target.userId,
        nickname: target.nickname,
        sources: target.sources,
        bestRank: target.bestRank,
        ok: response.ok,
        status: response.status,
        data: response.data,
      });
    }

    if (delayMs > 0 && target !== filteredTargets[filteredTargets.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    command: "friends:add-collected",
    requestedSources: collected.requestedSources,
    collectedUniqueTotal: collected.uniqueIds.total,
    requestedTotal: targets.length,
    selectedTotal: filteredTargets.length,
    skippedExisting: targets.length - filteredTargets.length,
    existingFriendsTotal: existingFriendIds.size,
    delayMs,
    dryRun,
    targets: filteredTargets,
    okCount: dryRun ? filteredTargets.length : results.filter((item) => item.ok).length,
    failCount: dryRun ? 0 : results.filter((item) => !item.ok).length,
    results,
    collected,
  };
}

async function handleInteractionBatch(args, client, selfUserId) {
  const toUserIds = await resolveIds(args);
  if (toUserIds.length === 0) {
    throw new Error("Provide at least one target ID via --id, --ids or --file.");
  }

  const type = requireValue(args, "type");
  if (!INTERACTION_TYPES.has(type)) {
    throw new Error(`Unsupported interaction type: ${type}`);
  }

  const fromUserId = args.from ? String(args.from) : selfUserId;
  if (!fromUserId) {
    throw new Error("Could not determine self user ID from session. Pass --from explicitly.");
  }

  const delayMs = args["delay-ms"] === undefined ? 350 : asPositiveInt(args["delay-ms"], "delay-ms");
  const results = [];

  for (const toUserId of toUserIds) {
    const response = await client.interactions.perform({
      fromUserId,
      toUserId,
      type,
    });

    results.push({
      toUserId,
      ok: response.ok,
      status: response.status,
      data: response.data,
    });

    if (delayMs > 0 && toUserId !== toUserIds[toUserIds.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    command: "interaction:batch",
    fromUserId,
    type,
    total: toUserIds.length,
    okCount: results.filter((item) => item.ok).length,
    failCount: results.filter((item) => !item.ok).length,
    results,
  };
}

async function handleCollectedInteractionBatch(args, client, selfUserId) {
  const type = requireValue(args, "type");
  if (!INTERACTION_TYPES.has(type)) {
    throw new Error(`Unsupported interaction type: ${type}`);
  }

  const fromUserId = args.from ? String(args.from) : selfUserId;
  if (!fromUserId) {
    throw new Error("Could not determine self user ID from session. Pass --from explicitly.");
  }

  const collected = await collectIdsView(args, client);
  const excludeSelf = toBool(args["exclude-self"], true);
  const delayMs = args["delay-ms"] === undefined ? 350 : asPositiveInt(args["delay-ms"], "delay-ms");
  const max = args.max === undefined ? null : asPositiveInt(args.max, "max");
  const dryRun = toBool(args["dry-run"], false);
  const continueOnError = toBool(args["continue-on-error"], true);
  const targets = [];

  for (const item of collected.uniqueIds.values) {
    if (excludeSelf && selfUserId && String(item.userId) === String(selfUserId)) {
      continue;
    }

    targets.push(item);

    if (max !== null && targets.length >= max) {
      break;
    }
  }

  const results = [];

  for (const target of targets) {
    if (dryRun) {
      results.push({
        toUserId: target.userId,
        dryRun: true,
        nickname: target.nickname,
        sources: target.sources,
        bestRank: target.bestRank,
      });
    } else {
      const response = await client.interactions.perform({
        fromUserId,
        toUserId: target.userId,
        type,
      });

      const row = {
        toUserId: target.userId,
        nickname: target.nickname,
        sources: target.sources,
        bestRank: target.bestRank,
        ok: response.ok,
        status: response.status,
        data: response.data,
      };

      results.push(row);

      if (!row.ok && !continueOnError) {
        break;
      }
    }

    if (delayMs > 0 && target !== targets[targets.length - 1]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return {
    command: "interaction:batch-collected",
    fromUserId,
    type,
    requestedSources: collected.requestedSources,
    collectedUniqueTotal: collected.uniqueIds.total,
    selectedTotal: targets.length,
    delayMs,
    dryRun,
    continueOnError,
    targets,
    okCount: dryRun ? targets.length : results.filter((item) => item.ok).length,
    failCount: dryRun ? 0 : results.filter((item) => !item.ok).length,
    results,
    collected,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  activeCliCommand = command || null;
  activeCliStartedAt = Date.now();

  if (!command || args.help) {
    logEvent("cli.help", { arguments: args });
    await flushLogs();
    process.stdout.write(`${usage()}\n`);
    return;
  }

  logEvent("cli.command.started", {
    command,
    arguments: args,
  });

  const session = await loadSessionSnapshot(args.session);
  const client = await createApiClient({ sessionPath: args.session, session });
  const selfUserId = String(session.telegram && session.telegram.initDataUnsafe && session.telegram.initDataUnsafe.user
    ? session.telegram.initDataUnsafe.user.id
    : "");

  let output;

  switch (command) {
    case "damage:snapshot":
      output = await handleDamageSnapshot(args, client, selfUserId);
      break;

    case "damage:report":
      output = await handleDamageReport(args, client, selfUserId);
      break;

    case "ids:collect": {
      const collected = await collectIdsView(args, client);
      const artifact = await maybeSaveArtifact(args, "ids-collect", collected);
      output = artifact ? { ...collected, artifact } : collected;
      break;
    }

    case "friends:add":
    case "friends:remove":
      output = await handleBulk(command, args, client);
      break;

    case "friends:add-collected": {
      const batch = await handleCollectedInviteBatch(args, client, selfUserId);
      const artifact = await maybeSaveArtifact(args, "friends-add-collected", batch);
      output = artifact ? { ...batch, artifact } : batch;
      break;
    }

    case "friends:accept-requests": {
      const batch = await acceptFriendRequests(args, args.session);
      const artifact = await maybeSaveArtifact(args, "friends-accept-requests", batch);
      output = artifact ? { ...batch, artifact } : batch;
      break;
    }

    case "friends:clean": {
      const batch = await cleanupFriends(args, args.session);
      const artifact = await maybeSaveArtifact(args, "friends-clean", batch);
      output = artifact ? { ...batch, artifact } : batch;
      break;
    }

    case "friends:list":
      output = await client.friends.list();
      break;

    case "friends:requests":
      output = await client.friends.requests({
        page: args.page === undefined ? 0 : asNonNegativeInt(args.page, "page"),
        pageSize: args["page-size"] === undefined ? 30 : asPositiveInt(args["page-size"], "page-size"),
      });
      break;

    case "player:view": {
      const userId = requireValue(args, "id");
      output = await client.players.view(userId);
      break;
    }

    case "interaction:notifications": {
      const userId = requireValue(args, "id");
      output = await client.interactions.notifications(userId);
      break;
    }

    case "interaction:perform": {
      const toUserId = requireValue(args, "to");
      const type = requireValue(args, "type");

      if (!INTERACTION_TYPES.has(type)) {
        throw new Error(`Unsupported interaction type: ${type}`);
      }

      const fromUserId = args.from ? String(args.from) : selfUserId;
      if (!fromUserId) {
        throw new Error("Could not determine self user ID from session. Pass --from explicitly.");
      }

      output = await client.interactions.perform({
        fromUserId,
        toUserId: String(toUserId),
        type,
      });
      break;
    }

    case "interaction:batch":
      output = await handleInteractionBatch(args, client, selfUserId);
      break;

    case "interaction:batch-collected": {
      const batch = await handleCollectedInteractionBatch(args, client, selfUserId);
      const artifact = await maybeSaveArtifact(args, "interaction-batch-collected", batch);
      output = artifact ? { ...batch, artifact } : batch;
      break;
    }

    case "prisons:all":
      output = await client.prisons.all();
      break;

    case "prison:status":
      output = {
        prisons: await client.prisons.all(),
        mobile: await client.mobile.progress(),
        escape: await client.mobile.escapeProgress(),
      };
      break;

    case "prison:detail": {
      const prisonId = asPositiveInt(requireValue(args, "prison-id"), "prison-id");
      const detail = await loadPrisonDetail(client, prisonId);
      const artifact = await maybeSaveArtifact(args, "prison-detail", detail.view);
      output = artifact ? { ...detail.view, artifact } : detail.view;
      break;
    }

    case "prison:checkpoints": {
      const prisonId = requireValue(args, "prison-id");
      output = await client.players.prisonCheckpoints(prisonId, {
        isDay: toBool(args["is-day"], true),
      });
      break;
    }

    case "prison:work": {
      const prisonId = asPositiveInt(requireValue(args, "prison-id"), "prison-id");
      const isDay = toBool(args["is-day"], true);
      const request = buildPrisonWorkRequest(prisonId, isDay);

      if (toBool(args["dry-run"], false)) {
        output = {
          dryRun: true,
          request,
        };
      } else {
        output = await client.players.prisonWork(prisonId, { isDay });
      }
      break;
    }

    case "prison:runner-once": {
      const prisonId = asPositiveInt(requireValue(args, "prison-id"), "prison-id");
      const isDay = toBool(args["is-day"], true);
      const steps = args.steps === undefined ? 1 : asPositiveInt(args.steps, "steps");
      const delayMs = args["delay-ms"] === undefined ? 250 : asNonNegativeInt(args["delay-ms"], "delay-ms");
      const continueOnError = toBool(args["continue-on-error"], false);
      const stopOnNoProgress = toBool(args["stop-on-no-progress"], true);
      const before = await loadPrisonDetail(client, prisonId);
      const request = buildPrisonWorkRequest(prisonId, isDay);

      if (toBool(args["dry-run"], false)) {
        output = {
          dryRun: true,
          prisonId,
          modeKey: isDay ? "day" : "night",
          steps,
          delayMs,
          continueOnError,
          stopOnNoProgress,
          before: before.view,
          request,
        };
      } else {
        output = await executePrisonRunnerOnce(client, {
          prisonId,
          isDay,
          steps,
          delayMs,
          continueOnError,
          stopOnNoProgress,
        });
      }

      const artifact = await maybeSaveArtifact(args, "prison-runner-once", output);
      output = artifact ? { ...output, artifact } : output;
      break;
    }

    case "mobile:progress":
      output = await client.mobile.progress();
      break;

    case "mobile:collect":
      if (toBool(args["dry-run"], false)) {
        output = {
          dryRun: true,
          request: {
            method: "POST",
            path: "/api/mobile/collect",
            query: null,
            json: undefined,
          },
        };
      } else {
        output = await client.mobile.collect();
      }
      break;

    case "mobile:escape-progress":
      output = await client.mobile.escapeProgress();
      break;

    case "mobile:escape-collect":
      if (toBool(args["dry-run"], false)) {
        output = {
          dryRun: true,
          request: {
            method: "POST",
            path: "/api/mobile/escape-collect",
            query: null,
            json: undefined,
          },
        };
      } else {
        output = await client.mobile.escapeCollect();
      }
      break;

    case "bosses:bootstrap":
      output = await client.bosses.bootstrap();
      break;

    case "bosses:list": {
      const categoryId = requireValue(args, "category");
      output = await client.bosses.list(categoryId);
      break;
    }

    case "bosses:arrivals": {
      const ids = await resolveIds(args);
      if (ids.length === 0) {
        throw new Error("Provide at least one boss ID via --id, --ids or --file.");
      }
      output = await client.bosses.arrivals(ids);
      break;
    }

    case "bosses:catalog": {
      const catalog = await buildBossCatalog(client);
      const artifact = await maybeSaveArtifact(args, "boss-catalog", catalog);
      output = artifact ? { ...catalog, artifact } : catalog;
      break;
    }

    case "bosses:limits": {
      const catalog = await buildBossCatalog(client);
      const limits = buildBossLimitsView(catalog);
      const artifact = await maybeSaveArtifact(args, "boss-limits", limits);
      output = artifact ? { ...limits, artifact } : limits;
      break;
    }

    case "bosses:active-session": {
      const catalog = await buildBossCatalog(client);
      const activeSession = buildActiveSessionView(catalog);
      const artifact = await maybeSaveArtifact(args, "boss-active-session", activeSession);
      output = artifact ? { ...activeSession, artifact } : activeSession;
      break;
    }

    case "bosses:actions": {
      const [catalog, weaponsResponse] = await Promise.all([
        buildBossCatalog(client),
        client.bosses.weapons(),
      ]);
      const actionsView = buildBossActionsView(catalog, {
        ...args,
        weaponsData: weaponsResponse && weaponsResponse.data ? weaponsResponse.data : null,
      });
      const artifact = await maybeSaveArtifact(args, "boss-actions", actionsView);
      output = artifact ? { ...actionsView, artifact } : actionsView;
      break;
    }

    case "bosses:slots": {
      const [catalog, weaponsResponse] = await Promise.all([
        buildBossCatalog(client),
        client.bosses.weapons(),
      ]);
      const slotsView = buildBossSlotsView(catalog, weaponsResponse && weaponsResponse.data ? weaponsResponse.data : null);
      const artifact = await maybeSaveArtifact(args, "boss-slots", slotsView);
      output = artifact ? { ...slotsView, artifact } : slotsView;
      break;
    }

    case "bosses:queue": {
      const catalog = await buildBossCatalog(client);
      const bossIds = await resolveBossIds(args);
      const queue = buildBossQueueView(catalog, {
        bossIds: bossIds.map((id) => Number(id)),
        categoryId: args.category === undefined ? null : asPositiveInt(args.category, "category"),
        mode: args.mode === undefined ? null : String(args.mode),
        preferredModes: collectModeArgs(args),
        openOnly: toBool(args["open-only"], false),
      });
      const artifact = await maybeSaveArtifact(args, "boss-queue", queue);
      output = artifact ? { ...queue, artifact } : queue;
      break;
    }

    case "bosses:runner-start": {
      const catalog = await buildBossCatalog(client);
      const bossIds = await resolveBossIds(args);
      const explicitBossId = args["boss-id"] !== undefined
        ? asPositiveInt(args["boss-id"], "boss-id")
        : bossIds.length === 1
          ? Number(bossIds[0])
          : null;
      const plan = prepareBossRunnerStart(catalog, {
        bossId: explicitBossId,
        bossIds: bossIds.map((id) => Number(id)),
        categoryId: args.category === undefined ? null : asPositiveInt(args.category, "category"),
        mode: args.mode === undefined ? null : String(args.mode),
        preferredModes: collectModeArgs(args),
        openOnly: toBool(args["open-only"], false),
        forceNew: toBool(args["force-new"], false),
      });

      if (toBool(args["dry-run"], false)) {
        output = {
          dryRun: true,
          plan,
        };
      } else if (plan.action === "reuse-active") {
        output = plan;
      } else {
        const startResponse = await client.bosses.startAttack(plan.payload);
        const sessionResponse = await client.bosses.checkSession({ bossId: plan.selectedBoss.id });
        output = {
          ...plan,
          startResponse,
          sessionResponse,
        };
      }

      const artifact = await maybeSaveArtifact(args, "boss-runner-start", output);
      output = artifact ? { ...output, artifact } : output;
      break;
    }

    case "bosses:runner-hit": {
      const catalog = await buildBossCatalog(client);
      const bossIds = await resolveBossIds(args);
      const explicitBossId = args["boss-id"] !== undefined
        ? asPositiveInt(args["boss-id"], "boss-id")
        : bossIds.length === 1
          ? Number(bossIds[0])
          : null;
      const sequence = args.types !== undefined ? args.types : undefined;
      const delayMs = args["delay-ms"] === undefined ? 250 : asNonNegativeInt(args["delay-ms"], "delay-ms");
      const continueOnError = toBool(args["continue-on-error"], false);
      const plan = prepareBossRunnerHit(catalog, {
        bossId: explicitBossId,
        bossIds: bossIds.map((id) => Number(id)),
        categoryId: args.category === undefined ? null : asPositiveInt(args.category, "category"),
        mode: args.mode === undefined ? null : String(args.mode),
        preferredModes: collectModeArgs(args),
        openOnly: toBool(args["open-only"], false),
        forceNew: toBool(args["force-new"], false),
        types: sequence,
      });

      if (toBool(args["dry-run"], false)) {
        output = {
          dryRun: true,
          delayMs,
          continueOnError,
          plan,
        };
      } else {
        const startPlan = plan.startPlan;
        let startResponse = null;
        let sessionResponse = null;

        if (startPlan.action === "start-attack") {
          startResponse = await client.bosses.startAttack(startPlan.payload);
          sessionResponse = await client.bosses.checkSession({ bossId: startPlan.selectedBoss.id });
        } else if (startPlan.selectedBoss) {
          sessionResponse = await client.bosses.checkSession({ bossId: startPlan.selectedBoss.id });
        }

        const results = [];

        for (let index = 0; index < plan.requests.length; index += 1) {
          const item = plan.requests[index];
          const response = await client.bosses.useWeapon(item.payload);
          results.push({
            index,
            type: item.type,
            payload: item.payload,
            ok: response.ok,
            status: response.status,
            data: response.data,
          });

          if (!response.ok && !continueOnError) {
            break;
          }

          if (delayMs > 0 && index !== plan.requests.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }

        const finalSessionBossId = plan.selectedBoss ? plan.selectedBoss.id : null;
        const finalSession = finalSessionBossId === null
          ? null
          : await client.bosses.checkSession({ bossId: finalSessionBossId });

        output = {
          dryRun: false,
          delayMs,
          continueOnError,
          plan,
          startResponse,
          sessionResponse,
          total: plan.requests.length,
          completed: results.length,
          results,
          finalSession,
        };
      }

      const artifact = await maybeSaveArtifact(args, "boss-runner-hit", output);
      output = artifact ? { ...output, artifact } : output;
      break;
    }

    case "bosses:runner-loop": {
      const catalog = await buildBossCatalog(client);
      const bossIds = await resolveBossIds(args);
      const explicitBossId = args["boss-id"] !== undefined
        ? asPositiveInt(args["boss-id"], "boss-id")
        : bossIds.length === 1
          ? Number(bossIds[0])
          : null;
      const sequence = args.types !== undefined ? args.types : undefined;
      const plan = prepareBossRunnerHit(catalog, {
        bossId: explicitBossId,
        bossIds: bossIds.map((id) => Number(id)),
        categoryId: args.category === undefined ? null : asPositiveInt(args.category, "category"),
        mode: args.mode === undefined ? null : String(args.mode),
        preferredModes: collectModeArgs(args),
        openOnly: toBool(args["open-only"], false),
        forceNew: toBool(args["force-new"], false),
        types: sequence,
      });
      const maxCycles = args["max-cycles"] !== undefined
        ? asPositiveInt(args["max-cycles"], "max-cycles")
        : args.cycles !== undefined
          ? asPositiveInt(args.cycles, "cycles")
          : 1;
      const delayMs = args["delay-ms"] === undefined ? 250 : asNonNegativeInt(args["delay-ms"], "delay-ms");
      const continueOnError = toBool(args["continue-on-error"], false);
      const stopOnNoProgress = toBool(args["stop-on-no-progress"], true);
      const claimWhenReady = toBool(args.claim, false);

      if (toBool(args["dry-run"], false)) {
        output = {
          dryRun: true,
          options: {
            maxCycles,
            delayMs,
            continueOnError,
            stopOnNoProgress,
            claimWhenReady,
          },
          plan,
        };
      } else {
        output = await executeBossRunnerLoop(client, plan, {
          maxCycles,
          delayMs,
          continueOnError,
          stopOnNoProgress,
          claimWhenReady,
        });
      }

      const artifact = await maybeSaveArtifact(args, "boss-runner-loop", output);
      output = artifact ? { ...output, artifact } : output;
      break;
    }

    case "bosses:rewards":
      output = await client.bosses.rewards();
      break;

    case "bosses:weapons":
      output = await client.bosses.weapons();
      break;

    case "bosses:hit": {
      const { type, payload } = buildBossHitPayloadFromArgs(args);
      const response = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/use-weapon",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      output = {
        actionType: type,
        payload,
        request: response.request || null,
        dryRun: Boolean(response.dryRun),
        response: response.dryRun ? null : response,
      };
      break;
    }

    case "bosses:hit-seq": {
      const sequence = parseBossHitSequence(args.types !== undefined ? args.types : DEFAULT_BOSS_HIT_SEQUENCE);
      const delayMs = args["delay-ms"] === undefined ? 250 : asNonNegativeInt(args["delay-ms"], "delay-ms");
      const continueOnError = toBool(args["continue-on-error"], false);
      const requests = sequence.map((type) => ({
        type,
        payload: buildBossActionPayload(type, null),
      }));

      if (toBool(args["dry-run"], false)) {
        output = {
          dryRun: true,
          sequence,
          requests,
        };
        break;
      }

      const results = [];

      for (let index = 0; index < requests.length; index += 1) {
        const item = requests[index];
        const response = await client.bosses.useWeapon(item.payload);
        results.push({
          index,
          type: item.type,
          payload: item.payload,
          ok: response.ok,
          status: response.status,
          data: response.data,
        });

        if (!response.ok && !continueOnError) {
          break;
        }

        if (delayMs > 0 && index !== requests.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      output = {
        dryRun: false,
        sequence,
        total: requests.length,
        completed: results.length,
        delayMs,
        continueOnError,
        results,
      };
      break;
    }

    case "bosses:check-session": {
      const queryFromJson = await resolveJsonArg(args, "query", {
        altKeys: ["query-json"],
        defaultValue: null,
      });
      const query = queryFromJson === null ? buildBossQueryFromArgs(args) : ensurePlainObject(queryFromJson, "--query");
      output = await runBossRequest(client, {
        method: "GET",
        path: "/api/boss/check-session",
        query,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:start-attack": {
      const payload = await resolveJsonArg(args, "json", {
        defaultValue: buildBossStartAttackPayload(args),
      });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/start-attack",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:friend-damage": {
      const queryFromJson = await resolveJsonArg(args, "query", {
        altKeys: ["query-json"],
        defaultValue: null,
      });
      const query = queryFromJson === null ? buildBossQueryFromArgs(args) : ensurePlainObject(queryFromJson, "--query");
      output = await runBossRequest(client, {
        method: "GET",
        path: "/api/boss/friend-damage",
        query,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:use-weapon": {
      const payload = await resolveJsonArg(args, "json", {
        defaultValue: buildBossUseWeaponPayload(args),
      });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/use-weapon",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:surrender": {
      const payload = await resolveJsonArg(args, "json", { defaultValue: undefined });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/surrender",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:restore-free-hit": {
      const payload = await resolveJsonArg(args, "json", { defaultValue: undefined });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/restore-free-hit",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:save-slots": {
      const payload = await resolveJsonArg(args, "json", {
        defaultValue: buildBossSlotPayloadFromArgs(args),
      });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/save-equipped-weapons",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:save-equipped-weapons": {
      const payload = await resolveJsonArg(args, "json", {
        defaultValue: buildBossSlotPayloadFromArgs(args),
      });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/save-equipped-weapons",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:buy-keys": {
      const payload = await resolveJsonArg(args, "json", { defaultValue: undefined });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/buy-keys",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:buy-weapon": {
      const payload = await resolveJsonArg(args, "json", { defaultValue: undefined });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/weapon/buy",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:claim": {
      const payload = await resolveJsonArg(args, "json", { defaultValue: undefined });
      output = await runBossRequest(client, {
        method: "POST",
        path: "/api/boss/claim",
        json: payload,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:raw": {
      const method = String(requireValue(args, "method")).trim().toUpperCase();
      const pathname = String(requireValue(args, "path")).trim();

      if (!["GET", "POST"].includes(method)) {
        throw new Error("bosses:raw supports only GET and POST.");
      }

      if (!pathname.startsWith("/api/boss/")) {
        throw new Error("bosses:raw is restricted to /api/boss/* endpoints.");
      }

      const query = await resolveJsonArg(args, "query", {
        altKeys: ["query-json"],
        defaultValue: null,
      });
      const json = await resolveJsonArg(args, "json", { defaultValue: undefined });

      if (query !== null) {
        ensurePlainObject(query, "--query");
      }

      output = await runBossRequest(client, {
        method,
        path: pathname,
        query,
        json,
        dryRun: toBool(args["dry-run"], false),
      });
      break;
    }

    case "bosses:snapshot":
      output = {
        bootstrap: await client.bosses.bootstrap(),
        weapons: await client.bosses.weapons(),
        categories: {
          1: await client.bosses.list(1),
          2: await client.bosses.list(2),
          3: await client.bosses.list(3),
        },
      };
      break;

    default:
      throw new Error(`Unknown command: ${command}`);
  }

  const result = {
    command,
    selfUserId: selfUserId || null,
    output,
  };
  logEvent("cli.command.completed", {
    command,
    selfUserId: selfUserId || null,
    elapsedMs: Date.now() - activeCliStartedAt,
    result,
  });
  await flushLogs();
  printJson(result);
}

main().catch(async (error) => {
  logEvent("cli.command.error", {
    command: activeCliCommand,
    elapsedMs: activeCliStartedAt ? Date.now() - activeCliStartedAt : null,
    error,
  });
  await flushLogs();
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
