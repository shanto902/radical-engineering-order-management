import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { NetworkProvider } from './src/context/NetworkContext';
import { AuthProvider } from './src/context/AuthContext';
import { OrdersProvider } from './src/context/OrdersContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import {
  navigationRef,
  navigateToOrderDetail,
} from './src/navigation/navigationRef';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { NoInternetBanner } from './src/components/NoInternetBanner';
import { notificationsService } from './src/services/notifications';

// Silence SDK 53 Expo Go notifications warning in dev LogBox
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

// Keep splash screen visible until initial setup completes
SplashScreen.preventAutoHideAsync().catch(() => {});

function MainApp() {
  useEffect(() => {
    const unsubscribe = notificationsService.setupNotificationResponseListener(
      (orderId) => {
        navigateToOrderDetail(orderId);
      }
    );

    return () => {
      unsubscribe?.();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <NoInternetBanner />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    // Hide splash screen after app mounts
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NetworkProvider>
          <AuthProvider>
            <OrdersProvider>
              <MainApp />
            </OrdersProvider>
          </AuthProvider>
        </NetworkProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
