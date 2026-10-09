import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order } from '../types';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface NewOrderAlertBannerProps {
  order: Order | null;
  onViewOrder: (order: Order) => void;
  onDismiss: () => void;
}

export const NewOrderAlertBanner: React.FC<NewOrderAlertBannerProps> = ({
  order,
  onViewOrder,
  onDismiss,
}) => {
  if (!order) return null;

  return (
    <View style={styles.bannerWrapper}>
      <View style={styles.bannerContainer}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={20} color={COLORS.white} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>🎉 New Order Received!</Text>
            <Text style={styles.orderIdText}>#{order.order_id || order.id}</Text>
          </View>
          <Text style={styles.customerText} numberOfLines={1}>
            {order.name} • ৳{Number(order.total || 0).toLocaleString()}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => onViewOrder(order)}
          >
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
            <Ionicons name="close" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    left: 14,
    right: 14,
    zIndex: 9999,
  },
  bannerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  customerText: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 2,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  viewBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
  },
  viewBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
});

