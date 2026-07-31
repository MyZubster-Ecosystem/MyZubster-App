import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache:';
const DEFAULT_TTL_SECONDS = 60 * 5; // 5 minutes

function buildKey(key) {
  return `${CACHE_PREFIX}${key}`;
}

export async function getCache(key) {
  try {
    const raw = await AsyncStorage.getItem(buildKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry !== 'object') return null;
    const now = Date.now();
    if (typeof entry.expiresAt === 'number' && now > entry.expiresAt) {
      await AsyncStorage.removeItem(buildKey(key));
      return null;
    }
    return entry.value ?? null;
  } catch (error) {
    console.warn('[cacheService] getCache failed', error);
    return null;
  }
}

export async function setCache(key, data, ttlSeconds = DEFAULT_TTL_SECONDS) {
  try {
    const entry = {
      value: data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    await AsyncStorage.setItem(buildKey(key), JSON.stringify(entry));
    return true;
  } catch (error) {
    console.warn('[cacheService] setCache failed', error);
    return false;
  }
}

export async function removeCache(key) {
  try {
    await AsyncStorage.removeItem(buildKey(key));
    return true;
  } catch (error) {
    console.warn('[cacheService] removeCache failed', error);
    return false;
  }
}

export async function clearCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
    return true;
  } catch (error) {
    console.warn('[cacheService] clearCache failed', error);
    return false;
  }
}

export function isCacheExpired(entry) {
  if (!entry || typeof entry !== 'object') return true;
  const now = Date.now();
  if (typeof entry.expiresAt !== 'number') return false;
  return now > entry.expiresAt;
}

export function buildCacheKey(domain, ...parts) {
  return [domain, ...parts].filter(Boolean).join(':');
}
