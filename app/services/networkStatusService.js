import { getCache, setCache } from './cacheService';

const ONLINE_CACHE_KEY = 'networkStatus:lastOnline';
const DEFAULT_POLL_INTERVAL_MS = 10_000;
let currentStatus = null;
let listeners = new Set();
let pollTimer = null;

function emit(status) {
  currentStatus = status;
  listeners.forEach(fn => {
    try { fn(status); } catch (e) { /* noop */ }
  });
}

function normalizeStatus(raw) {
  if (typeof raw !== 'boolean') return null;
  return raw ? 'online' : 'offline';
}

export function addNetworkStatusListener(listener) {
  listeners.add(listener);
  if (currentStatus) listener(currentStatus);
  return () => listeners.delete(listener);
}

export async function fetchNetworkStatus() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function checkNetworkStatus() {
  const online = await fetchNetworkStatus();
  const status = normalizeStatus(online);
  if (!status) return currentStatus;
  const previous = currentStatus;
  if (previous !== status) {
    if (status === 'online') {
      await setCache(ONLINE_CACHE_KEY, Date.now(), 60 * 60);
    }
    emit(status);
  }
  return status;
}

export function getNetworkStatus() {
  return currentStatus;
}

export async function startNetworkPolling(intervalMs = DEFAULT_POLL_INTERVAL_MS) {
  if (pollTimer) return;
  await checkNetworkStatus();
  pollTimer = setInterval(() => {
    checkNetworkStatus().catch(() => { /* noop */ });
  }, intervalMs);
}

export async function stopNetworkPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export async function initNetworkStatus() {
  try {
    const lastOnline = await getCache(ONLINE_CACHE_KEY);
    if (lastOnline) {
      const age = Date.now() - Number(lastOnline);
      if (age < 60 * 1000) {
        emit('online');
        return;
      }
    }
  } catch (error) {
    // ignore cache read errors
  }
  await checkNetworkStatus();
}
