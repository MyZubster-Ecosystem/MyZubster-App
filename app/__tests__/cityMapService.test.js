import { coordinates, listPois, listIssues, listRoutes, listPublicServices, getCityItem } from '../services/cityMapService';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedApi = require('../services/api').default;

describe('cityMapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('coordinates returns valid lat/lng', () => {
    expect(coordinates({ latitude: 10, longitude: 20 })).toEqual({ latitude: 10, longitude: 20 });
    expect(coordinates({ lat: 10, lng: 20 })).toEqual({ latitude: 10, longitude: 20 });
    expect(coordinates({ location: { latitude: 10, longitude: 20 } })).toEqual({ latitude: 10, longitude: 20 });
    expect(coordinates({})).toBeNull();
    expect(coordinates(null)).toBeNull();
  });

  test('listPois calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: { pois: [{ id: 1 }] } });
    const result = await listPois({ category: 'food', status: 'active', search: 'pizza', latitude: 10, longitude: 20, radiusKm: 5 });
    expect(mockedApi.get).toHaveBeenCalledWith('/city/pois', { params: { category: 'food', status: 'active', search: 'pizza', latitude: 10, longitude: 20, radiusKm: 5 } });
    expect(result).toEqual([{ id: 1 }]);
  });

  test('listIssues calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: { issues: [{ id: 2 }] } });
    const result = await listIssues({ category: 'safety' });
    expect(mockedApi.get).toHaveBeenCalledWith('/city/issues', { params: { category: 'safety' } });
    expect(result).toEqual([{ id: 2 }]);
  });

  test('listRoutes calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: { routes: [{ id: 3 }] } });
    const result = await listRoutes({ category: 'transport' });
    expect(mockedApi.get).toHaveBeenCalledWith('/city/routes', { params: { category: 'transport' } });
    expect(result).toEqual([{ id: 3 }]);
  });

  test('listPublicServices calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: { services: [{ id: 4 }] } });
    const result = await listPublicServices({ status: 'active' });
    expect(mockedApi.get).toHaveBeenCalledWith('/city/services', { params: { status: 'active' } });
    expect(result).toEqual([{ id: 4 }]);
  });

  test('getCityItem calls correct endpoint', async () => {
    mockedApi.get.mockResolvedValue({ data: { data: { id: 1, name: 'Test' } } });
    const result = await getCityItem('pois', '1');
    expect(mockedApi.get).toHaveBeenCalledWith('/city/pois/1');
    expect(result).toEqual({ id: 1, name: 'Test' });
  });

  test('listPois handles empty response', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });
    const result = await listPois();
    expect(result).toEqual([]);
  });
});
