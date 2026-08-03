import {
  VERIFICATION_THRESHOLD,
  RAPID_VERIFICATION_HOURS,
  BASE_VERIFY_POINTS,
  RAPID_BONUS,
  ACCURATE_BONUS,
  REPUTATION_TIERS,
  getPendingVerifications,
  verifyItem,
  getReputation,
  getVerifierDashboard,
  verificationProgress,
  reputationTier,
  verificationPoints,
} from '../services/verificationService';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
import api from '../services/api';

describe('verificationService contract', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('exports the verification/reputation constants and API helpers', () => {
    expect(VERIFICATION_THRESHOLD).toBe(2);
    expect(RAPID_VERIFICATION_HOURS).toBe(24);
    expect(BASE_VERIFY_POINTS).toBe(5);
    expect(RAPID_BONUS).toBe(3);
    expect(ACCURATE_BONUS).toBe(2);
    expect(REPUTATION_TIERS.map((t) => t.key)).toEqual(['authority', 'expert', 'trusted', 'newcomer']);
    expect(typeof getPendingVerifications).toBe('function');
    expect(typeof verifyItem).toBe('function');
    expect(typeof getReputation).toBe('function');
    expect(typeof getVerifierDashboard).toBe('function');
    expect(typeof verificationProgress).toBe('function');
    expect(typeof reputationTier).toBe('function');
    expect(typeof verificationPoints).toBe('function');
  });

  test('getPendingVerifications hits /verifications/pending and returns an array', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [{ id: 'v1', status: 'pending' }] } });
    const out = await getPendingVerifications();
    expect(api.get).toHaveBeenCalledWith('/verifications/pending');
    expect(Array.isArray(out)).toBe(true);
    expect(out[0]).toEqual({ id: 'v1', status: 'pending' });
  });

  test('verifyItem posts a verdict to the item vote endpoint', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { status: 'verified' } } });
    await verifyItem('v1', 'approve');
    expect(api.post).toHaveBeenCalledWith('/verifications/v1/vote', { verdict: 'approve' });
  });

  test('getReputation and getVerifierDashboard call their endpoints', async () => {
    api.get.mockResolvedValueOnce({ data: { data: { score: 80 } } }).mockResolvedValueOnce({ data: { data: { total: 5 } } });
    const rep = await getReputation('u7');
    const dash = await getVerifierDashboard();
    expect(api.get).toHaveBeenNthCalledWith(1, '/reputation/u7');
    expect(api.get).toHaveBeenNthCalledWith(2, '/verifications/dashboard');
    expect(rep).toEqual({ score: 80 });
    expect(dash).toEqual({ total: 5 });
  });

  test('verificationProgress counts approvals and resolves the threshold', () => {
    expect(verificationProgress({ verifications: ['approve', 'approve'] })).toEqual(
      expect.objectContaining({ approvals: 2, required: 2, verified: true, status: 'verified' }),
    );
    expect(verificationProgress({ verifications: [{ verdict: 'approve' }] }).verified).toBe(false);
    expect(verificationProgress({ approvals: 1 }).status).toBe('pending');
    expect(verificationProgress({ status: 'verified' }).verified).toBe(true);
    expect(verificationProgress().approvals).toBe(0);
  });

  test('reputationTier maps scores into bands', () => {
    expect(reputationTier(600)).toBe('authority');
    expect(reputationTier(500)).toBe('authority');
    expect(reputationTier(150)).toBe('expert');
    expect(reputationTier(49)).toBe('newcomer');
    expect(reputationTier(50)).toBe('trusted');
    expect(reputationTier(120)).toBe('trusted');
    expect(reputationTier(0)).toBe('newcomer');
    expect(reputationTier(-5)).toBe('newcomer');
    expect(reputationTier()).toBe('newcomer');
  });

  test('verificationPoints adds rapid and accurate bonuses', () => {
    expect(verificationPoints()).toBe(BASE_VERIFY_POINTS);
    expect(verificationPoints({ ageHours: 2, matchedFinalVote: true })).toBe(BASE_VERIFY_POINTS + RAPID_BONUS + ACCURATE_BONUS);
    expect(verificationPoints({ ageHours: 72 })).toBe(BASE_VERIFY_POINTS);
    expect(verificationPoints({ matchedFinalVote: true })).toBe(BASE_VERIFY_POINTS + ACCURATE_BONUS);
  });
});
