import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useOrders } from '../context/OrdersContext';
import { STATUS_MAP, COLORS, RADIUS, SPACING } from '../constants/theme';

export const AnalyticsScreen: React.FC = () => {
  const { orders, metrics } = useOrders();

  const avgOrderValue =
    metrics.totalCount > 0
      ? Math.round(metrics.totalRevenue / metrics.totalCount)
      : 0;

  const deliveredPercentage =
    metrics.totalCount > 0
      ? Math.round((metrics.deliveredCount / metrics.totalCount) * 100)
      : 0;

  const statuses = [
    { key: 'pending', count: metrics.pendingCount },
    { key: 'confirmed', count: metrics.confirmedCount },
    { key: 'processing', count: metrics.processingCount },
    { key: 'shipped', count: metrics.shippedCount },
    { key: 'delivered', count: metrics.deliveredCount },
    { key: 'cancelled', count: metrics.cancelledCount },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ORDER ANALYTICS</Text>
        <Text style={styles.headerSubtitle}>
          Real-time summary from Directus database
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Revenue Card */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>TOTAL SALES REVENUE</Text>
          <Text style={styles.revenueValue}>
            ৳{metrics.totalRevenue.toLocaleString()}
          </Text>
          <View style={styles.revenueSubRow}>
            <View style={styles.subStat}>
              <Text style={styles.subStatLabel}>Avg Order Value</Text>
              <Text style={styles.subStatVal}>৳{avgOrderValue.toLocaleString()}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.subStat}>
              <Text style={styles.subStatLabel}>Delivered Rate</Text>
              <Text style={styles.subStatVal}>{deliveredPercentage}%</Text>
            </View>
          </View>
        </View>

        {/* Quick Highlights */}
        <View style={styles.highlightsGrid}>
          <View style={styles.highlightCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={20} color={COLORS.pending} />
            </View>
            <Text style={styles.highlightNumber}>{metrics.pendingCount}</Text>
            <Text style={styles.highlightLabel}>Awaiting Confirmation</Text>
          </View>

          <View style={styles.highlightCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-done-circle" size={20} color={COLORS.delivered} />
            </View>
            <Text style={styles.highlightNumber}>{metrics.deliveredCount}</Text>
            <Text style={styles.highlightLabel}>Fulfilled & Delivered</Text>
          </View>
        </View>

        {/* Status Distribution */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>STATUS BREAKDOWN</Text>
          <View style={styles.statusList}>
            {statuses.map(({ key, count }) => {
              const conf = STATUS_MAP[key];
              const pct =
                metrics.totalCount > 0
                  ? Math.round((count / metrics.totalCount) * 100)
                  : 0;

              return (
                <View key={key} style={styles.statusRow}>
                  <View style={styles.statusRowHeader}>
                    <View style={styles.statusRowLeft}>
                      <View
                        style={[styles.statusDot, { backgroundColor: conf.color }]}
                      />
                      <Text style={styles.statusRowLabel}>{conf.label}</Text>
                    </View>
                    <Text style={styles.statusRowCount}>
                      {count} ({pct}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: conf.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  revenueCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  revenueLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 0.8,
  },
  revenueValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    marginTop: 6,
    marginBottom: 14,
  },
  revenueSubRow: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'space-around',
  },
  subStat: {
    alignItems: 'center',
  },
  subStatLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  subStatVal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  highlightsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: SPACING.md,
  },
  highlightCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  highlightNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.text,
  },
  highlightLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  statusList: {
    gap: 14,
  },
  statusRow: {},
  statusRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusRowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusRowCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

