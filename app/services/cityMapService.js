import api from './api';

export async function fetchPois(params = {}) {
  const { data } = await api.get('/city-map/pois', { params });
  return data;
}

export async function fetchIssues(params = {}) {
  const { data } = await api.get('/city-map/issues', { params });
  return data;
}

export async function fetchRoutes(params = {}) {
  const { data } = await api.get('/city-map/routes', { params });
  return data;
}

export async function fetchPublicServices(params = {}) {
  const { data } = await api.get('/city-map/public-services', { params });
  return data;
}

export async function searchLocation(query, params = {}) {
  const { data } = await api.get('/city-map/search', { params: { q: query, ...params } });
  return data;
}

export async function fetchPoiDetail(id) {
  const { data } = await api.get(`/city-map/pois/${id}`);
  return data;
}

export async function fetchIssueDetail(id) {
  const { data } = await api.get(`/city-map/issues/${id}`);
  return data;
}

export async function fetchRouteDetail(id) {
  const { data } = await api.get(`/city-map/routes/${id}`);
  return data;
}

export async function fetchPublicServiceDetail(id) {
  const { data } = await api.get(`/city-map/public-services/${id}`);
  return data;
}