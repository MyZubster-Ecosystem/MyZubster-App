import React, { useContext, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { AuthContext } from '../context/AuthContext';
import { configureNotificationHandler, registerDeviceToken, registerForPushNotifications } from '../services/notificationService';
import { navigate } from '../navigation/navigationRef';

export default function NotificationManager() {
  const { user } = useContext(AuthContext);

  useEffect(() => { configureNotificationHandler(); }, []);

  useEffect(() => {
    Notifications.setNotificationChannelAsync?.('default', {
      name: 'MyZubster',
      importance: Notifications.AndroidImportance?.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let mounted = true;
    registerForPushNotifications().then(token => mounted && registerDeviceToken(token)).catch(() => { /* permission/device/API are optional */ });
    const handleData = data => {
      if (data.orderId) navigate('Order', { orderId: data.orderId });
      else if (data.targetId) navigate('Reviews', { targetId: data.targetId, title: 'Recensioni' });
      else if (data.route) navigate(data.route, data.params);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(response => handleData(response.notification.request.content.data || {}));
    const urlSubscription = Linking.addEventListener('url', ({ url }) => {
      const parsed = Linking.parse(url);
      const path = [parsed.hostname, parsed.path].filter(Boolean).join('/');
      if (path.startsWith('orders/')) handleData({ orderId: path.split('/')[1] });
      else if (path.startsWith('reviews/')) handleData({ targetId: path.split('/')[1] });
      else if (path === 'notifications') navigate('Notifications');
    });
    return () => { mounted = false; subscription.remove(); urlSubscription.remove(); };
  }, [user]);

  return null;
}
