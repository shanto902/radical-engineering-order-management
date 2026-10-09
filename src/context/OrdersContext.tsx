import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState } from 'react-native';
import {
  Order,
  OrderStatus,
  FilterStatus,
  OrderSummaryMetrics,
  ExtraCharge,
} from '../types';
import { ordersApi } from '../services/ordersApi';
import { directus } from '../services/directus';
import { notificationsService } from '../services/notifications';
import { useAuth } from './AuthContext';
import { APP_CONFIG } from '../constants/config';

interface OrdersContextType {
  orders: Order[];
  filteredOrders: Order[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  statusFilter: FilterStatus;
  setStatusFilter: (status: FilterStatus) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lastSynced: Date | null;
  refreshOrders: () => Promise<void>;
  updateStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  updateExtraCharges: (
    orderId: string,
    charges: ExtraCharge[],
    newTotal: number
  ) => Promise<boolean>;
  metrics: OrderSummaryMetrics;
  unreadNewOrders: number;
  clearUnreadCount: () => void;
  isPollingEnabled: boolean;
  togglePolling: () => void;
  isRealtimeConnected: boolean;
  activeNewOrderAlert: Order | null;
  dismissNewOrderAlert: () => void;
  triggerDemoAlert: (order: Order) => void;
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [unreadNewOrders, setUnreadNewOrders] = useState<number>(0);
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] =
    useState<boolean>(false);
  const [activeNewOrderAlert, setActiveNewOrderAlert] =
    useState<Order | null>(null);

  // Track known order IDs to detect newly arrived orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const lastKnownLatestIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef<boolean>(true);

  // Initialize notification sound / haptics once on mount
  useEffect(() => {
    notificationsService.init();
  }, []);

  const loadOrders = useCallback(async (isPullRefresh = false) => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (isPullRefresh) {
      setRefreshing(true);
    } else if (isFirstLoadRef.current) {
      setLoading(true);
    }

    setError(null);
    try {
      const fetched = await ordersApi.getOrders({ limit: 100 });

      // Detect any new orders that arrived after first load
      if (!isFirstLoadRef.current && fetched.length > 0) {
        const newlyArrived = fetched.filter(
          (o) => !knownOrderIdsRef.current.has(o.id)
        );

        if (newlyArrived.length > 0) {
          // Notify user about the newest order with sound + haptics
          notificationsService.notifyNewOrder(newlyArrived[0]);
          setUnreadNewOrders((prev) => prev + newlyArrived.length);
          setActiveNewOrderAlert(newlyArrived[0]);
        }
      }

      // Update known set and latest id
      const currentIds = new Set(fetched.map((o) => o.id));
      knownOrderIdsRef.current = currentIds;
      if (fetched.length > 0) {
        lastKnownLatestIdRef.current = fetched[0].id;
      }

      setOrders(fetched);
      setLastSynced(new Date());
      isFirstLoadRef.current = false;
    } catch (err: any) {
      console.warn('Orders load failed:', err);
      setError(err?.message || 'Failed to sync orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    } else {
      setOrders([]);
      setLoading(false);
    }
  }, [isAuthenticated, loadOrders]);

  // Ultra-lightweight ping poller (only queries 1 row, 5 scalar fields, 0 DB joins)
  // Pauses automatically when app is minimized to eliminate server pressure and battery drain
  useEffect(() => {
    if (!isPollingEnabled || !isAuthenticated) return;

    let appState = AppState.currentState;

    const checkForNewOrdersPing = async () => {
      // Never query if the app is in background or phone is asleep
      if (AppState.currentState !== 'active') return;

      try {
        const latest = await ordersApi.getLatestOrderMeta();
        if (!latest) return;

        // If the newest order ID is different from our last known ID
        if (
          lastKnownLatestIdRef.current &&
          latest.id !== lastKnownLatestIdRef.current
        ) {
          lastKnownLatestIdRef.current = latest.id;
          // Trigger audio chime + vibration + top banner immediately
          notificationsService.notifyNewOrder(latest as any);
          setActiveNewOrderAlert(latest as any);
          setUnreadNewOrders((prev) => prev + 1);
          // Refresh the full feed
          loadOrders();
        } else if (!lastKnownLatestIdRef.current) {
          lastKnownLatestIdRef.current = latest.id;
        }
      } catch (err) {
        // Silent fail on network transient
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // When resuming from background back into foreground, immediately check
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        checkForNewOrdersPing();
      }
      appState = nextAppState;
    });

    const interval = setInterval(() => {
      checkForNewOrdersPing();
    }, APP_CONFIG.orderPollIntervalMs);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isPollingEnabled, isAuthenticated, loadOrders]);

  // Directus WebSocket Realtime listener (if WEBSOCKETS_ENABLED is set on Directus Docker)
  // Seamlessly receives instant pushes from Directus with zero polling delay.
  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    let unsubscribeFn: (() => void) | null = null;

    const setupRealtime = async () => {
      try {
        const result = await directus.subscribe('orders', {
          query: {
            fields: ['id', 'order_id', 'name', 'phone', 'total', 'status', 'placed_at'],
          },
        });
        unsubscribeFn = result.unsubscribe;
        if (isMounted) setIsRealtimeConnected(true);

        for await (const message of result.subscription) {
          if (!isMounted) break;
          const ev = message as any;
          if (ev.event === 'create' && ev.data && ev.data.length > 0) {
            const newOrder = ev.data[0];
            lastKnownLatestIdRef.current = newOrder.id;
            notificationsService.notifyNewOrder(newOrder as any);
            setActiveNewOrderAlert(newOrder as any);
            setUnreadNewOrders((prev) => prev + 1);
            loadOrders();
          } else if (ev.event === 'update' && ev.data && ev.data.length > 0) {
            loadOrders();
          }
        }
      } catch (err) {
        if (isMounted) setIsRealtimeConnected(false);
      }
    };

    setupRealtime();

    return () => {
      isMounted = false;
      setIsRealtimeConnected(false);
      if (unsubscribeFn) {
        try {
          unsubscribeFn();
        } catch {}
      }
    };
  }, [isAuthenticated, loadOrders]);

  const updateStatus = async (
    orderId: string,
    newStatus: OrderStatus
  ): Promise<boolean> => {
    try {
      // Optimistic update
      setOrders((prev) =>
        prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
      );

      await ordersApi.updateStatus(orderId, newStatus);
      return true;
    } catch (err) {
      console.error('Failed to update status:', err);
      // Revert / re-sync on failure
      loadOrders();
      return false;
    }
  };

  const updateExtraCharges = async (
    orderId: string,
    charges: ExtraCharge[],
    newTotal: number
  ): Promise<boolean> => {
    try {
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId
            ? { ...ord, extra_charges: charges, total: newTotal }
            : ord
        )
      );

      await ordersApi.updateExtraCharges(orderId, charges, newTotal);
      return true;
    } catch (err) {
      console.error('Failed to update extra charges:', err);
      loadOrders();
      return false;
    }
  };

  const clearUnreadCount = () => {
    setUnreadNewOrders(0);
  };

  const togglePolling = () => {
    setIsPollingEnabled((prev) => !prev);
  };

  // Filtered orders computation
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;

    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const matchesId = (order.order_id || order.id || '')
      .toLowerCase()
      .includes(q);
    const matchesName = (order.name || '').toLowerCase().includes(q);
    const matchesPhone = (order.phone || '').includes(q);
    const matchesAddress = (order.address || '').toLowerCase().includes(q);

    return matchesId || matchesName || matchesPhone || matchesAddress;
  });

  // Calculate order metrics
  const metrics: OrderSummaryMetrics = orders.reduce(
    (acc, curr) => {
      acc.totalCount += 1;
      const status = (curr.status || 'pending').toLowerCase();
      if (status === 'pending') acc.pendingCount += 1;
      else if (status === 'confirmed') acc.confirmedCount += 1;
      else if (status === 'processing') acc.processingCount += 1;
      else if (status === 'shipped') acc.shippedCount += 1;
      else if (status === 'delivered') acc.deliveredCount += 1;
      else if (status === 'cancelled') acc.cancelledCount += 1;

      if (status !== 'cancelled') {
        acc.totalRevenue += Number(curr.total || 0);
      }
      return acc;
    },
    {
      totalCount: 0,
      pendingCount: 0,
      confirmedCount: 0,
      processingCount: 0,
      shippedCount: 0,
      deliveredCount: 0,
      cancelledCount: 0,
      totalRevenue: 0,
    }
  );

  return (
    <OrdersContext.Provider
      value={{
        orders,
        filteredOrders,
        loading,
        refreshing,
        error,
        statusFilter,
        setStatusFilter,
        searchQuery,
        setSearchQuery,
        lastSynced,
        refreshOrders: () => loadOrders(true),
        updateStatus,
        updateExtraCharges,
        metrics,
        unreadNewOrders,
        clearUnreadCount,
        isPollingEnabled,
        togglePolling,
        isRealtimeConnected,
        activeNewOrderAlert,
        dismissNewOrderAlert: () => setActiveNewOrderAlert(null),
        triggerDemoAlert: (order: Order) => {
          notificationsService.notifyNewOrder(order);
          setActiveNewOrderAlert(order);
          setUnreadNewOrders((prev) => prev + 1);
        },
      }}
    >
      {children}
    </OrdersContext.Provider>
  );
};

export const useOrders = (): OrdersContextType => {
  const context = useContext(OrdersContext);
  if (!context) {
    throw new Error('useOrders must be used within an OrdersProvider');
  }
  return context;
};

