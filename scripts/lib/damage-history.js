const fs = require("node:fs/promises");
const path = require("node:path");

const { ARTIFACTS_DIR } = require("./pbot");

const DAMAGE_HISTORY_DIR = path.join(ARTIFACTS_DIR, "damage-history");
const SNAPSHOT_KIND_PRIORITY = ["boundary", "hourly", "manual"];
const DEFAULT_WEEKLY_TOP_LIMIT = 10000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CURRENT_WEEK_START_DAY_INDEX = 1;
const HOUR_WINDOW_TARGET_MS = 60 * 60 * 1000;
const HOUR_WINDOW_MIN_MS = 45 * 60 * 1000;
const HOUR_WINDOW_MAX_MS = 90 * 60 * 1000;
const DAILY_BOUNDARY_GRACE_MS = 30 * 60 * 1000;
const DAILY_PARTIAL_MIN_WINDOW_MS = 5 * 60 * 1000;

function asPositiveInt(value, fallback = null) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeSnapshotKind(value) {
  const normalized = value === undefined || value === null || value === ""
    ? "manual"
    : String(value).trim().toLowerCase();

  return SNAPSHOT_KIND_PRIORITY.includes(normalized) ? normalized : "manual";
}

function toIsoTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function sanitizeTimestamp(value) {
  return String(value).replace(/[:.]/g, "-");
}

function restoreSanitizedIsoTimestamp(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  if (!match) {
    return null;
  }

  return `${match[1]}T${match[2]}:${match[3]}:${match[4]}.${match[5]}Z`;
}

function parseOffsetMinutes(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  if (/z$/i.test(value)) {
    return 0;
  }

  const match = value.match(/([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = Number.parseInt(match[3], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return sign * ((hours * 60) + minutes);
}

function formatOffsetMinutes(offsetMinutes) {
  const numeric = Number(offsetMinutes);
  if (!Number.isFinite(numeric)) {
    return "+00:00";
  }

  const absolute = Math.abs(Math.trunc(numeric));
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  const sign = numeric < 0 ? "-" : "+";
  return `${sign}${pad2(hours)}:${pad2(minutes)}`;
}

function toOffsetParts(value, offsetMinutes = 0) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const shifted = new Date(date.getTime() + (offsetMinutes * 60 * 1000));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

function formatDateKey(parts) {
  if (!parts) {
    return null;
  }
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function formatTimeKey(parts) {
  if (!parts) {
    return null;
  }
  return `${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
}

function formatDateKeyAtOffset(value, offsetMinutes) {
  return formatDateKey(toOffsetParts(value, offsetMinutes));
}

function dayKeyToUtcDate(dayKey, offsetMinutes = 0) {
  if (typeof dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return null;
  }

  const [yearRaw, monthRaw, dayRaw] = dayKey.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day) - (offsetMinutes * 60 * 1000));
}

function addDaysToDayKey(dayKey, offsetMinutes, deltaDays) {
  const baseDate = dayKeyToUtcDate(dayKey, offsetMinutes);
  if (!baseDate) {
    return null;
  }

  return formatDateKeyAtOffset(
    new Date(baseDate.getTime() + (deltaDays * DAY_MS)),
    offsetMinutes,
  );
}

function computeFallbackWeekStartDayKey(dayKey, offsetMinutes) {
  const currentDate = dayKeyToUtcDate(dayKey, offsetMinutes);
  if (!currentDate) {
    return null;
  }

  const dayIndex = toOffsetParts(currentDate, offsetMinutes).day;
  void dayIndex;
  const shifted = new Date(currentDate.getTime());
  const currentOffsetParts = toOffsetParts(shifted, offsetMinutes);
  if (!currentOffsetParts) {
    return null;
  }

  const pseudoUtc = new Date(Date.UTC(
    currentOffsetParts.year,
    currentOffsetParts.month - 1,
    currentOffsetParts.day,
  ));
  const weekday = pseudoUtc.getUTCDay();
  const mondayDistance = (weekday - CURRENT_WEEK_START_DAY_INDEX + 7) % 7;
  return addDaysToDayKey(dayKey, offsetMinutes, -mondayDistance);
}

function computeWeekStartDayKey(nextResetLocal, offsetMinutes, dayKey) {
  const nextResetIso = toIsoTimestamp(nextResetLocal);
  if (!nextResetIso) {
    return computeFallbackWeekStartDayKey(dayKey, offsetMinutes);
  }

  return formatDateKeyAtOffset(
    new Date(new Date(nextResetIso).getTime() - (7 * DAY_MS)),
    offsetMinutes,
  );
}

function normalizeFriendIds(payload) {
  const rawItems = Array.isArray(payload) ? payload : [];
  const ids = [];
  const seen = new Set();

  for (const item of rawItems) {
    const userId = item === undefined || item === null ? "" : String(item).trim();
    if (!/^\d+$/.test(userId) || seen.has(userId)) {
      continue;
    }
    seen.add(userId);
    ids.push(userId);
  }

  return ids;
}

function normalizeGuildStatus(payload, responseOk = true) {
  const status = payload && typeof payload === "object" ? payload : {};
  const guild = status.guild && typeof status.guild === "object" ? status.guild : {};
  const inGuild = Boolean(status.inGuild && (guild.guildId ?? status.guildId));
  const memberIds = [];
  const members = [];
  const seen = new Set();

  for (const member of Array.isArray(status.members) ? status.members : []) {
    const userId = member && member.userId !== undefined && member.userId !== null
      ? String(member.userId).trim()
      : "";
    if (!/^\d+$/.test(userId) || seen.has(userId)) {
      continue;
    }
    seen.add(userId);
    memberIds.push(userId);
    members.push({
      userId,
      nickname: member && member.nickname ? String(member.nickname) : null,
      rankId: Number.isFinite(Number(member && member.rankId)) ? Number(member.rankId) : null,
      rankName: member && member.rankName ? String(member.rankName) : null,
      activityRating: Number.isFinite(Number(member && member.activityRating))
        ? Number(member.activityRating)
        : null,
    });
  }

  return {
    available: Boolean(responseOk),
    inGuild,
    guildId: inGuild && guild.guildId !== undefined && guild.guildId !== null ? String(guild.guildId) : null,
    name: inGuild && guild.name ? String(guild.name) : null,
    level: inGuild && Number.isFinite(Number(guild.level)) ? Number(guild.level) : null,
    memberCount: inGuild && Number.isFinite(Number(guild.memberCount ?? guild.population))
      ? Number(guild.memberCount ?? guild.population)
      : members.length,
    memberIds,
    members,
  };
}

function normalizeLeaderboardRows(payload, friendIds, guildMemberIds = []) {
  const friendIdSet = friendIds instanceof Set ? friendIds : new Set(friendIds || []);
  const guildMemberIdSet = guildMemberIds instanceof Set ? guildMemberIds : new Set(guildMemberIds || []);
  const rawItems = Array.isArray(payload) ? payload : [];
  const rows = [];

  for (const item of rawItems) {
    const userId = item && item.userId !== undefined && item.userId !== null
      ? String(item.userId).trim()
      : "";
    if (!/^\d+$/.test(userId)) {
      continue;
    }

    const rank = Number.parseInt(String(item.rank), 10);
    const damage = Number(item.damage);
    rows.push({
      userId,
      nickname: item && item.nickname ? String(item.nickname) : null,
      photoUrl: item && item.photoUrl ? String(item.photoUrl) : null,
      rank: Number.isFinite(rank) && rank > 0 ? rank : null,
      damage: Number.isFinite(damage) && damage >= 0 ? damage : 0,
      isFriend: friendIdSet.has(userId),
      isGuildMember: guildMemberIdSet.has(userId),
    });
  }

  rows.sort((left, right) => {
    const rightDamage = Number(right.damage || 0);
    const leftDamage = Number(left.damage || 0);
    if (rightDamage !== leftDamage) {
      return rightDamage - leftDamage;
    }

    const leftRank = Number.isFinite(left.rank) ? left.rank : Number.POSITIVE_INFINITY;
    const rightRank = Number.isFinite(right.rank) ? right.rank : Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return Number(left.userId) - Number(right.userId);
  });

  return rows;
}

function sumDamage(rows, fieldName = "damage") {
  const items = Array.isArray(rows) ? rows : [];
  return items.reduce((total, row) => total + (Number(row && row[fieldName]) || 0), 0);
}

function pickSelfRow(rows, selfUserId) {
  if (!selfUserId) {
    return null;
  }

  const items = Array.isArray(rows) ? rows : [];
  return items.find((row) => String(row.userId) === String(selfUserId)) || null;
}

function roundToTwo(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.round(numeric * 100) / 100;
}

function buildSnapshotSummary(rows, friendIds, selfUserId, guild) {
  const items = Array.isArray(rows) ? rows : [];
  const friendRows = items.filter((row) => row.isFriend);
  const guildRows = items.filter((row) => row.isGuildMember);
  const allDamage = sumDamage(items);
  const friendDamage = sumDamage(friendRows);
  const guildDamage = sumDamage(guildRows);
  const selfRow = pickSelfRow(items, selfUserId);

  return {
    players: items.length,
    totalDamage: allDamage,
    friends: {
      totalFriends: Array.isArray(friendIds) ? friendIds.length : 0,
      players: friendRows.length,
      totalDamage: friendDamage,
      sharePct: allDamage > 0 ? roundToTwo((friendDamage / allDamage) * 100) : 0,
    },
    guild: {
      available: Boolean(guild && guild.available),
      inGuild: Boolean(guild && guild.inGuild),
      guildId: guild && guild.guildId ? guild.guildId : null,
      name: guild && guild.name ? guild.name : null,
      totalMembers: guild && Number.isFinite(Number(guild.memberCount)) ? Number(guild.memberCount) : 0,
      players: guildRows.length,
      totalDamage: guildDamage,
      sharePct: allDamage > 0 ? roundToTwo((guildDamage / allDamage) * 100) : 0,
    },
    self: selfRow
      ? {
          userId: selfRow.userId,
          nickname: selfRow.nickname,
          rank: selfRow.rank,
          damage: selfRow.damage,
        }
      : null,
  };
}

function buildSnapshotFileName(snapshot) {
  const timestamp = sanitizeTimestamp(snapshot.generatedAt || new Date().toISOString());
  return `${snapshot.snapshotKind || "manual"}-${timestamp}.json`;
}

function absolutePath(filePath) {
  return path.resolve(filePath);
}

function attachSnapshotStorage(snapshot, filePath) {
  return {
    ...snapshot,
    snapshotSource: "saved",
    storage: {
      filePath: absolutePath(filePath),
    },
  };
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonIfExists(filePath) {
  try {
    const body = await fs.readFile(filePath, "utf8");
    return JSON.parse(body);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeJson(filePath, payload) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function createDamageSnapshot(client, options = {}) {
  const limit = asPositiveInt(options.limit, DEFAULT_WEEKLY_TOP_LIMIT) ?? DEFAULT_WEEKLY_TOP_LIMIT;
  const snapshotKind = normalizeSnapshotKind(options.kind);
  const selfUserId = options.selfUserId ? String(options.selfUserId) : null;
  const [weeklyResponse, friendsResponse, guildResponse] = await Promise.all([
    client.weekly.top(limit),
    client.friends.list(),
    client.guild.status(),
  ]);

  const weeklyPayload = weeklyResponse && weeklyResponse.data && typeof weeklyResponse.data === "object"
    ? weeklyResponse.data
    : {};
  const nextResetLocal = weeklyPayload.nextResetLocal ?? null;
  const offsetMinutes = parseOffsetMinutes(nextResetLocal) ?? 0;
  const generatedAt = new Date().toISOString();
  const dayKey = formatDateKeyAtOffset(generatedAt, offsetMinutes);
  const friendIds = normalizeFriendIds(friendsResponse ? friendsResponse.data : []);
  const guild = normalizeGuildStatus(
    guildResponse ? guildResponse.data : null,
    Boolean(guildResponse && guildResponse.ok),
  );
  const rows = normalizeLeaderboardRows(
    Array.isArray(weeklyPayload.top) ? weeklyPayload.top : [],
    new Set(friendIds),
    new Set(guild.memberIds),
  );
  const weekStartDayKey = computeWeekStartDayKey(nextResetLocal, offsetMinutes, dayKey);

  return {
    generatedAt,
    snapshotKind,
    snapshotSource: "live",
    selfUserId,
    dayKey,
    timeKey: formatTimeKey(toOffsetParts(generatedAt, offsetMinutes)),
    timeZoneOffsetMinutes: offsetMinutes,
    timeZoneOffset: formatOffsetMinutes(offsetMinutes),
    reset: {
      nextResetLocal,
      weekStartDayKey,
      boundaryStrategy: "day_close",
    },
    request: {
      limitRequested: limit,
      isPossiblyTruncated: rows.length >= limit,
    },
    friends: {
      total: friendIds.length,
      ids: friendIds,
    },
    guild,
    leaderboard: {
      total: rows.length,
      rows,
    },
    summary: buildSnapshotSummary(rows, friendIds, selfUserId, guild),
    responses: {
      weekly: {
        ok: Boolean(weeklyResponse && weeklyResponse.ok),
        status: weeklyResponse ? weeklyResponse.status : null,
      },
      friends: {
        ok: Boolean(friendsResponse && friendsResponse.ok),
        status: friendsResponse ? friendsResponse.status : null,
      },
      guild: {
        ok: Boolean(guildResponse && guildResponse.ok),
        status: guildResponse ? guildResponse.status : null,
      },
    },
  };
}

function getSnapshotKindDir(snapshotKind) {
  return path.join(DAMAGE_HISTORY_DIR, snapshotKind);
}

function getLatestSnapshotCopyPath(snapshotKind = null) {
  return snapshotKind
    ? path.join(DAMAGE_HISTORY_DIR, `${snapshotKind}-latest.json`)
    : path.join(DAMAGE_HISTORY_DIR, "latest.json");
}

async function saveDamageSnapshot(snapshot) {
  const snapshotKind = normalizeSnapshotKind(snapshot && snapshot.snapshotKind);
  const dayKey = snapshot && snapshot.dayKey ? String(snapshot.dayKey) : formatDateKeyAtOffset(new Date(), 0);
  const fileName = buildSnapshotFileName({
    ...snapshot,
    snapshotKind,
  });
  const filePath = path.join(getSnapshotKindDir(snapshotKind), dayKey, fileName);
  const normalizedSnapshot = {
    ...snapshot,
    snapshotKind,
  };

  await writeJson(filePath, normalizedSnapshot);

  const latestPath = getLatestSnapshotCopyPath();
  const kindLatestPath = getLatestSnapshotCopyPath(snapshotKind);
  await Promise.all([
    writeJson(latestPath, normalizedSnapshot),
    writeJson(kindLatestPath, normalizedSnapshot),
  ]);

  return {
    filePath: absolutePath(filePath),
    latestPath: absolutePath(latestPath),
    kindLatestPath: absolutePath(kindLatestPath),
  };
}

async function loadSnapshotFromPath(filePath) {
  const payload = await readJsonIfExists(filePath);
  return payload ? attachSnapshotStorage(payload, filePath) : null;
}

async function loadLatestSavedSnapshot(snapshotKind = null) {
  const filePath = getLatestSnapshotCopyPath(snapshotKind);
  return loadSnapshotFromPath(filePath);
}

async function listSnapshotFilesForDay(dayKey, options = {}) {
  const kinds = Array.isArray(options.kinds) && options.kinds.length > 0
    ? options.kinds.map(normalizeSnapshotKind)
    : SNAPSHOT_KIND_PRIORITY;
  const files = [];

  for (const kind of kinds) {
    const dirPath = path.join(getSnapshotKindDir(kind), dayKey);
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) {
          continue;
        }
        files.push({
          kind,
          name: entry.name,
          filePath: path.join(dirPath, entry.name),
          generatedAt: restoreSanitizedIsoTimestamp(
            entry.name.replace(/^(hourly|boundary|manual)-/, "").replace(/\.json$/, ""),
          ),
        });
      }
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  files.sort((left, right) => {
    const leftGeneratedAt = left.generatedAt || "";
    const rightGeneratedAt = right.generatedAt || "";
    if (leftGeneratedAt !== rightGeneratedAt) {
      return rightGeneratedAt.localeCompare(leftGeneratedAt);
    }

    const leftPriority = SNAPSHOT_KIND_PRIORITY.indexOf(left.kind);
    const rightPriority = SNAPSHOT_KIND_PRIORITY.indexOf(right.kind);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.name.localeCompare(left.name);
  });

  return files;
}

async function loadLatestSnapshotForDay(dayKey, options = {}) {
  const files = await listSnapshotFilesForDay(dayKey, options);
  if (files.length === 0) {
    return null;
  }

  return loadSnapshotFromPath(files[0].filePath);
}

async function listAllSnapshotFileEntries(options = {}) {
  const kinds = Array.isArray(options.kinds) && options.kinds.length > 0
    ? options.kinds.map(normalizeSnapshotKind)
    : SNAPSHOT_KIND_PRIORITY;
  const entries = [];

  for (const kind of kinds) {
    const rootDir = getSnapshotKindDir(kind);
    try {
      const dayEntries = await fs.readdir(rootDir, { withFileTypes: true });
      for (const dayEntry of dayEntries) {
        if (!dayEntry.isDirectory()) {
          continue;
        }

        const dayDir = path.join(rootDir, dayEntry.name);
        const fileEntries = await fs.readdir(dayDir, { withFileTypes: true });
        for (const fileEntry of fileEntries) {
          if (!fileEntry.isFile() || !fileEntry.name.endsWith(".json")) {
            continue;
          }

          const match = fileEntry.name.match(/^(hourly|boundary|manual)-(.+)\.json$/);
          const generatedAt = match ? restoreSanitizedIsoTimestamp(match[2]) : null;
          if (!generatedAt) {
            continue;
          }

          entries.push({
            kind,
            dayKey: dayEntry.name,
            name: fileEntry.name,
            generatedAt,
            filePath: path.join(dayDir, fileEntry.name),
          });
        }
      }
    } catch (error) {
      if (!error || error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  entries.sort((left, right) => {
    if (left.generatedAt !== right.generatedAt) {
      return right.generatedAt.localeCompare(left.generatedAt);
    }

    const leftPriority = SNAPSHOT_KIND_PRIORITY.indexOf(left.kind);
    const rightPriority = SNAPSHOT_KIND_PRIORITY.indexOf(right.kind);
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.name.localeCompare(left.name);
  });

  return entries;
}

async function loadPreviousSavedSnapshot(referenceSnapshot, options = {}) {
  const referenceGeneratedAt = toIsoTimestamp(referenceSnapshot && referenceSnapshot.generatedAt);
  if (!referenceGeneratedAt) {
    return null;
  }

  const files = await listAllSnapshotFileEntries(options);
  const currentFilePath = referenceSnapshot
    && referenceSnapshot.storage
    && referenceSnapshot.storage.filePath
    ? path.normalize(referenceSnapshot.storage.filePath)
    : null;

  const candidate = files.find((entry) => {
    if (currentFilePath && path.normalize(entry.filePath) === currentFilePath) {
      return false;
    }
    return entry.generatedAt < referenceGeneratedAt;
  });

  return candidate ? loadSnapshotFromPath(candidate.filePath) : null;
}

function getSnapshotTimestampMs(snapshot) {
  const generatedAt = toIsoTimestamp(snapshot && snapshot.generatedAt);
  if (!generatedAt) {
    return null;
  }

  return new Date(generatedAt).getTime();
}

function getSnapshotOffsetMinutes(snapshot) {
  const directValue = Number(snapshot && snapshot.timeZoneOffsetMinutes);
  if (Number.isFinite(directValue)) {
    return directValue;
  }

  return parseOffsetMinutes(snapshot && snapshot.timeZoneOffset) ?? 0;
}

function getSnapshotWeekStartDayKey(snapshot) {
  if (snapshot && snapshot.reset && snapshot.reset.weekStartDayKey) {
    return String(snapshot.reset.weekStartDayKey);
  }

  const dayKey = snapshot && snapshot.dayKey ? String(snapshot.dayKey) : null;
  return dayKey ? computeFallbackWeekStartDayKey(dayKey, getSnapshotOffsetMinutes(snapshot)) : null;
}

function areSnapshotsInSameWeek(left, right) {
  const leftWeekStart = getSnapshotWeekStartDayKey(left);
  const rightWeekStart = getSnapshotWeekStartDayKey(right);
  return Boolean(leftWeekStart && rightWeekStart && leftWeekStart === rightWeekStart);
}

function buildWindow(startSnapshot, endSnapshot) {
  const startMs = getSnapshotTimestampMs(startSnapshot);
  const endMs = getSnapshotTimestampMs(endSnapshot);
  const elapsedMs = startMs !== null && endMs !== null ? Math.max(0, endMs - startMs) : null;

  return {
    startAt: startSnapshot && startSnapshot.generatedAt ? startSnapshot.generatedAt : null,
    endAt: endSnapshot && endSnapshot.generatedAt ? endSnapshot.generatedAt : null,
    elapsedMs,
    elapsedMinutes: elapsedMs === null ? null : Math.round(elapsedMs / 60000),
  };
}

function buildUnavailableReport(period, endSnapshot, reason, options = {}) {
  return {
    generatedAt: new Date().toISOString(),
    period,
    available: false,
    complete: false,
    reportSource: endSnapshot && endSnapshot.snapshotSource ? endSnapshot.snapshotSource : "saved",
    selfUserId: options.selfUserId || (endSnapshot && endSnapshot.selfUserId) || null,
    dayKey: endSnapshot && endSnapshot.dayKey ? endSnapshot.dayKey : null,
    timeZoneOffset: endSnapshot && endSnapshot.timeZoneOffset ? endSnapshot.timeZoneOffset : "+00:00",
    reset: endSnapshot && endSnapshot.reset ? endSnapshot.reset : null,
    guild: buildGuildRef(endSnapshot),
    baselineType: "collecting",
    collection: {
      reason,
      nextCaptureAt: options.nextCaptureAt || null,
    },
    snapshots: {
      end: buildSnapshotRef(endSnapshot),
      baseline: null,
    },
    summary: null,
  };
}

function selectHourlyBaseline(endSnapshot, history) {
  const endMs = getSnapshotTimestampMs(endSnapshot);
  if (endMs === null) {
    return null;
  }

  const candidates = (Array.isArray(history) ? history : [])
    .filter((snapshot) => {
      const snapshotMs = getSnapshotTimestampMs(snapshot);
      const elapsedMs = snapshotMs === null ? null : endMs - snapshotMs;
      return elapsedMs !== null
        && elapsedMs >= HOUR_WINDOW_MIN_MS
        && elapsedMs <= HOUR_WINDOW_MAX_MS
        && areSnapshotsInSameWeek(snapshot, endSnapshot);
    })
    .sort((left, right) => {
      const leftDistance = Math.abs((endMs - getSnapshotTimestampMs(left)) - HOUR_WINDOW_TARGET_MS);
      const rightDistance = Math.abs((endMs - getSnapshotTimestampMs(right)) - HOUR_WINDOW_TARGET_MS);
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      return getSnapshotTimestampMs(right) - getSnapshotTimestampMs(left);
    });

  return candidates[0] || null;
}

function selectDailyBaseline(endSnapshot, history) {
  const endMs = getSnapshotTimestampMs(endSnapshot);
  const offsetMinutes = getSnapshotOffsetMinutes(endSnapshot);
  const dayStart = dayKeyToUtcDate(endSnapshot && endSnapshot.dayKey, offsetMinutes);
  if (endMs === null || !dayStart) {
    return { baseline: null, baselineType: null, complete: false, dayStartMs: null };
  }

  const dayStartMs = dayStart.getTime();
  const compatible = (Array.isArray(history) ? history : []).filter((snapshot) => {
    const snapshotMs = getSnapshotTimestampMs(snapshot);
    return snapshotMs !== null && snapshotMs < endMs && areSnapshotsInSameWeek(snapshot, endSnapshot);
  });
  const previousDaySnapshot = compatible
    .filter((snapshot) => getSnapshotTimestampMs(snapshot) < dayStartMs)
    .sort((left, right) => getSnapshotTimestampMs(right) - getSnapshotTimestampMs(left))[0] || null;

  if (previousDaySnapshot) {
    const gapMs = dayStartMs - getSnapshotTimestampMs(previousDaySnapshot);
    return {
      baseline: previousDaySnapshot,
      baselineType: gapMs <= DAILY_BOUNDARY_GRACE_MS ? "previous_day_near_close" : "previous_day_fallback",
      complete: gapMs <= DAILY_BOUNDARY_GRACE_MS,
      dayStartMs,
      baselineGapMs: gapMs,
    };
  }

  const firstCurrentDaySnapshot = compatible
    .filter((snapshot) => getSnapshotTimestampMs(snapshot) >= dayStartMs)
    .sort((left, right) => getSnapshotTimestampMs(left) - getSnapshotTimestampMs(right))[0] || null;

  return firstCurrentDaySnapshot && endMs - getSnapshotTimestampMs(firstCurrentDaySnapshot) >= DAILY_PARTIAL_MIN_WINDOW_MS
    ? {
        baseline: firstCurrentDaySnapshot,
        baselineType: "current_day_first_sample",
        complete: false,
        dayStartMs,
        baselineGapMs: getSnapshotTimestampMs(firstCurrentDaySnapshot) - dayStartMs,
      }
    : { baseline: null, baselineType: null, complete: false, dayStartMs, baselineGapMs: null };
}

function getSnapshotEntryTimestampMs(entry) {
  const generatedAt = toIsoTimestamp(entry && entry.generatedAt);
  return generatedAt ? new Date(generatedAt).getTime() : null;
}

function filterEntriesToSnapshotWeek(entries, endSnapshot) {
  const weekStartDayKey = getSnapshotWeekStartDayKey(endSnapshot);
  const endDayKey = endSnapshot && endSnapshot.dayKey ? String(endSnapshot.dayKey) : null;
  if (!weekStartDayKey || !endDayKey) {
    return Array.isArray(entries) ? entries : [];
  }

  return (Array.isArray(entries) ? entries : []).filter((entry) => (
    entry
    && entry.dayKey
    && String(entry.dayKey) >= weekStartDayKey
    && String(entry.dayKey) <= endDayKey
  ));
}

async function loadHourlyBaselineSnapshot(endSnapshot, options = {}) {
  const endMs = getSnapshotTimestampMs(endSnapshot);
  if (endMs === null) {
    return null;
  }

  const entries = Array.isArray(options.entries)
    ? options.entries
    : await listAllSnapshotFileEntries(options);
  const loadSnapshot = typeof options.loadSnapshot === "function"
    ? options.loadSnapshot
    : loadSnapshotFromPath;
  const candidates = filterEntriesToSnapshotWeek(entries, endSnapshot)
    .map((entry) => ({
      entry,
      timestampMs: getSnapshotEntryTimestampMs(entry),
    }))
    .filter(({ timestampMs }) => {
      const elapsedMs = timestampMs === null ? null : endMs - timestampMs;
      return elapsedMs !== null && elapsedMs >= HOUR_WINDOW_MIN_MS && elapsedMs <= HOUR_WINDOW_MAX_MS;
    })
    .sort((left, right) => {
      const leftDistance = Math.abs((endMs - left.timestampMs) - HOUR_WINDOW_TARGET_MS);
      const rightDistance = Math.abs((endMs - right.timestampMs) - HOUR_WINDOW_TARGET_MS);
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      return right.timestampMs - left.timestampMs;
    });

  for (const candidate of candidates) {
    const snapshot = await loadSnapshot(candidate.entry.filePath);
    if (snapshot && selectHourlyBaseline(endSnapshot, [snapshot])) {
      return snapshot;
    }
  }

  return null;
}

async function loadDailyBaselineSnapshot(endSnapshot, options = {}) {
  const endMs = getSnapshotTimestampMs(endSnapshot);
  const offsetMinutes = getSnapshotOffsetMinutes(endSnapshot);
  const dayStart = dayKeyToUtcDate(endSnapshot && endSnapshot.dayKey, offsetMinutes);
  if (endMs === null || !dayStart) {
    return { baseline: null, baselineType: null, complete: false, dayStartMs: null, baselineGapMs: null };
  }

  const entries = Array.isArray(options.entries)
    ? options.entries
    : await listAllSnapshotFileEntries(options);
  const loadSnapshot = typeof options.loadSnapshot === "function"
    ? options.loadSnapshot
    : loadSnapshotFromPath;
  const dayStartMs = dayStart.getTime();
  const compatibleEntries = filterEntriesToSnapshotWeek(entries, endSnapshot)
    .map((entry) => ({
      entry,
      timestampMs: getSnapshotEntryTimestampMs(entry),
    }))
    .filter(({ timestampMs }) => timestampMs !== null && timestampMs < endMs);
  const previousDayEntries = compatibleEntries
    .filter(({ timestampMs }) => timestampMs < dayStartMs)
    .sort((left, right) => right.timestampMs - left.timestampMs);
  const currentDayEntries = compatibleEntries
    .filter(({ timestampMs }) => (
      timestampMs >= dayStartMs
      && endMs - timestampMs >= DAILY_PARTIAL_MIN_WINDOW_MS
    ))
    .sort((left, right) => left.timestampMs - right.timestampMs);

  for (const candidate of [...previousDayEntries, ...currentDayEntries]) {
    const snapshot = await loadSnapshot(candidate.entry.filePath);
    if (!snapshot) {
      continue;
    }
    const baseline = selectDailyBaseline(endSnapshot, [snapshot]);
    if (baseline.baseline) {
      return baseline;
    }
  }

  return {
    baseline: null,
    baselineType: null,
    complete: false,
    dayStartMs,
    baselineGapMs: null,
  };
}

function normalizeTopRows(rows, topCount, fieldName = "damage") {
  const limit = asPositiveInt(topCount, 25) ?? 25;
  const items = Array.isArray(rows) ? rows : [];
  return items
    .slice(0, limit)
    .map((row) => ({
      userId: row.userId,
      nickname: row.nickname,
      photoUrl: row.photoUrl,
      rank: row.rank ?? null,
      isFriend: Boolean(row.isFriend),
      isGuildMember: Boolean(row.isGuildMember),
      [fieldName]: Number(row[fieldName] || 0),
    }));
}

function buildGuildRef(snapshot) {
  const guild = snapshot && snapshot.guild && typeof snapshot.guild === "object"
    ? snapshot.guild
    : null;
  return {
    available: Boolean(guild && guild.available),
    inGuild: Boolean(guild && guild.inGuild),
    guildId: guild && guild.guildId ? guild.guildId : null,
    name: guild && guild.name ? guild.name : null,
    level: guild && Number.isFinite(Number(guild.level)) ? Number(guild.level) : null,
    totalMembers: guild && Number.isFinite(Number(guild.memberCount)) ? Number(guild.memberCount) : 0,
  };
}

function buildSnapshotRef(snapshot) {
  if (!snapshot) {
    return null;
  }

  return {
    generatedAt: snapshot.generatedAt || null,
    snapshotKind: snapshot.snapshotKind || null,
    dayKey: snapshot.dayKey || null,
    timeKey: snapshot.timeKey || null,
    filePath: snapshot.storage && snapshot.storage.filePath ? snapshot.storage.filePath : null,
  };
}

function buildAggregate(rows, selfUserId, metricName, topCount) {
  const items = Array.isArray(rows) ? rows : [];
  const friendRows = items.filter((row) => row.isFriend);
  const guildRows = items.filter((row) => row.isGuildMember);
  const nonFriendRows = items.filter((row) => !row.isFriend);
  const totalDamage = sumDamage(items, metricName);
  const friendDamage = sumDamage(friendRows, metricName);
  const guildDamage = sumDamage(guildRows, metricName);
  const selfRow = pickSelfRow(items, selfUserId);

  return {
    all: {
      players: items.length,
      totalDamage,
    },
    friends: {
      players: friendRows.length,
      totalDamage: friendDamage,
      sharePct: totalDamage > 0 ? roundToTwo((friendDamage / totalDamage) * 100) : 0,
    },
    guild: {
      players: guildRows.length,
      totalDamage: guildDamage,
      sharePct: totalDamage > 0 ? roundToTwo((guildDamage / totalDamage) * 100) : 0,
    },
    nonFriends: {
      players: nonFriendRows.length,
      totalDamage: sumDamage(nonFriendRows, metricName),
    },
    self: selfRow
      ? {
          userId: selfRow.userId,
          nickname: selfRow.nickname,
          rank: selfRow.rank,
          [metricName]: Number(selfRow[metricName] || 0),
        }
      : null,
    topAll: normalizeTopRows(items, topCount, metricName),
    topFriends: normalizeTopRows(friendRows, topCount, metricName),
    topGuild: normalizeTopRows(guildRows, topCount, metricName),
  };
}

function buildWeeklyReport(snapshot, options = {}) {
  const topCount = asPositiveInt(options.top, 25) ?? 25;
  const selfUserId = options.selfUserId || snapshot.selfUserId || null;
  const rows = Array.isArray(snapshot && snapshot.leaderboard && snapshot.leaderboard.rows)
    ? snapshot.leaderboard.rows
    : [];

  return {
    generatedAt: new Date().toISOString(),
    period: "weekly",
    available: true,
    dayKey: snapshot.dayKey || null,
    complete: true,
    reportSource: snapshot.snapshotSource || "saved",
    selfUserId,
    timeZoneOffset: snapshot.timeZoneOffset || "+00:00",
    reset: snapshot.reset || null,
    guild: buildGuildRef(snapshot),
    snapshots: {
      end: buildSnapshotRef(snapshot),
      baseline: null,
    },
    request: snapshot.request || null,
    summary: buildAggregate(rows, selfUserId, "damage", topCount),
  };
}

function buildDailyDeltaRows(startSnapshot, endSnapshot) {
  const endRows = Array.isArray(endSnapshot && endSnapshot.leaderboard && endSnapshot.leaderboard.rows)
    ? endSnapshot.leaderboard.rows
    : [];
  const startRows = Array.isArray(startSnapshot && startSnapshot.leaderboard && startSnapshot.leaderboard.rows)
    ? startSnapshot.leaderboard.rows
    : [];
  const startDamageByUserId = new Map(
    startRows.map((row) => [String(row.userId), Number(row.damage || 0)]),
  );
  const items = [];

  for (const row of endRows) {
    const currentDamage = Number(row.damage || 0);
    const previousDamage = startSnapshot ? (startDamageByUserId.get(String(row.userId)) || 0) : 0;
    const deltaDamage = currentDamage - previousDamage;
    if (!(deltaDamage > 0)) {
      continue;
    }

    items.push({
      userId: row.userId,
      nickname: row.nickname,
      photoUrl: row.photoUrl,
      rank: row.rank,
      isFriend: Boolean(row.isFriend),
      isGuildMember: Boolean(row.isGuildMember),
      startDamage: previousDamage,
      endDamage: currentDamage,
      deltaDamage,
    });
  }

  items.sort((left, right) => {
    const rightDamage = Number(right.deltaDamage || 0);
    const leftDamage = Number(left.deltaDamage || 0);
    if (rightDamage !== leftDamage) {
      return rightDamage - leftDamage;
    }

    const leftRank = Number.isFinite(left.rank) ? left.rank : Number.POSITIVE_INFINITY;
    const rightRank = Number.isFinite(right.rank) ? right.rank : Number.POSITIVE_INFINITY;
    return leftRank - rightRank;
  });

  return items;
}

function buildDailyReport(startSnapshot, endSnapshot, options = {}) {
  const topCount = asPositiveInt(options.top, 25) ?? 25;
  const selfUserId = options.selfUserId || endSnapshot.selfUserId || null;
  const deltaRows = buildDailyDeltaRows(startSnapshot, endSnapshot);

  return {
    generatedAt: new Date().toISOString(),
    period: "daily",
    available: true,
    dayKey: options.dayKey || endSnapshot.dayKey || null,
    complete: options.complete === true,
    reportSource: endSnapshot.snapshotSource || "saved",
    selfUserId,
    timeZoneOffset: endSnapshot.timeZoneOffset || "+00:00",
    reset: endSnapshot.reset || null,
    guild: buildGuildRef(endSnapshot),
    baselineType: options.baselineType || (startSnapshot ? "previous_day_close" : "weekly_reset_zero"),
    snapshots: {
      end: buildSnapshotRef(endSnapshot),
      baseline: buildSnapshotRef(startSnapshot),
    },
    window: buildWindow(startSnapshot, endSnapshot),
    coverage: options.coverage || null,
    summary: buildAggregate(deltaRows, selfUserId, "deltaDamage", topCount),
  };
}

function buildHourlyReport(startSnapshot, endSnapshot, options = {}) {
  const topCount = asPositiveInt(options.top, 25) ?? 25;
  const selfUserId = options.selfUserId || endSnapshot.selfUserId || null;
  const deltaRows = buildDailyDeltaRows(startSnapshot, endSnapshot);

  return {
    generatedAt: new Date().toISOString(),
    period: "hourly",
    available: true,
    dayKey: endSnapshot.dayKey || null,
    complete: options.complete === true,
    reportSource: endSnapshot.snapshotSource || "saved",
    selfUserId,
    timeZoneOffset: endSnapshot.timeZoneOffset || "+00:00",
    reset: endSnapshot.reset || null,
    guild: buildGuildRef(endSnapshot),
    baselineType: "previous_snapshot",
    snapshots: {
      end: buildSnapshotRef(endSnapshot),
      baseline: buildSnapshotRef(startSnapshot),
    },
    window: buildWindow(startSnapshot, endSnapshot),
    summary: buildAggregate(deltaRows, selfUserId, "deltaDamage", topCount),
  };
}

async function resolveEndSnapshot(client, options = {}) {
  const explicitDate = typeof options.dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(options.dayKey)
    ? options.dayKey
    : null;
  const explicitLive = options.useLive === undefined ? null : Boolean(options.useLive);
  const latestSavedSnapshot = explicitLive === true ? null : await loadLatestSavedSnapshot();
  const liveSnapshot = explicitLive === false
    ? null
    : await createDamageSnapshot(client, {
        kind: "manual",
        limit: options.limit,
        selfUserId: options.selfUserId,
      });

  const currentDayKey = liveSnapshot
    ? liveSnapshot.dayKey
    : latestSavedSnapshot
      ? latestSavedSnapshot.dayKey
      : null;
  const dayKey = explicitDate || currentDayKey;
  if (!dayKey) {
    throw new Error("Could not determine dayKey for damage report.");
  }

  if (liveSnapshot && dayKey === liveSnapshot.dayKey) {
    return {
      dayKey,
      endSnapshot: liveSnapshot,
      isCurrentDay: true,
    };
  }

  const savedSnapshot = explicitDate === null && latestSavedSnapshot && latestSavedSnapshot.dayKey === dayKey
    ? latestSavedSnapshot
    : await loadLatestSnapshotForDay(dayKey, {
        kinds: ["boundary", "hourly", "manual"],
      });
  if (!savedSnapshot) {
    throw new Error(`No saved damage snapshot found for ${dayKey}.`);
  }

  return {
    dayKey,
    endSnapshot: savedSnapshot,
    isCurrentDay: false,
  };
}

async function createDamageReport(client, options = {}) {
  const period = String(options.period || "weekly").trim().toLowerCase();

  if (period !== "weekly" && period !== "daily" && period !== "hourly") {
    throw new Error(`Unsupported damage report period: ${options.period}`);
  }

  if (period === "weekly") {
    const useLive = options.useLive === undefined ? true : Boolean(options.useLive);
    const snapshot = useLive
      ? await createDamageSnapshot(client, {
          kind: "manual",
          limit: options.limit,
          selfUserId: options.selfUserId,
        })
      : await loadLatestSavedSnapshot();

    if (!snapshot) {
      throw new Error("No damage snapshot available for weekly report.");
    }

    return buildWeeklyReport(snapshot, options);
  }

  if (period === "hourly") {
    const useLive = options.useLive === undefined ? true : Boolean(options.useLive);
    const endSnapshot = useLive
      ? await createDamageSnapshot(client, {
          kind: "manual",
          limit: options.limit,
          selfUserId: options.selfUserId,
        })
      : await loadLatestSavedSnapshot();

    if (!endSnapshot) {
      throw new Error("No damage snapshot available for hourly report.");
    }

    const baselineSnapshot = await loadHourlyBaselineSnapshot(endSnapshot, {
      kinds: ["boundary", "hourly", "manual"],
    });
    if (!baselineSnapshot) {
      return buildUnavailableReport("hourly", endSnapshot, "hourly_baseline_missing", options);
    }

    return buildHourlyReport(baselineSnapshot, endSnapshot, {
      ...options,
      complete: Math.abs((buildWindow(baselineSnapshot, endSnapshot).elapsedMs || 0) - HOUR_WINDOW_TARGET_MS) <= 15 * 60 * 1000,
    });
  }

  const { dayKey, endSnapshot, isCurrentDay } = await resolveEndSnapshot(client, options);
  const offsetMinutes = Number.isFinite(Number(endSnapshot.timeZoneOffsetMinutes))
    ? Number(endSnapshot.timeZoneOffsetMinutes)
    : parseOffsetMinutes(endSnapshot.timeZoneOffset) ?? 0;
  const weekStartDayKey = endSnapshot.reset && endSnapshot.reset.weekStartDayKey
    ? String(endSnapshot.reset.weekStartDayKey)
    : null;

  if (weekStartDayKey && weekStartDayKey === dayKey) {
    return buildDailyReport(null, endSnapshot, {
      ...options,
      dayKey,
      complete: true,
      baselineType: "weekly_reset_zero",
      coverage: {
        expectedStartAt: dayKeyToUtcDate(dayKey, offsetMinutes)?.toISOString() || null,
        baselineGapMs: 0,
      },
    });
  }

  const dailyBaseline = await loadDailyBaselineSnapshot(endSnapshot, {
    kinds: ["boundary", "hourly", "manual"],
  });
  const baselineSnapshot = dailyBaseline.baseline;
  if (!baselineSnapshot) {
    return buildUnavailableReport("daily", endSnapshot, "daily_baseline_missing", options);
  }

  return buildDailyReport(baselineSnapshot, endSnapshot, {
    ...options,
    dayKey,
    complete: dailyBaseline.complete,
    baselineType: dailyBaseline.baselineType,
    coverage: {
      expectedStartAt: dailyBaseline.dayStartMs === null ? null : new Date(dailyBaseline.dayStartMs).toISOString(),
      baselineGapMs: dailyBaseline.baselineGapMs,
    },
  });
}

async function createDamageIntel(client, options = {}) {
  const snapshot = await createDamageSnapshot(client, {
    kind: options.kind || "manual",
    limit: options.limit,
    selfUserId: options.selfUserId,
  });
  const historyEntries = await listAllSnapshotFileEntries({
    kinds: ["boundary", "hourly", "manual"],
  });
  const reports = {
    weekly: buildWeeklyReport(snapshot, options),
  };
  const hourlyBaseline = await loadHourlyBaselineSnapshot(snapshot, {
    entries: historyEntries,
  });
  reports.hourly = hourlyBaseline
    ? buildHourlyReport(hourlyBaseline, snapshot, {
        ...options,
        complete: Math.abs((buildWindow(hourlyBaseline, snapshot).elapsedMs || 0) - HOUR_WINDOW_TARGET_MS) <= 15 * 60 * 1000,
      })
    : buildUnavailableReport("hourly", snapshot, "hourly_baseline_missing", options);

  const offsetMinutes = getSnapshotOffsetMinutes(snapshot);
  const weekStartDayKey = getSnapshotWeekStartDayKey(snapshot);
  if (weekStartDayKey && weekStartDayKey === snapshot.dayKey) {
    reports.daily = buildDailyReport(null, snapshot, {
      ...options,
      dayKey: snapshot.dayKey,
      complete: true,
      baselineType: "weekly_reset_zero",
      coverage: {
        expectedStartAt: dayKeyToUtcDate(snapshot.dayKey, offsetMinutes)?.toISOString() || null,
        baselineGapMs: 0,
      },
    });
  } else {
    const dailyBaseline = await loadDailyBaselineSnapshot(snapshot, {
      entries: historyEntries,
    });
    reports.daily = dailyBaseline.baseline
      ? buildDailyReport(dailyBaseline.baseline, snapshot, {
          ...options,
          dayKey: snapshot.dayKey,
          complete: dailyBaseline.complete,
          baselineType: dailyBaseline.baselineType,
          coverage: {
            expectedStartAt: dailyBaseline.dayStartMs === null ? null : new Date(dailyBaseline.dayStartMs).toISOString(),
            baselineGapMs: dailyBaseline.baselineGapMs,
          },
        })
      : buildUnavailableReport("daily", snapshot, "daily_baseline_missing", options);
  }

  return {
    snapshot,
    reports,
  };
}

module.exports = {
  DAMAGE_HISTORY_DIR,
  DEFAULT_WEEKLY_TOP_LIMIT,
  addDaysToDayKey,
  createDamageIntel,
  createDamageReport,
  createDamageSnapshot,
  formatDateKeyAtOffset,
  loadLatestSavedSnapshot,
  loadLatestSnapshotForDay,
  loadPreviousSavedSnapshot,
  loadSnapshotFromPath,
  normalizeSnapshotKind,
  saveDamageSnapshot,
  __test: {
    areSnapshotsInSameWeek,
    buildAggregate,
    buildUnavailableReport,
    buildWindow,
    getSnapshotWeekStartDayKey,
    normalizeGuildStatus,
    normalizeLeaderboardRows,
    loadDailyBaselineSnapshot,
    loadHourlyBaselineSnapshot,
    selectDailyBaseline,
    selectHourlyBaseline,
  },
};
