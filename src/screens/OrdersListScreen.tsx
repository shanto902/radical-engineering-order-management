import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOrders } from '../context/OrdersContext';
import { useNetwork } from '../context/NetworkContext';
import { OrderCard } from '../components/OrderCard';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { invoiceService } from '../services/invoiceService';
import { ordersApi } from '../services/ordersApi';
import { Order, FilterStatus, OrderStatus } from '../types';
import { COLORS, RADIUS, SPACING, STATUS_MAP } from '../constants/theme';

const STATUS_FILTERS: { key: FilterStatus; label: string; countKey?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

export const OrdersListScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  const { isOnline, checkConnection } = useNetwork();
  const {
    orders,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    totalFilteredCount,
    error,
    refreshOrders,
    loadMoreOrders,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    metrics,
    updateStatus,
    unreadNewOrders,
    clearUnreadCount,
    isPollingEnabled,
    activeNewOrderAlert,
    dismissNewOrderAlert,
    isOrderNew,
    markOrderAsViewed,
  } = useOrders();

  const flatListRef = useRef<FlatList<Order>>(null);

  const [selectedOrderForStatus, setSelectedOrderForStatus] =
    useState<Order | null>(null);
  const [sharingOrderId, setSharingOrderId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show toast notification when refresh encounters offline error while cached orders are displayed
  useEffect(() => {
    if (error && orders.length > 0) {
      setToastMessage('⚠️ No internet connection. Showing cached orders.');
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error, orders.length]);

  const handleOpenStatusModal = (order: Order) => {
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'Cannot update order status while offline. Please connect to the internet to save changes.'
      );
      return;
    }
    setSelectedOrderForStatus(order);
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!selectedOrderForStatus) return;
    const orderNum = selectedOrderForStatus.order_id || selectedOrderForStatus.id;
    const targetLabel = STATUS_MAP[newStatus]?.label || newStatus;

    const success = await updateStatus(selectedOrderForStatus.id, newStatus);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const msg = `✓ Order #${orderNum} status updated to ${targetLabel}`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleShareInvoice = async (order: Order) => {
    if (sharingOrderId) return;
    setSharingOrderId(order.id);
    try {
      let targetOrder = order;
      if (!order.order_items || order.order_items.length === 0) {
        const full = await ordersApi.getOrderById(order.id);
        if (full) targetOrder = full;
      }
      await invoiceService.shareInvoice(targetOrder);
    } catch (err: any) {
      Alert.alert('Invoice Error', err?.message || 'Could not generate invoice PDF');
    } finally {
      setSharingOrderId(null);
    }
  };

  const getFilterBadgeCount = (key: FilterStatus) => {
    switch (key) {
      case 'all':
        return metrics.totalCount;
      case 'pending':
        return metrics.pendingCount;
      case 'confirmed':
        return metrics.confirmedCount;
      case 'processing':
        return metrics.processingCount;
      case 'shipped':
        return metrics.shippedCount;
      case 'delivered':
        return metrics.deliveredCount;
      case 'cancelled':
        return metrics.cancelledCount;
      default:
        return 0;
    }
  };

  const handlePressNewOrdersBadge = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // 1. If not on an 'all' or 'pending' filter, switch so the new order is visible
    if (statusFilter !== 'all' && statusFilter !== 'pending') {
      setStatusFilter('pending');
    }
    // 2. Clear any active search query that might hide the new order
    if (searchQuery) {
      setSearchQuery('');
    }
    // 3. Scroll to the top of the list smoothly
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

    // 4. Target the active new order or first unread order
    const targetOrder =
      (activeNewOrderAlert && (!activeNewOrderAlert.status || activeNewOrderAlert.status === 'pending')
        ? activeNewOrderAlert
        : null) ||
      orders.find((o) => o.status === 'pending' && isOrderNew(o.id, o.placed_at, o.status));

    if (targetOrder) {
      markOrderAsViewed(targetOrder.id);
      navigation.navigate('OrderDetail', { orderId: targetOrder.id });
    } else {
      clearUnreadCount();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyTitle}>RADICAL ORDERS</Text>
          <TouchableOpacity
            style={styles.syncStatusRow}
            onPress={() => {
              if (!isOnline) {
                checkConnection().then((ok) => {
                  if (ok) refreshOrders();
                });
              }
            }}
            activeOpacity={!isOnline ? 0.7 : 1}
          >
            <View
              style={[
                styles.liveDot,
                {
                  backgroundColor: !isOnline
                    ? COLORS.danger
                    : isPollingEnabled
                    ? '#16A34A'
                    : '#94A3B8',
                },
              ]}
            />
            <Text
              style={[
                styles.syncStatusText,
                !isOnline && { color: COLORS.danger, fontWeight: '700' },
              ]}
            >
              {!isOnline
                ? 'Offline (Tap to reconnect)'
                : isPollingEnabled
                ? 'Live Sync Active'
                : 'Sync Paused'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerRight}>
          {unreadNewOrders > 0 && (
            <TouchableOpacity
              style={styles.notificationPill}
              onPress={handlePressNewOrdersBadge}
            >
              <Ionicons name="notifications" size={15} color={COLORS.white} />
              <Text style={styles.notificationPillText}>
                {unreadNewOrders} New
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={async () => {
              const ok = await checkConnection();
              if (!ok) {
                setToastMessage('⚠️ No internet connection. Showing cached orders.');
                setTimeout(() => setToastMessage(null), 4000);
              }
              refreshOrders();
            }}
            disabled={refreshing}
          >
            <Ionicons
              name="reload-outline"
              size={20}
              color={COLORS.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bodyContainer}>
        {/* Success Feedback Toast */}
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Metrics Banner */}
        <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>{metrics.totalCount}</Text>
          <Text style={styles.metricLabel}>Total Orders</Text>
        </View>
        <View style={[styles.metricCard, styles.pendingMetricCard]}>
          <Text style={[styles.metricNumber, { color: COLORS.pending }]}>
            {metrics.pendingCount}
          </Text>
          <Text style={styles.metricLabel}>Needs Action</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricNumber}>
            ৳{(metrics.totalRevenue / 1000).toFixed(0)}k
          </Text>
          <Text style={styles.metricLabel}>Total Value</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search-outline"
          size={18}
          color={COLORS.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Order ID, name, phone..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        >
          {STATUS_FILTERS.map((item) => {
            const isSelected = statusFilter === item.key;
            const count = getFilterBadgeCount(item.key);

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
                onPress={() => setStatusFilter(item.key)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.filterBadge,
                      isSelected && styles.filterBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterBadgeText,
                        isSelected && styles.filterBadgeTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active New Order Alert Banner */}
      {activeNewOrderAlert && (!activeNewOrderAlert.status || activeNewOrderAlert.status === 'pending') && (
        <TouchableOpacity
          style={styles.newOrderAlertBanner}
          onPress={() => {
            const alertOrder = activeNewOrderAlert;
            dismissNewOrderAlert();
            markOrderAsViewed(alertOrder.id);
            navigation.navigate('OrderDetail', { orderId: alertOrder.id });
          }}
          activeOpacity={0.9}
        >
          <View style={styles.newOrderAlertLeft}>
            <View style={styles.newOrderAlertIconBadge}>
              <Ionicons name="notifications" size={16} color={COLORS.white} />
            </View>
            <View style={styles.newOrderAlertTextCol}>
              <Text style={styles.newOrderAlertTitle} numberOfLines={1} ellipsizeMode="tail">
                NEW ORDER ARRIVED
              </Text>
              <Text style={styles.newOrderAlertSub} numberOfLines={1} ellipsizeMode="tail">
                #{activeNewOrderAlert.order_id || activeNewOrderAlert.id} • {activeNewOrderAlert.name || 'Customer'} (৳{Number(activeNewOrderAlert.total || 0).toLocaleString()})
              </Text>
            </View>
          </View>
          <View style={styles.newOrderAlertRight}>
            <View style={styles.newOrderAlertActionBtn}>
              <Text style={styles.newOrderAlertActionText}>Open</Text>
              <Ionicons name="arrow-forward" size={12} color={COLORS.white} />
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                dismissNewOrderAlert();
              }}
              style={styles.newOrderAlertDismissBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={16} color="#92400E" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Orders List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : error && orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons
            name={
              !isOnline || error.toLowerCase().includes('internet')
                ? 'cloud-offline-outline'
                : 'alert-circle-outline'
            }
            size={52}
            color={COLORS.danger}
          />
          <Text style={styles.emptyTitle}>
            {!isOnline || error.toLowerCase().includes('internet')
              ? 'No Internet Connection'
              : 'Connection Error'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {!isOnline || error.toLowerCase().includes('internet')
              ? 'Unable to sync orders. Please check your internet connection and try again.'
              : error}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={async () => {
              await checkConnection();
              refreshOrders();
            }}
          >
            <Ionicons name="refresh" size={15} color={COLORS.white} />
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMoreOrders}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                const ok = await checkConnection();
                if (!ok) {
                  setToastMessage('⚠️ No internet connection. Showing cached orders.');
                  setTimeout(() => setToastMessage(null), 4000);
                }
                refreshOrders();
              }}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.footerLoaderText}>Loading more orders...</Text>
              </View>
            ) : orders.length > 0 && !hasMore ? (
              <View style={styles.footerEnd}>
                <Text style={styles.footerEndText}>
                  Showing all {totalFilteredCount} {statusFilter === 'all' ? '' : statusFilter} orders
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              isNew={isOrderNew(item.id, item.placed_at, item.status)}
              onPress={() => {
                markOrderAsViewed(item.id);
                navigation.navigate('OrderDetail', { orderId: item.id });
              }}
              onChangeStatusPress={() => handleOpenStatusModal(item)}
              onInvoicePress={() => handleShareInvoice(item)}
              isSharingInvoice={sharingOrderId === item.id}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {!isOnline || (error && error.toLowerCase().includes('internet')) ? (
                <>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={48}
                    color={COLORS.danger}
                  />
                  <Text style={styles.emptyTitle}>No Internet Connection</Text>
                  <Text style={styles.emptySubtitle}>
                    Cannot load orders while offline. Connect to the internet and tap retry.
                  </Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={async () => {
                      await checkConnection();
                      refreshOrders();
                    }}
                  >
                    <Ionicons name="refresh" size={14} color={COLORS.white} />
                    <Text style={styles.retryBtnText}>Retry Connection</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons
                    name="file-tray-outline"
                    size={48}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.emptyTitle}>No Orders Found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? 'No orders match your search query.'
                      : `No orders in "${statusFilter}" status.`}
                  </Text>
                </>
              )}
            </View>
          }
        />
      )}
      </View>

      {/* Status Changer Modal */}
      <StatusChangeModal
        visible={!!selectedOrderForStatus}
        order={selectedOrderForStatus}
        onClose={() => setSelectedOrderForStatus(null)}
        onSelectStatus={handleUpdateStatus}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  bodyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  syncStatusText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pending,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  notificationPillText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pendingMetricCard: {
    borderColor: COLORS.pending + '60',
    backgroundColor: '#FFFBEB',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginTop: 1,
    textTransform: 'uppercase',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    padding: 0,
  },
  filtersWrapper: {
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  filtersList: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterBadgeTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  retryBtnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  toastBanner: {
    position: 'absolute',
    top: 10,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: '#065F46',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    gap: 8,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  footerLoader: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  footerEnd: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerEndText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  newOrderAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: RADIUS.sm,
    marginHorizontal: SPACING.md,
    marginTop: 8,
    marginBottom: 4,
    padding: 10,
  },
  newOrderAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 10,
    marginRight: 10,
  },
  newOrderAlertIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  newOrderAlertTextCol: {
    flex: 1,
    minWidth: 0,
  },
  newOrderAlertTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#92400E',
    letterSpacing: 0.5,
  },
  newOrderAlertSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F',
    marginTop: 2,
  },
  newOrderAlertRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 6,
  },
  newOrderAlertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B45309',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    gap: 4,
  },
  newOrderAlertActionText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  newOrderAlertDismissBtn: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.xs,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

