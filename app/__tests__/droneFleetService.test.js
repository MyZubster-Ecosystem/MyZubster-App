jest.mock('../services/api', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

import { getFleet, getFleetStats, sendMission, confirmResolution, isDroneFleetEndpointError } from '../services/droneFleetService';

describe('droneFleetService', () => {
  const mockFleetData = { data: [{ id: 1, name: 'Drone1', status: 'idle', battery: 80 }] };
  const mockStats = { data: { totalDrones: 5, activeMissions: 2, pending: 3 } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getFleet returns array of drones', async () => {
    const api = require('../services/api');
    api.get.mockResolvedValue(mockFleetData);
    const fleet = await getFleet();
    expect(Array.isArray(fleet)).toBe(true);
    expect(fleet).toEqual(mockFleetData.data);
  });

  test('getFleetStats returns stats object', async () => {
    const api = require('../services/api');
    api.get.mockResolvedValueOnce(mockStats);
    const stats = await getFleetStats();
    expect(stats).toEqual(mockStats.data);
  });

  test('sendMission sends correct payload', async () => {
    const api = require('../services/api');
    api.post.mockResolvedValueOnce({ data: { success: true } });
    const result = await sendMission({
      droneId: 'drone42',
      coordinates: { lat: 45.0, lng: 9.0 },
      priority: 'alta',
      missionType: 'ispezione',
      notes: 'Verifica danni',
    });
    expect(result).toEqual({ success: true });
    expect(api.post).toHaveBeenCalledWith('/fleet/missions', expect.objectContaining({
      droneId: 'drone42',
      coordinates: { lat: 45.0, lng: 9.0 },
      priority: 'alta',
      missionType: 'ispezione',
      notes: 'Verifica danni',
    }));
  });

  test('confirmResolution sends confirmation', async () => {
    const api = require('../services/api');
    api.post.mockResolvedValueOnce({ data: { success: true } });
    const result = await confirmResolution({ missionId: 'm99', droneId: 'drone42' });
    expect(result).toEqual({ success: true });
    expect(api.post).toHaveBeenCalledWith('/fleet/confirm', expect.objectContaining({
      missionId: 'm99',
      droneId: 'drone42',
    }));
  });

  test('isDroneFleetEndpointError identifies 404 and 501', () => {
    expect(isDroneFleetEndpointError({ response: { status: 404 } })).toBe(true);
    expect(isDroneFleetEndpointError({ response: { status: 501 } })).toBe(true);
    expect(isDroneFleetEndpointError({ response: { status: 500 } })).toBe(false);
    expect(isDroneFleetEndpointError({})).toBe(false);
  });
});