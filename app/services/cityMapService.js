import api from './api';

const unwrap = data => data?.data ?? data;

export async function listPois({ category, status, search, latitude, longitude, radiusKm } = {}) {
  const params = {};
  if (category && category !== 'all') params.category = category;
  if (status && status !== 'all') params.status = status;
  if (search) params.search = search;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.latitude = latitude;
    params.longitude = longitude;
    if (radiusKm) params.radiusKm = radiusKm;
  }
  const { data } = await api.get('/city/pois', { params });
  const result = unwrap(data);
  return Array.isArray(result) ? result : result?.pois || [];
}

export async function listIssues({ category, status, search, latitude, longitude, radiusKm } = {}) {
  const params = {};
  if (category && category !== 'all') params.category = category;
  if (status && status !== 'all') params.status = status;
  if (search) params.search = search;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.latitude = latitude;
    params.longitude = longitude;
    if (radiusKm) params.radiusKm = radiusKm;
  }
  const { data } = await api.get('/city/issues', { params });
  const result = unwrap(data);
  return Array.isArray(result) ? result : result?.issues || [];
}

export async function listRoutes({ category, search } = {}) {
  const params = {};
  if (category && category !== 'all') params.category = category;
  if (search) params.search = search;
  const { data } = await api.get('/city/routes', { params });
  const result = unwrap(data);
  return Array.isArray(result) ? result : result?.routes || [];
}

export async function listPublicServices({ category, status, search, latitude, longitude, radiusKm } = {}) {
  const params = {};
  if (category && category !== 'all') params.category = category;
  if (status && status !== 'all') params.status = status;
  if (search) params.search = search;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.latitude = latitude;
    params.longitude = longitude;
    if (radiusKm) params.radiusKm = radiusKm;
  }
  const { data } = await api.get('/city/services', { params });
  const result = unwrap(data);
  return Array.isArray(result) ? result : result?.services || [];
}

export async function getCityItem(type, id) {
  const { data } = await api.get(`/city/${type}/${encodeURIComponent(id)}`);
  return data?.data ?? data;
}

export function coordinates(item) {
  if (!item) return null;
  const location = item.location || item.coordinates || {};
  const latitude = Number(
    item.latitude != null ? item.latitude : item.lat != null ? item.lat : location.latitude != null ? location.latitude : location.lat,
  );
  const longitude = Number(
    item.longitude != null ? item.longitude : item.lng != null ? item.lng : location.longitude != null ? location.longitude : location.lng != null ? location.lng : location.lon,
  );
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}
