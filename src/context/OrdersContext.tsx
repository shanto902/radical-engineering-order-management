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
import { ordersApi, ordersCache } from '../services/ordersApi';
import { directus } from '../services/directus';
import { notificationsService } from '../services/notifications';
import { useAuth } from './AuthContext';
import { APP_CONFIG } from '../constants/config';

const PAGE_SIZE = 20;

const DEFAULT_METRICS: OrderSummaryMetrics = {
  totalCount: 0,
  pendingCount: 0,
  confirmedCount: 0,
  processingCount: 0,
  shippedCount: 0,
  deliveredCount: 0,
  cancelledCount: 0,
  totalRevenue: 0,
};

interface OrdersContextType {
  orders: Order[];
  filteredOrders: Order[]; // Maintained for backwards compatibility
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalFilteredCount: number;
  error: string | null;
  statusFilter: FilterStatus;
  setStatusFilter: (status: FilterStatus) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  lastSynced: Date | null;
  refreshOrders: () => Promise<void>;
  loadMoreOrders: () => Promise<void>;
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
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [totalFilteredCount, setTotalFilteredCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  const [metrics, setMetrics] = useState<OrderSummaryMetrics>(DEFAULT_METRICS);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [unreadNewOrders, setUnreadNewOrders] = useState<number>(0);
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [activeNewOrderAlert, setActiveNewOrderAlert] = useState<Order | null>(null);

  // References to eliminate unnecessary DB queries during polling
  const lastKnownLatestIdRef = useRef<string | null>(null);
  const lastRevalidateTimeRef = useRef<string | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadDoneRef = useRef<boolean>(false);

  // Initialize notification sound / haptics on mount
  useEffect(() => {
    notificationsService.init();
  }, []);

  // Debounce search input by 350ms to minimize network traffic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load cached orders & metrics instantly on app launch
  useEffect(() => {
    if (!isAuthenticated) return;

    ordersCache.load().then((cached) => {
      if (cached.orders && cached.orders.length > 0) {
        setOrders(cached.orders);
        setTotalFilteredCount(cached.orders.length);
        if (cached.metrics) setMetrics(cached.metrics);
        if (cached.revalidateTime) lastRevalidateTimeRef.current = cached.revalidateTime;
        setLoading(false);
      }
    });
  }, [isAuthenticated]);

  /**
   * Fetch fresh order metrics from Directus via fast database aggregation
   */
  const fetchMetrics = useCallback(async () => {
    try {
      const freshMetrics = await ordersApi.getOrderMetrics();
      setMetrics(freshMetrics);
      return freshMetrics;
    } catch {
      return null;
    }
  }, []);

  /**
   * Load Page 1 of orders with active server-side search and filters
   */
  const loadFirstPage = useCallback(
    async (isPullRefresh = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      if (isPullRefresh) {
        setRefreshing(true);
      } else if (!isInitialLoadDoneRef.current && orders.length === 0) {
        setLoading(true);
      }

      setError(null);

      try {
        const [ordersRes, freshMetrics, revalTime] = await Promise.all([
          ordersApi.getOrders({
            status: statusFilter,
            search: debouncedSearch,
            limit: PAGE_SIZE,
            offset: 0,
          }),
          fetchMetrics(),
          ordersApi.getSettingsRevalidateTime(),
        ]);

        const fetchedOrders = ordersRes.orders;
        const filterCount = ordersRes.filterCount;

        // Track known IDs without discarding previously loaded IDs
        fetchedOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));

        // Track global newest ID only from the unfiltered view
        if (
          !lastKnownLatestIdRef.current &&
          fetchedOrders.length > 0 &&
          statusFilter === 'all' &&
          !debouncedSearch
        ) {
          lastKnownLatestIdRef.current = fetchedOrders[0].id;
        }

        if (revalTime) {
          lastRevalidateTimeRef.current = revalTime;
        }

        setOrders(fetchedOrders);
        setTotalFilteredCount(filterCount);
        setHasMore(fetchedOrders.length < filterCount);
        setLastSynced(new Date());

        // Cache first page for instant display on next app open
        if (statusFilter === 'all' && !debouncedSearch && fetchedOrders.length > 0) {
          ordersCache.save(
            fetchedOrders,
            freshMetrics || metrics,
            revalTime || lastRevalidateTimeRef.current
          );
        }

        isInitialLoadDoneRef.current = true;
      } catch (err: any) {
        console.warn('Orders load failed:', err);
        setError(err?.message || 'Failed to sync orders');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isAuthenticated, statusFilter, debouncedSearch, fetchMetrics, orders.length, metrics]
  );

  // Trigger load whenever authentication, status filter, or debounced search changes
  useEffect(() => {
    if (isAuthenticated) {
      loadFirstPage();
    } else {
      setOrders([]);
      setLoading(false);
    }
  }, [isAuthenticated, statusFilter, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Infinite scroll: load next page when user scrolls to bottom
   */
  const loadMoreOrders = async () => {
    if (loading || loadingMore || !hasMore || orders.length >= totalFilteredCount) {
      return;
    }

    setLoadingMore(true);
    try {
      const res = await ordersApi.getOrders({
        status: statusFilter,
        search: debouncedSearch,
        limit: PAGE_SIZE,
        offset: orders.length,
      });

      if (res.orders.length > 0) {
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => o.id));
          const uniqueNew = res.orders.filter((o) => !existingIds.has(o.id));
          return [...prev, ...uniqueNew];
        });

        // Add to known IDs
        res.orders.forEach((o) => knownOrderIdsRef.current.add(o.id));
      }

      setTotalFilteredCount(res.filterCount);
      setHasMore(orders.length + res.orders.length < res.filterCount);
    } catch (err) {
      console.warn('Failed to load more orders:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  /**
   * Ultra-Lightweight Smart Polling (runs every 25s only while app is in foreground).
   * Instead of pulling heavy order lists, it checks:
   * 1. Settings singleton last_revalidate_time
   * 2. 1-row metadata of the newest order
   * If neither changed, it executes 0 database joins and transfers zero data!
   */
  useEffect(() => {
    if (!isPollingEnabled || !isAuthenticated) return;

    let appState = AppState.currentState;

    const checkRevalidationPing = async () => {
      if (AppState.currentState !== 'active') return;

      try {
        const [latestMeta, serverRevalTime] = await Promise.all([
          ordersApi.getLatestOrderMeta(),
          ordersApi.getSettingsRevalidateTime(),
        ]);

        let needsRefresh = false;

        // Check if server revalidate time changed
        if (
          serverRevalTime &&
          lastRevalidateTimeRef.current &&
          serverRevalTime !== lastRevalidateTimeRef.current
        ) {
          lastRevalidateTimeRef.current = serverRevalTime;
          needsRefresh = true;
        } else if (serverRevalTime && !lastRevalidateTimeRef.current) {
          lastRevalidateTimeRef.current = serverRevalTime;
        }

        // Check if newest order ID changed and is not already known
        if (latestMeta) {
          if (
            lastKnownLatestIdRef.current &&
            latestMeta.id !== lastKnownLatestIdRef.current &&
            !knownOrderIdsRef.current.has(latestMeta.id)
          ) {
            lastKnownLatestIdRef.current = latestMeta.id;
            knownOrderIdsRef.current.add(latestMeta.id);
            // Play alert immediately!
            notificationsService.notifyNewOrder(latestMeta as any);
            setActiveNewOrderAlert(latestMeta as any);
            setUnreadNewOrders((prev) => prev + 1);
            needsRefresh = true;
          } else {
            lastKnownLatestIdRef.current = latestMeta.id;
            knownOrderIdsRef.current.add(latestMeta.id);
          }
        }

        // If something changed on server, re-sync current view and metrics
        if (needsRefresh) {
          loadFirstPage();
        }
      } catch {
        // Silent on transient network blip
      }
    };

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        checkRevalidationPing();
      }
      appState = nextAppState;
    });

    const interval = setInterval(() => {
      checkRevalidationPing();
    }, APP_CONFIG.orderPollIntervalMs);

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isPollingEnabled, isAuthenticated, loadFirstPage]);

  /**
   * Directus WebSocket Realtime listener (Zero-latency instant push)
   */
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
            if (!knownOrderIdsRef.current.has(newOrder.id)) {
              knownOrderIdsRef.current.add(newOrder.id);
              lastKnownLatestIdRef.current = newOrder.id;
              notificationsService.notifyNewOrder(newOrder as any);
              setActiveNewOrderAlert(newOrder as any);
              setUnreadNewOrders((prev) => prev + 1);
              loadFirstPage();
            }
          } else if (ev.event === 'update') {
            loadFirstPage();
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
  }, [isAuthenticated, loadFirstPage]);

  /**
   * Update status with instant optimistic UI update + server sync
   */
  const updateStatus = async (
    orderId: string,
    newStatus: OrderStatus
  ): Promise<boolean> => {
    try {
      const prevOrder = orders.find((o) => o.id === orderId);
      const oldStatus = prevOrder?.status;

      // Optimistic update in list
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId ? { ...ord, status: newStatus } : ord
        )
      );

      // Optimistic update in metrics
      if (oldStatus && oldStatus !== newStatus) {
        setMetrics((prev) => {
          const updated = { ...prev };
          const decKey = `${oldStatus}Count` as keyof OrderSummaryMetrics;
          const incKey = `${newStatus}Count` as keyof OrderSummaryMetrics;
          if (typeof updated[decKey] === 'number') {
            (updated[decKey] as number) = Math.max(0, (updated[decKey] as number) - 1);
          }
          if (typeof updated[incKey] === 'number') {
            (updated[incKey] as number) = (updated[incKey] as number) + 1;
          }
          return updated;
        });
      }

      await ordersApi.updateStatus(orderId, newStatus);
      // Re-fetch metrics in background for exact consistency
      fetchMetrics();
      return true;
    } catch (err) {
      console.error('Failed to update status:', err);
      loadFirstPage();
      return false;
    }
  };

  /**
   * Update extra charges with optimistic UI update + server sync
   */
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
      fetchMetrics();
      return true;
    } catch (err) {
      console.error('Failed to update extra charges:', err);
      loadFirstPage();
      return false;
    }
  };

  const clearUnreadCount = () => {
    setUnreadNewOrders(0);
  };

  const togglePolling = () => {
    setIsPollingEnabled((prev) => !prev);
  };

  return (
    <OrdersContext.Provider
      value={{
        orders,
        filteredOrders: orders, // Alias for backwards compatibility
        loading,
        refreshing,
        loadingMore,
        hasMore,
        totalFilteredCount,
        error,
        statusFilter,
        setStatusFilter,
        searchQuery,
        setSearchQuery,
        lastSynced,
        refreshOrders: () => loadFirstPage(true),
        loadMoreOrders,
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
