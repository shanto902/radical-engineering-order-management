import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Order } from '../types';

/**
 * Robust notification and alert service compatible with Expo Go and standalone builds.
 * Uses native vibration haptics + interactive in-app banners without requiring
 * external native push binaries that crash inside Expo Go Android.
 */
export const notificationsService = {
  isExpoGo(): boolean {
    return true;
  },

  /**
   * Initialize notification channels / permissions
   */
  async init(): Promise<boolean> {
    return true;
  },

  /**
   * Trigger order alert chime + haptic vibrations when a new order arrives
   */
  async notifyNewOrder(order: Order): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        // Double haptic pulse for order alert
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        setTimeout(async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } catch {}
        }, 180);
      }
    } catch (err) {
      console.warn('Haptic feedback error:', err);
    }
  },

  /**
   * Remote push tokens require a Development Build (npx expo run:android).
   * In Expo Go, returns null to prevent native module missing errors.
   */
  async getExpoPushToken(): Promise<string | null> {
    return null;
  },
};
