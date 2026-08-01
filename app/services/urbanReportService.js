import api from './api';

export const MAX_URBAN_REPORT_PHOTOS = 3;

export const URBAN_REPORT_TYPES = [
  { id: 'road', label: 'Viabilita' },
  { id: 'lighting', label: 'Illuminazione' },
  { id: 'decorum', label: 'Decoro' },
  { id: 'green', label: 'Verde' },
  { id: 'safety', label: 'Sicurezza' },
];

export const URBAN_REPORT_PRIORITIES = [
  { id: 'high', label: 'Alta' },
  { id: 'medium', label: 'Media' },
  { id: 'low', label: 'Bassa' },
];

export const URBAN_REPORT_STATUSES = [
  { id: 'reported', label: 'Segnalato' },
  { id: 'in_progress', label: 'In lavorazione' },
  { id: 'resolved', label: 'Risolto' },
];

function byId(options, fallback) {
  const allowed = new Set(options.map(option => option.id));
  return value => (allowed.has(value) ? value : fallback);
}

const normalizeType = byId(URBAN_REPORT_TYPES, 'road');
const normalizePriority = byId(URBAN_REPORT_PRIORITIES, 'medium');
const normalizeStatus = byId(URBAN_REPORT_STATUSES, 'reported');

function compactText(value) {
  return String(value || '').trim();
}

function normalizePhotos(photos) {
  const entries = Array.isArray(photos) ? photos : [];
  return entries.map(compactText).filter(Boolean).slice(0, MAX_URBAN_REPORT_PHOTOS);
}

function normalizeLocation(location = {}) {
  const latitude = Number(location.latitude ?? location.lat);
  const longitude = Number(location.longitude ?? location.lng ?? location.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function normalizeUrbanReport(report = {}) {
  return {
    id: report.id || report._id || report.reportId || null,
    type: normalizeType(report.type || report.category),
    priority: normalizePriority(report.priority),
    status: normalizeStatus(report.status),
    description: compactText(report.description || report.text),
    photos: normalizePhotos(report.photos || report.photoUris || report.images),
    location: normalizeLocation(report.location || report.coordinates || report),
    createdAt: report.createdAt || report.created_at || null,
    updatedAt: report.updatedAt || report.updated_at || null,
    reporterName: report.reporterName || report.reporter?.name || report.user?.name || '',
  };
}

export function buildUrbanReportPayload({ type, priority, description, photos, location }) {
  const normalizedLocation = normalizeLocation(location);
  const normalizedDescription = compactText(description);

  if (!normalizedLocation) {
    throw new Error('A GPS location is required before submitting an urban report.');
  }

  if (normalizedDescription.length < 10) {
    throw new Error('Urban report description must be at least 10 characters.');
  }

  return {
    type: normalizeType(type),
    priority: normalizePriority(priority),
    description: normalizedDescription,
    photos: normalizePhotos(photos),
    location: normalizedLocation,
    status: 'reported',
  };
}

async function requestWithFallback(requests) {
  const errors = [];

  for (const request of requests) {
    try {
      return await request();
    } catch (error) {
      errors.push(error);
      const status = error.response?.status;

      if (status && ![404, 405, 501].includes(status)) {
        throw error;
      }
    }
  }

  throw errors[errors.length - 1];
}

export async function listUrbanReports(filters = {}) {
  const config = { params: filters };
  const { data } = await requestWithFallback([
    () => api.get('/urban-reports', config),
    () => api.get('/reports/urban', config),
  ]);
  const reports = Array.isArray(data) ? data : data.reports || data.urbanReports || [];
  return reports.map(normalizeUrbanReport);
}

export async function createUrbanReport(input) {
  const payload = buildUrbanReportPayload(input);
  const { data } = await requestWithFallback([
    () => api.post('/urban-reports', payload),
    () => api.post('/reports/urban', payload),
  ]);
  return normalizeUrbanReport(data.report || data);
}

export async function updateUrbanReportStatus(reportId, status) {
  const normalizedStatus = normalizeStatus(status);
  const encodedId = encodeURIComponent(reportId);
  const { data } = await requestWithFallback([
    () => api.put(`/urban-reports/${encodedId}/status`, { status: normalizedStatus }),
    () => api.patch(`/urban-reports/${encodedId}`, { status: normalizedStatus }),
    () => api.put(`/reports/urban/${encodedId}/status`, { status: normalizedStatus }),
  ]);
  return normalizeUrbanReport(data.report || data);
}

export function isUrbanReportEndpointError(error) {
  return error?.response?.status === 404 || error?.response?.status === 501;
}
