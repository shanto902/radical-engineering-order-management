import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { OrdersProvider, useOrders } from './src/context/OrdersContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import {
  navigationRef,
  navigateToOrderDetail,
} from './src/navigation/navigationRef';
import { NewOrderAlertBanner } from './src/components/NewOrderAlertBanner';

// Keep splash screen visible until initial setup completes
SplashScreen.preventAutoHideAsync().catch(() => {});

function MainApp() {
  const { activeNewOrderAlert, dismissNewOrderAlert } = useOrders();

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
    <SafeAreaProvider>
      <OrdersProvider>
        <MainApp />
      </OrdersProvider>
    </SafeAreaProvider>
  );
}
