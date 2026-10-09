import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  Order,
  OrderStatus,
  FilterStatus,
  OrderSummaryMetrics,
  ExtraCharge,
} from '../types';
import { ordersApi } from '../services/ordersApi';
import { notificationsService } from '../services/notifications';
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
}

const OrdersContext = createContext<OrdersContextType | undefined>(undefined);

export const OrdersProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [unreadNewOrders, setUnreadNewOrders] = useState<number>(0);
  const [isPollingEnabled, setIsPollingEnabled] = useState<boolean>(true);

  // Track known order IDs to detect newly arrived orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  // Initialize notification permissions once on mount
  useEffect(() => {
    notificationsService.init();
  }, []);

  const loadOrders = useCallback(async (isPullRefresh = false) => {
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
          // Notify user about the newest order
          notificationsService.notifyNewOrder(newlyArrived[0]);
          setUnreadNewOrders((prev) => prev + newlyArrived.length);
        }
      }

      // Update known set
      const currentIds = new Set(fetched.map((o) => o.id));
      knownOrderIdsRef.current = currentIds;

      setOrders(fetched);
      setLastSynced(new Date());
      isFirstLoadRef.current = false;
    } catch (err: any) {
      console.warn('Orders load failed:', err);
      setError(err?.message || 'Failed to sync orders from Directus');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Periodic polling for real-time order alerts
  useEffect(() => {
    if (!isPollingEnabled) return;

    const interval = setInterval(() => {
      loadOrders();
    }, APP_CONFIG.orderPollIntervalMs);

    return () => clearInterval(interval);
  }, [isPollingEnabled, loadOrders]);

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

