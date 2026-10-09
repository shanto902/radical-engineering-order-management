import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import { Order } from '../types';

let NotificationsModule: any = null;

try {
  // Dynamically require expo-notifications so Expo Go stays safe from missing binary crashes
  NotificationsModule = require('expo-notifications');
  if (
    NotificationsModule &&
    typeof NotificationsModule.setNotificationHandler === 'function'
  ) {
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        // Suppress system OS heads-up banners while the app is in the foreground
        // to avoid duplicate popups (the custom in-app banner will display instead)
        shouldShowAlert: false,
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch {
  NotificationsModule = null;
}

/**
 * Robust notification and alert service:
 * - In Development & Standalone APK builds: Uses native FCM push channels & ExponentPushToken.
 * - In Expo Go: Uses high-priority vibration patterns + WebSockets + in-app banners.
 */
export const notificationsService = {
  isExpoGo(): boolean {
    return !NotificationsModule;
  },

  /**
   * Initialize notification channels & handlers
   */
  async init(): Promise<boolean> {
    try {
      if (
        Platform.OS === 'android' &&
        NotificationsModule?.setNotificationChannelAsync
      ) {
        const importance =
          NotificationsModule.AndroidImportance?.MAX ??
          NotificationsModule.AndroidImportance?.HIGH ??
          5;

        await NotificationsModule.setNotificationChannelAsync('orders', {
          name: 'Order Alerts',
          importance,
          vibrationPattern: [0, 300, 150, 300],
          lightColor: '#FCB974',
          sound: 'default',
        });
      }
      return true;
    } catch (err) {
      console.warn('Notification init error:', err);
      return false;
    }
  },

  /**
   * Play order alert sound
   */
  async playOrderChime(): Promise<void> {
    // Handled natively by notification channel in standalone APK
  },

  /**
   * Trigger order alert vibration + haptic feedback when a new order arrives
   */
  async notifyNewOrder(order: Order): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        // Double-buzz pattern: 300ms buzz, 120ms pause, 300ms buzz
        Vibration.vibrate([0, 300, 120, 300]);

        // Rich haptics
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        setTimeout(async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } catch {}
        }, 200);
      }
    } catch (err) {
      console.warn('Haptic/Vibration error:', err);
    }
  },

  /**
   * Fetch Expo Push Token for FCM server-side pushes (standalone APK or Dev Client)
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      if (!NotificationsModule || Platform.OS === 'web') {
        return null;
      }

      const { status: existingStatus } =
        await NotificationsModule.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } =
          await NotificationsModule.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const tokenData = await NotificationsModule.getExpoPushTokenAsync({
        projectId: '6a901469-f3e4-46be-a5c0-357a75505d03',
      });

      return tokenData.data || null;
    } catch (err) {
      // In Expo Go or unconfigured environment, quietly fallback
      return null;
    }
  },
};
