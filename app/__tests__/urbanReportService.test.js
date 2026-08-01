import {
  MAX_URBAN_REPORT_PHOTOS,
  URBAN_REPORT_PRIORITIES,
  URBAN_REPORT_STATUSES,
  URBAN_REPORT_TYPES,
  buildUrbanReportPayload,
  createUrbanReport,
  isUrbanReportEndpointError,
  listUrbanReports,
  normalizeUrbanReport,
  updateUrbanReportStatus,
} from '../services/urbanReportService';
import api from '../services/api';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() } }));

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
});
