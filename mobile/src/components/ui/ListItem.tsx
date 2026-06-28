import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { colors, radius } from '@/theme';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  leftElement?: React.ReactNode;
  value?: string;
  valueColor?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
}

function ListItem({ title, subtitle, icon: Icon, leftElement, value, valueColor, rightElement, onPress }: ListItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        {leftElement ?? (Icon ? (
          <View style={styles.iconBox}>
            <Icon size={20} color={colors.text.muted} strokeWidth={1.5} />
          </View>
        ) : null)}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {rightElement ?? (value ? (
          <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>
            {value}
          </Text>
        ) : null)}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { alignSelf: 'stretch' },
  pressed: { opacity: 0.7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  subtitle: { fontSize: 13, color: colors.text.muted },
  value: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
});

export default React.memo(ListItem);
