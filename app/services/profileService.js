import api from './api';

const unwrap = data => data?.data ?? data;

export async function getPublicProfile(userId) {
  const { data } = await api.get(`/users/${encodeURIComponent(userId)}`);
  return unwrap(data)?.user || unwrap(data);
}

export async function getProfileReputation(userId) {
  try {
    const { data } = await api.get(`/reviews/stats/${encodeURIComponent(userId)}`);
    return unwrap(data);
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    return { averageRating: 0, totalReviews: 0, ratingDistribution: {} };
  }
}
