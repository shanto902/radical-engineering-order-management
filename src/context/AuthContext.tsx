import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { readMe, updateMe } from '@directus/sdk';
import { directus } from '../services/directus';
import { notificationsService } from '../services/notifications';
import { DirectusUser } from '../types';
import { APP_CONFIG } from '../constants/config';

interface AuthContextType {
  user: DirectusUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<DirectusUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Check existing session on mount
  const checkSession = useCallback(async () => {
    try {
      setLoading(true);
      const token = await directus.getToken();

      if (token) {
        try {
          const profile = await directus.request(
            readMe({
              fields: [
                'id',
                'first_name',
                'last_name',
                'email',
                'avatar',
                'role',
              ] as any,
            })
          );
          if (profile) {
            setUser(profile as unknown as DirectusUser);
            setIsAuthenticated(true);
            return;
          }
        } catch {
          // If readMe fails but token is valid (e.g. restricted permissions), keep authenticated
          setUser({
            id: 'staff-user',
            email: 'staff@radicalengineering.com.bd',
            first_name: 'Radical',
            last_name: 'Staff',
          });
          setIsAuthenticated(true);
          return;
        }
      }

      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      console.warn('Session check warning:', err);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Automatically register device push token in Directus user profile upon login
  useEffect(() => {
    if (isAuthenticated) {
      notificationsService.getExpoPushToken().then(async (pushToken) => {
        if (pushToken) {
          try {
            await directus.request(updateMe({ push_token: pushToken } as any));
            console.log('[AuthContext] Device push token registered to user profile:', pushToken);
          } catch (err) {
            console.warn('[AuthContext] Push token registration warning:', err);
          }
        }
      });
    }
  }, [isAuthenticated]);

  /**
   * Login using Directus email & password.
   * Note: We intentionally do NOT toggle the global `loading` state here
   * so that LoginScreen remains mounted and can display inline validation
   * errors rather than having its state wiped by AppNavigator's full-screen loader.
   */
  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim();

      // Call Directus JSON-mode login
      await directus.login({
        email: cleanEmail,
        password,
      });

      // Fetch user profile
      try {
        const profile = await directus.request(
          readMe({
            fields: [
              'id',
              'first_name',
              'last_name',
              'email',
              'avatar',
              'role',
            ] as any,
          })
        );
        setUser(profile as unknown as DirectusUser);
      } catch {
        setUser({
          id: 'user',
          email: cleanEmail,
          first_name: cleanEmail.split('@')[0],
        });
      }

      setIsAuthenticated(true);
      return { success: true };
    } catch (err: any) {
      console.warn('Directus login failed:', err);

      let errorMsg = 'Invalid email or password. Please check your credentials.';
      const directusCode = err?.errors?.[0]?.extensions?.code;
      const directusMsg = err?.errors?.[0]?.message;

      if (
        directusCode === 'INVALID_CREDENTIALS' ||
        directusMsg?.toLowerCase().includes('credentials')
      ) {
        errorMsg = 'Incorrect email or password. Please try again.';
      } else if (
        err?.message?.includes('Network request failed') ||
        err?.message?.includes('fetch failed') ||
        err?.message?.includes('NetworkError')
      ) {
        errorMsg = 'Cannot connect to server. Please check your internet connection.';
      } else if (directusMsg) {
        errorMsg = directusMsg;
      } else if (err?.message) {
        errorMsg = err.message;
      }

      return { success: false, error: errorMsg };
    }
  };

  /**
   * Logout and clear Directus session
   */
  const logout = async (): Promise<void> => {
    try {
      setLoading(true);
      await directus.logout().catch(() => {});
      await directus.setToken(null).catch(() => {});
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

