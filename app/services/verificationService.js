import api from './api';

// Community verification & reputation API layer (issue #45). These endpoints
// are a MyZubster backend contract: every POI / segnalazione moves from pending
// to verified once it collects at least VERIFICATION_THRESHOLD community
// approvals; verifiers earn reputation, with a bonus for verifications that are
// both rapid and accurate.

// A pending item becomes verified after this many community approvals.
export const VERIFICATION_THRESHOLD = 2;

// Bonus model: rapid + accurate verifiers earn extra reputation points.
export const RAPID_VERIFICATION_HOURS = 24;
export const BASE_VERIFY_POINTS = 5;
export const RAPID_BONUS = 3;
export const ACCURATE_BONUS = 2;

// Reputation tiers derived from a verifier's cumulative score (highest first).
export const REPUTATION_TIERS = [
  { min: 500, key: 'authority' },
  { min: 150, key: 'expert' },
  { min: 50, key: 'trusted' },
  { min: 0, key: 'newcomer' },
];

export async function getPendingVerifications() {
  const { data } = await api.get('/verifications/pending');
  const result = data?.data ?? data;
  return Array.isArray(result) ? result : result?.items || [];
}

export async function verifyItem(itemId, verdict = 'approve') {
  const { data } = await api.post(`/verifications/${encodeURIComponent(itemId)}/vote`, { verdict });
  return data?.data ?? data;
}

export async function getReputation(userId) {
  const { data } = await api.get(`/reputation/${encodeURIComponent(userId)}`);
  return data?.data ?? data;
}

export async function getVerifierDashboard() {
  const { data } = await api.get('/verifications/dashboard');
  return data?.data ?? data;
}

// ---- pure helpers (UI / tests derive state without a round-trip) ----

// Progress toward verification: counts approvals and resolves pending -> verified at the threshold.
export function verificationProgress(item = {}) {
  const approvals = Array.isArray(item.verifications)
    ? item.verifications.filter((v) => v === 'approve' || v?.verdict === 'approve').length
    : Number(item.approvals || 0);
  const verified = item.status === 'verified' || approvals >= VERIFICATION_THRESHOLD;
  return { approvals, required: VERIFICATION_THRESHOLD, verified, status: verified ? 'verified' : 'pending' };
}

// Reputation tier for a cumulative verifier score.
export function reputationTier(score = 0) {
  const s = Number(score) || 0;
  const tier = REPUTATION_TIERS.find((t) => s >= t.min);
  return tier ? tier.key : REPUTATION_TIERS[REPUTATION_TIERS.length - 1].key;
}

// Reputation points a verification contributes: base + rapid bonus + accurate bonus.
export function verificationPoints({ ageHours, matchedFinalVote } = {}) {
  let points = BASE_VERIFY_POINTS;
  if (Number.isFinite(ageHours) && ageHours <= RAPID_VERIFICATION_HOURS) points += RAPID_BONUS;
  if (matchedFinalVote === true) points += ACCURATE_BONUS;
  return points;
}
