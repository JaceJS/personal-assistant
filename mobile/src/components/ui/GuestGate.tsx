import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Gate } from '@/components/ui/Gate';
import { colors } from '@/theme';

interface GuestGateProps {
  subtitle: string;
}

export default function GuestGate({ subtitle }: GuestGateProps) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <Gate
      icon={<Lock size={48} color={colors.accent.primary} strokeWidth={1.5} />}
      title={t('guest.gate.title')}
      subtitle={subtitle}
      ctaLabel={t('guest.gate.cta')}
      onCtaPress={() => router.push('/(app)/settings')}
    />
  );
}
