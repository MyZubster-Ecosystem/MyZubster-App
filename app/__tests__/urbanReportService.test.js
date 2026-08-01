import {
  MAX_URBAN_REPORT_PHOTOS,
  URBAN_REPORT_PRIORITIES,
  URBAN_REPORT_STATUSES,
  URBAN_REPORT_TYPES,
  URBAN_REPORT_TYPE_LABELS,
  URBAN_REPORT_PRIORITY_LABELS,
  URBAN_REPORT_STATUS_LABELS,
  buildUrbanReportPayload,
  createUrbanReport,
  exportReportsCSV,
  exportReportsGeoJSON,
  getAverageResolutionTime,
  getCategoryStats,
  isUrbanReportEndpointError,
  listUrbanReports,
  normalizeUrbanReport,
  updateUrbanReportStatus,
} from '../services/urbanReportService';
import api from '../services/api';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() } }));

// ── Sample data ────────────────────────────────────────────────────────────

const sampleReports = [
  {
    id: 'r1',
    type: 'road',
    priority: 'high',
    status: 'resolved',
    description: 'Buche profonde in strada',
    photos: [],
    location: { latitude: 45.4642, longitude: 9.19 },
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    reporterName: 'Mario Rossi',
  },
  {
    id: 'r2',
    type: 'lighting',
    priority: 'medium',
    status: 'in_progress',
    description: 'Lampione rotto vicino alla scuola',
    photos: ['foto1.jpg'],
    location: { latitude: 45.467, longitude: 9.185 },
    createdAt: '2024-02-01T12:00:00Z',
    updatedAt: '2024-02-05T09:00:00Z',
    reporterName: 'Luigi Bianchi',
  },
  {
    id: 'r3',
    type: 'green',
    priority: 'low',
    status: 'reported',
    description: 'Erba alta nel parco pubblico',
    photos: [],
    location: { latitude: 45.47, longitude: 9.18 },
    createdAt: '2024-03-01T07:00:00Z',
    updatedAt: null,
    reporterName: '',
  },
  {
    id: 'r4',
    type: 'road',
    priority: 'high',
    status: 'resolved',
    description: 'Marciapiede dissestato',
    photos: [],
    location: { latitude: 45.462, longitude: 9.195 },
    createdAt: '2024-01-20T14:00:00Z',
    updatedAt: '2024-01-28T16:00:00Z',
    reporterName: 'Anna Verdi',
  },
  {
    id: 'r5',
    type: 'safety',
    priority: 'high',
    status: 'resolved',
    description: 'Semaforo non funzionante',
    photos: [],
    location: { latitude: 45.465, longitude: 9.188 },
    createdAt: '2023-12-01T06:00:00Z',
    updatedAt: '2023-12-10T18:00:00Z',
    reporterName: 'Carlo Neri',
  },
  {
    id: 'r6',
    type: 'decorum',
    priority: 'low',
    status: 'resolved',
    description: 'Rifiuti abbandonati',
    photos: [],
    location: null,
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-04-05T12:00:00Z',
    reporterName: '',
  },
];

const reportsWithoutLocation = sampleReports.filter(r => r.type === 'decorum');

// ── Tests ──────────────────────────────────────────────────────────────────

describe('urbanReportService contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('declares the urban report types, priorities, statuses and photo cap', () => {
    expect(MAX_URBAN_REPORT_PHOTOS).toBe(3);
    expect(URBAN_REPORT_TYPES.map(item => item.id)).toEqual(['road', 'lighting', 'decorum', 'green', 'safety']);
    expect(URBAN_REPORT_PRIORITIES.map(item => item.id)).toEqual(['high', 'medium', 'low']);
    expect(URBAN_REPORT_STATUSES.map(item => item.id)).toEqual(['reported', 'in_progress', 'resolved']);
  });

  test('exports label maps matching the constant arrays', () => {
    expect(URBAN_REPORT_TYPE_LABELS).toEqual({
      road: 'Viabilita',
      lighting: 'Illuminazione',
      decorum: 'Decoro',
      green: 'Verde',
      safety: 'Sicurezza',
    });
    expect(URBAN_REPORT_PRIORITY_LABELS).toEqual({
      high: 'Alta',
      medium: 'Media',
      low: 'Bassa',
    });
    expect(URBAN_REPORT_STATUS_LABELS).toEqual({
      reported: 'Segnalato',
      in_progress: 'In lavorazione',
      resolved: 'Risolto',
    });
  });

  test('builds a normalized payload with GPS and a maximum of three photos', () => {
    expect(buildUrbanReportPayload({
      type: 'lighting',
      priority: 'high',
      description: 'Lampione rotto vicino alla scuola',
      photos: ['one.jpg', 'two.jpg', 'three.jpg', 'four.jpg'],
      location: { lat: 45.4642, lng: 9.19 },
    })).toEqual({
      type: 'lighting',
      priority: 'high',
      description: 'Lampione rotto vicino alla scuola',
      photos: ['one.jpg', 'two.jpg', 'three.jpg'],
      location: { latitude: 45.4642, longitude: 9.19 },
      status: 'reported',
    });
  });

  test('requires GPS and a useful description before submission', () => {
    expect(() => buildUrbanReportPayload({ description: 'short', location: { lat: 45 } })).toThrow(/GPS location/);
    expect(() => buildUrbanReportPayload({ description: 'too short', location: { latitude: 1, longitude: 2 } })).toThrow(/at least 10/);
  });

  test('normalizes API report variants', () => {
    expect(normalizeUrbanReport({
      _id: 'r1',
      category: 'green',
      priority: 'urgent',
      status: 'done',
      text: 'Albero caduto sulla pista ciclabile',
      photoUris: ['a', '', 'b'],
      coordinates: { latitude: '44.5', longitude: '11.3' },
    })).toMatchObject({
      id: 'r1',
      type: 'green',
      priority: 'medium',
      status: 'reported',
      description: 'Albero caduto sulla pista ciclabile',
      photos: ['a', 'b'],
      location: { latitude: 44.5, longitude: 11.3 },
    });
  });

  test('calls the urban reports API endpoints', async () => {
    api.get.mockResolvedValueOnce({ data: { reports: [{ id: 'r1', description: 'Buche profonde in strada', location: { latitude: 1, longitude: 2 } }] } });
    api.post.mockResolvedValueOnce({ data: { report: { id: 'r2', description: 'Rifiuti abbandonati', location: { latitude: 3, longitude: 4 } } } });
    api.put.mockResolvedValueOnce({ data: { id: 'r1', status: 'resolved', description: 'Buche profonde in strada', location: { latitude: 1, longitude: 2 } } });

    await expect(listUrbanReports()).resolves.toHaveLength(1);
    await expect(createUrbanReport({ description: 'Rifiuti abbandonati', location: { latitude: 3, longitude: 4 } })).resolves.toMatchObject({ id: 'r2' });
    await expect(updateUrbanReportStatus('r1', 'resolved')).resolves.toMatchObject({ status: 'resolved' });

    expect(api.get).toHaveBeenCalledWith('/urban-reports', { params: {} });
    expect(api.post).toHaveBeenCalledWith('/urban-reports', expect.objectContaining({ status: 'reported' }));
    expect(api.put).toHaveBeenCalledWith('/urban-reports/r1/status', { status: 'resolved' });
  });

  test('recognizes missing endpoint errors', () => {
    expect(isUrbanReportEndpointError({ response: { status: 404 } })).toBe(true);
    expect(isUrbanReportEndpointError({ response: { status: 500 } })).toBe(false);
  });

  // ── New function: getCategoryStats ───────────────────────────────────────

  describe('getCategoryStats', () => {
    test('returns zero for every type when reports is empty', () => {
      const stats = getCategoryStats([]);
      URBAN_REPORT_TYPES.forEach(t => {
        expect(stats[t.id]).toEqual({ label: t.label, count: 0 });
      });
    });

    test('counts reports per category', () => {
      const stats = getCategoryStats(sampleReports);
      expect(stats.road.count).toBe(2);
      expect(stats.lighting.count).toBe(1);
      expect(stats.green.count).toBe(1);
      expect(stats.safety.count).toBe(1);
      expect(stats.decorum.count).toBe(1);
    });

    test('handles null/undefined gracefully', () => {
      expect(getCategoryStats(null)).toBeDefined();
      expect(getCategoryStats(undefined)).toBeDefined();
      URBAN_REPORT_TYPES.forEach(t => {
        expect(getCategoryStats(null)[t.id].count).toBe(0);
      });
    });
  });

  // ── New function: getAverageResolutionTime ───────────────────────────────

  describe('getAverageResolutionTime', () => {
    test('returns null when no resolved reports', () => {
      const unreportedStatus = [{ status: 'reported', createdAt: '2024-01-01', updatedAt: '2024-01-02' }];
      expect(getAverageResolutionTime(unreportedStatus)).toBeNull();
    });

    test('returns null when resolved reports lack timestamps', () => {
      const noTimestamps = [{ status: 'resolved' }, { status: 'resolved', createdAt: '2024-01-01' }];
      expect(getAverageResolutionTime(noTimestamps)).toBeNull();
    });

    test('returns null for empty list', () => {
      expect(getAverageResolutionTime([])).toBeNull();
      expect(getAverageResolutionTime(null)).toBeNull();
    });

    test('calculates average resolution time in days', () => {
      // r1: createdAt=2024-01-10T08:00, updatedAt=2024-01-15T10:30 → 5.104 days
      // r4: createdAt=2024-01-20T14:00, updatedAt=2024-01-28T16:00 → 8.083 days
      // r5: createdAt=2023-12-01T06:00, updatedAt=2023-12-10T18:00 → 9.500 days
      // r6: has location=null but still resolved with timestamps
      const resolved = sampleReports.filter(r => r.status === 'resolved');
      const avg = getAverageResolutionTime(resolved);
      expect(avg).toBeCloseTo(6.7, 0);
    });
  });

  // ── New function: exportReportsCSV ───────────────────────────────────────

  describe('exportReportsCSV', () => {
    test('returns header-only CSV for empty list', () => {
      const csv = exportReportsCSV([]);
      const lines = csv.split('\n');
      expect(lines[0]).toBe('ID,Tipo,Priorità,Stato,Descrizione,Latitudine,Longitudine,Data Creazione,Data Aggiornamento');
      expect(lines).toHaveLength(1);
    });

    test('includes all report data in CSV rows', () => {
      const csv = exportReportsCSV(sampleReports);
      const lines = csv.split('\n');
      // header + 6 reports
      expect(lines).toHaveLength(7);
      // Check header
      expect(lines[0]).toBe('ID,Tipo,Priorità,Stato,Descrizione,Latitudine,Longitudine,Data Creazione,Data Aggiornamento');
      // Check a specific row: r1
      const r1Row = lines[1];
      expect(r1Row).toContain('r1');
      expect(r1Row).toContain('Viabilita');
      expect(r1Row).toContain('Alta');
      expect(r1Row).toContain('Risolto');
      expect(r1Row).toContain('45.4642');
      expect(r1Row).toContain('9.19');
    });

    test('escapes commas and quotes in description', () => {
      const reportsWithSpecial = [{
        ...sampleReports[0],
        description: 'Buca, "pericolosa", sulla strada',
      }];
      const csv = exportReportsCSV(reportsWithSpecial);
      // Description should be quoted with inner quotes doubled
      expect(csv).toContain('"Buca, ""pericolosa"", sulla strada"');
    });

    test('handles null/undefined gracefully', () => {
      expect(() => exportReportsCSV(null)).not.toThrow();
      expect(() => exportReportsCSV(undefined)).not.toThrow();
      expect(exportReportsCSV(null).split('\n')).toHaveLength(1);
    });
  });

  // ── New function: exportReportsGeoJSON ───────────────────────────────────

  describe('exportReportsGeoJSON', () => {
    test('returns empty FeatureCollection when no reports have location', () => {
      const geojson = JSON.parse(exportReportsGeoJSON(reportsWithoutLocation));
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(0);
    });

    test('returns empty FeatureCollection for empty list', () => {
      const geojson = JSON.parse(exportReportsGeoJSON([]));
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(0);
    });

    test('generates valid GeoJSON with correct coordinates', () => {
      const geojson = JSON.parse(exportReportsGeoJSON(sampleReports));
      expect(geojson.type).toBe('FeatureCollection');
      // All 6 reports minus r6 (no location) = 5 features
      expect(geojson.features).toHaveLength(5);

      // Check first feature
      const f1 = geojson.features[0];
      expect(f1.type).toBe('Feature');
      expect(f1.geometry.type).toBe('Point');
      expect(f1.geometry.coordinates).toEqual([9.19, 45.4642]);
      expect(f1.properties.id).toBe('r1');
      expect(f1.properties.type).toBe('Viabilita');
      expect(f1.properties.status).toBe('Risolto');
    });

    test('includes all properties for each feature', () => {
      const geojson = JSON.parse(exportReportsGeoJSON([sampleReports[0]]));
      const props = geojson.features[0].properties;
      expect(props).toHaveProperty('id');
      expect(props).toHaveProperty('typeId');
      expect(props).toHaveProperty('type');
      expect(props).toHaveProperty('priorityId');
      expect(props).toHaveProperty('priority');
      expect(props).toHaveProperty('statusId');
      expect(props).toHaveProperty('status');
      expect(props).toHaveProperty('description');
      expect(props).toHaveProperty('createdAt');
      expect(props).toHaveProperty('updatedAt');
    });

    test('handles null/undefined gracefully', () => {
      expect(() => exportReportsGeoJSON(null)).not.toThrow();
      expect(() => exportReportsGeoJSON(undefined)).not.toThrow();
      const geojson = JSON.parse(exportReportsGeoJSON(null));
      expect(geojson.features).toHaveLength(0);
    });
  });
});