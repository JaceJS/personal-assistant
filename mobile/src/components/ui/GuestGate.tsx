import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';

import Button from '@/components/ui/Button';
import { colors, radius, spacing, textStyles } from '@/theme';

interface GuestGateProps {
  subtitle: string;
}

export default function GuestGate({ subtitle }: GuestGateProps) {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Lock size={48} color={colors.accent.primary} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>Fitur ini membutuhkan akun</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Button
        label="Masuk ke Akun"
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
