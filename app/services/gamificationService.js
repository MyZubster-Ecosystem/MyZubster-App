import api from './api';

export const GAMIFICATION_ACTION_POINTS = {
  registration: 25,
  verification: 10,
  report: 15,
  resolved_report: 30,
  top_contributor_bonus: 50,
};

export const LEADERBOARD_PERIODS = ['weekly', 'monthly', 'total'];

export const GAMIFICATION_BADGES = [
  { id: 'first-step', label: 'Primo passo', threshold: 25 },
  { id: 'city-helper', label: 'Aiutante civico', threshold: 100 },
  { id: 'trusted-verifier', label: 'Verifier affidabile', threshold: 250 },
  { id: 'top-contributor', label: 'Top contributor', threshold: 500 },
];

function numberOrZero(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizePeriod(period) {
  return LEADERBOARD_PERIODS.includes(period) ? period : 'weekly';
}

function normalizeLeaderboardEntry(entry = {}, index = 0) {
  return {
    rank: Number(entry.rank || index + 1),
    userId: entry.userId || entry.user_id || entry.id || null,
    name: entry.name || entry.displayName || entry.username || 'Contributor',
    points: numberOrZero(entry.points || entry.score),
    verifications: numberOrZero(entry.verifications),
    reports: numberOrZero(entry.reports),
    badges: Array.isArray(entry.badges) ? entry.badges : [],
  };
}

export function getEarnedBadges(points) {
  const score = numberOrZero(points);
  return GAMIFICATION_BADGES.filter(badge => score >= badge.threshold);
}

export function calculateActionPoints(action, multiplier = 1) {
  const base = GAMIFICATION_ACTION_POINTS[action] || 0;
  return Math.max(0, Math.round(base * numberOrZero(multiplier)));
}

export function normalizeGamificationProfile(profile = {}) {
  const totalPoints = numberOrZero(profile.totalPoints || profile.points || profile.score);
  const weeklyPoints = numberOrZero(profile.weeklyPoints || profile.weekly_score);
  const monthlyPoints = numberOrZero(profile.monthlyPoints || profile.monthly_score);
  const badges = Array.isArray(profile.badges) && profile.badges.length > 0
    ? profile.badges
    : getEarnedBadges(totalPoints);

  return {
    userId: profile.userId || profile.user_id || profile.id || null,
    name: profile.name || profile.displayName || profile.username || 'Contributor',
    totalPoints,
    weeklyPoints,
    monthlyPoints,
    rank: Number(profile.rank || 0),
    reports: numberOrZero(profile.reports || profile.reportsSubmitted),
    verifications: numberOrZero(profile.verifications || profile.verifiedItems),
    badges,
    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
    bonuses: Array.isArray(profile.bonuses) ? profile.bonuses : [],
  };
}

export function normalizeLeaderboard(payload = {}, period = 'weekly') {
  const entries = Array.isArray(payload)
    ? payload
    : payload.entries || payload.leaderboard || payload.users || [];

  return {
    period: normalizePeriod(payload.period || period),
    entries: entries.map(normalizeLeaderboardEntry),
    updatedAt: payload.updatedAt || payload.updated_at || null,
  };
}

async function requestWithFallback(requests) {
  const errors = [];

  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      errors.push(error);
      const status = error.response?.status;

      if (status && ![404, 405, 501].includes(status)) {
        throw error;
      }
    }
  }

  throw errors[errors.length - 1];
}

export async function getGamificationProfile() {
  const { data } = await requestWithFallback([
    () => api.get('/gamification/profile'),
    () => api.get('/rewards/gamification/profile'),
  ]);
  return normalizeGamificationProfile(data.profile || data);
}

export async function getLeaderboard(period = 'weekly') {
  const normalizedPeriod = normalizePeriod(period);
  const config = { params: { period: normalizedPeriod } };
  const { data } = await requestWithFallback([
    () => api.get('/gamification/leaderboard', config),
    () => api.get(`/gamification/leaderboard/${normalizedPeriod}`),
    () => api.get('/rewards/gamification/leaderboard', config),
  ]);
  return normalizeLeaderboard(data, normalizedPeriod);
}

export async function recordGamificationAction(action, metadata = {}) {
  const payload = { action, points: calculateActionPoints(action, metadata.multiplier), metadata };
  const { data } = await requestWithFallback([
    () => api.post('/gamification/actions', payload),
    () => api.post('/rewards/gamification/actions', payload),
  ]);
  return normalizeGamificationProfile(data.profile || data);
}

export async function claimTopContributorBonus(period = 'weekly') {
  const normalizedPeriod = normalizePeriod(period);
  const { data } = await requestWithFallback([
    () => api.post('/gamification/bonuses/claim', { period: normalizedPeriod }),
    () => api.post('/rewards/gamification/bonuses/claim', { period: normalizedPeriod }),
  ]);
  return data;
}

export function isGamificationEndpointError(error) {
  return error?.response?.status === 404 || error?.response?.status === 501;
}
