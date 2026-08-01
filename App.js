import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, AuthContext } from './app/context/AuthContext';
import { LanguageProvider } from './app/context/LanguageContext';
import LoginScreen from './app/screens/LoginScreen';
import RegisterScreen from './app/screens/RegisterScreen';
import DashboardScreen from './app/screens/DashboardScreen';
import CreateOrderScreen from './app/screens/CreateOrderScreen';
import OrderScreen from './app/screens/OrderScreen';
import WalletScreen from './app/screens/WalletScreen';
import PrivacyScreen from './app/screens/PrivacyScreen';
import AnonymousLoginScreen from './app/screens/AnonymousLoginScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import ReviewsScreen from './app/screens/ReviewsScreen';
import MapScreen from './app/screens/MapScreen';
import NotificationsScreen from './app/screens/NotificationsScreen';
import RewardsScreen from './app/screens/RewardsScreen';
import GamificationScreen from './app/screens/GamificationScreen';
import { initPrivacyPreferences } from './app/services/privacyService';
import NotificationManager from './app/components/NotificationManager';
import { navigationRef } from './app/navigation/navigationRef';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6200EE" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="AnonymousLogin" component={AnonymousLoginScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
          <Stack.Screen name="Order" component={OrderScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Reviews" component={ReviewsScreen} />
          <Stack.Screen name="Map" component={MapScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Rewards" component={RewardsScreen} />
          <Stack.Screen name="Gamification" component={GamificationScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  React.useEffect(() => { initPrivacyPreferences(); }, []);
  return (
    <LanguageProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <NotificationManager />
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </LanguageProvider>
  );
}
