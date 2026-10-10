import { isRunningInExpoGo } from 'expo';
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import { Order } from '../types';

/**
 * Detect if the app is currently running inside Expo Go client.
 * In Expo SDK 53+, remote push notification APIs throw fatal errors on Android in Expo Go.
 */
const isExpoGoApp = ((): boolean => {
  try {
    return typeof isRunningInExpoGo === 'function' ? isRunningInExpoGo() : false;
  } catch {
    return false;
  }
})();

let NotificationsModule: any = null;

if (isExpoGoApp) {
  console.log(
    '[notifications] Expo Go detected: Android remote push notifications are not supported in Expo Go (SDK 53+). Local in-app alerts, sounds, vibrations, and live WebSockets are fully active. Use a development build or standalone APK for background push notifications.'
  );
} else {
  try {
    // Dynamically require expo-notifications only in standalone APK or Development Builds
    NotificationsModule = require('expo-notifications');
    if (
      NotificationsModule &&
      typeof NotificationsModule.setNotificationHandler === 'function'
    ) {
      NotificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          // Show native OS system heads-up banners, sound, and badge
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
  } catch (err: any) {
    console.log('[notifications] Native notifications module not available:', err?.message || err);
    NotificationsModule = null;
  }
}

/**
 * Robust notification and alert service:
 * - In Development & Standalone APK builds: Uses native FCM push channels & ExponentPushToken.
 * - In Expo Go: Uses high-priority vibration patterns + WebSockets + in-app banners.
 */
export const notificationsService = {
  isExpoGo(): boolean {
    return isExpoGoApp || !NotificationsModule;
  },

  /**
   * Listen for user tapping a push notification to open the app or navigate to order
   */
  setupNotificationResponseListener(
    onOpenOrder: (orderId: string) => void
  ): () => void {
    if (isExpoGoApp || !NotificationsModule) {
      return () => {};
    }

    try {
      let sub: any = null;
      if (
        typeof NotificationsModule.addNotificationResponseReceivedListener ===
        'function'
      ) {
        sub = NotificationsModule.addNotificationResponseReceivedListener(
          (response: any) => {
            const data = response?.notification?.request?.content?.data;
            const orderId = data?.orderId || data?.order_id || data?.id;
            if (orderId) {
              onOpenOrder(String(orderId));
            }
          }
        );
      }

      // Check if app was opened directly from a notification
      if (
        typeof NotificationsModule.getLastNotificationResponseAsync ===
        'function'
      ) {
        NotificationsModule.getLastNotificationResponseAsync()
          .then((response: any) => {
            const data = response?.notification?.request?.content?.data;
            const orderId = data?.orderId || data?.order_id || data?.id;
            if (orderId) {
              onOpenOrder(String(orderId));
            }
          })
          .catch(() => {});
      }

      return () => {
        if (sub?.remove) {
          sub.remove();
        }
      };
    } catch {
      return () => {};
    }
  },

  /**
   * Initialize notification channels & handlers (standalone APK / Dev Client only)
   */
  async init(): Promise<boolean> {
    if (isExpoGoApp || !NotificationsModule) {
      return true;
    }

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
    } catch (err: any) {
      console.log('[notifications] Notification channel setup notice:', err?.message || err);
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

      // Trigger native OS system heads-up notification popup
      if (
        NotificationsModule &&
        typeof NotificationsModule.scheduleNotificationAsync === 'function'
      ) {
        await NotificationsModule.scheduleNotificationAsync({
          content: {
            title: `🔔 New Order #${order.order_id || order.id}`,
            body: `${order.name || 'Customer'} placed an order for ৳${Number(order.total || 0).toLocaleString()}`,
            data: {
              orderId: order.id,
              order_id: order.order_id || order.id,
            },
            sound: 'default',
            priority:
              NotificationsModule.AndroidNotificationPriority?.MAX ?? 'max',
          },
          trigger: null, // deliver immediately as system popup
        });
      }
    } catch (err) {
      console.log('[notifications] System notification popup notice:', err);
    }
  },

  /**
   * Fetch Expo Push Token for FCM server-side pushes (standalone APK or Dev Client)
   */
  async getExpoPushToken(): Promise<string | null> {
    if (isExpoGoApp || !NotificationsModule || Platform.OS === 'web') {
      return null;
    }

    try {
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
        projectId: '8d4c18c5-5582-409e-911d-a06308c0fb1a',
      });

      return tokenData.data || null;
    } catch (err: any) {
      console.log('[notifications] Push token unavailable notice:', err?.message || err);
      return null;
    }
  },
};
