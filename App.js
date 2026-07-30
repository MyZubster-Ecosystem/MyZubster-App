// App.js
import React, { useContext, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { AuthProvider, AuthContext } from './app/context/AuthContext';
import { NotificationProvider, NotificationContext } from './app/context/NotificationContext';
import {
  saveNotificationToHistory,
} from './app/services/notificationService';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import DashboardScreen from './app/screens/DashboardScreen';
import CreateOrderScreen from './app/screens/CreateOrderScreen';
import OrderScreen from './app/screens/OrderScreen';
import NotificationHistoryScreen from './app/screens/NotificationHistoryScreen';
import NotificationSettingsScreen from './app/screens/NotificationSettingsScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user } = useContext(AuthContext);
  const { refreshUnreadCount } = useContext(NotificationContext);
  const navigationRef = useRef();
  const notificationResponseListener = useRef();

  // Set up deep linking from notifications
  useEffect(() => {
    notificationResponseListener.current =
      Notifications.addNotificationResponseReceivedListener(async (response) => {
        const data = response.notification.request.content.data;

        // Save to history
        await saveNotificationToHistory(response.notification);
        refreshUnreadCount();

        // Navigate based on notification type
        if (data?.screen && navigationRef.current) {
          if (data.screen === 'Order' && data.orderId) {
            navigationRef.current.navigate('Order', { orderId: data.orderId });
          } else if (data.screen === 'Dashboard') {
            navigationRef.current.navigate('Dashboard');
          }
        }
      });

    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(
          notificationResponseListener.current
        );
      }
    };
  }, [refreshUnreadCount]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
            <Stack.Screen name="Order" component={OrderScreen} />
            <Stack.Screen
              name="NotificationHistory"
              component={NotificationHistoryScreen}
              options={{ title: 'Notifications' }}
            />
            <Stack.Screen
              name="NotificationSettings"
              component={NotificationSettingsScreen}
              options={{ title: 'Settings' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppNavigator />
      </NotificationProvider>
    </AuthProvider>
  );
}
