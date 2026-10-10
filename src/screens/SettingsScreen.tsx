import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useOrders } from "../context/OrdersContext";
import { useAuth } from "../context/AuthContext";
import { notificationsService } from "../services/notifications";
import { directus } from "../services/directus";
import { updateMe } from "@directus/sdk";
import { APP_CONFIG } from "../constants/config";
import { COLORS, RADIUS, SPACING } from "../constants/theme";

export const SettingsScreen: React.FC = () => {
  const {
    isPollingEnabled,
    togglePolling,
    isRealtimeConnected,
    lastSynced,
    refreshOrders,
    triggerDemoAlert,
    defaultDeliveryCharge,
    updateDefaultDeliveryCharge,
    defaultPerKgCharge,
    updateDefaultPerKgCharge,
  } = useOrders();
  const { user, logout } = useAuth();

  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isSyncingToken, setIsSyncingToken] = useState(false);

  // Store delivery charge state
  const [deliveryChargeInput, setDeliveryChargeInput] = useState<string>(
    String(defaultDeliveryCharge || 120),
  );
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false);
  const [deliveryUpdatedSuccess, setDeliveryUpdatedSuccess] = useState(false);

  // Store per kg charge state
  const [perKgChargeInput, setPerKgChargeInput] = useState<string>(
    String(defaultPerKgCharge || 0),
  );
  const [isUpdatingPerKg, setIsUpdatingPerKg] = useState(false);
  const [perKgUpdatedSuccess, setPerKgUpdatedSuccess] = useState(false);

  useEffect(() => {
    if (defaultDeliveryCharge) {
      setDeliveryChargeInput(String(defaultDeliveryCharge));
    }
  }, [defaultDeliveryCharge]);

  useEffect(() => {
    if (typeof defaultPerKgCharge === "number") {
      setPerKgChargeInput(String(defaultPerKgCharge));
    }
  }, [defaultPerKgCharge]);

  useEffect(() => {
    notificationsService.getExpoPushToken().then(setPushToken);
  }, []);

  const handleSyncPushToken = async () => {
    try {
      setIsSyncingToken(true);
      const token = await notificationsService.getExpoPushToken();
      if (!token) {
        Alert.alert(
          "Notice",
          "Push notification token is only available on physical devices with a standalone build.",
        );
        return;
      }
      setPushToken(token);
      await directus.request(updateMe({ push_token: token } as any));
      Alert.alert(
        "Token Registered",
        "Your device push token has been successfully linked to your account. You will now receive instant order alerts!",
      );
    } catch (err: any) {
      Alert.alert(
        "Registration Notice",
        err?.message || "Could not update push token on server.",
      );
    } finally {
      setIsSyncingToken(false);
    }
  };

  const handleTestNotification = () => {
    const dummyOrder = {
      id: "demo-test",
      order_id: "TEST" + Math.floor(1000 + Math.random() * 9000),
      name: "Ashik Ali (Test Order)",
      phone: "01760195100",
      address: "Kishoreganj Showroom",
      status: "pending" as const,
      total: 80300,
      placed_at: new Date().toISOString(),
      order_items: [
        {
          id: "1",
          quantity: 1,
          product: { id: "p1", name: "Growatt 16kwh Lithium Battery" },
        },
      ],
    };

    triggerDemoAlert(dummyOrder);
  };

  const handleCopyPushToken = async () => {
    if (pushToken) {
      await Clipboard.setStringAsync(pushToken);
      Alert.alert("Copied", "Expo Push Token copied to clipboard");
    }
  };

  const handleSaveDeliveryCharge = async () => {
    const val = parseFloat(deliveryChargeInput.trim());
    if (isNaN(val) || val < 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid delivery charge amount.",
      );
      return;
    }
    try {
      setIsUpdatingDelivery(true);
      const ok = await updateDefaultDeliveryCharge(val);
      if (ok) {
        setDeliveryUpdatedSuccess(true);
        setTimeout(() => setDeliveryUpdatedSuccess(false), 3000);
        Alert.alert(
          "Settings Updated",
          `Store delivery charge has been successfully updated to ৳${val.toLocaleString()} in Directus settings.`,
        );
      } else {
        Alert.alert("Error", "Failed to update delivery charge on server.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not update delivery charge.");
    } finally {
      setIsUpdatingDelivery(false);
    }
  };

  const handleSavePerKgCharge = async () => {
    const val = parseFloat(perKgChargeInput.trim());
    if (isNaN(val) || val < 0) {
      Alert.alert(
        "Invalid Amount",
        "Please enter a valid per KG charge amount.",
      );
      return;
    }
    try {
      setIsUpdatingPerKg(true);
      const ok = await updateDefaultPerKgCharge(val);
      if (ok) {
        setPerKgUpdatedSuccess(true);
        setTimeout(() => setPerKgUpdatedSuccess(false), 3000);
        Alert.alert(
          "Settings Updated",
          `Store per KG charge has been successfully updated to ৳${val.toLocaleString()}/kg in Directus settings.`,
        );
      } else {
        Alert.alert("Error", "Failed to update per KG charge on server.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not update per KG charge.");
    } finally {
      setIsUpdatingPerKg(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : "Authenticated Staff";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETTINGS & SYSTEM</Text>
        <Text style={styles.headerSubtitle}>
          System sync and notification controls
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
              <Text style={styles.userEmailText}>
                {user?.email || "Staff Account"}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {typeof user?.role === "object" && user?.role?.name
                    ? user.role.name
                    : "Authorized Staff"}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={17} color={COLORS.danger} />
            <Text style={styles.logoutBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Real-time Order Alerts */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ORDER NOTIFICATIONS & SYNC</Text>

          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingLabel}>Active Live Polling</Text>
              <Text style={styles.settingDesc}>
                Auto-syncs every 25 seconds for new orders while the app is
                active
              </Text>
            </View>
            <Switch
              value={isPollingEnabled}
              onValueChange={togglePolling}
              trackColor={{ false: "#CBD5E1", true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <TouchableOpacity
            style={styles.testNotificationBtn}
            onPress={handleTestNotification}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.testNotificationBtnText}>
              Test Order Alert & Vibration
            </Text>
          </TouchableOpacity>
        </View>

        {/* Store Delivery Charge (Settings Singleton) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.cardTitle}>STORE DELIVERY CHARGE</Text>
              <Text style={styles.cardDesc}>
                Used for new orders and quick adjustments.
              </Text>
            </View>
            <View style={styles.currentDeliveryBadge}>
              <Text style={styles.currentDeliveryBadgeLabel}>Current</Text>
              <Text style={styles.currentDeliveryBadgeVal}>
                ৳{defaultDeliveryCharge}
              </Text>
            </View>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.deliveryPresetsRow}>
            {[60, 100, 120, 150].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.deliveryPresetBtn,
                  deliveryChargeInput === String(amt) &&
                    styles.deliveryPresetBtnActive,
                ]}
                onPress={() => setDeliveryChargeInput(String(amt))}
              >
                <Text
                  style={[
                    styles.deliveryPresetBtnText,
                    deliveryChargeInput === String(amt) &&
                      styles.deliveryPresetBtnTextActive,
                  ]}
                >
                  ৳{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input & Update Action */}
          <View style={styles.deliveryInputRow}>
            <View style={styles.deliveryInputWrapper}>
              <Text style={styles.currencyPrefix}>৳</Text>
              <TextInput
                style={styles.deliveryTextInput}
                placeholder="Amount (e.g. 120)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={deliveryChargeInput}
                onChangeText={setDeliveryChargeInput}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.saveDeliveryBtn,
                isUpdatingDelivery && { opacity: 0.7 },
              ]}
              onPress={handleSaveDeliveryCharge}
              disabled={isUpdatingDelivery}
            >
              <Ionicons
                name={
                  deliveryUpdatedSuccess ? "checkmark" : "cloud-upload-outline"
                }
                size={16}
                color={COLORS.white}
              />
              <Text style={styles.saveDeliveryBtnText}>
                {isUpdatingDelivery
                  ? "Saving..."
                  : deliveryUpdatedSuccess
                    ? "Saved!"
                    : "Update"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Store Per KG Charge (Settings Singleton) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.cardTitle}>PER KG DELIVERY CHARGE</Text>
              <Text style={styles.cardDesc}>
                Used for weight-based delivery adjustments.
              </Text>
            </View>
            <View style={styles.currentDeliveryBadge}>
              <Text style={styles.currentDeliveryBadgeLabel}>Current</Text>
              <Text style={styles.currentDeliveryBadgeVal}>
                ৳{defaultPerKgCharge}/kg
              </Text>
            </View>
          </View>

          {/* Quick Preset Buttons */}
          <View style={styles.deliveryPresetsRow}>
            {[10, 15, 20, 25, 30].map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.deliveryPresetBtn,
                  perKgChargeInput === String(amt) &&
                    styles.deliveryPresetBtnActive,
                ]}
                onPress={() => setPerKgChargeInput(String(amt))}
              >
                <Text
                  style={[
                    styles.deliveryPresetBtnText,
                    perKgChargeInput === String(amt) &&
                      styles.deliveryPresetBtnTextActive,
                  ]}
                >
                  ৳{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input & Update Action */}
          <View style={styles.deliveryInputRow}>
            <View style={styles.deliveryInputWrapper}>
              <Text style={styles.currencyPrefix}>৳</Text>
              <TextInput
                style={styles.deliveryTextInput}
                placeholder="Per KG (e.g. 20)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                value={perKgChargeInput}
                onChangeText={setPerKgChargeInput}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.saveDeliveryBtn,
                isUpdatingPerKg && { opacity: 0.7 },
              ]}
              onPress={handleSavePerKgCharge}
              disabled={isUpdatingPerKg}
            >
              <Ionicons
                name={
                  perKgUpdatedSuccess ? "checkmark" : "cloud-upload-outline"
                }
                size={16}
                color={COLORS.white}
              />
              <Text style={styles.saveDeliveryBtnText}>
                {isUpdatingPerKg
                  ? "Saving..."
                  : perKgUpdatedSuccess
                    ? "Saved!"
                    : "Update"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* System Sync & Connection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SYSTEM SYNC & CONNECTION</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Server Connection:</Text>
            <Text
              style={[
                styles.infoVal,
                { color: COLORS.delivered, fontWeight: "700" },
              ]}
            >
              ● Connected & Encrypted
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Live Order Stream:</Text>
            <Text
              style={[
                styles.infoVal,
                {
                  color: isRealtimeConnected
                    ? COLORS.delivered
                    : COLORS.warning,
                  fontWeight: "700",
                },
              ]}
            >
              {isRealtimeConnected
                ? "● Connected (Instant Push)"
                : "○ Active (Polling Stream)"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Orders Channel:</Text>
            <Text style={styles.infoVal}>orders</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Items Channel:</Text>
            <Text style={styles.infoVal}>order_items</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session Status:</Text>
            <Text style={[styles.infoVal, { color: COLORS.delivered }]}>
              ✓ Authenticated
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Successful Sync:</Text>
            <Text style={styles.infoVal}>
              {lastSynced ? lastSynced.toLocaleTimeString() : "Pending"}
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

        {/* Expo Push Token Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>EXPO PUSH NOTIFICATION TOKEN</Text>
          <Text style={styles.cardDesc}>
            Use this token to receive instant push alerts on this device even
            when the app is completely closed.
          </Text>

          {pushToken ? (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenText} numberOfLines={2}>
                {pushToken}
              </Text>
              <View style={styles.tokenActionsRow}>
                <TouchableOpacity
                  style={styles.copyTokenBtn}
                  onPress={handleCopyPushToken}
                >
                  <Ionicons
                    name="copy-outline"
                    size={14}
                    color={COLORS.primary}
                  />
                  <Text style={styles.copyTokenBtnText}>Copy Token</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.copyTokenBtn,
                    {
                      backgroundColor: "#F0FDF4",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                    },
                  ]}
                  onPress={handleSyncPushToken}
                  disabled={isSyncingToken}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={14}
                    color={COLORS.delivered}
                  />
                  <Text
                    style={[
                      styles.copyTokenBtnText,
                      { color: COLORS.delivered },
                    ]}
                  >
                    {isSyncingToken ? "Syncing..." : "Sync to Account"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.noTokenText}>
                {notificationsService.isExpoGo()
                  ? "ℹ️ Running in Expo Go: Live polling and in-app order alerts are fully active. Remote push tokens require a development build."
                  : "Available on physical devices with standalone EAS build."}
              </Text>
              {!notificationsService.isExpoGo() && (
                <TouchableOpacity
                  style={[styles.testNotificationBtn, { marginTop: 12 }]}
                  onPress={handleSyncPushToken}
                  disabled={isSyncingToken}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={16}
                    color={COLORS.primary}
                  />
                  <Text style={styles.testNotificationBtnText}>
                    {isSyncingToken
                      ? "Registering..."
                      : "Register Device for Alerts"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Company Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>RADICAL ENGINEERING BD</Text>
          <Text style={styles.companyAddress}>{APP_CONFIG.address}</Text>
          <Text style={styles.companyContact}>
            Hotline: {APP_CONFIG.hotline1} • {APP_CONFIG.email}
          </Text>
          <Text style={styles.versionText}>Order Management App • v1.0.0</Text>
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
    fontWeight: "900",
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
    fontWeight: "800",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  settingDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  testNotificationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
    gap: 8,
  },
  testNotificationBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
    fontWeight: "600",
    color: COLORS.text,
  },
  manualSyncBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: RADIUS.sm,
    marginTop: 12,
    gap: 6,
  },
  manualSyncBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
  tokenBox: {
    backgroundColor: COLORS.surfaceVariant,
    padding: 10,
    borderRadius: RADIUS.xs,
  },
  tokenText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontFamily: "monospace",
  },
  tokenActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    flexWrap: "wrap",
  },
  copyTokenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  copyTokenBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  noTokenText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
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
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
  },
  userNameText: {
    fontSize: 16,
    fontWeight: "700",
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
    alignSelf: "flex-start",
    marginTop: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  logoutBtnText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "700",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  currentDeliveryBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  currentDeliveryBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  currentDeliveryBadgeVal: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
    marginTop: 1,
  },
  deliveryPresetsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  deliveryPresetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deliveryPresetBtnActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  deliveryPresetBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  deliveryPresetBtnTextActive: {
    color: COLORS.primary,
    fontWeight: "800",
  },
  deliveryInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  deliveryInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    marginRight: 6,
  },
  deliveryTextInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  saveDeliveryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: RADIUS.xs,
  },
  saveDeliveryBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "700",
  },
});
