import {
  POI_CATEGORIES,
  VERIFICATION_THRESHOLD,
  createPoi,
  listPois,
  getPoi,
  votePoi,
  getPendingVerifications,
  poiVerificationProgress,
} from '../services/poiService';

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
import api from '../services/api';

describe('poiService contract', () => {
  test('exports POI registration API functions and categories', () => {
    expect(typeof createPoi).toBe('function');
    expect(typeof listPois).toBe('function');
    expect(typeof getPoi).toBe('function');
    expect(typeof votePoi).toBe('function');
    expect(typeof getPendingVerifications).toBe('function');
    expect(typeof poiVerificationProgress).toBe('function');
    expect(POI_CATEGORIES).toEqual(
      expect.arrayContaining(['parks', 'schools', 'hospitals', 'transport', 'monuments', 'commercial']),
    );
    expect(VERIFICATION_THRESHOLD).toBe(2);
  });

  test('createPoi posts to /pois with the issue payload and caps photos at 5', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { id: 'poi-1' } } });
    const out = await createPoi({ name: 'Parco', category: 'parks', description: 'desc', latitude: '41.9', longitude: '12.5', photos: [1, 2, 3, 4, 5, 6] });
    expect(api.post).toHaveBeenCalledWith('/pois', expect.objectContaining({
      name: 'Parco', category: 'parks', description: 'desc',
      latitude: 41.9, longitude: 12.5, photos: [1, 2, 3, 4, 5],
    }));
    expect(out).toEqual({ id: 'poi-1' });
  });

  test('listPois builds geo/category query params and returns an array', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [{ id: 'poi-1' }] } });
    const out = await listPois({ category: 'parks', latitude: 41.9, longitude: 12.5, radiusKm: 10 });
    expect(api.get).toHaveBeenCalledWith('/pois', { params: { category: 'parks', latitude: 41.9, longitude: 12.5, radiusKm: 10 } });
    expect(Array.isArray(out)).toBe(true);
  });

  test('listPois omits params when defaults are used', async () => {
    api.get.mockResolvedValueOnce({ data: { pois: [] } });
    await listPois({ category: 'all' });
    const call = api.get.mock.calls[api.get.mock.calls.length - 1];
    expect(call[0]).toBe('/pois');
    expect(call[1].params).toEqual({});
  });

  test('getPendingVerifications hits /pois/pending', async () => {
    api.get.mockResolvedValueOnce({ data: { data: [{ id: 'poi-2', status: 'pending' }] } });
    const out = await getPendingVerifications();
    expect(api.get).toHaveBeenCalledWith('/pois/pending');
    expect(out.length).toBe(1);
  });

  test('votePoi posts a verdict to the POI vote endpoint', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { status: 'verified' } } });
    await votePoi('poi-2', 'approve');
    expect(api.post).toHaveBeenCalledWith('/pois/poi-2/vote', { verdict: 'approve' });
  });

  test('poiVerificationProgress counts approvals and flags verified', () => {
    expect(poiVerificationProgress({ verifications: [{ verdict: 'approve' }, { verdict: 'approve' }] })).toEqual(
      expect.objectContaining({ approvals: 2, required: 2, verified: true }),
    );
    expect(poiVerificationProgress({ approvals: 1 }).verified).toBe(false);
    expect(poiVerificationProgress({ status: 'verified' }).verified).toBe(true);
    expect(poiVerificationProgress().approvals).toBe(0);
  });
});
