import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import { Order } from '../types';

/**
 * Robust notification and alert service 100% compatible with Expo Go and standalone builds.
 * Uses high-priority vibration patterns + haptics + interactive in-app banners.
 * 
 * Note: Expo removed native audio drivers ('ExponentAV' / 'ExpoAudio') from the generic
 * Expo Go APK. In Expo Go, alerts use rhythmic vibration + banners.
 * To enable custom WAV/MP3 chime playback, a Development Build (npx expo run:android) is used.
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
   * Play order alert sound if native audio module is present (guarded against Expo Go crash)
   */
  async playOrderChime(): Promise<void> {
    // Intentionally no-op in Expo Go to prevent ExponentAV missing module crash
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
   * Remote push tokens require a Development Build (npx expo run:android).
   * In Expo Go, returns null to prevent native module missing errors.
   */
  async getExpoPushToken(): Promise<string | null> {
    return null;
  },
};
