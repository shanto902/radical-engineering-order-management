import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

export const NoInternetBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { isOnline, isChecking, wasOffline, checkConnection } = useNetwork();
  const translateY = useRef(new Animated.Value(-120)).current;

  const showBanner = !isOnline || wasOffline;

  useEffect(() => {
    if (showBanner) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: -140,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [showBanner, translateY]);

  if (!showBanner) {
    return null;
  }

  const isRestored = isOnline && wasOffline;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 8) + 4,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.banner,
          isRestored ? styles.bannerRestored : styles.bannerOffline,
        ]}
      >
        <View style={styles.leftGroup}>
          <View
            style={[
              styles.iconBadge,
              isRestored ? styles.iconBadgeRestored : styles.iconBadgeOffline,
            ]}
          >
            <Ionicons
              name={isRestored ? 'checkmark-circle' : 'cloud-offline'}
              size={18}
              color={COLORS.white}
            />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.titleText}>
              {isRestored ? 'Back Online' : 'No Internet Connection'}
            </Text>
            <Text style={styles.subText} numberOfLines={1}>
              {isRestored
                ? 'Connection restored • Syncing latest orders...'
                : 'Offline mode • Changes cannot be saved'}
            </Text>
          </View>
        </View>

        {!isRestored && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={checkConnection}
            disabled={isChecking}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {isChecking ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="refresh" size={13} color={COLORS.white} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingHorizontal: SPACING.md,
    paddingBottom: 4,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  bannerOffline: {
    backgroundColor: '#991B1B',
    borderColor: '#DC2626',
  },
  bannerRestored: {
    backgroundColor: '#065F46',
    borderColor: '#059669',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 10,
    marginRight: 8,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconBadgeOffline: {
    backgroundColor: '#DC2626',
  },
  iconBadgeRestored: {
    backgroundColor: '#059669',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  subText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FEE2E2',
    marginTop: 1,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    gap: 4,
    flexShrink: 0,
  },
  retryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
});

