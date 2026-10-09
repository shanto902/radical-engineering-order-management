import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderStatus } from '../types';
import { STATUS_MAP, RADIUS } from '../constants/theme';

interface StatusBadgeProps {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const normalized = (status || 'pending').toLowerCase();
  const config = STATUS_MAP[normalized] || {
    label: status.toUpperCase(),
    color: '#64748B',
    bgColor: '#F1F5F9',
    icon: 'ellipse-outline',
  };

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const iconSize = isSmall ? 12 : isLarge ? 18 : 14;
  const fontSize = isSmall ? 10 : isLarge ? 14 : 12;
  const paddingH = isSmall ? 8 : isLarge ? 14 : 10;
  const paddingV = isSmall ? 3 : isLarge ? 7 : 5;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          borderColor: config.color + '40',
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
      ]}
    >
      <Ionicons
        name={config.icon as any}
        size={iconSize}
        color={config.color}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          {
            color: config.color,
            fontSize,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

