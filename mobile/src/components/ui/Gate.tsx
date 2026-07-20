import { StyleSheet, Text, View } from 'react-native';

import Button from '@/components/ui/Button';
import { colors, radius, spacing, textStyles } from '@/theme';

interface GateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCtaPress: () => void;
}

export function Gate({ icon, title, subtitle, ctaLabel, onCtaPress }: GateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Button label={ctaLabel} onPress={onCtaPress} variant="primary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.accent.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...StyleSheet.flatten(textStyles.h2),
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...StyleSheet.flatten(textStyles.body),
    color: colors.text.muted,
    textAlign: 'center',
  },
});
