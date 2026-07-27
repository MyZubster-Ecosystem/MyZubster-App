import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const SETTINGS_KEY = '@MyZubster:notificationSettings';
const HISTORY_KEY = '@MyZubster:notificationHistory';
const TOKEN_KEY = '@MyZubster:pushToken';

export const NOTIFICATION_TYPES = {
  order_confirmed: 'Order Confirmed',
  order_completed: 'Order Completed',
  order_cancelled: 'Order Cancelled',
  payment_reminder: 'Payment Reminder',
  dividend_received: 'Dividend Received',
  token_listing: 'Token Listing',
  price_alert: 'Price Alert',
};

const DEFAULT_SETTINGS = Object.keys(NOTIFICATION_TYPES).reduce((acc, key) => {
  acc[key] = true;
  return acc;
}, { enabled: true });

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Order updates',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF6B00',
  });
  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getNotificationSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveNotificationSettings(settings) {
  const next = { ...DEFAULT_SETTINGS, ...settings };
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

export async function getNotificationHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearNotificationHistory() {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

async function pushHistory(entry) {
  const history = await getNotificationHistory();
  const next = [{ id: String(Date.now()), read: false, createdAt: new Date().toISOString(), ...entry }, ...history].slice(0, 100);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function markNotificationRead(id) {
  const history = await getNotificationHistory();
  const next = history.map((item) => (item.id === id ? { ...item, read: true } : item));
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function getUnreadCount() {
  const history = await getNotificationHistory();
  return history.filter((item) => !item.read).length;
}

function mapRemoteMessage(remoteMessage = {}) {
  const data = remoteMessage.data || {};
  const type = data.type || remoteMessage.type || 'order_confirmed';
  return {
    type,
    title: remoteMessage.title || remoteMessage.notification?.title || NOTIFICATION_TYPES[type] || 'MyZubster',
    body: remoteMessage.body || remoteMessage.notification?.body || '',
    deepLink: data.deepLink || data.screen || null,
    orderId: data.orderId || null,
    raw: remoteMessage,
  };
}

export async function handleIncomingNotification(remoteMessage, { fromBackground = false } = {}) {
  const settings = await getNotificationSettings();
  const mapped = mapRemoteMessage(remoteMessage);
  if (!settings.enabled) return null;
  if (mapped.type && settings[mapped.type] === false) return null;

  await pushHistory({ ...mapped, fromBackground });

  if (!fromBackground) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: mapped.title,
        body: mapped.body,
        data: {
          type: mapped.type,
          deepLink: mapped.deepLink,
          orderId: mapped.orderId,
        },
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: mapped.type?.startsWith('order') ? 'orders' : 'default' } : {}),
      },
      trigger: null,
    });
  }

  return mapped;
}

export async function registerForPushNotificationsAsync() {
  await ensureAndroidChannel();

  const settings = await getNotificationSettings();
  if (!settings.enabled) {
    return { status: 'disabled', token: null };
  }

  const current = await Notifications.getPermissionsAsync();
  let finalStatus = current.status;
  if (finalStatus !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    finalStatus = asked.status;
  }

  if (finalStatus !== 'granted') {
    return { status: finalStatus, token: null };
  }

  // Expo push token works with FCM on Android when project is configured.
  // For bare FCM token workflows, replace this block with messaging().getToken().
  let token = null;
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    token = tokenResponse.data;
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.warn('Push token registration failed:', error?.message || error);
  }

  return { status: finalStatus, token };
}

export async function getStoredPushToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export function attachNotificationListeners({ onNavigate } = {}) {
  const receivedSub = Notifications.addNotificationReceivedListener(async (notification) => {
    const content = notification.request.content;
    await handleIncomingNotification({
      title: content.title,
      body: content.body,
      data: content.data,
    });
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    if (typeof onNavigate === 'function') {
      onNavigate(data);
    }
  });

  // Background-style handler shim for FCM parity docs/tests.
  // In Firebase messaging this maps to setBackgroundMessageHandler.
  const backgroundHandler = async (remoteMessage) => {
    await handleIncomingNotification(remoteMessage, { fromBackground: true });
  };

  return {
    remove() {
      receivedSub.remove();
      responseSub.remove();
    },
    backgroundHandler,
  };
}

// FCM-shaped helpers requested by the bounty description.
export async function setupNotifications() {
  const permission = await registerForPushNotificationsAsync();
  return permission;
}

export default {
  NOTIFICATION_TYPES,
  setupNotifications,
  registerForPushNotificationsAsync,
  attachNotificationListeners,
  handleIncomingNotification,
  getNotificationSettings,
  saveNotificationSettings,
  getNotificationHistory,
  clearNotificationHistory,
  markNotificationRead,
  getUnreadCount,
  getStoredPushToken,
};
