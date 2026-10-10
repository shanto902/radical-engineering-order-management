import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Order, ExtraCharge } from '../types';
import { COLORS, RADIUS, SPACING } from '../constants/theme';
import { normalizeExtraCharges } from '../services/ordersApi';
import { useOrders } from '../context/OrdersContext';
import { useNetwork } from '../context/NetworkContext';

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
  const { defaultDeliveryCharge } = useOrders();
  const { isOnline } = useNetwork();
  const [chargeName, setChargeName] = useState<string>('');
  const [chargeCost, setChargeCost] = useState<string>('');
  const [chargesList, setChargesList] = useState<ExtraCharge[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  // Sync and normalize charges when modal opens
  useEffect(() => {
    if (order) {
      setChargesList(
        normalizeExtraCharges(order.extra_charges, order.total, order.order_items)
      );
    }
  }, [order, visible]);

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

  const presets = [
    {
      label: `+ Delivery (৳${defaultDeliveryCharge})`,
      name: 'Delivery Charge',
      cost: defaultDeliveryCharge,
    },
    {
      label: '+ Packaging (৳100)',
      name: 'Packaging Charge',
      cost: 100,
    },
    {
      label: '+ Urgent Shipping (৳200)',
      name: 'Urgent Delivery',
      cost: 200,
    },
    {
      label: '+ Installation (৳500)',
      name: 'Installation Fee',
      cost: 500,
    },
  ];

  const handleApplyPreset = (name: string, cost: number) => {
    const existingIndex = chargesList.findIndex(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (existingIndex >= 0) {
      const updated = [...chargesList];
      updated[existingIndex] = { name, cost };
      setChargesList(updated);
    } else {
      setChargesList([...chargesList, { name, cost }]);
    }
  };

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
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'Cannot update extra charges while offline. Please connect to the internet to save changes.'
      );
      return;
    }
    try {
      setSaving(true);
      await onSave(chargesList, calculatedGrandTotal);
      onClose();
    } catch {
      Alert.alert('Error', 'Failed to update extra charges');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoid}
            >
              <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                  <View>
                    <Text style={styles.title}>Extra Charges & Adjustments</Text>
                    <Text style={styles.subtitle}>Order #{order.order_id || order.id}</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.scrollArea}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Quick Preset Pills */}
                  <View style={styles.presetsSection}>
                    <Text style={styles.sectionLabel}>QUICK PRESETS</Text>
                    <View style={styles.presetPillsRow}>
                      {presets.map((preset, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={styles.presetPill}
                          onPress={() => handleApplyPreset(preset.name, preset.cost)}
                        >
                          <Ionicons name="flash-outline" size={13} color={COLORS.primary} />
                          <Text style={styles.presetPillText}>{preset.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Current Extra Charges Repeater List */}
                  <View style={styles.chargesListContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>CURRENT CHARGES ({chargesList.length})</Text>
                      {chargesList.length > 0 && (
                        <Text style={styles.chargesSubtotalBadge}>
                          Total: ৳{extraChargesSum.toLocaleString()}
                        </Text>
                      )}
                    </View>

                    {chargesList.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Ionicons name="receipt-outline" size={24} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No extra charges added yet.</Text>
                      </View>
                    ) : (
                      chargesList.map((item, idx) => (
                        <View key={idx} style={styles.chargeRow}>
                          <View style={styles.chargeRowLeft}>
                            <View style={styles.chargeIconBadge}>
                              <Ionicons name="pricetag-outline" size={14} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.chargeName}>{item.name}</Text>
                              <Text style={styles.chargeCost}>
                                + ৳{Number(item.cost).toLocaleString()}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleRemoveCharge(idx)}
                            style={styles.deleteBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Add New Charge Form */}
                  <View style={styles.addSection}>
                    <Text style={styles.sectionLabel}>ADD CUSTOM CHARGE</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Charge Name (e.g. Delivery, Fitting, Extra Cable)"
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

                  {/* Total Summary Breakdown */}
                  <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Products Subtotal:</Text>
                      <Text style={styles.summaryVal}>৳{itemsSubtotal.toLocaleString()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Extra Charges Total:</Text>
                      <Text style={[styles.summaryVal, { color: COLORS.accent }]}>
                        + ৳{extraChargesSum.toLocaleString()}
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.grandTotalRow]}>
                      <Text style={styles.grandTotalLabel}>Recalculated Grand Total:</Text>
                      <Text style={styles.grandTotalVal}>
                        ৳{calculatedGrandTotal.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                  <Text style={styles.saveBtnText}>
                    {saving ? 'Saving...' : 'Save & Update Total'}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
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
  keyboardAvoid: {
    width: '100%',
    maxHeight: '88%',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: 4,
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
  scrollArea: {
    maxHeight: 460,
  },
  scrollContent: {
    paddingBottom: SPACING.sm,
  },
  presetsSection: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chargesSubtotalBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  presetPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chargesListContainer: {
    marginBottom: SPACING.md,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    padding: 10,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chargeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  chargeIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chargeName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  chargeCost: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
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
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
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
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    paddingTop: 8,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
  },
  grandTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
