jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('axios', () => ({
  create: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    defaults: { headers: { common: {} } },
    interceptors: { response: { use: jest.fn() } },
  }),
}));

import { exportCsv, exportGeojson, listSegnalazioni, getSegnalazione, updateSegnalazioneStatus, listInterventi, getMunicipalStats, listFleet } from '../services/segnalazioniService';

describe('municipal dashboard contract', () => {
  test('segnalazioni service exports expected methods', () => {
    expect(typeof listSegnalazioni).toBe('function');
    expect(typeof getSegnalazione).toBe('function');
    expect(typeof updateSegnalazioneStatus).toBe('function');
    expect(typeof listInterventi).toBe('function');
    expect(typeof getMunicipalStats).toBe('function');
    expect(typeof listFleet).toBe('function');
    expect(typeof exportCsv).toBe('function');
    expect(typeof exportGeojson).toBe('function');
  });

  test('exportCsv returns csv content and filename', () => {
    const items = [
      { id: '1', category: 'rifiuti', description: 'cassa, rotta', status: 'accepted', latitude: 41.9, longitude: 12.5, createdAt: '2026-01-01T00:00:00Z' },
    ];
    const result = exportCsv(items);
    expect(result.filename).toBe('segnalazioni.csv');
    expect(result.csv).toContain('id,categoria,descrizione,stato');
    expect(result.csv).toContain('1');
  });

  test('exportGeojson returns valid FeatureCollection', () => {
    const items = [
      { id: '1', category: 'rifiuti', description: 'cassa', status: 'accepted', latitude: 41.9, longitude: 12.5, createdAt: '2026-01-01T00:00:00Z' },
    ];
    const result = exportGeojson(items);
    expect(result.type).toBe('FeatureCollection');
    expect(result.features[0].geometry.coordinates).toEqual([12.5, 41.9]);
  });
});
