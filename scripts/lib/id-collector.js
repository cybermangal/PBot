const DEFAULT_ID_COLLECTION_SOURCES = [
  "authority-top",
  "weekly-damage",
  "weekly-achievements",
  "prison-tops",
  "boss-last-killers",
  "weekly-overview",
];

const ID_SOURCE_ALIASES = {
  authority: "authority-top",
  "authority-top": "authority-top",
  top100: "authority-top",
  "friend-top100": "authority-top",
  friends: "authority-top",
  damage: "weekly-damage",
  "weekly-damage": "weekly-damage",
  "damage-top": "weekly-damage",
  achievements: "weekly-achievements",
  achievement: "weekly-achievements",
  "weekly-achievements": "weekly-achievements",
  "achievement-top": "weekly-achievements",
  prisons: "prison-tops",
  prison: "prison-tops",
  "prison-tops": "prison-tops",
  bosses: "boss-last-killers",
  boss: "boss-last-killers",
  "boss-last-killers": "boss-last-killers",
  "boss-winners": "boss-last-killers",
  overview: "weekly-overview",
  "weekly-overview": "weekly-overview",
  weekly: "weekly-overview",
  all: null,
};

function parsePositiveInt(value, fallback = null) {
  const numeric = Number.parseInt(String(value), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return numeric;
}

function normalizeCollectionSources(rawSources) {
  if (rawSources === undefined || rawSources === null || rawSources === "" || rawSources === "all") {
    return [...DEFAULT_ID_COLLECTION_SOURCES];
  }

  const values = Array.isArray(rawSources) ? rawSources : [rawSources];
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    for (const part of String(value).split(/[\s,;]+/)) {
      const token = part.trim().toLowerCase();
      if (!token) {
        continue;
      }

      const source = Object.prototype.hasOwnProperty.call(ID_SOURCE_ALIASES, token)
        ? ID_SOURCE_ALIASES[token]
        : token;

      if (source === null) {
        return [...DEFAULT_ID_COLLECTION_SOURCES];
      }

      if (!DEFAULT_ID_COLLECTION_SOURCES.includes(source)) {
        throw new Error(`Unsupported collection source: ${part}`);
      }

      if (seen.has(source)) {
        continue;
      }

      seen.add(source);
      normalized.push(source);
    }
  }

  if (normalized.length === 0) {
    return [...DEFAULT_ID_COLLECTION_SOURCES];
  }

  return normalized;
}

function normalizeUserId(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    return null;
  }

  return text;
}

function simplifyMetricName(value) {
  return value === undefined || value === null || value === ""
    ? null
    : String(value);
}

function pickMetricValue(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  return value;
}

function pickNickname(...values) {
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

function pickPhotoUrl(...values) {
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

function buildSourceSummary(source, response, items, extra = {}) {
  return {
    source,
    ok: Boolean(response && response.ok),
    status: response ? response.status : null,
    total: items.length,
    items,
    ...extra,
  };
}

function createAggregateEntry(userId) {
  return {
    userId,
    nickname: null,
    photoUrl: null,
    sources: [],
    sourceCount: 0,
    bestRank: null,
    appearances: [],
  };
}

function addCandidate(targetMap, candidate) {
  const userId = normalizeUserId(candidate && candidate.userId);
  if (!userId) {
    return;
  }

  let entry = targetMap.get(userId);
  if (!entry) {
    entry = createAggregateEntry(userId);
    targetMap.set(userId, entry);
  }

  const nickname = pickNickname(candidate.nickname, candidate.nick);
  if (!entry.nickname && nickname) {
    entry.nickname = nickname;
  }

  const photoUrl = pickPhotoUrl(candidate.photoUrl);
  if (!entry.photoUrl && photoUrl) {
    entry.photoUrl = photoUrl;
  }

  const appearance = {
    source: candidate.source,
    label: candidate.label ?? null,
    rank: parsePositiveInt(candidate.rank),
    metricName: simplifyMetricName(candidate.metricName),
    metricValue: pickMetricValue(candidate.metricValue),
    prisonId: parsePositiveInt(candidate.prisonId),
    period: candidate.period ?? null,
    bossId: parsePositiveInt(candidate.bossId),
    event: candidate.event ?? null,
  };

  if (!entry.sources.includes(candidate.source)) {
    entry.sources.push(candidate.source);
    entry.sourceCount = entry.sources.length;
  }

  if (appearance.rank !== null) {
    entry.bestRank = entry.bestRank === null
      ? appearance.rank
      : Math.min(entry.bestRank, appearance.rank);
  }

  entry.appearances.push(appearance);
}

function finalizeAggregateEntries(targetMap) {
  return [...targetMap.values()]
    .map((entry) => ({
      ...entry,
      appearances: entry.appearances.sort((left, right) => {
        const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
        const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
        return leftRank - rightRank;
      }),
    }))
    .sort((left, right) => {
      if (right.sourceCount !== left.sourceCount) {
        return right.sourceCount - left.sourceCount;
      }

      const leftRank = left.bestRank ?? Number.POSITIVE_INFINITY;
      const rightRank = right.bestRank ?? Number.POSITIVE_INFINITY;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return Number(left.userId) - Number(right.userId);
    });
}

function normalizeAuthorityTop(response, aggregate) {
  const rawItems = Array.isArray(response && response.data)
    ? response.data
    : Array.isArray(response && response.data && response.data.top)
      ? response.data.top
      : [];

  const items = rawItems
    .map((item) => ({
      source: "authority-top",
      label: "Authority Top 100",
      userId: normalizeUserId(item && item.userId),
      nickname: pickNickname(item && item.nickname),
      photoUrl: pickPhotoUrl(item && item.photoUrl),
      rank: parsePositiveInt(item && item.rank),
      metricName: "authority",
      metricValue: pickMetricValue(item && item.authority),
    }))
    .filter((item) => item.userId !== null);

  for (const item of items) {
    addCandidate(aggregate, item);
  }

  return buildSourceSummary("authority-top", response, items);
}

function normalizeWeeklyDamage(response, aggregate) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const rawItems = Array.isArray(payload.top) ? payload.top : [];

  const items = rawItems
    .map((item) => ({
      source: "weekly-damage",
      label: "Weekly Damage Top",
      userId: normalizeUserId(item && item.userId),
      nickname: pickNickname(item && item.nickname),
      photoUrl: pickPhotoUrl(item && item.photoUrl),
      rank: parsePositiveInt(item && item.rank),
      metricName: "damage",
      metricValue: pickMetricValue(item && item.damage),
    }))
    .filter((item) => item.userId !== null);

  for (const item of items) {
    addCandidate(aggregate, item);
  }

  return buildSourceSummary("weekly-damage", response, items, {
    nextResetLocal: payload.nextResetLocal ?? null,
  });
}

function normalizeWeeklyAchievements(response, aggregate) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const rawItems = Array.isArray(payload.top) ? payload.top : [];

  const items = rawItems
    .map((item) => ({
      source: "weekly-achievements",
      label: "Weekly Achievements Top",
      userId: normalizeUserId(item && item.userId),
      nickname: pickNickname(item && item.nickname),
      photoUrl: pickPhotoUrl(item && item.photoUrl),
      rank: parsePositiveInt(item && item.rank),
      metricName: "achievementPoints",
      metricValue: pickMetricValue(item && item.points),
    }))
    .filter((item) => item.userId !== null);

  for (const item of items) {
    addCandidate(aggregate, item);
  }

  return buildSourceSummary("weekly-achievements", response, items, {
    nextResetLocal: payload.nextResetLocal ?? null,
  });
}

function normalizePrisonTops(response, aggregate) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const prisonRows = Array.isArray(payload.tops) ? payload.tops : [];
  const items = [];

  for (const prison of prisonRows) {
    for (const period of ["day", "night"]) {
      const row = prison && prison[`${period}Top`];
      const userId = normalizeUserId(row && row.userId);
      if (!userId) {
        continue;
      }

      items.push({
        source: "prison-tops",
        label: "Prison Tops",
        userId,
        nickname: pickNickname(row && row.nickname),
        photoUrl: pickPhotoUrl(row && row.photoUrl),
        prisonId: parsePositiveInt(prison && prison.prisonId),
        period,
        metricName: "rating",
        metricValue: pickMetricValue(row && row.rating),
      });
    }
  }

  for (const item of items) {
    addCandidate(aggregate, item);
  }

  return buildSourceSummary("prison-tops", response, items);
}

function normalizeBossLastKillers(response, aggregate) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const rawItems = payload.lastKillers && typeof payload.lastKillers === "object"
    ? Object.entries(payload.lastKillers)
    : [];

  const items = rawItems
    .map(([bossId, item]) => ({
      source: "boss-last-killers",
      label: "Boss Last Killers",
      userId: normalizeUserId(item && item.userId),
      nickname: pickNickname(item && item.nickname, item && item.nick),
      photoUrl: pickPhotoUrl(item && item.photoUrl),
      bossId: parsePositiveInt(bossId),
      event: "lastKill",
    }))
    .filter((item) => item.userId !== null);

  for (const item of items) {
    addCandidate(aggregate, item);
  }

  return buildSourceSummary("boss-last-killers", response, items, {
    hasActiveSession: Boolean(payload.session),
  });
}

function normalizeWeeklyOverview(response, aggregate) {
  const payload = response && response.data && typeof response.data === "object"
    ? response.data
    : {};
  const items = [];

  if (payload.jackpot && normalizeUserId(payload.jackpot.userId)) {
    items.push({
      source: "weekly-overview",
      label: "Weekly Overview",
      userId: normalizeUserId(payload.jackpot.userId),
      nickname: pickNickname(payload.jackpot.nickname, payload.jackpot.nick),
      photoUrl: pickPhotoUrl(payload.jackpot.photoUrl),
      event: "jackpot",
      metricName: "jackpotAmount",
      metricValue: pickMetricValue(payload.jackpot.amount),
    });
  }

  if (payload.keysLast && normalizeUserId(payload.keysLast.userId)) {
    items.push({
      source: "weekly-overview",
      label: "Weekly Overview",
      userId: normalizeUserId(payload.keysLast.userId),
      nickname: pickNickname(payload.keysLast.nickname, payload.keysLast.nick),
      photoUrl: pickPhotoUrl(payload.keysLast.photoUrl),
      event: "keysLast",
      metricName: simplifyMetricName(payload.keysLast.source),
      metricValue: pickMetricValue(payload.keysLast.amount),
    });
  }

  for (const item of items) {
    addCandidate(aggregate, item);
  }

  return buildSourceSummary("weekly-overview", response, items);
}

async function collectLeaderboardIds(client, options = {}) {
  const sources = normalizeCollectionSources(options.sources);
  const limit = parsePositiveInt(options.limit, 100) ?? 100;
  const aggregate = new Map();
  const sourceResults = {};

  for (const source of sources) {
    if (source === "authority-top") {
      sourceResults[source] = normalizeAuthorityTop(
        await client.friends.top100(),
        aggregate,
      );
      continue;
    }

    if (source === "weekly-damage") {
      sourceResults[source] = normalizeWeeklyDamage(
        await client.weekly.top(limit),
        aggregate,
      );
      continue;
    }

    if (source === "weekly-achievements") {
      sourceResults[source] = normalizeWeeklyAchievements(
        await client.weekly.achievements(limit),
        aggregate,
      );
      continue;
    }

    if (source === "prison-tops") {
      sourceResults[source] = normalizePrisonTops(
        await client.prisons.topsAll(),
        aggregate,
      );
      continue;
    }

    if (source === "boss-last-killers") {
      sourceResults[source] = normalizeBossLastKillers(
        await client.bosses.bootstrap(),
        aggregate,
      );
      continue;
    }

    if (source === "weekly-overview") {
      sourceResults[source] = normalizeWeeklyOverview(
        await client.weekly.overview(),
        aggregate,
      );
    }
  }

  const values = finalizeAggregateEntries(aggregate);

  return {
    generatedAt: new Date().toISOString(),
    limit,
    requestedSources: sources,
    sources: sourceResults,
    uniqueIds: {
      total: values.length,
      ids: values.map((item) => item.userId),
      values,
    },
  };
}

module.exports = {
  DEFAULT_ID_COLLECTION_SOURCES,
  collectLeaderboardIds,
  normalizeCollectionSources,
};
