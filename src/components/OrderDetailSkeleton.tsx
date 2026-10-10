import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export const OrderDetailSkeleton: React.FC = () => {
  const shimmerAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [shimmerAnim]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Animated.View style={[styles.shimmerBox, styles.backBtnBox, { opacity: shimmerAnim }]} />
          <Animated.View style={[styles.shimmerBox, styles.titleBox, { opacity: shimmerAnim }]} />
        </View>
        <Animated.View style={[styles.shimmerBox, styles.badgeBox, { opacity: shimmerAnim }]} />
      </View>

      <View style={styles.container}>
        {/* Card 1: Customer Details */}
        <View style={styles.card}>
          <View style={styles.customerRow}>
            <Animated.View style={[styles.shimmerBox, styles.avatarBox, { opacity: shimmerAnim }]} />
            <View style={{ flex: 1, gap: 8 }}>
              <Animated.View style={[styles.shimmerBox, styles.lineWide, { opacity: shimmerAnim }]} />
              <Animated.View style={[styles.shimmerBox, styles.lineNarrow, { opacity: shimmerAnim }]} />
            </View>
          </View>
          <View style={{ marginTop: 14, gap: 6 }}>
            <Animated.View style={[styles.shimmerBox, styles.lineFull, { opacity: shimmerAnim }]} />
            <Animated.View style={[styles.shimmerBox, styles.lineMedium, { opacity: shimmerAnim }]} />
          </View>
        </View>

        {/* Card 2: Order Items */}
        <View style={styles.card}>
          <Animated.View style={[styles.shimmerBox, styles.sectionTitle, { opacity: shimmerAnim }]} />
          <View style={styles.itemRow}>
            <Animated.View style={[styles.shimmerBox, styles.itemThumb, { opacity: shimmerAnim }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <Animated.View style={[styles.shimmerBox, styles.lineWide, { opacity: shimmerAnim }]} />
              <Animated.View style={[styles.shimmerBox, styles.lineShort, { opacity: shimmerAnim }]} />
            </View>
            <Animated.View style={[styles.shimmerBox, styles.priceBox, { opacity: shimmerAnim }]} />
          </View>
          <View style={styles.itemRow}>
            <Animated.View style={[styles.shimmerBox, styles.itemThumb, { opacity: shimmerAnim }]} />
            <View style={{ flex: 1, gap: 6 }}>
              <Animated.View style={[styles.shimmerBox, styles.lineWide, { opacity: shimmerAnim }]} />
              <Animated.View style={[styles.shimmerBox, styles.lineShort, { opacity: shimmerAnim }]} />
            </View>
            <Animated.View style={[styles.shimmerBox, styles.priceBox, { opacity: shimmerAnim }]} />
          </View>
        </View>

        {/* Card 3: Financial Summary */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Animated.View style={[styles.shimmerBox, styles.lineShort, { opacity: shimmerAnim }]} />
            <Animated.View style={[styles.shimmerBox, styles.priceBox, { opacity: shimmerAnim }]} />
          </View>
          <View style={styles.summaryRow}>
            <Animated.View style={[styles.shimmerBox, styles.lineShort, { opacity: shimmerAnim }]} />
            <Animated.View style={[styles.shimmerBox, styles.priceBox, { opacity: shimmerAnim }]} />
          </View>
          <View style={[styles.summaryRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
            <Animated.View style={[styles.shimmerBox, styles.lineMedium, { opacity: shimmerAnim }]} />
            <Animated.View style={[styles.shimmerBox, styles.grandTotalBox, { opacity: shimmerAnim }]} />
          </View>
        </View>
      </View>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  container: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shimmerBox: {
    backgroundColor: '#E2E8F0',
    borderRadius: RADIUS.xs,
  },
  backBtnBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
  },
  titleBox: {
    width: 140,
    height: 20,
    borderRadius: 4,
  },
  badgeBox: {
    width: 80,
    height: 28,
    borderRadius: RADIUS.full,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sectionTitle: {
    width: 110,
    height: 16,
    marginBottom: 12,
  },
  lineFull: {
    width: '100%',
    height: 14,
  },
  lineWide: {
    width: '80%',
    height: 16,
  },
  lineMedium: {
    width: '50%',
    height: 14,
  },
  lineNarrow: {
    width: '40%',
    height: 13,
  },
  lineShort: {
    width: '25%',
    height: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemThumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.xs,
  },
  priceBox: {
    width: 60,
    height: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  grandTotalBox: {
    width: 80,
    height: 20,
  },
});

