export const COLORS = {
  // Brand colors
  primary: '#3C1100',          // Earth Brown
  primaryDark: '#260B00',
  primaryLight: '#F5EBE6',
  secondary: '#FCB974',        // Solar Warm Gold
  secondaryDark: '#E09B54',
  accent: '#0284C7',

  // Semantic Status colors
  pending: '#F59E0B',          // Amber
  pendingBg: '#FEF3C7',
  confirmed: '#0284C7',        // Sky Blue
  confirmedBg: '#E0F2FE',
  processing: '#8B5CF6',       // Purple
  processingBg: '#EDE9FE',
  shipped: '#3B82F6',          // Blue
  shippedBg: '#EFF6FF',
  delivered: '#16A34A',        // Green
  deliveredBg: '#DCFCE7',
  cancelled: '#DC2626',        // Red
  cancelledBg: '#FEE2E2',

  danger: '#DC2626',
  warning: '#F59E0B',
  success: '#16A34A',
  info: '#0284C7',

  // Surfaces & text
  background: '#F8FAFC',
  card: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  white: '#FFFFFF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  full: 9999,
};

export const STATUS_MAP: Record<
  string,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  pending: {
    label: 'Pending',
    color: '#D97706',
    bgColor: '#FEF3C7',
    icon: 'time-outline',
  },
  confirmed: {
    label: 'Confirmed',
    color: '#0284C7',
    bgColor: '#E0F2FE',
    icon: 'checkmark-circle-outline',
  },
  processing: {
    label: 'Processing',
    color: '#7C3AED',
    bgColor: '#EDE9FE',
    icon: 'construct-outline',
  },
  shipped: {
    label: 'Shipped',
    color: '#2563EB',
    bgColor: '#DBEAFE',
    icon: 'car-outline',
  },
  delivered: {
    label: 'Delivered',
    color: '#15803D',
    bgColor: '#DCFCE7',
    icon: 'checkmark-done-circle-outline',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#B91C1C',
    bgColor: '#FEE2E2',
    icon: 'close-circle-outline',
  },
};
