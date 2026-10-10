import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Order } from '../types';
import { StatusBadge } from './StatusBadge';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface OrderCardProps {
  order: Order;
  onPress: () => void;
  onChangeStatusPress: () => void;
  onInvoicePress: () => void;
  isSharingInvoice?: boolean;
  isNew?: boolean;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onChangeStatusPress,
  onInvoicePress,
  isSharingInvoice = false,
  isNew = false,
}) => {
  const itemsCount = order.order_items?.length || 0;
  const totalAmount = Number(order.total || 0).toLocaleString();

  // Create items preview text
  const itemsPreview = (order.order_items || [])
    .map((it) => `${it.quantity}x ${it.product?.name || 'Item'}`)
    .slice(0, 2)
    .join(', ');

  const remainingItemsCount =
    itemsCount > 2 ? itemsCount - 2 : 0;

  const dateFormatted = order.placed_at
    ? new Date(order.placed_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

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
      `Hello ${order.name}, thank you for your order #${order.order_id || order.id} at Radical Engineering! Total: ৳${totalAmount}.`
    );
    Linking.openURL(`whatsapp://send?phone=${intlPhone}&text=${message}`).catch(() => {
      Linking.openURL(`https://wa.me/${intlPhone}?text=${message}`);
    });
  };

  const handleCopyOrderId = async () => {
    await Clipboard.setStringAsync(order.order_id || order.id);
  };

  // Only show the NEW badge & border if the order is actually pending!
  // If status is changed (by another admin or current staff), it is no longer new.
  const showNew = Boolean(isNew && order.status === 'pending');

  return (
    <View style={[styles.card, showNew && styles.newOrderCard]}>
      {/* Clickable Card Body */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              style={styles.orderIdContainer}
              onPress={handleCopyOrderId}
              activeOpacity={0.7}
            >
              <Text style={styles.orderIdText}>#{order.order_id || order.id}</Text>
              <Ionicons
                name="copy-outline"
                size={13}
                color={COLORS.textSecondary}
                style={styles.copyIcon}
              />
            </TouchableOpacity>

            {showNew && (
              <View style={styles.newBadge}>
                <Ionicons name="sparkles" size={10} color="#B45309" />
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <StatusBadge status={order.status} size="sm" />
        </View>

        {/* Customer Information */}
        <View style={styles.customerSection}>
          <View style={styles.customerNameRow}>
            <Ionicons name="person" size={15} color={COLORS.primary} />
            <Text style={styles.customerName}>{order.name || 'Customer'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.addressText} numberOfLines={1}>
              {order.address || 'Address not specified'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.dateText}>{dateFormatted}</Text>
          </View>
        </View>

        {/* Items Preview */}
        <View style={styles.itemsBox}>
          <Ionicons name="cube-outline" size={14} color={COLORS.accent} />
          <Text style={styles.itemsText} numberOfLines={1}>
            {itemsPreview || 'Order details'}
            {remainingItemsCount > 0 && ` +${remainingItemsCount} more`}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Bottom Footer: Total + Action Buttons (Unnested for instant responsiveness) */}
      <View style={styles.footerRow}>
        <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.totalBox}>
          <Text style={styles.totalLabel}>Grand Total</Text>
          <Text
            style={styles.totalAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            ৳{totalAmount}
          </Text>
        </TouchableOpacity>

        <View style={styles.actionsGroup}>
          {/* Quick Call */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleCall}
            accessibilityLabel="Call Customer"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call" size={15} color={COLORS.delivered} />
          </TouchableOpacity>

          {/* Quick WhatsApp */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleWhatsApp}
            accessibilityLabel="WhatsApp Customer"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>

          {/* Quick Invoice */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onInvoicePress}
            disabled={isSharingInvoice}
            accessibilityLabel="Generate Invoice"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSharingInvoice ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Ionicons name="document-text-outline" size={16} color={COLORS.accent} />
            )}
          </TouchableOpacity>

          {/* Change Status */}
          <TouchableOpacity
            style={styles.statusChangeBtn}
            onPress={onChangeStatusPress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.statusChangeBtnText}>Update</Text>
            <Ionicons name="chevron-forward" size={12} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  newOrderCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    borderColor: '#FCD34D',
    backgroundColor: '#FFFEF5',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    gap: 3,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.6,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  copyIcon: {
    marginLeft: 6,
  },
  customerSection: {
    marginTop: SPACING.sm,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginLeft: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  itemsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: RADIUS.xs,
    marginTop: SPACING.sm,
  },
  itemsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
    gap: 8,
  },
  totalBox: {
    flex: 1,
    minWidth: 85,
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 1,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  statusChangeBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

