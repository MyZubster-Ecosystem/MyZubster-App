// app/services/notificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const NOTIFICATION_HISTORY_KEY = '@MyZubster:notificationHistory';
const NOTIFICATION_SETTINGS_KEY = '@MyZubster:notificationSettings';
const PUSH_TOKEN_KEY = '@MyZubster:pushToken';

// Default settings: all notification types enabled
const DEFAULT_SETTINGS = {
  orderConfirmed: true,
  orderCompleted: true,
  orderCancelled: true,
  paymentReminder: true,
  dividendReceived: true,
  tokenListing: true,
  priceAlert: true,
};

/**
 * Configure how notifications are displayed when the app is foregrounded
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and register for push notifications
 * Returns the Expo push token if successful
 */
export async function setupNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return null;
  }

  // Get Expo push token (works cross-platform)
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '066d68ca-b5ec-4ec3-94cf-e5cf8890718d',
  });
  const pushToken = tokenData.data;

  // Store token locally
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);

  // Send token to backend
  try {
    await api.post('/users/push-token', { token: pushToken, platform: Platform.OS });
  } catch (error) {
    console.log('Failed to register push token with backend:', error.message);
  }

  // Set up Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payments & Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF9800',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Alerts & Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#2196F3',
      sound: 'default',
    });
  }

  return pushToken;
}

/**
 * Save a received notification to local history
 */
export async function saveNotificationToHistory(notification) {
  try {
    const historyJson = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];

    const entry = {
      id: Date.now().toString(),
      title: notification.request?.content?.title || 'Notification',
      body: notification.request?.content?.body || '',
      data: notification.request?.content?.data || {},
      type: notification.request?.content?.data?.type || 'general',
      read: false,
      receivedAt: new Date().toISOString(),
    };

    history.unshift(entry);

    // Keep only last 100 notifications
    if (history.length > 100) {
      history.length = 100;
    }

    await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history));

    // Update badge count
    const unreadCount = history.filter((n) => !n.read).length;
    await Notifications.setBadgeCountAsync(unreadCount);
  } catch (error) {
    console.error('Failed to save notification to history:', error);
  }
}

/**
 * Get notification history
 */
export async function getNotificationHistory() {
  try {
    const historyJson = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Failed to get notification history:', error);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const historyJson = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];
    const updated = history.map((n) =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(updated));

    const unreadCount = updated.filter((n) => !n.read).length;
    await Notifications.setBadgeCountAsync(unreadCount);
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead() {
  try {
    const historyJson = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];
    const updated = history.map((n) => ({ ...n, read: true }));
    await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(updated));
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
  }
}

/**
 * Clear all notification history
 */
export async function clearNotificationHistory() {
  try {
    await AsyncStorage.removeItem(NOTIFICATION_HISTORY_KEY);
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Failed to clear notification history:', error);
  }
}

/**
 * Get notification settings
 */
export async function getNotificationSettings() {
  try {
    const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return settingsJson ? JSON.parse(settingsJson) : { ...DEFAULT_SETTINGS };
  } catch (error) {
    console.error('Failed to get notification settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(settings) {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to update notification settings:', error);
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount() {
  try {
    const historyJson = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];
    return history.filter((n) => !n.read).length;
  } catch (error) {
    return 0;
  }
}

/**
 * Determine notification channel based on type
 */
export function getChannelForType(type) {
  switch (type) {
    case 'orderConfirmed':
    case 'orderCompleted':
    case 'orderCancelled':
      return 'orders';
    case 'paymentReminder':
    case 'dividendReceived':
      return 'payments';
    case 'tokenListing':
    case 'priceAlert':
    default:
      return 'alerts';
  }
}
