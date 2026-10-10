import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { APP_CONFIG } from '../constants/config';

interface NetworkContextValue {
  isOnline: boolean;
  isChecking: boolean;
  wasOffline: boolean;
  checkConnection: () => Promise<boolean>;
  notifyOffline: () => void;
  notifyOnline: () => void;
  subscribeOnOnline: (callback: () => void) => () => void;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  const isOnlineRef = useRef<boolean>(true);
  isOnlineRef.current = isOnline;

  const listenersRef = useRef<Set<() => void>>(new Set());

  /**
   * Tests actual connectivity to the server or public network endpoint.
   */
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);

    let online = false;

    // 1. First probe Directus API ping
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/server/ping`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      clearTimeout(timeoutId);

      // Any HTTP response from our server (even 200, 304, etc.) proves network is active
      if (res.ok || res.status < 500) {
        online = true;
      }
    } catch {
      // 2. If directus ping fails, probe universal network 204 endpoint as fallback
      try {
        const fallbackController = new AbortController();
        const fbTimeout = setTimeout(() => fallbackController.abort(), 3000);

        const fbRes = await fetch('https://clients3.google.com/generate_204', {
          method: 'GET',
          signal: fallbackController.signal,
          headers: { 'Cache-Control': 'no-cache' },
        });
        clearTimeout(fbTimeout);

        if (fbRes.status === 204 || fbRes.ok) {
          online = true;
        }
      } catch {
        online = false;
      }
    }

    setIsChecking(false);

    if (online) {
      if (!isOnlineRef.current) {
        // Transition from offline to online: trigger recovery listeners
        setWasOffline(true);
        listenersRef.current.forEach((cb) => {
          try {
            cb();
          } catch {}
        });
        // Clear recovery notification after 4 seconds
        setTimeout(() => {
          setWasOffline(false);
        }, 4000);
      }
      setIsOnline(true);
    } else {
      setIsOnline(false);
    }

    return online;
  }, []);

  const notifyOffline = useCallback(() => {
    if (isOnlineRef.current) {
      setIsOnline(false);
    }
  }, []);

  const notifyOnline = useCallback(() => {
    if (!isOnlineRef.current) {
      setIsOnline(true);
      setWasOffline(true);
      listenersRef.current.forEach((cb) => {
        try {
          cb();
        } catch {}
      });
      setTimeout(() => {
        setWasOffline(false);
      }, 4000);
    }
  }, []);

  const subscribeOnOnline = useCallback((callback: () => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  // Check connection on mount and when app resumes from background
  useEffect(() => {
    checkConnection();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkConnection();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, [checkConnection]);

  // Periodic heartbeat: when offline, check every 8 seconds to detect reconnect automatically
  useEffect(() => {
    const intervalTime = isOnline ? 45000 : 8000;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkConnection();
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isOnline, checkConnection]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isChecking,
        wasOffline,
        checkConnection,
        notifyOffline,
        notifyOnline,
        subscribeOnOnline,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextValue => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

