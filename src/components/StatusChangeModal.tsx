import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order, OrderStatus } from '../types';
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
  const [updating, setUpdating] = useState<boolean>(false);
  const [selectedKey, setSelectedKey] = useState<OrderStatus | null>(null);

  if (!order) return null;

  const currentStatus = order.status;

  const handleSelect = async (status: OrderStatus) => {
    if (status === currentStatus) {
      onClose();
      return;
    }

    try {
      setSelectedKey(status);
      setUpdating(true);
      await onSelectStatus(status);
      onClose();
    } finally {
      setUpdating(false);
      setSelectedKey(null);
    }
  };

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
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Update Order Status</Text>
                  <Text style={styles.subtitle}>
                    Order #{order.order_id || order.id} • {order.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} disabled={updating}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Status List */}
              <View style={styles.optionsList}>
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
              </View>
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
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
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
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  optionsList: {
    gap: 10,
    marginTop: 6,
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
});

