import AsyncStorage from '@react-native-async-storage/async-storage';

const PIN_KEY = '@MyZubster:walletPinHash';
const PIN_LOCK_KEY = '@MyZubster:walletPinLock';
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 60;

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let hex = Math.abs(hash).toString(16);
  while (hex.length < 16) hex = '0' + hex;
  return hex;
}

function normalizePin(pin) {
  const trimmed = String(pin || '').trim();
  if (!/^\d{4,6}$/.test(trimmed)) throw new Error('Il PIN deve essere compreso tra 4 e 6 cifre.');
  return trimmed;
}

export async function isPinSet() {
  const stored = await AsyncStorage.getItem(PIN_KEY);
  return Boolean(stored);
}

export async function setPin(pin) {
  const normalized = normalizePin(pin);
  await AsyncStorage.setItem(PIN_KEY, hashString(normalized));
  await clearLock();
  return true;
}

export async function verifyPin(pin) {
  const stored = await AsyncStorage.getItem(PIN_KEY);
  if (!stored) return { ok: true, locked: false };
  const lockUntil = await getLockUntil();
  if (lockUntil && Date.now() < lockUntil) {
    return { ok: false, locked: true, remainingMs: lockUntil - Date.now() };
  }
  const normalized = String(pin || '').trim();
  if (hashString(normalized) === stored) {
    await clearLock();
    return { ok: true, locked: false };
  }
  await registerFailedAttempt();
  const remaining = await getRemainingAttempts();
  if (remaining <= 0) {
    const until = Date.now() + LOCK_SECONDS * 1000;
    await AsyncStorage.setItem(PIN_LOCK_KEY, String(until));
    return { ok: false, locked: true, remainingMs: LOCK_SECONDS * 1000 };
  }
  return { ok: false, locked: false, remaining };
}

export async function removePin() {
  await AsyncStorage.removeItem(PIN_KEY);
  await clearLock();
}

export async function getRemainingAttempts() {
  const stored = await AsyncStorage.getItem(PIN_LOCK_KEY);
  if (!stored) return MAX_ATTEMPTS;
  const attempts = Number(stored);
  if (Number.isFinite(attempts)) return Math.max(0, attempts);
  return MAX_ATTEMPTS;
}

export async function getLockUntil() {
  const stored = await AsyncStorage.getItem(PIN_LOCK_KEY);
  if (!stored) return null;
  const until = Number(stored);
  if (!Number.isFinite(until)) return null;
  if (Date.now() >= until) {
    await clearLock();
    return null;
  }
  return until;
}

async function registerFailedAttempt() {
  const current = await getRemainingAttempts();
  const next = Math.max(0, current - 1);
  if (next <= 0) {
    const until = Date.now() + LOCK_SECONDS * 1000;
    await AsyncStorage.setItem(PIN_LOCK_KEY, String(until));
  } else {
    await AsyncStorage.setItem(PIN_LOCK_KEY, String(next));
  }
}

async function clearLock() {
  await AsyncStorage.removeItem(PIN_LOCK_KEY);
}

export { hashString, normalizePin };
