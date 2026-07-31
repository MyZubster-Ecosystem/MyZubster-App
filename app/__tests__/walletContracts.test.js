import { hashString, normalizePin, isPinSet, setPin, verifyPin, removePin, getRemainingAttempts } from '../services/walletPinService';
import { createReceiveAddress, getWallet, getWalletTransactions, listAddresses, getNetworkStatus, sendPayment, isWalletEndpointError } from '../services/walletService';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApiGet = require('../services/api').default.get;
const mockApiPost = require('../services/api').default.post;

jest.mock('@react-native-async-storage/async-storage');

describe('walletPinService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
  });

  test('hashString is deterministic', () => {
    expect(hashString('1234')).toBe(hashString('1234'));
    expect(hashString('abcd')).toBe(hashString('abcd'));
    expect(hashString('')).toBe(hashString(''));
  });

  test('hashString returns a hex string', () => {
    expect(typeof hashString('1234')).toBe('string');
    expect(hashString('1234').length).toBeGreaterThanOrEqual(4);
  });

  test('normalizePin accepts 4-6 digit strings', () => {
    expect(normalizePin('1234')).toBe('1234');
    expect(normalizePin('000000')).toBe('000000');
    expect(normalizePin(' 1234 ')).toBe('1234');
  });

  test('normalizePin rejects invalid lengths', () => {
    expect(() => normalizePin('123')).toThrow();
    expect(() => normalizePin('1234567')).toThrow();
    expect(() => normalizePin('abcd')).toThrow();
    expect(() => normalizePin('12a4')).toThrow();
  });

  test('setPin stores hashed value', async () => {
    AsyncStorage.getItem.mockResolvedValue(null);
    await setPin('123456');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@MyZubster:walletPinHash', hashString('123456'));
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@MyZubster:walletPinLock');
  });

  test('verifyPin succeeds with matching PIN', async () => {
    AsyncStorage.getItem.mockImplementation(key => {
      if (key === '@MyZubster:walletPinHash') return Promise.resolve(hashString('123456'));
      if (key === '@MyZubster:walletPinLock') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    const result = await verifyPin('123456');
    expect(result.ok).toBe(true);
    expect(result.locked).toBe(false);
  });

  test('verifyPin rejects wrong PIN', async () => {
    AsyncStorage.getItem.mockImplementation(key => {
      if (key === '@MyZubster:walletPinHash') return Promise.resolve(hashString('123456'));
      if (key === '@MyZubster:walletPinLock') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    const result = await verifyPin('000000');
    expect(result.ok).toBe(false);
    expect(result.locked).toBe(false);
    expect(typeof result.remaining).toBe('number');
  });

  test('removePin clears stored hash', async () => {
    await removePin();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@MyZubster:walletPinHash');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@MyZubster:walletPinLock');
  });
});

describe('walletService', () => {
  beforeEach(() => {
    mockApiGet.mockClear();
    mockApiPost.mockClear();
  });

  test('getWallet calls /wallet', async () => {
    mockApiGet.mockResolvedValue({ data: { balance: 1 } });
    const result = await getWallet();
    expect(mockApiGet).toHaveBeenCalledWith('/wallet');
    expect(result).toEqual({ balance: 1 });
  });

  test('getWalletTransactions returns transactions array or fallback', async () => {
    mockApiGet.mockResolvedValue({ data: [{ txid: 'abc' }] });
    expect(await getWalletTransactions()).toEqual([{ txid: 'abc' }]);

    mockApiGet.mockResolvedValue({ data: { transactions: [{ txid: 'def' }] } });
    expect(await getWalletTransactions()).toEqual([{ txid: 'def' }]);
  });

  test('createReceiveAddress posts label', async () => {
    mockApiPost.mockResolvedValue({ data: { address: '4xxx' } });
    const result = await createReceiveAddress('label-1');
    expect(mockApiPost).toHaveBeenCalledWith('/wallet/address', { label: 'label-1' });
    expect(result.address).toBe('4xxx');
  });

  test('sendPayment posts amount and address', async () => {
    mockApiPost.mockResolvedValue({ data: { txid: 'send1' } });
    const result = await sendPayment({ address: '4abc', amount: '0.01' });
    expect(mockApiPost).toHaveBeenCalledWith('/wallet/transfer', { address: '4abc', amount: 0.01 });
    expect(result.txid).toBe('send1');
  });

  test('listAddresses returns normalized array', async () => {
    mockApiGet.mockResolvedValue({ data: [{ address: '4abc', label: 'main' }] });
    expect(await listAddresses()).toEqual([{ address: '4abc', label: 'main', primary: false }]);
  });

  test('listAddresses returns [] on 404', async () => {
    mockApiGet.mockRejectedValue({ response: { status: 404 } });
    expect(await listAddresses()).toEqual([]);
  });

  test('getNetworkStatus prefers /wallet/network', async () => {
    mockApiGet
      .mockResolvedValueOnce({ data: { network: 'mainnet', height: 12345 } })
      .mockResolvedValueOnce({ data: { balance: 0 } });

    const result = await getNetworkStatus();
    expect(result.source).toBe('wallet/network');
    expect(result.height).toBe(12345);
  });

  test('isWalletEndpointError detects 404 and 501', () => {
    expect(isWalletEndpointError({ response: { status: 404 } })).toBe(true);
    expect(isWalletEndpointError({ response: { status: 501 } })).toBe(true);
    expect(isWalletEndpointError({ response: { status: 500 } })).toBe(false);
  });
});

describe('Monero address format', () => {
  test('prefix 4 addresses match pattern', () => {
    expect(/^[48][1-9A-HJ-NP-Za-km-z]{90,}$/.test('4'.padEnd(95, 'A'))).toBe(true);
  });

  test('prefix 8 addresses match pattern', () => {
    expect(/^[48][1-9A-HJ-NP-Za-km-z]{90,}$/.test('8'.padEnd(95, 'B'))).toBe(true);
  });

  test('invalid prefixes do not match', () => {
    expect(/^[48][1-9A-HJ-NP-Za-km-z]{90,}$/.test('5'.padEnd(95, 'A'))).toBe(false);
    expect(/^[48][1-9A-HJ-NP-Za-km-z]{90,}$/.test('')).toBe(false);
  });
});
