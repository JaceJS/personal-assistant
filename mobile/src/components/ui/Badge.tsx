import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.success.bg, text: colors.success.text },
  warning: { bg: colors.warning.bg, text: colors.warning.text },
  danger: { bg: colors.danger.bg, text: colors.danger.text },
  info: { bg: colors.info.bg, text: colors.info.text },
  default: { bg: colors.bg.elevated, text: colors.text.secondary },
};

function Badge({ label, variant = 'default' }: BadgeProps) {
  const { bg, text } = variantColors[variant];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default React.memo(Badge);
