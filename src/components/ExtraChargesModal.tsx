import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order, ExtraCharge } from '../types';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface ExtraChargesModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onSave: (charges: ExtraCharge[], newTotal: number) => Promise<void>;
}

export const ExtraChargesModal: React.FC<ExtraChargesModalProps> = ({
  visible,
  order,
  onClose,
  onSave,
}) => {
  const [chargeName, setChargeName] = useState<string>('');
  const [chargeCost, setChargeCost] = useState<string>('');
  const [chargesList, setChargesList] = useState<ExtraCharge[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  // Sync charges when modal opens
  React.useEffect(() => {
    if (order) {
      setChargesList(order.extra_charges || []);
    }
  }, [order]);

  if (!order) return null;

  // Calculate base items total
  const itemsSubtotal = (order.order_items || []).reduce((sum, it) => {
    const price = it.product?.discounted_price
      ? Number(it.product.discounted_price)
      : Number(it.product?.price || 0);
    return sum + price * (it.quantity || 1);
  }, 0);

  const extraChargesSum = chargesList.reduce(
    (sum, ch) => sum + Number(ch.cost || 0),
    0
  );

  const calculatedGrandTotal = itemsSubtotal + extraChargesSum;

  const handleAddCharge = () => {
    if (!chargeName.trim()) {
      Alert.alert('Required', 'Please enter a charge description (e.g. Delivery, Installation)');
      return;
    }
    const costNum = parseFloat(chargeCost.trim());
    if (isNaN(costNum)) {
      Alert.alert('Invalid Cost', 'Please enter a valid amount');
      return;
    }

    const updated = [...chargesList, { name: chargeName.trim(), cost: costNum }];
    setChargesList(updated);
    setChargeName('');
    setChargeCost('');
  };

  const handleRemoveCharge = (index: number) => {
    const updated = chargesList.filter((_, i) => i !== index);
    setChargesList(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(chargesList, calculatedGrandTotal);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to update extra charges in Directus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Extra Charges & Adjustments</Text>
                  <Text style={styles.subtitle}>Order #{order.order_id}</Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Current Extra Charges List */}
              <View style={styles.chargesListContainer}>
                <Text style={styles.sectionLabel}>CURRENT CHARGES</Text>
                {chargesList.length === 0 ? (
                  <Text style={styles.emptyText}>No extra charges added yet.</Text>
                ) : (
                  chargesList.map((item, idx) => (
                    <View key={idx} style={styles.chargeRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.chargeName}>{item.name}</Text>
                        <Text style={styles.chargeCost}>৳{Number(item.cost).toLocaleString()}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveCharge(idx)}
                        style={styles.deleteBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.cancelled} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Add New Charge Form */}
              <View style={styles.addSection}>
                <Text style={styles.sectionLabel}>ADD NEW CHARGE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Charge Name (e.g. Delivery, Wiring, Installation)"
                  placeholderTextColor={COLORS.textMuted}
                  value={chargeName}
                  onChangeText={setChargeName}
                />
                <View style={styles.costRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Amount (৳)"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    value={chargeCost}
                    onChangeText={setChargeCost}
                  />
                  <TouchableOpacity style={styles.addBtn} onPress={handleAddCharge}>
                    <Ionicons name="add" size={18} color={COLORS.white} />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Total Summary */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Items Subtotal:</Text>
                  <Text style={styles.summaryVal}>৳{itemsSubtotal.toLocaleString()}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Extra Charges Total:</Text>
                  <Text style={styles.summaryVal}>৳{extraChargesSum.toLocaleString()}</Text>
                </View>
                <View style={[styles.summaryRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Recalculated Total:</Text>
                  <Text style={styles.grandTotalVal}>৳{calculatedGrandTotal.toLocaleString()}</Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? 'Updating Directus...' : 'Save & Update Total'}
                </Text>
              </TouchableOpacity>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chargesListContainer: {
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    padding: 10,
    borderRadius: RADIUS.xs,
    marginBottom: 6,
  },
  chargeName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  chargeCost: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  deleteBtn: {
    padding: 6,
  },
  addSection: {
    marginBottom: SPACING.md,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 8,
  },
  costRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    borderRadius: RADIUS.xs,
    gap: 4,
  },
  addBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  summaryBox: {
    backgroundColor: COLORS.surfaceVariant,
    padding: 12,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
