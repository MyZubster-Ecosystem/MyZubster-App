import {
  fetchPois,
  fetchIssues,
  fetchRoutes,
  fetchPublicServices,
  searchLocation,
  fetchPoiDetail,
  fetchIssueDetail,
  fetchRouteDetail,
  fetchPublicServiceDetail,
} from '../services/cityMapService';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn() } }));

describe('cityMapService contract', () => {
  test('exports city map API functions', () => {
    expect(typeof fetchPois).toBe('function');
    expect(typeof fetchIssues).toBe('function');
    expect(typeof fetchRoutes).toBe('function');
    expect(typeof fetchPublicServices).toBe('function');
    expect(typeof searchLocation).toBe('function');
    expect(typeof fetchPoiDetail).toBe('function');
    expect(typeof fetchIssueDetail).toBe('function');
    expect(typeof fetchRouteDetail).toBe('function');
    expect(typeof fetchPublicServiceDetail).toBe('function');
  });
});
