import api from './api';

// POI registration API layer (issue #41). These endpoints are a MyZubster
// backend contract: citizens register points of interest (POI) with GPS,
// photos and a description; the community verifies each POI with a minimum of
// 2 approvals before it is considered verified.

export const POI_CATEGORIES = [
  'parks',
  'schools',
  'hospitals',
  'transport',
  'monuments',
  'commercial',
];

export const VERIFICATION_THRESHOLD = 2;

export async function createPoi({ name, category, description, latitude, longitude, photos } = {}) {
  const { data } = await api.post('/pois', {
    name,
    category,
    description,
    latitude: Number(latitude),
    longitude: Number(longitude),
    photos: Array.isArray(photos) ? photos.slice(0, 5) : [],
  });
  return data?.data ?? data;
}

export async function listPois({ category, status, latitude, longitude, radiusKm } = {}) {
  const params = {};
  if (category && category !== 'all') params.category = category;
  if (status) params.status = status;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.latitude = latitude;
    params.longitude = longitude;
    if (radiusKm) params.radiusKm = radiusKm;
  }
  const { data } = await api.get('/pois', { params });
  const result = data?.data ?? data;
  return Array.isArray(result) ? result : result?.pois || [];
}

export async function getPoi(poiId) {
  const { data } = await api.get(`/pois/${encodeURIComponent(poiId)}`);
  return data?.data ?? data;
}

export async function votePoi(poiId, verdict = 'approve') {
  const { data } = await api.post(`/pois/${encodeURIComponent(poiId)}/vote`, { verdict });
  return data?.data ?? data;
}

export async function getPendingVerifications() {
  const { data } = await api.get('/pois/pending');
  const result = data?.data ?? data;
  return Array.isArray(result) ? result : result?.pois || [];
}

// Pure helper: derive verification progress from either a normalized POI
// (verifications[] list) or the short-style { approvals } shape.
export function poiVerificationProgress(poi = {}) {
  const approvals = Array.isArray(poi.verifications)
    ? poi.verifications.filter((v) => (v.verdict || v).approve !== false && (v.verdict || v) !== 'reject').length
    : Number(poi.approvals || 0);
  const verified = poi.status === 'verified' || approvals >= VERIFICATION_THRESHOLD;
  return { approvals, required: VERIFICATION_THRESHOLD, verified };
}
