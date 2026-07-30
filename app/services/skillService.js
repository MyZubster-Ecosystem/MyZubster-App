import api from './api';

export async function listSkills({ category, radiusKm, latitude, longitude } = {}) {
  const params = {};
  if (category && category !== 'all') params.category = category;
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    params.latitude = latitude;
    params.longitude = longitude;
    if (radiusKm) params.radiusKm = radiusKm;
  }
  const { data } = await api.get('/skills', { params });
  const result = data?.data ?? data;
  return Array.isArray(result) ? result : result?.skills || [];
}

export async function getSkill(skillId) {
  const { data } = await api.get(`/skills/${encodeURIComponent(skillId)}`);
  return data?.data ?? data;
}
