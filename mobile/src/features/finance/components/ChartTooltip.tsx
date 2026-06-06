import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

import { colors, radius, spacing, textStyles } from '@/theme';

export const TOOLTIP_WIDTH = 130;

interface TooltipLine {
  text: string;
  color: string;
}

interface ChartTooltipProps {
  animatedStyle: AnimatedStyle<ViewStyle>;
  label: string;
  lines: TooltipLine[];
}

export function ChartTooltip({ animatedStyle, label, lines }: ChartTooltipProps) {
  return (
    <Animated.View style={[styles.tooltip, animatedStyle]} pointerEvents="none">
      <Text style={styles.label}>{label}</Text>
      {lines.map(({ text, color }, i) => (
        <Text key={i} style={[styles.value, { color }]}>{text}</Text>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    minWidth: TOOLTIP_WIDTH,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    gap: 2,
  },
  label: {
    ...StyleSheet.flatten(textStyles.caption),
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: '600',
  },
  value: {
    ...StyleSheet.flatten(textStyles.caption),
    fontSize: 11,
    fontWeight: '600',
  },
});
