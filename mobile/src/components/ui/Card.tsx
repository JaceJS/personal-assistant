import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewProps } from 'react-native';
import { colors, radius } from '@/theme';

type CardVariant = 'default' | 'elevated' | 'accent';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: CardVariant;
}

function Card({ children, variant = 'default', style, ...props }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    padding: 16,
  },
  default: {
    backgroundColor: colors.bg.surface,
  },
  elevated: {
    backgroundColor: colors.bg.elevated,
  },
  accent: {
    backgroundColor: colors.accent.subtle,
    borderWidth: 1,
    borderColor: colors.accent.border,
  },
});

export default React.memo(Card);
