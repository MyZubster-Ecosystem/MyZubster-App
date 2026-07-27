// app/context/NotificationContext.js
import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import {
  setupNotifications,
  saveNotificationToHistory,
  getUnreadNotificationCount,
} from '../services/notificationService';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [pushToken, setPushToken] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = useRef();
  const responseListener = useRef();

  // Initialize notifications on mount
  useEffect(() => {
    initializeNotifications();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  const initializeNotifications = async () => {
    const token = await setupNotifications();
    if (token) {
      setPushToken(token);
    }

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      async (notification) => {
        await saveNotificationToHistory(notification);
        refreshUnreadCount();
      }
    );

    // Listen for notification taps (app opened from notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data;
        // Navigation handling is done by App.js navigation ref
        await saveNotificationToHistory(response.notification);
        refreshUnreadCount();
      }
    );

    // Handle notifications received while app was closed
    const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
    if (lastNotificationResponse) {
      console.log('App opened from notification:', lastNotificationResponse.notification.request.content.data);
    }

    refreshUnreadCount();
  };

  const refreshUnreadCount = async () => {
    const count = await getUnreadNotificationCount();
    setUnreadCount(count);
  };

  const value = {
    pushToken,
    unreadCount,
    refreshUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
