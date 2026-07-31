import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offlineQueue';
const MAX_RETRY_COUNT = 3;

function now() {
  return Date.now();
}

export async function loadQueue() {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    console.warn('[offlineQueue] loadQueue failed', error);
    return [];
  }
}

export async function saveQueue(queue) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch (error) {
    console.warn('[offlineQueue] saveQueue failed', error);
    return false;
  }
}

export async function enqueue(action) {
  const queue = await loadQueue();
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    action: action.action || 'unknown',
    payload: action.payload || {},
    createdAt: now(),
    updatedAt: now(),
    retries: 0,
    conflict: false,
    serverVersion: null,
    status: 'pending',
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

export async function dequeue(id) {
  const queue = await loadQueue();
  const next = queue.filter(item => item.id !== id);
  await saveQueue(next);
}

export async function markReplaying(id) {
  const queue = await loadQueue();
  const item = queue.find(i => i.id === id);
  if (!item) return null;
  item.status = 'replaying';
  item.updatedAt = now();
  await saveQueue(queue);
  return item;
}

export async function markCompleted(id) {
  const queue = await loadQueue();
  const next = queue.filter(item => item.id !== id);
  await saveQueue(next);
}

export async function markFailed(id, reason) {
  const queue = await loadQueue();
  const item = queue.find(i => i.id === id);
  if (!item) return null;
  item.status = 'failed';
  item.updatedAt = now();
  item.lastError = reason;
  await saveQueue(queue);
  return item;
}

export async function markConflict(id, serverVersion) {
  const queue = await loadQueue();
  const item = queue.find(i => i.id === id);
  if (!item) return null;
  item.conflict = true;
  item.serverVersion = serverVersion;
  item.updatedAt = now();
  item.status = 'conflict';
  await saveQueue(queue);
  return item;
}

export async function clearQueue() {
  await saveQueue([]);
}

export async function replayQueue(replayItem) {
  const queue = await loadQueue();
  const pending = queue.filter(item => item.status === 'pending' || item.status === 'replaying');
  for (const item of pending) {
    try {
      await markReplaying(item.id);
      const result = await replayItem(item);
      if (result && result.conflict) {
        await markConflict(item.id, result.serverVersion);
      } else {
        await markCompleted(item.id);
      }
    } catch (error) {
      const retries = (await loadQueue()).find(i => i.id === item.id)?.retries ?? item.retries;
      if (retries + 1 >= MAX_RETRY_COUNT) {
        await markFailed(item.id, error?.message || String(error));
      } else {
        await markFailed(item.id, error?.message || String(error));
      }
    }
  }
}

export async function getPendingCount() {
  const queue = await loadQueue();
  return queue.filter(item => ['pending', 'replaying', 'conflict'].includes(item.status)).length;
}
