import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDirectus,
  rest,
  realtime,
  authentication,
  AuthenticationStorage,
  AuthenticationData,
} from '@directus/sdk';
import { APP_CONFIG } from '../constants/config';

const AUTH_STORAGE_KEY = 'directus_auth_data';

/**
 * AsyncStorage adapter for Directus authentication persistence
 */
export const directusStorage: AuthenticationStorage = {
  get: async (): Promise<AuthenticationData | null> => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('Directus storage get error:', err);
      return null;
    }
  },
  set: async (value: AuthenticationData | null): Promise<void> => {
    try {
      if (value && value.access_token) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Directus storage set error:', err);
    }
  },
};

/**
 * Directus client with json-mode authentication, REST methods, and realtime WebSocket capability
 */
export const directus = createDirectus(APP_CONFIG.apiBaseUrl)
  .with(
    authentication('json', {
      storage: directusStorage,
      autoRefresh: true,
      msRefreshBeforeExpires: 30000,
    })
  )
  .with(rest())
  .with(realtime());
