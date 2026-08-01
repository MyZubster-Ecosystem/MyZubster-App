import React from 'react';
import { act, create } from 'react-test-renderer';
import MunicipalReportsScreen from '../screens/MunicipalReportsScreen';
import api from '../services/api';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn() } }));

// Mock Alert from react-native
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  ActivityIndicator: 'ActivityIndicator',
  FlatList: 'FlatList',
  RefreshControl: 'RefreshControl',
  StyleSheet: { create: (styles) => styles },
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  Linking: { openURL: jest.fn(() => Promise.resolve()) },
  Share: { share: jest.fn(() => Promise.resolve()) },
  Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: 'file:///mock-cache/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true })),
  documentDirectory: 'file:///mock-documents/',
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: { apiUrl: 'http://test-api.example.com/api' },
    },
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const navigationMock = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  addListener: jest.fn(),
  canGoBack: jest.fn(() => true),
};

function findAllText(jsonNode, results = []) {
  if (!jsonNode) return results;
  if (typeof jsonNode === 'string' || typeof jsonNode === 'number') {
    results.push(String(jsonNode));
  } else if (Array.isArray(jsonNode)) {
    jsonNode.forEach(n => findAllText(n, results));
  } else if (typeof jsonNode === 'object' && jsonNode !== null) {
    if (jsonNode.children) {
      findAllText(jsonNode.children, results);
    }
  }
  return results;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('MunicipalReportsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without crashing (smoke test)', async () => {
    api.get.mockResolvedValueOnce({ data: { reports: [] } });

    await act(async () => {
      create(<MunicipalReportsScreen navigation={navigationMock} />);
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  test('renders loading indicator while fetching', () => {
    api.get.mockReturnValueOnce(new Promise(() => {}));

    const tree = create(<MunicipalReportsScreen navigation={navigationMock} />);
    const texts = findAllText(tree.toJSON());
    expect(texts.some(t => t.includes('Caricamento'))).toBe(true);
  });
});