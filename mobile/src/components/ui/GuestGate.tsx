import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';
import { colors, radius, spacing, textStyles } from '@/theme';

interface GuestGateProps {
  subtitle: string;
}

export default function GuestGate({ subtitle }: GuestGateProps) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Lock size={48} color={colors.accent.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{t('guest.gate.title')}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Button
        label={t('guest.gate.cta')}
        onPress={() => router.push('/(app)/settings')}
        variant="primary"
      />
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
