import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { ordersApi, normalizeExtraCharges } from '../services/ordersApi';
import { OrderDetailSkeleton } from '../components/OrderDetailSkeleton';
import { StatusBadge } from '../components/StatusBadge';
import { StatusChangeModal } from '../components/StatusChangeModal';
import { ExtraChargesModal } from '../components/ExtraChargesModal';
import { invoiceService } from '../services/invoiceService';
import { OrderStatus, ExtraCharge, Order, getOrderUpdaterName } from '../types';
import { APP_CONFIG } from '../constants/config';
import { COLORS, RADIUS, SPACING, STATUS_MAP } from '../constants/theme';

export const OrderDetailScreen: React.FC<{ route: any; navigation: any }> = ({
  route,
  navigation,
}) => {
  const { orderId } = route.params;
  const { user: currentUser } = useAuth();
  const {
    orders,
    updateStatus,
    updateExtraCharges,
    defaultDeliveryCharge,
    markOrderAsViewed,
  } = useOrders();
  const { isOnline } = useNetwork();

  const orderFromContext = orders.find((o) => o.id === orderId);
  const [order, setOrder] = useState<Order | null>(orderFromContext || null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(!orderFromContext);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);

  // Automatically mark this order as viewed so NEW badges are cleared
  useEffect(() => {
    if (orderId) {
      markOrderAsViewed(orderId);
    }
  }, [orderId, markOrderAsViewed]);

  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [extraChargesModalVisible, setExtraChargesModalVisible] =
    useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with context updates if order is present in context
  useEffect(() => {
    if (orderFromContext) {
      setOrder(orderFromContext);
      setIsNotFound(false);
    }
  }, [orderFromContext]);

  // If order is not in currently loaded context page, fetch it from Directus API
  useEffect(() => {
    if (!order && orderId) {
      setLoadingDetail(true);
      ordersApi
        .getOrderById(orderId)
        .then((res) => {
          if (res) {
            setOrder(res);
            setIsNotFound(false);
          } else {
            setIsNotFound(true);
          }
        })
        .catch(() => {
          setIsNotFound(true);
        })
        .finally(() => {
          setLoadingDetail(false);
        });
    }
  }, [order, orderId]);

  // Safe Calculations (declared before any conditional return so hooks stay consistent)
  const rawOrderItems = Array.isArray(order?.order_items)
    ? order.order_items
    : typeof order?.order_items === 'string' && (order.order_items as string).trim()
    ? (() => {
        try {
          return JSON.parse(order.order_items as string);
        } catch {
          return [];
        }
      })()
    : [];

  const itemsSubtotal = rawOrderItems.reduce((sum: number, item: any) => {
    const price = item.product?.discounted_price
      ? Number(item.product.discounted_price)
      : Number(item.product?.price || item.price || 0);
    return sum + (isNaN(price) ? 0 : price) * Number(item.quantity || 1);
  }, 0);

  const extraCharges: ExtraCharge[] = order
    ? normalizeExtraCharges(
        order.extra_charges,
        order.total,
        rawOrderItems
      )
    : [];

  const extraChargesSum = extraCharges.reduce(
    (sum: number, ch: ExtraCharge) => sum + (Number(ch.cost || 0) || 0),
    0
  );

  // If order total had a pre-added checkout delivery charge, sync it to local state & database
  // (Hook is positioned before conditional returns to adhere to React Rules of Hooks)
  useEffect(() => {
    if (
      order &&
      (!order.extra_charges || order.extra_charges.length === 0) &&
      extraCharges.length > 0
    ) {
      setOrder((prev) => (prev ? { ...prev, extra_charges: extraCharges } : null));
      ordersApi
        .updateExtraCharges(order.id, extraCharges, Number(order.total || 0))
        .catch(() => {});
    }
  }, [order?.id, extraCharges.length]);

  // Show shimmer skeleton while fetching
  if ((loadingDetail && !order) || (!order && !isNotFound)) {
    return <OrderDetailSkeleton />;
  }

  // Only show error screen if API confirmed it does not exist (404)
  if (isNotFound && !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={styles.notFoundText}>Order not found.</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return <OrderDetailSkeleton />;
  }

  const cleanPhone = (order.phone || '').replace(/[\s\-\(\)]/g, '');

  const handleCall = () => {
    if (!cleanPhone) return;
    Linking.openURL(`tel:${cleanPhone}`);
  };

  const handleWhatsApp = () => {
    if (!cleanPhone) return;
    let intlPhone = cleanPhone;
    if (intlPhone.startsWith('0')) {
      intlPhone = '88' + intlPhone;
    }
    const message = encodeURIComponent(
      `Hello ${order.name}, regarding your order #${order.order_id || order.id} at Radical Engineering (Total: ৳${Number(order.total || 0).toLocaleString()})...`
    );
    Linking.openURL(`whatsapp://send?phone=${intlPhone}&text=${message}`).catch(() => {
      Linking.openURL(`https://wa.me/${intlPhone}?text=${message}`);
    });
  };

  const handleSms = () => {
    if (!cleanPhone) return;
    Linking.openURL(`sms:${cleanPhone}`);
  };

  const handleCopyOrderId = async () => {
    await Clipboard.setStringAsync(order.order_id || order.id);
    Alert.alert('Copied', 'Order ID copied to clipboard');
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'Cannot update order status while offline. Please connect to the internet to save changes.'
      );
      return;
    }
    const orderNum = order.order_id || order.id;
    const targetLabel = STATUS_MAP[newStatus]?.label || newStatus;

    // Immediately update local state so the screen never drops the order
    setOrder((prev) =>
      prev
        ? {
            ...prev,
            status: newStatus,
            date_updated: new Date().toISOString(),
            last_updated_by: currentUser
              ? {
                  id: currentUser.id,
                  first_name: currentUser.first_name,
                  last_name: currentUser.last_name,
                  email: currentUser.email,
                }
              : prev.last_updated_by,
          }
        : null
    );

    const ok = await updateStatus(order.id, newStatus);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const msg = `✓ Order #${orderNum} status updated to ${targetLabel}`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      Alert.alert('Error', 'Failed to update status');
      setOrder((prev) => (prev ? { ...prev, status: order.status } : null));
    }
  };

  const handleSaveExtraCharges = async (
    charges: ExtraCharge[],
    newTotal: number
  ) => {
    if (!order) return;
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'Cannot save extra charges while offline. Please connect to the internet to save changes.'
      );
      return;
    }
    setOrder((prev) =>
      prev ? { ...prev, extra_charges: charges, total: newTotal } : null
    );

    const ok = await updateExtraCharges(order.id, charges, newTotal);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const msg = `✓ Extra charges updated! Grand total: ৳${newTotal.toLocaleString()}`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      Alert.alert('Error', 'Failed to update extra charges');
      setOrder((prev) =>
        prev
          ? { ...prev, extra_charges: order.extra_charges, total: order.total }
          : null
      );
    }
  };

  const handleShareInvoice = async () => {
    try {
      setIsGeneratingPdf(true);
      await invoiceService.shareInvoice(order);
    } catch (err: any) {
      Alert.alert('Invoice Error', err?.message || 'Failed to create invoice PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintInvoice = async () => {
    try {
      setIsPrinting(true);
      await invoiceService.printDirect(order);
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Failed to send invoice to printer');
    } finally {
      setIsPrinting(false);
    }
  };

  const dateFormatted = order.placed_at
    ? new Date(order.placed_at).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium',
      })
    : 'N/A';

  const updaterName = getOrderUpdaterName(order.last_updated_by);
  const updatedDateFormatted = order.date_updated
    ? new Date(order.date_updated).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.order_id}</Text>
        <TouchableOpacity onPress={handleShareInvoice} disabled={isGeneratingPdf}>
          {isGeneratingPdf ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="share-outline" size={22} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Success Feedback Toast */}
      {toastMessage && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header Bar */}
        <View style={styles.statusBanner}>
          <View style={styles.statusTopRow}>
            <View style={styles.statusBadgeGroup}>
              <Text style={styles.statusBannerLabel}>CURRENT STATUS</Text>
              <StatusBadge status={order.status} size="lg" />
            </View>

            <TouchableOpacity
              style={styles.changeStatusQuickBtn}
              onPress={() => setStatusModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color={COLORS.primary} />
              <Text style={styles.changeStatusQuickBtnText}>Change Status</Text>
            </TouchableOpacity>
          </View>

          {updaterName && (
            <View style={styles.statusUpdaterContainer}>
              <View style={styles.statusUpdaterRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={15}
                  color={COLORS.primary}
                />
                <Text
                  style={styles.statusUpdaterText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Changed by <Text style={styles.statusUpdaterName}>{updaterName}</Text>
                  {updatedDateFormatted ? ` • ${updatedDateFormatted}` : ''}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Customer Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>CUSTOMER DETAILS</Text>
          <View style={styles.customerNameRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {(order.name || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerFullName}>{order.name || 'Customer'}</Text>
              <Text style={styles.customerPhoneText}>{order.phone}</Text>
            </View>
          </View>

          {/* Action Buttons: Call, WhatsApp, SMS */}
          <View style={styles.customerContactActions}>
            <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
              <Ionicons name="call" size={16} color={COLORS.delivered} />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={handleWhatsApp}>
              <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
              <Text style={styles.contactBtnText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactBtn} onPress={handleSms}>
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.accent} />
              <Text style={styles.contactBtnText}>SMS</Text>
            </TouchableOpacity>
          </View>

          {/* Delivery Address */}
          <View style={styles.addressSection}>
            <Ionicons name="location" size={18} color={COLORS.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.addressLabel}>Delivery & Installation Site:</Text>
              <Text style={styles.addressValue}>
                {order.address || 'Standard Delivery'}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>
            ORDER ITEMS ({order.order_items?.length || 0})
          </Text>

          {(order.order_items || []).map((it, idx) => {
            const product = it.product;
            const price = product?.discounted_price
              ? Number(product.discounted_price)
              : Number(product?.price || 0);
            const lineTotal = price * (it.quantity || 1);
            const imgUrl = product?.image
              ? `${APP_CONFIG.assetsBaseUrl}/${product.image}`
              : null;

            return (
              <View key={it.id || idx} style={styles.itemRow}>
                {imgUrl ? (
                  <Image source={{ uri: imgUrl }} style={styles.itemImage} />
                ) : (
                  <View style={styles.itemImagePlaceholder}>
                    <Ionicons name="hardware-chip-outline" size={20} color={COLORS.textSecondary} />
                  </View>
                )}
                <View style={styles.itemDetails}>
                  <Text style={styles.itemTitle}>{product?.name || 'Product'}</Text>
                  {product?.sku && (
                    <Text style={styles.itemSku}>SKU: {product.sku}</Text>
                  )}
                  <Text style={styles.itemQtyPrice}>
                    {it.quantity} x ৳{price.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.itemLineTotal}>
                  ৳{lineTotal.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Extra Charges Section */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithAction}>
            <View>
              <Text style={styles.cardHeaderTitle}>EXTRA CHARGES / ADJUSTMENTS</Text>
              <Text style={styles.cardHeaderSubtitle}>
                Repeater items (delivery, installation, packaging)
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setExtraChargesModalVisible(true)}
              style={styles.smallEditLink}
            >
              <Ionicons name="pencil" size={13} color={COLORS.primary} />
              <Text style={styles.smallEditLinkText}>Manage</Text>
            </TouchableOpacity>
          </View>

          {extraCharges.length === 0 ? (
            <View style={styles.emptyExtraChargesBox}>
              <Text style={styles.noExtraChargesText}>
                No extra charges added yet.
              </Text>
              <View style={styles.quickAddRow}>
                <TouchableOpacity
                  style={styles.addChargeButton}
                  onPress={() => setExtraChargesModalVisible(true)}
                >
                  <Ionicons name="add-circle" size={15} color={COLORS.white} />
                  <Text style={styles.addChargeButtonText}>Add Extra Charge</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickPresetChip}
                  onPress={async () => {
                    const updated = [{ name: 'Delivery Charge', cost: defaultDeliveryCharge }];
                    const newTotal = itemsSubtotal + defaultDeliveryCharge;
                    await handleSaveExtraCharges(updated, newTotal);
                  }}
                >
                  <Ionicons name="flash-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.quickPresetChipText}>
                    + Delivery (৳{defaultDeliveryCharge})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.extraChargesList}>
              {extraCharges.map((ch, idx) => (
                <View key={idx} style={styles.extraChargeItem}>
                  <View style={styles.extraChargeItemLeft}>
                    <View style={styles.extraChargeIcon}>
                      <Ionicons name="pricetag-outline" size={12} color={COLORS.primary} />
                    </View>
                    <Text style={styles.extraChargeName}>{ch.name}</Text>
                  </View>
                  <Text style={styles.extraChargeAmount}>
                    + ৳{Number(ch.cost).toLocaleString()}
                  </Text>
                </View>
              ))}
              <View style={styles.extraChargesFooter}>
                <TouchableOpacity
                  style={styles.addMoreChargesLink}
                  onPress={() => setExtraChargesModalVisible(true)}
                >
                  <Ionicons name="add" size={15} color={COLORS.primary} />
                  <Text style={styles.addMoreChargesLinkText}>Add / Edit More</Text>
                </TouchableOpacity>
                <Text style={styles.extraChargesTotalBadge}>
                  Total: ৳{extraChargesSum.toLocaleString()}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Financial Summary */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>PAYMENT SUMMARY</Text>
          <View style={styles.summaryLine}>
            <Text style={styles.summaryLabel}>Items Subtotal</Text>
            <Text style={styles.summaryValue}>৳{itemsSubtotal.toLocaleString()}</Text>
          </View>
          {extraChargesSum > 0 && (
            <View style={styles.summaryLine}>
              <Text style={styles.summaryLabel}>Extra Charges & Delivery</Text>
              <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
                + ৳{extraChargesSum.toLocaleString()}
              </Text>
            </View>
          )}
          <View style={[styles.summaryLine, styles.grandTotalLine]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>
              ৳{Number(order.total || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Order Meta / Timestamp */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>ORDER TIMELINE</Text>
          <View style={styles.timelineRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.timelineText}>Placed: {dateFormatted}</Text>
          </View>
          {updaterName && (
            <View style={styles.timelineRow}>
              <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.timelineText}>
                Status Changed By: <Text style={{ fontWeight: '700', color: COLORS.text }}>{updaterName}</Text>
                {updatedDateFormatted ? ` (${updatedDateFormatted})` : ''}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.copyOrderIdBtn}
            onPress={handleCopyOrderId}
          >
            <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
            <Text style={styles.copyOrderIdText}>Copy Order ID</Text>
          </TouchableOpacity>
        </View>

        {/* Invoice Generator Action Bar */}
        <View style={styles.invoiceActionsCard}>
          <Text style={styles.invoiceCardTitle}>INVOICE ACTIONS</Text>
          <Text style={styles.invoiceCardDesc}>
            Generate professional customer invoice matching Radical Engineering branding.
          </Text>

          <View style={styles.invoiceButtonsRow}>
            <TouchableOpacity
              style={styles.shareInvoiceBtn}
              onPress={handleShareInvoice}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="share-social" size={18} color={COLORS.white} />
                  <Text style={styles.shareInvoiceBtnText}>Share PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.printInvoiceBtn}
              onPress={handlePrintInvoice}
              disabled={isPrinting}
            >
              {isPrinting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="print-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.printInvoiceBtnText}>Print</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <StatusChangeModal
        visible={statusModalVisible}
        order={order}
        onClose={() => setStatusModalVisible(false)}
        onSelectStatus={handleUpdateStatus}
      />

      <ExtraChargesModal
        visible={extraChargesModalVisible}
        order={order}
        onClose={() => setExtraChargesModalVisible(false)}
        onSave={handleSaveExtraCharges}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  statusBanner: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  statusBadgeGroup: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  statusBannerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  statusUpdaterContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
  },
  statusUpdaterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusUpdaterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  statusUpdaterName: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  changeStatusQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  changeStatusQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallEditLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  smallEditLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  customerFullName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  customerPhoneText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  customerContactActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  addressSection: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  addressValue: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  itemImage: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xs,
    marginRight: 10,
  },
  itemImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  itemSku: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  itemQtyPrice: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  itemLineTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 10,
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  emptyExtraChargesBox: {
    paddingVertical: 10,
  },
  noExtraChargesText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  addChargeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.xs,
  },
  addChargeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  quickPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickPresetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  extraChargesList: {
    marginTop: 6,
  },
  extraChargeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: RADIUS.xs,
    marginBottom: 6,
  },
  extraChargeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  extraChargeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraChargeName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  extraChargeAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  extraChargesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addMoreChargesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  addMoreChargesLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  extraChargesTotalBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  grandTotalLine: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  copyOrderIdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  copyOrderIdText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  invoiceActionsCard: {
    backgroundColor: '#FFFDF9',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.secondary + '80',
  },
  invoiceCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  invoiceCardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 6,
  },
  invoiceButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  shareInvoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    gap: 8,
  },
  shareInvoiceBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  printInvoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    gap: 8,
  },
  printInvoiceBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  notFoundText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  backBtnText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  toastBanner: {
    position: 'absolute',
    top: 56,
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
});

