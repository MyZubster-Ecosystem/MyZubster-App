import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = '@cache_';
const PENDING_PREFIX = '@pending_';
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

let isOnline = true;
NetInfo.addEventListener(state => { isOnline = state.isConnected; });

export const cacheData = async (key, data) => {
  const entry = { data, timestamp: Date.now() };
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
};

export const getCachedData = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_EXPIRY) { await AsyncStorage.removeItem(CACHE_PREFIX + key); return null; }
    return data;
  } catch { return null; }
};

export const fetchWithCache = async (url, options = {}, cacheKey = null) => {
  const key = cacheKey || url;
  if (!isOnline) {
    const cached = await getCachedData(key);
    if (cached) return { data: cached, fromCache: true };
    return { error: 'Offline — no cached data available' };
  }
  try {
    const resp = await fetch(url, options);
    const data = await resp.json();
    if (resp.ok) await cacheData(key, data);
    return { data, fromCache: false };
  } catch {
    const cached = await getCachedData(key);
    return cached ? { data: cached, fromCache: true } : { error: 'Network error' };
  }
};

export const queueAction = async (action) => {
  const pending = await getPendingActions();
  pending.push({ ...action, queuedAt: Date.now() });
  await AsyncStorage.setItem(PENDING_PREFIX + 'queue', JSON.stringify(pending));
};

export const getPendingActions = async () => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_PREFIX + 'queue');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const processPendingActions = async () => {
  if (!isOnline) return;
  const pending = await getPendingActions();
  const remaining = [];
  for (const action of pending) {
    try {
      const resp = await fetch(action.url, { method: action.method || 'POST', headers: action.headers || {}, body: action.body });
      if (!resp.ok) remaining.push(action);
    } catch { remaining.push(action); }
  }
  await AsyncStorage.setItem(PENDING_PREFIX + 'queue', JSON.stringify(remaining));
};

export const clearCache = async () => {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  await AsyncStorage.multiRemove(cacheKeys);
};
