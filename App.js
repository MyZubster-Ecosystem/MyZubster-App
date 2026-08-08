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
import PoiScreen from './app/screens/PoiScreen';
import AddPoiScreen from './app/screens/AddPoiScreen';
import VerificationScreen from './app/screens/VerificationScreen';
import ReputationScreen from './app/screens/ReputationScreen';
import UrbanReportScreen from './app/screens/UrbanReportScreen';
import MunicipalReportsScreen from './app/screens/MunicipalReportsScreen';
import GamificationScreen from './app/screens/GamificationScreen';
import CityMapScreen from './app/screens/CityMapScreen';
import WasteReportScreen from './app/screens/WasteReportScreen';
import AIReportsDashboardScreen from './app/screens/AIReportsDashboardScreen';
import DroneKitScreen from './app/screens/DroneKitScreen';
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
          <Stack.Screen name="Poi" component={PoiScreen} />
          <Stack.Screen name="AddPoi" component={AddPoiScreen} />
          <Stack.Screen name="Verifications" component={VerificationScreen} />
          <Stack.Screen name="Reputation" component={ReputationScreen} />
          <Stack.Screen name="UrbanReport" component={UrbanReportScreen} />
          <Stack.Screen name="MunicipalReports" component={MunicipalReportsScreen} />
          <Stack.Screen name="Gamification" component={GamificationScreen} />
          <Stack.Screen name="CityMap" component={CityMapScreen} />
          <Stack.Screen name="WasteReport" component={WasteReportScreen} />
          <Stack.Screen name="AIReportsDashboard" component={AIReportsDashboardScreen} />
          <Stack.Screen name="DroneKit" component={DroneKitScreen} />
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
