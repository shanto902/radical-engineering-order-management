import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    if (order) {
      // Smooth slide-in from top
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      // Auto dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-140);
    }
  }, [order]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -160,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!order) return null;

  const topOffset = insets.top + (Platform.OS === 'android' ? 10 : 8);
  const formattedTotal = Number(order.total || 0).toLocaleString();

  return (
    <Animated.View
      style={[
        styles.bannerWrapper,
        {
          top: topOffset,
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Entire Card is Tappable */}
      <TouchableOpacity
        style={styles.bannerContainer}
        onPress={() => onViewOrder(order)}
        activeOpacity={0.92}
      >
        {/* Left Solar Gold Accent Bar */}
        <View style={styles.goldAccentBar} />

        <View style={styles.cardInner}>
          {/* Top Info Header */}
          <View style={styles.headerRow}>
            <View style={styles.badgePill}>
              <Ionicons name="sparkles" size={11} color="#B45309" />
              <Text style={styles.badgeText}>NEW ORDER</Text>
            </View>

            <Text style={styles.orderNumberText} numberOfLines={1}>
              #{order.order_id || order.id}
            </Text>

            {/* Separate Dismiss Button */}
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                handleDismiss();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Main Body */}
          <View style={styles.bodyRow}>
            {/* Bell Icon Badge */}
            <View style={styles.iconCircle}>
              <Ionicons name="notifications" size={20} color={COLORS.secondary} />
            </View>

            {/* Customer Details */}
            <View style={styles.detailsCol}>
              <Text style={styles.customerName} numberOfLines={1}>
                {order.name || 'New Customer'}
              </Text>
              {order.phone ? (
                <Text style={styles.phoneText} numberOfLines={1}>
                  {order.phone}
                </Text>
              ) : null}
            </View>

            {/* Total Amount & Action Pill */}
            <View style={styles.actionCol}>
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>৳{formattedTotal}</Text>
              </View>
              <View style={styles.viewChip}>
                <Text style={styles.viewChipText}>View</Text>
                <Ionicons name="arrow-forward" size={12} color={COLORS.white} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerWrapper: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 99999,
    elevation: 25,
  },
  bannerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 14,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  goldAccentBar: {
    width: 5,
    backgroundColor: COLORS.secondary,
  },
  cardInner: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    gap: 4,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.4,
  },
  orderNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    flex: 1,
  },
  dismissBtn: {
    padding: 2,
    marginLeft: 6,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  actionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  totalBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  viewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    gap: 3,
  },
  viewChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
});
