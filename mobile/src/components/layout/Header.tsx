import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { colors, spacing, textStyles } from '@/theme';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, onBack, left, right }: HeaderProps) {
  if (onBack) {
    return (
      <View style={styles.appBar}>
        <View style={styles.sideSlot}>
          <Pressable onPress={onBack} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
            <ChevronLeft size={22} color={colors.text.muted} strokeWidth={2} />
          </Pressable>
        </View>
        <View style={styles.centerSlot}>
          <Text style={styles.centeredTitle} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.sideSlot, styles.sideSlotRight]}>
          {right ?? null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {left ? <View style={styles.leftSlot}>{left}</View> : null}
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    width: 'auto',
    minWidth: 44,
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
  pressed: {
    opacity: 0.6,
  },

  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  leftSlot: { marginRight: spacing.md },
  textWrap: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  right: { marginLeft: spacing.md },
  subtitle: {
    ...StyleSheet.flatten(textStyles.caption),
    fontWeight: '500',
    color: colors.text.secondary,
    marginTop: 1,
  },
});
