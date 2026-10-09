import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Order } from '../types';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationsService = {
  /**
   * Initialize notification channels and permissions
   */
  async init(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('order_alerts', {
          name: 'Order Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3C1100',
          sound: 'default',
        });
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
      // Haptic alert
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }

      const totalFormatted = Number(order.total || 0).toLocaleString();
      const itemsCount = order.order_items?.length || 0;

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
   * Get Expo Push Token for Directus webhook push integration
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch {
      return null;
    }
  },
};
