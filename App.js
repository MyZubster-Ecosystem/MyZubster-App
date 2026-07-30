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

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
          <Stack.Screen name="Order" component={OrderScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </LanguageProvider>
  );
}
