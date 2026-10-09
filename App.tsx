import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { OrdersProvider } from './src/context/OrdersContext';
import { AppNavigator } from './src/navigation/AppNavigator';

// Keep splash screen visible until initial setup completes
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    // Hide splash screen after app mounts
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider>
      <OrdersProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <AppNavigator />
        </NavigationContainer>
      </OrdersProvider>
    </SafeAreaProvider>
  );
}
