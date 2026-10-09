import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
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
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onPress,
  onChangeStatusPress,
  onInvoicePress,
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
      `Hello ${order.name}, thank you for your order #${order.order_id} at Radical Engineering!`
    );
    Linking.openURL(`whatsapp://send?phone=${intlPhone}&text=${message}`).catch(() => {
      Linking.openURL(`https://wa.me/${intlPhone}?text=${message}`);
    });
  };

  const handleCopyOrderId = async () => {
    await Clipboard.setStringAsync(order.order_id || order.id);
  };

  return (
    <View style={styles.card}>
      {/* Clickable Card Body */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
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
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>৳{totalAmount}</Text>
        </TouchableOpacity>

        <View style={styles.actionsGroup}>
          {/* Quick Call */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleCall}
            accessibilityLabel="Call Customer"
          >
            <Ionicons name="call" size={16} color={COLORS.delivered} />
          </TouchableOpacity>

          {/* Quick WhatsApp */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleWhatsApp}
            accessibilityLabel="WhatsApp Customer"
          >
            <Ionicons name="logo-whatsapp" size={17} color="#25D366" />
          </TouchableOpacity>

          {/* Quick Invoice */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={onInvoicePress}
            accessibilityLabel="Generate Invoice"
          >
            <Ionicons name="document-text-outline" size={17} color={COLORS.accent} />
          </TouchableOpacity>

          {/* Change Status */}
          <TouchableOpacity
            style={styles.statusChangeBtn}
            onPress={onChangeStatusPress}
          >
            <Text style={styles.statusChangeBtnText}>Update</Text>
            <Ionicons name="chevron-forward" size={13} color={COLORS.white} />
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
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
    alignItems: 'flex-end',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceVariant,
  },
  totalLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    gap: 3,
  },
  statusChangeBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
});

