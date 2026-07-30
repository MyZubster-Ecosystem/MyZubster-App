import api from './api';

const unwrap = data => data?.data ?? data;

export async function listReviews(targetId) {
  const { data } = await api.get(`/reviews/target/${encodeURIComponent(targetId)}`);
  const result = unwrap(data);
  return Array.isArray(result) ? result : result?.reviews || [];
}

export async function getReviewStats(targetId) {
  const { data } = await api.get(`/reviews/stats/${encodeURIComponent(targetId)}`);
  return unwrap(data);
}

export async function createReview({ targetId, targetType = 'professional', rating, comment, orderId }) {
  const { data } = await api.post('/reviews', {
    targetId,
    targetType,
    rating: Number(rating),
    comment: String(comment || '').trim(),
    ...(orderId ? { orderId } : {}),
  });
  return unwrap(data);
}
