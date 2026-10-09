import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useOrders } from '../context/OrdersContext';
import { useAuth } from '../context/AuthContext';
import { notificationsService } from '../services/notifications';
import { APP_CONFIG } from '../constants/config';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export const SettingsScreen: React.FC = () => {
  const {
    isPollingEnabled,
    togglePolling,
    isRealtimeConnected,
    lastSynced,
    refreshOrders,
    triggerDemoAlert,
  } = useOrders();
  const { user, logout } = useAuth();

  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    notificationsService.getExpoPushToken().then(setPushToken);
  }, []);

  const handleTestNotification = () => {
    const dummyOrder = {
      id: 'demo-test',
      order_id: 'TEST' + Math.floor(1000 + Math.random() * 9000),
      name: 'Ashik Ali (Test Order)',
      phone: '01760195100',
      address: 'Kishoreganj Showroom',
      status: 'pending' as const,
      total: 80300,
      placed_at: new Date().toISOString(),
      order_items: [
        {
          id: '1',
          quantity: 1,
          product: { id: 'p1', name: 'Growatt 16kwh Lithium Battery' },
        },
      ],
    };

    triggerDemoAlert(dummyOrder);
  };

  const handleCopyPushToken = async () => {
    if (pushToken) {
      await Clipboard.setStringAsync(pushToken);
      Alert.alert('Copied', 'Expo Push Token copied to clipboard');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Directus?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') ||
      user.email
    : 'Authenticated Staff';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS & SYSTEM</Text>
        <Text style={styles.headerSubtitle}>
          Directus API configuration and notification controls
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Account Profile */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>AUTHENTICATED STAFF PROFILE</Text>
          <View style={styles.userProfileRow}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userNameText}>{displayName}</Text>
              <Text style={styles.userEmailText}>{user?.email || 'Directus Authenticated'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {typeof user?.role === 'object' && user?.role?.name
                    ? user.role.name
                    : 'Authorized Staff'}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={17} color={COLORS.danger} />
            <Text style={styles.logoutBtnText}>Sign Out of Directus</Text>
          </TouchableOpacity>
        </View>

        {/* Real-time Order Alerts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ORDER NOTIFICATIONS & SYNC</Text>

          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingLabel}>Active Live Polling</Text>
              <Text style={styles.settingDesc}>
                Auto-syncs Directus every 25 seconds for new orders while the app is active
              </Text>
            </View>
            <Switch
              value={isPollingEnabled}
              onValueChange={togglePolling}
              trackColor={{ false: '#CBD5E1', true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <TouchableOpacity
            style={styles.testNotificationBtn}
            onPress={handleTestNotification}
          >
            <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
            <Text style={styles.testNotificationBtnText}>
              Test Order Alert & Vibration
            </Text>
          </TouchableOpacity>
        </View>

        {/* Directus Connection Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DIRECTUS BACKEND CONNECTION</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Server Endpoint:</Text>
            <Text style={styles.infoVal}>{APP_CONFIG.apiBaseUrl}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Realtime WebSocket:</Text>
            <Text
              style={[
                styles.infoVal,
                {
                  color: isRealtimeConnected ? COLORS.delivered : COLORS.warning,
                  fontWeight: '700',
                },
              ]}
            >
              {isRealtimeConnected
                ? '● Connected (0ms Push)'
                : '○ Connecting / Ping Poller'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Orders Collection:</Text>
            <Text style={styles.infoVal}>orders</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Items Collection:</Text>
            <Text style={styles.infoVal}>order_items</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Token Configured:</Text>
            <Text style={[styles.infoVal, { color: COLORS.delivered }]}>
              ✓ Connected ({APP_CONFIG.accessToken ? 'Active' : 'Missing'})
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Successful Sync:</Text>
            <Text style={styles.infoVal}>
              {lastSynced ? lastSynced.toLocaleTimeString() : 'Pending'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.manualSyncBtn}
            onPress={refreshOrders}
          >
            <Ionicons name="refresh" size={16} color={COLORS.white} />
            <Text style={styles.manualSyncBtnText}>Force Sync Now</Text>
          </TouchableOpacity>
        </View>

        {/* Expo Push Token for Directus Flow Webhooks */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EXPO PUSH NOTIFICATION TOKEN</Text>
          <Text style={styles.cardDesc}>
            Use this token to set up Directus Flow webhooks so the server can push alerts even when the app is completely closed.
          </Text>

          {pushToken ? (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText} numberOfLines={2}>
                {pushToken}
              </Text>
              <TouchableOpacity
                style={styles.copyTokenBtn}
                onPress={handleCopyPushToken}
              >
                <Ionicons name="copy-outline" size={14} color={COLORS.primary} />
                <Text style={styles.copyTokenBtnText}>Copy Token</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noTokenText}>
              {notificationsService.isExpoGo()
                ? 'ℹ️ Running in Expo Go: Live polling and in-app order alerts are fully active. Remote push tokens require a development build.'
                : 'Available on physical devices with standalone EAS build.'}
            </Text>
          )}
        </View>

        {/* Company Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RADICAL ENGINEERING BD</Text>
          <Text style={styles.companyAddress}>{APP_CONFIG.address}</Text>
          <Text style={styles.companyContact}>
            Hotline: {APP_CONFIG.hotline1} • {APP_CONFIG.email}
          </Text>
          <Text style={styles.versionText}>
            Order Management App • v1.0.0
          </Text>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  testNotificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
    gap: 8,
  },
  testNotificationBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceVariant,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  manualSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: RADIUS.sm,
    marginTop: 12,
    gap: 6,
  },
  manualSyncBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  tokenBox: {
    backgroundColor: COLORS.surfaceVariant,
    padding: 10,
    borderRadius: RADIUS.xs,
  },
  tokenText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  copyTokenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  copyTokenBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  noTokenText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  companyAddress: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 16,
  },
  companyContact: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  versionText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 10,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  roleBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});

