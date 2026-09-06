const DEFAULT_WEEKLY_DAMAGE_LIMIT = 10000;

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

function asPositiveInt(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function asNonNegativeInt(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function asNonNegativeNumber(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function pickNumeric(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return null;
}

function pickString(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const text = String(value).trim();
    if (text) {
      return text;
    }
  }
  return null;
}

function normalizeUserId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const text = String(value).trim();
  return /^\d+$/.test(text) ? text : null;
}

function normalizeCriteriaOptions(options = {}) {
  const minTalents = asNonNegativeInt(
    options.minTalents ?? options["min-talents"] ?? options.talents,
    null,
  );
  const minWeeklyDamage = asNonNegativeNumber(
    options.minWeeklyDamage ?? options["min-weekly-damage"] ?? options.weeklyDamage,
    null,
  );
  const minTalentAchievement = asPositiveInt(
    options.minTalentAchievement ?? options["min-talent-achievement"] ?? options.talentAchievement,
    null,
  );
  const weeklyTopLimit = asPositiveInt(
    options.weeklyTopLimit ?? options["weekly-top-limit"],
    DEFAULT_WEEKLY_DAMAGE_LIMIT,
  ) ?? DEFAULT_WEEKLY_DAMAGE_LIMIT;
  const dryRun = toBool(options.dryRun ?? options["dry-run"], false);

  return {
    minTalents,
    minWeeklyDamage,
    minTalentAchievement,
    weeklyTopLimit,
    dryRun,
    hasAny: minTalents !== null || minWeeklyDamage !== null || minTalentAchievement !== null,
    needsWeeklyDamage: minWeeklyDamage !== null,
    needsTalents: minTalents !== null,
    needsTalentAchievement: minTalentAchievement !== null,
  };
}

function normalizeFriendCandidateRecord(item, extra = {}) {
  const record = item && typeof item === "object" ? item : {};
  const talentState = record.talentState && typeof record.talentState === "object"
    ? record.talentState
    : {};
  const talentsTotalFromState = pickNumeric(
    talentState.totalPoints,
    talentState.points,
    talentState.count,
  );
  const talentsBySpentState = pickNumeric(talentState.spentPoints, talentState.spent)
    !== null || pickNumeric(talentState.unspentPoints, talentState.unspent) !== null
    ? (pickNumeric(talentState.spentPoints, talentState.spent) || 0)
      + (pickNumeric(talentState.unspentPoints, talentState.unspent) || 0)
    : null;

  return {
    userId: normalizeUserId(
      extra.userId
        ?? record.userId
        ?? record.friendUserId
        ?? record.fromUserId
        ?? record.toUserId
        ?? record.id,
    ),
    nickname: pickString(record.nickname, record.nick, record.name, extra.nickname),
    photoUrl: pickString(record.photoUrl, record.avatarUrl, record.avatar, extra.photoUrl),
    isIncoming: record.isIncoming === undefined ? extra.isIncoming ?? true : Boolean(record.isIncoming),
    isPending: record.isPending === undefined ? extra.isPending ?? null : Boolean(record.isPending),
    talentsCount: pickNumeric(
      record.talentsCount,
      record.talentCount,
      record.talentsTotal,
      record.totalTalents,
      record.talentPoints,
      talentsTotalFromState,
      talentsBySpentState,
      extra.talentsCount,
    ),
    weeklyDamage: pickNumeric(
      record.weeklyDamage,
      record.weekDamage,
      record.damageWeek,
      record.damage,
      extra.weeklyDamage,
    ),
    weeklyRank: asPositiveInt(record.weeklyRank ?? record.rank ?? extra.weeklyRank, null),
    weeklyDamageListed: extra.weeklyDamageListed ?? null,
    authority: pickNumeric(record.authority, extra.authority),
  };
}

function extractListPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (!payload || typeof payload !== "object") {
    return [];
  }
  if (Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload.data && Array.isArray(payload.data.data)) {
    return payload.data.data;
  }
  for (const key of ["requests", "friends", "items", "list", "rows", "profiles", "values"]) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }
  return [];
}

function normalizeIncomingFriendRequestRecords(payload, selfUserId = null) {
  const records = extractListPayload(payload);
  const selfId = normalizeUserId(selfUserId);
  const seen = new Set();
  const candidates = [];

  for (const item of records) {
    const candidate = normalizeFriendCandidateRecord(item);
    if (!candidate.userId || seen.has(candidate.userId)) {
      continue;
    }
    if (selfId && candidate.userId === selfId) {
      continue;
    }
    if (candidate.isIncoming === false) {
      continue;
    }
    seen.add(candidate.userId);
    candidates.push(candidate);
  }

  return candidates;
}

function normalizeWeeklyDamageRows(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const rows = Array.isArray(root.top)
    ? root.top
    : Array.isArray(root.data)
      ? root.data
      : Array.isArray(payload)
        ? payload
        : [];
  const normalized = [];
  const seen = new Set();

  for (const item of rows) {
    const userId = normalizeUserId(item && item.userId);
    if (!userId || seen.has(userId)) {
      continue;
    }
    seen.add(userId);
    normalized.push({
      userId,
      nickname: pickString(item.nickname, item.nick),
      photoUrl: pickString(item.photoUrl, item.avatarUrl),
      weeklyDamage: pickNumeric(item.damage, item.weeklyDamage, item.metricValue) ?? 0,
      weeklyRank: asPositiveInt(item.rank, null),
    });
  }

  return normalized;
}

async function loadWeeklyDamageMap(client, limit = DEFAULT_WEEKLY_DAMAGE_LIMIT) {
  const response = await client.weekly.top(limit);
  if (!response || !response.ok) {
    throw new Error(`Could not load weekly damage top: HTTP ${response ? response.status : "unknown"}`);
  }
  const rows = normalizeWeeklyDamageRows(response.data);
  return new Map(rows.map((row) => [row.userId, row]));
}

function attachWeeklyDamage(candidates, weeklyDamageByUserId) {
  if (!(weeklyDamageByUserId instanceof Map)) {
    return candidates;
  }

  return candidates.map((candidate) => {
    const weekly = weeklyDamageByUserId.get(String(candidate.userId));
    if (!weekly) {
      return {
        ...candidate,
        weeklyDamage: 0,
        weeklyRank: null,
        weeklyDamageListed: false,
      };
    }
    return {
      ...candidate,
      nickname: candidate.nickname || weekly.nickname,
      photoUrl: candidate.photoUrl || weekly.photoUrl,
      weeklyDamage: weekly.weeklyDamage,
      weeklyRank: weekly.weeklyRank,
      weeklyDamageListed: true,
    };
  });
}

function evaluateFriendCriteria(candidate, criteria) {
  const checks = [];
  const failed = [];
  const unknown = [];
  const addKnown = (key, actual, expected, passed, comparison) => {
    const check = { key, actual, expected, comparison, passed };
    checks.push(check);
    if (!passed) {
      failed.push(check);
    }
  };
  const addUnknown = (key, expected, comparison) => {
    const check = { key, actual: null, expected, comparison, passed: null };
    checks.push(check);
    unknown.push(check);
  };

  if (criteria.minTalents !== null) {
    if (candidate.talentsCount === null || candidate.talentsCount === undefined) {
      addUnknown("talents", criteria.minTalents, ">=");
    } else {
      addKnown("talents", candidate.talentsCount, criteria.minTalents, candidate.talentsCount >= criteria.minTalents, ">=");
    }
  }

  if (criteria.minWeeklyDamage !== null) {
    const actual = candidate.weeklyDamage === null || candidate.weeklyDamage === undefined
      ? 0
      : Number(candidate.weeklyDamage);
    addKnown(
      "weeklyDamage",
      Number.isFinite(actual) ? actual : 0,
      criteria.minWeeklyDamage,
      Number.isFinite(actual) && actual > criteria.minWeeklyDamage,
      ">",
    );
  }

  if (criteria.minTalentAchievement !== null) {
    if (candidate.talentPointsTotal === null || candidate.talentPointsTotal === undefined) {
      addUnknown("talentPointsTotal", criteria.minTalentAchievement, ">=");
    } else {
      addKnown(
        "talentPointsTotal",
        candidate.talentPointsTotal,
        criteria.minTalentAchievement,
        candidate.talentPointsTotal >= criteria.minTalentAchievement,
        ">=",
      );
    }
  }

  return {
    checks,
    failed,
    unknown,
    passed: failed.length === 0 && unknown.length === 0,
  };
}

function serializeCriteria(criteria) {
  return {
    minTalents: criteria.minTalents,
    minWeeklyDamage: criteria.minWeeklyDamage,
    minTalentAchievement: criteria.minTalentAchievement,
    weeklyTopLimit: criteria.weeklyTopLimit,
  };
}

module.exports = {
  DEFAULT_WEEKLY_DAMAGE_LIMIT,
  asNonNegativeInt,
  asPositiveInt,
  attachWeeklyDamage,
  evaluateFriendCriteria,
  loadWeeklyDamageMap,
  normalizeCriteriaOptions,
  normalizeFriendCandidateRecord,
  normalizeIncomingFriendRequestRecords,
  normalizeUserId,
  serializeCriteria,
  toBool,
};
