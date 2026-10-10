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
  const [discountName, setDiscountName] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
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

  const positiveChargesSum = chargesList
    .filter((ch) => Number(ch.cost || 0) > 0)
    .reduce((sum, ch) => sum + Number(ch.cost || 0), 0);

  const discountChargesSum = chargesList
    .filter((ch) => Number(ch.cost || 0) < 0)
    .reduce((sum, ch) => sum + Math.abs(Number(ch.cost || 0)), 0);

  const calculatedGrandTotal = Math.max(0, itemsSubtotal + extraChargesSum);

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

  const handleAddDiscount = () => {
    const rawVal = discountAmount.trim();
    if (!rawVal) {
      Alert.alert('Required', 'Please enter a discount amount (e.g. 100).');
      return;
    }
    const costNum = parseFloat(rawVal);
    if (isNaN(costNum) || costNum === 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive discount amount to deduct.');
      return;
    }
    // Convert to negative cost: e.g. 100 -> -100
    const negativeCost = -Math.abs(costNum);
    const name = discountName.trim() || 'Special Discount';

    // Verify order total wouldn't become negative
    const proposedCharges = [...chargesList, { name, cost: negativeCost }];
    const proposedExtraSum = proposedCharges.reduce(
      (sum, ch) => sum + Number(ch.cost || 0),
      0
    );
    if (itemsSubtotal + proposedExtraSum < 0) {
      Alert.alert(
        'Discount Too High',
        'Discount cannot exceed the total payable amount for this order.'
      );
      return;
    }

    setChargesList(proposedCharges);
    setDiscountName('');
    setDiscountAmount('');
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

                  {/* Current Extra Charges & Adjustments Repeater List */}
                  <View style={styles.chargesListContainer}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionLabel}>
                        CURRENT CHARGES & ADJUSTMENTS ({chargesList.length})
                      </Text>
                      {chargesList.length > 0 && (
                        <Text
                          style={[
                            styles.chargesSubtotalBadge,
                            extraChargesSum < 0 && { color: '#059669' },
                          ]}
                        >
                          Net:{' '}
                          {extraChargesSum < 0 ? '-' : '+'}৳{Math.abs(extraChargesSum).toLocaleString()}
                        </Text>
                      )}
                    </View>

                    {chargesList.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Ionicons name="receipt-outline" size={24} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No extra charges or discounts added yet.</Text>
                      </View>
                    ) : (
                      chargesList.map((item, idx) => {
                        const costNum = Number(item.cost || 0);
                        const isDiscount = costNum < 0;
                        return (
                          <View
                            key={idx}
                            style={[
                              styles.chargeRow,
                              isDiscount && styles.discountChargeRow,
                            ]}
                          >
                            <View style={styles.chargeRowLeft}>
                              <View
                                style={[
                                  styles.chargeIconBadge,
                                  isDiscount && styles.discountChargeIconBadge,
                                ]}
                              >
                                <Ionicons
                                  name={isDiscount ? 'gift-outline' : 'pricetag-outline'}
                                  size={14}
                                  color={isDiscount ? '#059669' : COLORS.primary}
                                />
                              </View>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text
                                    style={[
                                      styles.chargeName,
                                      isDiscount && { color: '#065F46' },
                                    ]}
                                  >
                                    {item.name}
                                  </Text>
                                  {isDiscount && (
                                    <View style={styles.discountBadgeTag}>
                                      <Text style={styles.discountBadgeTagText}>Discount</Text>
                                    </View>
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.chargeCost,
                                    isDiscount && { color: '#059669' },
                                  ]}
                                >
                                  {isDiscount ? '-' : '+'} ৳{Math.abs(costNum).toLocaleString()}
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
                        );
                      })
                    )}
                  </View>

                  {/* Card 1: Add Custom Extra Charge Form */}
                  <View style={styles.addSection}>
                    <View style={styles.cardHeaderWithIcon}>
                      <Ionicons name="add-circle-outline" size={15} color={COLORS.primary} />
                      <Text style={styles.sectionLabel}>ADD EXTRA CHARGE (ADDITION)</Text>
                    </View>
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
                        <Text style={styles.addBtnText}>Add Charge</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Card 2: Discount / Deduction Form (Negative Amount) */}
                  <View style={styles.discountSection}>
                    <View style={styles.discountHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="gift-outline" size={15} color="#059669" />
                        <Text style={styles.discountSectionLabel}>DISCOUNT / DEDUCTION</Text>
                      </View>
                      <View style={styles.discountDeductBadge}>
                        <Text style={styles.discountDeductBadgeText}>Deducts from Total</Text>
                      </View>
                    </View>
                    <Text style={styles.discountHelperText}>
                      Enter discount to deduct from total (sent as negative amount like -100).
                    </Text>

                    {/* Quick Preset Discount Pills */}
                    <View style={styles.discountPresetsRow}>
                      {[50, 100, 200, 500].map((amt) => (
                        <TouchableOpacity
                          key={amt}
                          style={[
                            styles.discountPresetChip,
                            discountAmount === String(amt) && styles.discountPresetChipActive,
                          ]}
                          onPress={() => {
                            setDiscountAmount(String(amt));
                            if (!discountName) setDiscountName('Special Discount');
                          }}
                        >
                          <Text
                            style={[
                              styles.discountPresetChipText,
                              discountAmount === String(amt) && styles.discountPresetChipTextActive,
                            ]}
                          >
                            -৳{amt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TextInput
                      style={[styles.input, styles.discountInput]}
                      placeholder="Discount Reason (e.g. Special Discount, Promo, Round-off)"
                      placeholderTextColor={COLORS.textMuted}
                      value={discountName}
                      onChangeText={setDiscountName}
                    />
                    <View style={styles.costRow}>
                      <TextInput
                        style={[styles.input, styles.discountInput, { flex: 1, marginBottom: 0 }]}
                        placeholder="Deduction Amount (৳, e.g. 100)"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                        value={discountAmount}
                        onChangeText={setDiscountAmount}
                      />
                      <TouchableOpacity
                        style={styles.applyDiscountBtn}
                        onPress={handleAddDiscount}
                      >
                        <Ionicons name="remove-circle-outline" size={16} color={COLORS.white} />
                        <Text style={styles.applyDiscountBtnText}>Apply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Total Summary Breakdown */}
                  <View style={styles.summaryBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Products Subtotal:</Text>
                      <Text style={styles.summaryVal}>৳{itemsSubtotal.toLocaleString()}</Text>
                    </View>
                    {positiveChargesSum > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Extra Charges Total:</Text>
                        <Text style={[styles.summaryVal, { color: COLORS.accent }]}>
                          + ৳{positiveChargesSum.toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {discountChargesSum > 0 && (
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Discounts Deducted:</Text>
                        <Text style={[styles.summaryVal, { color: '#059669', fontWeight: '700' }]}>
                          - ৳{discountChargesSum.toLocaleString()}
                        </Text>
                      </View>
                    )}
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
  discountChargeRow: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  discountChargeIconBadge: {
    backgroundColor: '#DCFCE7',
  },
  discountBadgeTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discountBadgeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  cardHeaderWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  discountSection: {
    marginBottom: SPACING.md,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  discountHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  discountSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.6,
  },
  discountDeductBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  discountDeductBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  discountHelperText: {
    fontSize: 11,
    color: '#047857',
    marginBottom: 10,
    lineHeight: 15,
  },
  discountPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  discountPresetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  discountPresetChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  discountPresetChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  discountPresetChipTextActive: {
    color: COLORS.white,
  },
  discountInput: {
    borderColor: '#86EFAC',
  },
  applyDiscountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    borderRadius: RADIUS.xs,
    gap: 4,
  },
  applyDiscountBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
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
