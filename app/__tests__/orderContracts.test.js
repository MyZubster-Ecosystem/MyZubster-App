import { formatRemaining } from '../hooks/usePaymentCountdown';
import { deriveWsUrl } from '../services/orderSocket';

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}));

const mockAxiosInstance = {
  defaults: { headers: { common: {} } },
  interceptors: { response: { use: jest.fn() } },
  put: jest.fn(() => Promise.resolve({ data: { id: '1', status: 'cancelled' } })),
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

describe('order payment contracts', () => {
  test('formatRemaining returns mm:ss for positive milliseconds', () => {
    expect(formatRemaining(125000)).toBe('02:05');
    expect(formatRemaining(59000)).toBe('00:59');
    expect(formatRemaining(3600000)).toBe('60:00');
  });

  test('formatRemaining clamps negatives to 00:00', () => {
    expect(formatRemaining(-1)).toBe('00:00');
    expect(formatRemaining(0)).toBe('00:00');
  });

  test('deriveWsUrl converts http API to ws and appends order path', () => {
    expect(deriveWsUrl('http://192.168.1.10:3000/api', '123')).toBe('ws://192.168.1.10:3000/orders/123');
    expect(deriveWsUrl('https://example.com/api', 'abc-1')).toBe('wss://example.com/orders/abc-1');
    expect(deriveWsUrl('http://example.com:4000', 'x')).toBe('ws://example.com:4000/orders/x');
  });

  test('deriveWsUrl rejects invalid apiUrl', () => {
    expect(() => deriveWsUrl('', '1')).toThrow('Invalid API_URL for WebSocket');
  });
});

describe('orderService cancel contract', () => {
  test('cancelOrder hits /orders/:id/cancel', async () => {
    const { cancelOrder } = require('../services/orderService');
    await expect(cancelOrder('1')).resolves.toEqual({ id: '1', status: 'cancelled' });
    const axios = require('axios');
    const mocked = axios.create();
    expect(mocked.put).toHaveBeenCalledWith('/orders/1/cancel');
  });
});
