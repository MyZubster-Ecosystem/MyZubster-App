import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_PREFERENCES_KEY } from './notificationPreferences';

export { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_PREFERENCES_KEY } from './notificationPreferences';

export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications() {
  if (!Device.isDevice) throw new Error('Push notifications require a physical device.');
  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') throw new Error('Notification permission was not granted.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return token.data;
}

export async function registerDeviceToken(token) {
  try {
    await api.post('/notifications/devices', { token, platform: Device.osName || 'unknown' });
  } catch (error) {
    if (![404, 405, 501].includes(error.response?.status)) throw error;
    await api.post('/notifications/token', { token, platform: Device.osName || 'unknown' });
  }
}

export async function listNotifications() {
  const { data } = await api.get('/notifications');
  const result = data?.data ?? data;
  return Array.isArray(result) ? result : result?.notifications || [];
}

export async function markNotificationRead(id) {
  try {
    await api.put(`/notifications/${encodeURIComponent(id)}/read`);
  } catch (error) {
    if (error.response?.status !== 404) throw error;
    await api.post(`/notifications/${encodeURIComponent(id)}/read`);
  }
}

export async function markAllNotificationsRead() {
  await api.put('/notifications/read-all');
}

export async function loadNotificationPreferences() {
  const stored = await AsyncStorage.getItem(NOTIFICATION_PREFERENCES_KEY);
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(stored ? JSON.parse(stored) : {}) };
}

export async function saveNotificationPreferences(preferences) {
  await AsyncStorage.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(preferences));
  try {
    await api.put('/notifications/preferences', preferences);
  } catch (error) {
    if (![404, 405, 501].includes(error.response?.status)) throw error;
  }
  return preferences;
}
