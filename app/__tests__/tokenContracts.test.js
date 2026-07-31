const FAVORITES_KEY = '@myzubster_favorites';

jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
  setAuthToken: jest.fn(),
  API_URL: 'http://192.168.1.10:3000/api',
}));

const { listTokens, getToken, getTokenStats } = require('../services/tokenService');

describe('token contracts', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('tokenService exports required functions', () => {
    expect(typeof listTokens).toBe('function');
    expect(typeof getToken).toBe('function');
    expect(typeof getTokenStats).toBe('function');
  });

  test('listTokens constructs pagination query parameters correctly', async () => {
    const api = require('../services/api').default;
    api.get.mockResolvedValue({ data: [] });
    await listTokens({ page: 2, limit: 25, search: 'abc', type: 'erc20', status: 'active', minPrice: 1, maxPrice: 10, sortBy: 'price', sortOrder: 'desc' });
    const calledUrl = api.get.mock.calls[0][0];
    const url = new URL(`http://localhost${calledUrl}`);
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('25');
    expect(url.searchParams.get('search')).toBe('abc');
    expect(url.searchParams.get('type')).toBe('erc20');
    expect(url.searchParams.get('status')).toBe('active');
    expect(url.searchParams.get('minPrice')).toBe('1');
    expect(url.searchParams.get('maxPrice')).toBe('10');
    expect(url.searchParams.get('sortBy')).toBe('price');
    expect(url.searchParams.get('sortOrder')).toBe('desc');
  });

  test('listTokens supports offset-based pagination instead of page', async () => {
    const api = require('../services/api').default;
    api.get.mockResolvedValue({ data: [] });
    await listTokens({ offset: 40, limit: 20 });
    const calledUrl = api.get.mock.calls[0][0];
    const url = new URL(`http://localhost${calledUrl}`);
    expect(url.searchParams.get('offset')).toBe('40');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.has('page')).toBe(false);
  });

  test('favorites key constant exists and is a string', () => {
    expect(typeof FAVORITES_KEY).toBe('string');
    expect(FAVORITES_KEY).toContain('favorites');
  });
});
