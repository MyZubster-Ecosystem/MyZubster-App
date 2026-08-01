import api from './api';

// Monero rewards API layer. These endpoints are a gateway contract backed by
// the MyZubster backend: verified reports and completed drone tasks earn XMR
// that citizens can claim into their Monero wallet.

export async function getRewards() {
  const { data } = await api.get('/rewards');
  return data;
}

export async function getRewardHistory() {
  const { data } = await api.get('/rewards/history');
  return Array.isArray(data) ? data : data.transactions || [];
}

export async function claimReward(rewardId) {
  const { data } = await api.post('/rewards/claim', { rewardId });
  return data;
}

export async function getRewardStats() {
  const { data } = await api.get('/rewards/stats');
  return data;
}

export function isRewardsEndpointError(error) {
  return error?.response?.status === 404 || error?.response?.status === 501;
}
