import React, { useContext, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './app/context/AuthContext';
import { LanguageProvider } from './app/context/LanguageContext';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import DashboardScreen from './app/screens/DashboardScreen';
import CreateOrderScreen from './app/screens/CreateOrderScreen';
import OrderScreen from './app/screens/OrderScreen';
import NotificationSettingsScreen from './app/screens/NotificationSettingsScreen';
import NotificationHistoryScreen from './app/screens/NotificationHistoryScreen';
import {
  setupNotifications,
  attachNotificationListeners,
} from './app/services/notificationService';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user } = useContext(AuthContext);
  const navigationRef = useRef(null);

  useEffect(() => {
    let listeners;
    (async () => {
      await setupNotifications();
      listeners = attachNotificationListeners({
        onNavigate: (data = {}) => {
          const nav = navigationRef.current;
          if (!nav || !user) return;
          if (data.orderId) {
            nav.navigate('Order', { orderId: data.orderId });
          } else if (data.deepLink === 'CreateOrder') {
            nav.navigate('CreateOrder');
          } else if (data.deepLink === 'Notifications') {
            nav.navigate('NotificationHistory');
          } else if (data.deepLink === 'NotificationSettings') {
            nav.navigate('NotificationSettings');
          }
        },
      });
    })();

    return () => {
      if (listeners?.remove) listeners.remove();
    };
  }, [user]);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
            <Stack.Screen name="Order" component={OrderScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="NotificationHistory" component={NotificationHistoryScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </LanguageProvider>
  );
}
