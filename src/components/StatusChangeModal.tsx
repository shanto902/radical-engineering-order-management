import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { Order, OrderStatus, getOrderUpdaterName } from '../types';
import { STATUS_MAP, COLORS, RADIUS, SPACING } from '../constants/theme';

interface StatusChangeModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSelectStatus: (status: OrderStatus) => Promise<void>;
}

const STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  visible,
  order,
  onClose,
  onSelectStatus,
}) => {
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();
  const [updating, setUpdating] = useState<boolean>(false);
  const [selectedKey, setSelectedKey] = useState<OrderStatus | null>(null);

  if (!order) return null;

  const currentStatus = order.status;
  const grandTotal = Number(order.total || 0).toLocaleString();
  const updaterName = getOrderUpdaterName(order.last_updated_by);

  const handleSelect = (status: OrderStatus) => {
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'Cannot update order status while offline. Please connect to the internet to save changes.'
      );
      return;
    }

    if (status === currentStatus) {
      onClose();
      return;
    }

    const currentConf = STATUS_MAP[currentStatus] || { label: currentStatus };
    const targetConf = STATUS_MAP[status] || { label: status };

    Alert.alert(
      'Confirm Status Change',
      `Are you sure you want to change Order #${order.order_id || order.id} from "${currentConf.label}" to "${targetConf.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: status === 'cancelled' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setSelectedKey(status);
              setUpdating(true);
              await onSelectStatus(status);
              onClose();
            } finally {
              setUpdating(false);
              setSelectedKey(null);
            }
          },
        },
      ]
    );
  };

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 16) + SPACING.md;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { paddingBottom: bottomPadding }]}>
              {/* Header with Grand Total */}
              <View style={styles.header}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.title}>Update Order Status</Text>
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalBadgeText}>৳{grandTotal}</Text>
                    </View>
                  </View>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    Order #{order.order_id || order.id} • {order.name || 'Customer'}
                  </Text>
                  {updaterName && (
                    <View style={styles.updaterRow}>
                      <Ionicons name="person-circle" size={13} color={COLORS.primary} />
                      <Text style={styles.updaterSubtitle} numberOfLines={1}>
                        Last changed by {updaterName}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  disabled={updating}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {!isOnline && (
                <View style={styles.offlineWarningBox}>
                  <Ionicons name="cloud-offline" size={14} color="#991B1B" />
                  <Text style={styles.offlineWarningText}>
                    Offline Mode • Reconnect to save status changes
                  </Text>
                </View>
              )}

              {/* Scrollable Status List */}
              <ScrollView
                style={styles.optionsScrollView}
                contentContainerStyle={styles.optionsList}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {STATUS_OPTIONS.map((st) => {
                  const conf = STATUS_MAP[st];
                  const isCurrent = currentStatus === st;
                  const isBeingSelected = selectedKey === st && updating;

                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.optionItem,
                        isCurrent && styles.activeOptionItem,
                        { borderColor: conf.color + '60' },
                      ]}
                      onPress={() => handleSelect(st)}
                      disabled={updating}
                    >
                      <View style={styles.optionLeft}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: conf.color },
                          ]}
                        />
                        <Ionicons
                          name={conf.icon as any}
                          size={18}
                          color={conf.color}
                          style={styles.optionIcon}
                        />
                        <Text
                          style={[
                            styles.optionLabel,
                            isCurrent && styles.activeOptionLabel,
                          ]}
                        >
                          {conf.label}
                        </Text>
                      </View>

                      {isBeingSelected ? (
                        <ActivityIndicator size="small" color={conf.color} />
                      ) : isCurrent ? (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={COLORS.textMuted}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  totalBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  updaterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  updaterSubtitle: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  optionsScrollView: {
    maxHeight: 380,
  },
  optionsList: {
    gap: 10,
    paddingVertical: 4,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    backgroundColor: COLORS.card,
  },
  activeOptionItem: {
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 2,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  optionIcon: {
    marginRight: 8,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  activeOptionLabel: {
    fontWeight: '800',
    color: COLORS.primary,
  },
  currentBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  offlineWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#F87171',
    borderRadius: RADIUS.xs,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginHorizontal: SPACING.md,
    marginBottom: 8,
    gap: 6,
  },
  offlineWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
    flex: 1,
  },
});

