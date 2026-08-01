import {
  GAMIFICATION_ACTION_POINTS,
  GAMIFICATION_BADGES,
  LEADERBOARD_PERIODS,
  calculateActionPoints,
  claimTopContributorBonus,
  getEarnedBadges,
  getGamificationProfile,
  getLeaderboard,
  isGamificationEndpointError,
  normalizeGamificationProfile,
  normalizeLeaderboard,
  recordGamificationAction,
} from '../services/gamificationService';
import api from '../services/api';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe('gamificationService contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('declares score actions, leaderboard periods and badges', () => {
    expect(GAMIFICATION_ACTION_POINTS).toMatchObject({ registration: 25, verification: 10, report: 15 });
    expect(LEADERBOARD_PERIODS).toEqual(['weekly', 'monthly', 'total']);
    expect(GAMIFICATION_BADGES.length).toBeGreaterThanOrEqual(4);
  });

  test('calculates action points with safe multipliers', () => {
    expect(calculateActionPoints('verification')).toBe(10);
    expect(calculateActionPoints('report', 2)).toBe(30);
    expect(calculateActionPoints('unknown', 10)).toBe(0);
  });

  test('derives earned badges from total points', () => {
    expect(getEarnedBadges(260).map(badge => badge.id)).toEqual(['first-step', 'city-helper', 'trusted-verifier']);
  });

  test('normalizes profile and leaderboard variants', () => {
    expect(normalizeGamificationProfile({ score: 120, weekly_score: 40, reportsSubmitted: 3 })).toMatchObject({
      totalPoints: 120,
      weeklyPoints: 40,
      reports: 3,
      badges: expect.arrayContaining([expect.objectContaining({ id: 'first-step' })]),
    });

    expect(normalizeLeaderboard({ users: [{ username: 'Ada', score: 55 }] }, 'monthly')).toEqual({
      period: 'monthly',
      entries: [expect.objectContaining({ rank: 1, name: 'Ada', points: 55 })],
      updatedAt: null,
    });
  });

  test('calls profile, leaderboard, action and bonus endpoints', async () => {
    api.get
      .mockResolvedValueOnce({ data: { profile: { points: 100 } } })
      .mockResolvedValueOnce({ data: { entries: [{ name: 'User', points: 20 }] } });
    api.post
      .mockResolvedValueOnce({ data: { profile: { points: 115 } } })
      .mockResolvedValueOnce({ data: { ok: true } });

    await expect(getGamificationProfile()).resolves.toMatchObject({ totalPoints: 100 });
    await expect(getLeaderboard('total')).resolves.toMatchObject({ period: 'total' });
    await expect(recordGamificationAction('report')).resolves.toMatchObject({ totalPoints: 115 });
    await expect(claimTopContributorBonus('monthly')).resolves.toEqual({ ok: true });

    expect(api.get).toHaveBeenCalledWith('/gamification/profile');
    expect(api.get).toHaveBeenCalledWith('/gamification/leaderboard', { params: { period: 'total' } });
    expect(api.post).toHaveBeenCalledWith('/gamification/actions', expect.objectContaining({ action: 'report', points: 15 }));
    expect(api.post).toHaveBeenCalledWith('/gamification/bonuses/claim', { period: 'monthly' });
  });

  test('recognizes missing endpoint errors', () => {
    expect(isGamificationEndpointError({ response: { status: 501 } })).toBe(true);
    expect(isGamificationEndpointError({ response: { status: 500 } })).toBe(false);
  });
});
