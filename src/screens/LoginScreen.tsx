import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/AuthContext';
import { APP_CONFIG } from '../constants/config';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export const LoginScreen: React.FC = () => {
  const { login, loading } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const res = await login(email, password);

      if (!res.success) {
        setErrorMessage(
          res.error || 'Authentication failed. Please verify credentials.'
        );
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } catch {}
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to server.');
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Ionicons name="receipt" size={32} color={COLORS.secondary} />
            </View>
            <Text style={styles.brandTitle}>RADICAL ORDERS</Text>
            <Text style={styles.brandSubtitle}>
              Order Management & Fulfillment Portal
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Staff Sign In</Text>
            <Text style={styles.formDesc}>
              Authenticate with your staff account credentials.
            </Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={COLORS.danger}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity
                  onPress={() => setErrorMessage(null)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ marginLeft: 6 }}
                >
                  <Ionicons name="close-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputContainer,
                  errorMessage ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={errorMessage ? COLORS.danger : COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="admin@radicalengineering.com.bd"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.inputContainer,
                  errorMessage ? styles.inputContainerError : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={errorMessage ? COLORS.danger : COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••••"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                (submitting || loading) && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={submitting || loading}
            >
              {submitting || loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Sign In</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={COLORS.white}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Info */}
          <View style={styles.footer}>
            <View style={styles.serverRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.serverText}>System Online</Text>
            </View>
            <Text style={styles.footerCopyright}>
              Radical Engineering BD • Kishoreganj
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  formDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
    marginBottom: SPACING.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#F87171',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
  },
  inputContainerError: {
    borderColor: '#F87171',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  eyeBtn: {
    padding: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.sm,
    marginTop: 6,
    gap: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  serverText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  footerCopyright: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});

