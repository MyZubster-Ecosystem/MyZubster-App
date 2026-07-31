import api from './api';

export async function listTokens({ page = 1, limit = 20, search, type, status, minPrice, maxPrice, sortBy, sortOrder = 'asc', offset } = {}) {
  const params = new URLSearchParams();
  if (offset !== undefined) {
    params.set('offset', String(offset));
    params.set('limit', String(limit));
  } else {
    params.set('page', String(page));
    params.set('limit', String(limit));
  }
  if (search) params.set('search', search);
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  if (minPrice !== undefined && minPrice !== null && minPrice !== '') params.set('minPrice', String(minPrice));
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') params.set('maxPrice', String(maxPrice));
  if (sortBy) {
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
  }
  const { data } = await api.get(`/tokens?${params.toString()}`);
  return data;
}

export async function getToken(id) {
  const { data } = await api.get(`/tokens/${id}`);
  return data;
}

export async function getTokenStats(id) {
  const { data } = await api.get(`/tokens/${id}/stats`);
  return data;
}
