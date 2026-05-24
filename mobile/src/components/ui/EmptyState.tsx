import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import { colors, radius } from '@/theme';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Icon size={24} color={colors.text.muted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action ? (
        <View style={styles.actionWrap}>
          <Button label={action.label} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 64, alignItems: 'center', paddingHorizontal: 24 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 24,
    color: colors.text.muted,
    textAlign: 'center',
  },
  actionWrap: { marginTop: 20 },
});

export default React.memo(EmptyState);
