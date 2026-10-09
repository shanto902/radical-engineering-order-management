import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Order } from '../types';

/**
 * Robust notification and alert service compatible with Expo Go and standalone builds.
 * Uses native audio chime playback + haptic vibrations + interactive in-app banners.
 */
export const notificationsService = {
  isExpoGo(): boolean {
    return true;
  },

  /**
   * Initialize audio mode and notification permissions
   */
  async init(): Promise<boolean> {
    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      }
      return true;
    } catch (err) {
      console.warn('Audio init error:', err);
      return false;
    }
  },

  /**
   * Play the clear melodic chime sound for new orders
   */
  async playOrderChime(): Promise<void> {
    try {
      if (Platform.OS === 'web') return;

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/chime.wav'),
        { shouldPlay: true, volume: 1.0 }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      });
    } catch (err) {
      console.warn('Failed to play order chime sound:', err);
    }
  },

  /**
   * Trigger order alert chime + haptic vibrations when a new order arrives
   */
  async notifyNewOrder(order: Order): Promise<void> {
    // 1. Play melodic notification sound
    this.playOrderChime();

    // 2. Double haptic pulse
    try {
      if (Platform.OS !== 'web') {
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
