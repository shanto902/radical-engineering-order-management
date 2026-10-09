import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { Order } from '../types';

// Configure foreground notification behavior safely
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (handlerErr) {
  console.warn('Could not set notification handler:', handlerErr);
}

export const notificationsService = {
  /**
   * Check if running inside Expo Go
   */
  isExpoGo(): boolean {
    return isRunningInExpoGo();
  },

  /**
   * Initialize notification channels and permissions safely
   */
  async init(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('order_alerts', {
            name: 'Order Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3C1100',
            sound: 'default',
          });
        } catch (chanErr) {
          console.warn('Channel setup warning:', chanErr);
        }
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (err) {
      console.warn('Failed to initialize notifications:', err);
      return false;
    }
  },

  /**
   * Trigger native alert + haptics when a new order arrives
   */
  async notifyNewOrder(order: Order): Promise<void> {
    try {
      // 1. Haptic alert
      if (Platform.OS !== 'web') {
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        } catch {
          // ignore haptics error if device doesn't support
        }
      }

      const totalFormatted = Number(order.total || 0).toLocaleString();
      const itemsCount = order.order_items?.length || 0;

      // 2. Schedule local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 New Order: #${order.order_id || order.id}`,
          body: `${order.name} ordered ${itemsCount} item(s) • Total: ৳${totalFormatted}`,
          data: { orderId: order.id },
          sound: 'default',
        },
        trigger: null, // deliver immediately
      });
    } catch (err) {
      console.warn('Could not schedule local notification:', err);
    }
  },

  /**
   * Get Expo Push Token for Directus webhook push integration.
   * In Expo Go on Android (SDK 53+), remote push notifications were removed by Expo
   * and require a Development Build (npx expo run:android or EAS build).
   */
  async getExpoPushToken(): Promise<string | null> {
    // Prevent runtime error in Expo Go
    if (isRunningInExpoGo()) {
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (err) {
      console.warn('Push token not available in current environment:', err);
      return null;
    }
  },
};
