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

// ── Label maps (reusable in screens) ──────────────────────────────────────

export const URBAN_REPORT_TYPE_LABELS = Object.fromEntries(
  URBAN_REPORT_TYPES.map(o => [o.id, o.label]),
);
export const URBAN_REPORT_PRIORITY_LABELS = Object.fromEntries(
  URBAN_REPORT_PRIORITIES.map(o => [o.id, o.label]),
);
export const URBAN_REPORT_STATUS_LABELS = Object.fromEntries(
  URBAN_REPORT_STATUSES.map(o => [o.id, o.label]),
);

// ── Category statistics ────────────────────────────────────────────────────

/**
 * Returns an object keyed by type id with { label, count } for every
 * defined urban report category.
 */
export function getCategoryStats(reports) {
  const stats = {};
  URBAN_REPORT_TYPES.forEach(t => {
    stats[t.id] = { label: t.label, count: 0 };
  });
  (reports || []).forEach(r => {
    if (stats[r.type]) stats[r.type].count += 1;
  });
  return stats;
}

// ── Average resolution time ────────────────────────────────────────────────

/**
 * Calculates the average time (in days, 1 decimal) taken to resolve reports.
 * Returns null when no resolved reports have timestamps.
 */
export function getAverageResolutionTime(reports) {
  const resolved = (reports || []).filter(
    r => r.status === 'resolved' && r.createdAt && r.updatedAt,
  );
  if (resolved.length === 0) return null;

  const totalMs = resolved.reduce((sum, r) => {
    const created = new Date(r.createdAt).getTime();
    const updated = new Date(r.updatedAt).getTime();
    return sum + (Number.isFinite(updated) && Number.isFinite(created) ? updated - created : 0);
  }, 0);

  const avgDays = totalMs / resolved.length / (1000 * 60 * 60 * 24);
  return Math.round(avgDays * 10) / 10;
}

// ── CSV export ─────────────────────────────────────────────────────────────

function csvEscape(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a CSV string from a list of normalized reports.
 * Columns: ID, Tipo, Priorità, Stato, Descrizione, Latitudine, Longitudine,
 *          Data Creazione, Data Aggiornamento.
 */
export function exportReportsCSV(reports) {
  const header = [
    'ID',
    'Tipo',
    'Priorità',
    'Stato',
    'Descrizione',
    'Latitudine',
    'Longitudine',
    'Data Creazione',
    'Data Aggiornamento',
  ];
  const rows = (reports || []).map(r => [
    csvEscape(r.id),
    csvEscape(URBAN_REPORT_TYPE_LABELS[r.type] || r.type),
    csvEscape(URBAN_REPORT_PRIORITY_LABELS[r.priority] || r.priority),
    csvEscape(URBAN_REPORT_STATUS_LABELS[r.status] || r.status),
    csvEscape(r.description),
    r.location ? r.location.latitude : '',
    r.location ? r.location.longitude : '',
    csvEscape(r.createdAt),
    csvEscape(r.updatedAt),
  ]);
  return [header.join(','), ...rows.map(row => row.join(','))].join('\n');
}

// ── GeoJSON export ─────────────────────────────────────────────────────────

/**
 * Generates a GeoJSON FeatureCollection string from reports that have
 * a valid location.  Each feature includes all report properties.
 */
export function exportReportsGeoJSON(reports) {
  const features = (reports || [])
    .filter(r => r.location)
    .map(r => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [r.location.longitude, r.location.latitude],
      },
      properties: {
        id: r.id,
        typeId: r.type,
        type: URBAN_REPORT_TYPE_LABELS[r.type] || r.type,
        priorityId: r.priority,
        priority: URBAN_REPORT_PRIORITY_LABELS[r.priority] || r.priority,
        statusId: r.status,
        status: URBAN_REPORT_STATUS_LABELS[r.status] || r.status,
        description: r.description || '',
        createdAt: r.createdAt || '',
        updatedAt: r.updatedAt || '',
      },
    }));

  return JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
}
