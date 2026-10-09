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
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (order) {
      // Slide in from top
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      // Auto dismiss after 7 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 7000);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(-120);
    }
  }, [order]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: -140,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!order) return null;

  const topOffset = insets.top + (Platform.OS === 'android' ? 10 : 8);

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
            activeOpacity={0.8}
          >
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerWrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 20,
  },
  bannerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
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
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  viewBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.sm,
  },
  viewBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
});
