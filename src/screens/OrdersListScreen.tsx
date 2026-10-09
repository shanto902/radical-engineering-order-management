import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '../context/OrdersContext';
import { OrderCard } from '../components/OrderCard';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { invoiceService } from '../services/invoiceService';
import { Order, FilterStatus, OrderStatus } from '../types';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

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
  const {
    filteredOrders,
    loading,
    refreshing,
    error,
    refreshOrders,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    metrics,
    updateStatus,
    unreadNewOrders,
    clearUnreadCount,
    isPollingEnabled,
  } = useOrders();

  const [selectedOrderForStatus, setSelectedOrderForStatus] =
    useState<Order | null>(null);
  const [sharingInvoice, setSharingInvoice] = useState<boolean>(false);

  const handleOpenStatusModal = (order: Order) => {
    setSelectedOrderForStatus(order);
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!selectedOrderForStatus) return;
    const success = await updateStatus(selectedOrderForStatus.id, newStatus);
    if (!success) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleShareInvoice = async (order: Order) => {
    setSharingInvoice(true);
    try {
      await invoiceService.shareInvoice(order);
    } catch {
      Alert.alert('Error', 'Could not generate invoice PDF');
    } finally {
      setSharingInvoice(false);
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.companyTitle}>RADICAL ORDERS</Text>
          <View style={styles.syncStatusRow}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isPollingEnabled ? '#16A34A' : '#94A3B8' },
              ]}
            />
            <Text style={styles.syncStatusText}>
              {isPollingEnabled ? 'Live Sync Active' : 'Sync Paused'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {unreadNewOrders > 0 && (
            <TouchableOpacity
              style={styles.notificationPill}
              onPress={clearUnreadCount}
            >
              <Ionicons name="notifications" size={15} color={COLORS.white} />
              <Text style={styles.notificationPillText}>
                {unreadNewOrders} New
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={refreshOrders}
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

      {/* Orders List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders from Directus...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refreshOrders}>
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshOrders}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() =>
                navigation.navigate('OrderDetail', { orderId: item.id })
              }
              onChangeStatusPress={() => handleOpenStatusModal(item)}
              onInvoicePress={() => handleShareInvoice(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
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
            </View>
          }
        />
      )}

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
});

