jest.mock('@react-native-async-storage/async-storage');

const AsyncStorage = require('@react-native-async-storage/async-storage');
const cacheService = require('../services/cacheService');
const offlineQueue = require('../services/offlineQueue');

describe('offline support contracts', () => {
  beforeEach(() => {
    AsyncStorage.__reset?.();
  });

  describe('cacheService', () => {
    test('buildCacheKey constructs stable keys', () => {
      const { buildCacheKey } = cacheService;
      expect(buildCacheKey('tokens', 'list')).toBe('tokens:list');
      expect(buildCacheKey('portfolio')).toBe('portfolio');
      expect(buildCacheKey('orders', 'recent')).toBe('orders:recent');
      expect(buildCacheKey('', 'a')).toBe('a');
    });

    test('setCache and getCache roundtrip', async () => {
      await cacheService.setCache('user:1', { name: 'Alice' }, 60);
      const data = await cacheService.getCache('user:1');
      expect(data).toEqual({ name: 'Alice' });
    });

    test('getCache returns null after TTL expiry', async () => {
      await cacheService.setCache('expiring', { value: 1 }, 0.001);
      await new Promise(resolve => setTimeout(resolve, 20));
      const data = await cacheService.getCache('expiring');
      expect(data).toBeNull();
    });

    test('removeCache and clearCache work', async () => {
      await cacheService.setCache('a', 1, 60);
      await cacheService.setCache('b', 2, 60);
      await cacheService.removeCache('a');
      expect(await cacheService.getCache('a')).toBeNull();
      expect(await cacheService.getCache('b')).toEqual(2);
      await cacheService.clearCache();
      expect(await cacheService.getCache('b')).toBeNull();
    });

    test('isCacheExpired detects expiry correctly', () => {
      const fresh = { expiresAt: Date.now() + 1000 };
      const expired = { expiresAt: Date.now() - 1000 };
      const noExpiry = { value: 1 };
      expect(cacheService.isCacheExpired(fresh)).toBe(false);
      expect(cacheService.isCacheExpired(expired)).toBe(true);
      expect(cacheService.isCacheExpired(noExpiry)).toBe(false);
      expect(cacheService.isCacheExpired(null)).toBe(true);
    });
  });

  describe('offlineQueue', () => {
    test('enqueue adds item and getPendingCount counts pending/replaying', async () => {
      const a = await offlineQueue.enqueue({ action: 'createOrder', payload: { skillId: 1 } });
      const b = await offlineQueue.enqueue({ action: 'sendPayment', payload: { address: 'x' } });
      expect(a.id).toBeDefined();
      expect(b.id).toBeDefined();
      expect(await offlineQueue.getPendingCount()).toBe(2);
    });

    test('markCompleted removes item from pending count', async () => {
      const a = await offlineQueue.enqueue({ action: 'createOrder' });
      await offlineQueue.markCompleted(a.id);
      expect(await offlineQueue.getPendingCount()).toBe(0);
    });

    test('markConflict preserves item and sets conflict flag', async () => {
      const a = await offlineQueue.enqueue({ action: 'createOrder' });
      const updated = await offlineQueue.markConflict(a.id, 'v2');
      expect(updated.conflict).toBe(true);
      expect(updated.serverVersion).toBe('v2');
      expect(await offlineQueue.getPendingCount()).toBe(1);
    });

    test('markFailed sets status and error', async () => {
      const a = await offlineQueue.enqueue({ action: 'createOrder' });
      const updated = await offlineQueue.markFailed(a.id, 'network');
      expect(updated.status).toBe('failed');
      expect(updated.lastError).toBe('network');
    });

    test('replayQueue executes pending items via replayItem', async () => {
      await offlineQueue.enqueue({ action: 'createOrder', payload: { skillId: 1 } });
      const results = [];
      await offlineQueue.replayQueue(async item => {
        results.push(item.action);
        return { conflict: false };
      });
      expect(results).toEqual(['createOrder']);
      expect(await offlineQueue.getPendingCount()).toBe(0);
    });

    test('clearQueue empties storage', async () => {
      await offlineQueue.enqueue({ action: 'createOrder' });
      await offlineQueue.clearQueue();
      expect(await offlineQueue.getPendingCount()).toBe(0);
    });
  });
});
