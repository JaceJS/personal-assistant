import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, left, right }: HeaderProps) {
  if (left) {
    return (
      <View style={styles.appBar}>
        <View style={styles.sideSlot}>{left}</View>
        <View style={styles.centerSlot}>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={styles.centeredTitle} numberOfLines={1}>{title}</Text>
        </View>
        <View style={[styles.sideSlot, styles.sideSlotRight]}>
          {right ?? null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.textWrap}>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    minHeight: 52,
  },
  sideSlot: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideSlotRight: {
    alignItems: 'flex-end',
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
  },
  centeredTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: colors.text.primary,
  },

  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  textWrap: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  right: { marginLeft: spacing.md },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.text.muted,
    marginBottom: 2,
  },
});
