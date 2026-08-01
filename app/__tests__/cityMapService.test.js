import { fetchPois, fetchIssues, fetchRoutes, fetchPublicServices, searchLocation, fetchPoiDetail, fetchIssueDetail, fetchRouteDetail, fetchPublicServiceDetail } from '../services/cityMapService';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn() } }));

import api from '../services/api';

describe('cityMapService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchPois', () => {
    it('should fetch POIs with default params', async () => {
      const mockData = [{ id: 1, title: 'Test POI', category: 'restaurant', latitude: 41.9, longitude: 12.5 }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchPois();

      expect(api.get).toHaveBeenCalledWith('/city-map/pois', { params: {} });
      expect(result).toEqual(mockData);
    });

    it('should fetch POIs with custom params', async () => {
      const mockData = [{ id: 1, title: 'Test POI', category: 'cafe', latitude: 41.9, longitude: 12.5 }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchPois({ category: 'cafe', latitude: 41.9, longitude: 12.5, radius: 1000 });

      expect(api.get).toHaveBeenCalledWith('/city-map/pois', {
        params: { category: 'cafe', latitude: 41.9, longitude: 12.5, radius: 1000 },
      });
      expect(result).toEqual(mockData);
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      error.response = { data: { error: 'Failed to fetch POIs' } };
      api.get.mockRejectedValue(error);

      await expect(fetchPois()).rejects.toThrow('Network error');
    });
  });

  describe('fetchIssues', () => {
    it('should fetch issues with default params', async () => {
      const mockData = [{ id: 1, title: 'Test Issue', status: 'open', latitude: 41.9, longitude: 12.5 }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchIssues();

      expect(api.get).toHaveBeenCalledWith('/city-map/issues', { params: {} });
      expect(result).toEqual(mockData);
    });

    it('should fetch issues with status filter', async () => {
      const mockData = [{ id: 1, title: 'Test Issue', status: 'resolved', latitude: 41.9, longitude: 12.5 }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchIssues({ status: 'resolved' });

      expect(api.get).toHaveBeenCalledWith('/city-map/issues', {
        params: { status: 'resolved' },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchRoutes', () => {
    it('should fetch routes', async () => {
      const mockData = [{ id: 1, title: 'Test Route', coordinates: [[41.9, 12.5], [41.91, 12.51]] }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchRoutes();

      expect(api.get).toHaveBeenCalledWith('/city-map/routes', { params: {} });
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchPublicServices', () => {
    it('should fetch public services', async () => {
      const mockData = [{ id: 1, title: 'Hospital', category: 'hospital', latitude: 41.9, longitude: 12.5 }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchPublicServices();

      expect(api.get).toHaveBeenCalledWith('/city-map/public-services', { params: {} });
      expect(result).toEqual(mockData);
    });
  });

  describe('searchLocation', () => {
    it('should search location with query', async () => {
      const mockData = [{ id: 1, title: 'Rome', latitude: 41.9028, longitude: 12.4964 }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await searchLocation('Rome');

      expect(api.get).toHaveBeenCalledWith('/city-map/search', {
        params: { q: 'Rome' },
      });
      expect(result).toEqual(mockData);
    });

    it('should search location with additional params', async () => {
      const mockData = [{ id: 1, title: 'Rome Center', latitude: 41.9028, longitude: 12.4964 }];
      api.get.mockResolvedValue({ data: mockData });

      const result = await searchLocation('Rome', { category: 'pois' });

      expect(api.get).toHaveBeenCalledWith('/city-map/search', {
        params: { q: 'Rome', category: 'pois' },
      });
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchPoiDetail', () => {
    it('should fetch POI detail by id', async () => {
      const mockData = { id: 1, title: 'Test POI', description: 'Details' };
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchPoiDetail(1);

      expect(api.get).toHaveBeenCalledWith('/city-map/pois/1');
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchIssueDetail', () => {
    it('should fetch issue detail by id', async () => {
      const mockData = { id: 1, title: 'Test Issue', description: 'Details', status: 'open' };
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchIssueDetail(1);

      expect(api.get).toHaveBeenCalledWith('/city-map/issues/1');
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchRouteDetail', () => {
    it('should fetch route detail by id', async () => {
      const mockData = { id: 1, title: 'Test Route', coordinates: [] };
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchRouteDetail(1);

      expect(api.get).toHaveBeenCalledWith('/city-map/routes/1');
      expect(result).toEqual(mockData);
    });
  });

  describe('fetchPublicServiceDetail', () => {
    it('should fetch public service detail by id', async () => {
      const mockData = { id: 1, title: 'Hospital', description: 'Details' };
      api.get.mockResolvedValue({ data: mockData });

      const result = await fetchPublicServiceDetail(1);

      expect(api.get).toHaveBeenCalledWith('/city-map/public-services/1');
      expect(result).toEqual(mockData);
    });
  });
});