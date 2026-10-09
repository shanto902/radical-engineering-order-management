import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import { OrdersProvider, useOrders } from './src/context/OrdersContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import {
  navigationRef,
  navigateToOrderDetail,
} from './src/navigation/navigationRef';
import { NewOrderAlertBanner } from './src/components/NewOrderAlertBanner';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Keep splash screen visible until initial setup completes
SplashScreen.preventAutoHideAsync().catch(() => {});

function MainApp() {
  const { activeNewOrderAlert, dismissNewOrderAlert } = useOrders();

  useEffect(() => {
    let responseSubscription: any = null;
    try {
      const Notifications = require('expo-notifications');
      if (
        Notifications &&
        typeof Notifications.addNotificationResponseReceivedListener ===
          'function'
      ) {
        // Handle user tapping on a push notification while the app is in background or foreground
        responseSubscription =
          Notifications.addNotificationResponseReceivedListener(
            (response: any) => {
              const data = response?.notification?.request?.content?.data;
              const orderId = data?.orderId || data?.order_id || data?.id;
              if (orderId) {
                navigateToOrderDetail(String(orderId));
              }
            }
          );

        // Handle user tapping on a push notification that opened the app from a closed state
        if (
          typeof Notifications.getLastNotificationResponseAsync === 'function'
        ) {
          Notifications.getLastNotificationResponseAsync().then(
            (response: any) => {
              const data = response?.notification?.request?.content?.data;
              const orderId = data?.orderId || data?.order_id || data?.id;
              if (orderId) {
                navigateToOrderDetail(String(orderId));
              }
            }
          );
        }
      }
    } catch {}

    return () => {
      if (responseSubscription?.remove) {
        responseSubscription.remove();
      }
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="dark" />
      <NewOrderAlertBanner
        order={activeNewOrderAlert}
        onViewOrder={(o) => {
          dismissNewOrderAlert();
          navigateToOrderDetail(o.id);
        }}
        onDismiss={dismissNewOrderAlert}
      />
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
        <AuthProvider>
          <OrdersProvider>
            <MainApp />
          </OrdersProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
